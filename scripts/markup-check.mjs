import assert from 'node:assert/strict';

const voidElements=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const dimensionElements=new Set(['img','iframe','video']);
const attributes=value=>{
 const result=new Map();
 for(const match of value.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)){
  result.set(match[1].toLowerCase(),match[2]??match[3]??match[4]??null);
 }
 return result;
};

// Check media that must be valid in the delivered HTML, before lazy hydration.
// This intentionally does not replace a complete HTML parser or validator.
export function checkMarkup(html,label='HTML'){
 const errors=[],stack=[];
 const markup=html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 for(const [,closing,rawName,rawAttributes] of markup.matchAll(/<(\/?)([a-z][a-z\d:-]*)(?=\s|\/?>)((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)){
  const name=rawName.toLowerCase();
  if(closing){const index=stack.lastIndexOf(name);if(index>=0)stack.length=index;continue;}
  const attrs=attributes(rawAttributes),context=name+(attrs.get('id')?'#'+attrs.get('id'):''),hasValue=key=>Boolean(attrs.get(key)?.trim());
  if(name==='img'){
   if(!hasValue('src')&&!hasValue('srcset'))errors.push(context+' needs a non-empty src or srcset');
   if(attrs.has('src')&&!hasValue('src'))errors.push(context+' has an empty src');
   if(!attrs.has('alt'))errors.push(context+' needs an alt attribute (empty is allowed for decoration)');
  }
  if(name==='source'){
   const parent=stack.at(-1);
   if(parent==='picture'){
    if(!hasValue('srcset'))errors.push(context+' in picture needs a non-empty srcset');
    if(attrs.has('src'))errors.push(context+' in picture must not use src');
   }else if(parent==='video'||parent==='audio'){
    if(!hasValue('src'))errors.push(context+' in '+parent+' needs a non-empty src');
   }else errors.push(context+' must be a child of picture, video or audio');
  }
  if(dimensionElements.has(name)||(name==='source'&&stack.at(-1)==='picture')){
   for(const key of ['width','height'])if(attrs.has(key)&&!/^\d+$/.test(attrs.get(key)||''))errors.push(context+' '+key+' must be a non-negative integer');
  }
  if(name==='iframe'&&attrs.has('frameborder'))errors.push(context+' uses obsolete frameborder; use CSS border');
  if(!voidElements.has(name)&&!rawAttributes.trimEnd().endsWith('/'))stack.push(name);
 }
 assert.equal(errors.length,0,label+': invalid media markup\n'+errors.join('\n'));
}
