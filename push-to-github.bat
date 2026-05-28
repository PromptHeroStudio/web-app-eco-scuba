@echo off
SETLOCAL EnableDelayedExpansion

color 0A
title ECO SCUBA - GitHub Auto Push

echo.
echo ==========================================================
echo        ECO SCUBA - AUTOMATSKI GITHUB PUSH
echo ==========================================================
echo.

:: PROJEKT
set PROJECT_DIR=C:\DAVOR_PRIVATE\Locker\PRIVATE\AI\Eco_Scuba
set REPO_URL=https://github.com/PromptHeroStudio/web-app-eco-scuba.git

cd /d "%PROJECT_DIR%"

if errorlevel 1 (
    echo [GRESKA] Folder nije pronađen.
    pause
    exit /b
)

:: PREKINI ZAGLAVLJENI MERGE AKO POSTOJI
git merge --abort >nul 2>&1

:: GIT INIT AKO TREBA
if not exist ".git\" (
    echo [INFO] Inicijalizujem Git...
    git init
)

:: FORCE UPDATE REMOTE
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
git status

echo.
set /p msg="Commit poruka (ENTER = Auto Backup): "

if "!msg!"=="" (
    for /f %%i in ('powershell -command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do (
        set msg=Backup %%i
    )
)

echo.
echo [1/5] Git Add...
git add .

echo.
echo [2/5] Commit...
git commit -m "!msg!"

echo.
echo [3/5] Fetch...
git fetch origin

echo.
echo [4/5] Pull Rebase...
git pull --rebase origin main

if errorlevel 1 (
    echo.
    echo =========================================
    echo REBASE CONFLICT DETECTED
    echo Resolve conflicts manually.
    echo =========================================
    pause
    exit /b
)

echo.
echo [5/5] Push...
git push -u origin main

if errorlevel 1 (
    echo.
    echo =========================================
    echo PUSH FAILED
    echo Check GitHub authentication.
    echo =========================================
) else (
    echo.
    echo =========================================
    echo PUSH USPJESAN
    echo Repo: %REPO_URL%
    echo =========================================
)

pause
ENDLOCAL