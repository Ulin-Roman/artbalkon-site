import {portfolioDisplayTitles} from '../src/portfolio-titles.mjs';
import {beforeWeatherAssets} from '../src/before-weather.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {projects,serviceBeforeAfterProjects,services,beforeAfterProjects,beforeHardwareReplacements,finishBeforeLatchReplacements} from '../src/content.mjs';
import {esc,projectDisplayTitle,projectPage,servicePage,servicePageWithSeo,home as renderHome} from '../src/components.mjs';
// Weather/daylight variant checks: only generated BEFORE assets may be mapped.
const allPhotoPairs=[...beforeAfterProjects,...Object.values(serviceBeforeAfterProjects).flat()];
const generatedBeforeAssets=new Set(allPhotoPairs.filter(p=>p.beforeReal!==true&&(p.beforeReal===false||p.beforeVisualized===true)).map(p=>p.before));
const allAfterAssets=new Set(allPhotoPairs.map(p=>p.after));
const renderedGalleries=[renderHome(),...services.map(service=>servicePageWithSeo(service))].join('\n');
for(const [source,target] of Object.entries(beforeWeatherAssets)){
 assert.ok(generatedBeforeAssets.has(source),`Weather variant must come from a generated BEFORE: ${source}`);
 assert.ok(!allAfterAssets.has(source),`Weather variant must not change a shared AFTER: ${source}`);
 assert.match(target,/^before-weather-v1\/before-\d{3}\.webp$/);
 assert.ok(renderedGalleries.includes(`/assets/${target}`),`Weather variant must appear in a rendered gallery: ${target}`);
}
for(const original of allPhotoPairs.filter(p=>p.beforeReal===true))assert.ok(!beforeWeatherAssets[original.before],`Original BEFORE must be preserved: ${original.before}`);
// Validate final user-facing names without changing source titles or analytics keys.
for(const title of Object.values(portfolioDisplayTitles)){
 assert.ok(typeof title==='string'&&title.trim(),'Display title must exist');
 assert.doesNotMatch(title,/зим|снег|летн|осенн|весенн|зелень|undefined|null/i);
}
for(const html of [renderHome(),...services.map(s=>servicePageWithSeo(s))]){
 const seen=new Map();
 for(const [,title,,after] of html.matchAll(/data-title="([^"]+)" data-before="([^"]+)" data-after="([^"]+)"/g)){
  assert.ok(title.trim(),'Rendered display title must not be empty');
  assert.doesNotMatch(title,/зим|снег|летн|осенн|весенн|зелень|undefined|null/i);
  if(seen.has(title))assert.equal(seen.get(title),after,'Different works on one page need different display titles');
  seen.set(title,after);
 }
 for(const [,source,display] of html.matchAll(/data-application data-project="([^"]+)" data-project-display="([^"]+)"/g))assert.equal(display,esc(projectDisplayTitle({title:source})));
}
for(const project of projects){
 const html=projectPage(project),title=esc(projectDisplayTitle(project));
 assert.ok(html.includes('<h1>'+title+'</h1>'),'Project H1 must use display title');
 assert.ok(html.includes('aria-current="page">'+title+'</span>'),'Project breadcrumb must use display title');
}
const requiredLocation='в Москве и Московской области';
const bundledServiceSlugs=['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'];
const homeHtml=renderHome();
assert.ok(homeHtml.includes('Получить консультацию'),'home hero must invite visitors to get a consultation');
assert.match(homeHtml,/<div class="hero-actions"><button class="button button-no-icon"[^>]*>\s*<span class="button-label">Получить консультацию<\/span>/,'home consultation button must not contain an icon');
assert.ok(homeHtml.includes('/assets/service-before-after/renovation-loggia-12-after.webp'),'home finishing card must use the selected page hero');
assert.ok(homeHtml.includes('/assets/before-daytime/before-032.webp'),'home insulation card must use the selected page hero');
assert.ok(homeHtml.includes('/assets/service-before-after/furniture-interior-v2-02-after.webp'),'home turnkey card must use the selected page hero');
for(const slug of bundledServiceSlugs)assert.ok(!homeHtml.includes(`href="/${slug}/"`),`Home must not advertise ${slug} as a standalone service`);
const turnkeyHtml=servicePageWithSeo(services.find(service=>service.slug==='balkon-pod-klyuch'));
assert.ok(!turnkeyHtml.includes('id="complex-projects"'),'Removed bundled galleries must stay off the turnkey page');
for(const title of ['Работы в составе проектов под ключ','Мебель в готовых интерьерах','Электрика и освещение в проектах'])assert.ok(!turnkeyHtml.includes(title),`Removed section must stay absent: ${title}`);
assert.match(turnkeyHtml,/id="complex-options"/,'Turnkey page must contain bundled options');
for(const title of ['Крыша над балконом','Мебель для балкона или лоджии','Электрика и освещение'])assert.ok(turnkeyHtml.includes(title),`Turnkey page must contain ${title}`);
for(const [label,html] of [['home',renderHome()],...services.map(service=>[service.slug,servicePage(service)])]){
 const h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g,' ');
 assert.ok(h1?.includes(requiredLocation),`${label}: H1 must include ${requiredLocation}`);
}
const roofPairs=serviceBeforeAfterProjects['krysha-nad-balkonom'];
const electricalPairs=serviceBeforeAfterProjects['elektrika-na-balkone'];
assert.equal(electricalPairs.length,12,'electrical gallery must retain twelve pairs');
for(const project of electricalPairs){
 assert.ok(project.electricalComparison&&project.visualized&&!project.beforeReal,'electrical concepts must be marked as visualizations');
 assert.ok(project.before.startsWith('electrical-v2/')&&project.after.startsWith('electrical-v2/'),'electrical pairs must use matched installation scenarios');
 assert.notEqual(project.before,project.after);
}
assert.equal(roofPairs.length,4,'roof gallery must contain the four retained turnkey comparisons');
for(const project of roofPairs){
 assert.ok(project.roofComparison&&project.turnkeyRoof,'roof preview must be a complete turnkey project');
 assert.ok(project.afterVisualized&&project.visualized,'edited turnkey roof images must be disclosed');
 assert.notEqual(project.before,project.after,'roof comparison must use different images');
}
const reconstructedRoofPairs=roofPairs.filter(project=>project.qualityReconstructed);
assert.equal(reconstructedRoofPairs.length,0,'the two removed roof reconstructions must stay out of the gallery');
for(const project of reconstructedRoofPairs){
 assert.ok(project.before.startsWith('gallery-quality-v2/')&&project.after.startsWith('gallery-quality-v2/'),'do not restore blurry roof enlargements');
 assert.ok(project.visualized&&project.qualityReconstructed,'reconstructed images must be disclosed');
}
for(const project of roofPairs.filter(project=>!project.qualityReconstructed))assert.ok(project.after.startsWith('turnkey-roof-glazing/'),'roof-only AFTER images must not return');
for(const [label,html,projects] of [['home',renderHome(),beforeAfterProjects],...services.map(s=>[s.slug,servicePage(s),serviceBeforeAfterProjects[s.slug]])]){
 const hero=html.match(/<div[^>]*data-hero-slider[^>]*>([\s\S]*?)<\/div>/)?.[1];
 if(label==='home'){
  assert.ok(!html.includes('<div class="hero-visual hero-slideshow"'),'home hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/furniture-interior-v2-04-after.webp'),'home hero must keep the selected project image');
  continue;
 }
 if(label==='osteklenie-balkonov'){
  assert.ok(!html.includes('data-hero-slider'),'glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/cold-loggia-finished-12-after.png'),'glazing hero must keep the selected sliding-window image');
  continue;
 }
 if(label==='otdelka-balkonov'){
  assert.ok(!html.includes('data-hero-slider'),'finishing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/renovation-loggia-12-after.webp'),'finishing page hero must keep the selected portfolio image');
  continue;
 }
 if(label==='balkon-pod-klyuch'){
  assert.ok(!html.includes('data-hero-slider'),'turnkey balcony page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/furniture-interior-v2-02-after.webp'),'turnkey balcony page hero must keep the selected office image');
  continue;
 }
 if(label==='holodnoe-osteklenie'){
  assert.ok(!html.includes('data-hero-slider'),'cold glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/cold-loggia-finished-12-after.png'),'cold glazing page hero must keep the selected sliding-window image');
  continue;
 }
 if(label==='teploe-osteklenie'){
  assert.ok(!html.includes('data-hero-slider'),'warm glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/renovation-loggia-02-after.webp'),'warm glazing page hero must keep the selected finished loggia image');
  continue;
 }
 if(label==='panoramnoe-osteklenie'){
  assert.ok(!html.includes('data-hero-slider'),'panoramic glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/panoramic-glazing-after.jpg'),'panoramic glazing page hero must keep the selected exterior image');
  continue;
 }
 if(label==='uteplenie-balkonov'){
  assert.ok(!html.includes('data-hero-slider'),'insulation page hero must remain static');
  assert.ok(html.includes('/assets/before-daytime/before-032.webp'),'insulation page hero must keep the selected PENOPLEX image');
  continue;
 }
 assert.ok(hero,`${label}: missing hero`);
 const actual=[...hero.matchAll(/\s(?:src|data-src)="\/assets\/([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,[...new Set(projects.map(p=>p.after))],`${label}: hero must use its own AFTER gallery`);
}
const originalHomeProjects=beforeAfterProjects.filter(p=>!p.newPortfolioSeries&&!p.newPerspectiveSeries&&!p.newDiverseSeries&&!p.importedHomeWork);
assert.equal(originalHomeProjects.length,12,'Home must contain 12 turnkey pairs');
assert.equal(new Set(originalHomeProjects.map(p=>p.after)).size,12,'Home must not repeat rooms');
for(const [type,slug] of [['balcony','balkon-pod-klyuch'],['loggia','lodzhiya-pod-klyuch']]){
 const selected=originalHomeProjects.filter(p=>p.objectType===type);
 assert.equal(selected.length,6,`Home must contain six ${type} pairs`);
 for(const project of selected){
  assert.equal(project.stage,'turnkey');
  const sharedBefore=beforeHardwareReplacements[project.before] || project.before;
  const sectionBefore=slug==='balkon-pod-klyuch'?(finishBeforeLatchReplacements[sharedBefore] || sharedBefore):sharedBefore;
  assert.ok(serviceBeforeAfterProjects[slug].some(source=>source.before===sectionBefore&&source.after===project.after&&source.title===project.title),'Home must reuse complete turnkey pairs');
 }
}
const furnitureGallery=serviceBeforeAfterProjects['mebel-dlya-balkona'];
assert.equal(furnitureGallery.length,12,'Furniture: expected 12 pairs');
assert.equal(new Set(furnitureGallery.map(p=>p.after)).size,12,'Furniture: duplicate rooms');
for(const type of ['balcony','loggia'])assert.equal(furnitureGallery.filter(p=>p.objectType===type).length,6,`Furniture: expected six ${type} rooms`);
for(const p of furnitureGallery){assert.equal(p.stage,'furniture');assert.equal(p.builtIn,true);}
for(const [category,count] of Object.entries({office:3,lounge:3,reading:2,storage:2,combined:2}))assert.equal(furnitureGallery.filter(p=>p.category===category).length,count,`Furniture: wrong ${category} count`);
for(const p of furnitureGallery){
 const pairNumber=p.before.match(/furniture-interior-v2-(\d{2})-before\.webp$/)?.[1];
 assert.ok(pairNumber,'Furniture: unexpected before image');
 const key=`service-before-after/furniture-interior-v2-${pairNumber}`;
 assert.equal(p.after,`${key}-after.webp`);
 assert.equal(p.beforeReal,false);
 assert.ok(!beforeAfterProjects.some(home=>home.after===p.after),'Furniture concepts must not replace home turnkey projects');
}
assert.equal(services.find(s=>s.slug==='mebel-dlya-balkona').title,'Мебель для балконов и лоджий');
const coldGallery=serviceBeforeAfterProjects['holodnoe-osteklenie'].filter(project=>!project.newAngleSeries&&!project.newPortfolioSeries&&!project.newPerspectiveSeries&&!project.newDiverseSeries);
assert.equal(coldGallery.length,24,'Cold glazing gallery must contain 24 distinct pairs');
assert.equal(coldGallery.filter(project=>project.objectType==='balcony').length,12,'Cold glazing must contain twelve balcony examples');
assert.equal(coldGallery.filter(project=>project.objectType==='loggia').length,12,'Cold glazing must contain twelve loggia examples');
const ordinaryColdAssets=new Set(['service-before-after/cold-balcony-01-after.png','service-before-after/glazing-new-04-after-no-black-handles.png',...Array.from({length:10},(_,i)=>`service-before-after/cold-balcony-matched-${String(i+3).padStart(2,'0')}-after.png`)]);
for(const project of coldGallery){
 if(project.objectType==='balcony')assert.ok(ordinaryColdAssets.has(project.after),`Unexpected cold balcony asset: ${project.after}`);
 if(project.objectType==='loggia')assert.match(project.after,/^service-before-after\/(?:cold-ordinary-(?:0[3-9]|1[01])-after\.webp|cold-loggia-(?:graphite-fixed|finished-1[12])-after\.png)$/,'Unexpected cold loggia asset');
 assert.ok(!/панорам/i.test(project.title+' '+project.description),'Panoramic example in ordinary cold glazing gallery');
}
const coldLoggias=serviceBeforeAfterProjects['holodnoe-osteklenie-lodzhii'];
assert.equal(coldLoggias.length,12,'Cold loggia gallery must contain 12 distinct finished interiors');
for(const project of coldLoggias){
 assert.equal(project.objectType,'loggia');
 assert.match(project.after,/^service-before-after\/(?:cold-ordinary-(?:0[3-9]|1[01])-after\.webp|cold-loggia-(?:graphite-fixed|finished-1[12])-after\.png)$/,'Unreviewed or panoramic image in cold loggias');
 if(project.after.includes('cold-ordinary-'))assert.equal(project.before,project.after.replace('-after.webp','-before.webp'),'Loggia must keep its matched before image');
}
for(const [slug,type,stage] of [['otdelka-balkonov','balcony','finish'],['otdelka-lodzhii','loggia','finish'],['balkon-pod-klyuch','balcony','turnkey'],['lodzhiya-pod-klyuch','loggia','turnkey']]){
 const gallery=serviceBeforeAfterProjects[slug].filter(project=>project.objectType===type&&!project.turnkeyExpansion&&!project.newAngleSeries&&!project.newPortfolioSeries&&!project.newPerspectiveSeries&&!project.newDiverseSeries);
 const expectedCount=slug==='balkon-pod-klyuch'?16:slug==='otdelka-balkonov'?13:type==='loggia'?11:12;
 assert.equal(gallery.length,expectedCount,`${slug}: unexpected pair count`);
 assert.equal(new Set(gallery.map(p=>p.after)).size,expectedCount,`${slug}: duplicate rooms`);
 gallery.filter(p=>!['owner-projects/balcony-office-after.webp','turnkey-loft-v2/after.webp','turnkey-office-v1/after.webp','turnkey-books-v1/after.webp','turnkey-green-v1/after.webp'].includes(p.after)).forEach(p=>{
  const sourceNumber=p.after==='window-details-v2/balcony-04-handles.webp'?4:Number(p.after.match(/renovation-(?:balcony|loggia)-(\d{2})-after\.webp$/)?.[1]);
  assert.ok(sourceNumber,`${slug}: unexpected finished room`);
  const key=`service-before-after/renovation-${type}-${String(sourceNumber).padStart(2,'0')}`;
  assert.equal(p.objectType,type);
  assert.equal(p.stage,stage);
  const expectedBefore=type==='loggia'&&sourceNumber===11?'window-details-v2/old-window-clean.webp':`${key}-finish-before.webp`;
  const hardwareAdjustedBefore=beforeHardwareReplacements[expectedBefore] || expectedBefore;
  const expectedGalleryBefore=finishBeforeLatchReplacements[hardwareAdjustedBefore] || hardwareAdjustedBefore;
  assert.equal(p.before,expectedGalleryBefore,`${slug}: before must show the matched room with worn finishes, not bare concrete`);
  assert.equal(p.after,type==='balcony'&&sourceNumber===4?'window-details-v2/balcony-04-handles.webp':`${key}-after.webp`,`${slug}: wrong after room`);
  assert.equal(p.visualized,true);
  assert.equal(p.beforeReal,false);
 });
}
const turnkeyAdditions=serviceBeforeAfterProjects['balkon-pod-klyuch'].filter(project=>project.turnkeyExpansion);
assert.equal(turnkeyAdditions.length,6,'Turnkey gallery must include three furniture and three lighting concepts');
assert.equal(turnkeyAdditions.filter(project=>project.after.startsWith('electrical-v2/')).length,3);
assert.equal(turnkeyAdditions.filter(project=>project.after.startsWith('service-before-after/furniture-interior-')).length,3);
for(const project of turnkeyAdditions){
 assert.equal(project.visualized,true);
 assert.equal(project.beforeVisualized,true);
 assert.equal(project.beforeReal,false);
 assert.match(project.before,/^service-before-after\/turnkey-(?:furniture|electrical)-\d{2}-before-v[23]\.webp$/);
}
for(const [slug,expectedCount] of [['osteklenie-balkonov',12],['uteplenie-balkonov',7],['otdelka-balkonov',24],['balkon-pod-klyuch',33]]){
 const gallery=serviceBeforeAfterProjects[slug].filter(p=>!p.newPortfolioSeries&&!p.newPerspectiveSeries&&!p.newDiverseSeries);
 assert.equal(gallery.length,expectedCount+3,`${slug}: combined gallery has the wrong size`);
 assert.equal(new Set(gallery.map(project=>project.after)).size,expectedCount+3,`${slug}: combined gallery repeats finished rooms`);
}
const addedOffice=serviceBeforeAfterProjects['otdelka-balkonov'].find(project=>project.after==='owner-projects/balcony-office-after.webp');
assert.ok(addedOffice,'Owner office project must remain in the finishing gallery');
assert.equal(addedOffice.before,'owner-projects/balcony-office-before.webp');
assert.equal(addedOffice.after,'owner-projects/balcony-office-after.webp');
assert.equal(addedOffice.visualized,false);
assert.equal(addedOffice.beforeReal,true);
assert.equal(addedOffice.afterReal,true);
const root=resolve('dist');
const base=process.env.SITE_BASE_PATH||'/';
for(const slug of bundledServiceSlugs){const legacy=await readFile(join(root,slug,'index.html'),'utf8');assert.ok(legacy.includes('noindex,follow'),`${slug} must be a noindex redirect`);assert.ok(legacy.includes('/balkon-pod-klyuch/#complex-options'),`${slug} must redirect to bundled options`);}
async function walk(dir){const files=[];for(const ent of await readdir(dir,{withFileTypes:true})){const path=join(dir,ent.name);files.push(...ent.isDirectory()?await walk(path):[path]);}return files;}
const files=await walk(root),pages=files.filter(f=>f.endsWith('.html'));let refs=0;
const titles=new Map(),descriptions=new Map(),canonicals=new Map(),indexedCanonicals=new Set();
for(const file of pages){const html=await readFile(file,'utf8'),isRedirect=html.includes('http-equiv="refresh"');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file+' must have one H1');for(const tag of ['<title>','name="description"','rel="canonical"','og:title','application/ld+json'])assert.ok(html.includes(tag),file+' missing '+tag);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');for(const match of html.matchAll(/<img\s[^>]+>/g)){if(match[0].includes('src="https://mc.yandex.ru/watch/113425011"')){assert.ok(match[0].includes('alt=""'),'tracking pixel must have empty alt');continue;}assert.ok(/\salt="[^"]+"/.test(match[0]),'image alt missing');assert.ok(/width=/.test(match[0])&&/height=/.test(match[0]),'image dimensions missing');}
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1],description=html.match(/<meta name="description" content="([^"]+)"/)?.[1],canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];assert.ok(title&&title.length>=20&&title.length<=90,file+' invalid title length');assert.ok(description&&description.length>=60&&description.length<=220,file+' invalid description length');assert.ok(canonical?.startsWith('https://'),file+' invalid canonical');assert.ok(!titles.has(title),`${file} repeats title from ${titles.get(title)}`);assert.ok(!canonicals.has(canonical),`${file} repeats canonical from ${canonicals.get(canonical)}`);if(!html.includes('name="robots" content="noindex')){assert.ok(!descriptions.has(description),file+' repeats indexable description');descriptions.set(description,file);}
 titles.set(title,file);canonicals.set(canonical,file);if(!html.includes('name="robots" content="noindex'))indexedCanonicals.add(canonical);
 for(const tag of ['property="og:image"','property="og:image:alt"','name="twitter:card"','name="twitter:image"','hreflang="ru-RU"','hreflang="x-default"'])assert.ok(html.includes(tag),file+' missing '+tag);
 const jsonLd=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];assert.ok(jsonLd,file+' missing JSON-LD');const schema=JSON.parse(jsonLd);assert.ok(Array.isArray(schema['@graph']),file+' JSON-LD must use @graph');const schemaTypes=schema['@graph'].flatMap(item=>Array.isArray(item['@type'])?item['@type']:[item['@type']]);for(const type of ['HomeAndConstructionBusiness','WebSite','WebPage'])assert.ok(schemaTypes.includes(type),`${file} missing ${type} schema`);if(html.includes('service-page-faq')){assert.ok(schemaTypes.includes('Service'),file+' missing Service schema');assert.ok(schemaTypes.includes('FAQPage'),file+' missing FAQPage schema');}if(html.includes('case-intro'))assert.ok(schemaTypes.includes('Article'),file+' missing Article schema');
 // Featured extras intentionally reuse the first project from each complete gallery.
 const extrasHtml=html.match(/<section class="section container turnkey-extras" id="complex-options">[\s\S]*?<\/section>/)?.[0]||'';
 if(extrasHtml)assert.equal((extrasHtml.match(/data-comparison /g)||[]).length,3,file+' must feature three extra project comparisons');
 const galleryHtml=html.replace(extrasHtml,'');
 const comparisonPairs=[...galleryHtml.matchAll(/data-before="([^"]+)" data-after="([^"]+)"/g)].map(match=>`${match[1]}|${match[2]}`);if(html.includes('service-page-faq'))assert.ok(comparisonPairs.length>=1,file+' must have relevant before/after examples');if(comparisonPairs.length){assert.equal(new Set(comparisonPairs).size,comparisonPairs.length,file+' repeats before/after images');}
 for(const m of html.matchAll(/(?:href|src|poster|data-src)="([^"<>]+)"/g)){const url=m[1];if(!url.startsWith('/')&&!url.startsWith('#'))continue;const [pathWithQuery,fragment]=url.split('#'),path=pathWithQuery.split('?')[0];if(path&&base!=='/'&&!path.startsWith(base))assert.fail(`${file} uses path outside Pages base: ${url}`);let target=path?join(root,base==='/'?path:path.slice(base.length-1)):file;try{if((await stat(target)).isDirectory())target=join(target,'index.html');await stat(target);}catch{assert.fail(`${file} missing ${url}`);}if(fragment&&!isRedirect){const content=await readFile(target,'utf8');assert.ok(content.includes(`id="${fragment}"`),`${file} missing anchor ${url}`);}refs++;}
}
for(const page of pages){const html=await readFile(page,'utf8');for(const match of html.matchAll(/srcset="([^"]+)"/g)){for(const candidate of match[1].split(',')){const url=candidate.trim().split(/\s+/)[0];if(url.startsWith('/'))await stat(join(root,base==='/'?url:url.slice(base.length-1)));}}}
const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.deepEqual(new Set(sitemapUrls),indexedCanonicals,'sitemap must contain exactly the indexable canonical URLs');
assert.equal(sitemapUrls.length,indexedCanonicals.size,'sitemap must not contain duplicate URLs');
assert.ok(!/<(?:lastmod|changefreq|priority)>/.test(sitemap),'sitemap must not publish unverified dates or ignored ranking hints');
const robots=await readFile(join(root,'robots.txt'),'utf8');
assert.ok(!robots.includes(`Disallow: ${base}privacy/`)&&!robots.includes(`Disallow: ${base}consent/`),'noindex legal pages must remain crawlable');
for(const asset of ['assets/manrope.ttf','assets/manrope-bold.ttf','robots.txt','sitemap.xml','site-config.json'])await stat(join(root,asset));
const searchable=files.filter(file=>/\.(?:html|css|js|json|xml|txt)$/.test(file));const siteText=(await Promise.all(searchable.map(file=>readFile(file,'utf8')))).join('\n').replaceAll('\\','/');for(const asset of files.filter(file=>file.includes(`${join(root,'assets')}`))){const relative=asset.slice(root.length+1).replaceAll('\\','/');assert.ok(siteText.includes(relative),`unused built asset: ${relative}`);}
await assert.rejects(stat(join(root,'styles-extra.css')),/ENOENT/);
for(const file of ['dist/app.js','scripts/optimize.mjs','public/app.js','scripts/server.mjs','scripts/leads.mjs','src/components.mjs','src/content.mjs'])execFileSync(process.execPath,['--check',file]);
const home=await readFile(join(root,'index.html'),'utf8');
if(base!=='/'){assert.ok(home.includes(`href="${base}styles.css`));assert.ok(home.includes(`src="${base}app.js`));assert.ok(home.includes(`srcset="${base}assets/`));assert.ok(home.includes(`data-src="${base}assets/`));assert.ok(home.includes(`poster="${base}assets/video/process-poster.jpg"`));assert.ok(home.includes(`poster="${base}assets/video/result-poster.jpg"`));assert.ok(home.includes(`href="${base}osteklenie-balkonov/"`));assert.ok(home.includes(`<link rel="canonical" href="https://ulin-roman.github.io${base}"`));const css=await readFile(join(root,'styles.css'),'utf8');assert.ok(css.includes(`${base}assets/manrope.ttf`));assert.ok(!css.includes("url('/assets/"));assert.ok(!home.includes('srcset="/assets/'));assert.ok(!home.includes('data-src="/assets/'));assert.ok(!home.includes('poster="/assets/'));}
const total=await Promise.all(files.filter(f=>f.endsWith('.webp')).map(f=>stat(f).then(s=>s.size)));
console.log(`PASS: ${pages.length} pages, ${refs} local references, unique metadata, JSON-LD, image alt, no orphan assets, JS syntax. WebP total: ${Math.round(total.reduce((a,b)=>a+b,0)/1024)} KB.`);

// Keep the approved camera views; one panoramic comparison was removed at the user's request.
for(const service of services.filter(s=>!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newAngleSeries);
 assert.equal(added.length,service.slug === 'panoramnoe-osteklenie' ? 2 : 3,`${service.slug}: approved camera view count`);
 for(const p of added){
  assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);
  assert.ok(p.before.startsWith('gallery-angles-v1/')&&p.after.startsWith('gallery-angles-v1/'));
  assert.notEqual(p.before,p.after);
 }
}

