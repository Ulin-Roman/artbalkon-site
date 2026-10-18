import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateLead,saveLead} from './leads.mjs';
import {contactFields,quiz,quizModal,shellWithQuiz,inlineEstimate,servicePageWithSeo,home as renderHome} from '../src/components.mjs';
import {services,projects} from '../src/content.mjs';
const valid=()=>({requestId:randomUUID(),name:'Тест формы',phone:'+7 (999) 000-00-00',consent:true,form:'quiz',service:'Холодное остекление балкона',object:'Балкон',timing:'Пока интересуюсь',gift:'Тёплый пол',attribution:{utm_source:'test'}});
test('validates phone, consent, all quiz answers and filters attribution',()=>{const input=valid();input.attribution.secret='must not persist';const lead=validateLead(input);assert.equal(lead.phone,'+79990000000');assert.equal(lead.attribution.secret,undefined);for(const bad of [{consent:false},{phone:'123'},{phone:'+7 (888) 888-88-88'},{phone:'+7 (999) 999-99-99'},{service:'xxx'},{size:' '},{name:' '},{requestId:'../../file'}])assert.throws(()=>validateLead({...input,...bad}));});
test('phone fields show the full mask before JavaScript and accept ten following digits',()=>{const markup=contactFields('phone-consent');assert.match(markup,/name="phone"[^>]*maxlength="18"[^>]*value="\+7 \(___\) ___-__-__"/);assert.match(markup,/inputmode="numeric"/);});
test('all own home and service forms include a visible phone mask, including the automatic popup',()=>{
 for(const html of [shellWithQuiz(renderHome(),{path:'/'}),...services.map(service=>shellWithQuiz(servicePageWithSeo(service),{path:'/'+service.slug+'/'}))]){
  const phones=[...html.matchAll(/<input\b[^>]*\bname="phone"[^>]*>/g)].map(match=>match[0]);
  assert.ok(phones.length>=4);
  for(const phone of phones)assert.match(phone,/\bvalue="\+7 \(___\) ___-__-__"/);
 }
});
test('exact service page skips known object and service questions',()=>{const markup=quiz({slug:'holodnoe-osteklenie-lodzhii'});assert.match(markup,/data-total-steps="2"/);assert.match(markup,/type="hidden" name="object" value="Лоджия"/);assert.match(markup,/type="hidden" name="service" value="Холодное остекление лоджии"/);assert.doesNotMatch(markup,/У вас балкон или лоджия/);assert.doesNotMatch(markup,/type="radio" name="service"/);});
test('combined glazing page asks for the object and glazing type',()=>{const service=services.find(item=>item.slug==='osteklenie-balkonov');const markup=quiz(service);assert.match(markup,/data-total-steps="4"/);assert.match(markup,/Что нужно остеклить/);assert.match(markup,/Какое остекление рассматриваете/);assert.match(markup,/type="radio" name="object"/);assert.match(markup,/type="radio" name="service"/);assert.doesNotMatch(markup,/type="hidden" name="object"/);});
test('service page omits the already known service and uses three steps',()=>{const markup=quiz(services.find(item=>item.slug==='otdelka-balkonov'));assert.match(markup,/data-total-steps="3"/);assert.match(markup,/type="hidden" name="service" value="Отделка"/);assert.match(markup,/Что нужно отделать/);assert.doesNotMatch(markup,/Выберите подарок/);});
test('furniture quiz supports balconies and loggias',()=>{const markup=quiz(services.find(s=>s.slug==='mebel-dlya-balkona'));assert.match(markup,/Где нужна встроенная мебель/);assert.doesNotMatch(markup,/type="hidden" name="object"/);assert.match(markup,/value="Балкон"/);assert.match(markup,/value="Лоджия"/);for(const object of ['Балкон','Лоджия'])assert.equal(validateLead({...valid(),object,service:'Мебель для балконов и лоджий'}).object,object);});
test('project consultation keeps the project context',()=>{const markup=quizModal(projects[0]);assert.match(markup,/Получите\s+<br>консультацию/);assert.match(markup,/type="hidden" name="service" value="Утепление и отделка"/);assert.match(markup,/data-total-steps="2"/);});

