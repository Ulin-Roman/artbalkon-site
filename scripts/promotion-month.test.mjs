import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionMonth} from '../public/promotion-month.mjs';

test('promotion month changes at Moscow midnight, while UTC is still in October',()=>{
 assert.deepEqual(promotionMonth(new Date('2026-10-31T20:59:59.999Z')),{month:'октября',millisecondsUntilMidnight:1});
 assert.deepEqual(promotionMonth(new Date('2026-10-31T21:00:00.000Z')),{month:'ноября',millisecondsUntilMidnight:86400000});
});

test('the November and year-end transitions use the new month at Moscow midnight',()=>{
 for(const [instant,before,after] of [
  ['2026-11-30T21:00:00.000Z','ноября','декабря'],
  ['2026-12-31T21:00:00.000Z','декабря','января']
 ]){
  const midnight=new Date(instant);
  assert.equal(promotionMonth(new Date(midnight.getTime()-1)).month,before);
  assert.deepEqual(promotionMonth(midnight),{month:after,millisecondsUntilMidnight:86400000});
 }
});

test('February boundaries include leap day before the March promotion starts',()=>{
 assert.equal(promotionMonth(new Date('2028-02-28T21:00:00.000Z')).month,'февраля');
 assert.equal(promotionMonth(new Date('2028-02-29T20:59:59.999Z')).month,'февраля');
 assert.equal(promotionMonth(new Date('2028-02-29T21:00:00.000Z')).month,'марта');
 assert.equal(promotionMonth(new Date('2027-02-28T21:00:00.000Z')).month,'марта');
});

test('all month names use the genitive case required by the promotion wording',()=>{
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 for(let month=0;month<months.length;month++)assert.equal(promotionMonth(new Date(Date.UTC(2026,month,15,9))).month,months[month]);
});

test('the next refresh is the exact next Moscow midnight, independent of the input offset',()=>{
 const date=new Date('2026-11-01T00:20:00.125+03:00');
 assert.equal(promotionMonth(date).millisecondsUntilMidnight,85200000-125);
 assert.deepEqual(promotionMonth(new Date('2026-10-31T14:20:00.125-07:00')),promotionMonth(date));
 assert.equal(date.toISOString(),'2026-10-31T21:20:00.125Z','The helper must not mutate its input');
});
