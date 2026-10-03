/* tear.js — v4: a section arrives through the Milky Way breaking apart, as Book an Appointment opens (appt.js).
   Markup, in the section's first screen (index.html): .tear > .tear-cover (the Milky Way, an <img>), .tear-rim,
   canvas.tear-sparks, i.tear-seam. On arrival a streak of gold draws down the sky, the sky splits along it into a
   cloud-edged opening that swells until the Milky Way is gone and the section stands behind it; a gold rim runs on the
   torn edge and sparks orbit it. The cover is masked by the opening turned inside out (small alpha masks, built once
   per screen shape). Played by itself once the section has arrived; closed again when you scroll back above it. */
(() => {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy) * 2 - 1;
}
const fbm = (x, y) => { let f = 0, a = .5; for (let i = 0; i < 4; i++) { f += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= .5; } return f; };
const radii = (f, R) => [mix(.006, R, Math.pow(f, 1.7)), mix(.4, R, Math.pow(f, .85))];   // tall first, from the streak, then wide
const FRAMES = 60, DUR = 2600;

document.querySelectorAll('.tear').forEach(tear => {
  const H_DIR = tear.dataset.dir === 'h';
  const radii_ = (f, R) => { const [a, b] = radii(f, R); return H_DIR ? [b, a] : [a, b]; };   // horizontal: wide first, from the streak across
  const world = tear.closest('.pg'), cover = tear.querySelector('.tear-cover'), rimEl = tear.querySelector('.tear-rim');
  const sparks = tear.querySelector('.tear-sparks'), sg = sparks.getContext('2d');
  let key = '', masks = [], rims = [], shape = null, lastFrame = -1, P = 0, playRaf = 0, iris = 0, spinRaf = 0, dpr = 1, state = 'closed';

  function build() {
    const w = tear.clientWidth, h = tear.clientHeight; if (!w || !h) return;
    const A = w / h, k = A.toFixed(2); if (k === key) return; key = k;
    const MW = 128, MH = Math.max(48, Math.round(MW / A)), n = MW * MH;
    const X = new Float32Array(n), Y = new Float32Array(n), N = new Float32Array(n);
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      const p = j * MW + i; X[p] = ((i + .5) / MW - .5) * A; Y[p] = (j + .5) / MH - .5; N[p] = fbm(X[p] * 4 + 7.3, Y[p] * 4 + 1.9);
    }
    const R = Math.hypot(A / 2, .5) + .3;
    const c = document.createElement('canvas'); c.width = MW; c.height = MH;
    const g = c.getContext('2d'), im = g.createImageData(MW, MH), rm = g.createImageData(MW, MH), d = im.data, e = rm.data;
    masks = []; rims = [];
    for (let fr = 0; fr <= FRAMES; fr++) {
      const f = fr / FRAMES, [rx, ry] = radii_(f, R), amp = mix(.03, .2, f), soft = mix(.02, .09, f);
      for (let p = 0; p < n; p++) {
        const r = Math.hypot(X[p] / rx, Y[p] / ry), sd = (r - 1) * Math.min(rx, ry, .5) + N[p] * amp;
        const t = clamp((sd + soft) / (2 * soft)), a = 1 - t * t * (3 - 2 * t);           // a: inside the opening
        const rim = Math.exp(-Math.pow((sd + soft * .55) / (soft * .32 + .004), 2));
        const o = p * 4; d[o] = d[o + 1] = d[o + 2] = e[o] = e[o + 1] = e[o + 2] = 255;
        d[o + 3] = Math.round((1 - a) * 255);                                              // the sky stays outside it
        e[o + 3] = Math.round(clamp(rim * a) * 255);
      }
      g.putImageData(im, 0, 0); masks.push(`url(${c.toDataURL()})`);
      g.putImageData(rm, 0, 0); rims.push(`url(${c.toDataURL()})`);
    }
    rimEl.style.webkitMaskImage = rimEl.style.maskImage = masks.concat(rims).join(',');   // decode every frame ahead, while unseen
    shape = { A, R, N: (x, y) => fbm(x * 4 + 7.3, y * 4 + 1.9) }; lastFrame = -1;
  }
  function sizeSparks() { dpr = Math.min(devicePixelRatio || 1, 1.5); sparks.width = tear.clientWidth * dpr; sparks.height = tear.clientHeight * dpr; }
  const SP = Array.from({ length: 44 }, (_, i) => ({ a: (i / 44) * Math.PI * 2 + Math.random() * .12, s: .18 + Math.random() * .3,
    r: 1 + Math.random() * 2.2, off: (Math.random() - .5) * .05, tw: Math.random() * 6.28, lav: Math.random() < .2 }));
  function drawSparks(t) {
    spinRaf = 0; const W = sparks.width, H = sparks.height; sg.clearRect(0, 0, W, H);
    if (!shape || iris <= 0 || iris >= 1) return;
    const [rx, ry] = radii_(iris, shape.R), amp = mix(.03, .2, iris), glow = Math.sin(Math.PI * iris);
    sg.globalCompositeOperation = 'lighter';
    for (const s of SP) {
      const a = s.a + t * .0006 * s.s, cx = Math.cos(a) * rx, cy = Math.sin(a) * ry, nn = shape.N(cx, cy) * amp;
      const px = ((cx - nn * Math.cos(a)) / shape.A + .5) * W, py = (cy - nn * Math.sin(a) + .5 + s.off) * H;
      const al = glow * (.55 + .45 * Math.sin(t * .003 + s.tw)), rr = s.r * dpr * (1 + iris);
      const gr = sg.createRadialGradient(px, py, 0, px, py, rr * 4);
      gr.addColorStop(0, s.lav ? `rgba(226,210,255,${al})` : `rgba(255,236,190,${al})`);
      gr.addColorStop(.3, s.lav ? `rgba(170,140,240,${al * .35})` : `rgba(240,180,100,${al * .35})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(px - rr * 4, py - rr * 4, rr * 8, rr * 8);
    }
    if (iris > 0 && iris < 1) spinRaf = requestAnimationFrame(drawSparks);
  }
  function frame() {
    const p = reduce ? 1 : P, seam = smooth(0, .12, p);
    iris = smooth(.1, .95, p);
    tear.style.setProperty('--seam', seam.toFixed(4)); tear.style.setProperty('--iris', iris.toFixed(4));
    const fr = iris >= 1 ? FRAMES + 1 : Math.round(iris * FRAMES);
    if (fr !== lastFrame) {
      lastFrame = fr;
      cover.style.webkitMaskImage = cover.style.maskImage = fr === 0 || !masks.length ? 'none' : fr > FRAMES ? 'linear-gradient(transparent,transparent)' : masks[fr];
      if (fr > 0 && fr <= FRAMES && rims[fr]) rimEl.style.webkitMaskImage = rimEl.style.maskImage = rims[fr];
    }
    rimEl.style.opacity = (iris > 0 && iris < 1 ? .5 * Math.sin(Math.PI * iris) : 0).toFixed(3);
    tear.classList.toggle('is-open', iris >= 1);
    if (iris > 0 && iris < 1) { if (!spinRaf) spinRaf = requestAnimationFrame(drawSparks); } else if (sparks.width) sg.clearRect(0, 0, sparks.width, sparks.height);
  }
  function play() {
    cancelAnimationFrame(playRaf); state = 'open';
    if (reduce) { P = 1; frame(); return; }
    const p0 = P, t0 = performance.now();
    const step = now => { P = Math.min(1, p0 + (now - t0) / DUR); frame(); if (P < 1) playRaf = requestAnimationFrame(step); };
    playRaf = requestAnimationFrame(step);
  }
  function close() { cancelAnimationFrame(playRaf); P = 0; state = 'closed'; frame(); }

  // arrived: the section's top has reached the top of the screen; back above it: closed again, ready to play once more
  const sky = tear.querySelector('.tear-sky');
  function align() { if (!sky) return; const r = tear.getBoundingClientRect(); sky.style.transform = `translate3d(0,${(-r.top).toFixed(1)}px,0)`; }
  function check() {
    align();
    const r = world.getBoundingClientRect(), vh = innerHeight;
    if (state === 'closed' && r.top <= vh * .12 && r.bottom > vh * .5) { build(); play(); }
    else if (state === 'open' && r.top > vh * .9) close();
    else if (state === 'closed' && r.top < vh * 1.6 && !masks.length) { sizeSparks(); build(); }   // built on the way in
  }
  addEventListener('scroll', check, { passive: true });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sizeSparks(); build(); frame(); }, 150); });
  sizeSparks(); frame(); check();
});
})();
