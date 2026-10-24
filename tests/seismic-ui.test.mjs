import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
async function ui(payload,reject=false){
 const fields=new Map(),layers=[];
 const el=id=>{if(!fields.has(id))fields.set(id,{checked:true,disabled:false,textContent:'',innerHTML:''});return fields.get(id)};
 const map={};const group={addTo(){return this},clearLayers(){layers.length=0},addLayer(m){layers.push(m)}};
 const context=vm.createContext({window:{map},L:{layerGroup:()=>group,divIcon:x=>x,marker:(point,options)=>({point,options,bindPopup(){return this}})},Date,Intl,Map,Number,String,Array,Math,AbortSignal,setInterval(){},document:{hidden:false,getElementById:el,addEventListener(){},querySelectorAll:()=>[]},fetch:async()=>{if(reject)throw Error();return Response.json(payload)}});
 vm.runInContext(fs.readFileSync(new URL('../public/seismic.js',import.meta.url),'utf8'),context);
 for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 return {fields,layers};
}
const r={family:'earthquake',status:'通常',infoType:'発表',hypocenter:'テスト震源',sourceURL:'test',reportedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),originTime:new Date().toISOString(),maxIntensity:'5-',magnitude:'5.5',coordinates:{lat:35,lng:137}};
const data=reports=>({ok:true,complete:true,retrievedAt:new Date().toISOString(),reports});
test('only normal uncancelled origins become map markers; training remains labelled in history',async()=>{
 const {layers,fields}=await ui(data([r,{...r,status:'訓練'},{...r,infoType:'取消',cancelled:true}]));assert.equal(layers.length,1);assert.match(fields.get('earthquake-reports').innerHTML,/5弱/);assert.match(fields.get('earthquake-reports').innerHTML,/訓練/);
});
test('empty tsunami history explicitly does not decide current warning status',async()=>{
 const {fields}=await ui(data([]));assert.match(fields.get('tsunami-reports').innerHTML,/判定できません/);
});
test('failed or stale API responses clear map origins and show unknown state',async()=>{
 for(const reject of [true,false]){const {fields,layers}=await ui({...data([r]),retrievedAt:new Date(Date.now()-180000).toISOString()},reject);assert.equal(layers.length,0);assert.match(fields.get('seismic-summary').textContent,/未確認/);}
});
