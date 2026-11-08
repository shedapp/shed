'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

require('../src/30-dicom.js');
require('../src/40-rubric.js');
require('../src/50-metrics.js');
const DICOM = globalThis.PX_DICOM, RUBRIC = globalThis.PX_RUBRIC, METRICS = globalThis.PX_METRICS;

const TD = path.join(__dirname, '..', 'testdata');
function load(name) {
  const b = fs.readFileSync(path.join(TD, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n     ') : e)); }
}
function receiptHas(deid, name, action) {
  return deid.receipt.some(r => r.name === name && (!action || r.action === action));
}

// ---------------- DICOM ----------------
test('explicit 8-bit: parse, whitelist de-id, decode', () => {
  const buf = load('explicit_mono2_8bit.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true, p.error);
  assert.strictEqual(p.hasPreamble, true);
  assert.strictEqual(p.transferSyntax, '1.2.840.10008.1.2.1');
  assert.strictEqual(p.explicit, true);
  assert.strictEqual(p.dataset['00080060'], 'PX');
  assert.strictEqual(p.dataset['00280010'], 32);
  assert.strictEqual(p.dataset['00280011'], 48);
  const d = DICOM.deidentify(p);
  assert.strictEqual(d.derived.sex, 'F');
  assert.strictEqual(d.derived.year, 2024);
  assert.strictEqual(d.derived.ageBand, '30-44'); // born 1980-01-15, study 2024-03-10 -> 44
  assert.strictEqual(d.derived.burnedInDeclared, true);
  assert.strictEqual(d.derived.manufacturer, 'TestCo');
  assert.strictEqual(d.derived.model, 'Phantom 1');
  assert.ok(receiptHas(d, 'PatientName', 'remove'));
  assert.ok(receiptHas(d, 'PatientID', 'remove'));
  assert.ok(receiptHas(d, 'InstitutionName', 'remove'));
  assert.ok(receiptHas(d, 'PatientName (in sequence)', 'remove'), 'name inside defined-length sequence listed');
  assert.ok(receiptHas(d, 'PatientID (in sequence)', 'remove'), 'id inside undefined-length sequence listed');
  assert.ok(receiptHas(d, 'PrivateTag', 'remove'));
  assert.ok(receiptHas(d, 'Modality', 'keep'));
  assert.ok(receiptHas(d, 'PatientBirthDate', 'derive'));
  assert.ok(!('00100010' in d.kept), 'name never kept');
  assert.ok(!('00100030' in d.kept), 'birth date never kept');
  assert.ok(!('00080020' in d.kept), 'study date never kept');
  // sequence content must not leak into the top-level dataset
  assert.strictEqual(p.dataset['00100010'], 'DOE^JANE');
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, true, f.reason);
  assert.strictEqual(f.width, 48); assert.strictEqual(f.height, 32);
  assert.strictEqual(f.rgba[0], 0);
  assert.strictEqual(f.rgba[47 * 4], 255); // max value maps to 255
  assert.strictEqual(f.rgba[3], 255);
  assert.strictEqual(f.stats.min, 0); assert.strictEqual(f.stats.max, 235);
});

test('implicit 16-bit signed: window from tags, sequence inside implicit', () => {
  const buf = load('implicit_mono2_16bit_signed.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true, p.error);
  assert.strictEqual(p.explicit, false);
  assert.strictEqual(p.dataset['00280100'], 16);
  assert.strictEqual(p.dataset['00280103'], 1);
  const d = DICOM.deidentify(p);
  assert.strictEqual(d.derived.ageBand, '30-44'); // 034Y
  assert.strictEqual(d.derived.sex, 'M');
  assert.strictEqual(d.derived.year, 2023);
  assert.ok(receiptHas(d, 'PatientName (in sequence)', 'remove'));
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, true, f.reason);
  assert.strictEqual(f.window.center, 0); assert.strictEqual(f.window.width, 1000);
  assert.strictEqual(f.stats.min, -500); assert.strictEqual(f.stats.max, 500);
  assert.strictEqual(f.rgba[0], 0);          // -500 -> black
  assert.strictEqual(f.rgba[63 * 4], 255);   // +500 -> white
  // middle value ~0 -> about 128
  const mid = f.rgba[Math.floor(63 / 2) * 4];
  assert.ok(mid >= 120 && mid <= 136, 'mid grey ' + mid);
  // override window
  const g = DICOM.decodeFrame(p, buf, { windowCenter: 400, windowWidth: 100 });
  assert.strictEqual(g.rgba[0], 0);
  assert.strictEqual(g.rgba[63 * 4], 255);
});

test('MONOCHROME1 inverts', () => {
  const buf = load('mono1_8bit.dcm');
  const p = DICOM.parse(buf);
  const f = DICOM.decodeFrame(p, buf, { windowCenter: 128, windowWidth: 256 });
  assert.strictEqual(f.ok, true, f.reason);
  assert.strictEqual(f.rgba[0], 255);
});

test('RGB interleaved', () => {
  const buf = load('rgb_8bit.dcm');
  const p = DICOM.parse(buf);
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, true, f.reason);
  assert.deepStrictEqual([f.rgba[0], f.rgba[1], f.rgba[2], f.rgba[3]], [255, 0, 0, 255]);
  assert.deepStrictEqual([f.rgba[4], f.rgba[5], f.rgba[6]], [0, 255, 0]);
});

test('encapsulated: metadata parsed, pixel data skipped, decode refused', () => {
  const buf = load('encapsulated_jpeg.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true, p.error);
  assert.strictEqual(p.encapsulated, true);
  assert.strictEqual(p.dataset['00080060'], 'PX');
  assert.strictEqual(p.dataset['00282110'], '01', 'element after encapsulated pixel data still parsed');
  const d = DICOM.deidentify(p);
  assert.ok(receiptHas(d, 'PatientName', 'remove'));
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, false); assert.strictEqual(f.reason, 'compressed');
});

test('big endian: recognised as unsupported, no crash', () => {
  const buf = load('bigendian.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true);
  assert.strictEqual(p.unsupportedReason, 'big_endian');
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, false);
});

test('bare implicit dataset without preamble', () => {
  const buf = load('bare_implicit.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true, p.error);
  assert.strictEqual(p.hasPreamble, false);
  assert.strictEqual(p.explicit, false);
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, true, f.reason);
  assert.strictEqual(f.width, 6); assert.strictEqual(f.height, 4);
  assert.strictEqual(f.rgba[0], 0); assert.strictEqual(f.rgba[23 * 4], 255);
});

test('16-bit unsigned with 12 bits stored masks overlay bits', () => {
  const buf = load('u16_12stored.dcm');
  const p = DICOM.parse(buf);
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, true, f.reason);
  assert.strictEqual(f.stats.min, 0); assert.strictEqual(f.stats.max, 4095);
  assert.strictEqual(f.rgba[6 * 4], 255); // 4095
  assert.strictEqual(f.rgba[7 * 4], 255); // 4095 | 0xF000 -> masked -> 4095
  assert.strictEqual(f.rgba[1 * 4], f.rgba[1 * 4]); // sanity
  // value 100 | 0xF000 masked to 100 -> small grey
  assert.ok(f.rgba[1 * 4] < 20 && f.rgba[1 * 4] >= 0);
});

