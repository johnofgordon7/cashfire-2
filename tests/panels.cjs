const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={},classes=new Set();
function el(id,attrs={}){return elements[id]??={id,hidden:false,disabled:false,attrs,events:{},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},addEventListener(k,f){this.events[k]=f},focus(options){this.focused=true;this.focusOptions=options}};}
const bets=Array.from({length:18},(_,i)=>Object.assign(el('amount'+i,{'aria-pressed':String(i===5)}),{offsetTop:Math.floor(i/3)*60,offsetHeight:52}));
const amounts=Object.assign(el('betOptions'),{clientHeight:196,querySelector:()=>bets.find(b=>b.attrs['aria-pressed']==='true')});
const tabs=['rules','controls','demo'].map(n=>el(n+'Tab',{'aria-controls':n+'Page','aria-selected':String(n==='rules')}));
for(const n of ['rulesPage','controlsPage','demoPage'])el(n);
const panel=el('betPanel');panel.open=true;
const document={documentElement:{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}},getElementById:el,querySelectorAll:()=>tabs};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dist/panels.js'),'utf8'),{document});
el('betToggle').events.click();assert(classes.has('bet-open'));assert.equal(bets.filter(b=>!b.hidden).length,18,'every amount is in one list');
bets.forEach((b,i)=>b.attrs['aria-pressed']=String(i===16));el('betToggle').events.click();assert(amounts.scrollTop>0,'opening scrolls the amount list to the selected high bet');assert(bets[16].focused);assert.equal(bets[16].focusOptions.preventScroll,true,'focus never scrolls the outer document');
panel.open=false;panel.events.close();assert(!classes.has('bet-open'),'closing restores the main touch policy');
tabs[1].onclick();assert.equal(el('controlsPage').hidden,false);assert.equal(el('rulesPage').hidden,true);assert.equal(tabs[1].tabIndex,0);assert.equal(tabs[0].tabIndex,-1);
let prevented=false;tabs[1].onkeydown({key:'ArrowRight',preventDefault(){prevented=true;}});assert(prevented);assert(tabs[2].focused);assert.equal(el('demoPage').hidden,false);assert.equal(el('controlsPage').hidden,true);
console.log('PASS: all bets in one list, selected amount scrolled into view locally, page lock restored on close, help pages and keyboard tabs.');
