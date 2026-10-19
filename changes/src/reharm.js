// reharm.js — the vocabulary engine. A curated set of harmonic moves (transforms), filtered and weighted by
// style packs, applied to a confirmed progression in a key. Every option changes one or two chords and carries
// its reason in musician shorthand. Deterministic: the same progression and settings always give the same options.
const Reharm = (() => {
  const T = typeof Theory !== 'undefined' ? Theory : require('./theory.js');
  const M = typeof Mood !== 'undefined' ? Mood : require('./mood.js');
  const mod = T.mod;

  // ---------- helpers ----------
  const clone = (prog) => prog.map(c => Object.assign({}, c, { changed: undefined, inserted: undefined }));
  const rel = (c, key) => mod(c.root - key.tonic, 12);
  const MAJ_DEG = { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 };
  const MIN_DEG = { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 };
  const degOf = (c, key) => (key.mode === 'major' ? MAJ_DEG : MIN_DEG)[rel(c, key)] || 0;
  const cat = (c) => T.Q[c.q].cat;
  const isTonic = (c, key) => rel(c, key) === 0 && (key.mode === 'major' ? (cat(c) === 'maj' || cat(c) === 'sus') : cat(c) === 'min');
  const isV = (c, key) => rel(c, key) === 7 && (cat(c) === 'dom' || cat(c) === 'maj' || cat(c) === 'sus');
  const isIV = (c, key) => rel(c, key) === 5 && (key.mode === 'major' ? cat(c) === 'maj' : cat(c) === 'min');
  const isii = (c, key) => rel(c, key) === 2 && (cat(c) === 'min' || cat(c) === 'dim');
  const isvi = (c, key) => key.mode === 'major' && rel(c, key) === 9 && cat(c) === 'min';
  const beats = (c) => c.beats || 4;
  const mk = (root, q, extra = {}) => Object.assign({ root: mod(root, 12), q, bass: null, beats: 4 }, extra);
  const inv = (c, bassIv) => Object.assign({}, c, { bass: mod(c.root + bassIv, 12) }); // bassIv = semitones above root
  const sym = (c, key) => T.chordSymbol(c, key);
  const syms = (cs, key) => cs.map(c => sym(c, key)).join(' – ');
  const rn = (c, key) => T.romanNumeral(c, key);
  const pcn = (pc, key, q) => T.pcName(pc, key, q);
  const last = (a) => a[a.length - 1];

  // Replace prog[i] with one or more chords sharing its duration (weights optional).
  function replaceWith(prog, i, chords, weights) {
    const out = clone(prog); const b = beats(out[i]);
    const ws = weights || chords.map(() => 1); const tot = ws.reduce((a, x) => a + x, 0);
    const items = chords.map((c, k) => Object.assign({}, c, { beats: b * ws[k] / tot, changed: k === 0 && chords.length === 1 ? 'mod' : 'new' }));
    out.splice(i, 1, ...items);
    return out;
  }
  // Insert `chord` before prog[i], taking the second half of prog[i-1] (approach chord lands before the target).
  function approach(prog, i, chord) {
    const out = clone(prog);
    const j = i === 0 ? out.length - 1 : i - 1;
    if (beats(out[j]) < 2) return null;
    out[j] = Object.assign({}, out[j], { beats: beats(out[j]) / 2 });
    const c = Object.assign({}, chord, { beats: beats(out[j]), changed: 'new' });
    if (i === 0) out.push(c); else out.splice(i, 0, c);
    return out;
  }
  // Insert `chord` after prog[i], taking the second half of prog[i] (passing chord between i and i+1).
  function passing(prog, i, chord) {
    const out = clone(prog);
    if (beats(out[i]) < 2) return null;
    out[i] = Object.assign({}, out[i], { beats: beats(out[i]) / 2 });
    out.splice(i + 1, 0, Object.assign({}, chord, { beats: beats(out[i]), changed: 'new' }));
    return out;
  }
  const swap = (prog, i, chord) => { const out = clone(prog); out[i] = Object.assign({}, out[i], chord, { changed: 'mod' }); return out; };
  const next = (prog, i) => prog[(i + 1) % prog.length];
  const prev = (prog, i) => prog[(i - 1 + prog.length) % prog.length];

  // Complexity rank, so recoloring only ever adds color to what the writer already chose.
  const RANK = { maj: 0, '5': 0, sus2: 1, sus4: 1, add9: 1, '6': 2, maj7: 2, '69': 3, maj9: 3, maj7s11: 4, maj9s11: 5, maj13: 5, maj7s5: 4,
    min: 0, madd9: 1, m7: 2, m6: 2, mb6: 2, mMaj7: 3, m9: 3, 'm6/9': 3, m11: 4, m13: 5,
    '7': 1, '7sus4': 1, '9': 2, '9sus4': 2, '13': 3, '13sus4': 3, '7b9': 3, '7s9': 3, '7s11': 3, '7b13': 3, '7s5': 3, '7b5': 3, '13b9': 4, '7alt': 5, '7s9s5': 5, '7s9b13': 5, '7b9s11': 5, '13s11': 5,
    dim: 0, dim7: 1, m7b5: 1, aug: 0 };
  function upgrade(c, q) {
    if (!q || q === c.q) return c;
    const from = cat(c), to = T.Q[q].cat;
    const ok = from === to || (from === 'maj' && (to === 'dom' || to === 'sus')) || (from === 'dom' && to === 'sus');
    if (!ok) return c;
    if (from === to && (RANK[q] || 0) < (RANK[c.q] || 0)) return c;
    return Object.assign({}, c, { q });
  }

  // ---------- Style packs ----------
  // recolor(c, key, depth, i, prog) → quality id or null. Only upgrades (never removes color the writer chose).
  const STYLES = {
    pop: {
      id: 'pop', name: 'Pop', blurb: 'Singer-songwriter and modern pop: colors, slash bass lines, a borrowed chord at the right moment.', ceiling: 3,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (d < 2) return null;
        if (major) {
          if (r === 0 && k === 'maj' && i !== prog.length - 1) return 'add9';
          if (r === 5 && k === 'maj') return 'maj7';
          if ((r === 9 || r === 2 || r === 4) && k === 'min') return 'm7';
        } else {
          if (r === 0 && k === 'min') return d >= 3 ? 'm9' : 'm7';
          if (r === 8 && k === 'maj') return 'maj7';
          if (r === 5 && k === 'min') return 'm7';
        }
        return null;
      },
      t: { recolor: [1, 1.0], sus: [1, 0.9], slashBass: [1, 1.2], twoFive: [2, 0.6], secondaryDom: [3, 0.9], fnSwap: [2, 0.8], deceptive: [2, 0.7], minorPlagal: [2, 1.4], flatSix: [3, 0.9], flatSeven: [2, 1.1], mario: [3, 0.9], picardy: [3, 0.6], lydianII: [3, 0.5], lineCliche: [3, 0.8], susHybrid: [3, 0.7], passingDim: [3, 0.5], chromaticMediant: [3, 0.6], parallelMinor: [3, 0.6], backdoor: [3, 0.4], walkDown: [2, 1.3], planeUp: [2, 0.8], sequenceFifths: [3, 0.6], lament: [2, 1.0] },
    },
    neosoul: {
      id: 'neosoul', name: 'Neo-soul', blurb: 'Neo-soul and R&B: 9ths and 11ths, sus hybrids, Lydian IV, planing, pedal bass. Warm and floating.', ceiling: 4,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (major) {
          if (r === 0 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 5 && k === 'maj') return d >= 4 ? 'maj7s11' : d >= 2 ? 'maj9' : 'maj7';
          if (r === 2 && k === 'min') return d >= 3 ? 'm11' : d >= 2 ? 'm9' : 'm7';
          if (r === 9 && k === 'min') return d >= 3 ? 'm11' : d >= 2 ? 'm9' : 'm7';
          if (r === 4 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 3 ? '13sus4' : d >= 2 ? '9sus4' : '7';
          if (r === 11 && k === 'dim') return 'm7b5';
          if (r === 8 && k === 'maj') return 'maj9';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
        } else {
          if (r === 0 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 5 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 3 ? '7b9' : '7';
          if (r === 8 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 3 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
          if (r === 2 && k === 'dim') return 'm7b5';
        }
        return null;
      },
      t: { recolor: [1, 1.4], slashBass: [1, 0.7], pedal: [3, 1.0], twoFive: [2, 0.8], secondaryDom: [2, 0.7], fnSwap: [2, 0.8], deceptive: [2, 0.5], backdoor: [3, 0.9], turnaround: [3, 0.6], minorPlagal: [2, 1.0], flatSix: [3, 0.9], flatSeven: [3, 0.6], lydianII: [4, 0.7], halfDimTwo: [3, 0.8], planing: [4, 1.3], noLanding: [3, 1.0], passingDim: [4, 0.5], tritoneSub: [4, 0.8], chromaticMediant: [4, 0.8], lineCliche: [3, 0.7], susHybrid: [3, 1.3], lydianIV: [4, 1.2], altered: [4, 0.5], constant: [4, 0.6], dorian: [2, 1.0], walkDown: [2, 0.8], chromaticMinorDescent: [3, 1.4], slideMinorThird: [3, 1.0], loopTwoFive: [3, 0.9], minorTwoFive: [3, 0.7], backcycle: [4, 0.6], lament: [2, 0.8] },
    },
    gospel: {
      id: 'gospel', name: 'Gospel', blurb: 'Contemporary gospel: 2-5-1s with 13ths, passing diminisheds, chromatic walk-ups, tritone subs, altered dominants. Church.', ceiling: 5,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (major) {
          if (r === 0 && k === 'maj') return d >= 3 ? '69' : d >= 2 ? 'maj9' : null;
          if (r === 5 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if ((r === 2 || r === 9) && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 4 && k === 'min') return 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 5 ? '13b9' : d >= 3 ? '13' : d >= 2 ? '9' : '7';
          if (r === 11 && k === 'dim') return 'm7b5';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 3 ? '13' : '9';
          if (r === 8 && k === 'maj') return 'maj9';
        } else {
          if (r === 0 && k === 'min') return d >= 3 ? 'm6/9' : d >= 2 ? 'm9' : 'm7';
          if (r === 5 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 4 ? '7s9' : d >= 3 ? '7b9' : '7';
          if (r === 8 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 3 && k === 'maj') return 'maj7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '13' : '9';
          if (r === 2 && k === 'dim') return 'm7b5';
        }
        return null;
      },
      t: { recolor: [1, 1.2], sus: [1, 1.0], slashBass: [1, 1.0], pedal: [3, 0.5], twoFive: [2, 1.2], secondaryDom: [2, 1.2], fnSwap: [2, 0.6], deceptive: [2, 0.6], backdoor: [3, 0.9], turnaround: [3, 1.2], minorPlagal: [2, 1.0], flatSix: [3, 0.8], mario: [3, 0.6], picardy: [2, 0.8], halfDimTwo: [3, 0.8], passingDim: [3, 1.5], gospelWalk: [3, 1.6], ctDim: [4, 0.8], tritoneSub: [3, 1.2], tritoneChain: [4, 1.0], gospelWalkUp: [4, 1.3], domChainDown: [5, 1.0], susHybrid: [3, 1.0], altered: [4, 1.2], sixthDim: [5, 0.9], lineCliche: [3, 0.6], walkDown: [2, 1.0], gospelDescent: [3, 1.4], backcycle: [4, 1.3], minorTwoFive: [3, 0.9], preacher: [4, 1.1], chromaticMinorDescent: [4, 0.8], dameron: [5, 0.7], lament: [2, 0.7] },
    },
    jazz: {
      id: 'jazz', name: 'Jazz', blurb: 'Standards to postbop: ii–V insertion, tritone subs, the backdoor, Coltrane cycles, altered dominants, rootless voicings.', ceiling: 5,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (major) {
          if (r === 0 && k === 'maj') return d >= 3 ? 'maj9' : d >= 2 ? '69' : 'maj7';
          if (r === 5 && k === 'maj') return d >= 4 ? 'maj7s11' : 'maj7';
          if (r === 2 && k === 'min') return d >= 3 ? 'm9' : 'm7';
          if ((r === 9 || r === 4) && k === 'min') return 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 3 ? '13' : d >= 2 ? '9' : '7';
          if (r === 11 && k === 'dim') return 'm7b5';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
          if (r === 8 && k === 'maj') return 'maj7';
          if (r === 3 && k === 'maj') return 'maj7';
        } else {
          if (r === 0 && k === 'min') return d >= 3 ? 'm6/9' : d >= 2 ? 'm9' : 'm7';
          if (r === 5 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 4 ? '7alt' : d >= 2 ? '7b9' : '7';
          if (r === 8 && k === 'maj') return 'maj7';
          if (r === 3 && k === 'maj') return 'maj7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return '7';
          if (r === 2 && k === 'dim') return 'm7b5';
        }
        return null;
      },
      t: { recolor: [1, 1.2], slashBass: [2, 0.4], twoFive: [1, 1.4], secondaryDom: [2, 1.0], fnSwap: [1, 0.7], deceptive: [2, 0.6], backdoor: [2, 1.3], turnaround: [2, 1.2], minorPlagal: [2, 0.8], flatSix: [3, 0.6], halfDimTwo: [3, 0.9], planing: [4, 0.6], passingDim: [3, 1.0], ctDim: [4, 0.7], tritoneSub: [3, 1.5], tritoneChain: [4, 1.2], susHybrid: [3, 0.8], lydianIV: [4, 0.9], altered: [4, 1.3], constant: [5, 0.8], sixthDim: [5, 0.9], coltrane: [5, 1.0], lineCliche: [3, 0.5], chromaticMediant: [4, 0.4], chromaticMinorDescent: [4, 1.0], backcycle: [4, 1.1], dameron: [5, 1.0], minorTwoFive: [3, 1.1], sequenceFifths: [3, 0.7], lament: [2, 0.8], slideMinorThird: [4, 0.5] },
    },
    classical: {
      id: 'classical', name: 'Classical', blurb: 'Common-practice and Romantic harmony: inversions and suspensions, applied chords, the Neapolitan, augmented sixths, deceptive cadences, chromatic mediants.', ceiling: 4,
      recolor() { return null; },
      t: { slashBass: [1, 1.4], sus: [1, 0.8], secondaryDom: [2, 1.2], deceptive: [2, 1.2], minorPlagal: [2, 1.0], flatSix: [2, 0.9], picardy: [2, 1.0], neapolitan: [3, 1.3], passingDim: [3, 0.9], ctDim: [4, 1.0], augSixth: [3, 1.4], chromaticMediant: [4, 1.0], parallelMinor: [3, 0.7], lineCliche: [3, 0.6], hexPole: [4, 0.6], walkDown: [2, 1.0], sequenceFifths: [2, 1.3], lament: [2, 1.4], pantriadic: [4, 0.8], planeUp: [3, 0.6] },
    },
    film: {
      id: 'film', name: 'Film', blurb: 'Orchestral and cinematic: chromatic mediants for wonder, Lydian lifts, the Mario cadence, pedal points, planing triads.', ceiling: 4,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c);
        if (d < 2) return null;
        if (r === 0 && k === 'maj' && i !== prog.length - 1) return 'add9';
        if (r === 5 && k === 'maj') return d >= 3 ? 'maj7s11' : 'add9';
        if ((r === 9 || r === 2) && k === 'min' && d >= 3) return 'madd9';
        return null;
      },
      t: { recolor: [2, 0.7], sus: [1, 1.0], slashBass: [1, 0.9], pedal: [3, 1.1], deceptive: [2, 0.6], minorPlagal: [2, 1.2], flatSix: [2, 1.3], flatSeven: [2, 1.0], mario: [3, 1.4], picardy: [2, 0.7], lydianII: [3, 1.4], neapolitan: [4, 0.5], chromaticMediant: [3, 1.6], parallelMinor: [3, 1.0], hexPole: [4, 1.0], augSixth: [4, 0.5], lydianIV: [4, 0.8], lineCliche: [3, 0.5], susHybrid: [4, 0.5], walkDown: [2, 0.7], pantriadic: [3, 1.5], planeUp: [2, 1.0], lament: [2, 1.1], sequenceFifths: [3, 0.5] },
    },
    lofi: {
      id: 'lofi', name: 'Lo-fi', blurb: 'Hip-hop and lo-fi loops: m9 and maj9 planing, Dorian vamps, ii–V with no I, loops that never land.', ceiling: 3,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (major) {
          if (r === 0 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 5 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if ((r === 2 || r === 9 || r === 4) && k === 'min') return d >= 3 ? 'm11' : d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9sus4' : '7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
        } else {
          if (r === 0 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 5 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 8 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 3 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return '7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
        }
        return null;
      },
      t: { recolor: [1, 1.5], pedal: [3, 0.7], twoFive: [2, 0.7], fnSwap: [2, 0.9], minorPlagal: [2, 1.0], flatSeven: [2, 0.8], flatSix: [3, 0.6], planing: [3, 1.4], noLanding: [2, 1.5], dorian: [2, 1.4], susHybrid: [3, 1.0], lydianIV: [3, 0.8], chromaticMediant: [3, 0.6], lineCliche: [3, 0.5], tritoneSub: [3, 0.5], backdoor: [3, 0.6], chromaticMinorDescent: [3, 1.2], slideMinorThird: [2, 1.2], loopTwoFive: [2, 1.4], lament: [2, 0.8], walkDown: [2, 0.6] },
    },
  };
  const STYLE_ORDER = ['pop', 'neosoul', 'gospel', 'jazz', 'classical', 'film', 'lofi'];

  // Style-flavored chord qualities for new chords
  const Qs = {
    ii(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: d >= 3 ? 'm11' : 'm9', gospel: 'm9', jazz: d >= 3 ? 'm9' : 'm7', lofi: 'm9' })[style]; },
    V(style, d) { return ({ pop: 'maj', film: 'maj', classical: '7', neosoul: d >= 3 ? '13sus4' : '9sus4', gospel: d >= 3 ? '13' : '9', jazz: d >= 3 ? '13' : '7', lofi: '9sus4' })[style]; },
    V7(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '9', gospel: d >= 4 ? '13b9' : '13', jazz: d >= 3 ? '13' : '7', lofi: '9' })[style]; },
    secV(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '9', gospel: d >= 4 ? '7s9' : '7', jazz: d >= 3 ? '7b9' : '7', lofi: '9' })[style]; },
    minor(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: d >= 2 ? 'm9' : 'm7', gospel: d >= 2 ? 'm9' : 'm7', jazz: 'm7', lofi: 'm9' })[style]; },
    major(style, d) { return ({ pop: 'maj', film: 'maj', classical: 'maj', neosoul: d >= 2 ? 'maj9' : 'maj7', gospel: d >= 2 ? 'maj9' : 'maj7', jazz: 'maj7', lofi: 'maj9' })[style]; },
    iv(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: 'm6', gospel: d >= 3 ? 'm6/9' : 'm6', jazz: 'm6', lofi: 'm9' })[style]; },
    bVII(style, d) { return ({ pop: 'maj', film: 'maj', classical: 'maj', neosoul: '9', gospel: '13', jazz: '9', lofi: 'maj7' })[style]; },
    subV(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '13sus4', gospel: d >= 4 ? '13' : '7s11', jazz: d >= 4 ? '7s11' : '9', lofi: '9' })[style]; },
  };

  // ---------- transforms ----------
  // Each returns an array of { prog, device, reason, heard?, family }.
  const X = {};

  X.recolor = (prog, key, s, d) => {
    const pack = STYLES[s]; const out = clone(prog); let n = 0;
    out.forEach((c, i) => {
      if (c.lock || c.q === '6' || c.q === 'm6') return;
      let q = pack.recolor(c, key, d, i, prog); if (!q) return;
      if (c.bass != null) { // an inversion keeps its bass a chord tone and stays modest
        const cap = { maj: 'maj7', min: 'm7', dom: '7', sus: '7sus4' }[T.Q[q].cat] || q; q = (RANK[q] || 0) > (RANK[cap] || 0) ? cap : q;
        if (!T.Q[q].iv.some(iv => mod(c.root + iv, 12) === c.bass)) return;
      }
      const u = upgrade(c, q); if (u !== c) { out[i] = Object.assign({}, u, { changed: 'mod' }); n++; }
    });
    if (!n) return [];
    const changed = out.filter(c => c.changed).map(c => sym(c, key)).join(', ');
    const why = { pop: 'the same chords with a little air in them: add9 on home, maj7 on IV, 7ths on the minors.', neosoul: '9ths and 11ths on everything; the V becomes a sus that floats instead of pulling.', gospel: 'home as a 6/9, 9ths on the minors, a 13th on the V. The hands get full.', jazz: 'the lead-sheet version: maj7, m7 and the dominant with its 9 or 13.', film: 'add9 and Lydian air over the same roots.', lofi: 'everything is a 9th chord; the loop gets glossy.' }[s];
    return [{ prog: out, device: 'Recolor', reason: `${changed}: ${why}`, family: 'recolor' }];
  };

  X.sus = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || beats(c) < 2) return;
      const susQ = (s === 'neosoul' || s === 'gospel' || s === 'lofi') ? '9sus4' : s === 'jazz' ? '7sus4' : 'sus4';
      const landQ = (s === 'pop' || s === 'film') ? (cat(c) === 'dom' ? c.q : 'maj') : Qs.V7(s, d);
      const out = replaceWith(prog, i, [mk(c.root, susQ), mk(c.root, landQ)]);
      res.push({ prog: out, device: 'Suspended V', reason: `${sym(out[i], key)} → ${sym(out[i + 1], key)}: the 4th hangs over the V, then falls to the 3rd. The V arrives twice, the second time with more weight.`, family: 'sus' });
    });
    return res.slice(0, 1);
  };

  X.slashBass = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const bassOf = (c) => c.bass != null ? c.bass : c.root;
    const smooth = (a, b) => { const iv = Math.min(mod(a - b, 12), mod(b - a, 12)); return iv === 0 ? 0.6 : iv <= 2 ? 2 : iv <= 4 ? 0.8 : 0; };
    const score = (p) => { let t = 0; for (let i = 0; i < p.length; i++) t += smooth(bassOf(p[i]), bassOf(next(p, i))); return t; };
    const base = score(prog);
    const cands = [];
    prog.forEach((c, i) => {
      if (c.bass != null) return;
      if ((i === prog.length - 1 || i === 0) && isTonic(c, key)) return; // the opening and closing tonic stay in root position
      const pcs = T.chordPcs(c);
      const opts = [pcs[1], pcs[2]]; if (pcs.length > 3 && cat(c) !== 'dim') opts.push(pcs[3]);
      for (const b of opts) {
        const out = clone(prog); out[i] = Object.assign({}, c, { bass: b, changed: 'mod' });
        const sc = score(out);
        if (sc > base + 0.9) cands.push({ i, out, sc });
      }
    });
    // try pairs too (two inversions making a longer line)
    const singles = cands.slice().sort((a, b) => b.sc - a.sc);
    for (let a = 0; a < Math.min(singles.length, 4); a++) for (let b = a + 1; b < Math.min(singles.length, 4); b++) {
      if (singles[a].i === singles[b].i) continue;
      const out = clone(singles[a].out); out[singles[b].i] = singles[b].out[singles[b].i];
      const sc = score(out); if (sc > Math.max(singles[a].sc, singles[b].sc) + 0.5) cands.push({ i: -1, out, sc });
    }
    cands.sort((a, b) => b.sc - a.sc);
    const res = [];
    const seen = new Set();
    for (const cnd of cands) {
      const k = cnd.out.map(c => (c.bass ?? c.root)).join(',');
      if (seen.has(k)) continue; seen.add(k);
      const line = cnd.out.map(c => pcn(bassOf(c), key)).join('–');
      const inverted = cnd.out.filter(c => c.changed).map(c => sym(c, key)).join(' and ');
      res.push({ prog: cnd.out, device: s === 'classical' ? 'Inversions' : 'Slash bass line', reason: `${inverted}: the bass now walks ${line}${s === 'classical' ? ' (' + cnd.out.map(c => rn(c, key)).join(' – ') + ')' : ''}. Same harmony, a melody underneath it.`, family: 'slashBass' });
      if (res.length >= 2) break;
    }
    return res;
  };

  X.pedal = (prog, key, s, d) => {
    const out = clone(prog); let n = 0;
    out.forEach((c, i) => {
      if (rel(c, key) === 0 || c.bass != null) return;
      const pcs = T.chordPcs(c);
      const ok = pcs.includes(key.tonic) || (isV(c, key)) || (rel(c, key) === 5);
      if (ok) { out[i] = Object.assign({}, c, { bass: key.tonic, changed: 'mod' }); n++; }
    });
    if (n < 2) return [];
    return [{ prog: out, device: 'Pedal bass', reason: `Everything over a ${pcn(key.tonic, key)} pedal: the chords move, the floor doesn't. ${s === 'film' ? 'Suspended, patient, waiting for something to arrive.' : 'Glasper\'s pedal-and-shifting-mode sound.'}`, family: 'pedal' }];
  };

  X.twoFive = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key)) return;
      const p = prev(prog, i); if (isii(p, key)) return;
      const ii = mk(key.tonic + 2, key.mode === 'major' ? Qs.ii(s, d) : 'm7b5');
      const out = approach(prog, i, ii); if (!out) return;
      const vIdx = out.findIndex((x, k) => x.root === c.root && k > 0 && out[k - 1].changed === 'new');
      res.push({ prog: out, device: 'Related ii–V', reason: `${sym(ii, key)} slips in before ${sym(c, key)}: the related ii–V. The bass falls in fifths, ${pcn(ii.root, key)}–${pcn(c.root, key)}–${pcn(next(prog, i).root, key)}.`, family: 'twoFive' });
    });
    return res.slice(0, 1);
  };

  X.secondaryDom = (prog, key, s, d) => {
    const res = [];
    const major = key.mode === 'major';
    const targets = major ? [6, 2, 4, 5, 3] : [4, 3, 6, 5, 7]; // preference order (vi first in major)
    for (const deg of targets) {
      prog.forEach((c, i) => {
        if (degOf(c, key) !== deg || cat(c) === 'dom' || cat(c) === 'dim') return;
        if (major && deg === 5 && isV(c, key) === false) return;
        const p = prev(prog, i);
        const vroot = mod(c.root + 7, 12);
        if (p.root === vroot && cat(p) === 'dom') return;
        let v = mk(vroot, s === 'gospel' && deg === 6 && d >= 4 ? '7s9' : Qs.secV(s, d));
        // V7/vi in first inversion so the bass climbs by half step into vi (C – E7/G♯ – Am)
        if (major && deg === 6 && (s === 'pop' || s === 'classical' || s === 'film' || s === 'gospel')) v = inv(v, 4);
        const out = approach(prog, i, v); if (!out) return;
        const label = T.analyze(v, key, c).secondary || ('V7/' + rn(c, key));
        const tgt = rn(c, key);
        let why = `${sym(v, key)} pushes into ${sym(c, key)}: ${label}.`;
        if (v.bass != null) why += ` The ${pcn(v.bass, key)} in the bass climbs a half step to ${pcn(c.root, key)}.`;
        else why += ` A borrowed leading tone (${T.chordToneNames(v, key)[1].name}) points straight at ${tgt}.`;
        if (deg === 6 && major && (s === 'pop' || s === 'classical' || s === 'film')) why += ' (Yesterday: F – Em7 – A7 – Dm.)';
        res.push({ prog: out, device: 'Secondary dominant', reason: why, family: 'secondaryDom' });
      });
    }
    return res.slice(0, 2);
  };

  X.fnSwap = (prog, key, s, d) => {
    const res = []; const major = key.mode === 'major';
    prog.forEach((c, i) => {
      if (i === prog.length - 1 && isTonic(c, key)) return;
      if (major && isTonic(c, key) && i !== 0) {
        const vi = mk(key.tonic + 9, Qs.minor(s, d));
        res.push({ prog: swap(prog, i, vi), device: 'vi for I', reason: `${sym(vi, key)} for ${sym(c, key)}: the same tones, a shade darker. The phrase avoids home until it has to arrive.`, family: 'fnSwap' });
      }
      if (isIV(c, key) && major) {
        const ii = mk(key.tonic + 2, Qs.ii(s, d));
        res.push({ prog: swap(prog, i, ii), device: 'ii for IV', reason: `${sym(ii, key)} for ${sym(c, key)}: ii stands in for IV, the bass drops a third and the next chord gets a proper ii–V.`, family: 'fnSwap' });
      }
      if (isvi(c, key) && !isTonic(prev(prog, i), key) && i !== 0) {
        const I = mk(key.tonic, Qs.major(s, d));
        res.push({ prog: swap(prog, i, I), device: 'I for vi', reason: `${sym(I, key)} for ${sym(c, key)}: the shadow turns back into the light. Brighter, more certain.`, family: 'fnSwap' });
      }
    });
    return res.slice(0, 2);
  };

  X.deceptive = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key)) return;
      const n = next(prog, i); const ni = (i + 1) % prog.length;
      if (!isTonic(n, key) || ni === 0) return;
      const vi = mk(key.tonic + (key.mode === 'major' ? 9 : 8), key.mode === 'major' ? Qs.minor(s, d) : Qs.major(s, d));
      res.push({ prog: swap(prog, ni, vi), device: 'Deceptive cadence', reason: `${sym(c, key)} – ${sym(vi, key)}: V–${key.mode === 'major' ? 'vi' : 'VI'}, the deceptive cadence. The ear expects home and gets its shadow${ni === prog.length - 1 ? '; the section stays open' : ''}.`, family: 'deceptive' });
    });
    return res.slice(0, 1);
  };

  X.backdoor = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key)) return;
      const bVII = mk(key.tonic + 10, Qs.bVII(s, d) === 'maj' ? '7' : Qs.bVII(s, d));
      if (beats(c) >= 2) {
        const iv = mk(key.tonic + 5, s === 'pop' ? 'min' : 'm7');
        const out = replaceWith(prog, i, [iv, bVII]);
        res.push({ prog: out, device: 'The backdoor', reason: `${sym(iv, key)} – ${sym(bVII, key)} – ${sym(next(prog, i), key)}: iv–♭VII7–I, the backdoor. ${sym(bVII, key)} shares three tones with ${sym(mk(key.tonic + 7, '7b9'), key)} and lands softer, from below. (Lady Bird.)`, family: 'backdoor' });
      } else {
        res.push({ prog: swap(prog, i, bVII), device: 'The backdoor', reason: `${sym(bVII, key)} for ${sym(c, key)}: ♭VII7 to I, the backdoor. Same pull, no leading tone — nostalgic, a sidelong resolution.`, family: 'backdoor' });
      }
    });
    return res.slice(0, 1);
  };

  X.turnaround = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const L = last(prog); if (!isTonic(L, key) || beats(L) < 4 || !isTonic(prog[0], key)) return [];
    const i = prog.length - 1;
    let chain;
    if (s === 'gospel') chain = [mk(key.tonic + 4, 'm7'), mk(key.tonic + 9, '13'), mk(key.tonic + 2, 'm9'), mk(key.tonic + 7, d >= 4 ? '13b9' : '13')];
    else if (s === 'neosoul') chain = [mk(key.tonic + 4, 'm9'), mk(key.tonic + 9, 'm9'), mk(key.tonic + 2, 'm9'), mk(key.tonic + 7, '13sus4')];
    else chain = [mk(key.tonic + 4, 'm7'), mk(key.tonic + 9, 'm7'), mk(key.tonic + 2, 'm7'), mk(key.tonic + 7, '7')];
    const out = replaceWith(prog, i, chain);
    return [{ prog: out, device: 'Turnaround', reason: `${syms(chain, key)}: the 3–6–2–5 turnaround sends the last bar back to the top.${s === 'gospel' ? ' The VI is a dominant (' + sym(chain[1], key) + '): church.' : ''}`, family: 'turnaround' }];
  };

  X.minorPlagal = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isIV(c, key)) return;
      const n = next(prog, i);
      const iv = mk(c.root, Qs.iv(s, d));
      const out = swap(prog, i, Object.assign({}, iv, { bass: null }));
      res.push({ prog: out, device: 'Minor plagal', reason: `${sym(iv, key)} for ${sym(c, key)}: iv borrowed from ${T.keyName({ tonic: key.tonic, mode: 'minor' })} before ${sym(n, key)} — the plagal sigh. Bittersweet, a catch in the throat. (Creep; In My Life.)`, family: 'minorPlagal' });
    });
    return res.slice(0, 1);
  };

  X.flatSix = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    const q = (s === 'neosoul' || s === 'lofi') ? 'maj9' : (s === 'jazz' || s === 'gospel') ? 'maj7' : 'maj';
    prog.forEach((c, i) => {
      if (isIV(c, key) && isV(next(prog, i), key)) {
        const b6 = mk(key.tonic + 8, q);
        res.push({ prog: swap(prog, i, b6), device: '♭VI', reason: `${sym(b6, key)} for ${sym(c, key)}: ♭VI borrowed from the parallel minor. Noble and wide; the bass drops a half step into ${sym(next(prog, i), key)}.`, family: 'flatSix' });
      } else if (isvi(c, key)) {
        const b6 = mk(key.tonic + 8, q);
        res.push({ prog: swap(prog, i, b6), device: '♭VI', reason: `${sym(b6, key)} where ${sym(c, key)} was: the sad chord's place in the phrase, now major and a half step lower. Cinematic.`, family: 'flatSix' });
      }
    });
    return res.slice(0, 1);
  };

  X.flatSeven = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key)) return;
      const b7 = mk(key.tonic + 10, Qs.bVII(s, d));
      res.push({ prog: swap(prog, i, b7), device: '♭VII (Mixolydian)', reason: `${sym(b7, key)} for ${sym(c, key)}: Mixolydian ♭VII, no leading tone. Earthy, open-road (Sweet Home Alabama's I–♭VII–IV).`, family: 'flatSeven' });
    });
    return res.slice(0, 1);
  };

  X.mario = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key) || beats(c) < 2) return;
      const b6 = mk(key.tonic + 8, 'maj'), b7 = mk(key.tonic + 10, 'maj');
      const out = replaceWith(prog, i, [b6, b7]);
      res.push({ prog: out, device: 'Mario cadence', reason: `${sym(b6, key)} – ${sym(b7, key)} – ${sym(next(prog, i), key)}: ♭VI–♭VII–I. The bass marches up to home in whole steps. Triumphant (Kiss From a Rose; the level-clear fanfare).`, family: 'mario' });
    });
    return res.slice(0, 1);
  };

  X.picardy = (prog, key, s, d) => {
    if (key.mode !== 'minor') return [];
    const L = last(prog); if (!(rel(L, key) === 0 && cat(L) === 'min')) return [];
    const I = mk(key.tonic, s === 'gospel' || s === 'neosoul' ? 'maj9' : s === 'jazz' ? 'maj7' : 'maj');
    return [{ prog: swap(prog, prog.length - 1, I), device: 'Picardy third', reason: `${sym(I, key)} to end: the Picardy third. The last chord turns to major — hopeful, a light left on.`, family: 'picardy' }];
  };

  X.neapolitan = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(next(prog, i), key)) return;
      if (!(isIV(c, key) || isii(c, key))) return;
      const N = inv(mk(key.tonic + 1, 'maj'), 4); // ♭II in first inversion
      res.push({ prog: swap(prog, i, N), device: 'Neapolitan sixth', reason: `${sym(N, key)} (N⁶) in place of ${sym(c, key)}: the Neapolitan, a chromatic predominant a half step above home. Pathos, something lost (Moonlight Sonata).`, family: 'neapolitan' });
    });
    return res.slice(0, 1);
  };

  X.lydianII = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isii(c, key)) return;
      const II = mk(key.tonic + 2, s === 'neosoul' ? '69' : s === 'film' ? 'add9' : 'maj');
      res.push({ prog: swap(prog, i, II), device: 'Lydian II', reason: `${sym(II, key)} for ${sym(c, key)}: the Lydian II. The ${pcn(key.tonic + 6, key)} lifts the whole phrase — wonder, a door opening.`, family: 'lydianII' });
    });
    return res.slice(0, 1);
  };

  X.halfDimTwo = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isii(c, key) || cat(c) === 'dim' || !isV(next(prog, i), key)) return;
      const ii = mk(c.root, 'm7b5');
      res.push({ prog: swap(prog, i, ii), device: 'Half-diminished ii', reason: `${sym(ii, key)} for ${sym(c, key)}: the ii from ${T.keyName({ tonic: key.tonic, mode: 'minor' })}. The ${pcn(key.tonic + 8, key)} darkens the approach to ${sym(next(prog, i), key)} — yearning.`, family: 'halfDimTwo' });
    });
    return res.slice(0, 1);
  };

  X.planing = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isIV(c, key) || !isV(next(prog, i), key)) return;
      const ni = (i + 1) % prog.length;
      const F = mk(c.root, 'maj9'), Eb = mk(c.root - 2, 'maj9');
      let out = swap(prog, ni, Eb); out[i] = Object.assign({}, F, { beats: beats(c), changed: 'mod' });
      res.push({ prog: out, device: 'Planing', reason: `${sym(F, key)} – ${sym(Eb, key)}: the V replaced by the same maj9 shape a whole step below IV. Parallel motion, no leading tone (Badu, Other Side of the Game). Glossy, unresolved.`, family: 'planing' });
    });
    return res.slice(0, 1);
  };

  X.noLanding = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key)) return;
      const iii = mk(key.tonic + 4, s === 'neosoul' ? 'm11' : 'm9');
      res.push({ prog: swap(prog, i, iii), device: 'The loop never lands', reason: `${sym(iii, key)} for ${sym(c, key)}: iii instead of V, so the loop never resolves and can go round forever. Head-nod, suspended (Lions, Tigers & Bears keeps its chorus off the tonic the same way).`, family: 'noLanding' });
    });
    return res.slice(0, 1);
  };

  X.dorian = (prog, key, s, d) => {
    if (key.mode !== 'minor') return [];
    const i = prog.findIndex(c => rel(c, key) === 0 && cat(c) === 'min' && beats(c) >= 4);
    if (i < 0) return [];
    const one = mk(key.tonic, 'm9'), two = mk(key.tonic + 2, 'm7');
    const out = replaceWith(prog, i, [one, two]);
    return [{ prog: out, device: 'Dorian vamp', reason: `${sym(one, key)} – ${sym(two, key)}: a Dorian i–ii vamp. The raised 6th (${pcn(key.tonic + 9, key)}) keeps the minor from sinking (Badu, Didn't Cha Know).`, family: 'dorian' }];
  };

  X.passingDim = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i); if ((i + 1) % prog.length === 0) return;
      if (mod(n.root - c.root, 12) !== 2 || cat(c) === 'dim' || cat(n) === 'dim' || beats(c) < 2) return;
      if (!degOf(c, key) || !degOf(n, key)) return;
      const dim = mk(c.root + 1, 'dim7');
      const out = passing(prog, i, dim); if (!out) return;
      res.push({ prog: out, device: 'Passing diminished', reason: `${sym(c, key)} – ${sym(dim, key)} – ${sym(n, key)}: a passing diminished fills the whole step. The bass walks ${pcn(c.root, key)}–${pcn(dim.root, key, 'dim7')}–${pcn(n.root, key)}${s === 'gospel' ? '; church' : s === 'jazz' ? '; it is really ' + sym(mk(c.root + 10, '7b9'), key) + ' with no root' : ''}.`, family: 'passingDim' });
    });
    return res.slice(0, 2);
  };

  X.gospelWalk = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isIV(c, key) || !isV(next(prog, i), key) || beats(c) < 2) return;
      const ni = (i + 1) % prog.length;
      const F = mk(c.root, 'maj'), Fs = mk(c.root + 1, 'dim7'), CG = inv(mk(key.tonic, 'maj'), 7), G7 = mk(key.tonic + 7, d >= 5 ? '7s9s5' : d >= 4 ? '13b9' : '7');
      let out = clone(prog);
      const vb = beats(out[ni]), fb = beats(c);
      const seq = [Object.assign(F, { beats: fb / 2 }), Object.assign(Fs, { beats: fb / 2, changed: 'new' }), Object.assign(CG, { beats: vb / 2, changed: 'new' }), Object.assign(G7, { beats: vb / 2, changed: 'mod' })];
      if (ni > i) out.splice(i, 2, ...seq); else { out.splice(i, 1, ...seq.slice(0, 2)); out.splice(0, 1, ...seq.slice(2)); }
      const p = prev(prog, i);
      if (isTonic(p, key) && p.bass == null) { const pi = out.findIndex(x => x === out[(i - 1 + out.length) % out.length]); if (pi >= 0 && !out[pi].changed) out[pi] = Object.assign({}, out[pi], { bass: mod(key.tonic + 4, 12), changed: 'mod' }); }
      res.push({ prog: out, device: 'The 3–4–♯4–5 walk', reason: `${syms(seq, key)}: the gospel bass walk. ${pcn(c.root, key)} – ${pcn(Fs.root, key, 'dim7')} – ${pcn(CG.bass, key)} fills the line into the V${d >= 4 ? ', which arrives altered' : ''}. Church, lift, hands up.`, family: 'gospelWalk' });
    });
    return res.slice(0, 1);
  };

  X.ctDim = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4) return;
      const ct = mk(c.root + 3, 'dim7'); // ♯ii°7 shares the tonic
      const out = replaceWith(prog, i, [c, ct, c], [2, 1, 1]);
      res.push({ prog: out, device: 'Common-tone diminished', reason: `${sym(c, key)} – ${sym(ct, key)} – ${sym(c, key)}: the common-tone diminished. Everything shimmers for a beat while ${pcn(c.root, key)} stays on top, then comes back.`, family: 'ctDim' });
    });
    return res.slice(0, 1);
  };

  X.tritoneSub = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (cat(c) !== 'dom' && !isV(c, key)) return;
      const n = next(prog, i); if (mod(c.root - n.root, 12) !== 7) return;
      const sub = mk(c.root + 6, Qs.subV(s, d), mod(c.root + 6 - key.tonic, 12) === 6 ? { pref: 'flat' } : {});
      const a = T.analyze(c, key, n);
      const dom = T.chordToneNames(mk(c.root, '7'), key);
      res.push({ prog: swap(prog, i, Object.assign({}, sub, { bass: null })), device: 'Tritone sub', reason: `${sym(sub, key)} for ${sym(c, key)}: the tritone substitute${a.secondary ? ' of ' + a.secondary : ''}. Same ${dom[1].name}–${dom[3].name} tension, and the bass slides down a half step into ${sym(n, key)}. Smoky.`, family: 'tritoneSub' });
    });
    return res.slice(0, 2);
  };

  X.tritoneChain = (prog, key, s, d) => {
    if (key.mode !== 'major' || prog.length < 3) return [];
    // find vi – IV – V (→ I) or any X – IV – V → I
    const res = [];
    for (let i = 0; i < prog.length; i++) {
      const a = prog[i], b = next(prog, i), c = next(prog, i + 1), dd = next(prog, i + 2);
      if (!isIV(b, key) || !isV(c, key) || !isTonic(dd, key)) continue;
      const out = clone(prog);
      const bi = (i + 1) % prog.length, ci = (i + 2) % prog.length;
      out[bi] = Object.assign({}, mk(key.tonic + 2, 'm9'), { beats: beats(b), changed: 'mod' });
      out[ci] = Object.assign({}, mk(key.tonic + 1, '7s11'), { beats: beats(c), changed: 'mod' });
      let why = `${sym(b, key)} becomes ${sym(out[bi], key)} and ${sym(c, key)} becomes ${sym(out[ci], key)} — the ii–V with its dominant swapped for the tritone sub.`;
      if (isvi(a, key)) { out[i] = Object.assign({}, mk(key.tonic + 3, '7s11'), { beats: beats(a), changed: 'mod' }); why = `${sym(a, key)}→${sym(mk(key.tonic + 9, '7'), key)}→${sym(out[i], key)} and ${sym(c, key)}→${sym(out[ci], key)}: both dominants replaced by their tritone subs. The bass falls ${pcn(out[i].root, key)}–${pcn(out[bi].root, key)}–${pcn(out[ci].root, key)}–${pcn(key.tonic, key)}. Smoky, the late set.`; }
      res.push({ prog: out, device: 'Tritone chain', reason: why, family: 'tritoneChain' });
      break;
    }
    return res;
  };

  X.gospelWalkUp = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key) || beats(c) < 2) return;
      const p = prev(prog, i); const pi = (i - 1 + prog.length) % prog.length;
      const F = mk(key.tonic + 5, '13'), Fs = mk(key.tonic + 6, '13', { pref: 'sharp' }), G = mk(key.tonic + 7, '13sus4');
      let out;
      if (isIV(p, key) && pi !== i) { out = clone(prog); out[pi] = Object.assign(F, { beats: beats(p) / 2, changed: 'mod' }); out.splice(pi + 1, 0, Object.assign(Fs, { beats: beats(p) / 2, changed: 'new' })); const gi = out.indexOf(out.find((x, k) => k > pi + 1 && x.root === c.root)); out[gi] = Object.assign(G, { beats: beats(c), changed: 'mod' }); }
      else out = replaceWith(prog, i, [F, Fs, G], [1, 1, 2]);
      res.push({ prog: out, device: 'Chromatic walk-up', reason: `${sym(F, key)} – ${sym(Fs, key)} – ${sym(G, key)}: dominants walk up by half step into the V, which arrives as a sus. Shout-chorus energy.`, family: 'gospelWalkUp' });
    });
    return res.slice(0, 1);
  };

  X.domChainDown = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i); if (!isTonic(n, key) || beats(c) < 3 || isTonic(c, key)) return;
      const chain = [3, 2, 1].map(k => mk(n.root + k, k === 1 ? '13' : '7s9'));
      const out = replaceWith(prog, i, chain);
      res.push({ prog: out, device: 'Dominants falling', reason: `${syms(chain, key)} – ${sym(n, key)}: dominant chords fall by half step into home. The shout.`, family: 'domChainDown' });
    });
    return res.slice(0, 1);
  };

  X.augSixth = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(next(prog, i), key) || !(isIV(c, key) || isii(c, key) || (key.mode === 'minor' && rel(c, key) === 8))) return;
      const ni = (i + 1) % prog.length;
      const ger = Object.assign(mk(key.tonic + 8, '7'), { label: 'Ger⁶', roman: 'Ger⁶', spell: { [mod(key.tonic + 6, 12)]: T.pcName(key.tonic + 6, key, 'dim') } });
      const cad = Object.assign(inv(mk(key.tonic, key.mode === 'major' ? 'maj' : 'min'), 7), { roman: 'Cad⁶₄' });
      const V7 = mk(key.tonic + 7, '7');
      const out = clone(prog);
      const vb = beats(out[ni]);
      out[i] = Object.assign(ger, { beats: beats(c), changed: 'mod' });
      out.splice(ni, 1, Object.assign(cad, { beats: vb / 2, changed: 'new' }), Object.assign(V7, { beats: vb / 2, changed: 'mod' }));
      res.push({ prog: out, device: 'German sixth', reason: `${T.chordToneNames(ger, key).map(t => t.name).join('–').replace(pcn(key.tonic + 6, key, '7'), pcn(key.tonic + 6, key, 'dim'))} (Ger⁶) replaces ${sym(c, key)}: ${pcn(key.tonic + 8, key)} and ${pcn(key.tonic + 6, key, 'dim')} squeeze onto ${pcn(key.tonic + 7, key)} from both sides; the 6/4 delays the V. Romantic yearning (Schubert).`, family: 'augSixth' });
    });
    return res.slice(0, 1);
  };

  X.chromaticMediant = (prog, key, s, d) => {
    const res = []; const major = key.mode === 'major';
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || i === prog.length - 1) return;
      const ni = (i + 1) % prog.length; const n = prog[ni];
      if (isTonic(n, key) || cat(n) === 'dom') return;
      if (major) {
        const III = mk(key.tonic + 4, (s === 'neosoul' || s === 'lofi' || s === 'jazz') ? 'maj7' : 'maj');
        res.push({ prog: swap(prog, ni, III), device: 'Chromatic mediant', reason: `${sym(III, key)} for ${sym(n, key)}: the chromatic mediant III — one shared tone (${pcn(key.tonic + 4, key)}), everything else shifts. Awe, a door opening (the Hollywood wonder move).`, family: 'chromaticMediant' });
        const bIII = mk(key.tonic + 3, (s === 'neosoul' || s === 'lofi' || s === 'jazz') ? 'maj9' : 'maj');
        res.push({ prog: swap(prog, ni, bIII), device: 'Chromatic mediant', reason: `${sym(bIII, key)} for ${sym(n, key)}: ♭III, a major chord a minor third up. Shares ${pcn(key.tonic + 7, key)} with home; noble, slightly unreal.`, family: 'chromaticMediant' });
      } else {
        const VI = mk(key.tonic + 9, 'maj');
        res.push({ prog: swap(prog, ni, VI), device: 'Chromatic mediant', reason: `${sym(VI, key)} for ${sym(n, key)}: a major chord on the raised sixth — a chromatic mediant that brightens the minor from inside.`, family: 'chromaticMediant' });
      }
    });
    return res.slice(0, 2);
  };

  X.parallelMinor = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 2 || cat(c) !== 'maj') return;
      const n = next(prog, i); if (!(isIV(n, key) || isvi(n, key) || rel(n, key) === 5)) return;
      const Cm = mk(key.tonic, 'min');
      const out = replaceWith(prog, i, [Object.assign({}, c), Cm]);
      res.push({ prog: out, device: 'Parallel minor', reason: `${sym(c, key)} – ${sym(Cm, key)} – ${sym(n, key)}: home turns to its own minor for a beat before moving on. The lights dim, then the phrase continues.`, family: 'parallelMinor' });
    });
    return res.slice(0, 1);
  };

  X.hexPole = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || i === prog.length - 1) return;
      const ni = (i + 1) % prog.length; if (isTonic(prog[ni], key)) return;
      const pole = mk(key.tonic + 8, 'min');
      res.push({ prog: swap(prog, ni, pole), device: 'Hexatonic pole', reason: `${sym(c, key)} – ${sym(pole, key)}: the hexatonic pole. No shared tones, every voice moves by a half step. Uncanny, otherworldly.`, family: 'hexPole' });
    });
    return res.slice(0, 1);
  };

  X.lineCliche = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (beats(c) < 4) return;
      if (cat(c) === 'min' && (c.q === 'min' || c.q === 'm7')) {
        const seq = [mk(c.root, 'min'), mk(c.root, 'mMaj7'), mk(c.root, 'm7'), mk(c.root, 'm6')];
        const out = replaceWith(prog, i, seq);
        res.push({ prog: out, device: 'Line cliché', reason: `${syms(seq, key)}: one inner voice walks down ${pcn(c.root, key)}–${T.chordToneNames(seq[1], key)[3].name}–${T.chordToneNames(seq[2], key)[3].name}–${T.chordToneNames(seq[3], key)[3].name} while the chord holds (the James Bond theme).`, family: 'lineCliche' });
      } else if (cat(c) === 'maj' && c.q === 'maj' && isIV(next(prog, i), key)) {
        const seq = [mk(c.root, 'maj'), mk(c.root, 'aug'), mk(c.root, '6'), mk(c.root, '7')];
        const out = replaceWith(prog, i, seq);
        res.push({ prog: out, device: 'Line cliché', reason: `${syms(seq, key)}: the fifth climbs ${T.chordToneNames(seq[0], key)[2].name}–${T.chordToneNames(seq[1], key)[2].name}–${T.chordToneNames(seq[2], key)[3].name}–${T.chordToneNames(seq[3], key)[3].name} and the 7th tips the chord into ${sym(next(prog, i), key)}.`, family: 'lineCliche' });
      }
    });
    return res.slice(0, 1);
  };

  X.susHybrid = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key)) return;
      const hyb = (s === 'jazz' || s === 'neosoul') ? mk(c.root, '13sus4') : Object.assign(mk(key.tonic + 5, key.mode === 'major' ? 'maj' : 'min'), { bass: mod(c.root, 12) });
      res.push({ prog: swap(prog, i, hyb), device: 'Sus hybrid', reason: `${sym(hyb, key)} for ${sym(c, key)}: ${s === 'jazz' || s === 'neosoul' ? 'the V as a 13sus — no 3rd, no pull, just color' : 'IV over the V in the bass — a sus hybrid; the V floats instead of pulling'}. Late night.`, family: 'susHybrid' });
    });
    return res.slice(0, 1);
  };

  X.lydianIV = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isIV(c, key)) return;
      const lyd = mk(c.root, d >= 5 ? 'maj9s11' : 'maj7s11');
      res.push({ prog: swap(prog, i, lyd), device: 'Lydian IV', reason: `${sym(lyd, key)}: Lydian color on IV. The ${pcn(key.tonic + 11, key)} hangs over ${pcn(c.root, key)} and refuses to resolve. Wonder, floating.`, family: 'lydianIV' });
    });
    return res.slice(0, 1);
  };

  X.altered = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i);
      const isDomRes = (cat(c) === 'dom' || isV(c, key)) && mod(c.root - n.root, 12) === 7;
      if (!isDomRes) return;
      const toMinor = cat(n) === 'min';
      let picks;
      if (s === 'gospel') picks = toMinor ? [['7s9', 'the ♯9 (' + T.chordToneNames(mk(c.root, '7s9'), key)[3].name + ') grinds against the 3rd — the gospel ♯9'], ['13b9', 'a 13 with a ♭9: full hands, church']] : [['13b9', 'a 13 with a ♭9 — full, bright, a little dangerous'], ['7s9', 'the ♯9 grinds against the 3rd before the release']];
      else if (s === 'jazz') picks = d >= 5 ? [['7s9b13', 'an ' + pcn(c.root + 8, key) + ' major triad over the dominant: the altered sound'], ['13s11', 'a ' + pcn(c.root + 2, key) + ' major triad on top: 9, ♯11, 13 — Lydian dominant']] : [['7b9', 'the ♭9 leans into the resolution'], ['13', 'a 13th on top: the standard lead-sheet color']];
      else picks = [['7b9', 'the ♭9 adds a shadow before the release']];
      for (const [q, why] of picks) {
        const alt = mk(c.root, q);
        res.push({ prog: swap(prog, i, Object.assign({}, alt, { bass: c.bass })), device: 'Altered dominant', reason: `${sym(alt, key)} for ${sym(c, key)}: ${why}. Grit, then release into ${sym(n, key)}.`, family: 'altered' });
      }
    });
    return res.slice(0, 2);
  };

  X.constant = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key) || beats(c) < 3) return;
      const seq = [mk(key.tonic + 5, 'maj9'), mk(key.tonic + 3, 'maj9'), mk(key.tonic + 1, 'maj9')];
      const out = replaceWith(prog, i, seq);
      res.push({ prog: out, device: 'Constant structure', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: the same maj9 shape slides down in whole steps into home. The key dissolves, then returns.`, family: 'constant' });
    });
    return res.slice(0, 1);
  };

  X.sixthDim = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4) return;
      const seq = [mk(c.root, '6'), mk(c.root + 2, 'dim7'), inv(mk(c.root, '6'), 4), mk(c.root + 5, 'dim7')];
      const out = replaceWith(prog, i, seq);
      res.push({ prog: out, device: 'Sixth-diminished', reason: `${syms(seq, key)}: the major sixth-diminished scale (Barry Harris). The chord climbs through its own shadow and keeps its color.`, family: 'sixthDim' });
    });
    return res.slice(0, 1);
  };

  X.coltrane = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 8) return;
      const t = key.tonic;
      const seq = [mk(t, 'maj7'), mk(t + 3, '7'), mk(t + 8, 'maj7'), mk(t + 11, '7'), mk(t + 4, 'maj7'), mk(t + 7, '7')];
      const out = replaceWith(prog, i, seq, [2, 1, 1, 1, 1, 2]);
      res.push({ prog: out, device: 'Coltrane cycle', reason: `${syms(seq, key)} – ${sym(c, key)}: three keys a major third apart, each entered by its V7, landing back on ${pcn(t, key)} (Giant Steps).`, family: 'coltrane' });
    });
    return res.slice(0, 1);
  };


  // ---------- bigger, phrase-level moves ----------
  X.walkDown = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4 || c.bass != null) return;
      const n = next(prog, i);
      if (isIV(n, key)) {
        const seq = [mk(key.tonic, c.q), inv(mk(key.tonic + 7, 'maj'), 4), mk(key.tonic + 9, Qs.minor(s, d)), inv(mk(key.tonic, 'maj'), 7)];
        res.push({ prog: replaceWith(prog, i, seq), device: 'Walking down to IV', reason: `${syms(seq, key)} – ${sym(n, key)}: the bass walks ${pcn(key.tonic, key)}–${pcn(key.tonic + 11, key)}–${pcn(key.tonic + 9, key)}–${pcn(key.tonic + 7, key)} into IV. The oldest pop descent there is (Let It Be, Whiter Shade of Pale).`, family: 'walkDown' });
      } else if (isvi(n, key)) {
        const seq = [mk(key.tonic, c.q), inv(mk(key.tonic + 7, s === 'pop' || s === 'film' ? 'maj' : '7'), 4)];
        res.push({ prog: replaceWith(prog, i, seq), device: 'Bass step to vi', reason: `${syms(seq, key)} – ${sym(n, key)}: V in first inversion between I and vi, so the bass steps ${pcn(key.tonic, key)}–${pcn(key.tonic + 11, key)}–${pcn(key.tonic + 9, key)} instead of leaping.`, family: 'walkDown' });
      }
    });
    return res.slice(0, 1);
  };

  X.gospelDescent = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4 || !isIV(next(prog, i), key)) return;
      const t = key.tonic;
      const seq = [mk(t, 'maj9'), inv(mk(t + 7, '7'), 4), mk(t + 9, 'm9'), mk(t + 7, 'm9'), mk(t, '13')];
      res.push({ prog: replaceWith(prog, i, seq, [1, 1, 1, 0.5, 0.5]), device: 'Descent to IV with a ii–V', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: the walk-down lands on ${sym(seq[3], key)} – ${sym(seq[4], key)}, a ii–V borrowed from the key of IV. The bass falls, the hands get full, IV arrives like a destination.`, family: 'gospelDescent' });
    });
    return res.slice(0, 1);
  };

  X.chromaticMinorDescent = (prog, key, s, d) => {
    if (key.mode !== 'major' || prog.length < 3) return [];
    const res = [];
    for (let i = 0; i < prog.length; i++) {
      const a = prog[i], b = next(prog, i), c = next(prog, i + 1);
      if (!(isIV(a, key) || isii(a, key)) || !isV(b, key) || !isTonic(c, key)) continue;
      const bi = (i + 1) % prog.length; if (bi < i) continue;
      const t = key.tonic; const q = s === 'lofi' ? 'm9' : 'm7';
      const seq = [mk(t + 4, q), mk(t + 3, q), mk(t + 2, q), mk(t + 1, s === 'jazz' ? '7s11' : '9')];
      const out = clone(prog); const total = beats(a) + beats(b);
      out.splice(i, 2, ...seq.map((x, k) => Object.assign({}, x, { beats: total / 4, changed: 'new' })));
      res.push({ prog: out, device: 'Chromatic descent', reason: `${syms(seq, key)} – ${sym(c, key)}: minor sevenths slide down by half step and the last one turns dominant. The bass walks ${pcn(t + 4, key)}–${pcn(t + 3, key)}–${pcn(t + 2, key)}–${pcn(t + 1, key)}–${pcn(t, key)} into home. The neo-soul staple (D'Angelo, Glasper).`, family: 'chromaticMinorDescent' });
      break;
    }
    return res;
  };

  X.backcycle = (prog, key, s, d) => {
    if (key.mode !== 'major' || prog.length < 2) return [];
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i); if (!isTonic(n, key) || isTonic(c, key) || beats(c) < 4) return;
      const t = key.tonic; const q = s === 'gospel' ? '13' : '7';
      const seq = [mk(t + 4, s === 'gospel' ? '7s9' : '7'), mk(t + 9, q), mk(t + 2, q), mk(t + 7, s === 'gospel' ? '13b9' : q)];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Around the cycle', reason: `${syms(seq, key)} – ${sym(n, key)}: dominants chained around the circle of fifths, III7–VI7–II7–V7, each one the V of the next. The Rhythm-changes bridge; in church, the turnaround that makes people stand up.`, family: 'backcycle' });
    });
    return res.slice(0, 1);
  };

  X.dameron = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const L = last(prog); if (!isTonic(L, key) || beats(L) < 4 || !isTonic(prog[0], key)) return [];
    const t = key.tonic;
    const seq = [mk(t, 'maj7'), mk(t + 3, '7'), mk(t + 8, '7'), mk(t + 1, '7')];
    return [{ prog: replaceWith(prog, prog.length - 1, seq), device: 'Dameron turnaround', reason: `${syms(seq, key)}: the Tadd Dameron turnaround — every dominant of the 1–6–2–5 replaced by its tritone sub, so the bass falls ${pcn(t, key)}–${pcn(t + 3, key)}–${pcn(t + 8, key)}–${pcn(t + 1, key)} back to the top (Lady Bird).`, family: 'dameron' }];
  };

  X.minorTwoFive = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isii(c, key) || cat(c) === 'dim' || !isV(next(prog, i), key) || !isTonic(next(prog, i + 1), key)) return;
      const ni = (i + 1) % prog.length; if (ni < i) return;
      const out = clone(prog);
      out[i] = Object.assign({}, mk(c.root, 'm7b5'), { beats: beats(c), changed: 'mod' });
      out[ni] = Object.assign({}, mk(key.tonic + 7, s === 'gospel' ? '7s9' : '7b9'), { beats: beats(prog[ni]), changed: 'mod' });
      res.push({ prog: out, device: 'Minor ii–V to major', reason: `${sym(out[i], key)} – ${sym(out[ni], key)} – ${sym(next(prog, i + 1), key)}: the ii–V borrowed from ${T.keyName({ tonic: key.tonic, mode: 'minor' })}, resolving to the major I. Darkness in the approach, light on arrival.`, family: 'minorTwoFive' });
    });
    return res.slice(0, 1);
  };

  X.pantriadic = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4) return;
      const t = key.tonic;
      const seq = [mk(t, 'maj'), mk(t + 8, 'maj'), mk(t + 4, 'maj')];
      res.push({ prog: replaceWith(prog, i, seq, [2, 1, 1]), device: 'Pantriadic cycle', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: major triads a major third apart. No key holds them; each shares one note with the last and everything else slips. Pure wonder (the Hollywood chromatic cycle).`, family: 'pantriadic' });
    });
    return res.slice(0, 1);
  };

  X.planeUp = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4 || !isIV(next(prog, i), key)) return;
      const t = key.tonic;
      const seq = s === 'film' ? [mk(t, 'maj'), mk(t + 2, 'min'), mk(t + 4, 'min')] : [mk(t, c.q), mk(t + 2, Qs.minor(s, d)), mk(t + 4, Qs.minor(s, d))];
      res.push({ prog: replaceWith(prog, i, seq, [2, 1, 1]), device: 'Climbing the scale', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: I–ii–iii–IV, the same shape walking up the scale into IV. Steady, gathering (Lean on Me).`, family: 'planeUp' });
    });
    return res.slice(0, 1);
  };

  X.sequenceFifths = (prog, key, s, d) => {
    if (key.mode !== 'major' || !isTonic(prog[0], key)) return [];
    const total = prog.reduce((a, c) => a + beats(c), 0); if (total < 8) return [];
    const t = key.tonic; const b = total / 8;
    const degs = [0, 5, 11, 4, 9, 2, 7, 0];
    const q = (r) => { const rel = mod(r, 12); const m = { 0: 'maj7', 5: 'maj7', 11: 'm7b5', 4: 'm7', 9: 'm7', 2: 'm7', 7: '7' }[rel]; return (s === 'classical' || s === 'pop' || s === 'film') ? ({ 11: 'dim', 4: 'min', 9: 'min', 2: 'min', 7: 'maj', 0: 'maj', 5: 'maj' })[rel] : m; };
    const seq = degs.map(r => Object.assign(mk(t + r, q(r)), { beats: b, changed: 'new' }));
    return [{ prog: seq, device: 'Descending fifths', reason: `${syms(seq, key)}: the circle-of-fifths sequence, I–IV–vii°–iii–vi–ii–V–I. Every root falls a fifth; the oldest engine in Western harmony (Pachelbel, Autumn Leaves, Fly Me to the Moon).`, family: 'sequenceFifths' }];
  };

  X.lament = (prog, key, s, d) => {
    if (key.mode !== 'minor') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!(rel(c, key) === 0 && cat(c) === 'min') || beats(c) < 4) return;
      const t = key.tonic;
      const seq = [mk(t, c.q === 'min' ? 'min' : c.q), inv(mk(t, 'm7'), 10), mk(t + 8, s === 'classical' || s === 'pop' || s === 'film' ? 'maj' : 'maj7'), mk(t + 7, s === 'jazz' || s === 'gospel' ? '7b9' : '7')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Lament bass', reason: `${syms(seq, key)}: the bass falls ${pcn(t, key)}–${pcn(t + 10, key)}–${pcn(t + 8, key)}–${pcn(t + 7, key)}, the lament tetrachord. Four centuries old and still the saddest four bars in music (Dido's Lament, Hit the Road Jack, Stairway).`, family: 'lament' });
    });
    return res.slice(0, 1);
  };

  X.slideMinorThird = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (cat(c) !== 'min' || beats(c) < 4) return;
      const seq = [mk(c.root, 'm9'), mk(c.root + 3, 'm9')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Minor-third slide', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: the same m9 shape slid up a minor third, then back into the phrase. Parallel, glossy, a little dizzy (Glasper's planing).`, family: 'slideMinorThird' });
    });
    return res.slice(0, 1);
  };

  X.loopTwoFive = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!(isIV(c, key) || isii(c, key)) || !isV(next(prog, i), key)) return;
      const ni = (i + 1) % prog.length;
      const out = clone(prog);
      out[i] = Object.assign({}, mk(key.tonic + 2, 'm9'), { beats: beats(c), changed: 'mod' });
      out[ni] = Object.assign({}, mk(key.tonic + 7, '13sus4'), { beats: beats(prog[ni]), changed: 'mod' });
      res.push({ prog: out, device: 'The ii–V that never lands', reason: `${sym(out[i], key)} – ${sym(out[ni], key)}: a ii–V with the V as a sus, so there is no leading tone and nothing resolves. Loop it all night.`, family: 'loopTwoFive' });
    });
    return res.slice(0, 1);
  };

  X.preacher = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4 || !isIV(next(prog, i), key)) return;
      const t = key.tonic;
      const seq = [mk(t, 'maj9'), mk(t + 1, 'dim7'), mk(t + 2, 'm9'), mk(t + 3, 'dim7')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Chromatic climb', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: diminished chords fill every half step on the way up to IV — ${pcn(t, key)}–${pcn(t + 1, key, 'dim7')}–${pcn(t + 2, key)}–${pcn(t + 3, key, 'dim7')}–${pcn(t + 5, key)}. The hands never stop moving.`, family: 'preacher' });
    });
    return res.slice(0, 1);
  };

  // ---------- Shadow (negative harmony) ----------
  function shadow(prog, key) {
    const out = prog.map(c => { const n = T.negative(c, key); return Object.assign({}, c, n || {}, { changed: 'mod' }); });
    return { prog: out, device: 'Shadow', reason: `Every chord reflected across the axis between ${pcn(key.tonic, key)} and ${pcn(key.tonic + 7, key)}: negative harmony. The V becomes a iv, up becomes down. The same song in a mirror.`, family: 'shadow' };
  }

  // ---------- the API ----------
  // ideas(prog, key, { style, depth, mood, limit }) → ranked options with mood readings and labels
  function ideas(prog, key, opts = {}) {
    const style = STYLES[opts.style] ? opts.style : 'pop';
    const pack = STYLES[style];
    const depth = Math.max(1, Math.min(pack.ceiling, opts.depth || 2));
    const limit = opts.limit || 6;
    let all = [];
    for (const [tid, [min, w]] of Object.entries(pack.t)) {
      if (min > depth || !X[tid]) continue;
      let outs;
      try { outs = X[tid](prog, key, style, depth); } catch (e) { outs = []; }
      outs.forEach(o => { o.depth = min; o.weight = w; o.style = style; });
      all = all.concat(outs);
    }
    // dedupe identical results and results identical to the input
    const sig = (p) => p.map(c => `${c.root}:${c.q}:${c.bass ?? ''}:${Math.round((c.beats || 4) * 4)}`).join('|');
    const inSig = sig(prog);
    const seen = new Set();
    all = all.filter(o => { const k = sig(o.prog); if (k === inSig || seen.has(k)) return false; seen.add(k); return true; });
    // readings and scores
    all.forEach(o => {
      o.mood = M.progressionMood(o.prog, key, style);
      o.roman = o.prog.map(c => c.roman || T.romanNumeral(c, key));
      let score = o.weight * (1 + 0.35 * (o.depth / depth)); // deeper (within the ask) ranks a little higher
      if (opts.mood) score += 1.6 * M.moodMatch(o.mood.focus || o.mood, opts.mood);
      o.score = score;
    });
    all.sort((a, b) => b.score - a.score);
    // diversity: at most two per family
    const count = {}; const picked = [];
    for (const o of all) { count[o.family] = (count[o.family] || 0) + 1; if (count[o.family] > 2) continue; picked.push(o); if (picked.length >= limit) break; }
    // whole-phrase rewrites: chain two or three compatible moves, then recolor in the style, so the writer can
    // hear the whole lens at once and not only one chord at a time
    if (opts.compose !== false && depth >= 2 && all.length >= 2) {
      const skip = new Set(['recolor', 'slashBass', 'pedal', 'sus', 'sequenceFifths', 'coltrane']);
      const build = (firstFamily) => {
        let base = prog.map(c => Object.assign({}, c, { changed: undefined })); const chain = []; const used = new Set();
        let kept = []; // chords earlier steps introduced; a later step may not undo them
        for (let step = 0; step < 3; step++) {
          const subs = ideas(base, key, Object.assign({}, opts, { compose: false, limit: 14, mood: null }));
          const pick = subs.find(o => !skip.has(o.family) && !used.has(o.family) && (step > 0 || !firstFamily || o.family === firstFamily) && o.prog.length <= 10 && kept.every(k => o.prog.some(c => T.sameChord(c, k))));
          if (!pick) break;
          used.add(pick.family); chain.push(pick);
          kept = kept.concat(pick.prog.filter(c => c.changed));
          base = pick.prog.map(c => Object.assign({}, c, { changed: undefined }));
        }
        if (chain.length < 2) return null;
        base = base.map(c => kept.some(k => T.sameChord(k, c)) ? Object.assign({}, c, { lock: true }) : c);
        const rec = X.recolor(base, key, style, depth); if (rec.length) base = rec[0].prog;
        base = base.map(c => { const o = Object.assign({}, c); delete o.lock; return o; });
        base = base.map(c => Object.assign({}, c, { changed: prog.some(o => T.sameChord(o, c)) ? undefined : 'mod' }));
        const o = { prog: base, device: 'Whole phrase: ' + chain.map(c => c.device.toLowerCase()).join(' + '), reason: chain.map(c => c.reason.split(/(?<=\.)\s/)[0]).join(' ') , family: 'compose', depth, weight: 0, style, score: -1 };
        o.mood = M.progressionMood(o.prog, key, style); o.roman = o.prog.map(c => c.roman || T.romanNumeral(c, key));
        return o;
      };
      const seen2 = new Set(picked.map(o => sig(o.prog)));
      const c1 = build(null); if (c1 && !seen2.has(sig(c1.prog))) { picked.push(c1); seen2.add(sig(c1.prog)); }
      const c2 = build(picked[1] && !skip.has(picked[1].family) ? picked[1].family : null); if (c2 && !seen2.has(sig(c2.prog))) picked.push(c2);
    }
    return picked;
  }

  function describe(prog, key) { return prog.map(c => c.roman || T.romanNumeral(c, key)).join(' – '); }

  return { STYLES, STYLE_ORDER, ideas, shadow, describe, X, helpers: { clone, mk, inv, replaceWith, approach, passing, swap, upgrade } };
})();
if (typeof module !== 'undefined') module.exports = Reharm;
