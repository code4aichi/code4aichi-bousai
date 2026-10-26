 'use strict';
// v3.2: municipality-specific warnings. Never guess when a location cannot be mapped.
(async()=>{
const {buildRegionMatches}=await import('/mieru-bosai/region-match.mjs?v=4.3.0');
const $=id=>document.getElementById(id);
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let results=[],areaTable=null,matchById=new Map(),loaded=false,areaOk=false,lastTime=null,fetching=false,regionMatches=new Map(),areaRetrievedAt=null;
const category=i=>Number(i.level)||0;
const rainCodes=new Set(['03','10','33','43']),floodCodes=new Set(['04','18','34','44']);
const mapItems=items=>items.filter(i=>!$('rain-map-filter')?.value||($('rain-map-filter').value==='rain'?rainCodes:floodCodes).has(i.code));
window.bousaiRainState=()=>({loaded,areaOk,retrievedAt:lastTime,points:(window.bousaiLocations?.()||[]).map(p=>({id:p.id,name:p.name,prefecture:p.prefecture,checked:!!(loaded&&areaOk&&matchById.has(p.id)&&resultsFor(p)?.ok),items:alertsFor(p,true)}))});
const itemsAllowed=items=>items.filter(x=>category(x)>=($('show-advisories')?.checked?1:2));
const resultsFor=p=>{const m=regionMatches.get(p.id);return m?.status==='matched'?results.find(x=>x.office===m.officeCode):null};
const setText=(id,val)=>{const e=$(id);if(e)e.textContent=String(val)};
const formatDate=iso=>{if(!iso)return '未取得';const d=new Date(iso);return Number.isNaN(d.valueOf())?'未取得':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)+' JST'};
const pointCount=()=>window.bousaiLocations?.().length||0;
function updateMetrics(){
 const okCount=results.filter(r=>r.ok).length;
 const affected=(window.bousaiLocations?.()||[]).filter(p=>alertsFor(p,true).length>0).length;
 setText('alert-impacted',loaded&&areaOk?`${affected.toLocaleString()} 地点`:'未確認');
 setText('alert-matched',areaOk?`${matchById.size.toLocaleString()} / ${pointCount().toLocaleString()} 地点`:'未確認');
 setText('alert-offices',loaded?`${okCount} / 58 発表区域`:'未確認');
 setText('alert-updated',loaded?formatDate(lastTime):'未確認');
}

function matchLocations(){
 regionMatches=areaTable?buildRegionMatches(window.bousaiLocations?.()||[],areaTable):new Map();
 matchById=new Map([...regionMatches].filter(([,m])=>m.status==='matched').map(([id,m])=>[id,m.areaCode]));
 const counts={matched:0,ambiguous:0,unmatched:0};for(const m of regionMatches.values())counts[m.status]++;
 setText('region-match-summary',areaOk?`一意に照合：${counts.matched.toLocaleString()}地点 ／ 複数候補：${counts.ambiguous.toLocaleString()}地点 ／ 一致なし：${counts.unmatched.toLocaleString()}地点`:'地域の対応関係は未確認です');
}
function updateRegionIdentity(p){
 const el=$('detail-region-identity');if(!el)return;
 const m=regionMatches.get(p.id);
 if(!areaOk||!m){el.textContent='気象庁区域コードとの対応は未確認です。';return;}
 const note=m.status==='matched'?`発表区域：${m.areaName}（${m.areaCode}） ／ ${m.officeName}（${m.officeCode}）`:`${m.reason}。警報の有無は未判定です。`;
 el.textContent=note+`。照合方法：都道府県と区域名の一致。コード表取得：${formatDate(areaRetrievedAt)}。`;
}
function alertsFor(p,ignoreAdvisories=false){
 const office=resultsFor(p);
 if(!office?.ok)return [];
 const code=matchById.get(p.id);if(!code)return [];
 const current=(office.items||[]).filter(i=>Array.isArray(i.areas)&&i.areas.includes(code));
 return ignoreAdvisories?current:itemsAllowed(current);
}
window.bousaiSeverity=p=>($('show-alerts')?.checked&&loaded&&areaOk)?Math.max(0,...mapItems(alertsFor(p)).map(category)):0;
window.bousaiBadge=p=>{const lvl=window.bousaiSeverity(p);return lvl?`<b class="mini-alert level-${lvl}" title="この自治体に警報・注意報の発表あり">!</b>`:'⌖'};
function updateDetails(){
 const el=$('detail-alerts'),p=window.bousaiCurrentSelection?.();if(!el||!p)return;
 updateRegionIdentity(p);
 const office=resultsFor(p);
 if(!loaded){el.textContent=fetching?'気象庁データを取得しています。':'警報情報を取得できていません。現在の状況は未確認です。気象庁の公式情報をご確認ください。';return}
 if(!areaOk){el.textContent='地域コード表が取得できないため、自治体単位の判定はできません。';return}
 if(!matchById.has(p.id)){el.textContent='この地点と気象庁の市町村相当区域の対応は未確認です。警報の有無は未判定です。';return}
 if(!office?.ok){el.textContent='この発表区域の情報を取得できませんでした。警報の有無は未確認です。';return}
 const active=alertsFor(p,true);
 const reportDate=office.reportDatetime?formatDate(office.reportDatetime):'未取得';
 el.innerHTML=active.length?`<ul>${active.map(i=>`<li><strong>${clean(i.name)}</strong> <span class="alert-status-name">${clean(i.statuses?.join(' / ')||'発表情報あり')}</span></li>`).join('')}</ul><p class="alert-note">気象庁発表：${clean(reportDate)} ／ 市区町村相当区域で照合</p>`:'<p>取得した発表情報に、該当区域の警報・注意報は含まれていません。ただし安全を保証する表示ではありません。</p>';
}
function render(){
 window.bousaiRerender?.();updateDetails();document.dispatchEvent(new Event('bousai:rain-update'));
 const panel=$('alert-region-list');if(!panel)return;panel.replaceChildren();
 const note=$('alert-list-note');
 if(!$('show-alerts')?.checked){if(note)note.textContent='地図上のアラート表示はオフです';return}
 if(!loaded||!areaOk){if(note)note.textContent='自治体別情報は未確認です';return}
 const points=(window.bousaiLocations?.()||[]).filter(p=>window.bousaiSeverity(p)>0);
 if(note)note.textContent=points.length?`${points.length.toLocaleString()}件の対象地点（先頭35件を表示）`:'対象地点は確認されていません。取得状況を確認してください';
 const shown=points.slice(0,35);
 for(const p of shown){const lvl=window.bousaiSeverity(p);const btn=document.createElement('button');btn.className='alert-chip'+(lvl===1?' caution':lvl===4?' extreme':'');btn.textContent='! '+p.prefecture+' '+p.name;btn.onclick=()=>window.bousaiShowDetail?.(p);panel.append(btn)}
 if(points.length>shown.length){const count=document.createElement('span');count.className='alert-overflow';count.textContent=`ほか${points.length-shown.length}地点（地図や検索で確認）`;panel.append(count)}
}
window.bousaiRefreshDetails=updateDetails;
async function fetchData(){
 const status=$('alert-status');if(!status||fetching)return;fetching=true;
 status.className='alert-status';$('alert-summary').textContent='気象庁の警報・注意報を取得しています…';$('refresh-alerts').disabled=true;
 try{
  const responses=await Promise.allSettled([fetch('/mieru-bosai/api/alerts?batch=0',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json()}),fetch('/mieru-bosai/api/alerts?batch=1',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json()}),fetch('/mieru-bosai/api/areas',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json()})]);
  const batches=responses.slice(0,2).filter(x=>x.status==='fulfilled'&&x.value.ok&&Array.isArray(x.value.results)).map(x=>x.value);
  if(!batches.length)throw Error('警報データの取得失敗');
  results=batches.flatMap(x=>x.results);loaded=true;lastTime=batches.map(x=>x.retrievedAt).filter(Boolean).sort()[0];
  const areas=responses[2].status==='fulfilled'?responses[2].value:null;
  if(areas?.ok&&areas.class20s){areaTable=areas;areaOk=true;areaRetrievedAt=areas.retrievedAt;}else {areaTable=null;areaOk=false;areaRetrievedAt=null;}matchLocations();
  const failed=58-results.filter(x=>x.ok).length;
   status.classList.add(failed||!areaOk?'partial':'ok');
  $('alert-summary').textContent=areaOk?`気象警報・注意報 · ${formatDate(lastTime)}取得 · 5分ごとに更新${failed?' · 一部地域は未確認':''}`:'地域コード表を取得できません。自治体ごとの警報は未確認です。';
  updateMetrics();render();
 }catch(e){loaded=false;results=[];areaOk=false;matchById.clear();lastTime=null;areaTable=null;matchLocations();status.classList.add('failed');$('alert-summary').textContent='警報データを取得できません。現在の警報状態は未確認です。気象庁の公式発表をご確認ください。';updateMetrics();render()}
 finally{fetching=false;$('refresh-alerts').disabled=false;updateDetails()}
}
let initialized=false;
async function init(){if(initialized||!window.bousaiLocations)return;initialized=true;
 $('refresh-alerts').onclick=fetchData;
 if($('rain-map-filter'))$('rain-map-filter').onchange=()=>{$('show-alerts').checked=true;render()};
 $('show-alerts').onchange=render;$('show-advisories').onchange=render;
 document.addEventListener('bousai:selection',updateDetails);
 await fetchData();setInterval(fetchData,5*60*1000);
}
document.addEventListener('bousai:map-ready',init,{once:true});
if(window.bousaiLocations?.().length)init();
})();
