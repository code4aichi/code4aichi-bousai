import test from 'node:test';
import assert from 'node:assert/strict';
import {evacuationMapURL,initEvacuationLinks} from '../public/evacuation-links.mjs';
const place={name:'名古屋市',prefecture:'愛知',lat:35.17,lng:136.90};
test('official map URL uses only a valid registered point and a permitted disaster layer',()=>{
 const u=evacuationMapURL(place,'skhb01');assert.match(u,/^https:\/\/maps\.gsi\.go\.jp\/#13\/35\.170000\/136\.900000\//);assert.match(u,/std%7Cskhb01/);
 assert.match(evacuationMapURL(place,'sih'),/lcd=sih/);
 for(const layer of ['other','skhb01&evil=1','',null])assert.equal(evacuationMapURL(place,layer),null);
 for(const bad of [{...place,lat:NaN},{...place,lng:181},{...place,lat:'35'}])assert.equal(evacuationMapURL(bad,'sih'),null);
});
test('changing selection or hazard updates the link without using current geolocation',()=>{
 class Element extends EventTarget{hidden=false;value='skhb01';removeAttribute(k){delete this[k]}}
 const select=new Element(),link=new Element(),note=new Element(),doc=new EventTarget();doc.getElementById=id=>({'evacuation-kind':select,'evacuation-map-link':link,'evacuation-region-note':note}[id]);
 let current=place;const win={bousaiCurrentSelection:()=>current,bousaiCurrentPosition(){assert.fail('must not access geolocation')}};
 initEvacuationLinks(doc,win);assert.match(link.href,/skhb01/);assert.match(note.textContent,/名古屋市/);
 select.value='sih';select.dispatchEvent(new Event('change'));assert.match(link.href,/sih/);
 current={name:'豊田市',prefecture:'愛知',lat:35.08,lng:137.16};doc.dispatchEvent(new Event('bousai:selection'));assert.match(link.href,/35\.080000\/137\.160000/);
 current=null;doc.dispatchEvent(new Event('bousai:selection'));assert.equal(link.hidden,true);assert.equal(link.href,undefined);
});
