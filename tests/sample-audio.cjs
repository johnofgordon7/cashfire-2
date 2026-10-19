const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let contexts=0,fetches=0,decodes=0,fail=false,releaseLoad;
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
 async decodeAudioData(){decodes++;return {duration:60}}
}
const scope=vm.createContext({window:{AudioContext:Audio},document:{body:{setAttribute:(k,v)=>attrs[k]=String(v)}},console,fetch:async()=>{
 fetches++;if(releaseLoad)await releaseLoad;if(fail)throw Error('offline');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};
}});
for(const file of ['cinematic-fx.js','sample-audio.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),scope);
const Sound=vm.runInContext('LiveWireAudio',scope);
(async()=>{
 const s=new Sound();s.setBonusPhase('loading');s.featureEntry(4);s.setBonusPhase('closed');s.stopReel(0,true);s.ui();assert.equal(contexts,0);assert.equal(fetches,0,'phase changes and cues stay silent before gesture');
 s.unlock();await s.loading;assert.equal(s.buffers.size,12);assert(s.music);assert.equal(fetches,12);
 s.unlock();assert.equal(fetches,12,'decoded assets reused');assert.equal(contexts,1);
 const song=s.music;s.beginRound();assert.equal(s.music,song,'music does not restart each spin');
 s.startMotor();s.speed(20,3);assert(s.motorSample);assert(s.motorSample.source.loop);
 for(let n=1;n<=4;n++){s.stopReel(n-1,true,n);s.collect(n-1,false);}
 assert(s.voices.size<=16+1,'bounded effect voices plus one motor');
 const before=s.voices.size;s.result(1,.5);assert.equal(s.voices.size,before,'partial return has no win celebration');
 s.result(4,1000);assert(s.music.volume.gain.events.some(e=>e[0]<s.musicLevel)&&s.music.volume.gain.events.some(e=>e[1]>s.context.currentTime),'win ducks and restores music');assert([...s.voices].some(v=>v.start>s.context.currentTime));
 const important=[...s.voices].filter(v=>v.priority===3);for(let i=0;i<80;i++)s.ui();assert(important.every(v=>s.voices.has(v)),'UI clicks never steal result voices');
 const priorRound=[...s.voices].filter(v=>v.group!=='motor');s.beginRound();assert(priorRound.every(v=>v.done),'replay cancels prior stingers and delayed cues immediately');
 for(let i=0;i<80;i++)s.ui();assert(s.voices.size<=17,'rapid controls cannot create an unbounded voice count');
 s.context.currentTime=25;s.pause();assert.equal(s.music,null);assert.equal(s.motorSample,null);assert.equal(s.voices.size,0);assert.equal(s.musicOffset,15);
 s.unlock();assert.equal(s.music.source.offset,15,'music resumes from its prior place');
 s.collect(0,false);s.mute();assert.equal(s.enabled,false);assert.equal(s.music,null);assert([...s.voices].every(v=>v.releasing));
 for(const v of [...s.voices])v.source.onended();assert.equal(s.voices.size,0);
 s.unlock();s.stopReel(0,true,2);const oneShots=[...s.voices];for(const v of oneShots)v.source.onended();assert(oneShots.every(v=>v.source.disconnected&&v.volume.disconnected));
 // Native footage owns the sound field from deployment until the final reveal.
 // This includes already scheduled sources, fallback reverb and late decodes.
 const baseMusic=s.music;s.startMotor();s.collect(0,false);s.result(4,1000);const stale=[...s.voices];
 s.setBonusPhase('loading');assert.equal(s.music,baseMusic,'existing music continues silently without restarting');
 assert.equal(s.buses.music.gain.value,0);assert.equal(s.buses.effects.gain.value,0);assert.equal(s.buses.feature.gain.value,1);
 assert.equal(s.motorSample,null);assert.equal(s.motorWanted,false);assert.equal(s.voices.size,0);assert(stale.every(v=>v.done),'future base cues canceled immediately');
 s.featureEntry(4);assert.equal(s.voices.size,1);assert([...s.voices].every(v=>v.name==='mega'&&v.group==='feature'),'entry uses only the Mega identity sting');
 for(const phase of ['playing','paused','error']){
  s.setBonusPhase(phase);assert.equal(s.buses.music.gain.value,0);assert.equal(s.buses.effects.gain.value,0);assert.equal(s.buses.feature.gain.value,0);
  const beforeNative=sources.length;s.startMotor();s.speed(20,4);s.stopReel(0,true,4);s.collect(0,false);s.result(4,1000);s.featureEntry(4);s.tick(0);s.tone(440);s.noise(0,.1,.2,400);
  assert.equal(sources.length,beforeNative,phase+' suppresses sampled and synthetic gameplay cues');assert.equal(s.motorWanted,false);assert.equal(s.transients.size,0);
 }
 s.ui();assert([...s.voices].every(v=>v.name==='ui'),'quiet control clicks remain available during footage');
 s.mute();s.unlock();assert.equal(s.buses.music.gain.value,0);assert.equal(s.music,null,'Sound On during footage cannot start the music');
 s.pause();s.unlock();assert.equal(s.bonusPhase,'error');assert.equal(s.buses.music.gain.value,0,'hidden-tab resume retains native-film mix');assert.equal(s.music,null);
 s.setBonusPhase('reveal');assert(s.music);assert.equal(s.buses.music.gain.value,.5);assert.equal(s.buses.effects.gain.value,1);
 s.result(3,5);assert([...s.voices].some(v=>v.name==='win'),'final reveal permits the confirmed result cue');
 s.setBonusPhase('closed');assert.equal(s.buses.music.gain.value,1,'return restores base mix');assert.equal(s.buses.effects.gain.value,1);
 s.mute();s.setBonusPhase('loading');s.setBonusPhase('reveal');s.setBonusPhase('closed');assert.equal(s.music,null,'phase changes never clear player mute');assert.equal(s.enabled,false);
 s.setBonusPhase('not-a-phase');assert.equal(s.bonusPhase,'closed','unknown phase cannot corrupt the mix');
 // Finishing downloads after muting must not restart music or queued effects.
 let release;releaseLoad=new Promise(r=>release=r);const late=new Sound();late.unlock();const loading=late.loading;late.mute();release();await loading;assert.equal(late.music,null);assert.equal(late.voices.size,0);releaseLoad=null;
 let releaseFilm;releaseLoad=new Promise(r=>releaseFilm=r);const lateFilm=new Sound();lateFilm.setBonusPhase('loading');lateFilm.unlock();lateFilm.startMotor();const filmLoading=lateFilm.loading;lateFilm.setBonusPhase('playing');releaseFilm();await filmLoading;
 assert.equal(lateFilm.buffers.size,12);assert.equal(lateFilm.music,null);assert.equal(lateFilm.motorSample,null);assert.equal(lateFilm.motorWanted,false);assert.equal(lateFilm.voices.size,0);assert.equal(lateFilm.buses.music.gain.value,0,'late music decode cannot bypass the film mix');
 lateFilm.setBonusPhase('closed');assert(lateFilm.music,'decoded music becomes available on return to base');assert.equal(lateFilm.buses.music.gain.value,1);lateFilm.mute();releaseLoad=null;
 let releaseMotor;releaseLoad=new Promise(r=>releaseMotor=r);const lateMotor=new Sound();lateMotor.unlock();lateMotor.startMotor();const fallbackMotor=lateMotor.motor,motorLoading=lateMotor.loading;assert(fallbackMotor);assert.equal(lateMotor.motorWanted,true);releaseMotor();await motorLoading;
 assert(fallbackMotor.disconnected,'decoded spin recording replaces the synthetic fallback');assert(lateMotor.motorSample);const decodedMotor=lateMotor.motorSample;lateMotor.startMotor();assert.equal(lateMotor.motorSample,decodedMotor,'load completion cannot duplicate or restart the spin loop');lateMotor.mute();releaseLoad=null;
 fail=true;const offline=new Sound();offline.unlock();await offline.loading;assert.equal(offline.buffers.size,0);offline.startMotor();assert(offline.motor,'original audio remains available if assets fail');offline.stopReel(1,true,2);for(let i=0;i<100;i++)offline.tick(0);assert(offline.transients.size<=48);offline.setBonusPhase('playing');assert.equal(offline.motor,null);assert.equal(offline.transients.size,0,'bonus entry cancels offline motor and synthesis');offline.startMotor();offline.stopReel(1,true,2);offline.tick(0);offline.result(4,1000);assert.equal(offline.motor,null);assert.equal(offline.transients.size,0,'offline fallback cannot bypass native-film suppression');offline.setBonusPhase('closed');offline.pause();assert.equal(offline.transients.size,0,'synthetic tails cancel on interruption');offline.mute();
 fail=false;offline.unlock();await offline.loading;assert.equal(offline.buffers.size,12,'missing files retry on the next explicit sound activation');
 // Loading the music independently must not hold back essential contacts.
 let finishMusic;const heldMusic=new Promise(r=>finishMusic=r);scope.fetch=async url=>{if(url.includes('/music.mp3'))await heldMusic;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 const independent=new Sound();independent.unlock();const independentLoad=independent.loading;for(let i=0;i<80;i++)await Promise.resolve();
 assert(independent.buffers.has('reel-stop'));assert(!independent.music);independent.stopReel(0,true,1);assert(independent.voices.size>0);independent.mute();finishMusic();await independentLoad;assert.equal(independent.music,null);
 // A host cue map can replace individual event recordings. Five crate aliases
 // share a single fetch and decoded buffer.
 const mappedFetches=[];scope.fetch=async url=>{mappedFetches.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 scope.CashfireAudioPack={paths:{music:'/review/music.mp3',motor:'/review/spin.mp3','reel-stop':'/review/reel-stop.mp3',...Object.fromEntries(['bolt-1','bolt-2','bolt-3','bolt-4','collect'].map(n=>[n,'/review/loot-hit.mp3'])),win:'/review/win.mp3',bonus:'/review/bonus.mp3',mega:'/review/mega.mp3',transition:'/review/transition.mp3'}};
 const beforeDecodes=decodes,mapped=new Sound();mapped.setBonusPhase('loading');mapped.unlock();await mapped.loading;
 assert.equal(mapped.buffers.size,13);assert.equal(mappedFetches.length,9);assert.equal(decodes-beforeDecodes,9,'shared paths decode once under concurrent workers');
 assert.equal(mappedFetches.filter(p=>p==='/review/loot-hit.mp3').length,1);assert(mappedFetches.includes('assets/audio/1.0.0/ui.mp3'),'unspecified cue falls back to the baseline');
 assert(['bolt-1','bolt-2','bolt-3','bolt-4'].every(n=>mapped.buffers.get(n)===mapped.buffers.get('collect')));
 mapped.featureEntry(3);assert.deepEqual([...mapped.voices].map(v=>v.name),['bonus']);
 const normal=[...mapped.voices][0];mapped.featureEntry(4);assert(normal.done,'re-entry cancels the previous feature sting');assert.deepEqual([...mapped.voices].map(v=>v.name),['mega'],'Mega never stacks the Normal sting');
 mapped.featureEntry(4);assert.equal(mapped.voices.size,1,'repeated entry cannot stack feature cues');mapped.setBonusPhase('playing');assert.equal(mapped.voices.size,0);
 mapped.setBonusPhase('reveal');mapped.result(4,1000);mapped.result(4,1000);assert.deepEqual([...mapped.voices].map(v=>v.name),['win'],'reveal uses one actual win accent, not either entry sting');
 const pendingWin=[...mapped.voices][0];mapped.setBonusPhase('closed');assert(pendingWin.done,'Return cancels pending reveal stinger');assert.deepEqual([...mapped.voices].map(v=>v.name),['transition'],'dedicated transition owns the return boundary');
 const returnSources=sources.length;mapped.setBonusPhase('closed');assert.equal(sources.length,returnSources,'duplicate phase events never stack Return transitions');
 mapped.setBonusPhase('loading');mapped.buffers.delete('bonus');mapped.featureEntry(3);assert.deepEqual([...mapped.voices].map(v=>v.name),['transition'],'optional transition covers an unavailable entry cue');
 mapped.mute();delete scope.CashfireAudioPack;
 // Exercise the exact runtime pack, not a duplicate of its configured levels.
 vm.runInContext(fs.readFileSync(__dirname+'/../dist/audio-pack.js','utf8'),scope);
 const runtimeFetches=[];scope.fetch=async url=>{runtimeFetches.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 const runtime=new Sound();const beforeGesture=sources.length;runtime.setBonusPhase('loading');runtime.featureEntry(3);runtime.setBonusPhase('closed');assert.equal(sources.length,beforeGesture);
 runtime.unlock();await runtime.loading;
 assert.equal(new Set(runtimeFetches.filter(p=>p.includes('/cashfire-2/'))).size,8,'all eight selected recordings are mapped');assert.equal(runtimeFetches.length,9,'eight recordings plus the inherited UI click');
 assert.equal(runtime.musicLevel,.72);assert.equal(runtime.music.volume.gain.value,.72);assert.equal(runtime.music.source.loopStart,0);assert.equal(runtime.music.source.loopEnd,31.9);
 const runtimeMusic=runtime.music;for(let i=0;i<5;i++)runtime.unlock();runtime.startMusic();assert.equal(runtime.music,runtimeMusic,'music remains singleton across repeated Sound On');
 runtime.startMotor();const motor=runtime.motorSample;runtime.startMotor();assert.equal(runtime.motorSample,motor,'repeated start does not overlap or restart motor');assert.equal(motor.source.loopStart,0);assert.equal(motor.source.loopEnd,2.24);
 assert.equal(motor.volume.gain.value,.38);runtime.speed(20,4);assert(Math.abs(motor.volume.gain.value-(.09+20*.003)*.38/.18)<1e-12,'motor animation scales the configured level');
 runtime.stopMotor();assert(motor.done);assert(motor.source.stopAt<=runtime.context.currentTime,'motor replacement stops its previous source immediately');runtime.startMotor();assert.notEqual(runtime.motorSample,motor);
 const collectSources=sources.length;runtime.collect(0,false);assert.equal(sources.length,collectSources,'disabled duplicate loot collect allocates no source');
 for(let level=1;level<=4;level++){runtime.stopReel(level-1,true,level);assert.equal([...runtime.voices].find(v=>v.name==='bolt-'+level).volume.gain.value,[0,.68,.78,.88,.98][level],'crate tier uses measured pack gain');}
 runtime.context.currentTime=45;runtime.pause();assert(Math.abs(runtime.musicOffset-3.1)<1e-9,'music offset wraps within selected region');assert.equal(runtimeMusic.source.stopAt,45);
 runtime.unlock();assert(Math.abs(runtime.music.source.offset-3.1)<1e-9,'hidden-tab resume preserves loop position');
 runtime.setBonusPhase('loading');runtime.featureEntry(3);assert.equal([...runtime.voices].filter(v=>v.group==='feature').length,1);runtime.setBonusPhase('playing');assert.equal(runtime.buses.music.gain.value,0);assert.equal(runtime.voices.size,0);
 runtime.mute();runtime.unlock();assert.equal(runtime.music,null);assert.equal(runtime.buses.music.gain.value,0,'Sound toggle during native footage cannot restart music');runtime.setBonusPhase('reveal');runtime.result(3,5);runtime.setBonusPhase('closed');
 const transition=[...runtime.voices].find(v=>v.name==='transition');assert(transition);assert.equal(transition.volume.gain.value,.85);const oneReturn=sources.length;runtime.setBonusPhase('closed');assert.equal(sources.length,oneReturn);
 runtime.setBonusPhase('loading');assert(transition.done,'a new preview cancels the prior Return transition');runtime.featureEntry(4);assert.deepEqual([...runtime.voices].map(v=>v.name),['mega']);runtime.setBonusPhase('paused');assert.equal(runtime.voices.size,0,'cached native media takes priority over an unfinished entry sting');runtime.setBonusPhase('closed');
 runtime.stopReel(0,true,1);const beforeMute=[...runtime.voices],songBeforeMute=runtime.music;runtime.mute();assert(beforeMute.every(v=>v.done),'mute immediately cancels scheduled FX');assert.equal(runtime.voices.size,0);assert.equal(songBeforeMute.source.stopAt,runtime.context.currentTime);runtime.unlock();assert.notEqual(runtime.music.source,songBeforeMute.source);assert.equal(runtime.voices.size,0,'rapid Sound toggle cannot revive stale FX');runtime.mute();
 // A non-zero region must start inside it and wrap relative to its own start.
 scope.CashfireAudioPack={loops:{music:{start:8,end:18},motor:{start:99,end:2}},mix:{music:99,gains:{collect:0,win:0,motor:0}}};
 const region=new Sound();region.unlock();await region.loading;assert.equal(region.music.source.offset,8);assert.equal(region.music.source.loopStart,8);assert.equal(region.music.source.loopEnd,18);assert.equal(region.musicLevel,.34,'invalid mix value retains baseline');
 region.context.currentTime=45;region.pause();assert.equal(region.musicOffset,13);region.unlock();assert.equal(region.music.source.offset,13);assert.deepEqual({...region.loopRegion('motor',region.buffers.get('motor'))},{start:0,end:60},'invalid loop interval falls back to decoded duration');
 const silentSources=sources.length;region.collect(0,false);region.result(3,5);region.startMotor();assert.equal(sources.length,silentSources,'zero event gains create neither samples nor synthetic fallback');region.mute();delete scope.CashfireAudioPack;
 console.log('PASS: gesture gating, eight-cue runtime map, shared decoding, calibrated gains, zero-gain suppression, singleton music/motor, loop regions and resume offsets, one entry/reveal/return cue, 16-voice cap, native-film priority, late loads and offline fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});
