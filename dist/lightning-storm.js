'use strict';

// Visual noise is deterministic and independent of the game's outcome RNG.
const ReelLightning = (() => {
  const tiers = [
    {duration:1650, beam:.68, strands:2, branches:5, sparks:36, rings:1},
    {duration:2600, beam:1.2, strands:3, branches:8, sparks:64, rings:2},
    {duration:3400, beam:1.8, strands:4, branches:10, sparks:88, rings:3},
    {duration:4200, beam:2.4, strands:5, branches:12, sparks:112, rings:4}
  ].map(Object.freeze);
  const tier = level => tiers[Math.max(0,Math.min(3,(level||1)-1))];
  const random = (seed,k) => {const n=Math.sin(seed*91.713+k*17.831)*43758.5453;return n-Math.floor(n);};
  const start = reel => reel.chargeAt ?? reel.strikeAt;
  function active(reel,time) {const at=start(reel);return at!==undefined&&time>=at&&time-at<tier(reel.strikeLevel).duration;}
  function land(reels,reel,time) {
    const index=reels.indexOf(reel);
    if(index<0||reel.strikeAt!==undefined)return 0;
    reel.strikeAt=time;
    // Count only bolts already revealed, never unrevealed results on spinning reels.
    const landed=reels.filter(r=>r.strikeAt!==undefined&&r.strikeAt<=time),level=landed.length;
    for(const r of landed){r.chargeAt=time;r.strikeLevel=level;(r.chargeHistory??=[]).push(time);}
    reel.strikeOrder=level;
    return level;
  }
  function strength(reel,time,reduced=false) {
    if(!active(reel,time))return 0;
    const age=(time-start(reel))/1000,ownAge=(time-(reel.strikeAt??start(reel)))/1000,level=reel.strikeLevel||1,life=tier(level).duration/1000;
    const tail=Math.max(0,1-age/life);
    if(reduced)return (.15+level*.025)*Math.min(1,ownAge/.2)*tail;
    // Recharge adds a smooth new envelope over the old tail, never resets it to black.
    const pulses=reel.chargeHistory||[start(reel)];
    const energy=pulses.reduce((sum,at,i)=>{
      const t=(time-at)/1000;if(t<0)return sum;
      return sum+(.72+i*.06)*Math.min(1,t/.06)*Math.exp(-t*2.8);
    },0);
    return Math.min(1.05,energy+.12*Math.min(1,ownAge/.12))*tail;
  }
  const geometry=new Map();
  function path(from,to,seed,time,amplitude=30,segments=16,lift=0) {
    const dx=to[0]-from[0],dy=to[1]-from[1],distance=Math.hypot(dx,dy)||1;
    // Stable topology, cached once per cosmetic seed. Reprojection follows resized reels.
    const key=seed+':'+segments;
    if(!geometry.has(key)){
      if(geometry.size>=512)geometry.delete(geometry.keys().next().value);
      geometry.set(key,Array.from({length:segments+1},(_,k)=>(random(seed,k)-.5)));
    }
    const offsets=geometry.get(key);
    return Array.from({length:segments+1},(_,k)=>{
      const t=k/segments,envelope=Math.sin(t*Math.PI);
      const offset=envelope*offsets[k]*amplitude;
      return [from[0]+dx*t-dy/distance*offset,from[1]+dy*t+dx/distance*offset-envelope*lift];
    });
  }
  function stroke(ctx,points,width,color,alpha=1) {
    ctx.globalAlpha=Math.max(0,Math.min(1,alpha));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();points.forEach((p,k)=>k?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();
  }
  function arc(ctx,points,width,alpha) {
    stroke(ctx,points,width*7,'#125dff',alpha*.075);
    stroke(ctx,points,width*3,'#159dff',alpha*.19);
    stroke(ctx,points,width,'#59d8ff',alpha*.8);
    stroke(ctx,points,Math.max(.65,width*.28),'#ecfcff',alpha);
  }
  // Supply-cache landing heat, sparks and scanner rings. No lightning artwork.
  // The historical API name is retained to preserve the original reel integration.
  function draw(ctx,reels,renderer,time,ceiling,reduced=false,compact=false) {
    const live=reels.filter(r=>active(r,time));if(!live.length)return;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const reel of live){
      const level=reel.strikeLevel||1,age=(time-(reel.strikeAt??start(reel)))/1000;
      const p=renderer.ready?renderer.strikePoint(reel,reels,time,reduced):[reel.x,0];
      const [x,y]=p,energy=strength(reel,time,reduced),radius=85+level*12;
      const glow=ctx.createRadialGradient(x,y,8,x,y,radius);
      glow.addColorStop(0,'rgba(255,191,91,'+energy*.3+')');
      glow.addColorStop(.5,'rgba(225,103,26,'+energy*.12+')');glow.addColorStop(1,'rgba(170,60,0,0)');
      ctx.fillStyle=glow;ctx.globalAlpha=1;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
      if(reduced)continue;
      const fade=Math.max(0,1-age/1.25);ctx.strokeStyle='#ffbf69';ctx.lineWidth=1.5;
      ctx.globalAlpha=fade*.6;ctx.beginPath();ctx.ellipse(x,y,50+age*55,42+age*40,0,0,Math.PI*2);ctx.stroke();
      const count=compact?12:22;
      for(let k=0;k<count;k++){
        const seed=reels.indexOf(reel)*97+level*31,a=random(seed,k)*Math.PI*2;
        const life=.5+random(seed,k+22)*.7,alpha=Math.max(0,1-age/life);if(!alpha)continue;
        const speed=45+random(seed,k+44)*90,dx=Math.cos(a)*speed,dy=Math.sin(a)*speed*.7-40;
        const px=x+dx*age,py=y+dy*age+age*age*75;
        ctx.globalAlpha=alpha*.8;ctx.strokeStyle=k%4?'#f5a341':'#ffe5a1';
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-dx*.025,py-dy*.025);ctx.stroke();
      }
    }
    ctx.restore();
  }
  return Object.freeze({duration:4200,tier,active,land,strength,draw});
})();
