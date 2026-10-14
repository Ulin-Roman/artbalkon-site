const STORAGE_KEY='artbalkon.retention-popup.v1';
const TRIGGERS=new Set(['exit-intent','scroll-end','time-on-site']);

function savedState(storage){
 try{const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'{}');return saved&&typeof saved==='object'?saved:{};}catch{return {};}
}
const elapsedValue=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;

// A visit is scoped to this tab. Visible time survives same-origin navigation;
// hidden tabs and the back/forward cache do not contribute to the minute.
export function createRetentionController({storage,memory={},now=Date.now,visible=()=>true,blocked=()=>false,onShow,initialSubmitted=false,minute=60000,quietPeriod=5000}={}){
 const saved=savedState(storage);
 const state={elapsed:Math.min(minute,Math.max(elapsedValue(saved.elapsed),elapsedValue(memory.elapsed))),shown:saved.shown===true||memory.shown===true,submitted:initialSubmitted||saved.submitted===true||memory.submitted===true};
 let previousTime=now(),wasVisible=visible(),wasBlocked=blocked(),paused=false;
 let quietUntil=wasBlocked||state.elapsed>=minute?previousTime+quietPeriod:previousTime,lastSaved='';
 const persist=()=>{Object.assign(memory,state);const serialized=JSON.stringify(state);if(serialized===lastSaved)return;try{storage?.setItem(STORAGE_KEY,serialized);lastSaved=serialized;}catch{}};
 const consumed=()=>state.shown||state.submitted;
 const refresh=()=>{
  const time=now();
  if(!paused&&wasVisible)state.elapsed=Math.min(minute,state.elapsed+Math.max(0,time-previousTime));
  previousTime=time;wasVisible=!paused&&visible();
  const currentBlocked=blocked();
  if(currentBlocked||wasBlocked)quietUntil=time+quietPeriod;
  wasBlocked=currentBlocked;
  persist();return time;
 };
 const show=(reason,time)=>{
  if(!TRIGGERS.has(reason)||consumed()||paused||!wasVisible||wasBlocked||time<quietUntil)return false;
  // Reserve before opening: showModal can synchronously cause focus events.
  state.shown=true;persist();
  try{if(onShow?.(reason)===false){state.shown=false;persist();return false;}}catch{state.shown=false;persist();return false;}
  return true;
 };
 const controller={
  sync(){const time=refresh();return state.elapsed>=minute&&show('time-on-site',time);},
  request(reason){return show(reason,refresh());},
  defer(){const time=refresh();quietUntil=Math.max(quietUntil,time+quietPeriod);},
  leadSucceeded(){refresh();state.submitted=true;persist();},
  pause(){refresh();paused=true;wasVisible=false;},
  resume(){previousTime=now();paused=false;wasVisible=visible();return controller.sync();},
  consumed,
  snapshot(){return {...state};}
 };
 persist();return controller;
}

export function isExitIntent(event,{finePointer,mouseEntered}){
 return finePointer&&mouseEntered&&event.pointerType==='mouse'&&event.relatedTarget===null&&event.clientY<=5;
}

export function hasReachedBottom({scrollHeight,clientHeight,scrollY,previousScrollY,time,lastScrollIntent}){
 return scrollHeight>clientHeight+100&&scrollY>previousScrollY&&scrollHeight-clientHeight-scrollY<=16&&time-lastScrollIntent>=0&&time-lastScrollIntent<=2000;
}

