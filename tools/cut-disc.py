"""cut-disc.py — the KV's galaxy (top right of the KV; the client's layer, client-bgs parts/galaxy-veil.webp) lifted off its
dark ground for the section joins: its light becomes its own alpha (the dark sky around it goes clear), feathered to an
ellipse along its tilt. Writes sky/disc.webp. Run from diwaliv4/: python3 tools/cut-disc.py"""
import numpy as np
from PIL import Image
g = Image.open('sky/galaxy-veil.webp').convert('RGBA')
W, H = g.size
crop = g.crop((int(W * .16), 0, int(W * .82), int(H * .82)))
a = np.asarray(crop).astype(np.float32) / 255
rgb = a[..., :3]; L = rgb @ np.array([.3, .5, .2], np.float32)
base = np.percentile(L, 30)
al = np.clip((L - base) / .35, 0, 1) ** .9
h, w = L.shape; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
cx, cy = w * .48, h * .42; ang = np.radians(24)                   # the galaxy's own tilt in the KV
u = ((xx - cx) * np.cos(ang) + (yy - cy) * np.sin(ang)) / (w * .5)
v = (-(xx - cx) * np.sin(ang) + (yy - cy) * np.cos(ang)) / (h * .36)
r = np.hypot(u, v); al *= np.clip((1 - r) / .45, 0, 1) ** 1.3
rgb = np.clip(rgb / np.maximum(al[..., None], .05) * al[..., None] * 1.15, 0, 1)
Image.fromarray((np.dstack([rgb, al]) * 255 + .5).astype(np.uint8), 'RGBA').save('sky/disc.webp', quality=88, method=6, alpha_quality=90)
print('disc', crop.size)
