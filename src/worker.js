import {riverData} from './river.js';
import {waterData} from './water.js';
import {seismicData} from './seismic.js';
import {JMA_OFFICES} from '../public/jma-offices.mjs';
// Code for AICHI 防災マップ: Cloudflare Workers API + static assets
const JMA='https://www.jma.go.jp/bosai/warning/data/r8/';
const AREA_SOURCE='https://www.jma.go.jp/bosai/common/const/area.json';
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=180'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const valid=code=>/^\d{6}$/.test(code);
// 2026-05-29以降の令和8年警報コード表。警戒レベルそのものではなく表示用の重大度。
const WARNINGS = {
  '32':['暴風雪特別警報',4],'33':['レベル5大雨特別警報',4],'34':['レベル5氾濫特別警報',4],
  '35':['暴風特別警報',4],'36':['大雪特別警報',4],'37':['波浪特別警報',4],
  '38':['レベル5高潮特別警報',4],'39':['レベル5土砂災害特別警報',4],
  '43':['レベル4大雨危険警報',3],'44':['レベル4氾濫危険警報',3],
  '48':['レベル4高潮危険警報',3],'49':['レベル4土砂災害危険警報',3],
  '02':['暴風雪警報',2],'03':['レベル3大雨警報',2],'04':['レベル3氾濫警報',2],
  '05':['暴風警報',2],'06':['大雪警報',2],'07':['波浪警報',2],
  '08':['レベル3高潮警報',2],'09':['レベル3土砂災害警報',2],
  '10':['レベル2大雨注意報',1],'12':['大雪注意報',1],'13':['風雪注意報',1],
  '14':['雷注意報',1],'15':['強風注意報',1],'16':['波浪注意報',1],
  '17':['融雪注意報',1],'18':['レベル2氾濫注意報',1],'19':['レベル2高潮注意報',1],
  '20':['濃霧注意報',1],'21':['乾燥注意報',1],'22':['なだれ注意報',1],
  '23':['低温注意報',1],'24':['霜注意報',1],'25':['着氷注意報',1],
  '26':['着雪注意報',1],'29':['レベル2土砂災害注意報',1]
};
const inactive=status=>/解除|発表警報・注意報はなし|解消|終了/.test(String(status||''));
function collect(value){
  const reports=Array.isArray(value)?value:[value];
  if(!reports.length || !reports.some(x=>x && x.warning))throw Error('Unexpected JMA format');
  const bucket=new Map();let latest=null;
  for(const report of reports){
    if(!report?.warning)continue;
    if(report.reportDatetime && (!latest||report.reportDatetime>latest))latest=report.reportDatetime;
    // class20は市町村相当の発表区域。重複回避のためclass10と重ねて集約しない。
    const areas=report.warning.class20Items?.length?report.warning.class20Items:
      report.warning.class15Items?.length?report.warning.class15Items:
      report.warning.class10Items||[];
    for(const area of areas){
      const areaCode=String(area.areaCode??'');
      for(const kind of area.kinds||[]){
        if(!kind.code || inactive(kind.status))continue;
        const code=String(kind.code).padStart(2,'0');
        const def=WARNINGS[code];
        // 未知コードを危険度不明のまま公開すると誤誘導になるので除外・記録。
        if(!def)continue;
        let item=bucket.get(code);
        if(!item){item={code,name:def[0],level:def[1],areas:[],statuses:[]};bucket.set(code,item)}
        if(areaCode && !item.areas.includes(areaCode))item.areas.push(areaCode);
        if(kind.status && !item.statuses.includes(kind.status))item.statuses.push(kind.status);
      }
    }
  }
  return {reportDatetime:latest,items:[...bucket.values()].sort((a,b)=>b.level-a.level||a.code.localeCompare(b.code))};
}
async function jmaOffice(code){const res=await fetch(JMA+code+'.json',{headers:{Accept:'application/json'},cf:{cacheTtl:180,cacheEverything:true}});if(!res.ok)throw Error(`JMA HTTP ${res.status}`);const d=await res.json();return collect(d)}
const PREFS=[['北海道','016000'],['青森県','020000'],['岩手県','030000'],['宮城県','040000'],['秋田県','050000'],['山形県','060000'],['福島県','070000'],['茨城県','080000'],['栃木県','090000'],['群馬県','100000'],['埼玉県','110000'],['千葉県','120000'],['東京都','130000'],['神奈川県','140000'],['新潟県','150000'],['富山県','160000'],['石川県','170000'],['福井県','180000'],['山梨県','190000'],['長野県','200000'],['岐阜県','210000'],['静岡県','220000'],['愛知県','230000'],['三重県','240000'],['滋賀県','250000'],['京都府','260000'],['大阪府','270000'],['兵庫県','280000'],['奈良県','290000'],['和歌山県','300000'],['鳥取県','310000'],['島根県','320000'],['岡山県','330000'],['広島県','340000'],['山口県','350000'],['徳島県','360000'],['香川県','370000'],['愛媛県','380000'],['高知県','390000'],['福岡県','400000'],['佐賀県','410000'],['長崎県','420000'],['熊本県','430000'],['大分県','440000'],['宮崎県','450000'],['鹿児島県','460100'],['沖縄県','471000']];
async function nationwide(offices=PREFS){const results=Array(offices.length);let next=0;async function worker(){while(next<offices.length){const idx=next++, [name,code]=offices[idx];try{let data=await jmaOffice(code);results[idx]={prefecture:name,office:code,ok:true,...data}}catch(e){results[idx]={prefecture:name,office:code,ok:false,error:'気象庁データを取得できませんでした'}}}}await Promise.all(Array.from({length:6},worker));return {ok:true,source:'気象庁 気象警報・注意報（令和8年体系）',retrievedAt:new Date().toISOString(),results,complete:results.every(x=>x.ok)};}
const application = {async fetch(request,env,ctx){const u=new URL(request.url);if(u.pathname==='/api/river'){try{return new Response(JSON.stringify(await riverData()),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60'}})}catch{return json({ok:false,error:'河川の発表履歴を取得できませんでした',retrievedAt:new Date().toISOString()},502)}}if(u.pathname==='/api/water'){try{return json(await waterData(request,env))}catch{return json({ok:false,error:'水の情報を取得できませんでした'},502)}}if(u.pathname==='/api/seismic'){try{return new Response(JSON.stringify(await seismicData()),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=30'}})}catch{return json({ok:false,error:'地震・津波情報を取得できませんでした',retrievedAt:new Date().toISOString()},502)}}if(u.pathname==='/api/areas'){try{const upstream=await fetch(AREA_SOURCE,{cf:{cacheTtl:86400,cacheEverything:true}});if(!upstream.ok)throw Error('Area HTTP '+upstream.status);const source=await upstream.json();if(!source.class20s||!source.class15s||!source.class10s)throw Error('Invalid area schema');return json({ok:true,source:'気象庁 地域コード表',sourceURL:AREA_SOURCE,retrievedAt:new Date().toISOString(),class20s:source.class20s,class15s:source.class15s,class10s:source.class10s,offices:source.offices})}catch(e){return json({ok:false,error:'地域コード表を取得できませんでした'},502)}}if(u.pathname==='/api/alerts'){try{const office=u.searchParams.get('office');if(office){if(!valid(office)||!JMA_OFFICES.some(x=>x.code===office))return json({ok:false,error:'Invalid office'},400);const data=await jmaOffice(office);return json({ok:true,office,source:'気象庁',retrievedAt:new Date().toISOString(),...data})}const batch=u.searchParams.get('batch');if(batch!==null){if(!['0','1'].includes(batch))return json({ok:false,error:'Invalid batch'},400);const offices=JMA_OFFICES.slice(Number(batch)*29,(Number(batch)+1)*29).map(x=>[x.prefecture,x.code]);return json({...await nationwide(offices),batch:Number(batch),batchCount:2,totalOffices:JMA_OFFICES.length})}return json(await nationwide())}catch(e){return json({ok:false,error:'気象庁の警報情報を取得できません。',retrievedAt:new Date().toISOString()},502)}}return env.ASSETS.fetch(request)}};


// v4.1: mount only the portal under this prefix; keep the host site's paths isolated.
const BASE_PATH = '/mieru-bosai';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const legacyHost = url.hostname.endsWith('.workers.dev');
    if (url.pathname === BASE_PATH || (legacyHost && url.pathname === '/')) {
      url.pathname = BASE_PATH + '/';
      return Response.redirect(url.toString(), 308);
    }
    if (!url.pathname.startsWith(BASE_PATH + '/')) {
      return new Response('Not found', {status: 404});
    }
    const internalUrl = new URL(url);
    internalUrl.pathname = url.pathname.slice(BASE_PATH.length);
    const response = await application.fetch(new Request(internalUrl, request), env, ctx);
    // Asset canonicalization can emit root-relative redirects. Keep them in the portal.
    const location = response.headers.get('Location');
    if (location) {
      const target = new URL(location, internalUrl);
      if (target.origin === url.origin && !target.pathname.startsWith(BASE_PATH + '/') && target.pathname !== BASE_PATH) {
        target.pathname = BASE_PATH + target.pathname;
        const headers = new Headers(response.headers);
        headers.set('Location', target.toString());
        return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
      }
    }
    return response;
  }
};
