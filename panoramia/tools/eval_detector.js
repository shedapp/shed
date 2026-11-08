// Evaluates the in-app radiopacity detector on the AKUDENTAL set (needs raw gray dumps: see tools/eval_detector.py).
const fs = require('fs'), path = require('path');
require('../src/68-detector.js'); const D = globalThis.PX_DETECT;
const dir = process.argv[2]; const m = JSON.parse(fs.readFileSync(path.join(dir, 'full_manifest.json'), 'utf8'));
let TP = 0, FP = 0, FN = 0, n = 0;
for (const e of m.images) {
  const gray = fs.readFileSync(path.join(dir, 'raw', e.srcId + '.gray'));
  const data = new Uint8ClampedArray(e.width * e.height * 4);
  for (let i = 0; i < gray.length; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = gray[i]; data[i * 4 + 3] = 255; }
  const dets = D.detectImageData({ width: e.width, height: e.height, data }, {});
  const r = D.evaluate(dets, e.structures.map(s => ({ x: s.box[0], y: s.box[1], w: s.box[2], h: s.box[3] })), 0.25);
  TP += r.tp; FP += r.fp; FN += r.fn; n++;
}
console.log(JSON.stringify({ images: n, tp: TP, fp: FP, fn: FN, sensitivity: +(TP / (TP + FN)).toFixed(3), ppv: +(TP / (TP + FP)).toFixed(3) }));
