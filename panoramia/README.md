# PanoramIA — prototype v0.3

Registro de imágenes dentales, anotación con doble lectura y docencia.
Dental imaging registry, double-read annotation and teaching aid.

Built as the technical foundation of the Dominican Republic national dental-imaging
registry project. **Educational and research use only. Not a medical device. Nothing
in this prototype diagnoses or predicts.**

## What it is

A single self-contained HTML file (`dist/index.html`, ~300 KB, no build step at runtime,
no server, no external JavaScript) that runs in any modern browser. All data stays in the
browser (IndexedDB). It contains:

| Module | What it does | Why it is here |
|---|---|---|
| Import and de-identify | Parses DICOM Part 10 (implicit / explicit VR little endian) and JPEG/PNG; keeps only a **whitelist** of technical tags; derives year, age band and sex; removes everything else including private tags and sequences; forces a pixel review step for burned-in text; refuses to store a case without a recorded legal basis. | Privacy is the product. What is not on the whitelist never reaches the registry. |
| Cases | Registry of de-identified images with pseudonym `DR-XXXX-XXXX`, site, province, device, year, age band, sex, quality, legal basis, status, calibration. | The national dataset starts here. |
| Automatic reading (v0.3, experimental) | Rule-based, not trained. From the tooth outlines (reference dataset or reader-drawn ANA-TTH) a dental atlas proposes normal anatomy (occlusal plane, mandibular canal, mental foramen, maxillary sinus, nasal floor, anterior ramus border, inferior mandibular border refined on the image). Bright blobs are classified by position (filling, crown, root canal filling, post, bridge, implant, bone radiopacity); dark enclosed blobs inside the bone zone and away from the normal dark structures become periapical or bone radiolucency proposals. Every proposal is shaded in its category colour, carries the rule that produced it, and is accepted per group or one by one into editable polygons. Measured with `tools/eval_autoread.js` on the 333 AKUDENTAL panoramics (labels only for fillings/crowns, bridges, implants): sensitivity 0.62 / 0.97 / 0.59, class accuracy when found 0.91 / 0.93 / 0.93. Measured with `tools/eval_autoread_opg.js` on the 1,525 DentalOPG-1550 panoramics (14 box classes): fillings 0.40 (exact class 0.06; 0.40 with tooth outlines), crowns 0.69, bridges 0.96, root canal fillings 0.05 (PPV 0.10), apical abscesses 0, caries 0, broken-down roots 0, impactions 0. Images are percentile-normalised first. These are the baseline a trained model must beat. | The surgeon asked for the app to mark everything, normal and abnormal; this is the honest version of that today, and the proposal → confirmation loop is how a trained model will plug in later. |
| Open datasets | Two published sets, each with a dataset card (source, licence, ethics, processing, selection) and loadable as an embedded subset or the complete set over http(s): **AKUDENTAL** (333 adult panoramics, teeth by FDI + implants/bridges/fillings, CC BY-NC-SA 4.0) and **DentalOPG-1550** (1,525 panoramics, 14 box classes incl. caries, filling, cap, bridge, root canal, apical abscess, periodontitis, broken-down root, missing teeth, impactions; CC BY 4.0, so usable in a product). DentalOPG file names carried patient names: `tools/curate_dentalopg.py` renamed every file and kept only the age; FDI numbers are estimated by position because the source has none. | Reference overlays for the whole marking palette, a commercial-licence lineage, and 1,525 more images to measure the automatic reading on. |
| Trained model (hook) | `training/train_yolo.py` trains an Ultralytics YOLO on the exported dataset (`tools/export_yolo_dataset.py`, 12 PanoramIA classes), reports per-class sensitivity/PPV at IoU 0.2 and 0.5 on the test split, exports ONNX and writes a model card. `training/PanoramIA_train_colab.ipynb` does the same end-to-end on a free Colab GPU (downloads DentalOPG-1550 from Mendeley, strips patient names, trains, exports). `tools/model_server.py` serves the ONNX model on the dentist's own computer (onnxruntime, http://127.0.0.1:8765, nothing leaves the machine); in Annotate → "Modelo entrenado" the app checks the server, shows the card's per-class numbers and merges the model's proposals with the rule-based ones for confirmation. | The path from today's rules to a validated detector: the same proposal → confirmation loop, the same metrics, and a local-first deployment. |
| Annotate | Two independent readers (R1, R2) plus an adjudicator. Shapes: rectangle, polygon, freehand, polyline, line, point. Controlled taxonomy v0.2 (70 codes: 22 dental incl. filling / crown / bridge / post / root canal / periapical radiolucency and radiopacity / fracture, pre-extraction signs, jaw patterns, incidental, quality, 11 anatomical structures, measurements), one colour per code, several marks per tooth. Marking palette arms the code and the recommended tool; its top section lists the categories already marked on the current tooth so they can be re-used without scanning the whole palette. Per-case Jaccard agreement with IoU matching on clinical findings only. | Reference labels for future AI must come from double reading with adjudication, with precise outlines and a stable vocabulary. |
| Anatomy layer | Inferior alveolar canal, mental foramen, maxillary sinus, nasal floor, anterior ramus border, occlusal plane, second-molar cervical line, tooth outlines, alveolar crest, mandibular border; side assigned from the image position. | The traffic light anchors on them. |
| Measurements | Linear measurements in px, or in mm when the case is calibrated (DICOM pixel spacing, or manual calibration against a known length). | Reports need sizes; honesty needs the calibration state shown. |
| Surgical traffic light (semáforo) | Transparent rule engine for third-molar extraction planning: Pell & Gregory, Winter, Pederson index, Rood & Shehab signs, sinus relation, pathology, systemic risk. Every result shows the rules that fired. **Geometric suggestions** computed from the outlined anatomy (Winter angle by principal axes of the molar outlines; depth A/B/C against the occlusal plane and cervical line; ramus class I/II/III against the anterior border; canal superimposition or minimum distance; sinus projection) are offered for confirmation and recorded in the checklist with their provenance. | A teaching aid that is auditable line by line, as opposed to an opaque score. |
| Structured report | Draft report built only from saved annotations, checklists and measurements in the layout used by Dominican oral-radiology reports: study data, technique, numbered general findings with sizes, "Piezas \| Hallazgos" table with absent teeth first, outlined anatomy, measurements, draft impression, final note. Copy or print. | The specialist edits and signs; the program does not interpret. |
| Experimental radiopacity detector | Intensity and local-contrast rules (not a trained model) proposing restorations, crowns, bridges and implants for confirmation; measured on the 333 AKUDENTAL panoramics: sensitivity 0.664, PPV 0.629 at IoU ≥ 0.25 (`tools/eval_detector.js`). Evaluation page re-measures it live on the loaded cases. | Shows the proposal → confirmation → evaluation loop that any future model must pass. |
| Atlas and quiz | Adjudicated cases with a recorded legal basis, filterable by category; "find the finding" quiz mode. | The educational face of the project. |
| Observatory | Population summary by category, province, age band and sex, pipeline status, quality and modality. Charts with table view. | The public-health face of the project. |
| Evaluation | Compares any model's predictions (JSON) with the adjudicated reference: TP/FP/FN/TN, prevalence, sensitivity, specificity, PPV, NPV, F1 with 95 % Wilson intervals, Mann–Whitney AUC. | The sandbox in which a future AI second reader will have to prove itself. |
| Governance | Role simulation (student / faculty / steward / viewer), legal-basis overview, audit log, JSON export/import, full erase, patient charter. | The data steward's view. |

