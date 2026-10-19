const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope=vm.createContext({});for(const name of ['motion-fx.js','lightning-storm.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+name,'utf8'),scope);
const P=vm.runInContext('ReelPresentation',scope),L=vm.runInContext('ReelLightning',scope);
const reel={x:0,impactAt:100};let max=0;
for(let t=0;t<=650;t+=2){const p=P.seat(reel,t);assert(Number.isFinite(p));max=Math.max(max,Math.abs(p));assert.equal(P.seat(reel,t,true),0);}
assert(max>1&&max<5.4);assert.equal(P.seat(reel,100),0);assert.equal(P.seat(reel,440),0);
for(const fps of [30,60,120])for(const duration of [650,1000,1350]){
 let previous=0;for(let t=0;t<duration;t+=1000/fps){const value=P.reveal(100000,t,duration);assert(value>=previous&&value<=100000);previous=value;}
 assert.equal(P.reveal(100000,duration,duration),100000);assert.equal(P.reveal(100000,2,duration,true),100000);
}
function record(reels,time,reduced=false,compact=false){
 const paths=[];let points=[],fills=0;
 const ctx=new Proxy({beginPath(){points=[]},moveTo(...p){points.push(p)},lineTo(...p){points.push(p)},stroke(){paths.push(points)},fillRect(){fills++},createRadialGradient(){return {addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:(...args)=>assert(args.every(a=>typeof a!=='number'||Number.isFinite(a)))});
 L.draw(ctx,reels,{ready:false},time,-260,reduced,compact);return {paths,fills};
}
const reels=[-291,-97,97,291].map(x=>({x}));assert.equal(L.land(reels,reels[0],100),1);
const a=record(reels,170),b=record(reels,230);assert.deepEqual(a.paths[0],b.paths[0],'primary lightning topology does not jitter over time');
const one=record(reels,170).paths.length;assert.equal(L.land(reels,reels[0],240),0,'contact event is deduplicated');
const before=L.strength(reels[0],450);L.land(reels,reels[2],450);const after=L.strength(reels[0],450);assert(after>=before*.8,'recharge does not extinguish an existing glow');
assert.equal(reels[1].strikeAt,undefined);assert.equal(reels[3].strikeAt,undefined);
assert.deepEqual(record(reels,490).paths[0],a.paths[0],'earlier bolt retains its original trunk when the tier changes');
L.land(reels,reels[1],700);L.land(reels,reels[3],950);
const full=record(reels,1020),low=record(reels,1020,false,true);assert(full.paths.length>one);assert(low.paths.length<full.paths.length,'phone quality reduces decoration work');assert(low.paths.length>one,'phone quality preserves tier escalation');
const reduced=record(reels,1020,true);assert.equal(reduced.paths.length,0);assert.equal(reduced.fills,4);
assert.equal(record(reels,950+L.duration+1).paths.length,0);assert.equal(record(reels,950+L.duration+1).fills,0);
assert.equal(P.live(reels,{start:0},6000),false,'presentation stops asking for frames');
for(const r of reels){delete r.impactAt;delete r.strikeAt;delete r.chargeAt;r.chargeHistory=[];}
assert.equal(record(reels,6000).paths.length,0,'new round removes all old lightning');
assert.equal(P.live([{impactAt:0}],{start:0},100,true),false);
console.log('PASS: bounded bearing settle, exact monotonic win reveals at 30/60/120Hz, fixed lightning topology, smooth recharge, event deduplication, phone quality, reduced motion, expiry and reset.');
