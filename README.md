# 로보메이커스 캐드 (RoboMakers CAD)

LEGO® EV3 · SPIKE 부품으로 로봇을 조립하고, 스텝별 **조립카드**를 만드는 웹 CAD입니다. 설치 없이 브라우저에서 실행됩니다.

**바로 사용하기:** https://daewonlee81-glitch.github.io/mindstorms-cad/

## 주요 기능
- EV3 Core/Expansion/Home, SPIKE Prime/Expansion/Essential, Robot Inventor 세트 부품 (LDraw 라이브러리 기반)
- ESP32 DevKitC · DevKit V1, Arduino Uno · Nano 보드, Geekservo 서보 모터
- 핀홀·액슬·스터드 자석 스냅, 우클릭 좌표 편집, 되돌리기
- 편집하면서 실시간 조립카드 생성, 이전 스텝 회색 표시, 카드별 시점 조절
- `.ldr` 저장/열기 (LeoCAD · LDCad · BrickLink Studio 호환), 카드 ZIP(PNG + 인쇄용 HTML) 저장
- 부품 팔레트에서 드래그해 놓기, 브릭 사용량(보유 수량 대비) 카운트
- **로봇 시뮬레이터**: 위쪽 `CAD | 로봇 시뮬레이터` 토글로 전환, SPIKE 워드 블록 스타일 블록코딩으로 만든 로봇을 매트 위에서 움직이기 (라인·격자·색깔·장애물 매트, 컬러·거리·힘 센서)
- 허브 화면: SPIKE Prime 5×5 라이트 매트릭스(이미지·글자 스크롤·픽셀), EV3 LCD, SPIKE Essential(화면 없음 — 버튼 불빛만)
- **물리엔진 모드**(Rapier): 무게·마찰·충돌·넘어짐 계산, 바퀴 미끄러짐과 모터 정지(스톨) 반영
- **경기장**: RoboRAVE 스모(Ø80cm), WRL 로봇 배틀 오델로, 축구(MRC 120×180), RoboRAVE 라인 팔로우 ES·MS·HS, Junior Botball Field A, **JBC 2025 중국 결선 과제**(루키 12 · 어드밴스드 12, 캔·캔 묶음·종이 상자·EVA 블록 배치, 무작위 배치 과제 지원), SPIKE 에센셜 숫자 경기장
- **UMC 미지 미션 챌린지**: 당일 공개형 미션 연습 경기장 5종(바코드 내비게이터 · 사다리 세기 · 컵 밀기 · 도형 탐정 · 10cm 앞에 서기), 주니어·시니어 과제 구분, 경기장을 고르거나 점수판의 🎲 새 배치를 누를 때마다 무작위 배치, 런당 2분 타이머와 실시간 자동 채점. 📥 수업 도면의 `UMC 예제`에 미션별 예제 프로그램 10개
- **자동 튜닝 학습**: JBC 루키 과제(R1~R12) 자동 채점, 경기장 16개(4×4)를 동시에 돌려 블록 프로그램의 숫자(거리·각도 등)를 자동으로 찾기, 실제 오차 반영 옵션, 최적값을 블록에 바로 적용
- **블록 자동 생성 학습**: 코드 없이 시작해 컴퓨터가 회전·이동·대기 블록을 스스로 조합해 보며 점수가 가장 높은 프로그램을 찾고, 결과를 SPIKE 블록으로 만들어 줌 (한 세대 48개 시도, 단계를 하나씩 늘려 가며 탐색)
- **물리엔진 학습**: 경기장마다 Rapier 물리 세계를 따로 만들어 무게·마찰·미끄러짐·캔 넘어짐까지 계산하며 학습 (2D로 먼저 학습 → 물리엔진 숫자 튜닝으로 다듬기 추천)
- **라인트레이싱 학습**: 라인 매트·RoboRAVE ES/MS/HS·직접 올린 매트에서 컬러 센서로 따라간 선의 비율로 채점, "무한 반복: 조향 = (반사광 − 목표값) × 비례값" 프로그램의 속도·목표값·비례값을 자동으로 찾아 블록으로 만들어 줌 (직접 짠 라인트레이싱 프로그램의 숫자 튜닝도 가능)
- **제어 방식 4가지**: 온오프 · P · PD · PID 제어를 초등학생 눈높이 설명과 함께 골라 학습, "4가지 모두 비교"로 점수·완주 시간 비교표 (PD·PID는 변수 블록 오차·이전 오차·누적 오차 사용)
- **실제 허브에서 실행 (Pybricks)**: 시뮬레이터의 워드블록을 Pybricks 파이썬으로 바꿔 웹 블루투스로 SPIKE Prime·Essential·Robot Inventor 허브에 내려보내 바로 실행, 허브의 출력 메시지 표시, 파이썬 코드 보기·복사·.py 저장 (허브에 Pybricks 펌웨어 필요, PC·안드로이드의 Chrome·Edge)
- **AI 카메라**: PC 카메라로 몸 스켈레톤(관절 위치·팔 각도·몸 기울기), 손 제스처·펼친 손가락 수, 얼굴, 물체(사람·공·컵 등 18종), 색 덩어리(빨강·초록·파랑·노랑)를 인식하고, 카메라로 직접 학습시키는 분류(클래스 4개)까지 "AI 카메라" 블록으로 써서 로봇을 움직이기. 시뮬레이터와 실제 Pybricks 허브(블루투스로 값 전송) 모두 동작, 브라우저 안에서만 처리(영상은 밖으로 나가지 않음)
- **워드블럭 블록**: 시뮬레이터 블록은 [로보메이커스 워드블럭](https://daewonlee81-glitch.github.io/Robomakers_APP/)과 같은 구성(시작·모터·주행·센서·허브·제어·연산·변수·내 블록·AI 카메라·게임패드·허스키렌즈·ESP32)과 같은 파이썬 코드·허브 라이브러리를 씁니다. 블루투스·USB 연결, ▶ 실행과 📥 허브에 다운로드(저장만 하고 허브 버튼으로 실행)
- 채점은 2025 JBC 중국 결선 루키 과제 규칙 기준 (캔이 원을 벗어나거나 넘어지면 실패, 로봇 전체 출발선 복귀, 차고 1초 정지, R7 큰 번호부터, 끝날 때 캔 접촉 금지, 매트 이탈 실패)
- 한국어 / English / 日本語 / 中文 / Español

## 실행
- 웹: GitHub Pages 주소로 접속
- 오프라인: 저장소를 내려받아 `index.html`을 더블클릭 (인터넷 불필요)

## 제작 · 문의
RoboMakers · Daewon Lee · robot-league@naver.com
오류 제보 시 프로그램 오른쪽 위 **RoboMakers** 버튼 → "환경 정보 복사" 내용을 함께 보내주세요.

## 사용한 데이터와 라이선스
- 부품 형상: [LDraw.org Parts Library](https://www.ldraw.org) — CC BY 4.0 (각 부품 작성자 표기 포함)
- Geekservo · CADA · Circuit Cubes 부품: Philippe Hurbain ([philohome.com](https://philohome.com)) — CC BY 4.0 / CCAL 2.0
- ESP32 · Arduino 보드: RoboMakers 단순화 모델 — CC BY 4.0
- 3D 엔진: [three.js](https://threejs.org) — MIT · ZIP: [JSZip](https://stuk.github.io/jszip/) — MIT · 블록 편집기: [Blockly](https://github.com/google/blockly) — Apache 2.0 · 물리엔진: [Rapier](https://rapier.rs) — Apache 2.0 · 파이썬 컴파일러: [Pybricks mpy-cross](https://github.com/pybricks/pybricks-micropython) — MIT · 허브 라이브러리: 로보메이커스 워드블럭 hublib (pupremote_hub·bluepad: [Anton's Mindstorms](https://github.com/antonvh) — GPL-3.0) · AI 카메라: [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe)과 모델(포즈·제스처·얼굴·물체·이미지 임베딩) — Apache 2.0
- 세트 구성 정보: [Rebrickable](https://rebrickable.com)

LEGO®, MINDSTORMS®, SPIKE™는 LEGO Group의 상표이며, 이 프로젝트는 LEGO Group의 후원이나 승인을 받지 않았습니다.

## 워드블럭 에디터 연동 (wordblock-sync.js)

[로보메이커스 워드블럭 에디터](https://daewonlee81-glitch.github.io/Robomakers_APP/)의 새 블록(사물 인식·사물 학습·색 인식·색 학습, ESP32 핀·서보·네오픽셀)과 최신 허브 라이브러리를 `wordblock-sync.js` 가 시뮬레이터에 붙입니다.

- 에디터의 **🧪 시뮬레이터** 버튼 → 블록을 들고 이 시뮬레이터로 옵니다 (`?from=wordblock`).
- 시뮬레이터의 **✏️ 워드블럭 에디터로** 버튼 → 블록을 에디터로 돌려보냅니다.
- `wordblock-sync.js` 는 에디터 저장소의 `tools/sync_cad.py` 가 만듭니다. 직접 고치지 마세요.
- `app.js` 에는 훅 네 곳만 들어 있습니다 (`window.__wb` 확장, `window.__wbKeys`, `window.__wbFrames`, `window.__wbTb`). app.js 를 다시 빌드하면 이 훅을 다시 넣어야 합니다.

## UMC 경기장 (umc.js)

`umc.js` 가 로봇 시뮬레이터의 경기장 목록에 "UMC 미지 미션 챌린지" 묶음(미션 5종 × 주니어·시니어)을 붙입니다.

- 배치(바코드 값, 가로선 위치, 컵 위치와 색 카드, 도형, 상자 거리)는 경기장을 고를 때와 🎲 새 배치를 누를 때 새로 뽑습니다.
- 점수판은 운영 매뉴얼의 채점표를 따릅니다. 삐 소리 횟수와 화면 숫자는 `삐 소리`·`화면에 숫자 보여주기` 블록 호출로 판정합니다.
- 시뮬레이터에서는 출발 구역을 파란 선으로 그립니다(컬러 센서가 검은 선으로 읽지 않도록). 미션 5의 상자는 움직이지 않는 벽입니다.
- 예제 프로그램은 `classes/UMC 예제/` 에 있습니다. 로봇 모델 없이 기본 로봇(모터 A·B, 컬러 C, 거리 D)으로 동작합니다.
- `app.js` 에는 훅 한 곳(`window.__umc`)만 들어 있습니다. app.js 를 다시 빌드하면 `window.__wb={` 바로 앞에 아래 한 줄을 다시 넣어야 합니다.

```js
window.__umc={mats:uo,api:Wn,T:T,esc:ce,i18n:pr,pose:()=>Te,props:()=>Xe,time:()=>vt,hub:()=>We,sim:()=>q,robot:()=>Q,mat:()=>Nt};
```

빌드할 때마다 줄인 변수 이름(`uo`, `Wn` 등)이 바뀔 수 있습니다. 순서대로 경기장 표, 시뮬레이터 API, 번역 함수, HTML 이스케이프, 번역 표, 로봇 위치, 물체 목록, 시뮬레이션 시간, 허브 화면 상태, 시뮬레이터 상태, 로봇, 현재 경기장입니다.
