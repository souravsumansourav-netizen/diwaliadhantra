"""gen-story-sky.py — v4: the page's one sky, as a story, top to bottom (each band is one section, 1500px of 7500):
  0  the film      LIGHT   dark violet night, coming out of the hero's dark (the river of light is a moving layer)
  1  Whisper/Rad.  COSMOS  the client's KV 5 sky (Milky Way, meteors), recoloured as the client asked (no orange)
  2  Five Lights   COSMOS  its lower half, glowing pink
  3  Name a Star   PLANET  the pink cools to violet-blue as we near a distant planet (the planet is a moving layer)
  4  Appointment   GROUND  a deep blue starfield over a plain of black glittering sand with dark faceted rocks (made here)
Colour journey violet -> pink -> blue. Also writes the moving layers: the river of light, three floating rock shards, and
the distant planet's turning surface. Mood references for the ends: ~/Downloads/diwaliassets/110102.jpg (star path),
110103.jpg (rocks under a blue sky) — references only, nothing taken from them.
Run from diwaliv4/: python3 tools/gen-story-sky.py   (needs ~/Downloads/diwali/client-bgs/src and gen-client-bgs.py)"""
import os, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
Image.MAX_IMAGE_PIXELS = None
CB = os.path.expanduser('~/Downloads/diwali/client-bgs')
spec = importlib.util.spec_from_file_location('g', os.path.join(CB, 'gen-client-bgs.py'))
g = importlib.util.module_from_spec(spec)
exec(compile(open(spec.origin).read().split('src = Image.open')[0], 'g', 'exec'), g.__dict__)
recolour = g.recolour

W, B = 2400, 1500; H = B * 5
rng = np.random.default_rng(7)
f32 = lambda c: np.array(c, np.float32)


def fbm(h, w, octaves=6, base=6, persist=.55, seed=0):
    r = np.random.default_rng(seed); out = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        cells = base * 2 ** o; gh, gw = max(2, int(cells * h / w) + 2), cells + 2
        n = r.random((gh, gw)).astype(np.float32)
        out += amp * np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
        tot += amp; amp *= persist
    out /= tot; return (out - out.min()) / (out.max() - out.min() + 1e-6)


def stars(img, y0, y1, per, seed, k=1.0, cols=None):
    r = np.random.default_rng(seed); n = int(W * (y1 - y0) / per)
    xs = r.integers(0, W, n); ys = r.integers(y0, y1, n)
    b = np.clip((r.pareto(2.6, n) + .15) * .22, 0, 1.3) * k
    cols = cols if cols is not None else f32([[1, .95, .9], [.9, .9, 1], [.85, .88, 1], [1, .9, .96]])
    c = cols[r.integers(0, len(cols), n)]
    for x, y, bb, cc in zip(xs, ys, b, c):
        img[y, x] = np.minimum(1, img[y, x] + cc * bb)
        if bb > .6:
            rr = 2 if bb < .95 else 3
            img[max(0, y - rr):y + rr + 1, max(0, x - rr):x + rr + 1] += cc * bb * .12
    return img


def vgrad(c0, c1, h, gamma=1.0):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None] ** gamma
    return np.broadcast_to(c0 * (1 - t) + c1 * t, (h, W, 3)).copy()


def blend(a, b, h):  # smoothstep crossfade over h rows: a's last rows into b's first rows
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]; t = t * t * (3 - 2 * t)
    return a * (1 - t) + b * t


sky = np.zeros((H, W, 3), np.float32)

