/* ============================================================
   EARS — Microphone pitch detection (autocorrelation) + note segmentation
   ============================================================ */
(function (E) {
  let stream = null, src = null, analyser = null, raf = null, running = false;
  const buf = new Float32Array(2048);

  function detect(b, sr) {
    let SIZE = b.length, rms = 0;
    for (let i = 0; i < SIZE; i++) rms += b[i] * b[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return { freq: -1, rms };
    let r1 = 0, r2 = SIZE - 1; const th = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(b[i]) < th) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(b[SIZE - i]) < th) { r2 = SIZE - i; break; }
    const sl = b.subarray(r1, r2); SIZE = sl.length;
    if (SIZE < 256) return { freq: -1, rms };
    const c = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) { let s = 0; for (let j = 0; j < SIZE - i; j++) s += sl[j] * sl[j + i]; c[i] = s; }
    let d = 0; while (d + 1 < SIZE && c[d] > c[d + 1]) d++;
    let maxv = -1, maxp = -1;
    for (let i = d; i < SIZE; i++) if (c[i] > maxv) { maxv = c[i]; maxp = i; }
    if (maxp <= 0) return { freq: -1, rms };
    let T0 = maxp;
    const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
    if (a) T0 = T0 - bb / (2 * a);
    const f = sr / T0; const clarity = maxv / (c[0] || 1);
    if (f < 60 || f > 1800 || clarity < 0.6) return { freq: -1, rms, clarity };
    return { freq: f, rms, clarity };
  }

  async function start(onFrame) {
    const ctx = E.Audio.getContext();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0;
    src.connect(analyser); running = true;
    const loop = () => {
      if (!running) return;
      analyser.getFloatTimeDomainData(buf);
      const r = detect(buf, ctx.sampleRate);
      const midi = r.freq > 0 ? E.freqToMidi(r.freq, E.Audio.getA4()) : null;
      onFrame({ freq: r.freq, midi, rms: r.rms, t: ctx.currentTime });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false; if (raf) cancelAnimationFrame(raf); raf = null;
    try { if (src) src.disconnect(); } catch (e) { }
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; src = null; analyser = null;
  }
  function isRunning() { return running; }

  /* Note tracker: turns a stream of (midi|null, t) into note events */
  function Tracker() {
    this.notes = []; this.cur = null; this.lastT = null; this.silence = 0;
  }
  Tracker.prototype.push = function (midi, t) {
    const MIN_DUR = 0.09;
    if (midi == null) {
      if (this.cur) { this.cur.gap = (this.cur.gap || 0) + (this.lastT != null ? t - this.lastT : 0); if (this.cur.gap > 0.18) this.close(t); }
      this.lastT = t; return;
    }
    const r = Math.round(midi);
    if (this.cur && Math.abs(midi - this.cur.midi) <= 0.55 && !(this.cur.gap > 0.18)) {
      this.cur.samples.push(midi); this.cur.end = t; this.cur.gap = 0;
    } else {
      this.close(t);
      this.cur = { midi: r, samples: [midi], start: t, end: t, gap: 0 };
    }
    this.lastT = t;
  };
  Tracker.prototype.close = function (t) {
    const c = this.cur; if (!c) return; this.cur = null;
    if (c.end - c.start < 0.09 || c.samples.length < 4) return;
    // robust pitch: median of samples
    const s = c.samples.slice().sort((a, b) => a - b); const med = s[Math.floor(s.length / 2)];
    const note = Math.round(med);
    const last = this.notes[this.notes.length - 1];
    if (last && last.midi === note && c.start - last.end < 0.12) { last.end = c.end; last.samples = last.samples.concat(c.samples); last.cents = Math.round((median(last.samples) - note) * 100); return; }
    this.notes.push({ midi: note, cents: Math.round((med - note) * 100), start: c.start, end: c.end, samples: c.samples });
  };
  Tracker.prototype.finish = function (t) { this.close(t || (this.lastT || 0) + 1); return this.notes; };
  function median(arr) { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }

  E.Pitch = { detect, start, stop, isRunning, Tracker };
})(window.EARS = window.EARS || {});
