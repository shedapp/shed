/* PanoramIA — experimental radiopacity detector v0.1 (transparent image-processing rules, NOT a trained model).
   Purpose: show the proposal → confirmation → evaluation loop on real images with measured performance.
   Measured on the 333 AKUDENTAL panoramics against the expert structures (fillings/crowns, bridges, implants), IoU ≥ 0.25:
   sensitivity 0.664, positive predictive value 0.629 (tools/eval_detector.js reproduces the numbers with this exact code).
   It cannot see caries, periapical lesions or anything that is not a bright, locally contrasting blob. */
(function (root) {
  'use strict';

  var VERSION = '0.1.0';
  var MEASURED = { dataset: 'AKUDENTAL', images: 333, tp: 754, fp: 444, fn: 381, sensitivity: 0.664, ppv: 0.629, iou: 0.25 };
  var DEFAULTS = { thrAbs: 220, contrast: 60, minArea: 150, maxHeightFrac: 0.3, maxAspect: 8, margin: 0.08, bgStep: 4, bgSize: 25, maxWidth: 1400 };

  /** Grayscale (0..255) Float32Array from RGBA ImageData, using the green channel (gray images have equal channels). */
  function grayOf(imageData) {
    var d = imageData.data, n = imageData.width * imageData.height, g = new Float32Array(n);
    for (var i = 0; i < n; i++) g[i] = d[i * 4 + 1];
    return g;
  }
  /** Background estimate: box mean of size `size` on a `step`-subsampled grid, upsampled by repetition (same as the reference Python). */
  function background(g, W, H, step, size) {
    var sw = Math.ceil(W / step), sh = Math.ceil(H / step), small = new Float32Array(sw * sh);
    for (var y = 0; y < sh; y++) for (var x = 0; x < sw; x++) small[y * sw + x] = g[(y * step) * W + x * step];
    // integral image for the box mean with reflect-like clamping at borders
    var r = (size - 1) >> 1, out = new Float32Array(sw * sh), integ = new Float64Array((sw + 1) * (sh + 1));
    for (var yy = 1; yy <= sh; yy++) { var rs = 0; for (var xx = 1; xx <= sw; xx++) { rs += small[(yy - 1) * sw + (xx - 1)]; integ[yy * (sw + 1) + xx] = integ[(yy - 1) * (sw + 1) + xx] + rs; } }
    for (var y2 = 0; y2 < sh; y2++) for (var x2 = 0; x2 < sw; x2++) {
      var x0 = Math.max(0, x2 - r), x1 = Math.min(sw - 1, x2 + r), y0 = Math.max(0, y2 - r), y1 = Math.min(sh - 1, y2 + r);
      var sum = integ[(y1 + 1) * (sw + 1) + (x1 + 1)] - integ[y0 * (sw + 1) + (x1 + 1)] - integ[(y1 + 1) * (sw + 1) + x0] + integ[y0 * (sw + 1) + x0];
      out[y2 * sw + x2] = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
    }
    return { small: out, sw: sw, sh: sh, step: step };
  }
  function bgAt(bg, x, y) { var sx = Math.min(bg.sw - 1, (x / bg.step) | 0), sy = Math.min(bg.sh - 1, (y / bg.step) | 0); return bg.small[sy * bg.sw + sx]; }
  function opening(mask, W, H) {
    var er = new Uint8Array(W * H), di = new Uint8Array(W * H), x, y, i;
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      i = y * W + x;
      if (mask[i] && mask[i - 1] && mask[i + 1] && mask[i - W] && mask[i + W] && mask[i - W - 1] && mask[i - W + 1] && mask[i + W - 1] && mask[i + W + 1]) er[i] = 1;
    }
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      i = y * W + x;
      if (er[i] || er[i - 1] || er[i + 1] || er[i - W] || er[i + W] || er[i - W - 1] || er[i - W + 1] || er[i + W - 1] || er[i + W + 1]) di[i] = 1;
    }
    return di;
  }
  /** Connected components (8-connectivity) with bounding boxes and areas. */
  function components(mask, W, H) {
    var seen = new Uint8Array(W * H), comps = [], stack = [];
    for (var i = 0; i < W * H; i++) {
      if (!mask[i] || seen[i]) continue;
      var x0 = W, y0 = H, x1 = -1, y1 = -1, area = 0, sum = 0;
      stack.push(i); seen[i] = 1;
      while (stack.length) {
        var p = stack.pop(), px = p % W, py = (p - px) / W;
        area++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          var q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
      comps.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: area });
    }
    return comps;
  }
  /** Runs the detector on an ImageData (already ≤ maxWidth wide). Returns boxes in that pixel space. */
  function detectImageData(imageData, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    var W = imageData.width, H = imageData.height, g = grayOf(imageData);
    var bg = background(g, W, H, o.bgStep, o.bgSize);
    var mask = new Uint8Array(W * H);
    var mx0 = Math.floor(W * o.margin), mx1 = Math.floor(W * (1 - o.margin)), my0 = Math.floor(H * 0.12), my1 = Math.floor(H * 0.92);
    for (var y = my0; y < my1; y++) for (var x = mx0; x < mx1; x++) { var i = y * W + x; if (g[i] >= o.thrAbs && g[i] - bgAt(bg, x, y) >= o.contrast) mask[i] = 1; }
    var opened = opening(mask, W, H);
    var comps = components(opened, W, H), out = [];
    comps.forEach(function (c) {
      if (c.area < o.minArea) return;
      if (c.h > o.maxHeightFrac * H) return;
      if (Math.max(c.h, c.w) / Math.max(1, Math.min(c.h, c.w)) > o.maxAspect) return;
      var tall = c.h / Math.max(1, c.w);
      out.push({ box: { x: c.x, y: c.y, w: c.w, h: c.h }, area: c.area, kind: tall >= 2.2 && c.h >= 0.08 * H ? 'implant' : 'restoration' });
    });
    return out;
  }
  /** Detects on an image element/bitmap of any size: works at ≤ maxWidth and rescales the boxes back. */
  function detect(img, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var s = Math.min(1, o.maxWidth / iw), w = Math.round(iw * s), h = Math.round(ih * s);
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
    var dets = detectImageData(ctx.getImageData(0, 0, w, h), o);
    if (s !== 1) dets.forEach(function (d) { d.box = { x: Math.round(d.box.x / s), y: Math.round(d.box.y / s), w: Math.round(d.box.w / s), h: Math.round(d.box.h / s) }; });
    return dets;
  }
  function iou(a, b) {
    var ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    var inter = ix * iy; if (!inter) return 0; return inter / (a.w * a.h + b.w * b.h - inter);
  }
  /** Greedy matching of detections to reference boxes. */
  function evaluate(dets, refs, thr) {
    thr = thr || 0.25; var used = {}, tp = 0;
    dets.forEach(function (d) {
      var best = -1, bi = -1;
      refs.forEach(function (r, j) { if (used[j]) return; var v = iou(d.box, r); if (v > best) { best = v; bi = j; } });
      if (best >= thr) { tp++; used[bi] = true; d.matched = true; } else d.matched = false;
    });
    return { tp: tp, fp: dets.length - tp, fn: refs.length - tp };
  }

  root.PX_DETECT = { VERSION: VERSION, MEASURED: MEASURED, DEFAULTS: DEFAULTS, detect: detect, detectImageData: detectImageData, evaluate: evaluate, iou: iou, _internal: { background: background, opening: opening, components: components, grayOf: grayOf } };
})(typeof window !== 'undefined' ? window : globalThis);
