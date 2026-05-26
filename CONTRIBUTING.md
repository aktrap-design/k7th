# CONTRIBUTING

## 目的

複数端末・複数メンバーで安全に更新するための最小ルールです。

## ブランチ運用

- 既定ブランチ: `main`
- 作業ブランチ: `codex/<topic>`（例: `codex/update-gallery-202605`）
- `main` へ直接コミットしない

## 作業開始チェック

1. 作業ツリーがクリーンか確認
2. `main` を最新化
3. 新規作業ブランチを作成

## 変更単位

- 1ブランチ = 1目的（例: ギャラリー更新、デザイン調整）
- 大きな変更は分割して PR を分ける

## 競合を避ける対象

以下は競合しやすいため、同時編集を避ける。

- `gallery.json`
- `images/` 配下の同名ファイル
- `index.html` の同一セクション

## コミット規約（推奨）

先頭に種別を付与する。

- `feat:` 新機能
- `fix:` 修正
- `content:` 画像/文言/ギャラリー更新
- `chore:` 設定・運用調整

例:

- `content: update gallery and add 2026-05 assets`
- `fix: keep hero transition timing on mobile`

## Pull Request ルール

PR には以下を記載する。

- 変更の目的
- 変更ファイルの範囲
- 確認手順（PC / スマホ）
- 影響範囲（公開ページ / 管理画面 / データ）

## ローカル確認

最低限、以下を確認する。

- トップページが表示される
- 管理画面 `http://localhost:3000/admin` が開く
- 画像アップロード後に `gallery.json` 保存が通る

## 緊急対応

- 本番影響のある不具合は `hotfix/<topic>` で作業
- 反映後、同内容を `main` に必ず取り込む
