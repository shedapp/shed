'use strict';
// Minimal Chrome DevTools Protocol driver using Node 22's global WebSocket.
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => { let d = ''; res.on('data', (c) => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }).on('error', reject);
  });
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; this.listeners = [];
    ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); } else if (msg.method) { this.events.push(msg); this.listeners.forEach((l) => l(msg)); } };
  }
  send(method, params) { return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params: params || {} })); }); }
  async eval(expr, awaitPromise) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: !!awaitPromise, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result.value; }
  async shot(file, clip) { const r = await this.send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip } : {})); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; }
}

async function launch(opts) {
  opts = opts || {};
  const port = opts.port || 9333;
  const userDir = fs.mkdtempSync('/tmp/pxchrome-');
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + port, '--user-data-dir=' + userDir, '--window-size=' + (opts.width || 1440) + ',' + (opts.height || 1000), '--allow-file-access-from-files', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; chrome.stderr.on('data', (d) => { err += d; });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await getJson('http://127.0.0.1:' + port + '/json'); if (targets && targets.length) break; } catch (e) {} await sleep(250); }
  if (!targets) { chrome.kill(); throw new Error('chrome did not start: ' + err.slice(-500)); }
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: opts.width || 1440, height: opts.height || 1000, deviceScaleFactor: 1, mobile: false });
  const consoleMsgs = [];
  cdp.listeners.push((m) => { if (m.method === 'Runtime.consoleAPICalled') consoleMsgs.push(m.params.type + ': ' + m.params.args.map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ')); if (m.method === 'Runtime.exceptionThrown') consoleMsgs.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 600)); });
  cdp.consoleMsgs = consoleMsgs;
  cdp.close = () => { try { ws.close(); } catch (e) {} chrome.kill(); };
  cdp.navigate = async (url) => { await cdp.send('Page.navigate', { url }); await sleep(600); };
  return cdp;
}
module.exports = { launch, sleep };
