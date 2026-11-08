#!/usr/bin/env python3
"""Exports PanoramIA's curated DentalOPG-1550 copy as a YOLO detection dataset with the PanoramIA class list.

Classes (12): DEN-CAR caries, DEN-FIL filling, DEN-CRN crown, DEN-BRG bridge, DEN-RCT root canal filling,
DEN-PAR apical abscess / periapical radiolucency, DEN-PBL periodontal bone loss, DEN-ROOT broken-down root,
DEN-MIS missing tooth, DEN-IMP-H horizontal impaction, DEN-IMP-D distoangular impaction, DEN-IMP-U unerupted third molar.
"Normal Teeth" boxes are exported as a 13th class ANA-TTH only with --with-teeth (they exist in 286 images only).

Usage: python3 -I tools/export_yolo_dataset.py [--out datasets/dentalopg_yolo] [--with-teeth]
"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(HERE, 'datasets', 'dentalopg_yolo')
WITH_TEETH = '--with-teeth' in sys.argv
CLASSES = ['DEN-CAR', 'DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-RCT', 'DEN-PAR', 'DEN-PBL', 'DEN-ROOT', 'DEN-MIS', 'DEN-IMP-H', 'DEN-IMP-D', 'DEN-IMP-U'] + (['ANA-TTH'] if WITH_TEETH else [])
KIND_TO_CLASS = {'Caries': 'DEN-CAR', 'Filling': 'DEN-FIL', 'Cap': 'DEN-CRN', 'Bridge': 'DEN-BRG', 'Rootcanel': 'DEN-RCT', 'apical abscss': 'DEN-PAR',
                 'Periodontities': 'DEN-PBL', 'BDR': 'DEN-ROOT', 'Missing Teeth': 'DEN-MIS', 'Horizontal Impaction': 'DEN-IMP-H',
                 'Distoangular impaction': 'DEN-IMP-D', 'Unerupted Wisdom Teeth': 'DEN-IMP-U'}
SPLIT = {'train': 'train', 'valid': 'val', 'test': 'test'}

m = json.load(open(os.path.join(HERE, 'data', 'dentalopg', 'full_manifest.json'), encoding='utf-8'))
for sp in SPLIT.values():
    os.makedirs(os.path.join(OUT, 'images', sp), exist_ok=True); os.makedirs(os.path.join(OUT, 'labels', sp), exist_ok=True)
counts = {c: 0 for c in CLASSES}; n = 0
for e in m['images']:
    sp = SPLIT[e['split']]; W, H = e['width'], e['height']
    shutil.copyfile(os.path.join(HERE, 'data', 'dentalopg', 'full', e['file']), os.path.join(OUT, 'images', sp, e['file']))
    lines = []
    def add(cls, box):
        x, y, w, h = box; cx, cy = (x + w / 2) / W, (y + h / 2) / H
        lines.append('%d %.6f %.6f %.6f %.6f' % (CLASSES.index(cls), cx, cy, w / W, h / H)); counts[cls] += 1
    for s in e['structures']:
        cls = KIND_TO_CLASS.get(s['kind'])
        if cls: add(cls, s['box'])
    if WITH_TEETH:
        for t in e['teeth']: add('ANA-TTH', t['box'])
    open(os.path.join(OUT, 'labels', sp, e['id'] + '.txt'), 'w').write('\n'.join(lines) + ('\n' if lines else ''))
    n += 1
yaml = 'path: %s\ntrain: images/train\nval: images/val\ntest: images/test\nnc: %d\nnames:\n' % (os.path.abspath(OUT), len(CLASSES)) + ''.join('  %d: %s\n' % (i, c) for i, c in enumerate(CLASSES))
open(os.path.join(OUT, 'data.yaml'), 'w').write(yaml)
open(os.path.join(OUT, 'README.md'), 'w').write('# DentalOPG-1550 in YOLO format (PanoramIA classes)\n\nSource: Chowdhury & Arman, Mendeley Data V3, doi:10.17632/rtt726b26d.3, CC BY 4.0. Images 1400 px wide, grayscale JPEG, renamed (originals carried patient names). Labels rescaled from the authors\' 640×640 YOLOv8 export.\n\nCounts: %s\n' % json.dumps(counts))
print('exported', n, 'images to', OUT); print(counts)
