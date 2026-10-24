import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {coastEligible,buildCoastOverlay,validateCoasts} from '../public/tsunami-coast-model.mjs';
const coasts=JSON.parse(fs.readFileSync(new URL('../public/tsunami-coasts.geojson',import.meta.url)));
const r={family:'tsunami',status:'通常',infoType:'発表',cancelled:false,eventId:'1',sourceURL:'report',updatedAt:'2026-10-24T12:00:00Z',reportedAt:'2026-10-24T12:00:00Z',areas:[{name:'愛知県外海',code:'390',category:'津波注意報',categoryCode:'62'}]};
function harness(fetcher=async()=>Response.json(coasts)){
 const elements=new Map(),listeners={},layers=[];
 const el=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',scrollIntoView(){}});return elements.get(id)};
 const map={getPane:()=>({}),stop(){},invalidateSize(){},fitBounds(){}};
 const window={map:{tagName:"SECTION"},bousaiMap:map,bousaiSeismicData:{retrievedAt:new Date().toISOString(),reports:[r]}};
 const context=vm.createContext({window,coastEligible,buildCoastOverlay,validateCoasts,Map,Date,Intl,String,Array,Number,fetch:fetcher,L:{geoJSON(data){const layer={data,removed:false,addTo(){layers.push(this);return this},remove(){this.removed=true},getBounds(){return {isValid:()=>true,pad(){return this}}}};return layer}},document:{getElementById:el,addEventListener:(name,fn)=>listeners[name]=fn}});
 const source=fs.readFileSync(new URL('../public/tsunami-map.mjs',import.meta.url),'utf8').replace(/^import .*\n/,'');vm.runInContext(source,context);
 const click=area=>listeners.click({target:{closest:()=>({dataset:{tsunamiReport:'0',tsunamiArea:area}})}});
 return {elements,listeners,layers,window,click};
}
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
test('clicking a bulletin draws only its named region and labels map as historical',async()=>{
 const h=harness();h.click('390');await settle();assert.equal(h.layers.length,1);assert.equal(h.layers[0].data.features.length,1);assert.match(h.elements.get('tsunami-map-caption').textContent,/現在の警報図ではありません/);assert.equal(h.elements.get('tsunami-history-badge').hidden,false);
 h.elements.get('clear-tsunami-map').onclick();assert.equal(h.layers[0].removed,true);assert.equal(h.elements.get('tsunami-history-badge').hidden,true);
});
test('replacement or cancellation of a selected report clears its old coastline',async()=>{
 const h=harness();h.click();await settle();h.window.bousaiSeismicData={retrievedAt:new Date().toISOString(),reports:[{...r,updatedAt:'2026-10-24T13:00:00Z',infoType:'取消',cancelled:true}]};h.listeners['bousai:seismic-data']();assert.equal(h.layers[0].removed,true);assert.match(h.elements.get('tsunami-map-message').textContent,/解除しました/);
});
test('fetch failure and stale seismic data do not leave a coastline displayed',async()=>{
 const failed=harness(async()=>{throw Error()});failed.click();await settle();assert.equal(failed.layers.length,0);assert.match(failed.elements.get('tsunami-map-message').textContent,/読み込めませんでした/);
 const h=harness();h.click();await settle();h.window.bousaiSeismicData=null;h.listeners['bousai:seismic-data']();assert.equal(h.layers[0].removed,true);
});
test('clearing during geometry download prevents the delayed response from drawing old lines',async()=>{
 let done;const h=harness(()=>new Promise(resolve=>done=resolve));h.click();h.elements.get('clear-tsunami-map').onclick();done(Response.json(coasts));await settle();assert.equal(h.layers.length,0);
});
