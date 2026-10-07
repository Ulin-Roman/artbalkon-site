// Run after production build with Playwright available through NODE_PATH.
// All external requests are blocked and lead responses are simulated. No real applications.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 const server=http.createServer(async(req,res)=>{try{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL||'msedge'}),origin='http://127.0.0.1:'+server.address().port;
 const errors=[];let verified=0;
 async function setup(route='/',mode='success',metric='normal'){
  const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.goalCalls=[];window.ym=(...args)=>{window.goalCalls.push({args,thanks:!!document.querySelector('.thank-you')});};});
  let requests=[],release;const gate=new Promise(r=>release=r);
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();
   if(u.pathname==='/site-config.json')return r.fulfill({json:{metrikaId:113425011,leadEndpoint:'/mock-leads'}});
   if(u.pathname==='/mock-leads'){
    const lead=r.request().postDataJSON();requests.push(lead);
    if(mode==='network')return r.abort('failed');
    if(mode==='timeout')return;
    if(mode==='pending')await gate;
    if(mode==='server')return r.fulfill({status:503,json:{ok:true}});
    if(mode==='rejected')return r.fulfill({json:{ok:false,message:'Тестовая ошибка'}});
    if(mode==='truthy')return r.fulfill({json:{ok:'true'}});
    if(mode==='html')return r.fulfill({status:503,body:'Unavailable',contentType:'text/html'});
    if(mode==='null')return r.fulfill({json:null});
    return r.fulfill({json:{ok:true,mode:mode==='preview'?'preview':'live',id:lead.requestId}});
   }
   return r.continue();
  });
  await page.goto(origin+route,{waitUntil:'networkidle'});
  if(metric==='missing')await page.evaluate(()=>delete window.ym);
  if(metric==='throwing')await page.evaluate(()=>{window.ym=(...args)=>{window.goalCalls.push({args,thanks:!!document.querySelector('.thank-you')});throw Error('Simulated Metrika failure');};});
  return {page,requests,release,setMode:value=>mode=value};
 }
 const goals=page=>page.evaluate(()=>window.goalCalls.filter(c=>c.args[1]==='reachGoal'&&c.args[2]==='form_submit'));
 async function prepare(page,index){
  const forms=page.locator('[data-lead-form]'),form=forms.nth(index);
  await form.evaluate(el=>{const dialog=el.closest('dialog');if(dialog&&!dialog.open)dialog.showModal();const project=el.querySelector('[name=project]');if(project&&!project.value)project.value='Тестовая работа / подарок';});
  if(await form.getAttribute('data-lead-form')==='quiz'){
   for(let n=0;n<12;n++){
    if(await form.locator('[type=submit]').isVisible())break;
    const step=form.locator('[data-step]:visible');
    for(const group of await step.locator('input[type=radio][required]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.name))]))await step.locator('input[type=radio]').filter({visible:true}).evaluateAll((nodes,name)=>{const first=nodes.find(n=>n.name===name);first.checked=true;first.dispatchEvent(new Event('change',{bubbles:true}));},group);
    for(const field of await step.locator('input[required]:not([type=radio]):not([type=checkbox])').all())await field.fill((await field.getAttribute('name'))==='size'?'3':'Тест');
    const next=form.locator('.quiz-next-button');if(await next.isDisabled())throw Error('Quiz cannot advance');await next.click();
   }
  }
  await form.locator('[name=name]').fill('Технический тест');await form.locator('[name=phone]').fill('+7 999 123 45 67');await form.locator('[name=consent]').check();
  return form;
 }
 async function submit(form){await form.evaluate(el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
 try{
  // Cover every generated page carrying own forms, not only the listed service routes.
  const routes=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name==='index.html'&&(await fs.readFile(file,'utf8')).includes('data-lead-form'))routes.push(('/'+path.relative(root,path.dirname(file)).split(path.sep).filter(Boolean).join('/')+'/').replace('//','/'));}}
  await walk(root);
  for(const route of process.env.GOAL_EXTRA_ONLY?[]:routes){
   const probe=await setup(route),count=await probe.page.locator('[data-lead-form]').count();await probe.page.close();
   for(let index=0;index<count;index++){
    const {page,requests}=await setup(route),form=await prepare(page,index),before=await goals(page),url=page.url();
    assert.equal(before.length,0,'Opening a form sent form_submit');
    await submit(form);await form.locator('.thank-you').waitFor();
    assert.equal(requests.length,1);assert.equal((await goals(page)).length,1,route+' form '+index);
    assert.deepEqual((await goals(page))[0].args,[113425011,'reachGoal','form_submit']);assert.equal((await goals(page))[0].thanks,true);
    assert.equal(page.url(),url,'Success changed address');
    await submit(form);await page.waitForTimeout(30);assert.equal(requests.length,1);assert.equal((await goals(page)).length,1);
    assert.equal(await page.evaluate(()=>window.dataLayer?.filter(x=>x.event==='form_submit').length||0),0,'Second tracking path through dataLayer');
    assert.equal(await page.locator('script[src="https://cdn.callibri.ru/callibri.js"]').count(),1);
    verified++;await page.close();
   }
  }
  for(const mode of ['network','timeout','server','rejected','truthy','html','null','preview']){
   const {page}=await setup('/',mode),index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal'))),form=await prepare(page,index);
   await submit(form);await form.locator(mode==='preview'?'.thank-you':'.form-error:not(:empty)').waitFor();assert.equal((await goals(page)).length,0,mode);
   if(mode!=='preview'){assert.equal(await form.locator('.thank-you').count(),0);assert.equal(await form.locator('[type=submit]').isEnabled(),true);}
   await page.close();
  }
  {
   const {page,requests,release}=await setup('/','pending'),index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal'))),form=await prepare(page,index);
   await form.locator('[name=name]').fill('');await submit(form);assert.equal(requests.length,0);assert.equal((await goals(page)).length,0);
   await form.locator('[name=name]').fill('Тест');await form.locator('[name=consent]').uncheck();await submit(form);assert.equal(requests.length,0);
   await form.locator('[name=consent]').check();await submit(form);await submit(form);await page.waitForTimeout(100);assert.equal(requests.length,1);assert.equal((await goals(page)).length,0);assert.equal(await form.locator('.thank-you').count(),0);
   release();await form.locator('.thank-you').waitFor();assert.equal((await goals(page)).length,1);await page.close();
  }
  for(const metric of ['missing','throwing']){
   const {page,requests}=await setup('/','success',metric),index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal'))),form=await prepare(page,index);
   await submit(form);await form.locator('.thank-you').waitFor();assert.equal(requests.length,1);assert.equal((await goals(page)).length,metric==='missing'?0:1);await submit(form);assert.equal(requests.length,1);await page.close();
  }
  // Reinitialization must not attach another own-form sender.
  {
   const {page,requests}=await setup('/');await page.addScriptTag({url:origin+'/app.js?v=repeat'});
   const index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal'))),form=await prepare(page,index);
   await submit(form);await form.locator('.thank-you').waitFor();assert.equal(requests.length,1);assert.equal((await goals(page)).length,1);await page.close();
  }
  {
   const {page,requests,setMode}=await setup('/','rejected'),index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal'))),form=await prepare(page,index);
   await submit(form);await form.locator('.form-error:not(:empty)').waitFor();assert.equal((await goals(page)).length,0);
   setMode('success');await submit(form);await form.locator('.thank-you').waitFor();assert.equal((await goals(page)).length,1);assert.equal(requests[0].requestId,requests[1].requestId);await page.close();
  }
  {
   const {page,requests}=await setup('/');
   await page.addInitScript(()=>{crypto.randomUUID=()=> 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';});await page.reload({waitUntil:'networkidle'});
   const index=await page.locator('[data-lead-form]').evaluateAll(forms=>forms.findIndex(f=>f.closest('#callback-modal')));
   let form=await prepare(page,index);await submit(form);await form.locator('.thank-you').waitFor();assert.equal((await goals(page)).length,1);
   await page.reload({waitUntil:'networkidle'});form=await prepare(page,index);await submit(form);await form.locator('.thank-you').waitFor();assert.equal((await goals(page)).length,0,'Same accepted request counted again after reload');assert.equal(requests[0].requestId,requests[1].requestId);await page.close();
  }
  assert.deepEqual(errors,[],'JavaScript errors');
  console.log('PASS: '+verified+' form/page combinations; success once, no early goal, validation, network/server errors, preview, repeated handlers, missing/throwing Metrika, unchanged Callibri tag. No real leads sent.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
