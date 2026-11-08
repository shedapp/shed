/* PanoramIA — planar geometry for annotation shapes and the geometric suggestions of the surgical traffic light.
   Pure functions; image pixel coordinates; y grows downwards. Points are [x, y].
   Conventions used by the suggestions (teaching conventions, stated in the UI):
   - Winter angulation from the angle between the long axes of the third and second molars:
     vertical -10..10°, mesioangular 11..79°, horizontal 80..100°, distoangular -11..-79° (negative = crown tilted distally), beyond = inverted/other.
   - Pell & Gregory depth: A = third-molar occlusal surface at or above the second-molar occlusal plane; B = between the plane and the
     second-molar cervical line; C = below the cervical line.
   - Pell & Gregory ramus: fraction of the third-molar crown width that lies within the ramus (distal to the anterior border line):
     0 = Class I, partial = Class II, all = Class III. */
(function (root) {
  'use strict';

  function area(pts) { var a = 0; for (var i = 0, n = pts.length; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
  function centroid(pts) {
    var a = area(pts); if (Math.abs(a) < 1e-9) { var sx = 0, sy = 0; pts.forEach(function (p) { sx += p[0]; sy += p[1]; }); return [sx / pts.length, sy / pts.length]; }
    var cx = 0, cy = 0;
    for (var i = 0, n = pts.length; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n], f = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f; }
    return [cx / (6 * a), cy / (6 * a)];
  }
  function bbox(pts) { var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; pts.forEach(function (p) { x1 = Math.min(x1, p[0]); y1 = Math.min(y1, p[1]); x2 = Math.max(x2, p[0]); y2 = Math.max(y2, p[1]); }); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }
  /** Resamples the polygon outline densely so that the principal axis reflects the shape, not the vertex density. */
  function sampleOutline(pts, step) {
    var out = [];
    for (var i = 0, n = pts.length; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n], d = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.max(1, Math.ceil(d / step));
      for (var j = 0; j < k; j++) out.push([p[0] + (q[0] - p[0]) * j / k, p[1] + (q[1] - p[1]) * j / k]);
    }
    return out;
  }
  /** Principal (long) axis of a polygon via the covariance of its densely sampled outline. Returns a unit direction and the two extreme points. */
  function principalAxis(pts) {
    var s = sampleOutline(pts, 2), n = s.length, mx = 0, my = 0;
    s.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= n; my /= n;
    var sxx = 0, syy = 0, sxy = 0;
    s.forEach(function (p) { var dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    var theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); // direction of maximum variance
    var ux = Math.cos(theta), uy = Math.sin(theta);
    var tmin = Infinity, tmax = -Infinity;
    pts.forEach(function (p) { var tt = (p[0] - mx) * ux + (p[1] - my) * uy; tmin = Math.min(tmin, tt); tmax = Math.max(tmax, tt); });
    return { cx: mx, cy: my, ux: ux, uy: uy, a: [mx + ux * tmin, my + uy * tmin], b: [mx + ux * tmax, my + uy * tmax], length: tmax - tmin };
  }
  /** Oriented long axis: returns crown end and apex end. For a lower tooth the crown is the upper end (smaller y); for an upper tooth the lower end. */
  function toothAxis(pts, upper) {
    var ax = principalAxis(pts);
    var crown = ax.a, apex = ax.b, how = 'vertical-rule';
    // Width of the outline near each end of the axis: the crown end of a tooth is wider than the apical end.
    var s = sampleOutline(pts, 2), wA = 0, wB = 0, L = ax.length || 1;
    s.forEach(function (p) {
      var dx = p[0] - ax.cx, dy = p[1] - ax.cy, tt = dx * ax.ux + dy * ax.uy, perp = Math.abs(-dx * ax.uy + dy * ax.ux);
      var ta = (ax.a[0] - ax.cx) * ax.ux + (ax.a[1] - ax.cy) * ax.uy;
      if (Math.abs(tt - ta) <= L * 0.3) wA = Math.max(wA, perp); else if (Math.abs(tt - ta) >= L * 0.7) wB = Math.max(wB, perp);
    });
    var tiltFromVertical = Math.abs(Math.atan2(Math.abs(ax.ux), Math.abs(ax.uy)) * 180 / Math.PI); // 0 = vertical axis
    if (tiltFromVertical > 60 && Math.max(wA, wB) > 0 && Math.abs(wA - wB) / Math.max(wA, wB) > 0.15) {
      how = 'width-rule';
      if (wB > wA) { crown = ax.b; apex = ax.a; }
    } else if (upper ? (ax.a[1] < ax.b[1]) : (ax.a[1] > ax.b[1])) { crown = ax.b; apex = ax.a; }
    return { crown: crown, apex: apex, length: ax.length, centroid: [ax.cx, ax.cy], how: how };
  }
  function angleDeg(v) { return Math.atan2(v[1], v[0]) * 180 / Math.PI; }
  function normDeg(a) { while (a > 180) a -= 360; while (a <= -180) a += 360; return a; }
  /** Winter angle: tilt of the third-molar axis relative to the second-molar axis, in degrees, positive when the crown tilts mesially.
      mesialDir = +1 if mesial is towards larger x (patient's right side, viewer's left), -1 otherwise. */
  function winterAngle(m3, m2, upper, mesialDir) {
    var a3 = toothAxis(m3, upper), a2 = toothAxis(m2, upper);
    var v3 = [a3.crown[0] - a3.apex[0], a3.crown[1] - a3.apex[1]], v2 = [a2.crown[0] - a2.apex[0], a2.crown[1] - a2.apex[1]];
    var rel = normDeg(angleDeg(v3) - angleDeg(v2)); // signed rotation from the M2 axis to the M3 axis
    // For a lower tooth the crown vector points up (negative y). A mesial tilt moves the crown towards mesialDir in x.
    // Rotating the up-vector towards +x is a negative angle in screen coordinates (y down), so the sign is flipped accordingly.
    var mesialTilt = rel * mesialDir * (upper ? -1 : 1);
    var cls = classifyWinter(mesialTilt);
    return { angle: Math.round(mesialTilt), cls: cls, axisM3: a3, axisM2: a2 };
  }
  function classifyWinter(a) {
    if (a >= -10 && a <= 10) return 'vertical';
    if (a > 10 && a < 80) return 'mesioangular';
    if (a >= 80 && a <= 100) return 'horizontal';
    if (a < -10 && a > -80) return 'distoangular';
    return 'other';
  }
  function distPointSeg(px, py, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    var tt = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0;
    return Math.hypot(px - (a[0] + tt * dx), py - (a[1] + tt * dy));
  }
  function distPointPath(p, path, closed) { var best = Infinity, n = path.length; for (var i = 0; i < (closed ? n : n - 1); i++) best = Math.min(best, distPointSeg(p[0], p[1], path[i], path[(i + 1) % n])); return best; }
  function segsIntersect(p1, p2, p3, p4) {
    function o(a, b, c) { var v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]); return Math.abs(v) < 1e-9 ? 0 : (v > 0 ? 1 : 2); }
    var o1 = o(p1, p2, p3), o2 = o(p1, p2, p4), o3 = o(p3, p4, p1), o4 = o(p3, p4, p2);
    return o1 !== o2 && o3 !== o4;
  }
  function pointInPolygon(p, pts) {
    var inside = false, x = p[0], y = p[1];
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
    }
    return inside;
  }
  /** Does an open path (polyline) cross or enter a polygon? */
  function pathMeetsPolygon(path, poly) {
    for (var i = 0; i < path.length; i++) if (pointInPolygon(path[i], poly)) return true;
    for (var a = 0; a < path.length - 1; a++) for (var b = 0; b < poly.length; b++) if (segsIntersect(path[a], path[a + 1], poly[b], poly[(b + 1) % poly.length])) return true;
    return false;
  }
  function polygonsOverlap(p, q) {
    for (var i = 0; i < p.length; i++) if (pointInPolygon(p[i], q)) return true;
    for (var j = 0; j < q.length; j++) if (pointInPolygon(q[j], p)) return true;
    for (var a = 0; a < p.length; a++) for (var b = 0; b < q.length; b++) if (segsIntersect(p[a], p[(a + 1) % p.length], q[b], q[(b + 1) % q.length])) return true;
    return false;
  }
  /** Minimum distance between a polygon outline (or its apical part) and a path. */
  function minDistPolyPath(poly, path, closedPath) {
    var s = sampleOutline(poly, 3), best = Infinity;
    s.forEach(function (p) { best = Math.min(best, distPointPath(p, path, !!closedPath)); });
    var ps = closedPath ? sampleOutline(path, 3) : path;
    ps.forEach(function (p) { best = Math.min(best, distPointPath(p, poly, true)); });
    return best;
  }
  /** Relation of a tooth polygon to the mandibular canal path. apicalFraction keeps only the apical part of the tooth for the distance. */
  function canalRelation(tooth, canal, upper) {
    var touches = pathMeetsPolygon(canal, tooth);
    var b = bbox(tooth);
    // apical third of the tooth: lower part for lower teeth
    var apical = tooth.filter(function (p) { return upper ? p[1] <= b.y + b.h / 3 : p[1] >= b.y + b.h * 2 / 3; });
    var dist = minDistPolyPath(apical.length >= 3 ? apical : tooth, canal, false);
    return { overlap: touches, distancePx: Math.round(dist), relation: touches ? 'superimposed' : 'separate' };
  }
  function sinusRelation(tooth, sinus) {
    var closed = sinus.length >= 3;
    var inside = closed ? polygonsOverlap(tooth, sinus) : pathMeetsPolygon(sinus, tooth);
    var dist = minDistPolyPath(tooth, sinus, closed);
    return { overlap: inside, distancePx: Math.round(dist), relation: inside ? 'projecting' : 'separate' };
  }
  /** y of a line (2+ points, treated as the segment between its extremes, extrapolated) at a given x. */
  function lineYatX(line, x) {
    var a = line[0], b = line[line.length - 1];
    if (Math.abs(b[0] - a[0]) < 1e-9) return a[1];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  function lineXatY(line, y) {
    var a = line[0], b = line[line.length - 1];
    if (Math.abs(b[1] - a[1]) < 1e-9) return a[0];
    return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
  }
  /** Pell & Gregory depth from the M3 polygon, the occlusal plane line and the M2 cervical line. */
  function pellDepth(m3, occ, cej, upper) {
    var b = bbox(m3), xc = b.x + b.w / 2;
    var top = upper ? b.y + b.h : b.y; // occlusal extreme of the third molar
    var yOcc = lineYatX(occ, xc), yCej = lineYatX(cej, xc);
    var depth;
    if (upper) depth = top >= yOcc ? 'A' : (top >= yCej ? 'B' : 'C');
    else depth = top <= yOcc ? 'A' : (top <= yCej ? 'B' : 'C');
    return { depth: depth, occlusalY: Math.round(yOcc), cervicalY: Math.round(yCej), toothTopY: Math.round(top) };
  }
  /** Pell & Gregory ramus class from the M3 crown extent and the anterior ramus border line. distalDir = -1 when distal is towards smaller x (patient's right). */
  function pellRamus(m3, ramusLine, distalDir, upper) {
    var b = bbox(m3);
    var crownY = upper ? b.y + b.h * 0.75 : b.y + b.h * 0.25; // crown level
    var xr = lineXatY(ramusLine, crownY);
    var covered; // fraction of the mesiodistal width that lies within the ramus
    if (distalDir < 0) covered = (xr - b.x) / b.w; else covered = (b.x + b.w - xr) / b.w;
    covered = Math.max(0, Math.min(1, covered));
    var cls = covered <= 0.02 ? 'I' : (covered >= 0.98 ? 'III' : 'II');
    return { ramus: cls, covered: Math.round(covered * 100) / 100, ramusX: Math.round(xr) };
  }
  /** Side of a shape on a panoramic: patient's right appears on the viewer's left. */
  function sideOf(points, imageWidth) { var c = centroid(points.length >= 3 ? points : points.concat([points[0]])); var cx = points.length >= 3 ? c[0] : points.reduce(function (s, p) { return s + p[0]; }, 0) / points.length; return cx < imageWidth / 2 ? 'R' : 'L'; }
  function fdiSide(fdi) { var q = Math.floor(fdi / 10); return (q === 1 || q === 4 || q === 5 || q === 8) ? 'R' : 'L'; }
  function fdiUpper(fdi) { var q = Math.floor(fdi / 10); return q === 1 || q === 2 || q === 5 || q === 6; }
  function length(points) { var l = 0; for (var i = 0; i < points.length - 1; i++) l += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]); return l; }

  root.PX_GEOM = { area: area, centroid: centroid, bbox: bbox, principalAxis: principalAxis, toothAxis: toothAxis, winterAngle: winterAngle, classifyWinter: classifyWinter,
    distPointSeg: distPointSeg, distPointPath: distPointPath, segsIntersect: segsIntersect, pointInPolygon: pointInPolygon, pathMeetsPolygon: pathMeetsPolygon, polygonsOverlap: polygonsOverlap,
    minDistPolyPath: minDistPolyPath, canalRelation: canalRelation, sinusRelation: sinusRelation, lineYatX: lineYatX, lineXatY: lineXatY, pellDepth: pellDepth, pellRamus: pellRamus,
    sideOf: sideOf, fdiSide: fdiSide, fdiUpper: fdiUpper, length: length };
})(typeof window !== 'undefined' ? window : globalThis);
