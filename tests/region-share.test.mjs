import test from 'node:test';
import assert from 'node:assert/strict';
import {regionShareURL,findSharedRegion,initRegionShare} from '../public/region-share.mjs';
const place={name:'名古屋市 中区',prefecture:'愛知',id:'loc-1',lat:35,lng:137,address:'住所'};
test('share URL contains only the region identity and restores the exact unique region',()=>{
 const url=regionShareURL(place),u=new URL(url);
 assert.equal(u.origin+u.pathname,'https://code4aichi.org/mieru-bosai/');
 assert.deepEqual([...u.searchParams.keys()],['pref','region']);
 assert.equal(findSharedRegion(url,[place]).place,place);
 assert.equal(findSharedRegion(url,[place,{...place}]).state,'invalid');
 assert.equal(findSharedRegion(url,[{...place,prefecture:'他県'}]).state,'invalid');
 assert.equal(findSharedRegion(url+'&region=別の地域',[place]).state,'invalid');
 assert.equal(findSharedRegion('https://code4aichi.org/mieru-bosai/',[place]).state,'none');
});
function ui({clipboard=true,url=regionShareURL(place),ready=true}={}){
 const elements=Object.fromEntries(['share-region','share-region-status','share-region-url','shared-region-notice'].map(id=>[id,{hidden:true,textContent:'',value:'',addEventListener(type,fn){this[type]=fn},focus(){this.focused=true},select(){this.selected=true}}]));
 const events={},opened=[];let selected=place,copied='';
 const doc={getElementById:id=>elements[id],addEventListener:(name,fn)=>events[name]=fn};
 const win={bousaiMapReady:ready,bousaiCurrentSelection:()=>selected,bousaiLocations:()=>[place],bousaiOpenSharedRegion:p=>opened.push(p),location:{href:url},navigator:clipboard?{clipboard:{writeText:async s=>{copied=s}}}:{}};
 initRegionShare(doc,win);return {elements,events,opened,win,get copied(){return copied},select:p=>{selected=p;events['bousai:selection']()}};
}
test('copy and manual fallback expose only a region URL',async()=>{
 let h=ui();assert.deepEqual(h.opened,[place]);await h.elements['share-region'].click();assert.equal(h.copied,regionShareURL(place));assert.match(h.elements['share-region-status'].textContent,/コピーしました/);
 h=ui({clipboard:false});await h.elements['share-region'].click();assert.equal(h.elements['share-region-url'].value,regionShareURL(place));assert.equal(h.elements['share-region-url'].selected,true);
 h.select({...place,name:'名古屋市'});assert.equal(h.elements['share-region-url'].hidden,true);
});
test('invalid shared region shows a message and never selects a different place',()=>{
 const h=ui({url:'https://code4aichi.org/mieru-bosai/?pref=愛知&region=架空市'});
 assert.equal(h.opened.length,0);assert.match(h.elements['shared-region-notice'].textContent,/特定できません/);
});
