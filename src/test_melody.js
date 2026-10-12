const { trackMelody } = require('./dsp.js');
const sr = 44100, secs = 12, n = sr * secs; const x = new Float32Array(n);
const seq = [0,2,4,5,7,9,7,5,4,2,0,-1,0,4,7,12,9,7,5,2,0,2,3,5,7,8,7,5,3,2,0]; const truth = [];
let phase = 0; for (let i = 0; i < n; i++) { const t = i / sr; const idx = Math.floor(t / 0.4) % seq.length; const f0 = 330 * Math.pow(2, seq[idx] / 12) * (1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t)); phase += 2 * Math.PI * f0 / sr; const venv = Math.min(1, (t % 0.4) * 20) * Math.min(1, (0.4 - t % 0.4) * 20); let v = 0; for (let h = 1; h <= 12; h++) v += 0.12 / Math.pow(h, 0.8) * Math.sin(h * phase); x[i] = v * venv + 0.02 * (Math.random() - 0.5); if (i % 512 === 0) truth.push({ t, midi: 69 + 12 * Math.log2(f0 / 440) }); }
const t0 = Date.now(); const pts = trackMelody(x, sr); const ms = Date.now() - t0;
let err = 0, cnt = 0, big = 0; for (const p of pts) { const tr = truth[Math.round(p.t * sr / 512)]; if (!tr) continue; const d = Math.abs(p.midi - tr.midi); if (d > 0.5) big++; else { err += d; cnt++; } }
console.log(`tracked ${pts.length} frames in ${ms} ms · mean err ${(err / cnt * 100).toFixed(1)} cents · gross errors ${big} (${(100 * big / pts.length).toFixed(1)}%) · coverage ${(100 * pts.length / (n / 512)).toFixed(0)}%`);
const bad = []; for (const p of pts) { const tr = truth[Math.round(p.t * sr / 512)]; if (tr && Math.abs(p.midi - tr.midi) > 0.5) bad.push([p.t.toFixed(2), p.midi.toFixed(1), tr.midi.toFixed(1)]); }
console.log(bad.slice(0, 12).map(b => b.join('/')).join('  '));
