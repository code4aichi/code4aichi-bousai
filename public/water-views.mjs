export function initWaterViews(doc=document,win=window){
 const nav=doc.getElementById('water-view-nav');
 const views=[['water-tab-current','water-current-panel',null],['water-tab-facilities','water-facilities-panel','registered-facilities'],['water-tab-stock','water-stock-view','water-stock']].map(([tab,panel,detail])=>({tab:doc.getElementById(tab),panel:doc.getElementById(panel),detail:detail?doc.getElementById(detail):null}));
 if(!nav||views.some(v=>!v.tab||!v.panel))return;
 nav.setAttribute('role','tablist');
 let active=0;
 function select(index,{focus=false,updateURL=false}={}){
  active=index;
  views.forEach((v,i)=>{const selected=i===index;v.panel.hidden=!selected;v.tab.setAttribute('aria-selected',String(selected));v.tab.tabIndex=selected?0:-1;if(selected&&v.detail)v.detail.open=true});
  if(focus)views[index].tab.focus();
  if(updateURL){try{win.history.replaceState(win.history.state,'','#'+views[index].panel.id)}catch{}}
 }
 function fromHash(scroll=false){
  let target;try{target=doc.getElementById(decodeURIComponent(win.location.hash.slice(1)))}catch{return false}
  if(!target)return false;
  const index=views.findIndex(v=>v.panel===target||v.panel.contains(target));
  if(index<0)return false;
  select(index);
  const details=target.closest?.('details');if(details)details.open=true;
  if(scroll)target.scrollIntoView?.({block:'start'});
  return true;
 }
 views.forEach((v,i)=>{
  v.tab.setAttribute('role','tab');v.tab.setAttribute('aria-controls',v.panel.id);
  v.panel.setAttribute('role','tabpanel');v.panel.setAttribute('aria-labelledby',v.tab.id);v.panel.tabIndex=0;
  v.tab.addEventListener('click',e=>{e.preventDefault();select(i,{updateURL:true})});
  v.tab.addEventListener('keydown',e=>{
   let index;
   if(e.key===' ')index=i;
   else if(e.key==='ArrowRight')index=(active+1)%views.length;
   else if(e.key==='ArrowLeft')index=(active+views.length-1)%views.length;
   else if(e.key==='Home')index=0;
   else if(e.key==='End')index=views.length-1;
   else return;
   e.preventDefault();select(index,{focus:true,updateURL:true});
  });
 });
 select(0);fromHash(true);
 win.addEventListener('hashchange',()=>fromHash(true));
}
if(typeof document!=='undefined')initWaterViews();
