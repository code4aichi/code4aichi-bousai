export const EMERGENCY_SOURCES=[
 {id:'yokohama',name:'横浜市水道局',prefecture:'神奈川',municipality:'横浜市',url:'https://suidou-jyouhou.city.yokohama.lg.jp/dansui/toppatsu.html',scope:'100戸以上の突発断水を掲載。市内すべての断水を網羅するものではありません。'},
 {id:'sapporo',name:'札幌市水道局',prefecture:'北海道',municipality:'札幌市',url:'https://www.city.sapporo.jp/ncms/suido/dansui-dakusui/',scope:'公式ページの緊急的な断水・濁水欄を確認。工事予定欄とは区別します。'}
];
const clean=s=>String(s).replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
const text=s=>clean(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function parseEmergency(id,html){
 if(typeof html!=='string'||html.length>1_000_000)throw Error('Invalid source page');
 const source=EMERGENCY_SOURCES.find(s=>s.id===id);if(!source)throw Error('Invalid provider');
 if(id==='yokohama'){
  const main=html.match(/<main\b[^>]*\bid=["']ys-contents["'][^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if(!main||!text(main).includes('突発断水情報'))throw Error('Changed Yokohama structure');
  const visible=text(main);
  const unchanged=visible.replace(/^突発断水情報\s*/,'').replace('現在、突発断水情報はありません。','').replace(/（100戸以上の突発断水が発生した場合に情報を掲載します）/,'').trim();
  return visible.includes('現在、突発断水情報はありません。')&&!unchanged?{state:'no-listing',reports:[]}:{state:'review',reports:[]};
 }
 const block=html.match(/<div\b[^>]*\bclass=["'][^"']*\bkinkyu_cnt\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<!--#tmp_contents-->/i)?.[1];
 if(!block)throw Error('Changed Sapporo structure');
 const visible=clean(block);if(/\bhidden(?:\s|=|>)|display\s*:\s*none|visibility\s*:\s*hidden/i.test(visible))return {state:'review',reports:[]};if(!text(visible).includes('緊急的な断水・濁水の情報'))throw Error('Missing emergency heading');
 const residual=text(visible).replace(/^緊急的な断水・濁水の情報（[^）]*）\s*/,'').replace('緊急的な断水・濁水情報がございます場合には、随時こちらに情報を掲載いたします。','').replace('※現在、応急給水施設は設置しておりません。','').trim();
 if(!residual)return {state:'no-listing',reports:[]};
 if(/[●〇]|住所入力|名称入力/.test(text(visible)))return {state:'review',reports:[]};
 const headline=[...visible.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1])).find(t=>/発生しております|発生しています|解消しております|解消しています/.test(t));
 const areas=visible.match(/<h3\b[^>]*>\s*※?対象地域\s*<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
 if(!headline||!areas)return {state:'review',reports:[]};
 const areaNames=areas.split(/<br\s*\/?>/i).map(text).filter(Boolean);if(!areaNames.length)return {state:'review',reports:[]};
 const wards=['中央区','北区','東区','白石区','豊平区','南区','西区','厚別区','手稲区','清田区'];
 const referenceNames=[...new Set(areaNames.map(a=>wards.find(w=>a.replace(/^札幌市\s*/,'').startsWith(w))).filter(Boolean).map(w=>'札幌市 '+w))];
 return {state:'reports',reports:[{id:'sapporo-emergency',kind:'emergency-reference',headline:headline.split('。')[0]+'。',areaNames,referenceNames,referencePrefecture:'北海道',sourceURL:source.url,sourceName:source.name,announcement:/解消/.test(headline)?'restoration-text':'emergency-text',issuedAt:null}]};
}
export async function emergencyWaterSources(){
 return Promise.all(EMERGENCY_SOURCES.map(async source=>{try{
  const response=await fetch(source.url,{signal:AbortSignal.timeout(8000),cf:{cacheTtl:300,cacheEverything:true}});if(!response.ok)throw Error();const parsed=parseEmergency(source.id,await response.text());
  return {...source,ok:true,checkedAt:new Date().toISOString(),...parsed};
 }catch{return {...source,ok:false,state:'unavailable',checkedAt:new Date().toISOString(),reports:[]}}}));
}
