/* PanoramIA — event delegation and start-up. */
(function (root) {
  'use strict';
  var PX = root.PX, DB = root.PX_DB, A = PX.actions, state = PX.state;

  function dispatch(el, ev) {
    var name = el.getAttribute('data-action'), arg = el.getAttribute('data-arg');
    var fn = A[name];
    if (!fn) { console.warn('no action', name); return; }
    try { fn(arg, el, ev); } catch (e) { console.error(e); PX.toast(PX.t('error') + ': ' + (e && e.message ? e.message : e), 'crit'); }
  }
  var CHANGE_ONLY = { checkbox: 1, radio: 1, file: 1 };

  document.addEventListener('click', function (ev) {
    var tooth = ev.target.closest && ev.target.closest('rect[data-fdi]');
    if (tooth && tooth.closest('[data-odont]')) { A['odont:click'](tooth.getAttribute('data-fdi'), tooth, ev); return; }
    var el = ev.target.closest && ev.target.closest('[data-action]');
    if (!el) return;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (tag === 'A') ev.preventDefault();
    dispatch(el, ev);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (!el.getAttribute || !el.getAttribute('data-action')) return;
    var tag = el.tagName;
    if (tag === 'SELECT' || (tag === 'INPUT' && CHANGE_ONLY[el.type])) dispatch(el, ev);
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.getAttribute || !el.getAttribute('data-action')) return;
    var tag = el.tagName;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && !CHANGE_ONLY[el.type] && el.type !== 'file')) dispatch(el, ev);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && PX.modalOpen()) {
      if (PX.byId('ack-enter')) return;
      if (PX.qs('#modal-root [data-action="import:cancel"]')) return;
      PX.closeModal();
    }
    if (ev.key === 'Enter' && ev.target && ev.target.classList && ev.target.classList.contains('tile')) { var a = ev.target.getAttribute('data-action'); if (a) dispatch(ev.target, ev); }
  });
  window.addEventListener('hashchange', function () { var r = PX.routeFromHash(); if (r !== state.route) { state.route = r; PX.render(); } });

  function start() {
    PX.loadSettings();
    PX.initDownloads();
    DB.open().then(function (r) {
      state.storageMemory = !!r.memory;
      return PX.refreshAll();
    }).then(function () {
      state.route = PX.routeFromHash();
      PX.render();
      if (state.settings.ack && state.cases.length === 0 && !state.settings.demoLoadedOnce) {
        return PX.loadDemo().then(function () { return PX.loadOpenData(); }).then(function () { PX.render(); PX.toast(PX.t('demoLoaded')); });
      }
      // Browsers that already had data before an open dataset existed get each embedded subset once, on top of their data.
      if (state.settings.ack) {
        var pending = PX.openSets().filter(function (o) { return !PX.hasOpenData(o.key) && !(state.settings.openLoadedKeys || {})[o.key]; });
        if (pending.length) {
          return pending.reduce(function (p, o) { return p.then(function () { return PX.loadOpenData(o.key); }); }, Promise.resolve()).then(function () { PX.render(); PX.toast(PX.t('openLoaded', { n: PX.openDataCount() })); });
        }
      }
    }).catch(function (e) {
      console.error(e);
      try { state.route = PX.routeFromHash(); PX.render(); } catch (e2) {}
      PX.toast('Start-up error: ' + (e && e.message ? e.message : e), 'crit');
    });
    // re-render when the downloads capability resolves late, so export buttons appear
    setTimeout(function () { if (state.downloads && state.settings.ack && (state.route === 'gobernanza' || state.route === 'evaluacion')) PX.render(); }, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
