@echo off
TITLE Spec Factory Server
echo ==========================================
echo   Iniciando Servidor de Spec Factory
echo ==========================================
echo Directorio actual: %cd%
echo Buscando dependencias...
python py/api.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudo iniciar el servidor.
    echo Asegurate de tener Python instalado y las dependencias de requirements.txt configuradas.
)
pause
