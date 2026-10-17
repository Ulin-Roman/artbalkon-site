// Retain the newest controls while the optional drawing module downloads.
// A failed attempt leaves the photograph and the immediate estimate usable.
export function createCalculatorSceneLoader({load,onReady=()=>{}}){
 let renderer=null,pending=null,selection=null,attempt=0;
 const render=state=>{selection=state;renderer?.(state);};
 const start=()=>{
  if(renderer)return Promise.resolve(true);
  if(pending)return pending;
  pending=Promise.resolve().then(()=>load(attempt++)).then(scene=>{
   if(typeof scene!=='function')throw new TypeError('Calculator scene renderer is unavailable');
   if(selection)scene(selection);
   renderer=scene;
   onReady();
   return true;
  }).catch(()=>false).finally(()=>{pending=null;});
  return pending;
 };
 return {render,start};
}
