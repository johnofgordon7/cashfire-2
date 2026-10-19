const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const voices=[],nodes=[];
let contexts=0;
class Param {
  constructor(){this.value=0;this.events=[];}
  setValueAtTime(value,time){assert(Number.isFinite(value)&&Number.isFinite(time));this.events.push({value,time});}
  exponentialRampToValueAtTime(value,time){assert(value>0&&Number.isFinite(value)&&time>=10);this.events.push({value,time});}
  setTargetAtTime(value,time,constant){assert(Number.isFinite(value)&&time>=10&&constant>0);this.events.push({value,time});}
}
class Node {
  constructor(){nodes.push(this);for(const p of ['frequency','gain','pan','Q','threshold','knee','ratio','attack','release'])this[p]=new Param();}
  connect(node){return node;}
  disconnect(){this.disconnected=true;}
  start(time=10){assert(time>=10);this.started=time;voices.push(this);}
  stop(time=10){assert(time>=this.started);this.stopped=time;}
}
class Audio {
  constructor(){contexts++;this.currentTime=10;this.sampleRate=8000;this.destination=new Node();}
  createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createConvolver(){return new Node();}
  createStereoPanner(){return new Node();}createOscillator(){return new Node();}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  resume(){return Promise.resolve();}
}
const scope=vm.createContext({window:{AudioContext:Audio},console});
for(const name of ['motion-fx.js','lightning-storm.js','cinematic-fx.js','machine-geometry.js','live-renderer.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+name,'utf8'),scope);
const Sound=vm.runInContext('CinematicAudio',scope),fx=vm.runInContext('ReelLightning',scope),R=vm.runInContext('ReelRenderer',scope);
const sound=new Sound();sound.stopReel(0,true);assert.equal(contexts,0,'no audio context before user enables sound');
assert(sound.unlock());assert.equal(contexts,1);
for(let index=0;index<4;index++){
  const before=voices.length;sound.stopReel(index,false);const normal=voices.length-before;
  const winBefore=voices.length;sound.stopReel(index,true);assert(voices.length-winBefore>normal,'winning reels add an electrical strike and thunder');
}
const levelVoices=[];for(let level=1;level<=4;level++){const before=voices.length;sound.stopReel(2,true,level);levelVoices.push(voices.length-before);}assert(levelVoices.every((count,i)=>i===0||count>levelVoices[i-1]),'successive bolt tiers add sound layers');
assert(nodes.some(n=>n.pan.value<0)&&nodes.some(n=>n.pan.value>0),'stereo follows the four reels');
assert(voices.some(n=>n.stopped-n.started>1),'thunder has a sustained tail');
for(const voice of voices){assert(Number.isFinite(voice.stopped),'every one-shot voice has a finite stop');voice.onended();assert(voice.disconnected,'completed voices disconnect');}
sound.startMotor();const motor=sound.motor;sound.speed(24);sound.mute();assert.equal(sound.motor,null);assert(motor.disconnected);assert.equal(sound.output.gain.events.at(-1).value,0);
sound.unlock();assert.equal(contexts,1,'reuses context after unmute');

const reels=[-291,-97,97,291].map(x=>({x,angle:Math.PI/2,light:1,impactAt:100,strikeAt:100}));
const renderer=Object.create(R.prototype);renderer.width=1024;renderer.height=448;renderer.camera=R.cameraSetup().camera;renderer.ready=true;
const points=reels.map(r=>renderer.strikePoint(r,reels,170,false));
assert(points.every((p,i)=>p.every(Number.isFinite)&&Math.abs(p[0])<512&&Math.abs(p[1])<224&&(i===0||p[0]>points[i-1][0])),'strike locations follow projected reel positions');
let strokes=0,rects=0;
const ctx=new Proxy({stroke(){strokes++;},fillRect(){rects++;},createRadialGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:(...args)=>{assert(args.every(a=>typeof a!=='number'||Number.isFinite(a)));}});
fx.draw(ctx,reels,renderer,170,-224,false);assert(strokes>20);assert.equal(rects,4);
strokes=0;rects=0;fx.draw(ctx,reels,renderer,170,-224,true);assert.equal(strokes,0,'reduced motion has no bolts, sparks or rings');assert.equal(rects,4);
strokes=0;rects=0;fx.draw(ctx,reels,renderer,3200,-224,false);assert.equal(strokes+rects,0,'expired effects draw nothing');
assert.equal(fx.strength({},170),0);assert.equal(fx.strength(reels[0],90),0);assert.equal(fx.strength(reels[0],3200),0);
const view=R.cameraSetup();assert.equal(view.eye[0],0,'camera is horizontally centred');
assert(points.every(p=>Math.abs(p[1]-points[0][1])<1e-8),'level camera keeps strike targets on one horizontal row');
assert(Math.abs(points[0][0]+points[3][0])<1e-8,'left and right reels have symmetric projection');
const root=renderer.rootPose(reels,170,false);for(const i of [1,2,4,6,8,9])assert.equal(root[i],0,'stop recoil cannot rotate the cabinet');
const progressive=[-291,-97,97,291].map(x=>({x,angle:0,light:0}));
let previousStrokes=0,lastTime=0;
for(let level=1;level<=4;level++){
 const time=100+(level-1)*350;lastTime=time;
 assert.equal(fx.land(progressive,progressive[level-1],time),level);
 for(let i=0;i<4;i++){
  assert.equal(progressive[i].strikeAt!==undefined,i<level,'only revealed bolts are charged');
  if(i<level){assert.equal(progressive[i].strikeLevel,level);assert.equal(progressive[i].chargeAt,time,'previous winning reels recharge');}
 }
 strokes=0;rects=0;fx.draw(ctx,progressive,renderer,time+70,-224,false);
 assert.equal(rects,level,'no effects at unrevealed reels');assert(strokes>previousStrokes,'each tier has more elaborate visible effects');previousStrokes=strokes;
}
assert.equal(progressive[0].strikeAt,100,'recharging preserves original stop time');
assert.equal(fx.tier(4).duration,fx.duration,'bounded maximum storm lifetime');
strokes=0;rects=0;fx.draw(ctx,progressive,renderer,lastTime+fx.duration+1,-224,false);assert.equal(strokes+rects,0);
console.log('PASS: gesture-gated reusable audio, finite scheduled voices, stereo impacts, thunder tails, mute cleanup, projected lightning targets, expiry, reduced motion, front-facing symmetry and four reveal-driven visual/audio tiers.');

for(let mask=0;mask<16;mask++){
 const sequence=Array.from({length:4},()=>({}));let expected=0;
 for(let i=0;i<4;i++){
  const bolt=Boolean(mask&(1<<i));
  if(bolt){expected++;assert.equal(fx.land(sequence,sequence[i],100+i*350),expected);}
  assert.equal(sequence[i].strikeAt!==undefined,bolt,'every landed bolt counts anywhere');
 }
}
console.log('PASS: all 16 bolt/X sequences count every bolt regardless of gaps.');
