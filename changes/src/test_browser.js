// Headless walk through the app at phone width: loads the page, taps through the demo, opens each screen, screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(8765, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const file = process.argv[2] === 'artifact' ? '/dist/artifact.html' : '/index.html';
  await page.goto('http://localhost:8765' + file);
  await page.waitForTimeout(800);
  const out = path.join(root, 'build', 'shots'); fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, '1-listen-welcome.png') });
  // demo progression → ideas
  await page.click('#obDemo');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '2-ideas.png'), fullPage: false });
  const nOptions = await page.$$eval('.card', els => els.length);
  console.log('options rendered:', nOptions);
  // open the first chart
  await page.click('.card [data-act="chart"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '3-chart.png') });
  // guitar
  await page.click('.chart [data-inst] button[data-v="both"]');
  await page.waitForTimeout(400);
  const card = await page.$('.card.open');
  await card.screenshot({ path: path.join(out, '4-card-both.png') });
  // gospel depth 5
  await page.click('#styleSeg button[data-style="gospel"]');
  for (let i = 0; i < 4; i++) { if (await page.$eval("#depthUp", b => !b.disabled)) await page.click("#depthUp"); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '5-gospel.png') });
  const devices = await page.$$eval('.card .device', els => els.map(e => e.textContent));
  console.log('gospel d5 devices:', devices.join(' | '));
  // keep → save to section
  await page.click('.card [data-act="keep"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '6-keep.png') });
  await page.click('#keepSecs [data-sec]');
  await page.waitForTimeout(300);
  // song tab
  await page.click('nav.tabbar button[data-tab="song"]');
  await page.waitForTimeout(400);
  await page.click('.section [data-edit]');
  await page.waitForTimeout(200);
  await page.fill('textarea[data-lyr]', 'I keep the light on for you\nlong after the street goes quiet\nevery car that passes could be yours\nnone of them are');
  await page.click('.section [data-place]');
  await page.waitForTimeout(200);
  await page.click('.section [data-edit]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '7-song.png') });
  // listen tab → tap mode
  await page.click('nav.tabbar button[data-tab="listen"]');
  await page.click('#inputMode button[data-m="tap"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '8-tap.png') });
  // circle
  await page.click('nav.tabbar button[data-tab="circle"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '9-circle.png') });
  // settings → paper look
  await page.click('#settingsBtn'); await page.waitForTimeout(200);
  await page.click('#sLook button[data-v="paper"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '10-settings-paper.png') });
  await page.keyboard.press('Escape');
  await page.click('nav.tabbar button[data-tab="ideas"]'); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '11-ideas-paper.png') });
  // horizontal overflow check
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log('horizontal overflow:', overflow);
  const pianoSrc = await page.evaluate(() => Audio.PIANO.source);
  console.log('piano source:', pianoSrc);
  console.log('console issues:', errors.length ? errors.join('\n') : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
