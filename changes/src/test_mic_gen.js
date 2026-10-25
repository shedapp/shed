// Synthesize piano-like chords to a 16-bit WAV for Chromium's fake audio capture.
const fs = require('fs');
const sr = 48000;
function render(chords, gainDb, outPath, dur = 1.8, gap = 0.4) {
  const total = Math.round((chords.length * (dur + gap) + 0.8) * sr); const buf = new Float32Array(total);
  let t0 = 0.4;
  for (const notes of chords) {
    for (const m of notes) {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      for (let h = 1; h <= 10; h++) {
        const fh = f * h * Math.sqrt(1 + 0.0004 * h * h); if (fh > sr / 2 - 100) break;
        const amp = Math.pow(h, -1.25) * (m > 72 ? 0.8 : 1) ; const decay = 0.9 + 0.35 * h + (f / 440) * 0.6;
        const start = Math.round(t0 * sr), end = Math.min(total, Math.round((t0 + dur) * sr));
        const ph = Math.random() * 6.28;
        for (let i = start; i < end; i++) { const t = (i - start) / sr; const env = Math.min(1, t / 0.006) * Math.exp(-decay * t); buf[i] += amp * env * Math.sin(2 * Math.PI * fh * t + ph) / notes.length; }
      }
    }
    t0 += dur + gap;
  }
  // room noise floor
  for (let i = 0; i < total; i++) buf[i] += (Math.random() - 0.5) * 0.0006;
  let peak = 0; for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const g = Math.pow(10, gainDb / 20) / peak;
  const pcm = Buffer.alloc(44 + total * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + total * 2, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(sr, 24); pcm.writeUInt32LE(sr * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(total * 2, 40);
  for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * g * 32767))), 44 + i * 2);
  fs.writeFileSync(outPath, pcm);
}
const C = [48, 55, 60, 64, 67], Am = [45, 52, 60, 64, 69], F = [41, 48, 57, 60, 65], G = [43, 50, 59, 62, 67];
const Dm7 = [38, 50, 57, 60, 65], G7 = [43, 53, 59, 62, 65], Cmaj7 = [48, 55, 59, 64, 67], Ahalf = [45, 55, 60, 63, 67], Fm = [41, 53, 56, 60], Bb7 = [46, 53, 58, 62, 65];
render([C, Am, F, G], -14, 'pop_loud.wav');
render([C, Am, F, G], -38, 'pop_quiet.wav');
render([Dm7, G7, Cmaj7, Ahalf, Fm, Bb7], -18, 'jazz.wav');
console.log('wrote wavs');
const Cmaj9 = [48, 59, 62, 64, 67], Dm9 = [50, 60, 64, 65, 69], G13 = [43, 53, 59, 64, 69], Fs11 = [41, 57, 59, 64, 69], Abmaj7 = [44, 55, 60, 63], CoverE = [52, 60, 67, 72];
render([Cmaj9, Dm9, G13, Fs11, Abmaj7, CoverE], -20, 'ext.wav');
render([C, Am, F, G, Dm7, G7, Cmaj7], -16, 'legato.wav', 1.4, 0.0);
console.log('wrote more');
