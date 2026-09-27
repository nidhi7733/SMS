@echo off
title School Management System (SMS) Stopper
echo ====================================================
echo  Stopping School Management System (SMS)...
echo ====================================================

powershell -Command "Get-NetTCPConnection -LocalPort 4000, 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo Servers on Port 4000 and 5173 have been stopped successfully.
pause

