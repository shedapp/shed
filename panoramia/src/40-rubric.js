/* PanoramIA — Semáforo quirúrgico (pre-extraction risk checklist).
 * A transparent, rule-based teaching aid built from published classifications:
 *  - Pell & Gregory (1933): depth A/B/C and ramus relationship I/II/III for lower third molars.
 *  - Winter (1926): angulation of third molars.
 *  - Pederson difficulty index (1988): Winter + depth + ramus, total 3–10.
 *  - Rood & Shehab (1990): seven panoramic signs of inferior alveolar canal proximity; three
 *    (diversion of the canal, darkening of the root, interruption of the white line) were
 *    significantly associated with nerve injury.
 * It is NOT a validated predictive score. Every output lists the rules that fired so a
 * clinician or student can check the reasoning. Pure functions; unit-tested in Node.
 */
(function (root) {
  'use strict';

  var VERSION = '0.1.0';

  var ROOD_SIGNS = ['darkening', 'deflection', 'narrowingRoot', 'bifidApex', 'interruption', 'diversion', 'narrowingCanal'];
  var ROOD_HIGH_RISK = { diversion: 1, darkening: 1, interruption: 1 };

  var PEDERSON = {
    winter: { mesioangular: 1, horizontal: 2, vertical: 3, distoangular: 4 },
    depth: { A: 1, B: 2, C: 3 },
    ramus: { I: 1, II: 2, III: 3 }
  };

  function pedersonClass(score) {
    if (score <= 4) return 'minimal';
    if (score <= 6) return 'moderate';
    return 'veryDifficult';
  }

  /** Pederson index for a mandibular third molar. Returns null unless all three inputs are valid. */
  function pederson(winter, depth, ramus) {
    var a = PEDERSON.winter[winter], b = PEDERSON.depth[depth], c = PEDERSON.ramus[ramus];
    if (a === undefined || b === undefined || c === undefined) return null;
    var score = a + b + c;
    return { score: score, cls: pedersonClass(score), parts: { winter: a, depth: b, ramus: c } };
  }

  /** Facts about an FDI tooth number (permanent 11–48, primary 51–85). */
  function toothInfo(fdi) {
    var n = parseInt(fdi, 10);
    if (isNaN(n)) return null;
    var q = Math.floor(n / 10), pos = n % 10;
    var permanent = q >= 1 && q <= 4 && pos >= 1 && pos <= 8;
    var primary = q >= 5 && q <= 8 && pos >= 1 && pos <= 5;
    if (!permanent && !primary) return null;
    var upper = (q === 1 || q === 2 || q === 5 || q === 6);
    var info = {
      fdi: n, quadrant: q, position: pos, permanent: permanent, primary: primary,
      upper: upper, lower: !upper,
      thirdMolar: permanent && pos === 8,
      molar: permanent ? pos >= 6 : pos >= 4,
      premolar: permanent && (pos === 4 || pos === 5),
      posterior: permanent ? pos >= 4 : pos >= 4
    };
    // Where the inferior alveolar canal / mental foramen and the maxillary sinus matter most.
    info.ianRelevant = info.lower && info.posterior;
    info.sinusRelevant = info.upper && info.posterior;
    return info;
  }

  // Severity order
  var LEVEL_RANK = { green: 0, amber: 1, red: 2, na: 3 };

  /* Rule table. Each rule: id, level, when(inputs, ctx) -> boolean, text {es,en}, actions [action ids] */
  var RULES = [
    { id: 'Q1', level: 'na',
      when: function (i) { return i.imageQuality === 'nondiagnostic'; },
      text: { es: 'La imagen no es diagnóstica: no se puede valorar el riesgo.', en: 'The image is non-diagnostic: risk cannot be assessed.' },
      actions: ['retake'] },
    { id: 'Q2', level: 'amber',
      when: function (i) { return i.imageQuality === 'limited'; },
      text: { es: 'Calidad de imagen limitada: la valoración es parcial.', en: 'Limited image quality: the assessment is partial.' },
      actions: ['retakeOrCbct'] },
    { id: 'N1', level: 'red',
      when: function (i, c) { return c.ianRelevant && c.roodHigh.length > 0; },
      text: { es: 'Signo radiográfico de alto riesgo de Rood y Shehab presente (desviación del conducto, oscurecimiento radicular o interrupción de la línea blanca).', en: 'High-risk Rood and Shehab sign present (diversion of the canal, darkening of the root or interruption of the white line).' },
      actions: ['cbct', 'consentIan', 'coronectomy', 'referOmfs'] },
    { id: 'N2', level: 'red',
      when: function (i, c) { return c.ianRelevant && c.rood.length >= 2; },
      text: { es: 'Dos o más signos de Rood y Shehab presentes.', en: 'Two or more Rood and Shehab signs present.' },
      actions: ['cbct', 'consentIan', 'referOmfs'] },
    { id: 'N3', level: 'amber',
      when: function (i, c) { return c.ianRelevant && c.rood.length === 1 && c.roodHigh.length === 0; },
      text: { es: 'Un signo de Rood y Shehab de menor riesgo presente.', en: 'One lower-risk Rood and Shehab sign present.' },
      actions: ['cbctConsider', 'consentIan'] },
    { id: 'N4', level: 'amber',
      when: function (i, c) { return c.ianRelevant && (i.ianRelation === 'superimposed' || i.ianRelation === 'contact') && c.rood.length === 0; },
      text: { es: 'Raíces en contacto o superpuestas al conducto dentario inferior sin signos de Rood y Shehab.', en: 'Roots in contact with or superimposed on the inferior alveolar canal without Rood and Shehab signs.' },
      actions: ['cbctConsider', 'consentIan'] },
    { id: 'N5', level: 'amber',
      when: function (i, c) { return c.ianRelevant && (i.ianRelation === 'indeterminate' || !i.ianRelation); },
      text: { es: 'Relación con el conducto dentario inferior no valorada o indeterminada.', en: 'Relationship to the inferior alveolar canal not assessed or indeterminate.' },
      actions: ['assessCanal'] },
    { id: 'S1', level: 'amber',
      when: function (i, c) { return c.sinusRelevant && i.sinusRelation === 'projecting'; },
      text: { es: 'Raíces proyectadas en el seno maxilar o piso sinusal muy delgado.', en: 'Roots projecting into the maxillary sinus or very thin sinus floor.' },
      actions: ['oacPrecautions', 'cbctConsider'] },
    { id: 'S2', level: 'amber',
      when: function (i, c) { return c.sinusRelevant && i.sinusRelation === 'close'; },
      text: { es: 'Raíces próximas al seno maxilar.', en: 'Roots close to the maxillary sinus.' },
      actions: ['oacPrecautions'] },
    { id: 'S3', level: 'amber',
      when: function (i, c) { return c.sinusRelevant && (i.sinusRelation === 'indeterminate' || !i.sinusRelation); },
      text: { es: 'Relación con el seno maxilar no valorada o indeterminada.', en: 'Relationship to the maxillary sinus not assessed or indeterminate.' },
      actions: ['assessSinus'] },
    { id: 'T1', level: 'red',
      when: function (i, c) { return c.thirdMolar && (i.pellDepth === 'C' || (c.lower && i.pellRamus === 'III')); },
      text: { es: 'Pell y Gregory profundidad C o clase III: tercer molar profundo o totalmente dentro de la rama.', en: 'Pell and Gregory depth C or class III: deep third molar or fully within the ramus.' },
      actions: ['referOmfs', 'cbctConsider'] },
    { id: 'T2', level: 'amber',
      when: function (i, c) { return c.thirdMolar && (i.pellDepth === 'B' || (c.lower && i.pellRamus === 'II')) && !(i.pellDepth === 'C' || i.pellRamus === 'III'); },
      text: { es: 'Pell y Gregory profundidad B o clase II.', en: 'Pell and Gregory depth B or class II.' },
      actions: ['planFlap'] },
    { id: 'T3', level: 'red',
      when: function (i, c) { return !!(c.pederson && c.pederson.score >= 7); },
      text: { es: 'Índice de Pederson 7 a 10: extracción muy difícil.', en: 'Pederson index 7 to 10: very difficult extraction.' },
      actions: ['referOmfs'] },
    { id: 'T4', level: 'amber',
      when: function (i, c) { return !!(c.pederson && c.pederson.score >= 5 && c.pederson.score <= 6); },
      text: { es: 'Índice de Pederson 5 a 6: extracción moderadamente difícil.', en: 'Pederson index 5 to 6: moderately difficult extraction.' },
      actions: ['planFlap'] },
    { id: 'R1', level: 'amber',
      when: function (i) { return hasAny(i.roots, ['dilacerated', 'hypercementosis', 'bulbous']); },
      text: { es: 'Morfología radicular desfavorable (dilaceración, hipercementosis o raíces bulbosas).', en: 'Unfavourable root morphology (dilaceration, hypercementosis or bulbous roots).' },
      actions: ['sectioning'] },
    { id: 'R2', level: 'amber',
      when: function (i) { return hasAny(i.roots, ['ankylosisSuspected']); },
      text: { es: 'Sospecha de anquilosis (ausencia de espacio del ligamento periodontal).', en: 'Suspected ankylosis (loss of periodontal ligament space).' },
      actions: ['sectioning', 'cbctConsider'] },
    { id: 'B1', level: 'amber',
      when: function (i) { return i.bone === 'dense'; },
      text: { es: 'Hueso denso o esclerótico alrededor del diente.', en: 'Dense or sclerotic bone around the tooth.' },
      actions: ['sectioning'] },
    { id: 'P1', level: 'red',
      when: function (i) { return i.pathology === 'pericoronal' || i.pathology === 'radiolucency'; },
      text: { es: 'Radiolucidez asociada (pericoronal mayor de 3 mm u otra lesión radiolúcida): posible quiste o tumor.', en: 'Associated radiolucency (pericoronal larger than 3 mm or other radiolucent lesion): possible cyst or tumour.' },
      actions: ['biopsy', 'referOmfs', 'cbctConsider'] },
    { id: 'P2', level: 'red',
      when: function (i) { return i.pathology === 'illDefined'; },
      text: { es: 'Lesión mal definida o destructiva: debe descartarse malignidad antes de cualquier extracción.', en: 'Ill-defined or destructive lesion: malignancy must be ruled out before any extraction.' },
      actions: ['urgentReferral'] },
    { id: 'P3', level: 'amber',
      when: function (i) { return i.pathology === 'radiopacity'; },
      text: { es: 'Lesión radiopaca asociada.', en: 'Associated radiopaque lesion.' },
      actions: ['cbctConsider'] },
    { id: 'P4', level: 'amber',
      when: function (i) { return i.pathology === 'periapical'; },
      text: { es: 'Lesión periapical asociada.', en: 'Associated periapical lesion.' },
      actions: ['curettage'] },
    { id: 'C1', level: 'red',
      when: function (i) { return hasAny(i.clinical, ['antiresorptive', 'radiotherapy']); },
      text: { es: 'Antecedente de antirresortivos/antiangiogénicos o radioterapia de cabeza y cuello: riesgo de osteonecrosis.', en: 'History of antiresorptive/antiangiogenic therapy or head and neck radiotherapy: osteonecrosis risk.' },
      actions: ['consultPhysician', 'referOmfs'] },
    { id: 'C2', level: 'amber',
      when: function (i) { return hasAny(i.clinical, ['anticoagulant']); },
      text: { es: 'Tratamiento anticoagulante o antiagregante.', en: 'Anticoagulant or antiplatelet therapy.' },
      actions: ['bleedingPlan'] },
    { id: 'C3', level: 'amber',
      when: function (i) { return hasAny(i.clinical, ['diabetesUncontrolled']); },
      text: { es: 'Diabetes no controlada.', en: 'Uncontrolled diabetes.' },
      actions: ['consultPhysician'] },
    { id: 'C4', level: 'amber',
      when: function (i, c) { return c.thirdMolar && hasAny(i.clinical, ['age25plus']); },
      text: { es: 'Paciente de 25 años o más: mayor dificultad y morbilidad en terceros molares.', en: 'Patient aged 25 or older: greater difficulty and morbidity in third molars.' },
      actions: ['consentGeneral'] },
    { id: 'C5', level: 'amber',
      when: function (i) { return hasAny(i.clinical, ['limitedOpening']); },
      text: { es: 'Apertura bucal limitada.', en: 'Limited mouth opening.' },
      actions: ['planAccess'] }
  ];

  var ACTIONS = {
    retake: { es: 'Repetir la imagen antes de planificar.', en: 'Repeat the image before planning.' },
    retakeOrCbct: { es: 'Valorar repetir la imagen o complementar con CBCT.', en: 'Consider repeating the image or adding CBCT.' },
    cbct: { es: 'Solicitar CBCT para definir la relación raíz-conducto.', en: 'Order CBCT to define the root-canal relationship.' },
    cbctConsider: { es: 'Considerar CBCT.', en: 'Consider CBCT.' },
    consentIan: { es: 'Consentimiento informado específico sobre lesión del nervio dentario inferior (parestesia).', en: 'Specific informed consent for inferior alveolar nerve injury (paraesthesia).' },
    coronectomy: { es: 'Considerar coronectomía como alternativa a la extracción completa.', en: 'Consider coronectomy as an alternative to complete extraction.' },
    referOmfs: { es: 'Valorar derivación a cirugía oral y maxilofacial.', en: 'Consider referral to oral and maxillofacial surgery.' },
    assessCanal: { es: 'Valorar explícitamente la relación con el conducto dentario inferior antes de operar.', en: 'Explicitly assess the relationship to the inferior alveolar canal before surgery.' },
    assessSinus: { es: 'Valorar explícitamente la relación con el seno maxilar antes de operar.', en: 'Explicitly assess the relationship to the maxillary sinus before surgery.' },
    oacPrecautions: { es: 'Precauciones de comunicación bucosinusal: evitar presión apical, revisar el alveolo, instrucciones postoperatorias.', en: 'Oroantral communication precautions: avoid apical pressure, inspect the socket, postoperative instructions.' },
    planFlap: { es: 'Planificar colgajo y osteotomía.', en: 'Plan flap and bone removal.' },
    sectioning: { es: 'Prever odontosección y mayor tiempo quirúrgico.', en: 'Anticipate tooth sectioning and longer surgical time.' },
    biopsy: { es: 'Estudio histopatológico del tejido asociado.', en: 'Histopathological examination of the associated tissue.' },
    urgentReferral: { es: 'Derivación prioritaria para diagnóstico de la lesión.', en: 'Priority referral for diagnosis of the lesion.' },
    curettage: { es: 'Curetaje apical y seguimiento radiográfico.', en: 'Apical curettage and radiographic follow-up.' },
    consultPhysician: { es: 'Interconsulta médica antes de la cirugía.', en: 'Medical consultation before surgery.' },
    bleedingPlan: { es: 'Plan de manejo de sangrado según protocolo; no suspender anticoagulantes sin indicación médica.', en: 'Bleeding management plan per protocol; do not stop anticoagulants without medical advice.' },
    consentGeneral: { es: 'Explicar el mayor riesgo de complicaciones en el consentimiento.', en: 'Explain the higher complication risk in the consent.' },
    planAccess: { es: 'Planificar el acceso quirúrgico.', en: 'Plan surgical access.' }
  };

  var LEVEL_TEXT = {
    green: { es: 'Verde: sin factores radiográficos de alarma registrados. Proceder con la técnica habitual y consentimiento estándar.', en: 'Green: no radiographic alarm factors recorded. Proceed with the usual technique and standard consent.' },
    amber: { es: 'Amarillo: factores que aumentan la dificultad o el riesgo. Planificar con cuidado y documentar.', en: 'Amber: factors that increase difficulty or risk. Plan carefully and document.' },
    red: { es: 'Rojo: riesgo elevado. Completar el estudio y valorar derivación antes de operar.', en: 'Red: high risk. Complete the work-up and consider referral before operating.' },
    na: { es: 'No valorable: la imagen no permite una evaluación.', en: 'Not assessable: the image does not allow an evaluation.' }
  };

  function hasAny(list, keys) {
    if (!Array.isArray(list)) return false;
    for (var i = 0; i < keys.length; i++) if (list.indexOf(keys[i]) !== -1) return true;
    return false;
  }

  function normalize(inputs) {
    var i = inputs || {};
    return {
      fdi: i.fdi,
      imageQuality: i.imageQuality || 'diagnostic',
      ianRelation: i.ianRelation || null,
      roodSigns: Array.isArray(i.roodSigns) ? i.roodSigns.filter(function (s) { return ROOD_SIGNS.indexOf(s) !== -1; }) : [],
      sinusRelation: i.sinusRelation || null,
      winter: i.winter || null,
      pellDepth: i.pellDepth || null,
      pellRamus: i.pellRamus || null,
      roots: Array.isArray(i.roots) ? i.roots : [],
      bone: i.bone || 'normal',
      pathology: i.pathology || 'none',
      clinical: Array.isArray(i.clinical) ? i.clinical : []
    };
  }

  /** Evaluate the checklist. Returns a result with the level, fired rules, actions and context. */
  function evaluate(rawInputs) {
    var i = normalize(rawInputs);
    var tooth = toothInfo(i.fdi);
    var ctx = {
      tooth: tooth,
      ianRelevant: !!(tooth && tooth.ianRelevant),
      sinusRelevant: !!(tooth && tooth.sinusRelevant),
      thirdMolar: !!(tooth && tooth.thirdMolar),
      lower: !!(tooth && tooth.lower),
      rood: i.roodSigns,
      roodHigh: i.roodSigns.filter(function (s) { return ROOD_HIGH_RISK[s]; }),
      pederson: null
    };
    if (ctx.thirdMolar && ctx.lower) ctx.pederson = pederson(i.winter, i.pellDepth, i.pellRamus);
    var fired = [];
    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      var on = false;
      try { on = !!rule.when(i, ctx); } catch (e) { on = false; }
      if (on) fired.push({ id: rule.id, level: rule.level, text: rule.text, actions: rule.actions.slice() });
    }
    var level = 'green';
    var hasNA = fired.some(function (f) { return f.level === 'na'; });
    if (hasNA) level = 'na';
    else {
      for (var f = 0; f < fired.length; f++) if (LEVEL_RANK[fired[f].level] > LEVEL_RANK[level]) level = fired[f].level;
    }
    // Collect unique actions in order of severity of the rule that produced them
    fired.sort(function (a, b) { return LEVEL_RANK[b.level] - LEVEL_RANK[a.level]; });
    var actions = [], seen = {};
    for (var k = 0; k < fired.length; k++) {
      for (var a = 0; a < fired[k].actions.length; a++) {
        var id = fired[k].actions[a];
        if (!seen[id]) { seen[id] = true; actions.push({ id: id, text: ACTIONS[id] }); }
      }
    }
    return {
      version: VERSION,
      level: level,
      levelText: LEVEL_TEXT[level],
      fired: fired,
      actions: actions,
      pederson: ctx.pederson,
      tooth: tooth,
      inputs: i,
      disclaimer: {
        es: 'Herramienta docente basada en clasificaciones publicadas. No es un índice predictivo validado y no sustituye el juicio clínico.',
        en: 'Teaching aid based on published classifications. Not a validated predictive index and not a substitute for clinical judgement.'
      }
    };
  }

  root.PX_RUBRIC = {
    VERSION: VERSION, evaluate: evaluate, pederson: pederson, toothInfo: toothInfo,
    RULES: RULES, ACTIONS: ACTIONS, ROOD_SIGNS: ROOD_SIGNS, ROOD_HIGH_RISK: ROOD_HIGH_RISK, PEDERSON: PEDERSON, LEVEL_TEXT: LEVEL_TEXT
  };
})(typeof window !== 'undefined' ? window : globalThis);