test('consultations default to the first answer while contacts and consent remain empty',()=>{
 const contexts=[['general',quiz()],['home modal',quizModal(null,{withGlazingChoice:true})],['project modal',quizModal(projects[0])],...services.flatMap(service=>[[service.slug,quiz(service,{withGift:service.slug==='holodnoe-osteklenie'})],[service.slug+' modal',quizModal(service)]])];
 for(const [label,markup] of contexts){
  const inputs=[...markup.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:value])));
  const radios=inputs.filter(input=>input.type==='radio'),names=[...new Set(radios.map(input=>input.name))];
  assert.ok(names.length,label+': question choices exist');
  for(const name of names){
   const group=radios.filter(input=>input.name===name);
   assert.ok(group.every(input=>input.required),label+': '+name+' remains required');
   assert.deepEqual(group.filter(input=>input.checked),[group[0]],label+': only the first '+name+' answer is selected');
  }
  const consent=inputs.filter(input=>input.name==='consent');
  assert.equal(consent.length,1,label+': one consent control');
  assert.ok(consent[0].type==='checkbox'&&consent[0].required&&!consent[0].checked,label+': consent requires an explicit choice');
  assert.ok(inputs.filter(input=>input.name==='name').every(input=>!input.value),label+': name is not prefilled');
  assert.ok(inputs.filter(input=>input.name==='phone').every(input=>input.value==='+7 (___) ___-__-__'),label+': phone keeps the empty mask');
 }
});
test('cold/warm choice belongs only to the home consultation modal',()=>{
 const homeShell=shellWithQuiz(renderHome(),{path:'/'}),modal=homeShell.match(/<dialog class="quiz-modal"[\s\S]*?<\/dialog>/)?.[0];
 assert.ok(modal,'Home consultation modal is present');
 assert.match(modal,/data-total-steps="4"/);
 assert.match(modal,/type="hidden" name="service" value="Под ключ"/);
 const choices=[...modal.matchAll(/<input type="radio" name="detail" value="([^"]+)"[^>]*>/g)].map(match=>match[1]);
 assert.deepEqual(choices,['Холодный балкон','Тёплый балкон']);
 assert.ok(modal.indexOf('name="object"')<modal.indexOf('name="detail"'));
 assert.ok(modal.indexOf('name="detail"')<modal.indexOf('name="timing"'));
 for(const service of services){
  const other=quizModal(service);
  assert.doesNotMatch(other,/value="(?:Холодный|Тёплый) балкон"/,'Keep the original service consultation: '+service.slug);
 }
});

test('gift is optional for the shorter calculation',()=>{const input=valid();delete input.gift;assert.equal(validateLead(input).gift,undefined);});
test('preview is durable and duplicates are idempotent',async()=>{const directory=await mkdtemp(join(tmpdir(),'artbalkon-test-'));try{const input=valid();const [a,b]=await Promise.all([saveLead(input,{directory}),saveLead(input,{directory})]);assert.equal(a.id,b.id);assert.equal(a.mode,'preview');const saved=JSON.parse(await readFile(join(directory,a.id+'.json'),'utf8'));assert.equal(saved.status,'preview');assert.equal(saved.attribution.utm_source,'test');await assert.rejects(saveLead({...input,name:'Другой'},{directory}));}finally{await rm(directory,{recursive:true,force:true});}});
test('failed delivery stays pending; retry delivers once',async()=>{const directory=await mkdtemp(join(tmpdir(),'artbalkon-test-'));try{const input=valid();await assert.rejects(saveLead(input,{directory,mode:'live',deliver:async()=>{throw Error('offline');}}));let record=JSON.parse(await readFile(join(directory,input.requestId+'.json'),'utf8'));assert.equal(record.status,'pending');let count=0;const options={directory,mode:'live',deliver:async()=>{count++;}};await saveLead(input,options);await saveLead(input,options);record=JSON.parse(await readFile(join(directory,input.requestId+'.json'),'utf8'));assert.equal(record.status,'delivered');assert.equal(count,1);}finally{await rm(directory,{recursive:true,force:true});}});

