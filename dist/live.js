'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:true}),TAU=Math.PI*2;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches,payoutReveal=null;
const stakes=[10,20,40,60,80,100,200,300,400,500,600,700,800,900,1000,2000,3000,5000];
let balance=500000,betIndex=5,lastWin=0,busy=false,ready=false,turbo=false,sound=false,audio;
let serviceLoading=true,serviceReady=false,mathsEditing=false;
let W=1200,H=480,last=0,round=null,pausedAt=null,pausedTotal=0,autoRunning=false,autoLeft=0,autoSelected=10,nextAuto=Infinity;
const sessionStarted=Date.now();let sessionNet=0,lastClockSecond=-1;
function updateSessionHeader(){
  const now=Date.now(),second=Math.floor(now/1000);if(second===lastClockSecond)return;lastClockSecond=second;
  $('localTime').textContent=new Date(now).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
  const elapsed=Math.max(0,Math.floor((now-sessionStarted)/1000)),pad=n=>String(n).padStart(2,'0');
  $('sessionTime').textContent=pad(Math.floor(elapsed/3600))+':'+pad(Math.floor(elapsed/60)%60)+':'+pad(elapsed%60);
}
function updateSessionNet(){
  $('sessionNet').textContent=(sessionNet>0?'+':sessionNet<0?'−':'')+money(Math.abs(sessionNet));
  $('sessionNet').setAttribute('data-direction',sessionNet>0?'up':sessionNet<0?'down':'flat');
  $('sessionNet').setAttribute('aria-label','Session net result '+$('sessionNet').textContent);
}
const reels=[-291,-97,97,291].map((x,i)=>({x,r:136,angle:i*Math.PI/2,velocity:0,light:0}));
const strip=document.createElement('canvas');strip.width=512;strip.height=2048;const tx=strip.getContext('2d');const reelRenderer=new ReelRenderer(strip);
const art={};let loaded=0;
const collector=new BoltCollection.View({get:$,art:()=>art.bolt});
function texture(){
  // Neutral porcelain albedo; all curvature and moving highlights come from 3D light.
  const g=tx.createLinearGradient(0,0,512,0);
  [[0,'#b0bcc5'],[.07,'#e7edf0'],[.3,'#f8f9f6'],[.72,'#f0f3f4'],[.94,'#d5dfe6'],[1,'#9aaebd']].forEach(([p,c])=>g.addColorStop(p,c));
  tx.fillStyle=g;tx.fillRect(0,0,512,2048);
  for(let i=0;i<4;i++){
    tx.save();tx.shadowColor='#091a3766';tx.shadowBlur=11;tx.shadowOffsetY=9;
    tx.drawImage(ReelMotion.symbols[i]?art.bolt:art.cross,43,i*512+67,426,378);tx.restore();
  }
  try { reelRenderer.upload(); } catch(error) { reelRenderer.failure=error.message;reelRenderer.ready=false; }
}
for(const name of ['bolt','cross']){const img=new Image();art[name]=img;img.onload=()=>{if(++loaded===2){texture();ready=true;document.body.classList.add('ready');update();}};img.onerror=()=>{$('loading').textContent='Artwork could not load. Please refresh.';};img.src=name==='bolt'?'assets/art/cashfire-2/loot-box.webp':'assets/art/1.0.0/cross.webp';}
function renderDensity(width=W,height=H){const desktop=matchMedia('(pointer:fine)').matches;return Math.min(devicePixelRatio||1,desktop&&width*height<=850000?3:2);}
function resize(){const b=canvas.getBoundingClientRect(),d=renderDensity(b.width,b.height);canvas.width=Math.round(b.width*d);canvas.height=Math.round(b.height*d);W=b.width;H=b.height;ctx.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(canvas);
const money=cents=>'£'+(cents/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const boltOutcomeLabel=wins=>wins===3?'Bonus':wins===4?'MEGA Bonus':wins+' loot box'+(wins===1?'':'es');
const gameNow=()=> (pausedAt===null?performance.now():pausedAt)-pausedTotal;
function updatePayoutGuide(){
  for(let count=1;count<=4;count++){
    const multiplier=LiveWireAPI.payouts[count],item=$('boltPay'+count);
    const bonus=LiveWireBonus.profile(count);
    const label=bonus?'Win up to '+bonus.max.toLocaleString('en-GB')+'×':multiplier.toLocaleString('en-GB',{maximumFractionDigits:1})+'×';
    const matched=!busy&&round?.paid&&round.outcome.wins===count&&(bonus||round.outcome.multiplier===multiplier)&&$('outcome').classList.contains('visible');
    $('boltPayValue'+count).textContent=label;
    item.setAttribute('data-match',matched?'true':'false');
    item.setAttribute('aria-label',count+' loot box'+(count===1?'':'es')+' anywhere'+(count>=3?' · '+boltOutcomeLabel(count):'')+': '+label+' total return'+(bonus?'':', '+money(stakes[betIndex]*Math.round(multiplier*10)/10)+' for your bet')+(matched?'. This spin.':''));
  }
}
function update(){updatePayoutGuide();const locked=busy||autoRunning||mathsEditing;$('balance').textContent=money(balance);$('betAmount').textContent=money(stakes[betIndex]);$('selectedBet').textContent=money(stakes[betIndex]);$('betSlider').setAttribute('aria-valuetext',money(stakes[betIndex]));$('footerBet').textContent=money(stakes[betIndex]);$('lastWin').textContent=money(lastWin);$('betToggle').disabled=locked;$('betSlider').disabled=locked;$('betSlider').value=betIndex;$('betSlider').style.setProperty('--fill',betIndex/(stakes.length-1)*100+'%');$('spin').disabled=locked||!ready||serviceLoading;$('refill').disabled=locked||balance>=500000;$('spin').setAttribute('aria-label',serviceLoading?'Preparing demo play':busy?'Waiting for this spin to finish':'Spin reels');$('auto').disabled=(!autoRunning&&busy)||!ready||serviceLoading||!serviceReady||mathsEditing;$('balancerOpen').disabled=busy||autoRunning||serviceLoading||mathsEditing;$('labsOpen').disabled=busy||autoRunning||serviceLoading||mathsEditing;$('spin').classList.toggle('busy',busy);$('auto').classList.toggle('running',autoRunning);$('autoCount').hidden=!autoRunning;$('autoCount').textContent=autoLeft;$('auto').setAttribute('aria-label',autoRunning?'Stop autoplay; '+autoLeft+' spins remaining':'Autoplay settings');for(const el of $('betOptions').querySelectorAll('button'))el.setAttribute('aria-pressed',Number(el.dataset.cents)===stakes[betIndex]);}
function closePanels(){
  for(const id of ['betPanel','autoPanel'])if($(id).open)$(id).close();
  $('betToggle').setAttribute('aria-expanded','false');$('auto').setAttribute('aria-expanded','false');
}
for(const [panel,trigger] of [['betPanel','betToggle'],['autoPanel','auto']]){
  $(panel).addEventListener('close',()=>$(trigger).setAttribute('aria-expanded','false'));
}
$('closeBet').onclick=closePanels;$('confirmBet').onclick=closePanels;$('closeAuto').onclick=closePanels;
function setBet(index,keepOpen=false){if(busy||autoRunning||mathsEditing)return;collector.reset();payoutReveal=null;betIndex=Math.max(0,Math.min(stakes.length-1,index));$('outcome').classList.remove('visible');$('status').textContent='Loot boxes count on any reel. They don’t need to be next to each other.';if(!keepOpen)closePanels();update();}
async function spin(fromAuto=false,testWins=null){
  if(busy||!ready||serviceLoading||mathsEditing||autoRunning&&!fromAuto)return;
  if(balance<stakes[betIndex]){stopAuto();collector.reset();payoutReveal=null;$('outcome').classList.remove('visible');$('status').textContent='Balance too low. Lower the bet or refill in Info → Demo & Labs.';updatePayoutGuide();return;}
  const stake=stakes[betIndex];
  // Lock the stake before drawing a result. Nothing is debited yet.
  busy=true;round=null;payoutReveal=null;collector.reset();if(fromAuto)autoLeft--;
  closePanels();canvas.setAttribute('aria-busy','true');
  document.body.classList.remove('has-win','major-win');$('outcome').classList.remove('visible');
  $('status').textContent='Drawing your result…';if(sound)audioStart();update();
  let outcome,payoutCents,plans;
  try{
    outcome=testWins===null?await LiveWireAPI.draw():LiveWireAPI.testDraw(testWins);
    const bonus=LiveWireBonus.profile(outcome.wins);
    if(bonus&&(!Number.isInteger(outcome.multiplier)||outcome.multiplier<bonus.min||outcome.multiplier>bonus.max))throw Error('Invalid bonus prize');
    payoutCents=stake*Math.round(outcome.multiplier*10)/10;
    if(!Number.isSafeInteger(payoutCents)||payoutCents<0||!Number.isSafeInteger(balance-stake+payoutCents))throw Error('Invalid payout amount');
    plans=reels.map((r,i)=>ReelMotion.plan(r.angle,outcome.symbols[i],i,turbo,false));
  }catch(error){
    busy=false;round=null;document.body.classList.remove('spinning');canvas.setAttribute('aria-busy','false');hum(false);stopAuto();
    const invalid=error.code==='RESULT'||error.code==='CONFIG';
    $('status').textContent=invalid?'Game result unavailable. No bet was charged.':'Spin interrupted. No demo credits were used. Press Spin to try again.';
    update();return;
  }
  // Commit the validated round only after the request and animation preparation succeed.
  serviceReady=true;showRtp(outcome.rtp);balance-=stake;
  const now=gameNow();round={outcome,stake,payoutCents,start:now,paid:false,finishedAt:null,collected:0};
  reels.forEach((r,i)=>{r.motion=plans[i];r.anticipation=null;r.landingLevel=undefined;r.stopped=false;r.light=0;r.impactAt=undefined;r.strikeAt=undefined;r.chargeAt=undefined;r.strikeLevel=0;r.strikeOrder=0;r.chargeHistory=[];r.lastDetent=Math.floor(r.angle/(TAU/8));r.lastTick=0;});

  document.body.classList.add('spinning');
  audioCall('beginRound');hum(true);noiseHit(1,.1,.05,650);$('status').textContent='Bet accepted · '+money(stake)+' demo · Loot boxes count anywhere.';update();

}
async function initializeService(){
  $('status').textContent='Preparing demo play…';
  try{const configuration=await LiveWireAPI.connect();showRtp(configuration.rtp);serviceReady=true;if(!busy)$('status').textContent='Loot boxes count on any reel. They don’t need to be next to each other.';}
  catch{serviceReady=false;$('status').textContent='Demo play could not start. Please refresh.';}
  finally{serviceLoading=false;update();}
}
function showRtp(rtp){
  const label=Number((rtp*100).toFixed(3)).toString()+'%';
  $('rtpValue').textContent=label;$('helpRtp').textContent=label;
}
const LiveWireGame=Object.freeze({
  beginMaths(){if(busy||autoRunning||serviceLoading||mathsEditing)return false;closePanels();mathsEditing=true;update();return true;},
  endMaths(){mathsEditing=false;update();},
  canTest(){return ready&&serviceReady&&!busy&&!autoRunning&&balance>=stakes[betIndex];},
  applyMaths(model){if(!mathsEditing||busy||autoRunning)throw Error('Finish the current spin first.');const configuration=LiveWireAPI.apply(model);showRtp(configuration.rtp);const format=(n,wins)=>{const p=LiveWireBonus.profile(wins);return p?'Win up to '+p.max.toLocaleString('en-GB')+'×':n.toLocaleString('en-GB',{maximumFractionDigits:1})+'×';};$('helpPayouts').innerHTML=LiveWireAPI.table.map(r=>'<span><small>'+boltOutcomeLabel(r.wins)+'</small><strong>'+format(r.multiplier,r.wins)+'</strong></span>').join('');updatePayoutGuide();return configuration;},
  testSpin(wins){if(!Number.isInteger(wins)||wins<0||wins>4)throw Error('Choose a bolt count.');return spin(false,wins);},

});
function complete(time,bonusCollected=false){
  if(round.paid||round.bonusStarted&&!bonusCollected)return;
  if(round.outcome.wins>=3&&!bonusCollected){
    round.bonusStarted=true;stopAuto();document.body.classList.remove('spinning');hum(false);
    reels.forEach(r=>{r.angle=ReelMotion.wrap(r.motion.target);r.velocity=0;});
    if(sound)audioCall('result',round.outcome.wins,round.outcome.multiplier);
    $('status').textContent=boltOutcomeLabel(round.outcome.wins)+' triggered · '+round.outcome.wins+' loot boxes anywhere';
    LiveWireBonus.open({count:round.outcome.wins,stake:round.stake,multiplier:round.outcome.multiplier,onCollect:()=>complete(gameNow(),true)});update();return;
  }
  round.paid=true;round.finishedAt=time;busy=false;
  document.body.classList.remove('spinning');hum(false);
  reels.forEach(r=>{r.angle=ReelMotion.wrap(r.motion.target);r.velocity=0;});
  lastWin=round.payoutCents;balance+=lastWin;
  const net=lastWin-round.stake,n=round.outcome.wins,multiplier=round.outcome.multiplier;
  sessionNet+=net;updateSessionNet();
  $('gameFooter').setAttribute('data-positive',net>0?'true':'false');
  $('outcome').setAttribute('data-result',net>0?'profit':net<0?'loss':'even');
  canvas.setAttribute('aria-busy','false');
  canvas.setAttribute('aria-label',round.outcome.symbols.map((s,i)=>'Reel '+(i+1)+': '+(s?'loot box':'X')).join(', '));
  if(lastWin>0){
    if(net>0)document.body.classList.add('has-win');
    if(net>0&&n>2)document.body.classList.add('major-win');
    $('winTitle').textContent=net<=0?'RETURNED':['','RETURN','RETURN','SHOOTING SPREE','MEGA SPREE'][n];
    $('winValue').textContent=money(lastWin);
    $('winAnnouncement').textContent=money(lastWin);
    payoutReveal=net>0&&!reduced?{amount:lastWin,start:time,duration:n===4?1350:n===3?1000:650}:null;
    $('outcome').classList.add('visible');
    if(sound&&!bonusCollected)audioCall('result',n,multiplier);
  }
  const result=lastWin>0?n+' loot box'+(n===1?'':'es')+' anywhere · '+multiplier+'×':'No return';
  const netText=net>0?'Net +'+money(net):net<0?'Net −'+money(-net):'Break even';
  $('status').textContent=(round.outcome.forced?'Test spin · ':'')+result+' · '+netText;
  if(autoRunning){
    if(autoLeft>0)nextAuto=time+Math.max(n===4?2800:n===3?1600:850,...reels.filter(r=>r.chargeAt!==undefined).map(r=>r.chargeAt+ReelLightning.tier(r.strikeLevel).duration-time+120));
    else stopAuto();
  }
  update();
}
function startAuto(){if(busy||!ready||serviceLoading||!serviceReady||mathsEditing)return;autoRunning=true;autoLeft=autoSelected;nextAuto=Infinity;closePanels();spin(true);}
function stopAuto(){autoRunning=false;autoLeft=0;nextAuto=Infinity;update();}
$('betOptions').innerHTML=stakes.map(c=>'<button data-cents="'+c+'" aria-pressed="'+(c===100)+'">'+money(c)+'</button>').join('');
$('betToggle').onclick=()=>{if(busy||autoRunning||mathsEditing)return;const open=!$('betPanel').open;closePanels();if(open)$('betPanel').showModal();$('betToggle').setAttribute('aria-expanded',open);};
$('betOptions').onclick=e=>{const el=e.target.closest('[data-cents]');if(el)setBet(stakes.indexOf(Number(el.dataset.cents)));};$('betSlider').oninput=e=>setBet(Number(e.target.value),true);$('spin').onclick=()=>spin();
$('turbo').onclick=()=>{turbo=!turbo;$('turbo').setAttribute('aria-pressed',turbo);$('turbo').setAttribute('aria-label','Turbo '+(turbo?'on':'off'));};
$('auto').onclick=()=>{if(autoRunning){stopAuto();return;}if(busy||!ready||serviceLoading||!serviceReady||mathsEditing)return;const open=!$('autoPanel').open;closePanels();if(open)$('autoPanel').showModal();$('auto').setAttribute('aria-expanded',open);};
$('autoOptions').onclick=e=>{const el=e.target.closest('[data-rounds]');if(!el)return;autoSelected=Number(el.dataset.rounds);for(const b of $('autoOptions').querySelectorAll('button'))b.setAttribute('aria-pressed',b===el);};$('startAuto').onclick=startAuto;
$('sound').onclick=()=>{sound=!sound;if(sound){audioStart();hum(busy);}else{hum(false);audioCall('mute');}updateSoundControl();};
$('refill').onclick=()=>{if(busy||autoRunning||mathsEditing||balance>=500000)return;balance=500000;$('status').textContent='Demo balance refilled. Ready to spin.';update();};
$('info').onclick=()=>{stopAuto();closePanels();$('help').showModal();};$('closeHelp').onclick=()=>$('help').close();
$('menuOpen').onclick=()=>{stopAuto();closePanels();$('gameMenu').showModal();};
$('menuClose').onclick=()=>$('gameMenu').close();
$('labsOpen').addEventListener('click',()=>{if(!$('labsOpen').disabled)$('gameMenu').close();});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat&&!['help','mathsDialog','betPanel','autoPanel','gameMenu','bonusGame'].some(id=>$(id).open)&&!['BUTTON','INPUT'].includes(document.activeElement.tagName)&&!document.activeElement.closest?.('[data-scroll-region]')){
    e.preventDefault();spin();
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&pausedAt===null){const now=performance.now();pausedTotal+=Math.max(0,now-pausedTotal-last);pausedAt=now;audioCall('pause');if(audio)audio.suspend();}else if(!document.hidden&&pausedAt!==null){pausedTotal+=performance.now()-pausedAt;pausedAt=null;last=gameNow();if(sound){audioStart();hum(busy);}}});

