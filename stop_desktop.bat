@echo off
title Stop CareerLens AI Desktop Services
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0stop_desktop.ps1"
