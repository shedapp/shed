/* PanoramIA — open dataset loader (AKUDENTAL and DentalOPG-1550).
   Pure mapping functions (testable in Node) plus browser-side builders.
   The embedded subset lives in 66-opendata-data.js (generated). The complete set can be loaded
   from data/akudental/full_manifest.json when the app is served over http(s). */
(function (root) {
  'use strict';

  var STRUCT_CODE = { implant: 'DEN-IMPL', bridge: 'DEN-RST', filling_crown: 'DEN-RST' };
  // Same colours as the taxonomy (ANA-TTH, DEN-IMPL, DEN-BRG, DEN-RST) so reference overlays and findings read alike.
  var STRUCT_COLOR = { tooth: '#FFEE58', implant: '#B39DDB', bridge: '#F06292', filling_crown: '#80CBC4' };
  var MIN_OVERLAP = 0.5; // a structure is assigned to a tooth only if at least half of its box lies inside that tooth's box

  function intersect(a, b) {
    var x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]);
    var x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
    return Math.max(0, x2 - x) * Math.max(0, y2 - y);
  }
  /** FDI number of the tooth whose box contains most of the structure box, or null (documented derivation). */
  function assignFdi(box, teeth) {
    var area = box[2] * box[3]; if (!area) return null;
    var best = null, bestFrac = 0;
    (teeth || []).forEach(function (tt) {
      var frac = intersect(box, tt.box) / area;
      if (frac > bestFrac) { bestFrac = frac; best = tt.fdi; }
    });
    return bestFrac >= MIN_OVERLAP ? best : null;
  }
  function pad(n) { return (n < 10 ? '000' : n < 100 ? '00' : n < 1000 ? '0' : '') + n; }

  var TX = root.PX_TAXONOMY;
  function colorForKind(kind, code) { if (code && TX && TX.colorOf) return TX.colorOf(code); return STRUCT_COLOR[kind] || '#FFFFFF'; }

  /** DentalOPG-1550 entry → PanoramIA records (boxes for 14 classes; teeth with estimated FDI). Pure. */
  function mapEntryOpg(entry, meta, now) {
    var id = entry.id, num = parseInt(entry.id.replace(/\D/g, ''), 10) || 0;
    var teeth = (entry.teeth || []).map(function (t) { return { fdi: t.fdi, box: t.box, poly: t.poly || null, estimated: true }; });
    var structures = (entry.structures || []).map(function (s) { return { kind: s.kind, code: s.code, box: s.box, poly: s.poly || null, fdi: s.fdi || null }; });
    var absent = structures.filter(function (s) { return s.code === 'DEN-MIS' && s.fdi; }).map(function (s) { return s.fdi; });
    var age = entry.age, band = age == null ? '' : age < 18 ? '0-17' : age < 30 ? '18-29' : age < 45 ? '30-44' : age < 60 ? '45-59' : '60+';
    var c = {
      id: id, pseudonym: 'OPG-' + pad(num), subjectId: '', modality: 'PAN',
      siteName: 'DentalOPG-1550 (Daffodil International University, Dhaka)', province: '', country: 'BD',
      deviceMake: '', deviceModel: '', year: null, ageBand: band, sex: 'U', consent: 'open', quality: '',
      status: 'ready', isDemo: false, isOpenData: true, dataset: meta.dataset, datasetKey: 'opg', datasetRef: entry.id + ' (' + (entry.split || '') + ')', licence: 'CC BY 4.0',
      width: entry.width, height: entry.height, frames: 1,
      deid: { source: 'open-dataset', receipt: [{ tag: '—', name: 'Original file names carried patient names and ages: renamed by PanoramIA, only the age kept', action: 'remove', isPrivate: true }], burnedInDeclared: false, burnedInChecked: true, redactions: 1, counts: { kept: 0, derived: 1, removed: 1, privateRemoved: 1 } },
      adjudicationComplete: true, externalReference: true,
      ref: { source: 'DentalOPG-1550', teeth: teeth, structures: structures, absent: absent, labelled: teeth.length, fdiSource: 'estimated-order', mixedDentition: !!entry.mixedDentition },
      notes: entry.mixedDentition ? 'Mixed dentition (source label).' : '', createdAt: now, updatedAt: now
    };
    var anns = structures.filter(function (s) { return s.code; }).map(function (s, k) {
      var fdi = s.fdi || (s.code === 'DEN-MIS' ? null : assignFdi(s.box, teeth));
      return {
        id: id + '_s' + k, caseId: id, reader: 'ADJ', readerName: 'DentalOPG-1550', external: true,
        fdi: fdi, code: s.code, refKind: s.kind, confidence: 'certain',
        box: { x: s.box[0], y: s.box[1], w: s.box[2], h: s.box[3] }, shape: s.poly && s.poly.length >= 3 ? { type: 'polygon', points: s.poly } : null,
        note: s.kind !== s.code ? 'Source label: ' + s.kind : '', createdAt: now
      };
    });
    return { c: c, anns: anns };
  }

  /** Maps one manifest entry to PanoramIA records. Pure. Dispatches on the dataset key. */
  function mapEntry(entry, meta, now) {
    now = now || Date.now();
    if (meta && meta.key === 'opg') return mapEntryOpg(entry, meta, now);
    var id = 'aku_' + entry.srcId;
    var teeth = entry.teeth || [], structures = entry.structures || [];
    var c = {
      id: id, pseudonym: 'AKU-' + pad(entry.srcId), subjectId: '', modality: 'PAN',
      siteName: 'Akdeniz University Dental Hospital (AKUDENTAL)', province: '', country: 'TR',
      deviceMake: '', deviceModel: '', year: null, ageBand: '', sex: 'U', consent: 'open', quality: '',
      status: 'ready', isDemo: false, isOpenData: true, dataset: meta.dataset, datasetKey: 'aku', datasetRef: entry.srcFile, licence: 'CC BY-NC-SA 4.0',
      width: entry.width, height: entry.height, frames: 1,
      deid: { source: 'open-dataset', receipt: [{ tag: '—', name: 'JPEG without embedded metadata (published dataset)', action: 'keep', isPrivate: false }], burnedInDeclared: false, burnedInChecked: true, redactions: 0, counts: { kept: 0, derived: 0, removed: 0, privateRemoved: 0 } },
      adjudicationComplete: true, externalReference: true,
      ref: { source: 'AKUDENTAL', teeth: teeth, structures: structures, absent: entry.absent || [], labelled: teeth.length },
      notes: '', createdAt: now, updatedAt: now
    };
    var anns = structures.map(function (s, k) {
      return {
        id: id + '_s' + k, caseId: id, reader: 'ADJ', readerName: 'AKUDENTAL', external: true,
        fdi: assignFdi(s.box, teeth), code: STRUCT_CODE[s.kind], refKind: s.kind, confidence: 'certain',
        box: { x: s.box[0], y: s.box[1], w: s.box[2], h: s.box[3] }, shape: s.poly && s.poly.length >= 3 ? { type: 'polygon', points: s.poly } : null, note: '', createdAt: now
      };
    });
    return { c: c, anns: anns };
  }

  /** Overlay shapes for the viewer. */
  function overlayShapes(ref, labels) {
    if (!ref) return [];
    var out = [];
    (ref.teeth || []).forEach(function (tt) { out.push({ poly: tt.poly, box: tt.box, color: STRUCT_COLOR.tooth, dashed: !!tt.estimated, label: labels === false ? '' : String(tt.fdi || '') }); });
    (ref.structures || []).forEach(function (s) { if (s.code === 'DEN-MIS' && !s.poly) { out.push({ box: s.box, color: colorForKind(s.kind, s.code), dashed: true, fillAlpha: 0 }); return; } out.push({ poly: s.poly, box: s.box, color: colorForKind(s.kind, s.code), fillAlpha: 0.22 }); });
    return out;
  }

  // ---------- browser side ----------
  function b64ToBlob(b64, type) {
    var bin = atob(b64), len = bin.length, arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'image/jpeg' });
  }
  function thumbFromBlob(blob, maxW) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(blob); var img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(1, maxW / img.naturalWidth);
          var cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', 0.7));
        } catch (e) { resolve(''); }
        URL.revokeObjectURL(url);
      };
      img.onerror = function () { resolve(''); URL.revokeObjectURL(url); };
      img.src = url;
    });
  }
  /** Builds records for a manifest whose images carry base64 `data` or a `url` relative to baseUrl. */
  function build(manifest, opts) {
    opts = opts || {};
    var now = Date.now(), skip = opts.skipIds || {};
    var idOf = function (e) { return manifest.key === 'opg' ? e.id : 'aku_' + e.srcId; };
    var entries = manifest.images.filter(function (e) { return !skip[idOf(e)]; });
    var cases = [], images = [], annotations = [], done = 0;
    var queue = entries.slice();
    // complete sets served over http(s) come as a few pack files; each image is a byte range of one pack
    var packCache = {}, packBase = opts.baseUrl ? opts.baseUrl.replace(/full\/$/, '') : '';
    function packBlob(i) {
      if (!packCache[i]) packCache[i] = fetch(packBase + manifest.packs[i].file, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); });
      return packCache[i];
    }
    function next() {
      var e = queue.shift(); if (!e) return Promise.resolve();
      var blobP = e.data ? Promise.resolve(b64ToBlob(e.data))
        : (manifest.packs && e.pack && !opts.noPacks) ? packBlob(e.pack.i).then(function (b) { return b.slice(e.pack.offset, e.pack.offset + e.pack.len, 'image/jpeg'); })
        : fetch(opts.baseUrl + e.file).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); });
      return blobP.then(function (blob) {
        return thumbFromBlob(blob, 320).then(function (thumb) {
          var m = mapEntry(e, manifest, now - (entries.length - done) * 1000);
          cases.push(m.c); annotations = annotations.concat(m.anns);
          images.push({ caseId: m.c.id, blob: blob, thumb: thumb });
          done++; if (opts.onProgress) opts.onProgress(done, entries.length);
        });
      }).then(next);
    }
    var workers = []; for (var w = 0; w < (opts.concurrency || 4); w++) workers.push(next());
    return Promise.all(workers).then(function () { return { cases: cases, images: images, annotations: annotations, checklists: [] }; });
  }

  root.PX_OPENDATA = { mapEntryOpg: mapEntryOpg, colorForKind: colorForKind, STRUCT_CODE: STRUCT_CODE, STRUCT_COLOR: STRUCT_COLOR, MIN_OVERLAP: MIN_OVERLAP, assignFdi: assignFdi, mapEntry: mapEntry, overlayShapes: overlayShapes, build: build, b64ToBlob: b64ToBlob };
})(typeof window !== 'undefined' ? window : globalThis);