# ---------- the client's KV, recoloured: the cosmos (bands 1-2) ----------
kv = recolour(Image.open(os.path.join(CB, 'src/kv5-sky-5120.png')).convert('RGB'))
KH = 3400; kvw = round(kv.size[0] * KH / kv.size[1])
kv = np.asarray(kv.resize((kvw, KH), Image.LANCZOS)).astype(np.float32)[:, (kvw - W) // 2:(kvw - W) // 2 + W] / 255
K0 = B - 200                                                         # the KV runs 1300 .. 4700
sky[K0:K0 + KH] = kv

# ---------- band 0: LIGHT's night, dark violet out of the hero's black ----------
n0 = vgrad(f32([.043, .031, .086]), f32([.11, .07, .2]), K0 + 500, 1.3)
neb = fbm(K0 + 500, W, 6, 5, .55, 3)
n0 += (f32([.24, .12, .36]) * (neb ** 3)[..., None] * np.linspace(.15, 1, K0 + 500, dtype=np.float32)[:, None, None]) * .6
n0 = stars(n0, 0, K0 + 500, 700, 4, .9)
sky[:K0] = n0[:K0]
sky[K0:K0 + 500] = blend(n0[K0:], kv[:500], 500)

# ---------- band 3: PLANET — the pink cools to violet-blue ----------
P0 = K0 + KH                                                          # 4700
TB = 1100                                                             # one long crossfade from the KV into the cooling sky
cool = vgrad(f32([.2, .1, .26]), f32([.05, .07, .2]), H - P0 + TB, .9)
nb = fbm(H - P0 + TB, W, 6, 4, .55, 9)
cool += f32([.16, .14, .42]) * (nb ** 3)[..., None] * .55
cool = stars(cool, 0, H - P0 + TB, 600, 10, 1.0, f32([[.9, .92, 1], [.8, .86, 1], [1, .96, .98]]))
sky[P0 - TB:P0] = blend(kv[-TB:], cool[:TB], TB)
sky[P0:] = cool[TB:]

# ---------- band 4: GROUND — blue starfield, black glittering sand, faceted rocks ----------
G0 = B * 4
hz = G0 + int(B * .5)                                                # the far edge of the plain: half the last screen is ground
# the sky over it: deep blue, a cyan-blue nebula glow across the upper part (as in the blue reference)
GS = G0 - 700
gy = np.arange(GS, hz, dtype=np.float32)[:, None]
glowband = np.exp(-((gy - (G0 + 380)) / 420) ** 2)
nbl = fbm(hz - GS, W, 7, 6, .58, 17)
sky[GS:hz] += (f32([.06, .16, .42]) * (glowband * (nbl ** 1.6))[..., None] * .9)
sky[G0:hz] = stars(sky[G0:hz], 0, hz - G0, 420, 18, 1.1, f32([[.85, .92, 1], [.7, .82, 1], [1, 1, 1]]))
# the cosmos in the distance: the KV's own Milky Way, cooled to blue, arching across the sky over the plain
mw = kv[150:1150]; Lm = mw.mean(-1, keepdims=True)
mwb = np.concatenate([Lm * .55 + mw[..., :1] * .1, Lm * .78, Lm * 1.3], -1)
fade = np.clip(np.sin(np.linspace(0, np.pi, 1000, dtype=np.float32)), 0, 1)[:, None, None] ** 1.2
sky[hz - 1050:hz - 50] = sky[hz - 1050:hz - 50] + mwb * fade * .55
# horizon haze
hzrows = np.arange(hz - 160, hz, dtype=np.float32)[:, None]
sky[hz - 160:hz] += f32([.2, .28, .6]) * (np.exp(-((hz - hzrows) / 60))[..., None] * .35)
# the plain
xc = (np.arange(W, dtype=np.float32) - W / 2) / (W / 2)
far = hz + 80 * xc ** 2 + (fbm(1, W, 6, 4, .5, 31)[0] - .5) * 24          # the planet's curve: the horizon falls away at the sides
GH = H - hz + 40; rows = np.arange(hz - 40, H, dtype=np.float32)[:, None]
m = np.clip(rows - far[None] + .8, 0, 1)
d = np.clip((rows - far[None]) / (H - hz), 0, 1)
sand = f32([.03, .03, .06]) * (1 - d[..., None]) + f32([.012, .012, .024]) * d[..., None]
sand += f32([.12, .18, .42]) * np.exp(-d * 10)[..., None] * .4      # the sky's blue lying on the far sand
sand *= (.75 + .5 * fbm(GH, W, 7, 30, .6, 44)[..., None])
r_ = np.random.default_rng(45); n = int(W * GH / 22)
gx = r_.integers(0, W, n); gyy = r_.integers(0, GH, n)
gc = f32([[.55, .62, .95], [.75, .8, 1], [1, 1, 1], [.9, .55, .35], [.6, .5, .9]])
ci = r_.choice(5, n, p=[.34, .3, .2, .06, .1])
gb = (r_.pareto(2.6, n) * .16 + .04) * (.5 + 1.0 * d[gyy, gx])         # nearer grains are bigger and brighter
np.add.at(sand, (gyy, gx), gc[ci] * gb[:, None])
big = gb > .32
for x, y, bb, c in zip(gx[big], gyy[big], gb[big], gc[ci][big]):
    sand[max(0, y - 1):y + 2, max(0, x - 1):x + 2] += c * bb * .25
sky[hz - 40:] = sky[hz - 40:] * (1 - m[..., None]) + sand * m[..., None]
sky[hz - 40:] += f32([.3, .45, .9]) * (np.exp(-((rows - far[None]) / 4) ** 2) * .22)[..., None]


# ---------- faceted rocks (dark, coal-like, lit blue from the sky) ----------
def rock(size, seed, flat=.25):
    """a solid faceted stone: the intersection of random cutting planes (a convex body), seen from the front and a little
    above, lit by the blue sky from above, a cold rim from behind, and a few glints; dark, coal-like albedo"""
    r = np.random.default_rng(seed); S = size
    v, u = np.mgrid[-1:1:S * 1j, -1:1:S * 1j].astype(np.float32)
    k = 16; th = r.random(k) * 2 * np.pi; ph = r.uniform(.15, 1.25, k)          # plane normals over the front half-sphere
    nrm = np.stack([np.sin(ph) * np.cos(th), np.sin(ph) * np.sin(th) * .85 - .1, np.cos(ph)], 1).astype(np.float32)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    dist = r.uniform(.55, .85, k).astype(np.float32)
    # height of each plane over (u,v): z = (d - nx u - ny v) / nz; the body's front is the lowest of them
    z = (dist[:, None, None] - nrm[:, 0, None, None] * u - nrm[:, 1, None, None] * v) / np.maximum(nrm[:, 2, None, None], .15)
    face = z.argmin(0); h = z.min(0)
    inside = (h > 0) & (v < 1 - flat * 1.2 if flat else h > 0)
    N = nrm[face]
    sky = np.array([0, -.75, .66], np.float32); sky /= np.linalg.norm(sky)
    rim = np.array([-.7, -.3, -.2], np.float32); rim /= np.linalg.norm(rim)
    ld = np.clip(N @ sky, 0, 1); lr = np.clip(N @ (-rim * np.array([1, 1, -1], np.float32)), 0, 1)
    H_ = (sky + np.array([0, 0, 1], np.float32)); H_ /= np.linalg.norm(H_); spec = np.clip(N @ H_, 0, 1) ** 40
    alb = np.array([.035, .033, .05], np.float32) * (.8 + .4 * r.random(k)[face])[..., None]
    col = alb + np.array([.16, .24, .55], np.float32) * (ld ** 1.8)[..., None] * .42 \
              + np.array([.35, .3, .6], np.float32) * (lr ** 3)[..., None] * .25 + np.array([.6, .7, 1], np.float32) * spec[..., None] * .3
    col *= (.85 + .3 * fbm(S, S, 6, 10, .6, seed + 100))[..., None]                 # stone grain
    # crease lines where facets meet catch a little light
    edge = (np.abs(np.diff(face, axis=0, prepend=face[:1])) + np.abs(np.diff(face, axis=1, prepend=face[:, :1]))) > 0
    col[edge] += np.array([.1, .14, .3], np.float32) * .6
    gl = np.random.default_rng(seed + 7).random((S, S)) > .9975                      # glints
    col[gl & inside] += np.array([.7, .8, 1], np.float32)
    al = inside.astype(np.float32)
    al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))).astype(np.float32) / 255
    img = np.dstack([np.clip(col, 0, 1), al])
    ys, xs = np.nonzero(al > .02); img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray((img * 255 + .5).astype(np.uint8), 'RGBA')