function updateSoundControl(){
  $('soundLabel').textContent=sound?'SOUND ON':'SOUND OFF';
  $('sound').setAttribute('aria-pressed',sound);
  $('sound').setAttribute('aria-label',sound?'Sound on; turn sound off':'Sound off; turn sound on');
  $('sound').setAttribute('title',sound?'Turn sound off':'Turn sound on');
}
const cinemaSound=new LiveWireAudio();
document.addEventListener('click',event=>{const button=event.target?.closest?.('button');if(sound&&button&&!button.disabled&&!['spin','sound'].includes(button.id))audioCall('ui');});
// A browser audio failure must never interrupt a reel update or settlement.
function audioCall(method,...args){try{return cinemaSound[method](...args);}catch{return undefined;}}
function audioStart(){
  try{if(cinemaSound.unlock()){audio=cinemaSound.context;return;}}catch{}
  sound=false;updateSoundControl();
}
function tone(...args){if(sound)audioCall('tone',...args);}
function noiseHit(...args){if(sound)audioCall('noise',...args);}
function mechanicalHit(i,bolt,level){if(sound)audioCall('stopReel',i,bolt,level);}
function mechanicalTick(i){if(sound)audioCall('tick',i);}
function hum(on){if(on&&sound)audioCall('startMotor');else audioCall('stopMotor');}

