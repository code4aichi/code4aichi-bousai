import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {buildRegionMatches,prefName} from '../public/region-match.mjs';
const area={ok:true,retrievedAt:'2026-10-23T12:00:00Z',offices:{'011000':{name:'宗谷地方'}},class10s:{a:{parent:'011000'}},class15s:{b:{parent:'a'}},class20s:{'0121400':{name:'稚内市',parent:'b'}}};
const p={id:'1',name:'稚内市',prefecture:'北海道'};
async function run(secondFails,officeFails=false,point=p,now=Date.parse('2026-10-23T12:05:00Z')){
 class Clock extends Date {static now(){return now}}
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',checked:true,classList:{add(){}},replaceChildren(){},append(){}});return elements.get(id)};
 const ctx=vm.createContext({matcher:{buildRegionMatches,prefName},Event,Intl,Date:Clock,Map,Promise,Number,String,Math,Array,setInterval(){},window:{bousaiLocations:()=>[point],bousaiCurrentSelection:()=>point,bousaiRerender(){}},document:{getElementById:element,dispatchEvent(){},addEventListener(){},createElement:()=>({})},fetch:async url=>{
  if(url.includes('/api/areas'))return Response.json(area);
  if(url.includes('batch=1')){if(secondFails)throw Error('network');return Response.json({ok:true,results:[],retrievedAt:'2026-10-23T12:00:01Z'});}
  return Response.json({ok:true,retrievedAt:'2026-10-23T12:00:00Z',results:[{office:'011000',prefecture:'北海道',ok:!officeFails,reportDatetime:'2026-10-23T12:00:00Z',items:[{name:'強風注意報',level:1,areas:['0121400'],statuses:['発表']}]}]});
 }});
 const code=fs.readFileSync(new URL('../public/alerts.js',import.meta.url),'utf8').replace("import('/mieru-bosai/region-match.mjs?v=4.3.0')",'Promise.resolve(globalThis.matcher)');
 await vm.runInContext(code,ctx);
 // init runs from the async import continuation; wait for its mocked fetches.
 for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 return elements;
}
test('Hokkaido detail receives its own office warnings even if other batch fails',async()=>{
 const e=await run(true);assert.match(e.get('detail-alerts').innerHTML,/強風注意報/);assert.match(e.get('detail-region-identity').textContent,/宗谷地方/);assert.match(e.get('alert-summary').textContent,/一部地域は未確認/);
});
test('failed office is unknown, never a no-warning message',async()=>{
 const e=await run(false,true);assert.match(e.get('detail-alerts').textContent,/未確認/);assert.doesNotMatch(e.get('detail-alerts').innerHTML,/含まれていません/);
});
test('unmatched place is not presented as an office network error',async()=>{
 const e=await run(false,false,{id:'x',name:'旧自治体',prefecture:'北海道'});assert.match(e.get('detail-alerts').textContent,/対応は未確認/);assert.match(e.get('detail-alerts').textContent,/未判定/);
});

test('stale or future weather information is reported as unknown',async()=>{
 for(const now of [Date.parse('2026-10-23T12:11:00Z'),Date.parse('2026-10-23T11:58:00Z')]){
  const e=await run(false,false,p,now);
  assert.match(e.get('detail-alerts').textContent,/未確認/);
  assert.match(e.get('alert-summary').textContent,/最新の状況は未確認/);
  assert.match(e.get('alert-impacted').textContent,/未確認/);
 }
});
