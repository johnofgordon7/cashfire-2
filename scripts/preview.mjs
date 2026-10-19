// Dependency-free development server; production remains the original static dist/ site.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const args=process.argv.slice(2), option=(name,fallback)=>args[args.indexOf(name)+1]||fallback;
const root=resolve('dist'), port=Number(option('--port','4173'));
const audioReviewIndex=args.indexOf('--audio-review-dir');
const audioReviewRoot=audioReviewIndex>=0?resolve(args[audioReviewIndex+1]):null;
const reviewAudioFiles=new Set(['music.mp3','spin.mp3','reel-stop.mp3','loot-hit.mp3','bonus.mp3','mega.mp3','transition.mp3','win.mp3']);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav'};
createServer(async(req,res)=>{
  try{
    const route=new URL(req.url,'http://localhost').pathname;
    if(audioReviewRoot&&route==='/audio-pack.js'){
      const names={music:'music',motor:'spin','reel-stop':'reel-stop','bolt-1':'loot-hit','bolt-2':'loot-hit','bolt-3':'loot-hit','bolt-4':'loot-hit',collect:'loot-hit',bonus:'bonus',mega:'mega',transition:'transition',win:'win'};
      const paths=Object.fromEntries(Object.entries(names).map(([name,file])=>[name,'/__audio-review/'+file+'.mp3']));
      res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end('globalThis.CashfireAudioPack=Object.freeze('+JSON.stringify({paths})+');');return;
    }
    if(audioReviewRoot&&route.startsWith('/__audio-review/')){
      const name=route.slice('/__audio-review/'.length);
      if(!reviewAudioFiles.has(name)){res.writeHead(404).end('Not found');return;}
      res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}).end(await readFile(resolve(audioReviewRoot,name)));return;
    }
    if(new URL(req.url,'http://localhost').pathname==='/__qa'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(await readFile('tests/viewport-harness.html'));return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname), file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,option('--host','127.0.0.1'),()=>console.log('Cashfire 2 preview: http://127.0.0.1:'+port+'/'));
