@echo off
title DoseWise Academy - GitHub Uploader
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0upload_to_github.ps1"
if %errorlevel% neq 0 (
    pause
)
