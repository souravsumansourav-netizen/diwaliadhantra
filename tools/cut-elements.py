"""cut-elements.py — the flora and fauna of Celestial Imprints' sky, cut out of real product photographs (no drawing).
Run from _wip-glow/: python3 tools/cut-elements.py  → glow/el/*.webp (transparent, soft-edged).
Each cut: source, crop box (px), feathered sides (px of fade where the motif was joined to the rest of the piece),
an optional ellipse feather, and the longest side to save at. The blossom has no alpha in its source (a deck slide),
so it is lifted out by colour: its cream petals, their holes filled (the coral centre), the one piece that holds the centre."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
import os
HOME = os.path.expanduser('~')
OUT = 'glow/el'
os.makedirs(OUT, exist_ok=True)

def feather(a, fade, ell):
    h, w = a.shape; m = np.ones((h, w))
    y, x = np.mgrid[0:h, 0:w].astype(float)
    for side, px in fade.items():
        d = {'t': y, 'b': h - 1 - y, 'l': x, 'r': w - 1 - x}[side]
        m *= np.clip(d / px, 0, 1) ** 1.5
    if ell:   # soft ellipse: 1 inside `ell` of the radius, 0 at the edge
        r = np.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)); m *= np.clip((1 - r) / (1 - ell), 0, 1) ** 1.5
    return a * m

def save(im, name, size):
    a = np.asarray(im.getchannel('A'))
    ys, xs = np.nonzero(a > 6); p = 4
    im = im.crop((max(0, xs.min() - p), max(0, ys.min() - p), min(im.width, xs.max() + p + 1), min(im.height, ys.max() + p + 1)))
    k = size / max(im.size)
    if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp', quality=86, method=6, alpha_quality=90)
    print(name, im.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB')

CUTS = [  # name, source, box, feathered sides, ellipse, save size
    ('peacocks', 'nas/p/p06.webp', (58, 283, 278, 567), {'t': 9}, None, 300),        # Ruby Dusk Pendant: two peacocks facing
    ('fan', 'nas/p/r02.webp', (0, 0, 262, 205), {'b': 22}, None, 300),                # Chandbali: the peacock-fan crest
    ('lotus', 'nas/p/c06.webp', (262, 575, 540, 752), {}, None, 320),                   # Starfall Necklace: the gold lotus
    ('bud', 'nas/p/c02.webp', (612, 266, 756, 408), {}, .78, 220),    # Blush Stone Necklace: a pink bud
    ('leaf', 'nas/p/c02.webp', (708, 180, 822, 304), {}, .8, 220),   # Blush Stone Necklace: a gold leaf-curl
    ('rosette', 'nas/p/r03.webp', None, {}, None, 176),                                # Rosette Stud: a polki flower
    ('bloom', 'nas/p/m02.webp', (8, 66, 262, 340), {}, .9, 300),                       # Night Medallion: the blue enamel bloom
]
LOTUS = [(350, 748), (300, 716), (280, 688), (284, 664), (318, 660), (334, 640), (336, 604), (362, 616), (382, 640), (398, 588),
         (416, 640), (436, 616), (462, 602), (466, 640), (484, 660), (526, 652), (530, 672), (512, 700), (470, 722), (446, 748)]
for name, src, box, fade, ell, size in CUTS:
    im = Image.open(src).convert('RGBA')
    if box: im = im.crop(box)
    arr = np.asarray(im).astype(float)
    arr[..., 3] = feather(arr[..., 3], fade, ell)
    if name == 'lotus':   # the lotus grows out of scrolls and stones: keep only its seven petals (a traced outline, softened)
        from PIL import ImageDraw
        m = Image.new('L', im.size, 0); ox, oy = box[:2]
        ImageDraw.Draw(m).polygon([(x - ox, y - oy) for x, y in LOTUS], fill=255)
        arr[..., 3] *= np.asarray(m.filter(ImageFilter.GaussianBlur(2.5))) / 255
        lum = arr[..., :3].mean(-1) / 255; arr[..., 3] *= np.clip((lum - .14) / .16, 0, 1)   # and the dark gaps between them
    save(Image.fromarray(arr.clip(0, 255).astype('uint8')), name, size)

# the cream blossom with its coral heart, from the "Cosmic Fauna & Flora" necklace on the client's slide
src = Image.open(f'{HOME}/Downloads/flora_fauna.png').convert('RGB').crop((778, 378, 862, 452))
src = src.resize((src.width * 4, src.height * 4), Image.LANCZOS)
hsv = np.asarray(src.convert('HSV')).astype(float) / 255
rgb = np.asarray(src).astype(float)
cream = (hsv[..., 1] < .56) & (hsv[..., 2] > .80)   # cream petals: pale and bright; the gold is saturated, the slide's ground dark
lab, n = nd.label(cream); cy, cx = 105, 190                                        # the coral heart, at 4x
yy, xx = np.mgrid[0:cream.shape[0], 0:cream.shape[1]]
keep = np.hypot(yy - cy, xx - cx) < 60                                                   # the heart and its gold setting
for i, (sz, (py, px)) in enumerate(zip(nd.sum(cream, lab, range(1, n + 1)), nd.center_of_mass(cream, lab, range(1, n + 1)))):
    if sz > 800 and np.hypot(py - cy, px - cx) < 125: keep |= lab == i + 1               # the five petals round it
keep = nd.binary_opening(nd.binary_fill_holes(nd.binary_closing(keep, iterations=9)), iterations=3)   # smooth the petal rims
a = np.asarray(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(2.2))).astype(float)
save(Image.fromarray(np.dstack([rgb, a]).clip(0, 255).astype('uint8')), 'blossom', 240)
