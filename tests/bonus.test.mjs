import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=await readFile(new URL('../dist/bonus.js',import.meta.url),'utf8');
const markup=await readFile(new URL('../dist/bonus-markup.html',import.meta.url),'utf8');
const playableMarkup=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness({loadMedia,play,crypto=webcrypto,importMedia}={}){
  class Node extends EventTarget{
    constructor(id){super();this.id=id;this.dataWrites={};this.dataset=new Proxy({},{set:(target,name,value)=>{this.dataWrites[name]=(this.dataWrites[name]||0)+1;target[name]=value;return true;}});this.attrs=new Map();this.attributeWrites=new Map();this.hidden=false;this.textContent='';this.currentTime=0;this.duration=30.08;this.paused=true;this.open=false;this.src='';this.currentSrc='';this.volume=1;this.muted=true;this.playCount=0;}
    get textContent(){return this.text||'';}
    set textContent(value){this.text=value;this.textWrites=(this.textWrites||0)+1;}
    setAttribute(name,value){this.attrs.set(name,String(value));this.attributeWrites.set(name,(this.attributeWrites.get(name)||0)+1);}
    getAttribute(name){return this.attrs.get(name)??null;}
    removeAttribute(name){this.attrs.delete(name);if(name==='src'){this.src='';this.currentSrc='';}}
    showModal(){this.open=true;this.openMessage=document.getElementById('bonusMessage').textContent;}
    close(){this.open=false;}
    focus(){document.activeElement=this;}
    click(){this.dispatchEvent(new Event('click'));}
    pause(){this.paused=true;}
    load(){this.currentSrc=this.src;}
    async play(){this.playCount++;if(play)await play(this);this.paused=false;}
  }
  const nodes=new Map([...ids,'sound','spin'].map(id=>[id,new Node(id)]));
  const document=new EventTarget();document.hidden=false;document.getElementById=id=>nodes.get(id)||null;
  nodes.get('sound').setAttribute('aria-pressed','false');nodes.get('sound').addEventListener('click',()=>nodes.get('sound').setAttribute('aria-pressed',nodes.get('sound').getAttribute('aria-pressed')==='true'?'false':'true'));
  const timers=new Map();let timerId=0;const revoked=[];
  class TestURL extends URL{static revokeObjectURL(url){revoked.push(url);}}
  const media=loadMedia||{getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(video,{signal,onProgress}){onProgress({loadedBytes:2,totalBytes:4,phase:'loading'});signal.throwIfAborted();return{url:'blob:native-film'};}};
  const imports=[];
  const context=vm.createContext({document,crypto,CustomEvent,AbortController,URL:TestURL,location:{href:'https://cashfire.test/dist/index.html'},setTimeout(callback){const id=++timerId;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);},__loadMedia:async specifier=>{imports.push(specifier);return importMedia?importMedia(specifier):media;}});
  // Replace only the import boundary: the production state machine and DOM handlers execute unchanged.
  const expressions=[...source.matchAll(/import\('\.\/combat-media\.js(?:\?[^']*)?'(?:\+mediaAttempt\+\+)?\)/g)];
  assert.equal(expressions.length,1,'one production media import boundary');
  const importExpression=expressions[0][0];
  vm.runInContext(source.replace(importExpression,importExpression.replace(/^import\(/,'__loadMedia(')),context);
  return{api:context.LiveWireBonus,nodes,document,revoked,timers,imports,video:nodes.get('bonusFilm'),phase:()=>nodes.get('bonusGame').dataset.phase,click:id=>nodes.get(id).click(),visibility(hidden){document.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));}};
}
const accepted=(extra={})=>({count:3,stake:100,multiplier:5,onCollect(){},...extra});
const pounds=cents=>'£'+(cents/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
function assertUnrevealed(h,{multiplier=5,stake=100}={}){
  for(const id of ['bonusPrize','bonusAmount','bonusRange'])assert.equal(h.nodes.has(id),false,'obsolete pre-film award node is absent: '+id);
  for(const id of ['bonusFinalPrize','bonusFinalAmount','bonusFinalLabel','bonusEndNote'])assert.equal(h.nodes.get(id).textContent,'','final fields stay empty before reveal: '+id);
  assert.equal(h.nodes.get('bonusFinalLabel').hidden,true,'example label cannot reveal early');
  assert.equal(h.nodes.get('bonusEnd').hidden,true);assert.equal(h.nodes.get('bonusCollect').hidden,true);
  const visibleText=[...h.nodes.values()].filter(node=>node.id!=='bonusStake').map(node=>node.textContent).join(' ');
  const moneyTokens=visibleText.match(/£[0-9,]+\.[0-9]{2}(?![0-9])/g)||[];
  const multiplierTokens=visibleText.match(/[0-9][0-9,]*(?:\.[0-9]+)?×/g)||[];
  assert.equal(moneyTokens.includes(pounds(stake*multiplier)),false,'the exact future currency award is not leaked into pre-film text');
  assert.equal(multiplierTokens.includes(multiplier.toLocaleString('en-GB')+'×'),false,'the exact future multiplier is not leaked into pre-film text');
  assert.doesNotMatch(visibleText,/locked total return|fixed (?:5|1,?000)×|win up to/i);
}
function assertRevealed(h,{multiplier=5,stake=100,preview=false}={}){
  assert.equal(h.phase(),'reveal');assert.equal(h.nodes.get('bonusEnd').hidden,false);assert.equal(h.nodes.get('bonusCollect').hidden,false);
  assert.equal(h.nodes.get('bonusFinalPrize').textContent,multiplier.toLocaleString('en-GB')+'×');
  assert.equal(h.nodes.get('bonusFinalAmount').textContent,pounds(stake*multiplier));
  if(preview){
    assert.equal(h.nodes.get('bonusEndTitle').textContent,'PREVIEW COMPLETE');
    assert.equal(h.nodes.get('bonusFinalLabel').hidden,false);
    assert.equal(h.nodes.get('bonusFinalLabel').textContent,'EXAMPLE RETURN');
    assert.match(h.nodes.get('bonusEndNote').textContent,/Example result for the selected stake\. No demo credits were used or awarded\./);
    for(const id of ['bonusEndNote','bonusMessage','bonusPhase','bonusContinue','bonusBrief','bonusStake'])assert.doesNotMatch(h.nodes.get(id).textContent,/\bNet\b|collect.*winnings|your winnings|accepted award|full bonus award|returned stake/i,'free preview has no credited-win/net claim: '+id);
    assert.equal(h.nodes.get('bonusMessage').textContent,'Preview complete. Return to the reels. No demo credits were used or awarded.');
  }else{
    assert.equal(h.nodes.get('bonusEndTitle').textContent,'BONUS SECURED');
    assert.equal(h.nodes.get('bonusFinalLabel').hidden,true);
    assert.equal(h.nodes.get('bonusFinalLabel').textContent,'');
    assert.match(h.nodes.get('bonusEndNote').textContent,/Total return includes returned stake/);
    assert.ok(h.nodes.get('bonusEndNote').textContent.includes('Net +'+pounds(stake*(multiplier-1))));
    assert.equal(h.nodes.get('bonusMessage').textContent,'Return to the reels to collect your winnings.');
  }
}

test('bonus markup has unique required nodes and uses the native video without a loop',()=>{
  assert.equal(new Set(ids).size,ids.length);for(const id of ['bonusGame','bonusFilm','bonusCollect','bonusSkip','bonusRetry','bonusPause','bonusSound','bonusFinalLabel','bonusFailureKicker','bonusKillProgress','bonusKillMeter','bonusRunningMultiplier','bonusRunningAmount','bonusProgressLabel','bonusProgressNote','bonusProgressState','bonusProgressStep','bonusProgressAnnounce'])assert.ok(ids.includes(id),'required native/HUD node: '+id);
  assert.match(markup,/<[^>]*\bid="bonusPrototype"[^>]*>\s*PROTOTYPE\s*</);assert.match(markup,/(?:FOOTAGE|FILM) KILLS/);
  assert.doesNotMatch(markup,/bonus-ledger|LOCKED TOTAL RETURN|id="bonus(?:Prize|Amount|Range)"|Fixed (?:5|1,?000)×|Win up to/i);
  assert.doesNotMatch(playableMarkup,/bonus-ledger|LOCKED TOTAL RETURN|id="bonus(?:Prize|Amount|Range)"/i,'the actual playable page must not retain an outdated pre-film ledger');
  assert.doesNotMatch(markup,/<video[^>]*\bloop\b/);assert.doesNotMatch(markup,/bonusCanvas|conveyor/);
});
test('three boxes always award5x and four always1000x without consuming feature randomness',()=>{
  const {api}=harness({crypto:{getRandomValues(){assert.fail('Fixed feature awards must not request randomness');}}});
  for(const [count,value] of [[3,5],[4,1000]]){
    const p=api.profile(count);assert.deepEqual([...p.prizes],[value]);assert.deepEqual([...p.weights],[100]);assert.ok(Object.isFrozen(p));
    assert.equal(p.min,value);assert.equal(p.max,value);assert.equal(p.mean,value);
    assert.equal(api.pick(count),value);
    for(let ticket=0;ticket<100;ticket++)assert.equal(api.pick(count,ticket),value);
  }
  for(const ticket of [-1,100,0.5,NaN])assert.throws(()=>api.pick(3,ticket));assert.throws(()=>api.pick(2,0));
});
test('invalid accepted awards and fixture access fail before opening',()=>{
  const {api}=harness();
  for(const multiplier of [10,15,20,30,50,100])assert.throws(()=>api.open(accepted({multiplier})),'superseded normal prizes are rejected');
  for(const multiplier of [30,50,100,140,250,500])assert.throws(()=>api.open(accepted({count:4,multiplier})),'superseded Mega prizes are rejected');
  assert.throws(()=>api.open(accepted({fixture:{mediaFailure:true}})));
  for(const clipIndex of [0,1,2,3,4])assert.throws(()=>api.open(accepted({preview:true,fixture:{clipIndex}})),'film overrides cannot select another presentation');
  assert.throws(()=>api.open(accepted({stake:0})));assert.equal(api.active,false);
});
test('native clock updates kills, reveals at endpoint, and collects the accepted award exactly once',async()=>{
  const h=harness(),received=[];h.nodes.get('bonusTimeline').value=30;h.api.open(accepted({onCollect:value=>received.push(value)}));assert.equal(h.nodes.get('bonusTimeline').value,0);assert.equal(h.phase(),'loading');assertUnrevealed(h);await flush();assert.equal(h.phase(),'playing');assertUnrevealed(h);
  assert.throws(()=>h.api.open(accepted()));h.video.currentTime=19.5;h.api.draw(999999);assert.equal(h.nodes.get('bonusKills').textContent,'03');assert.deepEqual(received,[]);assertUnrevealed(h);
  h.video.currentTime=30;h.api.draw(1000000);assertRevealed(h);assert.equal(h.api.active,true);assert.deepEqual(received,[]);h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);assert.equal(h.api.active,false);assert.equal(h.document.activeElement.id,'spin');assert.deepEqual(h.revoked,['blob:native-film']);
});
test('skip during a pending native download aborts it and ignores/revokes its late result',async()=>{
  const pending=deferred();let signal;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo(_video,options){signal=options.signal;return pending.promise;}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();h.click('bonusSkip');assert.equal(signal.aborted,true);assert.equal(h.phase(),'reveal');pending.resolve({url:'blob:late'});await flush();assert.equal(h.video.playCount,0);assert.ok(h.revoked.includes('blob:late'));h.click('bonusCollect');assert.deepEqual(received,[5]);
});
test('media failure retry pins the same film and accepted award; continue never invents a refund',async()=>{
  let calls=0;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(){if(++calls===1)throw Error('404');return{url:'blob:retry'};}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();assert.equal(h.phase(),'error');assertUnrevealed(h);const film=h.nodes.get('bonusGame').dataset.film;h.click('bonusRetry');await flush();assert.equal(h.phase(),'playing');assert.equal(h.nodes.get('bonusGame').dataset.film,film);assertUnrevealed(h);h.click('bonusSkip');assertRevealed(h);h.click('bonusCollect');assert.deepEqual(received,[5]);
  h.api.open(accepted({preview:true,fixture:{mediaFailure:true},onCollect:value=>received.push(value)}));assert.equal(h.phase(),'error');assertUnrevealed(h);h.click('bonusContinue');assertRevealed(h,{preview:true});assert.match(h.nodes.get('bonusEndNote').textContent,/unavailable/);h.click('bonusCollect');assert.deepEqual(received,[5,5]);
});
test('a failed module import is cleared and Retry imports a fresh URL before preserving the same award',async()=>{
  let attempts=0;
  const media={getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(){return{url:'blob:module-retry'};}};
  const h=harness({async importMedia(){if(++attempts===1)throw Error('Transient module fetch failure');return media;}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();assert.equal(h.phase(),'error');
  assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-005');assert.deepEqual(received,[]);
  h.click('bonusRetry');await flush();assert.equal(h.phase(),'playing');assert.equal(attempts,2);
  assert.equal(h.imports.length,2);assert.notEqual(h.imports[0],h.imports[1],'retry must bypass a browser-cached failed module URL');
  assert.match(h.imports[0],/attempt=0$/);assert.match(h.imports[1],/attempt=1$/);
  assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-005');assertUnrevealed(h);
  h.click('bonusSkip');h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);
});
test('manual pause and hidden-tab hold preserve native time and require manual resume',async()=>{
  const h=harness();h.api.open(accepted());await flush();h.video.currentTime=10;h.click('bonusPause');assert.equal(h.phase(),'paused');assert.equal(h.video.paused,true);assertUnrevealed(h);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assert.equal(h.video.currentTime,10);assertUnrevealed(h);
  h.visibility(true);assert.equal(h.phase(),'paused');h.visibility(false);await flush();assert.equal(h.phase(),'paused');assertUnrevealed(h);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');h.click('bonusSkip');h.click('bonusCollect');
});
test('hiding while loading holds the same operation after download even after tab becomes visible',async()=>{
  const pending=deferred();const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted());await flush();h.visibility(true);h.visibility(false);pending.resolve({url:'blob:visibility'});await flush();assert.equal(h.phase(),'paused');assert.equal(h.video.playCount,0);h.click('bonusSkip');h.click('bonusCollect');
});
test('browser gesture rejection offers resume rather than changing the award',async()=>{
  const h=harness({async play(video){if(video.playCount===1){const error=Error('Gesture required');error.name='NotAllowedError';throw error;}}});h.api.open(accepted());await flush();assert.equal(h.phase(),'paused');assert.match(h.nodes.get('bonusHoldMessage').textContent,/Tap Resume/);assertUnrevealed(h);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assertUnrevealed(h);h.click('bonusSkip');assertRevealed(h);h.click('bonusCollect');
});
test('shared sound control synchronizes native video mute while payout remains fixed',async()=>{
  const h=harness();h.api.open(accepted());await flush();assert.equal(h.video.muted,true);h.click('bonusSound');assert.equal(h.video.muted,false);assert.equal(h.video.volume,.55);h.click('bonusSound');assert.equal(h.video.muted,true);assertUnrevealed(h);h.click('bonusSkip');assertRevealed(h);h.click('bonusCollect');
});
test('wrong metadata duration and early video endpoint offer the accepted award fallback',async()=>{
  const h=harness(),received=[];h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();h.video.duration=3;h.video.dispatchEvent(new Event('loadedmetadata'));assert.equal(h.phase(),'error');assert.deepEqual(received,[]);h.click('bonusContinue');h.click('bonusCollect');assert.deepEqual(received,[5]);
});
test('preview pause holds its mapped winning film and repeated normal/Mega entries never rotate',async()=>{
  const h=harness();h.api.open(accepted({preview:true,fixture:{paused:true}}));await flush();assert.equal(h.phase(),'paused');assert.equal(h.video.playCount,0);assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-005');h.click('bonusSkip');h.click('bonusCollect');
  for(const [count,multiplier,film] of [[3,5,'EXTRACT-005'],[4,1000,'EXTRACT-1000']]){
    for(let i=0;i<5;i++){
      h.api.open(accepted({count,multiplier,preview:true,fixture:{mediaFailure:true}}));
      assert.equal(h.nodes.get('bonusGame').dataset.film,film,'repeat '+i+' must use the same winning film');
      h.click('bonusContinue');h.click('bonusCollect');
    }
  }
});
test('Mega native clock shows ten footage kills while its fixed1000x award collects once',async()=>{
  const h=harness(),received=[];h.api.open(accepted({count:4,multiplier:1000,onCollect:value=>received.push(value)}));await flush();
  assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-1000');assertUnrevealed(h,{multiplier:1000});
  h.video.currentTime=24.65;h.api.draw(1234);assert.equal(h.nodes.get('bonusKills').textContent,'10');assert.deepEqual(received,[]);assertUnrevealed(h,{multiplier:1000});
  h.video.currentTime=30;h.api.draw(5678);assertRevealed(h,{multiplier:1000});h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[1000]);
});
test('reopening after a Mega reveal clears every final field and reveals the next stake-scaled result only at its own endpoint',async()=>{
  const h=harness(),received=[];
  for(const [count,multiplier,stake] of [[4,1000,200],[3,5,100],[4,1000,100]]){
    h.api.open(accepted({count,multiplier,stake,onCollect:value=>received.push(value)}));
    assertUnrevealed(h,{multiplier,stake});await flush();assertUnrevealed(h,{multiplier,stake});
    assert.equal(h.nodes.get('bonusBrief').textContent,count===4?'MEGA BONUS':'BONUS');
    assert.equal(h.nodes.get('bonusStake').textContent,'BET '+pounds(stake));
    h.video.currentTime=29.99;h.api.draw(1);assertUnrevealed(h,{multiplier,stake});
    h.video.currentTime=30;h.api.draw(2);assertRevealed(h,{multiplier,stake});
    h.click('bonusCollect');h.click('bonusCollect');
  }
  assert.deepEqual(received,[1000,5,1000]);
});
test('a timed-out loading request offers continue with no automatic collection',async()=>{
  const pending=deferred(),received=[];const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();for(const callback of h.timers.values())callback();assert.equal(h.phase(),'error');assert.deepEqual(received,[]);h.click('bonusContinue');h.click('bonusCollect');assert.deepEqual(received,[5]);pending.resolve({url:'blob:timed-out'});await flush();assert.ok(h.revoked.includes('blob:timed-out'));
});

