# Objective test: mix Martín's vocal into the song at a realistic level, separate with each model, score vocals SDR against the truth.
import numpy as np, onnxruntime as ort, sys, time, wave, os, json
HOP = 1024; DIM_T = 256
def hann(n): return (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n)).astype(np.float32)
def stft(x, nfft):
    w = hann(nfft); xp = np.pad(x, ((0, 0), (nfft // 2, nfft // 2)), mode='reflect'); nfr = 1 + (xp.shape[1] - nfft) // HOP
    idx = np.arange(nfft)[None, :] + HOP * np.arange(nfr)[:, None]; Z = np.fft.rfft(xp[:, idx] * w, axis=-1); return np.transpose(Z, (0, 2, 1)).astype(np.complex64)
def istft(Z, nfft, length):
    w = hann(nfft); C, F, T = Z.shape; frames = np.fft.irfft(np.transpose(Z, (0, 2, 1)), n=nfft, axis=-1) * w
    out_len = nfft + HOP * (T - 1); y = np.zeros((C, out_len), np.float32); ws = np.zeros(out_len, np.float32)
    for t in range(T): y[:, t * HOP:t * HOP + nfft] += frames[:, t]; ws[t * HOP:t * HOP + nfft] += w * w
    return (y / np.maximum(ws, 1e-8))[:, nfft // 2: nfft // 2 + length]
def demix(sess, mix, nfft, dim_f, compensate, overlap=0.25, denoise=False):
    chunk = HOP * (DIM_T - 1); trim = nfft // 2; T = mix.shape[1]; step = int(chunk * (1 - overlap))
    mixture = np.concatenate([np.zeros((2, trim), np.float32), mix, np.zeros((2, chunk), np.float32)], 1)
    result = np.zeros_like(mixture); divider = np.zeros(mixture.shape[1], np.float32); win = hann(chunk)
    for i in range(0, trim + T, step):
        part = mixture[:, i:i + chunk]
        if part.shape[1] < chunk: part = np.pad(part, ((0, 0), (0, chunk - part.shape[1])))
        Z = stft(part, nfft)[:, :dim_f, :]; s = np.stack([Z[0].real, Z[0].imag, Z[1].real, Z[1].imag])[None].astype(np.float32); s[:, :, :3, :] = 0
        out = sess.run(None, {'input': s})[0]
        if denoise: out = 0.5 * (out - sess.run(None, {'input': -s})[0])
        n = nfft // 2 + 1; z = np.zeros((2, n, DIM_T), np.complex64); z[0, :dim_f] = out[0, 0] + 1j * out[0, 1]; z[1, :dim_f] = out[0, 2] + 1j * out[0, 3]
        wav = istft(z, nfft, chunk); m = min(chunk, mixture.shape[1] - i)
        result[:, i:i + m] += wav[:, :m] * win[:m]; divider[i:i + m] += win[:m]
    return (result / np.maximum(divider, 1e-6))[:, trim:trim + T] * compensate
def readwav(p):
    w = wave.open(p); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth(); raw = w.readframes(n)
    if sw == 2: d = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    elif sw == 3: b = np.frombuffer(raw, np.uint8).reshape(-1, 3); d = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int8).astype(np.int32) << 16)).astype(np.float32) / 8388608
    else: d = np.frombuffer(raw, np.int32).astype(np.float32) / 2**31
    return d.reshape(-1, ch).T, sr
def sdr(ref, est):
    num = (ref ** 2).sum(); den = ((ref - est) ** 2).sum() + 1e-12; return 10 * np.log10(num / den)
vox, sr = readwav(sys.argv[1]); song, sr2 = readwav(sys.argv[2]); assert sr == sr2 == 44100
start = 30 * sr; n = 30 * sr
v = vox[:, start:start + n]; v = np.vstack([v[0], v[-1]]); s = song[:, start:start + n]; s = np.vstack([s[0], s[-1]])
v = v / np.sqrt((v ** 2).mean()) * np.sqrt((s ** 2).mean()) * 0.7      # vocal 3 dB under the band, like a real mix
mix = (v + s).astype(np.float32); mix /= max(1, np.abs(mix).max() / 0.98)
scale = 1 / max(1, np.abs(v + s).max() / 0.98); v *= scale; s *= scale
d = os.path.dirname(os.path.abspath(__file__)); out = {}
models = [('Kim_Vocal_2', 'kim', 7680, 3072, 1.009), ('Voc_FT', 'voc', 7680, 3072, 1.021)]
res = {}
for name, pre, nfft, dim_f, comp in models:
    sess = ort.InferenceSession(os.path.join(d, pre + '.onnx'), providers=['CPUExecutionProvider'])
    for label, ov, dn in [('fast', 0.25, False), ('best', 0.5, True)]:
        t = time.time(); est = demix(sess, mix, nfft, dim_f, comp, ov, dn); dt = time.time() - t
        res[name + ' ' + label] = est; out[name + ' ' + label] = {'vocals_sdr_db': round(float(sdr(v, est)), 2), 'inst_sdr_db': round(float(sdr(s, mix - est)), 2), 'cpu_s': round(dt, 1)}
        print(name, label, out[name + ' ' + label], flush=True)
ens = 0.5 * (res['Kim_Vocal_2 best'] + res['Voc_FT best'])
out['ensemble Kim+VocFT best'] = {'vocals_sdr_db': round(float(sdr(v, ens)), 2), 'inst_sdr_db': round(float(sdr(s, mix - ens)), 2)}
print(json.dumps(out, indent=1))
np.save(os.path.join(d, 'truth_v.npy'), v); np.save(os.path.join(d, 'mix.npy'), mix); np.save(os.path.join(d, 'ens.npy'), ens)
