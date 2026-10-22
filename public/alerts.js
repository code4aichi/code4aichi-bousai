 'use strict';
// v3.2: municipality-specific warnings. Never guess when a location cannot be mapped.
(()=>{
const $=id=>document.getElementById(id);
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replace(/ヶ/g,'ケ').replace(/ケ丘/g,'ヶ丘');
const PREF_ALIAS={'北海道':'北海道','東京':'東京都','京都':'京都府','大阪':'大阪府'};
const prefName=p=>PREF_ALIAS[p]||(/[都道府県]$/.test(p)?p:p+'県');
let results=[],areaTable=null,matchById=new Map(),loaded=false,areaOk=false,lastTime=null,fetching=false;
const category=i=>Number(i.level)||0;
const itemsAllowed=items=>items.filter(x=>category(x)>=($('show-advisories')?.checked?1:2));
const resultsFor=p=>results.find(x=>x.prefecture===prefName(p));
const setText=(id,val)=>{const e=$(id);if(e)e.textContent=String(val)};
const formatDate=iso=>{if(!iso)return '未取得';const d=new Date(iso);return Number.isNaN(d.valueOf())?'未取得':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)+' JST'};
const officialURL='https://www.jma.go.jp/bosai/';
const pointCount=()=>window.bousaiLocations?.().length||0;
function updateMetrics(){
 const okCount=results.filter(r=>r.ok).length;
 const affected=(window.bousaiLocations?.()||[]).filter(p=>alertsFor(p,true).length>0).length;
 setText('alert-impacted',loaded&&areaOk?`${affected.toLocaleString()} 地点`:'未確認');
 setText('alert-matched',areaOk?`${matchById.size.toLocaleString()} / ${pointCount().toLocaleString()} 地点`:'未確認');
 setText('alert-offices',loaded?`${okCount} / 47`:'未確認');
 setText('alert-updated',loaded?formatDate(lastTime):'未確認');
}

function buildLookup(area){
 const map=new Map();
 for(const [code,unit] of Object.entries(area.class20s||{})){
   const a15=area.class15s?.[unit.parent],a10=area.class10s?.[a15?.parent],office=area.offices?.[a10?.parent];
   if(!office)continue;
   const key=prefName(office.name)+'|'+norm(unit.name);
   const arr=map.get(key)||[];arr.push(code);map.set(key,arr);
 }
 return map;
}
function matchLocations(){
 matchById=new Map();if(!areaTable)return;
 const lookup=buildLookup(areaTable);
 for(const p of window.bousaiLocations?.()||[]){
  const key=prefName(p.prefecture)+'|'+norm(p.name);
  const codes=lookup.get(key)||[];
  // Exclude ambiguous, non-municipal and mismatched locations.
  if(codes.length===1)matchById.set(p.id,codes[0]);
 }
}
function alertsFor(p,ignoreAdvisories=false){
 const office=resultsFor(p.prefecture);
 if(!office?.ok)return [];
 const code=matchById.get(p.id);if(!code)return [];
 const current=(office.items||[]).filter(i=>Array.isArray(i.areas)&&i.areas.includes(code));
 return ignoreAdvisories?current:itemsAllowed(current);
}
window.bousaiSeverity=p=>($('show-alerts')?.checked&&loaded&&areaOk)?Math.max(0,...alertsFor(p).map(category)):0;
window.bousaiBadge=p=>{const lvl=window.bousaiSeverity(p);return lvl?`<b class="mini-alert level-${lvl}" title="この自治体に警報・注意報の発表あり">!</b>`:'⌖'};
function updateDetails(){
 const el=$('detail-alerts'),p=window.bousaiCurrentSelection?.();if(!el||!p)return;
 const office=resultsFor(p.prefecture);
 if(!loaded){el.textContent=fetching?'気象庁データを取得しています。':'警報情報を取得できていません。現在の状況は未確認です。気象庁の公式情報をご確認ください。';return}
 if(!office?.ok){el.textContent='この都道府県の情報を取得できませんでした。';return}
 if(!areaOk){el.textContent='地域コード表が取得できないため、自治体単位の判定はできません。';return}
 if(!matchById.has(p.id)){el.innerHTML='<p>この地点は気象庁の市区町村区域と一意に対応付けできていません。警報の有無は未判定です。</p>';return}
 const active=alertsFor(p,true);
 const reportDate=office.reportDatetime?formatDate(office.reportDatetime):'未取得';
 el.innerHTML=active.length?`<ul>${active.map(i=>`<li><strong>${clean(i.name)}</strong> <span class="alert-status-name">${clean(i.statuses?.join(' / ')||'発表情報あり')}</span></li>`).join('')}</ul><p class="alert-note">気象庁発表：${clean(reportDate)} ／ 市区町村相当区域で照合</p>`:'<p>取得した発表情報に、該当区域の警報・注意報は含まれていません。ただし安全を保証する表示ではありません。</p>';
}
function render(){
 window.bousaiRerender?.();updateDetails();
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
  const [alertResponse,areaResponse]=await Promise.all([fetch('/mieru-bosai/api/alerts',{cache:'no-store'}),fetch('/mieru-bosai/api/areas',{cache:'no-store'})]);
  if(!alertResponse.ok)throw Error('警報データの取得失敗');const alert=await alertResponse.json();
  if(!alert.ok||!Array.isArray(alert.results))throw Error('警報データの形式が不正');
  results=alert.results;loaded=true;lastTime=alert.retrievedAt;
  if(areaResponse.ok){const areas=await areaResponse.json();if(areas.ok&&areas.class20s){areaTable=areas;areaOk=true;matchLocations()}else {areaOk=false;matchById.clear()}}else {areaOk=false;matchById.clear()}
  const matched=matchById.size,failed=results.filter(x=>!x.ok).length;
  const impacted=(window.bousaiLocations?.()||[]).filter(p=>alertsFor(p,true).length).length;
  status.classList.add(failed||!areaOk?'partial':'ok');
  $('alert-summary').textContent=areaOk?`気象警報・注意報 · ${formatDate(lastTime)}取得 · 5分ごとに更新${failed?' · 一部地域は未確認':''}`:'地域コード表を取得できません。自治体ごとの警報は未確認です。';
  updateMetrics();render();
 }catch(e){loaded=false;results=[];areaOk=false;matchById.clear();lastTime=null;status.classList.add('failed');$('alert-summary').textContent='警報データを取得できません。現在の警報状態は未確認です。気象庁の公式発表をご確認ください。';updateMetrics();render()}
 finally{fetching=false;$('refresh-alerts').disabled=false;updateDetails()}
}
async function init(){if(!window.bousaiLocations)return;
 $('refresh-alerts').onclick=fetchData;
 $('show-alerts').onchange=render;$('show-advisories').onchange=render;
 document.addEventListener('bousai:selection',updateDetails);
 await fetchData();setInterval(fetchData,5*60*1000);
}
document.addEventListener('bousai:map-ready',init,{once:true});
if(window.map&&window.bousaiLocations)init();
})();
