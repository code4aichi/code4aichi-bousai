export const FACILITY_PROVIDERS={
 nagoya:{name:'名古屋市上下水道局',label:'名古屋市等',dataURL:'/mieru-bosai/nagoya-water-facilities.json?v=4.9.0',originalURL:'/mieru-bosai/nagoya-water-facilities.xlsx',url:'https://www.water.city.nagoya.jp/category/10200bousai/1527.html',license:'CC BY-ND 4.0',licenseURL:'https://creativecommons.org/licenses/by-nd/4.0/'},
 yokohama:{name:'横浜市水道局',label:'横浜市',dataURL:'/mieru-bosai/yokohama-water-facilities.json?v=4.9.0',originalURL:'/mieru-bosai/yokohama-water-facilities.csv',url:'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/torikumi/saigai/oukyu-kyusui.html',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/'}
};
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
  facilities.push({id:'nagoya:'+String(id),provider:'nagoya',providerName:FACILITY_PROVIDERS.nagoya.name,sourceURL:FACILITY_PROVIDERS.nagoya.url,name,kana,type,region,address,lat,lng,original:row,operatingStatus:'unknown'});
 }
 return facilities;
}
export function parseYokohamaFacilities(data){
 if(!Array.isArray(data?.rows)||JSON.stringify(data.columns)!==JSON.stringify(['No','Type','Name','Ward','Address','Capacity','Latitude','Longitude','Notes']))throw Error('Invalid Yokohama data');
 const seen=new Set();return data.rows.map(row=>{
  if(!Array.isArray(row)||row.length!==9||!row[0]||seen.has(row[0]))throw Error('Invalid Yokohama record');seen.add(row[0]);
  const [number,type,name,ward,address,capacity,latitude,longitude,notes]=row,lat=Number(latitude),lng=Number(longitude);
  if(!['配水池','配水槽','災害用地下給水タンク','緊急給水栓'].includes(type)||!name||!ward||String(latitude).trim()===''||String(longitude).trim()===''||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('Invalid Yokohama facility');
  return {id:'yokohama:'+number,provider:'yokohama',providerName:FACILITY_PROVIDERS.yokohama.name,sourceURL:FACILITY_PROVIDERS.yokohama.url,name,kana:'',type,region:'横浜市'+ward,address,lat,lng,notes,original:row,operatingStatus:'unknown'};
 });
}
export function parseProviderFacilities(provider,data){if(provider==='nagoya')return parseFacilities(data);if(provider==='yokohama')return parseYokohamaFacilities(data);throw Error('Unknown provider')}
export function distanceKm(a,b){const rad=x=>x*Math.PI/180;const lat=rad(b.lat-a.lat),lng=rad(b.lng-a.lng);const h=Math.sin(lat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(lng/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)))}
export function usablePosition(position,now=Date.now()){return !!(position&&Number.isFinite(position.lat)&&Number.isFinite(position.lng)&&Math.abs(position.lat)<=90&&Math.abs(position.lng)<=180&&Number.isFinite(position.capturedAt)&&now-position.capturedAt>=0&&now-position.capturedAt<=300000)}
export function filterFacilities(facilities,{query='',region='',type='',provider='',position=null}={}){
 const q=normal(query);
 const list=facilities.filter(f=>(!provider||f.provider===provider)&&(!region||f.region===region)&&(!type||f.type===type)&&(!q||normal([f.name,f.kana,f.region,f.address].join(' ')).includes(q))).map(f=>({...f,distanceKm:position?distanceKm(position,f):null}));
 if(position)list.sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id));return list;
}

// Exact municipality identity only; never infer water-service territory.
export function facilitySelection(selection){
 const name=normal(selection?.name),pref=normal(selection?.prefecture).replace(/県$/,'');
 if(pref==='愛知'){
  if(name==='名古屋市')return {provider:'nagoya',query:'名古屋市',region:''};
  if(/^名古屋市.+区$/.test(name))return {provider:'nagoya',query:'',region:name};
  if(['清須市','あま市'].includes(name))return {provider:'nagoya',query:'',region:name};
  if(['大治町','海部郡大治町'].includes(name))return {provider:'nagoya',query:'',region:'海部郡大治町'};
 }
 if(pref==='神奈川'){
  if(name==='横浜市')return {provider:'yokohama',query:'',region:''};
  if(/^横浜市.+区$/.test(name))return {provider:'yokohama',query:'',region:name};
 }
 return null;
}
