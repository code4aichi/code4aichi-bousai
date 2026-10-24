export function initMobileLayout(doc=document,win=window){
 const media=win.matchMedia('(max-width: 800px)'),ids=['mobile-region-list','mobile-seismic','mobile-site-info','mobile-facility-saves'],sections=ids.map(id=>doc.getElementById(id)).filter(Boolean),region=doc.getElementById('mobile-region-list'),browser=doc.getElementById('region-browser');
 function revealHash(){
  let target;try{target=doc.getElementById(decodeURIComponent(win.location.hash.slice(1)))}catch{return}
  if(!target)return;
  let changed=false;
  for(let el=target;el;el=el.parentElement)if(el.tagName==='DETAILS'&&!el.open){el.open=true;changed=true}
  if(changed)target.scrollIntoView?.({block:'start'});
 }
 function sync(){
  if(region&&browser)region.hidden=browser.hidden;
  const count=doc.getElementById('result-count'),label=doc.getElementById('mobile-region-count');if(count&&label)label.textContent=count.textContent;
  const status=doc.getElementById('seismic-status'),badge=doc.getElementById('mobile-seismic-health');
  if(status&&badge){const state=status.classList.contains('failed')?'failed':status.classList.contains('partial')?'partial':/確認しています|取得しています/.test(doc.getElementById('seismic-summary')?.textContent||'')?'loading':'ok';badge.dataset.state=state;badge.textContent=({failed:'取得失敗',partial:'要再確認',loading:'確認中',ok:'履歴を取得'})[state]}
 }
 function layout(){
  sections.forEach(el=>el.open=!media.matches);
  const providers=doc.getElementById('water-provider-details');if(providers)providers.open=!media.matches||['yokohama','sapporo'].includes(doc.getElementById('water-report-filter')?.value);
  revealHash();sync();
 }
 for(const id of ['location-search','pref-filter'])doc.getElementById(id)?.addEventListener(id==='location-search'?'input':'change',()=>{if(media.matches&&region)region.open=true});
 win.addEventListener('hashchange',revealHash);media.addEventListener('change',layout);
 const observer=new win.MutationObserver(sync);
 for(const id of ['region-browser','result-count','seismic-status','seismic-summary']){const el=doc.getElementById(id);if(el)observer.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class']})}
 layout();
}
if(typeof document!=='undefined')initMobileLayout();
