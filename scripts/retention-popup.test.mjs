import test from 'node:test';
import assert from 'node:assert/strict';
import {createRetentionController,isExitIntent,hasReachedScrollDepth,mountRetentionPopup} from '../public/retention-popup.mjs';

function visit({storage=new Map(),memory={},initialTime=0,initialVisible=true,initialBlocked=false,initialSubmitted=false,onShow}={}){
 let time=initialTime,visible=initialVisible,blocked=initialBlocked;
 const shown=[];
 const persistence={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
 const controller=createRetentionController({storage:persistence,memory,now:()=>time,visible:()=>visible,blocked:()=>blocked,initialSubmitted,onShow:reason=>{shown.push(reason);return onShow?.(reason);}});
 return {controller,shown,storage,memory,advance(ms){time+=ms;return controller.sync();},visible(value){visible=value;controller.sync();},blocked(value){blocked=value;controller.sync();},time:()=>time};
}

test('thirty seconds means foreground time and carries over to the next page in this tab',()=>{
 const first=visit();
 first.advance(20000);first.visible(false);first.advance(180000);first.visible(true);first.advance(5000);
 assert.equal(first.controller.snapshot().elapsed,25000);assert.deepEqual(first.shown,[]);
 first.controller.pause();
 const next=visit({storage:first.storage,initialTime:first.time()});
 next.advance(4999);assert.deepEqual(next.shown,[]);
 next.advance(1);assert.deepEqual(next.shown,['time-on-site']);
 next.advance(120000);next.controller.request('exit-intent');assert.equal(next.shown.length,1);
});

test('the default timer opens at 30,000 milliseconds and never at 29,999',()=>{
 const session=visit();
 session.advance(29999);assert.equal(session.controller.snapshot().elapsed,29999);assert.deepEqual(session.shown,[]);
 session.advance(1);assert.equal(session.controller.snapshot().elapsed,30000);assert.deepEqual(session.shown,['time-on-site']);
});

test('opening, dismissing and navigating cannot show a second popup during the visit',()=>{
 const first=visit();
 assert.equal(first.controller.request('scroll-end'),true);
 assert.equal(first.controller.request('exit-intent'),false);
 const next=visit({storage:first.storage});
 next.advance(60000);assert.equal(next.controller.request('scroll-end'),false);assert.deepEqual(next.shown,[]);
});

test('an active dialog/menu/form defers the timer and leaves five quiet seconds after it closes',()=>{
 const session=visit();
 session.advance(25000);session.blocked(true);session.advance(10000);
 assert.equal(session.controller.request('exit-intent'),false);assert.equal(session.controller.request('scroll-end'),false);
 assert.deepEqual(session.shown,[]);
 session.blocked(false);session.advance(4999);assert.deepEqual(session.shown,[]);
 session.advance(1);assert.deepEqual(session.shown,['time-on-site']);
});

test('a short interaction observed between timer polls also gets a quiet period',()=>{
 const session=visit();session.advance(29000);session.controller.defer();
 session.advance(1000);assert.deepEqual(session.shown,[]);
 session.advance(4000);assert.deepEqual(session.shown,['time-on-site']);
});

test('successful submission in any form suppresses all triggers across navigation',()=>{
 const first=visit();first.advance(15000);first.controller.leadSucceeded();first.advance(60000);
 assert.equal(first.controller.request('exit-intent'),false);assert.deepEqual(first.shown,[]);
 const next=visit({storage:first.storage});next.advance(60000);assert.equal(next.controller.request('scroll-end'),false);assert.deepEqual(next.shown,[]);
 const alreadySubmitted=visit({initialSubmitted:true});alreadySubmitted.advance(60000);assert.deepEqual(alreadySubmitted.shown,[]);
});

test('restoring from the back/forward cache does not count time spent off the page',()=>{
 const session=visit();session.advance(20000);session.controller.pause();session.advance(300000);session.controller.resume();
 assert.equal(session.controller.snapshot().elapsed,20000);assert.deepEqual(session.shown,[]);
 session.advance(9999);assert.deepEqual(session.shown,[]);
 session.advance(1);assert.deepEqual(session.shown,['time-on-site']);
});

test('unavailable storage still remembers consumption within this document',()=>{
 const memory={},storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 let count=0;
 const first=createRetentionController({storage,memory,onShow:()=>{count++;}});
 assert.equal(first.request('exit-intent'),true);
 const second=createRetentionController({storage,memory,onShow:()=>{count++;}});
 assert.equal(second.request('scroll-end'),false);assert.equal(count,1);
});

test('a failed dialog open does not consume the only opportunity',()=>{
 let ready=false,count=0;
 const controller=createRetentionController({onShow:()=>{count++;return ready;}});
 assert.equal(controller.request('exit-intent'),false);assert.equal(controller.snapshot().shown,false);
 ready=true;assert.equal(controller.request('scroll-end'),true);assert.equal(count,2);
});

test('exit intent requires a mouse that entered the page and left through its top edge',()=>{
 const mouse={pointerType:'mouse',relatedTarget:null,clientY:0},context={finePointer:true,mouseEntered:true};
 assert.equal(isExitIntent(mouse,context),true);
 for(const event of [{...mouse,pointerType:'touch'},{...mouse,clientY:600},{...mouse,relatedTarget:{}}])assert.equal(isExitIntent(event,context),false);
 assert.equal(isExitIntent(mouse,{...context,mouseEntered:false}),false);
 assert.equal(isExitIntent(mouse,{...context,finePointer:false}),false);
});

test('scroll depth is 70% of the scrollable distance, not of the entire document',()=>{
 const position={scrollHeight:3000,clientHeight:800,scrollY:1540,previousScrollY:1400,time:10000,lastScrollIntent:9500};
 assert.equal(hasReachedScrollDepth(position),true);
 assert.equal(hasReachedScrollDepth({...position,scrollY:1539.99}),false);
 assert.equal(hasReachedScrollDepth({...position,scrollY:1800}),true);
 assert.equal(hasReachedScrollDepth({...position,scrollY:2200}),true);
 // Another viewport changes the scrollable range and therefore the boundary.
 assert.equal(hasReachedScrollDepth({...position,clientHeight:1000,scrollY:1399.99,previousScrollY:1300}),false);
 assert.equal(hasReachedScrollDepth({...position,clientHeight:1000,scrollY:1400,previousScrollY:1300}),true);
});

test('70% scroll trigger requires fresh downward user input and an actual downward scroll',()=>{
 const position={scrollHeight:3000,clientHeight:800,scrollY:1540,previousScrollY:1400,time:10000,lastScrollIntent:9500};
 for(const changed of [{lastScrollIntent:-Infinity},{lastScrollIntent:7999},{lastScrollIntent:10001},{previousScrollY:1540},{previousScrollY:1800},{scrollHeight:800,scrollY:0,previousScrollY:0},{scrollHeight:850,scrollY:50,previousScrollY:0}])assert.equal(hasReachedScrollDepth({...position,...changed}),false);
 assert.equal(hasReachedScrollDepth({...position,lastScrollIntent:8000}),true);
});

function mountedScrollVisit(){
 const handlers=new Map();
 const listen=(object,name,handler)=>{let events=handlers.get(object);if(!events){events=new Map();handlers.set(object,events);}const list=events.get(name)||[];list.push(handler);events.set(name,list);};
 const emit=(object,name,event={})=>handlers.get(object)?.get(name)?.forEach(handler=>handler(event));
 const trigger={value:''},closeButton={},opens=[],tracked=[];
 const dialog={dataset:{},open:false,querySelector(selector){return selector==='input[name="trigger"]'?trigger:selector==='[data-retention-close]'?closeButton:null;},querySelectorAll(){return [];},addEventListener(name,handler){listen(this,name,handler);}};
 const body={classList:{contains(){return false;}},closest(){return null;}};
 const doc={body,activeElement:body,hidden:false,documentElement:{clientWidth:1280,clientHeight:800,scrollHeight:3000},querySelector(selector){return selector==='dialog[open], [data-lead-form] [aria-busy="true"]'&&dialog.open?dialog:null;},addEventListener(name,handler){listen(this,name,handler);}};
 const storage=new Map();
 const win={sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},scrollY:0,matchMedia(){return {matches:true};},setInterval(){return 1;},clearInterval(){},addEventListener(name,handler){listen(this,name,handler);},MutationObserver:class{observe(){}}};
 mountRetentionPopup({dialog,document:doc,window:win,openDialog:(element,focus)=>{opens.push({element,focus});element.open=true;},track:(name,payload)=>tracked.push({name,payload})});
 return {dialog,closeButton,trigger,opens,tracked,body,wheel(deltaY){emit(doc,'wheel',{deltaY});},touchStart(clientY){emit(doc,'touchstart',{touches:[{clientY}]});},touchMove(clientY){emit(doc,'touchmove',{touches:[{clientY}]});},key(key){emit(doc,'keydown',{key,target:body});},scroll(scrollY){win.scrollY=scrollY;emit(win,'scroll');}};
}

