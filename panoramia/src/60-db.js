/* PanoramIA — local storage: IndexedDB with an in-memory fallback. Nothing leaves the browser. */
(function (root) {
  'use strict';
  var DB_NAME = 'panoramia_v1', DB_VERSION = 1;
  var STORES = {
    cases: { keyPath: 'id', indexes: [['status', 'status']] },
    images: { keyPath: 'caseId', indexes: [] },
    annotations: { keyPath: 'id', indexes: [['caseId', 'caseId']] },
    checklists: { keyPath: 'id', indexes: [['caseId', 'caseId']] },
    audit: { keyPath: 'id', indexes: [['ts', 'ts']] }
  };

  var db = null, memory = null;

  function openMemory() {
    memory = {};
    Object.keys(STORES).forEach(function (s) { memory[s] = {}; });
  }

  function open() {
    return new Promise(function (resolve) {
      try {
        if (typeof indexedDB === 'undefined') { openMemory(); return resolve({ ok: true, memory: true }); }
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (ev) {
          var d = ev.target.result;
          Object.keys(STORES).forEach(function (name) {
            if (!d.objectStoreNames.contains(name)) {
              var os = d.createObjectStore(name, { keyPath: STORES[name].keyPath });
              STORES[name].indexes.forEach(function (ix) { os.createIndex(ix[0], ix[1], { unique: false }); });
            }
          });
        };
        req.onsuccess = function (ev) { db = ev.target.result; db.onversionchange = function () { try { db.close(); } catch (e) {} }; resolve({ ok: true, memory: false }); };
        req.onerror = function () { openMemory(); resolve({ ok: true, memory: true }); };
        req.onblocked = function () { openMemory(); resolve({ ok: true, memory: true }); };
      } catch (e) { openMemory(); resolve({ ok: true, memory: true }); }
    });
  }

  function tx(store, mode, fn) {
    return new Promise(function (resolve, reject) {
      if (memory) {
        try { resolve(fn(null)); } catch (e) { reject(e); }
        return;
      }
      try {
        var t = db.transaction(store, mode);
        var os = t.objectStore(store);
        var out;
        var r = fn(os);
        if (r && typeof r.then === 'function') { r.then(function (v) { out = v; }); }
        else out = r;
        t.oncomplete = function () { resolve(out); };
        t.onerror = function (ev) { reject(ev.target.error || new Error('tx error')); };
        t.onabort = function (ev) { reject(ev.target.error || new Error('tx abort')); };
      } catch (e) { reject(e); }
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) { req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); }; });
  }

  function put(store, obj) {
    if (memory) { memory[store][obj[STORES[store].keyPath]] = clone(obj); return Promise.resolve(obj); }
    return tx(store, 'readwrite', function (os) { os.put(obj); return obj; });
  }
  function get(store, key) {
    if (memory) { var v = memory[store][key]; return Promise.resolve(v === undefined ? undefined : clone(v)); }
    return new Promise(function (resolve, reject) {
      try { var t = db.transaction(store, 'readonly'); reqToPromise(t.objectStore(store).get(key)).then(resolve, reject); } catch (e) { reject(e); }
    });
  }
  function getAll(store) {
    if (memory) { return Promise.resolve(Object.keys(memory[store]).map(function (k) { return clone(memory[store][k]); })); }
    return new Promise(function (resolve, reject) {
      try { var t = db.transaction(store, 'readonly'); reqToPromise(t.objectStore(store).getAll()).then(resolve, reject); } catch (e) { reject(e); }
    });
  }
  function getAllBy(store, index, value) {
    if (memory) { return Promise.resolve(Object.keys(memory[store]).map(function (k) { return memory[store][k]; }).filter(function (o) { return o[index] === value; }).map(clone)); }
    return new Promise(function (resolve, reject) {
      try { var t = db.transaction(store, 'readonly'); reqToPromise(t.objectStore(store).index(index).getAll(value)).then(resolve, reject); } catch (e) { reject(e); }
    });
  }
  function del(store, key) {
    if (memory) { delete memory[store][key]; return Promise.resolve(); }
    return tx(store, 'readwrite', function (os) { os.delete(key); });
  }
  function clear(store) {
    if (memory) { memory[store] = {}; return Promise.resolve(); }
    return tx(store, 'readwrite', function (os) { os.clear(); });
  }
  function clearAll() {
    return Promise.all(Object.keys(STORES).map(clear));
  }
  function clone(o) {
    // Blobs cannot be structured-cloned in all engines through JSON; keep references for memory mode.
    if (o && typeof o === 'object' && (o.blob instanceof Blob || o.raw)) return Object.assign({}, o);
    try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
  }

  root.PX_DB = { open: open, put: put, get: get, getAll: getAll, getAllBy: getAllBy, del: del, clear: clear, clearAll: clearAll, isMemory: function () { return !!memory; }, STORES: STORES };
})(typeof window !== 'undefined' ? window : globalThis);
