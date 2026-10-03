"""bake-ltf-warm.py — Light Becomes Form's sky (cosmos/ltf-sky*.webp, the user's blue night) with its nebula warmed:
the gas turns plum-purple and, in slow drifting patches, amber gold, over a deep aubergine-navy ground; the real stars
stay crisp and white. Same sizes. Writes cosmos/ltf-sky-warm.webp and ltf-sky-warm-phone.webp.
Run from diwaliv3/: python3 tools/bake-ltf-warm.py"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

def hx(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
GROUND_T, GROUND_B = hx('0E0A1E'), hx('1A1233')
PURPLE, ORCHID, AMBER, GOLD = hx('6A3F9E'), hx('9A6CC8'), hx('B06A2E'), hx('E0A85A')

for src_name, out_name in (('cosmos/ltf-sky.webp', 'cosmos/ltf-sky-warm.webp'), ('cosmos/ltf-sky-phone.webp', 'cosmos/ltf-sky-warm-phone.webp')):
    src = np.asarray(Image.open(src_name).convert('RGB')).astype(np.float32) / 255
    H, W = src.shape[:2]
    L = src @ np.array([.2126, .7152, .0722], np.float32)
    stars = np.clip(L - nd.gaussian_filter(L, 3), 0, 1)                       # the real stars
    gas = nd.gaussian_filter(L, 2) - stars * .5
    t = np.clip((gas - np.percentile(gas, 3)) / (np.percentile(gas, 99.5) - np.percentile(gas, 3)), 0, 1)
    y = np.linspace(0, 1, H)[:, None, None]
    ground = GROUND_T * (1 - y) + GROUND_B * y
    # where the gas goes gold: a slow random field, biased to the brighter gas (gold in the glow, purple in the veils)
    rng = np.random.default_rng(11); s = max(H, W) / 7
    field = nd.gaussian_filter(rng.normal(0, 1, (H, W)).astype(np.float32), s); field = (field - field.min()) / (np.ptp(field) + 1e-6)
    warm = np.clip((field - .38) * 2.6, 0, 1) * np.clip(t * 1.6, 0, 1)
    warm = nd.gaussian_filter(warm, 6)[..., None]
    cool = PURPLE * (1 - t[..., None]) + ORCHID * t[..., None]
    hot = AMBER * (1 - t[..., None]) + GOLD * t[..., None]
    light = cool * (1 - warm * .92) + hot * warm * .92
    sky = ground + t[..., None] ** 1.2 * light * .78
    # a faint amber dawn low on the right, under the piece
    xx = np.linspace(0, 1, W)[None, :]; yy = np.linspace(0, 1, H)[:, None]
    glow = np.exp(-(((xx - .72) / .42) ** 2 + ((yy - 1.05) / .38) ** 2))[..., None]
    sky = sky + glow * AMBER * .32
    out = np.clip(sky + stars[..., None] * 2.4 * hx('FFF6E6'), 0, 1)
    out += rng.normal(0, .7 / 255, out.shape)
    Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)).save(out_name, quality=86, method=6)
    print(out_name, W, 'x', H)
