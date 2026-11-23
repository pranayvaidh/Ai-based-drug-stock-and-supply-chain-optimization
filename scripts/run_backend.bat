@echo off
REM Flask API (Module 1 + 2) on :5050
cd /d "%~dp0.."
if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
python -m m1_auth_lucky.backend.run
