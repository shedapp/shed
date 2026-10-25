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
      id: 'pop', name: 'Pop', blurb: 'Singer-songwriter and modern pop: colors, slash bass lines, a borrowed chord at the right moment.', ceiling: 6,
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
      t: { recolor: [1, 1.0], sus: [1, 0.9], slashBass: [1, 1.2], twoFive: [2, 0.6], secondaryDom: [3, 0.9], fnSwap: [2, 0.8], deceptive: [2, 0.7], minorPlagal: [2, 1.4], flatSix: [3, 0.9], flatSeven: [2, 1.1], mario: [3, 0.9], picardy: [3, 0.6], lydianII: [3, 0.5], lineCliche: [3, 0.8], susHybrid: [3, 0.7], passingDim: [3, 0.5], chromaticMediant: [3, 0.6], parallelMinor: [3, 0.6], backdoor: [3, 0.4], walkDown: [2, 1.3], planeUp: [2, 0.8], sequenceFifths: [3, 0.6], lament: [2, 1.0], deceptiveSecondary: [3, 0.6], bluesSevenths: [2, 0.7], hybridCadence: [3, 0.7], canon: [2, 0.9], dominantPedal: [3, 0.6], modalCast: [3, 0.7], susResolve: [3, 0.8], sideslip: [5, 0.8], everyTarget: [6, 0.9], melodyReharm: [6, 1.4], keyLift: [6, 1.0] },
    },
    neosoul: {
      id: 'neosoul', name: 'Neo-soul', blurb: 'Neo-soul and R&B: 9ths and 11ths, sus hybrids, Lydian IV, planing, pedal bass. Warm and floating.', ceiling: 8,
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
      t: { recolor: [1, 1.4], slashBass: [1, 0.7], pedal: [3, 1.0], twoFive: [2, 0.8], secondaryDom: [2, 0.7], fnSwap: [2, 0.8], deceptive: [2, 0.5], backdoor: [3, 0.9], turnaround: [3, 0.6], minorPlagal: [2, 1.0], flatSix: [3, 0.9], flatSeven: [3, 0.6], lydianII: [4, 0.7], halfDimTwo: [3, 0.8], planing: [4, 1.3], noLanding: [3, 1.0], passingDim: [4, 0.5], tritoneSub: [4, 0.8], chromaticMediant: [4, 0.8], lineCliche: [3, 0.7], susHybrid: [3, 1.3], lydianIV: [4, 1.2], altered: [4, 0.5], constant: [4, 0.6], dorian: [2, 1.0], walkDown: [2, 0.8], chromaticMinorDescent: [3, 1.4], slideMinorThird: [3, 1.0], loopTwoFive: [3, 0.9], minorTwoFive: [3, 0.7], backcycle: [4, 0.6], lament: [2, 0.8], importantMinor: [3, 0.8], hybridCadence: [3, 1.1], quartalVamp: [4, 1.0], twoStep: [4, 0.7], dominantPedal: [3, 0.6], modalCast: [3, 0.7], dominantFamily: [4, 0.6], constantThirds: [4, 0.5], susResolve: [2, 1.0], sideslip: [4, 1.2], hendrix: [5, 1.0], upperStructure: [5, 1.1], susCast: [6, 1.2], everyTarget: [6, 0.9], melodyReharm: [7, 1.6], keyLift: [7, 1.0], sideslipAll: [7, 1.0], tritoneAll: [7, 0.8], pivotModulation: [8, 1.2] },
    },
    gospel: {
      id: 'gospel', name: 'Gospel', blurb: 'Contemporary gospel: 2-5-1s with 13ths, passing diminisheds, chromatic walk-ups, tritone subs, altered dominants, 7♯9 planing, shout turnarounds. Church.', ceiling: 8,
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
      t: { recolor: [1, 1.2], sus: [1, 1.0], slashBass: [1, 1.0], pedal: [3, 0.5], twoFive: [2, 1.2], secondaryDom: [2, 1.2], fnSwap: [2, 0.6], deceptive: [2, 0.6], backdoor: [3, 0.9], turnaround: [3, 1.2], minorPlagal: [2, 1.0], flatSix: [3, 0.8], mario: [3, 0.6], picardy: [2, 0.8], halfDimTwo: [3, 0.8], passingDim: [3, 1.5], gospelWalk: [3, 1.6], ctDim: [4, 0.8], tritoneSub: [3, 1.2], tritoneChain: [4, 1.0], gospelWalkUp: [4, 1.3], domChainDown: [5, 1.0], susHybrid: [3, 1.0], altered: [4, 1.2], sixthDim: [5, 0.9], lineCliche: [3, 0.6], walkDown: [2, 1.0], gospelDescent: [3, 1.4], backcycle: [4, 1.3], minorTwoFive: [3, 0.9], preacher: [4, 1.1], chromaticMinorDescent: [4, 0.8], dameron: [5, 0.7], lament: [2, 0.7], dominantFamily: [4, 1.1], importantMinor: [3, 1.0], minorSixthDim: [4, 0.9], deceptiveSecondary: [3, 0.9], bluesSevenths: [2, 1.0], hybridCadence: [3, 1.0], twoStep: [3, 1.4], dominantPedal: [4, 0.7], quartalVamp: [5, 0.5], susResolve: [2, 1.3], hendrix: [4, 1.3], sideslip: [5, 1.1], upperStructure: [5, 1.1], shoutTurn: [6, 1.6], everyTarget: [6, 1.4], tritoneAll: [6, 1.1], melodyReharm: [7, 1.5], keyLift: [7, 1.3], sideslipAll: [7, 0.9], pivotModulation: [8, 1.0] },
    },
    jazz: {
      id: 'jazz', name: 'Jazz', blurb: 'Standards to postbop: ii–V insertion, tritone subs, the backdoor, Coltrane cycles, altered dominants, upper structures, Barry Harris. Standards to postbop.', ceiling: 8,
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
      t: { recolor: [1, 1.2], slashBass: [2, 0.4], twoFive: [1, 1.4], secondaryDom: [2, 1.0], fnSwap: [1, 0.7], deceptive: [2, 0.6], backdoor: [2, 1.3], turnaround: [2, 1.2], minorPlagal: [2, 0.8], flatSix: [3, 0.6], halfDimTwo: [3, 0.9], planing: [4, 0.6], passingDim: [3, 1.0], ctDim: [4, 0.7], tritoneSub: [3, 1.5], tritoneChain: [4, 1.2], susHybrid: [3, 0.8], lydianIV: [4, 0.9], altered: [4, 1.3], constant: [5, 0.8], sixthDim: [5, 0.9], coltrane: [5, 1.0], lineCliche: [3, 0.5], chromaticMediant: [4, 0.4], chromaticMinorDescent: [4, 1.0], backcycle: [4, 1.1], dameron: [5, 1.0], minorTwoFive: [3, 1.1], sequenceFifths: [3, 0.7], lament: [2, 0.8], slideMinorThird: [4, 0.5], dominantFamily: [4, 1.2], importantMinor: [3, 0.9], minorSixthDim: [4, 1.0], deceptiveSecondary: [3, 0.7], constantThirds: [5, 0.9], countdown: [5, 1.2], quartalVamp: [4, 1.0], twoStep: [3, 0.8], modalCast: [4, 0.5], hybridCadence: [3, 0.6], susResolve: [3, 0.7], sideslip: [4, 1.0], upperStructure: [5, 1.4], hendrix: [5, 0.6], everyTarget: [6, 1.3], tritoneAll: [6, 1.2], shoutTurn: [6, 0.9], melodyReharm: [7, 1.6], susCast: [7, 0.8], keyLift: [7, 0.8], sideslipAll: [7, 0.8], pivotModulation: [8, 1.3] },
    },
    classical: {
      id: 'classical', name: 'Classical', blurb: 'Common-practice and Romantic harmony: inversions and suspensions, applied chords, the Neapolitan, augmented sixths, deceptive cadences, chromatic mediants, modulation by thirds.', ceiling: 7,
      recolor() { return null; },
      t: { slashBass: [1, 1.4], sus: [1, 0.8], secondaryDom: [2, 1.2], deceptive: [2, 1.2], minorPlagal: [2, 1.0], flatSix: [2, 0.9], picardy: [2, 1.0], neapolitan: [3, 1.3], passingDim: [3, 0.9], ctDim: [4, 1.0], augSixth: [3, 1.4], chromaticMediant: [4, 1.0], parallelMinor: [3, 0.7], lineCliche: [3, 0.6], hexPole: [4, 0.6], walkDown: [2, 1.0], sequenceFifths: [2, 1.3], lament: [2, 1.4], pantriadic: [4, 0.8], planeUp: [3, 0.6], augSixthVariants: [3, 1.2], canon: [2, 1.2], dominantPedal: [3, 1.0], deceptiveSecondary: [3, 0.9], modalCast: [4, 0.5], constantThirds: [4, 0.6], pivotModulation: [6, 1.5], melodyReharm: [7, 1.0], keyLift: [7, 0.6] },
    },
    film: {
      id: 'film', name: 'Film', blurb: 'Orchestral and cinematic: chromatic mediants for wonder, Lydian lifts, the Mario cadence, pedal points, planing triads, modulations.', ceiling: 7,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c);
        if (d < 2) return null;
        if (r === 0 && k === 'maj' && i !== prog.length - 1) return 'add9';
        if (r === 5 && k === 'maj') return d >= 3 ? 'maj7s11' : 'add9';
        if ((r === 9 || r === 2) && k === 'min' && d >= 3) return 'madd9';
        return null;
      },
      t: { recolor: [2, 0.7], sus: [1, 1.0], slashBass: [1, 0.9], pedal: [3, 1.1], deceptive: [2, 0.6], minorPlagal: [2, 1.2], flatSix: [2, 1.3], flatSeven: [2, 1.0], mario: [3, 1.4], picardy: [2, 0.7], lydianII: [3, 1.4], neapolitan: [4, 0.5], chromaticMediant: [3, 1.6], parallelMinor: [3, 1.0], hexPole: [4, 1.0], augSixth: [4, 0.5], lydianIV: [4, 0.8], lineCliche: [3, 0.5], susHybrid: [4, 0.5], walkDown: [2, 0.7], pantriadic: [3, 1.5], planeUp: [2, 1.0], lament: [2, 1.1], sequenceFifths: [3, 0.5], hybridCadence: [3, 1.2], dominantPedal: [3, 1.3], modalCast: [2, 1.4], constantThirds: [4, 1.1], canon: [2, 0.6], augSixthVariants: [4, 0.6], quartalVamp: [4, 0.7], susCast: [5, 0.8], sideslip: [5, 0.8], pivotModulation: [6, 1.5], keyLift: [6, 1.2], melodyReharm: [7, 1.2], sideslipAll: [7, 0.8] },
    },
    lofi: {
      id: 'lofi', name: 'Lo-fi', blurb: 'Hip-hop and lo-fi loops: m9 and maj9 planing, Dorian vamps, ii–V with no I, loops that never land.', ceiling: 6,
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
      t: { recolor: [1, 1.5], pedal: [3, 0.7], twoFive: [2, 0.7], fnSwap: [2, 0.9], minorPlagal: [2, 1.0], flatSeven: [2, 0.8], flatSix: [3, 0.6], planing: [3, 1.4], noLanding: [2, 1.5], dorian: [2, 1.4], susHybrid: [3, 1.0], lydianIV: [3, 0.8], chromaticMediant: [3, 0.6], lineCliche: [3, 0.5], tritoneSub: [3, 0.5], backdoor: [3, 0.6], chromaticMinorDescent: [3, 1.2], slideMinorThird: [2, 1.2], loopTwoFive: [2, 1.4], lament: [2, 0.8], walkDown: [2, 0.6], quartalVamp: [3, 1.2], hybridCadence: [3, 0.8], modalCast: [2, 0.9], importantMinor: [3, 0.6], bluesSevenths: [2, 0.7], susResolve: [3, 0.6], sideslip: [4, 1.2], susCast: [5, 1.2], upperStructure: [5, 0.6], melodyReharm: [6, 1.2], sideslipAll: [6, 0.9] },
    },
    brazil: {
      id: 'brazil', name: 'Brazil', blurb: 'Bossa nova and MPB: 6/9 tonics, m9 with descending bass, ii–V with ♭9 and ♯11, ♭VII7♯11, chromatic bass lines (Jobim, Ivan Lins, Djavan).', ceiling: 7,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (major) {
          if (r === 0 && k === 'maj') return d >= 3 ? '69' : 'maj7';
          if (r === 5 && k === 'maj') return d >= 3 ? 'maj7s11' : 'maj7';
          if ((r === 2 || r === 9 || r === 4) && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 4 ? '13b9' : d >= 2 ? '7b9' : '7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '7s11' : '7';
          if (r === 11 && k === 'dim') return 'm7b5';
          if (r === 8 && k === 'maj') return 'maj7';
        } else {
          if (r === 0 && k === 'min') return d >= 3 ? 'm6/9' : d >= 2 ? 'm9' : 'm7';
          if (r === 5 && k === 'min') return d >= 2 ? 'm9' : 'm7';
          if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 3 ? '7b9' : '7';
          if (r === 8 && k === 'maj') return 'maj7';
          if (r === 3 && k === 'maj') return d >= 2 ? 'maj9' : 'maj7';
          if (r === 10 && (k === 'maj' || k === 'dom')) return '7s11';
          if (r === 2 && k === 'dim') return 'm7b5';
        }
        return null;
      },
      t: { recolor: [1, 1.3], slashBass: [1, 1.0], walkDown: [2, 1.2], twoFive: [1, 1.2], secondaryDom: [2, 1.0], fnSwap: [2, 0.7], minorPlagal: [2, 1.0], backdoor: [3, 1.0], flatSeven: [2, 0.8], turnaround: [3, 0.8], lineCliche: [3, 1.1], tritoneSub: [3, 1.2], halfDimTwo: [3, 1.0], passingDim: [3, 0.9], chromaticMinorDescent: [3, 1.2], susHybrid: [3, 0.7], altered: [4, 0.8], tritoneChain: [4, 1.0], lydianIV: [4, 0.9], ctDim: [4, 0.7], chromaticMediant: [4, 0.8], constant: [5, 0.9], sideslip: [5, 1.0], susResolve: [3, 0.6], everyTarget: [6, 1.2], tritoneAll: [6, 1.0], melodyReharm: [7, 1.4], pivotModulation: [7, 1.3] },
    },
    blues: {
      id: 'blues', name: 'Blues', blurb: 'Blues and soul: dominant 7ths and 9ths everywhere, 7♯9, the quick IV, passing diminisheds, chromatic walk-ups, the 1–6–2–5 turnaround.', ceiling: 6,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c);
        if (r === 0 && (k === 'maj' || k === 'dom')) return d >= 3 ? '13' : d >= 2 ? '9' : '7';
        if (r === 5 && (k === 'maj' || k === 'dom')) return d >= 3 ? '13' : d >= 2 ? '9' : '7';
        if (r === 7 && (k === 'maj' || k === 'dom')) return d >= 4 ? '7s9' : d >= 2 ? '9' : '7';
        if ((r === 2 || r === 9) && k === 'min') return d >= 2 ? 'm9' : 'm7';
        if (r === 10 && (k === 'maj' || k === 'dom')) return d >= 2 ? '9' : '7';
        return null;
      },
      t: { recolor: [1, 1.5], slashBass: [1, 0.6], bluesSevenths: [1, 1.5], twoFive: [2, 0.6], secondaryDom: [2, 1.0], turnaround: [2, 1.3], minorPlagal: [2, 0.8], flatSeven: [2, 0.7], passingDim: [3, 1.2], gospelWalkUp: [3, 1.2], tritoneSub: [3, 1.0], backdoor: [3, 0.8], hendrix: [3, 1.4], susResolve: [3, 0.8], dominantFamily: [4, 1.0], altered: [4, 0.9], tritoneChain: [4, 0.8], ctDim: [4, 0.7], sideslip: [5, 1.0], upperStructure: [5, 1.0], shoutTurn: [5, 1.3], everyTarget: [6, 1.0], tritoneAll: [6, 0.9] },
    },
    modern: {
      id: 'modern', name: 'Lab', blurb: 'The laboratory: negative harmony, sideslips, half-step lifts, upper structures, constant structures, polychords, modulation by thirds — Collier, Hancock, Molina, Cory Henry.', ceiling: 8,
      recolor(c, key, d, i, prog) {
        const r = rel(c, key), k = cat(c), major = key.mode === 'major';
        if (k === 'maj') return d >= 4 ? (r === 5 || r === 10 ? 'maj7s11' : 'maj9') : 'maj7';
        if (k === 'min') return d >= 3 ? 'm11' : 'm9';
        if (k === 'dom') return d >= 4 ? '13s11' : '13';
        if (k === 'dim') return 'm7b5';
        return null;
      },
      t: { recolor: [1, 1.0], slashBass: [1, 0.8], sus: [1, 0.6], pedal: [2, 1.0], susHybrid: [2, 1.0], lydianIV: [2, 1.2], lydianII: [3, 1.0], chromaticMediant: [3, 1.3], hexPole: [3, 1.0], planing: [3, 1.2], constant: [4, 1.3], constantThirds: [4, 1.0], pantriadic: [4, 1.0], quartalVamp: [4, 1.0], tritoneSub: [3, 0.8], altered: [4, 0.8], coltrane: [5, 1.0], countdown: [5, 0.8], sideslip: [4, 1.4], upperStructure: [5, 1.3], hendrix: [5, 0.8], susCast: [5, 1.2], modalCast: [4, 1.0], dominantPedal: [4, 0.8], sideslipAll: [6, 1.3], everyTarget: [6, 0.8], tritoneAll: [6, 1.0], shoutTurn: [6, 0.7], melodyReharm: [7, 1.8], keyLift: [7, 1.5], pivotModulation: [8, 1.4] },
    },
  };
  const STYLE_ORDER = ['pop', 'neosoul', 'gospel', 'jazz', 'blues', 'brazil', 'classical', 'film', 'lofi', 'modern'];
  // depth levels, 1–8
  const DEPTHS = [
    { n: 1, name: 'Color', blurb: 'Extensions and suspensions on the chords you have.' },
    { n: 2, name: 'Lines', blurb: 'Bass lines, inversions, a borrowed chord.' },
    { n: 3, name: 'Function', blurb: 'Secondary dominants, ii–Vs, the backdoor, deceptive moves.' },
    { n: 4, name: 'Chromatic', blurb: 'Tritone subs, passing diminisheds, altered dominants, planing.' },
    { n: 5, name: 'Systems', blurb: 'Coltrane, Barry Harris, constant structures, upper structures, sideslips.' },
    { n: 6, name: 'Rewrites', blurb: 'Whole-phrase rewrites: a 2–5 into everything, shout turnarounds, casts.' },
    { n: 7, name: 'Reharm', blurb: 'New roots under your melody, half-step lifts, sideslipping the whole phrase.' },
    { n: 8, name: 'Lab', blurb: 'Modulation by thirds, polychords, everything at once.' },
  ];

  // Style-flavored chord qualities for new chords
  const Qs = {
    ii(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: d >= 3 ? 'm11' : 'm9', gospel: 'm9', jazz: d >= 3 ? 'm9' : 'm7', lofi: 'm9', brazil: 'm9', blues: 'm7', modern: 'm11' })[style]; },
    V(style, d) { return ({ pop: 'maj', film: 'maj', classical: '7', neosoul: d >= 3 ? '13sus4' : '9sus4', gospel: d >= 3 ? '13' : '9', jazz: d >= 3 ? '13' : '7', lofi: '9sus4', brazil: d >= 3 ? '13b9' : '7b9', blues: d >= 3 ? '13' : '9', modern: d >= 4 ? '13s11' : '13sus4' })[style]; },
    V7(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '9', gospel: d >= 4 ? '13b9' : '13', jazz: d >= 3 ? '13' : '7', lofi: '9', brazil: d >= 3 ? '13b9' : '7b9', blues: d >= 3 ? '7s9' : '9', modern: '13s11' })[style]; },
    secV(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '9', gospel: d >= 4 ? '7s9' : '7', jazz: d >= 3 ? '7b9' : '7', lofi: '9', brazil: '7b9', blues: d >= 3 ? '7s9' : '7', modern: d >= 5 ? '7alt' : '7b9' })[style]; },
    minor(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: d >= 2 ? 'm9' : 'm7', gospel: d >= 2 ? 'm9' : 'm7', jazz: 'm7', lofi: 'm9', brazil: d >= 2 ? 'm9' : 'm7', blues: 'm7', modern: d >= 3 ? 'm11' : 'm9' })[style]; },
    major(style, d) { return ({ pop: 'maj', film: 'maj', classical: 'maj', neosoul: d >= 2 ? 'maj9' : 'maj7', gospel: d >= 2 ? 'maj9' : 'maj7', jazz: 'maj7', lofi: 'maj9', brazil: d >= 2 ? '69' : 'maj7', blues: d >= 2 ? '9' : '7', modern: d >= 4 ? 'maj7s11' : 'maj9' })[style]; },
    iv(style, d) { return ({ pop: 'min', film: 'min', classical: 'min', neosoul: 'm6', gospel: d >= 3 ? 'm6/9' : 'm6', jazz: 'm6', lofi: 'm9', brazil: 'm6', blues: 'm6', modern: 'm6/9' })[style]; },
    bVII(style, d) { return ({ pop: 'maj', film: 'maj', classical: 'maj', neosoul: '9', gospel: '13', jazz: '9', lofi: 'maj7', brazil: '7s11', blues: '9', modern: '13s11' })[style]; },
    subV(style, d) { return ({ pop: '7', film: '7', classical: '7', neosoul: '13sus4', gospel: d >= 4 ? '13' : '7s11', jazz: d >= 4 ? '7s11' : '9', lofi: '9', brazil: '7s11', blues: '7s9', modern: '13s11' })[style]; },
  };
  for (const k of Object.keys(Qs)) { const f = Qs[k]; Qs[k] = (style, d) => f(style, d) || f('jazz', d); }

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


  // ---------- deeper: Barry Harris, Berklee Harmony 4, Coltrane, the Romantic chromatic toolkit ----------
  X.dominantFamily = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i); if (!(isV(c, key) || cat(c) === 'dom') || mod(c.root - n.root, 12) !== 7) return;
      // the four dominants that share one diminished seventh (G7, B♭7, D♭7, E7 share B–D–F–A♭): the family
      const fam = [3, 9].map(k => mk(c.root + k, s === 'gospel' ? '13' : '7'));
      fam.forEach((f, k) => res.push({ prog: swap(prog, i, Object.assign({}, f, { bass: null })), device: 'Dominant family', reason: `${sym(f, key)} for ${sym(c, key)}: Barry Harris's dominant family — the four dominants built on one diminished seventh (${T.chordToneNames(mk(c.root + 4, 'dim7'), key).map(t => t.name).join('–')}) are interchangeable. ${k === 0 ? 'This one comes in from the back door.' : 'This one resolves up a minor sixth into ' + sym(n, key) + ': the surprise member.'}`, family: 'dominantFamily' }));
    });
    return res.slice(0, 2);
  };

  X.importantMinor = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key)) return;
      const im = Object.assign(mk(c.root + 7, 'm6'), { bass: mod(c.root, 12) });
      res.push({ prog: swap(prog, i, im), device: 'The important minor', reason: `${sym(im, key)} for ${sym(c, key)}: the minor sixth chord on the fifth of the dominant, over the dominant's root — Barry Harris's "important minor". It is ${sym(mk(c.root, '9'), key)} with the 3rd hidden; sweeter, the pull softened but not gone.`, family: 'importantMinor' });
    });
    return res.slice(0, 1);
  };

  X.minorSixthDim = (prog, key, s, d) => {
    if (key.mode !== 'minor') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!(rel(c, key) === 0 && cat(c) === 'min') || beats(c) < 4) return;
      const seq = [mk(c.root, 'm6'), mk(c.root + 2, 'dim7'), inv(mk(c.root, 'm6'), 3), mk(c.root + 5, 'dim7')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Minor sixth-diminished', reason: `${syms(seq, key)}: the minor sixth-diminished scale (Barry Harris) over a tonic minor — the chord climbs through its own diminished without ever leaving home. No seventh anywhere; the sixth is the color.`, family: 'minorSixthDim' });
    });
    return res.slice(0, 1);
  };

  X.deceptiveSecondary = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || !isIV(next(prog, i), key) || beats(c) < 2) return;
      const v = mk(key.tonic + 4, s === 'gospel' ? '7s9' : '7');
      const out = passing(prog, i, v); if (!out) return;
      res.push({ prog: out, device: 'Deceptive resolution', reason: `${sym(c, key)} – ${sym(v, key)} – ${sym(next(prog, i), key)}: V7/vi, but it resolves up a half step into IV instead of into vi — Berklee's deceptive resolution of a secondary dominant. The ear braces for the minor and gets the open major.`, family: 'deceptiveSecondary' });
    });
    return res.slice(0, 1);
  };

  X.bluesSevenths = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const out = clone(prog); let n = 0;
    out.forEach((c, i) => { if (isTonic(c, key) && cat(c) === 'maj' && isIV(next(prog, i), key)) { out[i] = Object.assign({}, mk(key.tonic, s === 'gospel' ? '9' : '7'), { beats: beats(c), changed: 'mod' }); n++; } else if (isIV(c, key) && cat(c) === 'maj') { out[i] = Object.assign({}, mk(c.root, s === 'gospel' ? '9' : '7'), { beats: beats(c), changed: 'mod' }); n++; } });
    if (!n) return [];
    return [{ prog: out, device: 'Dominants without function', reason: `I7 and IV7 as plain color, not as dominants that must resolve: the blues inside the song (Berklee calls them special-function dominants). Earthy, church, Ray Charles.`, family: 'bluesSevenths' }];
  };

  X.hybridCadence = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key)) return;
      const hyb = Object.assign(mk(key.tonic + 8, 'maj'), { bass: mod(key.tonic + 10, 12) });
      res.push({ prog: swap(prog, i, hyb), device: 'Hybrid cadence', reason: `${sym(hyb, key)} for ${sym(c, key)}: ♭VI over ♭VII in the bass — a hybrid (Berklee: a triad over a foreign bass) that is really ${sym(mk(key.tonic + 10, '9sus4'), key)} with a ♭9. It lands on I from a whole step below, sus-soft and wide. The R&B and film cadence.`, family: 'hybridCadence' });
    });
    return res.slice(0, 1);
  };

  X.constantThirds = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isTonic(c, key) || beats(c) < 4) return;
      const t = key.tonic; const seq = [mk(t, 'maj7'), mk(t + 3, 'maj7'), mk(t + 6, 'maj7'), mk(t + 9, 'maj7')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Constant structure in thirds', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: the same maj7 shape rising by minor thirds, a constant structure around the diminished axis. Four keys in one bar and the ear accepts it because the shape never changes.`, family: 'constantThirds' });
    });
    return res.slice(0, 1);
  };

  X.countdown = (prog, key, s, d) => {
    if (key.mode !== 'major' || prog.length < 2) return [];
    const res = [];
    prog.forEach((c, i) => {
      const n = next(prog, i); const ni = (i + 1) % prog.length;
      if (!isii(c, key) || !isV(n, key) || beats(c) < 4 || beats(n) < 4 || ni < i) return;
      const t = key.tonic;
      const seq = [mk(t + 2, 'm7'), mk(t + 3, '7'), mk(t + 8, 'maj7'), mk(t + 11, '7'), mk(t + 4, 'maj7'), mk(t + 7, '7')];
      const out = clone(prog); const total = beats(c) + beats(n);
      out.splice(i, 2, ...seq.map(x => Object.assign({}, x, { beats: total / 6, changed: 'new' })));
      res.push({ prog: out, device: 'Countdown', reason: `${syms(seq, key)} – ${sym(next(prog, i + 1), key)}: Coltrane's substitution for a ii–V — three tonics a major third apart, each entered by its V7, the last one the real V. The ii–V becomes a wheel (Countdown).`, family: 'countdown' });
    });
    return res.slice(0, 1);
  };

  X.augSixthVariants = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(next(prog, i), key) || !(isIV(c, key) || isii(c, key))) return;
      const t = key.tonic;
      const it = Object.assign(mk(t + 8, 'maj'), { label: 'It⁶', roman: 'It⁶', notes: [8, 0, 6].map(x => mod(t + x, 12)), spell: { [mod(t + 6, 12)]: T.pcName(t + 6, key, 'dim') } });
      const fr = Object.assign(mk(t + 8, '7b5'), { label: 'Fr⁶', roman: 'Fr⁶', spell: { [mod(t + 6, 12)]: T.pcName(t + 6, key, 'dim') } });
      res.push({ prog: swap(prog, i, it), device: 'Italian sixth', reason: `${pcn(t + 8, key)}–${pcn(t, key)}–${pcn(t + 6, key, 'dim')} (It⁶) for ${sym(c, key)}: the lean augmented sixth, three notes, the outer voices expanding by half steps onto the V. Mozart's favorite.`, family: 'augSixthVariants' });
      res.push({ prog: swap(prog, i, fr), device: 'French sixth', reason: `${pcn(t + 8, key)}–${pcn(t, key)}–${pcn(t + 2, key)}–${pcn(t + 6, key, 'dim')} (Fr⁶) for ${sym(c, key)}: the augmented sixth with the 2nd inside — two tritones at once, the most acid of the three. It is the whole-tone sound a century before Debussy.`, family: 'augSixthVariants' });
    });
    return res.slice(0, 2);
  };

  X.quartalVamp = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (cat(c) !== 'min' || beats(c) < 4) return;
      const seq = [mk(c.root, 'm11'), mk(c.root + 1, 'm11')];
      res.push({ prog: replaceWith(prog, i, seq, [3, 1]), device: 'So What', reason: `${syms(seq, key)}: quartal m11 shapes sliding up a half step and back — the "So What" voicing (fourths with a third on top). Modal, open, no leading tone anywhere (Miles, Bill Evans, Hancock).`, family: 'quartalVamp' });
    });
    return res.slice(0, 1);
  };

  X.twoStep = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || !isTonic(next(prog, i), key) || beats(c) < 2) return;
      const seq = [mk(key.tonic + 2, s === 'gospel' ? '13' : '9'), mk(key.tonic + 1, s === 'gospel' ? '13' : '7s11')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Two-step into home', reason: `${syms(seq, key)} – ${sym(next(prog, i), key)}: V7/V, then the tritone sub of V — two dominants falling by half step, the bass ${pcn(key.tonic + 2, key)}–${pcn(key.tonic + 1, key)}–${pcn(key.tonic, key)}. The gospel keyboardist's favorite way to arrive.`, family: 'twoStep' });
    });
    return res.slice(0, 1);
  };

  X.canon = (prog, key, s, d) => {
    if (key.mode !== 'major' || !isTonic(prog[0], key)) return [];
    const total = prog.reduce((a, c) => a + beats(c), 0); if (total < 8) return [];
    const t = key.tonic; const b = total / 8;
    const degs = [[0, 'maj'], [7, 'maj'], [9, 'min'], [4, 'min'], [5, 'maj'], [0, 'maj'], [5, 'maj'], [7, 'maj']];
    const seq = degs.map(([r, q]) => Object.assign(mk(t + r, q), { beats: b, changed: 'new' }));
    return [{ prog: seq, device: 'Descending thirds', reason: `${syms(seq, key)}: I–V–vi–iii–IV–I–IV–V, the Romanesca — roots falling by thirds in pairs. Pachelbel's canon, and half of pop since (the descending-thirds sequence in every harmony textbook).`, family: 'canon' }];
  };

  X.dominantPedal = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const out = clone(prog); let n = 0; const dom = mod(key.tonic + 7, 12);
    out.forEach((c, i) => { if (i === prog.length - 1 && isTonic(c, key)) return; if (c.bass != null) return; const pcs = T.chordPcs(c); if (pcs.includes(dom) || isTonic(c, key) || rel(c, key) === 5 || rel(c, key) === 2) { out[i] = Object.assign({}, c, { bass: dom, changed: 'mod' }); n++; } });
    if (n < 2) return [];
    return [{ prog: out, device: 'Dominant pedal', reason: `Everything over ${pcn(dom, key)}, the dominant, in the bass: a dominant pedal. The harmony moves above a bass that refuses to resolve — tension that builds for a whole phrase and then releases at once (Berklee's pedal point; every film score's last bar before the chorus).`, family: 'dominantPedal' }];
  };

  X.modalCast = (prog, key, s, d) => {
    const res = []; const major = key.mode === 'major'; const t = key.tonic;
    if (major) {
      // Mixolydian: V → ♭VII, iii → v, vii° → ♭VII; Lydian: IV → II, ii → II
      const mixo = clone(prog); let n1 = 0;
      mixo.forEach((c, i) => { const r = rel(c, key); if (r === 7 && (cat(c) === 'maj' || cat(c) === 'dom')) { mixo[i] = Object.assign({}, mk(t + 10, 'maj'), { beats: beats(c), changed: 'mod' }); n1++; } else if (r === 4 && cat(c) === 'min') { mixo[i] = Object.assign({}, mk(t + 7, 'min'), { beats: beats(c), changed: 'mod' }); n1++; } });
      if (n1) res.push({ prog: mixo, device: 'Cast in Mixolydian', reason: `The whole phrase in Mixolydian: no leading tone, the V becomes ♭VII, the iii becomes a minor v. Modal harmony (Berklee H4): the chords stop pointing home and start describing a place. Rock, folk, gospel-blues.`, family: 'modalCast' });
      const lyd = clone(prog); let n2 = 0;
      lyd.forEach((c, i) => { const r = rel(c, key); if ((r === 5 && cat(c) === 'maj') || (r === 2 && cat(c) === 'min')) { lyd[i] = Object.assign({}, mk(t + 2, s === 'film' ? 'maj' : 'maj7'), { beats: beats(c), changed: 'mod' }); n2++; } });
      if (n2) res.push({ prog: lyd, device: 'Cast in Lydian', reason: `The whole phrase in Lydian: the raised 4th turns IV and ii into a major II. Weightless, bright, a little unreal — the mode of wonder (film, Björk, Jacob Collier).`, family: 'modalCast' });
    } else {
      const dor = clone(prog); let n3 = 0;
      dor.forEach((c, i) => { const r = rel(c, key); if (r === 5 && cat(c) === 'min') { dor[i] = Object.assign({}, mk(t + 5, s === 'classical' ? 'maj' : '7'), { beats: beats(c), changed: 'mod' }); n3++; } else if (r === 8 && cat(c) === 'maj') { dor[i] = Object.assign({}, mk(t + 9, 'm7b5'), { beats: beats(c), changed: 'mod' }); n3++; } });
      if (n3) res.push({ prog: dor, device: 'Cast in Dorian', reason: `The whole phrase in Dorian: the raised 6th makes the iv a major IV (or IV7) and turns ♭VI into a half-diminished vi. Minor that smiles — Santana, Badu, every neo-soul vamp.`, family: 'modalCast' });
    }
    return res.slice(0, 2);
  };

  // ---------- master level: the devices of the players (Cory Henry, Kirk Franklin, Barry Harris, Herbie, Collier, Molina) ----------
  const tint = (c, key, s, d, i, prog) => { let q = null; try { q = STYLES[s].recolor(c, key, Math.max(d, 3), i, prog); } catch (e) {} return upgrade(c, q); };
  const melPcs = (c) => c.melody && c.melody.length ? [...new Set(c.melody.map(m => mod(typeof m === 'number' ? m : m.note, 12)))] : [];
  const okTension = (q, iv) => { const k = T.Q[q].cat; return (k === 'min' ? [2, 5, 9] : k === 'maj' ? [2, 6, 9] : k === 'dom' ? [1, 2, 3, 6, 8, 9] : k === 'sus' ? [2, 9] : [2]).includes(iv); };
  const fits = (c) => { const m = melPcs(c); if (!m.length) return true; const pcs = T.chordPcs(c); return m.every(pc => pcs.includes(pc) || okTension(c.q, mod(pc - c.root, 12))); };
  const resolvesTo = (c, nxt) => nxt && (mod(nxt.root - c.root, 12) === 5 || mod(nxt.root - c.root, 12) === 11);

  // Sideslip: the same shape a half step above, sliding down into the real chord (Hancock; Cory Henry's arrivals).
  X.sideslip = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (beats(c) < 2 || cat(c) === 'dim' || c.bass != null) return;
      const real = tint(c, key, s, d, i, prog); const up = mk(c.root + 1, real.q);
      const out = clone(prog); out[i] = Object.assign({}, real, { beats: beats(c) / 2, changed: real.q !== c.q ? 'mod' : undefined }); out.splice(i, 0, Object.assign({}, up, { beats: beats(c) / 2, changed: 'new' }));
      res.push({ prog: out, device: 'Sideslip', reason: `${sym(up, key)} → ${sym(real, key)}: the identical shape a half step above, sliding down onto the real chord. Planing by semitone: the ear hears a "wrong" chord resolve, which is the whole pleasure (Herbie Hancock's sideslip; Cory Henry does it on every other downbeat).`, family: 'sideslip' });
    });
    return res.slice(0, 2);
  };
  // Sideslip the whole phrase: every chord approached from a half step above.
  X.sideslipAll = (prog, key, s, d) => {
    if (prog.length < 2 || prog.some(c => beats(c) < 2)) return [];
    const out = []; let n = 0;
    prog.forEach((c, i) => {
      const real = tint(c, key, s, d, i, prog);
      if (cat(c) === 'dim' || c.bass != null) { out.push(Object.assign({}, c, { changed: undefined })); return; }
      out.push(Object.assign(mk(c.root + 1, real.q), { beats: beats(c) / 2, changed: 'new' })); out.push(Object.assign({}, real, { beats: beats(c) / 2, changed: real.q !== c.q ? 'mod' : undefined })); n++;
    });
    if (n < 2) return [];
    return [{ prog: out, device: 'Sideslip everything', reason: `Every chord preceded by its own shape a half step up: the phrase breathes in and out of the key twice a bar. Modern gospel and postbop at once — chromatic planing as texture, not as a trick.`, family: 'sideslipAll' }];
  };

  // Sus to 3: the dominant arrives suspended and then shows its third — a two-stage V (gospel's delayed resolution).
  X.susResolve = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!(cat(c) === 'dom' || isV(c, key)) || beats(c) < 2 || !resolvesTo(c, next(prog, i))) return;
      const susQ = d >= 4 ? '13sus4' : '9sus4'; const domQ = d >= 4 ? (s === 'gospel' || s === 'blues' ? '13b9' : '13') : (s === 'brazil' ? '7b9' : '9');
      const seq = [mk(c.root, susQ), mk(c.root, domQ)];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Sus to 3', reason: `${syms(seq, key)} → ${sym(next(prog, i), key)}: the dominant arrives with its 4th suspended, then the 4th falls to the 3rd before it resolves. Two tensions for the price of one; the church pianist's way of making a plain V last.`, family: 'susResolve' });
    });
    return res.slice(0, 2);
  };

  // 7♯9 planing: dominant 7♯9 shapes sliding in parallel into the V (the "Hendrix chord" as a gospel/soul texture).
  X.hendrix = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (!isV(c, key) || beats(c) < 2) return;
      const seq = beats(c) >= 4 ? [mk(c.root + 3, '7s9'), mk(c.root + 1, '7s9'), mk(c.root, '7s9')] : [mk(c.root + 1, '7s9'), mk(c.root, '7s9')];
      const w = beats(c) >= 4 ? [1, 1, 2] : [1, 1];
      res.push({ prog: replaceWith(prog, i, seq, w), device: 'Planing 7♯9s', reason: `${syms(seq, key)}: dominant 7♯9 shapes sliding down in parallel onto the V. Blues and gospel share this chord — major and minor third at once — and planing it turns the cadence into a shout (Hendrix, Cory Henry, every Sunday).`, family: 'hendrix' });
    });
    return res.slice(0, 1);
  };

  // Shout turnaround: I – III7♯9 – VI7♯9 – II13 into the ii or V (Kirk Franklin's 1–3–6–2).
  X.shoutTurn = (prog, key, s, d) => {
    if (key.mode !== 'major') return [];
    const res = []; const t = key.tonic;
    prog.forEach((c, i) => {
      const nx = next(prog, i); if (!isTonic(c, key) || beats(c) < 4 || !(isV(nx, key) || isii(nx, key))) return;
      const dom = s === 'jazz' ? '7b9' : '7s9';
      const seq = [tint(c, key, s, d, i, prog), mk(t + 4, dom), mk(t + 9, dom), mk(t + 2, s === 'jazz' ? '9' : '13')];
      res.push({ prog: replaceWith(prog, i, seq), device: 'Shout turnaround', reason: `${syms(seq, key)} → ${sym(nx, key)}: 1–3–6–2 with every step a dominant — III7♯9 pulls to vi, VI7♯9 pulls to ii, II13 pulls to V. The whole bar becomes a chain of pulls (Kirk Franklin, Cory Henry; the 1625 the church plays as 1-3-6-2).`, family: 'shoutTurn' });
    });
    return res.slice(0, 1);
  };

  // A 2–5 into everything: each chord gets its own related ii–V in front of it (gospel/jazz reharm as a wall of cadences).
  X.everyTarget = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const out = []; let n = 0;
    prog.forEach((c, i) => {
      const pv = out.length ? out[out.length - 1] : null;
      const already = pv && (mod(pv.root - c.root, 12) === 7 && cat(pv) === 'dom');
      if (i > 0 && beats(prog[i - 1]) >= 2 && !already && cat(c) !== 'dim' && !isTonic(c, key) && !(isV(c, key))) {
        const b = beats(prog[i - 1]) / 2; // the previous chord gives up its second half
        out[out.length - 1] = Object.assign({}, out[out.length - 1], { beats: b });
        const minorTarget = cat(c) === 'min'; const ii = mk(c.root + 2, minorTarget ? 'm7b5' : Qs.ii(s, d)); const V = mk(c.root + 7, minorTarget ? '7b9' : Qs.V7(s, d));
        out.push(Object.assign(ii, { beats: b / 2, changed: 'new' }), Object.assign(V, { beats: b / 2, changed: 'new' })); n++;
      }
      out.push(Object.assign({}, c, { changed: undefined }));
    });
    if (n < 2) return [];
    return [{ prog: out, device: 'A 2–5 into everything', reason: `Each chord gets its own ii–V in front of it, so the phrase becomes a chain of cadences into moving targets. The gospel keyboardist's reharm reflex — and the jazz one (Barry Harris: "put a two-five in front of it").`, family: 'everyTarget' }];
  };

  // Tritone approaches: every chord preceded by the tritone substitute of its dominant (♭II7♯11), bass falling by half step.
  X.tritoneAll = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const out = []; let n = 0;
    prog.forEach((c, i) => {
      if (i > 0 && beats(prog[i - 1]) >= 2 && cat(c) !== 'dim') {
        out[out.length - 1] = Object.assign({}, out[out.length - 1], { beats: beats(prog[i - 1]) / 2 });
        out.push(Object.assign(mk(c.root + 1, Qs.subV(s, d)), { beats: beats(prog[i - 1]) / 2, changed: 'new' })); n++;
      }
      out.push(Object.assign({}, c, { changed: undefined }));
    });
    if (n < 2) return [];
    return [{ prog: out, device: 'Tritone approaches', reason: `Every chord approached from a half step above by a dominant with a ♯11: the tritone sub of its V. The bass falls by semitone into every change — the smoothest chromatic bass line there is (Jobim, Barry Harris's "half-step rule").`, family: 'tritoneAll' }];
  };

  // Upper structures: a dominant recolored as a triad over its shell (II = 13♯11, VI = 13♭9, ♭VI = 7♯9♭13, ♭II = 7♭9♯11).
  const US = [['13s11', 2, 'the II triad', 'bright, Lydian-dominant'], ['13b9', 9, 'the VI triad', 'gospel sweet-and-sour'], ['7s9b13', 8, 'the ♭VI triad', 'dark, altered'], ['7b9s11', 1, 'the ♭II triad', 'the tritone sub hiding inside the V']];
  X.upperStructure = (prog, key, s, d) => {
    const res = [];
    prog.forEach((c, i) => {
      if (cat(c) !== 'dom' && !isV(c, key)) return;
      if (!resolvesTo(c, next(prog, i))) return;
      for (const [q, iv, name, feel] of US) {
        const cand = Object.assign({}, c, { q }); if (!fits(cand)) continue;
        res.push({ prog: swap(prog, i, { q }), device: 'Upper structure', reason: `${sym(cand, key)}: ${pcn(c.root + iv, key)} major over the ${sym(Object.assign({}, c, { q: '7' }), key)} shell — ${name}, ${feel}. Upper-structure triads are how pianists voice altered dominants: a plain triad in the right hand, the tension is in the relationship (Berklee H4, Mark Levine).`, family: 'upperStructure' });
        if (res.length >= 2) break;
      }
    });
    return res.slice(0, 2);
  };

  // Sus cast (Maiden Voyage): every chord as a suspended or m11 color — no thirds leading anywhere, the harmony floats.
  X.susCast = (prog, key, s, d) => {
    const out = clone(prog); let n = 0;
    out.forEach((c, i) => {
      if (i === prog.length - 1 && isTonic(c, key) && s !== 'modern') return;
      if (cat(c) === 'maj' || cat(c) === 'dom') { if (c.q !== '9sus4' && c.q !== '13sus4') { out[i] = Object.assign({}, c, { q: d >= 6 ? '13sus4' : '9sus4', changed: 'mod' }); n++; } }
      else if (cat(c) === 'min') { if (c.q !== 'm11') { out[i] = Object.assign({}, c, { q: 'm11', changed: 'mod' }); n++; } }
    });
    if (n < 2) return [];
    return [{ prog: out, device: 'Cast in sus', reason: `Every chord suspended: 9sus4 and m11 colors, no thirds pulling anywhere. The harmony stops functioning and starts floating — "Maiden Voyage" (Hancock), neo-soul's resting state.`, family: 'susCast' }];
  };

  // Melody reharmonized: new roots chosen so the sung note becomes the 9th, 13th, ♯11 or 7th of a richer chord.
  X.melodyReharm = (prog, key, s, d) => {
    if (s === 'classical' && d < 7) return [];
    const res = [];
    const pivot = (c) => { const m = melPcs(c); if (m.length) return mod(Math.max(...c.melody.map(x => typeof x === 'number' ? x : x.note)), 12); return mod(c.root + (cat(c) === 'min' ? 3 : 4), 12); }; // the sung note, else the chord's 3rd
    const lush = [['maj9', 2, '9th'], ['m9', 2, '9th'], ['maj7s11', 6, '♯11'], ['13', 9, '13th'], ['9sus4', 2, '9th'], ['m11', 5, '11th'], ['maj7', 11, 'major 7th'], ['m6/9', 2, '9th']];
    const dark = [['13', 9, '13th'], ['7s11', 6, '♯11'], ['m11', 5, '11th'], ['13b9', 9, '13th'], ['7b9', 1, '♭9'], ['m9', 2, '9th'], ['maj7s11', 6, '♯11'], ['9sus4', 2, '9th']];
    const allowed = (q) => (s === 'pop' || s === 'film') ? ['maj9', 'm9', 'maj7', '9sus4', 'maj7s11'].includes(q) : (s === 'brazil' ? q !== '7b9' || true : true);
    const build = (table, label) => {
      const out = []; let prevRoot = null; let n = 0; const notes = [];
      prog.forEach((c, i) => {
        const lastTonic = i === prog.length - 1 && isTonic(c, key);
        const p = pivot(c); let best = null, bc = Infinity;
        if (!lastTonic) for (const [q, iv, what] of table) {
          if (!allowed(q)) continue;
          const root = mod(p - iv, 12); const cand = Object.assign(mk(root, q), { beats: beats(c), melody: c.melody });
          if (T.sameChord(cand, c) || !fits(cand)) continue;
          let cost = 0; const mv = prevRoot == null ? 0 : mod(root - prevRoot, 12);
          cost += prevRoot == null ? 0 : (mv === 5 ? 0 : mv === 1 || mv === 11 ? 0.3 : mv === 7 ? 0.5 : mv === 2 || mv === 10 ? 0.6 : mv === 0 ? 1.2 : 0.8);
          cost += root === c.root ? 0.9 : 0; // a new root is the point
          if (T.chordPcs(cand).includes(mod(c.root + (cat(c) === 'min' ? 3 : 4), 12))) cost -= 0.3; // keeps the original's 3rd somewhere inside
          if (cost < bc) { bc = cost; best = { cand, what }; }
        }
        if (best) { out.push(Object.assign({}, best.cand, { changed: 'mod' })); prevRoot = best.cand.root; n++; notes.push(`${pcn(p, key)} as the ${best.what} of ${sym(best.cand, key)}`); }
        else { out.push(Object.assign({}, c, { changed: undefined })); prevRoot = c.root; }
      });
      if (n < Math.max(2, prog.length - 1)) return null;
      return { prog: out, device: `Melody reharmonized (${label})`, reason: `New roots under the line: ${notes.slice(0, 4).join('; ')}${notes.length > 4 ? '…' : ''}. The melody never moves; the chords underneath change what it means. The arranger's core craft — every note becomes a color tone of something richer (Berklee reharm; Collier, Jesús Molina).`, family: 'melodyReharm' };
    };
    const a = build(lush, 'lush'); if (a) res.push(a);
    const b = build(dark, 'dark'); if (b && (!a || sig0(b.prog) !== sig0(a.prog))) res.push(b);
    return res;
  };
  const sig0 = (p) => p.map(c => `${c.root}:${c.q}`).join('|');

  // Half-step lift: the second half of the phrase moves up a semitone, pivoting through the tritone sub of its new first chord.
  X.keyLift = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const cut = Math.ceil(prog.length / 2); if (beats(prog[cut - 1]) < 2) return [];
    const out = [];
    prog.forEach((c, i) => {
      if (i < cut) out.push(Object.assign({}, c, { changed: undefined })); else out.push(Object.assign({}, c, { root: mod(c.root + 1, 12), bass: c.bass == null ? null : mod(c.bass + 1, 12), changed: 'mod', melodyShift: 1 }));
    });
    const target = out[cut]; out[cut - 1] = Object.assign({}, out[cut - 1], { beats: beats(prog[cut - 1]) / 2 });
    out.splice(cut, 0, Object.assign(mk(target.root + 1, Qs.subV(s, d)), { beats: beats(prog[cut - 1]) / 2, changed: 'new', pivot: true }));
    const newKey = { tonic: mod(key.tonic + 1, 12), mode: key.mode };
    return [{ prog: out, device: 'Half-step lift', reason: `From ${sym(target, key)} on, everything is a semitone higher — the second half of the phrase lives in ${T.keyName ? T.keyName(newKey) : pcn(newKey.tonic, newKey)}, reached through ${sym(out[cut], key)}, the tritone sub of its new dominant. The gospel and Collier modulation: the floor rises under the singer and the room lifts with it.`, family: 'keyLift' }];
  };

  // Modulation by a third: the second half in a chromatic-mediant key (up a major third or down a minor third), pivoting through a ii–V.
  X.pivotModulation = (prog, key, s, d) => {
    if (prog.length < 2) return [];
    const cut = Math.ceil(prog.length / 2); if (beats(prog[cut - 1]) < 2) return [];
    const res = [];
    for (const [shift, name] of [[4, 'up a major third'], [9, 'down a minor third']]) {
      const out = [];
      prog.forEach((c, i) => { if (i < cut) out.push(Object.assign({}, c, { changed: undefined })); else out.push(Object.assign({}, c, { root: mod(c.root + shift, 12), bass: c.bass == null ? null : mod(c.bass + shift, 12), changed: 'mod', melodyShift: shift })); });
      const target = out[cut]; const b = beats(prog[cut - 1]) / 2; out[cut - 1] = Object.assign({}, out[cut - 1], { beats: b });
      const minorT = cat(target) === 'min';
      out.splice(cut, 0, Object.assign(mk(target.root + 2, minorT ? 'm7b5' : Qs.ii(s, d)), { beats: b / 2, changed: 'new', pivot: true }), Object.assign(mk(target.root + 7, minorT ? '7b9' : Qs.V7(s, d)), { beats: b / 2, changed: 'new', pivot: true }));
      const newKey = { tonic: mod(key.tonic + shift, 12), mode: key.mode };
      res.push({ prog: out, device: 'Modulation by a third', reason: `The second half ${name}, into ${T.keyName ? T.keyName(newKey) : pcn(newKey.tonic, newKey)}, reached through its own ii–V. Chromatic-mediant modulation: the keys share a note and nothing else, so the light changes color at once (Schubert, Rachmaninoff; Jesús Molina's bridges).`, family: 'pivotModulation' });
    }
    return res;
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
    // readings and scores; a melody the writer played over a chord must still fit the chord that replaces it
    const fitsMelody = (c) => {
      if (!c.melody || !c.melody.length) return true;
      const pcs = T.chordPcs(c); const k = cat(c);
      const ok = k === 'min' ? [2, 5, 9] : k === 'maj' ? [2, 6, 9] : k === 'dom' ? [1, 2, 3, 6, 8, 9] : k === 'sus' ? [2, 9] : [2];
      return c.melody.every(n => pcs.includes(mod(n, 12)) || ok.includes(mod(n - c.root, 12)));
    };
    // carry the writer's melody onto each option chord by position in the phrase, so replacements are judged
    // against the notes that were actually sung over that stretch of time
    const total = prog.reduce((a, c) => a + beats(c), 0);
    const srcSpans = []; { let b = 0; for (const c of prog) { srcSpans.push({ s: b, e: b + beats(c), m: c.melody && c.melody.length ? c.melody.map(m => typeof m === 'number' ? m : m.note) : [] }); b += beats(c); } }
    const hasMel = srcSpans.some(x => x.m.length);
    const attachMelody = (p) => { if (!hasMel) return; const tot = p.reduce((a, c) => a + beats(c), 0); const k = total / (tot || 1); let b = 0; for (const c of p) { const s0 = b * k, e0 = (b + beats(c)) * k; b += beats(c); const m = []; for (const x of srcSpans) { const ov = Math.min(e0, x.e) - Math.max(s0, x.s); if (ov > 0.01 * total) m.push(...x.m); } if (m.length) c.melody = [...new Set(m)].map(n => n + (c.melodyShift || 0)); } };
    all.forEach(o => {
      attachMelody(o.prog);
      o.mood = M.progressionMood(o.prog, key, style);
      o.roman = o.prog.map(c => c.roman || T.romanNumeral(c, key));
      o.clashes = o.prog.filter(c => c.changed && !c.pivot && !fitsMelody(c)).map(c => sym(c, key));
      // impact: how much of the phrase is new (changed roots count double; recolors count half)
      { const srcRoots = new Set(prog.map(x => x.root)); const newRoots = new Set(); o.impact = o.prog.reduce((a, c) => { if (!c.changed) return a; if (!srcRoots.has(c.root)) { newRoots.add(c.root); return a + 1.6; } return a + (prog.some(x => x.root === c.root && cat(x) === cat(c)) ? 0.5 : 0.9); }, 0) + 0.4 * newRoots.size; }
      let score = o.weight * (1 + 0.35 * (o.depth / depth)); // deeper (within the ask) ranks a little higher
      // the deeper the ask, the more a substantial rewrite is worth and the less a touch-up is
      const want = depth <= 2 ? 0 : depth <= 4 ? 0.35 : depth <= 6 ? 0.7 : 1.0;
      score += want * Math.min(o.impact, 8) * 0.45;
      if (depth >= 4 && o.impact <= 0.5) score -= 1.2 * (depth - 3);
      if (opts.mood) score += 1.6 * (M.gemsById(String(opts.mood).split(':')[0]) ? M.gemsMatch(o.mood.focus || o.mood, opts.mood, o.family) : M.moodMatch(o.mood.focus || o.mood, opts.mood));
      o.gems = M.gemsOf(o.mood.focus || o.mood, o.family);
      if (o.clashes.length) score -= 2.5 * o.clashes.length;
      o.score = score;
    });
    if (opts.melodyLock) all = all.filter(o => !o.clashes.length);
    all.sort((a, b) => b.score - a.score);
    // near-duplicates: from depth 3 up, two options with the same roots and chord categories (differing only in color
    // or inversion) are one idea — keep the better scored
    if (depth >= 3) { const skel = (p) => p.map(c => `${c.root}:${cat(c)}`).join('|'); const seenSk = new Set(); all = all.filter(o => { const k = skel(o.prog); if (seenSk.has(k)) return false; seenSk.add(k); return true; }); }
    // diversity: at most two per family (one from depth 5 up, so the list spans more devices)
    const perFamily = depth >= 5 ? 1 : 2;
    const count = {}; const picked = [];
    for (const o of all) { count[o.family] = (count[o.family] || 0) + 1; if (count[o.family] > (o.family === 'melodyReharm' || o.family === 'pivotModulation' ? 2 : perFamily)) continue; picked.push(o); if (picked.length >= limit) break; }
    // whole-phrase rewrites: chain two or three compatible moves, then recolor in the style, so the writer can
    // hear the whole lens at once and not only one chord at a time
    if (opts.compose !== false && depth >= 2 && all.length >= 2) {
      const skip = new Set(['recolor', 'slashBass', 'pedal', 'sus', 'sequenceFifths', 'coltrane', 'canon', 'modalCast', 'dominantPedal', 'bluesSevenths', 'keyLift', 'pivotModulation', 'melodyReharm', 'susCast', 'sideslipAll', 'everyTarget', 'tritoneAll']);
      const steps = depth >= 7 ? 4 : depth >= 5 ? 3 : 2;
      const build = (firstFamily) => {
        let base = prog.map(c => Object.assign({}, c, { changed: undefined })); const chain = []; const used = new Set();
        let kept = []; // chords earlier steps introduced; a later step may not undo them
        for (let step = 0; step < steps; step++) {
          const subs = ideas(base, key, Object.assign({}, opts, { compose: false, limit: 16, mood: null }));
          const pick = subs.find(o => !skip.has(o.family) && !used.has(o.family) && (step > 0 || !firstFamily || o.family === firstFamily) && o.prog.length <= 12 && kept.every(k => o.prog.some(c => T.sameChord(c, k))));
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
        o.mood = M.progressionMood(o.prog, key, style); o.roman = o.prog.map(c => c.roman || T.romanNumeral(c, key)); o.gems = M.gemsOf(o.mood.focus || o.mood, chain[0].family); o.clashes = [];
        return o;
      };
      const seen2 = new Set(picked.map(o => sig(o.prog)));
      const c1 = build(null); if (c1 && !seen2.has(sig(c1.prog))) { picked.push(c1); seen2.add(sig(c1.prog)); }
      const c2 = build(picked[1] && !skip.has(picked[1].family) ? picked[1].family : null); if (c2 && !seen2.has(sig(c2.prog))) { picked.push(c2); seen2.add(sig(c2.prog)); }
      if (depth >= 6) { const c3 = build(picked[2] && !skip.has(picked[2].family) ? picked[2].family : null); if (c3 && !seen2.has(sig(c3.prog))) picked.push(c3); }
      // from depth 6 up the whole-phrase rewrites lead the list
      if (depth >= 6) picked.sort((a, b) => (b.impact || (b.family === 'compose' ? 6 : 0)) - (a.impact || (a.family === 'compose' ? 6 : 0)));
    }
    picked.forEach(o => { if (o.impact == null) o.impact = o.prog.filter(c => c.changed).length; });
    return picked;
  }

  function describe(prog, key) { return prog.map(c => c.roman || T.romanNumeral(c, key)).join(' – '); }

  return { STYLES, STYLE_ORDER, DEPTHS, ideas, shadow, describe, X, helpers: { clone, mk, inv, replaceWith, approach, passing, swap, upgrade } };
})();
if (typeof module !== 'undefined') module.exports = Reharm;
