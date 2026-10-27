export function initRegionOverview(doc=document,win=window){
 for(const button of doc.querySelectorAll('[data-region-jump]'))button.addEventListener('click',()=>{
  if(!win.bousaiCurrentSelection?.())return;
  const kind=button.dataset.regionJump;
  if(kind==='rain'){
   const target=doc.getElementById('rain-overview');if(!target)return;
   target.open=true;target.scrollIntoView?.({block:'start'});return;
  }
  const target=doc.getElementById(kind==='water'?'water-current-panel':'registered-facilities');
  const tab=doc.getElementById(kind==='water'?'water-tab-current':'water-tab-facilities');
  const section=doc.getElementById('water-overview');
  if(!target||!tab||!section)return;
  section.open=true;tab.click();
  doc.getElementById(kind==='water'?'water-use-selection':'facility-use-selection')?.click();
  target.scrollIntoView?.({block:'start'});
 });
}
if(typeof document!=='undefined')initRegionOverview();
