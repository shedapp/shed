const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// make a 12s stereo wav: 220 Hz + 330 Hz, with amplitude pulses
const sr = 44100, secs = 12, n = sr * secs;
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { const env = 0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * i / sr); const v = Math.round(env * 12000 * Math.sin(2 * Math.PI * 220 * i / sr)); const w = Math.round(env * 9000 * Math.sin(2 * Math.PI * 330 * i / sr)); buf.writeInt16LE(v, 44 + i * 4); buf.writeInt16LE(w, 46 + i * 4); }
const wavPath = path.join(__dirname, 'dist', 'test.wav'); fs.writeFileSync(wavPath, buf);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, 'dist', 'shed.html'));
  await page.setInputFiles('#file', wavPath);
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready', null, { timeout: 60000 });
  console.log('render(0,100) done; dur', await page.textContent('#tdur'));
  // shift +12 and 75% speed
  await page.click('[data-k="12"]');
  await page.click('[data-s="75"]');
  const t0 = Date.now();
  await page.waitForTimeout(400);
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready', null, { timeout: 60000 });
  console.log('render(+12,75%) took', Date.now() - t0, 'ms; dur', await page.textContent('#tdur'), 'keylbl', await page.textContent('#keylbl'));
  // inspect the rendered audio: zero-crossing freq of a mid section
  const stats = await page.evaluate(() => new Promise(res => {
    // reach into engine via export: rebuild from the WAV exporter path is private; instead grab via a hook on the worker output stored on window? we expose S for tests
    res(window.__shed ? window.__shed() : null);
  }));
  console.log('stats', JSON.stringify(stats));
  await page.click('#play');
  await page.waitForTimeout(1500);
  const tcur = await page.textContent('#tcur');
  console.log('ctx', await page.evaluate(() => window.__ctx ? [window.__ctx.state, window.__ctx.currentTime] : 'n/a'));
  console.log('playing, tcur after 1.5s:', tcur, 'button:', await page.textContent('#play'));
  // loop
  await page.click('#setA'); await page.waitForTimeout(800); await page.click('#setB');
  console.log('loop label:', await page.textContent('#looplbl'));
  await page.click('#mic'); await page.waitForTimeout(2500);
  console.log('mic button:', await page.textContent('#mic'), 'note:', await page.textContent('#note'));
  await page.screenshot({ path: path.join(__dirname, 'dist', 'shot-desktop.png') });
  await page.setViewportSize({ width: 400, height: 900 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log('phone horizontal overflow:', overflow);
  await page.screenshot({ path: path.join(__dirname, 'dist', 'shot-phone.png'), fullPage: true });
  console.log('errors:', errors);
  await browser.close();
})();
