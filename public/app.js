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
  const showComparison=(index,trackOpen=false,syncUrl=true)=>{if(!comparisonCards.length)return;comparisonIndex=(index+comparisonCards.length)%comparisonCards.length;const card=comparisonCards[comparisonIndex],beforeReal=card.dataset.beforeReal==='true',beforeVisualized=card.dataset.beforeVisualized==='true',visualized=card.dataset.visualized==='true';const repair=card.dataset.case==='work-4';comparisonGrid.classList.toggle('repair-modal-compare',repair);repairControl.hidden=!repair;repairDivider.hidden=!repair;repairControl.value='50';comparisonGrid.style.setProperty('--split','50%');beforeImage.style.removeProperty('aspect-ratio');afterImage.style.removeProperty('aspect-ratio');beforeImage.src=new URL(card.dataset.before,siteBase).href;afterImage.src=new URL(card.dataset.after,siteBase).href;comparisonTitle.textContent=card.dataset.title;beforeLabel.textContent='До';afterLabel.textContent='После';beforeImage.alt=`${card.dataset.title} — ${beforeVisualized||visualized?'до работ, тематическая визуализация':beforeReal?'до работ ArtBalkon':'до ремонта, визуальная реконструкция'}`;afterImage.alt=`${card.dataset.title} — ${visualized?'после работ, тематическая визуализация':'после работ ArtBalkon'}`;if(syncUrl){const url=new URL(location.href);url.searchParams.set('case',card.dataset.case);history[comparisonModal.open?'replaceState':'pushState'](history.state,'',url);}if(!comparisonModal.open)openDialogAtCurrentScroll(comparisonModal,comparisonModal.querySelector('.comparison-close'));if(trackOpen)track('before_after_open',{project:card.dataset.title});};
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
 let selection=null,ready=false,frame=0;
 const cells={laminate:0,'laminate-wall':0,lining:1,parquet:2,pvc:3,vinyl:4,tile:5,linoleum:6,concrete:7,outside:8};
 const surfaces={back:[[108.5,140],[220,140],[220,317],[108.5,317]],house:[[220,140],[298,57],[297,427.5],[220,317]],parapet:[[47.5,304],[108.5,267],[108.5,317],[47.5,427.5]],ceiling:[[43,63],[298,63],[220,140],[108.5,140]],floor:[[113,317],[220,317],[293,427.5],[47.5,427.5]]};
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
  const map=projection(q),depth=isFloor?[.7,3.2]:[1.2,1.3];
  const recessed=isFloor?q.map(([x,y],i)=>[x,y+(i<2?.8:3.2)]):q,foamMap=projection(recessed);
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
  for(const v of [0,.46,.96])batten(0,v,1,Math.min(1,v+.04),false);
  for(const u of [0,.315,.635,.955])batten(u,0,Math.min(1,u+.045),1,true);
  ctx.restore();
 }
 function recessedBay(q,kind){
  const [[left,top],,[right,bottom]]=q,width=right-left;
  // The back and four inner faces stay within the existing frame opening.
  const shift=kind==='side'?0:Math.max(-1.5,Math.min(1.5,(170-(left+right)/2)*.02));
  const rear=kind==='side'?[[left+width*3/8.5,top+1.3],[right-width*.65/8.5,top+1.3],[right-width*.65/8.5,bottom-3],[left+width*3/8.5,bottom-3]]:
   [[left+2.7+shift,top+(kind==='roof'?2.5:.8)],[right-2.7+shift,top+(kind==='roof'?2.5:.8)],[right-2.7+shift,bottom-(kind==='roof'?.8:3)],[left+2.7+shift,bottom-(kind==='roof'?.8:3)]];
  ctx.save();polygon(q);ctx.clip();
  fill(q,'#36332e');
  plane(rear,'concrete',Math.max(1,width/35),1,false,{axis:[rear[0][0],rear[0][1],rear[2][0],rear[2][1]],stops:[[0,'#151511ce'],[.45,'#25241eab'],[1,'#39362ba3']]},4);
  for(let i=0;i<4;i++){
   const j=(i+1)%4,face=[q[i],q[j],rear[j],rear[i]],timber=kind==='side'?(i===0||i===2):(i===1||i===3);
   plane(face,timber?'timber':'concrete',1,1,kind!=='side',null,3);
   const g=ctx.createLinearGradient(q[i][0],q[i][1],rear[i][0],rear[i][1]);
   const shadow=i===0?'#1b1c1759':i===3?'#34332b48':'#b9ab8910';
   g.addColorStop(0,i===2?'#fff1ca20':shadow);g.addColorStop(1,i===2?'#302d214d':'#24231b9e');
   fill(face,g);
  }
  // Contact shadows sit at the rear corners, behind the unchanged timber ends.
  line([rear[3],rear[0],rear[1]],'#191b17a6',.6);
  line([rear[1],rear[2],rear[3]],'#0f130f70',.45);
  ctx.restore();
 }
 function cavity(q,filled){
  if(filled)plane(q,'insulated',2,1,false,{axis:[q[0][0],q[0][1],q[2][0],q[2][1]],stops:[[0,'#53321345'],[.25,'#53321308'],[1,'#53321325']]},4);
  line([q[3],q[0],q[1]],'#5c411e66',.65);
 }
 function floorSection(q,covered,filled){
  const left=q[3],right=q[2],top=covered?left[1]+1:left[1],bottom=428.7,width=right[0]-left[0],ribs=[0,.315,.635,.955];
  // The same front joists bound the recessed bays, with or without insulation.
  if(filled)cavity([[left[0],top],[right[0],top],[right[0],bottom],[left[0],bottom]],true);
  else for(let i=0;i<ribs.length-1;i++){
   const x0=left[0]+(ribs[i]+.045)*width,x1=left[0]+ribs[i+1]*width;
   recessedBay([[x0,top],[x1,top],[x1,bottom],[x0,bottom]],'floor');
  }
  for(const u of ribs){
   const x=left[0]+u*width,w=Math.min(.045,1-u)*width;
   const g=ctx.createLinearGradient(x,top,x+w,bottom);g.addColorStop(0,'#e4cc9f');g.addColorStop(.5,'#bea477');g.addColorStop(1,'#987d52');ctx.fillStyle=g;ctx.fillRect(x,top,w,bottom-top);
   for(let y=top+1;y<bottom;y+=2)line([[x+.4,y],[x+w-.4,y+.4]],'#6d542c30',.35);
   line([[x,top],[x,bottom]],'#674b2a55',.5);
  }
  if(covered){line([[left[0],left[1]],[right[0],right[1]]],'#eee2c3',1.8);line([[left[0],left[1]+1.5],[right[0],right[1]+1.5]],'#856d4966',.65);}
  line([[left[0],bottom],[right[0],bottom]],'#3e392c66',.8);
 }
 function sideSection(filled){
  const left=41.5,right=47.5,top=310.5,bottom=418.5,ribs=[top,337,363.5,390,bottom-2.3];
  if(filled)cavity([[left,top],[right,top],[right,bottom],[left,bottom]],true);
  else for(let i=0;i<ribs.length-1;i++)recessedBay([[left,ribs[i]+2.3],[right,ribs[i]+2.3],[right,ribs[i+1]],[left,ribs[i+1]]],'side');
  // Horizontal blocking remains in front of the four open or filled bays.
  for(const y of ribs){
   const q=[[left,y],[right,y],[right,y+2.3],[left,y+2.3]];
   plane(q,'timber',1,1,false,null,2);line([[left,y+2.3],[right,y+2.3]],'#62482880',.65);
   line([[left,y],[right,y]],'#f3dfbca6',.45);
  }
  line([[left,top],[left,bottom]],'#725b3f',.8);line([[right-.4,top],[right-.4,bottom]],'#eedabc',.85);
 }
 function roofSection(filled){
  const q=[[43,55],[298,55],[298,62.5],[43,62.5]],map=projection(q),ribs=[0,.315,.635,.955];
  if(filled)cavity(q,true);
  else for(let i=0;i<ribs.length-1;i++)recessedBay(section(map,ribs[i]+.045,0,ribs[i+1],1),'roof');
  for(const u of ribs){
   const rib=section(map,u,0,Math.min(1,u+.045),1);plane(rib,'timber',1,1,false,null,2);
   line([rib[1],rib[2]],'#72502d80',.6);line([rib[0],rib[3]],'#f4dfb580',.45);
  }
  line([[43,63],[298,63]],'#e7e2d5',1);line([[43,63.5],[298,63.5]],'#39342b50',.55);
 }


 function daylight(floor,glazed){
  const p=projection(floor);
  ctx.save();polygon(floor);ctx.clip();
  const light=ctx.createLinearGradient(55,345,282,430);light.addColorStop(0,'#ffeac948');light.addColorStop(.7,'#ffefc934');light.addColorStop(1,'#fff4db18');ctx.fillStyle=light;
  polygon([[0,.08],[1,.38],[1,.98],[0,.68]].map(uv=>p(...uv)));ctx.fill();
  // One coherent oblique shadow pattern follows the street window mullions.
  ctx.save();ctx.shadowColor='#433b3442';ctx.shadowBlur=.8;
  if(glazed){for(const v of [.09,.34,.59])fill([[0,v],[1,v+.30],[1,v+.325],[0,v+.025]].map(uv=>p(...uv)),'#423c333b');
   fill([[.08,.12],[.11,.13],[.91,.97],[.87,.96]].map(uv=>p(...uv)),'#423c3325');}ctx.restore();ctx.restore();
  ctx.save();polygon(surfaces.house);ctx.clip();
  const warm=ctx.createLinearGradient(220,170,298,330);warm.addColorStop(0,'#ffedc214');warm.addColorStop(1,'#ffedc231');ctx.fillStyle=warm;polygon([[220,176],[298,235],[298,356],[220,278]]);ctx.fill();
  ctx.shadowColor='#493f3440';ctx.shadowBlur=.85;
  if(glazed)for(const y of [193,227,260])fill([[220,y],[298,y+57],[298,y+60],[220,y+2]],'#493f3429');
  ctx.restore();
  // The projecting sill casts a narrow contact shadow onto the parapet.
  ctx.save();polygon(surfaces.parapet);ctx.clip();ctx.shadowColor='#302d2860';ctx.shadowBlur=1.4;
  fill([[47.5,307],[108.5,270],[108.5,275.5],[47.5,319]],'#39352d2f');ctx.restore();
 }
 function switchPlate(){
  const q=[[241.2,278.5],[247.8,282.5],[247.8,293],[241.2,289]],p=projection(q);
  ctx.save();ctx.shadowColor='#463e336b';ctx.shadowBlur=.6;ctx.shadowOffsetX=.8;ctx.shadowOffsetY=.8;fill(q,'#b7b6ae');ctx.restore();
  const g=ctx.createLinearGradient(241,279,248,293);g.addColorStop(0,'#ffffff');g.addColorStop(.65,'#eeeede');g.addColorStop(1,'#c8c9bf');fill(section(p,.035,.025,.965,.97),g);
  fill(section(p,.18,.17,.82,.83),'#b6b9af');fill(section(p,.21,.18,.79,.77),'#f5f5ed');
  line([p(.21,.18),p(.79,.18)],'#ffffff',.4);line([p(.79,.18),p(.79,.77)],'#8d948b',.45);
 }
 function streetView(q){
  // The landscape belongs behind the glass, not on its perspective plane.
  const photo=texture('outside'),height=q[3][1]-q[0][1],size=height*1.05,center=(q[0][0]+q[1][0])/2;
  ctx.save();polygon(q);ctx.clip();ctx.filter='saturate(.86) contrast(.95)';
  ctx.drawImage(photo,center-size*.32,q[0][1],size,size);ctx.restore();
 }
 function coldWindow(q){
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
  aluminium(section(p,0,0,1,.025),3);aluminium(section(p,0,.969,1,1),3);
  line([p(0,.027),p(1,.027)],'#55615b80',.55);line([p(0,.006),p(1,.006)],'#fafcf6',.65);
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

 function glazingSection(enabled,warm){
  // The exposed glass and profile cut share the sill's receding perspective.
  const cut=[[30,64],[43.4,65],[43.4,300.3],[30,303.2]];
  ctx.save();polygon(cut);ctx.clip();ctx.clearRect(29.5,63.8,14.4,239.5);ctx.restore();
  if(!enabled)return;
  const outer=warm?30.9:36.2,inner=43.1,top=warm?65:68.5,bottom=warm?301.4:299.3;
  const p=projection([[outer,top],[inner,top+3],[inner,bottom-2],[outer,bottom]]);
  // Open gaps separate the glass edges; they are not a solid tinted panel.
  fill(section(p,0,.057,1,.95),warm?'#b6c9c41c':'#a6b8b426');
  const panes=warm?[.19,.46,.73]:[.47];
  for(const u of panes){
   const pane=section(p,u,.057,u+(warm?.072:.085),.95),edge=pane.map(([x,y],i)=>[x+1.25,y+(i<2?1.45:-.85)]);
   fill([pane[1],edge[1],edge[2],pane[2]],'#8ca6a27a');
   const g=ctx.createLinearGradient(outer,78,inner,291);
   g.addColorStop(0,'#eff9f7');g.addColorStop(.26,'#aec5c6');g.addColorStop(.51,'#e7f2ee');g.addColorStop(.8,'#a3bdbe');g.addColorStop(1,'#f5faf4');fill(pane,g);
   line([pane[0],pane[3]],'#5c838791',.4);line([pane[1],pane[2]],'#ffffffd9',.5);
  }
  line([p(.02,.06),p(.02,.95)],warm?'#9eafaa':'#627a7a',.6);
  line([p(.97,.055),p(.97,.955)],'#fbfdf8',.75);
  function profile(v0,v1){
   const q=section(p,0,v0,1,v1),m=projection(q);
   // Stepped PVC mouldings and aluminium tracks have visible receding faces.
   const outline=(warm?[[0,.13],[.25,.13],[.25,0],[.83,0],[.83,.12],[1,.12],[1,.62],[.9,.62],[.9,.82],[1,.82],[1,1],[0,1]]:[[0,.12],[.2,.12],[.2,0],[.8,0],[.8,.12],[1,.12],[1,1],[0,1]]).map(uv=>m(...uv));
   const depth=warm?4.2:3.2,far=outline.map(([x,y])=>[x+depth,y+(v0===0?depth*1.15:-depth*.65)]);
   fill(far,warm?'#cbd3cd':'#98a7a3');
   for(let i=0;i<outline.length;i++){
    const j=(i+1)%outline.length,a=outline[i],b=outline[j],face=[a,b,far[j],far[i]];
    const shade=ctx.createLinearGradient(a[0],a[1],far[i][0],far[i][1]);
    shade.addColorStop(0,warm?'#eef1eb':'#c7d2cc');shade.addColorStop(1,warm?'#aeb9b2':'#6e807a');fill(face,shade);
   }
   const face=ctx.createLinearGradient(outer,q[0][1],inner,q[2][1]);
   face.addColorStop(0,warm?'#f5f6f0':'#c4cec8');face.addColorStop(.32,'#ffffff');face.addColorStop(1,warm?'#e4e9df':'#a9b9b1');fill(outline,face);
   line([...outline,outline[0]],warm?'#85958d':'#5f756d',.45);
   const holes=warm?[[.07,.30,.26,.49],[.37,.59,.15,.49],[.67,.87,.26,.49],[.07,.43,.63,.86],[.51,.85,.63,.86]]:[[.12,.39,.27,.79],[.62,.87,.27,.79]];
   for(const [u0,u1,w0,w1] of holes){
    const opening=section(m,u0,w0,u1,w1),du=(u1-u0)*.14,dv=(w1-w0)*.2,inset=section(m,u0+du,w0+dv,u1-du,w1-dv);
    fill(opening,'#78867f');fill(inset,warm?'#38463e':'#344b46');
    fill([opening[0],opening[1],inset[1],inset[0]],'#53625b');
    fill([opening[1],opening[2],inset[2],inset[1]],'#65776d');
    fill([opening[2],opening[3],inset[3],inset[2]],'#c3d0c1');
    line([opening[3],opening[0],opening[1]],'#ffffffb3',.35);
   }
   // A bevel joins the exposed end to the intact frame behind it.
   line([outline[outline.length-1],outline[outline.length-2],far[far.length-2]],'#fafcf4',.65);
  }
  profile(0,.057);profile(.95,1);
  for(const v of [.057,.95]){
   if(warm)for(const [u0,u1] of [[.26,.46],[.53,.73]])fill(section(p,u0,v-.006,u1,v+.006),'#55615b');
   for(const u of panes)line([p(u-.02,v),p(u+.10,v)],'#354841',.6);
  }
 }


 function parapetCore(){
  // The permanent mineral wall sits between exterior cladding and the inner battens.
  const left=36,right=41.5,top=302,bottom=429,q=[[left,top],[right,top],[right,bottom],[left,bottom]];
  plane(q,'concrete',1,2,false,{axis:[left,top,right,top],stops:[[0,'#eeead730'],[.52,'#ebe7d91a'],[1,'#49483b45']]},5);
  line([[left,top],[left,bottom]],'#eeeade',.55);
  line([[right,top],[right,bottom]],'#665f4b',.65);
  const base=[[left,bottom-1.8],[right,bottom-1.8],[right,429.5],[left,429.5]];
  fill(base,'#89877b');line([[left,bottom-1.8],[right,bottom-1.8]],'#d4d0bb',.55);
 }
 function wideStreetSill(){
  const top=[[30.8,300.5],[108.4,260.3],[118.8,264.6],[56.5,312.6]],inner=[top[3],top[2]],end=[top[0],top[3]],lowerInner=[[56.5,315.4],[118.8,266.0]];
  // A wider board has a real horizontal top, rounded inner nose and a capped end.
  ctx.save();polygon(surfaces.parapet);ctx.clip();ctx.shadowColor='#393b3266';ctx.shadowBlur=2.3;
  fill([[47.5,312.5],[108.5,270.1],[108.5,277.5],[47.5,323.5]],'#34382f30');ctx.restore();
  const face=ctx.createLinearGradient(56.5,312.6,56.5,315.4);face.addColorStop(0,'#e7e9e2');face.addColorStop(.35,'#fafbf6');face.addColorStop(1,'#a8afa5');
  fill([inner[0],inner[1],lowerInner[1],lowerInner[0]],face);
  const cap=ctx.createLinearGradient(...end[0],...end[1]);cap.addColorStop(0,'#d7ddd5');cap.addColorStop(.5,'#f8f9f4');cap.addColorStop(1,'#b9c1b6');
  fill([end[0],end[1],lowerInner[0],[30.8,303.3]],cap);
  const board=ctx.createLinearGradient(40,301,62,310);board.addColorStop(0,'#cfd6cd');board.addColorStop(.2,'#f5f6f0');board.addColorStop(.75,'#ffffff');board.addColorStop(1,'#e0e6dc');fill(top,board);
  line(inner,'#ffffff',.75);line(lowerInner,'#929d8c',.45);
  line([top[0],top[1]],'#79897b',.45);
  line([end[0],end[1]],'#f5f8f0',.6);
  line([[30.8,303.3],lowerInner[0]],'#8c998b',.55);
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
  const floorQ=surfaces.floor.map(([x,y],i)=>[x,y-(i<2?2.5:9)]);
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
  ctx.save();polygon(floorQ);ctx.clip();
  line([floorQ[3],floorQ[0],floorQ[1],floorQ[2]],'#403b3366',3.5);
  if(s['floor-enabled'])line([floorQ[3],floorQ[0],floorQ[1],floorQ[2]],'#ddd7c7',1.5);ctx.restore();
  line([[108.5,140],[220,140],[220,314.5]],'#36302738',1.1);line([[43,63],[108.5,140]],'#ffffff55',.65);
  daylight(floorQ,!!s['glazing-enabled']);
  if(s['lighting-enabled'])roomLighting(floorQ,s.lighting==='pendant');
  if(!s['glazing-enabled']||s.glazing==='cold'){
   const window=[[43,78],[108,142],[108,256.5],[43,291.5]];
   streetView(window);if(s['glazing-enabled'])coldWindow(window);
  }
  glazingSection(!!s['glazing-enabled'],s.glazing==='warm');
  const restore=q=>{ctx.save();polygon(q);ctx.clip();ctx.drawImage(base,0,0,340,480);ctx.restore();};
  restore([[225.4,140.8],[283.7,80.6],[283.7,413.8],[250.7,369.3],[250.7,275.7],[246.3,277.3],[218.1,260.3],[218.1,255.2],[225.4,254.8]]);
  // Apartment sill: a shaded underside, with the switch just below near the door.
  ctx.save();polygon(surfaces.house);ctx.clip();line([[218.7,261],[246.1,278]],'#3e393148',1.3);ctx.restore();switchPlate();
  if(s['exterior-enabled']){
   // Exterior cladding covers the slab's outer end down to the cutout's lower edge.
   const metal=s.exterior==='metal',top=308,bottom=465.8,q=[[28,311],[36,top],[36,bottom],[28,bottom]];ctx.save();polygon(q);ctx.clip();ctx.fillStyle=metal?'#8a9891':'#d6d6c5';ctx.fillRect(28,top,8,bottom-top);
   if(metal){for(let x=28;x<37;x+=2){const g=ctx.createLinearGradient(x,0,x+2,0);g.addColorStop(0,'#515f5b');g.addColorStop(.5,'#c1cbc5');g.addColorStop(1,'#79877f');ctx.fillStyle=g;ctx.fillRect(x,top,2,bottom-top);}}
   else for(let y=top+1;y<bottom;y+=9){line([[28,y],[36,y-.5]],'#9faaa1',1);line([[28,y+1],[36,y+.5]],'#f3f1e8',.7);}ctx.restore();
  }
  parapetCore();sideSection(insulated);floorSection(floorQ,!!s['floor-enabled'],insulated);roofSection(insulated);wideStreetSill();
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



 // Interactive finish estimate; unknown-rate work is deliberately quoted separately.
 const finishCalculator=document.querySelector('[data-finishing-calculator]');
 if(finishCalculator){
  const controls=finishCalculator.querySelector('[data-calc-controls]'),rates=JSON.parse(finishCalculator.dataset.rates),dialog=finishCalculator.querySelector('dialog');
  const currency=n=>Math.round(n).toLocaleString('ru-RU')+' ₽',area=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})+' м²';
  const renderCalculatorScene=createCalculatorScene(finishCalculator);
  let calculation='';
  const read=()=>{const state=Object.fromEntries(new FormData(controls));state.insulation=state['insulation-enabled']?'yes':'no';return state;};
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
