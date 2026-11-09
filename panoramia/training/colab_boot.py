
import os, subprocess, sys, json, re, io, zipfile, shutil, glob, time
def sh(cmd):
    print('$', cmd, flush=True); r = subprocess.run(cmd, shell=True); 
    if r.returncode: raise SystemExit('command failed: ' + cmd)
RUTA = os.environ.get('PAN_RUTA', 'rapida'); MODELO = os.environ.get('PAN_MODELO', 'yolo11s.pt'); EPOCAS = int(os.environ.get('PAN_EPOCAS', '80'))
IMGSZ = 640 if RUTA == 'rapida' else 1024
sh('pip -q install ultralytics onnx onnxruntime onnxslim')
os.makedirs('/content/pan', exist_ok=True); os.chdir('/content/pan')
from PIL import Image
YOLO_URL = "https://data.mendeley.com/public-files/datasets/rtt726b26d/files/4b33a007-dc93-4b95-b4a1-0c608459093a/file_downloaded"
FULL_URL = "https://data.mendeley.com/public-files/datasets/rtt726b26d/files/78f39f62-5823-4a1b-82e6-c42724304915/file_downloaded"
if not os.path.exists('yolo640/data.yaml'):
    sh('wget -q -O yolo640.zip "%s" && mkdir -p yolo640 && unzip -q -o yolo640.zip -d yolo640' % YOLO_URL)
if RUTA == 'alta_resolucion' and not os.path.exists('full.zip'):
    sh('wget -q -O full.zip "%s"' % FULL_URL)
SRC = ['BDR','Bridge','Cap','Caries','Distoangular impaction','Filling','Horizontal Impaction','Missing Teeth','Mixed Dentition','Normal Teeth','Periodontities','Rootcanel','Unerupted Wisdom Teeth','apical abscss']
CLASSES = ['DEN-CAR','DEN-FIL','DEN-CRN','DEN-BRG','DEN-RCT','DEN-PAR','DEN-PBL','DEN-ROOT','DEN-MIS','DEN-IMP-H','DEN-IMP-D','DEN-IMP-U']
MAP = {'Caries':'DEN-CAR','Filling':'DEN-FIL','Cap':'DEN-CRN','Bridge':'DEN-BRG','Rootcanel':'DEN-RCT','apical abscss':'DEN-PAR','Periodontities':'DEN-PBL','BDR':'DEN-ROOT','Missing Teeth':'DEN-MIS','Horizontal Impaction':'DEN-IMP-H','Distoangular impaction':'DEN-IMP-D','Unerupted Wisdom Teeth':'DEN-IMP-U'}
OUT = '/content/pan/dataset'; SPLIT = {'train':'train','valid':'val','test':'test'}
for sp in SPLIT.values():
    os.makedirs(f'{OUT}/images/{sp}', exist_ok=True); os.makedirs(f'{OUT}/labels/{sp}', exist_ok=True)
def norm(s): return re.sub(r'[^a-z0-9]+','',s.lower())
orig = {}
if RUTA == 'alta_resolucion':
    outer = zipfile.ZipFile('full.zip'); inner_name = [n for n in outer.namelist() if n.endswith('DentalOPG-1550.zip')][0]
    print('extrayendo', inner_name); outer.extract(inner_name, '/content/pan'); z = zipfile.ZipFile('/content/pan/'+inner_name)
    for n in z.namelist(): orig[norm(os.path.splitext(os.path.basename(n))[0])] = n
k = 0; counts = {c:0 for c in CLASSES}
for sp_src, sp in SPLIT.items():
    for lp in sorted(glob.glob(f'yolo640/{sp_src}/labels/*.txt')):
        stem = os.path.basename(lp)[:-4]; k += 1; oid = 'opg_%04d' % k
        # labels: remap classes, drop Normal Teeth / Mixed Dentition
        lines = []
        for line in open(lp):
            p = line.split()
            if len(p) < 5: continue
            cls = MAP.get(SRC[int(p[0])])
            if not cls: continue
            vals = list(map(float, p[1:]))
            if len(vals) > 4:  # polygon -> box
                xs, ys = vals[0::2], vals[1::2]; vals = [(min(xs)+max(xs))/2, (min(ys)+max(ys))/2, max(xs)-min(xs), max(ys)-min(ys)]
            lines.append('%d %.6f %.6f %.6f %.6f' % (CLASSES.index(cls), *vals)); counts[cls] += 1
        open(f'{OUT}/labels/{sp}/{oid}.txt','w').write('\n'.join(lines)+('\n' if lines else ''))
        if RUTA == 'rapida':
            shutil.copyfile(glob.glob(f'yolo640/{sp_src}/images/{stem}.*')[0], f'{OUT}/images/{sp}/{oid}.jpg')
        else:
            key = re.sub(r'_(bmp|jpg|jpeg|png)(_jpg)?$', '', stem.split('.rf.')[0]); src = orig[norm(key)]
            with z.open(src) as f: im = Image.open(io.BytesIO(f.read())).convert('L')
            s = min(1.0, 1400/im.width); im = im.resize((round(im.width*s), round(im.height*s)), Image.LANCZOS)
            im.save(f'{OUT}/images/{sp}/{oid}.jpg', 'JPEG', quality=90)   # las cajas YOLO son relativas: valen para cualquier tamaño
