# 全国防災マップ Webアプリ (Code for AICHI)

2018年の静的HTML版をベースに、Cloudflare Pages向けに新規構築したWebアプリです。

## 実装したもの

- トップページ、全国地図（Leaflet + OpenStreetMap）、47都道府県の代表地点
- 都道府県検索／地方フィルター／地域詳細ダイアログ
- 既存47ページのGoogleマイマップリンクを移行（各リンクの有効性は未検証）
- 気象庁の**現行2026年（令和8年）警報データ**へのCloudflare Pages Functions経由アクセス（都道府県別／ボタン押下）
- Xの地域別検索リンク、オプションのX API v2 Recent Search連携
- モバイル・PC対応、ホーム画面追加用のWebアプリマニフェスト

**制限事項**：原本には市区町村別座標・自治体の個別防災URL一覧がありません。初期版は各都道府県庁付近の代表地点を表示します。市区町村全件表示には正式な全国地方公共団体コード・座標マスターの導入が必要です。

警報は災害発生事実ではありません。API取得に失敗した場合は「情報を確認できない」と明示します。令和8年の警報JSON形式を想定していますが、実際の気象庁データでの結合テストはCloudflare公開後に必ず実施してください。X投稿は未検証の一般投稿であり、公式情報とは区別します。

## Cloudflare Pages デプロイ（推奨：Git連携）

1. このディレクトリを新しいGitHubリポジトリへpushする。
2. Cloudflare Dashboard → Workers & Pages → Pages → Gitリポジトリ接続。
3. Build command: `exit 0` / Build output directory: `public` / Root directory: リポジトリルート。
4. デプロイ後に `/api/warnings?office=230000` を開き `ok:true` を確認。APIエラーが出る場合は気象庁の最新仕様と対象コードを確認。
5. 地図表示、スマホUI、リンク切れ、防災情報の表記について実機で確認。

### CLIでのデプロイ

```bash
npm install
npx wrangler login
npx wrangler pages project create code4aichi-bousai
npm run deploy
```

Functionsは `functions/api` に配置。Git連携の場合はCloudflare Pagesが検知します。静的ファイルだけをドラッグ＆ドロップするとFunctionsが有効にならない方式があるため、**API込み運用はGit連携またはWrangler CLIでデプロイ**してください。

## X API（任意）

Cloudflare Pages → Settings → Variables and Secrets に `X_BEARER_TOKEN` を **Secret** として登録し再デプロイ。X Developerアカウントと利用可能なRecent Search API権限／従量課金が必要です。APIが未設定なら地域別のX検索リンクだけを利用できます。

## 更新・拡張

- `public/prefectures.json`：都道府県名・代表地点・マイマップURL・当時のXアカウント名・気象庁オフィスコード
- `public/app.js`：UI、検索、地図、警報表示
- `functions/api/warnings.js`：気象庁警報データのプロキシ
- `functions/api/x-posts.js`：オプションのX APIプロキシ
- `scripts/build_data.py`：2018年版ソースから47都道府県のリンクを再抽出する参考スクリプト（原本は配布物に含まれません）

## 本番化で必要な確認

- 気象庁の2026年以降のデータ仕様、注意報/警報の分類、解除状態、複数発表官署を含む県への対応
- 気象庁の利用条件・高負荷回避・適切なキャッシュ
- 既存マイマップの共有範囲・正確性・更新体制
- 市区町村コード/座標/自治体公式ページのマスター整備
- X APIの利用条件、投稿を扱う際のプライバシー、偽情報対策
- 表示のアクセシビリティ、災害時の高負荷試験

## ライセンスと地図

OpenStreetMap contributors / Leaflet。既存コードは参照資料として使用しています。元ソースのライセンス条件を確認してから再配布してください。
