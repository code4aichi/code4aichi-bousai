import test from 'node:test';
import assert from 'node:assert/strict';
import {fitNation,observeMapSize,NATIONAL_BOUNDS} from '../public/map-viewport.mjs';
test('national framing uses geographic bounds and a non-animated fit instead of fixed mobile zoom',()=>{
 const calls=[];const map={stop(){calls.push('stop')},invalidateSize(){calls.push('size')},fitBounds(bounds,options){calls.push({bounds,options})}};
 fitNation(map);assert.deepEqual(calls.slice(0,2),['stop','size']);assert.deepEqual(calls[2].bounds,NATIONAL_BOUNDS);assert.equal(calls[2].options.animate,false);
 assert.ok(NATIONAL_BOUNDS[0][0]<=20.5&&NATIONAL_BOUNDS[1][1]>=153.9);
});
test('container resize preserves selected centre and zoom, ignores unchanged/hidden sizes and disconnects',()=>{
 let cb,frame,disconnected=false,size={width:360,height:280};const calls=[];
 const map={getCenter:()=>({lat:35.18,lng:136.9}),getZoom:()=>14,invalidateSize:o=>calls.push(o),setView:(...a)=>calls.push(a)};
 const win={ResizeObserver:class{constructor(fn){cb=fn}observe(){}disconnect(){disconnected=true}},addEventListener(){},removeEventListener(){},requestAnimationFrame(fn){frame=fn;return 1},cancelAnimationFrame(){}};
 const stop=observeMapSize(map,{getBoundingClientRect:()=>size},win);frame();assert.equal(calls[1][1],14);assert.deepEqual(calls[1][0],{lat:35.18,lng:136.9});
 calls.length=0;frame=null;cb();assert.equal(frame,null);size={width:0,height:0};cb();assert.equal(frame,null);
 size={width:650,height:240};cb();frame();assert.equal(calls[1][1],14);stop();assert.equal(disconnected,true);
});
