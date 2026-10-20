@echo off
title VetClinic Pro - Lanzador Completo
echo ===================================================
echo   Iniciando VetClinic Pro (Backend y Frontend)
echo ===================================================

start "VetClinic Pro - Backend (.NET 8)" cmd /k "%~dp0iniciar-backend.bat"
timeout /t 3 /nobreak > nul
start "VetClinic Pro - Frontend (React)" cmd /k "%~dp0iniciar-frontend.bat"

echo.
echo Los servicios se estan ejecutando:
echo   - Backend:  http://localhost:5021 (Swagger: http://localhost:5021/swagger)
echo   - Frontend: http://localhost:5173
echo.
echo Puedes cerrar esta ventana.
timeout /t 5

