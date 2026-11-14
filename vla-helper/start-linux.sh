#!/bin/bash
# RoboMakers VLA 도우미 (Linux) — 터미널에서 ./start-linux.sh
cd "$(dirname "$0")"
echo
echo " RoboMakers VLA 도우미를 준비합니다. (처음 한 번은 1~3분 걸립니다)"
export PATH="$HOME/.local/bin:$PATH"
if ! command -v uv >/dev/null 2>&1; then
  echo " [1/2] 실행 도구(uv)를 설치합니다..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
echo " [2/2] VLA 도우미를 켭니다..."
uv run --python 3.12 server.py "$@"
echo
