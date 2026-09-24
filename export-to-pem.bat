@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\certificates.ps1" -Action Pem %*
exit /b %errorlevel%

