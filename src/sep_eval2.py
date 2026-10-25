# Separation bench on real material. usage: python3 sep_eval2.py vocal.wav instrumental.wav start_s len_s [mode]
# Measures vocals/instrumental SDR for single models, ensembles, and the lead/backing (karaoke) step.
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
def rs(x, sr_in):
    if sr_in == 44100: return x
    ratio = sr_in / 44100; n_out = int(x.shape[1] / ratio); t = np.arange(n_out) * ratio; j = np.floor(t).astype(int); fr = t - j
    out = np.zeros((x.shape[0], n_out), np.float32); K = 16
    for k in range(-K, K + 1):
        idx = np.clip(j + k, 0, x.shape[1] - 1); xx = k - fr; w = np.sinc(xx) * (0.5 + 0.5 * np.cos(np.pi * xx / (K + 1))); out += x[:, idx] * w[None, :]
    return out
def sdr(ref, est): return 10 * np.log10((ref ** 2).sum() / (((ref - est) ** 2).sum() + 1e-12))
def spec_combine(a, b, mode):   # UVR-style spectral ensemble: per-bin max (or min) magnitude, phase from that source
    nfft = 4096; A = stft(a, nfft); B = stft(b, nfft); mA, mB = np.abs(A), np.abs(B)
    pick = (mA >= mB) if mode == 'max' else (mA <= mB); Z = np.where(pick, A, B); return istft(Z, nfft, a.shape[1])
vox, sr = readwav(sys.argv[1]); song, sr2 = readwav(sys.argv[2]); S0 = int(sys.argv[3]); SN = int(sys.argv[4]); MODE = sys.argv[5] if len(sys.argv) > 5 else 'all'
vox = rs(vox[:, S0 * sr:(S0 + SN) * sr], sr); song = rs(song[:, S0 * sr2:(S0 + SN) * sr2], sr2)
n = min(vox.shape[1], song.shape[1]); v = np.vstack([vox[0], vox[-1]])[:, :n]; s = np.vstack([song[0], song[-1]])[:, :n]
v = v / np.sqrt((v ** 2).mean()) * np.sqrt((s ** 2).mean()) * 0.7
scale = 1 / max(1, np.abs(v + s).max() / 0.98); v *= scale; s *= scale; mix = (v + s).astype(np.float32)
d = os.path.dirname(os.path.abspath(__file__)); so = ort.SessionOptions(); so.intra_op_num_threads = 4
def sess(name): return ort.InferenceSession(os.path.join(d, name + '.onnx'), so, providers=['CPUExecutionProvider'])
R = {}; T = {}
def run(label, fn):
    t = time.time(); R[label] = fn(); T[label] = round(time.time() - t, 1)
    print(label.ljust(34), 'vocals %.2f dB  inst %.2f dB  %.0fs' % (sdr(v, R[label]), sdr(s, mix - R[label]), T[label]), flush=True)
if MODE in ('all', 'models'):
    k = sess('kim'); run('Kim_Vocal_2 fast', lambda: demix(k, mix, 7680, 3072, 1.009, 0.25)); run('Kim_Vocal_2 best (ov.5+denoise)', lambda: demix(k, mix, 7680, 3072, 1.009, 0.5, True)); del k
    f = sess('voc'); run('Voc_FT fast', lambda: demix(f, mix, 7680, 3072, 1.021, 0.25)); del f
    h = sess('hq3'); run('Inst_HQ_3 fast (mix − inst)', lambda: mix - demix(h, mix, 6144, 3072, 1.022, 0.25)); del h
    a, b, c = R['Kim_Vocal_2 fast'], R['Voc_FT fast'], R['Inst_HQ_3 fast (mix − inst)']
    run('avg Kim2+VocFT', lambda: 0.5 * (a + b)); run('avg Kim2+HQ3', lambda: 0.5 * (a + c)); run('avg all three', lambda: (a + b + c) / 3)
    run('maxspec Kim2,HQ3 (vocals)', lambda: spec_combine(a, c, 'max')); run('minspec Kim2,HQ3 (vocals)', lambda: spec_combine(a, c, 'min'))
    run('avg Kim2best+HQ3', lambda: 0.5 * (R['Kim_Vocal_2 best (ov.5+denoise)'] + c))
if MODE in ('all', 'kara'):
    k = sess('kim'); voc = demix(k, mix, 7680, 3072, 1.009, 0.25); del k
    ka = sess('kara')
    bv_mix = demix(ka, mix, 5120, 2048, 1.065, 0.25); lead_from_mix = mix - bv_mix
    bv_voc = demix(ka, voc, 5120, 2048, 1.065, 0.25); lead_from_voc = voc - bv_voc
    print('karaoke on the MIX   : lead SDR %.2f dB (solo vocal: lead should equal the vocal), backing level %.1f dB rel. vocal' % (sdr(v, lead_from_mix), 20 * np.log10(np.sqrt((bv_mix - (mix - voc)) ** 2).mean() / np.sqrt((v ** 2).mean()) + 1e-9)))
    print('karaoke on the VOCALS: lead SDR %.2f dB, backing level %.1f dB rel. vocal' % (sdr(v, lead_from_voc), 20 * np.log10(np.sqrt((bv_voc ** 2).mean()) / np.sqrt((v ** 2).mean()) + 1e-9)))
    print('"Lead off" output quality: from mix %.2f dB, from vocals %.2f dB (vs true instrumental)' % (sdr(s, bv_mix), sdr(s, (mix - voc) + bv_voc)))
