// Keep tests in one Node process: restricted hosts may deny child spawning.
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const tests=['reel-maths.cjs','maths-simulation.cjs','anticipation.cjs','motion.cjs','machine-geometry.cjs','reel-renderer.cjs','viewport.cjs','panels.cjs','labs.cjs','sample-audio.cjs','cinematic-fx.cjs','bolt-collection.cjs','live-game.cjs','bonus.test.mjs','bonus-assets.test.mjs','outcomes.test.mjs'];
const records=[];
for(const test of tests){await import(pathToFileURL(resolve('tests',test)).href);for(let i=0;i<100;i++)await Promise.resolve();records.push({test,loaded:true});}
await mkdir('docs/review',{recursive:true});
process.once('beforeExit',async code=>{if(process.exitCode)code=process.exitCode;await writeFile('docs/review/automated-tests.json',JSON.stringify({version:'1.4.0',passed:code===0,scope:'Node VM, model and native-media tests. Browser/audio/device verification is separate.',entries:records.length,records},null,2)+'\n');});
