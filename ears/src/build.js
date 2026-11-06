// Build: inline CSS + engine + UI into one file. `node src/build.js` → ../index.html (hosted, uses ../piano/ next to it),
// ../sw.js (service worker with build stamp) and ../dist/artifact.html (self-contained preview build, synthesized piano).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const build = new Date().toISOString().slice(2, 16).replace(/[-T:]/g, '').slice(0, 10);
const JS = ['util.js', 'theory.js', 'audio.js', 'notation.js', 'rhythm.js', 'gen.js', 'genrhythm.js', 'srs.js', 'pitch.js', 'sing.js', 'app.js'];
const js = JS.map(f => `/* ---- ${f} ---- */\n` + read(f)).join('\n\n').replace("const BUILD = '__BUILD__';", `const BUILD = '${build}';`);
function assemble(pianoBase) {
  return read('index.template.html')
    .replace('/*__CSS__*/', () => read('styles.css'))
    .replace('__PIANO_BASE__', pianoBase)
    .replace('/*__JS__*/', () => js.replace(/<\/script>/gi, '<\\/script>'));
}
fs.writeFileSync(path.join(root, 'index.html'), assemble('../piano/'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), assemble(''));
fs.writeFileSync(path.join(root, 'sw.js'), read('sw.template.js').replace('__BUILD__', build));
console.log('built', build, 'index.html', fs.statSync(path.join(root, 'index.html')).size, 'bytes');
