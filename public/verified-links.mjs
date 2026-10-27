// URL checks are snapshots, not guarantees about current disaster conditions.
const record=(url,checkedAt='2026-10-25',label=null)=>({url,checkedAt,evidenceURL:url,method:'official-page-review',...(label?{label}:{})});
export const LINK_REVIEWS=[
 {name:'一宮市',prefecture:'愛知',links:{water:record('https://www.city.ichinomiya.aichi.jp/jougesuidou/jougesuidoukinkyuu/1044043/1030934/index.html','2026-10-27','一宮市 水道・下水道の事故・災害情報')}},
 {name:'岡崎市',prefecture:'愛知',links:{water:record('https://www.city.okazaki.lg.jp/water/info/1003232/1003238.html','2026-10-27','岡崎市 断水工事の案内')}},
 {name:'刈谷市',prefecture:'愛知',links:{water:record('https://www.city.kariya.lg.jp/kurashi/suido/guide/1004268.html','2026-10-27','刈谷市 水道のトラブル・連絡先')}},
 {name:'春日井市',prefecture:'愛知',links:{water:record('https://www.city.kasugai.lg.jp/kurashi/1020797/1020870/1021206/index.html','2026-10-27','春日井市 水道・下水道のトラブル')}},
 {name:'豊田市',prefecture:'愛知',links:{water:record('https://www.city.toyota.aichi.jp/sumaikankyo/jogesuido/index.html','2026-10-27','豊田市 上下水道・緊急情報')}},
 {name:'豊橋市',prefecture:'愛知',links:{water:record('https://www.city.toyohashi.lg.jp/16946.htm','2026-10-27','豊橋市 断水・濁水情報')}},
 {name:'豊川市',prefecture:'愛知',links:{water:record('https://www.city.toyokawa.lg.jp/kurashi_tetsuzuki/jogesuido/1/6/12159.html','2026-10-27','豊川市 断水・濁水情報')}},
 {name:'名古屋市',prefecture:'愛知',links:{official:record('https://www.city.nagoya.jp/'),disaster:record('https://www.city.nagoya.jp/bousaiportal/index.html'),water:record('https://www.water.city.nagoya.jp/')}},
 {name:'横浜市',prefecture:'神奈川',links:{official:record('https://www.city.yokohama.lg.jp/'),disaster:record('https://www.city.yokohama.lg.jp/bousai-kyukyu-bohan/bousai-saigai/iza/information.html'),water:record('https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/suido-gesui/suido/')}},
 {name:'札幌市',prefecture:'北海道',links:{official:record('https://www.city.sapporo.jp/'),disaster:record('https://www.city.sapporo.jp/kikikanri/'),water:record('https://www.city.sapporo.jp/suido/')}}
];
const normal=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'');
const hosts=new Set(['www.city.nagoya.jp','www.water.city.nagoya.jp','www.city.yokohama.lg.jp','www.city.sapporo.jp','www.city.toyota.aichi.jp','www.city.toyohashi.lg.jp','www.city.toyokawa.lg.jp','www.city.ichinomiya.aichi.jp','www.city.okazaki.lg.jp','www.city.kariya.lg.jp','www.city.kasugai.lg.jp']);
function officialURL(s){try{const u=new URL(s);return u.protocol==='https:'&&hosts.has(u.hostname)&&!u.username&&!u.password&&!u.port}catch{return false}}
export function resolveRegionLinks(place,reviews=LINK_REVIEWS){
 const links={...place?.links},checks={};
 const review=reviews.find(r=>normal(r.name)===normal(place?.name)&&normal(r.prefecture)===normal(place?.prefecture));
 for(const [key,check] of Object.entries(review?.links||{})){
  if(!['official','disaster','water'].includes(key)||!officialURL(check?.url)||!officialURL(check?.evidenceURL)||!/^\d{4}-\d{2}-\d{2}$/.test(check?.checkedAt||''))continue;
  checks[key]={...check,originalURL:links[key]||null};links[key]=check.url;
 }
 return {links,checks};
}