function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=fill;ctx.fill();}
function metal(x,r,width=15,tint=0){
  const g=ctx.createLinearGradient(0,-r,0,r);
  const colors=tint?[[0,'#07131f'],[.16,'#394d60'],[.33,'#8eabb9'],[.46,'#193045'],[.72,'#061525'],[.94,'#294154'],[1,'#8b9ca8']]:[[0,'#6e5226'],[.07,'#ead6a3'],[.19,'#97733b'],[.34,'#ddc796'],[.43,'#fff0c1'],[.49,'#a3854c'],[.7,'#382c16'],[.91,'#bea46b'],[1,'#f1dda9']];
  colors.forEach(([p,c])=>g.addColorStop(p,c));ellipse(x,0,width,r,g);
  ctx.strokeStyle=tint?'#b8caad48':'#fce4ac80';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,0,Math.max(1,width-1),r-1,0,0,TAU);ctx.stroke();
}
function rims(r,time){
  ctx.save();ctx.translate(r.x,0);
  for(const x of [-94,94]){
    metal(x,r.r+9,6);metal(x,r.r+5,3,1);
    const lit=r.light||0;ctx.strokeStyle=lit>.1?'rgba(100,223,255,'+(.35+lit*.6)+')':'#59a7cd59';
    ctx.lineWidth=1.5;ctx.shadowColor='#73eaff';ctx.shadowBlur=lit*12;
    ctx.beginPath();ctx.ellipse(x,0,2.5,r.r+3,0,0,TAU);ctx.stroke();ctx.shadowBlur=0;
    for(let k=0;k<42;k++){
      const a=k/42*TAU,y=Math.sin(a)*(r.r+8),xx=x+Math.cos(a)*5.5;
      ctx.strokeStyle=Math.cos(a)>0?'#f4dfa291':'#8b764f80';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx+Math.cos(a)*2,y+Math.sin(a)*2);ctx.stroke();
    }
  }
  ctx.restore();
}
function endCap(x,time){
  metal(x,107,28);metal(x,101,26,1);metal(x,88,22);metal(x,82,21,1);
  ctx.strokeStyle='#baaa6b77';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,0,13,57,0,0,TAU);ctx.stroke();
  for(let k=0;k<8;k++){const a=k/8*TAU;ellipse(x+Math.cos(a)*19,Math.sin(a)*77,1.8,3,'#ead3a2');}
}
function drumFallback(r){
  ctx.save();ctx.translate(r.x,0);const rad=r.r;
  // Linear interpolation in the fallback prevents whole-texel jumps at slow speeds.
  const step=.7,blur=Math.min(.55,Math.abs(r.velocity||0)*.018),samples=blur>.01?3:1;
  for(let y=-rad;y<rad;y+=step){
    const n=Math.max(-.99999,Math.min(.99999,(y+step/2)/rad));
    const a=Math.asin(n),width=164+Math.sqrt(1-n*n)*17;
    const sy=((r.angle+a)/TAU*2048+256+2048*100)%2048;
    const y0=Math.floor(sy),fraction=sy-y0;
    if(samples===1){ctx.globalAlpha=1;ctx.drawImage(strip,0,y0,512,1,-width/2,y,width,step+.15);ctx.globalAlpha=fraction;ctx.drawImage(strip,0,(y0+1)%2048,512,1,-width/2,y,width,step+.15);}
    else for(let k=0;k<samples;k++){const row=Math.floor((sy+blur*2048/TAU*k/(samples-1))%2048);ctx.globalAlpha=1/(k+1);ctx.drawImage(strip,0,row,512,1,-width/2,y,width,step+.15);}
  }
  ctx.globalAlpha=1;
  const shade=ctx.createLinearGradient(0,-rad,0,rad);
  shade.addColorStop(0,'#071020a0');shade.addColorStop(.27,'#ffe8ae12');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(.8,'#16457937');shade.addColorStop(1,'#02130c99');
  ctx.beginPath();for(let y=-rad;y<=rad;y+=2){const width=82+Math.sqrt(Math.max(0,1-(y/rad)**2))*8.5;ctx.lineTo(-width,y);}for(let y=rad;y>=-rad;y-=2){const width=82+Math.sqrt(Math.max(0,1-(y/rad)**2))*8.5;ctx.lineTo(width,y);}ctx.closePath();ctx.fillStyle=shade;ctx.fill();ctx.restore();
}

