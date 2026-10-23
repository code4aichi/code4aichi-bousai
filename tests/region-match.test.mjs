import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRegionMatches} from '../public/region-match.mjs';
const area={offices:{'011000':{name:'宗谷地方'},'016000':{name:'石狩・空知・後志地方'},'460040':{name:'奄美地方'},'474000':{name:'八重山地方'},'130000':{name:'東京都'},'340000':{name:'広島県'}},class10s:{h:{parent:'011000'},s:{parent:'016000'},a:{parent:'460040'},o:{parent:'474000'},t:{parent:'130000'},g:{parent:'340000'}},class15s:{h15:{parent:'h'},s15:{parent:'s'},a15:{parent:'a'},o15:{parent:'o'},t15:{parent:'t'},g15:{parent:'g'}},class20s:{'0121400':{name:'稚内市',parent:'h15'},'0110000':{name:'札幌市',parent:'s15'},'4622200':{name:'奄美市',parent:'a15'},'4720700':{name:'石垣市',parent:'o15'},'1320600':{name:'府中市',parent:'t15'},'3420800':{name:'府中市',parent:'g15'}}};
const p=(id,name,prefecture)=>({id,name,prefecture});
test('Hokkaido, Amami and Yaeyama use their own announcement offices',()=>{
 const points=[p('1','稚内市','北海道'),p('2','札幌市','北海道'),p('3','奄美市','鹿児島'),p('4','石垣市','沖縄')];
 const m=buildRegionMatches(points,area);assert.deepEqual(points.map(p=>m.get(p.id).officeCode),['011000','016000','460040','474000']);assert.ok([...m.values()].every(x=>x.status==='matched'));
});
test('same municipality names never match across prefectures',()=>{
 const m=buildRegionMatches([p('t','府中市','東京'),p('g','府中市','広島'),p('x','府中市','愛知')],area);
 assert.equal(m.get('t').areaCode,'1320600');assert.equal(m.get('g').areaCode,'3420800');assert.equal(m.get('x').status,'unmatched');
});
test('multiple candidates, obsolete names, providers and broken parent chains are not guessed',()=>{
 const extra=structuredClone(area);extra.class20s.duplicate={name:'府中市',parent:'t15'};extra.class20s.broken={name:'架空市',parent:'missing'};
 const m=buildRegionMatches([p('1','府中市','東京'),p('2','那珂川町','福岡'),p('3','水道企業団','東京'),p('4','架空市','東京')],extra);
 assert.equal(m.get('1').status,'ambiguous');assert.equal(m.get('1').areaCode,undefined);for(const id of ['2','3','4'])assert.equal(m.get(id).status,'unmatched');
});
