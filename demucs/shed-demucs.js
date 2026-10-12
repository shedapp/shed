// Shed — in-browser HT-Demucs v4 (Meta AI) host pipeline for the static ONNX graph.
// Mirrors demucs/htdemucs.py: per-segment normalisation, _spec (STFT → complex-as-channels), _ispec,
// and apply_model's 7.8 s windows with 25 % overlap and triangular weights. Runs on WebGPU via onnxruntime-web.
(function () {
  const SR = 44100, SEG = 343980, NFFT = 4096, HOP = 1024, STRIDE = 257985, HALF = NFFT / 2 + 1, FQ = 2048, FRAMES = 336, SQ = Math.sqrt(NFFT);
  const ORT_VERSION = '1.20.1';
  const ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VERSION + '/dist/';

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
  const fft = makeFFT(NFFT);
  const win = new Float32Array(NFFT); for (let i = 0; i < NFFT; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT);

  function reflectPad(x, left, right) {
    const n = x.length, out = new Float32Array(n + left + right);
    out.set(x, left);
    for (let i = 0; i < left; i++) out[left - 1 - i] = x[i + 1];
    for (let i = 0; i < right; i++) out[left + n + i] = x[n - 2 - i];
    return out;
  }
  // torch.stft(center=True, normalized=True, pad_mode='reflect'); frame-major [t*HALF + k]
  function stft(x) {
    const xp = reflectPad(x, NFFT / 2, NFFT / 2); const nfr = 1 + Math.floor((xp.length - NFFT) / HOP);
    const re = new Float32Array(nfr * HALF), im = new Float32Array(nfr * HALF), br = new Float32Array(NFFT), bi = new Float32Array(NFFT);
    for (let t = 0; t < nfr; t++) { const o = t * HOP; for (let i = 0; i < NFFT; i++) { br[i] = xp[o + i] * win[i]; bi[i] = 0; } fft(br, bi, false); for (let k = 0; k < HALF; k++) { re[t * HALF + k] = br[k] / SQ; im[t * HALF + k] = bi[k] / SQ; } }
    return { re, im, nfr };
  }
  // torch.istft(center=True, normalized=True) with window-sum-square normalisation
  function istft(re, im, nfr, length) {
    const outLen = NFFT + HOP * (nfr - 1), y = new Float32Array(outLen), ws = new Float32Array(outLen), br = new Float32Array(NFFT), bi = new Float32Array(NFFT);
    for (let t = 0; t < nfr; t++) {
      for (let k = 0; k < HALF; k++) { br[k] = re[t * HALF + k]; bi[k] = im[t * HALF + k]; }
      for (let k = 1; k < HALF - 1; k++) { br[NFFT - k] = br[k]; bi[NFFT - k] = -bi[k]; }
      fft(br, bi, true); const o = t * HOP;
      for (let i = 0; i < NFFT; i++) { y[o + i] += br[i] / NFFT * SQ * win[i]; ws[o + i] += win[i] * win[i]; }
    }
    const out = new Float32Array(length); for (let i = 0; i < length; i++) { const w = ws[NFFT / 2 + i]; out[i] = w > 1e-8 ? y[NFFT / 2 + i] / w : 0; }
    return out;
  }
  // demucs _spec for one channel → writes real/imag planes into z_cac at channel slots cr, ci (layout [4][2048][336])
  function specInto(x, zcac, cr, ci) {
    const le = FRAMES, pad = HOP / 2 * 3;
    const xp = reflectPad(x, pad, pad + le * HOP - SEG);
    const S = stft(xp);
    for (let t = 0; t < le; t++) for (let k = 0; k < FQ; k++) { const src = (t + 2) * HALF + k; zcac[(cr * FQ + k) * FRAMES + t] = S.re[src]; zcac[(ci * FQ + k) * FRAMES + t] = S.im[src]; }
  }
  // demucs _ispec for one (source, channel): zout layout [4 src][4 planes][2048][336] → time signal of SEG samples
  function ispecFrom(zout, s, c) {
    const nfr = FRAMES + 4, re = new Float32Array(nfr * HALF), im = new Float32Array(nfr * HALF);
    const pr = ((s * 4 + c * 2) * FQ) * FRAMES, pi = ((s * 4 + c * 2 + 1) * FQ) * FRAMES;
    for (let k = 0; k < FQ; k++) for (let t = 0; t < FRAMES; t++) { re[(t + 2) * HALF + k] = zout[pr + k * FRAMES + t]; im[(t + 2) * HALF + k] = zout[pi + k * FRAMES + t]; }
    const pad = HOP / 2 * 3, le = HOP * FRAMES + 2 * pad;
    const x = istft(re, im, nfr, le);
    return x.subarray(pad, pad + SEG);
  }
  function stats(L, R) { let m = 0; const n = L.length; for (let i = 0; i < n; i++) m += L[i] + R[i]; m /= 2 * n; let v = 0; for (let i = 0; i < n; i++) { const a = L[i] - m, b = R[i] - m; v += a * a + b * b; } return { mean: m, std: Math.sqrt(v / (2 * n - 1)) }; }
  function resample(input, ratio) { const outLen = Math.floor(input.length / ratio), out = new Float32Array(outLen), n = input.length; for (let i = 0; i < outLen; i++) { const x = i * ratio; const j = x | 0; const t = x - j; const y0 = input[j - 1 < 0 ? 0 : j - 1], y1 = input[j], y2 = input[j + 1 < n ? j + 1 : n - 1], y3 = input[j + 2 < n ? j + 2 : n - 1]; const a = (3 * (y1 - y2) - y0 + y3) / 2, b = 2 * y2 + y0 - (5 * y1 + y3) / 2, c = (y2 - y0) / 2; out[i] = ((a * t + b) * t + c) * t + y1; } return out; }

  let ortLoading = null, session = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function ensureOrt() {
    if (window.ort) return window.ort;
    if (!ortLoading) ortLoading = loadScript(ORT_BASE + 'ort.webgpu.min.js').then(() => { window.ort.env.wasm.wasmPaths = ORT_BASE; return window.ort; });
    return ortLoading;
  }
  async function fetchModel(parts, onProgress) {
    // the weights are stored as two files under 100 MB each; concatenate them
    const bufs = []; let total = 0, done = 0;
    const heads = await Promise.all(parts.map(p => fetch(p, { method: 'HEAD' }).catch(() => null)));
    for (const h of heads) total += h && h.ok ? +(h.headers.get('content-length') || 0) : 0;
    for (const p of parts) {
      const r = await fetch(p); if (!r.ok) throw new Error('Model file missing: ' + p);
      const reader = r.body.getReader(); const chunks = [];
      while (true) { const { done: d, value } = await reader.read(); if (d) break; chunks.push(value); done += value.length; if (onProgress && total) onProgress(done / total); }
      bufs.push(...chunks);
    }
    const out = new Uint8Array(done); let o = 0; for (const c of bufs) { out.set(c, o); o += c.length; }
    return out;
  }
  async function getSession(modelParts, onProgress) {
    if (session) return session;
    const ort = await ensureOrt();
    const bytes = await fetchModel(modelParts, (f) => onProgress && onProgress('download', f));
    onProgress && onProgress('compile', 0);
    const providers = navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'];
    session = await ort.InferenceSession.create(bytes, { executionProviders: providers, graphOptimizationLevel: 'all' });
    session._ep = navigator.gpu ? 'webgpu' : 'wasm';
    return session;
  }
  async function runSegment(sess, L, R) {
    const ort = window.ort; const { mean, std } = stats(L, R); const d = 1e-5 + std;
    const mix = new Float32Array(2 * SEG); for (let i = 0; i < SEG; i++) { mix[i] = (L[i] - mean) / d; mix[SEG + i] = (R[i] - mean) / d; }
    const zcac = new Float32Array(4 * FQ * FRAMES);
    specInto(mix.subarray(0, SEG), zcac, 0, 1); specInto(mix.subarray(SEG), zcac, 2, 3);
    const res = await sess.run({ mix: new ort.Tensor('float32', mix, [1, 2, SEG]), z_cac: new ort.Tensor('float32', zcac, [1, 4, FQ, FRAMES]) });
    const timeOut = res.time_out.data, zout = res.zout_cac.data;
    const out = (s, c) => { const x = ispecFrom(zout, s, c); const to = (s * 2 + c) * SEG; const y = new Float32Array(SEG); for (let i = 0; i < SEG; i++) y[i] = (x[i] + timeOut[to + i]) * std + mean; return y; };
    return { vocalsL: out(3, 0), vocalsR: out(3, 1) };
  }
  // Separate vocals from a stereo track at any sample rate. Returns {vocalsL, vocalsR} at the input rate.
  async function separateVocals(inL, inR, sr, modelParts, onProgress) {
    const sess = await getSession(modelParts, onProgress);
    let L = inL, R = inR; const ratio = sr / SR;
    if (Math.abs(ratio - 1) > 1e-6) { L = resample(inL, ratio); R = resample(inR, ratio); }
    const T = L.length; const { mean, std } = (() => { const ref = new Float32Array(T); for (let i = 0; i < T; i++) ref[i] = 0.5 * (L[i] + R[i]); let m = 0; for (let i = 0; i < T; i++) m += ref[i]; m /= T; let v = 0; for (let i = 0; i < T; i++) v += (ref[i] - m) ** 2; return { mean: m, std: Math.sqrt(v / Math.max(1, T - 1)) || 1 }; })();
    const wL = new Float32Array(T), wR = new Float32Array(T); for (let i = 0; i < T; i++) { wL[i] = (L[i] - mean) / std; wR[i] = (R[i] - mean) / std; }
    const vL = new Float32Array(T), vR = new Float32Array(T), ws = new Float32Array(T);
    const tri = new Float32Array(SEG); const h = SEG >> 1; for (let i = 0; i < h; i++) tri[i] = (i + 1) / h; for (let i = h; i < SEG; i++) tri[i] = (SEG - i) / (SEG - h);
    const nSeg = Math.max(1, Math.ceil((T - SEG) / STRIDE) + 1); let k = 0; const t0 = performance.now();
    for (let off = 0; off < T; off += STRIDE) {
      const n = Math.min(SEG, T - off); const cL = new Float32Array(SEG), cR = new Float32Array(SEG); cL.set(wL.subarray(off, off + n)); cR.set(wR.subarray(off, off + n));
      const r = await runSegment(sess, cL, cR);
      for (let i = 0; i < n; i++) { vL[off + i] += r.vocalsL[i] * tri[i]; vR[off + i] += r.vocalsR[i] * tri[i]; ws[off + i] += tri[i]; }
      k++; if (onProgress) { const el = (performance.now() - t0) / 1000; onProgress('separate', k / nSeg, el / k * (nSeg - k)); }
      if (off + SEG >= T) break;
      await new Promise(r2 => setTimeout(r2, 0));
    }
    for (let i = 0; i < T; i++) { const w = ws[i] || 1; vL[i] = vL[i] / w * std + mean; vR[i] = vR[i] / w * std + mean; }
    if (Math.abs(ratio - 1) > 1e-6) { const back = 1 / ratio; let oL = resample(vL, back), oR = resample(vR, back); const fixL = new Float32Array(inL.length), fixR = new Float32Array(inR.length); fixL.set(oL.subarray(0, Math.min(oL.length, inL.length))); fixR.set(oR.subarray(0, Math.min(oR.length, inR.length))); return { vocalsL: fixL, vocalsR: fixR, ep: sess._ep }; }
    return { vocalsL: vL, vocalsR: vR, ep: sess._ep };
  }
  window.ShedDemucs = { separateVocals, getSession, stft, istft, specInto, ispecFrom, SEG, SR, canRun: () => !!navigator.gpu };
})();
