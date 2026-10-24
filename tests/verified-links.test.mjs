import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LINK_REVIEWS,resolveRegionLinks} from '../public/verified-links.mjs';
const places=JSON.parse(fs.readFileSync(new URL('../public/locations.json',import.meta.url)));
test('nine reviewed URLs overlay three exact municipalities without changing original rows or social accounts',()=>{
 assert.equal(LINK_REVIEWS.flatMap(r=>Object.keys(r.links)).length,9);
 for(const name of ['名古屋市','横浜市','札幌市']){
  const p=places.find(p=>p.name===name),before=JSON.stringify(p),result=resolveRegionLinks(p);
  assert.equal(Object.keys(result.checks).length,3);assert.equal(result.links.x,p.links.x);assert.equal(JSON.stringify(p),before);
  assert.ok(result.links.official.startsWith('https:'));assert.equal(result.checks.official.originalURL,p.links.official);
  assert.equal(result.checks.disaster.checkedAt,'2026-10-25');
 }
});
test('city reviews do not silently apply to wards, namesakes in other prefectures or unrelated cities',()=>{
 for(const p of [{name:'名古屋市 中区',prefecture:'愛知',links:{water:'http://old.example/'}},{name:'横浜市',prefecture:'他県',links:{}},{name:'松山市',prefecture:'愛媛',links:{}}])assert.deepEqual(resolveRegionLinks(p).checks,{});
});
test('unsupported keys and unsafe or unrelated review destinations are not marked verified',()=>{
 const p={name:'名古屋市',prefecture:'愛知',links:{official:'http://old.example/'}};
 for(const url of ['javascript:alert(1)','http://www.city.nagoya.jp/','https://www.city.nagoya.jp.evil.example/','https://user:pass@www.city.nagoya.jp/']){
  const result=resolveRegionLinks(p,[{...p,links:{official:{url,evidenceURL:url,checkedAt:'2026-10-25'}}}]);assert.equal(result.links.official,p.links.official);assert.deepEqual(result.checks,{});
 }
});
function detail(registry){
 const fields=new Map();const el=id=>{if(!fields.has(id))fields.set(id,{textContent:'',innerHTML:'',value:'',open:false,setAttribute(){},querySelectorAll:()=>[],show(){this.open=true}});return fields.get(id)};
 const p=places.find(p=>p.name==='横浜市');
 const ctx=vm.createContext({window:{},Event,document:{getElementById:el,dispatchEvent(){}},matchMedia:()=>({matches:false}),testRegistry:registry,place:p});
 vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/boot\(\);\s*$/,''),ctx);
 vm.runInContext('favorites={all:()=>[],has:()=>false};update=()=>{};linkRegistry=testRegistry;showDetail(place)',ctx);
 return el;
}
test('region detail renders reviewed links and verification date while keeping old social links unverified',()=>{
 const el=detail({resolveRegionLinks});assert.match(el('detail-links-v2').innerHTML,/iza\/information.html/);assert.match(el('detail-links-v2').innerHTML,/2026-10-25/);assert.match(el('detail-links-v2').innerHTML,/旧登録リンク／現在の公式性/);assert.match(el('detail-link-audit').textContent,/3件のURL/);
});
test('region detail remains usable with explicit legacy status when review module is unavailable',()=>{
 const el=detail(null);assert.match(el('detail-links-v2').innerHTML,/http:\/\/www.city.yokohama.lg.jp/);assert.match(el('detail-link-audit').textContent,/全件未検証/);
});
