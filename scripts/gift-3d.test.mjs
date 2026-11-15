import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../src/gift-3d.mjs',import.meta.url),'utf8');

function giftVisit(epoch){
 const frames=new Map(),draws=[],transforms=[];let nextFrame=0,intersect;
 const image={complete:true,naturalWidth:180,removeEventListener(){}};
 const host={dataset:{},querySelector:()=>image,append(){}};
 const context=Object.fromEntries(['setTransform','clearRect','translate','rotate'].map(name=>[name,(...values)=>transforms.push(values)]));
 context.drawImage=(image,...values)=>{assert.ok(values.every(Number.isFinite));draws.push(image);};
 const document={hidden:false,querySelectorAll:()=>[host],createElement:()=>({getContext:()=>context,setAttribute(){}}),addEventListener(){},removeEventListener(){}};
 const window={addEventListener(){},removeEventListener(){}};
 runInNewContext(source.replace('export function mountGifts','function mountGifts')+'\nmountGifts();',{
  document,window,devicePixelRatio:1,performance:{now:()=>epoch},
  matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
  IntersectionObserver:class {constructor(callback){intersect=callback;}observe(){}disconnect(){}},
  requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},
  cancelAnimationFrame:id=>frames.delete(id),setTimeout(){throw Error('Unexpected idle phase');},clearTimeout(){}
 });
 return {host,image,draws,transforms,frames,
  show(){intersect([{isIntersecting:true}]);},
  frame(timestamp){assert.equal(frames.size,1);const [id,callback]=frames.entries().next().value;frames.delete(id);callback(timestamp);}
 };
}

// A rAF timestamp identifies the start of its frame and can precede a mount in that frame.
for(const [name,firstFrame] of [['before mount',995],['at mount',1000],['after mount',1005]]){
 test(`gift paints and keeps animating when the first frame is ${name}`,()=>{
  const visit=giftVisit(1000);
  assert.equal(visit.host.dataset.giftRenderer,'canvas');
  assert.equal(visit.draws.length,1);
  visit.show();
  assert.doesNotThrow(()=>visit.frame(firstFrame));
  assert.equal(visit.draws.length,2);
  assert.equal(visit.frames.size,1,'A first frame must not stop the animation');
  visit.frame(firstFrame+40);
  assert.equal(visit.draws.length,3);
  assert.equal(visit.frames.size,1);
  assert.ok(visit.draws.every(image=>image===visit.image));
  assert.ok(visit.transforms.flat().every(Number.isFinite),'Canvas transforms must stay finite');
 });
}
