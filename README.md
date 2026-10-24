# ミエル防災 v5.0

災害時の水に焦点を当てた防災ポータル / Code for AICHI
設置先：https://code4aichi.org/mieru-bosai/

## 現在の機能
- 自治体等の旧登録1,916地点と地域別の登録リンク。現在の公式性・有効性は全件未検証。
- 気象警報・注意報の区域照合、地震・津波の発表履歴。現在の災害・避難の必要性を判定する機能ではない。
- 横浜市・札幌市の緊急欄、名古屋市上下水道局の工事予定を先行連携。
- 名古屋市等620件・横浜市515件の登録給水施設を検索、現在地からの直線距離順、地図範囲検索。
- ブラウザ内への地域・施設の保存、保存管理、通信なしで読める施設メモの書き出し。
- 水の備蓄量の概算チェック。

断水情報の全国網羅、避難指示・避難所の開設状況の自動連携、給水施設の現在の開設・給水状況の確認には未対応。
出典・利用条件・加工内容は public/data-sources.html に記載。

## 確認と反映
Node.jsとnpmを使用する。

```sh
npm install
npm test
npm run dev
```

Cloudflare Workers + Static Assets用。静的ファイルをGitHub Pagesに置くだけではAPIは実行されない。
既存のGitHub連携でデプロイする。Worker名は code4aichi-bousai、assets.run_worker_first は true。
カスタムドメインのルートは次の2つを使用する。
- code4aichi.org/mieru-bosai/*
- code4aichi.org/mieru-bosai

公式サイト全体の code4aichi.org/* へ割り当てない。本更新でDNS・ルートの変更は不要。
public/locations.json と public/water-events.geojson は更新ZIPに含めない。既存の登録地点と運用中の個別登録を残す。

## v5の見直し
目的別の入口、文字サイズと説明の整理、履歴マーカーの初期表示、登録リンクの表現、出典・ライセンスの一覧、外部通信の説明を修正。
監査結果と未確認事項は SITE-AUDIT-v5.md、反映手順は UPDATE-v5.0.md を参照。

テストは模擬応答を含む自動検証。リンクの全件到達性、KMZ原本の利用条件、実ブラウザでの修正版の描画を確認済みとは扱わない。
