'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const DIST = 'file://' + path.resolve(__dirname, '..', 'dist', 'index.html');
const OUT = path.resolve(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
function check(cond, msg) { if (cond) console.log('ok   ' + msg); else { failures++; console.log('FAIL ' + msg); } }

(async () => {
  const cdp = await launch({ width: 1440, height: 1000 });
  try {
    await cdp.navigate(DIST);
    await sleep(1200);
    check(await cdp.eval("!!document.getElementById('ack-enter')"), 'ack modal shown on first run');
    await cdp.shot(path.join(OUT, '00-ack.png'));
    // accept
    await cdp.eval("document.querySelectorAll('[data-ack]').forEach(cb=>{cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true}))}); document.getElementById('ack-enter').disabled");
    await cdp.eval("document.getElementById('ack-enter').click()");
    await sleep(12000); // demo generation + open dataset decode (36 + 24 JPEGs)
    const nCases = await cdp.eval('PX.state.cases.length');
    check(nCases === 68, 'demo phantoms + open datasets loaded: ' + nCases + ' cases (8 + 36 + 24)');
    const nOpen = await cdp.eval("PX.state.cases.filter(c=>c.isOpenData).length");
    check(nOpen === 60, 'open datasets: 36 AKUDENTAL + 24 DentalOPG cases');
    const nExt = await cdp.eval("PX.state.annotations.filter(a=>a.external && a.reader==='ADJ').length");
    check(nExt === await cdp.eval("PX_OPENDATA_SUBSET.images.reduce((s,e)=>s+e.structures.length,0) + PX_OPENDATA_SUBSET_OPG.images.reduce((s,e)=>s+e.structures.filter(x=>x.code).length,0)"), 'external reference findings imported (' + nExt + ')');
    const opgCodes = await cdp.eval("JSON.stringify(PX.state.annotations.filter(a=>a.external && /^opg_/.test(a.caseId)).reduce((m,a)=>{m[a.code]=(m[a.code]||0)+1;return m},{}))");
    check(/DEN-RCT/.test(opgCodes) && /DEN-CAR/.test(opgCodes) && /DEN-PAR/.test(opgCodes) && /DEN-FIL/.test(opgCodes), 'DentalOPG reference carries root canals, caries, apical abscesses and fillings: ' + opgCodes);
    check(await cdp.eval("PX.state.cases.filter(c=>c.datasetKey==='opg').every(c=>/^OPG-\\d{4}$/.test(c.pseudonym) && !/[A-Za-z]{3,}\\s[A-Za-z]{3,}/.test(c.datasetRef))"), 'DentalOPG cases carry pseudonyms only (no source file names)');
    check(await cdp.eval("PX.state.cases.filter(c=>c.isOpenData).every(c=>c.status==='ready' && c.consent==='open' && c.adjudicationComplete && PX.state.images[c.id] && PX.state.images[c.id].blob && PX.state.images[c.id].blob.size>20000 && PX.state.images[c.id].thumb.length>1000)"), 'every open case is ready, has an image blob and a thumbnail');
    check(await cdp.eval("document.querySelector('.kpi .v').textContent") === '68', 'home KPI shows 68 cases');
    check(await cdp.eval("document.body.innerText.indexOf('AKUDENTAL')>-1 && document.body.innerText.indexOf('CC BY-NC-SA 4.0')>-1"), 'home shows the open dataset banner with its licence');
    await cdp.shot(path.join(OUT, '01-home.png'));

    // cases
    await cdp.eval("location.hash='casos'"); await sleep(500);
    check(await cdp.eval("document.querySelectorAll('#content tbody tr').length") === 68, 'cases table lists 68 rows');
    await cdp.shot(path.join(OUT, '02-cases.png'));

    // annotate: open the demo case 2 (impacted 48)
    await cdp.eval("PX.actions['case:open']('demo_2')"); await sleep(900);
    check(await cdp.eval("!!document.getElementById('an-canvas')"), 'annotate view has a canvas');
    const boxes = await cdp.eval("(function(){ var c=PX.state.annotations.filter(a=>a.caseId==='demo_2'); return c.length; })()");
    check(boxes === 9, 'demo_2 has 9 annotations across readers (' + boxes + ')');
    await cdp.shot(path.join(OUT, '03-annotate.png'));
    // switch to adjudicator view and show panel
    await cdp.eval("PX.actions['an:reader']('ADJ')"); await sleep(600);
    check(await cdp.eval("document.querySelectorAll('#an-panel .finding').length") >= 3, 'adjudication panel lists findings');
    await cdp.shot(path.join(OUT, '04-annotate-adj.png'));
    // simulate creating a finding as R1 via the viewer callback
    await cdp.eval("PX.actions['an:reader']('R1')"); await sleep(400);
    await cdp.eval("(function(){ var ev=new Event('x'); PX.state.ui.reader='R1'; })()");
    const before = await cdp.eval("PX.state.annotations.length");
    await cdp.eval("(function(){ var cv=document.getElementById('an-canvas'); var r=cv.getBoundingClientRect(); function pe(type,x,y){ cv.dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:r.left+x,clientY:r.top+y,button:0,buttons:1,bubbles:true})); } PX.actions['an:tool']('box'); pe('pointerdown',300,300); pe('pointermove',380,360); pe('pointerup',380,360); })()");
    await sleep(300);
    check(await cdp.eval("!!document.getElementById('af-code')"), 'drawing a box opens the finding form');
    await cdp.eval("document.getElementById('af-code').value='DEN-CAR'; PX.actions['an:fdi']('36');"); await sleep(200);
    await cdp.eval("document.getElementById('af-code').value='DEN-CAR'; PX.actions['an:save']()"); await sleep(500);
    const after = await cdp.eval("PX.state.annotations.length");
    check(after === before + 1, 'finding saved (' + before + ' -> ' + after + ')');
    const last = await cdp.eval("JSON.stringify(PX.state.annotations[PX.state.annotations.length-1])");
    check(/"code":"DEN-CAR"/.test(last) && /"fdi":36/.test(last) && /"reader":"R1"/.test(last), 'saved finding has code, tooth and reader: ' + last.slice(0, 160));
    await cdp.shot(path.join(OUT, '05-annotate-new.png'));

    // semáforo
    await cdp.eval("location.hash='semaforo'"); await sleep(500);
    await cdp.eval("PX.actions['sem:fdi']('48')"); await sleep(300);
    check(await cdp.eval("document.querySelector('.sem-level').className.indexOf('amber')>-1"), 'tooth 48 with nothing assessed is amber (canal not assessed)');
    await cdp.eval("(function(){ var r=document.querySelector('input[name=sem-ianRelation][value=superimposed]'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(300);
    await cdp.eval("(function(){ var r=document.querySelector('input[data-arg=roodSigns][value=darkening]'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(300);
    check(await cdp.eval("document.querySelector('.sem-level').className.indexOf('red')>-1"), 'darkening sign turns it red');
    await cdp.eval("(function(){ ['winter:mesioangular','pellDepth:B','pellRamus:II'].forEach(function(p){ var kv=p.split(':'); var r=document.querySelector('input[name=sem-'+kv[0]+'][value='+kv[1]+']'); r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); }); })()"); await sleep(400);
    check(await cdp.eval("document.body.innerText.indexOf('/ 10')>-1 && !!document.querySelector('.kpi .v') && document.querySelector('.kpi .v').textContent==='5'"), 'Pederson 5 shown');
    await cdp.shot(path.join(OUT, '06-semaforo.png'));
    await cdp.eval("PX.actions['sem:save']()"); await sleep(500);
    check(await cdp.eval("PX.state.checklists.length") === 3, 'checklist saved (3 total)');

    // atlas
    await cdp.eval("location.hash='atlas'"); await sleep(500);
    check(await cdp.eval("document.querySelectorAll('.tile').length") === 65, 'atlas shows 65 adjudicated cases (5 phantoms + 60 open)');
    await cdp.shot(path.join(OUT, '07-atlas.png'));
    await cdp.eval("PX.actions['atlas:open']('demo_3')"); await sleep(800);
    await cdp.shot(path.join(OUT, '08-atlas-case.png'));
    await cdp.eval("PX.closeModal()");
    await cdp.eval("PX.actions['atlas:open']('aku_147')"); await sleep(900);
    check(await cdp.eval("document.body.innerText.indexOf('AKU-0147')>-1 && document.querySelectorAll('#modal-root .finding').length >= 10"), 'atlas opens an AKUDENTAL case with its reference findings');
    await cdp.shot(path.join(OUT, '08b-atlas-aku.png'));
    await cdp.eval("PX.closeModal()");
    await cdp.eval("PX.actions['atlas:mode']('quiz')"); await sleep(800);
    check(await cdp.eval("!!document.getElementById('quiz-canvas')"), 'quiz mode renders');
    await cdp.shot(path.join(OUT, '09-quiz.png'));

    // observatory
    await cdp.eval("location.hash='observatorio'"); await sleep(500);
    check(await cdp.eval("document.querySelectorAll('.chart').length") >= 5, 'observatory has charts');
    check(await cdp.eval("document.querySelector('.kpi .v').textContent") === '68', 'observatory counts 68 cases with open data included');
    await cdp.shot(path.join(OUT, '10-observatory.png'));
    await cdp.eval("(function(){ var cb=document.querySelector('input[data-action=\"obs:open\"]'); cb.checked=false; cb.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(400);
    check(await cdp.eval("document.querySelector('.kpi .v').textContent") === '8', 'observatory excludes the open dataset when unticked');
    await cdp.eval("(function(){ var cb=document.querySelector('input[data-action=\"obs:open\"]'); cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(300);

    // evaluation
    await cdp.eval("location.hash='evaluacion'"); await sleep(400);
    await cdp.eval("PX.actions['eval:synthetic']()"); await sleep(600);
    const nres = await cdp.eval("PX.state.evaluation.results ? PX.state.evaluation.results.length : 0");
    check(nres > 0, 'evaluation computed ' + nres + ' categories');
    await cdp.shot(path.join(OUT, '11-evaluation.png'));

    // governance (steward)
    await cdp.eval("PX.state.settings.role='steward'; PX.saveSettings(); location.hash='gobernanza'; PX.render();"); await sleep(500);
    check(await cdp.eval("document.body.innerText.indexOf('demo.load')>-1 && document.body.innerText.indexOf('opendata.load')>-1"), 'audit log shows demo and open dataset loads');
    check(await cdp.eval("document.body.innerText.indexOf('10.1186/s12903-025-07645-0')>-1 && document.body.innerText.indexOf('KAEK-72')>-1"), 'governance shows the dataset card with citation and ethics approval');
    await cdp.shot(path.join(OUT, '12-governance.png'));

    // help
    await cdp.eval("location.hash='ayuda'"); await sleep(400);
    await cdp.shot(path.join(OUT, '13-help.png'));
    await cdp.eval("PX.actions['help:tab']('class')"); await sleep(300);
    await cdp.shot(path.join(OUT, '14-help-class.png'));
    await cdp.eval("PX.actions['help:tab']('open')"); await sleep(300);
    check(await cdp.eval("document.body.innerText.indexOf('DENTEX')>-1 && document.body.innerText.indexOf('AKUDENTAL')>-1"), 'help has the open datasets tab');
    await cdp.shot(path.join(OUT, '14b-help-open.png'));

    // annotate an AKUDENTAL case: overlay, provenance, blind readers
    await cdp.eval("PX.actions['case:open']('aku_147')"); await sleep(1200);
    check(await cdp.eval("!!document.querySelector('input[data-action=\"an:ref\"]') && document.querySelector('input[data-action=\"an:ref\"]').checked"), 'reference structures toggle present and on');
    check(await cdp.eval("PX.annotationsOf('aku_147','R1').length===0 && PX.annotationsOf('aku_147','R2').length===0 && PX.annotationsOf('aku_147','ADJ').length===14"), 'AKU-0147: readers empty, 14 external reference findings');
    check(await cdp.eval("document.body.innerText.indexOf('External reference')>-1 || document.body.innerText.indexOf('Referencia externa')>-1"), 'external reference notice shown');
    await cdp.shot(path.join(OUT, '22-annotate-aku.png'));
    await cdp.eval("PX.actions['an:tab']('case')"); await sleep(300);
    check(await cdp.eval("document.body.innerText.indexOf('/ 32')>-1 && document.body.innerText.indexOf('CC BY-NC-SA 4.0')>-1"), 'case panel shows provenance and labelled-teeth count');
    await cdp.shot(path.join(OUT, '23-annotate-aku-case.png'));
    await cdp.eval("PX.actions['an:tab']('findings'); PX.actions['an:reader']('ADJ')"); await sleep(600);
    await cdp.shot(path.join(OUT, '24-annotate-aku-adj.png'));
    await cdp.eval("(function(){ var cb=document.querySelector('input[data-action=\"an:ref\"]'); cb.checked=false; cb.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(300);
    check(await cdp.eval("document.getElementById('ref-legend').hidden===true"), 'overlay legend hides with the toggle');

    // ===== v0.2: palette, shapes, measurements, anatomy-anchored traffic light, report, detector =====
    await cdp.eval("PX.state.settings.lang='es'; PX_I18N.setLang('es'); PX.actions['case:open']('aku_147'); PX.actions['an:reader']('R1');"); await sleep(900);
    check(await cdp.eval("document.querySelectorAll('.palette .chip').length") >= 20, 'palette shows the dental and anatomical chips');
    await cdp.eval("PX.actions['an:chip']('DEN-RCT')"); await sleep(200);
    check(await cdp.eval("PX.state.an.pendingCode==='DEN-RCT' && PX.state.an.tool==='box' && document.getElementById('tool-box').classList.contains('on')"), 'chip arms the code and the rectangle tool');
    await cdp.eval("PX.actions['an:chip']('ANA-IAC')"); await sleep(200);
    check(await cdp.eval("PX.state.an.tool==='polyline' && PX.state.an.viewer.tool==='polyline'"), 'anatomy chip switches to the polyline tool');
    // draw a polyline with real pointer events: canal through the apical third of tooth 47's reference outline
    const geo = await cdp.eval("(function(){ var c=PX.caseById('aku_147'); var tt=[47,46,45,37,36,35].map(function(f){ return c.ref.teeth.filter(function(x){ return x.fdi===f; })[0]; }).filter(Boolean)[0]; var b=tt.box; var v=PX.state.an.viewer; var y=b[1]+b[3]*0.9; var p1=v.toScreen(b[0]-80,y), p2=v.toScreen(b[0]+b[2]/2,y+4), p3=v.toScreen(b[0]+b[2]+80,y); var r=document.getElementById('an-canvas').getBoundingClientRect(); return {fdi:tt.fdi, box:b, pts:[[p1.x+r.left,p1.y+r.top],[p2.x+r.left,p2.y+r.top],[p3.x+r.left,p3.y+r.top]]}; })()");
    const tf = geo.fdi, tb = geo.box;
    for (const [x, y] of geo.pts) {
      await cdp.eval("(function(){ var cv=document.getElementById('an-canvas'); ['pointerdown','pointerup'].forEach(function(tp){ cv.dispatchEvent(new PointerEvent(tp,{bubbles:true,clientX:" + x + ",clientY:" + y + ",button:0,pointerId:1,pointerType:'mouse',isPrimary:true})); }); })()");
      await sleep(80);
    }
    check(await cdp.eval("PX.state.an.viewer.isDrafting() && PX.state.an.viewer.draft.points.length===3"), 'three clicks build a polyline draft');
    await cdp.eval("document.getElementById('an-canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))"); await sleep(300);
    check(await cdp.eval("!!PX.state.an.af && PX.state.an.af.shape && PX.state.an.af.shape.type==='polyline' && PX.state.an.af.code==='ANA-IAC'"), 'Enter finishes the polyline and opens the form with the armed code');
    await cdp.eval("PX.actions['an:save']()"); await sleep(400);
    const canal = await cdp.eval("JSON.stringify(PX.annotationsOf('aku_147','R1').filter(a=>a.code==='ANA-IAC').map(a=>({side:a.side,type:a.shape.type,n:a.shape.points.length})))");
    check(canal === '[{"side":"' + (tf < 30 || (tf >= 40 && tf < 50) ? 'R' : 'L') + '","type":"polyline","n":3}]', 'canal saved as a sided polyline: ' + canal);
    // polygon lesion with the freehand/polygon API path, then a second mark on the same tooth
    const bx = tb[0], by = tb[1], bw = tb[2], bh = tb[3];
    await cdp.eval("PX.actions['an:chip']('DEN-PAR'); PX.state.an.viewer.opts.onCreate(PX_Viewer.geom.geomFromShape({type:'polygon',points:[[" + (bx) + "," + (by + bh) + "],[" + (bx + bw) + "," + (by + bh - 5) + "],[" + (bx + bw + 10) + "," + (by + bh + 40) + "],[" + (bx - 5) + "," + (by + bh + 45) + "]]}));"); await sleep(200);
    await cdp.eval("PX.actions['an:fdi']('" + tf + "'); PX.actions['an:save']();"); await sleep(400);
    await cdp.eval("PX.actions['an:chip']('DEN-RCT'); PX.state.an.viewer.opts.onCreate(PX_Viewer.geom.geomFromShape({type:'rect',points:[[" + (bx + 5) + "," + (by + 10) + "],[" + (bx + bw - 5) + "," + (by + bh - 10) + "]]}));"); await sleep(200);
    check(await cdp.eval("PX.state.an.af.fdi===" + tf), 'next mark proposes the same tooth (' + tf + ')');
    await cdp.eval("PX.actions['an:save']();"); await sleep(400);
    check(await cdp.eval("PX.findingsOf('aku_147','R1').filter(a=>a.fdi===" + tf + ").length===2 && document.querySelectorAll('.tooth-group').length>=2"), 'two findings on tooth ' + tf + ' with different codes, grouped by tooth');
    // measurement + calibration
    await cdp.eval("PX.actions['an:tool']('measure'); PX.state.an.viewer.opts.onCreate(PX_Viewer.geom.geomFromShape({type:'line',points:[[100,700],[200,700]]}));"); await sleep(400);
    const mid = await cdp.eval("(PX.annotationsOf('aku_147','R1').filter(a=>a.code==='MEA-LIN')[0]||{}).id");
    check(!!mid && await cdp.eval("document.body.innerText.indexOf('100 px')>-1"), 'measurement saved and shown in px');
    await cdp.eval("PX.actions['an:calibrate']('" + mid + "')"); await sleep(200);
    await cdp.eval("document.getElementById('cal-mm').value='10'; PX.actions['an:calibrateSave']('" + mid + "')"); await sleep(400);
    check(await cdp.eval("Math.abs(PX.caseById('aku_147').calibration.mmPerPx-0.1)<1e-9 && document.body.innerText.indexOf('10.0 mm')>-1"), 'manual calibration: 100 px = 10 mm, measurement now in mm');
    await cdp.eval("PX.actions['an:tool']('pan')");
    await cdp.shot(path.join(OUT, '40-annotate-shapes.png'));
    // anatomy for the traffic light on a case with all four third molars; lines drawn through the viewer API
    const tmCase = await cdp.eval("'aku_' + PX_OPENDATA_SUBSET.selection.third_molars[0]");
    await cdp.eval("PX.actions['case:open']('" + tmCase + "'); PX.actions['an:reader']('R1');"); await sleep(900);
    const ok48 = await cdp.eval("(function(){ var c=PX.caseById('" + tmCase + "'); var t48=c.ref.teeth.filter(x=>x.fdi===48)[0], t47=c.ref.teeth.filter(x=>x.fdi===47)[0]; if(!t48||!t47) return 'missing'; var b=t48.box, b7=t47.box; var topY=Math.min(b[1],b7[1]);\n" +
      "function mk(code, pts){ PX.actions['an:chip'](code); PX.state.an.viewer.opts.onCreate(PX_Viewer.geom.geomFromShape({type: code==='ANA-IAC'?'polyline':'line', points: pts})); PX.actions['an:save'](); }\n" +
      "mk('ANA-IAC', [[b[0]-120, b[1]+b[3]*0.85],[b[0]+b[2]/2, b[1]+b[3]*0.9],[b[0]+b[2]+150, b[1]+b[3]*0.85]]);\n" +
      "mk('ANA-OCC', [[b7[0]-10, topY+8],[b7[0]+b7[2]+60, topY+8]]);\n" +
      "mk('ANA-CEJ', [[b7[0]-10, b7[1]+b7[3]*0.35],[b7[0]+b7[2]+60, b7[1]+b7[3]*0.35]]);\n" +
      "mk('ANA-RAM', [[b[0]+b[2]*0.5, b[1]-60],[b[0]+b[2]*0.5, b[1]+b[3]+60]]);\n return 'ok'; })()");
    await sleep(900);
    check(ok48 === 'ok' && await cdp.eval("PX.annotationsOf('" + tmCase + "','R1').filter(a=>TX_isAna(a.code)).length===4".replace('TX_isAna(a.code)', 'PX_TAXONOMY.isAnatomy(a.code)')), 'four anatomical structures saved for the third-molar case');
    check(await cdp.eval("PX.readState(PX.caseById('" + tmCase + "'))==='external'"), 'anatomy alone does not count as a clinical read');
    await cdp.shot(path.join(OUT, '41-annotate-anatomy.png'));
    await cdp.eval("PX.state.sem.caseId='" + tmCase + "'; PX.actions['sem:fdi']('48'); location.hash='semaforo'; PX.render();"); await sleep(700);
    const sug = await cdp.eval("JSON.stringify((PX.geometryFor(PX.caseById('" + tmCase + "'),48)||{suggestions:[]}).suggestions.map(s=>s.key+':'+s.value))");
    check(/winter/.test(sug) && /pellDepth/.test(sug) && /pellRamus/.test(sug) && /ianRelation:superimposed/.test(sug), 'traffic light derives Winter, depth, ramus and canal suggestions from the drawn anatomy: ' + sug);
    await cdp.shot(path.join(OUT, '42-semaforo-geometry.png'));
    await cdp.eval("PX.actions['sem:applyGeom']('all')"); await sleep(500);
    check(await cdp.eval("!!PX.state.sem.inputs.winter && !!PX.state.sem.inputs.pellDepth && PX.state.sem.inputs.ianRelation==='superimposed' && Object.keys(PX.state.sem.geometry).length>=4"), 'suggestions applied to the form and recorded as geometry-derived');
    await cdp.eval("PX.actions['sem:save']()"); await sleep(500);
    check(await cdp.eval("PX.state.checklists.filter(k=>k.caseId==='" + tmCase + "' && k.geometry && k.geometry.winter).length===1"), 'checklist saved with its geometry provenance');
    await cdp.shot(path.join(OUT, '43-semaforo-applied.png'));
    // report tab
    await cdp.eval("PX.actions['case:open']('aku_147'); location.hash='anotar'; PX.render();"); await sleep(800);
    await cdp.eval("PX.actions['an:tab']('report')"); await sleep(400);
    const repAdj = await cdp.eval("document.getElementById('report-view').innerText");
    check(/PIEZAS \| HALLAZGOS/.test(repAdj) && /AKU-0147/.test(repAdj) && /hallazgos adjudicados/.test(repAdj) && /Implante dental/.test(repAdj) && /NOTA FINAL/.test(repAdj), 'structured report defaults to the adjudicated (reference) findings');

    await cdp.eval("PX.actions['report:source'](null,{value:'R1'})"); await sleep(300);
    const rep = await cdp.eval("document.getElementById('report-view').innerText");
    check(new RegExp(String(tf)).test(rep) && /Conducto radicular obturado/.test(rep) && /radiol[uú]cida periapical/i.test(rep) && /sin adjudicar/.test(rep), 'report can be built from one reader and says it is not adjudicated');
    check(/mm/.test(rep) && /Calibrada/.test(rep), 'report uses the calibration for sizes');
    await cdp.shot(path.join(OUT, '44-report.png'));
    // detector proposals on a case with restorations
    await cdp.eval("PX.actions['an:tab']('findings'); PX.actions['an:detect']()"); await sleep(2500);
    const nProp = await cdp.eval("(PX.state.an.proposals||[]).length");
    check(nProp > 0, 'automatic reading proposes on AKU-0147 (' + nProp + ')');
    const propCodes = await cdp.eval("JSON.stringify((PX.state.an.proposals||[]).reduce((m,p)=>{m[p.code]=(m[p.code]||0)+1;return m},{}))");
    const pc = JSON.parse(propCodes);
    check(pc['ANA-IAC'] >= 1 && pc['ANA-SIN'] >= 1 && pc['ANA-MF'] >= 1 && pc['ANA-OCC'] >= 1, 'proposals include atlas anatomy (canal, sinus, mental foramen, occlusal plane): ' + propCodes);
    check(Object.keys(pc).some(k => /^DEN-(FIL|CRN|BRG|IMPL|RST|RCT)$/.test(k)), 'proposals include classified radiopacities: ' + propCodes);
    check(await cdp.eval("(PX.state.an.proposals||[]).every(p=>p.shape&&p.shape.points&&p.shape.points.length>=1&&p.code)"), 'every proposal carries a shape and a code');
    check(/Anatomía normal|Normal anatomy/.test(await cdp.eval("document.getElementById('an-panel').innerText")) && /Posibles hallazgos|Possible findings/.test(await cdp.eval("document.getElementById('an-panel').innerText")), 'panel groups proposals into anatomy and findings');
    await cdp.shot(path.join(OUT, '45-autoread.png'));
    const firstFinding = await cdp.eval("(PX.state.an.proposals||[]).findIndex(p=>!PX_TAXONOMY.isAnatomy(p.code))");
    await cdp.eval("PX.actions['an:proposalAccept']('" + firstFinding + "')"); await sleep(500);
    check(await cdp.eval("PX.findingsOf('aku_147','R1').some(a=>a.proposedBy && a.proposedBy.indexOf('autoread')===0 && a.confidence==='probable' && a.shape && a.shape.type==='polygon')"), 'accepted proposal becomes a probable polygon finding with provenance');
    await cdp.eval("PX.actions['an:proposalAccept']('code:ANA-IAC')"); await sleep(500);
    check(await cdp.eval("PX.annotationsOf('aku_147','R1').filter(a=>a.code==='ANA-IAC'&&a.side&&a.shape.type==='polyline').length>=1"), 'accepting a group stores sided anatomy polylines');
    // trained-model server hook (mock server, same JSON shape as tools/model_server.py)
    const mock = require('child_process').spawn(process.execPath, [path.join(__dirname, 'mock_model_server.js')], { env: Object.assign({}, process.env, { PORT: '8765' }), stdio: 'ignore' });
    await sleep(600);
    await cdp.eval("PX.actions['model:check']()"); await sleep(800);
    check(await cdp.eval("!!(PX.state.an.modelStatus && PX.state.an.modelStatus.ok)") && /mock-yolo/.test(await cdp.eval("document.getElementById('an-panel').innerText")), 'model server health shows the model card');
    const beforeModel = await cdp.eval("(PX.state.an.proposals||[]).length");
    await cdp.eval("PX.actions['model:predict']()"); await sleep(1500);
    const afterModel = await cdp.eval("JSON.stringify((PX.state.an.proposals||[]).filter(p=>/model/.test(p.how)).map(p=>[p.code,p.score,p.fdi,p.how]))");
    check(JSON.parse(afterModel).length === 2 && /DEN-RCT/.test(afterModel) && /DEN-IMP/.test(afterModel) && /horizontal/.test(afterModel) && !/NOT-A-CODE/.test(afterModel), 'model proposals merged (unknown codes dropped, impaction subtype kept in the note): ' + afterModel);
    mock.kill();
    const onTooth = await cdp.eval("(function(){var fdi=PX.state.an.lastFdi; return JSON.stringify({fdi:fdi, html:/En esta pieza|On this tooth/.test(document.getElementById('an-panel').innerText), found:document.querySelectorAll('.on-tooth .chip').length})})()");
    const ot = JSON.parse(onTooth);
    check(ot.fdi && ot.html && ot.found >= 1, 'palette shows the categories already found on the current tooth first: ' + onTooth);
    // detector evaluation against the AKUDENTAL reference
    await cdp.eval("location.hash='evaluacion'; PX.render();"); await sleep(400);
    await cdp.eval("PX.actions['eval:detector']()");
    let dres = null; for (let i = 0; i < 90; i++) { await sleep(1000); dres = await cdp.eval("(function(){ var h=document.body.innerText; var m=h.match(/(\\d+) casos · (\\d+) estructuras de referencia · (\\d+) propuestas/); return m?{n:+m[1],ref:+m[2],det:+m[3]}:null; })()"); if (dres) break; }
    const refTotal = await cdp.eval("PX.state.cases.filter(c=>c.isOpenData && c.datasetKey==='aku').reduce((s,c)=>s+c.ref.structures.length,0)");
    check(!!dres && dres.n === 36 && dres.ref === refTotal, 'detector evaluated on the 36 open cases against ' + refTotal + ' reference structures: ' + JSON.stringify(dres));
    await cdp.shot(path.join(OUT, '46-evaluation-detector.png'));
    await cdp.eval("location.hash='ayuda'; PX.render(); PX.actions['help:tab']('mark');"); await sleep(400);
    check(await cdp.eval("document.body.innerText.indexOf('Cómo marcar')>-1 && document.querySelectorAll('.chips .chip').length>30"), 'help explains how to mark with the colour legend');
    await cdp.shot(path.join(OUT, '47-help-mark.png'));
    await cdp.eval("PX.actions['lang:set'](null,{value:'en'});");

    // import flow with a DICOM test file
    await cdp.eval("location.hash='casos'"); await sleep(400);
    await cdp.eval("PX.actions['import:open']()"); await sleep(300);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#imp-file' });
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [path.resolve(__dirname, '..', 'testdata', 'explicit_mono2_8bit.dcm')] });
    await sleep(1200);
    check(await cdp.eval("document.body.innerHTML.indexOf('PatientName')>-1 && /eliminados|removed/.test(document.body.innerText)"), 'import shows de-identification receipt with PatientName removed');
    check(await cdp.eval("document.body.innerText.indexOf('DOE')===-1"), 'patient name value never shown');
    check(await cdp.eval("!document.getElementById('imp-next').disabled"), 'next enabled after decode');
    await cdp.shot(path.join(OUT, '15-import-1.png'));
    await cdp.eval("PX.actions['import:next']()"); await sleep(600);
    check(await cdp.eval("!!document.getElementById('imp-canvas') && document.getElementById('imp-next').disabled"), 'step 2 requires the burned-in check');
    // draw a redaction and apply
    await cdp.eval("(function(){ var cv=document.getElementById('imp-canvas'); var r=cv.getBoundingClientRect(); function pe(type,x,y){ cv.dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:r.left+x,clientY:r.top+y,button:0,buttons:1,bubbles:true})); } pe('pointerdown',200,150); pe('pointermove',260,190); pe('pointerup',260,190); })()");
    await sleep(300);
    await cdp.eval("PX.actions['import:applyRedactions']()"); await sleep(300);
    await cdp.eval("(function(){ var cb=document.querySelector('input[data-action=\"import:checked\"]'); cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true})); })()"); await sleep(200);
    await cdp.shot(path.join(OUT, '16-import-2.png'));
    await cdp.eval("PX.actions['import:next']()"); await sleep(500);
    check(await cdp.eval("document.getElementById('f-age') && document.getElementById('f-age').value==='30-44' && document.getElementById('f-sex').value==='F' && document.getElementById('f-year').value==='2024'"), 'step 3 prefilled age band 30-44, sex F, year 2024 from DICOM');
    await cdp.eval("document.getElementById('f-consent').value='prospective'; document.getElementById('f-site').value='Clínica de prueba'; document.getElementById('f-province').value='Santiago';");
    await cdp.shot(path.join(OUT, '17-import-3.png'));
    await cdp.eval("PX.actions['import:save']()"); await sleep(1200);
    const n2 = await cdp.eval('PX.state.cases.length');
    check(n2 === 69, 'imported case saved (' + n2 + ' cases)');
    const newest = await cdp.eval("JSON.stringify(PX.state.cases.find(c=>!c.isDemo))");
    check(/"redactions":1/.test(newest) && /"burnedInChecked":true/.test(newest) && /"ageBand":"30-44"/.test(newest) && !/DOE/.test(newest), 'new case record: redaction counted, checked, age band, no name: ' + newest.slice(0, 200));
    check(await cdp.eval("location.hash==='#anotar' && !!document.getElementById('an-canvas')"), 'after import the annotate view opens');
    await cdp.shot(path.join(OUT, '18-after-import.png'));

    // language toggle (headless Chrome is en-US, so the app auto-detected English; now check Spanish)
    await cdp.eval("PX.actions['lang:set'](null,{value:'es'}); location.hash='inicio'; PX.render();"); await sleep(400);
    check(await cdp.eval("document.body.innerText.indexOf('Cómo empezar')>-1 && document.body.innerText.indexOf('Semáforo')>-1"), 'Spanish toggle works');
    await cdp.shot(path.join(OUT, '19-home-es.png'));
    await cdp.eval("location.hash='semaforo'; PX.render();"); await sleep(500);
    await cdp.shot(path.join(OUT, '19b-semaforo-es.png'));
    await cdp.eval("location.hash='anotar'; PX.render();"); await sleep(700);
    await cdp.shot(path.join(OUT, '19c-annotate-es.png'));
    await cdp.eval("PX.actions['lang:set'](null,{value:'en'}); location.hash='inicio'; PX.render();"); await sleep(400);
    check(await cdp.eval("document.body.innerText.indexOf('How to start')>-1"), 'English toggle works');
    await cdp.shot(path.join(OUT, '19-home-en.png'));
    // dark theme
    await cdp.eval("document.documentElement.setAttribute('data-theme','dark'); PX.render();"); await sleep(400);
    await cdp.shot(path.join(OUT, '20-home-dark.png'));
    await cdp.eval("location.hash='anotar'; PX.render();"); await sleep(700);
    await cdp.shot(path.join(OUT, '21-annotate-dark.png'));

    // persistence: reload keeps cases
    await cdp.navigate(DIST); await sleep(1500);
    const n3 = await cdp.eval('PX.state.cases.length');
    check(n3 === 69, 'cases persist across reload (' + n3 + ')');
    check(await cdp.eval("PX.state.cases.filter(c=>c.isOpenData).length") === 60, 'open datasets not duplicated on reload');

    const errs = cdp.consoleMsgs.filter((m) => /^(error|EXCEPTION)/.test(m));
    check(errs.length === 0, 'no console errors (' + errs.length + ')');
    if (errs.length) console.log(errs.join('\n'));
    const warns = cdp.consoleMsgs.filter((m) => /^warning/.test(m));
    if (warns.length) console.log('warnings:\n' + warns.slice(0, 10).join('\n'));
  } catch (e) {
    failures++; console.log('FAIL exception: ' + (e && e.stack || e));
    try { await cdp.shot(path.join(OUT, '99-error.png')); } catch (e2) {}
    console.log(cdp.consoleMsgs.slice(-20).join('\n'));
  } finally { cdp.close(); }
  console.log(failures ? failures + ' UI checks failed' : 'all UI checks passed');
  process.exit(failures ? 1 : 0);
})();
