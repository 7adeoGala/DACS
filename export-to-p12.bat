@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\certificates.ps1" -Action P12 %*
exit /b %errorlevel%