def paste(im, x, y):
    global sky
    a = np.asarray(im).astype(np.float32) / 255; h, w = a.shape[:2]
    x0, y0 = int(x - w / 2), int(y - h); x1, y1 = x0 + w, y0 + h
    cx0, cy0 = max(0, x0), max(0, y0); cx1, cy1 = min(W, x1), min(H, y1)
    sub = a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    sh_y = np.arange(max(0, y1 - 40), min(H, y1 + 30))
    if len(sh_y):
        xx_ = np.arange(max(0, x0 - 30), min(W, x1 + 30))
        e = np.exp(-(((xx_[None] - x) / (w * .62)) ** 2) - ((sh_y[:, None] - y1) / 22.0) ** 2)
        sky[sh_y[0]:sh_y[-1] + 1, xx_[0]:xx_[-1] + 1] *= (1 - .7 * e)[..., None]
    # a soft shadow on the sand under it
    sky[cy0:cy1, cx0:cx1] = sky[cy0:cy1, cx0:cx1] * (1 - sub[..., 3:]) + sub[..., :3] * sub[..., 3:]


# rocks on the ground, by distance: far ones small near the horizon, near ones big and cut by the screen's foot;
# the middle kept clear for the card. (x, depth 0 = horizon .. 1 = our feet, size, seed); far first so near ones overlap
ROCKS = [(1000, .1, 100, 11), (1390, .09, 80, 12), (1180, .06, 50, 13), (320, .14, 130, 14), (2060, .13, 120, 15), (640, .2, 150, 16),
         (60, .36, 230, 7), (780, .34, 170, 5), (1640, .33, 180, 6), (2360, .34, 220, 8), (300, .55, 260, 17), (2120, .56, 280, 18)]
