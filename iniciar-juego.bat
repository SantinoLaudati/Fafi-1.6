@echo off
title FAFI 1.6 - servidor local
cd /d "%~dp0"
echo ==========================================
echo   FAFI 1.6 - servidor local (rama master)
echo ==========================================
echo.
echo Iniciando el juego en http://localhost:5173
echo - Hace falta internet: three.js se carga desde un CDN.
echo - En el login usa "JUGAR SIN CONEXION".
echo - Para detener el servidor, cierra esta ventana.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if errorlevel 1 (
  echo.
  echo Hubo un problema al iniciar el servidor.
)
pause
