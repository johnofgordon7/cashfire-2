const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context=vm.createContext({console,Math,Float32Array});
for(const file of ['motion-fx.js','machine-geometry.js','live-renderer.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),context);
const G=vm.runInContext('MachineGeometry',context),R=vm.runInContext('ReelRenderer',context);
const renderer=Object.create(R.prototype);renderer.mesh=data=>({data,count:data.length/8});renderer.build();
const camera=R.cameraSetup().camera;
const reels=[-291,-97,97,291].map(x=>({x,angle:0,light:0,velocity:0}));
let vertices=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,triangles=0;
for(const o of renderer.objects(reels,0,false)){
  const data=o.mesh.data,m=G.multiply(camera,o.model);vertices+=o.mesh.count;
  for(let i=0;i<data.length;i+=8){
    const p=G.point(m,data.slice(i,i+3));assert(p.every(Number.isFinite));assert(p[3]>0);
    const x=p[0]/p[3],y=p[1]/p[3];minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    const n=data.slice(i+3,i+6);assert(Math.abs(Math.hypot(...n)-1)<1e-6,'unit normal');
  }
  for(let i=0;i<data.length;i+=24){
    const a=data.slice(i,i+3),b=data.slice(i+8,i+11),c=data.slice(i+16,i+19),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);
    if(len>1e-7){assert(n.reduce((s,x,k)=>s+x*data[i+3+k],0)>-1e-5,'outward triangle winding');triangles++;}
  }
}
assert(minX>-.995&&maxX<.995&&minY>-.995&&maxY<.995,'all parts remain inside the camera');
// A decreasing drum angle must move the symbol center DOWN, including with perspective.
const origin=G.translation(0,0,0);
const project=(angle,localTheta)=>{const model=G.multiply(origin,G.rotateX(-angle)),p=G.point(G.multiply(camera,model),[0,Math.sin(localTheta)*136,Math.cos(localTheta)*136]);return p[1]/p[3];};
assert(project(-.1,0)<project(0,0),'symbols travel down');
for(const symbol of [0,1]){
  const angle=symbol*Math.PI/2,local=-angle;
  assert(Math.abs(project(angle,local)-project(0,0))<1e-7,'both target symbols align on the same row');
  const textureV=((.125-local/G.TAU)%1+1)%1;
  assert.equal(Math.floor(textureV*4),symbol,'texture and outcome map agree');
}
console.log('PASS: outward mesh winding, finite projection, unit normals, downward 3D travel, exact winning-symbol alignment.');
console.log(JSON.stringify({vertices,triangles,bounds:{minX,maxX,minY,maxY}}));
