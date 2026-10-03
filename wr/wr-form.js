/* wr-form.js — v4: in From Whisper to Radiance each piece is made of gold stardust, as in Where Light Becomes Form
   (cosmos.js, its particle shader carried over): streaks of gold light stream in from the sky around the piece, curve in
   as a current, gather into the piece's own shape and colours (sampled from its <img>), and hand over to the real piece.
   Plays once, the first time the section arrives: dust lying over the whole screen is drawn in to the first piece. One WebGL canvas (canvas.wr-form,
   in the page) over the section's sky and under its words; drawn only while a piece is forming. */
(() => {
'use strict';
const root = document.getElementById('whisper-radiance'), world = document.getElementById('wr-world');
const cv = root && root.querySelector('.wr-form');
if (!cv) return;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const figs = [...root.querySelectorAll('.wr-piece')], stage = root.querySelector('.wr-stage');
const setForm = (f, v) => f.style.setProperty('--form', v.toFixed(3));
const gl = !reduce && cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
if (!gl) { figs.forEach(f => setForm(f, 1)); return; }
figs.forEach(f => setForm(f, 0));

const VS = `
attribute vec2 aTarget; attribute vec3 aColor; attribute vec3 aSeed; attribute float aEnd;
varying vec3 vCol; varying float vA;
uniform float uProg,uTime,uHandoff,uPt; uniform vec2 uCenter,uHalf;
vec2 posAt(float u, vec3 sd){
  // the dust starts scattered over the whole screen, twinkling where it lies, and is drawn in to the piece
  vec2 start=vec2(sd.x*2.3-1.15, fract(sd.z*7.13+sd.x*3.1)*2.3-1.15);
  start+=0.02*vec2(sin(uTime*0.5+sd.x*20.0),cos(uTime*0.4+sd.z*17.0));
  vec2 tgt=uCenter+aTarget*uHalf;
  vec2 pos=mix(start,tgt,u);
  vec2 d=tgt-start; pos+=u*(1.0-u)*0.9*vec2(-d.y,d.x)*(fract(sd.x*13.7)-0.5);   // a gentle curve in
  return pos;
}
void main(){
  float d=aSeed.y;
  float u=clamp((uProg-d)/max(1.0-d,0.001),0.0,1.0); u=u*u*(3.0-2.0*u);
  float tail=0.035*(1.0-u)*(0.18+aSeed.z*1.30)*(0.55+0.90*fract(aSeed.x*7.31));   // a head at u, a tail just behind it
  float uu=clamp(u-tail*(1.0-aEnd),0.0,1.0);
  gl_Position=vec4(posAt(uu,aSeed),0.0,1.0);
  gl_PointSize=uPt;                                        // (the points pass: the dust that has landed, which a line of no length would not draw)
  vCol=mix(vec3(1.0,0.80,0.50),aColor,smoothstep(0.42,0.97,u));                // gold light in flight, the piece's colour on landing
  vA=mix(0.35,1.0,u)*(1.0-uHandoff)*mix(0.18,1.0,aEnd);
}`;
const FS = `precision mediump float; varying vec3 vCol; varying float vA; void main(){ gl_FragColor=vec4(vCol*vA,vA); }`;
function sh(t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
['aTarget', 'aColor', 'aSeed', 'aEnd'].forEach((n, i) => gl.bindAttribLocation(prog, i, n)); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { figs.forEach(f => setForm(f, 1)); return; }
const U = {}; ['uProg', 'uTime', 'uHandoff', 'uPt', 'uCenter', 'uHalf'].forEach(n => U[n] = gl.getUniformLocation(prog, n));

const N = innerWidth <= 760 ? 7000 : 16000;
const seedBuf = gl.createBuffer(), endBuf = gl.createBuffer();
{ const s = new Float32Array(N * 6), e = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const a = Math.random(), b = Math.pow(Math.random(), .75) * .42, c = Math.random();
    s.set([a, b, c, a, b, c], i * 6); e[i * 2] = 0; e[i * 2 + 1] = 1; }
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf); gl.bufferData(gl.ARRAY_BUFFER, s, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, endBuf); gl.bufferData(gl.ARRAY_BUFFER, e, gl.STATIC_DRAW); }

// each piece's targets: points of its own image (alpha > 58), in its box from -1..1 (y up), with their colours
const SETS = [];
function setFor(i) {
  if (SETS[i]) return Promise.resolve(SETS[i]);
  const im = figs[i].querySelector('img'); im.loading = 'eager';
  return im.decode().catch(() => {}).then(() => {
    if (!im.naturalWidth) return null;
    const CW = Math.min(300, im.naturalWidth), CH = Math.round(CW * im.naturalHeight / im.naturalWidth);
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, CW, CH);
    const d = x.getImageData(0, 0, CW, CH).data, pts = [];
    for (let y = 0; y < CH; y++) for (let xx = 0; xx < CW; xx++) { const o = (y * CW + xx) * 4; if (d[o + 3] > 58) pts.push(xx, y, d[o], d[o + 1], d[o + 2]); }
    if (!pts.length) pts.push(CW >> 1, CH >> 1, 200, 170, 120);
    const tgt = new Float32Array(N * 4), col = new Float32Array(N * 6), np = pts.length / 5;
    for (let k = 0; k < N; k++) { const p = ((Math.random() * np) | 0) * 5, tx = pts[p] / CW * 2 - 1, ty = 1 - pts[p + 1] / CH * 2;
      for (let e = 0; e < 2; e++) { const j = k * 2 + e; tgt[j * 2] = tx; tgt[j * 2 + 1] = ty; col.set([pts[p + 2] / 255, pts[p + 3] / 255, pts[p + 4] / 255], j * 3); } }
    const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.bufferData(gl.ARRAY_BUFFER, tgt, gl.STATIC_DRAW);
    const cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cb); gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
    return (SETS[i] = { tb, cb });
  });
}

