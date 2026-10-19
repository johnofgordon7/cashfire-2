'use strict';
const ReelMotion=(()=>{
 const TAU=Math.PI*2,symbols=Object.freeze([0,1,0,0]);
 const defaults=Object.freeze({speed:48,firstStop:1.25,interval:.56,anticipation:.10,brake:.40,settle:.006});
 const limits={speed:[32,70],firstStop:[1,2],interval:[.45,.8],anticipation:[0,.18],brake:[.28,.6],settle:[0,.012]};
 let settings={...defaults};
 const wrap=a=>((a%TAU)+TAU)%TAU,smooth=u=>u*u*(3-2*u),integral=u=>u*u*u-.5*u*u*u*u;
 function validate(input){const result={};for(const [key,[min,max]] of Object.entries(limits)){const n=Number(input[key]);if(!Number.isFinite(n)||n<min||n>max)throw Error(key+' must be between '+min+' and '+max);result[key]=n;}return result;}
 function apply(input){settings=validate(input);return {...settings};}
 function plan(start,symbol,index,turbo,showcase,random=Math.random){
  const candidates=symbols.flatMap((s,i)=>s===symbol?[i]:[]);if(!candidates.length)throw Error('Unknown reel symbol');
  const stop=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))],factor=turbo?.65:1;
  const speed=settings.speed/factor,brake=Math.max(settings.brake*factor,3*TAU/speed+.001),settleTime=.09*factor;
  const p={start,stop,speed,brake,settleTime,settle:settings.settle,acceleration:.16*factor,delay:index*.018*factor,interval:settings.interval*factor,extension:settings.anticipation*factor,brakeAt:Infinity,target:start};
  if(index===0)schedule(p,Math.max(p.acceleration+.15,settings.firstStop*factor-brake-settleTime));
  return p;
 }
 function schedule(p,at){
  p.brakeAt=Math.max(at,p.delay+p.acceleration);
  const cruise=cruiseSample(p,p.brakeAt);
  p.brakeStart=cruise.angle;p.brakeSpeed=-cruise.velocity;
  const raw=wrap(p.brakeStart-p.stop*Math.PI/2-p.settle),min=p.brakeSpeed*p.brake/3;
  p.distance=raw+Math.ceil((min-raw)/TAU)*TAU;
  p.target=p.brakeStart-p.distance-p.settle;
  p.end=p.brakeAt+p.brake+p.settleTime;
 }
 function cruiseSample(p,elapsed){
  const a=p.anticipation;
  if(!a||elapsed<a.at)return {angle:p.start-p.speed*(p.acceleration/2+elapsed-p.delay-p.acceleration),velocity:-p.speed,phase:'cruise',done:false};
  const age=elapsed-a.at,u=Math.min(1,age/a.ramp),delta=a.from-a.speed;
  const distance=age<a.ramp?a.from*age-delta*a.ramp*integral(u):(a.from+a.speed)*a.ramp/2+a.speed*(age-a.ramp);
  return {angle:a.angle-distance,velocity:-(a.from-delta*smooth(u)),phase:'anticipation',done:false};
 }
 function anticipate(p,at,level=1){
  if(p.anticipation||at>=p.brakeAt)return false;
  const before=sample(p,at),mega=level===2;
  p.anticipation={at,angle:before.angle,from:-before.velocity,speed:p.speed*(mega?.14:.24),ramp:.45,level};
  p.brake=mega?1.2:.85;
  schedule(p,at+.45+(mega?1.45:.75));
  return true;
 }
 function sample(p,elapsed,reduced=false){
  const t=elapsed-p.delay;
  if(t<=0)return {angle:p.start,velocity:0,phase:'waiting',done:false};
  if(t<p.acceleration){const u=t/p.acceleration;return {angle:p.start-p.speed*p.acceleration*integral(u),velocity:-p.speed*smooth(u),phase:'pickup',done:false};}
  if(elapsed<p.brakeAt)return cruiseSample(p,elapsed);
  const age=elapsed-p.brakeAt;
  if(age<p.brake){const u=age/p.brake,v=p.brakeSpeed*p.brake,d=p.distance;
   return {angle:p.brakeStart-(v*(u*u*u-2*u*u+u)+d*(-2*u*u*u+3*u*u)),velocity:-(v*(3*u*u-4*u+1)+d*(-6*u*u+6*u))/p.brake,phase:'brake',done:false};}
  const u=Math.min(1,(age-p.brake)/p.settleTime);
  return {angle:p.target+p.settle*(1-smooth(u)),velocity:-p.settle*6*u*(1-u)/p.settleTime,phase:u>=1?'idle':'settling',done:u>=1};
 }
 return {plan,schedule,anticipate,sample,wrap,symbols,defaults,limits,validate,apply,get settings(){return {...settings};}};
})();
