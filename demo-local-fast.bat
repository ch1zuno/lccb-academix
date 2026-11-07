@echo off
cls
setlocal enabledelayedexpansion

echo LCCB Academix Demo - Fast Local Run
echo ========================================
echo.

REM Set environment variables
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/lccb_academix
set PORT=4000
set JWT_SECRET=dev-secret-change-me
set NODE_ENV=development
set FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://192.168.254.118:5173,http://192.168.254.113:5173
set DEMO_MODE=1
set VITE_DEMO_MODE=1

REM Create logs directory
if not exist logs mkdir logs

REM Start API server in background (without waiting)
echo Starting API server (background)...
start /B npm run server > logs\api.log 2>&1
echo API server started in background.
echo.

REM Wait shorter and check if it's running
echo Waiting 3 seconds for API to initialize...
timeout /t 3 /nobreak > NUL

echo Checking API health...
curl -s -f http://localhost:4000/api/health > NUL 2>&1
if %errorlevel% == 1 (
    echo.
    echo ERROR: API not responding quickly enough.
    echo Check logs\api.log for details.
    echo.
    echo You may need to manually start the API:
    echo   $env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/lccb_academix'
    echo   $env:PORT='4000'
    echo   $env:JWT_SECRET='dev-secret-change-me'
    echo   $env:NODE_ENV='development'
    echo   npm run server
    goto :end
)

echo Starting frontend (Vite) in background...
start /B npm run dev > logs\frontend.log 2>&1
echo Frontend started at http://localhost:5173
echo.

echo API is ready, running demo scripts...
echo.

REM Run demo stage
npm run demo:stage >> logs\demo-stage.log 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: demo:stage failed.
    echo Check logs\demo-stage.log
    goto :end
)

echo.
echo demo:stage completed successfully.
echo.

REM Run demo check
npm run demo:check -- http://localhost:4000 >> logs\demo-check.log 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: demo:check failed.
    echo Check logs\demo-check.log
    goto :end
)

:end:
echo.
echo ========================================
echo Demo finished!
echo.
echo Quick log viewing commands:
echo   type logs\api.log | findstr "ERROR"
echo   type logs\demo-stage.log
echo   type logs\demo-check.log
echo.
echo Demo accounts (password: demo1234):
echo   - Learner: TE-128
echo   - Tutor: TU-042
echo   - Faculty: b.tisuela@lccbacolod.edu.ph
echo   - Superadmin: l.betita.admin@lccbacolod.edu.ph
echo.
echo To stop services:
echo   taskkill /f /im node.exe
echo ========================================
pause