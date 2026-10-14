// Shed DSP — phase vocoder time-stretch + resampling pitch shift.
// Pure JS, no dependencies. Runs inside a Web Worker (see index.html) or Node for tests.

function makeFFT(n) {
  const levels = Math.log2(n) | 0;
  if (1 << levels !== n) throw new Error('FFT size must be a power of 2');
  const cosT = new Float32Array(n / 2), sinT = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cosT[i] = Math.cos(2 * Math.PI * i / n); sinT[i] = Math.sin(2 * Math.PI * i / n); }
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) { let r = 0, x = i; for (let j = 0; j < levels; j++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
  // In-place complex FFT. inverse=true computes unnormalised inverse.
  return function fft(re, im, inverse) {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const c = cosT[k], s = inverse ? sinT[k] : -sinT[k];
          const l = j + half;
          const tre = re[l] * c - im[l] * s, tim = re[l] * s + im[l] * c;
          re[l] = re[j] - tre; im[l] = im[j] - tim; re[j] += tre; im[j] += tim;
        }
      }
    }
  };
}

// Time-stretch one channel by `stretch` (output length ≈ input length * stretch).
// Phase vocoder with identity phase locking around spectral peaks (keeps transients/harmonics clean).
function timeStretch(input, stretch, opts = {}) {
  const N = opts.frameSize || 2048;
  const Hs = opts.hop || N / 4;
  const Ha = Hs / stretch;
  const fft = makeFFT(N);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const inLen = input.length;
  const outLen = Math.ceil(inLen * stretch) + N;
  const out = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  const re = new Float32Array(N), im = new Float32Array(N);
  const half = N / 2;
  const lastPhase = new Float32Array(half + 1), sumPhase = new Float32Array(half + 1);
  const mag = new Float32Array(half + 1), phase = new Float32Array(half + 1);
  const expect = 2 * Math.PI * Ha / N; // expected phase advance per bin index
  const twoPi = 2 * Math.PI;
  let frame = 0;
  const onProgress = opts.onProgress;
  const totalFrames = Math.ceil(inLen / Ha);
  for (let pos = 0; pos < inLen; pos += Ha, frame++) {
    const start = Math.round(pos);
    for (let i = 0; i < N; i++) { const s = start + i; re[i] = s < inLen ? input[s] * win[i] : 0; im[i] = 0; }
    fft(re, im, false);
    for (let k = 0; k <= half; k++) {
      mag[k] = Math.hypot(re[k], im[k]);
      phase[k] = Math.atan2(im[k], re[k]);
    }
    if (frame === 0) {
      for (let k = 0; k <= half; k++) { lastPhase[k] = phase[k]; sumPhase[k] = phase[k]; }
    } else {
      // Find peaks, compute true frequency for each peak, lock neighbouring bins to the peak.
      let k = 1;
      while (k < half) {
        if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > 1e-6) {
          // region of influence: from previous valley to next valley
          let lo = k, hi = k;
          while (lo > 0 && mag[lo - 1] < mag[lo]) lo--;
          while (hi < half && mag[hi + 1] < mag[hi]) hi++;
          let d = phase[k] - lastPhase[k] - k * expect;
          d -= twoPi * Math.round(d / twoPi);
          const trueFreq = k * expect + d; // radians per analysis hop
          const rot = trueFreq * (Hs / Ha);
          const peakOut = sumPhase[k] + rot;
          for (let b = lo; b <= hi; b++) sumPhase[b] = peakOut + (phase[b] - phase[k]);
          k = hi + 1;
        } else k++;
      }
      for (let k2 = 0; k2 <= half; k2++) lastPhase[k2] = phase[k2];
    }
    for (let k = 0; k <= half; k++) { re[k] = mag[k] * Math.cos(sumPhase[k]); im[k] = mag[k] * Math.sin(sumPhase[k]); }
    for (let k = 1; k < half; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    fft(re, im, true);
    const o = Math.round(frame * Hs);
    const scale = 1 / N;
    for (let i = 0; i < N && o + i < outLen; i++) { const w = win[i]; out[o + i] += re[i] * scale * w; norm[o + i] += w * w; }
    if (onProgress && (frame & 63) === 0) onProgress(frame / totalFrames);
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out.subarray(0, Math.ceil(inLen * stretch));
}

// Resample by reading with step `ratio` (ratio>1 raises pitch). Cubic interpolation.
function resample(input, ratio) {
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  const n = input.length;
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio; const j = x | 0; const t = x - j;
    const y0 = input[j - 1 < 0 ? 0 : j - 1], y1 = input[j], y2 = input[j + 1 < n ? j + 1 : n - 1], y3 = input[j + 2 < n ? j + 2 : n - 1];
    const a = (3 * (y1 - y2) - y0 + y3) / 2, b = 2 * y2 + y0 - (5 * y1 + y3) / 2, c = (y2 - y0) / 2;
    out[i] = ((a * t + b) * t + c) * t + y1;
  }
  return out;
}