test('application display title preserves technical project in form and analytics',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const handler=source.split('\n').find(line=>line.includes("const trigger=e.target.closest('[data-application]')"));
 assert.ok(handler,'Application click handler must exist');
 for(const dataset of [{project:'Светлый балкон с рабочим местом',projectDisplay:'Балкон, где нашлось место для работы'},{project:'Акция: Электрика'}]){
  let callback,tracked;
  const applicationProject={},applicationProjectInput={},applicationModal={querySelector:()=>({})};
  runInNewContext(handler,{document:{addEventListener:(name,cb)=>{callback=cb;}},applicationProject,applicationProjectInput,applicationModal,openDialogAtCurrentScroll:()=>{},track:(name,data)=>{tracked={name,data};}});
  callback({target:{closest:()=>({dataset})}});
  assert.equal(applicationProject.textContent,dataset.projectDisplay||dataset.project);
  assert.equal(applicationProjectInput.value,dataset.project);
  assert.equal(tracked.data.project,dataset.project);
  assert.equal(tracked.name,'transformation_lead_open');
 }
});

test('callback and portfolio requests are accepted with bounded project context',()=>{
 const callback=validateLead({...valid(),form:'callback'});
 assert.equal(callback.form,'callback');
 const project=validateLead({...valid(),form:'transformation',project:'  Балкон с местом для отдыха  '});
 assert.equal(project.project,'Балкон с местом для отдыха');
 for(const input of [{form:'unknown'},{form:'transformation'},{form:'transformation',project:' '},{form:'transformation',project:'x'.repeat(301)}])assert.throws(()=>validateLead({...valid(),...input}));
});


test('only automatic callback popup accepts a phone without a name',()=>{
 const input={...valid(),form:'callback-popup',trigger:'exit-intent'};delete input.name;
 const lead=validateLead(input);
 assert.equal(lead.form,'callback-popup');assert.equal(lead.phone,'+79990000000');assert.equal(Object.hasOwn(lead,'name'),false);assert.equal(lead.trigger,'exit-intent');
 for(const trigger of ['exit-intent','scroll-end','time-on-site'])assert.equal(validateLead({...input,trigger}).trigger,trigger);
 for(const name of ['', '   '])assert.equal(Object.hasOwn(validateLead({...input,name}),'name'),false);
 assert.equal(validateLead({...input,name:'  Анна  '}).name,'Анна');
 for(const form of ['callback','contact','quiz','transformation'])for(const name of [undefined,'',' '])assert.throws(()=>validateLead({...input,form,name}),form+': keep name required');
 for(const bad of [{consent:false},{website:'bot'},{phone:'123'},{name:null},{name:1},{name:'x'.repeat(71)},{trigger:'unknown'},{trigger:null},{calculation:'Размеры'}])assert.throws(()=>validateLead({...input,...bad}));
 assert.throws(()=>validateLead({...valid(),form:'callback',trigger:'exit-intent'}));
});

test('new landing consultations preserve the service and allow the matching object',()=>{
 const additions=services.filter(service=>service.landingVariant);
 assert.equal(additions.length,9);
 for(const service of additions){
  const markup=quiz(service);
  assert.ok(markup.includes('type="hidden" name="service" value="'+service.title+'"'));
  const balconyOnly=['osteklenie-balkona-s-vynosom','osteklenie-balkona-v-hrushchevke'].includes(service.slug);
  assert.ok(markup.includes('data-total-steps="'+(balconyOnly?2:3)+'"'));
  for(const object of balconyOnly?['Балкон']:['Балкон','Лоджия'])assert.equal(validateLead({...valid(),service:service.title,object}).service,service.title);
 }
});


