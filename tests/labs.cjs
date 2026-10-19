const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const scope=vm.createContext({crypto:crypto.webcrypto});
vm.runInContext(fs.readFileSync(__dirname+'/../dist/bonus.js','utf8'),scope);
vm.runInContext(fs.readFileSync(__dirname+'/../dist/results-api.js','utf8')+';globalThis.api=LiveWireAPI;',scope);
const api=scope.api,copy=()=>({payouts:[...api.defaults.payouts],probabilities:[...api.defaults.probabilities]});
(async()=>{
  assert(Math.abs(api.metrics().rtp-.97152)<1e-12);assert(Math.abs(api.metrics().hitRate-.5904)<1e-12);
  for(const target of [0,.5,.9,.97,1]){
    const model=api.rebalance(copy(),target);assert(Math.abs(api.metrics(model).rtp-target)<1e-10);
    assert(Math.abs(model.probabilities.reduce((a,b)=>a+b,0)-1)<1e-12);
    if(target>0)assert(Math.abs(model.probabilities[2]/model.probabilities[4]-96)<1e-6);
  }
  const bad=[{...copy(),payouts:[0,0,NaN,10,1000]},{...copy(),payouts:[1,0,2,10,1000]}, {...copy(),payouts:[0,0,.25,10,1000]}, {...copy(),probabilities:[1,.3,.2,.032,.0002]}, {...copy(),probabilities:[-.1,.3,.7,.1,0]}];
  for(const model of bad){assert.throws(()=>api.apply(model));assert(Math.abs(api.metrics().rtp-.97152)<1e-12);}
  assert.throws(()=>api.rebalance({payouts:[0,.5,0,0,0],probabilities:[.5,.5,0,0,0]},.97));
  assert.throws(()=>api.rebalance({payouts:[0,0,0,0,0],probabilities:[1,0,0,0,0]},.97));
  for(let wins=0;wins<=4;wins++){
    const forced=api.testDraw(wins);assert.equal(forced.wins,wins);assert.equal(forced.forced,true);assert.equal(forced.symbols.reduce((a,b)=>a+b,0),wins);
  }
  assert.throws(()=>api.testDraw(5));
  const allTwo={payouts:[0,0,2,20,140],probabilities:[0,0,1,0,0]};api.apply(allTwo);
  assert.equal(api.table[2].probability,1);assert.equal(api.metrics().rtp,2);
  api.testDraw(4);for(let i=0;i<100;i++){const r=await api.draw();assert.equal(r.wins,2);assert.equal(r.forced,false);}
  // Rebalancing an all-paying model can add non-paying probability.
  assert(Math.abs(api.metrics(api.rebalance(allTwo,.97)).rtp-.97)<1e-12);
  api.apply(copy());
  const nodes={};const el=id=>nodes[id]??={value:'',textContent:'',innerHTML:'',events:{},disabled:false,open:false,classList:{add(){},remove(){},toggle(){}},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();}};
  let locked=false,testResult=null,paytable=null;
  const game={beginMaths(){if(locked)return false;locked=true;return true;},endMaths(){locked=false;},canTest(){return true;},applyMaths(m){assert(locked);const c=api.apply(m);paytable=api.table;return c;},testSpin(wins){assert.equal(locked,false);testResult=api.testDraw(wins);}};
  const ui=vm.createContext({document:{getElementById:el,documentElement:el('root')},LiveWireAPI:api,LiveWireGame:game});
  vm.runInContext(fs.readFileSync(__dirname+'/../dist/odds.js','utf8'),ui);
  el('labsOpen').onclick();assert.equal(el('mathsDialog').open,true);assert.equal(el('labsRtp').textContent,'97.152%');
  el('labsChance2').value='99';el('mathsRows').events.input();assert.equal(el('labsApply').disabled,true);el('labsApply').onclick();assert(Math.abs(api.metrics().rtp-.97152)<1e-12);
  el('labsReset').onclick();el('labsTarget').value='95';el('labsBalance').onclick();assert.equal(el('labsRtp').textContent,'95.000%');
  el('labsOutcome').value='0';el('labsApply').onclick();assert.equal(el('mathsDialog').open,false);assert(Math.abs(api.metrics().rtp-.95)<1e-8);assert.equal(paytable.length,5);
  el('labsOpen').onclick();el('labsPay4').value='140';el('labsOutcome').value='4';el('labsTest').onclick();assert.equal(testResult.wins,4);assert(testResult.multiplier>=30&&testResult.multiplier<=1000);assert(testResult.forced);assert.equal(el('mathsDialog').open,false);
  el('labsOpen').onclick();el('labsPay2').value='';el('mathsRows').events.input();assert.equal(el('labsApply').disabled,true);
  el('labsReset').onclick();el('labsApply').onclick();assert(Math.abs(api.metrics().rtp-.97152)<1e-12);
  console.log('PASS: Labs validation, exact target balancing, impossible targets, live metrics, apply/reset, dynamic paytable, forced test outcomes and random resumption.');
})().catch(e=>{console.error(e);process.exitCode=1;});
