import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function mountGifts(){
 for(const host of document.querySelectorAll('.gift-badge-icon')){
  try{mountGift(host);}catch{host.dataset.giftRenderer='fallback';}
 }
}
function mountGift(host){
 const scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(180,180,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const canvas=renderer.domElement;canvas.className='gift-3d-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 const camera=new THREE.PerspectiveCamera(35,1,.1,30);camera.position.set(2.6,2.0,3.3);camera.lookAt(0,1.04,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0xd8a46c,.9));
 const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(512,512);scene.add(key);
 const fill=new THREE.DirectionalLight(0xffd0a0,.65);fill.position.set(4,2,-2);scene.add(fill);
 const paper=new THREE.MeshStandardMaterial({color:0xfafafa,roughness:.42});
 const orange=new THREE.MeshPhysicalMaterial({color:0xe8b24e,roughness:.22,metalness:.42,clearcoat:.7,clearcoatRoughness:.2,side:THREE.DoubleSide});
 const inner=new THREE.MeshStandardMaterial({color:0xb48650,roughness:.8});
 const gift=new THREE.Group();scene.add(gift);
 const base=new THREE.Group();gift.add(base);
 const mesh=(w,h,d,mat,parent,x=0,y=0,z=0,r=.025)=>{const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,r),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 // Four real walls, floor and an open cavity beneath the independent lid.
 mesh(1.2,.08,1.2,inner,base,0,.05,0);
 mesh(1.2,1.18,.07,paper,base,0,.65,.565);mesh(1.2,1.18,.07,paper,base,0,.65,-.565);
 mesh(.07,1.18,1.06,paper,base,.565,.65,0);mesh(.07,1.18,1.06,paper,base,-.565,.65,0);
 mesh(.29,1.18,.013,orange,base,0,.65,.608,.006);mesh(.29,1.18,.013,orange,base,0,.65,-.608,.006);
 mesh(.013,1.18,.29,orange,base,.608,.65,0,.006);mesh(.013,1.18,.29,orange,base,-.608,.65,0,.006);
 const lid=new THREE.Group();gift.add(lid);lid.position.y=1.29;
 mesh(1.29,.18,1.29,paper,lid,0,0,0,.035);
 mesh(.29,.195,1.3,orange,lid,0,.01,0,.01);mesh(1.3,.195,.29,orange,lid,0,.013,0,.01);
 // Satin strips follow three-dimensional curves, with broad highlights on the folds.
 function ribbon(points,width){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),positions=[],uvs=[],indices=[];
  for(let i=0;i<=48;i++){const t=i/48,p=curve.getPoint(t),tangent=curve.getTangent(t);const side=new THREE.Vector3(0,0,1).cross(tangent).normalize();if(side.lengthSq()<.01)side.set(1,0,0);const taper=width*(.8+.2*Math.sin(Math.PI*t));for(const s of [-1,1]){const v=p.clone().addScaledVector(side,s*taper/2);positions.push(v.x,v.y,v.z);uvs.push((s+1)/2,t);}if(i<48){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,orange);m.castShadow=true;lid.add(m);
 }
 ribbon([[0,.15,0],[-.28,.61,-.03],[-.61,.78,.02],[-.76,.48,.14],[-.5,.22,.19],[-.18,.2,.07],[0,.16,0]],.3);
 ribbon([[0,.16,0],[.28,.64,-.04],[.61,.77,.02],[.76,.46,.14],[.48,.2,.2],[.18,.21,.07],[0,.16,0]],.3);
 ribbon([[-.03,.17,.03],[-.25,.19,.2],[-.36,.06,.43],[-.4,-.1,.58]],.29);
 ribbon([[.03,.17,.02],[.26,.19,.18],[.38,.05,.38],[.43,-.09,.58]],.29);
 mesh(.24,.2,.22,orange,lid,0,.21,.04,.07);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let visible=true,frame=0,last=0,flying=0,resolveFlight=null;
 const draw=ms=>{frame=0;if(document.hidden||!visible)return;if(ms-last<32&&!flying){frame=requestAnimationFrame(draw);return;}last=ms;const t=ms/1000;
  if(reduced.matches&&!flying){gift.rotation.set(-.08,-.15,-.28);gift.position.set(0,0,0);lid.position.set(0,1.29,0);lid.rotation.set(0,0,0);}
  else{gift.position.x=.017*Math.sin(t*41)+.009*Math.sin(t*63);gift.position.y=.012*Math.abs(Math.sin(t*37));gift.rotation.set(-.08+.016*Math.sin(t*33),-.15+.08*Math.sin(t*7)+.02*Math.sin(t*47),-.28+.025*Math.sin(t*39));const jump=Math.pow(Math.max(0,Math.sin(t*9)),5);lid.position.set(.01*Math.sin(t*43),1.29+.055*jump,0);lid.rotation.set(.02*jump,0,.035*Math.sin(t*39));}
  if(flying){const p=Math.min(1,(ms-flying)/650);lid.position.set(p*.8,1.29+p*2.9,p*-.7);lid.rotation.set(p*-1.8,p*.8,p*.7);if(p>=1){flying=0;resolveFlight?.();resolveFlight=null;}}
  renderer.render(scene,camera);if(!reduced.matches||flying)frame=requestAnimationFrame(draw);
 };
 const start=()=>{if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(draw);};
 host.gift3d={open:()=>{if(reduced.matches)return Promise.resolve();return new Promise(resolve=>{resolveFlight=resolve;flying=performance.now();start();});}};
 const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)start();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'80px'});observer.observe(host);
 document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
 renderer.render(scene,camera);host.dataset.giftRenderer='webgl';start();
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();});paper.dispose();orange.dispose();inner.dispose();floor.material.dispose();env.dispose();renderer.dispose();},{once:true});
}