test('truncated pixel data is refused cleanly', () => {
  const buf = load('truncated.dcm');
  const p = DICOM.parse(buf);
  assert.strictEqual(p.ok, true);
  const f = DICOM.decodeFrame(p, buf, {});
  assert.strictEqual(f.ok, false); assert.strictEqual(f.reason, 'truncated_pixel_data');
});

test('garbage input does not throw', () => {
  const junk = new Uint8Array(500); for (let i = 0; i < 500; i++) junk[i] = (i * 37) & 255;
  const p = DICOM.parse(junk.buffer);
  assert.ok(p && typeof p.ok === 'boolean');
  const p2 = DICOM.parse(new ArrayBuffer(3));
  assert.strictEqual(p2.ok, false);
});

test('age helpers', () => {
  assert.strictEqual(DICOM.ageBandFromYears(11), '0-11');
  assert.strictEqual(DICOM.ageBandFromYears(12), '12-17');
  assert.strictEqual(DICOM.ageBandFromYears(17), '12-17');
  assert.strictEqual(DICOM.ageBandFromYears(18), '18-29');
  assert.strictEqual(DICOM.ageBandFromYears(29), '18-29');
  assert.strictEqual(DICOM.ageBandFromYears(44), '30-44');
  assert.strictEqual(DICOM.ageBandFromYears(59), '45-59');
  assert.strictEqual(DICOM.ageBandFromYears(74), '60-74');
  assert.strictEqual(DICOM.ageBandFromYears(75), '75+');
  assert.strictEqual(DICOM.ageBandFromYears(null), null);
  const I = DICOM._internal;
  assert.strictEqual(I.ageFromAS('034Y'), 34);
  assert.strictEqual(I.ageFromAS('018M'), 1);
  assert.strictEqual(I.ageFromAS('abc'), null);
  assert.strictEqual(I.ageBetween({ y: 1980, m: 1, d: 15 }, { y: 2024, m: 1, d: 14 }), 43);
  assert.strictEqual(I.ageBetween({ y: 1980, m: 1, d: 15 }, { y: 2024, m: 1, d: 15 }), 44);
});

