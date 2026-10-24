'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const write=(el,value)=>{if(el.textContent!==value)el.textContent=value};
 function sync(){
  const count=$('saved-regions-list').querySelectorAll('.saved-region').length;write($('saved-regions-count'),`${count}件`);
  const enabled=[];
  if($('show-water').checked){enabled.push('水');if($('show-planned-water').checked)enabled.push('工事予定')}
  if($('show-alerts').checked){enabled.push('警報');if($('show-advisories').checked)enabled.push('注意報')}
  if($('show-facilities')?.checked)enabled.push('登録施設');
  if($('show-earthquakes').checked)enabled.push('地震');write($('map-layer-summary'),enabled.length?enabled.join('・'):'地図の情報表示なし');
  const statuses=[['water-summary',null],['alert-summary','alert-status'],['seismic-summary','seismic-status'],['facility-summary',null]].filter(([id])=>$(id)).map(([id,parent])=>{
   const text=$(id).textContent,box=parent?$(parent):null,explicit=$(id).dataset?.fetchState;
   if(['ok','partial','failed','loading'].includes(explicit))return explicit;
   if(box?.classList.contains('failed')||/取得できません|取得失敗|取得できず/.test(text))return 'failed';
   if(box?.classList.contains('partial')||/一部|経過|未確認/.test(text))return 'partial';
   if(/確認しています|取得しています/.test(text))return 'loading';return 'ok';
  });
  const state=statuses.includes('failed')?'failed':statuses.includes('partial')?'partial':statuses.includes('loading')?'loading':'ok';
  const labels={failed:'取得失敗あり',partial:'一部未確認',loading:'確認中',ok:'取得済み'};
  const badge=$('map-fetch-health');write(badge,labels[state]);badge.dataset.state=state;
 }
 const observer=new MutationObserver(sync);
 for(const id of ['saved-regions-list','water-summary','alert-summary','seismic-summary','facility-summary'])if($(id))observer.observe($(id),{childList:true,subtree:true,characterData:true});
 if($('facility-summary'))observer.observe($('facility-summary'),{attributes:true,attributeFilter:['data-fetch-state']});
 for(const id of ['alert-status','seismic-status'])observer.observe($(id),{attributes:true,attributeFilter:['class']});
 for(const id of ['show-water','show-planned-water','show-alerts','show-advisories','show-earthquakes','show-facilities'])$(id)?.addEventListener('change',sync);
 document.addEventListener('click',e=>{if(e.target.closest?.('#saved-regions-list .saved-region'))$('saved-regions-panel').open=false;sync()});
 sync();
})();
