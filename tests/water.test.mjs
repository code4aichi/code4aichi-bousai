import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nagoyaDates,parseNagoya,waterData} from '../src/water.js';
import {verifiedWaterEvents,waterFeatures} from '../public/water-model.mjs';
const html=fs.readFileSync(new URL('./fixtures/water/nagoya-plans.html',import.meta.url),'utf8');
const places=JSON.parse(fs.readFileSync(new URL('../public/locations.json',import.meta.url)));
const event={type:'Feature',geometry:{type:'Point',coordinates:[136.9,35.1]},properties:{id:'verified-1',title:'検証用・公式発表に基づく断水',kind:'outage',status:'reported',sourceURL:'https://www.water.city.nagoya.jp/',verificationStatus:'confirmed',locationPrecision:'official-point',issuedAt:'2026-10-24T12:00:00+09:00',checkedAt:'2026-10-24T13:00:00+09:00'}};
test('provider dates use JST including a UTC date boundary',()=>{assert.deepEqual(nagoyaDates(new Date('2026-10-23T16:00:00Z')),['2026/10/24','2026/10/25','2026/10/26'])});
test('official Nagoya page yields planned notices, never disaster outages',()=>{
 const rows=parseNagoya(html,'2026/10/26');assert.equal(rows.length,4);assert.ok(rows.every(n=>n.kind==='planned'));assert.equal(rows[0].referenceName,'名古屋市 昭和区');assert.ok(rows.some(n=>n.referenceName==='清須市'));assert.match(rows[0].timeText,/10月27日/);
});
test('wrong-date cache, changed page structure and source redirects are rejected',()=>{
 assert.throws(()=>parseNagoya(html,'2026/10/25'));assert.throws(()=>parseNagoya(html.replace('<h3>','<div>'),'2026/10/26'));assert.throws(()=>parseNagoya(html.replace('./detail/','https://attacker.invalid/'),'2026/10/26'));
});
test('curated map reports require confirmed official source, date and valid geometry',()=>{
 assert.equal(verifiedWaterEvents({features:[event]}).accepted.length,1);
 for(const change of [{verificationStatus:'unconfirmed'},{sourceURL:'https://attacker.invalid/'},{checkedAt:'?'},{locationPrecision:'guessed'}])assert.equal(verifiedWaterEvents({features:[{...event,properties:{...event.properties,...change}}]}).accepted.length,0);
 assert.equal(verifiedWaterEvents({features:[{...event,geometry:{type:'Point',coordinates:[999,100]}}]}).accepted.length,0);
});
test('planned notices are opt-in and marked as municipal reference points, not outage areas',()=>{
 const d={notices:parseNagoya(html,'2026/10/26'),verifiedEvents:{type:'FeatureCollection',features:[]}};
 assert.equal(waterFeatures(d,places,false).features.length,0);const out=waterFeatures(d,places,true);assert.equal(out.features.length,4);assert.ok(out.features.every(f=>f.properties.locationPrecision==='municipal-reference'&&f.properties.kind==='planned'));
 const unknown={...d,notices:[{referenceName:'不明',referencePrefecture:'愛知'}]};assert.equal(waterFeatures(unknown,places,true).features.length,0);
});
test('source outages become explicit failures and are not reported as no outage',async()=>{
 const orig=globalThis.fetch;try{globalThis.fetch=async()=>{throw Error()};const d=await waterData(new Request('https://code4aichi.org/api/water'),{ASSETS:{fetch:async()=>Response.json({type:'FeatureCollection',features:[]})}});assert.equal(d.complete,false);assert.ok(d.sources.every(s=>!s.ok));assert.match(d.coverage,/全国自動取得には未対応/);}finally{globalThis.fetch=orig}
});
