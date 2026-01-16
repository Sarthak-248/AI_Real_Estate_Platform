@echo off
REM Start both AI Service and Node.js Backend
title Sarthak Project Services

REM Create a new window for AI Service
start "AI Service" cmd /k "cd /d %~dp0ai_service && echo Starting AI Service on http://127.0.0.1:8000... && C:/sarthak_project/.venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait a bit for AI service to start
timeout /t 3

REM Create a new window for Node.js Backend
start "Node Backend" cmd /k "cd /d %~dp0api && echo Starting Node.js Backend... && npm start"

echo Both services started in separate windows.
echo AI Service: http://127.0.0.1:8000
echo Node Backend: http://127.0.0.1:3000 (default)
pause
