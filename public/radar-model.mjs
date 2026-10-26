export const RADAR_TIMES='https://www.jma.go.jp/bosai/jmatile/data/nowc/targetTimes_N1.json';
export function radarTime(s){
 if(typeof s!=='string'||!/^\d{14}$/.test(s))return null;
 const iso=`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`,t=Date.parse(iso);
 return Number.isFinite(t)&&new Date(t).toISOString().replace(/[-:TZ.]/g,'').slice(0,14)===s?iso:null;
}
export function radarFresh(frame,now=Date.now()){
 const t=Date.parse(frame?.validAt);return Number.isFinite(t)&&now-t<=15*60000&&now-t>=-60000&&frame.basetime===frame.validtime&&radarTime(frame.validtime)===frame.validAt;
}
export function selectRadarFrame(rows,now=Date.now()){
 if(!Array.isArray(rows))throw Error('Invalid radar time list');
 const frames=rows.filter(r=>r&&Array.isArray(r.elements)&&r.elements.includes('hrpns')).map(r=>({basetime:r.basetime,validtime:r.validtime,validAt:radarTime(r.validtime)})).filter(f=>radarTime(f.basetime)&&radarFresh(f,now)).sort((a,b)=>Date.parse(b.validAt)-Date.parse(a.validAt));
 if(!frames.length)throw Error('No fresh observed radar frame');return frames[0];
}
export function radarTileURL(frame){
 if(!radarTime(frame?.basetime)||!radarTime(frame?.validtime)||frame.basetime!==frame.validtime)throw Error('Invalid radar frame');
 return `https://www.jma.go.jp/bosai/jmatile/data/nowc/${frame.basetime}/none/${frame.validtime}/surf/hrpns/{z}/{x}/{y}.png`;
}
export function radarCandidates(now=Date.now()){
 const latest=Math.floor(now/300000)*300000;
 return [0,1,2].map(i=>{
  const validAt=new Date(latest-i*300000).toISOString(),stamp=validAt.replace(/[-:TZ.]/g,'').slice(0,14);
  return {basetime:stamp,validtime:stamp,validAt:radarTime(stamp)};
 }).filter(f=>radarFresh(f,now));
}
