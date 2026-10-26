import {XMLParser,XMLValidator} from 'fast-xml-parser';
export const RIVER_FEEDS=['https://www.data.jma.go.jp/developer/xml/feed/extra.xml','https://www.data.jma.go.jp/developer/xml/feed/extra_l.xml'];
const parser=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,processEntities:false});
const arr=x=>x==null?[]:Array.isArray(x)?x:[x];
const text=x=>typeof x==='object'&&x!==null?String(x['#text']??''):String(x??'');
const date=x=>Number.isFinite(Date.parse(text(x)))?text(x):null;
function xml(s){if(typeof s!=='string'||s.length>4_000_000||/<!DOCTYPE|<!ENTITY/i.test(s)||XMLValidator.validate(s)!==true)throw Error('Invalid XML');return parser.parse(s)}
export function riverURL(s){try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='www.data.jma.go.jp'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/developer\/xml\/data\/[\w-]+\.xml$/.test(u.pathname)?u.href:null}catch{return null}}
export function parseRiverFeed(s){const f=xml(s).feed;if(!f||!date(f.updated))throw Error('Invalid feed');return {updatedAt:date(f.updated),entries:arr(f.entry).flatMap(e=>{
 const url=riverURL(arr(e.link).find(l=>l['@_type']==='application/xml')?.['@_href']||text(e.id));
 return text(e.title)==='指定河川洪水予報'&&url&&date(e.updated)?[{url,updatedAt:date(e.updated)}]:[];
})}}
export function parseRiverReport(s,url){
 const r=xml(s).Report,c=r?.Control,h=r?.Head;
 if(!riverURL(url)||text(c?.Title)!=='指定河川洪水予報'||text(h?.InfoKind)!=='指定河川洪水予報'||!date(c.DateTime)||!date(h.ReportDateTime)||!text(h.Title))throw Error('Invalid flood bulletin');
 const regions=arr(h.Headline?.Information).flatMap(info=>arr(info.Item).flatMap(i=>arr(i.Areas).flatMap(a=>arr(a.Area).map(v=>({name:text(v.Name),code:text(v.Code),type:text(a['@_codeType']),category:text(i.Kind?.Name)}))))).filter(a=>a.name);
 const cityMap=new Map();
 for(const warning of arr(r.Body?.Warning))for(const item of arr(warning.Item)){
  if(text(item.Kind?.Name)!=='浸水想定地区')continue;
  for(const area of arr(item.Areas).flatMap(a=>arr(a.Area))){
   const code=text(area.CityCode),name=text(area.City),prefecture=text(area.Prefecture);
   if(/^\d{7}$/.test(code)&&name&&prefecture)cityMap.set(code,{code,name,prefecture});
  }
 }
 const municipalities=[...cityMap.values()];
 const levels=[];
 for(const infos of arr(r.Body?.MeteorologicalInfos).filter(i=>i['@_type']==='水位・流量情報'))for(const series of arr(infos.TimeSeriesInfo)){
  const times=new Map(arr(series.TimeDefines?.TimeDefine).map(t=>[String(t['@_timeId']),t]));
  for(const item of arr(series.Item))for(const kind of arr(item.Kind))for(const property of arr(kind.Property))for(const part of arr(property.WaterLevelPart))for(const level of arr(part.WaterLevel)){
   const time=times.get(String(level['@_refID']));
   // Only the explicitly labelled observation; forecasts are not observations.
   if(text(time?.Name)!=='現況'||!date(time.DateTime)||level['@_type']!=='水位'||level['@_unit']!=='m'||level['@_condition']!=='正常'||!/^[-+]?\d+(\.\d+)?$/.test(text(level)))continue;
   levels.push({station:text(item.Station?.Name),location:text(item.Station?.Location),time:date(time.DateTime),value:text(level),unit:'m'});
  }
 }
 return {title:text(h.Title),reportedAt:date(h.ReportDateTime),updatedAt:date(c.DateTime),status:text(c.Status),infoType:text(h.InfoType),eventId:text(h.EventID),office:text(c.PublishingOffice),headline:text(h.Headline?.Text),sourceURL:riverURL(url),regions,municipalities,levels};
}
async function read(url,ttl,fetcher){const r=await fetcher(url,{redirect:'error',headers:{Accept:'application/xml'},signal:AbortSignal.timeout(8000),cf:{cacheTtl:ttl,cacheEverything:true}});if(!r.ok)throw Error('JMA unavailable');return r.text()}
export async function riverData(fetcher=fetch){
 const sources=await Promise.all(RIVER_FEEDS.map(async(url,i)=>{try{return {url,ok:true,...parseRiverFeed(await read(url,i?3600:60,fetcher))}}catch{return {url,ok:false}}}));
 if(!sources.some(s=>s.ok))throw Error('Feeds unavailable');
 const all=[...new Map(sources.flatMap(s=>s.entries||[]).map(e=>[e.url,e])).values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
 const entries=all.slice(0,12),reports=[];let next=0,failed=0;
 async function run(){while(next<entries.length){const e=entries[next++];try{reports.push(parseRiverReport(await read(e.url,86400,fetcher),e.url))}catch{failed++}}}
 await Promise.all(Array.from({length:3},run));
 return {ok:true,retrievedAt:new Date().toISOString(),complete:sources.every(s=>s.ok)&&failed===0,failedReports:failed,availableEntries:all.length,truncated:all.length>12,sources:sources.map(({url,ok,updatedAt})=>({url,ok,updatedAt:updatedAt||null})),reports:reports.sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))};
}
