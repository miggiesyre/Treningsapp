// @ts-nocheck
/* eslint-disable */
// Share-card scenes, ported 1:1 from the v8 prototype (SCENES, drawEl, renderScene, sceneVideo).
// Kept close to the original so the look matches exactly; typed wrappers live in some.tsx.

export let SF = { arc: '"Rye","Alfa Slab One",Georgia,serif', num: '"Alfa Slab One",Rockwell,Georgia,serif', lbl: '"Oswald","Arial Narrow",sans-serif', mono: '"Courier Prime","Courier New",monospace' };
/** next/font renames the families; read the real names from the CSS variables. */
export function setFonts() {
  if (typeof window === 'undefined') return;
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rye = v('--font-rye'), slab = v('--font-slab'), osw = v('--font-oswald'), cou = v('--font-courier');
  SF = {
    arc: `${rye ? rye + ',' : ''}${slab ? slab + ',' : ''}Georgia,serif`,
    num: `${slab ? slab + ',' : ''}Rockwell,Georgia,serif`,
    lbl: `${osw ? osw + ',' : ''}"Arial Narrow",sans-serif`,
    mono: `${cou ? cou + ',' : ''}"Courier New",monospace`,
  };
  MEAS = null;
}
export const INKS = ['#F2EEE6', '#3E5C6E', '#1B2A33', '#111111', '#FFFFFF', '#19B2F5', '#FFC20E', '#FF3B30', '#AF52DE'];
export const EL_NAMES = { arc: 'IRONMAN-bue', head: 'IRONMAN', vtext: 'IRONMAN', emblem: 'Logo-emblem', title: 'Tittel', sub: 'Dato', meta: 'Undertittel', stats: 'Tall', zones: 'Soner', pr: 'PR-merke', days: 'Dager til Jesolo', route: 'Rute', panel: 'Kvittering', rows: 'Rader', barcode: 'Strekkode', arc2: 'Sport-bue', drop: 'Venice Jesolo', seal: 'Segl', arcd: 'Dato-bue', big: '70.3', line: 'Tall-linje' };
export const SOME_FMT = { story: { l: 'Story', r: '9:16', W: 1080, H: 1920 }, post: { l: 'Innlegg', r: '4:5', W: 1080, H: 1350 }, square: { l: 'Kvadrat', r: '1:1', W: 1080, H: 1080 }, land: { l: 'Landskap', r: '16:9', W: 1920, H: 1080 } };
export const SOME_TPL = [['badge', 'Badge'], ['shirt', 'T-skjorte'], ['route', 'Rute'], ['receipt', 'Kvittering'], ['vertical', 'Vertikal']];
const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
export function spaced(c,txt,x,y,sp){const ch=[...txt],ws=ch.map(k=>c.measureText(k).width);const tot=ws.reduce((a,b)=>a+b,0)+sp*(ch.length-1);let cx=x-tot/2;const al=c.textAlign;c.textAlign='left';ch.forEach((k,i)=>{c.fillText(k,cx,y);cx+=ws[i]+sp;});c.textAlign=al;}
export function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
export function drawLogo(c,x,y,s,t,mono){const ease=k=>{k=Math.max(0,Math.min(1,k));return 1-Math.pow(1-k,3);};
  const circ=(cx,cy,r,col)=>{c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=col;c.fill();};
  const st=(d,w,col)=>{c.lineWidth=w;c.strokeStyle=col;c.stroke(new Path2D(d));};
  const G=[{col:'#19B2F5',bar:[0,62,120,8],t0:0.15,fig:col=>{st('M3 57.5q3.5-3 7 0t7 0t7 0t7 0',2.8,col);st('M8 52 L15 43 L29 40',4.6,col);circ(25,49,4.6,col);}},
    {col:'#FFC20E',bar:[38,44,82,8],t0:0.55,fig:col=>{c.lineWidth=2.8;c.strokeStyle=col;c.beginPath();c.arc(48,36.5,6.8,0,Math.PI*2);c.stroke();c.beginPath();c.arc(68,36.5,6.8,0,Math.PI*2);c.stroke();st('M48 36.5 L56 27.5 L68 36.5 M56 27.5 L62.5 27.5',2.4,col);st('M57 28 L60.5 19.5 L67.5 22.5',4.6,col);circ(65.5,13.5,3.8,col);}},
    {col:'#FF3B30',bar:[76,26,44,8],t0:0.95,fig:col=>{st('M97 9.5 L93 17.5',4.8,col);st('M93 17.5 L86 20.5 L82 19.5 M93 17.5 L99 21.5 L101 25.5',3.6,col);st('M96 11.5 L103 13.5 M96 11.5 L90 14.5',3,col);circ(99,4,3.8,col);}}];
  c.save();c.translate(x,y+2*s);c.scale(s,s);c.lineCap='round';c.lineJoin='round';const ga=c.globalAlpha;
  G.forEach(g0=>{const g=mono?{...g0,col:mono}:g0;const k=ease((t-g.t0)/0.7);if(k<=0)return;const [bx,by,bw,bh]=g.bar;c.globalAlpha=ga;c.fillStyle=g.col;rr(c,bx,by,bw*k,bh,1.5);c.fill();
    c.globalAlpha=ga*k;c.save();c.translate(0,(1-k)*8);g.fig(g.col);c.restore();});
  c.restore();c.globalAlpha=ga;}
