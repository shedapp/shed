// ---------- Shed pitch engine (runs in a Web Worker; appended after dsp.js) ----------
// Core: CREPE (Kim et al., 2018), a convolutional neural network trained on pitch — the "tiny" model (1.9 MB) run through
// onnxruntime-web, 16 kHz, 1024-sample windows, 360 pitch bins of 20 cents, refined to ~1 cent by a weighted average
// around the winning bin. Where the model is not available (no network for the runtime), the McLeod NSDF tracker in
// dsp.js takes over, so the monitor always works.
//
// Song-leak logic (the song plays through speakers and the mic hears it): the page sends, with every mic block, the audio
// the speakers were playing at the same instant (the "tape"). The engine learns how loud that leak arrives at the mic
// (10th percentile of mic/song level, capped by mic–song coherence so a singer who never pauses is not mistaken for leak)
// and (1) mutes the monitor when the mic is not clearly louder than the leak, (2) in the grey zone (voice only a little
// louder than the leak) drops a pitch that matches what the song itself is sounding right now.
//
// Output per hop: { midi | null, conf, rms, i } where i is the index inside the pushed block of the frame centre.
const PE_SR = 16000, PE_WIN = 1024, PE_BINS = 360;
const PE_CENTS = new Float32Array(PE_BINS); for (let b = 0; b < PE_BINS; b++) PE_CENTS[b] = 20 * b + 1997.3794084376191;

// Rate converter: 44.1/48 k → 16 k. 4th-order Butterworth low-pass at 6.8 kHz, then 4-point cubic interpolation.
class Down16 {
  constructor(sr) { this.sr = sr; this.step = sr / PE_SR; this.phase = 0; this.hist = new Float32Array(4); this.bq = [this.biquad(6800, 0.5412), this.biquad(6800, 1.3066)]; }
  biquad(fc, Q) { const w0 = 2 * Math.PI * fc / this.sr, cw = Math.cos(w0), al = Math.sin(w0) / (2 * Q), a0 = 1 + al; return { b0: (1 - cw) / 2 / a0, b1: (1 - cw) / a0, b2: (1 - cw) / 2 / a0, a1: -2 * cw / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 }; }
  // returns Float32Array of new 16 k samples, and fills idx[] with the source index each came from
  process(x, idx) {
    const out = new Float32Array(Math.ceil(x.length / this.step) + 2); let n = 0; const h = this.hist;
    for (let i = 0; i < x.length; i++) {
      let v = x[i]; for (const f of this.bq) { const y = f.b0 * v + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2; f.x2 = f.x1; f.x1 = v; f.y2 = f.y1; f.y1 = y; v = y; }
      h[0] = h[1]; h[1] = h[2]; h[2] = h[3]; h[3] = v;           // h[2] is sample i-1, h[3] is sample i
      this.phase -= 1;
      while (this.phase < 0) {                                    // emit samples that fall between i-1 and i
        const t = this.phase + 1; const y0 = h[0], y1 = h[1], y2 = h[2], y3 = h[3];
        const a = (3 * (y1 - y2) - y0 + y3) / 2, b = 2 * y2 + y0 - (5 * y1 + y3) / 2, c = (y2 - y0) / 2;
        out[n] = ((a * t + b) * t + c) * t + y1; if (idx) idx[n] = i; n++; this.phase += this.step;
      }
    }
    return out.subarray(0, n);
  }
}

