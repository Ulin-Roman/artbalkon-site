import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CALCULATOR_RATES,calculateFinishingEstimate} from '../public/calculator-estimate.mjs';
import {prices,finishingWallRates} from '../src/content.mjs';

const reference=JSON.parse(await readFile(new URL('./fixtures/calculator-estimate-reference.json',import.meta.url),'utf8'));
const ownDefault={walls:'laminate',ceiling:'pvc',floor:'laminate',glazing:'warm',insulation:'yes'};
const userSelection={walls:'parquet',ceiling:'stretch',floor:'vinyl',exterior:'siding',glazing:'cold',insulation:'yes',lighting:'spots'};
const enabledState=(length,width,selected)=>({length:String(length),width:String(width),...selected,...Object.fromEntries(Object.keys(selected).map(key=>[key+'-enabled','on']))});

test('calculator tariffs are isolated from published service and finishing prices',()=>{
 assert.deepEqual(CALCULATOR_RATES,reference.rates);
 assert.deepEqual(Object.fromEntries(['cold','warm','panoramic','insulation','finishing','repair','turnkey'].map(key=>[key,prices[key]])),{cold:7000,warm:11000,panoramic:11500,insulation:700,finishing:1900,repair:null,turnkey:null});
 assert.deepEqual(finishingWallRates,{pvc:2500,laminate:3800,lining:4000,parquet:4000,wood:4500,lipa:6600});
 assert.ok(Object.isFrozen(CALCULATOR_RATES));
 for(const rates of Object.values(CALCULATOR_RATES))assert.ok(Object.isFrozen(rates));
});

for(const fixture of reference.fixtures){
 test('reference line prices match all materials at '+fixture.length+' × '+fixture.width+' cm',()=>{
  for(const [key,materials] of Object.entries(fixture.items)){
   for(const [selected,expected] of Object.entries(materials)){
    const result=calculateFinishingEstimate(enabledState(fixture.length,fixture.width,{[key]:selected}));
    assert.equal(result.valid,true,key+' '+selected);
    assert.equal(result.items.length,1,key+' '+selected);
    assert.equal(result.items[0].key,key);
    assert.equal(result.items[0].amount,expected,key+' '+selected);
    assert.equal(result.total,expected,key+' '+selected);
    assert.equal(result.items[0].rate,reference.rates[key][selected]);
    assert.equal(result.items[0].quantity,key==='lighting'?(selected==='pendant'?1:fixture.quantities.lighting):fixture.quantities[key]);
   }
  }
 });
 test('reference default and pictured complete totals match at '+fixture.length+' × '+fixture.width+' cm',()=>{
  const initial=calculateFinishingEstimate(enabledState(fixture.length,fixture.width,ownDefault));
  const pictured=calculateFinishingEstimate(enabledState(fixture.length,fixture.width,userSelection));
  assert.equal(initial.valid,true);assert.equal(initial.total,fixture.ownDefault);
  assert.equal(pictured.valid,true);assert.equal(pictured.total,fixture.userShot);
  assert.equal(pictured.items.length,7);
  for(const [key,quantity] of Object.entries(fixture.quantities))if(key!=='lighting')assert.equal(pictured.areas[key],quantity);
 });
}

test('additional live combinations reproduce observed totals including no insulation',()=>{
 assert.equal(calculateFinishingEstimate(enabledState(300,120,userSelection)).total,256554);
 assert.equal(calculateFinishingEstimate(enabledState(300,120,{...userSelection,exterior:'metal',lighting:'pendant'})).total,259214);
 const noInsulation=calculateFinishingEstimate(enabledState(300,120,{walls:'pvc',ceiling:'pvc',floor:'linoleum',exterior:'metal',glazing:'cold',insulation:'no',lighting:'pendant'}));
 assert.equal(noInsulation.valid,true);assert.equal(noInsulation.total,161701);
 assert.ok(!noInsulation.items.some(item=>item.key==='insulation'));
});

