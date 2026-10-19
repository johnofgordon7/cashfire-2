const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');const s=vm.createContext({});
for(const name of ['motion.js','anticipation.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+name,'utf8'),s);vm.runInContext('globalThis.motion=ReelMotion;globalThis.fx=ReelAnticipation',s);const m=s.motion,fx=s.fx;
function run(pattern,turbo,fps,reduced=false){
 const reels=pattern.map((v,i)=>({x:i*194,motion:m.plan(i*.7,v,i,turbo,false,()=>.5),stopped:false})),previous=reels.map(r=>r.motion.start),stops=[],tiers=[];let count=0;
 for(let t=0;t<12;t+=1/fps)for(let i=0;i<4;i++){
  const r=reels[i],p=r.motion,v=m.sample(p,t,reduced);assert(Number.isFinite(v.angle)&&Number.isFinite(v.velocity));assert(v.angle<=previous[i]+1e-8,'monotonic forward travel');previous[i]=v.angle;
  if(v.done&&!r.stopped){r.stopped=true;stops[i]=t;count+=pattern[i];if(i<3){const n=reels[i+1],tier=fx.begin(reels,i+1,count,t,t*1000,reduced);tiers.push(tier);if(!tier||reduced)m.schedule(n.motion,t+Math.max(.025,n.motion.interval-n.motion.brake-n.motion.settleTime)+count*n.motion.extension);if(tier&&!reduced){const a=n.motion.anticipation;assert.equal(a.level,tier);assert(a.speed<n.motion.speed*.25);assert.equal(fx.active(n),true);}}}
 }
 assert(stops.every((v,i)=>i===0||v>stops[i-1]));assert(stops[3]<11);assert.equal(reels.filter(fx.active).length,0);
 for(const {motion:p} of reels){assert(Math.abs(m.wrap(p.target)-p.stop*Math.PI/2)<1e-8||Math.abs(m.wrap(p.target)-2*Math.PI)<1e-8);for(const t of [p.brakeAt,p.brakeAt+p.brake,p.end,...(p.anticipation?[p.anticipation.at,p.anticipation.at+p.anticipation.ramp]:[])]){const a=m.sample(p,t-1e-7),b=m.sample(p,t+1e-7);assert(Math.abs(a.angle-b.angle)<1e-4,'continuous angles');assert(Math.abs(a.velocity-b.velocity)<1e-3,'continuous speeds');}}
 return {reels,stops,tiers};
}
for(const turbo of [false,true])for(const fps of [30,60,120])for(let mask=0;mask<16;mask++){const pattern=[0,1,2,3].map(i=>(mask>>i)&1),r=run(pattern,turbo,fps);assert.deepEqual(r.tiers,pattern.slice(0,3).map((_,i)=>fx.level(pattern.slice(0,i+1).reduce((a,b)=>a+b,0),i)));}
assert.deepEqual(run([1,1,0,0],false,120).tiers,[0,1,1],'two bolts: spotlight next, then final after X');
assert.deepEqual(run([1,0,1,0],false,120).tiers,[0,0,1],'separated bolts trigger with one reel left');
assert.deepEqual(run([0,1,1,0],false,120).tiers,[0,0,1]);
assert.deepEqual(run([1,1,1,0],false,120).tiers,[0,1,2],'three consecutive bolts upgrade final reel');
const regular=run([1,1,0,0],false,120),mega=run([1,1,1,0],false,120);assert(mega.stops[3]-mega.stops[2]>regular.stops[3]-regular.stops[2]);
for(const pair of [[[1,1,0,0],[1,1,0,1]],[[1,1,1,0],[1,1,1,1]],[[0,1,1,0],[0,1,1,1]]]){const a=run(pair[0],false,120),b=run(pair[1],false,120);assert.deepEqual(a.stops,b.stops,'next result never controls timing');for(let t=0;t<a.reels[3].motion.brakeAt;t+=.01)assert.deepEqual(m.sample(a.reels[3].motion,t),m.sample(b.reels[3].motion,t));}
const quiet=run([1,1,1,1],false,120,true);assert(quiet.reels.every(r=>!r.motion.anticipation),'reduced motion avoids prolonged slow travel');assert.deepEqual(quiet.tiers,[0,1,2],'steady highlight still conveys anticipation');
console.log('PASS: all16 arrangements at30/60/120Hz normal/Turbo; confirmed-only triggers, separated bolts, escalating final spotlight, bounded slow reveals, continuous motion, exact stops, next-result independence and reduced motion.');
