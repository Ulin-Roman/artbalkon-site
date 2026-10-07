import * as THREE from 'three';

// Preserve the supplied artwork. Separate textured parts move in a 3D scene.
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
 const gift=new THREE.Group();scene.add(gift);const lid=new THREE.Group();gift.add(lid);
 // UVs use the original image coordinates. The split follows the angled lid seam.
 const seam=[[0,.69],[.33,.64],[.87,.36],[1,.32]];
 const shape=(points,parent)=>{const positions=[],uv=[],indices=[];for(const [x,y] of points){positions.push((x-.5)*2.1,(.5-y)*2.1,0);uv.push(x,1-y);}const vertices=points.map(([x,y])=>new THREE.Vector2(x,-y));for(const triangle of THREE.ShapeUtils.triangulateShape(vertices,[]))indices.push(...triangle);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();parent.add(new THREE.Mesh(geometry,material));};
 shape([[0,0],[1,0],...seam.slice().reverse()],lid);
 shape([...seam,[1,1],[0,1]],gift);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let visible=true,frame=0,last=0,flying=0,resolveFlight=null;
 const draw=ms=>{frame=0;if(document.hidden||!visible)return;if(ms-last<32&&!flying){frame=requestAnimationFrame(draw);return;}last=ms;const t=ms/1000;
  if(reduced.matches&&!flying){gift.rotation.set(0,0,0);gift.position.set(0,0,0);lid.position.set(0,0,0);lid.rotation.set(0,0,0);}
  else{const poses=[[0,0,0],[.007,.002,.006],[-.006,0,-.005],[.004,-.002,.003],[-.004,.002,-.004],[.002,0,.002]];const pose=poses[Math.floor(t*14)%poses.length];gift.position.set(pose[0],pose[1],0);gift.rotation.set(0,0,pose[2]);const knock=Math.floor(t*14)%9===0?.012:0;lid.position.set(0,knock,0);lid.rotation.set(0,0,0);}
  if(flying){const p=Math.min(1,(ms-flying)/200);lid.position.set(p*.8,p*2.3,p*.35);lid.rotation.set(p*-.8,p*.6,p*.65);if(p>=1){flying=0;resolveFlight?.();resolveFlight=null;}}
  renderer.render(scene,camera);if(!reduced.matches||flying)frame=requestAnimationFrame(draw);
 };
 const start=()=>{if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(draw);};
 host.gift3d={open:()=>{if(reduced.matches)return Promise.resolve();return new Promise(resolve=>{resolveFlight=resolve;flying=performance.now();start();});}};
 const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)start();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'80px'});observer.observe(host);
 document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();});material.dispose();texture.dispose();renderer.dispose();},{once:true});
}
