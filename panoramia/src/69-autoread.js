/* PanoramIA — automatic reading v0.3 (experimental, rule-based; NOT a trained model).
   Produces proposals for the reader to confirm, reject or edit — never findings on its own:
   1. Normal anatomy from a dental atlas: the tooth outlines (reference dataset or reader-drawn ANA-TTH) place the occlusal plane,
      the mandibular canal, the mental foramina, the maxillary sinuses, the nasal floor, the anterior ramus borders and the
      inferior mandibular border (the last one is refined on the image by its intensity edge).
   2. Radiopacities (bright, locally contrasting blobs) classified by where they sit: coronal filling, crown, root canal filling,
      bridge, implant, or unclassified bone radiopacity.
   3. Radiolucencies (dark, locally contrasting blobs) inside the bone zone, away from the normal dark structures of step 1:
      periapical when they touch a root apex, otherwise unclassified bone radiolucency.
   Every proposal carries `how` (the rule that produced it) so the user can see why it was proposed.
   What it cannot see: caries (too subtle for intensity rules), root resorption, fractures, periodontal bone level. */
(function (root) {
  'use strict';
  var G = root.PX_GEOM, D = root.PX_DETECT;
  var VERSION = '0.3.0';
  /* Measured with tools/eval_autoread.js on the 333 AKUDENTAL panoramics (expert labels exist only for fillings/crowns, bridges and implants;
     IoU ≥ 0.25 between the proposal and the labelled structure). Root canals, periapical and bone radiolucencies have NO reference labels there. */
  var MEASURED = {
    dataset: 'AKUDENTAL', images: 333, iou: 0.25,
    byRef: { filling_crown: { refs: 841, sensitivity: 0.615, classAccuracy: 0.909 }, bridge: { refs: 223, sensitivity: 0.969, classAccuracy: 0.931 }, implant: { refs: 71, sensitivity: 0.592, classAccuracy: 0.929 } },
    ppv: { 'DEN-FIL': 0.67, 'DEN-CRN': 0.75, 'DEN-BRG': 0.83, 'DEN-RST': 0.75, 'DEN-IMPL': 0.57 },
    unlabelled: ['DEN-RCT', 'DEN-PAR', 'JAW-RLU', 'JAW-ROP', 'ANA-*'],
    /* DentalOPG-1550 (tools/eval_autoread_opg.js, 1 525 images, boxes for 14 classes, IoU ≥ 0.2). "family" = found by any restoration
       code; "exact" = same code. Only 242 images carry tooth outlines, so per-tooth classes are mostly read without them. */
    opg: { images: 1525, iou: 0.2,
      sensitivity: { 'DEN-FIL': { family: 0.40, exact: 0.06 }, 'DEN-CRN': { family: 0.69, exact: 0.02 }, 'DEN-BRG': { family: 0.96, exact: 0.07 }, 'DEN-RCT': { family: 0.05, exact: 0.05 }, 'DEN-PAR': { family: 0, exact: 0 }, 'DEN-CAR': { family: 0, exact: 0 }, 'DEN-ROOT': { family: 0, exact: 0 }, 'DEN-IMP': { family: 0, exact: 0 } },
      withTeethOutlines: { images: 242, 'DEN-FIL': { family: 0.47, exact: 0.40 }, 'DEN-CRN': { family: 0.66, exact: 0.16 }, 'DEN-RCT': { family: 0.02, exact: 0.02 } },
      ppvExact: { 'DEN-FIL': 0.42, 'DEN-CRN': 0.91, 'DEN-RCT': 0.10, 'DEN-BRG': 0.15 } }
  };

  // ---------- small helpers ----------
  function up(fdi) { return G.fdiUpper(fdi); }
  function sideOfFdi(fdi) { return G.fdiSide(fdi); }
  function toothIndex(fdi) { return fdi % 10; } // 1 central incisor … 8 third molar
  function apexOf(poly, upper) { var best = null; poly.forEach(function (p) { if (!best || (upper ? p[1] < best[1] : p[1] > best[1])) best = p; }); return best; }
  function crownTipOf(poly, upper) { return apexOf(poly, !upper); }
  function ellipse(cx, cy, rx, ry, n) { var pts = []; for (var i = 0; i < (n || 12); i++) { var a = i / (n || 12) * Math.PI * 2; pts.push([Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]); } return pts; }
  function round(pts) { return pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }); }
  function median(arr) { var s = arr.slice().sort(function (a, b) { return a - b; }); return s.length ? s[(s.length - 1) >> 1] : NaN; }
  function proposal(code, type, points, extra) {
    var pts = round(points), b = G.bbox(pts);
    return Object.assign({ code: code, shape: { type: type, points: pts }, box: { x: b.x, y: b.y, w: Math.max(1, b.w), h: Math.max(1, b.h) }, confidence: 'probable', fdi: null, side: null, how: '' }, extra || {});
  }

  /** Tooth descriptors from polygons [{fdi, poly}]. */
  function describeTeeth(teeth) {
    return (teeth || []).filter(function (t) { return t.poly && t.poly.length >= 3 && t.fdi; }).map(function (t) {
      var b = G.bbox(t.poly), u = up(t.fdi), c = G.centroid(t.poly);
      return { fdi: t.fdi, poly: t.poly, box: b, upper: u, side: sideOfFdi(t.fdi), idx: toothIndex(t.fdi), cx: c[0], cy: c[1], apex: apexOf(t.poly, u), tip: crownTipOf(t.poly, u), h: b.h, w: b.w };
    });
  }

  // ---------- 1. anatomy atlas ----------
  function anatomyFromTeeth(teeth, W, H, gray) {
    var T = describeTeeth(teeth), out = [];
    if (T.length < 6) return out;
    var lower = T.filter(function (t) { return !t.upper; }), upper = T.filter(function (t) { return t.upper; });
    var sides = ['R', 'L'];
    var dirOf = function (side) { return side === 'R' ? -1 : 1; }; // image x direction towards the posterior for that side
    var mid = median(T.filter(function (t) { return t.idx === 1; }).map(function (t) { return t.cx; }));
    if (isNaN(mid)) mid = W / 2;

    // Occlusal plane: midpoints between the crown tips of opposing teeth, one line per side (fitted end points).
    sides.forEach(function (side) {
      var pts = [];
      lower.filter(function (t) { return t.side === side; }).forEach(function (lt) {
        var best = null, bd = Infinity;
        upper.forEach(function (ut) { if (ut.side !== side) return; var d = Math.abs(ut.cx - lt.cx); if (d < bd) { bd = d; best = ut; } });
        if (best && bd < lt.w) pts.push([(lt.cx + best.cx) / 2, (lt.tip[1] + best.tip[1]) / 2]);
      });
      if (pts.length >= 2) {
        pts.sort(function (a, b) { return a[0] - b[0]; });
        out.push(proposal('ANA-OCC', 'line', [pts[0], pts[pts.length - 1]], { side: side, how: 'atlas:occlusal-midpoints' }));
      }
    });

    // Mandibular canal and mental foramen per side.
    sides.forEach(function (side) {
      var ls = lower.filter(function (t) { return t.side === side; }).sort(function (a, b) { return a.idx - b.idx; });
      if (ls.length < 2) return;
      var dir = dirOf(side);
      var pm = ls.filter(function (t) { return t.idx === 5; })[0] || ls.filter(function (t) { return t.idx === 4; })[0] || ls.filter(function (t) { return t.idx === 6; })[0];
      var hRef = median(ls.map(function (t) { return t.h; }));
      var mf = pm ? [pm.apex[0] + (pm.idx === 6 ? -dir * pm.w * 0.6 : 0), pm.apex[1] + hRef * 0.22] : null;
      if (mf) out.push(proposal('ANA-MF', 'point', [mf], { side: side, how: 'atlas:below-premolar-apex' }));
      var molars = ls.filter(function (t) { return t.idx >= 6; });
      var path = [];
      if (mf) path.push(mf);
      molars.forEach(function (m) { path.push([m.cx, m.apex[1] + hRef * 0.32]); });
      var last = molars.length ? molars[molars.length - 1] : ls[ls.length - 1];
      var wRef = median(ls.map(function (t) { return t.w; }));
      // posterior rise towards the mandibular foramen at the level of the occlusal surfaces
      path.push([last.cx + dir * wRef * 1.3, last.apex[1] - hRef * 0.05]);
      path.push([last.cx + dir * wRef * 2.4, last.tip[1] - hRef * 0.25]);
      path = path.filter(function (p) { return p[0] > 0 && p[0] < W && p[1] > 0 && p[1] < H; });
      if (path.length >= 3) out.push(proposal('ANA-IAC', 'polyline', path, { side: side, how: 'atlas:below-molar-apices' }));
      // anterior border of the ramus: from distal of the last molar rising posteriorly
      var ramX = last.box.x + (dir > 0 ? last.box.w : 0) + dir * wRef * 0.3;
      out.push(proposal('ANA-RAM', 'line', [[ramX, last.tip[1] + hRef * 0.2], [ramX + dir * wRef * 0.9, last.tip[1] - hRef * 1.2]], { side: side, how: 'atlas:distal-of-last-molar' }));
    });

    // Maxillary sinus per side: polygon above the apices from the canine distal to the last molar.
    sides.forEach(function (side) {
      var us = upper.filter(function (t) { return t.side === side && t.idx >= 3; }).sort(function (a, b) { return a.idx - b.idx; });
      if (us.length < 2) return;
      var dir = dirOf(side), hRef = median(us.map(function (t) { return t.h; })), wRef = median(us.map(function (t) { return t.w; }));
      var floor = us.map(function (t) { return [t.cx, t.apex[1] - hRef * (t.idx <= 4 ? 0.02 : 0.1)]; });
      var first = us[0], last = us[us.length - 1];
      floor.unshift([first.cx - dir * wRef * 0.5, first.apex[1] + hRef * 0.15]);
      floor.push([last.cx + dir * wRef * 0.9, last.apex[1] - hRef * 0.05]);
      var top = floor.slice().reverse().map(function (p, i, arr) { var k = i === 0 || i === arr.length - 1 ? 0.5 : 0.85; return [p[0], p[1] - hRef * k]; });
      out.push(proposal('ANA-SIN', 'polygon', floor.concat(top), { side: side, how: 'atlas:above-posterior-apices' }));
    });

    // Nasal floor: polyline above the incisor apices.
    var inc = upper.filter(function (t) { return t.idx <= 2; });
    if (inc.length >= 2) {
      var hI = median(inc.map(function (t) { return t.h; })), yN = median(inc.map(function (t) { return t.apex[1]; })) - hI * 0.45;
      var xs = inc.map(function (t) { return t.cx; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), wI = median(inc.map(function (t) { return t.w; }));
      out.push(proposal('ANA-NAS', 'polyline', [[x0 - wI * 1.4, yN + hI * 0.1], [x0 - wI * 0.5, yN], [mid, yN - hI * 0.04], [x1 + wI * 0.5, yN], [x1 + wI * 1.4, yN + hI * 0.1]], { how: 'atlas:above-incisor-apices' }));
    }

    // Inferior border of the mandible: image intensity edge below the canal, per side; falls back to the atlas offset.
    if (lower.length >= 4) {
      sides.forEach(function (side) {
        var ls = lower.filter(function (t) { return t.side === side; });
        if (ls.length < 2) return;
        var dir = dirOf(side), hRef = median(ls.map(function (t) { return t.h; })), wRef = median(ls.map(function (t) { return t.w; }));
        var xa = Math.min.apply(null, ls.map(function (t) { return t.box.x; })), xb = Math.max.apply(null, ls.map(function (t) { return t.box.x + t.box.w; }));
        var xStart = side === 'R' ? xb : xa, xEnd = (side === 'R' ? xa : xb) + dir * wRef * 2.2;
        var lastX = side === 'R' ? xa : xb;
        var pts = [], step = Math.max(8, Math.round(wRef / 3));
        for (var x = xStart; dir > 0 ? x <= xEnd : x >= xEnd; x += dir * step) {
          var xi = Math.round(x); if (xi < 2 || xi >= W - 2) break;
          var nearest = null, nd = Infinity; ls.forEach(function (t) { var d = Math.abs(t.cx - xi); if (d < nd) { nd = d; nearest = t; } });
          var beyond = Math.max(0, (xi - lastX) * dir) / wRef; // tooth widths past the last tooth: the border rises towards the angle
          var atlasY = nearest.apex[1] + hRef * (nearest.idx >= 6 ? 0.8 : 1.1) - hRef * 0.18 * beyond;
          var y = gray ? edgeBelow(gray, W, H, xi, Math.round(atlasY - hRef * 0.45), Math.round(Math.min(H * 0.93, atlasY + hRef * 0.3))) : NaN;
          pts.push([xi, isNaN(y) ? atlasY : y]);
        }
        if (pts.length >= 3) {
          // median smoothing of the y values
          var ys = pts.map(function (p) { return p[1]; }), sm = pts.map(function (p, i) { return [p[0], median(ys.slice(Math.max(0, i - 3), i + 4))]; });
          for (var q = 1; q < sm.length; q++) { var dy = sm[q][1] - sm[q - 1][1], lim = hRef * 0.12; if (Math.abs(dy) > lim) sm[q][1] = sm[q - 1][1] + (dy > 0 ? lim : -lim); }
          out.push(proposal('ANA-MBD', 'polyline', sm, { side: side, how: gray ? 'image:cortical-edge+atlas' : 'atlas:below-apices' }));
        }
      });
    }
    return out;
  }
  /** y of the strongest bright→dark transition in column x between y0 and y1 (cortical bone to soft tissue). */
  function edgeBelow(g, W, H, x, y0, y1) {
    var best = -Infinity, by = NaN, k = 7;
    y0 = Math.max(k, y0); y1 = Math.min(H - k - 1, y1);
    for (var y = y0; y < y1; y++) {
      var above = 0, below = 0;
      for (var j = 1; j <= k; j++) { above += (g[(y - j) * W + x - 1] + g[(y - j) * W + x] + g[(y - j) * W + x + 1]) / 3; below += (g[(y + j) * W + x - 1] + g[(y + j) * W + x] + g[(y + j) * W + x + 1]) / 3; }
      above /= k; below /= k;
      var d = above - below; if (above < 90 || below < 12) continue; // the cortex is bright; below it soft tissue, not the dark frame
      if (d > best) { best = d; by = y; }
    }
    return best > 22 ? by : NaN;
  }

  // ---------- 2/3. masks and components ----------
  function grayOf(imageData) { return D._internal.grayOf(imageData); }
  function rasterPolygon(poly, W, H, mask, value) {
    var b = G.bbox(poly), y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(H - 1, Math.ceil(b.y + b.h));
    for (var y = y0; y <= y1; y++) {
      var xs = [];
      for (var i = 0, n = poly.length; i < n; i++) {
        var p = poly[i], q = poly[(i + 1) % n];
        if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var j = 0; j + 1 < xs.length; j += 2) { var xa = Math.max(0, Math.round(xs[j])), xb = Math.min(W - 1, Math.round(xs[j + 1])); for (var x = xa; x <= xb; x++) mask[y * W + x] = value; }
    }
  }
  /** Convex hull (monotone chain) of a point list. */
  function hull(pts) {
    if (pts.length < 4) return pts;
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [], upper = [];
    pts.forEach(function (p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); });
    for (var i = pts.length - 1; i >= 0; i--) { var p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  /** Connected components with pixel lists → hull polygons. */
  function componentsWithHull(mask, W, H, minArea) {
    var seen = new Uint8Array(W * H), comps = [], stack = [];
    for (var i = 0; i < W * H; i++) {
      if (!mask[i] || seen[i]) continue;
      var pix = [], x0 = W, y0 = H, x1 = -1, y1 = -1;
      stack.push(i); seen[i] = 1;
      while (stack.length) {
        var p = stack.pop(), px = p % W, py = (p - px) / W;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        // keep boundary pixels only (cheaper hull)
        var boundary = px === 0 || py === 0 || px === W - 1 || py === H - 1 || !mask[p - 1] || !mask[p + 1] || !mask[p - W] || !mask[p + W];
        if (boundary) pix.push([px, py]);
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          var q = ny * W + nx; if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
      var area = 0; // count area by scanning bbox
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) if (seen[yy * W + xx] && mask[yy * W + xx]) area++;
      if (area < minArea) continue;
      comps.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: area, hull: hull(pix.length ? pix : [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) });
    }
    return comps;
  }

  /** Classifies a bright component relative to the teeth. */
  function classifyOpaque(c, T, W, H, teethMask, meanGray) {
    var cx = c.x + c.w / 2, cy = c.y + c.h / 2, aspect = c.h / Math.max(1, c.w);
    var inside = T.filter(function (t) { return cx >= t.box.x - t.w * 0.1 && cx <= t.box.x + t.box.w + t.w * 0.1 && cy >= t.box.y - t.h * 0.1 && cy <= t.box.y + t.box.h + t.h * 0.1 && G.pointInPolygon([cx, cy], t.poly); });
    var spanned = T.filter(function (t) { return G.polygonsOverlap(c.hull, t.poly); });
    var wMed = T.length ? T.map(function (t) { return t.w; }).sort(function (a, b) { return a - b; })[T.length >> 1] : 40;
    var hMed = T.length ? T.map(function (t) { return t.h; }).sort(function (a, b) { return a - b; })[T.length >> 1] : 120;
    if (spanned.length >= 2 && c.w >= 1.6 * wMed && c.w > c.h) return { code: 'DEN-BRG', fdi: spanned[0].fdi, how: 'bright, spans ' + spanned.length + ' teeth' };
    if (c.w >= 2.2 * wMed && c.w > 1.5 * c.h && c.h < 1.3 * hMed) return { code: 'DEN-BRG', fdi: spanned.length ? spanned[0].fdi : null, how: 'wide bright body across an edentulous span (pontics)' };
    if (!inside.length && !spanned.length) {
      var vt = virtualTooth(c, T, wMed, hMed);
      if (vt) inside = [vt];
    }
    if (inside.length) {
      var t = inside[0];
      if (t.virtual && aspect >= 1.8 && c.h >= 0.35 * hMed && c.w >= 0.25 * wMed) return { code: 'DEN-IMPL', fdi: null, how: 'bright, tall body at an unlabelled tooth position (fixture)' };
      if (aspect >= 2 && c.w >= t.w * 0.3 && c.h >= t.h * 0.45 && !(t.upper ? cy > t.box.y + t.box.h * 0.8 : cy < t.box.y + t.box.h * 0.2)) return { code: 'DEN-IMPL', fdi: t.fdi, how: 'bright, wide and tall along the root (threaded fixture)' };
      var crownY = t.upper ? t.box.y + t.box.h * 0.55 : t.box.y + t.box.h * 0.45; // crown = occlusal half
      var inCrown = t.upper ? cy > crownY : cy < crownY;
      if (!inCrown && aspect >= 2.2 && c.w <= t.w * 0.3) return { code: 'DEN-RCT', fdi: t.fdi, how: 'bright+elongated in root half' };
      if (inCrown && c.w >= t.w * 0.7 && c.h >= t.h * 0.3) return { code: 'DEN-CRN', fdi: t.fdi, how: 'bright, covers the crown' };
      if (inCrown) return { code: 'DEN-FIL', fdi: t.fdi, how: 'bright in crown half' };
      if (aspect >= 2.2 && c.h >= t.h * 0.7) return { code: 'DEN-POST', fdi: t.fdi, how: 'bright+elongated along the root' };
      return { code: 'DEN-ROP', fdi: t.fdi, how: 'bright in root half' };
    }
    if (spanned.length >= 2 && c.w > c.h) return { code: 'DEN-BRG', fdi: spanned[0].fdi, how: 'bright, spans ' + spanned.length + ' teeth' };
    if (aspect >= 1.8 && c.h >= 0.35 * hMed && c.w <= 1.4 * wMed && !spanned.length) {
      if (c.w < 0.38 * wMed) return null; // thin bright rod (post, file, wire): too ambiguous to propose
      return { code: 'DEN-IMPL', fdi: null, how: 'bright, tall, fixture-wide, outside tooth outlines' };
    }
    if (aspect >= 2.2 && c.h >= 0.08 * H) return { code: 'DEN-IMPL', fdi: null, how: 'bright, tall, outside tooth outlines' };
    if (spanned.length === 1) return { code: 'DEN-RST', fdi: spanned[0].fdi, how: 'bright, overlaps tooth outline' };
    if (c.w / Math.max(1, c.h) > 3 && c.h < hMed * 0.12) return null; // thin bright sliver (occlusal contact/enamel overlap)
    if (c.area > 6 * wMed * hMed) return null; // arch-sized blob: exposure artefact, not a lesion
    return { code: 'JAW-ROP', fdi: null, how: 'bright blob in bone, no tooth' };
  }

  /** A tooth position interpolated from the neighbours in the same arch, for a blob that sits in the dental arch band but
      inside no labelled outline (crowned, treated or impacted teeth are often not labelled as "normal teeth"). */
  function virtualTooth(c, T, wMed, hMed) {
    if (!T.length) return null;
    var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    var arches = [true, false].map(function (upper) { return T.filter(function (t) { return t.upper === upper; }); }).filter(function (a) { return a.length >= 2; });
    var best = null;
    arches.forEach(function (arch) {
      var near = arch.filter(function (t) { return Math.abs(t.cx - cx) <= 2.6 * wMed; }).sort(function (a, b) { return Math.abs(a.cx - cx) - Math.abs(b.cx - cx); }).slice(0, 2);
      if (!near.length) return;
      var y0 = near.reduce(function (s, t) { return s + t.box.y; }, 0) / near.length, h = near.reduce(function (s, t) { return s + t.h; }, 0) / near.length;
      if (cy < y0 - h * 0.15 || cy > y0 + h * 1.15) return; // outside the band of this arch
      var d = Math.abs(cy - (y0 + h / 2));
      if (!best || d < best.d) {
        var w = near[0].w, x0 = cx - w / 2, box = { x: x0, y: y0, w: w, h: h };
        var upper = near[0].upper;
        var fdi = null; // between the neighbours: unknown number, left for the reader
        best = { d: d, t: { fdi: fdi, poly: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], box: box, upper: upper, side: near[0].side, idx: near[0].idx, cx: cx, cy: y0 + h / 2, apex: upper ? [cx, y0] : [cx, y0 + h], tip: upper ? [cx, y0 + h] : [cx, y0], h: h, w: w, virtual: true } };
      }
    });
    return best ? best.t : null;
  }
  /** Full automatic reading. imageData ≤ 1400 px wide; teeth polygons in the same pixel space. */
  /** Percentile stretch (p0.5 → 0, p99.7 → 255) so the intensity rules behave alike on exports with different dynamic range. */
  function normalizeImageData(imageData) {
    var W = imageData.width, H = imageData.height, src = imageData.data, hist = new Uint32Array(256), n = 0;
    for (var i = 0; i < W * H; i++) { hist[src[i * 4]]++; n++; }
    var lo = 0, hi = 255, acc = 0;
    for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.005) { lo = v; break; } }
    acc = 0; for (var u = 255; u >= 0; u--) { acc += hist[u]; if (acc >= n * 0.003) { hi = u; break; } }
    if (hi - lo < 40) return imageData;
    if (lo <= 8 && hi >= 250) return imageData; // already full range
    var lut = new Uint8ClampedArray(256); for (var k = 0; k < 256; k++) lut[k] = Math.max(0, Math.min(255, Math.round((k - lo) * 255 / (hi - lo))));
    var out = new Uint8ClampedArray(src.length);
    for (var j = 0; j < W * H; j++) { var q = lut[src[j * 4]]; out[j * 4] = out[j * 4 + 1] = out[j * 4 + 2] = q; out[j * 4 + 3] = 255; }
    return { width: W, height: H, data: out, normalized: { lo: lo, hi: hi } };
  }
  function analyzeImageData(imageData, teeth, opts) {
    opts = opts || {};
    if (!opts.noNormalize) imageData = normalizeImageData(imageData);
    var W = imageData.width, H = imageData.height, g = grayOf(imageData);
    var T = describeTeeth(teeth);
    var out = { anatomy: [], findings: [], version: VERSION, width: W, height: H, normalized: imageData.normalized || null };
    out.anatomy = anatomyFromTeeth(teeth, W, H, g);

    // --- radiopacities (reuse the measured detector mask, classify by location) ---
    var teethMask = new Uint8Array(W * H);
    T.forEach(function (t) { rasterPolygon(t.poly, W, H, teethMask, 1); });
    var dets = D.detectImageData(imageData, { minArea: 90 });
    var bgObj = D._internal.background(g, W, H, D.DEFAULTS.bgStep, D.DEFAULTS.bgSize);
    var bgAt = function (x, y) { var sx = Math.min(bgObj.sw - 1, (x / bgObj.step) | 0), sy = Math.min(bgObj.sh - 1, (y / bgObj.step) | 0); return bgObj.small[sy * bgObj.sw + sx]; };
    // bright mask for hull extraction (same rule as the detector)
    var bright = new Uint8Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var i = y * W + x; if (g[i] >= 220 && g[i] - bgAt(x, y) >= 60) bright[i] = 1; }
    var opened = D._internal.opening(bright, W, H);
    var bcomps = componentsWithHull(opened, W, H, 90);
    var dent = T.length ? G.bbox([].concat.apply([], T.map(function (t) { return [[t.box.x, t.box.y], [t.box.x + t.box.w, t.box.y + t.box.h]]; }))) : null;
    var wMed = T.length ? median(T.map(function (t) { return t.w; })) : 40, hMed = T.length ? median(T.map(function (t) { return t.h; })) : 120;
    bcomps.forEach(function (c) {
      if (c.h > 0.3 * H || Math.max(c.h, c.w) / Math.max(1, Math.min(c.h, c.w)) > 8) return;
      if (c.x < W * 0.08 || c.x + c.w > W * 0.92 || c.y < H * 0.12 || c.y > H * 0.92) return;
      var cl = T.length ? classifyOpaque(c, T, W, H, teethMask, meanIn(g, W, c)) : { code: c.h / Math.max(1, c.w) >= 2.2 && c.h >= 0.08 * H ? 'DEN-IMPL' : 'DEN-RST', fdi: null, how: 'bright blob (no tooth outlines available)' };
      if (!cl) return;
      if (cl.code === 'JAW-ROP') {
        var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        if (!dent || c.area < 200 || cx < dent.x - wMed * 1.5 || cx > dent.x + dent.w + wMed * 1.5 || cy < dent.y - hMed * 0.6 || cy > dent.y + dent.h + hMed * 1.2) return;
      }
      out.findings.push(proposal(cl.code, 'polygon', c.hull, { fdi: cl.fdi, how: cl.how, area: c.area }));
    });
    // crowns on ≥ 3 neighbouring teeth read as one bridge (splinted units)
    if (T.length) {
      var crownLike = {};
      out.findings.forEach(function (f) { if (!f.fdi || !/DEN-CRN|DEN-FIL|DEN-RST/.test(f.code)) return; var t = T.filter(function (tt) { return tt.fdi === f.fdi; })[0]; if (t && f.box.w >= 0.6 * t.w && f.box.h >= 0.25 * t.h) (crownLike[f.fdi] = crownLike[f.fdi] || []).push(f); });
      ['upper', 'lower'].forEach(function (arch) {
        var row = T.filter(function (t) { return (arch === 'upper') === t.upper; }).sort(function (a, b) { return a.cx - b.cx; });
        var run = [];
        var flush = function () { if (run.length >= 3) run.forEach(function (fdi) { crownLike[fdi].forEach(function (f) { f.code = 'DEN-BRG'; f.how = 'crown-like opacity on ' + run.length + ' neighbouring teeth'; }); }); run = []; };
        row.forEach(function (t, i) {
          var prev = row[i - 1];
          var contiguous = prev && (t.box.x - (prev.box.x + prev.box.w)) < 0.5 * wMed;
          if (crownLike[t.fdi] && (!run.length || contiguous)) run.push(t.fdi); else { flush(); if (crownLike[t.fdi]) run.push(t.fdi); }
        });
        flush();
      });
    }
    // dedicated implant pass: fixtures are tall, narrow, fairly bright, outside the tooth outlines, within the dentition region
    if (T.length && dent) {
      var impMask = new Uint8Array(W * H);
      var ix0 = Math.max(0, Math.floor(dent.x - wMed * 1.5)), ix1 = Math.min(W - 1, Math.ceil(dent.x + dent.w + wMed * 1.5));
      var iy0 = Math.max(0, Math.floor(dent.y - hMed * 0.3)), iy1 = Math.min(H - 1, Math.ceil(dent.y + dent.h + hMed * 0.9));
      for (var yy = iy0; yy <= iy1; yy++) for (var xx = ix0; xx <= ix1; xx++) { var ii = yy * W + xx; if (!teethMask[ii] && g[ii] >= 175 && g[ii] - bgAt(xx, yy) >= 40) impMask[ii] = 1; }
      componentsWithHull(D._internal.opening(impMask, W, H), W, H, 150).forEach(function (c) {
        var aspect = c.h / Math.max(1, c.w);
        if (aspect < 1.7 || c.h < 0.35 * hMed || c.w < 0.38 * wMed || c.w > 1.4 * wMed) return;
        var spanned = T.filter(function (t) { return G.polygonsOverlap(c.hull, t.poly); }); if (spanned.length) return;
        var dupIdx = -1; out.findings.forEach(function (f, i) { if (dupIdx < 0 && D.iou(f.box, { x: c.x, y: c.y, w: c.w, h: c.h }) > 0.2) dupIdx = i; });
        var pr = proposal('DEN-IMPL', 'polygon', c.hull, { fdi: null, how: 'tall, fixture-wide bright body outside tooth outlines', area: c.area });
        if (dupIdx >= 0) { var ex = out.findings[dupIdx]; if (/JAW-ROP|DEN-IMPL/.test(ex.code) || (!ex.fdi && /DEN-ROP|DEN-RST|DEN-POST|DEN-RCT|DEN-FIL|DEN-CRN/.test(ex.code))) out.findings[dupIdx] = pr; } else out.findings.push(pr);
      });
    }
    // second pass for root canal fillings: thin bright ridges inside root regions
    {
      var rootMask = new Uint8Array(W * H);
      if (!T.length) {
        // no tooth outlines: proportional band where the roots of a standard panoramic framing lie
        rasterPolygon([[W * 0.2, H * 0.3], [W * 0.8, H * 0.3], [W * 0.8, H * 0.74], [W * 0.2, H * 0.74]], W, H, rootMask, 1);
      }
      [true, false].forEach(function (upper) {
        var arch = T.filter(function (t) { return t.upper === upper; }).sort(function (a, b) { return a.cx - b.cx; });
        if (!arch.length) return;
        var band = function (xa, xb, y0, hh) { var ry0 = upper ? y0 : y0 + hh * 0.4, ry1 = upper ? y0 + hh * 0.6 : y0 + hh; rasterPolygon([[xa, ry0], [xb, ry0], [xb, ry1], [xa, ry1]], W, H, rootMask, 1); };
        for (var ai = 0; ai + 1 < arch.length; ai++) {
          var a = arch[ai], b = arch[ai + 1], gap = b.box.x - (a.box.x + a.box.w);
          if (gap < wMed * 0.5 || gap > wMed * 3.2) continue;
          band(a.box.x + a.box.w, b.box.x, (a.box.y + b.box.y) / 2, (a.h + b.h) / 2);
        }
        // unlabelled teeth beyond the last labelled one on each side (treated molars are rarely labelled "normal")
        var first = arch[0], last = arch[arch.length - 1];
        band(Math.max(0, first.box.x - wMed * 3.2), first.box.x, first.box.y, first.h);
        band(last.box.x + last.box.w, Math.min(W, last.box.x + last.box.w + wMed * 3.2), last.box.y, last.h);
      });
      T.forEach(function (t) {
        rasterPolygon(t.poly, W, H, rootMask, 1);
        // clear the crown half (occlusal side) so only the root part remains
        var cy0 = t.upper ? Math.floor(t.box.y + t.box.h * 0.6) : Math.max(0, Math.floor(t.box.y)), cy1 = t.upper ? Math.min(H - 1, Math.ceil(t.box.y + t.box.h)) : Math.ceil(t.box.y + t.box.h * 0.4);
        var bx0 = Math.max(0, Math.floor(t.box.x)), bx1 = Math.min(W - 1, Math.ceil(t.box.x + t.box.w));
        for (var ry = cy0; ry <= cy1; ry++) for (var rx = bx0; rx <= bx1; rx++) rootMask[ry * W + rx] = 0;
      });
      // also the root bands of unlabelled tooth positions: the arch band below/above the labelled crowns
      var thin = new Uint8Array(W * H), rr = Math.max(3, Math.round(W / 1400 * 5));
      for (var yy2 = 1; yy2 < H - 1; yy2++) for (var xx2 = rr; xx2 < W - rr; xx2++) {
        var i2 = yy2 * W + xx2; if (!rootMask[i2]) continue;
        var v = g[i2]; if (v < 120) continue;
        var left = (g[i2 - rr] + g[i2 - rr + 1] + g[i2 - rr - W]) / 3, right = (g[i2 + rr] + g[i2 + rr - 1] + g[i2 + rr - W]) / 3;
        var ridge = v - Math.max(left, right);
        if ((v >= 205 && v - bgAt(xx2, yy2) >= 45) || (ridge >= 20 && v - bgAt(xx2, yy2) >= 10)) thin[i2] = 1;
      }
      // keep the canal lines apart from the crowns/fillings they run into: remove the (dilated) bright blobs, not thin lines
      var blobMask = new Uint8Array(W * H);
      bcomps.forEach(function (b) { if (b.h / Math.max(1, b.w) >= 3 && b.w <= 8) return; rasterPolygon(b.hull, W, H, blobMask, 1); });
      for (var yy3 = 2; yy3 < H - 2; yy3++) for (var xx3 = 2; xx3 < W - 2; xx3++) {
        var i3b = yy3 * W + xx3; if (!blobMask[i3b]) continue;
        for (var dy3 = -2; dy3 <= 2; dy3++) for (var dx3 = -2; dx3 <= 2; dx3++) thin[i3b + dy3 * W + dx3] = 0;
      }
      // close one-row gaps along the line
      for (var yy4 = 1; yy4 < H - 1; yy4++) for (var xx4 = 0; xx4 < W; xx4++) { var i4b = yy4 * W + xx4; if (!thin[i4b] && thin[i4b - W] && thin[i4b + W]) thin[i4b] = 2; }
      for (var i5 = 0; i5 < W * H; i5++) if (thin[i5] === 2) thin[i5] = 1;
      var hRef2 = T.length ? hMed : H * 0.16, wRef2 = T.length ? wMed : W * 0.03;
      // a root canal filling nearly always sits under a coronal restoration or crown: require a bright blob on the occlusal side
      var crowns = bcomps.filter(function (b) { return b.area >= 60; });
      var midY = T.length ? median(T.map(function (t) { return t.upper ? t.box.y + t.box.h : t.box.y; })) : H * 0.52;
      componentsWithHull(thin, W, H, 16).forEach(function (c) {
        var aspect = c.h / Math.max(1, c.w); if (aspect < 3 || c.w > Math.max(8, wRef2 * 0.3) || c.h < hRef2 * 0.15 || c.h > hRef2 * 0.9) return;
        var cx = c.x + c.w / 2, cy = c.y + c.h / 2, upper = cy < midY;
        var crowned = crowns.some(function (b) {
          var bx = b.x + b.w / 2, dy = upper ? (b.y - (c.y + c.h)) : (c.y - (b.y + b.h));
          return Math.abs(bx - cx) <= Math.max(b.w / 2, wRef2 * 0.6) + c.w && dy > -c.h * 0.3 && dy < hRef2 * 0.45;
        });
        if (!crowned) return;
        var dup = out.findings.some(function (f) { return D.iou(f.box, { x: c.x, y: c.y, w: c.w, h: c.h }) > 0.2; }); if (dup) return;
        var t = T.filter(function (tt) { return G.pointInPolygon([cx, cy], tt.poly); })[0];
        out.findings.push(proposal('DEN-RCT', 'polygon', c.hull, { fdi: t ? t.fdi : null, how: 'thin bright line in a root, under a coronal restoration', area: c.area }));
      });
    }

    // --- radiolucencies inside the bone zone ---
    if (T.length >= 6) {
      var zone = new Uint8Array(W * H);
      var hRef = median(T.map(function (t) { return t.h; }));
      // periapical + alveolar bone zone: a band beyond each tooth's apex and the bone between roots
      T.forEach(function (t) {
        var y0 = t.upper ? t.apex[1] - hRef * 0.25 : t.apex[1] - hRef * 0.4, y1 = t.upper ? t.apex[1] + hRef * 0.4 : t.apex[1] + hRef * 0.4;
        var x0 = t.box.x - t.w * 0.3, x1 = t.box.x + t.box.w + t.w * 0.3;
        rasterPolygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], W, H, zone, 1);
      });
      // remove the teeth themselves and the normal dark structures of the atlas
      for (var k = 0; k < W * H; k++) if (teethMask[k]) zone[k] = 0;
      out.anatomy.forEach(function (a) {
        if (a.code === 'ANA-SIN') rasterPolygon(a.shape.points, W, H, zone, 0);
        if (a.code === 'ANA-MF') rasterPolygon(ellipse(a.shape.points[0][0], a.shape.points[0][1], hRef * 0.16, hRef * 0.13, 10), W, H, zone, 0);
        if (a.code === 'ANA-IAC') { var pts = a.shape.points; for (var s = 0; s + 1 < pts.length; s++) rasterPolygon(thickSeg(pts[s], pts[s + 1], hRef * 0.12), W, H, zone, 0); }
        if (a.code === 'ANA-NAS') { var np = a.shape.points.map(function (p) { return [p[0], p[1] + hRef * 0.2]; }); rasterPolygon(np.concat(np.slice().reverse().map(function (p) { return [p[0], p[1] - hRef * 0.9]; })), W, H, zone, 0); }
        if (a.code === 'ANA-MBD') { var mp = a.shape.points; rasterPolygon(mp.concat(mp.slice().reverse().map(function (p) { return [p[0], Math.min(H - 1, p[1] + hRef)]; })), W, H, zone, 0); }
      });
      var dark = new Uint8Array(W * H);
      for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) { var i3 = y2 * W + x2; if (zone[i3] && g[i3] <= 85 && bgAt(x2, y2) - g[i3] >= 48) dark[i3] = 1; }
      var dOpen = D._internal.opening(dark, W, H);
      componentsWithHull(dOpen, W, H, 120).forEach(function (c) {
        if (c.h > 0.2 * H || c.w > 0.2 * W) return;
        if (Math.max(c.h, c.w) / Math.max(1, Math.min(c.h, c.w)) > 2.6) return; // lesions are roundish; dark slits are bone pattern or air
        var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        if (!enclosed(g, W, H, c, teethMask)) return; // a lesion is surrounded by bone; air spaces continue beyond the blob
        // incisive (nasopalatine) foramen: a normal midline radiolucency between the upper central incisor apices
        var inc = T.filter(function (t) { return t.upper && t.idx === 1; });
        if (inc.length && Math.abs(cx - median(inc.map(function (t) { return t.cx; }))) < median(inc.map(function (t) { return t.w; })) * 1.1 && cy < median(inc.map(function (t) { return t.apex[1]; })) + hRef * 0.15) return;
        // periapical: the blob lies within 0.3·h of a root apex
        var near = null, nd = Infinity;
        T.forEach(function (t) { var d = Math.hypot(t.apex[0] - cx, t.apex[1] - cy); if (d < nd) { nd = d; near = t; } });
        var apical = near && nd <= hRef * 0.3 && Math.abs(cy - near.apex[1]) <= hRef * 0.16 && !(near.upper && near.idx >= 4 && cy < near.apex[1] - hRef * 0.04);
        if (apical) out.findings.push(proposal('DEN-PAR', 'polygon', c.hull, { fdi: near.fdi, how: 'dark enclosed blob centred on the apex', area: c.area }));
        else {
          // beyond the apices of the maxilla the dark shadows are nasal fossa / sinus: not proposed. In the mandible, only a strongly enclosed blob.
          var beyondUpper = near && near.upper && cy < near.apex[1];
          if (beyondUpper) return;
          if (!enclosed(g, W, H, c, teethMask, 0.9)) return;
          out.findings.push(proposal('JAW-RLU', 'polygon', c.hull, { fdi: null, how: 'dark enclosed blob in bone away from normal dark structures', area: c.area }));
        }
      });
    }
    // image side for sided codes
    out.anatomy.forEach(function (a) { if (!a.side) a.side = null; });
    return out;
  }
  /** True when the ring around the blob (1.5× its size) is clearly brighter than the blob on ≥ 75 % of the sampled directions (ignoring tooth pixels). */
  function enclosed(g, W, H, c, teethMask, frac) {
    var cx = c.x + c.w / 2, cy = c.y + c.h / 2, rx = c.w / 2, ry = c.h / 2, inside = 0, n = 0;
    for (var y = c.y; y < c.y + c.h; y += 2) for (var x = c.x; x < c.x + c.w; x += 2) { if (((x - cx) / rx) * ((x - cx) / rx) + ((y - cy) / ry) * ((y - cy) / ry) <= 1) { inside += g[y * W + x]; n++; } }
    if (!n) return false; inside /= n;
    var ok = 0, tot = 0;
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2, sum = 0, m = 0;
      for (var k = 1.35; k <= 1.9; k += 0.15) { var px = Math.round(cx + Math.cos(a) * rx * k), py = Math.round(cy + Math.sin(a) * ry * k); if (px < 0 || py < 0 || px >= W || py >= H) continue; var idx = py * W + px; if (teethMask && teethMask[idx]) continue; sum += g[idx]; m++; }
      if (!m) continue; tot++; if (sum / m >= inside + 28) ok++;
    }
    return tot >= 10 && ok / tot >= (frac || 0.75);
  }
  function meanIn(g, W, c) { var s = 0, n = 0; for (var y = c.y; y < c.y + c.h; y += 2) for (var x = c.x; x < c.x + c.w; x += 2) { s += g[y * W + x]; n++; } return n ? s / n : 0; }
  function thickSeg(a, b, r) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * r, ny = dx / l * r; return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]; }

  /** Browser entry: image element/bitmap + teeth polygons in image pixels. Rescales to ≤ 1400 px and back. */
  function analyze(img, teeth, opts) {
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var s = Math.min(1, 1400 / iw), w = Math.round(iw * s), h = Math.round(ih * s);
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
    var scaled = (teeth || []).map(function (t) { return { fdi: t.fdi, poly: t.poly.map(function (p) { return [p[0] * s, p[1] * s]; }) }; });
    var res = analyzeImageData(ctx.getImageData(0, 0, w, h), scaled, opts);
    if (s !== 1) {
      var back = function (p) { return [Math.round(p[0] / s), Math.round(p[1] / s)]; };
      res.anatomy.concat(res.findings).forEach(function (pr) { pr.shape.points = pr.shape.points.map(back); var b = G.bbox(pr.shape.points); pr.box = { x: b.x, y: b.y, w: Math.max(1, b.w), h: Math.max(1, b.h) }; });
    }
    return res;
  }

  root.PX_AUTO = { VERSION: VERSION, MEASURED: MEASURED, analyze: analyze, analyzeImageData: analyzeImageData, anatomyFromTeeth: anatomyFromTeeth, classifyOpaque: classifyOpaque, _internal: { normalizeImageData: normalizeImageData, hull: hull, rasterPolygon: rasterPolygon, componentsWithHull: componentsWithHull, edgeBelow: edgeBelow } };
})(typeof window !== 'undefined' ? window : globalThis);
