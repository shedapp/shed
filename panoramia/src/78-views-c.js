/* PanoramIA — views: atlas, observatory, evaluation, governance, help. */
(function (root) {
  'use strict';
  var PX = root.PX, I = root.PX_I18N, TX = root.PX_TAXONOMY, RUB = root.PX_RUBRIC, MET = root.PX_METRICS, DICOM = root.PX_DICOM, DB = root.PX_DB, DEMO = root.PX_DEMO, Viewer = root.PX_Viewer;
  var t = PX.t, pick = PX.pick, esc = PX.esc, attr = PX.attr, state = PX.state, A = PX.actions;
  function colorOf(code) { return TX.colorOf(code); }

  // ================= ATLAS =================
  var quiz = { caseId: null, code: null, revealed: false, hits: 0, n: 0, viewer: null, click: null };
  function atlasCases() {
    return state.cases.filter(function (c) { return PX.atlasEligible(c); }).filter(function (c) {
      if (state.ui.atlasGroup === 'all') return true;
      return PX.findingsOf(c.id, 'ADJ').some(function (a) { return PX.groupOf(a.code) === state.ui.atlasGroup; });
    });
  }
  PX.views.atlas = function () {
    var groups = [['all', t('allGroups')]].concat(Object.keys(TX.GROUPS).map(function (g) { return [g, pick(TX.GROUPS[g].name)]; }));
    var head = '<div class="row between"><p class="muted" style="max-width:70ch">' + esc(t('atlasLead')) + '</p><div class="seg"><button data-action="atlas:mode" data-arg="browse" class="' + (state.ui.atlasMode === 'browse' ? 'on' : '') + '">' + esc(t('browseMode')) + '</button><button data-action="atlas:mode" data-arg="quiz" class="' + (state.ui.atlasMode === 'quiz' ? 'on' : '') + '">' + esc(t('quizMode')) + '</button></div></div>' +
      '<div class="row"><label class="sr-only" for="atlas-group">' + esc(t('category')) + '</label><select id="atlas-group" data-action="atlas:group" style="width:auto">' + groups.map(function (g) { return '<option value="' + g[0] + '"' + (state.ui.atlasGroup === g[0] ? ' selected' : '') + '>' + esc(g[1]) + '</option>'; }).join('') + '</select></div>';
    var list = atlasCases();
    if (state.ui.atlasMode === 'quiz') return '<div class="stack">' + head + quizView(list) + '</div>';
    var tiles = list.map(function (c) {
      var codes = {}; PX.findingsOf(c.id, 'ADJ').forEach(function (a) { codes[a.code] = 1; });
      var im = state.images[c.id];
      return '<div class="tile" data-action="atlas:open" data-arg="' + c.id + '" role="button" tabindex="0">' + (im && im.thumb ? '<img alt="" src="' + im.thumb + '">' : '') + '<div class="b"><span class="mono">' + esc(c.pseudonym) + '</span> <span class="muted">' + esc(c.ageBand || '') + ' ' + esc(c.sex || '') + '</span><div class="codes">' + Object.keys(codes).map(function (k) { return '<span title="' + attr(PX.findingName(k)) + '">' + esc(k) + '</span>'; }).join('') + '</div></div></div>';
    }).join('');
    return '<div class="stack">' + head + (tiles ? '<div class="gallery">' + tiles + '</div>' : '<div class="empty">' + esc(t('atlasEmpty')) + '</div>') + '</div>';
  };
  A['atlas:mode'] = function (arg) { state.ui.atlasMode = arg; if (arg === 'quiz') newQuiz(); PX.render(); };
  A['atlas:group'] = function (arg, el) { state.ui.atlasGroup = el.value; if (state.ui.atlasMode === 'quiz') newQuiz(); PX.render(); };
  A['atlas:open'] = function (arg) { openAtlasCase(arg); };
  function teachingCards(codes) {
    return codes.map(function (code) { var f = TX.FINDING_BY_CODE[code]; if (!f) return ''; return '<div class="finding ' + PX.groupClass(code) + '" style="cursor:default"><div><div class="name">' + esc(pick(f.name)) + ' <span class="code">' + esc(code) + '</span></div><div class="meta">' + esc(pick(TX.GROUPS[f.group].name)) + '</div><div style="margin-top:4px">' + esc(pick(f.desc)) + '</div></div></div>'; }).join('');
  }
  function openAtlasCase(id) {
    var c = PX.caseById(id); if (!c) return;
    var adj = PX.findingsOf(id, 'ADJ');
    var codes = []; adj.forEach(function (a) { if (codes.indexOf(a.code) === -1) codes.push(a.code); });
    var list = adj.map(function (a) { return '<div class="finding ' + PX.groupClass(a.code) + '" style="cursor:default"><div><div class="name">' + esc(PX.findingName(a.code)) + '</div><div class="meta"><span class="code">' + esc(a.code) + '</span>' + (a.fdi ? ' · FDI ' + a.fdi + ' · ' + esc(TX.toothName(a.fdi, I.getLang())) : '') + (a.refKind ? ' · ' + esc(I.has && !I.has('refKind_' + a.refKind) ? a.refKind : t('refKind_' + a.refKind)) : '') + '</div></div></div>'; }).join('');
    PX.openModal('<header><h2><span class="mono">' + esc(c.pseudonym) + '</span> <span class="muted" style="font-weight:400">' + [PX.optName(TX.MODALITIES, c.modality), ((c.ageBand || '') + ' ' + (c.sex && c.sex !== 'U' ? c.sex : '')).trim(), c.province].filter(function (x) { return x; }).map(esc).join(' · ') + '</span>' + (c.isOpenData ? ' <span class="pill info">' + esc(c.dataset || '') + ' · ' + esc(t('extRef')) + '</span>' : '') + '</h2><button class="btn sm" data-action="modal:close">' + esc(t('close')) + '</button></header>' +
      '<div class="body"><div class="grid-2" style="grid-template-columns: minmax(0,1.5fr) minmax(0,1fr)"><div class="viewer-wrap" style="height:440px;border-radius:8px;overflow:hidden"><canvas id="atlas-canvas"></canvas></div>' +
      '<div class="stack" style="gap:8px"><h3>' + esc(t('kpiFindings')) + '</h3>' + (list || '<p class="small muted">' + esc(t('noFindings')) + '</p>') + '<h3 style="margin-top:8px">' + esc(t('learnCard')) + '</h3>' + teachingCards(codes) + '</div></div></div>', { noFocus: true });
    var cv = PX.byId('atlas-canvas');
    var v = new Viewer(cv, { readOnly: true });
    PX.imageBitmap(id).then(function (bmp) { if (bmp) { v.setImage(bmp); setTimeout(function () { v.resize(); v.fit(); }, 30); } });
    v.setBoxes(adj.map(function (a) { return { id: a.id, x: a.box.x, y: a.box.y, w: a.box.w, h: a.box.h, shape: a.shape || null, color: colorOf(a.code), anatomy: TX.isAnatomy(a.code), selectable: false, label: a.code + (a.fdi ? ' ' + a.fdi : '') }; }));
    if (c.ref && root.PX_OPENDATA) v.setOverlay(root.PX_OPENDATA.overlayShapes(c.ref, false));
  }
  function newQuiz() {
    quiz.revealed = false; quiz.click = null; quiz.caseId = null; quiz.code = null;
    var pool = atlasCases().filter(function (c) { return PX.findingsOf(c.id, 'ADJ').some(function (a) { return state.ui.atlasGroup === 'all' || PX.groupOf(a.code) === state.ui.atlasGroup; }); });
    if (!pool.length) return;
    var c = pool[Math.floor(Math.random() * pool.length)];
    var cands = PX.findingsOf(c.id, 'ADJ').filter(function (a) { return state.ui.atlasGroup === 'all' || PX.groupOf(a.code) === state.ui.atlasGroup; });
    var a = cands[Math.floor(Math.random() * cands.length)];
    quiz.caseId = c.id; quiz.code = a.code;
  }
  function quizView(list) {
    if (!quiz.caseId) return '<div class="empty">' + esc(t('atlasEmpty')) + '</div>';
    var c = PX.caseById(quiz.caseId);
    var fdef = TX.FINDING_BY_CODE[quiz.code];
    return '<div class="card"><div class="row between"><div><strong>' + esc(t('quizFind', { f: PX.findingName(quiz.code) })) + '</strong><div class="small muted">' + esc(t('quizIntro')) + '</div></div><div class="row"><span class="pill info">' + esc(t('quizScore', { h: quiz.hits, n: quiz.n })) + '</span><button class="btn sm" data-action="quiz:next">' + esc(t('quizNext')) + '</button></div></div>' +
      '<div class="viewer-wrap" style="height:460px;border-radius:8px;overflow:hidden;margin-top:10px"><canvas id="quiz-canvas"></canvas></div>' +
      '<div id="quiz-feedback" style="margin-top:10px">' + (quiz.revealed ? quizFeedback() : '') + '</div>' +
      (quiz.revealed && fdef ? '<div style="margin-top:10px">' + teachingCards([quiz.code]) + '</div>' : '') + '</div>';
  }
  function quizFeedback() { return quiz.hit ? '<div class="banner" style="background:var(--good-soft);color:var(--good-ink);border-color:transparent">' + esc(t('quizHit')) + '</div>' : '<div class="banner warn">' + esc(t('quizMiss')) + '</div>'; }
  PX.binders.atlas = function () {
    var cv = PX.byId('quiz-canvas'); if (!cv || !quiz.caseId) return;
    var adj = PX.findingsOf(quiz.caseId, 'ADJ');
    var v = new Viewer(cv, { readOnly: true, onClick: function (p) {
      if (quiz.revealed) return;
      var targets = adj.filter(function (a) { return a.code === quiz.code; });
      var tol = 12;
      quiz.hit = targets.some(function (a) { return p.x >= a.box.x - tol && p.x <= a.box.x + a.box.w + tol && p.y >= a.box.y - tol && p.y <= a.box.y + a.box.h + tol; });
      quiz.revealed = true; quiz.n++; if (quiz.hit) quiz.hits++;
      PX.audit('quiz.answer', quiz.code, quiz.hit ? 'hit' : 'miss');
      v.setBoxes(adj.map(function (a) { return { id: a.id, x: a.box.x, y: a.box.y, w: a.box.w, h: a.box.h, shape: a.shape || null, color: a.code === quiz.code ? '#FFFFFF' : colorOf(a.code), alpha: a.code === quiz.code ? 1 : 0.6, selectable: false, label: a.code + (a.fdi ? ' ' + a.fdi : '') }; }).concat([{ id: 'click', x: p.x - 6, y: p.y - 6, w: 12, h: 12, color: quiz.hit ? '#69F0AE' : '#FF5252', fill: quiz.hit ? 'rgba(105,240,174,0.5)' : 'rgba(255,82,82,0.5)', selectable: false, label: '' }]));
      PX.render();
    } });
    quiz.viewer = v;
    PX.imageBitmap(quiz.caseId).then(function (bmp) { if (bmp) { v.setImage(bmp); setTimeout(function () { v.resize(); v.fit(); }, 30); } });
    if (quiz.revealed) v.setBoxes(adj.map(function (a) { return { id: a.id, x: a.box.x, y: a.box.y, w: a.box.w, h: a.box.h, shape: a.shape || null, color: a.code === quiz.code ? '#FFFFFF' : colorOf(a.code), alpha: a.code === quiz.code ? 1 : 0.6, selectable: false, label: a.code + (a.fdi ? ' ' + a.fdi : '') }; }));
  };
  A['quiz:next'] = function () { newQuiz(); PX.render(); };

  // ================= OBSERVATORY =================
  function obsCases() { return state.cases.filter(function (c) { return (state.ui.obsIncludeDemo || !c.isDemo) && (state.ui.obsIncludeOpen || !c.isOpenData); }); }
  PX.views.observatorio = function () {
    var cs = obsCases(), ids = {}; cs.forEach(function (c) { ids[c.id] = true; });
    var adj = state.annotations.filter(function (a) { return a.reader === 'ADJ' && ids[a.caseId]; });
    var byCode = {}; adj.forEach(function (a) { byCode[a.code] = (byCode[a.code] || 0) + 1; });
    var codeRows = Object.keys(byCode).map(function (k) { return { label: k + ' ' + PX.findingName(k), value: byCode[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 12);
    var byProv = {}; cs.forEach(function (c) { var p = c.province || (c.isOpenData ? (c.datasetKey === 'opg' ? t('externalBD') : t('externalTR')) : '—'); byProv[p] = (byProv[p] || 0) + 1; });
    var provRows = Object.keys(byProv).map(function (k) { return { label: k, value: byProv[k] }; }).sort(function (a, b) { return b.value - a.value; });
    var ageRows = TX.AGE_BANDS.map(function (b) { return { label: b, value: cs.filter(function (c) { return c.ageBand === b && c.sex === 'F'; }).length, value2: cs.filter(function (c) { return c.ageBand === b && c.sex === 'M'; }).length }; });
    var noAge = cs.filter(function (c) { return !c.ageBand || !(c.sex === 'F' || c.sex === 'M'); }).length;
    var pipe = { unread: 0, single: 0, double: 0, adj: 0, external: 0 }; cs.forEach(function (c) { pipe[PX.readState(c)]++; });
    var pipeRows = [{ label: t('stUnread'), value: pipe.unread }, { label: t('stSingle'), value: pipe.single }, { label: t('stDouble'), value: pipe.double }, { label: t('stAdj'), value: pipe.adj }];
    if (pipe.external) pipeRows.push({ label: t('extRef'), value: pipe.external });
    var qRows = TX.QUALITY.map(function (q) { return { label: pick(q.name), value: cs.filter(function (c) { return c.quality === q.id; }).length }; });
    var mRows = TX.MODALITIES.map(function (m) { return { label: pick(m.name), value: cs.filter(function (c) { return c.modality === m.id; }).length }; }).filter(function (r) { return r.value > 0; });
    var ags = []; cs.forEach(function (c) { var r1 = PX.findingsOf(c.id, 'R1'), r2 = PX.findingsOf(c.id, 'R2'); if (r1.length && r2.length) { var j = MET.readerAgreement(r1, r2).jaccard; if (j !== null) ags.push(j); } });
    var meanAg = ags.length ? ags.reduce(function (s, x) { return s + x; }, 0) / ags.length : null;
    var ready = cs.filter(function (c) { return PX.caseStatus(c) === 'ready'; }).length;
    return '<div class="stack">' +
      '<div class="row between"><p class="muted" style="max-width:70ch">' + esc(t('obsLead')) + '</p><div class="row"><label class="check"><input type="checkbox" data-action="obs:demo"' + (state.ui.obsIncludeDemo ? ' checked' : '') + '><span>' + esc(t('includeDemo')) + '</span></label><label class="check"><input type="checkbox" data-action="obs:open"' + (state.ui.obsIncludeOpen ? ' checked' : '') + '><span>' + esc(t('includeOpen')) + '</span></label></div></div>' +
      '<div class="grid-kpi">' + kpi(cs.length, t('kpiCases')) + kpi(ready, t('kpiReady')) + kpi(pipe.adj, t('kpiAdjudicated')) + kpi(adj.length, t('kpiFindings')) + kpi(meanAg === null ? '—' : PX.pct(meanAg), t('agreementMean') + (ags.length ? ' (n=' + ags.length + ')' : '')) + '</div>' +
      '<div class="grid-2">' +
      PX.chartWithTable('codes', t('chartFindings'), codeRows, { labelHead: t('colCode'), s1: t('findings'), labelW: 230 }) +
      PX.chartWithTable('prov', t('chartProvince'), provRows, { labelHead: t('colProvince'), s1: t('cases'), labelW: 200 }) +
      PX.chartWithTable('age', t('chartAgeSex'), ageRows, { labelHead: t('ageBand'), s1: PX.optName(TX.SEXES, 'F'), s2: PX.optName(TX.SEXES, 'M'), labelW: 90, note: noAge ? t('obsNoAge', { n: noAge }) : '' }) +
      PX.chartWithTable('pipe', t('chartStatus'), pipeRows, { labelHead: t('colStatus'), s1: t('cases'), labelW: 150 }) +
      PX.chartWithTable('quality', t('chartQuality'), qRows, { labelHead: t('quality'), s1: t('cases'), labelW: 120 }) +
      PX.chartWithTable('modality', t('chartModality'), mRows, { labelHead: t('modality'), s1: t('cases'), labelW: 150 }) +
      '</div></div>';
  };
  function kpi(v, l) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div></div>'; }
  A['obs:demo'] = function (arg, el) { state.ui.obsIncludeDemo = !!el.checked; PX.render(); };
  A['obs:open'] = function (arg, el) { state.ui.obsIncludeOpen = !!el.checked; PX.render(); };

  // ================= EVALUATION =================
  var ev = { text: '', threshold: 0.5, results: null, synthetic: false, error: null };
  state.evaluation = ev;
  function evalSet() { return state.cases.filter(function (c) { return c.adjudicationComplete && PX.caseStatus(c) === 'ready'; }); }
  PX.views.evaluacion = function () {
    var set = evalSet();
    var html = '<div class="stack"><p class="muted" style="max-width:76ch">' + esc(t('evalLead')) + '</p>' +
      '<div class="grid-2"><div class="card"><div class="field"><label for="ev-json">' + esc(t('pastePredictions')) + '</label><textarea id="ev-json" style="min-height:160px" class="mono" placeholder=\'[{"caseId":"DR-XXXX-XXXX","code":"DEN-PAR","score":0.87}]\' data-action="eval:text">' + esc(ev.text) + '</textarea><div class="help">' + esc(t('evalFormat')) + '</div></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-action="eval:synthetic">' + esc(t('loadSynthetic')) + '</button><button class="btn primary" data-action="eval:compute">' + esc(t('evaluate')) + '</button></div>' + (ev.error ? '<div class="banner crit small" style="margin-top:8px">' + PX.ICONS.warn + '<div>' + esc(ev.error) + '</div></div>' : '') + '</div>' +
      '<div class="card"><div class="field"><label for="ev-thr">' + esc(t('threshold')) + ' <span class="mono" id="ev-thr-v">' + ev.threshold.toFixed(2) + '</span></label><input id="ev-thr" type="range" min="0.05" max="0.95" step="0.05" value="' + ev.threshold + '" data-action="eval:threshold"></div>' +
      '<p class="small muted" style="margin-top:10px">' + esc(set.length ? t('evalSet', { n: set.length }) : t('evalNeedsCases')) + '</p>' +
      (ev.synthetic ? '<div class="banner warn small" style="margin-top:8px">' + PX.ICONS.warn + '<div>' + esc(t('syntheticNote')) + '</div></div>' : '') +
      '<p class="small faint" style="margin-top:10px">' + esc(t('evalStandards')) + '</p></div></div>';
    if (ev.results) {
      var rows = ev.results.map(function (r) {
        var m = r.m;
        return '<tr><td><span class="mono">' + esc(r.code) + '</span><div class="small muted">' + esc(PX.findingName(r.code)) + '</div></td><td class="num">' + m.counts.tp + '</td><td class="num">' + m.counts.fp + '</td><td class="num">' + m.counts.fn + '</td><td class="num">' + m.counts.tn + '</td>' +
          '<td class="num">' + PX.fmtCI(m.prevalence) + '</td><td class="num">' + PX.fmtCI(m.sensitivity) + '</td><td class="num">' + PX.fmtCI(m.specificity) + '</td><td class="num">' + PX.fmtCI(m.ppv) + '</td><td class="num">' + PX.fmtCI(m.npv) + '</td><td class="num">' + (m.f1 === null ? '—' : m.f1.toFixed(2)) + '</td><td class="num">' + (m.auc === null ? '—' : m.auc.toFixed(2)) + '</td></tr>';
      }).join('');
      html += '<div class="card" style="padding:0"><div class="row between" style="padding:12px 16px 0"><h3>' + esc(t('result')) + '</h3><div class="row"><button class="btn sm" data-action="eval:copy">' + esc(t('copyCsv')) + '</button>' + (state.downloads ? '<button class="btn sm" data-action="eval:download">' + esc(t('downloadCsv')) + '</button>' : '') + '</div></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('colCode')) + '</th><th class="num">' + esc(t('colTP')) + '</th><th class="num">' + esc(t('colFP')) + '</th><th class="num">' + esc(t('colFN')) + '</th><th class="num">' + esc(t('colTN')) + '</th><th class="num">' + esc(t('colPrev')) + '</th><th class="num">' + esc(t('colSens')) + '</th><th class="num">' + esc(t('colSpec')) + '</th><th class="num">' + esc(t('colPPV')) + '</th><th class="num">' + esc(t('colNPV')) + '</th><th class="num">' + esc(t('colF1')) + '</th><th class="num">' + esc(t('colAUC')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }
    html += detectorEvalCard();
    return html + '</div>';
  };
  // ---- experimental detector against the AKUDENTAL reference (object-level, IoU matching) ----
  var dev = { running: null, result: null };
  function detectorEvalCard() {
    var D = root.PX_DETECT; if (!D) return '';
    var open = state.cases.filter(function (c) { return c.isOpenData && (c.datasetKey || 'aku') === 'aku' && c.ref && c.ref.structures; });
    var html = '<div class="card"><h3>' + esc(t('evalDetector')) + ' <span class="muted mono small">v' + D.VERSION + '</span></h3><p class="small muted" style="max-width:80ch">' + esc(t('evalDetectorHelp')) + '</p>' +
      '<p class="small" style="margin-top:6px">' + esc(t('detectHelp', { n: D.MEASURED.images, sens: Math.round(D.MEASURED.sensitivity * 100), ppv: Math.round(D.MEASURED.ppv * 100), iou: D.MEASURED.iou })) + '</p>';
    if (dev.running) html += '<p class="small" id="dev-progress">' + esc(t('evalDetectorRunning', dev.running)) + '</p>';
    else html += '<div class="row" style="margin-top:8px"><button class="btn" data-action="eval:detector"' + (open.length ? '' : ' disabled') + '>' + esc(t('evalDetectorRun', { n: open.length })) + '</button></div>';
    if (dev.result) {
      var r = dev.result, sens = MET.wilson(r.tp, r.tp + r.fn), ppv = MET.wilson(r.tp, r.tp + r.fp), f1 = (2 * r.tp) / Math.max(1, 2 * r.tp + r.fp + r.fn);
      html += '<p class="small muted" style="margin-top:8px">' + esc(t('evalDetectorResult', { n: r.n, ref: r.tp + r.fn, det: r.tp + r.fp })) + '</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th class="num">TP</th><th class="num">FP</th><th class="num">FN</th><th class="num">' + esc(t('colSens')) + '</th><th class="num">' + esc(t('colPPV')) + '</th><th class="num">F1</th></tr></thead><tbody><tr><td class="num">' + r.tp + '</td><td class="num">' + r.fp + '</td><td class="num">' + r.fn + '</td><td class="num">' + PX.fmtCI(sens) + '</td><td class="num">' + PX.fmtCI(ppv) + '</td><td class="num">' + f1.toFixed(2) + '</td></tr></tbody></table></div>';
    }
    return html + '</div>';
  }
  A['eval:detector'] = function () {
    var D = root.PX_DETECT; var open = state.cases.filter(function (c) { return c.isOpenData && (c.datasetKey || 'aku') === 'aku' && c.ref && c.ref.structures; });
    if (!D || !open.length) return;
    dev.running = { done: 0, total: open.length }; dev.result = null; PX.render();
    var tot = { tp: 0, fp: 0, fn: 0, n: 0 }, i = 0;
    function step() {
      if (i >= open.length) { dev.running = null; dev.result = tot; return PX.audit('detector.evaluate', 'AKUDENTAL', tot.n + ' cases: TP ' + tot.tp + ' FP ' + tot.fp + ' FN ' + tot.fn).then(function () { PX.render(); }); }
      var c = open[i++];
      return PX.imageBitmap(c.id).then(function (bmp) {
        if (bmp) {
          var dets = D.detect(bmp);
          var refs = c.ref.structures.map(function (st) { return { x: st.box[0], y: st.box[1], w: st.box[2], h: st.box[3] }; });
          var r = D.evaluate(dets, refs, 0.25); tot.tp += r.tp; tot.fp += r.fp; tot.fn += r.fn; tot.n++;
        }
        dev.running = { done: i, total: open.length }; var pe = PX.byId('dev-progress'); if (pe) pe.textContent = t('evalDetectorRunning', dev.running);
        return new Promise(function (res) { setTimeout(res, 0); }).then(step);
      });
    }
    step();
  };
  A['eval:text'] = function (arg, el) { ev.text = el.value; ev.synthetic = false; };
  A['eval:threshold'] = function (arg, el) { ev.threshold = parseFloat(el.value); var v = PX.byId('ev-thr-v'); if (v) v.textContent = ev.threshold.toFixed(2); if (ev.results) { compute(); PX.render(); } };
  A['eval:synthetic'] = function () {
    var set = evalSet(); if (!set.length) { ev.error = t('evalNeedsCases'); PX.render(); return; }
    var rnd = seeded(42);
    var codes = {}; set.forEach(function (c) { PX.findingsOf(c.id, 'ADJ').forEach(function (a) { codes[a.code] = 1; }); });
    var preds = [];
    set.forEach(function (c) {
      var truth = {}; PX.findingsOf(c.id, 'ADJ').forEach(function (a) { truth[a.code] = 1; });
      Object.keys(codes).forEach(function (code) {
        var flip = rnd() < 0.12;
        var pos = truth[code] ? !flip : flip;
        var score = pos ? 0.6 + rnd() * 0.4 : rnd() * 0.5;
        preds.push({ caseId: c.pseudonym, code: code, score: Math.round(score * 100) / 100 });
      });
    });
    ev.text = JSON.stringify(preds, null, 1); ev.synthetic = true; ev.error = null;
    compute(); PX.render();
  };
  A['eval:compute'] = function () { var ta = PX.byId('ev-json'); if (ta) ev.text = ta.value; ev.synthetic = ev.synthetic && ta && ta.value === ev.text; compute(); PX.render(); };
  function seeded(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function compute() {
    ev.error = null; ev.results = null;
    var set = evalSet(); if (!set.length) { ev.error = t('evalNeedsCases'); return; }
    var preds;
    try { preds = JSON.parse(ev.text || '[]'); if (!Array.isArray(preds)) throw new Error('array expected'); } catch (e) { ev.error = t('evalParseError', { e: e.message }); return; }
    var idByKey = {}; set.forEach(function (c) { idByKey[c.id] = c.id; idByKey[c.pseudonym] = c.id; });
    var byCode = {};
    preds.forEach(function (p) { if (!p || !p.code) return; var id = idByKey[p.caseId]; if (!id) return; (byCode[p.code] = byCode[p.code] || []).push({ caseId: id, score: Number(p.score) }); });
    var truthByCode = {};
    set.forEach(function (c) { PX.findingsOf(c.id, 'ADJ').forEach(function (a) { (truthByCode[a.code] = truthByCode[a.code] || {})[c.id] = true; }); });
    var codes = {}; Object.keys(byCode).forEach(function (k) { codes[k] = 1; }); Object.keys(truthByCode).forEach(function (k) { codes[k] = 1; });
    var ids = set.map(function (c) { return c.id; });
    ev.results = Object.keys(codes).sort().map(function (code) { return { code: code, m: MET.evaluateCode(ids, truthByCode[code] || {}, byCode[code] || [], ev.threshold) }; });
    PX.audit('evaluation.run', 'predictions', preds.length + ' predictions, ' + set.length + ' cases, thr ' + ev.threshold);
  }
  function resultsCsv() {
    var head = ['code', 'name', 'tp', 'fp', 'fn', 'tn', 'prevalence', 'sensitivity', 'sens_lo', 'sens_hi', 'specificity', 'spec_lo', 'spec_hi', 'ppv', 'npv', 'f1', 'auc', 'threshold'];
    var lines = [head.join(',')];
    ev.results.forEach(function (r) { var m = r.m; lines.push([r.code, '"' + PX.findingName(r.code).replace(/"/g, '""') + '"', m.counts.tp, m.counts.fp, m.counts.fn, m.counts.tn, n(m.prevalence.p), n(m.sensitivity.p), n(m.sensitivity.lo), n(m.sensitivity.hi), n(m.specificity.p), n(m.specificity.lo), n(m.specificity.hi), n(m.ppv.p), n(m.npv.p), n(m.f1), n(m.auc), ev.threshold].join(',')); });
    return lines.join('\n');
    function n(x) { return x === null || x === undefined || isNaN(x) ? '' : (+x).toFixed(4); }
  }
  A['eval:copy'] = function () { if (!ev.results) return; PX.copyText(resultsCsv()).then(function () { PX.toast(t('copied')); }, function () { PX.toast(t('error'), 'crit'); }); };
  A['eval:download'] = function () { if (!ev.results) return; PX.saveFile('panoramia_evaluation.csv', resultsCsv()).then(function () { PX.toast(t('saved')); }).catch(function (e) { if (e && e.code !== 'declined') PX.toast(t('exportUnavailable'), 'crit'); }); };

  // ================= GOVERNANCE =================
  PX.views.gobernanza = function () {
    var consentRows = TX.CONSENT.map(function (c) { return { label: pick(c.name), value: state.cases.filter(function (x) { return x.consent === c.id; }).length }; });
    var quarantine = state.cases.filter(function (c) { return PX.caseStatus(c) === 'quarantine'; });
    var perms = [['student', 'annotate'], ['faculty', 'annotate adjudicate delete'], ['steward', 'annotate adjudicate delete govern'], ['viewer', '—']];
    var audit = state.audit.slice(0, 200).map(function (a) { return '<tr><td class="small muted" style="white-space:nowrap">' + esc(PX.fmtDate(a.ts)) + '</td><td class="small">' + esc(a.actor) + '</td><td class="small">' + esc(PX.roleName(a.role)) + '</td><td class="mono small">' + esc(a.action) + '</td><td class="small">' + esc(a.target) + '</td><td class="small muted">' + esc(a.details) + '</td></tr>'; }).join('');
    var gov = PX.can('govern');
    return '<div class="stack"><p class="muted" style="max-width:70ch">' + esc(t('govLead')) + '</p>' +
      '<div class="grid-2">' +
      '<div class="card"><h2>' + esc(t('identity')) + '</h2><p class="small muted">' + esc(t('not3')) + '</p><div class="table-wrap" style="margin-top:8px"><table class="table"><thead><tr><th>' + esc(t('role')) + '</th><th>' + (I.getLang() === 'en' ? 'Permissions' : 'Permisos') + '</th></tr></thead><tbody>' + perms.map(function (p) { return '<tr' + (state.settings.role === p[0] ? ' style="font-weight:600"' : '') + '><td>' + esc(PX.roleName(p[0])) + '</td><td class="mono small">' + esc(p[1]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><h2>' + esc(t('consentOverview')) + '</h2>' + PX.barChart(consentRows, { labelW: 300, title: t('consentOverview') }) + (quarantine.length ? '<p class="small" style="margin-top:8px"><span class="pill warn">' + esc(t('statusQuarantine')) + '</span> ' + quarantine.map(function (c) { return '<span class="mono">' + esc(c.pseudonym) + '</span>'; }).join(', ') + '</p>' : '') + '</div>' +
      '</div>' +
      '<div class="card"><h2>' + esc(t('exportTitle')) + '</h2><p class="small muted">' + esc(t('exportHelp')) + '</p>' + (gov ? '<div class="row" style="margin-top:10px"><label class="check"><input type="checkbox" id="exp-images" checked><span>' + esc(t('includeImages')) + '</span></label>' +
        (state.downloads ? '<button class="btn primary" data-action="gov:export">' + esc(t('exportBundle')) + '</button>' : '<span class="small muted">' + esc(t('exportUnavailable')) + '</span>') + '<button class="btn" data-action="gov:copy">' + esc(t('copyJson')) + '</button>' +
        '<label class="btn" for="imp-bundle">' + esc(t('importBundle')) + '</label><input id="imp-bundle" type="file" accept="application/json,.json" class="sr-only" data-action="gov:import">' +
        '<button class="btn ghost danger" style="margin-left:auto" data-action="gov:wipe">' + esc(t('wipe')) + '</button></div>' : '<div class="banner small" style="margin-top:8px">' + PX.ICONS.info + '<div>' + esc(t('stewardOnly')) + '</div></div>') + '</div>' +
      datasetCard(gov) +
      '<div class="card"><div class="row between"><h2>' + esc(t('auditLog')) + ' <span class="muted">(' + state.audit.length + ')</span></h2><div class="row"><button class="btn sm" data-action="gov:auditCopy">' + esc(t('copyCsv')) + '</button>' + (state.downloads ? '<button class="btn sm" data-action="gov:auditCsv">' + esc(t('downloadCsv')) + '</button>' : '') + '</div></div>' +
      (audit ? '<div class="table-wrap" style="max-height:360px;overflow:auto;margin-top:8px"><table class="table"><thead><tr><th>' + esc(t('colTime')) + '</th><th>' + esc(t('colActor')) + '</th><th>' + esc(t('colRole')) + '</th><th>' + esc(t('colAction')) + '</th><th>' + esc(t('colTarget')) + '</th><th>' + esc(t('colDetails')) + '</th></tr></thead><tbody>' + audit + '</tbody></table></div>' : '<p class="small muted">' + esc(t('auditEmpty')) + '</p>') + '</div>' +
      '<div class="grid-2"><div class="card"><h2>' + esc(t('charterTitle')) + '</h2><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">' + I.S.charter[I.getLang() === 'en' ? 1 : 0].map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="card"><h2>' + esc(t('privacyDesign')) + '</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ['pd1', 'pd2', 'pd3', 'pd4'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul></div></div>' +
      '</div>';
  };
  function bundle(withImages) {
    var cases = state.cases.filter(function (c) { return PX.caseStatus(c) === 'ready'; });
    var ids = {}; cases.forEach(function (c) { ids[c.id] = true; });
    var out = { app: 'PanoramIA', version: PX.APP_VERSION, exportedAt: new Date().toISOString(), cases: cases, annotations: state.annotations.filter(function (a) { return ids[a.caseId]; }), checklists: state.checklists.filter(function (c) { return !c.caseId || ids[c.caseId]; }), audit: state.audit, images: [] };
    if (!withImages) return Promise.resolve(out);
    return Promise.all(cases.map(function (c) {
      var im = state.images[c.id]; if (!im || !im.blob) return null;
      return new Promise(function (resolve) { var fr = new FileReader(); fr.onload = function () { resolve({ caseId: c.id, png: fr.result, thumb: im.thumb }); }; fr.onerror = function () { resolve(null); }; fr.readAsDataURL(im.blob); });
    })).then(function (imgs) { out.images = imgs.filter(Boolean); return out; });
  }
  A['gov:export'] = function () {
    if (!PX.can('govern')) return;
    var withImages = !!(PX.byId('exp-images') && PX.byId('exp-images').checked);
    bundle(withImages).then(function (b) { return PX.saveFile('panoramia_export_' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify(b)], { type: 'application/json' })); })
      .then(function () { PX.audit('export.bundle', 'json', withImages ? 'with images' : 'no images'); PX.toast(t('saved')); })
      .catch(function (e) { if (e && e.code !== 'declined') PX.toast(t('exportUnavailable'), 'crit'); });
  };
  A['gov:copy'] = function () { if (!PX.can('govern')) return; bundle(false).then(function (b) { return PX.copyText(JSON.stringify(b)); }).then(function () { PX.audit('export.copy', 'json', 'no images'); PX.toast(t('copied')); }, function () { PX.toast(t('error'), 'crit'); }); };
  A['gov:import'] = function (arg, el) {
    if (!PX.can('govern')) return;
    var f = el.files && el.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var b;
      try { b = JSON.parse(fr.result); if (!b || b.app !== 'PanoramIA' || !Array.isArray(b.cases)) throw new Error('not a PanoramIA bundle'); } catch (e) { PX.toast(t('importError', { e: e.message }), 'crit'); return; }
      var existing = {}; state.cases.forEach(function (c) { existing[c.id] = true; });
      var idMap = {}, ops = [];
      b.cases.forEach(function (c) {
        var nid = existing[c.id] ? PX.uid('c') : c.id; idMap[c.id] = nid;
        var nc = Object.assign({}, c, { id: nid, isDemo: !!c.isDemo, createdAt: c.createdAt || Date.now(), updatedAt: Date.now() });
        nc.status = PX.caseStatus(nc);
        ops.push(DB.put('cases', nc));
      });
      (b.images || []).forEach(function (im) {
        var nid = idMap[im.caseId]; if (!nid || !im.png) return;
        var blob = dataUrlToBlob(im.png); if (!blob) return;
        ops.push(DB.put('images', { caseId: nid, blob: blob, thumb: im.thumb || '' }));
      });
      (b.annotations || []).forEach(function (a) { var nid = idMap[a.caseId]; if (!nid) return; ops.push(DB.put('annotations', Object.assign({}, a, { id: PX.uid('f'), caseId: nid }))); });
      (b.checklists || []).forEach(function (k) { var nid = k.caseId ? idMap[k.caseId] : null; if (k.caseId && !nid) return; ops.push(DB.put('checklists', Object.assign({}, k, { id: PX.uid('k'), caseId: nid }))); });
      Promise.all(ops).then(function () { return PX.audit('import.bundle', f.name, b.cases.length + ' cases'); }).then(PX.refreshAll).then(function () { PX.toast(t('imported', { n: b.cases.length })); PX.render(); }).catch(function (e) { PX.toast(t('importError', { e: e.message }), 'crit'); });
    };
    fr.readAsText(f);
  };
  function dataUrlToBlob(url) {
    try {
      var m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(url); if (!m) return null;
      var mime = m[1] || 'image/png';
      if (m[2]) { var bin = atob(m[3]); var u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Blob([u8], { type: mime }); }
      return new Blob([decodeURIComponent(m[3])], { type: mime });
    } catch (e) { return null; }
  }
  A['gov:wipe'] = function () {
    if (!PX.can('govern')) return;
    PX.openModal('<header><h2>' + esc(t('wipe')) + '</h2></header><div class="body"><p>' + esc(t('wipeConfirm')) + '</p><input id="wipe-in" type="text" class="mono" style="margin-top:10px" autocomplete="off"></div><footer><button class="btn" data-action="modal:close">' + esc(t('cancel')) + '</button><button class="btn danger" data-action="gov:wipeConfirm">' + esc(t('confirm')) + '</button></footer>', { narrow: true });
  };
  A['gov:wipeConfirm'] = function () {
    var v = PX.byId('wipe-in').value.trim().toUpperCase();
    if (v !== t('wipeWord')) { PX.byId('wipe-in').style.borderColor = 'var(--crit)'; return; }
    DB.clearAll().then(function () { state.settings.demoLoadedOnce = true; state.settings.openLoadedOnce = true; state.settings.openLoadedKeys = { aku: true, opg: true }; PX.saveSettings(); return PX.refreshAll(); }).then(function () { return PX.audit('data.wipe', 'all', ''); }).then(function () { PX.closeModal(); state.currentCaseId = null; PX.toast(t('wiped')); PX.render(); });
  };
  function auditCsv() { var lines = ['time,actor,role,action,target,details']; state.audit.forEach(function (a) { lines.push([new Date(a.ts).toISOString(), q(a.actor), a.role, a.action, q(a.target), q(a.details)].join(',')); }); return lines.join('\n'); function q(s) { return '"' + String(s || '').replace(/"/g, '""') + '"'; } }
  A['gov:auditCopy'] = function () { PX.copyText(auditCsv()).then(function () { PX.toast(t('copied')); }, function () { PX.toast(t('error'), 'crit'); }); };
  A['gov:auditCsv'] = function () { PX.saveFile('panoramia_audit.csv', auditCsv()).then(function () { PX.toast(t('saved')); }).catch(function (e) { if (e && e.code !== 'declined') PX.toast(t('exportUnavailable'), 'crit'); }); };

  // ================= DATASET CARD (governance + help) =================
  function datasetCard(gov, compact) { return PX.openSets().map(function (o) { return datasetCardFor(o, gov, compact); }).join(''); }
  function datasetCardFor(o, gov, compact) {
    var sub = o.subset(); if (!sub) return '';
    var key = o.key, n = PX.openDataCount(key), loaded = PX.hasOpenData(key), isOpg = key === 'opg';
    var src = isOpg ? '<a href="' + attr(sub.sourceRepo) + '" target="_blank" rel="noopener">' + esc(sub.sourceRepo.replace('https://', '')) + '</a> · <span class="mono">' + esc(String(sub.sourceCommit || '')) + '</span>'
                    : '<a href="' + attr(sub.sourceRepo) + '" target="_blank" rel="noopener">' + esc(sub.sourceRepo.replace('https://', '')) + '</a> · commit <span class="mono">' + esc(String(sub.sourceCommit || '').slice(0, 12)) + '</span>';
    var rows = isOpg ? [
      [t('dsSource'), src], [t('dsCitation'), esc(sub.citation)], [t('dsLicence'), esc(sub.licence)],
      [t('dsSubjects'), esc(t('dsOpgSubjectsText'))], [t('dsEthics'), esc(t('dsOpgEthicsText'))], [t('dsAnnotations'), esc(t('dsOpgAnnotationsText'))],
      [t('dsSelection'), esc(t('dsOpgSelectionText'))], [t('dsProcessing'), esc(t('dsOpgProcessingText'))]
    ] : [
      [t('dsSource'), src], [t('dsCitation'), esc(sub.citation)], [t('dsLicence'), esc(sub.licence)],
      [t('dsSubjects'), esc(t('dsSubjectsText'))], [t('dsEthics'), esc(t('dsEthicsText'))], [t('dsAnnotations'), esc(t('dsAnnotationsText'))],
      [t('dsSelection'), esc(t('dsSelectionText'))], [t('dsProcessing'), esc(t('dsProcessingText'))]
    ];
    var actions = '';
    if (!compact) {
      var busy = state.ui.openProgress && state.ui.openProgress.key === key;
      actions = '<div class="row" style="margin-top:10px">' +
        (loaded ? '<span class="pill ok">' + esc(t('openLoaded', { n: n })) + '</span>' : '<button class="btn primary" data-action="open:load" data-arg="' + key + '">' + esc(t(isOpg ? 'loadOpenOpg' : 'loadOpen')) + '</button>') +
        (PX.canLoadRemote() ? '<button class="btn" data-action="open:loadFull" data-arg="' + key + '"' + (n >= o.total || state.ui.openProgress ? ' disabled' : '') + '>' + esc(t(isOpg ? 'loadOpenFullOpg' : 'loadOpenFull')) + '</button><span id="open-progress-' + key + '" class="small muted">' + (busy ? esc(t('openProgress', state.ui.openProgress)) : '') + '</span>' : '<span class="small muted">' + esc(t('loadOpenFullHelp')) + '</span>') +
        (loaded && gov ? '<button class="btn ghost danger" style="margin-left:auto" data-action="open:remove" data-arg="' + key + '">' + esc(t('removeOpen')) + '</button>' : '') + '</div>';
    }
    return '<div class="card"><h2>' + esc(t('datasetCard')) + ' · ' + esc(sub.dataset) + '</h2>' +
      (o.nc ? '<div class="banner warn small" style="margin:8px 0">' + PX.ICONS.warn + '<div>' + esc(t('dsNC')) + '</div></div>' : '<div class="banner info small" style="margin:8px 0">' + PX.ICONS.info + '<div>' + esc(t('dsCommercialOk')) + '</div></div>') +
      '<div class="table-wrap"><table class="table">' + rows.map(function (r) { return '<tr><th style="width:22%">' + esc(r[0]) + '</th><td class="small">' + r[1] + '</td></tr>'; }).join('') + '</table></div>' + actions + '</div>';
  }

  // ================= HELP =================
  PX.views.ayuda = function () {
    var tabs = [['mark', 'helpMarking'], ['fdi', 'helpFdi'], ['class', 'helpClassifications'], ['tax', 'helpTaxonomy'], ['dicom', 'helpDicom'], ['open', 'helpOpenData'], ['limits', 'helpLimits'], ['about', 'aboutTitle']];
    var seg = '<div class="seg" role="tablist">' + tabs.map(function (tb) { return '<button role="tab" data-action="help:tab" data-arg="' + tb[0] + '" class="' + (state.ui.helpTab === tb[0] ? 'on' : '') + '">' + esc(t(tb[1])) + '</button>'; }).join('') + '</div>';
    var body = '';
    var en = I.getLang() === 'en';
    if (state.ui.helpTab === 'fdi') {
      body = '<div class="card"><h2>' + esc(t('helpFdi')) + '</h2><p style="max-width:76ch">' + esc(t('helpFdiText')) + '</p><div style="margin-top:12px"><div data-odont="help">' + PX.odontogram({}) + '</div><div style="margin-top:8px" data-odont="help2">' + PX.odontogram({ primary: true }) + '</div></div>' +
        '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>' + (en ? 'Position' : 'Posición') + '</th><th>' + (en ? 'Permanent' : 'Permanente') + '</th><th>' + (en ? 'Primary' : 'Temporal') + '</th></tr></thead><tbody>' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (p) { return '<tr><td class="mono">' + p + '</td><td>' + esc(pick(TX.TOOTH_NAMES[p])) + '</td><td>' + (TX.PRIMARY_TOOTH_NAMES[p] ? esc(pick(TX.PRIMARY_TOOTH_NAMES[p])) : '—') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    } else if (state.ui.helpTab === 'class') {
      var cards = en ? [
        ['Pell and Gregory (1933)', 'Lower third molars. Ramus relationship: Class I, enough space between the ramus and the distal surface of the second molar for the crown; Class II, less space than the crown width; Class III, the tooth lies entirely within the ramus. Depth: A, occlusal plane level with the second molar; B, between the occlusal plane and the cervical line; C, below the cervical line.'],
        ['Winter (1926)', 'Angulation of the third molar relative to the long axis of the second molar: vertical, mesioangular, horizontal (transverse), distoangular, and less common inverted, buccoangular or linguoangular positions.'],
        ['Pederson difficulty index (1988)', 'Sum of three scores: angulation (mesioangular 1, horizontal or transverse 2, vertical 3, distoangular 4), depth (A 1, B 2, C 3) and ramus relationship (I 1, II 2, III 3). Totals of 3 to 4 are minimally difficult, 5 to 6 moderately difficult and 7 to 10 very difficult. Widely taught; its predictive validity in the literature is limited, so the tool uses it as a teaching aid only.'],
        ['Rood and Shehab (1990)', 'Seven panoramic signs of a close relationship between the third molar and the inferior alveolar canal: darkening of the root, deflection of the root, narrowing of the root, dark and bifid apex, interruption of the white line of the canal, diversion of the canal and narrowing of the canal. Diversion of the canal, darkening of the root and interruption of the white line were significantly associated with nerve injury.'],
        ['Mandibular cortical index (Klemetti, 1994)', 'Appearance of the mandibular cortex below the mental foramen on panoramic radiographs: C1, even and sharp endosteal margin; C2, semilunar defects or endosteal residues; C3, heavily porous cortex. C2 and C3 are associated with low bone mineral density and warrant medical assessment.']
      ] : [
        ['Pell y Gregory (1933)', 'Terceros molares inferiores. Relación con la rama: clase I, espacio suficiente entre la rama y la cara distal del segundo molar para la corona; clase II, espacio menor que el ancho de la corona; clase III, el diente está totalmente dentro de la rama. Profundidad: A, plano oclusal al nivel del segundo molar; B, entre el plano oclusal y la línea cervical; C, por debajo de la línea cervical.'],
        ['Winter (1926)', 'Angulación del tercer molar respecto al eje longitudinal del segundo molar: vertical, mesioangular, horizontal (transversal), distoangular y, menos frecuentes, invertido, bucoangular o linguoangular.'],
        ['Índice de dificultad de Pederson (1988)', 'Suma de tres puntuaciones: angulación (mesioangular 1, horizontal o transversal 2, vertical 3, distoangular 4), profundidad (A 1, B 2, C 3) y relación con la rama (I 1, II 2, III 3). Totales de 3 a 4: dificultad mínima; 5 a 6: moderada; 7 a 10: muy difícil. Es ampliamente enseñado; su validez predictiva en la literatura es limitada, por lo que la herramienta lo usa solo como apoyo docente.'],
        ['Rood y Shehab (1990)', 'Siete signos panorámicos de relación estrecha entre el tercer molar y el conducto dentario inferior: oscurecimiento de la raíz, desviación de la raíz, estrechamiento de la raíz, ápice oscuro y bífido, interrupción de la línea blanca del conducto, desviación del conducto y estrechamiento del conducto. La desviación del conducto, el oscurecimiento radicular y la interrupción de la línea blanca se asociaron significativamente con lesión nerviosa.'],
        ['Índice cortical mandibular (Klemetti, 1994)', 'Aspecto de la cortical mandibular bajo el agujero mentoniano en la panorámica: C1, margen endóstico uniforme y nítido; C2, defectos semilunares o residuos endósticos; C3, cortical muy porosa. C2 y C3 se asocian con baja densidad mineral ósea y ameritan evaluación médica.']
      ];
      body = '<div class="stack">' + cards.map(function (c) { return '<div class="card"><h2>' + esc(c[0]) + '</h2><p style="max-width:80ch">' + esc(c[1]) + '</p></div>'; }).join('') + '</div>';
    } else if (state.ui.helpTab === 'tax') {
      body = '<div class="card" style="padding:0"><div class="table-wrap"><table class="table"><thead><tr><th>' + esc(t('colCode')) + '</th><th>' + (en ? 'Name' : 'Nombre') + '</th><th>' + (en ? 'Group' : 'Grupo') + '</th><th>' + (en ? 'Per tooth' : 'Por diente') + '</th><th>' + (en ? 'Typical appearance' : 'Aspecto típico') + '</th></tr></thead><tbody>' +
        TX.FINDINGS.map(function (f) { return '<tr><td class="mono"><span class="sw" style="background:' + TX.colorOf(f.code) + '"></span>' + esc(f.code) + '</td><td>' + esc(pick(f.name)) + '</td><td><span class="swatch sw-' + TX.GROUPS[f.group].color + '"></span>' + esc(pick(TX.GROUPS[f.group].name)) + '</td><td>' + (f.tooth ? esc(t('yes')) : esc(t('no'))) + '</td><td class="small">' + esc(pick(f.desc)) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    } else if (state.ui.helpTab === 'dicom') {
      var keys = Object.keys(DICOM.DICT).filter(function (k) { return DICOM.DICT[k][2] !== 'remove'; });
      body = '<div class="card"><h2>' + esc(t('helpDicom')) + '</h2><p style="max-width:76ch">' + esc(t('helpDicomText')) + '</p><div class="table-wrap" style="margin-top:10px"><table class="table"><thead><tr><th>Tag</th><th>VR</th><th>' + (en ? 'Name' : 'Nombre') + '</th><th></th></tr></thead><tbody>' +
        keys.map(function (k) { var d = DICOM.DICT[k]; return '<tr><td class="mono">(' + k.slice(0, 4) + ',' + k.slice(4) + ')</td><td class="mono">' + d[0] + '</td><td>' + esc(d[1]) + '</td><td><span class="pill ' + (d[2] === 'keep' ? 'ok' : 'info') + '">' + esc(d[2] === 'keep' ? t('kept') : t('derived')) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="small muted" style="margin-top:10px">' + esc(en ? 'Derived: StudyDate becomes the year only; PatientBirthDate and PatientAge become an age band; PatientSex is kept as a single letter. The source values are discarded.' : 'Derivado: StudyDate se convierte solo en el año; PatientBirthDate y PatientAge en una banda de edad; PatientSex se conserva como una letra. Los valores de origen se descartan.') + '</p></div>';
    } else if (state.ui.helpTab === 'mark') {
      var legend = function (codes) { return '<div class="chips">' + codes.map(function (code) { var f = TX.FINDING_BY_CODE[code]; return '<span class="chip" style="cursor:default"><span class="sw" style="background:' + f.color + '"></span>' + esc(pick(f.name)) + ' <span class="mono small muted">' + code + '</span></span>'; }).join('') + '</div>'; };
      body = '<div class="stack"><div class="card"><h2>' + esc(t('helpMarking')) + '</h2><p style="max-width:78ch">' + esc(t('helpMarkingIntro')) + '</p>' +
        '<h3 style="margin-top:12px">' + esc(t('helpShapes')) + '</h3><p class="small" style="max-width:80ch">' + esc(t('helpShapesText')) + '</p>' +
        '<h3 style="margin-top:12px">' + esc(t('helpColours')) + '</h3><p class="small muted" style="max-width:80ch">' + esc(t('helpColoursText')) + '</p>' +
        '<h4 style="margin-top:8px">' + esc(pick(TX.GROUPS.DEN.name)) + '</h4>' + legend(TX.FINDINGS.filter(function (f) { return f.group === 'DEN'; }).map(function (f) { return f.code; })) +
        '<h4 style="margin-top:8px">' + esc(pick(TX.GROUPS.ANA.name)) + '</h4>' + legend(TX.ANATOMY_CODES) +
        '<h3 style="margin-top:12px">' + esc(t('helpAuto')) + '</h3><p class="small" style="max-width:80ch">' + esc(t('helpAutoText')) + '</p><ul class="small" style="margin:4px 0 0;padding-left:18px">' + ['helpAuto1', 'helpAuto2', 'helpAuto3', 'helpAuto4', 'helpAuto5'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul>' +
        '<h3 style="margin-top:12px">' + esc(t('geomTitle')) + '</h3><p class="small" style="max-width:80ch">' + esc(t('geomLead')) + '</p><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>' + esc(t('g_winterRule')) + '</li><li>' + esc(t('g_depthRule')) + '</li><li>' + esc(t('g_ramusRule')) + '</li><li>' + esc(t('g_canalRule')) + '</li><li>' + esc(t('g_sinusRule')) + '</li></ul>' +
        '<h3 style="margin-top:12px">' + esc(t('calibration')) + '</h3><p class="small" style="max-width:80ch">' + esc(t('calibrateHelp')) + '</p>' +
        (root.PX_DETECT ? '<h3 style="margin-top:12px">' + esc(t('detectTitle', { v: root.PX_DETECT.VERSION })) + '</h3><p class="small" style="max-width:80ch">' + esc(t('detectHelp', { n: root.PX_DETECT.MEASURED.images, sens: Math.round(root.PX_DETECT.MEASURED.sensitivity * 100), ppv: Math.round(root.PX_DETECT.MEASURED.ppv * 100), iou: root.PX_DETECT.MEASURED.iou })) + '</p>' : '') + '</div></div>';
    } else if (state.ui.helpTab === 'open') {
      body = '<div class="stack"><div class="card"><h2>' + esc(t('helpOpenData')) + '</h2><p style="max-width:76ch">' + esc(t('helpOpenIntro')) + '</p><p class="small muted" style="max-width:80ch;margin-top:8px">' + esc(t('helpOpenOthers')) + '</p></div>' + datasetCard(PX.can('govern'), true) + '</div>';
    } else if (state.ui.helpTab === 'limits') {
      body = '<div class="grid-2"><div class="card"><h2>' + esc(t('helpLimits')) + '</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ['lim1', 'lim2', 'lim3', 'lim4', 'lim5'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="card"><h2>' + esc(t('helpShortcuts')) + '</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ['sc1', 'sc2', 'sc3'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul></div></div>';
    } else {
      body = '<div class="card"><h2>' + esc(t('aboutTitle')) + '</h2><p style="max-width:76ch">' + esc(t('aboutText')) + '</p><p class="small muted" style="margin-top:10px">PanoramIA ' + PX.APP_VERSION + ' · ' + (en ? 'rules' : 'reglas') + ' v' + RUB.VERSION + ' · ' + esc(t('notDevice')) + '</p></div>';
    }
    return '<div class="stack">' + seg + body + '</div>';
  };
  A['help:tab'] = function (arg) { state.ui.helpTab = arg; PX.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
