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
 // Both roof edges converge with the ceiling. The sheet is outside the window
 // and behind the cutaway, so the intact frame supplies its own occlusion.
 const innerNear=[297,64],innerFar=[231.5,140],outerNear=[338,77.2],outerFar=[249.7,146];
 const along=(near,far,v)=>near.map((value,i)=>Number((value+(far[i]-value)*v).toFixed(2))).join(' ');
 const roofRibs=Array.from({length:15},(_,i)=>{const v=(i+1)/16;return `<path d="M${along(innerNear,innerFar,v)} ${along(outerNear,outerFar,v)}"/>`;}).join('');
 return `<div class="finish-calc-scene-wrap"><svg class="finish-calc-scene" viewBox="16 18 324 448" role="img" aria-label="Выбранная отделка балкона с наружной крышей: остекление справа, дверь и окно в квартиру слева">
 <defs>
 <clipPath id="finish-calc-cutout" clipPathUnits="userSpaceOnUse"><polygon points="41.5,19.01 314.86,19.01 315.18,44.46 321.31,45.42 321.31,54.44 309.5,69.91 309.5,292.51 313.90,296.70 313.57,415.57 322.60,430.39 322.60,439.41 318.73,439.73 318.73,464.86 41.5,464.86"/></clipPath>
 <clipPath id="finish-calc-cutout-exterior" clipPathUnits="userSpaceOnUse"><polygon points="41.5,19.01 314.86,19.01 315.18,44.46 321.31,45.42 321.31,54.44 309.5,69.91 309.5,292.51 313.90,296.70 313.57,415.57 322.60,430.39 322.60,439.41 318.73,439.73 318.73,464.86 41.5,464.86"/><rect x="311.9" y="303.3" width="3.6" height="162.5"/></clipPath>
 <linearGradient id="finish-calc-canopy-metal" x1="297" y1="64" x2="338" y2="77.2" gradientUnits="userSpaceOnUse"><stop stop-color="#c3cbd0"/><stop offset=".35" stop-color="#e1e5e8"/><stop offset=".78" stop-color="#d6dce0"/><stop offset="1" stop-color="#afb9c0"/></linearGradient>
 <linearGradient id="finish-calc-canopy-end" x1="297" y1="64" x2="338" y2="78.6" gradientUnits="userSpaceOnUse"><stop stop-color="#cbd0d4"/><stop offset=".45" stop-color="#f6f7f8"/><stop offset="1" stop-color="#a4adb3"/></linearGradient>
 </defs>
 <style>.finishing-calculator:has([name="exterior-enabled"]:checked) .finish-calc-scene>foreignObject{clip-path:url(#finish-calc-cutout-exterior)}</style>
 <g data-calc-canopy aria-hidden="true" pointer-events="none">
 <path d="M297 64 338 77.2 249.7 146 231.5 140Z" fill="url(#finish-calc-canopy-metal)"/>
 <g fill="none" stroke="#89949b30" stroke-width=".28">${roofRibs}</g>
 <path d="M338 77.2 249.7 146 249.7 146.6 338 78.6Z" fill="#a6b0b7"/>
 <path d="M297 64 338 77.2 338 78.6 297 65.4Z" fill="url(#finish-calc-canopy-end)"/>
 <path d="M231.5 140 249.7 146 249.7 146.6 231.5 140.6Z" fill="#b6bfc5"/>
 <path d="M297 64 338 77.2 249.7 146" fill="none" stroke="#ffffff" stroke-width=".65"/>
 <path d="M297 65.4 338 78.6 249.7 146.6" fill="none" stroke="#88959e" stroke-width=".4"/>
 </g>
 <foreignObject x="0" y="0" width="340" height="480" clip-path="url(#finish-calc-cutout)"><div xmlns="http://www.w3.org/1999/xhtml" class="finish-calc-raster-wrap"><img data-calc-fallback class="finish-calc-raster finish-calc-fallback" src="/assets/calculator-realistic-v1/balcony-apartment-v4.webp" width="340" height="480" alt="Балкон в разрезе: наружное остекление справа, дверь и окно в квартиру слева"><canvas data-calc-canvas class="finish-calc-raster" width="1020" height="1440" hidden></canvas></div></foreignObject>
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
