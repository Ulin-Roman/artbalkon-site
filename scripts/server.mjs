import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {watch} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {saveLead} from './leads.mjs';
const live=process.env.LEAD_MODE==='live';
const webhook=process.env.LEAD_WEBHOOK_URL;
if(live&&(!webhook||!/^https:\/\//.test(webhook)))throw Error('Live mode requires an HTTPS LEAD_WEBHOOK_URL.');
const limits=new Map();
async function leadRequest(req,res){
 const json=(code,value)=>res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(value));
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(405,{ok:false,message:'Метод не поддерживается.'});}
 const origin=req.headers.origin;
 const expected=process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`;
 if(!origin||origin!==expected)return json(403,{ok:false,message:'Отправьте заявку со страницы сайта.'});
 if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{ok:false,message:'Некорректный формат заявки.'});
 const ip=req.socket.remoteAddress,now=Date.now();
 for(const [key,value] of limits)if(now-value.time>600000)limits.delete(key);
 const limit=limits.get(ip)||{time:now,count:0};if(limit.count>=10)return json(429,{ok:false,message:'Слишком много запросов. Попробуйте позже или позвоните нам.'});limit.count++;limits.set(ip,limit);
 try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000)return json(413,{ok:false,message:'Заявка слишком большая.'});}
  let input;try{input=JSON.parse(body);}catch{return json(400,{ok:false,message:'Некорректная заявка.'});}
  const result=await saveLead(input,{directory:process.env.LEAD_DATA_DIR||'data/leads',mode:live?'live':'preview',deliver:live?async lead=>{
   const headers={'Content-Type':'application/json','Idempotency-Key':lead.requestId};if(process.env.LEAD_WEBHOOK_TOKEN)headers.Authorization=`Bearer ${process.env.LEAD_WEBHOOK_TOKEN}`;
   const response=await fetch(webhook,{method:'POST',headers,body:JSON.stringify(lead),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Не удалось передать заявку. Повторите отправку или позвоните нам.');
  }:undefined});return json(200,result);
 }catch(e){console.error('Lead request failed:',e.code||e.name);return json(400,{ok:false,message:e.code?'Не удалось сохранить заявку. Попробуйте ещё раз или позвоните нам.':e.message});}
}
execFileSync(process.execPath, ['scripts/build.mjs'], {stdio:'inherit'});
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/leads')return await leadRequest(req,res);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const file=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  let target=file;
  if((await stat(target)).isDirectory())target=resolve(target,'index.html');
  const data=await readFile(target);
  res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',...(!live?{'X-Robots-Tag':'noindex, nofollow'}:{})}).end(req.method==='HEAD'?undefined:data);
 }catch{const fallback=await readFile(resolve(root,'404.html')).catch(()=>Buffer.from('Страница не найдена'));res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}).end(fallback);}
});
const port=Number(process.env.PORT||4173);
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
let timer;
for(const directory of ['src','public'])watch(directory,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>{try{execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});}catch(e){console.error('Build failed');}},180);});
