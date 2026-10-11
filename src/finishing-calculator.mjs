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
 const innerNear=[310,56],innerFar=[233.5,139],foldNear=[321.5,63.5],foldFar=[242.5,144.5],outerNear=[338,71.5],outerFar=[250.5,149.5];
 const along=(near,far,v)=>near.map((value,i)=>Number((value+(far[i]-value)*v).toFixed(2))).join(' ');
 const roofRibs=Array.from({length:15},(_,i)=>{const v=(i+1)/16;return `<path d="M${along(innerNear,innerFar,v)} ${along(foldNear,foldFar,v)} ${along(outerNear,outerFar,v)}"/>`;}).join('');
 // Keep the sheet outside the interior ceiling. Glazing reveals the exposed
 // front profile; the continuous underside and folded edge stay visible in depth.
 return `<div class="finish-calc-scene-wrap"><svg class="finish-calc-scene" viewBox="16 18 324 448" role="img" aria-label="Выбранная отделка балкона с наружной крышей: остекление справа, дверь и окно в квартиру слева">
 <defs>
 <clipPath id="finish-calc-cutout" clipPathUnits="userSpaceOnUse"><polygon points="314.86,19.01 315.18,44.46 321.31,45.42 321.31,54.44 309.5,69.91 309.5,292.51 313.90,296.70 313.57,415.57 322.60,430.39 322.60,439.41 318.73,439.73 318.73,464.86 21.91,464.86 21.91,439.73 18.37,439.09 18.05,429.74 27.07,415.57 27.07,296.05 31.26,292.51 31.91,288.32 31.58,69.58 19.01,54.77 19.01,45.10 25.78,44.46 25.78,19.01"/></clipPath>
 <clipPath id="finish-calc-cutout-exterior" clipPathUnits="userSpaceOnUse"><polygon points="314.86,19.01 315.18,44.46 321.31,45.42 321.31,54.44 309.5,69.91 309.5,292.51 313.90,296.70 313.57,415.57 322.60,430.39 322.60,439.41 318.73,439.73 318.73,464.86 21.91,464.86 21.91,439.73 18.37,439.09 18.05,429.74 27.07,415.57 27.07,296.05 31.26,292.51 31.91,288.32 31.58,69.58 19.01,54.77 19.01,45.10 25.78,44.46 25.78,19.01"/><rect x="311.9" y="303.3" width="3.6" height="162.5"/></clipPath>
 <mask id="finish-calc-canopy-glazed" maskUnits="userSpaceOnUse" x="16" y="18" width="324" height="448"><rect x="16" y="18" width="324" height="448" fill="white"/><path d="M296.6 63.8 310.4 63.8 310.4 151 296.6 151Z" fill="black"/></mask>
 <linearGradient id="finish-calc-canopy-metal" x1="310" y1="56" x2="248" y2="151" gradientUnits="userSpaceOnUse"><stop stop-color="#e2e3de"/><stop offset=".43" stop-color="#f1f2ed"/><stop offset="1" stop-color="#ccd0ca"/></linearGradient>
 <linearGradient id="finish-calc-canopy-fold" x1="327" y1="74" x2="249" y2="154" gradientUnits="userSpaceOnUse"><stop stop-color="#d3d7d0"/><stop offset=".5" stop-color="#e3e6df"/><stop offset="1" stop-color="#c2c8bd"/></linearGradient>
 <linearGradient id="finish-calc-canopy-end" x1="310" y1="56" x2="338" y2="66" gradientUnits="userSpaceOnUse"><stop stop-color="#b7bdb2"/><stop offset=".5" stop-color="#e8ebe2"/><stop offset="1" stop-color="#9ca795"/></linearGradient>
 </defs>
 <style>.finishing-calculator:has([name="glazing-enabled"]:checked) [data-calc-canopy]{mask:url(#finish-calc-canopy-glazed)}.finishing-calculator:has([name="exterior-enabled"]:checked) .finish-calc-scene>foreignObject{clip-path:url(#finish-calc-cutout-exterior)}</style>
 <foreignObject x="0" y="0" width="340" height="480" clip-path="url(#finish-calc-cutout)"><div xmlns="http://www.w3.org/1999/xhtml" class="finish-calc-raster-wrap"><img data-calc-fallback class="finish-calc-raster finish-calc-fallback" src="/assets/calculator-realistic-v1/balcony-apartment-v4.webp" width="340" height="480" alt="Балкон в разрезе: наружное остекление справа, дверь и окно в квартиру слева"><canvas data-calc-canvas class="finish-calc-raster" width="1020" height="1440" hidden></canvas></div></foreignObject>
 <g data-calc-canopy aria-hidden="true" pointer-events="none">
 <path d="M310 56 321.5 63.5 242.5 144.5 233.5 139Z" fill="url(#finish-calc-canopy-metal)"/>
 <path d="M321.5 63.5 338 71.5 250.5 149.5 242.5 144.5Z" fill="url(#finish-calc-canopy-fold)"/>
 <g fill="none" stroke="#8f99863b" stroke-width=".32">${roofRibs}</g>
 <path d="M321.5 63.5 242.5 144.5" fill="none" stroke="#8f9a86" stroke-opacity=".6" stroke-width=".6"/>
 <path d="M322.05 63.6 242.95 144.25" fill="none" stroke="#fafcf5" stroke-opacity=".8" stroke-width=".55"/>
 <path d="M338 71.5 250.5 149.5 250.5 151.1 338 73.1Z" fill="#a0a79c"/>
 <path d="M310 56 321.5 63.5 338 71.5 338 73.1 321.5 65.1 310 57.6Z" fill="url(#finish-calc-canopy-end)"/>
 <path d="M233.5 139 242.5 144.5 250.5 149.5 250.5 151.1 242.5 146.1 233.5 140.6Z" fill="#a9b39f"/>
 <path d="M310 56 321.5 63.5 338 71.5 250.5 149.5" fill="none" stroke="#f9fbf5" stroke-width=".7"/>
 <path d="M310 57.6 321.5 65.1 338 73.1 250.5 151.1" fill="none" stroke="#8a9483" stroke-width=".5"/>
 <path d="M310 56 233.5 139" fill="none" stroke="#7f8d76" stroke-opacity=".7" stroke-width=".45"/>
 </g></svg></div>`;
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
 <dialog class="application-modal" id="finishing-calc-modal" aria-labelledby="finishing-calc-modal-title"><div class="application-modal-shell"><button class="application-close" type="button" data-calc-close aria-label="Закрыть форму">×</button><div class="application-modal-copy"><p class="eyebrow">РАСЧЁТ ВАШЕГО ПРОЕКТА</p><h2 id="finishing-calc-modal-title">Уточним стоимость</h2><p>Менеджер получит выбранные размеры и материалы и поможет составить точную смету.</p><p class="finish-calc-summary" data-calc-summary></p></div><form class="contact-form application-form" data-calc-lead data-lead-form="callback" novalidate>CALCULATOR_CONTACT_FIELDS<input type="hidden" name="calculation"><p class="form-error" role="alert"></p><button class="button" type="submit">Получить расчёт</button><p class="contact-note">Перезвоним в рабочее время, с 9:00 до 21:00.</p></form></div></dialog>
 </section>`;
}
