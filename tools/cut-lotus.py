"""cut-lotus.py — the pink-enamel flowers of the "Beauty Of Flora" necklace (the client's slide, kept as
tools/src-beauty-of-flora.webp), cut out for Celestial Imprints' sky: each flower is found by its pink enamel, its holes
filled, grown a few px to take its gold rim, and feathered. Writes glow/el/lotus-*.webp.
Run from diwaliv3/: python3 tools/cut-lotus.py"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
from scipy.spatial import ConvexHull
from PIL import ImageDraw

def convex_hull_image(m):
    ys, xs = np.nonzero(m); pts = np.c_[xs, ys]; v = pts[ConvexHull(pts).vertices]
    im = Image.new('L', (m.shape[1], m.shape[0]), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in v], fill=255)
    return np.asarray(im) > 0

src = Image.open('tools/src-beauty-of-flora.webp').convert('RGB')
CUTS = {'lotus-top': (425, 266, 552, 336), 'lotus-l': (334, 304, 402, 376), 'lotus-r': (571, 304, 640, 376), 'lotus-fan': (325, 588, 422, 656)}
for name, box in CUTS.items():
    im = src.crop(box); im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
    rgb = np.asarray(im).astype(float); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pink = (r > 150) & (b > 105) & (r > g + 8) & (r - b < 95) & (g > 115)            # the enamel: rosy and light (gold has little blue, the purple leaves little red)
    pink = nd.binary_opening(pink, iterations=2)
    lab, n = nd.label(pink); sizes = nd.sum(pink, lab, range(1, n + 1))   # the enamel's cells (each box holds one flower)
    cells = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
    keep = convex_hull_image(cells)                                       # a lotus is a fan: its hull is its outline
    keep = nd.binary_dilation(keep, iterations=16)                        # its gold rim
    a = np.asarray(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(5))).astype(float)
    out = Image.fromarray(np.dstack([rgb, a]).clip(0, 255).astype('uint8')).filter(ImageFilter.UnsharpMask(3, 50, 2))
    bb = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); out = out.crop(bb)
    out.save(f'glow/el/{name}.webp', quality=86, method=6, alpha_quality=90); print(name, out.size)
