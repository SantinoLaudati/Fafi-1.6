@echo off
title FAFI 1.6 - servidor local
cd /d "%~dp0"
echo Iniciando FAFI 1.6...
echo (Hace falta internet: three.js se carga desde un CDN)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
pause
