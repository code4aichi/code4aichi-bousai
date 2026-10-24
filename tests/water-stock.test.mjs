import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculateWaterStock} from '../public/water-stock-model.mjs';
test('water estimate uses household count and selected days with rounded-up 2L bottles',()=>{
 const r=calculateWaterStock({people:'3',days:'7',stock:'12'});
 assert.equal(r.required,63);assert.equal(r.requiredBottles,32);assert.equal(r.shortage,51);assert.equal(r.extraBottles,26);
});
test('unknown stock is distinct from zero and no surplus becomes negative shortage',()=>{
 assert.equal(calculateWaterStock({people:1,days:3,stock:''}).shortage,null);
 assert.equal(calculateWaterStock({people:1,days:3,stock:0}).shortage,9);
 const r=calculateWaterStock({people:1,days:3,stock:10});assert.equal(r.shortage,0);assert.equal(r.extraBottles,0);
});
test('decimal stock does not produce spurious extra bottles at a rounding boundary',()=>{
 assert.equal(calculateWaterStock({people:1,days:3,stock:7}).extraBottles,1);
 assert.equal(calculateWaterStock({people:1,days:3,stock:6.9}).extraBottles,2);
 assert.equal(calculateWaterStock({people:1,days:3,stock:8.9}).shortage,.1);
});
test('empty, negative, non-finite or out-of-range inputs do not produce estimates',()=>{
 for(const people of ['',0,-1,1.5,101,Infinity,'abc'])assert.equal(calculateWaterStock({people,days:3,stock:0}).ok,false);
 for(const stock of ['-1','0.01','100001','NaN','Infinity','1e3'])assert.equal(calculateWaterStock({people:1,days:3,stock}).ok,false);
 assert.equal(calculateWaterStock({people:1,days:1,stock:0}).ok,false);
});
function ui(){
 const elements=new Map(),listeners={};
 const $=id=>{if(!elements.has(id))elements.set(id,{value:({'stock-people':'1','stock-days':'3','stock-litres':''})[id]||'',textContent:'',hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(e,f){listeners[id+':'+e]=f}});return elements.get(id)};
 const ctx=vm.createContext({calculateWaterStock,document:{getElementById:$}});
 vm.runInContext(fs.readFileSync(new URL('../public/water-stock.mjs',import.meta.url),'utf8').replace(/^import .*\n/,''),ctx);
 return {$,listeners};
}
test('stock calculator runs without map, network or browser storage and clears stale result on error',()=>{
 const h=ui();assert.equal(h.$('stock-required').textContent,'9L');assert.equal(h.$('stock-shortage').textContent,'未計算');
 h.$('stock-litres').value='2.5';h.listeners['stock-litres:input']();assert.equal(h.$('stock-shortage').textContent,'6.5L');
 h.$('stock-people').value='';h.listeners['stock-people:input']();assert.equal(h.$('stock-result').hidden,true);assert.equal(h.$('stock-people').attributes['aria-invalid'],'true');assert.match(h.$('stock-message').textContent,/人数/);
 h.$('stock-reset').onclick();assert.equal(h.$('stock-result').hidden,false);assert.equal(h.$('stock-people').attributes['aria-invalid'],'false');assert.equal(h.$('stock-shortage').textContent,'未計算');
});
