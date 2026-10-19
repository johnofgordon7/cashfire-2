const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let contexts=0,fetches=0,fail=false,releaseLoad;
const attrs={},sources=[];
class Param {
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(v,t){assert(Number.isFinite(v)&&Number.isFinite(t));this.value=v;this.events.push([v,t]);}
 exponentialRampToValueAtTime(v,t){this.setValueAtTime(v,t);}
 setTargetAtTime(v,t){this.setValueAtTime(v,t);}
 cancelScheduledValues(t){this.events=this.events.filter(e=>e[1]<t);}
}
class Node {
 constructor(){for(const p of ['gain','frequency','pan','Q','threshold','knee','ratio','attack','release','playbackRate'])this[p]=new Param();}
 connect(n){return n;} disconnect(){this.disconnected=true;}
 start(t=0,offset=0){this.startAt=t;this.offset=offset;sources.push(this);}
 stop(t=0){this.stopAt=t;}
}
class Audio {
 constructor(){contexts++;this.sampleRate=8000;this.currentTime=10;this.destination=new Node();}
 createGain(){return new Node()}createDynamicsCompressor(){return new Node()}createConvolver(){return new Node()}
 createStereoPanner(){return new Node()}createBufferSource(){return new Node()}createOscillator(){return new Node()}createBiquadFilter(){return new Node()}
 createBuffer(channels,length){return {duration:length/this.sampleRate,getChannelData:()=>new Float32Array(length)}}
 resume(){return Promise.resolve()}
 async decodeAudioData(){return {duration:60}}
}
const scope=vm.createContext({window:{AudioContext:Audio},document:{body:{setAttribute:(k,v)=>attrs[k]=String(v)}},console,fetch:async()=>{
 fetches++;if(releaseLoad)await releaseLoad;if(fail)throw Error('offline');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};
}});
for(const file of ['cinematic-fx.js','sample-audio.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),scope);
const Sound=vm.runInContext('LiveWireAudio',scope);
(async()=>{
 const s=new Sound();s.stopReel(0,true);s.ui();assert.equal(contexts,0);assert.equal(fetches,0,'silent before gesture');
 s.unlock();await s.loading;assert.equal(s.buffers.size,12);assert(s.music);assert.equal(fetches,12);
 s.unlock();assert.equal(fetches,12,'decoded assets reused');assert.equal(contexts,1);
 const song=s.music;s.beginRound();assert.equal(s.music,song,'music does not restart each spin');
 s.startMotor();s.speed(20,3);assert(s.motorSample);assert(s.motorSample.source.loop);
 for(let n=1;n<=4;n++){s.stopReel(n-1,true,n);s.collect(n-1,false);}
 assert(s.voices.size<=16+1,'bounded effect voices plus one motor');
 const before=s.voices.size;s.result(1,.5);assert.equal(s.voices.size,before,'partial return has no win celebration');
 s.result(4,1000);assert(s.music.volume.gain.events.some(e=>e[0]<s.musicLevel)&&s.music.volume.gain.events.some(e=>e[1]>s.context.currentTime),'win ducks and restores music');assert([...s.voices].some(v=>v.start>s.context.currentTime));
 const important=[...s.voices].filter(v=>v.priority===3);for(let i=0;i<80;i++)s.ui();assert(important.every(v=>s.voices.has(v)),'UI clicks never steal result voices');
 s.beginRound();assert([...s.voices].filter(v=>v.group==='effect').every(v=>v.releasing),'replay cancels prior stingers and delayed cues');
 for(let i=0;i<80;i++)s.ui();assert(s.voices.size<=17,'rapid controls cannot create an unbounded voice count');
 s.context.currentTime=25;s.pause();assert.equal(s.music,null);assert.equal(s.motorSample,null);assert.equal(s.voices.size,0);assert.equal(s.musicOffset,15);
 s.unlock();assert.equal(s.music.source.offset,15,'music resumes from its prior place');
 s.collect(0,false);s.mute();assert.equal(s.enabled,false);assert.equal(s.music,null);assert([...s.voices].every(v=>v.releasing));
 for(const v of [...s.voices])v.source.onended();assert.equal(s.voices.size,0);
 s.unlock();s.stopReel(0,true,2);const oneShots=[...s.voices];for(const v of oneShots)v.source.onended();assert(oneShots.every(v=>v.source.disconnected&&v.volume.disconnected));
 // Finishing downloads after muting must not restart music or queued effects.
 let release;releaseLoad=new Promise(r=>release=r);const late=new Sound();late.unlock();const loading=late.loading;late.mute();release();await loading;assert.equal(late.music,null);assert.equal(late.voices.size,0);releaseLoad=null;
 fail=true;const offline=new Sound();offline.unlock();await offline.loading;assert.equal(offline.buffers.size,0);offline.startMotor();assert(offline.motor,'original audio remains available if assets fail');offline.stopReel(1,true,2);for(let i=0;i<100;i++)offline.tick(0);assert(offline.transients.size<=48);offline.pause();assert.equal(offline.transients.size,0,'synthetic tails cancel on interruption');offline.mute();
 fail=false;offline.unlock();await offline.loading;assert.equal(offline.buffers.size,12,'missing files retry on the next explicit sound activation');
 // Loading the music independently must not hold back essential contacts.
 let finishMusic;const heldMusic=new Promise(r=>finishMusic=r);scope.fetch=async url=>{if(url.includes('/music.mp3'))await heldMusic;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 const independent=new Sound();independent.unlock();const independentLoad=independent.loading;for(let i=0;i<80;i++)await Promise.resolve();
 assert(independent.buffers.has('reel-stop'));assert(!independent.music);independent.stopReel(0,true,1);assert(independent.voices.size>0);independent.mute();finishMusic();await independentLoad;assert.equal(independent.music,null);
 console.log('PASS: gesture gating, all 12 assets, one context per player, music continuity, ducking, four strike tiers, no loss celebration, 16-voice cap, replay cancellation, mute, hidden-tab cleanup, late loads and offline fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
