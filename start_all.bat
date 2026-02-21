@echo off
echo ============================
echo   AUREM ATLAS SYSTEM START
echo ============================

echo [1/2] Launching Backend Server (Port 5050)...
cd server
start "Atlas Backend" cmd /k "npm install && node index.js"
cd ..

echo [2/2] Launching Frontend (Vite)...
start "Atlas Frontend" cmd /k "npm run dev"

echo.
echo System launched! Two windows should appear.
echo Backend: 5050
echo Frontend: 8080 or 5173
pause
