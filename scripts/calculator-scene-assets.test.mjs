import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalculatorScene} from '../public/calculator-scene.mjs';
import {createCalculatorSceneLoader} from '../public/calculator-scene-loader.mjs';

function sceneEnvironment(){
 const originals=new Map(['Image','document','requestAnimationFrame'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const images=[],frames=[];
 let paints=0;
 const context=main=>new Proxy({}, {get(target,key){
  if(key in target)return target[key];
  if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
  if(key==='clearRect')return ()=>{if(main)paints++;};
  return ()=>{};
 }});
 const fallback={hidden:false,src:'https://example.test/site/base-photo.webp'};
 const canvas={hidden:true,width:1020,height:1440,getContext:()=>context(true)};
 const root={querySelector:selector=>selector==='[data-calc-canvas]'?canvas:selector==='[data-calc-fallback]'?fallback:null};
 globalThis.Image=class {
  constructor(){this.width=1024;this.height=1536;images.push(this);}
  set src(value){this.url=value;}
  get src(){return this.url;}
 };
 globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return {width:0,height:0,getContext:()=>context(false)};}};
 globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
 return {root,fallback,canvas,images,frames,paints:()=>paints,restore(){for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}};
}

test('a real scene image failure keeps the fallback and retries all assets with the latest selection',async()=>{
 const env=sceneEnvironment();
 try{
  let loads=0,ready=0;
  const applied=[];
  const loader=createCalculatorSceneLoader({load:async()=>{
   loads++;
   const render=await createCalculatorScene(env.root,new URL('https://example.test/site/'));
   return state=>{applied.push(state);render(state);};
  },onReady:()=>ready++});
  const initial={length:200,width:70,insulation:'no'};
  const latest={length:300,width:120,insulation:'no'};
  loader.render(initial);
  const first=loader.start();
  await Promise.resolve();
  assert.equal(env.images.length,3);
  assert.equal(ready,0);
  assert.equal(env.frames.length,0);
  assert.equal(env.images[0].src,env.fallback.src,'base still follows the configured fallback photo');
  env.images[1].onerror(new Error('Temporary material atlas failure'));
  assert.equal(await first,false);
  assert.equal(ready,0);
  assert.equal(env.canvas.hidden,true);
  assert.equal(env.fallback.hidden,false);
  assert.deepEqual(applied,[]);

  const retry=loader.start();
  assert.equal(loader.start(),retry,'concurrent retry interactions share initialization');
  await Promise.resolve();
  assert.equal(env.images.length,6,'retry creates a fresh set of image requests');
  loader.render(latest);
  env.images[3].onload();
  env.images[4].onload();
  await Promise.resolve();
  assert.equal(ready,0,'all three images must load before the scene is ready');
  assert.equal(env.fallback.hidden,false);
  assert.equal(env.frames.length,0);
  env.images[5].onload();
  assert.equal(await retry,true);
  assert.equal(ready,1);
  assert.deepEqual(applied,[latest]);
  assert.equal(env.frames.length,1);
  assert.equal(env.fallback.hidden,false,'the photo remains until the first complete drawing');
  env.frames.shift()();
  assert.ok(env.paints()>0,'the real scene paints after the retry succeeds');
  assert.equal(env.canvas.hidden,false);
  assert.equal(env.fallback.hidden,true);
  assert.equal(await loader.start(),true);
  assert.equal(loads,2,'a ready renderer does not reload its assets');
 }finally{env.restore();}
});
