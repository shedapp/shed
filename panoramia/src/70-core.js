/* PanoramIA — application core: state, storage orchestration, audit, routing, UI primitives. */
(function (root) {
  'use strict';
  var I = root.PX_I18N, TX = root.PX_TAXONOMY, DB = root.PX_DB, RUB = root.PX_RUBRIC, DEMO = root.PX_DEMO, OD = root.PX_OPENDATA;
  var t = I.t, pick = I.pick;

  var APP_VERSION = '0.4.0';
  var SETTINGS_KEY = 'panoramia.settings.v1';
  var ROUTES = ['inicio', 'casos', 'anotar', 'semaforo', 'atlas', 'observatorio', 'evaluacion', 'gobernanza', 'ayuda'];

  var state = {
    settings: { lang: null, role: 'faculty', actor: '', ack: false, demoLoadedOnce: false, openLoadedOnce: false },
    cases: [], annotations: [], checklists: [], audit: [], images: {},
    route: 'inicio', currentCaseId: null, storageMemory: false, downloads: null, loaded: false,
    ui: { caseFilter: 'all', caseSearch: '', reader: 'R1', showOthers: true, showRef: true, obsIncludeDemo: true, obsIncludeOpen: true, atlasGroup: 'all', atlasMode: 'browse', helpTab: 'fdi', openProgress: null }
  };

  // ---------- settings ----------
  function loadSettings() {
    try { var raw = localStorage.getItem(SETTINGS_KEY); if (raw) Object.assign(state.settings, JSON.parse(raw)); } catch (e) {}
    if (!state.settings.lang) state.settings.lang = I.detect();
    I.setLang(state.settings.lang);
  }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (e) {} }

  // ---------- helpers ----------
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function attr(s) { return esc(s); }
  function fmtDate(ts) { try { return new Date(ts).toLocaleString(I.getLang() === 'en' ? 'en-GB' : 'es-DO', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return String(ts); } }
  function pct(x, digits) { if (x === null || x === undefined || isNaN(x)) return '—'; return (x * 100).toFixed(digits === undefined ? 0 : digits) + '%'; }
  function fmtCI(w) { if (!w || w.p === null) return '—'; return pct(w.p) + ' (' + pct(w.lo) + ' – ' + pct(w.hi) + ')'; }
  function byId(id) { return document.getElementById(id); }
  function qs(sel, el) { return (el || document).querySelector(sel); }
  function qsa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function uid(p) { return DEMO.uid(p); }
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function makePseudonym() {
    var a = new Uint8Array(8);
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256); }
    var s = '';
    for (var j = 0; j < 8; j++) { s += ALPHABET[a[j] % ALPHABET.length]; if (j === 3) s += '-'; }
    return 'DR-' + s;
  }
  function roleName(id) { var r = TX.ROLES.filter(function (x) { return x.id === id; })[0]; return r ? pick(r.name) : id; }
  /** Length in mm when the case is calibrated, otherwise in px. */
  function fmtLength(px, c) {
    if (!isFinite(px)) return '—';
    if (c && c.calibration && c.calibration.mmPerPx > 0) { var mm = px * c.calibration.mmPerPx; return (mm >= 10 ? mm.toFixed(1) : mm.toFixed(2)) + ' mm'; }
    return Math.round(px) + ' px';
  }
  function calibrationLabel(c) {
    if (!c || !c.calibration) return I.getLang() === 'en' ? 'Not calibrated: distances in px' : 'Sin calibrar: distancias en px';
    var k = c.calibration;
    return (I.getLang() === 'en' ? 'Calibrated ' : 'Calibrada ') + k.mmPerPx.toFixed(4) + ' mm/px (' + (k.source === 'dicom' ? 'DICOM' : (I.getLang() === 'en' ? 'manual' : 'manual')) + ')';
  }
  function readerName(id) { var r = TX.READERS.filter(function (x) { return x.id === id; })[0]; return r ? pick(r.name) : id; }
  function optName(list, id) { var r = list.filter(function (x) { return x.id === id; })[0]; return r ? pick(r.name) : (id || '—'); }
  function findingName(code) { var f = TX.FINDING_BY_CODE[code]; return f ? pick(f.name) : code; }
  function groupOf(code) { var f = TX.FINDING_BY_CODE[code]; return f ? f.group : 'QA'; }
  function groupClass(code) { var g = TX.GROUPS[groupOf(code)]; return g ? g.color : 'g5'; }

  function can(action) {
    var r = state.settings.role;
    if (action === 'annotate') return r === 'student' || r === 'faculty' || r === 'steward';
    if (action === 'adjudicate') return r === 'faculty' || r === 'steward';
    if (action === 'govern') return r === 'steward';
    if (action === 'import') return r === 'student' || r === 'faculty' || r === 'steward';
    if (action === 'delete') return r === 'faculty' || r === 'steward';
    return false;
  }
  function readersForRole() { return can('adjudicate') ? ['R1', 'R2', 'ADJ'] : ['R1', 'R2']; }

  // ---------- derived case facts ----------
  function caseStatus(c) {
    if (!c) return 'quarantine';
    if (c.consent === 'unknown' || !c.consent) return 'quarantine';
    if (!(c.deid && c.deid.burnedInChecked)) return 'quarantine';
    return 'ready';
  }
  function annotationsOf(caseId, reader) {
    return state.annotations.filter(function (a) { return a.caseId === caseId && (!reader || a.reader === reader); });
  }
  /** Clinical findings only: anatomical structures and measurements are annotations but not findings. */
  function findingsOf(caseId, reader) {
    return annotationsOf(caseId, reader).filter(function (a) { return TX.isFinding(a.code); });
  }
  function readState(c) {
    var r1 = findingsOf(c.id, 'R1').length > 0, r2 = findingsOf(c.id, 'R2').length > 0;
    if (c.externalReference && !r1 && !r2) return 'external'; // reference labels come from a published dataset, no local reads yet
    if (c.adjudicationComplete) return 'adj';
    if (r1 && r2) return 'double';
    if (r1 || r2) return 'single';
    return 'unread';
  }
  function atlasEligible(c) { return caseStatus(c) === 'ready' && !!c.adjudicationComplete; }
  function caseById(id) { return state.cases.filter(function (c) { return c.id === id; })[0] || null; }

  // ---------- storage orchestration ----------
  function refreshAll() {
    return Promise.all([DB.getAll('cases'), DB.getAll('annotations'), DB.getAll('checklists'), DB.getAll('audit'), DB.getAll('images')]).then(function (r) {
      state.cases = r[0].sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      state.annotations = r[1]; state.checklists = r[2];
      state.audit = r[3].sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      state.images = {}; r[4].forEach(function (im) { state.images[im.caseId] = im; });
      state.loaded = true;
    });
  }
  function audit(action, target, details) {
    var e = { id: uid('a'), ts: Date.now(), actor: state.settings.actor || '—', role: state.settings.role, action: action, target: target || '', details: details || '' };
    state.audit.unshift(e);
    return DB.put('audit', e).catch(function () {});
  }
  function saveCase(c) { c.updatedAt = Date.now(); c.status = caseStatus(c); return DB.put('cases', c).then(function () { var i = state.cases.findIndex(function (x) { return x.id === c.id; }); if (i >= 0) state.cases[i] = c; else state.cases.unshift(c); return c; }); }
  function saveAnnotation(a) { return DB.put('annotations', a).then(function () { var i = state.annotations.findIndex(function (x) { return x.id === a.id; }); if (i >= 0) state.annotations[i] = a; else state.annotations.push(a); return a; }); }
  function deleteAnnotation(id) { return DB.del('annotations', id).then(function () { state.annotations = state.annotations.filter(function (x) { return x.id !== id; }); }); }
  function saveChecklist(ch) { return DB.put('checklists', ch).then(function () { state.checklists.push(ch); return ch; }); }
  function deleteCase(id) {
    var anns = state.annotations.filter(function (a) { return a.caseId === id; });
    var chks = state.checklists.filter(function (a) { return a.caseId === id; });
    return Promise.all([DB.del('cases', id), DB.del('images', id)].concat(anns.map(function (a) { return DB.del('annotations', a.id); })).concat(chks.map(function (c) { return DB.del('checklists', c.id); }))).then(function () {
      state.cases = state.cases.filter(function (c) { return c.id !== id; });
      state.annotations = state.annotations.filter(function (a) { return a.caseId !== id; });
      state.checklists = state.checklists.filter(function (a) { return a.caseId !== id; });
      delete state.images[id];
      if (state.currentCaseId === id) state.currentCaseId = null;
    });
  }

  function loadDemo() {
    return DEMO.buildDemo(makePseudonym, RUB.evaluate).then(function (d) {
      var ops = [];
      d.cases.forEach(function (c) { c.status = caseStatus(c); ops.push(DB.put('cases', c)); });
      d.images.forEach(function (im) { ops.push(DB.put('images', im)); });
      d.annotations.forEach(function (a) { ops.push(DB.put('annotations', a)); });
      d.checklists.forEach(function (c) { ops.push(DB.put('checklists', c)); });
      return Promise.all(ops);
    }).then(function () { state.settings.demoLoadedOnce = true; saveSettings(); return audit('demo.load', 'dataset', '8 synthetic phantoms'); }).then(refreshAll);
  }
  function removeDemo() {
    var ids = state.cases.filter(function (c) { return c.isDemo; }).map(function (c) { return c.id; });
    return Promise.all(ids.map(deleteCase)).then(function () { return audit('demo.remove', 'dataset', ids.length + ' cases'); }).then(refreshAll);
  }
  function hasDemo() { return state.cases.some(function (c) { return c.isDemo; }); }

  // ---------- open dataset (AKUDENTAL) ----------
  function storeDataset(d) {
    var ops = [];
    d.cases.forEach(function (c) { c.status = caseStatus(c); ops.push(DB.put('cases', c)); });
    d.images.forEach(function (im) { ops.push(DB.put('images', im)); });
    d.annotations.forEach(function (a) { ops.push(DB.put('annotations', a)); });
    return Promise.all(ops);
  }
  /** Embedded subsets of the open datasets, keyed 'aku' (AKUDENTAL) and 'opg' (DentalOPG-1550). */
  var OPEN_SETS = {
    aku: { key: 'aku', subset: function () { return root.PX_OPENDATA_SUBSET || null; }, base: 'data/akudental/', total: 333, licence: 'CC BY-NC-SA 4.0', nc: true },
    opg: { key: 'opg', subset: function () { return root.PX_OPENDATA_SUBSET_OPG || null; }, base: 'data/dentalopg/', total: 1525, licence: 'CC BY 4.0', nc: false }
  };
  function openSets() { return ['aku', 'opg'].filter(function (k) { return !!OPEN_SETS[k].subset(); }).map(function (k) { return OPEN_SETS[k]; }); }
  function openSubset(key) { var o = OPEN_SETS[key || 'aku']; return o ? o.subset() : null; }
  function openInfo(key) { return OPEN_SETS[key || 'aku']; }
  function loadOpenData(key) {
    if (!key) return openSets().reduce(function (p, o) { return p.then(function () { return loadOpenData(o.key); }); }, Promise.resolve());
    var sub = openSubset(key); if (!sub || !OD) return Promise.resolve();
    var skip = {}; state.cases.forEach(function (c) { skip[c.id] = true; });
    return OD.build(sub, { skipIds: skip }).then(function (d) {
      return storeDataset(d).then(function () { return d.cases.length; });
    }).then(function (n) { state.settings.openLoadedOnce = true; state.settings.openLoadedKeys = state.settings.openLoadedKeys || {}; state.settings.openLoadedKeys[key] = true; saveSettings(); return audit('opendata.load', sub.dataset, n + ' cases, embedded subset, ' + String(sub.sourceCommit || '').slice(0, 12)); }).then(refreshAll);
  }
  /** Loads the complete set from data/<set>/full_manifest.json (only when served over http/https). */
  function loadOpenDataRemote(key, onProgress) {
    if (typeof key === 'function') { onProgress = key; key = 'aku'; }
    var base = (OPEN_SETS[key || 'aku'] || OPEN_SETS.aku).base;
    return fetch(base + 'full_manifest.json', { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (man) {
      var skip = {}; state.cases.forEach(function (c) { skip[c.id] = true; });
      return OD.build(man, { skipIds: skip, baseUrl: base + 'full/', onProgress: onProgress, concurrency: 6 }).then(function (d) {
        return storeDataset(d).then(function () { return audit('opendata.load', man.dataset, d.cases.length + ' cases, complete set, ' + String(man.sourceCommit || '').slice(0, 12)); });
      });
    }).then(refreshAll);
  }
  function removeOpenData(key) {
    var ids = state.cases.filter(function (c) { return c.isOpenData && (!key || (c.datasetKey || 'aku') === key); }).map(function (c) { return c.id; });
    return Promise.all(ids.map(deleteCase)).then(function () { return audit('opendata.remove', key || 'all', ids.length + ' cases'); }).then(refreshAll);
  }
  function hasOpenData(key) { return state.cases.some(function (c) { return c.isOpenData && (!key || (c.datasetKey || 'aku') === key); }); }
  function openDataCount(key) { return state.cases.filter(function (c) { return c.isOpenData && (!key || (c.datasetKey || 'aku') === key); }).length; }
  function canLoadRemote() { return /^https?:$/.test(location.protocol); }

  // ---------- images ----------
  function imageBitmap(caseId) {
    var im = state.images[caseId];
    if (!im || !im.blob) return Promise.resolve(null);
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(im.blob).catch(function () { return loadImageEl(im.blob); });
    }
    return loadImageEl(im.blob);
  }
  function loadImageEl(blob) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob); var img = new Image();
      img.onload = function () { resolve(img); URL.revokeObjectURL(url); };
      img.onerror = function () { resolve(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }

  // ---------- UI primitives ----------
  function toast(msg, kind) {
    var rootEl = byId('toast-root');
    // identical consecutive toasts collapse; at most three visible
    var last = rootEl.lastElementChild; if (last && last.textContent === msg) { last.remove(); }
    while (rootEl.children.length >= 3) rootEl.firstElementChild.remove();
    var el = document.createElement('div'); el.className = 'toast' + (kind ? ' ' + kind : ''); el.textContent = msg;
    rootEl.appendChild(el);
    setTimeout(function () { el.remove(); }, 3600);
  }
  function openModal(html, opts) {
    opts = opts || {};
    var rootEl = byId('modal-root');
    rootEl.innerHTML = '<div class="modal-bg" data-modal-bg="1"><div class="modal' + (opts.narrow ? ' narrow' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    var first = rootEl.querySelector('input, select, button, textarea'); if (first && !opts.noFocus) { try { first.focus(); } catch (e) {} }
    return rootEl;
  }
  function closeModal() { byId('modal-root').innerHTML = ''; }
  function modalOpen() { return !!byId('modal-root').firstChild; }

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>',
    cases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>',
    annotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8" y="8" width="7" height="6" rx="1"/></svg>',
    sem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="6.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17.5" r="1.6"/></svg>',
    atlas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/></svg>',
    obs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    eval: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 10 11l4 4 6-8"/><path d="M4 4v16h16"/></svg>',
    gov: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/></svg>',
    logo: '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="6" fill="var(--accent)"/><path d="M6 17c0-6 3-9 7-9s7 3 7 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M9.5 17v-4M13 17v-6M16.5 17v-4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };

  // Odontogram: permanent (32) or primary (20). Viewer orientation: patient's right on the left.
  function odontogram(opts) {
    opts = opts || {};
    var primary = !!opts.primary;
    var sel = opts.selected ? parseInt(opts.selected, 10) : null;
    var tagged = opts.tagged || {};
    var n = primary ? 5 : 8;
    var upperL = [], upperR = [], lowerL = [], lowerR = [];
    for (var p = n; p >= 1; p--) upperL.push((primary ? 50 : 10) + p);
    for (p = 1; p <= n; p++) upperR.push((primary ? 60 : 20) + p);
    for (p = n; p >= 1; p--) lowerL.push((primary ? 80 : 40) + p);
    for (p = 1; p <= n; p++) lowerR.push((primary ? 70 : 30) + p);
    var upper = upperL.concat(upperR), lower = lowerL.concat(lowerR);
    var cell = 30, w = cell * upper.length + 60, h = 112;
    // Same on-screen tooth size for the 16-cell permanent and the 10-cell primary chart.
    var s = '<svg class="odont" style="max-width:' + Math.round(w * 560 / 540) + 'px" viewBox="0 0 ' + w + ' ' + h + '" role="group" aria-label="' + attr(t('toothFdi')) + '">';
    function rowSvg(list, y) {
      var out = '';
      list.forEach(function (fdi, i) {
        var x = 30 + i * cell + 2;
        var cls = 'tooth' + (fdi === sel ? ' sel' : '') + (tagged[fdi] ? ' tag' : '');
        out += '<rect class="' + cls + '" data-fdi="' + fdi + '" x="' + x + '" y="' + y + '" width="' + (cell - 4) + '" height="26" rx="5"><title>' + attr(fdi + ' ' + TX.toothName(fdi, I.getLang())) + '</title></rect>';
        out += '<text class="' + (fdi === sel ? 'sel' : '') + '" x="' + (x + (cell - 4) / 2) + '" y="' + (y + 17) + '" text-anchor="middle">' + fdi + '</text>';
      });
      return out;
    }
    s += rowSvg(upper, 18) + rowSvg(lower, 62);
    s += '<line x1="' + (30 + upper.length / 2 * cell) + '" y1="12" x2="' + (30 + upper.length / 2 * cell) + '" y2="94" stroke="var(--line-strong)" stroke-dasharray="3 3"/>';
    s += '<text class="lbl" x="4" y="58" text-anchor="start">' + (I.getLang() === 'en' ? 'R' : 'D') + '</text>';
    s += '<text class="lbl" x="' + (w - 4) + '" y="58" text-anchor="end">' + (I.getLang() === 'en' ? 'L' : 'I') + '</text>';
    s += '<text class="lbl" x="' + (w / 2) + '" y="106" text-anchor="middle">' + attr(I.getLang() === 'en' ? 'patient’s right on the left, as on the radiograph' : 'derecha del paciente a la izquierda, como en la radiografía') + '</text>';
    s += '</svg>';
    return s;
  }

  // Horizontal bar chart (SVG). rows: [{label, value, value2?}]
  function barChart(rows, opts) {
    opts = opts || {};
    if (!rows.length) return '<div class="empty small">' + esc(t('noData')) + '</div>';
    var two = rows.some(function (r) { return r.value2 !== undefined; });
    var rowH = two ? 34 : 24, labelW = opts.labelW || 170, valW = 56, W = 600, pad = 8;
    var H = rows.length * rowH + pad * 2;
    var max = 0; rows.forEach(function (r) { max = Math.max(max, r.value || 0, r.value2 || 0); });
    if (max === 0) max = 1;
    var plotW = W - labelW - valW - 16;
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + attr(opts.title || '') + '">';
    // gridlines at 25/50/75/100%
    [0.25, 0.5, 0.75, 1].forEach(function (f) { var x = labelW + plotW * f; s += '<line class="grid" x1="' + x + '" y1="' + pad + '" x2="' + x + '" y2="' + (H - pad) + '"/>'; });
    rows.forEach(function (r, i) {
      var y = pad + i * rowH;
      var maxChars = Math.max(10, Math.floor((labelW - 12) / 6.4));
      var lbl = String(r.label); if (lbl.length > maxChars) lbl = lbl.slice(0, maxChars - 1) + '…';
      s += '<text x="' + (labelW - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(lbl) + '</text>';
      if (two) {
        var bh = 11;
        var w1 = plotW * ((r.value || 0) / max), w2 = plotW * ((r.value2 || 0) / max);
        s += '<rect class="bar" x="' + labelW + '" y="' + (y + 4) + '" width="' + w1 + '" height="' + bh + '" rx="2"><title>' + esc(r.label + ': ' + (opts.s1 || '') + ' ' + (r.value || 0)) + '</title></rect>';
        s += '<rect class="bar2" x="' + labelW + '" y="' + (y + 4 + bh + 3) + '" width="' + w2 + '" height="' + bh + '" rx="2"><title>' + esc(r.label + ': ' + (opts.s2 || '') + ' ' + (r.value2 || 0)) + '</title></rect>';
        s += '<text class="val" x="' + (labelW + w1 + 6) + '" y="' + (y + 4 + bh - 1) + '">' + (r.value || 0) + '</text>';
        s += '<text class="val" x="' + (labelW + w2 + 6) + '" y="' + (y + 4 + 2 * bh + 2) + '">' + (r.value2 || 0) + '</text>';
      } else {
        var bw = plotW * ((r.value || 0) / max);
        s += '<rect class="bar' + (r.dim ? ' dim' : '') + '" x="' + labelW + '" y="' + (y + 5) + '" width="' + Math.max(bw, 0) + '" height="' + (rowH - 10) + '" rx="2"><title>' + esc(r.label + ': ' + (r.value || 0)) + '</title></rect>';
        s += '<text class="val" x="' + (labelW + bw + 6) + '" y="' + (y + rowH / 2 + 4) + '">' + (r.value || 0) + (r.suffix || '') + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }
  function chartWithTable(id, title, rows, opts) {
    opts = opts || {};
    var two = rows.some(function (r) { return r.value2 !== undefined; });
    var table = '<div class="table-wrap"><table class="table"><thead><tr><th>' + esc(opts.labelHead || '') + '</th><th class="num">' + esc(opts.s1 || t('cases')) + '</th>' + (two ? '<th class="num">' + esc(opts.s2 || '') + '</th>' : '') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.label) + '</td><td class="num">' + (r.value || 0) + (r.suffix || '') + '</td>' + (two ? '<td class="num">' + (r.value2 || 0) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
    var legend = two ? '<div class="legend"><span>' + esc(opts.s1) + '</span><span class="b">' + esc(opts.s2) + '</span></div>' : '';
    return '<div class="card chart-card" data-chart="' + id + '"><div class="row between"><h3>' + esc(title) + '</h3><button class="btn sm ghost" data-action="chart:toggle" data-arg="' + id + '">' + esc(t('tableView')) + '</button></div>' +
      legend + '<div class="c-chart">' + barChart(rows, Object.assign({ title: title }, opts)) + '</div><div class="c-table" hidden>' + table + '</div>' + (opts.note ? '<p class="small muted" style="margin-top:6px">' + esc(opts.note) + '</p>' : '') + '</div>';
  }

  // ---------- routing ----------
  function routeFromHash() {
    var h = (location.hash || '').replace('#', '');
    return ROUTES.indexOf(h) !== -1 ? h : 'inicio';
  }
  function go(route) {
    if (ROUTES.indexOf(route) === -1) route = 'inicio';
    state.route = route;
    if (location.hash !== '#' + route) { try { location.hash = route; } catch (e) {} }
    render();
  }

  var views = {};   // route -> render function (returns html), set by view modules
  var binders = {}; // route -> bind function after render
  var titles = { inicio: 'navHome', casos: 'navCases', anotar: 'navAnnotate', semaforo: 'navSemaforo', atlas: 'navAtlas', observatorio: 'navObservatory', evaluacion: 'navEvaluation', gobernanza: 'navGovernance', ayuda: 'navHelp' };
  var navIcons = { inicio: 'home', casos: 'cases', anotar: 'annotate', semaforo: 'sem', atlas: 'atlas', observatorio: 'obs', evaluacion: 'eval', gobernanza: 'gov', ayuda: 'help' };

  function shell() {
    var nav = ROUTES.map(function (r) { return '<a href="#' + r + '" class="' + (state.route === r ? 'active' : '') + '" data-action="go" data-arg="' + r + '">' + ICONS[navIcons[r]] + '<span>' + esc(t(titles[r])) + '</span></a>'; }).join('');
    var full = (state.route === 'anotar');
    return '<aside class="rail"><div class="brand"><div class="name">' + ICONS.logo + '<span>PanoramIA</span></div><div class="tag">' + esc(t('tagline')) + '</div></div>' +
      '<nav class="nav" aria-label="main">' + nav + '</nav>' +
      '<div class="rail-foot"><span class="pill demo">' + esc(t('prototype')) + '</span><span>' + esc(state.storageMemory ? t('memoryOnly') : t('localOnly')) + '</span></div></aside>' +
      '<section class="main"><div class="topbar"><h1>' + esc(t(titles[state.route])) + '</h1><div class="controls">' +
      '<label class="sr-only" for="lang-sel">' + esc(t('language')) + '</label><select id="lang-sel" data-action="lang:set" aria-label="' + attr(t('language')) + '"><option value="es"' + (I.getLang() === 'es' ? ' selected' : '') + '>Español</option><option value="en"' + (I.getLang() === 'en' ? ' selected' : '') + '>English</option></select>' +
      '<label class="sr-only" for="role-sel">' + esc(t('role')) + '</label><select id="role-sel" data-action="role:set" aria-label="' + attr(t('role')) + '">' + TX.ROLES.map(function (r) { return '<option value="' + r.id + '"' + (state.settings.role === r.id ? ' selected' : '') + '>' + esc(pick(r.name)) + '</option>'; }).join('') + '</select>' +
      '<input id="actor-in" type="text" style="width:120px" placeholder="' + attr(t('actorPlaceholder')) + '" value="' + attr(state.settings.actor) + '" data-action="actor:set" aria-label="' + attr(t('actor')) + '">' +
      '</div></div><div class="content' + (full ? ' full' : '') + '" id="content"></div></section>';
  }

  function render() {
    var app = byId('app');
    if (!state.settings.ack) { app.innerHTML = ''; renderAck(); return; }
    document.documentElement.lang = I.getLang();
    app.innerHTML = shell();
    var fn = views[state.route];
    var content = byId('content');
    content.innerHTML = fn ? fn() : '';
    if (binders[state.route]) { try { binders[state.route](content); } catch (e) { console.error(e); } }
  }

  function renderAck() {
    var html = '<header><h2>' + esc(t('ackTitle')) + '</h2></header><div class="body stack">' +
      '<p>' + esc(t('ackIntro')) + '</p>' +
      ['ack1', 'ack2', 'ack3', 'ack4'].map(function (k, i) { return '<label class="check"><input type="checkbox" data-ack="' + i + '"><span>' + esc(t(k)) + '</span></label>'; }).join('') +
      '<div class="row between"><div class="row"><label for="ack-lang" class="muted small">' + esc(t('language')) + '</label><select id="ack-lang" data-action="lang:set"><option value="es"' + (I.getLang() === 'es' ? ' selected' : '') + '>Español</option><option value="en"' + (I.getLang() === 'en' ? ' selected' : '') + '>English</option></select></div>' +
      '<button class="btn primary" id="ack-enter" data-action="ack:enter" disabled>' + esc(t('ackEnter')) + '</button></div></div>';
    openModal(html, { narrow: true, noFocus: true });
    qsa('[data-ack]').forEach(function (cb) { cb.addEventListener('change', function () { byId('ack-enter').disabled = !qsa('[data-ack]').every(function (x) { return x.checked; }); }); });
  }

  // ---------- downloads capability ----------
  function initDownloads() {
    try {
      if (root.claude && typeof root.claude.use === 'function') {
        root.claude.use('downloads').then(function (d) {
          state.downloads = d || null;
          // The governance view decides between "Download" and "Copy JSON" at render time; refresh it if it is open.
          if (state.downloads && state.route === 'gobernanza') render();
        }).catch(function () { state.downloads = null; });
      }
    } catch (e) { state.downloads = null; }
  }
  function saveFile(filename, data) {
    if (!state.downloads) return Promise.reject({ code: 'unavailable' });
    return state.downloads.save({ filename: filename, data: data });
  }
  function copyText(text) {
    return new Promise(function (resolve, reject) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(resolve, function () { fallback(); }); } else fallback();
      } catch (e) { fallback(); }
      function fallback() {
        try { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); ok ? resolve() : reject(new Error('copy failed')); } catch (e2) { reject(e2); }
      }
    });
  }

  root.PX = {
    APP_VERSION: APP_VERSION, state: state, views: views, binders: binders, t: t, pick: pick, esc: esc, attr: attr, fmtDate: fmtDate, pct: pct, fmtCI: fmtCI,
    byId: byId, qs: qs, qsa: qsa, uid: uid, makePseudonym: makePseudonym, roleName: roleName, readerName: readerName, optName: optName, findingName: findingName, groupOf: groupOf, groupClass: groupClass,
    can: can, readersForRole: readersForRole, caseStatus: caseStatus, annotationsOf: annotationsOf, findingsOf: findingsOf, readState: readState, atlasEligible: atlasEligible, caseById: caseById,
    refreshAll: refreshAll, audit: audit, saveCase: saveCase, saveAnnotation: saveAnnotation, deleteAnnotation: deleteAnnotation, saveChecklist: saveChecklist, deleteCase: deleteCase,
    fmtLength: fmtLength, calibrationLabel: calibrationLabel,
    loadDemo: loadDemo, removeDemo: removeDemo, hasDemo: hasDemo, imageBitmap: imageBitmap, loadImageEl: loadImageEl,
    loadOpenData: loadOpenData, loadOpenDataRemote: loadOpenDataRemote, removeOpenData: removeOpenData, hasOpenData: hasOpenData, openDataCount: openDataCount, canLoadRemote: canLoadRemote, openSubset: openSubset, openSets: openSets, openInfo: openInfo,
    toast: toast, openModal: openModal, closeModal: closeModal, modalOpen: modalOpen, ICONS: ICONS, odontogram: odontogram, barChart: barChart, chartWithTable: chartWithTable,
    go: go, render: render, routeFromHash: routeFromHash, loadSettings: loadSettings, saveSettings: saveSettings, initDownloads: initDownloads, saveFile: saveFile, copyText: copyText, ROUTES: ROUTES
  };
})(typeof window !== 'undefined' ? window : globalThis);
