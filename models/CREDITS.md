# Separation models

Both are UVR MDX-Net models from the Ultimate Vocal Remover project (MIT), https://github.com/Anjok07/ultimatevocalremovergui —
model files published at https://github.com/TRvlvr/model_repo (release all_public_uvr_models). Shed runs them on the user's own
device through onnxruntime-web (WebGPU); audio never leaves the device. The host pipeline (STFT, complex-as-channels, chunk
overlap-add, optional phase-inverted "denoise" pass) is in `demucs/shed-demucs.js`, verified against a numpy reference
(`src/sep_eval.py`, `src/mdx_ref.py`).

- `kim_vocal_2.onnx` — "Kim Vocal 2" (vocals). n_fft 7680, hop 1024, dim_f 3072, dim_t 256, compensate 1.009.
  Measured on a real lead vocal mixed 3 dB under a full band: vocals 17.9 dB SDR, instrumental 21.0 dB (fast), +0.2 dB at best quality.
- `inst_hq_3.onnx` — "UVR-MDX-NET Inst HQ 3" (instrumental). n_fft 6144, hop 1024, dim_f 3072, dim_t 256, compensate 1.022.
  Used in Best quality: the band is the per-bin quieter ("Min Spec") of (mix − Kim Vocal 2 vocals) and this model's instrumental.
- `kara2.onnx` — "UVR-MDX-NET Karaoke 2" (instrumental + backing vocals). n_fft 5120, hop 1024, dim_f 2048, dim_t 256,
  compensate 1.065. Run on the separated vocal stem (not the mix): lead = vocals − result. Measured on a solo vocal: lead 17.95 dB
  vs 17.22 dB when run on the mix, and 19 dB less false "backing" energy.

HT-Demucs v4 was used in earlier versions and has been retired: the MDX vocal model is both faster and cleaner on vocals.

# Pitch model

`crepe-tiny.onnx` (live monitor) and `crepe-full.onnx` (the song's melody, 88 MB, loaded once) — CREPE (Kim, Salamon, Li, Bello, "CREPE: A Convolutional Representation for Pitch Estimation", ICASSP 2018),
"tiny" capacity, weights from torchcrepe (MIT), https://github.com/maxrmorrison/torchcrepe, converted to ONNX by `src/crepe_onnx.py`
(verified against a numpy forward pass to 1e-4). 16 kHz, 1024-sample window, 360 bins of 20 cents; the live engine around it is `src/pitch.js`.
