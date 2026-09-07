@echo off
setlocal

echo Starting 26-SAP-D-MSR Demo (fake data)...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js/npm was not found on this computer.
    echo Install it from https://nodejs.org (LTS version^), then close this
    echo window, open a NEW Command Prompt, and run this file again.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0backend\node_modules" (
    echo Installing backend dependencies (first run only)...
    call npm install --prefix "%~dp0backend"
)
if not exist "%~dp0frontend\node_modules" (
    echo Installing frontend dependencies (first run only)...
    call npm install --prefix "%~dp0frontend"
)

start "26-SAP-D-MSR Demo - Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "26-SAP-D-MSR Demo - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

start "" "http://localhost:5273"

echo.
echo Demo backend (http://localhost:4100) and frontend (http://localhost:5273) started in separate windows.
echo Login: demo / demo1234  (or guest / demo1234)
echo Close those two windows to stop the demo.
echo.
pause
