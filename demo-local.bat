@echo off
setlocal enabledelayedexpansion

echo LCCB Academix Demo - Local Run
echo ========================================

REM Set environment variables
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/lccb_academix
set PORT=4000
set JWT_SECRET=dev-secret-change-me
set NODE_ENV=development
set FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://192.168.254.118:5173,http://192.168.254.113:5173
set DEMO_MODE=1
set VITE_DEMO_MODE=1

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Start API server
echo Starting API server...
start /B /WAIT npm run server > logs\api.log 2>&1

if errorlevel 1 (
    echo Failed to start API server.
    exit /b 1
)

REM Wait for API to be ready
echo Waiting for API to be ready...
timeout /t 5 /nobreak > NUL

curl -s http://localhost:4000/api/health > NUL 2>&1
if %errorlevel% == 1 (
    echo API health check failed.
    exit /b 1
)

REM Run demo stage
echo Running demo:stage...
npm run demo:stage > logs\demo-stage.log 2>&1

if errorlevel 1 (
    echo demo:stage failed.
    exit /b 1
)

REM Run demo check
echo Running demo:check...
npm run demo:check -- http://localhost:4000 > logs\demo-check.log 2>&1

if errorlevel 1 (
    echo demo:check failed.
    exit /b 1
)

REM Show results
echo.
echo ========================================
echo Demo completed successfully! 
echo.
echo Logs are in the logs\ directory:
echo   - api.log (API server output)
echo   - demo-stage.log (demo:stage output)
echo   - demo-check.log (demo:check output)
echo.
echo Demo accounts (password: demo1234):
echo   - Learner: TE-128
echo   - Tutor: TU-042
echo   - Faculty: b.tisuela@lccbacolod.edu.ph
echo   - Superadmin: l.betita.admin@lccbacolod.edu.ph
echo.
echo To view logs: type "type logs\api.log" or "type logs\demo-check.log"
echo Starting frontend (Vite) in background...
start /B npm run dev > logs\frontend.log 2>&1
echo Frontend started at http://localhost:5173
echo.
echo To stop services: "taskkill /f /im node.exe"
echo ========================================
pause