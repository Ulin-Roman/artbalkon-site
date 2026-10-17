export function hydrateVideo(video){
 let changed=false;
 if(video.dataset.src){video.src=video.dataset.src;delete video.dataset.src;changed=true;}
 for(const source of video.querySelectorAll('source[data-src]')){
  source.src=source.dataset.src;delete source.dataset.src;changed=true;
 }
 if(changed)video.load();
 return changed;
}

// Choose the matching file before lazy loading; a later resize retains playback.
export function mountResponsiveVideo(video,{window:win=window}={}){
 const media=win.matchMedia('(max-width:640px)');
 const desktop={src:video.dataset.src||video.getAttribute('src'),poster:video.getAttribute('poster')};
 const mobile={src:video.dataset.mobileSrc,poster:video.dataset.mobilePoster};
 const preload=video.preload;
 let selected=null,pending=null;
 const restore=()=>{
  if(!pending)return;
  const state=pending;pending=null;
  if(state.time>0)video.currentTime=Number.isFinite(video.duration)?Math.min(state.time,video.duration):state.time;
  video.preload=preload;
  if(!state.paused)Promise.resolve(video.play()).catch(()=>{});
 };
 const select=()=>{
  const variant=media.matches?mobile:desktop;
  if(!variant.src||selected===variant.src)return;
  selected=variant.src;
  if(variant.poster)video.setAttribute('poster',variant.poster);
  if(video.dataset.src){video.dataset.src=variant.src;return;}
  pending=pending||{time:video.currentTime||0,paused:video.paused||video.ended};
  video.src=variant.src;
  video.preload='metadata';
  video.load();
 };
 media.addEventListener('change',select);
 video.addEventListener('loadedmetadata',restore);
 select();
 return {dispose(){media.removeEventListener('change',select);video.removeEventListener('loadedmetadata',restore);}};
}

// Keep timers and media dormant while their section or page is out of view.
// Persisted pagehide retains the observer and intent for a BFCache restoration.
export function mountVisibleActivity({element,start,stop,enabled=motion=>!motion.matches,onMotionChange=()=>{},reducedMotion,document:doc=document,window:win=window}){
 const motion=reducedMotion||win.matchMedia('(prefers-reduced-motion: reduce)');
 const observed=typeof win.IntersectionObserver==='function';
 let visible=!observed,away=false,active=null,disposed=false,observer=null;
 const sync=()=>{
  if(disposed)return;
  const next=!away&&!doc.hidden&&visible&&enabled(motion);
  if(next){active=true;start();}
  else{const previous=active;active=false;if(previous!==false)stop();}
 };
 const changedMotion=()=>{onMotionChange(motion);sync();};
 const pageHidden=event=>{away=true;sync();if(!event.persisted)dispose();};
 const pageShown=()=>{away=false;sync();};
 const dispose=()=>{
  if(disposed)return;
  disposed=true;observer?.disconnect();
  doc.removeEventListener('visibilitychange',sync);
  motion.removeEventListener('change',changedMotion);
  win.removeEventListener('pagehide',pageHidden);win.removeEventListener('pageshow',pageShown);
  if(active)stop();active=false;
 };
 doc.addEventListener('visibilitychange',sync);
 motion.addEventListener('change',changedMotion);
 win.addEventListener('pagehide',pageHidden);win.addEventListener('pageshow',pageShown);
 if(observed){
  observer=new win.IntersectionObserver(entries=>{for(const entry of entries)if(entry.target===element)visible=entry.isIntersecting;sync();});
  observer.observe(element);
 }
 sync();
 return {sync,isActive:()=>active===true&&!disposed,dispose};
}

export function mountAmbientVideo(video,{control=video.closest('.home-advantages-photo')?.querySelector('[data-ambient-video-toggle]'),hydrate=hydrateVideo,reducedMotion,document:doc=document,window:win=window}={}){
 let userPaused=!video.autoplay,manualPlayback=false,activity;
 // Attribute autoplay would start playback during the earlier lazy hydration,
 // before the video itself enters the viewport. This controller owns that intent.
 video.removeAttribute('autoplay');
 const syncControl=()=>{
  if(!control)return;
  const paused=video.paused;
  control.classList.toggle('is-paused',paused);
  control.setAttribute('aria-label',paused?'Воспроизвести видео':'Приостановить видео');
  const icon=control.querySelector('span');if(icon)icon.textContent=paused?'▶':'Ⅱ';
 };
 const start=()=>{
  hydrate(video);if(!video.paused)return;
  try{Promise.resolve(video.play()).then(()=>{if(!activity?.isActive())video.pause();}).catch(()=>{});}catch{}
 };
 activity=mountVisibleActivity({element:video,start,stop:()=>video.pause(),enabled:motion=>!userPaused&&(!motion.matches||manualPlayback),onMotionChange:()=>{manualPlayback=false;},reducedMotion,document:doc,window:win});
 video.addEventListener('play',syncControl);video.addEventListener('pause',syncControl);
 control?.addEventListener('click',()=>{
  if(video.paused){userPaused=false;manualPlayback=true;}
  else{userPaused=true;manualPlayback=false;}
  activity.sync();
 });
 syncControl();
 return activity;
}
