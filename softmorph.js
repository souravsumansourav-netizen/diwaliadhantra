/* Softmorph transition kit — the POC v3 section change, rebuilt in 2D so it can join any two scenes.

   What softmorph does between two sections (all timings are its own, f = 0..1 through the change):
   1. Camera pulls back. The old scene shrinks about its centre, and that centre drifts to the place it
      will occupy in the new sky. The new scene is already there around it, magnified and soft, and
      settles to its true size as the camera arrives.                         (Zg: L lerp, qs ease; Fh drift)
   2. The old scene's edge dissolves into a soft, cloud-edged circle that closes in.
      front = mix(1.25, -0.25, Xt(.04,.9,f)); inside = 1 - smoothstep(front-.55, front+.05, dist + n)
      n = fbm(q*3)*.22 + noise(q*11)*.06, clip strength Xt(0,.12,f), opacity 1 - Xt(.7,.98,f).       (Oh)
   3. A faint gold rim runs along the dissolving edge.  rim = exp(-((dist+n-front+.25)/.08)^2) * sin(pi*Xt(.05,.9,f))*.9
   4. A ring of gold (and a few lavender) sparkles orbits the closing disc, radius tracking the front.  (Gg)
   5. The star field brightens and streams inward with the pull-back (six octaves, magnitude-sized). (Fg)
   6. Drifting stardust thickens for the length of the change.                                       (Hg)
   7. A lighted comet flies in from a top corner, .26 -> .56, and lands on the disc.                  (zg, comet.js)
   8. The disc flares into a star, .50 -> .64, fading .80 -> .98.                                     (Bg, comet.js)
   9. The old words blur, fade and lean toward the disc (.04 -> .42); the new words rise in (.74 -> 1).
   Everything here is canvas 2D and CSS masks; nothing is WebGL. */
