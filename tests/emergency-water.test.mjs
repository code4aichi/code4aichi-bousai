import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseEmergency,emergencyWaterSources,EMERGENCY_SOURCES} from '../src/emergency-water.js';
import {waterFeatures} from '../public/water-model.mjs';
const fixture=n=>fs.readFileSync(new URL('./fixtures/water/'+n+'-emergency.html',import.meta.url),'utf8');
const active=(headline='10月24日12時現在、白石区の一部地域で断水が発生しております。')=>`<div id="tmp_contents" class="kinkyu_cnt"><h2>緊急的な断水・濁水の情報（配水管の漏水事故などによる突発的な断水や濁水）</h2><p>${headline}</p><h3>※対象地域</h3><p>白石区南郷通16丁目北の一部<br/>白石区南郷通17丁目南の一部</p></div><!--#tmp_contents-->`;
test('official empty listings stay scoped and are not a national all-clear',()=>{
 assert.equal(parseEmergency('yokohama',fixture('yokohama')).state,'no-listing');assert.match(EMERGENCY_SOURCES[0].scope,/100戸以上/);
 const p=parseEmergency('sapporo',fixture('sapporo'));assert.equal(p.state,'no-listing');assert.equal(p.reports.length,0);
});
test('HTML comments and old inactive placeholder announcements do not generate current reports',()=>{
 const source=fixture('sapporo');assert.match(source,/<!--/);assert.match(source,/住所入力/);assert.deepEqual(parseEmergency('sapporo',source).reports,[]);
});
test('a recognised visible emergency announcement preserves area text and reference ward without inventing publication time',()=>{
 const p=parseEmergency('sapporo',active());assert.equal(p.state,'reports');assert.equal(p.reports[0].areaNames.length,2);assert.deepEqual(p.reports[0].referenceNames,['札幌市 白石区']);assert.equal(p.reports[0].issuedAt,null);assert.equal(p.reports[0].announcement,'emergency-text');
});
test('restoration wording, unknown formats and hidden or placeholder content are handled separately',()=>{
 assert.equal(parseEmergency('sapporo',active('白石区で発生しておりました断水は現在解消しております。')).reports[0].announcement,'restoration-text');
 assert.equal(parseEmergency('sapporo',active().replace('白石区南郷通16丁目北の一部','住所入力')).state,'review');
 assert.equal(parseEmergency('sapporo',active().replace('<p>10月','<p hidden>10月')).state,'review');
 assert.equal(parseEmergency('yokohama','<main id="ys-contents"><h2>突発断水情報</h2><p>更新中です</p></main>').state,'review');assert.throws(()=>parseEmergency('sapporo','<div>メンテナンス</div>'));
});
test('automatic references never become confirmed affected areas and no guessed fallback is used',()=>{
 const r=parseEmergency('sapporo',active()).reports[0];const locations=[{id:'1',name:'札幌市白石区',prefecture:'北海道',lat:43,lng:141}];
 const geo=waterFeatures({emergencyReports:[r],verifiedEvents:{type:'FeatureCollection',features:[]}},locations);
 assert.equal(geo.features.length,1);assert.equal(geo.features[0].properties.kind,'emergency-reference');assert.equal(geo.features[0].properties.locationPrecision,'municipal-reference');assert.equal(geo.features[0].geometry.type,'Point');
 assert.equal(waterFeatures({emergencyReports:[r]},[]).features.length,0);
 const realPlaces=JSON.parse(fs.readFileSync(new URL('../public/locations.json',import.meta.url)));assert.equal(waterFeatures({emergencyReports:[r]},realPlaces).features.length,1);
});
test('provider failure does not discard another provider and never becomes no-listing',async()=>{
 const orig=globalThis.fetch;
 try{globalThis.fetch=async url=>{if(url===EMERGENCY_SOURCES[0].url)return new Response('',{status:503});return new Response(fixture('sapporo'))};const sources=await emergencyWaterSources();assert.equal(sources[0].ok,false);assert.equal(sources[0].state,'unavailable');assert.equal(sources[1].ok,true);assert.equal(sources[1].state,'no-listing');}
 finally{globalThis.fetch=orig}
});
