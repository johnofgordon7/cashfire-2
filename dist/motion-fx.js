'use strict';
// Animation Studio 1.0.0 direction, implemented on Live Wire's existing frame clock.
// Pure presentation samples: no outcome RNG, wallet access, timers or RAF ownership.
const ReelPresentation=(()=>{
  const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>1-Math.pow(1-clamp(n),3);
  function seat(reel,time,reduced=false){
    if(reduced||reel.impactAt===undefined)return 0;
    const age=(time-reel.impactAt)/1000;
    if(age<=0||age>=.34)return 0;
    // The bearing absorbs the impact, makes one small recovery, then rests exactly.
    return -5.4*Math.sin(age*23)*Math.exp(-age*11)*Math.pow(1-age/.34,2);
  }
  function reveal(amount,age,duration,reduced=false){
    if(reduced||duration<=0)return amount;
    return Math.round(amount*ease(age/duration));
  }
  function live(reels,round,time,reduced=false){
    if(reduced)return false;
    return !!round&&time-round.start<460||reels.some(r=>r.impactAt!==undefined&&time-r.impactAt<540);
  }
  function stroke(ctx,from,to,width,color,alpha){
    ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(...from);ctx.lineTo(...to);ctx.stroke();
  }
  function draw(ctx,reels,round,renderer,time,reduced=false,compact=false){
    if(reduced)return;
    ctx.save();ctx.globalCompositeOperation='lighter';
    if(round){
      const age=time-round.start,u=clamp(age/460);
      if(age>=0&&u<1){
        // One launch sweep across the existing conductor; no camera or control motion.
        const head=-422+844*ease(u),alpha=Math.sin(Math.PI*u)*.6;
        stroke(ctx,[-422,178],[head,178],compact?2:4,'#1989ee',alpha*.4);
        stroke(ctx,[Math.max(-422,head-78),178],[head,178],1.6,'#8bedff',alpha);
      }
    }
    for(const r of reels){
      const age=r.impactAt===undefined?Infinity:time-r.impactAt;
      if(age<0||age>540)continue;
      const p=renderer.ready?renderer.strikePoint(r,reels,time,reduced):[r.x,0],u=clamp(age/540),a=Math.pow(1-u,2);
      const bolt=r.strikeAt!==undefined,color=bolt?'#8eeaff':'#d2e4e9';
      // Paired accents sit outside the readable symbol, rooted at the bearing contact.
      for(const sign of [-1,1]){
        const x=p[0]+sign*(84+ease(u)*10),length=12+ease(u)*30;
        stroke(ctx,[x,p[1]-length],[x,p[1]+length],1.2,color,a*(bolt?.55:.28));
        if(!compact)stroke(ctx,[x,p[1]-length],[x,p[1]+length],6,'#178edf',a*.08);
      }
    }
    ctx.restore();
  }
  return Object.freeze({seat,reveal,live,draw});
})();
