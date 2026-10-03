"""bake-clouds.py — the gas between the sections: three layers of nebular gas per seam (the Mriganka way of layering,
in gas rather than cloud), each a strip that wraps left to right so the page can slide copies of it end to end:
  back   a wide haze, farthest
  mid    the body of the gas, dense
  front  a thinner bank, nearest
The gas is real: random stretches of the gas banks of the appointment (appt/gas-plum, gas-gold-rose), each cropped,
flipped and scaled at random, laid end to end with cross-fades into a strip long enough not to repeat on screen, its end
faded into its start so it wraps (so no two seams or layers are alike), and recoloured into the tints of the two sections the seam joins: the gas's own
light runs from a deep tinted body to glowing cores, with a slight gradient from the section above to the one below.
Writes seams/cloud-N-{back,mid,front}.webp. Run from diwaliv3/: python3 tools/bake-clouds.py"""
import os
import numpy as np
from PIL import Image

H = 440
SEAMS = [('#7b5cc4', '#5e4aa8'), ('#6a52b0', '#5a3c90'), ('#6c4a86', '#7a3e6a'), ('#7c4a6a', '#6a4638'), ('#4c3a7a', '#3a3e8a'),
         ('#3e3a86', '#5a4898'), ('#6a4e96', '#8a4c62'), ('#8a4e5c', '#8c5a34'), ('#8c6236', '#7a5a44')]
SOURCES = ['appt/gas-plum.webp', 'appt/gas-gold-rose.webp']   # (the aurora banks have a curtain edge inside: not gas enough)
GROUND = np.array([18, 14, 27]) / 255
os.makedirs('seams', exist_ok=True)

def rgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)]) / 255

def trim(im):
    """the gas only: crop away empty rows and columns"""
    a = np.asarray(im)[..., 3]; ys = np.where(a.max(1) > 8)[0]; xs = np.where(a.max(0) > 8)[0]
    return im.crop((xs[0], ys[0], xs[-1] + 1, ys[-1] + 1))

SRC = [trim(Image.open(f).convert('RGBA')) for f in SOURCES]

def piece(rng, height_frac):
    """one random stretch of a gas bank: a crop, flipped either way at random, a little taller or shorter, soft at top and foot"""
    im = SRC[rng.integers(len(SRC))]
    cw = int(im.width * rng.uniform(.4, .75)); cx = int(rng.uniform(0, im.width - cw))
    im = im.crop((cx, 0, cx + cw, im.height))
    h = min(H, int(H * height_frac * rng.uniform(.8, 1.05))); w = int(im.width * h / im.height * rng.uniform(.9, 1.3))
    im = im.resize((w, h), Image.LANCZOS)
    if rng.random() < .5: im = im.transpose(Image.FLIP_TOP_BOTTOM)
    if rng.random() < .5: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im, float) / 255
    yy = np.linspace(0, 1, h)[:, None]
    a[..., 3] *= np.clip(yy / .22, 0, 1) ** 1.5 * np.clip((1 - yy) / .22, 0, 1) ** 1.5
    out = np.zeros((H, w, 4)); y0 = (H - h) // 2 + int(rng.uniform(-.1, .1) * H)
    y0 = max(0, min(H - h, y0)); out[y0:y0 + h] = a
    return out

def strip(rng, height_frac, target=2400):
    """random stretches end to end, each cross-faded into the next over a third of its width, until the strip is long
    enough that nothing repeats on screen; the end then fades into the start, so it wraps"""
    ps = []
    while sum(p.shape[1] * 2 // 3 for p in ps) < target: ps.append(piece(rng, height_frac))
    W = sum(p.shape[1] * 2 // 3 for p in ps)
    acc = np.zeros((H, W, 4)); wsum = np.zeros((1, W, 1)); x = 0
    for p in ps:
        pw = p.shape[1]; F = pw // 3
        ramp = np.minimum(1, np.minimum(np.arange(pw) + 1, pw - np.arange(pw)) / F)[None, :, None]
        xs = (np.arange(pw) + x) % W                                  # past the end it wraps to the start
        np.add.at(acc, (slice(None), xs), p * ramp); np.add.at(wsum, (slice(None), xs), ramp)
        x += pw * 2 // 3
    g = acc / np.maximum(wsum, 1e-6)
    return g

LAYERS = {  # height of the bank in the strip, opacity, how bright
    'back':  dict(height=1.0, op=.8, lift=.75),
    'mid':   dict(height=.85, op=1.0, lift=1.05),
    'front': dict(height=.6, op=.9, lift=1.15),
}

for n, (t, b) in enumerate(SEAMS, 1):
    c1, c2 = rgb(t), rgb(b)
    glow = np.clip((c1 + c2) / 2 * 1.6 + np.array([.2, .14, .18]), 0, 1)     # the bright cores, in the same tints
    for li, (layer, p) in enumerate(LAYERS.items()):
        rng = np.random.default_rng(n * 101 + li * 13)
        g = strip(rng, p['height'])
        lum = (g[..., :3] @ np.array([.299, .587, .114]))[..., None]   # the gas's own light
        lum = lum / max(lum[g[..., 3] > .3].mean(), 1e-3) * .5
        Y = np.linspace(0, 1, H)[:, None, None]
        tint = c1 * (1 - Y) + c2 * Y                                  # the slight gradient, section above to below
        col = GROUND * .35 + tint * np.clip(lum * 1.3, .25, 1.1)       # a deep tinted body where the gas is dim
        col = col + glow * np.clip(lum - .55, 0, 1) ** 1.5 * .8       # glowing where it is bright
        col = col * p['lift'] + GROUND * max(0, 1 - p['lift'])
        a = np.clip((g[..., 3] * 1.5) ** .8 * p['op'], 0, .97)         # dense: the gas is nearly opaque where it is thick
        img = np.dstack([np.clip(col, 0, 1), a]) * 255
        Image.fromarray((img + .5).astype(np.uint8), 'RGBA').save(f'seams/cloud-{n}-{layer}.webp', quality=82, method=6)
    print(n, *(Image.open(f'seams/cloud-{n}-{l}.webp').size for l in LAYERS))
