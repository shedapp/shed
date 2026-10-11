const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type()==='error' && !/ERR_TUNNEL/.test(m.text())) errors.push(m.text()); });
  const url = 'file://' + path.join(__dirname, 'dist', 'shed.html');
  await page.goto(url);
  await page.setInputFiles('#file', path.join(__dirname, 'dist', 'test.wav'));
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
  await page.click('[data-k="2"]'); await page.waitForTimeout(900);
  console.log('recent chips:', await page.locator('#recent button').count());
  // reload page: recent should persist and restore key +2
  await page.reload(); await page.waitForTimeout(500);
  console.log('after reload chips:', await page.locator('#recent button').count());
  await page.click('#recent button'); await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
  console.log('restored key:', await page.textContent('#keybig'), 'song:', await page.textContent('#songname'));
  // record a take over a loop
  await page.click('#setA'); await page.click('#fwd'); await page.click('#setB');
  await page.click('#rec'); await page.waitForTimeout(1500);
  console.log('rec button while recording:', await page.textContent('#rec'), 'mic:', await page.textContent('#mic'));
  await page.click('#rec'); await page.waitForTimeout(200);
  console.log('playTake enabled:', !(await page.isDisabled('#playTake')));
  await page.click('#playTake'); await page.waitForTimeout(600); console.log('take btn:', await page.textContent('#playTake'));
  await page.click('#playTake');
  // reference
  await page.click('#refBtn'); await page.waitForTimeout(2500); await page.click('#refBtn'); await page.waitForTimeout(300);
  console.log('ref btn:', await page.textContent('#refBtn'), '| keyfind:', (await page.textContent('#keyfind')).slice(0,90));
  // tap piano
  const box = await page.locator('#piano').boundingBox(); await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8); await page.waitForTimeout(200);
  console.log('keyfind after tap:', (await page.textContent('#keyfind')).slice(0,140));
  // trainer
  await page.click('#trainer'); await page.waitForTimeout(400);
  console.log('trainer:', await page.textContent('#trainerInfo'), '| speed', await page.textContent('#spdlbl'));
  await page.waitForTimeout(6000);
  console.log('trainer later:', await page.textContent('#trainerInfo'), '| speed', await page.textContent('#spdlbl'));
  await page.click('#trainer');
  // warm-up
  await page.click('#warm'); await page.waitForTimeout(6500);
  console.log('warm:', await page.textContent('#warmTitle'), '|', await page.textContent('#warmInfo'));
  await page.click('#warmStop');
  await page.screenshot({ path: path.join(__dirname,'dist','shot-v2.png'), fullPage: true });
  await page.setViewportSize({ width: 400, height: 900 }); await page.waitForTimeout(300);
  console.log('overflow', await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth));
  await page.screenshot({ path: path.join(__dirname,'dist','shot-v2-phone.png'), fullPage: true });
  console.log('errors', errors); await browser.close();
})();