test('floating-point ceil is preserved rather than rounding the area first',()=>{
 const result=calculateFinishingEstimate(enabledState(300,70,{walls:'pvc',glazing:'cold'}));
 assert.equal(result.items.find(item=>item.key==='walls').amount,50541);
 assert.equal(result.items.find(item=>item.key==='glazing').amount,52801);
 assert.equal(result.total,103342);
});

test('disabled work and stale disabled material values contribute nothing',()=>{
 const selected=enabledState(200,70,userSelection),complete=calculateFinishingEstimate(selected);
 for(const key of Object.keys(userSelection)){
  const changed={...selected,[key]:'outdated'};delete changed[key+'-enabled'];
  const result=calculateFinishingEstimate(changed);
  assert.equal(result.valid,true,key);
  assert.equal(result.total,complete.total-complete.items.find(item=>item.key===key).amount,key);
  assert.ok(!result.items.some(item=>item.key===key));
 }
 const none=calculateFinishingEstimate({length:'200',width:'70',walls:'unknown',lighting:'unknown',insulation:'unknown'});
 assert.equal(none.valid,true);assert.equal(none.total,0);assert.deepEqual(none.items,[]);
});

test('invalid dimensions and unknown enabled materials return no partial estimate',()=>{
 for(const dimensions of [{length:99},{length:1201},{length:200.5},{width:49},{width:401},{width:70.5},{length:NaN},{length:Infinity},{length:''},{length:{}},{width:null}]){
  const result=calculateFinishingEstimate({...enabledState(200,70,userSelection),...dimensions});
  assert.equal(result.valid,false,JSON.stringify(dimensions));assert.equal(result.total,0);assert.deepEqual(result.items,[]);
 }
 for(const state of [null,undefined,[],{length:200,width:70,'walls-enabled':'on',walls:'unknown'},{length:200,width:70,'walls-enabled':'on',walls:'constructor'},{length:200,width:70,'walls-enabled':'on',walls:'__proto__'},{length:200,width:70,'lighting-enabled':'on'},{length:200,width:70,'insulation-enabled':'on',insulation:'unknown'}])assert.equal(calculateFinishingEstimate(state).valid,false);
 for(const [length,width] of [[100,50],[1200,400]])assert.equal(calculateFinishingEstimate({length,width}).valid,true);
});

test('lighting follows length for spots and stays fixed for pendant; quantities have explicit units',()=>{
 const spots=calculateFinishingEstimate(enabledState(200,70,{lighting:'spots'})).items[0];
 assert.equal(spots.amount,2267);assert.equal(spots.quantity,2/1.5);assert.equal(spots.unit,'участок 1,5 м');
 assert.equal(calculateFinishingEstimate(enabledState(200,400,{lighting:'spots'})).total,2267);
 for(const [length,width] of [[100,50],[1200,400]]){
  const pendant=calculateFinishingEstimate(enabledState(length,width,{lighting:'pendant'})).items[0];
  assert.equal(pendant.amount,4500);assert.equal(pendant.quantity,1);assert.equal(pendant.unit,'комплект');
 }
 assert.equal(calculateFinishingEstimate(enabledState(200,70,{exterior:'siding'})).items[0].unit,'пог. м');
 assert.equal(calculateFinishingEstimate(enabledState(200,70,{floor:'tile'})).items[0].unit,'м²');
});

test('the helper does not mutate caller state or retain mutable result objects',()=>{
 const state=Object.freeze(enabledState(200,70,userSelection)),snapshot={...state};
 const first=calculateFinishingEstimate(state);assert.deepEqual(state,snapshot);
 first.items[0].amount=0;first.areas.walls=0;
 const second=calculateFinishingEstimate(state);assert.equal(second.total,153189);assert.equal(second.items[0].amount,63956);assert.equal(second.areas.walls,10.84);
});
