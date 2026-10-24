import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseFacilities,filterFacilities,distanceKm,usablePosition,SUPPLY_TYPES} from '../public/facility-model.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../public/nagoya-water-facilities.json',import.meta.url)));
test('official dataset preserves all 1425 source rows and the raw workbook hash',()=>{
 assert.equal(data.rows.length,1425);assert.equal(data.source.sha256,createHash('sha256').update(fs.readFileSync(new URL('../public/nagoya-water-facilities.xlsx',import.meta.url))).digest('hex'));assert.equal(data.source.license,'CC BY-ND 4.0');
});
test('only 620 registered water facilities are shown, with opening status unknown',()=>{
 const facilities=parseFacilities(data);assert.equal(facilities.length,620);assert.ok(facilities.every(f=>SUPPLY_TYPES.includes(f.type)&&f.operatingStatus==='unknown'));assert.ok(!facilities.some(f=>f.type==='仮設トイレ'||f.type==='営業所'));
 const first=facilities[0];assert.deepEqual(first.original,data.rows[0]);assert.equal(first.lat,data.rows[0][6]);assert.equal(first.name,data.rows[0][1]);
});
test('name, kana, address, region and type filters work without changing original values',()=>{
 const before=JSON.stringify(data),facilities=parseFacilities(data);
 assert.ok(filterFacilities(facilities,{query:'ヒガシヤマ'}).some(f=>f.name==='東山配水場'));
 const region=filterFacilities(facilities,{region:'名古屋市千種区',type:'常設給水栓'});assert.ok(region.length);assert.ok(region.every(f=>f.region==='名古屋市千種区'&&f.type==='常設給水栓'));
 assert.equal(filterFacilities(facilities,{query:'存在しない施設12345'}).length,0);assert.equal(JSON.stringify(data),before);
});
test('straight-line distances sort within the dataset and never supply availability or a route',()=>{
 const facilities=parseFacilities(data),origin={lat:facilities[0].lat,lng:facilities[0].lng};const result=filterFacilities(facilities,{position:origin});assert.equal(result[0].distanceKm,0);assert.ok(result.every((r,i)=>!i||r.distanceKm>=result[i-1].distanceKm));assert.ok(Math.abs(distanceKm({lat:0,lng:0},{lat:0,lng:1})-111.195)<.001);assert.ok(result.every(f=>f.operatingStatus==='unknown'));
});
test('expired, invalid and future device positions cannot drive proximity sorting',()=>{
 const now=1000000;assert.equal(usablePosition({lat:35,lng:137,capturedAt:now},now),true);assert.equal(usablePosition({lat:35,lng:137,capturedAt:now-300001},now),false);assert.equal(usablePosition({lat:35,lng:137,capturedAt:now+1},now),false);assert.equal(usablePosition({lat:NaN,lng:137,capturedAt:now},now),false);
});
test('bad schema, duplicate IDs and invalid water-facility coordinates fail visibly rather than guessing',()=>{
 assert.throws(()=>parseFacilities({columns:[],rows:[]}));const duplicate=structuredClone(data);duplicate.rows.push(duplicate.rows[0]);assert.throws(()=>parseFacilities(duplicate));const broken=structuredClone(data);broken.rows[0][6]=999;assert.throws(()=>parseFacilities(broken));
});
