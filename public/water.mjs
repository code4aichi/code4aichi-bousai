import {waterFeatures,verifiedWaterEvents,emergencyReferencePoints,waterReportView,waterReportSelection,isFreshWaterData} from './water-model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>Number.isFinite(Date.parse(s))?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(s))+' JST':'不明';
let data=null,layer=null,busy=false,lastRetrievedAt=null;
const fresh=()=>isFreshWaterData(data);
function syncWaterStatus(){
 const state=busy?'loading':!data?'failed':!fresh()?'stale':data.complete?'ok':'partial';
 const last=lastRetrievedAt?` 前回取得：${date(lastRetrievedAt)}。`:'';
 const text=state==='loading'?`水の情報を確認しています…${last}`:state==='failed'?`水の情報を取得できません。断水の有無は未確認です。${last}`:state==='stale'?`水の情報の取得から10分以上経過しています。最新の状況は未確認です。${last}`:`水の情報：${date(data.retrievedAt)}取得${state==='partial'?' ／ 一部の情報を取得できないか、原文の確認が必要です':''}`;
 for(const id of ['water-summary','water-panel-summary']){$(id).textContent=text;$(id).dataset.fetchState=state==='stale'?'partial':state}
 const badge=$('water-panel-health');badge.dataset.state=state;badge.textContent=({loading:'更新中',failed:'取得失敗',stale:'要再確認',partial:'一部未確認',ok:'取得済み'})[state];
 for(const id of ['refresh-water','refresh-water-panel'])$(id).disabled=busy;
}

