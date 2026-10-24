// Codes checked against JMA's 2026-10-19 code management table.
export const COAST_KINDS={
 '52':{label:'大津波警報',color:'#8b198b',weight:7,dashArray:null},
 '53':{label:'大津波警報',color:'#8b198b',weight:7,dashArray:null},
 '51':{label:'津波警報',color:'#c92d28',weight:6,dashArray:null},
 '62':{label:'津波注意報',color:'#b07600',weight:5,dashArray:null},
 '71':{label:'津波予報（若干の海面変動）',color:'#2473b8',weight:4,dashArray:'8 5'},
 '72':{label:'津波予報（若干の海面変動）',color:'#2473b8',weight:4,dashArray:'8 5'},
 '73':{label:'津波予報（若干の海面変動）',color:'#2473b8',weight:4,dashArray:'8 5'},
 '50':{label:'警報解除（当該発表）',color:'#66717a',weight:4,dashArray:'3 6'},
 '60':{label:'注意報解除（当該発表）',color:'#66717a',weight:4,dashArray:'3 6'},
 '00':{label:'津波なし（当該発表）',color:'#66717a',weight:4,dashArray:'3 6'}
};
export function coastEligible(r){return !!(r&&r.family==='tsunami'&&r.status==='通常'&&['発表','訂正'].includes(r.infoType)&&!r.cancelled&&Array.isArray(r.areas)&&r.areas.length&&Number.isFinite(Date.parse(r.reportedAt)))}
export function validateCoasts(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw Error('Invalid coast data');
 const seen=new Set();
 for(const f of data.features){const code=String(f.properties?.code??''),g=f.geometry;
  if(!/^\d{3}$/.test(code)||seen.has(code)||!['LineString','MultiLineString'].includes(g?.type))throw Error('Invalid coast feature');
  const lines=g.type==='LineString'?[g.coordinates]:g.coordinates;
  if(!Array.isArray(lines)||!lines.length||lines.some(line=>!Array.isArray(line)||line.length<2||line.some(p=>!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)))throw Error('Invalid coast coordinate');
  seen.add(code);
 }
 return data;
}
export function buildCoastOverlay(report,coasts){
 validateCoasts(coasts);
 const result={type:'FeatureCollection',features:[],missingCodes:[],unknownKinds:[],conflictingCodes:[]};
 if(!coastEligible(report))return result;
 const geographic=new Map(coasts.features.map(f=>[String(f.properties.code),f]));
 const areas=new Map();
 for(const area of report.areas){const code=String(area.code??'');if(areas.has(code)&&areas.get(code)?.categoryCode!==area.categoryCode){areas.set(code,null);if(!result.conflictingCodes.includes(code))result.conflictingCodes.push(code)}else if(!areas.has(code))areas.set(code,area)}
 for(const [code,area] of areas){if(!area)continue;
  const kind=Object.hasOwn(COAST_KINDS,area.categoryCode)?COAST_KINDS[area.categoryCode]:null,feature=geographic.get(code);
  if(!kind){result.unknownKinds.push(code);continue}if(!feature){result.missingCodes.push(code);continue}
  result.features.push({type:'Feature',geometry:feature.geometry,properties:{code,name:area.name,category:area.category,categoryCode:area.categoryCode,...kind}});
 }
 return result;
}
