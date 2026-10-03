"""bake-dust.py — the two sheets of gold dust that fly past in front of the page (fx.js), as images: a square tile of
flat gold specks that wraps at its edges, repeated into a sheet a few tiles wide and tall, so the page can slide the
sheet by whole tiles and never show a seam. Run from diwaliv3/: python3 tools/bake-dust.py"""
import numpy as np
from PIL import Image

def tile(size, n, rmin, rmax, amin, amax, seed):
    s = seed
    def rnd():
        nonlocal s; s = (s * 16807) % 2147483647; return s / 2147483647
    img = np.zeros((size, size, 4))
    y, x = np.mgrid[0:size, 0:size] + .5
    for _ in range(n):
        cx, cy, r, a, warm = rnd() * size, rnd() * size, rmin + rnd() * (rmax - rmin), amin + rnd() * (amax - amin), rnd()
        col = np.array([255, 214, 150] if warm < .7 else [255, 244, 226]) / 255
        dx = (x - cx + size / 2) % size - size / 2; dy = (y - cy + size / 2) % size - size / 2   # wraps at the edges
        t = np.clip(np.sqrt(dx * dx + dy * dy) / r, 0, 1)
        al = np.where(t < .45, 1 - t / .45 * .45, .55 * (1 - (t - .45) / .55)) * a * (t < 1)
        # "over": the speck on top of what is there
        out_a = al + img[..., 3] * (1 - al)
        img[..., :3] = np.where(out_a[..., None] > 0, (col * al[..., None] + img[..., :3] * img[..., 3:] * (1 - al[..., None])) / np.maximum(out_a, 1e-6)[..., None], 0)
        img[..., 3] = out_a
    return img

# the near sheet's specks are soft, so it is baked at half size and shown at twice (tile 380 → 760 css px)
for name, size, n, rmin, rmax, amin, amax, seed, nx, ny in [('far', 520, 34, 1, 2.6, .35, .8, 7, 4, 4), ('near', 380, 9, 2.5, 8, .06, .16, 19, 3, 3)]:
    t = tile(size, n, rmin, rmax, amin, amax, seed)
    sheet = np.tile(t, (ny, nx, 1))
    Image.fromarray(np.clip(sheet * 255 + .5, 0, 255).astype(np.uint8), 'RGBA').save(f'fx/dust-{name}.webp', lossless=True, method=6)
    print(f'fx/dust-{name}.webp', sheet.shape[1], 'x', sheet.shape[0])
