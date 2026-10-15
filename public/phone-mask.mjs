export const PHONE_MASK='+7 (___) ___-__-__';
const slots=[4,5,6,9,10,11,13,14,16,17];
const slotIndex=position=>slots.filter(slot=>slot<position).length;
const caretAt=index=>slots[Math.max(0,Math.min(10,index))]??PHONE_MASK.length;

export function phoneNationalDigits(value){
 const text=String(value??'');let digits=text.replace(/\D/g,'');
 if(/^\s*\+7/.test(text))digits=digits.slice(1);
 // Also recover a full phone inserted after the field's fixed country prefix.
 if(digits.length===11&&/^[78]/.test(digits))digits=digits.slice(1);
 return digits.slice(0,10);
}

export function formatPhone(value){
 const digits=phoneNationalDigits(value);let index=0;
 return PHONE_MASK.replace(/_/g,()=>digits[index++]||'_');
}

export function phoneIsValid(value){
 const digits=phoneNationalDigits(value);
 return /^\d{10}$/.test(digits)&&!(/^(\d)\1{9}$/.test(digits));
}

// Editing counts phone digits rather than punctuation, keeping the caret near the edit.
export function editPhoneValue(value,{start=PHONE_MASK.length,end=start,inputType='insertText',data=''}={}){
 let digits=phoneNationalDigits(value),from=Math.min(slotIndex(start),digits.length),to=Math.min(slotIndex(end),digits.length);
 if(inputType.startsWith('delete')){
  if(from===to){if(inputType==='deleteContentBackward')from=Math.max(0,from-1);else if(inputType==='deleteContentForward')to=Math.min(digits.length,to+1);}
  digits=digits.slice(0,from)+digits.slice(to);
  return {value:formatPhone(digits),caret:caretAt(from)};
 }
 const raw=String(data??''),incoming=raw.replace(/\D/g,'');
 if(!incoming)return {value:formatPhone(digits),caret:caretAt(from)};
 // Pasting or autofilling a complete phone always replaces the whole number.
 if(incoming.length===10||(incoming.length===11&&/^[78]/.test(incoming))){
  return {value:formatPhone(raw),caret:PHONE_MASK.length};
 }
 if(digits.length===10&&from===to)to=Math.min(10,from+incoming.length);
 digits=(digits.slice(0,from)+incoming+digits.slice(to)).slice(0,10);
 return {value:formatPhone(digits),caret:caretAt(Math.min(10,from+incoming.length))};
}

export function mountPhoneMask(input){
 if(input.dataset.phoneMaskReady)return;
 input.dataset.phoneMaskReady='true';
 const setCaret=position=>input.setSelectionRange(position,position);
 const normalize=()=>{
  const raw=input.value,position=input.selectionStart??raw.length,digits=phoneNationalDigits(raw);
  const prefixDigits=raw.replace(/\D/g,'').length-digits.length;
  const before=Math.max(0,raw.slice(0,position).replace(/\D/g,'').length-prefixDigits);
  input.value=formatPhone(raw);input.setCustomValidity('');
  if(input.ownerDocument.activeElement===input)setCaret(caretAt(Math.min(before,digits.length)));
 };
 const apply=(inputType,data)=>{
  const result=editPhoneValue(input.value,{start:input.selectionStart??0,end:input.selectionEnd??0,inputType,data});
  input.value=result.value;setCaret(result.caret);input.setCustomValidity('');
  input.dispatchEvent(new Event('input',{bubbles:true}));
 };
 input.value=formatPhone(input.value);
 input.addEventListener('focus',()=>setCaret(caretAt(phoneNationalDigits(input.value).length)));
 input.addEventListener('click',()=>{
  const end=caretAt(phoneNationalDigits(input.value).length);
  if(input.selectionStart===input.selectionEnd&&(input.selectionStart<slots[0]||input.selectionStart>end))setCaret(end);
 });
 input.addEventListener('beforeinput',event=>{
  if(event.isComposing||!event.cancelable)return;
  const type=event.inputType||'';
  const deletion=type==='deleteContentBackward'||type==='deleteContentForward'||(type.startsWith('delete')&&input.selectionStart!==input.selectionEnd);
  if(deletion||(type.startsWith('insert')&&event.data!==null&&event.data!==undefined)){
   event.preventDefault();apply(type,event.data);
  }
 });
 input.addEventListener('paste',event=>{
  if(!event.clipboardData)return;
  event.preventDefault();apply('insertFromPaste',event.clipboardData.getData('text'));
 });
 input.addEventListener('input',normalize);
 input.addEventListener('change',normalize);
 input.form?.addEventListener('reset',()=>queueMicrotask(()=>{input.value=formatPhone(input.value);input.setCustomValidity('');}));
}
