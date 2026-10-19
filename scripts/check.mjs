import {readFile,readdir,stat,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const root=resolve('.'),dist=resolve('dist'),limit=25*1024*1024,errors=[],files=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,item.name);if(item.isDirectory())await walk(file);else files.push(file);}}
await walk(dist);
for(const file of files){
  const bytes=await readFile(file),rel=relative(root,file).replaceAll('\\','/');
  if(bytes.length>=limit)errors.push('File exceeds browser upload limit: '+rel);
  if(['.js','.css','.html','.json','.md','.svg'].includes(extname(file))){
    const text=bytes.toString('utf8');
    if(/C:\\Users\\|user\.library-file|siwc_bypass_bearer_token|ghp_[A-Za-z0-9]+|github_pat_|PRIVATE KEY/.test(text))errors.push('Private metadata/secret marker: '+rel);
    if(extname(file)==='.json'){try{JSON.parse(text);}catch{errors.push('Invalid JSON: '+rel);}}
    if(extname(file)==='.js'){try{if(/^\s*(?:import|export)\s/m.test(text))await import(pathToFileURL(file).href);else new vm.Script(text,{filename:rel});}catch(error){errors.push('Syntax/module: '+rel+' '+error.message);}}
    if(extname(file)==='.html'){
      const ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)errors.push('Duplicate ids: '+rel);
      for(const m of text.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){
        if(/^(?:https?:|data:|mailto:)/.test(m[1]))continue;
        try{await stat(resolve(dirname(file),m[1]));}catch{errors.push('Missing HTML resource: '+rel+' -> '+m[1]);}
      }
    }
  }
}
const catalogue=JSON.parse(await readFile('dist/assets/video-parts/catalog.json','utf8'));
const media=[];
for(const [logical,entry] of Object.entries(catalogue.videos)){
  const digest=createHash('sha256');let size=0,verified=true;
  if(entry.type==='direct'){const b=await readFile(resolve(dist,entry.url));digest.update(b);size=b.length;}
  else {
    const manifestPath=resolve(dist,entry.manifest),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    for(const part of manifest.parts){let b;try{b=await readFile(resolve(dirname(manifestPath),part.file));}catch(error){if(error.code!=='ENOENT')throw error;verified=false;continue;}if(b.length!==part.bytes||hash(b)!==part.sha256)errors.push('Native part mismatch: '+part.file);digest.update(b);size+=b.length;}
    if(!verified){if(manifest.sha256!==entry.sha256||manifest.bytes!==entry.bytes)errors.push('External native manifest mismatch: '+logical);}
  }
  const sha256=digest.digest('hex');if(verified&&(size!==entry.bytes||sha256!==entry.sha256))errors.push('Native film mismatch: '+logical);media.push({logical,bytes:verified?size:entry.bytes,sha256:verified?sha256:entry.sha256,verifiedLocally:verified,transport:verified?'local-complete':'documented external host, runtime integrity required'});
}
const inventory=await Promise.all(files.filter(file=>!file.endsWith('journey-art-kit.zip')).map(async file=>{const b=await readFile(file);return{path:relative(root,file).replaceAll('\\','/'),bytes:b.length,sha256:hash(b),externalInLeanPackage:file.endsWith('.bin')};}));
await mkdir('docs/review',{recursive:true});
await writeFile('docs/asset-manifest.json',JSON.stringify({version:'1.4.0',files:inventory,media},null,2)+'\n');
await writeFile('docs/review/static-check.json',JSON.stringify({version:'1.4.0',passed:!errors.length,errors,fileCount:files.length,totalBytes:inventory.reduce((s,f)=>s+f.bytes,0),maximumFileBytes:Math.max(...inventory.map(f=>f.bytes)),nativeFilmsVerified:media.filter(m=>m.verifiedLocally).length},null,2)+'\n');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('PASS: '+files.length+' static files, syntax/HTML/JSON/privacy checks, '+media.filter(m=>m.verifiedLocally).length+' native hashes verified locally, every file <25 MiB.');
