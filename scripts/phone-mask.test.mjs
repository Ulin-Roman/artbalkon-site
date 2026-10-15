import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_MASK,phoneNationalDigits,formatPhone,phoneIsValid,editPhoneValue,mountPhoneMask} from '../public/phone-mask.mjs';

const full='+7 (999) 123-45-67';
const slots=[4,5,6,9,10,11,13,14,16,17];
const inputEvent=(type,properties={})=>Object.assign(new Event(type,{bubbles:true,cancelable:true}),properties);

class FakeInput extends EventTarget{
 constructor(value='+7 '){
  super();this.dataset={};this.ownerDocument={activeElement:null};this.form=new EventTarget();this.defaultValue=value;
  this.selectionStart=this.selectionEnd=0;this.value=value;this.validationMessage='';
 }
 get value(){return this.currentValue;}
 set value(value){this.currentValue=String(value);this.selectionStart=this.selectionEnd=this.currentValue.length;}
 setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
 setCustomValidity(message){this.validationMessage=message;}
 focus(){this.ownerDocument.activeElement=this;this.dispatchEvent(new Event('focus'));}
 beforeinput(data,inputType='insertText',properties={}){
  const event=inputEvent('beforeinput',{inputType,data,isComposing:false,...properties});this.dispatchEvent(event);return event;
 }
 paste(text){const event=inputEvent('paste',{clipboardData:{getData:type=>type==='text'?text:''}});this.dispatchEvent(event);return event;}
 async reset(){this.form.dispatchEvent(new Event('reset'));this.value=this.defaultValue;await Promise.resolve();}
}

test('empty, partial and full phones always display the complete mask',()=>{
 assert.equal(PHONE_MASK,'+7 (___) ___-__-__');
 for(const value of ['',null,undefined,'+7 ','+7 (___) ___-__-__'])assert.equal(formatPhone(value),PHONE_MASK);
 assert.equal(formatPhone('99912'),'+7 (999) 12_-__-__');
 assert.equal(formatPhone('9991234567'),full);
 assert.equal(formatPhone(full),full);
 assert.equal(formatPhone('89991234567'),full);
 assert.equal(formatPhone('+7 999 123 45 67'),full);
 assert.equal(formatPhone('+7 +7 (999) 123-45-67'),full);
 assert.equal(phoneNationalDigits(PHONE_MASK),'');
 assert.equal(phoneNationalDigits('79991234567'),'9991234567');
});

test('only a complete, non-repeated national number passes validation',()=>{
 for(const value of ['',PHONE_MASK,'+7 (999) 123-45-6_','999123456','+7 (000) 000-00-00','+7 (999) 999-99-99'])assert.equal(phoneIsValid(value),false,value);
 for(const value of [full,'89991234567','9991234567'])assert.equal(phoneIsValid(value),true,value);
});

test('typing ten digits advances the caret through punctuation',()=>{
 let value=PHONE_MASK,caret=4;
 for(const [index,digit] of [...'9991234567'].entries()){
  const edited=editPhoneValue(value,{start:caret,end:caret,data:digit});
  value=edited.value;caret=edited.caret;
  assert.equal(phoneNationalDigits(value),'9991234567'.slice(0,index+1));
  assert.equal(caret,slots[index+1]??18);
 }
 assert.equal(value,full);
 assert.deepEqual(editPhoneValue(PHONE_MASK,{start:4,data:'abc'}),{value:PHONE_MASK,caret:4});
});

test('a complete pasted number replaces the mask even after the fixed country prefix',()=>{
 for(const data of [full,'+7 999 123 45 67','79991234567','8 (999) 123-45-67','9991234567']){
  for(const [value,start,end] of [[PHONE_MASK,4,4],['+7 ',3,3],[full,0,18],[formatPhone('495'),9,9]]){
   assert.deepEqual(editPhoneValue(value,{start,end,inputType:'insertFromPaste',data}),{value:full,caret:18},data);
  }
 }
});

test('selection replacement and editing a full number keep untouched digits',()=>{
 assert.deepEqual(editPhoneValue(full,{start:9,end:12,data:'456'}),{value:'+7 (999) 456-45-67',caret:13});
 assert.deepEqual(editPhoneValue(full,{start:10,end:10,data:'8'}),{value:'+7 (999) 183-45-67',caret:11});
 assert.deepEqual(editPhoneValue(full,{start:9,end:12,inputType:'deleteContentBackward'}),{value:'+7 (999) 456-7_-__',caret:9});
 assert.deepEqual(editPhoneValue(full,{start:0,end:18,data:'49512'}),{value:'+7 (495) 12_-__-__',caret:11});
 assert.deepEqual(editPhoneValue(full,{start:0,end:18,inputType:'deleteContentBackward'}),{value:PHONE_MASK,caret:4});
});

