const fs = require('fs');
const dsp = fs.readFileSync(__dirname + '/dsp.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const tpl = fs.readFileSync(__dirname + '/index.template.html', 'utf8');
const body = tpl.replace('__DSP__', () => dsp);
fs.mkdirSync(__dirname + '/dist', { recursive: true });
// Artifact version: no document skeleton (the publisher adds one).
fs.writeFileSync(__dirname + '/dist/shed-artifact.html', body);
// Standalone version: full document, works from a file or any static host.
fs.writeFileSync(__dirname + '/dist/shed.html', '<!doctype html>\n<html lang="en">\n<head>\n' + body.replace(/<\/style>/, '</style>\n</head>\n<body>') + '\n</body>\n</html>\n');
console.log('built', fs.statSync(__dirname + '/dist/shed.html').size, 'bytes');
