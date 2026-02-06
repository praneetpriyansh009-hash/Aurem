@echo off
echo Starting debug run... > server_debug.log
node --version >> server_debug.log 2>&1
cd server || echo "CD failed" >> ..\server_debug.log
echo In server dir >> ..\server_debug.log
node index.js >> ..\server_debug.log 2>&1
echo Done >> ..\server_debug.log