// ---------------- Rubric ----------------
test('toothInfo', () => {
  const t48 = RUBRIC.toothInfo(48);
  assert.ok(t48.lower && t48.thirdMolar && t48.ianRelevant && !t48.sinusRelevant);
  const t18 = RUBRIC.toothInfo(18);
  assert.ok(t18.upper && t18.thirdMolar && t18.sinusRelevant && !t18.ianRelevant);
  const t11 = RUBRIC.toothInfo(11);
  assert.ok(t11.upper && !t11.posterior && !t11.sinusRelevant);
  const t36 = RUBRIC.toothInfo(36);
  assert.ok(t36.lower && t36.molar && t36.ianRelevant);
  const t75 = RUBRIC.toothInfo(75);
  assert.ok(t75.primary && t75.lower && t75.molar && t75.ianRelevant);
  assert.strictEqual(RUBRIC.toothInfo(19), null);
  assert.strictEqual(RUBRIC.toothInfo(56), null);
  assert.strictEqual(RUBRIC.toothInfo('abc'), null);
});

test('pederson index', () => {
  assert.deepStrictEqual(RUBRIC.pederson('mesioangular', 'A', 'I').score, 3);
  assert.strictEqual(RUBRIC.pederson('mesioangular', 'A', 'I').cls, 'minimal');
  assert.strictEqual(RUBRIC.pederson('vertical', 'B', 'I').score, 6);
  assert.strictEqual(RUBRIC.pederson('vertical', 'B', 'I').cls, 'moderate');
  assert.strictEqual(RUBRIC.pederson('distoangular', 'C', 'III').score, 10);
  assert.strictEqual(RUBRIC.pederson('distoangular', 'C', 'III').cls, 'veryDifficult');
  assert.strictEqual(RUBRIC.pederson('horizontal', 'B', 'II').score, 6);
  assert.strictEqual(RUBRIC.pederson('horizontal', 'C', 'II').score, 7);
  assert.strictEqual(RUBRIC.pederson(null, 'A', 'I'), null);
});

test('semaforo: vertical A I (Pederson 5) is amber via T4 only', () => {
  const r = RUBRIC.evaluate({ fdi: 48, imageQuality: 'diagnostic', ianRelation: 'separate', winter: 'vertical', pellDepth: 'A', pellRamus: 'I' });
  assert.strictEqual(r.pederson.score, 5 /* vertical 3 + A 1 + I 1 */);
  assert.strictEqual(r.level, 'amber');
  assert.deepStrictEqual(r.fired.map(f => f.id), ['T4']);
});

test('semaforo: mesioangular A I with separate canal is green', () => {
  const r = RUBRIC.evaluate({ fdi: 48, imageQuality: 'diagnostic', ianRelation: 'separate', winter: 'mesioangular', pellDepth: 'A', pellRamus: 'I' });
  assert.strictEqual(r.level, 'green', JSON.stringify(r.fired));
  assert.strictEqual(r.fired.length, 0);
});

test('semaforo: unassessed canal is amber, never green', () => {
  const r = RUBRIC.evaluate({ fdi: 46, imageQuality: 'diagnostic' });
  assert.strictEqual(r.level, 'amber');
  assert.ok(r.fired.some(f => f.id === 'N5'));
});

test('semaforo: high-risk Rood sign is red with CBCT and consent actions', () => {
  const r = RUBRIC.evaluate({ fdi: 38, imageQuality: 'diagnostic', ianRelation: 'superimposed', roodSigns: ['darkening'] });
  assert.strictEqual(r.level, 'red');
  assert.ok(r.fired.some(f => f.id === 'N1'));
  assert.ok(r.actions.some(a => a.id === 'cbct'));
  assert.ok(r.actions.some(a => a.id === 'consentIan'));
  assert.ok(r.actions.some(a => a.id === 'coronectomy'));
});

test('semaforo: one lower-risk Rood sign is amber; two signs are red', () => {
  const a = RUBRIC.evaluate({ fdi: 38, imageQuality: 'diagnostic', ianRelation: 'superimposed', roodSigns: ['deflection'] });
  assert.strictEqual(a.level, 'amber');
  const b = RUBRIC.evaluate({ fdi: 38, imageQuality: 'diagnostic', ianRelation: 'superimposed', roodSigns: ['deflection', 'narrowingRoot'] });
  assert.strictEqual(b.level, 'red');
  assert.ok(b.fired.some(f => f.id === 'N2'));
});

test('semaforo: Rood signs are ignored for upper teeth; sinus relation governs', () => {
  const r = RUBRIC.evaluate({ fdi: 18, imageQuality: 'diagnostic', roodSigns: ['darkening'], sinusRelation: 'separate', pellDepth: 'A' });
  assert.strictEqual(r.level, 'green', JSON.stringify(r.fired));
  const s = RUBRIC.evaluate({ fdi: 16, imageQuality: 'diagnostic', sinusRelation: 'projecting' });
  assert.strictEqual(s.level, 'amber');
  assert.ok(s.actions.some(x => x.id === 'oacPrecautions'));
  const u = RUBRIC.evaluate({ fdi: 16, imageQuality: 'diagnostic' });
  assert.strictEqual(u.level, 'amber');
  assert.ok(u.fired.some(f => f.id === 'S3'));
});

