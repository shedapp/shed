/* PanoramIA — controlled vocabularies: finding taxonomy, FDI teeth, provinces, classifications.
 * Finding labels describe radiographic appearance, not histological diagnosis. Every entry
 * carries a short teaching description in Spanish and English. */
(function (root) {
  'use strict';

  // [es, en]
  var TAXONOMY_VERSION = '0.2.0';
  var GROUPS = {
    DEN: { name: ['Hallazgos dentales', 'Dental findings'], color: 'g1', hex: '#4FC3F7' },
    SUR: { name: ['Signos de riesgo preextracción', 'Pre-extraction risk signs'], color: 'g2', hex: '#80DEEA' },
    JAW: { name: ['Lesiones de los maxilares (patrón radiográfico)', 'Jaw lesions (radiographic pattern)'], color: 'g3', hex: '#40C4FF' },
    INC: { name: ['Hallazgos incidentales no dentales', 'Non-dental incidental findings'], color: 'g4', hex: '#C5E1A5' },
    QA: { name: ['Calidad de imagen', 'Image quality'], color: 'g5', hex: '#B0BEC5' },
    ANA: { name: ['Estructuras anatómicas (referencia para el semáforo)', 'Anatomical structures (reference for the traffic light)'], color: 'g6', hex: '#8FD3FF', anatomy: true },
    MEA: { name: ['Mediciones', 'Measurements'], color: 'g7', hex: '#FFFFFF', measure: true }
  };
  // Shape vocabulary: rect | polygon | polyline | line | point. `shapes` lists the recommended ones for a code.
  var SHAPE_NAMES = { rect: ['Rectángulo', 'Rectangle'], polygon: ['Polígono', 'Polygon'], free: ['Trazo libre', 'Freehand'], polyline: ['Línea quebrada', 'Polyline'], line: ['Línea', 'Line'], point: ['Punto', 'Point'] };

  var FINDINGS = [
    // ---- Dental ----
    { code: 'DEN-CAR', group: 'DEN', tooth: true, color: '#7986CB', quick: true, name: ['Caries', 'Caries'],
      desc: ['Radiolucidez en esmalte o dentina, típicamente en superficies proximales u oclusales. En panorámica la sensibilidad es baja; confirmar con aleta de mordida.', 'Radiolucency in enamel or dentin, typically on proximal or occlusal surfaces. Panoramic sensitivity is low; confirm with bitewings.'] },
    { code: 'DEN-DCAR', group: 'DEN', tooth: true, color: '#3F51B5', name: ['Caries profunda (cerca de pulpa)', 'Deep caries (near pulp)'],
      desc: ['Radiolucidez que alcanza el tercio interno de la dentina o contacta la cámara pulpar.', 'Radiolucency reaching the inner third of dentin or contacting the pulp chamber.'] },
    { code: 'DEN-PAR', group: 'DEN', tooth: true, color: '#EF5350', quick: true, name: ['Radiolucidez periapical', 'Periapical radiolucency'],
      desc: ['Área radiolúcida en el ápice con pérdida de la lámina dura; sugiere periodontitis apical, granuloma o quiste radicular. El diagnóstico definitivo es histológico.', 'Radiolucent area at the apex with loss of lamina dura; suggests apical periodontitis, granuloma or radicular cyst. Definitive diagnosis is histological.'] },
    { code: 'DEN-PBL', group: 'DEN', tooth: true, color: '#FFAB91', quick: true, name: ['Pérdida ósea periodontal', 'Periodontal bone loss'],
      desc: ['Cresta alveolar más de 2 mm apical a la unión amelocementaria; horizontal o vertical (angular).', 'Alveolar crest more than 2 mm apical to the cemento-enamel junction; horizontal or vertical (angular).'] },
    { code: 'DEN-RES', group: 'DEN', tooth: true, color: '#A1887F', quick: true, name: ['Reabsorción radicular', 'Root resorption'],
      desc: ['Acortamiento o irregularidad del contorno radicular (externa) o ensanchamiento del conducto (interna).', 'Shortening or irregularity of the root outline (external) or widening of the canal (internal).'] },
    { code: 'DEN-ROOT', group: 'DEN', tooth: true, color: '#BCAAA4', quick: true, name: ['Resto radicular', 'Retained root fragment'],
      desc: ['Fragmento radicular sin corona, con o sin lesión periapical asociada.', 'Root fragment without a crown, with or without an associated periapical lesion.'] },
    { code: 'DEN-IMP', group: 'DEN', tooth: true, color: '#CE93D8', quick: true, name: ['Diente retenido o impactado', 'Impacted or unerupted tooth'],
      desc: ['Diente que no ha erupcionado en su posición esperada; registrar angulación y profundidad si es un tercer molar.', 'Tooth that has not erupted into its expected position; record angulation and depth if it is a third molar.'] },
    { code: 'DEN-SUP', group: 'DEN', tooth: false, color: '#BA68C8', name: ['Diente supernumerario', 'Supernumerary tooth'],
      desc: ['Diente adicional a la fórmula normal; el mesiodens en la línea media superior es el más frecuente.', 'Tooth in excess of the normal formula; the midline mesiodens is the most common.'] },
    { code: 'DEN-MIS', group: 'DEN', tooth: true, color: '#9E9E9E', dashed: true, quick: true, name: ['Ausencia dental (agenesia o pérdida)', 'Missing tooth (agenesis or loss)'],
      desc: ['Diente ausente; distinguir agenesia (sin germen) de pérdida (alveolo cicatrizado).', 'Absent tooth; distinguish agenesis (no germ) from loss (healed socket).'] },
    { code: 'DEN-RCT', group: 'DEN', tooth: true, color: '#A5D6A7', quick: true, name: ['Tratamiento de conducto', 'Root canal treatment'],
      desc: ['Material radiopaco en el conducto; registrar si es corto, largo o con conductos no tratados.', 'Radiopaque filling in the canal; record whether short, long or with untreated canals.'] },
    { code: 'DEN-FIL', group: 'DEN', tooth: true, color: '#4DB6AC', quick: true, name: ['Obturación coronal', 'Coronal filling'],
      desc: ['Material restaurador radiopaco (amalgama, composite radiopaco, ionómero) limitado a la corona; valorar márgenes desbordantes y caries secundaria.', 'Radiopaque restorative material (amalgam, radiopaque composite, ionomer) confined to the crown; assess overhanging margins and secondary caries.'] },
    { code: 'DEN-CRN', group: 'DEN', tooth: true, color: '#FFA726', quick: true, name: ['Corona', 'Crown'],
      desc: ['Cobertura coronal completa radiopaca (metal, metal-cerámica) o levemente radiopaca (cerámica); valorar ajuste marginal y caries bajo el margen.', 'Full radiopaque (metal, metal-ceramic) or faintly radiopaque (ceramic) coronal coverage; assess marginal fit and caries beneath the margin.'] },
    { code: 'DEN-BRG', group: 'DEN', tooth: true, color: '#F06292', quick: true, name: ['Puente o póntico', 'Bridge or pontic'],
      desc: ['Prótesis fija: pilares coronados unidos por un póntico sobre un espacio edéntulo; marcar cada pilar y el póntico por separado.', 'Fixed prosthesis: crowned abutments joined by a pontic over an edentulous space; mark each abutment and the pontic separately.'] },
    { code: 'DEN-POST', group: 'DEN', tooth: true, color: '#9CCC65', quick: true, name: ['Poste o perno intrarradicular', 'Intraradicular post'],
      desc: ['Elemento radiopaco cilíndrico o cónico dentro del conducto, generalmente bajo una corona; valorar longitud y perforaciones.', 'Cylindrical or tapered radiopaque element inside the canal, usually beneath a crown; assess length and perforations.'] },
    { code: 'DEN-RST', group: 'DEN', tooth: true, color: '#80CBC4', name: ['Restauración o corona (sin especificar)', 'Restoration or crown (unspecified)'],
      desc: ['Material restaurador radiopaco sin distinguir obturación de corona; usado para etiquetas externas que no separan ambas. Prefiera los códigos específicos.', 'Radiopaque restorative material without distinguishing filling from crown; used for external labels that do not separate them. Prefer the specific codes.'] },
    { code: 'DEN-PAO', group: 'DEN', tooth: true, color: '#FFCA28', quick: true, name: ['Radiopacidad periapical', 'Periapical radiopacity'],
      desc: ['Aumento de densidad ósea alrededor del ápice; sugiere osteítis condensante (diente con pulpa inflamada o necrótica), displasia cemento-ósea periapical o cementoblastoma.', 'Increased bone density around the apex; suggests condensing osteitis (tooth with inflamed or necrotic pulp), periapical cemento-osseous dysplasia or cementoblastoma.'] },
    { code: 'DEN-PDL', group: 'DEN', tooth: true, color: '#F8BBD0', name: ['Ensanchamiento del espacio del ligamento', 'Widened periodontal ligament space'],
      desc: ['Banda radiolúcida periradicular más ancha de lo normal; trauma oclusal, periodontitis apical incipiente o, si es generalizado, descartar enfermedad sistémica o maligna.', 'Periradicular radiolucent band wider than normal; occlusal trauma, early apical periodontitis or, when generalised, exclude systemic or malignant disease.'] },
    { code: 'DEN-FRX', group: 'DEN', tooth: true, color: '#FFFFFF', quick: true, name: ['Fractura dental o radicular', 'Tooth or root fracture'],
      desc: ['Línea radiolúcida que atraviesa corona o raíz, o escalón en el contorno; la panorámica solo detecta fracturas en el plano del haz.', 'Radiolucent line crossing crown or root, or a step in the outline; panoramic imaging detects only fractures in the plane of the beam.'] },
    { code: 'DEN-RLU', group: 'DEN', tooth: true, color: '#00E5FF', name: ['Radiolucidez dental anormal (no clasificada)', 'Abnormal dental radiolucency (unclassified)'],
      desc: ['Área radiolúcida en corona o raíz que no encaja en caries, reabsorción ni lesión periapical; describir en la nota.', 'Radiolucent area in crown or root that does not fit caries, resorption or a periapical lesion; describe in the note.'] },
    { code: 'DEN-ROP', group: 'DEN', tooth: true, color: '#FFF176', name: ['Radiopacidad dental anormal (no clasificada)', 'Abnormal dental radiopacity (unclassified)'],
      desc: ['Densidad aumentada en corona, raíz o pulpa (pulpolito, cálculo pulpar) que no corresponde a restauración; describir en la nota.', 'Increased density in crown, root or pulp (pulp stone) not attributable to a restoration; describe in the note.'] },
    { code: 'DEN-IMPL', group: 'DEN', tooth: true, color: '#B39DDB', quick: true, name: ['Implante dental', 'Dental implant'],
      desc: ['Implante endoóseo; valorar nivel óseo marginal y relación con conducto o seno.', 'Endosseous implant; assess marginal bone level and relationship to canal or sinus.'] },
    { code: 'DEN-CALC', group: 'DEN', tooth: true, color: '#E0E0E0', name: ['Cálculo', 'Calculus'],
      desc: ['Espículas radiopacas en superficies proximales a nivel cervical.', 'Radiopaque spurs on proximal surfaces at the cervical level.'] },
    // ---- Pre-extraction risk signs ----
    { code: 'SUR-RS-DARK', group: 'SUR', tooth: true, name: ['Rood: oscurecimiento radicular', 'Rood: darkening of the root'],
      desc: ['Banda radiolúcida que cruza la raíz donde la superpone el conducto; uno de los tres signos asociados a lesión nerviosa (Rood y Shehab, 1990).', 'Radiolucent band across the root where the canal crosses it; one of the three signs associated with nerve injury (Rood and Shehab, 1990).'] },
    { code: 'SUR-RS-DEFL', group: 'SUR', tooth: true, name: ['Rood: desviación radicular', 'Rood: deflection of the root'],
      desc: ['Cambio brusco de dirección de la raíz al contactar el conducto.', 'Abrupt change in root direction where it meets the canal.'] },
    { code: 'SUR-RS-NARR', group: 'SUR', tooth: true, name: ['Rood: estrechamiento radicular', 'Rood: narrowing of the root'],
      desc: ['Reducción del ancho radicular a la altura del conducto.', 'Reduction in root width at the level of the canal.'] },
    { code: 'SUR-RS-BIFID', group: 'SUR', tooth: true, name: ['Rood: ápice oscuro y bífido', 'Rood: dark and bifid apex'],
      desc: ['Ápice radicular con doble contorno y zona oscura.', 'Root apex with double outline and dark zone.'] },
    { code: 'SUR-RS-INT', group: 'SUR', tooth: true, name: ['Rood: interrupción de la línea blanca', 'Rood: interruption of the white line'],
      desc: ['Pérdida de las corticales radiopacas del conducto al cruzar la raíz; signo de alto riesgo.', 'Loss of the radiopaque cortical lines of the canal where it crosses the root; high-risk sign.'] },
    { code: 'SUR-RS-DIV', group: 'SUR', tooth: true, name: ['Rood: desviación del conducto', 'Rood: diversion of the canal'],
      desc: ['Cambio de trayecto del conducto dentario inferior al pasar por la raíz; signo de alto riesgo.', 'Change in the course of the inferior alveolar canal as it passes the root; high-risk sign.'] },
    { code: 'SUR-RS-CAN', group: 'SUR', tooth: true, name: ['Rood: estrechamiento del conducto', 'Rood: narrowing of the canal'],
      desc: ['Reducción del diámetro del conducto donde se relaciona con la raíz.', 'Reduction of the canal diameter where it relates to the root.'] },
    { code: 'SUR-DIL', group: 'SUR', tooth: true, name: ['Dilaceración radicular', 'Root dilaceration'],
      desc: ['Curvatura marcada de la raíz; aumenta el riesgo de fractura radicular durante la extracción.', 'Marked root curvature; raises the risk of root fracture during extraction.'] },
    { code: 'SUR-HYP', group: 'SUR', tooth: true, name: ['Hipercementosis', 'Hypercementosis'],
      desc: ['Raíz engrosada y bulbosa por depósito de cemento, con espacio del ligamento conservado.', 'Thickened, bulbous root from cementum deposition, with a preserved ligament space.'] },
    { code: 'SUR-ANK', group: 'SUR', tooth: true, name: ['Sospecha de anquilosis', 'Suspected ankylosis'],
      desc: ['Ausencia focal del espacio del ligamento periodontal con fusión aparente hueso-raíz.', 'Focal absence of the periodontal ligament space with apparent bone-root fusion.'] },
    { code: 'SUR-SIN', group: 'SUR', tooth: true, name: ['Proximidad al seno maxilar', 'Proximity to the maxillary sinus'],
      desc: ['Raíces en contacto con el piso sinusal o proyectadas dentro del seno; riesgo de comunicación bucosinusal.', 'Roots in contact with the sinus floor or projecting into the sinus; risk of oroantral communication.'] },
    { code: 'SUR-DENS', group: 'SUR', tooth: true, name: ['Hueso denso o esclerótico', 'Dense or sclerotic bone'],
      desc: ['Aumento de la radiopacidad del hueso alrededor del diente, sin lesión definida.', 'Increased radiopacity of the bone around the tooth, without a defined lesion.'] },
    // ---- Jaw lesions ----
    { code: 'JAW-UNI', group: 'JAW', tooth: false, name: ['Radiolucidez unilocular bien definida', 'Well-defined unilocular radiolucency'],
      desc: ['Área radiolúcida única con margen cortical nítido. Diferencial: quiste dentígero (alrededor de una corona), queratoquiste, quiste radicular, ameloblastoma unilocular. Requiere histología.', 'Single radiolucent area with a sharp cortical margin. Differential: dentigerous cyst (around a crown), keratocyst, radicular cyst, unicystic ameloblastoma. Requires histology.'] },
    { code: 'JAW-MUL', group: 'JAW', tooth: false, name: ['Radiolucidez multilocular', 'Multilocular radiolucency'],
      desc: ['Radiolucidez con tabiques internos (pompas de jabón, panal). Diferencial: ameloblastoma, queratoquiste, lesión central de células gigantes, mixoma.', 'Radiolucency with internal septa (soap-bubble, honeycomb). Differential: ameloblastoma, keratocyst, central giant-cell lesion, myxoma.'] },
    { code: 'JAW-OPA', group: 'JAW', tooth: false, name: ['Radiopacidad bien definida', 'Well-defined radiopacity'],
      desc: ['Masa radiopaca homogénea. Diferencial: osteosclerosis idiopática (sin halo), odontoma, cementoblastoma, osteoma.', 'Homogeneous radiopaque mass. Differential: idiopathic osteosclerosis (no halo), odontoma, cementoblastoma, osteoma.'] },
    { code: 'JAW-MIX', group: 'JAW', tooth: false, name: ['Lesión mixta (radiolúcida-radiopaca)', 'Mixed radiolucent-radiopaque lesion'],
      desc: ['Densidad mixta. Diferencial: displasia cemento-ósea, odontoma en formación, fibroma osificante, osteomielitis.', 'Mixed density. Differential: cemento-osseous dysplasia, developing odontoma, ossifying fibroma, osteomyelitis.'] },
    { code: 'JAW-ILL', group: 'JAW', tooth: false, name: ['Lesión mal definida o destructiva', 'Ill-defined or destructive lesion'],
      desc: ['Márgenes irregulares, destrucción cortical, dientes flotantes o ensanchamiento del ligamento: descartar malignidad u osteomielitis con urgencia.', 'Irregular margins, cortical destruction, floating teeth or ligament widening: urgently exclude malignancy or osteomyelitis.'] },
    { code: 'JAW-PERI', group: 'JAW', tooth: true, name: ['Radiolucidez pericoronal mayor de 3 mm', 'Pericoronal radiolucency larger than 3 mm'],
      desc: ['Espacio folicular ensanchado alrededor de la corona de un diente retenido; sospecha de quiste dentígero.', 'Widened follicular space around the crown of an unerupted tooth; suspicion of dentigerous cyst.'] },
    { code: 'JAW-RLU', group: 'JAW', tooth: false, color: '#82B1FF', name: ['Radiolucidez ósea anormal (no clasificada)', 'Abnormal bone radiolucency (unclassified)'],
      desc: ['Área radiolúcida en el hueso que aún no se puede encuadrar en un patrón (unilocular, multilocular, mal definida); delimitarla y describirla; reclasificar tras la adjudicación.', 'Radiolucent bone area that cannot yet be placed in a pattern (unilocular, multilocular, ill-defined); outline and describe it; reclassify after adjudication.'] },
    { code: 'JAW-ROP', group: 'JAW', tooth: false, color: '#BBDEFB', name: ['Radiopacidad ósea anormal (no clasificada)', 'Abnormal bone radiopacity (unclassified)'],
      desc: ['Área radiopaca en el hueso sin patrón definido; delimitarla y describirla; reclasificar tras la adjudicación.', 'Radiopaque bone area without a defined pattern; outline and describe it; reclassify after adjudication.'] },
    // ---- Non-dental incidental ----
    { code: 'INC-CAC', group: 'INC', tooth: false, name: ['Calcificación de la arteria carótida', 'Carotid artery calcification'],
      desc: ['Radiopacidad nodular o lineal posteroinferior al ángulo mandibular, a la altura de C3-C4 (bifurcación carotídea). Diferencial: cartílago tritíceo, asta del tiroides, hioides. Amerita evaluación médica cardiovascular.', 'Nodular or linear radiopacity posteroinferior to the mandibular angle, at the C3-C4 level (carotid bifurcation). Differential: triticeous cartilage, thyroid cornu, hyoid. Warrants medical cardiovascular assessment.'] },
    { code: 'INC-ESP', group: 'INC', tooth: false, name: ['Apófisis estiloides elongada', 'Elongated styloid process'],
      desc: ['Estiloides mayor de unos 30 mm o ligamento estilohioideo calcificado; relevante si hay síntomas (síndrome de Eagle).', 'Styloid longer than about 30 mm or calcified stylohyoid ligament; relevant when symptomatic (Eagle syndrome).'] },
    { code: 'INC-SIA', group: 'INC', tooth: false, name: ['Sialolito', 'Sialolith'],
      desc: ['Radiopacidad en el trayecto de la glándula submandibular o su conducto, con frecuencia superpuesta al cuerpo mandibular.', 'Radiopacity along the submandibular gland or its duct, often superimposed on the mandibular body.'] },
    { code: 'INC-TON', group: 'INC', tooth: false, name: ['Tonsilolito', 'Tonsillolith'],
      desc: ['Pequeñas radiopacidades múltiples superpuestas a la rama mandibular a la altura de la orofaringe.', 'Small multiple radiopacities superimposed on the ramus at the level of the oropharynx.'] },
    { code: 'INC-SIN', group: 'INC', tooth: false, name: ['Opacificación o engrosamiento mucoso del seno', 'Sinus opacification or mucosal thickening'],
      desc: ['Velamiento parcial o total del seno maxilar o banda de engrosamiento mucoso; correlacionar con clínica.', 'Partial or total opacification of the maxillary sinus or a band of mucosal thickening; correlate clinically.'] },
    { code: 'INC-APC', group: 'INC', tooth: false, name: ['Pseudoquiste antral', 'Antral pseudocyst'],
      desc: ['Masa en cúpula, homogénea y levemente radiopaca sobre el piso del seno; habitualmente asintomático y sin tratamiento.', 'Dome-shaped, homogeneous, slightly radiopaque mass on the sinus floor; usually asymptomatic and needs no treatment.'] },
    { code: 'INC-TMJ', group: 'INC', tooth: false, name: ['Cambio morfológico condilar', 'Condylar morphology change'],
      desc: ['Aplanamiento, osteofitos, erosiones o asimetría de los cóndilos; correlacionar con síntomas articulares.', 'Flattening, osteophytes, erosions or asymmetry of the condyles; correlate with joint symptoms.'] },
    { code: 'INC-MCI', group: 'INC', tooth: false, name: ['Cortical mandibular adelgazada o porosa', 'Thin or porous mandibular cortex'],
      desc: ['Índice cortical mandibular (Klemetti) C2 o C3: defectos semilunares o cortical muy porosa; marcador de baja densidad ósea que amerita evaluación médica.', 'Mandibular cortical index (Klemetti) C2 or C3: semilunar defects or heavily porous cortex; a marker of low bone density that warrants medical assessment.'] },
    { code: 'INC-FB', group: 'INC', tooth: false, name: ['Cuerpo extraño', 'Foreign body'],
      desc: ['Radiopacidad de forma artificial (fragmento metálico, material de obturación extruido, piercing).', 'Artificially shaped radiopacity (metal fragment, extruded filling material, piercing).'] },
    { code: 'INC-OTH', group: 'INC', tooth: false, name: ['Otro hallazgo incidental', 'Other incidental finding'],
      desc: ['Describir en la nota.', 'Describe in the note.'] },
    // ---- Image quality ----
    { code: 'QA-POS', group: 'QA', tooth: false, name: ['Error de posicionamiento', 'Positioning error'],
      desc: ['Dientes anteriores borrosos o magnificados, plano oclusal muy curvo o plano, asimetría de ramas.', 'Blurred or magnified anterior teeth, exaggerated or flat occlusal plane, asymmetric rami.'] },
    { code: 'QA-MOT', group: 'QA', tooth: false, name: ['Movimiento', 'Motion'],
      desc: ['Borrosidad o escalón vertical por movimiento del paciente durante la exposición.', 'Blurring or a vertical step from patient movement during exposure.'] },
    { code: 'QA-GHO', group: 'QA', tooth: false, name: ['Imagen fantasma o artefacto', 'Ghost image or artefact'],
      desc: ['Imagen duplicada, borrosa y magnificada del lado opuesto (pendientes, prótesis); lengua no apoyada en el paladar produce banda radiolúcida.', 'Duplicated, blurred and magnified image from the opposite side (earrings, dentures); tongue not against the palate produces a radiolucent band.'] },
    { code: 'QA-CUT', group: 'QA', tooth: false, name: ['Anatomía cortada', 'Cut-off anatomy'],
      desc: ['Cóndilos, ramas o región anterior fuera del campo.', 'Condyles, rami or anterior region outside the field.'] },
    { code: 'QA-EXP', group: 'QA', tooth: false, name: ['Exposición inadecuada', 'Inadequate exposure'],
      desc: ['Imagen muy clara o muy oscura con pérdida de detalle.', 'Image too light or too dark with loss of detail.'] },
    { code: 'QA-NDX', group: 'QA', tooth: false, name: ['No diagnóstica', 'Non-diagnostic'],
      desc: ['La imagen no permite la evaluación para la que fue tomada; repetir.', 'The image does not allow the evaluation it was taken for; repeat.'] },
    // ---- Anatomical structures (not findings: reference geometry for the traffic light and teaching) ----
    { code: 'ANA-IAC', group: 'ANA', tooth: false, sided: true, shapes: ['polyline'], color: '#FF1744', name: ['Conducto dentario inferior (canal mandibular)', 'Inferior alveolar canal (mandibular canal)'],
      desc: ['Trace el trayecto del conducto siguiendo sus dos corticales radiopacas, desde la língula hasta el agujero mentoniano. El semáforo mide su relación con las raíces del tercer molar.', 'Trace the canal along its two radiopaque cortical lines, from the lingula to the mental foramen. The traffic light measures its relation to the third-molar roots.'] },
    { code: 'ANA-MF', group: 'ANA', tooth: false, sided: true, shapes: ['point'], color: '#FF1744', name: ['Agujero mentoniano', 'Mental foramen'],
      desc: ['Radiolucidez redondeada entre los ápices de los premolares; no confundir con lesión periapical.', 'Round radiolucency between the premolar apices; do not mistake it for a periapical lesion.'] },
    { code: 'ANA-SIN', group: 'ANA', tooth: false, sided: true, shapes: ['polygon', 'polyline'], color: '#40C4FF', name: ['Seno maxilar (contorno o piso)', 'Maxillary sinus (outline or floor)'],
      desc: ['Delimite el seno o al menos su piso cortical. El semáforo comprueba si las raíces de molares superiores se proyectan dentro.', 'Outline the sinus or at least its cortical floor. The traffic light checks whether upper molar roots project into it.'] },
    { code: 'ANA-NAS', group: 'ANA', tooth: false, sided: false, shapes: ['polyline'], color: '#18FFFF', name: ['Piso de las fosas nasales', 'Nasal floor'],
      desc: ['Línea radiopaca horizontal sobre los ápices de los incisivos superiores.', 'Horizontal radiopaque line above the upper incisor apices.'] },
    { code: 'ANA-RAM', group: 'ANA', tooth: false, sided: true, shapes: ['line'], color: '#E040FB', name: ['Borde anterior de la rama mandibular', 'Anterior border of the mandibular ramus'],
      desc: ['Línea que sigue el borde anterior de la rama a la altura de la corona del tercer molar. Permite sugerir la clase de Pell y Gregory (I, II, III).', 'Line along the anterior ramus border at the level of the third-molar crown. Lets the app suggest the Pell and Gregory class (I, II, III).'] },
    { code: 'ANA-OCC', group: 'ANA', tooth: false, sided: true, shapes: ['line'], color: '#76FF03', name: ['Plano oclusal', 'Occlusal plane'],
      desc: ['Línea sobre las superficies oclusales de los molares del lado evaluado. Permite sugerir la posición A, B o C de Pell y Gregory junto con la línea cervical.', 'Line along the molar occlusal surfaces of the side being assessed. With the cervical line it lets the app suggest Pell and Gregory position A, B or C.'] },
    { code: 'ANA-CEJ', group: 'ANA', tooth: false, sided: true, shapes: ['line'], color: '#FF80AB', name: ['Línea cervical del segundo molar', 'Cervical line of the second molar'],
      desc: ['Línea que une las uniones amelocementarias del segundo molar adyacente al tercer molar evaluado.', 'Line joining the cemento-enamel junctions of the second molar adjacent to the third molar being assessed.'] },
    { code: 'ANA-TTH', group: 'ANA', tooth: true, sided: false, shapes: ['polygon'], color: '#FFEE58', name: ['Contorno dental', 'Tooth outline'],
      desc: ['Polígono que delimita todo el diente (corona y raíces). Con los contornos del segundo y tercer molar el semáforo calcula el ángulo de Winter y la posición respecto al conducto o al seno.', 'Polygon outlining the whole tooth (crown and roots). With the second- and third-molar outlines the traffic light computes the Winter angle and the position relative to the canal or sinus.'] },
    { code: 'ANA-CRE', group: 'ANA', tooth: false, sided: true, shapes: ['polyline'], color: '#FFD180', name: ['Cresta ósea alveolar', 'Alveolar bone crest'],
      desc: ['Línea de la cresta ósea interproximal; referencia para pérdida ósea periodontal.', 'Interproximal bone crest line; reference for periodontal bone loss.'] },
    { code: 'ANA-MBD', group: 'ANA', tooth: false, sided: true, shapes: ['polyline'], color: '#B0BEC5', name: ['Borde inferior de la mandíbula', 'Inferior border of the mandible'],
      desc: ['Cortical basal; referencia para el índice cortical mandibular y para fracturas.', 'Basal cortex; reference for the mandibular cortical index and for fractures.'] },
    { code: 'ANA-OTH', group: 'ANA', tooth: false, sided: false, shapes: ['polygon', 'polyline', 'line', 'point', 'rect'], color: '#CFD8DC', name: ['Otra estructura anatómica', 'Other anatomical structure'],
      desc: ['Describir en la nota (por ejemplo cóndilo, apófisis coronoides, hioides, tuberosidad).', 'Describe in the note (for example condyle, coronoid process, hyoid, tuberosity).'] },
    // ---- Measurements ----
    { code: 'MEA-LIN', group: 'MEA', tooth: false, sided: false, shapes: ['line'], color: '#FFFFFF', name: ['Medición lineal', 'Linear measurement'],
      desc: ['Distancia entre dos puntos. Se muestra en milímetros solo si la imagen está calibrada (espaciado de píxel DICOM o calibración manual); en panorámicas la magnificación (≈1,2–1,3×) no se corrige.', 'Distance between two points. Shown in millimetres only when the image is calibrated (DICOM pixel spacing or manual calibration); on panoramics the magnification (≈1.2–1.3×) is not corrected.'] }
  ];

  var FINDING_BY_CODE = {};
  FINDINGS.forEach(function (f) { FINDING_BY_CODE[f.code] = f; });
  function colorOf(code) { var f = FINDING_BY_CODE[code]; if (f && f.color) return f.color; var g = f ? GROUPS[f.group] : null; return (g && g.hex) || '#B0BEC5'; }
  function isAnatomy(code) { var f = FINDING_BY_CODE[code]; return !!(f && GROUPS[f.group] && GROUPS[f.group].anatomy); }
  function isMeasure(code) { var f = FINDING_BY_CODE[code]; return !!(f && GROUPS[f.group] && GROUPS[f.group].measure); }
  /** True for codes that count as clinical findings (not anatomy, not measurements). */
  function isFinding(code) { return !!FINDING_BY_CODE[code] && !isAnatomy(code) && !isMeasure(code); }
  function shapesFor(code) { var f = FINDING_BY_CODE[code]; return (f && f.shapes) || ['rect', 'polygon', 'free', 'polyline', 'line', 'point']; }
  var QUICK_CODES = FINDINGS.filter(function (f) { return f.quick; }).map(function (f) { return f.code; });
  var ANATOMY_CODES = FINDINGS.filter(function (f) { return f.group === 'ANA'; }).map(function (f) { return f.code; });

  var TOOTH_NAMES = {
    1: ['Incisivo central', 'Central incisor'], 2: ['Incisivo lateral', 'Lateral incisor'], 3: ['Canino', 'Canine'],
    4: ['Primer premolar', 'First premolar'], 5: ['Segundo premolar', 'Second premolar'], 6: ['Primer molar', 'First molar'],
    7: ['Segundo molar', 'Second molar'], 8: ['Tercer molar', 'Third molar']
  };
  var PRIMARY_TOOTH_NAMES = {
    1: ['Incisivo central temporal', 'Primary central incisor'], 2: ['Incisivo lateral temporal', 'Primary lateral incisor'],
    3: ['Canino temporal', 'Primary canine'], 4: ['Primer molar temporal', 'Primary first molar'], 5: ['Segundo molar temporal', 'Primary second molar']
  };
  var QUADRANTS = {
    1: ['Superior derecho', 'Upper right'], 2: ['Superior izquierdo', 'Upper left'], 3: ['Inferior izquierdo', 'Lower left'], 4: ['Inferior derecho', 'Lower right'],
    5: ['Superior derecho (temporal)', 'Upper right (primary)'], 6: ['Superior izquierdo (temporal)', 'Upper left (primary)'], 7: ['Inferior izquierdo (temporal)', 'Lower left (primary)'], 8: ['Inferior derecho (temporal)', 'Lower right (primary)']
  };

  function toothName(fdi, lang) {
    var n = parseInt(fdi, 10); if (isNaN(n)) return '';
    var q = Math.floor(n / 10), p = n % 10, li = lang === 'en' ? 1 : 0;
    var names = q >= 5 ? PRIMARY_TOOTH_NAMES : TOOTH_NAMES;
    if (!names[p] || !QUADRANTS[q]) return '';
    return names[p][li] + ' ' + (lang === 'en' ? '' : '') + QUADRANTS[q][li].toLowerCase();
  }

  var PROVINCES = [
    'Azua', 'Baoruco', 'Barahona', 'Dajabón', 'Distrito Nacional', 'Duarte', 'El Seibo', 'Elías Piña', 'Espaillat', 'Hato Mayor',
    'Hermanas Mirabal', 'Independencia', 'La Altagracia', 'La Romana', 'La Vega', 'María Trinidad Sánchez', 'Monseñor Nouel',
    'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'San Cristóbal', 'San José de Ocoa',
    'San Juan', 'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde'
  ];

  var MODALITIES = [
    { id: 'PAN', name: ['Panorámica', 'Panoramic'], dicom: ['PX'] },
    { id: 'PA', name: ['Periapical', 'Periapical'], dicom: ['IO'] },
    { id: 'BW', name: ['Aleta de mordida', 'Bitewing'], dicom: [] },
    { id: 'CEPH', name: ['Cefalometría lateral', 'Lateral cephalogram'], dicom: [] },
    { id: 'CBCT', name: ['CBCT (corte exportado)', 'CBCT (exported slice)'], dicom: ['CT'] },
    { id: 'OTHER', name: ['Otra', 'Other'], dicom: [] }
  ];

  var AGE_BANDS = ['0-11', '12-17', '18-29', '30-44', '45-59', '60-74', '75+'];
  var SEXES = [{ id: 'F', name: ['Femenino', 'Female'] }, { id: 'M', name: ['Masculino', 'Male'] }, { id: 'O', name: ['Otro', 'Other'] }, { id: 'U', name: ['No registrado', 'Not recorded'] }];
  var CONSENT = [
    { id: 'prospective', name: ['Consentimiento informado prospectivo', 'Prospective informed consent'] },
    { id: 'retrospective', name: ['Uso retrospectivo anonimizado con aprobación ética', 'Retrospective de-identified use with ethics approval'] },
    { id: 'synthetic', name: ['Imagen sintética (no es un paciente)', 'Synthetic image (not a patient)'] },
    { id: 'open', name: ['Conjunto de datos publicado con licencia abierta (no comercial)', 'Published open-licence dataset (non-commercial)'] },
    { id: 'unknown', name: ['Desconocido (cuarentena)', 'Unknown (quarantine)'] }
  ];
  var QUALITY = [
    { id: 'diagnostic', name: ['Diagnóstica', 'Diagnostic'] },
    { id: 'limited', name: ['Limitada', 'Limited'] },
    { id: 'nondiagnostic', name: ['No diagnóstica', 'Non-diagnostic'] }
  ];
  var CONFIDENCE = [
    { id: 'certain', name: ['Seguro', 'Certain'] },
    { id: 'probable', name: ['Probable', 'Probable'] },
    { id: 'possible', name: ['Posible', 'Possible'] }
  ];
  var READERS = [
    { id: 'R1', name: ['Lector 1', 'Reader 1'] },
    { id: 'R2', name: ['Lector 2', 'Reader 2'] },
    { id: 'ADJ', name: ['Adjudicación (referencia)', 'Adjudication (reference)'] }
  ];
  var ROLES = [
    { id: 'student', name: ['Estudiante anotador', 'Student annotator'] },
    { id: 'faculty', name: ['Docente validador', 'Faculty validator'] },
    { id: 'steward', name: ['Custodio de datos', 'Data steward'] },
    { id: 'viewer', name: ['Observador', 'Viewer'] }
  ];

  root.PX_TAXONOMY = {
    GROUPS: GROUPS, FINDINGS: FINDINGS, FINDING_BY_CODE: FINDING_BY_CODE, TOOTH_NAMES: TOOTH_NAMES, PRIMARY_TOOTH_NAMES: PRIMARY_TOOTH_NAMES,
    QUADRANTS: QUADRANTS, toothName: toothName, PROVINCES: PROVINCES, MODALITIES: MODALITIES, AGE_BANDS: AGE_BANDS, SEXES: SEXES,
    CONSENT: CONSENT, QUALITY: QUALITY, CONFIDENCE: CONFIDENCE, READERS: READERS, ROLES: ROLES,
    VERSION: TAXONOMY_VERSION, SHAPE_NAMES: SHAPE_NAMES, colorOf: colorOf, isAnatomy: isAnatomy, isMeasure: isMeasure, isFinding: isFinding, shapesFor: shapesFor, QUICK_CODES: QUICK_CODES, ANATOMY_CODES: ANATOMY_CODES
  };
})(typeof window !== 'undefined' ? window : globalThis);
