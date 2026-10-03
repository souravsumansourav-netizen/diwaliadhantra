/* page.js — Adhyantara v4: one scrolling page. The sections are stacked and scroll natively, both ways.
   Each section's sky drifts a little slower than the page (a slight parallax), and between the sections lie
   seams of gas, aurora and stardust that thicken as the boundary crosses the middle of the screen and part as
   you scroll on, so every section comes out of the cloud. No change-of-scene engine, no locked scrolling. */
(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion:reduce)'), phone=()=>innerWidth<=760;
let secs=$$('.pg');   // page order (Enter the World can move the film up, see below)
const seams=$$('.seam');
const G=()=>window.__glowWorld, Z=()=>window.__cosmos, A=()=>window.__adhCat, N=()=>window.__nas;
const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)};
const goTo=(id,behavior='smooth')=>{ const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:reduced.matches?'auto':behavior,block:'start'}) };

/* ---------- the scroll: seams, the current section (v4: no parallax; the page scrolls plainly) ---------- */
let ticking=false, cur=-1;
function tick(){
  ticking=false; const vh=innerHeight, y=scrollY;
  for(const sm of seams){ const r=sm.getBoundingClientRect(), d=r.top+r.height/2-vh/2;
    if(Math.abs(d)>vh*1.1){ if(sm.dataset.on){ sm.style.setProperty('--s','0'); sm.dataset.on='' } continue }
    sm.dataset.on='1'; sm.style.setProperty('--s',smooth(1-Math.abs(d)/(vh*.8)).toFixed(3)); sm.style.setProperty('--o',(d*.6).toFixed(1)+'px') }
  document.body.classList.toggle('in-world',y>vh*.5);
  if(y>vh*.2){ const skip=$('#skip'); if(skip&&!skip.hidden) skip.click() }
  { const ap=$('#appt-world'); if(ap){ const r=ap.getBoundingClientRect(); if(r.top<=vh*.12&&r.bottom>vh*.5) ap.classList.add('arrived'); else if(r.top>vh) ap.classList.remove('arrived') } }
  let best=0; secs.forEach((s,i)=>{ const r=s.getBoundingClientRect(); if(r.top<=vh*.5) best=i });
  if(best!==cur){ cur=best; dots.forEach((d,i)=>{ d.classList.toggle('on',i===cur); if(i===cur) d.setAttribute('aria-current','true'); else d.removeAttribute('aria-current') }) }
}
const kick=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(tick) } };
// the world's layer 2: each piece drifts by its depth (data-k: >1 nearer, faster than the page; <1 further, slower), and the
// warm Diwali light rises in the fixed sky as the page nears its end; the hero hides the fixed layers above the film
// layer 2 (the world) scrolls with the page like the sections; its life is movement in place (CSS): each planet breathes,
// turns, shines, and twinkles sparkle round it. (Different scroll speeds read as a glitch: not used.)
const w2=$$('.w2'), warm=$('.w1-warm'), wl=$('.w2-layer'), w1=$('.w1');

function world(){ const vh=innerHeight, y=scrollY;
  const max=document.documentElement.scrollHeight-vh, p=max>0?y/max:0;
  if(warm) warm.style.opacity=Math.max(0,Math.min(1,(p-.45)/.55)).toFixed(3);
  const show=y>vh*.35; if(w1) w1.classList.toggle('on',show) }
addEventListener('scroll',()=>requestAnimationFrame(world),{passive:true}); addEventListener('resize',world); world();
addEventListener('scroll',kick,{passive:true}); addEventListener('resize',kick);

/* ---------- the section dots: links in the page (nav.pg-dots), taken as a smooth scroll ---------- */
let dots=$$('.pg-dots a');
dots.forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); goTo(a.getAttribute('href').slice(1)) }));