test('semaforo: anterior tooth with nothing recorded on a diagnostic image is green', () => {
  const r = RUBRIC.evaluate({ fdi: 11, imageQuality: 'diagnostic' });
  assert.strictEqual(r.level, 'green', JSON.stringify(r.fired));
});

test('semaforo: pathology and clinical flags', () => {
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, pathology: 'illDefined' }).level, 'red');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, pathology: 'pericoronal' }).level, 'red');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, pathology: 'radiopacity' }).level, 'amber');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, pathology: 'periapical' }).level, 'amber');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, clinical: ['antiresorptive'] }).level, 'red');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, clinical: ['anticoagulant'] }).level, 'amber');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 11, clinical: ['age25plus'] }).level, 'green', 'age only matters for third molars');
  assert.strictEqual(RUBRIC.evaluate({ fdi: 28, sinusRelation: 'separate', clinical: ['age25plus'] }).level, 'amber');
});

test('semaforo: Pell & Gregory C / III is red; Pederson 7+ is red', () => {
  const r = RUBRIC.evaluate({ fdi: 48, ianRelation: 'separate', winter: 'mesioangular', pellDepth: 'C', pellRamus: 'I' });
  assert.strictEqual(r.level, 'red');
  assert.ok(r.fired.some(f => f.id === 'T1'));
  const q = RUBRIC.evaluate({ fdi: 48, ianRelation: 'separate', winter: 'distoangular', pellDepth: 'B', pellRamus: 'II' });
  assert.strictEqual(q.pederson.score, 8);
  assert.strictEqual(q.level, 'red');
  assert.ok(q.fired.some(f => f.id === 'T3'));
});

test('semaforo: non-diagnostic image yields na regardless of other inputs', () => {
  const r = RUBRIC.evaluate({ fdi: 48, imageQuality: 'nondiagnostic', roodSigns: ['darkening'], ianRelation: 'superimposed' });
  assert.strictEqual(r.level, 'na');
  assert.ok(r.actions.some(a => a.id === 'retake'));
});

test('semaforo: invalid inputs are tolerated', () => {
  const r = RUBRIC.evaluate({ fdi: 'xx', roodSigns: 'nope', clinical: null });
  assert.ok(['green', 'amber', 'red', 'na'].indexOf(r.level) !== -1);
  assert.strictEqual(r.tooth, null);
});

// ---------------- Metrics ----------------
test('wilson interval', () => {
  const w = METRICS.wilson(8, 10);
  assert.ok(Math.abs(w.p - 0.8) < 1e-12);
  assert.ok(Math.abs(w.lo - 0.4902) < 0.002, 'lo ' + w.lo);
  assert.ok(Math.abs(w.hi - 0.9433) < 0.002, 'hi ' + w.hi);
  const z = METRICS.wilson(0, 10);
  assert.strictEqual(z.p, 0); assert.strictEqual(z.lo, 0); assert.ok(z.hi > 0.2 && z.hi < 0.4);
  const f = METRICS.wilson(10, 10);
  assert.strictEqual(f.hi, 1); assert.ok(f.lo > 0.6 && f.lo < 0.8);
  assert.strictEqual(METRICS.wilson(0, 0).p, null);
});

test('auc', () => {
  assert.strictEqual(METRICS.auc([0.9, 0.8, 0.7, 0.6], [1, 1, 0, 0]), 1);
  assert.strictEqual(METRICS.auc([0.9, 0.8, 0.75, 0.6], [1, 0, 1, 0]), 0.75);
  assert.strictEqual(METRICS.auc([0.5, 0.5], [1, 0]), 0.5);
  assert.strictEqual(METRICS.auc([0.1, 0.2], [1, 0]), 0);
  assert.strictEqual(METRICS.auc([0.1, 0.2], [1, 1]), null);
  assert.strictEqual(METRICS.auc([0.3, 0.3, 0.3, 0.9], [0, 1, 0, 1]), 0.75); // ties: pos(0.3) vs neg(0.3,0.3): 0.5+0.5; pos(0.9): 1+1 => 3/4
});

test('confusion and metrics', () => {
  const c = METRICS.confusion([1, 1, 0, 0, 1], [1, 0, 0, 1, 1]);
  assert.deepStrictEqual([c.tp, c.fp, c.fn, c.tn], [2, 1, 1, 1]);
  const m = METRICS.metrics(c);
  assert.ok(Math.abs(m.sensitivity.p - 2 / 3) < 1e-12);
  assert.ok(Math.abs(m.specificity.p - 0.5) < 1e-12);
  assert.ok(Math.abs(m.f1 - (4 / 6)) < 1e-12);
});

