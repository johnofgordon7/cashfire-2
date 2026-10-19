import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=await readFile(new URL('../dist/bonus.js',import.meta.url),'utf8');
const markup=await readFile(new URL('../dist/bonus-markup.html',import.meta.url),'utf8');
const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness({loadMedia,play,crypto=webcrypto,importMedia}={}){
  class Node extends EventTarget{
    constructor(id){super();this.id=id;this.dataset={};this.attrs=new Map();this.hidden=false;this.textContent='';this.currentTime=0;this.duration=30.08;this.paused=true;this.open=false;this.src='';this.currentSrc='';this.volume=1;this.muted=true;this.playCount=0;}
    setAttribute(name,value){this.attrs.set(name,String(value));}
    getAttribute(name){return this.attrs.get(name)??null;}
    removeAttribute(name){this.attrs.delete(name);if(name==='src'){this.src='';this.currentSrc='';}}
    showModal(){this.open=true;}
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
  const context=vm.createContext({document,crypto,AbortController,URL:TestURL,location:{href:'https://cashfire.test/dist/index.html'},setTimeout(callback){const id=++timerId;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);},__loadMedia:async specifier=>{imports.push(specifier);return importMedia?importMedia(specifier):media;}});
  // Replace only the import boundary: the production state machine and DOM handlers execute unchanged.
  const expressions=[...source.matchAll(/import\('\.\/combat-media\.js(?:\?[^']*)?'(?:\+mediaAttempt\+\+)?\)/g)];
  assert.equal(expressions.length,1,'one production media import boundary');
  const importExpression=expressions[0][0];
  vm.runInContext(source.replace(importExpression,importExpression.replace(/^import\(/,'__loadMedia(')),context);
  return{api:context.LiveWireBonus,nodes,document,revoked,timers,imports,video:nodes.get('bonusFilm'),phase:()=>nodes.get('bonusGame').dataset.phase,click:id=>nodes.get(id).click(),visibility(hidden){document.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));}};
}
const accepted=(extra={})=>({count:3,stake:100,multiplier:5,onCollect(){},...extra});