test('paid and free preview entry/Skip copy stays distinct across repeated normal and Mega openings',async()=>{
  const h=harness(),received=[];
  for(const [count,multiplier,stake,preview] of [[3,5,200,false],[4,1000,5000,true],[4,1000,100,false],[3,5,100,true]]){
    h.api.open(accepted({count,multiplier,stake,preview,onCollect:value=>received.push(value)}));
    assertUnrevealed(h,{multiplier,stake});assert.equal(h.phase(),'loading');
    assert.equal(h.nodes.get('bonusStake').textContent,preview?'FREE PREVIEW · EXAMPLE STAKE '+pounds(stake):'BET '+pounds(stake));
    assert.equal(h.nodes.get('bonusBrief').textContent,preview?'FREE PREVIEW':count===4?'MEGA BONUS':'BONUS');
    assert.equal(h.nodes.get('bonusFailureKicker').textContent,preview?'FREE PREVIEW':'BONUS AWARD SAFE');
    assert.equal(h.nodes.get('bonusContinue').textContent,preview?'VIEW EXAMPLE RESULT':'CONTINUE TO AWARD');
    assert.equal(h.nodes.get('bonusSkip').getAttribute('aria-label'),preview?'Skip footage and view the example result':'Skip footage and reveal your winnings');
    assert.equal(h.nodes.get('bonusGame').openMessage,preview?'Loading your free preview. No demo credits are used.':'Your winnings are revealed after the operation.','copy is correct before the modal is exposed');
    if(preview)assert.match(h.nodes.get('bonusLoadDetail').textContent,/free preview.*No demo credits are used/);
    await flush();assert.equal(h.phase(),'playing');assertUnrevealed(h,{multiplier,stake});
    if(preview)assert.equal(h.nodes.get('bonusMessage').textContent,'Free preview. The example result follows the operation. No demo credits are used.');
    h.click('bonusSkip');assertRevealed(h,{multiplier,stake,preview});
    h.click('bonusCollect');h.click('bonusCollect');
    assert.equal(h.api.active,false);
  }
  assert.deepEqual(received,[5,1000,1000,5],'each presentation callback runs once without a new prize draw');
});

