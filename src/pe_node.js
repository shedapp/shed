// PitchEngine in node, with the CREPE model served by a python child (onnxruntime). Sync protocol via spawnSync-free pipes.
const { spawn } = require('child_process'); const fs = require('fs');
function makeModel(onnxPath, serverPy) {
  const child = spawn('python3', [serverPy, onnxPath], { stdio: ['pipe', 'pipe', 'inherit'] }); const queue = []; let buf = Buffer.alloc(0);
  child.stdout.on('data', (d) => { buf = Buffer.concat([buf, d]); while (queue.length && buf.length >= queue[0].n * 360 * 4) { const q = queue.shift(); const bytes = q.n * 360 * 4; const out = new Float32Array(new Uint8Array(buf.subarray(0, bytes)).buffer.slice(0)); buf = buf.subarray(bytes); q.res(out); } });
  const model = (frames, n) => new Promise((res) => { queue.push({ n, res }); child.stdin.write(n + '\n'); child.stdin.write(Buffer.from(frames.buffer, frames.byteOffset, frames.byteLength)); });
  model.close = () => child.stdin.end(); return model;
}
module.exports = { makeModel };
