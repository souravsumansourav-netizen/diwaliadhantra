/* Adhyantara — Name a Star (section 7).
   Plain JS, no dependencies. The sky (stars, depths, pieces, words, images, links) is authored in index.html;
   this script positions, animates and toggles it, and talks to the claim API through one adapter. */
(() => {
  'use strict';
  const root = document.getElementById('name-a-star');
  if (!root) return;

  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];
  const q = (k, el = root) => el.querySelector(`[data-nas="${k}"]`);
  const svg = $('.nas-lines');
  // scroll source: the page, or the scrolling world that hosts the section (data-nas-scroller)
  const SC = root.closest('[data-nas-scroller]'), scEl = SC || window;
  const scY = () => SC ? SC.scrollTop : scrollY, scTo = (a, b) => (b === undefined ? scEl.scrollTo(a) : scEl.scrollTo(a, b));
  const scTop = () => SC ? SC.getBoundingClientRect().top : 0;
  const panel = $('.nas-panel'), toast = $('.nas-toast');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const track = (name, data = {}) => {
    try { (window.dataLayer = window.dataLayer || []).push({ event: name, ...data }); } catch {}
    root.dispatchEvent(new CustomEvent('nas:event', { detail: { name, ...data } }));
  };

  /* ---------------- API adapter ----------------
     mock: claims live in this browser (for review).
     url : GET {base}/sky -> {taken:[ids], released:[waves]}
           POST {base}/claim {mode:'one'|'group', starIds:[ids], people:[{name,phone}], from, msg, phone, callback}
                -> {id, shareUrl} | 409 {conflict:true} | 429 {limit:true}
           GET  {base}/claim/{id}      -> {mode}                       (nothing personal before the number matches)
           POST {base}/claim/{id}/open {name, phone} -> {starId, to, from, msg, mode, stars:[ids]} | 403 (no match)
                (the server records the session: who opened it, when) */
  const apiMode = root.dataset.api || 'mock';
  const MockApi = {
    // a few stars already taken so the "named" state is visible in review
    seed: ['004', '011', '019', '027'],
    async sky() {
      const mine = store.get('nas-claims', []);
      return { taken: [...this.seed, ...mine.map(c => c.starId)], released: [1] };
    },
    async claim(body) {
      await new Promise(r => setTimeout(r, 700));
      const claims = store.get('nas-claims', []);
      const gone = new Set([...this.seed, ...claims.flatMap(c => c.starIds || [c.starId])]);
      if (body.starIds.some(id => gone.has(id))) return { conflict: true };
      if (claims.filter(c => c.phone === body.phone).length >= 2) return { limit: true };
      const id = Math.random().toString(36).slice(2, 10);
      claims.push({ id, starIds: body.starIds, phone: body.phone, callback: body.callback });
      store.set('nas-claims', claims);
      // no server in mock mode: the dedication travels in the link itself, each person's number only as a hash
      const c = b64({ g: body.mode === 'group' ? 1 : 0, s: body.starIds, t: body.people.map(p => p.name), h: body.people.map(p => hashPhone(p.phone)),
        f: body.from, m: body.msg, d: Date.now() });
      return { id, shareUrl: `${location.origin}${location.pathname}#star=${body.starIds[0]}&c=${c}` };
    },
    async claimInfo() { return null; }
  };
  const UrlApi = base => ({
    async sky() { const r = await fetch(`${base}/sky`, { cache: 'no-store' }); if (!r.ok) throw 0; return r.json(); },
    async claim(body) {
      const r = await fetch(`${base}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 409) return { conflict: true };
      if (r.status === 429) return { limit: true };
      if (!r.ok) throw 0;
      return r.json();
    },
    async claimInfo(id) { const r = await fetch(`${base}/claim/${encodeURIComponent(id)}`); return r.ok ? r.json() : null; },
    async openClaim(id, body) {
      const r = await fetch(`${base}/claim/${encodeURIComponent(id)}/open`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 403 || r.status === 404) return { nomatch: true };
      if (!r.ok) throw 0;
      return r.json();
    },
    // the certificate is drawn in the browser; the server keeps a copy for the WhatsApp link preview
    async uploadCard(id, token, blob) {
      try { await fetch(`${base}/claim/${encodeURIComponent(id)}/card`, { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-claim-token': token }, body: blob }); } catch {}
    }
  });
  const api = apiMode === 'mock' ? MockApi : UrlApi(apiMode.replace(/\/$/, ''));

  function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } }
  // (mock only: a recipient's number is never in the link, only this hash of it; the server matches real numbers)
  function hashPhone(p) { let h = 0x811c9dc5; for (const ch of 'adh:' + p) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
  const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

  /* ---------------- Indic fonts on demand ---------------- */
  const SCRIPTS = [
    [/[ऀ-ॿ]/, 'Noto Serif Devanagari'], [/[ঀ-৿]/, 'Noto Serif Bengali'],
    [/[਀-੿]/, 'Noto Serif Gurmukhi'], [/[઀-૿]/, 'Noto Serif Gujarati'],
    [/[଀-୿]/, 'Noto Serif Oriya'], [/[஀-௿]/, 'Noto Serif Tamil'],
    [/[ఀ-౿]/, 'Noto Serif Telugu'], [/[ಀ-೿]/, 'Noto Serif Kannada'],
    [/[ഀ-ൿ]/, 'Noto Serif Malayalam']
  ];
  const loadedFonts = new Set();
  async function ensureFonts(text) {
    const need = SCRIPTS.filter(([re]) => re.test(text)).map(([, f]) => f).filter(f => !loadedFonts.has(f));
    for (const f of need) {
      loadedFonts.add(f);
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}:wght@400&display=swap`;
      document.head.appendChild(l);
      await new Promise(r => { l.onload = r; l.onerror = r; });
      try { await document.fonts.load(`40px "${f}"`, text); } catch {}
    }
  }
  const NAME_STACK = '"Italiana","Noto Serif Devanagari","Noto Serif Bengali","Noto Serif Gurmukhi","Noto Serif Gujarati","Noto Serif Oriya","Noto Serif Tamil","Noto Serif Telugu","Noto Serif Kannada","Noto Serif Malayalam",Georgia,serif';

  /* ---------------- words: every string on screen is authored in the HTML (.nas-msgs) ---------------- */
  const msgEl = k => root.querySelector(`.nas-msgs [data-msg="${k}"]`);
  const fill = (t, v = {}) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const word = (k, v) => fill(msgEl(k).textContent, v);
  // an element's image once it has loaded (a lazy one is asked for now)
  const ready = img => {
    if (img.loading === 'lazy') img.loading = 'eager';
    return img.complete && img.naturalWidth ? Promise.resolve(img)
      : img.decode().then(() => img, () => new Promise((res, rej) => { if (img.complete && img.naturalWidth) res(img); else { img.addEventListener('load', () => res(img), { once: true }); img.addEventListener('error', rej, { once: true }); } }));
  };

  /* ---------------- state ---------------- */
  let DATA, byId = {}, prod = {}, cons = {}, taken = new Set(), released = new Set([1]);
  let current = null, lastFocus = null, done = null;
  const mine = () => store.get('nas-mine', []);
  let uni = store.get('nas-uni', null), uniLines = [];       // {stars:[ids], from} — the group this visitor named or joined
  const UNI_MIN = 5, GROUP_MAX = 10;
  const des = id => word('des', { id });
  const total = () => DATA.stars.filter(s => released.has(s.wave)).length;

  /* ---------------- build ---------------- */
  const stage = $('.nas-stage'), space = $('.nas-space'), skyEl = $('.nas-sky'), dusts = $$('.nas-dust');
  const nav = $('.nas-nav'), motes = $('.nas-motes'), beam = $('.nas-beam');
  // the sky is one flat field in the window: both constellations side by side; the wheel (or a pinch) zooms the
  // view about the pointer and a drag pans it, never past the field's edges
  const view = { z: 1, x: 0, y: 0, tz: 1, tx: 0, ty: 0 }, ZMAX = 3.2;
  let els = [], lineEls = [], W = 0, H = 0, raf = 0, locked = false, settleT = 0, order = [];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // the sky as authored: the depth buttons carry each constellation, the star buttons each star, .nas-prods each piece
  function read() {
    const n = (el, k) => parseFloat(el.dataset[k]);
    const products = $$('.nas-prods [data-sku]').map(el => ({
      sku: el.dataset.sku, title: $('[data-f="title"]', el).textContent, line: $('[data-f="line"]', el).textContent
    }));
    const constellations = $$('button', nav).map(b => ({
      key: b.dataset.cat, name: b.lastChild.textContent.trim(), Z: n(b, 'z'),
      edges: b.dataset.edges.trim().split(/\s+/).map(e => e.split('-'))
    }));
    const stars = $$('.nas-star', space).map(b => ({
      id: b.dataset.id, cat: b.dataset.cat, sku: b.dataset.sku, wave: n(b, 'wave'),
      X: n(b, 'x'), Y: n(b, 'y'), Z: n(b, 'z'), mag: n(b, 'mag'), x: n(b, 'px'), y: n(b, 'py'), b
    }));
    return { products, constellations, stars };
  }

  init(read()).catch(() => {});

  async function init(d) {
    DATA = d;
    d.products.forEach(p => prod[p.sku] = p);
    d.constellations.forEach(c => cons[c.key] = c);
    d.stars.forEach(s => byId[s.id] = s);

    // the nameable stars (authored in the HTML in the order they paint); each twinkles on its own beat
    d.stars.forEach(s => {
      const b = s.b; delete s.b;
      b.style.setProperty('--t', `${(2.8 + Math.random() * 3.2).toFixed(2)}s`);
      b.style.setProperty('--d', `${(-Math.random() * 5).toFixed(2)}s`);
      b.style.setProperty('--alt', `${(7 + Math.random() * 4).toFixed(2)}s`);
      b.style.setProperty('--ad', `${(-Math.random() * 11).toFixed(2)}s`);
      b.dataset.label = b.getAttribute('aria-label');
      els.push({ s, b, vis: b.firstElementChild, piece: $('.piece', b), o: 0, sx: 0, sy: 0, px: 0, py: 0 });
    });

    // constellation lines
    const ns = 'http://www.w3.org/2000/svg';
    d.constellations.forEach(c => c.edges.forEach(([a, b]) => {
      const l = document.createElementNS(ns, 'line'); svg.appendChild(l);
      lineEls.push({ l, a: els.find(e => e.s.id === a), b: els.find(e => e.s.id === b), key: c.key });
    }));

    // the ambient sky: stars that become jewels and turn back into stars
    buildMotes();

    await refreshSky();
    wire();
    measure(); layout(); setUniverse(uni); render();

    new IntersectionObserver((es, io) => {
      if (es.some(e => e.isIntersecting)) { root.classList.add('is-lit'); track('nas_view'); io.disconnect(); }
    }, { threshold: 0.05 }).observe(root);

    openFromHash();
  }

  // the motes are authored in the HTML (14, each holding its piece); a phone keeps the first 8
  function buildMotes() {
    const phone = innerWidth < 721, n = phone ? 8 : 14, placed = [], all = $$('.nas-mote', motes);
    let tries = 0;
    while (placed.length < n && tries++ < 800) {
      const x = 4 + Math.random() * 92, y = 14 + Math.random() * 72;
      if (!phone && x > 30 && x < 70 && y < 24) continue;                   // keep the nav clear
      if (placed.some(([a, b]) => Math.hypot((a - x) * (phone ? 0.5 : 1), b - y) < (phone ? 16 : 13))) continue;
      const m = all[placed.length];
      placed.push([x, y]);
      const w = phone ? 34 + Math.random() * 12 : 42 + Math.random() * 20;
      const t = (8 + Math.random() * 5).toFixed(2), dl = (-Math.random() * 12).toFixed(2);
      m.style.cssText = `left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--mt:${t}s;--md:${dl}s;--mw:${w.toFixed(0)}px`;
    }
    all.slice(placed.length).forEach(m => m.remove());
  }

  async function refreshSky() {
    try {
      const r = await api.sky();
      taken = new Set(r.taken || []);
      released = new Set(r.released || [1]);
    } catch { taken = new Set(); }
    const my = new Map(mine().map(m => [m.id, m.to]));
    els.forEach(e => {
      const s = e.s, b = e.b, p = prod[s.sku];
      e.off = !released.has(s.wave);
      const isMine = my.has(s.id), isTaken = taken.has(s.id) || isMine;
      b.classList.toggle('is-taken', isTaken && !isMine);
      b.classList.toggle('is-mine', isMine);
      const tt = b.querySelector('.nas-tag-t'), tb = b.querySelector('.nas-tag b');
      const v = { des: des(s.id), cons: cons[s.cat].name, title: p.title };
      if (isMine) { tb.textContent = my.get(s.id); tb.style.fontFamily = NAME_STACK; tt.textContent = word('tag-mine'); }
      else { tb.textContent = p.title; tb.style.fontFamily = ''; tt.textContent = word(isTaken ? 'tag-named' : 'tag-free', v); }
      b.setAttribute('aria-label', isTaken ? word('star-label-named', v) : b.dataset.label);
    });
    q('free').textContent = DATA.stars.filter(s => released.has(s.wave) && !taken.has(s.id)).length;
    q('total').textContent = total();
  }

  /* ---------------- the sky: one field, zoomed and panned ---------------- */
  function measure() { W = stage.clientWidth; H = stage.clientHeight; }
  // each constellation fills its own half of the window (side by side; stacked on a tall screen)
  function layout() {
    const port = H > W * 1.1, top = H * 0.2, bot = H * 0.9;
    DATA.constellations.forEach((c, i) => {
      const ss = els.filter(e => e.s.cat === c.key);
      const xs = ss.map(e => e.s.X), ys = ss.map(e => e.s.Y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const bx = port ? [W * 0.12, W * 0.88] : [W * (0.07 + 0.46 * i), W * (0.47 + 0.46 * i)];
      const by = port ? [top + (bot - top) * i / 2 + 20, top + (bot - top) * (i + 1) / 2 - 20] : [top, bot];
      const k = Math.min((bx[1] - bx[0]) / Math.max(0.01, x1 - x0), (by[1] - by[0]) / Math.max(0.01, y1 - y0));
      const ox = (bx[0] + bx[1]) / 2 - (x0 + x1) / 2 * k, oy = (by[0] + by[1]) / 2 - (y0 + y1) / 2 * k;
      ss.forEach(e => { e.px = ox + e.s.X * k; e.py = oy + e.s.Y * k; });
    });
    // reading order for the card's previous / next: along each constellation, left to right
    order = [...els].sort((a, b) => DATA.constellations.findIndex(c => c.key === a.s.cat) - DATA.constellations.findIndex(c => c.key === b.s.cat) || a.px - b.px).map(e => e.s.id);
  }
  const clampView = v => { const mx = W / 2 * (1 - 1 / v.tz), my = H / 2 * (1 - 1 / v.tz); v.tx = Math.max(-mx, Math.min(mx, v.tx)); v.ty = Math.max(-my, Math.min(my, v.ty)); };
  // zoom about a point on screen, keeping what is under it where it is
  function zoomAt(f, cx, cy) {
    const z0 = view.tz, z1 = Math.max(1, Math.min(ZMAX, z0 * f)); if (z1 === z0) return;
    const px = (cx - W / 2) / z0 + W / 2 + view.tx, py = (cy - H / 2) / z0 + H / 2 + view.ty;
    view.tz = z1; view.tx = px - W / 2 - (cx - W / 2) / z1; view.ty = py - H / 2 - (cy - H / 2) / z1;
    clampView(view); kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0; const k = reduce ? 1 : 0.2;
    view.z += (view.tz - view.z) * k; view.x += (view.tx - view.x) * k; view.y += (view.ty - view.y) * k;
    render();
    if (Math.abs(view.tz - view.z) > 0.0005 || Math.abs(view.tx - view.x) > 0.05 || Math.abs(view.ty - view.y) > 0.05) kick();
  }
  function render() {
    const z = view.z, toX = x => (x - W / 2 - view.x) * z + W / 2, toY = y => (y - H / 2 - view.y) * z + H / 2;
    skyEl.style.transform = `translate3d(calc(-50% + ${(-view.x * 0.18).toFixed(1)}px), ${(-view.y * 0.18).toFixed(1)}px, 0) scale(${(1.14 + (z - 1) * 0.08).toFixed(4)})`;
    root.style.setProperty('--vz', z.toFixed(3));
    for (const e of els) {
      const sx = toX(e.px), sy = toY(e.py), b = e.b;
      const o = e.off || sx < -120 || sx > W + 120 || sy < -120 || sy > H + 120 ? 0 : 1;
      e.o = o; e.sx = sx; e.sy = sy;
      if (!o) { if (b.style.opacity !== '0') { b.style.opacity = '0'; b.style.pointerEvents = 'none'; } continue; }
      b.style.opacity = '1'; b.style.pointerEvents = 'auto';
      b.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      e.vis.style.transform = `scale(${(0.85 + 0.35 * (z - 1)).toFixed(3)})`;
    }
    const gaze = root.classList.contains('is-gazing'), own = uniLines.length > 0;
    for (const L of lineEls) {
      const o = Math.min(L.a.o, L.b.o) * (L.key === 'uni' ? (gaze ? 1 : 0) : gaze ? (own ? 0 : 1) : 0.22);
      if (o < 0.01) { if (L.l.style.opacity !== '0') L.l.style.opacity = '0'; continue; }
      L.l.setAttribute('x1', L.a.sx.toFixed(1)); L.l.setAttribute('y1', L.a.sy.toFixed(1));
      L.l.setAttribute('x2', L.b.sx.toFixed(1)); L.l.setAttribute('y2', L.b.sy.toFixed(1));
      L.l.style.opacity = o.toFixed(3);
    }
  }

  /* the visitor's universe (stargazing rule): five or more named stars are joined among themselves and the
     constellations step back; fewer than five, stargazing joins every star as before */
  function setUniverse(u) {
    uni = u && u.stars && u.stars.length ? u : null;
    uniLines.forEach(L => L.l.remove()); lineEls = lineEls.filter(L => L.key !== 'uni'); uniLines = [];
    const ids = new Set(uni ? uni.stars : []);
    els.forEach(e => e.b.classList.toggle('is-uni', ids.has(e.s.id)));
    if (!uni || uni.stars.length < UNI_MIN) return;
    const pts = uni.stars.map(id => els.find(e => e.s.id === id)).filter(Boolean), inTree = [pts[0]], rest = pts.slice(1);
    while (rest.length) {               // Prim: the nearest star not yet joined, to the star it is nearest
      let best = null;
      for (const a of inTree) for (const b of rest) { const d = Math.hypot(a.px - b.px, a.py - b.py); if (!best || d < best.d) best = { a, b, d }; }
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.classList.add('uni'); svg.appendChild(l);
      const L = { l, a: best.a, b: best.b, key: 'uni' }; uniLines.push(L); lineEls.push(L);
      inTree.push(best.b); rest.splice(rest.indexOf(best.b), 1);
    }
  }

  /* the spotlight: every few seconds one free star grows, shines as its jewel and shows its name and the call to
     name it, so the sky itself asks to be tapped */
  let spotT = 0, spotId = null, hovering = false;
  const inSky = () => root.closest('#nas-world')?.classList.contains('is-inside') ?? true;   // v3: the framed window is open
  function spot() {
    clearTimeout(spotT); spotT = setTimeout(spot, 2800);
    if (locked || hovering || !inSky() || document.hidden) return;
    const my = new Set(mine().map(m => m.id));
    const pool = els.filter(e => e.o && !e.off && !taken.has(e.s.id) && !my.has(e.s.id) && e.s.id !== spotId
      && e.sx > W * 0.12 && e.sx < W * 0.88 && e.sy > H * 0.24 && e.sy < H * 0.8);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSpot(pick ? pick.s.id : null);
  }
  function setSpot(id) { spotId = id; els.forEach(e => e.b.classList.toggle('is-spot', e.s.id === id)); if (id) { const e = els.find(x => x.s.id === id); if (e.piece.loading === 'lazy') e.piece.loading = 'eager'; } }
  root.addEventListener('nas:enter', () => { els.forEach(e => { if (e.piece.loading === 'lazy') e.piece.loading = 'eager'; }); clearTimeout(spotT); spotT = setTimeout(spot, 900); });

  /* for the page around this section (worlds.js): the sky as it stands on arrival, and where each star is */
  window.__nas = {
    ready: () => !!DATA,
    arrival() { if (!DATA) return; measure(); layout(); view.z = view.tz = 1; view.x = view.y = view.tx = view.ty = 0; render(); },
    stars: () => els.map(e => ({ id: e.s.id, b: e.b, x: e.sx, y: e.sy, o: e.o, mag: e.s.mag }))
  };

  /* the beam: from the star that was tapped to the centre, where the card settles */
  function aimBeam(e) {
    const tx = W / 2, ty = H / 2;
    const sx = e && e.o > 0 ? e.sx : tx, sy = e && e.o > 0 ? e.sy : ty - H * 0.4;
    const len = Math.max(60, Math.hypot(tx - sx, ty - sy));
    root.style.setProperty('--bx', `${sx.toFixed(1)}px`); root.style.setProperty('--by', `${sy.toFixed(1)}px`);
    root.style.setProperty('--bl', `${(len * 1.08).toFixed(1)}px`); root.style.setProperty('--ba', `${Math.atan2(ty - sy, tx - sx).toFixed(4)}rad`);
    root.style.setProperty('--bw', `${Math.min(460, Math.max(240, W * 0.3)).toFixed(0)}px`);
    // the card rides in from the star's side
    root.style.setProperty('--cx', `${((sx - tx) * 0.35).toFixed(1)}px`); root.style.setProperty('--cy', `${((sy - ty) * 0.35).toFixed(1)}px`);
  }

  function wire() {
    addEventListener('resize', () => { measure(); layout(); clampView(view); render(); });
    stage.addEventListener('wheel', e => {
      if (locked || !inSky()) return;
      e.preventDefault(); const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    const pts = new Map(); let moved = 0, pinch = 0;
    space.style.touchAction = 'none';
    space.addEventListener('pointerdown', e => {
      if (locked) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p || locked) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = stage.getBoundingClientRect();
        if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinch = d; moved += 10; return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { root.classList.add('is-panning'); view.tx -= dx / view.tz; view.ty -= dy / view.tz; clampView(view); view.x = view.tx; view.y = view.ty; kick(); }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) setTimeout(() => root.classList.remove('is-panning'), 0); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    space.addEventListener('click', e => { if (moved > 6) { moved = 0; return; } const b = e.target.closest('.nas-star'); if (b) openStar(b.dataset.id); });
    // hovering a star shows its name and the call to name it; the spotlight waits while you look
    space.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' && e.target.closest('.nas-star')) { hovering = true; setSpot(null); } });
    space.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && e.target.closest('.nas-star')) hovering = false; });
    // a star reached by the keyboard is brought into view
    space.addEventListener('focusin', e => {
      const b = e.target.closest('.nas-star'); if (!b || locked) return;
      const el = els.find(x => x.b === b); if (!el || (el.sx > 40 && el.sx < W - 40 && el.sy > 40 && el.sy < H - 40)) return;
      view.tx = el.px - W / 2; view.ty = el.py - H / 2; clampView(view); kick();
    });
    q('prev').addEventListener('click', () => step(-1));
    q('next').addEventListener('click', () => step(1));
    q('gaze').addEventListener('click', e => {
      const on = !root.classList.contains('is-gazing');
      root.classList.toggle('is-gazing', on);
      e.currentTarget.setAttribute('aria-pressed', on);
      if (on) track('nas_stargazing_on');
      kick();
    });
    // while the card is open the sky holds still
    const hold = e => {
      if (!locked) return;
      const body = e.target.closest('.nas-panel-body');
      if (!body || body.scrollHeight <= body.clientHeight + 1) e.preventDefault();
    };
    addEventListener('wheel', hold, { passive: false });
    addEventListener('touchmove', hold, { passive: false });
    $('.nas-veil2').addEventListener('click', closePanel);

    q('close').addEventListener('click', closePanel);
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape' && locked) closePanel();
      if (e.key === 'Tab' && locked) { // keep focus inside the card
        const f = [...panel.querySelectorAll('button:not([hidden]),a[href],input')].filter(x => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('[data-nas="name"]').forEach(b => b.addEventListener('click', () => show('who')));
    q('near').addEventListener('click', () => { const n = nearestFree(current, false); if (n) openStar(n.id); });
    // one person, or a group: the same form, with one person's row or several
    $$('.nas-who-opt').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.who); show('form'); track('nas_who', { mode: b.dataset.who }); }));
    q('who-back').addEventListener('click', () => show('piece'));
    q('back').addEventListener('click', () => show('who'));
    q('add').addEventListener('click', () => { if (people < GROUP_MAX) { people++; syncPeople(); $(`#nas-to-${people - 1}`).focus(); } });
    $$('[data-nas="remove"]').forEach(b => b.addEventListener('click', () => removePerson(+b.closest('.nas-person').dataset.i)));
    $$('.nas-people input[id^="nas-to-"]').forEach(i => i.addEventListener('input', e => ensureFonts(e.target.value)));
    $$('.nas-people input[id^="nas-tp-"], #nas-cp').forEach(i => i.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }));
    q('own').addEventListener('click', () => { closePanel(); history.replaceState(null, '', location.pathname + location.search); });
    q('see-uni').addEventListener('click', () => {
      closePanel(); history.replaceState(null, '', location.pathname + location.search);
      if (!root.classList.contains('is-gazing')) q('gaze').click();
    });
    $('.nas-claim-form').addEventListener('submit', onClaimOpen);
    $$('.nas-sh[data-share]').forEach(a => a.addEventListener('click', () => track('nas_share', { method: a.dataset.share })));
    $$('[data-nas="pdp"]').forEach(a => a.addEventListener('click', () => track('nas_pdp', { id: current?.id, sku: current?.sku })));
    const form = $('.nas-form:not(.nas-claim-form)');
    const msg = $('#nas-msg');
    msg.addEventListener('input', () => { q('chars').textContent = fill(msgEl('chars').textContent, { n: msg.value.length }); });
    $('#nas-from').addEventListener('input', e => ensureFonts(e.target.value));
    $('#nas-phone').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); });
    form.addEventListener('submit', onSubmit);

    q('share').addEventListener('click', share);
    q('download').addEventListener('click', download);
    q('copy').addEventListener('click', copyLink);
  }

  /* ---------------- the card ---------------- */
  function show(view) {
    $$('.nas-view').forEach(v => v.hidden = v.dataset.view !== view);
    panel.dataset.view = view;
    const v = $(`.nas-view[data-view="${view}"]`);
    panel.querySelector('.nas-panel-body').scrollTop = 0;
    const h = v.querySelector('.nas-h'); if (h) h.focus({ preventScroll: true });
    if (view === 'form') { q('formstatus', v).hidden = true; q('retry', v).hidden = true; q('submit', v).hidden = false; syncPeople(); }
  }

  // each view holds every piece's image and link (authored in the HTML); show the star's own
  const pieceImg = (v, sku) => $(`[data-nas="img"][data-sku="${sku}"]`, v);
  function fillPiece(view, s) {
    const p = prod[s.sku];
    const v = $(`.nas-view[data-view="${view}"]`);
    $$('[data-nas="img"]', v).forEach(i => { i.hidden = i.dataset.sku !== s.sku; i.classList.remove('is-in'); });
    $$('[data-nas="pdp"]', v).forEach(a => { a.hidden = a.dataset.sku !== s.sku; });
    const img = pieceImg(v, s.sku), t = ++fillPiece.t;
    ready(img).then(() => { void img.offsetWidth; requestAnimationFrame(() => { if (t === fillPiece.t && !img.hidden) img.classList.add('is-in'); }); }, () => {});
    q('meta', v).textContent = word('meta', { des: des(s.id), cons: cons[s.cat].name });
    return p;
  }
  fillPiece.t = 0;

  function setActive(id) { els.forEach(e => e.b.classList.toggle('is-active', e.s.id === id)); }
  // the card steps through the sky in reading order, skipping stars not yet released
  function step(d) {
    if (!current) return;
    const ids = order.filter(id => released.has(byId[id].wave)); let i = ids.indexOf(current.id);
    i = (i + d + ids.length) % ids.length; openStar(ids[i]); track('nas_step', { dir: d });
  }

  function openStar(id) {
    const s = byId[id]; if (!s) return;
    if (!locked) lastFocus = document.activeElement;
    current = s; setActive(id);
    const isTaken = taken.has(id) || mine().some(m => m.id === id);
    const p = fillPiece('piece', s);
    q('title').textContent = word('pair', { title: p.title });
    q('line').textContent = p.line;
    q('status').hidden = !isTaken;
    $('[data-view="piece"] [data-nas="name"]').hidden = isTaken;
    q('near').hidden = !isTaken;
    $$('[data-view="form"] [data-nas="meta"], [data-view="who"] [data-nas="meta"]').forEach(m => m.textContent = word('formmeta', { des: des(s.id), title: p.title }));
    aimBeam(els.find(e => e.s.id === id));
    open(); show('piece');
    track('nas_star_open', { id, sku: s.sku, taken: isTaken });
  }

  function open() {
    if (!locked) {
      root.classList.remove('is-settled');
      clearTimeout(settleT); settleT = setTimeout(() => root.classList.add('is-settled'), reduce ? 0 : 1150);
    }
    root.classList.add('is-open', 'has-opened'); panel.setAttribute('aria-hidden', 'false'); locked = true;
    setSpot(null); kick();
  }
  function closePanel() {
    clearTimeout(settleT);
    root.classList.remove('is-open', 'is-settled'); panel.setAttribute('aria-hidden', 'true'); locked = false;
    setActive(null);
    if (current) { const e = els.find(x => x.s.id === current.id); (e ? e.b : lastFocus)?.focus({ preventScroll: true }); }
    current = null;
  }

  function nearestFree(s, sameSku = true) {
    if (!s) return null;
    const my = new Set(mine().map(m => m.id));
    const free = o => o.id !== s.id && released.has(o.wave) && !taken.has(o.id) && !my.has(o.id);
    let list = DATA.stars.filter(o => free(o) && (!sameSku || o.sku === s.sku));
    if (!list.length && sameSku) list = DATA.stars.filter(free);
    const d = o => Math.hypot(o.X - s.X, o.Y - s.Y, (o.Z - s.Z) * 2);
    list.sort((a, b) => d(a) - d(b));
    return list[0] || null;
  }

  /* ---------------- claim ---------------- */
  function setErr(id, text) {
    const el = $(`#${id}`), err = $(`#${id}-err`);
    el.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (text) el.setAttribute('aria-describedby', `${id}-err`); else el.removeAttribute('aria-describedby');
    if (id === 'nas-phone') el.setAttribute('aria-describedby', text ? 'nas-phone-err nas-phone-help' : 'nas-phone-help');
    err.textContent = text || '';
    return !text;
  }

  // the form's people: one row for one person; two to ten rows for a group (the rows are in the HTML)
  let mode = 'one', people = 1;
  const rows = () => $$('.nas-person');
  function setMode(m) { mode = m; people = m === 'group' ? Math.max(2, people) : 1; syncPeople(); }
  function syncPeople() {
    const form = $('.nas-form:not(.nas-claim-form)'), g = mode === 'group';
    form.dataset.mode = mode;
    rows().forEach((r, i) => { r.hidden = i >= people; });
    q('add').hidden = !g || people >= GROUP_MAX;
    q('formh').textContent = word(g ? 'form-h-group' : 'form-h-one');
    q('formp').textContent = word(g ? 'form-p-group' : 'form-p-one');
    q('submit').textContent = g ? word('submit-group', { n: people }) : word('submit-one');
    q('submit').dataset.label = q('submit').textContent;
    if (current) q('addhelp').textContent = word('add-help', { n: people, max: GROUP_MAX, free: freeNear(current, GROUP_MAX).length + 1 });
  }
  function removePerson(i) {
    if (people <= 2) return;
    for (let k = i; k < people - 1; k++) {
      $(`#nas-to-${k}`).value = $(`#nas-to-${k + 1}`).value; $(`#nas-tp-${k}`).value = $(`#nas-tp-${k + 1}`).value;
    }
    $(`#nas-to-${people - 1}`).value = ''; $(`#nas-tp-${people - 1}`).value = '';
    people--; syncPeople();
  }
  // the free stars nearest a star, as the sky lays them out (a group's stars sit together)
  function freeNear(s, n) {
    const my = new Set(mine().map(m => m.id)), e0 = els.find(e => e.s.id === s.id);
    return els.filter(e => e !== e0 && !e.off && !taken.has(e.s.id) && !my.has(e.s.id))
      .sort((a, b) => Math.hypot(a.px - e0.px, a.py - e0.py) - Math.hypot(b.px - e0.px, b.py - e0.py))
      .slice(0, n - 1).map(e => e.s);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const list = [];
    let ok = true;
    const seen = new Set();
    for (let k = 0; k < people; k++) {
      const name = clean($(`#nas-to-${k}`).value, 24), tp = $(`#nas-tp-${k}`).value;
      ok = setErr(`nas-to-${k}`, name ? '' : word('err-to')) && ok;
      ok = setErr(`nas-tp-${k}`, !/^[6-9]\d{9}$/.test(tp) ? word('err-tp') : seen.has(tp) ? word('err-tp-dup') : '') && ok;
      seen.add(tp); list.push({ name, phone: tp });
    }
    const from = clean($('#nas-from').value, 24), msg = clean($('#nas-msg').value, 80), phone = $('#nas-phone').value;
    ok = setErr('nas-from', from ? '' : word('err-from')) && ok;
    ok = setErr('nas-phone', /^[6-9]\d{9}$/.test(phone) ? '' : word('err-phone')) && ok;
    const btn = q('submit'), status = q('formstatus'), retry = q('retry');
    status.hidden = true; retry.hidden = true;
    if (!ok) { $('.nas-form:not(.nas-claim-form) [aria-invalid="true"]').focus(); return; }

    const s = current, stars = [s, ...freeNear(s, list.length)];
    if (stars.length < list.length) { status.textContent = word('err-few'); status.hidden = false; return; }
    const callback = $('#nas-callback').checked;
    btn.disabled = true; btn.textContent = word('submitting');
    let r;
    try { r = await api.claim({ mode, starIds: stars.map(x => x.id), people: list, from, msg, phone, callback }); }
    catch { r = { error: true }; }
    btn.disabled = false; btn.textContent = btn.dataset.label;

    if (r.conflict) {
      taken.add(s.id); await refreshSky();
      const n = mode === 'one' ? nearestFree(s) : null;
      status.textContent = n ? word(n.sku === s.sku ? 'conflict-same' : 'conflict-other', { des: des(n.id) }) : word('conflict');
      status.hidden = false;
      btn.hidden = !!n;
      if (n) {
        retry.hidden = false; retry.textContent = word('retry', { des: des(n.id) });
        retry.onclick = () => { current = n; openStarKeepForm(n); };
      }
      track('nas_claim_conflict', { id: s.id, mode });
      return;
    }
    if (r.limit) { status.textContent = word('limit'); status.hidden = false; return; }
    if (r.error || !r.shareUrl) { status.textContent = word('error'); status.hidden = false; return; }

    const my = mine(); stars.forEach((x, i) => my.push({ id: x.id, to: list[i].name, claim: r.id })); store.set('nas-mine', my);
    if (mode === 'group') { store.set('nas-uni', { stars: stars.map(x => x.id), from }); setUniverse(store.get('nas-uni')); }
    taken.add(s.id); await refreshSky();
    track('nas_claim', { id: s.id, mode, n: list.length, callback });
    await finish(s, { mode, stars, people: list, to: list[0].name, from, msg, url: r.shareUrl, date: new Date() });
    if (api.uploadCard && r.token) api.uploadCard(r.id, r.token, done.blob);
  }

  // after a lost race: move to the new star without losing what they typed
  function openStarKeepForm(n) {
    current = n; setActive(n.id);
    $('[data-view="form"] [data-nas="meta"]').textContent = word('formmeta', { des: des(n.id), title: prod[n.sku].title });
    q('formstatus').hidden = true; q('retry').hidden = true; q('submit').hidden = false;
    aimBeam(els.find(e => e.s.id === n.id));
    $('[data-view="form"] .nas-h').focus({ preventScroll: true });
  }

  const names = list => list.length < 2 ? list.join('') : word('names-and', { a: list.slice(0, -1).join(', '), b: list[list.length - 1] });
  async function finish(s, d) {
    const g = d.mode === 'group', all = d.people.map(p => p.name);
    await ensureFonts(all.join('') + d.from + d.msg);
    const blob = await renderCertificate(s, d);
    done = { s, d, blob, file: new File([blob], word('file', { id: s.id }), { type: 'image/jpeg' }) };
    const img = q('cert');
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.dataset.url = URL.createObjectURL(blob); img.src = img.dataset.url;
    img.alt = word('cert-alt', { des: des(s.id), to: g ? names(all) : d.to, from: d.from });
    q('doneh').textContent = g ? word('doneh-group', { n: all.length, names: names(all) }) : word('doneh', { des: des(s.id), to: d.to });
    q('doneh').style.fontFamily = NAME_STACK;
    q('donep').textContent = word(g ? 'donep-group' : 'donep-one', { to: d.to });
    shareLinks();
    show('done');
  }

  /* ---------------- certificate (1080 x 1350) ---------------- */
  function fitFont(ctx, text, family, max, maxW, weight = '400') {
    let size = max;
    do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; } while (ctx.measureText(text).width > maxW && size > 28);
    return ctx.font;
  }
  function spaced(ctx, text, x, y, sp) { // letter-spaced, centred
    const w = [...text].reduce((a, ch) => a + ctx.measureText(ch).width + sp, -sp);
    let cx = x - w / 2;
    for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
  }
  async function renderCertificate(s, d) {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const skyImg = await ready($('.nas-cert-sky'));
    await document.fonts.ready;
    const g = d.mode === 'group', grp = g ? d.stars : [s];
    // sky crop around the star (star sits at 540,420); a group's crop is about the middle of its stars
    const cx = grp.reduce((a, o) => a + o.x, 0) / grp.length, cy = grp.reduce((a, o) => a + o.y, 0) / grp.length;
    const sh = skyImg.naturalHeight * 0.78, sw = sh * W / H;
    let sx = cx * skyImg.naturalWidth - sw / 2, sy = cy * skyImg.naturalHeight - sh * (420 / H);
    sx = Math.max(0, Math.min(skyImg.naturalWidth - sw, sx)); sy = Math.max(0, Math.min(skyImg.naturalHeight - sh, sy));
    ctx.drawImage(skyImg, sx, sy, sw, sh, 0, 0, W, H);
    const k = W / sw, P = o => [(o.x * skyImg.naturalWidth - sx) * k, (o.y * skyImg.naturalHeight - sy) * k];
    // the star's constellation, faintly (a group: the lines of its own universe, brighter)
    ctx.strokeStyle = 'rgba(240,192,112,.32)'; ctx.lineWidth = 1.4;
    if (!g) cons[s.cat].edges.forEach(([a, b]) => { const [x1, y1] = P(byId[a]), [x2, y2] = P(byId[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    else {
      ctx.strokeStyle = 'rgba(240,192,112,.6)'; ctx.lineWidth = 1.6;
      const inT = [grp[0]], rest = grp.slice(1);
      while (rest.length) {
        let best = null;
        for (const a of inT) for (const b of rest) { const dd = Math.hypot(a.x - b.x, (a.y - b.y) / 3); if (!best || dd < best.dd) best = { a, b, dd }; }
        const [x1, y1] = P(best.a), [x2, y2] = P(best.b); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        inT.push(best.b); rest.splice(rest.indexOf(best.b), 1);
      }
      grp.slice(1).forEach(o => {
        const [x, y] = P(o); let gg = ctx.createRadialGradient(x, y, 0, x, y, 60); gg.addColorStop(0, 'rgba(255,236,190,.4)'); gg.addColorStop(1, 'rgba(240,192,112,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill();
        gg = ctx.createRadialGradient(x, y, 0, x, y, 11); gg.addColorStop(0, '#fffaf0'); gg.addColorStop(.5, '#ffe2a8'); gg.addColorStop(1, 'rgba(240,192,112,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
      });
    }
    DATA.stars.filter(o => o.cat === s.cat && !grp.includes(o)).forEach(o => {
      const [x, y] = P(o); const r = 2 + o.mag * 2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4); g.addColorStop(0, 'rgba(255,244,220,.95)'); g.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
    });
    // the named star
    const [x, y] = P(s);
    let gr = ctx.createRadialGradient(x, y, 0, x, y, 120); gr.addColorStop(0, 'rgba(255,236,190,.55)'); gr.addColorStop(1, 'rgba(240,192,112,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 120, 0, 7); ctx.fill();
    gr = ctx.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(.45, '#ffe2a8'); gr.addColorStop(1, 'rgba(240,192,112,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(240,192,112,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.stroke();
    // darken for type
    gr = ctx.createLinearGradient(0, 560, 0, H); gr.addColorStop(0, 'rgba(18,14,27,0)'); gr.addColorStop(.28, 'rgba(18,14,27,.82)'); gr.addColorStop(1, 'rgba(18,14,27,.96)');
    ctx.fillStyle = gr; ctx.fillRect(0, 560, W, H - 560);
    gr = ctx.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, 'rgba(18,14,27,.92)'); gr.addColorStop(.55, 'rgba(18,14,27,.55)'); gr.addColorStop(1, 'rgba(18,14,27,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 300);
    // frame
    ctx.strokeStyle = 'rgba(240,192,112,.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(36, 36, W - 72, H - 72);
    // type
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f0c070';
    ctx.font = '400 24px "Jost",sans-serif'; spaced(ctx, word('cert-brand'), W / 2, 108, 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(246,236,220,.78)'; ctx.font = '300 30px "Jost",sans-serif';
    ctx.fillText(g ? word('cert-lead-group', { from: d.from }) : word('cert-lead'), W / 2, 800);
    if (!g) { ctx.fillStyle = '#f6ecdc'; ctx.font = fitFont(ctx, d.to, NAME_STACK, 120, W - 180); ctx.fillText(d.to, W / 2, 925); }
    else {      // every name, in as few lines as fit (two at most), as large as they can be
      const all = d.people.map(p => p.name), sep = '  ·  ';
      let lines = [all.join(sep)], size = 84;
      ctx.font = `400 ${size}px ${NAME_STACK}`;
      if (ctx.measureText(lines[0]).width > W - 180) { const h = Math.ceil(all.length / 2); lines = [all.slice(0, h).join(sep), all.slice(h).join(sep)]; }
      while (size > 34 && lines.some(l => (ctx.font = `400 ${size}px ${NAME_STACK}`, ctx.measureText(l).width > W - 180))) size -= 2;
      ctx.fillStyle = '#f6ecdc'; ctx.font = `400 ${size}px ${NAME_STACK}`;
      lines.forEach((l, i) => ctx.fillText(l, W / 2, (lines.length === 1 ? 915 : 880) + i * size * 1.12));
    }
    ctx.fillStyle = 'rgba(246,236,220,.82)'; ctx.font = `400 40px ${NAME_STACK}`;
    if (!g) ctx.fillText(word('cert-from', { from: d.from }), W / 2, 1000);
    if (d.msg) { const t = word('quote', { msg: d.msg }); ctx.fillStyle = 'rgba(246,236,220,.72)'; ctx.font = fitFont(ctx, t, '"Jost",' + NAME_STACK, 32, W - 200, '300'); ctx.fillText(t, W / 2, 1066); }
    // the piece
    try {
      const p = prod[s.sku], pi = await ready(pieceImg($('.nas-view[data-view="piece"]'), s.sku));
      const ph = 150, pw = Math.min(260, pi.naturalWidth * ph / pi.naturalHeight);
      const phh = pw * pi.naturalHeight / pi.naturalWidth;
      ctx.drawImage(pi, W / 2 - pw / 2, 1098 + (150 - phh) / 2, pw, phh);
      ctx.fillStyle = 'rgba(246,236,220,.62)'; ctx.font = '300 24px "Jost",sans-serif';
      ctx.fillText(g ? word('cert-foot-group', { n: grp.length, des: des(s.id), cons: cons[s.cat].name }) : word('cert-foot', { des: des(s.id), cons: cons[s.cat].name, title: p.title }), W / 2, 1284);
    } catch {}
    ctx.fillStyle = 'rgba(240,192,112,.8)'; ctx.font = '400 20px "Jost",sans-serif';
    spaced(ctx, d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), W / 2, 164, 4);
    return new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  }

  /* ---------------- share ---------------- */
  const shareText = () => word(done.d.mode === 'group' ? 'share-group' : 'share', { url: done.d.url });
  // each platform's link is in the HTML; its address gets the words and the link here
  function shareLinks() {
    const url = done.d.url, text = shareText(), bare = text.replace(url, '').trim(), e = encodeURIComponent;
    const base = k => { const a = $(`.nas-sh[data-share="${k}"]`); return a.dataset.base || (a.dataset.base = a.getAttribute('href')); };
    const set = (k, h) => { $(`.nas-sh[data-share="${k}"]`).href = h; };
    set('wa', `${base('wa')}?text=${e(text)}`);
    set('fb', `${base('fb')}?u=${e(url)}`);
    set('x', `${base('x')}?text=${e(bare)}&url=${e(url)}`);
    set('tg', `${base('tg')}?url=${e(url)}&text=${e(bare)}`);
    set('li', `${base('li')}?url=${e(url)}`);
    set('mail', `${base('mail')}?subject=${e(word('share-subject'))}&body=${e(text)}`);
  }
  // "More": the phone's own share sheet (Instagram, Messages, ...) with the certificate; else the link is copied
  async function share() {
    if (!done) return;
    const text = shareText();
    if (navigator.canShare && navigator.canShare({ files: [done.file] })) {
      try { await navigator.share({ files: [done.file], text }); track('nas_share', { method: 'native_file' }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    if (navigator.share) { try { await navigator.share({ text, url: done.d.url }); track('nas_share', { method: 'native' }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
    copyLink();
  }
  function download() {
    if (!done) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(done.blob); a.download = done.file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    track('nas_cert_download', { id: done.s.id });
  }
  async function copyLink() {
    if (!done) return;
    try { await navigator.clipboard.writeText(done.d.url); }
    catch { const t = document.createElement('textarea'); t.value = done.d.url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    say(word('copied')); track('nas_share', { method: 'copy' });
  }
  function say(t) { toast.textContent = t; toast.classList.add('is-on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('is-on'), 2200); }

  /* ---------------- arriving from a shared link ----------------
     mock: #star=047&c=<payload>   production: #claim=<id>  (or /s/<id> redirecting here)
     The person it was dedicated to (or anyone in the group) first gives their name and number: a pop-up on the
     section. Only when the number matches do they see the star; the open is recorded as their session. */
  let invite = null;                   // { mode, claim?, payload? }
  async function openFromHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    let starId = h.get('star'), o = null;
    if (h.get('c')) { o = unb64(h.get('c')); if (!o) return; }
    if (h.get('claim')) {
      const info = await api.claimInfo(h.get('claim')); if (!info) return;
      invite = { mode: info.mode === 'group' ? 'group' : 'one', claim: h.get('claim') };
    } else if (o && o.h) {
      if (![].concat(o.s).every(id => byId[id])) return;
      invite = { mode: o.g ? 'group' : 'one', payload: o };
    } else if (o && o.s === starId && byId[starId]) {        // an older link, from before the number check
      return later(() => received(byId[starId], { to: o.t, from: o.f, msg: o.m }));
    } else return;
    later(() => {
      const v = $('[data-view="claim"]');
      q('claimh', v).textContent = word(invite.mode === 'group' ? 'claim-group' : 'claim-one');
      q('claimsubmit', v).textContent = word(invite.mode === 'group' ? 'claim-btn-group' : 'claim-btn-one');
      q('claimsubmit', v).dataset.label = q('claimsubmit', v).textContent;
      current = null; setActive(null); aimBeam(null); open(); show('claim');
      root.classList.add('is-lit');
      track('nas_invite_view', { mode: invite.mode });
    });
  }
  // the section is entered first (the page scrolls to it and opens the sky), then the card comes
  function later(fn) {
    const enter = document.getElementById('nas-enter'), world = root.closest('#nas-world');
    if (enter && world && !world.classList.contains('is-inside')) enter.click();
    setTimeout(fn, reduce ? 50 : 700);
  }
  async function onClaimOpen(e) {
    e.preventDefault();
    const name = clean($('#nas-cn').value, 24), phone = $('#nas-cp').value;
    const ok = [setErr('nas-cn', name ? '' : word('err-cn')), setErr('nas-cp', /^[6-9]\d{9}$/.test(phone) ? '' : word('err-phone'))].every(Boolean);
    const status = q('claimstatus'), btn = q('claimsubmit');
    status.hidden = true;
    if (!ok) { $('.nas-claim-form [aria-invalid="true"]').focus(); return; }
    btn.disabled = true; btn.textContent = word('claim-checking');
    let r;
    try {
      if (invite.claim) r = await api.openClaim(invite.claim, { name, phone });
      else {                                                   // mock: match the number's hash in the link
        await new Promise(res => setTimeout(res, 500));
        const o = invite.payload, ids = [].concat(o.s), i = [].concat(o.h).indexOf(hashPhone(phone));
        r = i < 0 ? { nomatch: true } : { starId: ids[i], to: [].concat(o.t)[i], from: o.f, msg: o.m, mode: invite.mode, stars: ids };
      }
    } catch { r = { error: true }; }
    btn.disabled = false; btn.textContent = btn.dataset.label;
    if (r.nomatch) { status.textContent = word('claim-nomatch'); status.hidden = false; track('nas_invite_nomatch', { mode: invite.mode }); return; }
    if (r.error || !byId[r.starId]) { status.textContent = word('error'); status.hidden = false; return; }
    // the session: who opened it, kept with this browser (and on the server in production)
    const sessions = store.get('nas-sessions', []); sessions.push({ star: r.starId, name, at: Date.now(), mode: invite.mode }); store.set('nas-sessions', sessions);
    track('nas_invite_open', { mode: invite.mode, id: r.starId });
    const my = mine(); if (!my.some(m => m.id === r.starId)) { my.push({ id: r.starId, to: r.to || name, received: true }); store.set('nas-mine', my); }
    if (r.mode === 'group' && r.stars && r.stars.length) { store.set('nas-uni', { stars: r.stars, from: r.from }); setUniverse(store.get('nas-uni')); render(); }
    await refreshSky();
    received(byId[r.starId], { to: r.to || name, from: r.from, msg: r.msg, n: r.mode === 'group' ? (r.stars || []).length : 0 });
  }
  async function received(s, info) {
    const to = clean(info.to, 24), from = clean(info.from, 24), line = clean(info.msg, 80);
    await ensureFonts(to + from + line);
    current = s; setActive(s.id);
    const p = fillPiece('received', s);
    const v = $('[data-view="received"]');
    q('dedication', v).textContent = word('dedication', { to }); q('dedication', v).style.fontFamily = NAME_STACK;
    q('by', v).textContent = word('by', { from }); q('by', v).style.fontFamily = NAME_STACK;
    q('msg', v).textContent = line ? word('quote', { msg: line }) : ''; q('msg', v).hidden = !line;
    q('holds', v).textContent = word('holds', { title: p.title, line: p.line });
    q('uni', v).hidden = q('see-uni', v).hidden = !info.n;
    if (info.n) q('uni', v).textContent = word('uni', { n: info.n, from });
    aimBeam(els.find(e => e.s.id === s.id)); open(); show('received');
    root.classList.add('is-lit');
    track('nas_deeplink_open', { id: s.id });
  }
})();
;
