"""bake-seams.py — flattens each seam of the page (two aurora drifts masked by stl/a/aur-*-front.webp and tinted,
plus a soft breath of the mixed tint, all screen-blended) into one plain RGBA image, seams/seam-N.webp.
Screen over a near-black ground is close to adding light, so the baked pixel keeps the light as straight alpha:
alpha = brightest channel, colour = light / alpha. Composited normally over the ground it looks as the blend did,
with no mask, no blend mode and no animation left on the page. Run from diwaliv3/: python3 tools/bake-seams.py"""
import re, os
import numpy as np
from PIL import Image

W, H = 1280, 700                      # the seam's box (124vw x 106vh), stretched to fit on the page
# the recipe of each seam, top of the page to the bottom: the colours of the sections either side and two aurora shapes
seams = ['--from:#1c1230;--to:#14102a;--c1:#7b5cc4;--c2:#5e4aa8;--m1:url(stl/a/aur-2-front.webp);--m2:url(stl/a/aur-3-front.webp);--m3:url(stl/a/aur-2-wisp.webp)',
  '--from:#241826;--to:#120e1b;--c1:#6a52b0;--c2:#5a3c90;--m1:url(stl/a/aur-3-front.webp);--m2:url(stl/a/aur-2-front.webp);--m3:url(stl/a/aur-3-wisp.webp)',
  '--from:#120e1b;--to:#1a0e2a;--c1:#6c4a86;--c2:#7a3e6a;--m1:url(stl/a/aur-2-front.webp);--m2:url(stl/a/aur-1-front.webp);--m3:url(stl/a/aur-2-wisp.webp)',
  '--from:#2a1424;--to:#140f1f;--c1:#7c4a6a;--c2:#6a4638;--m1:url(stl/a/aur-1-front.webp);--m2:url(stl/a/aur-2-front.webp);--m3:url(stl/a/aur-1-wisp.webp)',
  '--from:#140f1f;--to:#0d0a26;--c1:#4c3a7a;--c2:#3a3e8a;--m1:url(stl/a/aur-3-front.webp);--m2:url(stl/a/aur-2-front.webp);--m3:url(stl/a/aur-3-wisp.webp)',
  '--from:#0d0a26;--to:#0e0a18;--c1:#3e3a86;--c2:#5a4898;--m1:url(stl/a/aur-2-front.webp);--m2:url(stl/a/aur-3-front.webp);--m3:url(stl/a/aur-2-wisp.webp)',
  '--from:#0e0a18;--to:#120e1b;--c1:#6a4e96;--c2:#8a4c62;--m1:url(stl/a/aur-3-front.webp);--m2:url(stl/a/aur-1-front.webp);--m3:url(stl/a/aur-3-wisp.webp)',
  '--from:#120e1b;--to:#160e20;--c1:#8a4e5c;--c2:#8c5a34;--m1:url(stl/a/aur-1-front.webp);--m2:url(stl/a/aur-2-front.webp);--m3:url(stl/a/aur-1-wisp.webp)',
  '--from:#2a1a22;--to:#150f22;--c1:#8c6236;--c2:#7a5a44;--m1:url(stl/a/aur-1-front.webp);--m2:url(stl/a/aur-3-front.webp);--m3:url(stl/a/aur-1-wisp.webp)']
os.makedirs('seams', exist_ok=True)

def hexrgb(h):
    h = h.strip().lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float) / 255

def radial(w, h, rx, ry, inner, outer, fade=None):
    """radial-gradient(rx ry at 50% 50%, inner 0, outer 100%) over a w x h box; fade = stop where it reaches transparent"""
    y, x = np.mgrid[0:h, 0:w]
    d = np.sqrt(((x + .5 - w / 2) / (rx * w)) ** 2 + ((y + .5 - h / 2) / (ry * h)) ** 2)
    if fade is None:
        t = np.clip(d, 0, 1)[..., None]; return inner * (1 - t) + outer * t, np.ones((h, w))
    return np.broadcast_to(inner, (h, w, 3)), np.clip(1 - d / fade, 0, 1)

def layer(canvas, left, top, width, height, rgb, alpha, opacity, mask=None, flip=False):
    """screen one layer onto the canvas; geometry in fractions of the box, like the CSS percentages"""
    x0, y0, w, h = round(left * W), round(top * H), round(width * W), round(height * H)
    a = alpha * opacity
    if mask:
        m = Image.open(mask).split()[-1].resize((w, h), Image.LANCZOS)
        if flip: m = m.transpose(Image.FLIP_LEFT_RIGHT)
        a = a * (np.asarray(m, float) / 255)
    light = rgb * a[..., None]
    cx0, cy0, cx1, cy1 = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
    sub = light[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    reg = canvas[cy0:cy1, cx0:cx1]
    canvas[cy0:cy1, cx0:cx1] = 1 - (1 - reg) * (1 - sub)

for n, style in enumerate(seams, 1):
    v = dict(re.findall(r'--([\w-]+):([^;]+)', style))
    c1, c2 = hexrgb(v['c1']), hexrgb(v['c2'])
    m1, m2 = re.search(r'url\(([^)]+)\)', v['m1']).group(1), re.search(r'url\(([^)]+)\)', v['m2']).group(1)
    mix = lambda a, b, p: a * p + b * (1 - p)
    cv = np.zeros((H, W, 3))
    w, h = round(1.18 * W), round(.36 * H); rgb, al = radial(w, h, .6, .8, c1, mix(c1, c2, .55))
    layer(cv, -.08, .38, 1.18, .36, rgb, al, .42, m1)
    w, h = round(1.06 * W), round(.30 * H); rgb, al = radial(w, h, .6, .8, c2, mix(c2, c1, .55))
    layer(cv, -.02, .30, 1.06, .30, rgb, al, .30, m2, flip=True)
    w, h = round(.6 * W), round(.4 * H); rgb, al = radial(w, h, .5, .5, mix(c1, c2, .5), None, fade=.7)
    layer(cv, .20, .30, .60, .40, rgb, al, .2)
    a = cv.max(axis=2)
    col = np.where(a[..., None] > 1e-4, cv / np.maximum(a, 1e-4)[..., None], 0)
    out = np.dstack([col, a]) * 255
    Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8), 'RGBA').save(f'seams/seam-{n}.webp', quality=82, method=6)
    print(f'seams/seam-{n}.webp', os.path.getsize(f'seams/seam-{n}.webp') // 1024, 'KB')