test('evaluateCode case-level', () => {
  const cases = ['a', 'b', 'c', 'd'];
  const truth = { a: true, b: true };
  const preds = [{ caseId: 'a', score: 0.9 }, { caseId: 'a', score: 0.2 }, { caseId: 'b', score: 0.4 }, { caseId: 'c', score: 0.6 }];
  const m = METRICS.evaluateCode(cases, truth, preds, 0.5);
  assert.deepStrictEqual([m.counts.tp, m.counts.fp, m.counts.fn, m.counts.tn], [1, 1, 1, 1]);
  assert.strictEqual(m.auc, 0.75); // scores a .9 b .4 c .6 d 0 -> pairs: (a,c)1 (a,d)1 (b,c)0 (b,d)1 => 3/4
});

test('reader agreement (jaccard with IoU)', () => {
  const A = [{ code: 'DEN-CAR', fdi: 36, box: { x: 0, y: 0, w: 10, h: 10 } }, { code: 'INC-CAC', fdi: null, box: { x: 50, y: 50, w: 10, h: 10 } }];
  const B = [{ code: 'DEN-CAR', fdi: 36, box: { x: 2, y: 2, w: 10, h: 10 } }, { code: 'DEN-PAR', fdi: 46, box: { x: 90, y: 90, w: 5, h: 5 } }];
  const r = METRICS.readerAgreement(A, B);
  assert.strictEqual(r.matched, 1);
  assert.strictEqual(r.union, 3);
  assert.ok(Math.abs(r.jaccard - 1 / 3) < 1e-12);
  assert.strictEqual(METRICS.readerAgreement([], []).jaccard, null);
  assert.ok(Math.abs(METRICS.iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 }) - (50 / 150)) < 1e-12);
});

// ---------------- OPEN DATASET (AKUDENTAL) ----------------
require('../src/20-taxonomy.js');
require('../src/66-opendata-data.js');
require('../src/67-opendata.js');
const OD = globalThis.PX_OPENDATA, SUB = globalThis.PX_OPENDATA_SUBSET, TX = globalThis.PX_TAXONOMY;

test('open dataset: embedded subset is complete and self-describing', () => {
  assert.strictEqual(SUB.dataset, 'AKUDENTAL');
  assert.strictEqual(SUB.images.length, 36);
  assert.ok(/CC BY-NC-SA 4\.0/.test(SUB.licence));
  assert.ok(/10\.1186\/s12903-025-07645-0/.test(SUB.citation));
  assert.ok(/^[0-9a-f]{40}$/.test(SUB.sourceCommit));
  const ids = new Set(SUB.images.map(e => e.srcId));
  assert.strictEqual(ids.size, 36);
  SUB.images.forEach(e => {
    assert.strictEqual(e.width, 1400);
    assert.ok(e.height > 600 && e.height < 900, 'height ' + e.height);
    assert.ok(e.data.length > 50000, 'image data present');
    assert.ok(/^\/9j\//.test(e.data), 'JPEG base64 starts with /9j/');
    e.teeth.forEach(tt => { assert.ok(tt.fdi >= 11 && tt.fdi <= 48); assert.ok(tt.box[0] >= 0 && tt.box[0] + tt.box[2] <= 1400 + 1); assert.ok(tt.box[1] >= 0 && tt.box[1] + tt.box[3] <= e.height + 1); });
    e.structures.forEach(st => assert.ok(['implant', 'bridge', 'filling_crown'].includes(st.kind)));
    const present = new Set(e.teeth.map(tt => tt.fdi));
    e.absent.forEach(f => assert.ok(!present.has(f), 'absent tooth is not labelled'));
    assert.strictEqual(present.size + e.absent.length, 32 + (e.teeth.length - present.size));
  });
  const groups = SUB.selection; assert.deepStrictEqual(Object.values(groups).map(g => g.length), [8, 7, 8, 6, 7]);
});

test('open dataset: FDI assignment by overlap is conservative', () => {
  const teeth = [{ fdi: 36, box: [100, 100, 50, 80] }, { fdi: 37, box: [150, 100, 50, 80] }];
  assert.strictEqual(OD.assignFdi([110, 110, 20, 20], teeth), 36);          // fully inside 36
  assert.strictEqual(OD.assignFdi([142, 110, 20, 20], teeth), 37);          // 8 px in 36, 12 px in 37 -> 60% in 37
  assert.strictEqual(OD.assignFdi([120, 110, 120, 20], teeth), null);       // bridge spanning beyond both -> 25% in 36, 42% in 37 -> no tooth
  assert.strictEqual(OD.assignFdi([300, 300, 20, 20], teeth), null);        // no overlap
  assert.strictEqual(OD.assignFdi([0, 0, 0, 0], teeth), null);
});

test('open dataset: mapEntry produces valid PanoramIA records with provenance', () => {
  const e = SUB.images.find(x => x.srcId === 147);
  const m = OD.mapEntry(e, SUB, 1700000000000);
  assert.strictEqual(m.c.id, 'aku_147'); assert.strictEqual(m.c.pseudonym, 'AKU-0147');
  assert.strictEqual(m.c.consent, 'open'); assert.ok(TX.CONSENT.some(c => c.id === 'open'));
  assert.strictEqual(m.c.isOpenData, true); assert.strictEqual(m.c.isDemo, false);
  assert.strictEqual(m.c.adjudicationComplete, true); assert.strictEqual(m.c.externalReference, true);
  assert.strictEqual(m.c.deid.burnedInChecked, true);
  assert.ok(m.c.ref.absent.includes(18) && m.c.ref.absent.includes(48));
  assert.strictEqual(m.c.ref.teeth.length, 18);
  assert.strictEqual(m.anns.length, e.structures.length);
  const codes = new Set(m.anns.map(a => a.code)); codes.forEach(c => assert.ok(TX.FINDING_BY_CODE[c], 'known code ' + c));
  assert.ok(m.anns.some(a => a.code === 'DEN-IMPL') && m.anns.some(a => a.code === 'DEN-RST'));
  m.anns.forEach(a => { assert.strictEqual(a.reader, 'ADJ'); assert.strictEqual(a.readerName, 'AKUDENTAL'); assert.strictEqual(a.external, true); assert.ok(a.box.w > 0 && a.box.h > 0); assert.ok(a.fdi === null || (a.fdi >= 11 && a.fdi <= 48)); });
  // no identifying fields anywhere in the record
  const json = JSON.stringify(m); assert.ok(!/PatientName|PatientID|birth|cedula|"patient/i.test(json), 'no identifying fields');
  assert.strictEqual(m.c.subjectId, ''); assert.strictEqual(m.c.year, null); assert.strictEqual(m.c.sex, 'U'); assert.strictEqual(m.c.ageBand, '');
});

test('open dataset: overlay shapes carry colours per structure kind', () => {
  const e = SUB.images.find(x => x.srcId === 147);
  const sh = OD.overlayShapes(OD.mapEntry(e, SUB).c.ref);
  assert.strictEqual(sh.length, e.teeth.length + e.structures.length);
  assert.ok(sh.some(s => s.color === OD.STRUCT_COLOR.implant) && sh.some(s => s.label === '16'));
  assert.strictEqual(OD.STRUCT_COLOR.implant, TX.colorOf('DEN-IMPL')); assert.strictEqual(OD.STRUCT_COLOR.tooth, TX.colorOf('ANA-TTH'));
});

// ---------------- GEOMETRY (traffic-light suggestions) ----------------
require('../src/45-geometry.js');
const G = globalThis.PX_GEOM;
function rectPoly(cx, cy, w, h, deg) { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]); }

