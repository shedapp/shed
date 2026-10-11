const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const sr = 44100;
function wav(secs, bits) {
  const n = sr * secs, bps = bits / 8, buf = Buffer.alloc(44 + n * 2 * bps);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2 * bps, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2 * bps, 28); buf.writeUInt16LE(2 * bps, 32); buf.writeUInt16LE(bits, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2 * bps, 40);
  let o = 44;
  for (let i = 0; i < n; i++) { const s = 0.5 * Math.sin(2 * Math.PI * 220 * i / sr) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 1.5 * i / sr)); for (let c = 0; c < 2; c++) { if (bits === 16) { buf.writeInt16LE(Math.round(s * 32767), o); } else { const x = Math.round(s * 8388607); buf.writeUInt8(x & 255, o); buf.writeUInt8((x >> 8) & 255, o + 1); buf.writeUInt8((x >> 16) & 255, o + 2); } o += bps; } }
  return buf;
}
const long = path.join(__dirname, 'dist', 'long.wav'); fs.writeFileSync(long, wav(180, 16));
const w24 = path.join(__dirname, 'dist', 't24.wav'); fs.writeFileSync(w24, wav(5, 24));
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL/.test(m.text())) errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, 'dist', 'shed.html'));
  await page.setInputFiles('#file', long);
  await page.waitForFunction(() => /Rendering/.test(document.getElementById('status').textContent), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  console.log('status while rendering:', await page.textContent('#status'));
  // change key mid-render, several times quickly (like a user tapping)
  await page.click('#kup'); await page.waitForTimeout(100); await page.click('#kup'); await page.waitForTimeout(100); await page.click('#kdown');
  await page.waitForTimeout(500);
  console.log('after key taps:', await page.textContent('#status'), await page.textContent('#keybig'));
  await page.click('#play');
  await page.waitForTimeout(2500);
  console.log('playing? tcur', await page.textContent('#tcur'), 'status', await page.textContent('#status'));
  const t0 = Date.now();
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready', null, { timeout: 120000 });
  console.log('full 3-min render finished in', ((Date.now() - t0) / 1000).toFixed(1), 's; freq check', JSON.stringify(await page.evaluate(() => { const s = window.__shed(); return { hz: s.hz.toFixed(1), chunks: s.ready.length }; })));
  // 24-bit wav
  await page.setInputFiles('#file', w24);
  await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready', null, { timeout: 30000 });
  console.log('24-bit wav loaded, dur', await page.textContent('#tdur'));
  console.log('errors', errors);
  await browser.close();
})();
