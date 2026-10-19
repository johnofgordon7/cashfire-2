const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../dist/viewport.js'),'utf8');
function setup(withVisualViewport=true){
  const values={},events={},documentEvents={},options={},visualEvents={},root={dataset:{},style:{setProperty:(k,v)=>values[k]=v}};
  const window={innerHeight:844,innerWidth:390,screen:{height:844},scrollX:0,scrollY:0,matchMedia:()=>({matches:true}),scrollTo(x,y){this.scrollX=x;this.scrollY=y;},addEventListener:(n,f)=>events[n]=f};
  if(withVisualViewport)window.visualViewport={height:692,scale:1,addEventListener:(n,f)=>visualEvents[n]=f};
  vm.runInNewContext(source,{document:{documentElement:root,addEventListener(n,f,o){documentEvents[n]=f;options[n]=o;}},window});
  return {values,events,visualEvents,root,window,documentEvents,options};
}
const a=setup();assert.equal(a.values['--app-height'],'692px');assert.equal(a.root.dataset.layout,'compact');assert.equal(a.root.dataset.mobile,'true');assert.equal(a.values['--external-height'],'152px','visible viewport accounts for space already occupied by browser/viewer');
a.window.visualViewport.height=750;a.visualEvents.resize();assert.equal(a.root.dataset.layout,'portrait');
a.window.visualViewport.height=610.8;a.visualEvents.resize();assert.equal(a.values['--app-height'],'610px');assert.equal(a.root.dataset.layout,'short');
a.window.innerWidth=844;a.window.innerHeight=390;a.window.visualViewport.height=350;a.events.resize();assert.equal(a.root.dataset.layout,'landscape','short wide windows use the landscape layout');
a.window.visualViewport.scale=2;a.window.visualViewport.height=175;a.visualEvents.resize();assert.equal(a.values['--app-height'],'350px','pinch zoom does not reflow the game');
a.window.visualViewport.scale=1;a.window.innerHeight=600;a.window.visualViewport.height=480;a.visualEvents.resize();assert.equal(a.root.dataset.layout,'landscape','short wide windows use the landscape layout');
a.window.scrollY=96;a.events.scroll();assert.equal(a.window.scrollY,0,'stale page offsets are reset');
function touch(range,x,y,count=1,scroller=null){return {target:{closest:selector=>selector==='input[type="range"]'?(range?{}:null):selector==='[data-scroll-region]'?scroller:null},touches:Array.from({length:count},()=>({clientX:x,clientY:y})),cancelable:true,preventDefault(){this.prevented=true;}};}
a.documentEvents.touchstart(touch(false,100,100));let e=touch(false,100,200);a.documentEvents.touchmove(e);assert(e.prevented,'vertical game swipe is consumed');
e=touch(false,200,100);a.documentEvents.touchmove(e);assert(e.prevented,'horizontal game swipe is consumed');
a.documentEvents.touchstart(touch(true,100,100));e=touch(true,160,102);a.documentEvents.touchmove(e);assert(!e.prevented,'horizontal native slider adjustment is retained');
e=touch(true,102,180);a.documentEvents.touchmove(e);assert(e.prevented,'vertical swipe starting on slider is consumed');
a.documentEvents.touchend();e=touch(false,100,200);a.documentEvents.touchmove(e);assert(e.prevented,'range gesture does not leak to next gesture');
e=touch(false,100,200,2);a.documentEvents.touchmove(e);assert(!e.prevented,'pinch gesture retained');
e={cancelable:true,ctrlKey:false,preventDefault(){this.prevented=true;}};a.documentEvents.wheel(e);assert(e.prevented,'wheel cannot scroll the fixed surface');
// Scrolling is local to the bet list, including wheel and end-boundary gestures.
const list={scrollTop:0,scrollHeight:500,clientHeight:200};
a.documentEvents.touchstart(touch(false,100,200,1,list));e=touch(false,100,140,1,list);a.documentEvents.touchmove(e);assert(!e.prevented,'swipe up scrolls down the bet list');
list.scrollTop=300;e=touch(false,100,100,1,list);a.documentEvents.touchmove(e);assert(e.prevented,'bottom of list does not pull the page');
e=touch(false,100,120,1,list);a.documentEvents.touchmove(e);assert(!e.prevented,'reverse scroll from bottom works');
list.scrollTop=0;e=touch(false,100,160,1,list);a.documentEvents.touchmove(e);assert(e.prevented,'top of list does not pull the page');
list.scrollTop=100;e={target:{closest:()=>list},deltaY:30,cancelable:true,preventDefault(){this.prevented=true;}};a.documentEvents.wheel(e);assert(!e.prevented,'wheel scrolls inside the list');
list.scrollTop=300;a.documentEvents.wheel(e);assert(e.prevented,'wheel is contained at the list boundary');
assert.equal(a.window.scrollY,0);
assert.equal(a.options.touchmove.passive,false);assert.equal(a.options.touchmove.capture,true);assert.equal(a.options.wheel.passive,false);
const b=setup(false);assert.equal(b.values['--app-height'],'844px');b.window.innerHeight=568;b.events.resize();assert.equal(b.values['--app-height'],'568px');b.window.innerHeight=667;b.events.pageshow();assert.equal(b.values['--app-height'],'667px');
console.log('PASS: viewport space accounting, orientation, fixed page, independently scrollable bet list and boundaries, slider gestures, pinch zoom and fallback.');
// Small mobile viewports have the same fixed-page contract.
const m=setup();m.window.scrollY=70;m.events.scroll();assert.equal(m.window.scrollY,0);
m.documentEvents.touchstart(touch(false,100,200));const swipe=touch(false,100,100);m.documentEvents.touchmove(swipe);assert(swipe.prevented,'mobile swipe cannot scroll the game page');
const wheel={cancelable:true,deltaY:50,preventDefault(){this.prevented=true;}};m.documentEvents.wheel(wheel);assert(wheel.prevented,'mobile wheel cannot scroll the game page');
assert.equal(m.root.dataset.igCompact,'false');m.window.innerWidth=320;m.events.resize();assert.equal(m.root.dataset.igCompact,'true');
// Required design-system sizes exercise the real viewport policy (not rendered layout).
for(const [width,height,layout,compact] of [[320,568,'short',true],[375,812,'portrait',true],[390,844,'portrait',false],[430,932,'portrait',false],[568,320,'landscape',true],[844,390,'landscape',true],[1194,834,'portrait',false],[1440,900,'portrait',false]]){
  const v=setup(false);v.window.innerWidth=width;v.window.innerHeight=height;v.events.resize();
  assert.equal(v.values['--app-height'],height+'px');assert.equal(v.root.dataset.layout,layout);assert.equal(v.root.dataset.igCompact,String(compact));
}
console.log('PASS: viewport policy at six IG acceptance sizes, small landscape and desktop. Rendered layout requires browser QA.');
