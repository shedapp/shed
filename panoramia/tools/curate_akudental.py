#!/usr/bin/env python3
"""Curate a teaching subset of the AKUDENTAL dataset for PanoramIA.

AKUDENTAL: Öz M, Şengül A, Hatipoğlu M, Danışman T. "AKUDENTAL teeth instance
segmentation dataset: a cross-dataset analysis." BMC Oral Health 2026;26.
doi:10.1186/s12903-025-07645-0. Repository: https://github.com/melihoz/AKUDENTAL
Licence stated by the authors: CC BY-NC-SA 4.0, non-commercial academic research.

Usage:
  python3 tools/curate_akudental.py <path-to-AKUDENTAL-clone> <out-dir>

Writes:
  <out>/subset/akudental_<id>.jpg        1400 px wide, grayscale JPEG (embedded in the app)
  <out>/full/akudental_<id>.jpg          1400 px wide, grayscale JPEG (all 333, served from data/)
  <out>/subset_manifest.json, <out>/full_manifest.json
  <out>/contact_sheet.png                visual check for burned-in text

The selection is deterministic (sorted ids within rule-based groups) so it can be audited.
Coordinates in the manifests are already scaled to the exported image size.
"""
import json, os, sys, collections, subprocess
from PIL import Image, ImageDraw, ImageFont

TARGET_W = 1400
JPEG_Q = 78

