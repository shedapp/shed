// voicing.js — piano voicings by style with least-motion voice leading, guitar shape search, and the drawings:
// keyboard strips with voice-leading lines, and fretboard grids.
const Voicing = (() => {
  const T = typeof Theory !== 'undefined' ? Theory : require('./theory.js');
  const mod = T.mod;

  // ---------- chord tones by role ----------
  // Returns the semitone offset (0..23) of a role in this chord's quality, or null when the chord has no such tone.
  function toneOffset(chord, role) {
    const iv = T.Q[chord.q].iv; const has = (x) => iv.some(v => mod(v, 12) === x);
    const hasExt = (x) => iv.includes(x);
    switch (role) {
      case '1': return 0;
      case '3': if (has(4)) return 4; if (has(3)) return 3; if (has(5) && !has(4) && !has(3)) return 5; if (has(2) && chord.q === 'sus2') return 2; return null;
      case '5': if (has(7)) return 7; if (has(6)) return 6; if (has(8)) return 8; return null;
      case '7': if (has(10)) return 10; if (has(11)) return 11; if (has(9) && !hasExt(21)) return 9; return null; // 6th stands in for the 7th in 6 chords
      case '9': if (hasExt(14)) return 14; if (hasExt(13)) return 13; if (hasExt(15)) return 15; if (has(2) && chord.q === 'sus2') return 14; return null;
      case '11': if (hasExt(17)) return 17; if (hasExt(18)) return 18; if (has(5) && T.Q[chord.q].cat === 'sus') return 17; return null;
      case '13': if (hasExt(21)) return 21; if (hasExt(20)) return 20; if (has(9) && hasExt(14)) return 21; return null;
      case '4': return has(5) ? 5 : null;
    }
    return null;
  }
  const roleName = (chord, off) => T.toneRoles(chord.q)[T.Q[chord.q].iv.findIndex(v => mod(v, 12) === mod(off, 12))] || '';

  // ---------- right-hand templates (roles low → high) ----------
  const RH = {
    rich: { // neo-soul, gospel, jazz, lo-fi: rootless four-note shapes, extensions on top
      maj: [['3', '5', '7', '9'], ['7', '9', '3', '5'], ['5', '7', '9', '3'], ['3', '7', '9', '5'], ['3', '11', '7', '9'], ['7', '9', '3', '11'], ['3', '11', '7', '1'], ['7', '1', '3', '11'], ['3', '5', '7', '1'], ['7', '1', '3', '5']],
      min: [['3', '5', '7', '9'], ['7', '9', '3', '5'], ['7', '9', '11', '5'], ['3', '7', '9', '11'], ['3', '5', '7', '1'], ['7', '1', '3', '5']],
      dom: [['3', '13', '7', '9'], ['7', '9', '3', '13'], ['3', '7', '9', '13'], ['7', '3', '13', '9']],
      sus: [['4', '5', '7', '9'], ['7', '9', '4', '13'], ['4', '7', '9', '13'], ['9', '4', '7', '13']],
      dim: [['3', '5', '7', '1'], ['5', '7', '1', '3'], ['7', '1', '3', '5']],
      aug: [['3', '5', '1', '7'], ['5', '1', '3']],
    },
    close: { // pop, film, classical: the chord's own tones in close position; triads keep the root
      any: 'rotations',
    },
  };
  // Realize a role list into a pitch-class list (semitone offsets from root); skip roles the chord lacks.
  function realize(chord, roles) {
    const offs = [];
    for (const r of roles) { const o = toneOffset(chord, r); if (o == null) continue; if (!offs.some(x => mod(x, 12) === mod(o, 12))) offs.push(mod(o, 12)); }
    return offs;
  }
  // Stack pitch classes upward from a starting offset, in the given order (each next note above the previous).
  function stackUp(offsInOrder, rootPc, lowestMidi) {
    const out = []; let cur = null;
    for (const off of offsInOrder) {
      const pc = mod(rootPc + off, 12);
      let n = cur == null ? lowestMidi + mod(pc - lowestMidi, 12) : cur + 1 + mod(pc - (cur + 1), 12);
      out.push(n); cur = n;
    }
    return out;
  }

  function candidatesRH(chord, style) {
    const cat = T.Q[chord.q].cat;
    const pcsAll = T.Q[chord.q].iv.map(v => mod(v, 12));
    const upper = chord.bass != null && chord.bass !== chord.root && !pcsAll.includes(chord.bass); // hybrid: upper chord over a foreign bass
    const rich = style === 'neosoul' || style === 'gospel' || style === 'jazz' || style === 'lofi';
    let lists = [];
    if (rich && pcsAll.length >= 4) {
      const fam = cat === 'maj' ? 'maj' : cat === 'min' ? 'min' : cat === 'dom' ? 'dom' : cat === 'sus' ? 'sus' : cat === 'dim' ? 'dim' : 'aug';
      for (const roles of RH.rich[fam]) { const offs = realize(chord, roles); if (offs.length >= 3) lists.push(offs); }
      // a 6/9 or add9 chord: keep the 9 on top in a few shapes
      if (chord.q === '69' || chord.q === 'm6/9') lists.push([cat === 'min' ? 3 : 4, 9, 2, 7]);
      // every shape must carry the chord's extensions (a maj9 without its 9 is not a maj9)
      const exts = T.Q[chord.q].iv.filter(v => v >= 12).map(v => mod(v, 12));
      const full = lists.filter(offs => exts.every(e => offs.includes(e)));
      if (full.length) lists = full;
    }
    if (!lists.length) {
      // close position: all tones (root included for triads/add9/sus; dropped for 7ths and larger when the bass carries it)
      let offs = pcsAll.slice();
      if (pcsAll.length >= 4 && chord.bass == null && (rich || style === 'classical')) offs = offs.filter(o => o !== 0);
      if (pcsAll.length >= 5) { // keep it to four notes: drop the 5th, then the root
        offs = offs.filter(o => o !== 7 && o !== 6); if (offs.length > 4) offs = offs.filter(o => o !== 0);
      }
      if (upper) offs = pcsAll.slice();
      for (let r = 0; r < offs.length; r++) lists.push(offs.slice(r).concat(offs.slice(0, r)));
      if (style === 'film' && offs.length === 3) lists.push([offs[0], offs[2], offs[1]]); // open spacing: root, fifth, tenth
    }
    // realize in two registers each
    const out = [];
    for (const offs of lists) for (const low of [55, 60, 65]) {
      const notes = stackUp(offs, chord.root, low);
      if (notes[notes.length - 1] > 86 || notes[0] < 52) continue;
      out.push(notes);
    }
    return out;
  }

  function leftHand(chord, style, rhLow) {
    const bassPc = chord.bass != null ? chord.bass : chord.root;
    // bass register: below the right hand, between E1 and ~F3
    let b = 36 + mod(bassPc - 36, 12); if (b > 48) b -= 12; if (b < 34) b += 12;
    const notes = [b];
    const hybrid = chord.bass != null && !T.chordPcs(chord).includes(chord.bass);
    if (hybrid) return notes;
    const fifth = toneOffset(chord, '5'), seventh = toneOffset(chord, '7'), third = toneOffset(chord, '3');
    if (style === 'gospel' || style === 'film') { if (fifth != null && chord.bass == null) notes.push(b + fifth); }
    else if (style === 'neosoul' || style === 'jazz' || style === 'lofi') { if (chord.bass == null && seventh != null && T.Q[chord.q].iv.length >= 4) notes.push(b + seventh); else if (chord.bass == null && fifth != null) notes.push(b + fifth); }
    else if (style === 'pop') { if (chord.bass == null && T.Q[chord.q].iv.length <= 4 && fifth != null) notes.push(b + fifth); }
    return notes.filter((n, i) => i === 0 || n < rhLow - 2).sort((a, b2) => a - b2);
  }

  // cost of moving from voicing A to B (right hands), voices paired by order
  function motionCost(A, B) {
    if (!A || !A.length) return 0;
    const a = A.slice().sort((x, y) => x - y), b = B.slice().sort((x, y) => x - y);
    let cost = 0;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = a[Math.min(i, a.length - 1)], y = b[Math.min(i, b.length - 1)];
      const d = Math.abs(x - y); cost += d; if (d === 0) cost -= 0.6;
    }
    const topD = Math.abs(a[a.length - 1] - b[b.length - 1]); if (topD > 2) cost += (topD - 2) * 1.2; // the top voice holds or steps
    cost += Math.abs(a.length - b.length) * 1.5; // keep the hand the same size from chord to chord
    const meanD = Math.abs(a.reduce((s, v) => s + v, 0) / a.length - b.reduce((s, v) => s + v, 0) / b.length); cost += meanD * 0.3;
    return cost;
  }
  function rangeCost(rh, span, want) {
    let c = 0; const lo = rh[0], hi = rh[rh.length - 1];
    if (want && rh.length < want) c += (want - rh.length) * 1.2;
    if (hi > 81) c += (hi - 81) * 0.8; if (lo < 55) c += (55 - lo) * 0.8;
    const width = hi - lo; const max = span === 'small' ? 14 : 16; if (width > max) c += (width - max) * 2;
    const center = (lo + hi) / 2; c += Math.abs(center - 67) * 0.08;
    return c;
  }

  // Voice a whole progression (array of chords) for piano. Returns [{chord, lh, rh, all, moves}] where moves pairs
  // right-hand voices with the previous chord: [{from, to, delta}].
  function voiceProgression(prog, key, style, opts = {}) {
    const out = []; let prevRH = null;
    prog.forEach((chord, i) => {
      const cands = candidatesRH(chord, style);
      const want = Math.min(4, Math.max(...cands.map(c => c.length)));
      let best = null, bestCost = Infinity;
      const mel = chord.melody && chord.melody.length ? chord.melody.map(m => typeof m === 'number' ? m : m.note) : null;
      const ceiling = mel ? Math.min(...mel) : null;
      for (const rh of cands) {
        let c = motionCost(prevRH, rh) + rangeCost(rh, opts.span, want);
        if (ceiling != null) { const top = rh[rh.length - 1]; if (top > ceiling) c += (top - ceiling) * 1.5 + 3; const gap = ceiling - top; if (gap > 10) c += (gap - 10) * 0.4; }
        if (c < bestCost) { bestCost = c; best = rh; }
      }
      if (!best) best = stackUp(T.chordPcs(chord).map(p => mod(p - chord.root, 12)), chord.root, 60);
      const lh = leftHand(chord, style, best[0]);
      const moves = prevRH ? pairMoves(prevRH, best) : [];
      out.push({ chord, lh, rh: best, all: lh.concat(best), moves, names: noteNames(chord, key, lh.concat(best)) });
      prevRH = best;
    });
    return out;
  }
  function pairMoves(A, B) {
    const a = A.slice().sort((x, y) => x - y), b = B.slice().sort((x, y) => x - y);
    const n = Math.max(a.length, b.length), res = [];
    for (let i = 0; i < n; i++) { const from = a[Math.min(i, a.length - 1)], to = b[Math.min(i, b.length - 1)]; res.push({ from, to, delta: to - from }); }
    return res;
  }
  // Spelled names for a voicing's notes (chord-relative spelling)
  function noteNames(chord, key, notes) {
    const tones = T.chordToneNames(chord, key);
    return notes.map(n => { const pc = mod(n, 12); const t = tones.find(x => x.pc === pc); const name = t ? t.name : (chord.bass === pc ? T.pcName(pc, key) : T.pcName(pc, key)); return { midi: n, name, role: t ? t.role : (chord.bass === pc ? 'bass' : '') }; });
  }
  const midiName = (n, key) => T.pcName(mod(n, 12), key) + (Math.floor(n / 12) - 1);

  // ---------- Guitar ----------
  const TUNING = [40, 45, 50, 55, 59, 64]; // E A D G B E
  function guitarShape(chord, style, prev, opts = {}) {
    const tuning = opts.tuning || TUNING;
    const capo = opts.capo || 0;
    const pcs = T.chordPcs(chord);
    const bassPc = chord.bass != null ? chord.bass : chord.root;
    const ess = [...T.ess(chord.q)].map(iv => mod(chord.root + iv, 12));
    const exts = T.Q[chord.q].iv.filter(v => v >= 12).map(v => mod(chord.root + v, 12));
    const fifth = toneOffset(chord, '5'); const fifthPc = fifth != null ? mod(chord.root + fifth, 12) : -1;
    const rich = style === 'jazz' || style === 'neosoul' || style === 'gospel' || style === 'lofi';
    const allowed = new Set(pcs); if (chord.bass != null) allowed.add(chord.bass);
    let best = null, bestScore = -Infinity;
    const prevPos = prev ? prev.position : null;
    const tryRequire = (requireRoot, requireFifth) => {
      for (let pos = 0; pos <= 12; pos++) {
        const span = pos >= 7 ? 4 : 3;
        const choices = tuning.map((open, si) => {
          const list = [-1];
          if (allowed.has(mod(open, 12))) list.push(0);
          for (let f = Math.max(1, pos); f <= pos + span; f++) if (allowed.has(mod(open + f, 12))) list.push(f);
          return list;
        });
        const rec = (si, frets) => {
          if (si === 6) { evaluate(frets.slice(), pos); return; }
          for (const f of choices[si]) { frets.push(f); rec(si + 1, frets); frets.pop(); }
        };
        rec(0, []);
      }
      function evaluate(frets, pos) {
        const sounding = frets.map((f, i) => f >= 0 ? { s: i, f, midi: tuning[i] + f, pc: mod(tuning[i] + f, 12) } : null).filter(Boolean);
        if (sounding.length < 3) return;
        // no muted string between sounding strings (one allowed for rich styles, with a penalty)
        let inner = 0; for (let i = sounding[0].s; i <= sounding[sounding.length - 1].s; i++) if (frets[i] < 0) inner++;
        if (inner > (rich ? 1 : 0)) return;
        if (sounding[0].pc !== bassPc && requireRoot) return;
        const fretted = sounding.filter(x => x.f > 0);
        const opens = sounding.filter(x => x.f === 0).length;
        let barre = false;
        if (fretted.length) {
          const fs = fretted.map(x => x.f); const lo = Math.min(...fs), hi = Math.max(...fs);
          if (hi - lo > (pos >= 7 ? 4 : 3)) return;
          const atLoS = fretted.filter(x => x.f === lo).map(x => x.s); const atLo = atLoS.length;
          const adjacentPair = atLo === 2 && Math.abs(atLoS[0] - atLoS[1]) === 1;
          // two or more notes on the same (lowest) fret need a barre unless they sit on adjacent strings (one flattened finger)
          barre = atLo >= 2 && (fretted.length > 4 || !adjacentPair);
          const fingers = barre ? fretted.length - atLo + 1 : fretted.length;
          if (fingers > 4) return;
          if (barre) { // a barre covers every string between its ends: nothing inside it rings open or is muted
            const b0 = Math.min(...atLoS), b1 = Math.max(...atLoS);
            for (let si = b0; si <= b1; si++) if (frets[si] < lo) return;
          }
          if (opens && lo > 3) return; // open strings only make sense near the nut
        }
        const have = new Set(sounding.map(x => x.pc));
        for (const e of ess) if (!have.has(e) && !(e === chord.root && !requireRoot)) return;
        let score = 0;
        score += sounding.length * 1.0;
        for (const e of exts) score += have.has(e) ? 3 : -2.5;
        if (fifthPc >= 0) score += have.has(fifthPc) ? 0.6 : (requireFifth ? -10 : -0.4);
        if (!have.has(chord.root)) score -= 2;
        score -= inner * (rich ? 1.5 : 3);
        if (barre) score -= 1.0;
        const fretsUsed = fretted.map(x => x.f);
        score -= fretted.length * 0.35;
        if (fretsUsed.length) score -= (Math.max(...fretsUsed) - Math.min(...fretsUsed)) * 0.4;
        const position = fretsUsed.length ? Math.min(...fretsUsed) : 0;
        if (position > 12) score -= 4;
        if (style === 'pop' || style === 'film' || style === 'classical') { score += sounding.filter(x => x.f === 0).length * 0.6; if (sounding.length >= 5) score += 1.2; if (position > 7) score -= 2; }
        if (rich) { if (sounding.length === 4) score += 1.0; if (sounding.length >= 6) score -= 1.5; if (sounding[sounding.length - 1].s === 5 || sounding[sounding.length - 1].s === 4) score += 0.3; }
        // doubled tones beyond the root cost a little; extension on top is a bonus for rich styles
        const counts = {}; sounding.forEach(x => counts[x.pc] = (counts[x.pc] || 0) + 1); for (const [pc, n] of Object.entries(counts)) if (n > 1 && +pc !== chord.root) score -= 0.5 * (n - 1);
        if (rich && exts.includes(sounding[sounding.length - 1].pc)) score += 0.8;
        if (prevPos != null) score -= Math.min(6, Math.abs(position - prevPos)) * 0.7;
        if (prev && prev.frets) { let common = 0; for (let i = 0; i < 6; i++) if (frets[i] >= 0 && frets[i] === prev.frets[i]) common++; score += common * 0.3; }
        if (score > bestScore) { bestScore = score; best = { frets, position, sounding }; }
      }
    };
    tryRequire(true, false);
    if (!best && rich) tryRequire(false, false);
    if (!best) { // last resort: drop the bass requirement
      const saved = chord.bass; tryRequire(false, false);
    }
    if (!best) return null;
    const baseFret = best.position <= 1 ? 1 : best.position;
    const tones = T.chordToneNames(chord, key0(opts));
    const strings = best.frets.map((f, i) => f < 0 ? null : (() => { const pc = mod(TUNING[i] + f, 12); const t = tones.find(x => x.pc === pc); return { fret: f, pc, name: t ? t.name : T.pcName(pc, key0(opts)), role: t ? t.role : (pc === chord.bass ? 'bass' : '') }; })());
    return { frets: best.frets, baseFret, position: best.position, strings, rootless: !best.sounding.some(x => x.pc === chord.root), fingers: fingerNumbers(best.frets) };
  }
  const key0 = (opts) => opts.key || { tonic: 0, mode: 'major' };
  function fingerNumbers(frets) {
    const fretted = frets.map((f, s) => ({ f, s })).filter(x => x.f > 0);
    if (!fretted.length) return frets.map(() => 0);
    const lo = Math.min(...fretted.map(x => x.f));
    const atLo = fretted.filter(x => x.f === lo);
    const barre = atLo.length >= 2 && fretted.length > 4;
    const out = frets.map(() => 0);
    let order = fretted.slice().sort((a, b) => a.f - b.f || a.s - b.s);
    let finger = 1;
    if (barre) { atLo.forEach(x => out[x.s] = 1); order = order.filter(x => x.f !== lo); finger = 2; }
    for (const x of order) { out[x.s] = Math.min(4, finger); finger++; }
    return out;
  }
  function guitarProgression(prog, key, style, opts = {}) {
    const out = []; let prev = null;
    for (const chord of prog) { const sh = guitarShape(chord, style, prev, Object.assign({}, opts, { key })); out.push({ chord, shape: sh }); if (sh) prev = sh; }
    return out;
  }

  // ---------- Drawings ----------
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const isBlack = (n) => [1, 3, 6, 8, 10].includes(mod(n, 12));
  // Key range for a set of voicings: from the C at or below the lowest note to the B at or above the highest.
  function keyRange(voicings, twoHands) {
    let lo = Infinity, hi = -Infinity;
    for (const v of voicings) { const ns = twoHands ? v.all : v.rh; for (const n of ns) { lo = Math.min(lo, n); hi = Math.max(hi, n); } }
    if (!isFinite(lo)) { lo = 60; hi = 72; }
    lo = Math.floor((lo - 1) / 12) * 12; hi = Math.ceil((hi + 2) / 12) * 12 - 1;
    while (hi - lo < 23) hi += 12;
    return { lo, hi };
  }
  // x positions: white keys evenly spaced; black keys between
  function keyGeometry(lo, hi, width) {
    const whites = []; for (let n = lo; n <= hi; n++) if (!isBlack(n)) whites.push(n);
    const w = width / whites.length;
    const x = {}; whites.forEach((n, i) => x[n] = i * w);
    for (let n = lo; n <= hi; n++) if (isBlack(n)) x[n] = x[n - 1] + w * 0.62;
    return { w, x, whites };
  }
  // One keyboard strip. lit: [{midi, color, hand:'lh'|'rh', name}]
  function stripSVG(v, range, opts = {}) {
    const W = opts.width || 320, H = opts.height || 64;
    const { w, x } = keyGeometry(range.lo, range.hi, W);
    const bw = w * 0.6, bh = H * 0.62;
    const lit = new Map();
    const twoHands = opts.twoHands;
    (twoHands ? v.lh : []).forEach(n => lit.set(n, 'lh')); v.rh.forEach(n => lit.set(n, 'rh'));
    const names = new Map(v.names.map(t => [t.midi, t.name]));
    let s = `<svg class="strip" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" aria-label="${esc(opts.label || 'keyboard')}">`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="var(--key-white)"/>`;
    for (let n = range.lo; n <= range.hi; n++) if (!isBlack(n)) {
      const l = lit.get(n);
      const fill = l === 'rh' ? (opts.color || 'var(--accent)') : l === 'lh' ? 'var(--key-lh)' : 'var(--key-white)';
      s += `<rect x="${x[n].toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${H}" fill="${fill}" stroke="var(--key-line)" stroke-width="1"/>`;
      if (l) s += `<text x="${(x[n] + w / 2).toFixed(2)}" y="${H - 5}" text-anchor="middle" font-size="${Math.min(11, w * 0.9)}" font-family="var(--mono)" font-weight="600" fill="${l === 'rh' ? 'var(--key-ink)' : 'var(--fg)'}">${esc(names.get(n) || '')}</text>`;
      else if (mod(n, 12) === 0) s += `<text x="${(x[n] + w / 2).toFixed(2)}" y="${H - 5}" text-anchor="middle" font-size="${Math.min(9, w * 0.7)}" font-family="var(--mono)" fill="var(--key-c)">C${Math.floor(n / 12) - 1}</text>`;
    }
    for (let n = range.lo; n <= range.hi; n++) if (isBlack(n)) {
      const l = lit.get(n);
      const fill = l === 'rh' ? (opts.color || 'var(--accent)') : l === 'lh' ? 'var(--key-lh)' : 'var(--key-black)';
      s += `<rect x="${(x[n] - bw / 2).toFixed(2)}" y="0" width="${bw.toFixed(2)}" height="${bh}" rx="2" fill="${fill}" stroke="var(--key-line)" stroke-width="1"/>`;
      if (l) s += `<text x="${x[n].toFixed(2)}" y="${bh - 5}" text-anchor="middle" font-size="${Math.min(10, bw * 0.95)}" font-family="var(--mono)" font-weight="600" fill="${l === 'rh' ? 'var(--key-ink)' : 'var(--fg)'}">${esc(names.get(n) || '')}</text>`;
    }
    s += '</svg>';
    return s;
  }
  // Connector between two strips: lines from each right-hand voice to its destination. Dashed = held.
  function connectorSVG(prev, cur, range, opts = {}) {
    const W = opts.width || 320, H = opts.height || 26;
    const { w, x } = keyGeometry(range.lo, range.hi, W);
    const cx = (n) => (x[n] + (isBlack(n) ? 0 : w / 2)).toFixed(2);
    let s = `<svg class="conn" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" aria-hidden="true">`;
    for (const m of cur.moves) {
      const held = m.delta === 0;
      s += `<line x1="${cx(m.from)}" y1="0" x2="${cx(m.to)}" y2="${H}" stroke="${held ? 'var(--muted)' : (opts.color || 'var(--accent)')}" stroke-width="${held ? 1.2 : 1.8}" ${held ? 'stroke-dasharray="3 3"' : ''} stroke-linecap="round"/>`;
      if (!held && opts.labels !== false) s += `<text x="${((+cx(m.from) + +cx(m.to)) / 2).toFixed(1)}" y="${H / 2 + 3.5}" text-anchor="middle" font-size="9" font-family="var(--mono)" fill="var(--muted)">${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}</text>`;
    }
    s += '</svg>';
    return s;
  }
  // Fretboard grid for a shape.
  function fretboardSVG(shape, opts = {}) {
    const W = opts.width || 120, H = opts.height || 150;
    const color = opts.color || 'var(--accent)';
    if (!shape) return `<svg class="fret" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="var(--body)">no grip</text></svg>`;
    const padL = 18, padR = 10, padT = 26, padB = 22;
    const gw = W - padL - padR, gh = H - padT - padB;
    const sx = (i) => padL + gw * i / 5; const fy = (f) => padT + gh * (f - 0.5) / 5; // f: 1..5 within the window
    const base = shape.baseFret;
    let s = `<svg class="fret" viewBox="0 0 ${W} ${H}" width="100%" aria-label="${esc(opts.label || 'guitar chord')}">`;
    // nut or fret number
    if (base === 1) s += `<rect x="${padL - 1}" y="${padT - 3}" width="${gw + 2}" height="4" rx="1" fill="var(--fg)"/>`;
    else s += `<text x="${padL - 6}" y="${fy(1) + 4}" text-anchor="end" font-size="10" font-family="var(--mono)" fill="var(--muted)">${base}</text>`;
    for (let f = 0; f <= 5; f++) s += `<line x1="${padL}" y1="${padT + gh * f / 5}" x2="${padL + gw}" y2="${padT + gh * f / 5}" stroke="var(--key-line)" stroke-width="1"/>`;
    for (let i = 0; i < 6; i++) s += `<line x1="${sx(i)}" y1="${padT}" x2="${sx(i)}" y2="${padT + gh}" stroke="var(--fg)" stroke-opacity="${0.35 + i * 0.1}" stroke-width="${1.6 - i * 0.15}"/>`;
    // barre
    const fretted = shape.frets.map((f, i) => ({ f, i })).filter(x => x.f > 0);
    if (fretted.length) {
      const lo = Math.min(...fretted.map(x => x.f)); const at = fretted.filter(x => x.f === lo);
      if (at.length >= 2 && fretted.length > 4) { const a = Math.min(...at.map(x => x.i)), b = Math.max(...at.map(x => x.i)); s += `<rect x="${sx(a) - 7}" y="${fy(lo - base + 1) - 7}" width="${sx(b) - sx(a) + 14}" height="14" rx="7" fill="${color}" opacity="0.9"/>`; }
    }
    shape.frets.forEach((f, i) => {
      if (f < 0) s += `<text x="${sx(i)}" y="${padT - 9}" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--muted)">×</text>`;
      else if (f === 0) s += `<circle cx="${sx(i)}" cy="${padT - 12}" r="4" fill="none" stroke="var(--fg)" stroke-width="1.4"/>`;
      else { const rel = f - base + 1; s += `<circle cx="${sx(i)}" cy="${fy(rel)}" r="7.5" fill="${color}"/>`; if (opts.fingers && shape.fingers && shape.fingers[i]) s += `<text x="${sx(i)}" y="${fy(rel) + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" font-family="var(--body)" fill="var(--key-ink)">${shape.fingers[i]}</text>`; }
      const st = shape.strings[i];
      s += `<text x="${sx(i)}" y="${H - 7}" text-anchor="middle" font-size="9.5" font-family="var(--mono)" fill="${st ? 'var(--fg)' : 'var(--key-line)'}">${st ? esc(st.name) : '·'}</text>`;
    });
    s += '</svg>';
    return s;
  }

  return { toneOffset, candidatesRH, voiceProgression, guitarShape, guitarProgression, keyRange, stripSVG, connectorSVG, fretboardSVG, TUNING, midiName, noteNames, motionCost };
})();
if (typeof module !== 'undefined') module.exports = Voicing;
