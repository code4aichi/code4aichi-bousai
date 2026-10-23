import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
test('saved region replaces conflicting filters, renders its marker, then zooms to detail',()=>{
 const events=[];const fields={'location-search':{value:'札幌'},'pref-filter':{value:'北海道'}};
 const ctx=vm.createContext({window:{},document:{getElementById:id=>fields[id],querySelector:()=>({scrollIntoView:()=>events.push('scroll')})}});
 vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/boot\(\);\s*$/,''),ctx);
 ctx.events=events;
 vm.runInContext(`map={stop(){events.push('stop')},invalidateSize(){events.push('resize')},setView(point,zoom,options){events.push({point,zoom,options})}};showDetail=p=>events.push('render');`,ctx);
 ctx.place={id:'loc-3',name:'名古屋市',prefecture:'愛知',lat:35.18,lng:136.90,address:''};
 vm.runInContext('openSavedRegion(place)',ctx);
 assert.equal(fields['location-search'].value,'名古屋市');assert.equal(fields['pref-filter'].value,'愛知');
 assert.equal(vm.runInContext('matches(place)',ctx),true);
 assert.equal(vm.runInContext("matches({id:'loc-4',name:'名古屋市',prefecture:'愛知'})",ctx),false);
 assert.equal(events[0],'render');assert.equal(events[3].zoom,14);assert.deepEqual(Array.from(events[3].point),[35.18,136.90]);assert.equal(events[3].options.animate,false);
});