open(f'{OUT}/data.yaml','w').write(f'path: {OUT}\ntrain: images/train\nval: images/val\ntest: images/test\nnc: {len(CLASSES)}\nnames:\n' + ''.join(f'  {i}: {c}\n' for i,c in enumerate(CLASSES)))
print(k, 'imágenes', counts)
open('/content/pan/train_yolo.py','w').write("#!/usr/bin/env python3\n\"\"\"Trains the PanoramIA panoramic finding detector (YOLO, Ultralytics) on a YOLO-format dataset such as the one written by\ntools/export_yolo_dataset.py, evaluates it with PanoramIA's own per-class metrics, exports ONNX and writes a model card.\n\n    pip install ultralytics onnx onnxruntime\n    python3 training/train_yolo.py --data datasets/dentalopg_yolo/data.yaml --model yolo11s.pt --imgsz 1024 --epochs 100 --out runs/panoramia\n\nOutputs in --out: weights/best.pt, panoramia_yolo.onnx, panoramia_model.json (card with per-class sensitivity/PPV on the\ntest split at IoU 0.2 and 0.5, conf 0.25), test_predictions.json (for tools/eval against the app).\nA GPU is strongly recommended (Colab T4: ~1 h for 100 epochs of yolo11s at 1024 px on 1,068 images).\n\"\"\"\nimport argparse, json, os, time, glob\nimport numpy as np\n\nap = argparse.ArgumentParser()\nap.add_argument('--data', required=True); ap.add_argument('--model', default='yolo11s.pt'); ap.add_argument('--imgsz', type=int, default=1024)\nap.add_argument('--epochs', type=int, default=100); ap.add_argument('--batch', type=int, default=8); ap.add_argument('--out', default='runs/panoramia')\nap.add_argument('--conf', type=float, default=0.25); ap.add_argument('--name', default='panoramia-pan-v1'); ap.add_argument('--skip-train', action='store_true')\nargs = ap.parse_args()\n\nfrom ultralytics import YOLO\nimport yaml\n\ncfg = yaml.safe_load(open(args.data)); names = [cfg['names'][k] for k in sorted(cfg['names'])] if isinstance(cfg['names'], dict) else list(cfg['names'])\nroot = cfg.get('path', os.path.dirname(os.path.abspath(args.data)))\nos.makedirs(args.out, exist_ok=True)\n\nif not args.skip_train:\n    model = YOLO(args.model)\n    # class imbalance is severe (caries 1,578 vs bridges 56): longer training, mosaic off at the end, flips only horizontal\n    model.train(data=args.data, imgsz=args.imgsz, epochs=args.epochs, batch=args.batch, project=args.out, name='train', exist_ok=True,\n                close_mosaic=15, fliplr=0.5, flipud=0.0, degrees=3, scale=0.3, mixup=0.0, patience=30, cos_lr=True, pretrained=True, plots=True)\nbest = os.path.join(args.out, 'train', 'weights', 'best.pt')\nmodel = YOLO(best)\n\n# ---- Ultralytics metrics on the test split ----\nval = model.val(data=args.data, split='test', imgsz=args.imgsz, batch=args.batch, conf=0.001, iou=0.6, project=args.out, name='val_test', exist_ok=True, plots=True)\nul = {'mAP50': float(val.box.map50), 'mAP50_95': float(val.box.map), 'perClass': {}}\nfor i, c in enumerate(names):\n    try:\n        p, r, ap50, ap = val.box.class_result(i)\n        ul['perClass'][c] = {'precision': float(p), 'recall': float(r), 'AP50': float(ap50), 'AP50_95': float(ap)}\n    except Exception:\n        pass\n\n# ---- PanoramIA metrics: per class sensitivity / PPV at a working confidence, IoU 0.2 and 0.5 (same as tools/eval_autoread_opg.js) ----\ndef iou(a, b):\n    x1, y1 = max(a[0], b[0]), max(a[1], b[1]); x2, y2 = min(a[2], b[2]), min(a[3], b[3])\n    inter = max(0, x2 - x1) * max(0, y2 - y1); u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter\n    return inter / u if u > 0 else 0\n\ntest_images = sorted(glob.glob(os.path.join(root, cfg['test'], '*.jpg')) + glob.glob(os.path.join(root, cfg['test'], '*.png')))\npreds_out = []; stats = {thr: {c: {'refs': 0, 'tp': 0, 'props': 0, 'hits': 0} for c in names} for thr in (0.2, 0.5)}\nt0 = time.time()\nfor res in model.predict(test_images, imgsz=args.imgsz, conf=args.conf, iou=0.5, stream=True, verbose=False):\n    img = res.path; W, H = res.orig_shape[1], res.orig_shape[0]\n    lbl = os.path.join(root, cfg['test'].replace('images', 'labels'), os.path.splitext(os.path.basename(img))[0] + '.txt')\n    refs = []\n    if os.path.exists(lbl):\n        for line in open(lbl):\n            p = line.split()\n            if len(p) >= 5:\n                c, cx, cy, w, h = int(p[0]), float(p[1]) * W, float(p[2]) * H, float(p[3]) * W, float(p[4]) * H\n                refs.append((names[c], [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]))\n    props = [(names[int(k)], float(s), b.tolist()) for k, s, b in zip(res.boxes.cls, res.boxes.conf, res.boxes.xyxy)]\n    preds_out.append({'image': os.path.basename(img), 'width': W, 'height': H, 'proposals': [{'code': c, 'score': round(s, 3), 'box': {'x': round(b[0]), 'y': round(b[1]), 'w': round(b[2] - b[0]), 'h': round(b[3] - b[1])}} for c, s, b in props]})\n    for thr in stats:\n        for c, rb in refs:\n            stats[thr][c]['refs'] += 1\n            if any(pc == c and iou(pb, rb) >= thr for pc, _, pb in props): stats[thr][c]['tp'] += 1\n        for pc, _, pb in props:\n            stats[thr][pc]['props'] += 1\n            if any(rc == pc and iou(pb, rb) >= thr for rc, rb in refs): stats[thr][pc]['hits'] += 1\nms = (time.time() - t0) * 1000 / max(1, len(test_images))\npan = {}\nfor thr in stats:\n    pan['iou%.1f' % thr] = {c: {'refs': v['refs'], 'sensitivity': round(v['tp'] / v['refs'], 3) if v['refs'] else None, 'ppv': round(v['hits'] / v['props'], 3) if v['props'] else None, 'proposals': v['props']} for c, v in stats[thr].items()}\njson.dump(preds_out, open(os.path.join(args.out, 'test_predictions.json'), 'w'))\n\n# ---- export ONNX + card ----\nonnx_path = model.export(format='onnx', imgsz=args.imgsz, opset=12, simplify=True, dynamic=False)\nfinal_onnx = os.path.join(args.out, 'panoramia_yolo.onnx'); os.replace(onnx_path, final_onnx)\ncard = {'name': args.name, 'family': 'YOLO (Ultralytics) ' + os.path.basename(args.model), 'imgsz': args.imgsz, 'classes': names, 'trainedOn': os.path.abspath(args.data),\n        'epochs': args.epochs, 'date': time.strftime('%Y-%m-%d'), 'conf': args.conf, 'msPerImageCpuOrGpu': round(ms),\n        'ultralytics': ul, 'panoramia': pan,\n        'notes': 'Single-source labels (DentalOPG-1550, CC BY 4.0). Not clinically validated: proposals must be confirmed by the reader. '\n                 'Sensitivity/PPV are on the held-out test split at conf %.2f; see STARD-AI plan for the Dominican validation.' % args.conf}\njson.dump(card, open(os.path.join(args.out, 'panoramia_model.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)\nprint(json.dumps({'mAP50': ul['mAP50'], 'panoramia_iou0.2': pan['iou0.2']}, indent=1))\nprint('wrote', final_onnx, 'and panoramia_model.json \u2014 run: python3 tools/model_server.py --model', final_onnx)\n")
sh('python /content/pan/train_yolo.py --data /content/pan/dataset/data.yaml --model %s --imgsz %d --epochs %d --batch 16 --out /content/pan/runs --name panoramia-pan-v1 --preprocess %s' % (MODELO, IMGSZ, EPOCAS, 'stretch' if RUTA == 'rapida' else 'letterbox'))
print(json.dumps(json.load(open('/content/pan/runs/panoramia_model.json'))['panoramia']['iou0.2'], indent=1))
sh('cd /content/pan/runs && zip -q -r /content/panoramia_model.zip panoramia_yolo.onnx panoramia_model.json test_predictions.json val_test')
# also fetch onnxruntime-web for in-browser inference
sh('cd /content && npm pack onnxruntime-web@1.19.2 >/dev/null 2>&1 && mkdir -p ortweb && tar -xzf onnxruntime-web-1.19.2.tgz -C ortweb && zip -q -j /content/ortweb.zip ortweb/package/dist/ort.min.js ortweb/package/dist/ort-wasm-simd.wasm ortweb/package/dist/ort-wasm-simd-threaded.wasm 2>/dev/null || true')
print('DONE_PANORAMIA', os.path.getsize('/content/panoramia_model.zip'))
