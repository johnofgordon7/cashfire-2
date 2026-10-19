// Checks renderer orchestration without pretending to compile shaders or run browser QA.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let next=1,currentProgram,currentBuffer,currentFrame,unit=1000,draws=0,copies=0;
const textures={},attributes={},events={};
const constants=['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','ARRAY_BUFFER','STATIC_DRAW','TEXTURE_2D','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','LINEAR_MIPMAP_LINEAR','LINEAR','NEAREST','TEXTURE_WRAP_S','TEXTURE_WRAP_T','CLAMP_TO_EDGE','REPEAT','RGBA','UNSIGNED_BYTE','FRAMEBUFFER','RENDERBUFFER','DEPTH_COMPONENT16','COLOR_ATTACHMENT0','DEPTH_ATTACHMENT','FRAMEBUFFER_COMPLETE','DEPTH_TEST','LEQUAL','CULL_FACE','BACK','BLEND','COLOR_BUFFER_BIT','DEPTH_BUFFER_BIT','POLYGON_OFFSET_FILL','FLOAT','TRIANGLES','UNPACK_FLIP_Y_WEBGL','DITHER'];
const raw=Object.fromEntries(constants.map((x,i)=>[x,i+1]));raw.TEXTURE0=1000;raw.TEXTURE1=1001;
Object.assign(raw,{
 createShader:type=>({type}),shaderSource:(s,source)=>s.source=source,getShaderParameter:()=>true,
 createProgram:()=>({shaders:[],uniforms:{}}),attachShader:(p,s)=>p.shaders.push(s),getProgramParameter:()=>true,
 getAttribLocation:(p,n)=>{const v=p.shaders.find(s=>s.type===raw.VERTEX_SHADER).source;const names=[...v.matchAll(/attribute\s+\w+\s+([^;]+);/g)].flatMap(m=>m[1].split(',').map(x=>x.trim()));return names.indexOf(n);},
 getUniformLocation:(p,n)=>({program:p,name:n}),useProgram:p=>currentProgram=p,
 createBuffer:()=>({id:next++}),bindBuffer:(_,b)=>currentBuffer=b,bufferData:(_,data)=>currentBuffer.length=data.length*data.BYTES_PER_ELEMENT,
 createTexture:()=>({id:next++}),activeTexture:n=>unit=n,bindTexture:(_,t)=>textures[unit]=t,
 createFramebuffer:()=>({id:next++}),bindFramebuffer:(_,f)=>currentFrame=f,framebufferTexture2D:(_,a,b,t)=>currentFrame.texture=t,
 createRenderbuffer:()=>({id:next++}),checkFramebufferStatus:()=>raw.FRAMEBUFFER_COMPLETE,getExtension:()=>null,
 enableVertexAttribArray:i=>attributes[i]={...attributes[i],enabled:true},disableVertexAttribArray:i=>attributes[i]={...attributes[i],enabled:false},
 vertexAttribPointer:(i,size,type,norm,stride,offset)=>attributes[i]={...attributes[i],size,stride:stride||size*4,offset,buffer:currentBuffer},
 uniform1i:(u,value)=>u.program.uniforms[u.name]=value,
 drawArrays:(type,first,count)=>{
  assert.equal(type,raw.TRIANGLES);assert.equal(count%3,0);draws++;
  for(const a of Object.values(attributes).filter(a=>a.enabled))assert(a.buffer.length>=a.offset+(first+count-1)*a.stride+a.size*4,'attribute buffer covers draw');
  for(const sampler of ['strip','shadow','scene'])if(sampler in currentProgram.uniforms)assert.notEqual(textures[1000+currentProgram.uniforms[sampler]],currentFrame?.texture,'no texture feedback loop');
 }
});
const gl=new Proxy(raw,{get:(o,k)=>k in o?o[k]:()=>{}});
const canvas={getContext:()=>gl,addEventListener:(n,f)=>events[n]=f};
const scope=vm.createContext({document:{createElement:()=>canvas},console,Math,Float32Array});
for(const file of ['motion-fx.js','lightning-storm.js','cinematic-fx.js','machine-geometry.js','live-renderer.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),scope);
const R=vm.runInContext('ReelRenderer',scope),r=new R({width:512,height:2048});assert.equal(r.ready,true,r.failure);
const reels=[-291,-97,97,291].map((x,i)=>({x,angle:i*Math.PI/2,velocity:-18,light:i/3,impactAt:0}));
const ctx={drawImage:()=>copies++};r.draw(ctx,reels,80,1);assert.equal(r.sceneTarget.width,canvas.width*2);assert.equal(r.sceneTarget.height,canvas.height*2);r.draw(ctx,reels,100,2);assert(r.sceneTarget.width*r.sceneTarget.height<=4194304);assert(r.sceneTarget.width<=4096);assert.equal(copies,2);assert(draws>100);
let prevented=false;events.webglcontextlost({preventDefault:()=>prevented=true});assert(prevented);assert.equal(r.draw(ctx,reels,200,1),false);
events.webglcontextrestored();assert.equal(r.ready,true,r.failure);assert.equal(r.draw(ctx,reels,300,2,true),true);assert(r.sceneTarget.width*r.sceneTarget.height<=4194304);
for(const density of [.1,.65,1,2,3,6])for(const edge of [1024,2048,4096]){const size=R.renderSize(1024,448,density,edge);assert(size.sceneWidth*size.sceneHeight<=4194304);assert(size.sceneWidth<=edge&&size.sceneHeight<=edge);assert(size.width<=edge&&size.height<=edge);assert(Math.abs(size.sceneWidth/size.sceneHeight-1024/448)<.02);}
raw.checkFramebufferStatus=()=>-1;assert.equal(r.draw(ctx,reels,400,.75),false,'failed target allocation selects Canvas fallback');assert.equal(r.ready,false);
console.log('PASS: 3D initialization and draw calls, complete vertex buffers, separate shadow/scene targets, resize, context loss and restoration. Shader compilation is outside this test.');
