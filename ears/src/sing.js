/* ============================================================
   EARS — Sing module: tasks, expected sequences, evaluation with coach feedback
   ============================================================ */
(function (E) {
  const U = E.U, choice = U.choice, rnd = U.rnd;
  const TASKS = {
    1: ['scale:major', 'scale:majpent', 'arp:maj', 'int:M2', 'int:M3', 'int:P4', 'int:P5', 'int:M6', 'int:P8', 'echo'],
    2: ['scale:natmin', 'scale:harmmin', 'scale:minpent', 'arp:min', 'arp:dim', 'arp:aug', 'int:m2', 'int:m3', 'int:TT', 'int:m6', 'int:m7', 'int:M7', 'intd:P5', 'intd:P4', 'intd:M3', 'intd:m3', 'echo'],
    3: ['scale:dorian', 'scale:mixolydian', 'scale:lydian', 'scale:phrygian', 'scale:melmin', 'scale:blues', 'arp:maj7', 'arp:dom7', 'arp:m7', 'arp:m7b5', 'arp:dim7', 'intd:m6', 'intd:M6', 'intd:m7', 'intd:M7', 'intd:TT', 'echo'],
    4: ['cell:fi', 'cell:se', 'cell:li', 'cell:te', 'cell:si', 'cell:le', 'cell:ri', 'cell:me', 'cell:di', 'cell:ra', 'int:m9', 'int:M9', 'int:♯11', 'int:♭13', 'int:M13', 'arp:dom9', 'arp:maj9', 'arp:m9', 'arp:dom7b9', 'arp:dom7s11', 'echo'],
    5: ['scale:altered', 'scale:dimWH', 'scale:dimHW', 'scale:wholetone', 'scale:lyddom', 'scale:harmmaj', 'arp:alt', 'arp:dom13', 'arp:maj7s11', 'arp:m11', 'arp:six9', 'arp:m9maj7', 'echo']
  };
  function vocab(level) { return (TASKS[level] || TASKS[5]).map(t => 'sing:' + t); }

  function tonicFor(voice) {
    const base = voice === 'low' ? [45, 52] : voice === 'high' ? [57, 64] : [51, 58];
    return rnd(base[0], base[1]);
  }
  function sylOfPc(pc, scaleSyl) { // choose syllable name for a pc relative to tonic
    const s = E.SOLFEGE.find(x => x.pc === E.mod12(pc) && (!scaleSyl || scaleSyl.includes(x.id)));
    return s ? s.id : (E.SOLFEGE.find(x => x.pc === E.mod12(pc)) || { id: '?' }).id;
  }

  function genSing(level, o) {
    o = o || {}; const timbre = o.timbre;
    const list = TASKS[level] || TASKS[5];
    let task = o.target ? o.target.replace('sing:', '') : choice(list); if (!list.includes(task) && task !== 'echo') task = choice(list);
    const tonic = tonicFor(o.voice);
    const [kind, arg] = task.split(':');
    let expected = [], syls = [], title = '', instr = '', refEvents = [], keyLabel = '';
    const flat = E.prefersFlat(tonic, false);
    const tn = E.midiName(tonic, flat);
    if (kind === 'scale') {
      const sc = E.SCALES[arg]; const asc = E.scaleNotes(arg, tonic, 1);
      expected = level >= 3 ? asc.concat(asc.slice(0, -1).reverse()) : asc;
      syls = expected.map(m => sylOfPc(m - tonic, sc.syl));
      title = `Sing the ${sc.name}`; instr = `Starting on ${tn}, sing the ${sc.name}${level >= 3 ? ' up and back down' : ' ascending to the octave'}. Use solfege or any vowel.`;
      refEvents = [{ at: 0, dur: 1.2, notes: [tonic], timbre }];
    } else if (kind === 'arp') {
      const ch = E.CHORDS[arg]; const iv = ch.iv.slice(); expected = iv.map(i => tonic + i); if (iv.length <= 4) expected.push(tonic + 12);
      syls = expected.map(m => sylOfPc(m - tonic));
      title = `Sing the ${ch.name} arpeggio`; instr = `Root ${tn}. Sing ${E.pcName(tonic, flat)}${ch.sym} as an arpeggio from the root up${iv.length <= 4 ? ' to the octave' : ' through the tensions'}.`;
      refEvents = [{ at: 0, dur: 1.2, notes: [tonic], timbre }];
    } else if (kind === 'int' || kind === 'intd') {
      const iv = E.INTERVAL_BY_ID[arg]; const up = kind === 'int';
      const start = up ? tonic : tonic + Math.min(12, iv.s) + 2;
      expected = [start, up ? start + iv.s : start - iv.s];
      syls = up ? ['do', sylOfPc(iv.s)] : ['do', sylOfPc(-iv.s)];
      title = `Sing a ${iv.n} ${up ? 'up' : 'down'}`; instr = `You'll hear ${E.midiName(start, flat)}. Sing it, then sing the note a ${iv.n.toLowerCase()} ${up ? 'above' : 'below'}.`;
      refEvents = [{ at: 0, dur: 1.2, notes: [start], timbre }];
    } else if (kind === 'cell') {
      const res = E.TENDENCY[arg]; const cpc = E.SOL[arg].pc; const rpc = E.SOL[res].pc;
      let c = tonic + cpc; let r = tonic + rpc; const raised = E.CHROMATIC_RAISED.includes(arg);
      if (raised && r < c) r += 12; if (!raised && r > c) r -= 12; if (Math.abs(r - c) !== 1) { r = raised ? c + 1 : c - 1; }
      expected = [tonic, c, r]; syls = ['do', arg, res];
      title = `Sing Do – ${E.SYL_NAME[arg]} – ${E.SYL_NAME[res]}`; instr = `Do is ${tn}. Sing Do, then the chromatic tone ${E.SYL_NAME[arg]} (${E.SOL[arg].num}), then resolve it to ${E.SYL_NAME[res]}.`;
      refEvents = E.Gen.cadenceEvents(E.mod12(tonic), false, true, timbre).events;
    } else { // echo: sing back a melody
      const mel = E.Gen.genMelody(Math.min(level, 5), { timbre, melTimbre: timbre, shortCadence: true });
      expected = mel.melodyMidi.slice(); syls = mel.answer.slice();
      // transpose melody into voice range
      const shift = tonic - mel.tonic; expected = expected.map(m => m + shift);
      title = 'Echo: sing back the melody'; instr = `You'll hear the key, then a ${expected.length}-note phrase. Sing it back exactly (any octave).`;
      refEvents = mel.context.events.concat(mel.audio.events.map(ev => Object.assign({}, ev, { at: ev.at + mel.context.end + 0.4, notes: ev.notes.map(n => n + shift) })));
      keyLabel = mel.keyLabel;
    }
    const sysLabel = id => E.Gen.sylLabel(id, false, o.solfege);
    const playExpected = expected.map((m, i) => ({ at: i * 0.5, dur: 0.48, notes: [m], timbre }));
    return {
      module: 'sing', type: kind, level, task, title, prompt: title, instr, keyLabel,
      audio: { events: refEvents }, context: null, answerKind: 'sing', expected, syls, sylLabels: syls.map(sysLabel), tonic, items: ['sing:' + task],
      playExpected, explain: `Target: ${syls.map(sysLabel).join(' – ')}.`
    };
  }

  /* ---------- evaluation ---------- */
  function align(sung, exp) { // Needleman–Wunsch on midi (sung already shifted)
    const n = sung.length, m = exp.length; const D = []; const B = [];
    for (let i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(0)); B.push(new Array(m + 1).fill(null)); }
    for (let i = 1; i <= n; i++) { D[i][0] = i; B[i][0] = 'u'; }
    for (let j = 1; j <= m; j++) { D[0][j] = j; B[0][j] = 'l'; }
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
      const match = Math.abs(sung[i - 1] - exp[j - 1]) <= 0.5 ? 0 : 1.2;
      const a = D[i - 1][j - 1] + match, b = D[i - 1][j] + 1, c = D[i][j - 1] + 1;
      if (a <= b && a <= c) { D[i][j] = a; B[i][j] = 'd'; } else if (b <= c) { D[i][j] = b; B[i][j] = 'u'; } else { D[i][j] = c; B[i][j] = 'l'; }
    }
    const pairs = []; let i = n, j = m;
    while (i > 0 || j > 0) { const b = B[i][j]; if (b === 'd') { pairs.push([i - 1, j - 1]); i--; j--; } else if (b === 'u') { pairs.push([i - 1, null]); i--; } else { pairs.push([null, j - 1]); j--; } }
    return { cost: D[n][m], pairs: pairs.reverse() };
  }
  function evaluate(ex, notes) {
    const exp = ex.expected; const sungM = notes.map(n => n.midi + n.cents / 100);
    if (!notes.length) return { score: 0, text: 'I didn\'t catch any notes. Sing a little louder, closer to the mic, on a clear vowel (try "ah" or "oo").', rows: exp.map((m, i) => ({ syl: ex.sylLabels[i], status: 'missing' })) };
    let best = null;
    for (const k of [-24, -12, 0, 12, 24]) {
      const r = align(sungM.map(x => x + k), exp); if (!best || r.cost < best.cost) best = Object.assign({ k }, r);
    }
    const rows = exp.map((m, i) => ({ syl: ex.sylLabels[i], exp: m, status: 'missing', cents: null }));
    let extras = 0; const wrong = [];
    best.pairs.forEach(([si, ei]) => {
      if (si != null && ei != null) {
        const s = sungM[si] + best.k; const diff = s - exp[ei];
        if (Math.abs(diff) <= 0.5) { rows[ei].status = 'ok'; rows[ei].cents = Math.round(diff * 100); }
        else { rows[ei].status = 'wrong'; rows[ei].sang = E.Gen.sylLabel(sylRel(Math.round(s) - ex.tonic), false); rows[ei].cents = Math.round(diff * 100); wrong.push(rows[ei]); }
      } else if (si != null) extras++;
    });
    const hits = rows.filter(r => r.status === 'ok'); const missing = rows.filter(r => r.status === 'missing');
    const absC = hits.map(r => Math.abs(r.cents)); const avgC = absC.length ? Math.round(absC.reduce((a, b) => a + b, 0) / absC.length) : 0;
    let score = hits.length / exp.length; score -= 0.15 * Math.min(extras, 3) / exp.length; score = Math.max(0, score);
    const intonation = avgC <= 15 ? 1 : avgC <= 30 ? 0.9 : avgC <= 45 ? 0.8 : 0.65;
    score = Math.round(100 * score * intonation);
    // coach text
    let text = '';
    if (hits.length === exp.length && extras === 0) {
      text = avgC <= 15 ? `Clean. Every degree landed and your intonation stayed within ${Math.max(5, avgC)}¢ — that's professional accuracy.` : avgC <= 30 ? `All the right notes. Intonation averaged ${avgC}¢ off — tidy, but listen for the ones that drifted below.` : `Right shape, loose tuning (${avgC}¢ average). Slow it down and hold each note until it locks against your memory of the tonic.`;
    } else {
      const parts = [];
      if (wrong.length) parts.push(wrong.slice(0, 2).map(r => `where the line wants <b>${r.syl}</b> you sang <b>${r.sang}</b>`).join('; '));
      if (missing.length) parts.push(`missing: <b>${missing.map(r => r.syl).join(', ')}</b>`);
      if (extras) parts.push(`${extras} extra note${extras > 1 ? 's' : ''} crept in`);
      text = `You landed ${hits.length} of ${exp.length} — ` + parts.join('; ') + '. ';
      if (ex.type === 'scale' || ex.type === 'arp') text += 'Sing it half as fast, naming each degree, and check the tricky one against the piano before you go on.';
      else if (ex.type === 'cell') text += 'Hold the chromatic tone a moment longer and feel which way it leans before you resolve.';
      else if (ex.type === 'echo') text += 'Try humming the phrase on one vowel first, then add the syllables.';
      else text += 'Anchor the first note firmly, hear the target silently, then sing it.';
    }
    const sharpest = hits.filter(r => Math.abs(r.cents) >= 25).sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents))[0];
    if (sharpest) text += ` <span class="muted">${sharpest.syl} was ${Math.abs(sharpest.cents)}¢ ${sharpest.cents > 0 ? 'sharp' : 'flat'}.</span>`;
    return { score, text, rows, extras, avgC, k: best.k };
  }
  function sylRel(semis) { const pc = E.mod12(semis); const s = E.SOLFEGE.find(x => x.pc === pc && !x.up) || E.SOLFEGE.find(x => x.pc === pc); return s.id; }

  E.Sing = { TASKS, vocab, genSing, evaluate };
})(window.EARS = window.EARS || {});
