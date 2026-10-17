import {calculateFinishingEstimate} from './calculator-estimate.mjs';
import {mountRetentionPopup} from './retention-popup.mjs';
import {hydrateVideo,mountResponsiveVideo,mountAmbientVideo,mountVisibleActivity} from './media-lifecycle.mjs';
import {mountPhoneMask,phoneIsValid} from './phone-mask.mjs';
(() => {
 'use strict';
 document.querySelectorAll('[data-repair-range]').forEach(range=>{
  const frame=range.closest('[data-repair-compare]');
  const update=()=>{frame.style.setProperty('--split',range.value+'%');range.setAttribute('aria-valuetext',range.value+'% фото до ремонта');};
  const move=e=>{const box=frame.getBoundingClientRect();range.value=String(Math.round(Math.max(0,Math.min(100,(e.clientX-box.left)/box.width*100))));update();};
  range.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();range.focus({preventScroll:true});range.setPointerCapture(e.pointerId);move(e);});
  range.addEventListener('pointermove',e=>{if(range.hasPointerCapture(e.pointerId))move(e);});
  range.addEventListener('pointerup',e=>{if(range.hasPointerCapture(e.pointerId))range.releasePointerCapture(e.pointerId);});
  range.addEventListener('input',update);update();
 });
 const $=s=>document.querySelector(s);
 const siteBase=new URL('.',document.currentScript.src);
 const phoneStatusDots=[...document.querySelectorAll('[data-phone-status]')];
 if(phoneStatusDots.length){
  const moscowHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',hourCycle:'h23'});
  let phoneStatusTimer=0;
  const syncPhoneStatus=()=>{
   clearTimeout(phoneStatusTimer);
   const active=Number(moscowHour.format(new Date()))>=5;
   phoneStatusDots.forEach(dot=>{
    dot.classList.toggle('is-active',active);
    dot.title=active?'С 05:00 до 00:00 по московскому времени':'С 00:00 до 05:00 по московскому времени';
   });
   if(!document.hidden)phoneStatusTimer=setTimeout(syncPhoneStatus,60000-Date.now()%60000+25);
  };
  syncPhoneStatus();
  document.addEventListener('visibilitychange',syncPhoneStatus);
  addEventListener('pageshow',syncPhoneStatus);
  addEventListener('focus',syncPhoneStatus);
  addEventListener('pagehide',()=>clearTimeout(phoneStatusTimer));
 }
 const cookieNotice=$('#cookie-notice');
 if(cookieNotice){
  const noticeKey='artbalkon.cookie-notice.v1';
  let dismissed=false;
  try{const saved=Number(localStorage.getItem(noticeKey));dismissed=saved>0&&Date.now()-saved<180*24*60*60*1000;}catch{}
  cookieNotice.hidden=dismissed;
  cookieNotice.querySelectorAll('[data-cookie-dismiss]').forEach(button=>button.addEventListener('click',()=>{
   cookieNotice.hidden=true;
   try{localStorage.setItem(noticeKey,String(Date.now()));}catch{}
  }));
 }

 let config={};
 const configReady=fetch(new URL('site-config.json',document.currentScript.src),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
  config=c;
  if(!c.leadEndpoint)document.querySelectorAll('[data-lead-form]').forEach(form=>{const note=form.querySelector('.form-error');if(note)note.textContent='Для расчёта позвоните нам: +7 (495) 165-39-05. Отправка заявок через сайт пока не подключена.';});
  if(c.whatsapp){try{const url=new URL(c.whatsapp);if(['wa.me','api.whatsapp.com','www.whatsapp.com'].includes(url.hostname)&&url.protocol==='https:')document.querySelectorAll('.final-links').forEach(container=>{const link=document.createElement('a');link.className='messenger';link.href=url.href;link.target='_blank';link.rel='noopener';link.dataset.event='whatsapp_click';link.textContent='Написать в WhatsApp ↗';container.append(link);});}catch{}}
  scheduleIdle(()=>{(c.externalScripts||[]).forEach(s=>{try{const url=new URL(typeof s==='string'?s:s.src);if(url.protocol!=='https:')return;const tag=document.createElement('script');tag.src=url.href;tag.async=true;if(s.id)tag.id=s.id;document.head.append(tag);}catch{}});});
 }).catch(()=>{});
 function scheduleIdle(callback){if('requestIdleCallback' in window)requestIdleCallback(callback,{timeout:2200});else setTimeout(callback,1200);}
 function track(event,params={}){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...params});}catch{}configReady.then(()=>{try{if(config.metrikaId&&typeof window.ym==='function')window.ym(config.metrikaId,'reachGoal',event,params);}catch{}});}
 const formGoalState=window[Symbol.for('artbalkon.form-goals.v1')] ||= {bound:new WeakSet(),sent:new Set()};
 try{const saved=JSON.parse(sessionStorage.getItem('artbalkon.form-goals.v1')||'[]');if(Array.isArray(saved))saved.filter(id=>typeof id==='string').forEach(id=>formGoalState.sent.add(id));}catch{}
 function trackFormSubmission(requestId){
  if(formGoalState.sent.has(requestId))return;
  formGoalState.sent.add(requestId);
  try{sessionStorage.setItem('artbalkon.form-goals.v1',JSON.stringify([...formGoalState.sent].slice(-500)));}catch{}
  // One direct goal call; no second form_submit dispatch through dataLayer.
  try{if(config.metrikaId&&typeof window.ym==='function')window.ym(config.metrikaId,'reachGoal','form_submit');}catch{}
 }
 async function sendLead(url,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});let result;try{result=await response.json();if(!result||typeof result!=='object'||Array.isArray(result))throw Error();}catch(err){if(err.name==='AbortError')throw err;throw new Error('Сервис отправки временно недоступен. Попробуйте ещё раз или позвоните нам.');}return {response,result};}
  finally{clearTimeout(timer);}
 }
 const attributionKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];
 let attribution={};try{attribution=JSON.parse(sessionStorage.getItem('artbalkon.attribution')||'{}');}catch{}
 if(!attribution||typeof attribution!=='object')attribution={};
 const query=new URLSearchParams(location.search);
 const fresh=Object.fromEntries(attributionKeys.filter(k=>query.has(k)).map(k=>[k,query.get(k).slice(0,300)]));
 if(Object.keys(fresh).length){attribution={...fresh,landing:location.pathname,referrer:document.referrer?new URL(document.referrer).origin:''};try{sessionStorage.setItem('artbalkon.attribution',JSON.stringify(attribution));}catch{}}
 document.addEventListener('dragstart',e=>{if(e.target.closest('a,button,img'))e.preventDefault();});
 document.addEventListener('contextmenu',e=>{if(e.target instanceof Element&&e.target.closest('img,picture,.before-after-preview,.project-image,.hero-image,.comparison-modal-grid figure'))e.preventDefault();});
 document.addEventListener('click',e=>{const link=e.target.closest('[data-event]');if(link)track(link.dataset.event,link.dataset.project?{project:link.dataset.project}:{});});
 document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
 const siteHeader=document.querySelector('.site-header');
 const syncHeader=()=>siteHeader?.classList.toggle('is-scrolled',scrollY>18);
 const scrollTopButton=$('#scroll-top'),scrollTopCalculator=$('[data-finishing-calculator]');
 const syncScrollTop=()=>{
  if(!scrollTopButton)return;
  const rect=innerWidth<=700?scrollTopCalculator?.getBoundingClientRect():null;
  const overCalculator=!!rect&&rect.top<innerHeight&&rect.bottom>0;
  scrollTopButton.hidden=scrollY<Math.max(480,innerHeight*.65)||overCalculator;
 };
 let scrollFrame=0;
 const syncScrollUi=()=>{scrollFrame=0;syncHeader();syncScrollTop();};
 syncScrollUi();addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScrollUi);},{passive:true});addEventListener('resize',syncScrollUi);
 scrollTopButton?.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
 const menu=$('#mobile-menu'),toggle=$('.menu-toggle'),menuBackdrop=$('.mobile-menu-backdrop');let menuCloseTimer=0,menuScrollY=0;
 function openMenu(){if(!menu||!toggle)return;clearTimeout(menuCloseTimer);menuScrollY=scrollY;document.body.style.setProperty('--menu-scroll-offset',`-${menuScrollY}px`);menu.hidden=false;menu.scrollTop=0;if(menuBackdrop)menuBackdrop.hidden=false;document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Закрыть меню');requestAnimationFrame(()=>requestAnimationFrame(()=>{menu.scrollTop=0;menu.classList.add('is-open');menuBackdrop?.classList.add('is-open');menu.querySelector('.mobile-menu-close')?.focus({preventScroll:true});}));}
 function closeMenu(restoreFocus=true,onClosed){if(!menu||!toggle||toggle.getAttribute('aria-expanded')!=='true')return;menu.classList.remove('is-open');menuBackdrop?.classList.remove('is-open');const restoreY=menuScrollY;document.body.classList.remove('menu-open');document.body.style.removeProperty('--menu-scroll-offset');const root=document.documentElement,previousBehavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';scrollTo(0,restoreY);root.style.scrollBehavior=previousBehavior;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');clearTimeout(menuCloseTimer);menuCloseTimer=setTimeout(()=>{if(toggle.getAttribute('aria-expanded')==='false'){menu.hidden=true;if(menuBackdrop)menuBackdrop.hidden=true;onClosed?.();}},matchMedia('(prefers-reduced-motion: reduce)').matches?0:300);if(restoreFocus)toggle.focus({preventScroll:true});}
 toggle?.addEventListener('click',()=>toggle.getAttribute('aria-expanded')==='true'?closeMenu():openMenu());
 menu?.addEventListener('click',e=>{
  const link=e.target.closest('a');if(!link)return;
  const href=link.getAttribute('href'),target=link.classList.contains('nav-section-link')&&href?.startsWith('#')?document.getElementById(href.slice(1)):null;
  if(!target||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey){closeMenu(false);return;}
  e.preventDefault();
  closeMenu(false,()=>{
   if(location.hash!==href)history.pushState(null,'',href);
   const heading=target.querySelector('h2,h1')||target;
   if(!heading.hasAttribute('tabindex')){heading.setAttribute('tabindex','-1');heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});}
   heading.focus({preventScroll:true});
   target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
 });
 document.querySelectorAll('[data-mobile-menu-close]').forEach(el=>el.addEventListener('click',()=>closeMenu()));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true')closeMenu();});
 addEventListener('resize',()=>{if(innerWidth>1100&&toggle?.getAttribute('aria-expanded')==='true')closeMenu(false);},{passive:true});
 document.querySelectorAll('.nav-services').forEach(dropdown=>{
  const desktop=dropdown.closest('.desktop-nav');
  if(desktop){
   dropdown.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')dropdown.open=true;});
   dropdown.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dropdown.contains(document.activeElement))dropdown.open=false;});
   dropdown.addEventListener('focusout',()=>{requestAnimationFrame(()=>{if(!dropdown.contains(document.activeElement))dropdown.open=false;});});
  }
  dropdown.addEventListener('keydown',e=>{if(e.key==='Escape'&&dropdown.open){e.preventDefault();e.stopPropagation();dropdown.open=false;dropdown.querySelector('summary').focus();}});
 });
 document.addEventListener('click',e=>{document.querySelectorAll('.nav-services[open]').forEach(dropdown=>{if(!dropdown.contains(e.target))dropdown.open=false;});});
 document.querySelectorAll('.service-page-faq').forEach((faq,index)=>{
  const answers=[...faq.querySelectorAll(':scope > div > details')];
  answers.forEach(answer=>{
   answer.setAttribute('name',`faq-${index}`);
   answer.addEventListener('toggle',()=>{
    if(answer.open)answers.forEach(other=>{if(other!==answer)other.open=false;});
   });
  });
 });
 const heroSlider=$('[data-hero-slider]');
 if(heroSlider){
  const slides=[...heroSlider.querySelectorAll('.hero-image')];
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let heroIndex=0,heroTimer=0;
  const loadSlide=slide=>{if(slide?.dataset.src){slide.src=slide.dataset.src;delete slide.dataset.src;}};
  const showHeroSlide=(index,preloadNext=true)=>{heroIndex=index;loadSlide(slides[heroIndex]);slides.forEach((slide,i)=>{const active=i===heroIndex;slide.classList.toggle('is-active',active);slide.setAttribute('aria-hidden',String(!active));});if(preloadNext)loadSlide(slides[(heroIndex+1)%slides.length]);};
  const stopHeroSlider=()=>{if(heroTimer){clearInterval(heroTimer);heroTimer=0;}};
  const startHeroSlider=()=>{if(document.hidden||reducedMotion.matches||slides.length<2||heroTimer)return;loadSlide(slides[(heroIndex+1)%slides.length]);heroTimer=setInterval(()=>showHeroSlide((heroIndex+1)%slides.length),3000);};
  showHeroSlide(0,false);
  mountVisibleActivity({element:heroSlider,start:startHeroSlider,stop:stopHeroSlider,reducedMotion});
 }
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let modalTriggerScrollY=null;
 const dialogScrollPositions=new WeakMap();
 document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-calc-request],[data-quiz-open],[data-callback-open],[data-application],[data-comparison],[data-cert-open],[data-gift-open],[data-promo-choice]'))modalTriggerScrollY=scrollY;},{passive:true});
 const restoreScrollPosition=top=>{if(!Number.isFinite(top))return;const root=document.documentElement,previousBehavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';scrollTo(0,top);requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollTo(0,top);root.style.scrollBehavior=previousBehavior;}));};
 const openDialogAtCurrentScroll=(dialog,focusTarget)=>{if(!dialog)return;const top=modalTriggerScrollY??scrollY;modalTriggerScrollY=null;dialogScrollPositions.set(dialog,top);if(!dialog.open)dialog.showModal();focusTarget?.focus({preventScroll:true});restoreScrollPosition(top);};
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{const top=dialogScrollPositions.get(dialog);dialogScrollPositions.delete(dialog);restoreScrollPosition(top);}));
 const retentionController=mountRetentionPopup({dialog:$('#retention-modal'),initialSubmitted:formGoalState.sent.size>0,track,openDialog:(dialog,focusTarget)=>{modalTriggerScrollY=null;openDialogAtCurrentScroll(dialog,focusTarget);}});
 document.querySelectorAll('[data-mobile-src]').forEach(video=>mountResponsiveVideo(video));
 const lazyVideos=[...document.querySelectorAll('[data-lazy-video]')];
 if('IntersectionObserver' in window){const videoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const video=entry.target;hydrateVideo(video);if(video.autoplay&&!video.hasAttribute('data-ambient-video')&&!reducedMotion.matches)video.play().catch(()=>{});videoObserver.unobserve(video);}),{rootMargin:'500px 0px'});lazyVideos.forEach(video=>videoObserver.observe(video));}
 else lazyVideos.forEach(hydrateVideo);
 lazyVideos.forEach(video=>{video.addEventListener('pointerdown',()=>hydrateVideo(video),{once:true});video.addEventListener('focus',()=>hydrateVideo(video),{once:true});});
 document.querySelectorAll('[data-ambient-video]').forEach(video=>mountAmbientVideo(video,{reducedMotion}));
 document.querySelectorAll('input[name="phone"]').forEach(mountPhoneMask);
 function validate(form,scope=form){
  const fields=[...scope.querySelectorAll('input,select,textarea')].filter(el=>!el.closest('.honeypot'));
  for(const el of fields){if(el.name==='phone')el.setCustomValidity(phoneIsValid(el.value)?'':'Введите 10 цифр после +7. Номер не должен состоять из одинаковых цифр.');if(el.name==='name'||el.name==='size')el.setCustomValidity(el.value.trim()?'':'Пожалуйста, заполните это поле.');if(!el.checkValidity()){el.reportValidity();el.focus();return false;}}
  return true;
 }
 document.querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>{el.setCustomValidity('');el.closest('form')?.querySelector('.form-error')?.replaceChildren();}));
 const quizDialog=document.querySelector('dialog#quiz-modal');
 const quizControllers=new Map();
 document.querySelectorAll('[data-lead-form="quiz"]').forEach(form=>{
  let step=0,started=false;
  const steps=[...form.querySelectorAll('[data-step]')],lastStep=Math.max(0,steps.length-1),stepCount=form.querySelector('[id^="step-count"]'),progress=form.querySelector('[id^="quiz-progress"]'),back=form.querySelector('.back-button'),next=form.querySelector('.quiz-next-button'),submit=form.querySelector('[type="submit"]');
  const inline=form.hasAttribute('data-inline-estimate'),section=inline?form.closest('.project-estimate-section'):null,gallery=section?.querySelector('[data-estimate-gallery]'),previews=[...(section?.querySelectorAll('[data-estimate-preview]')||[])];
  const begin=()=>{if(!started){track('quiz_start',inline?{source:'inline_estimate'}:{});started=true;}};
  const syncPreview=()=>{
   if(!previews.length)return;
   const stage=steps[step]?.dataset.estimateStage;
   const photoField=['gift','contact'].includes(stage)?'gift':stage==='object'?'object':'detail';
   const selected=form.querySelector('input[name="'+photoField+'"]:checked');
   const fallback=form.querySelector('input[name="'+photoField+'"][data-estimate-photo]');
   const key=selected?.dataset.estimatePhoto||(photoField==='object'?gallery?.dataset.estimateDefault:fallback?.dataset.estimatePhoto);
   if(!key||!previews.some(preview=>preview.dataset.estimatePreview===key))return;
   previews.forEach(preview=>preview.hidden=preview.dataset.estimatePreview!==key);
  };
  const syncNextState=()=>{const current=steps[step];if(!current||!next)return;const radios=[...current.querySelectorAll('input[type="radio"][required]')],radioNames=[...new Set(radios.map(input=>input.name))],otherRequired=[...current.querySelectorAll('input[required]:not([type="radio"]),select[required],textarea[required]')].filter(input=>!input.closest('.honeypot')),ready=radioNames.every(name=>radios.some(input=>input.name===name&&input.checked))&&otherRequired.every(input=>input.checkValidity());next.classList.toggle('is-ready',ready);next.disabled=!ready;next.setAttribute('aria-disabled',String(!ready));};
  const showStep=(index,focus=true)=>{step=Math.max(0,Math.min(lastStep,index));steps.forEach((el,i)=>el.hidden=i!==step);stepCount.textContent=`Шаг ${step+1} из ${steps.length}`;progress.max=steps.length;progress.value=step+1;back.disabled=step===0;next.hidden=step===lastStep;submit.hidden=step!==lastStep;form.querySelector('.form-error').textContent='';syncPreview();syncNextState();if(focus)steps[step]?.querySelector('legend,input[name="name"]')?.focus({preventScroll:true});};
  const advance=()=>{begin();if(validate(form,steps[step]))showStep(Math.min(lastStep,step+1));};
  const controller={form,steps,lastStep,begin,showStep,advance,currentStep:()=>step,atLastStep:()=>step===lastStep};quizControllers.set(form,controller);
  form.addEventListener('change',()=>{begin();syncPreview();syncNextState();form.querySelector('.form-error')?.replaceChildren();});
  form.addEventListener('input',()=>{begin();syncNextState();});
  next?.addEventListener('click',advance);back?.addEventListener('click',()=>showStep(Math.max(0,step-1)));
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&step<lastStep&&e.target.tagName==='INPUT'){e.preventDefault();if(next&&!next.disabled)advance();}});
  if(inline)form.addEventListener('reset',()=>requestAnimationFrame(()=>showStep(0,false)));
  showStep(0,false);
 });
 const modalQuiz=quizDialog?.querySelector('[data-lead-form="quiz"]');
 const primaryQuizController=quizControllers.get(modalQuiz)||quizControllers.values().next().value;
 const quiz=primaryQuizController?.form||null;
 function openQuiz(trackOpen=true){if(!quizDialog)return;openDialogAtCurrentScroll(quizDialog,quizDialog.querySelector('.quiz-modal-close'));if(trackOpen)track('quiz_open');}
 document.addEventListener('click',e=>{
  const trigger=e.target.closest('[data-quiz-open]');if(!trigger||!quizDialog)return;e.preventDefault();closeMenu();
  const glazing=trigger.closest('[data-glazing-choice]')?.dataset.glazingChoice,value={cold:'Холодный балкон',warm:'Тёплый балкон'}[glazing];
  const option=value?modalQuiz?.querySelector('input[name="detail"][value="'+value+'"]'):null;
  if(option){option.checked=true;primaryQuizController?.showStep(0,false);}
  openQuiz();
 });
 quizDialog?.querySelector('.quiz-modal-close')?.addEventListener('click',()=>quizDialog.close());
 quizDialog?.addEventListener('click',e=>{if(e.target===quizDialog)quizDialog.close();});
 if(location.hash==='#quiz'&&!document.querySelector('[data-inline-estimate]')){openQuiz(false);history.replaceState(null,'',location.pathname+location.search);}
 const callbackDialog=document.querySelector('dialog#callback-modal');
 function openCallback(trackOpen=true){if(!callbackDialog)return;openDialogAtCurrentScroll(callbackDialog,callbackDialog.querySelector('input[name="name"]'));if(trackOpen)track('callback_open');}
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-callback-open]');if(!trigger||!callbackDialog)return;e.preventDefault();closeMenu();openCallback();});
 callbackDialog?.querySelector('.callback-modal-close')?.addEventListener('click',()=>callbackDialog.close());
 callbackDialog?.addEventListener('click',e=>{if(e.target===callbackDialog)callbackDialog.close();});
 if(location.hash==='#callback'){openCallback(false);history.replaceState(null,'',location.pathname+location.search);}
 function showThanks(form,preview){
  const box=document.createElement('div');box.className='thank-you';box.setAttribute('role','status');box.tabIndex=-1;
  const icon=document.createElement('span');icon.className='success-icon';icon.textContent='✓';icon.setAttribute('aria-hidden','true');
  const title=document.createElement('h3');title.textContent=preview?'Спасибо! Форма работает.':form.dataset.leadForm==='callback-popup'?'Заявка на звонок отправлена':'Спасибо! Заявка принята.';
  const text=document.createElement('p');text.textContent=preview?'Это предварительный просмотр сайта. Тестовая заявка сохранена, но менеджеру пока не отправлена.':form.dataset.leadForm==='callback-popup'?'Позвоним вам, обсудим балкон или лоджию и ответим на вопросы.':'Свяжемся с вами, уточним детали и подготовим предварительный расчёт.';
  const phone=document.createElement('a');phone.className='text-link';phone.href='tel:+74951653905';phone.dataset.event='phone_click';phone.textContent='Позвонить: +7 (495) 165-39-05';
  box.append(icon,title,text);if(form.dataset.leadForm!=='callback-popup')box.append(phone);form.replaceChildren(box);
  const dialog=form.closest('.application-modal,.quiz-modal,.retention-modal');
  if(dialog){dialog.classList.add('is-submitted');title.id=dialog.id+'-success-title';dialog.setAttribute('aria-labelledby',title.id);}
  box.focus({preventScroll:true});
 }
 document.querySelectorAll('[data-lead-form]').forEach(form=>{if(formGoalState.bound.has(form))return;formGoalState.bound.add(form);let submitting=false,id=null;
  form.addEventListener('submit',async e=>{e.preventDefault();if(submitting)return;
   const quizController=quizControllers.get(form);if(quizController&&!quizController.atLastStep()){quizController.advance();return;}if(!validate(form))return;
   const submit=form.querySelector('[type="submit"]'),error=form.querySelector('.form-error');
   submitting=true;submit.disabled=true;submit.setAttribute('aria-busy','true');const old=submit.innerHTML;submit.textContent='Отправляем…';error.textContent='';
   try{
    await configReady;if(!config.leadEndpoint)throw new Error('Отправка заявок через сайт пока не подключена. Позвоните нам: +7 (495) 165-39-05.');const values=Object.fromEntries(new FormData(form));id=id||crypto.randomUUID();
    const {response,result}=await sendLead(config.leadEndpoint||'/api/leads',{...values,consent:values.consent==='on',form:form.dataset.leadForm,attribution,page:location.pathname,requestId:id});
    if(!response.ok||result.ok!==true)throw new Error(result.message||'Не удалось отправить заявку.');
    retentionController?.leadSucceeded();
    showThanks(form,result.mode==='preview');
    if(result.mode!=='preview'){trackFormSubmission(id);if(form.dataset.leadForm==='quiz')track('quiz_complete');}
   }catch(err){error.textContent=(err.name==='TimeoutError'||err.name==='AbortError')?'Ответ задерживается. Попробуйте ещё раз или позвоните нам.':err.message==='Failed to fetch'?'Нет соединения. Проверьте интернет и попробуйте ещё раз.':err.message;submit.disabled=false;submit.removeAttribute('aria-busy');submit.innerHTML=old;submitting=false;}
  });
 });
 const context=document.modelContext;
 const serviceOptions=quiz?[...quiz.querySelectorAll('input[type="radio"][name="service"]')]:[];
 if(context?.registerTool&&serviceOptions.length&&primaryQuizController){const lifecycle=new AbortController();const serviceValues=serviceOptions.map(el=>el.value);try{Promise.resolve(context.registerTool({name:'start_balcony_calculation',description:'Открывает расчёт и выбирает необходимую работу. Не отправляет заявку.',inputSchema:{type:'object',properties:{service:{type:'string',enum:serviceValues}},required:['service'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const option=serviceOptions.find(el=>el.value===input?.service);if(!option)throw Error('Неизвестная услуга');option.checked=true;primaryQuizController.begin();openQuiz(false);const optionStep=primaryQuizController.steps.findIndex(item=>item.contains(option));primaryQuizController.showStep(Math.min(primaryQuizController.lastStep,optionStep+1));return {service:option.value,step:primaryQuizController.currentStep()+1,totalSteps:primaryQuizController.steps.length,submitted:false};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}

 const giftDialog=$('#gift-modal'),giftLead=$('#gift-lead-modal');
 if(document.querySelector('.gift-badge-icon'))import(new URL('gift-3d.js',siteBase).href).then(module=>module.mountGifts()).catch(()=>{});
 let giftOpening=false;
 document.addEventListener('click',e=>{
  const giftTrigger=e.target.closest('[data-gift-open]');if(giftTrigger&&!giftOpening){giftOpening=true;const top=scrollY;Promise.resolve(giftTrigger.querySelector('.gift-badge-icon')?.gift3d?.open()).then(()=>{modalTriggerScrollY=top;openDialogAtCurrentScroll(giftDialog,giftDialog.querySelector('[data-gift-close]'));track('gift_open');}).finally(()=>{giftOpening=false;});}
  const choice=e.target.closest('[data-promo-choice]');
  if(choice&&giftLead){const project=choice.dataset.project;giftLead.querySelector('[data-gift-selected]').textContent=project;const input=giftLead.querySelector('input[name="project"]');if(input)input.value=project;giftDialog.close();openDialogAtCurrentScroll(giftLead,giftLead.querySelector('input[name="name"]'));track('gift_select',{project});}
 });
 giftDialog?.querySelector('[data-gift-close]').addEventListener('click',()=>giftDialog.close());
 giftLead?.querySelector('.application-close').addEventListener('click',()=>giftLead.close());
 [giftDialog,giftLead].forEach(dialog=>dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close();}));

 const applicationModal=$('#application-modal');
 if(applicationModal){
  const applicationProject=$('#application-project');
  const applicationProjectInput=applicationModal.querySelector('input[name="project"]');
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-application]');if(!trigger)return;const project=trigger.dataset.project||'Преображение балкона';applicationProject.textContent=trigger.dataset.projectDisplay||project;applicationProjectInput.value=project;openDialogAtCurrentScroll(applicationModal,applicationModal.querySelector('.application-close'));track('transformation_lead_open',{project});});
  applicationModal.querySelector('.application-close')?.addEventListener('click',()=>applicationModal.close());
  applicationModal.addEventListener('click',e=>{if(e.target===applicationModal)applicationModal.close();});
 }
 document.querySelectorAll('[data-before-after-more]').forEach(button=>{
  const section=button.closest('.before-after-section');
  button.addEventListener('click',()=>{
   const remaining=[...section?.querySelectorAll('.before-after-card[hidden]')||[]];
   const nextCards=remaining.slice(0,6);
   nextCards.forEach(card=>{card.hidden=false;card.classList.add('is-visible');});
   button.setAttribute('aria-expanded','true');
   if(remaining.length<=6){
    button.hidden=true;
    nextCards[0]?.querySelector('[data-comparison]')?.focus({preventScroll:true});
   }
   if(nextCards.length)track('before_after_show_more',{count:nextCards.length});
  });
 });
 document.querySelectorAll('.glazing-benefits-copy').forEach(block=>{
  const items=[...block.querySelectorAll('.glazing-benefit-item')];
  const desktop=matchMedia('(min-width:641px)');
  let activeItem=items.find(item=>item.classList.contains('is-open'))||null;
  const sync=()=>items.forEach(item=>{
   const open=desktop.matches||item===activeItem;
   item.classList.toggle('is-open',open);
   const toggle=item.querySelector('.glazing-benefit-toggle');
   if(toggle){toggle.setAttribute('aria-expanded',String(open));toggle.disabled=desktop.matches;}
  });
  items.forEach(item=>{
   item.querySelector('.glazing-benefit-toggle')?.addEventListener('click',()=>{
    if(desktop.matches)return;
    activeItem=activeItem===item?null:item;
    sync();
   });
  });
  desktop.addEventListener('change',sync);
  sync();
 });
 const comparisonModal=$('#comparison-modal');
 if(comparisonModal){
  let comparisonOpener=null,comparisonOpenedByPointer=false;
  document.addEventListener('keydown',e=>{if(!['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(e.key))return;comparisonOpenedByPointer=false;document.querySelectorAll('[data-comparison].is-pointer-dialog-return').forEach(card=>card.classList.remove('is-pointer-dialog-return'));});
  const beforeImage=$('#comparison-before'),afterImage=$('#comparison-after'),beforeLabel=$('#comparison-before-label'),afterLabel=$('#comparison-after-label'),comparisonTitle=$('#comparison-title');
  const comparisonCards=[...document.querySelectorAll('[data-comparison]')],comparisonPrev=comparisonModal.querySelector('.comparison-prev'),comparisonNext=comparisonModal.querySelector('.comparison-next');
  let comparisonIndex=0;
  const comparisonGrid=comparisonModal.querySelector('.comparison-modal-grid');
  const repairControl=document.createElement('input');
  repairControl.type='range';repairControl.min='0';repairControl.max='100';repairControl.value='50';repairControl.hidden=true;
  repairControl.setAttribute('aria-label','Показать больше фото до или после ремонта');
  const repairDivider=document.createElement('span');repairDivider.className='repair-divider';repairDivider.innerHTML='<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg></span>';repairDivider.hidden=true;repairDivider.setAttribute('aria-hidden','true');
  comparisonGrid.append(repairDivider,repairControl);
  repairControl.addEventListener('input',()=>{comparisonGrid.style.setProperty('--split',repairControl.value+'%');repairControl.setAttribute('aria-valuetext',repairControl.value+'% фото до ремонта');});
  const fitComparison=()=>{
   if(!comparisonModal.open||![beforeImage,afterImage].every(img=>img.complete&&img.naturalWidth))return;
   const grid=comparisonModal.querySelector('.comparison-modal-grid'),shell=comparisonModal.querySelector('.comparison-modal-shell');
   if(comparisonGrid.classList.contains('repair-modal-compare')){
    const ratio=afterImage.naturalWidth/afterImage.naturalHeight;
    const height=Math.max(120,innerHeight-180);
    comparisonModal.style.width=Math.min(900,innerWidth-24,height*ratio+32)+'px';
    comparisonGrid.style.gridTemplateColumns='minmax(0,1fr)';comparisonGrid.style.aspectRatio=String(ratio);
    return;
   }
   comparisonGrid.style.removeProperty('aspect-ratio');
   const ratios=[beforeImage,afterImage].map(img=>Math.max(3/4,img.naturalWidth/img.naturalHeight));
   [beforeImage,afterImage].forEach((img,index)=>{img.style.aspectRatio=String(ratios[index]);img.style.objectFit='cover';});
   const mobile=matchMedia('(max-width:640px)').matches;
   const padding=parseFloat(getComputedStyle(shell).paddingLeft)+parseFloat(getComputedStyle(shell).paddingRight);
   const gap=parseFloat(getComputedStyle(grid).columnGap)||0;
   const height=Math.max(120,innerHeight-180);
   const contentWidth=height*(mobile?Math.max(...ratios):ratios[0]+ratios[1])+(mobile?0:gap);
   comparisonModal.style.width=Math.min(1480,innerWidth-(mobile?20:48),contentWidth+padding)+'px';
   grid.style.gridTemplateColumns=mobile?'minmax(0,1fr)':ratios.map(r=>`minmax(0,${r}fr)`).join(' ');
  };
  beforeImage.addEventListener('load',fitComparison);
  afterImage.addEventListener('load',fitComparison);
  new MutationObserver(fitComparison).observe(comparisonModal,{attributes:true,attributeFilter:['open']});
  window.addEventListener('resize',fitComparison);
  const showComparison=(index,trackOpen=false,syncUrl=true)=>{if(!comparisonCards.length)return;comparisonIndex=(index+comparisonCards.length)%comparisonCards.length;const card=comparisonCards[comparisonIndex],beforeReal=card.dataset.beforeReal==='true',beforeVisualized=card.dataset.beforeVisualized==='true',visualized=card.dataset.visualized==='true';const repair=card.dataset.case==='work-4';comparisonGrid.classList.toggle('repair-modal-compare',repair);repairControl.hidden=!repair;repairDivider.hidden=!repair;repairControl.value='50';comparisonGrid.style.setProperty('--split','50%');beforeImage.style.removeProperty('aspect-ratio');afterImage.style.removeProperty('aspect-ratio');beforeImage.src=new URL(card.dataset.before,siteBase).href;afterImage.src=new URL(card.dataset.after,siteBase).href;comparisonTitle.textContent=card.dataset.title;beforeLabel.textContent='До';afterLabel.textContent='После';beforeImage.alt=`${card.dataset.title} — ${beforeVisualized||visualized?'до работ':beforeReal?'до работ ArtBalkon':'до ремонта'}`;afterImage.alt=`${card.dataset.title} — ${visualized?'после работ':'после работ ArtBalkon'}`;if(syncUrl){const url=new URL(location.href);url.searchParams.set('case',card.dataset.case);history[comparisonModal.open?'replaceState':'pushState'](history.state,'',url);}if(!comparisonModal.open)openDialogAtCurrentScroll(comparisonModal,comparisonModal.querySelector('.comparison-close'));if(trackOpen)track('before_after_open',{project:card.dataset.title});};
  document.addEventListener('click',e=>{const card=e.target.closest('[data-comparison]');if(!card)return;comparisonOpener=card;comparisonOpenedByPointer=e.detail>0;card.classList.toggle('is-pointer-dialog-return',comparisonOpenedByPointer);showComparison(comparisonCards.indexOf(card),true);});
  comparisonPrev?.addEventListener('click',()=>showComparison(comparisonIndex-1));
  comparisonNext?.addEventListener('click',()=>showComparison(comparisonIndex+1));
  comparisonModal.addEventListener('keydown',e=>{if(e.target===repairControl)return;if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();showComparison(comparisonIndex+(e.key==='ArrowRight'?1:-1));});
  comparisonModal.querySelector('.comparison-close')?.addEventListener('click',()=>comparisonModal.close());
  comparisonModal.addEventListener('click',e=>{if(e.target===comparisonModal)comparisonModal.close();});
  comparisonModal.addEventListener('close',()=>{if(comparisonOpener?.isConnected){const opener=comparisonOpener;opener.classList.toggle('is-pointer-dialog-return',comparisonOpenedByPointer);opener.focus({preventScroll:true});opener.addEventListener('blur',()=>opener.classList.remove('is-pointer-dialog-return'),{once:true});}comparisonOpener=null;comparisonOpenedByPointer=false;beforeImage.removeAttribute('src');afterImage.removeAttribute('src');const url=new URL(location.href);if(url.searchParams.has('case')){url.searchParams.delete('case');history.replaceState(history.state,'',url);}});
  const restoreCaseFromUrl=()=>{const id=new URL(location.href).searchParams.get('case');const index=comparisonCards.findIndex(card=>card.dataset.case===id);if(index>=0)showComparison(index,true,false);else if(comparisonModal.open)comparisonModal.close();};
  window.addEventListener('popstate',restoreCaseFromUrl);
  restoreCaseFromUrl();
 }
 const finishingStyles=$('[data-finishing-styles]');
 if(finishingStyles){
  const finishingTabs=[...finishingStyles.querySelectorAll('[data-finishing-tab]')];
  const finishingPanels=[...finishingStyles.querySelectorAll('[data-finishing-panel]')];
  const selectFinishingStyle=(id,focus=false)=>{finishingTabs.forEach(tab=>{const active=tab.dataset.finishingTab===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus({preventScroll:true});});finishingPanels.forEach(panel=>panel.hidden=panel.dataset.finishingPanel!==id);};
  finishingTabs.forEach((tab,index)=>{tab.addEventListener('click',()=>{selectFinishingStyle(tab.dataset.finishingTab);track('finishing_style_view',{style:tab.dataset.finishingTab});});tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?finishingTabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+finishingTabs.length)%finishingTabs.length;selectFinishingStyle(finishingTabs[next].dataset.finishingTab,true);});});
 }
// All surfaces share the photograph's perspective. Mirroring places the street
// glazing on the right; the apartment door and window stay on the left.
function createCalculatorScene(root) {
 const canvas=root.querySelector('[data-calc-canvas]'),ctx=canvas.getContext('2d');
 if(!ctx)return ()=>{};
 const base=new Image(),atlas=new Image(),insulation=new Image(),cache=new Map();
 const canopyJoint=(root.querySelector('[data-calc-canopy-joint]')?.dataset.calcCanopyJoint||'30.5 55.9').split(' ').map(Number);
 const canopySurface=(root.querySelector('[data-calc-canopy-surface]')?.dataset.calcCanopySurface||'').split(';').filter(Boolean).map(point=>point.split(' ').map(Number));
 let selection=null,ready=false,frame=0;
 const cells={laminate:0,'laminate-wall':0,lining:1,parquet:2,pvc:3,vinyl:4,tile:5,linoleum:6,concrete:7,outside:8};
 // A deeper parapet grows into the room; its street face stays below the glass.
 // Side cavities match the 7.5-unit roof cut; the structural wall stays separate.
 const sectionInsulationDepth=7.5;
 const parapetDepth=23,parapetNear=47.5+parapetDepth,parapetFar=108.5+parapetDepth*111.5/245.5;
 const floorBase=[[parapetFar,317],[220,317],[293,427.5],[parapetNear,427.5]];
 const floorSurface=floorBase.map(([x,y],i)=>[x,y-(i<2?2.5:9)]);
 const floorRecess={far:.8,near:3.2};
 // Wall finishes stop at the same raised floor edge; the slab stays below it.
 const surfaces={back:[[108.5,140],[220,140],floorSurface[1],[108.5,floorSurface[0][1]]],house:[[220,140],[298,57],floorSurface[2],floorSurface[1]],parapet:[[parapetNear,304],[parapetFar,267],floorSurface[0],floorSurface[3]],ceiling:[[43,63],[298,63],[220,140],[108.5,140]],floor:floorSurface};
 const polygon=q=>{ctx.beginPath();q.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();};
 const fill=(q,color)=>{polygon(q);ctx.fillStyle=color;ctx.fill();};
 function texture(key,rx=1,ry=1,rotate=false,offset=0){
  const id=[key,rx,ry,rotate,offset].join(':');if(cache.has(id))return cache.get(id);
  if(key==='tile')for(const cached of cache.keys())if(cached.startsWith('tile:'))cache.delete(cached);
  const tile=document.createElement('canvas');tile.width=tile.height=416;const t=tile.getContext('2d');
  // The foam texture is separate from the timber geometry, so it sits below
  // the joists instead of carrying a flattened photograph of the whole frame.
  if(key==='insulated'){t.drawImage(insulation,72,70,250,250,0,0,416,416);}
  else if(key==='timber'){t.drawImage(insulation,60,365,285,27,0,0,416,416);}
  else if(key==='stretch'){t.fillStyle='#f1f0eb';t.fillRect(0,0,416,416);}
  else {const cell=cells[key],size=atlas.width/3;
   // Use one tile face; grout is drawn as a continuous, evenly spaced grid.
   if(key==='tile')t.drawImage(atlas,(cell%3)*size+size*.38,Math.floor(cell/3)*size+size*.38,size*.24,size*.24,0,0,416,416);
   else if(key==='laminate-wall'){
    // Five complete rows repeat cleanly; only the wall uses this crop.
    t.drawImage(atlas,(cell%3)*size+2,Math.floor(cell/3)*size+size*39/418,size-4,size*310/418,0,0,416,416);
   }
   else if(key==='parquet'){
    // Repeat complete plank rows so the edge rows do not merge into a wide board.
    t.drawImage(atlas,(cell%3)*size+2,Math.floor(cell/3)*size+40,size-4,size-90,0,0,416,416);
   }
   else t.drawImage(atlas,(cell%3)*size+2,Math.floor(cell/3)*size+2,size-4,size-4,0,0,416,416);
  }
  const out=document.createElement('canvas');out.width=out.height=1024;const c=out.getContext('2d');
  if(rotate){c.translate(1024,0);c.rotate(Math.PI/2);}
  const tw=1024/rx,th=1024/ry,gap=key==='tile'?.005:0;
  if(gap){c.fillStyle='#92918b';c.fillRect(0,0,1024,1024);}
  for(let y=0;y<Math.ceil(ry+offset);y++)for(let x=0;x<Math.ceil(rx);x++)c.drawImage(tile,x*tw+tw*gap/2,(y-offset)*th+th*gap/2,tw*(1-gap),th*(1-gap));
  cache.set(id,out);return out;
 }
 function projection(q){
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  const d=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/d,h=(dx1*dy3-dx3*dy1)/d;
  return (u,v)=>[(x0+(x1-x0+g*x1)*u+(x3-x0+h*x3)*v)/(1+g*u+h*v),(y0+(y1-y0+g*y1)*u+(y3-y0+h*y3)*v)/(1+g*u+h*v)];
 }
 function triangle(img,s,p){
  const [a,b,c]=s,[A,B,C]=p,det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  const m=i=>[((B[i]-A[i])*(c[1]-a[1])-(C[i]-A[i])*(b[1]-a[1]))/det,((C[i]-A[i])*(b[0]-a[0])-(B[i]-A[i])*(c[0]-a[0]))/det];
  const [aa,cc]=m(0),[bb,dd]=m(1),center=[(A[0]+B[0]+C[0])/3,(A[1]+B[1]+C[1])/3];
  ctx.save();polygon(p.map(([x,y])=>{const dx=x-center[0],dy=y-center[1],r=Math.hypot(dx,dy);return[x+dx/r*.22,y+dy/r*.22];}));ctx.clip();
  ctx.transform(aa,bb,cc,dd,A[0]-aa*a[0]-cc*a[1],A[1]-bb*a[0]-dd*a[1]);ctx.drawImage(img,0,0);ctx.restore();
 }
 function plane(q,key,rx=1,ry=1,rotate=false,shade=null,n=16,offset=0){
  const img=texture(key,rx,ry,rotate,offset),map=projection(q);
  ctx.save();polygon(q);ctx.clip();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const uv=[[x/n,y/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n],[x/n,(y+1)/n]];
   for(const ids of [[0,1,2],[0,2,3]])triangle(img,ids.map(i=>uv[i].map(v=>v*1024)),ids.map(i=>map(...uv[i])));
  }
  if(shade){const grad=ctx.createLinearGradient(...shade.axis);shade.stops.forEach(([p,c])=>grad.addColorStop(p,c));ctx.fillStyle=grad;ctx.fillRect(0,0,340,480);}
  ctx.restore();
 }
 const line=(points,color,width)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 const section=(map,u0,v0,u1,v1)=>[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(p=>map(...p));
 function glow(x,y,r,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,241,198,${alpha})`);g.addColorStop(1,'rgba(255,241,198,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 function insulatedSurface(q,isFloor=false,filled=true){
  const map=projection(q),depth=isFloor?[.7,floorRecess.near]:[1.2,1.3];
  const recessed=isFloor?(filled?q.map(([x,y],i)=>[x,y+(i<2?floorRecess.far:floorRecess.near)]):floorBase):q,foamMap=projection(recessed);
  plane(recessed,filled?'insulated':'concrete',2,2,false,{axis:[q[0][0],q[0][1],q[2][0],q[2][1]],stops:[[0,'#392f2250'],[.6,'#fff4c509'],[1,'#392f2240']]});
  ctx.save();polygon(q);ctx.clip();
  function batten(u0,v0,u1,v1,vertical){
   const top=section(map,u0,v0,u1,v1),low=isFloor?section(foamMap,u0,v0,u1,v1):top.map(([x,y])=>[x+depth[0],y+depth[1]]);
   ctx.save();ctx.shadowColor='#3f2a1866';ctx.shadowBlur=1.6;ctx.shadowOffsetX=depth[0];ctx.shadowOffsetY=depth[1];fill(top,'#b28b57');ctx.restore();
   fill([top[1],low[1],low[2],top[2]],'#947344');fill([top[3],top[2],low[2],low[3]],'#aa8452');
   plane(top,'timber',vertical?1:2,vertical?3:1,vertical,null,5);
   line([top[0],top[1]],'#fff3d57a',.45);line([top[1],top[2]],'#72543465',.5);
   for(const v of vertical?[.18,.58,.87]:[.5]){
    const p=map((u0+u1)/2,v0+(v1-v0)*v);ctx.fillStyle='#6b6a5c';ctx.beginPath();ctx.ellipse(p[0],p[1],isFloor?.48:.6,.45,0,0,Math.PI*2);ctx.fill();
   }
  }
  // Cross blocking is below the continuous longitudinal joists.
  for(const v of isFloor?[0,.46,.96]:[0,.26,.49,.72,.96])batten(0,v,1,Math.min(1,v+.04),false);
  for(const u of [0,.19,.38,.57,.76,.955])batten(u,0,Math.min(1,u+.035),1,true);
  ctx.restore();
 }
 function recessedBay(q,kind,filled=false,flushTop=false){
  const [[left,top],,[right,bottom]]=q,width=right-left;
  // Insulation sits slightly behind the timber ends, inside each separate bay.
  const setback=filled?.42:1;
  const shift=kind==='side'?0:Math.max(-1.5,Math.min(1.5,(170-(left+right)/2)*.02));
  const rearTop=top+(flushTop?0:(kind==='roof'?2.5:.8)*setback);
  const rear=kind==='side'?[[left+width*3/8.5*setback,top+1.3*setback],[right-width*.65/8.5*setback,top+1.3*setback],[right-width*.65/8.5*setback,bottom-3*setback],[left+width*3/8.5*setback,bottom-3*setback]]:
   [[left+(2.7+shift)*setback,rearTop],[right-(2.7-shift)*setback,rearTop],[right-(2.7-shift)*setback,bottom-(kind==='roof'?.8:3)*setback],[left+(2.7+shift)*setback,bottom-(kind==='roof'?.8:3)*setback]];
  ctx.save();polygon(q);ctx.clip();
  fill(q,filled?'#6e6047':'#36332e');
  plane(rear,filled?'insulated':'concrete',Math.max(1,width/35),1,false,{axis:[rear[0][0],rear[0][1],rear[2][0],rear[2][1]],stops:filled?[[0,'#5b462c3d'],[.45,'#fff0c50d'],[1,'#50412d45']]:[[0,'#151511ce'],[.45,'#25241eab'],[1,'#39362ba3']]},4);
  for(let i=0;i<4;i++){
   if(flushTop&&i===0)continue;
   const j=(i+1)%4,face=[q[i],q[j],rear[j],rear[i]],timber=kind==='side'?(i===0||i===2):(i===1||i===3);
   plane(face,timber?'timber':'concrete',1,1,kind!=='side',null,3);
   const g=ctx.createLinearGradient(q[i][0],q[i][1],rear[i][0],rear[i][1]);
   const shadow=i===0?'#1b1c1759':i===3?'#34332b48':'#b9ab8910';
   g.addColorStop(0,i===2?'#fff1ca20':shadow);g.addColorStop(1,filled?'#342c205c':i===2?'#302d214d':'#24231b9e');
   fill(face,g);
  }
  // Contact shadows sit at the rear corners, behind the unchanged timber ends.
  line([rear[3],rear[0],rear[1]],filled?'#59452d80':'#191b17a6',.6);
  line([rear[1],rear[2],rear[3]],filled?'#5e503b60':'#0f130f70',.45);
  ctx.restore();
 }
 function floorSection(q,material,filled){
  const left=q[3],right=q[2],bottom=floorBase[3][1]+1.2,width=right[0]-left[0],ribs=[0,.19,.38,.57,.76,.955];
  const finish=({tile:{thickness:1,bed:.75,colors:['#c4c6bd','#8e948d'],base:['#a8aca3','#747b72']},laminate:{thickness:.65,bed:.35,colors:['#d3bf96','#958264'],base:['#b0a58c','#837960']},vinyl:{thickness:.35,bed:.2,colors:['#aaa99d','#74796f'],base:['#b7b9ad','#929a8d']},linoleum:{thickness:.25,bed:.3,colors:['#b8b3a0','#898878'],base:['#acae9f','#858d7d']}})[material];
  const deck=finish?1.2:0,top=left[1]+(finish?finish.thickness+finish.bed+deck:0);
  const openFoam=filled&&!finish,bayTop=top+(openFoam?floorRecess.near:0);
  // The same front joists bound the recessed bays, with or without insulation.
  for(let i=0;i<ribs.length-1;i++){
   const x0=left[0]+(ribs[i]+.035)*width,x1=left[0]+ribs[i+1]*width;
   recessedBay([[x0,bayTop],[x1,bayTop],[x1,bottom],[x0,bottom]],'floor',filled,openFoam);
  }
  ribs.forEach((u,index)=>{
   const x=left[0]+u*width,w=(index===ribs.length-1?1-u:.035)*width;
   const g=ctx.createLinearGradient(x,top,x+w,bottom);g.addColorStop(0,'#e4cc9f');g.addColorStop(.5,'#bea477');g.addColorStop(1,'#987d52');ctx.fillStyle=g;ctx.fillRect(x,top,w,bottom-top);
   for(let y=top+1;y<bottom;y+=2)line([[x+.4,y],[x+w-.4,y+.4]],'#6d542c30',.35);
   line([[x,top],[x,bottom]],'#674b2a55',.5);
  });
  if(finish){
   const strip=(start,end,colors)=>{const g=ctx.createLinearGradient(left[0],left[1]+start,left[0],left[1]+end);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);fill([[left[0],left[1]+start],[right[0],right[1]+start],[right[0],right[1]+end],[left[0],left[1]+end]],g);};
   strip(0,finish.thickness,finish.colors);strip(finish.thickness,finish.thickness+finish.bed,finish.base);
   // A continuous load-bearing deck separates every finish from the joists.
   strip(finish.thickness+finish.bed,finish.thickness+finish.bed+deck,material==='tile'?['#b9b9ab','#858d82']:['#c6b493','#897859']);
   line([left,right],material==='tile'?'#e0e1d7':'#e3d8be',.45);
   if(material==='tile'){
    const tiles=Number(selection.width)/40,map=projection(q);
    for(let i=1;i<tiles;i++){const p=map(i/tiles,1);line([p,[p[0],p[1]+finish.thickness]],'#69756b',.38);}
   }
   line([[left[0],top],[right[0],top]],'#4e51455c',.35);
  }
  line([[left[0],bottom],[right[0],bottom]],'#3e392c66',.8);
 }
 function streetSection(){
  const outer=selection['glazing-enabled']&&selection.glazing==='cold'?36.3:31,inner=outer+5.4;
  return {outer,inner,core:parapetNear-sectionInsulationDepth};
 }
 // Use the front floor cut as the timber-size reference for both side cuts.
 const sectionTimber={width:(floorSurface[2][0]-floorSurface[3][0])*.035,pitch:(floorSurface[2][0]-floorSurface[3][0])*.19};
 function sideTimberRuns(top,bottom){
  const runs=[[bottom-sectionTimber.width,bottom]];
  // Both cuts share one grid, anchored to the floor. Keep end bays at least as wide.
  for(let y=bottom-sectionTimber.width-sectionTimber.pitch;y>=top+sectionTimber.pitch;y-=sectionTimber.pitch)runs.unshift([y,y+sectionTimber.width]);
  runs.unshift([top,top+sectionTimber.width]);return runs;
 }
 function sideSection(filled){
  // The inner lining remains separate from the mineral core.
  const left=streetSection().core,right=surfaces.floor[3][0],top=303.3,bottom=surfaces.floor[3][1],ribs=sideTimberRuns(top,bottom);
  for(let i=0;i<ribs.length-1;i++)recessedBay([[left,ribs[i][1]],[right,ribs[i][1]],[right,ribs[i+1][0]],[left,ribs[i+1][0]]],'side',filled);
  for(const [y0,y1] of ribs){
   const q=[[left,y0],[right,y0],[right,y1],[left,y1]];
   plane(q,'timber',1,1,false,null,2);line([[left,y1],[right,y1]],'#62482880',.65);
   line([[left,y0],[right,y0]],'#f3dfbca6',.45);
  }
  line([[left,top],[left,bottom]],'#725b3f',Math.min(.8,(right-left)*.15));line([[right-.4,top],[right-.4,bottom]],'#eedabc',Math.min(.85,(right-left)*.17));
  // The thicker lining bears on a continuous mineral foot above the slab.
  const foot=[[left-.15,bottom],[right,bottom],[right,429.5],[left-.15,429.5]];
  plane(foot,'concrete',(right-left)/5.5,1,false,{axis:[left,bottom,right,bottom],stops:[[0,'#3f413b35'],[1,'#e1dfcf18']]},3);
  line([[left,bottom],[right,bottom]],'#d5cebc',.45);
  line([[right,bottom],[right,429.5]],'#ebe6d7',.5);
 }
 function roofSection(filled){
  const q=[[43,55],[298,55],[298,62.5],[43,62.5]],map=projection(q),ribs=[0,.19,.38,.57,.76,.955];
  for(let i=0;i<ribs.length-1;i++)recessedBay(section(map,ribs[i]+.035,0,ribs[i+1],1),'roof',filled);
  ribs.forEach((u,index)=>{
   const rib=section(map,u,0,index===ribs.length-1?1:Math.min(1,u+.035),1);plane(rib,'timber',1,1,false,null,2);
   line([rib[1],rib[2]],'#72502d80',.6);line([rib[0],rib[3]],'#f4dfb580',.45);
  });
  line([[43,63],[298,63]],'#e7e2d5',1);line([[43,63.5],[298,63.5]],'#39342b50',.55);
 }
 function houseSection(material,filled){
  // The apartment-side cut follows the existing wall edge, outside the room.
  const finish=({pvc:{thickness:.85,colors:['#f3f4ed','#b8beb5']},laminate:{thickness:.7,colors:['#d9c29a','#9f8865']},lining:{thickness:1.1,colors:['#e3c590','#a98754']},parquet:{thickness:1.15,colors:['#ad8b65','#6f5139']}})[material];
  const inner=finish?finish.thickness:0,core=inner+sectionInsulationDepth,depth=core+2;
  const end=surfaces.floor[2],nearTop=surfaces.house[1],top=63,bottom=end[1];
  const start=[nearTop[0]+(end[0]-nearTop[0])*(top-nearTop[1])/(bottom-nearTop[1]),top];
  const q=[start,[start[0]+depth,top],[end[0]+depth,bottom],end],map=projection(q);
  // Clear the old bevel within the largest supported finish before drawing this cut.
  const maxDepth=sectionInsulationDepth+2+1.15+.7;
  ctx.save();polygon([[nearTop[0],55],[nearTop[0]+maxDepth,55],[start[0]+maxDepth,top],[end[0]+maxDepth,429.5],[end[0],429.5],end,start]);ctx.clip();ctx.clearRect(290,55,25,374.5);ctx.restore();
  // The mineral cap closes the wall-to-slab junction.
  plane([[nearTop[0],55],[nearTop[0]+depth,55],q[1],q[0]],'concrete',1,1,false,{axis:[nearTop[0],55,nearTop[0]+depth,55],stops:[[0,'#403e3420'],[1,'#e4e0d020']]},3);

  const slice=(y0,y1,x0=inner,x1=core)=>section(map,x0/depth,(y0-top)/(bottom-top),x1/depth,(y1-top)/(bottom-top));
  // The mineral wall is continuous behind the separate lining and frame.
  plane(slice(top,bottom,core,depth),'concrete',1,3,false,{axis:[start[0]+core,top,start[0]+depth,top],stops:[[0,'#403e3445'],[1,'#e4e0d020']]},5);
  const ribs=sideTimberRuns(top,bottom);
  let cursor=top;
  for(const [y0,y1] of ribs){
   if(y0>cursor)recessedBay(slice(cursor,y0),'side',filled);
   if(y1>y0){
    const batten=slice(y0,y1);plane(batten,'timber',1,1,false,null,3);
    line([batten[0],batten[1]],'#f3dfbca6',.35);line([batten[3],batten[2]],'#674c2e80',.45);
   }
   cursor=Math.max(cursor,y1);
  }
  if(cursor<bottom)recessedBay(slice(cursor,bottom),'side',filled);
  if(finish){
   const edge=ctx.createLinearGradient(start[0],top,start[0]+inner,top);edge.addColorStop(0,finish.colors[0]);edge.addColorStop(1,finish.colors[1]);fill(slice(top,bottom,0,inner),edge);
   line([start,end],'#f5e9d0a6',.35);
   line([map(inner/depth,0),map(inner/depth,1)],'#605a4a80',.35);
  }
  // The finish stops at the clean floor; the mineral foot meets the slab.
  const foot=[[end[0],bottom],[end[0]+depth,bottom],[end[0]+depth,429.5],[end[0],429.5]];
  plane(foot,'concrete',1,1,false,{axis:[end[0],bottom,end[0]+depth,bottom],stops:[[0,'#38392f35'],[1,'#dbdbcb1a']]},3);
  line([map(core/depth,0),map(core/depth,1)],'#625e4c70',.4);
  line([q[1],q[2],[end[0]+depth,429.5]],'#e9e5d7',.45);
 }


 function daylight(floor,glazed){
  const p=projection(floor);
  ctx.save();polygon(floor);ctx.clip();
  const sky=ctx.createLinearGradient(...p(0,.5),...p(1,.5));sky.addColorStop(0,'#e8eff614');sky.addColorStop(1,'#e8eff600');fill(floor,sky);
  // Project the glass openings along one sun direction. The opaque parapet
  // keeps the street side in shade; mullions only interrupt the sunlit area.
  const width=Math.max(.4,Number(selection.width)/100),length=Math.max(1,Number(selection.length)/100);
  const ray=(depth,height)=>p(height*.24/width,depth+height*.12/length);
  const halfFrame=selection.glazing==='cold'?.011:.018;
  const openings=glazed?[[.02,1/3-halfFrame],[1/3+halfFrame,2/3-halfFrame],[2/3+halfFrame,.98]]:[[0,1]];
  const sun=ctx.createLinearGradient(...ray(.5,1.1),...ray(.5,2.5));sun.addColorStop(0,'#fff4e546');sun.addColorStop(1,'#fff4e533');
  // Blur the light itself, not a shadow around an otherwise hard polygon.
  ctx.save();ctx.filter='blur(3.5px)';
  for(const [back,front] of openings)fill([ray(back,1.1),ray(back,2.5),ray(front,2.5),ray(front,1.1)],sun);
  ctx.restore();
  // Ambient contact shadows stay tight at the junction and fade into the room.
  function contact(u0,v0,u1,v1,from,to,alpha){
   const g=ctx.createLinearGradient(...p(...from),...p(...to));g.addColorStop(0,`rgba(38,43,40,${alpha})`);g.addColorStop(.35,`rgba(38,43,40,${alpha*.35})`);g.addColorStop(1,'rgba(38,43,40,0)');fill(section(p,u0,v0,u1,v1),g);
  }
  contact(0,0,1,.09,[.5,0],[.5,.09],.22);
  contact(.93,0,1,1,[1,.5],[.93,.5],.15);
  contact(0,0,.07,1,[0,.5],[.07,.5],.12);
  ctx.restore();
  ctx.save();polygon(surfaces.house);ctx.clip();
  const bounce=ctx.createLinearGradient(220,230,298,330);bounce.addColorStop(0,'#eef1e700');bounce.addColorStop(1,'#eef1e712');fill(surfaces.house,bounce);
  ctx.restore();
  // A soft underside shadow follows the sill, rather than crossing the floor.
  const parapet=projection(surfaces.parapet);
  ctx.save();polygon(surfaces.parapet);ctx.clip();
  const sill=ctx.createLinearGradient(...parapet(.5,0),...parapet(.5,.12));sill.addColorStop(0,'#302d2840');sill.addColorStop(.3,'#302d281c');sill.addColorStop(1,'#302d2800');fill(section(parapet,0,0,1,.12),sill);ctx.restore();
 }
 function switchPlate(){
  // The mounting footprint stays on the apartment wall. The plastic face
  // stands slightly proud of it, with all corners following the wall plane.
  const q=[[241.2,278.5],[247.8,282.5],[247.8,293],[241.2,289]],wall=projection(q);
  const offset=[-.42,.16],face=(u,v)=>{const p=wall(u,v);return[p[0]+offset[0],p[1]+offset[1]];};
  function rounded(map,u0,v0,u1,v1,ru,rv){
   const points=[];
   for(const [u,v,start] of [[u1-ru,v0+rv,-Math.PI/2],[u1-ru,v1-rv,0],[u0+ru,v1-rv,Math.PI/2],[u0+ru,v0+rv,Math.PI]]){
    for(let i=0;i<=6;i++){const a=start+i*Math.PI/12;points.push(map(u+Math.cos(a)*ru,v+Math.sin(a)*rv));}
   }
   return points;
  }
  const gradient=(map,stops)=>{const g=ctx.createLinearGradient(...map(0,0),...map(1,1));stops.forEach(([at,color])=>g.addColorStop(at,color));return g;};
  ctx.save();polygon(surfaces.house);ctx.clip();
  // Soft wall contact, rather than a hard dark outline around the frame.
  ctx.save();ctx.shadowColor='#302d2648';ctx.shadowBlur=2.7;ctx.shadowOffsetX=-1.7;ctx.shadowOffsetY=2;
  fill(rounded(wall,.015,.01,.99,.995,.085,.055),'#b4b7ae');ctx.restore();
  fill([wall(.06,.96),wall(.94,.96),face(.94,.96),face(.06,.96)],'#9da39a');
  fill([wall(.96,.08),wall(.96,.92),face(.96,.92),face(.96,.08)],'#bcc1b7');
  fill(rounded(face,0,0,1,1,.09,.057),gradient(face,[[0,'#fdfdfa'],[.36,'#f0f1ec'],[.78,'#e1e4dc'],[1,'#cdd2c8']]));
  // A shallow moulded rim curves into the switch recess.
  line([face(.09,.015),face(.89,.015)],'#ffffffb3',.2);
  line([face(.99,.12),face(.99,.9)],'#a4ada077',.18);
  fill(rounded(face,.145,.135,.855,.875,.05,.032),gradient(face,[[0,'#b5bcb0'],[.4,'#d8dcd2'],[1,'#989f93']]));
  fill(rounded(face,.17,.158,.83,.856,.043,.028),'#c8cec2');
  // One rocker: its upper lip rises slightly while the lower edge sits in
  // a narrow recess. The bevel and curved highlight supply the depth.
  const key=projection([face(.185,.175),face(.815,.175),face(.815,.831),face(.185,.831)].map(([x,y],i)=>[x+(i<2?-.18:0),y+(i<2?-.07:.04)]));
  fill(rounded(key,0,0,1,1,.06,.045),gradient(key,[[0,'#fdfdf8'],[.22,'#f5f6ef'],[.67,'#e9ece2'],[1,'#d6dcd0']]));
  const sheen=ctx.createRadialGradient(...key(.38,.24),0,...key(.4,.28),4.8);
  sheen.addColorStop(0,'#ffffff38');sheen.addColorStop(.65,'#ffffff08');sheen.addColorStop(1,'#ffffff00');
  fill(rounded(key,.035,.025,.965,.975,.055,.04),sheen);
  line([key(.09,.045),key(.87,.045)],'#ffffffa6',.18);
  line([key(.09,.98),key(.87,.98)],'#86917e80',.17);
  ctx.restore();
 }
 function streetView(q){
  // The landscape belongs behind the glass, not on its perspective plane.
  const photo=texture('outside'),height=q[3][1]-q[0][1],size=height*1.05,center=(q[0][0]+q[1][0])/2;
  ctx.save();polygon(q);ctx.clip();ctx.filter='saturate(.86) contrast(.95)';
  ctx.drawImage(photo,center-size*.32,q[0][1],size,size);ctx.restore();
 }
 function canopyThroughGlass(q,apertures=null){
  if(canopySurface.length!==4)return;
  const glass=projection(q),roof=projection(canopySurface);
  ctx.save();polygon(q);ctx.clip();
  if(apertures){
   ctx.beginPath();for(const aperture of apertures){aperture.forEach(([u,v],i)=>{const [x,y]=glass(u,v);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}ctx.clip();
  }
  polygon(canopySurface);ctx.clip();
  const shade=ctx.createLinearGradient(...roof(0,.25),...roof(1,.7));
  shade.addColorStop(0,'#8f9da5');shade.addColorStop(.4,'#b5c1c7');shade.addColorStop(1,'#cbd3d6');
  ctx.globalAlpha=selection.glazing==='warm'?.93:.97;fill(canopySurface,shade);
  for(let i=1;i<8;i++)line([roof(0,i/8),roof(1,i/8)],'#71828f45',.28);
  line([canopySurface[1],canopySurface[2]],'#657883',.6);
  line([roof(.03,0),roof(.03,1)],'#e4edf24d',.35);
  // A faint cool veil keeps this exterior metal behind the glass surface.
  fill(canopySurface,'#d9eef10d');ctx.restore();
 }

 function coldWindow(q,railDepth=.025){
  const p=projection(q),stiles=[0,.34,.67,1];
  ctx.save();polygon(q);ctx.clip();
  // Each sliding pane has its own faint reflection and edge seal.
  for(let i=0;i<stiles.length-1;i++){
   const u0=stiles[i],u1=stiles[i+1],pane=section(p,u0,.018,u1,.976);
   ctx.save();polygon(pane);ctx.clip();
   const glass=ctx.createLinearGradient(pane[0][0],pane[0][1],pane[2][0],pane[2][1]);
   glass.addColorStop(0,'#eef5f30c');glass.addColorStop(.5,'#d8e4e00a');glass.addColorStop(1,'#f7faf615');fill(pane,glass);
   fill([[u0+.04,.13],[u0+.065,.13],[u1-.05,.86],[u1-.075,.86]].map(uv=>p(...uv)),'#fffefa0b');
   ctx.restore();
  }
  function aluminium(face,axis=1){
   const g=ctx.createLinearGradient(face[0][0],face[0][1],face[axis][0],face[axis][1]);
   g.addColorStop(0,'#f7f8f3');g.addColorStop(.27,'#d6dcd5');g.addColorStop(.58,'#a6b0a9');g.addColorStop(1,'#eef1ea');fill(face,g);
  }
  // The surrounding rails and overlapping stiles have separate metal faces.
  aluminium(section(p,0,0,1,railDepth),3);aluminium(section(p,0,1-railDepth,1,1),3);
  line([p(0,railDepth+.002),p(1,railDepth+.002)],'#55615b80',.55);line([p(0,.006),p(1,.006)],'#fafcf6',.65);
  for(const u of stiles){
   const halfWidth=u>0&&u<1?.019:.014,u0=Math.max(0,u-halfWidth),u1=Math.min(1,u+halfWidth);
   aluminium(section(p,u0,.018,u1,.977));
   fill(section(p,u0,.018,Math.min(u1,u0+.0045),.977),'#77857c');
   fill(section(p,Math.max(u0,u1-.0045),.018,u1,.977),'#fbfcf7');
   if(u>0&&u<1){
    fill(section(p,u-.006,.028,u+.001,.968),'#4b5b528c');
    line([p(u+.006,.028),p(u+.006,.968)],'#fbfcf6',.4);
    // Recessed sliding latches, without the PVC lever used on warm windows.
    aluminium(section(p,u-.015,.596,u+.015,.674));
    fill(section(p,u-.010,.605,u+.009,.665),'#40534a');
    fill(section(p,u-.002,.61,u+.009,.656),'#84958a');
    line([p(u-.014,.598),p(u+.015,.598),p(u+.015,.671)],'#f7faf1',.45);
   }
  }
  // Two parallel channels sit in the lower sliding rail.
  for(const v of [.976,.990]){
   line([p(.008,v),p(.992,v)],'#627168',.55);
   line([p(.008,v-.003),p(.992,v-.003)],'#f5f8ef',.45);
  }
  ctx.restore();
 }

 function glazingGeometry(warm){
  const outer=warm?30.9:33.8,inner=43.1,top=warm?65:68.5,bottom=300.5;
  const p=projection([[outer,top],[inner,top+3],[inner,bottom],[outer,bottom]]),railBottom=warm?.947:.944;
  // Reflect the lower extrusion without changing its depth, chambers or width.
  const lowerCut=section(p,0,railBottom,1,1),lowerMap=projection(lowerCut);
  const profilePoint=(upper,u,w)=>{
   const point=lowerMap(u,1-w);
   return upper?[point[0],canopyJoint[1]+bottom-point[1]]:point;
  };
  return {outer,inner,bottom,lowerCut,profilePoint,depth:bottom-lowerMap(1,0)[1]};
 }
 function warmWindowHead(geometry){
  // Reproject the existing photograph so its top rail joins the cut glass seat.
  // The lower edge and the original view, stiles and handle remain in this plane.
  const near=geometry.profilePoint(true,1,.90),source=projection([[43,78],[108,142],[108,256.5],[43,291.5]]);
  const q=[[43,near[1]],[108,142],[108,256.5],[43,291.5]],target=projection(q),n=16;
  ctx.save();polygon(q);ctx.clip();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const uv=[[x/n,y/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n],[x/n,(y+1)/n]];
   for(const ids of [[0,1,2],[0,2,3]])triangle(base,ids.map(i=>{const point=source(...uv[i]);return [point[0]*base.width/340,point[1]*base.height/480];}),ids.map(i=>target(...uv[i])));
  }
  ctx.restore();
  // These apertures follow the original photograph through the same reprojection,
  // so the opaque PVC stiles and top rail stay in front of the exterior canopy.
  canopyThroughGlass(q,[[[0.031615,0.04414],[0.205314,0.055585],[0.205314,0.414488],[0.031615,0.444075]],[[0.394238,0.076801],[0.540744,0.0872],[0.540744,0.357352],[0.394238,0.382307]],[[0.724829,0.107543],[0.805549,0.117699],[0.805549,0.312246],[0.724829,0.325996]]]);
  ctx.save();polygon([[43,63],[108.5,140],[108.5,267],[43,304]]);ctx.clip();
  const rail=[[43,canopyJoint[1]],[108,140],[108,142],[43,near[1]]],shade=ctx.createLinearGradient(43,canopyJoint[1],43,near[1]);
  shade.addColorStop(0,'#f5f6f0');shade.addColorStop(.48,'#e3e6e0');shade.addColorStop(.83,'#ffffff');shade.addColorStop(1,'#bbc1bc');fill(rail,shade);
  line([rail[3],rail[2]],'#657276',.42);line([[43,near[1]-.65],[108,141.6]],'#f8fbf4',.5);ctx.restore();
 }

 function glazingSection(enabled,warm){
  // The cut faces recede into the balcony, along the same axis as the sill.
  // Remove the original head too, so no second cut survives above the new one.
  const cut=[[30,54.5],[43.4,54.5],[43.4,300.3],[30,303.2]];
  ctx.save();polygon(cut);ctx.clip();ctx.clearRect(29.5,54.3,14.4,249);ctx.restore();
  if(!enabled)return;
  const {outer,inner,lowerCut,profilePoint}=glazingGeometry(warm);
  const glassSeat=warm?.90:.54;
  const glassFace=(u0,u1)=>[profilePoint(true,u0,glassSeat),profilePoint(true,u1,glassSeat),profilePoint(false,u1,glassSeat),profilePoint(false,u0,glassSeat)];
  fill(glassFace(0,1),'#b4c6d009');
  const panes=warm?[.20,.46,.72]:[.47],glassThickness=warm?.035:.045;
  for(const u of panes){
   const pane=glassFace(u,u+glassThickness),edge=pane.map(([x,y],i)=>[x+.18,y+(i<2?.24:-.16)]);
   fill([pane[1],edge[1],edge[2],pane[2]],'#7e9aa6a6');
   const glass=ctx.createLinearGradient(outer,78,inner,291);
   glass.addColorStop(0,'#f5fcff');glass.addColorStop(.26,'#91adb9');glass.addColorStop(.51,'#edf6fa');glass.addColorStop(.8,'#a4bbc6');glass.addColorStop(1,'#f9fcfe');fill(pane,glass);
   line([pane[0],pane[3]],'#617b88a6',.22);line([pane[1],pane[2]],'#ffffffd9',.22);
  }
  line([profilePoint(true,.02,.96),profilePoint(false,.02,.96)],warm?'#9caab2':'#627782',.5);
  line([profilePoint(true,.97,.96),profilePoint(false,.97,.96)],'#ffffff',.7);
  function profile(upper){
   const m=(u,w)=>profilePoint(upper,u,w),q=upper?[m(0,0),m(1,0),m(1,1),m(0,1)]:lowerCut;
   const rect=(u0,w0,u1,w1)=>[[u0,w0],[u1,w0],[u1,w1],[u0,w1]].map(uv=>m(...uv));
   const depth=warm?1.8:1.2,recede=[depth,upper?depth*.62:-depth*.62];
   function shell(shape){
    const outline=shape.map(uv=>m(...uv)),far=outline.map(([x,y])=>[x+recede[0],y+recede[1]]);
    // A short return joins the cut face to the rail; it is not a separate box.
    fill(far,warm?'#b1b5b7':'#8e9a9f');
    for(let i=0;i<outline.length;i++){
     const j=(i+1)%outline.length,a=outline[i],b=outline[j],side=[a,b,far[j],far[i]];
     const shade=ctx.createLinearGradient(a[0],a[1],far[i][0],far[i][1]);
     shade.addColorStop(0,warm?'#f5f5f3':'#e0e5e7');shade.addColorStop(.42,warm?'#d4d7d6':'#b8c2c7');shade.addColorStop(1,warm?'#939a9b':'#6d7b82');fill(side,shade);
    }
    const face=ctx.createLinearGradient(outer,q[0][1],inner,q[2][1]);
    face.addColorStop(0,warm?'#e2e5e3':'#b9c4c9');face.addColorStop(.30,'#ffffff');face.addColorStop(.73,warm?'#f7f8f5':'#e8edef');face.addColorStop(1,warm?'#d5d9d7':'#a6b4bb');fill(outline,face);
    line([...outline,outline[0]],warm?'#858d8f':'#657881',.23);
    line([outline[0],outline[1]],'#ffffff',.32);
   }
   function chamber(u0,w0,u1,w1,open=false){
    const opening=rect(u0,w0,u1,w1),width=Math.hypot(opening[1][0]-opening[0][0],opening[1][1]-opening[0][1]),height=Math.hypot(opening[3][0]-opening[0][0],opening[3][1]-opening[0][1]);
    const shift=[Math.min(recede[0]*.6,width*.32),Math.sign(recede[1])*Math.min(Math.abs(recede[1]*.6),height*.32)],back=opening.map(([x,y])=>[x+shift[0],y+shift[1]]);
    // The cavity has a dark back and sloping inner walls, rather than an inset box.
    ctx.save();polygon(opening);ctx.clip();
    const cavity=ctx.createLinearGradient(opening[0][0],opening[0][1],opening[2][0],opening[2][1]);
    cavity.addColorStop(0,'#292f32');cavity.addColorStop(.55,'#495155');cavity.addColorStop(1,'#7f898c');fill(opening,cavity);
    const interior=ctx.createLinearGradient(back[0][0],back[0][1],back[2][0],back[2][1]);
    interior.addColorStop(0,'#303639');interior.addColorStop(.7,'#505b5f');interior.addColorStop(1,'#778285');fill(back,interior);
    for(let i=0;i<4;i++){
     const j=(i+1)%4,a=opening[i],b=opening[j],side=[a,b,back[j],back[i]],wall=ctx.createLinearGradient(a[0],a[1],back[i][0],back[i][1]);
     wall.addColorStop(0,i===0?'#969fa1':i===3?'#c0c6c5':'#e1e5e2');wall.addColorStop(.25,i===0?'#626d72':'#a3adae');wall.addColorStop(1,i===0?'#2b363c':'#546066');fill(side,wall);
    }
    ctx.restore();
    line([opening[3],opening[0],opening[1]],'#ffffffed',.23);
    line([opening[1],opening[2],opening[3]],'#657176',.22);
    if(open)line([opening[3],opening[2]],'#303a40',.28);
   }
   function openTrack(u0,w0,u1,w1){
    const opening=rect(u0,w0,u1,w1),back=opening.map(([x,y])=>[x+recede[0]*.55,y+recede[1]*.55]);
    ctx.save();polygon(opening);ctx.clip();
    // The mouth stays open: only the base and two side walls bound each track.
    const cavity=ctx.createLinearGradient(...m((u0+u1)/2,w0),...m((u0+u1)/2,w1));
    cavity.addColorStop(0,'#263238');cavity.addColorStop(.52,'#526168');cavity.addColorStop(1,'#bbc9cd');fill(opening,cavity);
    fill(back,cavity);
    for(const i of [0,1,3]){
     const j=(i+1)%4,wall=[opening[i],opening[j],back[j],back[i]],shade=ctx.createLinearGradient(...opening[i],...back[i]);
     shade.addColorStop(0,i===3?'#eef2ee':'#a2afb2');shade.addColorStop(1,'#49575f');fill(wall,shade);
    }
    ctx.restore();
    line([opening[3],opening[0],opening[1]],'#f5f8f6',.24);
    line([opening[1],opening[2]],'#65777e',.22);
   }
   if(warm){
    // The fixed frame and sash are two profiles with their own thin webs.
    shell([[0,0],[1,0],[1,.52],[.87,.52],[.87,.51],[.12,.51],[.12,.55],[0,.55]]);
    chamber(.065,.09,.255,.35);chamber(.325,.09,.765,.35);chamber(.825,.09,.95,.35);
    chamber(.18,.385,.43,.475);chamber(.53,.385,.82,.475);
    const steel=[[.395,.295],[.395,.16],[.69,.16],[.69,.295]].map(uv=>m(...uv));
    line(steel,'#657178',.66);line(steel,'#d9dedf',.25);
    fill(rect(.12,.51,.88,.555),'#363d41');
    shell([[.09,.54],[.91,.54],[.91,1],[.81,1],[.81,.86],[.20,.86],[.20,1],[.09,1]]);
    chamber(.15,.605,.425,.78);chamber(.51,.605,.85,.78);
    // A rebate, dark seals and two spacer bars locate three separate glass leaves.
    chamber(.20,.86,.81,1,true);
    fill(rect(.195,.855,.815,.895),'#676f73');
    for(const u of panes){fill(rect(u,.90,u+glassThickness,1.025),'#e6f0f4');line([m(u,.90),m(u,1.025)],'#788f99',.22);line([m(u+glassThickness,.90),m(u+glassThickness,1.025)],'#ffffff',.2);}
    fill(rect(.145,.85,.19,.998),'#293237');fill(rect(.78,.85,.823,.998),'#293237');
    for(const [u0,u1]of [[.235,.46],[.495,.72]]){
     const spacer=ctx.createLinearGradient(...m(u0,.90),...m(u1,.94));spacer.addColorStop(0,'#bcc6ca');spacer.addColorStop(.5,'#78888f');spacer.addColorStop(1,'#cbd3d6');fill(rect(u0,.90,u1,.94),spacer);
     line([m(u0,.945),m(u1,.945)],'#3b474e',.27);
    }
   }else{
    // Aluminium has thin continuous webs; the upper guides are deeper than
    // the lower tracks, and the single glass leaf has its own sliding sash.
    if(upper){
     shell([[0,0],[1,0],[1,1],[.90,1],[.90,.08],[.35,.08],[.35,1],[.29,1],[.29,.08],[.08,.08],[.08,1],[0,1]]);
     openTrack(.08,.08,.29,1);openTrack(.35,.08,.90,1);
     shell([[.40,.42],[.60,.42],[.60,1],[.555,1],[.555,.50],[.45,.50],[.45,1],[.40,1]]);
     openTrack(.45,.50,.555,1);
    }else{
     shell([[0,0],[1,0],[1,.46],[.92,.46],[.92,.10],[.08,.10],[.08,.46],[0,.46]]);
     openTrack(.08,.10,.92,.46);
     for(const [u0,u1]of [[.17,.23],[.465,.52]]){
      shell([[u0,.10],[u1,.10],[u1,.24],[u0,.24]]);
      line([m(u0,.24),m(u1,.24)],'#f3f7f5',.28);
     }
     // The small bearing sits on the inner rail, directly beneath the sash.
     fill(rect(.445,.24,.54,.36),'#42525b');line([m(.445,.36),m(.54,.36)],'#d9e1e2',.22);
     shell([[.31,.36],[.65,.36],[.65,1],[.57,1],[.57,.46],[.40,.46],[.40,1],[.31,1]]);
     openTrack(.40,.46,.57,1);
    }
    fill(rect(.47,.54,.47+glassThickness,1.025),'#e2eef3');
    line([m(.47,.54),m(.47,1.025)],'#708b97',.21);line([m(.47+glassThickness,.54),m(.47+glassThickness,1.025)],'#ffffff',.22);
    fill(rect(.445,.54,.47,1),'#46545b');fill(rect(.515,.54,.54,1),'#46545b');
   }
  }
  if(warm){
   profile(false);
   for(const u of panes)line([profilePoint(false,u-.012,.925),profilePoint(false,u+.058,.925)],'#293e4d',.48);
  }
  // Draw the head after the roof cut, keeping their shared contact edge visible.
  return ()=>{
   // The cold rail bears on the board: its open cut must remain above that top.
   if(!warm){
    profile(false);
    for(const u of panes)line([profilePoint(false,u-.012,.925),profilePoint(false,u+.058,.925)],'#293e4d',.48);
   }
   profile(true);
   for(const u of panes)line([profilePoint(true,u-.012,.925),profilePoint(true,u+.058,.925)],'#293e4d',.48);
  };
 }


 function parapetCore(){
  // The mineral core meets the skin beneath the selected window profile.
  const edge=streetSection(),clad=selection['exterior-enabled'];
  const left=clad?edge.inner-.1:28,right=edge.core,top=302,bottom=floorBase[3][1]+1.5,q=[[left,top],[right,top],[right,bottom],[left,bottom]];
  plane(q,'concrete',(right-left)/5.5,2,false,{axis:[left,top,right,top],stops:[[0,'#eeead730'],[.52,'#ebe7d91a'],[1,'#49483b45']]},5);
  line([[left,top],[left,bottom]],'#eeeade',.55);
  line([[right,top],[right,bottom]],'#665f4b',.65);
  const base=[[left,bottom-1.8],[right,bottom-1.8],[right,429.5],[left,429.5]];
  fill(base,'#89877b');line([[left,bottom-1.8],[right,bottom-1.8]],'#d4d0bb',.55);
 }
 function exteriorCladding(metal){
  // The thicker skin sits beneath the glass and overlaps the core by .1.
  // Its continuous edge covers the parapet and the lower slab.
  const {outer,inner}=streetSection(),top=303.3,bottom=465.8,q=[[outer,top],[inner,top],[inner,bottom],[outer,bottom]];
  // Remove the old exposed edge; the sill is drawn back over this clean cut.
  ctx.clearRect(0,300.5,outer,179.5);
  const shadow=ctx.createLinearGradient(inner,0,inner+.85,0);
  shadow.addColorStop(0,'#303d354d');shadow.addColorStop(1,'#303d3500');
  fill([[inner,top],[inner+.85,top],[inner+.85,bottom],[inner,bottom]],shadow);
  ctx.save();polygon(q);ctx.clip();
  const skin=ctx.createLinearGradient(outer,0,inner,0);
  if(metal){skin.addColorStop(0,'#66776d');skin.addColorStop(.3,'#c1cbc5');skin.addColorStop(.65,'#9daa9f');skin.addColorStop(1,'#6f8075');}
  else {skin.addColorStop(0,'#a4aea3');skin.addColorStop(.3,'#eff0e8');skin.addColorStop(.72,'#d9dfd4');skin.addColorStop(1,'#b6c1b0');}
  fill(q,skin);
  if(metal){
   for(const x of [outer+.8,outer+3.35]){
    line([[x,top],[x,bottom]],'#e3e9dfb3',.5);
    line([[x+.45,top],[x+.45,bottom]],'#4f655880',.45);
   }
  }
  else for(let y=top+8.5;y<bottom;y+=9){
   // Only the shallow lap at the edge is visible in this section.
   line([[outer,y+.3],[inner,y]],'#81927f',.45);
   line([[outer,y+.85],[inner,y+.55]],'#f8f9f0',.4);
  }
  ctx.restore();
  line([[outer,top],[inner,top]],metal?'#e7eee2':'#f7f8ef',.5);
  line([[outer,top],[outer,bottom]],metal?'#566c5d':'#9eac98',.35);
  line([[inner,top],[inner,bottom]],'#64725c80',.35);
  line([[outer,bottom],[inner,bottom]],metal?'#566c5d':'#81927f',.35);
 }
 function wideStreetSill(){
  // The board covers the full wall depth with the same small indoor overhang.
  const near=59.5+parapetDepth,far=119.8+parapetDepth*11.4/28.7;
  const top=[[30.8,300.5],[108.4,260.3],[far,260.3],[near,300.5]],inner=[top[3],top[2]],end=[top[0],top[3]],lowerInner=[[near,303.7],[far,262]],nose=[[near,304.8],[far,262.6]];
  // Neutral white PVC, with a straight broad top and a visible rolled front lip.
  ctx.save();polygon(surfaces.parapet);ctx.clip();ctx.shadowColor='#25313b66';ctx.shadowBlur=1.8;
  fill([[near,304.8],[far,262.6],[far,265.3],[near,308.2]],'#26313a4d');ctx.restore();
  const underside=ctx.createLinearGradient(near-1.7,303.7,near,304.8);underside.addColorStop(0,'#c2c6c4');underside.addColorStop(1,'#7d8688');
  fill([[near-1.7,303.7],[far-.7,262],nose[1],nose[0]],underside);
  const face=ctx.createLinearGradient(near,300.5,near,304.8);face.addColorStop(0,'#ffffff');face.addColorStop(.25,'#f9f9f9');face.addColorStop(.72,'#e7e9e6');face.addColorStop(1,'#aeb7b8');
  fill([inner[0],inner[1],nose[1],nose[0]],face);
  const cap=ctx.createLinearGradient(30.8,300.5,30.8,303.7);cap.addColorStop(0,'#ffffff');cap.addColorStop(.23,'#f9faf7');cap.addColorStop(.75,'#edf0eb');cap.addColorStop(1,'#bac2bf');
  fill([end[0],end[1],lowerInner[0],[30.8,303.7]],cap);
  // Three broad chambers run through the board, separated by thin PVC webs.
  const chamberStart=31.55,chamberStep=(near-2.4-chamberStart)/3;
  for(let i=0;i<3;i++){
   const left=chamberStart+i*chamberStep+(i?.35:0),right=chamberStart+(i+1)*chamberStep-.35;
   const q=[[left,301.15],[right,301.15],[right,303],[left,303]],back=q.map(([x,y])=>[x+.9,y-.45]);
   ctx.save();polygon(q);ctx.clip();
   const recess=ctx.createLinearGradient(left,301.15,right,303);recess.addColorStop(0,'#414a4c');recess.addColorStop(.55,'#6d787a');recess.addColorStop(1,'#929f9e');fill(q,recess);
   fill(back,'#536164');
   fill([q[0],q[1],back[1],back[0]],'#566267');fill([q[0],back[0],back[3],q[3]],'#a4b0b0');fill([q[2],q[3],back[3],back[2]],'#d2d9d6');
   ctx.restore();line([q[0],q[1],q[2]],'#6e7c7f',.19);line([q[2],q[3],q[0]],'#ffffff',.24);
  }
  fill([[near-1.7,300.5],[near,300.5],[near,304.2],[near-.4,304.8],[near-1.7,304.3]],'#f7f9f5');
  // The downturned nose has two separate chambers with a white web between.
  fill([[near-1.35,300.95],[near-.6,300.95],[near-.6,302.05],[near-1.35,302.05]],'#738285');
  fill([[near-1.35,302.5],[near-.6,302.5],[near-.6,303.6],[near-.85,304],[near-1.35,303.7]],'#738285');
  line([[near,300.5],[near,304.2],nose[0]],'#ffffff',.32);
  const board=ctx.createLinearGradient(31,300.5,near,300.5);board.addColorStop(0,'#e8e8e8');board.addColorStop(.2,'#fbfbfb');board.addColorStop(.75,'#ffffff');board.addColorStop(1,'#f1f1f1');fill(top,board);
  line(inner,'#ffffff',.85);line(nose,'#7f91a0',.5);
  line([top[0],top[1]],'#a1afb9',.4);line(end,'#ffffff',.6);
  line([[30.8,303.7],lowerInner[0]],'#7b8b8c',.3);
 }

 function apartmentFloorPoint(q,x){
  const t=(x-q[1][0])/(q[2][0]-q[1][0]);return [x,q[1][1]+(q[2][1]-q[1][1])*t];
 }
 function apartmentDoorFoot(q){
  // Keep the upper door and handle intact; fit its lower frame to the finished floor.
  const source=projection([[250.7,275],[283.7,275],[282.3,409.5],[250.7,369.3]]);
  const face=[[250.7,275],[283.7,275],apartmentFloorPoint(q,283.7),apartmentFloorPoint(q,250.7)],target=projection(face),n=12;
  ctx.save();polygon(face);ctx.clip();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const uv=[[x/n,y/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n],[x/n,(y+1)/n]];
   for(const ids of [[0,1,2],[0,2,3]])triangle(base,ids.map(i=>{const point=source(...uv[i]);return [point[0]*base.width/340,point[1]*base.height/480];}),ids.map(i=>target(...uv[i])));
  }
  // The source already includes the lower PVC frame; do not add a strip below it.
  ctx.restore();
 }

 function baseboards(q,wallFinish=null){
  // Vertical boards stand on the finished floor; their faces belong to the walls.
  const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const colors=wallFinish==='parquet'?{top:'#967455',middle:'#7a573c',bottom:'#483321',lip:'#a57c55',cap:'#60432d',cut:'#382516aa',edge:'#c39b70',foot:'#38251799'}:['laminate','lining'].includes(wallFinish)?{top:'#d8bd93',middle:'#c6a579',bottom:'#9a7851',lip:'#e2c7a0',cap:'#b39269',cut:'#6f523680',edge:'#ead2ae',foot:'#6f523675'}:{top:'#f9faf5',middle:'#eaece4',bottom:'#b5b8ab',lip:'#fffef7',cap:'#c2c5bb',cut:'#858b8080',edge:'#ffffff',foot:'#7d807260'};
  function board(a,b,ha,hb,inside,cut=false){
   const at=[a[0],a[1]-ha],bt=[b[0],b[1]-hb];
   ctx.save();ctx.shadowColor='#322c244f';ctx.shadowBlur=.8;
   line([a,b],'#3e352c59',1.7);ctx.restore();
   const face=ctx.createLinearGradient(at[0],at[1],a[0],a[1]);
   face.addColorStop(0,colors.top);face.addColorStop(.35,colors.middle);face.addColorStop(1,colors.bottom);
   fill([at,bt,b,a],face);
   const ledge=[at.map((v,i)=>v+(i===0?inside:0)),bt.map((v,i)=>v+(i===0?inside:0))];
   fill([ledge[0],ledge[1],bt,at],colors.lip);
   if(cut){
    fill([bt,ledge[1],[b[0]+inside,b[1]],b],colors.cap);
    line([ledge[1],[b[0]+inside,b[1]]],colors.cut,.3);
   }
   line([at,bt],colors.edge,.7);line([a,b],colors.foot,.45);
  }
  board(q[0],q[1],4.2,4.2,0);
  board(q[3],q[0],6.4,4.2,1.05);
  // Stop at the far door jamb; the opening and the foreground stay clear.
  const doorEdge=(250.7-q[1][0])/(q[2][0]-q[1][0]);
  const height=t=>4.2+(6.4-4.2)*t;
  board(q[1],lerp(q[1],q[2],doorEdge),height(0),height(doorEdge),-.8);
 }


 function surfaceLight(q,u,v,ru,rv,strength){
  const map=projection(q),center=map(u,v),left=map(u-ru,v),right=map(u+ru,v),top=map(u,v-rv),bottom=map(u,v+rv);
  // The pool follows each receiving surface and stops at its physical edges.
  ctx.save();polygon(q);ctx.clip();ctx.globalCompositeOperation='screen';
  ctx.transform((right[0]-left[0])/2,(right[1]-left[1])/2,(bottom[0]-top[0])/2,(bottom[1]-top[1])/2,...center);
  const light=ctx.createRadialGradient(0,0,0,0,0,1);
  light.addColorStop(0,`rgba(255,222,165,${strength})`);
  light.addColorStop(.28,`rgba(255,223,175,${strength*.75})`);
  light.addColorStop(.64,`rgba(255,229,195,${strength*.28})`);
  light.addColorStop(1,'rgba(255,237,211,0)');
  ctx.fillStyle=light;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 function roomLighting(floorQ,pendant){
  // Ceiling depth runs from the near edge to the rear wall; the floor is reversed.
  for(const depth of [.23,.66]){
   surfaceLight(floorQ,.5,1-depth,.43,.27,pendant?.29:.20);
   surfaceLight(surfaces.house,1-depth,.61,.25,.40,pendant?.105:.075);
   surfaceLight(surfaces.parapet,depth,.54,.25,.46,pendant?.13:.09);
   surfaceLight(surfaces.back,.5,.68,.60,.51,(depth>.5?1:.35)*(pendant?.13:.095));
  }
 }


 function pendantFixture(ceilingMap,v){
  const [x,y]=ceilingMap(.5,v),width=ceilingMap(1,v)[0]-ceilingMap(0,v)[0],scale=width/255;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0;
  ctx.shadowOffsetX=ctx.shadowOffsetY=0;

  // The small canopy has a ceiling contact shadow, a side and a top face.
  ctx.fillStyle='#20282426';ctx.beginPath();ctx.ellipse(0,.15,4.4,1.4,0,0,Math.PI*2);ctx.fill();
  const mount=ctx.createLinearGradient(-3.6,0,3.6,0);
  mount.addColorStop(0,'#353b39');mount.addColorStop(.35,'#737976');mount.addColorStop(1,'#303634');
  ctx.fillStyle=mount;ctx.beginPath();ctx.moveTo(-3.6,0);ctx.lineTo(-3.6,1.8);
  ctx.bezierCurveTo(-1.7,3,1.7,3,3.6,1.8);ctx.lineTo(3.6,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='#68736b';ctx.beginPath();ctx.ellipse(0,0,3.6,1.1,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#29332c';ctx.lineWidth=.35;ctx.stroke();

  // Uniform perspective scaling keeps the cord vertical under gravity.
  line([[0,2],[0,22.3]],'#303634',.55);
  const neck=ctx.createLinearGradient(-1.55,0,1.55,0);
  neck.addColorStop(0,'#303634');neck.addColorStop(.35,'#68716c');neck.addColorStop(1,'#2a302d');
  fill([[-1.55,22.1],[1.55,22.1],[1.55,24.8],[-1.55,24.8]],neck);
  ctx.fillStyle='#747b77';ctx.beginPath();ctx.ellipse(0,22.1,1.55,.45,0,0,Math.PI*2);ctx.fill();

  // Rounded metal walls give the compact bell shade depth without a large cone.
  ctx.save();ctx.translate(0,27);ctx.scale(1.3,1.1);ctx.translate(0,-27);
  const top=24,lip=top+10.8,metal=ctx.createLinearGradient(-9.6,0,9.6,0);
  metal.addColorStop(0,'#2a302e');metal.addColorStop(.24,'#535b57');
  metal.addColorStop(.58,'#3f4642');metal.addColorStop(1,'#242b27');
  ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(-3.4,top);
  ctx.bezierCurveTo(-5,top+.2,-5.9,top+3,-8.7,top+8);
  ctx.quadraticCurveTo(-9.8,top+9.7,-9.1,lip);
  ctx.bezierCurveTo(-5.7,lip+1.8,5.7,lip+1.8,9.1,lip);
  ctx.quadraticCurveTo(9.8,top+9.7,8.7,top+8);
  ctx.bezierCurveTo(5.9,top+3,5,top+.2,3.4,top);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#b8c2b62b';ctx.lineWidth=.55;ctx.beginPath();
  ctx.moveTo(-3.7,top+1.1);ctx.bezierCurveTo(-5.2,top+2.6,-6.4,top+5.7,-7.8,top+8.4);ctx.stroke();

  // The dark rim surrounds a warm ivory bowl; only the lower edge emits light.
  ctx.fillStyle='#202a22';ctx.beginPath();ctx.ellipse(0,lip,9.1,2.05,0,0,Math.PI*2);ctx.fill();
  const bowl=ctx.createRadialGradient(-1.8,lip-.3,.2,0,lip,7.7);
  bowl.addColorStop(0,'#fff4d3');bowl.addColorStop(.48,'#eee0bd');bowl.addColorStop(1,'#a48e67');
  ctx.fillStyle=bowl;ctx.beginPath();ctx.ellipse(0,lip+.05,7.7,1.45,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffe9b6b3';ctx.lineWidth=.55;ctx.beginPath();
  ctx.ellipse(0,lip+.05,7.7,1.45,0,0,Math.PI);ctx.stroke();
  ctx.restore();
  ctx.restore();
 }

 function render(){
  frame=0;if(!ready||!selection)return;const s=selection,insulated=s.insulation==='yes';
  ctx.setTransform(3,0,0,3,0,0);ctx.clearRect(0,0,340,480);ctx.translate(340,0);ctx.scale(-1,1);ctx.drawImage(base,0,0,340,480);
  const wall=s['walls-enabled']?s.walls:insulated?'insulated':'concrete',floor=s['floor-enabled']?s.floor:insulated?'insulated':'concrete',ceiling=s['ceiling-enabled']?s.ceiling:insulated?'insulated':'concrete';
  const floorQ=surfaces.floor;
  for(const [q,rx,ry,shade] of [
   [surfaces.back,1,1,{axis:[108,210,230,210],stops:[[0,'#28231540'],[.25,'#28231512'],[.8,'#28231525'],[1,'#28231555']]}],
   [surfaces.house,2.8,1,{axis:[220,190,298,190],stops:[[0,'#30291f48'],[.3,'#30291f08'],[1,'#ffffff12']]}],
   [surfaces.parapet,2.8,.48,{axis:[47,360,114,295],stops:[[0,'#30291f30'],[1,'#30291f60']]}]
  ]){
   if(!s['walls-enabled'])insulatedSurface(q,false,insulated);
   else {
    // Laminate and parquet use the same plank height across adjoining walls.
    const narrowRows=wall==='parquet'||wall==='laminate',repeats=wall==='laminate'?3:2.5;
    const rows=narrowRows?repeats*(q===surfaces.parapet?50/177:1):ry;
    const offset=narrowRows&&q===surfaces.parapet?127/177*repeats:0;
    plane(q,wall==='laminate'?'laminate-wall':wall,rx,rows,false,shade,16,offset);
   }
  }
  if(!s['ceiling-enabled'])insulatedSurface(surfaces.ceiling,false,insulated);else plane(surfaces.ceiling,ceiling,1,2.6,ceiling==='laminate',{axis:[170,63,170,140],stops:[[0,'#ffffff10'],[.65,'#342b1920'],[1,'#342b1955']]});
  if(!s['floor-enabled'])insulatedSurface(floorQ,true,insulated);else plane(floorQ,floor,floor==='tile'?Number(s.width)/40:2.4,floor==='tile'?Number(s.length)/40:1.2,['laminate','vinyl'].includes(floor),{axis:[170,322,170,428],stops:[[0,'#211d195a'],[.25,'#211d1920'],[.8,'#ffffff09'],[1,'#211d1915']]});
  if(s['floor-enabled']&&floor==='tile'){
   const map=projection(floorQ),tilesX=Number(s.width)/40,tilesY=Number(s.length)/40;
   ctx.save();polygon(floorQ);ctx.clip();
   for(let i=1;i<tilesX;i++)line([map(i/tilesX,0),map(i/tilesX,1)],'#737a726e',.3);
   for(let j=1;j<tilesY;j++){
    const a=map(0,j/tilesY),b=map(1,j/tilesY),depth=(a[1]-floorQ[0][1])/(floorQ[3][1]-floorQ[0][1]);
    line([a,b],'#737a726e',.15+.2*depth);
   }
   ctx.restore();
  }
  line([surfaces.back[0],surfaces.back[1],floorQ[1]],'#36302738',1.1);line([[43,63],[108.5,140]],'#ffffff55',.65);
  daylight(floorQ,!!s['glazing-enabled']);
  if(s['lighting-enabled'])roomLighting(floorQ,s.lighting==='pendant');
  if(s['glazing-enabled']&&s.glazing==='warm')warmWindowHead(glazingGeometry(true));
  else if(s['glazing-enabled']){
   const geometry=glazingGeometry(false),window=[[43,canopyJoint[1]],[108,140],[108,267],[43,geometry.bottom]];
   ctx.save();polygon([[43,63],[108.5,140],[108.5,267],[43,304]]);ctx.clip();
   streetView(window);canopyThroughGlass(window);coldWindow(window,geometry.depth/(geometry.bottom-canopyJoint[1]));ctx.restore();
  }else streetView([[43,78],[108,142],[108,256.5],[43,291.5]]);
  const drawWindowHead=glazingSection(!!s['glazing-enabled'],s.glazing==='warm');
  const floorContact=s['floor-enabled']||insulated?floorQ:floorBase;
  const restore=q=>{ctx.save();polygon(q);ctx.clip();ctx.drawImage(base,0,0,340,480);ctx.restore();};
  restore([[225.4,140.8],[283.7,80.6],apartmentFloorPoint(floorContact,283.7),apartmentFloorPoint(floorContact,250.7),[250.7,275.7],[246.3,277.3],[218.1,260.3],[218.1,255.2],[225.4,254.8]]);
  apartmentDoorFoot(floorContact);
  if(s['floor-enabled'])baseboards(floorQ,s['walls-enabled']?s.walls:null);
  // Apartment sill: a shaded underside, with the switch just below near the door.
  ctx.save();polygon(surfaces.house);ctx.clip();line([[218.7,261],[246.1,278]],'#3e393148',1.3);ctx.restore();switchPlate();
  parapetCore();sideSection(insulated);floorSection(floorQ,s['floor-enabled']?s.floor:null,insulated);roofSection(insulated);
  houseSection(s['walls-enabled']?s.walls:null,insulated);
  if(s['exterior-enabled'])exteriorCladding(s.exterior==='metal');
  wideStreetSill();
  drawWindowHead?.();
  if(s['lighting-enabled']){
   const ceilingMap=projection(surfaces.ceiling);
   const ceilingCircle=(v,ru,rv)=>Array.from({length:40},(_,i)=>{const a=i*Math.PI/20;return ceilingMap(.5+ru*Math.cos(a),v+rv*Math.sin(a));});
   // Fixtures follow the ceiling's projected centre line, including their
   // rings and mounting points. The pendant cord stays vertical under gravity.
   if(s.lighting==='spots'){
    ctx.save();polygon(surfaces.ceiling);ctx.clip();
    for(const v of [.23,.66]){
     const [x,y]=ceilingMap(.5,v),width=ceilingMap(1,v)[0]-ceilingMap(0,v)[0];
     glow(x,y,18*width/255,.17);
     fill(ceilingCircle(v,.033,.021),'#747469');
     fill(ceilingCircle(v-.001,.0255,.01575),'#fff7d4');
    }
    ctx.restore();
   }else for(const depth of [.66,.23])pendantFixture(ceilingMap,depth);
  }
  canvas.hidden=false;root.querySelector('[data-calc-fallback]').hidden=true;
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
 Promise.all([base,atlas,insulation].map(img=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))).then(()=>{ready=true;schedule();}).catch(()=>{canvas.hidden=true;root.querySelector('[data-calc-fallback]').hidden=false;});
 insulation.src=new URL('assets/calculator-realistic-v1/insulation-battens-v1.webp',siteBase).href;
 base.src=root.querySelector('[data-calc-fallback]').src;atlas.src=new URL('assets/calculator-realistic-v1/material-atlas-v2.webp',siteBase).href;
 return state=>{selection=state;schedule();};
}



 // All selected works contribute to the estimate; every input recalculates it from scratch.
 const finishCalculator=document.querySelector('[data-finishing-calculator]');
 if(finishCalculator){
  const controls=finishCalculator.querySelector('[data-calc-controls]'),dialog=finishCalculator.querySelector('dialog');
  const currency=n=>Math.round(n).toLocaleString('ru-RU')+' ₽',quantity=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
  // Keep calculation immediate; load the photograph and draw only near the section.
  let calculatorScene=null,calculatorSelection=null,calculatorObserver=null;
  const renderCalculatorScene=state=>{calculatorSelection=state;calculatorScene?.(state);};
  const startCalculatorScene=()=>{
   if(calculatorScene)return;
   calculatorObserver?.disconnect();calculatorObserver=null;
   finishCalculator.classList.add('calculator-scene-ready');
   calculatorScene=createCalculatorScene(finishCalculator);
   if(calculatorSelection)calculatorScene(calculatorSelection);
  };
  for(const event of ['pointerdown','focusin','input','change'])finishCalculator.addEventListener(event,startCalculatorScene,{once:true});
  let calculation='',calculationView=null;
  const read=()=>{const state=Object.fromEntries(new FormData(controls));state.insulation=state['insulation-enabled']?'yes':'no';return state;};
  const materialName=key=>controls.querySelector(`input[name="${key}"]:checked`)?.closest('label').querySelector('.finish-calc-swatch+span')?.textContent||'';
  function updateEstimate(){
   finishCalculator.querySelectorAll('[data-calc-group]').forEach(group=>{const toggle=group.querySelector('input[type="checkbox"]');if(toggle)group.querySelectorAll('input[type="radio"]').forEach(input=>input.disabled=!toggle.checked);});
   const state=read(),estimate=calculateFinishingEstimate(state);
   const valid=controls.checkValidity()&&estimate.valid;
   finishCalculator.querySelector('[data-calc-error]').textContent=valid?'':'Укажите размеры в пределах, указанных в полях.';
   finishCalculator.querySelector('[data-calc-request]').disabled=!valid;
   if(!valid){calculation='';calculationView=null;finishCalculator.querySelector('[data-calc-total]').textContent='—';finishCalculator.querySelector('[data-calc-from]').hidden=true;return;}
   const names={walls:'Стены',ceiling:'Потолок',floor:'Пол',exterior:'Наружная отделка',glazing:'Остекление',insulation:'Утепление',lighting:'Освещение'};
   const items=estimate.items.map(item=>[names[item.key]+(item.key==='lighting'?'':' · '+quantity(item.quantity)+' '+item.unit),item.amount]);
   const total=estimate.total;
   finishCalculator.querySelector('[data-calc-total]').textContent=currency(total);
   finishCalculator.querySelector('[data-calc-from]').hidden=!items.length;
   renderCalculatorScene(state);
   const attributes=['walls','ceiling','floor','exterior','glazing','lighting'].filter(key=>state[key+'-enabled']).map(key=>[names[key],materialName(key)]);
   const selected=attributes.map(([name,value])=>name+': '+value);
   calculationView={size:`${state.length} × ${state.width} см`,total:(items.length?'от ':'')+currency(total),attributes:[...attributes,['Утепление',state.insulation==='yes'?'да':'нет']],items};
   calculation=['Балкон / лоджия',`Размеры: ${state.length} × ${state.width} см`, 'Для предварительного расчёта приняты: высота 260 см, переднее остекление высотой 160 см',...selected,'Утепление: '+(state.insulation==='yes'?'да':'нет'),'Предварительно '+(items.length?'от ':'')+currency(total),...items.map(([label,amount])=>label+': от '+currency(amount)), 'Площадь стен без вычета квартирных проёмов; итог уточняется после замера.'].join('\n');
  }
  controls.addEventListener('input',updateEstimate);controls.addEventListener('change',updateEstimate);controls.addEventListener('submit',e=>e.preventDefault());
  function renderCalculationSummary(){
   if(!calculationView)return;
   const view=calculationView;
   dialog.querySelector('[data-calc-summary-size]').textContent=view.size;
   dialog.querySelector('[data-calc-summary-total]').textContent=view.total;
   const materials=dialog.querySelector('[data-calc-summary-materials]');
   materials.replaceChildren(...view.attributes.map(([name,value])=>{
    const row=document.createElement('div'),label=document.createElement('dt'),choice=document.createElement('dd');
    label.textContent=name;choice.textContent=value;row.append(label,choice);return row;
   }));
   const breakdown=dialog.querySelector('[data-calc-summary-breakdown]');
   breakdown.hidden=!view.items.length;
   breakdown.replaceChildren(...view.items.map(([name,amount])=>{
    const row=document.createElement('div'),label=document.createElement('span'),price=document.createElement('strong');
    row.className='finish-calc-breakdown-row';label.textContent=name;price.textContent='от '+currency(amount);row.append(label,price);return row;
   }));
   dialog.querySelector('[data-calc-details]').open=false;
  }
  finishCalculator.querySelector('[data-calc-request]').addEventListener('click',()=>{updateEstimate();if(!calculation)return;const form=dialog.querySelector('[data-calc-lead]');if(form.querySelector('[name="calculation"]'))form.querySelector('[name="calculation"]').value=calculation;renderCalculationSummary();openDialogAtCurrentScroll(dialog,form.querySelector('input[name="name"]')||form.querySelector('.thank-you'));track('calculator_lead_open');});
  dialog.querySelector('[data-calc-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  updateEstimate();
  if('IntersectionObserver' in window){
   calculatorObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))startCalculatorScene();},{rootMargin:'400px 0px'});
   calculatorObserver.observe(finishCalculator);
  }else startCalculatorScene();
 }

 const certificateSlider=$('[data-certificates]');
 if(certificateSlider){
  const certificateTrack=certificateSlider.querySelector('[data-cert-track]');
  const certificateSlides=[...certificateTrack.querySelectorAll('.certificate-card')];
  const certificateCurrent=certificateSlider.querySelector('[data-cert-current]');
  const certificatePrev=certificateSlider.querySelector('[data-cert-prev]');
  const certificateNext=certificateSlider.querySelector('[data-cert-next]');
  let certificateIndex=0,certificateFrame=0,certificateUnlock=0,certificateProgrammatic=false;
  const certificateLeft=index=>certificateSlides[index].offsetLeft-certificateTrack.offsetLeft;
  const updateCertificateControls=()=>{certificateCurrent.textContent=String(certificateIndex+1);certificatePrev.disabled=certificateIndex===0;certificateNext.disabled=certificateIndex===certificateSlides.length-1;};
  const showCertificate=index=>{certificateIndex=Math.max(0,Math.min(certificateSlides.length-1,index));certificateProgrammatic=true;clearTimeout(certificateUnlock);certificateTrack.scrollTo({left:certificateLeft(certificateIndex),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});updateCertificateControls();certificateUnlock=setTimeout(()=>{certificateProgrammatic=false;},900);};
  const syncCertificateIndex=()=>{certificateFrame=0;const left=certificateTrack.scrollLeft;certificateIndex=certificateSlides.reduce((best,slide,index)=>Math.abs(certificateLeft(index)-left)<Math.abs(certificateLeft(best)-left)?index:best,0);updateCertificateControls();};
  certificatePrev.addEventListener('click',()=>showCertificate(certificateIndex-1));
  certificateNext.addEventListener('click',()=>showCertificate(certificateIndex+1));
  certificateTrack.addEventListener('scroll',()=>{if(!certificateProgrammatic&&!certificateFrame)certificateFrame=requestAnimationFrame(syncCertificateIndex);},{passive:true});
  certificateTrack.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showCertificate(certificateIndex+(e.key==='ArrowRight'?1:-1));}});
  updateCertificateControls();
  const certificateModal=certificateSlider.querySelector('#certificate-modal');
  const certificateLinks=[...certificateSlider.querySelectorAll('[data-cert-open]')];
  const modalImage=certificateModal.querySelector('[data-cert-image]');
  modalImage.addEventListener('load',()=>{
   if(modalImage.naturalHeight)certificateModal.style.setProperty('--certificate-ratio',modalImage.naturalWidth/modalImage.naturalHeight);
  });
  const modalPrev=certificateModal.querySelector('[data-cert-modal-prev]');
  const modalNext=certificateModal.querySelector('[data-cert-modal-next]');
  const modalClose=certificateModal.querySelector('[data-cert-close]');
  let certificateModalIndex=0;
  const showCertificateModal=(index,open=false)=>{
   certificateModalIndex=Math.max(0,Math.min(certificateLinks.length-1,index));
   const link=certificateLinks[certificateModalIndex];
   modalImage.src=link.href;modalImage.alt=link.querySelector('img').alt;
   certificateModal.querySelector('#certificate-modal-title').textContent='Сертификат '+(certificateModalIndex+1)+' / '+certificateLinks.length;
   const activeControl=document.activeElement;modalPrev.disabled=certificateModalIndex===0;modalNext.disabled=certificateModalIndex===certificateLinks.length-1;if(activeControl===modalNext&&modalNext.disabled)modalPrev.focus({preventScroll:true});else if(activeControl===modalPrev&&modalPrev.disabled)modalNext.focus({preventScroll:true});
   showCertificate(certificateModalIndex);
   if(open)openDialogAtCurrentScroll(certificateModal,modalClose);
  };
  certificateLinks.forEach((link,index)=>link.addEventListener('click',event=>{event.preventDefault();showCertificateModal(index,true);}));
  modalPrev.addEventListener('click',()=>showCertificateModal(certificateModalIndex-1));
  modalNext.addEventListener('click',()=>showCertificateModal(certificateModalIndex+1));
  modalClose.addEventListener('click',()=>certificateModal.close());
  certificateModal.addEventListener('click',event=>{if(event.target===certificateModal)certificateModal.close();});
  certificateModal.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();showCertificateModal(certificateModalIndex+(event.key==='ArrowRight'?1:-1));});
 }
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){
  document.documentElement.classList.add('reveal-ready');
  const items=document.querySelectorAll('.reveal,.section-heading,.project-card,.steps li');
  items.forEach(el=>el.classList.add('reveal'));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  items.forEach(el=>observer.observe(el));
 }
})();
