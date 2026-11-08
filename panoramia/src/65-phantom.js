/* PanoramIA — synthetic phantom generator and demonstration dataset.
 * Every demo image is drawn procedurally by this code. No patient data is involved. */
(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var W = 1400, H = 700;

  function gray(v) { v = Math.max(0, Math.min(255, Math.round(v))); return 'rgb(' + v + ',' + v + ',' + v + ')'; }

  // Tooth slot geometry (viewer's left = patient's right)
  function slotU(i) { return -1 + (i + 0.5) * (2 / 16); }
  function upperFdi(i) { return i < 8 ? 18 - i : 21 + (i - 8); }
  function lowerFdi(i) { return i < 8 ? 48 - i : 31 + (i - 8); }
  function toothWidth(fdi) { var p = fdi % 10; return p >= 6 ? 54 : p >= 4 ? 40 : p === 3 ? 36 : 32; }

  function toothGeom(fdi) {
    var upper = fdi < 30;
    var i;
    for (i = 0; i < 16; i++) { if ((upper ? upperFdi(i) : lowerFdi(i)) === fdi) break; }
    if (i === 16) return null;
    var u = slotU(i);
    var x = 700 + 470 * u;
    var w = toothWidth(fdi);
    if (upper) {
      var yc = 300 - 45 * u * u; // crown-root junction
      return { fdi: fdi, upper: true, x: x, w: w, crown: { y0: yc - 5, y1: yc + 50 }, root: { y0: yc - 75, y1: yc - 5 }, apexY: yc - 75, rect: { x: x - w / 2, y: yc - 80, w: w, h: 135 } };
    }
    var yl = 440 - 45 * u * u;
    return { fdi: fdi, upper: false, x: x, w: w, crown: { y0: yl - 50, y1: yl + 5 }, root: { y0: yl + 5, y1: yl + 75 }, apexY: yl + 75, rect: { x: x - w / 2, y: yl - 55, w: w, h: 135 } };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawTooth(ctx, g, opts) {
    opts = opts || {};
    var x = g.x, w = g.w;
    ctx.save();
    if (opts.rotate) { ctx.translate(x, (g.crown.y0 + g.root.y1) / 2); ctx.rotate(opts.rotate); ctx.translate(-x, -(g.crown.y0 + g.root.y1) / 2); }
    if (opts.shiftY) ctx.translate(0, opts.shiftY);
    // root(s)
    ctx.fillStyle = gray(175);
    var multi = (g.fdi % 10) >= 6;
    if (multi) {
      roundRect(ctx, x - w / 2 + 3, Math.min(g.root.y0, g.root.y1), w * 0.42, Math.abs(g.root.y1 - g.root.y0), 8); ctx.fill();
      roundRect(ctx, x + w / 2 - 3 - w * 0.42, Math.min(g.root.y0, g.root.y1), w * 0.42, Math.abs(g.root.y1 - g.root.y0), 8); ctx.fill();
    } else {
      roundRect(ctx, x - w * 0.3, Math.min(g.root.y0, g.root.y1), w * 0.6, Math.abs(g.root.y1 - g.root.y0), 9); ctx.fill();
    }
    // pulp canal(s)
    ctx.strokeStyle = gray(120); ctx.lineWidth = 3;
    ctx.beginPath();
    if (multi) { ctx.moveTo(x - w * 0.27, g.root.y0); ctx.lineTo(x - w * 0.27, g.root.y1); ctx.moveTo(x + w * 0.27, g.root.y0); ctx.lineTo(x + w * 0.27, g.root.y1); }
    else { ctx.moveTo(x, g.root.y0); ctx.lineTo(x, g.root.y1); }
    ctx.stroke();
    // crown
    ctx.fillStyle = gray(opts.crownGray || 225);
    roundRect(ctx, x - w / 2, Math.min(g.crown.y0, g.crown.y1), w, Math.abs(g.crown.y1 - g.crown.y0), 10); ctx.fill();
    // enamel cap highlight
    ctx.fillStyle = gray(240);
    var capY = g.upper ? g.crown.y1 - 14 : g.crown.y0;
    roundRect(ctx, x - w / 2 + 2, capY, w - 4, 14, 6); ctx.fill();
    ctx.restore();
  }

  /** Draw a synthetic panoramic phantom. Returns {canvas, features:[{code, fdi, box}]} */
  function makePhantom(seed, opts) {
    opts = opts || {};
    var rnd = mulberry32(seed * 7919 + 13);
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var features = [];

    // background and soft tissue
    ctx.fillStyle = gray(18); ctx.fillRect(0, 0, W, H);
    var grd = ctx.createRadialGradient(700, 380, 80, 700, 380, 760);
    grd.addColorStop(0, gray(70)); grd.addColorStop(1, gray(18));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // rami and condyles
    ctx.strokeStyle = gray(118); ctx.lineWidth = 64; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(175, 190); ctx.lineTo(205, 430); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1225, 190); ctx.lineTo(1195, 430); ctx.stroke();
    ctx.fillStyle = gray(150);
    ctx.beginPath(); ctx.ellipse(170, 165, 26, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1230, 165, 26, 20, 0, 0, Math.PI * 2); ctx.fill();
    // coronoid-ish
    ctx.fillStyle = gray(110);
    ctx.beginPath(); ctx.moveTo(230, 200); ctx.lineTo(280, 160); ctx.lineTo(300, 240); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1170, 200); ctx.lineTo(1120, 160); ctx.lineTo(1100, 240); ctx.closePath(); ctx.fill();

    // mandible body
    ctx.strokeStyle = gray(125); ctx.lineWidth = 120; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(205, 420); ctx.quadraticCurveTo(700, 660, 1195, 420); ctx.stroke();
    // inferior cortex
    ctx.strokeStyle = gray(205); ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(200, 470); ctx.quadraticCurveTo(700, 715, 1200, 470); ctx.stroke();
    // maxilla band
    ctx.strokeStyle = gray(112); ctx.lineWidth = 70;
    ctx.beginPath(); ctx.moveTo(260, 240); ctx.quadraticCurveTo(700, 330, 1140, 240); ctx.stroke();
    // maxillary sinuses
    [430, 970].forEach(function (sx) {
      ctx.fillStyle = gray(62);
      ctx.beginPath(); ctx.ellipse(sx, 185, 95, 62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = gray(190); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, 185, 95, 62, 0, 0, Math.PI * 2); ctx.stroke();
    });
    // nasal cavity and septum
    ctx.fillStyle = gray(55);
    ctx.beginPath(); ctx.ellipse(700, 150, 110, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = gray(170); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(700, 95); ctx.lineTo(700, 215); ctx.stroke();
    // hard palate
    ctx.strokeStyle = gray(185); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(300, 225); ctx.quadraticCurveTo(700, 255, 1100, 225); ctx.stroke();
    // mandibular canals and mental foramina
    ctx.strokeStyle = gray(68); ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(200, 400); ctx.quadraticCurveTo(320, 545, 470, 548); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1200, 400); ctx.quadraticCurveTo(1080, 545, 930, 548); ctx.stroke();
    ctx.strokeStyle = gray(150); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(200, 393); ctx.quadraticCurveTo(320, 538, 470, 541); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, 407); ctx.quadraticCurveTo(320, 552, 470, 555); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1200, 393); ctx.quadraticCurveTo(1080, 538, 930, 541); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1200, 407); ctx.quadraticCurveTo(1080, 552, 930, 555); ctx.stroke();
    ctx.fillStyle = gray(55);
    ctx.beginPath(); ctx.ellipse(470, 548, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(930, 548, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    // hyoid hint
    ctx.strokeStyle = gray(140); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(520, 650); ctx.quadraticCurveTo(700, 690, 880, 650); ctx.stroke();

    // teeth
    var plan = opts.plan || {};
    var missing = plan.missing || [];
    var impacted = plan.impacted || [];
    var i, g;
    for (i = 0; i < 16; i++) {
      var fu = upperFdi(i), fl = lowerFdi(i);
      [fu, fl].forEach(function (f) {
        if (missing.indexOf(f) !== -1) return;
        g = toothGeom(f);
        if (impacted.indexOf(f) !== -1) {
          var dir = (f === 48 || f === 18) ? 1 : -1; // tilt toward the second molar
          drawTooth(ctx, g, { rotate: dir * (f < 30 ? -0.6 : 0.7), shiftY: f < 30 ? -30 : 38, crownGray: 215 });
        } else {
          drawTooth(ctx, g, {});
        }
      });
    }

    // ---- features ----
    var feats = plan.features || [];
    feats.forEach(function (ft) {
      var gg = ft.fdi ? toothGeom(ft.fdi) : null;
      var box;
      if (ft.code === 'DEN-PAR' && gg) {
        var ay = gg.apexY + (gg.upper ? -6 : 6);
        var r = 13 + rnd() * 6;
        ctx.fillStyle = gray(42); ctx.beginPath(); ctx.ellipse(gg.x, ay, r + 2, r, 0, 0, Math.PI * 2); ctx.fill();
        box = { x: gg.x - r - 8, y: ay - r - 8, w: 2 * r + 16, h: 2 * r + 16 };
      } else if (ft.code === 'DEN-RST' && gg) {
        ctx.fillStyle = gray(255);
        var cw = gg.w * 0.55, ch = 16;
        var cy = gg.upper ? gg.crown.y1 - 30 : gg.crown.y0 + 12;
        roundRect(ctx, gg.x - cw / 2, cy, cw, ch, 3); ctx.fill();
        box = { x: gg.x - cw / 2 - 6, y: cy - 6, w: cw + 12, h: ch + 12 };
      } else if (ft.code === 'DEN-RCT' && gg) {
        ctx.strokeStyle = gray(255); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(gg.x, gg.root.y0); ctx.lineTo(gg.x, gg.root.y1 - (gg.upper ? -4 : 4)); ctx.stroke();
        box = { x: gg.x - 14, y: Math.min(gg.root.y0, gg.root.y1) - 6, w: 28, h: Math.abs(gg.root.y1 - gg.root.y0) + 12 };
      } else if (ft.code === 'DEN-IMP' && gg) {
        box = { x: gg.rect.x - 30, y: gg.rect.y + (gg.upper ? -40 : 10), w: gg.rect.w + 60, h: gg.rect.h + 30 };
      } else if (ft.code === 'JAW-PERI' && gg) {
        var px = gg.x + (gg.fdi === 48 ? -10 : 10), py = gg.upper ? gg.crown.y1 - 40 : gg.crown.y0 + 40;
        ctx.fillStyle = gray(48); ctx.beginPath(); ctx.ellipse(px, py, 46, 38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = gray(200); ctx.lineWidth = 2; ctx.stroke();
        // redraw the impacted crown over the lucency so it looks pericoronal
        drawTooth(ctx, gg, { rotate: (gg.fdi === 48 ? 0.7 : -0.7), shiftY: 38, crownGray: 215 });
        box = { x: px - 56, y: py - 48, w: 112, h: 96 };
      } else if (ft.code === 'DEN-MIS' && gg) {
        box = { x: gg.rect.x - 6, y: gg.rect.y, w: gg.rect.w + 12, h: gg.rect.h };
      } else if (ft.code === 'JAW-UNI') {
        var ux = ft.side === 'right' ? 400 : 1000, uy = 590;
        ctx.fillStyle = gray(45); ctx.beginPath(); ctx.ellipse(ux, uy, 48, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = gray(215); ctx.lineWidth = 3; ctx.stroke();
        box = { x: ux - 58, y: uy - 44, w: 116, h: 88 };
      } else if (ft.code === 'INC-CAC') {
        var cx = ft.side === 'right' ? 150 : 1250, cyy = 615;
        ctx.fillStyle = gray(235);
        for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * 18, cyy + (rnd() - 0.5) * 30, 2.5 + rnd() * 2, 4 + rnd() * 3, 0, 0, Math.PI * 2); ctx.fill(); }
        box = { x: cx - 26, y: cyy - 34, w: 52, h: 68 };
      } else if (ft.code === 'INC-ESP') {
        var ex = ft.side === 'right' ? 235 : 1165;
        ctx.strokeStyle = gray(225); ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ex, 300); ctx.lineTo(ex + (ft.side === 'right' ? 70 : -70), 500); ctx.stroke();
        box = { x: Math.min(ex, ex + (ft.side === 'right' ? 70 : -70)) - 16, y: 288, w: 102, h: 226 };
      } else if (ft.code === 'INC-SIN') {
        var sx = ft.side === 'right' ? 430 : 970;
        ctx.fillStyle = gray(120); ctx.beginPath(); ctx.ellipse(sx, 215, 86, 30, 0, 0, Math.PI); ctx.fill();
        box = { x: sx - 98, y: 190, w: 196, h: 60 };
      } else if (ft.code === 'INC-MCI') {
        ctx.fillStyle = gray(125);
        for (var m = 0; m < 14; m++) { var mx = 560 + m * 20, my = 668 + Math.sin(m) * 3; ctx.beginPath(); ctx.ellipse(mx, my, 6, 4, 0, 0, Math.PI); ctx.fill(); }
        box = { x: 545, y: 655, w: 300, h: 26 };
      } else if (ft.code === 'QA-POS') {
        box = { x: 560, y: 360, w: 280, h: 120 };
      }
      if (box) features.push({ code: ft.code, fdi: ft.fdi || null, box: box, confidence: ft.confidence || 'certain' });
    });

    // film noise
    var img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var nz = (rnd() - 0.5) * 22;
      var v = d[p] + nz; v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[p] = v; d[p + 1] = v; d[p + 2] = v;
    }
    ctx.putImageData(img, 0, 0);

    // stamp: unmistakably synthetic
    ctx.fillStyle = gray(200); ctx.font = '600 20px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('FANTOMA SINTÉTICO · NO ES UN PACIENTE  /  SYNTHETIC PHANTOM · NOT A PATIENT', 24, H - 22);

    if (opts.crop) {
      var cg = toothGeom(opts.crop.fdi);
      var cx0 = Math.max(0, Math.round(cg.x - 230)), cy0 = Math.max(0, Math.round((cg.upper ? cg.apexY - 60 : cg.crown.y0 - 60)));
      var cw2 = 460, ch2 = 300;
      var c2 = document.createElement('canvas'); c2.width = cw2; c2.height = ch2;
      var ctx2 = c2.getContext('2d');
      ctx2.drawImage(canvas, cx0, cy0, cw2, ch2, 0, 0, cw2, ch2);
      ctx2.fillStyle = gray(200); ctx2.font = '600 13px system-ui, sans-serif';
      ctx2.fillText('FANTOMA SINTÉTICO / SYNTHETIC PHANTOM', 10, ch2 - 10);
      features = features.map(function (f) { return { code: f.code, fdi: f.fdi, confidence: f.confidence, box: { x: f.box.x - cx0, y: f.box.y - cy0, w: f.box.w, h: f.box.h } }; })
        .filter(function (f) { return f.box.x >= 0 && f.box.y >= 0 && f.box.x + f.box.w <= cw2 && f.box.y + f.box.h <= ch2; });
      return { canvas: c2, features: features };
    }
    return { canvas: canvas, features: features };
  }

  /** The demonstration dataset: eight synthetic cases with readers and adjudication. */
  var DEMO_PLAN = [
    { seed: 1, modality: 'PAN', site: 'Clínica universitaria A', province: 'Distrito Nacional', device: 'Fantoma sintético v1', year: 2025, ageBand: '18-29', sex: 'F', quality: 'diagnostic',
      plan: { features: [{ code: 'DEN-PAR', fdi: 36 }, { code: 'DEN-RST', fdi: 16 }, { code: 'DEN-RST', fdi: 26 }] },
      readers: { R1: 'all', R2: 'dropLast', ADJ: 'all' } },
    { seed: 2, modality: 'PAN', site: 'Clínica universitaria B', province: 'Santiago', device: 'Fantoma sintético v1', year: 2025, ageBand: '30-44', sex: 'M', quality: 'diagnostic',
      plan: { impacted: [48], features: [{ code: 'DEN-IMP', fdi: 48 }, { code: 'JAW-PERI', fdi: 48 }, { code: 'INC-CAC', side: 'right' }] },
      readers: { R1: 'all', R2: 'all', ADJ: 'all' }, checklist: { fdi: 48, imageQuality: 'diagnostic', ianRelation: 'superimposed', roodSigns: ['darkening'], winter: 'mesioangular', pellDepth: 'B', pellRamus: 'II', roots: [], bone: 'normal', pathology: 'pericoronal', clinical: ['age25plus'] } },
    { seed: 3, modality: 'PAN', site: 'Hospital docente C', province: 'San Pedro de Macorís', device: 'Fantoma sintético v1', year: 2024, ageBand: '45-59', sex: 'F', quality: 'diagnostic',
      plan: { missing: [46], features: [{ code: 'JAW-UNI', side: 'right' }, { code: 'DEN-MIS', fdi: 46 }] },
      readers: { R1: 'all', R2: 'all', ADJ: 'all' } },
    { seed: 4, modality: 'PAN', site: 'Clínica universitaria D', province: 'La Vega', device: 'Fantoma sintético v1', year: 2025, ageBand: '12-17', sex: 'M', quality: 'diagnostic',
      plan: { impacted: [38, 48], features: [{ code: 'DEN-IMP', fdi: 38 }, { code: 'DEN-IMP', fdi: 48 }, { code: 'INC-ESP', side: 'left' }] },
      readers: { R1: 'all', R2: 'dropLast', ADJ: 'all' }, checklist: { fdi: 38, imageQuality: 'diagnostic', ianRelation: 'contact', roodSigns: [], winter: 'mesioangular', pellDepth: 'B', pellRamus: 'I', roots: ['incomplete'], bone: 'normal', pathology: 'none', clinical: [] } },
    { seed: 5, modality: 'PAN', site: 'Clínica universitaria A', province: 'Distrito Nacional', device: 'Fantoma sintético v1', year: 2024, ageBand: '60-74', sex: 'F', quality: 'limited',
      plan: { missing: [18, 28, 38, 48, 17], features: [{ code: 'DEN-RCT', fdi: 21 }, { code: 'DEN-PAR', fdi: 21 }, { code: 'INC-MCI' }] },
      readers: { R1: 'all', R2: 'dropLast' } },
    { seed: 6, modality: 'PAN', site: 'Centro de imagen E', province: 'Puerto Plata', device: 'Fantoma sintético v1', year: 2026, ageBand: '18-29', sex: 'M', quality: 'limited',
      plan: { features: [{ code: 'DEN-RST', fdi: 36 }, { code: 'QA-POS' }] },
      readers: { R1: 'all' } },
    { seed: 7, modality: 'PAN', site: 'Clínica universitaria B', province: 'Santiago', device: 'Fantoma sintético v1', year: 2026, ageBand: '30-44', sex: 'F', quality: 'diagnostic',
      plan: { features: [{ code: 'DEN-PAR', fdi: 46 }, { code: 'INC-SIN', side: 'left' }] },
      readers: {} },
    { seed: 8, modality: 'PA', site: 'Hospital docente C', province: 'San Pedro de Macorís', device: 'Fantoma sintético v1', year: 2025, ageBand: '45-59', sex: 'M', quality: 'diagnostic',
      plan: { features: [{ code: 'DEN-PAR', fdi: 36 }, { code: 'DEN-RST', fdi: 37 }] }, crop: { fdi: 36 },
      readers: { R1: 'all', R2: 'all', ADJ: 'all' } }
  ];

  function uid(prefix) {
    var s = prefix + '_';
    try {
      var a = new Uint32Array(3); crypto.getRandomValues(a);
      s += Array.prototype.map.call(a, function (x) { return x.toString(36); }).join('');
    } catch (e) { s += Math.random().toString(36).slice(2) + Date.now().toString(36); }
    return s;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(function (b) { resolve(b); }, 'image/png'); });
  }
  function thumbnail(canvas, maxW) {
    var scale = Math.min(1, maxW / canvas.width);
    var c = document.createElement('canvas'); c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  }

  /** Builds the demo records. Returns a Promise of {cases, images, annotations, checklists}. */
  function buildDemo(pseudonymFn, evaluateFn) {
    var cases = [], images = [], annotations = [], checklists = [];
    var now = Date.now();
    var work = DEMO_PLAN.map(function (dp, idx) {
      var ph = makePhantom(dp.seed, { plan: dp.plan, crop: dp.crop });
      var caseId = 'demo_' + dp.seed;
      var createdAt = now - (DEMO_PLAN.length - idx) * 86400000;
      var hasADJ = !!(dp.readers && dp.readers.ADJ);
      var c = {
        id: caseId, pseudonym: pseudonymFn(), subjectId: '', modality: dp.modality, siteName: dp.site, province: dp.province,
        deviceMake: dp.device, deviceModel: '', year: dp.year, ageBand: dp.ageBand, sex: dp.sex, consent: 'synthetic', quality: dp.quality,
        status: 'ready', isDemo: true, width: ph.canvas.width, height: ph.canvas.height, frames: 1,
        deid: { source: 'synthetic', receipt: [], burnedInDeclared: false, burnedInChecked: true, redactions: 0, counts: { kept: 0, derived: 0, removed: 0, privateRemoved: 0 } },
        adjudicationComplete: hasADJ, notes: 'Fantoma sintético de demostración.', createdAt: createdAt, updatedAt: createdAt
      };
      cases.push(c);
      var readerNames = { R1: 'EST-01', R2: 'EST-02', ADJ: 'DOC-01' };
      Object.keys(dp.readers || {}).forEach(function (r) {
        var mode = dp.readers[r];
        var feats = ph.features.slice();
        if (mode === 'dropLast') feats = feats.slice(0, Math.max(0, feats.length - 1));
        feats.forEach(function (f, k) {
          var b = f.box;
          if (r === 'R2') b = { x: b.x + 6, y: b.y - 4, w: b.w, h: b.h }; // slightly different drawing
          annotations.push({ id: caseId + '_' + r + '_' + k, caseId: caseId, reader: r, readerName: readerNames[r], fdi: f.fdi, code: f.code, confidence: r === 'R2' && k === 0 ? 'probable' : 'certain', box: b, note: '', createdAt: createdAt + 3600000 * (r === 'R1' ? 1 : r === 'R2' ? 2 : 3) });
        });
      });
      if (dp.checklist && evaluateFn) {
        var res = evaluateFn(dp.checklist);
        checklists.push({ id: caseId + '_chk', caseId: caseId, fdi: dp.checklist.fdi, inputs: dp.checklist, result: { level: res.level, fired: res.fired.map(function (f) { return f.id; }), pederson: res.pederson, version: res.version }, createdAt: createdAt + 7200000, by: 'DOC-01' });
      }
      return canvasToBlob(ph.canvas).then(function (blob) {
        images.push({ caseId: caseId, blob: blob, thumb: thumbnail(ph.canvas, 320) });
      });
    });
    return Promise.all(work).then(function () { return { cases: cases, images: images, annotations: annotations, checklists: checklists }; });
  }

  root.PX_DEMO = { makePhantom: makePhantom, buildDemo: buildDemo, uid: uid, canvasToBlob: canvasToBlob, thumbnail: thumbnail, toothGeom: toothGeom, DEMO_PLAN: DEMO_PLAN };
})(typeof window !== 'undefined' ? window : globalThis);
