# Shed

Any song, your key, your tempo. Loop the hard part. See your pitch.

A practice web app for singers: drop in any audio or video file, change key and speed without losing quality, loop a section, and watch a live pitch monitor with an 88-key piano, a reference ghost line, a riff trainer and a warm-up mode. Audio never leaves the device.

**Live app:** https://shedapp.github.io/shed/

Install on a phone: open the link, then iPhone → Share → *Add to Home Screen*; Android → Chrome menu → *Install*.

## How it is built

`index.html` is the whole app, one self-contained file. The source lives in `src/`:

- `src/index.template.html` – the page (HTML, CSS, app logic)
- `src/dsp.js` – the audio engine: phase-vocoder time stretch + pitch shift, run in a Web Worker
- `src/build.js` – inlines the engine into the page and writes `index.html`
- `src/test_*.js` – automated tests (engine accuracy, browser flows)
- `piano/` – Salamander Grand Piano samples (CC BY 3.0, see `piano/CREDITS.md`)

Rebuild with `node src/build.js` (output lands in `src/dist/`; copy `shed.html` to `index.html`).
