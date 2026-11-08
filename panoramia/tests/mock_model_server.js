// Mock of tools/model_server.py for the UI test: same endpoints and JSON shape, fixed proposals.
const http = require('http');
const card = { name: 'mock-yolo', classes: ['DEN-CAR', 'DEN-FIL', 'DEN-CRN', 'DEN-BRG', 'DEN-RCT', 'DEN-PAR', 'DEN-PBL', 'DEN-ROOT', 'DEN-MIS', 'DEN-IMP-H', 'DEN-IMP-D', 'DEN-IMP-U'],
  panoramia: { 'iou0.2': { 'DEN-RCT': { refs: 10, sensitivity: 0.8, ppv: 0.7 }, 'DEN-CAR': { refs: 20, sensitivity: 0.5, ppv: 0.6 } } } };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
const srv = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url.startsWith('/health')) { res.writeHead(200, cors); return res.end(JSON.stringify({ ok: true, model: card, imgsz: 1024 })); }
  if (req.url.startsWith('/predict')) {
    let n = 0; req.on('data', d => { n += d.length; }); req.on('end', () => {
      res.writeHead(200, cors);
      res.end(JSON.stringify({ proposals: [
        { code: 'DEN-RCT', score: 0.91, box: { x: 560, y: 420, w: 14, h: 70 }, how: 'modelo mock-yolo · score 0.91' },
        { code: 'DEN-IMP-H', score: 0.77, box: { x: 300, y: 400, w: 90, h: 80 }, how: 'modelo mock-yolo · score 0.77' },
        { code: 'NOT-A-CODE', score: 0.5, box: { x: 1, y: 1, w: 5, h: 5 } }
      ], model: card, ms: 12, width: 1400, height: 683, bytes: n }));
    });
    return;
  }
  res.writeHead(404, cors); res.end('{}');
});
srv.listen(process.env.PORT || 8765, '127.0.0.1', () => console.log('mock model server on', srv.address().port));
