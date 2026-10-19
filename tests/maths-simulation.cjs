// One independent 1,000,000-spin run through the actual game draw + shuffle code.
// Uses Web Crypto, not forced outcome counts or repeated runs selected for RTP.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../dist/results-api.js','utf8');
const scope=vm.createContext({crypto:crypto.webcrypto});
vm.runInContext(fs.readFileSync(__dirname+'/../dist/bonus.js','utf8'),scope);
vm.runInContext(source+';globalThis.api=LiveWireAPI;',scope);
(async()=>{
  const api=scope.api,n=1_000_000,counts=[0,0,0,0,0],masks=Array(16).fill(0);
  const config=await api.connect();
  let total=0,squares=0;
  for(let i=0;i<n;i++){
    const r=await api.draw();
    assert.equal(r.symbols.reduce((a,b)=>a+b,0),r.wins);
    if(r.wins<3)assert.equal(r.multiplier,api.payouts[r.wins]);else assert(r.multiplier>=r.bonus.min&&r.multiplier<=r.bonus.max);
    assert.equal(r.mathSolutionId,config.id);
    counts[r.wins]++;masks[r.mask]++;total+=r.multiplier;squares+=r.multiplier*r.multiplier;
  }
  const mean=api.table.reduce((s,r)=>s+r.probability*r.multiplier,0);
  const variance=api.metrics().variance;
  const sd=Math.sqrt(variance),se=sd/Math.sqrt(n),observed=total/n;
  // Exact rational proof in stake units per million weighted outcomes.
  assert.equal(409600*.2+153600*1+25600*20+1600*140,971520);
  assert(Math.abs(mean-.97152)<1e-14);
  const result={model:config.id,createdAt:new Date().toISOString(),spins:n,
    rng:'Node Web Crypto; one unseeded independent run; actual production draw and shuffle',
    sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),
    theoreticalRtp:mean,observedRtp:observed,totalStakeUnits:n,totalReturnUnits:total,
    theoreticalVariance:variance,theoreticalStandardDeviation:sd,
    sampleStandardDeviation:Math.sqrt((squares-n*observed**2)/(n-1)),
    standardErrorRtp:se,approx95PercentRtpRange:[mean-1.95996398454*se,mean+1.95996398454*se],
    zScore:(observed-mean)/se,
    theoreticalAnyReturn:api.table.filter(r=>r.multiplier>0).reduce((s,r)=>s+r.probability,0),
    theoreticalNetWin:api.table.filter(r=>r.multiplier>1).reduce((s,r)=>s+r.probability,0),
    observedAnyReturn:(counts[1]+counts[2]+counts[3]+counts[4])/n,observedNetWin:(counts[3]+counts[4])/n,
    outcomes:api.table.map(r=>({...r,expectedCount:n*r.probability,observedCount:counts[r.wins],observedProbability:counts[r.wins]/n,rtpContribution:r.probability*r.multiplier})),masks};
  const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
