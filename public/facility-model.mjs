export const SUPPLY_TYPES=['常設給水栓','仮設給水栓','地下式給水栓'];
const normal=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
export function parseFacilities(data){
 if(!Array.isArray(data?.rows)||JSON.stringify(data.columns)!==JSON.stringify(['ID','施設名','施設名フリガナ','施設種別','区・町名','住所','緯度','経度']))throw Error('Invalid facility data');
 const seen=new Set(),facilities=[];
 for(const row of data.rows){
  if(!Array.isArray(row)||row.length!==8||seen.has(String(row[0])))throw Error('Invalid facility record');seen.add(String(row[0]));
  if(!SUPPLY_TYPES.includes(row[3]))continue;
  const [id,name,kana,type,region,address,lat,lng]=row;
  if(!name||!region||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('Invalid facility position');
  facilities.push({id:String(id),name,kana,type,region,address,lat,lng,original:row,operatingStatus:'unknown'});
 }
 return facilities;
}
export function distanceKm(a,b){const rad=x=>x*Math.PI/180;const lat=rad(b.lat-a.lat),lng=rad(b.lng-a.lng);const h=Math.sin(lat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(lng/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)))}
export function usablePosition(position,now=Date.now()){return !!(position&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)&&Math.abs(position.lat)<=90&&Math.abs(position.lng)<=180&&Number.isFinite(position.capturedAt)&&now-position.capturedAt>=0&&now-position.capturedAt<=300000)}
export function filterFacilities(facilities,{query='',region='',type='',position=null}={}){
 const q=normal(query);
 const list=facilities.filter(f=>(!region||f.region===region)&&(!type||f.type===type)&&(!q||normal([f.name,f.kana,f.region,f.address].join(' ')).includes(q))).map(f=>({...f,distanceKm:position?distanceKm(position,f):null}));
 if(position)list.sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id));return list;
}
