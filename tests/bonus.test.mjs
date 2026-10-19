import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=await readFile(new URL('../dist/bonus.js',import.meta.url),'utf8');
const markup=await readFile(new URL('../dist/bonus-markup.html',import.meta.url),'utf8');
const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness({loadMedia,play}={}){
  class Node extends EventTarget{
    constructor(id){super();this.id=id;this.dataset={};this.attrs=new Map();this.hidden=false;this.textContent='';this.currentTime=0;this.duration=30.041667;this.paused=true;this.open=false;this.src='';this.currentSrc='';this.volume=1;this.muted=true;this.playCount=0;}
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
  const context=vm.createContext({document,crypto:webcrypto,AbortController,URL:TestURL,location:{href:'https://cashfire.test/dist/index.html'},setTimeout(callback){const id=++timerId;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);},__loadMedia:async()=>media});
  // Replace only the import boundary: the production state machine and DOM handlers execute unchanged.
  const importExpression="import('./combat-media.js?v=cashfire-2-native-1')";
  assert.equal(source.split(importExpression).length,2);
  vm.runInContext(source.replace(importExpression,'__loadMedia()'),context);
  return{api:context.LiveWireBonus,nodes,document,revoked,timers,video:nodes.get('bonusFilm'),phase:()=>nodes.get('bonusGame').dataset.phase,click:id=>nodes.get(id).click(),visibility(hidden){document.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));}};
}
const accepted=(extra={})=>({count:3,stake:100,multiplier:20,onCollect(){},...extra});

