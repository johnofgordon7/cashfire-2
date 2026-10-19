const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert');
let clock=0,raf,resultCalls=0,mode='lose',release;
const mediaListeners={},listeners={},images=[],gradient={addColorStop(){}},ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}}),elements={};
const el=id=>elements[id]??={textContent:'',hidden:true,open:false,dataset:{},focus(){},attributes:{},events:{},showModal(){this.open=true},close(){this.open=false;this.events.close?.()},classList:{values:new Set(),add(...v){v.forEach(x=>this.values.add(x))},remove(...v){v.forEach(x=>this.values.delete(x))},toggle(v,on){const next=on===undefined?!this.values.has(v):on;next?this.values.add(v):this.values.delete(v);return next},contains(v){return this.values.has(v)}},style:{setProperty(){}},setAttribute(name,value){this.attributes[name]=String(value)},querySelectorAll:()=>[],getContext:type=>type==='webgl'?null:ctx,addEventListener(name,callback){this.events[name]=callback},getBoundingClientRect:()=>({left:0,top:0,width:1200,height:460})};
const scope={document:{body:el('body'),getElementById:el,createElement:()=>el('canvas'+Object.keys(elements).length),addEventListener(n,f){const previous=listeners[n];listeners[n]=previous?e=>{previous(e);f(e);}:f},activeElement:{tagName:'BODY'}},matchMedia:()=>({matches:false,addEventListener:(n,f)=>mediaListeners[n]=f}),ResizeObserver:class{constructor(f){this.f=f}observe(){this.f()}},Image:class{constructor(){images.push(this)}},crypto:{getRandomValues(a){a[0]=0;}},performance:{now:()=>clock},devicePixelRatio:1,requestAnimationFrame:f=>raf=f,Math,console,URL,AbortController,setTimeout,clearTimeout,
 LiveWireAPI:{table:[{wins:0,multiplier:0,probability:.7}],connect:async()=>({id:192,rtp:1.96352}),draw:async()=>{resultCalls++;if(mode==='fail')throw Error('Unavailable');if(mode==='invalid')return {multiplier:NaN};const result={wins:mode==='win'?4:mode==='gapBonus'?3:mode==='mixed'?2:mode==='single'?1:0,multiplier:mode==='win'?1000:mode==='gapBonus'?5:mode==='mixed'?1:mode==='single'?.2:0,symbols:mode==='win'?[1,1,1,1]:mode==='gapBonus'?[1,0,1,1]:mode==='mixed'?[1,0,1,0]:mode==='single'?[0,1,0,0]:[0,0,0,0],rtp:1.96352};if(mode==='hold')return new Promise(resolve=>release=()=>resolve(result));return result;}}
};
const modelScope=vm.createContext({crypto:scope.crypto});vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/bonus.js'),'utf8'),modelScope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/results-api.js'),'utf8')+';globalThis.api=LiveWireAPI;',modelScope);const fakeDraw=scope.LiveWireAPI.draw;scope.LiveWireAPI=new Proxy({},{get:(_,key)=>key==='draw'?fakeDraw:modelScope.api[key]});scope.document.documentElement=el('root');
vm.createContext(scope);for(const name of ['bonus.js','motion-fx.js','lightning-storm.js','cinematic-fx.js','sample-audio.js','motion.js','anticipation.js','machine-geometry.js','live-renderer.js','bolt-collection.js','live.js','odds.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',name),'utf8'),scope);
scope.stopEvents=[];vm.runInContext('mechanicalHit=(index,bolt,level)=>stopEvents.push({index,bolt,level,time:gameNow()})',scope);
const read=s=>vm.runInContext(s,scope),flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
for(const node of Object.values(elements))Object.assign(node,{currentTime:0,paused:true,getAttribute(name){return this.attributes[name]??null},removeAttribute(name){delete this.attributes[name]},pause(){this.paused=true},play(){this.paused=false;return Promise.resolve()},load(){},click(){this.onclick?.();this.events.click?.()}});
let cinematicCollections=0;const cinematicCounts=new Set();
async function collectCinematic(){
 // The VM has no media transport. Dedicated bonus tests cover playback; this
 // harness uses the real Skip and Collect recovery controls and money boundary.
 assert.equal(read('busy'),true,'cinematic keeps the accepted round locked');
 assert.equal(read('round.paid'),false,'cinematic must not pre-credit the award');
 const before=read('balance'),prize=read('round.payoutCents'),accepted=read('round.outcome.multiplier');
 const draws=resultCalls;el('spin').click();el('bonusCollect').click();await flush();
 assert.equal(resultCalls,draws,'no duplicate wager during the cinematic');
 assert.equal(read('balance'),before,'Collect before reveal cannot pay');
 assert.equal(read('LiveWireBonus.active'),true,'premature Collect cannot dismiss the feature');
 cinematicCounts.add(read('round.outcome.wins'));
 el('bonusSkip').click();await flush();
 assert.equal(el('bonusGame').dataset.phase,'reveal');
 assert.equal(read('balance'),before,'Skip changes presentation only');
 assert.equal(read('round.outcome.multiplier'),accepted,'Skip retains the accepted prize');
 el('bonusCollect').click();await flush();
 assert.equal(read('balance'),before+prize,'Collect credits the exact accepted pence');
 assert.equal(read('LiveWireBonus.active'),false);assert.equal(el('bonusGame').open,false);
 el('bonusCollect').click();await flush();
 assert.equal(read('balance'),before+prize,'duplicate Collect cannot credit again');
 cinematicCollections++;
}
async function step(ms){const end=clock+ms;for(;clock<end;clock+=40){raf(clock);await flush();}if(read('LiveWireBonus.active')&&!scope.document.hidden)await collectCinematic();}