const FORM_MS = 2600, clamp = x => Math.min(1, Math.max(0, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
let cur = 0, t0 = -1, raf = 0, token = 0, S = null;
function size() { const d = Math.min(devicePixelRatio || 1, 1.5), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); } }
function frame(now) {
  raf = 0; if (t0 < 0 || !S) return;
  const p = clamp((now - t0) / FORM_MS), fig = figs[cur];
  setForm(fig, smooth((p - .82) / .18));   // the dust holds the piece's shape a moment first
  size(); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  // where the piece will rest (its box without the slide it arrives with), in the canvas's -1..1
  const cr = cv.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const cx = sr.left + sr.width / 2 - cr.left, cy = sr.top + sr.height / 2 - cr.top;
  gl.useProgram(prog); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  [[S.tb, 2], [S.cb, 3], [seedBuf, 3], [endBuf, 1]].forEach(([b, n], i) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 0, 0); });
  gl.uniform1f(U.uProg, Math.min(1, Math.max(0, p * 1.45 - .12)));   // a beat of dust lying still, then in; landed by ~.77
  gl.uniform1f(U.uTime, now * .001); gl.uniform1f(U.uHandoff, smooth((p - .88) / .12));
  gl.uniform2f(U.uCenter, cx / cr.width * 2 - 1, 1 - cy / cr.height * 2);
  gl.uniform2f(U.uHalf, fig.offsetWidth / cr.width, fig.offsetHeight / cr.height);
  gl.drawArrays(gl.LINES, 0, N * 2);
  gl.uniform1f(U.uPt, Math.min(devicePixelRatio || 1, 1.5) * 1.4); gl.drawArrays(gl.POINTS, 0, N * 2);
  if (p < 1) raf = requestAnimationFrame(frame); else { t0 = -1; playing = false; gl.clear(gl.COLOR_BUFFER_BIT); }
}
function form(i) {
  cur = i; const my = ++token; playing = true;
  figs.forEach((f, k) => setForm(f, k === i ? 0 : 1));   // only the one forming waits for its dust
  setFor(i).then(s => { if (my !== token) return; if (!s) { show(); return; }
    S = s; t0 = performance.now(); if (!raf) raf = requestAnimationFrame(frame); });
}
// once only: the first time the section arrives. After that (and on any change of piece) the pieces are simply themselves
let playing = false, done = false;
const show = () => { token++; t0 = -1; playing = false; figs.forEach(f => setForm(f, 1)); gl.clear(gl.COLOR_BUFFER_BIT); };
root.addEventListener('wr:piece', e => { cur = e.detail; if (playing || !done) { done = true; show(); } });
// it begins as the section comes in (a third of it on screen); under the story morph it waits for the morph to land
let seen = false;
const watch = () => { if (done || !seen || document.body.classList.contains('morphing')) return; done = true; form(cur); };
new IntersectionObserver(es => es.forEach(e => {
  if (e.intersectionRatio >= .33) seen = true;
  if (e.isIntersecting && !done) setFor(cur);   // its dust ready before it is needed
  watch(); }), { threshold: [0, .33] }).observe(world);
new MutationObserver(watch).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
