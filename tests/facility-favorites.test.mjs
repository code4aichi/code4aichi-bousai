import test from 'node:test';
import assert from 'node:assert/strict';
import {createFacilityFavorites,FACILITY_SAVED_KEY} from '../public/facility-favorites.mjs';
const facility={id:'nagoya:1',provider:'nagoya',name:'給水施設',address:'名古屋市内',lat:35,lng:137};
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}}
test('saved identity follows same facility after row renumbering, never a replacement facility',()=>{
 const s=storage(),a=createFacilityFavorites(s);assert.deepEqual(a.toggle(facility),{ok:true,saved:true});
 const b=createFacilityFavorites(s);assert.equal(b.has({...facility,id:'nagoya:99'}),true);assert.equal(b.has({...facility,name:'別の施設'}),false);
 assert.equal(b.has({...facility,provider:'yokohama'}),false);assert.deepEqual(b.toggle(facility),{ok:true,saved:false});assert.equal(b.count(),0);
});
test('another session updates are merged before saving and missing-provider saves are retained',()=>{
 const s=storage(),a=createFacilityFavorites(s),b=createFacilityFavorites(s);
 a.toggle(facility);b.toggle({...facility,provider:'yokohama',name:'横浜の施設'});
 const c=createFacilityFavorites(s);assert.equal(c.count(),2);assert.equal(c.has(facility),true);
 // A city failing to load must not mutate the persisted list.
 assert.equal(JSON.parse(s.getItem(FACILITY_SAVED_KEY)).length,2);
});
test('corrupt storage is reported and is not overwritten by a save request',()=>{
 const s=storage();s.setItem(FACILITY_SAVED_KEY,'broken');const a=createFacilityFavorites(s);
 assert.equal(a.available(),false);assert.equal(a.toggle(facility).ok,false);assert.equal(s.getItem(FACILITY_SAVED_KEY),'broken');
});
test('storage failures do not mutate saved facilities',()=>{
 const s=storage(),a=createFacilityFavorites(s);a.toggle(facility);s.setItem=()=>{throw Error('quota')};
 assert.equal(a.toggle(facility).ok,false);assert.equal(a.has(facility),true);
});
test('maximum count still allows removing saved facilities',()=>{
 const s=storage(),a=createFacilityFavorites(s);for(let i=0;i<100;i++)a.toggle({...facility,name:String(i)});
 assert.equal(a.toggle(facility).reason,'limit');assert.equal(a.toggle({...facility,name:'0'}).saved,false);assert.equal(a.count(),99);
});
