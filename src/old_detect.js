function detectPitch(buf, sr) {
  const n = buf.length; let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / n);
  if (rms < 0.01) return -1;
  const maxLag = Math.floor(sr / 60), minLag = Math.floor(sr / 1200);
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) { let ac = 0, m = 0; for (let i = 0; i < n - lag; i++) { ac += buf[i] * buf[i + lag]; m += buf[i] * buf[i] + buf[i + lag] * buf[i + lag]; } nsdf[lag] = m > 0 ? 2 * ac / m : 0; }
  // pick first strong peak
  let best = -1, bestV = 0, maxV = 0;
  for (let lag = minLag + 1; lag < maxLag; lag++) if (nsdf[lag] > maxV) maxV = nsdf[lag];
  const thr = Math.max(0.8, maxV * 0.9);
  let lag = minLag + 1;
  while (lag < maxLag) {
    if (nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1] && nsdf[lag] > thr) { best = lag; bestV = nsdf[lag]; break; }
    lag++;
  }
  if (best < 0 || bestV < 0.8) return -1;
  const a = nsdf[best - 1], b = nsdf[best], c = nsdf[best + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return sr / (best + shift);
}
