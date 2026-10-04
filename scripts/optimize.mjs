import {transform} from 'esbuild';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
export async function optimizeCss(css, sourceText){
 const words=new Set(sourceText.match(/[A-Za-z_][A-Za-z0-9_-]*/g)||[]),root=postcss.parse(css),removed=[];
 root.walkRules(rule=>{
  const ast=selectorParser().astSync(rule.selector);
  for(const selector of [...ast.nodes]){
   let unused=false;selector.walkClasses(node=>{let parent=node.parent;while(parent){if(parent.type==='pseudo')return;parent=parent.parent;}if(!words.has(node.value))unused=true;});
   if(unused){removed.push(selector.toString());selector.remove();}
  }
  if(!ast.nodes.length)rule.remove();else rule.selector=ast.toString();
 });
 const {code}=await transform(root.toString(),{loader:'css',minify:true,target:'es2020'});
 return {code,removed};
}
export async function optimizeJs(source){return (await transform(source,{loader:'js',minify:true,target:'es2020'})).code;}
