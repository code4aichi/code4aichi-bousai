import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RIVER_FEEDS,riverURL,parseRiverFeed,parseRiverReport,riverData} from '../src/river.js';
import {freshRiver} from '../public/river.mjs';
const sample=fs.readFileSync(new URL('fixtures/river-official.xml',import.meta.url),'utf8');
const url='https://www.data.jma.go.jp/developer/xml/data/20261021212015_0_VXKO55_050000.xml';
const feed=(entries=[url])=>`<feed><updated>2026-10-22T00:00:00Z</updated>${entries.map(u=>`<entry><title>指定河川洪水予報</title><id>${u}</id><updated>2026-10-21T21:20:09Z</updated></entry>`).join('')}</feed>`;
test('official 2026 river bulletin keeps release wording and observation times; predicted and missing water levels are excluded',()=>{
 const r=parseRiverReport(sample,url);assert.match(r.title,/解除/);assert.equal(r.status,'通常');assert.equal(r.levels.length,2);assert.equal(r.levels[0].value,'2.15');assert.equal(r.levels[0].time,'2026-10-22T06:10:00+09:00');assert.equal(r.reportedAt,'2026-10-22T06:20:00+09:00');assert.ok(r.regions.some(a=>a.type==='河川'&&a.name==='子吉川'));assert.equal(r.coordinates,undefined);
});
test('cancellations and training are preserved rather than changed to active alerts',()=>{
 const r=parseRiverReport(sample.replace('<Status>通常</Status>','<Status>訓練</Status>').replace('<InfoType>発表</InfoType>','<InfoType>取消</InfoType>'),url);assert.equal(r.infoType,'取消');assert.equal(r.status,'訓練');
});
test('only official HTTPS XML URLs and valid river feeds/reports are accepted',()=>{
 for(const s of [url.replace('https:','http:'),url.replace('www.data.jma.go.jp','evil.test'),url.replace('https://','https://user@'),url+'?x=1',url.replace('.jp/','.jp:123/')])assert.equal(riverURL(s),null);
 assert.equal(parseRiverFeed(feed()).entries.length,1);assert.equal(parseRiverFeed(feed().replace('指定河川洪水予報','別の情報')).entries.length,0);
 assert.throws(()=>parseRiverReport(sample.replace('指定河川洪水予報','別情報'),url));assert.throws(()=>parseRiverFeed('<!DOCTYPE feed><feed/>'));
});
test('feed deduplication avoids repeat fetches and partial failure preserves available bulletins',async()=>{
 const calls=[];const d=await riverData(async u=>{calls.push(u);if(u===RIVER_FEEDS[0])throw Error();return new Response(u===RIVER_FEEDS[1]?feed([url,url]):sample)});
 assert.equal(d.complete,false);assert.equal(d.reports.length,1);assert.equal(calls.filter(u=>u===url).length,1);
 await assert.rejects(()=>riverData(async()=>{throw Error()}));
});
test('empty and failed reports remain distinguishable; fetches are capped at 12 reports plus 2 feeds',async()=>{
 const empty=await riverData(async()=>new Response(feed([])));assert.equal(empty.complete,true);assert.equal(empty.reports.length,0);
 let n=0;const d=await riverData(async u=>{n++;return new Response(RIVER_FEEDS.includes(u)?feed(Array.from({length:20},(_,i)=>url.replace('_0_','_'+i+'_'))):'<Report/>')});assert.equal(n,14);assert.equal(d.failedReports,12);assert.equal(d.complete,false);assert.equal(d.truncated,true);
});
test('stale or future retrievals do not remain visible as recently retrieved history',()=>{
 const now=Date.now(),d={ok:true,reports:[],retrievedAt:new Date(now).toISOString()};assert.equal(freshRiver(d,now),true);assert.equal(freshRiver(d,now+600001),false);assert.equal(freshRiver(d,now-60001),false);assert.equal(freshRiver({...d,ok:false},now),false);
});
