import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../src/worker.js';
const host='https://code4aichi.org';
const call=(path,env={})=>worker.fetch(new Request(host+path),env,{});

test('missing trailing slash redirects and keeps query',async()=>{
 const r=await call('/mieru-bosai?from=home');assert.equal(r.status,308);assert.equal(r.headers.get('Location'),host+'/mieru-bosai/?from=home');
});
test('old workers.dev home redirects to the mounted portal',async()=>{
 const r=await worker.fetch(new Request('https://code4aichi-bousai.code4aichi.workers.dev/'),{},{});assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://code4aichi-bousai.code4aichi.workers.dev/mieru-bosai/');
});
test('unrelated website paths are never served as portal assets',async()=>{
 for(const p of ['/','/atlas/','/api/areas','/mieru-bosaix/'])assert.equal((await call(p,{ASSETS:{fetch(){throw Error('must not be used')}}})).status,404);
});
test('page, scripts, manifest and unchanged regional dataset resolve under prefix',async()=>{
 const env={ASSETS:{async fetch(r){const url=new URL(r.url);const file=url.pathname==='/'?'index.html':url.pathname.slice(1);return new Response(await readFile(new URL('../public/'+file,import.meta.url)));}}};
 for(const p of ['','index.html','style.css?v=4.1.0','app.js?v=4.1.0','alerts.js?v=4.1.0','x.js?v=4.1.0','manifest.webmanifest','icon.svg','locations.json']){
  const r=await call('/mieru-bosai/'+p,env);assert.equal(r.status,200);assert.ok((await r.text()).length>0);
 }
 const data=await (await call('/mieru-bosai/locations.json',env)).json();assert.equal(data.length,1916);
});
test('asset redirects stay inside the mount and preserve query',async()=>{
 const r=await call('/mieru-bosai/index.html?x=1',{ASSETS:{fetch:async()=>new Response(null,{status:308,headers:{Location:'/?x=1'}})}});assert.equal(r.headers.get('Location'),host+'/mieru-bosai/?x=1');
});
test('regional API is dispatched with upstream data and errors',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({class20s:{a:{}},class15s:{},class10s:{},offices:{}});
  const r=await call('/mieru-bosai/api/areas');assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
  globalThis.fetch=async()=>new Response('unavailable',{status:503});
  const failed=await call('/mieru-bosai/api/areas');assert.equal(failed.status,502);assert.equal((await failed.json()).ok,false);
 }finally{globalThis.fetch=original}
});
test('warning API keeps office query, parses reports, and rejects invalid code',async()=>{
 const original=globalThis.fetch;let requested;
 try{
  globalThis.fetch=async(url)=>{requested=String(url);return Response.json([{reportDatetime:'2026-10-22T12:00:00+09:00',warning:{class20Items:[{areaCode:'2310100',kinds:[{code:'03',status:'発表'}]}]}}]);};
  const r=await call('/mieru-bosai/api/alerts?office=230000');const data=await r.json();assert.equal(r.status,200);assert.ok(requested.endsWith('/230000.json'));assert.equal(data.items[0].code,'03');assert.equal(data.office,'230000');
  assert.equal((await call('/mieru-bosai/api/alerts?office=bad')).status,400);
 }finally{globalThis.fetch=original}
});
test('all local HTML assets and PWA references have the mount prefix',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 for(const [,path] of html.matchAll(/(?:src|href)="(\/(?!\/)[^"]*)"/g))assert.ok(path.startsWith('/mieru-bosai/'),path);
 assert.ok(html.includes('<title>ミエル防災 | Code for AICHI</title>'));
 const m=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(m.start_url,'/mieru-bosai/');assert.equal(m.scope,m.start_url);assert.equal(m.icons[0].src,'/mieru-bosai/icon.svg');
});