Bilingual (Spanish default, English), light and dark theme, keyboard shortcuts, synthetic
demo dataset of 8 procedurally generated phantoms stamped **FANTOMA SINTÉTICO · NO ES UN
PACIENTE**, plus a curated subset of one **published open dataset** (below).

## Open dataset included: AKUDENTAL

To show the complete workflow on real radiographs, the app embeds 36 of the 333 images of
**AKUDENTAL** — Öz M, Şengül A, Hatipoğlu M, Danışman T. *AKUDENTAL teeth instance segmentation
dataset: a cross-dataset analysis.* BMC Oral Health 2026;26. doi:10.1186/s12903-025-07645-0.
Source repository: https://github.com/melihoz/AKUDENTAL (commit `92e2cc3`).

* 333 anonymised adult panoramic radiographs from Akdeniz University Dental Hospital (Antalya,
  Türkiye); ethics approval KAEK-72, retrospective, consent waived; per-image age and sex not
  published.
* One expert per image labelled 32 teeth by FDI number (polygons + boxes), implants, bridges and
  fillings/crowns — 9,956 instances.
* **Licence: CC BY-NC-SA 4.0** as stated by the authors — attribution, non-commercial, share-alike.
  The embedded subset and the derived manifests in `data/akudental/` are redistributed under the
  same licence. **They must not ship in a paid product.** The application code is MIT.

