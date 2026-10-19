'use strict';
// Presentation only. Driven by Cashfire 2's existing clock, never by outcome RNG.
const BoltCollection = (() => {
  const clamp = n => Math.max(0,Math.min(1,n));
  function flight(age,from,to) {
    const u=clamp((age-70)/550),t=u*u*(3-2*u),bend=Math.min(70,Math.abs(to[1]-from[1])*.24);
    const control=[from[0]+(to[0]-from[0])*.22,from[1]-bend];
    return {x:(1-t)**2*from[0]+2*(1-t)*t*control[0]+t*t*to[0],
      y:(1-t)**2*from[1]+2*(1-t)*t*control[1]+t*t*to[1],
      alpha:age<0||age>=620?0:Math.min(1,age/60),scale:1-.4*t,
      pulse:age>=620&&age<820?Math.sin((age-620)/200*Math.PI):0};
  }
  class View {
    constructor({get,art}) {
      this.get=get;this.art=art;this.root=get('gameRegion');this.game=get('game');
      this.layer=get('collectionFx');this.ctx=this.layer.getContext('2d');this.meter=get('boltCollector');
      this.slots=[0,1,2,3].map(i=>get('collectedBolt'+i));this.count=get('collectedCount');
      this.events=[];this.seen=new Set();this.total=0;this.dirty=true;this.painted=false;
      this.observer=new ResizeObserver(()=>{this.dirty=true;});this.observer.observe(this.root);this.observer.observe(this.meter);this.observer.observe(this.game);
      this.reset();
    }
    reset() {
      this.events=[];this.seen.clear();this.total=0;
      this.meter.setAttribute('aria-label','0 loot boxes collected across all reels');
      this.meter.setAttribute('data-count','0');this.count.textContent='0';
      this.slots.forEach(slot=>{slot.classList.remove('filled');slot.style.transform='';});
      if(this.bounds)this.ctx.clearRect(0,0,this.bounds.width,this.bounds.height);
      this.painted=false;
    }
    land(index,total,time,reduced=false) {
      if(this.seen.has(index)||total<1||total>4)return;
      this.seen.add(index);this.total=total;this.dirty=true;
      this.meter.setAttribute('aria-label',total+' loot box'+(total===1?'':'es')+' collected across all reels');
      this.meter.setAttribute('data-count',String(total));this.count.textContent=String(total);
      this.slots.forEach((slot,i)=>slot.classList.toggle('filled',i<total));
      if(!reduced)this.events.push({index,rank:total-1,time});
    }
    measure() {
      const root=this.root.getBoundingClientRect(),game=this.game.getBoundingClientRect();
      const d=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2);
      this.bounds=root;this.origin={left:game.left-root.left,top:game.top-root.top,width:game.width,height:game.height};
      this.targets=this.slots.map(slot=>{const r=slot.getBoundingClientRect();return[r.left-root.left+r.width/2,r.top-root.top+r.height/2];});
      this.layer.width=Math.round(root.width*d);this.layer.height=Math.round(root.height*d);this.ctx.setTransform(d,0,0,d,0,0);
      this.dirty=false;this.painted=false;
    }
    draw(time,reduced,sourcePoint) {
      if(reduced){this.events=[];this.slots.forEach(slot=>{slot.style.transform='';});}
      if(!this.events.length&&!this.painted)return;
      if(this.dirty)this.measure();
      const ctx=this.ctx,b=this.origin,scale=Math.min(b.width/960,b.height/410);
      ctx.clearRect(0,0,this.bounds.width,this.bounds.height);this.painted=false;
      const pulse=[0,0,0,0];
      for(const event of this.events){
        const age=time-event.time,p=sourcePoint(event.index),from=[b.left+b.width/2+p[0]*scale,b.top+b.height*.47+p[1]*scale],to=this.targets[event.rank];
        const f=flight(age,from,to);pulse[event.rank]=Math.max(pulse[event.rank],f.pulse);
        if(f.alpha>0){
          ctx.save();ctx.globalAlpha=f.alpha;
          // Short moving trail follows a confirmed bolt to the common collection bank.
          ctx.strokeStyle='#ffc170';ctx.lineWidth=2;ctx.lineCap='round';ctx.shadowColor='#ef9a34';ctx.shadowBlur=9;
          ctx.beginPath();for(let j=5;j>=0;j--){const q=flight(Math.max(0,age-j*12),from,to);j===5?ctx.moveTo(q.x,q.y):ctx.lineTo(q.x,q.y);}ctx.stroke();
          const size=32*f.scale,image=this.art();if(image&&image.complete!==false)ctx.drawImage(image,f.x-size/2,f.y-size/2,size,size);
          ctx.restore();this.painted=true;
        }
      }
      this.slots.forEach((slot,i)=>{slot.style.transform=reduced||!pulse[i]?'':'scale('+(1+pulse[i]*.24)+')';});
      this.events=this.events.filter(event=>time-event.time<820);
    }
  }
  return Object.freeze({flight,View});
})();
