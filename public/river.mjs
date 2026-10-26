import {selectRiverReports} from './river-model.mjs?v=5.5.0';
const $=id=>document.getElementById(id);
const time=s=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(s))+' JST';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,busy=false;
export function freshRiver(d,now=Date.now()){const t=Date.parse(d?.retrievedAt);return !!d?.ok&&Array.isArray(d.reports)&&Number.isFinite(t)&&now-t<=600000&&now-t>=-60000}
function render(){
 const list=$('river-reports');list.replaceChildren();
 if(!freshRiver(data)){$('river-status').textContent='河川の発表履歴は未確認です。公式情報をご確認ください。';return}
 const q=$('river-query').value;
 const selection=window.bousaiCurrentSelection?.();
 const identity=window.bousaiRainState?.()?.points.find(p=>p.id===selection?.id);
 const view=selectRiverReports(data.reports,{query:q,selectionOnly:$('river-selected-only').checked,areaCode:identity?.areaCode,latestOnly:$('river-latest-only').checked});
 const reports=view.reports;
 $('river-selection-note').textContent=selection?`${selection.prefecture} ${selection.name}：${identity?.areaCode?'自治体コードで電文の浸水想定地区と照合します。冠水発生の確認ではありません。':'気象庁区域との対応が未確認のため、地域による絞り込みはできません。'}`:'地図・地域一覧から自治体を選択すると、関連する履歴に絞れます。';
 if(view.unknownArea){list.textContent='選択地域の自治体コードが未確認です。「選択地域のみ」を外すと取得した全地域の履歴を確認できます。';$('river-status').textContent='地域の照合ができず未確認です。';return}

 $('river-status').textContent=`${time(data.retrievedAt)}取得 ／ ${data.complete?'掲載範囲の電文を取得':'一部取得失敗・要再確認'} ／ ${data.reports.length}通${data.truncated?'（最新12通まで）':''}。表示${reports.length}通。現在の警報一覧ではありません。`;
 if(!reports.length){list.textContent=(q||$('river-selected-only').checked)?'取得した範囲に、この条件に一致する履歴はありません。自治体情報が記載されていない電文は地域で絞れません。警報・冠水がないことを示すものではありません。':'取得した公開フィードの掲載範囲に洪水予報はありません。現在の洪水・冠水の有無は判定できません。';return}
 for(const r of reports){
  const a=document.createElement('article');a.className='river-report';
  const river=(r.regions||[]).filter(a=>a.type==='河川').map(a=>a.name);
  a.innerHTML=`<b>${esc(r.title)}</b><p>${esc(r.status)}・${esc(r.infoType)} ／ 発表：${esc(time(r.reportedAt))}<br>電文更新：${esc(time(r.updatedAt))}</p><p>${esc(r.headline)}</p>${(r.municipalities||[]).length?`<details><summary>電文記載の浸水想定地区（${r.municipalities.length}自治体）</summary><p>${esc(r.municipalities.map(m=>m.prefecture+m.name).join('・'))}（冠水実績ではありません）</p></details>`:''}${river.length?`<p>河川：${esc([...new Set(river)].join('・'))}</p>`:''}<details><summary>発表元・電文記載の観測水位</summary><p>${esc(r.office)}</p><a href="${esc(r.sourceURL)}" target="_blank" rel="noopener noreferrer">気象庁の原電文（XML） ↗</a>${(r.levels||[]).length?(r.levels||[]).map(l=>`<p>${esc(l.station)}（${esc(l.location)}）：${esc(l.value)} m<br>観測：${esc(time(l.time))} ／ 当該電文に記載された値です。</p>`).join(''):'<p>この電文から表示対象の観測水位を取得していません。</p>'}</details><a href="https://www.river.go.jp/" target="_blank" rel="noopener noreferrer">川の防災情報で最新状況を確認 ↗</a>`;
  list.append(a);
 }
}
async function refresh(){if(busy)return;busy=true;$('river-refresh').disabled=true;$('river-status').textContent='河川の発表履歴を取得しています…';try{
 const r=await fetch('/mieru-bosai/api/river',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error();const d=await r.json();if(!freshRiver(d))throw Error();data=d;
 }catch{data=null}finally{busy=false;$('river-refresh').disabled=false;render()}}
if(typeof document!=='undefined'){
 $('river-refresh').onclick=refresh;$('river-query').addEventListener('input',render);
 for(const id of ['river-selected-only','river-latest-only'])$(id).addEventListener('change',render);
 document.addEventListener('bousai:selection',render);document.addEventListener('bousai:rain-update',render);
 for(const id of ['location-search','pref-filter','clear-filters'])$(id)?.addEventListener(id==='location-search'?'input':id==='pref-filter'?'change':'click',()=>setTimeout(render,0));
 $('river-history').addEventListener('toggle',()=>{if($('river-history').open&&!freshRiver(data))refresh()});
 setInterval(()=>{if($('river-history').open)refresh();else if(data&&!freshRiver(data)){data=null;render()}},300000);
 render();
}
