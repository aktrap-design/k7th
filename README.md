# k7th Website

k7th 公式サイトと管理画面（CMS）のリポジトリです。  
GitHub を中心に、複数端末・複数環境から更新できる前提で運用します。

## 構成

- `index.html` / `style.css` / `script.js`: 公開サイト本体
- `gallery.json`: ギャラリーデータ本体（CMS が更新）
- `images/`: 画像アセット
- `admin/`: 管理画面フロント
- `admin-server.js`: 管理画面/API サーバ

## ローカル起動

前提: Node.js 18 以上推奨

1. 依存インストール
2. 管理サーバ起動
3. ブラウザで管理画面を開く

- 管理画面: `http://localhost:3000/admin`
- API: `http://localhost:3000/api/data`

`package.json` のスクリプト:

- `npm run admin` : 管理サーバ起動

## 標準運用フロー（複数環境向け）

1. 作業開始前に `main` を最新化
2. `codex/` プレフィックスの作業ブランチを作成
3. 変更後、ローカルで表示確認（トップ / 管理画面）
4. コミットして GitHub へ push
5. Pull Request でレビュー後に `main` へ反映
6. 別端末では作業前に必ず pull

詳細ルールは `CONTRIBUTING.md` を参照。

## 注意点

- `gallery.json` と `images/` は競合しやすいため、同時編集を避ける
- 画像ファイル名は CMS 側で安全文字に変換される（英数字・`.`・`-`・`_`）
- `node_modules` はコミットしない
