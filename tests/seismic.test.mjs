import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseFeed,parseReport,coordinate,latestReports,seismicData,reportURL,FEEDS} from '../src/seismic.js';
import worker from '../src/worker.js';
const fixture=n=>fs.readFileSync(new URL('./fixtures/seismic/'+n+'.xml',import.meta.url),'utf8');
const quake=fixture('earthquake'),tsunami=fixture('tsunami-issued'),cancel=fixture('tsunami-cancelled');
const qurl='https://www.data.jma.go.jp/developer/xml/data/20261024034728_0_VXSE53_010000.xml';
const turl='https://www.data.jma.go.jp/developer/xml/data/20261024034728_0_VTSE41_010000.xml';
const feed=(entries=[qurl,turl])=>`<feed xmlns="http://www.w3.org/2005/Atom"><updated>2026-10-24T12:48:00+09:00</updated>${entries.map(url=>`<entry><updated>2026-10-24T03:47:28Z</updated><link type="application/xml" href="${url}"/></entry>`).join('')}</feed>`;
test('official earthquake namespaces, signed coordinates, magnitude and maximum intensity',()=>{
 const r=parseReport(quake,qurl,'earthquake');assert.equal(r.eventId,'20261024124440');assert.deepEqual(r.coordinates,{lat:41,lng:141.1});assert.equal(r.maxIntensity,'1');assert.equal(r.magnitude,'2.9');assert.equal(r.status,'通常');
 assert.deepEqual(coordinate('-13.8+165.7/'),{lat:-13.8,lng:165.7});assert.equal(coordinate('+99.0+141.1/'),null);assert.equal(coordinate('NaN'),null);
});
test('official tsunami area categories and cancellation remain separate from all-clear inference',()=>{
 const r=parseReport(tsunami,turl,'tsunami');assert.ok(r.areas.some(x=>x.name==='愛知県外海'));assert.ok(r.areas.some(x=>x.category.includes('大津波警報')));
 const c=parseReport(cancel,turl,'tsunami');assert.equal(c.infoType,'取消');assert.equal(c.cancelled,true);assert.equal(c.coordinates,null);
});
test('training, test, cancelled and unknown reports never expose mappable origins',()=>{
 for(const status of ['訓練','試験','不明'])assert.equal(parseReport(quake.replace('<Status>通常</Status>',`<Status>${status}</Status>`),qurl,'earthquake').coordinates,null);
 assert.equal(parseReport(quake.replace('<InfoType>発表</InfoType>','<InfoType>取消</InfoType>'),qurl,'earthquake').coordinates,null);
});
test('latest Control DateTime wins over serial order and corrections; exercises stay distinct',()=>{
 const q=parseReport(quake,qurl,'earthquake'),later={...q,updatedAt:'2026-10-24T04:00:00Z',infoType:'訂正'},cancelled={...later,updatedAt:'2026-10-24T05:00:00Z',cancelled:true,infoType:'取消',coordinates:null};
 const exercise={...later,status:'訓練'};const list=latestReports([cancelled,q,later,exercise]);assert.equal(list.length,2);assert.equal(list[0].cancelled,true);assert.ok(list.some(x=>x.status==='訓練'));
});
test('feeds only accept official report paths; malformed XML and entities are rejected',()=>{
 assert.equal(parseFeed(feed()).entries.length,2);assert.equal(parseFeed(feed(['https://attacker.invalid/a_VXSE53_.xml'])).entries.length,0);
 assert.equal(reportURL('https://www.data.jma.go.jp/other/a.xml'),null);assert.equal(reportURL(qurl+'?redirect=x'),null);
 assert.throws(()=>parseFeed('<feed>'));assert.throws(()=>parseFeed('<!DOCTYPE feed [<!ENTITY a "x">]><feed>&a;</feed>'));
});
test('API merges duplicate feeds and fetches immutable reports once; partial failures are explicit',async()=>{
 const orig=globalThis.fetch,requested=[];
 try{globalThis.fetch=async url=>{requested.push(url);return new Response(FEEDS.includes(url)?feed():url===qurl?quake:tsunami)};
 const r=await seismicData();assert.equal(r.complete,true);assert.equal(r.reports.length,2);assert.equal(requested.filter(x=>x===qurl).length,1);
 globalThis.fetch=async url=>{if(url===FEEDS[0]||url===turl)throw Error();return new Response(url===FEEDS[1]?feed():quake)};
 const partial=await seismicData();assert.equal(partial.complete,false);assert.equal(partial.failedReports,1);assert.equal(partial.reports.length,1);
 globalThis.fetch=async()=>{throw Error()};const response=await worker.fetch(new Request('https://code4aichi.org/mieru-bosai/api/seismic'),{},{});assert.equal(response.status,502);assert.equal((await response.json()).ok,false);
 }finally{globalThis.fetch=orig}
});
test('empty feed is historical absence, not a current tsunami all-clear; request count is bounded',async()=>{
 const orig=globalThis.fetch;try{globalThis.fetch=async()=>new Response(feed([]));const empty=await seismicData();assert.deepEqual(empty.reports,[]);assert.match(empty.coverage,/現在の警報状態を保証する一覧ではありません/);
 let count=0;const many=Array.from({length:30},(_,i)=>`https://www.data.jma.go.jp/developer/xml/data/${i}_VXSE53_a.xml`);
 globalThis.fetch=async url=>{count++;return new Response(FEEDS.includes(url)?feed(many):quake)};await seismicData();assert.equal(count,10);
 }finally{globalThis.fetch=orig}
});
