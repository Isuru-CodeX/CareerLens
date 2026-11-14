@echo off
title CareerLens AI Desktop Application
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0run_desktop.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo CareerLens Desktop encountered an issue.
    pause
)
