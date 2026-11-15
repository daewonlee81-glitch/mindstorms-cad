# 자동 회귀 테스트

기능을 고친 뒤 다른 곳이 깨지지 않았는지 한 번에 확인합니다. 실제 Chrome(화면 없이)으로 앱을 열고, 학생이 하듯이 블록을 넣고 실행해 봅니다.

## 실행

```bash
pip install playwright websockets pillow numpy
python -m playwright install chromium

python tests/run.py            # 빠른 테스트 24개 (약 5분)
python tests/run.py --full     # + 시범→학습→주행 (약 6분)
python tests/run.py -k camera  # 이름에 camera 가 들어간 것만
```

- 다른 Chrome 을 쓰려면 `CHROME=/경로/chrome python tests/run.py`
- 결과 요약은 `tests/_out/result.json`, 파이썬 문법 오류가 나면 생성된 코드도 `tests/_out/` 에 남습니다.
- 하나라도 실패하면 종료 코드 1 (자동 실행에서 ❌ 표시).

GitHub 에 올리면(push) **Actions** 탭에서 빠른 테스트가 저절로 돌아갑니다. 전체 테스트는 Actions → tests → **Run workflow** 로 실행합니다.

## 테스트 목록

| 이름 | 확인하는 것 |
|---|---|
| js-syntax | 모든 .js 파일 문법 (node 필요) |
| page-load | 앱이 오류 없이 열리고, VLA·신경망 기능과 블록·시뮬레이터 칸이 모두 있는지 |
| ai-camera-views | AI 카메라 1인칭·3인칭·위에서 그림 — 3인칭·위에서는 로봇(보라·노랑 앞)이 보이고 1인칭은 안 보이는지 |
| camera-sharp-view | 화면용 카메라는 크게·부드럽게(슈퍼샘플링) 그리고, AI 가 받는 그림(96×72, 눈 24×18)은 하나도 바뀌지 않는지. 「🔍 선명한 화면」을 끄면 예전처럼 칸이 보이는지 |
| real-robot-link | 🔗 실제 로봇 연결(가짜 허브): 시뮬레이터의 바퀴 명령이 `V:속도,회전` 으로 허브에 가는지, 속도 비율, 시뮬레이터를 멈추면 `V:0,0`, 끄면 보내지 않는지 |
| real-robot-hub-program | 허브 쪽 파이썬을 가짜 pybricks 로 실제로 돌려: 명령대로 움직이고, ±400 mm/s·±360 °/s 로 자르고, 엉터리 줄은 무시하고, 0.3초 동안 명령이 없으면 멈추는지 |
| teach-by-keyboard | 「🎮 운전해서 가르치기」: 키보드로 운전하면 로봇이 움직이고 장면(앞으로·멈춤)이 쌓이는지, 스페이스가 시뮬레이터를 멈추지 않는지 |
| demo-check-warnings | 학습 창 ⚠️ 시범 점검 5가지 경고와 시뮬레이터 칸 경고 개수 |
| train-language-and-inspect | 같은 그림이라도 지시가 다르면 다른 행동을 배우는지(L), 들여다보기 계산(주목한 곳·반사실·처음 듣는 낱말) |
| look-inside-windows | 🔍 AI 속 들여다보기 창(숨은 칸 클릭 → 가중치 그림·행동 막대), 학습 창 가중치 그림 |
| neural-network-weights | 🔍 신경망 들여다보기 계산이 실제 신경망(허브와 같은 계산)과 같은지, 가중치 표 32칸, 계산식, 달릴 때 실제 센서 값 |
| code-generation | 새 블록 3개의 시뮬레이터(JS) 코드 문법과 Pybricks 파이썬 코드 문법 (VLA 두 블록은 허브에서 명령 받기 프로그램) |
| vla-helper-server | PC VLA 도우미: 연습 모드 명령, 주행 기록 저장, 허용 안 된 사이트 거부, 웹 CAD 연결 |
| all-mats-load | 시뮬레이터 매트(경기장) 50개를 하나씩 골라도 오류가 없는지 |
| cad-open-save | 수업 도면(RM-LineBase)을 열고 .ldr 로 저장하면 부품이 그대로인지 |
| assembly-cards-zip | 조립카드 ZIP 에 카드 그림·인쇄용 cards.html·.ldr 이 들어 있는지 |
| gear-ratios | ⟳ 회전 실험: 8T → 24T → 40T 기어비 −1/3, +1/5 |
| every-block-codegen | 도구 상자의 모든 블록(129종)의 시뮬레이터 JS 문법 + Pybricks 파이썬 문법 |
| auto-tuning-training-runs | 🎓 라인트레이싱 자동 생성 학습이 몇 세대 돌아가는지 |
| othello-ai-field | 오셀로 AI 경기장(판·블록·상대 로봇)에서 잠깐 달려도 오류 없는지 |
| code-save-json | 💾 코드 저장(.json) 형식 |
| script-order | index.html 스크립트 순서가 파일끼리 의존 순서와 맞는지 (`LOAD_AFTER`) |
| app-hooks-patched | tools/patch_cadx.py · patch_trx.py 의 훅 29개가 app.js 에 모두 들어 있는지 |
| app-contract | 덧붙임 파일들이 쓰는 app.js 의 이름 58개와 서로 주고받는 전역 25개가 있는지 (`CONTRACT`) |
| demo-train-drive (3인칭) — `--full` | 스크립트로 빨강·파랑 시범 2번씩 → 40번 학습 → 같은 출발점에서 지시만 바꿔 맞는 칸(빨강 = 위, 파랑 = 아래)으로 가는지 |

구조 설명(무엇이 어디에 있고 무엇에 기대는지)은 [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## 테스트 더하기

`tests/run.py` 에 `@test("이름")` 붙인 `async def` 함수를 하나 더 쓰면 됩니다. `pg = await env.page()` 로 깨끗한 창을 열고, `check(조건, "실패 설명")` 으로 확인하고, 끝에 `await env.close(pg)` 를 부릅니다. 느린 테스트는 `@test("이름", full=True)`.

알아 둘 점: 화면 없는 Chrome 은 시뮬레이터 시간이 실제보다 느리게 흐를 수 있습니다. "몇 초 기다리기" 대신 `wait_for_function(...)` 으로 상태를 기다리세요.
