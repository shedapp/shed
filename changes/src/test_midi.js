// Drives the MIDI reader with simulated performances and checks what it hears.
global.Theory = require('./theory.js'); global.Mood = require('./mood.js');
global.window = global; global.navigator = {}; global.document = { createElement: () => ({ setAttribute(){}, style:{}, play(){ return { catch(){} }; } }), body: { appendChild(){} } };
const A = require('./audio.js'); const T = global.Theory; const key = { tonic: 0, mode: 'major' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const inj = (b) => A.midiInject(b);
const on = (n, v = 80) => inj([0x90, n, v]), off = (n) => inj([0x80, n, 0]), ped = (d) => inj([0xb0, 64, d ? 127 : 0]);
async function run(name, fn, expect) {
  const heard = [];
  A.MIDI.onChord = (c) => heard.push(T.chordSymbol(c, key) + (c.melody && c.melody.length ? '♪' + c.melody.map(m => m.note).join('.') : ''));
  A.MIDI.onMelody = (n) => { heard.push('mel' + n); };
  A.MIDI.onLive = () => {}; A.MIDI.current = null; A.MIDI.lastCommitted = null; A.MIDI.held.clear(); A.MIDI.sustained.clear(); A.MIDI.pedal = false; A.MIDI.melSet && A.MIDI.melSet.clear(); A.takeStart();
  await fn(); await sleep(200);
  let got = heard.join(' | '); if (!expect.includes('♪')) got = got.replace(/♪[\d.]+/g, ''); const ok = got === expect;
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + '\n      heard: ' + got + (ok ? '' : '\n      want:  ' + expect));
  return ok;
}
const chord = async (ns, ms = 500, v = 80) => { ns.forEach(n => on(n, v)); await sleep(ms); ns.forEach(off); await sleep(80); };
(async () => {
  let all = true;
  all &= await run('plain chords', async () => { await chord([48, 55, 60, 64]); await chord([45, 52, 57, 60]); await chord([41, 48, 53, 57]); await chord([43, 50, 55, 59]); }, 'C | Am | F | G');
  all &= await run('A half-dim after G with pedal held through', async () => { ped(1); await chord([43, 55, 59, 62]); await chord([45, 60, 63, 67]); ped(0); await sleep(150); }, 'G | Am7♭5');
  all &= await run('pedal: lift hands, chord stays until pedal up', async () => { ped(1); [48, 55, 60, 64].forEach(n => on(n)); await sleep(300); [48, 55, 60, 64].forEach(off); await sleep(400); ped(0); await sleep(150); }, 'C');
  all &= await run('arpeggiated chord builds, not melody', async () => { on(48); await sleep(70); on(55); await sleep(70); on(60); await sleep(70); on(64); await sleep(70); on(67); await sleep(400); [48, 55, 60, 64, 67].forEach(off); await sleep(150); }, 'C');
  all &= await run('doubled root on top stays harmony', async () => { await chord([48, 64, 67, 72]); await chord([53, 69, 72, 77]); }, 'C | F');
  all &= await run('Cmaj7 drop voicing with 5th on top', async () => { await chord([48, 64, 67, 71, 79]); }, 'Cmaj7');
  all &= await run('melody on top of chord struck together (wide)', async () => { [48, 55, 60, 64, 76].forEach(n => on(n)); await sleep(500); [48, 55, 60, 64, 76].forEach(off); await sleep(150); }, 'C♪76');
  all &= await run('melody over established chord', async () => { [48, 55, 60, 64].forEach(n => on(n)); await sleep(400); on(76); await sleep(200); off(76); on(77); await sleep(200); off(77); on(79); await sleep(200); off(79); [48, 55, 60, 64].forEach(off); await sleep(150); }, 'C♪76.77.79');
  all &= await run('comping re-strikes keep chord', async () => { on(48); await sleep(50); for (let i = 0; i < 3; i++) { [55, 60, 64].forEach(n => on(n)); await sleep(180); [55, 60, 64].forEach(off); await sleep(60); } off(48); await sleep(150); }, 'C');
  all &= await run('inversion while comping keeps chord', async () => { on(48); await sleep(50); [55, 60, 64].forEach(n => on(n)); await sleep(250); [55, 60, 64].forEach(off); await sleep(40); [60, 64, 67].forEach(n => on(n)); await sleep(250); [60, 64, 67].forEach(off); off(48); await sleep(150); }, 'C');
  all &= await run('C7 then C (subset while bass held) is comping', async () => { on(48); await sleep(50); [58, 60, 64].forEach(n => on(n)); await sleep(300); [58, 60, 64].forEach(off); await sleep(40); [55, 60, 64].forEach(n => on(n)); await sleep(300); [55, 60, 64].forEach(off); off(48); await sleep(150); }, 'C7');
  all &= await run('Am7 then C, hands fully lifted, is a change', async () => { await chord([45, 55, 60, 64]); await chord([48, 55, 60, 64]); }, 'Am7 | C');
  all &= await run('melody after lifting the chord', async () => { await chord([48, 55, 60, 64], 400); on(76); await sleep(200); off(76); on(74); await sleep(200); off(74); await sleep(150); }, 'C | mel76 | mel74');
  all &= await run('jazz: ii–V–I rootless with melody', async () => { [38, 60, 64, 65, 69].forEach(n => on(n)); on(77, 105); await sleep(500); [38, 60, 64, 65, 69, 77].forEach(off); await sleep(80); [43, 59, 65, 69, 74].forEach(n => on(n)); on(76, 105); await sleep(500); [43, 59, 65, 69, 74, 76].forEach(off); await sleep(80); await chord([48, 59, 64, 67, 74]); }, 'Dm9 | G13 | Cmaj9');
  all &= await run('gospel: fast changes with pedal pumping', async () => { for (const c of [[41, 57, 60, 65], [43, 55, 59, 62], [45, 52, 57, 60], [36, 55, 60, 64]]) { ped(1); c.forEach(n => on(n, 96)); await sleep(260); c.forEach(off); await sleep(30); ped(0); await sleep(30); } await sleep(150); }, 'F | G | Am | C');
  all &= await run('neo-soul: Fmaj9 → Em7 → Dm9, pedal held, overlapping fingers', async () => { ped(1); [41, 57, 60, 64, 67].forEach(n => on(n)); await sleep(400); [41, 57, 60, 64].forEach(off); [40, 55, 59, 62].forEach(n => on(n)); await sleep(60); off(67); await sleep(400); [40, 55, 59, 62].forEach(off); [38, 57, 60, 64, 65].forEach(n => on(n)); await sleep(400); [38, 57, 60, 64, 65].forEach(off); ped(0); await sleep(150); }, 'Fmaj9 | Em7 | Dm9');
  all &= await run('sloppy legato: old chord still down 120 ms into the new one', async () => { [48, 55, 60, 64].forEach(n => on(n)); await sleep(500); [45, 52, 57, 60].forEach(n => on(n)); await sleep(120); [48, 55, 64].forEach(off); await sleep(500); [45, 52, 57, 60].forEach(off); await sleep(80); [41, 48, 53, 57].forEach(n => on(n)); await sleep(100); [45, 52].forEach(off); await sleep(500); [41, 48, 53, 57].forEach(off); await sleep(150); }, 'C | Am | F');
  all &= await run('half-pedal CC flood during chords', async () => { for (const c of [[48, 55, 60, 64], [45, 52, 57, 60]]) { c.forEach(n => on(n)); for (let v = 0; v < 128; v += 9) { inj([0xb0, 64, v]); await sleep(8); } await sleep(200); c.forEach(off); for (let v = 127; v >= 0; v -= 9) { inj([0xb0, 64, v]); await sleep(8); } await sleep(60); } await sleep(150); }, 'C | Am');
  all &= await run('ballad: melody with chord re-struck under it (pedal)', async () => { ped(1); [41, 57, 60, 65].forEach(n => on(n, 70)); on(72, 100); await sleep(300); off(72); on(74, 100); await sleep(300); off(74); [57, 60, 65].forEach(off); await sleep(30); [57, 60, 65].forEach(n => on(n, 66)); on(76, 100); await sleep(400); [41, 57, 60, 65, 76].forEach(off); ped(0); await sleep(150); }, 'F♪74.76');
  console.log(all ? '\nall MIDI reading checks pass' : '\nSOME CHECKS FAILED'); process.exit(all ? 0 : 1);
})();
