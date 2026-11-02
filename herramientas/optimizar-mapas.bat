@echo off
title FAFI 1.6 - optimizar mapas pesados
cd /d "%~dp0.."
echo ================================================================
echo  Reduce las texturas de los mapas "with_real_light" (8192/4096 px)
echo  a 2048 y 1024 px. Los originales NO se tocan.
echo  Salida: game-client\assets\Mapas para tt vs ct\optimizados\
echo ================================================================
set D=game-client\assets\Mapas para tt vs ct
if not exist "%D%\optimizados" mkdir "%D%\optimizados"
powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\optimizar-glb.ps1 -In "%D%\cs_italy_with_real_light.glb"  -Out "%D%\optimizados\cs_italy_2k.glb"  -MaxSize 2048
powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\optimizar-glb.ps1 -In "%D%\cs_italy_with_real_light.glb"  -Out "%D%\optimizados\cs_italy_1k.glb"  -MaxSize 1024
powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\optimizar-glb.ps1 -In "%D%\cs_office_with_real_light.glb" -Out "%D%\optimizados\cs_office_2k.glb" -MaxSize 2048
powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\optimizar-glb.ps1 -In "%D%\cs_office_with_real_light.glb" -Out "%D%\optimizados\cs_office_1k.glb" -MaxSize 1024
powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\optimizar-glb.ps1 -In "game-client\assets\granadas\flash_granade.glb" -Out "game-client\assets\granadas\optimizados\flash_granade_1k.glb" -MaxSize 1024
echo.
echo Listo.
pause
