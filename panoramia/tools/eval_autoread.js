// Evaluates the automatic reading (PX_AUTO) on AKUDENTAL: radiopacity class mapping against the three labelled
// structure classes (filling_crown, bridge, implant) and counts of the other proposal types (no ground truth for those).
// Usage: node tools/eval_autoread.js <curated-dir> [--dump N]   (writes overlays for N images as JSON for tools/draw_autoread.py)
const fs = require('fs'), path = require('path');
require('../src/45-geometry.js'); require('../src/68-detector.js'); require('../src/69-autoread.js');
const D = globalThis.PX_DETECT, A = globalThis.PX_AUTO;
const dir = process.argv[2]; const dumpN = process.argv.indexOf('--dump') > -1 ? +process.argv[process.argv.indexOf('--dump') + 1] : 0;
const m = JSON.parse(fs.readFileSync(path.join(dir, 'full_manifest.json'), 'utf8'));
const MAP = { filling_crown: ['DEN-FIL', 'DEN-CRN', 'DEN-RST', 'DEN-ROP', 'DEN-RCT', 'DEN-POST'], bridge: ['DEN-BRG'], implant: ['DEN-IMPL'] };
const stats = { images: 0, byRefKind: {}, byCode: {}, proposals: {}, anatomy: {} };
const dumps = [];
let t0 = Date.now();
for (const e of m.images) {
  const gray = fs.readFileSync(path.join(dir, 'raw', e.srcId + '.gray'));
  const data = new Uint8ClampedArray(e.width * e.height * 4);
  for (let i = 0; i < gray.length; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = gray[i]; data[i * 4 + 3] = 255; }
  const res = A.analyzeImageData({ width: e.width, height: e.height, data }, e.teeth.map(t => ({ fdi: t.fdi, poly: t.poly })), { noNormalize: process.env.NONORM === "1" });
  stats.images++;
  for (const a of res.anatomy) stats.anatomy[a.code] = (stats.anatomy[a.code] || 0) + 1;
  for (const f of res.findings) stats.proposals[f.code] = (stats.proposals[f.code] || 0) + 1;
  // match bright proposals to reference structures by IoU of boxes (greedy), then score the class
  const refs = e.structures.map(s => ({ kind: s.kind, box: { x: s.box[0], y: s.box[1], w: s.box[2], h: s.box[3] }, used: false }));
  const opaque = res.findings.filter(f => !/DEN-PAR|JAW-RLU/.test(f.code));
  for (const f of opaque) {
    let best = 0, br = null;
    for (const r of refs) { if (r.used) continue; const v = D.iou(f.box, r.box); if (v > best) { best = v; br = r; } }
    const bc = stats.byCode[f.code] = stats.byCode[f.code] || { n: 0, matched: 0, classOk: 0 };
    bc.n++;
    if (best >= 0.25 && br) {
      br.used = true; bc.matched++;
      const ok = MAP[br.kind].indexOf(f.code) > -1; if (ok) bc.classOk++;
      const rk = stats.byRefKind[br.kind] = stats.byRefKind[br.kind] || { refs: 0, found: 0, classOk: 0 };
      rk.found++; if (ok) rk.classOk++;
    }
  }
  for (const r of refs) { const rk = stats.byRefKind[r.kind] = stats.byRefKind[r.kind] || { refs: 0, found: 0, classOk: 0 }; rk.refs++; }
  if (dumps.length < dumpN) dumps.push({ file: e.file, width: e.width, height: e.height, anatomy: res.anatomy, findings: res.findings, refs: e.structures });
}
stats.msPerImage = Math.round((Date.now() - t0) / stats.images);
for (const k of Object.keys(stats.byRefKind)) { const r = stats.byRefKind[k]; r.sensitivity = +(r.found / r.refs).toFixed(3); r.classAccuracyWhenFound = +(r.classOk / Math.max(1, r.found)).toFixed(3); }
for (const k of Object.keys(stats.byCode)) { const r = stats.byCode[k]; r.ppvAnyStructure = +(r.matched / r.n).toFixed(3); r.ppvRightClass = +(r.classOk / r.n).toFixed(3); }
console.log(JSON.stringify(stats, null, 1));
if (dumpN) fs.writeFileSync(path.join(dir, 'autoread_dump.json'), JSON.stringify(dumps));
