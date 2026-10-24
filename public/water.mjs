import {waterFeatures,verifiedWaterEvents} from './water-model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>Number.isFinite(Date.parse(s))?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(s))+' JST':'不明';
let data=null,layer=null,busy=false;
const fresh=()=>data&&Date.now()-Date.parse(data.retrievedAt)<=600000;
function description(p){return p.kind==='planned'?'工事予定のある区・市の参考位置（断水区域ではありません）':p.status==='restored'?'復旧の発表':Date.now()-Date.parse(p.checkedAt)>86400000?'最新の状態は要再確認':p.kind==='supply'?'給水の公式発表':'断水の公式発表'}
function draw(){
 layer?.remove();layer=null;$('water-map-badge').hidden=true;
 if(!fresh()||!$('show-water').checked||!window.map||typeof L==='undefined')return;
 const features=waterFeatures(data,window.bousaiLocations?.()||[],$('show-planned-water').checked);
 layer=L.geoJSON(features,{style:f=>({color:f.properties.status==='restored'?'#697780':f.properties.kind==='supply'?'#007e77':'#b73e36',weight:3,fillOpacity:.18}),pointToLayer:(f,latlng)=>L.marker(latlng,{title:f.properties.title,icon:L.divIcon({className:'water-report-marker '+(f.properties.kind==='planned'?'planned':f.properties.status==='restored'?'restored':f.properties.kind),html:`<span aria-hidden="true">${f.properties.kind==='planned'?'予':f.properties.kind==='supply'?'給':'水'}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}),onEachFeature(f,l){
  const p=f.properties;l.bindPopup(`<b>${esc(p.title)}</b><p>${esc(description(p))}</p>${p.kind==='planned'?p.notices.map(n=>`<p>${esc(n.area)}<br>${esc(n.timeText)}<br><a href="${esc(n.sourceURL)}" target="_blank" rel="noopener noreferrer">公式の断水区域・予定を確認 ↗</a></p>`).join(''):`<p>発表：${esc(date(p.issuedAt))}<br>確認：${esc(date(p.checkedAt))}</p><a href="${esc(p.sourceURL)}" target="_blank" rel="noopener noreferrer">公式発表を確認 ↗</a>`}`);
 }}).addTo(window.map);
 if(features.features.length){$('water-map-badge').hidden=false;$('water-map-badge').textContent=$('show-planned-water').checked?'水の情報を表示中。「予」は工事予定の区・市の参考位置です。':'水の情報：公式発表の対象位置・区域（発表・確認日時は詳細へ）'}
}
function detail(){
 const el=$('detail-water-status'),p=window.bousaiCurrentSelection?.();if(!el||!p)return;
 if(!fresh()){el.textContent='水の情報を確認できていません。地域の水道事業者の公式情報をご確認ください。';return}
 const notices=data.notices.filter(n=>n.referenceName===p.name||(p.name==='名古屋市'&&n.referenceName?.startsWith('名古屋市 ')));
 const covered=p.prefecture==='愛知'&&(p.name==='名古屋市'||p.name.startsWith('名古屋市 ')||['清須市','北名古屋市','大治町','あま市'].includes(p.name));
 el.textContent=covered?`先行連携：名古屋市上下水道局の本日から3日間の工事予定。登録された対象情報は${notices.length}件です。災害・事故の断水の有無は未判定です。`:'この地域の断水情報は自動連携していません。水道事業者の公式情報をご確認ください。';
}
function render(){
 const verified=verifiedWaterEvents(data.verifiedEvents),list=$('water-report-list'),sourceOK=data.sources?.some(s=>s.ok);
 $('water-summary').textContent=`水の情報：${date(data.retrievedAt)}取得${data.complete?'':' ／ 一部の情報を取得できませんでした'}`;
 $('water-coverage').textContent=`災害・事故の断水／給水：確認済み登録 ${data.verifiedEvents?verified.accepted.length+'件':'未確認'}（全国未網羅）。名古屋市上下水道局の工事予定：${sourceOK?data.notices.length+'件':'取得できず未確認'}。${verified.rejected.length?'確認条件を満たさない登録は表示していません。':''}`;
 list.innerHTML=verified.accepted.map((f,i)=>{const p=f.properties;return `<article class="water-card"><b>${esc(p.title)}</b><p>${esc(description(p))}<br>発表：${esc(date(p.issuedAt))} ／ 確認：${esc(date(p.checkedAt))}</p><button type="button" data-water-event="${i}">対象位置・区域を見る</button> <a href="${esc(p.sourceURL)}" target="_blank" rel="noopener noreferrer">公式発表 ↗</a></article>`}).join('');
 const plans=$('water-planned-list');plans.innerHTML=!sourceOK?'<p>工事予定情報を取得できませんでした。公式ページをご確認ください。</p>':data.notices.length?data.notices.map((n,i)=>`<article class="water-card"><span class="water-kind">工事予定</span><b>${esc(n.area)}</b><p>${esc(n.timeText)}</p>${n.referenceName?`<button type="button" data-water-notice="${i}">区・市の参考位置を見る</button>`:''} <a href="${esc(n.sourceURL)}" target="_blank" rel="noopener noreferrer">公式の断水区域・予定 ↗</a></article>`).join(''):'<p>取得した範囲に工事予定は掲載されていません。災害・事故による断水の有無を示すものではありません。</p>';
 document.querySelectorAll('[data-water-notice]').forEach(b=>b.onclick=()=>{
  const n=data.notices[Number(b.dataset.waterNotice)],points=(window.bousaiLocations?.()||[]).filter(p=>p.name===n.referenceName&&p.prefecture===n.referencePrefecture);if(points.length!==1||!window.map)return;
  $('show-water').checked=true;$('show-planned-water').checked=true;draw();window.map.stop();window.map.setView([points[0].lat,points[0].lng],12,{animate:false});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 document.querySelectorAll('[data-water-event]').forEach(b=>b.onclick=()=>{
  if(!window.map)return;const f=verified.accepted[Number(b.dataset.waterEvent)];$('show-water').checked=true;draw();const bounds=L.geoJSON(f).getBounds();if(bounds.isValid())window.map.fitBounds(bounds.pad(.1),{maxZoom:14});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 });draw();detail();
}
async function refresh(){
 if(busy)return;busy=true;$('refresh-water').disabled=true;$('water-summary').textContent='水の情報を確認しています…';
 try{const r=await fetch('/mieru-bosai/api/water',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const d=await r.json();if(!d.ok||!Array.isArray(d.notices)||!Number.isFinite(Date.parse(d.retrievedAt))||Date.now()-Date.parse(d.retrievedAt)>600000)throw Error();data=d;render()}
 catch{data=null;layer?.remove();layer=null;$('water-map-badge').hidden=true;$('water-summary').textContent='水の情報を取得できません。断水の有無は未確認です。';$('water-coverage').textContent='公式情報へのリンクからご確認ください。';$('water-report-list').replaceChildren();$('water-planned-list').textContent='取得できませんでした。';detail()}
 finally{busy=false;$('refresh-water').disabled=false}
}
$('show-water').onchange=draw;$('show-planned-water').onchange=draw;$('refresh-water').onclick=refresh;
document.addEventListener('bousai:map-ready',()=>{if(data)render()});document.addEventListener('bousai:selection',detail);
setInterval(()=>{if(!document.hidden)refresh()},300000);setInterval(()=>{if(data&&!fresh()){layer?.remove();layer=null;$('water-map-badge').hidden=true;$('water-summary').textContent='水の情報の取得から10分以上経過しています。最新の状況は未確認です。';detail()}},60000);
refresh();
