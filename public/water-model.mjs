const official=s=>{try{const u=new URL(s);return u.protocol==='https:'&&(/\.(lg|go)\.jp$/.test(u.hostname)||u.hostname==='www.water.city.nagoya.jp')}catch{return false}};
function geometry(g){
 if(g?.type==='Point')return g.coordinates?.length>=2&&Number.isFinite(g.coordinates[0])&&Number.isFinite(g.coordinates[1])&&Math.abs(g.coordinates[0])<=180&&Math.abs(g.coordinates[1])<=90;
 const ring=r=>Array.isArray(r)&&r.length>=4&&r.every(p=>geometry({type:'Point',coordinates:p}))&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];
 if(g?.type==='Polygon')return Array.isArray(g.coordinates)&&g.coordinates.length&&g.coordinates.every(ring);
 if(g?.type==='MultiPolygon')return Array.isArray(g.coordinates)&&g.coordinates.length&&g.coordinates.every(p=>geometry({type:'Polygon',coordinates:p}));return false;
}
export function verifiedWaterEvents(collection){
 const accepted=[],rejected=[];
 for(const f of collection?.features||[]){const p=f.properties||{};
  if(f.type!=='Feature'||!geometry(f.geometry)||p.verificationStatus!=='confirmed'||!official(p.sourceURL)||!['outage','supply'].includes(p.kind)||!['reported','restored'].includes(p.status)||!p.title||!Number.isFinite(Date.parse(p.issuedAt))||!Number.isFinite(Date.parse(p.checkedAt))||!['official-point','official-area'].includes(p.locationPrecision)){rejected.push(p.id||'不明');continue}
  accepted.push(f);
 }
 return {accepted,rejected};
}
const regionName=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'');
export function emergencyReferencePoints(report,locations){
 const points=new Map();
 for(const name of report.referenceNames||[]){const matches=locations.filter(p=>p.prefecture===report.referencePrefecture&&regionName(p.name)===regionName(name));if(matches.length===1){const p=matches[0];points.set(p.id||p.prefecture+'|'+p.name,p)}}
 return [...points.values()];
}
export function waterFeatures(data,locations,planned=false){
 const verified=verifiedWaterEvents(data.verifiedEvents);const features=[...verified.accepted];
 for(const report of data.emergencyReports||[]){
  const refs=emergencyReferencePoints(report,locations);
  for(const p of refs)features.push({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{kind:'emergency-reference',title:p.name+'の緊急発表（参考位置）',locationPrecision:'municipal-reference',report}});
 }
 if(planned){const groups=new Map();for(const n of data.notices||[]){const matches=locations.filter(p=>p.name===n.referenceName&&p.prefecture===n.referencePrefecture);if(matches.length!==1)continue;const p=matches[0],key=p.id;let feature=groups.get(key);
  if(!feature){feature={type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{kind:'planned',title:p.name+'の工事予定',locationPrecision:'municipal-reference',notices:[]}};groups.set(key,feature)}feature.properties.notices.push(n);
 }features.push(...groups.values())}
 return {type:'FeatureCollection',features,rejected:verified.rejected};
}
export function waterReportSelection(place){
 const name=regionName(place?.name),pref=regionName(place?.prefecture).replace(/県$/,'');
 if(pref==='神奈川'&&(name==='横浜市'||/^横浜市.+区$/.test(name)))return 'yokohama';
 if(pref==='北海道'&&(name==='札幌市'||/^札幌市.+区$/.test(name)))return 'sapporo';
 if(pref==='愛知'&&(name==='名古屋市'||/^名古屋市.+区$/.test(name)||['清須市','北名古屋市','あま市','大治町','海部郡大治町'].includes(name)))return 'nagoya';
 return null;
}
export function waterReportView(data,key=''){
 const selected=['nagoya','yokohama','sapporo','registered'].includes(key)?key:'';
 const showEmergency=!selected||['yokohama','sapporo'].includes(selected),showPlans=!selected||selected==='nagoya',showRegistered=!selected||selected==='registered';
 const emergencySources=showEmergency?(data.emergencySources||[]).filter(s=>!selected||s.id===selected):[];
 const urls=new Set(emergencySources.map(s=>s.url));
 return {showEmergency,showPlans,showRegistered,emergencySources,emergencyReports:showEmergency?(data.emergencyReports||[]).filter(r=>!selected||urls.has(r.sourceURL)):[],notices:showPlans?data.notices:[],verifiedEvents:showRegistered?data.verifiedEvents:{type:'FeatureCollection',features:[]}};
}
