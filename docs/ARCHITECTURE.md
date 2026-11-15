# MindStorms CAD 구조 안내

이 문서는 코드를 고치는 사람(사람이든 AI든)이 **무엇이 어디에 있고, 무엇을 건드리면 어디가 깨지는지** 알 수 있게 정리한 것입니다. 기능을 더하거나 고치기 전에 먼저 읽어 주세요.

## 한눈에 보기

```
index.html
 ├ vendor/  Blockly(블록 편집기) · 블록 생성기(JS·파이썬) · rapier.js(물리엔진) · mpycross.js(파이썬 컴파일러)
 ├ data.js  부품 데이터(LDraw 338종, 연결점) — window.MSCAD_DATA
 ├ app.js   ★ 본체: three.js + CAD + 조립카드 + 시뮬레이터 + 학습기 + Pybricks 전송 (번들, 1.2MB)
 │          └ 내보내는 것: window.__cad · window.__cad.ext · window.__umc · window.__wb
 └ 덧붙임 파일 20개 (app.js 를 고치지 않고 기능을 더함) — 아래 표
```

### app.js 는 "번들"입니다

- `app.js` 는 예전 작업 환경의 원본(`web/index.html` 안의 모듈 스크립트 + `tools/sim.js`)을 **esbuild 로 한 파일로 묶고 줄인 결과**입니다. three.js 도 같이 들어 있습니다.
- **원본 소스는 git 에 한 번도 올라간 적이 없습니다** (이 저장소 커밋 85개 전체와 관련 저장소를 확인함, 2026-11-15). 그래서 app.js 는 사실상 고칠 수 없는 "본체"로 두고, 새 기능은 모두 덧붙임 파일로 붙입니다.
- app.js 안의 함수 이름은 줄여져 있어(`OC`, `i0`, `Rv` …) 그대로 읽기 어렵습니다. app.js 를 직접 바꾸는 일은 아래 "연결 고리" 두 도구만 합니다.
- 워드블럭 에디터 연동(`wordblock-sync.js` 와 app.js 일부)은 다른 작업 흐름에서 올라옵니다. **app.js 를 새로 받거나 바꾼 뒤에는 꼭** `python3 tools/patch_cadx.py app.js && python3 tools/patch_trx.py app.js` 를 돌리고 테스트를 돌리세요.

## 연결 고리 (app.js 에 넣는 훅)

덧붙임 파일이 app.js 안쪽에 끼어들어야 할 때는, app.js 의 정확한 글자를 찾아 바꾸는 도구로 훅을 넣습니다. 두 도구 모두 여러 번 돌려도 안전합니다(이미 들어 있으면 건너뜀). 찾을 글자가 없으면 멈추므로, app.js 가 바뀌었을 때 바로 드러납니다.

| 도구 | 훅 | 무엇을 하나 |
|---|---|---|
| `tools/patch_cadx.py` | 1 | 팔레트에서 끌 때 미리보기 모양 `__cadx.ghost` (cadx.js) |
| | 2·3 | .ldr 읽기·쓰기 때 `__cadx.onLoadText / onSaveText` (STL 부품을 .ldr 에 넣고 꺼냄) |
| | 4 | 시작할 때 `__cadxReady` 를 기다린 뒤 자동 저장 모델 열기 |
| | 5 | `window.__cad.ext` — 선택 부품·되돌리기·부품 추가·팔레트 다시 그리기 등 |
| | 6 | 시뮬레이터 로봇의 장치→포트 기록, `ext.simRebuild / robot / simRunning` (simports.js) |
| | 7 | 부품 복제본 `Q.clones` 와 `ext.motors()` — 추가 모터에 붙은 부품 돌리기 |
| | 8 | 허스키렌즈 센서 종류·포트 표 값·`ext.matPx(x, z)` 매트 색 (huskylens.js) |
| | 9 | 라인트레이싱 학습 컬러센서 2개 — `__line2.spec`, 두 센서 채점 (line2.js) |
| `tools/patch_trx.py` | 12개 | 자동 튜닝 학습기: 경기장 자체 채점·배치 `__trx` (umc.js), 학습 모델 `__trs` (trainmodel.js), 두 바퀴 동시 정지 등 |

