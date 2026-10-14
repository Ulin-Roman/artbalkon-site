import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {faqByService,faqRoutes} from '../src/faq-content.mjs';
import {serviceSeo,services} from '../src/content.mjs';

// Route identities and counts are independent of the content module so a missing
// route or a shared fallback cannot silently make the expected result smaller.
const expectedRoutes=[
 '/',
 '/osteklenie-balkonov/',
 '/holodnoe-osteklenie/',
 '/teploe-osteklenie/',
 '/panoramnoe-osteklenie/',
 '/frantsuzskoe-osteklenie/',
 '/razdvizhnoe-osteklenie/',
 '/osteklenie-balkona-s-vynosom/',
 '/osteklenie-balkona-v-hrushchevke/',
 '/osteklenie-kottedzhej/',
 '/uteplenie-balkonov/',
 '/otdelka-balkonov/',
 '/remont-balkonov/',
 '/otdelka-balkona-pvh-panelyami/',
 '/otdelka-balkona-laminatom/',
 '/otdelka-balkona-vagonkoj/',
 '/otdelka-balkona-kvarcvinilom/',
 '/otdelka-balkona-derevom/',
 '/otdelka-balkona-mdf-panelyami/',
 '/obedinenie-balkona-s-komnatoj/'
];
const sixQuestionRoutes=new Set(['/','/uteplenie-balkonov/','/obedinenie-balkona-s-komnatoj/']);
const joiningRoute='/obedinenie-balkona-s-komnatoj/';
const entities={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:'\u00a0'};
const decode=source=>source.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi,(match,key)=>{
 if(key[0]==='#')return String.fromCodePoint(key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1)));
 assert.ok(Object.hasOwn(entities,key.toLowerCase()),'Unsupported HTML entity in FAQ: '+match);
 return entities[key.toLowerCase()];
});
const text=source=>decode(source.replace(/<[^>]+>/g,'')).trim();
const attributes=source=>Object.fromEntries([...source.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:decode(value)]));
const hasType=(node,type)=>[node?.['@type']].flat().includes(type);
function findFaqSchemas(node,found=[]){
 if(Array.isArray(node)){for(const item of node)findFaqSchemas(item,found);}
 else if(node&&typeof node==='object'){
  if(hasType(node,'FAQPage'))found.push(node);
  for(const child of Object.values(node))findFaqSchemas(child,found);
 }
 return found;
}

