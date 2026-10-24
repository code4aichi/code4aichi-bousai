import {calculateWaterStock} from './water-stock-model.mjs';
const $=id=>document.getElementById(id),number=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:1});
function render(){
 const result=calculateWaterStock({people:$('stock-people').value,days:$('stock-days').value,stock:$('stock-litres').value});
 for(const [key,id] of [['people','stock-people'],['days','stock-days'],['stock','stock-litres']])$(id).setAttribute('aria-invalid',String(!result.ok&&!!result.errors[key]));
 $('stock-result').hidden=!result.ok;
 if(!result.ok){$('stock-message').textContent=Object.values(result.errors).join(' ');return}
 $('stock-required').textContent=`${number(result.required)}L`;
 $('stock-formula').textContent=`${result.people}人 × ${result.days}日 × 3L。2L容器なら合計${number(result.requiredBottles)}本分が目安です。`;
 $('stock-shortage').textContent=result.shortage===null?'未計算':`${number(result.shortage)}L`;
 $('stock-extra').textContent=result.shortage===null?'現在の備蓄量を入力すると、不足分を計算します。':result.shortage>0?`入力した備蓄${number(result.stock)}Lに対し、2L容器で追加${number(result.extraBottles)}本分が目安です。`:'入力した備蓄量は、この人数・日数で計算した目標量以上です。';
 $('stock-message').textContent=`必要量の目安は${number(result.required)}L。${result.shortage===null?'備蓄量が未入力のため、不足分は未計算です。':`入力した備蓄量に対する不足分は${number(result.shortage)}Lです。`}飲料・調理用の概算であり、水の品質・保管状態や、災害時に十分かどうかを判定するものではありません。`;
}
for(const id of ['stock-people','stock-days','stock-litres'])$(id).addEventListener(id==='stock-days'?'change':'input',render);
$('stock-reset').onclick=()=>{$('stock-people').value='1';$('stock-days').value='3';$('stock-litres').value='';render()};
render();
