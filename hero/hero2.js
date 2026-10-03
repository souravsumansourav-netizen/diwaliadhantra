/* hero2.js — v4's hero: the opening (the sky settles, she comes near, stardust streams in from the whole screen and lands on
   her jewellery, which lights; then the words), then rest: twinkles in her hair, planets drifting, and on a computer,
   pointing moves each layer by its depth. Skip intro / Replay as before (page.js presses Skip when the page is scrolled). */
(() => {
'use strict';
const hero = document.getElementById('hero'); if (!hero || !hero.classList.contains('h2')) return;
const $ = s => hero.querySelector(s);
const canvas = $('#dust'), ctx = canvas.getContext('2d'), jewels = $('.h2-jewels.lit'), skip = $('#skip'), replay = $('#replay');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const D = window.HERO_DATA || { targets: [] };
const clamp = x => Math.max(0, Math.min(1, x)), smooth = (a, b, t) => { const q = clamp((t - a) / (b - a)); return q * q * (3 - 2 * q); };
let W = 0, H = 0, raf = 0, t0 = 0, done = false, timers = [];
let seed = 11; const rnd = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
// each grain: where it starts (anywhere on the screen), when it sets off, a little bend in its path
const motes = D.targets.map(([u, v]) => ({ u, v, sx: rnd(), sy: rnd(), delay: Math.pow(rnd(), .8) * .45, bend: (rnd() - .5) * .5, size: .6 + rnd() * 1.2 }));
const mote = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,246,220,1)'); r.addColorStop(.2, 'rgba(255,214,146,.8)'); r.addColorStop(.5, 'rgba(255,186,96,.18)'); r.addColorStop(1, 'rgba(255,170,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32); return c; })();
function size() { const d = Math.min(devicePixelRatio || 1, 1.5); W = hero.clientWidth; H = hero.clientHeight; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }

const DUST_A = 1.0, DUST_B = 3.6;              // seconds: the stardust's flight
function frame(now) {
  const t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
  const p = smooth(DUST_A, DUST_B, t), fade = 1 - smooth(DUST_B - .1, DUST_B + .5, t);
  if (p > 0 && fade > 0) {
    const r = jewels.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const m of motes) {
      let u = clamp((p - m.delay) / (1 - m.delay)); if (!u) continue; u = u * u * (3 - 2 * u);
      const tx = r.left - hr.left + m.u * r.width, ty = r.top - hr.top + m.v * r.height, sx = m.sx * W, sy = m.sy * H;
      const nx = -(ty - sy), ny = tx - sx, k = u * (1 - u) * m.bend;          // a gentle curve in
      const x = sx + (tx - sx) * u + nx * k, y = sy + (ty - sy) * u + ny * k;
      const u2 = Math.max(0, u - .06), x2 = sx + (tx - sx) * u2 + nx * u2 * (1 - u2) * m.bend, y2 = sy + (ty - sy) * u2 + ny * u2 * (1 - u2) * m.bend;
      const a = fade * (.35 + .65 * u);
      ctx.strokeStyle = `rgba(255,214,150,${(a * .35).toFixed(3)})`; ctx.lineWidth = m.size * .8; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      const s = (5 + 6 * m.size) * (u > .97 ? 1.4 : 1); ctx.globalAlpha = a; ctx.drawImage(mote, x - s / 2, y - s / 2, s, s); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (t < DUST_B + .6) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
}
const at = (ms, fn) => timers.push(setTimeout(fn, ms));
function play() {
  stop(); done = false; hero.classList.remove('in', 'lit', 'flash', 'words'); skip.hidden = false; replay.hidden = true;
  void hero.offsetWidth;
  if (reduced.matches) { settle(); return; }
  t0 = performance.now(); size(); raf = requestAnimationFrame(frame);
  at(60, () => hero.classList.add('in'));                                  // the sky settles, she comes near
  at(DUST_B * 1000 - 500, () => hero.classList.add('lit', 'flash'));        // the jewellery lights as the dust lands
  at(DUST_B * 1000 + 700, () => hero.classList.remove('flash'));
  at(DUST_B * 1000 + 500, () => hero.classList.add('words'));              // then the words
  at(DUST_B * 1000 + 1600, settle);
}
function stop() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; }
function settle() { stop(); done = true; ctx.clearRect(0, 0, W, H); hero.classList.add('in', 'lit', 'words'); hero.classList.remove('flash'); skip.hidden = true; replay.hidden = false; }
skip.onclick = settle; replay.onclick = play;
addEventListener('resize', size);
// pointing: each layer by its depth (computers only; a phone rests)
if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced.matches) {
  let pr = 0, x = 0, y = 0;
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); x = (e.clientX - r.left) / r.width * 2 - 1; y = (e.clientY - r.top) / r.height * 2 - 1;
    if (!pr) pr = requestAnimationFrame(() => { pr = 0; hero.style.setProperty('--px', x.toFixed(3)); hero.style.setProperty('--py', y.toFixed(3)); }); });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--px', 0); hero.style.setProperty('--py', 0); });
}
// start once her pictures are ready (they are in the page)
Promise.all([...hero.querySelectorAll('img')].map(im => im.decode().catch(() => {}))).then(play);
})();
