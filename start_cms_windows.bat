@echo off
:: Gallery K7th CMS Start Script for Windows

:: スクリプトがあるディレクトリ（galleryフォルダ）に移動
cd /d "%~dp0"

echo ======================================
echo Starting Gallery K7th CMS Server...
echo ======================================

:: 2秒ほど待機してからブラウザを開く（サーバー起動完了を待つため）
start /b cmd /c "ping 127.0.0.1 -n 3 > nul && start http://localhost:3000/admin"

:: Nodeサーバーを起動
call npm run admin

pause