## 덧붙임 파일 (index.html 불러오는 순서대로)

| 파일 | 하는 일 | 내보내는 전역 | 쓰는 것 |
|---|---|---|---|
| wordblock-sync.js | 워드블럭 에디터 블록·도구 상자·허브 연동 | `__wbSync` `__wbTb`(도구 상자 고치기) 외 | `__wb` |
| classes.js | 📥 수업 도면 (classes/ 폴더) | `__classes` | `__cad` `__wb` `__umc` |
| axes.js | CAD 오른쪽 위 좌표축 | `__axes` | `__cad` |
| backup.js | 작업 기록 자동 백업 (IndexedDB) | `__backup` | `__cad.model` |
| fixes.js | 작은 화면 고침 모음 | — | DOM |
| cadx.js | 밝은 미리보기·미세 각도·STL 불러오기 | `__cadx` `__cadxReady` | `__cad.ext` (훅 1–5) |
| simports.js | 시뮬레이터 포트 연결·추가 모터 돌리기 | `__simRigs` `__simRigObjs` | `__cad.ext` (훅 6·7) |
| huskylens.js | 허스키렌즈 부품·카메라, **일반 카메라 그림 `view()`**(ss 슈퍼샘플링), 화면용 선명한 그림 `preview()`·`hqShot()`(속도 따라 단계 자동) | `__husky` | `__cad.ext` `__umc` (훅 8) |
| cadmech.js | CAD ⟳ 회전 실험 (축·기어) | `__mech` | `__cad` |
| umc.js | UMC 미지 미션·Robofest 경기장, 학습기 경기장 훅 | `__trx` `__umcGuide` `__umcNew` `__umcDebug` | `__umc` (patch_trx) |
| rfmodels.js | Robofest 3D 준비물 모형 | `__rfDisp` | `__umc` |
| othelloai.js | WRL 오셀로 AI 경기장·상대 로봇 | `__othelloAI` | `__umc` `__husky` |
| simsave.js | 💾 코드 저장·📂 열기 | `__simCode` | `__wb` |
| line2.js | 라인트레이싱 학습 센서 2개 | `__line2` | 훅 9 |
| trainmodel.js | 학습 모델 고르기·🧠 신경망(뉴로에볼루션)·「신경망으로 주행」 블록 | `__trs` `__nnF` `__trainModel` | `__wb` `__umc` (patch_trx) |
| rfguide.js | Robofest 단계별 설명 | `__rfGuide` | `__umc` |
| vla.js | 🤖 VLA 도우미 연결·AI 카메라(1·3인칭·위에서)·「VLA로 주행」 블록 | `__vla` (`__wbTb` 감쌈) | `__husky.view` `__wbTb` |
| bc.js | 🧒 따라 하기 학습 (시범·학습·주행·시범 점검) | `__bc` | `__vla` |
| vlaviz.js | 🔍 AI 속 들여다보기 | `__vlaviz` | `__bc` `__vla` |
| nnviz.js | 🔍 신경망 들여다보기 (가중치) | `__nnviz` (`__nnF` 감쌈) | `__trainModel` `__nnF` |
| real.js | real2sim 1단계: 🔗 실제 로봇도 같이 움직이기 — 바퀴 명령을 Pybricks stdin `V:속도,회전` 으로 전달, 허브 쪽 받기 프로그램(0.3초 안전 정지) | `__real` (`__vla.drive` `__bc.drive/teach` 감쌈) | `__pyb.PB` `__vla` `__bc` |

PC 쪽 프로그램: `vla-helper/` (VLA 도우미 서버, `vla-helper.zip` 으로 내려받음).

## app.js 가 내보내는 것 (덧붙임 파일들이 기대는 약속)

