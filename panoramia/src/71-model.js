/* PanoramIA — in-browser inference of the trained detector (ONNX Runtime Web).
   The model is the Ultralytics YOLO export produced by training/train_yolo.py (output [1, 4+nc, N], xywh in letterboxed
   input pixels). Weights are fetched from `models/` next to the app (split in parts ≤ 18 MB so static hosts accept them),
   or from a URL the user gives. ONNX Runtime Web (MIT) is loaded from the same folder when present, else from jsDelivr.
   Nothing leaves the browser: the image is never uploaded anywhere. */
(function (root) {
  'use strict';
  var ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';
  var PAGES = 'https://shedapp.github.io/shed/panoramia/'; // public mirror of lib/ and models/ (GitHub Pages sends CORS *)
  var state = { ort: null, session: null, card: null, loading: null, source: null };

  function loadScript(src) {
    return new Promise(function (resolve, reject) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = function () { reject(new Error('script ' + src)); }; document.head.appendChild(s); });
  }
  function ensureOrt() {
    if (root.ort) { state.ort = root.ort; return Promise.resolve(root.ort); }
    var local = true;
    return loadScript('lib/ort.min.js').catch(function () { local = false; return loadScript(PAGES + 'lib/ort.min.js').catch(function () { return loadScript(ORT_CDN + 'ort.min.js'); }); }).then(function () {
      if (!root.ort) throw new Error('ONNX Runtime Web not available');
      // the wasm backend (.mjs loader + .wasm) comes from the CDN: the loader needs an absolute URL and both files
      root.ort.env.wasm.wasmPaths = ORT_CDN;
      root.ort.env.wasm.numThreads = 1;
      state.ort = root.ort; return root.ort;
    });
  }
  function fetchBytes(url) { return fetch(url, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return r.arrayBuffer(); }); }
  /** Loads the card (models/panoramia_model.json) and the weights (card.parts or card.file). */
  function load(base, onProgress) {
    base = (base || 'models/').replace(/([^/])$/, '$1/');
    if (state.session && state.source === base) return Promise.resolve(state.card);
    if (state.loading) return state.loading;
    var cardAt = function (b) { return fetch(b + 'panoramia_model.json', { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('no model card at ' + b); return r.json(); }); };
    state.loading = ensureOrt().then(function () { return cardAt(base).catch(function (e) { if (base === 'models/' ) { base = PAGES + 'models/'; return cardAt(base); } throw e; }); })
      .then(function (card) {
        var parts = card.parts || [card.file || 'panoramia_yolo.onnx'];
        var done = 0;
        return Promise.all(parts.map(function (p) { return fetchBytes(base + p).then(function (b) { done++; if (onProgress) onProgress(done, parts.length); return b; }); })).then(function (bufs) {
          var total = bufs.reduce(function (s, b) { return s + b.byteLength; }, 0), out = new Uint8Array(total), off = 0;
          bufs.forEach(function (b) { out.set(new Uint8Array(b), off); off += b.byteLength; });
          return state.ort.InferenceSession.create(out, { executionProviders: ['wasm'] }).then(function (sess) { state.session = sess; state.card = card; state.source = base; state.loading = null; return card; });
        });
      }).catch(function (e) { state.loading = null; throw e; });
    return state.loading;
  }
  function letterbox(img, size, stretch) {
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, s = Math.min(size / iw, size / ih), nw = Math.round(iw * s), nh = Math.round(ih * s), px = Math.floor((size - nw) / 2), py = Math.floor((size - nh) / 2);
    if (stretch) { nw = size; nh = size; px = 0; py = 0; }
    var cv = document.createElement('canvas'); cv.width = size; cv.height = size; var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = 'rgb(114,114,114)'; ctx.fillRect(0, 0, size, size); ctx.drawImage(img, 0, 0, iw, ih, px, py, nw, nh);
    var d = ctx.getImageData(0, 0, size, size).data, n = size * size, f = new Float32Array(3 * n);
    for (var i = 0; i < n; i++) { f[i] = d[i * 4] / 255; f[n + i] = d[i * 4 + 1] / 255; f[2 * n + i] = d[i * 4 + 2] / 255; }
    return { tensor: f, sx: stretch ? size / iw : s, sy: stretch ? size / ih : s, px: px, py: py, iw: iw, ih: ih };
  }
  function nms(boxes, scores, thr) {
    var order = scores.map(function (s, i) { return i; }).sort(function (a, b) { return scores[b] - scores[a]; }), keep = [];
    while (order.length) {
      var i = order.shift(); keep.push(i);
      order = order.filter(function (j) {
        var a = boxes[i], b = boxes[j], x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
        var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1), u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
        return inter / (u || 1) < thr;
      });
    }
    return keep;
  }
  /** Runs the model on an image element/bitmap; returns proposals in image pixels with the card's class names. */
  function predict(img, opts) {
    opts = opts || {};
    if (!state.session) return Promise.reject(new Error('model not loaded'));
    var card = state.card, size = card.imgsz || 640, names = card.classes || [], minScore = opts.minScore || 0.25;
    var lb = letterbox(img, size, card.preprocess === 'stretch'), ort = state.ort, t0 = performance.now();
    var input = new ort.Tensor('float32', lb.tensor, [1, 3, size, size]);
    var feeds = {}; feeds[state.session.inputNames[0]] = input;
    return state.session.run(feeds).then(function (res) {
      var out = res[state.session.outputNames[0]], dims = out.dims, data = out.data, nc = names.length || dims[1] - 4;
      var N = dims[2], C = dims[1], byClass = {};
      for (var k = 0; k < N; k++) {
        var best = 0, bc = -1;
        for (var c = 0; c < nc; c++) { var sc = data[(4 + c) * N + k]; if (sc > best) { best = sc; bc = c; } }
        if (best < minScore) continue;
        var cx = data[k], cy = data[N + k], w = data[2 * N + k], h = data[3 * N + k];
        (byClass[bc] = byClass[bc] || { boxes: [], scores: [] });
        byClass[bc].boxes.push([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]); byClass[bc].scores.push(best);
      }
      var props = [];
      Object.keys(byClass).forEach(function (c) {
        var g = byClass[c];
        nms(g.boxes, g.scores, 0.5).forEach(function (i) {
          var b = g.boxes[i], x1 = Math.max(0, (b[0] - lb.px) / lb.sx), y1 = Math.max(0, (b[1] - lb.py) / lb.sy), x2 = Math.min(lb.iw, (b[2] - lb.px) / lb.sx), y2 = Math.min(lb.ih, (b[3] - lb.py) / lb.sy);
          if (x2 - x1 < 2 || y2 - y1 < 2) return;
          props.push({ code: names[c] || String(c), score: Math.round(g.scores[i] * 1000) / 1000, box: { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) },
            shape: { type: 'rect', points: [[Math.round(x1), Math.round(y1)], [Math.round(x2), Math.round(y1)], [Math.round(x2), Math.round(y2)], [Math.round(x1), Math.round(y2)]] },
            how: 'modelo ' + (card.name || 'ONNX') + ' · score ' + g.scores[i].toFixed(2) });
        });
      });
      return { proposals: props, model: card, ms: Math.round(performance.now() - t0), width: lb.iw, height: lb.ih };
    });
  }
  root.PX_MODEL = { load: load, predict: predict, ready: function () { return !!state.session; }, card: function () { return state.card; }, _internal: { letterbox: letterbox, nms: nms } };
})(typeof window !== 'undefined' ? window : globalThis);
