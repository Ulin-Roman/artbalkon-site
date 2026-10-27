import {checkFaq} from './faq-check.mjs';
import {checkMarkup} from './markup-check.mjs';
import {newLandingDefinitions,newLandingSlugs} from '../src/landing-pages.mjs';
import {beforeGeometryCorrections} from '../src/portfolio-before-geometry-corrections.mjs';
const beforeGeometrySources = new Map(Object.entries(beforeGeometryCorrections).map(([source,target])=>[target,source]));
import {beforeWindowCorrections} from '../src/portfolio-before-window-corrections.mjs';
const beforeWindowSources = new Map(Object.entries(beforeWindowCorrections).map(([source,target])=>[target,source]));
const originalWindowBefore = before => { const prior = beforeGeometrySources.get(before) || before; return beforeWindowSources.get(prior) || prior; };
import {portfolioDisplayTitles} from '../src/portfolio-titles.mjs';
import {portfolioCaseId} from '../src/portfolio-case-ids.mjs';
import {beforeWeatherAssets} from '../src/before-weather.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {company,serviceSeo,prices,projects,serviceBeforeAfterProjects,services,beforeAfterProjects,beforeHardwareReplacements,finishBeforeLatchReplacements} from '../src/content.mjs';
import {header,esc,projectDisplayTitle,projectPage,servicePage,servicePageWithSeo,shellWithQuiz,quiz,quizModal,homeHeroImage,home as renderHome} from '../src/components.mjs';
// Weather/daylight variant checks: only generated BEFORE assets may be mapped.
const allPhotoPairs=[...beforeAfterProjects,...Object.values(serviceBeforeAfterProjects).flat()];
const generatedBeforeAssets=new Set(allPhotoPairs.filter(p=>p.beforeReal!==true&&(p.beforeReal===false||p.beforeVisualized===true)).flatMap(p=>[p.before,originalWindowBefore(p.before)]));
const allAfterAssets=new Set(allPhotoPairs.map(p=>p.after));
const renderedGalleries=[renderHome(),...services.map(service=>servicePageWithSeo(service))].join('\n');
for(const [source,target] of Object.entries(beforeWeatherAssets)){
 assert.ok(generatedBeforeAssets.has(source),`Weather variant must come from a generated BEFORE: ${source}`);
 assert.ok(!allAfterAssets.has(source),`Weather variant must not change a shared AFTER: ${source}`);
 assert.match(target,/^(?:before-weather-v1\/before-\d{3}|portfolio-before-geometry-v1\/(?:work9-before-short-v3|work12-before-closed-v2|work13-before-no-handles-v2|work72-before-depth-v2|work76-before-double-window-v3|work70-before-pull-handles-v2|work97-before-depth-v2))\.webp$/);
 assert.ok(renderedGalleries.includes(`/assets/${target}`),`Weather variant must appear in a rendered gallery: ${target}`);
}
for(const original of allPhotoPairs.filter(p=>p.beforeReal===true))assert.ok(!beforeWeatherAssets[original.before],`Original BEFORE must be preserved: ${original.before}`);
// Validate final user-facing names without changing source titles or analytics keys.
for(const pair of allPhotoPairs){
 if(['balcony','loggia'].includes(pair.objectType)||/балкон|лоджи/i.test(pair.title)){
  assert.match(projectDisplayTitle(pair),/балкон|лоджи/i,'Balcony/loggia display title must include object keyword: '+pair.title);
 }
}
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
 assert.doesNotMatch(html,/class="breadcrumbs"/,'Project page must not restore removed breadcrumbs');
}
const requiredLocation='в Москве и Московской области';
const bundledServiceSlugs=['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'];
const homeHtml=renderHome();

