#!/usr/bin/env python3
"""Trains the PanoramIA panoramic finding detector (YOLO, Ultralytics) on a YOLO-format dataset such as the one written by
tools/export_yolo_dataset.py, evaluates it with PanoramIA's own per-class metrics, exports ONNX and writes a model card.

    pip install ultralytics onnx onnxruntime
    python3 training/train_yolo.py --data datasets/dentalopg_yolo/data.yaml --model yolo11s.pt --imgsz 1024 --epochs 100 --out runs/panoramia

Outputs in --out: weights/best.pt, panoramia_yolo.onnx, panoramia_model.json (card with per-class sensitivity/PPV on the
test split at IoU 0.2 and 0.5, conf 0.25), test_predictions.json (for tools/eval against the app).
A GPU is strongly recommended (Colab T4: ~1 h for 100 epochs of yolo11s at 1024 px on 1,068 images).
"""
import argparse, json, os, time, glob
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--data', required=True); ap.add_argument('--model', default='yolo11s.pt'); ap.add_argument('--imgsz', type=int, default=1024)
ap.add_argument('--epochs', type=int, default=100); ap.add_argument('--batch', type=int, default=8); ap.add_argument('--out', default='runs/panoramia')
ap.add_argument('--conf', type=float, default=0.25); ap.add_argument('--preprocess', default='letterbox', help="'stretch' when the training images were stretched to a square (the 640 Roboflow export)"); ap.add_argument('--name', default='panoramia-pan-v1'); ap.add_argument('--skip-train', action='store_true')
args = ap.parse_args()

from ultralytics import YOLO
import yaml

cfg = yaml.safe_load(open(args.data)); names = [cfg['names'][k] for k in sorted(cfg['names'])] if isinstance(cfg['names'], dict) else list(cfg['names'])
root = cfg.get('path', os.path.dirname(os.path.abspath(args.data)))
os.makedirs(args.out, exist_ok=True)

if not args.skip_train:
    model = YOLO(args.model)
    # class imbalance is severe (caries 1,578 vs bridges 56): longer training, mosaic off at the end, flips only horizontal
    model.train(data=args.data, imgsz=args.imgsz, epochs=args.epochs, batch=args.batch, project=args.out, name='train', exist_ok=True,
                close_mosaic=15, fliplr=0.5, flipud=0.0, degrees=3, scale=0.3, mixup=0.0, patience=30, cos_lr=True, pretrained=True, plots=True)
best = os.path.join(args.out, 'train', 'weights', 'best.pt')
model = YOLO(best)

# ---- Ultralytics metrics on the test split ----
val = model.val(data=args.data, split='test', imgsz=args.imgsz, batch=args.batch, conf=0.001, iou=0.6, project=args.out, name='val_test', exist_ok=True, plots=True)
ul = {'mAP50': float(val.box.map50), 'mAP50_95': float(val.box.map), 'perClass': {}}
for i, c in enumerate(names):
    try:
        p, r, ap50, ap = val.box.class_result(i)
        ul['perClass'][c] = {'precision': float(p), 'recall': float(r), 'AP50': float(ap50), 'AP50_95': float(ap)}
    except Exception:
        pass

# ---- PanoramIA metrics: per class sensitivity / PPV at a working confidence, IoU 0.2 and 0.5 (same as tools/eval_autoread_opg.js) ----
def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1]); x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1); u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / u if u > 0 else 0

test_images = sorted(glob.glob(os.path.join(root, cfg['test'], '*.jpg')) + glob.glob(os.path.join(root, cfg['test'], '*.png')))
preds_out = []; stats = {thr: {c: {'refs': 0, 'tp': 0, 'props': 0, 'hits': 0} for c in names} for thr in (0.2, 0.5)}
t0 = time.time()
for res in model.predict(test_images, imgsz=args.imgsz, conf=args.conf, iou=0.5, stream=True, verbose=False):
    img = res.path; W, H = res.orig_shape[1], res.orig_shape[0]
    lbl = os.path.join(root, cfg['test'].replace('images', 'labels'), os.path.splitext(os.path.basename(img))[0] + '.txt')
    refs = []
    if os.path.exists(lbl):
        for line in open(lbl):
            p = line.split()
            if len(p) >= 5:
                c, cx, cy, w, h = int(p[0]), float(p[1]) * W, float(p[2]) * H, float(p[3]) * W, float(p[4]) * H
                refs.append((names[c], [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]))
    props = [(names[int(k)], float(s), b.tolist()) for k, s, b in zip(res.boxes.cls, res.boxes.conf, res.boxes.xyxy)]
    preds_out.append({'image': os.path.basename(img), 'width': W, 'height': H, 'proposals': [{'code': c, 'score': round(s, 3), 'box': {'x': round(b[0]), 'y': round(b[1]), 'w': round(b[2] - b[0]), 'h': round(b[3] - b[1])}} for c, s, b in props]})
    for thr in stats:
        for c, rb in refs:
            stats[thr][c]['refs'] += 1
            if any(pc == c and iou(pb, rb) >= thr for pc, _, pb in props): stats[thr][c]['tp'] += 1
        for pc, _, pb in props:
            stats[thr][pc]['props'] += 1
            if any(rc == pc and iou(pb, rb) >= thr for rc, rb in refs): stats[thr][pc]['hits'] += 1
ms = (time.time() - t0) * 1000 / max(1, len(test_images))
pan = {}
for thr in stats:
    pan['iou%.1f' % thr] = {c: {'refs': v['refs'], 'sensitivity': round(v['tp'] / v['refs'], 3) if v['refs'] else None, 'ppv': round(v['hits'] / v['props'], 3) if v['props'] else None, 'proposals': v['props']} for c, v in stats[thr].items()}
json.dump(preds_out, open(os.path.join(args.out, 'test_predictions.json'), 'w'))

# ---- export ONNX + card ----
onnx_path = model.export(format='onnx', imgsz=args.imgsz, opset=12, simplify=True, dynamic=False)
final_onnx = os.path.join(args.out, 'panoramia_yolo.onnx'); os.replace(onnx_path, final_onnx)
card = {'name': args.name, 'preprocess': args.preprocess, 'family': 'YOLO (Ultralytics) ' + os.path.basename(args.model), 'imgsz': args.imgsz, 'classes': names, 'trainedOn': os.path.abspath(args.data),
        'epochs': args.epochs, 'date': time.strftime('%Y-%m-%d'), 'conf': args.conf, 'msPerImageCpuOrGpu': round(ms),
        'ultralytics': ul, 'panoramia': pan,
        'notes': 'Single-source labels (DentalOPG-1550, CC BY 4.0). Not clinically validated: proposals must be confirmed by the reader. '
                 'Sensitivity/PPV are on the held-out test split at conf %.2f; see STARD-AI plan for the Dominican validation.' % args.conf}
json.dump(card, open(os.path.join(args.out, 'panoramia_model.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'mAP50': ul['mAP50'], 'panoramia_iou0.2': pan['iou0.2']}, indent=1))
print('wrote', final_onnx, 'and panoramia_model.json — run: python3 tools/model_server.py --model', final_onnx)
