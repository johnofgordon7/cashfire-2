import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../dist/outcomes.js',import.meta.url),'utf8');

/** Browser-contract fake: a cloned iframe has a new browsing context. Changing
 * only src would retain its contentWindow and fail the stale-source tests. */
function harness({hash='',mobile=false}={}){
  const elements=[],ids=new Map(),replacements=[],timers=new Map(),windowListeners=new Map(),documentListeners=new Map();
  let serial=0,timerSerial=0,focused=null;
  class Classes{
    constructor(){this.values=new Set();}
    add(...names){names.forEach(name=>this.values.add(name));}
    remove(...names){names.forEach(name=>this.values.delete(name));}
    toggle(name,force){const next=force??!this.values.has(name);if(next)this.values.add(name);else this.values.delete(name);return next;}
    contains(name){return this.values.has(name);}
  }
  class Element{
    constructor(tag='div',id=null){
      this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.attributes={};this.children=[];
      this.classList=new Classes();this.events=new Map();this.textContent='';this.hidden=false;this.disabled=false;this.src='';
      if(tag==='iframe'){
        const contextId=++serial;this.contentWindow={contextId,messages:[],postMessage(data,origin){this.messages.push({data:JSON.parse(JSON.stringify(data)),origin});}};
      }
      elements.push(this);if(id)ids.set(id,this);
    }
    append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
    setAttribute(key,value){this.attributes[key]=String(value);}
    getAttribute(key){return this.attributes[key]??null;}
    addEventListener(type,callback){const list=this.events.get(type)||[];list.push(callback);this.events.set(type,list);}
    click(){if(!this.disabled)for(const callback of this.events.get('click')||[])callback({target:this});}
    focus(){focused=this;}
    cloneNode(deep){assert.equal(deep,false,'review navigations must start with an empty iframe');const copy=new Element(this.tagName.toLowerCase());copy.id=this.id;copy.attributes={...this.attributes};return copy;}
    replaceWith(next){replacements.push({old:this,next});if(this.id)ids.set(this.id,next);}
  }
  const names=['reviewFrame','fixtureIndex','welcome','previewContainer','fixtureGroup','fixtureTitle','fixtureDescription','previewStatus','fixturePosition','previousFixture','nextFixture','replayFixture','pauseFixture','resetReview','returnIndex','startFlow'];
  for(const id of names)new Element(id==='reviewFrame'?'iframe':id.endsWith('Fixture')||['resetReview','returnIndex','startFlow'].includes(id)?'button':'div',id);
  ids.get('reviewFrame').setAttribute('sandbox','allow-scripts allow-same-origin');
  ids.get('reviewFrame').setAttribute('title','Cashfire 2 isolated outcome preview');
  for(const id of ['previousFixture','replayFixture','pauseFixture'])ids.get(id).disabled=true;
  ids.get('previewContainer').hidden=true;
  const layout=new Element();
  const document={
    getElementById:id=>ids.get(id)||null,
    createElement:tag=>new Element(tag),
    querySelectorAll:selector=>selector==='[data-fixture]'?elements.filter(el=>el.dataset.fixture):[],
    querySelector(selector){if(selector==='.review-layout')return layout;const match=selector.match(/^\[data-fixture="([^"]+)"\]$/);return match?elements.find(el=>el.dataset.fixture===match[1])||null:null;},
    addEventListener(type,callback){const list=documentListeners.get(type)||[];list.push(callback);documentListeners.set(type,list);}
  };
  const location={hash,origin:'https://cashfire.example'};
  const history={entries:[],replaceState(_state,_title,url){this.entries.push(url);location.hash=url;}};
  const window={addEventListener(type,callback){const list=windowListeners.get(type)||[];list.push(callback);windowListeners.set(type,list);}};
  vm.runInNewContext(source,{document,window,location,history,matchMedia:query=>({matches:query.includes('max-width')?mobile:!mobile}),
    setTimeout(callback,delay){const id=++timerSerial;timers.set(id,{callback,delay});return id;},clearTimeout(id){timers.delete(id);}},
    {filename:'dist/outcomes.js'});
  return {
    el:id=>ids.get(id),get frame(){return ids.get('reviewFrame');},layout,history,replacements,timers,
    get focused(){return focused;},
    choose(id){const button=elements.find(el=>el.dataset.fixture===id);assert.ok(button,'fixture exists: '+id);button.click();},
    click:id=>ids.get(id).click(),
    message(data,{source=ids.get('reviewFrame').contentWindow,origin=location.origin}={}){for(const callback of windowListeners.get('message')||[])callback({data,source,origin});},
    tick(){const pending=[...timers.values()];timers.clear();for(const {callback} of pending)callback();},
    key(key,tag='MAIN'){const event={key,target:{tagName:tag},preventDefault(){this.prevented=true;}};for(const callback of documentListeners.get('keydown')||[])callback(event);return event;},
    status(fixture,phase,message){return {type:'cashfire-review-status',fixture,phase,message};}
  };
}

test('moving media-error to paused and replay creates new iframe contexts, not fragment-only navigation',()=>{
  const h=harness();const initial=h.frame;
  h.choose('media-error');const failedFilm=h.frame;
  assert.notEqual(failedFilm,initial);assert.match(failedFilm.src,/review\.html#fixture=media-error&run=1$/);
  h.choose('paused');const heldFilm=h.frame;
  assert.notEqual(heldFilm,failedFilm);assert.notEqual(heldFilm.contentWindow,failedFilm.contentWindow);
  assert.match(heldFilm.src,/review\.html#fixture=paused&run=2$/);
  assert.equal(heldFilm.getAttribute('sandbox'),'allow-scripts allow-same-origin');
  assert.equal(heldFilm.getAttribute('title'),'Cashfire 2 isolated outcome preview');
  assert.equal(h.el('fixtureTitle').textContent,'Pause and resume');
  assert.equal(h.el('pauseFixture').textContent,'Resume');
  h.click('replayFixture');
  assert.notEqual(h.frame.contentWindow,heldFilm.contentWindow,'replay must destroy the old native-film context');
  assert.match(h.frame.src,/fixture=paused&run=3$/);
  assert.equal(h.replacements.length,3);
});

test('same-fixture stale windows, foreign origins and malformed messages cannot update status or cancel timeout',()=>{
  const h=harness({hash:'#normal'});const oldWindow=h.frame.contentWindow;
  h.click('replayFixture');
  const waiting=h.el('previewStatus').textContent;
  const ready=h.status('normal','playing','Trusted native footage is playing.');
  h.message(ready,{source:oldWindow});
  h.message(ready,{origin:'https://other.example'});
  h.message(h.status('mega','playing','Wrong fixture.'));
  h.message({...ready,type:'unrelated'});
  h.message(null);
  assert.equal(h.el('previewStatus').textContent,waiting);
  assert.equal(h.timers.size,1,'only the current legitimate renderer can clear its loading timer');
  h.message(ready);
  assert.equal(h.el('previewStatus').textContent,'Trusted native footage is playing.');
  assert.equal(h.timers.size,0);
  h.message(h.status('normal','paused','p'.repeat(700)));
  assert.equal(h.el('previewStatus').textContent.length,500);
  assert.equal(h.el('pauseFixture').textContent,'Resume');
});

test('previous, next and reset navigate complete fixture documents and preserve boundary controls',()=>{
  const h=harness();h.click('startFlow');
  assert.match(h.frame.src,/fixture=zero&/);assert.equal(h.el('previousFixture').disabled,true);
  const first=h.frame;h.click('previousFixture');assert.equal(h.frame,first,'disabled previous does not reload');
  h.click('nextFixture');assert.match(h.frame.src,/fixture=one&/);assert.equal(h.el('pauseFixture').disabled,true);
  h.click('nextFixture');assert.match(h.frame.src,/fixture=two&/);
  h.click('previousFixture');assert.match(h.frame.src,/fixture=one&/);
  h.choose('paused');assert.equal(h.el('nextFixture').disabled,true);
  const last=h.frame;h.click('nextFixture');assert.equal(h.frame,last,'disabled next does not reload');
  h.click('resetReview');assert.match(h.frame.src,/fixture=zero&/);
  assert.equal(h.el('fixtureTitle').textContent,'No loot boxes');
  assert.equal(h.el('fixturePosition').textContent.startsWith('1 / 8'),true);
  assert.equal(h.el('previousFixture').disabled,true);assert.equal(h.el('nextFixture').disabled,false);
  assert.equal(h.history.entries.at(-1),'#zero');
});

test('pause, resume and return-to-index target only the current isolated renderer',()=>{
  const h=harness({hash:'#normal'});const current=h.frame;
  h.click('pauseFixture');
  assert.deepEqual(current.contentWindow.messages.at(-1),{data:{type:'cashfire-review-command',command:'pause'},origin:'https://cashfire.example'});
  h.message(h.status('normal','paused','held'));
  h.click('pauseFixture');assert.equal(current.contentWindow.messages.at(-1).data.command,'resume');
  h.message(h.status('normal','playing','resumed'));
  h.click('returnIndex');assert.equal(current.contentWindow.messages.at(-1).data.command,'pause');
  assert.equal(h.frame,current,'returning to index holds the same preview rather than restarting it');
  assert.equal(h.layout.classList.contains('index-visible'),true);
  assert.equal(h.focused.dataset.fixture,'normal');
  h.choose('mega');h.click('pauseFixture');
  assert.equal(current.contentWindow.messages.length,3,'old renderer receives no commands after navigation');
  assert.equal(h.frame.contentWindow.messages.at(-1).data.command,'pause');
});

test('a loading timeout can be retried and cannot survive a valid current-renderer status',()=>{
  const h=harness({hash:'#media-error'});
  h.tick();assert.match(h.el('previewStatus').textContent,/taking longer to load/);
  const timedOut=h.frame;h.click('replayFixture');assert.notEqual(h.frame,timedOut);
  assert.equal(h.timers.size,1);
  h.message(h.status('media-error','error','Film unavailable. Continue preserves the accepted award.'));
  h.tick();assert.equal(h.el('previewStatus').textContent,'Film unavailable. Continue preserves the accepted award.');
  assert.equal(h.el('pauseFixture').disabled,false,'error fixture keeps its recovery/preview controls accessible');
});

test('keyboard navigation respects interactive controls and compact index visibility',()=>{
  const h=harness({mobile:true});
  assert.equal(h.layout.classList.contains('index-visible'),true);
  h.click('startFlow');assert.equal(h.layout.classList.contains('index-visible'),false);
  h.key('ArrowRight');assert.match(h.frame.src,/fixture=one&/);
  const current=h.frame;h.key('ArrowRight','BUTTON');assert.equal(h.frame,current);
  h.key('ArrowLeft');assert.match(h.frame.src,/fixture=zero&/);
  h.key('Escape');assert.equal(h.layout.classList.contains('index-visible'),true);
});
