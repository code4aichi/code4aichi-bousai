 'use strict';
// v3.2: municipality-specific warnings. Never guess when a location cannot be mapped.
(()=>{
const $=id=>document.getElementById(id);
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replace(/ヶ/g,'ケ').replace(/ケ丘/g,'ヶ丘');
const PREF_ALIAS={'北海道':'北海道','東京':'東京都','京都':'京都府','大阪':'大阪府'};
const prefName=p=>PREF_ALIAS[p]||(/[都道府県]$/.test(p)?p:p+'県');
let results=[],areaTable=null,matchById=new Map(),loaded=false,areaOk=false,lastTime=null;
const category=i=>Number(i.level)||0;
const itemsAllowed=items=>items.filter(x=>category(x)>=($('show-advisories')?.checked?1:2));
const resultsFor=p=>results.find(x=>x.prefecture===prefName(p));
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
 if(!loaded){el.textContent='気象庁データの取得を確認中です。';return}
 if(!office?.ok){el.textContent='この都道府県の情報を取得できませんでした。';return}
 if(!areaOk){el.textContent='地域コード表が取得できないため、自治体単位の判定はできません。';return}
 if(!matchById.has(p.id)){el.innerHTML='<p>この地点は気象庁の市区町村区域と一意に対応付けできていません。警報の有無は未判定です。</p>';return}
 const active=alertsFor(p,true);
 el.innerHTML=active.length?`<ul>${active.map(i=>`<li><strong>${clean(i.name)}</strong>（${clean(i.statuses?.join(' / ')||'発表中')}）</li>`).join('')}</ul><p class="alert-note">発表時刻：${clean(office.reportDatetime||'未取得')} ／ 気象庁の市区町村相当区域で判定</p>`:'<p>取得した発表情報に、この市区町村区域の警報・注意報は含まれていません。最新の情報は気象庁公式サイトをご確認ください。</p>';
}
function render(){
 window.bousaiRerender?.();updateDetails();
 const panel=$('alert-region-list');if(!panel)return;panel.replaceChildren();
 if(!$('show-alerts')?.checked||!areaOk)return;
 const points=(window.bousaiLocations?.()||[]).filter(p=>window.bousaiSeverity(p)>0);
 const shown=points.slice(0,35);
 for(const p of shown){const lvl=window.bousaiSeverity(p);const btn=document.createElement('button');btn.className='alert-chip'+(lvl===1?' caution':lvl===4?' extreme':'');btn.textContent='! '+p.prefecture+' '+p.name;btn.onclick=()=>window.bousaiShowDetail?.(p);panel.append(btn)}
 if(points.length>shown.length){const count=document.createElement('span');count.className='alert-overflow';count.textContent=`ほか${points.length-shown.length}地点（地図や検索で確認）`;panel.append(count)}
}
async function fetchData(){
 const status=$('alert-status');if(!status)return;
 status.className='alert-status';$('alert-summary').textContent='気象庁の警報・注意報を取得しています…';$('refresh-alerts').disabled=true;
 try{
  const [alertResponse,areaResponse]=await Promise.all([fetch('/api/alerts',{cache:'no-store'}),fetch('/api/areas',{cache:'no-store'})]);
  if(!alertResponse.ok)throw Error('警報データの取得失敗');const alert=await alertResponse.json();
  if(!alert.ok||!Array.isArray(alert.results))throw Error('警報データの形式が不正');
  results=alert.results;loaded=true;lastTime=alert.retrievedAt;
  if(areaResponse.ok){const areas=await areaResponse.json();if(areas.ok&&areas.class20s){areaTable=areas;areaOk=true;matchLocations()}else areaOk=false}else areaOk=false;
  const matched=matchById.size,failed=results.filter(x=>!x.ok).length;
  const impacted=(window.bousaiLocations?.()||[]).filter(p=>alertsFor(p,true).length).length;
  status.classList.add(failed||!areaOk?'partial':'ok');
  $('alert-summary').textContent=areaOk?`市区町村照合 ${matched.toLocaleString()} / ${(window.bousaiLocations?.()||[]).length.toLocaleString()}地点 · 警報・注意報の発表が確認できた登録地点 ${impacted}件 · 取得失敗 ${failed}都道府県（${new Date(lastTime).toLocaleString('ja-JP')}更新）`:`都道府県データは取得しましたが、地域コード表を取得できません。市区町村への警報表示は保留しています。`;
  render();
 }catch(e){loaded=false;status.classList.add('failed');$('alert-summary').textContent='警報データが取得できません。地図上の警報表示は最新ではありません。気象庁の公式発表をご確認ください。';render()}
 finally{$('refresh-alerts').disabled=false}
}
async function init(){if(!window.map||!window.bousaiLocations)return;
 $('refresh-alerts').onclick=fetchData;
 $('show-alerts').onchange=render;$('show-advisories').onchange=render;
 document.addEventListener('bousai:selection',updateDetails);
 await fetchData();setInterval(fetchData,5*60*1000);
}
document.addEventListener('bousai:map-ready',init,{once:true});
if(window.map&&window.bousaiLocations)init();
})();
