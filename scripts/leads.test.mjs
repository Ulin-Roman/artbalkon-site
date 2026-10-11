import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateLead,saveLead} from './leads.mjs';
import {contactFields,quiz,quizModal,servicePageWithSeo,home as renderHome} from '../src/components.mjs';
import {services,projects} from '../src/content.mjs';
const valid=()=>({requestId:randomUUID(),name:'Тест формы',phone:'+7 (999) 000-00-00',consent:true,form:'quiz',service:'Холодное остекление балкона',object:'Балкон',timing:'Пока интересуюсь',gift:'Тёплый пол',attribution:{utm_source:'test'}});
test('validates phone, consent, all quiz answers and filters attribution',()=>{const input=valid();input.attribution.secret='must not persist';const lead=validateLead(input);assert.equal(lead.phone,'+79990000000');assert.equal(lead.attribution.secret,undefined);for(const bad of [{consent:false},{phone:'123'},{phone:'+7 (888) 888-88-88'},{phone:'+7 (999) 999-99-99'},{service:'xxx'},{size:' '},{name:' '},{requestId:'../../file'}])assert.throws(()=>validateLead({...input,...bad}));});
test('phone fields start after a fixed +7 prefix and accept ten following digits',()=>{const markup=contactFields('phone-consent');assert.match(markup,/name="phone"[^>]*maxlength="18"[^>]*value="\+7 "/);assert.match(markup,/inputmode="numeric"/);});
test('exact service page skips known object and service questions',()=>{const markup=quiz({slug:'holodnoe-osteklenie-lodzhii'});assert.match(markup,/data-total-steps="2"/);assert.match(markup,/type="hidden" name="object" value="Лоджия"/);assert.match(markup,/type="hidden" name="service" value="Холодное остекление лоджии"/);assert.doesNotMatch(markup,/У вас балкон или лоджия/);assert.doesNotMatch(markup,/type="radio" name="service"/);});
test('combined glazing page asks for the object and glazing type',()=>{const service=services.find(item=>item.slug==='osteklenie-balkonov');const markup=quiz(service);assert.match(markup,/data-total-steps="4"/);assert.match(markup,/Что нужно остеклить/);assert.match(markup,/Какое остекление рассматриваете/);assert.match(markup,/type="radio" name="object"/);assert.match(markup,/type="radio" name="service"/);assert.doesNotMatch(markup,/type="hidden" name="object"/);});
test('service page omits the already known service and uses three steps',()=>{const markup=quiz(services.find(item=>item.slug==='otdelka-balkonov'));assert.match(markup,/data-total-steps="3"/);assert.match(markup,/type="hidden" name="service" value="Отделка"/);assert.match(markup,/Что нужно отделать/);assert.doesNotMatch(markup,/Выберите подарок/);});
test('furniture quiz supports balconies and loggias',()=>{const markup=quiz(services.find(s=>s.slug==='mebel-dlya-balkona'));assert.match(markup,/Где нужна встроенная мебель/);assert.doesNotMatch(markup,/type="hidden" name="object"/);assert.match(markup,/value="Балкон"/);assert.match(markup,/value="Лоджия"/);for(const object of ['Балкон','Лоджия'])assert.equal(validateLead({...valid(),object,service:'Мебель для балконов и лоджий'}).object,object);});
test('project consultation keeps the project context',()=>{const markup=quizModal(projects[0]);assert.match(markup,/Получите\s+<br>консультацию/);assert.match(markup,/type="hidden" name="service" value="Утепление и отделка"/);assert.match(markup,/data-total-steps="2"/);});
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
 const contexts=['home'];
 assert.equal(contexts.length,1,'Only the home page uses the new calculation quiz');
 const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const attributes=tag=>Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value===undefined?true:decode(value)]));
 const inputsIn=markup=>[...markup.matchAll(/<input\b([^>]*)>/g)].map(([,tag])=>attributes(tag));
 for(const label of contexts){
  const markup=renderHome().match(/<section\b(?=[^>]*\bid="quiz")[^>]*>[\s\S]*?<\/section>/)?.[0];
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
  const stages=[...form.matchAll(/<fieldset\b([^>]*)>([\s\S]*?)<\/fieldset>/g)].map(([,tag,body])=>({attributes:attributes(tag),body,inputs:inputsIn(body)}));
  const expectedStages=['goal',...knownObject?[]:['object'],'timing','gift'];
  assert.equal(Number(formAttributes['data-total-steps']),expectedStages.length,label+': known objects shorten the quiz');
  assert.equal(stages.length,expectedStages.length,label+': every stage has its own fieldset');
  assert.deepEqual(stages.map(stage=>stage.attributes['data-estimate-stage']),expectedStages,label+': ask goals, object, timing and gift in order');
  assert.deepEqual(stages.map(stage=>stage.attributes['data-step']),expectedStages.map((_,index)=>String(index)),label+': consecutive navigation steps');
  assert.deepEqual(stages.map(stage=>Object.hasOwn(stage.attributes,'hidden')),expectedStages.map((_,index)=>index!==0),label+': only the first stage starts visible');
  assert.ok(details.length===5||details.length===6,label+': explicit project goals');
  assert.deepEqual(stages[0].inputs,details,label+': goals belong to the first stage');
  if(label==='home')assert.deepEqual(details.map(input=>input.value),['Зона отдыха','Рабочее место','Удобное хранение','Объединить с комнатой','Освежить вид','Пока не знаю'],'Home must preserve the requested goal labels');
  const objectStage=stages.find(stage=>stage.attributes['data-estimate-stage']==='object');
  if(knownObject)assert.equal(objectStage,undefined,label+': known objects omit the object question');
  else{
   assert.ok(object.length>=2,label+': offer explicit object choices');
   assert.deepEqual(objectStage.inputs,object,label+': object answers belong to their stage');
  }
  assert.equal(timing.length,3,label+': offer three work schedules');
  assert.deepEqual(stages.find(stage=>stage.attributes['data-estimate-stage']==='timing').inputs,timing,label+': timing answers belong to their stage');
  assert.deepEqual(new Set(gifts.map(input=>input.value)),new Set(['Светильник и розетки','Тёплый пол','Потолочная сушилка']),label+': offer the three supported gifts');
  assert.equal(gifts.length,3,label+': one choice per gift');
  for(const group of [details,...knownObject?[]:[object],timing,gifts])assert.ok(group.every(input=>input.type==='radio'&&input.required&&!input.checked),label+': visitors explicitly answer every question');
  const finalStage=stages.at(-1);
  for(const stage of stages.slice(0,-1))assert.ok(!stage.inputs.some(input=>['gift','name','phone','consent'].includes(input.name)),label+': gifts and contacts wait until the final stage');
  for(const name of ['gift','name','phone','consent'])assert.deepEqual(finalStage.inputs.filter(input=>input.name===name),fields(name),label+': '+name+' belongs only to the final stage');
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
  assert.equal(new Set(previewKeys).size,previewKeys.length,label+': preview keys are unique');
  for(const choice of [...details,...gifts])assert.ok(choice['data-estimate-photo']&&previewKeys.includes(choice['data-estimate-photo']),label+': selected goals and gifts have matching photos');
  assert.doesNotMatch(markup,/<figcaption\b/i,label+': keep estimate photos free of captions');
  const progress=attributes(form.match(/<progress\b([^>]*)>/)?.[1]||'');
  assert.equal(progress.id,'quiz-progress-inline',label+': separate inline progress from the consultation modal');
  assert.equal(progress.value,'1',label+': progress starts at the first step');
  assert.equal(Number(progress.max),stages.length,label+': progress covers every stage');
  assert.ok(form.includes('id="step-count-inline"')&&form.includes('Шаг 1 из '+stages.length),label+': show the initial step count');
  const buttons=[...form.matchAll(/<button\b([^>]*)>/g)].map(([,tag])=>attributes(tag));
  const back=buttons.find(button=>button.class?.split(/\s+/).includes('back-button'));
  const next=buttons.find(button=>button.class?.split(/\s+/).includes('quiz-next-button'));
  const submit=buttons.filter(button=>button.type==='submit');
  assert.ok(back?.disabled&&next?.disabled,label+': navigation waits for the first answer');
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
  assert.equal(block,quiz(service,{consultation:true}),label+': preserve the previous service-specific block');
  assert.match(block,/Получите\s+<br>консультацию/,label+': retain consultation copy');
  assert.doesNotMatch(block,/name="gift"|data-estimate-stage|data-estimate-preview/,label+': keep the previous questions');
  const inputs=inputsIn(block),fields=name=>inputs.filter(input=>input.name===name);
  for(const name of ['service','object','timing','name','phone','consent'])assert.ok(fields(name).length,label+': preserve '+name);
  assert.ok(fields('consent').every(input=>input.required&&!input.checked),label+': require explicit consent');
  const input=valid();delete input.gift;
  for(const serviceChoice of fields('service'))for(const object of fields('object'))for(const timing of fields('timing')){
   const lead=validateLead({...input,service:serviceChoice.value,object:object.value,timing:timing.value});
   assert.equal(lead.service,serviceChoice.value,label+': preserve the selected service');
   assert.equal(lead.object,object.value,label+': preserve the selected object');
   assert.equal(lead.timing,timing.value,label+': preserve the selected schedule');
   assert.equal(lead.gift,undefined,label+': gifts remain optional for existing consultations');
  }
 }
});
