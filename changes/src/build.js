// Build: inline the engine and UI into one file. `node src/build.js` → index.html (hosted, uses piano/ next to it)
// and dist/artifact.html (self-contained: compact piano embedded).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const build = new Date().toISOString().slice(2, 16).replace(/[-T:]/g, '').slice(0, 10);
const tpl = read('index.template.html');
let syncCfg = { url: '', key: '' }; try { syncCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync.config.json'), 'utf8')); } catch (e) { /* sync off */ }
const parts = { __THEORY__: read('theory.js'), __MOOD__: read('mood.js'), __REHARM__: read('reharm.js'), __VOICING__: read('voicing.js'), __AUDIO__: read('audio.js'), __EXPORT__: read('export.js'), __SYNC__: read('sync.js').replace('__SUPABASE_URL__', syncCfg.url || '').replace('__SUPABASE_KEY__', syncCfg.key || ''), __UI__: read('ui.js').replace('__BUILD__', build) };
function assemble(embed) {
  let out = tpl;
  for (const [k, v] of Object.entries(parts)) out = out.replace(k, () => v.replace(/<\/script>/gi, '<\\/script>'));
  out = out.replace('__PIANO_DATA__', () => embed ? read('piano-compact.json') : '');
  return out;
}
fs.writeFileSync(path.join(root, 'index.html'), assemble(false));
if (fs.existsSync(path.join(__dirname, 'piano-compact.json'))) {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), assemble(true));
} else console.log('no src/piano-compact.json: skipping the self-contained dist/artifact.html build');
// service worker build stamp
const sw = read('sw.template.js').replace('__BUILD__', build);
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log('built', build, 'index.html', fs.statSync(path.join(root, 'index.html')).size, 'bytes');
