import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const items=new Map(),events={};let notify;
 const el=id=>{if(!items.has(id))items.set(id,{textContent:'取得完了',checked:true,dataset:{},classList:{contains:()=>false},querySelectorAll:()=>[],addEventListener:(event,fn)=>events[id+':'+event]=fn});return items.get(id)};
 for(const id of ['show-planned-water','show-advisories','show-facilities','show-radar','show-flood-hazard'])el(id).checked=false;
 const ctx=vm.createContext({MutationObserver:class{constructor(fn){notify=fn}observe(){}},document:{getElementById:el,addEventListener:(event,fn)=>events[event]=fn}});
 vm.runInContext(fs.readFileSync(new URL('../public/compact-controls.js',import.meta.url),'utf8'),ctx);return {el,events,notify:()=>notify()};
}
test('fetch failures remain visible in the collapsed toolbar, and recover when fetch succeeds',()=>{
 const h=setup();assert.equal(h.el('map-fetch-health').textContent,'データ取得済み');
 h.el('water-summary').textContent='水の情報を取得できません。';h.notify();assert.equal(h.el('map-fetch-health').textContent,'取得失敗あり');
 h.el('water-summary').textContent='水の情報を取得しました。';h.el('seismic-summary').textContent='一部取得失敗・掲載漏れの可能性があります';h.notify();assert.equal(h.el('map-fetch-health').dataset.state,'failed');
 h.el('seismic-summary').textContent='一部未確認';h.notify();assert.equal(h.el('map-fetch-health').textContent,'一部未確認');
});
test('layer summary follows both checkbox changes and programmatic changes made by map buttons',()=>{
 const h=setup();assert.equal(h.el('map-layer-summary').textContent,'水・警報・地震');
 h.el('show-earthquakes').checked=false;h.events['show-earthquakes:change']();assert.equal(h.el('map-layer-summary').textContent,'水・警報');
 h.el('show-planned-water').checked=true;h.events.click({target:{closest:()=>null}});assert.equal(h.el('map-layer-summary').textContent,'水・工事予定・警報');
});
test('saved-region count is visible while collapsed and selection closes the saved panel',()=>{
 const h=setup();h.el('saved-regions-list').querySelectorAll=()=>[{},{}];h.notify();assert.equal(h.el('saved-regions-count').textContent,'2件');
 h.el('saved-regions-panel').open=true;h.events.click({target:{closest:()=>({})}});assert.equal(h.el('saved-regions-panel').open,false);
});

test('successful facility data retrieval is distinct from unconfirmed facility opening status',()=>{const h=setup();h.el('facility-summary').textContent='登録データを取得しました。開設状況は未確認です。';h.el('facility-summary').dataset.fetchState='ok';h.notify();assert.equal(h.el('map-fetch-health').textContent,'データ取得済み');h.el('facility-summary').dataset.fetchState='partial';h.notify();assert.equal(h.el('map-fetch-health').textContent,'一部未確認')});

test('enabled radar failures are included in the toolbar, but disabled radar does not block other sources',()=>{
 const h=setup();h.el('radar-status').dataset.fetchState='failed';h.notify();assert.equal(h.el('map-fetch-health').dataset.state,'ok');h.el('show-radar').checked=true;h.events['show-radar:change']();assert.equal(h.el('map-fetch-health').dataset.state,'failed');assert.match(h.el('map-layer-summary').textContent,/雨雲/);
});

test('flood layer affects summary only while enabled',()=>{const h=setup();h.el('flood-hazard-status').dataset.fetchState='partial';h.notify();assert.equal(h.el('map-fetch-health').dataset.state,'ok');h.el('show-flood-hazard').checked=true;h.events['show-flood-hazard:change']();assert.match(h.el('map-layer-summary').textContent,/洪水想定/);assert.equal(h.el('map-fetch-health').dataset.state,'partial')});