# (the near stones — the ledge the card stands on, and the big ones at the screen's foot — are their own layers, in front)
for (x, dep, sz, seed) in ROCKS:
    y = far[min(W - 1, max(0, int(x)))] + (H - hz) * dep
    paste(rock(sz, seed), x, y)

# one continuous sky: the average colour and brightness of each row, smoothed over a long stretch (sigma 900 px of 7500),
# so no part keeps its own level and the bands melt into one gradient (detail, stars and rocks are untouched)
from scipy.ndimage import gaussian_filter1d
rowm = sky.mean(1)                                                          # (H, 3)
smooth_m = gaussian_filter1d(rowm, 1200, axis=0, mode="nearest")
fac = np.clip(smooth_m / np.maximum(rowm, 1e-3), .55, 1.8)
sky *= (1 + .9 * (fac - 1))[:, None, :]
sky = np.clip(sky + rng.normal(0, .6 / 255, sky.shape).astype(np.float32), 0, 1)
out = Image.fromarray((sky * 255 + .5).astype(np.uint8))
out.resize((2048, 6400), Image.LANCZOS).save('sky/story-sky.webp', quality=80, method=6)
out.crop((800, 0, 1600, H)).resize((640, 6000), Image.LANCZOS).save('sky/story-sky-phone.webp', quality=80, method=6)
out.resize((480, 1500)).save(os.environ.get('PREVIEW', 'story-preview.jpg'), quality=80)
print('sky', out.size)

# ---------- moving layers ----------
# the river of light: a path of glitter winding down from one bright star, widening as it comes near (transparent)
RW, RH = 2400, 1350; rv = np.zeros((RH, RW, 4), np.float32)   # the film's whole screen: from a star up left, behind the frame, out wide below
# its path: down the screen's left margin from a star up left, then across the foot of the screen, under the film's words
K = np.array([[.1, .05], [.07, .3], [.06, .55], [.13, .82], [.42, .96], [.8, 1.0], [1.15, 1.08]], np.float32)
def crom(P, n):
    P = np.vstack([P[0] * 2 - P[1], P, P[-1] * 2 - P[-2]]); out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]; tt = np.linspace(0, 1, n, endpoint=False)[:, None]
        out.append(.5 * ((2 * p1) + (-p0 + p2) * tt + (2 * p0 - 5 * p1 + 4 * p2 - p3) * tt ** 2 + (-p0 + 3 * p1 - 3 * p2 + p3) * tt ** 3))
    return np.vstack(out)
