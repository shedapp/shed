#!/usr/bin/env python3
"""Curates the DentalOPG-1550 export (already de-identified and rescaled on the user's machine: see the manifest note)
into PanoramIA's data layout.

Input dir: full_manifest.json + full/opg_NNNN.jpg (1400 px wide, grayscale).
Outputs:
  <repo>/data/dentalopg/full/*.jpg, full_manifest.json, LICENSE-DATA.md   (complete set, served over http(s))
  <input>/subset_manifest.json + subset/*.jpg (1000 px, q72)              (embedded by tools/embed_opendata.py --opg)
  <input>/raw/opg_NNNN.gray (+ raw_index.json)                            (8-bit dumps for the Node evaluation)

FDI numbering: the source labels teeth as "Normal Teeth" without numbers. We estimate FDI by position: arches split by
centroid y, sides by the midline x, then teeth and labelled "Missing Teeth" gaps are ordered from the midline outwards
and numbered 1..8. It is an estimate (fdiSource = 'estimated-order') good enough for the atlas and per-tooth statistics,
not a clinical numbering.
Usage: python3 -I tools/curate_dentalopg.py /home/claude/opendata/dentalopg
"""
import json, os, shutil, sys, statistics
from PIL import Image

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'data', 'dentalopg')
os.makedirs(os.path.join(OUT, 'full'), exist_ok=True)
os.makedirs(os.path.join(SRC, 'subset'), exist_ok=True)
os.makedirs(os.path.join(SRC, 'raw'), exist_ok=True)

CLASS_CODE = {  # source class -> PanoramIA taxonomy code
    'Caries': 'DEN-CAR', 'Filling': 'DEN-FIL', 'Cap': 'DEN-CRN', 'Bridge': 'DEN-BRG', 'Rootcanel': 'DEN-RCT',
    'apical abscss': 'DEN-PAR', 'Periodontities': 'DEN-PBL', 'BDR': 'DEN-ROOT', 'Missing Teeth': 'DEN-MIS',
    'Horizontal Impaction': 'DEN-IMP', 'Distoangular impaction': 'DEN-IMP', 'Unerupted Wisdom Teeth': 'DEN-IMP',
    'Normal Teeth': 'ANA-TTH', 'Mixed Dentition': None,
}

m = json.load(open(os.path.join(SRC, 'full_manifest.json'), encoding='utf-8'))


def center(b):
    return (b[0] + b[2] / 2, b[1] + b[3] / 2)


def number_teeth(teeth, missing, W):
    """teeth/missing: lists of dicts with 'box'. Returns list of (item, fdi) for teeth and missing."""
    items = [dict(t, kind='tooth') for t in teeth] + [dict(mi, kind='missing') for mi in missing]
    if len(items) < 4:
        return [(t, None) for t in items]
    ys = sorted(center(t['box'])[1] for t in items)
    # split arches at the largest gap in the middle 60 % of the y range
    lo, hi = int(len(ys) * 0.2), int(len(ys) * 0.8)
    best, cut = -1, statistics.median(ys)
    for i in range(max(1, lo), max(2, hi)):
        g = ys[i] - ys[i - 1]
        if g > best:
            best, cut = g, (ys[i] + ys[i - 1]) / 2
    xs = [center(t['box'])[0] for t in items]
    mid = statistics.median(xs)
    out = []
    for upper in (True, False):
        for right in (True, False):  # image left = patient right
            group = [t for t in items if (center(t['box'])[1] < cut) == upper and ((center(t['box'])[0] < mid) == right)]
            group.sort(key=lambda t: abs(center(t['box'])[0] - mid))
            q = (1 if right else 2) if upper else (4 if right else 3)
            for k, t in enumerate(group):
                out.append((t, q * 10 + k + 1 if k < 8 else None))
    return out


images_out, subset, raw_index = [], [], []
counts = {}
# subset: spread over the set, prefer images with rarer labels
def score(e):
    s = 0
    for a in e['annotations']:
        s += {'apical abscss': 6, 'Bridge': 5, 'Periodontities': 5, 'Rootcanel': 2, 'Horizontal Impaction': 2, 'Distoangular impaction': 3, 'Caries': 1, 'Cap': 1, 'Filling': 1}.get(a['cls'], 0)
    return s
ranked = sorted(m['images'], key=score, reverse=True)
subset_ids = set(e['id'] for e in ranked[:16]) | set(e['id'] for e in m['images'][::190][:8])

