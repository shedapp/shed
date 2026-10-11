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
    const { id, chunk, padIn, semitones, tempo, ci } = e.data;
    const y = processChannel(chunk, semitones, tempo);
    const padOut = Math.round((padIn || 0) / tempo);
    const core = y.slice(padOut, Math.max(padOut, y.length - padOut));
    self.postMessage({ id, ci, channel: core }, [core.buffer]);
  };
}
