from pathlib import Path
p=Path(__file__).resolve().parents[1]/'public'/'index.html'
s=p.read_text()
s=s.replace('都道府県名で探す（例：愛知、東京、大阪）','市区町村名で探す（例：名古屋市、渋谷区）')
s=s.replace('47<span>都道府県</span>','1,916<span>地点</span>')
s=s.replace('地域別の情報を掲載','自治体等の登録ポイント')
s=s.replace('全国の地域から探す','防災情報を地図から探す')
s=s.replace('地図のポイント、または地域一覧から選択してください。','自治体名で検索、または地図のポイントを選択してください。')
s=s.replace('◎ 掲載地点：都道府県代表地点（県庁等）','◎ 掲載地点：自治体等の登録位置（災害発生地点ではありません）')
a=s.index('<div class="map-shell">');b=s.index('</section>',a)
s=s[:a]+'''<div class="v2-controls"><label class="v2-search"><span>⌕</span><input id="location-search" type="search" placeholder="自治体名・住所を検索（例：名古屋、札幌）" autocomplete="off" aria-label="自治体を検索"/></label><select id="pref-filter" aria-label="都道府県を選択"><option value="">全国・すべての都道府県</option></select><button id="clear-filters" class="v2-outline">クリア</button></div><div class="v2-map-shell"><div class="v2-map-area"><div id="map-canvas" role="application" aria-label="全国防災情報マップ"></div><div class="v2-map-head"><span>● 地点情報</span><button id="reset-map" class="light-button">⌖ 全国表示</button></div><div id="map-warning" class="v2-map-note">ピンは自治体等の登録地点です。災害発生地域を示していません。</div></div><aside class="v2-results"><div class="v2-results-heading"><strong>地域情報</strong><span id="result-count">1,916件</span></div><div id="location-list" class="v2-list" aria-live="polite"></div><div class="v2-result-foot">※ 掲載情報は旧マイマップから移行したものです。各リンクの最新性は未検証です。</div></aside></div>''' +s[b:]
a=s.index('<dialog id="detail-dialog"');b=s.index('<script src="https://cdn.jsdelivr.net',a)
s=s[:a]+'''<dialog id="detail-dialog" class="detail-dialog"><div class="detail-layout"><div class="detail-header"><div><p class="kicker">MUNICIPAL INFORMATION</p><h2 id="detail-title">自治体</h2><p id="detail-subtitle"></p></div><button id="detail-close" class="close-button" aria-label="閉じる">×</button></div><div class="detail-content"><div class="detail-panel"><div class="detail-panel-title">所在地</div><p id="detail-address"></p><small>地点の座標は旧Googleマイマップから移行したものです。</small></div><div class="detail-panel"><div class="detail-panel-title">公式・防災・断水関連リンク</div><div id="detail-links-v2" class="v2-detail-links"></div><small>登録時点の情報です。リンク切れや移転の可能性があります。</small></div><div class="detail-panel"><div class="detail-panel-title">𝕏 地域の投稿を探す</div><p>投稿内容の真偽は確認されていません。自治体の公式情報と照合してください。</p><a id="detail-x" class="secondary-link" target="_blank" rel="noopener">Xでこの地域の関連投稿を探す ↗</a></div><div class="detail-panel"><div class="detail-panel-title">気象庁・災害情報</div><p>本バージョンはリアルタイムの災害判定をしていません。</p><a class="secondary-link" href="https://www.jma.go.jp/bosai/" target="_blank" rel="noopener">気象庁の公式情報を確認 ↗</a></div></div></div></dialog>''' +s[b:]
p.write_text(s)
