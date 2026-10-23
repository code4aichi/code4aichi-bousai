import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
for(const filter of ['query','prefecture'])test(`changing ${filter} dismisses the previous detail and reveals current search results`,()=>{
 const fields={'location-search':{value:filter==='query'?'名古屋':''},'pref-filter':{value:filter==='prefecture'?'愛知':''},'detail-dialog':{open:true,close(){this.open=false}},'region-browser':{hidden:true}};
 const calls=[];const context=vm.createContext({window:{},document:{getElementById:id=>fields[id]}});
 vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/boot\(\);\s*$/,''),context);
 context.calls=calls;
 vm.runInContext("selected={id:'old'};savedFocusId='old';update=()=>calls.push('results');focusData=()=>calls.push('map');searchRegions()",context);
 assert.equal(fields['detail-dialog'].open,false);assert.equal(fields['region-browser'].hidden,false);
 assert.equal(vm.runInContext('selected',context),null);assert.equal(vm.runInContext('savedFocusId',context),null);
 assert.deepEqual(calls,['results','map']);
 assert.equal(vm.runInContext("matches({id:'new',name:'名古屋市',prefecture:'愛知',address:''})",context),true);
});
