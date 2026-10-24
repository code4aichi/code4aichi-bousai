import test from 'node:test';
import assert from 'node:assert/strict';
import {initWaterViews} from '../public/water-views.mjs';
function ui(hash=''){
 const fields=new Map(),listeners={};
 const element=id=>{if(!fields.has(id))fields.set(id,{id,hidden:false,open:false,attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.listeners[k]=fn},contains(target){return target.parent===this},focus(){this.focused=true},scrollIntoView(){this.scrolled=true}});return fields.get(id)};
 for(const id of ['water-view-nav','water-tab-current','water-current-panel','water-tab-facilities','water-facilities-panel','registered-facilities','water-tab-stock','water-stock-view','water-stock'])element(id);
 element('registered-facilities').parent=element('water-facilities-panel');element('water-stock').parent=element('water-stock-view');
 const win={location:{hash},history:{state:{keep:true},replaceState(state,title,next){this.lastState=state;win.location.hash=next}},addEventListener:(k,fn)=>listeners[k]=fn};
 initWaterViews({getElementById:id=>fields.get(id)||null},win);
 return {element,win,listeners,click:id=>element(id).listeners.click({preventDefault(){}}),key:(id,key)=>element(id).listeners.keydown({key,preventDefault(){}})};
}
test('water views default to announcements, with one active tab and one tabbable link',()=>{
 const h=ui();assert.equal(h.element('water-current-panel').hidden,false);assert.equal(h.element('water-facilities-panel').hidden,true);assert.equal(h.element('water-stock-view').hidden,true);
 assert.equal(h.element('water-tab-current').tabIndex,0);assert.equal(h.element('water-tab-stock').tabIndex,-1);assert.equal(h.element('water-view-nav').attributes.role,'tablist');
});
test('switching purpose opens its content and preserves existing input elements',()=>{
 const h=ui();h.element('water-stock').draft='7日分';h.click('water-tab-stock');assert.equal(h.element('water-stock').open,true);assert.equal(h.element('water-current-panel').hidden,true);
 h.click('water-tab-facilities');assert.equal(h.element('registered-facilities').open,true);h.click('water-tab-stock');assert.equal(h.element('water-stock').draft,'7日分');assert.deepEqual(h.win.history.lastState,{keep:true});
});
test('keyboard arrows wrap and home/end select and focus appropriate tabs',()=>{
 const h=ui();h.key('water-tab-current','ArrowLeft');assert.equal(h.element('water-tab-stock').attributes['aria-selected'],'true');assert.equal(h.element('water-tab-stock').focused,true);
 h.key('water-tab-stock','Home');assert.equal(h.element('water-tab-current').attributes['aria-selected'],'true');h.key('water-tab-current','End');assert.equal(h.element('water-tab-stock').attributes['aria-selected'],'true');
 h.key('water-tab-stock','ArrowRight');assert.equal(h.element('water-tab-current').attributes['aria-selected'],'true');
});
test('old facility and stock fragment links reveal the correct panel on load or hash change',()=>{
 const h=ui('#registered-facilities');assert.equal(h.element('water-facilities-panel').hidden,false);assert.equal(h.element('registered-facilities').scrolled,true);
 h.win.location.hash='#water-stock';h.listeners.hashchange();assert.equal(h.element('water-stock-view').hidden,false);
 h.win.location.hash='#map';h.listeners.hashchange();assert.equal(h.element('water-stock-view').hidden,false);
});
test('unknown or malformed fragments keep the announcements visible',()=>{
 for(const hash of ['#not-a-panel','#%broken']){const h=ui(hash);assert.equal(h.element('water-current-panel').hidden,false)}
});
