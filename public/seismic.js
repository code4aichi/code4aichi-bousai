'use strict';
(()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const when=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)+' JST':'不明'};
 const intensity=s=>({'5-':'5弱','5+':'5強','6-':'6弱','6+':'6強'}[s]||s||'不明');
 const official={earthquake:'https://www.jma.go.jp/bosai/map.html#contents=earthquake_map',tsunami:'https://www.jma.go.jp/bosai/map.html#contents=tsunami'};
 let reports=[],group=null,busy=false,lastSuccess=0,markers=new Map(),lastData=null;
 function mapEligible(r){return r.family==='earthquake'&&r.status==='通常'&&['発表','訂正'].includes(r.infoType)&&!r.cancelled&&r.coordinates&&Number.isFinite(r.coordinates.lat)&&Number.isFinite(r.coordinates.lng)}
 function draw(){
  if(!window.map||typeof L==='undefined')return;
  if(!group){group=L.layerGroup().addTo(window.map)}group.clearLayers();markers.clear();
  if(!$('show-earthquakes').checked||!lastSuccess||Date.now()-lastSuccess>120000)return;
  for(const r of reports.filter(mapEligible)){
   const marker=L.marker([r.coordinates.lat,r.coordinates.lng],{title:`地震の震源：${r.hypocenter||'名称不明'}`,icon:L.divIcon({className:'seismic-origin',html:'<span aria-hidden="true">◆</span>',iconSize:[28,28],iconAnchor:[14,14]})});
   marker.bindPopup(`<b>地震の震源：${esc(r.hypocenter||'名称不明')}</b><p>発生：${esc(when(r.originTime))}<br>最大震度：${esc(intensity(r.maxIntensity))}</p><p>震源の位置です。被害範囲は示しません。</p>`);group.addLayer(marker);markers.set(r.sourceURL,marker);
  }
 }
 function focus(r){
  if(!window.map||!mapEligible(r)||!lastSuccess||Date.now()-lastSuccess>120000)return;
  $('show-earthquakes').checked=true;draw();window.map.stop();window.map.invalidateSize({pan:false});window.map.setView([r.coordinates.lat,r.coordinates.lng],7,{animate:false});markers.get(r.sourceURL)?.openPopup();document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function publish(){window.bousaiSeismicData=lastData;document.dispatchEvent(new Event('bousai:seismic-data'));}
 function render(){
  for(const family of ['earthquake','tsunami']){
   const list=$(family+'-reports'),items=reports.filter(x=>x.family===family);
   list.innerHTML=items.length?items.map((r,index)=>`<article class="seismic-report"><div class="seismic-report-heading"><b>${esc(family==='earthquake'?(r.hypocenter||r.title):r.title)}</b><span class="seismic-label ${r.status!=='通常'?'exercise':''}">${esc(r.status||'状態不明')}・${esc(r.infoType||'種別不明')}</span></div><p class="seismic-time">発表：${esc(when(r.reportedAt))}<br>更新：${esc(when(r.updatedAt))}</p>${family==='earthquake'?`<p>発生：${esc(when(r.originTime))}<br>最大震度 <strong>${esc(intensity(r.maxIntensity))}</strong> ／ M${esc(r.magnitude&&Number.isFinite(Number(r.magnitude))?r.magnitude:'不明')}</p>`:''}${r.headline?`<p class="seismic-headline">${esc(r.headline)}</p>`:''}${r.areas?.length?`<details><summary>この発表の対象地域（${r.areas.length}区域）</summary><ul>${r.areas.map(a=>`<li>${esc(a.name)}：${esc(a.category||'種別不明')}${r.status==='通常'&&['発表','訂正'].includes(r.infoType)&&!r.cancelled?` <button class="coast-area-button" type="button" data-tsunami-report="${index}" data-tsunami-area="${esc(a.code)}" ${!window.map?'disabled':''}>沿岸を表示</button>`:''}</li>`).join('')}</ul></details>`:''}<div class="seismic-links">${family==='tsunami'&&r.status==='通常'&&['発表','訂正'].includes(r.infoType)&&!r.cancelled&&r.areas?.length?`<button type="button" data-tsunami-report="${index}" ${!window.map?'disabled':''}>この発表の対象沿岸を地図で見る</button>`:''}${mapEligible(r)?`<button type="button" data-family="${family}" data-report="${index}" ${!window.map?'disabled':''}>震源を地図で見る</button>`:''}<a href="${official[family]}" target="_blank" rel="noopener noreferrer">気象庁で最新情報を確認 ↗</a></div></article>`).join(''):`<p class="seismic-empty">取得した公開フィードの掲載範囲に、${family==='earthquake'?'震源・震度情報':'津波警報・注意報・予報'}はありません。${family==='tsunami'?'現在の津波警報の有無は、この表示だけでは判定できません。':''}</p>`;
  }
  document.querySelectorAll('[data-report]').forEach(el=>el.onclick=()=>focus(reports.filter(r=>r.family===el.dataset.family)[Number(el.dataset.report)]));draw();
 }
 async function refresh(){
  if(busy)return;busy=true;$('refresh-seismic').disabled=true;$('seismic-summary').textContent='地震・津波の発表履歴を取得しています…';
  try{
   const r=await fetch('/mieru-bosai/api/seismic',{cache:'no-store',signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error();const data=await r.json();
   if(!data.ok||!Array.isArray(data.reports)||!Number.isFinite(Date.parse(data.retrievedAt))||Date.now()-Date.parse(data.retrievedAt)>120000)throw Error();
   reports=data.reports;lastData=data;lastSuccess=Date.parse(data.retrievedAt);
   $('seismic-summary').textContent=`地震・津波の発表履歴：${when(data.retrievedAt)}取得${data.complete?'':' ／ 一部取得失敗・掲載漏れの可能性があります'}`;
   $('seismic-status').className='seismic-statusbar'+(data.complete?'':' partial');publish();render();
  }catch{
   reports=[];lastSuccess=0;lastData=null;publish();draw();$('seismic-status').className='seismic-statusbar failed';$('seismic-summary').textContent='地震・津波情報を取得できません。現在の状況は未確認です。気象庁の最新情報をご確認ください。';
   for(const family of ['earthquake','tsunami'])$(family+'-reports').innerHTML='<p class="seismic-empty">情報の取得に失敗しました。下の気象庁リンクで確認してください。</p>';
  }finally{busy=false;$('refresh-seismic').disabled=false;}
 }
 $('show-earthquakes').onchange=draw;$('refresh-seismic').onclick=refresh;
 document.addEventListener('bousai:map-ready',()=>{if(lastData)render()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},60000);
 setInterval(()=>{if(lastSuccess&&Date.now()-lastSuccess>120000){$('seismic-summary').textContent='地震・津波情報の取得から2分以上経過しています。掲載履歴は最新状態を保証しません。';$('seismic-status').className='seismic-statusbar partial';window.bousaiSeismicData=null;document.dispatchEvent(new Event('bousai:seismic-data'));draw()}},30000);
 refresh();
})();