test('mounted popup opens at 70% after a downward wheel scroll and keeps the existing analytics reason',()=>{
 const page=mountedScrollVisit();
 page.wheel(100);page.scroll(1539);assert.deepEqual(page.opens,[]);
 page.wheel(100);page.scroll(1540);
 assert.deepEqual(page.opens,[{element:page.dialog,focus:page.closeButton}]);assert.equal(page.trigger.value,'scroll-end');
 assert.deepEqual(page.tracked,[{name:'callback_popup_open',payload:{trigger:'scroll-end'}}]);
 page.wheel(100);page.scroll(1800);assert.equal(page.opens.length,1);
});

test('restored or programmatic scroll positions and upward wheel input do not open the popup',()=>{
 const page=mountedScrollVisit();
 page.scroll(1800);assert.deepEqual(page.opens,[]);
 page.wheel(-100);page.scroll(1900);assert.deepEqual(page.opens,[]);
 page.wheel(100);page.scroll(1800);assert.deepEqual(page.opens,[]);
 page.wheel(100);page.scroll(1900);assert.equal(page.opens.length,1);
});

test('mobile touch scrolling and keyboard scrolling can reach the 70% trigger',()=>{
 const touchPage=mountedScrollVisit();touchPage.touchStart(600);touchPage.touchMove(700);touchPage.scroll(1540);assert.deepEqual(touchPage.opens,[]);
 touchPage.touchMove(500);touchPage.scroll(1600);assert.equal(touchPage.opens.length,1);
 const keyboardPage=mountedScrollVisit();keyboardPage.key('End');keyboardPage.scroll(1540);assert.equal(keyboardPage.opens.length,1);
});

