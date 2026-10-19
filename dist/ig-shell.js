'use strict';
// Position the shared stake overlay without changing the game's stake or wallet model.
(() => {
  const panel=document.getElementById('betPanel'), trigger=document.getElementById('betToggle');
  function positionStake(){
    if(!panel.open)return;
    const rect=trigger.getBoundingClientRect(), height=Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);
    const available=Math.max(100,rect.top-18), panelHeight=Math.min(256,available);
    panel.style.setProperty('--stake-height',panelHeight+'px');
    panel.style.setProperty('--stake-top',Math.max(8,Math.min(rect.top-panelHeight-10,height-panelHeight-8))+'px');
    panel.style.setProperty('--stake-left',Math.max(10,Math.min(rect.left,window.innerWidth-300))+'px');
  }
  trigger.addEventListener('click',positionStake);
  window.addEventListener('resize',positionStake);
  window.visualViewport?.addEventListener('resize',positionStake);
  panel.addEventListener('close',()=>trigger.focus({preventScroll:true}));
  panel.addEventListener('click',event=>{
    const r=panel.getBoundingClientRect();
    if(event.target===panel&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))panel.close();
  });
})();
