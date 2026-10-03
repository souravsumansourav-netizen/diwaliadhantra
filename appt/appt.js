/* Adhyantara — Book an Appointment. No dependencies.
   The streak opens into a cloud-edged iris, the section change run outward: the iris is a set of small alpha
   masks built once per screen shape, the gold rim a second set, and a few sparks orbit the edge while it opens. */
(() => {
  'use strict';
  const root = document.getElementById('book-appointment');
  if (!root) return;
  const stage = root.querySelector('.appt-stage');
  const card = root.querySelector('.appt-card');
  const open = root.querySelector('.appt-open');
  const rimEl = root.querySelector('.appt-rim');
  const sparks = root.querySelector('.appt-sparks');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = (event, data = {}) => { try { (window.dataLayer = window.dataLayer || []).push({ event, ...data }); } catch {} };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ---------- the art is all in index.html (loading="lazy"); the piece fades in once it has loaded ---------- */
  const piece = root.querySelector('.appt-piece-img'), shown = () => piece.classList.add('ok');
  if (piece.complete && piece.naturalWidth) shown(); else piece.addEventListener('load', shown, { once: true });
  let entered = false;   // the iris is built once the world is first entered

  /* ---------- the iris: a vertical slit that swells into a cloud-edged opening ---------- */
  // value noise, four octaves: enough to rag the edge like the section change's cloud disc
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy) * 2 - 1;
  }
  const fbm = (x, y) => { let f = 0, a = .5; for (let i = 0; i < 4; i++) { f += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= .5; } return f; };

  const FRAMES = 60;
  let key = '', masks = [], rims = [], shape = null;
  // the opening's two radii at f (in units of the stage height): tall first, from the streak, then wide
  const radii = (f, R) => [mix(.006, R, Math.pow(f, 1.7)), mix(.4, R, Math.pow(f, .85))];
  function build() {
    if (reduce) return;
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    const A = w / h, k = A.toFixed(2); if (k === key) return; key = k;
    const MW = 128, MH = Math.max(48, Math.round(MW / A)), n = MW * MH;
    const X = new Float32Array(n), Y = new Float32Array(n), N = new Float32Array(n);
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      const p = j * MW + i, qx = (i + .5) / MW, qy = (j + .5) / MH;
      X[p] = (qx - .5) * A; Y[p] = qy - .5; N[p] = fbm(X[p] * 4 + 7.3, Y[p] * 4 + 1.9);
    }
    const R = Math.hypot(A / 2, .5) + .3;
    const c = document.createElement('canvas'); c.width = MW; c.height = MH;
    const g = c.getContext('2d'), im = g.createImageData(MW, MH), rm = g.createImageData(MW, MH), d = im.data, e = rm.data;
    masks = []; rims = [];
    for (let fr = 0; fr <= FRAMES; fr++) {
      const f = fr / FRAMES, [rx, ry] = radii(f, R), amp = mix(.03, .2, f), soft = mix(.02, .09, f);
      for (let p = 0; p < n; p++) {
        const r = Math.hypot(X[p] / rx, Y[p] / ry), sd = (r - 1) * Math.min(rx, ry, .5) + N[p] * amp;
        const t = clamp((sd + soft) / (2 * soft)), a = 1 - t * t * (3 - 2 * t);
        const rim = Math.exp(-Math.pow((sd + soft * .55) / (soft * .32 + .004), 2));
        const o = p * 4; d[o] = d[o + 1] = d[o + 2] = e[o] = e[o + 1] = e[o + 2] = 255;
        d[o + 3] = Math.round(a * 255); e[o + 3] = Math.round(clamp(rim * a) * 255);
      }
      g.putImageData(im, 0, 0); masks.push(`url(${c.toDataURL()})`);
      g.putImageData(rm, 0, 0); rims.push(`url(${c.toDataURL()})`);
    }
    // decode ahead: every frame at once on the rim while it is still invisible, so none is fetched mid-reveal
    if (!(iris > 0 && iris < 1)) rimEl.style.webkitMaskImage = rimEl.style.maskImage = masks.concat(rims).join(',');
    shape = { A, R, N: (x, y) => fbm(x * 4 + 7.3, y * 4 + 1.9) };
    lastFrame = -1;
  }

  /* ---------- sparks orbiting the opening edge ---------- */
  const sg = sparks.getContext('2d');
  const SP = Array.from({ length: 44 }, (_, i) => ({ a: (i / 44) * Math.PI * 2 + Math.random() * .12, s: .18 + Math.random() * .3,
    r: 1 + Math.random() * 2.2, off: (Math.random() - .5) * .05, tw: Math.random() * 6.28, lav: Math.random() < .2 }));
  let iris = 0, spinRaf = 0, dpr = 1;
  function sizeSparks() { dpr = Math.min(devicePixelRatio || 1, 1.5); sparks.width = stage.clientWidth * dpr; sparks.height = stage.clientHeight * dpr; }
  function drawSparks(t) {
    spinRaf = 0;
    const W = sparks.width, H = sparks.height; sg.clearRect(0, 0, W, H);
    if (!shape || iris <= 0 || iris >= 1) return;
    const [rx, ry] = radii(iris, shape.R), amp = mix(.03, .2, iris), glow = Math.sin(Math.PI * iris);
    sg.globalCompositeOperation = 'lighter';
    for (const s of SP) {
      const a = s.a + t * .0001 * s.s * 6, cx = Math.cos(a) * rx, cy = Math.sin(a) * ry;
      const x = cx - shape.N(cx, cy) * amp * Math.cos(a), y = cy - shape.N(cx, cy) * amp * Math.sin(a);
      const px = (x / shape.A + .5) * W, py = (y + .5 + s.off) * H;
      const al = glow * (.55 + .45 * Math.sin(t * .003 + s.tw)), rr = s.r * dpr * (1 + iris);
      const gr = sg.createRadialGradient(px, py, 0, px, py, rr * 4);
      gr.addColorStop(0, s.lav ? `rgba(226,210,255,${al})` : `rgba(255,236,190,${al})`);
      gr.addColorStop(.3, s.lav ? `rgba(170,140,240,${al * .35})` : `rgba(240,180,100,${al * .35})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      sg.fillStyle = gr; sg.fillRect(px - rr * 4, py - rr * 4, rr * 8, rr * 8);
    }
    if (iris > 0 && iris < 1) spinRaf = requestAnimationFrame(drawSparks);
  }

  /* ---------- the reveal plays by itself once the world has arrived (about two seconds to the card) ---------- */
  const DUR = 3000;
  let raf = 0, seen = false, lastFrame = -1, P = 0, playRaf = 0;
  function play() {
    cancelAnimationFrame(playRaf);
    if (reduce) { P = 1; kick(); return; }
    const p0 = P, t0 = performance.now();
    const step = now => { P = Math.min(1, p0 + (now - t0) / DUR); frame(); if (P < 1) playRaf = requestAnimationFrame(step); };
    playRaf = requestAnimationFrame(step);
  }
  function reset() { cancelAnimationFrame(playRaf); P = 0; kick(); }
  function frame() {
    raf = 0;
    const p = reduce ? 1 : P;
    const v = {
      seam: smooth(0, .1, p),
      iris: smooth(.07, .52, p),
      light: smooth(.18, .55, p),
      gas: easeOut(smooth(.24, .62, p)),
      rise: easeOut(smooth(.46, .74, p))
    };
    for (const k in v) root.style.setProperty(`--${k}`, v[k].toFixed(4));
    iris = v.iris;
    // the iris: closed = nothing shows, open = no mask at all
    const fr = iris >= 1 || reduce ? FRAMES + 1 : Math.round(iris * FRAMES);
    if (fr !== lastFrame) {
      lastFrame = fr;
      const m = fr > FRAMES ? 'none' : masks[fr] || 'linear-gradient(transparent,transparent)';
      open.style.webkitMaskImage = open.style.maskImage = m;
      open.style.visibility = iris <= 0 ? 'hidden' : '';
      const r = fr > FRAMES ? null : rims[fr];
      if (r && iris > 0) { rimEl.style.webkitMaskImage = rimEl.style.maskImage = r; }
    }
    rimEl.style.opacity = (iris > 0 && iris < 1 && rims.length ? .42 * Math.sin(Math.PI * iris) : 0).toFixed(3);
    if (iris > 0 && iris < 1) { if (!spinRaf) spinRaf = requestAnimationFrame(drawSparks); }
    else if (sparks.width) sg.clearRect(0, 0, sparks.width, sparks.height);
    root.classList.toggle('is-card', v.rise > 0.01);
    card.inert = v.rise < 0.6;
    if (!seen && v.rise > 0.9) { seen = true; track('appt_view'); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sizeSparks(); if (entered) build(); kick(); }, 150); });

  /* ---------- the form: checked here, sent nowhere yet; the thank-you sits under it and the form stays ---------- */
  const form = root.querySelector('.appt-form');
  const done = root.querySelector('.appt-done');
  const thanks = done.querySelector('.appt-thanks');
  // each rule says whether the value is good; the message for a bad one is written under the field in index.html
  const RULES = {
    name: v => v.trim().length >= 2,
    phone: v => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')),
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
  };
  const fields = Object.keys(RULES).map(name => ({ name, input: form.elements[name], msg: root.querySelector(`#appt-${name}-err > span`) }));
  function check(f) {
    const ok = RULES[f.name](f.input.value);
    f.msg.hidden = ok;
    if (!ok) f.input.setAttribute('aria-invalid', 'true'); else f.input.removeAttribute('aria-invalid');
    return ok;
  }
  fields.forEach(f => {
    f.input.addEventListener('input', () => { if (f.input.hasAttribute('aria-invalid')) check(f); thanks.hidden = true; });
    f.input.addEventListener('blur', () => { if (f.input.value) check(f); });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = fields.filter(f => !check(f));
    if (bad.length) { thanks.hidden = true; bad[0].input.focus(); return; }
    // the only words put in by script: the first name she typed, into its slot in the written thank-you
    thanks.querySelector('.appt-first').textContent = form.elements.name.value.trim().split(/\s+/)[0];
    done.classList.remove('in'); void done.offsetWidth; done.classList.add('in');
    thanks.hidden = false;
    track('appt_submit');
  });

  sizeSparks(); frame();
  const world = root.closest('#appt-world');   // worlds.js adds .wd later
  if (world) {
    // load while the change of scene paints the closed sky; play once it has landed; close again on leaving
    let was = '';
    const check = () => {
      const st = world.classList.contains('arrived') ? 'arrived' : world.classList.contains('on') ? 'on' : '';
      if (st === was) return;
      if (st) { entered = true; build(); }
      if (st === 'arrived') play(); else if (!st) reset();
      was = st;
    };
    new MutationObserver(check).observe(world, { attributes: true, attributeFilter: ['class'] }); check();
  } else { entered = true; build(); play(); }
})();
