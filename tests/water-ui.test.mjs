import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {waterFeatures,verifiedWaterEvents,emergencyReferencePoints} from '../public/water-model.mjs';
async function run(data,places=[]){const fields=new Map();const element=id=>{if(!fields.has(id))fields.set(id,{checked:true,hidden:false,textContent:'',innerHTML:'',replaceChildren(){}});return fields.get(id)};
 const context=vm.createContext({waterFeatures,verifiedWaterEvents,emergencyReferencePoints,Date,Intl,String,Number,Array,AbortSignal,window:{bousaiLocations:()=>places},document:{hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener(){}},setInterval(){},fetch:async()=>Response.json(data)});
 vm.runInContext(fs.readFileSync(new URL('../public/water.mjs',import.meta.url),'utf8').replace(/^import .*\n/,''),context);for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));return fields;
}
test('failed provider pages are shown as unknown rather than no planned outages',async()=>{const fields=await run({ok:true,complete:false,retrievedAt:new Date().toISOString(),sources:[{ok:false}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});assert.match(fields.get('water-coverage').textContent,/取得できず未確認/);assert.match(fields.get('water-planned-list').innerHTML,/取得できませんでした/)});
test('successful empty provider results do not claim absence of disaster outages',async()=>{const fields=await run({ok:true,complete:true,retrievedAt:new Date().toISOString(),sources:[{ok:true}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]}});assert.match(fields.get('water-planned-list').innerHTML,/災害・事故による断水の有無を示すものではありません/);assert.match(fields.get('water-coverage').textContent,/全国未網羅/)});

test('an unrecognised emergency page change produces a visible original-source prompt',async()=>{const fields=await run({ok:true,complete:false,retrievedAt:new Date().toISOString(),sources:[{ok:true}],notices:[],verifiedEvents:{type:'FeatureCollection',features:[]},emergencyReports:[],emergencySources:[{name:'横浜市水道局',state:'review',ok:true,checkedAt:new Date().toISOString(),scope:'100戸以上',url:'https://suidou-jyouhou.city.yokohama.lg.jp/dansui/toppatsu.html'}]});assert.match(fields.get('emergency-water-reports').innerHTML,/原文の確認が必要/);assert.match(fields.get('emergency-water-sources').innerHTML,/100戸以上/)});
