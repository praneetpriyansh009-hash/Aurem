@echo off
echo ==========================================
echo      RESTARTING ATLAS BACKEND
echo ==========================================
echo.
echo [1/2] Terminating existing server...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo Done.
echo.
echo [2/2] Starting Server...
start "Atlas Backend (Port 5050)" /D . cmd /k "node index.js"
echo.
echo Server window opened. Please watch for:
echo "[AI Service] VERSION 7.0 (RAW FETCH) ACTIVE"
echo.
pause
