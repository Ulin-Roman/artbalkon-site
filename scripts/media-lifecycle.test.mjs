import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateVideo,mountResponsiveVideo,mountAmbientVideo,mountVisibleActivity} from '../public/media-lifecycle.mjs';

class Surface extends EventTarget {
 emit(type,properties={}){const event=new Event(type);Object.assign(event,properties);this.dispatchEvent(event);}
}
function environment({hidden=false,reduced=false,observer=true}={}){
 const doc=new Surface();doc.hidden=hidden;
 const win=new Surface(),motion=new Surface(),observers=[];
 motion.matches=reduced;win.matchMedia=()=>motion;
 if(observer)win.IntersectionObserver=class {
  constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}
  observe(element){this.element=element;}
  disconnect(){this.disconnected=true;}
  intersect(visible){this.callback([{target:this.element,isIntersecting:visible}]);}
 };
 return {doc,win,motion,observers,
  visible(value){observers[0].intersect(value);},
  hidden(value){doc.hidden=value;doc.emit('visibilitychange');},
  reduced(value){motion.matches=value;motion.emit('change');},
  leave(persisted=true){win.emit('pagehide',{persisted});},
  restore(){win.emit('pageshow',{persisted:true});}
 };
}
function ambient(options={}){
 const env=environment(options),video=new Surface(),control=new Surface(),icon={textContent:''};
 video.autoplay=true;video.paused=true;video.dataset={src:'/movie.mp4'};video.sources=[];video.loads=0;video.plays=0;
 video.querySelectorAll=()=>video.sources;
 video.removeAttribute=name=>{if(name==='autoplay')video.autoplay=false;};
 video.load=()=>{video.loads++;};
 video.play=()=>{video.plays++;video.paused=false;video.emit('play');return Promise.resolve();};
 video.pause=()=>{if(!video.paused){video.paused=true;video.emit('pause');}};
 control.classList={toggle(){}};control.labels={};control.setAttribute=(name,value)=>{control.labels[name]=value;};
 control.querySelector=()=>icon;
 const controller=mountAmbientVideo(video,{control,document:env.doc,window:env.win});
 return {...env,video,control,controller,icon};
}

test('lazy video source is hydrated once, including the legacy source form',()=>{
 const visit=ambient();
 assert.equal(visit.video.autoplay,false);
 assert.equal(visit.video.loads,0);
 visit.visible(true);
 assert.equal(visit.video.src,'/movie.mp4');assert.equal(visit.video.dataset.src,undefined);
 assert.equal(visit.video.loads,1);
 hydrateVideo(visit.video);assert.equal(visit.video.loads,1);
 const source={dataset:{src:'/legacy.mp4'}};
 const legacy={dataset:{},querySelectorAll:()=>source.dataset.src?[source]:[],load(){this.loads=(this.loads||0)+1;}};
 assert.equal(hydrateVideo(legacy),true);assert.equal(source.src,'/legacy.mp4');
 assert.equal(hydrateVideo(legacy),false);assert.equal(legacy.loads,1);
});

function responsiveVideo(mobile,{lazyPoster=true}={}){
 const media=new Surface();media.matches=mobile;
 const video=new Surface(),attributes=lazyPoster?{}:{poster:'/desktop.webp'};
 video.dataset={src:'/desktop.mp4',mobileSrc:'/portrait.mp4',mobilePoster:'/portrait.webp',...(lazyPoster?{poster:'/desktop.webp'}:{})};
 video.preload='none';video.currentTime=0;video.duration=60;video.paused=true;video.ended=false;video.loads=0;video.plays=0;
 video.getAttribute=name=>attributes[name]??null;
 video.setAttribute=(name,value)=>{attributes[name]=value;};
 video.querySelectorAll=()=>[];
 video.load=()=>{video.loads++;video.currentTime=0;video.paused=true;};
 video.play=()=>{video.plays++;video.paused=false;return Promise.resolve();};
 const controller=mountResponsiveVideo(video,{window:{matchMedia(query){assert.equal(query,'(max-width:640px)');return media;}}});
 return {video,attributes,controller,resize(value){media.matches=value;media.emit('change');},metadata(){video.emit('loadedmetadata');}};
}

test('responsive videos defer both posters and sources until their lazy hydration',()=>{
 for(const mobile of [false,true]){
  const visit=responsiveVideo(mobile),stem=mobile?'portrait':'desktop';
  assert.equal(visit.video.dataset.src,'/'+stem+'.mp4');assert.equal(visit.video.dataset.poster,'/'+stem+'.webp');
  assert.equal(visit.attributes.poster,undefined);
  assert.equal(visit.video.src,undefined);assert.equal(visit.video.loads,0);assert.equal(visit.video.preload,'none');
  visit.resize(!mobile);assert.equal(visit.video.loads,0);assert.equal(visit.attributes.poster,undefined);
  hydrateVideo(visit.video);assert.equal(visit.video.src,mobile?'/desktop.mp4':'/portrait.mp4');assert.equal(visit.video.loads,1);
  assert.equal(visit.attributes.poster,mobile?'/desktop.webp':'/portrait.webp');assert.equal(visit.video.dataset.poster,undefined);
  hydrateVideo(visit.video);assert.equal(visit.video.loads,1);
 }
});

test('responsive videos with an existing poster retain their immediate fallback',()=>{
 const visit=responsiveVideo(true,{lazyPoster:false});
 assert.equal(visit.attributes.poster,'/portrait.webp');assert.equal(visit.video.dataset.poster,undefined);
 assert.equal(visit.video.loads,0);visit.resize(false);assert.equal(visit.attributes.poster,'/desktop.webp');
});

