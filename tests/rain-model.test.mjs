import test from 'node:test';
import assert from 'node:assert/strict';
import {rainItems,rainView} from '../public/rain-model.mjs';
test('rain/flood filters exclude unrelated and unknown warning codes',()=>{
 const items=['03','04','10','18','33','34','43','44','05','99'].map(code=>({code}));
 assert.equal(rainItems(items).length,8);assert.deepEqual(rainItems(items,'flood').map(x=>x.code),['04','18','34','44']);assert.equal(rainItems(items,'rain').length,4);
});
test('unmatched and failed offices stay unknown, separate from confirmed empty source records',()=>{
 const now=Date.now(),s={loaded:true,areaOk:true,retrievedAt:new Date(now).toISOString(),points:[{id:'a',checked:false,items:[{code:'03'}]},{id:'b',checked:true,items:[]},{id:'c',checked:true,items:[{code:'04'}]}]};
 const v=rainView(s,'a',now);assert.equal(v.state,'partial');assert.equal(v.selected.checked,false);assert.deepEqual(v.points.map(x=>x.id),['c']);assert.equal(s.points[0].items.length,1);
 assert.equal(rainView(s,'b',now).selected.items.length,0);
});
test('stale, future, failed and missing area-code data suppress old warnings',()=>{
 const now=Date.now(),s={loaded:true,areaOk:true,retrievedAt:new Date(now).toISOString(),points:[{checked:true,items:[{code:'03'}]}]};
 for(const patch of [{loaded:false},{areaOk:false},{retrievedAt:new Date(now-600001).toISOString()},{retrievedAt:new Date(now+60001).toISOString()}]){const v=rainView({...s,...patch},null,now);assert.equal(v.state,'unknown');assert.deepEqual(v.points,[])}
});
