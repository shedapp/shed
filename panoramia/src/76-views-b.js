/* PanoramIA — views: annotation workspace (shapes, palette, anatomy, measurements) and surgical traffic light (with geometric suggestions). */
(function (root) {
  'use strict';
  var PX = root.PX, I = root.PX_I18N, TX = root.PX_TAXONOMY, RUB = root.PX_RUBRIC, MET = root.PX_METRICS, Viewer = root.PX_Viewer, G = root.PX_GEOM;
  var t = PX.t, pick = PX.pick, esc = PX.esc, attr = PX.attr, state = PX.state, A = PX.actions;

  function colorOf(code) { return TX.colorOf(code); }
  var TOOLS = [['pan', 'toolPan', 'V'], ['box', 'toolRect', 'R'], ['polygon', 'toolPolygon', 'P'], ['free', 'toolFree', 'T'], ['polyline', 'toolPolyline', 'Y'], ['line', 'toolLine', 'L'], ['point', 'toolPoint', 'O'], ['measure', 'toolMeasure', 'M']];
  var SHAPE_TO_TOOL = { rect: 'box', polygon: 'polygon', free: 'free', polyline: 'polyline', line: 'line', point: 'point' };
  var TOOL_TO_SHAPE = { box: 'rect', polygon: 'polygon', free: 'polygon', polyline: 'polyline', line: 'line', point: 'point', measure: 'line' };

  // ================= ANNOTATE =================
  var an = { viewer: null, af: null, tab: 'findings', selectedId: null, bright: 1, contrast: 1, pendingCode: '', lastFdi: null, tool: 'pan', drafting: null };
  state.an = an;

  function shapePoints(a) { return a.shape && a.shape.points ? a.shape.points : [[a.box.x, a.box.y], [a.box.x + a.box.w, a.box.y + a.box.h]]; }
  function shapeType(a) { return a.shape && a.shape.type ? a.shape.type : 'rect'; }
  function lengthOf(a) { return shapeType(a) === 'line' || shapeType(a) === 'polyline' ? G.length(shapePoints(a)) : Math.hypot(a.box.w, a.box.h); }
  function labelFor(a, c) {
    if (TX.isMeasure(a.code)) return PX.fmtLength(lengthOf(a), c);
    var base = state.ui.labelMode === 'name' ? PX.findingName(a.code) : a.code;
    var fdi = a.fdi ? (state.ui.labelMode === 'name' ? ' · ' + (I.getLang() === 'en' ? 'tooth ' : 'pza ') + a.fdi : ' ' + a.fdi) : '';
    var side = a.side ? ' ' + a.side : '';
    return base + fdi + side;
  }
  function itemFor(a, c, extra) {
    return Object.assign({ id: a.id, x: a.box.x, y: a.box.y, w: a.box.w, h: a.box.h, shape: a.shape || null, color: colorOf(a.code), anatomy: TX.isAnatomy(a.code) || TX.isMeasure(a.code), dashed: !!(TX.FINDING_BY_CODE[a.code] && TX.FINDING_BY_CODE[a.code].dashed), label: labelFor(a, c) }, extra || {});
  }

  PX.views.anotar = function () {
    if (!state.currentCaseId || !PX.caseById(state.currentCaseId)) {
      var tiles = state.cases.map(function (c) { var im = state.images[c.id]; return '<div class="tile" data-action="case:open" data-arg="' + c.id + '">' + (im && im.thumb ? '<img alt="" src="' + im.thumb + '">' : '<div style="height:120px;background:var(--viewer-bg)"></div>') + '<div class="b"><span class="mono">' + esc(c.pseudonym) + '</span><div class="muted">' + esc(PX.optName(TX.MODALITIES, c.modality)) + ' · ' + esc(c.province || '') + '</div></div></div>'; }).join('');
      return '<div style="padding:20px 24px;width:100%"><h2 style="margin-bottom:12px">' + esc(t('selectCase')) + '</h2>' + (tiles ? '<div class="gallery">' + tiles + '</div>' : '<div class="empty">' + esc(t('noCases')) + '</div>') + '</div>';
    }
    var c = PX.caseById(state.currentCaseId);
    var readers = PX.readersForRole();
    if (readers.indexOf(state.ui.reader) === -1) state.ui.reader = 'R1';
    var seg = '<div class="seg" role="group" aria-label="' + attr(t('reader')) + '">' + readers.map(function (r) { return '<button data-action="an:reader" data-arg="' + r + '" class="' + (state.ui.reader === r ? 'on' : '') + '">' + esc(PX.readerName(r)) + '</button>'; }).join('') + '</div>';
    var tools = '<div class="seg tools" role="group" aria-label="' + attr(t('tool')) + '">' + TOOLS.map(function (tl) { return '<button data-action="an:tool" data-arg="' + tl[0] + '" id="tool-' + tl[0] + '" class="' + (an.tool === tl[0] ? 'on' : '') + '" title="' + attr(t(tl[1]) + ' (' + tl[2] + ')') + '">' + esc(t(tl[1])) + '</button>'; }).join('') + '</div>';
    return '<div class="split">' +
      '<div class="viewer-wrap"><div class="viewer-tools">' + seg + '<span style="width:6px"></span>' + tools +
      '<button class="btn sm" data-action="an:fit" title="0">' + esc(t('fit')) + '</button><button class="btn sm" data-action="an:invert" id="tool-invert" title="I">' + esc(t('invert')) + '</button>' +
      '<label>' + esc(t('brightness')) + '<input type="range" min="0.3" max="2.2" step="0.02" value="' + an.bright + '" data-action="an:bright"></label>' +
      '<label>' + esc(t('contrast')) + '<input type="range" min="0.3" max="2.5" step="0.02" value="' + an.contrast + '" data-action="an:contrast"></label>' +
      '<button class="btn sm" data-action="an:resetWin">' + esc(t('reset')) + '</button>' +
      '<label><input type="checkbox" data-action="an:others"' + (state.ui.showOthers ? ' checked' : '') + '> ' + esc(t('showOthers')) + '</label>' +
      '<label><input type="checkbox" data-action="an:labels"' + (state.ui.labelMode === 'name' ? ' checked' : '') + '> ' + esc(t('labelNames')) + '</label>' +
      (c.ref ? '<label><input type="checkbox" data-action="an:ref"' + (state.ui.showRef ? ' checked' : '') + '> ' + esc(t('showRef')) + '</label>' : '') +
      '</div><canvas id="an-canvas" tabindex="0" aria-label="' + attr(c.pseudonym) + '"></canvas><div class="viewer-hint" id="an-hint">' + hintHtml(c) + '</div></div>' +
      '<aside class="panel" id="an-panel"></aside></div>';
  };
  function hintHtml(c) {
    if (an.drafting) return '<span class="draft">' + esc(t(an.drafting.type === 'polygon' ? 'hintPolygon' : 'hintPolyline')) + ' · ' + an.drafting.points.length + '</span>';
    var cal = '<span class="' + (c.calibration ? '' : 'muted') + '">' + esc(PX.calibrationLabel(c)) + '</span>';
    var base = esc(t('sc1')) + ' · ' + cal;
    if (c.ref) base += '<span id="ref-legend"' + (state.ui.showRef ? '' : ' hidden') + '> · <span class="sw" style="background:#FFEE58"></span>' + esc(t(c.datasetKey === 'opg' ? 'refLegendOpg' : 'refLegend')) + '</span>';
    return base;
  }
  function updateHint() { var h = PX.byId('an-hint'); var c = PX.caseById(state.currentCaseId); if (h && c) h.innerHTML = hintHtml(c); }

  PX.binders.anotar = function (content) {
    var cv = PX.byId('an-canvas'); if (!cv) return;
    var c = PX.caseById(state.currentCaseId);
    an.af = null; an.selectedId = null; an.drafting = null; an.proposals = null; an.detectBusy = false;
    var v = new Viewer(cv, {
      tool: an.tool, readOnly: !PX.can('annotate'),
      onCreate: function (g) { onCreate(g); },
      onDraft: function (d) { an.drafting = d ? { type: d.type, points: d.points } : null; updateHint(); },
      onSelect: function (id) {
        if (id === 'new') return;
        an.selectedId = id;
        if (id) { var a = state.annotations.filter(function (x) { return x.id === id; })[0]; if (a && a.reader === state.ui.reader) an.af = editable(a); }
        else if (an.af && an.af.id) an.af = null;
        renderPanel();
      },
      onChange: function (id, g) {
        if (id === 'new') { if (an.af) { an.af.box = { x: g.x, y: g.y, w: g.w, h: g.h }; an.af.shape = g.shape; } return; }
        var a = state.annotations.filter(function (x) { return x.id === id; })[0];
        if (a && a.reader === state.ui.reader && PX.can('annotate')) {
          a.box = { x: g.x, y: g.y, w: g.w, h: g.h }; a.shape = g.shape; if (a.side !== undefined) a.side = sideFor(a, c);
          PX.saveAnnotation(a).then(function () { PX.audit('finding.move', c.pseudonym, a.code + (a.fdi ? ' ' + a.fdi : '')); renderPanel(); syncBoxes(); });
          if (an.af && an.af.id === id) { an.af.box = a.box; an.af.shape = a.shape; }
        }
      }
    });
    an.viewer = v;
    v.setTool(an.tool); setToolButtons(an.tool);
    PX.imageBitmap(c.id).then(function (bmp) { if (bmp && an.viewer === v) { v.setImage(bmp); setTimeout(function () { v.resize(); v.fit(); }, 30); } });
    cv.addEventListener('keydown', function (e) {
      if (v.isDrafting()) return; // the viewer handles Enter / Esc / Backspace while drawing
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toUpperCase();
      if (k === '0') v.fit();
      else if (k === 'I') toggleInvert();
      else if (k === 'ESCAPE') { an.af = null; an.selectedId = null; syncBoxes(); renderPanel(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && an.selectedId) { e.preventDefault(); A['an:delete'](an.selectedId); }
      else { var tl = TOOLS.filter(function (x) { return x[2] === k; })[0]; if (tl) A['an:tool'](tl[0]); }
    });
    syncBoxes(); renderPanel();
  };
  function setToolButtons(tool) { TOOLS.forEach(function (tl) { var b = PX.byId('tool-' + tl[0]); if (b) b.classList.toggle('on', tool === tl[0]); }); }
  function toggleInvert() { if (!an.viewer) return; var on = an.viewer.toggleInvert(); var b = PX.byId('tool-invert'); if (b) b.classList.toggle('on', on); }
  function editable(a) { return { id: a.id, box: a.box, shape: a.shape || null, fdi: a.fdi, code: a.code, confidence: a.confidence, note: a.note || '' }; }
  function sideFor(a, c) {
    var def = TX.FINDING_BY_CODE[a.code]; if (!def || !def.sided || !c) return null;
    return G.sideOf(shapePoints(a), c.width || 1);
  }

  function onCreate(g) {
    var c = PX.caseById(state.currentCaseId); if (!c || !PX.can('annotate')) return;
    if (state.ui.reader === 'ADJ' && !PX.can('adjudicate')) { PX.toast(t('facultyOnly'), 'crit'); return; }
    if (an.tool === 'measure') {
      var m = { id: PX.uid('f'), caseId: c.id, reader: state.ui.reader, readerName: state.settings.actor || '—', fdi: null, code: 'MEA-LIN', confidence: 'certain', box: { x: g.x, y: g.y, w: g.w, h: g.h }, shape: g.shape, note: '', createdAt: Date.now() };
      PX.saveAnnotation(m).then(function () { return PX.audit('measure.add', c.pseudonym, PX.fmtLength(lengthOf(m), c)); }).then(function () { an.selectedId = m.id; syncBoxes(); renderPanel(); });
      return;
    }
    var code = an.pendingCode || '';
    var def = code ? TX.FINDING_BY_CODE[code] : null;
    an.af = { id: null, box: { x: g.x, y: g.y, w: g.w, h: g.h }, shape: g.shape, fdi: def && def.tooth ? an.lastFdi : null, code: code, confidence: 'certain', note: '' };
    an.selectedId = null; syncBoxes(); renderPanel();
    var sel = PX.byId('af-code'); if (sel && !code) sel.focus();
  }

  function syncBoxes() {
    if (!an.viewer) return;
    var c = PX.caseById(state.currentCaseId); if (!c) return;
    var mine = PX.annotationsOf(c.id, state.ui.reader);
    var items = [];
    if (state.ui.showOthers) {
      // External reference findings (published dataset) are the answer key: they appear only in the reference tab, never as "other readers".
      state.annotations.filter(function (a) { return a.caseId === c.id && a.reader !== state.ui.reader && !a.external; }).forEach(function (a) {
        items.push(itemFor(a, c, { id: 'o_' + a.id, dashed: true, alpha: 0.7, fillAlpha: 0.12, selectable: false, label: a.reader + ' ' + labelFor(a, c) }));
      });
    }
    mine.forEach(function (a) {
      if (an.af && an.af.id === a.id) return; // drawn as the editing shape
      items.push(itemFor(a, c, { selectable: PX.can('annotate') }));
    });
    (an.proposals || []).forEach(function (pr, i) {
      var isAna = TX.isAnatomy(pr.code);
      items.push({ id: 'p_' + i, x: pr.box.x, y: pr.box.y, w: pr.box.w, h: pr.box.h, shape: pr.shape, color: colorOf(pr.code), dashed: true, anatomy: isAna, fillAlpha: isAna ? 0 : 0.28, alpha: an.focusProposal === i ? 1 : 0.85, selectable: false, label: '? ' + (i + 1) + (state.ui.labelMode === 'name' ? ' ' + PX.findingName(pr.code) : ' ' + pr.code) + (pr.fdi ? ' ' + pr.fdi : '') });
    });
    var fp = an.proposals && an.focusProposal != null ? an.proposals[an.focusProposal] : null;
    if (fp && fp.context && fp.context.points) { var cb = G.bbox(fp.context.points); items.push({ id: 'ctx', x: cb.x, y: cb.y, w: cb.w, h: cb.h, shape: { type: 'polygon', points: fp.context.points }, color: '#FFFFFF', dashed: true, fillAlpha: 0, alpha: 0.9, selectable: false, label: (I.getLang() === 'en' ? 'tooth' : 'diente') + (fp.context.fdi ? ' ' + fp.context.fdi : '') }); }
    if (an.af) items.push({ id: an.af.id || 'new', x: an.af.box.x, y: an.af.box.y, w: an.af.box.w, h: an.af.box.h, shape: an.af.shape, color: an.af.code ? colorOf(an.af.code) : '#FFFFFF', anatomy: an.af.code ? TX.isAnatomy(an.af.code) : false, selectable: true, label: an.af.code ? labelFor({ code: an.af.code, fdi: an.af.fdi, box: an.af.box, shape: an.af.shape }, c) : '' });
    an.viewer.setBoxes(items);
    an.viewer.setOverlay(c.ref && state.ui.showRef && root.PX_OPENDATA ? root.PX_OPENDATA.overlayShapes(c.ref) : []);
    an.viewer.selectedId = an.af ? (an.af.id || 'new') : an.selectedId;
    an.viewer.request();
  }

  function renderPanel() {
    var p = PX.byId('an-panel'); if (!p) return;
    var c = PX.caseById(state.currentCaseId); if (!c) return;
    var tabs = [['findings', 'navAnnotate'], ['report', 'reportTab'], ['case', 'caseData'], ['checks', 'checklistsOfCase']];
    var html = '<div><div class="row between"><div><span class="mono" style="font-size:15px;font-weight:600">' + esc(c.pseudonym) + '</span>' + (c.isDemo ? ' <span class="pill demo">' + esc(t('demo')) + '</span>' : '') + (c.isOpenData ? ' <span class="pill info">' + esc(c.dataset || t('openData')) + '</span>' : '') + '</div>' + statusPills(c) + '</div>' +
      '<div class="small muted" style="margin-top:4px">' + [PX.optName(TX.MODALITIES, c.modality), c.siteName, c.year, ((c.ageBand || '') + ' ' + (c.sex && c.sex !== 'U' ? c.sex : '')).trim()].filter(function (x) { return x; }).map(esc).join(' · ') + '</div></div>' +
      '<div class="seg">' + tabs.map(function (tb) { return '<button data-action="an:tab" data-arg="' + tb[0] + '" class="' + (an.tab === tb[0] ? 'on' : '') + '">' + esc(t(tb[1])) + '</button>'; }).join('') + '</div>';
    if (PX.caseStatus(c) === 'quarantine') html += '<div class="banner warn small">' + PX.ICONS.warn + '<div>' + esc(t('quarantineWarn')) + '</div></div>';
    if (an.tab === 'findings') html += panelFindings(c);
    else if (an.tab === 'report') html += panelReport(c);
    else if (an.tab === 'case') html += panelCase(c);
    else html += panelChecks(c);
    p.innerHTML = html;
  }
  function statusPills(c) {
    var s = PX.caseStatus(c), r = PX.readState(c);
    var map = { unread: ['na', 'stUnread'], single: ['info', 'stSingle'], double: ['info', 'stDouble'], adj: ['ok', 'stAdj'], external: ['info', 'extRef'] };
    return '<div class="row" style="gap:4px">' + (s === 'ready' ? '<span class="pill ok">' + esc(t('statusReady')) + '</span>' : '<span class="pill warn">' + esc(t('statusQuarantine')) + '</span>') + '<span class="pill ' + map[r][0] + '">' + esc(t(map[r][1])) + '</span></div>';
  }

  function categorySelect(id, value) {
    var out = '<select id="' + id + '"><option value="">—</option>';
    Object.keys(TX.GROUPS).forEach(function (g) {
      if (g === 'MEA') return;
      out += '<optgroup label="' + attr(pick(TX.GROUPS[g].name)) + '">' + TX.FINDINGS.filter(function (f) { return f.group === g; }).map(function (f) { return '<option value="' + f.code + '"' + (value === f.code ? ' selected' : '') + '>' + esc(f.code + ' ' + pick(f.name)) + '</option>'; }).join('') + '</optgroup>';
    });
    return out + '</select>';
  }
  function chip(code, on, count, found) {
    var f = TX.FINDING_BY_CODE[code];
    return '<button class="chip' + (on ? ' on' : '') + (found ? ' found' : '') + '" data-action="an:chip" data-arg="' + code + '" title="' + attr(code + ' — ' + pick(f.desc)) + '"><span class="sw" style="background:' + f.color + '"></span>' + esc(pick(f.name)) + (count ? ' <span class="cnt">' + esc(String(count)) + '</span>' : '') + '</button>';
  }
  /** Codes already marked on a tooth by the current reader (and, for reference cases, by the answer key), with counts. */
  function codesOnTooth(c, fdi) {
    if (!c || !fdi) return [];
    var counts = {}, order = [];
    state.annotations.filter(function (a) { return a.caseId === c.id && a.fdi === fdi && (a.reader === state.ui.reader || a.external); }).forEach(function (a) {
      if (!counts[a.code]) { counts[a.code] = { code: a.code, mine: 0, ext: 0 }; order.push(a.code); }
      if (a.external) counts[a.code].ext++; else counts[a.code].mine++;
    });
    return order.map(function (k) { return counts[k]; });
  }
  function palette() {
    var c = PX.caseById(state.currentCaseId);
    var fdi = an.af && an.af.fdi ? an.af.fdi : an.lastFdi;
    var found = codesOnTooth(c, fdi), foundSet = {};
    found.forEach(function (f) { foundSet[f.code] = true; });
    var onTooth = '';
    if (fdi) {
      onTooth = '<div class="on-tooth"><h4>' + esc(t('onTooth', { fdi: fdi, name: TX.toothName(fdi, I.getLang()) })) + '</h4>' +
        (found.length ? '<div class="chips">' + found.map(function (f) { return chip(f.code, an.pendingCode === f.code, (f.mine ? f.mine : '') + (f.ext ? (f.mine ? '+' : '') + f.ext + '*' : '')); }).join('') + '</div>' +
          '<p class="small muted" style="margin:4px 0 0">' + esc(t('onToothHelp')) + '</p>' : '<p class="small muted" style="margin:2px 0 0">' + esc(t('onToothNone')) + '</p>') + '</div>';
    }
    var quick = TX.QUICK_CODES.map(function (code) { return chip(code, an.pendingCode === code, null, foundSet[code]); }).join('');
    var anat = TX.ANATOMY_CODES.map(function (code) { return chip(code, an.pendingCode === code); }).join('');
    return '<div class="palette"><div class="row between"><h3>' + esc(t('palette')) + '</h3>' + (an.pendingCode ? '<button class="btn sm ghost" data-action="an:chip" data-arg="">' + esc(t('paletteClear')) + '</button>' : '') + '</div>' +
      onTooth +
      '<p class="small muted" style="margin:6px 0 6px">' + esc(t('paletteHelp')) + '</p>' +
      '<div class="chips">' + quick + '</div>' +
      '<h4 style="margin-top:8px">' + esc(pick(TX.GROUPS.ANA.name)) + '</h4><div class="chips">' + anat + '</div>' +
      (an.pendingCode ? '<p class="small" style="margin-top:6px">' + esc(t('armed', { name: PX.findingName(an.pendingCode), tool: t(TOOLS.filter(function (x) { return x[0] === an.tool; })[0][1]) })) + '</p>' : '') + '</div>';
  }

  function panelFindings(c) {
    var html = '';
    var canAnn = PX.can('annotate');
    if (!canAnn) html += '<div class="banner small">' + PX.ICONS.info + '<div>' + esc(t('readOnlyRole')) + '</div></div>';
    if (state.ui.reader === 'ADJ' && !PX.can('adjudicate')) html += '<div class="banner small">' + PX.ICONS.info + '<div>' + esc(t('facultyOnly')) + '</div></div>';
    if (c.externalReference) html += '<div class="banner small">' + PX.ICONS.info + '<div><strong>' + esc(t('extRef')) + ' · ' + esc((c.ref && c.ref.source) || c.dataset || '') + '.</strong> ' + esc(t('extRefHelp')) + '</div></div>';
    if (canAnn && !an.af) html += palette();
    if (canAnn && root.PX_AUTO && (c.modality === 'PAN' || c.modality === 'OTHER')) html += detectorPanel(c);
    // form
    if (an.af && canAnn) {
      var f = an.af;
      var fdef = f.code ? TX.FINDING_BY_CODE[f.code] : null;
      var shapeName = pick(TX.SHAPE_NAMES[shapeType(f)] || TX.SHAPE_NAMES.rect);
      var shapeWarn = fdef && fdef.shapes && fdef.shapes.indexOf(shapeType(f)) === -1 ? '<div class="help warn-text">' + esc(t('shapeNotRecommended', { shapes: fdef.shapes.map(function (s) { return pick(TX.SHAPE_NAMES[s]); }).join(', ') })) + '</div>' : '';
      html += '<div class="card" style="padding:12px 14px"><h3>' + esc(f.id ? t('editFinding') : t('newFinding')) + ' <span class="muted small" style="font-weight:400">· ' + esc(shapeName) + (f.shape && f.shape.points ? ' · ' + f.shape.points.length + ' pt' : '') + '</span></h3>' +
        '<div class="field"><label for="af-code">' + esc(t('category')) + '</label><div class="row"><span class="sw lg" style="background:' + (f.code ? colorOf(f.code) : 'transparent') + '"></span>' + categorySelect('af-code', f.code) + '</div>' + (fdef ? '<div class="help">' + esc(pick(fdef.desc)) + '</div>' : '') + shapeWarn + '</div>';
      if (!fdef || fdef.tooth || fdef.group === 'DEN' || fdef.group === 'SUR') {
        html += '<div class="field" style="margin-top:8px"><label>' + esc(t('toothFdi')) + ' <span class="mono">' + (f.fdi ? f.fdi + ' <span class="muted" style="font-family:var(--font)">' + esc(TX.toothName(f.fdi, I.getLang())) + '</span>' : '<span class="muted">' + esc(t('noTooth')) + '</span>') + '</span></label>' +
          '<div class="row" style="margin-bottom:4px"><div class="seg"><button data-action="an:dent" data-arg="perm" class="' + (!an.primary ? 'on' : '') + '">' + esc(t('permanent')) + '</button><button data-action="an:dent" data-arg="prim" class="' + (an.primary ? 'on' : '') + '">' + esc(t('primaryDent')) + '</button></div><button class="btn sm ghost" data-action="an:fdi" data-arg="">' + esc(t('noTooth')) + '</button></div>' +
          '<div data-odont="af">' + PX.odontogram({ selected: f.fdi, primary: !!an.primary }) + '</div>' + (f.fdi ? '<div class="help">' + esc(t('sameToothHelp')) + '</div>' : '') + '</div>';
      } else if (fdef && fdef.sided) {
        html += '<div class="field" style="margin-top:8px"><label>' + esc(t('side')) + '</label><div class="small">' + esc(G.sideOf(shapePoints(f), c.width || 1) === 'R' ? t('sideRight') : t('sideLeft')) + ' <span class="muted">· ' + esc(t('sideAuto')) + '</span></div></div>';
      }
      html += '<div class="field" style="margin-top:8px"><label>' + esc(t('confidence')) + '</label><div class="opts inline">' + TX.CONFIDENCE.map(function (o) { return '<label class="check"><input type="radio" name="af-conf" value="' + o.id + '"' + (f.confidence === o.id ? ' checked' : '') + '><span>' + esc(pick(o.name)) + '</span></label>'; }).join('') + '</div></div>' +
        '<div class="field" style="margin-top:8px"><label for="af-note">' + esc(t('note')) + '</label><textarea id="af-note" style="min-height:50px">' + esc(f.note) + '</textarea></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn primary" data-action="an:save">' + esc(t('save')) + '</button><button class="btn" data-action="an:cancel">' + esc(t('cancel')) + '</button>' + (f.id ? '<button class="btn ghost danger" style="margin-left:auto" data-action="an:delete" data-arg="' + f.id + '">' + esc(t('delete')) + '</button>' : '') + '</div></div>';
    } else if (canAnn) {
      html += '<p class="small muted">' + esc(t('drawFirst')) + '</p>';
    }
    // list for the current reader, grouped by tooth
    var mine = PX.annotationsOf(c.id, state.ui.reader);
    html += '<div><h3 style="margin-bottom:6px">' + esc(t('findingsOf', { r: PX.readerName(state.ui.reader) })) + ' <span class="muted">(' + mine.length + ')</span></h3>' + (mine.length ? groupedList(mine, c, false) : '<p class="small muted">' + esc(t('noFindings')) + '</p>') + '</div>';
    // adjudication helpers
    if (state.ui.reader === 'ADJ' && PX.can('adjudicate')) {
      html += '<div class="card" style="padding:12px 14px"><h3>' + esc(t('adjudicate')) + '</h3><p class="small muted">' + esc(t('adjHelp')) + '</p>';
      ['R1', 'R2'].forEach(function (r) {
        var list = PX.annotationsOf(c.id, r);
        if (!list.length) return;
        html += '<h4 style="margin-top:8px">' + esc(PX.readerName(r)) + ' <span class="muted">(' + list.length + ')</span></h4>' + groupedList(list, c, true);
      });
      html += '<div class="row" style="margin-top:10px"><label class="check"><input type="checkbox" data-action="an:adjComplete"' + (c.adjudicationComplete ? ' checked' : '') + '><span>' + esc(t(c.adjudicationComplete ? 'adjComplete' : 'markAdjComplete')) + '</span></label></div></div>';
    }
    // agreement (clinical findings only)
    var r1 = PX.findingsOf(c.id, 'R1'), r2 = PX.findingsOf(c.id, 'R2');
    html += '<div class="card" style="padding:12px 14px"><h3>' + esc(t('agreement')) + '</h3>';
    if (r1.length && r2.length) {
      var ag = MET.readerAgreement(r1, r2);
      html += '<div class="row"><div class="kpi" style="flex:1"><div class="v">' + (ag.jaccard === null ? '—' : PX.pct(ag.jaccard)) + '</div><div class="l">Jaccard</div></div><div class="small muted">' + ag.matched + ' ' + esc(I.getLang() === 'en' ? 'matched of' : 'coincidentes de') + ' ' + ag.union + '</div></div><p class="small faint" style="margin-top:6px">' + esc(t('agreementHelp')) + '</p>';
    } else html += '<p class="small muted">' + esc(t('agreementNeedsTwo')) + '</p>';
    html += '</div>';
    return html;
  }
  function groupedList(list, c, forAdj) {
    var groups = {}, order = [];
    list.forEach(function (a) {
      var k = TX.isMeasure(a.code) ? 'mea' : TX.isAnatomy(a.code) ? 'ana' : (a.fdi ? String(a.fdi) : 'none');
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(a);
    });
    order.sort(function (x, y) { var rank = function (k) { return k === 'mea' ? 3 : k === 'ana' ? 2 : k === 'none' ? 1 : 0; }; return rank(x) - rank(y) || (parseInt(x, 10) || 0) - (parseInt(y, 10) || 0); });
    return '<div class="stack" style="gap:6px">' + order.map(function (k) {
      var head = k === 'mea' ? t('measurements') : k === 'ana' ? pick(TX.GROUPS.ANA.name) : k === 'none' ? t('noTooth') : (I.getLang() === 'en' ? 'Tooth ' : 'Pieza ') + k + ' · ' + TX.toothName(parseInt(k, 10), I.getLang());
      return '<div class="tooth-group"><div class="tg-head">' + esc(head) + ' <span class="muted">(' + groups[k].length + ')</span></div>' + groups[k].map(function (a) { return findingRow(a, a.id === an.selectedId, forAdj, c); }).join('') + '</div>';
    }).join('') + '</div>';
  }
  function findingRow(a, sel, forAdj, c) {
    var name = PX.findingName(a.code), isM = TX.isMeasure(a.code);
    var meta = '<span class="code">' + esc(a.code) + '</span>' + (a.fdi ? ' · FDI ' + a.fdi : '') + (a.side ? ' · ' + esc(a.side === 'R' ? t('sideRight') : t('sideLeft')) : '') + ' · ' + esc(pick(TX.SHAPE_NAMES[shapeType(a)] || TX.SHAPE_NAMES.rect)) +
      (isM ? ' · <strong>' + esc(PX.fmtLength(lengthOf(a), c)) + '</strong>' : ' · ' + esc(PX.optName(TX.CONFIDENCE, a.confidence))) + (a.readerName && a.readerName !== '—' ? ' · ' + esc(a.readerName) : '');
    var acts = '';
    if (forAdj && !isM) acts += '<button class="btn sm" data-action="an:accept" data-arg="' + a.id + '">' + esc(t('acceptIntoAdj')) + '</button>';
    if (isM && !forAdj && PX.can('annotate') && a.reader === state.ui.reader) acts += '<button class="btn sm ghost" data-action="an:calibrate" data-arg="' + a.id + '" title="' + attr(t('calibrateHelp')) + '">' + esc(t('calibrate')) + '</button>';
    return '<div class="finding' + (sel ? ' sel' : '') + '" style="border-left-color:' + colorOf(a.code) + '" data-action="an:select" data-arg="' + a.id + '">' +
      '<div><div class="name"><span class="sw" style="background:' + colorOf(a.code) + '"></span>' + esc(isM ? t('measurement') : name) + '</div><div class="meta">' + meta + '</div>' + (a.refKind ? '<div class="meta">' + esc(I.has && !I.has('refKind_' + a.refKind) ? a.refKind + ' (' + (PX.caseById(a.caseId) || {}).dataset + ')' : t('refKind_' + a.refKind)) + (a.fdi ? '' : ' · ' + esc(t('noTooth'))) + '</div>' : '') + (a.note ? '<div class="meta">' + esc(a.note) + '</div>' : '') + '</div>' +
      '<div class="acts">' + acts + '</div></div>';
  }
  function proposalLabel(pr) { return PX.findingName(pr.code) + (pr.fdi ? ' · ' + (I.getLang() === 'en' ? 'tooth ' : 'pza ') + pr.fdi : '') + (pr.side ? ' ' + pr.side : ''); }
  function detectorPanel(c) {
    var AU = root.PX_AUTO, M = AU.MEASURED;
    var html = '<div class="card" style="padding:10px 12px"><h3>' + esc(t('autoTitle', { v: AU.VERSION })) + '</h3><p class="small muted" style="margin:4px 0 8px">' + esc(t('autoHelp', { n: M.images, fil: Math.round(M.byRef.filling_crown.sensitivity * 100), brg: Math.round(M.byRef.bridge.sensitivity * 100), imp: Math.round(M.byRef.implant.sensitivity * 100) })) + '</p>';
    if (!an.proposals) return html + '<button class="btn sm" data-action="an:detect"' + (an.detectBusy ? ' disabled' : '') + '>' + esc(an.detectBusy ? t('autoBusy') : t('autoBtn')) + '</button>' + (teethFor(c).length ? '' : '<p class="small muted" style="margin-top:6px">' + esc(t('autoNoTeeth')) + '</p>') + modelBlock() + '</div>';
    if (!an.proposals.length) return html + '<p class="small">' + esc(t('detectNone')) + '</p><button class="btn sm" data-action="an:detectClose">' + esc(t('detectDismiss')) + '</button></div>';
    // group by code, anatomy first
    var groups = {}, order = [];
    an.proposals.forEach(function (pr, i) { if (!groups[pr.code]) { groups[pr.code] = []; order.push(pr.code); } groups[pr.code].push(i); });
    order.sort(function (a, b) { var ra = TX.isAnatomy(a) ? 0 : 1, rb = TX.isAnatomy(b) ? 0 : 1; return ra - rb || order.indexOf(a) - order.indexOf(b); });
    html += '<div class="row between"><strong>' + esc(t('proposals')) + ' (' + an.proposals.length + ')</strong><div class="row"><button class="btn sm" data-action="an:proposalAccept" data-arg="all">' + esc(t('detectAcceptAll')) + '</button><button class="btn sm ghost" data-action="an:detectClose">' + esc(t('detectDismiss')) + '</button></div></div>';
    html += '<p class="small muted" style="margin:4px 0 6px">' + esc(t('autoConfirmHelp')) + '</p>';
    var anatomyShown = false, findingsShown = false;
    order.forEach(function (code) {
      var f = TX.FINDING_BY_CODE[code], idx = groups[code];
      if (TX.isAnatomy(code) && !anatomyShown) { anatomyShown = true; html += '<h4 style="margin:8px 0 4px">' + esc(t('autoAnatomy')) + '</h4>'; }
      if (!TX.isAnatomy(code) && !findingsShown) { findingsShown = true; html += '<h4 style="margin:10px 0 4px">' + esc(t('autoFindings')) + '</h4>'; }
      html += '<div class="finding" style="border-left-color:' + f.color + ';flex-wrap:wrap"><div style="flex:1 1 60%"><div class="name"><span class="sw" style="background:' + f.color + '"></span>' + esc(pick(f.name)) + ' <span class="muted">(' + idx.length + ')</span></div><div class="meta">' + esc(code) + (M.ppv[code] ? ' · ' + esc(t('autoPpv', { p: Math.round(M.ppv[code] * 100) })) : TX.isAnatomy(code) ? ' · ' + esc(t('autoAtlas')) : ' · ' + esc(t('autoUnmeasured'))) + '</div></div>' +
        '<div class="acts"><button class="btn sm" data-action="an:proposalAccept" data-arg="code:' + code + '">' + esc(t('detectAccept')) + ' ' + idx.length + '</button><button class="btn sm ghost" data-action="an:proposalReject" data-arg="code:' + code + '">' + esc(t('detectReject')) + '</button></div>' +
        '<div class="stack" style="gap:2px;flex-basis:100%;margin-top:4px">' + idx.map(function (i) { var pr = an.proposals[i]; return '<div class="row between small" data-action="an:proposalFocus" data-arg="' + i + '" style="cursor:pointer;padding:2px 0"><span>? ' + (i + 1) + ' · ' + esc(proposalLabel(pr)) + (pr.how ? ' <span class="muted">— ' + esc(pr.how) + '</span>' : '') + '</span><span class="row" style="gap:4px"><button class="btn sm" data-action="an:proposalAccept" data-arg="' + i + '">✓</button><button class="btn sm ghost" data-action="an:proposalReject" data-arg="' + i + '">✕</button></span></div>'; }).join('') + '</div></div>';
    });
    return html + modelBlock() + '</div>';
  }
  /** Trained-model block: a local inference server (tools/model_server.py) running the ONNX detector trained with training/train_yolo.py. */
  function modelBlock() {
    var url = state.settings.modelServer || 'http://127.0.0.1:8765', st = an.modelStatus;
    var M = root.PX_MODEL, card = M && M.ready() ? M.card() : null;
    var browserPart = '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">' +
      (card ? '<span class="pill ok">' + esc(t('modelOnline', { name: card.name || 'ONNX', n: (card.classes || []).length })) + '</span>' +
              '<button class="btn sm primary" data-action="model:predictLocal"' + (an.modelBusy ? ' disabled' : '') + '>' + esc(an.modelBusy ? t('autoBusy') : t('modelRun')) + '</button>'
            : '<button class="btn sm primary" data-action="model:predictLocal"' + (an.modelLoading ? ' disabled' : '') + '>' + esc(an.modelLoading ? t('modelLoading', { p: an.modelLoading }) : t('modelRunFirst')) + '</button>' +
              '<input type="text" style="width:200px" value="' + attr(state.settings.modelBase || 'models/') + '" data-action="model:base" aria-label="URL" title="' + attr(t('modelBaseHelp')) + '">') +
      (an.modelError ? '<span class="pill warn">' + esc(an.modelError) + '</span>' : '') + '</div>' + metricsFor(card);
    var status = !st ? '' : st.ok ? '<span class="pill ok">' + esc(t('modelOnline', { name: (st.model && st.model.name) || 'ONNX', n: st.model && st.model.classes ? st.model.classes.length : '?' })) + '</span>' : '<span class="pill warn">' + esc(t('modelOffline')) + '</span>';
    var serverPart = '<details style="margin-top:8px"><summary class="small muted">' + esc(t('modelServerTitle')) + '</summary><p class="small muted" style="margin:4px 0 6px">' + esc(t('modelHelp')) + '</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><input type="text" style="width:220px" value="' + attr(url) + '" data-action="model:url" aria-label="URL"><button class="btn sm" data-action="model:check">' + esc(t('modelCheck')) + '</button>' +
      '<button class="btn sm" data-action="model:predict"' + (st && st.ok && !an.modelBusy ? '' : ' disabled') + '>' + esc(an.modelBusy ? t('autoBusy') : t('modelRun')) + '</button>' + status + '</div>' + (st && st.ok ? metricsFor(st.model) : '') + '</details>';
    return '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line)"><h4 style="margin:0 0 4px">' + esc(t('modelTitle')) + '</h4><p class="small muted" style="margin:0 0 6px">' + esc(t('modelBrowserHelp')) + '</p>' + browserPart + serverPart + '</div>';
  }
  function metricsFor(model) {
    var card = model && model.panoramia && model.panoramia['iou0.2'] ? model.panoramia['iou0.2'] : null;
    if (!card) return '';
    var keys = ['DEN-RCT', 'DEN-PAR', 'DEN-CAR', 'DEN-ROOT', 'DEN-IMP-H', 'DEN-IMP-D', 'DEN-IMP-U', 'DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-MIS', 'DEN-PBL'].filter(function (k) { return card[k] && card[k].refs; });
    return '<div class="chips" style="margin-top:6px">' + keys.map(function (k) { var m = card[k]; var code = k.replace(/^DEN-IMP-.$/, 'DEN-IMP'); return '<span class="chip" title="' + attr(k + ' · n=' + m.refs) + '"><span class="sw" style="background:' + colorOf(code) + '"></span>' + esc(PX.findingName(code)) + (/-IMP-/.test(k) ? ' ' + k.slice(-1) : '') + ' <span class="cnt">' + Math.round((m.sensitivity || 0) * 100) + '% / ' + Math.round((m.ppv || 0) * 100) + '%</span></span>'; }).join('') + '</div><p class="small muted" style="margin:4px 0 0">' + esc(t('modelMetricsHelp')) + '</p>';
  }
  /** Turns detector output (server or in-browser) into PanoramIA proposals: taxonomy codes, FDI by overlap, side, impaction subtype in the note. */
  function ingestModelProposals(c, j) {
    var W = c.width || j.width || 1, H = c.height || j.height || 1, sx = j.width ? W / j.width : 1, sy = j.height ? H / j.height : 1;
    var teeth = teethFor(c);
    return (j.proposals || []).map(function (p) {
      var code = String(p.code || '').replace(/^DEN-IMP-([HDU])$/, 'DEN-IMP'), sub = /^DEN-IMP-([HDU])$/.test(p.code) ? RegExp.$1 : '';
      if (!TX.FINDING_BY_CODE[code]) return null;
      var pts = (p.shape && p.shape.points ? p.shape.points : [[p.box.x, p.box.y], [p.box.x + p.box.w, p.box.y], [p.box.x + p.box.w, p.box.y + p.box.h], [p.box.x, p.box.y + p.box.h]]).map(function (q) { return [Math.round(q[0] * sx), Math.round(q[1] * sy)]; });
      var b = G.bbox(pts), def = TX.FINDING_BY_CODE[code], fdi = null;
      if (def.tooth && teeth.length && root.PX_OPENDATA) fdi = root.PX_OPENDATA.assignFdi([b.x, b.y, b.w, b.h], teeth.map(function (tt) { var bb = G.bbox(tt.poly); return { fdi: tt.fdi, box: [bb.x, bb.y, bb.w, bb.h] }; }));
      return { code: code, shape: { type: 'polygon', points: pts }, box: { x: b.x, y: b.y, w: Math.max(1, b.w), h: Math.max(1, b.h) }, confidence: 'probable', fdi: fdi, side: def.sided ? G.sideOf(pts, W) : null, score: p.score, how: (p.how || ('model ' + ((j.model && j.model.name) || 'ONNX'))) + (sub ? ' · ' + ({ H: 'horizontal', D: 'distoangular', U: 'unerupted third molar' })[sub] : '') };
    }).filter(Boolean);
  }
  /** Turns the detector boxes into outlines (PX_CONTOUR): caries/lesion edge, root-canal filling, restorations, tooth outline; relabels edentulous gaps. */
  function contourNote(pr) {
    var q = (pr.contour && pr.contour.quality) || {}, en = I.getLang() === 'en', bits = [];
    if (pr.was) bits.push(en ? 'no mineralised tissue: edentulous space, not a fracture' : 'sin tejido mineralizado: espacio edéntulo, no fractura');
    if (pr.code === 'DEN-RCT' && q.reaches != null) bits.push((en ? 'filling covers ' : 'obturación cubre ') + Math.round(q.reaches * 100) + '% ' + (en ? 'of root length' : 'de la longitud radicular') + (q.shortOfApexPx > 6 ? (en ? ' · short of apex' : ' · corta del ápice') : '') + (q.voids > 0.08 ? (en ? ' · possible voids' : ' · posibles huecos') : ''));
    if (pr.code === 'DEN-CAR' && q.reachesSurface != null) bits.push(q.reachesSurface ? (en ? 'reaches tooth surface' : 'llega a la superficie') : (en ? 'inside the tooth, no surface opening seen' : 'dentro del diente, sin abertura a la superficie'));
    return bits.join(' · ');
  }
  function refineProps(c, props) {
    if (!root.PX_CONTOUR || !props.length) return Promise.resolve(props);
    return PX.imageBitmap(c.id).then(function (bmp) {
      if (!bmp) return props;
      var W0 = c.width || bmp.width, sc = Math.min(1, 1400 / bmp.width), cw = Math.round(bmp.width * sc), ch = Math.round(bmp.height * sc);
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; var cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(bmp, 0, 0, cw, ch);
      var img = cx.getImageData(0, 0, cw, ch), scale = cw / W0, shaped = props.filter(function (p) { return p.box; });
      var out = root.PX_CONTOUR.refine(img, shaped, teethFor(c), scale);
      return out.map(function (pr) { var note = contourNote(pr); if (pr.contour && pr.contour.ok) pr.how = (pr.how || '') + ' · ' + (I.getLang() === 'en' ? 'outlined' : 'contorno') + (note ? ' · ' + note : ''); else if (note) pr.how = (pr.how || '') + ' · ' + note; return pr; });
    }).catch(function (e) { console.error(e); return props; });
  }
  /** Tooth outlines available for the automatic reading: the published reference, else the reader's own ANA-TTH polygons with a FDI number. */
  function teethFor(c) {
    if (c.ref && c.ref.teeth && c.ref.teeth.length) return c.ref.teeth.map(function (tt) { return { fdi: tt.fdi, poly: tt.poly }; });
    return state.annotations.filter(function (a) { return a.caseId === c.id && a.code === 'ANA-TTH' && a.fdi && a.shape && a.shape.points && a.shape.points.length >= 3 && (a.reader === state.ui.reader || a.reader === 'ADJ'); }).map(function (a) { return { fdi: a.fdi, poly: a.shape.points }; });
  }

  function panelReport(c) {
    var rep = root.PX_REPORT ? root.PX_REPORT.build(c, { reader: an.reportSource || null }) : null;
    if (!rep) return '<p class="small muted">' + esc(t('noData')) + '</p>';
    var srcSel = '<select data-action="report:source" style="width:auto"><option value=""' + (!an.reportSource ? ' selected' : '') + '>' + esc(t('reportAuto')) + '</option>' + ['ADJ', 'R1', 'R2'].map(function (r) { return '<option value="' + r + '"' + (an.reportSource === r ? ' selected' : '') + (PX.annotationsOf(c.id, r).length ? '' : ' disabled') + '>' + esc(PX.readerName(r)) + '</option>'; }).join('') + '</select>';
    return '<div class="banner small">' + PX.ICONS.info + '<div>' + esc(t('reportDraftNote')) + '</div></div>' +
      '<div class="row" style="margin:8px 0"><label class="small">' + esc(t('reportSource')) + ' ' + srcSel + '</label><button class="btn" data-action="report:copy">' + esc(t('copyText')) + '</button><button class="btn" data-action="report:print">' + esc(t('print')) + '</button></div>' +
      '<div class="report" id="report-view">' + rep.html + '</div>';
  }
  function panelCase(c) {
    var d = c.deid || {};
    var rows = [[t('colPseudonym'), c.pseudonym], [t('subjectId'), c.subjectId || '—'], [t('modality'), PX.optName(TX.MODALITIES, c.modality)], [t('site'), c.siteName || '—'], [t('province'), c.province || '—'], [t('device'), ((c.deviceMake || '') + ' ' + (c.deviceModel || '')).trim() || '—'], [t('year'), c.year || '—'], [t('ageBand'), c.ageBand || '—'], [t('sex'), PX.optName(TX.SEXES, c.sex)], [t('consent'), PX.optName(TX.CONSENT, c.consent)], [t('quality'), PX.optName(TX.QUALITY, c.quality)], [I.getLang() === 'en' ? 'Size' : 'Tamaño', (c.width || '?') + ' × ' + (c.height || '?') + ' px'], [t('calibration'), PX.calibrationLabel(c)], [t('notes'), c.notes || '—']];
    var deid = '<h4 style="margin-top:10px">' + esc(t('receiptTitle')) + '</h4><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>' + esc(d.source === 'dicom' ? 'DICOM' : d.source === 'synthetic' ? (I.getLang() === 'en' ? 'Synthetic phantom' : 'Fantoma sintético') : d.source === 'open-dataset' ? t('openData') + ' (JPEG)' : t('kindImage')) + (d.counts ? ': ' + esc(t('receiptCounts', { kept: d.counts.kept, derived: d.counts.derived, removed: d.counts.removed, priv: d.counts.privateRemoved })) : '') + '</li>' +
      '<li>' + esc(t('burnedInCheck')) + ': ' + esc(d.burnedInChecked ? t('yes') : t('no')) + (d.redactions ? ' · ' + esc(t('redactionsApplied', { n: d.redactions })) : '') + '</li>' + (d.burnedInDeclared ? '<li>BurnedInAnnotation = YES</li>' : '') + '</ul>';
    if (c.isOpenData) {
      rows.splice(1, 0, [t('openData'), (c.dataset || '') + ' · ' + (c.datasetRef || '') + ' · ' + (c.licence || '')]);
      rows = rows.map(function (r) { if (r[0] === t('ageBand') && !c.ageBand) return [r[0], t('adultNotStated')]; if ((r[0] === t('year') || r[0] === t('device') || r[0] === t('sex') || r[0] === t('province')) && (r[1] === '—')) return [r[0], t('notStated')]; return r; });
    }
    var refInfo = c.ref ? '<h4 style="margin-top:10px">' + esc(t('extRef')) + ' · ' + esc(c.ref.source || '') + '</h4><ul class="small" style="margin:4px 0 0;padding-left:18px"><li>' + esc(t('teethLabelled')) + ': ' + (c.ref.labelled || (c.ref.teeth || []).length) + ' / 32</li><li>' + esc(t('teethAbsent')) + ': ' + ((c.ref.absent || []).length ? '<span class="mono">' + esc(c.ref.absent.join(', ')) + '</span>' : '—') + '<div class="faint">' + esc(t('teethAbsentHelp')) + '</div></li><li class="faint">' + esc(t('fdiDerived')) + '</li></ul>' : '';
    var calBtns = PX.can('annotate') ? '<div class="row" style="margin-top:8px">' + (c.calibration ? '<button class="btn sm ghost" data-action="an:uncalibrate">' + esc(t('removeCalibration')) + '</button>' : '<span class="small muted">' + esc(t('calibrateHelp')) + '</span>') + '</div>' : '';
    return '<div class="table-wrap"><table class="table">' + rows.map(function (r) { return '<tr><th style="width:40%">' + esc(r[0]) + '</th><td>' + (r[1] && r[1].indexOf && r[1].indexOf('<span class="mono">') === 0 ? r[1] : esc(r[1])) + '</td></tr>'; }).join('') + '</table></div>' + calBtns + deid + refInfo +
      '<div class="row" style="margin-top:10px"><button class="btn" data-action="case:edit" data-arg="' + c.id + '">' + esc(t('editCase')) + '</button><button class="btn" data-action="sem:fromCase" data-arg="' + c.id + '">' + esc(t('navSemaforo')) + '</button>' + (PX.can('delete') ? '<button class="btn ghost danger" style="margin-left:auto" data-action="case:delete" data-arg="' + c.id + '">' + esc(t('delete')) + '</button>' : '') + '</div>';
  }
  function panelChecks(c) {
    var list = state.checklists.filter(function (x) { return x.caseId === c.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    if (!list.length) return '<p class="small muted">' + esc(t('noData')) + '</p><button class="btn" data-action="sem:fromCase" data-arg="' + c.id + '">' + esc(t('navSemaforo')) + '</button>';
    return '<div class="stack" style="gap:8px">' + list.map(function (ch) { return '<div class="finding" data-action="sem:openChecklist" data-arg="' + ch.id + '"><div><div class="name">FDI ' + ch.fdi + ' · ' + esc(TX.toothName(ch.fdi, I.getLang())) + '</div><div class="meta">' + esc(PX.fmtDate(ch.createdAt)) + (ch.by ? ' · ' + esc(ch.by) : '') + '</div></div><div class="acts">' + levelPill(ch.result.level) + '</div></div>'; }).join('') + '</div><button class="btn" style="margin-top:10px" data-action="sem:fromCase" data-arg="' + c.id + '">' + esc(t('navSemaforo')) + '</button>';
  }
  function levelPill(level) { var m = { green: ['ok', 'levelGreen'], amber: ['warn', 'levelAmber'], red: ['crit', 'levelRed'], na: ['na', 'levelNa'] }[level] || ['na', 'levelNa']; return '<span class="pill ' + m[0] + '">' + esc(t(m[1])) + '</span>'; }

  A['an:reader'] = function (arg) { state.ui.reader = arg; an.af = null; an.selectedId = null; an.proposals = null; PX.render(); };
  A['an:tool'] = function (arg) { an.tool = arg; if (an.viewer) { an.viewer.setTool(arg === 'measure' ? 'line' : arg); setToolButtons(arg); } var p = PX.byId('an-panel'); if (p && an.pendingCode) renderPanel(); };
  A['an:chip'] = function (arg) {
    an.pendingCode = arg || '';
    if (arg) {
      var shapes = TX.shapesFor(arg); var tool = SHAPE_TO_TOOL[shapes[0]] || 'box';
      if (an.tool === 'pan' || an.tool === 'measure' || TX.shapesFor(arg).indexOf(TOOL_TO_SHAPE[an.tool]) === -1) A['an:tool'](tool);
      if (an.af && !an.af.id) { an.af.code = arg; if (!TX.FINDING_BY_CODE[arg].tooth) an.af.fdi = null; }
    }
    renderPanel(); syncBoxes();
  };
  A['an:fit'] = function () { if (an.viewer) an.viewer.fit(); };
  A['an:invert'] = function () { toggleInvert(); };
  A['an:bright'] = function (arg, el) { an.bright = parseFloat(el.value); if (an.viewer) an.viewer.setWindow(an.bright, an.contrast); };
  A['an:contrast'] = function (arg, el) { an.contrast = parseFloat(el.value); if (an.viewer) an.viewer.setWindow(an.bright, an.contrast); };
  A['an:resetWin'] = function () { an.bright = 1; an.contrast = 1; if (an.viewer) an.viewer.resetWindow(); var b = PX.byId('tool-invert'); if (b) b.classList.remove('on'); PX.qsa('.viewer-tools input[type=range]').forEach(function (r) { r.value = 1; }); };
  A['an:others'] = function (arg, el) { state.ui.showOthers = !!el.checked; syncBoxes(); };
  A['an:labels'] = function (arg, el) { state.ui.labelMode = el.checked ? 'name' : 'code'; syncBoxes(); };
  A['an:ref'] = function (arg, el) { state.ui.showRef = !!el.checked; var lg = PX.byId('ref-legend'); if (lg) lg.hidden = !state.ui.showRef; syncBoxes(); };
  A['an:tab'] = function (arg) { an.tab = arg; renderPanel(); };
  A['an:dent'] = function (arg) { an.primary = (arg === 'prim'); renderPanel(); };
  A['an:fdi'] = function (arg) { if (!an.af) return; an.af.fdi = arg ? parseInt(arg, 10) : null; captureForm(); renderPanel(); syncBoxes(); };
  A['an:select'] = function (arg, el, ev) {
    if (ev && ev.target && ev.target.closest('[data-action="an:accept"],[data-action="an:calibrate"]')) return;
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; if (!a) return;
    if (a.reader === state.ui.reader && PX.can('annotate') && !TX.isMeasure(a.code)) { an.af = editable(a); an.selectedId = a.id; }
    else { an.af = null; an.selectedId = a.reader === state.ui.reader ? a.id : null; }
    renderPanel(); syncBoxes();
    if (an.viewer) an.viewer.select(a.reader === state.ui.reader ? a.id : 'o_' + a.id);
  };
  function captureForm() {
    if (!an.af) return;
    var code = PX.byId('af-code'); if (code) an.af.code = code.value;
    var conf = PX.qs('input[name=af-conf]:checked'); if (conf) an.af.confidence = conf.value;
    var note = PX.byId('af-note'); if (note) an.af.note = note.value;
  }
  A['an:save'] = function () {
    if (!an.af || !PX.can('annotate')) return;
    captureForm();
    var f = an.af, c = PX.caseById(state.currentCaseId);
    if (!f.code) { var s = PX.byId('af-code'); if (s) { s.focus(); s.style.borderColor = 'var(--crit)'; } return; }
    if (state.ui.reader === 'ADJ' && !PX.can('adjudicate')) { PX.toast(t('facultyOnly'), 'crit'); return; }
    var def = TX.FINDING_BY_CODE[f.code];
    var a = { id: f.id || PX.uid('f'), caseId: c.id, reader: state.ui.reader, readerName: state.settings.actor || '—', fdi: def.tooth || def.group === 'DEN' || def.group === 'SUR' ? (f.fdi || null) : null, code: f.code, confidence: f.confidence, box: f.box, shape: f.shape || null, note: (f.note || '').slice(0, 300), createdAt: Date.now() };
    if (def.sided) a.side = G.sideOf(shapePoints(a), c.width || 1);
    if (a.fdi) an.lastFdi = a.fdi;
    PX.saveAnnotation(a).then(function () { return PX.audit(f.id ? 'finding.edit' : 'finding.add', c.pseudonym, state.ui.reader + ' ' + a.code + (a.fdi ? ' ' + a.fdi : '') + (a.side ? ' ' + a.side : '') + ' ' + shapeType(a)); }).then(function () { an.af = null; an.selectedId = null; syncBoxes(); renderPanel(); PX.toast(t('saved')); });
  };
  A['an:cancel'] = function () { an.af = null; an.selectedId = null; syncBoxes(); renderPanel(); };
  A['an:delete'] = function (arg) {
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; if (!a || !PX.can('annotate')) return;
    if (a.reader !== state.ui.reader) return;
    PX.openModal('<header><h2>' + esc(t('delete')) + '</h2></header><div class="body"><p>' + esc(TX.isMeasure(a.code) ? t('measurement') : PX.findingName(a.code)) + (a.fdi ? ' · FDI ' + a.fdi : '') + '</p></div><footer><button class="btn" data-action="modal:close">' + esc(t('cancel')) + '</button><button class="btn danger" data-action="an:deleteConfirm" data-arg="' + a.id + '">' + esc(t('delete')) + '</button></footer>', { narrow: true });
  };
  A['an:deleteConfirm'] = function (arg) {
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; var c = PX.caseById(state.currentCaseId);
    PX.deleteAnnotation(arg).then(function () { return PX.audit('finding.delete', c ? c.pseudonym : '', a ? a.reader + ' ' + a.code : ''); }).then(function () { PX.closeModal(); an.af = null; an.selectedId = null; syncBoxes(); renderPanel(); });
  };
  A['an:accept'] = function (arg, el, ev) {
    if (ev) ev.stopPropagation();
    if (!PX.can('adjudicate')) return;
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; var c = PX.caseById(state.currentCaseId); if (!a || !c) return;
    var copy = { id: PX.uid('f'), caseId: c.id, reader: 'ADJ', readerName: state.settings.actor || '—', fdi: a.fdi, code: a.code, confidence: a.confidence, box: Object.assign({}, a.box), shape: a.shape ? JSON.parse(JSON.stringify(a.shape)) : null, side: a.side, note: a.note || '', createdAt: Date.now(), acceptedFrom: a.reader };
    PX.saveAnnotation(copy).then(function () { return PX.audit('finding.accept', c.pseudonym, a.reader + ' → ADJ ' + a.code + (a.fdi ? ' ' + a.fdi : '')); }).then(function () { syncBoxes(); renderPanel(); PX.toast(t('saved')); });
  };
  A['an:adjComplete'] = function (arg, el) {
    if (!PX.can('adjudicate')) return;
    var c = PX.caseById(state.currentCaseId); if (!c) return;
    c.adjudicationComplete = !!el.checked;
    PX.saveCase(c).then(function () { return PX.audit('case.adjudication', c.pseudonym, c.adjudicationComplete ? 'complete' : 'reopened'); }).then(function () { renderPanel(); });
  };
  // calibration from a measurement of known length
  A['an:calibrate'] = function (arg, el, ev) {
    if (ev) ev.stopPropagation();
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; var c = PX.caseById(state.currentCaseId); if (!a || !c) return;
    var px = lengthOf(a);
    PX.openModal('<header><h2>' + esc(t('calibrate')) + '</h2></header><div class="body"><p class="small muted">' + esc(t('calibrateHelp')) + '</p><p>' + esc(t('measuredPx', { px: Math.round(px) })) + '</p><div class="field"><label for="cal-mm">' + esc(t('realLengthMm')) + '</label><input id="cal-mm" type="number" min="0.1" step="0.1" placeholder="10.0"></div></div><footer><button class="btn" data-action="modal:close">' + esc(t('cancel')) + '</button><button class="btn primary" data-action="an:calibrateSave" data-arg="' + a.id + '">' + esc(t('save')) + '</button></footer>', { narrow: true });
    setTimeout(function () { var i = PX.byId('cal-mm'); if (i) i.focus(); }, 30);
  };
  A['an:calibrateSave'] = function (arg) {
    var a = state.annotations.filter(function (x) { return x.id === arg; })[0]; var c = PX.caseById(state.currentCaseId); if (!a || !c) return;
    var mm = parseFloat((PX.byId('cal-mm') || {}).value); var px = lengthOf(a);
    if (!isFinite(mm) || mm <= 0 || px <= 0) { PX.toast(t('requiredField'), 'crit'); return; }
    c.calibration = { mmPerPx: mm / px, source: 'manual', note: Math.round(px) + ' px = ' + mm + ' mm', by: state.settings.actor || '—', at: Date.now() };
    PX.saveCase(c).then(function () { return PX.audit('case.calibrate', c.pseudonym, c.calibration.note + ' (' + c.calibration.mmPerPx.toFixed(4) + ' mm/px)'); }).then(function () { PX.closeModal(); syncBoxes(); renderPanel(); updateHint(); PX.toast(t('saved')); });
  };
  A['an:uncalibrate'] = function () {
    var c = PX.caseById(state.currentCaseId); if (!c) return;
    delete c.calibration;
    PX.saveCase(c).then(function () { return PX.audit('case.calibrate', c.pseudonym, 'removed'); }).then(function () { syncBoxes(); renderPanel(); updateHint(); });
  };
  A['an:detect'] = function () {
    var c = PX.caseById(state.currentCaseId); if (!c || !root.PX_AUTO) return;
    an.detectBusy = true; renderPanel();
    PX.imageBitmap(c.id).then(function (bmp) {
      var res = bmp ? root.PX_AUTO.analyze(bmp, teethFor(c)) : { anatomy: [], findings: [] };
      var W = c.width || (bmp && bmp.width) || 1;
      an.proposals = res.anatomy.concat(res.findings).map(function (pr) {
        var def = TX.FINDING_BY_CODE[pr.code];
        if (def && def.sided && !pr.side) pr.side = G.sideOf(pr.shape.points, W);
        return pr;
      });
      an.detectBusy = false; an.focusProposal = null;
      return PX.audit('autoread.run', c.pseudonym, 'v' + root.PX_AUTO.VERSION + ' · ' + res.anatomy.length + ' anatomy · ' + res.findings.length + ' findings');
    }).then(function () { syncBoxes(); renderPanel(); }).catch(function (e) { console.error(e); an.detectBusy = false; renderPanel(); PX.toast(t('autoFailed'), 'crit'); });
  };
  A['model:url'] = function (arg, el) { state.settings.modelServer = el.value.trim(); PX.saveSettings(); };
  A['model:check'] = function () {
    var url = (state.settings.modelServer || 'http://127.0.0.1:8765').replace(/\/$/, '');
    fetch(url + '/health', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { an.modelStatus = { ok: !!j.ok, model: j.model || null }; })
      .catch(function () { an.modelStatus = { ok: false }; }).then(function () { renderPanel(); });
  };
  A['model:predict'] = function () {
    var c = PX.caseById(state.currentCaseId); var im = state.images[c && c.id]; if (!c || !im || !im.blob) return;
    var url = (state.settings.modelServer || 'http://127.0.0.1:8765').replace(/\/$/, '');
    an.modelBusy = true; renderPanel();
    fetch(url + '/predict?min_score=0.25', { method: 'POST', body: im.blob, headers: { 'Content-Type': im.blob.type || 'application/octet-stream' } }).then(function (r) { return r.json(); }).then(function (j) {
      return refineProps(c, ingestModelProposals(c, j)).then(function (props) {
        an.proposals = (an.proposals || []).concat(props); an.modelBusy = false; an.focusProposal = null;
        return PX.audit('model.run', c.pseudonym, ((j.model && j.model.name) || 'ONNX') + ' · server · ' + props.length + ' proposals · ' + (j.ms || '?') + ' ms');
      });
    }).then(function () { syncBoxes(); renderPanel(); }).catch(function (e) { console.error(e); an.modelBusy = false; an.modelStatus = { ok: false }; renderPanel(); PX.toast(t('modelFailed'), 'crit'); });
  };
  A['model:base'] = function (arg, el) { state.settings.modelBase = el.value.trim(); PX.saveSettings(); };
  A['model:load'] = function () {
    if (!root.PX_MODEL) return;
    an.modelLoading = '…'; an.modelError = null; renderPanel();
    root.PX_MODEL.load(state.settings.modelBase || 'models/', function (d, n) { an.modelLoading = d + '/' + n; renderPanel(); }).then(function (card) {
      an.modelLoading = null; renderPanel(); PX.toast(t('modelLoaded', { name: card.name || 'ONNX' }));
    }).catch(function (e) { console.error(e); an.modelLoading = null; an.modelError = t('modelLoadFailed'); renderPanel(); });
  };
  A['model:predictLocal'] = function () {
    var c = PX.caseById(state.currentCaseId); if (!c || !root.PX_MODEL) return;
    if (!root.PX_MODEL.ready()) { an.modelLoading = '…'; an.modelError = null; renderPanel(); return root.PX_MODEL.load(state.settings.modelBase || 'models/', function (d, n) { an.modelLoading = d + '/' + n; renderPanel(); }).then(function () { an.modelLoading = null; A['model:predictLocal'](); }).catch(function (e) { console.error(e); an.modelLoading = null; an.modelError = t('modelLoadFailed'); renderPanel(); }); }
    an.modelBusy = true; renderPanel();
    PX.imageBitmap(c.id).then(function (bmp) { if (!bmp) throw new Error('no image'); return root.PX_MODEL.predict(bmp, { minScore: 0.25 }); }).then(function (j) {
      return refineProps(c, ingestModelProposals(c, j)).then(function (props) {
        an.proposals = (an.proposals || []).concat(props); an.modelBusy = false; an.focusProposal = null;
        return PX.audit('model.run', c.pseudonym, ((j.model && j.model.name) || 'ONNX') + ' · browser · ' + props.length + ' proposals · ' + j.ms + ' ms');
      });
    }).then(function () { syncBoxes(); renderPanel(); }).catch(function (e) { console.error(e); an.modelBusy = false; renderPanel(); PX.toast(t('modelFailed'), 'crit'); });
  };
  A['an:detectClose'] = function () { an.proposals = null; an.focusProposal = null; syncBoxes(); renderPanel(); };
  A['an:proposalFocus'] = function (arg, el, ev) {
    if (ev && ev.target && ev.target.closest('button')) return;
    var pr = an.proposals && an.proposals[parseInt(arg, 10)]; if (!pr || !an.viewer) return;
    an.focusProposal = parseInt(arg, 10); syncBoxes();
    if (an.viewer.centerOn) an.viewer.centerOn(pr.box);
  };
  function proposalIndices(arg) {
    if (arg === 'all') return an.proposals.map(function (x, i) { return i; });
    if (String(arg).indexOf('code:') === 0) { var code = String(arg).slice(5); return an.proposals.map(function (x, i) { return x.code === code ? i : -1; }).filter(function (i) { return i >= 0; }); }
    return [parseInt(arg, 10)];
  }
  A['an:proposalReject'] = function (arg) {
    if (!an.proposals) return; var idx = proposalIndices(arg);
    an.proposals = an.proposals.filter(function (x, i) { return idx.indexOf(i) === -1; }); an.focusProposal = null; syncBoxes(); renderPanel();
  };
  A['an:proposalAccept'] = function (arg) {
    var c = PX.caseById(state.currentCaseId); if (!c || !an.proposals || !PX.can('annotate')) return;
    if (state.ui.reader === 'ADJ' && !PX.can('adjudicate')) { PX.toast(t('facultyOnly'), 'crit'); return; }
    var idx = proposalIndices(arg);
    var recs = idx.map(function (i) {
      var pr = an.proposals[i];
      return { id: PX.uid('f'), caseId: c.id, reader: state.ui.reader, readerName: state.settings.actor || '—', fdi: pr.fdi || null, side: pr.side || null, code: pr.code, confidence: 'probable', box: pr.box, shape: pr.shape, note: t('autoAcceptedNote', { v: root.PX_AUTO.VERSION, how: pr.how || '' }), proposedBy: 'autoread-' + root.PX_AUTO.VERSION, createdAt: Date.now() };
    });
    Promise.all(recs.map(PX.saveAnnotation)).then(function () { return PX.audit('autoread.accept', c.pseudonym, recs.length + ' proposals → ' + state.ui.reader); }).then(function () {
      an.proposals = an.proposals.filter(function (x, i) { return idx.indexOf(i) === -1; }); an.focusProposal = null;
      var last = recs.filter(function (r) { return r.fdi; }).pop(); if (last) an.lastFdi = last.fdi;
      syncBoxes(); renderPanel(); PX.toast(t('saved'));
    });
  };
  A['report:source'] = function (arg, el) { an.reportSource = el.value || null; renderPanel(); };
  A['report:copy'] = function () { var rep = root.PX_REPORT ? root.PX_REPORT.build(PX.caseById(state.currentCaseId), { reader: an.reportSource || null }) : null; if (rep) PX.copyText(rep.text); };
  A['report:print'] = function () {
    var rep = root.PX_REPORT ? root.PX_REPORT.build(PX.caseById(state.currentCaseId), { reader: an.reportSource || null }) : null; if (!rep) return;
    var area = PX.byId('print-area'); if (!area) { area = document.createElement('div'); area.id = 'print-area'; document.body.appendChild(area); }
    area.innerHTML = '<div class="report print">' + rep.html + '</div>';
    document.body.classList.add('print-report');
    var done = function () { document.body.classList.remove('print-report'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); }
  };

  // ================= SEMÁFORO =================
  function emptyInputs() { return { fdi: null, imageQuality: 'diagnostic', ianRelation: null, roodSigns: [], sinusRelation: null, winter: null, pellDepth: null, pellRamus: null, roots: [], bone: 'normal', pathology: 'none', clinical: [] }; }
  var sem = { caseId: '', inputs: emptyInputs(), showRules: false, primary: false, geometry: {} };
  state.sem = sem;

  /** Geometry available for a tooth in a case: drawn anatomy (ADJ first, then R1, R2) plus the external reference teeth. */
  function geometryFor(c, fdi) {
    if (!c || !fdi || !G) return null;
    var info = RUB.toothInfo(fdi); if (!info || !info.permanent) return null;
    var side = G.fdiSide(fdi), upper = info.upper;
    var readers = ['ADJ', 'R1', 'R2'];
    function find(code, wantFdi) {
      for (var i = 0; i < readers.length; i++) {
        var hit = PX.annotationsOf(c.id, readers[i]).filter(function (a) { return a.code === code && (wantFdi ? a.fdi === wantFdi : (!a.side || a.side === side || code === 'ANA-OCC')); })[0];
        if (hit) return { points: shapePoints(hit), reader: readers[i], source: 'drawn' };
      }
      return null;
    }
    function tooth(n) {
      var d = find('ANA-TTH', n); if (d) return d;
      var ref = c.ref && c.ref.teeth ? c.ref.teeth.filter(function (tt) { return tt.fdi === n; })[0] : null;
      return ref && ref.poly && ref.poly.length >= 3 ? { points: ref.poly, reader: 'REF', source: 'reference' } : null;
    }
    var q = Math.floor(fdi / 10), pos = fdi % 10;
    var m3 = tooth(fdi), m2 = pos === 8 ? tooth(q * 10 + 7) : null;
    var canal = !upper ? find('ANA-IAC') : null, sinus = upper ? find('ANA-SIN') : null;
    var occ = find('ANA-OCC'), cej = find('ANA-CEJ'), ram = !upper ? find('ANA-RAM') : null;
    var out = { side: side, upper: upper, have: { m3: !!m3, m2: !!m2, canal: !!canal, sinus: !!sinus, occ: !!occ, cej: !!cej, ramus: !!ram }, sources: {}, suggestions: [] };
    ['m3', 'm2', 'canal', 'sinus', 'occ', 'cej'].forEach(function (k) { var v = { m3: m3, m2: m2, canal: canal, sinus: sinus, occ: occ, cej: cej }[k]; if (v) out.sources[k] = v.source === 'reference' ? 'REF' : v.reader; });
    if (ram) out.sources.ramus = ram.reader;
    var mesialDir = side === 'R' ? 1 : -1;
    if (m3 && m2 && pos === 8) {
      var w = G.winterAngle(m3.points, m2.points, upper, mesialDir);
      out.suggestions.push({ key: 'winter', value: w.cls, text: t('g_winter', { a: w.angle, cls: t('w_' + (w.cls === 'other' ? 'other' : w.cls)) }), detail: t('g_winterRule') });
    }
    if (m3 && occ && cej && pos === 8) {
      var d = G.pellDepth(m3.points, occ.points, cej.points, upper);
      out.suggestions.push({ key: 'pellDepth', value: d.depth, text: t('g_depth', { d: d.depth }), detail: t('g_depthRule') });
    }
    if (m3 && ram && pos === 8 && !upper) {
      var r = G.pellRamus(m3.points, ram.points, side === 'R' ? -1 : 1, upper);
      out.suggestions.push({ key: 'pellRamus', value: r.ramus, text: t('g_ramus', { cls: r.ramus, pct: Math.round(r.covered * 100) }), detail: t('g_ramusRule') });
    }
    if (m3 && canal && !upper) {
      var cr = G.canalRelation(m3.points, canal.points, upper);
      out.suggestions.push({ key: 'ianRelation', value: cr.overlap ? 'superimposed' : 'separate', text: cr.overlap ? t('g_canalOverlap') : t('g_canalSeparate', { d: PX.fmtLength(cr.distancePx, c) }), detail: t('g_canalRule') });
    }
    if (m3 && sinus && upper) {
      var sr = G.sinusRelation(m3.points, sinus.points);
      out.suggestions.push({ key: 'sinusRelation', value: sr.overlap ? 'projecting' : 'separate', text: sr.overlap ? t('g_sinusOverlap') : t('g_sinusSeparate', { d: PX.fmtLength(sr.distancePx, c) }), detail: t('g_sinusRule') });
    }
    return out;
  }
  PX.geometryFor = geometryFor;

  function geometryCard(c, fdi, tooth) {
    if (!c) return '<div class="card"><h3>' + esc(t('geomTitle')) + '</h3><p class="small muted">' + esc(t('geomNeedsCase')) + '</p></div>';
    var g = geometryFor(c, fdi);
    if (!g) return '';
    var need = [];
    if (tooth.thirdMolar) { if (!g.have.m3) need.push(t('g_needM3')); if (!g.have.m2) need.push(t('g_needM2')); if (!g.have.occ) need.push(t('g_needOcc')); if (!g.have.cej) need.push(t('g_needCej')); if (tooth.lower && !g.have.ramus) need.push(t('g_needRamus')); }
    if (tooth.ianRelevant && !g.have.canal) need.push(t('g_needCanal'));
    if (tooth.sinusRelevant && !g.have.sinus) need.push(t('g_needSinus'));
    var html = '<div class="card"><h3>' + esc(t('geomTitle')) + '</h3><p class="small muted">' + esc(t('geomLead')) + '</p>';
    if (g.suggestions.length) {
      html += '<div class="stack" style="gap:6px;margin-top:6px">' + g.suggestions.map(function (s) {
        var applied = sem.inputs[s.key] === s.value;
        return '<div class="rule"><span class="lv ' + (applied ? 'lv-green' : 'lv-na') + '"></span><div style="flex:1"><div>' + esc(s.text) + '</div><div class="small faint">' + esc(s.detail) + '</div></div>' + (applied ? '<span class="pill ok">' + esc(t('applied')) + '</span>' : '<button class="btn sm" data-action="sem:applyGeom" data-arg="' + s.key + '">' + esc(t('apply')) + '</button>') + '</div>';
      }).join('') + '</div>' + (g.suggestions.some(function (s) { return sem.inputs[s.key] !== s.value; }) ? '<div class="row" style="margin-top:8px"><button class="btn" data-action="sem:applyGeom" data-arg="all">' + esc(t('applyAll')) + '</button></div>' : '');
      var src = Object.keys(g.sources).map(function (k) { return k + ': ' + (g.sources[k] === 'REF' ? t('extRef') : PX.readerName(g.sources[k])); }).join(' · ');
      html += '<p class="small faint" style="margin-top:6px">' + esc(t('geomSources')) + ' ' + esc(src) + '</p>';
    }
    if (need.length) html += '<p class="small muted" style="margin-top:6px">' + esc(t('geomMissing')) + '</p><ul class="small muted" style="margin:4px 0 0;padding-left:18px">' + need.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><div class="row" style="margin-top:6px"><button class="btn sm" data-action="sem:drawAnatomy" data-arg="' + c.id + '">' + esc(t('drawAnatomy')) + '</button></div>';
    return html + '</div>';
  }

  PX.views.semaforo = function () {
    var inp = sem.inputs;
    var tooth = inp.fdi ? RUB.toothInfo(inp.fdi) : null;
    var res = RUB.evaluate(inp);
    var c = sem.caseId ? PX.caseById(sem.caseId) : null;
    var caseOpts = '<option value="">' + esc(t('noCase')) + '</option>' + state.cases.map(function (x) { return '<option value="' + x.id + '"' + (sem.caseId === x.id ? ' selected' : '') + '>' + esc(x.pseudonym + ' · ' + PX.optName(TX.MODALITIES, x.modality)) + '</option>'; }).join('');
    var left = '<div class="stack">' +
      '<p class="muted" style="max-width:70ch">' + esc(t('semLead')) + '</p>' +
      '<div class="form-grid"><div class="field"><label for="sem-case">' + esc(t('linkCase')) + '</label><select id="sem-case" data-action="sem:case">' + caseOpts + '</select></div>' +
      '<div class="field"><label>' + esc(t('imageQuality')) + '</label><div class="opts inline">' + radio('imageQuality', TX.QUALITY.map(function (q) { return [q.id, pick(q.name)]; }), inp.imageQuality) + '</div></div></div>' +
      '<fieldset><legend>' + esc(t('toothFdi')) + (inp.fdi ? ' — <span class="mono">' + inp.fdi + '</span> ' + esc(TX.toothName(inp.fdi, I.getLang())) : '') + '</legend>' +
      '<div class="row" style="margin-bottom:6px"><div class="seg"><button data-action="sem:dent" data-arg="perm" class="' + (!sem.primary ? 'on' : '') + '">' + esc(t('permanent')) + '</button><button data-action="sem:dent" data-arg="prim" class="' + (sem.primary ? 'on' : '') + '">' + esc(t('primaryDent')) + '</button></div>' + (!inp.fdi ? '<span class="small muted">' + esc(t('chooseTooth')) + '</span>' : '') + '</div>' +
      '<div data-odont="sem">' + PX.odontogram({ selected: inp.fdi, primary: sem.primary }) + '</div></fieldset>';
    if (tooth && (tooth.thirdMolar || tooth.ianRelevant || tooth.sinusRelevant)) left += geometryCard(c, inp.fdi, tooth);
    if (tooth && tooth.ianRelevant) {
      left += '<fieldset><legend>' + esc(t('ianRelation')) + '</legend><div class="opts">' + radio('ianRelation', [['separate', t('ianSeparate')], ['contact', t('ianContact')], ['superimposed', t('ianSuperimposed')], ['indeterminate', t('ianIndeterminate')]], inp.ianRelation) + '</div></fieldset>' +
        '<fieldset><legend>' + esc(t('roodSigns')) + '</legend><div class="opts">' + checks('roodSigns', RUB.ROOD_SIGNS.map(function (s) { return [s, t('rs_' + s)]; }), inp.roodSigns) + '</div></fieldset>';
    }
    if (tooth && tooth.sinusRelevant) {
      left += '<fieldset><legend>' + esc(t('sinusRelation')) + '</legend><div class="opts">' + radio('sinusRelation', [['separate', t('sinSeparate')], ['close', t('sinClose')], ['projecting', t('sinProjecting')], ['indeterminate', t('sinIndeterminate')]], inp.sinusRelation) + '</div></fieldset>';
    }
    if (tooth && tooth.thirdMolar) {
      left += '<fieldset><legend>' + esc(t('thirdMolarClass')) + '</legend><div class="grid-2" style="gap:10px"><div><div class="small muted" style="margin-bottom:4px">' + esc(t('winter')) + '</div><div class="opts">' + radio('winter', [['vertical', t('w_vertical')], ['mesioangular', t('w_mesioangular')], ['horizontal', t('w_horizontal')], ['distoangular', t('w_distoangular')], ['other', t('w_other')]], inp.winter) + '</div></div>' +
        '<div><div class="small muted" style="margin-bottom:4px">' + esc(t('pellDepth')) + '</div><div class="opts">' + radio('pellDepth', [['A', t('pd_A')], ['B', t('pd_B')], ['C', t('pd_C')]], inp.pellDepth) + '</div>' +
        (tooth.lower ? '<div class="small muted" style="margin:8px 0 4px">' + esc(t('pellRamus')) + '</div><div class="opts">' + radio('pellRamus', [['I', t('pr_I')], ['II', t('pr_II')], ['III', t('pr_III')]], inp.pellRamus) + '</div>' : '') + '</div></div></fieldset>';
    }
    if (tooth) {
      left += '<div class="grid-2" style="gap:10px"><fieldset><legend>' + esc(t('roots')) + '</legend><div class="opts">' + checks('roots', [['dilacerated', t('r_dilacerated')], ['hypercementosis', t('r_hypercementosis')], ['bulbous', t('r_bulbous')], ['fused', t('r_fused')], ['incomplete', t('r_incomplete')], ['ankylosisSuspected', t('r_ankylosisSuspected')]], inp.roots) + '</div></fieldset>' +
        '<fieldset><legend>' + esc(t('bone')) + '</legend><div class="opts">' + radio('bone', [['normal', t('b_normal')], ['dense', t('b_dense')], ['sparse', t('b_sparse')]], inp.bone) + '</div></fieldset></div>' +
        '<div class="grid-2" style="gap:10px"><fieldset><legend>' + esc(t('pathology')) + '</legend><div class="opts">' + radio('pathology', [['none', t('p_none')], ['pericoronal', t('p_pericoronal')], ['radiolucency', t('p_radiolucency')], ['radiopacity', t('p_radiopacity')], ['illDefined', t('p_illDefined')], ['periapical', t('p_periapical')]], inp.pathology) + '</div></fieldset>' +
        '<fieldset><legend>' + esc(t('clinical')) + '</legend><div class="opts">' + checks('clinical', [['antiresorptive', t('c_antiresorptive')], ['radiotherapy', t('c_radiotherapy')], ['anticoagulant', t('c_anticoagulant')], ['diabetesUncontrolled', t('c_diabetesUncontrolled')], ['age25plus', t('c_age25plus')], ['limitedOpening', t('c_limitedOpening')]], inp.clinical) + '</div></fieldset></div>';
    }
    left += '</div>';
    var right = '<div class="stack">' + resultCard(res, !!tooth) + '</div>';
    return '<div class="sem-grid"><div>' + left + '</div><div>' + right + '</div></div>';
  };
  function radio(name, opts, value) { return opts.map(function (o) { return '<label class="check"><input type="radio" name="sem-' + name + '" value="' + attr(o[0]) + '" data-action="sem:set" data-arg="' + name + '"' + (value === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join(''); }
  function checks(name, opts, values) { return opts.map(function (o) { return '<label class="check"><input type="checkbox" value="' + attr(o[0]) + '" data-action="sem:toggle" data-arg="' + name + '"' + (values.indexOf(o[0]) !== -1 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join(''); }

  function resultCard(res, hasTooth) {
    var lvlName = { green: t('levelGreen'), amber: t('levelAmber'), red: t('levelRed'), na: t('levelNa') }[res.level];
    var html = '<div class="sem-level ' + res.level + '" role="status"><div class="dot" aria-hidden="true"></div><div><div class="big">' + esc(lvlName) + '</div><div>' + esc(pick(res.levelText)) + '</div></div></div>';
    if (!hasTooth) html += '<div class="banner small">' + PX.ICONS.info + '<div>' + esc(t('chooseTooth')) + '</div></div>';
    html += '<div class="card"><h3>' + esc(t('rulesFired')) + ' <span class="muted">(' + res.fired.length + ')</span></h3>' +
      (res.fired.length ? res.fired.map(function (f) { return '<div class="rule"><span class="lv lv-' + f.level + '" aria-hidden="true"></span><span class="id">' + f.id + '</span><div>' + esc(pick(f.text)) + '</div></div>'; }).join('') : '<p class="small muted">' + esc(t('noRulesFired')) + '</p>') + '</div>';
    if (res.actions.length) html += '<div class="card"><h3>' + esc(t('suggestedActions')) + '</h3><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">' + res.actions.map(function (a) { return '<li>' + esc(pick(a.text)) + '</li>'; }).join('') + '</ul></div>';
    html += '<div class="card"><h3>' + esc(t('pedersonTitle')) + '</h3>';
    if (res.pederson) {
      var cls = { minimal: 'pedersonMinimal', moderate: 'pedersonModerate', veryDifficult: 'pedersonVery' }[res.pederson.cls];
      html += '<div class="row"><div class="kpi" style="min-width:90px"><div class="v">' + res.pederson.score + '</div><div class="l">/ 10</div></div><div><div>' + esc(t(cls)) + '</div><div class="small muted">Winter ' + res.pederson.parts.winter + ' + ' + (I.getLang() === 'en' ? 'depth' : 'profundidad') + ' ' + res.pederson.parts.depth + ' + ' + (I.getLang() === 'en' ? 'ramus' : 'rama') + ' ' + res.pederson.parts.ramus + '</div></div></div>';
    } else html += '<p class="small muted">' + esc(t('pedersonNeeds')) + '</p>';
    html += '</div>';
    html += '<div class="row"><button class="btn primary" data-action="sem:save"' + (hasTooth ? '' : ' disabled') + '>' + esc(t('saveChecklist')) + '</button><button class="btn ghost" data-action="sem:rules">' + esc(t('seeRules')) + '</button></div>';
    if (sem.showRules) {
      html += '<div class="card"><h3>' + esc(t('seeRules')) + ' <span class="muted mono small">v' + RUB.VERSION + '</span></h3>' + RUB.RULES.map(function (r) { return '<div class="rule"><span class="lv lv-' + r.level + '"></span><span class="id">' + r.id + '</span><div>' + esc(pick(r.text)) + '</div></div>'; }).join('') + '</div>';
    }
    html += '<p class="small faint">' + esc(pick(res.disclaimer)) + '</p>';
    return html;
  }
  A['sem:set'] = function (arg, el) { sem.inputs[arg] = el.value; if (arg === 'fdi') sem.inputs.fdi = parseInt(el.value, 10); delete sem.geometry[arg]; PX.render(); };
  A['sem:toggle'] = function (arg, el) { var list = sem.inputs[arg] || []; if (el.checked) { if (list.indexOf(el.value) === -1) list.push(el.value); } else { list = list.filter(function (x) { return x !== el.value; }); } sem.inputs[arg] = list; PX.render(); };
  A['sem:case'] = function (arg, el) { sem.caseId = el.value; PX.render(); };
  A['sem:dent'] = function (arg) { sem.primary = (arg === 'prim'); PX.render(); };
  A['sem:fdi'] = function (arg) { var f = parseInt(arg, 10); if (sem.inputs.fdi !== f) { sem.inputs = Object.assign(emptyInputs(), { fdi: f, imageQuality: sem.inputs.imageQuality }); sem.geometry = {}; } PX.render(); };
  A['sem:rules'] = function () { sem.showRules = !sem.showRules; PX.render(); };
  A['sem:fromCase'] = function (arg) { sem.caseId = arg; PX.go('semaforo'); };
  A['sem:drawAnatomy'] = function (arg) { state.currentCaseId = arg; an.tab = 'findings'; an.pendingCode = 'ANA-TTH'; an.tool = 'polygon'; PX.go('anotar'); };
  A['sem:applyGeom'] = function (arg) {
    var c = sem.caseId ? PX.caseById(sem.caseId) : null; var g = geometryFor(c, sem.inputs.fdi); if (!g) return;
    g.suggestions.forEach(function (s) { if (arg === 'all' || s.key === arg) { sem.inputs[s.key] = s.value; sem.geometry[s.key] = { value: s.value, text: s.text, sources: g.sources }; } });
    PX.render();
  };
  A['sem:openChecklist'] = function (arg) { var ch = state.checklists.filter(function (x) { return x.id === arg; })[0]; if (!ch) return; sem.caseId = ch.caseId || ''; sem.inputs = Object.assign(emptyInputs(), JSON.parse(JSON.stringify(ch.inputs))); sem.geometry = ch.geometry ? JSON.parse(JSON.stringify(ch.geometry)) : {}; PX.go('semaforo'); };
  A['sem:save'] = function () {
    if (!sem.inputs.fdi) return;
    var res = RUB.evaluate(sem.inputs);
    var c = sem.caseId ? PX.caseById(sem.caseId) : null;
    var ch = { id: PX.uid('k'), caseId: c ? c.id : null, fdi: sem.inputs.fdi, inputs: JSON.parse(JSON.stringify(sem.inputs)), geometry: JSON.parse(JSON.stringify(sem.geometry || {})), result: { level: res.level, fired: res.fired.map(function (f) { return f.id; }), pederson: res.pederson, version: res.version }, createdAt: Date.now(), by: state.settings.actor || '—' };
    PX.saveChecklist(ch).then(function () { return PX.audit('checklist.save', c ? c.pseudonym : '—', 'FDI ' + ch.fdi + ' ' + res.level + (Object.keys(ch.geometry).length ? ' (geometry: ' + Object.keys(ch.geometry).join(',') + ')' : '')); }).then(function () { PX.toast(t('checklistSaved')); });
  };

  // odontogram clicks (both contexts)
  A['odont:click'] = function (arg, el) {
    var wrap = el.closest('[data-odont]'); if (!wrap) return;
    var fdi = el.getAttribute('data-fdi');
    if (wrap.getAttribute('data-odont') === 'sem') A['sem:fdi'](fdi);
    else if (wrap.getAttribute('data-odont') === 'af') A['an:fdi'](fdi);
  };
})(typeof window !== 'undefined' ? window : globalThis);
