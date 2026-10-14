// Live pitch monitor: new LivePitch vs the old in-page detector, on synthetic voices.
const fs = require('fs');
const { LivePitch } = require('./dsp.js');
// old detector, extracted verbatim from the template
const src = fs.readFileSync(__dirname + '/old_detect.js', 'utf8');   // the detector the page used before
const detectPitch = new Function(src + '; return detectPitch;')();
const sr = 44100;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// voice: harmonic source with vibrato, per-harmonic weights, note sequence (semitones from base), level, noise
function voice({ base, seq, noteDur = 0.4, secs = 10, level = 0.3, noise = 0, harm = (h) => 1 / Math.pow(h, 0.8), gaps = 0, jitter = 0.003 }) {
  const n = Math.round(sr * secs), x = new Float32Array(n), truth = new Float32Array(n).fill(NaN), silent = new Uint8Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = Math.floor(t / noteDur), pos = (t % noteDur) / noteDur;
    const silent = gaps && (k % 4 === 3);
    const f0 = base * Math.pow(2, seq[k % seq.length] / 12) * (1 + 0.006 * Math.sin(2 * Math.PI * 5.6 * t)) * (1 + jitter * (rnd() - 0.5));
    ph += 2 * Math.PI * f0 / sr;
    const env = silent ? 0 : Math.min(1, pos * 25) * Math.min(1, (1 - pos) * 25);
    let v = 0; for (let h = 1; h <= 14; h++) { if (h * f0 > sr / 2) break; v += harm(h) * Math.sin(h * ph + h); }
    x[i] = level * 0.25 * v * env + noise * (rnd() * 2 - 1);
    if (env > 0.9) truth[i] = 69 + 12 * Math.log2(f0 / 440);
    if (env === 0) silent[i] = 1;
  }
  // a frame is 'silent' only if its whole 2048-sample window is silent
  const sil = new Uint8Array(n); let run = 0; for (let i = 0; i < n; i++) { run = silent[i] ? run + 1 : 0; if (run >= 2048) sil[i - 1024] = 1; }
  return { x, truth, sil };
}
function score(name, frames, truth, silArr) {
  let tv = 0, det = 0, gross = 0, err = 0, good = 0, fv = 0, sil = 0, jit = 0, jn = 0, prev = null;
  for (const f of frames) {
    if (f.i < 0 || f.i >= truth.length) continue;
    const t = truth[f.i]; const voiced = !isNaN(t);
    if (voiced) { tv++; if (f.m != null) { det++; const d = Math.abs(f.m - t); if (d > 0.5) gross++; else { err += d; good++; } } }
    else if (silArr[f.i]) { sil++; if (f.m != null) fv++; }
    // stability: frame-to-frame wobble the detector adds on top of the true line
    if (prev && voiced && !isNaN(prev.t) && f.m != null && prev.m != null && Math.abs(t - prev.t) < 0.2) { jit += Math.abs((f.m - prev.m) - (t - prev.t)); jn++; }
    prev = { m: f.m, t };
  }
  return { name, detected: (100 * det / tv).toFixed(0) + '%', grossErr: (100 * gross / Math.max(1, det)).toFixed(1) + '%', meanCents: (100 * err / Math.max(1, good)).toFixed(1), falseVoicing: sil ? (100 * fv / sil).toFixed(1) + '%' : '-', addedJitterCents: (100 * jit / Math.max(1, jn)).toFixed(2) };
}
function runNew(x) { const lp = new LivePitch(sr); const frames = []; let base = 0; const B = 1024;
  for (let o = 0; o < x.length; o += B) { const blk = x.subarray(o, Math.min(x.length, o + B)); lp.push(blk, (m, rms, i) => frames.push({ i: o + i - 1024 - 512, m })); } return frames; }
// old: every 40 ms on the latest 2048 samples (as the page did); mark at window centre
function runOld(x) { const frames = []; const hop = Math.round(0.04 * sr); for (let e = 2048; e <= x.length; e += hop) { const f = detectPitch(x.subarray(e - 2048, e), sr); frames.push({ i: e - 1024, m: f > 0 ? 69 + 12 * Math.log2(f / 440) : null }); } return frames; }
const mel = [0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, -1, 0, 4, 7, 12, 9, 7, 5, 2, 0, 2, 3, 5, 7];
const cases = [
  ['mezzo, clean', voice({ base: 330, seq: mel, gaps: 1 })],
  ['quiet singer (−30 dB)', voice({ base: 330, seq: mel, level: 0.01, noise: 0.0004, gaps: 1 })],
  ['breathy + room noise', voice({ base: 300, seq: mel, noise: 0.02, gaps: 1 })],
  ['baritone 98–196 Hz', voice({ base: 110, seq: mel, gaps: 1 })],
  ['soprano to C6', voice({ base: 600, seq: mel, gaps: 1 })],
  ['bright vowel, weak fundamental', voice({ base: 250, seq: mel, harm: (h) => h === 1 ? 0.15 : h === 2 ? 1 : h === 3 ? 0.8 : 0.5 / h, gaps: 1 })],
  ['fast run, 90 ms notes', voice({ base: 330, seq: [0, 3, 5, 7, 10, 12, 10, 7, 5, 3], noteDur: 0.09, gaps: 0 })],
  ['silence + room noise only', (() => { const n = sr * 6, x = new Float32Array(n), truth = new Float32Array(n).fill(NaN), sil = new Uint8Array(n).fill(1); for (let i = 0; i < n; i++) x[i] = 0.003 * (rnd() * 2 - 1) + 0.002 * Math.sin(2 * Math.PI * 60 * i / sr); return { x, truth, sil }; })()],
];
for (const [name, { x, truth, sil }] of cases) {
  const a = score('old', runOld(x), truth, sil), b = score('new', runNew(x), truth, sil);
  console.log(name.padEnd(32), '| old', JSON.stringify(a).replace(/"name":"old",/, ''), '\n'.padEnd(34), '| new', JSON.stringify(b).replace(/"name":"new",/, ''));
}
const t0 = Date.now(); runNew(voice({ base: 330, seq: mel, secs: 30 }).x); console.log('new detector: 30 s of audio in', Date.now() - t0, 'ms');
