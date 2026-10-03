/* Adhyantara — Five Lights Within Her (category section).
   At rest four lights sit in a row, high, low, high, low. Hovering one (tap on touch, focus on keyboard) opens its
   pieces beside it: the other lights slide aside and shrink. Leaving brings the row back.
   All content (lights, names, pieces, pictures, links) is written in index.html: each .adh-cat__orb is followed by
   its .adh-cat__set. This script only places them (transforms), shows one set, and draws the sky. */

/* ===== Section behaviour ===== */
(function(){
  const root=document.getElementById("adh-collection");
  if(!root)return;
  const $=(s,r=root)=>r.querySelector(s);
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phoneMQ=matchMedia("(max-width:760px)");
  const stage=$(".adh-cat__stage");
  const orbs=[...stage.querySelectorAll(".adh-cat__orb")],sets=[...stage.querySelectorAll(".adh-cat__set")];
  const N=orbs.length;

  /* ---------- pieces: hover / focus lights one ---------- */
  sets.forEach(s=>s.querySelectorAll(".adh-cat__p").forEach(el=>{
    const a=el.querySelector("a");
    el.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")el.classList.add("is-lit")});
    el.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")el.classList.remove("is-lit")});
    a.addEventListener("focus",()=>el.classList.add("is-lit"));
    a.addEventListener("blur",()=>el.classList.remove("is-lit"));
  }));
  /* the pictures of closed sets carry loading="lazy" (and sit hidden): fetch a set before it opens */
  const preload=i=>sets[i].querySelectorAll('img[loading="lazy"]').forEach(im=>{im.loading="eager"});

  /* ---------- placing: where every light and the open set go, for the rest row or with light `a` open ---------- */
  let shown=-1,geo=null;
  function place(){
    const W=stage.clientWidth,H=stage.clientHeight,D=orbs[0].offsetWidth,phone=phoneMQ.matches,a=shown;
    const pos=[];                                   /* per light: x, y (centre), s (scale) */
    let set=null;                                   /* open set: x, y (top-left) */
    if(phone){
      if(a<0){                                      /* 2 x 2, the right column lower: high, low / high, low */
        const top=D/2+6,bot=H-D/2-104,drop=Math.min(64,(bot-top)*.3),row=bot-drop-top;
        for(let i=0;i<N;i++)pos.push({x:W*(i%2?.73:.27),y:top+(i>1?row:0)+(i%2?drop:0),s:1});
      }else{                                        /* one small row on top, the open light larger; its pieces below */
        const SA=.8,SS=.46,g=Math.max(10,(W-D*(SA+SS*(N-1)))/(N+1));
        let x=(W-(D*(SA+SS*(N-1))+g*(N-1)))/2;
        for(let i=0;i<N;i++){const s=i===a?SA:SS,w=D*s;pos.push({x:x+w/2,y:D*SA/2+4+(i===a?0:D*(SA-SS)/2*.4),s});x+=w+g;}
        stage.style.setProperty("--pw",Math.floor(Math.min(158,(W-14)/2))+"px");
        const sw=sets[a].offsetWidth;set={x:(W-sw)/2,y:D*SA+48};
      }
    }else{
      const hi=D/2+14,lo=H-D/2-86;
      if(a<0){for(let i=0;i<N;i++)pos.push({x:W*(i+.5)/N,y:i%2?lo:hi,s:1});}
      else{
        /* the row, left to right: smaller lights before `a`, then `a` and its set (the set on the side with more room), then the rest */
        const SS=.6,slot=Math.max(D*SS,150)+4,gap=30;
        const room=W-slot*(N-1)-D-gap*N;
        stage.style.setProperty("--pw",Math.floor(Math.max(120,Math.min(180,(room-22)/2)))+"px");
        const sw=sets[a].offsetWidth,sh=sets[a].offsetHeight,mid=Math.max(sh/2,H*.44);
        const seq=[];for(let i=0;i<N;i++){if(i===a){if(a<N/2)seq.push(i,"set");else seq.push("set",i);}else seq.push(i);}
        const width=k=>k==="set"?sw:k===a?D:slot;
        let x=(W-seq.reduce((t,k)=>t+width(k),0)-gap*N)/2;
        seq.forEach(k=>{
          const w=width(k);
          if(k==="set")set={x,y:mid-sh/2};
          else pos[k]=k===a?{x:x+w/2,y:mid,s:1}:{x:x+w/2,y:mid+(k%2?1:-1)*Math.min(78,H*.15),s:SS};
          x+=w+gap;
        });
      }
    }
    orbs.forEach((b,i)=>{const p=pos[i];
      b.style.transform=`translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) scale(${p.s})`;
      b.querySelector(".adh-cat__name").style.transform=`translateX(-50%) scale(${(p.s<1?.9/p.s:1).toFixed(3)})`;   // names stay readable on small lights
    });
    if(set){const s=sets[a];s.style.transform=`translate(${set.x.toFixed(1)}px,${set.y.toFixed(1)}px)`;}
    geo={W,H,D,phone,pos};
  }

  /* ---------- open / close ---------- */
  function open(i){
    if(i===shown)return;
    preload(i);
    const prev=shown;shown=i;
    if(prev>=0)closeSet(prev);
    orbs.forEach((b,k)=>{b.classList.toggle("is-open",k===i);b.setAttribute("aria-expanded",String(k===i))});
    stage.classList.add("has-open");
    const s=sets[i];
    s.classList.remove("from-l","from-r");s.classList.add(i<N/2?"from-l":"from-r");
    place();
    s.inert=false;s.classList.add("is-open");
    s.getBoundingClientRect();requestAnimationFrame(()=>s.classList.add("is-up"));
    sparkle(i);
  }
  function closeSet(k){const s=sets[k];s.classList.remove("is-up","is-open");s.inert=true;s.querySelectorAll(".is-lit").forEach(x=>x.classList.remove("is-lit"));}
  function close(){
    if(shown<0)return;
    closeSet(shown);shown=-1;
    orbs.forEach(b=>{b.classList.remove("is-open");b.setAttribute("aria-expanded","false")});
    stage.classList.remove("has-open");place();
  }

  /* mouse: hovering a light opens it. Only real pointer movement counts, so lights sliding under a still cursor
     do not open each other; the light stays open while the cursor is on it or its pieces, and closes shortly after leaving */
  let hoverT=0,leaveT=0,lastType="mouse";
  const onZone=t=>t.closest(".adh-cat__orb")||(shown>=0&&sets[shown].contains(t));
  stage.addEventListener("pointermove",e=>{
    if(e.pointerType!=="mouse")return;
    const b=e.target.closest(".adh-cat__orb");
    if(onZone(e.target))clearTimeout(leaveT);
    else if(shown>=0){clearTimeout(leaveT);leaveT=setTimeout(close,380);}
    if(!b){clearTimeout(hoverT);return;}
    const i=orbs.indexOf(b);if(i===shown)return;
    preload(i);clearTimeout(hoverT);hoverT=setTimeout(()=>{if(b.matches(":hover"))open(i)},shown<0?90:170);
  });
  stage.addEventListener("pointerleave",e=>{if(e.pointerType!=="mouse")return;clearTimeout(hoverT);clearTimeout(leaveT);leaveT=setTimeout(close,380)});
  stage.addEventListener("pointerdown",e=>{lastType=e.pointerType;
    if(e.pointerType!=="mouse"&&shown>=0&&!onZone(e.target)&&!e.target.closest(".adh-cat__back"))close();});   // touch: a tap on empty sky closes
  /* tap and keyboard: a light toggles; a mouse click only opens (leaving closes) */
  orbs.forEach((b,i)=>b.addEventListener("click",()=>{
    if(i===shown){if(lastType!=="mouse"||kbd)close();}else open(i);
  }));
  $(".adh-cat__back").addEventListener("click",()=>{const i=shown;close();if(i>=0)orbs[i].focus({preventScroll:true})});
  /* keyboard: focusing a light opens it, its pieces come next in the tab order; Escape or leaving the stage closes */
  let kbd=false;
  root.addEventListener("keydown",e=>{kbd=true;
    if(e.key==="Escape"&&shown>=0){const i=shown;close();orbs[i].focus({preventScroll:true});}});
  root.addEventListener("pointerdown",()=>{kbd=false});
  orbs.forEach((b,i)=>b.addEventListener("focus",()=>{if(kbd&&i!==shown)open(i)}));
  stage.addEventListener("focusout",e=>{if(kbd&&!stage.contains(e.relatedTarget))close()});

  /* ---------- sky: stardust + rising motes + the sparkle of an opening light ---------- */
  const cv=$(".adh-cat__sky canvas"),ctx=cv.getContext("2d");
  let dust=[],motes=[],sparks=[],Wc=0,Hc=0,running=false,visible=false,active=false,last=0;
  let sd=11;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  function seed(){
    const r=root.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    Wc=r.width;Hc=r.height;cv.width=Math.round(Wc*dpr);cv.height=Math.round(Hc*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    sd=11;
    dust=Array.from({length:Math.round(Wc*Hc/4000)},()=>({x:rnd()*Wc,y:rnd()*Hc,r:rnd()<.9?rnd()*.8+.25:rnd()*1.2+.8,a:rnd()*.5+.15,w:rnd()<.16,p:rnd()*6.28,c:rnd()<.55?"#f4dca4":"#f6ece0"}));
    motes=Array.from({length:Math.round(Wc/30)},()=>mote(true));
  }
  function mote(any){return{x:rnd()*Wc,y:any?rnd()*Hc:Hc+10,v:rnd()*10+5,s:rnd()*1.2+.5,p:rnd()*6.28,l:rnd()*.6+.4}}
  function sparkle(i){   /* at the light's destination, so it meets the light as it arrives */
    if(reduce||!geo)return;const ro=root.getBoundingClientRect(),st=stage.getBoundingClientRect(),p=geo.pos[i],w=geo.D*p.s;
    const x=st.left-ro.left+p.x,y=st.top-ro.top+p.y-w*.3;
    for(let k=0;k<18;k++)sparks.push({x:x+(Math.random()-.5)*w*.6,y,vx:(Math.random()-.5)*30,vy:-(Math.random()*55+20),a:1,s:Math.random()*1.3+.5});
    kick();
  }
  function frame(t){
    const dt=Math.min(.05,(t-last)/1000||0);last=t;
    ctx.clearRect(0,0,Wc,Hc);
    for(const s of dust){let a=s.a;if(s.w&&!reduce)a*=.55+.45*Math.sin(t/900+s.p);ctx.globalAlpha=a;ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();}
    ctx.globalCompositeOperation="lighter";
    for(const e of motes){
      if(!reduce){e.y-=e.v*dt;e.x+=Math.sin(t/1400+e.p)*.15;if(e.y<-10)Object.assign(e,mote(false));}
      const fade=Math.min(1,(Hc-e.y)/200)*Math.min(1,e.y/(Hc*.5));
      ctx.globalAlpha=Math.max(0,fade)*.5*e.l;ctx.fillStyle="#ffcf8a";ctx.beginPath();ctx.arc(e.x,e.y,e.s,0,6.283);ctx.fill();}
    for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=6*dt;s.a-=dt*.7;
      if(s.a<=0){sparks.splice(i,1);continue}ctx.globalAlpha=s.a;ctx.fillStyle="#ffe0a8";ctx.beginPath();ctx.arc(s.x,s.y,s.s,0,6.283);ctx.fill();}
    ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
    if(running)requestAnimationFrame(frame);
  }
  function kick(){const want=visible&&active&&!document.hidden;if(want&&!running){running=true;last=performance.now();requestAnimationFrame(frame);}if(!want)running=false;}
  new IntersectionObserver(es=>{visible=es[0].isIntersecting;kick();},{threshold:.1}).observe(root);
  document.addEventListener("visibilitychange",kick);

  /* layout: place on size changes (no glide while resizing), then let the lights glide */
  let lastW=0,lastH=0,rT=0;
  function refresh(){stage.classList.remove("is-ready");place();seed();frame(performance.now());
    stage.getBoundingClientRect();requestAnimationFrame(()=>stage.classList.add("is-ready"));}
  new ResizeObserver(()=>{const w=root.offsetWidth,h=root.offsetHeight;if(Math.abs(w-lastW)<2&&Math.abs(h-lastH)<2)return;lastW=w;lastH=h;clearTimeout(rT);rT=setTimeout(refresh,60)}).observe(root);
  if(document.fonts)document.fonts.ready.then(refresh);
  refresh();

  /* for the page around this section (page.js): setActive runs the sky while the section is on screen,
     and warms the pictures of every set so the first hover finds them loaded */
  window.__adhCat={root,stage,orbs,sets,open,close,refresh,
    get shown(){return shown}, get geo(){return geo},
    setActive(on){active=on;kick();if(on)setTimeout(()=>sets.forEach((s,i)=>preload(i)),1200)},
    freeze(){}, welcome(i){if(i>=0&&i<N)sparkle(i)}};
})();