class PitchEngine {
  constructor(sr, opts = {}) {
    this.sr = sr; this.P = Object.assign({ hop: 256, gate: 1.7, strong: 3, pct: 0.1, cohMargin: 1.3, onThr: 0.5, offThr: 0.38, songOnThr: 0.55, songMatchCents: 50, xcorrMax: 0.35, songWin: 4 }, opts);
    this.dm = new Down16(sr); this.ds = new Down16(sr);
    this.N = 8192; this.ring = new Float32Array(this.N); this.sring = new Float32Array(this.N); this.w = 0; this.fill = 0; this.sinceHop = 0;
    this.frame = new Float32Array(PE_WIN); this.sframe = new Float32Array(PE_WIN);
    this.hist = new Float32Array(500); this.nh = 0; this.ih = 0; this.k = null; this.kp = null; this.kc = null; this.kAt = 0;
    this.room = null; this.voiced = false; this.prev = null; this.med = []; this.onset = 0; this.stats = { frames: 0, gated: 0, songMatch: 0, nn: 0 };
    this.fallback = null;   // SingTracker when the network is unavailable
    this.model = null;      // async (Float32Array frames, n) → Float32Array probabilities [n*360]
    this.songH = new Float32Array(this.P.songWin); this.si = 0; this.xf = makeFFT(2048); this.xa = new Float32Array(2048); this.xb = new Float32Array(2048); this.xc = new Float32Array(2048); this.xd = new Float32Array(2048);
    this.pendingBlocks = []; this.busy = false;
  }
  // ---- leak estimate: percentile of mic/song level, capped by coherence ----
  leak() {
    if (this.nh < 30) return null;
    if (++this.kAt % 8 === 0 || this.kp == null) { const a = Array.from(this.hist.subarray(0, this.nh)).sort((p, q) => p - q); this.kp = a[Math.floor(a.length * this.P.pct)]; }
    this.k = this.kc != null ? Math.min(this.kp, this.kc * this.P.cohMargin) : this.kp; return this.k;
  }
  coh() {   // cross-spectrum average of the last 4096 samples (16 k) of mic and song, every 8 hops
    const L = 4096; if (this.fill < L) return;
    if (!this.cz) { this.cz = { f: makeFFT(L), ar: new Float32Array(L), ai: new Float32Array(L), br: new Float32Array(L), bi: new Float32Array(L), w: new Float32Array(L), xr: new Float64Array(L / 2), xi: new Float64Array(L / 2), yy: new Float64Array(L / 2), xx: new Float64Array(L / 2), n: 0 }; for (let i = 0; i < L; i++) this.cz.w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / L); }
    const c = this.cz, { ar, ai, br, bi, w } = c; const N = this.N, w0 = this.w; let songOn = false;
    for (let i = 0; i < L; i++) { const j = (w0 - L + i + N) % N; ar[i] = this.ring[j] * w[i]; ai[i] = 0; const s = this.sring[j]; if (s !== 0) songOn = true; br[i] = s * w[i]; bi[i] = 0; }
    if (!songOn) return;
    c.f(ar, ai, false); c.f(br, bi, false);
    const tau = 4, dt = this.P.hop * 8 / PE_SR, a = 1 - Math.exp(-dt / tau); c.n++;
    const Neff = Math.max(1, Math.min(tau * PE_SR / (L / 2), c.n * this.P.hop * 8 / (L / 2)));
    const k0 = Math.floor(120 * L / PE_SR), k1 = Math.floor(5000 * L / PE_SR); let B = 0, Y = 0;
    for (let k = k0; k < k1; k++) {
      const xr = ar[k] * br[k] + ai[k] * bi[k], xi = ai[k] * br[k] - ar[k] * bi[k], yy = br[k] * br[k] + bi[k] * bi[k], xx = ar[k] * ar[k] + ai[k] * ai[k];
      c.xr[k] += a * (xr - c.xr[k]); c.xi[k] += a * (xi - c.xi[k]); c.yy[k] += a * (yy - c.yy[k]); c.xx[k] += a * (xx - c.xx[k]);
      if (c.yy[k] > 0) B += Math.max(0, c.xr[k] * c.xr[k] + c.xi[k] * c.xi[k] - c.xx[k] * c.yy[k] / Neff) / c.yy[k]; Y += c.yy[k];
    }
    if (c.n > 10 && Y > 0) this.kc = Math.sqrt(B / Y);
  }
  // ---- how much of a mic frame is simply the song: squared normalised cross-correlation peak within ±30 ms ----
  songShare(x, s) {
    const N = 2048, a = this.xa, b = this.xb, c = this.xc, d = this.xd; let ex = 0, es = 0;
    for (let i = 0; i < N; i++) { const v = i < PE_WIN ? x[i] : 0, u = i < PE_WIN ? s[i] : 0; a[i] = v; b[i] = 0; c[i] = u; d[i] = 0; ex += v * v; es += u * u; }
    if (ex < 1e-12 || es < 1e-12) return 0;
    this.xf(a, b, false); this.xf(c, d, false);
    for (let i = 0; i < N; i++) { const re = a[i] * c[i] + b[i] * d[i], im = b[i] * c[i] - a[i] * d[i]; a[i] = re; b[i] = im; }   // X · conj(S)
    this.xf(a, b, true);
    const L = Math.round(0.03 * PE_SR); let best = 0; for (let l = -L; l <= L; l++) { const v = a[(l + N) % N] / N; if (v > best) best = v; }
    return best * best / (ex * es);
  }
  // ---- CREPE decode: weighted average of cents around the best bin ----
  static decode(p, off) {
    let b = 0, best = -1; for (let i = 0; i < PE_BINS; i++) if (p[off + i] > best) { best = p[off + i]; b = i; }
    const lo = Math.max(0, b - 4), hi = Math.min(PE_BINS, b + 5); let num = 0, den = 0;
    for (let i = lo; i < hi; i++) { num += p[off + i] * PE_CENTS[i]; den += p[off + i]; }
    const cents = num / den; return { midi: 69 + 12 * Math.log2(10 * Math.pow(2, cents / 1200) / 440), conf: best };
  }
  // ---- feed a block of mic samples (+ the matching song samples) ----
  async push(mic, song, onFrame) {
    const idx = new Int32Array(Math.ceil(mic.length / this.dm.step) + 2);
    const m16 = this.dm.process(mic, idx); const s16 = song ? this.ds.process(song) : null;
    const N = this.N; const jobs = [];
    for (let i = 0; i < m16.length; i++) {
      this.ring[this.w] = m16[i]; this.sring[this.w] = s16 && i < s16.length ? s16[i] : 0; this.w = (this.w + 1) % N; if (this.fill < N) this.fill++;
      if (this.fill >= PE_WIN && ++this.sinceHop >= this.P.hop) { this.sinceHop = 0; jobs.push({ w: this.w, src: idx[i] }); }
    }
    if (!jobs.length) return;
    // build frames (window ends at the hop boundary; its centre is 512 samples back)
    const nf = jobs.length, X = new Float32Array(nf * PE_WIN), SX = new Float32Array(nf * PE_WIN); const info = [];
    for (let f = 0; f < nf; f++) {
      const w = jobs[f].w; let e = 0, se = 0, songOn = false;
      for (let i = 0; i < PE_WIN; i++) { const j = (w - PE_WIN + i + N) % N; const v = this.ring[j], s = this.sring[j]; X[f * PE_WIN + i] = v; SX[f * PE_WIN + i] = s; e += v * v; se += s * s; if (s !== 0) songOn = true; }
      info.push({ rms: Math.sqrt(e / PE_WIN), srms: Math.sqrt(se / PE_WIN), songOn, src: jobs[f].src - Math.round(512 * this.dm.step) });
    }
    this.stats.frames += nf; if ((this.stats.frames & 7) < nf) this.coh();
    // gates first (cheap), then the network only where needed
    const need = [], needSong = [];
    for (let f = 0; f < nf; f++) {
      const q = info[f]; this.songH[this.si] = q.srms; this.si = (this.si + 1) % this.songH.length; let songMax = 0; for (const v of this.songH) if (v > songMax) songMax = v;
      q.songMax = songMax; const songOn = songMax > 2e-4;
      if (!songOn) this.room = this.room == null ? 1e-3 : q.rms < this.room ? 0.6 * this.room + 0.4 * q.rms : Math.min(4e-3, this.room * 1.0008);
      else { this.hist[this.ih] = q.rms / songMax; this.ih = (this.ih + 1) % this.hist.length; if (this.nh < this.hist.length) this.nh++; }
      const gate = Math.max(6e-4, (this.room || 0) * 2.5);
      q.silent = q.rms < gate; q.grey = false;
      if (!q.silent && songOn) { const k = this.leak(); if (k != null) { const bleed = k * songMax; if (q.rms < this.P.gate * bleed) { q.silent = true; q.bleed = true; this.stats.gated++; } else q.grey = q.rms < this.P.strong * bleed; } else q.grey = true; }
      if (!q.silent && songOn) { q.share = this.songShare(X.subarray(f * PE_WIN, (f + 1) * PE_WIN), SX.subarray(f * PE_WIN, (f + 1) * PE_WIN)); if (q.share > this.P.xcorrMax) { q.silent = true; q.bleed = true; this.stats.xcorr = (this.stats.xcorr || 0) + 1; } }
      q.songOn = songOn;
      if (!q.silent) { need.push(f); if (q.grey) needSong.push(f); }
    }
    let P = null, PS = null;
    if (need.length && this.model) {
      const n = need.length + needSong.length, B = new Float32Array(n * PE_WIN); let o = 0;
      for (const f of need) { B.set(X.subarray(f * PE_WIN, (f + 1) * PE_WIN), o); o += PE_WIN; }
      for (const f of needSong) { B.set(SX.subarray(f * PE_WIN, (f + 1) * PE_WIN), o); o += PE_WIN; }
      try { const out = await this.model(B, n); P = out; PS = need.length * PE_BINS; this.stats.nn += n; } catch (e) { this.model = null; this.modelError = String(e); }
    }
    for (let f = 0; f < nf; f++) {
      const q = info[f]; let r = { midi: null, conf: 0, rms: q.rms };
      if (!q.silent) {
        if (P) {
          const ni = need.indexOf(f); const d = PitchEngine.decode(P, ni * PE_BINS); r = { midi: d.midi, conf: d.conf, rms: q.rms, songOn: q.songOn };
          if (q.grey) { const si = needSong.indexOf(f); const ds = PitchEngine.decode(P, PS + si * PE_BINS); if (ds.conf > 0.45 && Math.abs(ds.midi - d.midi) * 100 < this.P.songMatchCents) { r = { midi: null, conf: d.conf, rms: q.rms, bleed: true }; this.stats.songMatch++; } }
        } else r = this.fallbackFrame(X.subarray(f * PE_WIN, (f + 1) * PE_WIN), q);
      }
      onFrame(this.decide(r), r, q.src);
    }
  }
  // NSDF on the 16 k frame (used only when the network is unavailable)
  fallbackFrame(x, q) {
    if (!this.fallback) { this.fallback = new LivePitch(PE_SR); this.fallback.N = 1024; this.fallback.M = 2048; this.fallback.fft = makeFFT(2048); this.fallback.re = new Float32Array(2048); this.fallback.im = new Float32Array(2048); this.fallback.cum = new Float64Array(1025); this.fallback.buf = new Float32Array(1024); this.fallback.lagMin = Math.floor(PE_SR / 1500); this.fallback.lagMax = Math.min(1022, Math.ceil(PE_SR / 62)); this.fallback.nsdf = new Float32Array(this.fallback.lagMax + 2); }
    const fb = this.fallback; fb.buf.set(x); fb.floor = 0; const t = fb.analyse();
    return { midi: t.midi, conf: t.midi != null ? Math.min(1, t.clarity) : 0, rms: q.rms, nsdf: true };
  }
  // voicing hysteresis, octave-jump confirmation, 3-frame median
  decide(r) {
    const thr = this.voiced ? this.P.offThr : (r.songOn ? this.P.songOnThr : this.P.onThr); const minConf = r.nsdf ? (this.voiced ? 0.6 : 0.8) : thr;
    let m = r.midi != null && r.conf >= minConf ? r.midi : null;
    if (m == null) { this.voiced = false; this.onset = 0; this.prev = null; this.pend = null; this.med.length = 0; return null; }
    if (!this.voiced) { this.onset++; if (this.onset < 2) { this.prev = m; return null; } this.voiced = true; }
    if (this.prev != null) { const d = m - this.prev; if (Math.abs(Math.abs(d) - 12) < 0.8 || Math.abs(Math.abs(d) - 19) < 0.8) { if (this.pend && Math.abs(this.pend.m - m) < 0.8) this.pend.n++; else this.pend = { m, n: 1 }; if (this.pend.n < 3) m = this.prev; else this.pend = null; } else this.pend = null; }
    this.prev = m; this.med.push(m); if (this.med.length > 3) this.med.shift();
    const s = this.med.slice().sort((p, q) => p - q); return s[s.length >> 1];
  }
}
// Offline clean-up of CREPE frames for the record's melody: voicing by confidence + level, 5-frame median, islands < 60 ms dropped.
function cleanMelody(raw, hopSec) {
  if (!raw.length) return [];
  let g = 0; for (const p of raw) g += p.rms * p.rms; g = Math.sqrt(g / raw.length);
  const v = raw.map(p => p.conf >= 0.5 && p.rms > 0.05 * g);
  // hysteresis: keep a frame with conf ≥ 0.4 if a neighbour is voiced
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < raw.length; i++) if (!v[i] && raw[i].conf >= 0.4 && raw[i].rms > 0.05 * g && ((i > 0 && v[i - 1]) || (i + 1 < raw.length && v[i + 1]))) v[i] = true;
  const sm = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) { if (!v[i]) continue; const w = []; for (let d = -2; d <= 2; d++) { const j = i + d; if (j >= 0 && j < raw.length && v[j]) w.push(raw[j].midi); } w.sort((a, b) => a - b); sm[i] = w[w.length >> 1]; }
  const minFr = Math.ceil(0.06 / hopSec); const out = []; let start = -1;
  for (let i = 0; i <= raw.length; i++) { const on = i < raw.length && v[i]; if (on && start < 0) start = i; if (!on && start >= 0) { if (i - start >= minFr) for (let j = start; j < i; j++) out.push({ t: raw[j].t, midi: sm[j], conf: raw[j].conf }); start = -1; } }
  return out;
}
if (typeof module !== 'undefined') { module.exports.PitchEngine = PitchEngine; module.exports.Down16 = Down16; module.exports.cleanMelody = cleanMelody; }

