import {calculateFinishingEstimate} from './calculator-estimate.mjs';
import {createCalculatorSceneLoader} from './calculator-scene-loader.mjs';
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

 let config={},configRequest=null,configLoaded=false;
 function loadConfig(){
  if(configLoaded)return Promise.resolve(config);
  if(configRequest)return configRequest;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  configRequest=fetch(new URL('site-config.json',siteBase),{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{
  if(!c||typeof c!=='object'||Array.isArray(c))throw Error();
  config=c;
  if(!c.leadEndpoint)document.querySelectorAll('[data-lead-form]').forEach(form=>{const note=form.querySelector('.form-error');if(note)note.textContent='Для расчёта позвоните нам: +7 (495) 165-39-05. Отправка заявок через сайт пока не подключена.';});
  if(c.whatsapp){try{const url=new URL(c.whatsapp);if(['wa.me','api.whatsapp.com','www.whatsapp.com'].includes(url.hostname)&&url.protocol==='https:')document.querySelectorAll('.final-links').forEach(container=>{const link=document.createElement('a');link.className='messenger';link.href=url.href;link.target='_blank';link.rel='noopener';link.dataset.event='whatsapp_click';link.textContent='Написать в WhatsApp ↗';container.append(link);});}catch{}}
  scheduleIdle(()=>{(c.externalScripts||[]).forEach(s=>{try{const url=new URL(typeof s==='string'?s:s.src);if(url.protocol!=='https:')return;const tag=document.createElement('script');tag.src=url.href;tag.async=true;if(s.id)tag.id=s.id;document.head.append(tag);}catch{}});});
  configLoaded=true;return config;
  }).catch(error=>{throw new Error(error.name==='AbortError'?'Не удалось загрузить настройки отправки: ответ задерживается. Попробуйте ещё раз или позвоните нам.':'Не удалось загрузить настройки отправки. Проверьте соединение и попробуйте ещё раз или позвоните нам.');}).finally(()=>{clearTimeout(timer);configRequest=null;});
  return configRequest;
 }
 // Eager loading stays optional; a later submission can retry a temporary failure.
 const configReady=loadConfig().catch(()=>null);
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
 document.addEventListener('keydown',e=>{
  if(toggle?.getAttribute('aria-expanded')!=='true')return;
  if(e.key==='Escape'){closeMenu();return;}
  if(e.key!=='Tab')return;
  const focusable=[...menu.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(el=>el.tabIndex>=0&&!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const first=focusable[0],last=focusable.at(-1);
  if(!first)return;
  if(!menu.contains(document.activeElement)||(e.shiftKey?document.activeElement===first:document.activeElement===last)){
   e.preventDefault();(e.shiftKey?last:first).focus({preventScroll:true});
  }
 });
 addEventListener('resize',()=>{if(toggle?.getAttribute('aria-expanded')==='true'&&!toggle.getClientRects().length)closeMenu(false);},{passive:true});
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
    await loadConfig();if(!config.leadEndpoint)throw new Error('Отправка заявок через сайт пока не подключена. Позвоните нам: +7 (495) 165-39-05.');const values=Object.fromEntries(new FormData(form));id=id||crypto.randomUUID();
    const {response,result}=await sendLead(config.leadEndpoint,{...values,consent:values.consent==='on',form:form.dataset.leadForm,attribution,page:location.pathname,requestId:id});
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
  const fitComparison=()=>{
   if(!comparisonModal.open||![beforeImage,afterImage].every(img=>img.complete&&img.naturalWidth))return;
   const grid=comparisonModal.querySelector('.comparison-modal-grid'),shell=comparisonModal.querySelector('.comparison-modal-shell');
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
  const showComparison=(index,trackOpen=false,syncUrl=true)=>{if(!comparisonCards.length)return;comparisonIndex=(index+comparisonCards.length)%comparisonCards.length;const card=comparisonCards[comparisonIndex],beforeReal=card.dataset.beforeReal==='true',beforeVisualized=card.dataset.beforeVisualized==='true',visualized=card.dataset.visualized==='true';beforeImage.style.removeProperty('aspect-ratio');afterImage.style.removeProperty('aspect-ratio');beforeImage.src=new URL(card.dataset.before,siteBase).href;afterImage.src=new URL(card.dataset.after,siteBase).href;comparisonTitle.textContent=card.dataset.title;beforeLabel.textContent='До';afterLabel.textContent='После';beforeImage.alt=`${card.dataset.title} — ${beforeVisualized||visualized?'до работ':beforeReal?'до работ ArtBalkon':'до ремонта'}`;afterImage.alt=`${card.dataset.title} — ${visualized?'после работ':'после работ ArtBalkon'}`;if(syncUrl){const url=new URL(location.href);url.searchParams.set('case',card.dataset.case);history[comparisonModal.open?'replaceState':'pushState'](history.state,'',url);}if(!comparisonModal.open)openDialogAtCurrentScroll(comparisonModal,comparisonModal.querySelector('.comparison-close'));if(trackOpen)track('before_after_open',{project:card.dataset.title});};
  document.addEventListener('click',e=>{const card=e.target.closest('[data-comparison]');if(!card)return;comparisonOpener=card;comparisonOpenedByPointer=e.detail>0;card.classList.toggle('is-pointer-dialog-return',comparisonOpenedByPointer);showComparison(comparisonCards.indexOf(card),true);});
  comparisonPrev?.addEventListener('click',()=>showComparison(comparisonIndex-1));
  comparisonNext?.addEventListener('click',()=>showComparison(comparisonIndex+1));
  comparisonModal.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();showComparison(comparisonIndex+(e.key==='ArrowRight'?1:-1));});
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
 // All selected works contribute to the estimate; every input recalculates it from scratch.
 const finishCalculator=document.querySelector('[data-finishing-calculator]');
 if(finishCalculator){
  const controls=finishCalculator.querySelector('[data-calc-controls]'),dialog=finishCalculator.querySelector('dialog');
  const currency=n=>Math.round(n).toLocaleString('ru-RU')+' ₽',quantity=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
  // Estimates stay immediate; download the drawing module only near the section.
  let calculatorObserver=null;
  const calculatorSceneEvents=['pointerdown','focusin','input','change'];
  const calculatorScene=createCalculatorSceneLoader({
   load:async attempt=>{
    const url=new URL('calculator-scene.js',siteBase);
    // A failed module request can be cached by the browser; a later interaction retries it.
    if(attempt)url.searchParams.set('retry',String(attempt));
    const module=await import(url.href);
    return module.createCalculatorScene(finishCalculator,siteBase);
   },
   onReady:()=>{
    calculatorObserver?.disconnect();calculatorObserver=null;
    calculatorSceneEvents.forEach(event=>finishCalculator.removeEventListener(event,startCalculatorScene));
    finishCalculator.classList.add('calculator-scene-ready');
   }
  });
  const renderCalculatorScene=calculatorScene.render;
  const startCalculatorScene=()=>calculatorScene.start();
  calculatorSceneEvents.forEach(event=>finishCalculator.addEventListener(event,startCalculatorScene));
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
