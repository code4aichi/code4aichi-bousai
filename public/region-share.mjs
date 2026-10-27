const SITE='https://code4aichi.org/mieru-bosai/';
export function regionShareURL(place){
 if(!place||typeof place.name!=='string'||typeof place.prefecture!=='string'||!place.name||!place.prefecture)return null;
 const url=new URL(SITE);url.searchParams.set('pref',place.prefecture);url.searchParams.set('region',place.name);return url.href;
}
export function findSharedRegion(url,places){
 let u;try{u=new URL(url)}catch{return {state:'invalid'}}
 const prefs=u.searchParams.getAll('pref'),names=u.searchParams.getAll('region');
 if(!prefs.length&&!names.length)return {state:'none'};
 if(prefs.length!==1||names.length!==1||!prefs[0]||!names[0]||prefs[0].length>40||names[0].length>100)return {state:'invalid'};
 const matches=places.filter(p=>p.prefecture===prefs[0]&&p.name===names[0]);
 return matches.length===1?{state:'found',place:matches[0]}:{state:'invalid'};
}
export function initRegionShare(doc=document,win=window){
 const button=doc.getElementById('share-region'),status=doc.getElementById('share-region-status'),manual=doc.getElementById('share-region-url'),notice=doc.getElementById('shared-region-notice');
 if(!button||!status||!manual||!notice)return;
 button.hidden=false;
 let opened=false,version=0;
 function clear(){version++;status.textContent='';manual.hidden=true;manual.value=''}
 doc.addEventListener('bousai:selection',clear);
 button.addEventListener('click',async()=>{
  const place=win.bousaiCurrentSelection?.(),url=regionShareURL(place);if(!url)return;
  const request=++version;manual.hidden=true;manual.value='';
  try{if(!win.navigator?.clipboard?.writeText)throw Error();await win.navigator.clipboard.writeText(url);if(request===version)status.textContent=`${place.name}の共有URLをコピーしました。`}
  catch{if(request!==version)return;manual.value=url;manual.hidden=false;manual.focus();manual.select();status.textContent='URLを選択しました。コピーして共有してください。'}
 });
 function openShared(){
  if(opened||!win.bousaiMapReady)return;opened=true;
  const result=findSharedRegion(win.location.href,win.bousaiLocations?.()||[]);
  if(result.state==='found')win.bousaiOpenSharedRegion?.(result.place);
  else if(result.state==='invalid'){notice.hidden=false;notice.textContent='共有された地域を特定できませんでした。自治体名を検索してください。'}
 }
 doc.addEventListener('bousai:map-ready',openShared);openShared();
}
if(typeof document!=='undefined')initRegionShare();