아래 이름이 하나라도 사라지면 그 기능이 **오류 없이 조용히** 멈춥니다. 테스트 `app-contract` 가 매번 확인합니다 (`tests/run.py` 의 `CONTRACT`).

| 객체 | 이름 |
|---|---|
| `window.__cad` | THREE camera controls model objs root scene |
| `window.__cad.ext` (훅 5–8) | add apply bundle index loader matPx motors palette push reload robot sel simRebuild simRunning status |
| `window.__umc` | T api cam ctl esc i18n mat mats phys pose props robot sim time |
| `window.__wb` | WB_LIB Ye dg enterSim hub lang proj save simOn wbBuild wbCompileSrc wbGenPython wbSources wbToolbox ws |
| `window.__pyb` · `.PB` | pbRun pbStopHub PB · PB.tx PB.q PB.running PB.maxWrite (허브 블루투스 연결 — real.js 가 stdin 에 씀) |

자주 쓰는 것: `__umc.pose()` 로봇 위치(x, z mm, th 라디안) · `__umc.time()` 시뮬레이터 시간 · `__umc.props()` 경기장 물체 · `__umc.mat()` 지금 매트 · `__cad.ext.simRunning` 실행 중인지 · `__wb.ws()` 블록 작업 공간 · `__wb.wbCompileSrc(ws).src` 시뮬레이터 JS · `__wb.wbGenPython(ws)` Pybricks 파이썬.

## 새 기능을 붙이는 규칙

1. **새 파일로 만듭니다.** `xxx.js` 를 만들고 index.html 에서 의존하는 파일 뒤에 `<script src="xxx.js?v=1">` 로 불러옵니다. 고칠 때마다 `?v=` 숫자를 올립니다(브라우저 캐시).
2. 맨 위에 **무엇을 하는지·어디에 연결되는지** 주석을 씁니다 (다른 파일들처럼).
3. 시작할 때 필요한 전역이 없으면 조용히 끝냅니다: `if (!C || !X || !U) return;`
4. 다른 파일이 쓸 것은 `window.__이름 = { … }` 하나로 내보냅니다. 이미 있는 이름과 겹치지 않게.
5. app.js 안쪽을 바꿔야 하면 `tools/patch_*.py` 에 (찾을 글자, 바꿀 글자) 를 더합니다. 직접 app.js 를 손으로 고치지 않습니다.
6. 블록을 더할 때: `Blockly.Blocks.이름` + JS·파이썬 생성기, 도구 상자는 `window.__wbTb` 를 감싸서 (vla.js 참고). 워드블럭 동기화가 생성기를 다시 정의할 수 있어 2초마다 다시 넣는 방식을 씁니다.
7. 화면 글은 한국어를 기본으로, 영어(가능하면 일·중·스페인어)도 함께.
8. **테스트를 더하고 돌립니다:** `tests/run.py` 에 `@test` 하나, index.html 순서 규칙은 `LOAD_AFTER` 에 한 줄.
9. 무거운 일(학습 등)은 `await new Promise(r => setTimeout(r, 0))` 로 나눠 화면이 멈추지 않게.

## 고친 뒤 확인

```bash
python3 tools/patch_cadx.py app.js && python3 tools/patch_trx.py app.js   # app.js 를 바꿨을 때만
python3 tests/run.py            # 약 3분 — GitHub 에 올리면 Actions 에서도 저절로 돕니다
```

테스트가 확인하는 것: [tests/README.md](../tests/README.md)

## 앞으로 (근본 해결)

app.js 원본 소스를 다시 쓸 수 있게 되면(예전 작업 환경의 `web/index.html` + `tools/sim.js` + `tools/build_offline.py` 를 찾거나 다시 만들면) 그 원본을 `src/` 에 넣고, 훅 도구 대신 원본을 직접 고친 뒤 빌드하는 방식으로 바꾸는 것이 가장 좋습니다. 그때도 위 약속(`CONTRACT`)과 테스트는 그대로 쓸 수 있습니다.
