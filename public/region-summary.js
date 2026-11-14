'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const mappings=[['detail-alerts','summary-alert'],['detail-water-status','summary-water'],['detail-facility-status','summary-facility']];
 function sync(){
  const p=window.bousaiCurrentSelection?.();if(!p)return;
  $('region-summary-heading').textContent=`${p.name}の防災サマリー`;
  const original=$('detail-official-water'),link=$('summary-water-official'),note=$('summary-water-link-note');
  if(!original.hidden&&original.hasAttribute('href')){
   link.href=original.href;link.textContent=original.textContent;link.hidden=false;
   note.textContent='確認済みの公式ページへのリンクです。最新の発表内容はリンク先でご確認ください。';
  }else{
   link.hidden=true;link.removeAttribute('href');
   note.textContent='確認済みの公式リンクは未登録です。「地域の詳しい情報を見る」の登録リンクもご確認ください。';
  }
  for(const [source,target] of mappings){
   const node=$(source);let value;
   if(source==='detail-alerts'&&node.querySelector('li')){
    value=[...node.querySelectorAll('li')].map(item=>item.textContent.trim()).join('、');
    const note=node.querySelector('.alert-note');if(note)value+='。'+note.textContent.trim();
   }else value=node.textContent.trim();
   $(target).textContent=value||'情報を確認しています。';
  }
 }
 for(const [source] of mappings){const node=$(source);if(node)new MutationObserver(sync).observe(node,{childList:true,characterData:true,subtree:true});}
 document.addEventListener('bousai:selection',()=>{$('summary-water-official').hidden=true;$('summary-water-official').removeAttribute('href');$('summary-water-link-note').textContent='公式確認先を確認しています。';for(const [,target] of mappings)$(target).textContent='確認しています…';queueMicrotask(sync)});
 $('summary-details').addEventListener('click',()=>{
  const slot=$('region-detail-slot');const opening=slot.hidden;slot.hidden=!opening;
  $('summary-details').setAttribute('aria-expanded',String(opening));
  $('summary-details').textContent=opening?'詳しい情報を閉じる':'地域の詳しい情報を見る';
  if(opening)slot.scrollIntoView({behavior:'smooth',block:'nearest'});
 });
 $('detail-dialog').addEventListener('close',()=>{ $('region-detail-slot').hidden=true;$('summary-details').textContent='地域の詳しい情報を見る';$('summary-details').setAttribute('aria-expanded','false'); });
 sync();
})();
