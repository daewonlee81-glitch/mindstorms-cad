# MindStorms CAD

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
- **자동 튜닝 학습**: JBC 루키 과제(R1~R12) 자동 채점, 경기장 16개(4×4)를 동시에 돌려 블록 프로그램의 숫자(거리·각도 등)를 자동으로 찾기, 실제 오차 반영 옵션, 최적값을 블록에 바로 적용
- **블록 자동 생성 학습**: 코드 없이 시작해 컴퓨터가 회전·이동·대기 블록을 스스로 조합해 보며 점수가 가장 높은 프로그램을 찾고, 결과를 SPIKE 블록으로 만들어 줌 (한 세대 48개 시도, 단계를 하나씩 늘려 가며 탐색)
- **물리엔진 학습**: 경기장마다 Rapier 물리 세계를 따로 만들어 무게·마찰·미끄러짐·캔 넘어짐까지 계산하며 학습 (2D로 먼저 학습 → 물리엔진 숫자 튜닝으로 다듬기 추천)
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
- 3D 엔진: [three.js](https://threejs.org) — MIT · ZIP: [JSZip](https://stuk.github.io/jszip/) — MIT · 블록 편집기: [Blockly](https://github.com/google/blockly) — Apache 2.0 · 물리엔진: [Rapier](https://rapier.rs) — Apache 2.0
- 세트 구성 정보: [Rebrickable](https://rebrickable.com)

LEGO®, MINDSTORMS®, SPIKE™는 LEGO Group의 상표이며, 이 프로젝트는 LEGO Group의 후원이나 승인을 받지 않았습니다.
