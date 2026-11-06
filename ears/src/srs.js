/* ============================================================
   EARS — Store, spaced repetition (FSRS-lite), confusion tracking,
   mastery, vocabulary per level, session builder.
   ============================================================ */
(function (E) {
  const U = E.U;
  const KEY = 'ears.v1';
  const MODULES = ['intervals', 'degrees', 'melody', 'chords', 'scales', 'progressions', 'rhythm', 'sing'];
  const MODULE_INFO = {
    intervals: { name: 'Intervals', icon: '↕', blurb: 'Melodic & harmonic intervals, simple to compound' },
    degrees: { name: 'Scale Degrees', icon: '◎', blurb: 'Functional hearing: which solfege degree is it?' },
    melody: { name: 'Melodic Dictation', icon: '♪', blurb: 'Hear a phrase, write the solfege' },
    chords: { name: 'Chord Quality', icon: '≡', blurb: 'Triads, 7ths, tensions, inversions' },
    scales: { name: 'Scales & Modes', icon: '⌒', blurb: 'Scales, modes, pentatonics, modal vamps' },
    progressions: { name: 'Progressions', icon: '⟶', blurb: 'Harmonic dictation in Roman numerals' },
    rhythm: { name: 'Rhythm', icon: '▮', blurb: 'Dictation, error detection, tap-back' },
    sing: { name: 'Sing', icon: '🎤', blurb: 'Sing scales, intervals, arpeggios — pitch-checked' }
  };
  const LEVEL_NAMES = { 1: 'Major', 2: 'Minor', 3: 'Modes', 4: 'Chromatic', 5: 'Harmonic' };
  const LEVEL_BLURB = {
    1: 'Major keys, diatonic harmony, basic rhythms (ET1)',
    2: 'Minor keys, 7th chords, 6/8, syncopation (ET2)',
    3: 'Modes, harmonic/melodic minor, secondary dominants, triplets (ET3)',
    4: 'Chromatic tendency tones, modal interchange, subV, odd meters (ET4)',
    5: 'Tensions, upper structures, modulation, 9/8 · 11/8 (Harmonic ET)'
  };

  function defaultState() {
    return {
      v: 1, created: Date.now(),
      profile: { name: '', pitch: 'relative', voice: 'mid', onboarded: false },
      settings: { timbre: 'piano', varyTimbre: false, antiAbsolute: false, tempo: 1, solfege: 'do', numeralStyle: 'berklee', songCues: true, autoPlay: true, autoAdvance: false, cadence: 'full', sessionLen: 15, theme: 'dark', lowercase: false },
      levels: { intervals: 1, degrees: 1, melody: 1, chords: 1, scales: 1, progressions: 1, rhythm: 1, sing: 1 },
      cards: {}, conf: {}, stats: { xp: 0, q: 0, c: 0, secs: 0, days: {}, byModule: {}, log: [] },
      assignment: null, assignmentResults: [], placement: null
    };
  }
  let state = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); state = Object.assign(defaultState(), s); state.settings = Object.assign(defaultState().settings, s.settings || {}); state.levels = Object.assign(defaultState().levels, s.levels || {}); state.stats = Object.assign(defaultState().stats, s.stats || {}); return state; } } catch (e) { }
    state = defaultState(); return state;
  }
  let saveT = null;
  function save() { if (saveT) clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }, 150); }
  function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }
  function reset() { state = defaultState(); saveNow(); return state; }
  function get() { return state || load(); }

  /* ---------- cards ---------- */
  const DAY = 86400000;
  function card(id, module) {
    let c = state.cards[id];
    if (!c) { c = { id, m: module, S: 0, D: 5, due: 0, reps: 0, lapses: 0, h: [], last: 0 }; state.cards[id] = c; }
    return c;
  }
  function review(id, module, correct, rt) {
    const c = card(id, module); const now = Date.now();
    const fast = rt !== undefined && rt < 2.5;
    if (correct) {
      if (c.S <= 0) c.S = fast ? 2 : 1;
      else c.S = c.S * (fast ? 2.7 : 2.1) * (1 - (c.D - 5) * 0.05);
      c.S = Math.min(c.S, 120);
      c.D = Math.max(1, c.D - 0.25);
      c.due = now + c.S * DAY;
    } else {
      c.S = 0.2; c.lapses++; c.D = Math.min(10, c.D + 1); c.due = now + 0.2 * DAY;
    }
    c.reps++; c.last = now; c.h.push(correct ? 1 : 0); if (c.h.length > 12) c.h.shift();
    save(); return c;
  }
  function mastery(c) {
    if (!c || !c.reps) return 0;
    const acc = c.h.reduce((a, b) => a + b, 0) / c.h.length;
    const stab = Math.min(1, Math.log2(1 + Math.max(0, c.S)) / 5);
    const conf = Math.min(1, c.h.length / 6);
    return Math.round(100 * (0.55 * acc + 0.45 * stab) * (0.5 + 0.5 * conf)) / 100;
  }
  function dueCards(modules) {
    const now = Date.now();
    return Object.values(state.cards).filter(c => c.due <= now && c.reps > 0 && (!modules || modules.includes(c.m))).sort((a, b) => a.due - b.due);
  }
  function confuse(module, correct, chosen) {
    if (correct === chosen) return;
    const k = correct + '>' + chosen; state.conf[module] = state.conf[module] || {}; state.conf[module][k] = (state.conf[module][k] || 0) + 1; save();
  }
  function topConfusions(module, n) {
    const m = state.conf[module] || {}; const pairs = {};
    Object.entries(m).forEach(([k, v]) => { const [a, b] = k.split('>'); const key = [a, b].sort().join('>'); pairs[key] = (pairs[key] || 0) + v; });
    return Object.entries(pairs).filter(([k, v]) => v >= 2).sort((a, b) => b[1] - a[1]).slice(0, n || 3).map(([k, v]) => ({ pair: k.split('>'), n: v }));
  }

  /* ---------- vocabulary (items per module per level) ---------- */
  function vocab(module, level) {
    const G = E.Gen;
    switch (module) {
      case 'intervals': { const L = G.INT_LEVELS[level] || G.INT_LEVELS[5]; const out = []; L.ids.forEach(id => Array.from(new Set(L.dirs)).forEach(d => out.push(id + ':' + d))); return out; }
      case 'degrees': case 'melody': {
        const sets = { 1: E.DIATONIC_MAJOR, 2: ['do', 're', 'me', 'fa', 'sol', 'le', 'te', 'ti', 'la'], 3: ['do', 'ra', 're', 'me', 'mi', 'fa', 'fi', 'sol', 'le', 'la', 'te', 'ti'], 4: E.SOLFEGE.map(s => s.id), 5: E.SOLFEGE.map(s => s.id) };
        return (sets[level] || sets[5]).map(s => 'deg:' + s);
      }
      case 'chords': { const s = (G.CH_LEVELS[level] || G.CH_LEVELS[5]).map(t => 'ch:' + t); if (level >= 3) s.push('inv:0', 'inv:1', 'inv:2', 'inv:3'); return s; }
      case 'scales': { const s = (G.SC_LEVELS[level] || G.SC_LEVELS[5]).map(t => 'sc:' + t); if (level >= 3) Object.keys(G.MODAL_VAMPS).forEach(m => s.push('mode:' + m)); return s; }
      case 'progressions': { const libs = G.PROG_LIB[level] || G.PROG_LIB[5]; const s = []; libs.forEach(l => l.pal.forEach(t => s.push('tok:' + t))); if (level >= 5) G.MOD_RELS.forEach(r => s.push('mod:' + r.id)); return s; }
      case 'rhythm': { const meters = E.Rhythm.LEVEL_METERS[level] || E.Rhythm.LEVEL_METERS[5]; const fams = new Set(); meters.forEach(n => E.Rhythm.METERS[n].groups.forEach(g => fams.add(g === 120 ? 's' : g === 180 ? 'c' : 'h'))); return E.Rhythm.CELLS.filter(c => c.lvl <= level && c.lvl >= Math.max(1, level - 1) && (c.fam === 'any' || fams.has(c.fam))).map(c => 'rc:' + c.id); }
      case 'sing': return (E.Sing ? E.Sing.vocab(level) : []);
    }
    return [];
  }
  function levelMastery(module, level) {
    const v = vocab(module, level); if (!v.length) return { pct: 0, seen: 0, total: 0, weak: [] };
    let sum = 0, seen = 0; const weak = [];
    v.forEach(id => { const c = state.cards[id]; const m = mastery(c); sum += m; if (c && c.reps) seen++; if (c && c.reps >= 3 && m < 0.5) weak.push(id); });
    return { pct: Math.round(100 * sum / v.length), seen, total: v.length, weak };
  }
  function recentAccuracy(module, n) {
    const log = state.stats.log.filter(l => l.m === module).slice(-(n || 20));
    if (!log.length) return null; return log.reduce((a, l) => a + (l.c ? 1 : 0), 0) / log.length;
  }
  function levelUpReady(module) {
    const lvl = state.levels[module]; if (lvl >= 5) return false;
    const lm = levelMastery(module, lvl); const acc = recentAccuracy(module, 20);
    return lm.seen >= Math.min(lm.total, 6) && lm.pct >= 70 && acc !== null && acc >= 0.85 && state.stats.log.filter(l => l.m === module).length >= 20;
  }

  /* ---------- stats ---------- */
  function logAnswer(module, correct, secs) {
    const s = state.stats; const d = U.today();
    s.q++; if (correct) s.c++; s.secs += secs || 0;
    s.xp += correct ? 10 : 3;
    s.days[d] = s.days[d] || { q: 0, c: 0, secs: 0 }; s.days[d].q++; if (correct) s.days[d].c++; s.days[d].secs += secs || 0;
    s.byModule[module] = s.byModule[module] || { q: 0, c: 0, secs: 0 }; s.byModule[module].q++; if (correct) s.byModule[module].c++; s.byModule[module].secs += secs || 0;
    s.log.push({ t: Date.now(), m: module, c: correct ? 1 : 0, s: secs || 0, l: state.levels[module] }); if (s.log.length > 2000) s.log.splice(0, s.log.length - 2000);
    save();
  }
  function streak() {
    const days = state.stats.days; let d = U.today(); let n = 0;
    if (!days[d]) d = U.dayOffset(d, -1);
    while (days[d] && days[d].q > 0) { n++; d = U.dayOffset(d, -1); }
    return n;
  }

  /* ---------- session builder ---------- */
  function buildSession(opts) {
    const modules = opts.modules && opts.modules.length ? opts.modules : MODULES.filter(m => m !== 'sing');
    const count = opts.count || 15;
    const queue = [];
    const due = dueCards(modules);
    const nDue = opts.noReview ? 0 : Math.min(due.length, Math.round(count * 0.45));
    for (let i = 0; i < nDue; i++) queue.push({ module: due[i].m, target: due[i].id, why: 'review' });
    if (!opts.noFocus) {
      const nFocus = Math.round(count * 0.2); let added = 0;
      for (const m of U.shuffle(modules)) {
        if (added >= nFocus) break;
        if (!['intervals', 'chords', 'scales', 'degrees'].includes(m)) continue;
        const tc = topConfusions(m, 2);
        for (const t of tc) { if (added >= nFocus) break; queue.push({ module: m, pair: t.pair, why: 'focus' }); added++; queue.push({ module: m, pair: t.pair, why: 'focus' }); added++; }
      }
    }
    while (queue.length < count) {
      const m = modules[queue.length % modules.length];
      const v = vocab(m, state.levels[m]); const unseen = v.filter(id => !state.cards[id] || !state.cards[id].reps);
      if (unseen.length && Math.random() < 0.6) queue.push({ module: m, target: U.choice(unseen), why: 'new' });
      else queue.push({ module: m, why: 'practice' });
    }
    // interleave: shuffle, then separate same-module neighbours where possible
    let q = U.shuffle(queue).slice(0, count);
    for (let i = 1; i < q.length; i++) {
      if (q[i].module === q[i - 1].module) { const j = q.findIndex((x, k) => k > i && x.module !== q[i - 1].module); if (j > 0) { [q[i], q[j]] = [q[j], q[i]]; } }
    }
    return q;
  }

  /* ---------- export / import ---------- */
  function exportJSON() { return JSON.stringify(state); }
  function importJSON(txt) { try { const s = JSON.parse(txt); if (!s || !s.cards) return false; state = Object.assign(defaultState(), s); saveNow(); return true; } catch (e) { return false; } }
  function report() {
    const s = state; const lines = [];
    lines.push(`EARS progress report — ${new Date().toLocaleDateString()}`);
    lines.push(`Student: ${s.profile.name || '(unnamed)'} · Pitch profile: ${s.profile.pitch}`);
    lines.push(`Total questions: ${s.stats.q} · Accuracy: ${s.stats.q ? Math.round(100 * s.stats.c / s.stats.q) : 0}% · Practice time: ${U.fmtMin(s.stats.secs)} · Streak: ${streak()} days`);
    lines.push('');
    MODULES.forEach(m => {
      const lvl = s.levels[m]; const lm = levelMastery(m, lvl); const bm = s.stats.byModule[m] || { q: 0, c: 0 };
      lines.push(`${MODULE_INFO[m].name}: Level ${lvl} (${LEVEL_NAMES[lvl]}) · mastery ${lm.pct}% (${lm.seen}/${lm.total} items seen) · ${bm.q} answered, ${bm.q ? Math.round(100 * bm.c / bm.q) : 0}% correct` + (lm.weak.length ? ` · weak: ${lm.weak.map(x => x.split(':').slice(1).join(':')).join(', ')}` : ''));
      const tc = topConfusions(m, 3); if (tc.length) lines.push(`   confusions: ${tc.map(t => t.pair.map(x => x.split(':').slice(1).join(':') || x).join(' ↔ ') + ' (' + t.n + ')').join(', ')}`);
    });
    return lines.join('\n');
  }

  E.Store = { MODULES, MODULE_INFO, LEVEL_NAMES, LEVEL_BLURB, load, save, saveNow, reset, get, card, review, mastery, dueCards, confuse, topConfusions, vocab, levelMastery, recentAccuracy, levelUpReady, logAnswer, streak, buildSession, exportJSON, importJSON, report, defaultState };
})(window.EARS = window.EARS || {});