// Both glazing choices must be readable together without interaction.
const assertGlazingChoice=(html,label)=>{
 const blocks=[...html.matchAll(/<section\b(?=[^>]*\bid="cold-warm-balcony")[^>]*>[\s\S]*?<\/section>/g)];
 assert.equal(blocks.length,1,label+': exactly one cold/warm comparison');
 const block=blocks[0][0];
 assert.ok(/^\s*<section\b[^>]*\bid="complex-options"/.test(html.slice(blocks[0].index+block.length)),label+': comparison must immediately precede additional services');
 assert.doesNotMatch(block,/<(?:table|input|select|details|dialog)\b|\srole="(?:tab|tablist|tabpanel)"|\s(?:hidden|inert)(?:\s|=|>)|\saria-expanded=|\bdata-(?:tab|tabs|accordion|toggle)(?:\s|=|>)/i,label+': both cards stay readable without interaction');
 const cards=[...block.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match=>match[0]);
 assert.equal(cards.length,2,label+': exactly two comparison cards');
 for(const [index,key] of ['cold','warm'].entries()){
  const card=cards[index];
  assert.match(card,new RegExp('data-glazing-choice="'+key+'"'),label+': correct card identity');
  assert.match(card,new RegExp('<h3 id="glazing-choice-'+key+'">'+(key==='cold'?'Холодный':'Тёплый')+' балкон</h3>'),label+': correct card heading');
  const photos=[...card.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  assert.equal(photos.length,1,label+': one photo per card');
  assert.match(photos[0],new RegExp('/assets/glazing-choice-v2/'+key+'-balcony\\.webp'),label+': preserve the '+key+' photo');
  assert.match(photos[0],/\bwidth="1536"[^>]*\bheight="1024"/,label+': preserve landscape dimensions');
  assert.match(photos[0],/\balt="[^"]+"/,label+': descriptive photo alt text');
  const features=card.match(/<ul class="glazing-choice-features">[\s\S]*?<\/ul>/)?.[0];
  assert.ok(features,label+': benefits list exists');
  assert.equal([...features.matchAll(/<li>/g)].length,3,label+': three concise benefits');
  assert.equal([...features.matchAll(/<svg\b/g)].length,3,label+': three native benefit icons');
  assert.doesNotMatch(card,/undefined|null/,label+': no missing icon or content');
  const ctas=[...card.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0]);
  assert.equal(ctas.length,1,label+': one calculation button per choice');
  assert.match(ctas[0],/class="button glazing-choice-cta button-no-icon"[^>]*type="button"[^>]*data-quiz-open/,label+': button uses the existing calculation form');
  assert.match(ctas[0],/>Рассчитать стоимость<\/span>/,label+': clear button label');
  const price=card.match(/<p class="glazing-choice-price">[\s\S]*?<\/p>/)?.[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  assert.equal(price,'от '+prices[key].toLocaleString('ru-RU').replace(/\s+/g,' ')+' ₽ /м²',label+': confirmed '+key+' glazing rate');
 }
 assert.match(cards[0],/Для сезонного использования[\s\S]*Хранение вещей[\s\S]*Алюминиевый профиль с одинарным стеклом/,label+': seasonal use and cold system');
 assert.match(cards[1],/Комфорт круглый год[\s\S]*С утеплением и источником обогрева[\s\S]*ПВХ-профиль со стеклопакетом/,label+': warm system and heating condition');
 assert.doesNotMatch(block,/glazing-choice-(?:condition|note|price-note|load-note)|Зимой не обеспечивает комнатный комфорт|Одних окон недостаточно: нужны утепление и обогрев|Цены за остекление\. Утепление, отделка и обогрев рассчитываются отдельно после замера|Конструкцию и допустимую нагрузку подбираем после осмотра основания/,label+': requested notes and their accessibility references were removed');
 return block;
};

assertGlazingChoice(homeHtml,'Home source');

const publishedConsultationServices=services.filter(service=>!['balkon-pod-klyuch',...bundledServiceSlugs].includes(service.slug));
assert.equal(publishedConsultationServices.length,19,'Every published service route needs consultation coverage');
const consultationPages=services.map(service=>[service.slug,servicePageWithSeo(service),service]);
const quizSection=html=>html.match(/<section\b(?=[^>]*\bid="quiz")[^>]*>[\s\S]*?<\/section>/)?.[0];
for(const [label,html,service] of consultationPages){
 assert.doesNotMatch(html,/\bdata-inline-estimate\b|\bproject-estimate-section\b/,label+': the new calculation block is exclusive to the home page');
 const blocks=[...html.matchAll(/<section\b(?=[^>]*\bid="quiz")[^>]*>[\s\S]*?<\/section>/g)];
 assert.equal(blocks.length,1,label+': keep one existing consultation block');
 const withGift=service.slug==='holodnoe-osteklenie';
 assert.equal(blocks[0][0],quiz(service,{consultation:true,withGift}),label+': retain the service-specific consultation');
 assert.doesNotMatch(blocks[0][0],/data-estimate-stage|data-estimate-preview/,label+': keep the consultation layout');
 if(withGift){
  assert.match(blocks[0][0],/data-total-steps="4"/,label+': the gift has a separate step before contacts');
  assert.equal((blocks[0][0].match(/name="gift"/g)||[]).length,4,label+': offer four promotional gifts');
 }else assert.doesNotMatch(blocks[0][0],/name="gift"/,label+': other service questions remain unchanged');
}
const inlineEstimatePages=[['home',homeHtml]];
assert.equal(inlineEstimatePages.length,1,'Only the home page uses the new calculation quiz');
const estimateAttributes=tag=>Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:value]));
for(const [label,html] of inlineEstimatePages){
 const forms=[...html.matchAll(/<form\b(?=[^>]*\bdata-inline-estimate\b)[^>]*>[\s\S]*?<\/form>/g)];
 assert.equal(forms.length,1,label+': exactly one inline estimate');
 const form=forms[0][0],formAttributes=estimateAttributes(form.match(/^<form\b([^>]*)>/)[1]);
 assert.equal(formAttributes['data-lead-form'],'quiz',label+': preserve the lead endpoint contract');
 const knownObject=/<input\b(?=[^>]*\btype="hidden")(?=[^>]*\bname="object")[^>]*>/.test(form);
 const stages=[...form.matchAll(/<fieldset\b([^>]*)>([\s\S]*?)<\/fieldset>/g)].map(([,tag,body])=>({attributes:estimateAttributes(tag),body}));
 for(const stage of stages.slice(0,-1)){const radios=[...stage.body.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>estimateAttributes(tag)).filter(input=>input.type==='radio');assert.ok(radios.length,label+': answer choices are present');assert.deepEqual(radios.filter(input=>input.checked),[radios[0]],label+': default to only the first choice in every step');}
 const expectedStages=[...knownObject?[]:['object'],'goal','timing','gift','contact'];
 assert.equal(Number(formAttributes['data-total-steps']),expectedStages.length,label+': known objects shorten the quiz');
 assert.deepEqual(stages.map(stage=>stage.attributes['data-estimate-stage']),expectedStages,label+': preserve the ordered calculation stages');
 assert.deepEqual(stages.map(stage=>stage.attributes['data-step']),expectedStages.map((_,index)=>String(index)),label+': preserve consecutive navigation');
 assert.deepEqual(stages.map(stage=>Object.hasOwn(stage.attributes,'hidden')),expectedStages.map((_,index)=>index!==0),label+': only the first step starts visible');
 for(const name of ['service','object','timing','detail','gift','name','phone','consent'])assert.ok(form.includes('name="'+name+'"'),label+': preserve '+name);
 const giftStage=stages.at(-2),finalStage=stages.at(-1);
 assert.equal(finalStage.attributes['data-estimate-stage'],'contact',label+': contacts are the final separate stage');
 for(const stage of stages.slice(0,-2))assert.doesNotMatch(stage.body,/\bname="gift"/,label+': gifts belong to their own step');
 for(const stage of stages.slice(0,-1))assert.doesNotMatch(stage.body,/\bname="(?:name|phone|consent)"/,label+': contacts wait until after the gift choice');
 const gifts=[...giftStage.body.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>estimateAttributes(tag));
 assert.equal(gifts.length,4,label+': four gift choices');
 assert.deepEqual(new Set(gifts.map(input=>input.value)),new Set(['Светильник и розетки','Тёплый пол','Потолочная сушилка','Подарочная карта']),label+': preserve the four gifts');
 assert.ok(gifts.every(input=>input.name==='gift'&&input.type==='radio'&&input.required),label+': the gift step contains only gift choices');
 assert.equal(gifts.find(input=>input.value==='Подарочная карта')['data-estimate-photo'],'gift-4',label+': gift card uses its dedicated preview');
 for(const name of ['name','phone','consent'])assert.ok(finalStage.body.includes('name="'+name+'"'),label+': contact step preserves '+name);
 assert.doesNotMatch(finalStage.body,/\bname="gift"/,label+': contacts do not repeat gifts');
 const section=html.match(/<section\b(?=[^>]*\bproject-estimate-section\b)[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(section,label+': keep the estimate section');
 assert.doesNotMatch(section,/<figcaption\b/i,label+': estimate photos have no captions');
 const previewKeys=[...section.matchAll(/\bdata-estimate-preview="([^"]+)"/g)].map(match=>match[1]);
 for(const [,tag] of form.matchAll(/<input\b([^>]*)>/g)){
  const input=estimateAttributes(tag);
  if(['detail','gift'].includes(input.name)||(input.name==='object'&&input.type==='radio'))assert.ok(input['data-estimate-photo']&&previewKeys.includes(input['data-estimate-photo']),label+': object, goal and gift choices have matching photos');
  if(input.name==='object'&&input.type==='radio')assert.ok(input.required,label+': choosing the object is required');
 }
 const progress=estimateAttributes(form.match(/<progress\b([^>]*)>/)?.[1]||'');
 assert.equal(progress.id,'quiz-progress-inline',label+': preserve distinct inline progress');
 assert.equal(progress.value,'1',label+': start progress at step one');
 assert.equal(Number(progress.max),stages.length,label+': progress covers all stages');
 assert.ok(form.includes('id="step-count-inline"')&&form.includes('Шаг 1 из '+stages.length),label+': show the initial step count');
 const buttons=[...form.matchAll(/<button\b([^>]*)>/g)].map(([,tag])=>estimateAttributes(tag));
 assert.ok(buttons.find(button=>button.class?.split(/\s+/).includes('back-button'))?.disabled,label+': disable back on the first step');
 const initialNext=buttons.find(button=>button.class?.split(/\s+/).includes('quiz-next-button'));assert.ok(initialNext&&!initialNext.disabled,label+': the first selected answer enables Next');
 const submit=buttons.filter(button=>button.type==='submit');
 assert.equal(submit.length,1,label+': one final submit action');
 assert.ok(submit[0].hidden,label+': wait until the contact step before submitting');
 assert.match(html,/\bid="quiz"/,label+': preserve existing estimate links');
}
for(const [label,html] of consultationPages.filter(([label])=>label!=='balkon-pod-klyuch'))assert.ok(!html.includes('id="cold-warm-balcony"'),label+': comparison is exclusive to the published home page');
assert.ok(homeHtml.includes('Получить консультацию'),'home hero must invite visitors to get a consultation');
assert.match(homeHtml,/<section class="container landing-hero home-hero">/,'Home must use its scoped turnkey hero layout');
for(const slug of bundledServiceSlugs)assert.ok(!homeHtml.includes(`href="/${slug}/"`),`Home must not advertise ${slug} as a standalone service`);
const turnkeyHtml=servicePageWithSeo(services.find(service=>service.slug==='balkon-pod-klyuch'));
assert.ok(!turnkeyHtml.includes('id="complex-projects"'),'Removed bundled galleries must stay off the turnkey page');
for(const title of ['Работы в составе проектов под ключ','Мебель в готовых интерьерах','Электрика и освещение в проектах'])assert.ok(!turnkeyHtml.includes(title),`Removed section must stay absent: ${title}`);
assert.match(turnkeyHtml,/id="complex-options"/,'Turnkey page must contain bundled options');
for(const title of ['Крыша над балконом','Мебель для балкона или лоджии','Электрика и освещение'])assert.ok(turnkeyHtml.includes(title),`Turnkey page must contain ${title}`);
// The turnkey overview preserves both portfolios and shares each home block once.
const turnkeyCases=[...turnkeyHtml.matchAll(/data-comparison data-case="([^"]+)"/g)].map(match=>match[1]);
const expectedTurnkeyCases=new Set([...beforeAfterProjects,...serviceBeforeAfterProjects['balkon-pod-klyuch']].map(portfolioCaseId));
assert.equal(turnkeyCases.length,expectedTurnkeyCases.size,'Merged turnkey gallery must contain every work exactly once');
assert.deepEqual(new Set(turnkeyCases),expectedTurnkeyCases,'Home and existing turnkey works must all remain reachable');
const turnkeyAfterPhotos=[...turnkeyHtml.matchAll(/data-after="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(turnkeyAfterPhotos).size,turnkeyAfterPhotos.length,'Merged gallery must not repeat a result photo');
const turnkeyIds=[...turnkeyHtml.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(turnkeyIds).size,turnkeyIds.length,'Merged page must not duplicate form or dialog IDs');
for(const id of ['before-after','quiz','video-process','finishing-styles','finishing-calculator','social-subscribe-title']){
 assert.equal(turnkeyIds.filter(value=>value===id).length,1,'Shared home block must appear once on turnkey: '+id);
 assert.ok(homeHtml.includes('id="'+id+'"'),'Migrating blocks must preserve the home page: '+id);
}
assert.ok(quizSection(homeHtml)&&quizSection(turnkeyHtml),'Home and turnkey must each retain their calculation block');
const turnkeyThermal=turnkeyHtml.match(/<section\b[^>]*class="[^"]*\bthermal-section\b[^"]*"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert.doesNotMatch(homeHtml,/\bthermal-section\b/,'Home must omit the thermal inspection block');
assert.ok(turnkeyThermal,'The service renderer must retain thermal inspection');
const homeWasteSections=[...homeHtml.matchAll(/<section\b(?=[^>]*\bid="waste-removal")[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0]);
assert.equal(homeWasteSections.length,1,'Home must contain the waste removal block once');
const homeWaste=homeWasteSections[0];
for(const [label,html] of [['home',homeHtml],...services.map(service=>[service.slug,servicePageWithSeo(service)])]){
 assert.equal((html.match(/\bid="waste-removal"/g)||[]).length,1,label+': waste removal must appear exactly once');
 assert.match(html,/<section\b[^>]*id="about"[^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id="waste-removal"/,label+': waste removal must immediately follow About');
}
assert.match(homeWaste,/src="\/assets\/site-home\/waste-removal-worker-v3\.webp"/,'Waste removal must use the supplied worker photo');
const heroSection=html=>html.match(/<section\b(?=[^>]*\blanding-hero\b)[^>]*>[\s\S]*?<\/section>/)?.[0];
const homeHero=heroSection(homeHtml),turnkeyHero=heroSection(turnkeyHtml);
assert.ok(homeHero&&turnkeyHero,'Both renderers preserve their hero sections');
assert.equal(homeHtml.replace(homeHero,turnkeyHero).replace(quizSection(homeHtml),''),turnkeyHtml.replace(quizSection(turnkeyHtml),'').replace(turnkeyThermal,''),'Home and turnkey retain shared content outside their hero layout, calculation blocks and thermal difference');
assert.doesNotMatch(renderedGalleries,/class="breadcrumbs"/,'Rendered pages must not restore removed breadcrumbs');
assert.match(homeHtml,/<section class="section container turnkey-extras" id="complex-options">[\s\S]*?<\/section>\s*<section[^>]*id="about"/,'Additional services must immediately precede About');
const homeShell=shellWithQuiz(homeHtml,{path:'/',image:'/assets/'+homeHeroImage});
assert.match(homeShell,/<body class="turnkey-page">/,'Home must use the same layout rules as turnkey');
assert.ok(homeShell.includes('<link rel="canonical" href="'+company.origin+'/">'),'Home must keep its own canonical URL');
const homeQuizModal=homeShell.match(/<dialog class="quiz-modal"[\s\S]*?<\/dialog>/)?.[0];
assert.ok(homeQuizModal?.includes('name="service" value="Под ключ"'),'Home consultation modal must retain the turnkey service');
assert.match(homeQuizModal,/data-total-steps="4"/,'Home consultation modal includes the cold/warm choice');
assert.doesNotMatch(homeQuizModal,/data-inline-estimate/,'Inline estimate must not replace the consultation modal');
const homeGraph=JSON.parse(homeShell.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];
assert.equal(homeGraph.find(item=>item['@type']==='Service')?.url,company.origin+'/','Home service schema must use the root URL');
assert.equal(homeGraph.find(item=>item['@type']==='FAQPage')?.mainEntity.length,serviceSeo['balkon-pod-klyuch'].faq.length,'Home FAQ markup and schema must stay together');
assert.ok(!homeGraph.some(item=>item['@type']==='BreadcrumbList'),'Root must not publish service-page breadcrumbs');
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
  assert.ok(!html.includes('data-hero-slider'),'home turnkey hero must remain static');
  assert.ok(heroSection(html)?.includes('/assets/'+homeHeroImage),'home hero must use the selected reading corner photo');
  continue;
 }
 if(newLandingSlugs.has(label)){
  assert.ok(!html.includes('data-hero-slider'),label+': new landing hero must remain static');
  const selected=projects[0];
  const landingPhoto=html.match(/<div class="landing-photo">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(landingPhoto,label+': missing new landing photo');
  assert.ok(landingPhoto.includes('/assets/'+selected.after),label+': hero must use its own selected AFTER');
  const landingPhotoAlt=landingPhoto.match(/\balt="([^"]+)"/)?.[1];
  assert.ok(landingPhotoAlt?.includes(esc(projectDisplayTitle(selected))),label+': hero alt must describe its selected project');
  assert.ok(!/визуализац/i.test(landingPhotoAlt),label+': hero alt must use neutral customer-facing copy');
  continue;
 }
 if(label==='osteklenie-balkonov'){
  assert.ok(!html.includes('data-hero-slider'),'glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/glazing-new-09-after.jpg'),'glazing hero must show the selected exterior balcony image');
  continue;
 }
 if(label==='remont-balkonov'){assert.ok(html.includes('/assets/home-liked-works-v1/balcony-folding-table-after.webp'));assert.ok(!html.includes('data-hero-slider'));continue;}
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
  assert.ok(html.includes('/assets/cold-hero-sill-v2/hero.webp'),'cold glazing page hero must use the corrected sliding-window image');
  continue;
 }
 if(label==='teploe-osteklenie'){
  assert.ok(!html.includes('data-hero-slider'),'warm glazing page hero must remain static');
  assert.ok(html.includes('/assets/service-before-after/renovation-loggia-02-after.webp'),'warm glazing page hero must keep the selected finished loggia image');
  continue;
 }
 if(['panoramnoe-osteklenie','frantsuzskoe-osteklenie'].includes(label)){
  assert.ok(!html.includes('data-hero-slider'),label+' page hero must remain static');
  const selectedHero=label==='frantsuzskoe-osteklenie'?'glazing-new-06-after.jpg':'panoramic-glazing-after.jpg';
  assert.ok(html.includes('/assets/service-before-after/'+selectedHero),label+' page hero must keep its selected exterior image');
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
const originalHomeProjects=beforeAfterProjects.filter(p=>!p.newPortfolioSeries&&!p.newPerspectiveSeries&&!p.newDiverseSeries&&!p.importedHomeWork&&!p.referenceHomeSeries&&!p.referenceHomeSecondSeries);
assert.equal(originalHomeProjects.length,11,'Home must contain 11 retained primary pairs');
assert.equal(new Set(originalHomeProjects.map(p=>p.after)).size,11,'Home must not repeat rooms');
for(const [type,slug] of [['balcony','balkon-pod-klyuch'],['loggia','lodzhiya-pod-klyuch']]){
 const selected=originalHomeProjects.filter(p=>p.objectType===type);
 assert.equal(selected.length,type==='balcony'?4:7,`Home must retain its approved ${type} pairs`);
 for(const project of selected){
  if(project.title==='Отделка лоджии с узким столом'){
   assert.equal(project.stage,'finish');
   assert.ok(serviceBeforeAfterProjects['otdelka-balkonov'].some(source=>source.before===project.before&&source.after===project.after&&source.title===project.title),'Home must use the selected complete finishing pair');
   continue;
  }
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
const coldGallery=serviceBeforeAfterProjects['holodnoe-osteklenie'].filter(project=>!project.transferredColdGallery&&!project.newAngleSeries&&!project.newPortfolioSeries&&!project.newPerspectiveSeries&&!project.newDiverseSeries);
assert.equal(coldGallery.length,24,'Cold glazing gallery must contain 24 distinct pairs');
assert.equal(coldGallery.filter(project=>project.objectType==='balcony').length,12,'Cold glazing must contain twelve balcony examples');
assert.equal(coldGallery.filter(project=>project.objectType==='loggia').length,12,'Cold glazing must contain twelve loggia examples');
const ordinaryColdAssets=new Set(['service-before-after/cold-balcony-01-after.png','service-before-after/glazing-new-04-after-no-black-handles.png',...Array.from({length:10},(_,i)=>`service-before-after/cold-balcony-matched-${String(i+3).padStart(2,'0')}-after.png`)]);
for(const project of coldGallery){
 if(project.objectType==='balcony')assert.ok(ordinaryColdAssets.has(project.after),`Unexpected cold balcony asset: ${project.after}`);
 if(project.objectType==='loggia')assert.match(project.after==='service-before-after/work195-top-v2-after.webp'?'service-before-after/cold-loggia-graphite-fixed-after.png':project.after,/^service-before-after\/(?:cold-ordinary-(?:0[3-9]|1[01])-after\.webp|cold-loggia-(?:graphite-fixed|finished-1[12])-after\.png)$/,'Unexpected cold loggia asset');
 assert.ok(!/панорам/i.test(project.title+' '+project.description),'Panoramic example in ordinary cold glazing gallery');
}
const coldLoggias=serviceBeforeAfterProjects['holodnoe-osteklenie-lodzhii'];
assert.equal(coldLoggias.length,12,'Cold loggia gallery must contain 12 distinct finished interiors');
for(const project of coldLoggias){
 assert.equal(project.objectType,'loggia');
 assert.match(project.after==='service-before-after/work195-top-v2-after.webp'?'service-before-after/cold-loggia-graphite-fixed-after.png':project.after,/^service-before-after\/(?:cold-ordinary-(?:0[3-9]|1[01])-after\.webp|cold-loggia-(?:graphite-fixed|finished-1[12])-after\.png)$/,'Unreviewed or panoramic image in cold loggias');
 if(project.after.includes('cold-ordinary-'))assert.equal(project.before,project.after.replace('-after.webp','-before.webp'),'Loggia must keep its matched before image');
}
for(const [slug,type,stage] of [['otdelka-balkonov','balcony','finish'],['otdelka-lodzhii','loggia','finish'],['balkon-pod-klyuch','balcony','turnkey'],['lodzhiya-pod-klyuch','loggia','turnkey']]){
 const gallery=serviceBeforeAfterProjects[slug].filter(project=>project.objectType===type&&!project.turnkeyExpansion&&!project.newAngleSeries&&!project.newPortfolioSeries&&!project.newPerspectiveSeries&&!project.newDiverseSeries&&!project.referenceFinishSeries&&!project.referenceTurnkeySeries&&!project.referenceFinishExpansionSeries&&!project.referenceFinishSecondSeries&&!project.referenceFinishThirdSeries&&!project.referenceFinishFourthSeries);
 const expectedCount=slug==='balkon-pod-klyuch'?15:slug==='otdelka-balkonov'?13:type==='loggia'?10:12;
 assert.equal(gallery.length,expectedCount,`${slug}: unexpected pair count`);
 assert.equal(new Set(gallery.map(p=>p.after)).size,expectedCount,`${slug}: duplicate rooms`);
 gallery.filter(p=>!['gallery-angles-v1/balkon-pod-klyuch-3-after.webp','owner-projects/balcony-office-after.webp','turnkey-loft-v3/after.webp','turnkey-office-low-v1/after.webp','turnkey-books-v1/after.webp','turnkey-green-v2/after.webp'].includes(p.after)).forEach(p=>{
  const reviewedAfter=p.after==='window-details-v2/balcony-04-handle-next-sash-v3.webp'?'window-details-v2/balcony-04-handle-next-sash-v3.webp':p.after==='portfolio-floor-work73-v1/after-chair-v2.webp'?'service-before-after/renovation-balcony-09-after.webp':['portfolio-diverse-v4/work10-low-v1-after.webp','portfolio-diverse-v4/work10-empty-v2-after.webp','portfolio-before-geometry-v1/work10-after-level-v3.webp'].includes(p.after)?'service-before-after/renovation-balcony-05-after.webp':p.after==='service-before-after/renovation-loggia-11-after-one-handle-v2.webp'?'service-before-after/renovation-loggia-11-after.webp':['service-before-after/work71-top-folding-v2-after.webp','portfolio-perspectives-v3/work71-brick-v3-after.webp'].includes(p.after)?'service-before-after/renovation-balcony-07-after.webp':['service-before-after/renovation-loggia-07-after-junction-v2.webp','service-before-after/renovation-loggia-07-after-countertop-v3.webp'].includes(p.after)?'service-before-after/renovation-loggia-07-after.webp':p.after;
  const sourceNumber=reviewedAfter==='window-details-v2/balcony-04-handle-next-sash-v3.webp'?4:Number(reviewedAfter.match(/renovation-(?:balcony|loggia)-(\d{2})-after\.webp$/)?.[1]);
  assert.ok(sourceNumber,`${slug}: unexpected finished room`);
  const key=`service-before-after/renovation-${type}-${String(sourceNumber).padStart(2,'0')}`;
  assert.equal(p.objectType,type);
  assert.equal(p.stage,stage);
  const expectedBefore=type==='loggia'&&sourceNumber===11?'window-details-v2/old-window-clean.webp':`${key}-finish-before.webp`;
  const hardwareAdjustedBefore=beforeHardwareReplacements[expectedBefore] || expectedBefore;
  const expectedGalleryBefore=finishBeforeLatchReplacements[hardwareAdjustedBefore] || hardwareAdjustedBefore;
  assert.equal(p.before==='portfolio-floor-work73-v1/before.webp'?'before-hardware-v4/finish-turnkey-009-no-hardware.png':['portfolio-diverse-v4/work10-low-v1-before.webp','portfolio-before-geometry-v1/work10-before-level-v3.webp'].includes(p.before)?'before-hardware-v4/finish-turnkey-005-no-hardware.png':['service-before-after/work71-top-folding-v2-before.webp','portfolio-perspectives-v3/work71-brick-v4-before.webp'].includes(p.before)?'before-hardware-v4/finish-turnkey-007-no-hardware.png':p.before,expectedGalleryBefore,`${slug}: before must show the matched room with worn finishes, not bare concrete`);
  assert.equal(reviewedAfter,type==='balcony'&&sourceNumber===4?'window-details-v2/balcony-04-handle-next-sash-v3.webp':`${key}-after.webp`,`${slug}: wrong after room`);
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
for(const [slug,expectedCount] of [['osteklenie-balkonov',12],['uteplenie-balkonov',7],['otdelka-balkonov',23],['balkon-pod-klyuch',31]]){
 const gallery=serviceBeforeAfterProjects[slug].filter(p=>!p.newPortfolioSeries&&!p.newPerspectiveSeries&&!p.newDiverseSeries&&!p.referenceFinishSeries&&!p.referenceTurnkeySeries&&!p.referenceFinishExpansionSeries&&!p.referenceFinishSecondSeries&&!p.referenceFinishThirdSeries&&!p.referenceFinishFourthSeries);
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
const responsiveImages=JSON.parse(await readFile('src/responsive-images.json','utf8'));
for(const name of ['cold-balcony','warm-balcony']){
 const asset='/assets/glazing-choice-v2/'+name+'.webp',entry=responsiveImages[asset];
 assert.ok(entry,'Comparison photo needs responsive variants: '+name);
 assert.equal(entry.src,asset,'Comparison photo keeps its selected full-size source');
 assert.equal(entry.width,1536,'Comparison photo source width');
 assert.equal(entry.height,1024,'Comparison photo source height');
 assert.deepEqual(entry.variants.map(variant=>variant.width),[320,640,1280,1536],'Comparison photo covers mobile and high-density desktop screens');
}
const root=resolve('dist');
const base=process.env.SITE_BASE_PATH||'/';
const staticOnly=process.env.SITE_STATIC_ONLY==='true';
await checkFaq({root,basePath:base,staticOnly});
const retiredPortfolioSlugs=['nashi-raboty','nashi-raboty/lodzhiya-v-golubom','nashi-raboty/lodzhiya-na-anohina','nashi-raboty/lodzhiya-v-himkah'];
const retiredPortfolioRoutes=new Set(retiredPortfolioSlugs);
const routeSlug=path=>path.replace(/^\//,'').replace(/(?:\/index\.html|\/)?$/,'');
const redirectTargets=new Map([
 ['balkon-pod-klyuch','/'],
 ...bundledServiceSlugs.map(slug=>[slug,'/#complex-options']),
 ['osteklenie-lodzhii','/osteklenie-balkonov/'],
 ['uteplenie-lodzhii','/uteplenie-balkonov/'],
 ['otdelka-lodzhii','/otdelka-balkonov/'],
 ['lodzhiya-pod-klyuch','/'],
 ['holodnoe-osteklenie-lodzhii','/holodnoe-osteklenie/'],
 ['teploe-osteklenie-lodzhii','/teploe-osteklenie/'],
 ['panoramnoe-osteklenie-lodzhii','/panoramnoe-osteklenie/'],
 ...retiredPortfolioSlugs.map(slug=>[slug,'/#before-after'])
]);
for(const slug of redirectTargets.keys())await stat(join(root,slug,'index.html'));
if(!staticOnly){
 const htaccess=await readFile(join(root,'.htaccess'),'utf8');
 const escapePattern=value=>value.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
 for(const [slug,target] of redirectTargets){
  const destination=company.origin.replace(/\/$/,'')+target;
  const rewriteRule=' RewriteRule ^'+escapePattern(slug)+'(?:/index\\.html|/)?$ ';
  assert.ok(htaccess.includes(rewriteRule+destination+' [R=301,L,NE]'),slug+': Apache must permanently redirect the retired route');
  if(target.includes('#'))assert.ok(htaccess.includes(' RewriteCond %{QUERY_STRING} !^$\n'+rewriteRule+destination.replace('#','?%{QUERY_STRING}#')+' [R=301,L,NE]'),slug+': Apache must preserve campaign parameters before the destination anchor');
  assert.ok(htaccess.indexOf(rewriteRule)<htaccess.indexOf(' RewriteCond %{THE_REQUEST}'),slug+': retired route must redirect before index and host normalization');
  assert.ok(htaccess.includes('RedirectMatch 301 "^'+escapePattern(base+slug)+'(?:/index\\.html|/)?$" "'+destination+'"'),slug+': hosts without mod_rewrite need the permanent redirect fallback');
 }
}
async function walk(dir){const files=[];for(const ent of await readdir(dir,{withFileTypes:true})){const path=join(dir,ent.name);files.push(...ent.isDirectory()?await walk(path):[path]);}return files;}
const files=await walk(root),pages=files.filter(f=>f.endsWith('.html'));let refs=0;
const titles=new Map(),descriptions=new Map(),canonicals=new Map(),indexedCanonicals=new Set(),contentCanonicals=new Set(),contentFiles=new Set(),pageHtml=new Map();
for(const file of pages){
 const html=await readFile(file,'utf8'),isRedirect=html.includes('http-equiv="refresh"'),isNoindex=html.includes('name="robots" content="noindex');
 if(!isRedirect){
  assert.equal([...html.matchAll(/id="retention-modal"/g)].length,1,file+': callback popup on every page');
  const popupStyle=html.match(/<style id="retention-popup-styles">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(popupStyle?.includes('.retention-modal{')&&popupStyle.includes('.retention-phone-field .ui-icon{'),file+': popup styles must travel with HTML');
  assert.ok(popupStyle.includes('max-height:calc(100vh - 24px)')&&popupStyle.includes('.retention-phone-field>.sr-only{'),file+': mobile height fallback and hidden label');
  assert.ok(html.indexOf('id="retention-popup-styles"')>html.indexOf('rel="stylesheet"'),file+': popup rules follow cached main CSS');
  const popup=html.match(/<dialog class="retention-modal"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(popup?.includes('data-lead-form="callback-popup"'),file+': phone-only callback type');
  assert.ok(popup.includes('name="phone"')&&popup.includes('name="consent"'),file+': callback contacts and consent');
  assert.doesNotMatch(popup,/name="name"/,file+': popup must not require a name');
  assert.match(popup,/<svg width="21" height="21" class="ui-icon /,file+': phone icon has intrinsic size without CSS');
  assert.ok(popup.includes('href="tel:'+company.tel+'"'),file+': Callibri-compatible canonical phone');
 }
 checkMarkup(html,file);
 pageHtml.set(file,html);
 // A preview's noindex must not bypass the same content and metadata checks as production.
 const localPath=file.slice(root.length+1).replaceAll('\\','/');
 if(redirectTargets.has(localPath.replace(/\/index\.html$/,'')))assert.ok(isRedirect,file+': retired route must contain only its redirect fallback');
 const isUtilityPage=['privacy/index.html','consent/index.html','404.html'].includes(localPath);
 const isContentPage=!isRedirect&&!isUtilityPage;
 if(isContentPage)contentFiles.add(file);
 const expectedRobots=staticOnly||isRedirect||isUtilityPage?'noindex,follow':'index,follow,max-image-preview:large';
 assert.ok(html.includes('<meta name="robots" content="'+expectedRobots+'">'),file+': wrong robots directive for this build and page type');
 assert.equal((html.match(/\bid="about"/g)||[]).length,isContentPage?1:0,file+': every content page must contain About once');
 assert.equal((html.match(/\bid="waste-removal"/g)||[]).length,isContentPage?1:0,file+': every content page must contain waste removal once');
 if(isContentPage)assert.match(html,/<section\b[^>]*id="about"[^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id="waste-removal"/,file+': waste removal must immediately follow About');
 assert.ok(!/визуализац/i.test(html),file+' must use neutral customer-facing copy, including metadata and image descriptions');
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 assert.match(html,/<html lang="ru"/,'Page language must be Russian: '+file);
 assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file+' must have one H1');
 assert.ok(title&&title.length>=20&&title.length<=90,file+' invalid title length');
 assert.ok(canonical?.startsWith('https://'),file+' invalid canonical');
 if(!isRedirect){
  for(const [,href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)){
   const destination=new URL(href,canonical);
   if(destination.origin!==new URL(company.origin).origin||!destination.pathname.startsWith(base))continue;
   const sitePath=base==='/'?destination.pathname:'/'+destination.pathname.slice(base.length);
   assert.ok(!retiredPortfolioRoutes.has(routeSlug(sitePath)),file+': links must go directly to the home gallery instead of '+href);
  }
 }
 assert.doesNotMatch(html,/class="breadcrumbs"|"@type"\s*:\s*"BreadcrumbList"/,file+' must not publish removed breadcrumbs');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');
 if(isRedirect){
  const slug=file.slice(root.length+1).replaceAll('\\','/').replace(/\/index\.html$/,'');
  const target=redirectTargets.get(slug),destination=base==='/'?target:base+target?.slice(1);
  assert.ok(target,file+' unexpected redirect');
  assert.ok(isNoindex,file+' redirect must remain non-indexable');
  assert.equal(canonical,company.origin.replace(/\/$/,'')+target.split('#')[0],file+' redirect canonical must point to the destination');
  assert.ok(html.includes('content="0;url='+destination+'"'),file+' refresh must point directly to the destination');
  assert.ok(html.includes('href="'+destination+'"'),file+' needs an accessible destination link');
  assert.doesNotMatch(html,/data-comparison|landing-hero|<script[^>]+src=|<link[^>]+stylesheet|application\/ld\+json/,file+' redirect must not ship the retired page or its widgets');
 }else{
  for(const tag of ['name="description"','og:title','application/ld+json'])assert.ok(html.includes(tag),file+' missing '+tag);
  const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(description&&description.length>=60&&description.length<=220,file+' invalid description length');
  assert.ok(!titles.has(title),file+' repeats title from '+titles.get(title));
  assert.ok(!canonicals.has(canonical),file+' repeats canonical from '+canonicals.get(canonical));
  titles.set(title,file);canonicals.set(canonical,file);
  if(isContentPage){assert.ok(!descriptions.has(description),file+' repeats content description');descriptions.set(description,file);contentCanonicals.add(canonical);}
  if(!isNoindex)indexedCanonicals.add(canonical);
  for(const tag of ['property="og:image"','property="og:image:alt"','name="twitter:card"','name="twitter:image"','hreflang="ru-RU"','hreflang="x-default"'])assert.ok(html.includes(tag),file+' missing '+tag);
  for(const [,imageUrl] of html.matchAll(/<meta (?:property="og:image"|name="twitter:image") content="([^"]+)"/g)){
   const imagePath=new URL(imageUrl).pathname;
   await stat(join(root,base==='/'?imagePath:imagePath.slice(base.length-1)));
  }
  const jsonLd=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert.ok(jsonLd,file+' missing JSON-LD');
  const schema=JSON.parse(jsonLd);assert.ok(Array.isArray(schema['@graph']),file+' JSON-LD must use @graph');
  const schemaTypes=schema['@graph'].flatMap(item=>Array.isArray(item['@type'])?item['@type']:[item['@type']]);
  for(const type of ['HomeAndConstructionBusiness','WebSite','WebPage'])assert.ok(schemaTypes.includes(type),file+' missing '+type+' schema');
  if(html.includes('service-page-faq')){assert.ok(schemaTypes.includes('Service'),file+' missing Service schema');assert.ok(schemaTypes.includes('FAQPage'),file+' missing FAQPage schema');}
  if(html.includes('case-intro'))assert.ok(schemaTypes.includes('Article'),file+' missing Article schema');
  const webpage=schema['@graph'].find(item=>item['@type']==='WebPage');
  assert.equal(webpage.url,canonical,file+' WebPage schema must use the canonical URL');
  for(const service of schema['@graph'].filter(item=>item['@type']==='Service'))assert.equal(service.url,canonical,file+' Service schema must use the canonical URL');
 }
 for(const match of html.matchAll(/<img\s[^>]+>/g)){
  if(match[0].includes('src="https://mc.yandex.ru/watch/113425011"')){assert.ok(match[0].includes('alt=""'),'tracking pixel must have empty alt');continue;}
  if(match[0].includes('class="final-cta-background"')){
   assert.match(match[0],/\salt=""/,'decorative footer photo must have empty alt');
   for(const attribute of ['role="presentation"','aria-hidden="true"','loading="lazy"','decoding="async"'])assert.ok(match[0].includes(attribute),'decorative footer photo missing '+attribute);
  }else if(match[0].includes('class="gift-3d-fallback"')){
   assert.match(match[0],/\salt=""/,'decorative gift image must have empty alt');
   for(const attribute of ['role="presentation"','aria-hidden="true"'])assert.ok(match[0].includes(attribute),'decorative gift image missing '+attribute);
  }else assert.ok(/\salt="[^"]+"/.test(match[0]),'image alt missing');
  assert.ok(/width=/.test(match[0])&&/height=/.test(match[0]),'image dimensions missing');
 }
 // Additional services show static illustrations, without portfolio modal triggers.
 const extrasHtml=html.match(/<section class="section container turnkey-extras" id="complex-options">[\s\S]*?<\/section>/)?.[0]||'';
 if(extrasHtml){assert.equal((extrasHtml.match(/class="turnkey-extra-media"/g)||[]).length,3,file+' must feature three static extra service illustrations');assert.ok(!/data-comparison|data-case=|<button/.test(extrasHtml),file+' additional services must not open portfolio comparisons');}
 const galleryHtml=html.replace(extrasHtml,'');
 for(const [,asset] of galleryHtml.matchAll(/data-(?:before|after)="([^"]+)"/g)){
  assert.ok(asset.startsWith('assets/'),file+' comparison must use a local image');
  await stat(join(root,asset));
  assert.ok(!responsiveImages['/'+asset]||responsiveImages['/'+asset].src==='/'+asset,file+' comparison still loads an unoptimized source');
 }
 const comparisonPairs=[...galleryHtml.matchAll(/data-before="([^"]+)" data-after="([^"]+)"/g)].map(match=>match[1]+'|'+match[2]);
 if(html.includes('service-page-faq'))assert.ok(comparisonPairs.length>=1,file+' must have relevant before/after examples');
 if(comparisonPairs.length)assert.equal(new Set(comparisonPairs).size,comparisonPairs.length,file+' repeats before/after images');
 for(const m of html.matchAll(/\s(?:href|src|poster|data-(?:src|poster|mobile-src|mobile-poster))="([^"<>]+)"/g)){
  const url=m[1];if(!url.startsWith('/')&&!url.startsWith('#'))continue;
  const [pathWithQuery,fragment]=url.split('#'),path=pathWithQuery.split('?')[0];
  if(path&&base!=='/'&&!path.startsWith(base))assert.fail(file+' uses path outside Pages base: '+url);
  const sitePath=base==='/'?path:'/'+path.slice(base.length);
  if(isContentPage)assert.notEqual(sitePath,'/balkon-pod-klyuch/',file+' must link directly to the root instead of the retired page');
  let target=path?join(root,base==='/'?path:path.slice(base.length-1)):file;
  try{if((await stat(target)).isDirectory())target=join(target,'index.html');await stat(target);}catch{assert.fail(file+' missing '+url);}
  if(fragment){const content=await readFile(target,'utf8');assert.ok(content.includes('id="'+fragment+'"'),file+' missing anchor '+url);}
  refs++;
 }
}
// Every current content page is reachable through ordinary HTML links.
const reachableFiles=new Set([join(root,'index.html')]),pendingFiles=[join(root,'index.html')];
while(pendingFiles.length){
 const file=pendingFiles.shift(),html=pageHtml.get(file)||'';
 for(const [,href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)){
  if(!href.startsWith(base))continue;
  const path=href.split(/[?#]/)[0],sitePath=base==='/'?path:'/'+path.slice(base.length);
  const target=join(root,sitePath.endsWith('/')?sitePath+'index.html':sitePath);
  if(pageHtml.has(target)&&!reachableFiles.has(target)){reachableFiles.add(target);pendingFiles.push(target);}
 }
}
for(const file of contentFiles)assert.ok(reachableFiles.has(file),file+': content page is orphaned from the home page');
for(const page of pages){const html=pageHtml.get(page);for(const match of html.matchAll(/srcset="([^"]+)"/g)){for(const candidate of match[1].split(',')){const url=candidate.trim().split(/\s+/)[0];if(url.startsWith('/'))await stat(join(root,base==='/'?url:url.slice(base.length-1)));}}}
const feed=await readFile(join(root,'yandex-direct.xml'),'utf8');
assert.ok(!/визуализац/i.test(feed),'Published advertising descriptions must use neutral customer-facing copy');
// Every commercial header destination has one product and one matching catalog entry.
const feedRoot=company.origin.replace(/\/$/,'');
const headerFeedUrls=new Set([...header('/').matchAll(/href="(\/[^"#?]*)"/g)].map(match=>feedRoot+match[1]));
const feedFields=['url','picture','name','description'];
const readFeedEntry=(id,body)=>({id,...Object.fromEntries(feedFields.map(field=>[field,body.match(new RegExp(`<${field}>([^<]+)</${field}>`))?.[1]]))});
const feedOffers=[...feed.matchAll(/<offer id="([^"]+)"[^>]*>([\s\S]*?)<\/offer>/g)].map(([,id,body])=>{
 assert.ok(body.includes(`<categoryId>${id}</categoryId>`)&&body.includes(`<collectionId>${id}</collectionId>`),'Feed product must retain its category and collection: '+id);
 return readFeedEntry(id,body);
});
const feedCollections=[...feed.matchAll(/<collection id="([^"]+)">([\s\S]*?)<\/collection>/g)].map(([,id,body])=>readFeedEntry(id,body));
for(const [label,entries] of [['products',feedOffers],['catalogs',feedCollections]]){
 assert.equal(entries.length,headerFeedUrls.size,'Feed '+label+' must cover all header services and home');
 assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length,'Feed '+label+' IDs must be unique');
 assert.deepEqual(new Set(entries.map(entry=>entry.url)),headerFeedUrls,'Feed '+label+' destinations must match the header');
 for(const entry of entries)for(const field of feedFields)assert.ok(entry[field],'Missing feed '+field+': '+entry.id);
}
assert.deepEqual(feedCollections,feedOffers,'Product and catalog records must have matching IDs, content and images');
const feedDescriptionIntents={
 101:[/остеклен/i,/балкон|лоджи/i],107:[/холодн/i,/остеклен/i,/балкон|лоджи/i],
 108:[/тёпл/i,/остеклен/i,/балкон|лоджи/i],109:[/панорамн/i,/остеклен/i,/балкон|лоджи/i],
 110:[/французск/i,/остеклен/i,/балкон|лоджи/i],102:[/утеплен/i,/балкон|лоджи/i],
 103:[/отделк/i,/балкон|лоджи/i],111:[/ремонт/i,/балкон|лоджи/i],
 104:[/балкон|лоджи/i,/под ключ/i,/остеклен/i,/утеплен/i,/отделк/i],
 106:[/остеклен/i,/коттедж/i,/дом/i],112:[/остеклен/i,/балкон/i,/вынос/i],
 113:[/раздвижн/i,/остеклен/i,/балкон|лоджи/i],114:[/остеклен/i,/балкон/i,/хрущёв/i],
 115:[/отделк/i,/балкон|лоджи/i,/ПВХ-панел/i],116:[/отделк/i,/стен/i,/балкон|лоджи/i,/ламинат/i],
 117:[/отделк/i,/балкон|лоджи/i,/вагонк/i],118:[/пол[ауы]?(?=\s|[.,:;]|$)/i,/балкон|лоджи/i,/кварцвинил/i],
 119:[/отделк/i,/балкон|лоджи/i,/стеновым паркетом/i,/лип[аы]/i],
 120:[/отделк/i,/балкон|лоджи/i,/МДФ-панел/i],121:[/объединен/i,/балкон|лоджи/i,/комнат/i]
};
assert.equal(new Set(feedOffers.map(entry=>entry.description)).size,feedOffers.length,'Different services must retain distinct advertising descriptions');
for(const entry of feedOffers){
 assert.ok(entry.description.length<=81,'Advertising description including the price must fit the manual text limit: '+entry.id);
 const serviceCopy=entry.description.split(' Цена от ')[0];
 assert.ok(feedDescriptionIntents[entry.id],'Every feed service needs an intent check: '+entry.id);
 for(const intent of feedDescriptionIntents[entry.id])assert.match(serviceCopy,intent,'Advertising copy must explicitly name its service and object: '+entry.id);
}
// Keep structured and advertising minimum prices tied to the actual first screen.
let pricedFeedOffers=0;
for(const entry of feedOffers){
 const slug=entry.url===feedRoot+'/'?'balkon-pod-klyuch':entry.url.slice(feedRoot.length).split('/')[1];
 const html=await readFile(join(root,slug==='balkon-pod-klyuch'?'':slug,'index.html'),'utf8');
 const hero=html.match(/<p class="landing-price">(.*?)<\/p>/)?.[1];
 const schemaNodes=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match=>JSON.parse(match[1])['@graph']||[]);
 const serviceNodes=schemaNodes.filter(node=>node['@type']==='Service');
 assert.equal(serviceNodes.length,1,'Each commercial page needs one structured service: '+slug);
 assert.equal(serviceNodes[0].url,entry.url,'Structured and advertising services must retain the same destination: '+slug);
 const structuredOffer=serviceNodes[0].offers;
 const body=feed.match(new RegExp(`<offer id="${entry.id}"[^>]*>([\\s\\S]*?)<\\/offer>`))[1];
 const price=body.match(/<price\b([^>]*)>([^<]+)<\/price>/);
 if(!hero){
  assert.equal(price,null,'Do not invent an advertising price absent from the landing: '+slug);
  assert.doesNotMatch(body,/<(?:currencyId|sales_notes)>/,'Unpriced services must not carry pricing fields: '+slug);
  assert.equal(structuredOffer,undefined,'Do not invent a structured offer when no price is published: '+slug);
  continue;
 }
 const amount=Number(hero.match(/<span class="hero-price-amount">([^<]*)<\/span>/)?.[1].replace(/\D/g,''));
 assert.ok(amount>0,'Landing must expose a positive starting amount: '+slug);
 assert.ok(hero.replace(/<[^>]*>/g,'').startsWith('от '),'Landing amount is a starting price: '+slug);
 assert.ok(price,'Advertising price is required when published on the landing: '+slug);
 assert.equal(price[1],' from="true"','Advertising price must retain the minimum-price qualifier: '+slug);
 assert.equal(Number(price[2]),amount,'Advertising amount must match the landing hero: '+slug);
 assert.match(body,/<currencyId>RUB<\/currencyId>/,'Advertising currency is RUB: '+slug);
 const perSquareMetre=/<small class="hero-price-unit">\/м²<\/small>/.test(hero);
 assert.equal(structuredOffer?.['@type'],'Offer','Published starting price needs a structured offer: '+slug);
 assert.equal(structuredOffer.url,entry.url,'Structured offer must point to its commercial page: '+slug);
 assert.equal(structuredOffer.priceCurrency,'RUB','Structured offer currency is RUB: '+slug);
 assert.equal(structuredOffer.price,undefined,'A starting rate must not be advertised as a fixed structured price: '+slug);
 const specification=structuredOffer.priceSpecification;
 assert.equal(specification?.['@type'],perSquareMetre?'UnitPriceSpecification':'PriceSpecification','Structured unit must match the visible starting rate: '+slug);
 assert.equal(specification.minPrice,amount,'Structured minimum price must be a number matching the visible hero and feed: '+slug);
 assert.equal(specification.price,undefined,'Structured starting rate must retain its minimum-price meaning: '+slug);
 assert.equal(specification.priceCurrency,'RUB','Structured price currency is RUB: '+slug);
 assert.equal(specification.unitText,perSquareMetre?'м²':undefined,'Only a rate per square metre may carry the square-metre unit: '+slug);
 assert.equal(body.includes('<sales_notes>Цена за 1 м²</sales_notes>'),perSquareMetre,'Advertising unit must match the landing: '+slug);
 assert.ok(entry.description.includes(`Цена от ${amount.toLocaleString('ru-RU')} ₽${perSquareMetre?'/м²':''}.`),'Description must preserve the minimum amount and unit: '+slug);
 pricedFeedOffers++;
}
assert.equal(pricedFeedOffers,18,'Only the 18 services with published starting prices may carry an advertising price');
for(const [,body]of feed.matchAll(/<collection id="[^"]+">([\s\S]*?)<\/collection>/g))assert.doesNotMatch(body,/<(?:price|currencyId|sales_notes)\b/,'Catalogs must keep their supported descriptive fields');
for(const [id,path] of Object.entries({101:'/osteklenie-balkonov/',102:'/uteplenie-balkonov/',103:'/otdelka-balkonov/',104:'/',106:'/osteklenie-kottedzhej/',107:'/holodnoe-osteklenie/',108:'/teploe-osteklenie/',109:'/panoramnoe-osteklenie/',110:'/frantsuzskoe-osteklenie/',111:'/remont-balkonov/'})){
 assert.equal(feedOffers.find(entry=>entry.id===id)?.url,feedRoot+path,'Existing advertising ID must retain its destination: '+id);
}
for(const script of ['public/app.js',join(root,'app.js')]){
 const appText=await readFile(script,'utf8');
 assert.ok(!/визуализац/i.test(appText),script+' must keep dynamic customer-facing captions neutral');
}
for(const [,picture] of feed.matchAll(/<picture>([^<]+)<\/picture>/g)){
 const imagePath=new URL(picture.replaceAll('&amp;','&')).pathname;
 await stat(join(root,base==='/'?imagePath:imagePath.slice(base.length-1)));
}
const sitemap=staticOnly?'':await readFile(join(root,'sitemap.xml'),'utf8');
if(staticOnly)await assert.rejects(stat(join(root,'sitemap.xml')),/ENOENT/,'Preview must not advertise noindex pages in a sitemap');
const sitemapUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.deepEqual(new Set(sitemapUrls),indexedCanonicals,'sitemap must contain exactly the indexable canonical URLs');
assert.equal(sitemapUrls.length,indexedCanonicals.size,'sitemap must not contain duplicate URLs');
assert.ok(!sitemapUrls.some(url=>url.endsWith('/balkon-pod-klyuch/')),'Retired turnkey route must stay out of the sitemap');
for(const url of sitemapUrls){
 const path=new URL(url).pathname,sitePath=base==='/'?path:'/'+path.slice(base.length);
 assert.ok(!retiredPortfolioRoutes.has(routeSlug(sitePath)),'Retired portfolio routes must stay out of the sitemap: '+url);
}
for(const [section,entry] of [['offer',feed.match(/<offer id="104"[\s\S]*?<\/offer>/)?.[0]],['collection',feed.match(/<collection id="104"[\s\S]*?<\/collection>/)?.[0]]])assert.ok(entry?.includes('<url>'+company.origin.replace(/\/$/,'')+'/</url>'),'Turnkey feed '+section+' must point directly to the root');
assert.ok(!/<(?:lastmod|changefreq|priority)>/.test(sitemap),'sitemap must not publish unverified dates or ignored ranking hints');
const robots=await readFile(join(root,'robots.txt'),'utf8');
assert.ok(!robots.includes(`Disallow: ${base}privacy/`)&&!robots.includes(`Disallow: ${base}consent/`),'noindex legal pages must remain crawlable');
assert.ok(robots.includes('Allow: '+base+'\n'),'Preview and production pages must remain crawlable');
assert.deepEqual([...robots.matchAll(/^Disallow:\s*(.*)$/gm)].map(match=>match[1]),[base+'api/'],'Only the application endpoint may be blocked from crawling');
if(staticOnly){assert.ok(!/^Sitemap:/m.test(robots),'Preview must not submit a sitemap');assert.equal(indexedCanonicals.size,0,'Every preview HTML page must be noindex');}
else{assert.ok(robots.includes('Sitemap: '+company.origin+'/sitemap.xml\n'),'Production must advertise its sitemap');assert.equal(indexedCanonicals.size,contentCanonicals.size,'Production content must stay indexable');}
for(const asset of ['assets/fonts/manrope-variable-cyrillic-ext.woff2','assets/fonts/manrope-variable-cyrillic.woff2','assets/fonts/manrope-variable-latin-ext.woff2','assets/fonts/manrope-variable-latin.woff2','robots.txt','site-config.json',...(!staticOnly?['sitemap.xml']:[])])await stat(join(root,asset));
const searchable=files.filter(file=>/\.(?:html|css|js|json|xml|txt)$/.test(file));const siteText=(await Promise.all(searchable.map(file=>readFile(file,'utf8')))).join('\n').replaceAll('\\','/');for(const asset of files.filter(file=>file.includes(`${join(root,'assets')}`))){const relative=asset.slice(root.length+1).replaceAll('\\','/');assert.ok(siteText.includes(relative),`unused built asset: ${relative}`);}
await assert.rejects(stat(join(root,'styles-extra.css')),/ENOENT/);
for(const file of ['dist/app.js','dist/calculator-scene.js','scripts/build.mjs','scripts/optimize.mjs','public/app.js','public/calculator-scene.mjs','public/calculator-scene-loader.mjs','scripts/server.mjs','scripts/leads.mjs','src/components.mjs','src/content.mjs'])execFileSync(process.execPath,['--check',file]);
for(const source of ['calculator-scene.mjs','calculator-scene-loader.mjs'])await assert.rejects(stat(join(root,source)),/ENOENT/);
const builtApp=await readFile(join(root,'app.js'),'utf8');
assert.match(builtApp,/calculator-scene\.js\?v=[a-f0-9]{12}/,'Lazy calculator module must have a cache version');
const home=await readFile(join(root,'index.html'),'utf8');
for(const [attribute,asset] of [
 ['data-poster','process-poster.webp'],['data-mobile-src','process-work-portrait-v1.mp4'],['data-mobile-poster','process-poster-portrait-v1.webp'],
 ['data-poster','result-poster.webp'],['data-mobile-src','process-result-portrait-v1.mp4'],['data-mobile-poster','result-poster-portrait-v1.webp']
])assert.ok(home.includes(`${attribute}="${base}assets/video/${asset}"`),'Process videos must retain the matching mobile media inside the configured base path: '+asset);
const builtProcessVideos=[...home.matchAll(/<video\b(?=[^>]*\bdata-mobile-src=)[^>]*>/g)].map(match=>match[0]);
assert.equal(builtProcessVideos.length,2,'The two process videos must retain their responsive sources');
for(const video of builtProcessVideos){assert.doesNotMatch(video,/\sposter=/,'Process posters must wait for lazy loading');assert.match(video,/\sdata-poster=/);assert.match(video,/\spreload="none"/);}
const processFallbacks=[...home.matchAll(/<noscript><picture><source\b[^>]*><img\b[^>]*\bclass="process-video-fallback"[^>]*><\/picture><\/noscript>/g)].map(match=>match[0]);
assert.equal(processFallbacks.length,2,'Both process videos must retain a static preview without JavaScript');
for(const fallback of processFallbacks){assert.match(fallback,/media="\(max-width:640px\)"/);assert.match(fallback,/srcset="[^"]+-portrait-v1\.webp"/);assert.match(fallback,/loading="lazy"/);assert.match(fallback,/\salt="[^"]+"/);}
const builtGlazingChoice=assertGlazingChoice(home,'Built home');
assert.equal([...builtGlazingChoice.matchAll(/sizes="\(max-width:760px\) calc\(100vw - 58px\)/g)].length,2,'Both balcony photos follow the single-column breakpoint');
const balconyStyles=await readFile(join(root,'styles.css'),'utf8');
for(const selector of ['.glazing-choice-card--warm .glazing-choice-body','.glazing-choice-card--warm h3','.glazing-choice-card--warm .glazing-choice-icon'])assert.ok(balconyStyles.includes(selector),'Warm balcony accents must survive CSS optimization: '+selector);
for(const photo of builtGlazingChoice.matchAll(/<img\b[^>]*>/g))assert.ok(/\bsrcset="[^"]+"/.test(photo[0])&&/\bsizes="[^"]+"/.test(photo[0]),'Built comparison photos must use responsive sources');
for(const page of pages.filter(page=>page!==join(root,'index.html')))assert.ok(!(await readFile(page,'utf8')).includes('id="cold-warm-balcony"'),'Published comparison belongs only on the home page: '+page);
if(base!=='/'){assert.ok(home.includes(`href="${base}styles.css`));assert.ok(home.includes(`src="${base}app.js`));assert.ok(home.includes(`srcset="${base}assets/`));assert.ok(home.includes(`data-src="${base}assets/`));assert.ok(home.includes(`data-poster="${base}assets/video/process-poster.webp"`));assert.ok(home.includes(`data-poster="${base}assets/video/result-poster.webp"`));assert.ok(home.includes(`href="${base}osteklenie-balkonov/"`));assert.ok(home.includes(`<link rel="canonical" href="https://ulin-roman.github.io${base}"`));const css=await readFile(join(root,'styles.css'),'utf8');assert.ok(css.includes(`${base}assets/fonts/manrope-variable-cyrillic.woff2`));assert.ok(!css.includes("url('/assets/"));assert.ok(!home.includes('srcset="/assets/'));assert.ok(!home.includes('data-src="/assets/'));assert.ok(!home.includes('poster="/assets/'));}
const total=await Promise.all(files.filter(f=>f.endsWith('.webp')).map(f=>stat(f).then(s=>s.size)));
console.log(`PASS: ${pages.length} pages, ${refs} local references, unique metadata, JSON-LD, image alt, no orphan assets, JS syntax. WebP total: ${Math.round(total.reduce((a,b)=>a+b,0)/1024)} KB.`);

// Keep the approved camera views; one panoramic comparison was removed at the user's request.
for(const service of services.filter(s=>!s.landingVariant&&!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newAngleSeries);
 assert.equal(added.length,['panoramnoe-osteklenie','frantsuzskoe-osteklenie'].includes(service.slug) ? 2 : 3,`${service.slug}: approved camera view count`);
 for(const p of added){
  assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);
  assert.ok(originalWindowBefore(p.before).startsWith('gallery-angles-v1/')&&p.after.startsWith('gallery-angles-v1/'));
  assert.notEqual(p.before,p.after);
 }
}

// New series must add three complete labeled comparisons to every active landing.
assert.equal(beforeAfterProjects.filter(p=>p.newPortfolioSeries).length,2);
assert.ok(!beforeAfterProjects.some(p=>p.title==='Балкон под ключ с рабочим столом'),'Removed work must stay out of the home gallery');
for(const service of services.filter(s=>!s.landingVariant&&!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newPortfolioSeries);
 assert.equal(added.length,3,`${service.slug}: expected three new pairs`);
 assert.equal(new Set(added.map(p=>p.after)).size,3);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(originalWindowBefore(p.before).startsWith('portfolio-extra-v2/')&&p.after.startsWith('portfolio-extra-v2/'));}
}

// Approved perspective comparisons: the unwanted turnkey storage pair was removed.
assert.equal(beforeAfterProjects.filter(p=>p.newPerspectiveSeries).length,2);
for(const service of services.filter(s=>!s.landingVariant&&!['krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone'].includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newPerspectiveSeries);
 const expected=["balkon-pod-klyuch","teploe-osteklenie"].includes(service.slug) ? 2 : 3;
 assert.equal(added.length,expected,`${service.slug}: approved perspective pair count`);
 assert.equal(new Set(added.map(p=>p.after)).size,expected);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(originalWindowBefore(p.before).startsWith('portfolio-perspectives-v3/')&&p.after.startsWith('portfolio-perspectives-v3/'));}
}

// New diverse compositions use complete pairs and explicit outcome-based names.
assert.equal(beforeAfterProjects.filter(p=>p.newDiverseSeries).length,2);
for(const service of services.filter(s=>!s.landingVariant&&!bundledServiceSlugs.includes(s.slug))){
 const added=serviceBeforeAfterProjects[service.slug].filter(p=>p.newDiverseSeries);
 const expected=service.slug==='uteplenie-balkonov'?1:service.slug==='osteklenie-balkonov'?2:3; // Selected work-46, work-66 and work-67 were withdrawn from their respective galleries.
 assert.equal(added.length,expected,service.slug+': expected retained diverse pairs');
 assert.equal(new Set(added.map(p=>p.after)).size,expected);
 for(const p of added){assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized&&!p.beforeReal);assert.notEqual(p.before,p.after);assert.ok(originalWindowBefore(p.before).startsWith('portfolio-diverse-v4/')&&p.after.startsWith('portfolio-diverse-v4/'));assert.ok(portfolioDisplayTitles[p.title]);}
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

// Withdraw work-77 from all final galleries and published assets.
for (const gallery of [beforeAfterProjects, ...Object.values(serviceBeforeAfterProjects)]) {
 assert.ok(!gallery.some(project => project.after === 'service-before-after/renovation-loggia-08-after.webp'), 'Withdrawn work-77 must stay out of every gallery');
}
for (const html of [renderHome(), ...services.map(service => servicePageWithSeo(service))]) assert.doesNotMatch(html, /data-case="work-77"|renovation-loggia-08-after|finish-turnkey-020-no-hardware/, 'Withdrawn work-77 must stay off every page');
for (const file of files) assert.doesNotMatch(file, /renovation-loggia-08-after|finish-turnkey-020-no-hardware/, 'Withdrawn work-77 images must not be published');

// The user-selected storage pair must remain first and match its source photographs.
const finishingStorage = serviceBeforeAfterProjects['otdelka-balkonov'][0];
assert.equal(finishingStorage.title, 'Уютный балкон в поперечном ракурсе');
assert.equal(finishingStorage.before, 'gallery-angles-v1/balkon-pod-klyuch-3-before.webp');
assert.equal(finishingStorage.after, 'gallery-angles-v1/balkon-pod-klyuch-3-after.webp');
assert.equal(finishingStorage.stage, 'finish');
assert.equal(serviceBeforeAfterProjects['otdelka-balkonov'].filter(project => project.title === finishingStorage.title).length, 1);

// The rejected workspace must remain absent from all final galleries and rendered pages.
for (const gallery of [beforeAfterProjects, ...Object.values(serviceBeforeAfterProjects)]) {
 assert.ok(!gallery.some(project => project.title === 'Светлый балкон с рабочим местом'), 'Rejected workspace must stay out of every gallery');
}
for (const html of [renderHome(), ...services.map(service => servicePageWithSeo(service))]) {
 assert.doesNotMatch(html, /Балкон, где нашлось место для работы|renovation-balcony-01-after/, 'Rejected workspace must stay off every page');
}

assert.ok(!serviceBeforeAfterProjects['osteklenie-balkonov'].some(project=>project.title==='Балкон с окнами и обновлённым проходом'),'Withdrawn work-46 must stay out of the glazing gallery');

const readingPair=serviceBeforeAfterProjects["otdelka-balkonov"].filter(p=>p.referenceFinishSeries);
assert.equal(readingPair.length,1);
assert.equal(readingPair[0].stage,"finish");
assert.ok(readingPair[0].visualized && readingPair[0].beforeVisualized && readingPair[0].afterVisualized);
assert.notEqual(readingPair[0].before,readingPair[0].after);

for(const [slug,flag,count,stage] of [["balkon-pod-klyuch","referenceTurnkeySeries",8,"turnkey"],["otdelka-balkonov","referenceFinishExpansionSeries",7,"finish"]]){
 const additions=serviceBeforeAfterProjects[slug].filter(p=>p[flag]);
 assert.equal(additions.length,count);
 assert.equal(new Set(additions.map(p=>p.after)).size,count);
 for(const p of additions){assert.equal(p.stage,stage);assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);}
}

const homeReferences=beforeAfterProjects.filter(p=>p.referenceHomeSeries);
assert.equal(homeReferences.length,4);
assert.equal(new Set(homeReferences.map(p=>p.after)).size,4);
for(const p of homeReferences){assert.equal(p.stage,"turnkey");assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);assert.ok(!Object.values(serviceBeforeAfterProjects).some(list=>list.some(item=>item.title===p.title)));}

const panoramaReference=serviceBeforeAfterProjects["panoramnoe-osteklenie"].filter(p=>p.referencePanoramaSeries);
assert.equal(panoramaReference.length,1);
assert.equal(panoramaReference[0].stage,"glazing");
assert.equal(panoramaReference[0].objectType,"balcony");
assert.ok(panoramaReference[0].beforeVisualized&&panoramaReference[0].afterVisualized);
assert.notEqual(panoramaReference[0].before,panoramaReference[0].after);
assert.ok(!beforeAfterProjects.some(p=>p.title===panoramaReference[0].title));

{const additions=serviceBeforeAfterProjects["otdelka-balkonov"].filter(p=>p.referenceFinishSecondSeries);assert.equal(additions.length,8);assert.equal(new Set(additions.map(p=>p.after)).size,8);for(const p of additions){assert.equal(p.stage,"finish");assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);}for(const [slug,items] of Object.entries(serviceBeforeAfterProjects)){if(!["otdelka-balkonov","remont-balkonov"].includes(slug))assert.ok(items.every(p=>!p.referenceFinishSecondSeries));}}

{const additions=serviceBeforeAfterProjects["otdelka-balkonov"].filter(p=>p.referenceFinishThirdSeries);assert.equal(additions.length,3);assert.equal(new Set(additions.map(p=>p.after)).size,3);for(const p of additions){assert.equal(p.stage,"finish");assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);}for(const [slug,items] of Object.entries(serviceBeforeAfterProjects)){if(!["otdelka-balkonov","remont-balkonov"].includes(slug))assert.ok(items.every(p=>!p.referenceFinishThirdSeries));}}

const homeSecondReference=beforeAfterProjects.filter(p=>p.referenceHomeSecondSeries);
assert.equal(homeSecondReference.length,1);
assert.equal(new Set(homeSecondReference.map(p=>p.after)).size,1);
for(const p of homeSecondReference){assert.equal(p.stage,"turnkey");assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);assert.ok(!Object.values(serviceBeforeAfterProjects).some(list=>list.some(item=>item.title===p.title)));}

{const additions=serviceBeforeAfterProjects["otdelka-balkonov"].filter(p=>p.referenceFinishFourthSeries);assert.equal(additions.length,1);assert.equal(new Set(additions.map(p=>p.after)).size,1);for(const p of additions){assert.equal(p.stage,"finish");assert.equal(p.objectType,"balcony");assert.ok(p.visualized&&p.beforeVisualized&&p.afterVisualized);assert.notEqual(p.before,p.after);}for(const [slug,items] of Object.entries(serviceBeforeAfterProjects)){if(!["otdelka-balkonov","remont-balkonov"].includes(slug))assert.ok(items.every(p=>!p.referenceFinishFourthSeries));}}

// Corrected generated before assets stay distinct from originals and all after assets.
assert.equal(Object.keys(beforeWindowCorrections).length,26);
for (const previous of Object.values(beforeWindowCorrections)) {
 const target = beforeGeometryCorrections[previous] || previous;
 const matches = allPhotoPairs.filter(p=>p.before===target);
 assert.ok(matches.length>0, `Unused corrected before: ${target}`);
 assert.ok(matches.every(p=>p.beforeReal!==true && p.beforeVisualized===true), `Only generated before may be corrected: ${target}`);
 assert.ok(!allAfterAssets.has(target), `Before correction must not replace after: ${target}`);
 assert.ok(renderedGalleries.includes(`/assets/${target}`), `Corrected before must appear: ${target}`);
}

assert.equal(Object.keys(beforeGeometryCorrections).length,21);
for (const target of Object.values(beforeGeometryCorrections)) {
 const matches=allPhotoPairs.filter(p=>p.before===target);
 assert.ok(matches.length>0 && matches.every(p=>p.beforeReal!==true && p.beforeVisualized===true));
 assert.ok(!allAfterAssets.has(target));
 assert.ok(renderedGalleries.includes('/assets/'+target));
}

assert.ok(!serviceBeforeAfterProjects['uteplenie-balkonov'].some(p=>['Утепление балкона со скамьёй','Утепление лоджии с рабочим столом'].includes(p.title)),'Withdrawn insulation works 66 and 67 must remain absent');

// Repair intentionally reuses the final finishing gallery and remains a separate service.
assert.deepEqual(serviceBeforeAfterProjects['remont-balkonov'],serviceBeforeAfterProjects['otdelka-balkonov']);
const repairService=services.find(s=>s.slug==='remont-balkonov');
assert.ok(repairService);
assert.match(servicePageWithSeo(repairService),/Ремонт балконов и лоджий/);
assert.doesNotMatch(renderHome(),/data-repair-range|repair-feature-card/);
assert.match(servicePageWithSeo(repairService),/class="landing-photo repair-hero-photo"/);
assert.match(servicePageWithSeo(repairService),/data-repair-range/);

const repairMarkup=servicePageWithSeo(repairService);
const repairConsultation=quizSection(repairMarkup);
assert.ok(repairConsultation?.includes('type="hidden" name="service" value="Ремонт балконов и лоджий"'),'Repair consultation must preserve the repair service');
assert.equal(repairConsultation,quiz(repairService,{consultation:true}),'Repair page must retain its previous consultation block');
const repairQuizModal=quizModal(repairService);
assert.ok(repairQuizModal.includes('Что нужно отремонтировать'),'Repair consultation modal must retain its object question');
assert.ok(!repairQuizModal.includes('Что нужно отделать'),'Repair consultation modal must not use the finishing question');
assert.match(repairMarkup,/Материалы для ремонта балконов и лоджий/);
assert.ok(!/Что нужно отделать|Чем отделываем|>ОТДЕЛКА</.test(repairMarkup),'Repair page must not restore finishing headings or questions');

// The French variant retains its own service and the owner-confirmed panoramic starting rate.
const frenchService=services.find(s=>s.slug==='frantsuzskoe-osteklenie');
assert.ok(frenchService,'French glazing service is registered');
const frenchPage=servicePageWithSeo(frenchService);
assert.match(frenchPage,/Французское остекление/);
assert.ok(frenchPage.includes('name="service" value="Французское остекление"'),'French consultation must retain its service');
assert.ok(frenchPage.includes('Преимущества французского остекления'));
assert.ok(frenchPage.includes('Чем французское остекление отличается от панорамного?'));
assert.ok(!serviceBeforeAfterProjects[frenchService.slug].some(p=>p.title==='Безрамное панорамное остекление'));
assert.equal(frenchService.price,'french');
assert.equal(prices.french,prices.panoramic,'French starting rate matches panoramic glazing');
const panoramicService=services.find(s=>s.slug==='panoramnoe-osteklenie');
const frenchHeroPrice=frenchPage.match(/<p class="landing-price">.*?<\/p>/)?.[0];
assert.ok(frenchHeroPrice,'French hero advertises the confirmed starting rate');
assert.equal(frenchHeroPrice,servicePage(panoramicService).match(/<p class="landing-price">.*?<\/p>/)?.[0],'French and panoramic heroes share price and unit');
const frenchFeedOffer=feed.match(/<offer id="110"[\s\S]*?<\/offer>/)?.[0];
assert.ok(frenchFeedOffer?.includes(`Цена от ${prices.french.toLocaleString('ru-RU')} ₽/м².`),'French feed price agrees with its landing page');
assert.ok(header('/osteklenie-balkonov/').includes('href="/frantsuzskoe-osteklenie/"'),'Glazing navigation links to the French page');
assert.ok(feed.includes('<offer id="110"'));
assert.ok([...contentCanonicals].some(url=>url.endsWith('/frantsuzskoe-osteklenie/')));


// New generated galleries are separate from the previously approved series.
assert.equal(newLandingDefinitions.length,9);
assert.equal(newLandingSlugs.size,9);
const newPairs=newLandingDefinitions.flatMap(definition=>serviceBeforeAfterProjects[definition.slug]);
assert.equal(newPairs.length,54);
for(const key of ['title','before','after'])assert.equal(new Set(newPairs.map(pair=>pair[key])).size,54,'New '+key+' values must be unique');
assert.equal(new Set(newPairs.flatMap(pair=>[pair.before,pair.after])).size,108);
assert.equal(new Set(allPhotoPairs.map(pair=>pair.title)).size,new Set(allPhotoPairs.map(portfolioCaseId)).size,'Public case IDs may not collide');
const confirmedLandingPrices={
 'osteklenie-balkona-s-vynosom':7000,
 'osteklenie-balkona-v-hrushchevke':7000,
 'otdelka-balkona-pvh-panelyami':2500,
 'otdelka-balkona-laminatom':3800,
 'otdelka-balkona-vagonkoj':4000,
 'otdelka-balkona-kvarcvinilom':5700,
 'otdelka-balkona-derevom':6600,
 'razdvizhnoe-osteklenie':7000
};
for(const definition of newLandingDefinitions){
 const service=services.find(service=>service.slug===definition.slug),gallery=serviceBeforeAfterProjects[definition.slug];
 assert.ok(service?.landingVariant);
 assert.equal(gallery.length,6);
 const expectedPrice=confirmedLandingPrices[definition.slug]??null;
 assert.equal(prices[service.price],expectedPrice,'Only confirmed rates may be advertised: '+definition.slug);
 const markup=servicePageWithSeo(service);
 assert.equal((markup.match(/data-comparison /g)||[]).length,6);
 const galleryHeading=markup.match(/\bid="before-after"[\s\S]*?<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1];
 assert.ok(galleryHeading?.replace(/<[^>]*>/g,'').trim(),definition.slug+': project gallery needs a meaningful heading');
 assert.ok(!/визуализац/i.test(markup),definition.slug+': project gallery and landing copy must remain neutral');
 assert.ok(markup.includes('name="service" value="'+esc(service.title)+'"'));
 assert.doesNotMatch(markup,/landing-service-scope|landing-related-services/,definition.slug+' must not render the retired process block');
 const builtMarkup=await readFile(join(root,definition.slug,'index.html'),'utf8');
 const heroPrice=builtMarkup.match(/<p class="landing-price">(.*?)<\/p>/)?.[1];
 const graph=JSON.parse(builtMarkup.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];
 const offer=graph.find(item=>item['@type']==='Service')?.offers;
 if(expectedPrice===null){
  assert.equal(heroPrice,undefined,'Unconfirmed rate must stay absent from the hero');
  assert.equal(offer,undefined,'Unconfirmed rate must stay absent from structured data');
 }else{
  assert.equal(heroPrice?.replace(/<[^>]*>/g,''),'от '+expectedPrice.toLocaleString('ru-RU')+' ₽ /м²','Hero uses the confirmed rate and unit');
  assert.equal(heroPrice?.match(/<span class="hero-price-amount">([^<]*)<\/span>/)?.[1],expectedPrice.toLocaleString('ru-RU')+' ₽','Hero amount and currency remain together');
  assert.match(heroPrice,/<small class="hero-price-unit">\/м²<\/small>/,'Hero unit is preserved');
  assert.equal(offer?.price,undefined,'Structured starting rate must not become a fixed price');
  assert.equal(offer?.priceCurrency,'RUB');
  assert.equal(offer?.priceSpecification['@type'],'UnitPriceSpecification');
  assert.equal(offer?.priceSpecification.minPrice,expectedPrice,'Structured minimum price matches the hero');
  assert.equal(offer?.priceSpecification.price,undefined);
  assert.equal(offer?.priceSpecification.unitText,'м²');
 }
 assert.ok(header('/').includes('href="/'+definition.slug+'/"'));
 assert.ok([...contentCanonicals].some(url=>url.endsWith('/'+definition.slug+'/')));
 assert.equal(serviceSeo[definition.slug].faq.length,4);
 for(const pair of gallery){
  assert.ok(pair.landingSeries&&pair.visualized&&pair.beforeVisualized&&pair.afterVisualized&&!pair.beforeReal&&!pair.afterReal);
  assert.ok(portfolioDisplayTitles[pair.title]);
  assert.match(portfolioCaseId(pair),/^work-(?:32[3-9]|3[3-6][0-9]|37[0-6])$/);
  for(const photo of [pair.before,pair.after])assert.ok(responsiveImages['/assets/'+photo],'Each generated photo needs responsive variants');
 }
}
const mailOptionsPath=join(root,'api/lead-options.json');
if(process.env.SITE_MAIL_FORMS==='true'){
 const options=JSON.parse(await readFile(mailOptionsPath,'utf8'));
 for(const definition of newLandingDefinitions)assert.ok(options.service.includes(definition.title),'PHP must accept '+definition.title);
}
console.log('PASS: nine new landings, 54 unique visualized pairs, 108 responsive sources, navigation and form contexts.');
