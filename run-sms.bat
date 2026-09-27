@echo off
title School Management System (SMS) Launcher
echo ====================================================
echo  Hamro School Management System (SMS) Launcher
echo ====================================================

echo [1/3] Starting Backend API Server (Port 4000)...
start "SMS Backend API" cmd /k "cd /d "%~dp0" && npm run dev:api"

timeout /t 4 /nobreak >nul

echo [2/3] Starting Frontend Web App (Port 5173)...
start "SMS Web App" cmd /k "cd /d "%~dp0" && npm run dev:web"

timeout /t 3 /nobreak >nul

echo [3/3] Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ====================================================
echo  SMS is now running!
echo  - Frontend Web App:  http://localhost:5173
echo  - Backend API:       http://localhost:4000
echo.
echo  Default Login Credentials:
echo    Username: admin     ^| Password: Password123!
echo    Username: principal ^| Password: Password123!
echo ====================================================
pause

