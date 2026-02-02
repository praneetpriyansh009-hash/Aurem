@echo off
title Atlas Backend - Fresh Start
cls
echo ==========================================
echo      ATLAS BACKEND (Port 5050)
echo ==========================================
echo.

echo Killing old Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Starting backend server...
echo.
cd server
node minimal_server.js
