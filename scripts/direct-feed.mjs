import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {company,services,prices} from '../src/content.mjs';


const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Stable IDs; extras are available only within a larger order, not independently.
const ids={'osteklenie-balkonov':101,'holodnoe-osteklenie':107,'teploe-osteklenie':108,'panoramnoe-osteklenie':109,'frantsuzskoe-osteklenie':110,'uteplenie-balkonov':102,'otdelka-balkonov':103,'remont-balkonov':111,'balkon-pod-klyuch':104,'osteklenie-kottedzhej':106};
export async function renderDirectFeed({origin=company.origin,now=new Date()}={}){
 const root=origin.replace(/\/$/,'');
 const entries=await Promise.all(Object.entries(ids).map(async([slug,id])=>{
  const service=services.find(s=>s.slug===slug);
  if(!service)throw Error(`Missing feed service: ${slug}`);
  const asset='optimized/direct-feed/'+slug+'.jpg',bytes=await readFile(`public/assets/${asset}`);
  if(bytes.length>10*1024*1024)throw Error(`Feed picture too large: ${asset}`);
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const title=service.h1.replace(' в Москве и Московской области',' в Москве и МО');
  const price=slug==='remont-balkonov'?prices.repair:service.heroPrice?Number(service.heroPrice.replace(/\D/g,'')):prices[service.price];
  if(price!=null&&!(price>0))throw Error(`Invalid feed price: ${slug}`);
  const unit=service.heroPrice?(service.heroPriceUnit||''):'/м²';
  const priceText=price?` Цена от ${price.toLocaleString('ru-RU')} ₽${unit}.`:'';
  return {id,slug,title,price,unit,url:slug==='balkon-pod-klyuch'?`${root}/`:`${root}/${slug}/`,picture:`${root}/assets/${asset}?v=${hash}`,description:service.short+priceText};
 }));
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const offers=entries.map(e=>`      <offer id="${e.id}" available="true">
        <url>${xml(e.url)}</url>
        <categoryId>${e.id}</categoryId>
        <picture>${xml(e.picture)}</picture>
        <name>${xml(e.title)}</name>
        <description>${xml(e.description)}</description>
        <collectionId>${e.id}</collectionId>
      </offer>`).join('\n');
 // Starting rates per square metre are described explicitly, not sent as a fixed total price.
 const collections=entries.map(e=>`      <collection id="${e.id}">
        <url>${xml(e.url)}</url>
        <picture>${xml(e.picture)}</picture>
        <name>${xml(e.title)}</name>
        <description>${xml(e.description)}</description>
      </collection>`).join('\n');
 return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${date}">
  <shop>
    <name>${xml(company.name)}</name>
    <company>${xml(company.operator)}</company>
    <url>${xml(root)}/</url>
    <currencies><currency id="RUB" rate="1"/></currencies>
    <categories>
${entries.map(e=>`      <category id="${e.id}">${xml(e.title)}</category>`).join('\n')}
    </categories>
    <offers>
${offers}
    </offers>
    <collections>
${collections}
    </collections>
  </shop>
</yml_catalog>
`;
}
