@echo off
title Atlas Minimal Backend
echo ==========================================
echo      ATLAS MINIMAL BACKEND START
echo ==========================================
echo.

echo [1] Killing old processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo Done.
echo.

echo [2] Starting Minimal Backend (Port 5050)...
cd server
node index.js
pause
