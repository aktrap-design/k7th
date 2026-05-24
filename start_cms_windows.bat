@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js が見つかりません。先にインストールしてください。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 依存関係をインストール中...
  npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install に失敗しました。
    pause
    exit /b 1
  )
)

echo CMSサーバーを起動します...
start "" http://localhost:3000/admin/
node admin-server.js