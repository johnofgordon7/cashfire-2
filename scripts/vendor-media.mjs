// Optional reproducible self-contained build. Every downloaded part is verified.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {mediaBaseUrl} from '../dist/combat-media-location.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(await readFile('dist/assets/video-parts/catalog.json','utf8'));
let verified=0;
for(const entry of Object.values(catalog.videos)){
  if(entry.type!=='chunks')continue;
  const manifestPath=resolve('dist',entry.manifest),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.sha256!==entry.sha256||manifest.bytes!==entry.bytes)throw Error('Manifest identity mismatch');
  const base=new URL(entry.manifest,mediaBaseUrl),digest=createHash('sha256');let size=0;
  for(const part of manifest.parts){
    if(!/^part-\d\d\.bin$/.test(part.file))throw Error('Invalid part name');
    const file=resolve(dirname(manifestPath),part.file);let bytes;
    try{bytes=await readFile(file);}catch{}
    if(!bytes||bytes.length!==part.bytes||hash(bytes)!==part.sha256){const url=new URL(part.file,base);url.searchParams.set('v',part.sha256);const r=await fetch(url);if(!r.ok)throw Error('Media download failed: '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length!==part.bytes||hash(bytes)!==part.sha256)throw Error('Media integrity check failed');await writeFile(file+'.tmp',bytes);await rename(file+'.tmp',file);}
    digest.update(bytes);size+=bytes.length;verified++;
  }
  if(size!==entry.bytes||digest.digest('hex')!==entry.sha256)throw Error('Complete native-film identity mismatch');
}
await writeFile('dist/combat-media-location.js',"// Self-contained native-media distribution, vendored and hash-verified.\nexport const mediaBaseUrl = new URL('./', import.meta.url).href;\nexport const sourceRevision = '63a6f594f66c353b06d792c7aebbc670784b8e68';\n");
console.log('Verified '+verified+' native parts. Playback now uses local media.');
