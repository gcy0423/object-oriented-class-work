@echo off
setlocal
set "NODE_HOME=%~dp0.runtime\node-v20.20.2-win-x64"
set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"
node scripts\startServices.mjs --mock
