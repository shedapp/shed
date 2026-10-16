const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ref = JSON.parse(fs.readFileSync('/tmp/claude-0/sp/ref.json'));
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(__dirname, 'dist', 'singer.wav')] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|favicon|ERR_/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/shed.html');
  await page.setInputFiles('#file', path.join(__dirname, 'dist', process.env.SAME ? 'singer.wav' : 'test.wav'));
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
  const dur = await page.evaluate(() => window.__dbg && 0);
  await page.evaluate(([ref, d]) => { window.__setRef(ref.filter(p => p.t < d).map(p => ({ frac: p.t / d, midi: p.midi })), 0); }, [ref, process.env.SAME ? 30 : 12]);
  await page.click('#mic'); await page.waitForTimeout(300);
  await page.click('#play'); await page.waitForTimeout(5000);
  const st = await page.evaluate(() => window.__lane());
  console.log('lane state', JSON.stringify(st));
  await page.locator('#trace').screenshot({ path: 'dist/shot-lane.png' });
  await page.waitForTimeout(3000); await page.locator('#trace').screenshot({ path: 'dist/shot-lane2.png' });
  await page.click('#play'); await page.waitForTimeout(1500); await page.locator('#trace').screenshot({ path: 'dist/shot-lane-paused.png' });
  console.log('score card hidden?', await page.isHidden('#scoreCard'), '|', (await page.textContent('#scoreNum')), (await page.textContent('#scoreWord')), '|', (await page.textContent('#scoreSub')), '| spots', await page.locator('#scoreSpots button').count());
  await page.locator('section.panel').nth(1).screenshot({ path: 'dist/shot-monitor.png' });
  if (await page.locator('#scoreSpots button').count()) { await page.click('#scoreSpots button'); await page.waitForTimeout(300); console.log('loop set from spot:', await page.evaluate(() => window.__dbg().playing), await page.textContent('#tcur')); await page.click('#play'); }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  await page.click('#play'); await page.waitForTimeout(2000); await page.locator('#trace').screenshot({ path: 'dist/shot-lane-phone.png' });
  console.log('phone overflow', await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
  console.log('errors', errors); await browser.close();
})();
