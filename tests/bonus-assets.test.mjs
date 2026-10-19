import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const catalog=JSON.parse(await readFile(path.join(dist,'assets/video-parts/catalog.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalHashes={
  './assets/call-of-booty-sprint.mp4':'cbf5331b3cc4dc1ad43957e9048685b62979e9b5300244738d67684d79da9924',
  './assets/call-of-booty-ambush-early.mp4':'d9e0297ec40531723c73d3b94fa0804d4dbe0283070882f02edc07a6ba849da5',
  './assets/call-of-booty-ambush-late.mp4':'a38880bcf80f1382a627ce9f90f0bbe3da7968ba2d9497798b71ec61ef8fb94e',
  './assets/call-of-booty-extraction-five.mp4':'e3739bbd91ff09a42ae6549b82f17a2ced9da39bc82ed991ae854b9612d12f6f',
  './assets/call-of-booty-extraction-max.mp4':'f8557534dd9e22b6e1654527e0ea9d6699f6c44db8a67a6f5d635db7f3a7403e'
};
let hasLocalParts=true;try{await stat(path.join(dist,'assets/video-parts/sprint/part-00.bin'));}catch{hasLocalParts=false;}
test('all five shipped native films reconstruct to exact supplied SHA-256 values',{skip:hasLocalParts?false:'Run npm run vendor-media for the optional self-contained media checks.'},async()=>{
  assert.equal(Object.keys(catalog.videos).length,5);
  for(const [logical,entry] of Object.entries(catalog.videos)){
    let bytes;if(entry.type==='direct')bytes=await readFile(path.join(dist,entry.url));
    else{
      const manifestPath=path.join(dist,entry.manifest),manifest=JSON.parse(await readFile(manifestPath,'utf8')),parts=[];
      for(const part of manifest.parts){const data=await readFile(path.join(path.dirname(manifestPath),part.file));assert.equal(data.length,part.bytes);assert.equal(hash(data),part.sha256);assert.ok(data.length<=4*1024*1024);parts.push(data);}
      bytes=Buffer.concat(parts);
    }
    assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),originalHashes[logical]);assert.equal(entry.sha256,originalHashes[logical]);
  }
});
test('native loader creates a byte-exact seekable Blob from the shipping part files',{skip:hasLocalParts?false:'Local native parts were deliberately omitted from the lean package.'},async()=>{
  const {loadChunkedVideo}=await import('../dist/combat-media.js');const made=[];
  const result=await loadChunkedVideo('./assets/call-of-booty-sprint.mp4',{baseUrl:'https://cashfire.test/dist/index.html',crypto:webcrypto,createObjectURL(blob){made.push(blob);return'blob:verified';},async fetch(url){const parsed=new URL(url),relative=decodeURIComponent(parsed.pathname.slice('/dist/'.length));assert.ok(relative.startsWith('assets/video-parts/'));assert.ok(!relative.includes('..'));const bytes=await readFile(path.join(dist,relative));return new Response(bytes,{status:200});}});
  assert.equal(result.url,'blob:verified');assert.equal(made.length,1);assert.equal(made[0].type,'video/mp4');assert.equal(hash(Buffer.from(await made[0].arrayBuffer())),originalHashes['./assets/call-of-booty-sprint.mp4']);
});
test('all native media parts and source posters fit the 25 MiB upload limit',async()=>{
  async function walk(directory){for(const name of await readdir(directory)){const file=path.join(directory,name),entry=await stat(file);if(entry.isDirectory())await walk(file);else assert.ok(entry.size<25*1024*1024,path.relative(dist,file));}}
  await walk(path.join(dist,'assets/video-parts'));
  assert.ok((await stat(path.join(dist,'assets/call-of-booty-ambush-early.mp4'))).size<25*1024*1024);
});