// New series must add three complete labeled comparisons to every active landing.
assert.equal(beforeAfterProjects.filter(p=>p.newPortfolioSeries).length,2);
assert.ok(!beforeAfterProjects.some(p=>p.title==='Балкон под ключ с рабочим столом'),'Removed work must stay out of the home gallery');
for(const service of services.filter(s=>!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newPortfolioSeries);
 assert.equal(added.length,3,`${service.slug}: expected three new pairs`);
 assert.equal(new Set(added.map(p=>p.after)).size,3);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(p.before.startsWith('portfolio-extra-v2/')&&p.after.startsWith('portfolio-extra-v2/'));}
}

// Approved perspective comparisons: the unwanted turnkey storage pair was removed.
assert.equal(beforeAfterProjects.filter(p=>p.newPerspectiveSeries).length,2);
for(const service of services.filter(s=>!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newPerspectiveSeries);
 const expected=service.slug === "balkon-pod-klyuch" ? 2 : 3;
 assert.equal(added.length,expected,`${service.slug}: approved perspective pair count`);
 assert.equal(new Set(added.map(p=>p.after)).size,expected);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(p.before.startsWith('portfolio-perspectives-v3/')&&p.after.startsWith('portfolio-perspectives-v3/'));}
}

// New diverse compositions use complete pairs and explicit outcome-based names.
assert.equal(beforeAfterProjects.filter(p=>p.newDiverseSeries).length,3);
for(const service of services.filter(s=>!bundledServiceSlugs.includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newDiverseSeries);
 assert.equal(added.length,3,service.slug+': expected three new pairs');
 assert.equal(new Set(added.map(p=>p.after)).size,3);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(p.before.startsWith('portfolio-diverse-v4/')&&p.after.startsWith('portfolio-diverse-v4/'));assert.ok(portfolioDisplayTitles[p.title]);}
}