let GRAIN=null;
function grain(){if(GRAIN)return GRAIN;const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');const d=x.createImageData(160,160);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()*110;}x.putImageData(d,0,0);GRAIN=c;return c;}
export const bgColor=bg=>bg==='navy'?'#1B2A33':(bg==='cream'||bg==='anim')?'#F2EEE6':null;
export const autoInk=bg=>bg==='navy'||bg==='none'?'#F2EEE6':'#3E5C6E';
export const lum=h=>{const n=parseInt(String(h).replace('#','').slice(0,6),16);return(0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255;};
let MEAS=null;const meas=()=>MEAS||(MEAS=document.createElement('canvas').getContext('2d'));
const twid=(txt,font,sp)=>{const m=meas();m.font=font;const ch=[...String(txt)];return ch.reduce((a,k)=>a+m.measureText(k).width,0)+(sp||0)*Math.max(0,ch.length-1);};
const T_=(txt,size,font,weight,sp)=>({w:twid(txt,`${weight||400} ${size}px ${SF[font]}`,sp),h:size*1.3});
function addText(els,id,x,y,txt,size,font,weight,sp,extra){const m=T_(txt,size,font,weight,sp);els.push({id,type:'text',x,y,w:m.w+4,h:m.h,p:{text:txt,size,font,weight,sp,...(extra||{})}});return m;}
function arcBox(text,size,R,sp,font){const L=twid(text,font||`${size}px ${SF.arc}`,sp);const th=Math.min(Math.PI*0.95,L/R);return{w:2*R*Math.sin(th/2)+size*1.3,h:R*(1-Math.cos(th/2))+size*1.2};}
function statsDims(items,layout,vs,ls,width){const n=items.length,rh=vs*1.02+ls*2;if(layout==='stack')return{w:width,h:n*rh,rh};if(layout==='grid2')return{w:width,h:Math.ceil(n/2)*rh,rh};return{w:width,h:rh,rh};}
function mkRoute(seed){const p1=rnd(seed)*6,p2=rnd(seed+1)*6,pts=[];for(let i=0;i<=140;i++){const th=i/140*Math.PI*1.9;const r=1+0.32*Math.sin(3*th+p1)+0.18*Math.sin(5*th+p2)+0.06*Math.sin(17*th);pts.push([Math.cos(th)*r,Math.sin(th)*r*0.85]);}
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);return pts.map(([x,y])=>[0.04+(x-x0)/(x1-x0)*0.92,0.04+(y-y0)/(y1-y0)*0.92]);}
function star(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr2=i%2?r*0.45:r;c.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2);}c.closePath();c.fill();}
function ringText(c,txt,R,sp){const ch=[...txt],ws=ch.map(x=>c.measureText(x).width);const L=ws.reduce((a,b)=>a+b,0)+sp*(ch.length-1);let a=Math.PI/2+L/R/2;c.textBaseline='alphabetic';
  ch.forEach((x,i)=>{const am=a-ws[i]/2/R;c.save();c.translate(Math.cos(am)*R,Math.sin(am)*R);c.rotate(am-Math.PI/2);c.textAlign='center';c.fillText(x,0,0);c.restore();a-=(ws[i]+sp)/R;});}
function statCell(c,s,cx,cy,vs,ls){c.textBaseline='alphabetic';c.font=`${vs}px ${SF.num}`;const vw=c.measureText(s.val).width;const uf=`600 ${vs*0.34}px ${SF.lbl}`;c.font=uf;const ut=s.unit?' '+s.unit.toUpperCase():'';const uw=ut?c.measureText(ut).width:0;
  const x0=cx-(vw+uw)/2;c.textAlign='left';c.font=`${vs}px ${SF.num}`;c.fillText(s.val,x0,cy+vs*0.9);if(ut){c.font=uf;c.fillText(ut,x0+vw,cy+vs*0.9);}
  c.textAlign='center';c.font=`500 ${ls}px ${SF.lbl}`;const ga=c.globalAlpha;c.globalAlpha=ga*0.78;spaced(c,s.label.toUpperCase(),cx,cy+vs*0.9+ls*1.45,ls*0.3);c.globalAlpha=ga;}