/* ---------- what wakes as each section comes into the middle of the screen ---------- */
const video=$('#fantasy-film'), status=$('#film-status'), play=$('#film-play'), sound=$('#film-sound');
function hook(id,on){
  if(id==='cat-world'){ const a=A(); if(a) a.setActive(on) }
  if(id==='film-world'&&video){ if(on) video.play().catch(()=>{}); else video.pause() }   // the film's src is in the page, preload none
}
const io=new IntersectionObserver(es=>es.forEach(e=>{ const on=e.isIntersecting; e.target.classList.toggle('on',on); hook(e.target.id,on) }),{rootMargin:'-22% 0px -22% 0px',threshold:0});
secs.forEach(s=>io.observe(s));
if(play){ play.onclick=()=>{ if(video.paused) video.play().catch(()=>{}); else video.pause() };
  // both labels of each control are in the page; a class on the button says which one shows
  const paused=()=>play.classList.toggle('is-paused',video.paused); video.addEventListener('play',paused); video.addEventListener('pause',paused); paused();
  sound.onclick=()=>{ video.muted=!video.muted; sound.classList.toggle('is-on',!video.muted); sound.setAttribute('aria-pressed',String(!video.muted)) } }

/* ---------- Name a Star: an invitation, then the sky entered on purpose and left by its X ---------- */
{ const el=$('#nas-world'), nas=$('#name-a-star'), enterBtn=$('#nas-enter'), exitBtn=$('#nas-exit');
  function enter(){ el.classList.add('is-inside'); exitBtn.hidden=false; goTo('nas-world','auto'); const n=N(); if(n&&n.ready()) setTimeout(()=>n.arrival(),60);
    nas.dispatchEvent(new CustomEvent('nas:enter')); exitBtn.focus({preventScroll:true}) }   // nas:enter wakes the jewels and the spotlight
  function leave(scroll=true){ if(!el.classList.contains('is-inside')) return; const close=nas.querySelector('[data-nas="close"]'); if(nas.classList.contains('is-open')&&close) close.click();
    el.classList.remove('is-inside'); exitBtn.hidden=true; if(scroll){ goTo('nas-world','auto'); enterBtn.focus({preventScroll:true}) } const n=N(); if(n&&n.ready()) n.arrival() }
  enterBtn.addEventListener('click',enter); exitBtn.addEventListener('click',()=>leave(true));
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&el.classList.contains('is-inside')&&!nas.classList.contains('is-open')) leave() });
  // leaving the section by scrolling well away also leaves the sky
  addEventListener('scroll',()=>{ if(!el.classList.contains('is-inside')) return; const r=el.getBoundingClientRect(); if(r.bottom<-innerHeight*.5||r.top>innerHeight*1.5) leave(false) },{passive:true});
}

/* ---------- the landing: pointing moves its layers by their depth (near most, far least); a phone has no pointer, so it rests ---------- */
{ const st=$('#book-appointment'); if(st&&matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduced.matches){ let raf=0, x=0, y=0;
    st.addEventListener('pointermove',e=>{ const r=st.getBoundingClientRect(); x=(e.clientX-r.left)/r.width*2-1; y=(e.clientY-r.top)/r.height*2-1;
      if(!raf) raf=requestAnimationFrame(()=>{ raf=0; st.style.setProperty('--px',x.toFixed(3)); st.style.setProperty('--py',y.toFixed(3)) }) });
    st.addEventListener('pointerleave',()=>{ st.style.setProperty('--px','0'); st.style.setProperty('--py','0') }); } }

