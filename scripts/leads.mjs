import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const allowed={
 service:[
  'Остекление','Утепление','Отделка','Под ключ','Балкон под ключ',
  'Холодное остекление','Тёплое остекление','Панорамное остекление','Нужна консультация','Отделка балкона или лоджии','Утепление балкона или лоджии','Объединение с комнатой',
  'Холодное остекление балкона','Тёплое остекление балкона','Панорамное остекление балкона',
  'Холодное остекление лоджии','Тёплое остекление лоджии','Панорамное остекление лоджии','Нужна консультация по остеклению',
  'Утепление балкона','Отделка балкона','Утепление лоджии','Отделка лоджии','Лоджия под ключ',
  'Крыша над балконом','Мебель для балкона','Мебель для балконов и лоджий','Электрика на балконе','Объединение балкона с комнатой','Остекление коттеджа или дома',
  'Утепление и отделка','Остекление и утепление'
 ],
 object:['Балкон','Лоджия','Панорамный балкон','Коттедж или дом','Терраса или веранда','Беседка','Другое','Не знаю'],
 timing:['Как можно скорее','В течение недели','В течение месяца','Через 2–3 месяца','Пока выбираю','Пока интересуюсь'],
 gift:['Потолочная сушилка','Светильник и розетки','Тёплый пол']
};
const locks=new Map();
export function validateLead(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Некорректная заявка.');
 if(input.website)throw Error('Не удалось отправить заявку. Позвоните нам.');
 if(input.consent!==true)throw Error('Нужно согласие на обработку персональных данных.');
 if(!['quiz','contact','callback','transformation'].includes(input.form))throw Error('Неизвестная форма.');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>70)throw Error('Укажите имя.');
 if(typeof input.phone!=='string'||input.phone.length>30)throw Error('Проверьте номер телефона.');
 let phone=input.phone.replace(/\D/g,'');if(phone.length===10)phone='7'+phone;
 if(!/^[78]\d{10}$/.test(phone)||/^(\d)\1{9}$/.test(phone.slice(1)))throw Error('Проверьте номер телефона.');phone='+7'+phone.slice(1);
 if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId))throw Error('Обновите страницу и попробуйте ещё раз.');
 const lead={requestId:input.requestId,name:input.name.trim(),phone,form:input.form,consent:true,consentVersion:'2026-09-16',page:typeof input.page==='string'?input.page.slice(0,500):'/',attribution:{}};
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid','landing','referrer'])if(typeof input.attribution?.[key]==='string')lead.attribution[key]=input.attribution[key].slice(0,300);
 if(input.calculation!==undefined){
  if(input.form!=='callback'||typeof input.calculation!=='string'||!input.calculation.trim()||input.calculation.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.calculation))throw Error('Некорректные параметры расчёта.');
  lead.calculation=input.calculation.trim();
 }
 if(input.form==='transformation'){
  if(typeof input.project!=='string'||!input.project.trim()||input.project.length>300)throw Error('Выберите работу для заявки.');
  lead.project=input.project.trim();
 }
 if(input.form==='quiz'){
  for(const key of ['service','object','timing']){if(!allowed[key].includes(input[key]))throw Error('Ответьте на все вопросы расчёта.');lead[key]=input[key];}
  if(input.gift!==undefined){if(!allowed.gift.includes(input.gift))throw Error('Некорректный подарок.');lead.gift=input.gift;}
  if(input.size!==undefined){if(typeof input.size!=='string'||!input.size.trim()||input.size.length>100)throw Error('Укажите примерный размер.');lead.size=input.size.trim();}
  if(input.detail!==undefined){if(typeof input.detail!=='string'||!input.detail.trim()||input.detail.length>150)throw Error('Уточните выбранный вариант.');lead.detail=input.detail.trim();}
 }
 return lead;
}
export async function saveLead(input,{directory='data/leads',mode='preview',deliver}={}){
 const lead=validateLead(input),key=resolve(directory,lead.requestId+'.json');
 const fingerprint=createHash('sha256').update(JSON.stringify(lead)).digest('hex');
 if(locks.has(key)){await locks.get(key);return saveLead(input,{directory,mode,deliver});}
 const task=(async()=>{
  await mkdir(directory,{recursive:true});let record;
  try{record=JSON.parse(await readFile(key,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(record&&record.fingerprint!==fingerprint)throw Error('Эта заявка уже обработана. Обновите страницу для нового расчёта.');
  const write=async()=>{const temp=key+'.tmp';await writeFile(temp,JSON.stringify(record,null,2),{mode:0o600});await rename(temp,key);};
  if(!record){record={...lead,fingerprint,createdAt:new Date().toISOString(),status:mode==='preview'?'preview':'pending'};await write();}
  if(mode==='live'&&record.status!=='delivered'){
   if(!deliver)throw Error('Отправка заявок временно недоступна. Позвоните нам.');
   await deliver(lead);record.status='delivered';record.deliveredAt=new Date().toISOString();await write();
  }
  return {ok:true,id:lead.requestId,mode};
 })();locks.set(key,task);try{return await task;}finally{locks.delete(key);}
}
