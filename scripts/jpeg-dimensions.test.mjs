import test from 'node:test';
import assert from 'node:assert/strict';
import {jpegDimensions} from './jpeg-dimensions.mjs';

const frame=(marker=0xc0,width=1900,height=1412)=>Buffer.from([
 0xff,0xd8,0xff,marker,0,17,8,height>>8,height&255,width>>8,width&255,
 3,1,0x11,0,2,0x11,1,3,0x11,1
]);

test('JPEG dimensions support baseline and progressive frame headers',()=>{
 for(const marker of [0xc0,0xc2])assert.deepEqual(jpegDimensions(frame(marker)),{width:1900,height:1412});
});

test('JPEG dimensions skip metadata even when it contains marker-looking bytes',()=>{
 const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe1,0,6,0xff,0xc0,0xff,0xff]),frame().subarray(2)]);
 assert.deepEqual(jpegDimensions(jpeg),{width:1900,height:1412});
});

test('JPEG dimensions reject invalid or truncated headers and segment lengths',()=>{
 for(const bytes of [Buffer.from('not a JPEG'),frame().subarray(0,10),Buffer.from([0xff,0xd8,0xff,0xe0,0,1]),frame(0xc0,0)]){
  assert.throws(()=>jpegDimensions(bytes),/JPEG/);
 }
});

test('JPEG dimensions do not read markers from compressed scan data',()=>{
 const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xda,0,2]),frame().subarray(2)]);
 assert.throws(()=>jpegDimensions(jpeg),/Missing JPEG frame header/);
});