const SCENES={};
SCENES.badge=(W,H,d,k)=>{const u=Math.min(W,H)/1080*k,els=[],wide=W/H>1.25,tall=H/W>1.5,n=d.stats.length;
  if(!wide){let y=H*0.04;const R=(tall?440:400)*u,as=(tall?118:104)*u,ab=arcBox('IRONMAN',as,R,12*u);els.push({id:'arc',type:'arc',x:W/2,y:y+ab.h/2,w:ab.w,h:ab.h,p:{text:'IRONMAN',size:as,R,sp:12*u}});y+=ab.h+14*u;
    const ed=(tall?380:290)*u,ey=y+ed/2;els.push({id:'emblem',type:'emblem',x:W/2,y:ey,w:ed,h:ed,p:{}});y+=ed+36*u;
    if(d.pr)els.push({id:'pr',type:'pr',x:W/2+ed*0.48,y:ey-ed*0.36,w:130*u,h:130*u,p:{}});
    if(d.title){const m=addText(els,'title',W/2,y+26*u,d.title.toUpperCase(),46*u,'lbl',600,9*u);y+=m.h+4*u;}
    if(d.sub){const m=addText(els,'sub',W/2,y+18*u,d.sub.toUpperCase(),28*u,'mono',400,4*u,{alpha:0.8});y+=m.h+30*u;}
    if(n){const layout=n<=3&&tall?'stack':'grid2';const vs=(layout==='stack'?116:(tall?98:80))*u,ls=vs*0.27;const sd=statsDims(d.stats,layout,vs,ls,W*0.84);els.push({id:'stats',type:'stats',x:W/2,y:y+sd.h/2,w:sd.w,h:sd.h,p:{items:d.stats,layout,vs,ls,rh:sd.rh}});y+=sd.h+18*u;}
    if(d.zones){const zh=118*u;els.push({id:'zones',type:'zones',x:W/2,y:y+zh/2,w:W*0.74,h:zh,p:{zones:d.zones,ls:26*u,bh:30*u}});y+=zh+18*u;}
    if(d.days){const m=T_(d.days,38*u,'lbl',500,8*u);els.push({id:'days',type:'days',x:W/2,y:Math.max(y+40*u,H-H*0.045-20*u),w:m.w+120*u,h:m.h,p:{text:d.days,size:38*u,sp:8*u}});y+=m.h+40*u;}
    return{els,total:y};}
  const lx=W*0.27,rx=W*0.66;let y=H*0.07;const R=300*u,as=96*u,ab=arcBox('IRONMAN',as,R,10*u);els.push({id:'arc',type:'arc',x:lx,y:y+ab.h/2,w:ab.w,h:ab.h,p:{text:'IRONMAN',size:as,R,sp:10*u}});y+=ab.h+10*u;
  const ed=Math.min(400*u,H-y-H*0.07);els.push({id:'emblem',type:'emblem',x:lx,y:y+ed/2,w:ed,h:ed,p:{}});if(d.pr)els.push({id:'pr',type:'pr',x:lx+ed*0.48,y:y+ed*0.14,w:120*u,h:120*u,p:{}});
  let y2=H*0.12;if(d.title){const m=addText(els,'title',rx,y2,d.title.toUpperCase(),46*u,'lbl',600,9*u);y2+=m.h;}if(d.sub){const m=addText(els,'sub',rx,y2,d.sub.toUpperCase(),28*u,'mono',400,4*u,{alpha:0.8});y2+=m.h+30*u;}
  if(n){const vs=84*u,ls=vs*0.27;const sd=statsDims(d.stats,'grid2',vs,ls,W*0.52);els.push({id:'stats',type:'stats',x:rx,y:y2+sd.h/2,w:sd.w,h:sd.h,p:{items:d.stats,layout:'grid2',vs,ls,rh:sd.rh}});y2+=sd.h+14*u;}
  if(d.zones){const zh=110*u;els.push({id:'zones',type:'zones',x:rx,y:y2+zh/2,w:W*0.48,h:zh,p:{zones:d.zones,ls:24*u,bh:28*u}});y2+=zh+14*u;}
  if(d.days){const m=T_(d.days,34*u,'lbl',500,7*u);els.push({id:'days',type:'days',x:rx,y:Math.max(y2+30*u,H*0.91),w:m.w+110*u,h:m.h,p:{text:d.days,size:34*u,sp:7*u}});y2+=m.h+30*u;}
  return{els,total:Math.max(y+ed,y2)};};
SCENES.route=(W,H,d,k)=>{const u=Math.min(W,H)/1080*k,els=[],wide=W/H>1.25,tall=H/W>1.5,n=d.stats.length;
  if(!wide){let y=H*0.045;const m=addText(els,'head',W/2,y+52*u,'IRONMAN',96*u,'arc',400,10*u);y+=m.h+8*u;
    if(d.title){const t=(d.title+(d.sub?' · '+d.sub:'')).toUpperCase();const mm=addText(els,'title',W/2,y+18*u,t,28*u,'lbl',500,6*u,{alpha:0.85});y+=mm.h+26*u;}
    const rh=H*(tall?0.42:0.34),rw=W*0.84;els.push({id:'route',type:'route',x:W/2,y:y+rh/2,w:rw,h:rh,p:{pts:d.route,lw:10*u}});if(d.pr)els.push({id:'pr',type:'pr',x:W/2+rw*0.42,y:y+rh*0.08,w:120*u,h:120*u,p:{}});y+=rh+40*u;
    if(n){const layout=n<=4?'row':'grid2';const vs=(layout==='row'?(n<=3?84:66):74)*u,ls=vs*0.3;const sd=statsDims(d.stats,layout,vs,ls,W*0.9);els.push({id:'stats',type:'stats',x:W/2,y:y+sd.h/2,w:sd.w,h:sd.h,p:{items:d.stats,layout,vs,ls,rh:sd.rh}});y+=sd.h+20*u;}
    if(d.zones){const zh=110*u;els.push({id:'zones',type:'zones',x:W/2,y:y+zh/2,w:W*0.78,h:zh,p:{zones:d.zones,ls:24*u,bh:26*u}});y+=zh+20*u;}
    const by=Math.max(y+80*u,H-110*u);els.push({id:'emblem',type:'emblem',x:150*u,y:by,w:170*u,h:170*u,p:{small:true}});
    if(d.days){const m2=T_(d.days,30*u,'lbl',500,6*u);els.push({id:'days',type:'days',x:W-60*u-(m2.w+90*u)/2,y:by,w:m2.w+90*u,h:m2.h,p:{text:d.days,size:30*u,sp:6*u}});}
    return{els,total:by+90*u};}
  addText(els,'head',W*0.3,H*0.1,'IRONMAN',90*u,'arc',400,10*u);els.push({id:'route',type:'route',x:W*0.3,y:H*0.56,w:W*0.5,h:H*0.66,p:{pts:d.route,lw:9*u}});
  let y=H*0.14;if(d.title){const t=addText(els,'title',W*0.76,y,d.title.toUpperCase(),40*u,'lbl',600,8*u);y+=t.h;}if(d.sub){const t=addText(els,'sub',W*0.76,y,d.sub.toUpperCase(),26*u,'mono',400,4*u,{alpha:0.8});y+=t.h+24*u;}
  if(n){const vs=70*u,ls=vs*0.28;const sd=statsDims(d.stats,'grid2',vs,ls,W*0.42);els.push({id:'stats',type:'stats',x:W*0.76,y:y+sd.h/2,w:sd.w,h:sd.h,p:{items:d.stats,layout:'grid2',vs,ls,rh:sd.rh}});y+=sd.h+12*u;}
  if(d.zones){const zh=100*u;els.push({id:'zones',type:'zones',x:W*0.76,y:y+zh/2,w:W*0.4,h:zh,p:{zones:d.zones,ls:22*u,bh:24*u}});y+=zh+12*u;}
  els.push({id:'emblem',type:'emblem',x:W*0.62,y:H*0.87,w:150*u,h:150*u,p:{small:true}});
  if(d.days){const m2=T_(d.days,28*u,'lbl',500,6*u);els.push({id:'days',type:'days',x:W*0.8,y:H*0.87,w:m2.w+80*u,h:m2.h,p:{text:d.days,size:28*u,sp:6*u}});}
  if(d.pr)els.push({id:'pr',type:'pr',x:W*0.5,y:H*0.28,w:110*u,h:110*u,p:{}});
  return{els,total:Math.max(y,H*0.9)};};