test('geometry: Winter angle sign and classes follow the stated convention', () => {
  const m2 = rectPoly(100, 300, 40, 100, 0);
  // lower right side (patient's right = viewer's left): mesial is towards +x
  assert.strictEqual(G.winterAngle(rectPoly(160, 300, 40, 100, 0), m2, false, 1).cls, 'vertical');
  // rotating the rectangle by +30° (screen coordinates) moves its upper end, the crown of a lower tooth, towards +x = mesial on the right side
  const mes = G.winterAngle(rectPoly(160, 300, 40, 100, 30), m2, false, 1); assert.strictEqual(mes.cls, 'mesioangular'); assert.ok(Math.abs(mes.angle - 30) <= 1);
  const dis = G.winterAngle(rectPoly(160, 300, 40, 100, -30), m2, false, 1); assert.strictEqual(dis.cls, 'distoangular'); assert.ok(Math.abs(dis.angle + 30) <= 1);
  // same shapes on the left side flip
  assert.strictEqual(G.winterAngle(rectPoly(160, 300, 40, 100, 30), m2, false, -1).cls, 'distoangular');
  // horizontal tooth with a wider crown pointing mesially (right side, mesial = +x)
  const horiz = [[150, 290], [260, 280], [260, 330], [150, 320]];
  assert.strictEqual(G.winterAngle(horiz, m2, false, 1).cls, 'horizontal');
  assert.strictEqual(G.toothAxis(horiz, false).how, 'width-rule');
  // upper teeth: crown is the lower end
  assert.strictEqual(G.winterAngle(rectPoly(160, 300, 40, 100, 30), m2, true, -1).cls, 'mesioangular');
});