export function mountRetentionPopup({dialog,openDialog,track=()=>{},initialSubmitted=false,document:doc=document,window:win=window}={}){
 if(!dialog)return null;
 const memory=win[Symbol.for(STORAGE_KEY)] ||= {};
 let storage;try{storage=win.sessionStorage;}catch{}
 let returnFocus=null,mouseEntered=false,lastScrollIntent=-Infinity,lastScrollY=win.scrollY,touchY=null,timer=0;
 const phone=dialog.querySelector('.retention-phone');
 const headerContact=doc.querySelector('.header-contact');
 const syncPhone=()=>{
  const headerPhone=headerContact?.querySelector('.phone');
  if(!phone||!headerPhone)return;
  const href=headerPhone.getAttribute('href'),number=headerPhone.textContent.trim();
  if(!/^tel:\+?[\d\s()-]+$/i.test(href||'')||number.replace(/\D/g,'').length<10)return;
  if(phone.getAttribute('href')!==href)phone.setAttribute('href',href);
  const label=phone.querySelector('[data-retention-phone-number]')||phone;
  if(label.textContent!==number)label.textContent=number;
 };
 const blocked=()=>!!doc.querySelector('dialog[open], [data-lead-form] [aria-busy="true"]')||doc.body.classList.contains('menu-open')||!!doc.querySelector('#mobile-menu:not([hidden])')||!!doc.activeElement?.closest('form');
 const stopIfConsumed=()=>{if(controller.consumed()&&timer){win.clearInterval(timer);timer=0;}};
 const controller=createRetentionController({storage,memory,visible:()=>!doc.hidden,blocked,initialSubmitted,onShow:reason=>{
  returnFocus=doc.activeElement;dialog.dataset.retentionTrigger=reason;
  const trigger=dialog.querySelector('input[name="trigger"]');if(trigger)trigger.value=reason;
  syncPhone();openDialog(dialog,dialog.querySelector('[data-retention-close]'));
  track('callback_popup_open',{trigger:reason});return dialog.open;
 }});
 const sync=()=>{controller.sync();stopIfConsumed();};
 const request=reason=>{controller.request(reason);stopIfConsumed();};
 const recordIntent=()=>{lastScrollIntent=Date.now();};
 const typingTarget=target=>!!target?.closest('input,textarea,select,[contenteditable="true"]');
 doc.addEventListener('pointermove',event=>{
  if(controller.consumed())return;
  if(event.pointerType==='mouse'&&event.clientY>24)mouseEntered=true;
  if(event.pointerType==='mouse'&&event.buttons===1&&event.clientX>=doc.documentElement.clientWidth-20)recordIntent();
 },{passive:true});
 doc.addEventListener('pointerout',event=>{
  if(isExitIntent(event,{finePointer:win.matchMedia('(hover: hover) and (pointer: fine)').matches,mouseEntered}))request('exit-intent');
 },{passive:true});
 doc.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.clientX>=doc.documentElement.clientWidth-20)recordIntent();},{passive:true});
 doc.addEventListener('wheel',event=>{if(event.deltaY>0)recordIntent();},{passive:true});
 doc.addEventListener('touchstart',event=>{touchY=event.touches[0]?.clientY??null;},{passive:true});
 doc.addEventListener('touchmove',event=>{const current=event.touches[0]?.clientY;if(current!==undefined&&touchY!==null&&current<touchY)recordIntent();touchY=current??null;},{passive:true});
 doc.addEventListener('touchend',()=>{touchY=null;},{passive:true});
 doc.addEventListener('keydown',event=>{if(!event.defaultPrevented&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&!typingTarget(event.target)&&['ArrowDown','PageDown','End',' '].includes(event.key))recordIntent();});
 win.addEventListener('scroll',()=>{
  const top=win.scrollY,root=doc.documentElement;
  if(hasReachedBottom({scrollHeight:root.scrollHeight,clientHeight:root.clientHeight,scrollY:top,previousScrollY:lastScrollY,time:Date.now(),lastScrollIntent}))request('scroll-end');
  lastScrollY=top;
 },{passive:true});
 doc.addEventListener('visibilitychange',sync);
 win.addEventListener('pagehide',()=>{controller.pause();if(timer){win.clearInterval(timer);timer=0;}});
 win.addEventListener('pageshow',()=>{controller.resume();if(!controller.consumed()&&!timer)timer=win.setInterval(sync,500);});
 doc.addEventListener('focusin',event=>{if(event.target.closest('form'))sync();});
 doc.addEventListener('focusout',event=>{if(event.target.closest('form')&&!event.relatedTarget?.closest('form'))win.setTimeout(()=>controller.defer(),0);});
 doc.addEventListener('close',event=>{if(event.target.tagName==='DIALOG'&&event.target!==dialog)controller.defer();},true);
 const interactionObserver=new win.MutationObserver(records=>{if(records.some(record=>record.target===doc.body||record.target.matches('dialog,#mobile-menu')))sync();});
 interactionObserver.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','class','hidden']});
 if(headerContact){const phoneObserver=new win.MutationObserver(syncPhone);phoneObserver.observe(headerContact,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href']});}
 dialog.querySelectorAll('[data-retention-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{if(returnFocus?.isConnected&&returnFocus!==doc.body)returnFocus.focus({preventScroll:true});returnFocus=null;});
 syncPhone();sync();if(!controller.consumed())timer=win.setInterval(sync,500);
 return {leadSucceeded(){controller.leadSucceeded();stopIfConsumed();}};
}
