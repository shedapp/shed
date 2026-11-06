/* ============================================================
   EARS — Theory engine
   Notes, intervals, solfege, scales, chords, Roman-numeral tokens,
   voicing + voice leading.
   ============================================================ */
(function (E) {
  const NS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const NF = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const FLAT_MAJOR = new Set([1, 3, 5, 8, 10]);        // Db Eb F Ab Bb
  const FLAT_MINOR = new Set([0, 2, 3, 5, 7, 10]);     // c d eb f g bb minor
  const mod12 = n => ((n % 12) + 12) % 12;

  function prefersFlat(tonicPc, minor) {
    return minor ? FLAT_MINOR.has(mod12(tonicPc)) : FLAT_MAJOR.has(mod12(tonicPc));
  }
  function pcName(pc, flat) { return (flat ? NF : NS)[mod12(pc)]; }
  function midiName(m, flat) { return pcName(m, flat) + (Math.floor(m / 12) - 1); }
  function keyName(tonicPc, minor) {
    return pcName(tonicPc, prefersFlat(tonicPc, minor)) + (minor ? ' minor' : ' major');
  }
  function midiToFreq(m, a4) { return (a4 || 440) * Math.pow(2, (m - 69) / 12); }
  function freqToMidi(f, a4) { return 69 + 12 * Math.log2(f / (a4 || 440)); }

  /* ---------- Intervals ---------- */
  const INTERVALS = [
    { id: 'P1', n: 'Unison', s: 0 },
    { id: 'm2', n: 'Minor 2nd', s: 1 }, { id: 'M2', n: 'Major 2nd', s: 2 },
    { id: 'm3', n: 'Minor 3rd', s: 3 }, { id: 'M3', n: 'Major 3rd', s: 4 },
    { id: 'P4', n: 'Perfect 4th', s: 5 }, { id: 'TT', n: 'Tritone', s: 6 },
    { id: 'P5', n: 'Perfect 5th', s: 7 }, { id: 'm6', n: 'Minor 6th', s: 8 },
    { id: 'M6', n: 'Major 6th', s: 9 }, { id: 'm7', n: 'Minor 7th', s: 10 },
    { id: 'M7', n: 'Major 7th', s: 11 }, { id: 'P8', n: 'Octave', s: 12 },
    { id: 'm9', n: 'Minor 9th', s: 13 }, { id: 'M9', n: 'Major 9th', s: 14 },
    { id: '♯9', n: 'Sharp 9th', s: 15 }, { id: 'P11', n: 'Perfect 11th', s: 17 },
    { id: '♯11', n: 'Sharp 11th', s: 18 }, { id: '♭13', n: 'Flat 13th', s: 20 },
    { id: 'M13', n: 'Major 13th', s: 21 }
  ];
  const INTERVAL_BY_ID = {}; INTERVALS.forEach(i => INTERVAL_BY_ID[i.id] = i);

  // "Hear it as" — the interval sung from Do (ascending) or down to Do's lower neighbour (descending)
  const INTERVAL_SOLFEGE = {
    asc: { P1: 'Do–Do', m2: 'Do–Ra', M2: 'Do–Re', m3: 'Do–Me', M3: 'Do–Mi', P4: 'Do–Fa', TT: 'Do–Fi', P5: 'Do–Sol', m6: 'Do–Le', M6: 'Do–La', m7: 'Do–Te', M7: 'Do–Ti', P8: 'Do–Do', m9: 'Do–Ra (9th)', M9: 'Do–Re (9th)', '♯9': 'Do–Ri (♯9)', P11: 'Do–Fa (11th)', '♯11': 'Do–Fi (♯11)', '♭13': 'Do–Le (♭13)', M13: 'Do–La (13th)' },
    desc: { P1: 'Do–Do', m2: 'Do–Ti', M2: 'Do–Te', m3: 'Do–La', M3: 'Do–Le', P4: 'Do–Sol', TT: 'Do–Se', P5: 'Do–Fa', m6: 'Do–Mi', M6: 'Do–Me', m7: 'Do–Re', M7: 'Do–Ra', P8: 'Do–Do' }
  };
  // Optional song cues (titles only) — training wheels for levels 1–2
  const SONG_CUES = {
    asc: { m2: 'Jaws (theme)', M2: 'Happy Birthday', m3: 'Greensleeves', M3: 'When the Saints Go Marching In', P4: 'Here Comes the Bride', TT: 'The Simpsons (theme)', P5: 'Star Wars (main theme)', m6: 'Love Story (Where Do I Begin)', M6: 'My Bonnie Lies Over the Ocean', m7: 'Somewhere (West Side Story)', M7: 'Take On Me (chorus)', P8: 'Over the Rainbow' },
    desc: { m2: 'Für Elise', M2: 'Mary Had a Little Lamb', m3: 'Hey Jude', M3: 'Swing Low, Sweet Chariot', P4: 'Born Free', TT: 'Black Sabbath (riff)', P5: 'The Flintstones (theme)', M6: 'Nobody Knows the Trouble I\'ve Seen', m7: 'Watermelon Man', M7: 'I Love You (Cole Porter)', P8: 'Willow Weep for Me' }
  };

  /* ---------- Solfege ---------- */
  const SOLFEGE = [
    { id: 'do', pc: 0, num: '1', up: false }, { id: 'di', pc: 1, num: '♯1', up: true }, { id: 'ra', pc: 1, num: '♭2', up: false },
    { id: 're', pc: 2, num: '2' }, { id: 'ri', pc: 3, num: '♯2', up: true }, { id: 'me', pc: 3, num: '♭3' },
    { id: 'mi', pc: 4, num: '3' }, { id: 'fa', pc: 5, num: '4' }, { id: 'fi', pc: 6, num: '♯4', up: true }, { id: 'se', pc: 6, num: '♭5' },
    { id: 'sol', pc: 7, num: '5' }, { id: 'si', pc: 8, num: '♯5', up: true }, { id: 'le', pc: 8, num: '♭6' },
    { id: 'la', pc: 9, num: '6' }, { id: 'li', pc: 10, num: '♯6', up: true }, { id: 'te', pc: 10, num: '♭7' }, { id: 'ti', pc: 11, num: '7' }
  ];
  const SOL = {}; SOLFEGE.forEach(s => SOL[s.id] = s);
  const SYL_NAME = { do: 'Do', di: 'Di', ra: 'Ra', re: 'Re', ri: 'Ri', me: 'Me', mi: 'Mi', fa: 'Fa', fi: 'Fi', se: 'Se', sol: 'Sol', si: 'Si', le: 'Le', la: 'La', li: 'Li', te: 'Te', ti: 'Ti' };
  // Chromatic tendency: raised syllables resolve up, lowered resolve down
  const TENDENCY = { di: 're', ri: 'mi', fi: 'sol', si: 'la', li: 'ti', ra: 'do', me: 're', se: 'fa', le: 'sol', te: 'la', ti: 'do', fa: 'mi' };
  const DIATONIC_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
  const DIATONIC_MINOR = ['do', 're', 'me', 'fa', 'sol', 'le', 'te'];
  const CHROMATIC_RAISED = ['di', 'ri', 'fi', 'si', 'li'];
  const CHROMATIC_LOWERED = ['ra', 'me', 'se', 'le', 'te'];

  // la-based minor conversion (display only): shift syllable up a minor third within the pc space
  function sylDisplay(id, system) {
    if (system === 'num') return SOL[id].num;
    return SYL_NAME[id];
  }

  /* ---------- Scales ---------- */
  const SCALES = {
    major: { name: 'Major (Ionian)', iv: [0, 2, 4, 5, 7, 9, 11], syl: ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'], fam: 'tonal' },
    natmin: { name: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10], syl: ['do', 're', 'me', 'fa', 'sol', 'le', 'te'], fam: 'tonal' },
    harmmin: { name: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11], syl: ['do', 're', 'me', 'fa', 'sol', 'le', 'ti'], fam: 'tonal' },
    melmin: { name: 'Melodic minor', iv: [0, 2, 3, 5, 7, 9, 11], syl: ['do', 're', 'me', 'fa', 'sol', 'la', 'ti'], fam: 'tonal' },
    majpent: { name: 'Major pentatonic', iv: [0, 2, 4, 7, 9], syl: ['do', 're', 'mi', 'sol', 'la'], fam: 'pent' },
    minpent: { name: 'Minor pentatonic', iv: [0, 3, 5, 7, 10], syl: ['do', 'me', 'fa', 'sol', 'te'], fam: 'pent' },
    blues: { name: 'Blues scale', iv: [0, 3, 5, 6, 7, 10], syl: ['do', 'me', 'fa', 'fi', 'sol', 'te'], fam: 'pent' },
    dorian: { name: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10], syl: ['do', 're', 'me', 'fa', 'sol', 'la', 'te'], fam: 'mode' },
    phrygian: { name: 'Phrygian', iv: [0, 1, 3, 5, 7, 8, 10], syl: ['do', 'ra', 'me', 'fa', 'sol', 'le', 'te'], fam: 'mode' },
    lydian: { name: 'Lydian', iv: [0, 2, 4, 6, 7, 9, 11], syl: ['do', 're', 'mi', 'fi', 'sol', 'la', 'ti'], fam: 'mode' },
    mixolydian: { name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10], syl: ['do', 're', 'mi', 'fa', 'sol', 'la', 'te'], fam: 'mode' },
    locrian: { name: 'Locrian', iv: [0, 1, 3, 5, 6, 8, 10], syl: ['do', 'ra', 'me', 'fa', 'se', 'le', 'te'], fam: 'mode' },
    wholetone: { name: 'Whole tone', iv: [0, 2, 4, 6, 8, 10], syl: ['do', 're', 'mi', 'fi', 'si', 'li'], fam: 'sym' },
    dimWH: { name: 'Diminished (whole–half)', iv: [0, 2, 3, 5, 6, 8, 9, 11], syl: ['do', 're', 'me', 'fa', 'se', 'le', 'la', 'ti'], fam: 'sym' },
    dimHW: { name: 'Diminished (half–whole)', iv: [0, 1, 3, 4, 6, 7, 9, 10], syl: ['do', 'ra', 'me', 'mi', 'fi', 'sol', 'la', 'te'], fam: 'sym' },
    altered: { name: 'Altered (super Locrian)', iv: [0, 1, 3, 4, 6, 8, 10], syl: ['do', 'ra', 'me', 'mi', 'se', 'le', 'te'], fam: 'jazz' },
    lyddom: { name: 'Lydian dominant', iv: [0, 2, 4, 6, 7, 9, 10], syl: ['do', 're', 'mi', 'fi', 'sol', 'la', 'te'], fam: 'jazz' },
    harmmaj: { name: 'Harmonic major', iv: [0, 2, 4, 5, 7, 8, 11], syl: ['do', 're', 'mi', 'fa', 'sol', 'le', 'ti'], fam: 'jazz' }
  };

  /* ---------- Chords ---------- */
  // sym: Berklee-style chord symbol suffix
  const CHORDS = {
    maj: { name: 'Major triad', sym: '', iv: [0, 4, 7], fam: 'triad' },
    min: { name: 'Minor triad', sym: '–', iv: [0, 3, 7], fam: 'triad' },
    dim: { name: 'Diminished triad', sym: '°', iv: [0, 3, 6], fam: 'triad' },
    aug: { name: 'Augmented triad', sym: '+', iv: [0, 4, 8], fam: 'triad' },
    sus2: { name: 'Sus2', sym: 'sus2', iv: [0, 2, 7], fam: 'triad' },
    sus4: { name: 'Sus4', sym: 'sus4', iv: [0, 5, 7], fam: 'triad' },
    maj7: { name: 'Major 7', sym: 'Maj7', iv: [0, 4, 7, 11], fam: '7th' },
    dom7: { name: 'Dominant 7', sym: '7', iv: [0, 4, 7, 10], fam: '7th' },
    m7: { name: 'Minor 7', sym: '–7', iv: [0, 3, 7, 10], fam: '7th' },
    m7b5: { name: 'Minor 7(♭5) / half-dim', sym: '–7(♭5)', iv: [0, 3, 6, 10], fam: '7th' },
    dim7: { name: 'Diminished 7', sym: '°7', iv: [0, 3, 6, 9], fam: '7th' },
    mMaj7: { name: 'Minor (Maj7)', sym: '–(Maj7)', iv: [0, 3, 7, 11], fam: '7th' },
    six: { name: 'Major 6', sym: '6', iv: [0, 4, 7, 9], fam: '7th' },
    m6: { name: 'Minor 6', sym: '–6', iv: [0, 3, 7, 9], fam: '7th' },
    sus7: { name: '7sus4', sym: '7sus4', iv: [0, 5, 7, 10], fam: '7th' },
    aug7: { name: '7(♯5)', sym: '7(♯5)', iv: [0, 4, 8, 10], fam: '7th' },
    maj9: { name: 'Major 9', sym: 'Maj9', iv: [0, 4, 11, 14], fam: 'ext' },
    dom9: { name: 'Dominant 9', sym: '9', iv: [0, 4, 10, 14], fam: 'ext' },
    m9: { name: 'Minor 9', sym: '–9', iv: [0, 3, 10, 14], fam: 'ext' },
    dom13: { name: 'Dominant 13', sym: '13', iv: [0, 4, 10, 14, 21], fam: 'ext' },
    dom7b9: { name: '7(♭9)', sym: '7(♭9)', iv: [0, 4, 10, 13], fam: 'ext' },
    dom7s9: { name: '7(♯9)', sym: '7(♯9)', iv: [0, 4, 10, 15], fam: 'ext' },
    dom7s11: { name: '7(♯11)', sym: '7(♯11)', iv: [0, 4, 10, 18], fam: 'ext' },
    maj7s11: { name: 'Maj7(♯11)', sym: 'Maj7(♯11)', iv: [0, 4, 11, 18], fam: 'ext' },
    m11: { name: 'Minor 11', sym: '–11', iv: [0, 3, 10, 17], fam: 'ext' },
    dom7b13: { name: '7(♭13)', sym: '7(♭13)', iv: [0, 4, 10, 20], fam: 'ext' },
    alt: { name: '7alt (♭9 ♭13)', sym: '7alt', iv: [0, 4, 10, 13, 20], fam: 'alt' },
    six9: { name: '6/9', sym: '6/9', iv: [0, 4, 9, 14], fam: 'ext' },
    dom9sus: { name: '9sus4', sym: '9sus4', iv: [0, 5, 10, 14], fam: 'ext' },
    m9maj7: { name: '–9(Maj7)', sym: '–9(Maj7)', iv: [0, 3, 11, 14], fam: 'alt' },
    maj7s5: { name: 'Maj7(♯5)', sym: 'Maj7(♯5)', iv: [0, 4, 8, 11], fam: 'alt' }
  };

  function chordNotes(type, rootMidi) {
    return CHORDS[type].iv.map(i => rootMidi + i);
  }

  /* ---------- Roman numeral tokens ----------
     root = semitones above tonic; type = chord type; lab = Berklee label; low = lowercase-style label */
  const TOKENS = {
    // Major-key diatonic triads
    'I': { root: 0, type: 'maj', lab: 'I', low: 'I' },
    'II-': { root: 2, type: 'min', lab: 'II–', low: 'ii' },
    'III-': { root: 4, type: 'min', lab: 'III–', low: 'iii' },
    'IV': { root: 5, type: 'maj', lab: 'IV', low: 'IV' },
    'V': { root: 7, type: 'maj', lab: 'V', low: 'V' },
    'VI-': { root: 9, type: 'min', lab: 'VI–', low: 'vi' },
    'VIIo': { root: 11, type: 'dim', lab: 'VII°', low: 'vii°' },
    // Major-key diatonic sevenths
    'IMaj7': { root: 0, type: 'maj7', lab: 'IMaj7', low: 'Imaj7' },
    'II-7': { root: 2, type: 'm7', lab: 'II–7', low: 'ii7' },
    'III-7': { root: 4, type: 'm7', lab: 'III–7', low: 'iii7' },
    'IVMaj7': { root: 5, type: 'maj7', lab: 'IVMaj7', low: 'IVmaj7' },
    'V7': { root: 7, type: 'dom7', lab: 'V7', low: 'V7' },
    'VI-7': { root: 9, type: 'm7', lab: 'VI–7', low: 'vi7' },
    'VII-7b5': { root: 11, type: 'm7b5', lab: 'VII–7(♭5)', low: 'viiø7' },
    'V7sus4': { root: 7, type: 'sus7', lab: 'V7sus4', low: 'V7sus4' },
    // Secondary dominants
    'V7/II': { root: 9, type: 'dom7', lab: 'V7/II', low: 'V7/ii' },
    'V7/III': { root: 11, type: 'dom7', lab: 'V7/III', low: 'V7/iii' },
    'V7/IV': { root: 0, type: 'dom7', lab: 'V7/IV', low: 'V7/IV' },
    'V7/V': { root: 2, type: 'dom7', lab: 'V7/V', low: 'V7/V' },
    'V7/VI': { root: 4, type: 'dom7', lab: 'V7/VI', low: 'V7/vi' },
    // Modal interchange (from parallel minor / other modes)
    'IV-': { root: 5, type: 'min', lab: 'IV–', low: 'iv' },
    'IV-7': { root: 5, type: 'm7', lab: 'IV–7', low: 'iv7' },
    'bVI': { root: 8, type: 'maj', lab: '♭VI', low: '♭VI' },
    'bVIMaj7': { root: 8, type: 'maj7', lab: '♭VIMaj7', low: '♭VImaj7' },
    'bVII': { root: 10, type: 'maj', lab: '♭VII', low: '♭VII' },
    'bVII7': { root: 10, type: 'dom7', lab: '♭VII7', low: '♭VII7' },
    'bIII': { root: 3, type: 'maj', lab: '♭III', low: '♭III' },
    'bIIIMaj7': { root: 3, type: 'maj7', lab: '♭IIIMaj7', low: '♭IIImaj7' },
    'II-7b5': { root: 2, type: 'm7b5', lab: 'II–7(♭5)', low: 'iiø7' },
    'bIIMaj7': { root: 1, type: 'maj7', lab: '♭IIMaj7', low: '♭IImaj7' },
    'V-7': { root: 7, type: 'm7', lab: 'V–7', low: 'v7' },
    'I-7': { root: 0, type: 'm7', lab: 'I–7', low: 'i7' },
    // Substitute dominants
    'subV7': { root: 1, type: 'dom7', lab: 'subV7 (♭II7)', low: '♭II7 (subV)' },
    'subV7/V': { root: 8, type: 'dom7', lab: 'subV7/V', low: '♭VI7 (subV/V)' },
    'subV7/II': { root: 3, type: 'dom7', lab: 'subV7/II', low: '♭III7 (subV/ii)' },
    // Passing diminished
    '#Io7': { root: 1, type: 'dim7', lab: '♯I°7', low: '♯i°7' },
    '#IIo7': { root: 3, type: 'dim7', lab: '♯II°7', low: '♯ii°7' },
    '#IVo7': { root: 6, type: 'dim7', lab: '♯IV°7', low: '♯iv°7' },
    // Minor-key tokens (prefix m:)
    'm:I-': { root: 0, type: 'min', lab: 'I–', low: 'i' },
    'm:I-7': { root: 0, type: 'm7', lab: 'I–7', low: 'i7' },
    'm:IIo': { root: 2, type: 'dim', lab: 'II°', low: 'ii°' },
    'm:II-7b5': { root: 2, type: 'm7b5', lab: 'II–7(♭5)', low: 'iiø7' },
    'm:bIII': { root: 3, type: 'maj', lab: '♭III', low: '♭III' },
    'm:bIIIMaj7': { root: 3, type: 'maj7', lab: '♭IIIMaj7', low: '♭IIImaj7' },
    'm:IV-': { root: 5, type: 'min', lab: 'IV–', low: 'iv' },
    'm:IV-7': { root: 5, type: 'm7', lab: 'IV–7', low: 'iv7' },
    'm:IV7': { root: 5, type: 'dom7', lab: 'IV7', low: 'IV7' },
    'm:V-7': { root: 7, type: 'm7', lab: 'V–7', low: 'v7' },
    'm:V': { root: 7, type: 'maj', lab: 'V', low: 'V' },
    'm:V7': { root: 7, type: 'dom7', lab: 'V7', low: 'V7' },
    'm:bVI': { root: 8, type: 'maj', lab: '♭VI', low: '♭VI' },
    'm:bVIMaj7': { root: 8, type: 'maj7', lab: '♭VIMaj7', low: '♭VImaj7' },
    'm:bVII': { root: 10, type: 'maj', lab: '♭VII', low: '♭VII' },
    'm:bVII7': { root: 10, type: 'dom7', lab: '♭VII7', low: '♭VII7' },
    'm:VIIo7': { root: 11, type: 'dim7', lab: 'VII°7', low: 'vii°7' },
    'm:V7/IV': { root: 0, type: 'dom7', lab: 'V7/IV', low: 'V7/iv' },
    'm:subV7': { root: 1, type: 'dom7', lab: 'subV7 (♭II7)', low: '♭II7 (subV)' },
    'm:V7/V': { root: 2, type: 'dom7', lab: 'V7/V', low: 'V7/V' },
    'm:bIIMaj7': { root: 1, type: 'maj7', lab: '♭IIMaj7', low: '♭IImaj7' }
  };
  function tokenLabel(tok, style) {
    const t = TOKENS[tok]; if (!t) return tok;
    return style === 'low' ? t.low : t.lab;
  }
  function tokenChordName(tok, tonicPc, minor) {
    const t = TOKENS[tok]; const flat = prefersFlat(tonicPc, minor);
    return pcName(tonicPc + t.root, flat) + CHORDS[t.type].sym;
  }

  /* ---------- Voicing & voice leading ----------
     Returns {bass: midi, upper: [midi...]} for a chord type at root (pc) given previous voicing. */
  function voiceChord(type, rootPc, prev, opts) {
    opts = opts || {};
    const iv = CHORDS[type].iv.slice();
    const lo = opts.lo || 60, hi = opts.hi || 81;  // upper-voice window (C4..A5)
    // Upper structure: for 5+ note chords drop the root (bass has it)
    const upperIv = iv.length >= 5 ? iv.slice(1) : iv;
    const pcs = upperIv.map(i => mod12(rootPc + i));
    const n = pcs.length;
    const cands = [];
    for (let inv = 0; inv < n; inv++) {
      // close voicing starting from pcs[inv] ascending
      const order = [];
      for (let k = 0; k < n; k++) order.push(pcs[(inv + k) % n]);
      for (let base = 48; base <= 84; base++) {
        if (mod12(base) !== order[0]) continue;
        const notes = [base];
        for (let k = 1; k < n; k++) {
          let m = notes[k - 1] + 1;
          while (mod12(m) !== order[k]) m++;
          notes.push(m);
        }
        if (notes[0] < lo || notes[n - 1] > hi) continue;
        cands.push(notes);
      }
    }
    if (!cands.length) return { bass: rootPc + 36, upper: upperIv.map(i => 60 + i) };
    const center = (lo + hi) / 2;
    let best = null, bestCost = Infinity;
    for (const c of cands) {
      let cost = 0;
      if (prev && prev.upper) {
        // voice-leading cost: match each new voice to nearest previous voice
        for (const v of c) { let d = Infinity; for (const p of prev.upper) d = Math.min(d, Math.abs(v - p)); cost += d; }
        for (const p of prev.upper) { let d = Infinity; for (const v of c) d = Math.min(d, Math.abs(v - p)); cost += d * 0.5; }
      } else {
        // first chord: prefer root position, centred
        if (mod12(c[0]) !== mod12(rootPc)) cost += 3;
      }
      const mean = c.reduce((a, b) => a + b, 0) / c.length;
      cost += Math.abs(mean - center) * 0.15;
      if (opts.forceBassPc !== undefined && mod12(c[0]) !== mod12(opts.forceBassPc)) cost += 100;
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    // bass: root (or given bass pc) in E2..E3 window
    const bassPc = opts.bassPc !== undefined ? opts.bassPc : rootPc;
    let bass = 40; while (mod12(bass) !== mod12(bassPc)) bass++;
    if (bass > 52) bass -= 12;
    return { bass, upper: best };
  }

  // Close-position voicing with a specific inversion, no separate bass (for inversion drills)
  function inversionVoicing(type, rootMidi, inv) {
    const iv = CHORDS[type].iv;
    const notes = iv.map(i => rootMidi + i);
    for (let k = 0; k < inv; k++) { const low = notes.shift(); notes.push(low + 12); }
    return notes;
  }

  /* ---------- Scale helpers ---------- */
  function scaleNotes(scaleId, tonicMidi, octaves) {
    const iv = SCALES[scaleId].iv; const out = [];
    for (let o = 0; o < (octaves || 1); o++) iv.forEach(i => out.push(tonicMidi + i + 12 * o));
    out.push(tonicMidi + 12 * (octaves || 1));
    return out;
  }
  function degreeToMidi(syl, tonicMidi, octave) {
    return tonicMidi + SOL[syl].pc + 12 * (octave || 0);
  }
  // Cadence voicings in a key (I IV V7 I  or  I V7 I)
  function cadenceChords(tonicPc, minor, short) {
    const seq = minor
      ? (short ? ['m:I-', 'm:V7', 'm:I-'] : ['m:I-', 'm:IV-', 'm:V7', 'm:I-'])
      : (short ? ['I', 'V7', 'I'] : ['I', 'IV', 'V7', 'I']);
    let prev = null; const out = [];
    seq.forEach(tok => {
      const t = TOKENS[tok];
      const v = voiceChord(t.type, mod12(tonicPc + t.root), prev, { lo: 55, hi: 76 });
      out.push(v); prev = v;
    });
    return out;
  }

  Object.assign(E, {
    mod12, prefersFlat, pcName, midiName, keyName, midiToFreq, freqToMidi,
    INTERVALS, INTERVAL_BY_ID, INTERVAL_SOLFEGE, SONG_CUES,
    SOLFEGE, SOL, SYL_NAME, TENDENCY, DIATONIC_MAJOR, DIATONIC_MINOR, CHROMATIC_RAISED, CHROMATIC_LOWERED, sylDisplay,
    SCALES, CHORDS, chordNotes, TOKENS, tokenLabel, tokenChordName,
    voiceChord, inversionVoicing, scaleNotes, degreeToMidi, cadenceChords
  });
})(window.EARS = window.EARS || {});
