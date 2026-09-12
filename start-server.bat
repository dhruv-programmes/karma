@echo off
setlocal enabledelayedexpansion

title Carbon Loop API Server

:: Navigate to apps\api relative to this script
cd /d "%~dp0apps\api"

if not exist "app\main.py" (
    echo [ERROR] Could not locate apps\api\app\main.py
    pause
    exit /b 1
)

:: Locate uvicorn or python
set "UVICORN_CMD="
if exist ".venv\Scripts\uvicorn.exe" (
    set "UVICORN_CMD=.venv\Scripts\uvicorn.exe"
) else if exist "venv\Scripts\uvicorn.exe" (
    set "UVICORN_CMD=venv\Scripts\uvicorn.exe"
) else if exist ".venv\Scripts\python.exe" (
    set "UVICORN_CMD=.venv\Scripts\python.exe -m uvicorn"
) else if exist "venv\Scripts\python.exe" (
    set "UVICORN_CMD=venv\Scripts\python.exe -m uvicorn"
) else (
    set "UVICORN_CMD=python -m uvicorn"
)

set "PORT=8000"
set "HOST=0.0.0.0"

echo ============================================================
echo   🌱 Carbon Loop API Server (FastAPI + Uvicorn)
echo ============================================================
echo   Local URL:    http://localhost:%PORT%
echo   Network URL:  http://0.0.0.0:%PORT%
echo   Swagger Docs: http://localhost:%PORT%/docs
echo   API Health:   http://localhost:%PORT%/api/v1/auth/demo-users
echo ============================================================
echo   👉 Focus this terminal and press ANY KEY to STOP the server
echo ============================================================
echo.

:: Clear port 8000 if already in use by a previous run
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R ":%PORT% .*LISTENING"') do (
    echo [!] Port %PORT% is in use by PID %%a. Terminating previous process...
    taskkill /F /T /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Start uvicorn in background within the same terminal window
start "" /B %UVICORN_CMD% app.main:app --reload --host %HOST% --port %PORT%

:: Wait for user keypress (blocks until any key is pressed in this terminal)
pause >nul

echo.
echo ============================================================
echo   Stopping Carbon Loop API Server...
echo ============================================================

:: Terminate processes listening on the port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R ":%PORT% .*LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

:: Fallback: clean up any orphaned worker processes running app.main:app
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.main:app*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo   ✅ Server stopped successfully.
echo ============================================================
