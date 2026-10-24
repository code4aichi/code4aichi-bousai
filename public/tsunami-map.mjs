import {coastEligible,buildCoastOverlay,validateCoasts} from './tsunami-coast-model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(s))+' JST';
const key=r=>JSON.stringify([r.sourceURL,r.updatedAt,r.eventId]);
let selected=null,layer=null,coastPromise=null,requestId=0;
function clear(reason=''){
 requestId++;layer?.remove();layer=null;selected=null;
 $('tsunami-map-state').hidden=!reason;$('tsunami-map-message').textContent=reason;
 $('tsunami-map-caption').textContent='';$('tsunami-history-badge').hidden=true;$('tsunami-history-badge').textContent='';
}
async function coasts(){
 if(!coastPromise)coastPromise=fetch('/mieru-bosai/tsunami-coasts.geojson?v=4.5.0').then(async r=>{if(!r.ok)throw Error();return validateCoasts(await r.json())}).catch(e=>{coastPromise=null;throw e});
 return coastPromise;
}
async function show(report,areaCode){
 clear();const id=requestId;
 if(!window.map||typeof L==='undefined'||!coastEligible(report))return;
 const data=window.bousaiSeismicData;if(!data||Date.now()-Date.parse(data.retrievedAt)>120000)return;
 $('tsunami-map-state').hidden=false;$('tsunami-map-caption').textContent=`発表履歴：${date(report.reportedAt)} ／ 現在の警報図ではありません`;
 $('tsunami-map-message').textContent='対象沿岸を読み込んでいます…';selected={key:key(report),areaCode};
 try{
  const geography=await coasts();if(id!==requestId)return;
  const overlay=buildCoastOverlay(areaCode?{...report,areas:report.areas.filter(a=>a.code===areaCode)}:report,geography);
  if(!overlay.features.length){$('tsunami-map-message').textContent='この発表の対象沿岸を表示できません。発表の地域一覧と気象庁の公式情報をご確認ください。';return}
  if(!window.map.getPane('tsunami-history'))window.map.createPane('tsunami-history').style.zIndex=450;
  layer=L.geoJSON(overlay,{pane:'tsunami-history',style:f=>({color:f.properties.color,weight:f.properties.weight,dashArray:f.properties.dashArray,opacity:1,fill:false}),onEachFeature(f,l){
   l.bindTooltip(`${esc(f.properties.name)}：${esc(f.properties.category||f.properties.label)}`);
   l.bindPopup(`<b>${esc(f.properties.name)}</b><p>${esc(f.properties.category||f.properties.label)}</p><p>発表：${esc(date(report.reportedAt))}<br>選んだ発表の履歴表示です。現在の警報状況・浸水範囲を示しません。</p>`);
  }}).addTo(window.map);
  selected={key:key(report),areaCode};$('tsunami-history-badge').textContent=`津波の履歴表示：${date(report.reportedAt)}発表（現在の警報図ではありません）`;$('tsunami-history-badge').hidden=false;
  const missing=overlay.missingCodes.length+overlay.unknownKinds.length+overlay.conflictingCodes.length;
  $('tsunami-map-message').textContent=`${overlay.features.length}区域の沿岸を表示${missing?` ／ ${missing}区域は照合できず未表示`:''}。浸水範囲・被害範囲は示していません。`;
  const bounds=layer.getBounds();if(bounds.isValid()){window.map.stop();window.map.invalidateSize({pan:false});window.map.fitBounds(bounds.pad(.04),{maxZoom:8,animate:false})}
  $('tsunami-map-state').scrollIntoView({behavior:'smooth',block:'start'});
 }catch{if(id===requestId){$('tsunami-map-message').textContent='沿岸データを読み込めませんでした。もう一度ボタンを押すか、気象庁の公式情報をご確認ください。'}}
}
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-tsunami-report]');if(!button)return;
 const report=window.bousaiSeismicData?.reports?.filter(r=>r.family==='tsunami')[Number(button.dataset.tsunamiReport)];
 if(report)show(report,button.dataset.tsunamiArea);
});
$('clear-tsunami-map').onclick=()=>clear();
document.addEventListener('bousai:seismic-data',()=>{
 // Invalidate even an in-flight selection when a new feed snapshot arrives.
 const data=window.bousaiSeismicData;
 if(!data||Date.now()-Date.parse(data.retrievedAt)>120000){clear();return}
 if(selected&&!data.reports.some(r=>key(r)===selected.key&&coastEligible(r)))clear('新しい発表・取消などの更新を確認したため、沿岸表示を解除しました。確認する発表を選び直してください。');
});