SCENES.receipt=(W,H,d,k)=>{const u=Math.min(W,H)/1080*k,els=[],wide=W/H>1.25,tall=H/W>1.5;
  const pw=wide?W*0.42:(tall?W*0.82:W*0.74),px=W/2,fs=(tall?36:30)*u,rh=fs*1.55,parts=[];const P=(id,type,h,w,p)=>parts.push({id,type,h,w,p});
  P('head','text',104*u,0,{text:'IRONMAN',size:88*u,font:'arc',weight:400,sp:10*u,onPaper:true});
  P('meta','text',40*u,0,{text:'TRI 70.3 · TRENINGSKVITTERING',size:22*u,font:'mono',weight:700,sp:3*u,onPaper:true,alpha:0.85});
  if(d.sub)P('sub','text',44*u,0,{text:d.sub.toUpperCase(),size:24*u,font:'mono',weight:400,sp:2*u,onPaper:true,alpha:0.85});
  const ew=(tall?170:120)*u;P('emblem','emblem',ew+26*u,ew,{small:true,onPaper:true});
  if(d.title)P('title','text',56*u,0,{text:d.title.toUpperCase(),size:32*u,font:'mono',weight:700,sp:4*u,onPaper:true});
  if(d.stats.length)P('rows','rows',d.stats.length*rh+rh*0.9,pw-110*u,{items:d.stats,fs,rh,onPaper:true});
  if(d.zones)P('zones','zones',104*u,pw-140*u,{zones:d.zones,ls:22*u,bh:24*u,onPaper:true,mono:true});
  P('barcode','barcode',96*u,pw*0.56,{onPaper:true,seed:String(d.title||'x').length+3});
  if(d.days)P('days','text',56*u,0,{text:d.days,size:24*u,font:'mono',weight:700,sp:4*u,onPaper:true});
  const ph=parts.reduce((a,p)=>a+p.h,0)+120*u;els.push({id:'panel',type:'panel',x:px,y:H/2,w:pw,h:ph,p:{}});
  let y=H/2-ph/2+60*u;parts.forEach(p=>{const cy=y+p.h/2;if(p.type==='text'){const m=T_(p.p.text,p.p.size,p.p.font,p.p.weight,p.p.sp);els.push({id:p.id,type:'text',x:px,y:cy,w:m.w+4,h:m.h,p:p.p});}
    else els.push({id:p.id,type:p.type,x:px,y:cy,w:p.w,h:p.type==='emblem'?p.w:p.h,p:p.p});y+=p.h;});
  if(d.pr)els.push({id:'pr',type:'pr',x:px+pw*0.34,y:H/2-ph/2+ph*0.1,w:130*u,h:130*u,p:{stamp:true}});
  return{els,total:ph+H*0.04};};