How the data enters the app (all of it reproducible from `tools/`):

| Step | Script | What it does |
|---|---|---|
| Curate | `tools/curate_akudental.py` | Picks 36 images by deterministic rules (8 with implants, 7 with bridges, 8 with all four third molars, 6 partially edentulous, 7 typical), converts to 8-bit grayscale, downscales to 1400 px, rescales every coordinate, lists teeth absent from the labels, writes manifests and a contact sheet for a visual burned-in-text check. Also exports the complete set to `data/akudental/full/`. |
| Embed | `tools/embed_opendata.py` | Writes `src/66-opendata-data.js` (base64 JPEG + annotations, ~5.7 MB). |
| Map | `src/67-opendata.js` | Pure functions that turn a manifest entry into PanoramIA records: case with provenance and legal basis `open`, reference findings (`DEN-IMPL`, `DEN-RST`) attributed to reader `ADJ` / `AKUDENTAL` and flagged `external`, tooth outlines for the viewer overlay. FDI of a structure is assigned only when ≥ 50 % of its box lies inside one labelled tooth box. No missing-tooth findings are invented: absent positions are listed, not boxed. |

Inside the app these cases are marked **External reference**: Reader 1 and Reader 2 are empty so
students can read blind and then compare with the published expert labels. When the app is served
over http(s) (GitHub Pages), Governance offers **Load the complete set (333 cases, ~37 MB)** from
`data/akudental/`.

Other public sets reviewed and not embedded: DENTEX (CC BY-NC-SA 4.0; Zenodo / Hugging Face) and the
Tufts Dental Database (licence agreement). Both can be imported case by case with the import wizard.

## What it deliberately does not do

* It contains **no trained AI model**. The only automatic component is the experimental radiopacity
  detector above — transparent rules with published performance, which cannot see caries or lesions.
  The AI second reader that marks every finding will be trained on data this registry produces and
  evaluated in the Evaluation module before it appears here.
* It does not send data to any server. The production system will use servers in the country
  under university custody.
* It does not authenticate users; the role selector simulates the permission model.
* It does not decode compressed DICOM (JPEG, JPEG 2000) or reconstruct CBCT volumes; it shows
  their metadata and asks for an exported slice.
* It does not do OCR on burned-in text; the redaction is manual and mandatory.

## Deploy

The repository root is a ready GitHub Pages site: `index.html` is the built app and `data/` holds the
complete AKUDENTAL set. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
`dist/index.html` is the same file for sending or opening locally (double-click; everything works
offline except the optional complete-set download).

## Repository layout

```
src/00-head.html     tokens, CSS, shell markup
src/10-i18n.js       ~300 bilingual strings  [es, en]
src/20-taxonomy.js   finding codes, provinces, modalities, consent, roles, FDI names
src/30-dicom.js      DICOM parser, whitelist de-identification, frame decoding, windowing
src/40-rubric.js     surgical traffic-light rules (rules v0.1.0)
src/45-geometry.js   planar geometry: tooth axes, Winter angle, Pell & Gregory, canal and sinus relations
src/50-metrics.js    Wilson CI, confusion metrics, AUC, Jaccard agreement
src/60-db.js         IndexedDB store with in-memory fallback
src/65-phantom.js    synthetic phantom generator and demo plan
src/66-opendata-data.js  GENERATED: embedded AKUDENTAL subset (36 images + annotations)
src/67-opendata.js   open-dataset mapping and loaders (embedded subset, remote complete set)
src/68-detector.js   experimental radiopacity detector (rules) and its object-level evaluation
src/70-core.js       state, permissions, routing, shell, charts, odontogram
src/72-viewer.js     canvas viewer (zoom, pan, window, invert, shapes: rect/polygon/freehand/polyline/line/point)
src/74-views-a.js    home, cases, import wizard
training/train_yolo.py, training/PanoramIA_train_colab.ipynb   YOLO training, evaluation, ONNX export, model card
tools/model_server.py   local ONNX inference server for the app
tools/export_yolo_dataset.py, tools/pack_images.py   dataset export; image packs for static hosting
src/69-autoread.js   automatic reading v0.3: dental atlas anatomy + classified radiopacities/radiolucencies (PX_AUTO)
src/76-views-b.js    annotate workspace (palette with "on this tooth" section, shapes, measurements, calibration, automatic-reading proposals), traffic light with geometric suggestions
src/77-report.js     structured report draft generator
src/78-views-c.js    atlas, observatory, evaluation, governance, help
src/80-boot.js       event delegation, start-up
build.py             concatenates src/ into dist/index.html
tests/make_dicom.py  generates the 9 synthetic DICOM test files in testdata/
tests/core.test.js   39 unit tests (DICOM, de-identification, rubric, metrics, open dataset, geometry, detector, taxonomy)
tests/ui.test.js     68 end-to-end checks in headless Chrome via CDP, with screenshots
tests/http.test.js   12 checks of the complete-set download when served over HTTP
tools/               dataset curation and embedding scripts
data/akudental/      complete downscaled set (333 JPEG, 1400 px) + manifests, CC BY-NC-SA 4.0
```

