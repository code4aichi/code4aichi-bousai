import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {JMA_OFFICES} from '../public/jma-offices.mjs';
const call=query=>worker.fetch(new Request('https://code4aichi.org/mieru-bosai/api/alerts'+query),{},{});
test('two batches cover all 58 offices without exceeding 29 upstream calls per batch',async()=>{
 const original=globalThis.fetch;const requests=[];
 try{
  globalThis.fetch=async url=>{requests.push(String(url));if(String(url).endsWith('/011000.json'))return new Response('',{status:503});return Response.json([{warning:{class20Items:[]}}]);};
  const a=await(await call('?batch=0')).json();assert.equal(requests.length,29);
  const b=await(await call('?batch=1')).json();assert.equal(requests.length,58);
  assert.equal(a.results.find(x=>x.office==='011000').ok,false);assert.equal(a.complete,false);
  assert.equal(new Set([...a.results,...b.results].map(x=>x.office)).size,JMA_OFFICES.length);
  for(const code of ['011000','460040','474000'])assert.ok(requests.some(x=>x.endsWith('/'+code+'.json')));
  assert.equal((await call('?batch=2')).status,400);
  assert.equal((await call('?office=474000')).status,200);
 }finally{globalThis.fetch=original;}
});
