// synthetic check: a vibrato voice sweeping through notes, with and without a "song" leaking in
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('dsp.js', 'utf8') + '\n' + fs.readFileSync('pitch.js', 'utf8'); const ctx = { module: { exports: {} }, console }; vm.runInNewContext(src, ctx); const { PitchEngine } = ctx.module.exports;
const { makeModel } = require('./pe_node.js');
(async () => {
  const sr = 44100, n = sr * 8; const mic = new Float32Array(n), song = new Float32Array(n); const truth = new Float32Array(n);
  const seq = [60, 62, 64, 65, 67, 69, 71, 72];
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; const midi = seq[Math.floor(t / 1) % seq.length] + 0.3 * Math.sin(2 * Math.PI * 5.5 * t); truth[i] = midi; const f = 440 * Math.pow(2, (midi - 69) / 12); ph += 2 * Math.PI * f / sr; let v = 0; for (let h = 1; h <= 10; h++) v += 0.1 / h * Math.sin(ph * h); const on = (t % 1) > 0.08 && (t % 1) < 0.92; mic[i] = on ? v : 0; if (!on) truth[i] = -1;
    const fs2 = 196 * Math.pow(2, (Math.floor(t / 0.5) % 4) * 3 / 12); song[i] = 0.15 * (Math.sin(2 * Math.PI * fs2 * t) + 0.5 * Math.sin(2 * Math.PI * fs2 * 2 * t) + 0.3 * Math.sin(2 * Math.PI * fs2 * 1.5 * t)); }
  const model = makeModel('dist/crepe-tiny.onnx', 'crepe_server.py');
  for (const [label, leak, useNN] of [['clean, CREPE', 0, true], ['clean, NSDF fallback', 0, false], ['song leak −10 dB, CREPE', 0.3, true], ['song leak −4 dB, CREPE', 0.6, true]]) {
    const eng = new PitchEngine(sr); if (useNN) eng.model = model;
    let hit = 0, wrong = 0, voicedTruth = 0, falseV = 0, silentTruth = 0; const t0 = Date.now(); const B = 1024;
    for (let o = 0; o < n; o += B) { const m = new Float32Array(B), s = new Float32Array(B); for (let j = 0; j < B; j++) { const i = o + j; m[j] = (i < n ? mic[i] : 0) + leak * (i < n ? song[i] : 0); s[j] = i < n ? song[i] : 0; }
      await eng.push(m, leak ? s : null, (midi, r, src) => { const i = o + src; if (i < 0 || i >= n) return; const tr = truth[i]; if (tr < 0) { silentTruth++; if (midi != null) falseV++; } else { voicedTruth++; if (midi != null) { if (Math.abs(midi - tr) < 0.5) hit++; else wrong++; } } }); }
    console.log(label.padEnd(26), 'tracked', (100 * hit / voicedTruth).toFixed(0) + '%', 'wrong', (100 * wrong / voicedTruth).toFixed(1) + '%', 'false voice in rests', (100 * falseV / silentTruth).toFixed(1) + '%', 'nn frames', eng.stats.nn, 'gated', eng.stats.gated, 'songMatch', eng.stats.songMatch, 'k', eng.k && eng.k.toFixed(3), (Date.now() - t0) + ' ms');
  }
  model.close();
})();