// semitones: key change; tempo: 1 = original speed (0.5 = half speed).
function processChannel(input, semitones, tempo, onProgress) {
  const p = Math.pow(2, semitones / 12);
  const stretch = p / tempo;
  let y = input;
  if (Math.abs(stretch - 1) > 1e-4) y = timeStretch(input, stretch, { onProgress });
  if (Math.abs(p - 1) > 1e-6) y = resample(y, p);
  return y;
}

if (typeof module !== 'undefined') module.exports = { makeFFT, timeStretch, resample, processChannel };
// Worker protocol: {id, chunk: Float32Array (input incl. context padding), padIn, semitones, tempo}
// Returns the rendered samples for the chunk with the padding removed (padIn/tempo on each side).
if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  self.onmessage = (e) => {
    if (e.data.type === 'melody') {
      const { id, x, sr } = e.data; const pts = trackMelody(x, sr);
      self.postMessage({ id, type: 'melody', points: pts }); return;
    }
    if (e.data.type === 'vocal') {
      const { id, L, R, sr, strength } = e.data;
      const out = reduceVocals(L, R, sr, strength, (f) => self.postMessage({ id, type: 'vocal', progress: f }));
      self.postMessage({ id, type: 'vocal', done: true, L: out[0], R: out[1] }, [out[0].buffer, out[1].buffer]);
      return;
    }
    const { id, chunk, padIn, semitones, tempo, ci } = e.data;
    const y = processChannel(chunk, semitones, tempo);
    const padOut = Math.round((padIn || 0) / tempo);
    const core = y.slice(padOut, Math.max(padOut, y.length - padOut));
    self.postMessage({ id, ci, channel: core }, [core.buffer]);
  };
}

