import test from 'node:test';
import assert from 'node:assert/strict';
import {waterReportSelection,waterReportView} from '../public/water-model.mjs';
const data={notices:[{area:'名古屋'}],verifiedEvents:{type:'FeatureCollection',features:[]},emergencySources:[{id:'yokohama',url:'https://y.example.lg.jp/'},{id:'sapporo',url:'https://s.example.lg.jp/',state:'unavailable'}],emergencyReports:[{sourceURL:'https://y.example.lg.jp/',headline:'横浜の発表'},{sourceURL:'https://s.example.lg.jp/',headline:'札幌の発表'}]};
test('provider view selects matching source and report without mutating global data',()=>{
 const before=JSON.stringify(data),v=waterReportView(data,'yokohama');assert.equal(v.emergencySources.length,1);assert.equal(v.emergencyReports[0].headline,'横浜の発表');assert.equal(v.notices.length,0);assert.equal(v.showRegistered,false);assert.equal(JSON.stringify(data),before);
});
test('planned and manually confirmed reports remain separate from emergency sources',()=>{
 const v=waterReportView(data,'nagoya');assert.equal(v.notices.length,1);assert.equal(v.showEmergency,false);assert.equal(v.showRegistered,false);
 const manual=waterReportView(data,'registered');assert.equal(manual.showRegistered,true);assert.equal(manual.emergencyReports.length,0);assert.equal(manual.notices.length,0);
});
test('unknown filter falls back to complete view and failed sources remain represented',()=>{
 const v=waterReportView(data,'unknown');assert.equal(v.notices.length,1);assert.equal(v.emergencyReports.length,2);assert.equal(waterReportView(data,'sapporo').emergencySources[0].state,'unavailable');
});
test('selected municipality uses prefecture and exact city identity, including spaced ward names',()=>{
 assert.equal(waterReportSelection({name:'横浜市 中区',prefecture:'神奈川'}),'yokohama');assert.equal(waterReportSelection({name:'札幌市 白石区',prefecture:'北海道'}),'sapporo');assert.equal(waterReportSelection({name:'名古屋市 千種区',prefecture:'愛知'}),'nagoya');assert.equal(waterReportSelection({name:'横浜市',prefecture:'他県'}),null);assert.equal(waterReportSelection({name:'中区',prefecture:'神奈川'}),null);assert.equal(waterReportSelection({name:'名古屋市外',prefecture:'愛知'}),null);
});
