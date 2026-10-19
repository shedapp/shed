// audio.js — one real piano (Salamander Grand: a compact embedded set, or the full set when hosted next to piano/),
// a progression player, and the two ears: Web MIDI and the microphone chroma recognizer.
const Audio = (() => {
  const T = typeof Theory !== 'undefined' ? Theory : null;
  const mod = (n, m) => ((n % m) + m) % m;
  let ctx = null;
  let master = null, verb = null;
  const SOUND = { tone: 'grand' }; // 'grand' | 'ep'
  // iPhone mutes Web Audio while the ring/silent switch is on, unless a media element is playing: a looping silent
  // clip moves the page onto the media channel. Harmless everywhere else.
  let unmuteEl = null;
  function unmuteIOS() {
    if (unmuteEl) return;
    try {
      unmuteEl = document.createElement('audio'); unmuteEl.setAttribute('playsinline', ''); unmuteEl.loop = true; unmuteEl.volume = 0.01;
      // 0.1 s of silence, 8 kHz mono WAV
      const n = 800, buf = new Uint8Array(44 + n); const dv = new DataView(buf.buffer);
      const str = (o, t) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
      str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); str(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
      let b64 = ''; const bin = String.fromCharCode.apply(null, buf); b64 = btoa(bin);
      unmuteEl.src = 'data:audio/wav;base64,' + b64;
      const p = unmuteEl.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) { /* best effort */ }
  }
  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.knee.value = 10; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination); // the dry path first: nothing below may ever leave the output unconnected
    try { // a small room: short synthetic impulse at the context's own sample rate
      verb = ctx.createConvolver(); verb.buffer = impulse(1.6, 2.4); const wet = ctx.createGain(); wet.gain.value = 0.16;
      master.connect(verb).connect(wet).connect(comp);
    } catch (e) { verb = null; }
    return ctx;
  }
  function impulse(seconds, decay) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds); const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let seed = 7 + ch; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; const r = seed / 2147483647 * 2 - 1; d[i] = r * Math.pow(1 - i / len, decay) * 0.6; } }
    return buf;
  }

  // ---------- Piano ----------
  const PIANO = { meta: null, base: null, embedded: null, cache: new Map(), notes: [], ready: false, failed: false, source: 'none' };
  async function pianoInit(opts = {}) {
    PIANO.base = opts.base || null; PIANO.embedded = opts.embedded || null;
    if (PIANO.base) {
      try { const r = await fetch(PIANO.base + 'index.json', { cache: 'force-cache' }); if (r.ok) { PIANO.meta = await r.json(); PIANO.notes = Object.keys(PIANO.meta).map(Number).sort((a, b) => a - b); PIANO.source = 'hosted'; PIANO.ready = true; return 'hosted'; } } catch (e) { /* fall through */ }
    }
    if (PIANO.embedded) { PIANO.meta = {}; for (const k of Object.keys(PIANO.embedded)) PIANO.meta[k] = { tune: PIANO.embedded[k].tune, layers: { '10': k } }; PIANO.notes = Object.keys(PIANO.meta).map(Number).sort((a, b) => a - b); PIANO.source = 'embedded'; PIANO.ready = true; return 'embedded'; }
    PIANO.failed = true; PIANO.source = 'synth'; return 'synth';
  }
  const nearestSample = (midi) => { let best = PIANO.notes[0]; for (const n of PIANO.notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n; return best; };
  function pianoBuffer(sampleMidi, layer) {
    const key = sampleMidi + ':' + layer; if (PIANO.cache.has(key)) return PIANO.cache.get(key);
    const p = (async () => {
      let ab;
      if (PIANO.source === 'embedded') { const b64 = PIANO.embedded[String(sampleMidi)].b64; const bin = atob(b64); ab = new ArrayBuffer(bin.length); const u = new Uint8Array(ab); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); }
      else { const r = await fetch(PIANO.base + PIANO.meta[sampleMidi].layers[layer]); ab = await r.arrayBuffer(); }
      return await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
    })();
    PIANO.cache.set(key, p); p.catch(() => PIANO.cache.delete(key)); return p;
  }
  function layerFor(vel) { if (PIANO.source !== 'hosted') return '10'; return vel < 0.4 ? '06' : vel < 0.75 ? '10' : '14'; }
  async function pianoPreload(lo = 36, hi = 84) {
    ensureCtx(); if (!PIANO.ready) return false;
    const need = new Set(); for (let m = lo; m <= hi; m++) need.add(nearestSample(m));
    await Promise.all([...need].map(n => pianoBuffer(n, '10').catch(() => null)));
    return true;
  }
  // Play one note: vel 0..1, dur seconds held, when = ctx time
  function playTone(midi, dur, when, vel = 0.6) {
    ensureCtx(); const t0 = when || ctx.currentTime;
    if (SOUND.tone === 'ep') return epTone(midi, dur, t0, vel);
    if (!PIANO.ready || PIANO.failed) return synthTone(midi, dur, t0, vel);
    const sm = nearestSample(midi), layer = layerFor(vel);
    const cached = PIANO.cache.get(sm + ':' + layer);
    if (!cached) { pianoBuffer(sm, layer).catch(() => {}); return synthTone(midi, dur, t0, vel); }
    cached.then(buf => {
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = Math.pow(2, (midi - sm) / 12 + ((PIANO.meta[sm] && PIANO.meta[sm].tune) || 0) / 1200);
      const g = ctx.createGain(); const peak = PIANO.source === 'hosted' ? 0.9 : 0.35 + 0.6 * vel;
      g.gain.setValueAtTime(peak, t0); g.gain.setValueAtTime(peak, t0 + dur); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur + 0.45);
      src.connect(g).connect(master); src.start(Math.max(t0, ctx.currentTime)); src.stop(t0 + dur + 0.5);
    }).catch(() => synthTone(midi, dur, t0, vel));
  }
  // Electric piano: two-operator FM (a tine over a warm fundamental), a quick hammer click, a slow tremolo.
  // Modeled on the classic suitcase sound rather than a preset: the modulation index falls fast so the attack
  // barks and the sustain goes glassy, bass notes get more body, top notes get more bell.
  function epTone(midi, dur, t0, vel = 0.6) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const out = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600 + 2600 * vel; lp.Q.value = 0.4;
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f; // 1:1 ratio: the tine's bark
    const mg = ctx.createGain(); const idx = f * (0.7 + 2.2 * vel * vel) * (midi < 52 ? 1.35 : midi > 76 ? 0.7 : 1);
    mg.gain.setValueAtTime(idx, t0); mg.gain.exponentialRampToValueAtTime(idx * 0.07, t0 + 0.22 + 0.18 * vel); mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.025), t0 + dur + 0.3);
    mod.connect(mg).connect(car.frequency);
    // a second, faintly detuned voice gives the chorus-y width of a real tine over its pickup
    const car2 = ctx.createOscillator(); car2.type = 'sine'; car2.frequency.value = f * 1.0012; const g2 = ctx.createGain(); g2.gain.value = 0.35; mod.connect(mg); car2.connect(g2);
    const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = f * 7; const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.09 * vel * (midi > 72 ? 0.5 : 1), t0); tg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.09);
    const bell = ctx.createOscillator(); bell.type = 'sine'; bell.frequency.value = f * 4; const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.05 * vel, t0); bg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.6 + 0.4 * vel);
    const amp = ctx.createGain(); const a = 0.28 * (0.45 + 0.55 * vel) * (midi < 48 ? 0.8 : 1);
    amp.gain.setValueAtTime(0, t0); amp.gain.linearRampToValueAtTime(a, t0 + 0.004); amp.gain.exponentialRampToValueAtTime(a * 0.55, t0 + 0.9); amp.gain.exponentialRampToValueAtTime(a * 0.25, t0 + Math.max(1.2, dur)); amp.gain.exponentialRampToValueAtTime(0.0005, t0 + dur + 0.35);
    // tremolo (suitcase vibrato), gentle
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6; const lg = ctx.createGain(); lg.gain.value = 0.10; const trem = ctx.createGain(); trem.gain.value = 1;
    lfo.connect(lg).connect(trem.gain);
    car.connect(amp); g2.connect(amp); tine.connect(tg).connect(amp); bell.connect(bg).connect(amp);
    amp.connect(lp).connect(trem).connect(out).connect(master); out.gain.value = 1;
    [car, car2, mod, tine, bell, lfo].forEach(o => { o.start(t0); o.stop(t0 + dur + 0.45); });
  }
  function synthTone(midi, dur, t0, vel = 0.6) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2; lp.type = 'lowpass'; lp.frequency.value = 1800 + 1200 * vel;
    const g2 = ctx.createGain(); g2.gain.value = 0.2; o2.connect(g2).connect(lp); o1.connect(lp); lp.connect(g).connect(master);
    const a = 0.12 + 0.2 * vel;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.012); g.gain.exponentialRampToValueAtTime(a * 0.4, t0 + Math.max(0.3, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur + 0.3);
    o1.start(t0); o2.start(t0); o1.stop(t0 + dur + 0.35); o2.stop(t0 + dur + 0.35);
  }
  // Play a voicing (array of MIDI notes) with a gentle roll
  function playNotes(notes, dur = 1.6, when, vel = 0.62, roll = 0.012) {
    ensureCtx(); unmuteIOS(); const t0 = when || ctx.currentTime + 0.02;
    notes.slice().sort((a, b) => a - b).forEach((n, i) => playTone(n, dur, t0 + i * roll, vel * (i === 0 ? 1.0 : 0.92)));
    return t0;
  }
  function setTone(t) { SOUND.tone = t === 'ep' ? 'ep' : 'grand'; }

  // ---------- Progression player ----------
  // items: [{notes: [midi], beats}] ; opts: {bpm, feel: 'hold'|'groove', loop, onChord(i), onEnd()}
  const PLAYER = { timer: null, playing: false, stopAt: 0, token: 0 };
  function play(items, opts = {}) {
    stop(true); ensureCtx(); unmuteIOS();
    const bpm = opts.bpm || 76, spb = 60 / bpm, feel = opts.feel || 'hold';
    const token = ++PLAYER.token; PLAYER.playing = true;
    const start = ctx.currentTime + 0.08;
    const schedule = (passStart, pass) => {
      let t = passStart;
      items.forEach((it, i) => {
        const dur = (it.beats || 4) * spb;
        const bass = it.notes.filter(n => n < 56), upper = it.notes.filter(n => n >= 56);
        if (feel === 'groove' && dur >= spb * 2) {
          // comp: a full hit on 1, lighter hits on the "and of 2" and on 4; bass on 1 and 3
          const hits = [[0, 0.78], [1.5, 0.42], [3, 0.5]].filter(h => h[0] * spb < dur - 0.05);
          hits.forEach(([b, v], k) => { playNotes(k === 0 ? it.notes : upper, Math.min(dur - b * spb, k === 0 ? dur : spb * 1.4), t + b * spb, v, k === 0 ? 0.014 : 0.008); });
          if (dur >= spb * 3.5) playNotes(bass, spb * 1.8, t + 2 * spb, 0.5, 0);
        } else playNotes(it.notes, dur - 0.04, t, 0.66);
        if (opts.onChord) { const at = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => { if (PLAYER.token === token) opts.onChord(i, pass); }, at); }
        t += dur;
      });
      return t;
    };
    let end = schedule(start, 0);
    if (opts.loop) {
      let pass = 1;
      PLAYER.timer = setInterval(() => { if (PLAYER.token !== token) return; if (ctx.currentTime > end - 0.6) { end = schedule(end, pass++); } }, 120);
    } else {
      const ms = (end - ctx.currentTime) * 1000 + 200;
      PLAYER.timer = setTimeout(() => { if (PLAYER.token === token) { PLAYER.playing = false; if (opts.onEnd) opts.onEnd(); } }, ms);
    }
  }
  function stop(silent) {
    const was = PLAYER.playing;
    if (PLAYER.timer) { clearInterval(PLAYER.timer); clearTimeout(PLAYER.timer); PLAYER.timer = null; }
    PLAYER.token++; PLAYER.playing = false;
    // soften anything already ringing by dipping the master briefly (only when something was actually playing)
    if (was && !silent && master && ctx) { const g = master.gain; const now = ctx.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.12); g.setValueAtTime(0.9, now + 0.2); }
  }

  // ---------- MIDI ----------
  const MIDI = { access: null, inputs: [], held: new Map(), pedal: false, sustained: new Set(), onChord: null, onLive: null, onStatus: null, current: null, currentSince: 0, timer: null, active: false };
  async function midiStart(handlers = {}) {
    Object.assign(MIDI, handlers);
    if (!navigator.requestMIDIAccess) { MIDI.onStatus && MIDI.onStatus({ ok: false, reason: 'unsupported' }); return false; }
    try {
      MIDI.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (e) { MIDI.onStatus && MIDI.onStatus({ ok: false, reason: 'denied' }); return false; }
    const hook = () => {
      MIDI.inputs = [...MIDI.access.inputs.values()];
      MIDI.inputs.forEach(inp => { inp.onmidimessage = onMidi; });
      MIDI.onStatus && MIDI.onStatus({ ok: true, inputs: MIDI.inputs.map(i => i.name) });
    };
    MIDI.access.onstatechange = hook; hook(); MIDI.active = true;
    return true;
  }
  function midiStop() { if (MIDI.access) MIDI.inputs.forEach(i => i.onmidimessage = null); MIDI.active = false; MIDI.held.clear(); MIDI.sustained.clear(); }
  function onMidi(e) {
    const [st, d1, d2] = e.data; const type = st & 0xf0;
    if (type === 0x90 && d2 > 0) { MIDI.held.set(d1, d2); MIDI.sustained.add(d1); evalMidi(true); }
    else if (type === 0x80 || (type === 0x90 && d2 === 0)) { MIDI.held.delete(d1); if (!MIDI.pedal) MIDI.sustained.delete(d1); evalMidi(false); }
    else if (type === 0xb0 && d1 === 64) { const down = d2 >= 64; if (MIDI.pedal && !down) { MIDI.sustained = new Set(MIDI.held.keys()); } MIDI.pedal = down; evalMidi(false); }
  }
  function evalMidi(onset) {
    clearTimeout(MIDI.timer);
    MIDI.timer = setTimeout(() => {
      const notes = [...(MIDI.pedal ? MIDI.sustained : MIDI.held.keys())];
      if (notes.length >= 2) {
        const id = T.identify(notes);
        if (id) {
          const label = `${id.root}:${id.q}:${id.bass ?? ''}`;
          const now = performance.now();
          if (!MIDI.current || MIDI.current.label !== label) {
            // commit the previous chord if it lived long enough
            if (MIDI.current && now - MIDI.currentSince > 250 && MIDI.onChord) MIDI.onChord(MIDI.current.chord, now - MIDI.currentSince);
            MIDI.current = { label, chord: Object.assign({}, id, { notes: notes.slice().sort((a, b) => a - b) }) }; MIDI.currentSince = now;
          }
          MIDI.onLive && MIDI.onLive(MIDI.current.chord, notes);
        }
      } else if (notes.length === 0 && MIDI.current) {
        const now = performance.now();
        if (now - MIDI.currentSince > 250 && MIDI.onChord) MIDI.onChord(MIDI.current.chord, now - MIDI.currentSince);
        MIDI.current = null; MIDI.onLive && MIDI.onLive(null, []);
      }
    }, onset ? 70 : 40);
  }

  // ---------- Microphone: chroma template matching ----------
  const MIC = { stream: null, analyser: null, src: null, raf: null, active: false, chroma: new Float32Array(12), bass: new Float32Array(12), ema: new Float32Array(12), emaBass: new Float32Array(12), onFrame: null, onChord: null, onLive: null, current: null, currentSince: 0, votes: {}, lastLabel: null, lastCount: 0, level: -100, silentSince: 0 };
  const MIC_Q = ['maj', 'min', '7', 'maj7', 'm7', 'dim', 'dim7', 'm7b5', 'sus4', 'sus2', 'aug', '6', 'm6', 'add9', 'm9', 'maj9', '9', '7sus4', 'mMaj7'];
  const TPL = (() => {
    const out = [];
    const W = { 0: 1.0, 3: 0.95, 4: 0.95, 5: 0.75, 2: 0.6, 7: 0.55, 6: 0.8, 8: 0.8, 9: 0.75, 10: 0.85, 11: 0.85, 1: 0.55 };
    for (let root = 0; root < 12; root++) for (const q of MIC_Q) {
      const t = new Float32Array(12); let norm = 0;
      for (const iv of T.Q[q].iv) { const ic = mod(iv, 12); const w = iv >= 12 ? 0.5 : (W[ic] || 0.6); t[mod(root + ic, 12)] = Math.max(t[mod(root + ic, 12)], w); }
      for (let i = 0; i < 12; i++) norm += t[i] * t[i];
      out.push({ root, q, t, norm: Math.sqrt(norm), size: T.Q[q].iv.length });
    }
    return out;
  })();
  async function micStart(handlers = {}) {
    Object.assign(MIC, handlers);
    ensureCtx();
    try {
      MIC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    } catch (e) { return { ok: false, reason: e && e.name === 'NotAllowedError' ? 'denied' : 'unavailable', error: e }; }
    MIC.src = ctx.createMediaStreamSource(MIC.stream);
    MIC.analyser = ctx.createAnalyser(); MIC.analyser.fftSize = 8192; MIC.analyser.smoothingTimeConstant = 0.55;
    MIC.src.connect(MIC.analyser);
    MIC.active = true; MIC.current = null; MIC.ema.fill(0); MIC.emaBass.fill(0); MIC.lastLabel = null; MIC.lastCount = 0; MIC.silentSince = 0;
    const freq = new Float32Array(MIC.analyser.frequencyBinCount);
    const time = new Float32Array(2048);
    const sr = ctx.sampleRate, N = MIC.analyser.fftSize;
    const binOf = (f) => Math.round(f * N / sr);
    let last = 0;
    const loop = () => {
      if (!MIC.active) return;
      MIC.raf = requestAnimationFrame(loop);
      const now = performance.now(); if (now - last < 55) return; last = now;
      MIC.analyser.getFloatFrequencyData(freq);
      MIC.analyser.getFloatTimeDomainData(time);
      let rms = 0; for (let i = 0; i < time.length; i++) rms += time[i] * time[i]; rms = Math.sqrt(rms / time.length); MIC.level = 20 * Math.log10(rms + 1e-9);
      // pitch salience over C2..C7 with harmonic summation; fold to chroma; a separate bass chroma from C2..G3
      const chroma = MIC.chroma, bass = MIC.bass; chroma.fill(0); bass.fill(0);
      const mag = (bin) => { if (bin < 1 || bin >= freq.length - 1) return 0; const db = Math.max(freq[bin - 1], freq[bin], freq[bin + 1]); return db < -100 ? 0 : Math.pow(10, db / 20); };
      const HW = [1.0, 0.55, 0.35, 0.25, 0.18];
      for (let m = 36; m <= 96; m++) {
        const f0 = 440 * Math.pow(2, (m - 69) / 12);
        let s = 0; for (let h = 1; h <= 5; h++) s += HW[h - 1] * mag(binOf(f0 * h));
        const pc = mod(m, 12);
        const octW = m < 48 ? 1.15 : m > 84 ? 0.6 : 1.0;
        chroma[pc] += s * octW;
        if (m <= 55) bass[pc] += s * (m <= 48 ? 1.2 : 0.8);
      }
      let mx = 0; for (let i = 0; i < 12; i++) mx = Math.max(mx, chroma[i]); if (mx > 0) for (let i = 0; i < 12; i++) chroma[i] /= mx;
      let bx = 0; for (let i = 0; i < 12; i++) bx = Math.max(bx, bass[i]); if (bx > 0) for (let i = 0; i < 12; i++) bass[i] /= bx;
      const quiet = MIC.level < -58 || mx === 0;
      const a = quiet ? 0.5 : 0.35;
      for (let i = 0; i < 12; i++) { MIC.ema[i] = MIC.ema[i] * (1 - a) + (quiet ? 0 : chroma[i]) * a; MIC.emaBass[i] = MIC.emaBass[i] * (1 - a) + (quiet ? 0 : bass[i]) * a; }
      let best = null;
      if (!quiet) best = matchChroma(MIC.ema, MIC.emaBass);
      MIC.onFrame && MIC.onFrame({ chroma: MIC.ema, level: MIC.level, best, quiet });
      // temporal logic: a label must win 3 frames in a row to become current; current commits when replaced or on silence
      const label = best && best.conf > 0.08 ? `${best.root}:${best.q}:${best.bass ?? ''}` : null;
      if (label && label === MIC.lastLabel) MIC.lastCount++; else { MIC.lastLabel = label; MIC.lastCount = 1; }
      if (quiet) { if (!MIC.silentSince) MIC.silentSince = now; } else MIC.silentSince = 0;
      if (label && MIC.lastCount >= 3 && (!MIC.current || MIC.current.label !== label)) {
        if (MIC.current && now - MIC.currentSince > 350 && MIC.onChord) MIC.onChord(MIC.current.chord, now - MIC.currentSince);
        MIC.current = { label, chord: { root: best.root, q: best.q, bass: best.bass, conf: best.conf } }; MIC.currentSince = now;
        MIC.onLive && MIC.onLive(MIC.current.chord);
      } else if (MIC.current && MIC.silentSince && now - MIC.silentSince > 500) {
        if (now - MIC.currentSince > 350 && MIC.onChord) MIC.onChord(MIC.current.chord, now - MIC.currentSince);
        MIC.current = null; MIC.onLive && MIC.onLive(null);
      }
    };
    MIC.raf = requestAnimationFrame(loop);
    return { ok: true };
  }
  function matchChroma(ch, bass) {
    let n = 0; for (let i = 0; i < 12; i++) n += ch[i] * ch[i]; n = Math.sqrt(n) || 1;
    let bassPc = -1, bm = 0; for (let i = 0; i < 12; i++) if (bass[i] > bm) { bm = bass[i]; bassPc = i; }
    if (bm < 0.5) bassPc = -1;
    let best = null, second = 0;
    for (const tp of TPL) {
      let dot = 0, outside = 0;
      for (let i = 0; i < 12; i++) { if (tp.t[i] > 0) dot += ch[i] * tp.t[i]; else outside += ch[i]; }
      let s = dot / (n * tp.norm) - 0.22 * outside / n;
      s -= tp.size * 0.012; // prefer the simplest chord that explains the energy
      if (bassPc >= 0) { if (bassPc === tp.root) s += 0.08; else if (tp.t[bassPc] > 0) s += 0.02; else s -= 0.05; }
      if (!best || s > best.s) { if (best) second = best.s; best = { s, root: tp.root, q: tp.q }; } else if (s > second) second = s;
    }
    if (!best) return null;
    const bassOut = (bassPc >= 0 && bassPc !== best.root && TPL.find(t => t.root === best.root && t.q === best.q).t[bassPc] > 0) ? bassPc : null;
    return { root: best.root, q: best.q, bass: bassOut, conf: Math.max(0, best.s - second), score: best.s };
  }
  function micStop() {
    MIC.active = false; if (MIC.raf) cancelAnimationFrame(MIC.raf);
    if (MIC.current && MIC.onChord && performance.now() - MIC.currentSince > 350) MIC.onChord(MIC.current.chord, performance.now() - MIC.currentSince);
    MIC.current = null;
    if (MIC.stream) MIC.stream.getTracks().forEach(t => t.stop());
    if (MIC.src) try { MIC.src.disconnect(); } catch (e) {}
    MIC.stream = null;
  }

  return { ensureCtx, unmuteIOS, setTone, SOUND, get ctx() { return ctx; }, pianoInit, pianoPreload, playTone, playNotes, play, stop, PLAYER, PIANO, midiStart, midiStop, MIDI, micStart, micStop, MIC, matchChroma };
})();
if (typeof module !== 'undefined') module.exports = Audio;
