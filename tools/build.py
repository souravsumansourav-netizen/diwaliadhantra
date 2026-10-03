"""build.py — the page loads one stylesheet and one script. The sources stay split by section (easier to work on);
this joins them, in order, into adhyantara.css and adhyantara.js beside index.html:
  - CSS: every relative url() is rewritten from its source file's folder to the page's folder
  - JS: every file is kept as its own block (they are all self-contained IIFEs or plain data), in page order
Edit a source, then run from diwaliv4/: python3 tools/build.py (index.html already points at the two bundles)."""
import re, os, posixpath

CSS = ['style.css', 'hero/hero2.css', 'wr/wr.css', 'cat/cat.css', 'nas/nas.css', 'appt/appt.css', 'page.css']
JS = ['hero/hero-data.js', 'hero/hero2.js', 'wr/wr.js', 'wr/wr-form.js', 'cat/cat.js',
      'nas/nas.js', 'appt/appt.js', 'tear.js', 'softmorph.js', 'comet.js', 'page.js']

def rebase(css, src):
    d = posixpath.dirname(src)
    def fix(m):
        q, u = m.group(1), m.group(2).strip()
        if not d or re.match(r'^(data:|https?:|/|#|var\()', u): return m.group(0)
        return f'url({q}{posixpath.normpath(posixpath.join(d, u))}{q})'
    return re.sub(r'url\(\s*([\'"]?)([^\'")]+)\1\s*\)', fix, css)

out = ['/* adhyantara.css — built by tools/build.py from: ' + ', '.join(CSS) + '. Edit the sources, not this file. */']
for f in CSS:
    out.append(f'\n/* ==================== {f} ==================== */\n' + rebase(open(f).read(), f))
open('adhyantara.css', 'w').write('\n'.join(out) + '\n')

out = ['/* adhyantara.js — built by tools/build.py from: ' + ', '.join(JS) + '. Edit the sources, not this file. */']
for f in JS:
    body = open(f).read().rstrip()
    out.append(f'\n/* ==================== {f} ==================== */\n' + body + '\n;')   # own line: a trailing // comment can't swallow it
open('adhyantara.js', 'w').write('\n'.join(out) + '\n')

for f in ('adhyantara.css', 'adhyantara.js'):
    print(f, os.path.getsize(f) // 1024, 'KB')