def main():
    repo, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'subset'), exist_ok=True)
    os.makedirs(os.path.join(out, 'full'), exist_ok=True)
    commit = subprocess.check_output(['git', '-C', repo, 'rev-parse', 'HEAD']).decode().strip()
    coco = json.load(open(os.path.join(repo, 'AKUDENTAL', 'akudental_instances.json'), encoding='utf-8'))
    cats = {c['id']: c['name'] for c in coco['categories']}
    tooth_cat = {cid: int(name.split(' - ')[0]) for cid, name in cats.items() if name[:2].isdigit()}
    struct_cat = {cid: name for cid, name in cats.items() if cid not in tooth_cat}
    per = collections.defaultdict(list)
    for a in coco['annotations']:
        per[a['image_id']].append(a)
    images = {im['id']: im for im in coco['images']}

    feats = {}
    for iid, im in images.items():
        anns = per.get(iid, [])
        teeth = [tooth_cat[a['category_id']] for a in anns if a['category_id'] in tooth_cat]
        c = collections.Counter(teeth)
        structs = collections.Counter(struct_cat[a['category_id']] for a in anns if a['category_id'] in struct_cat)
        feats[iid] = {
            'id': iid, 'teeth': len(teeth), 'distinct': len(c), 'dup': any(n > 1 for n in c.values()),
            'impl': structs.get('Implant', 0), 'bridge': structs.get('Bridge', 0), 'fill': structs.get('Filling - Crown', 0),
            'm3': sum(1 for t in (18, 28, 38, 48) if t in c), 'lowerM3': sum(1 for t in (38, 48) if t in c),
        }

    clean = [f for f in feats.values() if not f['dup']]
    chosen, groups = [], {}

    def take(name, cands, n, key):
        got = [f for f in sorted(cands, key=key) if f['id'] not in chosen][:n]
        for f in got:
            chosen.append(f['id'])
        groups[name] = [f['id'] for f in got]

    take('implants', [f for f in clean if f['impl'] >= 1], 8, lambda f: (-f['impl'], f['id']))
    take('bridges', [f for f in clean if f['bridge'] >= 1 and f['impl'] == 0], 7, lambda f: (-f['bridge'], f['id']))
    take('third_molars', [f for f in clean if f['m3'] == 4 and f['fill'] <= 2], 8, lambda f: (f['fill'], f['id']))
    take('partially_edentulous', [f for f in clean if f['teeth'] <= 18], 6, lambda f: (f['teeth'], f['id']))
    take('typical', [f for f in clean if 26 <= f['teeth'] <= 30 and 2 <= f['fill'] <= 6 and f['lowerM3'] >= 1], 7, lambda f: (f['id'],))
    assert len(chosen) == 36, len(chosen)

    def export(iid, folder):
        im = images[iid]
        src = Image.open(os.path.join(repo, 'AKUDENTAL', 'images', im['file_name'])).convert('L')
        assert src.size == (im['width'], im['height']), (iid, src.size, im['width'], im['height'])
        s = TARGET_W / src.width
        dst = src.resize((TARGET_W, round(src.height * s)), Image.LANCZOS)
        name = 'akudental_%03d.jpg' % iid
        dst.save(os.path.join(out, folder, name), 'JPEG', quality=JPEG_Q, optimize=True)
        teeth, structs = [], []
        present = set()
        for a in per.get(iid, []):
            x, y, w, h = a['bbox']
            box = [round(x * s), round(y * s), round(w * s), round(h * s)]
            poly = []
            seg = a['segmentation'][0] if a.get('segmentation') else []
            for k in range(0, len(seg) - 1, 2):
                poly.append([round(seg[k] * s), round(seg[k + 1] * s)])
            if a['category_id'] in tooth_cat:
                fdi = tooth_cat[a['category_id']]
                present.add(fdi)
                teeth.append({'fdi': fdi, 'box': box, 'poly': poly})
            else:
                kind = {'Implant': 'implant', 'Bridge': 'bridge', 'Filling - Crown': 'filling_crown'}[struct_cat[a['category_id']]]
                structs.append({'kind': kind, 'box': box, 'poly': poly})
        all_fdi = [q * 10 + p for q in (1, 2, 3, 4) for p in range(1, 9)]
        absent = [t for t in all_fdi if t not in present]
        teeth.sort(key=lambda t: t['fdi'])
        return {'srcId': iid, 'file': name, 'srcFile': im['file_name'], 'srcWidth': im['width'], 'srcHeight': im['height'],
                'width': dst.width, 'height': dst.height, 'scale': round(s, 6), 'teeth': teeth, 'structures': structs, 'absent': absent}, dst

    meta = {
        'dataset': 'AKUDENTAL', 'version': '1.0', 'sourceRepo': 'https://github.com/melihoz/AKUDENTAL', 'sourceCommit': commit,
        'licence': 'CC BY-NC-SA 4.0 (non-commercial academic research, attribution, share-alike), as stated by the dataset authors',
        'citation': 'Öz M, Şengül A, Hatipoğlu M, Danışman T. AKUDENTAL teeth instance segmentation dataset: a cross-dataset analysis. BMC Oral Health. 2026;26. doi:10.1186/s12903-025-07645-0',
        'site': 'Akdeniz University Dental Hospital, Antalya, Türkiye', 'ethics': 'Akdeniz University Clinical Research Ethical Committee, KAEK-72; retrospective, anonymised, consent waived',
        'processing': 'Converted to 8-bit grayscale, resized to %d px wide (LANCZOS), JPEG quality %d. Annotation coordinates scaled accordingly. No other change.' % (TARGET_W, JPEG_Q),
        'annotationSource': 'Single expert instance annotations (teeth by FDI number, implants, bridges, fillings/crowns) from the published dataset; not double-read inside PanoramIA.',
    }
    subset_entries, thumbs = [], []
    for iid in chosen:
        e, dst = export(iid, 'subset')
        subset_entries.append(e)
        thumbs.append((iid, dst))
    json.dump(dict(meta, selection=groups, images=subset_entries), open(os.path.join(out, 'subset_manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    full_entries = []
    for iid in sorted(images):
        e, _ = export(iid, 'full')
        full_entries.append(e)
    json.dump(dict(meta, images=full_entries), open(os.path.join(out, 'full_manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False)

    # contact sheet for the visual burned-in check
    cols, tw = 4, 420
    th = round(tw * thumbs[0][1].height / thumbs[0][1].width)
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('L', (cols * tw, rows * (th + 18)), 255)
    d = ImageDraw.Draw(sheet)
    for k, (iid, dst) in enumerate(thumbs):
        x, y = (k % cols) * tw, (k // cols) * (th + 18)
        sheet.paste(dst.resize((tw, th)), (x, y + 18))
        d.text((x + 4, y + 2), 'id %d' % iid, fill=0)
    sheet.save(os.path.join(out, 'contact_sheet.png'))
    sizes = [os.path.getsize(os.path.join(out, 'subset', e['file'])) for e in subset_entries]
    print('subset', len(subset_entries), 'images', round(sum(sizes) / 1024), 'KB total; groups', {k: len(v) for k, v in groups.items()})
    print('full', len(full_entries), 'images', round(sum(os.path.getsize(os.path.join(out, 'full', e['file'])) for e in full_entries) / 1e6, 1), 'MB')

if __name__ == '__main__':
    main()
