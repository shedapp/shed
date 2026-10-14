const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(__dirname, 'dist', 'singer.wav')] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/shed.html');
  await page.setInputFiles('#file', path.join(__dirname, 'dist', 'test.wav'));
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
  await page.click('#mic'); await page.waitForTimeout(2500);
  const a = await page.evaluate(() => window.__tk());
  console.log('mic on 2.5 s → voiced frames', a.log, '(≈', (a.log / 2.5).toFixed(0), '/s) · note', await page.textContent('#note'), await page.textContent('#hz'));
  // zoom
  for (let i = 0; i < 3; i++) await page.click('#zIn');
  console.log('zoom label', await page.textContent('#zLbl'), 'level', (await page.evaluate(() => window.__tk())).zoom);
  await page.waitForTimeout(800);
  await page.locator('.tracewrap').screenshot({ path: 'dist/shot-zoom.png' });
  // a take: play with mic on for 6 s, then pause
  await page.click('#play'); await page.waitForTimeout(6000);
  console.log('during take:', JSON.stringify(await page.evaluate(() => window.__tk())), 'rec btn:', await page.textContent('#rec'));
  await page.click('#play'); await page.waitForTimeout(1500);
  console.log('after pause:', JSON.stringify(await page.evaluate(() => window.__tk())), 'chips:', await page.locator('#takes button').count(), '|', (await page.textContent('#takes')).trim());
  // review it
  await page.click('#takes button'); await page.waitForTimeout(800);
  console.log('review open:', JSON.stringify(await page.evaluate(() => window.__rev())), 'bar hidden?', await page.isHidden('#reviewBar'));
  await page.click('#revPlay'); await page.waitForTimeout(2000);
  console.log('review playing:', JSON.stringify(await page.evaluate(() => window.__rev())), 'note', await page.textContent('#note'));
  await page.locator('section.panel').nth(1).screenshot({ path: 'dist/shot-review.png' });
  // persists across reload
  await page.click('#revExit'); await page.reload(); await page.waitForTimeout(800);
  await page.click('#recent button'); await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready'); await page.waitForTimeout(500);
  console.log('after reload: chips', await page.locator('#takes button').count(), '| zoom kept', await page.textContent('#zLbl'));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  console.log('phone overflow', await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
  await page.click('#takes button'); await page.waitForTimeout(600);
  await page.locator('section.panel').nth(1).screenshot({ path: 'dist/shot-review-phone.png' });
  console.log('errors', errors); await browser.close();
})();