SCENES.vertical=(W,H,d,k)=>{const u=Math.min(W,H)/1080*k,els=[],tall=H/W>1.5,wide=W/H>1.25,n=d.stats.length;
  const vsz=(tall?H*0.1:(wide?H*0.15:H*0.12))*k;const L=twid('IRONMAN',`${vsz}px ${SF.arc}`,vsz*0.08);
  els.push({id:'vtext',type:'vtext',x:W-vsz*0.7-30*u,y:H/2,w:vsz*1.2,h:L,p:{text:'IRONMAN',size:vsz,sp:vsz*0.08}});
  let vs=(tall?100:82)*u;let colW=vs*1.32;if(n*colW>W*0.46){colW=W*0.46/Math.max(1,n);vs=colW/1.32;}
  const lineLen=s=>twid(s.val,`${vs}px ${SF.num}`,0)+twid(' '+(s.unit||'').toUpperCase(),`600 ${vs*0.34}px ${SF.lbl}`,0)+vs*0.5+twid(s.label.toUpperCase(),`500 ${vs*0.3}px ${SF.lbl}`,vs*0.09);
  if(n){const sh=Math.max(...d.stats.map(lineLen))+40*u;els.push({id:'stats',type:'vstats',x:50*u+n*colW/2,y:H/2,w:n*colW,h:Math.min(sh,H*0.94),p:{items:d.stats,vs,colW}});}
  const left=50*u+n*colW+30*u,right=W-vsz*1.3-40*u,cx=(left+right)/2,cw=Math.max(200*u,right-left);
  let y=H*(tall?0.12:0.1);const ed=Math.min((tall?320:250)*u,cw*0.9);els.push({id:'emblem',type:'emblem',x:cx,y:y+ed/2,w:ed,h:ed,p:{}});if(d.pr)els.push({id:'pr',type:'pr',x:cx+ed*0.44,y:y+ed*0.12,w:110*u,h:110*u,p:{}});y+=ed+30*u;
  if(d.title){const sz=Math.min(40*u,cw*1.5/Math.max(6,d.title.length));const m=addText(els,'title',cx,y+20*u,d.title.toUpperCase(),sz,'lbl',600,5*u);y+=m.h+4*u;}
  if(d.sub){const m=addText(els,'sub',cx,y+14*u,d.sub.toUpperCase(),Math.min(24*u,cw*1.6/Math.max(8,d.sub.length)),'mono',400,3*u,{alpha:0.8});y+=m.h+24*u;}
  if(d.zones){const zh=110*u;els.push({id:'zones',type:'zones',x:cx,y:Math.max(y+zh/2,H*0.62),w:cw*0.95,h:zh,p:{zones:d.zones,ls:Math.min(22*u,cw/26),bh:26*u}});}
  if(d.days){const sz=Math.min(30*u,cw*1.25/Math.max(10,d.days.length));const m=T_(d.days,sz,'lbl',500,4*u);els.push({id:'days',type:'days',x:cx,y:H*0.92,w:m.w+sz*3,h:m.h,p:{text:d.days,size:sz,sp:4*u}});}
  return{els,total:H*0.9};};
// T-skjorte: stacked vintage print after Miguel's Holzweiler shirt (arched name, emblem, drop-cap pair, arched word, seal, smile arc, big slab word, small caps line).
SCENES.shirt=(W,H,d,k)=>{const u=Math.min(W,H)/1080*k,els=[],tall=H/W>1.5,wide=W/H>1.25,f=wide?0.78:1,st=d.stats||[];let y=H*(tall?0.05:0.035);
  const R=(tall?520:470)*u*f,as=(tall?122:108)*u*f,ab=arcBox('IRONMAN',as,R,6*u);els.push({id:'arc',type:'arc',x:W/2,y:y+ab.h/2,w:ab.w,h:ab.h,p:{text:'IRONMAN',size:as,R,sp:6*u}});
  const ed=(tall?260:220)*u*f,ey=y+as*1.15+ed/2;els.push({id:'emblem',type:'emblem',x:W/2,y:ey,w:ed,h:ed,p:{small:true}});y=Math.max(ey+ed/2,y+ab.h)+(tall?56:34)*u;
  const fs=(tall?84:72)*u*f,ds=fs*2.3,lf=`${fs}px ${SF.arc}`,w1=twid('ENICE',lf,2*u),w2=twid('JESOLO',lf,2*u),dw=twid('V',`${ds}px ${SF.arc}`,0)*0.98,dwid=dw+Math.max(w1,w2),dh=ds*0.98;
  els.push({id:'drop',type:'drop',x:W/2,y:y+dh/2,w:dwid,h:dh,p:{fs,ds,dw,w1,w2,sp:2*u}});y+=dh+(tall?44:26)*u;
  const ws=(tall?100:86)*u*f,wR=380*u*f,wf=`700 ${ws}px ${SF.lbl}`,wb=arcBox(d.word||'TRENING',ws,wR,5*u,wf);els.push({id:'arc2',type:'arc',x:W/2,y:y+wb.h/2,w:wb.w,h:wb.h,p:{text:d.word||'TRENING',size:ws,R:wR,sp:5*u,font:'lbl',weight:700}});y+=wb.h-ws*0.1;
  const sw=(tall?330:280)*u*f,sh=sw*0.74,ls=26*u*f,sl=['EST. 2026','JESOLO 27'],lw=Math.max(...sl.map(x=>twid(x,`600 ${ls}px ${SF.lbl}`,2*u)));const s0=st[0]||{val:'70.3',unit:'',label:''};
  els.push({id:'seal',type:'seal',x:W/2,y:y+sh/2,w:sw+2*(lw+40*u),h:sh,p:{sw,sh,ls,lw,sl,s:s0}});y+=sh+(tall?8:4)*u;
  if(d.sub){const cs=(tall?80:68)*u*f,cR=420*u*f,cf=`700 ${cs}px ${SF.lbl}`,cb=arcBox(d.sub.toUpperCase(),cs,cR,4*u,cf);els.push({id:'arcd',type:'arcd',x:W/2,y:y+cb.h/2,w:cb.w,h:cb.h,p:{text:d.sub.toUpperCase(),size:cs,R:cR,sp:4*u}});y+=cb.h+(tall?30:16)*u;}
  const bs=(tall?220:180)*u*f,bm=T_('70.3',bs,'num',400,10*u);els.push({id:'big',type:'big',x:W/2,y:y+bm.h*0.42,w:bm.w,h:bm.h*0.84,p:{text:'70.3',size:bs,sp:10*u}});y+=bm.h*0.84+6*u;
  const rest=(d.stats&&st[0]?st.slice(1):st).map(s=>`${s.val}${s.unit?' '+s.unit:''}`.toUpperCase()).join('  ·  ');
  if(rest){const m=addText(els,'line',W/2,y+22*u,rest,(tall?38:34)*u*f,'num',400,3*u);y+=m.h+14*u;}
  if(d.days){const m=T_(d.days,34*u,'lbl',500,7*u);els.push({id:'days',type:'days',x:W/2,y:Math.max(y+40*u,H-H*0.04-20*u),w:m.w+110*u,h:m.h,p:{text:d.days,size:34*u,sp:7*u}});y+=m.h+40*u;}
  return{els,total:y};};
