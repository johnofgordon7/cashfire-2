'use strict';
(() => {
  // This adapter owns display-only constants. It never loads the playable result API or wallet.
  const fixtures = Object.freeze({
    zero:Object.freeze({title:'No loot boxes',symbols:[0,0,0,0],multiplier:0,message:'No return. A £1.00 preview stake returns £0.00; net −£1.00.'}),
    one:Object.freeze({title:'One loot box',symbols:[0,1,0,0],multiplier:0.2,message:'Partial return. £0.20 returned; the £0.80 difference is a net loss.'}),
    two:Object.freeze({title:'Two loot boxes',symbols:[1,0,0,1],multiplier:1,message:'Boxes count anywhere, including across Xs. £1.00 returned: break even.'}),
    normal:Object.freeze({title:'Shooting Spree',symbols:[1,0,1,1],multiplier:5,count:3,message:'Three boxes start Shooting Spree. Film kills advance example return progress; the final result follows extraction.'}),
    mega:Object.freeze({title:'Mega Shooting Spree',symbols:[1,1,1,1],multiplier:1000,count:4,message:'Four boxes start Mega Shooting Spree. Film kills advance example return progress; the final result follows extraction.'}),
    result:Object.freeze({title:'Bonus secured',symbols:[1,0,1,1],multiplier:5,message:'£5.00 total return, including returned stake. Net +£4.00. Display-only result; no wallet is connected.'}),
    'media-error':Object.freeze({title:'Film unavailable',symbols:[1,0,1,1],multiplier:5,count:3,mediaFailure:true,message:'Retry the operation or continue to the result.'}),
    paused:Object.freeze({title:'Operation paused',symbols:[1,0,1,1],multiplier:5,count:3,paused:true,message:'Resume the operation, then see the final result.'})
  });
  const params = new URLSearchParams(location.hash.slice(1));
  const fixtureId = Object.hasOwn(fixtures,params.get('fixture')) ? params.get('fixture') : 'zero';
  const fixture = fixtures[fixtureId], $ = id => document.getElementById(id);
  const money = cents => '£'+(cents/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  let api = null, requestedPause = !!fixture.paused, completed = false, lastPhase = '', raf = null;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  function notify(phase,message) {
    if (parent !== window) parent.postMessage({type:'cashfire-review-status',fixture:fixtureId,phase,message,returnMultiplier:fixture.multiplier},location.origin);
  }
  function paintBase(result=false) {
    $('reviewTitle').textContent = result ? 'Bonus secured' : fixture.title;
    $('reviewKicker').textContent = result ? 'PREVIEW AWARD RETURNED ONCE' : fixture.count ? 'BONUS PRESENTATION PREVIEW' : 'SEPARATE DEMO PREVIEW';
    const reels = $('previewReels'); reels.replaceChildren();
    fixture.symbols.forEach((symbol,index) => {
      const reel = document.createElement('span'); reel.className = 'preview-reel';
      const image = document.createElement('img');
      image.src = symbol ? 'assets/art/cashfire-2/loot-box.webp?v=l2' : 'assets/art/1.0.0/cross.webp';
      image.alt = ''; image.width = 120; image.height = 120;
      reel.append(image); reels.append(reel);
    });
    reels.setAttribute('aria-label',fixture.symbols.map((symbol,index) => 'Reel '+(index+1)+': '+(symbol ? 'loot box' : 'X')).join(', '));
    const returnCents = 100*fixture.multiplier, net = returnCents-100;
    $('returnLabel').textContent = fixture.count && !result ? 'Bonus operation' : 'Total return';
    $('returnAmount').textContent = fixture.count && !result ? '—' : money(returnCents);
    $('netAmount').textContent = fixture.count && !result ? 'Winnings revealed after the operation' : net>0 ? 'Net +'+money(net) : net<0 ? 'Net −'+money(-net) : 'Break even · net £0.00';
    $('fixtureResult').dataset.profit = String((!fixture.count||result)&&net>0);
    $('fixtureMessage').textContent = result ? money(returnCents)+' total return. '+(net>0 ? 'Net +'+money(net)+'. ' : '')+'Displayed once; no playable balance changed.' : fixture.message;
  }
  function reportPhase() {
    const dialog = $('bonusGame'); if (!dialog?.open) return;
    const phase = dialog.dataset.phase || 'loading';
    if (phase === 'playing' && requestedPause) { $('bonusPause')?.click(); return; }
    if (phase === lastPhase) return; lastPhase = phase;
    const message = phase==='paused' ? 'Preview paused. Resume continues the same accepted award.'
      : phase==='playing' ? 'Native footage playing. Confirmed kills advance example return progress; the final result follows extraction.'
      : phase==='error' ? 'Media-error preview. Retry retains this film; Continue reveals the same accepted award.'
      : phase==='reveal' ? 'Award revealed. Return to reels finishes this preview once.'
      : 'Loading the original footage. Preview timer held.';
    notify(phase,message);
  }
  function applyPause(value) {
    requestedPause=value;
    if (!api?.active) return;
    const phase=$('bonusGame')?.dataset.phase;
    if (value && phase==='playing') $('bonusPause')?.click();
    if (!value && phase==='paused') $('bonusResume')?.click();
  }
  function loadScript(path) {
    return new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src=path; script.onload=resolve;
      script.onerror=() => reject(Error('Shared bonus presentation could not load.')); document.head.append(script);
    });
  }
  async function openBonus() {
    notify('loading','Preparing the shared bonus presentation. No playable balance is connected.');
    const response=await fetch('bonus-markup.html',{cache:'no-cache'});
    if (!response.ok) throw Error('Shared bonus markup is unavailable.');
    $('bonusMarkup').innerHTML=await response.text();
    await loadScript('bonus.js?v=presentation-1.5.0'); api=globalThis.LiveWireBonus;
    if (!api?.open) throw Error('Shared bonus presentation is unavailable.');
    api.bind?.();
    const dialog=$('bonusGame');
    new MutationObserver(reportPhase).observe(dialog,{attributes:true,attributeFilter:['data-phase','open']});
    dialog.addEventListener('click',event => {
      const id=event.target.closest('button')?.id;
      if(id==='bonusPause') requestedPause=dialog.dataset.phase!=='paused';
      if(id==='bonusResume') requestedPause=false;
      queueMicrotask(reportPhase);
    },true);
    api.open({count:fixture.count,stake:100,multiplier:fixture.multiplier,preview:true,
      fixture:{mediaFailure:!!fixture.mediaFailure,paused:!!fixture.paused},
      onCollect(multiplier) {
        if(completed) return; completed=true;
        paintBase(true); notify('complete','Preview complete: '+money(100*multiplier)+' total return. The playable wallet is unchanged.');
      }});
    function frame(time) {if(!api?.active)return;api.draw?.(time,motionPreference.matches);raf=requestAnimationFrame(frame);}
    raf=requestAnimationFrame(frame);reportPhase();
  }
  $('sound').addEventListener('click',() => {
    const enabled=$('sound').getAttribute('aria-pressed')!=='true';$('sound').setAttribute('aria-pressed',String(enabled));
    document.dispatchEvent(new Event('cashfire:sound'));
  });
  $('spin').addEventListener('click',() => location.reload());
  window.addEventListener('message',event => {
    if(event.source!==parent || event.origin!==location.origin || !event.data || event.data.type!=='cashfire-review-command')return;
    const command=event.data.command;
    if(command==='pause')applyPause(true);
    if(command==='resume')applyPause(false);
    if(command==='replay'||command==='reset')location.reload();
  });
  window.addEventListener('pagehide',() => {if(raf!==null)cancelAnimationFrame(raf);});
  paintBase();
  if(fixture.count)openBonus().catch(error => {
    $('fixtureMessage').textContent=error.message+' Replay the preview to retry. The playable game is unaffected.';
    $('fixtureMessage').classList.add('review-load-error');notify('error',$('fixtureMessage').textContent);
  });
  else notify('ready',fixture.message+' Display-only fixture; no playable balance changed.');
})();