path = crom(K, 500); px, py = path[:, 0] * RW, path[:, 1] * RH
t = np.linspace(0, 1, len(px))
wid = 5 + (t ** 1.6) * 330
rr = np.random.default_rng(55)
N = 90000; ti = rr.integers(0, len(t), N); off = rr.normal(0, .42, N)
nx, ny = -np.gradient(py)[ti], np.gradient(px)[ti]; nl = np.hypot(nx, ny) + 1e-6; nx, ny = nx / nl, ny / nl   # across the path
xs = (px[ti] + off * wid[ti] * nx).astype(int); ys = (py[ti] + off * wid[ti] * ny + rr.normal(0, 1, N) * 2).astype(int)
ok = (xs >= 0) & (xs < RW) & (ys >= 0) & (ys < RH)
cols = f32([[1, 1, 1], [.8, .86, 1], [.78, .72, 1], [1, .88, .98]])
cb = cols[rr.integers(0, 4, N)] * ((rr.pareto(3, N) * .55 + .45) * np.exp(-np.abs(off) * 1.2))[:, None]
np.add.at(rv[..., :3], (ys[ok], xs[ok]), cb[ok]); np.add.at(rv[..., 3], (ys[ok], xs[ok]), cb[ok].max(1))
glow = Image.fromarray((np.clip(rv[..., 3], 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
gl = np.asarray(glow).astype(np.float32) / 255 * 1.6
rv[..., :3] += f32([.55, .55, .95]) * gl[..., None] * .5; rv[..., 3] = np.maximum(rv[..., 3], gl * .5)
# the star at its head
yy, xx = np.mgrid[0:RH, 0:RW].astype(np.float32); sx, sy = px[0], py[0]   # the star at its head
dd = np.hypot(xx - sx, yy - sy)
star = np.exp(-dd / 6) + .5 * np.exp(-dd / 40) + .6 * np.exp(-np.abs(yy - sy) / 1.5) * np.exp(-np.abs(xx - sx) / 90) + .6 * np.exp(-np.abs(xx - sx) / 1.5) * np.exp(-np.abs(yy - sy) / 90)
rv[..., :3] += star[..., None] * f32([1, 1, 1]); rv[..., 3] = np.maximum(rv[..., 3], np.clip(star, 0, 1))
rgb = np.clip(rv[..., :3], 0, 1); al = np.clip(rv[..., 3], 0, 1)
Image.fromarray((np.dstack([rgb / np.maximum(al[..., None], 1e-3), al]).clip(0, 1) * 255).astype(np.uint8), 'RGBA').save('sky/river.webp', quality=88, method=6, alpha_quality=90)
print('river')

# the near stones, as layers in front of the sky: the ledge the card stands on (wide, its top cut flat and lit), and two
# big stones for the screen's foot
def ledge(seed):
    im = rock(1300, seed, flat=0)
    w, h = im.size; im = im.resize((int(w * 1.9), int(h * .78)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255; h, w = a.shape[:2]
    cut = int(h * .2); a[:cut, :, 3] = 0                                                  # the top, cut flat
    top = a[cut:cut + 90]
    lit = np.linspace(1, 0, 90, dtype=np.float32)[:, None] ** 1.5
    top[..., :3] = top[..., :3] * (1 - lit[..., None] * .6) + f32([.2, .28, .55]) * lit[..., None] * .6
    top[:3, :, :3] += f32([.25, .35, .7]) * .5                                            # the lit lip
    r2 = np.random.default_rng(seed + 3); g = r2.random(top.shape[:2]) > .996
    top[..., :3][g] += f32([.8, .85, 1])
    a = a[cut:]
    return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA')
ledge(31).save('sky/rock-ledge.webp', quality=86, method=6, alpha_quality=90)
rock(1000, 32).save('sky/rock-near-l.webp', quality=86, method=6, alpha_quality=90)
rock(1100, 33).transpose(Image.FLIP_LEFT_RIGHT).save('sky/rock-near-r.webp', quality=86, method=6, alpha_quality=90)
print('near stones')

# the distant planet's surface, made seamless left-to-right so it can turn: the client's banded planet's middle band,
# mirrored, cooled toward violet-blue (the far side of the journey)
pl = np.asarray(Image.open(os.path.join(CB, 'parts/planet-banded.webp')).convert('RGB')).astype(np.float32) / 255
ph, pw = pl.shape[:2]
col = pl[int(ph * .18):int(ph * .82), int(pw * .42):int(pw * .58)].mean(1)          # the planet's own bands, top to bottom (its middle column)
col = np.asarray(Image.fromarray((col[:, None] * 255).astype(np.uint8)).resize((1, 400), Image.BICUBIC)).astype(np.float32)[:, 0] / 255
TW = 1200
n1 = fbm(400, TW // 2, 6, 6, .55, 61); n1 = np.concatenate([n1, n1[:, ::-1]], 1)     # streaks, wrapping left to right
row = np.arange(400, dtype=np.float32)[:, None] + (n1 - .5) * 26                          # the bands wander a little
idx = np.clip(row, 0, 399).astype(int)
tex = col[idx] * (.85 + .3 * n1[..., None])
tex = np.clip(tex * f32([.85, .85, 1.12]), 0, 1)                                          # a touch cooler: it is far off
Image.fromarray((tex * 255).astype(np.uint8)).save('sky/planet-surface.webp', quality=86, method=6)
print('planet')
