import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=resolve('dist');
async function walk(dir){const files=[];for(const ent of await readdir(dir,{withFileTypes:true})){const path=join(dir,ent.name);files.push(...ent.isDirectory()?await walk(path):[path]);}return files;}
const files=await walk(root),pages=files.filter(f=>f.endsWith('.html'));let refs=0;
for(const file of pages){const html=await readFile(file,'utf8');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file+' must have one H1');for(const tag of ['<title>','name="description"','rel="canonical"','og:title','application/ld+json'])assert.ok(html.includes(tag),file+' missing '+tag);const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');for(const match of html.matchAll(/<img\s[^>]+>/g)){assert.ok(/\salt="[^"]+"/.test(match[0]),'image alt missing');assert.ok(/width=/.test(match[0])&&/height=/.test(match[0]),'image dimensions missing');}
 for(const m of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){const url=m[1];if(!url.startsWith('/')&&!url.startsWith('#'))continue;const [path,fragment]=url.split('#');let target=path?join(root,path):file;try{if((await stat(target)).isDirectory())target=join(target,'index.html');await stat(target);}catch{assert.fail(`${file} missing ${url}`);}if(fragment){const content=await readFile(target,'utf8');assert.ok(content.includes(`id="${fragment}"`),`${file} missing anchor ${url}`);}refs++;}
}
for(const asset of ['assets/manrope.ttf','assets/manrope-bold.ttf','robots.txt','sitemap.xml','site-config.json'])await stat(join(root,asset));
for(const file of ['public/app.js','scripts/server.mjs','scripts/leads.mjs','src/components.mjs','src/content.mjs'])execFileSync(process.execPath,['--check',file]);
const total=await Promise.all(files.filter(f=>f.endsWith('.webp')).map(f=>stat(f).then(s=>s.size)));
console.log(`PASS: ${pages.length} pages, ${refs} local references, one H1, metadata, image alt, JS syntax. WebP total: ${Math.round(total.reduce((a,b)=>a+b,0)/1024)} KB.`);
