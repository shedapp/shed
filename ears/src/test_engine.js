// Engine tests (node, no DOM/audio): node src/test_engine.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const store = {};
const sandbox = {
  console, Math, Date, JSON, Object, Array, Set, Map, Promise, Number, String, Float32Array, Error, setTimeout, clearTimeout, requestAnimationFrame: () => 0, cancelAnimationFrame: () => 0,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] },
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  unescape: s => s, escape: s => s, encodeURIComponent, decodeURIComponent, navigator: {}
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
['util.js', 'theory.js', 'audio.js', 'notation.js', 'rhythm.js', 'gen.js', 'genrhythm.js', 'srs.js', 'pitch.js', 'sing.js'].forEach(f => vm.runInContext(src(f), sandbox, { filename: f }));
const E = sandbox.EARS;
let fails = 0; const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL:', msg); } };

// ---- theory
ok(E.keyName(1, false) === 'D♭ major', 'keyName Db');
ok(E.keyName(1, true) === 'C♯ minor', 'keyName c#');
ok(E.midiName(60) === 'C4', 'midiName');
Object.entries(E.CHORDS).forEach(([k, c]) => ok(c.iv[0] === 0 && c.iv.length >= 3, 'chord ' + k));
Object.entries(E.TOKENS).forEach(([k, t]) => ok(E.CHORDS[t.type], 'token type ' + k));
// voice leading: II-7 V7 IMaj7 in C
let prev = null; const vcs = ['II-7', 'V7', 'IMaj7'].map(tk => { const t = E.TOKENS[tk]; const v = E.voiceChord(t.type, t.root, prev); prev = v; return v; });
vcs.forEach(v => ok(v.upper.length === 4 && v.upper.every((n, i) => i === 0 || n > v.upper[i - 1]), 'voicing ascending'));
const move = (a, b) => a.upper.reduce((s, n, i) => s + Math.abs(n - b.upper[i]), 0);
ok(move(vcs[0], vcs[1]) <= 12, 'voice leading smooth ii-V: ' + move(vcs[0], vcs[1]));
ok(E.inversionVoicing('maj7', 60, 2).join(',') === '67,71,72,76', 'inversion voicing');
ok(E.cadenceChords(0, false).length === 4, 'cadence');

// ---- rhythm cells parse to expected ticks
E.Rhythm.CELLS.forEach(c => ok([120, 180, 240, 360, 480].includes(c.ticks), 'cell ticks ' + c.id + '=' + c.ticks));
ok(E.Rhythm.CELL_BY_ID['{3:2 e e e}'].ticks === 120, 'triplet ticks');
ok(E.Rhythm.CELL_BY_ID['{3:2 q q q}'].ticks === 240, 'quarter triplet ticks');
ok(E.Rhythm.CELL_BY_ID['{5:4 s s s s s}'].ticks === 120, 'quintuplet');
ok(E.Rhythm.CELL_BY_ID['{2:3 e e}'].ticks === 180, 'duplet');
ok(E.Rhythm.CELL_BY_ID['q.. s'].ticks === 240, 'double dotted');
// generate many patterns per level and validate measure sums + ties
for (let lvl = 1; lvl <= 5; lvl++) {
  for (let i = 0; i < 200; i++) {
    const p = E.Rhythm.generate({ level: lvl });
    p.measures.forEach((m, mi) => {
      const sum = m.events.reduce((a, e) => a + e.d, 0); const want = m.meter.groups.reduce((a, b) => a + b, 0);
      ok(sum === want, `L${lvl} measure sum ${sum} vs ${want} meter ${m.meter.name} cells ${m.cells.map(c => c.id).join('|')}`);
    });
    const evs = p.measures.flatMap(m => m.events);
    evs.forEach((e, i) => { if (e.tie) { ok(i < evs.length - 1 && !evs[i + 1].rest && !e.rest, `L${lvl} tie validity at ${i}: ${E.Rhythm.serialize(p)}`); } });
    const ds = E.Rhythm.distractors(p, lvl, 3);
    ok(ds.length === 3, `L${lvl} distractors count ${ds.length} for ${E.Rhythm.serialize(p)}`);
    ds.forEach(d => { ok(E.Rhythm.serialize(d.pattern) !== E.Rhythm.serialize(p), 'distractor differs'); d.pattern.measures.forEach(m => ok(m.events.reduce((a, e) => a + e.d, 0) === m.meter.groups.reduce((a, b) => a + b, 0), 'distractor sum')); });
    const svg = E.Notation.rhythmSVG(p); ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'svg');
    const sch = E.Rhythm.schedule(p, { tempo: 1 }); ok(sch.events.length > 0 && sch.patEnd > sch.patStart, 'schedule');
    const on = E.Rhythm.onsets(p); ok(on.every(o => o.dur > 0), 'onsets');
  }
}
// tap scoring
{
  const p = E.Rhythm.generate({ level: 1, meters: ['4/4'] }); const on = E.Rhythm.onsets(p); const tps = 160;
  const taps = on.map(o => o.at / tps + 0.03); const r = E.Rhythm.scoreTaps(p, taps, tps);
  ok(r.hits === on.length && r.score >= 0.99, 'tap scoring perfect ' + JSON.stringify({ hits: r.hits, total: r.total, score: r.score }));
  const r2 = E.Rhythm.scoreTaps(p, taps.slice(1), tps); ok(r2.hits === on.length - 1, 'tap scoring one miss');
}

