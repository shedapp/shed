/* PanoramIA — evaluation metrics for model-versus-reference comparisons.
 * Wilson score intervals, confusion-matrix metrics and AUC (Mann–Whitney with
 * average ranks for ties). Pure functions; unit-tested in Node.
 */
(function (root) {
  'use strict';

  /** Wilson score interval for a binomial proportion k/n at 95% (z = 1.96). */
  function wilson(k, n, z) {
    z = z || 1.959963984540054;
    if (!(n > 0)) return { p: null, lo: null, hi: null, n: n || 0, k: k || 0 };
    var p = k / n, z2 = z * z;
    var denom = 1 + z2 / n;
    var center = (p + z2 / (2 * n)) / denom;
    var half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
    var lo = center - half, hi = center + half;
    if (k === 0) lo = 0;          // exact bounds at the extremes (avoid floating-point noise)
    if (k === n) hi = 1;
    return { p: p, lo: Math.max(0, lo), hi: Math.min(1, hi), n: n, k: k };
  }

  /** Counts from parallel boolean arrays. */
  function confusion(truth, pred) {
    var tp = 0, fp = 0, fn = 0, tn = 0;
    for (var i = 0; i < truth.length; i++) {
      var t = !!truth[i], p = !!pred[i];
      if (t && p) tp++; else if (!t && p) fp++; else if (t && !p) fn++; else tn++;
    }
    return { tp: tp, fp: fp, fn: fn, tn: tn, n: truth.length };
  }

  function f1(tp, fp, fn) {
    var d = 2 * tp + fp + fn;
    return d === 0 ? null : (2 * tp) / d;
  }

  /** Metrics with Wilson intervals from a confusion object. */
  function metrics(c) {
    var sens = wilson(c.tp, c.tp + c.fn);
    var spec = wilson(c.tn, c.tn + c.fp);
    var ppv = wilson(c.tp, c.tp + c.fp);
    var npv = wilson(c.tn, c.tn + c.fn);
    var acc = wilson(c.tp + c.tn, c.n);
    return { sensitivity: sens, specificity: spec, ppv: ppv, npv: npv, accuracy: acc, f1: f1(c.tp, c.fp, c.fn), counts: c };
  }

  /** AUC by the Mann–Whitney U statistic with average ranks for ties. null if a class is empty. */
  function auc(scores, labels) {
    var n = scores.length, idx = [], i;
    var nPos = 0, nNeg = 0;
    for (i = 0; i < n; i++) {
      if (typeof scores[i] !== 'number' || isNaN(scores[i])) continue;
      idx.push(i);
      if (labels[i]) nPos++; else nNeg++;
    }
    if (nPos === 0 || nNeg === 0) return null;
    idx.sort(function (a, b) { return scores[a] - scores[b]; });
    var ranks = new Array(n);
    var k = 0;
    while (k < idx.length) {
      var j = k;
      while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[k]]) j++;
      var avg = (k + 1 + j + 1) / 2; // ranks are 1-based
      for (var m = k; m <= j; m++) ranks[idx[m]] = avg;
      k = j + 1;
    }
    var sumPos = 0;
    for (i = 0; i < idx.length; i++) if (labels[idx[i]]) sumPos += ranks[idx[i]];
    var u = sumPos - (nPos * (nPos + 1)) / 2;
    return u / (nPos * nNeg);
  }

  /**
   * Case-level evaluation for one finding code.
   * truthCases: {caseId: true} for cases where the reference standard contains the code.
   * predictions: [{caseId, score}] (max score per case is used). Cases without a prediction score 0.
   * allCaseIds: the evaluation set.
   */
  function evaluateCode(allCaseIds, truthCases, predictions, threshold) {
    var best = {};
    for (var i = 0; i < predictions.length; i++) {
      var p = predictions[i];
      if (!p || typeof p.score !== 'number') continue;
      if (best[p.caseId] === undefined || p.score > best[p.caseId]) best[p.caseId] = p.score;
    }
    var truth = [], pred = [], scores = [];
    for (var c = 0; c < allCaseIds.length; c++) {
      var id = allCaseIds[c];
      var s = best[id] === undefined ? 0 : best[id];
      truth.push(!!truthCases[id]);
      scores.push(s);
      pred.push(s >= threshold);
    }
    var conf = confusion(truth, pred);
    var m = metrics(conf);
    m.auc = auc(scores, truth);
    m.prevalence = wilson(conf.tp + conf.fn, conf.n);
    return m;
  }

  /** Jaccard agreement between two readers' finding sets for one case. match = same code and same tooth (or both without tooth). */
  function readerAgreement(findingsA, findingsB, iouMin) {
    iouMin = iouMin === undefined ? 0.3 : iouMin;
    var usedB = {};
    var matched = 0;
    for (var i = 0; i < findingsA.length; i++) {
      var a = findingsA[i];
      for (var j = 0; j < findingsB.length; j++) {
        if (usedB[j]) continue;
        var b = findingsB[j];
        if (a.code !== b.code) continue;
        var ta = a.fdi || null, tb = b.fdi || null;
        if (ta !== tb) continue;
        if (a.box && b.box && iou(a.box, b.box) < iouMin) continue;
        usedB[j] = true; matched++; break;
      }
    }
    var union = findingsA.length + findingsB.length - matched;
    return { matched: matched, nA: findingsA.length, nB: findingsB.length, union: union, jaccard: union === 0 ? null : matched / union };
  }

  function iou(a, b) {
    var x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    var ua = a.w * a.h + b.w * b.h - inter;
    return ua <= 0 ? 0 : inter / ua;
  }

  root.PX_METRICS = { wilson: wilson, confusion: confusion, metrics: metrics, auc: auc, evaluateCode: evaluateCode, readerAgreement: readerAgreement, iou: iou, f1: f1 };
})(typeof window !== 'undefined' ? window : globalThis);
