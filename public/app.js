'use strict';
// 全国防災マップ v2: 旧GoogleマイマップKMZに由来する自治体等の位置情報
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s　]/g,'');
let locations=[],map,group,selected=null,filtered=[];
function matches(p){const q=norm($('location-search').value),pref=$('pref-filter').value;return (!pref||p.prefecture===pref)&&(!q||norm([p.name,p.prefecture,p.address].join(' ')).includes(q))}
function update(){filtered=locations.filter(matches);$('result-count').textContent=`${filtered.length.toLocaleString('ja-JP')}件`;
 const list=$('location-list');const max=100;list.innerHTML=filtered.length?filtered.slice(0,max).map(p=>`<button type="button" class="v2-place ${selected?.id===p.id?'selected':''}" data-id="${esc(p.id)}"><span class="v2-pin">⌖</span><span><b>${esc(p.name)}</b><small>${esc(p.prefecture)}${p.address?' · '+esc(p.address):''}</small></span><span class="v2-chevron">›</span></button>`).join('')+ (filtered.length>max?`<p class="v2-more">${(filtered.length-max).toLocaleString('ja-JP')}件は検索・地図の拡大で絞り込めます</p>`:''):'<p class="v2-more">該当する地点がありません。</p>';
 list.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>{const p=locations.find(x=>x.id===el.dataset.id);select(p,true)});
 if(group){group.clearLayers();filtered.forEach(p=>{const marker=L.marker([p.lat,p.lng],{title:p.name});marker.bindTooltip(esc(p.name));marker.on('click',()=>select(p,false));group.addLayer(marker)})}
}
function select(p,zoom){if(!p)return;selected=p;if(map){map.flyTo([p.lat,p.lng],zoom?11:Math.max(map.getZoom(),9),{duration:.45})}showDetail(p)}
function showDetail(p){$('detail-title').textContent=p.name;$('detail-subtitle').textContent=p.prefecture;$('detail-address').textContent=p.address||'住所情報は登録されていません。';
 const names={official:'自治体公式サイト',disaster:'災害・防災情報',water:'水道・断水情報',utility:'水道事業者',x:'公式X（旧Twitter）',disasterX:'防災関連X',facebook:'Facebook'};
 const links=Object.entries(p.links||{}).filter(([k,v])=>/^https?:\/\//i.test(v));$('detail-links-v2').innerHTML=links.length?links.map(([k,v])=>`<a target="_blank" rel="noopener noreferrer" href="${esc(v)}">${esc(names[k]||k)} <span>↗</span></a>`).join(''):'<p>登録された関連リンクはありません。</p>';
 $('detail-x').href='https://x.com/search?q='+encodeURIComponent(p.name+' (断水 OR 災害 OR 避難)')+'&f=live';
 const dialog=$('detail-dialog');if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','')}
}
function focusData(){if(!map||!filtered.length)return;const bounds=L.latLngBounds(filtered.map(p=>[p.lat,p.lng]));map.fitBounds(bounds.pad(.08),{maxZoom:12,animate:true});}
function goSearch(){const q=$('hero-search').value.trim();location.hash='map';$('location-search').value=q;update();if(q&&filtered.length===1)select(filtered[0],true);else if(q&&filtered.length<100)focusData();setTimeout(()=>map?.invalidateSize(),300)}
async function boot(){let r;try{r=await fetch('/locations.json');if(!r.ok)throw new Error(`HTTP ${r.status}`);locations=await r.json();if(!Array.isArray(locations))throw new Error('Invalid locations')}catch(e){$('map-canvas').textContent='地域データを読み込めませんでした。ページを再読み込みしてください。';return}
 const prefs=[...new Set(locations.map(x=>x.prefecture))].sort((a,b)=>a.localeCompare(b,'ja'));for(const p of prefs){const option=document.createElement('option');option.value=p;option.textContent=p;$('pref-filter').append(option)}
 if(typeof L==='undefined'){$('map-canvas').innerHTML='<div class="map-loading">地図ライブラリを読み込めませんでした。</div>';return}
 map=L.map('map-canvas',{zoomControl:false,minZoom:4,zoomSnap:.5,scrollWheelZoom:false}).setView([37.6,137.5],5);
 L.control.zoom({position:'bottomright'}).addTo(map);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 group=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({chunkedLoading:true,maxClusterRadius:55,showCoverageOnHover:false}):L.layerGroup();group.addTo(map);
 $('location-search').addEventListener('input',update);$('pref-filter').addEventListener('change',()=>{update();if($('pref-filter').value)focusData()});$('clear-filters').onclick=()=>{$('location-search').value='';$('pref-filter').value='';selected=null;update();map.setView([37.6,137.5],5)};
 $('reset-map').onclick=()=>{map.setView([37.6,137.5],5)};$('hero-search-btn').onclick=goSearch;$('hero-search').addEventListener('keydown',e=>{if(e.key==='Enter')goSearch()});
 $('detail-close').onclick=()=>$('detail-dialog').close();$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog'))$('detail-dialog').close()});
 $('mobile-menu').onclick=()=>document.querySelector('.nav').classList.toggle('open');document.querySelectorAll('.nav a').forEach(a=>a.onclick=()=>document.querySelector('.nav').classList.remove('open'));
 update();setTimeout(()=>map.invalidateSize(),150);window.addEventListener('hashchange',()=>setTimeout(()=>map.invalidateSize(),200));
}
boot();
