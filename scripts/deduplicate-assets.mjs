import {readFile,writeFile,readdir,realpath} from 'node:fs/promises';
import {resolve,join,relative,sep,isAbsolute} from 'node:path';

// Source URLs and originals stay intact; only byte-identical published files share a URL.
const candidates=[
 ['assets/optimized/direct-feed/frantsuzskoe-osteklenie.jpg','assets/optimized/direct-feed/panoramnoe-osteklenie.jpg'],
 ['assets/responsive/7c11500c11e419a2-960.webp','assets/responsive/85b9c56512d40236-960.webp'],
 ['assets/responsive/7c11500c11e419a2-640.webp','assets/responsive/85b9c56512d40236-640.webp'],
 ['assets/responsive/7c11500c11e419a2-320.webp','assets/responsive/85b9c56512d40236-320.webp'],
 ['assets/responsive/00b5a84fa0d5e3b5-610.webp','assets/responsive/38fbf8a4ebec2903-610.webp'],
 ['assets/responsive/00b5a84fa0d5e3b5-320.webp','assets/responsive/38fbf8a4ebec2903-320.webp']
];
const escapePattern=value=>value.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');

export async function deduplicatePublishedAssets(outputDirectory){
 const root=await realpath(resolve(outputDirectory));
 const withinRoot=file=>{
  const absolute=resolve(file),local=relative(root,absolute);
  if(!local||isAbsolute(local)||local==='..'||local.startsWith('..'+sep)||resolve(root,local)!==absolute)throw Error('Asset rewrite must stay in the output directory: '+file);
  return absolute;
 };
 const actualFile=async file=>withinRoot(await realpath(withinRoot(file)));
 const aliases=[];
 for(const [duplicate,canonical] of candidates){
  try{
   const duplicateFile=await actualFile(join(root,duplicate)),canonicalFile=await actualFile(join(root,canonical));
   const [duplicateBytes,canonicalBytes]=await Promise.all([readFile(duplicateFile),readFile(canonicalFile)]);
   if(duplicateBytes.equals(canonicalBytes))aliases.push({duplicate,canonical,bytes:duplicateBytes.length});
  }catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const textFiles=[];
 async function collect(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const file=withinRoot(join(directory,entry.name));
   if(entry.isDirectory())await collect(await actualFile(file));
   else if(/\.(?:html|css|js|json|xml|txt|svg)$/.test(entry.name))textFiles.push(await actualFile(file));
  }
 }
 await collect(root);
 let rewrittenFiles=0;
 for(const file of textFiles){
  const source=await readFile(file,'utf8');
  let result=source;
  for(const {duplicate,canonical} of aliases){
   const pattern=new RegExp('(^|[^A-Za-z0-9_.-])'+escapePattern(duplicate)+'(?=$|[\\s\"\'<>),?&#\\]])','g');
   result=result.replace(pattern,(_,prefix)=>prefix+canonical);
  }
  if(result!==source){await writeFile(file,result);rewrittenFiles++;}
 }
 return {aliases:aliases.length,duplicateBytes:aliases.reduce((total,alias)=>total+alias.bytes,0),rewrittenFiles};
}
