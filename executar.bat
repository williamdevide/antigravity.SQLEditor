@echo off
chcp 65001 > nul
echo =====================================================================
echo                SQLEditor - Ambiente Interativo MySQL
echo                    Google Antigravity - SENAI Edition
echo =====================================================================
echo.

IF NOT EXIST "frontend\node_modules" (
    echo [1/3] Instalando dependencias do frontend...
    cd frontend
    call npm install
    cd ..
) ELSE (
    echo [1/3] Dependencias do frontend verificadas.
)

echo.
echo [2/3] Iniciando o servidor de desenvolvimento do SQLEditor...
cd frontend
start http://localhost:5173
call npm run dev
cd ..

pause