test('geometry: Pell & Gregory depth and ramus class from lines', () => {
  const occ = [[0, 200], [400, 200]], cej = [[0, 240], [400, 240]];
  assert.strictEqual(G.pellDepth(rectPoly(200, 250, 40, 100, 0), occ, cej, false).depth, 'A'); // top at 200
  assert.strictEqual(G.pellDepth(rectPoly(200, 270, 40, 100, 0), occ, cej, false).depth, 'B'); // top at 220
  assert.strictEqual(G.pellDepth(rectPoly(200, 300, 40, 100, 0), occ, cej, false).depth, 'C'); // top at 250
  // upper jaw mirrors (occlusal extreme is the bottom)
  assert.strictEqual(G.pellDepth(rectPoly(200, 150, 40, 100, 0), occ, cej, true).depth, 'A');
  // ramus: right side, distal towards smaller x; vertical ramus line at x = 180
  const ram = [[180, 100], [180, 400]];
  assert.strictEqual(G.pellRamus(rectPoly(220, 300, 40, 100, 0), ram, -1, false).ramus, 'I');   // crown 200..240, all mesial of 180
  assert.strictEqual(G.pellRamus(rectPoly(190, 300, 40, 100, 0), ram, -1, false).ramus, 'II');  // 170..210 -> 25 % covered
  assert.strictEqual(G.pellRamus(rectPoly(150, 300, 40, 100, 0), ram, -1, false).ramus, 'III'); // 130..170 fully distal
});

test('geometry: canal and sinus relations, side detection, lengths', () => {
  const tooth = rectPoly(200, 300, 40, 100, 0); // y 250..350
  const canalThrough = [[0, 330], [400, 330]], canalBelow = [[0, 380], [400, 380]];
  assert.strictEqual(G.canalRelation(tooth, canalThrough, false).overlap, true);
  const far = G.canalRelation(tooth, canalBelow, false); assert.strictEqual(far.overlap, false); assert.strictEqual(far.distancePx, 30);
  const sinus = [[100, 100], [300, 100], [300, 260], [100, 260]];
  assert.strictEqual(G.sinusRelation(tooth, sinus).overlap, true);
  assert.strictEqual(G.sinusRelation(tooth, [[100, 100], [300, 100], [300, 200], [100, 200]]).overlap, false);
  assert.strictEqual(G.sideOf([[100, 100], [120, 100], [120, 120]], 1400), 'R');
  assert.strictEqual(G.sideOf([[1000, 100], [1020, 100], [1020, 120]], 1400), 'L');
  assert.strictEqual(G.fdiSide(48), 'R'); assert.strictEqual(G.fdiSide(38), 'L'); assert.strictEqual(G.fdiUpper(18), true); assert.strictEqual(G.fdiUpper(48), false);
  assert.strictEqual(G.length([[0, 0], [30, 40]]), 50);
});

// ---------------- VIEWER GEOMETRY HELPERS ----------------
globalThis.window = undefined;
require('../src/72-viewer.js');
const VG = globalThis.PX_Viewer.geom;
test('viewer: freehand simplification keeps corners and drops collinear points', () => {
  const pts = []; for (let i = 0; i <= 100; i++) pts.push([i, 0]); for (let i = 1; i <= 100; i++) pts.push([100, i]); // an L
  const s = VG.simplify(pts, 1.0);
  assert.strictEqual(s.length, 3); assert.deepStrictEqual(s[1], [100, 0]);
  assert.strictEqual(VG.pointInPolygon(5, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]), true);
  assert.strictEqual(VG.pointInPolygon(15, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]), false);
  const g = VG.geomFromShape({ type: 'polygon', points: [[10, 20], [50, 25], [30, 60]] });
  assert.deepStrictEqual([g.x, g.y, g.w, g.h], [10, 20, 40, 40]);
});

// ---------------- RADIOPACITY DETECTOR ----------------
require('../src/68-detector.js');
const D = globalThis.PX_DETECT;
test('detector: finds a bright, locally contrasting blob and nothing on a flat image', () => {
  const W = 400, H = 240, data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { const v = 120; data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; data[i * 4 + 3] = 255; }
  const flat = D.detectImageData({ width: W, height: H, data: data.slice() }, {});
  assert.strictEqual(flat.length, 0);
  for (let y = 100; y < 140; y++) for (let x = 180; x < 210; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 250; }
  const dets = D.detectImageData({ width: W, height: H, data }, {});
  assert.strictEqual(dets.length, 1);
  assert.ok(Math.abs(dets[0].box.x - 180) <= 2 && Math.abs(dets[0].box.y - 100) <= 2 && Math.abs(dets[0].box.w - 30) <= 3 && Math.abs(dets[0].box.h - 40) <= 3, JSON.stringify(dets[0].box));
  const ev = D.evaluate(dets, [{ x: 182, y: 98, w: 28, h: 44 }], 0.25); assert.deepStrictEqual([ev.tp, ev.fp, ev.fn], [1, 0, 0]);
  const ev2 = D.evaluate(dets, [{ x: 10, y: 10, w: 20, h: 20 }], 0.25); assert.deepStrictEqual([ev2.tp, ev2.fp, ev2.fn], [0, 1, 1]);
  assert.strictEqual(D.MEASURED.images, 333);
});