(() => {
'use strict';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), mix=(a,b,t)=>a+(b-a)*t;
const Xt=(a,b,x)=>{const n=clamp((x-a)/(b-a));return n*n*(3-2*n)}, qs=i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2, Fh=i=>i*i*(3-2*i);
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
function rng(seed){let t=seed>>>0;return()=>(t=t*1664525+1013904223>>>0)/4294967296}

/* ---- softmorph's simplex noise + fbm, ported line for line ---- */
function hash2(x,y){const a=x*127.1+y*311.7,b=x*269.5+y*183.3;const fa=Math.sin(a)*43758.5453123,fb=Math.sin(b)*43758.5453123;return[-1+2*(fa-Math.floor(fa)),-1+2*(fb-Math.floor(fb))]}
function noise(px,py){const K1=.366025404,K2=.211324865;const s=(px+py)*K1,ix=Math.floor(px+s),iy=Math.floor(py+s);const t=(ix+iy)*K2,ax=px-ix+t,ay=py-iy+t;
  const m=ay<=ax?1:0,ox=m,oy=1-m;const bx=ax-ox+K2,by=ay-oy+K2,cx=ax-1+2*K2,cy=ay-1+2*K2;
  const h=[Math.max(.5-(ax*ax+ay*ay),0),Math.max(.5-(bx*bx+by*by),0),Math.max(.5-(cx*cx+cy*cy),0)];
  const g0=hash2(ix,iy),g1=hash2(ix+ox,iy+oy),g2=hash2(ix+1,iy+1);
  return 70*(h[0]**4*(ax*g0[0]+ay*g0[1])+h[1]**4*(bx*g1[0]+by*g1[1])+h[2]**4*(cx*g2[0]+cy*g2[1]))}
function fbm(x,y){let f=0,a=.5;for(let i=0;i<4;i++){f+=a*noise(x,y);const nx=1.6*x-1.2*y,ny=1.2*x+1.6*y;x=nx;y=ny;a*=.5}return f}
const edgeNoise=(qx,qy)=>fbm(qx*3,qy*3)*.22+noise(qx*11,qy*11)*.06;

/* ---- the closing disc, as mask frames for a scene of a given aspect ---- */
const FRAMES=72; let maskKey='', masks=[], rims=[], rimMasks=[];
// a tiny PNG writer (grey + alpha, stored deflate): the masks are built without any canvas readback
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc(buf,from,to){let c=0xffffffff;for(let i=from;i<to;i++)c=CRC[(c^buf[i])&255]^(c>>>8);return (c^0xffffffff)>>>0}
function png(w,h,alpha){ // alpha: Uint8Array(w*h)
  const row=1+w*2, raw=new Uint8Array(row*h); for(let y=0;y<h;y++){const o=y*row;raw[o]=0;for(let x=0;x<w;x++){raw[o+1+x*2]=255;raw[o+2+x*2]=alpha[y*w+x]}}
  const blocks=Math.ceil(raw.length/65535), z=new Uint8Array(2+raw.length+blocks*5+4); let p=0; z[p++]=0x78; z[p++]=0x01;
  for(let b=0;b<blocks;b++){const st=b*65535,len=Math.min(65535,raw.length-st);z[p++]=b===blocks-1?1:0;z[p++]=len&255;z[p++]=len>>8;z[p++]=~len&255;z[p++]=(~len>>8)&255;z.set(raw.subarray(st,st+len),p);p+=len}
  let a=1,bb=0;for(let i=0;i<raw.length;i++){a=(a+raw[i])%65521;bb=(bb+a)%65521} z[p++]=bb>>8;z[p++]=bb&255;z[p++]=a>>8;z[p++]=a&255;
  const chunks=[['IHDR',new Uint8Array([w>>>24,w>>>16&255,w>>>8&255,w&255,h>>>24,h>>>16&255,h>>>8&255,h&255,8,4,0,0,0])],['IDAT',z],['IEND',new Uint8Array(0)]];
  let size=8;chunks.forEach(([,d])=>size+=12+d.length);const out=new Uint8Array(size);out.set([137,80,78,71,13,10,26,10]);let q=8;
  for(const [type,d] of chunks){out[q++]=d.length>>>24;out[q++]=d.length>>>16&255;out[q++]=d.length>>>8&255;out[q++]=d.length&255;const cs=q;for(let i=0;i<4;i++)out[q++]=type.charCodeAt(i);out.set(d,q);q+=d.length;const c=crc(out,cs,q);out[q++]=c>>>24;out[q++]=c>>>16&255;out[q++]=c>>>8&255;out[q++]=c&255}
  let bin='';for(let i=0;i<out.length;i+=8192)bin+=String.fromCharCode.apply(null,out.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(bin);
}
function build(aspect){
  const key=aspect.toFixed(3); if(key===maskKey) return; maskKey=key; masks=[]; rims=[]; rimMasks=[];
  // the edge is .6 of the frame height wide, so a small mask scaled up loses nothing
  const MW=128, MH=Math.max(40,Math.round(MW/aspect));
  const field=new Float32Array(MW*MH), edge=new Float32Array(MW*MH);
  for(let j=0;j<MH;j++)for(let i=0;i<MW;i++){const qx=(i+.5)/MW,qy=(j+.5)/MH;field[j*MW+i]=Math.hypot((qx-.5)*aspect,qy-.5)+edgeNoise(qx,qy);
    // softmorph's plates run past the screen, so their frame edge is never seen; ours end at the screen,
    // so the frame edge dissolves too, raggedly, by the same noise
    const e=Math.min(Math.min(qx,1-qx)*aspect,Math.min(qy,1-qy))+edgeNoise(qx*.7+3.7,qy*.7+1.3)*.55; edge[j*MW+i]=Xt(-.02,.3,e)}
  const al=new Uint8Array(MW*MH), rl=new Uint8Array(MW*MH);
  for(let k=0;k<=FRAMES;k++){
    const f=k/FRAMES, clip=Xt(0,.12,f), front=mix(1.25,-.25,Xt(.04,.9,f));
    for(let p=0;p<MW*MH;p++){const t=clamp((field[p]-(front-.55))/.6), inside=(1-t*t*(3-2*t))*edge[p], a=1-clip*(1-inside); al[p]=Math.round(a*255);
      // the gold rim lives on the scene itself, on its dissolving edge: rim * the scene's own alpha
      const rim=Math.exp(-Math.pow((field[p]-front+.25)/.08,2)); rl[p]=Math.round(clamp(rim*a*2)*255)}
    masks.push(`url("${png(MW,MH,al)}")`); rimMasks.push(`url("${png(MW,MH,rl)}")`);
    // the rim: where dist + n = front - .25, found per angle
    const pts=[]; for(let s=0;s<120;s++){const th=s/120*Math.PI*2, c=Math.cos(th), sn=Math.sin(th); let r=Math.max(0,front-.25);
      for(let it=0;it<3;it++){const qx=.5+c*r/aspect,qy=.5+sn*r; r=Math.max(0,front-.25-edgeNoise(qx,qy))} pts.push([c*r,sn*r])}
    rims.push(pts);
  }
  masks.concat(rimMasks).forEach(m=>{const i=new Image();i.src=m.slice(5,-2)});   // decode ahead so no frame waits
}
function maskAt(f){ if(!masks.length) return 'none'; return f<=0?'none':masks[Math.round(clamp(f)*FRAMES)] }

/* ---- the overlay: stars, dust, orbit ring, rim ---- */
const cv=document.createElement('canvas'); cv.id='fx-softmorph'; cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:39;mix-blend-mode:screen';
document.body.appendChild(cv); const cx=cv.getContext('2d');
const small=Math.min(innerWidth,innerHeight)<700;
function sprite(size,fn){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),im=g.createImageData(size,size),d=im.data;
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const px=i/(size-1)*2-1,py=j/(size-1)*2-1,v=clamp(fn(px,py));const o=(j*size+i)*4;d[o]=d[o+1]=d[o+2]=255;d[o+3]=v*255}
  g.putImageData(im,0,0);return c}
