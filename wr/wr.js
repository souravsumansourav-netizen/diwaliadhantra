/* Adhyantara — From Whisper to Radiance (section 3). No dependencies.
   Whisper on the left, Radiance on the right, the piece big in the middle: four pieces, thin to grand.
   Moving from one to the next warms the whole universe a little more (--t runs 0 -> 1).
   Tap a word (to its end), a dot, an arrow, swipe the piece, or use the arrow keys. */
(() => {
  'use strict';
  const root = document.getElementById('whisper-radiance');
  if (!root) return;
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = (event, data = {}) => { try { (window.dataLayer = window.dataLayer || []).push({ event, ...data }); } catch {} };
  const easeInOut = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  // everything to show is already in the HTML: a figure, a dot and a set of [data-i] words per piece. This only picks which is on.
  const figs = $$('.wr-piece'), dots = $$('.wr-dot'), words = $$('.wr-states [data-i]'), heads = $$('.wr-h[data-half]');
  const N = figs.length, LAST = N - 1, sku = i => figs[i].dataset.sku;
  if (!N) return;
  new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { track('wr_view'); io.disconnect(); } }, { rootMargin: '400px' }).observe(root);

  /* gold dust: the tile in the HTML, repeated into its canvas at 560px, centred like the old background */
  const dust = $('.wr-dust canvas'), dustImg = $('.wr-dust-src');
  function drawDust() {
    const W = dust.clientWidth, H = dust.clientHeight; if (!W || !H || !dustImg.complete || !dustImg.naturalWidth) return;   // not until the tile has fully arrived
    const d = Math.min(devicePixelRatio || 1, 1.5), c = dust.getContext('2d'), pat = c.createPattern(dustImg, 'repeat'), k = 560 / dustImg.naturalWidth;
    if (!pat) return;
    dust.width = Math.round(W * d); dust.height = Math.round(H * d);
    pat.setTransform(new DOMMatrix().translate((W - 560) / 2, (H - 560) / 2).scale(k));
    c.setTransform(d, 0, 0, d, 0, 0); c.fillStyle = pat; c.fillRect(0, 0, W, H);
  }
  if (dustImg.complete) drawDust(); else dustImg.addEventListener('load', drawDust);      // lazy: loads only where the dust is shown (not phones)
  new ResizeObserver(drawDust).observe(dust);

  /* the pieces: .is-on moves along; the others wait to the side they would come from (data-pos), so each change slides a little that way */
  let cur = 0;
  function showPiece(i) {
    figs.forEach((f, k) => { const on = k === i; f.classList.toggle('is-on', on); f.inert = !on; f.dataset.pos = k < i ? 'before' : k > i ? 'after' : ''; });
    words.forEach(e => e.hidden = +e.dataset.i !== i);
    heads.forEach(h => h.hidden = h.dataset.half !== (i / LAST < .5 ? 'whisper' : 'radiance'));
    dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    $$('.wr-arw').forEach(b => b.disabled = (+b.dataset.dir < 0 && i === 0) || (+b.dataset.dir > 0 && i === LAST));
    root.dispatchEvent(new CustomEvent('wr:piece', { detail: i }));   // v4: wr-form.js makes it of stardust
  }

  /* the light: t is how far along, 0 at Whisper, 1 at Radiance; it eases to the new piece and the universe follows */
  let t = 0, anim = 0;
  function paint() {
    root.style.setProperty('--t', t.toFixed(4));
    const st = t >= .5 ? 'radiance' : 'whisper';
    if (root.dataset.state !== st) { root.dataset.state = st; $('.wr-word.w').setAttribute('aria-pressed', st === 'whisper'); $('.wr-word.r').setAttribute('aria-pressed', st === 'radiance'); }
    root.classList.toggle('is-landed', !anim);
  }
  function go(i, how) {
    i = Math.max(0, Math.min(LAST, i)); if (i === cur) return;
    const from = t, dest = i / LAST, dur = reduce ? 0 : 700 + 260 * Math.abs(i - cur), t0 = performance.now();
    cur = i; showPiece(i); track('wr_travel', { to: sku(i), how });
    cancelAnimationFrame(anim); anim = 0;
    if (!dur) { t = dest; paint(); return; }
    const step = now => { const u = Math.min(1, (now - t0) / dur); t = from + (dest - from) * easeInOut(u);
      anim = u < 1 ? requestAnimationFrame(step) : 0; paint(); };
    anim = requestAnimationFrame(step); paint();
  }
  $$('.wr-word').forEach(w => w.addEventListener('click', () => go(w.dataset.to === 'last' ? LAST : 0, 'word')));
  dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.go, 'dot')));
  $$('.wr-arw').forEach(b => b.addEventListener('click', () => go(cur + (+b.dataset.dir), 'arrow')));
  root.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 'key'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, 'key'); }
  });

  /* a swipe across the piece moves one along; a tap opens the piece */
  const stage = $('.wr-stage'); let sx = null, sy = null;
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
  stage.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1), 'swipe'); });
  $$('.wr-piece-link').forEach(a => a.addEventListener('click', e => { if (a.getAttribute('href') === '#') e.preventDefault(); track('wr_pdp', { sku: sku(cur), how: 'piece' }); }));

  /* threads from each point on the choker to its name */
  $$('.wr-note').forEach(n => {
    const cs = getComputedStyle(n), lx = parseFloat(cs.getPropertyValue('--lx')), ly = parseFloat(cs.getPropertyValue('--ly'));
    n.style.setProperty('--len', `${Math.hypot(lx, ly).toFixed(1)}px`); n.style.setProperty('--ang', `${Math.atan2(ly, lx).toFixed(4)}rad`);
    n.querySelector('span').style.transform = Math.abs(lx) < 20 ? `translate(-50%,${ly > 0 ? '4px' : 'calc(-100% - 4px)'})` : lx < 0 ? 'translate(calc(-100% - 10px),-50%)' : 'translate(10px,-50%)';
  });
  const noteEls = $$('.wr-note'), legend = $$('.wr-legend button');
  function pick(k) {
    const on = !noteEls.find(n => n.dataset.k === k).classList.contains('is-on');
    noteEls.forEach(n => n.classList.toggle('is-on', on && n.dataset.k === k));
    legend.forEach(b => b.setAttribute('aria-pressed', on && b.dataset.k === k)); track('wr_note', { k });
  }
  [...noteEls, ...legend].forEach(n => n.addEventListener('click', () => pick(n.dataset.k)));
  $$('.wr-pdp').forEach(a => a.addEventListener('click', () => track('wr_pdp', { sku: sku(cur) })));

  /* a few faint twinkles, drawn only while this world is on screen */
  const tw = $('.wr-twinkle');
  const tc = tw.getContext('2d'), stars = Array.from({ length: 70 }, (_, i) => ({ x: (Math.sin(i * 12.9898) * 43758.5453) % 1, y: (Math.sin(i * 78.233) * 12345.678) % 1, r: .6 + (i % 5) * .35, ph: i * 2.4, sp: .4 + (i % 7) * .12, gold: i % 3 === 0 }));
  stars.forEach(s => { s.x = Math.abs(s.x); s.y = Math.abs(s.y); });
  const world = root.closest('.pg');
  function twinkle(now) {
    requestAnimationFrame(twinkle);
    if (!world || !world.classList.contains('on') || document.hidden) return;
    const d = Math.min(devicePixelRatio || 1, 1.5), W = root.clientWidth, H = root.clientHeight;
    if (tw.width !== Math.round(W * d) || tw.height !== Math.round(H * d)) { tw.width = Math.round(W * d); tw.height = Math.round(H * d); }
    tc.setTransform(d, 0, 0, d, 0, 0); tc.clearRect(0, 0, W, H); const k = now / 1000;
    for (const s of stars) {
      const a = (.25 + .75 * Math.pow(.5 + .5 * Math.sin(k * s.sp + s.ph), 3)) * (s.gold ? .75 : .55), x = s.x * W, y = s.y * H * .92;
      const g = tc.createRadialGradient(x, y, 0, x, y, s.r * 3.2);
      g.addColorStop(0, s.gold ? `rgba(255,222,160,${a})` : `rgba(236,238,255,${a})`); g.addColorStop(.35, s.gold ? `rgba(240,192,112,${a * .35})` : `rgba(210,216,255,${a * .3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      tc.fillStyle = g; tc.beginPath(); tc.arc(x, y, s.r * 3.2, 0, 6.2832); tc.fill();
    }
  }
  if (!reduce) requestAnimationFrame(twinkle);

  showPiece(0); paint();
})();