// ---------- Vocal reduction: repetition (REPET-SIM) × panning × pitch-harmonic masks ----------
// Works on the mid/side + spectrogram of a stereo mix. Returns new [L, R] with the lead vocal attenuated.
function stft(x, N, H, fft, win) {
  const F = Math.max(1, Math.floor((x.length - N) / H) + 1), half = N / 2 + 1;
  const re = new Float32Array(F * half), im = new Float32Array(F * half);
  const br = new Float32Array(N), bi = new Float32Array(N);
  for (let f = 0; f < F; f++) { const o = f * H; for (let i = 0; i < N; i++) { br[i] = x[o + i] * win[i]; bi[i] = 0; } fft(br, bi, false); re.set(br.subarray(0, half), f * half); im.set(bi.subarray(0, half), f * half); }
  return { re, im, F, half };
}
function istft(S, N, H, fft, win, len) {
  const { re, im, F, half } = S; const out = new Float32Array(len), norm = new Float32Array(len);
  const br = new Float32Array(N), bi = new Float32Array(N);
  for (let f = 0; f < F; f++) {
    for (let k = 0; k < half; k++) { br[k] = re[f * half + k]; bi[k] = im[f * half + k]; }
    for (let k = 1; k < half - 1; k++) { br[N - k] = br[k]; bi[N - k] = -bi[k]; }
    fft(br, bi, true); const o = f * H;
    for (let i = 0; i < N && o + i < len; i++) { out[o + i] += br[i] / N * win[i]; norm[o + i] += win[i] * win[i]; }
  }
  for (let i = 0; i < len; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out;
}
function reduceVocals(L, R, sr, strength, onProgress) {
  const N = 2048, H = 512, fft = makeFFT(N), half = N / 2 + 1;
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const BLOCK = Math.round(40 * sr), OV = Math.round(2 * sr), len = L.length;
  const outL = new Float32Array(len), outR = new Float32Array(len), outW = new Float32Array(len);
  const binHz = sr / N;
  const nBands = 48; const bandOf = new Int16Array(half);
  for (let k = 0; k < half; k++) { const hz = k * binHz; bandOf[k] = Math.min(nBands - 1, Math.floor(nBands * Math.log(1 + hz / 200) / Math.log(1 + sr / 2 / 200))); }
  const kMax = Math.min(half - 1, Math.floor(12000 / binHz));
  let start = 0, blockIndex = 0; const nBlocks = Math.ceil(len / (BLOCK - OV));
  while (start < len) {
    const end = Math.min(len, start + BLOCK);
    const sL = stft(L.subarray(start, end), N, H, fft, win), sR = stft(R.subarray(start, end), N, H, fft, win);
    const F = sL.F;
    // magnitudes of mid, and per-bin "centredness"
    const mag = new Float32Array(F * half), pan = new Float32Array(F * half);
    for (let i = 0; i < F * half; i++) {
      const lr = sL.re[i], li = sL.im[i], rr = sR.re[i], ri = sR.im[i];
      const ml = Math.hypot(lr, li), mr = Math.hypot(rr, ri);
      mag[i] = 0.5 * Math.hypot(lr + rr, li + ri);
      const sim = (ml * ml + mr * mr) > 1e-12 ? 2 * ml * mr / (ml * ml + mr * mr) : 0;        // 1 = equal level both sides
      const coh = (ml * mr) > 1e-12 ? (lr * rr + li * ri) / (ml * mr) : 0;                      // 1 = in phase
      const p = sim * Math.max(0, coh); pan[i] = p * p;                                           // steep: only truly centred bins count fully
    }
    // band energies (log-compressed) for the similarity search
    const bands = new Float32Array(F * nBands);
    for (let f = 0; f < F; f++) { const o = f * half, b = f * nBands; for (let k = 0; k < half; k++) bands[b + bandOf[k]] += mag[o + k]; for (let j = 0; j < nBands; j++) bands[b + j] = Math.log1p(bands[b + j] * 10); let s = 0; for (let j = 0; j < nBands; j++) s += bands[b + j] * bands[b + j]; s = Math.sqrt(s) || 1; for (let j = 0; j < nBands; j++) bands[b + j] /= s; }
    // REPET-SIM: for each frame, the K most similar frames at least 1 s away within ±25 s; background = median of them
    const K = 12, minGap = Math.round(sr / H), maxGap = Math.round(25 * sr / H);
    const bg = new Float32Array(F * half); const cand = new Float32Array(F); const picks = new Int32Array(K); const tmp = new Float32Array(K + 1);
    for (let f = 0; f < F; f++) {
      const b = f * nBands; let n = 0;
      for (let g = Math.max(0, f - maxGap); g < Math.min(F, f + maxGap); g++) { if (Math.abs(g - f) < minGap) continue; let d = 0; const c = g * nBands; for (let j = 0; j < nBands; j++) d += bands[b + j] * bands[c + j]; cand[g] = d; n++; }
      // pick top K by similarity (partial selection)
      let kk = 0; for (let t = 0; t < K; t++) { let best = -1, bv = -1; for (let g = Math.max(0, f - maxGap); g < Math.min(F, f + maxGap); g++) { if (Math.abs(g - f) < minGap) continue; const v = cand[g]; if (v > bv) { bv = v; best = g; } } if (best < 0) break; picks[kk++] = best; cand[best] = -2; }
      const o = f * half;
      if (kk < 3) { for (let k = 0; k < half; k++) bg[o + k] = mag[o + k]; continue; }
      for (let k = 0; k < half; k++) { for (let t = 0; t < kk; t++) tmp[t] = mag[picks[t] * half + k]; const sub = tmp.subarray(0, kk); sub.sort(); const med = kk & 1 ? sub[kk >> 1] : 0.5 * (sub[kk / 2 - 1] + sub[kk / 2]); bg[o + k] = Math.min(med, mag[o + k]); }
    }
    // pitch-harmonic mask: dominant centred harmonic source, 80–1000 Hz, per frame
    const harm = new Float32Array(F * half);
    const f0Lo = 80, f0Hi = 1000, nF0 = 160; const f0s = new Float32Array(nF0); for (let i = 0; i < nF0; i++) f0s[i] = f0Lo * Math.pow(f0Hi / f0Lo, i / (nF0 - 1));
    let prevF0 = 0;
    for (let f = 0; f < F; f++) {
      const o = f * half; let bestS = 0, bestF = 0;
      for (let i = 0; i < nF0; i++) { const f0 = f0s[i]; let sal = 0; for (let h = 1; h <= 10; h++) { const k = Math.round(h * f0 / binHz); if (k >= half) break; const v = Math.max(0, mag[o + k] - bg[o + k]) * pan[o + k]; sal += v / Math.sqrt(h); } if (prevF0 && Math.abs(Math.log(f0 / prevF0)) < 0.06) sal *= 1.15; if (sal > bestS) { bestS = sal; bestF = f0; } }
      let energy = 0; for (let k = 0; k < half; k++) energy += mag[o + k]; if (bestS < 0.02 * energy) { prevF0 = 0; continue; }
      prevF0 = bestF;
      for (let h = 1; h <= 40; h++) { const c = h * bestF / binHz; if (c > kMax) break; const w = Math.max(2, 0.025 * c); for (let k = Math.max(0, Math.floor(c - w)); k <= Math.min(half - 1, Math.ceil(c + w)); k++) { const t = 1 - Math.abs(k - c) / w; if (t > harm[o + k]) harm[o + k] = t; } }
    }
    // combine: vocal = non-repeating × centred × (harmonic boost), smoothed; then attenuate
    const V = new Float32Array(F * half);
    let dN = 0, dP = 0, dH = 0, dW = 0;
    for (let f = 0; f < F; f++) { const o = f * half; for (let k = 0; k < half; k++) { const m = mag[o + k]; const nonrep = m > 1e-9 ? Math.max(0, 1 - bg[o + k] / m) : 0; const v = nonrep * pan[o + k] * (0.35 + 0.65 * harm[o + k]); V[o + k] = Math.min(1, v * 1.6); dN += nonrep * m; dP += pan[o + k] * m; dH += harm[o + k] * m; dW += m; } }
    if (reduceVocals.debug) console.log('block', blockIndex, 'nonrep', (dN / dW).toFixed(3), 'pan', (dP / dW).toFixed(3), 'harm', (dH / dW).toFixed(3));
    // 3x3 smoothing to avoid musical noise
    const Vs = new Float32Array(F * half);
    for (let f = 0; f < F; f++) for (let k = 0; k < half; k++) { let s = 0, n = 0; for (let df = -1; df <= 1; df++) { const g = f + df; if (g < 0 || g >= F) continue; for (let dk = -1; dk <= 1; dk++) { const q = k + dk; if (q < 0 || q >= half) continue; s += V[g * half + q]; n++; } } Vs[f * half + k] = s / n; }
    if (reduceVocals.debug && blockIndex === 0) reduceVocals.last = { V: Vs, nonrepBg: bg, mag, pan, harm, F, half, N, H };
    for (let i = 0; i < F * half; i++) { const g = 1 - strength * Vs[i]; sL.re[i] *= g; sL.im[i] *= g; sR.re[i] *= g; sR.im[i] *= g; }
    const bl = istft(sL, N, H, fft, win, end - start), br2 = istft(sR, N, H, fft, win, end - start);
    // overlap-add blocks with a linear crossfade
    for (let i = 0; i < end - start; i++) { let w = 1; if (start > 0 && i < OV) w = i / OV; if (end < len && (end - start) - i <= OV) w = Math.min(w, ((end - start) - i) / OV); outL[start + i] += bl[i] * w; outR[start + i] += br2[i] * w; outW[start + i] += w; }
    blockIndex++; if (onProgress) onProgress(Math.min(1, blockIndex / nBlocks));
    if (end >= len) break; start = end - OV;
  }
  for (let i = 0; i < len; i++) if (outW[i] > 1e-3) { outL[i] /= outW[i]; outR[i] /= outW[i]; }
  return [outL, outR];
}
if (typeof module !== 'undefined') { module.exports.reduceVocals = reduceVocals; module.exports.stft = stft; }

// ---------- Melody tracker: pitch of a (separated) lead vocal, offline, whole song ----------
// Normalised-square-difference (McLeod) via FFT autocorrelation, vocal range 70–1200 Hz,
// voicing by clarity + energy, median smoothing, octave-jump suppression. Returns [{t, midi}] with t in seconds.
function trackMelody(x, sr, opts = {}) {
  const N = 2048, H = opts.hop || 512, M = 4096, fft = makeFFT(M);
  const fLo = 70, fHi = 1200, lagMin = Math.floor(sr / fHi), lagMax = Math.min(N - 1, Math.ceil(sr / fLo));
  const re = new Float32Array(M), im = new Float32Array(M);
  const nFr = Math.max(0, Math.floor((x.length - N) / H) + 1);
  // global energy reference for voicing
  let gl = 0; for (let i = 0; i < x.length; i++) gl += x[i] * x[i]; const gRms = Math.sqrt(gl / Math.max(1, x.length));
  const raw = new Float32Array(nFr).fill(-1), clar = new Float32Array(nFr), ener = new Float32Array(nFr);
  const cum = new Float64Array(N + 1);
  for (let f = 0; f < nFr; f++) {
    const o = f * H; let e = 0; for (let i = 0; i < N; i++) { const v = x[o + i]; re[i] = v; im[i] = 0; e += v * v; } for (let i = N; i < M; i++) { re[i] = 0; im[i] = 0; }
    ener[f] = Math.sqrt(e / N); if (ener[f] < 0.06 * gRms || ener[f] < 1e-4) continue;
    fft(re, im, false); for (let i = 0; i < M; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; } fft(re, im, true);
    cum[0] = 0; for (let i = 0; i < N; i++) cum[i + 1] = cum[i] + x[o + i] * x[o + i];
    // nsdf(tau) = 2*acf(tau) / (E[0..N-tau] + E[tau..N])
    let maxV = 0; const nsdf = new Float32Array(lagMax + 1);
    for (let tau = lagMin; tau <= lagMax; tau++) { const acf = re[tau] / M; const m = (cum[N - tau] - cum[0]) + (cum[N] - cum[tau]); nsdf[tau] = m > 0 ? 2 * acf / m : 0; if (nsdf[tau] > maxV) maxV = nsdf[tau]; }
    if (maxV < 0.6) continue;
    // first peak above 0.85*max (avoids octave-down errors), parabolic refinement
    const thr = Math.max(0.6, maxV * 0.85); let best = -1;
    for (let tau = lagMin + 1; tau < lagMax; tau++) if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1] && nsdf[tau] > thr) { best = tau; break; }
    if (best < 0) continue;
    const a = nsdf[best - 1], b = nsdf[best], c = nsdf[best + 1]; const den = (a - 2 * b + c); const shift = den ? (a - c) / (2 * den) : 0;
    const f0 = sr / (best + shift); raw[f] = 69 + 12 * Math.log2(f0 / 440); clar[f] = b;
  }
  // octave-jump suppression against a running median, then 5-frame median smoothing
  const out = new Float32Array(nFr).fill(-1); let prev = -1;
  // only undo a brief octave glitch: a jump of ~12 that lasts under 80 ms and comes back
  for (let f = 0; f < nFr; f++) out[f] = raw[f];
  const glitch = Math.ceil(0.08 * sr / H);
  for (let f = 1; f < nFr - 1; f++) { if (out[f] < 0 || out[f - 1] < 0) continue; const d = out[f] - out[f - 1]; if (Math.abs(Math.abs(d) - 12) > 0.3) continue; let g = f; while (g < nFr && g - f < glitch && out[g] >= 0 && Math.abs((out[g] - out[f - 1]) - d) < 0.6) g++; if (g < nFr && g - f < glitch && out[g] >= 0 && Math.abs(out[g] - out[f - 1]) < 0.6) for (let q = f; q < g; q++) out[q] -= d; }
  const sm = new Float32Array(nFr).fill(-1);
  for (let f = 0; f < nFr; f++) { if (out[f] < 0) continue; const w = []; for (let d = -2; d <= 2; d++) { const g = f + d; if (g >= 0 && g < nFr && out[g] >= 0) w.push(out[g]); } w.sort((p, q) => p - q); sm[f] = w[w.length >> 1]; }
  // drop voiced islands shorter than 60 ms
  const minFr = Math.ceil(0.06 * sr / H); const pts = []; let start = -1;
  for (let f = 0; f <= nFr; f++) { const v = f < nFr && sm[f] >= 0; if (v && start < 0) start = f; if (!v && start >= 0) { if (f - start >= minFr) for (let g = start; g < f; g++) pts.push({ t: (g * H + N / 2) / sr, midi: sm[g] }); start = -1; } }
  return pts;
}
if (typeof module !== 'undefined') module.exports.trackMelody = trackMelody;

