// Real-voice comparison, run on the user's own machine. Reads a WAV, compares the old live detector
// and the new LivePitch against the offline trackMelody (lookahead + smoothing) as reference.
const fs = require('fs'); const { LivePitch, trackMelody } = require('./dsp.js');
const detectPitch = new Function(fs.readFileSync(__dirname + '/old_detect.js', 'utf8') + '; return detectPitch;')();
function readWav(p) { const b = fs.readFileSync(p); let o = 12, fmt, data; while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(o + 8), ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }; if (id === 'data') { data = { off: o + 8, len: Math.min(len, b.length - o - 8) }; break; } o += 8 + len + (len & 1); }
  const bps = fmt.bits / 8, n = Math.floor(data.len / (bps * fmt.ch)), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < fmt.ch; c++) { const q = data.off + (i * fmt.ch + c) * bps; let v; if (fmt.tag === 3) v = b.readFloatLE(q); else if (fmt.bits === 16) v = b.readInt16LE(q) / 32768; else if (fmt.bits === 24) v = b.readIntLE(q, 3) / 8388608; else v = b.readInt32LE(q) / 2147483648; s += v; } x[i] = s / fmt.ch; }
  return { x, sr: fmt.sr }; }
const { x, sr } = readWav(process.argv[2]); const secs = x.length / sr;
const ref = trackMelody(x, sr, { hop: 256 }); const refAt = new Map(); for (const p of ref) refAt.set(Math.round(p.t * sr / 256), p.midi);
const lookup = (centre) => { const k = Math.round(centre / 256); return refAt.get(k) ?? refAt.get(k - 1) ?? refAt.get(k + 1); };
function evaluate(frames) { let refVoiced = 0, hit = 0, gross = 0, oct = 0, err = 0, good = 0, extra = 0, jit = 0, jn = 0, prev = null;
  for (const f of frames) { const r = lookup(f.c); if (r != null) { refVoiced++; if (f.m != null) { hit++; const d = f.m - r; if (Math.abs(Math.abs(d) - 12) < 0.6) oct++; if (Math.abs(d) > 0.5) gross++; else { err += Math.abs(d); good++; } } } else if (f.m != null) extra++;
    if (prev && prev.m != null && f.m != null && r != null && prev.r != null && Math.abs(r - prev.r) < 0.15) { jit += Math.abs((f.m - prev.m) - (r - prev.r)); jn++; } prev = { m: f.m, r }; }
  return { framesPerSec: (frames.length / secs).toFixed(0), coverage: (100 * hit / refVoiced).toFixed(0) + '%', octaveErrors: (100 * oct / Math.max(1, hit)).toFixed(2) + '%', otherGross: (100 * (gross - oct) / Math.max(1, hit)).toFixed(2) + '%', meanCents: (100 * err / Math.max(1, good)).toFixed(1), addedJitterCents: (100 * jit / Math.max(1, jn)).toFixed(2), voicedWhereRefSilent: extra }; }
const oldF = []; const hop = Math.round(0.04 * sr); for (let e = 2048; e <= x.length; e += hop) { const f = detectPitch(x.subarray(e - 2048, e), sr); oldF.push({ c: e - 1024, m: f > 0 ? 69 + 12 * Math.log2(f / 440) : null }); }
const newF = []; const lp = new LivePitch(sr); const B = 1024; let t0 = Date.now(); for (let o = 0; o < x.length; o += B) lp.push(x.subarray(o, Math.min(x.length, o + B)), (m, rms, i) => newF.push({ c: o + i - 1024 - 512, m })); const ms = Date.now() - t0;
// a −20 dB copy: same singer, quieter mic
const q = x.map(v => v * 0.1); const newQ = []; const lq = new LivePitch(sr); for (let o = 0; o < q.length; o += B) lq.push(q.subarray(o, Math.min(q.length, o + B)), (m, rms, i) => newQ.push({ c: o + i - 1024 - 512, m }));
const oldQ = []; for (let e = 2048; e <= q.length; e += hop) { const f = detectPitch(q.subarray(e - 2048, e), sr); oldQ.push({ c: e - 1024, m: f > 0 ? 69 + 12 * Math.log2(f / 440) : null }); }
console.log(JSON.stringify({ seconds: secs.toFixed(1), sampleRate: sr, referenceVoicedPct: (100 * ref.length * 256 / x.length).toFixed(0), old: evaluate(oldF), new: evaluate(newF), oldQuiet: evaluate(oldQ), newQuiet: evaluate(newQ), newCpuPctOfRealtime: (100 * ms / 1000 / secs).toFixed(1) }, null, 1));
