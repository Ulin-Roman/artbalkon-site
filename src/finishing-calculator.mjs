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
 const textures={laminate:'moisture-resistant-laminate',lining:'lining-and-wall-parquet',parquet:'lining-and-wall-parquet',pvc:'pvc-panels'};
 const sideWindows='M46 86L107 146V264L46 307Z';
 return `<svg class="finish-calc-scene" viewBox="0 0 340 480" role="img" aria-label="Объёмная визуализация балкона с выбранной отделкой и срезами бетонных плит" xmlns="http://www.w3.org/2000/svg">
 <defs>
 ${Object.entries(textures).map(([key,file])=>`<pattern id="calc-${key}" width="60" height="90" patternUnits="userSpaceOnUse"><svg width="60" height="90" viewBox="${({laminate:'90 40 180 260',lining:'65 75 230 450',parquet:'355 70 220 450',pvc:'90 10 420 430'})[key]}" preserveAspectRatio="none"><image href="/assets/finishing-materials/${file}.jpg" width="640" height="640"/></svg></pattern>`).join('')}
 <pattern id="calc-tile" width="38" height="38" patternUnits="userSpaceOnUse"><rect width="38" height="38" fill="#c7ccc8"/><path d="M0 0H38V38" fill="none" stroke="#f6f6f2" stroke-width="1.5"/></pattern>
 <linearGradient id="calc-depth"><stop stop-color="#444c43" stop-opacity=".34"/><stop offset=".18" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#444c43" stop-opacity=".3"/></linearGradient>
 <linearGradient id="calc-floor-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#24251e" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="calc-open-sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b8d9ed"/><stop offset=".65" stop-color="#eff5ed"/><stop offset="1" stop-color="#b7c4a1"/></linearGradient>
 <radialGradient id="calc-lamp-glow"><stop stop-color="#fff6d3" stop-opacity=".85"/><stop offset="1" stop-color="#fff6d3" stop-opacity="0"/></radialGradient>
 </defs>
 <image href="/assets/calculator-realistic-v1/balcony-house-wall.webp" width="340" height="480" preserveAspectRatio="xMidYMid meet"/>
 <g class="finish-calc-materials">
 <path data-calc-surface="walls" d="M109 141H232V316H113Z"/>
 <path data-calc-surface="walls" d="M47 310L114 279V317L47 425Z"/>
 <path data-calc-surface="walls" d="M233 140L293 62V424L231 317Z"/>
 <path data-calc-surface="ceiling" d="M45 57H297L231 138H109Z"/>
 <path data-calc-surface="floor" d="M114 324H226L290 425H49Z"/>
 </g>
 <path d="M109 141H232V316H113Z" fill="url(#calc-depth)"/>
 <path d="M114 324H226L290 425H49Z" fill="url(#calc-floor-shade)" opacity=".45"/>
 <g data-calc-windows><path class="finish-calc-frame-tint" d="M43 79L108 143V268L43 310" fill="none" stroke="#fafbf7" stroke-width="1.2" opacity=".3"/></g>
 <g data-calc-open-windows hidden><path d="${sideWindows}" fill="url(#calc-open-sky)"/><path d="M46 307L107 264" stroke="#eeeae1" stroke-width="3"/></g>
 <g data-calc-light="spots" hidden>${[[119,98,4.5],[170,81,6],[220,98,4.5]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r*5}" ry="${r*3}" fill="url(#calc-lamp-glow)"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.38}" fill="#6a6c63"/><ellipse cx="${x}" cy="${y-.3}" rx="${r*.75}" ry="${r*.26}" fill="#fff5c5"/>`).join('')}</g>
 <g data-calc-light="pendant" hidden><path d="M170 89V133" stroke="#333b3c" stroke-width="1.5"/><path d="M161 132H179L184 145H156Z" fill="#424b4c"/><ellipse cx="170" cy="145" rx="14" ry="3" fill="#fff2ba"/><ellipse cx="170" cy="148" rx="35" ry="18" fill="url(#calc-lamp-glow)"/></g>
 <path data-calc-insulation d="M45 428H293" stroke="#cfb47d" stroke-width="2" opacity=".8"/>
 <path data-calc-exterior d="M39 430H301" stroke="#a0a99f" stroke-width="4" hidden/>
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
 </div><figure class="finish-calc-preview"><div class="finish-calc-preview-head"><span>Ваш вариант отделки</span><span data-calc-area>3 м²</span></div>${scene()}<figcaption>Визуализация выбранной отделки</figcaption></figure></div>
 <dialog class="application-modal" id="finishing-calc-modal" aria-labelledby="finishing-calc-modal-title"><div class="application-modal-shell"><button class="application-close" type="button" data-calc-close aria-label="Закрыть форму">×</button><div class="application-modal-copy"><p class="eyebrow">РАСЧЁТ ВАШЕГО ПРОЕКТА</p><h2 id="finishing-calc-modal-title">Уточним стоимость</h2><p>Менеджер получит выбранные размеры и материалы и поможет составить точную смету.</p><p class="finish-calc-summary" data-calc-summary></p></div><form class="contact-form application-form" data-calc-lead data-lead-form="callback" novalidate>CALCULATOR_CONTACT_FIELDS<input type="hidden" name="calculation"><p class="form-error" role="alert"></p><button class="button" type="submit">Получить расчёт</button><p class="contact-note">Перезвоним в рабочее время, с 9:00 до 21:00.</p></form></div></dialog>
 </section>`;
}
