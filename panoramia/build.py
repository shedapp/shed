#!/usr/bin/env python3
"""Concatenate src/ into a single self-contained dist/index.html."""
import os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)
files = sorted(f for f in os.listdir(SRC) if re.match(r'^\d\d-', f))
head = open(os.path.join(SRC, '00-head.html'), encoding='utf-8').read()
js_parts = []
for f in files:
    if f.endswith('.js'):
        code = open(os.path.join(SRC, f), encoding='utf-8').read()
        if '</script' in code.lower():
            sys.exit('script close tag inside ' + f)
        js_parts.append('/* ==== ' + f + ' ==== */\n' + code)
tail = '<script>\n' + '\n'.join(js_parts) + '\n</script>\n</body>\n</html>\n'
out = head + tail
path = os.path.join(DIST, 'index.html')
open(path, 'w', encoding='utf-8').write(out)
# GitHub Pages serves the repository root: keep a copy there, next to data/ (the complete AKUDENTAL set).
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
print('built', path, len(out.encode('utf-8')), 'bytes;', len(js_parts), 'scripts; copied to index.html')
