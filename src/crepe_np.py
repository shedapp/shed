import numpy as np, sys
W = np.load(sys.argv[1] if len(sys.argv) > 1 else 'crepe/tiny.npz')
def layer(x, name, pad, stride):
    w = W[name + '.weight'][:, :, :, 0]; b = W[name + '.bias']            # (out, in, k)
    g, be, m, v = W[name + '_BN.weight'], W[name + '_BN.bias'], W[name + '_BN.running_mean'], W[name + '_BN.running_var']
    xp = np.pad(x, ((0, 0), pad)); out_c, in_c, k = w.shape; L = (xp.shape[1] - k) // stride + 1
    idx = np.arange(k)[None, :] + stride * np.arange(L)[:, None]           # (L, k)
    patches = xp[:, idx]                                                   # (in, L, k)
    y = np.einsum('oik,ilk->ol', w, patches) + b[:, None]
    y = np.maximum(y, 0); y = (y - m[:, None]) / np.sqrt(v[:, None] + 1e-3) * g[:, None] + be[:, None]
    return y.reshape(out_c, L // 2, 2).max(axis=2)
def crepe(frame):   # frame: 1024 samples @16k → 360 probabilities
    x = frame - frame.mean(); x = x / max(1e-10, x.std()); x = x[None, :]
    x = layer(x, 'conv1', (254, 254), 4)
    for n in ['conv2', 'conv3', 'conv4', 'conv5', 'conv6']: x = layer(x, n, (31, 32), 1)
    flat = x.T.reshape(-1)                                                 # time-major then channel, like permute(0,2,1,3)
    z = W['classifier.weight'] @ flat + W['classifier.bias']
    return 1 / (1 + np.exp(-z))
CENTS = 20 * np.arange(360) + 1997.3794084376191
def decode(p):
    b = int(p.argmax()); lo, hi = max(0, b - 4), min(360, b + 5); w = p[lo:hi]; c = (w * CENTS[lo:hi]).sum() / w.sum()
    return 10 * 2 ** (c / 1200), float(p[b])
if __name__ == '__main__':
    sr = 16000; t = np.arange(1024) / sr
    for f in [110, 220, 440, 660, 1000]:
        x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t + 1) + 0.1 * np.random.randn(1024)
        hz, conf = decode(crepe(x.astype(np.float32))); print(f, '→', round(hz, 2), 'conf', round(conf, 3))
    x = np.random.randn(1024).astype(np.float32); print('noise conf', round(decode(crepe(x))[1], 3))
