@echo off
setlocal
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File "%~dp0windows.ps1" %*
exit /b %ERRORLEVEL%
