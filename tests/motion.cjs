const vm=require('vm'),fs=require('fs'),assert=require('assert');
const s=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/../dist/motion.js','utf8')+';globalThis.m=ReelMotion',s);const m=s.m;
function run(pattern,turbo=false,fps=120){
 const ps=pattern.map((symbol,i)=>m.plan(i*.7,symbol,i,turbo,false,()=>.5));let count=0;const stops=[],previous=ps.map(p=>p.start);
 for(let t=0;t<12;t+=1/fps)for(let i=0;i<4;i++){
  const p=ps[i],v=m.sample(p,t);
  assert(Number.isFinite(v.angle)&&Number.isFinite(v.velocity));assert(v.angle<=previous[i]+1e-8,'no reversing or bounce');previous[i]=v.angle;
  if(v.phase==='cruise')assert.equal(v.velocity,-p.speed,'steady shared speed');
  if(v.done&&stops[i]===undefined){stops[i]=t;count+=pattern[i];if(i<3){const n=ps[i+1];m.schedule(n,t+Math.max(.025,n.interval-n.brake-n.settleTime)+count*n.extension);}}
 }
 assert(stops.every((t,i)=>i===0||t>stops[i-1]));assert(stops[3]<8,'bounded total spin');
 ps.forEach(p=>{assert(Math.abs(m.wrap(p.target)-p.stop*Math.PI/2)<1e-8||Math.abs(m.wrap(p.target)-2*Math.PI)<1e-8);for(const t of [p.delay,p.delay+p.acceleration,p.brakeAt,p.brakeAt+p.brake,p.end]){const a=m.sample(p,t-1e-7),b=m.sample(p,t+1e-7);assert(Math.abs(a.angle-b.angle)<1e-4,'continuous position');assert(Math.abs(a.velocity-b.velocity)<1e-3,'continuous velocity');}});
 return {ps,stops};
}
for(const turbo of [false,true])for(const fps of [30,60,120])for(let mask=0;mask<16;mask++)run([0,1,2,3].map(i=>(mask>>i)&1),turbo,fps);
for(const pair of [[[1,0,1,0],[1,0,1,1]],[[0,0,1,0],[0,0,1,1]],[[1,1,1,0],[1,1,1,1]]]){
 const a=run(pair[0]),b=run(pair[1]);assert.deepEqual(a.stops,b.stops,'next outcome cannot change stop schedule');
 const p=a.ps[3],q=b.ps[3];for(let t=0;t<p.brakeAt;t+=.01)assert.deepEqual(m.sample(p,t),m.sample(q,t),'identical motion before braking despite different results');
}
for(const input of [{...m.defaults,speed:32,brake:.28},{...m.defaults,speed:70,brake:.6,anticipation:.18,settle:.012}]){m.apply(input);run([1,1,1,0]);run([0,0,1,1],true);}
m.apply(m.defaults);assert.throws(()=>m.apply({...m.defaults,speed:NaN}));
console.log('PASS: all 16 patterns at 30/60/120fps normal/Turbo; shared cruise speed, continuous monotonic motion, exact stops, bounded timing, and no outcome-dependent anticipation.');
