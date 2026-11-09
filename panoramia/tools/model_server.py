#!/usr/bin/env python3
"""PanoramIA local model server: runs a trained YOLO detector exported to ONNX on the dentist's own computer and
serves proposals to the app over http://127.0.0.1:8765. Nothing leaves the machine.

Requirements: python3, numpy, pillow, onnxruntime  (pip install numpy pillow onnxruntime)
Usage:  python3 tools/model_server.py --model panoramia_yolo.onnx [--card panoramia_model.json] [--port 8765] [--imgsz 1024]

Endpoints
  GET  /health            -> {"ok":true,"model":{...card...},"imgsz":1024}
  POST /predict           -> body: image bytes (JPEG/PNG), query ?min_score=0.25
                             returns {"proposals":[{"code","score","box":{x,y,w,h},"shape":{"type":"rect","points":[...]},"how"}], "model":{...}}
The ONNX file is the standard Ultralytics export (output [1, 4+nc, N], xywh in letterboxed input pixels).
Classes come from the model card (names in order) or, failing that, from the ONNX metadata 'names'.
"""
import argparse, io, json, os, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import numpy as np
from PIL import Image
import onnxruntime as ort

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True); ap.add_argument('--card', default=None); ap.add_argument('--port', type=int, default=8765)
ap.add_argument('--imgsz', type=int, default=None); ap.add_argument('--host', default='127.0.0.1')
args = ap.parse_args()

sess = ort.InferenceSession(args.model, providers=['CPUExecutionProvider'])
inp = sess.get_inputs()[0]
IMGSZ = args.imgsz or (inp.shape[2] if isinstance(inp.shape[2], int) else 1024)
card = {}
if args.card and os.path.exists(args.card):
    card = json.load(open(args.card, encoding='utf-8'))
elif os.path.exists(os.path.splitext(args.model)[0] + '.json'):
    card = json.load(open(os.path.splitext(args.model)[0] + '.json', encoding='utf-8'))
names = card.get('classes')
if not names:
    meta = sess.get_modelmeta().custom_metadata_map
    if 'names' in meta:
        try:
            d = eval(meta['names'], {'__builtins__': {}}) if meta['names'].strip().startswith('{') else json.loads(meta['names'])
            names = [d[k] for k in sorted(d, key=lambda z: int(z))] if isinstance(d, dict) else list(d)
        except Exception:
            names = None
if not names:
    names = ['DEN-CAR', 'DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-RCT', 'DEN-PAR', 'DEN-PBL', 'DEN-ROOT', 'DEN-MIS', 'DEN-IMP-H', 'DEN-IMP-D', 'DEN-IMP-U']
card.setdefault('name', os.path.basename(args.model)); card['classes'] = names
print('PanoramIA model server · model', args.model, '· classes', len(names), '· imgsz', IMGSZ, '· http://%s:%d' % (args.host, args.port), flush=True)


def letterbox(im, size):
    if card.get('preprocess') == 'stretch':  # model trained on stretched square copies: stretch, no padding
        return im.resize((size, size), Image.BILINEAR), None, 0, 0
    w, h = im.size; s = min(size / w, size / h); nw, nh = round(w * s), round(h * s)
    canvas = Image.new('RGB', (size, size), (114, 114, 114)); canvas.paste(im.resize((nw, nh), Image.BILINEAR), ((size - nw) // 2, (size - nh) // 2))
    return canvas, s, (size - nw) // 2, (size - nh) // 2


def nms(boxes, scores, thr=0.5):
    order = scores.argsort()[::-1]; keep = []
    while order.size:
        i = order[0]; keep.append(i)
        if order.size == 1: break
        xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0]); yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
        xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2]); yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])
        inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
        a1 = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1]); a2 = (boxes[order[1:], 2] - boxes[order[1:], 0]) * (boxes[order[1:], 3] - boxes[order[1:], 1])
        iou = inter / (a1 + a2 - inter + 1e-9)
        order = order[1:][iou < thr]
    return keep


def predict(img_bytes, min_score=0.25):
    im = Image.open(io.BytesIO(img_bytes)).convert('RGB'); W, H = im.size
    lb, s, px, py = letterbox(im, IMGSZ)
    sx = sy = s
    if s is None: sx, sy = IMGSZ / W, IMGSZ / H
    x = np.asarray(lb, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0
    t0 = time.time(); out = sess.run(None, {inp.name: x})[0]
    if out.ndim == 3 and out.shape[1] == 4 + len(names): out = out[0].T          # [N, 4+nc]
    elif out.ndim == 3: out = out[0]                                              # already [N, 4+nc] or NMS'd [N, 6]
    props = []
    if out.shape[1] == 6:  # exported with nms=True: x1,y1,x2,y2,score,cls
        for x1, y1, x2, y2, sc, cl in out:
            if sc < min_score: continue
            props.append((int(cl), float(sc), [(x1 - px) / sx, (y1 - py) / sy, (x2 - px) / sx, (y2 - py) / sy]))
    else:
        cls_scores = out[:, 4:]; cls = cls_scores.argmax(1); sc = cls_scores.max(1)
        m = sc >= min_score; xywh = out[m, :4]; cls = cls[m]; sc = sc[m]
        xyxy = np.stack([xywh[:, 0] - xywh[:, 2] / 2, xywh[:, 1] - xywh[:, 3] / 2, xywh[:, 0] + xywh[:, 2] / 2, xywh[:, 1] + xywh[:, 3] / 2], 1)
        for c in np.unique(cls):
            idx = np.where(cls == c)[0]
            for k in nms(xyxy[idx], sc[idx], 0.5):
                b = xyxy[idx[k]]; props.append((int(c), float(sc[idx[k]]), [(b[0] - px) / sx, (b[1] - py) / sy, (b[2] - px) / sx, (b[3] - py) / sy]))
    res = []
    for c, score, (x1, y1, x2, y2) in props:
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(W, x2), min(H, y2)
        if x2 - x1 < 2 or y2 - y1 < 2: continue
        code = names[c] if c < len(names) else str(c)
        res.append({'code': code, 'score': round(score, 3), 'box': {'x': round(x1), 'y': round(y1), 'w': round(x2 - x1), 'h': round(y2 - y1)},
                    'shape': {'type': 'rect', 'points': [[round(x1), round(y1)], [round(x2), round(y1)], [round(x2), round(y2)], [round(x1), round(y2)]]},
                    'how': 'modelo %s · score %.2f' % (card.get('name', 'YOLO'), score)})
    return {'proposals': res, 'model': card, 'ms': round((time.time() - t0) * 1000), 'width': W, 'height': H}


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    def _json(self, code, obj):
        body = json.dumps(obj).encode('utf-8'); self.send_response(code); self._cors(); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self):
        if urlparse(self.path).path == '/health': return self._json(200, {'ok': True, 'model': card, 'imgsz': IMGSZ, 'server': 'panoramia-model-server/0.1'})
        self._json(404, {'ok': False})
    def do_POST(self):
        u = urlparse(self.path)
        if u.path != '/predict': return self._json(404, {'ok': False})
        n = int(self.headers.get('Content-Length') or 0); data = self.rfile.read(n)
        q = parse_qs(u.query); ms = float(q.get('min_score', ['0.25'])[0])
        try:
            self._json(200, predict(data, ms))
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})
    def log_message(self, fmt, *a):
        sys.stderr.write('%s %s\n' % (self.command, self.path.split('?')[0]))


ThreadingHTTPServer((args.host, args.port), H).serve_forever()
