@echo off
title Create CareerLens AI Desktop Shortcut
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0create_desktop_shortcut.ps1"
pause
