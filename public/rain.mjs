import {rainView} from './rain-model.mjs?v=5.3.0';
const $=id=>document.getElementById(id);
function render(){
 const view=rainView(window.bousaiRainState?.(),window.bousaiCurrentSelection?.()?.id);
 $('rain-health').textContent=({unknown:'現在の状態は未確認',partial:'一部地域は未確認',ready:'発表データ取得済み'})[view.state];
 $('rain-health').dataset.state=view.state;
 const selected=view.selected;
 $('rain-selection').textContent=selected?`${selected.prefecture} ${selected.name}：${!selected.checked?'区域照合またはデータ取得ができず未確認です。':selected.items.length?selected.items.map(i=>i.name).join(' ／ '):'取得した情報に大雨・氾濫の警報・注意報は含まれていません。安全を示すものではありません。'}`:'地域を選ぶと、その自治体の大雨・氾濫の発表を確認できます。';
 const list=$('rain-regions');list.replaceChildren();
 $('rain-count').textContent=view.state==='unknown'?'データを確認できません。公式情報をご確認ください。':`${view.points.length}登録地点に大雨・氾濫情報あり（先頭20件）。被害件数ではありません。`;
 for(const p of view.points.slice(0,20)){
  const b=document.createElement('button');b.type='button';b.textContent=`${p.prefecture} ${p.name}：${p.items.map(i=>i.name).join(' ／ ')}`;
  b.onclick=()=>{const place=window.bousaiLocations?.().find(x=>x.id===p.id);if(place)window.bousaiShowDetail?.(place)};list.append(b);
 }
}
document.addEventListener('bousai:rain-update',render);document.addEventListener('bousai:selection',render);
$('rain-refresh').onclick=()=>$('refresh-alerts')?.click();
render();setInterval(render,30000);
