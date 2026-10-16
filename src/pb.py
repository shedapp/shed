# Minimal protobuf writer + ONNX model builder (no onnx package needed)
import struct, numpy as np
def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7f; n >>= 7
        if n: out.append(b | 0x80)
        else: out.append(b); return bytes(out)
def key(field, wt): return varint((field << 3) | wt)
def f_varint(field, v): return key(field, 0) + varint(v)
def f_bytes(field, b): return key(field, 2) + varint(len(b)) + b
def f_str(field, s): return f_bytes(field, s.encode())
def f_float(field, v): return key(field, 5) + struct.pack('<f', v)
def f_packed_i64(field, vals): return f_bytes(field, b''.join(varint(v & 0xFFFFFFFFFFFFFFFF) for v in vals))
# ONNX
FLOAT, INT64 = 1, 7
def tensor(name, arr):
    arr = np.ascontiguousarray(arr); dt = FLOAT if arr.dtype == np.float32 else INT64
    return f_packed_i64(1, arr.shape) + f_varint(2, dt) + f_str(8, name) + f_bytes(9, arr.tobytes())
def attr(name, v):
    if isinstance(v, float): return f_str(1, name) + f_float(2, v) + f_varint(20, 1)
    if isinstance(v, int): return f_str(1, name) + f_varint(3, v) + f_varint(20, 2)
    if isinstance(v, (list, tuple)) and all(isinstance(x, int) for x in v): return f_str(1, name) + f_packed_i64(8, v) + f_varint(20, 7)
    raise TypeError(v)
def node(op, inputs, outputs, name='', **attrs):
    b = b''.join(f_str(1, i) for i in inputs) + b''.join(f_str(2, o) for o in outputs) + f_str(3, name or outputs[0]) + f_str(4, op)
    for k, v in attrs.items(): b += f_bytes(5, attr(k, v))
    return b
def value_info(name, dims):   # dims: ints or strings
    shape = b''.join(f_bytes(1, f_varint(1, d) if isinstance(d, int) else f_str(2, d)) for d in dims)
    ttype = f_varint(1, FLOAT) + f_bytes(2, shape)
    return f_str(1, name) + f_bytes(2, f_bytes(1, ttype))
def model(nodes, inits, inputs, outputs, opset=17, name='g'):
    graph = b''.join(f_bytes(1, n) for n in nodes) + f_str(2, name) + b''.join(f_bytes(5, t) for t in inits) + b''.join(f_bytes(11, v) for v in inputs) + b''.join(f_bytes(12, v) for v in outputs)
    return f_varint(1, 8) + f_str(2, 'shed') + f_bytes(7, graph) + f_bytes(8, f_str(1, '') + f_varint(2, opset))
