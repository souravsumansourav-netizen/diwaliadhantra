"""bake-glow.py — the pictures of Celestial Imprints' two stages. Run from _wip-glow/: python3 tools/bake-glow.py
  glow/moon.webp            the full moon behind Crescendance: the real moon photograph from the client's reference slide
                            (14.webp, the only full-disc moon on disk at a usable size), found by its brightness, cut round, soft rim
  glow/halo-dust-a|b.webp   the golden halo: two rings of gold dust (a scatter of specks along a circle, a few brighter glints),
                            different seeds so the two can cross-fade into a slow sparkle; the thin line itself is CSS
  glow/el/blossom-soft.webp the one big background flower: the cream blossom (glow/el/blossom.webp) clear, far back (tripled in the page)"""
import os, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
REF = '/private/tmp/claude-501/-Users-vijetakumari-Desktop-Repository/be0a4260-0df7-4761-9af9-09c32af68a22/images/14.webp'

# ---- the moon: the largest bright round thing on the slide ----
im = Image.open(REF).convert('RGB'); a = np.asarray(im).astype(float)
lum = a.mean(-1); m = nd.binary_opening(lum > 150, iterations=3)
lab, n = nd.label(m); big = lab == 1 + int(np.argmax(nd.sum(m, lab, range(1, n + 1))))
# fit a circle to the rim's upper half (the necklace touches its foot): least squares on x²+y² = 2ax+2by+c
big = nd.binary_fill_holes(big); edge = big & ~nd.binary_erosion(big); ys, xs = np.nonzero(edge); k = ys < np.median(ys)
A = np.c_[2 * xs[k], 2 * ys[k], np.ones(k.sum())]; (cx, cy, c), *_ = np.linalg.lstsq(A, xs[k] ** 2 + ys[k] ** 2, rcond=None)
r = np.sqrt(c + cx * cx + cy * cy) - 4
S = int(r * 2 + 8); box = (int(cx - S / 2), int(cy - S / 2)); disc = im.crop((box[0], box[1], box[0] + S, box[1] + S)).convert('RGBA')
yy, xx = np.mgrid[0:S, 0:S]; d = np.hypot(xx - (cx - box[0]), yy - (cy - box[1]))
arr = np.asarray(disc).astype(float); arr[..., 3] = np.clip((r - d) / 2.5, 0, 1) * 255
Image.fromarray(arr.astype('uint8')).save('glow/moon.webp', quality=88, method=6)
print('moon', S, 'px, r', round(r, 1), 'at', round(cx), round(cy))

# ---- the golden halo's dust ----
def dust(seed, N=1200, R=560):
    rng = np.random.default_rng(seed); W = N
    lay = np.zeros((W, W, 4))
    def speck(x, y, s, al, col):
        x0, y0 = int(x - 3 * s), int(y - 3 * s); x1, y1 = int(x + 3 * s) + 2, int(y + 3 * s) + 2
        if x0 < 0 or y0 < 0 or x1 >= W or y1 >= W: return
        gy, gx = np.mgrid[y0:y1, x0:x1]; g = np.exp(-((gx - x) ** 2 + (gy - y) ** 2) / (2 * s * s)) * al
        for c in range(3): lay[y0:y1, x0:x1, c] = np.maximum(lay[y0:y1, x0:x1, c], col[c] * (g > 0))
        lay[y0:y1, x0:x1, 3] = 1 - (1 - lay[y0:y1, x0:x1, 3]) * (1 - g)
    for k in range(9000):   # most of the dust hugs the line; some drifts off it, more outward than in
        t = rng.uniform(0, 2 * np.pi); off = rng.normal(0, 12) if rng.random() < .65 else rng.normal(14, 40)
        s = rng.choice([.55, .75, 1.0, 1.4], p=[.45, .3, .18, .07]); al = rng.uniform(.25, 1) * (1 if abs(off) < 20 else .6)
        col = [(255, 206, 120), (255, 226, 160), (236, 180, 90), (255, 240, 200)][rng.integers(4)]
        speck(W / 2 + (R + off) * np.cos(t), W / 2 + (R + off) * np.sin(t), s, al, col)
    for k in range(26):     # a few brighter glints
        t = rng.uniform(0, 2 * np.pi); speck(W / 2 + R * np.cos(t), W / 2 + R * np.sin(t), 2.4, .9, (255, 246, 222))
    out = Image.fromarray((lay * [1, 1, 1, 255]).clip(0, 255).astype('uint8'), 'RGBA').resize((1000, 1000), Image.LANCZOS)
    return out
for k, seed in (('a', 7), ('b', 19)):
    dust(seed).save(f'glow/halo-dust-{k}.webp', quality=82, method=6); print('halo-dust', k, os.path.getsize(f'glow/halo-dust-{k}.webp') // 1024, 'KB')

# ---- the big flower: the cream blossom (glow/el/blossom.webp, from the "Cosmic Fauna & Flora" necklace), tripled and softened ----
bl = Image.open('glow/el/blossom.webp'); bl = bl.resize((600, round(600 * bl.height / bl.width)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.7)).filter(ImageFilter.UnsharpMask(3, 60, 2))   # clear enough to read as a flower
bl.save('glow/el/blossom-soft.webp', quality=80, method=6); print('blossom-soft', bl.size)
