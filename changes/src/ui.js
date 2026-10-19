// ui.js — the app. Four screens (Listen, Ideas, Song, Circle), settings, onboarding, local storage.
(() => {
  const T = Theory, M = Mood, R = Reharm, V = Voicing, A = Audio;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const BUILD = 'v0.7.3';

  // ---------- state ----------
  const DEFAULTS = { symbols: 'plain', twoHands: false, span: 'default', sound: true, tone: 'grand', feel: 'hold', bpm: 76, look: 'night', fingers: false, instrument: 'piano', styles: ['neosoul', 'gospel'] };
  const S = {
    key: { tonic: 0, mode: 'major' }, keyLocked: false,
    prog: [], captured: [],
    style: 'neosoul', depth: 2, mood: null, dare: false,
    options: [], openCard: -1, shadow: null,
    songs: [], songId: null,
    settings: Object.assign({}, DEFAULTS), onboarded: false,
    inputMode: 'mic', padQ: 'tri', anyRoot: 0, anyQ: 'maj', circleMode: 'major', tab: 'listen',
    take: null, melodyLock: true,
  };
  const STORE = 'changes.v1';
  function save() {
    const sg = currentSong(); if (sg) sg.updated = Date.now();
    try { localStorage.setItem(STORE, JSON.stringify({ key: S.key, prog: S.prog, style: S.style, depth: S.depth, songs: S.songs, songId: S.songId, settings: S.settings, onboarded: S.onboarded, inputMode: S.inputMode, padQ: S.padQ, take: S.take })); } catch (e) { /* storage may be unavailable */ }
    if (typeof Sync !== 'undefined') Sync.schedulePush(() => S.songs);
  }
  function load() {
    try { const raw = localStorage.getItem(STORE); if (!raw) return; const d = JSON.parse(raw); ['key', 'prog', 'style', 'depth', 'songs', 'songId', 'onboarded', 'inputMode', 'padQ', 'take'].forEach(k => { if (d[k] !== undefined) S[k] = d[k]; }); if (d.settings) S.settings = Object.assign({}, DEFAULTS, d.settings); } catch (e) { /* ignore */ }
    if (!R.STYLES[S.style]) S.style = 'neosoul';
  }

  // ---------- small helpers ----------
  let toastT = null;
  function toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
  function sheet(html, onMount) {
    const host = $('sheetHost'); host.innerHTML = `<div class="sheetbg" id="sheetBg"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
    const bg = $('sheetBg'); bg.addEventListener('click', (e) => { if (e.target === bg) closeSheet(); });
    if (onMount) onMount(bg.querySelector('.sheet'));
    return bg;
  }
  function closeSheet() { $('sheetHost').innerHTML = ''; }
  const sym = (c, key) => T.chordSymbol(c, key || S.key, { style: S.settings.symbols });
  function chordInner(c, key) {
    const p = T.chordParts(c, key || S.key, { style: S.settings.symbols });
    return `<span class="root">${esc(p.root)}</span>${p.sfx ? `<span class="sfx">${esc(p.sfx)}</span>` : ''}${p.bass ? `<span class="bass">${esc(p.bass)}</span>` : ''}`;
  }
  function speak(c, key) {
    const k = key || S.key; const p = T.chordParts(c, k);
    const word = (n) => n.replace('♭', ' flat').replace('♯', ' sharp');
    return `${word(p.root)} ${T.Q[c.q].name}${p.bass ? ' over ' + word(p.bass) : ''}`;
  }
  function moodOf(c, key, i, prog) { const k = key || S.key; const a = T.analyze(c, k, prog ? prog[(i + 1) % prog.length] : null, prog ? prog[i - 1] : null); return M.chordMood(c, k, a, S.style); }
  function chipHTML(c, key, opts = {}) {
    const m = opts.mood || moodOf(c, key, opts.i, opts.prog);
    const beats = c.beats || 4; const dur = Math.min(1, beats / 4);
    const cls = ['chip', opts.cls || '', c.changed ? 'changed' : ''].join(' ').trim();
    const mel = c.melody && c.melody.length ? ` · melody ${c.melody.map(n => T.pcName(n % 12, key || S.key)).join(' ')}` : '';
    const unsure = c.conf != null && c.conf < 0.1 && c.alts && c.alts.length;
    return `<button class="${cls}${unsure ? ' unsure' : ''}" style="${M.vars(m)};--dur:calc((100% - 20px) * ${dur.toFixed(2)})" data-i="${opts.i ?? ''}" aria-label="${esc(speak(c, key))}${beats !== 4 ? ', ' + beats + ' beats' : ''}${esc(mel)}${unsure ? ', uncertain' : ''}" title="${esc(speak(c, key) + mel)}${unsure ? ' (uncertain — tap for other guesses)' : ''}">${chordInner(c, key)}${mel ? '<span class="mel" aria-hidden="true">♪</span>' : ''}${unsure ? '<span class="unsure-dot" aria-hidden="true"></span>' : ''}</button>`;
  }
  function gradientOf(prog, key) {
    const total = prog.reduce((a, c) => a + (c.beats || 4), 0); let acc = 0; const stops = [];
    prog.forEach((c, i) => { const m = moodOf(c, key, i, prog); const col = `hsl(${m.hue} ${Math.round(48 + 42 * m.tension)}% calc(${Math.round(46 + 24 * m.bright)}% + var(--lshift)))`; const a = acc / total * 100, b = (acc + (c.beats || 4)) / total * 100; stops.push(`${col} ${a.toFixed(1)}%`, `${col} ${b.toFixed(1)}%`); acc += (c.beats || 4); });
    return stops.join(',');
  }
  function unlockAudio() { try { A.ensureCtx(); A.unmuteIOS(); A.setTone(S.settings.tone); } catch (e) {} }
  function playChord(c, dur = 1.7) {
    if (!S.settings.sound) return; unlockAudio();
    const v = V.voiceProgression([c], S.key, S.style, { span: S.settings.span })[0];
    A.playNotes(v.all, dur);
  }
  // Split the take into two layers: the melodic line (top voice, kept note for note) and the comping rhythm
  // (when and how hard chords were struck). Options then play their own clean, voice-led chords in that rhythm
  // under that melody; no single played note is ever re-pitched.
  function takeLayers() {
    if (!S.take || !S.take.notes || !S.take.notes.length) return null;
    if (S.take.layers) return S.take.layers;
    const notes = S.take.notes.slice().sort((a, b) => a.at - b.at);
    // onset clusters (notes struck within 45 ms belong to one strike)
    const strikes = [];
    for (const n of notes) { const st = strikes[strikes.length - 1]; if (st && n.at - st.at < 45) st.notes.push(n); else strikes.push({ at: n.at, notes: [n] }); }
    const mel = new Set(); let lastMel = null;
    const soundingAt = (t, except) => notes.filter(o => !except.includes(o) && o.at <= t && o.at + o.dur > t && !mel.has(o));
    for (const st of strikes) {
      const sorted = st.notes.slice().sort((a, b) => a.n - b.n); const top = sorted[sorted.length - 1];
      const under = soundingAt(st.at, st.notes); const harmTop = under.length ? Math.max(...under.map(o => o.n)) : -1;
      if (sorted.length === 1) {
        // a lone note above the harmony, or one continuing a line just sung, is melody
        const cont = lastMel && st.at - (lastMel.at + lastMel.dur) < 700 && Math.abs(top.n - lastMel.n) <= 7;
        if (top.n > harmTop || (cont && top.n > harmTop - 3)) { mel.add(top); lastMel = top; }
      } else if (sorted.length >= 2) {
        // a chord struck with the melody on top: the top note is melody when it sits clear of the rest or continues the line
        const next = sorted[sorted.length - 2];
        const cont = lastMel && st.at - (lastMel.at + lastMel.dur) < 700 && Math.abs(top.n - lastMel.n) <= 7;
        if (top.n - next.n >= 5 || (cont && top.n - next.n >= 3)) { mel.add(top); lastMel = top; }
      }
    }
    const harmony = strikes.map(st => { const hn = st.notes.filter(n => !mel.has(n)); if (!hn.length) return null; return { at: st.at, n: hn.length, dur: Math.max(...hn.map(n => n.dur)), vel: hn.reduce((a, n) => a + n.v, 0) / hn.length, low: Math.min(...hn.map(n => n.n)), hi: Math.max(...hn.map(n => n.n)) }; }).filter(Boolean);
    const melody = notes.filter(n => mel.has(n));
    const harmNotes = notes.filter(n => !mel.has(n)).map(n => n.n).sort((a, b) => a - b);
    const center = harmNotes.length ? harmNotes[Math.floor(harmNotes.length / 2)] : null;
    const lows = harmony.filter(h => h.n >= 2).map(h => h.low).sort((a, b) => a - b); const low = lows.length ? lows[Math.floor(lows.length / 2)] : null;
    S.take.layers = { melody, harmony, center, low, t0: notes[0].at, t1: Math.max(...notes.map(n => n.at + n.dur)) };
    return S.take.layers;
  }
  function progItems(prog, key, style) {
    const L = S.settings.feel === 'asPlayed' ? takeLayers() : null;
    const spanned = S.prog.filter(c => c.span);
    const vs = V.voiceProgression(prog, key, style, { span: S.settings.span, center: L && L.center != null ? Math.max(58, Math.min(72, L.center + 4)) : undefined });
    if (!L || !spanned.length) return vs.map((v, i) => ({ notes: v.all, beats: prog[i].beats || 4 }));
    const t0 = Math.min(L.t0, ...spanned.map(c => c.span.start)), t1 = Math.max(L.t1, ...spanned.map(c => c.span.end));
    const totalBeats = prog.reduce((a, c) => a + (c.beats || 4), 0); const mpb = (t1 - t0) / totalBeats;
    const V127 = (v) => Math.min(1, 0.2 + v / 127 * 0.8);
    let b = 0;
    return vs.map((v, i) => {
      const c = prog[i]; const beats = c.beats || 4; const w0 = t0 + b * mpb, w1 = t0 + (b + beats) * mpb; b += beats;
      const first = i === 0, last = i === vs.length - 1;
      const inWin = (t) => (first || t >= w0 - 20) && (last || t < w1 - 20);
      const ev = [];
      // the player's comping rhythm with the option's voicing: full voicing for a chord strike, bass alone for a single low note
      const rh = v.rh.slice(); let lh = v.lh.slice();
      if (L.low != null && lh.length) { while (lh[0] < L.low - 6 && lh[lh.length - 1] + 12 < rh[0]) lh = lh.map(n => n + 12); while (lh[0] > L.low + 6 && lh[0] - 12 >= 28) lh = lh.map(n => n - 12); }
      const all = lh.concat(rh);
      for (const h of L.harmony) { if (!inWin(h.at)) continue; const notes = h.n >= 2 ? all : (h.low < (lh[0] || 60) + 7 ? [lh[0]] : rh); ev.push({ at: (h.at - w0) / mpb, dur: Math.max(0.08, h.dur / mpb), notes, vel: V127(h.vel) }); }
      // the melody, note for note
      for (const m of L.melody) { if (!inWin(m.at)) continue; ev.push({ at: (m.at - w0) / mpb, dur: Math.max(0.05, m.dur / mpb), notes: [m.n], vel: V127(Math.min(127, m.v + 6)) }); }
      const item = { notes: all, beats };
      if (ev.length) item.events = ev;
      return item;
    });
  }
  let playingCleanup = null;
  function playProg(prog, key, style, container, loop) {
    if (!S.settings.sound) { toast('Sound is off in settings'); return; }
    unlockAudio();
    if (A.PLAYER.playing) { A.stop(); if (playingCleanup) playingCleanup(); return; }
    // the take itself, note for note, when nothing in the progression was changed
    if (S.settings.feel === 'asPlayed' && S.take && S.take.notes && S.take.notes.length && prog === S.prog && !prog.some(c => c.changed) && prog.some(c => c.span)) {
      const chips = container ? [...container.querySelectorAll('.chip')] : [];
      const clear = () => chips.forEach(ch => ch.classList.remove('playing'));
      playingCleanup = () => { clear(); playingCleanup = null; updatePlayButtons(false); }; updatePlayButtons(true);
      A.playTake(S.take.notes, { onNote: (n) => { const i = prog.findIndex(c => c.span && n.at >= c.span.start - 30 && n.at < c.span.end); if (i >= 0 && chips[i] && !chips[i].classList.contains('playing')) { clear(); chips[i].classList.add('playing'); } }, onEnd: () => { if (playingCleanup) playingCleanup(); } });
      return;
    }
    const chips = container ? [...container.querySelectorAll('.chip')] : [];
    const clear = () => chips.forEach(ch => ch.classList.remove('playing'));
    playingCleanup = () => { clear(); playingCleanup = null; updatePlayButtons(false); };
    updatePlayButtons(true);
    A.play(progItems(prog, key, style), { bpm: S.settings.bpm, feel: S.settings.feel, loop, onChord: (i) => { clear(); if (chips[i]) chips[i].classList.add('playing'); if (chips[i]) setBrandHue(chips[i]); }, onEnd: () => { if (playingCleanup) playingCleanup(); } });
  }
  function updatePlayButtons(on) { document.querySelectorAll('[data-play]').forEach(b => { b.textContent = on ? '■ Stop' : b.dataset.play; }); }
  function setBrandHue(el) { const dot = $('brandDot'); if (el && el.style) { const h = el.style.getPropertyValue('--h'), s = el.style.getPropertyValue('--s'), l = el.style.getPropertyValue('--l'); if (h) dot.style.background = `hsl(${h} ${s} ${l})`; } }
  function resetBrandHue() { $('brandDot').style.background = ''; }

  // ---------- header ----------
  function renderKey() {
    $('keyLbl').textContent = T.keyShort(S.key) + (S.key.mode === 'minor' ? '' : '');
    $('padKey').textContent = T.keyName(S.key);
  }
  function keySheet() {
    const rows = ['major', 'minor'].map(mode => `<div class="field"><label>${mode}</label><div class="roots">${Array.from({ length: 12 }, (_, pc) => `<button data-pc="${pc}" data-mode="${mode}" class="${S.key.tonic === pc && S.key.mode === mode ? 'on' : ''}">${esc(mode === 'minor' ? T.MINOR_TONIC_NAME[pc] : T.MAJOR_TONIC_NAME[pc])}</button>`).join('')}</div></div>`).join('');
    sheet(`<h2>Key</h2><div class="hint">The key decides spelling, numerals and what counts as borrowed. ${S.prog.length ? 'Detected from your chords; set it yourself if it heard wrong.' : ''}</div>${rows}<div class="row"><button class="small ghost" id="keyAuto">Detect from the progression</button></div>`, (el) => {
      el.querySelectorAll('[data-pc]').forEach(b => b.addEventListener('click', () => { S.key = { tonic: +b.dataset.pc, mode: b.dataset.mode }; S.keyLocked = true; afterKeyChange(); closeSheet(); }));
      el.querySelector('#keyAuto').addEventListener('click', () => { S.keyLocked = false; detectKey(true); afterKeyChange(); closeSheet(); });
    });
  }
  function afterKeyChange() { renderKey(); renderHeard(); renderPad(); renderCircle(); if (S.tab === 'ideas') recompute(); save(); }
  function detectKey(force) { if (!S.prog.length || (S.keyLocked && !force)) return; const r = T.findKey(S.prog); S.key = r.key; }

  // ---------- tabs ----------
  function showTab(name) {
    S.tab = name;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    document.querySelectorAll('nav.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $('screen').scrollTop = 0;
    if (name === 'ideas') recompute();
    if (name === 'song') renderSong();
    if (name === 'circle') renderCircle();
    if (name !== 'listen') { if (A.MIC.active) stopMic(); }
  }
  document.querySelectorAll('nav.tabbar button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- LISTEN ----------
  function setInputMode(m) {
    S.inputMode = m;
    $('inputMode').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('micWrap').hidden = m !== 'mic'; $('midiWrap').hidden = m !== 'midi'; $('tapWrap').hidden = m !== 'tap';
    if (m !== 'mic' && A.MIC.active) stopMic();
    if (m !== 'midi' && A.MIDI.active) { A.midiStop(); $('midiLbl').textContent = 'MIDI'; $('midiLive').textContent = '—'; }
    if (m === 'midi' && !A.MIDI.active) startMidi();
    $('inputStatus').textContent = m === 'mic' ? '' : m === 'midi' ? '' : '';
    save();
  }
  $('inputMode').querySelectorAll('button').forEach(b => b.addEventListener('click', () => setInputMode(b.dataset.m)));

  // microphone
  function ringPaths() {
    const svg = $('ring'); let s = '';
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2 + 0.03, a1 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2 - 0.03;
      const r0 = 46, r1 = 49.5;
      const p = (r, a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
      s += `<path id="ring${i}" d="M ${p(r0, a0)} A ${r0} ${r0} 0 0 1 ${p(r0, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z" fill="var(--accent)" opacity="0.08"/>`;
    }
    svg.innerHTML = s;
  }
  const PC_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // ring laid out in fifths, like the circle
  function onMicFrame(f) {
    for (let i = 0; i < 12; i++) { const pc = PC_ORDER[i]; const v = f.chroma[pc]; const el = $('ring' + i); if (el) el.setAttribute('opacity', (0.08 + 0.85 * Math.min(1, v * v)).toFixed(2)); }
    $('liveSub').textContent = f.quiet ? 'listening…' : (f.best ? `${Math.round(Math.min(1, f.best.conf * 6) * 100)}% sure` : 'listening…');
  }
  function showLive(c) {
    const el = $('liveChord');
    if (!c) { el.textContent = '—'; return; }
    el.innerHTML = chordInner(c); const m = moodOf(c, S.key); el.style.color = M.css(m, 8);
    $('brandDot').style.background = M.css(m);
  }
  async function startMic() {
    unlockAudio(); $('listenLbl').textContent = 'Starting…';
    const r = await A.micStart({
      onFrame: onMicFrame,
      onLive: (c) => { showLive(c); },
      onChord: (c, ms) => { addChord(Object.assign({}, c, { beats: 4, ms, src: 'mic' })); },
    });
    if (!r.ok) {
      $('listenLbl').textContent = 'Listen'; $('liveChord').textContent = '—';
      const inFrame = window.top !== window.self;
      $('micHint').innerHTML = r.reason === 'denied'
        ? 'Microphone access was refused. Allow it in the browser\'s site settings, then try again — or use <b>Tap</b> or <b>MIDI</b>.'
        : (inFrame ? 'The microphone is not available inside this preview. Open the installed app (home screen) or the site in Safari or Chrome, or use <b>Tap</b> for now.' : 'No microphone found. Check the browser\'s permissions or use <b>Tap</b>.');
      return;
    }
    $('listenBtn').classList.add('listening'); $('listenLbl').textContent = 'Stop'; $('listenBtn').setAttribute('aria-label', 'Stop listening');
    $('brandDot').classList.add('live'); $('micHint').textContent = 'Play one chord at a time, let each ring. Tap again to stop.';
    updateHeardTitle();
  }
  function stopMic() {
    A.micStop(); $('listenBtn').classList.remove('listening'); $('listenLbl').textContent = 'Listen'; $('listenBtn').setAttribute('aria-label', 'Start listening');
    $('liveChord').textContent = '—'; $('liveSub').textContent = 'phone near the piano'; $('brandDot').classList.remove('live'); resetBrandHue();
    for (let i = 0; i < 12; i++) { const el = $('ring' + i); if (el) el.setAttribute('opacity', '0.08'); }
    $('micHint').textContent = 'Play 4 to 8 bars, clearly, one chord at a time. Then stop and fix anything it misheard.';
    finalizeDurations(); updateHeardTitle();
  }
  $('listenBtn').addEventListener('click', () => { if (A.MIC.active) stopMic(); else startMic(); });

  // MIDI: a live keyboard that shows every note the keyboard sends
  function drawHeld(held) {
    const cv = $('midiKeys'); if (!cv) return; const ctx2 = cv.getContext('2d'); const W = cv.width = cv.clientWidth * 2, H = cv.height = cv.clientHeight * 2;
    const lo = 21, hi = 108; const whites = []; for (let n = lo; n <= hi; n++) if (![1, 3, 6, 8, 10].includes(n % 12)) whites.push(n);
    const w = W / whites.length; ctx2.clearRect(0, 0, W, H);
    const x = {}; whites.forEach((n, i) => x[n] = i * w); for (let n = lo; n <= hi; n++) if ([1, 3, 6, 8, 10].includes(n % 12)) x[n] = x[n - 1] + w * 0.62;
    const set = new Set(held);
    for (const n of whites) { ctx2.fillStyle = set.has(n) ? '#f2b544' : '#ebe9e3'; ctx2.fillRect(x[n] + 1, 0, w - 2, H); }
    for (let n = lo; n <= hi; n++) if ([1, 3, 6, 8, 10].includes(n % 12)) { ctx2.fillStyle = set.has(n) ? '#f2b544' : '#20232c'; ctx2.fillRect(x[n] - w * 0.3, 0, w * 0.6, H * 0.62); }
  }
  async function startMidi() {
    const ok = await A.midiStart({
      onStatus: (st) => {
        if (!st.ok) { $('midiHint').innerHTML = st.reason === 'unsupported' ? 'This browser has no MIDI. On iPhone and in Safari use the <b>Microphone</b> or <b>Tap</b>; Chrome on Android, Mac or Windows reads USB and Bluetooth keyboards.' : 'MIDI access was refused. Allow it in the browser and try again.'; $('midiSub').textContent = 'not available here'; return; }
        $('midiSub').textContent = st.inputs.length ? st.inputs.join(', ') : 'no keyboard found — plug one in';
        $('midiHint').textContent = st.inputs.length ? 'Hold a chord; lift and play the next. Pedal down keeps the chord.' : 'Connect a USB or Bluetooth keyboard. It appears here automatically.';
      },
      onLive: (c, notes) => { drawHeld(notes || []); const el = $('midiLive'); if (!c) { el.textContent = '—'; $('midiSub').textContent = 'listening'; return; } el.innerHTML = chordInner(c); el.style.color = M.css(moodOf(c, S.key), 8); $('midiSub').textContent = c.melody && c.melody.length ? 'melody: ' + c.melody.map(m => T.pcName(m.note % 12, S.key)).join(' ') : notes.map(n => T.pcName(n % 12, S.key)).join(' '); },
      onChord: (c, ms) => { addChord(Object.assign({}, c, { beats: 4, ms, src: 'midi' })); const notes = A.takeNotes(); if (notes.length) { S.take = { notes, at: Date.now() }; S.settings.feel = 'asPlayed'; } $('midiSub').textContent = `take: ${notes.length} notes`; save(); },
      onNotes: (held) => drawHeld(held),
      onMelody: (n) => { const L = S.prog[S.prog.length - 1]; if (!L) return; L.melody = (L.melody || []).concat([n]); if (L.span) L.span.end = performance.now() - A.MIDI.take.t0; const notes = A.takeNotes(); if (notes.length) S.take = { notes, at: Date.now() }; renderHeard(); },
    });
    if (ok) $('midiLbl').textContent = 'Reading';
  }
  $('midiBtn').addEventListener('click', () => { unlockAudio(); if (!A.MIDI.active) startMidi(); });

  // tap
  const PAD_Q = {
    major: { tri: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'], sev: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'], rich: ['maj9', 'm9', 'm7', 'maj7s11', '13sus4', 'm11', 'm7b5'] },
    minor: { tri: ['min', 'dim', 'maj', 'min', 'maj', 'maj', 'maj'], sev: ['m7', 'm7b5', 'maj7', 'm7', '7', 'maj7', '7'], rich: ['m9', 'm7b5', 'maj9', 'm9', '7b9', 'maj9', '13'] },
  };
  function renderPad() {
    const sc = T.keyScale(S.key); const qs = PAD_Q[S.key.mode][S.padQ];
    $('pad').innerHTML = sc.map((d, i) => { const c = { root: d.pc, q: qs[i] }; const m = moodOf(c); const p = T.chordParts(c, S.key, { style: S.settings.symbols }); return `<button data-pad="${i}" style="${M.vars(m)}" aria-label="${esc(speak(c))}"><span>${esc(p.root)}${p.sfx ? `<span class="sfx">${esc(p.sfx)}</span>` : ''}</span><small>${esc(T.romanNumeral(c, S.key))}</small></button>`; }).join('');
    $('pad').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.pad; const c = { root: sc[i].pc, q: qs[i], bass: null, beats: 4, src: 'tap' }; addChord(c); playChord(c, 1.2); }));
    $('padQual').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.q === S.padQ));
    $('roots').innerHTML = Array.from({ length: 12 }, (_, pc) => `<button data-root="${pc}" class="${S.anyRoot === pc ? 'on' : ''}">${esc(T.pcName(pc, S.key, S.anyQ))}</button>`).join('');
    $('roots').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.anyRoot = +b.dataset.root; renderPad(); }));
    const QL = ['maj', 'min', '7', 'maj7', 'm7', 'dim7', 'm7b5', 'sus4', 'sus2', 'add9', '6', 'm6', '9', 'maj9', 'm9', 'm11', '13', '9sus4', '13sus4', 'maj7s11', '7b9', '7s9', '7alt', 'aug', 'mMaj7', '69'];
    $('quals').innerHTML = QL.map(q => `<button data-q="${q}" class="${S.anyQ === q ? 'on' : ''}">${esc(T.pcName(S.anyRoot, S.key, q))}${esc((S.settings.symbols === 'jazz' ? T.Q[q].jazz : T.Q[q].suffix))}</button>`).join('') + `<button id="anyAdd" class="primary">Add ${esc(sym({ root: S.anyRoot, q: S.anyQ }))}</button>`;
    $('quals').querySelectorAll('button[data-q]').forEach(b => b.addEventListener('click', () => { S.anyQ = b.dataset.q; renderPad(); playChord({ root: S.anyRoot, q: S.anyQ }, 1.2); }));
    $('anyAdd').addEventListener('click', () => { const c = { root: S.anyRoot, q: S.anyQ, bass: null, beats: 4, src: 'tap' }; addChord(c); playChord(c, 1.2); });
  }
  $('padQual').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.padQ = b.dataset.q; renderPad(); save(); }));
  function addTyped() {
    const txt = $('typeIn').value.trim(); if (!txt) return;
    const chords = T.parseProgression(txt);
    if (!chords.length) { toast('Could not read that — try C  Am7  F  G/B'); return; }
    chords.forEach(c => addChord(Object.assign(c, { src: 'type' }), true)); $('typeIn').value = ''; renderHeard();
  }
  $('typeAdd').addEventListener('click', addTyped);
  $('typeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTyped(); });

  // captured progression
  function addChord(c, quiet) {
    // merge an immediate repeat of the same chord into a longer one (the mic often re-hears a held chord)
    const L = S.prog[S.prog.length - 1];
    if (L && c.src !== 'tap' && c.src !== 'type' && T.sameChord(L, c) && L.src === c.src) { L.ms = (L.ms || 0) + (c.ms || 0); if (c.span && L.span) L.span.end = c.span.end; if (c.melody && c.melody.length) L.melody = (L.melody || []).concat(c.melody.map(m => typeof m === 'number' ? m : m.note)); if (!quiet) renderHeard(); return; }
    const melody = c.melody && c.melody.length ? c.melody.map(m => typeof m === 'number' ? m : m.note) : undefined;
    S.prog.push({ root: c.root, q: c.q, bass: c.bass ?? null, beats: c.beats || 4, ms: c.ms, conf: c.conf, src: c.src, melody, notes: c.notes, span: c.span, alts: c.alts });
    if (!S.keyLocked) detectKey();
    if (!quiet) renderHeard();
    save();
  }
  // After a mic or MIDI take: turn held time into beats (relative to the median chord length = 4 beats), rounded to 1, 2, 4 or 8.
  function finalizeDurations() {
    const timed = S.prog.filter(c => c.ms && (c.src === 'mic' || c.src === 'midi'));
    if (timed.length < 2) return;
    const ms = timed.map(c => c.ms).sort((a, b) => a - b); const med = ms[Math.floor(ms.length / 2)];
    timed.forEach(c => { const r = c.ms / med; c.beats = r < 0.38 ? 1 : r < 0.75 ? 2 : r < 1.5 ? 4 : 8; c.ms = null; });
    // tempo: the median chord is taken as one bar of four
    const bpm = Math.round(60000 / (med / 4));
    if (bpm >= 48 && bpm <= 180) { S.settings.bpm = bpm; const sg = currentSong(); if (sg) sg.bpm = bpm; toast(`Tempo set to ${bpm} from your take`); }
    renderHeard(); save();
  }
  function finishMidiTake() {
    if (A.MIDI.current) { const cur = A.MIDI.current; cur.chord.span = { start: A.MIDI.currentSince - A.MIDI.take.t0, end: performance.now() - A.MIDI.take.t0 }; addChord(Object.assign({}, cur.chord, { beats: 4, ms: performance.now() - A.MIDI.currentSince, src: 'midi' })); A.MIDI.current = null; }
    const notes = A.takeNotes();
    if (notes.length) { S.take = { notes, at: Date.now() }; S.settings.feel = 'asPlayed'; }
    finalizeDurations(); updateHeardTitle(); renderHeard();
    $('midiLive').textContent = '—'; $('midiSub').textContent = `take kept: ${notes.length} notes`;
    A.takeStart();
  }
  $('midiDone').addEventListener('click', finishMidiTake);
  function updateHeardTitle() { $('heardTitle').textContent = A.MIC.active ? 'Hearing…' : S.prog.some(c => c.src === 'mic' || c.src === 'midi') ? 'We heard' : 'Your chords'; }
  function renderHeard() {
    renderKey(); updateHeardTitle();
    const host = $('heard');
    if (!S.prog.length) { host.innerHTML = '<div class="hint">Nothing yet. Play, plug in, or tap chords, then they appear here as chips — tap a chip to fix it.</div>'; $('heardKey').textContent = ''; $('toIdeas').disabled = true; $('ideasProg').innerHTML = ''; return; }
    $('toIdeas').disabled = false;
    host.innerHTML = `<div class="chips" id="heardChips">${S.prog.map((c, i) => chipHTML(c, S.key, { i, prog: S.prog })).join('')}<button class="chip ghost" id="addMore" aria-label="Add a chord">+ chord</button></div><div class="rn">${esc(R.describe(S.prog, S.key))}</div>`;
    host.querySelectorAll('.chip[data-i]').forEach(ch => ch.addEventListener('click', () => editChord(+ch.dataset.i)));
    $('addMore').addEventListener('click', () => { setInputMode('tap'); $('tapWrap').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const low = S.prog.filter(c => c.conf != null && c.conf < 0.1).length;
    $('heardKey').textContent = `${T.keyName(S.key)}${S.keyLocked ? ' (set by you)' : ' (detected)'}${low ? ` · ${low} uncertain` : ''}`;
  }
  function editChord(i) {
    const c = S.prog[i];
    const QL = ['maj', 'min', '7', 'maj7', 'm7', 'dim', 'dim7', 'm7b5', 'aug', 'sus4', 'sus2', 'add9', '6', 'm6', '69', '9', 'maj9', 'm9', 'm11', '13', '7sus4', '9sus4', '13sus4', 'maj7s11', '7b9', '7s9', '7alt', 'mMaj7'];
    const alts = (c.alts || []).filter(a => !(a.root === c.root && a.q === c.q && (a.bass ?? null) === (c.bass ?? null)));
    const html = `<h2>${esc(sym(c))} <span class="hint">${esc(T.romanNumeral(c, S.key))}</span></h2>
      ${alts.length ? `<div class="field"><label>Did you mean</label><div class="chips">${alts.map((a, k) => chipHTML(Object.assign({}, a, { beats: c.beats }), S.key, { cls: 'sm alt', i: k })).join('')}</div></div>` : ''}
      <div class="field"><label>Root</label><div class="roots" id="eRoots">${Array.from({ length: 12 }, (_, pc) => `<button data-pc="${pc}" class="${c.root === pc ? 'on' : ''}">${esc(T.pcName(pc, S.key, c.q))}</button>`).join('')}</div></div>
      <div class="field"><label>Quality</label><div class="quals" id="eQuals">${QL.map(q => `<button data-q="${q}" class="${c.q === q ? 'on' : ''}">${esc(T.pcName(c.root, S.key, q))}${esc(S.settings.symbols === 'jazz' ? T.Q[q].jazz : T.Q[q].suffix)}</button>`).join('')}</div></div>
      <div class="field"><label>Bass</label><div class="roots" id="eBass"><button data-b="" class="${c.bass == null ? 'on' : ''}">root</button>${T.chordPcs(c).slice(1).map(pc => `<button data-b="${pc}" class="${c.bass === pc ? 'on' : ''}">${esc(T.pcName(pc, S.key))}</button>`).join('')}</div></div>
      <div class="field"><label>Length</label><div class="seg" id="eBeats">${[1, 2, 3, 4, 6, 8].map(b => `<button data-b="${b}" class="${(c.beats || 4) === b ? 'on' : ''}">${b} ${b === 1 ? 'beat' : 'beats'}</button>`).join('')}</div></div>
      <div class="row"><button class="small" id="eHear">▶ Hear</button><button class="small" id="eLeft" ${i === 0 ? 'disabled' : ''}>← Move</button><button class="small" id="eRight" ${i === S.prog.length - 1 ? 'disabled' : ''}>Move →</button><button class="small" id="eDup">Duplicate</button><span class="spacer"></span><button class="small ghost" id="eDel" style="color:var(--warn)">Delete</button><button class="primary" id="eDone">Done</button></div>`;
    sheet(html, (el) => {
      const rerender = () => { editChord(i); };
      el.querySelectorAll('.chip.alt').forEach(b => b.addEventListener('click', () => { const a = alts[+b.dataset.i]; c.root = a.root; c.q = a.q; c.bass = a.bass ?? null; c.conf = null; playChord(c, 1.2); rerender(); }));
      el.querySelectorAll('#eRoots button').forEach(b => b.addEventListener('click', () => { c.root = +b.dataset.pc; if (c.bass != null && !T.chordPcs(c).includes(c.bass)) c.bass = null; playChord(c, 1.2); rerender(); }));
      el.querySelectorAll('#eQuals button').forEach(b => b.addEventListener('click', () => { c.q = b.dataset.q; if (c.bass != null && !T.chordPcs(c).includes(c.bass)) c.bass = null; playChord(c, 1.2); rerender(); }));
      el.querySelectorAll('#eBass button').forEach(b => b.addEventListener('click', () => { c.bass = b.dataset.b === '' ? null : +b.dataset.b; playChord(c, 1.2); rerender(); }));
      el.querySelectorAll('#eBeats button').forEach(b => b.addEventListener('click', () => { c.beats = +b.dataset.b; rerender(); }));
      el.querySelector('#eHear').addEventListener('click', () => playChord(c));
      el.querySelector('#eLeft').addEventListener('click', () => { [S.prog[i - 1], S.prog[i]] = [S.prog[i], S.prog[i - 1]]; editChord(i - 1); });
      el.querySelector('#eRight').addEventListener('click', () => { [S.prog[i + 1], S.prog[i]] = [S.prog[i], S.prog[i + 1]]; editChord(i + 1); });
      el.querySelector('#eDup').addEventListener('click', () => { S.prog.splice(i + 1, 0, Object.assign({}, c)); editChord(i + 1); });
      el.querySelector('#eDel').addEventListener('click', () => { S.prog.splice(i, 1); closeSheet(); after(); });
      el.querySelector('#eDone').addEventListener('click', () => { closeSheet(); after(); });
      function after() { c.conf = null; if (!S.keyLocked) detectKey(); renderHeard(); if (S.tab === 'ideas') recompute(); save(); }
    });
  }
  $('undoBtn').addEventListener('click', () => { S.prog.pop(); if (!S.keyLocked) detectKey(); renderHeard(); save(); });
  $('clearBtn').addEventListener('click', () => { if (!S.prog.length) return; S.prog = []; S.keyLocked = false; renderHeard(); save(); toast('Cleared'); });
  $('hearProg').dataset.play = '▶ Hear'; $('hearProg').addEventListener('click', () => playProg(S.prog, S.key, S.style, $('heard')));
  $('toIdeas').addEventListener('click', () => { if (A.MIC.active) stopMic(); S.prog.forEach(c => { c.changed = undefined; }); showTab('ideas'); });
  $('keyBtn').addEventListener('click', keySheet);

  // ---------- IDEAS ----------
  const MOODS = [['', 'Any mood'], ['warm', 'Warm'], ['open', 'Open'], ['floating', 'Floating'], ['tender', 'Tender'], ['bittersweet', 'Bittersweet'], ['wonder', 'Wonder'], ['dark', 'Dark'], ['tense', 'Tension'], ['triumphant', 'Triumphant'], ['church', 'Church']];
  function renderLens() {
    $('styleSeg').innerHTML = R.STYLE_ORDER.map(id => `<button data-style="${id}" class="${S.style === id ? 'on' : ''}">${esc(R.STYLES[id].name)}</button>`).join('');
    $('styleSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.style = b.dataset.style; const cap = R.STYLES[S.style].ceiling; if (S.depth > cap) S.depth = cap; S.openCard = -1; recompute(); save(); b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }));
    const cap = R.STYLES[S.style].ceiling;
    $('depthDots').innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < S.depth ? 'on' : ''} ${i >= cap ? 'cap' : ''}"></i>`).join('');
    $('depthDown').disabled = S.depth <= 1; $('depthUp').disabled = S.depth >= cap;
    $('styleBlurb').textContent = `${R.STYLES[S.style].name} goes to ${cap}`;
    renderWheel();
    $('dareBtn').classList.toggle('on', S.dare);
    $('shadowBtn').classList.toggle('on', !!S.shadow);
  }
  // The emotion wheel (GEMS): nine segments, a term row for the chosen one
  function renderWheel() {
    const host = $('moodChips'); const cur = S.mood ? String(S.mood).split(':') : [null, null];
    const W = 240, cx = 120, cy = 120, r0 = 48, r1 = 112; const n = M.GEMS.length;
    const seg = (i) => { const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.02, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.02; const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; return `M ${p(r0, a0)} A ${r0} ${r0} 0 0 1 ${p(r0, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`; };
    const mid = (i) => { const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2; return [cx + 80 * Math.cos(a), cy + 80 * Math.sin(a)]; };
    let svg = `<svg class="wheel" viewBox="0 0 ${W} ${W}" role="group" aria-label="Emotion wheel">`;
    M.GEMS.forEach((g, i) => { const on = cur[0] === g.id; const [mx, my] = mid(i); svg += `<path d="${seg(i)}" data-g="${g.id}" fill="hsl(${g.hue} ${on ? 62 : 38}% calc(${on ? 48 : 34}% + var(--lshift) * 0.6))" stroke="${on ? 'var(--accent)' : 'var(--bg)'}" stroke-width="${on ? 2.5 : 2}" style="cursor:pointer"><title>${esc(g.name)}</title></path><text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" font-size="${g.name.length > 9 ? 8.5 : 10}" font-family="var(--body)" font-weight="600" fill="#fff" fill-opacity="${on ? 1 : .85}" style="pointer-events:none">${esc(g.name.split(' ')[0])}</text>`; });
    const g = cur[0] ? M.gemsById(cur[0]) : null;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r0 - 4}" fill="var(--panel2)" stroke="var(--line)" data-g="" style="cursor:pointer"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="10.5" font-family="var(--body)" font-weight="600" fill="var(--fg)" style="pointer-events:none">${g ? esc(g.name.split(' ')[0]) : 'Any'}</text><text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="8.5" font-family="var(--body)" fill="var(--muted)" style="pointer-events:none">${g ? esc(cur[1] || g.sup) : 'feeling'}</text></svg>`;
    const terms = g ? `<div class="chips" style="align-content:flex-start">${Object.keys(g.terms).map(t => `<button class="small ${cur[1] === t ? 'on' : ''}" data-term="${esc(t)}">${esc(t)}</button>`).join('')}<button class="small ghost" data-term="">any ${esc(g.name.toLowerCase())}</button></div><div class="hint">${esc(g.name)} is one of the nine emotions music is measured to evoke (Geneva Emotional Music Scale). Pick a shade to narrow it.</div>` : `<div class="hint">Tap a feeling. Options are then ranked by how close they sit to it on the brightness–tension map, by their color words, and by which devices usually carry that feeling. From the Geneva Emotional Music Scale; the app says "feels like", never "is".</div>`;
    host.innerHTML = `<div class="wheelwrap">${svg}<div class="wheelside">${terms}</div></div>`;
    host.querySelectorAll('[data-g]').forEach(p => p.addEventListener('click', () => { const id = p.dataset.g; S.mood = id ? id : null; S.openCard = -1; recompute(); }));
    host.querySelectorAll('[data-term]').forEach(b => b.addEventListener('click', () => { const t = b.dataset.term; S.mood = t ? `${cur[0]}:${t}` : cur[0]; S.openCard = -1; recompute(); }));
  }
  $('depthDown').addEventListener('click', () => { S.depth = Math.max(1, S.depth - 1); S.openCard = -1; recompute(); save(); });
  $('depthUp').addEventListener('click', () => { S.depth = Math.min(R.STYLES[S.style].ceiling, S.depth + 1); S.openCard = -1; recompute(); save(); });
  $('dareBtn').addEventListener('click', () => { S.dare = !S.dare; S.openCard = -1; recompute(); if (S.dare) toast('One notch deeper than the dial'); });
  $('melodyBtn').addEventListener('click', () => { S.melodyLock = S.melodyLock === false ? true : false; recompute(); toast(S.melodyLock === false ? 'Options may move your melody notes' : 'Only options that keep your melody notes'); });
  $('shadowBtn').addEventListener('click', () => { if (!S.prog.length) return; S.shadow = S.shadow ? null : R.shadow(S.prog, S.key); S.openCard = -1; recompute(); if (S.shadow) toast('The same song in a mirror'); });
  $('ideasHear').dataset.play = '▶ Hear'; $('ideasHear').addEventListener('click', () => playProg(S.prog, S.key, S.style, $('ideasProg')));
  $('ideasEdit').addEventListener('click', () => showTab('listen'));
  $('ideasMidi').addEventListener('click', () => { if (!S.prog.length) return; downloadFile('progression.mid', Export.midiFile(progItems(S.prog, S.key, S.style), S.settings.bpm, 'Changes'), 'audio/midi'); });

  function recompute() {
    renderLens();
    const host = $('options'); $('chartHost').innerHTML = '';
    if (!S.prog.length) { $('ideasProg').innerHTML = ''; $('ideasRoman').textContent = ''; $('ideasMood').textContent = ''; host.innerHTML = '<div class="hint">Confirm a progression on Listen, then come here.</div>'; return; }
    $('ideasProg').innerHTML = S.prog.map((c, i) => chipHTML(c, S.key, { i, prog: S.prog })).join('');
    $('ideasProg').querySelectorAll('.chip').forEach((ch, i) => ch.addEventListener('click', () => { playChord(S.prog[i]); setBrandHue(ch); }));
    const pm = M.progressionMood(S.prog, S.key, S.style);
    $('ideasRoman').textContent = R.describe(S.prog, S.key);
    $('ideasMood').innerHTML = `<b>${esc(pm.words.slice(0, 2).join(', '))}</b> — ${esc(pm.sentence)}`;
    const depth = Math.min(R.STYLES[S.style].ceiling, S.depth + (S.dare ? 1 : 0));
    const hasMelody = S.prog.some(c => c.melody && c.melody.length);
    $('melodyBtn').hidden = !hasMelody; $('melodyBtn').classList.toggle('on', S.melodyLock !== false);
    S.options = R.ideas(S.prog, S.key, { style: S.style, depth, mood: S.mood, limit: 7, melodyLock: hasMelody && S.melodyLock !== false });
    if (S.shadow) S.options.unshift(Object.assign({ depth: 5, mood: M.progressionMood(S.shadow.prog, S.key, S.style), roman: S.shadow.prog.map(c => T.romanNumeral(c, S.key)) }, S.shadow));
    if (!S.options.length) { host.innerHTML = `<div class="hint">Nothing to add at this depth in ${esc(R.STYLES[S.style].name)} — turn the depth up, try Dare me, or another lens.</div>`; return; }
    host.innerHTML = S.options.map((o, idx) => cardHTML(o, idx)).join('');
    S.options.forEach((o, idx) => {
      const card = host.querySelector(`[data-card="${idx}"]`);
      card.querySelector('[data-act="hear"]').addEventListener('click', (e) => { e.stopPropagation(); playProg(o.prog, S.key, S.style, card); });
      card.querySelector('[data-act="chart"]').addEventListener('click', (e) => { e.stopPropagation(); toggleChart(idx); });
      card.querySelector('[data-act="keep"]').addEventListener('click', (e) => { e.stopPropagation(); keep(o); });
      card.querySelectorAll('.chip').forEach((ch, i) => ch.addEventListener('click', (e) => { e.stopPropagation(); playChord(o.prog[i]); setBrandHue(ch); }));
    });
    if (S.openCard >= 0 && S.openCard < S.options.length) toggleChart(S.openCard, true); else renderSideChart();
  }
  function cardHTML(o, idx) {
    const depthDots = Array.from({ length: 5 }, (_, i) => `<i class="${i < (o.depth || 1) ? 'on' : ''}"></i>`).join('');
    const words = (o.mood.focus && o.mood.focus.words.length ? o.mood.focus.words : o.mood.words).slice(0, 2);
    return `<div class="card ${S.openCard === idx ? 'open' : ''}" data-card="${idx}">
      <div class="head"><span class="device">${esc(o.device)}</span><span class="ddots" title="depth ${o.depth}">${depthDots}</span><span class="spacer"></span><span class="words">${o.gems ? `<span class="gem" style="--gh:${o.gems.hue}">${esc(o.gems.name.split(' ')[0])}</span> ` : ''}<b>${esc(words[0] || '')}</b>${words[1] ? ', ' + esc(words[1]) : ''}</span></div>
      <div class="moodbar" style="--g:${gradientOf(o.prog, S.key)}"></div>
      <div class="chips scroll">${o.prog.map((c, i) => chipHTML(c, S.key, { i, prog: o.prog })).join('')}</div>
      <div class="rn">${esc(o.roman.join(' – '))}</div>
      <div class="reason">${esc(o.reason)}${o.clashes && o.clashes.length ? ` <span class="q">Clashes with the melody on ${esc(o.clashes.join(', '))}.</span>` : ''}</div>
      <div class="teach"><b>Practice</b> ${esc(Export.teach(o.family))}</div>
      <div class="actions"><button data-act="hear" data-play="▶ Hear">▶ Hear</button><button data-act="chart">${S.openCard === idx ? 'Hide chart' : 'Chart'}</button><button data-act="keep" class="primary">Keep</button></div>
      <div class="chartwrap" data-chart="${idx}" ${S.openCard === idx ? '' : 'hidden'}></div></div>`;
  }
  const wide = () => window.matchMedia('(min-width: 1100px)').matches;
  function toggleChart(idx, force) {
    const wasOpen = S.openCard === idx;
    S.openCard = (wasOpen && !force) ? -1 : idx;
    const host = $('chartHost');
    document.querySelectorAll('.card').forEach(c => { const i = +c.dataset.card; const w = c.querySelector('.chartwrap'); c.classList.toggle('open', i === S.openCard); c.querySelector('[data-act="chart"]').textContent = i === S.openCard ? 'Hide chart' : 'Chart'; if (i === S.openCard && !wide()) { w.hidden = false; w.innerHTML = ''; w.appendChild(chartEl(S.options[i].prog, S.key, S.style)); if (!force) w.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } else { w.hidden = true; w.innerHTML = ''; } });
    if (wide()) renderSideChart();
  }
  // On a wide screen the chart lives beside the options: the open option's, else the working progression's
  function renderSideChart() {
    const host = $('chartHost'); host.innerHTML = '';
    if (!wide() || !S.prog.length) return;
    const o = S.openCard >= 0 ? S.options[S.openCard] : null;
    const head = document.createElement('div'); head.className = 'panel tight'; head.style.position = 'sticky'; head.style.top = '0';
    head.innerHTML = `<div class="row between"><h3>${o ? 'Chart · ' + esc(o.device) : 'Chart · your progression'}</h3><span class="hint">${o ? 'tap another option\'s Chart to switch' : 'open an option to see its chart here'}</span></div>`;
    head.appendChild(chartEl(o ? o.prog : S.prog, S.key, S.style));
    host.appendChild(head);
  }
  window.addEventListener('resize', () => { if (S.tab === 'ideas') toggleChart(S.openCard, true); });
  // The chart: keyboard strips with voice-leading lines, and fretboard grips.
  function chartEl(prog, key, style, opts = {}) {
    const wrap = document.createElement('div'); wrap.className = 'chart animate'; wrap.style.gap = '8px';
    const inst = S.settings.instrument;
    const bar = document.createElement('div'); bar.className = 'toolbar';
    bar.innerHTML = `<button class="small" data-play="▶ Play">▶ Play</button><div class="seg" data-inst><button data-v="piano" class="${inst === 'piano' ? 'on' : ''}">Piano</button><button data-v="guitar" class="${inst === 'guitar' ? 'on' : ''}">Guitar</button><button data-v="both" class="${inst === 'both' ? 'on' : ''}">Both</button></div><button class="small ${S.settings.twoHands ? 'on' : ''}" data-hands title="Show the left hand on the keyboard too">${S.settings.twoHands ? '2 hands' : 'RH'}</button>`;
    wrap.appendChild(bar);
    const body = document.createElement('div'); body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.gap = '6px'; wrap.appendChild(body);
    const render = () => {
      body.innerHTML = '';
      const inst2 = S.settings.instrument;
      if (inst2 === 'piano' || inst2 === 'both') {
        const vs = V.voiceProgression(prog, key, style, { span: S.settings.span });
        const range = V.keyRange(vs, S.settings.twoHands);
        vs.forEach((v, i) => {
          const m = moodOf(prog[i], key, i, prog); const color = M.css(m);
          if (i > 0) { const cr = document.createElement('div'); cr.className = 'connrow'; cr.innerHTML = `<div class="lab"></div>${V.connectorSVG(vs[i - 1], v, range, { color, labels: true })}`; body.appendChild(cr); }
          const row = document.createElement('div'); row.className = 'strow';
          const bassNames = v.lh.map(n => V.midiName(n, key)).join(' ');
          row.innerHTML = `<div class="lab"><span class="sym" style="color:${color}">${chordInner(prog[i], key)}</span><small>${S.settings.twoHands ? 'LH ' + esc(bassNames) : 'bass ' + esc(bassNames.split(' ')[0])}</small><small>${esc(v.rh.map(n => v.names.find(x => x.midi === n).name).join(' '))}</small></div><div class="kb" role="button" tabindex="0" aria-label="${esc(speak(prog[i], key))}, tap to hear">${V.stripSVG(v, range, { color, twoHands: S.settings.twoHands, label: speak(prog[i], key) })}</div>`;
          row.querySelector('.kb').addEventListener('click', () => { unlockAudio(); A.playNotes(S.settings.twoHands ? v.all : [v.lh[0]].concat(v.rh), 1.8); });
          body.appendChild(row);
        });
        if (vs.length > 1) { const legend = document.createElement('div'); legend.className = 'hint'; legend.style.fontSize = '11px'; legend.textContent = 'Lines between keyboards: solid = a voice moves (by this many half steps), dashed = it holds.'; body.appendChild(legend); }
      }
      if (inst2 === 'guitar' || inst2 === 'both') {
        const gs = V.guitarProgression(prog, key, style, { key });
        const grips = document.createElement('div'); grips.className = 'grips';
        gs.forEach((g, i) => {
          const m = moodOf(prog[i], key, i, prog); const color = M.css(m);
          const d = document.createElement('div'); d.className = 'grip'; d.setAttribute('role', 'button'); d.tabIndex = 0;
          d.innerHTML = `<span class="sym" style="color:${color}">${chordInner(prog[i], key)}</span>${V.fretboardSVG(g.shape, { color, fingers: S.settings.fingers, label: speak(prog[i], key) })}<small>${g.shape ? esc(g.shape.frets.map(f => f < 0 ? 'x' : f).join(' ')) + (g.shape.rootless ? ' · no root' : '') : 'no playable grip'}</small>`;
          d.addEventListener('click', () => { if (!g.shape) return; unlockAudio(); const notes = g.shape.frets.map((f, s) => f < 0 ? null : V.TUNING[s] + f).filter(n => n != null); A.playNotes(notes, 1.8, null, 0.6, 0.03); });
          grips.appendChild(d);
        });
        body.appendChild(grips);
      }
    };
    render();
    bar.querySelectorAll('[data-inst] button').forEach(b => b.addEventListener('click', () => { S.settings.instrument = b.dataset.v; bar.querySelectorAll('[data-inst] button').forEach(x => x.classList.toggle('on', x === b)); render(); save(); }));
    bar.querySelector('[data-hands]').addEventListener('click', (e) => { S.settings.twoHands = !S.settings.twoHands; e.currentTarget.classList.toggle('on', S.settings.twoHands); e.currentTarget.textContent = S.settings.twoHands ? '2 hands' : 'RH'; render(); save(); });
    bar.querySelector('[data-play]').addEventListener('click', () => {
      if (A.PLAYER.playing) { A.stop(); if (playingCleanup) playingCleanup(); return; }
      unlockAudio(); const rows = [...body.querySelectorAll('.strow')]; const grips = [...body.querySelectorAll('.grip')];
      const clear = () => { rows.forEach(r => r.style.background = ''); grips.forEach(g => g.style.outline = ''); };
      playingCleanup = () => { clear(); playingCleanup = null; updatePlayButtons(false); }; updatePlayButtons(true);
      A.play(progItems(prog, key, style), { bpm: S.settings.bpm, feel: S.settings.feel, onChord: (i) => { clear(); if (rows[i]) { rows[i].style.background = 'var(--panel3)'; rows[i].style.borderRadius = '8px'; } if (grips[i]) grips[i].style.outline = '2px solid var(--accent)'; }, onEnd: () => { if (playingCleanup) playingCleanup(); } });
    });
    return wrap;
  }
  function keep(o) {
    const kept = o.prog.map(c => ({ root: c.root, q: c.q, bass: c.bass ?? null, beats: c.beats || 4, label: c.label, roman: c.roman, spell: c.spell, pref: c.pref, changed: c.changed }));
    S.prog = kept; S.shadow = null; S.openCard = -1;
    const song = ensureSong();
    save();
    const secs = song.sections;
    sheet(`<h2>Kept</h2><div class="hint">Ideas now build on this progression. Save it into the song too?</div>
      <div class="chips">${kept.map((c, i) => chipHTML(c, S.key, { i, prog: kept })).join('')}</div>
      <div class="field"><label>${esc(song ? song.title || 'Untitled song' : 'Song')}</label><div class="list" id="keepSecs">${secs.map(s => `<button data-sec="${s.id}" class="songrow" style="justify-content:space-between"><b>${esc(s.name)}</b><small>${s.ideas.length ? s.ideas.length + ' idea' + (s.ideas.length > 1 ? 's' : '') : 'empty'}</small></button>`).join('')}<button data-sec="new" class="songrow"><b>+ New section</b></button></div></div>
      <div class="row"><button class="small ghost" id="keepSkip">Not now</button></div>`, (el) => {
      el.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => {
        let sec; const sg = ensureSong();
        if (b.dataset.sec === 'new') { sec = newSection(sg, nextSectionName(sg)); } else sec = sg.sections.find(s => s.id === b.dataset.sec);
        addIdea(sec, kept, `${o.device} · ${R.STYLES[S.style].name}`, o.reason);
        closeSheet(); save(); toast(`Saved to ${sec.name} as idea ${String.fromCharCode(64 + sec.ideas.length)}`); recompute();
      }));
      el.querySelector('#keepSkip').addEventListener('click', () => { closeSheet(); recompute(); });
    });
  }

  // ---------- SONG ----------
  const uid = () => Math.random().toString(36).slice(2, 9);
  function currentSong() { return S.songs.find(s => s.id === S.songId) || null; }
  function ensureSong() { let s = currentSong(); if (!s) { s = newSong(); } return s; }
  function newSong(title) {
    const s = { id: uid(), title: title || '', key: Object.assign({}, S.key), bpm: S.settings.bpm, created: Date.now(), sections: [] };
    newSection(s, 'Verse 1'); newSection(s, 'Chorus');
    S.songs.unshift(s); S.songId = s.id; save(); return s;
  }
  function newSection(song, name) { const sec = { id: uid(), name, lyrics: '', ideas: [], active: 0 }; song.sections.push(sec); return sec; }
  function nextSectionName(song) { const names = ['Verse 1', 'Chorus', 'Verse 2', 'Pre-chorus', 'Bridge', 'Outro', 'Intro']; return names.find(n => !song.sections.some(s => s.name === n)) || `Section ${song.sections.length + 1}`; }
  function addIdea(sec, chords, label, reason) { sec.ideas.push({ id: uid(), label, reason, chords: chords.map(c => ({ root: c.root, q: c.q, bass: c.bass ?? null, beats: c.beats || 4, label: c.label, roman: c.roman, spell: c.spell, pref: c.pref })), key: Object.assign({}, S.key), created: Date.now() }); sec.active = sec.ideas.length - 1; }
  function renderSong() {
    const song = currentSong();
    const host = $('sections');
    if (!song) {
      $('songTitle').value = ''; $('songMeta').textContent = 'No song yet';
      host.innerHTML = `<div class="panel"><div class="hint">A song is a workspace: sections, lyrics with the chords above them, and several ideas for each section so you can try different changes over the same words.</div><div class="row"><button class="primary" id="newSongBtn">New song</button>${S.songs.length ? '<button id="pickSongBtn">Open a song</button>' : ''}</div></div>`;
      host.querySelector('#newSongBtn').addEventListener('click', () => { newSong(); renderSong(); });
      const pk = host.querySelector('#pickSongBtn'); if (pk) pk.addEventListener('click', songsSheet);
      return;
    }
    $('songTitle').value = song.title || '';
    $('songMeta').textContent = `${T.keyName(song.key)} · ${song.bpm} bpm · ${song.sections.length} section${song.sections.length === 1 ? '' : 's'}`;
    host.innerHTML = '';
    song.sections.forEach((sec, si) => host.appendChild(sectionEl(song, sec, si)));
  }
  function sectionEl(song, sec, si) {
    const el = document.createElement('div'); el.className = 'panel section';
    const idea = sec.ideas[sec.active] || null; const key = idea ? idea.key : song.key;
    const tabs = sec.ideas.map((id, i) => `<button data-idea="${i}" class="${i === sec.active ? 'on' : ''}" title="${esc(id.label)}">${String.fromCharCode(65 + i)}</button>`).join('');
    el.innerHTML = `<div class="shead"><input value="${esc(sec.name)}" aria-label="Section name" data-name><button class="small ghost" data-menu aria-label="Section options">⋯</button></div>
      <div class="ideatabs">${tabs}<button data-idea="add" class="ghost" title="Add the progression from Ideas">+ idea</button>${idea ? `<span class="hint" style="margin-left:auto">${esc(idea.label)}</span>` : ''}</div>
      ${idea ? `<div class="chips scroll" data-chips>${idea.chords.map((c, i) => chipHTML(c, key, { i, prog: idea.chords })).join('')}</div><div class="row between"><span class="rn">${esc(R.describe(idea.chords, key))}</span><div class="row"><button class="small" data-play="▶ Hear" data-hear>▶ Hear</button><button class="small" data-open>Open in Ideas</button></div></div>` : `<div class="hint">No chords yet. Confirm a progression on Listen and press Keep in Ideas, or <button class="small" data-fromcurrent>use the current progression</button>.</div>`}
      <div class="row between"><h3>Lyrics</h3><button class="small ghost" data-edit>${sec.editing ? 'Done' : (sec.lyrics ? 'Edit' : 'Write')}</button></div>
      ${sec.editing ? `<textarea class="lyr" data-lyr placeholder="Type the words. Put a chord in brackets right before the syllable it lands on: [Am7]When the [Fmaj7]night comes [G]down" aria-label="Lyrics">${esc(sec.lyrics)}</textarea>
        <div class="insert" data-insert><span class="hint">Insert:</span>${idea ? idea.chords.map((c, i) => `<button data-ins="${i}">${chordInner(c, key)}</button>`).join('') : ''}<button class="ghost" data-place title="Put the progression's chords at the start of each line">Place on lines</button></div>`
        : `<div class="lyrics ${sec.lyrics ? '' : 'plain'}" data-view>${sec.lyrics ? lyricsHTML(sec.lyrics, key) : '<span class="ln">No lyrics yet.</span>'}</div>`}`;
    el.querySelector('[data-name]').addEventListener('change', (e) => { sec.name = e.target.value.trim() || sec.name; save(); });
    el.querySelector('[data-menu]').addEventListener('click', () => sectionMenu(song, sec, si));
    el.querySelectorAll('[data-idea]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.idea === 'add') { if (!S.prog.length) { toast('Nothing to add yet — confirm a progression on Listen'); return; } addIdea(sec, S.prog, `From Ideas · ${R.STYLES[S.style].name}`, ''); save(); renderSong(); toast(`Idea ${String.fromCharCode(64 + sec.ideas.length)} added to ${sec.name}`); return; }
      sec.active = +b.dataset.idea; save(); renderSong();
    }));
    const fc = el.querySelector('[data-fromcurrent]'); if (fc) fc.addEventListener('click', () => { if (!S.prog.length) { toast('Nothing to add yet — confirm a progression on Listen'); return; } addIdea(sec, S.prog, `From Listen · ${R.STYLES[S.style].name}`, ''); save(); renderSong(); });
    if (idea) {
      el.querySelectorAll('[data-chips] .chip').forEach((ch, i) => ch.addEventListener('click', () => { const saved = S.key; S.key = key; playChord(idea.chords[i]); S.key = saved; setBrandHue(ch); }));
      el.querySelector('[data-hear]').addEventListener('click', () => playProg(idea.chords, key, S.style, el.querySelector('[data-chips]')));
      el.querySelector('[data-open]').addEventListener('click', () => { S.prog = idea.chords.map(c => Object.assign({}, c, { changed: undefined })); S.key = Object.assign({}, key); S.keyLocked = true; S.openCard = -1; save(); showTab('ideas'); toast(`${sec.name} · ${String.fromCharCode(65 + sec.active)} is now your progression`); });
    }
    el.querySelector('[data-edit]').addEventListener('click', () => { sec.editing = !sec.editing; save(); renderSong(); if (sec.editing) setTimeout(() => { const ta = document.querySelector(`textarea[data-lyr]`); }, 0); });
    const ta = el.querySelector('[data-lyr]');
    if (ta) {
      let t; ta.addEventListener('input', () => { sec.lyrics = ta.value; clearTimeout(t); t = setTimeout(save, 400); });
      el.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => { const c = idea.chords[+b.dataset.ins]; insertAtCursor(ta, `[${T.chordSymbol(c, key, { style: S.settings.symbols })}]`); sec.lyrics = ta.value; save(); }));
      el.querySelector('[data-place]').addEventListener('click', () => { if (!idea) { toast('Add an idea first'); return; } sec.lyrics = placeOnLines(ta.value, idea.chords, key); ta.value = sec.lyrics; save(); });
    }
    return el;
  }
  function insertAtCursor(ta, text) { const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s; ta.value = ta.value.slice(0, s) + text + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + text.length; ta.focus(); ta.dispatchEvent(new Event('input')); }
  function placeOnLines(text, chords, key) {
    let k = 0; return text.split('\n').map(line => { if (!line.trim() || /\[[^\]]+\]/.test(line)) return line; const c = chords[k % chords.length]; k++; return `[${T.chordSymbol(c, key, { style: S.settings.symbols })}]` + line; }).join('\n');
  }
  function parseLyricLine(line) {
    const segs = []; const re = /\[([^\]]+)\]/g; let last = 0, m, cur = null;
    while ((m = re.exec(line))) { const text = line.slice(last, m.index); if (cur || text) segs.push({ chord: cur, text }); cur = m[1]; last = re.lastIndex; }
    segs.push({ chord: cur, text: line.slice(last) });
    return segs.filter((s, i) => s.chord || s.text || i === 0);
  }
  function lyricsHTML(text, key) {
    return text.split('\n').map(line => {
      if (!line.trim()) return '<span class="ln">&nbsp;</span>';
      const segs = parseLyricLine(line);
      if (!segs.some(s => s.chord)) return `<span class="ln">${esc(line)}</span>`;
      return `<span class="ln">${segs.map(s => { let ch = '&nbsp;', style = ''; if (s.chord) { const c = T.parseChord(s.chord); if (c) { ch = chordInner(c, key); style = M.vars(moodOf(c, key)); } else ch = esc(s.chord); } return `<span class="seg ${s.text ? '' : 'empty'}"><span class="ch" style="${style}">${ch}</span><span class="tx">${esc(s.text) || '&nbsp;'}</span></span>`; }).join('')}</span>`;
    }).join('');
  }
  function chartText(song) {
    const lines = [`${song.title || 'Untitled'} — ${T.keyName(song.key)} · ${song.bpm} bpm`, ''];
    for (const sec of song.sections) {
      const idea = sec.ideas[sec.active]; const key = idea ? idea.key : song.key;
      lines.push(`[${sec.name}]${idea ? '  ' + idea.chords.map(c => T.chordSymbol(c, key, { ascii: false })).join(' – ') + '   (' + R.describe(idea.chords, key) + ')' : ''}`);
      if (sec.lyrics) for (const line of sec.lyrics.split('\n')) {
        const segs = parseLyricLine(line);
        if (!segs.some(s => s.chord)) { lines.push(line); continue; }
        let cl = '', tl = '';
        for (const s of segs) { if (s.chord) { while (cl.length < tl.length) cl += ' '; cl += s.chord; } tl += s.text; while (tl.length < cl.length + 1 && s !== segs[segs.length - 1]) tl += ' '; }
        lines.push(cl, tl);
      }
      lines.push('');
    }
    return lines.join('\n');
  }
  async function downloadFile(name, data, mime) {
    try {
      if (window.claude && window.claude.use) { // inside the claude.ai viewer: files go through its own save prompt
        const dl = await window.claude.use('downloads');
        if (dl) { if (/\.mid$/.test(name)) { toast('MIDI files can only be saved from the installed app or the web link'); return; } await dl.save({ filename: name, data: new Blob([data], { type: mime }) }); return; }
      }
      const blob = data instanceof Uint8Array ? new Blob([data], { type: mime }) : new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
      toast(`${name} saved`);
    } catch (e) { toast('Could not save the file here'); }
  }
  function leadSheetData(song) {
    return { title: song.title, key: song.key, bpm: song.bpm || S.settings.bpm, sections: song.sections.map(sec => { const idea = sec.ideas[sec.active]; const key = idea ? idea.key : song.key; return { name: sec.name, chords: idea ? idea.chords.map(c => ({ sym: T.chordSymbol(c, key), rn: T.romanNumeral(c, key), beats: c.beats || 4 })) : [], lyrics: sec.lyrics ? sec.lyrics.split('\n').map(line => { const segs = parseLyricLine(line); if (!segs.some(x => x.chord)) return { chordLine: '', textLine: line }; let cl = '', tl = ''; for (const x of segs) { if (x.chord) { while (cl.length < tl.length) cl += ' '; cl += x.chord; } tl += x.text; while (tl.length < cl.length + 1 && x !== segs[segs.length - 1]) tl += ' '; } return { chordLine: cl, textLine: tl }; }) : null }; }) };
  }
  function copyText(text, okMsg) {
    const done = () => toast(okMsg || 'Copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback()); else fallback();
    function fallback() { sheet(`<h2>Copy</h2><div class="hint">Select all and copy.</div><textarea class="lyr" style="min-height:220px">${esc(text)}</textarea>`, (el) => { const ta = el.querySelector('textarea'); ta.focus(); ta.select(); }); }
  }
  $('songTitle').addEventListener('change', (e) => { const s = currentSong(); if (s) { s.title = e.target.value.trim(); save(); } });
  $('addSection').addEventListener('click', () => { const s = ensureSong(); newSection(s, nextSectionName(s)); save(); renderSong(); });
  $('exportBtn').addEventListener('click', () => {
    const song = currentSong(); if (!song) { toast('No song yet'); return; }
    sheet(`<h2>Export</h2><div class="list"><button id="exPdf"><b>Lead sheet (PDF)</b><small style="margin-left:auto;color:var(--muted)">chords in bars, numerals, lyrics</small></button><button id="exMidi"><b>Voicings (MIDI)</b><small style="margin-left:auto;color:var(--muted)">every section, for Logic or Ableton</small></button><button id="exChart"><b>Copy chord chart</b><small style="margin-left:auto;color:var(--muted)">chords over lyrics, as text</small></button><button id="exJson"><b>Copy backup (JSON)</b><small style="margin-left:auto;color:var(--muted)">all songs</small></button><button id="imJson"><b>Restore from backup</b></button></div>${window.top !== window.self ? '<div class="hint">Downloads do not work inside this preview; use the installed app or the web link.</div>' : ''}`, (el) => {
      el.querySelector('#exPdf').addEventListener('click', () => { closeSheet(); downloadFile(`${(song.title || 'Untitled').replace(/[^\w\- ]+/g, '')}.pdf`, Export.leadSheetPDF(leadSheetData(song), T.keyName(song.key)), 'application/pdf'); });
      el.querySelector('#exMidi').addEventListener('click', () => { closeSheet(); const items = []; for (const sec of song.sections) { const idea = sec.ideas[sec.active]; if (idea) items.push(...progItems(idea.chords, idea.key, S.style).map(it => it.events ? it : it)); } if (!items.length) { toast('No chords to export yet'); return; } downloadFile(`${(song.title || 'Untitled').replace(/[^\w\- ]+/g, '')}.mid`, Export.midiFile(items, song.bpm || S.settings.bpm, song.title || 'Changes'), 'audio/midi'); });
      el.querySelector('#exChart').addEventListener('click', () => { closeSheet(); copyText(chartText(song), 'Chart copied'); });
      el.querySelector('#exJson').addEventListener('click', () => { closeSheet(); copyText(JSON.stringify({ changes: 1, songs: S.songs }, null, 1), 'Backup copied'); });
      el.querySelector('#imJson').addEventListener('click', () => { sheet(`<h2>Restore</h2><div class="hint">Paste a backup here. Songs are added; nothing is deleted.</div><textarea class="lyr" id="imTa" placeholder="{ &quot;changes&quot;: 1, ... }"></textarea><div class="row"><button class="primary" id="imGo">Restore</button></div>`, (e2) => { e2.querySelector('#imGo').addEventListener('click', () => { try { const d = JSON.parse(e2.querySelector('#imTa').value); if (!d.songs) throw 0; const ids = new Set(S.songs.map(s => s.id)); let n = 0; d.songs.forEach(s => { if (!ids.has(s.id)) { S.songs.push(s); n++; } }); save(); closeSheet(); renderSong(); toast(`${n} song${n === 1 ? '' : 's'} restored`); } catch (e) { toast('That is not a Changes backup'); } }); }); });
    });
  });
  function songsSheet() {
    sheet(`<h2>Songs</h2><div class="list" id="songList">${S.songs.map(s => `<button class="songrow" data-song="${s.id}"><b>${esc(s.title || 'Untitled song')}</b><small>${esc(T.keyShort(s.key))} · ${s.sections.length} sec</small></button>`).join('') || '<div class="hint">No songs yet.</div>'}</div><div class="row"><button class="primary" id="newSong2">New song</button></div>`, (el) => {
      el.querySelectorAll('[data-song]').forEach(b => b.addEventListener('click', () => { S.songId = b.dataset.song; save(); closeSheet(); renderSong(); }));
      el.querySelector('#newSong2').addEventListener('click', () => { newSong(); closeSheet(); renderSong(); });
    });
  }
  $('songsBtn').addEventListener('click', songsSheet);
  function sectionMenu(song, sec, si) {
    sheet(`<h2>${esc(sec.name)}</h2><div class="list">
      <button id="smUp" ${si === 0 ? 'disabled' : ''}>Move up</button><button id="smDown" ${si === song.sections.length - 1 ? 'disabled' : ''}>Move down</button>
      <button id="smDup">Duplicate section</button>
      ${sec.ideas.length ? `<button id="smDelIdea">Delete idea ${String.fromCharCode(65 + sec.active)}</button>` : ''}
      <button id="smDel" style="color:var(--warn)">Delete section</button>
      <button id="smDelSong" style="color:var(--warn)">Delete this song</button></div>`, (el) => {
      el.querySelector('#smUp').addEventListener('click', () => { song.sections.splice(si - 1, 0, song.sections.splice(si, 1)[0]); save(); closeSheet(); renderSong(); });
      el.querySelector('#smDown').addEventListener('click', () => { song.sections.splice(si + 1, 0, song.sections.splice(si, 1)[0]); save(); closeSheet(); renderSong(); });
      el.querySelector('#smDup').addEventListener('click', () => { const copy = JSON.parse(JSON.stringify(sec)); copy.id = uid(); copy.name = sec.name + ' (copy)'; copy.editing = false; song.sections.splice(si + 1, 0, copy); save(); closeSheet(); renderSong(); });
      const di = el.querySelector('#smDelIdea'); if (di) di.addEventListener('click', () => { sec.ideas.splice(sec.active, 1); sec.active = Math.max(0, sec.active - 1); save(); closeSheet(); renderSong(); });
      el.querySelector('#smDel').addEventListener('click', () => { song.sections.splice(si, 1); save(); closeSheet(); renderSong(); });
      el.querySelector('#smDelSong').addEventListener('click', () => { sheet(`<h2>Delete “${esc(song.title || 'Untitled song')}”?</h2><div class="hint">This cannot be undone.</div><div class="row"><button class="small ghost" id="cDelNo">Keep it</button><button class="primary" id="cDelYes" style="background:var(--warn);border-color:var(--warn);color:#fff">Delete</button></div>`, (e2) => { e2.querySelector('#cDelNo').addEventListener('click', closeSheet); e2.querySelector('#cDelYes').addEventListener('click', () => { S.songs = S.songs.filter(s => s.id !== song.id); S.songId = S.songs[0] ? S.songs[0].id : null; save(); closeSheet(); renderSong(); }); }); });
    });
  }

  // ---------- CIRCLE ----------
  function renderCircle() {
    const host = $('circle'); const mode = S.circleMode;
    $('modeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    const W = 400, cx = 200, cy = 200;
    const seg = (r0, r1, i) => { const a0 = (i - 0.5) / 12 * Math.PI * 2 - Math.PI / 2 + 0.012, a1 = (i + 0.5) / 12 * Math.PI * 2 - Math.PI / 2 - 0.012; const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; return `M ${p(r0, a0)} A ${r0} ${r0} 0 0 1 ${p(r0, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`; };
    const mid = (r, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    let s = `<svg viewBox="0 0 ${W} ${W}" role="group" aria-label="Circle of fifths">`;
    for (let i = 0; i < 12; i++) {
      const pcMaj = (i * 7) % 12, pcMin = (pcMaj + 9) % 12;
      const hm = M.hueFor(pcMaj, S.key), hn = M.hueFor(pcMin, S.key);
      const curMaj = S.key.mode === 'major' && S.key.tonic === pcMaj, curMin = S.key.mode === 'minor' && S.key.tonic === pcMin;
      const relMaj = S.key.mode === 'major' ? pcMaj === S.key.tonic : pcMaj === (S.key.tonic + 3) % 12;
      const dia = (pc) => T.keyScale(S.key).some(d => d.pc === pc);
      s += `<path d="${seg(190, 136, i)}" data-tonic="${pcMaj}" data-mode="major" fill="hsl(${hm.hue} ${dia(pcMaj) ? 58 : 28}% calc(${dia(pcMaj) ? 42 : 30}% + var(--lshift) * 0.6))" stroke="${curMaj ? 'var(--accent)' : 'var(--bg)'}" stroke-width="${curMaj ? 3 : 2}" style="cursor:pointer"/>`;
      s += `<path d="${seg(132, 86, i)}" data-tonic="${pcMin}" data-mode="minor" fill="hsl(${hn.hue} ${dia(pcMin) ? 50 : 22}% calc(${dia(pcMin) ? 34 : 24}% + var(--lshift) * 0.6))" stroke="${curMin ? 'var(--accent)' : 'var(--bg)'}" stroke-width="${curMin ? 3 : 2}" style="cursor:pointer"/>`;
      const [mx, my] = mid(163, i), [nx, ny] = mid(109, i);
      s += `<text x="${mx.toFixed(1)}" y="${(my + 6).toFixed(1)}" text-anchor="middle" font-size="19" fill="#fff" fill-opacity="${dia(pcMaj) ? 1 : .7}">${esc(T.MAJOR_TONIC_NAME[pcMaj])}</text>`;
      s += `<text x="${nx.toFixed(1)}" y="${(ny + 5).toFixed(1)}" text-anchor="middle" font-size="14" fill="#fff" fill-opacity="${dia(pcMin) ? .95 : .65}">${esc(T.MINOR_TONIC_NAME[pcMin])}m</text>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="78" fill="var(--panel2)" stroke="var(--line)"/>`;
    s += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="30" fill="var(--fg)">${esc(T.keyShort(S.key))}</text><text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="12" fill="var(--muted)" style="font-family:var(--body);font-weight:500">${S.key.mode}</text>`;
    s += '</svg>';
    host.innerHTML = s;
    host.querySelectorAll('path[data-tonic]').forEach(p => p.addEventListener('click', () => { S.key = { tonic: +p.dataset.tonic, mode: p.dataset.mode }; S.keyLocked = true; S.circleMode = p.dataset.mode; afterKeyChange(); const tonicChord = { root: S.key.tonic, q: S.key.mode === 'major' ? 'maj' : 'min' }; playChord(tonicChord, 1.4); }));
    renderFamilies();
  }
  $('modeSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.circleMode = b.dataset.mode; S.key = { tonic: S.key.tonic, mode: b.dataset.mode }; S.keyLocked = true; afterKeyChange(); }));
  function renderFamilies() {
    const host = $('families'); const k = S.key; const t = k.tonic; const major = k.mode === 'major';
    const sc = T.keyScale(k);
    const sev = PAD_Q[k.mode].sev;
    const fam = [];
    fam.push(['Diatonic', sc.map((d, i) => ({ root: d.pc, q: sev[i] }))]);
    if (major) {
      fam.push(['Borrowed from ' + T.keyName({ tonic: t, mode: 'minor' }), [{ root: t + 5, q: 'm6' }, { root: t + 8, q: 'maj7' }, { root: t + 10, q: '7' }, { root: t + 3, q: 'maj7' }, { root: t + 2, q: 'm7b5' }, { root: t + 1, q: 'maj', bass: (t + 5) % 12 }].map(c => Object.assign(c, { root: c.root % 12 }))]);
      fam.push(['Secondary dominants', [[9, 'V7/ii'], [11, 'V7/iii'], [0, 'V7/IV'], [2, 'V7/V'], [4, 'V7/vi']].map(([r, lab]) => ({ root: (t + r) % 12, q: '7', tag: lab }))]);
      fam.push(['Tritone subs', [[1, 'sub V7/I'], [3, 'sub V7/ii'], [6, 'sub V7/iii'], [8, 'sub V7/V'], [10, 'sub V7/vi']].map(([r, lab]) => ({ root: (t + r) % 12, q: '7s11', tag: lab, pref: r === 6 ? 'flat' : undefined }))]);
      fam.push(['Color', [{ root: t, q: '69' }, { root: t + 5, q: 'maj7s11' }, { root: t + 7, q: '13sus4' }, { root: t + 2, q: 'maj', tag: 'Lydian II' }, { root: t + 5, q: 'maj', bass: (t + 7) % 12 }, { root: t + 3, q: 'dim7', tag: 'CT°7' }].map(c => Object.assign(c, { root: c.root % 12 }))]);
    } else {
      fam.push(['Borrowed and raised', [{ root: t + 5, q: 'maj', tag: 'IV (Dorian)' }, { root: t + 7, q: '7b9' }, { root: t + 1, q: 'maj', bass: (t + 5) % 12, tag: 'N⁶' }, { root: t + 11, q: 'dim7', tag: 'vii°7' }, { root: t, q: 'maj', tag: 'Picardy' }, { root: t + 9, q: 'maj', tag: 'VI♯' }].map(c => Object.assign(c, { root: c.root % 12 }))]);
      fam.push(['Secondary dominants', [[10, 'V7/III'], [0, 'V7/iv'], [2, 'V7/V'], [3, 'V7/VI'], [5, 'V7/VII']].map(([r, lab]) => ({ root: (t + r) % 12, q: '7', tag: lab }))]);
      fam.push(['Color', [{ root: t, q: 'm6/9' }, { root: t, q: 'm11' }, { root: t + 8, q: 'maj9' }, { root: t + 3, q: 'maj9' }, { root: t + 7, q: '7alt' }, { root: t + 10, q: '13' }].map(c => Object.assign(c, { root: c.root % 12 }))]);
    }
    host.innerHTML = `<div class="row between"><h2>Chords in ${esc(T.keyName(k))}</h2><span class="hint">tap to hear · + adds to Listen</span></div>` + fam.map(([name, chords], fi) => `<div class="family"><h3>${esc(name)}</h3><div class="chips">${chords.map((c, i) => `<span class="row nowrap" style="gap:2px">${chipHTML(c, k, { cls: 'sm', mood: moodOf(c, k) })}<button class="small ghost icon" data-add="${fi}:${i}" aria-label="Add ${esc(speak(c, k))} to the progression" style="min-height:36px;min-width:30px;padding:0 6px">+</button></span>`).join('')}</div></div>`).join('') + `<div id="famChart"></div>`;
    host.querySelectorAll('.family').forEach((fe, fi) => fe.querySelectorAll('.chip').forEach((ch, i) => ch.addEventListener('click', () => { const c = fam[fi][1][i]; playChord(c); setBrandHue(ch); const fc = $('famChart'); fc.innerHTML = ''; const a = T.analyze(c, k); const m = moodOf(c, k); fc.innerHTML = `<div class="notice"><b>${esc(sym(c, k))}</b> · ${esc(c.tag || a.secondary || T.romanNumeral(c, k))} · <b>${esc(m.words.join(', '))}</b></div>`; fc.appendChild(chartEl([c], k, S.style)); })));
    host.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { const [fi, i] = b.dataset.add.split(':').map(Number); const c = fam[fi][1][i]; addChord({ root: c.root, q: c.q, bass: c.bass ?? null, beats: 4, src: 'tap', pref: c.pref }); toast(`${sym(c, k)} added — ${S.prog.length} chord${S.prog.length === 1 ? '' : 's'} on Listen`); }));
  }

  // ---------- SETTINGS ----------
  function settingsSheet() {
    const st = S.settings;
    sheet(`<h2>Settings</h2>
      <div class="field"><label>Instrument</label><div class="seg" id="sInst">${['piano', 'guitar', 'both'].map(v => `<button data-v="${v}" class="${st.instrument === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
      <div class="field"><label>Chord symbols</label><div class="seg" id="sSym"><button data-v="plain" class="${st.symbols === 'plain' ? 'on' : ''}">Cmaj7 · Cm7 · Cm7♭5</button><button data-v="jazz" class="${st.symbols === 'jazz' ? 'on' : ''}">CΔ7 · C-7 · Cø7</button></div></div>
      <div class="field"><label>Piano chart</label><div class="row"><button class="small ${st.twoHands ? 'on' : ''}" id="sHands">Two hands</button><div class="seg" id="sSpan"><button data-v="small" class="${st.span === 'small' ? 'on' : ''}">Small hands</button><button data-v="default" class="${st.span === 'default' ? 'on' : ''}">A tenth</button></div></div></div>
      <div class="field"><label>Guitar chart</label><div class="row"><button class="small ${st.fingers ? 'on' : ''}" id="sFingers">Finger numbers</button></div></div>
      <div class="field"><label>Sound</label><div class="seg" id="sTone"><button data-v="grand" class="${st.sound && st.tone !== 'ep' ? 'on' : ''}">Grand piano</button><button data-v="ep" class="${st.sound && st.tone === 'ep' ? 'on' : ''}">Electric piano</button><button data-v="off" class="${!st.sound ? 'on' : ''}">Off</button></div><div class="row"><div class="seg" id="sFeel"><button data-v="hold" class="${st.feel === 'hold' ? 'on' : ''}">Hold</button><button data-v="groove" class="${st.feel === 'groove' ? 'on' : ''}">Groove</button><button data-v="asPlayed" class="${st.feel === 'asPlayed' ? 'on' : ''}" ${S.take ? '' : 'disabled title="Record a MIDI take first"'}>As played</button></div><span class="hint">${A.PIANO.source === 'hosted' ? 'Salamander grand, full set' : A.PIANO.source === 'embedded' ? 'Salamander grand, compact set' : 'grand unavailable here'} · the EP is a tine-model synth</span></div><div class="hint">No sound on iPhone? Flip the ring/silent switch, or turn the volume up — the app tries to play through the media channel, but the switch wins on some iOS versions.</div></div>
      <div class="field"><label>Tempo <span id="sBpmLbl" style="font-family:var(--mono);color:var(--fg)">${st.bpm}</span> bpm</label><input type="range" id="sBpm" min="50" max="140" value="${st.bpm}"></div>
      <div class="field"><label>Look</label><div class="seg" id="sLook"><button data-v="night" class="${st.look === 'night' ? 'on' : ''}">Night</button><button data-v="paper" class="${st.look === 'paper' ? 'on' : ''}">Paper</button></div></div>
      <div class="field"><label>Account and sync</label><div id="sAcct">${accountHTML()}</div></div>
      <div class="field"><label>About</label><div class="hint">Changes ${esc(BUILD)}. Recognition, suggestions, voicings and sound all run on this device; nothing is uploaded. The vocabulary is written by musicians, not generated — every option says why. Piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0).</div><div class="row"><button class="small ghost" id="sOnboard">Show the welcome again</button></div></div>`, (el) => {
      const upd = () => { save(); applyLook(); if (S.tab === 'ideas') recompute(); if (S.tab === 'listen') { renderPad(); renderHeard(); } if (S.tab === 'song') renderSong(); if (S.tab === 'circle') renderCircle(); };
      el.querySelectorAll('#sInst button').forEach(b => b.addEventListener('click', () => { st.instrument = b.dataset.v; el.querySelectorAll('#sInst button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('#sSym button').forEach(b => b.addEventListener('click', () => { st.symbols = b.dataset.v; el.querySelectorAll('#sSym button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelector('#sHands').addEventListener('click', (e) => { st.twoHands = !st.twoHands; e.currentTarget.classList.toggle('on', st.twoHands); upd(); });
      el.querySelectorAll('#sSpan button').forEach(b => b.addEventListener('click', () => { st.span = b.dataset.v; el.querySelectorAll('#sSpan button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelector('#sFingers').addEventListener('click', (e) => { st.fingers = !st.fingers; e.currentTarget.classList.toggle('on', st.fingers); upd(); });
      el.querySelectorAll('#sTone button').forEach(b => b.addEventListener('click', () => { const v = b.dataset.v; st.sound = v !== 'off'; if (v !== 'off') st.tone = v; el.querySelectorAll('#sTone button').forEach(x => x.classList.toggle('on', x === b)); A.setTone(st.tone); upd(); if (st.sound) playChord({ root: S.key.tonic, q: S.key.mode === 'major' ? 'maj9' : 'm9' }, 1.6); }));
      el.querySelectorAll('#sFeel button').forEach(b => b.addEventListener('click', () => { st.feel = b.dataset.v; el.querySelectorAll('#sFeel button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelector('#sBpm').addEventListener('input', (e) => { st.bpm = +e.target.value; el.querySelector('#sBpmLbl').textContent = st.bpm; const sg = currentSong(); if (sg) sg.bpm = st.bpm; save(); });
      el.querySelectorAll('#sLook button').forEach(b => b.addEventListener('click', () => { st.look = b.dataset.v; el.querySelectorAll('#sLook button').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      wireAccount(el);
      el.querySelector('#sOnboard').addEventListener('click', () => { S.onboarded = false; save(); closeSheet(); renderOnboard(); showTab('listen'); });
    });
  }
  $('settingsBtn').addEventListener('click', settingsSheet);
  function accountHTML() {
    if (!Sync.configured()) return `<div class="hint">Sync is not switched on in this build yet. Songs stay on this device; use Export → backup to move them.</div>`;
    if (Sync.ST.user) return `<div class="row between"><span>Signed in as <b>${esc(Sync.ST.user.email || '')}</b></span><div class="row"><button class="small" id="acctSync">Sync now</button><button class="small ghost" id="acctOut">Sign out</button></div></div><div class="hint">${Sync.ST.last ? 'Last synced ' + new Date(Sync.ST.last).toLocaleTimeString() : 'Songs sync a few seconds after every change.'}</div>`;
    return `<div class="typerow"><input id="acctEmail" type="email" placeholder="you@email.com" autocomplete="email"><button class="small primary" id="acctGo">Send sign-in link</button></div><div class="hint">No password: a link arrives by email and signs this device in. Your songs then follow you to the phone and the laptop.</div>`;
  }
  function wireAccount(el) {
    const go = el.querySelector('#acctGo'); if (go) go.addEventListener('click', async () => { const em = el.querySelector('#acctEmail').value.trim(); if (!em) return; go.disabled = true; const r = await Sync.signIn(em); toast(r.ok ? 'Check your email for the link' : 'Could not send the link: ' + r.reason, 4000); go.disabled = false; });
    const out = el.querySelector('#acctOut'); if (out) out.addEventListener('click', () => { Sync.signOut(); el.querySelector('#sAcct').innerHTML = accountHTML(); wireAccount(el); });
    const sy = el.querySelector('#acctSync'); if (sy) sy.addEventListener('click', async () => { sy.disabled = true; await syncNow(); sy.disabled = false; el.querySelector('#sAcct').innerHTML = accountHTML(); wireAccount(el); });
  }
  async function syncNow() {
    if (!Sync.ST.session) return;
    const remote = await Sync.pull(); if (remote) { const m = Sync.merge(S.songs, remote); if (m.changed) { S.songs = m.songs; if (S.tab === 'song') renderSong(); } }
    await Sync.push(S.songs); toast('Synced');
  }
  function applyLook() { document.documentElement.setAttribute('data-look', S.settings.look === 'paper' ? 'paper' : 'night'); const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', S.settings.look === 'paper' ? '#f1efe9' : '#0d0f14'); }

  // ---------- onboarding ----------
  function renderOnboard() {
    const p = $('onboardPanel');
    if (S.onboarded) { p.hidden = true; return; }
    p.hidden = false;
    p.innerHTML = `<div class="onboard"><div><h2>Play it. Hear where it could go.</h2><div class="hint">Changes listens to a progression — microphone, MIDI, or tapped in — and shows where the harmony could go next in the language of gospel, neo-soul, jazz, pop, classical and film, with every voicing drawn on keys and frets. Then you play it. Nothing is generated for you; every option says why.</div></div>
      <div class="field"><label>Your instrument</label><div class="pick" id="obInst">${['piano', 'guitar', 'both'].map(v => `<button data-v="${v}" class="${S.settings.instrument === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
      <div class="field"><label>The two styles you live in</label><div class="stylepick" id="obStyles">${R.STYLE_ORDER.map(id => `<button class="small ${S.settings.styles.includes(id) ? 'on' : ''}" data-s="${id}">${esc(R.STYLES[id].name)}</button>`).join('')}</div></div>
      <div class="row"><button class="primary" id="obGo">Start</button><button class="ghost" id="obDemo">Try it with C – Am – F – G</button></div></div>`;
    p.querySelectorAll('#obInst button').forEach(b => b.addEventListener('click', () => { S.settings.instrument = b.dataset.v; p.querySelectorAll('#obInst button').forEach(x => x.classList.toggle('on', x === b)); }));
    p.querySelectorAll('#obStyles button').forEach(b => b.addEventListener('click', () => { const id = b.dataset.s; const i = S.settings.styles.indexOf(id); if (i >= 0) S.settings.styles.splice(i, 1); else { S.settings.styles.push(id); if (S.settings.styles.length > 2) S.settings.styles.shift(); } p.querySelectorAll('#obStyles button').forEach(x => x.classList.toggle('on', S.settings.styles.includes(x.dataset.s))); }));
    const finish = () => { S.onboarded = true; if (S.settings.styles[0]) S.style = S.settings.styles[0]; save(); p.hidden = true; };
    p.querySelector('#obGo').addEventListener('click', () => { finish(); unlockAudio(); });
    p.querySelector('#obDemo').addEventListener('click', () => { finish(); unlockAudio(); S.prog = T.parseProgression('C | Am | F | G').map(c => Object.assign(c, { src: 'type' })); S.keyLocked = false; detectKey(true); renderHeard(); showTab('ideas'); });
  }

  // ---------- boot ----------
  async function boot() {
    load(); applyLook();
    try { Sync.loadSession(); if (await Sync.completeFromHash()) { toast('Signed in'); } if (Sync.ST.session) syncNow().catch(() => {}); } catch (e) { /* offline */ } renderKey(); ringPaths(); renderPad(); renderHeard(); renderLens(); renderOnboard();
    setInputMode(S.inputMode || 'mic');
    if (!S.prog.length && !S.onboarded) { /* first run: the welcome card leads */ }
    // piano: full set when hosted next to piano/ (or one folder up, as inside the Shed site), else the compact embedded set
    let embedded = null;
    try { const raw = $('pianoData').textContent.trim(); if (raw && raw !== '__PIANO_DATA__' && raw[0] === '{') embedded = JSON.parse(raw); } catch (e) { embedded = null; }
    let base = null;
    if (/^https?:/.test(location.protocol)) {
      for (const b of ['piano/', '../piano/']) { try { const r = await fetch(b + 'index.json', { method: 'GET', cache: 'force-cache' }); if (r.ok) { const j = await r.json(); if (j && j['60']) { base = b; break; } } } catch (e) { /* try next */ } }
    }
    await A.pianoInit({ base, embedded });
    // warm the cache on the first touch anywhere (needs a user gesture on iOS)
    const warm = () => { unlockAudio(); A.pianoPreload(36, 84).catch(() => {}); document.removeEventListener('pointerdown', warm); };
    document.addEventListener('pointerdown', warm, { once: true });
    // service worker (hosted only)
    if ('serviceWorker' in navigator && window.top === window.self && /^https?:/.test(location.protocol) && !/claude\.ai|claudeusercontent|artifact/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js?b=' + BUILD).then(reg => { reg.update().catch(() => {}); }).catch(() => {});
      navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'changes-updated' && e.data.build !== BUILD) { toast('A new version is ready — reopen the app to update', 4000); } });
    }
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }
  boot();
})();
