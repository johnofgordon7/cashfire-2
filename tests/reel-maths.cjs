const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let tickets=[];const scope={crypto:{getRandomValues(a){assert(tickets.length,'Unexpected RNG request');a[0]=tickets.shift();}}};vm.createContext(scope);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/bonus.js','utf8')+';globalThis.bonus=LiveWireBonus;',scope);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/results-api.js','utf8')+';globalThis.api=LiveWireAPI;',scope);
(async()=>{
 const {api,bonus}=scope,counts=[0,0,0,0,0],patterns=new Map();
 // Every equiprobable 5^4 reel draw. Zero is bolt, 1–4 are X.
 for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++)for(let d=0;d<5;d++){
  const draws=[a,b,c,d],expected=draws.map(v=>v===0?1:0),wins=expected.reduce((x,y)=>x+y,0);tickets=[...draws,...(wins>=3?[0]:[])];
  const result=await api.draw();assert.deepEqual([...result.symbols],expected);assert.equal(result.wins,wins);assert.equal(tickets.length,0);counts[wins]++;patterns.set(result.mask,(patterns.get(result.mask)||0)+1);
  if(wins<3)assert.equal(result.multiplier,[0,.2,1][wins]);else assert.equal(result.multiplier,bonus.profile(wins).min);
 }
 assert.deepEqual(counts,[256,256,96,16,1]);assert.equal(patterns.size,16);
 const probabilities=counts.map(n=>n/625);assert.deepEqual([...api.defaults.probabilities],probabilities);
 assert.deepEqual([...api.defaults.payouts],[0,.2,1,20,140]);
 assert(Math.abs(api.metrics().rtp-.97152)<1e-12);assert(Math.abs(api.metrics().hitRate-.5904)<1e-12);
 for(let reel=0;reel<4;reel++){const boltMass=[...patterns].reduce((s,[mask,n])=>s+((mask>>reel)&1?n:0),0);assert.equal(boltMass/625,.2);}
 for(const count of [3,4]){const values=Array.from({length:100},(_,ticket)=>bonus.pick(count,ticket)),p=bonus.profile(count);assert.equal(values.reduce((a,b)=>a+b,0)/100,p.mean);assert.equal(Math.min(...values),p.min);assert.equal(Math.max(...values),p.max);}
 // Rejection sampling must discard the five-way tail rather than biasing a reel.
 tickets=[4294967295,1,1,1,1];assert.equal((await api.draw()).wins,0);assert.equal(tickets.length,0);
 const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8'),live=fs.readFileSync(__dirname+'/../dist/live.js','utf8');
 assert(!/average|\bavg\b|10–100|30–1,000/i.test(html+live));assert(html.includes('Win up to 100×'));assert(html.includes('Win up to 1,000×'));
 console.log('PASS: exhaustive independent 20% reel draws (625 states), all16 layouts, exact binomial probabilities, 0.2x/1x base returns, 20x/140x bonus means, 97.152% RTP, unbiased RNG and no player-facing averages.');
})().catch(e=>{console.error(e);process.exitCode=1;});
