// A municipal reference point, not the user's current position, centers the map.
const LAYERS=new Set(['skhb01','skhb02','skhb03','skhb04','skhb05','skhb06','skhb07','skhb08','sih']);
export function evacuationMapURL(place,layer){
 const lat=place?.lat,lng=place?.lng;
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180||!LAYERS.has(layer))return null;
 return `https://maps.gsi.go.jp/#13/${lat.toFixed(6)}/${lng.toFixed(6)}/&base=std&ls=std%7C${layer}&disp=11&lcd=${layer}`;
}
export function initEvacuationLinks(doc=document,win=window){
 const select=doc.getElementById('evacuation-kind'),link=doc.getElementById('evacuation-map-link'),note=doc.getElementById('evacuation-region-note');
 if(!select||!link||!note)return;
 function sync(){
  const p=win.bousaiCurrentSelection?.(),url=evacuationMapURL(p,select.value);
  link.hidden=!url;if(url){link.href=url;note.textContent=`${p.prefecture} ${p.name}の登録位置を中心に公式地図を開きます。`;}
  else{link.removeAttribute('href');note.textContent=p?'この地域の登録位置を確認できません。':'地域を選ぶと公式地図へのリンクが表示されます。'}
 }
 select.addEventListener('change',sync);doc.addEventListener('bousai:selection',sync);sync();
}
if(typeof document!=='undefined')initEvacuationLinks();
