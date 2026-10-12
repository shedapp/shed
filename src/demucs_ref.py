"""Reference host pipeline for the static HT-Demucs ONNX graph (numpy + onnxruntime).
Mirrors demucs/htdemucs.py: per-segment normalisation, _spec (STFT, CAC), _ispec, and
apply_model's 7.8 s windows with 25 % overlap and triangular weights.
"""
import numpy as np, onnxruntime as ort, math, sys, time

SR = 44100; SEG = 343980; NFFT = 4096; HOP = 1024; STRIDE = 257985  # 0.75 * SEG
_win = np.hanning(NFFT + 1)[:-1].astype(np.float32)  # periodic Hann, like torch.hann_window

def reflect_pad(x, left, right):
    return np.pad(x, ((0, 0), (left, right)), mode='reflect')

def stft(x):  # x: [C, T] -> complex [C, NFFT//2+1, frames]; torch.stft(center=True, normalized=True, pad_mode='reflect')
    xp = reflect_pad(x, NFFT // 2, NFFT // 2)
    nfr = 1 + (xp.shape[1] - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(nfr)[:, None]
    frames = xp[:, idx] * _win  # [C, nfr, NFFT]
    Z = np.fft.rfft(frames, axis=-1) / math.sqrt(NFFT)
    return np.transpose(Z, (0, 2, 1)).astype(np.complex64)  # [C, F, T]

def istft(Z, length):  # torch.istft(center=True, normalized=True)
    C, F, T = Z.shape
    frames = np.fft.irfft(np.transpose(Z, (0, 2, 1)) * math.sqrt(NFFT), n=NFFT, axis=-1) * _win  # [C, T, NFFT]
    out_len = NFFT + HOP * (T - 1)
    y = np.zeros((C, out_len), np.float32); wsum = np.zeros(out_len, np.float32)
    for t in range(T):
        y[:, t * HOP:t * HOP + NFFT] += frames[:, t]; wsum[t * HOP:t * HOP + NFFT] += _win * _win
    y = y / np.maximum(wsum, 1e-8)
    y = y[:, NFFT // 2: NFFT // 2 + length]
    return y

def spec(x):  # demucs _spec: x [C, T] -> z [C, 2048, le] with le = ceil(T/HOP)
    T = x.shape[1]; le = math.ceil(T / HOP); pad = HOP // 2 * 3
    xp = reflect_pad(x, pad, pad + le * HOP - T)
    z = stft(xp)[:, :-1, :]
    assert z.shape[-1] == le + 4, z.shape
    return z[:, :, 2:2 + le]

def ispec(z, length):  # demucs _ispec: z [S*C, 2048, T] -> [S*C, length]
    z = np.pad(z, ((0, 0), (0, 1), (2, 2)))
    pad = HOP // 2 * 3; le = HOP * math.ceil(length / HOP) + 2 * pad
    x = istft(z, le)
    return x[:, pad:pad + length]

def run_segment(sess, mix):  # mix [2, SEG] float32 -> sources [4, 2, SEG]
    mean = mix.mean(); std = mix.std()
    m = (mix - mean) / (1e-5 + std)
    z = spec(m)  # [2, 2048, 336]
    z_cac = np.stack([z[0].real, z[0].imag, z[1].real, z[1].imag])[None].astype(np.float32)  # [1,4,2048,336]
    t0 = time.time()
    time_out, zout = sess.run(None, {'mix': m[None].astype(np.float32), 'z_cac': z_cac})
    dt = time.time() - t0
    zo = zout[0]  # [4, 4, 2048, 336] -> complex [4*2, 2048, 336]
    zc = np.empty((8, 2048, 336), np.complex64)
    for s in range(4):
        zc[2 * s] = zo[s, 0] + 1j * zo[s, 1]; zc[2 * s + 1] = zo[s, 2] + 1j * zo[s, 3]
    xs = ispec(zc, SEG).reshape(4, 2, SEG)
    out = (xs + time_out[0]) * std + mean
    return out, dt

def separate(sess, wav):  # wav [2, T] at 44.1k -> [4, 2, T]
    T = wav.shape[1]
    ref = wav.mean(0); mean, std = ref.mean(), ref.std(); w = (wav - mean) / std
    out = np.zeros((4, 2, T), np.float32); wsum = np.zeros(T, np.float32)
    tri = np.concatenate([np.arange(1, SEG // 2 + 1), np.arange(SEG - SEG // 2, 0, -1)]).astype(np.float32); tri /= tri.max()
    for off in range(0, T, STRIDE):
        chunk = w[:, off:off + SEG]; n = chunk.shape[1]
        if n < SEG: chunk = np.pad(chunk, ((0, 0), (0, SEG - n)))
        o, dt = run_segment(sess, chunk); print(f'  segment @ {off/SR:.1f}s: {dt:.1f}s', file=sys.stderr)
        out[:, :, off:off + n] += o[:, :, :n] * tri[:n]; wsum[off:off + n] += tri[:n]
        if off + SEG >= T: break
    return out / np.maximum(wsum, 1e-8) * std + mean

if __name__ == '__main__':
    sess = ort.InferenceSession('/tmp/htdemucs_static.onnx', providers=['CPUExecutionProvider'])
    # synthetic song: repeating band (wide) + centred harmonic "vocal" melody with vibrato
    secs = 12; n = SR * secs; t = np.arange(n) / SR
    chords = [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]]
    bandL = np.zeros(n, np.float32); bandR = np.zeros(n, np.float32)
    bar = (t // 0.5).astype(int) % 4; env = 0.5 + 0.5 * np.exp(-(t % 0.5) * 4)
    for ci, ch in enumerate(chords):
        msk = bar == ci
        for st in ch:
            f = 220 * 2 ** (st / 12)
            for h in range(1, 7):
                a = env * 0.08 / h
                bandL += (msk * a * np.sin(2 * np.pi * f * h * t + h)).astype(np.float32)
                bandR += (msk * a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h) + 0.3 * h)).astype(np.float32)
    bt = t % 0.5; kick = (np.exp(-bt * 30) * np.sin(2 * np.pi * 55 * bt) * 0.5).astype(np.float32); bandL += kick; bandR += kick
    seq = [0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, -1, 0, 4, 7, 12, 9, 7, 5, 2, 0, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0]
    idx = (t // 0.4).astype(int) % len(seq); f0 = 330 * 2 ** (np.array(seq)[idx] / 12) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t))
    phase = np.cumsum(2 * np.pi * f0 / SR); venv = np.minimum(1, (t % 0.4) * 20) * np.minimum(1, (0.4 - t % 0.4) * 20)
    voc = sum(0.12 / h ** 0.8 * np.sin(h * phase) for h in range(1, 13)) * venv
    voc = voc.astype(np.float32)
    mix = np.stack([bandL + voc, bandR + voc])
    out = separate(sess, mix)
    vocals = out[3]; inst = mix - vocals
    def proj(a, b): return float((a * b).sum() / (b * b).sum())
    vm = vocals.mean(0); im = inst.mean(0); bm = (bandL + bandR) / 2
    print('vocal stem: contains vocal %.1f dB, band %.1f dB' % (20 * np.log10(abs(proj(vm, voc)) + 1e-6), 20 * np.log10(abs(proj(vm, bm)) + 1e-6)))
    print('instrumental: contains vocal %.1f dB, band %.1f dB' % (20 * np.log10(abs(proj(im, voc)) + 1e-6), 20 * np.log10(abs(proj(im, bm)) + 1e-6)))
    np.save('/tmp/ref_mix.npy', mix); np.save('/tmp/ref_vocals.npy', vocals)
