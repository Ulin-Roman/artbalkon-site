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
// Texture planes share the photograph's vanishing point. The entire cutaway is
// mirrored at render time, placing the street facade on the visitor's right.
function createCalculatorScene(root) {
 const canvas=root.querySelector('[data-calc-canvas]'),ctx=canvas.getContext('2d');
 if(!ctx)return ()=>{};
 const base=new Image(),atlas=new Image(),insulation=new Image(),cache=new Map();
 let selection=null,ready=false,frame=0;
 const cells={laminate:0,lining:1,parquet:2,pvc:3,vinyl:4,tile:5,linoleum:6,concrete:7,outside:8};
 const polygon=q=>{ctx.beginPath();q.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();};
 function texture(key,rx=1,ry=1,rotate=false){
  const id=[key,rx,ry,rotate].join(':');if(cache.has(id))return cache.get(id);
  const tile=document.createElement('canvas');tile.width=tile.height=416;const t=tile.getContext('2d');
  if(key==='insulated'){t.drawImage(insulation,0,0,416,416);}
  else if(key==='stretch'){t.fillStyle='#f1f0eb';t.fillRect(0,0,416,416);}
  else {const cell=cells[key],size=atlas.width/3;t.drawImage(atlas,(cell%3)*size+2,Math.floor(cell/3)*size+2,size-4,size-4,0,0,416,416);}
  const out=document.createElement('canvas');out.width=out.height=1024;const c=out.getContext('2d');
  if(rotate){c.translate(1024,0);c.rotate(Math.PI/2);}
  for(let y=0;y<Math.ceil(ry);y++)for(let x=0;x<Math.ceil(rx);x++)c.drawImage(tile,x*1024/rx,y*1024/ry,1024/rx,1024/ry);
  cache.set(id,out);return out;
 }
 // Project a unit square onto a planar quadrilateral (not a bilinear warp).
 function projection(q){
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  const d=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/d,h=(dx1*dy3-dx3*dy1)/d;
  return (u,v)=>[(x0+(x1-x0+g*x1)*u+(x3-x0+h*x3)*v)/(1+g*u+h*v),(y0+(y1-y0+g*y1)*u+(y3-y0+h*y3)*v)/(1+g*u+h*v)];
 }
 function triangle(img,s,p){
  const [a,b,c]=s,[A,B,C]=p,det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  const m=(i)=>[((B[i]-A[i])*(c[1]-a[1])-(C[i]-A[i])*(b[1]-a[1]))/det,((C[i]-A[i])*(b[0]-a[0])-(B[i]-A[i])*(c[0]-a[0]))/det];
  const [aa,cc]=m(0),[bb,dd]=m(1);
  // Slightly overlapping clips prevent hairline seams between mesh triangles.
  const center=[(A[0]+B[0]+C[0])/3,(A[1]+B[1]+C[1])/3];
  ctx.save();polygon(p.map(([x,y])=>{const dx=x-center[0],dy=y-center[1],r=Math.hypot(dx,dy);return[x+dx/r*.22,y+dy/r*.22];}));ctx.clip();
  ctx.transform(aa,bb,cc,dd,A[0]-aa*a[0]-cc*a[1],A[1]-bb*a[0]-dd*a[1]);ctx.drawImage(img,0,0);ctx.restore();
 }
 function plane(q,key,rx,ry,rotate,shade){
  const img=texture(key,rx,ry,rotate),map=projection(q),n=16;
  ctx.save();polygon(q);ctx.clip();
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const uv=[[x/n,y/n],[(x+1)/n,y/n],[(x+1)/n,(y+1)/n],[x/n,(y+1)/n]];
   for(const ids of [[0,1,2],[0,2,3]])triangle(img,ids.map(i=>uv[i].map(v=>v*1024)),ids.map(i=>map(...uv[i])));
  }
  if(shade){const grad=ctx.createLinearGradient(...shade.axis);shade.stops.forEach(([p,c])=>grad.addColorStop(p,c));ctx.fillStyle=grad;ctx.fillRect(0,0,340,480);}
  ctx.restore();
 }
 const line=(points,color,width)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 function glow(x,y,r,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,241,198,${alpha})`);g.addColorStop(1,'rgba(255,241,198,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 function render(){
  frame=0;if(!ready||!selection)return;const s=selection;
  ctx.setTransform(3,0,0,3,0,0);ctx.clearRect(0,0,340,480);ctx.translate(340,0);ctx.scale(-1,1);ctx.drawImage(base,0,0,340,480);
  const wall=s['walls-enabled']?s.walls:s.insulation==='yes'?'insulated':'concrete',floor=s['floor-enabled']?s.floor:s.insulation==='yes'?'insulated':'concrete',ceiling=s['ceiling-enabled']?s.ceiling:s.insulation==='yes'?'insulated':'concrete';
  plane([[108,140],[220,140],[220,317],[113,317]],wall,1,1,false,{axis:[108,210,230,210],stops:[[0,'#28231540'],[.25,'#28231512'],[.8,'#28231525'],[1,'#28231555']]});
  plane([[220,140],[298,57],[297,426],[220,317]],wall,2.8,1,false,{axis:[220,190,298,190],stops:[[0,'#30291f48'],[.3,'#30291f08'],[1,'#ffffff12']]});
  plane([[47,310],[114,279],[113,317],[47,425]],wall,2.8,.48,false,{axis:[47,360,114,295],stops:[[0,'#30291f30'],[1,'#30291f60']]});
  plane([[43,56],[298,56],[220,140],[108,140]],ceiling,1,2.6,ceiling==='laminate',{axis:[170,56,170,140],stops:[[0,'#ffffff10'],[.65,'#342b1920'],[1,'#342b1955']]});
  plane([[113,317],[220,317],[296,429],[45,429]],floor,2.4,1.2,['laminate','vinyl'].includes(floor),{axis:[170,322,170,428],stops:[[0,'#211d195a'],[.25,'#211d1920'],[.8,'#ffffff09'],[1,'#211d1915']]});
  // Slim painted skirting and contact shadows hide joins without covering materials.
  line([[47,425],[113,317],[220,317],[294,425]],'#403b3366',3.5);
  if(s['floor-enabled'])line([[47,425],[113,318],[220,318],[294,425]],'#ddd7c7',1.5);
  line([[108,140],[220,140],[220,317]],'#36302738',1.1);
  line([[43,56],[108,140]],'#ffffff55',.65);
  if(!s['glazing-enabled']||s.glazing==='cold'){
   const window=[[43,78],[108,142],[108,270],[43,310]];
   plane(window,'outside',1,1,false);
   line([[43,78],[108,142],[108,270],[43,310]],'#e8e8e1',3);
   if(s['glazing-enabled']){
    const p=projection(window);
    for(const u of [0,.34,.67,1])line([p(u,0),p(u,1)],'#879391',2.1);
    line([p(0,.02),p(1,.02)],'#c6ceca',1.1);line([p(0,.99),p(1,.99)],'#8b9692',2);
    for(const u of [.34,.67]){const a=p(u,.63),b=p(u,.71);line([a,b],'#48524f',.9);}
    ctx.save();polygon(window);ctx.clip();const glass=ctx.createLinearGradient(43,140,108,220);glass.addColorStop(0,'#ffffff28');glass.addColorStop(.48,'#bed8de18');glass.addColorStop(.5,'#ffffff42');glass.addColorStop(1,'#e4eff51a');ctx.fillStyle=glass;ctx.fillRect(40,70,70,250);ctx.restore();
   }
  }
  // Apartment door/window, projecting sills and switch stay above all finish layers.
  const restore=q=>{ctx.save();polygon(q);ctx.clip();ctx.drawImage(base,0,0,340,480);ctx.restore();};
  restore([[225.4,140.8],[283.7,80.6],[283.7,413.8],[250.7,369.3],[250.7,275.7],[246.3,277.3],[218.1,260.3],[218.1,255.2],[225.4,254.8]]);
  restore([[236.7,276.5],[240.6,279],[240.6,288.1],[236.7,285.6]]);
  restore([[46.3,300.8],[111.7,263.5],[116,259.7],[116,263.5],[48.1,308.5],[43.1,306.5]]);
  if(s['exterior-enabled']){
   const metal=s.exterior==='metal',q=[[28,311],[36,308],[36,427],[28,427]];
   ctx.save();polygon(q);ctx.clip();ctx.fillStyle=metal?'#8a9891':'#d6d6c5';ctx.fillRect(28,308,8,120);
   if(metal){for(let x=28;x<37;x+=2){const g=ctx.createLinearGradient(x,0,x+2,0);g.addColorStop(0,'#515f5b');g.addColorStop(.5,'#c1cbc5');g.addColorStop(1,'#79877f');ctx.fillStyle=g;ctx.fillRect(x,308,2,120);}}
   else for(let y=309;y<428;y+=9){line([[28,y],[36,y-.5]],'#9faaa1',1);line([[28,y+1],[36,y+.5]],'#f3f1e8',.7);}
   ctx.restore();
  }
  if(s.insulation==='yes'){
   ctx.fillStyle='#d6bf83';ctx.fillRect(38,312,3,114);ctx.fillRect(46,430,249,2.8);
   line([[40,313],[40,425]],'#eee0b9',.65);
  }
  if(s['lighting-enabled']){
   if(s.lighting==='spots'){
    for(const [x,y,r] of [[170,76,5],[170,105,3.7],[170,124,2.6]]){glow(x,y,18,.17);ctx.fillStyle='#747469';ctx.beginPath();ctx.ellipse(x,y,r,r*.38,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff7d4';ctx.beginPath();ctx.ellipse(x,y-.25,r*.77,r*.25,0,0,Math.PI*2);ctx.fill();}
   }else{
    line([[170,92],[170,126]],'#373933',1);ctx.fillStyle='#353935';polygon([[161,126],[179,126],[184,139],[156,139]]);ctx.fill();ctx.fillStyle='#ffebba';ctx.beginPath();ctx.ellipse(170,139,14,2.5,0,0,Math.PI*2);ctx.fill();glow(170,145,25,.18);
   }
  }
  canvas.hidden=false;root.querySelector('[data-calc-fallback]').hidden=true;
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
 Promise.all([base,atlas,insulation].map(img=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}))).then(()=>{ready=true;schedule();}).catch(()=>{canvas.hidden=true;root.querySelector('[data-calc-fallback]').hidden=false;});
 insulation.src=new URL('assets/calculator-realistic-v1/insulation-battens-v1.webp',siteBase).href;
 base.src=root.querySelector('[data-calc-fallback]').src;atlas.src=new URL('assets/calculator-realistic-v1/material-atlas-v2.webp',siteBase).href;
 return state=>{selection=state;schedule();};
}

 // Interactive finish estimate; unknown-rate work is deliberately quoted separately.
 const finishCalculator=document.querySelector('[data-finishing-calculator]');
 if(finishCalculator){
  const controls=finishCalculator.querySelector('[data-calc-controls]'),rates=JSON.parse(finishCalculator.dataset.rates),dialog=finishCalculator.querySelector('dialog');
  const currency=n=>Math.round(n).toLocaleString('ru-RU')+' ₽',area=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})+' м²';
  const renderCalculatorScene=createCalculatorScene(finishCalculator);
  let calculation='';
  const read=()=>Object.fromEntries(new FormData(controls));
  const materialName=key=>controls.querySelector(`input[name="${key}"]:checked`)?.closest('label').querySelector('.finish-calc-swatch+span')?.textContent||'';
  function updateEstimate(){
   finishCalculator.querySelectorAll('[data-calc-group]').forEach(group=>{const toggle=group.querySelector('input[type="checkbox"]');if(toggle)group.querySelectorAll('input[type="radio"]').forEach(input=>input.disabled=!toggle.checked);});
   // Standard estimate geometry; exact dimensions are confirmed at the survey.
   const state=read(),L=Number(state.length)/100,W=Number(state.width)/100,H=2.5,G=1.4;
   const valid=controls.checkValidity();
   finishCalculator.querySelector('[data-calc-error]').textContent=valid?'':'Укажите размеры в пределах, указанных в полях.';
   finishCalculator.querySelector('[data-calc-request]').disabled=!valid;
   if(!valid){calculation='';finishCalculator.querySelector('[data-calc-total]').textContent='—';finishCalculator.querySelector('[data-calc-from]').hidden=true;return;}
   const glazedLength=L+2*W,floorArea=L*W,glazingArea=glazedLength*G;
   const wallArea=L*H+glazedLength*(H-G);
   const items=[],extra=[];
   if(state['walls-enabled'])items.push(['Стены · '+area(wallArea),wallArea*rates.walls[state.walls]]);
   if(state['glazing-enabled'])items.push(['Остекление · '+area(glazingArea),glazingArea*rates[state.glazing]]);
   if(state.insulation==='yes')items.push(['Утепление · '+area(wallArea+2*floorArea),(wallArea+2*floorArea)*rates.insulation]);
   const names={ceiling:'Потолок',floor:'Пол',exterior:'Наружная отделка',lighting:'Освещение'};
   for(const [key,name] of Object.entries(names))if(state[key+'-enabled'])extra.push(name);
   const total=items.reduce((sum,item)=>sum+item[1],0);
   finishCalculator.querySelector('[data-calc-total]').textContent=items.length?currency(total):'По замеру';
   finishCalculator.querySelector('[data-calc-from]').hidden=!items.length;
   renderCalculatorScene(state);
   const selected=['walls','ceiling','floor','exterior','glazing','lighting'].filter(key=>state[key+'-enabled']).map(key=>({walls:'Стены',...names,glazing:'Остекление'})[key]+': '+materialName(key));
   calculation=['Балкон / лоджия',`Размеры: ${state.length} × ${state.width} см`, 'Для предварительного расчёта приняты: высота 250 см, остекление 140 см, периметр остекления — длина + две ширины',...selected,'Утепление: '+(state.insulation==='yes'?'да':'нет'),items.length?'Предварительно от '+currency(total):'Стоимость по замеру',...items.map(([label,amount])=>label+': от '+currency(amount)),extra.length?'Отдельно по замеру: '+extra.join(', '):'', 'Площадь стен без вычета квартирных проёмов; итог уточняется после замера.'].filter(Boolean).join('\n');
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
