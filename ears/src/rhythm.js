/* ============================================================
   EARS — Rhythm engine: cells, meters, pattern generation, distractors,
   playback schedule, tap scoring.
   ============================================================ */
(function (E) {
  const BASE = { w: 480, h: 240, q: 120, e: 60, s: 30, t: 15 };
  let tupCounter = 0;
  function parseCell(str) {
    const toks = str.trim().split(/\s+/); const evs = []; let tup = null;
    for (let t of toks) {
      if (t[0] === '{') { const m = t.slice(1).split(':'); tup = { n: +m[0], of: +m[1], id: ++tupCounter }; continue; }
      let closes = false; if (t.endsWith('}')) { closes = true; t = t.slice(0, -1); }
      let tie = false; if (t.endsWith('~')) { tie = true; t = t.slice(0, -1); }
      let rest = false; if (t.endsWith('r')) { rest = true; t = t.slice(0, -1); }
      let dots = 0; while (t.endsWith('.')) { dots++; t = t.slice(0, -1); }
      const base = BASE[t]; if (!base) throw new Error('bad token ' + t + ' in ' + str);
      let d = base * (dots === 0 ? 1 : dots === 1 ? 1.5 : 1.75);
      if (tup) d = d * tup.of / tup.n;
      evs.push({ nv: base, dots, rest, tie, tup: tup ? { n: tup.n, of: tup.of } : null, tupId: tup ? tup.id : undefined, d });
      if (closes) tup = null;
    }
    return { evs, ticks: evs.reduce((a, e) => a + e.d, 0) };
  }

  // fam: 's' simple (groups of 120), 'c' compound (180), 'h' half-beat (240), 'any'
  const CELL_DEFS = [
    ['q', 1, 's'], ['e e', 1, 's'], ['qr', 1, 's'], ['s s s s', 1, 's'], ['e s s', 1, 's'], ['s s e', 1, 's'],
    ['h', 1, 's'], ['h.', 1, 'any'], ['w', 1, 's'], ['hr', 1, 's'],
    ['e. s', 2, 's'], ['s e.', 2, 's'], ['s e s', 2, 's'], ['er e', 2, 's'], ['e er', 2, 's'], ['q. e', 2, 's'], ['e q e', 2, 's'],
    ['e e~', 2, 's'], ['q~', 2, 's'], ['sr s e', 2, 's'], ['e sr s', 2, 's'], ['q. e~', 2, 's'],
    ['{3:2 e e e}', 3, 's'], ['{3:2 q q q}', 3, 's'], ['s e s~', 3, 's'], ['e s s~', 3, 's'], ['sr e s', 3, 's'], ['s e sr', 3, 's'],
    ['s s sr s', 3, 's'], ['sr s s s', 3, 's'], ['e. s~', 3, 's'], ['s s e~', 3, 's'], ['s s s s~', 3, 's'],
    ['q.. s', 4, 's'], ['e. e. e', 4, 's'], ['{3:2 e e er}', 4, 's'], ['{3:2 er e e}', 4, 's'], ['{3:2 q e}', 4, 's'], ['{3:2 e q}', 4, 's'], ['e e. s', 4, 's'],
    ['{5:4 s s s s s}', 5, 's'], ['{6:4 s s s s s s}', 5, 's'], ['{3:2 e e e~}', 5, 's'], ['{3:2 q q q~}', 5, 's'],
    // compound (dotted-quarter beat)
    ['q.', 2, 'c'], ['e e e', 2, 'c'], ['q e', 2, 'c'], ['e q', 2, 'c'], ['e er e', 2, 'c'], ['q.r', 2, 'c'], ['e e e~', 2, 'c'], ['er e e', 2, 'c'],
    ['s s e e', 3, 'c'], ['e s s e', 3, 'c'], ['e e s s', 3, 'c'], ['e. e.', 3, 'c'], ['e. s e', 3, 'c'], ['{2:3 e e}', 3, 'c'], ['q.~', 3, 'c'], ['q e~', 3, 'c'], ['e er er', 3, 'c'],
    ['s s s s s s', 4, 'c'], ['e s s s s', 4, 'c'], ['s s s s e', 4, 'c'], ['e. s s s', 4, 'c'],
    ['{4:3 e e e e}', 5, 'c'], ['{2:3 e e~}', 5, 'c'],
    // half-note beat (3/2, 6/4)
    ['h', 4, 'h'], ['q q', 4, 'h'], ['q e e', 4, 'h'], ['e e q', 4, 'h'], ['e e e e', 4, 'h'], ['q. e', 4, 'h'], ['hr', 4, 'h'], ['q qr', 4, 'h'], ['e q e', 4, 'h'], ['{3:2 q q q}', 4, 'h'], ['h~', 4, 'h'], ['qr q', 4, 'h'],
    ['e q. ', 5, 'h'], ['q e e~', 5, 'h'], ['{3:2 h h h}', 5, 'h']
  ];
  const CELLS = CELL_DEFS.map(([s, lvl, fam]) => { const p = parseCell(s); return { id: s.trim(), lvl, fam, evs: p.evs, ticks: p.ticks, startsRest: p.evs[0].rest, endsTie: p.evs[p.evs.length - 1].tie, hasRest: p.evs.some(e => e.rest), hasTie: p.evs.some(e => e.tie), hasTup: p.evs.some(e => e.tup) }; });
  const CELL_BY_ID = {}; CELLS.forEach(c => CELL_BY_ID[c.id] = c);

  const METERS = {
    '4/4': { num: 4, den: 4, groups: [120, 120, 120, 120], fam: 's', lvl: 1, tps: 160 },
    '3/4': { num: 3, den: 4, groups: [120, 120, 120], fam: 's', lvl: 1, tps: 160 },
    '2/4': { num: 2, den: 4, groups: [120, 120], fam: 's', lvl: 1, tps: 160 },
    '6/8': { num: 6, den: 8, groups: [180, 180], fam: 'c', lvl: 2, tps: 200 },
    '12/8': { num: 12, den: 8, groups: [180, 180, 180, 180], fam: 'c', lvl: 3, tps: 200 },
    '5/4': { num: 5, den: 4, groups: [120, 120, 120, 120, 120], fam: 's', lvl: 4, tps: 170 },
    '7/4': { num: 7, den: 4, groups: [120, 120, 120, 120, 120, 120, 120], fam: 's', lvl: 4, tps: 170 },
    '3/2': { num: 3, den: 2, groups: [240, 240, 240], fam: 'h', lvl: 4, tps: 200 },
    '6/4': { num: 6, den: 4, groups: [240, 240, 240], fam: 'h', lvl: 4, tps: 200 },
    '5/8 (3+2)': { num: 5, den: 8, groups: [180, 120], fam: 'm', lvl: 4, tps: 210 },
    '5/8 (2+3)': { num: 5, den: 8, groups: [120, 180], fam: 'm', lvl: 4, tps: 210 },
    '7/8 (2+2+3)': { num: 7, den: 8, groups: [120, 120, 180], fam: 'm', lvl: 4, tps: 210 },
    '7/8 (3+2+2)': { num: 7, den: 8, groups: [180, 120, 120], fam: 'm', lvl: 4, tps: 210 },
    '7/8 (2+3+2)': { num: 7, den: 8, groups: [120, 180, 120], fam: 'm', lvl: 5, tps: 210 },
    '9/8 (3+3+3)': { num: 9, den: 8, groups: [180, 180, 180], fam: 'c', lvl: 5, tps: 210 },
    '9/8 (2+2+2+3)': { num: 9, den: 8, groups: [120, 120, 120, 180], fam: 'm', lvl: 5, tps: 210 },
    '10/8 (3+3+2+2)': { num: 10, den: 8, groups: [180, 180, 120, 120], fam: 'm', lvl: 5, tps: 210 },
    '11/8 (3+3+3+2)': { num: 11, den: 8, groups: [180, 180, 180, 120], fam: 'm', lvl: 5, tps: 210 },
    '11/8 (2+2+3+2+2)': { num: 11, den: 8, groups: [120, 120, 180, 120, 120], fam: 'm', lvl: 5, tps: 210 }
  };
  const LEVEL_METERS = {
    1: ['4/4', '4/4', '3/4', '2/4'],
    2: ['4/4', '4/4', '3/4', '6/8', '6/8', '2/4'],
    3: ['4/4', '4/4', '3/4', '6/8', '12/8', '6/8'],
    4: ['4/4', '6/8', '5/4', '7/4', '3/2', '6/4', '5/8 (3+2)', '5/8 (2+3)', '7/8 (2+2+3)', '7/8 (3+2+2)'],
    5: ['5/4', '7/8 (2+2+3)', '7/8 (3+2+2)', '7/8 (2+3+2)', '9/8 (3+3+3)', '9/8 (2+2+2+3)', '10/8 (3+3+2+2)', '11/8 (3+3+3+2)', '11/8 (2+2+3+2+2)', '6/4', '4/4', '6/8']
  };

  const rnd = E.U.rnd, choice = E.U.choice;

  function famForGroup(g) { return g === 120 ? 's' : g === 180 ? 'c' : g === 240 ? 'h' : null; }

  // cells that fit starting at group gi consuming k groups
  function fittingCells(meter, gi, level, prevEndsTie, isLastSlotOfPattern) {
    const out = [];
    const maxK = meter.groups.length - gi;
    for (let k = 1; k <= Math.min(4, maxK); k++) {
      const span = meter.groups.slice(gi, gi + k);
      const sum = span.reduce((a, b) => a + b, 0);
      const famSet = new Set(span.map(famForGroup));
      for (const c of CELLS) {
        if (c.ticks !== sum || c.lvl > level) continue;
        if (k === 1) { if (c.fam !== 'any' && c.fam !== famForGroup(span[0])) continue; }
        else {
          // multi-group cells: fam must match every group (same family) or be 'any'
          if (c.fam !== 'any' && (famSet.size !== 1 || !famSet.has(c.fam))) continue;
          if (meter.den === 8 && c.id === 'w') continue;
        }
        if (prevEndsTie && c.startsRest) continue;
        if (isLastSlotOfPattern && gi + k === meter.groups.length && c.endsTie) continue;
        out.push({ cell: c, k });
      }
    }
    return out;
  }
  function weightOf(c, k, level) {
    let w = 1;
    if (k > 1) w *= 0.35;
    if (c.hasRest) w *= 0.55;
    if (c.hasTie) w *= 0.6;
    if (c.hasTup) w *= 0.7;
    if (c.lvl === level) w *= 1.6;          // feature the new vocabulary
    if (c.lvl < level - 1) w *= 0.6;
    return w;
  }
  function weightedPick(arr, wfn) {
    const ws = arr.map(wfn); const tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot;
    for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }

  /* Generate a pattern. opts: {level, meters:[names], measures, target: cellId} */
  function generate(opts) {
    const level = opts.level || 1;
    const meterNames = opts.meters || LEVEL_METERS[level];
    let mname = choice(meterNames);
    const nMeas = opts.measures || 2;
    const measures = [];
    let changing = level >= 5 && Math.random() < 0.3;
    let prevEndsTie = false;
    let targetPlaced = !opts.target;
    for (let mi = 0; mi < nMeas; mi++) {
      if (changing && mi > 0) { const alt = meterNames.filter(n => n !== mname); if (alt.length) mname = choice(alt); }
      const meter = METERS[mname];
      const cells = []; let gi = 0;
      while (gi < meter.groups.length) {
        const last = mi === nMeas - 1;
        let fits = fittingCells(meter, gi, level, prevEndsTie, last);
        if (!fits.length) fits = fittingCells(meter, gi, 5, false, last).filter(f => f.k === 1);
        if (!fits.length) { // emergency: single beat quarter / dotted quarter / half
          const g = meter.groups[gi]; const id = g === 120 ? 'q' : g === 180 ? 'q.' : 'h';
          fits = [{ cell: CELL_BY_ID[id], k: 1 }];
        }
        let pick;
        if (!targetPlaced) {
          const tf = fits.filter(f => f.cell.id === opts.target);
          if (tf.length && (Math.random() < 0.6 || gi + tf[0].k >= meter.groups.length)) { pick = tf[0]; targetPlaced = true; }
        }
        if (!pick) pick = weightedPick(fits, f => weightOf(f.cell, f.k, level));
        cells.push({ id: pick.cell.id, gi, k: pick.k, evs: pick.cell.evs.map(e => Object.assign({}, e)) });
        prevEndsTie = pick.cell.endsTie;
        gi += pick.k;
      }
      measures.push({ meter: { num: meter.num, den: meter.den, groups: meter.groups.slice(), name: mname, tps: meter.tps }, cells });
    }
    if (!targetPlaced && CELL_BY_ID[opts.target]) forcePlace(measures, CELL_BY_ID[opts.target]);
    return finalize({ measures });
  }
  // Post-pass: splice the target cell over a run of consecutive cells with equal ticks
  function forcePlace(measures, target) {
    const cands = [];
    measures.forEach((m, mi) => {
      const groupsFam = m.meter.groups.map(famForGroup);
      for (let i = 0; i < m.cells.length; i++) {
        let ticks = 0, j = i;
        while (j < m.cells.length && ticks < target.ticks) { ticks += CELL_BY_ID[m.cells[j].id].ticks; j++; }
        if (ticks !== target.ticks) continue;
        const gi = m.cells[i].gi, k = m.cells.slice(i, j).reduce((a, c) => a + c.k, 0);
        const fams = new Set(groupsFam.slice(gi, gi + k));
        if (target.fam !== 'any' && (fams.size !== 1 || !fams.has(target.fam))) continue;
        const prevCell = i > 0 ? m.cells[i - 1] : (mi > 0 ? measures[mi - 1].cells[measures[mi - 1].cells.length - 1] : null);
        const nextCell = j < m.cells.length ? m.cells[j] : (mi < measures.length - 1 ? measures[mi + 1].cells[0] : null);
        if (prevCell && CELL_BY_ID[prevCell.id].endsTie && target.startsRest) continue;
        if (target.endsTie && (!nextCell || CELL_BY_ID[nextCell.id].startsRest)) continue;
        cands.push({ mi, i, j, gi, k });
      }
    });
    if (!cands.length) return false;
    const c = choice(cands); const m = measures[c.mi];
    m.cells.splice(c.i, c.j - c.i, { id: target.id, gi: c.gi, k: c.k, evs: target.evs.map(e => Object.assign({}, e)) });
    return true;
  }
  function finalize(p) {
    // re-stamp tuplet ids uniquely per cell instance and flatten events
    p.measures.forEach(m => { m.events = []; m.cells.forEach(c => { const tid = ++tupCounter; c.evs.forEach(e => { if (e.tup) e.tupId = tid + ':' + c.gi; m.events.push(e); }); }); });
    return p;
  }
  function clone(p) { return finalize({ measures: p.measures.map(m => ({ meter: Object.assign({}, m.meter, { groups: m.meter.groups.slice() }), cells: m.cells.map(c => ({ id: c.id, gi: c.gi, k: c.k, evs: c.evs.map(e => Object.assign({}, e)) })) })) }); }
  function serialize(p) { return p.measures.map(m => m.cells.map(c => c.id).join('|')).join('||'); }

  // Fill groups gi..gi+k-1 with (preferably several) cells
  function fillSpan(meter, gi, k, level, prevEndsTie, isLastMeasure, nextStartsRest) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const out = []; let g = gi; let pet = prevEndsTie; let okAll = true;
      while (g < gi + k) {
        let fits = fittingCells(meter, g, level, pet, isLastMeasure).filter(f => g + f.k <= gi + k && (k === 1 || f.k < k));
        if (g + 1 === gi + k && nextStartsRest) fits = fits.filter(f => !f.cell.endsTie);
        if (!fits.length) { okAll = false; break; }
        const pick = weightedPick(fits, f => weightOf(f.cell, f.k, level));
        out.push({ id: pick.cell.id, gi: g, k: pick.k, evs: pick.cell.evs.map(e => Object.assign({}, e)) });
        pet = pick.cell.endsTie; g += pick.k;
      }
      if (okAll) return out;
    }
    return null;
  }
  // Replace one cell with a different one of the same span; returns {pattern, measure, cellIndex} or null
  function mutate(p, level, avoidSerials) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const q = clone(p);
      const mi = rnd(0, q.measures.length - 1); const m = q.measures[mi];
      const ci = rnd(0, m.cells.length - 1); const c = m.cells[ci];
      const meter = METERS[m.meter.name];
      const prevCell = ci > 0 ? m.cells[ci - 1] : (mi > 0 ? q.measures[mi - 1].cells[q.measures[mi - 1].cells.length - 1] : null);
      const nextCell = ci < m.cells.length - 1 ? m.cells[ci + 1] : (mi < q.measures.length - 1 ? q.measures[mi + 1].cells[0] : null);
      const prevEndsTie = prevCell ? CELL_BY_ID[prevCell.id].endsTie : false;
      const isLast = !nextCell;
      let fits = fittingCells(meter, c.gi, Math.max(level, 2), prevEndsTie, isLast).filter(f => f.k === c.k && f.cell.id !== c.id);
      if (nextCell) fits = fits.filter(f => !(f.cell.endsTie && CELL_BY_ID[nextCell.id].startsRest));
      let newCells;
      if (fits.length && (c.k === 1 || Math.random() < 0.5)) {
        const pick = choice(fits).cell;
        newCells = [{ id: pick.id, gi: c.gi, k: c.k, evs: pick.evs.map(e => Object.assign({}, e)) }];
      } else if (c.k > 1) {
        // split the span into smaller cells
        newCells = fillSpan(meter, c.gi, c.k, Math.max(level, 2), prevEndsTie, isLast, nextCell ? CELL_BY_ID[nextCell.id].startsRest : false);
        if (!newCells || (newCells.length === 1 && newCells[0].id === c.id)) continue;
      } else continue;
      m.cells.splice(ci, 1, ...newCells);
      finalize(q);
      const s = serialize(q);
      if (avoidSerials && avoidSerials.has(s)) continue;
      return { pattern: q, measure: mi, cellIndex: ci, group: c.gi, k: c.k, oldId: c.id, newId: newCells.map(x => x.id).join(' + ') };
    }
    return null;
  }
  function distractors(p, level, n) {
    const seen = new Set([serialize(p)]); const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 60) {
      let base = p; let diffs = [];
      const steps = (level >= 3 && Math.random() < 0.35) ? 2 : 1;
      let ok = true;
      for (let s = 0; s < steps; s++) { const r = mutate(base, level, seen); if (!r) { ok = false; break; } base = r.pattern; diffs.push(r); }
      if (!ok) continue;
      const ser = serialize(base); if (seen.has(ser)) continue;
      seen.add(ser); out.push({ pattern: base, diffs });
    }
    return out;
  }

  /* Flatten to onsets: [{at (ticks), dur (ticks), accent, measure, group}] (ties merged) */
  function onsets(p) {
    const out = []; let t = 0;
    let pending = null;
    p.measures.forEach((m, mi) => {
      const bounds = []; let acc = 0; m.meter.groups.forEach(g => { bounds.push(acc); acc += g; });
      let local = 0;
      m.events.forEach(ev => {
        const gi = bounds.reduce((g, b, i) => local >= b ? i : g, 0);
        if (!ev.rest) {
          if (pending) { pending.dur += ev.d; }
          else { pending = { at: t, dur: ev.d, accent: bounds.includes(local), measure: mi, group: gi }; }
          if (!ev.tie) { out.push(pending); pending = null; }
        } else { if (pending) { out.push(pending); pending = null; } }
        t += ev.d; local += ev.d;
      });
    });
    if (pending) out.push(pending);
    return out;
  }
  function totalTicks(p) { return p.measures.reduce((a, m) => a + m.events.reduce((b, e) => b + e.d, 0), 0); }
  function clickTimes(p) { // group starts in ticks
    const out = []; let t = 0;
    p.measures.forEach(m => { let acc = 0; m.meter.groups.forEach((g, i) => { out.push({ at: t + acc, accent: i === 0 }); acc += g; }); t += acc; });
    return out;
  }
  /* Build audio events. opts: {tempo (factor), countIn (bool), withClick (bool), tapWindow (bool => adds a silent count+clicks section)} */
  function schedule(p, opts) {
    opts = opts || {};
    const tps = (p.measures[0].meter.tps || 160) * (opts.tempo || 1);
    const sec = ticks => ticks / tps;
    const evs = [];
    const first = p.measures[0];
    const countTicks = first.meter.groups.reduce((a, b) => a + b, 0);
    let offset = 0;
    if (opts.countIn !== false) {
      let acc = 0; first.meter.groups.forEach((g, i) => { evs.push({ kind: 'click', at: sec(acc), accent: i === 0 }); acc += g; });
      offset = countTicks;
    }
    const patStart = sec(offset);
    if (opts.withClick !== false) clickTimes(p).forEach(c => evs.push({ kind: 'click', at: sec(offset + c.at), accent: c.accent }));
    if (!opts.silentPattern) onsets(p).forEach(o => evs.push({ kind: 'rhythm', at: sec(offset + o.at), dur: Math.max(0.08, sec(o.dur) - 0.02), accent: o.accent }));
    const patEnd = sec(offset + totalTicks(p));
    return { events: evs, patStart, patEnd, tps, sec };
  }

  /* Tap scoring. taps: seconds relative to pattern start; expected onsets from onsets(p) */
  function scoreTaps(p, taps, tps) {
    const sec = ticks => ticks / tps;
    const exp = onsets(p).map(o => Object.assign({ t: sec(o.at) }, o));
    const tol = 0.12;
    const used = new Set(); const results = [];
    for (const o of exp) {
      let best = -1, bd = Infinity;
      taps.forEach((tp, i) => { if (used.has(i)) return; const d = Math.abs(tp - o.t); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd <= tol) { used.add(best); results.push({ hit: true, err: taps[best] - o.t, o }); }
      else results.push({ hit: false, o });
    }
    const extras = taps.length - used.size;
    const hits = results.filter(r => r.hit).length;
    const score = Math.max(0, (hits - 0.5 * extras) / Math.max(1, exp.length));
    const errs = results.filter(r => r.hit).map(r => r.err);
    const meanErr = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 0;
    return { score, hits, total: exp.length, extras, meanErr, results };
  }

  Object.assign(E, { Rhythm: { parseCell, CELLS, CELL_BY_ID, METERS, LEVEL_METERS, generate, mutate, distractors, onsets, totalTicks, schedule, scoreTaps, serialize, clone } });
})(window.EARS = window.EARS || {});
