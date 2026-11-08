#!/usr/bin/env python3
"""Draws the proposals dumped by tools/eval_autoread.js --dump N onto the images for visual inspection.
Usage: python3 -I tools/draw_autoread.py <curated-dir> <out.png>"""
import json, os, sys
from PIL import Image, ImageDraw
COL = {'ANA-OCC': (118, 255, 3), 'ANA-MF': (255, 23, 68), 'ANA-IAC': (255, 23, 68), 'ANA-RAM': (224, 64, 251), 'ANA-SIN': (64, 196, 255), 'ANA-NAS': (24, 255, 255), 'ANA-MBD': (176, 190, 197),
       'DEN-FIL': (77, 182, 172), 'DEN-CRN': (255, 167, 38), 'DEN-BRG': (240, 98, 146), 'DEN-IMPL': (179, 157, 219), 'DEN-RCT': (165, 214, 167), 'DEN-RST': (128, 203, 196), 'DEN-POST': (200, 200, 120),
       'DEN-PAR': (239, 83, 80), 'JAW-RLU': (130, 177, 255), 'JAW-ROP': (187, 222, 251), 'DEN-ROP': (255, 241, 118)}
d, out = sys.argv[1], sys.argv[2]
dumps = json.load(open(os.path.join(d, 'autoread_dump.json')))
tiles = []
for e in dumps:
    im = Image.open(os.path.join(d, 'full', e['file'])).convert('RGB')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(ov)
    for f in e['findings']:
        c = COL.get(f['code'], (255, 255, 255)); pts = [tuple(p) for p in f['shape']['points']]
        if len(pts) >= 3: dr.polygon(pts, fill=c + (90,), outline=c + (255,))
        else: dr.rectangle([f['box']['x'], f['box']['y'], f['box']['x'] + f['box']['w'], f['box']['y'] + f['box']['h']], outline=c + (255,))
    for a in e['anatomy']:
        c = COL.get(a['code'], (255, 255, 255)); pts = [tuple(p) for p in a['shape']['points']]; t = a['shape']['type']
        if t == 'point': x, y = pts[0]; dr.ellipse([x - 6, y - 6, x + 6, y + 6], outline=c + (255,), width=2)
        elif t == 'polygon': dr.polygon(pts, outline=c + (255,))
        else: dr.line(pts, fill=c + (255,), width=2)
    for r in e['refs']:
        x, y, w, h = r['box']; dr.rectangle([x, y, x + w, y + h], outline=(255, 255, 255, 160))
    im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    tiles.append(im)
W = max(t.width for t in tiles); H = sum(t.height for t in tiles)
sheet = Image.new('RGB', (W, H)); y = 0
for t in tiles: sheet.paste(t, (0, y)); y += t.height
sheet.save(out); print('wrote', out, sheet.size)
