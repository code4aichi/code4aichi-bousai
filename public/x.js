// Code for AICHI v3.5 - bounded, on-demand X timeline loading.
'use strict';
(()=>{
  const byId=id=>document.getElementById(id);
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
  const validXUrl=(url)=>{try{const u=new URL(String(url));if(!['x.com','twitter.com','www.x.com','www.twitter.com','mobile.twitter.com'].includes(u.hostname))return null;const seg=u.pathname.split('/').filter(Boolean);if(!seg.length || !/^[a-zA-Z0-9_]{1,15}$/.test(seg[0]) || ['search','intent','home','share','i'].includes(seg[0].toLowerCase()))return null;return `https://x.com/${seg[0]}`}catch{return null}};
  const withTimeout=(promise,ms)=>new Promise((resolve,reject)=>{let finished=false;const timer=setTimeout(()=>{if(!finished){finished=true;reject(new Error('timeout'))}},ms);Promise.resolve(promise).then(v=>{if(!finished){finished=true;clearTimeout(timer);resolve(v)}},e=>{if(!finished){finished=true;clearTimeout(timer);reject(e)}})});
  let revision=0;
  function render(p){const own=++revision,links=p?.links||{},ac=byId('detail-x-accounts'),note=byId('detail-x-note'),embed=byId('detail-x-embed-control'),timeline=byId('detail-x-timeline'),button=byId('detail-x-embed-button');
    if(!ac||!note||!embed||!timeline||!button)return;
    timeline.replaceChildren();embed.hidden=true;ac.replaceChildren();button.disabled=false;button.textContent='登録Xの投稿をここに表示';button.onclick=null;
    const profiles=[['防災関連X',validXUrl(links.disasterX)],['登録Xアカウント',validXUrl(links.x)]].filter((e,i,a)=>e[1]&&!a.slice(0,i).some(v=>v[1]===e[1]));
    profiles.forEach(([label,url])=>{const a=make('a','x-account');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.append(make('span','x-account-label',label),make('strong','', '@'+new URL(url).pathname.slice(1)),make('span','','↗'));ac.append(a)});
    const term=`"${p.name}" (災害 OR 避難 OR 断水 OR 警報)`;
    const search=byId('detail-x');if(search)search.href='https://x.com/search?q='+encodeURIComponent(term)+'&f=live';
    const official=byId('detail-x-official-search');
    if(profiles.length){const user=new URL(profiles[0][1]).pathname.slice(1);if(official){official.hidden=false;official.href='https://x.com/search?q='+encodeURIComponent(`from:${user} (災害 OR 防災 OR 避難 OR 断水)`)+'&f=live'}note.textContent='登録済みアカウントは旧マイマップ由来です。現在の公式性はリンク先で確認してください。投稿はXで直接ご確認ください。';embed.hidden=true}
    else{if(official)official.hidden=true;note.textContent='この地点には登録済みのXアカウントがありません。地域名から投稿検索できます。'}
  }
  window.bousaiXDetail=render;
})();
