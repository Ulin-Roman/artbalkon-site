import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalculatorSceneLoader} from '../public/calculator-scene-loader.mjs';

test('drawing stays unloaded until requested and concurrent starts share one download',async()=>{
 let loads=0,finish;
 const states=[],ready=[];
 const scene=createCalculatorSceneLoader({load:()=>{loads++;return new Promise(resolve=>{finish=resolve;});},onReady:()=>ready.push(true)});
 scene.render({floor:'laminate'});
 assert.equal(loads,0);
 const first=scene.start(),second=scene.start();
 assert.equal(first,second);
 await Promise.resolve();
 assert.equal(loads,1);
 scene.render({floor:'tile'});
 scene.render({floor:'vinyl'});
 finish(state=>states.push(state));
 assert.equal(await first,true);
 assert.deepEqual(states,[{floor:'vinyl'}]);
 assert.equal(ready.length,1);
 scene.render({floor:'lining'});
 assert.deepEqual(states,[{floor:'vinyl'},{floor:'lining'}]);
 assert.equal(await scene.start(),true);
 assert.equal(loads,1);
});

test('a failed download preserves the latest selection and allows a fresh retry',async()=>{
 const attempts=[],states=[];
 let ready=0;
 const scene=createCalculatorSceneLoader({load:async attempt=>{
  attempts.push(attempt);
  if(attempt===0)throw new Error('Offline');
  return state=>states.push(state);
 },onReady:()=>{ready++;}});
 scene.render({width:100});
 assert.equal(await scene.start(),false);
 assert.equal(ready,0);
 assert.deepEqual(states,[]);
 scene.render({width:120});
 assert.equal(await scene.start(),true);
 assert.deepEqual(attempts,[0,1]);
 assert.deepEqual(states,[{width:120}]);
 assert.equal(ready,1);
});

test('an unavailable drawing renderer does not prevent a later valid initialization',async()=>{
 let loads=0;
 const states=[];
 const scene=createCalculatorSceneLoader({load:async()=>++loads===1?null:state=>states.push(state)});
 scene.render({glazing:'warm'});
 assert.equal(await scene.start(),false);
 assert.equal(await scene.start(),true);
 assert.deepEqual(states,[{glazing:'warm'}]);
});
