(() => {
 'use strict';
 const $=s=>document.querySelector(s);
 let config={};
 const configReady=fetch(new URL('site-config.json',document.currentScript.src)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
  config=c;
  if(!c.leadEndpoint)document.querySelectorAll('[data-lead-form]').forEach(form=>{const note=form.querySelector('.form-error');if(note)note.textContent='Для расчёта позвоните нам: +7 (495) 165-39-05. Отправка заявок через сайт пока не подключена.';});
  if(c.whatsapp){try{const url=new URL(c.whatsapp);if(['wa.me','api.whatsapp.com','www.whatsapp.com'].includes(url.hostname)&&url.protocol==='https:')document.querySelectorAll('.final-links').forEach(container=>{const link=document.createElement('a');link.className='messenger';link.href=url.href;link.target='_blank';link.rel='noopener';link.dataset.event='whatsapp_click';link.textContent='Написать в WhatsApp ↗';container.append(link);});}catch{}}
  if(c.metrikaId&&/^\d+$/.test(String(c.metrikaId))){
   window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=Date.now();
   const script=document.createElement('script');script.src='https://mc.yandex.ru/metrika/tag.js';script.async=true;document.head.append(script);
   window.ym(c.metrikaId,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:Boolean(c.webvisor)});
  }
  (c.externalScripts||[]).forEach(s=>{try{const url=new URL(typeof s==='string'?s:s.src);if(url.protocol!=='https:')return;const tag=document.createElement('script');tag.src=url.href;tag.async=true;if(s.id)tag.id=s.id;document.head.append(tag);}catch{}});
 }).catch(()=>{});
 function track(event,params={}){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...params});configReady.then(()=>{if(config.metrikaId&&window.ym)window.ym(config.metrikaId,'reachGoal',event,params);});}
 const attributionKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];
 let attribution={};try{attribution=JSON.parse(sessionStorage.getItem('artbalkon.attribution')||'{}');}catch{}
 if(!attribution||typeof attribution!=='object')attribution={};
 const query=new URLSearchParams(location.search);
 const fresh=Object.fromEntries(attributionKeys.filter(k=>query.has(k)).map(k=>[k,query.get(k).slice(0,300)]));
 if(Object.keys(fresh).length){attribution={...fresh,landing:location.pathname,referrer:document.referrer?new URL(document.referrer).origin:''};try{sessionStorage.setItem('artbalkon.attribution',JSON.stringify(attribution));}catch{}}
 document.addEventListener('click',e=>{const link=e.target.closest('[data-event]');if(link)track(link.dataset.event,link.dataset.project?{project:link.dataset.project}:{});});
 document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
 const siteHeader=document.querySelector('.site-header');
 const syncHeader=()=>siteHeader?.classList.toggle('is-scrolled',scrollY>18);
 syncHeader();addEventListener('scroll',syncHeader,{passive:true});
 const menu=$('#mobile-menu'),toggle=$('.menu-toggle');
 function closeMenu(){if(!menu)return;menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');}
 toggle?.addEventListener('click',()=>{const isOpen=toggle.getAttribute('aria-expanded')==='true';menu.hidden=isOpen;toggle.setAttribute('aria-expanded',String(!isOpen));toggle.setAttribute('aria-label',isOpen?'Открыть меню':'Закрыть меню');});
 menu?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 document.querySelectorAll('input[name="phone"]').forEach(input=>{input.addEventListener('input',()=>input.setCustomValidity(''));input.addEventListener('blur',()=>{let d=input.value.replace(/\D/g,'');if(d.length===10)d='7'+d;if(d.length===11&&/^[78]/.test(d)){d='7'+d.slice(1);input.value=`+7 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9)}`;}});});
 function validate(form,scope=form){
  const fields=[...scope.querySelectorAll('input')].filter(el=>!el.closest('.honeypot'));
  for(const el of fields){if(el.name==='phone'){const d=el.value.replace(/\D/g,'');el.setCustomValidity(/^(?:7|8)\d{10}$/.test(d)||/^\d{10}$/.test(d)?'':'Введите номер телефона: 10 цифр или 11 цифр с 7/8.');}if(el.name==='name'||el.name==='size')el.setCustomValidity(el.value.trim()?'':'Пожалуйста, заполните это поле.');if(!el.checkValidity()){el.reportValidity();el.focus();return false;}}
  return true;
 }
 document.querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>{el.setCustomValidity('');el.closest('form')?.querySelector('.form-error')?.replaceChildren();}));
 const quiz=$('[data-lead-form="quiz"]');let step=0,started=false;
 const steps=quiz?[...quiz.querySelectorAll('[data-step]')]:[];
 function begin(){if(!started){track('quiz_start');started=true;}}
 function showStep(index,focus=true){step=index;steps.forEach((el,i)=>el.hidden=i!==step);$('#step-count').textContent=`Шаг ${step+1} из 5`;$('#quiz-progress').value=step+1;$('#quiz-back').disabled=step===0;$('#quiz-next').hidden=step===4;$('#quiz-submit').hidden=step!==4;quiz.querySelector('.form-error').textContent='';if(focus)steps[step].querySelector('legend').focus({preventScroll:true});}
 quiz?.addEventListener('change',begin);
 $('#quiz-next')?.addEventListener('click',()=>{begin();if(validate(quiz,steps[step]))showStep(Math.min(4,step+1));});
 $('#quiz-back')?.addEventListener('click',()=>showStep(Math.max(0,step-1)));
 quiz?.addEventListener('keydown',e=>{if(e.key==='Enter'&&step<4&&e.target.tagName==='INPUT'){e.preventDefault();$('#quiz-next').click();}});
 function showThanks(form,preview){
  const box=document.createElement('div');box.className='thank-you';box.setAttribute('role','status');box.tabIndex=-1;
  const icon=document.createElement('span');icon.className='success-icon';icon.textContent='✓';icon.setAttribute('aria-hidden','true');
  const title=document.createElement('h3');title.textContent=preview?'Спасибо! Форма работает.':'Спасибо! Заявка принята.';
  const text=document.createElement('p');text.textContent=preview?'Это предварительный просмотр сайта. Тестовая заявка сохранена, но менеджеру пока не отправлена.':'Свяжемся с вами, уточним детали и подготовим предварительный расчёт.';
  const phone=document.createElement('a');phone.className='text-link';phone.href='tel:+74951653905';phone.dataset.event='phone_click';phone.textContent='Позвонить: +7 (495) 165-39-05';
  box.append(icon,title,text,phone);form.replaceChildren(box);box.focus({preventScroll:true});
 }
 document.querySelectorAll('[data-lead-form]').forEach(form=>{let submitting=false,id=null;
  form.addEventListener('submit',async e=>{e.preventDefault();if(submitting)return;
   if(form===quiz&&step!==4){$('#quiz-next').click();return;}if(!validate(form))return;
   const submit=form.querySelector('[type="submit"]'),error=form.querySelector('.form-error');
   submitting=true;submit.disabled=true;submit.setAttribute('aria-busy','true');const old=submit.innerHTML;submit.textContent='Отправляем…';error.textContent='';
   try{
    await configReady;if(!config.leadEndpoint)throw new Error('Отправка заявок через сайт пока не подключена. Позвоните нам: +7 (495) 165-39-05.');const values=Object.fromEntries(new FormData(form));id=id||crypto.randomUUID();
    const response=await fetch(config.leadEndpoint||'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,consent:values.consent==='on',form:form.dataset.leadForm,attribution,page:location.pathname,requestId:id}),signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.message||'Не удалось отправить заявку.');
    if(result.mode!=='preview'){track('form_submit',{form:form.dataset.leadForm});if(form===quiz)track('quiz_complete');}showThanks(form,result.mode==='preview');
   }catch(err){error.textContent=err.name==='TimeoutError'?'Ответ задерживается. Попробуйте ещё раз или позвоните нам.':err.message==='Failed to fetch'?'Нет соединения. Проверьте интернет и попробуйте ещё раз.':err.message;submit.disabled=false;submit.removeAttribute('aria-busy');submit.innerHTML=old;submitting=false;}
  });
 });
 const context=document.modelContext;
 if(context?.registerTool&&quiz){const lifecycle=new AbortController();try{Promise.resolve(context.registerTool({name:'start_balcony_calculation',description:'Открывает расчёт балкона и выбирает услугу. Не отправляет заявку.',inputSchema:{type:'object',properties:{service:{type:'string',enum:['Остекление','Утепление','Отделка','Балкон под ключ']}},required:['service'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const option=[...quiz.querySelectorAll('[name="service"]')].find(el=>el.value===input?.service);if(!option)throw Error('Неизвестная услуга');option.checked=true;begin();showStep(1);quiz.scrollIntoView({behavior:'smooth',block:'center'});return {service:option.value,step:2,submitted:false};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
 const comparisonModal=$('#comparison-modal');
 if(comparisonModal){
  const beforeImage=$('#comparison-before'),afterImage=$('#comparison-after'),comparisonTitle=$('#comparison-title'),comparisonDescription=$('#comparison-description');
  document.addEventListener('click',e=>{const card=e.target.closest('[data-comparison]');if(!card)return;beforeImage.src=card.dataset.before;afterImage.src=card.dataset.after;comparisonTitle.textContent=card.dataset.title;comparisonDescription.textContent=card.dataset.description;beforeImage.alt=`${card.dataset.title} — до ремонта, визуальная реконструкция`;afterImage.alt=`${card.dataset.title} — после работ ArtBalkon`;comparisonModal.showModal();comparisonModal.querySelector('.comparison-close').focus({preventScroll:true});track('before_after_open',{project:card.dataset.title});});
  comparisonModal.querySelector('.comparison-close')?.addEventListener('click',()=>comparisonModal.close());
  comparisonModal.addEventListener('click',e=>{if(e.target===comparisonModal)comparisonModal.close();});
  comparisonModal.addEventListener('close',()=>{beforeImage.removeAttribute('src');afterImage.removeAttribute('src');});
 }
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){
  document.documentElement.classList.add('reveal-ready');
  const items=document.querySelectorAll('.reveal,.section-heading,.project-card,.why-grid article,.steps li');
  items.forEach(el=>el.classList.add('reveal'));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  items.forEach(el=>observer.observe(el));
 }
})();
