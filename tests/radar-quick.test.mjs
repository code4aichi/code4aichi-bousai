import test from 'node:test';
import assert from 'node:assert/strict';
import {initRadarQuick} from '../public/radar-quick.mjs';

test('quick radar switch shares state and emits the existing radar change event',()=>{
 class Element extends EventTarget{attrs={};hidden=true;checked=true;setAttribute(k,v){this.attrs[k]=v}}
 const button=new Element(),control=new Element();
 const doc={getElementById:id=>id==='show-radar'?control:button};
 let changes=0;control.addEventListener('change',()=>changes++);
 initRadarQuick(doc,{Event});
 assert.equal(button.hidden,false);assert.equal(button.attrs['aria-pressed'],'true');
 button.dispatchEvent(new Event('click'));
 assert.equal(control.checked,false);assert.equal(changes,1);
 assert.equal(button.attrs['aria-pressed'],'false');assert.equal(button.textContent,'雨雲：非表示');
 control.checked=true;control.dispatchEvent(new Event('change'));
 assert.equal(button.attrs['aria-pressed'],'true');
 assert.match(button.attrs['aria-label'],/非表示にする/);
});
test('missing radar controls leave other page functions available',()=>{
 assert.doesNotThrow(()=>initRadarQuick({getElementById:()=>null},{}));
});
