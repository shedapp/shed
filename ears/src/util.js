/* ============================================================
   EARS — utilities
   ============================================================ */
(function (E) {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function sample(arr, n) { return shuffle(arr).slice(0, n); }
  function weighted(arr, wfn) { const ws = arr.map(wfn); const tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; }
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayOffset(dateStr, n) { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmtMin(secs) { const m = Math.round(secs / 60); return m < 60 ? m + ' min' : (m / 60).toFixed(1) + ' h'; }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function b64enc(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64dec(s) { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }
  E.U = { rnd, choice, shuffle, clamp, sample, weighted, today, dayOffset, esc, fmtMin, uid, sleep, b64enc, b64dec };
})(window.EARS = window.EARS || {});
