"""gen-one-world.py — the page's background as ONE image, one world: everything below the hero (5 screens, 2400 x 7500).
Layer 1  a simple starry night, cool and quiet (the Whisper to Radiance sky's character, less light, cooler): deep
         navy-indigo, faint nebula, one Milky Way band running the whole height, a crisp star field.
Layer 2  objects and light placed where one section ends and the next begins (y = 1500, 3000, 4500, 6000), each
         straddling the join, so the joins are bridged and the page reads as one place: the client's own planets and galaxy
         (client-bgs/parts, cooled), soft glows, a few shooting stars.
Writes, for review (nothing on the page yet): sky/one-world.webp, and a copy with the section joins marked.
Run from diwaliv4/: python3 tools/gen-one-world.py [out-dir]"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
CB = os.path.expanduser('~/Downloads/diwali/client-bgs')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'sky'
W, B = 2400, 1500; H = B * 5
f32 = lambda c: np.array(c, np.float32)
rng = np.random.default_rng(21)


def fbm(h, w, octaves=6, base=4, persist=.55, seed=0):
    r = np.random.default_rng(seed); out = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        cells = base * 2 ** o; gh, gw = max(2, int(cells * h / w) + 2), cells + 2
        n = r.random((gh, gw)).astype(np.float32)
        out += amp * np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
        tot += amp; amp *= persist
    out /= tot; return (out - out.min()) / (out.max() - out.min() + 1e-6)

# ================= layer 1: the KV's own sky, a part of it per section =================
# the client's KV sky with its planets lifted out (hero/sky.webp, by tools/build-hero.py), so no planet repeats:
#   film = its top right (the galaxy), Whisper to Radiance = top left, Five Lights = middle left, Name a Star = middle
#   right, Book an Appointment = its bottom (the cloud banks and the glowing horizon). Each part is enlarged to the page's
#   width and the parts crossfade where they meet; the KV's own colour runs purple at the top to warm pink-orange at the end.
# the client's own clean sky: KV 5 BG.psd (layer 168, 9552x5200; extracted to client-bgs/src/kv5-sky-full.png), the same
# scene as the KV, at full resolution, its planets and galaxy as separate layers. Crops below are in a 1920-wide frame.
_full = Image.open(os.path.join(CB, 'src/kv5-sky-full.png')).convert('RGB')
KS = _full.width / 1920
class _K:                                             # crop in 1920-frame coordinates, from the full-resolution sky
    def crop(self, box): return _full.crop(tuple(round(v * KS) for v in box))
kvs = _K(); KW, KH = 1920, round(_full.height / KS)
# (region of the KV sky, scale, where its top lands); each pair overlaps, and blends across exactly its overlap
PIECES = [((960, 0, 1920, 760), 0, 0),            # film: the top right (the galaxy)
          ((0, 100, 900, 760), 0, 1600),           # Whisper to Radiance: the top left (below the KV's dark top edge)
          ((0, 200, 900, 760), 0, 3200),           # Five Lights: the middle, left (above the cloud banks)
          ((1020, 330, 1920, 760), 0, 4550),       # Name a Star: the middle, right (below the galaxy)
          ((480, 330, 1320, 1045), 0, None)]       # Book an Appointment: the KV's foot, the cloud banks and the horizon
imgs = []
for (x0, y0, x1, y1), sc, top in PIECES:
    sc = W / (x1 - x0); ph = round((y1 - y0) * sc)              # (each part fills the page's width)
    im = np.asarray(kvs.crop((x0, y0, x1, y1)).resize((W, ph), Image.LANCZOS)).astype(np.float32) / 255
    # each part lit evenly top to bottom (the KV is darker at its top: that would repeat at every join); the last part keeps
    # its horizon light below its middle
    from scipy.ndimage import gaussian_filter1d as _g
    prof = _g(im.mean(1), 120, axis=0, mode='nearest'); flat = prof.mean(0)
    k = np.clip(flat / np.maximum(prof, 1e-3), .5, 2.2)
    if top is None:
        keep = np.clip((np.arange(ph) / ph - .35) / .25, 0, 1)[:, None]; k = k * (1 - keep) + keep
    im = im * k[:, None, :]
    imgs.append([im, H - ph if top is None else top])
# laid one over the next: each join is an irregular, cloud-shaped edge (not a straight crossfade, which reads as a grey band)
sky = np.zeros((H, W, 3), np.float32)
im0, t0_ = imgs[0]; sky[:min(H, t0_ + im0.shape[0])] = im0[:H - t0_]
for i in range(1, len(imgs)):
    im, top = imgs[i]; prev_end = imgs[i - 1][1] + imgs[i - 1][0].shape[0]
    ov = prev_end - top; a0, a1 = max(0, top), min(H, top + im.shape[0])
    edge = top + ov * .5 + (fbm(1, W, 5, 3, .5, 70 + i)[0] - .5) * ov * .5          # where the new part takes over, column by column
    rows = np.arange(a0, a1, dtype=np.float32)[:, None]
    m = np.clip((rows - edge[None]) / (ov * .55) + .5, 0, 1); m = m * m * (3 - 2 * m)
    sky[a0:a1] = sky[a0:a1] * (1 - m[..., None]) + im[a0 - top:a1 - top] * m[..., None]
# even out each part's own top-dark / bottom-light, so the joins carry no step: each row's average colour is drawn to a
# long smooth average (the KV's purple-to-pink flow survives, the bands go)
from scipy.ndimage import gaussian_filter1d
rowm = gaussian_filter1d(sky.mean(1), 40, axis=0, mode='nearest')
# the target: one flow, the KV's purple at the top to its warm glow at the foot (each part's own dark top and light middle
# would otherwise repeat as a band per section)
c_top = sky[:1500].mean((0, 1)); c_mid = sky[3000:4500].mean((0, 1)); c_end = sky[-500:].mean((0, 1))
t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
target = np.where(t < .5, c_top * (1 - t * 2) + c_mid * (t * 2), c_mid * (2 - t * 2) + c_end * (t * 2 - 1))
end_w = np.clip((t - .82) / .18, 0, 1)                        # (the last screen keeps the KV's own horizon light)
fac = np.clip(target / np.maximum(rowm, 1e-3), .45, 2.2) * (1 - end_w) + end_w
sky *= fac[:, None, :]
# the warmth of Diwali at the end: the last screen leans orange-pink
yy0 = np.linspace(0, 1, H, dtype=np.float32)
warmk = np.clip((yy0 - .72) / .28, 0, 1) ** 1.2
sky *= (1 + warmk[:, None, None] * (f32([1.12, 1.0, .86]) - 1))
band = np.zeros((H, W), np.float32)                                         # (the stars' weighting: even, the KV has its own band)

def put_stars(n, bright, seed, weight=None, halo=False):
    r = np.random.default_rng(seed)
    if weight is not None:                      # more stars where weight is high (the band)
        ys = r.integers(0, H, n * 3); xs = r.integers(0, W, n * 3)
        keep = r.random(n * 3) < weight[ys, xs]; ys, xs = ys[keep][:n], xs[keep][:n]
    else:
        ys, xs = r.integers(0, H, n), r.integers(0, W, n)
    cols = f32([[.85, .9, 1], [.75, .82, 1], [1, .97, .95], [.9, .85, 1]])
    c = cols[r.integers(0, 4, len(xs))] * (bright * (r.pareto(3, len(xs)) * .4 + .6))[:, None] if np.isscalar(bright) else None
    np.add.at(sky, (ys, xs), c)
    if halo:
        for x, y_, cc in zip(xs, ys, c):
            sky[max(0, y_ - 2):y_ + 3, max(0, x - 2):x + 3] += cc * .12
    return xs, ys

put_stars(90000, .12, 5)                                        # dust (crisp, over the enlarged painting)

put_stars(7000, .5, 7, halo=True)                              # clear stars
bx, by = put_stars(260, 1.0, 8, halo=True)                     # the few bright ones
for x, y_ in zip(bx, by):                                       # their soft cross glints
    for d in range(1, 14):
        a = .5 * (1 - d / 14) ** 2
        for (dx, dy) in ((d, 0), (-d, 0), (0, d), (0, -d)):
            if 0 <= x + dx < W and 0 <= y_ + dy < H: sky[y_ + dy, x + dx] += f32([.8, .85, 1]) * a

# ================= layer 2: objects and light at the joins =================
def glow(cx_, cy_, rx, ry, col, k):
    global sky
    y0, y1 = max(0, int(cy_ - ry * 3)), min(H, int(cy_ + ry * 3)); x0, x1 = max(0, int(cx_ - rx * 3)), min(W, int(cx_ + rx * 3))
    if y1 <= y0 or x1 <= x0: return                                   # (wholly off the image)
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    e = np.exp(-(((gx - cx_) / rx) ** 2 + ((gy - cy_) / ry) ** 2))
    sky[y0:y1, x0:x1] += f32(col) * e[..., None] * k


def tint(im, hue_deg, sat=1.0, val=1.0):
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    hsv = np.asarray(Image.fromarray((a[..., :3] * 255).astype(np.uint8)).convert('HSV')).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + hue_deg * 255 / 360) % 256; hsv[..., 1] *= sat; hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    rgb = np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32) / 255
    return np.dstack([rgb, a[..., 3]])


def place(name, cx_, cy_, size, hue=-35, sat=.75, val=.85, haze=.0, flip=False, blur=0.0):
    """a client planet (or the galaxy), cooled to the night, set with its centre at (cx_, cy_); haze = distance"""
    global sky
    im = Image.open(os.path.join(CB, 'parts', name + '.webp')).convert('RGBA')
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    s = size / max(im.size); im = im.resize((max(2, int(im.width * s)), max(2, int(im.height * s))), Image.LANCZOS)
    if blur:                                                            # distance: the further, the softer
        pad = int(blur * 4); big = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.paste(im, (pad, pad))
        im = big.filter(ImageFilter.GaussianBlur(blur))
    a = tint(im, hue, sat, val)
    if name == 'planet-banded':                 # its cut-out carries a dark aura: keep the planet's own disc only
        hh, ww = a.shape[:2]; gy, gx = np.mgrid[0:hh, 0:ww].astype(np.float32)
        rr = np.hypot(gx - ww * .49, gy - hh * .471) / (ww * .333)      # its disc (measured on the part: the rest is a nebula patch)
        a[..., 3] *= np.clip((1.0 - rr) / .03, 0, 1)
    if haze:
        ly = int(min(H - 1, max(0, cy_))); lx0, lx1 = int(max(0, cx_ - 300)), int(min(W, cx_ + 300))
        local = sky[max(0, ly - 200):ly + 200, lx0:lx1].mean((0, 1)) if lx1 > lx0 else sky.mean((0, 1))
        a[..., :3] = a[..., :3] * (1 - haze) + local * haze
    h_, w_ = a.shape[:2]; x0, y0 = int(cx_ - w_ / 2), int(cy_ - h_ / 2)
    sx0, sy0 = max(0, -x0), max(0, -y0); x0c, y0c = max(0, x0), max(0, y0)
    x1c, y1c = min(W, x0 + w_), min(H, y0 + h_)
    sub = a[sy0:sy0 + (y1c - y0c), sx0:sx0 + (x1c - x0c)]
    sky[y0c:y1c, x0c:x1c] = sky[y0c:y1c, x0c:x1c] * (1 - sub[..., 3:]) + sub[..., :3] * sub[..., 3:]
    objmask[y0c:y1c, x0c:x1c] = np.maximum(objmask[y0c:y1c, x0c:x1c], sub[..., 3])


def shooting(x0, y0, length, ang, k=1.0):
    global sky
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    x1, y1 = x0 + np.cos(ang) * length, y0 + np.sin(ang) * length
    for i in range(40):
        t = i / 40; xa, ya = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t; xb, yb = x0 + (x1 - x0) * (t + .025), y0 + (y1 - y0) * (t + .025)
        d.line([(xa, ya), (xb, yb)], fill=int(255 * t ** 1.6), width=2)
    g = np.asarray(img.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    gl = np.asarray(img.filter(ImageFilter.GaussianBlur(7))).astype(np.float32) / 255
    sky += (f32([.85, .9, 1]) * g[..., None] * 1.1 + f32([.5, .55, 1]) * gl[..., None] * .5) * k
    glow(x1, y1, 10, 10, (.9, .92, 1), .9 * k)


objmask = np.zeros((H, W), np.float32)                   # where the planets are (nothing is drawn over them after)
J = [B * i for i in range(1, 5)]                        # the joins: 1500, 3000, 4500, 6000
# top of the page (just below the hero): a cool light falling from above, the hero's light carried down
place('galaxy-veil', W * .74, 430, 1000, hue=0, sat=1.0, val=1.0, haze=.05)
# ---- planets by depth: NEAR (large, sharp, cut by the edge), MIDDLE (soft, hazed), FAR (small, blurred, faded into the sky) ----
# far first, so the nearer ones pass in front
for (nm, x, y_, sz, bl, hz_) in [('planet-banded', .7, 600, 90, 3.0, .62), ('planet-small', .18, J[0] + 260, 70, 3.2, .62),
                                ('planet-crescent', .62, J[1] + 700, 120, 2.8, .58), ('planet-ringed', .26, J[2] + 620, 160, 3.4, .6),
                                ('planet-small', .8, J[3] - 260, 110, 2.4, .5), ('planet-small', .42, J[3] + 950, 60, 3.6, .66)]:
    place(nm, W * x, y_, sz, hue=-15, sat=.7, val=.7, haze=hz_, blur=bl)
# middle
place('planet-ringed', W * .9, J[2] + 30, 520, hue=-10, sat=.75, val=.75, haze=.25, blur=1.2)
shooting(W * .55, J[1] - 520, 700, .55, .9)
shooting(W * .78, J[3] - 900, 520, 2.3, .7)
# near: big and crisp, richer, half off the screen's edge
place('planet-banded', W * .02, J[1] + 40, 1600, hue=-10, sat=.85, val=.9)

# ================= meteors (as in the KV: falling down and to the right) =================
mr = np.random.default_rng(31)
for i in range(30):
    yf = mr.random() ** 1.7                                                   # more of them high up, in the warm sky
    x0, y0 = mr.uniform(-200, W - 200), yf * H
    L_ = mr.uniform(160, 640) * (1.2 - .6 * yf); ang = mr.uniform(.48, .62)
    col = f32([1, .78, .92]) * (1 - yf) + f32([.8, .88, 1]) * yf
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    x1, y1 = x0 + np.cos(ang) * L_, y0 + np.sin(ang) * L_
    for k in range(30):
        t = k / 30; xa, ya = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t; xb, yb = x0 + (x1 - x0) * (t + .035), y0 + (y1 - y0) * (t + .035)
        d.line([(xa, ya), (xb, yb)], fill=int(255 * t ** 1.8), width=2 if L_ > 380 else 1)
    box = (max(0, int(min(x0, x1)) - 30), max(0, int(min(y0, y1)) - 30), min(W, int(max(x0, x1)) + 30), min(H, int(max(y0, y1)) + 30))
    if box[2] <= box[0] or box[3] <= box[1]: continue
    sub = img.crop(box); g1 = np.asarray(sub.filter(ImageFilter.GaussianBlur(1))).astype(np.float32) / 255
    g2 = np.asarray(sub.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    k_ = mr.uniform(.6, 1.1)
    behind = 1 - objmask[box[1]:box[3], box[0]:box[2]][..., None]
    sky[box[1]:box[3], box[0]:box[2]] += (col * g1[..., None] * 1.2 + col * g2[..., None] * .45) * k_ * behind
    if objmask[min(H - 1, max(0, int(y1))), min(W - 1, max(0, int(x1)))] < .1: glow(x1, y1, 7, 7, tuple(col), .7 * k_)

# ================= twinkles: brighter stars with four-point glints, some gold =================
tr = np.random.default_rng(41)
for i in range(110):
    x, y_ = tr.uniform(0, W), tr.uniform(0, H); b = tr.uniform(.5, 1.0); R = int(tr.uniform(10, 30))
    if objmask[int(y_), int(x)] > .05: continue
    col = f32([1, .88, .62]) if tr.random() < .35 else f32([.9, .92, 1])
    glow(x, y_, 3.5, 3.5, tuple(col), 1.1 * b); glow(x, y_, 12, 12, tuple(col), .25 * b)
    for d_ in range(1, R):
        a_ = b * .7 * (1 - d_ / R) ** 2.2
        for dx, dy in ((d_, 0), (-d_, 0), (0, d_), (0, -d_)):
            xi, yi = int(x + dx), int(y_ + dy)
            if 0 <= xi < W and 0 <= yi < H: sky[yi, xi] += col * a_

sky = np.clip(sky + rng.normal(0, .7 / 255, sky.shape).astype(np.float32), 0, 1)
im = Image.fromarray((sky * 255 + .5).astype(np.uint8))
os.makedirs(OUT, exist_ok=True)
im.resize((2048, 6400), Image.LANCZOS).save(os.path.join(OUT, 'one-world.webp'), quality=82, method=6)
# a review copy with the joins marked (sections named)
rv = im.resize((1200, 3750), Image.LANCZOS); d = ImageDraw.Draw(rv)
names = ['film', 'Whisper / Radiance', 'Five Lights', 'Name a Star', 'Book an Appointment']
for i in range(5):
    yv = i * 750
    if i: [d.line([(x, yv), (x + 14, yv)], fill=(255, 210, 140), width=2) for x in range(0, 1200, 26)]
    d.text((18, yv + 14), names[i], fill=(255, 225, 170))
rv.save(os.path.join(OUT, 'one-world-guides.jpg'), quality=86)
im.resize((600, 1875), Image.LANCZOS).save(os.path.join(OUT, 'one-world-small.jpg'), quality=86)
print('one world', im.size)