## Build and test

```
python3 build.py                  # -> dist/index.html
node tests/core.test.js           # unit tests
node tests/ui.test.js             # needs a Chrome/Chromium binary; writes shots/*.png
node tests/http.test.js           # serves the repo root and loads the complete set
python3 tests/make_dicom.py       # regenerate testdata/*.dcm
python3 tools/curate_akudental.py <AKUDENTAL clone> <out>   # rebuild data/ and the subset
python3 tools/embed_opendata.py <out>                       # rebuild src/66-opendata-data.js
python3 tools/eval_detector.py <out> && node tools/eval_detector.js <out>   # re-measure the detector
```

Dependencies: Python 3 (standard library only), Node 18+ (no npm packages), Chromium for the
UI tests. The application itself has no dependencies.

## Safety and privacy decisions worth knowing before you present it

1. **Whitelist, not blacklist.** The de-identifier keeps 36 named technical and acquisition tags and derives
   four (StudyDate → year, PatientBirthDate and PatientAge → age band, PatientSex → letter).
   Everything else — including every private tag and the contents of every sequence — is
   discarded before anything is written. The receipt shown at import lists each tag and its
   fate; identifying *values* are never rendered.
2. **Pixel review is mandatory.** The import cannot continue until the user confirms the
   whole image was reviewed for burned-in names, dates and record numbers. If the DICOM header
   declares `BurnedInAnnotation = YES`, the warning is explicit.
3. **No legal basis, no use.** A case whose legal basis is "unknown" is quarantined: it is
   stored for the steward but excluded from atlas, observatory, evaluation and exports.
4. **Dates are years; ages are bands; identifiers are pseudonyms.** The optional subject
   pseudonym is for an institutional honest broker, never a cédula or record number.
5. **Everything is auditable.** Every save, delete, demo load, evaluation and export is
   written to the audit log with role and actor initials.
6. **Teaching rules are cited and versioned.** The traffic light names its sources (Pell &
   Gregory 1933, Winter 1926, Pederson 1988, Rood & Shehab 1990, Klemetti 1994) and labels the
   Pederson index as a teaching aid with limited predictive validity. Geometric suggestions state
   their convention (angle thresholds, A/B/C and I/II/III definitions) and are never applied
   without the reader's confirmation.
7. **Automatic proposals are measured, labelled and confirmable.** The radiopacity detector
   publishes its sensitivity and PPV, marks accepted proposals as `probable` with provenance,
   and is re-evaluated live against the AKUDENTAL reference inside the app.

## Known limits (also shown inside the app)

Uncompressed DICOM only, first frame only; 16-bit window fixed at import; manual redaction;
no user accounts or encryption in browser storage; agreement uses per-case Jaccard, the
formal study will use kappa and per-finding analysis.

## Licence

Application code: MIT (see `LICENSE`). Embedded and bundled AKUDENTAL images and derived
annotations: CC BY-NC-SA 4.0, © the dataset authors (see `data/akudental/LICENSE-DATA.md`).
