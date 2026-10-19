'use strict';
// Real perspective meshes, GGX materials, shadow mapping and an optical finish pass.
// ReelMotion owns the result. This renderer never selects or changes an outcome.
class ReelRenderer {
  constructor(strip) {
    this.canvas=document.createElement('canvas');
    this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    this.strip=strip;this.ready=false;this.width=1024;this.height=448;
    if(!this.gl)return;
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
    this.canvas.addEventListener('webglcontextrestored',()=>{try{this.init();}catch(e){this.failure=e.message;this.ready=false;}});
    try{this.init();}catch(e){this.failure=e.message;this.ready=false;}
  }
  program(vertex,fragment,names) {
    const gl=this.gl,shaders=[];
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));shaders.push(s);
    }
    const p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));shaders.forEach(s=>gl.deleteShader(s));
    return {handle:p,attributes:['position','normal','texcoord'].map(n=>gl.getAttribLocation(p,n)),uniforms:Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,n)]))};
  }
  init() {
    const gl=this.gl,G=MachineGeometry;
    this.maxTargetEdge=Math.min(Number(gl.getParameter(gl.MAX_TEXTURE_SIZE))||4096,Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))||4096);
    this.material=this.program(ReelRenderer.vertex,ReelRenderer.fragment,['model','viewProjection','lightProjection','eye','strip','shadow','base','surface','velocity','illumination','strikes']);
    this.depth=this.program(ReelRenderer.depthVertex,ReelRenderer.depthFragment,['model','viewProjection']);
    this.finish=this.program(ReelRenderer.screenVertex,ReelRenderer.screenFragment,['scene','pixel']);
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    this.upload();this.shadowTarget=this.target(1024,1024,true);this.sceneTarget=this.target(2,2,false);
    // A level, centered camera keeps all four reels square to the player.
    const view=ReelRenderer.cameraSetup(this.width,this.height);
    this.eye=view.eye;this.camera=view.camera;
    this.light=G.multiply(G.ortho(-660,660,-450,450,100,2500),G.lookAt([-650,960,850],[0,-20,0]));
    this.build();gl.disable(gl.DITHER);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);this.ready=true;
  }
  target(width,height,nearest) {
    const gl=this.gl,t={frame:gl.createFramebuffer(),color:gl.createTexture(),depth:gl.createRenderbuffer(),width,height};
    gl.bindTexture(gl.TEXTURE_2D,t.color);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest?gl.NEAREST:gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindRenderbuffer(gl.RENDERBUFFER,t.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
    gl.bindFramebuffer(gl.FRAMEBUFFER,t.frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.color,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,t.depth);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteTexture(t.color);gl.deleteRenderbuffer(t.depth);gl.deleteFramebuffer(t.frame);
      throw Error('Machine render target unavailable');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);return t;
  }
  mesh(data) {const gl=this.gl,buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer,count:data.length/8};}
  build() {
    const G=MachineGeometry,staticParts={},rotating={},add=(group,mat,mesh,m)=>G.append(group[mat]||(group[mat]=[]),mesh,m);
    this.barrel=this.mesh(G.lathe([[-84,0],[-84,126],[-81,132],[-77,136],[77,136],[81,132],[84,126],[84,0]],192));
    for(const side of [-1,1]) {
      const x=side*88;
      add(rotating,'rubber',G.ring(x,18,122,139,2));
      add(rotating,'copper',G.ring(x,14,131,150,3));
      add(rotating,'chrome',G.ring(x+side*4.7,2.2,141.5,147.2,.8));
      add(rotating,'copper',G.ring(x-side*5.6,1.6,135.5,140.2,.6));
      add(rotating,'light',G.ring(x,1.5,149.4,150.5,.45));
      // Continuous machined rims keep the silhouette clean at every display size.
    }
    this.rotating=Object.entries(rotating).map(([material,data])=>({material,mesh:this.mesh(data)}));
    add(staticParts,'dark',G.lathe([[-461,0],[-461,21],[-455,28],[455,28],[461,21],[461,0]]));
    for(const side of [-1,1]) {
      const x=side*415;
      add(staticParts,'gunmetal',G.ring(x,49,26,116,7));
      add(staticParts,'copper',G.ring(x-side*14,9,30,123,2.4));
      add(staticParts,'chrome',G.ring(x+side*24,3.5,32,106,1.4));
      add(staticParts,'gunmetal',G.ring(x+side*27,7,30,90,2));
      add(staticParts,'copper',G.ring(x+side*31,3,32,64,1));
      add(staticParts,'rubber',G.ring(x+side*34,3,27,55,.8));
      add(staticParts,'chrome',G.lathe([[-2,0],[-2,34],[0,37],[4,37],[6,34],[6,0]],6,true),G.translation(x+side*38,0,0));
      for(let j=0;j<10;j++) {
        const a=j/10*G.TAU,placement=G.translation(x+side*33,Math.sin(a)*76,Math.cos(a)*76);
        add(staticParts,'chrome',G.ring(0,4,0,5.8,1,6),placement);
        add(staticParts,'dark',G.ring(side*2.1,.6,0,2.7,.15,6),placement);
      }
      add(staticParts,'gunmetal',G.roundedBox(57,86,83,7),G.translation(x,-137,-17));
      add(staticParts,'copper',G.roundedBox(69,7,94,2),G.translation(x,-175,-17));
      add(staticParts,'rubber',G.roundedBox(133,10,147,4),G.translation(side*337,-209,-15));
    }
    add(staticParts,'gunmetal',G.roundedBox(936,26,197,8),G.translation(0,-190,-18));
    add(staticParts,'copper',G.roundedBox(916,5,190,2),G.translation(0,-202,-18));
    add(staticParts,'dark',G.roundedBox(855,10,4,1),G.translation(0,-187,82));
    add(staticParts,'light',G.roundedBox(828,1.3,2,.5),G.translation(0,-182,85));
    for(const x of [-291,-97,97,291])add(staticParts,'chrome',G.ring(0,2,0,4.2,.4,32),G.multiply(G.translation(x,-191,86),G.rotateY(-Math.PI/2)));
    this.static=Object.entries(staticParts).map(([material,data])=>({material,mesh:this.mesh(data)}));
    this.materials={
      ceramic:{base:[1,1,1],surface:[.28,.04,1,0]},
      copper:{base:[.84,.45,.22],surface:[.29,.94,0,0]},
      chrome:{base:[.71,.8,.88],surface:[.23,.98,0,0]},
      gunmetal:{base:[.10,.16,.22],surface:[.32,.84,0,0]},
      dark:{base:[.028,.047,.071],surface:[.38,.7,0,0]},
      rubber:{base:[.009,.014,.022],surface:[.73,.1,0,0]},
      light:{base:[.98,.48,.12],surface:[.2,.25,0,1]}
    };
  }
  upload() {
    if(!this.gl||!this.texture)return;
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
    // Image-space Y: v=0 is the strip's top. Do not flip the upload.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.strip);gl.generateMipmap(gl.TEXTURE_2D);
  }
  bind(mesh,program) {
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    for(let i=0;i<3;i++){const a=program.attributes[i];if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,i===0?0:i===1?12:24);}}
  }
  static cameraSetup(width=1024,height=448) {
    const G=MachineGeometry,eye=[0,-20,3200];
    return {eye,camera:G.multiply(G.perspective(8.2*Math.PI/180,width/height,100,8000),G.lookAt(eye,[0,-20,0]))};
  }
  rootPose(reels,time,reduced) {
    // The cabinet and front-on camera stay fixed; each bearing owns its own contact.
    return MachineGeometry.identity();
  }
  seat(reel,time,reduced) { return ReelPresentation.seat(reel,time,reduced); }
  static renderSize(width,height,density,maxEdge=4096) {
    // Fixed allocation budget, not an adaptive quality score or measured FPS tier.
    // Retain 2x antialiasing where it fits; limit only the decorative scene target.
    const d=Math.min(Math.max(.65,Math.min(3,Number(density)||1)),maxEdge/width,maxEdge/height);
    const outputWidth=Math.max(1,Math.round(width*d)),outputHeight=Math.max(1,Math.round(height*d));
    const desiredWidth=outputWidth*2,desiredHeight=outputHeight*2;
    const fit=Math.min(1,Math.sqrt(4194304/(desiredWidth*desiredHeight)),maxEdge/desiredWidth,maxEdge/desiredHeight);
    return {width:outputWidth,height:outputHeight,sceneWidth:Math.max(1,Math.floor(desiredWidth*fit)),sceneHeight:Math.max(1,Math.floor(desiredHeight*fit))};
  }
  strikePoint(reel,reels,time,reduced) {
    const G=MachineGeometry,point=G.point(G.multiply(this.camera,this.rootPose(reels,time,reduced)),[reel.x,this.seat(reel,time,reduced),140]);
    return [point[0]/point[3]*this.width/2,-point[1]/point[3]*this.height/2];
  }
  objects(reels,time,reduced) {
    const G=MachineGeometry,objects=[],root=this.rootPose(reels,time,reduced);
    for(const part of this.static)objects.push({...part,model:root,velocity:0,light:.13});
    for(const r of reels) {
      const seat=this.seat(r,time,reduced);
      const model=G.multiply(root,G.multiply(G.translation(r.x,seat,0),G.rotateX(-r.angle)));
      objects.push({mesh:this.barrel,material:'ceramic',model,velocity:r.velocity||0,light:r.light||0});
      for(const part of this.rotating)objects.push({...part,model,velocity:0,light:r.light||0});
    }return objects;
  }
  draw(ctx,reels,time,density,reduced=false) {
    if(!this.ready)return false;
    try { return this.render(ctx,reels,time,density,reduced); }
    catch(error) { this.failure=error.message;this.ready=false;return false; }
  }
  render(ctx,reels,time,density,reduced) {
    const gl=this.gl,{width,height,sceneWidth,sceneHeight}=ReelRenderer.renderSize(this.width,this.height,density,this.maxTargetEdge);
    if(this.canvas.width!==width||this.canvas.height!==height||this.sceneTarget.width!==sceneWidth||this.sceneTarget.height!==sceneHeight) {
      this.canvas.width=width;this.canvas.height=height;const t=this.sceneTarget;gl.deleteTexture(t.color);gl.deleteRenderbuffer(t.depth);gl.deleteFramebuffer(t.frame);this.sceneTarget=this.target(sceneWidth,sceneHeight,false);
    }
    const objects=this.objects(reels,time,reduced),p=this.depth;
    gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.depthMask(true);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowTarget.frame);gl.viewport(0,0,1024,1024);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p.handle);gl.uniformMatrix4fv(p.uniforms.viewProjection,false,this.light);
    gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3);
    for(const o of objects){this.bind(o.mesh,p);gl.uniformMatrix4fv(p.uniforms.model,false,o.model);gl.drawArrays(gl.TRIANGLES,0,o.mesh.count);}gl.disable(gl.POLYGON_OFFSET_FILL);
    const m=this.material,u=m.uniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.sceneTarget.frame);gl.viewport(0,0,this.sceneTarget.width,this.sceneTarget.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(m.handle);
    gl.uniformMatrix4fv(u.viewProjection,false,this.camera);gl.uniformMatrix4fv(u.lightProjection,false,this.light);gl.uniform3fv(u.eye,this.eye);gl.uniform4fv(u.strikes,reels.map(r=>ReelLightning.strength(r,time,reduced)));
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(u.strip,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.shadowTarget.color);gl.uniform1i(u.shadow,1);
    for(const o of objects) {
      const material=this.materials[o.material];this.bind(o.mesh,m);gl.uniformMatrix4fv(u.model,false,o.model);gl.uniform3fv(u.base,material.base);gl.uniform4fv(u.surface,material.surface);gl.uniform1f(u.velocity,o.velocity);gl.uniform1f(u.illumination,o.light);gl.drawArrays(gl.TRIANGLES,0,o.mesh.count);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const f=this.finish;gl.useProgram(f.handle);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.sceneTarget.color);gl.uniform1i(f.uniforms.scene,0);gl.uniform2f(f.uniforms.pixel,1/this.sceneTarget.width,1/this.sceneTarget.height);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
    for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(f.attributes[0]);gl.vertexAttribPointer(f.attributes[0],2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
    ctx.drawImage(this.canvas,-this.width/2,-this.height/2,this.width,this.height);return true;
  }
}
ReelRenderer.vertex=`
attribute vec3 position,normal; attribute vec2 texcoord;
uniform mat4 model,viewProjection,lightProjection;
varying vec3 world,N,axis; varying vec2 uv; varying vec4 shadowCoord;
void main(){vec4 p=model*vec4(position,1.);world=p.xyz;N=mat3(model)*normal;axis=mat3(model)*vec3(1.,0.,0.);uv=texcoord;shadowCoord=lightProjection*p;gl_Position=viewProjection*p;}`;
ReelRenderer.fragment=`
precision highp float;
uniform sampler2D strip,shadow; uniform vec3 eye,base; uniform vec4 surface,strikes; uniform float velocity,illumination;
varying vec3 world,N,axis; varying vec2 uv; varying vec4 shadowCoord;
const float PI=3.141592653589793;
float relief(vec2 p){vec3 c=texture2D(strip,p).rgb;return 1.-smoothstep(.40,.84,min(c.r,min(c.g,c.b)));}
float unpack(vec4 c){return dot(c,vec4(1./16777216.,1./65536.,1./256.,1.));}
float visibility(vec3 n){
  vec3 p=shadowCoord.xyz/shadowCoord.w*.5+.5;
  if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;
  float bias=max(.00012,.0005*(1.-dot(n,normalize(vec3(-.53,.78,.69))))),sum=0.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=unpack(texture2D(shadow,p.xy+vec2(float(x),float(y))/1024.));sum+=step(p.z-bias,d);}return sum/9.;
}
vec3 studio(vec3 r,float rough){
  float spread=rough*.17;vec3 env=mix(vec3(.013,.024,.048),vec3(.22,.31,.42),smoothstep(-.35,.9,r.y));
  float top=exp(-pow(abs((r.y-.62)/(.13+spread)),4.))*exp(-pow(abs((r.x+.23)/.78),4.));
  float stripLight=exp(-pow((r.y-.18)/(.018+spread*.3),2.));
  float cyan=exp(-pow((r.x-.82)/(.1+spread),2.))*smoothstep(-.65,.1,r.y);
  float warm=exp(-pow((r.x+.72)/(.065+spread),2.))*smoothstep(-.5,.5,r.y);
  env+=vec3(2.6,2.5,2.3)*top+vec3(.65,.82,1.1)*stripLight;return env+vec3(.09,.8,1.6)*cyan+vec3(1.35,.67,.29)*warm;
}
vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 color,float rough,float metal,vec3 power){
  vec3 h=normalize(v+l);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
  float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.,D=a2/(PI*den*den+.00001);
  float k=(rough+1.)*(rough+1.)/8.,G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);
  vec3 F=mix(vec3(.04),color,metal);F+=(1.-F)*pow(1.-vh,5.);
  return ((1.-F)*(1.-metal)*color/PI+D*G*F/(4.*nv*nl+.0001))*power*nl;
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec3 n=normalize(N),v=normalize(eye-world),color=base;float rough=surface.x,metal=surface.y,ao=1.;vec3 ink=vec3(0.);float ceramic=surface.z;
  if(ceramic>.5){
    float sampleV=.125-uv.y,exposure=min(.018,.55/max(abs(velocity),.001));
    if(abs(velocity)>.08){for(int j=0;j<8;j++)ink+=texture2D(strip,vec2(uv.x,sampleV-velocity*exposure*(float(j)+.5)/(8.*2.*PI))).rgb/8.;}
    else ink=texture2D(strip,vec2(uv.x,sampleV)).rgb;
    color=pow(ink,vec3(2.2));ao=.54+.46*smoothstep(0.,.055,min(uv.x,1.-uv.x));rough=.22;metal=.055;
    // The artwork has a raised enamel edge; use the rotating surface's tangent basis.
    if(abs(velocity)<3.&&abs(dot(n,normalize(axis)))<.5){
      vec2 p=vec2(uv.x,sampleV);
      float dx=relief(p+vec2(.001953,0.))-relief(p-vec2(.001953,0.));
      float dy=relief(p+vec2(0.,.000488))-relief(p-vec2(0.,.000488));
      vec3 tangent=normalize(axis),bitangent=normalize(cross(n,tangent));
      n=normalize(n-tangent*dx*.38-bitangent*dy*.38);
    }
  }else{color=pow(color,vec3(2.2));}
  float shadowLight=visibility(n);
  vec3 lit=brdf(n,v,normalize(vec3(-.53,.78,.69)),color,rough,metal,vec3(3.8,3.3,2.75))*mix(.10,1.,shadowLight);
  lit+=brdf(n,v,normalize(vec3(.75,.18,.85)),color,rough,metal,vec3(.32,.72,1.25));
  lit+=brdf(n,v,normalize(vec3(.3,.45,-.8)),color,rough,metal,vec3(.12,.95,1.8));
  lit+=brdf(n,v,normalize(vec3(-.6,-.35,.65)),color,rough,metal,vec3(.12,.2,.3));
  vec3 f0=mix(vec3(.04),color,metal),F=f0+(1.-f0)*pow(1.-max(dot(n,v),0.),5.);vec3 env=studio(reflect(-v,n),rough);
  lit+=env*F*(1.-rough*.5)+color*(1.-metal)*(.065+.12*max(n.y,0.));
  if(ceramic>.5){lit+=env*.025;float cyan=smoothstep(.13,.38,ink.b-ink.r)*smoothstep(.05,.25,ink.g-ink.r);lit+=vec3(.015,.23,.42)*cyan*illumination;}
  if(surface.w>.5)lit+=vec3(.025,.7,1.1)*(.65+illumination*1.3);
  for(int i=0;i<4;i++){
    if(strikes[i]<.001)continue;
    vec3 direction=vec3(-291.+194.*float(i),25.,195.)-world;
    float falloff=strikes[i]/(1.+dot(direction,direction)/12000.);
    lit+=brdf(n,v,normalize(direction),color,rough,metal,vec3(.12,2.9,6.5))*falloff;
  }
  lit*=ao;vec3 mapped=pow(aces(lit),vec3(1./2.2));float dither=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;gl_FragColor=vec4(mapped+dither,1.);
}`;
ReelRenderer.depthVertex=`attribute vec3 position;uniform mat4 model,viewProjection;void main(){gl_Position=viewProjection*model*vec4(position,1.);}`;
ReelRenderer.depthFragment=`precision highp float;void main(){vec4 p=fract(gl_FragCoord.z*vec4(16777216.,65536.,256.,1.));p-=p.xxyz*vec4(0.,1./256.,1./256.,1./256.);gl_FragColor=p;}`;
ReelRenderer.screenVertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
ReelRenderer.screenFragment=`
precision highp float;uniform sampler2D scene;uniform vec2 pixel;varying vec2 uv;
vec3 bright(vec2 p){vec4 c=texture2D(scene,p);float l=max(c.r,max(c.g,c.b));return c.rgb*smoothstep(.78,1.,l)*c.a;}
void main(){
  // Average premultiplied RGBA so metal edges and transparent silhouettes
  // both receive antialiasing without dark outlines or blurring the symbols.
  vec2 h=pixel*.5;
  vec4 c=(texture2D(scene,uv+vec2(-h.x,-h.y))
         +texture2D(scene,uv+vec2(h.x,-h.y))
         +texture2D(scene,uv+vec2(-h.x,h.y))
         +texture2D(scene,uv+vec2(h.x,h.y)))*.25;
  vec3 bloom=vec3(0.);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)bloom+=bright(uv+vec2(float(x),float(y))*pixel*4.5)/9.;
  bloom*=.065;float a=max(c.a,max(bloom.r,max(bloom.g,bloom.b)));gl_FragColor=vec4(min(c.rgb+bloom,vec3(a)),a);
}`;
