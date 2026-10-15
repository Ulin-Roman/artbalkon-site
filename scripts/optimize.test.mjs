import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizeCss,imageSource} from './optimize.mjs';
test('removes dead selectors while retaining rendered and JS state classes',async()=>{
 const {code,removed}=await optimizeCss('.card,.obsolete{color:red}.card.is-open{display:grid}', '<div class="card"></div> classList.add("is-open")');
 assert.ok(code.includes('.card'));assert.ok(code.includes('.is-open'));assert.ok(!code.includes('obsolete'));assert.deepEqual(removed,['.obsolete']);
});
test('keeps functional pseudo-class selectors whose absent class matters',async()=>{
 const {code}=await optimizeCss('.card:not(.disabled){display:grid}.card:has(.indicator){color:red}', '<div class="card"></div>');
 assert.ok(code.includes(':not(.disabled)'));assert.ok(code.includes(':has(.indicator)'));
});

test('optimizes the actual deferred image when src is a placeholder',()=>{
 const placeholder='data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E',photo='/assets/slide.webp';
 assert.equal(imageSource('<img src="'+placeholder+'" data-src="'+photo+'" alt="Фото">'),photo);
 assert.equal(imageSource('<img data-src="'+photo+'" src="'+placeholder+'" alt="Фото">'),photo);
});
test('matches complete image source attributes and keeps regular images',()=>{
 assert.equal(imageSource('<img data-backup-src="/wrong.webp" srcset="/other.webp 320w" src="/assets/photo.webp">'),'/assets/photo.webp');
 assert.equal(imageSource('<img data-old-src="/wrong.webp" alt="Фото">'),undefined);
});
