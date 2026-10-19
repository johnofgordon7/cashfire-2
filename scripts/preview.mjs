// Dependency-free development server; production remains the original static dist/ site.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const args=process.argv.slice(2), option=(name,fallback)=>args[args.indexOf(name)+1]||fallback;
const root=resolve('dist'), port=Number(option('--port','4173'));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav'};
createServer(async(req,res)=>{
  try{
    if(new URL(req.url,'http://localhost').pathname==='/__qa'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(await readFile('tests/viewport-harness.html'));return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname), file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,option('--host','127.0.0.1'),()=>console.log('Cashfire 2 preview: http://127.0.0.1:'+port+'/'));
