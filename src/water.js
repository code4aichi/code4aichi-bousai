const BASE='https://www.water.city.nagoya.jp/subsys/cutoff/';
const strip=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim();
export function nagoyaDates(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=k=>parts.find(x=>x.type===k).value;
 const start=Date.UTC(Number(get('year')),Number(get('month'))-1,Number(get('day')));
 return [0,1,2].map(i=>new Date(start+i*86400000).toISOString().slice(0,10).replaceAll('-','/'));
}
export function parseNagoya(html,date){
 if(typeof html!=='string'||html.length>1_000_000)throw Error('Invalid page');
 const selected=html.match(/<option\b[^>]*value="([^"]+)"[^>]*\bselected\b[^>]*>/gi)||[];
 if(!selected.some(s=>s.includes(`value="${date}"`)))throw Error('Wrong date');
 const block=html.match(/<h3>[^<]*断水・にごり水情報<\/h3>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1];if(!block)throw Error('Unknown structure');
 const notices=[];
 for(const [,body] of block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){
  if(strip(body)==='断水工事の予定はありません。')continue;
  const match=body.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<br\s*\/?>([\s\S]*)/i);if(!match)throw Error('Unknown record');
  const url=new URL(match[1].replace(/&amp;/g,'&'),BASE);
  if(url.origin!==new URL(BASE).origin||url.pathname!=='/subsys/cutoff/detail/'||url.searchParams.get('HIDUKE')!==date)throw Error('Invalid source link');
  const area=strip(match[2]),timeText=strip(match[3]);if(!area||!timeText)throw Error('Incomplete record');
  const ward=area.match(/^(千種|東|北|西|中村|中|昭和|瑞穂|熱田|中川|港|南|守山|緑|名東|天白)区/)?.[0];
  const other=['清須市','北名古屋市','大治町','あま市'].find(n=>area.startsWith(n)||area.startsWith('海部郡'+n));
  notices.push({id:url.href,kind:'planned',area,timeText,date:date.replaceAll('/','-'),sourceURL:url.href,sourceName:'名古屋市上下水道局',referenceName:ward?'名古屋市 '+ward:other||null,referencePrefecture:'愛知'});
 }
 if(!notices.length&&!block.includes('断水工事の予定はありません。'))throw Error('Unrecognized empty page');return notices;
}
export async function waterData(request,env){
 const dates=nagoyaDates(),sources=await Promise.all(dates.map(async date=>{const url=BASE+'?HIDUKE='+encodeURIComponent(date);try{
  const r=await fetch(url,{signal:AbortSignal.timeout(8000),cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)throw Error();return {ok:true,date,url,notices:parseNagoya(await r.text(),date)};
 }catch{return {ok:false,date,url,notices:[]}}}));
 let verifiedEvents=null;
 try{const url=new URL('/water-events.geojson',request.url);const r=await env.ASSETS.fetch(new Request(url));if(!r.ok)throw Error();verifiedEvents=await r.json();if(verifiedEvents.type!=='FeatureCollection'||!Array.isArray(verifiedEvents.features))throw Error()}catch{verifiedEvents=null}
 return {ok:true,retrievedAt:new Date().toISOString(),sources:sources.map(({ok,date,url})=>({ok,date,url})),complete:sources.every(s=>s.ok)&&!!verifiedEvents,notices:sources.flatMap(s=>s.notices),verifiedEvents,coverage:'名古屋市上下水道局の本日から3日間の工事予定。災害・事故による断水の全国自動取得には未対応です。'};
}
