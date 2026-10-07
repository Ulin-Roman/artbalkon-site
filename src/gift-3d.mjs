import * as THREE from 'three';

// Preserve the supplied artwork as a single closed gift throughout the loop.
export function mountGifts(){
 for(const host of document.querySelectorAll('.gift-badge-icon')){
  try{mountGift(host);}catch{host.dataset.giftRenderer='fallback';}
 }
}
function mountGift(host){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(180,180,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const canvas=renderer.domElement;canvas.className='gift-3d-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,20);camera.position.z=4.2;
 const texture=new THREE.TextureLoader().load(host.querySelector('img').src,()=>{renderer.render(scene,camera);host.dataset.giftRenderer='webgl';start();});texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
 // Keep the supplied photographic gift intact, including its closed lid.
 const gift=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),material);scene.add(gift);
 const upright=0;
 gift.rotation.z=upright;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let visible=true,frame=0,last=0;
 const epoch=performance.now();
 const draw=ms=>{frame=0;if(document.hidden||!visible)return;if(ms-last<32){frame=requestAnimationFrame(draw);return;}last=ms;
  // A short rigid shake, then exactly two seconds in the resting pose.
  const cycle=(ms-epoch)%2600;
  const amount=!reduced.matches&&cycle<600?Math.max(0,Math.min(1,cycle/60,(600-cycle)/80)):0;
  const poses=[[0,0,0],[.038,.007,.02],[-.035,-.005,-.018],[.025,.008,.012],[-.022,0,-.013]];
  const pose=poses[Math.floor(cycle/35)%poses.length];
  gift.position.set(pose[0]*amount,pose[1]*amount,0);
  gift.rotation.set(0,0,upright+pose[2]*amount);
  renderer.render(scene,camera);if(!reduced.matches)frame=requestAnimationFrame(draw);
 };
 const start=()=>{if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(draw);};
 host.gift3d={open:()=>Promise.resolve()};
 const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)start();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'80px'});observer.observe(host);
 document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();});material.dispose();texture.dispose();renderer.dispose();},{once:true});
}
