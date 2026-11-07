@echo off
setlocal

echo ========================================================
echo   LCCB Academix - Side-by-Side Dual Demo Launcher
echo ========================================================
echo.

REM Detect Chrome or Edge executable
set BROWSER_EXE=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else (
    set "BROWSER_EXE=msedge.exe"
)

echo Detected Browser: %BROWSER_EXE%
echo.
echo Launching Tutor (Window 1 - Left)...
start "" "%BROWSER_EXE%" --new-window --window-position=0,0 --window-size=960,1040 "http://localhost:5173"

timeout /t 1 /nobreak > NUL

echo Launching Learner (Window 2 - Right, Incognito)...
start "" "%BROWSER_EXE%" --incognito --new-window --window-position=960,0 --window-size=960,1040 "http://localhost:5173"

echo.
echo ========================================================
echo   Both windows launched side-by-side!
echo   - Left: Tutor (switch role to Tutor or TU-042)
echo   - Right: Student (switch role to Student or TE-128)
echo   - Click "Check In / Join Live Session" on both windows.
echo   - Click "Auto-Demo Chat" to play the live research dialogue!
echo ========================================================
pause
