import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {serviceBeforeAfterProjects,services,beforeAfterProjects,beforeHardwareReplacements} from '../src/content.mjs';
import {servicePage,home as renderHome} from '../src/components.mjs';
const roofPairs=serviceBeforeAfterProjects['krysha-nad-balkonom'];
const electricalPairs=serviceBeforeAfterProjects['elektrika-na-balkone'];
assert.equal(electricalPairs.length,12,'electrical gallery must retain twelve pairs');
for(const project of electricalPairs){
 assert.ok(project.electricalComparison&&project.visualized&&!project.beforeReal,'electrical concepts must be marked as visualizations');
 assert.ok(project.before.startsWith('electrical-v2/')&&project.after.startsWith('electrical-v2/'),'electrical pairs must use matched installation scenarios');
 assert.notEqual(project.before,project.after);
}
assert.equal(roofPairs.length,12,'roof gallery must retain twelve comparisons');
for(const project of roofPairs){
 assert.ok(project.roofComparison,'roof preview must retain the whole image');
 assert.notEqual(project.before,project.after,'roof comparison must use different images');
}
for(const project of roofPairs.slice(6))for(const side of ['before','after']){
 assert.ok(project[side].startsWith('gallery-quality-v2/'),'do not restore blurry roof enlargements');
 assert.ok(project.visualized&&project.qualityReconstructed,'reconstructed images must be disclosed');
}
for(const [label,html,projects] of [['home',renderHome(),beforeAfterProjects],...services.map(s=>[s.slug,servicePage(s),serviceBeforeAfterProjects[s.slug]])]){
 const hero=html.match(/<div[^>]*data-hero-slider[^>]*>([\s\S]*?)<\/div>/)?.[1];
 assert.ok(hero,`${label}: missing hero`);
 const actual=[...hero.matchAll(/\ssrc="\/assets\/([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,[...new Set(projects.map(p=>p.after))],`${label}: hero must use its own AFTER gallery`);
}
assert.equal(beforeAfterProjects.length,12,'Home must contain 12 turnkey pairs');
assert.equal(new Set(beforeAfterProjects.map(p=>p.after)).size,12,'Home must not repeat rooms');
for(const [type,slug] of [['balcony','balkon-pod-klyuch'],['loggia','lodzhiya-pod-klyuch']]){
 const selected=beforeAfterProjects.filter(p=>p.objectType===type);
 assert.equal(selected.length,6,`Home must contain six ${type} pairs`);
 for(const project of selected){
  assert.equal(project.stage,'turnkey');
  assert.ok(serviceBeforeAfterProjects[slug].some(source=>source.before===project.before&&source.after===project.after&&source.title===project.title),'Home must reuse complete turnkey pairs');
 }
}
const furnitureGallery=serviceBeforeAfterProjects['mebel-dlya-balkona'];
assert.equal(furnitureGallery.length,12,'Furniture: expected 12 pairs');
assert.equal(new Set(furnitureGallery.map(p=>p.after)).size,12,'Furniture: duplicate rooms');
for(const type of ['balcony','loggia'])assert.equal(furnitureGallery.filter(p=>p.objectType===type).length,6,`Furniture: expected six ${type} rooms`);
for(const p of furnitureGallery){assert.equal(p.stage,'furniture');assert.equal(p.builtIn,true);}
for(const [category,count] of Object.entries({office:3,lounge:3,reading:2,storage:2,combined:2}))assert.equal(furnitureGallery.filter(p=>p.category===category).length,count,`Furniture: wrong ${category} count`);
for(const [index,p] of furnitureGallery.entries()){
 const key=`service-before-after/furniture-interior-v2-${String(index+1).padStart(2,'0')}`;
 assert.equal(p.before,`${key}-before.webp`);
 assert.equal(p.after,`${key}-after.webp`);
 assert.equal(p.beforeReal,false);
 assert.ok(!beforeAfterProjects.some(home=>home.after===p.after),'Furniture concepts must not replace home turnkey projects');
}
assert.equal(services.find(s=>s.slug==='mebel-dlya-balkona').title,'Мебель для балконов и лоджий');
const coldGallery=serviceBeforeAfterProjects['holodnoe-osteklenie'];
assert.equal(coldGallery.length,12,'Cold balcony gallery must contain 12 distinct pairs');
const ordinaryColdAssets=new Set(['service-before-after/cold-balcony-01-after.png','service-before-after/glazing-new-04-after.jpg',...Array.from({length:10},(_,i)=>`service-before-after/cold-balcony-matched-${String(i+3).padStart(2,'0')}-after.png`)]);
for(const project of coldGallery){
 assert.ok(ordinaryColdAssets.has(project.after),`Unexpected cold glazing asset: ${project.after}`);
 assert.ok(!/панорам/i.test(project.title+' '+project.description),'Panoramic example in ordinary cold glazing gallery');
}
const coldLoggias=serviceBeforeAfterProjects['holodnoe-osteklenie-lodzhii'];
assert.equal(coldLoggias.length,12,'Cold loggia gallery must contain 12 distinct finished interiors');
for(const project of coldLoggias){
 assert.equal(project.objectType,'loggia');
 assert.match(project.after,/^service-before-after\/(?:cold-ordinary-(?:0[3-9]|1[01])-after\.webp|cold-loggia-(?:graphite-fixed|finished-1[12])-after\.png)$/,'Unreviewed or panoramic image in cold loggias');
 if(project.after.includes('cold-ordinary-'))assert.equal(project.before,project.after.replace('-after.webp','-before.webp'),'Loggia must keep its matched before image');
 assert.ok(!coldGallery.some(balcony=>balcony.after===project.after),'Balcony and loggia galleries must not share images');
}
for(const [slug,type,stage] of [['otdelka-balkonov','balcony','finish'],['otdelka-lodzhii','loggia','finish'],['balkon-pod-klyuch','balcony','turnkey'],['lodzhiya-pod-klyuch','loggia','turnkey']]){
 const gallery=serviceBeforeAfterProjects[slug];
 assert.equal(gallery.length,12,`${slug}: expected 12 pairs`);
 assert.equal(new Set(gallery.map(p=>p.after)).size,12,`${slug}: duplicate rooms`);
 gallery.forEach((p,i)=>{
  const key=`service-before-after/renovation-${type}-${String(i+1).padStart(2,'0')}`;
  assert.equal(p.objectType,type);
  assert.equal(p.stage,stage);
  const expectedBefore=type==='loggia'&&i===10?'window-details-v2/old-window-clean.webp':`${key}-finish-before.webp`;
  assert.equal(p.before,beforeHardwareReplacements[expectedBefore] || expectedBefore,`${slug}: before must show the matched room with worn finishes, not bare concrete`);
  assert.equal(p.after,type==='balcony'&&i===3?'window-details-v2/balcony-04-handles.webp':`${key}-after.webp`,`${slug}: wrong after room`);
  assert.equal(p.visualized,true);
  assert.equal(p.beforeReal,false);
 });
}
const root=resolve('dist');
const base=process.env.SITE_BASE_PATH||'/';
async function walk(dir){const files=[];for(const ent of await readdir(dir,{withFileTypes:true})){const path=join(dir,ent.name);files.push(...ent.isDirectory()?await walk(path):[path]);}return files;}
const files=await walk(root),pages=files.filter(f=>f.endsWith('.html'));let refs=0;
const titles=new Map(),canonicals=new Map();
for(const file of pages){const html=await readFile(file,'utf8');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file+' must have one H1');for(const tag of ['<title>','name="description"','rel="canonical"','og:title','application/ld+json'])assert.ok(html.includes(tag),file+' missing '+tag);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');for(const match of html.matchAll(/<img\s[^>]+>/g)){assert.ok(/\salt="[^"]+"/.test(match[0]),'image alt missing');assert.ok(/width=/.test(match[0])&&/height=/.test(match[0]),'image dimensions missing');}
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1],description=html.match(/<meta name="description" content="([^"]+)"/)?.[1],canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];assert.ok(title&&title.length>=20&&title.length<=90,file+' invalid title length');assert.ok(description&&description.length>=60&&description.length<=220,file+' invalid description length');assert.ok(canonical?.startsWith('https://'),file+' invalid canonical');assert.ok(!titles.has(title),`${file} repeats title from ${titles.get(title)}`);assert.ok(!canonicals.has(canonical),`${file} repeats canonical from ${canonicals.get(canonical)}`);titles.set(title,file);canonicals.set(canonical,file);
 for(const tag of ['property="og:image"','property="og:image:alt"','name="twitter:card"','name="twitter:image"','hreflang="ru-RU"','hreflang="x-default"'])assert.ok(html.includes(tag),file+' missing '+tag);
 const jsonLd=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];assert.ok(jsonLd,file+' missing JSON-LD');const schema=JSON.parse(jsonLd);assert.ok(Array.isArray(schema['@graph']),file+' JSON-LD must use @graph');const schemaTypes=schema['@graph'].flatMap(item=>Array.isArray(item['@type'])?item['@type']:[item['@type']]);for(const type of ['HomeAndConstructionBusiness','WebSite','WebPage'])assert.ok(schemaTypes.includes(type),`${file} missing ${type} schema`);if(html.includes('service-page-faq')){assert.ok(schemaTypes.includes('Service'),file+' missing Service schema');assert.ok(schemaTypes.includes('FAQPage'),file+' missing FAQPage schema');}if(html.includes('case-intro'))assert.ok(schemaTypes.includes('Article'),file+' missing Article schema');
 const comparisonPairs=[...html.matchAll(/data-before="([^"]+)" data-after="([^"]+)"/g)].map(match=>`${match[1]}|${match[2]}`);if(html.includes('service-page-faq'))assert.ok(comparisonPairs.length>=1,file+' must have relevant before/after examples');if(comparisonPairs.length){assert.equal(new Set(comparisonPairs).size,comparisonPairs.length,file+' repeats before/after images');}
 for(const m of html.matchAll(/(?:href|src|poster)="([^"<>]+)"/g)){const url=m[1];if(!url.startsWith('/')&&!url.startsWith('#'))continue;const [pathWithQuery,fragment]=url.split('#'),path=pathWithQuery.split('?')[0];if(path&&base!=='/'&&!path.startsWith(base))assert.fail(`${file} uses path outside Pages base: ${url}`);let target=path?join(root,base==='/'?path:path.slice(base.length-1)):file;try{if((await stat(target)).isDirectory())target=join(target,'index.html');await stat(target);}catch{assert.fail(`${file} missing ${url}`);}if(fragment){const content=await readFile(target,'utf8');assert.ok(content.includes(`id="${fragment}"`),`${file} missing anchor ${url}`);}refs++;}
}
for(const asset of ['assets/manrope.ttf','assets/manrope-bold.ttf','robots.txt','sitemap.xml','site-config.json'])await stat(join(root,asset));
const searchable=files.filter(file=>/\.(?:html|css|js|json|xml|txt)$/.test(file));const siteText=(await Promise.all(searchable.map(file=>readFile(file,'utf8')))).join('\n').replaceAll('\\','/');for(const asset of files.filter(file=>file.includes(`${join(root,'assets')}`))){const relative=asset.slice(root.length+1).replaceAll('\\','/');assert.ok(siteText.includes(relative),`unused built asset: ${relative}`);}
await assert.rejects(stat(join(root,'styles-extra.css')),/ENOENT/);
for(const file of ['public/app.js','scripts/server.mjs','scripts/leads.mjs','src/components.mjs','src/content.mjs'])execFileSync(process.execPath,['--check',file]);
const home=await readFile(join(root,'index.html'),'utf8');
if(base!=='/'){assert.ok(home.includes(`href="${base}styles.css`));assert.ok(home.includes(`src="${base}app.js`));assert.ok(home.includes(`srcset="${base}assets/`));assert.ok(home.includes(`poster="${base}assets/video/process-poster.jpg"`));assert.ok(home.includes(`poster="${base}assets/video/result-poster.jpg"`));assert.ok(home.includes(`href="${base}osteklenie-balkonov/"`));assert.ok(home.includes(`<link rel="canonical" href="https://ulin-roman.github.io${base}"`));const css=await readFile(join(root,'styles.css'),'utf8');assert.ok(css.includes(`url('${base}assets/manrope.ttf')`));assert.ok(!css.includes("url('/assets/"));assert.ok(!home.includes('srcset="/assets/'));assert.ok(!home.includes('poster="/assets/'));}
const total=await Promise.all(files.filter(f=>f.endsWith('.webp')).map(f=>stat(f).then(s=>s.size)));
console.log(`PASS: ${pages.length} pages, ${refs} local references, unique metadata, JSON-LD, image alt, no orphan assets, JS syntax. WebP total: ${Math.round(total.reduce((a,b)=>a+b,0)/1024)} KB.`);