test('bonus markup has unique required nodes and uses the native video without a loop',()=>{
  assert.equal(new Set(ids).size,ids.length);for(const id of ['bonusGame','bonusFilm','bonusCollect','bonusSkip','bonusRetry','bonusPause','bonusSound'])assert.ok(ids.includes(id));
  assert.match(markup,/LOCKED TOTAL RETURN/);assert.match(markup,/FOOTAGE KILLS/);assert.doesNotMatch(markup,/<video[^>]*\bloop\b/);assert.doesNotMatch(markup,/bonusCanvas|conveyor/);
});
test('normal and mega prize supports, exact ticket weights and means preserve Live Wire',()=>{
  const {api}=harness();const expected={3:{prizes:[10,15,20,30,50,100],weights:[60,10,10,10,5,5],mean:20},4:{prizes:[30,50,100,250,500,1000],weights:[50,20,10,10,4,6],mean:140}};
  for(const count of [3,4]){const p=api.profile(count),e=expected[count];assert.deepEqual([...p.prizes],e.prizes);assert.deepEqual([...p.weights],e.weights);assert.ok(Object.isFrozen(p));const draws=Array.from({length:100},(_,ticket)=>api.pick(count,ticket));for(let i=0;i<e.prizes.length;i++)assert.equal(draws.filter(value=>value===e.prizes[i]).length,e.weights[i]);assert.equal(draws.reduce((a,b)=>a+b)/100,e.mean);}
  for(const ticket of [-1,100,0.5,NaN])assert.throws(()=>api.pick(3,ticket));assert.throws(()=>api.pick(2,0));
});
test('invalid accepted awards and fixture access fail before opening',()=>{
  const {api}=harness();assert.throws(()=>api.open(accepted({count:4,multiplier:140})));assert.throws(()=>api.open(accepted({fixture:{mediaFailure:true}})));assert.throws(()=>api.open(accepted({stake:0})));assert.equal(api.active,false);
});
test('native clock updates kills, reveals at endpoint, and collects the accepted award exactly once',async()=>{
  const h=harness(),received=[];h.nodes.get('bonusTimeline').value=30;h.api.open(accepted({onCollect:value=>received.push(value)}));assert.equal(h.nodes.get('bonusTimeline').value,0);assert.equal(h.phase(),'loading');assert.equal(h.nodes.get('bonusAmount').textContent,'£20.00');await flush();assert.equal(h.phase(),'playing');
  assert.throws(()=>h.api.open(accepted()));h.video.currentTime=19.5;h.api.draw(999999);assert.equal(h.nodes.get('bonusKills').textContent,'02');assert.deepEqual(received,[]);
  h.video.currentTime=30;h.api.draw(1000000);assert.equal(h.phase(),'reveal');assert.equal(h.api.active,true);assert.deepEqual(received,[]);h.click('bonusCollect');h.click('bonusCollect');assert.deepEqual(received,[20]);assert.equal(h.api.active,false);assert.equal(h.document.activeElement.id,'spin');assert.deepEqual(h.revoked,['blob:native-film']);
});
test('skip during a pending native download aborts it and ignores/revokes its late result',async()=>{
  const pending=deferred();let signal;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo(_video,options){signal=options.signal;return pending.promise;}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();h.click('bonusSkip');assert.equal(signal.aborted,true);assert.equal(h.phase(),'reveal');pending.resolve({url:'blob:late'});await flush();assert.equal(h.video.playCount,0);assert.ok(h.revoked.includes('blob:late'));h.click('bonusCollect');assert.deepEqual(received,[20]);
});
test('media failure retry pins the same film and accepted award; continue never invents a refund',async()=>{
  let calls=0;const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),async loadChunkedVideo(){if(++calls===1)throw Error('404');return{url:'blob:retry'};}}}),received=[];
  h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();assert.equal(h.phase(),'error');const film=h.nodes.get('bonusGame').dataset.film;h.click('bonusRetry');await flush();assert.equal(h.phase(),'playing');assert.equal(h.nodes.get('bonusGame').dataset.film,film);assert.equal(h.nodes.get('bonusPrize').textContent,'20×');h.click('bonusSkip');h.click('bonusCollect');assert.deepEqual(received,[20]);
  h.api.open(accepted({preview:true,fixture:{mediaFailure:true},onCollect:value=>received.push(value)}));assert.equal(h.phase(),'error');h.click('bonusContinue');assert.equal(h.phase(),'reveal');assert.match(h.nodes.get('bonusEndNote').textContent,/unavailable/);h.click('bonusCollect');assert.deepEqual(received,[20,20]);
});
test('manual pause and hidden-tab hold preserve native time and require manual resume',async()=>{
  const h=harness();h.api.open(accepted());await flush();h.video.currentTime=10;h.click('bonusPause');assert.equal(h.phase(),'paused');assert.equal(h.video.paused,true);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assert.equal(h.video.currentTime,10);
  h.visibility(true);assert.equal(h.phase(),'paused');h.visibility(false);await flush();assert.equal(h.phase(),'paused');h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');h.click('bonusSkip');h.click('bonusCollect');
});
test('hiding while loading holds the same operation after download even after tab becomes visible',async()=>{
  const pending=deferred();const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted());await flush();h.visibility(true);h.visibility(false);pending.resolve({url:'blob:visibility'});await flush();assert.equal(h.phase(),'paused');assert.equal(h.video.playCount,0);h.click('bonusSkip');h.click('bonusCollect');
});
test('browser gesture rejection offers resume rather than changing the award',async()=>{
  const h=harness({async play(video){if(video.playCount===1){const error=Error('Gesture required');error.name='NotAllowedError';throw error;}}});h.api.open(accepted());await flush();assert.equal(h.phase(),'paused');assert.match(h.nodes.get('bonusHoldMessage').textContent,/Tap Resume/);h.click('bonusResume');await flush();assert.equal(h.phase(),'playing');assert.equal(h.nodes.get('bonusAmount').textContent,'£20.00');h.click('bonusSkip');h.click('bonusCollect');
});
test('shared sound control synchronizes native video mute while payout remains fixed',async()=>{
  const h=harness();h.api.open(accepted());await flush();assert.equal(h.video.muted,true);h.click('bonusSound');assert.equal(h.video.muted,false);assert.equal(h.video.volume,.55);h.click('bonusSound');assert.equal(h.video.muted,true);assert.equal(h.nodes.get('bonusPrize').textContent,'20×');h.click('bonusSkip');h.click('bonusCollect');
});
test('wrong metadata duration and early video endpoint offer the accepted award fallback',async()=>{
  const h=harness(),received=[];h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();h.video.duration=3;h.video.dispatchEvent(new Event('loadedmetadata'));assert.equal(h.phase(),'error');assert.deepEqual(received,[]);h.click('bonusContinue');h.click('bonusCollect');assert.deepEqual(received,[20]);
});
test('preview paused fixture never starts automatically and five native films remain finite presentation',async()=>{
  const h=harness();h.api.open(accepted({preview:true,fixture:{clipIndex:0,paused:true}}));await flush();assert.equal(h.phase(),'paused');assert.equal(h.video.playCount,0);h.click('bonusSkip');h.click('bonusCollect');
  const seen=new Set();for(let i=0;i<5;i++){h.api.open(accepted({preview:true,fixture:{mediaFailure:true}}));seen.add(h.nodes.get('bonusGame').dataset.film);h.click('bonusContinue');h.click('bonusCollect');}assert.equal(seen.size,5);
});
test('a timed-out loading request offers continue with no automatic collection',async()=>{
  const pending=deferred(),received=[];const h=harness({loadMedia:{getVideoTransport:()=>({type:'chunks'}),loadChunkedVideo:()=>pending.promise}});h.api.open(accepted({onCollect:value=>received.push(value)}));await flush();for(const callback of h.timers.values())callback();assert.equal(h.phase(),'error');assert.deepEqual(received,[]);h.click('bonusContinue');h.click('bonusCollect');assert.deepEqual(received,[20]);pending.resolve({url:'blob:timed-out'});await flush();assert.ok(h.revoked.includes('blob:timed-out'));
});
