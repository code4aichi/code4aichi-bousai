import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {waterFeatures,verifiedWaterEvents,emergencyReferencePoints,waterReportView,waterReportSelection,isFreshWaterData} from '../public/water-model.mjs';
async function run(data,places=[]){const fields=new Map();const element=id=>{if(!fields.has(id))fields.set(id,{dataset:{},value:'',checked:true,hidden:false,textContent:'',innerHTML:'',replaceChildren(){}});return fields.get(id)};
 const events={};const context=vm.createContext({waterFeatures,verifiedWaterEvents,emergencyReferencePoints,waterReportView,waterReportSelection,isFreshWaterData,Date,Intl,String,Number,Array,AbortSignal,window:{bousaiLocations:()=>places,addEventListener:(e,fn)=>events['window:'+e]=fn},document:{hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener:(e,fn)=>events['document:'+e]=fn},setInterval(){},fetch:async()=>Response.json(data)});
 vm.runInContext(fs.readFileSync(new URL('../public/water.mjs',import.meta.url),'utf8').replace(/^import .*\n/,''),context);for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));fields.context=context;fields.events=events;return fields;
}
test('failed provider pages are shown as unknown rather than no planned outages',async()=>{const fields=await run({ok:true,complete:false,retrievedAt:new Date().toISOString(),sources:[{ok:false}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});assert.match(fields.get('water-coverage').textContent,/取得できず未確認/);assert.match(fields.get('water-planned-list').innerHTML,/取得できませんでした/)});
test('successful empty provider results do not claim absence of disaster outages',async()=>{const fields=await run({ok:true,complete:true,retrievedAt:new Date().toISOString(),sources:[{ok:true}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});assert.match(fields.get('water-planned-list').innerHTML,/災害・事故による断水の有無を示すものではありません/);assert.match(fields.get('water-coverage').textContent,/全国未網羅/)});

test('an unrecognised emergency page change produces a visible original-source prompt',async()=>{const fields=await run({ok:true,complete:false,retrievedAt:new Date().toISOString(),sources:[{ok:true}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]},emergencyReports:[],emergencySources:[{name:'横浜市水道局',state:'review',ok:true,checkedAt:new Date().toISOString(),scope:'100戸以上',url:'https://suidou-jyouhou.city.yokohama.lg.jp/dansui/toppatsu.html'}]});assert.match(fields.get('emergency-water-reports').innerHTML,/原文の確認が必要/);assert.match(fields.get('emergency-water-sources').innerHTML,/100戸以上/)});

test('announcement filter keeps failed source visible and hides unrelated sections',async()=>{const now=new Date().toISOString();const fields=await run({ok:true,complete:false,retrievedAt:now,sources:[{ok:true}],notices:[{area:'名古屋の工事',timeText:'予定'}],verifiedEvents:{type:'FeatureCollection',features:[]},emergencySources:[{id:'yokohama',name:'横浜市水道局',url:'https://example.lg.jp/y',state:'unavailable',ok:false,checkedAt:now},{id:'sapporo',name:'札幌市水道局',url:'https://example.lg.jp/s',state:'no-listing',ok:true,checkedAt:now}],emergencyReports:[]});fields.get('water-report-filter').value='yokohama';fields.get('water-report-filter').onchange();assert.equal(fields.get('water-planned-section').hidden,true);assert.equal(fields.get('water-registered-section').hidden,true);assert.match(fields.get('emergency-water-sources').innerHTML,/取得失敗/);assert.doesNotMatch(fields.get('emergency-water-sources').innerHTML,/札幌/);assert.match(fields.get('water-summary').textContent,/一部/);assert.match(fields.get('water-coverage').textContent,/1\/2ページ/);assert.equal(fields.get('water-provider-details').open,true)});
test('filtering stale announcement data never restores a successful freshness label',async()=>{const fields=await run({ok:true,complete:true,retrievedAt:new Date().toISOString(),sources:[],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});vm.runInContext('data.retrievedAt=new Date(Date.now()-660000).toISOString()',fields.context);fields.get('water-report-filter').value='registered';fields.get('water-report-filter').onchange();assert.match(fields.get('water-summary').textContent,/10分以上/);assert.match(fields.get('water-list-status').textContent,/最新の状況は未確認/)});

const completeData=()=>({ok:true,complete:true,retrievedAt:new Date().toISOString(),sources:[{ok:true}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});
test('persistent water status distinguishes complete and partial retrieval',async()=>{
 const full=await run(completeData());assert.equal(full.get('water-panel-health').dataset.state,'ok');assert.equal(full.get('water-summary').textContent,full.get('water-panel-summary').textContent);
 const partial=await run({...completeData(),complete:false});assert.equal(partial.get('water-panel-health').dataset.state,'partial');assert.match(partial.get('water-panel-summary').textContent,/原文の確認が必要/);
});
test('refresh failure keeps previous retrieval timestamp as historical, never current data',async()=>{
 const fields=await run(completeData());fields.context.fetch=async()=>{throw Error('offline')};await fields.get('refresh-water-panel').onclick();
 assert.equal(fields.get('water-panel-health').dataset.state,'failed');assert.match(fields.get('water-panel-summary').textContent,/取得できません/);assert.match(fields.get('water-panel-summary').textContent,/前回取得/);assert.equal(fields.get('refresh-water').disabled,false);assert.equal(fields.get('refresh-water-panel').disabled,false);
});
test('both refresh controls share one pending request and recover together',async()=>{
 const fields=await run(completeData());let finish,calls=0;fields.context.fetch=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const pending=fields.get('refresh-water-panel').onclick();assert.equal(fields.get('water-panel-health').dataset.state,'loading');assert.equal(fields.get('refresh-water').disabled,true);assert.equal(fields.get('refresh-water-panel').disabled,true);
 await fields.get('refresh-water').onclick();assert.equal(calls,1);finish(Response.json(completeData()));await pending;assert.equal(fields.get('water-panel-health').dataset.state,'ok');assert.equal(fields.get('refresh-water-panel').disabled,false);
});
test('returning to stale page or reconnecting retries once, but fresh page does not refetch',async()=>{
 const fields=await run(completeData());let calls=0;fields.context.fetch=async()=>{calls++;return Response.json(completeData())};
 fields.events['document:visibilitychange']();fields.events['window:online']();assert.equal(calls,0);
 vm.runInContext('data.retrievedAt=new Date(Date.now()-660000).toISOString()',fields.context);
 fields.events['document:visibilitychange']();fields.events['window:online']();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 assert.equal(calls,1);assert.equal(fields.get('water-panel-health').dataset.state,'ok');
});
test('freshness rejects invalid, old and far-future timestamps while allowing small clock skew',()=>{
 const now=Date.now(),d=offset=>({retrievedAt:new Date(now+offset).toISOString()});
 assert.equal(isFreshWaterData(null,now),false);assert.equal(isFreshWaterData(d(-600000),now),true);assert.equal(isFreshWaterData(d(-600001),now),false);assert.equal(isFreshWaterData(d(60000),now),true);assert.equal(isFreshWaterData(d(60001),now),false);
});
