import {build as bundleScript} from 'esbuild';
import {mkdir,readFile,writeFile,cp,rm,readdir} from 'node:fs/promises';
import {resolve,relative,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {optimizeCss,imageSource} from './optimize.mjs';
import {renderDirectFeed} from './direct-feed.mjs';
import {deduplicatePublishedAssets} from './deduplicate-assets.mjs';
const responsiveImages=JSON.parse(await readFile('src/responsive-images.json','utf8'));
const appSource=await readFile('public/app.js','utf8');
const sourceText=(await Promise.all((await readdir('src')).filter(n=>/\.(mjs|html)$/.test(n)).map(n=>readFile('src/'+n,'utf8')))).join('\n')+appSource+'\n'+await readFile(new URL(import.meta.url),'utf8');
const cssResult=await optimizeCss((await readFile('public/styles.css','utf8'))+'\n'+(await readFile('public/styles-extra.css','utf8')),sourceText);
const giftVersion=createHash('sha256').update(await readFile('src/gift-3d.mjs','utf8')).update(await readFile('package-lock.json','utf8')).digest('hex').slice(0,12);
const calculatorSceneVersion=createHash('sha256').update(await readFile('public/calculator-scene.mjs','utf8')).update(await readFile('package-lock.json','utf8')).digest('hex').slice(0,12);
// Static imports are bundled into the existing classic deferred script.
const appContents=appSource.replace("'gift-3d.js'","'gift-3d.js?v="+giftVersion+"'").replace("'calculator-scene.js'","'calculator-scene.js?v="+calculatorSceneVersion+"'");
const appBundle=await bundleScript({stdin:{contents:appContents,resolveDir:resolve('public'),sourcefile:'app.js',loader:'js'},bundle:true,minify:true,format:'iife',target:['chrome100','firefox100','safari15.4'],legalComments:'none',write:false});
const appCode=appBundle.outputFiles[0].text;
const fingerprint=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
// Use the prepared full-size WebP in comparisons as well as thumbnails.
const comparisonAsset=src=>responsiveImages[src.startsWith('/')?src:'/'+src]?.src.slice(1)||src;
const optimizeHtml=html=>html.replace(/https:\/\/[^"\s<>]+\/assets\/[^"\s<>]+/g,url=>{
 const asset='/assets/'+url.split('/assets/')[1],entry=responsiveImages[asset];
 return entry?url.replace(asset,entry.src):url;
}).replace(/href="(\/assets\/certificates\/[^"<>]+)"/g,(_,src)=>'href="'+(responsiveImages[src]?.src||src)+'"').replace(/(data-(?:before|after)=")([^"]+)(")/g,(_,prefix,src,suffix)=>prefix+comparisonAsset(src)+suffix).replace(/<img\b[^>]*>/g,tag=>{
 const src=imageSource(tag),entry=responsiveImages[src];if(!entry)return tag;
 // Inline estimates use full-size WebP: tall cover crops can exceed thumbnail widths.
 if(tag.includes('data-estimate-image')){
  const fullSize=entry.variants?.reduce((largest,variant)=>variant.width>(largest?.width||0)?variant:largest,null)?.src||entry.src;
  return tag.replace(/\s(?:srcset|sizes)="[^"]*"/g,'').replace('src="'+src+'"','src="'+fullSize+'"');
 }
 // Cover crops need enough source pixels for both the card width and height.
 const finishingPhoto=tag.match(/data-finishing-photo="(\d+)"/);
 let sizes;
 if(finishingPhoto){
  const ratio=entry.width/entry.height,small=Number(finishingPhoto[1])<2;
  if(!Number.isFinite(ratio)||ratio<=0)throw Error('Missing finishing photo dimensions: '+src);
  const coverWidth=(height,width)=>Math.ceil(Math.max(height*ratio,width)*1.025);
  // A portrait in the first column can make both grid rows taller than the minimum.
  const stylePrefix=src.replace(/-\d+\.[^.]+$/,'-');
  const firstPhotos=Object.entries(responsiveImages).filter(([key])=>key.startsWith(stylePrefix)&&/-[12]\.[^/]+$/.test(key)).map(([,photo])=>photo);
  if(firstPhotos.length!==2)throw Error('Missing finishing gallery companions: '+src);
  const gallerySize=(minimumHeight,firstWidth,wideWidth)=>{
   const rowHeight=Math.max((minimumHeight-12)/2,...firstPhotos.map(photo=>firstWidth*photo.height/photo.width));
   return coverWidth(small?rowHeight:2*rowHeight+12,small?firstWidth:wideWidth);
  };
  sizes='(max-width:640px) max(calc((100vw - 80px) / 2), '+Math.ceil(190*ratio*1.025)+'px), (max-width:900px) '+gallerySize(430,215,300)+'px, '+gallerySize(460,210,285)+'px';
 }else if(src.startsWith('/assets/glazing-choice-v2/'))sizes='(max-width:760px) calc(100vw - 58px), (max-width:1100px) 50vw, 614px';
 else sizes=tag.includes('width="960"')?'(max-width:640px) calc((100vw - 32px) / 2), (max-width:1000px) calc((100vw - 80px) / 4), 220px':'(max-width:640px) calc(100vw - 32px), (max-width:1100px) 50vw, 700px';
 // Keep the encoded aspect ratio before the first paint, including service heroes.
 const declaredDimensions=Number.isSafeInteger(entry.width)&&entry.width>0&&Number.isSafeInteger(entry.height)&&entry.height>0;
 const dimensionedTag=declaredDimensions&&(src.startsWith('/assets/landing-gallery-v1/')||/\bclass="[^"]*\b(?:hero-image|repair-before|repair-after)\b/.test(tag))
  ?tag.replace(/\bwidth="\d+"/,'width="'+entry.width+'"').replace(/\bheight="\d+"/,'height="'+entry.height+'"')
  :tag;
 // Keep responsive candidates deferred too; the slider selects a cover-sized source on activation.
 if(tag.includes('data-src="'))return dimensionedTag.replace('data-src="'+src+'"','data-src="'+entry.src+'"').replace('>',' data-srcset="'+entry.variants.map(v=>v.src+' '+v.width+'w').join(', ')+'" data-sizes="'+sizes+'">');
 return dimensionedTag.replace(/\s(?:srcset|sizes)="[^"]*"/g,'').replace('src="'+src+'"','src="'+entry.src+'"') .replace('>',' srcset="'+entry.variants.map(v=>v.src+' '+v.width+'w').join(', ')+'" sizes="'+sizes+'">');
}).replace(/\/(styles\.css|app\.js)\?v=[^" ]+/g,(_,file)=>'/'+file+'?v='+fingerprint(file==='styles.css'?cssResult.code:appCode));
import {shellWithQuiz as shell,home,servicePageWithSeo as servicePage,esc,homeHeroImage,serviceHeroAsset} from '../src/components.mjs';
import {company,services,serviceSeo,integrations} from '../src/content.mjs';
const rawBase=process.env.SITE_BASE_PATH||'/';
if(!/^\/(?:[a-zA-Z0-9._-]+\/)*$/.test(rawBase))throw Error('SITE_BASE_PATH must be an absolute path ending with /.');
const base=rawBase;
const staticOnly=process.env.SITE_STATIC_ONLY==='true';
const mailForms=process.env.SITE_MAIL_FORMS==='true';
if(mailForms&&(staticOnly||base!=='/'||company.origin!=='https://artbalkon.site'))throw Error('Mail forms are only supported on the production PHP host.');
const imageAsset=name=>`/assets/${/\.[a-z0-9]+$/i.test(name)?name:`${name}.webp`}`;
// The publicly accessible Pages preview must not compete with the production site in search.
const baseHtml=html=>{
 if(staticOnly)html=html.replace(/(<meta name="robots" content=")[^"]+("\s*\/>|">)/,'$1noindex,follow$2');
 return base==='/'?html:html.replace(/((?:href|src|poster|data-src|data-poster|data-mobile-src|data-mobile-poster)=")\/(?!\/)/g,`$1${base}`).replace(/\b((?:data-)?srcset)="([^"]+)"/g,(_,attribute,value)=>`${attribute}="${value.replaceAll('/assets/',base+'assets/')}"`);
};
const baseCss=css=>base==='/'?css:css.replace(/url\((['"]?)\/(?!\/)/g,`url($1${base}`);
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await writeFile('dist/styles.css',baseCss(cssResult.code));
await writeFile('dist/app.js',appCode);
await bundleScript({entryPoints:['src/gift-3d.mjs'],outfile:'dist/gift-3d.js',bundle:true,minify:true,format:'esm',target:['es2020'],legalComments:'eof'});
await bundleScript({entryPoints:['public/calculator-scene.mjs'],outfile:'dist/calculator-scene.js',bundle:true,minify:true,format:'esm',target:['chrome100','firefox100','safari15.4'],legalComments:'none'});
await rm('dist/styles-extra.css');
// Only bundled scripts are published; the drawing module stays separate and lazy.
await rm('dist/calculator-estimate.mjs');
await rm('dist/calculator-scene-loader.mjs');
await rm('dist/calculator-scene.mjs');
await rm('dist/retention-popup.mjs');
await rm('dist/media-lifecycle.mjs');
await rm('dist/phone-mask.mjs');
await writeFile('dist/.nojekyll','');
const routes=[];
async function page(path,body,meta={}){const dir='dist'+path;await mkdir(dir,{recursive:true});await writeFile(dir+'index.html',baseHtml(optimizeHtml(shell(body,{path,...meta}))));if(!meta.noindex)routes.push(path);}
const permanentRedirects=[];
async function redirect(path,target,label){
 const dir='dist'+path,destination=base==='/'?target:base+target.slice(1),canonical=company.origin.replace(/\/$/,'')+target.split('#')[0];
 await mkdir(dir,{recursive:true});
 // GitHub Pages cannot issue HTTP redirects; keep only a small, non-indexable fallback.
 const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Страница перенесена — ArtBalkon</title><link rel="canonical" href="'+esc(canonical)+'"><meta http-equiv="refresh" content="0;url='+esc(destination)+'"><script>const destination=new URL('+JSON.stringify(destination)+',location.href);destination.search=location.search;if(location.hash)destination.hash=location.hash;location.replace(destination.href);</script></head><body><h1>Страница перенесена</h1><p>'+esc(label)+'</p><p><a href="'+esc(destination)+'">Перейти к актуальной странице</a></p></body></html>';
 await writeFile(dir+'index.html',html);
 permanentRedirects.push({path,target});
}
await page('/',home(),{image:imageAsset(homeHeroImage)});
const bundledServiceSlugs=new Set(['balkon-pod-klyuch','krysha-nad-balkonom','mebel-dlya-balkona','elektrika-na-balkone']);
for(const s of services.filter(service=>!bundledServiceSlugs.has(service.slug))){const seo=serviceSeo[s.slug];await page(`/${s.slug}/`,servicePage(s),{title:seo?.metaTitle||`${s.h1} — цены и замер | ArtBalkon`,description:seo?.metaDescription||s.offer,image:imageAsset(serviceHeroAsset(s))});}
await redirect('/balkon-pod-klyuch/','/','Балконы и лоджии под ключ — теперь на главной странице');
await redirect('/krysha-nad-balkonom/','/#complex-options','Крыша над балконом — только в составе проекта под ключ');
await redirect('/mebel-dlya-balkona/','/#complex-options','Мебель для балкона или лоджии — только в составе проекта под ключ');
await redirect('/elektrika-na-balkone/','/#complex-options','Электрика и освещение — только в составе проекта под ключ');
await redirect('/osteklenie-lodzhii/','/osteklenie-balkonov/','Остекление балконов и лоджий в Москве и Московской области');
await redirect('/uteplenie-lodzhii/','/uteplenie-balkonov/','Утепление балконов и лоджий в Москве и Московской области');
await redirect('/otdelka-lodzhii/','/otdelka-balkonov/','Отделка балконов и лоджий в Москве и Московской области');
await redirect('/lodzhiya-pod-klyuch/','/','Балконы и лоджии под ключ в Москве и Московской области');
await redirect('/holodnoe-osteklenie-lodzhii/','/holodnoe-osteklenie/','Холодное остекление балконов и лоджий в Москве и Московской области');
await redirect('/teploe-osteklenie-lodzhii/','/teploe-osteklenie/','Тёплое остекление балконов и лоджий в Москве и Московской области');
await redirect('/panoramnoe-osteklenie-lodzhii/','/panoramnoe-osteklenie/','Панорамное остекление балконов и лоджий в Москве и Московской области');
// Retired standalone cases now lead directly to the home portfolio.
for(const path of ['/nashi-raboty/','/nashi-raboty/lodzhiya-v-golubom/','/nashi-raboty/lodzhiya-na-anohina/','/nashi-raboty/lodzhiya-v-himkah/']){
 await redirect(path,'/#before-after','Наши работы — в портфолио на главной странице');
}
// Apache production hosting sends permanent redirects before serving the static fallback.
if(!staticOnly){
 const escapePattern=value=>value.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
 const rules=permanentRedirects.map(({path,target})=>{
  const source=escapePattern(base+path.slice(1).replace(/\/$/,''));
  const destination=company.origin.replace(/\/$/,'')+target;
  return 'RedirectMatch 301 "^'+source+'(?:/index\\.html|/)?$" "'+destination+'"';
 });
 const canonicalOrigin=company.origin.replace(/\/$/,'');
 const rewriteRedirects=permanentRedirects.map(({path,target})=>{
  const source=escapePattern(path.slice(1).replace(/\/$/,''));
  const destination=canonicalOrigin+target;
  const rule=' RewriteRule ^'+source+'(?:/index\\.html|/)?$ ';
  // Explicit query placement keeps campaign parameters before an anchor.
  const withQuery=target.includes('#')?' RewriteCond %{QUERY_STRING} !^$\n'+rule+destination.replace('#','?%{QUERY_STRING}#')+' [R=301,L,NE]\n':'';
  return withQuery+rule+destination+' [R=301,L,NE]';
 }).join('\n');
 const normalizationRules=String.raw`# Canonical URL: normalize explicit index requests, hostname and scheme.
<IfModule mod_rewrite.c>
 RewriteEngine On
 # Retired routes run before index, host and scheme normalization.
${rewriteRedirects}
 # THE_REQUEST excludes internal DirectoryIndex and ErrorDocument rewrites.
 RewriteCond %{THE_REQUEST} "\s/+((?:[^?\s]*/)?)index\.html(?:[?\s])"
 RewriteRule ^(?:.*/)?index\.html$ ${canonicalOrigin}/%1 [R=301,L,NE]
 # Capture the raw request path so percent-encoded characters stay encoded.
 RewriteCond %{HTTP_HOST} ^www\.artbalkon\.site(?::\d+)?$ [NC]
 RewriteCond %{THE_REQUEST} "\s(/[^?\s]*)(?:[?\s])"
 RewriteRule ^ ${canonicalOrigin}%1 [R=301,L,NE]
 # REG.RU may terminate TLS at a reverse proxy; respect its HTTPS markers.
 RewriteCond %{HTTPS} !=on
 RewriteCond %{ENV:HTTPS} !=on
 RewriteCond %{HTTP:X-Forwarded-Proto} !^https$ [NC]
 RewriteCond %{THE_REQUEST} "\s(/[^?\s]*)(?:[?\s])"
 RewriteRule ^ ${canonicalOrigin}%1 [R=301,L,NE]
</IfModule>
`;
 const performanceRules=`# Serve the generated error page with the original HTTP 404 status.
ErrorDocument 404 ${base}404.html
# Compression and caching for the production Apache host.
<IfModule mod_deflate.c>
 AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript text/javascript application/json application/xml text/xml image/svg+xml
</IfModule>
<IfModule mod_headers.c>
 <FilesMatch "\\.(?:html|json|xml|txt)$">
  Header set Cache-Control "no-cache"
 </FilesMatch>
 <FilesMatch "^(?:styles\\.css|app\\.js|gift-3d\\.js|calculator-scene\\.js)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
 </FilesMatch>
 <FilesMatch "\\.(?:webp|jpg|jpeg|png|svg|ico|woff2|mp4)$">
  Header set Cache-Control "public, max-age=604800"
 </FilesMatch>
</IfModule>
`;
 await writeFile('dist/.htaccess',normalizationRules+'\n'+performanceRules+'\n# Fallback for hosts without mod_rewrite.\n<IfModule !mod_rewrite.c>\n'+rules.join('\n')+'\n</IfModule>\n');
}
const privacy=(await readFile('src/privacy.html','utf8')).replaceAll('{{SITE_URL}}',esc(company.origin.replace(/\/$/,''))).replaceAll('{{SITE_LABEL}}',esc(company.origin.replace(/^https?:\/\//,'').replace(/\/$/,'')));
await page('/privacy/',`<article class="container legal"><p class="eyebrow">ДОКУМЕНТЫ</p><h1>Политика конфиденциальности</h1>${privacy}</article>`,{title:'Политика конфиденциальности — ArtBalkon',description:'Политика обработки персональных данных посетителей сайта ArtBalkon: цели обработки, права пользователей, защита данных и контакты оператора.',noindex:true});
await page('/consent/',`<article class="container legal"><p class="eyebrow">ДОКУМЕНТЫ</p><h1>Согласие на обработку персональных данных</h1><p>Отправляя форму с отмеченным полем согласия, я разрешаю ${esc(company.operator)} обрабатывать предоставленные мной имя, номер телефона и сведения о заявке для связи со мной, подготовки расчёта и обсуждения заказа.</p><p>Обработка включает сбор, запись, систематизацию, накопление, хранение, уточнение, использование и удаление указанных данных. Данные об источнике перехода и рекламные метки используются для определения источника заявки.</p><p>Согласие действует до достижения целей обработки или его отзыва. Я могу отозвать согласие по электронной почте <a href="mailto:${company.privacyEmail}">${company.privacyEmail}</a>, указав в теме «Отзыв согласия на обработку персональных данных».</p><p>Подробные условия изложены в <a href="/privacy/">политике конфиденциальности</a>.</p></article>`,{title:'Согласие на обработку персональных данных — ArtBalkon',description:'Условия согласия на обработку персональных данных при отправке заявки в ArtBalkon: состав данных, цели обработки, срок действия и порядок отзыва.',noindex:true});
await writeFile('dist/404.html',baseHtml(optimizeHtml(shell('<section class="section container legal"><p class="eyebrow">404</p><h1>Такой страницы нет</h1><p class="explanatory-subtitle">Вернитесь на главную — там услуги, цены и наши работы.</p><a class="button" href="/">На главную ↗</a></section>',{title:'Страница не найдена — ArtBalkon',description:'Запрошенная страница не найдена. Перейдите на главную страницу ArtBalkon.',path:'/404.html',noindex:true}))));
if(mailForms){
 await mkdir('dist/api',{recursive:true});
 for(const file of ['leads.php','mail-lib.php'])await cp('server/'+file,'dist/api/'+file);
 const {allowed}=await import('./leads.mjs');
 await writeFile('dist/api/lead-options.json',JSON.stringify(allowed));
}
await writeFile('dist/site-config.json',JSON.stringify({...integrations,basePath:base,leadEndpoint:mailForms?'/api/leads.php':staticOnly?null:integrations.leadEndpoint}));
// Keep preview pages crawlable so robots can see noindex; only production publishes a sitemap.
await writeFile('dist/robots.txt',`User-agent: *\nAllow: ${base}\nDisallow: ${base}api/\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid\n${staticOnly?'':`Sitemap: ${company.origin}/sitemap.xml\n`}`);
if(!staticOnly)await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(path=>`<url><loc>${company.origin}${path}</loc></url>`).join('')+'</urlset>');
await writeFile('dist/yandex-direct.xml',await renderDirectFeed());
// Keep source originals in public; publish only assets referenced by the built site.
async function builtFiles(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);files.push(...entry.isDirectory()?await builtFiles(file):[file]);}return files;}
const builtRoot=resolve('dist'),assetRoot=join(builtRoot,'assets');
const duplicates=await deduplicatePublishedAssets(builtRoot);
const built=await builtFiles(builtRoot);
const referenceText=(await Promise.all(built.filter(file=>/\.(html|css|js|json|xml|txt|svg)$/.test(file)).map(file=>readFile(file,'utf8')))).join('\n').replaceAll('\\','/');
let omitted=0;
for(const file of built){
 if(!file.startsWith(assetRoot+sep))continue;
 const asset=relative(builtRoot,file).replaceAll('\\','/');
 if(!referenceText.includes(asset)){await rm(file);omitted++;}
}
console.log(`Shared assets: ${duplicates.aliases} byte-identical duplicates (${duplicates.duplicateBytes} bytes)`);
console.log(`Optimized CSS: ${cssResult.removed.length} unused selectors removed; CSS ${Buffer.byteLength(cssResult.code)} bytes, JS ${Buffer.byteLength(appCode)} bytes`);
console.log(`ArtBalkon: ${routes.length+2} pages built; ${omitted} unused source assets omitted from dist`);
