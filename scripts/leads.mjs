import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const allowed={service:['Остекление','Утепление','Отделка','Балкон под ключ'],object:['Балкон','Лоджия','Панорамный балкон','Другое'],timing:['Как можно скорее','В течение месяца','Через 2–3 месяца','Пока выбираю']};
const locks=new Map();
export function validateLead(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Некорректная заявка.');
 if(input.website)throw Error('Не удалось отправить заявку. Позвоните нам.');
 if(input.consent!==true)throw Error('Нужно согласие на обработку персональных данных.');
 if(!['quiz','contact'].includes(input.form))throw Error('Неизвестная форма.');
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>70)throw Error('Укажите имя.');
 if(typeof input.phone!=='string'||input.phone.length>30)throw Error('Проверьте номер телефона.');
 let phone=input.phone.replace(/\D/g,'');if(phone.length===10)phone='7'+phone;
 if(!/^[78]\d{10}$/.test(phone))throw Error('Проверьте номер телефона.');phone='+7'+phone.slice(1);
 if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId))throw Error('Обновите страницу и попробуйте ещё раз.');
 const lead={requestId:input.requestId,name:input.name.trim(),phone,form:input.form,consent:true,consentVersion:'2026-09-16',page:typeof input.page==='string'?input.page.slice(0,500):'/',attribution:{}};
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid','landing','referrer'])if(typeof input.attribution?.[key]==='string')lead.attribution[key]=input.attribution[key].slice(0,300);
 if(input.form==='quiz'){for(const key of Object.keys(allowed)){if(!allowed[key].includes(input[key]))throw Error('Ответьте на все вопросы расчёта.');lead[key]=input[key];}if(typeof input.size!=='string'||!input.size.trim()||input.size.length>100)throw Error('Укажите примерный размер.');lead.size=input.size.trim();}
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
