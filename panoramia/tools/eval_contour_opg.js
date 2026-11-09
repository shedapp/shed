// Sanity statistics of the contour refinement on DentalOPG-1550 ground-truth boxes (no contour ground truth exists for these classes):
// share of boxes that receive a contour, polygon/box area ratio, and how edentulous gaps (Missing Teeth) vs broken-down roots separate.
const fs=require('fs'),path=require('path');const C=require('../src/69-contour.js');
const dir=process.argv[2]||'/home/claude/opendata/dentalopg',N=+process.argv[3]||150;
const man=JSON.parse(fs.readFileSync(path.join(dir,'full_manifest.json'),'utf8'));
const idx={};JSON.parse(fs.readFileSync(path.join(dir,'raw_index.json'),'utf8')).forEach(r=>idx[r.id]=r);
const st={};function S(k){return st[k]=st[k]||{n:0,ok:0,relab:0,ratio:[]};}
let imgs=0;
for(const e of man.images){const r=idx[e.id];if(!r)continue;if(imgs++>=N)break;
 const gray=fs.readFileSync(path.join(dir,'raw',e.id+'.gray')),W=r.width,H=r.height,s=r.scale,data=new Uint8ClampedArray(W*H*4);
 for(let i=0;i<gray.length;i++){data[i*4]=data[i*4+1]=data[i*4+2]=gray[i];data[i*4+3]=255;}
 const CM={'Caries':'DEN-CAR','Filling':'DEN-FIL','Cap':'DEN-CRN','Bridge':'DEN-BRG','Rootcanel':'DEN-RCT','apical abscss':'DEN-PAR','BDR':'DEN-ROOT','Missing Teeth':'DEN-MIS','Horizontal Impaction':'DEN-IMP','Distoangular impaction':'DEN-IMP','Unerupted Wisdom Teeth':'DEN-IMP'};
 const list=[];for(const x of (e.annotations||[])){if(!CM[x.cls])continue;list.push({code:CM[x.cls],kind:x.cls,box:{x:x.box[0]*s,y:x.box[1]*s,w:x.box[2]*s,h:x.box[3]*s}});}
 const P=C.prepare({width:W,height:H,data});
 for(const p of list){const rr=C.refineOne(P,p,[]);const k=p.kind;const q=S(k);q.n++;if(rr.ok){q.ok++;const a=C._polyArea(rr.points);q.ratio.push(a/(p.box.w*p.box.h));}if(rr.relabelled)q.relab++;}
}
for(const k in st){const q=st[k];q.ratio.sort((a,b)=>a-b);console.log(k.padEnd(24),'n',q.n,'contour',(100*q.ok/q.n).toFixed(0)+'%','relabelled→MIS',(100*q.relab/q.n).toFixed(0)+'%','areaRatio median',(q.ratio[Math.floor(q.ratio.length/2)]||0).toFixed(2));}