// ---------- Live pitch tracker (streaming) ----------
// Same core as trackMelody (McLeod NSDF via FFT autocorrelation) plus what a live monitor needs:
// 60 Hz high-pass, adaptive noise floor, clarity hysteresis for voicing, onset confirmation,
// octave-jump confirmation and a 3-frame median. Feed any block size; emits one frame per hop.
class LivePitch {
  constructor(sr, opts = {}) {
    this.sr = sr; this.N = 2048; this.H = opts.hop || 512; this.M = 4096; this.fft = makeFFT(this.M);
    this.re = new Float32Array(this.M); this.im = new Float32Array(this.M); this.cum = new Float64Array(this.N + 1);
    this.buf = new Float32Array(this.N); this.fill = 0; this.sinceHop = 0; this.w = 0;
    this.lagMin = Math.floor(sr / 1500); this.lagMax = Math.min(this.N - 2, Math.ceil(sr / 62));
    this.nsdf = new Float32Array(this.lagMax + 2);
    // 2nd-order Butterworth high-pass at 60 Hz
    const w0 = 2 * Math.PI * 60 / sr, cw = Math.cos(w0), al = Math.sin(w0) / (2 * Math.SQRT1_2), a0 = 1 + al;
    this.hp = { b0: (1 + cw) / 2 / a0, b1: -(1 + cw) / a0, b2: (1 + cw) / 2 / a0, a1: -2 * cw / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
    this.floor = 1e-3; this.voiced = false; this.onset = 0; this.prev = null; this.pend = null; this.med = [];
  }
  // returns raw estimate {midi, clarity, rms} or null for the current window
  analyse() {
    const { N, M, re, im, cum, nsdf, lagMin, lagMax } = this; const x = this.buf;
    let e = 0; for (let i = 0; i < N; i++) { const v = x[i]; re[i] = v; im[i] = 0; e += v * v; } for (let i = N; i < M; i++) { re[i] = 0; im[i] = 0; }
    const rms = Math.sqrt(e / N);
    // adaptive noise floor: falls fast, rises slowly (≈ 3 s), so it tracks the room, not the voice
    this.floor = rms < this.floor ? 0.7 * this.floor + 0.3 * rms : this.floor * 1.004 + 1e-7;
    const gate = Math.max(this.floor * 3.2, 4e-4);
    if (rms < gate) return { midi: null, clarity: 0, rms };
    this.fft(re, im, false); for (let i = 0; i < M; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; } this.fft(re, im, true);
    cum[0] = 0; for (let i = 0; i < N; i++) cum[i + 1] = cum[i] + x[i] * x[i];
    let maxV = 0;
    for (let tau = lagMin; tau <= lagMax + 1; tau++) { const m = cum[N - tau] + (cum[N] - cum[tau]); const v = m > 0 ? 2 * (re[tau] / M) / m : 0; nsdf[tau] = v; if (tau <= lagMax && v > maxV) maxV = v; }
    if (maxV < 0.45) return { midi: null, clarity: maxV, rms };
    const thr = maxV * 0.88; let best = -1;
    for (let tau = lagMin + 1; tau <= lagMax; tau++) if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1] && nsdf[tau] >= thr) { best = tau; break; }
    if (best < 0) return { midi: null, clarity: maxV, rms };
    const a = nsdf[best - 1], b = nsdf[best], c = nsdf[best + 1]; const den = a - 2 * b + c; const shift = den ? (a - c) / (2 * den) : 0;
    const f0 = this.sr / (best + Math.max(-0.5, Math.min(0.5, shift)));
    return { midi: 69 + 12 * Math.log2(f0 / 440), clarity: b, rms };
  }
  // continuity, hysteresis and smoothing on top of the raw estimate
  decide(r) {
    const onThr = 0.72, offThr = 0.5;
    let m = r.midi != null && r.clarity >= (this.voiced ? offThr : onThr) ? r.midi : null;
    if (m == null) { this.voiced = false; this.onset = 0; this.prev = null; this.pend = null; this.med.length = 0; return null; }
    if (!this.voiced) { this.onset++; if (this.onset < 2) { this.prev = m; return null; } this.voiced = true; }
    if (this.prev != null) {
      const d = m - this.prev;
      if (Math.abs(Math.abs(d) - 12) < 0.8 || Math.abs(Math.abs(d) - 19) < 0.8) {      // octave or octave+fifth jump: confirm before accepting
        if (this.pend && Math.abs(this.pend.m - m) < 0.8) this.pend.n++; else this.pend = { m, n: 1 };
        if (this.pend.n < 3) m = this.prev; else this.pend = null;
      } else this.pend = null;
    }
    this.prev = m; this.med.push(m); if (this.med.length > 3) this.med.shift();
    const s = this.med.slice().sort((p, q) => p - q); return s[s.length >> 1];
  }
  // push samples; calls onFrame(midiOrNull, rms) once per hop
  push(samples, onFrame) {
    const hp = this.hp, N = this.N, H = this.H, b = this.buf;
    for (let i = 0; i < samples.length; i++) {
      const x0 = samples[i]; const y = hp.b0 * x0 + hp.b1 * hp.x1 + hp.b2 * hp.x2 - hp.a1 * hp.y1 - hp.a2 * hp.y2; hp.x2 = hp.x1; hp.x1 = x0; hp.y2 = hp.y1; hp.y1 = y;
      const ring = this.ring || (this.ring = new Float32Array(N)); ring[this.w] = y; this.w = (this.w + 1) % N; if (this.fill < N) this.fill++;
      if (this.fill === N && ++this.sinceHop >= H) { this.sinceHop = 0; const w = this.w; b.set(ring.subarray(w), 0); b.set(ring.subarray(0, w), N - w); const r = this.analyse(); onFrame(this.decide(r), r.rms, i); }
    }
  }
}
if (typeof module !== 'undefined') module.exports.LivePitch = LivePitch;