test('free preview completion reveals exact selected-stake examples without a paid win or Net claim',async()=>{
  const h=harness(),received=[];
  for(const [count,multiplier,stake] of [[3,5,200],[4,1000,5000]]){
    h.api.open(accepted({count,multiplier,stake,preview:true,onCollect:value=>received.push(value)}));
    await flush();assertUnrevealed(h,{multiplier,stake});assert.deepEqual(received,count===3?[]:[5]);
    h.video.currentTime=29.99;h.api.draw(1);assertUnrevealed(h,{multiplier,stake});
    h.video.currentTime=30;h.api.draw(2);assertRevealed(h,{multiplier,stake,preview:true});
    assert.equal(h.nodes.get('bonusPhase').textContent,'PREVIEW COMPLETE');
    h.click('bonusCollect');h.click('bonusCollect');
  }
  assert.deepEqual(received,[5,1000]);
});

test('free preview recovery, retry and pause never reuse accepted-award or collect-winnings feedback',async()=>{
  let calls=0;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(){if(++calls===1)throw Error('404');return{url:'blob:free-retry'};}}}),received=[];
  h.api.open(accepted({preview:true,stake:200,onCollect:value=>received.push(value)}));await flush();
  assert.equal(h.phase(),'error');assertUnrevealed(h,{stake:200});
  assert.equal(h.nodes.get('bonusFailureKicker').textContent,'FREE PREVIEW');
  assert.equal(h.nodes.get('bonusContinue').textContent,'VIEW EXAMPLE RESULT');
  assert.match(h.nodes.get('bonusFailureMessage').textContent,/No demo credits were used or awarded/);
  assert.doesNotMatch(h.nodes.get('bonusFailureMessage').textContent,/your (?:accepted )?bonus|award is safe|full bonus award|winnings|\bNet\b/i);
  h.click('bonusRetry');await flush();assert.equal(h.phase(),'playing');assertUnrevealed(h,{stake:200});
  h.click('bonusPause');assert.equal(h.phase(),'paused');assert.match(h.nodes.get('bonusHoldMessage').textContent,/Preview paused.*No demo credits/);
  assert.equal(h.nodes.get('bonusMessage').textContent,'Preview paused. Resume when you are ready. No demo credits are used.');
  h.click('bonusResume');await flush();h.visibility(true);assert.match(h.nodes.get('bonusHoldMessage').textContent,/Preview paused while you were away/);
  h.visibility(false);h.click('bonusResume');await flush();h.click('bonusSkip');assertRevealed(h,{stake:200,preview:true});h.click('bonusCollect');
  h.api.open(accepted({count:4,multiplier:1000,preview:true,fixture:{mediaFailure:true},onCollect:value=>received.push(value)}));
  assert.equal(h.phase(),'error');assertUnrevealed(h,{multiplier:1000});h.click('bonusContinue');assertRevealed(h,{multiplier:1000,preview:true});h.click('bonusCollect');h.click('bonusCollect');
  assert.deepEqual(received,[5,1000]);
});

