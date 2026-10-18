# Changes

Play it. Hear where it could go.

A harmony workspace for songwriters: play a progression (microphone, MIDI, or tap it in), confirm what it heard, then see where the harmony could go next in the vocabulary of gospel, neo-soul, jazz, pop, classical and film — every option with its reason in one line, a mood reading, and the voicing drawn on a keyboard (with voice-leading lines) and a fretboard. Keep an idea into a song: sections, lyrics with the chords above the words, and several ideas per section to try over the same words.

**Live app:** https://shedapp.github.io/shed/changes/

Install on a phone: open the link, then iPhone → Share → *Add to Home Screen*; Android → Chrome menu → *Install*.
MIDI works in Chrome (Android, Mac, Windows); iPhone uses the microphone or Tap.

## How it is built

`index.html` is the whole app, one file. The source lives in `src/`:

- `src/theory.js` – pitch classes, key-aware spelling, chord symbols, parsing, Roman numerals, key finding, chord identification from notes
- `src/mood.js` – brightness, tension, named colors and the circle-of-fifths hue system
- `src/reharm.js` – the vocabulary: seven style packs, the ladder of transforms, ranking, negative harmony (Shadow)
- `src/voicing.js` – piano voicings with least-motion voice leading, guitar shape search, the keyboard and fretboard drawings
- `src/audio.js` – the Salamander piano (shares Shed's samples in `../piano/`), the player, Web MIDI and the microphone chroma recognizer
- `src/ui.js`, `src/index.template.html` – the app
- `src/test_engine.js`, `src/test_voicing.js`, `src/test_browser.js` – checks you can run with `node`

Rebuild with `node src/build.js` (writes `index.html` and `dist/artifact.html`, the self-contained version with a compact piano embedded; the compact set is built from `../piano/`).
Nothing leaves the device: recognition, suggestions, voicings and sound all run in the browser.