function drawMachine(time,scale){
  // A soft contact shadow anchors the support feet to the room's floor.
  ctx.save();ctx.translate(0,197);ctx.scale(1,.085);
  const shadow=ctx.createRadialGradient(0,0,90,0,0,475);shadow.addColorStop(0,'#000b');shadow.addColorStop(.65,'#0005');shadow.addColorStop(1,'#0000');
  ctx.fillStyle=shadow;ctx.fillRect(-490,-490,980,980);ctx.restore();
  if(reelRenderer.draw(ctx,reels,time,scale*renderDensity(),reduced))return;
  endCap(-414,time);endCap(414,time);
  for(const r of reels){ctx.save();ctx.translate(0,-ReelPresentation.seat(r,time,reduced));metal(r.x-91,r.r+7,12);metal(r.x+91,r.r+7,12);drumFallback(r);rims(r,time);ctx.restore();}
}
let lastRenderState='';
motionPreference.addEventListener?.('change',event=>{
  reduced=event.matches;lastRenderState='';
  if(reduced&&payoutReveal){$('winValue').textContent=money(payoutReveal.amount);payoutReveal=null;}
});
function frame(wallTime){
  requestAnimationFrame(frame);updateSessionHeader();if(pausedAt!==null)return;
  const time=wallTime-pausedTotal,dt=Math.min((time-last)/1000||.016,.04);last=time;
  LiveWireBonus.draw(time,reduced);
  if(busy&&round&&!round.bonusStarted){
    const elapsed=(time-round.start)/1000;
    let done=true;
    reels.forEach((r,i)=>{
      const bolt=round.outcome.symbols[i]===1;
      const m=ReelMotion.sample(r.motion,elapsed,reduced);r.angle=m.angle;r.velocity=m.velocity;if(!m.done)done=false;
      const detent=Math.floor(r.angle/(TAU/8));
      if(m.phase==='brake'&&detent!==r.lastDetent&&Math.abs(m.velocity)<14&&time-r.lastTick>40){mechanicalTick(i);r.lastTick=time;}r.lastDetent=detent;
      if(!r.stopped&&m.done){
        r.stopped=true;r.impactAt=time;
        const level=bolt?ReelLightning.land(reels,r,time):0;
        if(bolt){round.collected++;collector.land(i,round.collected,time,reduced);if(sound)audioCall('collect',i,reduced);}
        let anticipation=0;
        if(i<3){const next=reels[i+1].motion;anticipation=ReelAnticipation.begin(reels,i+1,round.collected,elapsed,time,reduced);if(!anticipation||reduced)ReelMotion.schedule(next,elapsed+Math.max(.025,next.interval-next.brake-next.settleTime)+round.collected*next.extension);}
        mechanicalHit(i,bolt,level);
        if(i===3&&!bolt&&round.collected)tone(160,.18,'sine',.015);

        $('status').textContent=anticipation===2?'3 loot boxes · One more for MEGA!':anticipation===1?'2 loot boxes · One more for the Bonus!':round.collected+' loot box'+(round.collected===1?'':'es')+' anywhere';
      }
    });
    if(sound)audioCall('speed',reels.reduce((sum,r)=>sum+Math.abs(r.velocity),0)/4,reels.some(r=>!r.stopped)?round.collected:0);
    if(done)complete(time);
  }
  if(autoRunning&&!busy&&time>=nextAuto){nextAuto=Infinity;spin(true);}
  for(let i=0;i<4;i++){
    const r=reels[i],charge=busy&&!r.stopped?round?.collected||0:0,target=r.stopped&&round?.outcome.symbols[i]?1:charge?(.16+charge*.18)*(reduced?1:.94+.06*Math.sin(time/240)):.08;
    r.light+=(target-r.light)*(1-Math.exp(-dt*9));
  }
  const winAge=round?.finishedAt!==null&&round?.finishedAt!==undefined?(time-round.finishedAt)/1000:0;
  if(winAge>3){document.body.classList.remove('has-win','major-win');}
  if(payoutReveal){
    const age=time-payoutReveal.start,value=ReelPresentation.reveal(payoutReveal.amount,age,payoutReveal.duration,reduced);
    const formatted=money(value);if($('winValue').textContent!==formatted)$('winValue').textContent=formatted;
    if(age>=payoutReveal.duration||reduced)payoutReveal=null;
  }
  collector.draw(time,reduced,i=>reelRenderer.ready?reelRenderer.strikePoint(reels[i],reels,time,reduced):[reels[i].x,0]);
  const state=[W,H,canvas.width,canvas.height,ready,reelRenderer.ready,reduced,ReelPresentation.live(reels,round,time,reduced)?Math.round(time):0,...reels.map(r=>[Math.round(r.angle*100000),Math.round(r.light*1000),r.impactAt!==undefined&&time-r.impactAt<850||ReelLightning.active(r,time)?Math.round(time):0].join(':'))].join('|');
  // Once the machine settles, keep the completed canvas instead of redrawing at 60 Hz.
  if(state===lastRenderState)return;lastRenderState=state;
  if(W<1||H<1)return;
  ctx.clearRect(0,0,W,H);const scale=Math.min(W/960,H/410);ctx.save();ctx.translate(W/2,H*.47);ctx.scale(scale,scale);
  const g=ctx.createRadialGradient(0,-20,50,0,-20,490);g.addColorStop(0,'#4ce5ff18');g.addColorStop(1,'#0b223000');ctx.fillStyle=g;ctx.fillRect(-550,-230,1100,460);
  drawMachine(time,scale);ReelAnticipation.draw(ctx,reels,reelRenderer,time,reduced);ReelPresentation.draw(ctx,reels,round,reelRenderer,time,reduced,W<650);ReelLightning.draw(ctx,reels,reelRenderer,time,-H*.47/scale,reduced,W<650);ctx.restore();
}
LiveWireBonus.bind();
function previewBonus(count){if(busy||autoRunning||mathsEditing||LiveWireBonus.active)return;$('help').close();$('gameMenu').close();busy=true;update();LiveWireBonus.open({count,stake:stakes[betIndex],multiplier:LiveWireBonus.pick(count),preview:true,onCollect:()=>{busy=false;update();}});}
$('previewBonus').onclick=()=>previewBonus(3);$('previewMega').onclick=()=>previewBonus(4);
update();initializeService();requestAnimationFrame(frame);
