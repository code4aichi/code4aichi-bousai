'use strict';
(()=>{
 const button=document.getElementById('locate-me'),status=document.getElementById('location-status');let marker=null,accuracy=null,busy=false;
 const remove=()=>{marker?.remove();accuracy?.remove();marker=null;accuracy=null};
 function ready(){button.disabled=!window.map}
 button.onclick=()=>{
  if(busy||!window.map)return;
  if(!navigator.geolocation){status.textContent='このブラウザでは現在地を取得できません。地域名で検索してください。';return}
  busy=true;button.disabled=true;status.textContent='現在地を確認しています。ブラウザの位置情報の許可をご確認ください。';remove();
  navigator.geolocation.getCurrentPosition(position=>{
   busy=false;button.disabled=false;const {latitude:lat,longitude:lng,accuracy:radius}=position.coords;
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){status.textContent='現在地を確認できませんでした。地域名で検索してください。';return}
   const meters=Number.isFinite(radius)&&radius>=0?Math.round(radius):null;
   marker=L.marker([lat,lng],{title:'現在地',icon:L.divIcon({className:'current-location-marker',html:'<span aria-hidden="true"></span>',iconSize:[28,34],iconAnchor:[14,31]})}).addTo(window.map);
   marker.bindPopup(`現在地${meters!==null?`（位置精度の目安：約${meters.toLocaleString()}m）`:''}`);
   if(meters!==null)accuracy=L.circle([lat,lng],{radius:meters,color:'#1976d2',fillColor:'#1976d2',fillOpacity:.08,weight:1,interactive:false}).addTo(window.map);
   window.map.stop();window.map.setView([lat,lng],13,{animate:false});status.textContent=`青いピンが現在地です。${meters!==null?`位置精度の目安：約${meters.toLocaleString()}m。`:''}位置情報はこのサイトのサーバーへ送信・保存しません。`;
  },error=>{
   busy=false;button.disabled=false;const messages={1:'位置情報が許可されていません。ブラウザの設定で許可するか、地域名で検索してください。',2:'現在地を確認できませんでした。地域名で検索してください。',3:'現在地の取得がタイムアウトしました。もう一度お試しください。'};status.textContent=messages[error.code]||messages[2];
  },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
 };
 document.addEventListener('bousai:map-ready',ready);ready();
})();