export function mkScene(tpl,W,H,d){let k=1,r=null;for(let i=0;i<4;i++){r=SCENES[tpl](W,H,d,k);if(r.total<=H*0.97)break;k*=H*0.95/r.total;}return r.els;}
function drawEl(c,el,o,lt,ga){const p=el.p,ink=p.onPaper?o.paperInk:o.ink;c.fillStyle=ink;c.strokeStyle=ink;c.globalAlpha=ga;const cl=v=>Math.max(0,Math.min(1,v));
  switch(el.type){
  case 'text':{c.globalAlpha=ga*(p.alpha||1);c.font=`${p.weight||400} ${p.size}px ${SF[p.font]}`;c.textBaseline='middle';spaced(c,p.text,0,0,p.sp||0);break;}
  case 'days':{c.font=`500 ${p.size}px ${SF.lbl}`;c.textBaseline='middle';spaced(c,p.text,0,0,p.sp);const tw=twid(p.text,c.font,p.sp);star(c,-tw/2-p.size*0.9,-p.size*0.04,p.size*0.3);star(c,tw/2+p.size*0.9,-p.size*0.04,p.size*0.3);break;}
  case 'arc':{c.font=`${p.weight||400} ${p.size}px ${SF[p.font||'arc']}`;c.textBaseline='alphabetic';const ch=[...p.text],ws=ch.map(x=>c.measureText(x).width);const L=ws.reduce((a,b)=>a+b,0)+p.sp*(ch.length-1);const th=L/p.R;const cy=-el.h/2+p.size*1.05+p.R;let a=-Math.PI/2-th/2;
    ch.forEach((x,i)=>{const kk=cl((lt-i*0.06)/0.3);const am=a+ws[i]/2/p.R;if(kk>0){c.save();c.translate(Math.cos(am)*p.R,cy+Math.sin(am)*p.R);c.rotate(am+Math.PI/2);c.globalAlpha=ga*kk;c.textAlign='center';c.fillText(x,0,0);c.restore();}a+=(ws[i]+p.sp)/p.R;});break;}
  case 'drop':{const top=-el.h/2,x0=-el.w/2;c.textBaseline='alphabetic';c.textAlign='left';c.font=`${p.ds}px ${SF.arc}`;c.fillText('V',x0,top+p.ds*0.8);c.font=`${p.fs}px ${SF.arc}`;
    const lx=x0+p.dw,rx=lx+Math.max(p.w1,p.w2);spaced(c,'ENICE',lx+p.w1/2,top+p.fs*1.0,p.sp);spaced(c,'JESOLO',rx-p.w2/2,top+p.fs*2.05,p.sp);c.textAlign='center';break;}
  case 'seal':{const a=p.sw/2,b=p.sh/2;c.lineWidth=a*0.035;c.beginPath();c.ellipse(0,0,a*0.98,b*0.97,0,0,Math.PI*2);c.stroke();c.lineWidth=a*0.014;c.beginPath();c.ellipse(0,0,a*0.88,b*0.85,0,0,Math.PI*2);c.stroke();
    c.textAlign='center';c.textBaseline='middle';const v=String(p.s.val);let vs=b*1.0;c.font=`${vs}px ${SF.num}`;const mw=a*1.5;const vw=c.measureText(v).width;if(vw>mw){vs*=mw/vw;c.font=`${vs}px ${SF.num}`;}
    const lab=[p.s.unit,p.s.label].filter(Boolean).join(' · ').toUpperCase();c.fillText(v,0,lab?-b*0.12:0);if(lab){c.font=`600 ${b*0.17}px ${SF.lbl}`;spaced(c,lab,0,b*0.5,b*0.03);}
    c.font=`600 ${p.ls}px ${SF.lbl}`;spaced(c,p.sl[0],-a-p.lw/2-20*(p.ls/26),0,p.ls*0.08);spaced(c,p.sl[1],a+p.lw/2+20*(p.ls/26),0,p.ls*0.08);break;}
  case 'arcd':{c.font=`700 ${p.size}px ${SF.lbl}`;c.save();c.translate(0,el.h/2-p.size*0.2-p.R);ringText(c,p.text,p.R,p.sp);c.restore();break;}
  case 'big':{c.font=`${p.size}px ${SF.num}`;c.textBaseline='middle';spaced(c,p.text,0,p.size*0.04,p.sp);const bg=bgColor(o.bg);if(bg){c.save();c.strokeStyle=bg;c.lineWidth=p.size*0.014;c.globalAlpha=ga*0.85;const ch=[...p.text],ws=ch.map(q=>c.measureText(q).width);let x=-(ws.reduce((a2,b2)=>a2+b2,0)+p.sp*(ch.length-1))/2;c.textAlign='left';ch.forEach((q,i)=>{c.save();c.translate(x+ws[i]*0.5,p.size*0.04);c.scale(0.86,0.86);c.strokeText(q,-ws[i]*0.5,0);c.restore();x+=ws[i]+p.sp;});c.restore();c.textAlign='center';}break;}
  case 'vtext':{c.save();c.rotate(Math.PI/2);c.font=`${p.size}px ${SF.arc}`;c.textBaseline='middle';spaced(c,p.text,0,0,p.sp);c.restore();break;}
  case 'emblem':{const r=el.w/2;c.lineWidth=r*0.035;c.beginPath();c.arc(0,0,r*0.96,0,Math.PI*2);c.stroke();c.lineWidth=r*0.014;c.beginPath();c.arc(0,0,r*(p.small?0.86:0.78),0,Math.PI*2);c.stroke();
    if(!p.small){c.font=`600 ${r*0.095}px ${SF.lbl}`;ringText(c,'TRI 70.3 · VENICE-JESOLO · 2027',r*0.885,r*0.012);star(c,0,-r*0.87,r*0.045);}
    const lw=r*(p.small?1.25:1.12),s=lw/120;drawLogo(c,-lw/2,-74*s/2-2*s+r*(p.small?0.02:-0.04),s,lt*1.2,ink);break;}
  case 'stats':{const it=p.items,n=it.length;it.forEach((s,i)=>{const kk=cl((lt-i*0.12)/0.4);if(kk<=0)return;c.globalAlpha=ga*kk;let cx,cy;
      if(p.layout==='stack'){cx=0;cy=-el.h/2+i*p.rh;}else if(p.layout==='grid2'){const last=n%2&&i===n-1;cx=last?0:(i%2?el.w/4:-el.w/4);cy=-el.h/2+Math.floor(i/2)*p.rh;}else{const cw=el.w/n;cx=-el.w/2+cw*(i+0.5);cy=-el.h/2;}
      statCell(c,s,cx,cy,p.vs,p.ls);});c.globalAlpha=ga;break;}
  case 'vstats':{p.items.forEach((s,i)=>{const kk=cl((lt-i*0.12)/0.4);if(kk<=0)return;c.globalAlpha=ga*kk;c.save();c.translate(-el.w/2+p.colW*(i+0.5),0);c.rotate(-Math.PI/2);c.textBaseline='middle';
      const vf=`${p.vs}px ${SF.num}`,uf=`600 ${p.vs*0.34}px ${SF.lbl}`,lf=`500 ${p.vs*0.3}px ${SF.lbl}`,ut=s.unit?' '+s.unit.toUpperCase():'',lt2=s.label.toUpperCase();
      const vw=twid(s.val,vf,0),uw=ut?twid(ut,uf,0):0,lw=twid(lt2,lf,p.vs*0.09),gap=p.vs*0.5,tot=vw+uw+gap+lw;let x=-tot/2;c.textAlign='left';
      c.font=vf;c.fillText(s.val,x,0);x+=vw;if(ut){c.font=uf;c.fillText(ut,x,p.vs*0.12);x+=uw;}x+=gap;c.font=lf;c.globalAlpha=ga*kk*0.78;spaced(c,lt2,x+lw/2,p.vs*0.12,p.vs*0.09);c.restore();});c.globalAlpha=ga;c.textAlign='center';break;}
  case 'zones':{const z=p.zones,w=el.w,f=p.mono?SF.mono:SF.lbl;c.font=`500 ${p.ls}px ${f}`;c.textBaseline='alphabetic';spaced(c,'TID I SONER',0,-el.h/2+p.ls,p.ls*0.3);let x=-w/2;const y=-el.h/2+p.ls*1.8;const A=[0.22,0.42,0.62,0.82,1];
    z.forEach((v,i)=>{const sw=w*v/100,kk=cl((lt-i*0.1)/0.3);c.globalAlpha=ga*A[i];c.fillRect(x+2,y,Math.max(0,(sw-4)*kk),p.bh);c.globalAlpha=ga;if(v>=8){c.font=`600 ${p.ls*0.9}px ${f}`;c.textAlign='center';c.fillText(`Z${i+1} ${v}%`,x+sw/2,y+p.bh+p.ls*1.3);}x+=sw;});break;}
  case 'pr':{const r=el.w/2;c.save();c.rotate(p.stamp?-0.25:0.12);c.lineWidth=r*0.06;c.beginPath();c.arc(0,0,r*0.94,0,Math.PI*2);c.stroke();c.beginPath();c.arc(0,0,r*0.78,0,Math.PI*2);c.fill();
    c.fillStyle=p.onPaper?o.paper:o.prText;c.font=`${r*0.62}px ${SF.num}`;c.textBaseline='middle';c.textAlign='center';c.fillText('PR',0,r*0.04);c.restore();break;}
  case 'route':{const pts=p.pts;if(!pts||pts.length<2)break;const kk=cl(lt/1.6),N=Math.max(2,Math.floor(pts.length*kk));const X=q=>-el.w/2+q[0]*el.w,Y=q=>-el.h/2+q[1]*el.h;
    c.lineWidth=p.lw;c.lineCap='round';c.lineJoin='round';c.beginPath();for(let i=0;i<N;i++){i?c.lineTo(X(pts[i]),Y(pts[i])):c.moveTo(X(pts[i]),Y(pts[i]));}c.stroke();
    c.lineWidth=p.lw*0.6;c.beginPath();c.arc(X(pts[0]),Y(pts[0]),p.lw*1.4,0,Math.PI*2);c.stroke();if(kk>=1){const e=pts[pts.length-1];c.beginPath();c.arc(X(e),Y(e),p.lw*1.5,0,Math.PI*2);c.fill();}break;}
  case 'panel':{const w=el.w,h=el.h,q=w/800,z=16*q;c.fillStyle=o.paper;c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,-h/2);c.lineTo(w/2,h/2-z);let x=w/2;let up=false;while(x>-w/2){x=Math.max(-w/2,x-z);c.lineTo(x,up?h/2-z:h/2);up=!up;}c.lineTo(-w/2,-h/2);c.closePath();c.fill();
    c.strokeStyle=o.paperInk;c.lineWidth=3*q;c.stroke();c.lineWidth=1.5*q;[-h/2+22*q,-h/2+30*q].forEach(yy=>{c.beginPath();c.moveTo(-w/2+24*q,yy);c.lineTo(w/2-24*q,yy);c.stroke();});break;}
  case 'rows':{const w=el.w;let y=-el.h/2+p.rh*0.55;const dash=yy=>{c.save();c.setLineDash([p.fs*0.3,p.fs*0.3]);c.lineWidth=Math.max(1,p.fs*0.06);c.beginPath();c.moveTo(-w/2,yy);c.lineTo(w/2,yy);c.stroke();c.restore();};
    dash(-el.h/2+2);c.textBaseline='middle';p.items.forEach((s,i)=>{const kk=cl((lt-i*0.1)/0.3);c.globalAlpha=ga*kk;c.textAlign='left';c.font=`400 ${p.fs}px ${SF.mono}`;c.fillText(s.label.toUpperCase(),-w/2,y);c.textAlign='right';c.font=`700 ${p.fs}px ${SF.mono}`;c.fillText(`${s.val}${s.unit?' '+s.unit:''}`,w/2,y);y+=p.rh;});
    c.globalAlpha=ga;dash(el.h/2-p.rh*0.2);c.textAlign='center';break;}
  case 'barcode':{const w=el.w,h=el.h*0.72;let x=-w/2,i=0;while(x<w/2){const bw=(1+Math.floor(rnd(p.seed*13+i)*4))*w/180;if(i%2===0)c.fillRect(x,-el.h/2,Math.min(bw,w/2-x),h);x+=bw;i++;}c.font=`400 ${el.h*0.18}px ${SF.mono}`;c.textBaseline='alphabetic';spaced(c,'0042 7026 2410',0,el.h/2-2,el.h*0.06);break;}
  }}
