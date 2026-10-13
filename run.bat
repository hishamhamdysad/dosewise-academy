@echo off
chcp 65001 > nul
title DoseWise Academy Training Center System
echo ========================================================
echo   DoseWise Academy - Training Center Management System
echo   أكاديمية دوز وايز لإدارة التدريب والتعليم الطبي
echo ========================================================
echo.
echo Starting DoseWise Academy server on http://127.0.0.1:8000 ...
echo.

start "" "http://127.0.0.1:8000"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