test('Backspace and Delete cross brackets, spaces and dashes',()=>{
 for(const start of [7,8,9])assert.deepEqual(editPhoneValue(full,{start,inputType:'deleteContentBackward'}),{value:'+7 (991) 234-56-7_',caret:6});
 for(const start of [7,8,9])assert.deepEqual(editPhoneValue(full,{start,inputType:'deleteContentForward'}),{value:'+7 (999) 234-56-7_',caret:9});
 for(const [start,backward,backCaret,forward,forwardCaret] of [
  [13,'+7 (999) 124-56-7_',11,'+7 (999) 123-56-7_',13],
  [16,'+7 (999) 123-46-7_',14,'+7 (999) 123-45-7_',16],
 ]){
  assert.deepEqual(editPhoneValue(full,{start,inputType:'deleteContentBackward'}),{value:backward,caret:backCaret});
  assert.deepEqual(editPhoneValue(full,{start,inputType:'deleteContentForward'}),{value:forward,caret:forwardCaret});
 }
 assert.deepEqual(editPhoneValue(PHONE_MASK,{start:4,inputType:'deleteContentBackward'}),{value:PHONE_MASK,caret:4});
 assert.deepEqual(editPhoneValue(full,{start:18,inputType:'deleteContentForward'}),{value:full,caret:18});
});

test('mounted mask intercepts edits and emits input for the surrounding form',()=>{
 const input=new FakeInput();let changes=0;input.addEventListener('input',()=>changes++);
 mountPhoneMask(input);mountPhoneMask(input);
 assert.equal(input.value,PHONE_MASK);input.focus();assert.equal(input.selectionStart,4);
 input.setCustomValidity('Старое сообщение');
 for(const digit of '9991234567')assert.equal(input.beforeinput(digit).defaultPrevented,true);
 assert.equal(input.value,full);assert.equal(input.selectionStart,18);assert.equal(changes,10);assert.equal(input.validationMessage,'');
 input.setSelectionRange(9,12);input.beforeinput('456');assert.equal(input.value,'+7 (999) 456-45-67');assert.equal(input.selectionStart,13);
 input.setSelectionRange(0,18);input.beforeinput(null,'deleteContentBackward');assert.equal(input.value,PHONE_MASK);assert.equal(input.selectionStart,4);
 assert.equal(input.paste('+7 (999) 123-45-67').defaultPrevented,true);assert.equal(input.value,full);assert.equal(input.selectionStart,18);
 input.setSelectionRange(8,8);input.beforeinput(null,'deleteContentBackward');assert.equal(input.value,'+7 (991) 234-56-7_');assert.equal(input.selectionStart,6);
});

test('native input and change normalize autofill and preserve a middle caret',()=>{
 for(const eventType of ['input','change']){
  for(const raw of ['79991234567','89991234567','+7 (999) 123-45-67','+7 +7 (999) 123-45-67']){
   const input=new FakeInput();mountPhoneMask(input);input.focus();input.value=raw;input.setCustomValidity('Старое сообщение');input.dispatchEvent(new Event(eventType));
   assert.equal(input.value,full);assert.equal(input.selectionStart,18);assert.equal(input.validationMessage,'');
  }
 }
 const input=new FakeInput(full);mountPhoneMask(input);input.focus();input.setSelectionRange(10,10);input.dispatchEvent(new Event('input'));assert.equal(input.selectionStart,10);
 input.setSelectionRange(10,10);input.dispatchEvent(new Event('click'));assert.equal(input.selectionStart,10);
});

test('focus and clicks place the caret in an editable part of the mask',()=>{
 const input=new FakeInput('99912');mountPhoneMask(input);input.focus();assert.equal(input.selectionStart,11);
 for(const position of [0,18]){input.setSelectionRange(position,position);input.dispatchEvent(new Event('click'));assert.equal(input.selectionStart,11);}
 input.setSelectionRange(4,7);input.dispatchEvent(new Event('click'));assert.equal(input.selectionStart,4);assert.equal(input.selectionEnd,7);
});

test('reset restores an empty mask after the browser resets its value',async()=>{
 const input=new FakeInput();mountPhoneMask(input);input.focus();input.paste(full);input.setCustomValidity('Старое сообщение');
 await input.reset();assert.equal(input.value,PHONE_MASK);assert.equal(input.validationMessage,'');input.focus();assert.equal(input.selectionStart,4);
});

test('composition and non-cancelable input continue through native normalization',()=>{
 const input=new FakeInput();mountPhoneMask(input);input.focus();
 const composing=input.beforeinput('9','insertCompositionText',{isComposing:true});assert.equal(composing.defaultPrevented,false);assert.equal(input.value,PHONE_MASK);
 const native=new Event('beforeinput',{cancelable:false});Object.assign(native,{inputType:'insertText',data:'9'});input.dispatchEvent(native);assert.equal(native.defaultPrevented,false);assert.equal(input.value,PHONE_MASK);
 input.value='+7 9991234567';input.dispatchEvent(new Event('input'));assert.equal(input.value,full);
});

test('word deletion remains native and the resulting value is normalized',()=>{
 for(const type of ['deleteWordBackward','deleteWordForward','deleteSoftLineBackward']){
  const input=new FakeInput(full);mountPhoneMask(input);input.focus();
  assert.equal(input.beforeinput(null,type).defaultPrevented,false);
  input.value='+7 (999) 123-45-';input.dispatchEvent(new Event('input'));
  assert.equal(input.value,'+7 (999) 123-45-__');
  input.setSelectionRange(0,18);assert.equal(input.beforeinput(null,type).defaultPrevented,true);
  assert.equal(input.value,PHONE_MASK);
 }
});
