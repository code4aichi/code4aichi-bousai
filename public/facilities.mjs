import {parseFacilities,filterFacilities,usablePosition} from './facility-model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOURCE='https://www.water.city.nagoya.jp/category/10200bousai/1527.html';
let facilities=[],filtered=[],group=null,markers=new Map(),nearest=false,pending=false,pendingTimer=null,loaded=false;
const position=()=>{const p=window.bousaiCurrentPosition?.();return usablePosition(p)?p:null};
const distance=n=>n==null?'':n<1?`約${Math.round(n*1000)}m`:`約${n.toFixed(1)}km`;
function draw(){
 group?.clearLayers();markers.clear();$('facility-map-badge').hidden=true;
 if(!loaded||!$('show-facilities').checked||!window.map||typeof L==='undefined')return;
 if(!group){group=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({maxClusterRadius:45,showCoverageOnHover:false,iconCreateFunction:cluster=>L.divIcon({className:'facility-cluster',html:`<span>施 ${cluster.getChildCount()}</span>`,iconSize:[46,34]})}):L.layerGroup();group.addTo(window.map)}
 for(const f of filtered){
  const marker=L.marker([f.lat,f.lng],{title:`登録給水施設：${f.name}（開設状況未確認）`,icon:L.divIcon({className:'registered-facility-marker',html:'<span aria-hidden="true">施</span>',iconSize:[28,28],iconAnchor:[14,14]})});
  marker.bindPopup(`<b>${esc(f.name)}</b><p>${esc(f.type)}<br>${esc(f.region)} ${esc(f.address)}</p><p><strong>登録施設／開設・給水状況は未確認</strong><br>現地や自治体の発表をご確認ください。</p><a href="${SOURCE}" target="_blank" rel="noopener noreferrer">出典・利用方法を公式ページで確認 ↗</a>`);group.addLayer(marker);markers.set(f.id,marker);
 }
 if(filtered.length){$('facility-map-badge').hidden=false;$('facility-map-badge').textContent=`「施」は登録給水施設（${filtered.length}件）。開設・給水中を示す目印ではありません。`}
}
function focusFacility(id){
 const f=filtered.find(x=>x.id===id);if(!f||!window.map)return;
 $('show-facilities').checked=true;draw();window.map.stop();window.map.invalidateSize({pan:false});window.map.setView([f.lat,f.lng],16,{animate:false});
 const marker=markers.get(id);if(marker){if(typeof group.zoomToShowLayer==='function')group.zoomToShowLayer(marker,()=>marker.openPopup());else marker.openPopup()}
 document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 if(!loaded)return;
 const p=position();if(nearest&&!p){nearest=false;$('facility-distance-note').textContent='現在地の取得から時間が経ちました。距離順で探す場合は、現在地を再取得してください。'}
 filtered=filterFacilities(facilities,{query:$('facility-search').value,region:$('facility-region').value,type:$('facility-type').value,position:nearest?p:null});
 $('facility-count').textContent=`${filtered.length}件 / 登録給水施設${facilities.length}件`;
 if(nearest&&p)$('facility-distance-note').textContent=`現在地からの直線距離順（対象データ内）。${p.accuracy!=null?`位置精度の目安：約${p.accuracy.toLocaleString()}m。`:''}${filtered[0]?.distanceKm>20?'現在地の周辺を網羅するデータではありません。':''}距離は目安で、給水可否や安全な経路を示しません。`;
 const limit=30;
 $('facility-list').innerHTML=filtered.length?filtered.slice(0,limit).map(f=>`<article class="facility-card"><div><b>${esc(f.name)}</b><span class="facility-distance">${esc(distance(f.distanceKm))}</span></div><p>${esc(f.type)} ／ ${esc(f.region)} ${esc(f.address)}</p><small>登録施設・開設状況未確認</small> <button type="button" data-facility-id="${esc(f.id)}" ${!window.map?'disabled':''}>地図で確認</button></article>`).join('')+(filtered.length>limit?`<p class="facility-note">先頭${limit}件を表示しています。施設名・地域・種類で絞り込めます。</p>`:''):'<p class="facility-note">検索条件に合う登録施設はありません。周辺に給水施設がないことを意味しません。</p>';
 $('facility-list').querySelectorAll('[data-facility-id]').forEach(b=>b.onclick=()=>focusFacility(b.dataset.facilityId));draw();
}
function useCurrent(){
 if(!loaded)return;
 if(position()){nearest=true;pending=false;clearTimeout(pendingTimer);render();return}
 pending=true;$('facility-distance-note').textContent='現在地を取得しています。ブラウザの位置情報の許可をご確認ください。';
 $('locate-me').click();clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{if(pending){pending=false;$('facility-distance-note').textContent='現在地を取得できませんでした。施設名や地域から検索できます。'}},15000);
}
$('show-facilities').onchange=draw;
for(const id of ['facility-search','facility-region','facility-type'])$(id).addEventListener(id==='facility-search'?'input':'change',render);
$('facility-use-current').onclick=useCurrent;
$('facility-clear').onclick=()=>{$('facility-search').value='';$('facility-region').value='';$('facility-type').value='';nearest=false;pending=false;clearTimeout(pendingTimer);$('facility-distance-note').textContent='現在地から探すと、登録データ内を直線距離順で並べます。';render()};
$('facility-show-results').onclick=()=>{if(!loaded||!filtered.length||!window.map)return;$('show-facilities').checked=true;draw();window.map.fitBounds(L.latLngBounds(filtered.map(f=>[f.lat,f.lng])).pad(.06),{maxZoom:14});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'})};
document.addEventListener('bousai:position',()=>{if(pending){pending=false;clearTimeout(pendingTimer);nearest=true}render()});
document.addEventListener('bousai:position-error',()=>{pending=false;clearTimeout(pendingTimer);$('facility-distance-note').textContent='現在地を取得できませんでした。施設名・地域で検索できます。'});
document.addEventListener('bousai:map-ready',()=>{if(loaded)render()});
setInterval(()=>{if(nearest&&!position())render()},30000);
(async()=>{
 try{const r=await fetch('/mieru-bosai/nagoya-water-facilities.json?v=4.8.0');if(!r.ok)throw Error();const data=await r.json();facilities=parseFacilities(data);loaded=true;
  for(const region of [...new Set(facilities.map(f=>f.region))]){const option=document.createElement('option');option.value=region;option.textContent=region;$('facility-region').append(option)}
  const recorded=data.source?.retrievedAt?.slice(0,10)||'不明';$('facility-summary').textContent=`登録給水施設：${facilities.length}件を読み込みました（開設状況未確認）`;
  $('facility-source').innerHTML=`出典：<a href="${SOURCE}" target="_blank" rel="noopener noreferrer">名古屋市上下水道局 応急給水施設オープンデータ</a> ／ <a href="https://creativecommons.org/licenses/by-nd/4.0/" target="_blank" rel="noopener noreferrer">CC BY-ND 4.0</a>。名称・住所・数値等は原文の各項目を変更せず転載。収録日：${esc(recorded)}。<a href="/mieru-bosai/nagoya-water-facilities.xlsx">公式データの収録原本（xlsx）</a>`;
  render();
 }catch{loaded=false;group?.clearLayers();$('show-facilities').disabled=true;$('facility-summary').textContent='登録給水施設データを取得できません。施設の所在・状況は未確認です。';$('facility-list').textContent='公式ページからご確認ください。';$('facility-use-current').disabled=true;$('facility-show-results').disabled=true;}
})();
