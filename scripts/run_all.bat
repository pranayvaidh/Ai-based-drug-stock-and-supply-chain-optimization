@echo off
REM Opens three windows: backend (:5050), ML service (:5051), frontend (:5173)
cd /d "%~dp0.."
start "API :5050" cmd /k scripts\run_backend.bat
start "ML :5051" cmd /k scripts\run_ml.bat
start "Frontend :5173" cmd /k npm run dev
echo Started. Open http://localhost:5173
