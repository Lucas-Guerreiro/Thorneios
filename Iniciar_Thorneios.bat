@echo off
title Iniciando Thorneios...
echo ======================================================
echo           INICIANDO SERVIDOR DO THORNEIOS
echo ======================================================
echo.
echo Limpando cache do servidor e iniciando...
echo Este terminal precisa continuar aberto enquanto voce usa o sistema.
echo Para fechar o sistema, basta fechar esta janela.
echo.
cd /d "c:\Users\lucas\.gemini\antigravity\scratch\futebol-manager"
npm run dev -- --force --open
