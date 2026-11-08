#!/usr/bin/env python3
"""Dump 8-bit gray pixels of the AKUDENTAL export so tools/eval_detector.js can score the in-app detector.
Usage: python3 tools/eval_detector.py <curated-dir>   then   node tools/eval_detector.js <curated-dir>"""
import json, os, sys, numpy as np
from PIL import Image
d = sys.argv[1]; os.makedirs(os.path.join(d, 'raw'), exist_ok=True)
m = json.load(open(os.path.join(d, 'full_manifest.json'), encoding='utf-8'))
for e in m['images']:
    np.asarray(Image.open(os.path.join(d, 'full', e['file'])).convert('L'), dtype=np.uint8).tofile(os.path.join(d, 'raw', '%d.gray' % e['srcId']))
print('dumped', len(m['images']), 'images')
