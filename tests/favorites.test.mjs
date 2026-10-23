import test from 'node:test';
import assert from 'node:assert/strict';
import {createFavorites} from '../public/favorites.mjs';
const places=[{id:'loc-1',name:'名古屋市',prefecture:'愛知',address:'中区'},{id:'loc-2',name:'府中市',prefecture:'東京',address:''},{id:'loc-3',name:'府中市',prefecture:'広島',address:''}];
function storage(value=null){return {getItem:()=>value,setItem:(k,v)=>{value=v}}}
test('save, reload, remove and preserve other region',()=>{
 const s=storage();const a=createFavorites(s,places);assert.equal(a.toggle(places[0]),true);a.toggle(places[1]);
 const b=createFavorites(s,places);assert.deepEqual(b.all(),places.slice(0,2));b.toggle(places[0]);assert.deepEqual(createFavorites(s,places).all(),[places[1]]);
});
test('same name in different prefectures remains distinct',()=>{
 const a=createFavorites(storage(),places);a.toggle(places[1]);assert.equal(a.has(places[2]),false);
});
test('reordered legacy IDs cannot change a saved region',()=>{
 const s=storage();createFavorites(s,places).toggle(places[0]);
 const changed=places.map((p,i)=>({...p,id:`loc-${3-i}`}));assert.deepEqual(createFavorites(s,changed).all(),[changed[0]]);
});
test('corrupt storage and unavailable storage do not crash or claim save',()=>{
 const a=createFavorites(storage('{'),places);assert.equal(a.available(),false);assert.equal(a.toggle(places[0]),true);
 const b=createFavorites({getItem(){throw Error()},setItem(){throw Error()}},places);assert.equal(b.toggle(places[0]),false);assert.deepEqual(b.all(),[]);
});
test('removed records are ignored and duplicate stored records collapse',()=>{
 const s=storage();const a=createFavorites(s,places);a.toggle(places[0]);assert.deepEqual(createFavorites(s,places.slice(1)).all(),[]);
 const duplicate=createFavorites({getItem:()=>JSON.stringify([{key:JSON.stringify(['名古屋市','愛知','中区'])},{key:JSON.stringify(['名古屋市','愛知','中区'])}])},places);assert.equal(duplicate.all().length,1);
});
