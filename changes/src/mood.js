// mood.js — emotional reading of chords and progressions: brightness, tension, named colors, hue.
// Numbers start from listening studies of isolated chords (Lahdelma & Eerola 2016/2020; Smit et al. 2020) and are
// nudged by harmonic function in the key. Words are always printed next to color; the app says "feels like", never "is".
const Mood = (() => {
  const T = typeof Theory !== 'undefined' ? Theory : require('./theory.js');
  const mod = T.mod;
  // base [brightness, tension] per quality, 0..1
  const BASE = {
    maj: [.80, .25], add9: [.80, .30], '6': [.78, .25], '69': [.78, .28], maj7: [.72, .30], maj9: [.74, .33], maj13: [.72, .36],
    maj7s11: [.70, .45], maj9s11: [.70, .46], maj7s5: [.52, .62], '5': [.70, .30],
    sus2: [.72, .40], sus4: [.60, .50], '7sus4': [.58, .52], '9sus4': [.60, .50], '13sus4': [.60, .50],
    min: [.35, .35], madd9: [.40, .40], m7: [.42, .35], m9: [.45, .40], m11: [.45, .45], m13: [.45, .46], m6: [.40, .45], 'm6/9': [.42, .46], mb6: [.30, .55], mMaj7: [.30, .62],
    '7': [.55, .60], '9': [.58, .60], '13': [.60, .58], '7b9': [.40, .75], '7s9': [.35, .80], '7s11': [.55, .70], '7b13': [.45, .72], '7alt': [.30, .85], '7s5': [.42, .78], '7b5': [.45, .72],
    '13b9': [.42, .72], '7s9s5': [.32, .86], '7s9b13': [.33, .84], '7b9s11': [.38, .80], '13s11': [.55, .68],
    dim: [.25, .75], dim7: [.20, .80], m7b5: [.30, .70], aug: [.40, .80],
  };
  // Hue by distance from home on the circle of fifths; sharp side runs hot, flat side runs cool, the tritone is violet.
  const HUE_SHARP = [38, 24, 10, 352, 335, 312, 275];
  const HUE_FLAT = [38, 54, 150, 182, 204, 236, 275];
  function hueFor(rootPc, key) {
    const rel = mod(rootPc - key.tonic, 12);
    const pos = (rel * 7) % 12;            // steps along the circle of fifths (1 = V, 11 = IV)
    const d = Math.min(pos, 12 - pos);
    const sharp = pos <= 6;
    return { hue: sharp ? HUE_SHARP[d] : HUE_FLAT[d], distance: d, side: d === 0 ? 'home' : sharp ? 'sharp' : 'flat' };
  }

  // Named colors with the conditions that earn them. Returns the two strongest words.
  const WORDS = {
    home: 'settled', warm: 'warm', open: 'open', lifted: 'lifted', hopeful: 'hopeful', shimmer: 'shimmering', floating: 'floating', dreamy: 'dreamy',
    tender: 'tender', wistful: 'wistful', nostalgic: 'nostalgic', bittersweet: 'bittersweet', melancholy: 'melancholy', dark: 'dark', noir: 'noir',
    yearning: 'yearning', suspense: 'suspense', pull: 'pulling home', edge: 'on edge', grit: 'gritty', wonder: 'wonder', noble: 'noble', triumphant: 'triumphant',
    earthy: 'earthy', pathos: 'pathos', church: 'church', smoky: 'smoky', velvet: 'velvet', uncanny: 'uncanny', glossy: 'glossy', surprise: 'a surprise',
  };

  // chord reading in context. a = Theory.analyze(...) result (optional), style id (optional) shifts a few words.
  function chordMood(chord, key, a, style) {
    const q = T.Q[chord.q] || T.Q.maj;
    let [b, t] = BASE[chord.q] || BASE.maj;
    const rel = mod(chord.root - key.tonic, 12);
    const w = {}; const add = (k, v) => { w[k] = (w[k] || 0) + v; };
    const cat = q.cat;
    const inv = chord.bass != null && chord.bass !== chord.root && T.chordPcs(chord).includes(chord.bass);
    const hybrid = chord.bass != null && chord.bass !== chord.root && !T.chordPcs(chord).includes(chord.bass);
    if (inv) { b += 0.04; t -= 0.03; }             // inversions read brighter (Lahdelma & Eerola 2016)
    if (hybrid) { t += 0.05; add('floating', 1.2); }
    // quality words
    if (cat === 'maj') { add('warm', 0.8); if (chord.q === 'maj7' || chord.q === 'maj9' || chord.q === 'maj13') add('nostalgic', 1.0); if (chord.q === 'add9' || chord.q === '69') add('shimmer', 1.1); if (chord.q === 'maj7s11' || chord.q === 'maj9s11') add('wonder', 1.6); if (chord.q === 'maj7s5') add('uncanny', 1.2); if (chord.q === 'maj9' || chord.q === 'maj13') add('glossy', 0.6); }
    if (cat === 'min') { add('melancholy', 0.7); if (chord.q === 'm7') add('tender', 1.0); if (chord.q === 'm9' || chord.q === 'm11' || chord.q === 'm13') { add('velvet', 1.1); add('tender', 0.5); } if (chord.q === 'm6' || chord.q === 'm6/9' || chord.q === 'mb6') add('noir', 1.2); if (chord.q === 'mMaj7') { add('noir', 1.4); add('uncanny', 0.6); } if (chord.q === 'min') add('wistful', 0.6); }
    if (cat === 'dom') { add('pull', 1.0); if (['7b9', '7s9', '7alt', '7s9s5', '7s9b13', '7b9s11', '13b9'].includes(chord.q)) { add('edge', 1.1); add('grit', 0.8); } if (chord.q === '13' || chord.q === '9') add('smoky', 0.5); if (chord.q === '7s11' || chord.q === '13s11') add('smoky', 0.8); }
    if (cat === 'sus') { add('floating', 1.3); if (chord.q === 'sus2') add('shimmer', 0.5); }
    if (cat === 'dim') { add('suspense', 1.2); if (chord.q === 'm7b5') add('yearning', 1.3); if (chord.q === 'dim7') add('church', 0.6); }
    if (cat === 'aug') { add('uncanny', 1.2); add('suspense', 0.6); }
    // function and key relation
    const major = key.mode === 'major';
    if (a) {
      if (a.fn === 'T' && rel === 0) { t -= 0.10; add('home', 1.2); }
      if (rel === 5 && (cat === 'maj' || cat === 'sus')) { b += 0.03; add('open', 1.2); add('lifted', 0.6); }
      if (rel === 7 && (cat === 'dom' || cat === 'maj')) { add('pull', 0.8); }
      if (major && rel === 9 && cat === 'min') { add('wistful', 1.0); }
      if (major && rel === 4 && cat === 'min') { add('tender', 0.6); add('wistful', 0.4); }
      if (a.borrowed) { b -= 0.12; if (major && rel === 5 && cat === 'min') { add('bittersweet', 2.0); } else if (major && rel === 8) { add('noble', 1.4); b += 0.05; } else if (major && rel === 10) { add('earthy', 1.4); b += 0.06; } else if (major && rel === 3) { add('wonder', 0.6); add('noble', 0.6); } else if (a.neapolitan) { add('pathos', 1.8); } else if (major && rel === 2 && cat === 'dim') { add('yearning', 1.0); } else add('bittersweet', 0.8); }
      if (a.secondary) { t += 0.08; add('pull', 1.2); if (rel === 4) add('yearning', 0.5); }
      if (a.tritoneSub) { add('smoky', 1.5); t += 0.05; }
      if (a.backdoor) { add('nostalgic', 1.2); add('surprise', 0.5); }
      if (a.passingDim) { t += 0.1; add(style === 'gospel' ? 'church' : 'suspense', 1.6); }
      if (a.mediant) { add('wonder', 1.8); b += 0.05; }
      if (major && rel === 2 && cat === 'maj') { add('wonder', 1.3); add('lifted', 0.6); }
      if (a.augSixth) { add('yearning', 1.6); t += 0.1; }
    }
    if (!major) { if (rel === 0 && cat === 'maj') add('hopeful', 1.8); if (rel === 3 && cat === 'maj') add('lifted', 0.6); }
    if (style === 'gospel' && cat === 'dom' && ['13', '7s9', '13b9', '7b9'].includes(chord.q)) add('church', 0.9);
    b = Math.max(0, Math.min(1, b)); t = Math.max(0, Math.min(1, t));
    const words = Object.entries(w).sort((x, y) => y[1] - x[1]).slice(0, 2).map(e => WORDS[e[0]]);
    const h = hueFor(chord.root, key);
    return { bright: b, tension: t, words, hue: h.hue, distance: h.distance, side: h.side };
  }

  // CSS color for a reading: saturation follows tension, lightness follows brightness. `shift` lets a light theme darken.
  function css(m, shift = 0) {
    const s = Math.round(48 + 42 * m.tension);
    const l = Math.round(46 + 24 * m.bright + shift);
    return `hsl(${m.hue} ${s}% ${l}%)`;
  }
  function vars(m) { return `--h:${m.hue};--s:${Math.round(48 + 42 * m.tension)}%;--l:${Math.round(46 + 24 * m.bright)}%`; }

  // Progression reading: average axes, an arc sentence and a gradient of per-chord colors.
  function progressionMood(prog, key, style) {
    if (!prog.length) return { bright: .5, tension: .3, sentence: '', words: [], chords: [] };
    const readings = prog.map((c, i) => { const a = T.analyze(c, key, prog[i + 1] || prog[0], prog[i - 1]); return Object.assign({ a }, chordMood(c, key, a, style)); });
    let B = 0, Tn = 0, W = 0;
    readings.forEach((r, i) => { const w = prog[i].beats || 4; B += r.bright * w; Tn += r.tension * w; W += w; });
    B /= W; Tn /= W;
    // arc
    const first = readings[0], last = readings[readings.length - 1];
    const parts = [];
    const sym = (i) => T.chordSymbol(prog[i], key);
    const open = first.a.fn === 'T' && mod(prog[0].root - key.tonic, 12) === 0 ? 'opens at home' : first.words[0] ? `opens ${first.words[0]}` : 'opens';
    parts.push(open);
    let maxT = -1, maxI = -1; readings.forEach((r, i) => { if (i > 0 && r.tension > maxT) { maxT = r.tension; maxI = i; } });
    const special = readings.findIndex((r, i) => i > 0 && (r.a.borrowed || r.a.mediant || r.a.passingDim || r.a.tritoneSub || r.a.backdoor || r.a.secondary));
    if (special > 0) {
      const r = readings[special];
      const what = r.a.borrowed ? (r.words.includes('bittersweet') ? 'borrows a shadow' : 'borrows from the other mode') : r.a.mediant ? 'steps into wonder' : r.a.passingDim ? (style === 'gospel' ? 'walks through the church chord' : 'slips through a diminished') : r.a.tritoneSub ? 'goes smoky' : r.a.backdoor ? 'comes in the back door' : 'leans forward';
      parts.push(`${what} on ${sym(special)}`);
    } else if (maxI > 0 && maxT > 0.55) parts.push(`tightens on ${sym(maxI)}`);
    const lastRel = mod(prog[prog.length - 1].root - key.tonic, 12);
    const lcat = T.Q[prog[prog.length - 1].q].cat;
    let end;
    if (lastRel === 0 && (lcat === 'maj' || lcat === 'min')) end = (prog[prog.length - 1].q === 'maj' || prog[prog.length - 1].q === 'min') ? 'lands home' : 'settles home, soft';
    else if (lastRel === 7 && (lcat === 'dom' || lcat === 'maj')) end = 'hangs on the V, wanting the top';
    else if (lastRel === 9 && lcat === 'min' && key.mode === 'major') end = 'lands on vi, bittersweet';
    else if (lcat === 'sus') end = 'floats without landing';
    else if (lastRel === 5) end = 'rests on IV, open';
    else end = 'stays open';
    parts.push(end);
    const sentence = parts.join(', ') + '.';
    // words: the changed chords speak loudest; plain "settled/warm" only when nothing else is there
    const ws = {};
    readings.forEach((r, i) => r.words.forEach((wd, k) => { const base = k === 0 ? 1 : 0.6; const emph = prog[i].changed ? 3 : 1; const dull = (wd === 'settled' || wd === 'warm') ? 0.35 : 1; ws[wd] = (ws[wd] || 0) + base * emph * dull; }));
    const words = Object.entries(ws).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    // focus reading: the changed chords (what this option adds), else the whole
    const ch = readings.filter((r, i) => prog[i].changed);
    const focus = ch.length ? { bright: ch.reduce((a, r) => a + r.bright, 0) / ch.length, tension: ch.reduce((a, r) => a + r.tension, 0) / ch.length, words: Array.from(new Set(ch.flatMap(r => r.words))) } : { bright: B, tension: Tn, words };
    return { bright: B, tension: Tn, sentence, words, chords: readings, focus };
  }

  // Mood lens targets: where on the two axes each word lives, and which color words it favors.
  const TARGETS = {
    warm: { b: .78, t: .28, favor: ['warm', 'settled', 'nostalgic', 'shimmering'] },
    open: { b: .80, t: .35, favor: ['open', 'lifted', 'hopeful', 'shimmering'] },
    floating: { b: .62, t: .48, favor: ['floating', 'dreamy', 'wonder', 'glossy'] },
    tender: { b: .45, t: .36, favor: ['tender', 'velvet', 'wistful', 'nostalgic'] },
    bittersweet: { b: .40, t: .42, favor: ['bittersweet', 'nostalgic', 'wistful', 'yearning'] },
    dark: { b: .25, t: .60, favor: ['dark', 'noir', 'melancholy', 'uncanny'] },
    tense: { b: .35, t: .80, favor: ['on edge', 'gritty', 'suspense', 'pulling home'] },
    wonder: { b: .70, t: .50, favor: ['wonder', 'noble', 'lifted', 'uncanny'] },
    triumphant: { b: .82, t: .45, favor: ['triumphant', 'noble', 'earthy', 'lifted'] },
    church: { b: .60, t: .62, favor: ['church', 'pulling home', 'smoky', 'gritty'] },
  };
  function moodMatch(reading, target) {
    const tg = TARGETS[target]; if (!tg) return 0;
    const d = Math.hypot(reading.bright - tg.b, reading.tension - tg.t);
    let s = 1 - d;
    for (const w of reading.words) if (tg.favor.includes(w)) s += 0.35;
    return s;
  }

  return { chordMood, progressionMood, hueFor, css, vars, TARGETS, moodMatch, WORDS };
})();
if (typeof module !== 'undefined') module.exports = Mood;
