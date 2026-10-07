// Preserve the supplied closed gift and its existing projection without a 3D engine.
export function mountGifts(){
 for(const host of document.querySelectorAll('.gift-badge-icon')){
  try{mountGift(host);}catch{host.dataset.giftRenderer='fallback';}
 }
}
function mountGift(host){
 const image=host.querySelector('img');if(!image)return;
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)return;
 const ratio=Math.min(devicePixelRatio,2),size=180;
 canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);canvas.className='gift-3d-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 // Match the previous plane, camera distance and 32-degree field of view exactly.
 const pixelsPerUnit=size/(2*4.2*Math.tan(16*Math.PI/180)),imageSize=2.1*pixelsPerUnit;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let visible=false,frame=0,timer=0,last=0,ready=false,disposed=false;
 const epoch=performance.now(),poses=[[0,0,0],[.038,.007,.02],[-.035,-.005,-.018],[.025,.008,.012],[-.022,0,-.013]];
 const paint=pose=>{context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,size,size);context.translate(size/2+pose[0]*pixelsPerUnit,size/2-pose[1]*pixelsPerUnit);context.rotate(-pose[2]);context.drawImage(image,-imageSize/2,-imageSize/2,imageSize,imageSize);};
 const stop=()=>{cancelAnimationFrame(frame);clearTimeout(timer);frame=timer=0;};
 const draw=ms=>{frame=0;if(disposed||!ready||document.hidden||!visible)return;
  const cycle=(ms-epoch)%2600;
  if(reduced.matches||cycle>=600){paint(poses[0]);if(!reduced.matches)timer=setTimeout(()=>{timer=0;start();},2600-cycle);return;}
  if(ms-last>=32){last=ms;const amount=Math.max(0,Math.min(1,cycle/60,(600-cycle)/80));paint(poses[Math.floor(cycle/35)%poses.length].map(value=>value*amount));}
  frame=requestAnimationFrame(draw);
 };
 const start=()=>{if(!disposed&&ready&&!frame&&!timer&&!document.hidden&&visible)frame=requestAnimationFrame(draw);};
 const loaded=()=>{if(disposed||!image.naturalWidth)return;ready=true;paint(poses[0]);host.dataset.giftRenderer='canvas';start();};
 if(image.complete)loaded();else image.addEventListener('load',loaded,{once:true});
 host.gift3d={open:()=>Promise.resolve()};
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();},{rootMargin:'80px'});observer.observe(host);
 const visibilityChanged=()=>{stop();start();};const motionChanged=()=>{stop();if(ready)paint(poses[0]);start();};
 document.addEventListener('visibilitychange',visibilityChanged);reduced.addEventListener('change',motionChanged);
 // A restored back/forward-cache page must resume the same renderer.
 const pageHidden=event=>{stop();if(event.persisted)return;disposed=true;observer.disconnect();image.removeEventListener('load',loaded);document.removeEventListener('visibilitychange',visibilityChanged);reduced.removeEventListener('change',motionChanged);window.removeEventListener('pageshow',visibilityChanged);};
 window.addEventListener('pagehide',pageHidden);window.addEventListener('pageshow',visibilityChanged);
}
