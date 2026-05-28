@echo off
SETLOCAL EnableDelayedExpansion

color 0A
title ECO SCUBA - GitHub Auto Push

echo.
echo ==========================================================
echo        ECO SCUBA - AUTOMATSKI GITHUB PUSH
echo ==========================================================
echo.

:: DEFINICIJA PROJEKTA
set PROJECT_DIR=C:\DAVOR_PRIVATE\Locker\PRIVATE\AI\Eco_Scuba
set REPO_URL=https://github.com/mulalicd/eco-scuba

:: PRELAZAK U FOLDER
cd /d "%PROJECT_DIR%"

if errorlevel 1 (
    echo [GRESKA] Folder ne postoji:
    echo %PROJECT_DIR%
    pause
    exit /b
)

:: GIT INIT AKO NE POSTOJI
if not exist ".git\" (
    echo [INFO] Git nije inicijalizovan. Pokrecem git init...
    git init

    echo [INFO] Dodajem GitHub remote...
    git remote add origin %REPO_URL%

    echo [INFO] Postavljam main branch...
    git branch -M main
)

:: PROVJERA REMOTE URL
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo [SYSTEM] Trenutni status:
git status -s

echo.
set /p msg="Commit poruka (ENTER = Auto Backup): "

if "!msg!"=="" (
    for /f %%i in ('powershell -command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set msg=Backup %%i
)

echo.
echo [1/4] Dodavanje fajlova...
git add .

echo.
echo [2/4] Commit...
git commit -m "!msg!"

echo.
echo [3/4] Pull sa GitHub...
git pull origin main --allow-unrelated-histories --no-rebase

echo.
echo [4/4] Push na GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Pokusavam fallback na master...
    git push -u origin master
)

if %errorlevel% equ 0 (
    echo.
    echo ==========================================================
    echo [USPJEH] ECO SCUBA uspjesno pushan na GitHub!
    echo Repo: %REPO_URL%
    echo ==========================================================
) else (
    echo.
    echo [GRESKA] Push nije uspio.
)

pause
ENDLOCAL