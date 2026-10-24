import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseProviderFacilities,filterFacilities} from '../public/facility-model.mjs';
const y=JSON.parse(fs.readFileSync(new URL('../public/yokohama-water-facilities.json',import.meta.url)));
const n=JSON.parse(fs.readFileSync(new URL('../public/nagoya-water-facilities.json',import.meta.url)));
test('all 515 official CSV rows retain original fields and raw source hash',()=>{
 const facilities=parseProviderFacilities('yokohama',y);assert.equal(facilities.length,515);assert.equal(y.source.sha256,createHash('sha256').update(fs.readFileSync(new URL('../public/yokohama-water-facilities.csv',import.meta.url))).digest('hex'));assert.equal(y.source.license,'CC BY 4.0');assert.deepEqual(facilities[0].original,y.rows[0]);assert.equal(facilities[0].name,'恩田配水池');assert.equal(facilities[0].region,'横浜市青葉区');
});
test('four Yokohama facility types remain distinct and never imply current operation',()=>{
 const list=parseProviderFacilities('yokohama',y);assert.deepEqual([...new Set(list.map(f=>f.type))].sort(),['配水池','配水槽','災害用地下給水タンク','緊急給水栓'].sort());assert.ok(list.every(f=>f.operatingStatus==='unknown'));assert.ok(list.every(f=>f.sourceURL.includes('city.yokohama.lg.jp')));
});
test('namespaced IDs avoid same-number collisions across the 1135 combined facilities',()=>{
 const nagoya=parseProviderFacilities('nagoya',n),yoko=parseProviderFacilities('yokohama',y),all=[...nagoya,...yoko];assert.equal(all.length,1135);assert.equal(new Set(all.map(f=>f.id)).size,1135);assert.equal(nagoya[0].id,'nagoya:1');assert.equal(yoko[0].id,'yokohama:1');assert.ok(nagoya.every(f=>f.sourceURL.includes('water.city.nagoya.jp')));
});
test('provider filter and distance ordering include the correct source without modifying original data',()=>{
 const before=JSON.stringify(y),all=[...parseProviderFacilities('nagoya',n),...parseProviderFacilities('yokohama',y)];assert.equal(filterFacilities(all,{provider:'yokohama'}).length,515);assert.equal(filterFacilities(all,{provider:'nagoya'}).length,620);assert.ok(filterFacilities(all,{query:'横浜市青葉区'}).every(f=>f.provider==='yokohama'));
 const f=all.find(f=>f.id==='yokohama:1'),ordered=filterFacilities(all,{position:{lat:f.lat,lng:f.lng}});assert.equal(ordered[0].id,'yokohama:1');assert.equal(ordered[0].distanceKm,0);assert.equal(JSON.stringify(y),before);
});
test('changed CSV schema, blank coordinates and unsupported facility types are rejected',()=>{
 assert.throws(()=>parseProviderFacilities('yokohama',{columns:[],rows:[]}));const blank=structuredClone(y);blank.rows[0][6]='  ';assert.throws(()=>parseProviderFacilities('yokohama',blank));const bad=structuredClone(y);bad.rows[0][1]='給水中';assert.throws(()=>parseProviderFacilities('yokohama',bad));
});
