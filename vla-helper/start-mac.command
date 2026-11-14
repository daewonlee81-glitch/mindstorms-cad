#!/bin/bash
# RoboMakers VLA 도우미 (macOS) — 더블클릭해서 실행
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
read -n 1 -s -r -p " VLA 도우미가 꺼졌습니다. 아무 키나 누르면 창이 닫힙니다."
