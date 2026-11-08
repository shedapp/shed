#!/usr/bin/env python3
"""Packs the JPEGs of a complete open dataset into a few binary pack files (≤ 18 MiB each; .jpg extension because static hosts and the artifact service only serve web types; the first image of a pack decodes as a normal JPEG) so a static host serves
hundreds of images with a handful of requests. Adds `packs` and per-image `pack: {i, offset, len}` to full_manifest.json;
the app slices each image out of the pack blob. The loose files in full/ stay as they are.
Usage: python3 -I tools/pack_images.py data/akudental data/dentalopg"""
import json, os, sys

LIMIT = 18 * 1024 * 1024
for base in sys.argv[1:]:
    mp = os.path.join(base, 'full_manifest.json')
    m = json.load(open(mp, encoding='utf-8'))
    os.makedirs(os.path.join(base, 'packs'), exist_ok=True)
    packs, cur, size, fh = [], None, 0, None
    def open_pack():
        global cur, size, fh
        cur = {'file': 'packs/pack_%03d.jpg' % len(packs), 'size': 0, 'images': 0}
        packs.append(cur); size = 0; fh = open(os.path.join(base, cur['file']), 'wb')
    open_pack()
    for e in m['images']:
        data = open(os.path.join(base, 'full', e['file']), 'rb').read()
        if size + len(data) > LIMIT and size > 0:
            fh.close(); cur['size'] = size; open_pack()
        e['pack'] = {'i': len(packs) - 1, 'offset': size, 'len': len(data)}
        fh.write(data); size += len(data); cur['images'] += 1
    fh.close(); cur['size'] = size
    m['packs'] = packs
    json.dump(m, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(base, len(packs), 'packs', round(sum(p['size'] for p in packs) / 1e6, 1), 'MB')
