import test from 'node:test';
import assert from 'node:assert/strict';
import {radarTime,selectRadarFrame,radarTileURL,radarFresh,radarCandidates,RADAR_TIMES} from '../public/radar-model.mjs';
import {radarData} from '../src/radar.js';
import {initRadar,verifyRadarImage} from '../public/radar.mjs';
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
function ui(fetcher=async()=>Response.json({ok:true,frame}),ImageClass,defaultOn=false,mapReady=true){
 const els=new Map(['show-radar','radar-status','radar-map-badge','radar-refresh','radar-previous','radar-latest'].map(id=>[id,{checked:false,disabled:false,hidden:false,dataset:{},events:{},addEventListener(e,f){this.events[e]=f}}]));
 els.get('show-radar').checked=defaultOn;
 const layers=[],timers=[],events={};let clock=now;
 const map={getPane:()=>({}),createPane:()=>({style:{}})};
 const leaflet={TileLayer:{prototype:{_clampZoom:z=>z},extend(methods){return function(url,options){const l={url,options,events:{},on(e,f){this.events[e]=f;return this},addTo(){layers.push(this);return this},remove(){this.removed=true}};Object.assign(l,methods);return l}}}};
 const doc={getElementById:id=>els.get(id),addEventListener(e,f){events[e]=f}};
 const win={bousaiMap:mapReady?map:null,Image:ImageClass,addEventListener(){}};
 const h=initRadar({doc,win,leaflet,fetcher,now:()=>clock,timer:f=>timers.push(f)});
 return {...h,ready(){win.bousaiMap=map;events['bousai:map-ready']()},el:id=>els.get(id),layers,timers,clock:t=>clock=t,enable(){els.get('show-radar').checked=true;return els.get('show-radar').events.change()},off(){els.get('show-radar').checked=false;els.get('show-radar').events.change()}};
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

test('fallback candidates are bounded, ordered, recent UTC observation times',()=>{
 const c=radarCandidates(now);assert.equal(c.length,3);assert.equal(c[0].validtime,'20261026071500');assert.equal(c[2].validtime,'20261026070500');for(const f of c)assert.equal(radarFresh(f,now),true);
});
test('failed metadata can display only an actually loaded image and remains partial',async()=>{
 let attempts=0;
 class Img{naturalWidth=256;naturalHeight=256;set src(value){if(!value)return;attempts++;queueMicrotask(()=>attempts===1?this.onerror?.():this.onload?.())}}
 const h=ui(async()=>new Response('',{status:502}),Img);await h.enable();assert.equal(attempts,2);assert.equal(h.layers.length,1);assert.match(h.layers[0].url,/20261026071000/);h.layers[0].events.load();assert.equal(h.el('radar-status').dataset.fetchState,'partial');assert.match(h.el('radar-status').textContent,/画像公開確認/);
});
test('unavailable or wrong-sized probe images never create a radar layer',async()=>{
 let attempts=0;class Img{naturalWidth=1;naturalHeight=1;set src(value){if(!value)return;attempts++;queueMicrotask(()=>this.onload?.())}}
 const h=ui(async()=>{throw Error()},Img);await h.enable();assert.equal(attempts,3);assert.equal(h.layers.length,0);assert.equal(h.el('radar-status').dataset.fetchState,'failed');
});
test('aborting a pending image probe cannot leave the request waiting or recreate a layer',async()=>{
 class Img{set src(value){}}
 const controller=new AbortController();const pending=verifyRadarImage(frame,{ImageClass:Img,signal:controller.signal});controller.abort();await assert.rejects(pending,/Aborted/);
});

test('default-enabled radar waits for map readiness and does not re-enable after user switches it off',async()=>{const h=ui(undefined,undefined,true,false);assert.equal(h.layers.length,0);assert.equal(h.el('show-radar').checked,true);h.ready();await new Promise(r=>setImmediate(r));assert.equal(h.layers.length,1);h.off();h.ready();await new Promise(r=>setImmediate(r));assert.equal(h.layers.length,1);assert.equal(h.layers[0].removed,true)});

test('past radar is verified, explicitly labelled, kept until latest is requested and removed when too old',async()=>{
 class Img{naturalWidth=256;naturalHeight=256;set src(value){if(value)queueMicrotask(()=>this.onload?.())}}
 const h=ui(undefined,Img);await h.enable();await h.el('radar-previous').onclick();
 assert.match(h.layers[1].url,/20261026070500/);h.layers[1].events.load();
 assert.match(h.el('radar-status').textContent,/過去の実況/);assert.match(h.el('radar-map-badge').textContent,/過去/);
 assert.equal(h.el('radar-status').dataset.fetchState,'partial');h.timers[1]();assert.equal(h.layers.length,2);
 await h.el('radar-latest').onclick();assert.match(h.layers[2].url,/20261026071000/);h.layers[2].events.load();assert.doesNotMatch(h.el('radar-map-badge').textContent,/過去/);
 await h.el('radar-previous').onclick();h.clock(now+41*60000);h.timers[0]();assert.equal(h.el('radar-status').dataset.fetchState,'failed');assert.equal(h.layers.at(-1).removed,true);
});
test('unavailable previous radar image clears old layer and offers latest',async()=>{
 class Img{set src(value){if(value)queueMicrotask(()=>this.onerror?.())}}
 const h=ui(undefined,Img);await h.enable();await h.el('radar-previous').onclick();assert.equal(h.layers[0].removed,true);assert.match(h.el('radar-status').textContent,/取得できません/);assert.equal(h.el('radar-latest').disabled,false);
});
test('disabling while verifying previous image cannot add it later',async()=>{
 let probe;class Img{set src(value){if(value)probe=this}}
 const h=ui(undefined,Img);await h.enable();const pending=h.el('radar-previous').onclick();h.off();probe.onload?.();await pending;assert.equal(h.layers.length,1);assert.equal(h.el('radar-status').dataset.fetchState,'off');
});
