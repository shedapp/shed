'use strict';
/* Serves the repository root over HTTP (as GitHub Pages does) and checks the "load the complete set" path. */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { launch, sleep } = require('./cdp');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript' };
let failures = 0;
function check(cond, msg) { if (cond) console.log('ok   ' + msg); else { failures++; console.log('FAIL ' + msg); } }

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const cdp = await launch({ width: 1440, height: 1000 });
  try {
    await cdp.navigate(base + 'index.html');
    await sleep(1200);
    await cdp.eval("document.querySelectorAll('[data-ack]').forEach(cb=>{cb.checked=true; cb.dispatchEvent(new Event('change',{bubbles:true}))});");
    await cdp.eval("document.getElementById('ack-enter').click()");
    await sleep(9000);
    check(await cdp.eval('PX.state.cases.length') === 68, 'served over http: 68 cases after first run');
    check(await cdp.eval('PX.canLoadRemote()') === true, 'remote loading is offered over http');
    await cdp.eval("PX.state.settings.role='steward'; PX.saveSettings(); location.hash='gobernanza'; PX.render();"); await sleep(500);
    check(await cdp.eval("document.querySelectorAll('[data-action=\"open:loadFull\"]').length === 2 && !document.querySelector('[data-action=\"open:loadFull\"][data-arg=\"aku\"]').disabled"), 'governance shows a "load complete set" button per dataset');
    await cdp.eval("window.__opg=null; fetch('data/dentalopg/full_manifest.json').then(r=>r.json()).then(m=>{ window.__opg={n:m.images.length, lic:m.licence, teeth:m.images[0].teeth.length, hasNames:m.images.some(e=>/[A-Za-z]{3,}/.test(e.id.replace('opg','')))}; })");
    let opgMan = null; for (let i = 0; i < 30; i++) { await sleep(500); opgMan = await cdp.eval("JSON.stringify(window.__opg)"); if (opgMan && opgMan !== 'null') break; }
    opgMan = JSON.parse(opgMan || 'null') || {};
    check(opgMan.n === 1525 && /CC BY 4.0/.test(opgMan.lic) && !opgMan.hasNames, 'DentalOPG complete manifest served (1,525 images, CC BY 4.0, no source names): ' + JSON.stringify(opgMan));
    await cdp.eval("document.querySelector('[data-action=\"open:loadFull\"][data-arg=\"aku\"]').click()");
    // wait up to 120 s for 333 open cases
    let n = 0;
    for (let i = 0; i < 120; i++) { await sleep(1000); n = await cdp.eval("PX.state.cases.filter(c=>c.isOpenData && c.datasetKey==='aku').length"); if (n >= 333) break; }
    check(n === 333, 'complete AKUDENTAL set loaded: ' + n + ' open cases');
    check(await cdp.eval("PX.state.cases.length") === 365, 'total 365 cases (8 phantoms + 333 + 24)');
    check(await cdp.eval("PX.state.annotations.filter(a=>a.external && /^aku_/.test(a.caseId)).length") === 1135, 'all 1,135 AKUDENTAL reference structures imported');
    check(await cdp.eval("new Set(PX.state.cases.filter(c=>c.isOpenData).map(c=>c.pseudonym)).size") === 357, 'pseudonyms unique');
    check(await cdp.eval("document.querySelector('[data-action=\"open:loadFull\"][data-arg=\"aku\"]').disabled === true"), 'button disabled once everything is loaded');
    await cdp.shot(path.join(OUT, '30-governance-full.png'));
    await cdp.eval("location.hash='observatorio'; PX.render();"); await sleep(800);
    check(await cdp.eval("document.querySelector('.kpi .v').textContent") === '365', 'observatory counts 365 cases');
    await cdp.shot(path.join(OUT, '31-observatory-full.png'));
    await cdp.eval("location.hash='atlas'; PX.render();"); await sleep(1500);
    check(await cdp.eval("document.querySelectorAll('.tile').length") === 362, 'atlas shows 362 reference cases');
    await cdp.shot(path.join(OUT, '32-atlas-full.png'));
    // persistence
    await cdp.navigate(base + 'index.html'); await sleep(3000);
    check(await cdp.eval("PX.state.cases.length") === 365, 'persisted across reload (365)');
    const errs = cdp.consoleMsgs.filter((m) => /^(error|EXCEPTION)/.test(m));
    check(errs.length === 0, 'no console errors (' + errs.length + ')');
    if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  } catch (e) {
    failures++; console.log('FAIL exception: ' + (e && e.stack || e));
  } finally { cdp.close(); server.close(); }
  console.log(failures ? failures + ' HTTP checks failed' : 'all HTTP checks passed');
  process.exit(failures ? 1 : 0);
})();
