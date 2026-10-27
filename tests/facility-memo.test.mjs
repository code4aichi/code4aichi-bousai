import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFacilityMemo} from '../public/facility-memo.mjs';
const f={provider:'nagoya',name:'給水施設',address:'名古屋市',lat:35,lng:137,type:'常設給水栓',region:'名古屋市中区'};
test('memo is a self-contained static file with source, licence and distinct creation timestamp',()=>{
 const html=buildFacilityMemo([f],[f],{createdAt:new Date('2026-10-24T23:30:00Z'),sources:{nagoya:{retrievedAt:'2026-10-01T00:00:00Z'}}});
 assert.match(html,/2026年10月25日/);assert.match(html,/日本時間/);assert.match(html,/2026-10-01T00:00:00Z/);assert.match(html,/開設確認日時ではありません/);
 assert.match(html,/water.city.nagoya.jp/);assert.match(html,/CC BY-ND 4.0/);assert.match(html,/@media print/);assert.match(html,/自動更新されません/);
 assert.doesNotMatch(html,/<script|<link|<img|<iframe|onload=|fetch\(/i);
});
test('unmatched saves are retained with stored identity and explicit unknown status',()=>{
 const html=buildFacilityMemo([f],[]);assert.match(html,/保存した施設1件／今回の収録データと照合できた施設0件/);
 assert.match(html,/保存した時点/);assert.match(html,/変更・廃止の有無も未確認/);assert.match(html,/給水施設/);
});
test('memo escapes facility text and ignores arbitrary source URLs from data',()=>{
 const bad={...f,name:'<script>alert(1)</script>',notes:'<img src=x onerror=alert(1)>',sourceURL:'javascript:alert(1)'};
 const html=buildFacilityMemo([bad],[bad]);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script|<img|href="javascript:/);
});
test('memo uses each provider attribution and rejects empty exports',()=>{
 const yokohama={...f,provider:'yokohama'};const html=buildFacilityMemo([f,yokohama],[f,yokohama]);
 assert.match(html,/名古屋市上下水道局/);assert.match(html,/横浜市水道局/);assert.match(html,/CC BY 4.0/);assert.throws(()=>buildFacilityMemo([],[]));
});

test('region-only memo includes reviewed links, creation date and no unverified links',()=>{
 const region={prefecture:'愛知',name:'豊田市',checks:{water:{url:'https://www.city.toyota.aichi.jp/sumaikankyo/jogesuido/index.html',label:'豊田市 上下水道',checkedAt:'2026-10-27'},official:{url:'javascript:alert(1)',checkedAt:'2026-10-27'}}};
 const html=buildFacilityMemo([],[],{regions:[region]});
 assert.match(html,/保存した地域1件／保存した施設0件/);assert.match(html,/豊田市 上下水道/);assert.match(html,/URL確認：2026-10-27/);assert.doesNotMatch(html,/href="javascript:/);
 assert.match(html,/リンクの閲覧には通信が必要/);
});
test('unverified region links are never embedded and markup is escaped',()=>{
 const html=buildFacilityMemo([],[],{regions:[{prefecture:'愛知',name:'<script>危険</script>',checks:{}}]});
 assert.match(html,/確認済みの公式リンクを表示できません/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
