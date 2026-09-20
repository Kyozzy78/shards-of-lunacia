@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Run npm install first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:5173 in Chrome.
echo Keep this window open while playing. Press Ctrl+C to stop.
if exist ".tools\node-v22.17.1-win-x64\node.exe" (
  ".tools\node-v22.17.1-win-x64\node.exe" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort
) else (
  node "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173 --strictPort
)
pause