export function renderScene(c,W,H,els,o,t,selId,k){k=k||1;c.setTransform(k,0,0,k,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,W,H);const u=Math.min(W,H)/1080;
  const bgc=bgColor(o.bg);if(bgc){c.fillStyle=bgc;c.fillRect(0,0,W,H);}
  if(o.bg==='anim'){c.save();c.translate(W/2,H*0.42);c.rotate(t*0.08);c.fillStyle=o.ink;c.globalAlpha=0.07;const L=Math.max(W,H)*1.2;for(let i=0;i<24;i++){c.rotate(Math.PI*2/24);c.beginPath();c.moveTo(0,0);c.lineTo(-46*u,-L);c.lineTo(46*u,-L);c.closePath();c.fill();}c.restore();c.globalAlpha=1;}
  els.forEach((el,i)=>{const st=0.15+i*0.16,kk=Math.max(0,Math.min(1,(t-st)/0.45));if(kk<=0)return;const e=1-Math.pow(1-kk,3);c.save();c.translate(el.x+(el.dx||0),el.y+(el.dy||0)+(1-e)*24*u);const s=el.s||1;c.scale(s,s);c.textAlign='center';drawEl(c,el,o,t-st,e);c.restore();});
  c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=0.13;c.fillStyle=c.createPattern(grain(),'repeat');c.fillRect(0,0,W,H);c.restore();
  if(selId){const e=els.find(x=>x.id===selId);if(e){const s=e.s||1,cx=e.x+(e.dx||0),cy=e.y+(e.dy||0),hw=e.w*s/2,hh=e.h*s/2;c.save();c.globalAlpha=1;c.setLineDash([14*u,10*u]);c.lineWidth=4*u;c.strokeStyle='#2EB8FF';c.strokeRect(cx-hw,cy-hh,hw*2,hh*2);c.setLineDash([]);c.fillStyle='#FFFFFF';
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{c.beginPath();c.arc(cx+a*hw,cy+b*hh,15*u,0,Math.PI*2);c.fill();c.stroke();});c.restore();}}}
export function sceneBlob(W,H,els,o){const cv=document.createElement('canvas');cv.width=W;cv.height=H;renderScene(cv.getContext('2d'),W,H,els,o,99,null,1);return new Promise(r=>cv.toBlob(r,'image/png'));}
export async function sceneVideo(W,H,els,o){if(!window.MediaRecorder)return null;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
  const prefs=o.bg!=='none'?['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm']:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
  const type=prefs.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t));if(!type||!cv.captureStream)return null;
  const rec=new MediaRecorder(cv.captureStream(30),{mimeType:type,videoBitsPerSecond:8e6});const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const done=new Promise(r=>{rec.onstop=r;});renderScene(ctx,W,H,els,o,0,null,1);rec.start();const t0=performance.now();
  await new Promise(res=>{const loop=()=>{const t=(performance.now()-t0)/1000;renderScene(ctx,W,H,els,o,t,null,1);if(t<5.4)requestAnimationFrame(loop);else res();};requestAnimationFrame(loop);});
  rec.stop();await done;const base=type.split(';')[0];return{blob:new Blob(chunks,{type:base}),ext:base.includes('mp4')?'mp4':'webm',type:base};}
