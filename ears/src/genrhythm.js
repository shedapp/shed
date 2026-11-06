/* ============================================================
   EARS — Rhythm exercise generators: dictation (multiple choice notation),
   error detection, tap-back.
   ============================================================ */
(function (E) {
  const U = E.U, R = E.Rhythm;
  function cellItems(p) { const s = new Set(); p.measures.forEach(m => m.cells.forEach(c => s.add('rc:' + c.id))); return Array.from(s); }
  function beatLabel(p, mi, gi) { return `Bar ${mi + 1} · beat ${gi + 1}`; }
  function countHint(p) {
    const m = p.measures[0].meter;
    if (m.den === 8 && m.groups.some(g => g !== 180)) return `Count ${m.name.replace(/.*\(|\)/g, '')} as “${m.groups.map(g => g === 120 ? '1-2' : '1-2-3').join(' ')}”.`;
    if (m.den === 8) return `Feel it in ${m.groups.length}: each beat is a dotted quarter, subdivided in three (“1-la-li”).`;
    if (m.den === 2) return `The beat is the half note — count the quarters as the subdivision.`;
    return `Count “1 e & a” through every beat, including the rests.`;
  }

  function genRhythm(level, o) {
    o = o || {};
    let sub = o.sub;
    if (!sub) { const r = Math.random(); sub = r < 0.55 ? 'dictation' : r < 0.8 ? 'error' : (o.allowTap === false ? 'dictation' : 'tap'); }
    if (level === 1 && sub === 'error' && Math.random() < 0.5) sub = 'dictation';
    const target = o.target ? o.target.replace('rc:', '') : undefined;
    const tempo = o.tempo || 1;
    if (sub === 'dictation') return genDictation(level, target, tempo);
    if (sub === 'error') return genError(level, target, tempo);
    return genTap(level, target, tempo);
  }

  function genDictation(level, target, tempo) {
    const p = R.generate({ level, target });
    const ds = R.distractors(p, level, 3);
    const opts = [{ id: 'c', pattern: p, diffs: [] }].concat(ds.map((d, i) => ({ id: 'd' + i, pattern: d.pattern, diffs: d.diffs })));
    const options = U.shuffle(opts).map(op => ({ id: op.id, svg: E.Notation.rhythmSVG(op.pattern), pattern: op.pattern, diffs: op.diffs }));
    const sch = R.schedule(p, { tempo, countIn: true, withClick: true });
    const items = cellItems(p);
    const meterName = p.measures[0].meter.name + (p.measures.length > 1 && p.measures[1].meter.name !== p.measures[0].meter.name ? ' → ' + p.measures[1].meter.name : '');
    return {
      module: 'rhythm', type: 'dictation', level, prompt: `Rhythmic dictation in ${meterName}. Which notation matches what you hear?`, meterName,
      audio: { events: sch.events }, context: null, answerKind: 'choice', options, answer: 'c', items, pattern: p,
      explain: `The correct notation is highlighted above. ${countHint(p)} Conduct the beat and keep the smallest subdivision running in your head — the small numbers under the staff mark where each beat falls.`,
      wrongItems: chosenId => { const op = options.find(x => x.id === chosenId); if (!op || !op.diffs.length) return []; return op.diffs.map(d => 'rc:' + d.oldId); },
      diffDescribe: chosenId => { const op = options.find(x => x.id === chosenId); if (!op || !op.diffs.length) return ''; return op.diffs.map(d => `${beatLabel(p, d.measure, d.group)}: you chose "${d.newId}", it was "${d.oldId}"`).join('; '); },
      visual: null, compare: null, correctLabel: 'the highlighted notation'
    };
  }

  function genError(level, target, tempo) {
    const p = R.generate({ level, target, measures: 2 });
    let mut = null; for (let i = 0; i < 5 && !mut; i++) mut = R.mutate(p, level);
    if (!mut) return genDictation(level, target, tempo);
    const sch = R.schedule(mut.pattern, { tempo, countIn: true, withClick: true });
    const options = []; p.measures.forEach((m, mi) => m.meter.groups.forEach((g, gi) => options.push({ id: `m${mi}g${gi}`, label: `beat ${gi + 1}`, sub: `bar ${mi + 1}` })));
    const answerIds = []; for (let k = 0; k < mut.k; k++) answerIds.push(`m${mut.measure}g${mut.group + k}`);
    const meterName = p.measures[0].meter.name;
    return {
      module: 'rhythm', type: 'error', level, prompt: `Error detection in ${meterName}: the notation below is what was WRITTEN. The playback changes one spot. Where is the difference?`, meterName,
      audio: { events: sch.events }, context: null, answerKind: 'choice', options, answer: answerIds[0], acceptAny: answerIds, items: ['rc:' + mut.oldId],
      svg: E.Notation.rhythmSVG(p), pattern: p, mutated: mut.pattern,
      explain: `The change was at <b>${beatLabel(p, mut.measure, mut.group)}</b>: written "${mut.oldId}", played "${mut.newId}".`,
      explainSvg: E.Notation.rhythmSVG(mut.pattern, { highlightGroup: { measure: mut.measure, group: mut.group } }),
      visual: null, compare: null, correctLabel: beatLabel(p, mut.measure, mut.group)
    };
  }

  function genTap(level, target, tempo) {
    const p = R.generate({ level, target, measures: 2 });
    const listen = R.schedule(p, { tempo, countIn: true, withClick: true });
    // tap phase: count-in + clicks only
    const tapSch = R.schedule(p, { tempo, countIn: true, withClick: true, silentPattern: true });
    const meterName = p.measures[0].meter.name;
    return {
      module: 'rhythm', type: 'tap', level, prompt: `Tap-back in ${meterName}: listen, then tap the rhythm with the click (space bar or the TAP pad).`, meterName,
      audio: { events: listen.events }, context: null, answerKind: 'tap', options: [], answer: null, items: cellItems(p),
      svg: E.Notation.rhythmSVG(p), pattern: p, tap: tapSch, tps: tapSch.tps,
      explain: `The written rhythm is shown above. Keep the subdivision running in your head between the attacks.`,
      visual: null, compare: null, correctLabel: ''
    };
  }

  Object.assign(E.Gen, { genRhythm });
})(window.EARS = window.EARS || {});