export async function checkFaq({root=resolve('dist'),basePath=process.env.SITE_BASE_PATH||'/',staticOnly=process.env.SITE_STATIC_ONLY==='true'}={}){
 assert.deepEqual(new Set(Object.keys(faqRoutes)),new Set(expectedRoutes),'FAQ must cover exactly the 20 requested routes');
 assert.equal(Object.keys(faqByService).length,20,'FAQ must have one authoritative set per service');
 assert.deepEqual(new Set(Object.values(faqRoutes)),new Set(Object.keys(faqByService)),'Every FAQ service must have exactly one public route');
 const sourceSets=new Set();
 const pages=new Map();
 let total=0;
 for(const route of expectedRoutes){
  const slug=faqRoutes[route];
  assert.equal(slug,route==='/'?'balkon-pod-klyuch':route.slice(1,-1),route+': FAQ key must stay relative to the site root');
  const expected=faqByService[slug],label=route+' FAQ';
  assert.ok(Array.isArray(expected),label+': missing source set');
  assert.equal(expected.length,sixQuestionRoutes.has(route)?6:4,label+': requested question count');
  assert.equal(serviceSeo[slug]?.faq,expected,label+': service data must reference the authoritative set, not an old or common fallback');
  for(const pair of expected){
   assert.ok(Array.isArray(pair)&&pair.length===2,label+': question/answer pair shape');
   for(const value of pair)assert.ok(typeof value==='string'&&value.trim(),label+': nonempty question and full answer');
  }
  assert.equal(new Set(expected.map(([question])=>question)).size,expected.length,label+': duplicate question within a set');
  const identity=JSON.stringify(expected);
  assert.ok(!sourceSets.has(identity),label+': a common FAQ set must not replace service-specific content');
  sourceSets.add(identity);
  total+=expected.length;

  const html=await readFile(join(root,route.slice(1),'index.html'),'utf8');
  pages.set(route,html);
  assert.doesNotMatch(html,/<meta\b[^>]*http-equiv="refresh"/i,label+': requested route must remain a content page');
  const blocks=[...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0]).filter(section=>/<div\b[^>]*class="[^"]*\bservice-page-faq\b/.test(section));
  assert.equal(blocks.length,1,label+': one existing visible FAQ block');
  const block=blocks[0];
  assert.equal([...html.matchAll(/<h[1-6]\b[^>]*>Ответы на вопросы<\/h[1-6]>/g)].length,1,label+': no second visible FAQ heading');
  assert.match(block,/<h2>Ответы на вопросы<\/h2>/,label+': preserve the FAQ heading');
  assert.match(block,/<p class="explanatory-subtitle">Коротко отвечаем на вопросы, которые возникают до замера и расчёта\.<\/p>/,label+': preserve the FAQ subtitle');
  assert.doesNotMatch(block,/<[^>]+\s(?:hidden|inert)(?:\s|=|>)/i,label+': questions and answer content must be available without JavaScript');
  const details=[...block.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
  assert.equal(details.length,expected.length,label+': every question is present in static HTML');
  const visible=details.map(([,detailTag,body],index)=>{
   const itemLabel=label+' #'+(index+1),detailAttributes=attributes(detailTag);
   assert.ok(!Object.hasOwn(detailAttributes,'role'),itemLabel+': preserve native details semantics');
   const summaries=[...body.matchAll(/<summary\b([^>]*)>([\s\S]*?)<\/summary>/g)];
   assert.equal(summaries.length,1,itemLabel+': one native summary');
   assert.match(body,/^\s*<summary\b/,itemLabel+': summary is the first details child');
   const [,summaryTag,summary]=summaries[0],summaryAttributes=attributes(summaryTag);
   for(const attribute of ['role','tabindex','aria-expanded'])assert.ok(!Object.hasOwn(summaryAttributes,attribute),itemLabel+': native keyboard/state semantics must not be overridden by '+attribute);
   const pluses=[...summary.matchAll(/<span\b([^>]*)>\+<\/span>/g)];
   assert.equal(pluses.length,1,itemLabel+': preserve the decorative plus');
   assert.equal(attributes(pluses[0][1])['aria-hidden'],'true',itemLabel+': decorative plus stays hidden from screen readers');
   const question=text(summary.replace(pluses[0][0],''));
   const answerMarkup=body.slice(summaries[0].index+summaries[0][0].length).trim();
   assert.match(answerMarkup,/^<p\b[^>]*>[\s\S]*<\/p>$/,itemLabel+': full answer is in the initial HTML');
   const answer=text(answerMarkup);
   assert.ok(answer,itemLabel+': visible answer is nonempty');
   return [question,answer];
  });
  assert.deepEqual(visible,expected,label+': visible questions and complete decoded answers must match their ordered source');
  for(const [question] of expected){
   const occurrences=[...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].filter(([,summary])=>text(summary.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g,''))===question);
   assert.equal(occurrences.length,1,label+': no duplicate question elsewhere on the page: '+question);
  }
  const schemas=[];
  for(const [,json] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))findFaqSchemas(JSON.parse(json),schemas);
  assert.equal(schemas.length,1,label+': exactly one FAQPage across all JSON-LD blocks');
  const questions=schemas[0].mainEntity;
  assert.ok(Array.isArray(questions),label+': FAQPage mainEntity must contain the ordered questions');
  const structured=questions.map((question,index)=>{
   assert.ok(hasType(question,'Question'),label+' #'+(index+1)+': Question schema type');
   assert.ok(hasType(question.acceptedAnswer,'Answer'),label+' #'+(index+1)+': accepted Answer schema type');
   return [question.name,question.acceptedAnswer.text];
  });
  assert.deepEqual(structured,expected,label+': JSON-LD must contain this service’s exact ordered questions and full answers');
  assert.deepEqual(structured,visible,label+': schema and visible content must agree');
 }
 assert.equal(total,86,'FAQ must contain all 86 supplied question/answer pairs');

 // User explicitly retained this service. FAQ legal caveats must never turn it
 // into a redirect or remove its existing name, heading or navigation entry.
 const joining=pages.get(joiningRoute);
 assert.equal(services.find(service=>service.slug===faqRoutes[joiningRoute])?.title,'Объединение с комнатой','Preserve the existing joining service name');
 assert.equal(text(joining.match(/<title>([\s\S]*?)<\/title>/)?.[1]||''),'Объединение балкона с комнатой в Москве | ArtBalkon','Preserve the joining page title');
 assert.equal(text(joining.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]||''),'Объединение балкона или лоджии с комнатой в Москве и Московской области','Preserve the joining H1');
 const canonical=decode(joining.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]||'');
 assert.ok(canonical.endsWith(joiningRoute),'Preserve the joining canonical route');
 const navigationHref=basePath+joiningRoute.slice(1);
 for(const [route,html] of pages)assert.ok(html.includes('href="'+navigationHref+'">Объединение с комнатой</a>'),route+': preserve the joining navigation link');
 if(!staticOnly){
  assert.doesNotMatch(joining,/<meta\b[^>]*name="robots"[^>]*content="noindex/i,'Joining must remain indexable in production');
  const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
  assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'Joining must remain in the production sitemap');
 }
 console.log('PASS: FAQ — 20 routes, 86 complete ordered pairs, static native accordions, one matching FAQPage per route; joining page preserved.');
 return {routes:expectedRoutes.length,pairs:total};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await checkFaq();