function description(p){return p.kind==='emergency-reference'?'緊急欄に発表がある区の参考位置（実際の断水区域ではありません）':p.kind==='planned'?'工事予定のある区・市の参考位置（断水区域ではありません）':p.status==='restored'?'復旧の発表':Date.now()-Date.parse(p.checkedAt)>86400000?'最新の状態は要再確認':p.kind==='supply'?'給水の公式発表':'断水の公式発表'}
function draw(){
 layer?.remove();layer=null;$('water-map-badge').hidden=true;
 if(!fresh()||!$('show-water').checked||!window.map||typeof L==='undefined')return;
 const features=waterFeatures(data,window.bousaiLocations?.()||[],$('show-planned-water').checked);
 layer=L.geoJSON(features,{style:f=>({color:f.properties.status==='restored'?'#697780':f.properties.kind==='supply'?'#007e77':'#b73e36',weight:3,fillOpacity:.18}),pointToLayer:(f,latlng)=>L.marker(latlng,{title:f.properties.title,icon:L.divIcon({className:'water-report-marker '+(f.properties.kind==='planned'?'planned':f.properties.status==='restored'?'restored':f.properties.kind),html:`<span aria-hidden="true">${f.properties.kind==='planned'?'予':f.properties.kind==='supply'?'給':f.properties.kind==='emergency-reference'?'報':'水'}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}),onEachFeature(f,l){
  const p=f.properties;l.bindPopup(`<b>${esc(p.title)}</b><p>${esc(description(p))}</p>${p.kind==='planned'?p.notices.map(n=>`<p>${esc(n.area)}<br>${esc(n.timeText)}<br><a href="${esc(n.sourceURL)}" target="_blank" rel="noopener noreferrer">公式の断水区域・予定を確認 ↗</a></p>`).join(''):p.kind==='emergency-reference'?`<p>${esc(p.report.headline)}</p><p>${esc(p.report.areaNames.join('、'))}</p><a href="${esc(p.report.sourceURL)}" target="_blank" rel="noopener noreferrer">対象区域・発表時刻を公式原文で確認 ↗</a>`:`<p>発表：${esc(date(p.issuedAt))}<br>確認：${esc(date(p.checkedAt))}</p><a href="${esc(p.sourceURL)}" target="_blank" rel="noopener noreferrer">公式発表を確認 ↗</a>`}`);
 }}).addTo(window.map);
 if(features.features.length){$('water-map-badge').hidden=false;$('water-map-badge').textContent=$('show-planned-water').checked?'水の情報を表示中。「予」は工事予定の区・市の参考位置です。':'水の情報：「報」は緊急欄の発表がある区の参考位置です。断水区域は公式原文で確認してください。'}
}
function detail(){
 const el=$('detail-water-status'),p=window.bousaiCurrentSelection?.();if(!el||!p)return;
 if(!fresh()){el.textContent='水の情報を確認できていません。地域の水道事業者の公式情報をご確認ください。';return}
 const provider=data.emergencySources?.find(s=>p.prefecture===s.prefecture&&p.name.replace(/\s+/g,'').startsWith(s.municipality));
 if(provider){const labels={'no-listing':'緊急欄の掲載を確認できませんでした（断水なしの意味ではありません）',reports:'緊急欄に発表があります。対象区域・発表時刻は原文で確認してください',review:'発表内容または掲載形式が変わったため、原文の確認が必要です',unavailable:'公式ページを取得できず、状況は未確認です'};el.textContent=`${provider.name}：${labels[provider.state]||'未確認'}。${provider.scope} 確認：${date(provider.checkedAt)}`;return;}
 const notices=data.notices.filter(n=>n.referenceName===p.name||(p.name==='名古屋市'&&n.referenceName?.startsWith('名古屋市 ')));
 const covered=p.prefecture==='愛知'&&(p.name==='名古屋市'||p.name.startsWith('名古屋市 ')||['清須市','北名古屋市','大治町','あま市'].includes(p.name));
 el.textContent=covered?`先行連携：名古屋市上下水道局の本日から3日間の工事予定。登録された対象情報は${notices.length}件です。災害・事故の断水の有無は未判定です。`:'この地域の断水情報は自動連携していません。水道事業者の公式情報をご確認ください。';
}
function render(){
 const allVerified=verifiedWaterEvents(data.verifiedEvents),view=waterReportView(data,$('water-report-filter').value),verified=verifiedWaterEvents(view.verifiedEvents),list=$('water-report-list'),sourceOK=data.sources?.some(s=>s.ok);
 $('water-emergency-section').hidden=!view.showEmergency;$('water-registered-section').hidden=!view.showRegistered;$('water-planned-section').hidden=!view.showPlans;
 if($('water-report-filter').value==='nagoya')$('water-planned-details').open=true;
 if(['yokohama','sapporo'].includes($('water-report-filter').value))$('water-provider-details').open=true;
 const counts=[view.showEmergency?`緊急欄の発表${view.emergencyReports.length}件`:null,view.showRegistered?`確認済み登録${data.verifiedEvents?verified.accepted.length+'件':'取得できず未確認'}`:null,view.showPlans?`工事予定${sourceOK?view.notices.length+'件':'取得できず未確認'}`:null].filter(Boolean);
 $('water-list-status').textContent=fresh()?`取得済みデータ内の表示件数：${counts.join('、')}。0件は断水がないことを意味しません。`:'取得から10分以上経過したデータです。最新の状況は未確認です。更新または公式原文でご確認ください。';
 syncWaterStatus();
 $('water-coverage').textContent=`災害・事故の断水／給水：確認済み登録 ${data.verifiedEvents?allVerified.accepted.length+'件':'未確認'}（全国未網羅）。名古屋市上下水道局の工事予定：${sourceOK?data.notices.length+'件':'取得できず未確認'}。${allVerified.rejected.length?'確認条件を満たさない登録は表示していません。':''}`;
 const providers=view.emergencySources,sourceList=$('emergency-water-sources'),emergencies=$('emergency-water-reports');
 if(sourceList){const stateLabels={'no-listing':'対象の掲載を確認できませんでした（断水なしを意味しません）',reports:'緊急欄に発表あり',review:'掲載内容・形式が変わり原文確認が必要',unavailable:'取得失敗・状況未確認'};
 sourceList.innerHTML=providers.map(s=>`<article class="water-card"><b>${esc(s.name)}</b><p>${esc(stateLabels[s.state]||'未確認')}<br>確認：${esc(date(s.checkedAt))}</p><p>${esc(s.scope)}</p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">緊急情報の公式ページ ↗</a></article>`).join('')||'<p>提供元の確認状況を取得できていません。公式情報をご確認ください。</p>';}
 const emergencyReports=view.emergencyReports;
 if(emergencies)emergencies.innerHTML=emergencyReports.map((r,i)=>`<article class="water-card"><span class="water-kind emergency">緊急欄の発表</span><b>${esc(r.sourceName)}</b><p>${esc(r.headline)}</p><p>対象：${esc(r.areaNames.join('、'))}</p><p>発表時刻は原文で確認してください。地図の目印は区の参考位置です。</p>${emergencyReferencePoints(r,window.bousaiLocations?.()||[]).length?`<button type="button" data-emergency-reference="${i}">区の参考位置を地図で確認</button>`:'<small>位置の対応は未確認です。</small>'} <a href="${esc(r.sourceURL)}" target="_blank" rel="noopener noreferrer">公式原文 ↗</a></article>`).join('');
 if(emergencies)emergencies.innerHTML+=providers.filter(s=>s.state==='review').map(s=>`<article class="water-card water-review"><b>${esc(s.name)}：原文の確認が必要です</b><p>掲載内容・形式の変更を確認したため、自動では発表内容を判定できません。</p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">緊急情報の原文を確認 ↗</a></article>`).join('');
 if(emergencies&&!emergencies.innerHTML)emergencies.innerHTML='<p>連携した緊急欄に表示できる発表はありません。断水の有無は、以下の公式ページの確認状況と原文をご確認ください。</p>';
 if(data.emergencySources?.length)$('water-coverage').textContent+=` 緊急情報の先行確認：${data.emergencySources.filter(p=>p.ok).length}/${data.emergencySources.length}ページ取得（横浜・札幌、掲載範囲限定）。`;
 document.querySelectorAll('[data-emergency-reference]').forEach(b=>b.onclick=()=>{
  const report=emergencyReports[Number(b.dataset.emergencyReference)],points=emergencyReferencePoints(report,window.bousaiLocations?.()||[]);if(!points.length||!window.map)return;
  $('show-water').checked=true;draw();window.map.stop();window.map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])).pad(.1),{maxZoom:12,animate:false});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 list.innerHTML=verified.accepted.map((f,i)=>{const p=f.properties;return `<article class="water-card"><b>${esc(p.title)}</b><p>${esc(description(p))}<br>発表：${esc(date(p.issuedAt))} ／ 確認：${esc(date(p.checkedAt))}</p><button type="button" data-water-event="${i}">対象位置・区域を見る</button> <a href="${esc(p.sourceURL)}" target="_blank" rel="noopener noreferrer">公式発表 ↗</a></article>`}).join('')||(data.verifiedEvents?'<p>表示条件を満たす確認済み登録はありません。全国の断水の有無は未確認です。</p>':'<p>確認済み登録データを取得できず、状況は未確認です。</p>');
 const plans=$('water-planned-list');plans.innerHTML=!sourceOK?'<p>工事予定情報を取得できませんでした。公式ページをご確認ください。</p>':view.notices.length?view.notices.map((n,i)=>`<article class="water-card"><span class="water-kind">工事予定</span><b>${esc(n.area)}</b><p>${esc(n.timeText)}</p>${n.referenceName?`<button type="button" data-water-notice="${i}">区・市の参考位置を見る</button>`:''} <a href="${esc(n.sourceURL)}" target="_blank" rel="noopener noreferrer">公式の断水区域・予定 ↗</a></article>`).join(''):'<p>取得した範囲に工事予定は掲載されていません。災害・事故による断水の有無を示すものではありません。</p>';
 document.querySelectorAll('[data-water-notice]').forEach(b=>b.onclick=()=>{
  const n=view.notices[Number(b.dataset.waterNotice)],points=(window.bousaiLocations?.()||[]).filter(p=>p.name===n.referenceName&&p.prefecture===n.referencePrefecture);if(points.length!==1||!window.map)return;
  $('show-water').checked=true;$('show-planned-water').checked=true;draw();window.map.stop();window.map.setView([points[0].lat,points[0].lng],12,{animate:false});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 document.querySelectorAll('[data-water-event]').forEach(b=>b.onclick=()=>{
  if(!window.map)return;const f=verified.accepted[Number(b.dataset.waterEvent)];$('show-water').checked=true;draw();const bounds=L.geoJSON(f).getBounds();if(bounds.isValid())window.map.fitBounds(bounds.pad(.1),{maxZoom:14});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 });draw();detail();
}
async function refresh(){
 if(busy)return;busy=true;syncWaterStatus();if(!fresh()){layer?.remove();layer=null;$('water-map-badge').hidden=true;}
 try{const r=await fetch('/mieru-bosai/api/water',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const d=await r.json();if(!d.ok||!Array.isArray(d.notices)||!isFreshWaterData(d))throw Error();data=d;lastRetrievedAt=d.retrievedAt;render()}
 catch{data=null;layer?.remove();layer=null;$('water-map-badge').hidden=true;$('water-coverage').textContent='公式情報へのリンクからご確認ください。';$('water-list-status').textContent='水の情報を取得できません。断水の有無は未確認です。';$('water-report-list').replaceChildren();$('water-planned-list').textContent='取得できませんでした。';$('emergency-water-sources')?.replaceChildren();$('emergency-water-reports')?.replaceChildren();detail()}
 finally{busy=false;syncWaterStatus()}
}
$('water-report-filter').onchange=()=>{if(data)render();else $('water-list-status').textContent='水の情報を取得できていません。更新または公式情報をご確認ください。';$('water-selection-status').textContent=''};
$('water-use-selection').onclick=()=>{const place=window.bousaiCurrentSelection?.(),key=waterReportSelection(place);if(!key){$('water-selection-status').textContent=place?`${place.name}に対応する先行連携はありません。地域の水道事業者の公式情報をご確認ください。`:'先に地図や地域一覧から自治体を選択してください。';return} $('water-report-filter').value=key;if(data)render();$('water-selection-status').textContent=data?`${place.name}に関連する連携元の情報を表示します。選択地域だけの被害判定ではありません。対象区域は公式原文でご確認ください。`:'連携元を設定しましたが、水の情報を取得できていません。更新または公式情報をご確認ください。';};
$('show-water').onchange=draw;$('show-planned-water').onchange=draw;$('refresh-water').onclick=refresh;$('refresh-water-panel').onclick=refresh;
document.addEventListener('bousai:map-ready',()=>{if(data)render()});document.addEventListener('bousai:selection',detail);
setInterval(()=>{if(!document.hidden)refresh()},300000);setInterval(()=>{if(data&&!fresh()){layer?.remove();layer=null;$('water-map-badge').hidden=true;syncWaterStatus();$('water-list-status').textContent='取得から10分以上経過したデータです。最新の状況は未確認です。';detail()}},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!fresh())refresh()});
window.addEventListener?.('online',()=>{if(!fresh())refresh()});
refresh();
