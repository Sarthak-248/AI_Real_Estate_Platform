@echo off
REM Start AI Service
cd /d "%~dp0ai_service"
echo Starting AI Service on http://127.0.0.1:8000...
python -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
