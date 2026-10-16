import numpy as np, sys, pb
W = np.load(sys.argv[1]); out = sys.argv[2]
nodes, inits = [], []
x = 'x'   # [N, 1024]
inits.append(pb.tensor('shape4', np.array([0, 1, 1024, 1], np.int64)))
# mean-centre and scale per frame (what torchcrepe.preprocess does)
nodes.append(pb.node('ReduceMean', [x], ['mu'], axes=[1], keepdims=1))
nodes.append(pb.node('Sub', [x, 'mu'], ['xc']))
nodes.append(pb.node('Mul', ['xc', 'xc'], ['xsq'])); nodes.append(pb.node('ReduceMean', ['xsq'], ['var'], axes=[1], keepdims=1))
inits.append(pb.tensor('eps', np.array([1e-20], np.float32))); inits.append(pb.tensor('bessel', np.array([1024 / 1023], np.float32)))
nodes.append(pb.node('Mul', ['var', 'bessel'], ['varu'])); nodes.append(pb.node('Max', ['varu', 'eps'], ['varc'])); nodes.append(pb.node('Sqrt', ['varc'], ['sd']))
nodes.append(pb.node('Div', ['xc', 'sd'], ['xn'])); nodes.append(pb.node('Reshape', ['xn', 'shape4'], ['h0']))
h = 'h0'
for i, (name, pad, stride) in enumerate([('conv1', (254, 254), 4)] + [(f'conv{j}', (31, 32), 1) for j in range(2, 7)]):
    inits.append(pb.tensor(name + '.w', W[name + '.weight'])); inits.append(pb.tensor(name + '.b', W[name + '.bias']))
    for s in ['weight', 'bias', 'running_mean', 'running_var']: inits.append(pb.tensor(f'{name}_BN.{s}', W[f'{name}_BN.{s}']))
    nodes.append(pb.node('Conv', [h, name + '.w', name + '.b'], [name + '.c'], kernel_shape=[W[name + '.weight'].shape[2], 1], pads=[pad[0], 0, pad[1], 0], strides=[stride, 1]))
    nodes.append(pb.node('Relu', [name + '.c'], [name + '.r']))
    nodes.append(pb.node('BatchNormalization', [name + '.r', f'{name}_BN.weight', f'{name}_BN.bias', f'{name}_BN.running_mean', f'{name}_BN.running_var'], [name + '.n'], epsilon=0.0010000000474974513))
    nodes.append(pb.node('MaxPool', [name + '.n'], [name + '.p'], kernel_shape=[2, 1], strides=[2, 1]))
    h = name + '.p'
nodes.append(pb.node('Transpose', [h], ['tp'], perm=[0, 2, 1, 3]))
inits.append(pb.tensor('shape2', np.array([0, -1], np.int64))); nodes.append(pb.node('Reshape', ['tp', 'shape2'], ['flat']))
inits.append(pb.tensor('cls.w', W['classifier.weight'])); inits.append(pb.tensor('cls.b', W['classifier.bias']))
nodes.append(pb.node('Gemm', ['flat', 'cls.w', 'cls.b'], ['logits'], transB=1))
nodes.append(pb.node('Sigmoid', ['logits'], ['p']))
open(out, 'wb').write(pb.model(nodes, inits, [pb.value_info('x', ['N', 1024])], [pb.value_info('p', ['N', 360])]))
print('wrote', out)
