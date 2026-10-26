import {radarFresh,radarTileURL} from './radar-model.mjs?v=5.6.0';
export function initRadar({doc=document,win=window,leaflet=globalThis.L,fetcher=fetch,now=Date.now,timer=setInterval}={}){
 const $=id=>doc.getElementById(id),toggle=$('show-radar'),status=$('radar-status'),badge=$('radar-map-badge'),button=$('radar-refresh');
 let layer=null,frame=null,controller=null,sequence=0,busy=false,tileFailed=false;
 const clear=()=>{layer?.remove();layer=null;frame=null;badge.hidden=true};
 const say=(message,state)=>{status.textContent=message;status.dataset.fetchState=state;badge.textContent=message;badge.dataset.state=state;badge.hidden=!toggle.checked};
 function off(){sequence++;controller?.abort();busy=false;button.disabled=false;clear();say('雨雲表示はオフです。','off')}
 async function refresh(){
  if(!toggle.checked||busy)return;
  if(!win.bousaiMap||!leaflet){clear();say('地図を利用できないため雨雲は未確認です。','failed');return}
  busy=true;const id=++sequence;controller=new AbortController();button.disabled=true;say('雨雲の表示時刻を取得しています…','loading');
  try{
   const r=await fetcher('/mieru-bosai/api/radar',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();
   const d=await r.json();if(!d.ok||!radarFresh(d.frame,now()))throw Error();
   if(id!==sequence||!toggle.checked)return;
   clear();frame=d.frame;tileFailed=false;
   const map=win.bousaiMap;
   if(!map.getPane('rain-radar')){const pane=map.createPane('rain-radar');pane.style.zIndex='250';pane.style.pointerEvents='none'}
   const timestamp=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(frame.validAt))+' JST';
   const shown=()=>say(`雨雲（実況） ${timestamp} ／ ${tileFailed?'画像の一部取得失敗・未確認':'画像読込完了（透明部の状況は判定しません）'}`,tileFailed?'partial':'ok');
   const RadarLayer=leaflet.TileLayer.extend({_clampZoom(zoom){const z=leaflet.TileLayer.prototype._clampZoom.call(this,zoom);return z===undefined?z:Math.floor(z/2)*2}});
   layer=new RadarLayer(radarTileURL(frame),{pane:'rain-radar',opacity:.65,maxNativeZoom:10,maxZoom:19,minZoom:4,bounds:[[20,118],[48,150]],noWrap:true,updateWhenIdle:true,keepBuffer:1,attribution:'雨雲：<a href="https://www.jma.go.jp/bosai/nowc/">気象庁</a>（重ね合わせ）'});
   layer.on('tileerror',()=>{if(id!==sequence||!toggle.checked)return;tileFailed=true;shown()});
   layer.on('load',()=>{if(id===sequence&&toggle.checked)shown()});
   say(`雨雲（実況） ${timestamp} ／ 画像を読み込んでいます…`,'loading');layer.addTo(map);
  }catch{if(id===sequence&&toggle.checked){clear();say('雨雲を取得できません。表示を外しました。公式情報をご確認ください。','failed')}}
  finally{if(id===sequence){busy=false;button.disabled=false}}
 }
 toggle.addEventListener('change',()=>toggle.checked?refresh():off());button.onclick=refresh;
 doc.addEventListener('bousai:map-ready',()=>{if(toggle.checked)refresh()});
 timer(()=>{if(toggle.checked&&frame&&!radarFresh(frame,now())){sequence++;controller?.abort();busy=false;button.disabled=false;clear();say('雨雲の表示時刻が古いため表示を外しました。更新してください。','failed')}},30000);
 timer(()=>{if(toggle.checked&&!doc.hidden)refresh()},300000);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden&&toggle.checked)refresh()});
 win.addEventListener('online',()=>{if(toggle.checked)refresh()});toggle.checked=false;off();
 return {refresh};
}
if(typeof document!=='undefined')initRadar();
