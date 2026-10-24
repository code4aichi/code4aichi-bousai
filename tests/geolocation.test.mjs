import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function setup(){const button={disabled:false},status={textContent:''},calls=[],markers=[];let success,failure;
 const ctx=vm.createContext({window:{map:{stop(){},setView:(point,zoom)=>calls.push({point,zoom})}},navigator:{geolocation:{getCurrentPosition:(ok,err,options)=>{success=ok;failure=err;calls.push(options)}}},Number,Math,Date,Event,document:{getElementById:id=>id==='locate-me'?button:status,addEventListener(){},dispatchEvent(){}},L:{divIcon:x=>x,marker:(point,options)=>({addTo(){markers.push({point,options});return this},bindPopup(){},remove(){}}),circle:()=>({addTo(){return this},remove(){}})}});
 vm.runInContext(fs.readFileSync(new URL('../public/geolocation.js',import.meta.url),'utf8'),ctx);return {button,status,calls,markers,success:p=>success(p),failure:e=>failure(e)};
}
test('location permission is requested only after pressing the button',()=>{const h=setup();assert.equal(h.calls.length,0);h.button.onclick();assert.equal(h.calls.length,1);assert.equal(h.calls[0].maximumAge,0);assert.equal(h.button.disabled,true)});
test('successful location gets the blue icon, accurate position and approximate accuracy',()=>{const h=setup();h.button.onclick();h.success({coords:{latitude:35.1,longitude:136.9,accuracy:24.5}});assert.equal(h.markers[0].options.icon.className,'current-location-marker');assert.deepEqual(Array.from(h.markers[0].point),[35.1,136.9]);assert.match(h.status.textContent,/約25m/);assert.equal(h.button.disabled,false)});
test('denied and timed-out locations have no fallback or fabricated current-location pin',()=>{for(const code of [1,3]){const h=setup();h.button.onclick();h.failure({code});assert.equal(h.markers.length,0);assert.match(h.status.textContent,code===1?/許可されていません/:/タイムアウト/);assert.equal(h.button.disabled,false)}});
