@echo off
echo Cleaning up previous sessions...
:: Force kill any stuck node processes to clear ports (like 5050 and 8080)
taskkill /F /IM node.exe >nul 2>&1

echo Starting Aurem Backend Dev Server...
start "Aurem Backend" cmd /k "cd server && npm run dev"

echo Starting Aurem Frontend Dev Server...
start "Aurem Frontend" cmd /k "npm run dev"

echo.
echo ======================================================
echo Both servers are starting up in separate windows!
echo If a window closes instantly, check the terminal.
echo ======================================================
echo.
pause