test('free preview timeout, incomplete media and gesture recovery keep all money feedback illustrative',async()=>{
  const pending=deferred();const timed=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});
  timed.api.open(accepted({preview:true}));await flush();for(const callback of timed.timers.values())callback();
  assert.equal(timed.phase(),'error');assert.match(timed.nodes.get('bonusFailureMessage').textContent,/example result.*No demo credits were used or awarded/);
  timed.click('bonusContinue');assertRevealed(timed,{preview:true});timed.click('bonusCollect');pending.resolve({url:'blob:late-preview'});await flush();
  const incomplete=harness();incomplete.api.open(accepted({preview:true}));await flush();incomplete.video.duration=3;incomplete.video.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(incomplete.phase(),'error');assert.match(incomplete.nodes.get('bonusFailureMessage').textContent,/No demo credits were used or awarded/);incomplete.click('bonusContinue');assertRevealed(incomplete,{preview:true});incomplete.click('bonusCollect');
  const gesture=harness({async play(video){if(video.playCount===1){const error=Error('Gesture required');error.name='NotAllowedError';throw error;}}});
  gesture.api.open(accepted({preview:true}));await flush();assert.equal(gesture.phase(),'paused');
  assert.equal(gesture.nodes.get('bonusHoldMessage').textContent,'Tap Resume to start your free preview. No demo credits are used.');
  gesture.click('bonusResume');await flush();gesture.click('bonusSkip');assertRevealed(gesture,{preview:true});gesture.click('bonusCollect');
});