/* ---------- the appointment card: its solid ground with the jewellery's arch cut out (a mask the arch's own size) ---------- */
{ const card=$('.appt-card'), arch=$('.appt-piece');
  function cut(){ if(!card||!arch) return; const c=card.getBoundingClientRect(), a=arch.getBoundingClientRect(); if(!c.width||!a.width) return;
    const W=c.width, H=c.height, x=a.left-c.left, y=a.top-c.top, w=a.width, h=a.height, cs=getComputedStyle(arch);
    const r=Math.min(parseFloat(cs.borderTopLeftRadius)||0,w/2,h/2), b=Math.min(parseFloat(cs.borderBottomLeftRadius)||0,w/2,h/2);   // its own corners: an arch on a computer, a rounded box on a phone
    const archPath=`M${x},${y+h-b} L${x},${y+r} A${r},${r} 0 0 1 ${x+r},${y} L${x+w-r},${y} A${r},${r} 0 0 1 ${x+w},${y+r} L${x+w},${y+h-b} A${b},${b} 0 0 1 ${x+w-b},${y+h} L${x+b},${y+h} A${b},${b} 0 0 1 ${x},${y+h-b} Z`;
    const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'><path fill-rule='evenodd' fill='black' d='M0,0 H${W} V${H} H0 Z ${archPath}'/></svg>`;
    card.style.setProperty('--cut',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`) }
  if(card){ new ResizeObserver(cut).observe(card); addEventListener('resize',cut); cut() } }

/* ---------- the calls to action that cross the page ---------- */
const on=(sel,fn)=>{ const e=$(sel); if(e) e.addEventListener('click',ev=>{ ev.preventDefault(); fn() }) };   // links in the page, taken as a smooth scroll
on('#explore',()=>goTo('wr-world'));   // the hero's Explore Collection: straight to the pieces
on('#enter',enterWorld); on('#cz-r3',()=>goTo('appt-world'));

/* ---------- the film -> From Whisper to Radiance, one change of scene, with the story line told over it (v4: the hero
   goes to the film with no change of scene; this plays when you leave the film going down).
   diwaliv2's softmorph (softmorph.js + comet.js), slowed a little so the words can be read: the film pulls back and closes into a
   cloud-edged, gold-rimmed disc; Whisper to Radiance's sky is already there around it, magnified, and settles as the
   camera arrives; stars stream, dust drifts, the comet lands on the disc and it flares. Over it, no ground of their own,
   one line (in the HTML) rises in the way a film's titles do, its second half a beat after the first, and stays
   until the scene settles. It ends on Whisper to Radiance, where the page rests and scrolls on (stack).
   Played when you leave the film going down (wheel, swipe, keys); while it plays the page holds still and
   scrolling does nothing, so the titles always play through. The universe around us is not a section of its own any more. ---------- */
const SM=window.softmorph, sceneEl=$('#film-world');   // (the scene that closes: the film)
const plate=document.createElement('canvas'); plate.setAttribute('aria-hidden','true');
plate.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:36;pointer-events:none;opacity:0';
($('#experience')||document.body).appendChild(plate); const pg=plate.getContext('2d');   // in the same stacking context as the hero and the titles
let morphing=false, morphRaf=0, morphT0=0;
function coverImg(g,im,W,H){ if(!im||!im.complete||!im.naturalWidth) return; const s=Math.max(W/im.naturalWidth,H/im.naturalHeight), iw=im.naturalWidth*s, ih=im.naturalHeight*s; g.drawImage(im,(W-iw)/2,(H-ih)/2,iw,ih) }
function drawSkyPlate(f,C,ax,ay,D){
  const d=Math.min(devicePixelRatio||1,phone()?1.25:1.75), W=innerWidth, H=innerHeight;
  if(plate.width!==Math.round(W*d)||plate.height!==Math.round(H*d)){ plate.width=Math.round(W*d); plate.height=Math.round(H*d) }
  pg.setTransform(d,0,0,d,0,0); pg.globalAlpha=1; pg.globalCompositeOperation='source-over'; pg.fillStyle='#120e1b'; pg.fillRect(0,0,W,H);
  pg.save(); pg.translate(ax,ay); pg.scale(C,C); pg.translate(-D.x,-D.y); coverImg(pg,$('#wr-world .wr-plate.a'),W,H); pg.restore();
  const k=.6*(1-SM.Xt(.1,.5,f)); if(k>.01){ pg.fillStyle=`rgba(10,7,20,${k.toFixed(3)})`; pg.fillRect(0,0,W,H) }   // far in, only a deep colour
  const born=SM.Xt(.5,.72,f); if(born>0){ pg.save(); pg.globalCompositeOperation='lighter'; pg.globalAlpha=born*.9; const r=120*(1+.6*(1-born)), gr=pg.createRadialGradient(ax,ay,0,ax,ay,r);
    gr.addColorStop(0,'rgba(255,226,170,.55)'); gr.addColorStop(.22,'rgba(255,200,130,.2)'); gr.addColorStop(1,'rgba(255,190,120,0)'); pg.fillStyle=gr; pg.beginPath(); pg.arc(ax,ay,r,0,6.2832); pg.fill(); pg.restore() }
}
function filmMorph(){
  if(morphing) return;
  if(!SM||reduced.matches){ goTo('wr-world'); return }
  morphing=true; const skip=$('#skip'); if(skip&&!skip.hidden) skip.click();
  const W=innerWidth, H=innerHeight, D=phone()?{x:W*.5,y:H*.2}:{x:W*.8,y:H*.3}, sceneCopy=$('#film-world .film-caption');   // the disc closes, and the comet lands, off to the side: the words keep the plain sky
  const cards=[[$('.story-line')]];
  // where each card comes on, through the change (f); the last one leaves as the scene settles
  const AT=[.2], OFF=.975;   // (after the film's own words have gone)
  SM.build(W/H);
  // the film held full-screen while it closes; Whisper to Radiance's sky on the plate under it; the words over both
  sceneEl.style.cssText+=';position:fixed;left:0;top:0;width:100%;height:100svh;z-index:37;transform-origin:50% 50%;mask-size:100% 100%;-webkit-mask-size:100% 100%;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat';
  document.body.classList.add('morphing','titles');           // (the seams, lifted to the top by the held scene, stay out of it)
  cards.flat().forEach(e=>e.classList.remove('on'));
  morphT0=performance.now(); let last=morphT0, f=0, shown=-1; const dur=7000;
  const step=now=>{
    // scrolling, swiping or keys while it plays are held: the titles always play through
    f=Math.min(1,f+(now-last)/dur); last=now;
    const cam=SM.camera(f,{x:W/2,y:H/2},D,.12), {s,C,ax,ay}=cam, live=f<1;
    const tf=`translate3d(${(ax-W/2).toFixed(2)}px,${(ay-H/2).toFixed(2)}px,0) scale(${s.toFixed(5)})`;
    sceneEl.style.transform=tf; sceneEl.style.maskImage=sceneEl.style.webkitMaskImage=SM.maskAt(f); sceneEl.style.opacity=(1-SM.Xt(.7,.98,f)).toFixed(3);
    SM.rim(f,tf); SM.wordsOut(sceneCopy,f,{vw:W*s,vh:H*s,ax,ay});
    drawSkyPlate(f,C,ax,ay,D); plate.style.opacity='1';
    SM.overlay({f,ax,ay,vw:W*s,vh:H*s,zoom:cam.zoom}); if(window.cometFX) window.cometFX.draw(f,ax,ay,1,Math.min(380,Math.max(110,W*s*1.2)));
    let k=-1; AT.forEach((a,i)=>{ if(f>=a) k=i }); if(f>=OFF) k=-1;
    if(k!==shown){ if(shown>=0) cards[shown].forEach(e=>e.classList.remove('on')); if(k>=0) cards[k].forEach(e=>e.classList.add('on')); shown=k }
    if(live){ morphRaf=requestAnimationFrame(step); return }
    // done: the film goes back to its place, the page moves to Whisper to Radiance, and the plate lifts off it
    SM.overlay({f:1}); SM.rim(1,''); if(window.cometFX) window.cometFX.clear();
    ['position','left','top','width','height','zIndex','transform','transformOrigin','maskImage','webkitMaskImage','maskSize','webkitMaskSize','maskRepeat','webkitMaskRepeat','opacity'].forEach(k=>sceneEl.style[k]='');
    SM.wordsOut(sceneCopy,0,{});
    scrollTo(0,$('#wr-world').getBoundingClientRect().top+scrollY);
    document.body.classList.remove('morphing'); dispatchEvent(new Event('resize')); kick();
    plate.style.transition='opacity .7s ease'; plate.style.opacity='0';
    setTimeout(()=>{ plate.style.transition=''; document.body.classList.remove('titles'); cards.flat().forEach(e=>e.classList.remove('on')); morphing=false },750);
  };
  morphRaf=requestAnimationFrame(step);
}
// leaving the film, going down, plays it; while it plays the page holds still. Coming down from the hero, the film first
// settles in place (the scroll that brought it is swallowed for a moment), so the next scroll down is a deliberate one.
let settled=0;
const filmTop=()=>sceneEl?sceneEl.getBoundingClientRect().top:NaN;
const atFilm=()=>{ const t=filmTop(); return t>-innerHeight*.5&&t<innerHeight*.12 };
const TRANSITIONS=false;   // v4, for now: no changes of scene while the backgrounds are settled (the page scrolls plainly)
function down(e){   // a scroll down: true if it was taken here
  if(!TRANSITIONS) return false;
  if(morphing){ e.preventDefault(); return true }
  if(!atFilm()) return false;
  const now=performance.now();
  if(!settled){ e.preventDefault(); settled=now; scrollTo({top:scrollY+filmTop(),behavior:'smooth'}); return true }
  e.preventDefault(); if(now-settled>900) filmMorph(); return true;
}
addEventListener('scroll',()=>{ const t=filmTop(); if(t>innerHeight*.4||t<-innerHeight*.9) settled=0 },{passive:true});
addEventListener('wheel',e=>{ if(morphing){ e.preventDefault(); return } if(e.deltaY>4) down(e) },{passive:false});
let ty=null; addEventListener('touchstart',e=>{ ty=e.touches[0].clientY },{passive:true});
addEventListener('touchmove',e=>{ if(morphing){ e.preventDefault(); return } if(ty!==null&&ty-e.touches[0].clientY>24&&down(e)) ty=null },{passive:false});
addEventListener('keydown',e=>{ if(morphing&&['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key)){ e.preventDefault(); return }
  if(['ArrowDown','PageDown',' '].includes(e.key)&&!e.target.closest('input,textarea,button,a')) down(e) });

/* ---------- Enter the World: to the film, playing (it follows the hero now) ---------- */
function enterWorld(){
  settled=performance.now(); goTo('film-world','auto'); const skip=$('#skip'); if(skip&&!skip.hidden) skip.click(); if(video) video.play().catch(()=>{}); kick();
}

/* ---------- every heading and its line on one line (the hero keeps its own): if one is wider than its column at this
   size, it is set a little smaller until it fits. Measured with its own font, so text shown later (a piece's name, a
   look's line) fits too. Style only; the words stay in the HTML. ---------- */
const ONE_LINE=['.story-h','.story-sub','.wr-h','.wr-p','.adh-cat__title','.adh-cat__sub','.cz-copy .cz-h','.cz-copy .cz-sub',
  '.gh','.gsub','.nas-intro-h','.stl-name','.stl-line','.film-caption h2','.film-sub','.appt-sub'];
const meas=document.createElement('canvas').getContext('2d');
function textWidth(el){ const cs=getComputedStyle(el); let t=el.textContent.replace(/\s+/g,' ').trim(); if(cs.textTransform==='uppercase') t=t.toUpperCase();
  meas.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const ls=parseFloat(cs.letterSpacing)||0; return meas.measureText(t).width+ls*t.length }
function fitLines(){
  $$(ONE_LINE.join(',')).forEach(el=>{
    el.style.fontSize=''; const box=el.parentElement; if(!box) return;
    const cs=getComputedStyle(box), room=Math.min(box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),innerWidth-40); if(room<=0) return;   // (a column sized by its own words is no limit)
    const w=textWidth(el), f=parseFloat(getComputedStyle(el).fontSize);
    if(w>room*.97) el.style.fontSize=(f*room*.97/w).toFixed(2)+'px';
  });
}
addEventListener('resize',()=>requestAnimationFrame(fitLines)); addEventListener('load',fitLines);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitLines); fitLines();

/* ---------- links straight to a section ---------- */
addEventListener('load',()=>{ const q=new URLSearchParams(location.search); let t=q.get('world'); if(t&&!document.getElementById(t)) t=t+'-world'; if(t==='hero-world') t='hero-plane'; if(t==='story-world') t='wr-world';
  if(t&&document.getElementById(t)) setTimeout(()=>{ goTo(t,'auto'); const skip=$('#skip'); if(skip&&!skip.hidden) skip.click() },80); kick() });
kick();
})();
