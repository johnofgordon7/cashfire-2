'use strict';
// Session-only design model. Default weights give exactly 97.152% theoretical RTP.
const LiveWireAPI=(()=>{
  const defaults=Object.freeze({payouts:Object.freeze([0,.2,1,20,140]),probabilities:Object.freeze([.4096,.4096,.1536,.0256,.0016])});
  let revision=0,active=validate(defaults);
  function validate(input){
    if(!input||!Array.isArray(input.payouts)||!Array.isArray(input.probabilities)||input.payouts.length!==5||input.probabilities.length!==5)throw Error('Enter all five outcomes.');
    const payouts=input.payouts.slice(),probabilities=input.probabilities.slice();
    if(payouts.some(p=>!Number.isFinite(p)||p<0||p>10000||Math.abs(p*10-Math.round(p*10))>1e-8))throw Error('Use payouts from 0 to 10,000× in steps of 0.1×.');
    if(payouts[3]!==20||payouts[4]!==140)throw Error('Bonus maths is fixed for this game.');
    if(payouts[0]!==0)throw Error('Zero bolts must pay 0×.');
    if(probabilities.some(p=>!Number.isFinite(p)||p<0||p>1))throw Error('Each probability must be between 0% and 100%.');
    if(Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)>1e-9)throw Error('Probabilities must total 100%.');
    return Object.freeze({payouts:Object.freeze(payouts),probabilities:Object.freeze(probabilities)});
  }
  function metrics(input=active){
    const model=validate(input),rtp=model.payouts.reduce((s,p,i)=>s+p*model.probabilities[i],0);
    const bonusVariance={3:437.5,4:58600};
    const variance=model.payouts.reduce((s,p,i)=>s+model.probabilities[i]*((p-rtp)**2+(bonusVariance[i]||0)),0);
    return {rtp,variance,standardDeviation:Math.sqrt(variance),hitRate:model.probabilities.reduce((s,p,i)=>s+(model.payouts[i]>0?p:0),0),netWinRate:model.probabilities.reduce((s,p,i)=>s+(model.payouts[i]>1?p:0),0)};
  }
  function rebalance(input,target){
    const model=validate(input),stats=metrics(model);
    if(!Number.isFinite(target)||target<0||target>1)throw Error('Target RTP must be between 0% and 100%.');
    if(stats.rtp===0&&target>0)throw Error('Give a paying outcome a non-zero probability first.');
    const factor=stats.rtp===0?0:target/stats.rtp;
    const payingMass=model.probabilities.reduce((s,p,i)=>s+(model.payouts[i]>0?p*factor:0),0);
    if(payingMass>1+1e-10)throw Error('This target is not possible with the current mix. Increase a payout or change the probabilities.');
    const losingMass=model.probabilities.reduce((s,p,i)=>s+(model.payouts[i]===0?p:0),0);
    const remaining=Math.max(0,1-payingMass);
    const probabilities=model.probabilities.map((p,i)=>model.payouts[i]>0?p*factor:losingMass>0?p/losingMass*remaining:i===0?remaining:0);
    return validate({payouts:model.payouts.slice(),probabilities});
  }
  function table(){return Object.freeze(active.probabilities.map((probability,wins)=>Object.freeze({wins,multiplier:active.payouts[wins],probability})));}
  function config(){return Object.freeze({id:revision?'labs-session-'+revision:'live-wire-independent-20-v1',...metrics(),betAmount:1,name:revision?'Labs session':'97.152% RTP / 1,000x top prize'});}
  function apply(input){const next=validate(input);active=next;revision++;return config();}
  function randomInt(bound){
    const a=new Uint32Array(1),limit=Math.floor(4294967296/bound)*bound;
    do{crypto.getRandomValues(a);}while(a[0]>=limit);
    return a[0]%bound;
  }
  function shuffle(wins){
    if(!Number.isInteger(wins)||wins<0||wins>4)throw Error('Invalid bolt count');
    const symbols=Array.from({length:4},(_,i)=>i<wins?1:0);
    for(let i=3;i>0;i--){const j=randomInt(i+1);[symbols[i],symbols[j]]=[symbols[j],symbols[i]];}
    return Object.freeze(symbols);
  }
  function result(wins,forced=false,reelSymbols=null){
    const symbols=reelSymbols?Object.freeze(reelSymbols):shuffle(wins),configuration=config(),bonus=wins>=3?LiveWireBonus.profile(wins):null;
    return Object.freeze({wins,multiplier:bonus?LiveWireBonus.pick(wins):active.payouts[wins],bonus:bonus?{min:bonus.min,max:bonus.max,mean:bonus.mean}:null,symbols,rtp:configuration.rtp,mathSolutionId:configuration.id,forced,mask:symbols.reduce((mask,symbol,index)=>mask|(symbol<<index),0)});
  }
  async function draw(){
    // The approved default is four independent Bernoulli(0.2) reels.
    // Labs can still explicitly override the count distribution for design tests.
    if(active.probabilities.every((p,i)=>p===defaults.probabilities[i])){
      const symbols=Array.from({length:4},()=>randomInt(5)===0?1:0);
      return result(symbols.reduce((a,b)=>a+b,0),false,symbols);
    }
    const bits=new Uint32Array(2);crypto.getRandomValues(bits);
    const sample=((bits[0]&2097151)*4294967296+bits[1])/9007199254740992;
    let cumulative=0,wins=4;
    for(const row of table()){cumulative+=row.probability;if(sample<cumulative){wins=row.wins;break;}}
    return result(wins);
  }
  return Object.freeze({get payouts(){return active.payouts;},get table(){return table();},get model(){return active;},defaults,validate,metrics,rebalance,apply,shuffle,draw,testDraw:wins=>result(wins,true),connect:async()=>config()});
})();
