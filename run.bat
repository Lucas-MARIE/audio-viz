@echo off
echo Lancement d'Analify...
echo.

REM Activer l'environnement conda
call conda activate analify
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] L'environnement 'analify' n'existe pas.
    echo.
    echo Lancez d'abord: install.bat
    echo.
    pause
    exit /b 1
)

REM Lancer l'application
python main.py
