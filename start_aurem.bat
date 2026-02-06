@echo off
title AUREM - Full Stack Start
color 0A

echo.
echo  ====================================
echo       AUREM - Starting Services
echo  ====================================
echo.

:: Kill any existing node processes on ports 5050 and 5173 (optional cleanup)
echo [*] Preparing...

:: Start Backend Server
echo [1/2] Starting Backend on port 5050...
cd /d "%~dp0server"
start /B cmd /k "title Aurem Backend & node standalone_server.js"

:: Wait for backend to start
timeout /t 2 /nobreak > nul

:: Start Frontend
echo [2/2] Starting Frontend on port 5173...
cd /d "%~dp0"
start /B cmd /k "title Aurem Frontend & npm run dev"

echo.
echo  ====================================
echo       SERVERS STARTING...
echo  ====================================
echo.
echo  Backend:  http://localhost:5050
echo  Frontend: http://localhost:5173
echo.
echo  Two new windows will open.
echo  Press any key to close THIS window (keeps servers running)
echo.
pause > nul
