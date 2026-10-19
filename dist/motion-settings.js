'use strict';
(()=>{
 const fields=[['speed','Spin speed (radians/sec)',1],['firstStop','First stop (seconds)',.05],['interval','Stop interval (seconds)',.01],['anticipation','Extra cruise per bolt (seconds)',.01],['brake','Braking duration (seconds)',.01],['settle','Settle amount (radians)',.001]];
 const el=id=>document.getElementById(id);
 el('motionFields').innerHTML=fields.map(([key,label,step])=>'<label>'+label+'<input id="motion-'+key+'" type="number" min="'+ReelMotion.limits[key][0]+'" max="'+ReelMotion.limits[key][1]+'" step="'+step+'"></label>').join('');
 function fill(model){for(const [key] of fields)el('motion-'+key).value=String(model[key]);}
 fill(ReelMotion.settings);
 el('motionReset').onclick=()=>{fill(ReelMotion.defaults);el('motionMessage').textContent='Defaults loaded. Apply motion to use them.';};
 el('motionApply').onclick=()=>{try{const model={};for(const [key] of fields){const value=el('motion-'+key).value;if(!value.trim())throw Error('Fill in all motion settings.');model[key]=Number(value);}ReelMotion.apply(model);el('motionMessage').textContent='Motion applied for this session. Maths unchanged. Brake duration may increase slightly at low speeds to keep stops smooth.';}catch(e){el('motionMessage').textContent=e.message;}};
 el('mathsDialog').addEventListener('close',()=>fill(ReelMotion.settings));
})();
