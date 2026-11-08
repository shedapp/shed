/* PanoramIA — canvas viewer: zoom, pan, window adjustment and shape annotations.
   Shapes: rect | polygon | polyline | line | point, all in image pixel coordinates.
   Items given to setBoxes(): { id, x, y, w, h, shape?: {type, points}, color, label, selectable, dashed, alpha, fill, fillAlpha, anatomy }.
   Tools: pan | box | polygon | free | polyline | line | point.
   Callbacks: onCreate(geom), onChange(id, geom), onSelect(id), onClick(imagePoint), onDraft(state).
   geom = { x, y, w, h, shape: { type, points } } — the box is always the bounding box of the shape. */
(function (root) {
  'use strict';

  var MIN_POLY = 3, MIN_LINE = 2;

  function Viewer(canvas, opts) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.img = null; this.iw = 0; this.ih = 0;
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.bright = 1; this.contrast = 1; this.invert = false;
    this.tool = this.opts.tool || 'pan';
    this.boxes = []; this.selectedId = null; this.overlay = [];
    this.readOnly = !!this.opts.readOnly;
    this.drag = null; this.draft = null; this.raf = 0; this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this._bind();
    this.resize();
  }

  // ---------- geometry helpers (exported for tests) ----------
  function bboxOf(points) {
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    points.forEach(function (p) { if (p[0] < x1) x1 = p[0]; if (p[0] > x2) x2 = p[0]; if (p[1] < y1) y1 = p[1]; if (p[1] > y2) y2 = p[1]; });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  function geomFromShape(shape) {
    var pts = shape.points;
    if (shape.type === 'point') { var p = pts[0]; return { x: Math.round(p[0] - 10), y: Math.round(p[1] - 10), w: 20, h: 20, shape: shape }; }
    var b = bboxOf(pts);
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.max(1, Math.round(b.w)), h: Math.max(1, Math.round(b.h)), shape: shape };
  }
  function shapeOfItem(b) {
    if (b.shape && b.shape.points && b.shape.points.length) return b.shape;
    return { type: 'rect', points: [[b.x, b.y], [b.x + b.w, b.y + b.h]] };
  }
  function pointInPolygon(x, y, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      var hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }
  function distToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var tt = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    var qx = ax + tt * dx, qy = ay + tt * dy;
    return Math.hypot(px - qx, py - qy);
  }
  function distToPath(px, py, pts, closed) {
    var best = Infinity, n = pts.length;
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      best = Math.min(best, distToSegment(px, py, a[0], a[1], b[0], b[1]));
    }
    return best;
  }
  // Ramer–Douglas–Peucker simplification for freehand traces
  function simplify(pts, tol) {
    if (pts.length < 3) return pts.slice();
    var keep = new Array(pts.length); keep[0] = keep[pts.length - 1] = true;
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var seg = stack.pop(), a = seg[0], b = seg[1], maxD = 0, idx = -1;
      for (var i = a + 1; i < b; i++) {
        var d = distToSegment(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > tol && idx > 0) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function clampPt(p, iw, ih) { return [Math.round(Math.max(0, Math.min(iw, p[0]))), Math.round(Math.max(0, Math.min(ih, p[1])))]; }

  // ---------- public API ----------
  Viewer.prototype.setImage = function (img) {
    this.img = img; this.iw = img ? (img.width || img.naturalWidth) : 0; this.ih = img ? (img.height || img.naturalHeight) : 0;
    this.fit();
  };
  Viewer.prototype.setBoxes = function (boxes) { this.boxes = boxes || []; this.request(); };
  Viewer.prototype.setOverlay = function (shapes) { this.overlay = shapes || []; this.request(); };
  Viewer.prototype.setTool = function (tool) {
    if (this.draft && tool !== this.tool) this.cancelDraft();
    this.tool = tool; this.canvas.classList.toggle('draw', tool !== 'pan');
    this.request();
  };
  Viewer.prototype.select = function (id) { this.selectedId = id; this.request(); };
  Viewer.prototype.setWindow = function (b, c) { this.bright = b; this.contrast = c; this.request(); };
  Viewer.prototype.toggleInvert = function () { this.invert = !this.invert; this.request(); return this.invert; };
  Viewer.prototype.resetWindow = function () { this.bright = 1; this.contrast = 1; this.invert = false; this.request(); };
  Viewer.prototype.isDrafting = function () { return !!this.draft; };

  Viewer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    this.cw = w; this.ch = h;
    this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
    this.request();
  };
  Viewer.prototype.fit = function () {
    if (!this.img || !this.cw) { this.request(); return; }
    var pad = 16;
    var s = Math.min((this.cw - pad * 2) / this.iw, (this.ch - pad * 2) / this.ih);
    if (!isFinite(s) || s <= 0) s = 1;
    this.scale = s;
    this.tx = (this.cw - this.iw * s) / 2; this.ty = (this.ch - this.ih * s) / 2;
    this.request();
  };
  /** Pans (without changing the zoom) so that an image-space box is centred in the canvas. */
  Viewer.prototype.centerOn = function (box) {
    if (!this.img || !box) return;
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    this.tx = this.cw / 2 - cx * this.scale; this.ty = this.ch / 2 - cy * this.scale;
    this.request();
  };
  Viewer.prototype.zoomAt = function (factor, sx, sy) {
    var ns = Math.min(40, Math.max(0.05, this.scale * factor));
    var k = ns / this.scale;
    this.tx = sx - (sx - this.tx) * k; this.ty = sy - (sy - this.ty) * k; this.scale = ns;
    this.request();
  };
  Viewer.prototype.toImage = function (sx, sy) { return { x: (sx - this.tx) / this.scale, y: (sy - this.ty) / this.scale }; };
  Viewer.prototype.toScreen = function (ix, iy) { return { x: ix * this.scale + this.tx, y: iy * this.scale + this.ty }; };
  Viewer.prototype.request = function () {
    var self = this;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function () { self.raf = 0; self.draw(); });
  };

  // ---------- drafting (polygon / polyline built click by click) ----------
  Viewer.prototype.cancelDraft = function () { this.draft = null; if (this.opts.onDraft) this.opts.onDraft(null); this.request(); };
  Viewer.prototype.undoVertex = function () {
    if (!this.draft) return false;
    this.draft.points.pop();
    if (!this.draft.points.length) this.cancelDraft(); else { if (this.opts.onDraft) this.opts.onDraft(this.draft); this.request(); }
    return true;
  };
  Viewer.prototype.finishDraft = function () {
    var d = this.draft; if (!d) return false;
    var min = d.type === 'polygon' ? MIN_POLY : MIN_LINE;
    this.draft = null; if (this.opts.onDraft) this.opts.onDraft(null);
    if (d.points.length >= min) this._emitCreate({ type: d.type, points: d.points });
    this.request();
    return true;
  };
  Viewer.prototype._emitCreate = function (shape) {
    var self = this;
    shape.points = shape.points.map(function (p) { return clampPt(p, self.iw, self.ih); });
    if (shape.type === 'rect') {
      var a = shape.points[0], b = shape.points[1];
      var x1 = Math.min(a[0], b[0]), y1 = Math.min(a[1], b[1]), x2 = Math.max(a[0], b[0]), y2 = Math.max(a[1], b[1]);
      if (x2 - x1 < 2 || y2 - y1 < 2) return;
      shape.points = [[x1, y1], [x2, y2]];
    }
    var g = geomFromShape(shape);
    if (this.opts.onCreate) this.opts.onCreate(g);
  };
  /** Keyboard handling for drafting; returns true when the key was consumed. */
  Viewer.prototype.handleKey = function (e) {
    if (!this.draft) return false;
    if (e.key === 'Enter') { this.finishDraft(); return true; }
    if (e.key === 'Escape') { this.cancelDraft(); return true; }
    if (e.key === 'Backspace' || e.key === 'Delete') { this.undoVertex(); return true; }
    return false;
  };

  // ---------- drawing ----------
  Viewer.prototype.draw = function () {
    var ctx = this.ctx, dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = getComputedStyle(this.canvas).getPropertyValue('--viewer-bg') || '#0b0e12';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.img) return;
    ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, dpr * this.tx, dpr * this.ty);
    ctx.imageSmoothingEnabled = this.scale < 1;
    var filt = [];
    if (this.bright !== 1) filt.push('brightness(' + this.bright + ')');
    if (this.contrast !== 1) filt.push('contrast(' + this.contrast + ')');
    if (this.invert) filt.push('invert(1)');
    ctx.filter = filt.length ? filt.join(' ') : 'none';
    try { ctx.drawImage(this.img, 0, 0); } catch (e) { /* bitmap may be closed */ }
    ctx.filter = 'none';
    // overlays and shapes in screen space (crisp lines)
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var self = this;
    if (this.overlay && this.overlay.length) this._drawOverlay(ctx);
    this.boxes.forEach(function (b) { self._drawItem(ctx, b, b.id === self.selectedId); });
    if (this.draft) this._drawDraft(ctx);
    ctx.restore();
  };

  Viewer.prototype._path = function (ctx, pts, closed) {
    var self = this;
    ctx.beginPath();
    pts.forEach(function (pt, i) { var q = self.toScreen(pt[0], pt[1]); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); });
    if (closed) ctx.closePath();
  };
  Viewer.prototype._label = function (ctx, text, sx, sy, color) {
    if (!text) return;
    ctx.save();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.font = '600 11px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif');
    var tw = ctx.measureText(text).width + 10;
    var ly = sy - 18 < 2 ? sy + 2 : sy - 18;
    ctx.fillStyle = 'rgba(10,13,17,0.82)'; ctx.fillRect(sx, ly, tw, 16);
    ctx.fillStyle = color; ctx.fillText(text, sx + 5, ly + 12);
    ctx.restore();
  };
  Viewer.prototype._handles = function (ctx, pts) {
    var self = this;
    ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    pts.forEach(function (pt) { var q = self.toScreen(pt[0], pt[1]); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(q.x - 4, q.y - 4, 8, 8); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(q.x - 4.5, q.y - 4.5, 9, 9); });
    ctx.restore();
  };
  // Non-interactive overlay of reference polygons: [{ poly, box, color, label, fillAlpha }]
  Viewer.prototype._drawOverlay = function (ctx) {
    var self = this;
    ctx.save();
    ctx.lineWidth = 1.25;
    ctx.font = '600 10px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif');
    this.overlay.forEach(function (s) {
      var col = s.color || '#4FC3F7';
      ctx.strokeStyle = col; ctx.fillStyle = col;
      var pts = s.poly && s.poly.length >= 3 ? s.poly : null;
      if (pts) self._path(ctx, pts, true);
      else if (s.box) { var b = self.toScreen(s.box[0], s.box[1]); ctx.beginPath(); ctx.rect(b.x, b.y, s.box[2] * self.scale, s.box[3] * self.scale); }
      else return;
      if (s.fillAlpha) { ctx.globalAlpha = s.fillAlpha; ctx.fill(); }
      ctx.globalAlpha = 0.95; ctx.stroke();
      if (s.label && s.box) {
        var lp = self.toScreen(s.box[0] + s.box[2] / 2, s.box[1]);
        var tw = ctx.measureText(s.label).width + 6;
        ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(10,13,17,0.8)';
        ctx.fillRect(lp.x - tw / 2, lp.y - 14, tw, 13);
        ctx.fillStyle = col; ctx.globalAlpha = 1;
        ctx.fillText(s.label, lp.x - tw / 2 + 3, lp.y - 4);
      }
    });
    ctx.restore();
  };
  Viewer.prototype._drawItem = function (ctx, b, selected) {
    var sh = shapeOfItem(b), pts = sh.points, col = b.color || '#4FC3F7';
    var anatomy = !!b.anatomy;
    ctx.save();
    ctx.lineWidth = selected ? 2.5 : (anatomy ? 1.5 : 1.5);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.globalAlpha = b.alpha !== undefined ? b.alpha : 1;
    if (b.dashed || (anatomy && sh.type !== 'polygon' && sh.type !== 'point')) ctx.setLineDash([6, 4]);
    var fillAlpha = b.fillAlpha !== undefined ? b.fillAlpha : (anatomy ? 0 : 0.32);
    var p0 = this.toScreen(pts[0][0], pts[0][1]);
    if (sh.type === 'rect') {
      var p1 = this.toScreen(pts[1][0], pts[1][1]);
      var w = p1.x - p0.x, h = p1.y - p0.y;
      if (fillAlpha) { ctx.save(); ctx.globalAlpha = fillAlpha * (b.alpha !== undefined ? b.alpha : 1); ctx.fillRect(p0.x, p0.y, w, h); ctx.restore(); }
      ctx.strokeRect(p0.x + 0.5, p0.y + 0.5, w, h);
      if (selected && !anatomy) { ctx.setLineDash([]); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(p1.x - 5, p1.y - 5, 10, 10); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(p1.x - 5.5, p1.y - 5.5, 10, 10); }
      else if (selected) this._handles(ctx, pts);
      this._label(ctx, b.label, p0.x, p0.y, col);
    } else if (sh.type === 'polygon') {
      this._path(ctx, pts, true);
      if (fillAlpha) { ctx.save(); ctx.globalAlpha = fillAlpha * (b.alpha !== undefined ? b.alpha : 1); ctx.fill(); ctx.restore(); }
      ctx.stroke();
      if (selected) this._handles(ctx, pts);
      var top = pts.reduce(function (m, p) { return p[1] < m[1] ? p : m; }, pts[0]); var tp = this.toScreen(top[0], top[1]);
      this._label(ctx, b.label, tp.x, tp.y, col);
    } else if (sh.type === 'polyline' || sh.type === 'line') {
      ctx.lineWidth = selected ? 3 : 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      this._path(ctx, pts, false); ctx.stroke();
      if (selected) this._handles(ctx, pts);
      else { ctx.setLineDash([]); ctx.beginPath(); ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2); ctx.fill(); var pe = this.toScreen(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.beginPath(); ctx.arc(pe.x, pe.y, 3, 0, Math.PI * 2); ctx.fill(); }
      this._label(ctx, b.label, p0.x, p0.y, col);
    } else if (sh.type === 'point') {
      ctx.setLineDash([]); ctx.lineWidth = selected ? 2.5 : 1.75;
      ctx.beginPath(); ctx.arc(p0.x, p0.y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p0.x - 12, p0.y); ctx.lineTo(p0.x - 4, p0.y); ctx.moveTo(p0.x + 4, p0.y); ctx.lineTo(p0.x + 12, p0.y); ctx.moveTo(p0.x, p0.y - 12); ctx.lineTo(p0.x, p0.y - 4); ctx.moveTo(p0.x, p0.y + 4); ctx.lineTo(p0.x, p0.y + 12); ctx.stroke();
      this._label(ctx, b.label, p0.x + 10, p0.y, col);
    }
    ctx.restore();
  };
  Viewer.prototype._drawDraft = function (ctx) {
    var d = this.draft, self = this;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    var pts = d.points.slice(); if (d.cursor && (d.type === 'polygon' || d.type === 'polyline')) pts.push(d.cursor);
    if (pts.length >= 2) { this._path(ctx, pts, d.type === 'polygon' && pts.length >= 3); ctx.stroke(); }
    if (d.type === 'polygon' && pts.length >= 3) { ctx.save(); ctx.globalAlpha = 0.12; ctx.fill(); ctx.restore(); }
    ctx.setLineDash([]);
    d.points.forEach(function (pt, i) { var q = self.toScreen(pt[0], pt[1]); ctx.beginPath(); ctx.arc(q.x, q.y, i === 0 && d.type === 'polygon' ? 6 : 3.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  };

  // ---------- hit testing ----------
  Viewer.prototype._hit = function (ix, iy) {
    var tol = 7 / this.scale, hits = [], sel = this.selectedId;
    for (var i = this.boxes.length - 1; i >= 0; i--) {
      var b = this.boxes[i];
      if (!b.selectable) continue;
      var sh = shapeOfItem(b), pts = sh.points;
      if (b.id === sel) {
        for (var k = 0; k < pts.length; k++) {
          if (Math.hypot(ix - pts[k][0], iy - pts[k][1]) <= tol * 1.3) {
            if (sh.type === 'rect' && k === 1) return { box: b, handle: true };
            if (sh.type !== 'rect') return { box: b, vertex: k };
          }
        }
        if (sh.type === 'rect' && Math.abs(ix - (b.x + b.w)) <= tol * 1.5 && Math.abs(iy - (b.y + b.h)) <= tol * 1.5) return { box: b, handle: true };
      }
      var inside = false;
      if (sh.type === 'rect') inside = ix >= b.x - tol && ix <= b.x + b.w + tol && iy >= b.y - tol && iy <= b.y + b.h + tol;
      else if (sh.type === 'polygon') inside = pointInPolygon(ix, iy, pts) || distToPath(ix, iy, pts, true) <= tol;
      else if (sh.type === 'polyline' || sh.type === 'line') inside = distToPath(ix, iy, pts, false) <= tol;
      else if (sh.type === 'point') inside = Math.hypot(ix - pts[0][0], iy - pts[0][1]) <= tol * 1.8;
      if (inside) hits.push(b);
    }
    if (!hits.length) return null;
    // prefer the smallest shape so large anatomical outlines do not swallow the findings inside them
    hits.sort(function (a, b) { return (a.w * a.h) - (b.w * b.h); });
    return { box: hits[0] };
  };

  // ---------- interaction ----------
  Viewer.prototype._bind = function () {
    var self = this, c = this.canvas;
    c.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = c.getBoundingClientRect();
      var factor = Math.exp(-e.deltaY * 0.0015);
      self.zoomAt(factor, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    c.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.button !== 1) return;
      var r = c.getBoundingClientRect();
      var sx = e.clientX - r.left, sy = e.clientY - r.top;
      var ip = self.toImage(sx, sy);
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
      try { c.focus({ preventScroll: true }); } catch (err2) {}
      var pan = (self.tool === 'pan') || e.button === 1 || e.shiftKey;
      var drawing = !pan && !self.readOnly && self.img && self.tool !== 'pan';
      // vertex-by-vertex tools
      if (drawing && (self.tool === 'polygon' || self.tool === 'polyline')) {
        var tol = 8 / self.scale;
        if (!self.draft) self.draft = { type: self.tool, points: [], cursor: null };
        var d0 = self.draft;
        if (d0.type === 'polygon' && d0.points.length >= MIN_POLY && Math.hypot(ip.x - d0.points[0][0], ip.y - d0.points[0][1]) <= tol) { self.finishDraft(); return; }
        d0.points.push(clampPt([ip.x, ip.y], self.iw, self.ih)); d0.cursor = null;
        if (self.opts.onDraft) self.opts.onDraft(d0);
        self.drag = { kind: 'vertexAdd' };
        self.request(); return;
      }
      var hit = (!self.readOnly) ? self._hit(ip.x, ip.y) : null;
      if (hit && !(e.button === 1) && !(drawing && self.tool !== 'box')) {
        self.selectedId = hit.box.id;
        if (self.opts.onSelect) self.opts.onSelect(hit.box.id);
        var sh = shapeOfItem(hit.box);
        self.drag = { kind: hit.handle ? 'resize' : (hit.vertex !== undefined ? 'vertex' : 'move'), vertex: hit.vertex, id: hit.box.id, start: ip, orig: { x: hit.box.x, y: hit.box.y, w: hit.box.w, h: hit.box.h, points: sh.points.map(function (p) { return p.slice(); }), type: sh.type }, moved: false };
        self.request(); return;
      }
      if (drawing && self.tool === 'box') { self.drag = { kind: 'create', start: ip, box: null }; return; }
      if (drawing && self.tool === 'line') { self.drag = { kind: 'line', start: ip, end: null }; self.draft = { type: 'line', points: [clampPt([ip.x, ip.y], self.iw, self.ih)], cursor: null }; return; }
      if (drawing && self.tool === 'free') { self.drag = { kind: 'free' }; self.draft = { type: 'free', points: [clampPt([ip.x, ip.y], self.iw, self.ih)], cursor: null }; return; }
      if (drawing && self.tool === 'point') { self.drag = { kind: 'point', start: ip }; return; }
      self.drag = { kind: 'pan', sx: sx, sy: sy, tx: self.tx, ty: self.ty, moved: false, ip: ip };
    });
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      var sx = e.clientX - r.left, sy = e.clientY - r.top;
      var ip = self.toImage(sx, sy);
      if (self.draft && (self.draft.type === 'polygon' || self.draft.type === 'polyline') && !self.drag) { self.draft.cursor = [ip.x, ip.y]; self.request(); }
      if (!self.drag) return;
      var d = self.drag;
      if (d.kind === 'pan') {
        if (Math.abs(sx - d.sx) > 2 || Math.abs(sy - d.sy) > 2) d.moved = true;
        self.tx = d.tx + (sx - d.sx); self.ty = d.ty + (sy - d.sy); self.request();
      } else if (d.kind === 'create') {
        d.box = norm(d.start, ip); self.draft = { type: 'rect', points: [[d.start.x, d.start.y], [ip.x, ip.y]] }; self.request();
      } else if (d.kind === 'line') {
        d.end = ip; self.draft.points = [self.draft.points[0], clampPt([ip.x, ip.y], self.iw, self.ih)]; self.request();
      } else if (d.kind === 'free') {
        var last = self.draft.points[self.draft.points.length - 1];
        if (Math.hypot(ip.x - last[0], ip.y - last[1]) * self.scale >= 2) { self.draft.points.push(clampPt([ip.x, ip.y], self.iw, self.ih)); self.request(); }
      } else if (d.kind === 'move' || d.kind === 'resize' || d.kind === 'vertex') {
        var b = self.boxes.filter(function (x) { return x.id === d.id; })[0];
        if (!b) return;
        var dx = ip.x - d.start.x, dy = ip.y - d.start.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) d.moved = true;
        if (d.kind === 'move') {
          var bb = bboxOf(d.orig.points);
          dx = clamp(dx, -bb.x, self.iw - (bb.x + bb.w)); dy = clamp(dy, -bb.y, self.ih - (bb.y + bb.h));
          var np = d.orig.points.map(function (p) { return [p[0] + dx, p[1] + dy]; });
          applyPoints(b, d.orig.type, np);
        } else if (d.kind === 'resize') {
          var x2 = clamp(d.orig.x + d.orig.w + dx, d.orig.x + 4, self.iw), y2 = clamp(d.orig.y + d.orig.h + dy, d.orig.y + 4, self.ih);
          applyPoints(b, 'rect', [[d.orig.x, d.orig.y], [x2, y2]]);
        } else {
          var vp = d.orig.points.map(function (p) { return p.slice(); });
          vp[d.vertex] = clampPt([d.orig.points[d.vertex][0] + dx, d.orig.points[d.vertex][1] + dy], self.iw, self.ih);
          applyPoints(b, d.orig.type, vp);
        }
        self.request();
      }
    });
    function applyPoints(b, type, pts) {
      pts = pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
      var g = geomFromShape({ type: type, points: pts });
      b.x = g.x; b.y = g.y; b.w = g.w; b.h = g.h; b.shape = { type: type, points: pts };
    }
    function finish(e) {
      var d = self.drag; if (!d) return;
      self.drag = null;
      try { c.releasePointerCapture(e.pointerId); } catch (err) {}
      if (d.kind === 'vertexAdd') return;
      if (d.kind === 'create') {
        self.draft = null;
        if (d.box && d.box.w * self.scale >= 4 && d.box.h * self.scale >= 4) self._emitCreate({ type: 'rect', points: [[d.box.x, d.box.y], [d.box.x + d.box.w, d.box.y + d.box.h]] });
        else if (self.opts.onClick) self.opts.onClick(d.start);
        self.request();
      } else if (d.kind === 'line') {
        var lp = self.draft ? self.draft.points : []; self.draft = null;
        if (lp.length === 2 && Math.hypot(lp[1][0] - lp[0][0], lp[1][1] - lp[0][1]) * self.scale >= 4) self._emitCreate({ type: 'line', points: lp });
        self.request();
      } else if (d.kind === 'free') {
        var fp = self.draft ? self.draft.points : []; self.draft = null;
        var simp = simplify(fp, 1.2 / self.scale);
        if (simp.length >= MIN_POLY) self._emitCreate({ type: 'polygon', points: simp });
        self.request();
      } else if (d.kind === 'point') {
        self._emitCreate({ type: 'point', points: [[d.start.x, d.start.y]] });
      } else if (d.kind === 'move' || d.kind === 'resize' || d.kind === 'vertex') {
        var b = self.boxes.filter(function (x) { return x.id === d.id; })[0];
        if (b && d.moved && self.opts.onChange) self.opts.onChange(b.id, { x: b.x, y: b.y, w: b.w, h: b.h, shape: b.shape });
      } else if (d.kind === 'pan' && !d.moved) {
        if (!self.readOnly) { self.selectedId = null; if (self.opts.onSelect) self.opts.onSelect(null); }
        if (self.opts.onClick) self.opts.onClick(d.ip);
        self.request();
      }
    }
    c.addEventListener('pointerup', finish);
    c.addEventListener('pointercancel', finish);
    c.addEventListener('dblclick', function (e) { if (self.draft) { e.preventDefault(); self.finishDraft(); } else self.fit(); });
    c.addEventListener('keydown', function (e) { if (self.handleKey(e)) { e.preventDefault(); e.stopPropagation(); } });
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () { var keep = self.img; self.resize(); if (keep && !self._fitted) { self.fit(); self._fitted = true; } });
      ro.observe(c);
      this._ro = ro;
    } else {
      window.addEventListener('resize', function () { self.resize(); });
    }
  };
  function norm(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  Viewer.prototype.destroy = function () { if (this._ro) { try { this._ro.disconnect(); } catch (e) {} } };

  Viewer.geom = { bboxOf: bboxOf, geomFromShape: geomFromShape, shapeOfItem: shapeOfItem, pointInPolygon: pointInPolygon, distToSegment: distToSegment, distToPath: distToPath, simplify: simplify };
  root.PX_Viewer = Viewer;
})(typeof window !== 'undefined' ? window : globalThis);