const normalKills=[6.5,12.3,18.3,24.1],megaKills=[3.95,5.15,8.45,9.55,14,16.05,18.7,19.45,23.45,24.65];
const multiplierLabel=value=>value.toLocaleString('en-GB',{maximumFractionDigits:1})+'\u00d7';
function assertProgress(h,{kills,total,value,stake=100}){
  assert.equal(h.nodes.get('bonusKills').textContent,String(kills).padStart(2,'0'));
  assert.equal(h.nodes.get('bonusKillTotal').textContent,String(total).padStart(2,'0'));
  assert.equal(h.nodes.get('bonusKillMeter').value,kills);assert.equal(h.nodes.get('bonusKillMeter').max,total);
  assert.equal(h.nodes.get('bonusRunningMultiplier').textContent,multiplierLabel(value));
  const pence=Number(BigInt(stake)*BigInt(Math.round(value*10))/10n);
  assert.equal(h.nodes.get('bonusRunningAmount').textContent,pounds(pence),'running cash uses exact floored pence');
  assert.equal(h.nodes.get('bonusKillProgress').dataset.kills,String(kills));
  assert.equal(h.nodes.get('bonusKillProgress').dataset.beat,kills?(kills%2?'odd':'even'):'none');
}

for(const [count,multiplier,times,values] of [[3,5,normalKills,[.5,1,2,2]],[4,1000,megaKills,[.5,1,2,5,10,25,50,100,250,250]]]){
  test('all '+times.length+' native '+(count===3?'normal':'Mega')+' kill thresholds use the source ladder and await extraction for the final total',async()=>{
    const h=harness({crypto:{getRandomValues(){assert.fail('kill progress cannot sample another outcome');}}}),received=[];
    h.api.open(accepted({count,multiplier,onCollect:value=>received.push(value)}));
    assertProgress(h,{kills:0,total:times.length,value:0});assertUnrevealed(h,{multiplier});
    await flush();
    for(let i=0;i<times.length;i++){
      h.video.currentTime=times[i]-.001;h.api.draw(i);
      assertProgress(h,{kills:i,total:times.length,value:i?values[i-1]:0});assertUnrevealed(h,{multiplier});
      h.video.currentTime=times[i];h.video.dispatchEvent(new Event('timeupdate'));
      assertProgress(h,{kills:i+1,total:times.length,value:values[i]});assertUnrevealed(h,{multiplier});
      assert.deepEqual(received,[],'a confirmed kill cannot settle or collect');
    }
    assert.equal(h.nodes.get('bonusProgressState').textContent,'Extraction pending');
    assert.equal(h.nodes.get('bonusProgressStep').textContent,'Final step at extraction');
    h.video.currentTime=29.999;h.api.draw(100);assertUnrevealed(h,{multiplier});
    assertProgress(h,{kills:times.length,total:times.length,value:values.at(-1)});
    h.video.currentTime=30;h.video.dispatchEvent(new Event('timeupdate'));
    assertProgress(h,{kills:times.length,total:times.length,value:multiplier});assertRevealed(h,{multiplier});
    assert.equal(h.nodes.get('bonusProgressState').textContent,'Extraction complete');assert.deepEqual(received,[]);
    h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[multiplier]);
  });
}

