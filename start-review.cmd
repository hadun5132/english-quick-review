@echo off
setlocal
cd /d "%~dp0"
set "runtime=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
set "node_bin=node.exe"
where.exe node.exe >nul 2>&1
if errorlevel 1 if exist "%runtime%\node\bin\node.exe" set "node_bin=%runtime%\node\bin\node.exe"
if not defined REVIEW_PYTHON if exist "%runtime%\python\python.exe" set "REVIEW_PYTHON=%runtime%\python\python.exe"
echo Student pages: http://127.0.0.1:4173/
echo Upload and publish: http://127.0.0.1:4173/admin/
"%node_bin%" admin\server.mjs
if errorlevel 1 pause
