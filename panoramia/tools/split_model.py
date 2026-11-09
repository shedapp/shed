#!/usr/bin/env python3
"""Splits an ONNX model into parts ≤ 18 MB for static hosts and writes models/panoramia_model.json with `parts`.
Usage: python3 -I tools/split_model.py runs/panoramia_yolo.onnx runs/panoramia_model.json [models/]"""
import json, os, sys
onnx, card_path = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else 'models/'
os.makedirs(out, exist_ok=True)
card = json.load(open(card_path, encoding='utf-8')); data = open(onnx, 'rb').read(); LIMIT = 18 * 1024 * 1024
parts = []
for i in range(0, len(data), LIMIT):
    name = 'panoramia_yolo.part%02d.jpg' % len(parts)   # .jpg so the artifact service / static hosts serve it; it is raw ONNX bytes
    open(os.path.join(out, name), 'wb').write(data[i:i + LIMIT]); parts.append(name)
card['parts'] = parts; card['bytes'] = len(data); card.pop('file', None)
card['partNote'] = 'Weights are the ONNX file split in parts (named .jpg only so static hosts serve them); the app concatenates them.'
json.dump(card, open(os.path.join(out, 'panoramia_model.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', len(parts), 'parts,', len(data) // 1024 // 1024, 'MB')
