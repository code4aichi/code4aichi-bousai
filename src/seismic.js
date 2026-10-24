import {XMLParser,XMLValidator} from 'fast-xml-parser';
export const FEEDS=['https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml','https://www.data.jma.go.jp/developer/xml/feed/eqvol_l.xml'];
const parser=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,processEntities:false});
const arr=x=>x==null?[]:Array.isArray(x)?x:[x];
const text=x=>typeof x==='object'&&x!==null?String(x['#text']||''):String(x??'');
const date=x=>{const t=text(x);return Number.isFinite(Date.parse(t))?t:null};
function xml(input){if(typeof input!=='string'||input.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(input)||XMLValidator.validate(input)!==true)throw Error('Invalid XML');return parser.parse(input)}
export function reportURL(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.data.jma.go.jp'&&!u.search&&!u.hash&&/^\/developer\/xml\/data\/[\w-]+\.xml$/.test(u.pathname)?u.href:null}catch{return null}}
export function parseFeed(input){const f=xml(input).feed;if(!f||!date(f.updated))throw Error('Invalid Atom feed');return {updatedAt:date(f.updated),entries:arr(f.entry).flatMap(e=>{const url=reportURL(arr(e.link).find(x=>x['@_type']==='application/xml')?.['@_href']||text(e.id));const family=url?.includes('_VXSE53_')?'earthquake':url?.includes('_VTSE41_')?'tsunami':null;return family&&date(e.updated)?[{url,family,updatedAt:date(e.updated)}]:[]})}}
export function coordinate(value){const m=text(value).match(/^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)(?:[+-]\d+(?:\.\d+)?)?\/$/);if(!m)return null;const lat=Number(m[1]),lng=Number(m[2]);return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null}
export function parseReport(input,url,family){
 const r=xml(input).Report;if(!r?.Control||!r?.Head)throw Error('Invalid JMA report');
 const c=r.Control,h=r.Head,b=r.Body||{},updatedAt=date(c.DateTime),reportedAt=date(h.ReportDateTime);if(!updatedAt||!reportedAt)throw Error('Invalid report time');
 const infoType=text(h.InfoType),status=text(c.Status),eventId=text(h.EventID),cancelled=infoType==='取消';
 const eq=b.Earthquake||{},area=eq.Hypocenter?.Area||{},coords=coordinate(arr(area.Coordinate)[0]);
 const normal=status==='通常'&&['発表','訂正'].includes(infoType)&&!!eventId;
 return {family,eventId,title:text(h.Title)||text(c.Title),seriesTitle:text(c.Title),editorialOffice:text(c.EditorialOffice),reportedAt,updatedAt,status,infoType,cancelled,sourceURL:url,
 headline:text(h.Headline?.Text),originTime:date(eq.OriginTime),hypocenter:text(area.Name),magnitude:text(eq.Magnitude)||null,maxIntensity:text(b.Intensity?.Observation?.MaxInt)||null,coordinates:normal&&!cancelled?coords:null,
 // Categories belong to this historical bulletin, never a computed all-clear state.
 areas:arr(b.Tsunami?.Forecast?.Item).map(i=>({name:text(i.Area?.Name),code:text(i.Area?.Code),category:text(i.Category?.Kind?.Name),categoryCode:text(i.Category?.Kind?.Code)})).filter(x=>x.name),comment:text(b.Comments?.ForecastComment?.Text)||text(b.Text)};
}
export function latestReports(reports){const groups=new Map();for(const r of reports){const key=JSON.stringify([r.family,r.seriesTitle,r.editorialOffice,r.status,r.eventId||r.sourceURL]);if(!groups.has(key)||Date.parse(r.updatedAt)>Date.parse(groups.get(key).updatedAt))groups.set(key,r)}return [...groups.values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))}
async function read(url,ttl){const r=await fetch(url,{headers:{Accept:'application/xml'},signal:AbortSignal.timeout(8000),cf:{cacheTtl:ttl,cacheEverything:true}});if(!r.ok)throw Error('JMA unavailable');return r.text()}
export async function seismicData(){
 const feeds=await Promise.all(FEEDS.map(async(url,i)=>{try{return {ok:true,url,...parseFeed(await read(url,i?3600:60))}}catch{return {ok:false,url}}}));if(!feeds.some(x=>x.ok))throw Error('Feeds unavailable');
 const unique=[...new Map(feeds.flatMap(x=>x.entries||[]).map(e=>[e.url,e])).values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
 const selected=['earthquake','tsunami'].flatMap(f=>unique.filter(e=>e.family===f).slice(0,f==='earthquake'?8:4));
 const reports=[];let failures=0,next=0;async function run(){while(next<selected.length){const e=selected[next++];try{reports.push(parseReport(await read(e.url,86400),e.url,e.family))}catch{failures++}}}await Promise.all(Array.from({length:3},run));
 return {ok:true,source:'気象庁 防災情報XML',retrievedAt:new Date().toISOString(),complete:feeds.every(x=>x.ok)&&failures===0,sources:feeds.map(({url,ok,updatedAt})=>({url,ok,updatedAt:updatedAt||null})),failedReports:failures,coverage:'公開フィード掲載範囲の最新電文（地震8通・津波4通まで）。現在の警報状態を保証する一覧ではありません。',reports:latestReports(reports)};
}
