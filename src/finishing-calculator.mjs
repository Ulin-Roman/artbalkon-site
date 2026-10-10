// Rates come from the site's existing public price list.
const format = value => value.toLocaleString('ru-RU');
const choices = {
 walls: [['pvc','ПВХ-панели'],['laminate','Ламинат'],['lining','Вагонка'],['parquet','Стеновой паркет']],
 ceiling: [['pvc','ПВХ-панели'],['stretch','Натяжной'],['laminate','Ламинат'],['lining','Вагонка']],
 floor: [['linoleum','Линолеум'],['laminate','Ламинат'],['vinyl','Кварцвинил'],['tile','Плитка']],
 exterior: [['siding','Сайдинг'],['metal','Профлист']],
 glazing: [['cold','Холодное'],['warm','Тёплое']],
 insulation: [['yes','Да'],['no','Нет']],
 lighting: [['spots','Точечное'],['pendant','Подвесное']]
};
function group(key, title, selected, enabled, rates) {
 const toggle = key === 'insulation' ? '' : `<label class="finish-calc-switch"><input type="checkbox" name="${key}-enabled" ${enabled?'checked':''} aria-label="Включить: ${title.toLowerCase()}"><span aria-hidden="true"></span></label>`;
 return `<fieldset class="finish-calc-group" data-calc-group="${key}"><legend>${title}</legend><div class="finish-calc-group-head" aria-hidden="true">${title}</div>${toggle}<div class="finish-calc-options">${choices[key].map(([value,label])=>`<label class="finish-calc-option"><input type="radio" name="${key}" value="${value}" ${value===selected?'checked':''} ${!enabled&&key!=='insulation'?'disabled':''}><span class="finish-calc-swatch" data-swatch="${value}" aria-hidden="true">${key==='glazing'?'▥':key==='lighting'?(value==='spots'?'◉':'▱'):key==='insulation'?(value==='yes'?'◈':'—'):''}</span><span>${label}</span>${rates?.[value]?`<small>от ${format(rates[value])} ₽/м²</small>`:''}</label>`).join('')}</div></fieldset>`;
}
function scene() {
 return `<svg class="finish-calc-scene" viewBox="0 0 340 480" role="img" aria-label="Условная схема балкона с выбранной отделкой" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <pattern id="calc-laminate" width="48" height="68" patternUnits="userSpaceOnUse"><rect width="48" height="68" fill="#c6a47e"/><path d="M0 0H48M0 34H48M24 0V34M12 34V68M4 4L20 30M30 38L43 63" stroke="#b48c61" stroke-width="1.2"/></pattern>
 <pattern id="calc-lining" width="18" height="80" patternUnits="userSpaceOnUse"><rect width="18" height="80" fill="#d9bb95"/><path d="M1 0V80M5 0V80M13 0V80" stroke="#c1a077" stroke-width="1"/></pattern>
 <pattern id="calc-parquet" width="36" height="72" patternUnits="userSpaceOnUse"><rect width="36" height="72" fill="#b88b62"/><path d="M0 0L36 36L0 72M0 36L36 72M0-36L36 0" fill="none" stroke="#e3c5a4" stroke-width="2"/></pattern>
 <pattern id="calc-pvc" width="21" height="50" patternUnits="userSpaceOnUse"><rect width="21" height="50" fill="#f0ede5"/><path d="M1 0V50" stroke="#cfcbbf" stroke-width="1"/></pattern>
 <pattern id="calc-tile" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#d4d7d5"/><path d="M0 0H40V40" fill="none" stroke="#f7f7f4" stroke-width="2"/></pattern>
 <linearGradient id="calc-glass" x2="1" y2="1"><stop stop-color="#d4e6ea" stop-opacity=".85"/><stop offset="1" stop-color="#f6fbfc" stop-opacity=".6"/></linearGradient>
 </defs>
 <ellipse cx="170" cy="445" rx="145" ry="16" fill="#dce0d9"/>
 <path d="M22 54L111 103H229L318 54V429L228 376H112L22 429Z" fill="#e7e5df" stroke="#c5c9c3" stroke-width="2"/>
 <path data-calc-surface="walls" d="M111 103H229V376H111Z" fill="url(#calc-laminate)"/>
 <path data-calc-surface="walls" d="M22 54L111 103V376L22 429Z" fill="url(#calc-laminate)"/>
 <path data-calc-surface="walls" d="M229 103L318 54V429L229 376Z" fill="url(#calc-laminate)"/>
 <path data-calc-surface="ceiling" d="M22 54H318L229 103H111Z" fill="url(#calc-pvc)" stroke="#d0c9ba"/>
 <path data-calc-surface="floor" d="M111 376H229L318 429H22Z" fill="url(#calc-laminate)" stroke="#c1b29c"/>
 <g data-calc-windows>
 <path d="M28 72L103 111V284L28 327ZM237 111L312 72V327L237 284Z" fill="url(#calc-glass)" stroke="#fafbf7" stroke-width="8"/>
 <path d="M67 92V304M273 92V304" stroke="#fafbf7" stroke-width="5"/>
 <path d="M27 328L104 284M236 284L313 328" stroke="#fafbf7" stroke-width="9"/>
 <path d="M61 184V204M266 184V204" stroke="#6f807d" stroke-width="3" stroke-linecap="round"/>
 </g>
 <g data-calc-loggia hidden><path d="M28 72L103 111V284L28 327ZM237 111L312 72V327L237 284Z" data-calc-surface="walls" fill="url(#calc-laminate)"/></g>
 <path d="M133 143H209V354H133Z" fill="#e9e5dc" stroke="#fafbf7" stroke-width="5"/>
 <path d="M139 150H202V259H139Z" fill="url(#calc-glass)" stroke="#fafbf7" stroke-width="3"/>
 <path d="M201 273V287" stroke="#8b918c" stroke-width="3" stroke-linecap="round"/>
 <g data-calc-light="spots" hidden><ellipse cx="104" cy="71" rx="9" ry="4" fill="#fff8d5" stroke="#ccc9bc"/><ellipse cx="172" cy="83" rx="8" ry="4" fill="#fff8d5" stroke="#ccc9bc"/><ellipse cx="239" cy="71" rx="9" ry="4" fill="#fff8d5" stroke="#ccc9bc"/></g>
 <g data-calc-light="pendant" hidden><path d="M171 84V114" stroke="#555e58" stroke-width="2"/><path d="M157 113H185L193 130H149Z" fill="#707e74"/><ellipse cx="171" cy="130" rx="21" ry="3" fill="#fff4c7"/></g>
 <path data-calc-insulation d="M24 432H316" stroke="#d7aa56" stroke-width="7"/>
 <path data-calc-exterior d="M24 440H316" stroke="#a0a99f" stroke-width="5" hidden/>
 </svg>`;
}
export function finishingCalculator(prices, wallRates) {
 return `<section class="section container finishing-calculator" id="finishing-calculator" data-finishing-calculator data-rates='${JSON.stringify({...prices,walls:wallRates})}' aria-labelledby="finishing-calculator-title">
 <div class="section-heading"><div><p class="eyebrow">ВАШ БАЛКОН — ВАШ ВЫБОР</p><h2 id="finishing-calculator-title"><span>Калькулятор:</span> рассчитайте стоимость отделки онлайн</h2></div></div>
 <p class="finish-calc-intro">Укажите размеры, выберите материалы и посмотрите предварительную стоимость работ.</p>
 <div class="finish-calc-layout"><div class="finish-calc-controls">
 <form data-calc-controls>
 <div class="finish-calc-dimensions"><label>Объект<select name="object"><option value="balcony">Балкон</option><option value="loggia">Лоджия</option></select></label>${[['length','Длина, см',300,100,1200],['width','Ширина, см',100,50,400],['height','Высота, см',250,180,350],['windowHeight','Высота окон, см',140,50,250]].map(([name,label,value,min,max])=>`<label>${label}<input name="${name}" type="number" inputmode="decimal" value="${value}" min="${min}" max="${max}" step="1" required></label>`).join('')}</div>
 <p class="finish-calc-validation" data-calc-error role="status"></p>
 <div class="finish-calc-groups">
 ${group('walls','Отделка стен','laminate',true,wallRates)}
 ${group('exterior','Наружная отделка','siding',false)}
 ${group('lighting','Освещение','spots',false)}
 ${group('ceiling','Отделка потолка','pvc',true)}
 ${group('glazing','Остекление','warm',true,{cold:prices.cold,warm:prices.warm})}
 ${group('insulation','Утепление','yes',true)}
 ${group('floor','Отделка пола','laminate',true)}
 <div class="finish-calc-result"><span class="finish-calc-result-label">Предварительно, от</span><output data-calc-total>—</output><p data-calc-additions>Дополнительные работы — по замеру</p><button class="button" type="button" data-calc-request>Получить точный расчёт <span aria-hidden="true">↗</span></button></div>
 </div></form>
 <details class="finish-calc-breakdown"><summary>Что входит в расчёт</summary><div data-calc-breakdown></div><p>Площадь стен рассчитана без вычета проёмов со стороны квартиры. Пол, потолок, наружная отделка и освещение считаются отдельно после замера. Итог зависит от основания, материалов и комплектации.</p></details>
 <noscript><p>Для интерактивного расчёта включите JavaScript или позвоните: <a href="tel:+74951653905">+7 (495) 165-39-05</a>.</p></noscript>
 </div><figure class="finish-calc-preview"><div class="finish-calc-preview-head"><span>Ваш вариант отделки</span><span data-calc-area>3 м²</span></div>${scene()}<figcaption>Схема для выбора материалов</figcaption></figure></div>
 <dialog class="application-modal" id="finishing-calc-modal" aria-labelledby="finishing-calc-modal-title"><div class="application-modal-shell"><button class="application-close" type="button" data-calc-close aria-label="Закрыть форму">×</button><div class="application-modal-copy"><p class="eyebrow">РАСЧЁТ ВАШЕГО ПРОЕКТА</p><h2 id="finishing-calc-modal-title">Уточним стоимость</h2><p>Менеджер получит выбранные размеры и материалы и поможет составить точную смету.</p><p class="finish-calc-summary" data-calc-summary></p></div><form class="contact-form application-form" data-calc-lead data-lead-form="callback" novalidate>CALCULATOR_CONTACT_FIELDS<input type="hidden" name="calculation"><p class="form-error" role="alert"></p><button class="button" type="submit">Получить расчёт</button><p class="contact-note">Перезвоним в рабочее время, с 9:00 до 21:00.</p></form></div></dialog>
 </section>`;
}
