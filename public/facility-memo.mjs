import {FACILITY_PROVIDERS} from './facility-model.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=f=>JSON.stringify([f.provider,f.name,f.address||'',f.lat,f.lng]);
export function buildFacilityMemo(saved,current,{createdAt=new Date(),sources={},regions=[]}={}){
 if(!saved.length&&!regions.length)throw Error('Nothing saved');
 const currentByKey=new Map(current.map(f=>[key(f),f]));
 const timestamp=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'long',timeStyle:'short'}).format(createdAt);
 const matched=saved.filter(f=>currentByKey.has(key(f))).length;
 const regionCards=regions.map((region,index)=>{
  const labels={official:'自治体公式サイト',disaster:'防災情報',water:'水道・断水情報'};
  const links=Object.entries(region.checks||{}).filter(([kind,check])=>{
   if(!labels[kind]||!check?.url)return false;
   try{const u=new URL(check.url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}
  }).map(([kind,check])=>`<li><a href="${esc(check.url)}">${esc(check.label||labels[kind])}</a>（URL確認：${esc(check.checkedAt||'不明')}）<br><span class="url">${esc(check.url)}</span></li>`).join('');
  return `<article><h2>${index+1}. ${esc(region.prefecture)} ${esc(region.name)}</h2>${links?`<ul>${links}</ul>`:'<p>確認済みの公式リンクを表示できません。ミエル防災で登録リンクをご確認ください。</p>'}<p class="source">URLの確認日であり、現在の災害・断水の確認日ではありません。リンクの閲覧には通信が必要です。</p></article>`;
 }).join('');
 const cards=saved.map((entry,index)=>{
  const found=currentByKey.get(key(entry)),f=found||entry,p=FACILITY_PROVIDERS[f.provider];
  if(!p)throw Error('Unknown provider');
  const retrieved=sources[f.provider]?.retrievedAt;
  return `<article><h2>${index+1}. ${esc(f.name)}</h2><p class="state">登録施設／開設・給水状況は未確認</p>${!found?'<p class="unmatched">今回の収録データと照合できていません。以下はブラウザに保存した時点の施設情報です。変更・廃止の有無も未確認です。</p>':''}<dl><dt>住所</dt><dd>${esc(f.address||'住所情報なし')}</dd>${f.region?`<dt>地域</dt><dd>${esc(f.region)}</dd>`:''}${f.type?`<dt>種類</dt><dd>${esc(f.type)}</dd>`:''}<dt>登録座標</dt><dd>${esc(f.lat)}, ${esc(f.lng)}</dd></dl>${f.notes?`<p class="notes"><strong>公式データの備考</strong><br>${esc(f.notes)}</p>`:''}<p class="source">出典：<a href="${esc(p.url)}">${esc(p.name)}の公式案内</a>（提供元の共通ページ）<br><span class="url">${esc(p.url)}</span><br>ライセンス：<a href="${esc(p.licenseURL)}">${esc(p.license)}</a>${found&&retrieved?`<br>収録日時：${esc(retrieved)}（施設の開設確認日時ではありません）`:''}</p></article>`;
 }).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>保存した地域・給水施設の防災メモ｜ミエル防災</title><style>body{font-family:system-ui,sans-serif;color:#183d49;line-height:1.75;max-width:850px;margin:24px auto;padding:0 20px}h1{font-size:25px;line-height:1.4}h2{font-size:19px;margin:0 0 8px}header{border-bottom:3px solid #087f76;padding-bottom:12px}.caution,.unmatched{padding:12px;border:1px solid #ad7b29;background:#fff8e8}.state{font-weight:700}article{border-bottom:1px solid #aebfc4;padding:20px 0;break-inside:avoid}dl{display:grid;grid-template-columns:5em 1fr;gap:4px 10px}dt{font-weight:700}dd{margin:0}.notes{white-space:pre-wrap}.source,footer{font-size:12px}a{color:#075e59}.url,dd,.notes{overflow-wrap:anywhere}footer{margin:20px 0}.hint{color:#526a74}@page{size:A4;margin:14mm}@media print{body{margin:0;padding:0;max-width:none;font-size:11pt}h1{font-size:18pt}h2{font-size:14pt}.hint{display:none}a{color:inherit}article{padding:12px 0}}</style></head><body><header><p>ミエル防災</p><h1>保存した地域・給水施設の防災メモ</h1><p>メモ作成：${esc(timestamp)}（日本時間）<br>保存した地域${regions.length}件／保存した施設${saved.length}件／今回の収録データと照合できた施設${matched}件</p></header><p class="caution"><strong>このメモは保存地域と登録施設の控えです。施設の開設・給水中を示すものではありません。</strong><br>自動更新されません。利用前に自治体・水道事業者の発表や現地の状況をご確認ください。掲載データは全国・各市のすべての施設を網羅していません。</p><p class="hint">このファイルは通信なしで閲覧できます。印刷・PDF保存はブラウザの印刷メニューから行えます。公式リンクの閲覧には通信が必要です。</p>${regionCards?`<section><h2>保存した地域</h2>${regionCards}</section>`:''}${cards?`<section><h2>保存した給水施設</h2>${cards}</section>`:''}<footer>施設名・住所・数値等は登録データまたは保存時の識別情報を掲載しています。現在地・距離・経路・断水の最新情報は含みません。メモ作成日時はデータ更新日や開設確認日時ではありません。<br>ミエル防災：<a href="https://code4aichi.org/mieru-bosai/">https://code4aichi.org/mieru-bosai/</a></footer></body></html>`;
}
