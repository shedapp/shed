# Separation model

HT-Demucs v4 (`htdemucs`) by Meta AI Research — Défossez et al., "Hybrid Transformers for Music Source Separation" (2022).
Code: https://github.com/facebookresearch/demucs (MIT). Static ONNX export from
https://github.com/raindog-ai/cellophane-forge-models (release htdemucs-onnx-v1, SHA-256 9938e946…).

The 174 MB graph is stored here as two parts under GitHub's file-size limit and joined in the browser.
Shed runs it on the user's own device through onnxruntime-web (WebGPU); audio never leaves the device.
The host pipeline (STFT, complex-as-channels, overlap-add) is in `demucs/shed-demucs.js`, verified
against a numpy reference (`src/demucs_ref.py`) to 1e-6.

# Lead-vocal model

`kara2.onnx` is "UVR-MDX-NET Karaoke 2" from the Ultimate Vocal Remover project (MIT),
https://github.com/Anjok07/ultimatevocalremovergui — model files published at
https://github.com/TRvlvr/model_repo (release all_public_uvr_models). Parameters: n_fft 5120,
hop 1024, dim_f 2048, dim_t 256, primary stem "instrumental + backing vocals", compensate 1.065.
Shed derives the lead vocal as mix − that stem. Host pipeline verified against `src/mdx_ref.py` to 1e-5.
