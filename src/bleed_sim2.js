// Real voice + song leaking from speakers: which engine follows the singer, which follows the song?
// usage: node bleed_sim2.js voice.wav song.wav   (needs python3 + onnxruntime for the CREPE model)
const fs = require('fs'), vm = require('vm'); const src = fs.readFileSync(__dirname + '/dsp.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/pitch.js', 'utf8'); const ctx = { module: { exports: {} }, console }; vm.runInNewContext(src, ctx);
const { PitchEngine, SingTracker, trackMelody } = ctx.module.exports; const { makeModel } = require(__dirname + '/pe_node.js');
function readWav(p) { const b = fs.readFileSync(p); let o = 12, fmt, data; while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(o + 8), ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }; if (id === 'data') { data = { off: o + 8, len: Math.min(len, b.length - o - 8) }; break; } o += 8 + len + (len & 1); }
  const bps = fmt.bits / 8, n = Math.floor(data.len / (bps * fmt.ch)), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < fmt.ch; c++) { const q = data.off + (i * fmt.ch + c) * bps; let v; if (fmt.tag === 3) v = b.readFloatLE(q); else if (fmt.bits === 16) v = b.readInt16LE(q) / 32768; else if (fmt.bits === 24) v = b.readIntLE(q, 3) / 8388608; else v = b.readInt32LE(q) / 2147483648; s += v; } x[i] = s / fmt.ch; }
  return { x, sr: fmt.sr }; }
function toRate(x, from, to) { if (from === to) return x; const r = from / to, n = Math.floor(x.length / r), y = new Float32Array(n); for (let i = 0; i < n; i++) { const p = i * r, j = p | 0, t = p - j; const a = x[Math.max(0, j - 1)], b = x[j], c = x[Math.min(x.length - 1, j + 1)], d = x[Math.min(x.length - 1, j + 2)]; y[i] = b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))); } return y; }
(async () => {
  const sr = 44100; const V0 = readWav(process.argv[2]), S0 = readWav(process.argv[3]); const V = toRate(V0.x, V0.sr, sr), Sg = toRate(S0.x, S0.sr, sr); const n = Math.min(V.length, Sg.length, sr * (+process.env.SECS || 130));
  const rmsOf = (a, i0 = 0, i1 = a.length) => { let e = 0; for (let i = i0; i < i1; i++) e += a[i] * a[i]; return Math.sqrt(e / Math.max(1, i1 - i0)); };
  const voice = new Float32Array(n); const g = 0.05 / rmsOf(V, 0, n); const muted = (i) => { const t = i / sr; return (t > 20 && t < 30) || (t > 60 && t < 70) || (t > 100 && t < 110); };
  for (let i = 0; i < n; i++) voice[i] = muted(i) ? 0 : V[i] * g;
  const model = makeModel(__dirname + '/dist/crepe-tiny.onnx', __dirname + '/crepe_server.py');
  const B = 1024;
  const runPE = async (mic, ref, nn) => { const eng = new PitchEngine(sr); if (nn) eng.model = model; const fr = []; for (let o = 0; o < n; o += B) await eng.push(mic.subarray(o, Math.min(n, o + B)), ref ? ref.subarray(o, Math.min(n, o + B)) : null, (m, r, src) => fr.push({ c: o + src, m })); return { fr, eng }; };
  // truth: CREPE on the clean voice, kept only where the NSDF tracker agrees (so neither tracker's errors count as truth)
  const cleanPE = (await runPE(voice, null, true)).fr; const ns = trackMelody(voice, sr, { hop: 256 }); const nsAt = new Map(); for (const p of ns) nsAt.set(Math.round(p.t * sr / 256), p.midi);
  const truthAt = new Map(); let agree = 0, tot = 0; for (const f of cleanPE) { if (f.m == null) continue; tot++; const k = Math.round(f.c / 256); const m = nsAt.get(k) ?? nsAt.get(k - 1) ?? nsAt.get(k + 1); if (m != null && Math.abs(m - f.m) < 0.5) { truthAt.set(k, f.m); agree++; } }
  console.log('truth frames', agree, 'of', tot, 'CREPE frames agree with NSDF on the clean voice (' + (100 * agree / tot).toFixed(0) + '%)');
  const truth = (c) => { if (muted(c)) return 'silent'; const k = Math.round(c / 256); return truthAt.get(k) ?? truthAt.get(k - 1) ?? truthAt.get(k + 1) ?? null; };
  const spk = new Float32Array(n); { const d = Math.round(0.02 * sr), a = Math.exp(-2 * Math.PI * 150 / sr); let lp = 0; for (let i = d; i < n; i++) { lp = a * lp + (1 - a) * Sg[i - d]; spk[i] = Sg[i - d] - lp; } }
  const spkR = rmsOf(spk);
  function score(frames) { let sing = 0, hit = 0, wrong = 0, sil = 0, fv = 0; for (const f of frames) { const t = truth(f.c); if (t === 'silent') { sil++; if (f.m != null) fv++; } else if (t != null) { sing++; if (f.m != null) { if (Math.abs(f.m - t) <= 0.5) hit++; else wrong++; } } } return (100 * hit / sing).toFixed(0).padStart(4) + '%  wrong ' + (100 * wrong / sing).toFixed(1).padStart(5) + '%  song-as-voice ' + (100 * fv / sil).toFixed(1).padStart(5) + '%'; }
  for (const [label, rel] of [['no song', 0], ['song −20 dB', 0.1], ['song −12 dB', 0.25], ['song −6 dB', 0.5], ['song = voice', 1.0]]) {
    const c = rel * 0.05 / spkR; const mic = new Float32Array(n), ref = new Float32Array(n);
    for (let i = 0; i < n; i++) { mic[i] = voice[i] + c * spk[i]; ref[i] = Sg[Math.min(n - 1, i + Math.round(0.01 * sr))]; }
    const t0 = Date.now(); const pe = await runPE(mic, rel ? ref : null, true); const ms = Date.now() - t0;
    const st = new SingTracker(sr); const fr2 = []; for (let o = 0; o < n; o += B) st.push(mic.subarray(o, Math.min(n, o + B)), (m, r, i) => fr2.push({ c: o + i - 1024 - 512, m }), rel ? ref.subarray(o, Math.min(n, o + B)) : undefined);
    console.log(label.padEnd(14) + ' CREPE engine ' + score(pe.fr) + '   | NSDF engine ' + score(fr2) + '   (nn frames ' + pe.eng.stats.nn + ', gated ' + pe.eng.stats.gated + ', songMatch ' + pe.eng.stats.songMatch + ', ' + ms + ' ms)');
  }
  model.close();
})();
