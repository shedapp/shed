// theory.js — pitch classes, key-aware spelling, chord qualities and symbols, parsing,
// Roman-numeral analysis, key finding and chord identification from notes.
// Plain functions, no dependencies. Works in the browser (global `Theory`) and in Node (module.exports).
const Theory = (() => {
  const mod = (n, m) => ((n % m) + m) % m;
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const FLAT = '♭', SHARP = '♯';

  // ---------- Chord qualities ----------
  // intervals in semitones above the root (may exceed 12 for extensions); `ess` = tones that define the sound
  // (used by identification and voicing: 0 = root, the 3rd/sus tone and the 7th/6th when present).
  // suffix = songwriter style, jazz = Δ/ø style. cat = maj | min | dom | dim | aug | sus
  const Q = {};
  const def = (id, iv, suffix, jazz, name, cat, opts = {}) => { Q[id] = Object.assign({ id, iv, suffix, jazz: jazz == null ? suffix : jazz, name, cat }, opts); };
  def('maj', [0, 4, 7], '', '', 'major', 'maj');
  def('min', [0, 3, 7], 'm', '-', 'minor', 'min');
  def('dim', [0, 3, 6], '°', '°', 'diminished', 'dim');
  def('aug', [0, 4, 8], '+', '+', 'augmented', 'aug');
  def('sus4', [0, 5, 7], 'sus4', 'sus4', 'suspended 4th', 'sus');
  def('sus2', [0, 2, 7], 'sus2', 'sus2', 'suspended 2nd', 'sus');
  def('add9', [0, 4, 7, 14], 'add9', 'add9', 'major add 9', 'maj');
  def('madd9', [0, 3, 7, 14], 'm(add9)', '-(add9)', 'minor add 9', 'min');
  def('6', [0, 4, 7, 9], '6', '6', 'major 6th', 'maj');
  def('m6', [0, 3, 7, 9], 'm6', '-6', 'minor 6th', 'min');
  def('69', [0, 4, 7, 9, 14], '6/9', '6/9', 'six-nine', 'maj');
  def('7', [0, 4, 7, 10], '7', '7', 'dominant 7th', 'dom');
  def('maj7', [0, 4, 7, 11], 'maj7', 'Δ7', 'major 7th', 'maj');
  def('m7', [0, 3, 7, 10], 'm7', '-7', 'minor 7th', 'min');
  def('mMaj7', [0, 3, 7, 11], 'm(maj7)', '-Δ7', 'minor-major 7th', 'min');
  def('m7b5', [0, 3, 6, 10], 'm7♭5', 'ø7', 'half-diminished', 'dim');
  def('dim7', [0, 3, 6, 9], '°7', '°7', 'diminished 7th', 'dim');
  def('7sus4', [0, 5, 7, 10], '7sus4', '7sus4', 'dominant 7 sus 4', 'sus');
  def('9', [0, 4, 7, 10, 14], '9', '9', 'dominant 9th', 'dom');
  def('maj9', [0, 4, 7, 11, 14], 'maj9', 'Δ9', 'major 9th', 'maj');
  def('m9', [0, 3, 7, 10, 14], 'm9', '-9', 'minor 9th', 'min');
  def('m11', [0, 3, 7, 10, 14, 17], 'm11', '-11', 'minor 11th', 'min');
  def('9sus4', [0, 5, 7, 10, 14], '9sus4', '9sus4', 'dominant 9 sus 4', 'sus');
  def('13', [0, 4, 7, 10, 14, 21], '13', '13', 'dominant 13th', 'dom');
  def('m13', [0, 3, 7, 10, 14, 21], 'm13', '-13', 'minor 13th', 'min');
  def('13sus4', [0, 5, 7, 10, 14, 21], '13sus4', '13sus4', 'dominant 13 sus 4', 'sus');
  def('maj7s11', [0, 4, 7, 11, 18], 'maj7(♯11)', 'Δ7♯11', 'major 7 sharp 11 (Lydian)', 'maj');
  def('maj9s11', [0, 4, 7, 11, 14, 18], 'maj9(♯11)', 'Δ9♯11', 'major 9 sharp 11 (Lydian)', 'maj');
  def('maj13', [0, 4, 7, 11, 14, 21], 'maj13', 'Δ13', 'major 13th', 'maj');
  def('7b9', [0, 4, 7, 10, 13], '7(♭9)', '7♭9', 'dominant 7 flat 9', 'dom');
  def('7s9', [0, 4, 7, 10, 15], '7(♯9)', '7♯9', 'dominant 7 sharp 9', 'dom');
  def('7s11', [0, 4, 7, 10, 18], '7(♯11)', '7♯11', 'dominant 7 sharp 11', 'dom');
  def('7b13', [0, 4, 7, 10, 20], '7(♭13)', '7♭13', 'dominant 7 flat 13', 'dom');
  def('7alt', [0, 4, 10, 15, 20], '7alt', '7alt', 'altered dominant', 'dom');
  def('7s5', [0, 4, 8, 10], '7(♯5)', '7♯5', 'dominant 7 sharp 5', 'dom');
  def('7b5', [0, 4, 6, 10], '7(♭5)', '7♭5', 'dominant 7 flat 5', 'dom');
  def('13b9', [0, 4, 7, 10, 13, 21], '13(♭9)', '13♭9', 'dominant 13 flat 9', 'dom');
  def('7s9s5', [0, 4, 8, 10, 15], '7(♯9♯5)', '7♯9♯5', 'dominant 7 sharp 9 sharp 5', 'dom');
  def('7s9b13', [0, 4, 7, 10, 15, 20], '7(♯9♭13)', '7♯9♭13', 'dominant 7 sharp 9 flat 13', 'dom');
  def('7b9s11', [0, 4, 7, 10, 13, 18], '7(♭9♯11)', '7♭9♯11', 'dominant 7 flat 9 sharp 11', 'dom');
  def('13s11', [0, 4, 7, 10, 14, 18, 21], '13(♯11)', '13♯11', 'dominant 13 sharp 11', 'dom');
  def('maj7s5', [0, 4, 8, 11], 'maj7(♯5)', 'Δ7♯5', 'major 7 sharp 5', 'maj');
  def('m6/9', [0, 3, 7, 9, 14], 'm6/9', '-6/9', 'minor six-nine', 'min');
  def('mb6', [0, 3, 7, 8], 'm(♭6)', '-♭6', 'minor flat 6', 'min');
  def('5', [0, 7], '5', '5', 'open fifth', 'maj');

  // Essential tone roles per quality (interval classes): the ones a voicing must keep.
  const ess = (q) => {
    const s = new Set([0]);
    const iv = Q[q].iv.map(x => x % 12);
    if (iv.includes(4)) s.add(4); else if (iv.includes(3)) s.add(3); else if (iv.includes(5)) s.add(5); else if (iv.includes(2)) s.add(2);
    if (iv.includes(10)) s.add(10); else if (iv.includes(11)) s.add(11); else if (iv.includes(9) && (q === '6' || q === 'm6' || q === 'dim7' || q === '69' || q === 'm6/9')) s.add(9);
    if (Q[q].cat === 'dim') s.add(6);
    if (Q[q].cat === 'aug') s.add(8);
    if (q === '7alt' || q === '7s9' || q === '7s9s5' || q === '7s9b13') s.add(3); // the ♯9
    if (q === '7b9' || q === '13b9' || q === '7b9s11') s.add(1);
    if (q === 'maj7s11' || q === 'maj9s11' || q === '7s11' || q === '13s11' || q === '7b9s11') s.add(6);
    if (q === '7b13' || q === '7s9b13' || q === '7alt') s.add(8);
    if (q === 'maj7s5') s.add(8);
    return s;
  };

  // ---------- Keys and spelling ----------
  const MAJOR_TONIC_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const MINOR_TONIC_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

  function parseNoteName(s) {
    const m = /^([A-Ga-g])([#♯b♭x]*)/.exec(s.trim());
    if (!m) return null;
    const letter = m[1].toUpperCase();
    let acc = 0; for (const c of m[2]) acc += (c === '#' || c === '♯') ? 1 : (c === 'x' ? 2 : -1);
    return { letter, acc, pc: mod(LETTER_PC[letter] + acc, 12), rest: s.trim().slice(m[0].length) };
  }
  const accStr = (acc) => acc === 0 ? '' : acc > 0 ? SHARP.repeat(acc) : FLAT.repeat(-acc);
  const accAscii = (acc) => acc === 0 ? '' : acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc);

  // Key = { tonic: pc, mode: 'major' | 'minor' }
  function keyScale(key) {
    const tonicName = parseNoteName(key.mode === 'minor' ? MINOR_TONIC_NAME[key.tonic] : MAJOR_TONIC_NAME[key.tonic]);
    const steps = key.mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
    const li = LETTERS.indexOf(tonicName.letter);
    return steps.map((st, i) => {
      const letter = LETTERS[(li + i) % 7];
      const pc = mod(key.tonic + st, 12);
      let acc = pc - LETTER_PC[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
      return { letter, acc, pc, degree: i + 1 };
    });
  }
  function keyName(key) { return (key.mode === 'minor' ? MINOR_TONIC_NAME[key.tonic] : MAJOR_TONIC_NAME[key.tonic]) + (key.mode === 'minor' ? ' minor' : ' major'); }
  function keyShort(key) { return (key.mode === 'minor' ? MINOR_TONIC_NAME[key.tonic] + 'm' : MAJOR_TONIC_NAME[key.tonic]); }

  // Spell a pitch class in a key. `quality` (quality id) nudges chromatic roots: diminished chords spell sharp
  // (C♯°7 between C and Dm), everything else spells flat (♭II, ♭III, ♭VI, ♭VII); the raised fourth spells sharp.
  function spellPc(pc, key, quality, pref) {
    const sc = keyScale(key);
    const dia = sc.find(d => d.pc === pc);
    if (dia) return { letter: dia.letter, acc: dia.acc, pc };
    const isDim = quality && Q[quality] && Q[quality].cat === 'dim';
    const rel = mod(pc - key.tonic, 12);
    const below = sc.slice().reverse().find(d => mod(pc - d.pc, 12) === 1); // diatonic a half step below
    const above = sc.find(d => mod(d.pc - pc, 12) === 1);                   // diatonic a half step above
    const spellFrom = (d, delta) => { let acc = d.acc + delta; return { letter: d.letter, acc, pc }; };
    if (pref === 'sharp') return spellFrom(below, 1);
    if (pref === 'flat') return spellFrom(above, -1);
    if (key.mode === 'major') {
      if (rel === 6) return spellFrom(below, 1); // F♯: the raised fourth (Lydian, passing dim, ♯IV7 walk-up)
      return isDim ? spellFrom(below, 1) : spellFrom(above, -1);
    }
    // minor: raised 3rd, 6th, 7th spell as naturals/sharps; ♭II spells flat; raised 4 sharp
    if (rel === 1) return spellFrom(above, -1);
    if (rel === 4 || rel === 9 || rel === 11) return spellFrom(below, 1);
    if (rel === 6) return spellFrom(below, 1);
    return isDim ? spellFrom(below, 1) : spellFrom(above, -1);
  }
  const nameOf = (sp, ascii) => sp.letter + (ascii ? accAscii(sp.acc) : accStr(sp.acc));
  function pcName(pc, key, quality, ascii, pref) { return nameOf(spellPc(pc, key, quality, pref), ascii); }
  // Name a chord's bass note: a chord tone is spelled from the chord (E7/G♯, not E7/A♭); a hybrid bass from the key.
  function bassName(chord, key, ascii) {
    if (chord.bass == null) return null;
    const tones = chordToneNames(chord, key, ascii);
    const t = tones.find(x => x.pc === chord.bass);
    return t ? t.name : pcName(chord.bass, key, null, ascii);
  }

  // Spell a chord tone relative to the chord root (interval-based), so C7♯9 shows D♯ and C7♭9 shows D♭.
  const DEGREE_LETTER_OFFSET = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6 };
  function spellChordTone(rootSp, interval) {
    const ic = mod(interval, 12);
    let off = DEGREE_LETTER_OFFSET[ic];
    if (ic === 6) off = 3; // ♯11 / ♭5 both as the 4th-letter? no: ♯4 default (Lydian); flattened fifth handled by caller via alt flag
    if (ic === 8) off = 5;  // ♭13 / ♯5: default ♭6 letter
    const letter = LETTERS[(LETTERS.indexOf(rootSp.letter) + off) % 7];
    const pc = mod(rootSp.pc + ic, 12);
    let acc = pc - LETTER_PC[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
    if (Math.abs(acc) > 1) { // avoid double accidentals: respell enharmonically
      const alt = LETTERS[(LETTERS.indexOf(letter) + (acc > 0 ? 1 : 6)) % 7];
      let a2 = pc - LETTER_PC[alt]; if (a2 > 6) a2 -= 12; if (a2 < -6) a2 += 12;
      return { letter: alt, acc: a2, pc };
    }
    return { letter, acc, pc };
  }
  // ♯5 / ♯9 cases: the caller knows the quality; choose letters by role.
  function chordToneNames(chord, key, ascii) {
    const q = Q[chord.q]; const rootSp = spellPc(chord.root, key, chord.q, chord.pref);
    const roles = toneRoles(chord.q);
    return q.iv.map((iv, i) => {
      if (chord.spell && chord.spell[mod(chord.root + iv, 12)] != null) return { name: chord.spell[mod(chord.root + iv, 12)], pc: mod(chord.root + iv, 12), role: roles[i], interval: iv };
      const ic = mod(iv, 12); let sp;
      const role = roles[i];
      if (role === '♯5' || role === '♯9' || role === '♯11') { // sharp spellings: raise the natural degree letter
        const off = role === '♯5' ? 4 : role === '♯9' ? 1 : 3;
        const letter = LETTERS[(LETTERS.indexOf(rootSp.letter) + off) % 7];
        const pc = mod(rootSp.pc + ic, 12); let acc = pc - LETTER_PC[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
        sp = Math.abs(acc) > 1 ? spellChordTone(rootSp, iv) : { letter, acc, pc };
        if (role === '♯9' && ((letter === 'B' && acc === 1) || (letter === 'E' && acc === 1))) sp = spellChordTone(rootSp, iv); // players read C and F, not B♯ and E♯
      } else if (role === '♭♭7') {
        const letter = LETTERS[(LETTERS.indexOf(rootSp.letter) + 6) % 7];
        const pc = mod(rootSp.pc + ic, 12); let acc = pc - LETTER_PC[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
        sp = Math.abs(acc) > 1 ? spellChordTone(rootSp, iv) : { letter, acc, pc };
      } else if (role === '♭5') {
        const letter = LETTERS[(LETTERS.indexOf(rootSp.letter) + 4) % 7];
        const pc = mod(rootSp.pc + ic, 12); let acc = pc - LETTER_PC[letter]; if (acc > 6) acc -= 12; if (acc < -6) acc += 12;
        sp = Math.abs(acc) > 1 ? spellChordTone(rootSp, iv) : { letter, acc, pc };
      } else sp = spellChordTone(rootSp, iv);
      return { name: nameOf(sp, ascii), pc: sp.pc, role, interval: iv };
    });
  }
  // Human role names for each interval of a quality (1, 3, 5, ♭7, 9, …)
  function toneRoles(qid) {
    const q = Q[qid]; const names = [];
    const cat = q.cat;
    for (const iv of q.iv) {
      const ic = mod(iv, 12);
      let n;
      switch (ic) {
        case 0: n = '1'; break;
        case 1: n = '♭9'; break;
        case 2: n = iv >= 12 ? '9' : (qid === 'sus2' ? '2' : '9'); break;
        case 3: n = (cat === 'dom') ? '♯9' : '♭3'; break;
        case 4: n = '3'; break;
        case 5: n = iv >= 12 ? '11' : '4'; break;
        case 6: n = (qid === '7b5' || cat === 'dim') ? '♭5' : '♯11'; break;
        case 7: n = '5'; break;
        case 8: n = (qid === '7s5' || qid === '7s9s5' || qid === 'maj7s5' || cat === 'aug') ? '♯5' : (qid === 'mb6' ? '♭6' : '♭13'); break;
        case 9: n = iv >= 12 ? '13' : (cat === 'dim' ? '♭♭7' : '6'); break;
        case 10: n = '♭7'; break;
        case 11: n = '7'; break;
      }
      names.push(n);
    }
    return names;
  }

  // ---------- Chord symbols ----------
  // chord = { root: pc, q: quality id, bass?: pc }
  function chordSymbol(chord, key, opts = {}) {
    if (chord.label && !opts.ascii) return chord.label;
    const style = opts.style || 'plain'; // 'plain' | 'jazz'
    const q = Q[chord.q] || Q.maj;
    const root = pcName(chord.root, key, chord.q, opts.ascii, chord.pref);
    let sfx = style === 'jazz' ? q.jazz : q.suffix;
    if (opts.ascii) sfx = sfx.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/°/g, 'dim').replace(/ø/g, 'm7b5').replace(/Δ/g, 'maj');
    let s = root + sfx;
    if (chord.bass != null && chord.bass !== chord.root) s += '/' + bassName(chord, key, opts.ascii);
    return s;
  }
  // Split a symbol into root / suffix / bass for typographic rendering.
  function chordParts(chord, key, opts = {}) {
    const q = Q[chord.q] || Q.maj;
    if (chord.label) return { root: chord.label, sfx: '', bass: null };
    const root = pcName(chord.root, key, chord.q, false, chord.pref);
    const sfx = (opts.style === 'jazz') ? q.jazz : q.suffix;
    const bass = (chord.bass != null && chord.bass !== chord.root) ? bassName(chord, key) : null;
    return { root, sfx, bass };
  }

  // ---------- Parsing chord symbols typed by a musician ----------
  const SUFFIX_MAP = (() => {
    const m = new Map();
    const add = (q, ...alts) => alts.forEach(a => m.set(a.toLowerCase(), q));
    add('maj', '', 'maj', 'major', 'M');
    add('min', 'm', 'min', 'minor', '-');
    add('dim', 'dim', '°', 'o');
    add('aug', 'aug', '+', '#5');
    add('sus4', 'sus4', 'sus');
    add('sus2', 'sus2', '2');
    add('add9', 'add9', 'add2', '(add9)');
    add('madd9', 'madd9', 'm(add9)', 'madd2', '-add9');
    add('6', '6', 'maj6', 'M6');
    add('m6', 'm6', 'min6', '-6');
    add('69', '6/9', '69', '6add9', '6(9)', 'maj6/9');
    add('7', '7', 'dom7', 'dom');
    add('maj7', 'maj7', 'M7', 'Δ7', 'Δ', 'ma7', 'maj', '△7', '△');
    add('m7', 'm7', 'min7', '-7', 'mi7');
    add('mMaj7', 'mmaj7', 'm(maj7)', 'minmaj7', '-Δ7', 'mΔ7', 'm#7', 'mM7');
    add('m7b5', 'm7b5', 'm7(b5)', 'ø', 'ø7', 'min7b5', '-7b5', 'half-dim', 'm7-5');
    add('dim7', 'dim7', '°7', 'o7');
    add('7sus4', '7sus4', '7sus');
    add('9', '9', 'dom9');
    add('maj9', 'maj9', 'M9', 'Δ9', 'ma9');
    add('m9', 'm9', 'min9', '-9');
    add('m11', 'm11', 'min11', '-11');
    add('9sus4', '9sus4', '9sus', '11', 'sus9');
    add('13', '13');
    add('m13', 'm13', '-13');
    add('13sus4', '13sus4', '13sus');
    add('maj7s11', 'maj7#11', 'maj7(#11)', 'Δ7#11', 'M7#11', 'maj7+11');
    add('maj9s11', 'maj9#11', 'maj9(#11)', 'Δ9#11');
    add('maj13', 'maj13', 'M13', 'Δ13');
    add('7b9', '7b9', '7(b9)', '7-9');
    add('7s9', '7#9', '7(#9)', '7+9');
    add('7s11', '7#11', '7(#11)', '7+11');
    add('7b13', '7b13', '7(b13)');
    add('7alt', '7alt', 'alt', '7#9b13', '7(#9b13)');
    add('7s5', '7#5', '7(#5)', '7+5', '7+', 'aug7');
    add('7b5', '7b5', '7(b5)', '7-5');
    add('13b9', '13b9', '13(b9)');
    add('7s9s5', '7#9#5', '7(#9#5)', '7#5#9');
    add('7s9b13', '7#9b13', '7(#9b13)');
    add('7b9s11', '7b9#11', '7(b9#11)');
    add('13s11', '13#11', '13(#11)');
    add('maj7s5', 'maj7#5', 'maj7(#5)', 'Δ7#5', 'M7#5');
    add('m6/9', 'm6/9', 'm69', 'm6(9)', '-6/9');
    add('mb6', 'mb6', 'm(b6)');
    add('5', '5');
    return m;
  })();
  function parseChord(sym) {
    if (!sym) return null;
    let s = sym.trim().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, '');
    if (!s) return null;
    let bass = null;
    const slash = s.lastIndexOf('/');
    if (slash > 0) {
      const b = parseNoteName(s.slice(slash + 1));
      if (b && b.rest === '') { bass = b.pc; s = s.slice(0, slash); }
    }
    const r = parseNoteName(s); if (!r) return null;
    let sfx = r.rest.replace(/^\(|\)$/g, '');
    let q = SUFFIX_MAP.get(sfx.toLowerCase());
    if (q === undefined) {
      // tolerant fallbacks
      const low = sfx.toLowerCase().replace(/[()]/g, '');
      q = SUFFIX_MAP.get(low);
      if (q === undefined) {
        if (/^maj7?$/.test(low)) q = 'maj7';
        else if (/^m(in)?$/.test(low)) q = 'min';
        else if (/^dim/.test(low)) q = low.includes('7') ? 'dim7' : 'dim';
        else if (/^m7/.test(low)) q = 'm7';
        else if (/^m9/.test(low)) q = 'm9';
        else if (/^7/.test(low)) q = '7';
        else return null;
      }
    }
    return { root: r.pc, q, bass };
  }
  // "C Am7 | F G" → array of chords (bars separated by | or newlines, chords by spaces)
  function parseProgression(text) {
    const out = [];
    const bars = text.split(/[|\n]+/);
    for (const bar of bars) {
      const toks = bar.trim().split(/\s+|,|–|-\s/).filter(Boolean);
      const chords = toks.map(parseChord).filter(Boolean);
      if (!chords.length) continue;
      const beats = 4 / chords.length;
      chords.forEach(c => out.push(Object.assign({}, c, { beats })));
    }
    return out;
  }

  // ---------- Pitch class sets ----------
  const chordPcs = (chord) => Q[chord.q].iv.map(iv => mod(chord.root + iv, 12));
  const chordPcSet = (chord) => { const s = new Set(chordPcs(chord)); if (chord.bass != null) s.add(chord.bass); return s; };
  const sameChord = (a, b) => a && b && a.root === b.root && a.q === b.q && (a.bass ?? a.root) === (b.bass ?? b.root);
  const sharedTones = (a, b) => { const A = chordPcSet(a); let n = 0; for (const p of chordPcSet(b)) if (A.has(p)) n++; return n; };

  // ---------- Key finding ----------
  // Returns best key for a progression (array of {root, q, bass, beats}) and a ranked list.
  function findKey(prog, opts = {}) {
    if (!prog || !prog.length) return { key: { tonic: 0, mode: 'major' }, ranked: [] };
    const results = [];
    for (let tonic = 0; tonic < 12; tonic++) for (const mode of ['major', 'minor']) {
      const key = { tonic, mode };
      const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
      const dia = new Set(steps.map(s => mod(tonic + s, 12)));
      const soft = new Set(mode === 'minor' ? [mod(tonic + 11, 12), mod(tonic + 9, 12)] : [mod(tonic + 10, 12)]); // raised 6/7 in minor, ♭7 in major
      let score = 0, total = 0;
      const avg = prog.reduce((a, c) => a + (c.beats || 4), 0) / prog.length;
      prog.forEach((c, i) => {
        const w = (c.beats || 4) / avg; total += w;
        const pcs = chordPcs(c);
        let fit = 0;
        for (const p of pcs) fit += dia.has(p) ? 1 : soft.has(p) ? 0.3 : -0.9;
        fit /= pcs.length;
        if (!dia.has(c.root)) fit -= soft.has(c.root) ? 0.5 : 1.2; // a chromatic root is strong evidence against the key
        score += fit * w;
        const rel = mod(c.root - tonic, 12);
        const cat = Q[c.q].cat;
        // functional bonuses
        if (rel === 0 && ((mode === 'major' && (cat === 'maj' || cat === 'sus')) || (mode === 'minor' && cat === 'min'))) {
          score += 0.9 * w + (i === 0 ? 1.0 : 0) + (i === prog.length - 1 ? 1.0 : 0);
        }
        if (rel === 0 && ((mode === 'major' && cat === 'min') || (mode === 'minor' && cat === 'maj' && c.q !== 'maj' && c.q !== 'add9'))) score -= 1.2 * w;
        if (rel === 7 && (cat === 'dom' || cat === 'maj' || cat === 'sus')) score += 0.5 * w;
        if (rel === 5 && ((mode === 'major' && cat === 'maj') || (mode === 'minor' && cat === 'min'))) score += 0.3 * w;
        if (mode === 'major' && rel === 9 && cat === 'min') score += 0.15 * w;
        if (mode === 'minor' && rel === 3 && cat === 'maj') score += 0.15 * w;
        if (mode === 'minor' && (rel === 8 || rel === 10) && cat === 'maj') score += 0.2 * w;
      });
      if (mode === 'major') score += 0.25; // ties go to major
      results.push({ key, score: score / Math.max(1, total) });
    }
    results.sort((a, b) => b.score - a.score);
    return { key: results[0].key, ranked: results };
  }

  // ---------- Roman numeral analysis ----------
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function degreeInfo(pc, key, quality, pref) {
    const sc = keyScale(key);
    const dia = sc.find(d => d.pc === pc);
    if (dia) return { degree: dia.degree, acc: 0 };
    const rel = mod(pc - key.tonic, 12);
    const isDim = quality && Q[quality] && Q[quality].cat === 'dim';
    const below = sc.slice().reverse().find(d => mod(pc - d.pc, 12) === 1);
    const above = sc.find(d => mod(d.pc - pc, 12) === 1);
    if (pref === 'sharp') return { degree: below.degree, acc: 1 };
    if (pref === 'flat') return { degree: above.degree, acc: -1 };
    if (key.mode === 'major') {
      if (rel === 6) return { degree: below.degree, acc: 1 };
      return isDim ? { degree: below.degree, acc: 1 } : { degree: above.degree, acc: -1 };
    }
    if (rel === 1) return { degree: above.degree, acc: -1 };
    if (rel === 4 || rel === 9 || rel === 11 || rel === 6) return { degree: below.degree, acc: 1 };
    return isDim ? { degree: below.degree, acc: 1 } : { degree: above.degree, acc: -1 };
  }
  function romanNumeral(chord, key, opts = {}) {
    const q = Q[chord.q];
    const di = degreeInfo(chord.root, key, chord.q, chord.pref);
    let num = ROMAN[di.degree - 1];
    const lower = q.cat === 'min' || q.cat === 'dim';
    if (lower) num = num.toLowerCase();
    let acc = di.acc === 0 ? '' : di.acc > 0 ? '♯' : '♭';
    // In minor keys the raised leading tone is written VII (vii°), not ♯VII
    if (key.mode === 'minor' && mod(chord.root - key.tonic, 12) === 11 && q.cat === 'dim') acc = '';
    let sfx = '';
    switch (chord.q) {
      case 'maj': case 'min': sfx = ''; break;
      case 'dim': sfx = '°'; break;
      case 'aug': sfx = '+'; break;
      case 'dim7': sfx = '°7'; break;
      case 'm7b5': sfx = 'ø7'; break;
      case 'm7': case 'm9': case 'm11': case 'm13': case 'm6': case 'madd9': case 'mb6': case 'm6/9': sfx = q.suffix.replace(/^m/, ''); break;
      case 'mMaj7': sfx = '(maj7)'; break;
      default: sfx = q.suffix;
    }
    let s = acc + num + sfx;
    if (chord.bass != null && chord.bass !== chord.root) {
      const pcs = chordPcs(chord); const idx = pcs.indexOf(chord.bass);
      const ic = mod(chord.bass - chord.root, 12);
      const isSeventh = pcs.length >= 4 && [10, 11, 9].includes(mod(q.iv[3], 12)) && !['6', 'm6', '69', 'm6/9', 'add9', 'madd9'].includes(chord.q);
      if (idx > 0 && (ic === 3 || ic === 4 || ic === 5 || ic === 2) && (idx === 1)) s = acc + num + (isSeventh ? sfx.replace(/7|9|13/, '') + '⁶₅' : sfx + '⁶');
      else if (idx > 0 && (ic === 6 || ic === 7 || ic === 8)) s = acc + num + (isSeventh ? sfx.replace(/7|9|13/, '') + '⁴₃' : sfx + '⁶₄');
      else if (idx > 0 && isSeventh && (ic === 10 || ic === 11 || ic === 9)) s = acc + num + sfx.replace(/7|9|13/, '') + '⁴₂';
      else {
        const bd = degreeInfo(chord.bass, key, null);
        s += '/' + (bd.acc > 0 ? '♯' : bd.acc < 0 ? '♭' : '') + ROMAN[bd.degree - 1];
      }
    }
    if (chord.roman) return chord.roman;
    return s;
  }

  // Harmonic function and device label for a chord in context (prev/next chords help: secondary dominants only
  // count when they resolve). Returns { fn: 'T'|'S'|'D'|'X', label, diatonic, borrowed, secondary, tritoneSub, mediant, passingDim }
  function analyze(chord, key, next, prev) {
    const q = Q[chord.q];
    const rel = mod(chord.root - key.tonic, 12);
    const sc = keyScale(key); const dia = sc.find(d => d.pc === chord.root);
    const pcs = chordPcs(chord);
    const scalePcs = new Set(sc.map(d => d.pc));
    if (key.mode === 'minor') { scalePcs.add(mod(key.tonic + 11, 12)); scalePcs.add(mod(key.tonic + 9, 12)); }
    const diatonicTones = pcs.filter(p => scalePcs.has(p)).length;
    const diatonic = !!dia && diatonicTones >= Math.min(pcs.length, 4) - (pcs.length > 4 ? 1 : 0);
    const out = { fn: 'X', label: romanNumeral(chord, key), diatonic, borrowed: false, secondary: null, tritoneSub: null, mediant: false, passingDim: false, backdoor: false, neapolitan: false, augSixth: false };
    const nextRel = next ? mod(next.root - key.tonic, 12) : null;
    const resolvesDownFifth = next && mod(chord.root - next.root, 12) === 7;
    const resolvesHalfDown = next && mod(chord.root - next.root, 12) === 1;
    const major = key.mode === 'major';
    // Primary functions
    if (rel === 0) out.fn = 'T';
    else if (rel === 7 && (q.cat === 'dom' || q.cat === 'maj' || q.cat === 'sus')) out.fn = 'D';
    else if (rel === 11 && q.cat === 'dim') out.fn = 'D';
    else if (rel === 5) out.fn = 'S';
    else if (rel === 2 && (q.cat === 'min' || q.cat === 'dim')) out.fn = 'S';
    else if (rel === 9 && q.cat === 'min' && major) out.fn = 'T';
    else if (rel === 4 && q.cat === 'min' && major) out.fn = 'T';
    else if (!major && rel === 3 && q.cat === 'maj') out.fn = 'T';
    else if (!major && rel === 8 && q.cat === 'maj') out.fn = 'S';
    else if (!major && rel === 10 && (q.cat === 'maj' || q.cat === 'dom')) out.fn = 'S';
    // Secondary dominants and tritone substitutes
    if (q.cat === 'dom' || (q.cat === 'maj' && !diatonic) || (q.cat === 'maj' && rel !== 0 && rel !== 5 && rel !== 7 && major)) {
      const target = mod(chord.root + 5, 12);
      const tDeg = sc.find(d => d.pc === target);
      if (tDeg && !(rel === 7) && (resolvesDownFifth || !next)) {
        const tChord = { root: target, q: 'maj' };
        const tRoman = ROMAN[tDeg.degree - 1];
        const tLower = major ? [2, 3, 6].includes(tDeg.degree) : [1, 4, 5].includes(tDeg.degree);
        out.secondary = 'V' + (q.cat === 'dom' ? '7' : '') + '/' + (tLower ? tRoman.toLowerCase() : tRoman);
        out.fn = 'D';
      }
      if (q.cat === 'dom' && resolvesHalfDown) {
        const tDeg2 = sc.find(d => d.pc === next.root);
        if (tDeg2) { const r = ROMAN[tDeg2.degree - 1]; const tLower = major ? [2, 3, 6].includes(tDeg2.degree) : [1, 4, 5].includes(tDeg2.degree); out.tritoneSub = 'sub V7/' + (tLower ? r.toLowerCase() : r); out.fn = 'D'; }
      }
      if (major && rel === 10 && q.cat === 'dom' && next && nextRel === 0) { out.backdoor = true; out.fn = 'D'; }
    }
    if (!diatonic && !out.secondary && !out.tritoneSub) {
      if (q.cat === 'dim' && !dia) { out.passingDim = true; out.fn = 'D'; }
      else if (major && [8, 10, 3, 1].includes(rel) && (q.cat === 'maj' || q.cat === 'dom' || q.cat === 'sus')) { out.borrowed = true; out.fn = rel === 1 ? 'S' : 'S'; if (rel === 1) out.neapolitan = true; }
      else if (major && rel === 5 && q.cat === 'min') { out.borrowed = true; out.fn = 'S'; }
      else if (major && rel === 2 && q.cat === 'dim') { out.borrowed = true; out.fn = 'S'; }
      else if (major && (rel === 4 || rel === 9 || rel === 8 || rel === 3) && q.cat === 'maj') { out.mediant = true; out.fn = 'X'; }
      else if (!major && (rel === 4 || rel === 9) && q.cat === 'maj') { out.mediant = true; }
      else if (!major && rel === 1) { out.borrowed = true; out.neapolitan = true; out.fn = 'S'; }
    }
    if (major && rel === 2 && (q.cat === 'maj' || q.cat === 'dom') && !out.secondary) out.fn = 'S'; // Lydian II
    return out;
  }

  // ---------- Chord identification from notes ----------
  // notes: array of MIDI numbers (or pitch classes) — bass = lowest. Returns best {root, q, bass, score, name}.
  const ID_QUALITIES = ['maj', 'min', 'dim', 'aug', 'sus4', 'sus2', 'add9', 'madd9', '6', 'm6', '69', '7', 'maj7', 'm7', 'mMaj7', 'm7b5', 'dim7', '7sus4', '9', 'maj9', 'm9', 'm11', '9sus4', '13', 'm13', '13sus4', 'maj7s11', 'maj9s11', 'maj13', '7b9', '7s9', '7s11', '7b13', '7alt', '7s5', '7b5', '13b9', '7s9s5', 'maj7s5', 'm6/9', '5'];
  function identify(notes, opts = {}) {
    if (!notes || !notes.length) return null;
    const sorted = notes.slice().sort((a, b) => a - b);
    const bassPc = opts.noBass ? -1 : mod(sorted[0], 12);
    const pcs = new Set(sorted.map(n => mod(n, 12)));
    const allowRootless = !!opts.rootless;
    let best = null;
    const cands = [];
    for (let root = 0; root < 12; root++) {
      for (const qid of ID_QUALITIES) {
        const q = Q[qid]; const tpl = q.iv.map(iv => mod(root + iv, 12));
        const tplSet = new Set(tpl);
        const essSet = new Set([...ess(qid)].map(iv => mod(root + iv, 12)));
        let score = 0;
        let matched = 0, extra = 0, missingEss = 0, missing = 0;
        for (const p of pcs) { if (tplSet.has(p)) matched++; else extra++; }
        for (const p of tplSet) if (!pcs.has(p)) { missing++; if (essSet.has(p)) missingEss++; }
        if (missingEss > (allowRootless && !pcs.has(root) ? 1 : 0)) continue;
        if (!pcs.has(root) && !allowRootless) continue;
        if (matched < Math.min(2, pcs.size)) continue;
        score = matched * 1.0 - extra * 1.6 - missing * 0.55 - missingEss * 1.2;
        // prefer the simplest full explanation
        score -= q.iv.length * 0.04;
        if (qid === 'm7b5') score -= 0.05;
        if (bassPc >= 0) { if (root === bassPc) score += 0.9; else if (tplSet.has(bassPc)) score += 0.25; else score -= 0.6; }
        // sus/add9 vs 9: a 9 with no 7th is add9
        cands.push({ root, q: qid, score, matched, extra, missing });
      }
    }
    if (!cands.length) return null;
    cands.sort((a, b) => b.score - a.score);
    best = cands[0];
    const chord = { root: best.root, q: best.q, bass: (bassPc >= 0 && bassPc !== best.root) ? bassPc : null, score: best.score, extra: best.extra, missing: best.missing };
    return chord;
  }

  // Negative harmony (Levy / Collier): reflect every pitch class across the axis between tonic and dominant.
  function negative(chord, key) {
    const refl = (p) => mod(2 * key.tonic + 7 - p, 12);
    const pcs = chordPcs(chord).map(refl);
    const id = identify(pcs.map(p => p + 60), { noBass: true });
    if (!id) return null;
    // an inverted input keeps an inverted output (its bass reflected), a root-position input stays in root position
    const bass = chord.bass != null && chord.bass !== chord.root ? refl(chord.bass) : null;
    return { root: id.root, q: id.q, bass: bass != null && bass !== id.root ? bass : null };
  }

  // Interval helpers for moods and voicings
  const rootMotion = (a, b) => mod(b.root - a.root, 12);

  return {
    mod, Q, ess, toneRoles, chordToneNames, LETTERS, LETTER_PC, FLAT, SHARP,
    keyScale, keyName, keyShort, spellPc, pcName, bassName, chordSymbol, chordParts, parseChord, parseProgression, parseNoteName,
    chordPcs, chordPcSet, sameChord, sharedTones, findKey, romanNumeral, analyze, degreeInfo, identify, negative, rootMotion,
    MAJOR_TONIC_NAME, MINOR_TONIC_NAME, ID_QUALITIES,
  };
})();
if (typeof module !== 'undefined') module.exports = Theory;