test('all eighteen selected stakes keep source-ladder progress and final returns in integer pence',async()=>{
  const h=harness(),stakes=[10,20,40,60,80,100,200,300,400,500,600,700,800,900,1000,2000,3000,5000];
  for(const [count,multiplier,times,held] of [[3,5,normalKills,2],[4,1000,megaKills,250]])for(const stake of stakes){
    h.api.open(accepted({count,multiplier,stake,preview:true}));await flush();
    h.video.currentTime=times[0];h.api.draw(0);assertProgress(h,{kills:1,total:times.length,value:.5,stake});
    h.video.currentTime=times.at(-1);h.api.draw(1);assertProgress(h,{kills:times.length,total:times.length,value:held,stake});assertUnrevealed(h,{multiplier,stake});
    h.click('bonusSkip');assertProgress(h,{kills:times.length,total:times.length,value:multiplier,stake});assertRevealed(h,{multiplier,stake,preview:true});
    assert.equal(h.nodes.get('bonusProgressState').textContent,'Skipped to result');
    assert.equal(h.nodes.get('bonusProgressNote').textContent,'Example only \u00b7 no credits used or awarded.');h.click('bonusCollect');
  }
});

test('odd-pence and large accepted stakes floor partial source values without overflowing intermediates',async()=>{
  for(const [count,multiplier,stake] of [[3,5,101],[4,1000,301],[4,1000,Math.floor(Number.MAX_SAFE_INTEGER/1000)-1]]){
    const h=harness(),received=[];h.api.open(accepted({count,multiplier,stake,onCollect:value=>received.push(value)}));await flush();
    h.video.currentTime=count===3?normalKills[0]:megaKills[0];h.api.draw(0);
    assertProgress(h,{kills:1,total:count===3?4:10,value:.5,stake});assert.deepEqual(received,[]);
    if(stake===101)assert.equal(h.nodes.get('bonusRunningAmount').textContent,pounds(50),'half of 101 pence floors to 50 pence');
    h.click('bonusSkip');assert.equal(h.nodes.get('bonusFinalAmount').textContent,pounds(stake*multiplier));h.click('bonusCollect');assert.deepEqual(received,[multiplier]);
  }
});

