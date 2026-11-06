/* ============================================================
   EARS — Exercise generators (pitched modules)
   Each generator returns an "exercise" object:
   { module, type, level, prompt, hint, audio:{events}, context:{events}|null,
     answerKind:'choice'|'sequence'|'multi', options, palette, answer, items, explain, visual, compare(fn) }
   ============================================================ */
(function (E) {
  const U = E.U, rnd = U.rnd, choice = U.choice, shuffle = U.shuffle;

  /* ---------- shared helpers ---------- */
  function tonicMidiFor(pc) { pc = E.mod12(pc); return pc <= 6 ? 60 + pc : 48 + pc; }
  function chordEvents(voicings, start, dur, gap, timbre, vel) {
    return voicings.map((v, i) => ({ at: start + i * (dur + gap), dur, notes: [v.bass].concat(v.upper), timbre, vel: vel || 0.75 }));
  }
  function cadenceEvents(tonicPc, minor, short, timbre) {
    const vs = E.cadenceChords(tonicPc, minor, short);
    const dur = 0.62, gap = 0.04;
    const evs = chordEvents(vs, 0, dur, gap, timbre, 0.7);
    evs[evs.length - 1].dur = 0.9;
    return { events: evs, end: (dur + gap) * (vs.length - 1) + 0.9 };
  }
  // la-based minor display
  const LA_MAP = { do: 'La', re: 'Ti', me: 'Do', fa: 'Re', sol: 'Mi', le: 'Fa', te: 'Sol', ti: 'Si', la: 'Fi', ra: 'Te', se: 'Me', fi: 'Ri' };
  function sylLabel(id, minorCtx, system) {
    if (system === 'num') return E.SOL[id].num;
    if (system === 'la' && minorCtx && LA_MAP[id]) return LA_MAP[id];
    return E.SYL_NAME[id];
  }
  function keyboardFor(notes, roles) {
    const lo = Math.min(...notes) - 2, hi = Math.max(...notes) + 2;
    const hl = {}; notes.forEach((n, i) => hl[n] = roles ? roles[i] : 'note');
    return { lo: Math.max(36, lo), hi: Math.min(96, hi), hl };
  }

  /* ================= INTERVALS ================= */
  const SIMPLE12 = ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
  const COMPOUND = ['m9', 'M9', '♯9', 'P11', '♯11', '♭13', 'M13'];
  const INT_LEVELS = {
    1: { ids: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'P8'], dirs: ['asc'] },
    2: { ids: SIMPLE12, dirs: ['asc', 'asc', 'desc'] },
    3: { ids: SIMPLE12, dirs: ['asc', 'desc', 'harm', 'harm'] },
    4: { ids: SIMPLE12.concat(COMPOUND), dirs: ['asc', 'harm'] },
    5: { ids: SIMPLE12.concat(COMPOUND), dirs: ['asc', 'desc', 'harm'] }
  };
  const DIR_NAME = { asc: 'ascending', desc: 'descending', harm: 'harmonic' };
  function genInterval(level, o) {
    o = o || {};
    const L = INT_LEVELS[level] || INT_LEVELS[5];
    let id, dir;
    if (o.target) { [id, dir] = o.target.split(':'); }
    else if (o.pair) { id = choice(o.pair); dir = choice(L.dirs); }
    else { id = choice(L.ids); dir = choice(L.dirs); }
    if (!E.INTERVAL_BY_ID[id]) { id = choice(L.ids); }
    if (!L.dirs.includes(dir)) dir = L.dirs[0];
    const iv = E.INTERVAL_BY_ID[id];
    let base, top;
    if (dir === 'desc') { top = rnd(64, 79); base = top - iv.s; }
    else if (dir === 'harm') { base = rnd(50, 68); top = base + iv.s; }
    else { base = rnd(50, 70); top = base + iv.s; }
    const timbre = o.timbre;
    const evs = dir === 'harm'
      ? [{ at: 0, dur: 1.7, notes: [base, top], timbre, vel: 0.8 }]
      : dir === 'desc'
        ? [{ at: 0, dur: 0.75, notes: [top], timbre }, { at: 0.8, dur: 1.0, notes: [base], timbre }]
        : [{ at: 0, dur: 0.75, notes: [base], timbre }, { at: 0.8, dur: 1.0, notes: [top], timbre }];
    const optIds = o.pair ? o.pair.slice() : L.ids.slice();
    const options = optIds.map(k => ({ id: k, label: k, sub: E.INTERVAL_BY_ID[k].n }));
    const flat = E.prefersFlat(base, false);
    const sol = (E.INTERVAL_SOLFEGE[dir === 'desc' ? 'desc' : 'asc'] || {})[id] || '';
    const cue = o.songCues && E.SONG_CUES[dir === 'desc' ? 'desc' : 'asc'][id];
    const explain = `<b>${iv.n}</b> (${id}), ${DIR_NAME[dir]} — ${iv.s} half steps: ${E.midiName(base, flat)} → ${E.midiName(top, flat)}.` +
      (sol ? ` Hear it as <b>${sol}</b>.` : '') + (cue ? ` Song cue: <i>${cue}</i>.` : '');
    const mkEvents = k => { const t = E.INTERVAL_BY_ID[k]; const tp = dir === 'desc' ? top : base + t.s, bs = dir === 'desc' ? top - t.s : base; return dir === 'harm' ? [{ at: 0, dur: 1.4, notes: [bs, tp], timbre }] : dir === 'desc' ? [{ at: 0, dur: 0.6, notes: [tp], timbre }, { at: 0.65, dur: 0.8, notes: [bs], timbre }] : [{ at: 0, dur: 0.6, notes: [bs], timbre }, { at: 0.65, dur: 0.8, notes: [tp], timbre }]; };
    return {
      module: 'intervals', type: dir, level, prompt: `Identify the ${DIR_NAME[dir]} interval`, answerKind: 'choice',
      audio: { events: evs }, context: null, options, answer: id, items: [id + ':' + dir],
      explain, visual: keyboardFor([base, top], ['root', 'note']), compare: mkEvents, correctLabel: id + ' · ' + iv.n
    };
  }

  /* ================= SCALE DEGREES ================= */
  const DEG_RES = Object.assign({ do: 'sol', re: 'do', mi: 're', fa: 'mi', sol: 'do', la: 'sol', ti: 'do' }, E.TENDENCY);
  const MODAL_VAMPS = {
    dorian: ['m:I-7', 'm:IV7'], mixolydian: ['V7/IV', 'bVII'], lydian: ['IMaj7', 'II7x'], phrygian: ['m:I-', 'm:bIIMaj7'], natmin: ['m:I-7', 'm:bVI']
  };
  // special pseudo-token for Lydian II (major triad on 2)
  const EXTRA_TOK = { 'II7x': { root: 2, type: 'maj', lab: 'II', low: 'II' } };
  function tok(t) { return E.TOKENS[t] || EXTRA_TOK[t]; }
  function vampEvents(mode, tonicPc, timbre) {
    const toks = MODAL_VAMPS[mode]; let prev = null; const vs = [];
    for (let r = 0; r < 2; r++) toks.forEach(tk => { const t = tok(tk); const v = E.voiceChord(t.type, E.mod12(tonicPc + t.root), prev, { lo: 55, hi: 76 }); vs.push(v); prev = v; });
    const evs = chordEvents(vs, 0, 0.6, 0.05, timbre, 0.68);
    return { events: evs, end: vs.length * 0.65 + 0.3 };
  }
  function genDegree(level, o) {
    o = o || {};
    const timbre = o.timbre, melT = o.melTimbre || timbre;
    const tonicPc = rnd(0, 11); const tonic = tonicMidiFor(tonicPc);
    let minor = false, mode = null, pool, palette, cadence, keyLabel, cells = 1;
    if (level === 1) { pool = E.DIATONIC_MAJOR; palette = E.DIATONIC_MAJOR; }
    else if (level === 2) { minor = true; pool = ['do', 're', 'me', 'fa', 'sol', 'le', 'te', 'ti', 'la', 'me', 'le', 'te']; palette = ['do', 're', 'me', 'fa', 'sol', 'le', 'la', 'te', 'ti']; }
    else if (level === 3) { mode = choice(['dorian', 'mixolydian', 'lydian', 'phrygian']); pool = E.SCALES[mode].syl; palette = pool; }
    else if (level === 4) { pool = E.DIATONIC_MAJOR.concat(E.CHROMATIC_RAISED, E.CHROMATIC_LOWERED, E.CHROMATIC_RAISED, E.CHROMATIC_LOWERED); palette = E.SOLFEGE.map(s => s.id); }
    else { minor = Math.random() < 0.4; pool = (minor ? E.DIATONIC_MINOR.concat(['ti', 'la']) : E.DIATONIC_MAJOR).concat(E.CHROMATIC_RAISED, E.CHROMATIC_LOWERED); palette = E.SOLFEGE.map(s => s.id); cells = rnd(2, 3); }
    let syls = [];
    if (o.target) { const t = o.target.replace('deg:', ''); if (E.SOL[t]) syls.push(t); }
    while (syls.length < cells) { const s = choice(pool); if (syls.length && syls[syls.length - 1] === s) continue; syls.push(s); }
    if (o.pair && cells === 1) syls = [choice(o.pair)];
    // chromatic at L4: minimum 1 chromatic 60% of time handled by pool weighting
    // audio
    let ctx;
    if (mode) { ctx = vampEvents(mode, tonicPc, timbre); keyLabel = E.pcName(tonicPc, E.prefersFlat(tonicPc, true)) + ' ' + E.SCALES[mode].name; }
    else { ctx = cadenceEvents(tonicPc, minor, o.shortCadence, timbre); keyLabel = E.keyName(tonicPc, minor); }
    const evs = []; let t = 0; const notes = [];
    syls.forEach((s, i) => {
      const pc = E.SOL[s].pc; let m = tonic + pc; if (m > tonic + 9 && Math.random() < 0.5) m -= 12; if (m < 55) m += 12;
      notes.push(m);
      evs.push({ at: t, dur: 0.8, notes: [m], timbre: melT, vel: 0.85 }); t += 0.85;
      if (level === 4 || (level === 5 && !E.DIATONIC_MAJOR.includes(s) && !E.DIATONIC_MINOR.includes(s))) {
        // play resolution
        const r = DEG_RES[s]; if (r && cells === 1) {
          const rp = E.SOL[r].pc; let rm = tonic + rp; const diff = rm - m; if (diff > 6) rm -= 12; if (diff < -6) rm += 12;
          if (E.CHROMATIC_RAISED.includes(s) && rm < m) rm += 12; if (E.CHROMATIC_LOWERED.includes(s) && rm > m) rm -= 12;
          evs.push({ at: t, dur: 0.9, notes: [rm], timbre: melT, vel: 0.7 }); t += 0.95; notes.push(rm);
        }
      }
    });
    const sysLabel = id => sylLabel(id, minor, o.solfege);
    const options = palette.map(id => ({ id, label: sysLabel(id), sub: E.SOL[id].num }));
    const prompt = cells === 1 ? (level === 4 ? 'Which scale degree is the FIRST note? (the second note is its resolution)' : 'Which scale degree did you hear?') : `Name the ${cells} scale degrees in order`;
    const explain = cells === 1
      ? `<b>${sysLabel(syls[0])}</b> (${E.SOL[syls[0]].num}) in ${keyLabel}.` + (level === 4 && DEG_RES[syls[0]] ? ` It resolves to ${sysLabel(DEG_RES[syls[0]])}.` : '') + tendencyTip(syls[0])
      : `<b>${syls.map(sysLabel).join(' – ')}</b> in ${keyLabel}.`;
    const compareFn = chosen => { const pc = E.SOL[chosen] ? E.SOL[chosen].pc : 0; let m = tonic + pc; if (m > tonic + 9) m -= 12; if (m < 55) m += 12; return [{ at: 0, dur: 0.8, notes: [m], timbre: melT }]; };
    return {
      module: 'degrees', type: mode ? 'modal' : (cells > 1 ? 'cells' : 'single'), level, prompt, keyLabel, minorCtx: minor,
      audio: { events: evs }, context: { events: ctx.events, end: ctx.end, label: 'Hear the key' },
      answerKind: cells === 1 ? 'choice' : 'sequence', options, palette: cells > 1 ? options : null, answer: cells === 1 ? syls[0] : syls,
      items: syls.map(s => 'deg:' + s), explain, visual: keyboardFor([tonic].concat(notes), ['root'].concat(notes.map(() => 'note'))), compare: compareFn,
      correctLabel: syls.map(sysLabel).join(' – '), tonic, melTimbre: melT
    };
  }
  function tendencyTip(s) {
    const tips = { ti: ' Ti is the leading tone — it leans up to Do.', fa: ' Fa leans down to Mi.', fi: ' Fi (♯4) pushes up to Sol — the sound of V7/V.', se: ' Se (♭5) falls to Fa.', le: ' Le (♭6) sinks to Sol — the minor-mode colour.', te: ' Te (♭7) falls to La — the sound of V7/IV.', si: ' Si (♯5) rises to La — V7/VI.', ri: ' Ri (♯2) rises to Mi — V7/III.', me: ' Me (♭3) falls to Re — minor third.', di: ' Di (♯1) rises to Re — V7/II.', ra: ' Ra (♭2) falls to Do — Phrygian / subV colour.', la: '', sol: '', mi: '', re: '', do: '' };
    return tips[s] || '';
  }

  /* ================= MELODIC DICTATION ================= */
  const MEL_CFG = {
    1: { scales: ['major'], len: 5, maxLeap: 2, endDo: true, chrom: 0 },
    2: { scales: ['major', 'natmin', 'harmmin'], len: 6, maxLeap: 3, endDo: true, chrom: 0 },
    3: { scales: ['dorian', 'mixolydian', 'lydian', 'phrygian', 'melmin', 'harmmin', 'major'], len: 7, maxLeap: 4, endDo: false, chrom: 0 },
    4: { scales: ['major', 'major', 'natmin'], len: 7, maxLeap: 4, endDo: false, chrom: 1 },
    5: { scales: ['major', 'natmin', 'dorian', 'lydian', 'mixolydian', 'melmin'], len: 8, maxLeap: 6, endDo: false, chrom: 2 }
  };
  function genMelody(level, o) {
    o = o || {}; const cfg = MEL_CFG[level] || MEL_CFG[5];
    const timbre = o.timbre, melT = o.melTimbre || timbre;
    const scaleId = choice(cfg.scales); const sc = E.SCALES[scaleId];
    const minor = ['natmin', 'harmmin', 'melmin', 'dorian', 'phrygian'].includes(scaleId);
    const tonicPc = rnd(0, 11); const tonic = tonicMidiFor(tonicPc);
    // scale degrees as indices over 2 octaves (range tonic-5 .. tonic+16)
    const degs = []; for (let oct = -1; oct <= 1; oct++) sc.iv.forEach((iv, i) => { const m = tonic + iv + 12 * oct; if (m >= tonic - 5 && m <= tonic + 16) degs.push({ m, syl: sc.syl[i] }); });
    degs.sort((a, b) => a.m - b.m);
    const idxOf = m => degs.findIndex(d => d.m === m);
    const startChoices = degs.filter(d => ['do', 'mi', 'sol', 'me'].includes(d.syl) && d.m >= tonic - 1 && d.m <= tonic + 8);
    let cur = idxOf(choice(startChoices).m);
    const seq = [degs[cur]];
    const n = cfg.len - cfg.chrom;
    let lastDir = 0, repeat = 0;
    while (seq.length < n) {
      const r = Math.random();
      let step = r < 0.55 ? 1 : r < 0.8 ? 2 : rnd(3, cfg.maxLeap);
      let dir = Math.random() < 0.5 ? -1 : 1;
      if (lastDir !== 0 && step >= 3) dir = -lastDir;   // leaps change direction
      let ni = cur + dir * step;
      if (ni < 0 || ni >= degs.length) ni = cur - dir * step;
      if (ni < 0 || ni >= degs.length) ni = cur;
      if (ni === cur) { repeat++; if (repeat > 1) continue; } else repeat = 0;
      lastDir = ni > cur ? 1 : ni < cur ? -1 : 0; cur = ni; seq.push(degs[cur]);
    }
    if (cfg.endDo) { // end on nearest do
      const last = seq[seq.length - 1]; const dos = degs.filter(d => d.syl === 'do'); dos.sort((a, b) => Math.abs(a.m - last.m) - Math.abs(b.m - last.m));
      seq[seq.length - 1] = dos[0];
    }
    // chromatic insertions resolving by tendency
    let notes = seq.map(d => ({ m: d.m, syl: d.syl }));
    for (let k = 0; k < cfg.chrom; k++) {
      const pos = rnd(1, notes.length - 1); const target = notes[pos];
      const cands = E.SOLFEGE.filter(s => (E.CHROMATIC_RAISED.includes(s.id) || E.CHROMATIC_LOWERED.includes(s.id)) && E.TENDENCY[s.id] === target.syl && !sc.syl.includes(s.id));
      if (!cands.length) continue;
      const c = choice(cands); const up = E.CHROMATIC_RAISED.includes(c.id);
      notes.splice(pos, 0, { m: target.m + (up ? -1 : 1), syl: c.id, chrom: true });
    }
    const beat = level <= 2 ? 0.62 : 0.55;
    const evs = notes.map((nt, i) => ({ at: i * beat, dur: i === notes.length - 1 ? 1.1 : beat * 0.92, notes: [nt.m], timbre: melT, vel: 0.85 }));
    const ctx = cadenceEvents(tonicPc, minor, o.shortCadence, timbre);
    const paletteIds = (level >= 4 ? E.SOLFEGE.map(s => s.id) : Array.from(new Set(sc.syl.concat(level === 2 ? ['ti', 'la'] : []))));
    const sysLabel = id => sylLabel(id, minor, o.solfege);
    const palette = paletteIds.map(id => ({ id, label: sysLabel(id), sub: E.SOL[id].num }));
    const keyLabel = E.pcName(tonicPc, E.prefersFlat(tonicPc, minor)) + ' ' + sc.name;
    const answer = notes.map(n => n.syl);
    return {
      module: 'melody', type: scaleId, level, prompt: `Melodic dictation — ${notes.length} notes. Enter the solfege.`, keyLabel, minorCtx: minor,
      audio: { events: evs }, context: { events: ctx.events, end: ctx.end, label: 'Hear the key' },
      answerKind: 'sequence', palette, answer, items: answer.map(s => 'deg:' + s),
      explain: `<b>${answer.map(sysLabel).join(' – ')}</b> in ${keyLabel}.` + (notes.some(n => n.chrom) ? ' Chromatic tones resolve by half step in the direction of their tendency.' : ''),
      visual: keyboardFor([tonic].concat(notes.map(n => n.m)), ['root'].concat(notes.map(n => n.chrom ? 'chrom' : 'note'))),
      compare: null, correctLabel: answer.map(sysLabel).join(' – '), melodyMidi: notes.map(n => n.m), tonic, melTimbre: melT
    };
  }

  /* ================= CHORDS ================= */
  const CH_LEVELS = {
    1: ['maj', 'min', 'dim', 'aug'],
    2: ['maj', 'min', 'dim', 'aug', 'maj7', 'dom7', 'm7', 'm7b5', 'dim7', 'sus4', 'sus2'],
    3: ['maj7', 'dom7', 'm7', 'm7b5', 'dim7', 'mMaj7', 'six', 'm6', 'sus7', 'aug7', 'maj', 'min', 'dim', 'aug'],
    4: ['maj9', 'dom9', 'm9', 'dom13', 'dom7b9', 'dom7s9', 'dom7s11', 'maj7s11', 'm11', 'dom7b13', 'six9', 'dom9sus', 'maj7', 'dom7', 'm7', 'm7b5'],
    5: ['alt', 'm9maj7', 'maj7s5', 'maj9', 'dom9', 'm9', 'dom13', 'dom7b9', 'dom7s9', 'dom7s11', 'maj7s11', 'm11', 'dom7b13', 'six9', 'dom9sus', 'mMaj7', 'm7b5', 'dim7']
  };
  function genChord(level, o) {
    o = o || {}; const timbre = o.timbre;
    const set = CH_LEVELS[level] || CH_LEVELS[5];
    if (level >= 3 && !o.target && !o.pair && Math.random() < 0.3) return genInversion(level, o);
    if (o.target && o.target.startsWith('inv:')) return genInversion(level, o);
    let type = o.target ? o.target.replace('ch:', '') : (o.pair ? choice(o.pair) : choice(set));
    if (!E.CHORDS[type]) type = choice(set);
    const rootPc = rnd(0, 11);
    const v = E.voiceChord(type, rootPc, null, { lo: 55, hi: 79 });
    const all = [v.bass].concat(v.upper);
    let evs;
    if (level === 1) {
      evs = [{ at: 0, dur: 1.3, notes: all, timbre, vel: 0.8 }];
      all.forEach((m, i) => evs.push({ at: 1.45 + i * 0.25, dur: 0.5, notes: [m], timbre, vel: 0.75 }));
      evs.push({ at: 1.45 + all.length * 0.25 + 0.2, dur: 1.3, notes: all, timbre, vel: 0.8 });
    } else evs = [{ at: 0, dur: 1.9, notes: all, timbre, vel: 0.8 }];
    const optIds = o.pair ? o.pair : set;
    const options = optIds.map(k => ({ id: k, label: E.CHORDS[k].sym || 'Maj', sub: E.CHORDS[k].name }));
    const flat = E.prefersFlat(rootPc, false);
    const noteNames = all.map(m => E.midiName(m, flat)).join(' ');
    const c = E.CHORDS[type];
    const explain = `<b>${E.pcName(rootPc, flat)}${c.sym}</b> — ${c.name}. Intervals from the root: ${c.iv.map(i => (E.INTERVALS.find(x => x.s === i) || { id: i }).id).join(' ')}. Notes: ${noteNames}.` + chordTip(type);
    const arpEvents = all.map((m, i) => ({ at: i * 0.22, dur: 0.45, notes: [m], timbre })).concat([{ at: all.length * 0.22 + 0.15, dur: 1.2, notes: all, timbre }]);
    const compareFn = chosen => { const cv = E.voiceChord(chosen, rootPc, null, { lo: 55, hi: 79 }); return [{ at: 0, dur: 1.4, notes: [cv.bass].concat(cv.upper), timbre }]; };
    return {
      module: 'chords', type: 'quality', level, prompt: 'Identify the chord quality', answerKind: 'choice',
      audio: { events: evs }, context: { events: arpEvents, end: arpEvents.length * 0.22 + 1.5, label: 'Arpeggiate' },
      options, answer: type, items: ['ch:' + type], explain, visual: keyboardFor(all, ['root'].concat(v.upper.map(() => 'note'))), compare: compareFn,
      correctLabel: (E.CHORDS[type].sym || 'Maj') + ' · ' + c.name
    };
  }
  function chordTip(type) {
    const t = { m7b5: ' Hear the ♭5 darkening a minor 7th — the II chord of minor keys.', dim7: ' Stacked minor thirds: every note can be the root.', aug: ' Stacked major thirds — unstable, symmetrical.', dom7: ' Major triad + ♭7: the tritone between 3 and ♭7 wants to resolve.', maj7: ' Major triad + major 7: the 7th rubs against the root.', mMaj7: ' Minor triad with a major 7 — the harmonic-minor tonic.', six: ' Major triad + 6: no leading tone, restful.', sus4: ' The 4th replaces the 3rd — neither major nor minor.', dom7s11: ' Lydian-dominant colour: the ♯11 on top of a dominant.', alt: ' Altered dominant: ♭9 and ♭13 on top of 3 and ♭7.', dom13: ' Dominant with 9 and 13 — the full jazz V chord.', dom7b9: ' The ♭9 gives a diminished colour on top of the dominant.', dom7s9: ' The famous ♯9 — major 3 and ♯9 (minor 3) together.', m11: ' Minor 7 with the 11 on top — suspended, open.', six9: ' Major with 6 and 9 — the bright, open "end-of-song" chord.', maj7s11: ' Lydian major: Fi over a Maj7.', dom9sus: ' Suspended dominant with 9 — the neo-soul V chord.', m9: ' Minor 7 with the 9 — the smooth II chord of jazz.', maj9: ' Maj7 plus 9 — lush and settled.', m6: ' Minor triad + major 6: Dorian colour.' };
    return t[type] || '';
  }
  function genInversion(level, o) {
    o = o || {}; const timbre = o.timbre;
    const types = level >= 4 ? ['maj', 'min', 'maj7', 'dom7', 'm7', 'm7b5', 'dim7'] : ['maj', 'min', 'maj7', 'dom7', 'm7'];
    const type = choice(types); const n = E.CHORDS[type].iv.length;
    let inv = rnd(0, n - 1);
    if (o.target && o.target.startsWith('inv:')) inv = Math.min(n - 1, +o.target.split(':')[1]);
    const rootMidi = rnd(50, 62);
    const notes = E.inversionVoicing(type, rootMidi, inv);
    const evs = [{ at: 0, dur: 1.8, notes, timbre, vel: 0.8 }];
    const names = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
    const options = []; for (let i = 0; i < n; i++) options.push({ id: String(i), label: names[i], sub: i === 0 ? 'root in bass' : (['3rd', '5th', '7th'][i - 1]) + ' in bass' });
    const flat = E.prefersFlat(rootMidi, false);
    const explain = `<b>${names[inv]}</b> of ${E.pcName(rootMidi, flat)}${E.CHORDS[type].sym} — bass note ${E.midiName(notes[0], flat)}. Listen for which chord tone sits at the bottom.`;
    const arp = notes.map((m, i) => ({ at: i * 0.25, dur: 0.5, notes: [m], timbre }));
    const compareFn = chosen => [{ at: 0, dur: 1.4, notes: E.inversionVoicing(type, rootMidi, +chosen), timbre }];
    return {
      module: 'chords', type: 'inversion', level, prompt: `${E.CHORDS[type].name} — which inversion?`, answerKind: 'choice',
      audio: { events: evs }, context: { events: arp, end: arp.length * 0.25 + 0.6, label: 'Arpeggiate' },
      options, answer: String(inv), items: ['inv:' + inv], explain, visual: keyboardFor(notes, notes.map((m, i) => i === 0 ? 'root' : 'note')), compare: compareFn, correctLabel: names[inv]
    };
  }

  /* ================= SCALES & MODES ================= */
  const SC_LEVELS = {
    1: ['major', 'natmin', 'majpent', 'minpent'],
    2: ['major', 'natmin', 'majpent', 'minpent', 'harmmin', 'melmin', 'blues'],
    3: ['major', 'natmin', 'harmmin', 'melmin', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'majpent', 'minpent', 'blues'],
    4: ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'wholetone', 'dimWH', 'dimHW', 'altered', 'lyddom', 'harmmaj', 'melmin', 'harmmin'],
    5: Object.keys(E.SCALES)
  };
  function genScale(level, o) {
    o = o || {}; const timbre = o.timbre;
    if (level >= 3 && !o.target && !o.pair && Math.random() < 0.3) return genModeVamp(level, o);
    if (o.target && o.target.startsWith('mode:')) return genModeVamp(level, o);
    const set = SC_LEVELS[level] || SC_LEVELS[5];
    let id = o.target ? o.target.replace('sc:', '') : (o.pair ? choice(o.pair) : choice(set));
    if (!E.SCALES[id]) id = choice(set);
    const tonic = rnd(52, 64);
    const asc = E.scaleNotes(id, tonic, 1);
    let seq;
    if (level <= 2) seq = asc;
    else if (level === 3) seq = asc.concat(asc.slice(0, -1).reverse());
    else if (level === 4) { // in thirds
      const full = E.scaleNotes(id, tonic, 2); seq = [];
      for (let i = 0; i + 2 < full.length && i < asc.length; i++) { seq.push(full[i], full[i + 2]); }
      seq.push(tonic + 12);
    } else { // random walk covering all tones
      const full = E.scaleNotes(id, tonic, 2).slice(0, -1); const need = new Set(full.map(m => E.mod12(m)));
      let cur = full.indexOf(tonic); seq = [tonic]; need.delete(E.mod12(tonic)); let guard = 0;
      while ((need.size || seq.length < 8) && guard++ < 40) {
        const step = choice([1, 1, 1, 2, 2, 3]) * (Math.random() < 0.5 ? 1 : -1);
        let ni = cur + step; if (ni < 0 || ni >= full.length) ni = cur - step; if (ni < 0 || ni >= full.length) continue;
        cur = ni; seq.push(full[cur]); need.delete(E.mod12(full[cur]));
      }
      seq.push(tonic);
    }
    const step = level >= 4 ? 0.3 : 0.36;
    const evs = seq.map((m, i) => ({ at: i * step, dur: i === seq.length - 1 ? 0.9 : step * 0.95, notes: [m], timbre, vel: 0.8 }));
    const optIds = o.pair ? o.pair : set;
    const options = optIds.map(k => ({ id: k, label: E.SCALES[k].name, sub: E.SCALES[k].syl.map(s => E.SYL_NAME[s]).join(' ') }));
    const sc = E.SCALES[id]; const flat = E.prefersFlat(tonic, sc.iv[2] === 3);
    const explain = `<b>${E.pcName(tonic, flat)} ${sc.name}</b> — ${sc.syl.map(s => E.SYL_NAME[s]).join(' ')}.` + scaleTip(id);
    const compareFn = chosen => E.scaleNotes(chosen, tonic, 1).map((m, i) => ({ at: i * 0.3, dur: 0.28, notes: [m], timbre }));
    return {
      module: 'scales', type: 'scale', level, prompt: level >= 5 ? 'Which scale is this melody built on?' : level === 4 ? 'Identify the scale (played in thirds)' : 'Identify the scale or mode', answerKind: 'choice',
      audio: { events: evs }, context: null, options, answer: id, items: ['sc:' + id], explain,
      visual: keyboardFor(asc, asc.map((m, i) => i === 0 || i === asc.length - 1 ? 'root' : 'note')), compare: compareFn, correctLabel: sc.name
    };
  }
  function scaleTip(id) {
    const t = { dorian: ' Minor with a major 6th (La): the "Dorian brightness".', phrygian: ' Minor with ♭2 (Ra): the Spanish/flamenco darkness.', lydian: ' Major with ♯4 (Fi): floating, dreamy.', mixolydian: ' Major with ♭7 (Te): the dominant/blues-rock scale.', locrian: ' ♭2 and ♭5: the scale of the half-diminished chord.', harmmin: ' Natural minor with a raised 7th (Ti): the augmented 2nd between Le and Ti.', melmin: ' Minor 3rd but major 6th and 7th: the jazz minor.', majpent: ' Do Re Mi Sol La — no half steps, no tension.', minpent: ' Do Me Fa Sol Te — the blues/gospel backbone.', blues: ' Minor pentatonic plus the ♭5 (Se): the blue note.', wholetone: ' All whole steps — symmetrical, no tonic pull.', dimWH: ' Whole–half: the scale of the °7 chord.', dimHW: ' Half–whole: the scale for 7(♭9) dominants.', altered: ' Every tension altered: ♭9 ♯9 ♯11 ♭13 over a dominant.', lyddom: ' Mixolydian ♯4: the 7(♯11) sound.', harmmaj: ' Major with ♭6 (Le): a dark twist on major.', natmin: ' Me, Le, Te: the natural minor (Aeolian).', major: ' The reference: Do Re Mi Fa Sol La Ti.' };
    return t[id] || '';
  }
  function genModeVamp(level, o) {
    o = o || {}; const timbre = o.timbre;
    const modes = ['dorian', 'mixolydian', 'lydian', 'phrygian', 'natmin'];
    let mode = o.target ? o.target.replace('mode:', '') : choice(modes); if (!MODAL_VAMPS[mode]) mode = choice(modes);
    const tonicPc = rnd(0, 11);
    const ctx = vampEvents(mode, tonicPc, timbre);
    const options = modes.map(m => ({ id: m, label: E.SCALES[m].name, sub: MODAL_VAMPS[m].map(tk => tok(tk).lab).join(' – ') }));
    const explain = `<b>${E.SCALES[mode].name}</b> vamp: ${MODAL_VAMPS[mode].map(tk => tok(tk).lab).join(' – ')} on ${E.pcName(tonicPc, true)}.` + scaleTip(mode);
    const compareFn = chosen => vampEvents(chosen, tonicPc, timbre).events;
    return {
      module: 'scales', type: 'modevamp', level, prompt: 'Which mode is this vamp in?', answerKind: 'choice',
      audio: { events: ctx.events }, context: null, options, answer: mode, items: ['mode:' + mode], explain, visual: null, compare: compareFn, correctLabel: E.SCALES[mode].name
    };
  }

  /* ================= PROGRESSIONS ================= */
  const PROG_LIB = {
    1: [{ mode: 'M', pal: ['I', 'II-', 'III-', 'IV', 'V', 'VI-', 'VIIo'], progs: [['I', 'IV', 'V', 'I'], ['I', 'VI-', 'IV', 'V'], ['I', 'V', 'VI-', 'IV'], ['VI-', 'IV', 'I', 'V'], ['I', 'III-', 'IV', 'V'], ['II-', 'V', 'I', 'I'], ['I', 'IV', 'I', 'V'], ['I', 'VI-', 'II-', 'V'], ['IV', 'V', 'I', 'VI-'], ['I', 'II-', 'III-', 'IV'], ['I', 'V', 'IV', 'I'], ['VI-', 'II-', 'V', 'I'], ['I', 'IV', 'VI-', 'V'], ['III-', 'VI-', 'II-', 'V'], ['I', 'VIIo', 'VI-', 'V'], ['IV', 'I', 'V', 'VI-'], ['I', 'III-', 'VI-', 'IV'], ['I', 'IV', 'II-', 'V'], ['V', 'IV', 'I', 'I'], ['I', 'VI-', 'III-', 'IV']] }],
    2: [
      { mode: 'M', pal: ['IMaj7', 'II-7', 'III-7', 'IVMaj7', 'V7', 'VI-7', 'VII-7b5'], progs: [['IMaj7', 'VI-7', 'II-7', 'V7'], ['II-7', 'V7', 'IMaj7', 'IMaj7'], ['IMaj7', 'IVMaj7', 'III-7', 'VI-7'], ['III-7', 'VI-7', 'II-7', 'V7'], ['IMaj7', 'II-7', 'III-7', 'IVMaj7'], ['IVMaj7', 'V7', 'III-7', 'VI-7'], ['IMaj7', 'VII-7b5', 'III-7', 'VI-7'], ['IMaj7', 'IVMaj7', 'II-7', 'V7'], ['VI-7', 'II-7', 'V7', 'IMaj7'], ['IMaj7', 'III-7', 'IVMaj7', 'V7'], ['IVMaj7', 'III-7', 'II-7', 'IMaj7'], ['II-7', 'III-7', 'IVMaj7', 'V7'], ['IMaj7', 'V7', 'VI-7', 'IVMaj7'], ['VI-7', 'IVMaj7', 'IMaj7', 'V7']] },
      { mode: 'm', pal: ['m:I-', 'm:IIo', 'm:bIII', 'm:IV-', 'm:V', 'm:V7', 'm:bVI', 'm:bVII', 'm:II-7b5', 'm:V-7'], progs: [['m:I-', 'm:IV-', 'm:V7', 'm:I-'], ['m:I-', 'm:bVI', 'm:bVII', 'm:I-'], ['m:I-', 'm:bVII', 'm:bVI', 'm:V7'], ['m:II-7b5', 'm:V7', 'm:I-', 'm:I-'], ['m:I-', 'm:bIII', 'm:bVII', 'm:IV-'], ['m:I-', 'm:V7', 'm:I-', 'm:IV-'], ['m:bVI', 'm:bVII', 'm:I-', 'm:I-'], ['m:I-', 'm:IV-', 'm:bVII', 'm:bIII'], ['m:I-', 'm:bVI', 'm:IV-', 'm:V7'], ['m:IV-', 'm:V7', 'm:I-', 'm:bVI'], ['m:I-', 'm:V-7', 'm:bVI', 'm:V7'], ['m:I-', 'm:IIo', 'm:V', 'm:I-'], ['m:I-', 'm:bIII', 'm:IV-', 'm:V']] }
    ],
    3: [
      { mode: 'M', pal: ['IMaj7', 'II-7', 'III-7', 'IVMaj7', 'V7', 'VI-7', 'V7/II', 'V7/III', 'V7/IV', 'V7/V', 'V7/VI'], progs: [['IMaj7', 'V7/II', 'II-7', 'V7'], ['IMaj7', 'V7/IV', 'IVMaj7', 'IMaj7'], ['VI-7', 'V7/V', 'V7', 'IMaj7'], ['IMaj7', 'V7/VI', 'VI-7', 'V7/II'], ['IMaj7', 'V7/III', 'III-7', 'VI-7'], ['II-7', 'V7', 'IMaj7', 'V7/II'], ['IMaj7', 'V7/V', 'V7', 'IMaj7'], ['III-7', 'V7/II', 'II-7', 'V7'], ['IMaj7', 'VI-7', 'V7/II', 'II-7'], ['IVMaj7', 'V7/VI', 'VI-7', 'II-7'], ['IMaj7', 'V7/IV', 'IVMaj7', 'V7/V'], ['V7/VI', 'VI-7', 'V7/II', 'II-7'], ['IMaj7', 'III-7', 'V7/II', 'II-7'], ['II-7', 'V7', 'V7/IV', 'IVMaj7'], ['IMaj7', 'V7/VI', 'VI-7', 'IVMaj7'], ['V7/V', 'V7', 'IMaj7', 'IMaj7'], ['IMaj7', 'V7/II', 'V7/V', 'V7']] },
      { mode: 'm', pal: ['m:I-7', 'm:II-7b5', 'm:bIIIMaj7', 'm:IV-7', 'm:V7', 'm:bVIMaj7', 'm:bVII7', 'm:V7/IV', 'm:V7/V'], progs: [['m:I-7', 'm:V7/IV', 'm:IV-7', 'm:V7'], ['m:I-7', 'm:bVIMaj7', 'm:II-7b5', 'm:V7'], ['m:II-7b5', 'm:V7', 'm:I-7', 'm:V7/IV'], ['m:I-7', 'm:IV-7', 'm:bVII7', 'm:bIIIMaj7'], ['m:I-7', 'm:V7/V', 'm:V7', 'm:I-7'], ['m:bVIMaj7', 'm:bVII7', 'm:I-7', 'm:I-7']] }
    ],
    4: [{ mode: 'M', pal: ['IMaj7', 'II-7', 'III-7', 'IVMaj7', 'V7', 'VI-7', 'IV-7', 'bVIMaj7', 'bVII7', 'bIIIMaj7', 'II-7b5', 'subV7', '#Io7', '#IIo7', '#IVo7', 'bIIMaj7'], progs: [['IMaj7', 'IV-7', 'bVII7', 'IMaj7'], ['IMaj7', 'bVIMaj7', 'bVII7', 'IMaj7'], ['IMaj7', 'IVMaj7', 'IV-7', 'IMaj7'], ['II-7', 'subV7', 'IMaj7', 'IMaj7'], ['IMaj7', '#Io7', 'II-7', 'V7'], ['II-7', '#IIo7', 'III-7', 'VI-7'], ['IVMaj7', '#IVo7', 'IMaj7', 'V7'], ['IMaj7', 'II-7b5', 'V7', 'IMaj7'], ['IMaj7', 'bVIMaj7', 'II-7', 'V7'], ['IMaj7', 'bIIIMaj7', 'bVIMaj7', 'bIIMaj7'], ['IMaj7', 'IV-7', 'IMaj7', 'IV-7'], ['VI-7', 'bVIMaj7', 'V7', 'IMaj7'], ['IMaj7', 'bVII7', 'IMaj7', 'bVII7'], ['III-7', 'bIIIMaj7', 'II-7', 'subV7'], ['IMaj7', 'V7', 'bVIMaj7', 'bVII7'], ['IVMaj7', 'IV-7', 'III-7', 'VI-7'], ['IMaj7', 'bIIMaj7', 'IMaj7', 'bIIMaj7'], ['II-7', 'V7', 'bIIIMaj7', 'bVIMaj7'], ['IMaj7', 'II-7', 'subV7', 'IMaj7'], ['IMaj7', 'VI-7', 'IV-7', 'bVII7']] }],
    5: [{ mode: 'M', pal: ['IMaj7', 'II-7', 'III-7', 'IVMaj7', 'V7', 'VI-7', 'V7sus4', 'V-7', 'V7/II', 'V7/III', 'V7/IV', 'V7/V', 'V7/VI', 'IV-7', 'bVIMaj7', 'bVII7', 'bIIIMaj7', 'II-7b5', 'subV7', 'subV7/V', 'subV7/II', '#Io7', '#IIo7', '#IVo7', 'bIIMaj7'], progs: [['II-7', 'subV7/V', 'V7', 'IMaj7'], ['IMaj7', 'subV7/II', 'II-7', 'V7'], ['V-7', 'V7/IV', 'IVMaj7', 'IV-7'], ['VI-7', 'II-7', 'subV7', 'IMaj7'], ['IMaj7', 'V7sus4', 'V7', 'IMaj7'], ['III-7', 'V7/II', 'II-7', 'subV7'], ['IMaj7', 'bIIIMaj7', 'bVIMaj7', 'bIIMaj7'], ['IMaj7', 'V7/V', 'subV7', 'IMaj7'], ['IMaj7', '#IVo7', 'IVMaj7', 'IV-7'], ['IMaj7', 'V7/VI', 'VI-7', 'subV7/V'], ['II-7', 'V7', 'bVIMaj7', 'bVII7'], ['IMaj7', 'V-7', 'V7/IV', 'IVMaj7'], ['IV-7', 'bVII7', 'IMaj7', 'V7sus4'], ['IMaj7', 'V7/II', 'II-7', 'V7'], ['VI-7', 'subV7/V', 'V7', 'V7sus4'], ['IMaj7', '#Io7', 'II-7', '#IIo7']] }]
  };
  const TOKEN_TIPS = {
    'V7/II': 'Dominant of II–. Listen for Di (♯1) in the chord pulling up to Re.', 'V7/III': 'Dominant of III–: Ri (♯2) rises to Mi, Fi to Sol.', 'V7/IV': 'The tonic turned dominant (I7): Te (♭7) pulls down to La.', 'V7/V': 'Dominant of V: Fi (♯4) rises to Sol.', 'V7/VI': 'Dominant of VI–: Si (♯5) rises to La.',
    'IV-7': 'Subdominant minor (modal interchange): Le (♭6) darkens the IV chord.', 'bVIMaj7': 'Borrowed from the parallel minor — Le in the bass, lush and cinematic.', 'bVII7': 'The "backdoor" dominant: Te in the bass, resolving to I.', 'bIIIMaj7': 'Modal interchange: Me in the bass.', 'II-7b5': 'II–7(♭5) from the parallel minor: Le inside a II chord.', 'subV7': 'Tritone substitute of V7: Ra (♭2) in the bass sliding down to Do.', 'subV7/V': 'Substitute dominant of V: ♭VI7 sliding a half step down to V7.', 'subV7/II': 'Substitute dominant of II–: ♭III7 sliding down to II–7.', '#Io7': 'Passing diminished: bass Do–Di–Re between I and II–7.', '#IIo7': 'Passing diminished: bass Re–Ri–Mi between II–7 and III–7.', '#IVo7': 'Passing diminished on Fi, pulling to Sol.', 'bIIMaj7': 'Phrygian / Neapolitan colour: Ra in the bass.', 'V-7': 'V–7: the related II of V7/IV (Te instead of Ti).', 'V7sus4': 'Dominant with the 4th suspended — no leading tone yet.',
    'VIIo': 'VII° — a dominant-function chord without its root.', 'VII-7b5': 'The half-diminished VII — dominant function, leads to I or III–.', 'm:V7': 'The dominant of minor: Ti (raised 7th) pulls up to Do.', 'm:bVII': '♭VII in minor: Te in the bass — the natural-minor subtonic.', 'm:bVI': '♭VI in minor: Le in the bass.', 'm:IV-': 'IV– in minor: the subdominant.', 'm:II-7b5': 'II–7(♭5): the minor-key II chord.', 'm:V-7': 'V–7 (natural minor): no leading tone.', 'm:V7/IV': 'I7 in minor: dominant of IV–.', 'm:V7/V': 'II7 in minor: dominant of V7.', 'm:bVII7': '♭VII7 in minor: often to ♭IIIMaj7 (its own I).', 'm:bIII': '♭III: the relative major chord.'
  };
  function genProgression(level, o) {
    o = o || {}; const timbre = o.timbre; const style = o.numeralStyle || 'berklee';
    if (level >= 5 && !o.target && Math.random() < 0.35) return genModulation(level, o);
    if (o.target && o.target.startsWith('mod:')) return genModulation(level, o);
    const libs = PROG_LIB[level] || PROG_LIB[5];
    let lib = choice(libs);
    let candidates = lib.progs;
    if (o.target) { const tk = o.target.replace('tok:', ''); const l2 = libs.find(l => l.pal.includes(tk)); if (l2) { lib = l2; const c2 = lib.progs.filter(p => p.includes(tk)); if (c2.length) candidates = c2; } }
    const prog = choice(candidates);
    const minor = lib.mode === 'm';
    const tonicPc = rnd(0, 11);
    // voicings with voice leading
    let prev = null; const vs = [];
    prog.forEach(tk => { const t = E.TOKENS[tk]; const v = E.voiceChord(t.type, E.mod12(tonicPc + t.root), prev, { lo: 57, hi: 79 }); vs.push(v); prev = v; });
    const cueTok = minor ? 'm:I-' : (level >= 2 ? 'IMaj7' : 'I');
    const cueV = E.voiceChord(E.TOKENS[cueTok].type, tonicPc, null, { lo: 57, hi: 79 });
    const cue = { events: [{ at: 0, dur: 1.1, notes: [cueV.bass].concat(cueV.upper), timbre, vel: 0.7 }], end: 1.3, label: 'Hear the key (I)' };
    const dur = 1.35, gap = 0.1;
    const evs = chordEvents(vs, 0, dur, gap, timbre, 0.78);
    evs[evs.length - 1].dur = 1.8;
    const palette = lib.pal.map(tk => ({ id: tk, label: E.tokenLabel(tk, style === 'low' ? 'low' : 'lab'), sub: E.tokenChordName(tk, tonicPc, minor) }));
    const flat = E.prefersFlat(tonicPc, minor);
    const keyLabel = E.keyName(tonicPc, minor);
    const explain = `<b>${prog.map(tk => E.tokenLabel(tk, style === 'low' ? 'low' : 'lab')).join(' – ')}</b> in ${keyLabel}: ${prog.map(tk => E.tokenChordName(tk, tonicPc, minor)).join(' – ')}.` +
      prog.filter(tk => TOKEN_TIPS[tk]).slice(0, 2).map(tk => ` <br><span class="muted">${E.tokenLabel(tk, style === 'low' ? 'low' : 'lab')}: ${TOKEN_TIPS[tk]}</span>`).join('');
    const compareSlot = (slot, chosenTok) => { // play previous → chosen → next for context
      const seq = []; let p = slot > 0 ? vs[slot - 1] : null; const t = E.TOKENS[chosenTok];
      const cv = E.voiceChord(t.type, E.mod12(tonicPc + t.root), p, { lo: 57, hi: 79 });
      const list = []; if (p) list.push(p); list.push(cv); if (slot < vs.length - 1) list.push(vs[slot + 1]);
      return chordEvents(list, 0, 1.0, 0.08, timbre, 0.75);
    };
    return {
      module: 'progressions', type: minor ? 'minor' : 'major', level, prompt: `Harmonic dictation — ${prog.length} chords in ${keyLabel}. Label each chord.`, keyLabel, minorCtx: minor,
      audio: { events: evs }, context: cue, answerKind: 'multi', palette, answer: prog.slice(), items: prog.map(tk => 'tok:' + tk), explain,
      visual: null, compareSlot, slotLabels: prog.map((_, i) => 'Chord ' + (i + 1)), correctLabel: prog.map(tk => E.tokenLabel(tk, style === 'low' ? 'low' : 'lab')).join(' – '),
      tonicPc, timbre, voicings: vs
    };
  }
  const MOD_RELS = [
    { id: 'IV', s: 5, minor: false, label: 'Up a 4th (to IV)', sub: 'subdominant key' },
    { id: 'V', s: 7, minor: false, label: 'Up a 5th (to V)', sub: 'dominant key' },
    { id: 'VI-', s: 9, minor: true, label: 'Relative minor (VI–)', sub: 'same key signature' },
    { id: 'bIII', s: 3, minor: false, label: 'Up a minor 3rd (♭III)', sub: 'modal interchange key' },
    { id: 'bII', s: 1, minor: false, label: 'Up a half step', sub: 'direct / "truck driver"' },
    { id: 'II', s: 2, minor: false, label: 'Up a whole step', sub: 'direct modulation' },
    { id: 'bVI', s: 8, minor: false, label: 'Up a minor 6th (♭VI)', sub: 'chromatic mediant' },
    { id: 'I-', s: 0, minor: true, label: 'Parallel minor', sub: 'same tonic' },
    { id: 'II-', s: 2, minor: true, label: 'To II– (supertonic minor)', sub: 'relative of IV' }
  ];
  function genModulation(level, o) {
    o = o || {}; const timbre = o.timbre; const style = o.numeralStyle || 'berklee';
    let rel = o.target ? MOD_RELS.find(r => 'mod:' + r.id === o.target) : null; if (!rel) rel = choice(MOD_RELS);
    const tonicA = rnd(0, 11); const tonicB = E.mod12(tonicA + rel.s);
    const seqA = ['IMaj7', 'VI-7', 'II-7', 'V7', 'IMaj7'];
    const seqB = rel.minor ? ['m:II-7b5', 'm:V7', 'm:I-7', 'm:I-7'] : ['II-7', 'V7', 'IMaj7', 'IMaj7'];
    let prev = null; const vs = [];
    seqA.forEach(tk => { const t = E.TOKENS[tk]; const v = E.voiceChord(t.type, E.mod12(tonicA + t.root), prev, { lo: 57, hi: 79 }); vs.push(v); prev = v; });
    seqB.forEach(tk => { const t = E.TOKENS[tk]; const v = E.voiceChord(t.type, E.mod12(tonicB + t.root), prev, { lo: 57, hi: 79 }); vs.push(v); prev = v; });
    const evs = chordEvents(vs, 0, 1.05, 0.08, timbre, 0.78); evs[evs.length - 1].dur = 1.7;
    const options = MOD_RELS.map(r => ({ id: r.id, label: r.label, sub: r.sub }));
    const explain = `Started in <b>${E.keyName(tonicA, false)}</b>, modulated to <b>${E.keyName(tonicB, rel.minor)}</b> — ${rel.label.toLowerCase()}. The pivot is the II–V of the new key.`;
    return {
      module: 'progressions', type: 'modulation', level, prompt: 'The music modulates. Where did it go?', answerKind: 'choice',
      audio: { events: evs }, context: null, options, answer: rel.id, items: ['mod:' + rel.id], explain, visual: null, compare: null, correctLabel: rel.label
    };
  }

  Object.assign(E, {
    Gen: { genInterval, genDegree, genMelody, genChord, genInversion, genScale, genModeVamp, genProgression, genModulation, INT_LEVELS, CH_LEVELS, SC_LEVELS, PROG_LIB, MOD_RELS, TOKEN_TIPS, sylLabel, cadenceEvents, tonicMidiFor, chordEvents, MODAL_VAMPS }
  });
})(window.EARS = window.EARS || {});
