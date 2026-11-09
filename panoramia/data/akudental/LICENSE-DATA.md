# AKUDENTAL — data licence and attribution

The JPEG files in `full/`, the manifests in this folder and the embedded subset in
`src/66-opendata-data.js` are derived from the **AKUDENTAL** dataset:

> Öz M, Şengül A, Hatipoğlu M, Danışman T. AKUDENTAL teeth instance segmentation dataset:
> a cross-dataset analysis. *BMC Oral Health*. 2026;26. doi:10.1186/s12903-025-07645-0

Source repository: https://github.com/melihoz/AKUDENTAL — commit `92e2cc3ae5eebc9de509311a3edefb7106fca7dd`.

Licence stated by the dataset authors: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0
International (CC BY-NC-SA 4.0)** — the data are available for non-commercial academic research.
In accordance with the share-alike term, these derived files are distributed under the same licence.

Changes made here (no other modification):

* images converted to 8-bit grayscale and downscaled to 1400 px wide (LANCZOS), saved as JPEG quality 78;
* annotation coordinates rescaled to the new pixel size; polygons rounded to integers;
* COCO categories mapped to `teeth` (FDI number), `implant`, `bridge`, `filling_crown`;
* a list of FDI positions with no labelled tooth was derived per image;
* 36 images were selected for the embedded subset by the deterministic rules in `tools/curate_akudental.py`.

Ethics, as reported in the article: Akdeniz University Clinical Research Ethical Committee (KAEK-72),
retrospective design, anonymised images, informed consent waived.

Non-commercial means exactly that: this material may be used for teaching and research, not inside a
paid product or service.