// softmorph Bl(): a soft point, and the same point with diffraction spikes
const dot=sprite(64,(x,y)=>{const r2=x*x+y*y;return (Math.exp(-r2*48/.35)+Math.exp(-r2*9)*.35*.5)*(1-Xt(.55,1,Math.sqrt(r2)))});
const spike=sprite(96,(x,y)=>{const r2=x*x+y*y;const sp=Math.exp(-Math.abs(x)*42)*Math.exp(-y*y*1.6)+Math.exp(-Math.abs(y)*42)*Math.exp(-x*x*1.6);
  const dg=(Math.exp(-Math.abs(x-y)*60)+Math.exp(-Math.abs(x+y)*60))*Math.exp(-r2*6)*.25;return (Math.exp(-r2*48)+Math.exp(-r2*9)*.35*1.5+(sp*.85+dg)+Math.exp(-r2*3.2)*.2)*(1-Xt(.55,1,Math.sqrt(r2)))});
function tinted(src,[r,g,b]){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-in';x.fillStyle=`rgb(${r*255|0},${g*255|0},${b*255|0})`;x.fillRect(0,0,c.width,c.height);return c}
const PAL=[[.72,.82,1],[.92,.94,1],[1,.95,.84],[1,.84,.55],[1,.66,.4],[.86,.72,1]];
const dots=PAL.map(c=>tinted(dot,c)), spikes=PAL.map(c=>tinted(spike,c));
const GOLD=[1,.82,.52], LAV=[.85,.8,1], gDot=tinted(dot,GOLD), lDot=tinted(dot,LAV), gSpike=tinted(spike,GOLD), lSpike=tinted(spike,LAV), cream=tinted(dot,[1,.86,.6]);

// star field: six zoom octaves (Fg)
const OCT=6, PER=small?220:420, stars=[];
{const r=rng(7);for(let u=0;u<OCT*PER;u++){const x=(r()*2-1)*1.9,y=(r()*2-1)*1.1,f=r();const col=f<.18?0:f<.45?1:f<.68?2:f<.86?3:f<.95?4:5;
  stars.push({x,y,col,oct:Math.floor(u/PER),b:Math.pow(r(),5),ph:r()*6.283,sp:r()>.993})}}
// orbit ring (Gg)
const ring=[]; {const r=rng(77);for(let o=0;o<(small?450:900);o++)ring.push({x:r(),a:r()*6.2832,z:r(),d:r(),ph:r()*6.28,sz:Math.pow(r(),3),sp:r()<.06})}
// drifting stardust (Hg)
const dust=[]; {const r=rng(11);for(let o=0;o<(small?220:460);o++)dust.push({x:r()*2-1,y:r()*2-1,z:r(),a:r(),b:r(),ph:r()*6.28,w:r()})}

function size(){const d=Math.min(devicePixelRatio||1,small?1.5:1.75);const w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}cx.setTransform(d,0,0,d,0,0)}
let dirty=false;
function clear(){ if(!dirty) return; size(); cx.clearRect(0,0,innerWidth,innerHeight); dirty=false }

/* g = { f, ax, ay: where the old scene's centre is now; vw, vh: its on-screen size;
         zoom: octaves pulled back so far; aspect: old scene's aspect } */
