"""build-hero.py — v4's hero from the client's KV (PT 677 TANISHQ 01, 9552x5042 CMYK; ~/Downloads/Tanishq-KV-5200px.png is it
in sRGB). Two client-side files: the sky with her removed (Canva Magic Eraser, ~/Downloads/diwali_bg1.png, 1920x1013) and
her cut out (Adobe Remove Background, ~/Downloads/Tanishq-KV-5200px_nobg.png). All three share the KV's frame, so every
layer is placed in the same 1920x1013 stage. Writes hero/:
  sky.webp            the sky, its planets lifted out and the holes filled (far layer)
  planet-N.webp       the planets as their own pieces (middle layer), with hero/planets.json (where each sits, in %)
  lady.webp           her (near layer)
  jewels.webp         her jewellery alone (lit in by the stardust), with jewels.json: the dust's targets (%), and the hair
                      points the twinkles sit on
Run from diwaliv4/: python3 tools/build-hero.py"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
DL = os.path.expanduser('~/Downloads')
os.makedirs('hero', exist_ok=True)

sky = np.asarray(Image.open(f'{DL}/diwali_bg1.png').convert('RGB')).astype(np.float32) / 255
SH, SW = sky.shape[:2]

# ---------- the planets: lifted out of the sky (soft-edged), the sky filled in under them ----------
# (centre x, y, half-width, half-height) in the 1920x1013 sky; the ringed one is wide for its rings
PL = [(109, 242, 66, 66), (242, 534, 50, 50), (989, 503, 26, 26), (1857, 474, 76, 46), (1834, 664, 22, 22)]
yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
hole = np.zeros((SH, SW), np.float32); meta = []
for i, (cx, cy, hw, hh) in enumerate(PL):
    r = np.hypot((xx - cx) / hw, (yy - cy) / hh)
    m = np.clip((1.0 - r) / .12, 0, 1)                                  # soft rim
    x0, y0, x1, y1 = max(0, cx - hw), max(0, cy - hh), min(SW, cx + hw), min(SH, cy + hh)
    piece = np.dstack([sky[y0:y1, x0:x1], m[y0:y1, x0:x1]])
    Image.fromarray((piece * 255 + .5).astype(np.uint8), 'RGBA').resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.LANCZOS) \
        .save(f'hero/planet-{i}.webp', quality=88, method=6, alpha_quality=90)
    meta.append({'left': round(x0 / SW * 100, 3), 'top': round(y0 / SH * 100, 3), 'width': round((x1 - x0) / SW * 100, 3)})
    hole = np.maximum(hole, np.clip((1.22 - r) / .14, 0, 1))
# fill: normalised blur of the sky around each hole, repeated so the fill reaches the middle; then fine noise and stars
filled = sky.copy(); known = 1 - hole
for s in (6, 14, 30):
    w = nd.gaussian_filter(known, s); acc = np.stack([nd.gaussian_filter(sky[..., c] * known, s) for c in range(3)], -1)
    est = acc / np.maximum(w[..., None], 1e-4)
    filled = filled * known[..., None] + est * (1 - known[..., None]) * (w[..., None] > .02) + filled * (1 - known[..., None]) * (w[..., None] <= .02)
filled += np.random.default_rng(3).normal(0, 2 / 255, filled.shape) * hole[..., None]
filled = sky * (1 - hole[..., None]) + filled * hole[..., None]
Image.fromarray((np.clip(filled, 0, 1) * 255 + .5).astype(np.uint8)).save('hero/sky.webp', quality=86, method=6)
json.dump(meta, open('hero/planets.json', 'w'))
print('sky + planets', meta)

# ---------- her ----------
lady = Image.open(f'{DL}/Tanishq-KV-5200px_nobg.png').convert('RGBA')
LW, LH = lady.size
a = np.asarray(lady).astype(np.float32) / 255
# a small planet the cut-out caught at the veil's far left: out
ly, lx = np.mgrid[0:LH, 0:LW].astype(np.float32)
cx, cy, r = 118 / 1100 * LW, 410 / 581 * LH, 32 / 1100 * LW
a[..., 3] *= np.clip((np.hypot(lx - cx, ly - cy) - r) / (r * .25), 0, 1)
OUTW = 3200; scale = OUTW / LW
Image.fromarray((a * 255 + .5).astype(np.uint8), 'RGBA').resize((OUTW, round(LH * scale)), Image.LANCZOS) \
    .save('hero/lady.webp', quality=86, method=6, alpha_quality=88)

# ---------- her jewellery: the gold, found by its colour inside her ----------
q = Image.fromarray((a * 255).astype(np.uint8), 'RGBA').resize((1600, round(LH * 1600 / LW)), Image.LANCZOS)
qa = np.asarray(q).astype(np.float32) / 255; QH, QW = qa.shape[:2]
rgb = qa[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-4)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
hue = np.degrees(np.arctan2(np.sqrt(3) * (g_ - b_), 2 * r_ - g_ - b_)) % 360
gold = (qa[..., 3] > .9) & (hue > 26) & (hue < 66) & (sat > .32) & (mx > .3) & (r_ > b_ + .16) & (g_ > b_ + .05)
gold = nd.binary_opening(gold, iterations=1)
lab, n = nd.label(nd.binary_closing(gold, iterations=4)); sizes = nd.sum(gold, lab, range(1, n + 1))
gold &= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 25])          # the pieces, not stray warm pixels on skin
gm = nd.binary_dilation(gold, iterations=2)
jm = np.asarray(Image.fromarray((gm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
jl = np.dstack([rgb, jm * qa[..., 3]])
Image.fromarray((jl * 255 + .5).astype(np.uint8), 'RGBA').save('hero/jewels.webp', quality=88, method=6, alpha_quality=90)
ys, xs = np.nonzero(gold); rr = np.random.default_rng(7); pick = rr.choice(len(xs), min(900, len(xs)), replace=False)
targets = [[round(float(xs[i]) / QW, 4), round(float(ys[i]) / QH, 4)] for i in pick]
# the hair: dark, inside her, in the upper part of the figure; the twinkles sit here
lum = rgb @ np.array([.299, .587, .114], np.float32)
hair = (qa[..., 3] > .95) & (lum < .2) & (np.arange(QH)[:, None] < QH * .62) & (np.arange(QW)[None] < QW * .5)
hair = nd.binary_erosion(hair, iterations=3)
hy, hx = np.nonzero(hair); hp = rr.choice(len(hx), min(46, len(hx)), replace=False)
twinkles = [[round(float(hx[i]) / QW, 4), round(float(hy[i]) / QH, 4)] for i in hp]
json.dump({'targets': targets, 'hair': twinkles}, open('hero/jewels.json', 'w'))
print('gold px', int(gold.sum()), 'targets', len(targets), 'hair pts', len(twinkles))
# the dust's targets and the hair points, as a script the page bundles (no fetch)
open('hero/hero-data.js', 'w').write('/* hero-data.js — written by tools/build-hero.py: where the stardust lands on her jewellery and where the twinkles sit in her hair, as fractions of the KV frame */\nwindow.HERO_DATA=' + json.dumps({'targets': targets, 'hair': twinkles}) + ';\n')
