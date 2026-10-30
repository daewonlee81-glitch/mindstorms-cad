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
- **경기장**: RoboRAVE 스모(Ø80cm), WRL 로봇 배틀 오델로, 축구(MRC 120×180), RoboRAVE 라인 팔로우 ES·MS·HS, Botball 주니어 Mat A, SPIKE 에센셜 숫자 경기장
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