test('bonus markup has unique required nodes and uses the native video without a loop',()=>{
  assert.equal(new Set(ids).size,ids.length);for(const id of ['bonusGame','bonusFilm','bonusCollect','bonusSkip','bonusRetry','bonusPause','bonusSound'])assert.ok(ids.includes(id));
  assert.match(markup,/LOCKED TOTAL RETURN/);assert.match(markup,/FOOTAGE KILLS/);assert.doesNotMatch(markup,/<video[^>]*\bloop\b/);assert.doesNotMatch(markup,/bonusCanvas|conveyor/);
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
  const h=harness(),received=[];h.nodes.get('bonusTimeline').value=30;h.api.open(accepted({onCollect:value=>received.push(value)}));assert.equal(h.nodes.get('bonusTimeline').value,0);assert.equal(h.phase(),'loading');assert.equal(h.nodes.get('bonusAmount').textContent,'£5.00');await flush();assert.equal(h.phase(),'playing');
  assert.throws(()=>h.api.open(accepted()));h.video.currentTime=19.5;h.api.draw(999999);assert.equal(h.nodes.get('bonusKills').textContent,'03');assert.deepEqual(received,[]);
  h.video.currentTime=30;h.api.draw(1000000);assert.equal(h.phase(),'reveal');assert.equal(h.api.active,true);assert.deepEqual(received,[]);h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);assert.equal(h.api.active,false);assert.equal(h.document.activeElement.id,'spin');assert.deepEqual(h.revoked,['blob:native-film']);
});
test('skip during a pending native download aborts it and ignores/revokes its late result',async()=>{
  const pending=deferred();let signal;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo(_video,options){signal=options.signal;return pending.promise;}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();h.click('bonusSkip');assert.equal(signal.aborted,true);assert.equal(h.phase(),'reveal');pending.resolve({url:'blob:late'});await flush();assert.equal(h.video.playCount,0);assert.ok(h.revoked.includes('blob:late'));h.click('bonusCollect');assert.deepEqual(received,[5]);
});
test('media failure retry pins the same film and accepted award; continue never invents a refund',async()=>{
  let calls=0;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(){if(++calls===1)throw Error('404');return{url:'blob:retry'};}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();assert.equal(h.phase(),'error');const film=h.nodes.get('bonusGame').dataset.film;h.click('bonusRetry');await flush();assert.equal(h.phase(),'playing');assert.equal(h.nodes.get('bonusGame').dataset.film,film);assert.equal(h.nodes.get('bonusPrize').textContent,'5×');h.click('bonusSkip');h.click('bonusCollect');assert.deepEqual(received,[5]);
  h.api.open(accepted({preview:true,fixture:{mediaFailure:true},onCollect:value=>received.push(value)}));assert.equal(h.phase(),'error');h.click('bonusContinue');assert.equal(h.phase(),'reveal');assert.match(h.nodes.get('bonusEndNote').textContent,/unavailable/);h.click('bonusCollect');assert.deepEqual(received,[5,5]);
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
  assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-005');assert.equal(h.nodes.get('bonusPrize').textContent,'5×');
  h.click('bonusSkip');h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[5]);
});
test('manual pause and hidden-tab hold preserve native time and require manual resume',async()=>{
  const h=harness();h.api.open(accepted());await flush();h.video.currentTime=10;h.click('bonusPause');assert.equal(h.phase(),'paused');assert.equal(h.video.paused,true);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assert.equal(h.video.currentTime,10);
  h.visibility(true);assert.equal(h.phase(),'paused');h.visibility(false);await flush();assert.equal(h.phase(),'paused');h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');h.click('bonusSkip');h.click('bonusCollect');
});
test('hiding while loading holds the same operation after download even after tab becomes visible',async()=>{
  const pending=deferred();const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted());await flush();h.visibility(true);h.visibility(false);pending.resolve({url:'blob:visibility'});await flush();assert.equal(h.phase(),'paused');assert.equal(h.video.playCount,0);h.click('bonusSkip');h.click('bonusCollect');
});
test('browser gesture rejection offers resume rather than changing the award',async()=>{
  const h=harness({async play(video){if(video.playCount===1){const error=Error('Gesture required');error.name='NotAllowedError';throw error;}}});h.api.open(accepted());await flush();assert.equal(h.phase(),'paused');assert.match(h.nodes.get('bonusHoldMessage').textContent,/Tap Resume/);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assert.equal(h.nodes.get('bonusAmount').textContent,'£5.00');h.click('bonusSkip');h.click('bonusCollect');
});
test('shared sound control synchronizes native video mute while payout remains fixed',async()=>{
  const h=harness();h.api.open(accepted());await flush();assert.equal(h.video.muted,true);h.click('bonusSound');assert.equal(h.video.muted,false);assert.equal(h.video.volume,.55);h.click('bonusSound');assert.equal(h.video.muted,true);assert.equal(h.nodes.get('bonusPrize').textContent,'5×');h.click('bonusSkip');h.click('bonusCollect');
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
  assert.equal(h.nodes.get('bonusGame').dataset.film,'EXTRACT-1000');assert.equal(h.nodes.get('bonusAmount').textContent,'£1,000.00');
  h.video.currentTime=24.65;h.api.draw(1234);assert.equal(h.nodes.get('bonusKills').textContent,'10');assert.deepEqual(received,[]);
  h.video.currentTime=30;h.api.draw(5678);h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[1000]);
});
test('a timed-out loading request offers continue with no automatic collection',async()=>{
  const pending=deferred(),received=[];const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();for(const callback of h.timers.values())callback();assert.equal(h.phase(),'error');assert.deepEqual(received,[]);h.click('bonusContinue');h.click('bonusCollect');assert.deepEqual(received,[5]);pending.resolve({url:'blob:timed-out'});await flush();assert.ok(h.revoked.includes('blob:timed-out'));
});
