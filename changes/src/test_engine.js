// Quick engine checks: run `node src/test_engine.js`
const T = require('./theory.js'); const M = require('./mood.js'); const R = require('./reharm.js');
const key = { tonic: 0, mode: 'major' };
const prog = T.parseProgression('C | Am | F | G');
console.log('parsed:', prog.map(c => T.chordSymbol(c, key)).join(' '), '| key found:', T.keyName(T.findKey(prog).key));
console.log('romans:', R.describe(prog, key));
console.log('mood:', M.progressionMood(prog, key, 'pop').sentence);
// symbol round trips
for (const s of ['C', 'Cm', 'Cmaj7', 'C7', 'Cm7', 'Cdim7', 'C#m7b5', 'Bbmaj9', 'F/G', 'G13sus4', 'E7#9', 'Abmaj7#11', 'Dm11', 'C6/9', 'Eb7(#11)', 'Gø7', 'CΔ7']) {
  const c = T.parseChord(s); console.log(s.padEnd(10), '→', c ? T.chordSymbol(c, key) + '   ' + T.romanNumeral(c, key) : 'PARSE FAIL');
}
// identification
console.log('identify C E G B D:', T.chordSymbol(T.identify([60, 64, 67, 71, 74]), key));
console.log('identify E G C (C/E):', T.chordSymbol(T.identify([52, 55, 60]), key));
console.log('identify G F A C (F/G):', T.chordSymbol(T.identify([43, 53, 57, 60]), key));
console.log('identify A C E G:', T.chordSymbol(T.identify([57, 60, 64, 67]), key));
console.log('identify C E G A:', T.chordSymbol(T.identify([48, 64, 67, 69]), key));
console.log('negative of G7:', T.chordSymbol(T.negative(T.parseChord('G7'), key), key));
console.log('key of Dm7 G7 Cmaj7:', T.keyName(T.findKey(T.parseProgression('Dm7 G7 Cmaj7')).key));
console.log('key of Am F C G:', T.keyName(T.findKey(T.parseProgression('Am F C G')).key));
console.log('key of Em7 A7 Dm7 (F major?):', T.keyName(T.findKey(T.parseProgression('F Em7 A7 Dm')).key));
console.log('key of Cm Ab Eb Bb:', T.keyName(T.findKey(T.parseProgression('Cm Ab Eb Bb')).key));
console.log('spelling in Eb: Bb7 =', T.chordSymbol(T.parseChord('Bb7'), { tonic: 3, mode: 'major' }), '; F#dim7 in C major =', T.chordSymbol(T.parseChord('F#dim7'), key), '; Db7 in C =', T.chordSymbol(T.parseChord('Db7'), key));
console.log('tones of C7#9:', T.chordToneNames(T.parseChord('C7#9'), key).map(t => t.name + '(' + t.role + ')').join(' '));
console.log('tones of Ab7 in C:', T.chordToneNames(T.parseChord('Ab7'), key).map(t => t.name).join(' '));
console.log();
for (const style of R.STYLE_ORDER) {
  const depth = R.STYLES[style].ceiling;
  const opts = R.ideas(prog, key, { style, depth, limit: 8 });
  console.log(`=== ${style} (depth ${depth}) — ${opts.length} options`);
  for (const o of opts) {
    console.log(`  [${o.device} d${o.depth} ${o.score.toFixed(2)}] ${o.prog.map(c => T.chordSymbol(c, key) + (c.changed ? '*' : '')).join(' – ')}`);
    console.log(`      ${o.roman.join(' – ')}  |  ${o.mood.words.join(', ')} — ${o.mood.sentence}`);
    console.log(`      ${o.reason}`);
  }
}
console.log('\nSHADOW:', R.shadow(prog, key).prog.map(c => T.chordSymbol(c, key)).join(' – '));
const minorProg = T.parseProgression('Am | F | C | G');
const mk = T.findKey(minorProg).key; console.log('\nminor-ish prog key:', T.keyName(mk));
const am = { tonic: 9, mode: 'minor' };
console.log('Am Dm E7 Am in A minor:', R.describe(T.parseProgression('Am Dm E7 Am'), am));
for (const o of R.ideas(T.parseProgression('Am | Dm | E7 | Am'), am, { style: 'gospel', depth: 4 })) console.log(`  [${o.device}] ${o.prog.map(c => T.chordSymbol(c, am)).join(' – ')} — ${o.reason}`);
console.log('\nmood lens bittersweet (pop d3):');
for (const o of R.ideas(prog, key, { style: 'pop', depth: 3, mood: 'bittersweet' })) console.log(`  [${o.device}] ${o.prog.map(c => T.chordSymbol(c, key)).join(' – ')} — ${o.mood.words.join(', ')}`);
