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
 const {code}=await transform(root.toString(),{loader:'css',minify:true,target:['chrome100','firefox100','safari15.4']});
 return {code,removed};
}

// Deferred slides keep a valid placeholder in src; optimize their actual image.
export function imageSource(tag){return tag.match(/\sdata-src="([^"]+)"/)?.[1]||tag.match(/\ssrc="([^"]+)"/)?.[1];}
