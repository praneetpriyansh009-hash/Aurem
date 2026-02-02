@echo off
setlocal
title Atlas Unified Startup
echo ==========================================
echo      Atlas Unified Startup (Final)
echo ==========================================
echo.

echo [1/3] Cleaning up old processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo Done.
echo.

echo [2/3] Launching Backend (Port 5050)...
:: This opens the backend in a separate terminal window
start "Atlas Backend (Port 5050)" /D server cmd /k "node index.js"
echo Backend window opened.
echo.

echo [3/3] Launching Frontend...
echo Frontend starting in this window...
echo.
:: Run npm dev in the root directory for the frontend (Vite/React)
call npm run dev
