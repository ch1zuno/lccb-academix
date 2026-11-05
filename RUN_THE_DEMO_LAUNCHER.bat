@echo off
REM ============================================================
REM  LCCB Academix - One-Click Demo Launcher
REM  Double-click this file to bring up the whole demo:
REM    1) fresh database + API server        (terminal 1)
REM    2) demo data staged through the API  (terminal 2, waits for API)
REM    3) Vite frontend                     (terminal 3)
REM ============================================================

set "ROOT=C:\Users\ASUS\.gemini\antigravity-ide\scratch\lccb-academix"
set "DATABASE_URL=postgres://postgres:postgres@localhost:5432/lccb_academix"

echo.
echo  LCCB Academix demo starting...
echo    terminal 1: reset database, then start API on :4000
echo    terminal 2: stage demo data once the API is healthy
echo    terminal 3: start the frontend on :5173
echo.

start "" powershell -NoExit -Command "cd '%ROOT%'; foreach ($p in 4000,5173) { $l = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($l) { Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue } }; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'postgres.exe' -and $_.CommandLine -like '*lccb-academix*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; $env:DATABASE_URL='%DATABASE_URL%'; npm run db:reset; $env:PORT='4000'; $env:JWT_SECRET='dev-secret-change-me'; $env:NODE_ENV='development'; $env:FRONTEND_ORIGIN='http://localhost:5173,http://127.0.0.1:5173,http://192.168.254.118:5173,http://192.168.254.113:5173'; npm run server"

start "" powershell -NoExit -Command "cd '%ROOT%'; $env:DATABASE_URL='%DATABASE_URL%'; Write-Host 'Waiting for the API on http://localhost:4000 ...'; $ready=$false; for ($i=0; $i -lt 60; $i++) { Start-Sleep -Seconds 2; try { Invoke-RestMethod -Uri 'http://localhost:4000/api/health' -TimeoutSec 3 -ErrorAction Stop | Out-Null; $ready=$true; break } catch {} }; if ($ready) { npm run demo:stage } else { Write-Host 'API did not become ready - demo data was NOT staged.' -ForegroundColor Red }"

start "" powershell -NoExit -Command "cd '%ROOT%'; npm run dev"

echo  Three terminals are opening. Keep them running while you demo.
echo  Close them (or press Ctrl+C) to stop the demo.
echo.
pause
