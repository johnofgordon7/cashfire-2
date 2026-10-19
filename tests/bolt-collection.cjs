const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/../dist/bolt-collection.js','utf8'),scope);
const C=vm.runInContext('BoltCollection',scope);
for(const fps of [30,60,120])for(const [from,to] of [[[60,310],[190,95]],[[450,160],[60,95]],[[260,180],[200,100]]]){
  for(let age=0;age<850;age+=1000/fps){
    const p=C.flight(age,from,to);for(const v of Object.values(p))assert(Number.isFinite(v));
    assert(p.alpha>=0&&p.alpha<=1);assert(p.scale>=.6&&p.scale<=1);
    assert(p.x>=Math.min(from[0],to[0])&&p.x<=Math.max(from[0],to[0]));
  }
  const start=C.flight(0,from,to),end=C.flight(620,from,to);
  assert.equal(start.x,from[0]);assert.equal(start.y,from[1]);assert.equal(end.x,to[0]);assert.equal(end.y,to[1]);
  assert.equal(C.flight(820,from,to).alpha,0);assert.equal(C.flight(820,from,to).pulse,0);
}
console.log('PASS: finite, bounded, time-based collection flights at 30/60/120Hz.');
