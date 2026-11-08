/* PanoramIA — views: home, case registry, import wizard. */
(function (root) {
  'use strict';
  var PX = root.PX, I = root.PX_I18N, TX = root.PX_TAXONOMY, DB = root.PX_DB, DICOM = root.PX_DICOM, DEMO = root.PX_DEMO, Viewer = root.PX_Viewer;
  var t = PX.t, pick = PX.pick, esc = PX.esc, attr = PX.attr, state = PX.state;
  PX.actions = PX.actions || {};
  var A = PX.actions;

  // ---------------- shared actions ----------------
  A['go'] = function (arg, el, ev) { if (ev) ev.preventDefault(); PX.go(arg); };
  A['lang:set'] = function (arg, el) { state.settings.lang = el.value; I.setLang(el.value); PX.saveSettings(); if (!state.settings.ack) { PX.render(); } else { PX.render(); } };
  A['role:set'] = function (arg, el) { state.settings.role = el.value; PX.saveSettings(); PX.audit('role.switch', el.value, ''); PX.render(); };
  A['actor:set'] = function (arg, el) { state.settings.actor = el.value.trim().slice(0, 40); PX.saveSettings(); };
  A['ack:enter'] = function () {
    state.settings.ack = true; PX.saveSettings(); PX.closeModal();
    PX.audit('session.ack', 'prototype', '');
    if (state.cases.length === 0 && !state.settings.demoLoadedOnce) {
      PX.loadDemo().then(function () { return PX.loadOpenData(); }).then(function () { PX.render(); PX.toast(t('demoLoaded')); }).catch(function (e) { console.error(e); PX.render(); });
    } else PX.render();
  };
  A['demo:load'] = function () { PX.loadDemo().then(function () { PX.render(); PX.toast(t('demoLoaded')); }); };
  A['demo:remove'] = function () { PX.removeDemo().then(function () { PX.render(); }); };
  A['open:load'] = function (arg, el) {
    if (el) el.disabled = true; var key = arg || null;
    PX.loadOpenData(key).then(function () { PX.render(); PX.toast(t('openLoaded', { n: PX.openDataCount(key) })); }).catch(function (e) { console.error(e); PX.toast(t('error'), 'crit'); if (el) el.disabled = false; });
  };
  A['open:remove'] = function (arg) { PX.removeOpenData(arg || null).then(function () { PX.render(); }); };
  A['open:loadFull'] = function (arg, el) {
    if (el) el.disabled = true; var key = arg || 'aku';
    state.ui.openProgress = { key: key, done: 0, total: 0 };
    var box = PX.byId('open-progress-' + key);
    PX.loadOpenDataRemote(key, function (done, total) { state.ui.openProgress = { key: key, done: done, total: total }; var b = PX.byId('open-progress-' + key); if (b) b.textContent = t('openProgress', { done: done, total: total }); })
      .then(function () { state.ui.openProgress = null; PX.render(); PX.toast(t('openLoaded', { n: PX.openDataCount(key) })); })
      .catch(function (e) { console.error(e); state.ui.openProgress = null; PX.toast(t('openLoadFailed'), 'crit'); if (el) el.disabled = false; if (box) box.textContent = ''; });
  };
  A['chart:toggle'] = function (arg, el) {
    var card = el.closest('[data-chart]'); if (!card) return;
    var c = card.querySelector('.c-chart'), tb = card.querySelector('.c-table');
    var showTable = tb.hidden; tb.hidden = !showTable; c.hidden = showTable;
    el.textContent = showTable ? t('chartView') : t('tableView');
  };
  A['modal:close'] = function () { PX.closeModal(); };

  // ---------------- HOME ----------------
  PX.views.inicio = function () {
    var cs = state.cases;
    var ready = cs.filter(function (c) { return PX.caseStatus(c) === 'ready'; }).length;
    var quarantine = cs.length - ready;
    var dbl = cs.filter(function (c) { return PX.findingsOf(c.id, 'R1').length > 0 && PX.findingsOf(c.id, 'R2').length > 0; }).length;
    var adj = cs.filter(function (c) { return !!c.adjudicationComplete; }).length;
    var refFindings = state.annotations.filter(function (a) { return a.reader === 'ADJ'; }).length;
    var demoBanner = PX.hasDemo()
      ? '<div class="banner info">' + PX.ICONS.info + '<div><div>' + esc(t('demoLoaded')) + '</div><div style="margin-top:6px"><button class="btn sm" data-action="demo:remove">' + esc(t('removeDemo')) + '</button></div></div></div>'
      : '<div class="banner">' + PX.ICONS.info + '<div><div>' + esc(t('noCases')) + '</div><div style="margin-top:6px"><button class="btn sm" data-action="demo:load">' + esc(t('loadDemo')) + '</button></div></div></div>';
    var openBanner = PX.openSets().map(function (o) {
      var sub = o.subset(), n = PX.openDataCount(o.key);
      return PX.hasOpenData(o.key)
        ? '<div class="banner info">' + PX.ICONS.info + '<div><div>' + esc(t(o.key === 'opg' ? 'openBannerOpg' : 'openBanner', { name: sub.dataset, n: n, lic: o.licence })) + '</div><div class="row" style="margin-top:6px"><button class="btn sm" data-action="go" data-arg="gobernanza">' + esc(t('datasetCard')) + '</button><button class="btn sm" data-action="open:remove" data-arg="' + o.key + '">' + esc(t('removeOpen')) + '</button></div></div></div>'
        : '<div class="banner">' + PX.ICONS.info + '<div><div>' + esc(t('openData')) + ': ' + esc(sub.dataset) + ' · ' + esc(o.nc ? t('dsNC') : t('dsCommercialOk')) + '</div><div style="margin-top:6px"><button class="btn sm" data-action="open:load" data-arg="' + o.key + '">' + esc(t(o.key === 'opg' ? 'loadOpenOpg' : 'loadOpen')) + '</button></div></div></div>';
    }).join('');
    var recent = state.audit.slice(0, 8).map(function (a) { return '<tr><td class="small muted">' + esc(PX.fmtDate(a.ts)) + '</td><td class="mono small">' + esc(a.action) + '</td><td class="small">' + esc(a.target) + '</td><td class="small muted">' + esc(a.details) + '</td></tr>'; }).join('');
    return '<div class="stack">' +
      '<div class="banner warn">' + PX.ICONS.warn + '<div>' + esc(t('notDevice')) + ' ' + esc(state.storageMemory ? t('memoryOnly') : t('localOnly')) + '</div></div>' +
      '<p style="max-width:70ch">' + esc(t('homeLead')) + '</p>' +
      demoBanner + openBanner +
      '<div class="grid-kpi">' +
      kpi(cs.length, t('kpiCases')) + kpi(ready, t('kpiReady')) + kpi(quarantine, t('kpiQuarantine')) + kpi(dbl, t('kpiDoubleRead')) + kpi(adj, t('kpiAdjudicated')) + kpi(refFindings, t('kpiFindings')) +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><h2>' + esc(t('quickStart')) + '</h2><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px"><li>' + esc(t('qs1')) + '</li><li>' + esc(t('qs2')) + '</li><li>' + esc(t('qs3')) + '</li></ol>' +
      '<div class="row" style="margin-top:12px"><button class="btn primary" data-action="import:open">' + esc(t('newCase')) + '</button><button class="btn" data-action="go" data-arg="casos">' + esc(t('navCases')) + '</button><button class="btn" data-action="go" data-arg="semaforo">' + esc(t('navSemaforo')) + '</button></div></div>' +
      '<div class="card"><h2>' + esc(t('whatItDoes')) + '</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ['does1', 'does2', 'does3', 'does4', 'does5', 'does6'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul>' +
      '<h2 style="margin-top:14px">' + esc(t('whatItDoesNot')) + '</h2><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">' + ['not1', 'not2', 'not3', 'not4'].map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul></div>' +
      '</div>' +
      '<div class="card"><h2>' + esc(t('recentActivity')) + '</h2>' + (recent ? '<div class="table-wrap"><table class="table"><tbody>' + recent + '</tbody></table></div>' : '<p class="muted small">' + esc(t('auditEmpty')) + '</p>') + '</div>' +
      '</div>';
  };
  function kpi(v, l) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div></div>'; }

  // ---------------- CASES ----------------
  function statusPill(c) {
    var s = PX.caseStatus(c);
    return s === 'ready' ? '<span class="pill ok">' + esc(t('statusReady')) + '</span>' : '<span class="pill warn">' + esc(t('statusQuarantine')) + '</span>';
  }
  function readPill(c) {
    var r = PX.readState(c);
    var map = { unread: ['na', 'stUnread'], single: ['info', 'stSingle'], double: ['info', 'stDouble'], adj: ['ok', 'stAdj'], external: ['info', 'extRef'] };
    return '<span class="pill ' + map[r][0] + '">' + esc(t(map[r][1])) + '</span>';
  }
  function filteredCases() {
    var f = state.ui.caseFilter, q = (state.ui.caseSearch || '').toLowerCase();
    return state.cases.filter(function (c) {
      var rs = PX.readState(c), st = PX.caseStatus(c);
      if (f === 'ready' && st !== 'ready') return false;
      if (f === 'quarantine' && st !== 'quarantine') return false;
      if (f === 'unread' && rs !== 'unread' && rs !== 'external') return false; // external-reference cases have no local reads yet
      if (f === 'double' && rs !== 'double') return false;
      if (f === 'adj' && rs !== 'adj' && rs !== 'external') return false;      // reference is complete either way
      if (q) { var hay = [c.pseudonym, c.siteName, c.province, c.modality, c.subjectId].join(' ').toLowerCase(); if (hay.indexOf(q) === -1) return false; }
      return true;
    });
  }
  PX.views.casos = function () {
    var filters = [['all', 'filterAll'], ['ready', 'filterReady'], ['quarantine', 'filterQuarantine'], ['unread', 'filterUnread'], ['double', 'filterDouble'], ['adj', 'filterAdj']];
    var seg = '<div class="seg" role="group">' + filters.map(function (f) { return '<button data-action="cases:filter" data-arg="' + f[0] + '" class="' + (state.ui.caseFilter === f[0] ? 'on' : '') + '">' + esc(t(f[1])) + '</button>'; }).join('') + '</div>';
    var rows = filteredCases().map(function (c) {
      var im = state.images[c.id];
      return '<tr class="click" data-action="case:open" data-arg="' + c.id + '">' +
        '<td>' + (im && im.thumb ? '<img class="thumb" alt="" src="' + im.thumb + '">' : '<div class="thumb"></div>') + '</td>' +
        '<td><span class="mono">' + esc(c.pseudonym) + '</span>' + (c.isDemo ? ' <span class="pill demo">' + esc(t('demo')) + '</span>' : '') + (c.isOpenData ? ' <span class="pill info">' + esc(c.dataset || t('openData')) + '</span>' : '') + (c.subjectId ? '<div class="small faint mono">' + esc(c.subjectId) + '</div>' : '') + '</td>' +
        '<td>' + esc(PX.optName(TX.MODALITIES, c.modality)) + '</td><td>' + esc(c.siteName || '—') + '<div class="small muted">' + esc(c.province || '') + '</div></td>' +
        '<td class="num">' + esc(c.year || '—') + '</td><td>' + esc(c.ageBand || '—') + ' / ' + esc(c.sex || 'U') + '</td>' +
        '<td>' + esc(PX.optName(TX.CONSENT, c.consent)) + '</td><td>' + statusPill(c) + '</td><td>' + readPill(c) + '</td>' +
        '<td><div class="row" style="gap:4px"><button class="btn sm" data-action="case:open" data-arg="' + c.id + '">' + esc(t('annotate')) + '</button>' + (PX.can('delete') ? '<button class="btn sm ghost danger" data-action="case:delete" data-arg="' + c.id + '" aria-label="' + attr(t('delete')) + '">' + esc(t('delete')) + '</button>' : '') + '</div></td></tr>';
    }).join('');
    return '<div class="stack">' +
      '<div class="row between"><div class="row">' + seg + '<input type="search" style="width:260px" placeholder="' + attr(t('search')) + '" value="' + attr(state.ui.caseSearch) + '" data-action="cases:search" aria-label="' + attr(t('search')) + '"></div>' +
      '<div class="row"><button class="btn primary" data-action="import:open">' + esc(t('newCase')) + '</button></div></div>' +
      (rows ? '<div class="card" style="padding:0"><div class="table-wrap"><table class="table"><thead><tr><th></th><th>' + esc(t('colPseudonym')) + '</th><th>' + esc(t('colModality')) + '</th><th>' + esc(t('colSite')) + '</th><th class="num">' + esc(t('colYear')) + '</th><th>' + esc(t('colAge')) + ' / ' + esc(t('colSex')) + '</th><th>' + esc(t('colConsent')) + '</th><th>' + esc(t('colStatus')) + '</th><th>' + esc(t('colReads')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>'
        : '<div class="empty">' + esc(t('noCases')) + '</div>') +
      '</div>';
  };
  A['cases:filter'] = function (arg) { state.ui.caseFilter = arg; PX.render(); };
  A['cases:search'] = function (arg, el) { state.ui.caseSearch = el.value; var tb = PX.qs('#content tbody'); PX.render(); var inp = PX.qs('#content input[type=search]'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } void tb; };
  A['case:open'] = function (arg, el, ev) { if (ev && ev.target && ev.target.closest('[data-action="case:delete"]')) return; state.currentCaseId = arg; PX.go('anotar'); };
  A['case:delete'] = function (arg, el, ev) {
    if (ev) ev.stopPropagation();
    if (!PX.can('delete')) { PX.toast(t('readOnlyRole'), 'crit'); return; }
    var c = PX.caseById(arg); if (!c) return;
    PX.openModal('<header><h2>' + esc(t('delete')) + '</h2></header><div class="body"><p>' + esc(t('deleteCaseConfirm')) + '</p><p class="mono" style="margin-top:8px">' + esc(c.pseudonym) + '</p></div><footer><button class="btn" data-action="modal:close">' + esc(t('cancel')) + '</button><button class="btn danger" data-action="case:deleteConfirm" data-arg="' + arg + '">' + esc(t('delete')) + '</button></footer>', { narrow: true });
  };
  A['case:deleteConfirm'] = function (arg) {
    var c = PX.caseById(arg);
    PX.deleteCase(arg).then(function () { return PX.audit('case.delete', c ? c.pseudonym : arg, ''); }).then(function () { PX.closeModal(); PX.render(); });
  };

  // ---------------- IMPORT WIZARD ----------------
  var imp = null;
  A['import:open'] = function () {
    if (!PX.can('import')) { PX.toast(t('readOnlyRole'), 'crit'); return; }
    imp = { step: 1, file: null, kind: null, parsed: null, buffer: null, deid: null, decode: null, work: null, win: null, redactions: [], applied: 0, checked: false, viewer: null, form: null, error: null, busy: false };
    renderImport();
  };
  A['import:cancel'] = function () { if (imp && imp.viewer) imp.viewer.destroy(); imp = null; PX.closeModal(); };
  A['import:next'] = function () {
    if (!imp) return;
    if (imp.step === 1 && imp.work) { imp.step = 2; renderImport(); }
    else if (imp.step === 2 && imp.checked) { imp.step = 3; if (!imp.form) imp.form = defaultForm(); renderImport(); }
  };
  A['import:back'] = function () { if (!imp) return; if (imp.viewer) { imp.viewer.destroy(); imp.viewer = null; } imp.step = Math.max(1, imp.step - 1); renderImport(); };
  A['import:file'] = function (arg, el) { var f = el.files && el.files[0]; if (f) handleFile(f); };
  A['import:regen'] = function () { if (imp && imp.form) { imp.form.pseudonym = PX.makePseudonym(); PX.byId('f-pseudonym').value = imp.form.pseudonym; } };
  A['import:applyRedactions'] = function () {
    if (!imp || !imp.work || !imp.redactions.length) return;
    var ctx = imp.work.getContext('2d');
    ctx.fillStyle = '#000';
    imp.redactions.forEach(function (r) { ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.ceil(r.w), Math.ceil(r.h)); });
    imp.applied += imp.redactions.length; imp.redactions = [];
    if (imp.viewer) { imp.viewer.setBoxes([]); imp.viewer.setImage(imp.work); }
    updateRedactUI();
  };
  A['import:clearRedactions'] = function () { if (!imp) return; imp.redactions = []; if (imp.viewer) imp.viewer.setBoxes([]); updateRedactUI(); };
  A['import:checked'] = function (arg, el) { if (!imp) return; imp.checked = !!el.checked; var nb = PX.byId('imp-next'); if (nb) nb.disabled = !imp.checked; };
  A['import:save'] = function () { saveImport(); };
  A['import:win'] = function () { if (!imp || !imp.parsed) return; scheduleWindow(); };

  function defaultForm() {
    var d = (imp.deid && imp.deid.derived) || {};
    var modality = 'PAN';
    if (d.modality) { var m = TX.MODALITIES.filter(function (x) { return x.dicom.indexOf(String(d.modality).toUpperCase()) !== -1; })[0]; if (m) modality = m.id; }
    return { pseudonym: PX.makePseudonym(), subjectId: '', modality: modality, siteName: '', province: '', deviceMake: d.manufacturer || '', deviceModel: d.model || '',
      year: d.year || new Date().getFullYear(), ageBand: d.ageBand || '', sex: d.sex || 'U', consent: '', quality: 'diagnostic', notes: '' };
  }

  function renderImport() {
    if (!imp) return;
    var steps = '<div class="steps"><span class="' + (imp.step === 1 ? 'on' : '') + '">' + esc(t('step1')) + '</span><span class="' + (imp.step === 2 ? 'on' : '') + '">' + esc(t('step2')) + '</span><span class="' + (imp.step === 3 ? 'on' : '') + '">' + esc(t('step3')) + '</span></div>';
    var body = '', footer = '';
    if (imp.step === 1) {
      body = '<div class="stack">' +
        '<div class="drop" id="drop"><p>' + esc(t('dropHere')) + '</p><p style="margin-top:10px"><label class="btn primary" for="imp-file">' + esc(t('chooseFile')) + '</label><input id="imp-file" class="sr-only" type="file" accept=".dcm,.dicom,application/dicom,image/jpeg,image/png" data-action="import:file"></p></div>' +
        '<div id="imp-result">' + (imp.busy ? '<p class="muted">' + esc(t('reading')) + '</p>' : step1Result()) + '</div></div>';
      footer = '<button class="btn" data-action="import:cancel">' + esc(t('cancel')) + '</button><button class="btn primary" id="imp-next" data-action="import:next"' + (imp.work ? '' : ' disabled') + '>' + esc(t('next')) + '</button>';
    } else if (imp.step === 2) {
      var declared = imp.deid && imp.deid.derived && imp.deid.derived.burnedInDeclared;
      body = '<div class="stack">' +
        (declared ? '<div class="banner crit">' + PX.ICONS.warn + '<div>' + esc(t('burnedInDeclared')) + '</div></div>' : '') +
        '<p class="muted">' + esc(t('redactIntro')) + '</p>' +
        '<div class="viewer-wrap" style="height:420px;border-radius:8px;overflow:hidden"><div class="viewer-tools"><span class="small">' + esc(t('drawRedaction')) + '</span><button class="btn sm" data-action="import:applyRedactions" id="imp-apply">' + esc(t('applyRedactions')) + '</button><button class="btn sm" data-action="import:clearRedactions">' + esc(t('clearRedactions')) + '</button><span class="small" id="imp-redact-count" style="margin-left:auto"></span></div><canvas id="imp-canvas" class="draw"></canvas></div>' +
        '<label class="check"><input type="checkbox" data-action="import:checked"' + (imp.checked ? ' checked' : '') + '><span>' + esc(t('burnedInCheck')) + '</span></label></div>';
      footer = '<button class="btn" data-action="import:back">' + esc(t('back')) + '</button><button class="btn" data-action="import:cancel">' + esc(t('cancel')) + '</button><button class="btn primary" id="imp-next" data-action="import:next"' + (imp.checked ? '' : ' disabled') + '>' + esc(t('next')) + '</button>';
    } else {
      var f = imp.form;
      body = '<div class="stack"><div class="form-grid">' +
        field('f-pseudonym', t('pseudonym'), '<div class="row"><input id="f-pseudonym" type="text" class="mono" value="' + attr(f.pseudonym) + '" readonly style="flex:1"><button class="btn sm" data-action="import:regen">' + esc(t('regenerate')) + '</button></div>') +
        field('f-subject', t('subjectId'), '<input id="f-subject" type="text" class="mono" maxlength="32" value="' + attr(f.subjectId) + '">', t('subjectHelp'), 'f-subject-err') +
        selectField('f-modality', t('modality'), TX.MODALITIES, f.modality) +
        field('f-site', t('site'), '<input id="f-site" type="text" value="' + attr(f.siteName) + '">') +
        field('f-province', t('province'), '<select id="f-province"><option value="">—</option>' + TX.PROVINCES.map(function (p) { return '<option' + (f.province === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select>') +
        field('f-device', t('device'), '<input id="f-device" type="text" value="' + attr((f.deviceMake + ' ' + f.deviceModel).trim()) + '">') +
        field('f-year', t('year'), '<input id="f-year" type="number" min="1990" max="2100" value="' + attr(f.year) + '">') +
        field('f-age', t('ageBand'), '<select id="f-age"><option value="">' + esc(t('unknownValue')) + '</option>' + TX.AGE_BANDS.map(function (b) { return '<option' + (f.ageBand === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select>') +
        selectField('f-sex', t('sex'), TX.SEXES, f.sex) +
        field('f-consent', t('consent') + ' *', '<select id="f-consent"><option value="">—</option>' + TX.CONSENT.map(function (c) { return '<option value="' + c.id + '"' + (f.consent === c.id ? ' selected' : '') + '>' + esc(pick(c.name)) + '</option>'; }).join('') + '</select>', t('consentHelp'), 'f-consent-err') +
        selectField('f-quality', t('quality'), TX.QUALITY, f.quality) +
        '</div>' + field('f-notes', t('notes'), '<textarea id="f-notes">' + esc(f.notes) + '</textarea>') + '</div>';
      footer = '<button class="btn" data-action="import:back">' + esc(t('back')) + '</button><button class="btn" data-action="import:cancel">' + esc(t('cancel')) + '</button><button class="btn primary" data-action="import:save">' + esc(t('saveCase')) + '</button>';
    }
    PX.openModal('<header><h2>' + esc(t('importTitle')) + '</h2>' + steps + '</header><div class="body">' + body + '</div><footer>' + footer + '</footer>', { noFocus: true });
    if (imp.step === 1) bindDrop();
    if (imp.step === 2) bindRedactViewer();
    if (imp.step === 1 && imp.parsed && imp.decode && imp.decode.ok && imp.decode.samples === 1) drawPreview();
  }
  function field(id, label, control, help, errId) { return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + control + (help ? '<div class="help">' + esc(help) + '</div>' : '') + (errId ? '<div class="err" id="' + errId + '"></div>' : '') + '</div>'; }
  function selectField(id, label, list, value) { return field(id, label, '<select id="' + id + '">' + list.map(function (o) { return '<option value="' + o.id + '"' + (value === o.id ? ' selected' : '') + '>' + esc(pick(o.name)) + '</option>'; }).join('') + '</select>'); }

  function step1Result() {
    if (imp.error) return '<div class="banner crit">' + PX.ICONS.warn + '<div>' + esc(imp.error) + '</div></div>';
    if (!imp.file) return '';
    var out = '<div class="card"><div class="row between"><div><span class="muted small">' + esc(t('fileKind')) + ':</span> <strong>' + esc(imp.kind === 'dicom' ? t('kindDicom') : t('kindImage')) + '</strong> <span class="mono small muted">' + esc(imp.file.name) + '</span></div>';
    if (imp.work) out += '<div class="small muted num">' + imp.work.width + ' × ' + imp.work.height + ' px</div>';
    out += '</div>';
    if (imp.kind === 'dicom' && imp.deid) {
      var c = imp.deid.counts;
      out += '<h3 style="margin-top:12px">' + esc(t('receiptTitle')) + '</h3><p class="small muted">' + esc(t('receiptIntro')) + '</p>' +
        '<p class="small" style="margin:6px 0">' + esc(t('receiptCounts', { kept: c.kept, derived: c.derived, removed: c.removed, priv: c.privateRemoved })) + '</p>';
      if (imp.deid.derived.burnedInDeclared) out += '<div class="banner crit small">' + PX.ICONS.warn + '<div>' + esc(t('burnedInDeclared')) + '</div></div>';
      if (!imp.decode || !imp.decode.ok) out += '<div class="banner warn small" style="margin-top:8px">' + PX.ICONS.warn + '<div>' + esc(t('dicomUnsupported')) + ' <span class="mono">' + esc(imp.decode ? imp.decode.reason : '') + ' ' + esc(imp.parsed.transferSyntax || '') + '</span></div></div>';
      out += '<details style="margin-top:8px"><summary class="small">' + esc(t('receiptTitle')) + ' (' + imp.deid.receipt.length + ')</summary><div class="table-wrap" style="max-height:220px;overflow:auto;margin-top:6px"><table class="table"><thead><tr><th>Tag</th><th>Name</th><th></th></tr></thead><tbody>' +
        imp.deid.receipt.map(function (r) { var cls = r.action === 'keep' ? 'ok' : r.action === 'derive' ? 'info' : 'na'; var lbl = r.action === 'keep' ? t('kept') : r.action === 'derive' ? t('derived') : t('removed'); return '<tr><td class="mono small">' + esc(r.tag) + '</td><td class="small">' + esc(r.name) + '</td><td><span class="pill ' + cls + '">' + esc(lbl) + '</span></td></tr>'; }).join('') + '</tbody></table></div></details>';
      if (imp.decode && imp.decode.ok && imp.decode.samples === 1) {
        var st = imp.decode.stats, w = imp.win;
        var range = Math.max(1, st.max - st.min);
        out += '<h3 style="margin-top:12px">' + esc(t('window')) + '</h3><div class="grid-2"><div class="field"><label for="win-c">' + esc(t('windowCenter')) + ' <span class="mono" id="win-c-v">' + Math.round(w.c) + '</span></label><input id="win-c" type="range" min="' + st.min + '" max="' + st.max + '" step="' + (range > 1000 ? 1 : 0.5) + '" value="' + w.c + '" data-action="import:win"></div>' +
          '<div class="field"><label for="win-w">' + esc(t('windowWidth')) + ' <span class="mono" id="win-w-v">' + Math.round(w.w) + '</span></label><input id="win-w" type="range" min="1" max="' + Math.ceil(range * 2) + '" step="1" value="' + w.w + '" data-action="import:win"></div></div>';
      }
    } else if (imp.kind === 'image') {
      out += '<p class="small muted" style="margin-top:8px">' + esc(t('receiptImage')) + '</p>';
    }
    if (imp.work) out += '<div style="margin-top:12px;background:var(--viewer-bg);border-radius:8px;padding:8px"><canvas id="imp-preview" style="display:block;max-width:100%;height:auto;margin:0 auto"></canvas></div>';
    out += '</div>';
    return out;
  }
  function drawPreview() {
    var pc = PX.byId('imp-preview'); if (!pc || !imp.work) return;
    var maxW = 860, s = Math.min(1, maxW / imp.work.width, 360 / imp.work.height);
    pc.width = Math.round(imp.work.width * s); pc.height = Math.round(imp.work.height * s);
    pc.getContext('2d').drawImage(imp.work, 0, 0, pc.width, pc.height);
  }
  var winTimer = 0;
  function scheduleWindow() {
    clearTimeout(winTimer);
    var c = parseFloat(PX.byId('win-c').value), w = parseFloat(PX.byId('win-w').value);
    PX.byId('win-c-v').textContent = Math.round(c); PX.byId('win-w-v').textContent = Math.round(w);
    winTimer = setTimeout(function () {
      imp.win = { c: c, w: w };
      var dec = DICOM.decodeFrame(imp.parsed, imp.buffer, { windowCenter: c, windowWidth: w });
      if (dec.ok) { imp.decode = dec; paintWork(dec); drawPreview(); }
    }, 120);
  }
  function paintWork(dec) {
    if (!imp.work) { imp.work = document.createElement('canvas'); }
    imp.work.width = dec.width; imp.work.height = dec.height;
    var ctx = imp.work.getContext('2d');
    var id = ctx.createImageData(dec.width, dec.height);
    id.data.set(dec.rgba);
    ctx.putImageData(id, 0, 0);
  }

  function bindDrop() {
    var d = PX.byId('drop'); if (!d) return;
    ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });
    if (imp.work && imp.kind === 'image') drawPreview();
    if (imp.work && imp.kind === 'dicom') drawPreview();
  }

  function handleFile(file) {
    imp.file = file; imp.error = null; imp.busy = true; imp.work = null; imp.parsed = null; imp.deid = null; imp.decode = null; imp.kind = null; imp.redactions = []; imp.applied = 0; imp.checked = false; imp.form = null;
    renderImport();
    var reader = new FileReader();
    reader.onload = function () {
      var buf = reader.result;
      var u8 = new Uint8Array(buf);
      var magic = u8.length > 132 && u8[128] === 0x44 && u8[129] === 0x49 && u8[130] === 0x43 && u8[131] === 0x4D;
      var nameDicom = /\.(dcm|dicom)$/i.test(file.name) || file.type === 'application/dicom';
      if (magic || nameDicom) { processDicom(buf); return; }
      PX.loadImageEl(file).then(function (img) {
        if (img) { processImage(img); return; }
        processDicom(buf, true);
      });
    };
    reader.onerror = function () { imp.busy = false; imp.error = t('dicomError'); renderImport(); };
    reader.readAsArrayBuffer(file);
  }
  function processImage(img) {
    imp.kind = 'image';
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0); // re-encoding drops EXIF and other metadata
    imp.work = c; imp.busy = false; renderImport();
  }
  function processDicom(buf, fallback) {
    var parsed = DICOM.parse(buf);
    if (!parsed.ok || (fallback && !parsed.pixelData && !parsed.dataset['00280010'])) { imp.busy = false; imp.error = t('dicomError'); renderImport(); return; }
    imp.kind = 'dicom'; imp.parsed = parsed; imp.buffer = buf; imp.deid = DICOM.deidentify(parsed);
    var dec = DICOM.decodeFrame(parsed, buf, {});
    imp.decode = dec;
    if (dec.ok) { paintWork(dec); if (dec.window) imp.win = { c: dec.window.center, w: dec.window.width }; }
    imp.busy = false; renderImport();
  }

  function bindRedactViewer() {
    var cv = PX.byId('imp-canvas'); if (!cv || !imp.work) return;
    var v = new Viewer(cv, {
      tool: 'box',
      onCreate: function (b) { imp.redactions.push(Object.assign({ id: 'r' + Date.now() + Math.random() }, b)); refreshRedactBoxes(); },
      onSelect: function () {},
      onChange: function (id, box) { var r = imp.redactions.filter(function (x) { return x.id === id; })[0]; if (r) Object.assign(r, box); }
    });
    v.setTool('box');
    imp.viewer = v;
    v.setImage(imp.work);
    setTimeout(function () { v.resize(); v.fit(); }, 30);
    refreshRedactBoxes();
    cv.addEventListener('keydown', function (e) { if ((e.key === 'Delete' || e.key === 'Backspace') && v.selectedId) { imp.redactions = imp.redactions.filter(function (x) { return x.id !== v.selectedId; }); v.selectedId = null; refreshRedactBoxes(); } });
    cv.tabIndex = 0;
  }
  function refreshRedactBoxes() {
    if (!imp.viewer) return;
    imp.viewer.setBoxes(imp.redactions.map(function (r) { return { id: r.id, x: r.x, y: r.y, w: r.w, h: r.h, color: '#FF5252', fill: 'rgba(255,82,82,0.25)', selectable: true, label: '' }; }));
    updateRedactUI();
  }
  function updateRedactUI() {
    var el = PX.byId('imp-redact-count'); if (el) el.textContent = (imp.redactions.length ? imp.redactions.length + ' ▭  ' : '') + (imp.applied ? t('redactionsApplied', { n: imp.applied }) : '');
    var ap = PX.byId('imp-apply'); if (ap) ap.disabled = !imp.redactions.length;
  }

  function saveImport() {
    if (!imp || !imp.work) return;
    var f = imp.form;
    f.subjectId = PX.byId('f-subject').value.trim();
    f.modality = PX.byId('f-modality').value; f.siteName = PX.byId('f-site').value.trim().slice(0, 80); f.province = PX.byId('f-province').value;
    var dev = PX.byId('f-device').value.trim().slice(0, 80); f.deviceMake = dev; f.deviceModel = '';
    f.year = parseInt(PX.byId('f-year').value, 10) || null; f.ageBand = PX.byId('f-age').value; f.sex = PX.byId('f-sex').value; f.consent = PX.byId('f-consent').value; f.quality = PX.byId('f-quality').value; f.notes = PX.byId('f-notes').value.trim().slice(0, 500);
    var ok = true;
    var se = PX.byId('f-subject-err'); se.textContent = '';
    if (f.subjectId && (!/^[A-Za-z0-9._-]{1,32}$/.test(f.subjectId) || /^\d{9,}$/.test(f.subjectId) || /[A-Za-z]{3,}[-_.][A-Za-z]{3,}/.test(f.subjectId))) { se.textContent = t('subjectLooksId'); ok = false; }
    var ce = PX.byId('f-consent-err'); ce.textContent = '';
    if (!f.consent) { ce.textContent = t('requiredField'); ok = false; }
    if (!ok) return;
    var work = imp.work;
    DEMO.canvasToBlob(work).then(function (blob) {
      var id = PX.uid('c');
      var c = {
        id: id, pseudonym: f.pseudonym, subjectId: f.subjectId, modality: f.modality, siteName: f.siteName, province: f.province, deviceMake: f.deviceMake, deviceModel: f.deviceModel,
        year: f.year, ageBand: f.ageBand, sex: f.sex, consent: f.consent, quality: f.quality, notes: f.notes, isDemo: false,
        width: work.width, height: work.height, frames: imp.deid && imp.deid.derived ? imp.deid.derived.frames || 1 : 1,
        deid: { source: imp.kind, receipt: imp.deid ? imp.deid.receipt : [{ tag: '—', name: 'EXIF / embedded metadata', action: 'remove', isPrivate: false }],
          counts: imp.deid ? imp.deid.counts : { kept: 0, derived: 0, removed: 1, privateRemoved: 0 }, burnedInDeclared: !!(imp.deid && imp.deid.derived.burnedInDeclared), burnedInChecked: imp.checked, redactions: imp.applied,
          transferSyntax: imp.parsed ? imp.parsed.transferSyntax : null, bitsAllocated: imp.decode && imp.decode.bitsAllocated ? imp.decode.bitsAllocated : 8, window: imp.win || null },
        adjudicationComplete: false, createdAt: Date.now(), updatedAt: Date.now()
      };
      // Calibration from DICOM pixel spacing (row\\col, mm). Panoramic units report the spacing of the detector plane; magnification is not corrected.
      var ps = imp.deid && imp.deid.derived ? imp.deid.derived.pixelSpacing : null;
      if (ps) { var mm = parseFloat(String(ps).split('\\')[0]); if (isFinite(mm) && mm > 0 && mm < 5) c.calibration = { mmPerPx: mm, source: 'dicom', tag: String(ps) }; }
      return DB.put('images', { caseId: id, blob: blob, thumb: DEMO.thumbnail(work, 320) }).then(function () { state.images[id] = { caseId: id, blob: blob, thumb: DEMO.thumbnail(work, 320) }; return PX.saveCase(c); }).then(function () {
        return PX.audit('case.import', c.pseudonym, imp.kind + ' ' + work.width + 'x' + work.height + ', ' + (imp.applied || 0) + ' redactions, ' + (imp.deid ? imp.deid.counts.removed + ' tags removed' : 'metadata dropped'));
      }).then(function () {
        if (imp.viewer) imp.viewer.destroy();
        state.currentCaseId = c.id; imp = null; PX.closeModal(); PX.toast(t('caseSaved')); PX.go('anotar');
      });
    }).catch(function (e) { console.error(e); PX.toast(t('error') + ': ' + (e && e.message ? e.message : e), 'crit'); });
  }

  // case edit modal (from annotate view)
  A['case:edit'] = function (arg) {
    var c = PX.caseById(arg); if (!c) return;
    if (!PX.can('annotate')) { PX.toast(t('readOnlyRole'), 'crit'); return; }
    var body = '<div class="form-grid">' +
      field('e-subject', t('subjectId'), '<input id="e-subject" type="text" class="mono" maxlength="32" value="' + attr(c.subjectId || '') + '">', t('subjectHelp'), 'e-subject-err') +
      selectField('e-modality', t('modality'), TX.MODALITIES, c.modality) +
      field('e-site', t('site'), '<input id="e-site" type="text" value="' + attr(c.siteName || '') + '">') +
      field('e-province', t('province'), '<select id="e-province"><option value="">—</option>' + TX.PROVINCES.map(function (p) { return '<option' + (c.province === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select>') +
      field('e-device', t('device'), '<input id="e-device" type="text" value="' + attr(((c.deviceMake || '') + ' ' + (c.deviceModel || '')).trim()) + '">') +
      field('e-year', t('year'), '<input id="e-year" type="number" min="1990" max="2100" value="' + attr(c.year || '') + '">') +
      field('e-age', t('ageBand'), '<select id="e-age"><option value="">' + esc(t('unknownValue')) + '</option>' + TX.AGE_BANDS.map(function (b) { return '<option' + (c.ageBand === b ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select>') +
      selectField('e-sex', t('sex'), TX.SEXES, c.sex) +
      field('e-consent', t('consent') + ' *', '<select id="e-consent">' + TX.CONSENT.map(function (o) { return '<option value="' + o.id + '"' + (c.consent === o.id ? ' selected' : '') + '>' + esc(pick(o.name)) + '</option>'; }).join('') + '</select>', t('consentHelp')) +
      selectField('e-quality', t('quality'), TX.QUALITY, c.quality) +
      '</div>' + field('e-notes', t('notes'), '<textarea id="e-notes">' + esc(c.notes || '') + '</textarea>') +
      '<label class="check" style="margin-top:8px"><input type="checkbox" id="e-checked"' + (c.deid && c.deid.burnedInChecked ? ' checked' : '') + '><span>' + esc(t('burnedInCheck')) + '</span></label>';
    PX.openModal('<header><h2>' + esc(t('editCase')) + ' <span class="mono muted">' + esc(c.pseudonym) + '</span></h2></header><div class="body">' + body + '</div><footer><button class="btn" data-action="modal:close">' + esc(t('cancel')) + '</button><button class="btn primary" data-action="case:saveEdit" data-arg="' + c.id + '">' + esc(t('save')) + '</button></footer>');
  };
  A['case:saveEdit'] = function (arg) {
    var c = PX.caseById(arg); if (!c) return;
    var subj = PX.byId('e-subject').value.trim();
    var se = PX.byId('e-subject-err'); se.textContent = '';
    if (subj && (!/^[A-Za-z0-9._-]{1,32}$/.test(subj) || /^\d{9,}$/.test(subj) || /[A-Za-z]{3,}[-_.][A-Za-z]{3,}/.test(subj))) { se.textContent = t('subjectLooksId'); return; }
    c.subjectId = subj; c.modality = PX.byId('e-modality').value; c.siteName = PX.byId('e-site').value.trim().slice(0, 80); c.province = PX.byId('e-province').value;
    c.deviceMake = PX.byId('e-device').value.trim().slice(0, 80); c.deviceModel = '';
    c.year = parseInt(PX.byId('e-year').value, 10) || null; c.ageBand = PX.byId('e-age').value; c.sex = PX.byId('e-sex').value; c.consent = PX.byId('e-consent').value; c.quality = PX.byId('e-quality').value; c.notes = PX.byId('e-notes').value.trim().slice(0, 500);
    c.deid = c.deid || {}; c.deid.burnedInChecked = PX.byId('e-checked').checked;
    PX.saveCase(c).then(function () { return PX.audit('case.edit', c.pseudonym, 'consent=' + c.consent); }).then(function () { PX.closeModal(); PX.toast(t('saved')); PX.render(); });
  };
})(typeof window !== 'undefined' ? window : globalThis);
