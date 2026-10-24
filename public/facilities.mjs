import {buildFacilityMemo} from './facility-memo.mjs';
import {createFacilityFavorites,FACILITY_SAVED_KEY,facilityIdentity} from './facility-favorites.mjs';
import {FACILITY_PROVIDERS,parseProviderFacilities,filterFacilities,usablePosition,facilitySelection,inFacilityBounds} from './facility-model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let facilities=[],filtered=[],group=null,markers=new Map(),nearest=false,pending=false,pendingTimer=null,loaded=false,loadedSources=[],visibleCount=30,searchBounds=null,facilityDataPending=true;
let facilityStorage;try{facilityStorage=window.localStorage}catch{}
const savedFacilities=createFacilityFavorites(facilityStorage);
function renderSavedManager(){
 const entries=savedFacilities.entries(),current=new Map(facilities.map(f=>[facilityIdentity(f),f])),matched=entries.filter(f=>current.has(facilityIdentity(f))).length;
 $('facility-saved-manager-title').textContent=`保存した施設を管理（${entries.length}件）`;
 $('facility-saved-note').textContent=savedFacilities.available()?`保存${entries.length}件（今回読み込んだデータで照合できた施設：${matched}件）。このブラウザ内に保存します。ほかの検索条件も適用されます。`:'保存した施設を読み込めません。ブラウザの保存設定をご確認ください。施設検索は引き続き利用できます。';
 $('facility-saved-manager-list').innerHTML=entries.length?entries.map((entry,index)=>{
  const found=current.has(facilityIdentity(entry)),provider=FACILITY_PROVIDERS[entry.provider];
  const state=found?'今回の登録データと照合できました。開設・給水状況は未確認です。':facilityDataPending?'施設データを照合しています。':!loaded?'施設データを取得できず、現在の登録状況は未確認です。':'今回の登録データと照合できません。未取得・変更等の可能性があり、廃止を意味しません。';
  return `<article class="facility-saved-card"><b>${esc(entry.name)}</b><p>${esc(provider.name)} ／ ${esc(entry.address||'住所情報なし')}</p><p class="facility-note">${esc(state)}</p><a href="${esc(provider.url)}" target="_blank" rel="noopener noreferrer">提供元の公式案内 ↗</a> <button type="button" data-saved-remove="${index}">この施設の保存を解除</button></article>`;
 }).join(''):savedFacilities.available()?'<p class="facility-note">保存した施設はありません。一覧の「この施設を保存」から追加できます。</p>':'<p class="facility-note">保存一覧を読み込めません。保存内容は自動削除していません。</p>';
 $('facility-saved-manager-list').querySelectorAll('[data-saved-remove]').forEach(b=>b.onclick=()=>removeSavedFacility(entries[Number(b.dataset.savedRemove)]));
}
function removeSavedFacility(entry){
 if(!entry)return;
 const result=savedFacilities.remove(entry);render(true);draw();
 $('facility-saved-manager-status').textContent=result.ok?(result.removed?`${entry.name}の保存を解除しました。`:`${entry.name}は既に保存から外れています。`):'保存を解除できませんでした。保存内容は維持しています。ブラウザの保存設定をご確認ください。';
 $('facility-saved-manager-status').focus();
}
function downloadFacilityMemo(){
 const status=$('facility-action-status');
 if(!savedFacilities.reload()){renderSavedManager();status.textContent='保存した施設を読み込めません。ブラウザの保存設定をご確認ください。';return}
 renderSavedManager();const saved=savedFacilities.entries();if(!saved.length){status.textContent='先に一覧から給水施設を保存してください。';return}
 let url;
 try{
  const html=buildFacilityMemo(saved,facilities,{sources:Object.fromEntries(loadedSources.map(s=>[s.id,s.data.source||{}]))});
  url=window.URL.createObjectURL(new window.Blob([html],{type:'text/html;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='mieru-bosai-saved-facilities.html';link.click();
  status.textContent=`保存した施設${saved.length}件のメモのダウンロードを開始しました。ファイルを開くと通信なしで閲覧・印刷できます。`;
 }catch{status.textContent='メモを作成できませんでした。このブラウザのダウンロード設定をご確認ください。'}
 finally{if(url)setTimeout(()=>window.URL.revokeObjectURL(url),1000)}
}
function toggleSavedFacility(id){
 const f=facilities.find(x=>x.id===id);if(!f)return;
 const result=savedFacilities.toggle(f);
 render(true);draw();
 $('facility-action-status').textContent=result.ok?`${f.name}の保存を${result.saved?'完了':'解除'}しました。`:result.reason==='limit'?'保存できる施設は100件までです。不要な保存を解除してください。':'施設を保存できませんでした。ブラウザの保存設定や空き容量をご確認ください。';
 const button=[...$('facility-list').querySelectorAll('[data-facility-save]')].find(b=>b.dataset.facilitySave===id);
 if(button)button.focus();else $('facility-count').focus();
}
const position=()=>{const p=window.bousaiCurrentPosition?.();return usablePosition(p)?p:null};
const distance=n=>n==null?'':n<1?`約${Math.round(n*1000)}m`:`約${n.toFixed(1)}km`;
function draw(){
 group?.clearLayers();markers.clear();$('facility-map-badge').hidden=true;
 if(!loaded||!$('show-facilities').checked||!window.bousaiMap||typeof L==='undefined')return;
 if(!group){group=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({maxClusterRadius:45,showCoverageOnHover:false,iconCreateFunction:cluster=>L.divIcon({className:'facility-cluster',html:`<span>施 ${cluster.getChildCount()}</span>`,iconSize:[46,34]})}):L.layerGroup();group.addTo(window.bousaiMap)}
 for(const f of filtered){
  const marker=L.marker([f.lat,f.lng],{title:`登録給水施設：${f.name}（開設状況未確認）`,icon:L.divIcon({className:'registered-facility-marker',html:'<span aria-hidden="true">施</span>',iconSize:[28,28],iconAnchor:[14,14]})});
  marker.bindPopup(`<b>${esc(f.name)}</b><p>${esc(f.type)}<br>${esc(f.region)} ${esc(f.address)}</p><p><strong>登録施設／開設・給水状況は未確認</strong><br>現地や自治体の発表をご確認ください。</p>${f.notes?`<details><summary>公式データの備考</summary><p>${esc(f.notes)}</p></details>`:''}<a href="${esc(f.sourceURL)}" target="_blank" rel="noopener noreferrer">出典・利用方法を公式ページで確認 ↗</a>`);group.addLayer(marker);markers.set(f.id,marker);
 }
 if(filtered.length){$('facility-map-badge').hidden=false;$('facility-map-badge').textContent=`「施」は登録給水施設（${filtered.length}件）。開設・給水中を示す目印ではありません。`}
}
function focusFacility(id){
 const f=filtered.find(x=>x.id===id);if(!f||!window.bousaiMap)return;
 $('show-facilities').checked=true;draw();window.bousaiMap.stop();window.bousaiMap.invalidateSize({pan:false});window.bousaiMap.setView([f.lat,f.lng],16,{animate:false});
 const marker=markers.get(id);if(marker){if(typeof group.zoomToShowLayer==='function')group.zoomToShowLayer(marker,()=>marker.openPopup());else marker.openPopup()}
 document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function copyFacility(id){
 const f=filtered.find(x=>x.id===id);if(!f)return;
 const status=$('facility-action-status'),text=`${f.name}\n${f.address||f.region}`;
 try{if(!window.navigator?.clipboard?.writeText)throw Error();await window.navigator.clipboard.writeText(text);status.textContent=`${f.name}の施設名・住所をコピーしました。`}
 catch{status.textContent='コピーできませんでした。施設の住所を選択してコピーしてください。'}
}
function render(keepPage=false){
 if(keepPage!==true){visibleCount=30;$('facility-action-status').textContent=''}
 renderSavedManager();
 if(!loaded)return;
 const p=position();if(nearest&&!p){nearest=false;$('facility-distance-note').textContent='現在地の取得から時間が経ちました。距離順で探す場合は、現在地を再取得してください。'}
 filtered=filterFacilities(facilities,{query:$('facility-search').value,region:$('facility-region').value,type:$('facility-type').value,provider:$('facility-provider').value,position:nearest?p:null}).filter(f=>inFacilityBounds(f,searchBounds)&&(!$('facility-only-saved').checked||savedFacilities.has(f)));
 $('facility-bounds-clear').hidden=!searchBounds;
 $('facility-bounds-note').textContent=searchBounds?'地図範囲の条件：ボタンを押した時点の範囲で絞り込み中です。地図を移動した場合は、もう一度「この地図範囲で探す」を押してください。ほかの検索条件も適用されます。':'';
 $('facility-count').textContent=`${filtered.length}件 / 登録給水施設${facilities.length}件`;
 if(nearest&&p)$('facility-distance-note').textContent=`現在地からの直線距離順（対象データ内）。${p.accuracy!=null?`位置精度の目安：約${p.accuracy.toLocaleString()}m。`:''}${filtered[0]?.distanceKm>20?'現在地の周辺を網羅するデータではありません。':''}距離は目安で、給水可否や安全な経路を示しません。`;
 const openDetails=new Set(keepPage===true?[...$('facility-list').querySelectorAll('details[open][data-detail-id]')].map(el=>el.dataset.detailId):[]);
 const limit=visibleCount;
 $('facility-list').innerHTML=filtered.length?filtered.slice(0,limit).map(f=>`<article class="facility-card"><div><b>${esc(f.name)}</b><span class="facility-distance">${esc(distance(f.distanceKm))}</span></div><p>${esc(f.type)} ／ ${esc(f.region)} ${esc(f.address)}</p><small>${esc(f.providerName)} ／ 開設状況未確認</small> <button type="button" data-facility-id="${esc(f.id)}" ${!window.bousaiMap?'disabled':''}>地図で確認</button> <button type="button" data-facility-save="${esc(f.id)}" aria-pressed="${savedFacilities.has(f)}">${savedFacilities.has(f)?'★ 保存済み（解除）':'☆ この施設を保存'}</button><details class="facility-detail" data-detail-id="${esc(f.id)}" ${openDetails.has(f.id)?'open':''}><summary>施設の詳細・公式の利用案内</summary><p><strong>住所：</strong>${esc(f.address||'住所情報なし')}<br><strong>地域：</strong>${esc(f.region)}</p>${f.notes?`<p class="facility-original-notes"><strong>公式データの備考：</strong><br>${esc(f.notes)}</p>`:'<p>元データに施設別の備考はありません。利用方法は公式ページでご確認ください。</p>'}<p>登録位置の緯度・経度：${esc(f.lat)}, ${esc(f.lng)}</p><p><a href="${esc(f.sourceURL)}" target="_blank" rel="noopener noreferrer">${esc(f.providerName)}の利用案内を確認 ↗</a></p><p class="facility-note">提供元の共通案内ページです。施設の開設・給水状況は未確認です。</p><button type="button" data-facility-copy="${esc(f.id)}">施設名・住所をコピー</button></details></article>`).join('')+(filtered.length>limit?`<p class="facility-note">先頭${limit}件を表示しています。続きは「さらに表示」から確認できます。</p>`:''):'<p class="facility-note">検索条件に合う登録施設はありません。周辺に給水施設がないことを意味しません。</p>';
 $('facility-more').hidden=filtered.length<=limit;
 $('facility-more').textContent=`さらに${Math.min(30,Math.max(0,filtered.length-limit))}件表示（残り${Math.max(0,filtered.length-limit)}件）`;
 $('facility-count').textContent+=` ／ 一覧表示${Math.min(limit,filtered.length)}件`;
 $('facility-list').querySelectorAll('[data-facility-save]').forEach(b=>b.onclick=()=>toggleSavedFacility(b.dataset.facilitySave));
 $('facility-list').querySelectorAll('[data-facility-copy]').forEach(b=>b.onclick=()=>copyFacility(b.dataset.facilityCopy));
 $('facility-list').querySelectorAll('[data-facility-id]').forEach(b=>b.onclick=()=>focusFacility(b.dataset.facilityId));if(keepPage!==true)draw();
}
function useCurrent(){
 if(!loaded)return;
 searchBounds=null;render();
 if(position()){nearest=true;pending=false;clearTimeout(pendingTimer);render();return}
 pending=true;$('facility-distance-note').textContent='現在地を取得しています。ブラウザの位置情報の許可をご確認ください。';
 $('locate-me').click();clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{if(pending){pending=false;$('facility-distance-note').textContent='現在地を取得できませんでした。施設名や地域から検索できます。'}},15000);
}
function refreshFilters(){
 const subset=facilities.filter(f=>!$('facility-provider').value||f.provider===$('facility-provider').value);
 for(const [id,key,label] of [['facility-region','region','すべての地域'],['facility-type','type','すべての種類']]){
  const before=$(id).value,values=[...new Set(subset.map(f=>f[key]))];$(id).innerHTML=`<option value="">${label}</option>`;
  for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value;$(id).append(option)}$(id).value=values.includes(before)?before:'';
 }
}
function useSelectedRegion(){
 const selection=window.bousaiCurrentSelection?.(),target=facilitySelection(selection),note=$('facility-selection-note');
 if(!selection){note.textContent='先に地図や地域一覧から自治体を選択してください。';return}
 if(!loaded){note.textContent='登録給水施設データを取得できていません。取得状況と自治体の公式情報をご確認ください。';return}
 if(!target){note.textContent=`${selection.name}の給水施設データは未収録です。施設がないことを意味しません。地域の水道・断水情報から公式情報をご確認ください。`;return}
 if(!loadedSources.some(s=>s.id===target.provider)){note.textContent=`${selection.name}の提供元データを取得できていません。施設の所在・状況は未確認です。`;return}
 searchBounds=null;$('facility-provider').value=target.provider;refreshFilters();$('facility-region').value=target.region;
 $('facility-type').value='';$('facility-search').value=target.query;nearest=false;pending=false;clearTimeout(pendingTimer);
 $('facility-distance-note').textContent='選択した地域の登録施設です。開設・給水状況は未確認です。';
 note.textContent=`${selection.name}の条件を設定しました。`;render();
 if(!filtered.length)note.textContent=`${selection.name}に一致する登録施設は今回の収録データにありません。施設がないことを意味しません。`;
}
$('facility-save-memo').onclick=downloadFacilityMemo;
$('facility-only-saved').addEventListener('change',render);
window.addEventListener?.('storage',e=>{if(e.key===FACILITY_SAVED_KEY||e.key===null){savedFacilities.reload();render()}});
$('facility-use-selection').onclick=useSelectedRegion;
document.addEventListener('bousai:selection',()=>{const p=window.bousaiCurrentSelection?.();$('facility-selection-note').textContent=p?`選択中：${p.name}。「選択した地域から探す」で条件を切り替えられます。`:''});
$('facility-use-bounds').onclick=()=>{
 if(!loaded||!window.bousaiMap?.getBounds){$('facility-bounds-note').textContent='地図または登録施設データを利用できません。施設名や地域から検索してください。';return}
 const b=window.bousaiMap.getBounds(),bounds={south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()};
 if(!Object.values(bounds).every(Number.isFinite)||bounds.south>bounds.north||bounds.east<bounds.west){$('facility-bounds-note').textContent='地図範囲を取得できませんでした。地図を表示して再度お試しください。';return}
 searchBounds=bounds;render();
};
$('facility-bounds-clear').onclick=()=>{searchBounds=null;render()};
$('facility-more').onclick=()=>{visibleCount+=30;render(true);if($('facility-more').hidden)$('facility-count').focus()};
$('facility-provider').addEventListener('change',()=>{refreshFilters();render()});
$('show-facilities').onchange=draw;
for(const id of ['facility-search','facility-region','facility-type'])$(id).addEventListener(id==='facility-search'?'input':'change',render);
$('facility-use-current').onclick=useCurrent;
$('facility-clear').onclick=()=>{searchBounds=null;$('facility-only-saved').checked=false;$('facility-selection-note').textContent='';$('facility-search').value='';$('facility-provider').value='';refreshFilters();$('facility-region').value='';$('facility-type').value='';nearest=false;pending=false;clearTimeout(pendingTimer);$('facility-distance-note').textContent='現在地から探すと、登録データ内を直線距離順で並べます。';render()};
$('facility-show-results').onclick=()=>{if(!loaded||!filtered.length||!window.bousaiMap)return;$('show-facilities').checked=true;draw();window.bousaiMap.fitBounds(L.latLngBounds(filtered.map(f=>[f.lat,f.lng])).pad(.06),{maxZoom:14});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'})};
document.addEventListener('bousai:position',()=>{if(pending){pending=false;clearTimeout(pendingTimer);nearest=true}render()});
document.addEventListener('bousai:position-error',()=>{pending=false;clearTimeout(pendingTimer);$('facility-distance-note').textContent='現在地を取得できませんでした。施設名・地域で検索できます。'});
document.addEventListener('bousai:map-ready',()=>{if(loaded)render()});
setInterval(()=>{if(nearest&&!position())render()},30000);
renderSavedManager();
(async()=>{
 const summary=$('facility-summary');summary.dataset.fetchState='loading';
 try{
  const results=await Promise.all(Object.entries(FACILITY_PROVIDERS).map(async([id,provider])=>{
   try{const r=await fetch(provider.dataURL);if(!r.ok)throw Error();const data=await r.json(),rows=parseProviderFacilities(id,data);if(!rows.length)throw Error();return {id,provider,data,rows,ok:true}}
   catch{return {id,provider,ok:false}}
  }));
  facilityDataPending=false;loadedSources=results.filter(s=>s.ok);if(!loadedSources.length)throw Error();facilities=loadedSources.flatMap(s=>s.rows);loaded=true;
  $('facility-provider').innerHTML='<option value="">すべての提供元</option>';
  for(const result of results){const option=document.createElement('option');option.value=result.id;option.textContent=result.provider.label+(result.ok?`（${result.rows.length}件）`:'（取得できず未確認）');option.disabled=!result.ok;$('facility-provider').append(option)}
  refreshFilters();
  const missing=results.filter(s=>!s.ok).map(s=>s.provider.label);
  summary.textContent=`登録給水施設：${facilities.length.toLocaleString('ja-JP')}件を読み込みました${missing.length?` ／ 一部地域未取得：${missing.join('・')}`:''}。開設状況は未確認です。`;summary.dataset.fetchState=missing.length?'partial':'ok';
  $('facility-source').innerHTML=loadedSources.map(s=>{const p=s.provider,recorded=s.data.source?.retrievedAt?.slice(0,10)||'不明';return `<span class="facility-source-item"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}</a>：${s.rows.length}件 ／ <a href="${esc(p.licenseURL)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>。収録日：${esc(recorded)}。<a href="${p.originalURL}" download>収録原本</a></span>`}).join('')+'<span class="facility-source-item">名称・住所・数値等の元の各項目は変更せず保持。横浜市は公開CSVに含まれる施設が対象で、市のすべての給水施設を網羅するものではありません。</span>';
  render();
 }catch{facilityDataPending=false;loaded=false;renderSavedManager();group?.clearLayers();$('show-facilities').disabled=true;summary.textContent='登録給水施設データを取得できません。施設の所在・状況は未確認です。';summary.dataset.fetchState='failed';$('facility-list').textContent='公式ページからご確認ください。';$('facility-use-current').disabled=true;$('facility-show-results').disabled=true;}
})();
