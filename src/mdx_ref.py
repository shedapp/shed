"""Reference host pipeline for UVR MDX-Net karaoke models (numpy + onnxruntime).
Mirrors UVR's STFT class and demix(): stft(center=True, not normalised) → [B,4,dim_f,256], model, istft.
"""
import numpy as np, onnxruntime as ort, sys, time
HOP = 1024; DIM_T = 256; DIM_F = 2048

def hann(n): return (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n)).astype(np.float32)

def stft(x, nfft):  # x [C, T] -> complex [C, nfft//2+1, frames], torch.stft(center=True, reflect)
    w = hann(nfft); xp = np.pad(x, ((0, 0), (nfft // 2, nfft // 2)), mode='reflect')
    nfr = 1 + (xp.shape[1] - nfft) // HOP
    idx = np.arange(nfft)[None, :] + HOP * np.arange(nfr)[:, None]
    Z = np.fft.rfft(xp[:, idx] * w, axis=-1)
    return np.transpose(Z, (0, 2, 1)).astype(np.complex64)

def istft(Z, nfft, length):
    w = hann(nfft); C, F, T = Z.shape
    frames = np.fft.irfft(np.transpose(Z, (0, 2, 1)), n=nfft, axis=-1) * w
    out_len = nfft + HOP * (T - 1); y = np.zeros((C, out_len), np.float32); ws = np.zeros(out_len, np.float32)
    for t in range(T): y[:, t * HOP:t * HOP + nfft] += frames[:, t]; ws[t * HOP:t * HOP + nfft] += w * w
    y = y / np.maximum(ws, 1e-8)
    return y[:, nfft // 2: nfft // 2 + length]

def spek_of(chunk, nfft):  # chunk [2, chunk_size] -> [1, 4, DIM_F, 256]
    Z = stft(chunk, nfft)[:, :DIM_F, :]
    s = np.stack([Z[0].real, Z[0].imag, Z[1].real, Z[1].imag])[None].astype(np.float32)
    s[:, :, :3, :] = 0
    return s

def wave_of(spek, nfft, length):  # [1, 4, DIM_F, 256] -> [2, length]
    n = nfft // 2 + 1; z = np.zeros((2, n, DIM_T), np.complex64)
    z[0, :DIM_F] = spek[0, 0] + 1j * spek[0, 1]; z[1, :DIM_F] = spek[0, 2] + 1j * spek[0, 3]
    return istft(z, nfft, length)

def demix(sess, mix, nfft, compensate, overlap=0.25):
    chunk = HOP * (DIM_T - 1); trim = nfft // 2; T = mix.shape[1]
    step = int(chunk * (1 - overlap))
    mixture = np.concatenate([np.zeros((2, trim), np.float32), mix, np.zeros((2, chunk), np.float32)], 1)
    result = np.zeros_like(mixture); divider = np.zeros(mixture.shape[1], np.float32)
    win = hann(chunk)
    for i in range(0, trim + T, step):
        part = mixture[:, i:i + chunk]
        if part.shape[1] < chunk: part = np.pad(part, ((0, 0), (0, chunk - part.shape[1])))
        spek = spek_of(part, nfft)
        t0 = time.time(); out = sess.run(None, {'input': spek})[0]; dt = time.time() - t0
        wav = wave_of(out, nfft, chunk)
        n = min(chunk, mixture.shape[1] - i)
        result[:, i:i + n] += wav[:, :n] * win[:n]; divider[i:i + n] += win[:n]
        print(f'  chunk @ {i/44100:.1f}s {dt:.2f}s', file=sys.stderr)
    out = result / np.maximum(divider, 1e-6)
    return out[:, trim:trim + T] * compensate

if __name__ == '__main__':
    mix = np.load('/tmp/ref_mix.npy')[:, :44100 * 8]
    sess = ort.InferenceSession('/tmp/UVR_MDXNET_KARA_2.onnx', providers=['CPUExecutionProvider'])
    inst = demix(sess, mix, 5120, 1.065)
    lead = mix - inst
    rms = lambda a: float(np.sqrt((a ** 2).mean()))
    print('mix', rms(mix), 'instrumental+bv', rms(inst), 'lead', rms(lead))
    np.save('/tmp/kara_inst.npy', inst)
    # dump a chunk spectrum for the JS comparison
    chunk = np.pad(mix[:, :HOP * (DIM_T - 1)], ((0, 0), (0, 0)))
    spek_of(chunk, 5120).tofile('/tmp/kara_spek.f32'); chunk.astype(np.float32).tofile('/tmp/kara_chunk.f32')
    wave_of(spek_of(chunk, 5120), 5120, chunk.shape[1]).astype(np.float32).tofile('/tmp/kara_roundtrip.f32')
