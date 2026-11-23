@echo off
REM Standalone ML service (Module 3) on :5051
cd /d "%~dp0.."
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
python -m m3_ml_kushagra.ml_service.app
