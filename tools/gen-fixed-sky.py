"""gen-fixed-sky.py — layer 1 of the page's world: ONE fixed sky behind everything below the hero (it does not scroll).
The Milky Way arching across the night ("the tear"), from our earlier plate (~/Downloads/diwali/assets/
milkyway-night-sky-master-final.png, 6516x2172), recoloured into the KV's palette: deep violet night, the band in magenta
and rose with warm gold-pink light in its brightest dust, a rose glow low down as in the KV. Layer 2 (planets, meteors,
twinkles, light) is placed over it in the page and moves on its own.
Writes sky/fixed-sky.webp (2560x1440) and sky/fixed-sky-phone.webp (1080x2340).
Run from diwaliv4/: python3 tools/gen-fixed-sky.py [out-dir]"""
import os, sys
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
OUT = sys.argv[1] if len(sys.argv) > 1 else 'sky'
src = Image.open(os.path.expanduser('~/Downloads/diwali/assets/milkyway-night-sky-master-final.png')).convert('RGB')
f32 = lambda c: np.array(c, np.float32)


def grade(im):
    a = np.asarray(im).astype(np.float32) / 255
    L = a @ f32([.3, .5, .2])
    L = np.clip((L - .03) / .55, 0, 1) ** 1.35                                   # deep night, a bright band
    # the KV's palette by light: night violet -> plum -> magenta -> rose -> warm blush -> soft gold-white
    stops = [(0, f32([.035, .02, .085])), (.08, f32([.09, .045, .2])), (.22, f32([.26, .09, .4])), (.42, f32([.6, .2, .58])),
             (.66, f32([.95, .5, .68])), (1, f32([1, .9, .8]))]
    out = np.zeros(L.shape + (3,), np.float32)
    for (a0, c0), (a1, c1) in zip(stops, stops[1:]):
        t = np.clip((L - a0) / (a1 - a0), 0, 1)[..., None]; m = ((L >= a0) & ((L < a1) | (a1 == 1)))[..., None]
        out = np.where(m, c0 * (1 - t) + c1 * t, out)
    # keep the original's own colour variety a little (stars stay white, dust keeps texture)
    sat = a.max(-1) - a.min(-1)
    out = out * .92 + a * .08 * (1 + sat[..., None])
    H, W = L.shape
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    out += f32([.3, .08, .18]) * np.clip((y - .6) / .4, 0, 1) ** 1.8 * .7             # the KV's rose glow, low down

    return Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8))


src = src.rotate(-21, resample=Image.BICUBIC, expand=False)          # the band on the KV's diagonal (rising to the right)
SW, SH = src.size
# desktop: the middle of the arch, 16:9
ch = round(SH * .52); cw = round(ch * 16 / 9); x0 = (SW - cw) // 2 + round(SW * .03); y0 = (SH - ch) // 2 + round(SH * .07)   # the band across the middle, upper left to lower right
grade(src.crop((x0, y0, x0 + cw, y0 + ch)).resize((2560, 1440), Image.LANCZOS)).save(os.path.join(OUT, 'fixed-sky.webp'), quality=84, method=6)
# phone: a tall slice where the band crosses diagonally (left half of the arch), 1080x2340
ph = round(SH * .7); pw = round(ph * 1080 / 2340); px = round(SW * .42); py = (SH - ph) // 2
grade(src.crop((px, py, px + pw, py + ph)).resize((1080, 2340), Image.LANCZOS)).save(os.path.join(OUT, 'fixed-sky-phone.webp'), quality=84, method=6)
print('fixed sky written to', OUT)
