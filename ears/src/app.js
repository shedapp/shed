/* ============================================================
   EARS — App UI: views, session runner, sing runner, placement, settings, teacher tools
   ============================================================ */
(function (E) {
  const U = E.U, S = E.Store, A = E.Audio, G = E.Gen, N = E.Notation, R = E.Rhythm;
  const esc = U.esc;
  let st = null, tab = 'today';
  const $ = s => document.querySelector(s);
  const MI = S.MODULE_INFO, LN = S.LEVEL_NAMES;

  /* ---------- tiny UI helpers ---------- */
  let toastT = null;
  function toast(msg, ms) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.innerHTML = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms || 2200); }
  function sheet(html) {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet';
    bg.innerHTML = `<div class="sheet">${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); });
    document.body.appendChild(bg); return bg;
  }
  function closeSheet() { const s = $('#sheet'); if (s) s.remove(); }
  function copySheet(text) { sheet(`<div class="row between"><h2>Copy</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div><div class="small muted mt">Select all and copy:</div><textarea rows="6" class="mt" readonly onclick="this.select()">${esc(text)}</textarea>`); }
  function ringStyle(pct) { const c = pct >= 70 ? 'var(--ok)' : pct >= 35 ? 'var(--accent)' : 'var(--dim)'; return `background: conic-gradient(${c} ${pct * 3.6}deg, var(--card2) 0)`; }
  function levelPill(m) { return `<span class="lvl">L${st.levels[m]} · ${LN[st.levels[m]]}</span>`; }
  function sw(on) { return `<span class="switch ${on ? 'on' : ''}"></span>`; }

  /* ---------- rendering root ---------- */
  function render() {
    if (Sess.active) { renderSession(); $('nav.tabs').classList.add('hidden'); return; }
    $('nav.tabs').classList.remove('hidden');
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const v = $('#view'); v.scrollTop = 0;
    if (!st.profile.onboarded) { renderOnboarding(); return; }
    ({ today: renderToday, train: renderTrain, sing: renderSingTab, progress: renderProgress, me: renderMe })[tab]();
    $('#streak').textContent = '🔥 ' + S.streak();
  }
  function setTab(t) { tab = t; render(); }

  /* ================= ONBOARDING ================= */
  function renderOnboarding() {
    $('#view').innerHTML = `
      <div class="stack" style="padding-top:8px">
        <div class="card hero">
          <h1>Big ears, built daily.</h1>
          <p class="muted mt">EARS is a 24/7 ear-training tutor for serious musicians: functional hearing, harmony, rhythm and singing — spaced, interleaved and adaptive.</p>
        </div>
        <div class="card stack">
          <h3>Your name (optional)</h3>
          <input id="ob-name" placeholder="e.g. Martín" value="${esc(st.profile.name)}">
          <h3 class="mt">How do you hear pitch?</h3>
          <div class="seg" id="ob-pitch">
            <button data-v="developing" class="${st.profile.pitch === 'developing' ? 'on' : ''}">Developing</button>
            <button data-v="relative" class="${st.profile.pitch === 'relative' ? 'on' : ''}">Relative pitch</button>
            <button data-v="perfect" class="${st.profile.pitch === 'perfect' ? 'on' : ''}">Perfect pitch</button>
          </div>
          <div class="tiny muted">Perfect pitch turns on <b>Anti-absolute mode</b>: everything plays slightly detuned so you train relationships, not note names.</div>
          <h3 class="mt">Your voice sits…</h3>
          <div class="seg" id="ob-voice">
            <button data-v="low" class="${st.profile.voice === 'low' ? 'on' : ''}">Low (bass/baritone)</button>
            <button data-v="mid" class="${st.profile.voice === 'mid' ? 'on' : ''}">Mid (tenor/alto)</button>
            <button data-v="high" class="${st.profile.voice === 'high' ? 'on' : ''}">High (soprano)</button>
          </div>
          <h3 class="mt">Solfege system</h3>
          <div class="seg" id="ob-sol">
            <button data-v="do" class="${st.settings.solfege === 'do' ? 'on' : ''}">Movable Do (Do-based minor)</button>
            <button data-v="la" class="${st.settings.solfege === 'la' ? 'on' : ''}">La-based minor</button>
            <button data-v="num" class="${st.settings.solfege === 'num' ? 'on' : ''}">Numbers</button>
          </div>
        </div>
        <button class="btn primary block" data-act="ob-placement">Take the placement test (~6 min)</button>
        <button class="btn block" data-act="ob-skip">Start at Level 1 (I'll set levels myself)</button>
        <div class="tiny muted center">Levels follow the public Berklee ET1–4 + Harmonic Ear Training outline. All exercises are generated — no copyrighted course material.</div>
      </div>`;
    ['ob-pitch', 'ob-voice', 'ob-sol'].forEach(id => $('#' + id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#' + id).querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); }));
  }
  function finishOnboarding() {
    st.profile.name = $('#ob-name').value.trim();
    st.profile.pitch = $('#ob-pitch .on').dataset.v; st.profile.voice = $('#ob-voice .on').dataset.v; st.settings.solfege = $('#ob-sol .on').dataset.v;
    if (st.profile.pitch === 'perfect') st.settings.antiAbsolute = true;
    st.profile.onboarded = true; S.saveNow();
  }

  /* ================= TODAY ================= */
  function renderToday() {
    const due = S.dueCards().length; const name = st.profile.name ? `, ${esc(st.profile.name)}` : '';
    const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const asg = st.assignment;
    const todayStats = st.stats.days[U.today()] || { q: 0, c: 0, secs: 0 };
    $('#view').innerHTML = `
      <div class="stack">
        <div class="row between"><h1>${greet}${name}</h1><span class="pill acc">${st.stats.xp} XP</span></div>
        ${asg ? `<div class="card" style="border-color:rgba(79,209,197,0.45)">
          <div class="row between"><h3>📎 Assignment: ${esc(asg.title || 'Practice set')}</h3>${asg.due ? `<span class="pill">due ${esc(asg.due)}</span>` : ''}</div>
          <div class="small muted mt">${asg.by ? 'From ' + esc(asg.by) + ' · ' : ''}${asg.modules.map(m => MI[m].name + ' L' + (asg.levels[m] || st.levels[m])).join(' · ')} · ${asg.count} questions${asg.note ? '<br>“' + esc(asg.note) + '”' : ''}</div>
          <div class="row mt"><button class="btn teal grow" data-act="start-assignment">Start assignment</button><button class="btn sm ghost" data-act="drop-assignment">Dismiss</button></div>
        </div>` : ''}
        <div class="card hero">
          <div class="row between"><h2>Today's session</h2><span class="pill">~${Math.round(st.settings.sessionLen * 0.75)} min</span></div>
          <p class="muted small mt">${st.settings.sessionLen} questions, interleaved across your current levels${due ? ` · <b class="acc">${due} review${due > 1 ? 's' : ''} due</b>` : ''}. ${todayStats.q ? `Done today: ${todayStats.q} (${Math.round(100 * todayStats.c / todayStats.q)}%).` : ''}</p>
          <div class="row"><button class="btn primary grow" data-act="start-today">▶ Start</button>${due ? `<button class="btn" data-act="start-review">Reviews only</button>` : ''}</div>
        </div>
        ${(!st.placement && st.stats.q < 10) ? `<div class="card row between"><div><h3>New here?</h3><div class="small muted">An adaptive test (~6 min) places each skill at the right level.</div></div><button class="btn sm teal" data-act="ob-placement">Place me</button></div>` : ''}
        <div class="card">
          <div class="row between mb"><h3>Your levels</h3><button class="btn xs ghost" data-act="tab" data-tab="train">Change ›</button></div>
          <div class="row wrap">${S.MODULES.map(m => `<span class="pill" data-act="tab" data-tab="${m === 'sing' ? 'sing' : 'train'}">${MI[m].icon} ${MI[m].name} <b class="acc">L${st.levels[m]}</b></span>`).join('')}</div>
        </div>
        <div class="grid2">
          <button class="card" data-act="quick" data-m="intervals"><div class="row"><span style="font-size:22px">↕</span><div class="grow" style="text-align:left"><div class="b">Quick: Intervals</div><div class="tiny muted">10 questions</div></div></div></button>
          <button class="card" data-act="quick" data-m="progressions"><div class="row"><span style="font-size:22px">⟶</span><div class="grow" style="text-align:left"><div class="b">Quick: Progressions</div><div class="tiny muted">10 questions</div></div></div></button>
          <button class="card" data-act="quick" data-m="rhythm"><div class="row"><span style="font-size:22px">▮</span><div class="grow" style="text-align:left"><div class="b">Quick: Rhythm</div><div class="tiny muted">10 questions</div></div></div></button>
          <button class="card" data-act="tab" data-tab="sing"><div class="row"><span style="font-size:22px">🎤</span><div class="grow" style="text-align:left"><div class="b">Sing it</div><div class="tiny muted">scales · intervals · echo</div></div></div></button>
        </div>
        <button class="card row between" data-act="method"><div style="text-align:left"><h3>Why it works</h3><div class="small muted">Spacing, interleaving, discrimination drills, production.</div></div><span class="muted">›</span></button>
        ${asg ? '' : `<button class="btn ghost small" data-act="assign-code">Have an assignment code from your teacher? Enter it</button>`}
      </div>`;
  }

  /* ================= TRAIN ================= */
  function renderTrain() {
    $('#view').innerHTML = `<div class="stack">
      <div class="row between"><h1>Train</h1><button class="btn sm" data-act="start-mixed">Mixed 20</button></div>
      ${S.MODULES.map(m => { const lm = S.levelMastery(m, st.levels[m]); return `
        <button class="modcard" data-act="module" data-m="${m}">
          <div class="ic">${MI[m].icon}</div>
          <div class="grow"><div class="name">${MI[m].name} <span class="lvl">· L${st.levels[m]} ${LN[st.levels[m]]}</span></div><div class="blurb">${MI[m].blurb}</div></div>
          <div class="ring" style="${ringStyle(lm.pct)}"><span>${lm.pct}%</span></div>
        </button>`; }).join('')}
    </div>`;
  }
  function moduleSheet(m) {
    if (m === 'sing') { closeSheet(); setTab('sing'); return; }
    const lvl = st.levels[m]; const lm = S.levelMastery(m, lvl); const tc = S.topConfusions(m, 3);
    const bm = st.stats.byModule[m] || { q: 0, c: 0 };
    const html = `
      <div class="row between"><h2>${MI[m].icon} ${MI[m].name}</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>
      <div class="small muted mb">${MI[m].blurb}</div>
      <div class="levels" id="lvl-pick">${[1, 2, 3, 4, 5].map(l => `<button class="${l === lvl ? 'on' : ''}" data-act="set-level" data-m="${m}" data-l="${l}">L${l}<div class="tiny" style="font-weight:600">${LN[l]}</div></button>`).join('')}</div>
      <div class="small muted mt">${S.LEVEL_BLURB[lvl]}</div>
      <div class="mt"><div class="row between small"><span>Mastery at this level</span><span class="b">${lm.pct}% · ${lm.seen}/${lm.total} items seen</span></div><div class="bar mt" style="margin-top:6px"><i style="width:${lm.pct}%"></i></div></div>
      ${bm.q ? `<div class="small muted mt">${bm.q} answered · ${Math.round(100 * bm.c / bm.q)}% correct overall${S.levelUpReady(m) ? ' · <b class="ok">ready for the next level ↑</b>' : ''}</div>` : ''}
      ${tc.length ? `<div class="mt small"><span class="muted">You confuse:</span> ${tc.map(t => `<span class="pill bad">${t.pair.map(stripId).join(' ↔ ')} ×${t.n}</span>`).join(' ')}</div>` : ''}
      ${m === 'rhythm' ? `<div class="mt"><div class="small muted mb">Format</div><div class="seg" id="rh-sub"><button class="on" data-v="">Mixed</button><button data-v="dictation">Dictation</button><button data-v="error">Error spotting</button><button data-v="tap">Tap-back</button></div></div>` : ''}
      <div class="grid2 mt2">
        <button class="btn primary" data-act="start-module" data-m="${m}" data-n="10">Start 10</button>
        <button class="btn" data-act="start-module" data-m="${m}" data-n="20">Start 20</button>
        ${tc.length ? `<button class="btn teal" data-act="start-focus" data-m="${m}" style="grid-column:1/-1">Focus drill: ${tc[0].pair.map(stripId).join(' vs ')}</button>` : ''}
      </div>`;
    sheet(html);
    const seg = $('#rh-sub'); if (seg) seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  }
  function stripId(id) { return id.replace(/^(deg|ch|sc|tok|rc|inv|mode|mod|sing):/, '').replace(/:(asc|desc|harm)$/, m => ({ ':asc': ' ↑', ':desc': ' ↓', ':harm': ' ⫽' })[m]); }

  /* ================= SING TAB ================= */
  function renderSingTab() {
    const lvl = st.levels.sing; const tasks = E.Sing.TASKS[lvl];
    const label = t => { const [k, a] = t.split(':'); if (k === 'scale') return 'Sing: ' + E.SCALES[a].name; if (k === 'arp') return 'Arpeggio: ' + E.CHORDS[a].name; if (k === 'int') return 'Interval up: ' + E.INTERVAL_BY_ID[a].n; if (k === 'intd') return 'Interval down: ' + E.INTERVAL_BY_ID[a].n; if (k === 'cell') return `Tendency cell: Do–${E.SYL_NAME[a]}–${E.SYL_NAME[E.TENDENCY[a]]}`; return 'Echo: sing back a melody'; };
    $('#view').innerHTML = `<div class="stack">
      <div class="row between"><h1>Sing</h1><span class="lvl">L${lvl} · ${LN[lvl]}</span></div>
      <div class="card"><div class="small muted">You can't reliably hear what you can't sing. The mic checks every note (any octave) and gives coach-style feedback. Use a quiet room and a clear vowel.</div>
        <div class="levels mt" id="sing-lvl">${[1, 2, 3, 4, 5].map(l => `<button class="${l === lvl ? 'on' : ''}" data-act="set-level" data-m="sing" data-l="${l}" data-stay="1">L${l}</button>`).join('')}</div>
      </div>
      <div class="grid2"><button class="btn primary" data-act="sing-set">Practice set (6)</button><button class="btn" data-act="sing-task" data-t="echo">Echo a melody</button></div>
      <div class="card pad0">${tasks.filter(t => t !== 'echo').map(t => { const c = st.cards['sing:' + t]; const m = S.mastery(c); return `<button class="modcard" style="border:none;border-bottom:1px solid var(--line);border-radius:0" data-act="sing-task" data-t="${t}"><div class="grow"><div class="name">${label(t)}</div></div><div class="ring" style="${ringStyle(Math.round(m * 100))};width:36px;height:36px"><span style="width:28px;height:28px;font-size:9px">${c && c.reps ? Math.round(m * 100) + '%' : '–'}</span></div></button>`; }).join('')}</div>
    </div>`;
  }

  /* ================= PROGRESS ================= */
  function renderProgress() {
    const s = st.stats; const acc = s.q ? Math.round(100 * s.c / s.q) : 0;
    const days = []; const t = U.today(); for (let i = 55; i >= 0; i--) { const d = U.dayOffset(t, -i); const v = s.days[d]; days.push(v ? (v.q >= 30 ? 'd3' : v.q >= 12 ? 'd2' : 'd1') : ''); }
    $('#view').innerHTML = `<div class="stack">
      <h1>Progress</h1>
      <div class="statgrid"><div class="stat"><div class="v num">${s.q}</div><div class="k">answered</div></div><div class="stat"><div class="v num">${acc}%</div><div class="k">accuracy</div></div><div class="stat"><div class="v num">${U.fmtMin(s.secs)}</div><div class="k">practiced</div></div></div>
      <div class="card"><div class="row between mb"><h3>Last 8 weeks</h3><span class="pill">🔥 ${S.streak()}-day streak</span></div><div class="cal">${days.map(c => `<i class="${c}"></i>`).join('')}</div></div>
      ${S.MODULES.map(m => { const lvl = st.levels[m]; const lm = S.levelMastery(m, lvl); const bm = s.byModule[m] || { q: 0, c: 0 }; const tc = S.topConfusions(m, 3); const racc = S.recentAccuracy(m, 20);
      const v = S.vocab(m, lvl); const items = v.map(id => ({ id, m: S.mastery(st.cards[id]), seen: st.cards[id] && st.cards[id].reps })).sort((a, b) => a.m - b.m);
      return `<div class="card">
        <div class="row between"><h3>${MI[m].icon} ${MI[m].name}</h3><span class="lvl">L${lvl} ${LN[lvl]}</span></div>
        <div class="bar mt"><i style="width:${lm.pct}%"></i></div>
        <div class="row between small muted mt" style="margin-top:6px"><span>mastery ${lm.pct}% · ${lm.seen}/${lm.total} seen</span><span>${bm.q} answered${racc !== null ? ' · last 20: ' + Math.round(100 * racc) + '%' : ''}</span></div>
        ${S.levelUpReady(m) ? `<button class="btn xs teal mt" data-act="set-level" data-m="${m}" data-l="${lvl + 1}" data-stay="1">Ready: move to L${lvl + 1} ↑</button>` : ''}
        <div class="conf mt">${items.slice(0, 24).map(it => `<span class="chip ${!it.seen ? '' : it.m >= 0.7 ? 'ok' : it.m >= 0.4 ? 'warn' : 'bad'}" style="padding:3px 7px;font-size:11.5px;border-radius:7px;${!it.seen ? 'opacity:.5' : ''}">${esc(stripId(it.id))}${it.seen ? ' ' + Math.round(it.m * 100) : ''}</span>`).join('')}</div>
        ${tc.length ? `<div class="small mt"><span class="muted">Confusions:</span> ${tc.map(x => `<span class="pill bad">${x.pair.map(stripId).join(' ↔ ')} ×${x.n}</span>`).join(' ')}</div>` : ''}
      </div>`; }).join('')}
      <div class="card stack"><h3>Share with your teacher</h3><div class="small muted">Export a plain-text report or your full data (JSON) — import it on another device to continue.</div>
        <div class="grid2"><button class="btn" data-act="export-report">Copy report</button><button class="btn" data-act="export-json">Copy all data</button></div>
        <div class="grid2"><button class="btn ghost" style="border:1px dashed var(--line2)" data-act="import-paste">Paste data to import</button><label class="btn ghost small" style="border:1px dashed var(--line2)">Import a file <input type="file" id="import-file" accept="application/json,text/plain" class="hidden"></label></div>
      </div>
    </div>`;
    const f = $('#import-file'); if (f) f.addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { if (S.importJSON(rd.result)) { st = S.get(); toast('Imported ✓'); render(); } else toast('Could not import that file'); }; rd.readAsText(file); });
  }

  /* ================= ME / SETTINGS ================= */
  function renderMe() {
    const s = st.settings, p = st.profile;
    const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`;
    $('#view').innerHTML = `<div class="stack">
      <h1>Me</h1>
      <div class="card">
        <div class="setting"><div><div class="k">Name</div></div><input id="s-name" value="${esc(p.name)}" style="max-width:180px" placeholder="optional"></div>
        <div class="setting"><div><div class="k">Pitch profile</div><div class="d">Perfect pitch → anti-absolute mode recommended</div></div><select id="s-pitch" style="max-width:160px">${opt('developing', p.pitch, 'Developing')}${opt('relative', p.pitch, 'Relative pitch')}${opt('perfect', p.pitch, 'Perfect pitch')}</select></div>
        <div class="setting"><div><div class="k">Voice range</div><div class="d">Where the Sing module places Do</div></div><select id="s-voice" style="max-width:160px">${opt('low', p.voice, 'Low')}${opt('mid', p.voice, 'Mid')}${opt('high', p.voice, 'High')}</select></div>
      </div>
      <div class="card">
        <h3 class="mb">Sound</h3>
        <div class="setting"><div><div class="k">Instrument</div><div class="d">${({ sampled: 'Salamander grand piano — sampled, three dynamic layers', loading: 'Grand piano samples loading…', synth: 'Piano samples unavailable here — synthesized stand-in', none: 'Preview build — synthesized piano; the hosted app plays the sampled grand' })[A.pianoStatus()]}</div></div><select id="s-timbre" style="max-width:160px">${Object.entries(A.TIMBRE_NAMES).map(([k, v]) => opt(k, s.timbre, v)).join('')}</select></div>
        <div class="setting" data-act="toggle" data-k="varyTimbre"><div><div class="k">Vary the instrument</div><div class="d">Random timbre per question (perceptual generalization). Always on at L5.</div></div>${sw(s.varyTimbre)}</div>
        <div class="setting" data-act="toggle" data-k="antiAbsolute"><div><div class="k">Anti-absolute mode</div><div class="d">Random ±50¢ detune per question so note names can't help</div></div>${sw(s.antiAbsolute)}</div>
        <div class="setting"><div><div class="k">Rhythm tempo</div><div class="d">${Math.round(80 * s.tempo)} bpm (♩ in simple meters)</div></div><input type="range" id="s-tempo" min="0.7" max="1.5" step="0.05" value="${s.tempo}" style="max-width:150px"></div>
        <div class="setting"><div><div class="k">Key establishment</div><div class="d">Cadence before degrees / melodies</div></div><select id="s-cad" style="max-width:160px">${opt('full', s.cadence, 'I – IV – V7 – I')}${opt('short', s.cadence, 'I – V7 – I')}</select></div>
      </div>
      <div class="card">
        <h3 class="mb">Display & flow</h3>
        <div class="setting"><div><div class="k">Solfege</div></div><select id="s-sol" style="max-width:190px">${opt('do', s.solfege, 'Movable Do · Do-based minor')}${opt('la', s.solfege, 'Movable Do · La-based minor')}${opt('num', s.solfege, 'Scale-degree numbers')}</select></div>
        <div class="setting"><div><div class="k">Roman numerals</div></div><select id="s-rn" style="max-width:190px">${opt('berklee', s.numeralStyle, 'Berklee (II–7 V7 IMaj7)')}${opt('low', s.numeralStyle, 'Classical (ii7 V7 Imaj7)')}</select></div>
        <div class="setting" data-act="toggle" data-k="songCues"><div><div class="k">Song cues for intervals</div><div class="d">Levels 1–2 only; training wheels</div></div>${sw(s.songCues)}</div>
        <div class="setting" data-act="toggle" data-k="autoPlay"><div><div class="k">Auto-play each question</div></div>${sw(s.autoPlay)}</div>
        <div class="setting" data-act="toggle" data-k="autoAdvance"><div><div class="k">Auto-advance after correct</div></div>${sw(s.autoAdvance)}</div>
        <div class="setting"><div><div class="k">Daily session length</div></div><select id="s-len" style="max-width:140px">${[10, 15, 20, 30].map(n => opt(n, s.sessionLen, n + ' questions')).join('')}</select></div>
        <div class="setting" data-act="toggle" data-k="light"><div><div class="k">Light theme</div></div>${sw(s.theme === 'light')}</div>
      </div>
      <div class="card stack">
        <h3>Teacher tools</h3>
        <div class="small muted">Build an assignment link: students open it, the app sets the modules and levels, and returns a result code you can decode here.</div>
        <div class="grid2"><button class="btn" data-act="assign-builder">Create assignment link</button><button class="btn" data-act="decode-result">Decode a result code</button></div>
        ${st.assignmentResults.length ? `<div class="small muted">Your completed assignments: ${st.assignmentResults.length} — <button class="btn xs" data-act="show-results">show codes</button></div>` : ''}
      </div>
      <div class="card stack">
        <h3>About</h3>
        <div class="small muted">EARS · ear training for elite musicians. Part of the Shed / Changes family. Levels mirror the public Berklee ET1–4 and Harmonic Ear Training course outlines; every exercise is generated by the app's own engine. Piano: Salamander Grand (CC BY 3.0). Keyboard: <span class="kbd">space</span> replay · <span class="kbd">1–9</span> answer · <span class="kbd">↵</span> next. Build ${BUILD}.</div>
        <div class="grid2"><button class="btn" data-act="method">Why it works</button><button class="btn" data-act="curriculum">Curriculum map</button></div>
        <button class="btn danger block" data-act="reset">Reset all progress</button>
      </div>
    </div>`;
    const bind = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('change', () => { fn(el.value); S.save(); renderMe(); }); };
    bind('s-name', v => st.profile.name = v.trim()); bind('s-pitch', v => st.profile.pitch = v); bind('s-voice', v => st.profile.voice = v);
    bind('s-timbre', v => s.timbre = v); bind('s-tempo', v => s.tempo = +v); bind('s-cad', v => s.cadence = v); bind('s-sol', v => s.solfege = v); bind('s-rn', v => s.numeralStyle = v); bind('s-len', v => s.sessionLen = +v);
  }

  /* ================= SHEETS: method, curriculum, assignment ================= */
  function methodSheet() {
    sheet(`<div class="row between"><h2>Why it works</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>
      <ul class="why mt">
        <li><b>Spaced repetition.</b> Every interval, degree, chord, Roman-numeral token and rhythm cell is a card. Misses come back today; hits come back in days, then weeks.</li>
        <li><b>Interleaving.</b> Sessions mix skills, keys and registers. Studies of interval learning show interleaved practice transfers better than drilling one thing in a block.</li>
        <li><b>Discrimination drills.</b> The app tracks exactly what you confuse (m6 ↔ M6, Dorian ↔ Aeolian) and schedules two-choice drills on that pair.</li>
        <li><b>Retrieval + contrast feedback.</b> You commit before you see the answer. When you're wrong you hear the correct item and your choice back to back.</li>
        <li><b>Variability.</b> Random keys, registers and (at L5) instruments, so recognition isn't tied to one piano sound.</li>
        <li><b>Anti-absolute mode.</b> For perfect-pitch ears everything plays slightly detuned: you must hear relationships, not letters.</li>
        <li><b>Production, not only recognition.</b> The Sing module checks your pitch note by note. If you can't sing Le, you don't own it yet.</li>
        <li><b>Functional hearing.</b> Degrees always follow a cadence; chromatic tones come with their resolution (tendency tones), the way the Berklee sequence teaches them.</li>
        <li><b>Chunking.</b> Progressions are learned as idioms (II–V–I, V7/II → II–7), rhythms as beat-sized cells.</li>
        <li><b>Daily, short, visible.</b> Streaks, mastery rings and a confusion list give the student a tutor's eye between lessons — and give the teacher a report.</li>
      </ul>`);
  }
  function curriculumSheet() {
    sheet(`<div class="row between"><h2>Curriculum map</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>
      <div class="small muted mt mb">Levels follow the public Berklee course descriptions. Exercises are original and generated; course books can be mapped in later with the school's approval.</div>
      <table class="map"><tr><th>Level</th><th>Mirrors</th><th>What you train</th></tr>
      <tr><td><b>1 Major</b></td><td>ET1</td><td>Major keys, diatonic triads, intervals inside the octave, 2/4 3/4 4/4 with 16ths</td></tr>
      <tr><td><b>2 Minor</b></td><td>ET2</td><td>Minor keys (Me Le Te), diatonic 7ths, 6/8, syncopation, ties, descending intervals</td></tr>
      <tr><td><b>3 Modes</b></td><td>ET3</td><td>Dorian · Phrygian · Lydian · Mixolydian, harmonic & melodic minor, secondary dominants, triplets, 12/8, harmonic intervals, inversions</td></tr>
      <tr><td><b>4 Chromatic</b></td><td>ET4</td><td>Fi/Se · Li/Te · Si/Le · Ri/Me · Di/Ra with resolutions, V7/II…V7/VI, modal interchange, subV7, passing °7, tensions, compound intervals, 5/4 7/4 3/2 6/4 5/8 7/8</td></tr>
      <tr><td><b>5 Harmonic</b></td><td>Harmonic ET 1–2</td><td>Altered dominants & upper structures, secondary II–V, modulation, symmetric scales, 9/8 10/8 11/8, changing meters, quintuplets, random timbres</td></tr></table>`);
  }
  function assignmentBuilder() {
    sheet(`<div class="row between"><h2>Assignment link</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>
      <div class="stack mt">
        <input id="as-title" placeholder="Title (e.g. Week 6 — secondary dominants)">
        <input id="as-by" placeholder="Your name (shown to students)" value="${esc(st.profile.name)}">
        <div class="small muted">Modules & level</div>
        ${S.MODULES.filter(m => m !== 'sing').map(m => `<div class="row between"><label class="row"><input type="checkbox" class="as-m" value="${m}" style="width:auto"> ${MI[m].name}</label><select class="as-l" data-m="${m}" style="max-width:120px">${[1, 2, 3, 4, 5].map(l => `<option value="${l}" ${l === st.levels[m] ? 'selected' : ''}>L${l} ${LN[l]}</option>`).join('')}</select></div>`).join('')}
        <div class="row"><span class="small muted">Questions</span><select id="as-n" style="max-width:100px">${[10, 15, 20, 30, 40].map(n => `<option ${n === 20 ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="small muted">Due</span><input type="date" id="as-due" style="max-width:160px"></div>
        <input id="as-note" placeholder="Note to students (optional)">
        <button class="btn primary" data-act="assign-make">Generate link</button>
        <div id="as-out"></div>
      </div>`);
  }
  function makeAssignment() {
    const mods = Array.from(document.querySelectorAll('.as-m:checked')).map(x => x.value); if (!mods.length) { toast('Pick at least one module'); return; }
    const levels = {}; document.querySelectorAll('.as-l').forEach(sel => { if (mods.includes(sel.dataset.m)) levels[sel.dataset.m] = +sel.value; });
    const a = { t: 'ears-assign', id: U.uid(), title: $('#as-title').value.trim() || 'Practice set', by: $('#as-by').value.trim(), modules: mods, levels, count: +$('#as-n').value, due: $('#as-due').value, note: $('#as-note').value.trim() };
    const code = U.b64enc(a); const url = location.href.split('#')[0] + '#a=' + code;
    $('#as-out').innerHTML = `<div class="small muted">Assignment code — students paste it under <b>Today → Enter assignment code</b>:</div><div class="code mt">${esc(code)}</div><div class="row mt"><button class="btn sm" data-act="copy" data-text="${esc(code)}">Copy code</button><button class="btn sm ghost" data-act="copy" data-text="${esc(url)}">Copy as link</button></div><div class="tiny muted mt">The link form works when EARS is hosted at its own address (e.g. GitHub Pages); inside a preview, use the code.</div>`;
  }
  function decodeResultSheet() {
    sheet(`<div class="row between"><h2>Decode result</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>
      <div class="stack mt"><textarea id="dec-in" rows="4" placeholder="Paste the student's result code"></textarea><button class="btn primary" data-act="decode-go">Decode</button><div id="dec-out"></div></div>`);
  }
  function decodeResult() {
    const r = U.b64dec($('#dec-in').value.trim()); const out = $('#dec-out');
    if (!r || r.t !== 'ears-result') { out.innerHTML = '<div class="bad small">Not a valid result code.</div>'; return; }
    out.innerHTML = `<div class="card"><h3>${esc(r.title)}</h3><div class="small muted">${esc(r.student || 'unnamed student')} · ${esc(r.date)}</div>
      <div class="statgrid mt"><div class="stat"><div class="v">${r.q}</div><div class="k">questions</div></div><div class="stat"><div class="v">${r.pct}%</div><div class="k">accuracy</div></div><div class="stat"><div class="v">${U.fmtMin(r.secs)}</div><div class="k">time</div></div></div>
      <div class="small mt">${Object.entries(r.mods || {}).map(([m, v]) => `${MI[m] ? MI[m].name : m} L${v.l}: ${v.c}/${v.q}`).join(' · ')}</div>
      ${r.weak && r.weak.length ? `<div class="small mt"><span class="muted">Weak items:</span> ${r.weak.map(esc).join(', ')}</div>` : ''}</div>`;
  }

  /* ================= SESSION RUNNER ================= */
  const Sess = { active: false, mode: 'session', queue: [], idx: 0, ex: null, answered: false, results: [], sel: [], slots: [], activeSlot: 0, taps: [], tapState: 'idle', playing: false, audioEnd: 0, qStart: 0, chosen: null, sing: null, placement: null, startedAt: 0 };

  function pickTimbre(level) { const s = st.settings; if (s.varyTimbre || level >= 5) return U.choice(['piano', 'piano', 'ep', 'pad', 'sine']); return s.timbre; }
  function makeExercise(spec) {
    const m = spec.module; const level = U.clamp(spec.level || st.levels[m] || 1, 1, 5); const s = st.settings;
    const strip = id => id ? id.replace(/^(deg|ch|sc|tok|rc|inv|mode|mod|sing):/, '') : id;
    const timbre = pickTimbre(level);
    const o = { timbre, melTimbre: timbre === 'piano' ? 'ep' : 'piano', target: spec.target, pair: spec.pair ? spec.pair.map(p => m === 'intervals' ? p : strip(p)) : undefined, songCues: s.songCues && level <= 2, solfege: s.solfege, numeralStyle: s.numeralStyle, shortCadence: s.cadence === 'short', tempo: s.tempo, voice: st.profile.voice, sub: spec.sub, allowTap: spec.allowTap };
    if (m === 'intervals' && o.pair) o.pair = o.pair.map(p => p.split(':')[0]);
    A.setDetuneCents(s.antiAbsolute ? U.rnd(-50, 50) : 0);
    let ex;
    switch (m) {
      case 'intervals': ex = G.genInterval(level, o); break;
      case 'degrees': ex = G.genDegree(level, o); break;
      case 'melody': ex = G.genMelody(level, o); break;
      case 'chords': ex = G.genChord(level, o); break;
      case 'scales': ex = G.genScale(level, o); break;
      case 'progressions': ex = G.genProgression(level, o); break;
      case 'rhythm': ex = G.genRhythm(level, o); break;
      case 'sing': ex = E.Sing.genSing(level, o); break;
    }
    ex.why = spec.why; ex.level = level; return ex;
  }
  function startSession(opts) {
    A.ensure();
    Sess.active = true; Sess.mode = opts.mode || 'session'; Sess.results = []; Sess.idx = 0; Sess.startedAt = Date.now(); Sess.placement = null; Sess.assignment = opts.assignment || null;
    Sess.queue = opts.queue || S.buildSession(opts);
    if (opts.levelOverride) Sess.queue.forEach(q => { if (opts.levelOverride[q.module]) q.level = opts.levelOverride[q.module]; });
    if (opts.sub) Sess.queue.forEach(q => q.sub = opts.sub);
    nextQuestion();
  }
  function startPlacement() {
    A.ensure();
    Sess.active = true; Sess.mode = 'placement'; Sess.results = []; Sess.idx = 0; Sess.startedAt = Date.now();
    Sess.placement = { modules: ['intervals', 'degrees', 'chords', 'progressions', 'scales', 'rhythm'], mi: 0, lvl: 2, n: 0, c: 0, best: {}, asked: 0 };
    Sess.queue = [{ module: 'intervals', level: 2, why: 'placement' }];
    nextQuestion();
  }
  // Two questions per level, starting at L2: 2/2 → climb, 1/2 → place here, 0/2 → place one below.
  function placementNext(correct) {
    const P = Sess.placement; const m = P.modules[P.mi];
    P.n++; if (correct) P.c++; P.asked++;
    if (P.n >= 2) {
      let placed = null;
      if (P.c === 2) { if (P.lvl >= 5) placed = 5; else P.lvl++; }
      else if (P.c === 1) placed = P.lvl;
      else placed = Math.max(1, P.lvl - 1);
      P.n = 0; P.c = 0;
      if (placed !== null) { P.best[m] = placed; P.mi++; P.lvl = 2; }
    }
    if (P.mi >= P.modules.length) return null;
    return { module: P.modules[P.mi], level: P.lvl, why: 'placement', sub: P.modules[P.mi] === 'rhythm' ? 'dictation' : undefined };
  }
  function nextQuestion() {
    A.stopAll();
    if (Sess.idx >= Sess.queue.length) { finishSession(); return; }
    const spec = Sess.queue[Sess.idx];
    try { Sess.ex = makeExercise(spec); } catch (e) { console.error(e); Sess.idx++; nextQuestion(); return; }
    Sess.answered = false; Sess.sel = []; Sess.slots = []; Sess.activeSlot = 0; Sess.taps = []; Sess.tapState = 'idle'; Sess.chosen = null; Sess.audioEnd = 0; Sess.qStart = performance.now(); Sess.firstPlay = true; Sess.showNotation = false; Sess.sing = { phase: 'idle', notes: [], result: null, live: null };
    renderSession();
    if (st.settings.autoPlay && Sess.ex.module !== 'sing' && Sess.ex.type !== 'tap') setTimeout(() => { if (Sess.active && !Sess.answered) playPrompt(); }, 350);
  }
  function playPrompt(forceContext) {
    const ex = Sess.ex; if (!ex) return; A.stopAll();
    let events = [], off = 0;
    const withCtx = (forceContext || Sess.firstPlay) && ex.context && ['degrees', 'melody', 'progressions'].includes(ex.module);
    if (withCtx) { events = events.concat(ex.context.events); off = ex.context.end + 0.4; }
    events = events.concat(ex.audio.events.map(e => Object.assign({}, e, { at: e.at + off })));
    Sess.firstPlay = false;
    const h = A.playScore(events); setPlaying(true);
    h.promise.then(() => { setPlaying(false); if (!Sess.audioEnd) Sess.audioEnd = performance.now(); });
  }
  function playContext() { const ex = Sess.ex; if (!ex || !ex.context) return; A.stopAll(); const h = A.playScore(ex.context.events); setPlaying(true); h.promise.then(() => setPlaying(false)); }
  function setPlaying(on) { Sess.playing = on; const b = $('#play-btn'); if (b) { b.classList.toggle('playing', on); b.innerHTML = on ? '◼ Playing…' : (Sess.ex.type === 'tap' ? '▶ Listen, then tap' : '▶ Listen again'); } }

  function renderSession() {
    const ex = Sess.ex; if (!ex) return;
    $('nav.tabs').classList.add('hidden');
    const n = Sess.mode === 'placement' ? Sess.placement.modules.length * 4 : Sess.queue.length;
    const i = Sess.mode === 'placement' ? Math.min(n - 1, Sess.placement.mi * 4 + Math.min(3, Sess.placement.n + (Sess.placement.lvl - 2) * 2)) : Sess.idx;
    const why = { review: '↻ review', focus: '🎯 focus', new: '✦ new', placement: 'placement', practice: '' }[ex.why] || '';
    $('#view').innerHTML = `
      <div class="sess-head"><button class="btn xs ghost" data-act="quit" title="End session">✕</button>
        <div class="grow"><div class="row between small"><span class="b">${MI[ex.module].icon} ${MI[ex.module].name} <span class="lvl">L${ex.level} ${LN[ex.level]}</span></span><span class="muted num">${i + 1} / ${n}</span></div><div class="progress"><i style="width:${(100 * i / n).toFixed(1)}%"></i></div></div></div>
      <div class="prompt">${ex.prompt}</div>
      <div class="row small muted">${ex.keyLabel ? `<span class="pill">Key: ${esc(ex.keyLabel)}</span>` : ''}${why ? `<span class="pill">${why}</span>` : ''}${st.settings.antiAbsolute && ex.module !== 'rhythm' && ex.module !== 'sing' ? '<span class="pill" title="Anti-absolute: detuned">≈ detuned</span>' : ''}</div>
      ${ex.module === 'sing' ? '' : `<div class="listen"><button class="btn big primary" id="play-btn" data-act="play">${ex.type === 'tap' ? '▶ Listen, then tap' : '▶ Listen'}</button>${ex.context ? `<button class="btn" data-act="ctx">${esc(ex.context.label)}</button>` : ''}</div>`}
      ${ex.svg && ex.type !== 'tap' ? `<div class="svgbox mb">${ex.svg}</div>` : ''}
      <div id="answer-area">${renderAnswerArea(ex)}</div>
      <div id="feedback"></div>`;
    if (ex.module === 'sing') renderSingPanel();
  }
  function renderAnswerArea(ex) {
    if (ex.answerKind === 'choice') return renderChoices(ex);
    if (ex.answerKind === 'sequence') return renderSequence(ex);
    if (ex.answerKind === 'multi') return renderMulti(ex);
    if (ex.answerKind === 'tap') return `<div class="svgbox mb ${Sess.answered || Sess.showNotation ? '' : 'hidden'}" id="tap-svg">${ex.svg}</div><div class="tappad" id="tappad" data-act="tap"><div id="tap-label">TAP</div><div class="sub" id="tap-sub">press Listen first · space bar works too</div></div><div class="row mt"><button class="btn xs ghost" data-act="toggle-notation">${Sess.showNotation ? 'Hide notation' : 'Show notation (sight-reading mode)'}</button></div>`;
    if (ex.answerKind === 'sing') return `<div id="sing-panel"></div>`;
    return '';
  }
  function renderChoices(ex) {
    const opts = ex.options;
    if (ex.module === 'degrees') {
      const dia = opts.filter(o => !E.CHROMATIC_RAISED.includes(o.id) && !E.CHROMATIC_LOWERED.includes(o.id) || (ex.level <= 3 && ['me', 'le', 'te', 'ra', 'fi', 'se'].includes(o.id)));
      const chr = opts.filter(o => !dia.includes(o));
      const btn = (o, k) => `<button class="ans" data-act="choose" data-id="${esc(o.id)}" data-key="${k}"><span class="l">${esc(o.label)}</span><span class="s">${esc(o.sub)}</span></button>`;
      return `<div class="ladder" style="grid-template-columns:repeat(${Math.min(7, dia.length)},1fr)">${dia.map((o, k) => btn(o, k + 1)).join('')}</div>` + (chr.length ? `<div class="tiny muted mt">chromatic</div><div class="ladder chrom">${chr.map((o, k) => btn(o, 0)).join('')}</div>` : '');
    }
    if (ex.module === 'rhythm' && ex.type === 'dictation') return `<div class="answers">${opts.map((o, k) => `<button class="ans svgopt" data-act="choose" data-id="${o.id}" data-key="${k + 1}"><div class="row"><span class="pill" style="margin-bottom:4px">${k + 1}</span></div>${o.svg}</button>`).join('')}</div>`;
    const wide = ex.module === 'scales' || ex.type === 'modulation' || opts.some(o => (o.label || '').length > 14);
    const cols = wide ? '' : opts.length <= 4 ? 'cols2' : opts.length <= 9 ? 'cols3' : 'cols4';
    return `<div class="answers ${cols}">${opts.map((o, k) => `<button class="ans ${wide ? 'wide' : ''}" data-act="choose" data-id="${esc(o.id)}" data-key="${k + 1}"><span class="l">${esc(o.label)}</span><span class="s">${esc(o.sub || '')}</span></button>`).join('')}</div>`;
  }
  function renderSequence(ex) {
    const n = ex.answer.length;
    const slots = []; for (let i = 0; i < n; i++) { const v = Sess.sel[i]; const o = v ? ex.palette.find(p => p.id === v) : null; slots.push(`<div class="slot ${o ? 'filled' : ''} ${i === Sess.sel.length ? 'active' : ''}">${o ? esc(o.label) : (i + 1)}</div>`); }
    const pal = ex.palette;
    const dia = pal.filter(o => !E.CHROMATIC_RAISED.includes(o.id) && !E.CHROMATIC_LOWERED.includes(o.id) || (ex.level <= 3 && ['me', 'le', 'te', 'ra', 'fi', 'se'].includes(o.id)));
    const chr = pal.filter(o => !dia.includes(o));
    const btn = o => `<button class="ans" data-act="seq-add" data-id="${esc(o.id)}"><span class="l">${esc(o.label)}</span><span class="s">${esc(o.sub)}</span></button>`;
    return `<div class="slots">${slots.join('')}</div>
      <div class="ladder" style="grid-template-columns:repeat(${Math.min(7, dia.length)},1fr)">${dia.map(btn).join('')}</div>${chr.length ? `<div class="ladder chrom">${chr.map(btn).join('')}</div>` : ''}
      <div class="row mt"><button class="btn sm" data-act="seq-undo">⌫ Undo</button><button class="btn sm ghost" data-act="seq-clear">Clear</button><button class="btn sm" data-act="seq-play" ${Sess.sel.length ? '' : 'disabled'}>▶ My answer</button><span class="grow"></span><button class="btn sm primary" data-act="seq-check" ${Sess.sel.length === n ? '' : 'disabled'}>Check ↵</button></div>`;
  }
  function renderMulti(ex) {
    const n = ex.answer.length;
    const slots = []; for (let i = 0; i < n; i++) { const v = Sess.slots[i]; slots.push(`<button class="slot ${v ? 'filled' : ''} ${i === Sess.activeSlot ? 'active' : ''}" data-act="slot" data-i="${i}"><span class="lab">${i + 1}</span>${v ? esc(E.tokenLabel(v, st.settings.numeralStyle === 'low' ? 'low' : 'lab')) : '?'}</button>`); }
    const full = Sess.slots.filter(Boolean).length === n;
    return `<div class="slots">${slots.join('')}</div>
      <div class="answers cols3">${ex.palette.map(o => `<button class="ans" data-act="multi-add" data-id="${esc(o.id)}"><span class="l">${esc(o.label)}</span><span class="s">${esc(o.sub)}</span></button>`).join('')}</div>
      <div class="row mt"><button class="btn sm ghost" data-act="multi-clear">Clear</button><button class="btn sm" data-act="multi-play" ${Sess.slots.some(Boolean) ? '' : 'disabled'}>▶ My answer</button><span class="grow"></span><button class="btn sm primary" data-act="multi-check" ${full ? '' : 'disabled'}>Check ↵</button></div>`;
  }
  function refreshAnswerArea() { const a = $('#answer-area'); if (a) a.innerHTML = renderAnswerArea(Sess.ex); }

  /* ---- credit & feedback ---- */
  function credit(ex, correct, perItem) {
    const rt = ((performance.now() - (Sess.audioEnd || Sess.qStart)) / 1000);
    const secs = Math.min(120, (performance.now() - Sess.qStart) / 1000);
    const seen = new Set();
    ex.items.forEach(id => { if (seen.has(id)) return; seen.add(id); const ok = perItem ? perItem[id] !== false : correct; S.review(id, ex.module, ok, rt); });
    S.logAnswer(ex.module, correct, secs);
    Sess.results.push({ module: ex.module, correct, level: ex.level, items: ex.items, secs });
  }
  function answerChoice(id) {
    if (Sess.answered) return; const ex = Sess.ex; Sess.answered = true; Sess.chosen = id;
    const correct = ex.acceptAny ? ex.acceptAny.includes(id) : id === ex.answer;
    let perItem = null;
    if (!correct && ex.wrongItems) { perItem = {}; ex.items.forEach(i => perItem[i] = true); ex.wrongItems(id).forEach(i => perItem[i] = false); }
    if (!correct && ex.module !== 'rhythm') S.confuse(ex.module, ex.answer, id);
    credit(ex, correct, perItem);
    document.querySelectorAll('#answer-area .ans').forEach(b => { const bid = b.dataset.id; if (bid === ex.answer || (ex.acceptAny && ex.acceptAny.includes(bid))) b.classList.add('right'); else if (bid === id) b.classList.add('wrong'); b.disabled = true; });
    renderFeedback(correct);
  }
  function checkSequence() {
    const ex = Sess.ex; if (Sess.answered || Sess.sel.length !== ex.answer.length) return; Sess.answered = true;
    const perItem = {}; let all = true;
    ex.answer.forEach((a, i) => { const ok = Sess.sel[i] === a; if (!ok) all = false; const id = ex.items[i]; perItem[id] = perItem[id] === false ? false : ok; if (!ok) S.confuse('degrees', 'deg:' + a, 'deg:' + Sess.sel[i]); });
    credit(ex, all, perItem);
    const lab = id => { const o = ex.palette.find(p => p.id === id); return o ? o.label : id; };
    const a = $('#answer-area'); a.innerHTML = `<div class="slots">${ex.answer.map((s, i) => `<div class="slot ${Sess.sel[i] === s ? 'right' : 'wrong'}">${esc(lab(Sess.sel[i]))}${Sess.sel[i] !== s ? ` <span class="tiny muted">→ ${esc(lab(s))}</span>` : ''}</div>`).join('')}</div>`;
    renderFeedback(all);
  }
  function checkMulti() {
    const ex = Sess.ex; if (Sess.answered || Sess.slots.filter(Boolean).length !== ex.answer.length) return; Sess.answered = true;
    const perItem = {}; let all = true; const style = st.settings.numeralStyle === 'low' ? 'low' : 'lab';
    ex.answer.forEach((a, i) => { const ok = Sess.slots[i] === a; if (!ok) all = false; const id = ex.items[i]; perItem[id] = perItem[id] === false ? false : ok; if (!ok) S.confuse('progressions', 'tok:' + a, 'tok:' + Sess.slots[i]); });
    credit(ex, all, perItem);
    const a = $('#answer-area'); a.innerHTML = `<div class="slots">${ex.answer.map((s, i) => `<div class="slot ${Sess.slots[i] === s ? 'right' : 'wrong'}"><span class="lab">${i + 1}</span>${esc(E.tokenLabel(Sess.slots[i], style))}${Sess.slots[i] !== s ? ` <span class="tiny muted">→ ${esc(E.tokenLabel(s, style))}</span>` : ''}</div>`).join('')}</div>`;
    renderFeedback(all);
  }
  function renderFeedback(correct, extraHtml) {
    const ex = Sess.ex; const fb = $('#feedback'); if (!fb) return;
    const style = st.settings.numeralStyle === 'low' ? 'low' : 'lab';
    let chosenLabel = '';
    if (!correct && Sess.chosen != null && ex.options) { const o = ex.options.find(x => x.id === Sess.chosen); chosenLabel = o ? (ex.module === 'rhythm' && ex.type === 'dictation' ? 'option ' + (ex.options.indexOf(o) + 1) : o.label) : ''; }
    let cmp = '';
    if (!correct && ex.compare && Sess.chosen != null && Sess.chosen !== ex.answer) cmp = `<div class="row mt"><button class="btn sm" data-act="cmp" data-which="correct">▶ Correct</button><button class="btn sm" data-act="cmp" data-which="mine">▶ Yours (${esc(chosenLabel)})</button><button class="btn sm" data-act="cmp" data-which="ab">▶ A / B</button></div>`;
    if (!correct && ex.compareSlot) { const wrongs = ex.answer.map((a, i) => Sess.slots[i] !== a ? i : -1).filter(i => i >= 0); cmp = `<div class="row wrap mt">${wrongs.map(i => `<button class="btn sm" data-act="cmp-slot" data-i="${i}" data-which="correct">▶ Chord ${i + 1} correct</button><button class="btn sm ghost" data-act="cmp-slot" data-i="${i}" data-which="mine">▶ yours</button>`).join('')}</div>`; }
    const diff = (!correct && ex.diffDescribe) ? `<div class="small mt bad">${esc(ex.diffDescribe(Sess.chosen))}</div>` : '';
    const kb = ex.visual ? `<div class="kb">${N.keyboardSVG(ex.visual.lo, ex.visual.hi, ex.visual.hl)}</div>` : '';
    const svg = ex.explainSvg ? `<div class="svgbox mt">${ex.explainSvg}</div>` : '';
    fb.innerHTML = `<div class="feedback ${correct ? 'right' : 'wrong'}">
      <div class="verdict ${correct ? 'ok' : 'bad'}">${correct ? '✓ Correct' : '✗ Not quite'}${!correct && ex.correctLabel ? ` <span class="muted" style="font-weight:600">— it was ${esc(ex.correctLabel)}</span>` : ''}</div>
      <div class="explain">${ex.explain || ''}</div>${diff}${extraHtml || ''}${svg}${kb}${cmp}
      <div class="row mt"><button class="btn sm ghost" data-act="play">↻ Hear it again</button><span class="grow"></span><button class="btn primary" data-act="next" id="next-btn">${Sess.idx + 1 >= Sess.queue.length && Sess.mode !== 'placement' ? 'Finish' : 'Next'} ↵</button></div>
    </div>`;
    fb.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (correct && st.settings.autoAdvance) setTimeout(() => { if (Sess.answered && Sess.active) advance(); }, 1600);
  }
  function compare(which) {
    const ex = Sess.ex; A.stopAll();
    const corr = ex.compare(ex.answer), mine = ex.compare(Sess.chosen);
    if (which === 'correct') A.playScore(corr); else if (which === 'mine') A.playScore(mine);
    else { const end = Math.max(...corr.map(e => e.at + e.dur)) + 0.45; A.playScore(corr.concat(mine.map(e => Object.assign({}, e, { at: e.at + end })))); }
  }
  function compareSlot(i, which) { const ex = Sess.ex; A.stopAll(); A.playScore(ex.compareSlot(i, which === 'correct' ? ex.answer[i] : Sess.slots[i])); }
  function advance() {
    if (Sess.mode === 'placement') {
      const last = Sess.results[Sess.results.length - 1];
      const nxt = placementNext(last.correct);
      if (!nxt) { finishSession(); return; }
      Sess.queue.push(nxt); Sess.idx++; nextQuestion(); return;
    }
    Sess.idx++; nextQuestion();
  }
  function quitSession() { A.stopAll(); E.Pitch.stop(); if (Sess.results.length) finishSession(true); else { Sess.active = false; render(); } }

  /* ---- tap flow ---- */
  function startTapFlow() {
    const ex = Sess.ex; if (Sess.answered || Sess.tapState !== 'idle' && Sess.tapState !== 'done') return;
    A.stopAll(); Sess.taps = []; Sess.tapState = 'listen'; setPlaying(true);
    $('#tap-sub').textContent = 'listen…'; $('#tappad').classList.remove('hot');
    const h = A.playScore(ex.audio.events, { tail: 0.4 });
    h.promise.then(() => {
      if (!Sess.active || Sess.ex !== ex) return;
      const h2 = A.playScore(ex.tap.events, { lead: 0.15, tail: 0.6 });
      Sess.tapT0 = h2.t0 + ex.tap.patStart; Sess.tapState = 'count';
      const nb = ex.pattern.measures[0].meter.groups.length;
      $('#tap-sub').textContent = 'count-in… get ready'; $('#tap-label').textContent = Array.from({ length: nb }, (_, i) => i + 1).join(' · ');
      setTimeout(() => { if (Sess.tapState === 'count') { Sess.tapState = 'tap'; $('#tap-label').textContent = 'TAP'; $('#tap-sub').textContent = 'now!'; $('#tappad').classList.add('hot'); } }, ex.tap.patStart * 1000 - 60);
      h2.promise.then(() => { if (Sess.tapState === 'tap' || Sess.tapState === 'count') finishTap(); });
    });
  }
  function tap() {
    if (Sess.tapState === 'tap' || Sess.tapState === 'count') { Sess.taps.push(A.now() - Sess.tapT0); const l = $('#tap-label'); if (l) { l.style.transform = 'scale(1.15)'; setTimeout(() => l.style.transform = '', 80); } }
    else if (Sess.tapState === 'idle' || Sess.tapState === 'done') startTapFlow();
  }
  function finishTap() {
    const ex = Sess.ex; if (Sess.answered) return; Sess.tapState = 'done'; setPlaying(false); $('#tappad').classList.remove('hot');
    const r = R.scoreTaps(ex.pattern, Sess.taps, ex.tps);
    const correct = r.score >= 0.75; Sess.answered = true;
    const sv = $('#tap-svg'); if (sv) sv.classList.remove('hidden');
    const perItem = {}; ex.items.forEach(i => perItem[i] = true);
    r.results.forEach(x => { if (!x.hit) { const m = ex.pattern.measures[x.o.measure]; const c = m.cells.find(c => x.o.group >= c.gi && x.o.group < c.gi + c.k); if (c) perItem['rc:' + c.id] = false; } });
    credit(ex, correct, correct ? null : perItem);
    const chips = r.results.map(x => `<span class="chip ${x.hit ? (Math.abs(x.err) < 0.06 ? 'ok' : 'warn') : 'bad'}">${x.hit ? (x.err >= 0 ? '+' : '−') + Math.round(Math.abs(x.err) * 1000) + 'ms' : 'miss'}</span>`).join('');
    const tendency = r.hits ? (r.meanErr > 0.025 ? 'You tend to drag (late) — subdivide out loud.' : r.meanErr < -0.025 ? 'You tend to rush (early) — relax into the click.' : 'Your timing centre is solid.') : '';
    ex.correctLabel = '';
    renderFeedback(correct, `<div class="small mt"><b>${r.hits}/${r.total}</b> attacks hit${r.extras ? `, ${r.extras} extra` : ''} · score ${Math.round(r.score * 100)}%. ${tendency}</div><div class="rows">${chips}</div><div class="row mt"><button class="btn sm" data-act="tap-again">↻ Try again</button></div>`);
  }

  /* ---- sing flow ---- */
  function renderSingPanel() {
    const ex = Sess.ex, sg = Sess.sing; const p = $('#sing-panel'); if (!p) return;
    const hint = `<div class="rows">${ex.sylLabels.map((s, i) => `<span class="chip ${sg.result ? (sg.result.rows[i].status === 'ok' ? 'ok' : sg.result.rows[i].status === 'wrong' ? 'bad' : 'warn') : ''}">${esc(s)}${sg.result && sg.result.rows[i].cents != null && sg.result.rows[i].status === 'ok' && Math.abs(sg.result.rows[i].cents) >= 15 ? ` <span class="tiny">${sg.result.rows[i].cents > 0 ? '♯' : '♭'}${Math.abs(sg.result.rows[i].cents)}¢</span>` : ''}${sg.result && sg.result.rows[i].status === 'wrong' ? ` <span class="tiny">sang ${esc(sg.result.rows[i].sang || '?')}</span>` : ''}${sg.result && sg.result.rows[i].status === 'missing' ? ' <span class="tiny">missing</span>' : ''}</span>`).join('')}</div>`;
    const live = sg.phase === 'rec' ? `<div class="card mt center"><div class="bignote" id="live-note">—</div><div class="meter"><i id="live-cents"></i></div><div class="tiny muted">flat ← in tune → sharp</div><div class="rows" id="live-notes" style="justify-content:center"></div></div>` : '';
    p.innerHTML = `<div class="card"><h3>${esc(ex.title)}</h3><div class="small muted mt">${esc(ex.instr)}</div><div class="mt">${hint}</div>
      <div class="row mt"><button class="btn" data-act="sing-ref">▶ Reference</button>${sg.phase === 'rec' ? `<button class="btn primary grow" data-act="sing-stop">■ Done</button>` : `<button class="btn primary grow" data-act="sing-rec">● Record & sing</button>`}${ex.type !== 'echo' ? `<button class="btn ghost sm" data-act="sing-hear">hear target</button>` : ''}</div>
      ${live}${sg.error ? `<div class="small bad mt">${esc(sg.error)}</div>` : ''}</div>`;
  }
  function singRef() { const ex = Sess.ex; A.stopAll(); A.playScore(ex.audio.events); }
  async function singRecord() {
    const ex = Sess.ex, sg = Sess.sing; A.stopAll();
    sg.tracker = new E.Pitch.Tracker(); sg.phase = 'rec'; sg.result = null; sg.error = null; sg.lastVoiced = 0; sg.started = A.now(); renderSingPanel();
    try {
      await E.Pitch.start(fr => {
        if (sg.phase !== 'rec') return;
        sg.tracker.push(fr.midi, fr.t);
        const ln = $('#live-note'), lc = $('#live-cents'), lns = $('#live-notes');
        if (fr.midi != null) { sg.lastVoiced = fr.t; const r = Math.round(fr.midi); const c = Math.round((fr.midi - r) * 100); if (ln) ln.textContent = E.midiName(r); if (lc) lc.style.left = (50 + c) + '%'; }
        else if (ln) ln.textContent = '—';
        if (lns) { const ns = sg.tracker.notes; lns.innerHTML = ns.map(n => `<span class="chip">${E.midiName(n.midi)}</span>`).join(''); }
        if (sg.tracker.notes.length + (sg.tracker.cur ? 1 : 0) >= ex.expected.length && fr.t - sg.lastVoiced > 1.4 && sg.lastVoiced > 0) singStop();
        else if (fr.t - sg.started > 30) singStop();
      });
    } catch (e) { sg.phase = 'idle'; sg.error = 'Microphone not available here. Inside the claude.ai preview the mic is blocked — open EARS from its own web address (or the native app) and allow microphone access. Everything else in the app works in the preview.'; renderSingPanel(); }
  }
  function singStop() {
    const ex = Sess.ex, sg = Sess.sing; if (sg.phase !== 'rec') return;
    E.Pitch.stop(); const notes = sg.tracker.finish(A.now()); sg.phase = 'done';
    const r = E.Sing.evaluate(ex, notes); sg.result = r;
    const correct = r.score >= 70;
    if (!Sess.answered) { Sess.answered = true; credit(ex, correct); }
    renderSingPanel();
    const fb = $('#feedback');
    fb.innerHTML = `<div class="feedback ${correct ? 'right' : 'wrong'}"><div class="verdict ${correct ? 'ok' : r.score >= 40 ? 'acc' : 'bad'}">${r.score}% — ${correct ? 'that\'s owned' : r.score >= 40 ? 'getting there' : 'keep shedding'}</div><div class="explain">${r.text}</div>
      <div class="row mt"><button class="btn sm" data-act="sing-again">↻ Try again</button><button class="btn sm ghost" data-act="sing-hear">▶ target</button><span class="grow"></span><button class="btn primary" data-act="next" id="next-btn">${Sess.idx + 1 >= Sess.queue.length ? 'Finish' : 'Next'} ↵</button></div></div>`;
    fb.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  /* ---- finish ---- */
  function finishSession(early) {
    A.stopAll(); E.Pitch.stop();
    const res = Sess.results; const n = res.length; const c = res.filter(r => r.correct).length; const secs = res.reduce((a, r) => a + r.secs, 0);
    const byM = {}; res.forEach(r => { byM[r.module] = byM[r.module] || { q: 0, c: 0, l: r.level }; byM[r.module].q++; if (r.correct) byM[r.module].c++; });
    let placementHtml = '';
    if (Sess.mode === 'placement' && Sess.placement) {
      const P = Sess.placement; const levels = {};
      P.modules.forEach(m => levels[m] = U.clamp(P.best[m] || 1, 1, 5));
      levels.melody = levels.degrees; levels.sing = levels.degrees;
      Object.assign(st.levels, levels); st.placement = { date: U.today(), levels }; S.saveNow();
      placementHtml = `<div class="card"><h3>Your placement</h3><div class="row wrap mt">${Object.entries(levels).map(([m, l]) => `<span class="pill acc">${MI[m].icon} ${MI[m].name} L${l}</span>`).join('')}</div><div class="small muted mt">You can change any level from the Train tab at any time.</div></div>`;
    }
    let asgHtml = '';
    if (Sess.mode === 'assignment' && Sess.assignment) {
      const weak = []; res.filter(r => !r.correct).forEach(r => r.items.forEach(i => { const s = stripId(i); if (!weak.includes(s)) weak.push(s); }));
      const result = { t: 'ears-result', id: Sess.assignment.id, title: Sess.assignment.title, student: st.profile.name, date: U.today(), q: n, pct: n ? Math.round(100 * c / n) : 0, secs: Math.round(secs), mods: byM, weak: weak.slice(0, 12) };
      const code = U.b64enc(result); st.assignmentResults.push({ code, title: result.title, date: result.date }); st.assignment = null; S.saveNow();
      asgHtml = `<div class="card" style="border-color:rgba(79,209,197,0.45)"><h3>Assignment complete</h3><div class="small muted mt">Send this result code to your teacher:</div><div class="code mt">${esc(code)}</div><button class="btn sm mt" data-act="copy" data-text="${esc(code)}">Copy code</button></div>`;
    }
    const ups = Object.keys(byM).filter(m => S.levelUpReady(m));
    const newConf = []; Object.keys(byM).forEach(m => S.topConfusions(m, 1).forEach(t => newConf.push(`${MI[m].name}: ${t.pair.map(stripId).join(' ↔ ')}`)));
    Sess.active = false;
    $('nav.tabs').classList.remove('hidden');
    $('#view').innerHTML = `<div class="stack">
      <h1>${early ? 'Session ended' : Sess.mode === 'placement' ? 'Placement done' : 'Session complete'}</h1>
      <div class="statgrid"><div class="stat"><div class="v">${c}/${n}</div><div class="k">correct</div></div><div class="stat"><div class="v">${n ? Math.round(100 * c / n) : 0}%</div><div class="k">accuracy</div></div><div class="stat"><div class="v">+${res.reduce((a, r) => a + (r.correct ? 10 : 3), 0)}</div><div class="k">XP</div></div></div>
      ${placementHtml}${asgHtml}
      <div class="card"><h3>By skill</h3>${Object.entries(byM).map(([m, v]) => `<div class="row between small mt"><span>${MI[m].icon} ${MI[m].name} <span class="lvl">L${v.l}</span></span><span class="b ${v.c / v.q >= 0.8 ? 'ok' : v.c / v.q >= 0.5 ? 'acc' : 'bad'}">${v.c}/${v.q}</span></div>`).join('')}</div>
      ${ups.length ? `<div class="card" style="border-color:rgba(84,217,140,0.4)"><h3>Ready to level up</h3><div class="row wrap mt">${ups.map(m => `<button class="btn sm teal" data-act="set-level" data-m="${m}" data-l="${st.levels[m] + 1}" data-stay="1">${MI[m].name} → L${st.levels[m] + 1}</button>`).join('')}</div></div>` : ''}
      ${newConf.length ? `<div class="card"><h3>Watch list</h3><div class="small muted mt">${newConf.map(esc).join('<br>')}</div><div class="tiny muted mt">Focus drills on these pairs are queued into your next session.</div></div>` : ''}
      <div class="grid2"><button class="btn primary" data-act="start-today">Another session</button><button class="btn" data-act="tab" data-tab="today">Done</button></div>
    </div>`;
    $('#streak').textContent = '🔥 ' + S.streak();
  }

  /* ================= ACTIONS ================= */
  const actions = {
    tab: el => setTab(el.dataset.tab),
    'ob-placement': () => { if (!st.profile.onboarded) finishOnboarding(); startPlacement(); },
    'ob-skip': () => { finishOnboarding(); render(); },
    'start-today': () => startSession({ count: st.settings.sessionLen }),
    'start-review': () => { const due = S.dueCards(); startSession({ queue: due.slice(0, 20).map(c => ({ module: c.m, target: c.id, why: 'review' })) }); },
    'start-mixed': () => startSession({ count: 20 }),
    'start-assignment': () => { const a = st.assignment; if (!a) return; startSession({ mode: 'assignment', assignment: a, modules: a.modules, count: a.count, noReview: true, noFocus: true, levelOverride: a.levels }); },
    'drop-assignment': () => { st.assignment = null; S.saveNow(); render(); },
    quick: el => startSession({ modules: [el.dataset.m], count: 10 }),
    module: el => moduleSheet(el.dataset.m),
    'close-sheet': () => closeSheet(),
    'set-level': el => { const m = el.dataset.m, l = +el.dataset.l; st.levels[m] = l; if (m === 'degrees') { st.levels.melody = l; } S.saveNow(); toast(`${MI[m].name} → Level ${l} · ${LN[l]}`); if (el.dataset.stay) { if (Sess.active === false) render(); } else moduleSheet(m); },
    'start-module': el => { const m = el.dataset.m; const seg = $('#rh-sub .on'); const sub = seg && seg.dataset.v ? seg.dataset.v : undefined; closeSheet(); startSession({ modules: [m], count: +el.dataset.n, sub }); },
    'start-focus': el => { const m = el.dataset.m; const tc = S.topConfusions(m, 1)[0]; closeSheet(); const q = []; for (let i = 0; i < 10; i++) q.push({ module: m, pair: tc.pair, why: 'focus' }); startSession({ queue: q }); },
    'sing-set': () => { const q = []; for (let i = 0; i < 6; i++) q.push({ module: 'sing', why: 'practice' }); startSession({ queue: q }); },
    'sing-task': el => startSession({ queue: [{ module: 'sing', target: 'sing:' + el.dataset.t, why: 'practice' }] }),
    method: () => methodSheet(), curriculum: () => curriculumSheet(),
    'assign-builder': () => assignmentBuilder(), 'assign-make': () => makeAssignment(), 'decode-result': () => decodeResultSheet(), 'decode-go': () => decodeResult(),
    'show-results': () => sheet(`<div class="row between"><h2>Result codes</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div>${st.assignmentResults.map(r => `<div class="card mt"><div class="b">${esc(r.title)} · ${esc(r.date)}</div><div class="code mt">${esc(r.code)}</div><button class="btn xs mt" data-act="copy" data-text="${esc(r.code)}">Copy</button></div>`).join('')}`),
    copy: el => { const t = el.dataset.text; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied ✓')).catch(() => copySheet(t)); },
    'export-report': () => { const r = S.report(); (navigator.clipboard ? navigator.clipboard.writeText(r) : Promise.reject()).then(() => toast('Report copied to clipboard ✓')).catch(() => sheet(`<pre style="white-space:pre-wrap;font-size:12px">${esc(r)}</pre>`)); },
    'export-json': () => { const t = S.exportJSON(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('All data copied to clipboard ✓ — paste it into a note or the Import box on another device')).catch(() => copySheet(t)); },
    'import-paste': () => sheet(`<div class="row between"><h2>Import data</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div><div class="stack mt"><textarea id="imp-in" rows="5" placeholder="Paste the exported data here"></textarea><button class="btn primary" data-act="import-go">Import</button></div>`),
    'import-go': () => { if (S.importJSON($('#imp-in').value)) { st = S.get(); closeSheet(); toast('Imported ✓'); render(); } else toast('That doesn\'t look like EARS data'); },
    reset: () => sheet(`<h2>Erase all progress?</h2><div class="small muted mt">This removes every card, stat and setting on this device.</div><div class="grid2 mt2"><button class="btn danger" data-act="reset-go">Erase</button><button class="btn" data-act="close-sheet">Keep</button></div>`),
    'reset-go': () => { closeSheet(); st = S.reset(); render(); },
    'assign-code': () => sheet(`<div class="row between"><h2>Assignment code</h2><button class="btn xs ghost" data-act="close-sheet">✕</button></div><div class="stack mt"><textarea id="asg-in" rows="4" placeholder="Paste the code or link from your teacher"></textarea><button class="btn primary" data-act="assign-load">Load</button></div>`),
    'assign-load': () => { let v = $('#asg-in').value.trim(); const m = v.match(/#a=([^&\s]+)/); if (m) v = m[1]; const a = U.b64dec(v); if (a && a.t === 'ears-assign') { st.assignment = a; S.saveNow(); closeSheet(); tab = 'today'; render(); toast('Assignment loaded ✓'); } else toast('That code isn\'t valid'); },
    toggle: el => { const k = el.dataset.k; if (k === 'light') { st.settings.theme = st.settings.theme === 'light' ? 'dark' : 'light'; applyTheme(); } else st.settings[k] = !st.settings[k]; S.save(); renderMe(); },
    // session
    play: () => { if (Sess.ex && Sess.ex.type === 'tap') startTapFlow(); else playPrompt(); },
    ctx: () => playContext(),
    quit: () => quitSession(),
    choose: el => answerChoice(el.dataset.id),
    'seq-add': el => { const ex = Sess.ex; if (Sess.answered || Sess.sel.length >= ex.answer.length) return; Sess.sel.push(el.dataset.id); refreshAnswerArea(); const m = ex.tonic != null ? ex.tonic + E.SOL[el.dataset.id].pc : null; if (m != null) A.playScore([{ at: 0, dur: 0.35, notes: [m + (E.SOL[el.dataset.id].pc > 9 ? -12 : 0) + 12 * (m < 55 ? 1 : 0)], timbre: ex.melTimbre || 'ep', vel: 0.5 }]); },
    'seq-undo': () => { if (Sess.answered) return; Sess.sel.pop(); refreshAnswerArea(); },
    'seq-clear': () => { if (Sess.answered) return; Sess.sel = []; refreshAnswerArea(); },
    'seq-play': () => { const ex = Sess.ex; if (ex.tonic == null) return; A.stopAll(); let prevM = null; const evs = Sess.sel.map((s, i) => { let m = ex.tonic + E.SOL[s].pc; if (prevM != null) { while (m - prevM > 6) m -= 12; while (prevM - m > 6) m += 12; } prevM = m; return { at: i * 0.5, dur: 0.46, notes: [m], timbre: ex.melTimbre || 'ep' }; }); A.playScore(evs); },
    'seq-check': () => checkSequence(),
    slot: el => { Sess.activeSlot = +el.dataset.i; refreshAnswerArea(); },
    'multi-add': el => { const ex = Sess.ex; if (Sess.answered) return; Sess.slots[Sess.activeSlot] = el.dataset.id; let nxt = Sess.slots.findIndex((v, i) => !v && i < ex.answer.length); if (nxt < 0) { for (let i = 0; i < ex.answer.length; i++) if (!Sess.slots[i]) { nxt = i; break; } } Sess.activeSlot = nxt >= 0 ? nxt : Math.min(ex.answer.length - 1, Sess.activeSlot + 1); refreshAnswerArea(); const t = E.TOKENS[el.dataset.id]; const v = E.voiceChord(t.type, E.mod12(ex.tonicPc + t.root), null, { lo: 57, hi: 79 }); A.playScore([{ at: 0, dur: 0.6, notes: [v.bass].concat(v.upper), timbre: ex.timbre, vel: 0.55 }]); },
    'multi-clear': () => { if (Sess.answered) return; Sess.slots = []; Sess.activeSlot = 0; refreshAnswerArea(); },
    'multi-play': () => { const ex = Sess.ex; A.stopAll(); let prev = null; const vs = []; for (let i = 0; i < ex.answer.length; i++) { const tk = Sess.slots[i]; if (!tk) continue; const t = E.TOKENS[tk]; const v = E.voiceChord(t.type, E.mod12(ex.tonicPc + t.root), prev, { lo: 57, hi: 79 }); vs.push(v); prev = v; } A.playScore(G.chordEvents(vs, 0, 1.0, 0.08, ex.timbre, 0.75)); },
    'multi-check': () => checkMulti(),
    cmp: el => compare(el.dataset.which),
    'cmp-slot': el => compareSlot(+el.dataset.i, el.dataset.which),
    next: () => advance(),
    tap: () => tap(),
    'tap-again': () => { Sess.answered = false; Sess.results.pop(); Sess.tapState = 'idle'; $('#feedback').innerHTML = ''; $('#tap-label').textContent = 'TAP'; startTapFlow(); },
    'toggle-notation': () => { Sess.showNotation = !Sess.showNotation; const sv = $('#tap-svg'); if (sv) sv.classList.toggle('hidden', !Sess.showNotation && !Sess.answered); const b = document.querySelector('[data-act="toggle-notation"]'); if (b) b.textContent = Sess.showNotation ? 'Hide notation' : 'Show notation (sight-reading mode)'; },
    'sing-ref': () => singRef(), 'sing-rec': () => singRecord(), 'sing-stop': () => singStop(), 'sing-hear': () => { A.stopAll(); A.playScore(Sess.ex.playExpected); },
    'sing-again': () => { Sess.sing = { phase: 'idle', notes: [], result: null }; Sess.answered = false; Sess.results.pop(); $('#feedback').innerHTML = ''; renderSingPanel(); }
  };
  function applyTheme() { document.body.classList.toggle('light', st.settings.theme === 'light'); }

  /* ================= BOOT ================= */
  function boot() {
    st = S.load(); applyTheme();
    // assignment link
    const loadHash = () => { const mh = location.hash.match(/^#a=(.+)$/); if (!mh) return false; const a = U.b64dec(mh[1]); if (a && a.t === 'ears-assign') { st.assignment = a; S.saveNow(); toast('Assignment loaded: ' + esc(a.title)); } history.replaceState(null, '', location.pathname + location.search); return true; };
    loadHash();
    window.addEventListener('hashchange', () => { if (loadHash()) { tab = 'today'; if (!Sess.active) render(); } });
    document.body.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const fn = actions[el.dataset.act]; if (fn) { A.ensure(); fn(el, e); }
    });
    document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    document.addEventListener('keydown', e => {
      if (!Sess.active) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const ex = Sess.ex; if (!ex) return;
      if (e.code === 'Space') { e.preventDefault(); if (ex.type === 'tap') tap(); else playPrompt(); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (Sess.answered) advance(); else if (ex.answerKind === 'sequence') checkSequence(); else if (ex.answerKind === 'multi') checkMulti(); return; }
      if (e.key === 'Backspace' && ex.answerKind === 'sequence' && !Sess.answered) { e.preventDefault(); Sess.sel.pop(); refreshAnswerArea(); return; }
      if (e.key === 'k' && ex.context) { playContext(); return; }
      if (/^[1-9]$/.test(e.key) && ex.answerKind === 'choice' && !Sess.answered) { const b = document.querySelector(`#answer-area .ans[data-key="${e.key}"]`); if (b) answerChoice(b.dataset.id); }
    });
    // pause audio when leaving
    document.addEventListener('visibilitychange', () => { if (document.hidden) A.stopAll(); });
    // the real piano (hosted next to ../piano/), the service worker and the update notice — only when served over http(s)
    const hosted = /^https?:$/.test(location.protocol);
    if (hosted && window.EARS_PIANO_BASE) A.pianoInit(window.EARS_PIANO_BASE).then(ok => { if (ok && tab === 'me' && !Sess.active) render(); });
    if (hosted && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => { });
      navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'ears-updated' && e.data.build !== BUILD) toast('A new version of EARS is ready — <button class="btn xs" onclick="location.reload()">Reload</button>', 8000); });
    }
    render();
  }
  const BUILD = '__BUILD__';
  E.App = { boot, startSession, Sess, get state() { return st; }, toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.EARS = window.EARS || {});
