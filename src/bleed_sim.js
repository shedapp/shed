// Mic = singer + song leaking from the speakers. Which detector follows the singer, and which follows the song?
const fs = require('fs'); const { LivePitch, SingTracker, trackMelody } = require('./dsp.js');
const detectPitch = new Function(fs.readFileSync(__dirname + '/old_detect.js', 'utf8') + '; return detectPitch;')();
function readWav(p) { const b = fs.readFileSync(p); let o = 12, fmt, data; while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(o + 8), ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }; if (id === 'data') { data = { off: o + 8, len: Math.min(len, b.length - o - 8) }; break; } o += 8 + len + (len & 1); }
  const bps = fmt.bits / 8, n = Math.floor(data.len / (bps * fmt.ch)), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < fmt.ch; c++) { const q = data.off + (i * fmt.ch + c) * bps; let v; if (fmt.tag === 3) v = b.readFloatLE(q); else if (fmt.bits === 16) v = b.readInt16LE(q) / 32768; else if (fmt.bits === 24) v = b.readIntLE(q, 3) / 8388608; else v = b.readInt32LE(q) / 2147483648; s += v; } x[i] = s / fmt.ch; }
  return { x, sr: fmt.sr }; }
const sr = 44100; const V = readWav(process.argv[2]).x, Sg = readWav(process.argv[3]).x; const n = Math.min(V.length, Sg.length, sr * 130);
const rmsOf = (a, i0 = 0, i1 = a.length) => { let e = 0; for (let i = i0; i < i1; i++) e += a[i] * a[i]; return Math.sqrt(e / Math.max(1, i1 - i0)); };
// singer at a realistic mic level, muted in three 10 s stretches
const voice = new Float32Array(n); const g = 0.05 / rmsOf(V, 0, n); const CONT = process.env.CONT === '1'; const muted = (i) => { const t = i / sr; return !CONT && ((t > 20 && t < 30) || (t > 60 && t < 70) || (t > 100 && t < 110)); };
for (let i = 0; i < n; i++) voice[i] = muted(i) ? 0 : V[i] * g;
const clean = trackMelody(voice, sr, { hop: 256 }); const refAt = new Map(); for (const p of clean) refAt.set(Math.round(p.t * sr / 256), p.midi);
const truth = (c) => { if (muted(c)) return 'silent'; const k = Math.round(c / 256); return refAt.get(k) ?? refAt.get(k - 1) ?? refAt.get(k + 1) ?? null; };
// speakers: song delayed 20 ms through a small-speaker high-pass at 150 Hz
const spk = new Float32Array(n); { const d = Math.round(0.02 * sr), a = Math.exp(-2 * Math.PI * 150 / sr); let lp = 0; for (let i = d; i < n; i++) { lp = a * lp + (1 - a) * Sg[i - d]; spk[i] = Sg[i - d] - lp; } }
const spkR = rmsOf(spk);
function score(frames) { let sing = 0, hit = 0, wrong = 0, sil = 0, fv = 0;
  for (const f of frames) { const t = truth(f.c); if (t === 'silent') { sil++; if (f.m != null) fv++; } else if (t != null) { sing++; if (f.m != null) { if (Math.abs(f.m - t) <= 0.5) hit++; else wrong++; } } }
  return { singerTracked: (100 * hit / sing).toFixed(0) + '%', wrongPitchWhileSinging: (100 * wrong / sing).toFixed(1) + '%', followsSongWhenSilent: (100 * fv / sil).toFixed(1) + '%' }; }
const out = {};
for (const [label, rel] of [['no song (clean)', 0], ['song −20 dB under voice', 0.1], ['song −12 dB', 0.25], ['song −6 dB (laptop speakers, loud)', 0.5], ['song as loud as voice', 1.0]]) {
  const c = rel * 0.05 / spkR; const mic = new Float32Array(n), ref = new Float32Array(n);
  for (let i = 0; i < n; i++) mic[i] = voice[i] + c * spk[i];
  for (let i = 0; i < n; i++) ref[i] = Sg[Math.min(n - 1, i + Math.round(0.01 * sr))];   // the app's copy of the song, 30 ms out of step with the mic on purpose
  const oldF = []; const hop = Math.round(0.04 * sr); for (let e = 2048; e <= n; e += hop) { const f = detectPitch(mic.subarray(e - 2048, e), sr); oldF.push({ c: e - 1024, m: f > 0 ? 69 + 12 * Math.log2(f / 440) : null }); }
  const run = (useRef, Cls = LivePitch, o) => { const lp = new Cls(sr, o); const fr = []; const B = 1024; for (let o = 0; o < n; o += B) lp.push(mic.subarray(o, Math.min(n, o + B)), (m, r, i) => fr.push({ c: o + i - 1024 - 512, m }), useRef ? ref.subarray(o, Math.min(n, o + B)) : undefined); return fr; };
  const V = JSON.parse(process.env.VARIANTS || '{"a":{}}'); out[label] = { before_update: score(oldF) }; for (const k in V) out[label][k] = score(run(true, SingTracker, V[k]));
}
console.log(Object.entries(out).map(([l, r]) => l + '\n' + Object.entries(r).map(([k, s]) => '  ' + k.padEnd(14) + Object.values(s).join('  ')).join('\n')).join('\n'));
