import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOD_TILE,FLOOD_LEGEND,initFloodHazard} from '../public/flood-hazard.mjs';
function ui({ready=true}={}){
 class Elem extends EventTarget{checked=false;hidden=false;dataset={};removeAttribute(k){delete this[k]}}
 const ids=['show-flood-hazard','show-radar','flood-hazard-status','flood-hazard-map-info','flood-hazard-legend'];const els=Object.fromEntries(ids.map(i=>[i,new Elem()]));
 const doc=new EventTarget();doc.getElementById=id=>els[id];const map={getPane:()=>({}),createPane:()=>({style:{}})},layers=[];
 const leaflet={tileLayer:(url,opts)=>{const l={url,opts,events:{},on(e,fn){this.events[e]=fn;return this},addTo(){layers.push(this);return this},remove(){this.removed=true}};return l}};
 const win={Event,bousaiMap:ready?map:null};initFloodHazard({doc,win,leaflet});
 return {els,layers,doc,win,map,toggle(id,value){els[id].checked=value;els[id].dispatchEvent(new Event('change'))}};
}
test('flood overlay replaces radar, keeps map view and shows source legend with partial error state',()=>{
 const h=ui();h.toggle('show-radar',true);h.toggle('show-flood-hazard',true);
 assert.equal(h.els['show-radar'].checked,false);assert.equal(h.layers[0].url,FLOOD_TILE);assert.equal(h.layers[0].opts.maxNativeZoom,17);
 assert.equal(h.els['flood-hazard-map-info'].hidden,false);assert.equal(h.els['flood-hazard-legend'].src,FLOOD_LEGEND);
 h.layers[0].events.tileerror();h.layers[0].events.load();assert.equal(h.els['flood-hazard-status'].dataset.fetchState,'partial');
 h.toggle('show-radar',true);assert.equal(h.els['show-flood-hazard'].checked,false);assert.equal(h.layers[0].removed,true);assert.equal(h.els['flood-hazard-map-info'].hidden,true);
 h.layers[0].events.load();assert.equal(h.els['flood-hazard-status'].dataset.fetchState,'off');
});
test('no map is unknown and can be retried when ready',()=>{
 const h=ui({ready:false});h.toggle('show-flood-hazard',true);assert.equal(h.els['flood-hazard-status'].dataset.fetchState,'failed');
 h.win.bousaiMap=h.map;h.doc.dispatchEvent(new Event('bousai:map-ready'));assert.equal(h.layers.length,1);
 h.layers[0].events.load();assert.match(h.els['flood-hazard-status'].textContent,/安全とは限りません/);
});
