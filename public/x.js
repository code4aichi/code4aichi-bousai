// Code for AICHI v3.4 - official X links and optional on-demand embedded timeline.
// No API token, scraping, automated post collection, or third-party requests until explicit user click.
'use strict';
(()=>{
  const byId=id=>document.getElementById(id);
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
  const validXUrl=(url)=>{try{const u=new URL(String(url));if(!['x.com','twitter.com','www.x.com','www.twitter.com','mobile.twitter.com'].includes(u.hostname))return null;const seg=u.pathname.split('/').filter(Boolean);if(!seg.length || !/^[a-zA-Z0-9_]{1,15}$/.test(seg[0]) || ['search','intent','home','share','i'].includes(seg[0].toLowerCase()))return null;return `https://x.com/${seg[0]}`}catch{return null}};
  let revision=0;
  function render(p){const own=++revision, links=p?.links||{}, ac=byId('detail-x-accounts'), note=byId('detail-x-note'), embed=byId('detail-x-embed-control'), timeline=byId('detail-x-timeline'), button=byId('detail-x-embed-button');
    if(!ac||!note||!embed||!timeline||!button)return;
    timeline.replaceChildren();embed.hidden=true;ac.replaceChildren();
    const profiles=[['防災関連X',validXUrl(links.disasterX)],['登録済み公式X',validXUrl(links.x)]].filter((e,i,a)=>e[1]&&!a.slice(0,i).some(v=>v[1]===e[1]));
    profiles.forEach(([label,url])=>{const a=make('a','x-account');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.append(make('span','x-account-label',label),make('strong','', '@'+new URL(url).pathname.slice(1)),make('span','','↗'));ac.append(a)});
    const term=`"${p.name}" (災害 OR 避難 OR 断水 OR 警報)`;
    const search=byId('detail-x');search.href='https://x.com/search?q='+encodeURIComponent(term)+'&f=live';
    const official=byId('detail-x-official-search');
    if(profiles.length){const user=new URL(profiles[0][1]).pathname.slice(1);official.hidden=false;official.href='https://x.com/search?q='+encodeURIComponent(`from:${user} (災害 OR 防災 OR 避難 OR 断水)`)+'&f=live';note.textContent='登録済みアカウントは旧マイマップ由来です。現在も自治体公式の運用アカウントか、リンク先で必ず確認してください。';embed.hidden=false;button.onclick=()=>loadTimeline(profiles[0][1],timeline,button,own)}
    else{official.hidden=true;note.textContent='この地点には登録済みのXアカウントがありません。地域名から投稿検索できます。'}
  }
  async function loadTimeline(profile,container,button,rev){
    button.disabled=true;button.textContent='X投稿を読み込んでいます…';container.replaceChildren();
    const fallback=()=>{if(rev!==revision)return;container.replaceChildren(make('p','x-help','投稿を表示できない場合は、上の公式Xリンクを開いて確認してください。'));button.disabled=false;button.textContent='再度表示を試す'};
    try{
      if(!window.twttr?.widgets){await new Promise((resolve,reject)=>{const old=document.querySelector('script[data-bousai-x-widgets]');if(old){let attempts=0;const check=()=>{if(window.twttr?.widgets)resolve();else if(++attempts>60)reject(new Error('X unavailable'));else setTimeout(check,100)};check();return}const s=document.createElement('script');s.src='https://platform.twitter.com/widgets.js';s.async=true;s.dataset.bousaiXWidgets='1';s.onload=resolve;s.onerror=()=>reject(new Error('Widget unavailable'));document.head.append(s)})}
      if(rev!==revision)return;
      if(!window.twttr?.widgets?.createTimeline)throw Error('No widget');
      const handle=new URL(profile).pathname.slice(1);await window.twttr.widgets.createTimeline({sourceType:'profile',screenName:handle},container,{height:400,chrome:'noheader nofooter',dnt:true,lang:'ja'});
      if(rev!==revision)return;button.textContent='公式Xの投稿を表示中';
    }catch{fallback()}
  }
  window.bousaiXDetail=render;
})();
