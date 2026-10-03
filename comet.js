/* The lighted comet from the softmorph POC, carried over to lead every change of scene.
   Same recipe as its shader (tapered warm body, white-hot head, a few sparks, then a starburst
   where it lands), baked once into two sprites and drawn on one overlay canvas. 2D only. */
(() => {
'use strict';
const cv=document.createElement('canvas'); cv.id='fx-comet'; cv.setAttribute('aria-hidden','true');
cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:40;mix-blend-mode:screen';
document.body.appendChild(cv);
const cx=cv.getContext('2d'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), band=(a,b,x)=>clamp((x-a)/(b-a)), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

// comet body: x runs tail(0) -> head(1); softmorph zg() fragment, evaluated per pixel once
const comet=(()=>{const W=1024,H=56,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),im=g.createImageData(W,H),d=im.data;
  const spark=x=>{const v=Math.sin(Math.floor(x*90)*91.7)*4375;return (v-Math.floor(v))>.985?1:0};
  for(let j=0;j<H;j++){const y=Math.abs(j/(H-1)-.5)*2;for(let i=0;i<W;i++){const x=i/(W-1);
    const w=.02+(.5-.02)*Math.pow(x,3), body=Math.exp(-Math.pow(y/w,2)*3)*Math.pow(x,2.2),
          head=Math.exp(-(1-x)*(1-x)*900-y*y*12)*2.5, sp=spark(x)*Math.exp(-y*y*6)*x*.8, v=body+head+sp, k=Math.pow(x,4);
    const r=v,gg=(.55+.4*k)*v,b=(.25+.6*k)*v,m=Math.max(r,gg,b,1e-6),o=(j*W+i)*4;d[o]=r/m*255;d[o+1]=gg/m*255;d[o+2]=b/m*255;d[o+3]=Math.min(1,m)*255}}
  g.putImageData(im,0,0);return c})();
// the starburst it leaves where it lands: softmorph Bg() fragment
const flare=(()=>{const S=384,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),im=g.createImageData(S,S),d=im.data,col=[1,.86,.6];
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const px=i/(S-1)*2-1,py=j/(S-1)*2-1,r2=px*px+py*py;
    const core=Math.exp(-r2*140),glow=Math.exp(-r2*14)*.5,halo=Math.exp(-r2*3)*.55;
    const sp=Math.exp(-Math.abs(px)*70)*Math.exp(-py*py*2.2)+Math.exp(-Math.abs(py)*70)*Math.exp(-px*px*2.2);
    const sp2=(Math.exp(-Math.abs(px-py)*90)+Math.exp(-Math.abs(px+py)*90))*Math.exp(-r2*9)*.35;
    const v=(core*2+glow+halo+sp+sp2)*(1-clamp((Math.sqrt(r2)-.6)/.4)), m=clamp(core);
    const o=(j*S+i)*4;for(let k=0;k<3;k++)d[o+k]=(col[k]+(1-col[k])*m)*255;d[o+3]=Math.min(1,v)*255}
  g.putImageData(im,0,0);return c})();

let dirty=false;
function size(){const d=Math.min(devicePixelRatio||1,2);const w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}cx.setTransform(d,0,0,d,0,0)}
/* f: transition progress 0..1 (always forward); ax,ay: where the next scene grows from; side: -1 left, 1 right.
   Timing follows softmorph: the comet runs .26->.56 and dies at .62; the burst swells .50->.64 and fades by .98. */
function draw(f,ax,ay,side=1,burst=160){
  size(); cx.clearRect(0,0,innerWidth,innerHeight); dirty=false;
  if(reduced.matches||f<=0||f>=1) return;
  const W=innerWidth,H=innerHeight;
  const M=band(.26,.56,f), out=1-band(.54,.62,f);
  if(M>0&&out>0){
    const U=ease(M), sx=side>0?W*1.15:-W*.15, sy=-H*.12, x=sx+(ax-sx)*U, y=sy+(ay-sy)*U;
    const L=Math.min(W,1000)*.5*(.35+.65*Math.sin(Math.PI*clamp(M*1.15))), ang=Math.atan2(ay-sy,ax-sx), a=clamp(band(0,.12,M)*out*1.5);
    cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=a;cx.translate(x,y);cx.rotate(ang);
    cx.drawImage(comet,-L,-12,L,24); cx.restore(); dirty=true;
  }
  const b=band(.5,.64,f)*(1-band(.8,.98,f));
  if(b>0){const s=clamp(burst,110,380)*(1+.25*band(.6,.8,f)),t=performance.now()/1000;
    cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=b*.9;cx.translate(ax,ay);cx.rotate(.3+t*.03);cx.drawImage(flare,-s/2,-s/2,s,s);cx.restore();dirty=true}
}
function clear(){ if(!dirty) return; size(); cx.clearRect(0,0,innerWidth,innerHeight); dirty=false; }
window.cometFX={draw,clear};
})();
