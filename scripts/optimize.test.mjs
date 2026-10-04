import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizeCss} from './optimize.mjs';
test('removes dead selectors while retaining rendered and JS state classes',async()=>{
 const {code,removed}=await optimizeCss('.card,.obsolete{color:red}.card.is-open{display:grid}', '<div class="card"></div> classList.add("is-open")');
 assert.ok(code.includes('.card'));assert.ok(code.includes('.is-open'));assert.ok(!code.includes('obsolete'));assert.deepEqual(removed,['.obsolete']);
});
test('keeps functional pseudo-class selectors whose absent class matters',async()=>{
 const {code}=await optimizeCss('.card:not(.disabled){display:grid}.card:has(.indicator){color:red}', '<div class="card"></div>');
 assert.ok(code.includes(':not(.disabled)'));assert.ok(code.includes(':has(.indicator)'));
});
