// Browser run-through (Playwright + headless Chrome): node src/test_browser.js
// Serves the repo root over HTTP so ../piano/ resolves and the sampled grand loads.
const { chromium } = require('playwright');
const path = require('path');
const { spawn } = require('child_process');
const PORT = 8765;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..', '..'), stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch (e) {} });
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const url = `http://127.0.0.1:${PORT}/ears/`;
  await new Promise(r => setTimeout(r, 800));
  await page.goto(url);
  await page.waitForTimeout(300);
  const shot = (n) => page.screenshot({ path: path.join(__dirname, '..', 'dist', 'shots', n + '.png') });
  require('fs').mkdirSync(path.join(__dirname, '..', 'dist', 'shots'), { recursive: true });
  await shot('01-onboarding');
  await page.fill('#ob-name', 'Test Student');
  await page.click('[data-act="ob-skip"]');
  await page.waitForTimeout(200);
  await shot('02-today');
  // sampled piano: index.json fetched, samples decoded after the first gesture
  await page.waitForFunction(() => EARS.Audio.PIANO.ready, null, { timeout: 15000 }).catch(() => errors.push('piano index.json did not load'));
  await page.waitForFunction(() => EARS.Audio.pianoStatus() === 'sampled', null, { timeout: 60000 }).catch(() => errors.push('piano samples did not decode'));
  const pst = await page.evaluate(() => ({ status: EARS.Audio.pianoStatus(), loaded: EARS.Audio.PIANO.loaded, total: EARS.Audio.PIANO.total, sw: !!navigator.serviceWorker.controller || 'pending' }));
  console.log('piano', JSON.stringify(pst));

  async function answerCurrent(prefCorrect) {
    const info = await page.evaluate(() => { const S = EARS.App.Sess; const ex = S.ex; return { kind: ex.answerKind, answer: ex.answer, module: ex.module, type: ex.type, answered: S.answered, n: ex.answer ? ex.answer.length : 0 }; });
    if (info.answered) return info;
    if (info.kind === 'choice') {
      const correct = Math.random() < prefCorrect;
      if (correct) { const okc = await page.evaluate(a => { const b = Array.from(document.querySelectorAll('#answer-area .ans')).find(x => x.dataset.id === String(a)); if (b) { b.click(); return true; } return false; }, info.answer); if (!okc) await page.click('#answer-area .ans >> nth=0'); }
      else await page.click('#answer-area .ans >> nth=0');
    } else if (info.kind === 'sequence') {
      for (const s of info.answer) { const id = Math.random() < prefCorrect ? s : (await page.evaluate(() => EARS.App.Sess.ex.palette[0].id)); await page.evaluate(a => { const b = Array.from(document.querySelectorAll('#answer-area .ans')).find(x => x.dataset.id === String(a)); if (b) b.click(); }, id); }
      await page.click('[data-act="seq-check"]');
    } else if (info.kind === 'multi') {
      for (const s of info.answer) { const id = Math.random() < prefCorrect ? s : (await page.evaluate(() => EARS.App.Sess.ex.palette[0].id)); await page.evaluate(a => { const b = Array.from(document.querySelectorAll('#answer-area .ans')).find(x => x.dataset.id === String(a)); if (b) b.click(); }, id); }
      await page.click('[data-act="multi-check"]');
    } else if (info.kind === 'tap') {
      await page.click('#play-btn');
      // tap along with expected onsets using the real audio clock
      const startAt = Date.now();
      await page.waitForFunction(() => ['count', 'tap'].includes(EARS.App.Sess.tapState), null, { timeout: 30000 });
      const sch = await page.evaluate(() => { const ex = EARS.App.Sess.ex; return { onsets: EARS.Rhythm.onsets(ex.pattern).map(o => o.at / ex.tps), t0: EARS.App.Sess.tapT0, now: EARS.Audio.now() }; });
      for (const o of sch.onsets) { const wait = (sch.t0 + o - sch.now) * 1000 - (Date.now() - startAt) * 0; await page.evaluate(async (ms) => { await new Promise(r => setTimeout(r, Math.max(0, ms))); }, 0); }
      // simpler: fire taps via evaluate at scheduled times
      await page.evaluate(({ onsets }) => { const S = EARS.App.Sess; onsets.forEach(o => { const ms = (S.tapT0 + o - EARS.Audio.now()) * 1000; setTimeout(() => { if (S.tapState === 'tap' || S.tapState === 'count') S.taps.push(EARS.Audio.now() - S.tapT0); }, Math.max(0, ms)); }); }, sch);
      await page.waitForFunction(() => EARS.App.Sess.answered, null, { timeout: 40000 });
    } else if (info.kind === 'sing') {
      await page.click('[data-act="sing-rec"]');
      await page.waitForTimeout(2500);
      const ph = await page.evaluate(() => EARS.App.Sess.sing.phase);
      if (ph === 'rec') await page.click('[data-act="sing-stop"]');
      await page.waitForTimeout(300);
    }
    return info;
  }
  async function runSession(label, maxQ, prefCorrect) {
    let q = 0;
    while (q < maxQ) {
      const active = await page.evaluate(() => EARS.App.Sess.active);
      if (!active) break;
      await page.waitForTimeout(150);
      const info = await answerCurrent(prefCorrect);
      await page.waitForTimeout(200);
      if (q === 0) await shot(label + '-q1-feedback');
      const fbText = await page.evaluate(() => (document.querySelector('#feedback .verdict') || {}).textContent || '');
      if (!fbText) errors.push(`no feedback rendered for ${info.module}/${info.type}/${info.kind}`);
      await page.click('[data-act="next"]');
      await page.waitForTimeout(150);
      q++;
    }
    await shot(label + '-end');
  }

  // 1) Today session at level 1
  await page.click('[data-act="start-today"]');
  await page.waitForTimeout(500);
  await shot('03-session-q1');
  await runSession('04-today', 20, 0.75);

  // 2) each module at each level, 2 questions each
  for (const m of ['intervals', 'degrees', 'melody', 'chords', 'scales', 'progressions', 'rhythm']) {
    for (const l of [2, 3, 4, 5]) {
      await page.evaluate(({ m, l }) => { EARS.App.state.levels[m] = l; }, { m, l });
      await page.evaluate(m => EARS.App.startSession({ modules: [m], count: 3 }), m);
      await page.waitForTimeout(300);
      await runSession(`05-${m}-L${l}`, 3, 0.6);
    }
  }
  // 3) rhythm sub types
  for (const sub of ['dictation', 'error', 'tap']) {
    await page.evaluate(sub => EARS.App.startSession({ modules: ['rhythm'], count: 2, sub }), sub);
    await page.waitForTimeout(300);
    await runSession('06-rhythm-' + sub, 2, 0.7);
  }
  // 4) sing
  await page.evaluate(() => EARS.App.startSession({ queue: [{ module: 'sing', target: 'sing:scale:majpent' }, { module: 'sing', target: 'sing:echo' }] }));
  await page.waitForTimeout(300);
  await shot('07-sing');
  await runSession('07-sing', 2, 1);
  // 5) placement
  await page.click('nav.tabs button[data-tab="today"]');
  await page.evaluate(() => document.querySelector('[data-act="ob-placement"]') && document.querySelector('[data-act="ob-placement"]').click());
  await page.waitForTimeout(300);
  await runSession('08-placement', 30, 0.7);
  // 6) tabs
  for (const t of ['train', 'sing', 'progress', 'me']) { await page.click(`nav.tabs button[data-tab="${t}"]`); await page.waitForTimeout(200); await shot('09-' + t); }
  await page.click('nav.tabs button[data-tab="train"]'); await page.waitForTimeout(200);
  await page.click('[data-act="module"][data-m="intervals"]'); await page.waitForTimeout(200); await shot('10-module-sheet');
  await page.click('[data-act="close-sheet"]');
  await page.click('nav.tabs button[data-tab="me"]'); await page.click('[data-act="assign-builder"]'); await page.waitForTimeout(200);
  await page.click('.as-m[value="intervals"]'); await page.click('[data-act="assign-make"]'); await page.waitForTimeout(200); await shot('11-assign');
  const acode = await page.evaluate(() => document.querySelector('#as-out .code').textContent);
  await page.click('[data-act="close-sheet"]');
  await page.click('nav.tabs button[data-tab="today"]'); await page.click('[data-act="assign-code"]'); await page.fill('#asg-in', acode); await page.click('[data-act="assign-load"]'); await page.waitForTimeout(400); await shot('12-assignment-loaded');
  await page.click('[data-act="start-assignment"]'); await page.waitForTimeout(300); await runSession('13-assignment', 25, 0.8);
  const code = await page.evaluate(() => (document.querySelector('.code') || {}).textContent);
  if (!code) errors.push('no result code after assignment');
  await page.click('nav.tabs button[data-tab="me"]'); await page.click('[data-act="decode-result"]'); await page.fill('#dec-in', code || ''); await page.click('[data-act="decode-go"]'); await page.waitForTimeout(200); await shot('14-decoded');
  // desktop
  await page.setViewportSize({ width: 1280, height: 800 }); await page.click('[data-act="close-sheet"]'); await page.click('nav.tabs button[data-tab="today"]'); await page.waitForTimeout(200); await shot('15-desktop');
  // light theme
  await page.click('nav.tabs button[data-tab="me"]'); await page.click('[data-act="toggle"][data-k="light"]'); await page.waitForTimeout(200); await shot('16-light');

  console.log('ERRORS (' + errors.length + '):'); errors.slice(0, 40).forEach(e => console.log(' -', e));
  const st = await page.evaluate(() => ({ q: EARS.App.state.stats.q, cards: Object.keys(EARS.App.state.cards).length, levels: EARS.App.state.levels }));
  console.log('state', JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
