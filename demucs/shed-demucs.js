// Shed stems engine — on-device source separation.
//  • HT-Demucs v4 (Meta AI, MIT): all vocals vs band. Static ONNX graph; host pipeline mirrors demucs/htdemucs.py.
//  • UVR MDX-Net Karaoke 2 (Ultimate Vocal Remover, MIT): band + backing vocals vs lead vocal.
// Neural nets run through onnxruntime-web on WebGPU; all spectrogram math runs in a pool of Web Workers
// in parallel with the GPU. This file is loaded both on the page and inside those workers.
(function (root) {
  const SR = 44100, SEG = 343980, NFFT = 4096, HOP = 1024, STRIDE = 257985, HALF = NFFT / 2 + 1, FQ = 2048, FRAMES = 336;
  const MDX = { HOP: 1024, DIM_T: 256, DIM_F: 2048 };
  const ORT_VERSION = '1.22.0', ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';
  const inWorker = typeof importScripts === 'function';

  // ---------- FFT: radix-2, plus N = m·2^k (m odd) for the MDX models (5120 = 5·1024, 7680 = 15·512) ----------
  function makeFFT(n) {
    const levels = Math.log2(n) | 0; const cosT = new Float32Array(n / 2), sinT = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / n); sinT[i] = Math.sin(2 * Math.PI * i / n); }
    const rev = new Uint32Array(n); for (let i = 0; i < n; i++) { let r = 0, x = i; for (let j = 0; j < levels; j++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
    return function (re, im, inverse) {
      for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (let size = 2; size <= n; size <<= 1) { const half = size >> 1, step = n / size;
        for (let i = 0; i < n; i += size) for (let j = i, k = 0; j < i + half; j++, k += step) { const c = cosT[k], s = inverse ? sinT[k] : -sinT[k]; const l = j + half; const tre = re[l] * c - im[l] * s, tim = re[l] * s + im[l] * c; re[l] = re[j] - tre; im[l] = im[j] - tim; re[j] += tre; im[j] += tim; } }
    };
  }
  function makeFFTmixed(N) {
    let P2 = N; while (P2 % 2 === 0) P2 /= 2; const m = P2;   // N = m · 2^k, m odd (15 for the 7680-point vocal models, 5 for Karaoke 2)
    if (m === 1) return makeFFT(N);
    const P = N / m, sub = makeFFT(P);
    const cosN = new Float32Array(N), sinN = new Float32Array(N); for (let i = 0; i < N; i++) { cosN[i] = Math.cos(2 * Math.PI * i / N); sinN[i] = Math.sin(2 * Math.PI * i / N); }
    const sr = [], si = []; for (let r = 0; r < m; r++) { sr.push(new Float32Array(P)); si.push(new Float32Array(P)); }
    return function (re, im, inverse) {
      for (let r = 0; r < m; r++) { const a = sr[r], b = si[r]; for (let n = 0; n < P; n++) { a[n] = re[n * m + r]; b[n] = im[n * m + r]; } sub(a, b, inverse); }
      for (let k = 0; k < N; k++) { let xr = 0, xi = 0; const kk = k % P; let idx = 0;
        for (let r = 0; r < m; r++) { const c = cosN[idx], s2 = inverse ? sinN[idx] : -sinN[idx]; const ar = sr[r][kk], ai = si[r][kk]; xr += ar * c - ai * s2; xi += ar * s2 + ai * c; idx += k; if (idx >= N) idx -= N; }
        re[k] = xr; im[k] = xi; }
    };
  }
  const fftCache = {}; const getFFT = (n) => fftCache[n] || (fftCache[n] = makeFFTmixed(n));
  const winCache = {}; const getWin = (n) => winCache[n] || (winCache[n] = (() => { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); return w; })());

  function reflectPad(x, left, right) {
    const n = x.length, out = new Float32Array(n + left + right); out.set(x, left);
    for (let i = 0; i < left; i++) out[left - 1 - i] = x[i + 1];
    for (let i = 0; i < right; i++) out[left + n + i] = x[n - 2 - i];
    return out;
  }
  // Two real channels per complex FFT: X = FFT(a + i·b); A[k] = (X[k] + conj(X[N-k]))/2, B[k] = (X[k] - conj(X[N-k]))/(2i)
  // Forward STFT of a stereo pair → frame-major spectra [t*half + k] per channel. torch.stft(center=True, reflect).
  function stft2(a, b, nfft, hop, norm) {
    const fft = getFFT(nfft), win = getWin(nfft), half = nfft / 2 + 1;
    const ap = reflectPad(a, nfft / 2, nfft / 2), bp = reflectPad(b, nfft / 2, nfft / 2);
    const nfr = 1 + Math.floor((ap.length - nfft) / hop);
    const Ar = new Float32Array(nfr * half), Ai = new Float32Array(nfr * half), Br = new Float32Array(nfr * half), Bi = new Float32Array(nfr * half);
    const re = new Float32Array(nfft), im = new Float32Array(nfft); const s = norm ? 1 / Math.sqrt(nfft) : 1;
    for (let t = 0; t < nfr; t++) {
      const o = t * hop; for (let i = 0; i < nfft; i++) { const w = win[i]; re[i] = ap[o + i] * w; im[i] = bp[o + i] * w; }
      fft(re, im, false); const base = t * half;
      for (let k = 0; k < half; k++) { const j = (nfft - k) % nfft; const xr = re[k], xi = im[k], yr = re[j], yi = -im[j];
        Ar[base + k] = 0.5 * (xr + yr) * s; Ai[base + k] = 0.5 * (xi + yi) * s;
        Br[base + k] = 0.5 * (xi - yi) * s; Bi[base + k] = -0.5 * (xr - yr) * s; }
    }
    return { Ar, Ai, Br, Bi, nfr, half };
  }
  // Inverse STFT of two channels at once: IFFT(A + i·B) gives a in re and b in im (both real).
  function istft2(Ar, Ai, Br, Bi, nfr, nfft, hop, norm, length) {
    const fft = getFFT(nfft), win = getWin(nfft), half = nfft / 2 + 1;
    const outLen = nfft + hop * (nfr - 1), ya = new Float32Array(outLen), yb = new Float32Array(outLen), ws = new Float32Array(outLen);
    const re = new Float32Array(nfft), im = new Float32Array(nfft); const s = (norm ? Math.sqrt(nfft) : 1) / nfft;
    for (let t = 0; t < nfr; t++) {
      const base = t * half;
      for (let k = 0; k < half; k++) { re[k] = Ar[base + k] - Bi[base + k]; im[k] = Ai[base + k] + Br[base + k]; }
      for (let k = 1; k < half - 1; k++) { const j = nfft - k; re[j] = Ar[base + k] + Bi[base + k]; im[j] = -Ai[base + k] + Br[base + k]; }
      fft(re, im, true); const o = t * hop;
      for (let i = 0; i < nfft; i++) { const w = win[i]; ya[o + i] += re[i] * s * w; yb[o + i] += im[i] * s * w; ws[o + i] += w * w; }
    }
    const a = new Float32Array(length), b = new Float32Array(length); const off = nfft / 2;
    for (let i = 0; i < length; i++) { const w = ws[off + i]; if (w > 1e-8) { a[i] = ya[off + i] / w; b[i] = yb[off + i] / w; } }
    return [a, b];
  }

  // ---------- Demucs host math (pure; runs in workers) ----------
  function stats2(L, R) { let m = 0; const n = L.length; for (let i = 0; i < n; i++) m += L[i] + R[i]; m /= 2 * n; let v = 0; for (let i = 0; i < n; i++) { const a = L[i] - m, b = R[i] - m; v += a * a + b * b; } return { mean: m, std: Math.sqrt(v / (2 * n - 1)) }; }
  // segment (SEG samples each, already track-normalised) → {mix [2*SEG], zcac [4*FQ*FRAMES], m2, d}
  function demucsPrep(cL, cR) {
    const { mean: m2, std: s2 } = stats2(cL, cR); const d = 1e-5 + s2;
    const mix = new Float32Array(2 * SEG); for (let i = 0; i < SEG; i++) { mix[i] = (cL[i] - m2) / d; mix[SEG + i] = (cR[i] - m2) / d; }
    const pad = HOP / 2 * 3;
    const S = stft2(reflectPad(mix.subarray(0, SEG), pad, pad + FRAMES * HOP - SEG), reflectPad(mix.subarray(SEG), pad, pad + FRAMES * HOP - SEG), NFFT, HOP, true);
    const zcac = new Float32Array(4 * FQ * FRAMES);
    for (let t = 0; t < FRAMES; t++) { const src = (t + 2) * HALF; for (let k = 0; k < FQ; k++) { zcac[(0 * FQ + k) * FRAMES + t] = S.Ar[src + k]; zcac[(1 * FQ + k) * FRAMES + t] = S.Ai[src + k]; zcac[(2 * FQ + k) * FRAMES + t] = S.Br[src + k]; zcac[(3 * FQ + k) * FRAMES + t] = S.Bi[src + k]; } }
    return { mix, zcac, m2, d };
  }
  // vocals planes of zout [4 planes][FQ][FRAMES] + vocals time_out [2][SEG] → de-normalised stereo vocals of the segment
  function demucsPost(zv, tv, m2, d) {
    const nfr = FRAMES + 4, Ar = new Float32Array(nfr * HALF), Ai = new Float32Array(nfr * HALF), Br = new Float32Array(nfr * HALF), Bi = new Float32Array(nfr * HALF);
    const P = FQ * FRAMES;
    for (let k = 0; k < FQ; k++) for (let t = 0; t < FRAMES; t++) { const dst = (t + 2) * HALF + k, srcI = k * FRAMES + t; Ar[dst] = zv[srcI]; Ai[dst] = zv[P + srcI]; Br[dst] = zv[2 * P + srcI]; Bi[dst] = zv[3 * P + srcI]; }
    const pad = HOP / 2 * 3, le = HOP * FRAMES + 2 * pad;
    const [xa, xb] = istft2(Ar, Ai, Br, Bi, nfr, NFFT, HOP, true, le);
    const oL = new Float32Array(SEG), oR = new Float32Array(SEG);
    for (let i = 0; i < SEG; i++) { oL[i] = (xa[pad + i] + tv[i]) * d + m2; oR[i] = (xb[pad + i] + tv[SEG + i]) * d + m2; }
    return [oL, oR];
  }
  // ---------- MDX host math (pure) ----------
  function mdxSpek(L, R, nfft, dimF) {
    const T = MDX.DIM_T, F = dimF || MDX.DIM_F; const S = stft2(L, R, nfft, MDX.HOP, false);
    const out = new Float32Array(4 * F * T);
    for (let t = 0; t < T; t++) { const b = t * S.half; for (let k = 3; k < F; k++) { out[(0 * F + k) * T + t] = S.Ar[b + k]; out[(1 * F + k) * T + t] = S.Ai[b + k]; out[(2 * F + k) * T + t] = S.Br[b + k]; out[(3 * F + k) * T + t] = S.Bi[b + k]; } }
    return out;
  }
  function mdxWave(spek, nfft, len, dimF) {
    const T = MDX.DIM_T, F = dimF || MDX.DIM_F, half = nfft / 2 + 1;
    const Ar = new Float32Array(T * half), Ai = new Float32Array(T * half), Br = new Float32Array(T * half), Bi = new Float32Array(T * half);
    for (let t = 0; t < T; t++) { const b = t * half; for (let k = 0; k < F; k++) { Ar[b + k] = spek[(0 * F + k) * T + t]; Ai[b + k] = spek[(1 * F + k) * T + t]; Br[b + k] = spek[(2 * F + k) * T + t]; Bi[b + k] = spek[(3 * F + k) * T + t]; } }
    return istft2(Ar, Ai, Br, Bi, T, nfft, MDX.HOP, false, len);
  }
  // Butterworth high-pass (two cascaded biquads, Q = 0.54 and 1.31 → 4th order), in place, with a short fade to avoid a start click
  function highpass(x, sr, fc) {
    for (const Q of [0.5412, 1.3066]) {
      const w0 = 2 * Math.PI * fc / sr, cw = Math.cos(w0), sw = Math.sin(w0), al = sw / (2 * Q);
      const b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = (1 + cw) / 2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
      const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < x.length; i++) { const xi = x[i]; const y = B0 * xi + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y; x[i] = y; }
    }
    return x;
  }
  function resample(input, ratio) { const outLen = Math.floor(input.length / ratio), out = new Float32Array(outLen), n = input.length; for (let i = 0; i < outLen; i++) { const x = i * ratio; const j = x | 0; const t = x - j; const y0 = input[j - 1 < 0 ? 0 : j - 1], y1 = input[j], y2 = input[j + 1 < n ? j + 1 : n - 1], y3 = input[j + 2 < n ? j + 2 : n - 1]; const a = (3 * (y1 - y2) - y0 + y3) / 2, b = 2 * y2 + y0 - (5 * y1 + y3) / 2, c = (y2 - y0) / 2; out[i] = ((a * t + b) * t + c) * t + y1; } return out; }

  const api = { demucsPrep, demucsPost, mdxSpek, mdxWave, makeFFTmixed, stft2, istft2, highpass, SEG, SR };

  // ---------- Worker side ----------
  if (inWorker) {
    self.onmessage = (e) => {
      const { id, op } = e.data; let r, tr = [];
      if (op === 'demucsPrep') { r = demucsPrep(e.data.L, e.data.R); tr = [r.mix.buffer, r.zcac.buffer]; }
      else if (op === 'demucsPost') { const [a, b] = demucsPost(e.data.zv, e.data.tv, e.data.m2, e.data.d); r = { L: a, R: b }; tr = [a.buffer, b.buffer]; }
      else if (op === 'mdxSpek') { const s = mdxSpek(e.data.L, e.data.R, e.data.nfft, e.data.dimF); r = { spek: s }; tr = [s.buffer]; }
      else if (op === 'mdxWave') { const [a, b] = mdxWave(e.data.spek, e.data.nfft, e.data.len, e.data.dimF); r = { L: a, R: b }; tr = [a.buffer, b.buffer]; }
      self.postMessage({ id, r }, tr);
    };
    root.ShedDemucs = api; return;
  }
  if (typeof document === 'undefined') { root.ShedDemucs = api; return; }   // node tests

  // ---------- Page side: worker pool + onnxruntime ----------
  const selfUrl = (document.currentScript && document.currentScript.src) || 'demucs/shed-demucs.js';
  const pool = { workers: [], next: 0, pending: new Map(), seq: 0 };
  function poolSize() { return Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)); }
  let poolReady = null;
  function ensurePool() {
    if (poolReady) return poolReady;
    poolReady = (async () => {
      // A page served from another origin (or from a file on disk) cannot start a worker from this URL directly:
      // fetch the script and start the workers from an in-memory copy instead.
      let url = selfUrl;
      try { const a = new URL(selfUrl, location.href); if (a.origin !== location.origin || location.protocol === 'file:') { const txt = await (await fetch(a.href)).text(); url = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })); } } catch (e) {}
      for (let i = 0; i < poolSize(); i++) {
        const w = new Worker(url);
        w.onmessage = (e) => { const p = pool.pending.get(e.data.id); if (p) { pool.pending.delete(e.data.id); p(e.data.r); } };
        pool.workers.push(w);
      }
    })();
    return poolReady;
  }
  async function job(op, data, transfer) { await ensurePool(); const id = ++pool.seq; const w = pool.workers[pool.next++ % pool.workers.length]; return new Promise((res) => { pool.pending.set(id, res); w.postMessage(Object.assign({ id, op }, data), transfer || []); }); }

  let ortLoading = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function ensureOrt() { if (root.ort) return root.ort; if (!ortLoading) ortLoading = loadScript(ORT_BASE + 'ort.webgpu.min.js').then(() => { root.ort.env.wasm.wasmPaths = ORT_BASE; return root.ort; }); return ortLoading; }
  async function fetchModel(parts, onProgress) {
    const bufs = []; let total = 0, done = 0;
    const heads = await Promise.all(parts.map(p => fetch(p, { method: 'HEAD' }).catch(() => null)));
    for (const h of heads) total += h && h.ok ? +(h.headers.get('content-length') || 0) : 0;
    for (const p of parts) { const r = await fetch(p); if (!r.ok) throw new Error('Model file missing: ' + p); const reader = r.body.getReader();
      while (true) { const { done: d, value } = await reader.read(); if (d) break; bufs.push(value); done += value.length; if (onProgress && total) onProgress(done / total); } }
    const out = new Uint8Array(done); let o = 0; for (const c of bufs) { out.set(c, o); o += c.length; } return out;
  }
  const sessions = {};
  async function getSession(key, parts, onProgress) {
    if (sessions[key]) return sessions[key];
    const ort = await ensureOrt(); const bytes = await fetchModel(parts, (f) => onProgress && onProgress('download', f));
    onProgress && onProgress('compile', 0);
    const s = await ort.InferenceSession.create(bytes, { executionProviders: navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'], graphOptimizationLevel: 'all' });
    s._ep = navigator.gpu ? 'webgpu' : 'wasm'; sessions[key] = s; return s;
  }
  const tick = () => new Promise(r => setTimeout(r, 0));
  function back(oL, oR, inL, inR, ratio) { const b = 1 / ratio; const bL = resample(oL, b), bR = resample(oR, b); const fL = new Float32Array(inL.length), fR = new Float32Array(inR.length); fL.set(bL.subarray(0, Math.min(bL.length, fL.length))); fR.set(bR.subarray(0, Math.min(bR.length, fR.length))); return [fL, fR]; }

  // All vocals (Demucs). Returns {vocalsL, vocalsR, ep} at the input rate.
  async function separateVocals(inL, inR, sr, modelParts, onProgress, opts) {
    opts = Object.assign({ shifts: 1, overlap: 0.25 }, opts || {});
    const sess = await getSession('demucs', modelParts, onProgress); const ort = root.ort;
    let L0 = inL, R0 = inR; const ratio = sr / SR; if (Math.abs(ratio - 1) > 1e-6) { L0 = resample(inL, ratio); R0 = resample(inR, ratio); }
    // shift averaging (demucs apply_model shifts): run on copies offset by up to 0.5 s and average
    const maxShift = Math.round(0.5 * SR); const accL = new Float32Array(L0.length), accR = new Float32Array(R0.length);
    const stride = Math.round(SEG * (1 - opts.overlap));
    for (let sh = 0; sh < opts.shifts; sh++) {
      const off = opts.shifts === 1 ? 0 : Math.floor(Math.random() * maxShift);
      const L = new Float32Array(L0.length + off), R = new Float32Array(R0.length + off); L.set(L0, off); R.set(R0, off);
      const r = await demucsPass(sess, ort, L, R, stride, (ph, f, left) => onProgress && onProgress(ph, (sh + f) / opts.shifts, left == null ? null : left + (opts.shifts - sh - 1) * (left / Math.max(1e-6, 1 - f)) * 0));
      for (let i = 0; i < L0.length; i++) { accL[i] += r[0][off + i] / opts.shifts; accR[i] += r[1][off + i] / opts.shifts; }
    }
    if (Math.abs(ratio - 1) > 1e-6) { const [a, b] = back(accL, accR, inL, inR, ratio); return { vocalsL: a, vocalsR: b, ep: sess._ep }; }
    return { vocalsL: accL, vocalsR: accR, ep: sess._ep };
  }
  async function demucsPass(sess, ort, L, R, stride, onProgress) {
    const T = L.length; let mean = 0; for (let i = 0; i < T; i++) mean += 0.5 * (L[i] + R[i]); mean /= T; let v = 0; for (let i = 0; i < T; i++) v += (0.5 * (L[i] + R[i]) - mean) ** 2; const std = Math.sqrt(v / Math.max(1, T - 1)) || 1;
    const wL = new Float32Array(T), wR = new Float32Array(T); for (let i = 0; i < T; i++) { wL[i] = (L[i] - mean) / std; wR[i] = (R[i] - mean) / std; }
    const vL = new Float32Array(T), vR = new Float32Array(T), ws = new Float32Array(T);
    const tri = new Float32Array(SEG); const h = SEG >> 1; for (let i = 0; i < h; i++) tri[i] = (i + 1) / h; for (let i = h; i < SEG; i++) tri[i] = (SEG - i) / (SEG - h);
    const offs = []; for (let off = 0; ; off += stride) { offs.push(off); if (off + SEG >= T) break; }
    const nSeg = offs.length; const t0 = performance.now();
    const prep = (off) => { const n = Math.min(SEG, T - off); const cL = new Float32Array(SEG), cR = new Float32Array(SEG); cL.set(wL.subarray(off, off + n)); cR.set(wR.subarray(off, off + n)); return job('demucsPrep', { L: cL, R: cR }, [cL.buffer, cR.buffer]).then(r => Object.assign(r, { off, n })); };
    let prepNext = prep(offs[0]); const posts = []; let done = 0;
    for (let s = 0; s < nSeg; s++) {
      const cur = await prepNext; if (s + 1 < nSeg) prepNext = prep(offs[s + 1]);
      const res = await sess.run({ mix: new ort.Tensor('float32', cur.mix, [1, 2, SEG]), z_cac: new ort.Tensor('float32', cur.zcac, [1, 4, FQ, FRAMES]) });
      const P = FQ * FRAMES; const zv = res.zout_cac.data.slice(3 * 4 * P, 4 * 4 * P); const tv = res.time_out.data.slice(3 * 2 * SEG, 4 * 2 * SEG);
      posts.push(job('demucsPost', { zv, tv, m2: cur.m2, d: cur.d }, [zv.buffer, tv.buffer]).then(r => { for (let i = 0; i < cur.n; i++) { vL[cur.off + i] += r.L[i] * tri[i]; vR[cur.off + i] += r.R[i] * tri[i]; ws[cur.off + i] += tri[i]; } done++; if (onProgress) { const el = (performance.now() - t0) / 1000; onProgress('separate', done / nSeg, el / done * (nSeg - done)); } }));
      await tick();
    }
    await Promise.all(posts);
    for (let i = 0; i < T; i++) { const w = ws[i] || 1; vL[i] = vL[i] / w * std + mean; vR[i] = vR[i] / w * std + mean; }
    return [vL, vR];
  }
  // Any UVR MDX-Net model → its primary stem. params {nfft, dimF, compensate}. Vocal models (Kim_Vocal_2, Voc_FT) return the
  // vocals; Karaoke 2 returns band + backing vocals (lead = mix − result).
  async function separateMDX(inL, inR, sr, modelUrl, params, onProgress, opts) {
    opts = Object.assign({ denoise: false, overlap: 0.25 }, opts || {});
    const sess = await getSession(modelUrl, [modelUrl], onProgress); const ort = root.ort;
    const nfft = params.nfft, comp = params.compensate, overlap = opts.overlap, dimF = params.dimF || MDX.DIM_F;
    let L = inL, R = inR; const ratio = sr / SR; if (Math.abs(ratio - 1) > 1e-6) { L = resample(inL, ratio); R = resample(inR, ratio); }
    const T = L.length, chunk = MDX.HOP * (MDX.DIM_T - 1), trim = nfft >> 1, step = Math.floor(chunk * (1 - overlap));
    const padLen = trim + T + chunk; const mL = new Float32Array(padLen), mR = new Float32Array(padLen); mL.set(L, trim); mR.set(R, trim);
    const rL = new Float32Array(padLen), rR = new Float32Array(padLen), div = new Float32Array(padLen); const win = getWin(chunk);
    const offs = []; for (let i = 0; i < trim + T; i += step) offs.push(i); const nCh = offs.length; const t0 = performance.now();
    const prep = (i) => { const cL = mL.slice(i, i + chunk), cR = mR.slice(i, i + chunk); return job('mdxSpek', { L: cL, R: cR, nfft, dimF }, [cL.buffer, cR.buffer]).then(r => ({ spek: r.spek, i })); };
    let prepNext = prep(offs[0]); const posts = []; let done = 0;
    for (let c = 0; c < nCh; c++) {
      const cur = await prepNext; if (c + 1 < nCh) prepNext = prep(offs[c + 1]);
      const res = await sess.run({ input: new ort.Tensor('float32', cur.spek, [1, 4, dimF, MDX.DIM_T]) });
      const out = res.output.data.slice();
      if (opts.denoise) { const neg = cur.spek; for (let q = 0; q < neg.length; q++) neg[q] = -neg[q]; const r2 = await sess.run({ input: new ort.Tensor('float32', neg, [1, 4, dimF, MDX.DIM_T]) }); const o2 = r2.output.data; for (let q = 0; q < out.length; q++) out[q] = 0.5 * (out[q] - o2[q]); }
      posts.push(job('mdxWave', { spek: out, nfft, len: chunk, dimF }, [out.buffer]).then(r => { const n = Math.min(chunk, padLen - cur.i); for (let j = 0; j < n; j++) { rL[cur.i + j] += r.L[j] * win[j]; rR[cur.i + j] += r.R[j] * win[j]; div[cur.i + j] += win[j]; } done++; if (onProgress) { const el = (performance.now() - t0) / 1000; onProgress('separate', done / nCh, el / done * (nCh - done)); } }));
      await tick();
    }
    await Promise.all(posts);
    const oL = new Float32Array(T), oR = new Float32Array(T); for (let i = 0; i < T; i++) { const d = div[trim + i] || 1; oL[i] = rL[trim + i] / d * comp; oR[i] = rR[trim + i] / d * comp; }
    if (Math.abs(ratio - 1) > 1e-6) { const [a, b] = back(oL, oR, inL, inR, ratio); return { L: a, R: b, ep: sess._ep }; }
    return { L: oL, R: oR, ep: sess._ep };
  }
  const separateKaraoke = separateMDX;
  root.ShedDemucs = Object.assign(api, { separateVocals, separateKaraoke, separateMDX, getSession, canRun: () => !!navigator.gpu });
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this));
