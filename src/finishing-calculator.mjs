// Rates come from the site's existing public price list.
const format = value => value.toLocaleString('ru-RU');
const choices = {
 walls: [['pvc','ПВХ-панели'],['laminate','Ламинат'],['lining','Вагонка'],['parquet','Стеновой паркет']],
 ceiling: [['pvc','ПВХ-панели'],['laminate','Ламинат'],['lining','Вагонка'],['stretch','Натяжной']],
 floor: [['linoleum','Линолеум'],['laminate','Ламинат'],['vinyl','Кварцвинил'],['tile','Плитка']],
 exterior: [['siding','Сайдинг'],['metal','Профлист']],
 glazing: [['cold','Холодное'],['warm','Тёплое']],
 insulation: [['yes','Да']],
 lighting: [['spots','Точечное'],['pendant','Подвесное']]
};
function group(key, title, selected, enabled, rates) {
 const compactTitle = {walls:'Стены',ceiling:'Потолок'}[key];
 const heading = compactTitle ? `<span class="finish-calc-heading-long">${title}</span><span class="finish-calc-heading-short">${compactTitle}</span>` : title;
 const toggle = `<label class="finish-calc-switch"><input type="checkbox" name="${key}-enabled" ${enabled?'checked':''} aria-label="Включить: ${title.toLowerCase()}"><span aria-hidden="true"></span></label>`;
 return `<fieldset class="finish-calc-group" data-calc-group="${key}"><legend>${title}</legend><div class="finish-calc-group-head" aria-hidden="true">${heading}</div>${toggle}<div class="finish-calc-options">${choices[key].map(([value,label])=>`<label class="finish-calc-option"><input type="radio" name="${key}" value="${value}" ${value===selected?'checked':''} ${!enabled?'disabled':''}><span class="finish-calc-swatch" data-swatch="${value}" aria-hidden="true"></span><span>${label}</span>${rates?.[value]?`<small>от ${format(rates[value])} ₽/м²</small>`:''}</label>`).join('')}</div></fieldset>`;
}
function scene() {
 // The roof sheet runs from the apartment wall beneath the slab, then folds
 // past the glazing. It continues behind the last pane instead of stopping at it.
 const vanishing=[180.606,199.829],houseNear=[33.5,54.5],innerNear=[309.5,54.5],outerNear=[352,63.5];
 const farScale=(vanishing[1]-155)/(vanishing[1]-innerNear[1]);
 const far=near=>near.map((value,i)=>vanishing[i]+(value-vanishing[i])*farScale);
 const houseFar=far(houseNear),innerFar=far(innerNear),outerFar=far(outerNear),thickness=1.4;
 const along=(near,far,v)=>near.map((value,i)=>Number((value+(far[i]-value)*v).toFixed(2))).join(' ');
 const point=p=>p.map(v=>Number(v.toFixed(2))).join(' ');
 const lower=(p,scale=1)=>[p[0],p[1]+thickness*scale];
 const roofRibs=Array.from({length:7},(_,i)=>{const depth=(i+1)/8,v=depth/(farScale+(1-farScale)*depth);return `<path d="M${along(houseNear,houseFar,v)} ${along(innerNear,innerFar,v)} ${along(outerNear,outerFar,v)}"/>`;}).join('');
 // Match the perspective of the sliding window in coldWindow(). The roof
 // remains behind its rails and stiles, and behind the warm window's PVC.
 const windowPoint=(u,v)=>{
  const scale=1+(213.5/114.5-1)*u;
  return [(297+(232*213.5/114.5-297)*u)/scale,(78+(142*213.5/114.5-78)*u+213.5*v)/scale];
 };
 const coldPanes=[[.018,.318],[.362,.648],[.692,.983]].map(([u0,u1])=>
  `<polygon points="${[[u0,.032],[u1,.032],[u1,.963],[u0,.963]].map(uv=>point(windowPoint(...uv))).join(' ')}"/>`).join('');
 return `<div class="finish-calc-scene-wrap"><svg class="finish-calc-scene" viewBox="16 18 340 448" role="img" aria-label="Выбранная отделка балкона с козырьком: остекление справа, дверь и окно в квартиру слева">
 <defs>
 <clipPath id="finish-calc-cutout" clipPathUnits="userSpaceOnUse"><polygon points="41.5,19.01 309.5,19.01 309.5,292.51 313.90,296.70 313.57,415.57 313.57,464.86 41.5,464.86"/><polygon points="33.5,19.01 41.5,19.01 41.5,464.86 36,464.86 36,418.5 31.08,63 31,55 33.5,55"/></clipPath>
 <clipPath id="finish-calc-cutout-exterior" clipPathUnits="userSpaceOnUse"><polygon points="41.5,19.01 309.5,19.01 309.5,304.8 309,304.8 309,464.86 41.5,464.86"/><polygon points="33.5,19.01 41.5,19.01 41.5,464.86 36,464.86 36,418.5 31.08,63 31,55 33.5,55"/></clipPath>
 <clipPath id="finish-calc-cutout-exterior-cold" clipPathUnits="userSpaceOnUse"><polygon points="41.5,19.01 309.5,19.01 309.5,304.8 303.7,304.8 303.7,464.86 41.5,464.86"/><polygon points="33.5,19.01 41.5,19.01 41.5,464.86 36,464.86 36,418.5 31.08,63 31,55 33.5,55"/></clipPath>
 <clipPath id="finish-calc-canopy-warm" clipPathUnits="userSpaceOnUse">
 <polygon points="292.95,91.17 272,115.97 271.68,266.74 292.95,274.79"/>
 <polygon points="261.04,123.38 249.76,136.91 249.12,257.4 261.04,261.26"/>
 <polygon points="242.67,145.29 235.58,154.95 235.58,250.95 242.67,253.21"/>
 </clipPath>
 <clipPath id="finish-calc-canopy-cold" clipPathUnits="userSpaceOnUse">${coldPanes}</clipPath>
 <clipPath id="finish-calc-canopy-opening" clipPathUnits="userSpaceOnUse"><polygon points="297,78 232,142 232,256.5 297,291.5"/></clipPath>
 <linearGradient id="finish-calc-canopy-metal" x1="309.5" y1="54.5" x2="352" y2="63.5" gradientUnits="userSpaceOnUse"><stop stop-color="#aeb8be"/><stop offset=".35" stop-color="#dce2e5"/><stop offset=".78" stop-color="#d2d9de"/><stop offset="1" stop-color="#adb8bf"/></linearGradient>
 <linearGradient id="finish-calc-canopy-end" x1="309.5" y1="54.5" x2="352" y2="64.9" gradientUnits="userSpaceOnUse"><stop stop-color="#a4adb2"/><stop offset=".45" stop-color="#edf0f1"/><stop offset="1" stop-color="#929fa7"/></linearGradient>
 </defs>
 <style>
 .finishing-calculator:has([name="exterior-enabled"]:checked) .finish-calc-scene>foreignObject{clip-path:url(#finish-calc-cutout-exterior)}
 .finishing-calculator:has([name="exterior-enabled"]:checked):has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) .finish-calc-scene>foreignObject{clip-path:url(#finish-calc-cutout-exterior-cold)}
 .finish-calc-canopy-through-glass{clip-path:url(#finish-calc-canopy-warm);opacity:.92}
 .finishing-calculator:has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) .finish-calc-canopy-through-glass{clip-path:url(#finish-calc-canopy-cold)}
 .finishing-calculator:has([name="glazing-enabled"]:not(:checked)) .finish-calc-canopy-through-glass{clip-path:url(#finish-calc-canopy-opening);opacity:1}
 .finishing-calculator [data-calc-warm-window]{display:none}
 .finishing-calculator[data-warm-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="warm"]:checked) [data-calc-warm-window]{display:block}
 .finishing-calculator[data-warm-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="warm"]:checked) #finish-calc-canopy,
 .finishing-calculator[data-warm-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="warm"]:checked) .finish-calc-canopy-fixing,
 .finishing-calculator[data-warm-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="warm"]:checked) .finish-calc-canopy-through-glass{display:none}
 .finishing-calculator [data-calc-cold-window]{display:none}
 .finishing-calculator[data-cold-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) [data-calc-cold-window]{display:block}
 .finishing-calculator[data-cold-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) #finish-calc-canopy,
 .finishing-calculator[data-cold-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) .finish-calc-canopy-fixing,
 .finishing-calculator[data-cold-window-ready]:has([name="glazing-enabled"]:checked):has([name="glazing"][value="cold"]:checked) .finish-calc-canopy-through-glass{display:none}
 </style>
 <g id="finish-calc-canopy" data-calc-canopy aria-hidden="true" pointer-events="none">
 <path d="M${point(houseNear)} ${point(innerNear)} ${point(innerFar)} ${point(houseFar)}Z" fill="#c6cdd0"/>
 <path d="M${point(innerNear)} ${point(outerNear)} ${point(outerFar)} ${point(innerFar)}Z" fill="url(#finish-calc-canopy-metal)"/>
 <g fill="none" stroke="#89949b30" stroke-width=".28">${roofRibs}</g>
 <path d="M${point(outerNear)} ${point(outerFar)} ${point(lower(outerFar,farScale))} ${point(lower(outerNear))}Z" fill="#939fa7"/>
 <path d="M${point(innerNear)} ${point(outerNear)} ${point(lower(outerNear))} ${point(lower(innerNear))}Z" fill="url(#finish-calc-canopy-end)"/>
 <path d="M${point(innerNear)} ${point(outerNear)} ${point(outerFar)}" fill="none" stroke="#f2f5f6" stroke-width=".55"/>
 <path d="M${point(lower(innerNear))} ${point(lower(outerNear))} ${point(lower(outerFar,farScale))}" fill="none" stroke="#7b8a94" stroke-width=".4"/>
 <path d="M318.8 57.6 321.9 58.6" fill="none" stroke="#59676b70" stroke-width=".7"/>
 </g>
 <foreignObject x="0" y="0" width="340" height="480" clip-path="url(#finish-calc-cutout)"><div xmlns="http://www.w3.org/1999/xhtml" class="finish-calc-raster-wrap"><img data-calc-fallback class="finish-calc-raster finish-calc-fallback" src="/assets/calculator-realistic-v1/balcony-apartment-v4.webp" width="340" height="480" alt="Балкон в разрезе: наружное остекление справа, дверь и окно в квартиру слева"><canvas data-calc-canvas class="finish-calc-raster" width="1020" height="1440" hidden></canvas></div></foreignObject>
 <g class="finish-calc-canopy-fixing" aria-hidden="true" pointer-events="none">
 <path d="M${point(houseNear)} ${point(innerNear)} ${point(lower(innerNear))} ${point(lower(houseNear))}Z" fill="#b3bec2"/>
 <path d="M${point(houseNear)} ${point(innerNear)}" fill="none" stroke="#edf1f2" stroke-width=".45"/>
 <path d="M${point(lower(houseNear))} ${point(lower(innerNear))}" fill="none" stroke="#6d7c8459" stroke-width=".35"/>
 </g>
 <g class="finish-calc-canopy-through-glass" aria-hidden="true" pointer-events="none"><use href="#finish-calc-canopy"/></g>
 <image data-calc-warm-window x="0" y="0" width="356" height="480" aria-hidden="true" pointer-events="none"/>
 <image data-calc-cold-window x="0" y="0" width="356" height="480" aria-hidden="true" pointer-events="none"/>
 </svg></div>`;
}