// ---------- Worker protocol ----------
// {type:'init', sr, modelUrl, ortBase}  → {type:'ready', nn: true|false, error?}
// {type:'push', mic, song|null, t}      → {type:'frames', t, frames:[{midi, conf, rms, src, bleed}]}
// {type:'melody', x, sr, hop}           → {type:'melody', points:[{t, midi, conf}]}   (offline, for the record's lead vocal)
if (typeof self !== 'undefined' && typeof document === 'undefined' && typeof WorkerGlobalScope !== 'undefined') {
  let eng = null, session = null, ORT = null;
  async function loadOrt(ortBase) {
    if (ORT) return ORT;
    try { ORT = await import(ortBase + 'ort.min.mjs'); }                                   // module worker (preferred)
    catch (e1) { if (typeof importScripts === 'function') { importScripts(ortBase + 'ort.min.js'); ORT = self.ort; } else throw e1; }
    ORT.env.wasm.wasmPaths = ortBase; ORT.env.wasm.numThreads = 1; return ORT;
  }
  async function loadModel(ortBase, modelUrl, prefer) {
    const ort = await loadOrt(ortBase);
    const bytes = new Uint8Array(await (await fetch(modelUrl)).arrayBuffer());
    const eps = prefer === 'wasm' || typeof navigator === 'undefined' || !navigator.gpu ? [['wasm']] : [['webgpu'], ['wasm']];
    let err = null; for (const ep of eps) { try { session = await ort.InferenceSession.create(bytes, { executionProviders: ep, graphOptimizationLevel: 'all' }); session._ep = ep[0]; break; } catch (e) { err = e; session = null; } }
    if (!session) throw err;
    // warm up (shader compile on WebGPU) and sanity-check the output
    const warm = await session.run({ x: new ort.Tensor('float32', new Float32Array(PE_WIN), [1, PE_WIN]) }); if (!warm.p || warm.p.data.length !== PE_BINS) throw new Error('unexpected model output');
    return async (frames, n) => { const r = await session.run({ x: new ort.Tensor('float32', frames, [n, PE_WIN]) }); return r.p.data; };
  }
  self.onmessage = async (e) => {
    const d = e.data;
    if (d.type === 'init') {
      eng = new PitchEngine(d.sr, d.opts || {});
      try { eng.model = await loadModel(d.ortBase, d.modelUrl, d.prefer); self.postMessage({ type: 'ready', nn: true, ep: session._ep }); }
      catch (err) { eng.model = null; self.postMessage({ type: 'ready', nn: false, error: String(err && err.message || err) }); }
      return;
    }
    if (d.type === 'push' && eng) {
      const frames = [];
      await eng.push(d.mic, d.song, (midi, r, src) => frames.push({ midi, conf: r.conf, rms: r.rms, src, bleed: !!r.bleed }));
      self.postMessage({ type: 'frames', t: d.t, frames, stats: eng.stats, nn: !!eng.model, k: eng.k });
      return;
    }
    if (d.type === 'melody') {
      // offline: CREPE on the whole signal at the given hop (seconds), batched; falls back to trackMelody
      const { x, sr, hop } = d; let pts = null;
      if (session) {
        try {
          const dn = new Down16(sr); const y = dn.process(x); const H = Math.max(80, Math.round((hop || 0.01) * PE_SR)); const nFr = Math.max(0, Math.floor((y.length - PE_WIN) / H) + 1);
          const probs = new Float32Array(nFr * PE_BINS); const BATCH = 64; let done = 0;
          for (let f0 = 0; f0 < nFr; f0 += BATCH) {
            const n = Math.min(BATCH, nFr - f0); const B = new Float32Array(n * PE_WIN);
            for (let f = 0; f < n; f++) B.set(y.subarray((f0 + f) * H, (f0 + f) * H + PE_WIN), f * PE_WIN);
            const r = await session.run({ x: new ORT.Tensor('float32', B, [n, PE_WIN]) }); probs.set(r.p.data, f0 * PE_BINS); done += n;
            self.postMessage({ type: 'melody', id: d.id, progress: done / nFr });
          }
          const raw = []; for (let f = 0; f < nFr; f++) { const r = PitchEngine.decode(probs, f * PE_BINS); let e = 0; for (let i = 0; i < PE_WIN; i += 4) { const v = y[f * H + i]; e += v * v; } raw.push({ t: (f * H + PE_WIN / 2) / PE_SR, midi: r.midi, conf: r.conf, rms: Math.sqrt(e / (PE_WIN / 4)) }); }
          pts = cleanMelody(raw, H / PE_SR);
        } catch (err) { pts = null; }
      }
      if (!pts) pts = trackMelody(x, sr).map(p => ({ t: p.t, midi: p.midi, conf: 1 }));
      self.postMessage({ type: 'melody', id: d.id, points: pts, nn: !!session });
    }
  };
}
