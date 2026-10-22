# ミエル防災 v4.1.0
全国の災害・避難・ライフライン情報 / by Code for AICHI

設置先： https://code4aichi.org/mieru-bosai/
LODチャレンジ2018 データセット部門優秀賞「全都道府県防災・水道局リスト」を基盤とする防災ポータル。

## 今回の変更
v4.0の地図中心のレイアウトを継承し、名称・ページ内表記・CSS/JS/データ/API/PWAのパスを `/mieru-bosai/` 配下へ統一。
Workerが接頭辞を取り除き、既存の静的アセットとAPIへ振り分ける。静的アセットのリダイレクトも接頭辞内へ補正。
`/mieru-bosai` は `/mieru-bosai/` に308転送（クエリを保持）。
旧workers.devのトップ `/` は同じホストの `/mieru-bosai/` へ308転送する。
Workerへ渡された他のパスは404。このWorkerを公式サイト全体のルートへ割り当てないこと。

## 重要な前提
この版はCloudflare Workers + Static Assets用。GitHub PagesへファイルをコピーするだけではAPIは実行されない。
Worker名・リポジトリ名は引き続き `code4aichi-bousai`。表示名とURLだけを変更している。
公開ルートやDNSはこのZIPでは変更しない。wrangler.jsoncにroutesを追加していないため、アップロードだけで公式ドメインへ割り当てられることはない。
`assets.run_worker_first` は true。接頭辞の除去を必ずWorker経由で行うために必要。

## ローカル確認
Node.jsとnpmを使用する。

```sh
npm install
npm test
npm run dev
```
表示された開発用アドレスの `/mieru-bosai/` を開く。
`npm run dev`、`npm run deploy` は従来のPages用からWorkers用に修正済み。

## 移行時の反映
1. 既存リポジトリのファイルをこのZIPの同じ階層に上書きする。
2. GitHub連携の既存デプロイを利用するか、環境を確認して `npm run deploy`（`wrangler deploy`）を実行する。
3. 旧workers.devの `/mieru-bosai/` で先に動作を確認。
4. ドメイン・DNS設定を確認した後、Cloudflareの対象Workerへ次のRoutesを追加する。
   - `code4aichi.org/mieru-bosai/*`
   - `code4aichi.org/mieru-bosai`
5. 公式ドメインの画面とAPIを確認し、その後で公式トップからのリンクを変更する。

`code4aichi.org/*` のように公式サイト全体を対象にしない。
wwwホストにも同じURLを設ける場合は別途ルート設定や正規URLへの転送を検討する。このZIPはapexドメインを正規URLとしている。

## 確認URL
- `/mieru-bosai/`
- `/mieru-bosai/locations.json`
- `/mieru-bosai/manifest.webmanifest`
- `/mieru-bosai/api/areas`
- `/mieru-bosai/api/alerts`
- `/mieru-bosai/api/alerts?office=230000`

JSONの `ok` に加え、全国警報の `complete`、各地域の `ok`、取得時刻・警報内容を確認する。

## 今回の検証
Node標準テスト8件に合格。静的ファイルの参照、接頭辞の除去、転送とクエリ保持、API正常系・異常系、対象外パスの404、PWAのscope・start_urlを検証。
API試験は模擬応答を使用し、実際の気象庁接続・Cloudflare実環境・移行先のブラウザ表示は未検証。
locations.jsonの1,916件はv4.0と同一。リンクの最新性・公式性の全件確認は未実施。
公開・DNS変更・ルート設定・GitHubへのpushは行っていない。

## 今後の機能
地震・津波の地図連携、避難施設・避難指示・開設状況、給水地点・復旧情報の集約は後続開発。今回の版では実装していない。
旧仕様の経緯は RENEWAL-v4.md に記載。配備手順とURLはこのREADMEを優先。
