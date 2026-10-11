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
 // The narrow exterior drip edge attaches below the slab, beyond the window frame.
 return `<div class="finish-calc-scene-wrap"><svg class="finish-calc-scene" viewBox="16 18 308 448" role="img" aria-label="Выбранная отделка балкона с козырьком: остекление справа, дверь и окно в квартиру слева"><defs><clipPath id="finish-calc-cutout" clipPathUnits="userSpaceOnUse"><polygon points="314.86,19.01 315.18,44.46 321.31,45.42 321.31,54.44 309.5,69.91 309.5,292.51 313.90,296.70 313.57,415.57 322.60,430.39 322.60,439.41 318.73,439.73 318.73,464.86 21.91,464.86 21.91,439.73 18.37,439.09 18.05,429.74 27.07,415.57 27.07,296.05 31.26,292.51 31.91,288.32 31.58,69.58 19.01,54.77 19.01,45.10 25.78,44.46 25.78,19.01"/></clipPath><linearGradient id="finish-calc-canopy-metal" x1="318" y1="58" x2="234" y2="139" gradientUnits="userSpaceOnUse"><stop stop-color="#e9eded"/><stop offset=".35" stop-color="#bbc3c3"/><stop offset=".7" stop-color="#edf0ef"/><stop offset="1" stop-color="#a9b2b1"/></linearGradient><linearGradient id="finish-calc-canopy-fold" x1="309.5" y1="55" x2="317.5" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#f4f6f6"/><stop offset=".6" stop-color="#d3d8d8"/><stop offset="1" stop-color="#aab2b2"/></linearGradient></defs><foreignObject x="0" y="0" width="340" height="480" clip-path="url(#finish-calc-cutout)"><div xmlns="http://www.w3.org/1999/xhtml" class="finish-calc-raster-wrap"><img data-calc-fallback class="finish-calc-raster finish-calc-fallback" src="/assets/calculator-realistic-v1/balcony-apartment-v4.webp" width="340" height="480" alt="Балкон в разрезе: наружное остекление справа, дверь и окно в квартиру слева"><canvas data-calc-canvas class="finish-calc-raster" width="1020" height="1440" hidden></canvas></div></foreignObject><g data-calc-canopy aria-hidden="true"><path d="M309.5 56 234 137.5 239 141.2 317.5 60.7 317.5 58 309.5 55Z" fill="#3e4645" fill-opacity=".16"/><path d="M309.5 55 317.5 58 239 139.5 234 136.5Z" fill="url(#finish-calc-canopy-metal)"/><path d="M317.5 58 239 139.5 239 141 317.5 59.5Z" fill="#9ca5a5"/><path d="M309.5 55 317.5 58 317.5 59.5 309.5 56.5Z" fill="url(#finish-calc-canopy-fold)"/><path d="M309.5 55 234 136.5M317.5 58 239 139.5" fill="none" stroke="#f8faf9" stroke-width=".5"/><path d="M239 141 234 138" fill="none" stroke="#66716f" stroke-width=".55"/></g></svg></div>`;
}
export function finishingCalculator(prices, wallRates) {
 return `<section class="section container finishing-calculator" id="finishing-calculator" data-finishing-calculator data-rates='${JSON.stringify({...prices,walls:wallRates})}' aria-labelledby="finishing-calculator-title">
 <div class="section-heading"><div><p class="eyebrow">ВАШ БАЛКОН — ВАШ ВЫБОР</p><h2 id="finishing-calculator-title"><span>Калькулятор:</span> рассчитайте стоимость отделки онлайн</h2></div></div>
 <p class="finish-calc-intro">Укажите размеры, выберите материалы и посмотрите предварительную стоимость работ.</p>
 <div class="finish-calc-layout"><div class="finish-calc-controls">
 <form data-calc-controls>
 <div class="finish-calc-topline"><p class="finish-calc-gift">Сделайте расчёт и получите подарок <span aria-hidden="true">🎁</span></p><div class="finish-calc-dimensions">${[['length','Длина, см',300,100,1200],['width','Ширина, см',70,50,400]].map(([name,label,value,min,max])=>`<label>${label}<input name="${name}" type="number" inputmode="decimal" value="${value}" min="${min}" max="${max}" step="1" required></label>`).join('')}</div></div>
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