export function finishingCalculator(prices, wallRates) {
 return `<section class="section container finishing-calculator" id="finishing-calculator" data-finishing-calculator data-rates='${JSON.stringify({...prices,walls:wallRates})}' aria-labelledby="finishing-calculator-title">
 <div class="section-heading"><div><p class="eyebrow">ВАШ БАЛКОН — ВАШ ВЫБОР</p><h2 id="finishing-calculator-title"><span>Калькулятор:</span> рассчитайте стоимость отделки онлайн</h2></div></div>
 <p class="finish-calc-intro">Укажите размеры, выберите материалы и посмотрите предварительную стоимость работ.</p>
 <div class="finish-calc-layout"><div class="finish-calc-controls">
 <form data-calc-controls>
 <div class="finish-calc-topline"><p class="finish-calc-gift">Сделайте расчёт и получите подарок <span aria-hidden="true">🎁</span></p><div class="finish-calc-dimensions">${[['length','Длина, см',200,100,1200],['width','Ширина, см',70,50,400]].map(([name,label,value,min,max])=>`<label>${label}<input name="${name}" type="number" inputmode="decimal" value="${value}" min="${min}" max="${max}" step="1" required></label>`).join('')}</div></div>
 <p class="finish-calc-validation" data-calc-error role="status"></p>
 <div class="finish-calc-groups">
 ${group('walls','Отделка стен','laminate',true,wallRates)}
 ${group('ceiling','Отделка потолка','pvc',true)}
 ${group('floor','Отделка пола','laminate',true)}
 ${group('exterior','Наружная отделка','siding',false)}
 ${group('lighting','Освещение','spots',false)}
 ${group('glazing','Остекление','warm',true,{cold:prices.cold,warm:prices.warm})}
 ${group('insulation','Утепление','yes',true)}
 <div class="finish-calc-result"><div class="finish-calc-price"><span class="finish-calc-result-label" data-calc-from>от</span><output data-calc-total>—</output></div><button class="button" type="button" data-calc-request>Получить расчёт <span aria-hidden="true">→</span></button></div>
 </div></form>
 <noscript><p>Для интерактивного расчёта включите JavaScript или позвоните: <a href="tel:+74951653905">+7 (495) 165-39-05</a>.</p></noscript>
 </div><figure class="finish-calc-preview">${scene()}</figure></div>
 <dialog class="application-modal" id="finishing-calc-modal" aria-labelledby="finishing-calc-modal-title"><div class="application-modal-shell"><button class="application-close" type="button" data-calc-close aria-label="Закрыть форму">×</button><div class="application-modal-copy"><p class="eyebrow">РАСЧЁТ ВАШЕГО ПРОЕКТА</p><h2 id="finishing-calc-modal-title">Уточним стоимость</h2><p>Уточним смету по вашим размерам и материалам.</p><div class="finish-calc-summary" data-calc-summary><div class="finish-calc-overview"><p class="finish-calc-overview-size"><strong>Размеры:</strong> <span data-calc-summary-size></span></p><p class="finish-calc-overview-total"><span>Предварительно</span><strong data-calc-summary-total></strong></p></div><details class="finish-calc-details" data-calc-details><summary>Материалы и расчёт</summary><div class="finish-calc-details-body"><dl class="finish-calc-attributes" data-calc-summary-materials></dl><div class="finish-calc-breakdown" data-calc-summary-breakdown></div><p class="finish-calc-note" data-calc-summary-extra></p><p class="finish-calc-note">Для расчёта приняты: высота 250 см, остекление 140 см. Периметр остекления — длина и две ширины.</p><p class="finish-calc-note">Площадь стен без вычета квартирных проёмов. Итог уточняется после замера.</p></div></details></div></div><form class="contact-form application-form" data-calc-lead data-lead-form="callback" novalidate>CALCULATOR_CONTACT_FIELDS<input type="hidden" name="calculation"><p class="form-error" role="alert"></p><button class="button" type="submit">Получить расчёт</button><p class="contact-note">Перезвоним в рабочее время, с 9:00 до 21:00.</p></form></div></dialog>
 </section>`;
}
