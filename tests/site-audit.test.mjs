import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import worker from '../src/worker.js';
const read=name=>fs.readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('source page is served under portal mount and credits provider-specific terms',async()=>{
 const env={ASSETS:{fetch:async request=>new Response(read(new URL(request.url).pathname.slice(1)))}};
 const response=await worker.fetch(new Request('https://code4aichi.org/mieru-bosai/data-sources.html'),env,{});
 assert.equal(response.status,200);const html=await response.text();
 for(const term of ['CC BY-ND 4.0','CC BY 4.0','CC BY 3.0','公共データ利用規約','OpenStreetMap contributors'])assert.ok(html.includes(term),term);
 assert.match(html,/KMZ原本の利用条件は確認中/);assert.match(html,/一括適用したとは扱いません/);
 assert.equal((await worker.fetch(new Request('https://code4aichi.org/data-sources.html'),env,{})).status,404);
});
test('historical earthquake markers are opt-in and map attribution uses canonical OSM tiles',()=>{
 const html=read('index.html'),earthquake=html.match(/<input[^>]*id="show-earthquakes"[^>]*>/)?.[0];
 assert.ok(earthquake);assert.doesNotMatch(earthquake,/\bchecked\b/);assert.match(html,/地震の震源（発表履歴）/);
 assert.match(read('app.js'),/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
 assert.match(read('app.js'),/https:\/\/www.openstreetmap.org\/copyright/);
});
test('audit keeps legacy rows unchanged and does not treat HTTP counts as failed links',()=>{
 const bytes=fs.readFileSync(new URL('../public/locations.json',import.meta.url)),audit=JSON.parse(fs.readFileSync(new URL('../verification/site-audit-v5.json',import.meta.url))),rows=JSON.parse(bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),audit.locations.sha256);
 assert.equal(rows.length,1916);assert.equal(rows.flatMap(p=>Object.values(p.links)).length,6131);
 assert.equal(rows.flatMap(p=>Object.values(p.links)).filter(u=>u.startsWith('http:')).length,3796);
 assert.equal(audit.locations.linkReachabilityChecked,false);
});