test('unchanged timestamps and backward seeks cannot repeat progress announcements, pulses or payouts',async()=>{
  const h=harness(),received=[];h.api.open(accepted({preview:true,onCollect:value=>received.push(value)}));await flush();h.video.currentTime=normalKills[0];h.api.draw(0);
  const fields=['bonusKills','bonusKillTotal','bonusRunningMultiplier','bonusRunningAmount','bonusProgressLabel','bonusProgressNote','bonusProgressState','bonusProgressStep','bonusProgressAnnounce'];
  const snapshot=()=>JSON.stringify({text:fields.map(id=>h.nodes.get(id).textWrites),aria:h.nodes.get('bonusKillMeter').attributeWrites.get('aria-valuetext'),pulse:h.nodes.get('bonusKillProgress').dataWrites});
  const stable=snapshot();
  for(const time of [6.5,6.6,0,6.5,6.7]){h.video.currentTime=time;h.api.draw(time);h.video.dispatchEvent(new Event('timeupdate'));assert.equal(snapshot(),stable);}
  assertProgress(h,{kills:1,total:4,value:.5});assert.deepEqual(received,[]);
  h.video.currentTime=normalKills[1];h.api.draw(7);assertProgress(h,{kills:2,total:4,value:1});
  assert.notEqual(snapshot(),stable,'a new confirmed kill updates the accessible progress once');
  const next=snapshot();h.api.draw(8);h.video.dispatchEvent(new Event('timeupdate'));assert.equal(snapshot(),next);
  h.click('bonusSkip');assertRevealed(h,{preview:true});h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);
});

test('pause, hidden tabs and media errors freeze confirmed progress without fabricating unwatched kills',async()=>{
  const h=harness(),received=[];h.api.open(accepted({preview:true,onCollect:value=>received.push(value)}));await flush();
  h.video.currentTime=normalKills[1];h.click('bonusPause');assert.equal(h.phase(),'paused');assertProgress(h,{kills:2,total:4,value:1});
  h.video.currentTime=30;h.api.draw(1);assertProgress(h,{kills:2,total:4,value:1});assertUnrevealed(h);
  h.video.currentTime=normalKills[1];h.click('bonusResume');await flush();h.visibility(true);h.video.currentTime=30;h.api.draw(2);
  assert.equal(h.phase(),'paused');assertProgress(h,{kills:2,total:4,value:1});h.visibility(false);
  h.video.currentTime=normalKills[1];h.click('bonusResume');await flush();
  h.video.currentTime=normalKills[2];h.video.error={code:3};h.video.dispatchEvent(new Event('error'));
  assert.equal(h.phase(),'error');assertProgress(h,{kills:3,total:4,value:2});assertUnrevealed(h);assert.deepEqual(received,[]);
  h.video.currentTime=30;h.video.dispatchEvent(new Event('ended'));assert.equal(h.phase(),'error');assertProgress(h,{kills:3,total:4,value:2});assertUnrevealed(h);
  h.video.currentTime=0;h.api.draw(3);assertProgress(h,{kills:3,total:4,value:2});
  h.click('bonusContinue');assertProgress(h,{kills:3,total:4,value:5});assertRevealed(h,{preview:true});
  assert.equal(h.nodes.get('bonusProgressState').textContent,'Result without footage');h.click('bonusCollect');assert.deepEqual(received,[5]);
});