test('responsive source changes restore the position without starting a paused video',()=>{
 const visit=responsiveVideo(true);hydrateVideo(visit.video);visit.video.currentTime=18;
 visit.resize(false);assert.equal(visit.video.src,'/desktop.mp4');assert.equal(visit.attributes.poster,'/desktop.webp');
 assert.equal(visit.video.preload,'metadata');visit.metadata();
 assert.equal(visit.video.currentTime,18);assert.equal(visit.video.paused,true);assert.equal(visit.video.plays,0);assert.equal(visit.video.preload,'none');
 visit.resize(false);assert.equal(visit.video.loads,2);
});

test('playing video survives rapid breakpoint changes at the same position',()=>{
 const visit=responsiveVideo(false);hydrateVideo(visit.video);visit.video.currentTime=27;visit.video.paused=false;
 visit.resize(true);visit.resize(false);visit.metadata();
 assert.equal(visit.video.src,'/desktop.mp4');assert.equal(visit.attributes.poster,'/desktop.webp');
 assert.equal(visit.video.currentTime,27);assert.equal(visit.video.paused,false);assert.equal(visit.video.plays,1);
 visit.controller.dispose();visit.resize(true);assert.equal(visit.video.src,'/desktop.mp4');
});

test('ambient playback pauses offscreen and in hidden tabs, then resumes the same video',()=>{
 const visit=ambient();
 assert.equal(visit.video.plays,0);
 visit.visible(true);assert.equal(visit.video.paused,false);
 visit.video.currentTime=12;
 visit.visible(false);assert.equal(visit.video.paused,true);
 visit.visible(true);assert.equal(visit.video.paused,false);assert.equal(visit.video.currentTime,12);
 visit.hidden(true);assert.equal(visit.video.paused,true);
 visit.hidden(false);assert.equal(visit.video.paused,false);assert.equal(visit.video.loads,1);
 assert.equal(visit.control.labels['aria-label'],'Приостановить видео');
});

test('manual pause survives viewport, tab and BFCache transitions',()=>{
 const visit=ambient();visit.visible(true);visit.control.emit('click');
 assert.equal(visit.video.paused,true);assert.equal(visit.icon.textContent,'▶');
 const plays=visit.video.plays;
 visit.visible(false);visit.visible(true);visit.hidden(true);visit.hidden(false);visit.leave();visit.restore();
 assert.equal(visit.video.paused,true);assert.equal(visit.video.plays,plays);
 visit.control.emit('click');assert.equal(visit.video.paused,false);
});

test('reduced motion suppresses autoplay but still permits explicit playback',()=>{
 const visit=ambient({reduced:true});visit.visible(true);
 assert.equal(visit.video.plays,0);assert.equal(visit.video.loads,0);
 visit.control.emit('click');assert.equal(visit.video.paused,false);
 visit.reduced(false);assert.equal(visit.video.paused,false);
 visit.reduced(true);assert.equal(visit.video.paused,true);
 visit.reduced(false);assert.equal(visit.video.paused,false);
 visit.control.emit('click');visit.reduced(true);visit.reduced(false);
 assert.equal(visit.video.paused,true);
});

test('late play completion cannot restart video after it leaves the viewport',async()=>{
 const visit=ambient();let finish;
 visit.video.play=()=>{visit.video.plays++;return new Promise(resolve=>{finish=()=>{visit.video.paused=false;resolve();};});};
 visit.visible(true);visit.visible(false);finish();
 await Promise.resolve();await Promise.resolve();
 assert.equal(visit.video.paused,true);
});

test('ambient video resumes after a persisted pagehide and disposes after real navigation',()=>{
 const visit=ambient();visit.visible(true);visit.leave();
 assert.equal(visit.video.paused,true);assert.equal(visit.observers[0].disconnected,false);
 visit.restore();assert.equal(visit.video.paused,false);
 visit.leave(false);assert.equal(visit.video.paused,true);assert.equal(visit.observers[0].disconnected,true);
 visit.restore();visit.visible(true);assert.equal(visit.video.paused,true);
});

test('visible activity owns one timer, preserves its index and stops across every suspension',()=>{
 const env=environment({hidden:true});let timer=null,index=0,started=0;
 const controller=mountVisibleActivity({element:{},document:env.doc,window:env.win,
  start(){if(!timer){started++;timer=()=>index++;}},stop(){timer=null;}});
 env.visible(true);assert.equal(timer,null);
 env.hidden(false);assert.equal(started,1);timer();assert.equal(index,1);
 controller.sync();env.restore();assert.equal(started,1);
 env.visible(false);assert.equal(timer,null);assert.equal(index,1);
 env.visible(true);assert.equal(started,2);timer();assert.equal(index,2);
 env.reduced(true);assert.equal(timer,null);
 env.reduced(false);assert.equal(started,3);assert.equal(index,2);
 env.leave();assert.equal(timer,null);
 env.restore();assert.equal(started,4);assert.equal(index,2);
 controller.dispose();assert.equal(timer,null);
 env.hidden(false);env.restore();assert.equal(started,4);
});

test('a browser without IntersectionObserver still follows tab and motion lifecycle',()=>{
 const visit=ambient({observer:false});assert.equal(visit.video.paused,false);
 visit.hidden(true);assert.equal(visit.video.paused,true);
 visit.hidden(false);assert.equal(visit.video.paused,false);
 visit.reduced(true);assert.equal(visit.video.paused,true);
});