test('taxonomy v0.2: finer dental codes, anatomy layer, colours, helpers', () => {
  ['DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-POST', 'DEN-RCT', 'DEN-PAO', 'DEN-FRX', 'DEN-RLU', 'DEN-ROP', 'JAW-RLU', 'JAW-ROP', 'ANA-IAC', 'ANA-SIN', 'ANA-TTH', 'MEA-LIN'].forEach(c => assert.ok(TX.FINDING_BY_CODE[c], c));
  assert.strictEqual(TX.isAnatomy('ANA-IAC'), true); assert.strictEqual(TX.isFinding('ANA-IAC'), false); assert.strictEqual(TX.isMeasure('MEA-LIN'), true); assert.strictEqual(TX.isFinding('DEN-RCT'), true);
  const den = TX.FINDINGS.filter(f => f.group === 'DEN'); assert.strictEqual(new Set(den.map(f => f.color)).size, den.length, 'distinct colours within dental codes');
  assert.deepStrictEqual(TX.shapesFor('ANA-RAM'), ['line']); assert.deepStrictEqual(TX.shapesFor('ANA-MF'), ['point']);
  assert.ok(TX.QUICK_CODES.length >= 12 && TX.ANATOMY_CODES.length === 11);
  assert.strictEqual(TX.VERSION, '0.2.0');
});


require('../src/69-autoread.js');
const AU = globalThis.PX_AUTO;
test('autoread: atlas anatomy from tooth outlines and classified radiopacities', () => {
  const W = 700, H = 360, data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 120; data[i * 4 + 3] = 255; }
  // a simple dentition: 8 upper and 8 lower rectangular teeth across the middle of the image
  const teeth = [];
  const fdisU = [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27], fdisL = [47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37];
  fdisU.forEach((f, i) => { const x = 90 + i * 38; teeth.push({ fdi: f, poly: [[x, 90], [x + 30, 90], [x + 30, 180], [x, 180]] }); });
  fdisL.forEach((f, i) => { const x = 90 + i * 38; teeth.push({ fdi: f, poly: [[x, 190], [x + 30, 190], [x + 30, 280], [x, 280]] }); });
  // a bright filling in the crown half of 46, and in 36 a crown with a bright root canal line below it
  for (let y = 192; y < 215; y++) for (let x = 130; x < 155; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 250; }
  for (let y = 192; y < 222; y++) for (let x = 548; x < 578; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 250; }
  for (let y = 232; y < 278; y++) for (let x = 560; x < 563; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 240; }
  const res = AU.analyzeImageData({ width: W, height: H, data }, teeth, {});
  const codes = res.anatomy.map(a => a.code);
  ['ANA-OCC', 'ANA-IAC', 'ANA-MF', 'ANA-SIN', 'ANA-NAS', 'ANA-RAM', 'ANA-MBD'].forEach(c => assert.ok(codes.indexOf(c) > -1, 'anatomy has ' + c));
  const iac = res.anatomy.filter(a => a.code === 'ANA-IAC'); assert.strictEqual(iac.length, 2); assert.ok(iac.every(a => a.shape.type === 'polyline' && a.side));
  const mf = res.anatomy.filter(a => a.code === 'ANA-MF')[0]; assert.ok(mf.shape.points[0][1] > 280, 'mental foramen lies below the lower apices');
  const sin = res.anatomy.filter(a => a.code === 'ANA-SIN')[0]; assert.ok(sin.box.y < 90 && sin.box.y + sin.box.h <= 110, 'sinus lies above the upper posterior apices (floor may dip to the canine level)');
  const fil = res.findings.filter(f => f.code === 'DEN-FIL' || f.code === 'DEN-CRN'); assert.ok(fil.some(f => f.fdi === 46) && fil.some(f => f.fdi === 36), JSON.stringify(res.findings));
  const rct = res.findings.filter(f => f.code === 'DEN-RCT'); assert.ok(rct.length >= 1 && rct[0].fdi === 36, JSON.stringify(res.findings));
  assert.ok(res.findings.every(f => f.shape.type === 'polygon' && f.how), 'findings are polygons with a stated rule');
  assert.strictEqual(AU.MEASURED.images, 333);
});
test('autoread: without tooth outlines only radiopacities are proposed; nothing on a flat image', () => {
  const W = 400, H = 240, data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 120; data[i * 4 + 3] = 255; }
  const flat = AU.analyzeImageData({ width: W, height: H, data: data.slice() }, [], {});
  assert.strictEqual(flat.anatomy.length + flat.findings.length, 0);
  for (let y = 60; y < 125; y++) for (let x = 180; x < 205; x++) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = 250; }
  const r = AU.analyzeImageData({ width: W, height: H, data }, [], {});
  assert.strictEqual(r.anatomy.length, 0); assert.strictEqual(r.findings.length, 1); assert.strictEqual(r.findings[0].code, 'DEN-IMPL');
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
