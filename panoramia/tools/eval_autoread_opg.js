// Evaluates the automatic reading (PX_AUTO) against the DentalOPG-1550 labels (14 classes, boxes).
// Uses the 1000 px raw dumps written by tools/curate_dentalopg.py. Two populations:
//   all images (radiopacity / radiolucency detection regardless of tooth outlines) and
//   images with >= 20 labelled teeth (where the atlas and per-tooth classification can run).
// Usage: node tools/eval_autoread_opg.js <curated-dir> [--iou 0.2]
const fs = require('fs'), path = require('path');
require('../src/45-geometry.js'); require('../src/68-detector.js'); require('../src/69-autoread.js');
const D = globalThis.PX_DETECT, A = globalThis.PX_AUTO;
const dir = process.argv[2]; const IOU = process.argv.indexOf('--iou') > -1 ? +process.argv[process.argv.indexOf('--iou') + 1] : 0.2;
const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'dentalopg', 'full_manifest.json'), 'utf8'));
const rawIdx = {}; JSON.parse(fs.readFileSync(path.join(dir, 'raw_index.json'), 'utf8')).forEach(r => { rawIdx[r.id] = r; });
const CODES = ['DEN-RCT', 'DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-PAR', 'DEN-CAR', 'DEN-ROOT', 'DEN-IMP', 'DEN-PBL'];
// which proposal codes count as a hit for each reference code (a crown proposed as filling is still "found", counted separately as class error)
const FAMILY = { 'DEN-RCT': ['DEN-RCT', 'DEN-POST'], 'DEN-FIL': ['DEN-FIL', 'DEN-CRN', 'DEN-RST', 'DEN-ROP', 'DEN-BRG'], 'DEN-CRN': ['DEN-CRN', 'DEN-FIL', 'DEN-RST', 'DEN-BRG'], 'DEN-BRG': ['DEN-BRG', 'DEN-CRN', 'DEN-FIL', 'DEN-RST'], 'DEN-PAR': ['DEN-PAR', 'JAW-RLU'], 'DEN-CAR': [], 'DEN-ROOT': ['DEN-IMPL', 'JAW-ROP', 'DEN-RST'], 'DEN-IMP': [], 'DEN-PBL': [] };
function newStats() { const s = {}; CODES.forEach(c => { s[c] = { refs: 0, found: 0, exact: 0 }; }); s.proposals = {}; s.images = 0; return s; }
const all = newStats(), teethOnly = newStats();
let t0 = Date.now();
for (const e of man.images) {
  const r = rawIdx[e.id]; if (!r) continue;
  const gray = fs.readFileSync(path.join(dir, 'raw', e.id + '.gray'));
  const W = r.width, H = r.height, s = r.scale;
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < gray.length; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = gray[i]; data[i * 4 + 3] = 255; }
  const teeth = e.teeth.filter(t => t.fdi).map(t => ({ fdi: t.fdi, poly: (t.poly || [[t.box[0], t.box[1]], [t.box[0] + t.box[2], t.box[1]], [t.box[0] + t.box[2], t.box[1] + t.box[3]], [t.box[0], t.box[1] + t.box[3]]]).map(p => [p[0] * s, p[1] * s]) }));
  const hasTeeth = teeth.length >= 20;
  const res = A.analyzeImageData({ width: W, height: H, data }, hasTeeth ? teeth : [], {});
  const refs = e.structures.filter(x => x.code && CODES.indexOf(x.code) > -1).map(x => ({ code: x.code, box: { x: x.box[0] * s, y: x.box[1] * s, w: x.box[2] * s, h: x.box[3] * s } }));
  const pops = hasTeeth ? [all, teethOnly] : [all];
  for (const S of pops) {
    S.images++;
    for (const f of res.findings) { const k = f.code; S.proposals[k] = S.proposals[k] || { n: 0, hitAny: 0, hitExact: 0 }; S.proposals[k].n++; }
    for (const ref of refs) {
      S[ref.code].refs++;
      let bestAny = 0, bestExact = 0, hitF = null;
      for (const f of res.findings) {
        const v = D.iou(f.box, ref.box); if (v < IOU) continue;
        if (FAMILY[ref.code].indexOf(f.code) > -1 && v > bestAny) { bestAny = v; hitF = f; }
        if (f.code === ref.code && v > bestExact) bestExact = v;
      }
      if (bestAny > 0) { S[ref.code].found++; }
      if (bestExact > 0) S[ref.code].exact++;
    }
    for (const f of res.findings) {
      const anyHit = refs.some(ref => D.iou(f.box, ref.box) >= IOU && FAMILY[ref.code].indexOf(f.code) > -1);
      const exactHit = refs.some(ref => D.iou(f.box, ref.box) >= IOU && ref.code === f.code);
      if (anyHit) S.proposals[f.code].hitAny++; if (exactHit) S.proposals[f.code].hitExact++;
    }
  }
}
function finish(S) {
  const out = { images: S.images, byRef: {}, byProposal: {} };
  CODES.forEach(c => { const r = S[c]; if (r.refs) out.byRef[c] = { refs: r.refs, sensitivityFamily: +(r.found / r.refs).toFixed(3), sensitivityExact: +(r.exact / r.refs).toFixed(3) }; });
  Object.keys(S.proposals).forEach(k => { const p = S.proposals[k]; out.byProposal[k] = { n: p.n, perImage: +(p.n / S.images).toFixed(2), ppvFamily: +(p.hitAny / p.n).toFixed(3), ppvExact: +(p.hitExact / p.n).toFixed(3) }; });
  return out;
}
console.log(JSON.stringify({ iou: IOU, msPerImage: Math.round((Date.now() - t0) / all.images), allImages: finish(all), imagesWithTeeth: finish(teethOnly) }, null, 1));