test('Retry rewinds the film and clears the kill meter, running return and parity before reloading',async()=>{
  const h=harness(),received=[];h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();
  h.video.currentTime=normalKills[2];h.video.error={code:3};h.video.dispatchEvent(new Event('error'));
  assertProgress(h,{kills:3,total:4,value:2});h.click('bonusRetry');
  assert.equal(h.phase(),'loading');assertProgress(h,{kills:0,total:4,value:0});assertUnrevealed(h);assert.equal(h.nodes.get('bonusTimeline').value,0);
  await flush();assert.equal(h.phase(),'playing');assert.equal(h.video.currentTime,0);assertProgress(h,{kills:0,total:4,value:0});
  h.video.currentTime=normalKills[0];h.api.draw(1);assertProgress(h,{kills:1,total:4,value:.5});
  h.click('bonusSkip');assertProgress(h,{kills:1,total:4,value:5});assert.equal(h.nodes.get('bonusProgressState').textContent,'Skipped to result');h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);
});

test('Skip or fallback before any footage reveals the selected result with zero observed kills',async()=>{
  const pending=deferred(),received=[];const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});
  h.api.open(accepted({onCollect:value=>received.push(value)}));h.video.currentTime=30;h.click('bonusSkip');
  assertProgress(h,{kills:0,total:4,value:5});assertRevealed(h);assert.equal(h.nodes.get('bonusProgressState').textContent,'Skipped to result');assert.deepEqual(received,[]);h.click('bonusCollect');assert.deepEqual(received,[5]);pending.resolve({url:'blob:unwatched'});await flush();
  const fallback=harness();fallback.api.open(accepted({count:4,multiplier:1000,preview:true,fixture:{mediaFailure:true}}));fallback.video.currentTime=30;fallback.click('bonusContinue');
  assertProgress(fallback,{kills:0,total:10,value:1000});assertRevealed(fallback,{multiplier:1000,preview:true});assert.equal(fallback.nodes.get('bonusProgressState').textContent,'Result without footage');fallback.click('bonusCollect');
});

test('reduced motion updates source-ladder values immediately using only the existing media clock',async()=>{
  const h=harness();h.api.open(accepted({preview:true}));await flush();const timers=h.timers.size;
  h.video.currentTime=normalKills[0];h.api.draw(1,true);assert.equal(h.nodes.get('bonusGame').dataset.reduced,'true');assertProgress(h,{kills:1,total:4,value:.5});
  h.video.currentTime=normalKills[3];h.api.draw(2,true);assertProgress(h,{kills:4,total:4,value:2});assert.equal(h.nodes.get('bonusProgressState').textContent,'Extraction pending');assertUnrevealed(h);
  assert.equal(h.timers.size,timers,'kill progress creates no timer or independent animation clock');
  h.video.currentTime=30;h.api.draw(3,true);assertProgress(h,{kills:4,total:4,value:5});assertRevealed(h,{preview:true});h.click('bonusCollect');
});

test('a queued native ended event cannot reveal while paused; a resumed endpoint still reveals and collects once',async()=>{
  for(const [count,multiplier,preview,time,kills,value] of [[3,5,false,12.3,2,1],[4,1000,true,14,5,10]]){
    const h=harness(),received=[];h.api.open(accepted({count,multiplier,preview,onCollect:v=>received.push(v)}));await flush();
    h.video.currentTime=time;h.click('bonusPause');assert.equal(h.phase(),'paused');
    h.video.currentTime=30;h.video.dispatchEvent(new Event('ended'));
    assert.equal(h.phase(),'paused');assertUnrevealed(h,{multiplier});assertProgress(h,{kills,total:count===3?4:10,value});assert.deepEqual(received,[]);
    h.video.currentTime=time;h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');
    h.video.currentTime=30;h.video.dispatchEvent(new Event('ended'));assertRevealed(h,{multiplier,preview});
    assertProgress(h,{kills:count===3?4:10,total:count===3?4:10,value:multiplier});assert.deepEqual(received,[]);
    h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[multiplier]);
  }
});
