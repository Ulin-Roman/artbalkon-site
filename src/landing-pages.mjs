import {definitions as glazing} from './landing-pages-glazing.mjs';
import {definitions as panels} from './landing-pages-panels.mjs';
import {definitions as wood} from './landing-pages-wood.mjs';

const order=[
 'osteklenie-balkona-s-vynosom','otdelka-balkona-pvh-panelyami',
 'otdelka-balkona-laminatom','otdelka-balkona-vagonkoj',
 'otdelka-balkona-kvarcvinilom','otdelka-balkona-derevom',
 'otdelka-balkona-mdf-panelyami','razdvizhnoe-osteklenie',
 'osteklenie-balkona-v-hrushchevke'
];
export const newLandingDefinitions=Object.freeze([...glazing,...panels,...wood].sort((a,b)=>order.indexOf(a.slug)-order.indexOf(b.slug)));
export const newLandingSlugs=new Set(newLandingDefinitions.map(page=>page.slug));
export const newLandingDisplayTitles=Object.freeze(Object.fromEntries(newLandingDefinitions.flatMap(page=>page.works.map(work=>[work.title,work.displayTitle]))));
export const newLandingCaseIds=Object.freeze(Object.fromEntries(newLandingDefinitions.flatMap(page=>page.works.map(work=>[work.title,String(work.id).startsWith('work-')?String(work.id):'work-'+work.id]))));
export const newGlazingNavigation=[
 ['Остекление с выносом','osteklenie-balkona-s-vynosom'],
 ['Раздвижное остекление','razdvizhnoe-osteklenie'],
 ['Балконы в хрущёвке','osteklenie-balkona-v-hrushchevke']
];
export const newFinishingNavigation=[
 ['ПВХ-панели','otdelka-balkona-pvh-panelyami'],
 ['Ламинат','otdelka-balkona-laminatom'],
 ['Вагонка','otdelka-balkona-vagonkoj'],
 ['Кварцвинил','otdelka-balkona-kvarcvinilom'],
 ['Дерево','otdelka-balkona-derevom'],
 ['МДФ-панели','otdelka-balkona-mdf-panelyami']
];
export const newLandingScopeTitles={
 'osteklenie-balkona-s-vynosom':'Что учитываем при остеклении с выносом',
 'razdvizhnoe-osteklenie':'Как подбираем раздвижное остекление',
 'osteklenie-balkona-v-hrushchevke':'Как остекляем балкон в хрущёвке',
 'otdelka-balkona-pvh-panelyami':'Как выполняем отделку ПВХ-панелями',
 'otdelka-balkona-laminatom':'Как отделываем балкон ламинатом',
 'otdelka-balkona-vagonkoj':'Как отделываем балкон вагонкой',
 'otdelka-balkona-kvarcvinilom':'Как подбираем кварцвинил для балкона',
 'otdelka-balkona-derevom':'Как выполняем отделку балкона деревом',
 'otdelka-balkona-mdf-panelyami':'Как отделываем балкон МДФ-панелями'
};
