import test from 'node:test';
import assert from 'node:assert/strict';
import {initMobileLayout} from '../public/mobile-layout.mjs';
function ui(mobile=true,hash=''){
 const fields=new Map(),events={};let notify,mediaChange;
 const ids=['mobile-region-list','mobile-seismic','mobile-site-info','mobile-facility-saves','region-browser','result-count','mobile-region-count','seismic-status','seismic-summary','mobile-seismic-health','water-provider-details','water-report-filter','location-search','pref-filter','concept'];
 const el=id=>fields.get(id);
 for(const id of ids)fields.set(id,{id,tagName:id.startsWith('mobile-')&&!id.endsWith('health')&&!id.endsWith('count')||id==='water-provider-details'?'DETAILS':'DIV',open:!['mobile-seismic','mobile-site-info'].includes(id),hidden:false,textContent:'',value:'',dataset:{},events:{},parentElement:null,classList:{contains:()=>false},addEventListener(e,fn){this.events[e]=fn},scrollIntoView(){this.scrolled=true}});
 el('result-count').textContent='1,916件';el('seismic-summary').textContent='地震・津波の発表履歴を確認しています…';el('concept').parentElement=el('mobile-site-info');
 const media={matches:mobile,addEventListener:(e,fn)=>mediaChange=fn};
 const win={map:{tagName:'SECTION'},matchMedia:()=>media,location:{hash},addEventListener:(e,fn)=>events[e]=fn,MutationObserver:class{constructor(fn){notify=fn}observe(){}}};
 initMobileLayout({getElementById:el},win);
 return {el,events,win,notify:()=>notify(),resize:value=>{media.matches=value;mediaChange()}};
}
test('mobile initially folds secondary content while keeping status visible in summaries',()=>{
 const h=ui();for(const id of ['mobile-region-list','mobile-seismic','mobile-site-info','mobile-facility-saves','water-provider-details'])assert.equal(h.el(id).open,false);
 assert.equal(h.el('mobile-region-count').textContent,'1,916件');assert.equal(h.el('mobile-seismic-health').dataset.state,'loading');
 h.el('seismic-status').classList.contains=c=>c==='failed';h.notify();assert.equal(h.el('mobile-seismic-health').textContent,'取得失敗');
});
test('desktop region list stays expanded while secondary panels stay folded across breakpoints',()=>{
 const h=ui(false);assert.equal(h.el('mobile-region-list').open,true);assert.equal(h.el('mobile-seismic').open,false);h.resize(true);assert.equal(h.el('mobile-region-list').open,false);h.el('mobile-seismic').open=true;h.notify();assert.equal(h.el('mobile-seismic').open,true);h.resize(false);assert.equal(h.el('mobile-site-info').open,false);
});
test('search interactions reveal region results and selected detail hides the empty list wrapper',()=>{
 const h=ui();h.el('location-search').value='名古屋';h.el('location-search').events.input();assert.equal(h.el('mobile-region-list').open,true);h.el('region-browser').hidden=true;h.notify();assert.equal(h.el('mobile-region-list').hidden,true);assert.equal(h.el('location-search').value,'名古屋');h.el('region-browser').hidden=false;h.notify();assert.equal(h.el('mobile-region-list').hidden,false);
});
test('fragment links open hidden parent disclosures on load and navigation',()=>{
 const h=ui(true,'#concept');assert.equal(h.el('mobile-site-info').open,true);assert.equal(h.el('concept').scrolled,true);h.el('mobile-site-info').open=false;h.win.location.hash='#concept';h.events.hashchange();assert.equal(h.el('mobile-site-info').open,true);
});
test('unrelated fragments are harmless and selecting an emergency source keeps its details open',()=>{
 const h=ui();h.win.location.hash='#%bad';h.events.hashchange();h.el('water-report-filter').value='yokohama';h.resize(false);h.resize(true);assert.equal(h.el('water-provider-details').open,true);
});

test('a deep link opens both the outer water section and inner facility disclosure',()=>{const h=ui();const outer=h.el('mobile-site-info'),inner=h.el('mobile-seismic');inner.parentElement=outer;h.win.location.hash='#mobile-seismic';h.events.hashchange();assert.equal(inner.open,true);assert.equal(outer.open,true)});
