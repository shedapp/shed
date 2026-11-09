/* PanoramIA — contour refinement: turns a detector box into the outline of the finding.
   A box says "something is here"; a diagnosis needs to know where the caries ends, where the filling of a root canal sits inside the
   tooth, how far the lesion extends. This module works on the pixels inside (and just around) each box:
     - the tooth is separated from the soft tissue and bone with Otsu's threshold (or taken from the tooth outlines when they exist);
     - radiolucent findings (caries, periapical lesion) = the dark region inside the tooth / the dark blob around the apex;
     - radiopaque findings (fillings, crowns, bridges, root-canal filling) = the bright region, cut free from the tooth around it;
     - root-canal fillings are measured against the root (length reached, voids) so the reader sees "complete / short / voids";
     - boxes that contain no mineralised tissue at all (an edentulous gap) are re-labelled as missing tooth, never as fracture.
   Pure functions on an ImageData-like {width,height,data}; coordinates in that image's pixels. It is an aid for the reader, who
   accepts, edits or rejects every outline. Nothing here is a diagnosis. */
(function (root) {
  'use strict';
  var VERSION = '0.1.0';

  function toGray(img) {
    var W = img.width, H = img.height, d = img.data, g = new Float32Array(W * H);
    for (var i = 0, n = W * H; i < n; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    return g;
  }
  /** Separable box blur on a w×h float image, radius r, applied n times (≈ Gaussian). */
  function blur(src, w, h, r, n) {
    var a = src, b = new Float32Array(w * h), k = 2 * r + 1;
    for (var it = 0; it < (n || 1); it++) {
      var y, x, s, o;
      for (y = 0; y < h; y++) { s = 0; o = y * w; for (x = -r; x <= r; x++) s += a[o + Math.min(w - 1, Math.max(0, x))]; for (x = 0; x < w; x++) { b[o + x] = s / k; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
      var c = new Float32Array(w * h);
      for (x = 0; x < w; x++) { s = 0; for (y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x]; for (y = 0; y < h; y++) { c[y * w + x] = s / k; s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
      a = c;
    }
    return a;
  }
  /** Otsu threshold of the values selected by `mask` (all when null). Returns {t, sep, lo, hi, fracHi}. */
  function otsu(v, mask) {
    var hist = new Float64Array(256), n = 0, i;
    for (i = 0; i < v.length; i++) { if (mask && !mask[i]) continue; hist[Math.max(0, Math.min(255, Math.round(v[i])))]++; n++; }
    if (n < 20) return null;
    var sum = 0; for (i = 0; i < 256; i++) sum += i * hist[i];
    var wB = 0, sB = 0, best = -1, bt = 128, m1 = 0, m2 = 0;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; var wF = n - wB; if (!wF) break;
      sB += i * hist[i]; var mB = sB / wB, mF = (sum - sB) / wF, bv = wB * wF * (mB - mF) * (mB - mF);
      if (bv > best) { best = bv; bt = i; m1 = mB; m2 = mF; }
    }
    var varT = 0, mean = sum / n; for (i = 0; i < 256; i++) varT += hist[i] * (i - mean) * (i - mean);
    return { t: bt + 0.5, lo: m1, hi: m2, sep: m2 - m1, eta: varT ? best / varT : 0, fracHi: 0 };
  }
  function percentile(v, p, mask) {
    var a = []; for (var i = 0; i < v.length; i++) if (!mask || mask[i]) a.push(v[i]);
    if (!a.length) return 0; a.sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(p * a.length))];
  }
  function morph(mask, w, h, r, grow) { // grow=true dilates, false erodes (square element)
    var out = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var hit = grow ? 0 : 1;
      for (var dy = -r; dy <= r && (grow ? !hit : hit); dy++) for (var dx = -r; dx <= r; dx++) {
        var yy = y + dy, xx = x + dx, v = (yy < 0 || xx < 0 || yy >= h || xx >= w) ? (grow ? 0 : 1) : mask[yy * w + xx];
        if (grow && v) { hit = 1; break; } if (!grow && !v) { hit = 0; break; }
      }
      out[y * w + x] = hit;
    }
    return out;
  }
  function closeM(m, w, h, r) { return morph(morph(m, w, h, r, true), w, h, r, false); }
  function openM(m, w, h, r) { return morph(morph(m, w, h, r, false), w, h, r, true); }
  /** Fills the holes of a binary mask (background not connected to the border). */
  function fillHoles(m, w, h) {
    var seen = new Uint8Array(w * h), st = [], i, x, y;
    function push(p) { if (!m[p] && !seen[p]) { seen[p] = 1; st.push(p); } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (st.length) { var p = st.pop(); x = p % w; y = (p - x) / w; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
    var out = new Uint8Array(w * h); for (i = 0; i < w * h; i++) out[i] = (m[i] || !seen[i]) ? 1 : 0; return out;
  }
  /** 4-connected components → [{id, area, cells[], x1,y1,x2,y2}], sorted by area desc. */
  function components(m, w, h) {
    var lab = new Int32Array(w * h), out = [], id = 0;
    for (var s = 0; s < w * h; s++) {
      if (!m[s] || lab[s]) continue; id++; var st = [s], cells = [], x1 = w, y1 = h, x2 = 0, y2 = 0; lab[s] = id;
      while (st.length) { var p = st.pop(), x = p % w, y = (p - x) / w; cells.push(p); if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
        if (x > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st.push(p - 1); } if (x < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st.push(p + 1); }
        if (y > 0 && m[p - w] && !lab[p - w]) { lab[p - w] = id; st.push(p - w); } if (y < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = id; st.push(p + w); } }
      out.push({ id: id, area: cells.length, cells: cells, x1: x1, y1: y1, x2: x2, y2: y2 });
    }
    out.sort(function (a, b) { return b.area - a.area; }); return out;
  }
  function maskOf(comp, w, h) { var m = new Uint8Array(w * h); comp.cells.forEach(function (p) { m[p] = 1; }); return m; }

  /** Outer boundary of a binary mask (single component expected) by Moore-neighbour tracing; returns [[x,y],…] in mask coordinates. */
  function trace(m, w, h) {
    var sx = -1, sy = -1, i;
    for (i = 0; i < w * h; i++) if (m[i]) { sx = i % w; sy = (i - sx) / w; break; }
    if (sx < 0) return [];
    function at(x, y) { return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x]; }
    var dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    var pts = [[sx, sy]], x = sx, y = sy, d = 6, guard = 0, limit = w * h * 4;
    while (guard++ < limit) {
      var found = false;
      for (var k = 0; k < 8; k++) {
        var nd = (d + 6 + k) % 8, nx = x + dirs[nd][0], ny = y + dirs[nd][1];
        if (at(nx, ny)) { x = nx; y = ny; d = nd; found = true; break; }
      }
      if (!found) break;
      if (x === sx && y === sy) break;
      pts.push([x, y]);
    }
    return pts;
  }
  function dp(pts, eps) { // Douglas–Peucker on a closed ring
    if (pts.length < 8) return pts;
    function seg(a, b) {
      var best = -1, bi = -1, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      for (var i = 1; i < pts.length; i++) { /* placeholder replaced below */ break; }
      return [best, bi, L];
    }
    function rec(arr, e) {
      if (arr.length < 3) return arr;
      var a = arr[0], b = arr[arr.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, best = -1, bi = 0;
      for (var i = 1; i < arr.length - 1; i++) { var dd = Math.abs((arr[i][0] - a[0]) * dy - (arr[i][1] - a[1]) * dx) / L; if (dd > best) { best = dd; bi = i; } }
      if (best <= e) return [a, b];
      var l = rec(arr.slice(0, bi + 1), e), r = rec(arr.slice(bi), e); return l.slice(0, -1).concat(r);
    }
    void seg;
    var half = Math.floor(pts.length / 2), A = rec(pts.slice(0, half + 1), eps), B = rec(pts.slice(half).concat([pts[0]]), eps);
    return A.slice(0, -1).concat(B.slice(0, -1));
  }
  function chaikin(pts, it) {
    var p = pts;
    for (var k = 0; k < it; k++) { var q = []; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } p = q; }
    return p;
  }
  function polyOf(m, w, h, ox, oy, eps) {
    var ring = trace(m, w, h); if (ring.length < 4) return null;
    var s = chaikin(dp(ring, eps == null ? 1.1 : eps), 1);
    return s.map(function (p) { return [p[0] + ox + 0.5, p[1] + oy + 0.5]; });
  }
  function rasterPoly(poly, w, h, ox, oy) {
    var m = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      var yy = y + oy + 0.5, xs = [];
      for (var i = 0, n = poly.length; i < n; i++) { var a = poly[i], b = poly[(i + 1) % n]; if ((a[1] <= yy) !== (b[1] <= yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.max(0, Math.ceil(xs[k] - ox - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1] - ox - 0.5)); x++) m[y * w + x] = 1;
    }
    return m;
  }
  function polyArea(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a / 2); }
  function sum(m) { var s = 0; for (var i = 0; i < m.length; i++) s += m[i] ? 1 : 0; return s; }
  function inter(a, b) { var s = 0; for (var i = 0; i < a.length; i++) if (a[i] && b[i]) s++; return s; }
  function rectMask(w, h, x1, y1, x2, y2) { var m = new Uint8Array(w * h); for (var y = Math.max(0, y1); y <= Math.min(h - 1, y2); y++) for (var x = Math.max(0, x1); x <= Math.min(w - 1, x2); x++) m[y * w + x] = 1; return m; }
  function ellipseMask(w, h, cx, cy, rx, ry) { var m = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1) m[y * w + x] = 1; } return m; }

  var DARK = { 'DEN-CAR': 1, 'DEN-PAR': 1 };
  var BRIGHT = { 'DEN-FIL': 1, 'DEN-CRN': 1, 'DEN-BRG': 1, 'DEN-RCT': 1, 'DEN-POST': 1, 'DEN-IMP-X': 1 };
  var WHOLE_TOOTH = { 'DEN-ROOT': 1, 'DEN-IMP': 1 };

  /** Context for one image: smoothed grey and global statistics (computed once, reused for every box). */
  function prepare(img) {
    var g = toGray(img), W = img.width, H = img.height, sm = blur(g, W, H, 1, 2);
    var p = []; for (var i = 0; i < sm.length; i += 7) p.push(sm[i]); p.sort(function (a, b) { return a - b; });
    var q = function (f) { return p[Math.min(p.length - 1, Math.floor(f * p.length))]; };
    return { W: W, H: H, g: sm, p10: q(0.1), p50: q(0.5), p75: q(0.75), p90: q(0.9), p98: q(0.98) };
  }

  /** The tooth around the box: a mask in crop coordinates, from the outlines when given, else the bright (mineralised) region. */
  function toothMask(P, crop, box, teeth) {
    var w = crop.w, h = crop.h, best = null, bestOv = 0, boxM = rectMask(w, h, Math.round(box.x - crop.x), Math.round(box.y - crop.y), Math.round(box.x + box.w - crop.x), Math.round(box.y + box.h - crop.y)), bs = sum(boxM) || 1;
    var union = null;
    (teeth || []).forEach(function (t) {
      var bb = bboxOf(t.poly); if (bb.x2 < crop.x || bb.x1 > crop.x + w || bb.y2 < crop.y || bb.y1 > crop.y + h) return;
      var m = rasterPoly(t.poly, w, h, crop.x, crop.y), ov = inter(m, boxM) / bs;
      if (ov > 0.08) { if (!union) union = new Uint8Array(w * h); for (var i = 0; i < m.length; i++) if (m[i]) union[i] = 1; if (ov > bestOv) { bestOv = ov; best = t; } }
    });
    if (union) return { mask: union, source: 'outline', fdi: best && best.fdi };
    var sub = new Float32Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) sub[y * w + x] = P.g[(crop.y + y) * P.W + crop.x + x];
    var o = otsu(sub, null); if (!o || o.sep < 14) return { mask: null, source: 'none' };
    var m2 = new Uint8Array(w * h); for (var k = 0; k < m2.length; k++) m2[k] = sub[k] > o.t ? 1 : 0;
    m2 = fillHoles(closeM(openM(m2, w, h, 1), w, h, 2), w, h);
    var comps = components(m2, w, h), cx = Math.round(box.x + box.w / 2 - crop.x), cy = Math.round(box.y + box.h / 2 - crop.y), pick = null;
    for (var c = 0; c < comps.length && c < 8; c++) { var cm = maskOf(comps[c], w, h); if (cm[Math.min(h - 1, Math.max(0, cy)) * w + Math.min(w - 1, Math.max(0, cx))] || inter(cm, boxM) / bs > 0.25) { pick = comps[c]; break; } }
    return pick ? { mask: maskOf(pick, w, h), source: 'intensity', otsu: o } : { mask: null, source: 'none' };
  }
  function bboxOf(p) { var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; p.forEach(function (q) { if (q[0] < x1) x1 = q[0]; if (q[1] < y1) y1 = q[1]; if (q[0] > x2) x2 = q[0]; if (q[1] > y2) y2 = q[1]; }); return { x1: x1, y1: y1, x2: x2, y2: y2 }; }

  function principal(cells, w) { // centroid, axis angle, extents along the axis
    var n = cells.length, sx = 0, sy = 0, i;
    for (i = 0; i < n; i++) { sx += cells[i] % w; sy += (cells[i] - cells[i] % w) / w; } sx /= n; sy /= n;
    var xx = 0, yy = 0, xy = 0;
    for (i = 0; i < n; i++) { var dx = cells[i] % w - sx, dy = (cells[i] - cells[i] % w) / w - sy; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
    var th = 0.5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(th), uy = Math.sin(th), lo = Infinity, hi = -Infinity;
    for (i = 0; i < n; i++) { var t = (cells[i] % w - sx) * ux + ((cells[i] - cells[i] % w) / w - sy) * uy; if (t < lo) lo = t; if (t > hi) hi = t; }
    return { cx: sx, cy: sy, ux: ux, uy: uy, lo: lo, hi: hi, len: hi - lo };
  }

  /** Refines one proposal. `p` = {code, box:{x,y,w,h}} in the image's pixels. Returns
      {points, code, method, ok, quality?, context?, note?}; `ok:false` means the pixels did not support a contour (the box is kept). */
  function refineOne(P, p, teeth) {
    var code = p.code, b = p.box, padx = Math.round(Math.max(6, b.w * 0.25)), pady = Math.round(Math.max(6, b.h * 0.25));
    var x1 = Math.max(0, Math.floor(b.x - padx)), y1 = Math.max(0, Math.floor(b.y - pady)), x2 = Math.min(P.W, Math.ceil(b.x + b.w + padx)), y2 = Math.min(P.H, Math.ceil(b.y + b.h + pady));
    var w = x2 - x1, h = y2 - y1; if (w < 8 || h < 8) return { ok: false, code: code, method: 'too-small' };
    var crop = { x: x1, y: y1, w: w, h: h }, sub = new Float32Array(w * h), y, x;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) sub[y * w + x] = P.g[(y1 + y) * P.W + x1 + x];
    var bx1 = Math.round(b.x - x1), by1 = Math.round(b.y - y1), bx2 = Math.round(b.x + b.w - x1), by2 = Math.round(b.y + b.h - y1);
    var boxM = rectMask(w, h, bx1, by1, bx2, by2), boxArea = sum(boxM) || 1;
    var res = { ok: false, code: code, method: 'box', quality: {} };

    // 1. a box with no mineralised tissue is an edentulous gap, whatever the class says (broken-down root, impaction, fracture…)
    var inBox = percentile(sub, 0.92, boxM), edge = percentile(sub, 0.5, null);
    if (code === 'DEN-ROOT') {
      if (inBox < P.p75 - 4 && inBox < P.p90 * 0.8) {
        return { ok: false, code: 'DEN-MIS', method: 'no-mineralised-tissue', relabelled: true, quality: { p92: Math.round(inBox), image: Math.round(P.p75) }, note: 'sin tejido mineralizado en la zona: espacio edéntulo, no fractura' };
      }
    }
    var T = toothMask(P, crop, b, teeth), tm = T.mask;
    if (tm) { var tc = components(tm, w, h)[0]; if (tc) res.context = { kind: 'tooth', fdi: T.fdi || null, source: T.source, points: polyOf(maskOf(tc, w, h), w, h, x1, y1, 1.2) }; }

    if (DARK[code]) {
      var region, regionM;
      if (code === 'DEN-CAR') regionM = tm ? tm : boxM; else regionM = rectMask(w, h, Math.round(bx1 - b.w * 0.1), Math.round(by1 - b.h * 0.1), Math.round(bx2 + b.w * 0.1), Math.round(by2 + b.h * 0.1));
      if (tm && code === 'DEN-CAR') { regionM = new Uint8Array(w * h); for (var i = 0; i < regionM.length; i++) regionM[i] = tm[i] && (boxM[i] || inter(boxM, boxM) === 0) ? 1 : 0; }
      // inside a tooth the caries is darker than the surrounding crown/root; for a periapical lesion, darker than the surrounding bone
      var ref = tm && code === 'DEN-CAR' ? tm : regionM, o = otsu(sub, ref && sum(ref) > 40 ? (code === 'DEN-CAR' && tm ? tm : regionM) : null);
      if (!o || o.sep < 10 || o.eta < 0.25) return res;
      var d = new Uint8Array(w * h); for (var j = 0; j < d.length; j++) d[j] = (sub[j] < o.t && (code === 'DEN-CAR' ? (tm ? tm[j] : boxM[j]) : regionM[j])) ? 1 : 0;
      d = closeM(openM(d, w, h, 1), w, h, 1); d = fillHoles(d, w, h);
      var comps = components(d, w, h), cx = (bx1 + bx2) / 2, cy = (by1 + by2) / 2, pick = null, bestScore = -1;
      for (var c = 0; c < comps.length && c < 10; c++) { var cm = maskOf(comps[c], w, h), ov = inter(cm, boxM); if (ov / boxArea < 0.04 && ov < comps[c].area * 0.5) continue; var ccx = (comps[c].x1 + comps[c].x2) / 2, ccy = (comps[c].y1 + comps[c].y2) / 2, dist = Math.hypot(ccx - cx, ccy - cy) / Math.hypot(b.w, b.h), sc = ov * (1 - Math.min(0.8, dist)); if (sc > bestScore) { bestScore = sc; pick = comps[c]; } }
      if (!pick || pick.area < 12) return res;
      var pm = maskOf(pick, w, h), area = pick.area / boxArea;
      if (area > 0.95 && code === 'DEN-CAR') return res; // the whole box dark: no edge found
      var pts = polyOf(pm, w, h, x1, y1, 1.1); if (!pts) return res;
      res.ok = true; res.method = (tm ? 'tooth-' + T.source : 'region') + '+otsu'; res.points = pts; res.quality = { contrast: Math.round(o.sep), area: +area.toFixed(2), inTooth: tm ? +(inter(pm, tm) / pick.area).toFixed(2) : null };
      if (code === 'DEN-CAR' && tm) { // does the dark region reach the outer surface of the tooth (open cavity) or the pulp side?
        var er = morph(tm, w, h, 2, false), edgeM = new Uint8Array(w * h); for (var e = 0; e < edgeM.length; e++) edgeM[e] = tm[e] && !er[e] ? 1 : 0;
        res.quality.reachesSurface = inter(morph(pm, w, h, 1, true), edgeM) > 0;
      }
      return res;
    }

    if (BRIGHT[code]) {
      var scope = tm ? tm : rectMask(w, h, bx1 - 2, by1 - 2, bx2 + 2, by2 + 2), oo = otsu(sub, sum(scope) > 40 ? scope : null);
      if (!oo || oo.sep < 12) return res;
      var thr = oo.t, bm = new Uint8Array(w * h);
      if (code === 'DEN-RCT') thr = Math.max(thr, oo.t + 0.25 * (oo.hi - oo.t)); // the obturation is the brightest part of the tooth
      for (var q = 0; q < bm.length; q++) bm[q] = (sub[q] > thr && scope[q] && (boxM[q] || code !== 'DEN-RCT' ? 1 : 0)) ? 1 : 0;
      bm = closeM(openM(bm, w, h, code === 'DEN-RCT' ? 0 : 1), w, h, 1);
      if (code === 'DEN-RCT') { // keep the elongated bright structure along the root, not the crown restoration
        var comps2 = components(bm, w, h).filter(function (cc) { return cc.area >= 10; }), bestc = null, bsc = -1;
        comps2.forEach(function (cc) { var pr = principal(cc.cells, w), el = pr.len / Math.max(1, Math.sqrt(cc.area)), ov = inter(maskOf(cc, w, h), boxM) / cc.area, sc = cc.area * ov * Math.min(3, el); if (sc > bsc) { bsc = sc; bestc = cc; } });
        if (!bestc) return res; var fm = maskOf(bestc, w, h), holesFilled = fillHoles(closeM(fm, w, h, 2), w, h), voids = (sum(holesFilled) - sum(fm)) / Math.max(1, sum(holesFilled));
        var pr2 = principal(bestc.cells, w), pts2 = polyOf(holesFilled, w, h, x1, y1, 1.0); if (!pts2) return res;
        res.ok = true; res.method = (tm ? 'tooth-' + T.source : 'region') + '+ridge'; res.points = pts2; res.quality = { contrast: Math.round(oo.sep), voids: +Math.max(0, voids).toFixed(2), lengthPx: Math.round(pr2.len) };
        if (tm) { // length of the filling against the root along the same axis → complete / short
          var tcs = components(tm, w, h)[0]; if (tcs) { var tp = principal(tcs.cells, w), proj = function (cells) { var lo = Infinity, hi = -Infinity; cells.forEach(function (cl) { var t = (cl % w - pr2.cx) * pr2.ux + ((cl - cl % w) / w - pr2.cy) * pr2.uy; if (t < lo) lo = t; if (t > hi) hi = t; }); return [lo, hi]; }, tr = proj(tcs.cells), fr = [pr2.lo, pr2.hi]; void tp;
            // the root part is the half of the tooth farther from the crown restoration; the apex is the tooth end the filling is heading to
            var apexEnd = Math.abs(fr[1] - tr[1]) < Math.abs(fr[0] - tr[0]) ? 1 : 0, gap = apexEnd ? (tr[1] - fr[1]) : (fr[0] - tr[0]);
            res.quality.shortOfApexPx = Math.round(Math.max(0, gap)); res.quality.rootLengthPx = Math.round(tr[1] - tr[0]); res.quality.reaches = +(Math.min(1, (fr[1] - fr[0]) / Math.max(1, (tr[1] - tr[0]))) ).toFixed(2); }
        }
        res.canal = res.context && res.context.points ? res.context.points : null; // root outline = where the canal runs
        return res;
      }
      var comps3 = components(bm, w, h), pk = null, bs3 = -1;
      comps3.forEach(function (cc) { if (cc.area < 14) return; var ov = inter(maskOf(cc, w, h), boxM); if (ov / boxArea < 0.04) return; var sc = ov; if (sc > bs3) { bs3 = sc; pk = cc; } });
      if (!pk) return res;
      var pm3 = fillHoles(maskOf(pk, w, h), w, h), pts3 = polyOf(pm3, w, h, x1, y1, 1.2); if (!pts3) return res;
      res.ok = true; res.method = (tm ? 'tooth-' + T.source : 'region') + '+otsu'; res.points = pts3; res.quality = { contrast: Math.round(oo.sep), area: +(pk.area / boxArea).toFixed(2) };
      return res;
    }

    if (WHOLE_TOOTH[code]) { // broken-down root / impacted tooth: the outline of the tooth itself
      if (tm) { var tcs2 = components(tm, w, h)[0]; if (tcs2 && tcs2.area > 40) { var ptsT = polyOf(maskOf(tcs2, w, h), w, h, x1, y1, 1.2); if (ptsT) { res.ok = true; res.method = 'tooth-' + T.source; res.points = ptsT; res.quality = { area: +(tcs2.area / boxArea).toFixed(2) }; } } }
      return res;
    }
    return res;
  }

  /** Refines every proposal of `list` ({code, box, …} in the coordinates of the original case image); `img` is the pixel data at
      `scale` (= img width / case width). Returns the list with `shape` (polygon), `contour` info and corrected codes. */
  function refine(img, list, teeth, scale) {
    scale = scale || 1; var P = prepare(img);
    var teethS = (teeth || []).map(function (t) { return { fdi: t.fdi, poly: t.poly.map(function (q) { return [q[0] * scale, q[1] * scale]; }) }; });
    return list.map(function (p) {
      var r = refineOne(P, { code: p.code, box: { x: p.box.x * scale, y: p.box.y * scale, w: p.box.w * scale, h: p.box.h * scale } }, teethS);
      var out = Object.assign({}, p, { contour: { ok: !!r.ok, method: r.method, quality: r.quality || {}, note: r.note || null } });
      if (r.relabelled) { out.code = r.code; out.was = p.code; out.contour.relabelled = true; }
      if (r.ok && r.points) { var pts = r.points.map(function (q) { return [q[0] / scale, q[1] / scale]; }); out.shape = { type: 'polygon', points: pts }; var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; }); out.box = { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys), w: Math.max(1, Math.max.apply(null, xs) - Math.min.apply(null, xs)), h: Math.max(1, Math.max.apply(null, ys) - Math.min.apply(null, ys)) }; }
      if (r.context && r.context.points) out.context = { kind: r.context.kind, fdi: r.context.fdi, points: r.context.points.map(function (q) { return [q[0] / scale, q[1] / scale]; }) };
      return out;
    });
  }

  root.PX_CONTOUR = { VERSION: VERSION, refine: refine, prepare: prepare, refineOne: refineOne, _otsu: otsu, _components: components, _trace: trace, _polyArea: polyArea };
  if (typeof module !== 'undefined') module.exports = root.PX_CONTOUR;
})(typeof globalThis !== 'undefined' ? globalThis : this);
