// sync.js — accounts and sync over Supabase's REST and auth endpoints (no SDK). Songs live on this device first;
// with an account they are mirrored to the server and merged by last change. Configure SYNC.url and SYNC.key at
// build time; with them empty the app runs exactly as before and Settings explains what is missing.
const Sync = (() => {
  const SYNC = { url: '__SUPABASE_URL__', key: '__SUPABASE_KEY__' };
  const configured = () => /^https:\/\//.test(SYNC.url) && SYNC.key.length > 20;
  const ST = { session: null, user: null, busy: false, last: null, onChange: null };
  const KEY = 'changes.session';
  function loadSession() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.access_token) { ST.session = s; ST.user = s.user; } } catch (e) {} }
  function saveSession() { try { if (ST.session) localStorage.setItem(KEY, JSON.stringify(ST.session)); else localStorage.removeItem(KEY); } catch (e) {} }
  const headers = (auth) => { const h = { 'Content-Type': 'application/json', apikey: SYNC.key }; if (auth && ST.session) h.Authorization = 'Bearer ' + ST.session.access_token; else h.Authorization = 'Bearer ' + SYNC.key; return h; };

  // Magic link: the user gets an email; the link returns to the app with the session in the URL hash.
  async function signIn(email) {
    if (!configured()) return { ok: false, reason: 'not configured' };
    const r = await fetch(SYNC.url + '/auth/v1/otp', { method: 'POST', headers: headers(false), body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: location.href.split('#')[0] } }) });
    if (!r.ok) return { ok: false, reason: (await r.text()).slice(0, 200) };
    return { ok: true };
  }
  // On load: a hash like #access_token=...&refresh_token=... completes the sign-in.
  async function completeFromHash() {
    if (!configured() || !location.hash.includes('access_token=')) return false;
    const p = new URLSearchParams(location.hash.slice(1));
    const access = p.get('access_token'), refresh = p.get('refresh_token');
    if (!access) return false;
    history.replaceState(null, '', location.pathname + location.search);
    ST.session = { access_token: access, refresh_token: refresh, expires_at: Date.now() / 1000 + (+p.get('expires_in') || 3600) };
    const u = await fetch(SYNC.url + '/auth/v1/user', { headers: headers(true) });
    if (u.ok) { ST.user = await u.json(); ST.session.user = ST.user; saveSession(); return true; }
    ST.session = null; return false;
  }
  async function refresh() {
    if (!ST.session || !ST.session.refresh_token) return false;
    if (ST.session.expires_at && ST.session.expires_at - Date.now() / 1000 > 120) return true;
    const r = await fetch(SYNC.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: headers(false), body: JSON.stringify({ refresh_token: ST.session.refresh_token }) });
    if (!r.ok) { ST.session = null; ST.user = null; saveSession(); return false; }
    const j = await r.json(); ST.session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() / 1000 + (j.expires_in || 3600), user: j.user }; ST.user = j.user; saveSession(); return true;
  }
  function signOut() { ST.session = null; ST.user = null; saveSession(); }

  // Songs table: id text primary key, user_id uuid, data jsonb, updated bigint; RLS: user_id = auth.uid()
  async function push(songs) {
    if (!ST.session || !(await refresh())) return { ok: false };
    const rows = songs.map(s => ({ id: s.id, user_id: ST.user.id, data: s, updated: s.updated || Date.now() }));
    const r = await fetch(SYNC.url + '/rest/v1/songs?on_conflict=id', { method: 'POST', headers: Object.assign(headers(true), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(rows) });
    ST.last = Date.now();
    return { ok: r.ok, status: r.status };
  }
  async function pull() {
    if (!ST.session || !(await refresh())) return null;
    const r = await fetch(SYNC.url + '/rest/v1/songs?select=id,data,updated&order=updated.desc', { headers: headers(true) });
    if (!r.ok) return null;
    return (await r.json()).map(row => Object.assign({}, row.data, { updated: row.updated }));
  }
  // Merge server songs into local by id and last-updated time; returns the merged list and whether anything changed
  function merge(local, remote) {
    const byId = new Map(local.map(s => [s.id, s])); let changed = false;
    for (const r of remote) { const l = byId.get(r.id); if (!l || (r.updated || 0) > (l.updated || 0)) { byId.set(r.id, r); changed = true; } }
    return { songs: [...byId.values()].sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0)), changed };
  }
  let timer = null;
  function schedulePush(getSongs) { if (!ST.session) return; clearTimeout(timer); timer = setTimeout(() => { push(getSongs()).catch(() => {}); }, 2500); }

  return { SYNC, configured, ST, loadSession, signIn, completeFromHash, refresh, signOut, push, pull, merge, schedulePush };
})();
if (typeof module !== 'undefined') module.exports = Sync;
