import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectRiverReports} from '../public/river-model.mjs';
import {parseRiverReport} from '../src/river.js';
const report={title:'子吉川の発表',eventId:'river1',office:'発表元',status:'通常',updatedAt:'2026-10-22T00:00:00Z',sourceURL:'one',municipalities:[{code:'0521000',name:'由利本荘市',prefecture:'秋田県'}]};
test('regional filtering uses exact municipality codes, never river or place name guesses',()=>{
 assert.equal(selectRiverReports([report],{selectionOnly:true,areaCode:'0521000'}).reports.length,1);
 assert.equal(selectRiverReports([report],{selectionOnly:true,areaCode:'0521001'}).reports.length,0);
 assert.equal(selectRiverReports([report],{selectionOnly:true,areaCode:null}).unknownArea,true);
 assert.equal(selectRiverReports([report],{query:'秋田県由利本荘市'}).reports.length,1);
});
test('latest-series view preserves a cancellation and keeps training separate',()=>{
 const newer={...report,updatedAt:'2026-10-22T01:00:00Z',infoType:'取消',sourceURL:'two'},training={...report,status:'訓練'};
 const input=[report,newer,training];const v=selectRiverReports(input);
 assert.equal(v.reports.length,2);assert.equal(v.reports[0].infoType,'取消');assert.equal(v.reports[1].status,'訓練');assert.equal(selectRiverReports(input,{latestOnly:false}).reports.length,3);assert.equal(input.length,3);
});
test('equal-time corrections and missing event identities are not silently discarded',()=>{
 assert.equal(selectRiverReports([report,{...report,infoType:'訂正',sourceURL:'two'}]).reports.length,2);
 assert.equal(selectRiverReports([{...report,eventId:''},{...report,eventId:'',sourceURL:'two'}]).reports.length,2);
});
test('a newer report with no municipality list cannot revive an older regional bulletin',()=>{
 const newer={...report,updatedAt:'2026-10-22T01:00:00Z',municipalities:[]};
 const v=selectRiverReports([report,newer],{selectionOnly:true,areaCode:'0521000'});assert.equal(v.reports.length,0);assert.equal(v.missingMunicipalities,1);
});
test('official XML extracts and deduplicates cities only from explicit inundation-assumption items',()=>{
 const s=fs.readFileSync(new URL('fixtures/river-official.xml',import.meta.url),'utf8'),url='https://www.data.jma.go.jp/developer/xml/data/20261021212015_0_VXKO55_050000.xml';
 const r=parseRiverReport(s,url);assert.deepEqual(r.municipalities,[{code:'0521000',name:'由利本荘市',prefecture:'秋田県'}]);
 assert.equal(parseRiverReport(s.replaceAll('<CityCode>0521000</CityCode>','<CityCode>bad</CityCode>'),url).municipalities.length,0);
});