function overlay(g){
  size(); cx.clearRect(0,0,innerWidth,innerHeight); dirty=false;
  const {f}=g; if(f<=0||f>=1||reduced.matches) return; dirty=true;
  const W=innerWidth,H=innerHeight,t=performance.now()/1000, sin=Math.sin(Math.PI*f);
  cx.globalCompositeOperation='lighter';
  // 5. the star field streams inward as the camera pulls back
  {const a0=.78*sin, L=g.zoom*1.0+t*.035;
   for(const s of stars){const u=((s.oct-L)%OCT+OCT)%OCT, k=Math.pow(2,u-2.2), px=W/2+s.x*k*H/2, py=H/2-s.y*k*H/2;
     if(px<-40||py<-40||px>W+40||py>H+40) continue;
     const fade=Xt(0,1.3,u)*(1-Xt(OCT-1.6,OCT,u)), a=a0*fade*(.78+.22*Math.sin(t*(.6+s.b*2)+s.ph*3))*(.25+s.b*1.6+(s.sp?.8:0)); if(a<.01) continue;
     const sz=s.sp?mix(16,34,s.b)*1.6:mix(1.5,4.6,s.b)*2.6; cx.globalAlpha=Math.min(1,a); cx.drawImage(s.sp?spikes[s.col]:dots[s.col],px-sz/2,py-sz/2,sz,sz)}}
  // 6. stardust drifts and thickens
  {const a0=.55*sin;
   for(const m of dust){const dd=.3+m.z*1.4; let x=m.x+t*.006*dd+Math.sin(t*.3+m.ph)*.02*dd, y=m.y-t*.004*dd+Math.cos(t*.23+m.ph)*.02*dd;
     const k=Math.pow(2,-g.zoom*dd*.9); x=((x*k+1.2)%2.4+2.4)%2.4-1.2; y=((y*k+1.2)%2.4+2.4)%2.4-1.2;
     const a=a0*(.25+.75*(.5+.5*Math.sin(t*(1+m.a*2)+m.ph)))*(.3+m.b*.7); if(a<.01) continue;
     const sz=(1.2+dd*dd*2.2+m.b*2)*2.4; cx.globalAlpha=a; cx.drawImage(cream,W/2+x*W/2-sz/2,H/2-y*H/2-sz/2,sz,sz)}}
  // 4. the orbit ring around the closing disc
  {const uA=Math.sin(Math.PI*Xt(.02,.95,f))*.9, front=mix(1.25,-.25,Xt(.04,.9,f)), R=Math.max(.02,front-.2)*g.vh*.5, AF=g.vw/g.vh;
   if(uA>.01) for(const p of ring){const ang=p.a+t*.02*(p.z-.5)*6, r=R*(.72+.5*p.x)+((t*.03+p.d)%1)*.06*g.vh*.5;
     const x=g.ax+Math.cos(ang)*r*AF, y=g.ay+Math.sin(ang)*r; if(x<-30||y<-30||x>W+30||y>H+30) continue;
     const tw=Math.pow(.5+.5*Math.sin(t*(2+p.d*3)+p.ph),3), a=uA*tw*(.35+p.sz*1.6+(p.sp?1:0)); if(a<.02) continue;
     const lav=p.d>.7, sz=p.sp?26*1.5:mix(2,6,p.sz)*2.4; cx.globalAlpha=Math.min(1,a); cx.drawImage(p.sp?(lav?lSpike:gSpike):(lav?lDot:gDot),x-sz/2,y-sz/2,sz,sz)}}
  cx.globalAlpha=1; cx.globalCompositeOperation='source-over';
}

/* 3. the gold rim: a gold layer masked by the rim frames, moved exactly with the old scene */
const rimEl=document.createElement('div'); rimEl.setAttribute('aria-hidden','true');
rimEl.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:38;mix-blend-mode:screen;opacity:0;background:rgb(255,209,128);transform-origin:50% 50%;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat';
document.body.appendChild(rimEl);
function rim(f,transform){
  if(f<=0||f>=1||!rimMasks.length||reduced.matches){rimEl.style.opacity=0;return}
  const T=Math.sin(Math.PI*Xt(.05,.9,f))*.9, m=rimMasks[Math.round(clamp(f)*FRAMES)];
  rimEl.style.maskImage=rimEl.style.webkitMaskImage=m; rimEl.style.transform=transform; rimEl.style.opacity=(.35*T*(1-Xt(.7,.98,f))).toFixed(3);
}

/* 9. the words: old ones blur, fade and lean toward the disc; new ones rise in */
function wordsOut(el,f,g){ if(!el) return; const P=Xt(0,.45,f), y=1-Xt(.04,.42,f);
  if(f<=0){el.style.opacity='';el.style.filter='';el.style.transform='';return}
  const U=mix(1,Math.max(g.vw/innerWidth,.2),.18*P), dx=(g.ax-innerWidth/2)*P*.3, dy=(g.ay-innerHeight/2)*P*.3;
  el.style.opacity=y.toFixed(3); el.style.filter=`blur(${(P*6).toFixed(2)}px)`; el.style.transform=`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(${U.toFixed(4)})` }
function wordsIn(el,f){ if(!el) return; const T=Xt(.74,1,f);
  if(f>=1){el.style.opacity='';el.style.filter='';el.style.transform='';return}
  el.style.opacity=T.toFixed(3); el.style.filter=T>.99?'':`blur(${((1-T)*6).toFixed(2)}px)`; el.style.transform=`translate3d(0,${((1-T)*22).toFixed(1)}px,0) scale(${(1+(1-T)*.025).toFixed(4)})` }

/* 1. the camera: how far pulled back, and where the old centre sits on screen */
function camera(f,from,to,sEnd){
  const e=qs(clamp(f)), s=Math.exp(Math.log(sEnd)*e), h=Fh(Xt(.18,1,f));
  return {s, C:s/sEnd, zoom:-Math.log2(s), ax:mix(from.x,to.x,h), ay:mix(from.y,to.y,h)};
}

window.softmorph={build,maskAt,overlay,clear,rim,wordsOut,wordsIn,camera,Xt,qs};
})();
