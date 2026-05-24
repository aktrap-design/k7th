#!/bin/bash
# Gallery K7th CMS Start Script for Mac

# スクリプトがあるディレクトリ（galleryフォルダ）に移動
cd "$(dirname "$0")"

echo "======================================"
echo "Starting Gallery K7th CMS Server..."
echo "======================================"

# 1.5秒待機してからブラウザを開く（サーバー起動完了を待つため）
(sleep 1.5 && open http://localhost:3000/admin) &

# Nodeサーバーを起動
npm run admin
