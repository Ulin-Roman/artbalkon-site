import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateLead,saveLead} from './leads.mjs';
import {contactFields,quiz,quizModal} from '../src/components.mjs';
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
