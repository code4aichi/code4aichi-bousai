export const RAIN_CODES=new Set(['03','10','33','43']);
export const FLOOD_CODES=new Set(['04','18','34','44']);
export function rainItems(items=[],filter='all'){
 return items.filter(i=>filter==='rain'?RAIN_CODES.has(i.code):filter==='flood'?FLOOD_CODES.has(i.code):RAIN_CODES.has(i.code)||FLOOD_CODES.has(i.code));
}
export function rainView(state,selectedId=null,now=Date.now()){
 const time=Date.parse(state?.retrievedAt),fresh=Number.isFinite(time)&&now-time<=600000&&now-time>=-60000;
 if(!state?.loaded||!state.areaOk||!fresh)return {state:'unknown',points:[],selected:null};
 const points=(state.points||[]).map(p=>({...p,items:rainItems(p.items)}));
 return {state:points.some(p=>!p.checked)?'partial':'ready',points:points.filter(p=>p.checked&&p.items.length),selected:points.find(p=>p.id===selectedId)||null};
}