test('home calculation quiz preserves photos, ordered questions, gifts and valid lead context',()=>{
 const contexts=[['home',renderHome()],['known-object helper',inlineEstimate(services.find(service=>service.slug==='osteklenie-balkona-v-hrushchevke'))]];
 const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const attributes=tag=>Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:decode(value)]));
 const inputsIn=markup=>[...markup.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>attributes(tag));
 for(const [label,html] of contexts){
  const markup=html.match(/<section\b(?=[^>]*\bid="quiz")[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(markup,label+': the calculation block is present');
  const forms=[...markup.matchAll(/<form\b(?=[^>]*\bdata-inline-estimate\b)[^>]*>[\s\S]*?<\/form>/g)];
  assert.equal(forms.length,1,label+': exactly one inline estimate');
  const form=forms[0][0],formAttributes=attributes(form.match(/^<form\b([^>]*)>/)[1]),inputs=inputsIn(form);
  assert.equal(formAttributes['data-lead-form'],'quiz',label+': preserve the lead endpoint contract');
  const fields=name=>inputs.filter(input=>input.name===name);
  const service=fields('service'),object=fields('object'),timing=fields('timing'),details=fields('detail'),gifts=fields('gift');
  assert.equal(service.length,1,label+': one known service');
  assert.equal(service[0].type,'hidden',label+': do not repeat the known service question');
  const knownObject=object.length===1&&object[0].type==='hidden';
  assert.equal(knownObject,label!=='home',label+': cover both explicit and known object flows');
  const stages=[...form.matchAll(/<fieldset\b([^>]*)>([\s\S]*?)<\/fieldset>/g)].map(([,tag,body])=>({attributes:attributes(tag),body,inputs:inputsIn(body)}));
  const expectedStages=[...knownObject?[]:['object'],'goal','timing','gift','contact'];
  assert.equal(Number(formAttributes['data-total-steps']),expectedStages.length,label+': known objects shorten the quiz');
  assert.equal(stages.length,expectedStages.length,label+': every stage has its own fieldset');
  assert.deepEqual(stages.map(stage=>stage.attributes['data-estimate-stage']),expectedStages,label+': ask object, goals, timing, gift and contacts in order');
  assert.deepEqual(stages.map(stage=>stage.attributes['data-step']),expectedStages.map((_,index)=>String(index)),label+': consecutive navigation steps');
  assert.deepEqual(stages.map(stage=>Object.hasOwn(stage.attributes,'hidden')),expectedStages.map((_,index)=>index!==0),label+': only the first stage starts visible');
  assert.ok(details.length===5||details.length===6,label+': explicit project goals');
  assert.deepEqual(stages.find(stage=>stage.attributes['data-estimate-stage']==='goal').inputs,details,label+': goals belong to their stage');
  if(label==='home')assert.deepEqual(details.map(input=>input.value),['Зона отдыха','Рабочее место','Удобное хранение','Объединить с комнатой','Освежить вид','Пока не знаю'],'Home must preserve the requested goal labels');
  const objectStage=stages.find(stage=>stage.attributes['data-estimate-stage']==='object');
  if(knownObject)assert.equal(objectStage,undefined,label+': known objects omit the object question');
  else{
   assert.deepEqual(object.map(input=>input.value),['Балкон','Лоджия','Не знаю'],label+': preserve the three object choices');
   assert.deepEqual(objectStage.inputs,object,label+': object answers belong to their stage');
  }
  assert.deepEqual(timing.map(input=>input.value),['Как можно скорее','В течение недели','В течение месяца','Пока выбираю'],label+': offer all four work schedules in order');
  assert.deepEqual(stages.find(stage=>stage.attributes['data-estimate-stage']==='timing').inputs,timing,label+': timing answers belong to their stage');
  assert.deepEqual(new Set(gifts.map(input=>input.value)),new Set(['Светильник и розетки','Тёплый пол','Потолочная сушилка','Подарочная карта']),label+': offer the four supported gifts');
  assert.equal(gifts.length,4,label+': one choice per gift');
  assert.equal(gifts.find(input=>input.value==='Подарочная карта')['data-estimate-photo'],'gift-4',label+': gift card uses its dedicated preview');
  for(const group of [details,...knownObject?[]:[object],timing,gifts]){assert.ok(group.every(input=>input.type==='radio'&&input.required),label+': preserve required radio choices');assert.deepEqual(group.filter(input=>input.checked),[group[0]],label+': default to only the first choice');}
  const giftStage=stages.at(-2),finalStage=stages.at(-1);
  assert.deepEqual(giftStage.inputs,gifts,label+': the gift stage contains only gift choices');
  assert.equal(finalStage.attributes['data-estimate-stage'],'contact',label+': contacts are the final separate stage');
  for(const stage of stages.slice(0,-2))assert.ok(!stage.inputs.some(input=>input.name==='gift'),label+': gifts wait until their own stage');
  for(const stage of stages.slice(0,-1))assert.ok(!stage.inputs.some(input=>['name','phone','consent'].includes(input.name)),label+': contacts wait until after the gift choice');
  for(const name of ['name','phone','consent'])assert.deepEqual(finalStage.inputs.filter(input=>input.name===name),fields(name),label+': '+name+' belongs only to the contact stage');
  assert.ok(!finalStage.inputs.some(input=>input.name==='gift'),label+': the contact stage does not repeat gifts');
  const consent=fields('consent');
  assert.equal(consent.length,1,label+': one consent checkbox');
  assert.ok(consent[0].type==='checkbox'&&consent[0].required&&!consent[0].checked,label+': consent requires an explicit choice');
  for(const name of ['name','phone']){
   const contacts=fields(name);
   assert.equal(contacts.length,1,label+': one '+name+' field');
   assert.ok(contacts[0].required&&contacts[0].type!=='hidden',label+': '+name+' is a required contact field');
  }
  const previews=[...markup.matchAll(/<figure\b([^>]*)>/g)].map(([,tag])=>attributes(tag)).filter(tag=>tag['data-estimate-preview']);
  const previewKeys=previews.map(tag=>tag['data-estimate-preview']);
  assert.deepEqual(previews.filter(tag=>!Object.hasOwn(tag,'hidden')).map(tag=>tag['data-estimate-preview']),[(knownObject?details:object)[0]['data-estimate-photo']],label+': initial photo matches the first selected choice');
  assert.equal(new Set(previewKeys).size,previewKeys.length,label+': preview keys are unique');
  for(const choice of [...details,...gifts,...(knownObject?[]:object)])assert.ok(choice['data-estimate-photo']&&previewKeys.includes(choice['data-estimate-photo']),label+': selected objects, goals and gifts have matching photos');
  if(!knownObject){
   const objectPhoto=value=>object.find(input=>input.value===value)['data-estimate-photo'];
   assert.notEqual(objectPhoto('Балкон'),objectPhoto('Лоджия'),label+': balcony and loggia have distinct previews');
   assert.equal(objectPhoto('Не знаю'),'object-unknown',label+': undecided object uses its dedicated requested photo');
  }
  assert.doesNotMatch(markup,/<figcaption\b/i,label+': keep estimate photos free of captions');
  assert.match(markup,/<figure\b[^>]*data-estimate-preview="gift-4"[^>]*>[\s\S]*?<img\b[^>]*src="\/assets\/promo-gift-card\.svg"/,label+': gift card has its dedicated illustration');
  const progress=attributes(form.match(/<progress\b([^>]*)>/)?.[1]||'');
  assert.equal(progress.id,'quiz-progress-inline',label+': separate inline progress from the consultation modal');
  assert.equal(progress.value,'1',label+': progress starts at the first step');
  assert.equal(Number(progress.max),stages.length,label+': progress covers every stage');
  assert.ok(form.includes('id="step-count-inline"')&&form.includes('Шаг 1 из '+stages.length),label+': show the initial step count');
  const buttons=[...form.matchAll(/<button\b([^>]*)>/g)].map(([,tag])=>attributes(tag));
  const back=buttons.find(button=>button.class?.split(/\s+/).includes('back-button'));
  const next=buttons.find(button=>button.class?.split(/\s+/).includes('quiz-next-button'));
  const submit=buttons.filter(button=>button.type==='submit');
  assert.ok(back?.disabled&&next&&!next.disabled,label+': first answer enables Next while Back stays disabled');
  assert.ok(back.type==='button'&&next.type==='button'&&!next.hidden,label+': navigation advances without submitting');
  assert.equal(submit.length,1,label+': one final submit action');
  assert.ok(submit[0].hidden,label+': submission is hidden before contacts');
  const input={...valid(),service:service[0].value,object:object[0].value,timing:timing[0].value,gift:gifts[0].value};
  for(const detail of details)for(const objectValue of object.map(input=>input.value))for(const timingValue of timing.map(input=>input.value))for(const gift of gifts){
   const lead=validateLead({...input,object:objectValue,timing:timingValue,detail:detail.value,gift:gift.value});
   assert.equal(lead.service,service[0].value,label+': service is accepted by the backend');
   assert.equal(lead.object,objectValue,label+': selected object survives validation');
   assert.equal(lead.timing,timingValue,label+': selected timing survives validation');
   assert.equal(lead.detail,detail.value,label+': selected goal survives validation');
   assert.equal(lead.gift,gift.value,label+': selected gift survives validation');
  }
  assert.throws(()=>validateLead({...input,detail:details[0].value,consent:false}),label+': consent remains mandatory');
  assert.throws(()=>validateLead({...input,detail:details[0].value,gift:'Другой подарок'}),label+': unsupported gift rejected');
  for(const detail of [' ','x'.repeat(151)])assert.throws(()=>validateLead({...input,detail}),label+': invalid goal rejected');
 }
});