(async()=>{
 for(const im of images)im.onload();await flush();assert.equal(read('serviceReady'),true);assert.equal(read('reels.length'),4);
 assert.deepEqual([1,2,3,4].map(n=>el('boltPayValue'+n).textContent),['0.2×','1×','Fixed 5×','Fixed 1,000×']);
 // Settings are modal, retain slider edits, and cannot spin from Space.
 const space={code:'Space',repeat:false,preventDefault(){}};
 scope.document.activeElement={tagName:'P',closest:()=>el('status')};listeners.keydown(space);await flush();assert.equal(resultCalls,0,'Space within scrollable result text cannot trigger a spin');scope.document.activeElement={tagName:'BODY'};
 el('menuOpen').onclick();assert(el('gameMenu').open);listeners.keydown(space);await flush();assert.equal(resultCalls,0,'menu blocks Space spins');el('menuClose').onclick();assert(!el('gameMenu').open);
 el('betToggle').onclick();assert.equal(el('betPanel').open,true);assert.equal(el('betToggle').attributes['aria-expanded'],'true');
 el('betSlider').oninput({target:{value:'17'}});assert.equal(read('betIndex'),17);assert.equal(el('selectedBet').textContent,'£50.00');assert.match(el('boltPay1').attributes['aria-label'],/£10.00 for your bet/);assert.equal(el('betSlider').attributes['aria-valuetext'],'£50.00');assert.equal(el('betPanel').open,true,'slider stays open throughout drag');
 listeners.keydown(space);await flush();assert.equal(resultCalls,0,'no Space spin behind bet settings');
 el('confirmBet').onclick();assert.equal(el('betPanel').open,false);assert.equal(el('betToggle').attributes['aria-expanded'],'false');
 el('auto').onclick();assert.equal(el('autoPanel').open,true);listeners.keydown(space);await flush();assert.equal(resultCalls,0);
 el('autoPanel').close();assert.equal(el('auto').attributes['aria-expanded'],'false','native close resets trigger');
 el('info').onclick();listeners.keydown(space);await flush();assert.equal(resultCalls,0);
 el('balancerOpen').onclick();assert.equal(el('help').open,false);assert.equal(el('mathsDialog').open,true);assert.equal(read('mathsEditing'),true);
 listeners.keydown(space);await flush();assert.equal(resultCalls,0,'no Space spin behind odds');
 el('mathsClose').onclick();assert.equal(read('mathsEditing'),false);assert.equal(el('mathsDialog').open,false);
 read('setBet(0)');
 read('setBet(5)');
 read('sound=true;updateSoundControl()');assert.equal(el('sound').attributes['aria-pressed'],'true');assert.equal(el('sound').attributes['aria-label'],'Sound on; turn sound off');
 read('sound=false;updateSoundControl()');assert.equal(el('sound').attributes['aria-pressed'],'false');

 el('spin').onclick();el('spin').onclick();assert.equal(read('balance'),500000,'no debit before result is validated');read('setBet(17)');assert.equal(read('betIndex'),5);await flush();assert.equal(resultCalls,1);assert.equal(read('balance'),499900);await step(5000);assert.equal(read('busy'),false);assert.equal(scope.stopEvents.length,4);assert(scope.stopEvents.every(e=>e.bolt===false));assert(read('reels.every(r=>r.strikeAt===undefined)'));
 scope.stopEvents.length=0;mode='win';el('spin').onclick();await flush();await step(12000);assert.equal(read('balance'),599800);await step(1000);assert.equal(read('balance'),599800);assert(read('reels.every(r=>Math.abs(r.angle-Math.PI/2)<1e-8)'));assert.equal(scope.stopEvents.length,4,'exactly one sound per reel');assert(scope.stopEvents.every(e=>e.bolt===true));assert.deepEqual(scope.stopEvents.map(e=>e.level),[1,2,3,4],'charge escalates only at successive bolt stops');assert(read('reels.every(r=>r.strikeAt===r.impactAt)'),'bolt strike synchronized to bearing stop');assert(scope.stopEvents.every((e,i,a)=>i===0||e.time>a[i-1].time),'reel impacts remain staggered');
 const gaps=scope.stopEvents.slice(1).map((e,i)=>e.time-scope.stopEvents[i].time);assert(gaps[2]>800,'final bolt gets an extended landing');assert.equal(read('round.collected'),4);assert.equal(el('boltCollector').attributes['data-count'],'4');console.log('Consecutive bolt stop gaps (ms):',gaps);
 assert.equal(read('sessionNet'),99800,'session net includes both stakes and the win');assert.equal(el('sessionNet').textContent,'+£998.00');assert.equal(el('sessionNet').attributes['data-direction'],'up');
 // A simulation ID identifies an outcome template, not a unique played round.
 el('spin').onclick();await flush();await step(12000);assert.equal(read('balance'),699700);
 for(const failure of ['fail','invalid']){mode=failure;const before=read('balance'),calls=resultCalls;el('spin').onclick();await flush();await step(5000);assert.equal(read('balance'),before);assert.equal(read('busy'),false);assert.equal(resultCalls,calls+1);}
 mode='hold';read('autoSelected=3;startAuto()');await flush();assert.equal(read('autoLeft'),2);assert.equal(read('round'),null);const before=read('balance');await step(800);assert.equal(read('balance'),before);read('stopAuto()');release();await flush();await step(15000);assert.equal(read('balance'),before-100);assert.equal(read('autoRunning'),false);
 mode='lose';read('autoSelected=3;startAuto()');await flush();const start=read('balance');await step(18000);assert.equal(read('balance'),start-200);assert.equal(read('autoRunning'),false);
 mode='fail';read('autoSelected=3;startAuto()');await flush();assert.equal(read('autoRunning'),false);assert.equal(read('busy'),false);
 mode='lose';el('spin').onclick();await flush();assert.equal(read('LiveWireGame.beginMaths()'),false,'cannot open odds during active spin');await step(400);const angles=read('reels.map(r=>r.angle)');scope.document.hidden=true;listeners.visibilitychange();clock+=10000;raf(clock);scope.document.hidden=false;listeners.visibilitychange();raf(clock);assert.deepEqual(read('reels.map(r=>r.angle)'),angles);await step(5000);assert.equal(read('busy'),false);
 const callsBeforeMaths=resultCalls;
 assert.equal(read('LiveWireGame.beginMaths()'),true);el('spin').onclick();await flush();assert.equal(resultCalls,callsBeforeMaths,'no spins while odds panel is open');
 read('LiveWireGame.endMaths()');
 el('spin').onclick();await flush();assert.equal(resultCalls,callsBeforeMaths+1);await step(5000);
 read('balance=0;update()');const emptyCalls=resultCalls;el('spin').onclick();await flush();assert.equal(resultCalls,emptyCalls,'empty balance does not draw');
 el('refill').onclick();assert.equal(read('balance'),500000);assert.equal(el('refill').disabled,true);
 el('spin').onclick();await flush();assert(read('reels.every(r=>r.strikeAt===undefined&&r.chargeAt===undefined&&r.strikeLevel===0)'),'new spin clears all old strikes and charge levels');const activeBalance=read('balance');el('refill').onclick();assert.equal(read('balance'),activeBalance,'refill locked during spin');await step(5000);
 el('refill').onclick();assert.equal(read('balance'),500000);
 mode='mixed';scope.stopEvents.length=0;el('spin').onclick();await flush();await step(5000);assert.deepEqual(Array.from(read('reels.map(r=>r.strikeAt!==undefined)')),[true,false,true,false]);assert.deepEqual(scope.stopEvents.map(e=>e.bolt),[true,false,true,false]);assert.deepEqual(scope.stopEvents.map(e=>e.level),[1,0,2,0],'bolts separated by Xs still escalate');assert(read('reels[0].strikeLevel===2&&reels[2].strikeLevel===2'));assert(read('reels[1].strikeLevel===0&&reels[3].strikeLevel===0'));
 assert.equal(el('collectedCount').textContent,'2');assert.deepEqual(Array.from(read('[...collector.seen]')),[0,2],'separated reels feed one bank');
 assert(el('collectedBolt0').classList.contains('filled'));assert(el('collectedBolt1').classList.contains('filled'));assert(!el('collectedBolt2').classList.contains('filled'));
 mode='gapBonus';scope.stopEvents.length=0;const beforeGap=read('balance');el('spin').onclick();await flush();await step(7000);
 assert.equal(read('balance'),beforeGap+400);assert.equal(el('collectedCount').textContent,'3');assert.equal(el('winTitle').textContent,'SHOOTING SPREE');assert.equal(el('boltPay3').attributes['data-match'],'true');assert.equal(el('boltPay2').attributes['data-match'],'false');
 assert.deepEqual(scope.stopEvents.map(e=>e.level),[1,0,2,3],'an X does not break the collection sequence');
 mode='single';const beforeHalf=read('balance');el('spin').onclick();await flush();await step(5000);assert.equal(read('balance'),beforeHalf-80);assert.equal(read('lastWin'),20);assert.equal(el('winValue').textContent,'£0.20');assert.equal(el('collectedCount').textContent,'1');assert.deepEqual(Array.from(read('[...collector.seen]')),[1],'a bolt on reel 2 collects without a leading bolt');
 el('labsOpen').onclick();assert(el('mathsDialog').open);el('labsPay4').value='1000';el('labsOutcome').value='4';const beforeTest=read('balance'),beforeCalls=resultCalls;el('labsTest').onclick();await flush();await step(10000);assert.equal(read('balance'),beforeTest-100+100000);assert.equal(resultCalls,beforeCalls,'forced spin bypasses random draw once');assert.equal(read('round.outcome.forced'),true);assert.equal(el('rtpValue').textContent,'SHOWCASE');assert.equal(el('boltPayValue4').textContent,'Fixed 1,000×');
 mode='lose';el('spin').onclick();await flush();await step(5000);assert.equal(resultCalls,beforeCalls+1,'normal spin returns to outcome sampler');
 el('labsOpen').onclick();el('labsReset').onclick();el('labsApply').onclick();assert.equal(el('rtpValue').textContent,'SHOWCASE');assert(el('helpPayouts').innerHTML.includes('1,000×'));
 assert(el('helpPayouts').innerHTML.includes('Bonus'));assert(el('helpPayouts').innerHTML.includes('MEGA Bonus'));
 // Every final bolt count maps to the collection bank and survives the result timeout.
 for(const count of [1,2,3,4,0]){
   read('spin(false,'+count+')');assert.equal(el('boltCollector').attributes['data-count'],'0','new spin clears the collection bank');
   assert.equal(el('status').textContent,'Bet accepted · £1.00 demo · Loot boxes count anywhere.','pending spin exposes its current state');
   await flush();await step(14000);
   assert.equal(Number(el('boltCollector').attributes['data-count']),count,'final collection matches bolt count');
   if(count)assert(el('outcome').classList.contains('visible'),'returned amount remains visible after effects settle');
   if(count===3)assert.equal(el('winTitle').textContent,'SHOOTING SPREE','three bolts award the Bonus');
   if(count===4)assert.equal(el('winTitle').textContent,'MEGA SPREE','four bolts award the Mega Bonus');
   if(count===0)assert.equal(el('status').textContent,'Test spin · No return · Net −£1.00');
   if(count===1){assert.equal(el('winTitle').textContent,'RETURNED');assert.equal(el('status').textContent,'Test spin · 1 loot box anywhere · 0.2× · Net −£0.80');}
 }
 read('setBet(6)');assert.equal(Number(el('boltCollector').attributes['data-count']),0,'bet changes clear collected bolts');assert([1,2,3,4].every(n=>el('boltPay'+n).attributes['data-match']==='false'));
 assert.equal(el('status').textContent,'Loot boxes count on any reel. They don’t need to be next to each other.','stake changes clear stale result text');
 // Presentation must never own settlement or delay another allowed spin.
 read('spin(false,4)');await flush();
 for(let i=0;i<250&&read('busy');i++)await step(40);
 assert.equal(read('busy'),false);assert(read('payoutReveal!==null'));
 const settledBalance=read('balance'),exactReturn=read('lastWin');
 assert.equal(el('winAnnouncement').textContent,read('money(lastWin)'),'assistive technology receives the exact return once');
 mediaListeners.change({matches:true});await step(40);assert.equal(read('collector.events.length'),0,'reduced motion cancels travel without clearing collected bolts');assert.equal(el('collectedCount').textContent,'4');
 assert.equal(read('reduced'),true);assert.equal(read('payoutReveal'),null);assert.equal(el('winValue').textContent,read('money(lastWin)'));
 assert.equal(read('balance'),settledBalance,'reduced-motion switch cannot settle twice');
 const callsBeforeEmpty=resultCalls;read('balance=0');el('spin').onclick();await flush();
 assert.equal(resultCalls,callsBeforeEmpty);assert(!el('outcome').classList.contains('visible'),'insufficient credits cannot leave the old win beside the error');
 assert.match(el('status').textContent,/Lower the bet or refill/);assert([1,2,3,4].every(n=>el('boltPay'+n).attributes['data-match']==='false'),'insufficient-credit state clears the prior guide match');read('balance='+settledBalance);
 mediaListeners.change({matches:false});
 read('spin(false,4)');await flush();for(let i=0;i<250&&read('busy');i++)await step(40);
 assert(read('payoutReveal!==null'));const nextBalance=read('balance');
 mode='lose';el('spin').onclick();assert.equal(el('collectedCount').textContent,'0');assert.equal(read('collector.events.length'),0,'immediate replay clears old collection flights');await flush();assert.equal(read('payoutReveal'),null,'immediate replay cancels the old counter');
 assert(read('reels.every(r=>r.chargeHistory.length===0)'),'immediate replay clears charge envelopes');
 assert.equal(read('balance'),nextBalance-read('stakes[betIndex]'),'next spin debits exactly once');
 await step(6000);assert.equal(read('busy'),false);
 // Generated audio uses confirmed reel positions, never a separate sound outcome.
 scope.audioCues=[];read("sound=true;audioStart=()=>{};cinemaSound.collect=(...v)=>audioCues.push(['collect',...v]);cinemaSound.result=(...v)=>audioCues.push(['result',...v]);");
 mode='gapBonus';el('spin').onclick();await flush();await step(12000);
 assert.deepEqual(scope.audioCues.filter(v=>v[0]==='collect').map(v=>v[1]),[0,2,3],'only landed bolts trigger collection sound, including across an X');
 assert.deepEqual(Array.from(scope.audioCues.find(v=>v[0]==='result')),['result',3,5],'one Bonus cue follows the actual settled multiplier');
 const soundCount=scope.audioCues.length;read('sound=false');el('spin').onclick();await flush();await step(12000);assert.equal(scope.audioCues.length,soundCount,'muted gameplay emits no asset cues');
 read("sound=true;cinemaSound.result=()=>{throw Error('Audio output interrupted')};");mode='mixed';el('spin').onclick();await flush();await step(12000);assert.equal(read('busy'),false);assert.equal(read('round.paid'),true);assert.equal(el('spin').disabled,false,'audio output failure cannot trap the game');read('sound=false');
 // Fixed bonus awards cannot be edited in Labs.
 assert.throws(()=>read('LiveWireAPI.apply({payouts:[0,.5,2,.5,1000],probabilities:LiveWireAPI.defaults.probabilities.slice()})'),/fixed/);
 assert.deepEqual([...cinematicCounts].sort(),[3,4],'normal and Mega both traverse the real cinematic boundary');
 console.log('PASS: '+cinematicCollections+' normal/Mega cinematic entries retain the accepted prize, block premature collection and duplicate wagers, and settle exact pence once through Skip and Collect.');
 console.log('PASS: compact payout key follows default/Labs payouts and selected bet; only the settled count is marked, with no stale marks after reset or insufficient credits.');
 console.log('PASS: forced outcomes are labelled; fixed5x/1000x bonus awards cannot be overridden in Labs.');
 console.log('PASS: audio cues match separated bolts, settled Bonus and the existing mute control.');
 console.log('PASS: separated and non-leading bolts enter one bank; Xs retain progress; gapped Bonus and reduced/replay cleanup.');
 console.log('PASS: mid-reveal reduced motion, exact accessible winnings, immediate replay and charge-envelope cleanup.');
 console.log('PASS: readable pending/return/no-return states, stake reset and insufficient-credit recovery.');
 console.log('PASS: modal settings, slider drag and currency labels, Space blocked behind all panels, sound state, single spin/debit, locked bet, payout exactly once, rejected results uncharged, finite autoplay and stop, hidden-tab pause/resume, odds dialog lock, empty balance and refill, one sound per stop, bolt-only strikes and effect reset.');
})().catch(error=>{console.error(error);process.exitCode=1;});
