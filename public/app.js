'use strict';
// 全国防災マップ v2: 旧GoogleマイマップKMZに由来する自治体等の位置情報
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s　]/g,'');
let locations=[],map,group,selected=null,filtered=[],favorites,savedFocusId=null,linkRegistry=null,mapViewport=null; 
function renderSaved(){
 const list=$('saved-regions-list');
 const saved=favorites.all();
 list.innerHTML=saved.length?saved.map(p=>`<button type="button" class="saved-region" data-id="${esc(p.id)}"><span aria-hidden="true">★</span> ${esc(p.name)}<small>${esc(p.prefecture)}</small></button>`).join(''):'<span class="saved-empty">地域を選び、「この地域を保存」を押すと、ここからすぐに開けます。</span>';
 list.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>openSavedRegion(locations.find(p=>p.id===el.dataset.id)));
 if(selected){const saved=favorites.has(selected);$('save-region').textContent=saved?'★ 保存済み（解除）':'☆ この地域を保存';$('save-region').setAttribute('aria-pressed',String(saved));}
}
function openSavedRegion(p){
 if(!p)return;
 savedFocusId=p.id;
 $('location-search').value=p.name;
 $('pref-filter').value=p.prefecture;
 // Render the selected marker before moving the map; other search filters
 // must not hide a saved region from a different prefecture.
 showDetail(p);
 if(map){map.stop();map.invalidateSize({pan:false});map.setView([p.lat,p.lng],14,{animate:false});}
 document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
}
window.bousaiOpenSharedRegion=openSavedRegion;
function matches(p){if(savedFocusId)return p.id===savedFocusId;const q=norm($('location-search').value),pref=$('pref-filter').value;return (!pref||p.prefecture===pref)&&(!q||norm([p.name,p.prefecture,p.address].join(' ')).includes(q))}
function update(){filtered=locations.filter(matches);$('result-count').textContent=`${filtered.length.toLocaleString('ja-JP')}件`;
 const list=$('location-list');const max=100;list.innerHTML=filtered.length?filtered.slice(0,max).map(p=>`<button type="button" class="v2-place ${selected?.id===p.id?'selected':''}" data-id="${esc(p.id)}"><span class="v2-pin" data-alert-icon="${esc(p.id)}">${window.bousaiBadge?.(p)||'⌖'}</span><span><b>${esc(p.name)}</b><small>${esc(p.prefecture)}${p.address?' · '+esc(p.address):''}</small></span><span class="v2-chevron">›</span></button>`).join('')+ (filtered.length>max?`<p class="v2-more">${(filtered.length-max).toLocaleString('ja-JP')}件は検索・地図の拡大で絞り込めます</p>`:''):'<p class="v2-more">該当する地点がありません。</p>';
 list.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>{const p=locations.find(x=>x.id===el.dataset.id);select(p,true)});
 if(group){group.clearLayers();filtered.forEach(p=>{const severity=window.bousaiSeverity?.(p)||0;const marker=L.marker([p.lat,p.lng],{title:p.name,...(severity?{icon:L.divIcon({className:'bousai-marker-container',html:`<span class="bousai-marker level-${severity}" aria-label="警報表示">!</span>`,iconSize:[30,36],iconAnchor:[15,36]})}:{icon:L.divIcon({className:'municipality-marker',html:'<span aria-hidden="true">●</span>',iconSize:[22,22],iconAnchor:[11,11]})})});marker.bindTooltip(esc(p.name));marker.on('click',()=>select(p,false));group.addLayer(marker)})}
}
function select(p,zoom){if(!p)return;selected=p;if(map){map.flyTo([p.lat,p.lng],zoom?11:Math.max(map.getZoom(),9),{duration:.45})}showDetail(p)}
window.bousaiCurrentSelection=()=>selected;
window.bousaiLocations=()=>locations;
window.bousaiRerender=update;
window.bousaiShowDetail=showDetail;
function showDetail(p){selected=p;renderSaved();document.dispatchEvent(new Event('bousai:selection'));$('detail-title').textContent=p.name;$('detail-subtitle').textContent=p.prefecture;$('detail-address').textContent=p.address||'住所情報は登録されていません。';
 const names={official:'自治体サイト（登録リンク）',disaster:'災害・防災情報',water:'水道・断水情報',utility:'水道事業者',x:'登録X（旧Twitter）',disasterX:'防災関連X',facebook:'Facebook'};
 const resolved=linkRegistry?.resolveRegionLinks(p)||{links:p.links||{},checks:{}};
 const direct=$('detail-official-water');const waterCheck=resolved.checks.water;direct.hidden=!waterCheck;if(waterCheck){direct.href=waterCheck.url;direct.textContent=(waterCheck.label||'水道の公式ページ')+' ↗'}else{direct.removeAttribute('href');direct.textContent=''}
 const links=Object.entries(resolved.links).filter(([k,v])=>/^https?:\/\//i.test(v));
 const linkHTML=([key,url])=>{const check=resolved.checks[key],label=check?(check.label||(key==='official'?'自治体公式サイト':names[key])):names[key]||key;return `<div class="region-link-item"><a target="_blank" rel="noopener noreferrer" href="${esc(url)}">${esc(label)} <span>↗</span></a><small class="link-review-note">${check?`URL確認：${esc(check.checkedAt)} ／ 公式ページを確認`:'旧登録リンク／現在の公式性・有効性は未確認'}</small></div>`};
 const checked=Object.keys(resolved.checks).length;$('detail-link-audit').textContent=checked?`${checked}件のURLを公式ページで確認した情報へ更新しています。確認日はリンクごとに表示します。発表の内容や現在の断水の有無を確認した意味ではありません。残りは旧登録リンクです。`:'旧マイマップ由来の登録リンクです。現在の公式性・有効性は全件未検証です。リンク先の運営者・更新日をご確認ください。';
 const sections=[['防災・避難の登録リンク',['disaster']],['水道・断水・生活情報',['water','utility']],['自治体・その他の登録リンク',['official','x','disasterX','facebook']]];
 $('detail-links-v2').innerHTML=links.length?sections.map(([title,keys])=>{const items=links.filter(([k])=>keys.includes(k));return items.length?`<div class="link-category"><h3>${esc(title)}</h3>${items.map(linkHTML).join('')}</div>`:''}).join('')+links.filter(([k])=>!sections.some(([,keys])=>keys.includes(k))).map(linkHTML).join(''):'<p>登録された関連リンクはありません。</p>';
 $('detail-x').href='https://x.com/search?q='+encodeURIComponent(p.name+' (断水 OR 災害 OR 避難)')+'&f=live';
 window.bousaiXDetail?.(p);
 const dialog=$('detail-dialog');$('region-browser').hidden=true;if(!dialog.open)dialog.show();update();window.bousaiRefreshDetails?.();if(!savedFocusId&&matchMedia('(max-width: 800px)').matches)dialog.scrollIntoView({behavior:'smooth',block:'start'});
}
function focusData(){if(!map||!filtered.length)return;const bounds=L.latLngBounds(filtered.map(p=>[p.lat,p.lng]));map.fitBounds(bounds.pad(.08),{maxZoom:12,animate:true});}
function searchRegions(){
 savedFocusId=null;selected=null;
 const dialog=$('detail-dialog');if(dialog.open)dialog.close();
 $('region-browser').hidden=false;
 update();
 if($('location-search').value.trim()||$('pref-filter').value)focusData();
}
function resetNationalMap(){if(map&&mapViewport)mapViewport.fitNation(map)}
function setupWithoutMap(){
 $('region-detail-slot').append($('detail-dialog'));
 $('save-region').onclick=()=>{if(!selected)return;const name=selected.name;const wasSaved=favorites.has(selected);const ok=favorites.toggle(selected);renderSaved();$('saved-region-status').textContent=ok?`${name}の保存を${wasSaved?'解除しました':'完了しました'}。`:'地域を保存できませんでした。ブラウザの保存設定や空き容量を確認してください。';};
 renderSaved();if(!favorites.available())$('saved-region-status').textContent='保存した地域を読み込めませんでした。地域検索は引き続き利用できます。';
 $('location-search').addEventListener('input',searchRegions);$('pref-filter').addEventListener('change',searchRegions);$('clear-filters').onclick=()=>{savedFocusId=null;$('location-search').value='';$('pref-filter').value='';selected=null;$('detail-dialog').close();$('region-browser').hidden=false;update();if(map&&mapViewport)mapViewport.fitHome(map)};
 $('reset-map').onclick=()=>{resetNationalMap()};
 $('detail-close').onclick=()=>{$('detail-dialog').close();$('region-browser').hidden=false;document.querySelector('.v2-place.selected')?.focus()};$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog'))$('detail-dialog').close()});
 $('mobile-menu').onclick=()=>document.querySelector('.nav').classList.toggle('open');document.querySelectorAll('.nav a').forEach(a=>a.onclick=()=>document.querySelector('.nav').classList.remove('open'));
}
async function boot(){let r;try{r=await fetch('/mieru-bosai/locations.json');if(!r.ok)throw new Error(`HTTP ${r.status}`);locations=await r.json();if(!Array.isArray(locations))throw new Error('Invalid locations')}catch(e){$('map-canvas').textContent='地域データを読み込めませんでした。ページを再読み込みしてください。';return}
 try{linkRegistry=await import('/mieru-bosai/verified-links.mjs?v=5.11.1')}catch{linkRegistry=null}
 const prefs=[...new Set(locations.map(x=>x.prefecture))].sort((a,b)=>a.localeCompare(b,'ja'));for(const p of prefs){const option=document.createElement('option');option.value=p;option.textContent=p;$('pref-filter').append(option)}
 const {createFavorites}=await import('/mieru-bosai/favorites.mjs?v=4.2.0');
 let storage;try{storage=window.localStorage}catch{storage={getItem(){throw new Error('Storage unavailable')},setItem(){throw new Error('Storage unavailable')}}}
 favorites=createFavorites(storage,locations);
 window.bousaiSavedRegionMemo=()=>{const snapshot=createFavorites(storage,locations);return {available:snapshot.available(),regions:snapshot.all().map(p=>({name:p.name,prefecture:p.prefecture,checks:linkRegistry?.resolveRegionLinks(p).checks||{}}))}};
 setupWithoutMap();
 if(typeof L==='undefined'){$('map-canvas').innerHTML='<div class="map-loading">地図を読み込めませんでした。地域一覧・検索から公式情報を確認できます。</div>';update();window.bousaiMapReady=true;document.dispatchEvent(new Event('bousai:map-ready'));return}
 mapViewport=await import('/mieru-bosai/map-viewport.mjs?v=5.7.0');
 map=L.map('map-canvas',{zoomControl:false,minZoom:2,zoomSnap:.5,scrollWheelZoom:false}).setView([35.1,137],5);
 mapViewport.fitHome(map);
 mapViewport.observeMapSize(map,$('map-canvas'));
 L.control.zoom({position:'bottomright'}).addTo(map);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 window.bousaiMap=map;
 group=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:55,showCoverageOnHover:false}):L.layerGroup();group.addTo(map);
 update();window.bousaiMapReady=true;document.dispatchEvent(new Event('bousai:map-ready'));
}
boot();
