import test from 'node:test';
import assert from 'node:assert/strict';
import {heroImageSizes} from './hero-image-sizes.mjs';

// Evaluate the emitted CSS independently at recorded browser viewport dimensions.
function sourceWidth(sizes,width,height){
 const clauses=[];let depth=0,start=0;
 for(let i=0;i<sizes.length;i++){
  if(sizes[i]==='(')depth++;if(sizes[i]===')')depth--;
  if(sizes[i]===','&&!depth){clauses.push(sizes.slice(start,i).trim());start=i+1;}
 }
 clauses.push(sizes.slice(start).trim());
 for(const clause of clauses){
  const media=clause.match(/^\((max|min)-(width|height):([\d.]+)px\)\s+/);
  if(media){const actual=media[2]==='width'?width:height,limit=Number(media[3]);if(media[1]==='max'?actual>limit:actual<limit)continue;}
  const expression=(media?clause.slice(media[0].length):clause).replace(/([\d.]+)(px|vw|svh)/g,(_,n,unit)=>String(Number(n)*(unit==='vw'?width/100:unit==='svh'?height/100:1))).replace(/calc\(/g,'(').replace(/\b(max|min)\(/g,'Math.$1(');
  return Function('clamp',`return ${expression}`)((low,value,high)=>Math.max(low,Math.min(value,high)));
 }
 throw new Error('No matching sizes clause');
}

const fixtures=[
 {name:'home',ratio:784/1168,widths:[320,640,784],boxes:[[320,288,590],[375,343,620],[412,380,620],[640,600,620],[1280,552.59375,580]]},
 {name:'insulation',ratio:714/1280,insulation:true,widths:[320,640,714],boxes:[[320,288,360],[375,343,360],[412,380,370.796875],[640,600,420],[1280,552.59375,580]]},
 {name:'finishing',ratio:1086/1448,widths:[320,640,1086],boxes:[[320,288,590],[375,343,620],[412,380,620],[640,600,620],[1280,552.59375,580]]}
];

test('hero sizes require the encoded image aspect ratio',()=>{
 for(const value of [undefined,null,0,-1,NaN,Infinity,'0.75'])assert.throws(()=>heroImageSizes(value),TypeError);
});

test('hero cover sources accommodate recorded live geometry at DPR 1 and 2',()=>{
 for(const fixture of fixtures){
  const sizes=heroImageSizes(fixture.ratio,{insulation:fixture.insulation});
  for(const [viewport,boxWidth,boxHeight] of fixture.boxes)for(const dpr of [1,2]){
   const advertised=sourceWidth(sizes,viewport,viewport===1280?900:812)*dpr;
   const required=Math.max(boxWidth,boxHeight*fixture.ratio)*dpr;
   assert.ok(advertised>=required-1,`${fixture.name} ${viewport}px @${dpr}: ${advertised} < cover ${required}`);
   const selected=fixture.widths.find(width=>width>=advertised)||fixture.widths.at(-1);
   assert.ok(selected>=Math.min(required,fixture.widths.at(-1))-1,`${fixture.name} must use an available adequate source`);
  }
 }
});

test('1280px desktop avoids the former 700px source overestimate',()=>{
 for(const fixture of fixtures){
  const width=sourceWidth(heroImageSizes(fixture.ratio,{insulation:fixture.insulation}),1280,900);
  assert.ok(width>=552&&width<=554,`${fixture.name}: source width ${width}`);
  assert.equal(fixture.widths.find(candidate=>candidate>=width),640);
 }
});

test('320px cover requests the existing full source where 640px is too small',()=>{
 for(const fixture of fixtures.filter(x=>x.name!=='insulation')){
  const width=sourceWidth(heroImageSizes(fixture.ratio),320,812)*2;
  assert.ok(width>640);
  assert.equal(fixture.widths.find(candidate=>candidate>=width)||fixture.widths.at(-1),fixture.widths.at(-1));
 }
});

test('insulation keeps its separate compact mobile photograph',()=>{
 const sizes=heroImageSizes(4/3,{insulation:true});
 assert.equal(sourceWidth(sizes,320,812),480);
 assert.ok(Math.abs(sourceWidth(sizes,412,812)-494.4)<1);
 assert.equal(sourceWidth(sizes,640,812),600);
});

test('other routes preserve their existing desktop hints while fixing mobile cover',()=>{
 for(const ratio of [714/1280,784/1168,3/4,4/3]){
  const scoped=heroImageSizes(ratio,{preserveDesktop:true}),measured=heroImageSizes(ratio);
  for(const width of [320,375,412,640])assert.equal(sourceWidth(scoped,width,812),sourceWidth(measured,width,812));
  for(const width of [641,768,900,1100])assert.equal(sourceWidth(scoped,width,900),width/2);
  for(const width of [1101,1280,1920])assert.equal(sourceWidth(scoped,width,900),700);
 }
});
