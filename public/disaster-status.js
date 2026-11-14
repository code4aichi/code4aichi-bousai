'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const format=s=>{const t=Date.parse(s);return Number.isFinite(t)?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(t))+' JST':'不明'};
 function intensity(raw){
  const s=String(raw??'').trim().replace(/^震度/,''),v={'1':['1','low',1],'2':['2','low',2],'3':['3','three',3],'4':['4','four',4],'5-':['5弱','five',5],'5弱':['5弱','five',5],'5+':['5強','five',6],'5強':['5強','five',6],'6-':['6弱','six',7],'6弱':['6弱','six',7],'6+':['6強','six',8],'6強':['6強','six',8],'7':['7','six',9]}[s];
  return v?{label:v[0],kind:v[1],rank:v[2]}:{label:'不明',kind:'unknown',rank:0};
 }
 window.bousaiIntensityStyle=intensity;
 function latestSignificant(data,now=Date.now()){
  if(!data?.ok||!Array.isArray(data.reports))return null;
  const latest=new Map();
  for(const r of data.reports){
   if(r.family!=='earthquake'||r.status!=='通常'||!r.eventId)continue;
   const updated=Date.parse(r.updatedAt);if(!Number.isFinite(updated))continue;
   const prev=latest.get(r.eventId);if(!prev||updated>Date.parse(prev.updatedAt))latest.set(r.eventId,r);
  }
  return [...latest.values()].filter(r=>{
   const occurred=Date.parse(r.originTime);return !r.cancelled&&['発表','訂正'].includes(r.infoType)&&intensity(r.maxIntensity).rank>=5&&Number.isFinite(occurred)&&occurred<=now+60000&&now-occurred<=86400000;
  }).sort((a,b)=>Date.parse(b.originTime)-Date.parse(a.originTime))[0]||null;
 }
 let selected=null;
 function render(){
  const now=Date.now(),data=window.bousaiSeismicData,t=Date.parse(data?.retrievedAt),age=now-t;
  const seismicFresh=!!data?.ok&&Number.isFinite(t)&&age>=-60000&&age<=120000;
  const weather=window.bousaiRainState?.(),wt=Date.parse(weather?.retrievedAt),weatherFresh=weather?.loaded&&weather?.areaOk&&Number.isFinite(wt)&&now-wt>=-60000&&now-wt<=600000;
  const warning=weatherFresh&&Array.isArray(weather.points)&&weather.points.some(p=>p.checked&&Array.isArray(p.items)&&p.items.some(x=>Number(x.level)>=2));
  selected=seismicFresh?latestSignificant(data,now):null;
  const banner=$('major-earthquake');banner.hidden=!selected;
  if(selected){
   $('major-earthquake-title').textContent=`最大震度${intensity(selected.maxIntensity).label}の地震を観測`;
   $('major-earthquake-message').textContent=`発生：${format(selected.originTime)} ／ 震源：${selected.hypocenter||'未確認'} ／ 発表：${format(selected.reportedAt)} ／ 取得：${format(data.retrievedAt)}${data.complete?'':' ／ 一部取得できていません'}`;
   $('major-earthquake-map').hidden=!(selected.coordinates&&Number.isFinite(selected.coordinates.lat)&&Number.isFinite(selected.coordinates.lng));
  }
  let state,title,desc;
  if(selected){state='important';title='重要な地震情報があります';desc='全国の最大震度5弱以上の発表履歴を表示中。地域の状況は公式発表をご確認ください。'}
  else if(warning){state='attention';title='気象警報が発表されています';desc='取得できた全国の登録地点に警報があります。対象地域や詳細は公式情報をご確認ください。'}
  else if(!seismicFresh||!data.complete||!weatherFresh){state='unknown';title='一部の防災情報は未確認';desc='情報の取得状況や対象範囲をご確認ください。最新の状況は公式発表でご確認ください。'}
  else{state='normal';title='地震・気象情報を表示中';desc='取得した情報の範囲に限ります。地域の安全を保証するものではありません。'}
  $('disaster-status').dataset.state=state;$('disaster-status-title').textContent=title;$('disaster-status-description').textContent=desc;
 }
 $('major-earthquake-map').addEventListener('click',()=>{if(!selected?.coordinates||!window.bousaiMap)return;const p=selected.coordinates;$('show-earthquakes').checked=true;$('show-earthquakes').dispatchEvent(new Event('change'));window.bousaiMap.stop();window.bousaiMap.invalidateSize({pan:false});window.bousaiMap.setView([p.lat,p.lng],7,{animate:false});document.querySelector('.v2-map-shell')?.scrollIntoView({behavior:'smooth',block:'start'});});
 for(const event of ['bousai:seismic-data','bousai:rain-update','bousai:map-ready','visibilitychange'])document.addEventListener(event,render);
 setInterval(render,30000);render();
})();
