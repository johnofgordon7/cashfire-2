'use strict';
(()=>{
  const $=id=>document.getElementById(id),dialog=$('mathsDialog');
  $('mathsRows').innerHTML=Array.from({length:5},(_,i)=>'<tr><th scope="row">'+i+'</th><td><input id="labsPay'+i+'" aria-label="'+i+' loot boxes payout multiplier" type="number" min="0" max="10000" step="0.1" inputmode="decimal" '+(i===0||i>=3?'readonly':'')+(i>=3?' hidden':'')+'>'+(i>=3?'<span>Win up to '+(i===3?'100':'1,000')+'×</span>':'')+'</td><td><input id="labsChance'+i+'" aria-label="'+i+' loot boxes probability percent'+(i===0?' (remainder)':'')+'" type="number" min="0" max="100" step="0.000001" inputmode="decimal" '+(i===0?'readonly':'')+'></td></tr>').join('');
  function message(text,error=false){$('labsMessage').textContent=text;$('labsMessage').classList.toggle('error',error);}
  function number(id){const value=$(id).value;if(value.trim()==='')throw Error('Fill in every payout and probability.');return Number(value);}
  function read(){
    const payouts=Array.from({length:5},(_,i)=>number('labsPay'+i));
    const probabilities=[0,...Array.from({length:4},(_,i)=>number('labsChance'+(i+1))/100)];
    probabilities[0]=1-probabilities.slice(1).reduce((s,p)=>s+p,0);
    if(Math.abs(probabilities[0])<1e-12)probabilities[0]=0;
    $('labsChance0').value=String(Number((probabilities[0]*100).toFixed(10)));
    if(probabilities[0]<0)throw Error('Chances for 1–4 loot boxes exceed 100%. Reduce one of them.');
    return LiveWireAPI.validate({payouts,probabilities});
  }
  function preview(){
    try{
      const model=read(),m=LiveWireAPI.metrics(model);
      $('labsRtp').textContent=(m.rtp*100).toFixed(3)+'%';$('labsHit').textContent=(m.hitRate*100).toFixed(3)+'%';$('labsSd').textContent=m.standardDeviation.toFixed(2)+'×';$('labsTotal').textContent='100%';
      $('labsApply').disabled=false;$('labsTest').disabled=!LiveWireGame.canTest();
      message(m.rtp>1?'This draft exceeds 100% RTP.':'Draft preview. Apply to use these settings.');return model;
    }catch(e){$('labsRtp').textContent='—';$('labsHit').textContent='—';$('labsSd').textContent='—';$('labsTotal').textContent='Check chances';$('labsApply').disabled=true;$('labsTest').disabled=true;message(e.message,true);return null;}
  }
  function fill(model){for(let i=0;i<5;i++){$('labsPay'+i).value=String(model.payouts[i]);$('labsChance'+i).value=String(Number((model.probabilities[i]*100).toFixed(10)));}preview();}
  function open(){if(!LiveWireGame.beginMaths())return;$('help').close();fill(LiveWireAPI.model);$('labsTarget').value=String(Number((LiveWireAPI.metrics().rtp*100).toFixed(6)));dialog.showModal();document.documentElement.classList.add('labs-open');}
  $('balancerOpen').onclick=open;$('labsOpen').onclick=open;
  $('mathsClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{document.documentElement.classList.remove('labs-open');LiveWireGame.endMaths();});
  $('mathsRows').addEventListener('input',preview);
  $('labsBalance').onclick=()=>{try{const balanced=LiveWireAPI.rebalance(read(),number('labsTarget')/100);fill(balanced);message('Draft balanced to target. Apply to start playing.');}catch(e){message(e.message,true);}};
  $('labsReset').onclick=()=>{fill(LiveWireAPI.defaults);$('labsTarget').value='97.152';message('Default 20% per reel model loaded into the draft. Apply to use it.');};
  function apply(test=false){
    try{
      const model=read(),wins=number('labsOutcome');
      if(test&&(!Number.isInteger(wins)||wins<0||wins>4))throw Error('Choose a bolt count from 0 to 4.');
      if(test&&!LiveWireGame.canTest())throw Error('Refill your demo balance or choose a smaller bet before testing.');
      LiveWireGame.applyMaths(model);dialog.close();document.documentElement.classList.remove('labs-open');LiveWireGame.endMaths();
      if(test)LiveWireGame.testSpin(wins);
    }catch(e){message(e.message,true);}
  }
  $('labsApply').onclick=()=>apply();$('labsTest').onclick=()=>apply(true);
})();
