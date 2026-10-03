"""bake-nas-blue.py — Name a Star's sky, cooler and bluer: the Milky Way plate (nas/nas-sky-desktop.webp,
nas-sky-phone.webp) recoloured to one blue the way calm-bgs' "quiet Milky Way" is (its light becomes haze-blue, its warm
parts lean lavender, over a night-to-midnight ground), with its real stars kept crisp. Same sizes as the originals, so
the sky field and its stars keep their places. Writes nas/nas-sky-blue.webp and nas/nas-sky-blue-phone.webp.
Run from diwaliv3/: python3 tools/bake-nas-blue.py"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

def hx(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
NIGHT, NAVY, MID, HAZE, LAV, ICE = hx('070B1A'), hx('0B1430'), hx('142552'), hx('3A5CA8'), hx('8A84D6'), hx('E2ECFF')

for src_name, out_name in (('nas/nas-sky-desktop.webp', 'nas/nas-sky-blue.webp'), ('nas/nas-sky-phone.webp', 'nas/nas-sky-blue-phone.webp')):
    src = np.asarray(Image.open(src_name).convert('RGB')).astype(np.float32) / 255
    H, W = src.shape[:2]
    y = np.linspace(0, 1, H)[:, None, None]
    ground = np.where(y < .5, NIGHT * (1 - y * 2) + NAVY * (y * 2), NAVY * (2 - y * 2) + MID * (y * 2 - 1))   # night, navy, midnight
    L = src @ np.array([.2126, .7152, .0722], np.float32); Ls = nd.gaussian_filter(L, 1.0)
    t = np.clip((Ls - np.percentile(Ls, 4)) / (np.percentile(Ls, 99.6) - np.percentile(Ls, 4)), 0, 1)
    hue = np.clip(nd.gaussian_filter(src[..., 0] - src[..., 2], 8) * 4 + .5, 0, 1)[..., None]   # warm parts to lavender, cool to blue
    light = HAZE * (1 - hue * .6) + LAV * hue * .6
    sky = ground + t[..., None] ** 1.15 * light * .62
    stars = np.clip(L - nd.gaussian_filter(L, 3), 0, 1)[..., None] * 2.6 * ICE   # the real stars, crisp
    out = np.clip(sky + stars, 0, 1)
    out += np.random.default_rng(3).normal(0, .7 / 255, out.shape)            # a light dither, so the gradients don't band
    Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)).save(out_name, quality=86, method=6)
    print(out_name, W, 'x', H)