for e in m['images']:
    teeth = [a for a in e['annotations'] if a['cls'] == 'Normal Teeth']
    missing = [a for a in e['annotations'] if a['cls'] == 'Missing Teeth']
    numbered = number_teeth(teeth, missing, e['width'])
    fdi_of = {id(t_src): f for (t, f) in numbered for t_src in [t]}
    teeth_out, structures = [], []
    for (t, f) in numbered:
        if t['kind'] == 'tooth':
            teeth_out.append({'fdi': f, 'box': t['box'], 'poly': t.get('poly')})
    for a in e['annotations']:
        if a['cls'] == 'Normal Teeth':
            continue
        code = CLASS_CODE.get(a['cls'])
        f = None
        if a['cls'] == 'Missing Teeth':
            f = next((ff for (t, ff) in numbered if t['kind'] == 'missing' and t['box'] == a['box']), None)
        structures.append({'kind': a['cls'], 'code': code, 'box': a['box'], 'poly': a.get('poly'), 'fdi': f})
        counts[a['cls']] = counts.get(a['cls'], 0) + 1
    mixed = any(a['cls'] == 'Mixed Dentition' for a in e['annotations'])
    rec = {'id': e['id'], 'file': e['id'] + '.jpg', 'split': e['split'], 'width': e['width'], 'height': e['height'], 'srcWidth': e['origWidth'], 'srcHeight': e['origHeight'],
           'age': e['age'], 'mixedDentition': mixed, 'teeth': teeth_out, 'structures': structures, 'fdiSource': 'estimated-order'}
    images_out.append(rec)
    shutil.copyfile(os.path.join(SRC, 'full', e['id'] + '.jpg'), os.path.join(OUT, 'full', e['id'] + '.jpg'))
    im = Image.open(os.path.join(SRC, 'full', e['id'] + '.jpg')).convert('L')
    # raw dump at 1000 px for the Node evaluation
    s = 1000 / im.width
    small = im.resize((1000, round(im.height * s)), Image.LANCZOS)
    with open(os.path.join(SRC, 'raw', e['id'] + '.gray'), 'wb') as fh:
        fh.write(small.tobytes())
    raw_index.append({'id': e['id'], 'width': small.width, 'height': small.height, 'scale': s})
    if e['id'] in subset_ids:
        small.save(os.path.join(SRC, 'subset', e['id'] + '.jpg'), 'JPEG', quality=72, optimize=True)
        def sc(b): return [round(v * s) for v in b]
        def sp(p): return [[round(x * s), round(y * s)] for x, y in p] if p else None
        subset.append(dict(rec, width=small.width, height=small.height, teeth=[dict(t, box=sc(t['box']), poly=sp(t['poly'])) for t in teeth_out],
                           structures=[dict(st, box=sc(st['box']), poly=sp(st['poly'])) for st in structures]))

meta = {
    'dataset': 'DentalOPG-1550', 'version': '3', 'key': 'opg', 'prefix': 'opg_',
    'sourceRepo': 'https://data.mendeley.com/datasets/rtt726b26d/3', 'sourceCommit': 'rtt726b26d v3 / Roboflow labonis-workspace dental-cjk1c v4',
    'licence': 'CC BY 4.0 (attribution; commercial use allowed), as stated on Mendeley Data and in the Roboflow export',
    'citation': 'Chowdhury SH, Arman MS. DentalOPG-1550: A Panoramic Dental X-Ray Image Dataset for Dental Disease Research. Mendeley Data, V3, 2026. doi:10.17632/rtt726b26d.3',
    'site': 'Daffodil International University, Dhaka, Bangladesh (annotations reviewed by a medical technologist, IHT Bogura)',
    'ethics': 'Routine diagnostic OPG examinations; the dataset page does not state the ethics approval. Original file names carried patient names and ages: PanoramIA renamed every file and kept only the age.',
    'processing': 'Originals 2871×1536 BMP converted to 8-bit grayscale, resized to 1400 px wide (LANCZOS), JPEG quality 86; the embedded subset to 1000 px, quality 72. Labels are the YOLOv8 boxes (polygons for a few teeth), drawn by the authors on 640×640 stretched copies and rescaled here. FDI numbers are estimated by position (teeth and labelled gaps ordered from the midline), not given by the source.',
    'annotationSource': 'Single-source bounding boxes for 14 classes (caries, filling, cap, bridge, root canal, apical abscess, periodontitis, BDR = broken-down root, missing teeth, impactions, unerupted third molars, mixed dentition, normal teeth); not double-read inside PanoramIA.',
    'classMap': CLASS_CODE, 'counts': counts,
}
json.dump(dict(meta, images=images_out), open(os.path.join(OUT, 'full_manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(dict(meta, images=subset), open(os.path.join(SRC, 'subset_manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(raw_index, open(os.path.join(SRC, 'raw_index.json'), 'w'))
open(os.path.join(OUT, 'LICENSE-DATA.md'), 'w', encoding='utf-8').write(
    '# DentalOPG-1550 — data licence\n\nThe images and labels in this folder are a rescaled, renamed copy of DentalOPG-1550 '
    '(Chowdhury SH, Arman MS; Mendeley Data V3, doi:10.17632/rtt726b26d.3), licensed CC BY 4.0. Attribution is required. '
    'File names were changed because the originals contained patient names; only the age was kept. The FDI numbers in '
    'full_manifest.json are PanoramIA estimates, not part of the source.\n')
print('images', len(images_out), 'subset', len(subset), 'counts', counts)
