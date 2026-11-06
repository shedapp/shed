/* ============================================================
   EARS — Audio engine
   One real piano (Salamander Grand, shared with Shed and Changes in ../piano/) with three dynamic layers,
   plus synthesized electric piano, pad and pure tone for timbre variety. Scheduler, click, rhythm voice.
   ============================================================ */
(function (E) {
  let ctx = null, master = null, comp = null, verb = null, noiseBuf = null;
  let a4 = 440;
  const active = new Set();          // { nodes: [], g: GainNode, end: number, midi }
  let timers = [];

  /* ---- iPhone: Web Audio is muted by the ring/silent switch unless a media element plays; a looping silent clip
     moves the page onto the media channel (same trick as Shed / Changes). ---- */
  let unmuteEl = null;
  function unmuteIOS() {
    if (unmuteEl) return;
    try {
      unmuteEl = document.createElement('audio'); unmuteEl.setAttribute('playsinline', ''); unmuteEl.loop = true; unmuteEl.volume = 0.01;
      const n = 800, buf = new Uint8Array(44 + n); const dv = new DataView(buf.buffer);
      const str = (o, t) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
      str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); str(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
      unmuteEl.src = 'data:audio/wav;base64,' + btoa(String.fromCharCode.apply(null, buf));
      const p = unmuteEl.play(); if (p && p.catch) p.catch(() => { });
    } catch (e) { /* best effort */ }
  }

  function impulse(seconds, decay) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds); const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let seed = 7 + ch; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; const r = seed / 2147483647 * 2 - 1; d[i] = r * Math.pow(1 - i / len, decay) * 0.6; } }
    return buf;
  }
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ latencyHint: 'interactive' });
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.8;
      master.connect(comp); comp.connect(ctx.destination);
      try { verb = ctx.createConvolver(); verb.buffer = impulse(1.4, 2.6); const wet = ctx.createGain(); wet.gain.value = 0.12; master.connect(verb); verb.connect(wet); wet.connect(comp); } catch (e) { verb = null; }
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      unmuteIOS();
      if (PIANO.ready) pianoPreload();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    return ctx;
  }
  function now() { return ensure().currentTime; }
  function freq(m) { return E.midiToFreq(m, a4); }
  function setDetuneCents(c) { a4 = 440 * Math.pow(2, (c || 0) / 1200); }
  function getA4() { return a4; }

  function reg(nodes, g, end, midi) { const v = { nodes, g, end, midi }; active.add(v); const ms = Math.max(0, (end - ctx.currentTime) * 1000 + 400); const id = setTimeout(() => active.delete(v), ms); timers.push(id); return v; }
  function noise(t, dur, gainVal, hp) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = hp ? 'highpass' : 'bandpass'; f.frequency.value = hp || 2500; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(gainVal, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.02);
    return [src, f, g];
  }

  /* ================= Sampled piano (Salamander Grand) ================= */
  const PIANO = { meta: null, base: null, notes: [], cache: new Map(), ready: false, failed: false, loading: false, loaded: 0, total: 0 };
  async function pianoInit(base) {
    PIANO.base = base;
    try {
      const r = await fetch(base + 'index.json', { cache: 'force-cache' });
      if (!r.ok) throw new Error('no index');
      PIANO.meta = await r.json(); PIANO.notes = Object.keys(PIANO.meta).map(Number).sort((a, b) => a - b); PIANO.ready = true;
      if (ctx) pianoPreload();
      return true;
    } catch (e) { PIANO.failed = true; return false; }
  }
  const nearestSample = midi => { let best = PIANO.notes[0]; for (const n of PIANO.notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n; return best; };
  function pianoBuffer(sm, layer) {
    const key = sm + ':' + layer; if (PIANO.cache.has(key)) return PIANO.cache.get(key);
    const p = (async () => {
      const r = await fetch(PIANO.base + PIANO.meta[sm].layers[layer]); const ab = await r.arrayBuffer();
      const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
      PIANO.loaded++; return buf;
    })();
    PIANO.cache.set(key, p); p.catch(() => PIANO.cache.delete(key)); return p;
  }
  const decoded = new Map(); // key → AudioBuffer once resolved
  function layersAvailable(sm) { return Object.keys(PIANO.meta[sm].layers).sort(); }
  // Load the middle layer for the whole playing range first (fast first sound), then the soft and loud layers.
  async function pianoPreload(lo = 33, hi = 96) {
    if (!PIANO.ready || PIANO.loading || !ctx) return; PIANO.loading = true;
    const need = new Set(); for (let m = lo; m <= hi; m++) need.add(nearestSample(m));
    const order = ['10', '06', '14'];
    PIANO.total = need.size * order.length;
    for (const layer of order) {
      await Promise.all([...need].map(sm => PIANO.meta[sm].layers[layer] ? pianoBuffer(sm, layer).then(b => decoded.set(sm + ':' + layer, b)).catch(() => null) : null));
    }
    PIANO.loading = false;
  }
  function layerMix(sm, vel) {
    const ls = layersAvailable(sm).filter(l => decoded.has(sm + ':' + l));
    if (!ls.length) return null;
    const pos = { '06': 0.3, '10': 0.62, '14': 0.9 };
    if (ls.length === 1) return [[ls[0], 1]];
    const pts = ls.map(l => [l, pos[l] ?? 0.6]).sort((a, b) => a[1] - b[1]);
    if (vel <= pts[0][1]) return [[pts[0][0], 1]]; if (vel >= pts[pts.length - 1][1]) return [[pts[pts.length - 1][0], 1]];
    for (let i = 0; i < pts.length - 1; i++) if (vel >= pts[i][1] && vel <= pts[i + 1][1]) { const f = (vel - pts[i][1]) / (pts[i + 1][1] - pts[i][1]); return [[pts[i][0], Math.cos(f * Math.PI / 2)], [pts[i + 1][0], Math.sin(f * Math.PI / 2)]]; }
    return [[pts[0][0], 1]];
  }
  function voiceSampled(m, t, dur, vel) {
    const sm = nearestSample(m); const mix = layerMix(sm, vel);
    if (!mix) { if (!PIANO.loading) pianoPreload(); return voicePianoSynth(m, t, dur, vel); }
    const g = ctx.createGain(); const peak = 0.5 + 0.5 * vel; const end = t + dur;
    g.gain.setValueAtTime(peak, t); g.gain.setValueAtTime(peak, end); g.gain.exponentialRampToValueAtTime(0.001, end + 0.28);
    const tune = (PIANO.meta[sm].tune || 0) / 1200;
    const rate = Math.pow(2, (m - sm) / 12 + tune) * (a4 / 440);
    const srcs = mix.map(([l, w]) => { const src = ctx.createBufferSource(); src.buffer = decoded.get(sm + ':' + l); src.playbackRate.value = rate; const lg = ctx.createGain(); lg.gain.value = w; src.connect(lg); lg.connect(g); src.start(Math.max(t, ctx.currentTime)); src.stop(end + 0.5); return src; });
    g.connect(master);
    return reg(srcs, g, end + 0.35, m);
  }
  function pianoStatus() { return PIANO.failed ? 'synth' : PIANO.ready ? (decoded.size ? 'sampled' : 'loading') : 'none'; }

  /* ================= Synthesized timbres ================= */
  function voiceEP(m, t, dur, vel) {
    const f = freq(m);
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
    const mg = ctx.createGain();
    const idx = f * (1.6 + 1.2 * vel) * (m > 72 ? 0.6 : 1);
    mg.gain.setValueAtTime(idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.12), t + 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = Math.min(f * 7, 9000);
    const tg = ctx.createGain(); tg.gain.setValueAtTime(0.05 * vel, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    tine.connect(tg);
    const g = ctx.createGain();
    const peak = 0.5 * vel;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.setTargetAtTime(peak * 0.35, t + 0.02, 0.9);
    const rel = 0.22; const end = t + dur;
    g.gain.setTargetAtTime(0.0001, end, rel / 4);
    car.connect(g); tg.connect(g); g.connect(master);
    car.start(t); mod.start(t); tine.start(t);
    car.stop(end + rel + 0.1); mod.stop(end + rel + 0.1); tine.stop(t + 0.3);
    return reg([car, mod, tine], g, end + rel, m);
  }
  function voicePianoSynth(m, t, dur, vel) {
    const f = freq(m); const nodes = []; const g = ctx.createGain(); g.connect(master);
    const amps = [1, 0.5, 0.3, 0.2, 0.12, 0.07, 0.04];
    const peak = 0.42 * vel;
    g.gain.setValueAtTime(peak, t);
    const end = t + dur, rel = 0.18;
    g.gain.setTargetAtTime(0.0001, end, rel / 4);
    for (let k = 1; k <= amps.length; k++) {
      if (f * k > 12000) break;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = f * k * (1 + 0.00025 * k * k);
      const og = ctx.createGain();
      const a = amps[k - 1] * (k > 1 && m > 72 ? 0.6 : 1);
      og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(a, t + 0.004);
      og.gain.setTargetAtTime(a * 0.001, t + 0.004, 1.5 / Math.pow(k, 0.9));
      o.connect(og); og.connect(g); o.start(t); o.stop(end + rel + 0.1); nodes.push(o, og);
    }
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 1.002;
    const og2 = ctx.createGain(); og2.gain.setValueAtTime(0.25, t); og2.gain.setTargetAtTime(0.0001, t + 0.004, 1.4);
    o2.connect(og2); og2.connect(g); o2.start(t); o2.stop(end + rel + 0.1); nodes.push(o2);
    nodes.push(...noise(t, 0.03, 0.12 * vel, 1800));
    return reg(nodes, g, end + rel, m);
  }
  function voicePad(m, t, dur, vel) {
    const f = freq(m);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f; o1.detune.value = -6;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; o2.detune.value = 6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(Math.min(2400, f * 6), t + 0.15); lp.frequency.setTargetAtTime(Math.min(1300, f * 4), t + 0.3, 0.6);
    const g = ctx.createGain(); const peak = 0.16 * vel; const end = t + dur, rel = 0.35;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.12);
    g.gain.setTargetAtTime(0.0001, end, rel / 4);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    o1.start(t); o2.start(t); o1.stop(end + rel + 0.2); o2.stop(end + rel + 0.2);
    return reg([o1, o2, lp], g, end + rel, m);
  }
  function voiceSine(m, t, dur, vel) {
    const f = freq(m);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const g2 = ctx.createGain(); g2.gain.value = 0.08;
    const g = ctx.createGain(); const peak = 0.4 * vel; const end = t + dur, rel = 0.15;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.setTargetAtTime(peak * 0.7, t + 0.1, 0.5);
    g.gain.setTargetAtTime(0.0001, end, rel / 4);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(end + rel + 0.1); o2.stop(end + rel + 0.1);
    return reg([o, o2], g, end + rel, m);
  }
  function voiceRhythm(t, dur, accent) {
    const g = ctx.createGain(); g.connect(master);
    const peak = accent ? 0.55 : 0.42; const end = t + dur;
    g.gain.setValueAtTime(peak, t);
    g.gain.setTargetAtTime(peak * 0.25, t + 0.01, Math.min(0.6, Math.max(0.12, dur * 0.5)));
    g.gain.setTargetAtTime(0.0001, end, 0.012);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 660;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1320;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.25, t); g2.gain.setTargetAtTime(0.0001, t, 0.08);
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(end + 0.1); o2.stop(end + 0.1);
    const n = noise(t, 0.012, 0.3, 3000);
    return reg([o, o2, ...n], g, end + 0.1);
  }
  function click(t, accent) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = accent ? 2000 : 1400;
    const g = ctx.createGain(); g.gain.setValueAtTime(accent ? 0.5 : 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.05);
    noise(t, 0.01, accent ? 0.35 : 0.2, 4000);
  }

  function voicePiano(m, t, dur, vel) { return (PIANO.ready && !PIANO.failed) ? voiceSampled(m, t, dur, vel) : voicePianoSynth(m, t, dur, vel); }
  const TIMBRES = { piano: voicePiano, ep: voiceEP, pad: voicePad, sine: voiceSine };
  const TIMBRE_NAMES = { piano: 'Grand piano', ep: 'Electric piano', pad: 'Pad', sine: 'Pure tone' };

  function playNote(m, t, dur, vel, timbre) {
    ensure(); const fn = TIMBRES[timbre] || voicePiano;
    return fn(m, t, dur, vel === undefined ? 0.8 : vel);
  }

  /* ---- scheduler ----
     events: [{at, dur, notes:[midi], vel, timbre, kind:'note'|'click'|'rhythm', accent}] (times in seconds, relative) */
  function playScore(events, opts) {
    ensure(); opts = opts || {};
    const t0 = ctx.currentTime + (opts.lead || 0.08);
    let endT = 0;
    for (const ev of events) {
      const t = t0 + ev.at;
      if (ev.kind === 'click') { click(t, ev.accent); endT = Math.max(endT, ev.at + 0.05); continue; }
      if (ev.kind === 'rhythm') { voiceRhythm(t, ev.dur, ev.accent); endT = Math.max(endT, ev.at + ev.dur); continue; }
      const notes = ev.notes || [ev.note];
      const vel = (ev.vel === undefined ? 0.8 : ev.vel) / Math.sqrt(Math.max(1, notes.length - 1) * 0.35 + 1);
      for (const n of notes) playNote(n, t, ev.dur, vel, ev.timbre || opts.timbre);
      endT = Math.max(endT, ev.at + ev.dur);
    }
    const p = new Promise(res => { const id = setTimeout(res, (endT + (opts.tail === undefined ? 0.25 : opts.tail)) * 1000); timers.push(id); });
    return { promise: p, t0, end: t0 + endT, stop: stopAll };
  }

  function stopAll() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const v of active) {
      try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0.0001, t + 0.04); } catch (e) { }
      for (const n of v.nodes) { try { if (n.stop) n.stop(t + 0.06); } catch (e) { } }
    }
    active.clear();
    timers.forEach(clearTimeout); timers = [];
  }
  function seqNotes(midis, step, dur, timbre, vel) {
    return midis.map((m, i) => ({ at: i * step, dur: dur || step * 0.95, notes: Array.isArray(m) ? m : [m], timbre, vel }));
  }

  Object.assign(E, {
    Audio: { ensure, now, setDetuneCents, getA4, playNote, playScore, stopAll, seqNotes, TIMBRES, TIMBRE_NAMES, pianoInit, pianoPreload, pianoStatus, PIANO, unmuteIOS, get ctx() { return ctx; }, getContext: () => ensure() }
  });
})(window.EARS = window.EARS || {});