// Legal pages are generated by build.mjs and must retain their layout rules.
assert.ok((await readFile('dist/styles.css','utf8')).includes('.legal{'),'Legal page styles must survive CSS pruning');

// A withdrawn work must not survive in any gallery, page, or published image variant.
for (const gallery of [beforeAfterProjects, ...Object.values(serviceBeforeAfterProjects)]) {
 assert.ok(!gallery.some(project => project.after === 'service-gallery-v2/real-after-091.jpg'), 'Withdrawn work-107 must stay out of every gallery');
}
for (const file of pages) {
 const html = await readFile(file, 'utf8');
 assert.doesNotMatch(html, /work-107(?:["&\s]|$)|Подоконник стал полезной частью лоджии|real-after-091|warm-loggia-empty-09-before-no-handles|7feb788552823264|b70542faee80d7b2/, 'Withdrawn work must not appear in ' + file);
}
for (const file of files) assert.doesNotMatch(file, /real-after-091|warm-loggia-empty-09-before-no-handles|7feb788552823264|b70542faee80d7b2/, 'Withdrawn images must not be published');

for (const html of [renderHome(), ...services.map(service => servicePageWithSeo(service))]) assert.doesNotMatch(html, /data-case="work-(?:108|113|54)"|real-after-(?:100|164)/, 'Rejected projects must stay off every page');
