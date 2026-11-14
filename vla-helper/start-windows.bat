@echo off
chcp 65001 >nul
title RoboMakers VLA 도우미
cd /d "%~dp0"
echo.
echo  RoboMakers VLA 도우미를 준비합니다. (처음 한 번은 1~3분 걸립니다)
echo.
where uv >nul 2>nul
if errorlevel 1 (
  if not exist "%USERPROFILE%\.local\bin\uv.exe" (
    echo  [1/2] 실행 도구^(uv^)를 설치합니다...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
  )
  set "PATH=%USERPROFILE%\.local\bin;%PATH%"
)
echo  [2/2] VLA 도우미를 켭니다...
uv run --python 3.12 server.py %*
echo.
echo  VLA 도우미가 꺼졌습니다. 위의 메시지를 확인하세요.
pause