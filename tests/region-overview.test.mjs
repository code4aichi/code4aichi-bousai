import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedFacilitySummary} from '../public/facility-model.mjs';
import {initRegionOverview} from '../public/region-overview.mjs';

test('selected facilities distinguish loading, unavailable, unsupported and counted records',()=>{
 const nagoya={prefecture:'愛知',name:'名古屋市 中区'};
 const records=[{provider:'nagoya',region:'名古屋市中区',name:'A',address:'名古屋市中区',kana:''},{provider:'nagoya',region:'名古屋市北区',name:'B',address:'名古屋市北区',kana:''}];
 assert.match(selectedFacilitySummary(nagoya,{pending:true}),/取得しています/);
 assert.match(selectedFacilitySummary(nagoya,{}),/取得できず未確認/);
 assert.match(selectedFacilitySummary({prefecture:'愛知',name:'豊田市'},{}),/未収録/);
 assert.match(selectedFacilitySummary(nagoya,{loadedSources:['nagoya'],facilities:records}),/1件.*未確認/);
 assert.match(selectedFacilitySummary(nagoya,{loadedSources:['nagoya'],facilities:[]}),/0件.*施設がないことを意味しません/);
});

test('regional buttons reveal the correct section and apply selected-region filters',()=>{
 const calls=[];const elements={};
 for(const id of ['rain-overview','water-current-panel','registered-facilities','water-overview','water-tab-current','water-tab-facilities','water-use-selection','facility-use-selection'])elements[id]={open:false,click(){calls.push(id)},scrollIntoView(){calls.push('scroll:'+id)}};
 const buttons=['water','facility','rain'].map(kind=>({dataset:{regionJump:kind},addEventListener(type,fn){this.go=fn}}));
 const doc={querySelectorAll:()=>buttons,getElementById:id=>elements[id]};
 initRegionOverview(doc,{bousaiCurrentSelection:()=>({id:1})});
 buttons[1].go();assert.equal(elements['water-overview'].open,true);assert.deepEqual(calls,['water-tab-facilities','facility-use-selection','scroll:registered-facilities']);
 calls.length=0;buttons[0].go();assert.deepEqual(calls,['water-tab-current','water-use-selection','scroll:water-current-panel']);
 calls.length=0;buttons[2].go();assert.equal(elements['rain-overview'].open,true);assert.deepEqual(calls,['scroll:rain-overview']);
});
