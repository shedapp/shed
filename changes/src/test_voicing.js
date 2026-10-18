const T = require('./theory.js'); const V = require('./voicing.js');
const key = { tonic: 0, mode: 'major' };
const nm = (n) => T.pcName(n % 12, key) + (Math.floor(n / 12) - 1);
function show(progText, style) {
  const prog = T.parseProgression(progText);
  const vs = V.voiceProgression(prog, key, style);
  console.log(`--- ${style}: ${progText}`);
  for (const v of vs) console.log(`  ${T.chordSymbol(v.chord, key).padEnd(10)} LH ${v.lh.map(nm).join(' ').padEnd(10)} RH ${v.rh.map(nm).join(' ').padEnd(18)} moves ${v.moves.map(m => (m.delta > 0 ? '+' : '') + m.delta).join(',')}`);
  const gs = V.guitarProgression(prog, key, style);
  for (const g of gs) console.log(`  ${T.chordSymbol(g.chord, key).padEnd(10)} guitar ${g.shape ? g.shape.frets.map(f => f < 0 ? 'x' : f).join('-') + ' (pos ' + g.shape.position + (g.shape.rootless ? ', rootless' : '') + ')  ' + g.shape.strings.map(s => s ? s.name : '·').join(' ') : 'none'}`);
}
show('Dm9 G13 Cmaj9', 'jazz');
show('C Am F G', 'pop');
show('Cmaj9 Am11 Fmaj7#11 G13sus4', 'neosoul');
show('C/E F F#dim7 C/G G7', 'gospel');
show('C E F G', 'film');
show('C Am Db/F G7 C', 'classical');
show('F/G G7#9 Ab13 Bbmaj9 Em7b5 A7alt', 'gospel');
const t0 = Date.now(); for (let i = 0; i < 20; i++) V.guitarShape(T.parseChord('Ebmaj9'), 'neosoul', null, { key }); console.log('20 guitar searches:', Date.now() - t0, 'ms');
