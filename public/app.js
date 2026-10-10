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
 // Keep the same ratings row above the title on desktop and at its original slot on phones.
 const ratingsRow=document.querySelector('main .hero-rating-badges');
 const pageTitle=document.querySelector('main h1');
 if(ratingsRow&&pageTitle){
  const ratingsBlock=ratingsRow.closest('.page-rating-row')||ratingsRow;
  const ratingsSlot=document.createComment('ratings mobile position');
  ratingsBlock.before(ratingsSlot);
  const desktopRatings=matchMedia('(min-width: 641px)');
  const placeRatings=()=>{if(desktopRatings.matches)pageTitle.before(ratingsBlock);else ratingsSlot.after(ratingsBlock);};
  placeRatings();
  desktopRatings.addEventListener('change',placeRatings);
 }
 const $=s=>document.querySelector(s);
 const siteBase=new URL('.',document.currentScript.src);
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
 const scrollTopButton=$('#scroll-top');
 const syncScrollTop=()=>{if(scrollTopButton)scrollTopButton.hidden=scrollY<Math.max(480,innerHeight*.65);};
 let scrollFrame=0;
 const syncScrollUi=()=>{scrollFrame=0;syncHeader();syncScrollTop();};
 syncScrollUi();addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(syncScrollUi);},{passive:true});
 scrollTopButton?.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
 const menu=$('#mobile-menu'),toggle=$('.menu-toggle'),menuBackdrop=$('.mobile-menu-backdrop');let menuCloseTimer=0,menuScrollY=0;
 function openMenu(){if(!menu||!toggle)return;clearTimeout(menuCloseTimer);menuScrollY=scrollY;document.body.style.setProperty('--menu-scroll-offset',`-${menuScrollY}px`);menu.hidden=false;menu.scrollTop=0;if(menuBackdrop)menuBackdrop.hidden=false;document.body.classList.add('menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Закрыть меню');requestAnimationFrame(()=>requestAnimationFrame(()=>{menu.scrollTop=0;menu.classList.add('is-open');menuBackdrop?.classList.add('is-open');menu.querySelector('.mobile-menu-close')?.focus({preventScroll:true});}));}
 function closeMenu(restoreFocus=true){if(!menu||!toggle||toggle.getAttribute('aria-expanded')!=='true')return;menu.classList.remove('is-open');menuBackdrop?.classList.remove('is-open');const restoreY=menuScrollY;document.body.classList.remove('menu-open');document.body.style.removeProperty('--menu-scroll-offset');scrollTo(0,restoreY);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');clearTimeout(menuCloseTimer);menuCloseTimer=setTimeout(()=>{if(toggle.getAttribute('aria-expanded')==='false'){menu.hidden=true;if(menuBackdrop)menuBackdrop.hidden=true;}},300);if(restoreFocus)toggle.focus({preventScroll:true});}
 toggle?.addEventListener('click',()=>toggle.getAttribute('aria-expanded')==='true'?closeMenu():openMenu());
 menu?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu(false);});
 document.querySelectorAll('[data-mobile-menu-close]').forEach(el=>el.addEventListener('click',()=>closeMenu()));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true')closeMenu();});
 addEventListener('resize',()=>{if(innerWidth>1100&&toggle?.getAttribute('aria-expanded')==='true')closeMenu(false);},{passive:true});
 const heroSlider=$('[data-hero-slider]');
 if(heroSlider){
  const slides=[...heroSlider.querySelectorAll('.hero-image')];
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let heroIndex=0,heroTimer=0;
  const loadSlide=slide=>{if(slide?.dataset.src){slide.src=slide.dataset.src;delete slide.dataset.src;}};
  const showHeroSlide=index=>{heroIndex=index;loadSlide(slides[heroIndex]);slides.forEach((slide,i)=>{const active=i===heroIndex;slide.classList.toggle('is-active',active);slide.setAttribute('aria-hidden',String(!active));});loadSlide(slides[(heroIndex+1)%slides.length]);};
  const stopHeroSlider=()=>{if(heroTimer){clearInterval(heroTimer);heroTimer=0;}};
  const startHeroSlider=()=>{if(reducedMotion.matches||slides.length<2||heroTimer)return;heroTimer=setInterval(()=>showHeroSlide((heroIndex+1)%slides.length),3000);};
  showHeroSlide(0);startHeroSlider();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHeroSlider();else startHeroSlider();});
  addEventListener('pagehide',stopHeroSlider);
  addEventListener('pageshow',startHeroSlider);
  reducedMotion.addEventListener('change',()=>{stopHeroSlider();startHeroSlider();});
 }
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let modalTriggerScrollY=null;
 const dialogScrollPositions=new WeakMap();
 document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-calc-request],[data-quiz-open],[data-callback-open],[data-application],[data-comparison],[data-cert-open],[data-gift-open],[data-promo-choice]'))modalTriggerScrollY=scrollY;},{passive:true});
 const restoreScrollPosition=top=>{if(!Number.isFinite(top))return;const root=document.documentElement,previousBehavior=root.style.scrollBehavior;root.style.scrollBehavior='auto';scrollTo(0,top);requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollTo(0,top);root.style.scrollBehavior=previousBehavior;}));};
 const openDialogAtCurrentScroll=(dialog,focusTarget)=>{if(!dialog)return;const top=modalTriggerScrollY??scrollY;modalTriggerScrollY=null;dialogScrollPositions.set(dialog,top);if(!dialog.open)dialog.showModal();focusTarget?.focus({preventScroll:true});restoreScrollPosition(top);};
 document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{const top=dialogScrollPositions.get(dialog);dialogScrollPositions.delete(dialog);restoreScrollPosition(top);}));
 const hydrateVideo=video=>{const sources=[...video.querySelectorAll('source[data-src]')];if(!sources.length)return;for(const source of sources){source.src=source.dataset.src;delete source.dataset.src;}video.load();};
 const lazyVideos=[...document.querySelectorAll('[data-lazy-video]')];
 if('IntersectionObserver' in window){const videoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const video=entry.target;hydrateVideo(video);if(video.autoplay&&!reducedMotion.matches)video.play().catch(()=>{});videoObserver.unobserve(video);}),{rootMargin:'500px 0px'});lazyVideos.forEach(video=>videoObserver.observe(video));}
 else lazyVideos.forEach(hydrateVideo);
 lazyVideos.forEach(video=>{video.addEventListener('pointerdown',()=>hydrateVideo(video),{once:true});video.addEventListener('focus',()=>hydrateVideo(video),{once:true});});
 document.querySelectorAll('[data-ambient-video]').forEach(video=>{
  const control=video.closest('.home-advantages-photo')?.querySelector('[data-ambient-video-toggle]');
  const syncControl=()=>{if(!control)return;const paused=video.paused;control.classList.toggle('is-paused',paused);control.setAttribute('aria-label',paused?'Воспроизвести видео':'Приостановить видео');control.querySelector('span').textContent=paused?'▶':'Ⅱ';};
  if(reducedMotion.matches){video.removeAttribute('autoplay');video.pause();}
  video.addEventListener('play',syncControl);video.addEventListener('pause',syncControl);syncControl();
  control?.addEventListener('click',()=>{hydrateVideo(video);if(video.paused)video.play().catch(()=>{});else video.pause();});
 });
 const phoneNationalDigits=value=>{let digits=String(value||'').replace(/\D/g,'');if(/^\s*\+7/.test(String(value||'')))digits=digits.slice(1);else if(digits.length===11&&/^[78]/.test(digits))digits=digits.slice(1);return digits.slice(0,10);};
 const formatPhone=value=>{const digits=phoneNationalDigits(value);let formatted='+7 ';if(!digits)return formatted;formatted+=`(${digits.slice(0,3)}`;if(digits.length>=3)formatted+=')';if(digits.length>3)formatted+=` ${digits.slice(3,6)}`;if(digits.length>6)formatted+=`-${digits.slice(6,8)}`;if(digits.length>8)formatted+=`-${digits.slice(8,10)}`;return formatted;};
 const phoneIsValid=value=>{const digits=phoneNationalDigits(value);return /^\d{10}$/.test(digits)&&!(/^(\d)\1{9}$/.test(digits));};
 document.querySelectorAll('input[name="phone"]').forEach(input=>{input.value=formatPhone(input.value);input.addEventListener('focus',()=>{if(!input.value.trim())input.value='+7 ';requestAnimationFrame(()=>input.setSelectionRange(input.value.length,input.value.length));});input.addEventListener('input',()=>{input.value=formatPhone(input.value);input.setCustomValidity('');});});
 function validate(form,scope=form){
  const fields=[...scope.querySelectorAll('input')].filter(el=>!el.closest('.honeypot'));
  for(const el of fields){if(el.name==='phone')el.setCustomValidity(phoneIsValid(el.value)?'':'Введите 10 цифр после +7. Номер не должен состоять из одинаковых цифр.');if(el.name==='name'||el.name==='size')el.setCustomValidity(el.value.trim()?'':'Пожалуйста, заполните это поле.');if(!el.checkValidity()){el.reportValidity();el.focus();return false;}}
  return true;
 }
 document.querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>{el.setCustomValidity('');el.closest('form')?.querySelector('.form-error')?.replaceChildren();}));
 const quizDialog=document.querySelector('dialog#quiz-modal');
 const quizControllers=new Map();
 document.querySelectorAll('[data-lead-form="quiz"]').forEach(form=>{let step=0,started=false;const steps=[...form.querySelectorAll('[data-step]')],lastStep=Math.max(0,steps.length-1),stepCount=form.querySelector('[id^="step-count"]'),progress=form.querySelector('[id^="quiz-progress"]'),back=form.querySelector('.back-button'),next=form.querySelector('.quiz-next-button'),submit=form.querySelector('[type="submit"]');
  const begin=()=>{if(!started){track('quiz_start');started=true;}};
  const syncNextState=()=>{const current=steps[step];if(!current||!next)return;const radios=[...current.querySelectorAll('input[type="radio"][required]')],radioNames=[...new Set(radios.map(input=>input.name))],otherRequired=[...current.querySelectorAll('input[required]:not([type="radio"]),select[required],textarea[required]')].filter(input=>!input.closest('.honeypot')),ready=radioNames.every(name=>radios.some(input=>input.name===name&&input.checked))&&otherRequired.every(input=>input.checkValidity());next.classList.toggle('is-ready',ready);next.disabled=!ready;next.setAttribute('aria-disabled',String(!ready));};
  const showStep=(index,focus=true)=>{step=Math.max(0,Math.min(lastStep,index));steps.forEach((el,i)=>el.hidden=i!==step);stepCount.textContent=`Шаг ${step+1} из ${steps.length}`;progress.max=steps.length;progress.value=step+1;back.disabled=step===0;next.hidden=step===lastStep;submit.hidden=step!==lastStep;form.querySelector('.form-error').textContent='';syncNextState();if(focus)steps[step]?.querySelector('legend')?.focus({preventScroll:true});};
  const advance=()=>{begin();if(validate(form,steps[step]))showStep(Math.min(lastStep,step+1));};
  const controller={form,steps,lastStep,begin,showStep,advance,currentStep:()=>step,atLastStep:()=>step===lastStep};quizControllers.set(form,controller);
  form.addEventListener('change',()=>{begin();syncNextState();});form.addEventListener('input',syncNextState);next?.addEventListener('click',advance);back?.addEventListener('click',()=>showStep(Math.max(0,step-1)));form.addEventListener('keydown',e=>{if(e.key==='Enter'&&step<lastStep&&e.target.tagName==='INPUT'){e.preventDefault();if(next&&!next.disabled)advance();}});syncNextState();
 });
 const modalQuiz=quizDialog?.querySelector('[data-lead-form="quiz"]');
 const primaryQuizController=quizControllers.get(modalQuiz)||quizControllers.values().next().value;
 const quiz=primaryQuizController?.form||null;
 function openQuiz(trackOpen=true){if(!quizDialog)return;openDialogAtCurrentScroll(quizDialog,quizDialog.querySelector('.quiz-modal-close'));if(trackOpen)track('quiz_open');}
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-quiz-open]');if(!trigger||!quizDialog)return;e.preventDefault();closeMenu();openQuiz();});
 quizDialog?.querySelector('.quiz-modal-close')?.addEventListener('click',()=>quizDialog.close());
 quizDialog?.addEventListener('click',e=>{if(e.target===quizDialog)quizDialog.close();});
 if(location.hash==='#quiz'){openQuiz(false);history.replaceState(null,'',location.pathname+location.search);}
 const callbackDialog=document.querySelector('dialog#callback-modal');
 function openCallback(trackOpen=true){if(!callbackDialog)return;openDialogAtCurrentScroll(callbackDialog,callbackDialog.querySelector('input[name="name"]'));if(trackOpen)track('callback_open');}
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-callback-open]');if(!trigger||!callbackDialog)return;e.preventDefault();closeMenu();openCallback();});
 callbackDialog?.querySelector('.callback-modal-close')?.addEventListener('click',()=>callbackDialog.close());
 callbackDialog?.addEventListener('click',e=>{if(e.target===callbackDialog)callbackDialog.close();});
 if(location.hash==='#callback'){openCallback(false);history.replaceState(null,'',location.pathname+location.search);}
 function showThanks(form,preview){
  const box=document.createElement('div');box.className='thank-you';box.setAttribute('role','status');box.tabIndex=-1;
  const icon=document.createElement('span');icon.className='success-icon';icon.textContent='✓';icon.setAttribute('aria-hidden','true');
  const title=document.createElement('h3');title.textContent=preview?'Спасибо! Форма работает.':'Спасибо! Заявка принята.';
  const text=document.createElement('p');text.textContent=preview?'Это предварительный просмотр сайта. Тестовая заявка сохранена, но менеджеру пока не отправлена.':'Свяжемся с вами, уточним детали и подготовим предварительный расчёт.';
  const phone=document.createElement('a');phone.className='text-link';phone.href='tel:+74951653905';phone.dataset.event='phone_click';phone.textContent='Позвонить: +7 (495) 165-39-05';
  box.append(icon,title,text,phone);form.replaceChildren(box);
  const dialog=form.closest('.application-modal,.quiz-modal');
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
    showThanks(form,result.mode==='preview');
    if(result.mode!=='preview'){trackFormSubmission(id);if(quizController)track('quiz_complete');}
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
  const showComparison=(index,trackOpen=false,syncUrl=true)=>{if(!comparisonCards.length)return;comparisonIndex=(index+comparisonCards.length)%comparisonCards.length;const card=comparisonCards[comparisonIndex],beforeReal=card.dataset.beforeReal==='true',beforeVisualized=card.dataset.beforeVisualized==='true',visualized=card.dataset.visualized==='true';const repair=card.dataset.case==='work-4';comparisonGrid.classList.toggle('repair-modal-compare',repair);repairControl.hidden=!repair;repairDivider.hidden=!repair;repairControl.value='50';comparisonGrid.style.setProperty('--split','50%');beforeImage.style.removeProperty('aspect-ratio');afterImage.style.removeProperty('aspect-ratio');beforeImage.src=new URL(card.dataset.before,siteBase).href;afterImage.src=new URL(card.dataset.after,siteBase).href;comparisonTitle.textContent=card.dataset.title;beforeLabel.textContent='До';afterLabel.textContent='После';beforeImage.alt=`${card.dataset.title} — ${beforeVisualized||visualized?'до работ, тематическая визуализация':beforeReal?'до работ ArtBalkon':'до ремонта, визуальная реконструкция'}`;afterImage.alt=`${card.dataset.title} — ${visualized?'после работ, тематическая визуализация':'после работ ArtBalkon'}`;if(syncUrl){const url=new URL(location.href);url.searchParams.set('case',card.dataset.case);history[comparisonModal.open?'replaceState':'pushState'](history.state,'',url);}if(!comparisonModal.open)openDialogAtCurrentScroll(comparisonModal,comparisonModal.querySelector('.comparison-close'));if(trackOpen)track('before_after_open',{project:card.dataset.title});};
  document.addEventListener('click',e=>{const card=e.target.closest('[data-comparison]');if(!card)return;showComparison(comparisonCards.indexOf(card),true);});
  comparisonPrev?.addEventListener('click',()=>showComparison(comparisonIndex-1));
  comparisonNext?.addEventListener('click',()=>showComparison(comparisonIndex+1));
  comparisonModal.addEventListener('keydown',e=>{if(e.target===repairControl)return;if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();showComparison(comparisonIndex+(e.key==='ArrowRight'?1:-1));});
  comparisonModal.querySelector('.comparison-close')?.addEventListener('click',()=>comparisonModal.close());
  comparisonModal.addEventListener('click',e=>{if(e.target===comparisonModal)comparisonModal.close();});
  comparisonModal.addEventListener('close',()=>{beforeImage.removeAttribute('src');afterImage.removeAttribute('src');const url=new URL(location.href);if(url.searchParams.has('case')){url.searchParams.delete('case');history.replaceState(history.state,'',url);}});
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
 // Interactive finish estimate; unknown-rate work is deliberately quoted separately.
 const finishCalculator=document.querySelector('[data-finishing-calculator]');
 if(finishCalculator){
  const controls=finishCalculator.querySelector('[data-calc-controls]'),rates=JSON.parse(finishCalculator.dataset.rates),dialog=finishCalculator.querySelector('dialog');
  const currency=n=>Math.round(n).toLocaleString('ru-RU')+' ₽',area=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})+' м²';
  let calculation='';
  const read=()=>Object.fromEntries(new FormData(controls));
  const materialName=key=>controls.querySelector(`input[name="${key}"]:checked`)?.closest('label').querySelector('.finish-calc-swatch+span')?.textContent||'';
  function updateEstimate(){
   finishCalculator.querySelectorAll('[data-calc-group]').forEach(group=>{const toggle=group.querySelector('input[type="checkbox"]');if(toggle)group.querySelectorAll('input[type="radio"]').forEach(input=>input.disabled=!toggle.checked);});
   const state=read(),L=Number(state.length)/100,W=Number(state.width)/100,H=Number(state.height)/100,G=Number(state.windowHeight)/100;
   const valid=controls.checkValidity()&&G<H;
   finishCalculator.querySelector('[data-calc-error]').textContent=valid?'':G>=H?'Высота окон должна быть меньше высоты помещения.':'Укажите размеры в пределах, указанных в полях.';
   finishCalculator.querySelector('[data-calc-request]').disabled=!valid;
   if(!valid){calculation='';finishCalculator.querySelector('[data-calc-total]').textContent='—';finishCalculator.querySelector('[data-calc-breakdown]').replaceChildren();return;}
   const glazedLength=L+(state.object==='balcony'?2*W:0),floorArea=L*W,glazingArea=glazedLength*G;
   const wallArea=L*H+glazedLength*(H-G)+(state.object==='loggia'?2*W*H:0);
   const items=[],extra=[];
   if(state['walls-enabled'])items.push(['Стены · '+area(wallArea),wallArea*rates.walls[state.walls]]);
   if(state['glazing-enabled'])items.push(['Остекление · '+area(glazingArea),glazingArea*rates[state.glazing]]);
   if(state.insulation==='yes')items.push(['Утепление · '+area(wallArea+2*floorArea),(wallArea+2*floorArea)*rates.insulation]);
   const names={ceiling:'Потолок',floor:'Пол',exterior:'Наружная отделка',lighting:'Освещение'};
   for(const [key,name] of Object.entries(names))if(state[key+'-enabled'])extra.push(name);
   const total=items.reduce((sum,item)=>sum+item[1],0);
   finishCalculator.querySelector('[data-calc-total]').textContent=items.length?currency(total):'По замеру';
   finishCalculator.querySelector('[data-calc-additions]').textContent=extra.length?extra.join(', ')+' — отдельно по замеру':'Точная стоимость — после замера';
   finishCalculator.querySelector('[data-calc-area]').textContent=area(floorArea);
   const breakdown=finishCalculator.querySelector('[data-calc-breakdown]');breakdown.replaceChildren();
   for(const [label,amount] of items){const row=document.createElement('p'),title=document.createElement('span'),value=document.createElement('strong');title.textContent=label;value.textContent='от '+currency(amount);row.append(title,value);breakdown.append(row);}
   if(!items.length){const row=document.createElement('p');row.textContent='Выбранные работы рассчитываются после замера.';breakdown.append(row);}
   const fills={pvc:'url(#calc-pvc)',laminate:'url(#calc-laminate)',lining:'url(#calc-lining)',parquet:'url(#calc-parquet)',stretch:'#fbfaf5',linoleum:'#c8b49b',vinyl:'#adb1a7',tile:'url(#calc-tile)'};
   finishCalculator.querySelectorAll('[data-calc-surface]').forEach(surface=>{const key=surface.dataset.calcSurface;surface.setAttribute('fill',state[key+'-enabled']?fills[state[key]]:'#e7e5df');});
   finishCalculator.querySelector('[data-calc-windows]').toggleAttribute('hidden',!state['glazing-enabled']);
   finishCalculator.querySelector('[data-calc-open-windows]').toggleAttribute('hidden',!!state['glazing-enabled']);
   finishCalculator.querySelector('[data-calc-insulation]').toggleAttribute('hidden',state.insulation!=='yes');
   finishCalculator.querySelector('[data-calc-exterior]').toggleAttribute('hidden',!state['exterior-enabled']);
   finishCalculator.querySelector('[data-calc-exterior]').setAttribute('stroke',state.exterior==='metal'?'#79877d':'#aeb7a2');
   finishCalculator.querySelectorAll('[data-calc-light]').forEach(light=>light.toggleAttribute('hidden',!state['lighting-enabled']||state.lighting!==light.dataset.calcLight));
   finishCalculator.querySelectorAll('[data-calc-windows] path').forEach(frame=>{if(frame.getAttribute('stroke-width')!=='3')frame.setAttribute('stroke',state.glazing==='cold'?'#8b9995':'#fafbf7');});
   const selected=['walls','ceiling','floor','exterior','glazing','lighting'].filter(key=>state[key+'-enabled']).map(key=>({walls:'Стены',...names,glazing:'Остекление'})[key]+': '+materialName(key));
   calculation=[state.object==='balcony'?'Балкон':'Лоджия',`Размеры: ${state.length} × ${state.width} см; высота ${state.height} см; окна ${state.windowHeight} см`,...selected,'Утепление: '+(state.insulation==='yes'?'да':'нет'),items.length?'Предварительно от '+currency(total):'Стоимость по замеру',...items.map(([label,amount])=>label+': от '+currency(amount)),extra.length?'Отдельно по замеру: '+extra.join(', '):'', 'Площадь стен без вычета квартирных проёмов; итог уточняется после замера.'].filter(Boolean).join('\n');
  }
  controls.addEventListener('input',updateEstimate);controls.addEventListener('change',updateEstimate);controls.addEventListener('submit',e=>e.preventDefault());
  finishCalculator.querySelector('[data-calc-request]').addEventListener('click',()=>{updateEstimate();if(!calculation)return;const form=dialog.querySelector('[data-calc-lead]');if(form.querySelector('[name="calculation"]')){form.querySelector('[name="calculation"]').value=calculation;dialog.querySelector('[data-calc-summary]').textContent=calculation;}openDialogAtCurrentScroll(dialog,form.querySelector('input[name="name"]')||form.querySelector('.thank-you'));track('calculator_lead_open');});
  dialog.querySelector('[data-calc-close]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  updateEstimate();
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
