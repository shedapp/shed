import pickle, numpy as np, zipfile, sys, json
def load_pth(path):
    z = zipfile.ZipFile(path); names = z.namelist(); root = names[0].split('/')[0]
    class Storage:  # placeholder referenced by persistent ids
        def __init__(self, key, dtype, n): self.key, self.dtype, self.n = key, dtype, n
    def rebuild(storage, offset, size, stride, *a):
        raw = z.read(f'{root}/data/{storage.key}'); arr = np.frombuffer(raw, dtype=storage.dtype)
        n = int(np.prod(size)) if len(size) else 1
        return arr[offset:offset + n].reshape(size).copy()
    class U(pickle.Unpickler):
        def find_class(self, mod, name):
            if name == '_rebuild_tensor_v2': return rebuild
            if name.endswith('Storage'): return {'FloatStorage': np.float32, 'LongStorage': np.int64, 'IntStorage': np.int32, 'DoubleStorage': np.float64, 'HalfStorage': np.float16}[name]
            if mod == 'collections' and name == 'OrderedDict': import collections; return collections.OrderedDict
            if mod == 'torch._utils' and name == '_rebuild_parameter': return lambda data, rg, bh: data
            return super().find_class(mod, name)
        def persistent_load(self, pid):
            typename, dtype, key, location, numel = pid; return Storage(key, dtype, numel)
    return U(z.open(f'{root}/data.pkl')).load()
sd = load_pth(sys.argv[1])
for k, v in sd.items(): print(k, v.shape, v.dtype)
np.savez(sys.argv[2], **{k: np.asarray(v) for k, v in sd.items()})
