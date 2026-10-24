import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {FACILITY_PROVIDERS,parseProviderFacilities,filterFacilities,usablePosition} from '../public/facility-model.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../public/nagoya-water-facilities.json',import.meta.url)));
const yokohama=JSON.parse(fs.readFileSync(new URL('../public/yokohama-water-facilities.json',import.meta.url)));
async function ui(failed=false,missing=[]){
 const fields=new Map(),listeners={},requests=[];
 const element=id=>{if(!fields.has(id))fields.set(id,{value:'',checked:false,disabled:false,textContent:'',innerHTML:'',hidden:true,dataset:{},append(){},addEventListener:(event,fn)=>listeners[id+':'+event]=fn,querySelectorAll:()=>[],click(){}});return fields.get(id)};
 const window={};
 const ctx=vm.createContext({FACILITY_PROVIDERS,parseProviderFacilities,filterFacilities,usablePosition,window,Map,Date,Intl,Number,String,Math,setTimeout,clearTimeout,setInterval(){},document:{getElementById:element,createElement:()=>({}),addEventListener:(event,fn)=>listeners[event]=fn},fetch:async url=>{requests.push(url);return failed||missing.includes(url.includes('yokohama')?'yokohama':'nagoya')?new Response('',{status:503}):Response.json(url.includes('yokohama')?yokohama:data)}});
 vm.runInContext(fs.readFileSync(new URL('../public/facilities.mjs',import.meta.url),'utf8').replace(/^import .*\n/,''),ctx);for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));return {element,listeners,window,requests};
}
test('registered facilities load without asking location or enabling a crowded map layer',async()=>{
 const h=await ui();assert.equal(h.element('show-facilities').checked,false);assert.match(h.element('facility-count').textContent,/1135件/);assert.match(h.element('facility-list').innerHTML,/開設状況未確認/);assert.deepEqual(h.requests,['/mieru-bosai/nagoya-water-facilities.json?v=4.9.0','/mieru-bosai/yokohama-water-facilities.json?v=4.9.0']);
});
test('user-requested proximity search uses only device memory and fixed static data',async()=>{
 const h=await ui();h.window.bousaiCurrentPosition=()=>({lat:data.rows[0][6],lng:data.rows[0][7],capturedAt:Date.now(),accuracy:20});h.element('facility-use-current').onclick();assert.match(h.element('facility-distance-note').textContent,/直線距離順/);assert.match(h.element('facility-list').innerHTML,/約0m/);assert.equal(h.requests.length,2);
});
test('failed dataset loading is unknown, never zero available facilities',async()=>{
 const h=await ui(true);assert.match(h.element('facility-summary').textContent,/未確認/);assert.equal(h.element('show-facilities').disabled,true);assert.equal(h.element('facility-use-current').disabled,true);assert.doesNotMatch(h.element('facility-count').textContent,/0件/);
});

test('a failed city dataset retains the other city and reports partial fetch status',async()=>{const h=await ui(false,['yokohama']);assert.match(h.element('facility-count').textContent,/620件/);assert.equal(h.element('facility-summary').dataset.fetchState,'partial');assert.match(h.element('facility-summary').textContent,/横浜市/);assert.equal(h.element('show-facilities').disabled,false)});
test('switching providers resets incompatible region and facility-type filters',async()=>{const h=await ui();h.element('facility-region').value='名古屋市千種区';h.element('facility-type').value='地下式給水栓';h.element('facility-provider').value='yokohama';h.listeners['facility-provider:change']();assert.equal(h.element('facility-region').value,'');assert.equal(h.element('facility-type').value,'');assert.match(h.element('facility-count').textContent,/515件/);assert.match(h.element('facility-list').innerHTML,/横浜市水道局/)});
