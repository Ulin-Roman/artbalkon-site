export function hydrateVideo(video){
 let changed=false;
 if(video.dataset.src){video.src=video.dataset.src;delete video.dataset.src;changed=true;}
 for(const source of video.querySelectorAll('source[data-src]')){
  source.src=source.dataset.src;delete source.dataset.src;changed=true;
 }
 if(changed)video.load();
 return changed;
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
