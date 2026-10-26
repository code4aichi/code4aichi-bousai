import test from 'node:test';
import assert from 'node:assert/strict';
import {fitNation,observeMapSize,NATIONAL_BOUNDS} from '../public/map-viewport.mjs';
test('national reset retains zoom 5 on desktop and mobile with an enlarged frame',()=>{
 const calls=[];const map={stop(){},invalidateSize(){},fitBounds:(...a)=>calls.push(['bounds',...a]),setView:(...a)=>calls.push(['view',...a])};
 fitNation(map);assert.deepEqual(calls[0],['view',[34.05,138],5,{animate:false}]);
 fitNation(map,true);assert.deepEqual(calls[1],['view',[34.05,138],5,{animate:false}]);
});
test('size observer does not reposition on load or call setView during resize',()=>{
 let cb,frame=null,disconnected=false,size={width:360,height:280};const calls=[];
 const map={invalidateSize:o=>calls.push(o),setView(){assert.fail('resize must not reset view')}};
 const win={ResizeObserver:class{constructor(fn){cb=fn}observe(){}disconnect(){disconnected=true}},addEventListener(){},removeEventListener(){},requestAnimationFrame(fn){frame=fn;return 1},cancelAnimationFrame(){}};
 const stop=observeMapSize(map,{getBoundingClientRect:()=>size},win);assert.equal(frame,null);cb();assert.equal(frame,null);
 size={width:0,height:0};cb();assert.equal(frame,null);
 size={width:650,height:240};cb();frame();assert.deepEqual(calls,[{pan:true,animate:false,debounceMoveend:true}]);stop();assert.equal(disconnected,true);
});
