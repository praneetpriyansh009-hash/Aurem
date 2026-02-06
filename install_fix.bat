@echo off
echo ==========================================
echo      INSTALLING MISSING DEPENDENCIES
echo ==========================================
echo.
echo Navigate to server...
cd server
echo.
echo Installing packages (including groq-sdk)...
call npm install
echo.
echo ==========================================
echo      INSTALLATION COMPLETE
echo ==========================================
echo.
echo You can now close this window and run 'final.bat' again.
pause
