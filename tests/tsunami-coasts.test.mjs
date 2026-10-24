import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseReport} from '../src/seismic.js';
import {coastEligible,validateCoasts,buildCoastOverlay} from '../public/tsunami-coast-model.mjs';
const coasts=JSON.parse(fs.readFileSync(new URL('../public/tsunami-coasts.geojson',import.meta.url)));
const report=parseReport(fs.readFileSync(new URL('./fixtures/seismic/tsunami-issued.xml',import.meta.url),'utf8'),'sample','tsunami');
test('official coastline dataset has 66 distinct valid line regions and provenance hash',()=>{
 const meta=JSON.parse(fs.readFileSync(new URL('../public/tsunami-coasts-source.json',import.meta.url)));assert.equal(meta.sha256,createHash('sha256').update(fs.readFileSync(new URL('../public/tsunami-coasts.geojson',import.meta.url))).digest('hex'));
 assert.equal(validateCoasts(coasts).features.length,66);assert.equal(new Set(coasts.features.map(f=>f.properties.code)).size,66);
 assert.ok(coasts.features.every(f=>f.geometry.type==='MultiLineString'));
});
test('official tsunami XML joins all 43 forecast regions by exact code including Aichi',()=>{
 const out=buildCoastOverlay(report,coasts);assert.equal(out.features.length,43);assert.deepEqual(out.missingCodes,[]);assert.deepEqual(out.unknownKinds,[]);
 const aichi=out.features.find(f=>f.properties.code==='390');assert.equal(aichi.properties.name,'愛知県外海');assert.equal(aichi.properties.categoryCode,'62');assert.equal(aichi.properties.label,'津波注意報');
 assert.equal(out.features.find(f=>f.properties.code==='210').properties.label,'大津波警報');
});
test('single-region selection preserves its own exact coast geometry',()=>{
 const area=report.areas.find(a=>a.code==='390');const out=buildCoastOverlay({...report,areas:[area]},coasts);assert.equal(out.features.length,1);assert.deepEqual(out.features[0].geometry,coasts.features.find(f=>f.properties.code==='390').geometry);
});
test('cancelled, training and unknown report states never draw a normal coast overlay',()=>{
 for(const altered of [{cancelled:true},{infoType:'取消'},{status:'訓練'},{status:'試験'},{infoType:'不明'}]){assert.equal(coastEligible({...report,...altered}),false);assert.equal(buildCoastOverlay({...report,...altered},coasts).features.length,0);}
});
test('unknown codes and conflicting categories are reported, never guessed by place name',()=>{
 const out=buildCoastOverlay({...report,areas:[{name:'愛知県外海',code:'999',categoryCode:'62'},{name:'愛知県外海',code:'390',categoryCode:'99'},{name:'宮城県',code:'220',categoryCode:'51'},{name:'宮城県',code:'220',categoryCode:'62'}]},coasts);
 assert.equal(out.features.length,0);assert.deepEqual(out.missingCodes,['999']);assert.deepEqual(out.unknownKinds,['390']);assert.deepEqual(out.conflictingCodes,['220']);
});
test('release and forecast use subdued dashed lines with historical labels',()=>{
 const out=buildCoastOverlay({...report,areas:[{code:'390',categoryCode:'50'},{code:'400',categoryCode:'72'}]},coasts);
 assert.match(out.features[0].properties.label,/当該発表/);assert.equal(out.features[0].properties.color,'#66717a');assert.ok(out.features[0].properties.dashArray);assert.equal(out.features[1].properties.label,'津波予報（若干の海面変動）');
});
test('invalid geometry, duplicate geographic codes and out-of-range coordinates are rejected',()=>{
 assert.throws(()=>validateCoasts({type:'FeatureCollection',features:[coasts.features[0],coasts.features[0]]}));
 const invalid=structuredClone(coasts);invalid.features[0].geometry.coordinates[0][0]=[999,100];assert.throws(()=>validateCoasts(invalid));
 const polygon=structuredClone(coasts);polygon.features[0].geometry.type='Polygon';assert.throws(()=>validateCoasts(polygon));
});
