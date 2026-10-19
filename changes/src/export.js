// export.js — a Standard MIDI File of the voicings, and a one-page PDF lead sheet, both written by hand (no libraries).
const Export = (() => {
  const T = typeof Theory !== 'undefined' ? Theory : require('./theory.js');
  const V = typeof Voicing !== 'undefined' ? Voicing : require('./voicing.js');

  // ---------- MIDI (format 0, one track, 480 ppq) ----------
  function vlq(n) { const b = [n & 0x7f]; n >>= 7; while (n > 0) { b.unshift((n & 0x7f) | 0x80); n >>= 7; } return b; }
  function str(s) { return [...s].map(c => c.charCodeAt(0)); }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >>> 8) & 255, n & 255]; }
  // items: [{notes: [midi], beats}], bpm, name
  function midiFile(items, bpm, name) {
    const PPQ = 480; const ev = []; // {tick, bytes}
    ev.push({ tick: 0, bytes: [0xff, 0x03, ...vlq(str(name || 'Changes').length), ...str(name || 'Changes')] });
    const mpq = Math.round(60000000 / (bpm || 76)); ev.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255] });
    ev.push({ tick: 0, bytes: [0xc0, 0x00] }); // acoustic grand
    let t = 0;
    for (const it of items) {
      const dur = Math.round((it.beats || 4) * PPQ);
      it.notes.forEach((n, i) => ev.push({ tick: t + i * 6, bytes: [0x90, n, n < 56 ? 84 : 72] }));
      it.notes.forEach(n => ev.push({ tick: t + dur - 10, bytes: [0x80, n, 0] }));
      t += dur;
    }
    ev.push({ tick: t, bytes: [0xff, 0x2f, 0x00] });
    ev.sort((a, b) => a.tick - b.tick);
    const track = []; let last = 0;
    for (const e of ev) { track.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
    const bytes = [...str('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(PPQ), ...str('MTrk'), ...u32(track.length), ...track];
    return new Uint8Array(bytes);
  }

  // ---------- PDF (Letter, Helvetica; accidentals as b and #) ----------
  const ascii = (s) => String(s).replace(/♭/g, 'b').replace(/♯/g, '#').replace(/°/g, 'o').replace(/ø/g, 'm7b5').replace(/Δ/g, 'maj').replace(/–/g, '-').replace(/[^\x20-\x7e]/g, '');
  const pdfStr = (s) => '(' + ascii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
  // song: {title, key, bpm, sections:[{name, chords:[chord], roman, lyrics}]}
  function leadSheetPDF(song, keyName) {
    const W = 612, H = 792, M = 54; const lines = []; let y = H - M;
    const txt = (x, yy, size, s, bold) => lines.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td ${pdfStr(s)} Tj ET`);
    const rule = (x1, y1, x2, y2, w) => lines.push(`${w || 0.6} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    const pages = [];
    const newPage = () => { if (lines.length) pages.push(lines.splice(0)); y = H - M; };
    const need = (h) => { if (y - h < M) newPage(); };
    txt(M, y - 18, 22, song.title || 'Untitled', true); y -= 26;
    txt(M, y - 12, 10.5, `${keyName}  ·  ${song.bpm} bpm  ·  made with Changes`); y -= 30;
    for (const sec of song.sections) {
      need(60);
      txt(M, y - 12, 12.5, sec.name, true); y -= 20;
      if (sec.chords && sec.chords.length) {
        // bars: each chord gets beats/4 of a bar; draw 4 bars per line
        const perLine = 4, barW = (W - 2 * M) / perLine; let bar = 0, pos = 0; const rows = [[]];
        for (const c of sec.chords) { rows[rows.length - 1].push({ sym: c.sym, rn: c.rn, x: bar % perLine, frac: pos / 4 }); pos += c.beats || 4; while (pos >= 4) { pos -= 4; bar++; if (bar % perLine === 0 && c !== sec.chords[sec.chords.length - 1]) rows.push([]); } }
        for (const row of rows) {
          need(44);
          const top = y - 4, bottom = y - 30;
          for (let b = 0; b <= perLine; b++) rule(M + b * barW, top, M + b * barW, bottom, b === 0 || b === perLine ? 1 : 0.6);
          for (const it of row) { const x = M + it.x * barW + it.frac * barW + 5; txt(x, bottom + 10, 12.5, it.sym, true); if (it.rn) txt(x, bottom - 9, 7.5, it.rn); }
          y -= 50;
        }
      }
      if (sec.lyrics) {
        for (const ln of sec.lyrics) { // ln: {chordLine, textLine}
          need(30);
          if (ln.chordLine && ln.chordLine.trim()) { txt(M, y - 10, 9.5, ln.chordLine, true); y -= 12; }
          txt(M, y - 10, 10.5, ln.textLine); y -= 14;
        }
        y -= 6;
      }
      y -= 8;
    }
    newPage();
    // assemble objects: 1 catalog, 2 pages, 3 F1, 4 F2, then page+content pairs
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('PAGES'); // placeholder index 2
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = [];
    for (const pl of pages) {
      const content = pl.join('\n'); const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const pid = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`);
      pageIds.push(pid);
    }
    objs[1] = `<< /Type /Pages /Kids [${pageIds.map(i => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return out;
  }

  // ---------- practice lines, one per device family ----------
  const TEACH = {
    recolor: 'Play the same four chords with the new colors in three other keys today; keep the melody note on top each time.',
    sus: 'Practice V sus to V in every key around the circle of fifths; feel the 4th fall to the 3rd in the right hand only.',
    slashBass: 'Play the bass line alone first, then add the chords above it; the line should sing without the harmony.',
    pedal: 'Hold the pedal tone with the left hand and move only the right-hand shapes; try the same chords over the 5th as the pedal.',
    twoFive: 'Take every V in a song you know and put its ii in front of it; then do it in the relative minor.',
    secondaryDom: 'Find the vi, ii and IV in a song and precede each with its own V7; listen for which leading tone you like most.',
    fnSwap: 'Swap I and vi, IV and ii, through a whole chorus; notice where the swap lifts and where it darkens.',
    deceptive: 'Play V to I, then V to vi, back to back, in six keys; the second one should surprise you every time.',
    backdoor: 'Learn iv to bVII7 to I as one hand shape sliding; then use it to end a phrase you would normally end with V7.',
    turnaround: 'Loop the last bar with the turnaround ten times, then try iii7 to VI7 to ii7 to V7 with the dominants altered.',
    minorPlagal: 'Play IV to I, then iv to I, in all keys; the iv version is the one for the last line of a verse.',
    flatSix: 'Walk bVI to V to I with the bass stepping down a half step; then try bVI to bVII to I in the same key.',
    flatSeven: 'Play I, bVII, IV as a loop and sing over it; the mode is Mixolydian and the 7th of the scale is flat.',
    mario: 'bVI, bVII, I in every key, bass marching up in whole steps; use it to end a bridge.',
    picardy: 'End three minor songs you know on the major I instead; voice the 3rd on top so the change is heard.',
    neapolitan: 'Play ii6, then bII6 (Neapolitan), then V7 to I; the bass stays on the 4th degree for both predominants.',
    lydianII: 'Play ii then II major over the same melody; the raised 4th of the key is the note that changes.',
    halfDimTwo: 'Play ii7 to V7 to I, then iiø7 to V7(b9) to I; keep the top note the same for both versions.',
    planing: 'Slide a maj9 shape down a whole step and back; then plane it by minor thirds while the bass holds.',
    noLanding: 'Loop the progression with iii in place of V for two minutes; write a melody that never lands either.',
    dorian: 'Loop i to ii in Dorian and improvise with the raised 6th; then compare with natural minor.',
    passingDim: 'Fill every whole step between diatonic chords with a dim7 on the half step; play it with the bass walking.',
    gospelWalk: 'Bass 3-4-#4-5 under IV, #IV dim7, I/5, V7, in all twelve keys, then faster, then with a shout feel.',
    ctDim: 'Hold I, play its common-tone dim7 for one beat and return; the top note never moves.',
    tritoneSub: 'Replace every V7 in a tune with bII7; keep the 3rd and 7th in the same hand position.',
    tritoneChain: 'Play I, bIII7, ii7, bII7, I as a turnaround; then make every dominant a 7(#11).',
    gospelWalkUp: 'IV13, #IV13, V13sus4 into I, in all keys, with the bass walking up by half steps.',
    domChainDown: 'Dominants falling by half steps into home: play bIII7, II7, bII7, I; then start a half step higher each time.',
    augSixth: 'Build Ab-C-Eb-F# and resolve it to C/G then G7; the two outer voices expand by half steps.',
    chromaticMediant: 'Play I then III major, I then bVI, I then bIII; sing the one shared note through each pair.',
    parallelMinor: 'Play I, i, IV; then I, i, vi; the change is the 3rd of the chord moving down a half step.',
    hexPole: 'C to Abm and back, slowly, all three voices moving by half step; then transpose by major thirds.',
    lineCliche: 'Hold the chord and move one inner voice by half steps; then put that voice in the bass instead.',
    susHybrid: 'Play IV/V to I, then IV/V to vi; the sus hybrid works as a V that refuses to pull.',
    lydianIV: 'Play IVmaj7 with the #11 on top in all keys; then resolve the #11 up to the 5th and hear what you lose.',
    altered: 'Practice the altered dominant as a triad over a shell: Eb/G7, Db/G7, A/G7; then resolve each to Cmaj9.',
    constant: 'Slide a maj9 shape down in whole steps for three chords, then land on I; keep the top note moving by step.',
    sixthDim: 'Play the major sixth-diminished scale as chords, ascending and descending, in all keys.',
    coltrane: 'Giant Steps cycle in one key: Cmaj7, Eb7, Abmaj7, B7, Emaj7, G7, C; then in all twelve.',
    walkDown: 'Play the bass line C-B-A-G alone, then with the chords; then move it to the key of the song you are writing.',
    gospelDescent: 'Learn the descent to IV as a hand shape; then play it starting on IV to reach bVII.',
    chromaticMinorDescent: 'Play iii7, biii7, ii7, bII7, I with the same right-hand shape sliding; then start it from vi.',
    backcycle: 'III7, VI7, II7, V7, I around the cycle, one beat each; then two beats each with the 13ths.',
    dameron: 'Cmaj7, Eb7, Ab7, Db7, and back to the top, in all keys; the bass falls by half steps throughout.',
    minorTwoFive: 'iiø7 to V7(b9) to Imaj7 in all keys; then resolve the same ii-V to the minor i and compare.',
    pantriadic: 'Major triads a major third apart, C, E, Ab, C; keep one common tone and move the other two.',
    planeUp: 'I, ii, iii, IV as the same shape walking up; then walk it back down.',
    sequenceFifths: 'The descending-fifths sequence in all keys, with 7ths, in a steady tempo; it is the fastest way to learn every key.',
    lament: 'The lament bass in all minor keys: i, i/b7, bVI, V; then sing something sad over it.',
    slideMinorThird: 'Slide any m9 shape up a minor third and back; then by a tritone.',
    loopTwoFive: 'Loop ii9 to V13sus4 and write a melody that lives on the 9ths.',
    preacher: 'Diminished chords on every half step between I and IV, ascending, with the bass walking; then descending.',
    shadow: 'Play the progression and its mirror back to back; find which chord stayed the same and why.',
    compose: 'Play the whole phrase slowly, one hand at a time; then take out one move and see if you miss it.',
  };
  const teach = (family) => TEACH[family] || 'Play it slowly in three other keys today, melody on top; then use it once in a song you are writing.';

  return { midiFile, leadSheetPDF, teach, ascii };
})();
if (typeof module !== 'undefined') module.exports = Export;
