# tiny model server for node tests: reads "n\n" + n*1024 float32 little-endian from stdin, writes n*360 float32 to stdout
import sys, numpy as np, onnxruntime as ort
s = ort.InferenceSession(sys.argv[1], providers=['CPUExecutionProvider'])
inp, out = sys.stdin.buffer, sys.stdout.buffer
while True:
    hdr = inp.readline()
    if not hdr: break
    n = int(hdr); x = np.frombuffer(inp.read(n * 1024 * 4), np.float32).reshape(n, 1024)
    p = s.run(None, {'x': x})[0].astype(np.float32); out.write(p.tobytes()); out.flush()
