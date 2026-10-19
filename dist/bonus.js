'use strict';
// Live Wire's accepted prize is the only payout authority. Film kills are presentation only.
const LiveWireBonus = (() => {
  const profiles=Object.freeze({
    3:Object.freeze({name:'SHOOTING SPREE',min:10,max:100,mean:20,prizes:Object.freeze([10,15,20,30,50,100]),weights:Object.freeze([60,10,10,10,5,5])}),
    4:Object.freeze({name:'MEGA SHOOTING SPREE',min:30,max:1000,mean:140,prizes:Object.freeze([30,50,100,250,500,1000]),weights:Object.freeze([50,20,10,10,4,6])})
  });
  const films=Object.freeze([
    Object.freeze({id:'SPRINT-002',name:'DEPOT RUN',video:'./assets/call-of-booty-sprint.mp4',poster:'./assets/exfil-opening.webp',duration:30,clipDuration:30.041667,kills:Object.freeze([9.75,19.5])}),
    Object.freeze({id:'AMBUSH-001',name:'SERVICE LANE',video:'./assets/call-of-booty-ambush-early.mp4',poster:'./assets/call-of-booty-ambush-early.webp',duration:9.9,clipDuration:12.064,kills:Object.freeze([5])}),
    Object.freeze({id:'AMBUSH-003',name:'LOADING BAY',video:'./assets/call-of-booty-ambush-late.mp4',poster:'./assets/call-of-booty-ambush-late.webp',duration:21.8,clipDuration:30.08,kills:Object.freeze([6,11.5,17.8])}),
    Object.freeze({id:'EXTRACT-005',name:'WAREHOUSE CLEAR',video:'./assets/call-of-booty-extraction-five.mp4',poster:'./assets/call-of-booty-extraction-five.webp',duration:30,clipDuration:30.08,kills:Object.freeze([6.5,12.3,18.3,24.1])}),
    Object.freeze({id:'EXTRACT-1000',name:'FULL ASSAULT',video:'./assets/call-of-booty-extraction-max.mp4',poster:'./assets/call-of-booty-extraction-max.webp',duration:30,clipDuration:30,kills:Object.freeze([3.95,5.15,8.45,9.55,14,16.05,18.7,19.45,23.45,24.65])})
  ]);
  const $=id=>document.getElementById(id),orders={3:[0,3,1,2,4],4:[4,2,3,0,1]},visits={3:0,4:0};
  const format=cents=>'£'+(cents/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  let state=null,bound=false,mediaModule=null;
  function profile(count){return profiles[count];}
  function pick(count,ticket){
    const p=profile(count);if(!p)throw Error('Invalid bonus');
    if(ticket===undefined){const a=new Uint32Array(1),limit=Math.floor(4294967296/100)*100;do{crypto.getRandomValues(a);}while(a[0]>=limit);ticket=a[0]%100;}
    if(!Number.isInteger(ticket)||ticket<0||ticket>=100)throw Error('Invalid prize ticket');
    let edge=0;for(let i=0;i<p.prizes.length;i++){edge+=p.weights[i];if(ticket<edge)return p.prizes[i];}
  }
  function text(id,value){const node=$(id);if(node)node.textContent=value;}
  function hide(id,value){const node=$(id);if(node)node.hidden=value;}
  function syncSound(){
    const video=$('bonusFilm'),enabled=$('sound')?.getAttribute('aria-pressed')==='true';
    if(video){video.muted=!enabled;video.volume=enabled?0.55:0;}
    text('bonusSound',enabled?'SOUND ON':'SOUND OFF');$('bonusSound')?.setAttribute('aria-pressed',String(enabled));
  }
  function release(current,clear=false){
    current.controller?.abort();current.controller=null;clearTimeout(current.timeout);current.timeout=null;
    const video=$('bonusFilm');video?.pause();current.source='';
    if(clear&&video){video.removeAttribute('src');video.load?.();}
    if(current.objectUrl){URL.revokeObjectURL(current.objectUrl);current.objectUrl=null;}
  }
  function controls(){
    if(!state)return;const phase=state.phase;$('bonusGame').dataset.phase=phase;
    hide('bonusLoading',phase!=='loading');hide('bonusFailure',phase!=='error');hide('bonusHold',phase!=='paused');
    hide('bonusEnd',phase!=='reveal');hide('bonusCollect',phase!=='reveal');hide('bonusSkip',phase==='reveal');hide('bonusPause',!['playing','paused'].includes(phase));
    text('bonusPause',phase==='paused'?'RESUME':'PAUSE');$('bonusPause')?.setAttribute('aria-label',phase==='paused'?'Resume shooting footage':'Pause shooting footage');
    text('bonusPhase',phase==='playing'?'SHOOTING SPREE':phase==='paused'?'HOLDING POSITION':phase==='loading'?'DEPLOYING':phase==='error'?'FOOTAGE UNAVAILABLE':'BONUS SECURED');
    text('bonusMessage',phase==='reveal'?'Your bonus is ready. Return to the reels to collect.':phase==='error'?'Your accepted bonus is safe. Retry this footage or continue to your award.':phase==='paused'?'The footage is paused. Your bonus award stays fixed.':'The reel result locks your award. Footage kills do not change it.');
  }
  function clock(allowReveal=true){
    const current=state;if(!current)return;
    const t=Math.min(current.film.duration,Math.max(0,Number($('bonusFilm')?.currentTime)||0));
    current.time=t;current.kills=current.film.kills.filter(at=>t>=at).length;
    text('bonusKills',String(current.kills).padStart(2,'0'));text('bonusKillTotal',String(current.film.kills.length).padStart(2,'0'));
    text('bonusClock','00:'+String(Math.max(0,Math.ceil(current.film.duration-t))).padStart(2,'0'));
    const progress=$('bonusTimeline');if(progress){progress.value=t;progress.max=current.film.duration;progress.setAttribute('aria-valuetext',Math.round(t)+' seconds of '+current.film.duration+' seconds of footage');}
    if(allowReveal&&current.phase==='playing'&&t>=current.film.duration)reveal('complete');
  }
  function reveal(reason='skip'){
    const current=state;if(!current||current.phase==='reveal')return;
    clock(false);current.phase='reveal';current.revealReason=reason;current.generation++;
    current.controller?.abort();current.controller=null;clearTimeout(current.timeout);current.timeout=null;$('bonusFilm')?.pause();
    text('bonusEndTitle',current.preview?'PREVIEW COMPLETE':'BONUS SECURED');text('bonusFinalPrize',current.multiplier.toLocaleString('en-GB')+'×');text('bonusFinalAmount',format(current.stake*current.multiplier));
    text('bonusEndNote',reason==='complete'?'Combat sequence complete. Your reel award is unchanged.':reason==='unavailable'?'The film was unavailable. Your full accepted award is unchanged.':'Footage skipped. Your full accepted award is unchanged.');
    controls();$('bonusCollect')?.focus();
  }
  function failure(current,message){
    if(state!==current||['reveal','error'].includes(current.phase))return;
    current.generation++;release(current,true);current.phase='error';
    text('bonusFailureMessage',message||'The combat footage could not load. Your bonus award is safe.');controls();$('bonusRetry')?.focus();
  }
  function pause(reason='manual'){
    if(!state||state.phase!=='playing')return;
    $('bonusFilm')?.pause();state.phase='paused';state.pauseReason=reason;
    text('bonusHoldMessage',reason==='visibility'?'Playback paused while you were away.':'Timer held. The same bonus is waiting.');controls();
  }
  async function resume(){
    const current=state;if(!current||current.phase!=='paused'||current.resuming||document.hidden)return;
    current.resuming=true;current.pauseReason=null;syncSound();
    try{
      await $('bonusFilm').play();
      if(state!==current||['reveal','error'].includes(current.phase))return;
      if(document.hidden){$('bonusFilm').pause();current.pauseReason='visibility';return;}
      current.phase='playing';controls();
    }catch(error){
      if(state!==current)return;
      if(error.name==='NotAllowedError'){current.phase='paused';text('bonusHoldMessage','Tap Resume to start your selected footage.');controls();}
      else failure(current,'Playback was interrupted. Retry the same film or continue to your accepted award.');
    }finally{current.resuming=false;}
  }
  async function load(current){
    release(current,true);current.generation++;const generation=current.generation;
    current.controller=new AbortController();current.phase='loading';current.objectUrl=null;current.source='';
    const video=$('bonusFilm');video.poster=current.film.poster;syncSound();text('bonusLoadPercent','0%');text('bonusLoadDetail','Loading the original combat footage. Timer held.');
    const progress=$('bonusLoadProgress');if(progress)progress.value=0;controls();
    const alive=()=>state===current&&current.generation===generation&&current.phase!=='reveal';
    if(current.fixture?.mediaFailure){failure(current,'Review fixture: footage unavailable. Your accepted bonus is safe.');return;}
    current.timeout=setTimeout(()=>{if(alive())failure(current,'The footage is taking too long to load. Retry or continue to your full bonus award.');},60000);
    try{
      const media=await(mediaModule||(mediaModule=import('./combat-media.js?v=cashfire-2-native-1')));if(!alive())return;
      const transport=media.getVideoTransport(current.film.video);
      if(transport.type==='chunks'){
        const loaded=await media.loadChunkedVideo(current.film.video,{signal:current.controller.signal,onProgress(info){
          if(!alive())return;const percent=Math.min(100,Math.floor(info.loadedBytes/info.totalBytes*100));text('bonusLoadPercent',percent+'%');if(progress)progress.value=percent;
          text('bonusLoadDetail',info.phase==='verifying'?'Checking the complete native footage. Timer held.':'Loading the original combat footage. Timer held.');
        }});
        if(!alive()){URL.revokeObjectURL(loaded.url);return;}current.objectUrl=loaded.url;current.source=loaded.url;
      }else current.source=new URL(transport.url,location.href).href;
      if(!alive())return;text('bonusLoadPercent','100%');if(progress)progress.value=100;
      current.phase='paused';video.src=current.source;video.load();video.currentTime=0;
      text('bonusHoldMessage',document.hidden||current.pauseReason==='visibility'?'Playback paused while you were away.':'Your combat footage is ready.');controls();
      if(!document.hidden&&current.pauseReason!=='visibility'&&!current.fixture?.paused)await resume();
    }catch(error){if(alive()&&error.name!=='AbortError')failure(current,'The combat footage could not load or pass its integrity check. Your accepted bonus is safe.');}
  }
  function open({count,stake,multiplier,onCollect,preview=false,fixture=null}){
    if(state)throw Error('Bonus already active');const p=profile(count);
    if(!p||!p.prizes.includes(multiplier)||!Number.isSafeInteger(stake)||stake<=0||!Number.isSafeInteger(stake*multiplier)||typeof onCollect!=='function')throw Error('Invalid accepted bonus');
    if(fixture&&!preview)throw Error('Bonus fixtures require preview mode');
    if(fixture?.clipIndex!==undefined&&(!Number.isInteger(fixture.clipIndex)||fixture.clipIndex<0||fixture.clipIndex>=films.length))throw Error('Invalid fixture film');
    bind();const film=films[fixture?.clipIndex??orders[count][visits[count]++%films.length]];
    state={p,count,stake,multiplier,onCollect,preview,fixture,film,phase:'loading',generation:0,objectUrl:null,controller:null,kills:0,time:0,resuming:false};
    const dialog=$('bonusGame');dialog.dataset.mega=String(count===4);dialog.dataset.preview=String(preview);dialog.dataset.film=film.id;
    text('bonusTitle',p.name);text('bonusRange','Up to '+p.max.toLocaleString('en-GB')+'×');text('bonusStake',(preview?'PREVIEW · ':'')+'BET '+format(stake));
    text('bonusPrize',multiplier.toLocaleString('en-GB')+'×');text('bonusAmount',format(stake*multiplier));text('bonusMission',film.name);text('bonusKills','00');text('bonusKillTotal',String(film.kills.length).padStart(2,'0'));text('bonusClock','00:'+String(Math.ceil(film.duration)).padStart(2,'0'));
    $('bonusFilm').poster=film.poster;const timeline=$('bonusTimeline');if(timeline){timeline.value=0;timeline.max=film.duration;}dialog.hidden=false;dialog.setAttribute('aria-hidden','false');dialog.showModal();dialog.focus();controls();void load(state);
  }
  function collect(){
    const completed=state;if(!completed||completed.phase!=='reveal'||completed.collected)return;
    completed.collected=true;state=null;release(completed,true);const dialog=$('bonusGame');dialog.close();dialog.hidden=true;dialog.setAttribute('aria-hidden','true');
    try{completed.onCollect(completed.multiplier);}finally{$('spin')?.focus();}
  }
  function draw(time,reduced=false){if(!state)return;$('bonusGame').dataset.reduced=String(reduced);syncSound();if(state.phase==='playing')clock();}
  function bind(){
    if(bound)return;const dialog=$('bonusGame'),video=$('bonusFilm');if(!dialog||!video)return;bound=true;
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(state&&state.phase!=='reveal')reveal('skip');});
    $('bonusSkip')?.addEventListener('click',()=>reveal('skip'));$('bonusCollect')?.addEventListener('click',collect);
    $('bonusPause')?.addEventListener('click',()=>state?.phase==='paused'?void resume():pause());$('bonusResume')?.addEventListener('click',()=>void resume());
    $('bonusRetry')?.addEventListener('click',()=>{if(state?.phase==='error')void load(state);});$('bonusContinue')?.addEventListener('click',()=>reveal('unavailable'));
    $('bonusSound')?.addEventListener('click',()=>{$('sound')?.click();syncSound();});
    video.addEventListener('timeupdate',()=>{if(state?.phase==='playing')clock();});
    video.addEventListener('loadedmetadata',()=>{
      const current=state;if(!current||!current.source||video.currentSrc!==current.source)return;
      clearTimeout(current.timeout);current.timeout=null;
      if(!Number.isFinite(video.duration)||video.duration<current.film.duration||Math.abs(video.duration-current.film.clipDuration)>.65)failure(current,'This footage is incomplete. Retry or continue to your full bonus award.');
    });
    video.addEventListener('ended',()=>{
      const current=state;if(!current||current.phase==='reveal'||video.currentSrc!==current.source)return;
      if(video.currentTime+0.025>=current.film.duration)reveal('complete');else failure(current,'The footage ended early. Retry or continue to your full bonus award.');
    });
    video.addEventListener('error',()=>{if(state&&state.source&&video.currentSrc===state.source&&video.error)failure(state,'The combat footage is unavailable. Retry or continue to your full bonus award.');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state?.phase==='playing')pause('visibility');else if(state)state.pauseReason='visibility';}});
    document.addEventListener('cashfire:sound',syncSound);
    if(typeof MutationObserver!=='undefined'&&$('sound'))new MutationObserver(syncSound).observe($('sound'),{attributes:true,attributeFilter:['aria-pressed']});
  }
  return Object.freeze({profile,pick,open,draw,bind,get active(){return !!state;}});
})();
globalThis.LiveWireBonus=LiveWireBonus;
