import test from 'node:test';
import assert from 'node:assert/strict';
import {radarTime,selectRadarFrame,radarTileURL,radarFresh,RADAR_TIMES} from '../public/radar-model.mjs';
import {radarData} from '../src/radar.js';
import {initRadar} from '../public/radar.mjs';
const stamp='20261026071000',now=Date.parse('2026-10-26T07:15:00Z');
const row={basetime:stamp,validtime:stamp,elements:['hrpns']},frame=selectRadarFrame([row],now);
test('only fresh observed precipitation frames qualify; invalid dates and forecasts never become observations',()=>{
 assert.equal(radarTime('20260230000000'),null);assert.equal(radarTime('20261026071000'),'2026-10-26T07:10:00Z');
 assert.throws(()=>selectRadarFrame([{...row,validtime:'20261026072000'}],now));assert.throws(()=>selectRadarFrame([{...row,elements:['thns']}],now));assert.throws(()=>selectRadarFrame([row],now+16*60000));
 assert.throws(()=>selectRadarFrame([row],now-10*60000));assert.equal(radarFresh(frame,now),true);assert.match(radarTileURL(frame),/\/surf\/hrpns\/\{z\}/);assert.throws(()=>radarTileURL({...frame,basetime:'../bad'}));
});
test('metadata fetch uses the fixed official endpoint and rejects HTTP errors and old metadata',async()=>{
 let requested;const d=await radarData(async u=>{requested=u;return Response.json([row])},now);assert.equal(requested,RADAR_TIMES);assert.equal(d.frame.validtime,stamp);
 await assert.rejects(()=>radarData(async()=>new Response('',{status:503}),now));await assert.rejects(()=>radarData(async()=>Response.json([row]),now+3600000));
});
function ui(fetcher=async()=>Response.json({ok:true,frame})){
 const els=new Map(['show-radar','radar-status','radar-map-badge','radar-refresh'].map(id=>[id,{checked:false,disabled:false,hidden:false,dataset:{},events:{},addEventListener(e,f){this.events[e]=f}}]));
 const layers=[],timers=[],events={};let clock=now;
 const map={getPane:()=>({}),createPane:()=>({style:{}})};
 const leaflet={TileLayer:{prototype:{_clampZoom:z=>z},extend(methods){return function(url,options){const l={url,options,events:{},on(e,f){this.events[e]=f;return this},addTo(){layers.push(this);return this},remove(){this.removed=true}};Object.assign(l,methods);return l}}}};
 const doc={getElementById:id=>els.get(id),addEventListener(e,f){events[e]=f}};
 const h=initRadar({doc,win:{bousaiMap:map,addEventListener(){}},leaflet,fetcher,now:()=>clock,timer:f=>timers.push(f)});
 return {...h,el:id=>els.get(id),layers,timers,clock:t=>clock=t,enable(){els.get('show-radar').checked=true;return els.get('show-radar').events.change()},off(){els.get('show-radar').checked=false;els.get('show-radar').events.change()}};
}
test('initially off; explicit enable adds only the radar layer without moving or zooming the map',async()=>{
 const h=ui();assert.equal(h.layers.length,0);await h.enable();assert.equal(h.layers.length,1);assert.equal(h.layers[0].options.pane,'rain-radar');assert.equal(h.layers[0]._clampZoom(5),4);assert.equal(h.layers[0]._clampZoom(8),8);h.layers[0].events.load();assert.equal(h.el('radar-status').dataset.fetchState,'ok');h.off();assert.equal(h.layers[0].removed,true);assert.equal(h.el('radar-map-badge').hidden,true);
});
test('tile errors stay unknown/partial; metadata failures remove the preceding layer',async()=>{
 let fail=false;const h=ui(async()=>{if(fail)throw Error();return Response.json({ok:true,frame})});await h.enable();h.layers[0].events.tileerror();h.layers[0].events.load();assert.equal(h.el('radar-status').dataset.fetchState,'partial');fail=true;await h.refresh();assert.equal(h.layers[0].removed,true);assert.equal(h.el('radar-status').dataset.fetchState,'failed');
});
test('disabling during metadata fetch cannot recreate the layer after the response arrives',async()=>{
 let done;const h=ui(()=>new Promise(r=>done=r));const pending=h.enable();h.off();done(Response.json({ok:true,frame}));await pending;assert.equal(h.layers.length,0);assert.equal(h.el('radar-status').dataset.fetchState,'off');
});
test('expired frames are removed, and late tile events cannot restore the old status',async()=>{
 const h=ui();await h.enable();h.clock(now+16*60000);h.timers[0]();assert.equal(h.layers[0].removed,true);h.layers[0].events.load();assert.equal(h.el('radar-status').dataset.fetchState,'failed');
});