test('mounted popup follows Callibri replacement of the whole header phone before and after opening',()=>{
 const handlers=new Map(),observations=[];
 const listen=(object,name,handler)=>{let events=handlers.get(object);if(!events){events=new Map();handlers.set(object,events);}const list=events.get(name)||[];list.push(handler);events.set(name,list);};
 const emit=(object,name,event)=>handlers.get(object)?.get(name)?.forEach(handler=>handler(event));
 const phoneLink=(number,tel)=>({textContent:number,href:tel,getAttribute(){return this.href;},setAttribute(_name,value){this.href=value;},querySelector(){return null;}});
 const popupPhone=phoneLink('+7 (495) 165-39-05','tel:+74951653905');
 let currentHeaderPhone=phoneLink('+7 (495) 165-39-05','tel:+74951653905');
 const headerContact={querySelector(){return currentHeaderPhone;}};
 const closeButton={},trigger={value:''};
 const dialog={dataset:{},open:false,querySelector(selector){return selector==='.retention-phone'?popupPhone:selector==='[data-retention-close]'?closeButton:selector==='input[name="trigger"]'?trigger:null;},querySelectorAll(){return [];},addEventListener(name,handler){listen(this,name,handler);}};
 const body={classList:{contains(){return false;}},closest(){return null;}};
 const doc={body,activeElement:body,hidden:false,documentElement:{clientWidth:1280},querySelector(selector){return selector==='.header-contact'?headerContact:selector==='dialog[open], [data-lead-form] [aria-busy="true"]'&&dialog.open?dialog:null;},addEventListener(name,handler){listen(this,name,handler);}};
 const storage=new Map();
 const win={sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},scrollY:120,matchMedia(){return {matches:true};},setInterval(){return 1;},clearInterval(){},addEventListener(name,handler){listen(this,name,handler);},MutationObserver:class{constructor(callback){this.callback=callback;}observe(target){observations.push({target,callback:this.callback});}}};
 const opens=[];
 mountRetentionPopup({dialog,document:doc,window:win,openDialog:(element,focus)=>{opens.push({element,focus});element.open=true;}});
 const tracking=observations.find(observer=>observer.target===headerContact);
 assert.ok(tracking,'observe a stable container, not the phone anchor');
 currentHeaderPhone=phoneLink('+7 (495) 877-49-59','tel:+74958774959');tracking.callback([]);
 assert.equal(popupPhone.href,'tel:+74958774959');assert.equal(popupPhone.textContent,'+7 (495) 877-49-59');
 emit(doc,'pointermove',{pointerType:'mouse',clientY:100,buttons:0});
 emit(doc,'pointerout',{pointerType:'mouse',clientY:0,relatedTarget:null});
 assert.deepEqual(opens,[{element:dialog,focus:closeButton}]);assert.equal(trigger.value,'exit-intent');
 currentHeaderPhone=phoneLink('+7 (495) 111-22-33','tel:+74951112233');tracking.callback([]);
 assert.equal(popupPhone.href,'tel:+74951112233');assert.equal(popupPhone.textContent,'+7 (495) 111-22-33');
 emit(doc,'pointerout',{pointerType:'mouse',clientY:0,relatedTarget:null});assert.equal(opens.length,1);
});
