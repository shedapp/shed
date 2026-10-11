const { processChannel } = require('./dsp.js');
const sr = 44100;
function tone(f, secs) { const n = sr * secs, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = 0.5 * Math.sin(2 * Math.PI * f * i / sr); return a; }
function freq(sig) { let z = 0; for (let i = 1; i < sig.length; i++) if (sig[i - 1] < 0 && sig[i] >= 0) z++; return z / (sig.length / sr); }
function rms(sig) { let s = 0; for (const v of sig) s += v * v; return Math.sqrt(s / sig.length); }
const x = tone(440, 3);
const cases = [[0, 1], [12, 1], [-5, 1], [0, 0.5], [3, 0.75], [-12, 1.2]];
let ok = true;
for (const [s, t] of cases) {
  const t0 = Date.now();
  const y = processChannel(x, s, t);
  const expF = 440 * Math.pow(2, s / 12), expLen = x.length / t;
  const f = freq(y.subarray(sr >> 1, y.length - (sr >> 1)));
  const lenErr = Math.abs(y.length - expLen) / expLen;
  const pass = Math.abs(f - expF) / expF < 0.01 && lenErr < 0.01 && rms(y) > 0.3;
  ok = ok && pass;
  console.log(`semi ${s} tempo ${t}: f=${f.toFixed(1)} (exp ${expF.toFixed(1)}) len err ${(lenErr * 100).toFixed(2)}% rms ${rms(y).toFixed(3)} ${Date.now() - t0}ms ${pass ? 'OK' : 'FAIL'}`);
}
process.exit(ok ? 0 : 1);
