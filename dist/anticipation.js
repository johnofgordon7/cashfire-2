'use strict';
// Only confirmed stops choose anticipation. The next symbol is never inspected.
const ReelAnticipation=(()=>{
  function level(collected,stoppedIndex){
    if(stoppedIndex>=3||collected<2)return 0;
    return collected===3&&stoppedIndex===2?2:1;
  }
  function begin(reels,nextIndex,collected,elapsed,time,reduced=false){
    const tier=level(collected,nextIndex-1);if(!tier)return 0;
    const reel=reels[nextIndex];reel.anticipation={level:tier,start:time};
    // Reduced motion retains a steady spotlight and the ordinary stop interval.
    if(!reduced)ReelMotion.anticipate(reel.motion,elapsed,tier);
    return tier;
  }
  function active(reel){return !!reel.anticipation&&!reel.stopped;}
  function draw(ctx,reels,renderer,time,reduced=false){
    const reel=reels.find(active);if(!reel)return;
    const tier=reel.anticipation.level,age=(time-reel.anticipation.start)/1000;
    const fade=reduced?1:Math.min(1,age/.35),mega=tier===2;
    const point=renderer.ready?renderer.strikePoint(reel,reels,time,reduced):[reel.x,0],x=point[0],y=point[1];
    const color=mega?'#ffe3a0':'#ffd3a0';
    ctx.save();
    // Darken neighbouring reels without covering the highlighted drum.
    ctx.globalAlpha=fade*(mega?.5:.32);ctx.fillStyle='#010816';ctx.beginPath();ctx.rect(-470,-205,940,390);ctx.ellipse(x,y,105,155,0,0,Math.PI*2);ctx.fill('evenodd');
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;
    const cone=ctx.createLinearGradient(x,-245,x,y+145);
    cone.addColorStop(0,mega?'#ffe6a044':'#ffd3a033');cone.addColorStop(.75,mega?'#ffe6a01f':'#ffd3a017');cone.addColorStop(1,'#ffffff00');
    ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(x-22,-245);ctx.lineTo(x+22,-245);ctx.lineTo(x+116,y+144);ctx.lineTo(x-116,y+144);ctx.closePath();ctx.fill();
    const glow=ctx.createRadialGradient(x,y,45,x,y,190);glow.addColorStop(0,mega?'#ffd26724':'#ffc17018');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(x-190,y-190,380,380);
    ctx.strokeStyle=color;ctx.lineWidth=mega?3:1.5;ctx.shadowColor=color;ctx.shadowBlur=reduced?0:mega?18:10;
    const radius=mega?112:104;ctx.beginPath();ctx.ellipse(x,y,radius,151,0,0,Math.PI*2);ctx.stroke();
    if(mega){ctx.globalAlpha=fade*.45;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,radius+9,161,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  return Object.freeze({level,begin,active,draw});
})();
