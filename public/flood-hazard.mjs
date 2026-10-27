export const FLOOD_TILE='https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png';
export const FLOOD_LEGEND='https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/img/shinsui_legend3.png';
export function initFloodHazard({doc=document,win=window,leaflet=globalThis.L}={}){
 const $=id=>doc.getElementById(id),toggle=$('show-flood-hazard'),radar=$('show-radar'),status=$('flood-hazard-status'),info=$('flood-hazard-map-info'),legend=$('flood-hazard-legend');
 if(!toggle||!radar||!status||!info||!legend)return;
 let layer=null,sequence=0,failed=false;
 function clear(){sequence++;layer?.remove();layer=null;info.hidden=true;legend.removeAttribute('src')}
 function show(){
  if(!toggle.checked)return;
  if(radar.checked){radar.checked=false;radar.dispatchEvent(new win.Event('change',{bubbles:true}))}
  if(!win.bousaiMap||!leaflet){status.textContent='地図を利用できないため浸水想定を表示できません。';status.dataset.fetchState='failed';info.hidden=false;return}
  clear();const id=sequence,map=win.bousaiMap;failed=false;
  if(!map.getPane('flood-hazard')){const pane=map.createPane('flood-hazard');pane.style.zIndex='250';pane.style.pointerEvents='none'}
  info.hidden=false;legend.src=FLOOD_LEGEND;status.textContent='浸水想定の画像を読み込み中です。';status.dataset.fetchState='loading';
  layer=leaflet.tileLayer(FLOOD_TILE,{pane:'flood-hazard',opacity:0.8,minZoom:2,maxNativeZoom:17,maxZoom:19,noWrap:true,attribution:'出典：<a href="https://disaportal.gsi.go.jp/hazardmapportal/hazardmap/copyright/opendata.html">ハザードマップポータルサイト</a>を加工'});
  layer.on('tileerror',()=>{if(id!==sequence||!toggle.checked)return;failed=true;status.textContent='画像の一部を取得できず、浸水想定は未確認です。公式地図をご確認ください。';status.dataset.fetchState='partial'});
  layer.on('load',()=>{if(id!==sequence||!toggle.checked)return;status.textContent=failed?'画像の一部を取得できず、浸水想定は未確認です。公式地図をご確認ください。':'画像を読み込みました。色がない場所も安全とは限りません。';status.dataset.fetchState=failed?'partial':'ok'});
  layer.addTo(map);
 }
 function off(){clear();status.textContent='洪水浸水想定は表示していません。';status.dataset.fetchState='off'}
 toggle.addEventListener('change',()=>toggle.checked?show():off());
 radar.addEventListener('change',()=>{if(radar.checked&&toggle.checked){toggle.checked=false;toggle.dispatchEvent(new win.Event('change',{bubbles:true}))}});
 doc.addEventListener('bousai:map-ready',()=>{if(toggle.checked)show()});
 if(toggle.checked)show();else off();
}
if(typeof document!=='undefined')initFloodHazard();
