@echo off
if "%1"=="" (
    cmd /k "%~dp0sync-to-netlify.bat" _k
    exit /b
)

cd /d "%~dp0"

echo ========================================
echo   TruthSequence sync to Netlify
echo ========================================
echo.

echo [1/3] git add...
git add .
if errorlevel 1 (
    echo Error: git add failed
    goto end
)

echo [2/3] git commit...
set "MSG=update: %date% %time:~0,5%"
if not "%~1"=="" if not "%~1"=="_k" set "MSG=%~1"
git commit -m "%MSG%"
if errorlevel 1 (
    echo Info: No changes to commit
)

echo [3/3] git push...
git push origin main
if errorlevel 1 (
    echo Error: git push failed
    goto end
)

echo.
echo ========================================
echo   Done. Netlify will auto-deploy.
echo   Site: truthsequence.netlify.app
echo ========================================

:end
echo.
pause
