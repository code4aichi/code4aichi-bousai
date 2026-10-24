export const FACILITY_SAVED_KEY='mieru-bosai:facility-favorites:v1';
// Use public facility identity, not a row number that may be reassigned.
const identity=f=>JSON.stringify([f.provider,f.name,f.address||'',f.lat,f.lng]);
export function createFacilityFavorites(storage){
 let keys=new Set(),available=true;
 function reload(){
  try{
   const raw=JSON.parse(storage.getItem(FACILITY_SAVED_KEY)||'[]');
   if(!Array.isArray(raw)||raw.length>100||raw.some(k=>{
    if(typeof k!=='string')return true;
    try{const x=JSON.parse(k);return !Array.isArray(x)||x.length!==5||!['nagoya','yokohama'].includes(x[0])||typeof x[1]!=='string'||typeof x[2]!=='string'||!Number.isFinite(x[3])||!Number.isFinite(x[4])}catch{return true}
   }))throw Error('Invalid saved facilities');
   keys=new Set(raw);available=true;return true;
  }catch{available=false;return false}
 }
 reload();
 return {
  has:f=>keys.has(identity(f)),count:()=>keys.size,available:()=>available,reload,
  toggle(f){
   if(!reload())return {ok:false,reason:'storage'};
   const key=identity(f),next=new Set(keys),saved=!next.has(key);
   if(saved&&next.size>=100)return {ok:false,reason:'limit'};
   if(saved)next.add(key);else next.delete(key);
   try{storage.setItem(FACILITY_SAVED_KEY,JSON.stringify([...next]));keys=next;return {ok:true,saved}}
   catch{available=false;return {ok:false,reason:'storage'}}
  }
 };
}
