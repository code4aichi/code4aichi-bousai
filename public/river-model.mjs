const norm=s=>String(s??'').normalize('NFKC').replace(/\s/g,'').toLowerCase();
export function selectRiverReports(reports,{query='',selectionOnly=false,areaCode=null,latestOnly=true}={}){
 const unknownArea=selectionOnly&&!/^\d{7}$/.test(String(areaCode||''));
 if(unknownArea)return {reports:[],unknownArea:true,missingMunicipalities:0};
 let list=[...reports];
 if(latestOnly){
  const key=r=>r.eventId?JSON.stringify([r.eventId,r.office,r.status]):r.sourceURL;
  const latest=new Map();
  for(const r of list){const t=Date.parse(r.updatedAt);latest.set(key(r),Math.max(latest.get(key(r))??-Infinity,t))}
  // Keep equally timed bulletins; do not infer an ordering for corrections.
  list=list.filter(r=>Date.parse(r.updatedAt)===latest.get(key(r)));
 }
 const missingMunicipalities=list.filter(r=>!r.municipalities?.length).length;
 if(selectionOnly)list=list.filter(r=>r.municipalities?.some(m=>m.code===areaCode));
 const q=norm(query);
 list=list.filter(r=>norm([r.title,...(r.regions||[]).map(a=>a.name),...(r.municipalities||[]).map(m=>m.prefecture+m.name)].join(' ')).includes(q));
 return {reports:list,unknownArea:false,missingMunicipalities};
}
