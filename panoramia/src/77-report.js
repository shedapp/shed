/* PanoramIA — structured report draft generated from the annotations of a case.
   Follows the layout used by Dominican oral-radiology reports: study data, technique, numbered findings with measurements,
   a "Piezas | Hallazgos" table (absent teeth first), traffic-light summaries, diagnostic impression, final note.
   It is a DRAFT for the specialist: every sentence derives from a saved annotation, checklist or measurement. */
(function (root) {
  'use strict';
  var PX = root.PX, I = root.PX_I18N, TX = root.PX_TAXONOMY, RUB = root.PX_RUBRIC, G = root.PX_GEOM;
  var esc = PX.esc, pick = PX.pick, t = PX.t, state = PX.state;

  // Clinical phrasing per code [es, en]; {size} is replaced by the measured size when the shape allows it.
  var PHRASES = {
    'DEN-CAR': ['Imagen radiolúcida coronal compatible con caries', 'Coronal radiolucency consistent with caries'],
    'DEN-DCAR': ['Radiolucidez coronal profunda en relación con la cámara pulpar, compatible con caries profunda', 'Deep coronal radiolucency in relation to the pulp chamber, consistent with deep caries'],
    'DEN-PAR': ['Imagen radiolúcida periapical{size}, con pérdida de la lámina dura', 'Periapical radiolucency{size}, with loss of the lamina dura'],
    'DEN-PAO': ['Aumento de la densidad ósea periapical{size}, sugerente de osteítis condensante', 'Increased periapical bone density{size}, suggestive of condensing osteitis'],
    'DEN-PBL': ['Pérdida ósea periodontal', 'Periodontal bone loss'],
    'DEN-PDL': ['Ensanchamiento del espacio del ligamento periodontal', 'Widening of the periodontal ligament space'],
    'DEN-RES': ['Pérdida de estructura radicular sugerente de reabsorción', 'Loss of root structure suggestive of resorption'],
    'DEN-ROOT': ['Resto radicular', 'Retained root fragment'],
    'DEN-IMP': ['Diente retenido', 'Retained tooth'],
    'DEN-SUP': ['Diente supernumerario', 'Supernumerary tooth'],
    'DEN-MIS': ['Ausente', 'Absent'],
    'DEN-RCT': ['Conducto radicular obturado con material endodóntico', 'Root canal filled with endodontic material'],
    'DEN-POST': ['Poste intrarradicular', 'Intraradicular post'],
    'DEN-FIL': ['Obturación coronal', 'Coronal filling'],
    'DEN-CRN': ['Corona protésica', 'Prosthetic crown'],
    'DEN-BRG': ['Pilar o póntico de prótesis fija', 'Abutment or pontic of a fixed prosthesis'],
    'DEN-RST': ['Restauración radiopaca (obturación o corona)', 'Radiopaque restoration (filling or crown)'],
    'DEN-IMPL': ['Implante colocado en la zona', 'Implant placed in the area'],
    'DEN-CALC': ['Cálculo', 'Calculus'],
    'DEN-FRX': ['Línea radiolúcida compatible con fractura', 'Radiolucent line consistent with fracture'],
    'DEN-RLU': ['Radiolucidez anormal no clasificada', 'Unclassified abnormal radiolucency'],
    'DEN-ROP': ['Radiopacidad anormal no clasificada', 'Unclassified abnormal radiopacity']
  };
  var ORDER = ['DEN-MIS', 'DEN-IMP', 'DEN-IMPL', 'DEN-CRN', 'DEN-BRG', 'DEN-FIL', 'DEN-RST', 'DEN-POST', 'DEN-RCT', 'DEN-CAR', 'DEN-DCAR', 'DEN-CALC', 'DEN-PBL', 'DEN-PDL', 'DEN-RES', 'DEN-FRX', 'DEN-PAR', 'DEN-PAO', 'DEN-RLU', 'DEN-ROP'];

  function en() { return I.getLang() === 'en'; }
  function L(es, e) { return en() ? e : es; }
  function sizeOf(a, c) {
    if (!a.box || !c) return '';
    var w = PX.fmtLength(a.box.w, c), h = PX.fmtLength(a.box.h, c);
    return L(' que mide aproximadamente ' + w + ' en sentido mesiodistal por ' + h + ' en sentido cefalocaudal', ' measuring approximately ' + w + ' mesiodistally by ' + h + ' cephalocaudally');
  }
  function region(a, c) {
    var pts = a.shape && a.shape.points ? a.shape.points : [[a.box.x + a.box.w / 2, a.box.y + a.box.h / 2]];
    var cx = 0, cy = 0; pts.forEach(function (p) { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    var side = cx < (c.width || 1) / 2 ? L('derecho', 'right') : L('izquierdo', 'left');
    var ant = Math.abs(cx - (c.width || 1) / 2) < (c.width || 1) * 0.12 ? L('anterior', 'anterior') : L('posterior', 'posterior');
    var vert = cy < (c.height || 1) / 2 ? L('superior', 'upper') : L('inferior', 'lower');
    return L('sector ' + ant + '-' + vert + ' ' + side, side + ' ' + ant + ' ' + vert + ' sector');
  }
  function readersUsed(c) {
    var out = [];
    ['R1', 'R2', 'ADJ'].forEach(function (r) { var list = PX.annotationsOf(c.id, r); if (list.length) { var names = {}; list.forEach(function (a) { if (a.readerName && a.readerName !== '—') names[a.readerName] = 1; }); out.push(PX.readerName(r) + (Object.keys(names).length ? ' (' + Object.keys(names).join(', ') + ')' : '')); } });
    return out;
  }
  /** Picks the reference set: adjudicated findings if any, otherwise the most complete reader. */
  function sourceReader(c) {
    var adj = PX.annotationsOf(c.id, 'ADJ'); if (adj.length) return 'ADJ';
    var r1 = PX.annotationsOf(c.id, 'R1'), r2 = PX.annotationsOf(c.id, 'R2');
    if (!r1.length && !r2.length) return null;
    return r2.length > r1.length ? 'R2' : 'R1';
  }
  function thirdMolarLines(c, ch) {
    var inp = ch.inputs, res = ch.result, lines = [];
    var info = RUB.toothInfo(ch.fdi);
    if (inp.winter) lines.push(L('posición ' + t('w_' + inp.winter).toLowerCase() + ' (Winter)', t('w_' + inp.winter).toLowerCase() + ' position (Winter)'));
    if (inp.pellDepth) lines.push(L('profundidad ' + inp.pellDepth + ' de Pell y Gregory', 'Pell and Gregory depth ' + inp.pellDepth));
    if (inp.pellRamus) lines.push(L('clase ' + inp.pellRamus + ' respecto a la rama', 'class ' + inp.pellRamus + ' relative to the ramus'));
    if (inp.ianRelation) lines.push({ separate: L('conducto dentario inferior claramente separado de las raíces', 'inferior alveolar canal clearly separate from the roots'), contact: L('raíces en contacto con el conducto dentario inferior', 'roots in contact with the inferior alveolar canal'), superimposed: L('superposición radiográfica de las raíces con el conducto dentario inferior', 'radiographic superimposition of the roots and the inferior alveolar canal'), indeterminate: L('relación con el conducto no valorable en esta proyección', 'relation to the canal not assessable in this projection') }[inp.ianRelation]);
    if (inp.roodSigns && inp.roodSigns.length) lines.push(L('signos de Rood y Shehab: ', 'Rood and Shehab signs: ') + inp.roodSigns.map(function (s) { return t('rs_' + s).toLowerCase(); }).join(', '));
    if (inp.sinusRelation) lines.push({ separate: L('separación ósea clara del piso del seno maxilar', 'clear bony separation from the maxillary sinus floor'), close: L('raíces próximas al piso del seno maxilar', 'roots close to the maxillary sinus floor'), projecting: L('raíces proyectadas dentro del seno maxilar: íntima relación con el piso sinusal', 'roots projecting into the maxillary sinus: intimate relation with the sinus floor'), indeterminate: L('relación con el seno no valorable', 'relation to the sinus not assessable') }[inp.sinusRelation]);
    if (ch.geometry && Object.keys(ch.geometry).length) lines.push(L('(valores sugeridos a partir de las estructuras delimitadas: ' + Object.keys(ch.geometry).join(', ') + ')', '(values suggested from the outlined structures: ' + Object.keys(ch.geometry).join(', ') + ')'));
    var lvl = { green: L('verde (sin señales de alarma registradas)', 'green (no warning signs recorded)'), amber: L('ámbar (planificar con cuidado)', 'amber (plan with care)'), red: L('rojo (derivar o estudio adicional)', 'red (refer or further imaging)'), na: L('no evaluado', 'not assessed') }[res.level];
    lines.push(L('semáforo quirúrgico: ', 'surgical traffic light: ') + lvl + (res.pederson ? L('; índice de Pederson ', '; Pederson index ') + res.pederson.score + '/10' : ''));
    return lines;
  }

  function build(c, opts) {
    if (!c) return null;
    opts = opts || {};
    var src = opts.reader && PX.annotationsOf(c.id, opts.reader).length ? opts.reader : sourceReader(c);
    var all = src ? PX.annotationsOf(c.id, src) : [];
    var findings = all.filter(function (a) { return TX.isFinding(a.code); });
    var anatomy = all.filter(function (a) { return TX.isAnatomy(a.code); });
    var measures = PX.annotationsOf(c.id).filter(function (a) { return TX.isMeasure(a.code); });
    var checks = state.checklists.filter(function (k) { return k.caseId === c.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var sec = [];
    // 1. study data
    var data = [
      [L('Caso', 'Case'), c.pseudonym + (c.isOpenData ? ' · ' + (c.dataset || '') : '')],
      [L('Modalidad', 'Modality'), PX.optName(TX.MODALITIES, c.modality)],
      [L('Año de adquisición', 'Acquisition year'), c.year || L('no indicado', 'not stated')],
      [L('Equipo', 'Device'), ((c.deviceMake || '') + ' ' + (c.deviceModel || '')).trim() || L('no indicado', 'not stated')],
      [L('Edad / sexo', 'Age / sex'), (c.ageBand || L('no indicada', 'not stated')) + ' / ' + PX.optName(TX.SEXES, c.sex)],
      [L('Calidad de imagen', 'Image quality'), PX.optName(TX.QUALITY, c.quality)],
      [L('Calibración', 'Calibration'), PX.calibrationLabel(c)],
      [L('Lecturas', 'Reads'), readersUsed(c).join('; ') || L('sin lecturas', 'no reads')],
      [L('Fuente de este informe', 'Source of this report'), src ? (src === 'ADJ' ? L('hallazgos adjudicados', 'adjudicated findings') : L('lectura ', 'read by ') + PX.readerName(src) + L(' (sin adjudicar)', ' (not adjudicated)')) : L('sin hallazgos registrados', 'no findings recorded')],
      [L('Generado', 'Generated'), PX.fmtDate(Date.now()) + ' · PanoramIA v0.2 · ' + L('taxonomía', 'taxonomy') + ' ' + TX.VERSION + ' · ' + L('reglas', 'rules') + ' ' + RUB.VERSION]
    ];
    sec.push({ title: L('DATOS DEL ESTUDIO', 'STUDY DATA'), table: data });
    // 2. technique
    var tech = c.modality === 'CBCT' ? L('Corte bidimensional exportado de una tomografía computarizada de haz cónico; esta aplicación no dispone de la información volumétrica ni de reconstrucciones multiplanares.', 'Two-dimensional slice exported from a cone-beam computed tomography; this application has no volumetric information or multiplanar reconstructions.')
      : L('Radiografía ' + PX.optName(TX.MODALITIES, c.modality).toLowerCase() + ' bidimensional. Las medidas se obtienen sobre la imagen y, en panorámicas, incluyen la magnificación propia de la técnica (≈1,2–1,3×), no corregida.', 'Two-dimensional ' + PX.optName(TX.MODALITIES, c.modality).toLowerCase() + ' radiograph. Measurements are taken on the image and, on panoramics, include the technique\'s own magnification (≈1.2–1.3×), not corrected.');
    sec.push({ title: L('TÉCNICA', 'TECHNIQUE'), text: [tech] });
    // 3. general findings (not attached to a tooth)
    var general = findings.filter(function (a) { return !a.fdi; });
    var gen = general.map(function (a) {
      var def = TX.FINDING_BY_CODE[a.code];
      var line = pick(def.name) + L(' en ', ' in the ') + region(a, c) + (a.shape && a.shape.type !== 'point' ? sizeOf(a, c) : '') + '. ';
      if (def.group === 'JAW') line += pick(def.desc) + ' ';
      if (a.note) line += a.note + ' ';
      line += L('(Confianza del lector: ', '(Reader confidence: ') + PX.optName(TX.CONFIDENCE, a.confidence).toLowerCase() + ')';
      return line;
    });
    sec.push({ title: L('HALLAZGOS GENERALES', 'GENERAL FINDINGS'), list: gen.length ? gen : [L('No se registraron hallazgos óseos, incidentales o de calidad fuera de las piezas dentarias.', 'No bone, incidental or quality findings were recorded outside the teeth.')] });
    // 4. anatomy outlined
    if (anatomy.length) {
      var an = {}; anatomy.forEach(function (a) { var k = pick(TX.FINDING_BY_CODE[a.code].name) + (a.side ? ' (' + (a.side === 'R' ? L('derecho', 'right') : L('izquierdo', 'left')) + ')' : '') + (a.fdi ? ' ' + a.fdi : ''); an[k] = 1; });
      sec.push({ title: L('ESTRUCTURAS ANATÓMICAS DELIMITADAS', 'OUTLINED ANATOMICAL STRUCTURES'), text: [Object.keys(an).join('; ') + '.'] });
    }
    // 5. teeth table
    var byTooth = {}; findings.filter(function (a) { return a.fdi; }).forEach(function (a) { (byTooth[a.fdi] = byTooth[a.fdi] || []).push(a); });
    var absent = Object.keys(byTooth).filter(function (f) { return byTooth[f].some(function (a) { return a.code === 'DEN-MIS'; }); }).map(Number);
    if (c.ref && c.ref.absent) c.ref.absent.forEach(function (f) { if (absent.indexOf(f) === -1) absent.push(f); });
    absent.sort(function (x, y) { return x - y; });
    var rows = [];
    if (absent.length) rows.push([absent.join(', '), L('Ausentes.', 'Absent.') + (c.ref && c.ref.absent ? L(' (según la referencia externa cuando no hay lectura local)', ' (per the external reference where there is no local read)') : '')]);
    Object.keys(byTooth).map(Number).sort(function (x, y) { return x - y; }).forEach(function (f) {
      var list = byTooth[f].filter(function (a) { return a.code !== 'DEN-MIS'; });
      if (!list.length) return;
      list.sort(function (a, b) { return (ORDER.indexOf(a.code) === -1 ? 99 : ORDER.indexOf(a.code)) - (ORDER.indexOf(b.code) === -1 ? 99 : ORDER.indexOf(b.code)); });
      var parts = list.map(function (a) {
        var ph = PHRASES[a.code] ? pick(PHRASES[a.code]) : pick(TX.FINDING_BY_CODE[a.code].name);
        var hasSize = (a.code === 'DEN-PAR' || a.code === 'DEN-PAO') && a.shape && a.shape.type !== 'point';
        ph = ph.replace('{size}', hasSize ? sizeOf(a, c) : '');
        if (a.refKind) ph += L(' (etiqueta de referencia externa)', ' (external reference label)');
        if (a.note) ph += ' — ' + a.note;
        return ph;
      });
      var ch = checks.filter(function (k) { return k.fdi === f; })[0];
      if (ch) parts = parts.concat(thirdMolarLines(c, ch));
      rows.push([String(f) + ' · ' + TX.toothName(f, I.getLang()), parts.join('. ') + '.']);
    });
    checks.forEach(function (ch) { if (!byTooth[ch.fdi]) rows.push([String(ch.fdi) + ' · ' + TX.toothName(ch.fdi, I.getLang()), thirdMolarLines(c, ch).join('. ') + '.']); });
    sec.push({ title: L('PIEZAS | HALLAZGOS', 'TEETH | FINDINGS'), table: rows.length ? rows : [[L('—', '—'), L('Sin hallazgos dentarios registrados.', 'No dental findings recorded.')]], head: [L('Piezas', 'Teeth'), L('Hallazgos', 'Findings')] });
    // 6. measurements
    if (measures.length) sec.push({ title: L('MEDICIONES', 'MEASUREMENTS'), list: measures.map(function (a) { return PX.fmtLength(a.shape ? G.length(a.shape.points) : Math.hypot(a.box.w, a.box.h), c) + (a.note ? ' — ' + a.note : '') + ' (' + PX.readerName(a.reader) + ')'; }) });
    // 7. impression
    var imp = [];
    general.forEach(function (a) { var def = TX.FINDING_BY_CODE[a.code]; if (def.group === 'JAW') imp.push(pick(def.name) + L(' en ', ' in the ') + region(a, c) + L('; se recomienda correlación clínica e histopatológica para diagnóstico concluyente.', '; clinical and histopathological correlation is recommended for a conclusive diagnosis.')); else if (def.group === 'INC') imp.push(pick(def.name) + L('; correlacionar clínicamente.', '; correlate clinically.')); });
    var dentalCounts = {}; findings.filter(function (a) { return a.fdi && a.code !== 'DEN-MIS'; }).forEach(function (a) { dentalCounts[a.code] = (dentalCounts[a.code] || 0) + 1; });
    var ks = Object.keys(dentalCounts).sort(function (x, y) { return dentalCounts[y] - dentalCounts[x]; });
    if (ks.length) imp.push(L('Hallazgos dentarios registrados: ', 'Dental findings recorded: ') + ks.map(function (k) { return pick(TX.FINDING_BY_CODE[k].name).toLowerCase() + ' (' + dentalCounts[k] + ')'; }).join(', ') + '.');
    checks.forEach(function (ch) { if (ch.result.level === 'red' || ch.result.level === 'amber') imp.push(L('Pieza ', 'Tooth ') + ch.fdi + ': ' + (ch.result.level === 'red' ? L('señales de alto riesgo para la exodoncia; valorar estudio tomográfico o derivación.', 'high-risk signs for extraction; consider CBCT or referral.') : L('planificar la exodoncia con cuidado según las reglas activadas.', 'plan the extraction with care according to the rules fired.'))); });
    sec.push({ title: L('IMPRESIÓN DIAGNÓSTICA (BORRADOR)', 'DIAGNOSTIC IMPRESSION (DRAFT)'), list: imp.length ? imp : [L('Sin hallazgos que requieran impresión específica según lo registrado.', 'No findings requiring a specific impression as recorded.')] });
    // 8. final note
    var note = [
      L('Borrador generado automáticamente a partir de las anotaciones guardadas; no contiene interpretación propia del programa y no sustituye el informe del especialista en radiología bucal y maxilofacial.', 'Draft generated automatically from the saved annotations; it contains no interpretation of its own and does not replace the report of the oral and maxillofacial radiology specialist.'),
      src === 'ADJ' ? L('Los hallazgos provienen de la adjudicación de dos lecturas independientes.', 'Findings come from the adjudication of two independent reads.') : L('Los hallazgos provienen de una sola lectura no adjudicada.', 'Findings come from a single, non-adjudicated read.'),
      L('Información imagenológica de carácter complementario, destinada al apoyo de la decisión clínica; su lectura e interpretación corresponden al juicio del especialista.', 'Complementary imaging information intended to support clinical decisions; its reading and interpretation belong to the specialist\'s judgement.')
    ];
    sec.push({ title: L('NOTA FINAL', 'FINAL NOTE'), text: note });

    // render html + text
    var html = '<h2>' + esc(L('INFORME ESTRUCTURADO (BORRADOR)', 'STRUCTURED REPORT (DRAFT)')) + '</h2>';
    var text = L('INFORME ESTRUCTURADO (BORRADOR)', 'STRUCTURED REPORT (DRAFT)') + '\n\n';
    sec.forEach(function (s) {
      html += '<h3>' + esc(s.title) + '</h3>'; text += s.title + '\n';
      if (s.table) {
        html += '<table class="table">' + (s.head ? '<thead><tr><th>' + esc(s.head[0]) + '</th><th>' + esc(s.head[1]) + '</th></tr></thead>' : '') + '<tbody>' + s.table.map(function (r) { return '<tr><th>' + esc(String(r[0])) + '</th><td>' + esc(String(r[1])) + '</td></tr>'; }).join('') + '</tbody></table>';
        s.table.forEach(function (r) { text += '  ' + r[0] + ': ' + r[1] + '\n'; });
      }
      if (s.list) { html += '<ol>' + s.list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'; s.list.forEach(function (x, i) { text += '  ' + (i + 1) + '. ' + x + '\n'; }); }
      if (s.text) { html += s.text.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); s.text.forEach(function (x) { text += '  ' + x + '\n'; }); }
      text += '\n';
    });
    return { sections: sec, html: html, text: text };
  }

  root.PX_REPORT = { build: build, PHRASES: PHRASES };
})(typeof window !== 'undefined' ? window : globalThis);
