@echo off
title Atlas - Full Stack Launcher
cls
echo ==========================================
echo      ATLAS FULL STACK LAUNCHER
echo ==========================================
echo.

echo [1/3] Cleaning up old processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo Done.
echo.

echo [2/3] Starting Backend (Port 5050)...
start "Atlas Backend - Port 5050" /D server cmd /k "node minimal_server.js"
timeout /t 3 /nobreak >nul
echo Backend window opened.
echo.

echo [3/3] Starting Frontend (Port 8080)...
echo Frontend will start in this window...
echo.
call npm run dev
