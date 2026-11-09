"""PanoramIA — segmentation model bootstrap for Colab (GPU).
Trains a YOLO11 instance-segmentation model on AKUDENTAL (333 adult panoramics, expert polygons for every tooth by FDI
number plus fillings/crowns, bridges and implants; CC BY-NC-SA 4.0: research and teaching use) and exports ONNX.
Classes (35): 32 FDI teeth (11..18, 21..28, 31..38, 41..48) + FILLING_CROWN + BRIDGE + IMPLANT.
Env: PAN_MODELO (yolo11s-seg.pt), PAN_EPOCAS (80), PAN_IMGSZ (1024).
"""
import os, subprocess, json, random, time, shutil, glob
def sh(cmd):
    print('$', cmd, flush=True); r = subprocess.run(cmd, shell=True)
    if r.returncode: raise SystemExit('command failed: ' + cmd)
MODELO = os.environ.get('PAN_MODELO', 'yolo11s-seg.pt'); EPOCAS = int(os.environ.get('PAN_EPOCAS', '80')); IMGSZ = int(os.environ.get('PAN_IMGSZ', '1024'))
sh('pip -q install ultralytics onnx onnxruntime onnxslim')
os.makedirs('/content/seg', exist_ok=True); os.chdir('/content/seg')
if not os.path.exists('AKUDENTAL'):
    sh('git clone -q --depth 1 https://github.com/melihoz/AKUDENTAL.git')
from PIL import Image
coco = json.load(open('AKUDENTAL/AKUDENTAL/akudental_instances.json', encoding='utf-8'))
cats = {c['id']: c['name'] for c in coco['categories']}
FDI = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]
CLASSES = ['T%d' % f for f in FDI] + ['FILLING_CROWN', 'BRIDGE', 'IMPLANT']
def cls_of(cid):
    n = cats[cid]
    if n[:2].isdigit(): return CLASSES.index('T%d' % int(n.split(' - ')[0]))
    return {'Filling - Crown': 32, 'Bridge': 33, 'Implant': 34}.get(n)
per = {}
for a in coco['annotations']: per.setdefault(a['image_id'], []).append(a)
images = sorted(coco['images'], key=lambda im: im['id'])
random.seed(7); random.shuffle(images)
n = len(images); split = {'train': images[:int(n * 0.75)], 'val': images[int(n * 0.75):int(n * 0.9)], 'test': images[int(n * 0.9):]}
OUT = '/content/seg/dataset'
for sp, ims in split.items():
    os.makedirs(f'{OUT}/images/{sp}', exist_ok=True); os.makedirs(f'{OUT}/labels/{sp}', exist_ok=True)
    for im in ims:
        src = Image.open('AKUDENTAL/AKUDENTAL/images/' + im['file_name']).convert('L')
        s = min(1.0, 1400 / src.width); W, H = round(src.width * s), round(src.height * s)
        src.resize((W, H), Image.LANCZOS).save(f'{OUT}/images/{sp}/aku_{im["id"]}.jpg', 'JPEG', quality=90)
        lines = []
        for a in per.get(im['id'], []):
            c = cls_of(a['category_id'])
            if c is None or not a.get('segmentation'): continue
            for poly in a['segmentation']:
                if len(poly) < 6: continue
                pts = []
                for k in range(0, len(poly) - 1, 2):
                    pts.append('%.5f %.5f' % (min(1, max(0, poly[k] / im['width'])), min(1, max(0, poly[k + 1] / im['height']))))
                lines.append(str(c) + ' ' + ' '.join(pts))
        open(f'{OUT}/labels/{sp}/aku_{im["id"]}.txt', 'w').write('\n'.join(lines) + ('\n' if lines else ''))
open(f'{OUT}/data.yaml', 'w').write(f'path: {OUT}\ntrain: images/train\nval: images/val\ntest: images/test\nnc: {len(CLASSES)}\nnames:\n' + ''.join(f'  {i}: {c}\n' for i, c in enumerate(CLASSES)))
print({k: len(v) for k, v in split.items()}, flush=True)
from ultralytics import YOLO
model = YOLO(MODELO)
model.train(data=f'{OUT}/data.yaml', imgsz=IMGSZ, epochs=EPOCAS, batch=4, project='/content/seg/runs', name='train', exist_ok=True, close_mosaic=10, fliplr=0.0, degrees=2, scale=0.2, patience=25, cos_lr=True, plots=True)
best = YOLO('/content/seg/runs/train/weights/best.pt')
val = best.val(data=f'{OUT}/data.yaml', split='test', imgsz=IMGSZ, batch=4, project='/content/seg/runs', name='val_test', exist_ok=True, plots=True)
card = {'name': 'panoramia-seg-v1', 'task': 'segment', 'family': 'YOLO (Ultralytics) ' + MODELO, 'imgsz': IMGSZ, 'preprocess': 'letterbox', 'classes': CLASSES,
        'trainedOn': 'AKUDENTAL (Öz et al. 2026, CC BY-NC-SA 4.0): 333 panoramics, polygons for 32 FDI teeth + filling/crown, bridge, implant', 'date': time.strftime('%Y-%m-%d'),
        'epochs': EPOCAS, 'box': {'mAP50': float(val.box.map50), 'mAP50_95': float(val.box.map)}, 'mask': {'mAP50': float(val.seg.map50), 'mAP50_95': float(val.seg.map)}, 'perClass': {}}
for i, c in enumerate(CLASSES):
    try:
        p, r, ap50, ap = val.seg.class_result(i); card['perClass'][c] = {'maskPrecision': float(p), 'maskRecall': float(r), 'maskAP50': float(ap50)}
    except Exception: pass
card['notes'] = 'Non-commercial licence (AKUDENTAL): teaching and research use. Contours of teeth and restorations; not a diagnosis.'
onnx_path = best.export(format='onnx', imgsz=IMGSZ, opset=12, simplify=True, dynamic=False)
os.replace(onnx_path, '/content/seg/runs/panoramia_seg.onnx')
json.dump(card, open('/content/seg/runs/panoramia_seg.json', 'w'), indent=1)
print(json.dumps({'box': card['box'], 'mask': card['mask']}, indent=1))
sh('cd /content/seg/runs && zip -q -r /content/panoramia_seg.zip panoramia_seg.onnx panoramia_seg.json val_test')
print('DONE_SEG', os.path.getsize('/content/panoramia_seg.zip'))