test('service routes retain their previous consultation questions and valid lead context',()=>{
 const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const inputsIn=markup=>[...markup.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:decode(value)])));
 const redirected=new Set(['balkon-pod-klyuch','krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone']);
 assert.equal(services.filter(service=>!redirected.has(service.slug)).length,19,'Cover every published service route');
 for(const service of services){
  const markup=servicePageWithSeo(service),label=service.slug;
  assert.doesNotMatch(markup,/\bdata-inline-estimate\b|\bproject-estimate-section\b/,label+': the home calculation must not spread to service routes');
  const sections=[...markup.matchAll(/<section\b(?=[^>]*\bid="quiz")[^>]*>[\s\S]*?<\/section>/g)];
  assert.equal(sections.length,1,label+': one service consultation');
  const block=sections[0][0];
  const withGift=service.slug==='holodnoe-osteklenie';
  assert.equal(block,quiz(service,{consultation:true,withGift}),label+': preserve the service-specific block');
  assert.match(block,/Получите\s+<br>консультацию/,label+': retain consultation copy');
  assert.doesNotMatch(block,/data-estimate-stage|data-estimate-preview/,label+': preserve the consultation layout');
  if(!withGift)assert.doesNotMatch(block,/name="gift"/,label+': keep the other service questions');
  const inputs=inputsIn(block),fields=name=>inputs.filter(input=>input.name===name);
  const gifts=withGift?fields('gift').map(input=>input.value):[undefined];
  if(withGift){
   assert.deepEqual(gifts,['Светильник и розетки','Тёплый пол','Потолочная сушилка','Подарочная карта'],label+': offer all four accepted gifts');
   assert.ok(fields('gift').every(input=>input.type==='radio'&&input.required),label+': preserve required gift choices');
   assert.deepEqual(fields('gift').filter(input=>input.checked),[fields('gift')[0]],label+': default to the first gift');
   assert.match(block,/>Электрика<\/span>/,label+': use the promotional display label');
   const steps=[...block.matchAll(/<fieldset\b[^>]*>([\s\S]*?)<\/fieldset>/g)].map(([,body])=>inputsIn(body));
   assert.equal(steps.length,4,label+': four separate steps');
   assert.deepEqual(steps.slice(0,-1).map(inputs=>inputs[0]?.name),['object','timing','gift'],label+': place the gift immediately after timing');
   for(const name of ['name','phone','consent'])assert.ok(steps.at(-1).some(input=>input.name===name),label+': contacts remain last');
   assert.doesNotMatch(quizModal(service),/name="gift"/,label+': the separate consultation modal stays unchanged');
  }
  for(const name of ['service','object','timing','name','phone','consent'])assert.ok(fields(name).length,label+': preserve '+name);
  assert.ok(fields('consent').every(input=>input.required&&!input.checked),label+': require explicit consent');
  const input=valid();delete input.gift;
  for(const serviceChoice of fields('service'))for(const object of fields('object'))for(const timing of fields('timing'))for(const gift of gifts){
   const lead=validateLead({...input,service:serviceChoice.value,object:object.value,timing:timing.value,...(gift?{gift}:{})});
   assert.equal(lead.service,serviceChoice.value,label+': preserve the selected service');
   assert.equal(lead.object,object.value,label+': preserve the selected object');
   assert.equal(lead.timing,timing.value,label+': preserve the selected schedule');
   assert.equal(lead.gift,gift,label+': preserve the selected gift while keeping other consultations optional');
  }
 }
});