// ---- generators
const Gm = E.Gen;
for (let lvl = 1; lvl <= 5; lvl++) for (let i = 0; i < 60; i++) {
  const a = Gm.genInterval(lvl, { songCues: true }); ok(a.options.some(o => o.id === a.answer) && a.audio.events.length >= 1, 'interval ex');
  const b = Gm.genDegree(lvl, {}); ok(b.answerKind === 'sequence' ? b.palette.length > 0 : b.options.some(o => o.id === b.answer), 'degree ex L' + lvl);
  const c = Gm.genMelody(lvl, {}); ok(c.answer.length >= 5 && c.palette.length > 0 && c.answer.every(s => c.palette.some(p => p.id === s)), 'melody ex L' + lvl + ' ' + c.answer.join(' ') + ' pal ' + c.palette.map(p => p.id).join(' '));
  const d = Gm.genChord(lvl, {}); ok(d.options.some(o => o.id === d.answer), 'chord ex');
  const e = Gm.genScale(lvl, {}); ok(e.options.some(o => o.id === e.answer), 'scale ex');
  const f = Gm.genProgression(lvl, {}); if (f.answerKind === 'multi') { ok(f.answer.every(t => f.palette.some(p => p.id === t)), 'prog answer in palette L' + lvl + ' ' + f.answer.join(' ')); } else ok(f.options.some(o => o.id === f.answer), 'modulation');
  const g = Gm.genRhythm(lvl, {}); ok(['dictation', 'error', 'tap'].includes(g.type), 'rhythm ex');
  if (g.type === 'error') ok(g.options.some(o => o.id === g.answer), 'error options');
  const h = E.Sing.genSing(lvl, {}); ok(h.expected.length >= 2 && h.syls.length === h.expected.length, 'sing ex ' + h.task);
}
// targets honoured
ok(Gm.genInterval(3, { target: 'm6:desc' }).answer === 'm6', 'interval target');
ok(Gm.genChord(4, { target: 'ch:dom13' }).answer === 'dom13', 'chord target');
ok(Gm.genScale(3, { target: 'sc:dorian' }).answer === 'dorian', 'scale target');
ok(Gm.genProgression(3, { target: 'tok:V7/II' }).answer.includes('V7/II'), 'prog target');
ok(Gm.genDegree(4, { target: 'deg:fi' }).answer === 'fi', 'degree target');
{ const r = Gm.genRhythm(2, { target: 'rc:e. s', sub: 'dictation' }); ok(r.pattern.measures.some(m => m.cells.some(c => c.id === 'e. s')), 'rhythm target placed'); }

// ---- sing evaluation
{
  const ex = E.Sing.genSing(1, { target: 'sing:scale:majpent' });
  const notes = ex.expected.map((m, i) => ({ midi: m - 12, cents: (i % 2 ? 10 : -8), start: i, end: i + 0.4 }));
  const r = E.Sing.evaluate(ex, notes); ok(r.score >= 90, 'sing perfect octave down: ' + r.score + ' ' + r.text);
  const notes2 = notes.slice(0, 3); const r2 = E.Sing.evaluate(ex, notes2); ok(r2.rows.filter(x => x.status === 'missing').length === 3, 'sing missing');
  const notes3 = notes.map(n => Object.assign({}, n)); notes3[2].midi += 1; const r3 = E.Sing.evaluate(ex, notes3); ok(r3.rows[2].status === 'wrong', 'sing wrong note: ' + JSON.stringify(r3.rows[2]));
}
// ---- pitch detect on synthetic sine
{
  const sr = 44100, f = 220; const b = new Float32Array(2048); for (let i = 0; i < b.length; i++) b[i] = 0.5 * Math.sin(2 * Math.PI * f * i / sr);
  const r = E.Pitch.detect(b, sr); ok(Math.abs(r.freq - f) < 1, 'pitch detect ' + r.freq);
  const T = new E.Pitch.Tracker(); for (let t = 0; t < 0.4; t += 0.016) T.push(57.03, t); for (let t = 0.4; t < 0.8; t += 0.016) T.push(60.9, t); T.push(null, 0.9); T.push(null, 1.2);
  const ns = T.finish(1.3); ok(ns.length === 2 && ns[0].midi === 57 && ns[1].midi === 61, 'tracker ' + JSON.stringify(ns.map(n => [n.midi, n.cents])));
}
// ---- store / srs
{
  const S = E.Store; S.load();
  const c = S.review('m6:asc', 'intervals', true, 1.5); ok(c.S >= 2 && c.due > Date.now(), 'review correct');
  S.review('m6:asc', 'intervals', false, 3); ok(S.get().cards['m6:asc'].lapses === 1, 'lapse');
  S.confuse('intervals', 'm6', 'M6'); S.confuse('intervals', 'M6', 'm6'); ok(S.topConfusions('intervals')[0].n === 2, 'confusions');
  S.logAnswer('intervals', true, 3); ok(S.streak() === 1, 'streak');
  const q = S.buildSession({ modules: ['intervals', 'chords', 'rhythm'], count: 12 }); ok(q.length === 12, 'session size');
  S.MODULES.forEach(m => { for (let l = 1; l <= 5; l++) ok(S.vocab(m, l).length > 0, 'vocab ' + m + l); });
  ok(S.report().includes('EARS progress report'), 'report');
}
console.log(fails ? `${fails} FAILURES` : 'ALL TESTS PASSED');
process.exit(fails ? 1 : 0);
