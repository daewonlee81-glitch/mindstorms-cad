// wordblock-sync.js — 로보메이커스 워드블럭 에디터의 새 기능을 시뮬레이터(캐드)에 붙입니다.
//
//   · 사물 인식 · 사물 학습 · 색 인식 · 색 학습 블록 (시뮬레이터에서도 카메라로 동작)
//   · ESP32 핀 블록 (GPIO · PWM · 서보 · 네오픽셀 — 실제 허브에서만 동작)
//   · 허브 라이브러리(rm_aicam · rm_esp32 · rm_husky …)를 에디터와 같은 최신 버전으로 교체
//   · 워드블럭 에디터 ↔ 시뮬레이터 블록 주고받기
//
// 이 파일은 워드블럭 에디터 저장소의 tools/sync_cad.py 가 만듭니다. 직접 고치지 마세요.
// 워드블럭 에디터 버전: 0.3.18
(() => {
  'use strict';
  const EDITOR_VERSION = '0.3.18';
  const MSGS = {"ko": {"o.color.RED": "빨강", "o.color.ORANGE": "주황", "o.color.YELLOW": "노랑", "o.color.GREEN": "초록", "o.color.CYAN": "하늘", "o.color.BLUE": "파랑", "o.color.VIOLET": "보라", "o.color.MAGENTA": "자홍", "o.color.WHITE": "흰색", "o.color.BLACK": "검정", "o.color.BROWN": "갈색", "o.color.NONE": "없음", "teach.class": "사물 {0}", "color.slot": "색 {0}", "coco.any": "아무 사물", "tb.object": "사물 인식", "tb.teach": "사물 학습", "tb.color": "색 인식", "tb.lcolor": "색 학습", "o.objv.x": "X 위치 (0~100)", "o.objv.y": "Y 위치 (0~100)", "o.objv.size": "크기 (0~100)", "o.objv.score": "확신도 (%)", "o.objv.id": "사물 번호", "o.teachv.taught": "사물 번호 (0 = 없음)", "o.teachv.taught_conf": "확신도 (%)", "o.colorv.id": "색 번호", "o.colorv.r": "빨강 R (0~255)", "o.colorv.g": "초록 G (0~255)", "o.colorv.b": "파랑 B (0~255)", "o.lcolv.size": "크기 (화면의 %)", "b.rm_ai_obj_seen": "📷 사물 %1 이 보이나?", "b.rm_ai_obj_seen.tip": "실행하면 카메라가 켜지고 생활 속 사물 80가지(COCO)를 알아봅니다.", "b.rm_ai_obj_value": "📷 사물 %1 의 %2", "b.rm_ai_teach_is": "📷 학습한 사물이 %1 인가?", "b.rm_ai_teach_is.tip": "사물 학습은 워드블럭 에디터의 AI 카메라 탭에서 하세요. 같은 브라우저에 저장된 학습 결과를 시뮬레이터도 씁니다.", "b.rm_ai_teach_value": "📷 학습한 사물 %1", "b.rm_ai_color_is": "📷 가운데 색이 %1 인가?", "b.rm_ai_color_is.tip": "실행하면 카메라가 켜지고 화면 가운데 네모 안의 색을 읽습니다.", "b.rm_ai_color_value": "📷 가운데 색 %1", "b.rm_ai_lcolor_seen": "📷 학습한 %1 이 보이나?", "b.rm_ai_lcolor_seen.tip": "색 학습은 워드블럭 에디터의 AI 카메라 탭에서 하세요. 같은 브라우저에 저장된 학습 결과를 시뮬레이터도 씁니다.", "b.rm_ai_lcolor_value": "📷 학습한 %1 의 %2", "tb.espio": "ESP32 핀 (GPIO·PWM·서보) — 실제 허브에서만 동작 · ESP32 의 main.py 는 워드블럭 에디터에서 받으세요", "tb.neopixel": "ESP32 네오픽셀", "o.onoff.1": "켜기", "o.onoff.0": "끄기", "o.pull.1": "풀업 없음", "o.pull.2": "풀업", "o.pull.3": "풀다운", "o.color.OFF": "끄기", "b.rm_eio_dout": "📡 ESP32 %1 핀 %2 %3", "b.rm_eio_dout.tip": "ESP32 의 GPIO 핀을 켜거나(3.3V) 끕니다(0V). 핀 번호는 보드에 적힌 GPIO 번호입니다.", "b.rm_eio_din": "📡 ESP32 %1 핀 %2 이 켜져 있나? (%3)", "b.rm_eio_din.tip": "디지털 입력. 풀업이면 버튼을 핀과 GND 사이에 연결하고, 누르면 「거짓」이 됩니다.", "b.rm_eio_ain": "📡 ESP32 %1 핀 %2 아날로그 값 (0~4095)", "b.rm_eio_ain.tip": "0~3.3V 를 0~4095 로 읽습니다. ESP32 의 ADC1 핀(32~39)이 가장 안정적입니다.", "b.rm_eio_pwm": "📡 ESP32 %1 핀 %2 PWM 세기 %3 %", "b.rm_eio_pwm.tip": "LED 밝기, 작은 모터 속도 조절 등 (1kHz, 0~100%).", "b.rm_eio_servo": "📡 ESP32 %1 핀 %2 서보 각도 %3 °", "b.rm_eio_servo.tip": "일반 서보 모터(0~180°). 서보 전원은 따로 연결하는 것이 좋습니다 — 허브 포트 전원만으로는 힘이 부족할 수 있습니다. 서보가 움직일 시간만큼(약 0.2초/60°, 처음엔 0.5초) 자동으로 기다린 뒤 다음 블록으로 넘어갑니다.", "b.rm_eio_np_init": "💡 ESP32 %1 네오픽셀 핀 %2 에 %3 개 연결", "b.rm_eio_np_init.tip": "네오픽셀(WS2812) 줄을 설정합니다. 색 블록보다 먼저 한 번 실행하세요.", "b.rm_eio_np_set": "💡 ESP32 %1 네오픽셀 %2 번 색 R %3 G %4 B %5", "b.rm_eio_np_set.tip": "번호는 1부터. 색 값은 0~255 (밝게 많이 켜면 전원이 부족할 수 있어요).", "b.rm_eio_np_setc": "💡 ESP32 %1 네오픽셀 %2 번 %3", "b.rm_eio_np_setc.tip": "번호는 1부터 시작합니다.", "b.rm_eio_np_fill": "💡 ESP32 %1 네오픽셀 모두 R %2 G %3 B %4", "b.rm_eio_np_fillc": "💡 ESP32 %1 네오픽셀 모두 %2", "b.rm_motor_pair_run": "모터 %1 을 %2 %, 모터 %3 을 %4 % 속도로 계속 돌리기", "b.rm_motor_pair_run.tip": "두 모터를 한 번에 돌립니다. 속도 100% = 초당 1000도. 서로 다른 속도를 주면 로봇이 돕니다.", "b.rm_motor_pair_setup": "모터 %1 방향 %2, 모터 %3 방향 %4 로 설정", "b.rm_motor_pair_setup.tip": "두 모터가 + 속도일 때 도는 방향을 한 번에 정합니다. 양쪽 바퀴 모터는 보통 서로 반대로 정해야 둘 다 앞으로 갑니다.", "tb.esdist": "레이저 거리 (TOF050C · TOF200C · TOF400C · VL53L0X)", "tb.escolor": "컬러 센서 (TCS34725)", "tb.esvoice": "음성 인식 (DFRobot DF2301Q)", "tb.esoled": "OLED 화면 (SSD1306)", "tb.essetup": "다른 핀에 연결할 때만", "b.rm_es_tof": "📡 ESP32 %1 레이저 거리 (mm)", "b.rm_es_tof.tip": "VL6180X(TOF050C, 약 0.5 m) · VL53L0X(TOF200C, 약 2 m) · VL53L1X(TOF400C, 약 4 m)를 자동으로 알아봅니다. 앞에 아무것도 없으면 그 센서의 최대 거리(255 · 2000 · 4000)가 나옵니다.", "b.rm_es_color": "📡 ESP32 %1 컬러 센서 %2", "b.rm_es_color.tip": "TCS34725 컬러 센서. 빨강·초록·파랑은 가장 센 색을 255로 맞춘 값(0~255), 밝기는 0~100 입니다. 센서를 물체에서 1~2 cm 떨어뜨리세요.", "b.rm_es_color_is": "📡 ESP32 %1 컬러 센서 색이 %2 인가?", "b.rm_es_color_is.tip": "빨강·노랑·초록·파랑·흰색·검정 중 가장 가까운 색을 고릅니다. 조명에 따라 달라지니 먼저 값을 화면에 띄워 확인해 보세요.", "b.rm_es_voice_is": "📡 ESP32 %1 음성 명령 %2 번을 들었나?", "b.rm_es_voice_is.tip": "깨우는 말(예: \"Hello Robot\") 뒤에 명령을 말하면 번호가 생깁니다. 기본 명령 22 앞으로 · 23 뒤로 · 25 왼쪽으로 90도 … 직접 가르친 명령은 5~21 번. 한 번 맞으면 지워집니다.", "b.rm_es_voice_id": "📡 ESP32 %1 새로 들은 음성 명령 번호", "b.rm_es_voice_id.tip": "새로 알아들은 명령 번호, 없으면 0. 한 번 읽으면 0 으로 돌아갑니다. 번호를 OLED 에 띄워 내 명령이 몇 번인지 알아보세요.", "b.rm_es_voice_set": "📡 ESP32 %1 음성 센서 %2 → %3", "b.rm_es_voice_set.tip": "음량 1~7 · 음소거 1(켬)/0(끔) · 깨어 있는 시간(초) · 대답 소리 재생(명령 번호, 1 = 깨우기).", "b.rm_es_oled_text": "📡 ESP32 %1 OLED %2 번째 줄에 %3 쓰기 (크기 %4)", "b.rm_es_oled_text.tip": "1~8 번째 줄(128×32 화면은 1~4). 한 줄에 보통 16자 · 크게 8자 · 아주 크게 5자. 영문·숫자·기호만 보입니다(한글은 ?). 줄의 남은 칸은 지워집니다.", "b.rm_es_oled_clear": "📡 ESP32 %1 OLED 화면 지우기", "b.rm_es_setup": "📡 ESP32 %1 에 %2 연결 · SDA 핀 %3 · SCL 핀 %4", "b.rm_es_setup.tip": "이 블록이 없으면 ESP32 보드의 Grove I2C 단자를 씁니다. 다른 핀에 꽂았을 때만 맨 앞에 넣으세요. 컬러 센서와 레이저 거리 센서는 주소가 같아(0x29) 같은 핀에 함께 꽂을 수 없습니다.", "o.eskind.1": "OLED 화면 128×64", "o.eskind.5": "OLED 화면 128×32", "o.eskind.2": "음성 인식 센서", "o.eskind.3": "컬러 센서", "o.eskind.4": "레이저 거리 센서", "o.essize.1": "보통", "o.essize.2": "크게", "o.essize.3": "아주 크게", "o.esvoice.0": "음량(1~7)", "o.esvoice.1": "음소거(1/0)", "o.esvoice.2": "깨어 있는 시간(초)", "o.esvoice.3": "대답 소리 재생(명령 번호)", "o.escolor.0": "빨강 값", "o.escolor.1": "초록 값", "o.escolor.2": "파랑 값", "o.escolor.3": "밝기(%)", "wb.toEditor": "✏️ 워드블럭 에디터로", "wb.toEditorTitle": "지금 블록을 워드블럭 에디터로 가져갑니다", "wb.fromEditor": "워드블럭 에디터에서 블록을 가져왔습니다", "wb.unknown": "시뮬레이터에 없는 블록이 있어 일부를 불러오지 못했을 수 있습니다: {0}", "__coco": ["사람", "자전거", "자동차", "오토바이", "비행기", "버스", "기차", "트럭", "배", "신호등", "소화전", "정지 표지판", "주차 미터기", "벤치", "새", "고양이", "강아지", "말", "양", "소", "코끼리", "곰", "얼룩말", "기린", "가방", "우산", "핸드백", "넥타이", "여행 가방", "원반", "스키", "스노보드", "공", "연", "야구 방망이", "야구 글러브", "스케이트보드", "서핑보드", "테니스 라켓", "병", "와인잔", "컵", "포크", "칼", "숟가락", "그릇", "바나나", "사과", "샌드위치", "오렌지", "브로콜리", "당근", "핫도그", "피자", "도넛", "케이크", "의자", "소파", "화분", "침대", "식탁", "변기", "TV", "노트북", "마우스", "리모컨", "키보드", "휴대폰", "전자레인지", "오븐", "토스터", "싱크대", "냉장고", "책", "시계", "꽃병", "가위", "곰인형", "헤어드라이어", "칫솔"]}, "en": {"o.color.RED": "red", "o.color.ORANGE": "orange", "o.color.YELLOW": "yellow", "o.color.GREEN": "green", "o.color.CYAN": "cyan", "o.color.BLUE": "blue", "o.color.VIOLET": "violet", "o.color.MAGENTA": "magenta", "o.color.WHITE": "white", "o.color.BLACK": "black", "o.color.BROWN": "brown", "o.color.NONE": "none", "teach.class": "Item {0}", "color.slot": "color {0}", "coco.any": "any object", "tb.object": "Object detection", "tb.teach": "Teach objects", "tb.color": "Color detection", "tb.lcolor": "Learned colors", "o.objv.x": "X position (0–100)", "o.objv.y": "Y position (0–100)", "o.objv.size": "size (0–100)", "o.objv.score": "confidence (%)", "o.objv.id": "object number", "o.teachv.taught": "item number (0 = none)", "o.teachv.taught_conf": "confidence (%)", "o.colorv.id": "color number", "o.colorv.r": "red R (0–255)", "o.colorv.g": "green G (0–255)", "o.colorv.b": "blue B (0–255)", "o.lcolv.size": "size (% of screen)", "b.rm_ai_obj_seen": "📷 object %1 visible?", "b.rm_ai_obj_seen.tip": "When the program runs, the camera turns on and recognises 80 everyday objects (COCO).", "b.rm_ai_obj_value": "📷 object %1 %2", "b.rm_ai_teach_is": "📷 taught object is %1 ?", "b.rm_ai_teach_is.tip": "Teach objects in the AI camera tab of the word-block editor. The simulator uses the results saved in this browser.", "b.rm_ai_teach_value": "📷 taught object %1", "b.rm_ai_color_is": "📷 center color is %1 ?", "b.rm_ai_color_is.tip": "When the program runs, the camera turns on and reads the colour inside the centre square.", "b.rm_ai_color_value": "📷 center color %1", "b.rm_ai_lcolor_seen": "📷 learned %1 visible?", "b.rm_ai_lcolor_seen.tip": "Teach colours in the AI camera tab of the word-block editor. The simulator uses the results saved in this browser.", "b.rm_ai_lcolor_value": "📷 learned %1 %2", "tb.espio": "ESP32 pins (GPIO · PWM · servo) — real hub only · get the ESP32 main.py from the word-block editor", "tb.neopixel": "ESP32 NeoPixels", "o.onoff.1": "on", "o.onoff.0": "off", "o.pull.1": "no pull-up", "o.pull.2": "pull-up", "o.pull.3": "pull-down", "o.color.OFF": "off", "b.rm_eio_dout": "📡 ESP32 %1 pin %2 %3", "b.rm_eio_dout.tip": "Turns an ESP32 GPIO pin on (3.3 V) or off (0 V). Use the GPIO number printed on the board.", "b.rm_eio_din": "📡 ESP32 %1 pin %2 is on? (%3)", "b.rm_eio_din.tip": "Digital input. With pull-up, wire a button between the pin and GND; pressing it reads \"false\".", "b.rm_eio_ain": "📡 ESP32 %1 pin %2 analog value (0–4095)", "b.rm_eio_ain.tip": "Reads 0–3.3 V as 0–4095. ESP32 ADC1 pins (32–39) are the most stable.", "b.rm_eio_pwm": "📡 ESP32 %1 pin %2 PWM level %3 %", "b.rm_eio_pwm.tip": "LED brightness, small motor speed, etc. (1 kHz, 0–100 %).", "b.rm_eio_servo": "📡 ESP32 %1 pin %2 servo angle %3 °", "b.rm_eio_servo.tip": "Hobby servo (0–180°). Power the servo separately if possible — the hub port alone may be too weak. The block waits automatically while the servo moves (about 0.2 s per 60°, 0.5 s the first time).", "b.rm_eio_np_init": "💡 ESP32 %1 NeoPixels on pin %2, count %3", "b.rm_eio_np_init.tip": "Sets up a NeoPixel (WS2812) strip. Run it once before the colour blocks.", "b.rm_eio_np_set": "💡 ESP32 %1 NeoPixel %2 colour R %3 G %4 B %5", "b.rm_eio_np_set.tip": "Numbers start at 1. Colour values 0–255 (many bright LEDs may need more power).", "b.rm_eio_np_setc": "💡 ESP32 %1 NeoPixel %2 %3", "b.rm_eio_np_setc.tip": "Numbers start at 1.", "b.rm_eio_np_fill": "💡 ESP32 %1 all NeoPixels R %2 G %3 B %4", "b.rm_eio_np_fillc": "💡 ESP32 %1 all NeoPixels %2", "b.rm_motor_pair_run": "run motor %1 at %2 % and motor %3 at %4 % speed", "b.rm_motor_pair_run.tip": "Runs two motors at once. Speed 100% = 1000 degrees per second. Different speeds make the robot turn.", "b.rm_motor_pair_setup": "set motor %1 direction %2 and motor %3 direction %4", "b.rm_motor_pair_setup.tip": "Sets which way both motors turn for a positive speed. The two wheel motors usually need opposite directions so both drive forward.", "tb.esdist": "Laser distance (TOF050C · TOF200C · TOF400C · VL53L0X)", "tb.escolor": "Color sensor (TCS34725)", "tb.esvoice": "Voice recognition (DFRobot DF2301Q)", "tb.esoled": "OLED display (SSD1306)", "tb.essetup": "Only when wired to other pins", "b.rm_es_tof": "📡 ESP32 %1 laser distance (mm)", "b.rm_es_tof.tip": "Detects VL6180X (TOF050C, ~0.5 m), VL53L0X (TOF200C, ~2 m) or VL53L1X (TOF400C, ~4 m) automatically. With nothing in front it returns the sensor's maximum (255 · 2000 · 4000).", "b.rm_es_color": "📡 ESP32 %1 color sensor %2", "b.rm_es_color.tip": "TCS34725 color sensor. Red/green/blue are scaled so the strongest is 255 (0–255); brightness is 0–100. Keep the sensor 1–2 cm from the object.", "b.rm_es_color_is": "📡 ESP32 %1 color sensor sees %2 ?", "b.rm_es_color_is.tip": "Picks the closest of red, yellow, green, blue, white and black. Lighting matters — show the values on the display first to check.", "b.rm_es_voice_is": "📡 ESP32 %1 heard voice command %2 ?", "b.rm_es_voice_is.tip": "Say the wake word (e.g. \"Hello Robot\") and then a command. Built-in commands: 22 go forward · 23 retreat · 25 turn left 90° … Commands you teach are 5–21. True once, then cleared.", "b.rm_es_voice_id": "📡 ESP32 %1 new voice command number", "b.rm_es_voice_id.tip": "The newly recognised command number, or 0. Reading it resets it to 0. Show it on the OLED to find the number of your command.", "b.rm_es_voice_set": "📡 ESP32 %1 voice sensor %2 → %3", "b.rm_es_voice_set.tip": "Volume 1–7 · mute 1 (on) / 0 (off) · wake time (s) · play the reply sound (command number, 1 = wake up).", "b.rm_es_oled_text": "📡 ESP32 %1 OLED line %2 write %3 (size %4)", "b.rm_es_oled_text.tip": "Lines 1–8 (1–4 on a 128×32 display). Normal 16, large 8, huge 5 characters per line. Letters, digits and symbols only. The rest of the line is cleared.", "b.rm_es_oled_clear": "📡 ESP32 %1 clear OLED", "b.rm_es_setup": "📡 ESP32 %1 connect %2 · SDA pin %3 · SCL pin %4", "b.rm_es_setup.tip": "Without this block the ESP32 board's Grove I2C connector is used. Add it first only if you wired other pins. The color sensor and laser distance sensor share address 0x29, so they cannot be on the same pins.", "o.eskind.1": "OLED 128×64", "o.eskind.5": "OLED 128×32", "o.eskind.2": "voice sensor", "o.eskind.3": "color sensor", "o.eskind.4": "laser distance sensor", "o.essize.1": "normal", "o.essize.2": "large", "o.essize.3": "huge", "o.esvoice.0": "volume (1–7)", "o.esvoice.1": "mute (1/0)", "o.esvoice.2": "wake time (s)", "o.esvoice.3": "play reply (command no.)", "o.escolor.0": "red", "o.escolor.1": "green", "o.escolor.2": "blue", "o.escolor.3": "brightness (%)", "wb.toEditor": "✏️ To word-block editor", "wb.toEditorTitle": "Take these blocks to the word-block editor", "wb.fromEditor": "Blocks loaded from the word-block editor", "wb.unknown": "Some blocks are not in the simulator and may not have loaded: {0}", "__coco": ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "TV", "laptop", "mouse", "remote", "keyboard", "phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair dryer", "toothbrush"], "__cocoKeys": ["person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"]}, "ja": {"o.color.RED": "赤", "o.color.ORANGE": "オレンジ", "o.color.YELLOW": "黄", "o.color.GREEN": "緑", "o.color.CYAN": "水色", "o.color.BLUE": "青", "o.color.VIOLET": "紫", "o.color.MAGENTA": "マゼンタ", "o.color.WHITE": "白", "o.color.BLACK": "黒", "o.color.BROWN": "茶", "o.color.NONE": "なし", "teach.class": "物 {0}", "color.slot": "色 {0}", "coco.any": "何でも", "tb.object": "物体認識", "tb.teach": "物体の学習", "tb.color": "色認識", "tb.lcolor": "色の学習", "o.objv.x": "X 位置 (0〜100)", "o.objv.y": "Y 位置 (0〜100)", "o.objv.size": "大きさ (0〜100)", "o.objv.score": "確信度 (%)", "o.objv.id": "物体番号", "o.teachv.taught": "番号 (0 = なし)", "o.teachv.taught_conf": "確信度 (%)", "o.colorv.id": "色番号", "o.colorv.r": "赤 R (0〜255)", "o.colorv.g": "緑 G (0〜255)", "o.colorv.b": "青 B (0〜255)", "o.lcolv.size": "大きさ (画面の %)", "b.rm_ai_obj_seen": "📷 物体 %1 が見える?", "b.rm_ai_obj_seen.tip": "実行するとカメラがつき、身の回りの物 80 種類(COCO)を見分けます。", "b.rm_ai_obj_value": "📷 物体 %1 の %2", "b.rm_ai_teach_is": "📷 学習した物が %1 ?", "b.rm_ai_teach_is.tip": "物の学習はワードブロックエディターの AI カメラタブで行います。このブラウザーに保存された学習結果をシミュレーターでも使います。", "b.rm_ai_teach_value": "📷 学習した物の %1", "b.rm_ai_color_is": "📷 中央の色が %1 ?", "b.rm_ai_color_is.tip": "実行するとカメラがつき、画面中央の四角の中の色を読みます。", "b.rm_ai_color_value": "📷 中央の色の %1", "b.rm_ai_lcolor_seen": "📷 学習した %1 が見える?", "b.rm_ai_lcolor_seen.tip": "色の学習はワードブロックエディターの AI カメラタブで行います。このブラウザーに保存された学習結果をシミュレーターでも使います。", "b.rm_ai_lcolor_value": "📷 学習した %1 の %2", "tb.espio": "ESP32 ピン (GPIO・PWM・サーボ) — 実際のハブでのみ動作 · ESP32 の main.py はワードブロックエディターで取得", "tb.neopixel": "ESP32 ネオピクセル", "o.onoff.1": "オン", "o.onoff.0": "オフ", "o.pull.1": "プルアップなし", "o.pull.2": "プルアップ", "o.pull.3": "プルダウン", "o.color.OFF": "消す", "b.rm_eio_dout": "📡 ESP32 %1 ピン %2 を %3", "b.rm_eio_dout.tip": "ESP32 の GPIO ピンをオン(3.3V)・オフ(0V)にします。ピン番号はボードに書かれた GPIO 番号です。", "b.rm_eio_din": "📡 ESP32 %1 ピン %2 がオン? (%3)", "b.rm_eio_din.tip": "デジタル入力。プルアップのときはボタンをピンと GND の間につなぎ、押すと「偽」になります。", "b.rm_eio_ain": "📡 ESP32 %1 ピン %2 のアナログ値 (0〜4095)", "b.rm_eio_ain.tip": "0〜3.3V を 0〜4095 で読みます。ESP32 の ADC1 ピン(32〜39)が最も安定しています。", "b.rm_eio_pwm": "📡 ESP32 %1 ピン %2 PWM の強さ %3 %", "b.rm_eio_pwm.tip": "LED の明るさ、小さなモーターの速さなど (1kHz, 0〜100%)。", "b.rm_eio_servo": "📡 ESP32 %1 ピン %2 サーボ角度 %3 °", "b.rm_eio_servo.tip": "一般的なサーボ(0〜180°)。サーボの電源は別にするのがおすすめです — ハブのポート電源だけでは力が足りないことがあります。 サーボが動く時間だけ(約 0.2 秒/60°、最初は 0.5 秒)自動で待ってから次のブロックへ進みます。", "b.rm_eio_np_init": "💡 ESP32 %1 ネオピクセルをピン %2 に %3 個つなぐ", "b.rm_eio_np_init.tip": "ネオピクセル(WS2812)を設定します。色のブロックより先に一度実行してください。", "b.rm_eio_np_set": "💡 ESP32 %1 ネオピクセル %2 番の色 R %3 G %4 B %5", "b.rm_eio_np_set.tip": "番号は 1 から。色の値は 0〜255 (明るくたくさん点けると電源が足りないことがあります)。", "b.rm_eio_np_setc": "💡 ESP32 %1 ネオピクセル %2 番を %3", "b.rm_eio_np_setc.tip": "番号は 1 から始まります。", "b.rm_eio_np_fill": "💡 ESP32 %1 ネオピクセル全部 R %2 G %3 B %4", "b.rm_eio_np_fillc": "💡 ESP32 %1 ネオピクセル全部を %2", "b.rm_motor_pair_run": "モーター %1 を %2 %、モーター %3 を %4 % の速さで回し続ける", "b.rm_motor_pair_run.tip": "2つのモーターを同時に回します。速度 100% = 毎秒 1000 度。違う速さにするとロボットが曲がります。", "b.rm_motor_pair_setup": "モーター %1 の向きを %2、モーター %3 の向きを %4 にする", "b.rm_motor_pair_setup.tip": "2つのモーターが + の速さで回る向きを一度に決めます。左右の車輪のモーターは、ふつう反対向きにすると両方前に進みます。", "tb.esdist": "レーザー距離 (TOF050C · TOF200C · TOF400C · VL53L0X)", "tb.escolor": "カラーセンサー (TCS34725)", "tb.esvoice": "音声認識 (DFRobot DF2301Q)", "tb.esoled": "OLED 画面 (SSD1306)", "tb.essetup": "ほかのピンにつなぐときだけ", "b.rm_es_tof": "📡 ESP32 %1 レーザー距離 (mm)", "b.rm_es_tof.tip": "VL6180X(TOF050C・約0.5 m)・VL53L0X(TOF200C・約2 m)・VL53L1X(TOF400C・約4 m)を自動で見分けます。前に何もないときはセンサーの最大距離(255・2000・4000)になります。", "b.rm_es_color": "📡 ESP32 %1 カラーセンサー %2", "b.rm_es_color.tip": "TCS34725 カラーセンサー。赤・緑・青はいちばん強い色を255にした値(0〜255)、明るさは0〜100です。物から1〜2 cm 離してください。", "b.rm_es_color_is": "📡 ESP32 %1 カラーセンサーの色が %2 ?", "b.rm_es_color_is.tip": "赤・黄・緑・青・白・黒からいちばん近い色を選びます。照明で変わるので、先に値を画面に出して確かめましょう。", "b.rm_es_voice_is": "📡 ESP32 %1 音声コマンド %2 番を聞いた?", "b.rm_es_voice_is.tip": "起動ワード(例:「Hello Robot」)のあとにコマンドを言うと番号が出ます。標準コマンド 22 前へ・23 後ろへ・25 左へ90度 … 自分で教えたコマンドは5〜21番。一度当たると消えます。", "b.rm_es_voice_id": "📡 ESP32 %1 新しく聞いた音声コマンドの番号", "b.rm_es_voice_id.tip": "新しく認識したコマンド番号、なければ0。一度読むと0に戻ります。OLEDに出して自分のコマンドの番号を調べましょう。", "b.rm_es_voice_set": "📡 ESP32 %1 音声センサー %2 → %3", "b.rm_es_voice_set.tip": "音量1〜7・ミュート1(オン)/0(オフ)・起きている時間(秒)・返事の音を再生(コマンド番号、1=起動)。", "b.rm_es_oled_text": "📡 ESP32 %1 OLED %2 行目に %3 を書く(大きさ %4)", "b.rm_es_oled_text.tip": "1〜8行目(128×32画面は1〜4)。1行にふつう16字・大きく8字・とても大きく5字。英数字と記号だけ表示されます。行の残りは消えます。", "b.rm_es_oled_clear": "📡 ESP32 %1 OLED 画面を消す", "b.rm_es_setup": "📡 ESP32 %1 に %2 をつなぐ · SDA ピン %3 · SCL ピン %4", "b.rm_es_setup.tip": "このブロックがなければESP32ボードのGrove I2C端子を使います。ほかのピンにつないだときだけ先頭に入れてください。カラーセンサーとレーザー距離センサーはアドレスが同じ(0x29)なので同じピンにはつなげません。", "o.eskind.1": "OLED 画面 128×64", "o.eskind.5": "OLED 画面 128×32", "o.eskind.2": "音声認識センサー", "o.eskind.3": "カラーセンサー", "o.eskind.4": "レーザー距離センサー", "o.essize.1": "ふつう", "o.essize.2": "大きく", "o.essize.3": "とても大きく", "o.esvoice.0": "音量(1〜7)", "o.esvoice.1": "ミュート(1/0)", "o.esvoice.2": "起きている時間(秒)", "o.esvoice.3": "返事を再生(コマンド番号)", "o.escolor.0": "赤の値", "o.escolor.1": "緑の値", "o.escolor.2": "青の値", "o.escolor.3": "明るさ(%)", "wb.toEditor": "✏️ ワードブロックエディターへ", "wb.toEditorTitle": "今のブロックをワードブロックエディターへ持っていきます", "wb.fromEditor": "ワードブロックエディターからブロックを読み込みました", "wb.unknown": "シミュレーターにないブロックがあり、一部を読み込めなかった可能性があります: {0}", "__coco": ["人", "自転車", "車", "バイク", "飛行機", "バス", "電車", "トラック", "船", "信号機", "消火栓", "一時停止標識", "パーキングメーター", "ベンチ", "鳥", "ねこ", "いぬ", "馬", "ひつじ", "牛", "ぞう", "くま", "しまうま", "きりん", "リュック", "かさ", "ハンドバッグ", "ネクタイ", "スーツケース", "フリスビー", "スキー板", "スノーボード", "ボール", "たこ", "バット", "グローブ", "スケートボード", "サーフボード", "テニスラケット", "ボトル", "ワイングラス", "コップ", "フォーク", "ナイフ", "スプーン", "ボウル", "バナナ", "りんご", "サンドイッチ", "オレンジ", "ブロッコリー", "にんじん", "ホットドッグ", "ピザ", "ドーナツ", "ケーキ", "いす", "ソファ", "鉢植え", "ベッド", "テーブル", "トイレ", "テレビ", "ノートPC", "マウス", "リモコン", "キーボード", "スマホ", "電子レンジ", "オーブン", "トースター", "流し台", "冷蔵庫", "本", "時計", "花瓶", "はさみ", "テディベア", "ドライヤー", "歯ブラシ"]}, "zh": {"o.color.RED": "红", "o.color.ORANGE": "橙", "o.color.YELLOW": "黄", "o.color.GREEN": "绿", "o.color.CYAN": "青", "o.color.BLUE": "蓝", "o.color.VIOLET": "紫", "o.color.MAGENTA": "品红", "o.color.WHITE": "白", "o.color.BLACK": "黑", "o.color.BROWN": "棕", "o.color.NONE": "无", "teach.class": "物体 {0}", "color.slot": "颜色 {0}", "coco.any": "任意物体", "tb.object": "物体识别", "tb.teach": "物体学习", "tb.color": "颜色识别", "tb.lcolor": "颜色学习", "o.objv.x": "X 位置 (0–100)", "o.objv.y": "Y 位置 (0–100)", "o.objv.size": "大小 (0–100)", "o.objv.score": "置信度 (%)", "o.objv.id": "物体编号", "o.teachv.taught": "编号 (0 = 无)", "o.teachv.taught_conf": "置信度 (%)", "o.colorv.id": "颜色编号", "o.colorv.r": "红 R (0–255)", "o.colorv.g": "绿 G (0–255)", "o.colorv.b": "蓝 B (0–255)", "o.lcolv.size": "大小 (占画面 %)", "b.rm_ai_obj_seen": "📷 看到物体 %1 ?", "b.rm_ai_obj_seen.tip": "运行后摄像头会打开，识别 80 种日常物体（COCO）。", "b.rm_ai_obj_value": "📷 物体 %1 的 %2", "b.rm_ai_teach_is": "📷 学习的物体是 %1 ?", "b.rm_ai_teach_is.tip": "请在文字积木编辑器的 AI 摄像头标签中学习物体。模拟器使用保存在此浏览器中的学习结果。", "b.rm_ai_teach_value": "📷 学习物体的 %1", "b.rm_ai_color_is": "📷 中心颜色是 %1 ?", "b.rm_ai_color_is.tip": "运行后摄像头会打开，读取画面中央方框内的颜色。", "b.rm_ai_color_value": "📷 中心颜色的 %1", "b.rm_ai_lcolor_seen": "📷 看到已学的 %1 ?", "b.rm_ai_lcolor_seen.tip": "请在文字积木编辑器的 AI 摄像头标签中学习颜色。模拟器使用保存在此浏览器中的学习结果。", "b.rm_ai_lcolor_value": "📷 已学 %1 的 %2", "tb.espio": "ESP32 引脚（GPIO·PWM·舵机）— 仅在真实主机上运行 · ESP32 的 main.py 请在文字积木编辑器中获取", "tb.neopixel": "ESP32 NeoPixel 灯珠", "o.onoff.1": "打开", "o.onoff.0": "关闭", "o.pull.1": "无上拉", "o.pull.2": "上拉", "o.pull.3": "下拉", "o.color.OFF": "熄灭", "b.rm_eio_dout": "📡 ESP32 %1 引脚 %2 %3", "b.rm_eio_dout.tip": "打开(3.3V)或关闭(0V) ESP32 的 GPIO 引脚。引脚号是板上标的 GPIO 编号。", "b.rm_eio_din": "📡 ESP32 %1 引脚 %2 是高电平? (%3)", "b.rm_eio_din.tip": "数字输入。上拉时把按钮接在引脚和 GND 之间，按下时为「假」。", "b.rm_eio_ain": "📡 ESP32 %1 引脚 %2 模拟值 (0~4095)", "b.rm_eio_ain.tip": "把 0~3.3V 读成 0~4095。ESP32 的 ADC1 引脚(32~39)最稳定。", "b.rm_eio_pwm": "📡 ESP32 %1 引脚 %2 PWM 强度 %3 %", "b.rm_eio_pwm.tip": "调节 LED 亮度、小电机速度等 (1kHz, 0~100%)。", "b.rm_eio_servo": "📡 ESP32 %1 引脚 %2 舵机角度 %3 °", "b.rm_eio_servo.tip": "普通舵机(0~180°)。最好给舵机单独供电 — 只靠主机端口供电可能力量不够。 积木会自动等待舵机转动的时间（约 0.2 秒/60°，第一次 0.5 秒）再执行下一个积木。", "b.rm_eio_np_init": "💡 ESP32 %1 NeoPixel 接在引脚 %2，共 %3 个", "b.rm_eio_np_init.tip": "设置 NeoPixel(WS2812) 灯带。请在颜色积木之前先运行一次。", "b.rm_eio_np_set": "💡 ESP32 %1 第 %2 个 NeoPixel 颜色 R %3 G %4 B %5", "b.rm_eio_np_set.tip": "编号从 1 开始。颜色值 0~255 (很多灯很亮时可能供电不足)。", "b.rm_eio_np_setc": "💡 ESP32 %1 第 %2 个 NeoPixel 设为 %3", "b.rm_eio_np_setc.tip": "编号从 1 开始。", "b.rm_eio_np_fill": "💡 ESP32 %1 全部 NeoPixel R %2 G %3 B %4", "b.rm_eio_np_fillc": "💡 ESP32 %1 全部 NeoPixel 设为 %2", "b.rm_motor_pair_run": "电机 %1 以 %2 %、电机 %3 以 %4 % 速度持续转动", "b.rm_motor_pair_run.tip": "同时转动两个电机。速度 100% = 每秒 1000 度。两个速度不同时机器人会转弯。", "b.rm_motor_pair_setup": "设置电机 %1 方向为 %2、电机 %3 方向为 %4", "b.rm_motor_pair_setup.tip": "一次设定两个电机正速度时的转动方向。左右轮电机通常要设成相反方向,才能一起前进。", "tb.esdist": "激光测距 (TOF050C · TOF200C · TOF400C · VL53L0X)", "tb.escolor": "颜色传感器 (TCS34725)", "tb.esvoice": "语音识别 (DFRobot DF2301Q)", "tb.esoled": "OLED 屏幕 (SSD1306)", "tb.essetup": "仅在接到其他引脚时使用", "b.rm_es_tof": "📡 ESP32 %1 激光距离 (mm)", "b.rm_es_tof.tip": "自动识别 VL6180X(TOF050C,约 0.5 m)、VL53L0X(TOF200C,约 2 m)、VL53L1X(TOF400C,约 4 m)。前方没有物体时返回该传感器的最大距离(255 · 2000 · 4000)。", "b.rm_es_color": "📡 ESP32 %1 颜色传感器 %2", "b.rm_es_color.tip": "TCS34725 颜色传感器。红、绿、蓝以最强的颜色为 255(0~255),亮度为 0~100。请让传感器离物体 1~2 cm。", "b.rm_es_color_is": "📡 ESP32 %1 颜色传感器的颜色是 %2 ?", "b.rm_es_color_is.tip": "在红、黄、绿、蓝、白、黑中选出最接近的颜色。会受光线影响,请先把数值显示在屏幕上确认。", "b.rm_es_voice_is": "📡 ESP32 %1 听到了语音命令 %2 号?", "b.rm_es_voice_is.tip": "先说唤醒词(例如 “Hello Robot”),再说命令就会得到编号。内置命令:22 前进 · 23 后退 · 25 左转 90° …… 自己教的命令是 5~21 号。判断为真一次后清除。", "b.rm_es_voice_id": "📡 ESP32 %1 新听到的语音命令编号", "b.rm_es_voice_id.tip": "新识别到的命令编号,没有则为 0。读取一次后变回 0。把它显示在 OLED 上,就能知道自己命令的编号。", "b.rm_es_voice_set": "📡 ESP32 %1 语音传感器 %2 → %3", "b.rm_es_voice_set.tip": "音量 1~7 · 静音 1(开)/0(关) · 唤醒时间(秒) · 播放回答声音(命令编号,1 = 唤醒)。", "b.rm_es_oled_text": "📡 ESP32 %1 OLED 第 %2 行写 %3 (大小 %4)", "b.rm_es_oled_text.tip": "第 1~8 行(128×32 屏为 1~4)。每行普通 16 字、大 8 字、特大 5 字。只显示英文、数字和符号。该行其余部分会被清除。", "b.rm_es_oled_clear": "📡 ESP32 %1 清除 OLED 屏幕", "b.rm_es_setup": "📡 ESP32 %1 连接 %2 · SDA 引脚 %3 · SCL 引脚 %4", "b.rm_es_setup.tip": "没有这个积木时使用 ESP32 板上的 Grove I2C 接口。只有接到其他引脚时才放在最前面。颜色传感器和激光测距传感器地址相同(0x29),不能接在同一对引脚上。", "o.eskind.1": "OLED 屏幕 128×64", "o.eskind.5": "OLED 屏幕 128×32", "o.eskind.2": "语音识别传感器", "o.eskind.3": "颜色传感器", "o.eskind.4": "激光测距传感器", "o.essize.1": "普通", "o.essize.2": "大", "o.essize.3": "特大", "o.esvoice.0": "音量(1~7)", "o.esvoice.1": "静音(1/0)", "o.esvoice.2": "唤醒时间(秒)", "o.esvoice.3": "播放回答(命令编号)", "o.escolor.0": "红色值", "o.escolor.1": "绿色值", "o.escolor.2": "蓝色值", "o.escolor.3": "亮度(%)", "wb.toEditor": "✏️ 去文字积木编辑器", "wb.toEditorTitle": "把当前积木带到文字积木编辑器", "wb.fromEditor": "已从文字积木编辑器载入积木", "wb.unknown": "有些积木模拟器中没有，可能未能载入：{0}", "__coco": ["人", "自行车", "汽车", "摩托车", "飞机", "公交车", "火车", "卡车", "船", "红绿灯", "消防栓", "停车标志", "停车计时器", "长椅", "鸟", "猫", "狗", "马", "羊", "牛", "大象", "熊", "斑马", "长颈鹿", "背包", "雨伞", "手提包", "领带", "行李箱", "飞盘", "滑雪板", "单板滑雪板", "球", "风筝", "棒球棒", "棒球手套", "滑板", "冲浪板", "网球拍", "瓶子", "酒杯", "杯子", "叉子", "刀", "勺子", "碗", "香蕉", "苹果", "三明治", "橙子", "西兰花", "胡萝卜", "热狗", "披萨", "甜甜圈", "蛋糕", "椅子", "沙发", "盆栽", "床", "餐桌", "马桶", "电视", "笔记本电脑", "鼠标", "遥控器", "键盘", "手机", "微波炉", "烤箱", "烤面包机", "水槽", "冰箱", "书", "时钟", "花瓶", "剪刀", "泰迪熊", "吹风机", "牙刷"]}, "es": {"o.color.RED": "rojo", "o.color.ORANGE": "naranja", "o.color.YELLOW": "amarillo", "o.color.GREEN": "verde", "o.color.CYAN": "cian", "o.color.BLUE": "azul", "o.color.VIOLET": "violeta", "o.color.MAGENTA": "magenta", "o.color.WHITE": "blanco", "o.color.BLACK": "negro", "o.color.BROWN": "marrón", "o.color.NONE": "ninguno", "teach.class": "Elemento {0}", "color.slot": "color {0}", "coco.any": "cualquier objeto", "tb.object": "Detección de objetos", "tb.teach": "Enseñar objetos", "tb.color": "Detección de color", "tb.lcolor": "Colores aprendidos", "o.objv.x": "posición X (0–100)", "o.objv.y": "posición Y (0–100)", "o.objv.size": "tamaño (0–100)", "o.objv.score": "confianza (%)", "o.objv.id": "número de objeto", "o.teachv.taught": "número (0 = ninguno)", "o.teachv.taught_conf": "confianza (%)", "o.colorv.id": "número de color", "o.colorv.r": "rojo R (0–255)", "o.colorv.g": "verde G (0–255)", "o.colorv.b": "azul B (0–255)", "o.lcolv.size": "tamaño (% de pantalla)", "b.rm_ai_obj_seen": "📷 ¿se ve el objeto %1 ?", "b.rm_ai_obj_seen.tip": "Al ejecutar, la cámara se enciende y reconoce 80 objetos cotidianos (COCO).", "b.rm_ai_obj_value": "📷 objeto %1 %2", "b.rm_ai_teach_is": "📷 ¿el objeto enseñado es %1 ?", "b.rm_ai_teach_is.tip": "Enseña los objetos en la pestaña de cámara IA del editor de bloques. El simulador usa los resultados guardados en este navegador.", "b.rm_ai_teach_value": "📷 objeto enseñado %1", "b.rm_ai_color_is": "📷 ¿el color central es %1 ?", "b.rm_ai_color_is.tip": "Al ejecutar, la cámara se enciende y lee el color dentro del cuadro central.", "b.rm_ai_color_value": "📷 color central %1", "b.rm_ai_lcolor_seen": "📷 ¿se ve el %1 aprendido?", "b.rm_ai_lcolor_seen.tip": "Enseña los colores en la pestaña de cámara IA del editor de bloques. El simulador usa los resultados guardados en este navegador.", "b.rm_ai_lcolor_value": "📷 %1 aprendido %2", "tb.espio": "Pines ESP32 (GPIO · PWM · servo) — solo en el hub real · obtén el main.py del ESP32 en el editor de bloques", "tb.neopixel": "NeoPixels del ESP32", "o.onoff.1": "encender", "o.onoff.0": "apagar", "o.pull.1": "sin pull-up", "o.pull.2": "pull-up", "o.pull.3": "pull-down", "o.color.OFF": "apagado", "b.rm_eio_dout": "📡 ESP32 %1 pin %2 %3", "b.rm_eio_dout.tip": "Enciende (3,3 V) o apaga (0 V) un pin GPIO del ESP32. Usa el número GPIO impreso en la placa.", "b.rm_eio_din": "📡 ESP32 %1 ¿pin %2 encendido? (%3)", "b.rm_eio_din.tip": "Entrada digital. Con pull-up, conecta un botón entre el pin y GND; al pulsarlo se lee «falso».", "b.rm_eio_ain": "📡 ESP32 %1 valor analógico del pin %2 (0–4095)", "b.rm_eio_ain.tip": "Lee 0–3,3 V como 0–4095. Los pines ADC1 del ESP32 (32–39) son los más estables.", "b.rm_eio_pwm": "📡 ESP32 %1 pin %2 nivel PWM %3 %", "b.rm_eio_pwm.tip": "Brillo de un LED, velocidad de un motor pequeño, etc. (1 kHz, 0–100 %).", "b.rm_eio_servo": "📡 ESP32 %1 pin %2 ángulo del servo %3 °", "b.rm_eio_servo.tip": "Servo común (0–180°). Mejor alimenta el servo aparte: el puerto del hub solo puede quedarse corto. El bloque espera solo mientras el servo se mueve (unos 0,2 s cada 60°, 0,5 s la primera vez).", "b.rm_eio_np_init": "💡 ESP32 %1 NeoPixels en el pin %2, cantidad %3", "b.rm_eio_np_init.tip": "Configura una tira NeoPixel (WS2812). Ejecútalo una vez antes de los bloques de color.", "b.rm_eio_np_set": "💡 ESP32 %1 color del NeoPixel %2 R %3 G %4 B %5", "b.rm_eio_np_set.tip": "Los números empiezan en 1. Valores 0–255 (muchos LED brillantes pueden necesitar más energía).", "b.rm_eio_np_setc": "💡 ESP32 %1 NeoPixel %2 %3", "b.rm_eio_np_setc.tip": "Los números empiezan en 1.", "b.rm_eio_np_fill": "💡 ESP32 %1 todos los NeoPixels R %2 G %3 B %4", "b.rm_eio_np_fillc": "💡 ESP32 %1 todos los NeoPixels %2", "b.rm_motor_pair_run": "girar motor %1 a %2 % y motor %3 a %4 % de velocidad", "b.rm_motor_pair_run.tip": "Gira dos motores a la vez. Velocidad 100 % = 1000 grados por segundo. Con velocidades distintas el robot gira.", "b.rm_motor_pair_setup": "motor %1 sentido %2 y motor %3 sentido %4", "b.rm_motor_pair_setup.tip": "Fija a la vez hacia dónde giran los dos motores con velocidad positiva. Los motores de las ruedas suelen ir en sentidos opuestos para que ambos avancen.", "tb.esdist": "Distancia láser (TOF050C · TOF200C · TOF400C · VL53L0X)", "tb.escolor": "Sensor de color (TCS34725)", "tb.esvoice": "Reconocimiento de voz (DFRobot DF2301Q)", "tb.esoled": "Pantalla OLED (SSD1306)", "tb.essetup": "Solo si lo conectas a otros pines", "b.rm_es_tof": "📡 ESP32 %1 distancia láser (mm)", "b.rm_es_tof.tip": "Detecta solo VL6180X (TOF050C, ~0,5 m), VL53L0X (TOF200C, ~2 m) o VL53L1X (TOF400C, ~4 m). Sin nada delante devuelve el máximo del sensor (255 · 2000 · 4000).", "b.rm_es_color": "📡 ESP32 %1 sensor de color %2", "b.rm_es_color.tip": "Sensor de color TCS34725. Rojo/verde/azul se escalan para que el más fuerte sea 255 (0–255); el brillo va de 0 a 100. Pon el sensor a 1–2 cm del objeto.", "b.rm_es_color_is": "📡 ESP32 %1 ¿el sensor de color ve %2 ?", "b.rm_es_color_is.tip": "Elige el más parecido entre rojo, amarillo, verde, azul, blanco y negro. La luz influye: muestra antes los valores en la pantalla.", "b.rm_es_voice_is": "📡 ESP32 %1 ¿oyó la orden de voz %2 ?", "b.rm_es_voice_is.tip": "Di la palabra de activación (p. ej. \"Hello Robot\") y luego una orden. Órdenes incluidas: 22 avanzar · 23 retroceder · 25 girar 90° a la izquierda … Las que enseñes tú son 5–21. Es verdadero una vez y luego se borra.", "b.rm_es_voice_id": "📡 ESP32 %1 número de la nueva orden de voz", "b.rm_es_voice_id.tip": "El número de la orden recién reconocida, o 0. Al leerlo vuelve a 0. Muéstralo en la OLED para saber el número de tu orden.", "b.rm_es_voice_set": "📡 ESP32 %1 sensor de voz %2 → %3", "b.rm_es_voice_set.tip": "Volumen 1–7 · silencio 1 (sí) / 0 (no) · tiempo despierto (s) · reproducir la respuesta (n.º de orden, 1 = despertar).", "b.rm_es_oled_text": "📡 ESP32 %1 OLED línea %2 escribir %3 (tamaño %4)", "b.rm_es_oled_text.tip": "Líneas 1–8 (1–4 en una pantalla 128×32). 16, 8 o 5 caracteres por línea según el tamaño. Solo letras sin acento, cifras y símbolos. El resto de la línea se borra.", "b.rm_es_oled_clear": "📡 ESP32 %1 borrar OLED", "b.rm_es_setup": "📡 ESP32 %1 conectar %2 · pin SDA %3 · pin SCL %4", "b.rm_es_setup.tip": "Sin este bloque se usa el conector Grove I2C de la placa ESP32. Ponlo al principio solo si usas otros pines. El sensor de color y el láser comparten la dirección 0x29: no pueden ir en los mismos pines.", "o.eskind.1": "pantalla OLED 128×64", "o.eskind.5": "pantalla OLED 128×32", "o.eskind.2": "sensor de voz", "o.eskind.3": "sensor de color", "o.eskind.4": "sensor de distancia láser", "o.essize.1": "normal", "o.essize.2": "grande", "o.essize.3": "muy grande", "o.esvoice.0": "volumen (1–7)", "o.esvoice.1": "silencio (1/0)", "o.esvoice.2": "tiempo despierto (s)", "o.esvoice.3": "reproducir respuesta (n.º)", "o.escolor.0": "rojo", "o.escolor.1": "verde", "o.escolor.2": "azul", "o.escolor.3": "brillo (%)", "wb.toEditor": "✏️ Al editor de bloques", "wb.toEditorTitle": "Llevar estos bloques al editor de bloques", "wb.fromEditor": "Bloques cargados desde el editor de bloques", "wb.unknown": "Algunos bloques no existen en el simulador y puede que no se hayan cargado: {0}", "__coco": ["persona", "bicicleta", "coche", "moto", "avión", "autobús", "tren", "camión", "barco", "semáforo", "hidrante", "señal de alto", "parquímetro", "banco", "pájaro", "gato", "perro", "caballo", "oveja", "vaca", "elefante", "oso", "cebra", "jirafa", "mochila", "paraguas", "bolso", "corbata", "maleta", "frisbi", "esquís", "snowboard", "pelota", "cometa", "bate", "guante de béisbol", "patineta", "tabla de surf", "raqueta", "botella", "copa", "taza", "tenedor", "cuchillo", "cuchara", "cuenco", "plátano", "manzana", "sándwich", "naranja", "brócoli", "zanahoria", "perrito caliente", "pizza", "dona", "pastel", "silla", "sofá", "maceta", "cama", "mesa", "inodoro", "TV", "portátil", "ratón", "control remoto", "teclado", "teléfono", "microondas", "horno", "tostadora", "fregadero", "refrigerador", "libro", "reloj", "florero", "tijeras", "osito", "secador", "cepillo de dientes"]}};
  const LIBS = {"rm_aicam": "# rm_aicam.py — 웹 AI 카메라(손 제스처 · 스켈레톤) 값을 허브에서 읽기\n#\n# 브라우저의 MediaPipe 가 계산한 결과를 rm_link 로 받습니다.\n# 좌표는 화면 기준 0~100 (왼쪽/위가 0) 입니다.\n\nimport rm_link\n\n# 제스처 번호 (웹 에디터와 동일하게 유지)\nNONE = 0\nFIST = 1         # 주먹 (Closed_Fist)\nOPEN = 2         # 손바닥 (Open_Palm)\nPOINT_UP = 3     # 검지 위로 (Pointing_Up)\nTHUMB_DOWN = 4   # 엄지 아래 (Thumb_Down)\nTHUMB_UP = 5     # 엄지 위 (Thumb_Up)\nVICTORY = 6      # 브이 (Victory)\nLOVE = 7         # 사랑해 (ILoveYou)\n\n# ---------- 손 ----------\n\ndef hand_detected():\n    return rm_link.get(\"H\", 0) == 1\n\n\ndef gesture():\n    return rm_link.get(\"H\", 1)\n\n\ndef is_gesture(g):\n    return hand_detected() and gesture() == g\n\n\ndef hand_x():\n    return rm_link.get(\"H\", 2, 50)\n\n\ndef hand_y():\n    return rm_link.get(\"H\", 3, 50)\n\n\ndef finger_count():\n    return rm_link.get(\"H\", 4)\n\n\n# ---------- 스켈레톤(포즈) ----------\n\ndef pose_detected():\n    return rm_link.get(\"P\", 0) == 1\n\n\ndef nose_x():\n    return rm_link.get(\"P\", 1, 50)\n\n\ndef nose_y():\n    return rm_link.get(\"P\", 2, 50)\n\n\ndef left_hand_up():\n    return rm_link.get(\"P\", 3) == 1\n\n\ndef right_hand_up():\n    return rm_link.get(\"P\", 4) == 1\n\n\ndef both_hands_up():\n    return left_hand_up() and right_hand_up()\n\n\ndef body_x():\n    return rm_link.get(\"P\", 5, 50)\n\n\ndef shoulder_tilt():\n    \"\"\"어깨 기울기(도). 오른쪽으로 기울면 +, 왼쪽이면 -.\"\"\"\n    return rm_link.get(\"P\", 6)\n\n\ndef arms_spread():\n    return rm_link.get(\"P\", 7) == 1\n\n\n# ---------- 사물 인식 (COCO 80종) ----------\n# O: [개수, 번호1, X1, Y1, 크기1, 확신도1, 번호2 ..., 번호3 ...]  (확신도 높은 순서, 최대 3개)\n# 사물 번호는 웹 에디터의 COCO 목록 순서 + 1 (예: 1 = 사람, 42 = 컵)\n\ndef _objects():\n    v = rm_link.values(\"O\")\n    out = []\n    if not v:\n        return out\n    for i in range(min(v[0], 3)):\n        j = 1 + i * 5\n        if j + 4 < len(v):\n            out.append(v[j:j + 5])\n    return out\n\n\ndef object_seen(n=0):\n    \"\"\"사물 n 번이 보이면 True (n=0 이면 아무 사물이나).\"\"\"\n    for o in _objects():\n        if n == 0 or o[0] == n:\n            return True\n    return False\n\n\ndef object_value(n=0, what=1):\n    \"\"\"사물 n 번의 값 (n=0 이면 가장 확실한 사물). what: 0=번호 1=X 2=Y 3=크기 4=확신도. 안 보이면 0.\"\"\"\n    for o in _objects():\n        if n == 0 or o[0] == n:\n            return o[what]\n    return 0\n\n\ndef object_count():\n    return len(_objects())\n\n\n# ---------- 사물 학습 ----------\n# T: [학습한 사물 번호(0=학습 안 함), 확신도]\n\ndef taught():\n    return rm_link.get(\"T\", 0)\n\n\ndef taught_is(n):\n    return taught() == n\n\n\ndef taught_conf():\n    return rm_link.get(\"T\", 1)\n\n\n# ---------- 색 인식 (화면 가운데) ----------\n# C: [색 번호, R, G, B]   색 번호: 0 없음 1 빨강 2 주황 3 노랑 4 초록 5 하늘 6 파랑 7 보라 8 자홍 9 흰색 10 검정\nNO_COLOR, RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, MAGENTA, WHITE, BLACK = range(11)\n\n\ndef center_color():\n    return rm_link.get(\"C\", 0)\n\n\ndef center_color_is(c):\n    return center_color() == c\n\n\ndef center_rgb(i):\n    \"\"\"i: 0=R 1=G 2=B (0~255)\"\"\"\n    return rm_link.get(\"C\", 1 + i)\n\n\n# ---------- 색 학습 (학습한 색 덩어리 추적, 최대 5가지) ----------\n# K: [보임1, X1, Y1, 크기1, 보임2, ...]   크기 = 화면에서 차지하는 비율(%)\n\ndef learned_color_seen(n):\n    return rm_link.get(\"K\", (n - 1) * 4) == 1\n\n\ndef learned_color_value(n, what):\n    \"\"\"what: 1=X 2=Y 3=크기(%). 안 보이면 X·Y 는 50, 크기는 0.\"\"\"\n    if not learned_color_seen(n):\n        return 0 if what == 3 else 50\n    return rm_link.get(\"K\", (n - 1) * 4 + what)\n", "rm_esp32": "# rm_esp32.py — 안톤 마인드스톰(Anton's Mindstorms) LMS-ESP32 연결 클래스\n#\n# PUPRemote(pupremote_hub, GPL · AntonsMindstorms.com) 를 감싸\n# 여러 포트에 ESP32 를 붙여 쓸 수 있게 합니다.\n#\n# ESP32 쪽(MicroPython)에서 정의한 채널/명령과 같은 이름·형식을 허브 쪽에도 등록합니다.\n#   ESP32:  pr = PUPRemoteSensor(power=True); pr.add_channel('line', 'hhb')\n#   허브:   esp = ESP32(Port.A); esp.add_channel('line', 'hhb'); esp.value('line', 0)\n\nfrom pybricks.iodevices import PUPDevice\nfrom pybricks.tools import wait, StopWatch\nfrom pupremote_hub import PUPRemoteHub\nimport rm_link\n\n_boards = {}\n\n\ndef wait_device(port, ms=8000):\n    \"\"\"ESP32 가 허브와 연결(LPF2 인사)될 때까지 기다립니다. ms 안에 안 되면 OSError.\"\"\"\n    sw = StopWatch()\n    while True:\n        try:\n            PUPDevice(port)\n            return\n        except OSError:\n            if sw.time() >= ms:\n                print(\"ESP32?\", port)\n                raise\n        wait(200)\n\n\n# I/O 명령 (ESP32 쪽 main.py 의 「RoboMakers I/O」 부분과 같은 순서·형식)\nIO_CMDS = (\n    (\"pmode\", \"\", \"BB\"),    # 핀 모드: 0 출력 1 입력 2 입력+풀업 3 입력+풀다운 4 아날로그 5 PWM 6 서보 / (255,255) 초기화\n    (\"inp\", \"8H\", \"\"),      # 입력 핀 8개까지 값 (pmode 로 정한 순서)\n    (\"dout\", \"\", \"BB\"),     # 디지털 출력 (핀, 0/1)\n    (\"pwm\", \"\", \"BB\"),      # PWM (핀, 0~100%)\n    (\"servo\", \"\", \"BB\"),    # 서보 (핀, 0~180도)\n    (\"npx\", \"\", \"6B\"),      # 네오픽셀 (명령, a, b, c, d, 보이기)\n)\nOUT, IN, IN_UP, IN_DOWN, ANALOG, PWM, SERVO = range(7)\n\n# I2C 센서·화면 명령 (ESP32 쪽이 이 명령을 알 때만 등록 — 옛 ESP32 main.py 와도 핀 블록은 그대로 동작)\nSENS_CMDS = (\n    (\"sinit\", \"\", \"BBB\"),   # 장치 켜기 (종류, SDA, SCL · 255 = 보드 Grove 단자)\n    (\"sget\", \"7H\", \"\"),     # 값 (빨강, 초록, 파랑, 밝기, 거리mm, 음성 순번<<8|번호, 상태)\n    (\"sset\", \"\", \"BBB\"),    # 설정 (종류, 항목, 값)\n    (\"otxt\", \"\", \"BB14s\"),  # OLED 글자 (줄|크기-1<<4, 칸, 글자)\n)\nS_OLED, S_VOICE, S_COLOR, S_TOF, S_OLED32 = 1, 2, 3, 4, 5\n_TOF_CHIP = (\"?\", \"VL6180X\", \"VL53L0X\", \"VL53L1X\")\n_S_NAME = (\"\", \"OLED\", \"voice sensor\", \"color sensor\", \"laser distance sensor\", \"OLED\")\n\n\nclass ESP32:\n    def __init__(self, port, io=False):\n        wait_device(port)\n        self.pr = PUPRemoteHub(port)\n        self._last = {}\n        self._io = io\n        self._sens = False\n        self._son = {}\n        self._sv = (0,) * 7\n        self._st = -1000\n        self._vseq = None\n        self._vev = 0\n        self._vev_t = 0\n        self._sw = StopWatch()\n        self._pn = str(port)[-1]\n        self._mon = -1000\n        if io:\n            for name, to_hub, from_hub in IO_CMDS:\n                self.pr.add_command(name, to_hub_fmt=to_hub, from_hub_fmt=from_hub)\n            self._mode = {}\n            self._slot = {}\n            self._servo_at = {}\n            self.pr.call(\"pmode\", 255, 255)  # ESP32 쪽 핀·네오픽셀 초기화\n            modes = self.pr.pup_device.info()[\"modes\"]\n            n = len(IO_CMDS)\n            self._sens = len(modes) > n and modes[n][0].rstrip() == \"sinit\"\n            if self._sens:\n                for name, to_hub, from_hub in SENS_CMDS:\n                    self.pr.add_command(name, to_hub_fmt=to_hub, from_hub_fmt=from_hub)\n\n    # ---------- I/O 핀 ----------\n    def _set_mode(self, pin, mode):\n        pin = int(pin)\n        if self._mode.get(pin) != mode:\n            self.pr.call(\"pmode\", pin, mode)\n            self._mode[pin] = mode\n            if mode in (IN, IN_UP, IN_DOWN, ANALOG) and pin not in self._slot and len(self._slot) < 8:\n                self._slot[pin] = len(self._slot)\n        return pin\n\n    def digital_write(self, pin, on):\n        pin = self._set_mode(pin, OUT)\n        self.pr.call(\"dout\", pin, 1 if on else 0)\n\n    def _read(self, pin, mode):\n        pin = self._set_mode(pin, mode)\n        s = self._slot.get(pin)\n        if s is None:\n            return 0\n        return self.pr.call(\"inp\")[s]\n\n    def digital_read(self, pin, pull=IN_UP):\n        return self._read(pin, pull) > 0\n\n    def analog_read(self, pin):\n        return self._read(pin, ANALOG)\n\n    def pwm(self, pin, percent):\n        pin = self._set_mode(pin, PWM)\n        self.pr.call(\"pwm\", pin, max(0, min(100, int(percent))))\n\n    # 서보는 명령만 보내면 바로 다음 줄로 넘어가므로, 움직일 시간만큼 기다립니다.\n    # 약 0.2초 / 60° (부하가 있는 SG90 기준). 처음 움직일 때는 위치를 모르니 0.5초.\n    # 기다리지 않으려면 servo(핀, 각도, False)\n    SERVO_MS_PER_DEG = 10 / 3\n    SERVO_FIRST_MS = 500\n\n    def servo(self, pin, angle, wait_move=True):\n        pin = self._set_mode(pin, SERVO)\n        a = max(0, min(180, int(angle)))\n        self.pr.call(\"servo\", pin, a)\n        prev = self._servo_at.get(pin)\n        self._servo_at[pin] = a\n        if wait_move:\n            ms = self.SERVO_FIRST_MS if prev is None else int(abs(a - prev) * self.SERVO_MS_PER_DEG)\n            if ms > 0:\n                wait(ms + 20)\n\n    # ---------- 네오픽셀 (번호는 1부터) ----------\n    def neopixel_init(self, pin, count):\n        self.pr.call(\"npx\", 0, int(pin), max(1, min(255, int(count))), 0, 0, 1)\n\n    def neopixel_set(self, n, r, g, b, show=True):\n        c = lambda v: max(0, min(255, int(v)))\n        self.pr.call(\"npx\", 1, max(0, int(n) - 1) & 255, c(r), c(g), c(b), 1 if show else 0)\n\n    def neopixel_fill(self, r, g, b):\n        c = lambda v: max(0, min(255, int(v)))\n        self.pr.call(\"npx\", 2, c(r), c(g), c(b), 0, 1)\n\n    def neopixel_show(self):\n        self.pr.call(\"npx\", 3, 0, 0, 0, 0, 1)\n\n    # ---------- I2C 센서·화면 ----------\n    def sensor_setup(self, kind, sda=255, scl=255, wait_ready=True):\n        \"\"\"I2C 장치를 켭니다. sda/scl 을 주지 않으면 ESP32 보드의 Grove I2C 단자.\"\"\"\n        if not self._io or not self._sens:\n            print(\"ESP32 main.py is old: download the ESP32 files again for sensor blocks\")\n            raise OSError(\"ESP32 main.py has no sensor commands\")\n        slot = S_OLED if kind == S_OLED32 else kind\n        self.pr.call(\"sinit\", kind, sda & 255, scl & 255)\n        self._son[slot] = 0\n        if not wait_ready:\n            return\n        bit, err = 1 << slot, 1 << (slot + 11)\n        sw = StopWatch()\n        while sw.time() < 3000:\n            st = self._sget(True)[6]\n            if st & bit:\n                self._son[slot] = 1\n                if slot == S_TOF:\n                    print(\"ESP32 ToF:\", _TOF_CHIP[(st >> 8) & 3])\n                return\n            if st & err:\n                break\n            wait(20)\n        print(\"ESP32: no\", _S_NAME[slot], \"- check SDA/SCL wiring and power\")\n        raise OSError(\"ESP32 I2C device not found\")\n\n    def _need(self, kind):\n        if kind not in self._son:\n            self.sensor_setup(kind)\n\n    def _sget(self, fresh=False):\n        # 한 반복 안에서 여러 블록이 값을 읽어도 블루투스·포트를 덜 쓰도록 15 ms 동안은 같은 값\n        t = self._sw.time()\n        if fresh or t - self._st >= 15:\n            self._sv = self.pr.call(\"sget\")\n            self._st = t\n            self.monitor()\n            v = self._sv[5]\n            seq = v >> 8\n            if self._vseq is None:\n                self._vseq = seq  # 프로그램 시작 전에 들은 명령은 무시\n            elif seq != self._vseq:\n                self._vseq = seq\n                self._vev = v & 255\n                self._vev_t = t\n        return self._sv\n\n    def monitor(self, force=False):\n        \"\"\"웹 에디터 「상태」 탭이 열려 있으면(stdin 'E' 프레임) 0.2초마다 \"@ES:포트,빨강,초록,파랑,밝기,거리,음성,상태\" 출력\"\"\"\n        t = self._sw.time()\n        if t - self._mon >= 200 and (force or rm_link.fresh(\"E\")):\n            self._mon = t\n            print(\"@ES:%s,%d,%d,%d,%d,%d,%d,%d\" % ((self._pn,) + tuple(self._sv)))\n\n    # OLED\n    def oled_clear(self):\n        self._need(S_OLED)\n        self.pr.call(\"sset\", S_OLED, 0, 0)\n\n    def oled_text(self, row, text, size=1):\n        \"\"\"row 번째 줄(1부터)에 글자. size 2·3 은 크게 (한 줄에 16/size 자). 영문·숫자만.\"\"\"\n        self._need(S_OLED)\n        if isinstance(text, float):\n            text = (\"%.2f\" % text).rstrip(\"0\").rstrip(\".\")\n        s = \"\".join(c if 32 <= ord(c) < 127 else \"?\" for c in str(text))\n        size = max(1, min(3, int(size)))\n        width = 16 // size\n        s = (s + \" \" * width)[:width]  # 줄의 남은 칸은 지움\n        row = max(0, min(7, int(row) - 1))\n        step = 14 // size\n        for i in range(0, width, step):\n            part = s[i:i + step]\n            self.pr.call(\"otxt\", row | ((size - 1) << 4), i * size, part.encode())\n\n    # 음성 인식\n    def voice_id(self):\n        \"\"\"새로 알아들은 명령 번호 (없으면 0). 한 번 읽으면 지워집니다.\"\"\"\n        self._need(S_VOICE)\n        self._sget()\n        n = self._vev\n        self._vev = 0\n        return n\n\n    def voice_heard(self, n):\n        \"\"\"명령 n 을 새로 알아들었으면 True (그 명령은 지워짐). 다른 명령은 1초 동안 남겨 둠.\"\"\"\n        self._need(S_VOICE)\n        self._sget()\n        if self._vev and self._sw.time() - self._vev_t > 1000:\n            self._vev = 0\n        if self._vev and self._vev == int(n):\n            self._vev = 0\n            return True\n        return False\n\n    def voice_set(self, what, value):\n        \"\"\"what 0 음량(1~7) · 1 음소거(1/0) · 2 깨어 있는 시간(초) · 3 대답 소리 재생(명령 번호)\"\"\"\n        self._need(S_VOICE)\n        self.pr.call(\"sset\", S_VOICE, int(what), max(0, min(255, int(value))))\n\n    # 컬러\n    def color_raw(self):\n        self._need(S_COLOR)\n        return self._sget()[:4]\n\n    def color_rgb(self, i):\n        \"\"\"i 0 빨강 · 1 초록 · 2 파랑 (0~255) · 3 밝기(0~100)\"\"\"\n        r, g, b, c = self.color_raw()\n        if i == 3:\n            return min(100, c * 100 // 21504)\n        m = max(r, g, b, 1)\n        return (r, g, b)[i] * 255 // m if c > 40 else 0\n\n    def color_name(self):\n        \"\"\"'BLACK' 'WHITE' 'RED' 'YELLOW' 'GREEN' 'BLUE' (아무것도 없으면 'NONE')\"\"\"\n        r, g, b, c = self.color_raw()\n        if c < 40:\n            return \"NONE\"\n        mx, mn = max(r, g, b), min(r, g, b)\n        bright = c * 100 // 21504\n        sat = (mx - mn) * 100 // max(mx, 1)\n        if sat < 18:\n            return \"WHITE\" if bright > 25 else \"BLACK\"\n        if bright < 4:\n            return \"BLACK\"\n        d = mx - mn\n        if mx == r:\n            h = (60 * (g - b) // d) % 360\n        elif mx == g:\n            h = 60 * (b - r) // d + 120\n        else:\n            h = 60 * (r - g) // d + 240\n        if h < 25 or h >= 320:\n            return \"RED\"\n        if h < 75:\n            return \"YELLOW\"\n        if h < 170:\n            return \"GREEN\"\n        return \"BLUE\"\n\n    def color_is(self, name):\n        return self.color_name() == name\n\n    # 레이저 거리\n    def tof_mm(self):\n        \"\"\"레이저 거리(mm). 아무것도 없으면 칩의 최대 거리 (0.5 m · 2 m · 4 m 형).\"\"\"\n        self._need(S_TOF)\n        return self._sget()[4]\n\n    def add_channel(self, name, fmt):\n        \"\"\"ESP32 → 허브 로 값을 계속 보내는 채널.\"\"\"\n        self.pr.add_channel(name, fmt)\n\n    def add_command(self, name, to_hub=\"\", from_hub=\"\"):\n        \"\"\"허브가 ESP32 의 함수를 호출하는 명령 (to_hub: 돌려받는 형식, from_hub: 보내는 형식).\"\"\"\n        self.pr.add_command(name, to_hub_fmt=to_hub, from_hub_fmt=from_hub)\n\n    def call(self, name, *args):\n        r = self.pr.call(name, *args)\n        self._last[name] = r if isinstance(r, tuple) else (r,)\n        return r\n\n    def value(self, name, index=0):\n        \"\"\"채널/명령을 읽고 index 번째 값을 돌려줍니다.\"\"\"\n        r = self.call(name)\n        if isinstance(r, tuple):\n            return r[index] if index < len(r) else 0\n        return r if index == 0 else 0\n\n\ndef board(port):\n    k = str(port)\n    if k not in _boards:\n        _boards[k] = ESP32(port)\n    return _boards[k]\n", "rm_husky": "# rm_husky.py — HuskyLens (husky_spike_esp32 브리지) 를 Pybricks 에서 읽기\n#\n# https://github.com/daewonlee81-glitch/husky_spike_esp32\n# ESP32 가 SPIKE 색 센서로 위장해서 값을 보냅니다.\n#   mode0 (COLOR)  = 감지된 ID  (라인 추적이면 1/0)\n#   mode5 (RGB I)  = [v1, v2, v3, v4]\n#     블록형(색·물체·얼굴·태그): v1=중심X(0~320) v2=중심Y(0~240) v3=가로폭W\n#     화살표형(라인 추적):        v1=시작X      v2=끝X        v3=끝Y\n#\n# ESP32 펌웨어의 mode5 4번째 값(v4)에 ID 를 넣어 두면(권장)\n# 모드 전환 없이 한 번에 읽어 더 빠릅니다. 0 이면 mode0 을 따로 읽습니다.\n\n#\n# 허스키렌즈 모니터: 웹 에디터의 「허스키렌즈」 탭이 열려 있으면(stdin 'M' 프레임)\n# 읽은 값을 0.1초마다 \"@HK:포트,ID,v1,v2,v3\" 줄로 출력합니다. 에디터는 이 줄을 터미널에서 숨기고 그림으로 보여 줍니다.\n\nfrom pybricks.iodevices import PUPDevice\nfrom pybricks.tools import StopWatch, wait\nimport rm_link\n\n_lenses = {}\n\n\ndef _connect(port, ms=4000):\n    \"\"\"브리지(ESP32)가 켜지고 허브와 인사할 때까지 최대 ms 기다립니다.\"\"\"\n    sw = StopWatch()\n    while True:\n        try:\n            return PUPDevice(port)\n        except OSError:\n            if sw.time() >= ms:\n                print(\"HuskyLens?\", port)\n                raise\n        wait(200)\n\n\nclass HuskyLens:\n    def __init__(self, port, interval=30):\n        self.dev = _connect(port)\n        self.port = str(port)[-1]\n        self.interval = interval\n        self._clock = StopWatch()\n        self._last = -1000\n        self._mon = -1000\n        self._v = (0, 0, 0)\n        self._id = 0\n\n    def update(self):\n        now = self._clock.time()\n        if now - self._last < self.interval:\n            return\n        self._last = now\n        r = self.dev.read(5)\n        self._v = (r[0], r[1], r[2])\n        if len(r) > 3 and r[3] > 0:\n            self._id = r[3]\n        else:\n            self._id = self.dev.read(0)[0]\n        self.monitor()\n\n    def monitor(self, force=False):\n        \"\"\"에디터의 허스키렌즈 탭으로 값 보내기 (탭이 열려 있을 때만, 0.1초마다).\"\"\"\n        now = self._clock.time()\n        if now - self._mon >= 100 and (force or rm_link.fresh(\"M\")):\n            self._mon = now\n            v = self._v\n            print(\"@HK:%s,%d,%d,%d,%d\" % (self.port, self._id, v[0], v[1], v[2]))\n\n    # 블록형\n    def id(self):\n        self.update()\n        return self._id\n\n    def detected(self, target=0):\n        \"\"\"무언가 보이면 True. target 을 주면 그 ID 일 때만 True.\"\"\"\n        i = self.id()\n        return i > 0 if target == 0 else i == target\n\n    def x(self):\n        self.update()\n        return self._v[0]\n\n    def y(self):\n        self.update()\n        return self._v[1]\n\n    def width(self):\n        self.update()\n        return self._v[2]\n\n    # 화살표형 (라인 추적)\n    def line_start_x(self):\n        return self.x()\n\n    def line_end_x(self):\n        return self.y()\n\n    def line_end_y(self):\n        return self.width()\n\n    def offset(self, center=160):\n        \"\"\"화면 중앙에서 벗어난 정도 (왼쪽 -, 오른쪽 +).\"\"\"\n        return self.x() - center\n\n\ndef lens(port):\n    \"\"\"포트별로 HuskyLens 를 하나만 만들어 돌려줍니다.\"\"\"\n    k = str(port)\n    if k not in _lenses:\n        _lenses[k] = HuskyLens(port)\n    return _lenses[k]\n", "rm_link": "# rm_link.py — 로보메이커스 웹 에디터 ↔ 허브 데이터 링크\n#\n# 웹 에디터(AI 카메라, 웹 게임패드)가 Pybricks stdin 으로 보내는\n# 한 줄짜리 프레임을 읽어 보관합니다.\n#\n#   프레임 형식:  <키>:<정수>,<정수>,...\\n\n#     H:  손      [감지, 제스처ID, X, Y, 손가락수]\n#     P:  스켈레톤 [감지, 코X, 코Y, 왼손들기, 오른손들기, 몸중심X, 어깨기울기, 양팔벌림]\n#     G:  게임패드 [LX, LY, RX, RY, LT, RT, 버튼비트, 방향키]\n#\n# 값은 읽을 때마다 update() 가 자동 호출되므로 블록에서 따로 부를 필요가 없습니다.\n\ntry:\n    from sys import stdin\n    from select import poll\nexcept ImportError:  # 예전 Pybricks (u- 접두사 모듈)\n    from usys import stdin\n    from uselect import poll\nfrom pybricks.tools import StopWatch\n\n_poll = poll()\n_poll.register(stdin)\n_buf = []\n_data = {}\n_time = {}\n_clock = StopWatch()\n\n# 이 시간(ms) 동안 새 프레임이 없으면 값이 끊긴 것으로 봅니다 (느린 PC 의 AI 계산 고려).\nTIMEOUT = 1500\n\n\ndef update():\n    global _buf\n    n = 0\n    while n < 256 and _poll.poll(0):\n        n += 1\n        c = stdin.read(1)\n        if c == \"\\n\":\n            line = \"\".join(_buf)\n            _buf = []\n            if len(line) > 2 and line[1] == \":\":\n                try:\n                    _data[line[0]] = [int(v) for v in line[2:].split(\",\")]\n                    _time[line[0]] = _clock.time()\n                except ValueError:\n                    pass\n        elif c != \"\\r\":\n            if len(_buf) < 160:\n                _buf.append(c)\n            else:\n                _buf = []\n\n\ndef fresh(key):\n    \"\"\"해당 키의 프레임이 최근 TIMEOUT 안에 들어왔으면 True.\"\"\"\n    update()\n    t = _time.get(key)\n    return t is not None and _clock.time() - t < TIMEOUT\n\n\ndef get(key, index, default=0):\n    \"\"\"키의 index 번째 값을 돌려줍니다. 끊겼거나 없으면 default.\"\"\"\n    if not fresh(key):\n        return default\n    v = _data.get(key)\n    if v is None or index >= len(v):\n        return default\n    return v[index]\n\n\ndef values(key):\n    \"\"\"키의 전체 값 목록 (끊겼으면 빈 목록).\"\"\"\n    if not fresh(key):\n        return []\n    return list(_data.get(key, []))\n", "rm_pad": "# rm_pad.py — 엑스박스 / PS 계열 조종기 통합 클래스\n#\n#   Gamepad(\"xbox\")            허브가 Xbox 무선 컨트롤러에 직접 BLE 연결\n#                              (SPIKE Prime · Essential, Pybricks XboxController)\n#   Gamepad(\"web\")             PC/태블릿에 연결한 Xbox·PS 패드를 웹 에디터가 중계\n#                              (모든 허브, EV3 포함 — 에디터가 연결된 동안)\n#   Gamepad(\"esp32\", Port.A)   LMS-ESP32 BluePad32 LPF2 펌웨어 (PS4/PS5/Xbox/스위치)\n#\n# 공통 값\n#   stick(\"LX\"|\"LY\"|\"RX\"|\"RY\")  -100 ~ 100  (오른쪽 / 위가 +)\n#   trigger(\"L\"|\"R\")            0 ~ 100\n#   pressed(\"A\")                True / False\n#     버튼 이름: A B X Y LB RB VIEW MENU LJ RJ UP DOWN LEFT RIGHT\n#     PS 패드:   A=✕  B=○  X=□  Y=△  LB=L1  RB=R1  VIEW=SHARE  MENU=OPTIONS\n\nimport rm_link\n\n_BITS = {\n    \"A\": 0, \"B\": 1, \"X\": 2, \"Y\": 3, \"LB\": 4, \"RB\": 5,\n    \"VIEW\": 6, \"MENU\": 7, \"LJ\": 8, \"RJ\": 9,\n    \"UP\": 10, \"DOWN\": 11, \"LEFT\": 12, \"RIGHT\": 13, \"GUIDE\": 14,\n}\n\n# Pybricks XboxController.dpad(): 0=없음 1=위 2=오른쪽위 ... 8=왼쪽위\n_DPAD = {\n    \"UP\": (1, 2, 8), \"RIGHT\": (2, 3, 4),\n    \"DOWN\": (4, 5, 6), \"LEFT\": (6, 7, 8),\n}\n\n\ndef _clamp(v):\n    return -100 if v < -100 else 100 if v > 100 else int(v)\n\n\nclass Gamepad:\n    def __init__(self, source=\"web\", port=None):\n        self.source = source\n        self._xbox = None\n        self._bp = None\n        if source == \"xbox\":\n            from pybricks.iodevices import XboxController\n            self._xbox = XboxController()\n            from pybricks.parameters import Button\n            self._btn = {\n                \"A\": Button.A, \"B\": Button.B, \"X\": Button.X, \"Y\": Button.Y,\n                \"LB\": Button.LB, \"RB\": Button.RB, \"VIEW\": Button.VIEW,\n                \"MENU\": Button.MENU, \"LJ\": Button.LJ, \"RJ\": Button.RJ,\n                \"GUIDE\": Button.GUIDE,\n            }\n        elif source == \"esp32\":\n            from bluepad import BluePad\n            from pybricks.iodevices import PUPDevice\n            from pybricks.tools import wait, StopWatch\n            sw = StopWatch()\n            while True:  # ESP32 가 켜지고 허브와 인사할 때까지 최대 8초\n                try:\n                    PUPDevice(port)\n                    break\n                except OSError:\n                    if sw.time() >= 8000:\n                        print(\"ESP32?\", port)\n                        raise\n                wait(200)\n            self._bp = BluePad(port)\n\n    # ---------- 내부: 원시 값 ----------\n    def _raw(self):\n        \"\"\"(LX, LY, RX, RY, LT, RT, 버튼비트, 방향키) 를 공통 형식으로.\"\"\"\n        if self._xbox:\n            lx, ly = self._xbox.joystick_left()\n            rx, ry = self._xbox.joystick_right()\n            lt, rt = self._xbox.triggers()\n            return (lx, ly, rx, ry, lt, rt, None, self._xbox.dpad())\n        if self._bp:\n            v = self._bp.gamepad()\n            # BluePad32: 축 -128~127 (아래가 +), 버튼 bit0=A bit1=B bit2=X bit3=Y\n            # bit4=L1 bit5=R1 bit6=L2 bit7=R2 / 방향키 bit0=위 bit1=아래 bit2=오른쪽 bit3=왼쪽\n            btn, dp = v[4], v[5]\n            bits = btn & 0x3F\n            if dp & 1:\n                bits |= 1 << 10\n            if dp & 2:\n                bits |= 1 << 11\n            if dp & 8:\n                bits |= 1 << 12\n            if dp & 4:\n                bits |= 1 << 13\n            lt = 100 if btn & 0x40 else 0\n            rt = 100 if btn & 0x80 else 0\n            return (_clamp(v[0] * 100 // 128), _clamp(-v[1] * 100 // 128),\n                    _clamp(v[2] * 100 // 128), _clamp(-v[3] * 100 // 128),\n                    lt, rt, bits, 0)\n        g = rm_link.values(\"G\")\n        if len(g) < 8:\n            return (0, 0, 0, 0, 0, 0, 0, 0)\n        return tuple(g[:8])\n\n    # ---------- 공통 API ----------\n    def connected(self):\n        if self._xbox or self._bp:\n            return True\n        return rm_link.fresh(\"G\")\n\n    def stick(self, axis):\n        i = {\"LX\": 0, \"LY\": 1, \"RX\": 2, \"RY\": 3}[axis]\n        return self._raw()[i]\n\n    def trigger(self, side):\n        return self._raw()[4 if side == \"L\" else 5]\n\n    def pressed(self, name):\n        if self._xbox:\n            if name in _DPAD:\n                return self._xbox.dpad() in _DPAD[name]\n            return self._btn[name] in self._xbox.buttons.pressed()\n        bits = self._raw()[6]\n        return bool(bits & (1 << _BITS[name]))\n\n    def rumble(self, power=50, duration=200):\n        \"\"\"Xbox 직접 연결일 때만 진동합니다.\"\"\"\n        if self._xbox:\n            self._xbox.rumble(power, duration)\n\n    def tank(self):\n        \"\"\"왼쪽 스틱으로 (왼쪽 바퀴, 오른쪽 바퀴) 속도 -100~100 계산.\"\"\"\n        y = self.stick(\"LY\")\n        x = self.stick(\"LX\")\n        return (_clamp(y + x), _clamp(y - x))\n", "pupremote_hub": "# Trimmed version of pupremote that only runs on Pybricks hubs\n# Includes async/multitask support for concurrent hub-side operations\n#\n# This is a lightweight version (44% smaller than pupremote.py) optimized for:\n# - Pybricks block code:\n#      - import sync functions connect(), add_command(), call()\n#      - import async functions call_multitask(), process_async()\n# - Pybricks multitask support for concurrent operations\n# - Low memory footprint on Pybricks hubs\n# - Hub-side only (no sensor emulation code)\n# - Async support via call_multitask() and process_async()\n# - Compatible with Pybricks multitask for concurrent operations\n\n__author__ = \"Anton Vanhoucke & Ste7an\"\n__copyright__ = \"Copyright 2023,2024 AntonsMindstorms.com\"\n__license__ = \"GPL\"\n__version__ = \"2.1.3\"\n__status__ = \"Production\"\n\nimport ustruct as struct\nfrom pybricks.iodevices import PUPDevice\nfrom pybricks.parameters import Port\nfrom pybricks.tools import wait, run_task\nfrom micropython import const\n\nMAX_PKT = const(16)\n\n# Result holder indices\nDONE = const(0)\nRESULT = const(1)\nERROR = const(2)\n\n# Dictionary keys\nNAME = const(0)\nSIZE = const(1)\nTO_HUB_FORMAT = const(2)\nFROM_HUB_FORMAT = const(3)\nARGS_TO_HUB = const(5)\nARGS_FROM_HUB = const(6)\nCALLBACK = const(0)\nCHANNEL = const(1)\n\n\npr = None\n\n\ndef _connected():\n    if pr is None:\n        raise RuntimeError(\"Use the connect block first\")\n    return pr\n\n\ndef connect(port):\n    \"\"\"\n    Connect to LMS-ESP32. Pass Port as a string ('A') or a number (1=Port.A)\n    \"\"\"\n    global pr\n    pr = PUPRemoteHub(port)\n\n\ndef call(*args):\n    return _connected().call(*args)\n\n\ndef add_channel(name, encoding):\n    _connected().add_channel(name, encoding)\n\n\ndef add_command(name, to_hub=\"\", from_hub=\"\"):\n    _connected().add_command(name, to_hub_fmt=to_hub, from_hub_fmt=from_hub)\n\n\ndef call_multitask(*args, **kwargs):\n    return _connected().call_multitask(*args, **kwargs)\n\n\ndef process_async():\n    return _connected().process_async()\n\n\nclass PUPRemote:\n    \"\"\"Base class for PUPRemoteHub on Pybricks.\n\n    Defines a list of commands and their formats. Contains encoding/decoding\n    functions for communication between hub and sensor.\n\n    Args:\n        max_packet_size: Maximum packet size in bytes, defaults to 16 for Pybricks compatibility.\n    \"\"\"\n\n    def __init__(self, max_packet_size=MAX_PKT):\n        self.commands = []\n        self.modes = {}\n        self.max_packet_size = max_packet_size\n\n    def add_channel(self, mode_name: str, to_hub_fmt: str = \"\"):\n        \"\"\"Define a data channel to read on the hub.\n\n        Use this function with identical parameters on both the sensor and the hub.\n        You can call a channel like a command, but to update the data on the sensor\n        side, you need to `update_channel(<name>, *args)`.\n\n        Args:\n            mode_name: The name of the mode you defined on the sensor side.\n            to_hub_fmt: The format string of the data sent from the sensor to the hub.\n                Use 'repr' to receive any python object. Or use a struct format string.\n                See https://docs.python.org/3/library/struct.html\n        \"\"\"\n        self.add_command(mode_name, to_hub_fmt=to_hub_fmt, command_type=CHANNEL)\n\n    def add_command(\n        self,\n        mode_name: str,\n        to_hub_fmt: str = \"\",\n        from_hub_fmt: str = \"\",\n        command_type=CALLBACK,\n    ):\n        \"\"\"Define a remote call.\n\n        Use this function with identical parameters on both the sensor and the hub.\n\n        Args:\n            mode_name: The name of the mode you defined on the sensor side.\n            to_hub_fmt: The format string of the data sent from the sensor to the hub.\n                Use 'repr' to receive any python object. Or use a struct format string.\n                See https://docs.python.org/3/library/struct.html\n            from_hub_fmt: The format string of the data sent from the hub.\n            command_type: CALLBACK or CHANNEL (internal).\n        \"\"\"\n        if to_hub_fmt == \"repr\" or from_hub_fmt == \"repr\":\n            msg_size = self.max_packet_size\n            num_args_from_hub = -1\n            num_args_to_hub = -1\n        else:\n            size_to_hub_fmt = struct.calcsize(to_hub_fmt)\n            size_from_hub_fmt = struct.calcsize(from_hub_fmt)\n            msg_size = max(size_to_hub_fmt, size_from_hub_fmt)\n            num_args_to_hub = len(\n                struct.unpack(to_hub_fmt, bytearray(struct.calcsize(to_hub_fmt)))\n            )\n            num_args_from_hub = len(\n                struct.unpack(from_hub_fmt, bytearray(struct.calcsize(from_hub_fmt)))\n            )\n\n        assert msg_size <= self.max_packet_size, \"Payload exceeds maximum packet size\"\n        self.commands.append(\n            {\n                NAME: mode_name,\n                TO_HUB_FORMAT: to_hub_fmt,\n                SIZE: msg_size,\n                ARGS_TO_HUB: num_args_to_hub,\n            }\n        )\n        if command_type == CALLBACK:\n            self.commands[-1][FROM_HUB_FORMAT] = from_hub_fmt\n            self.commands[-1][ARGS_FROM_HUB] = num_args_from_hub\n\n        # Build a dictionary of mode names and their index\n        self.modes[mode_name] = len(self.commands) - 1\n\n    def decode(self, fmt: str, data: bytes):\n        if fmt == \"repr\":\n            clean = data.rstrip(b\"\\x00\")\n            return (eval(clean),) if clean else (\"\",)\n        else:\n            size = struct.calcsize(fmt)\n            data = struct.unpack(fmt, data[:size])\n        return data\n\n    def encode(self, size, format, *argv):\n        if format == \"repr\":\n            s = bytes(repr(*argv), \"utf-8\")\n        else:\n            s = struct.pack(format, *argv)\n        assert len(s) <= size, \"Payload exceeds maximum packet size\"\n        return s\n\n\nclass PUPRemoteHub(PUPRemote):\n    \"\"\"Communicate with a PUPRemoteSensor from a Pybricks hub.\n\n    Use on the hub side running Pybricks. Copy the commands you defined on the sensor\n    side to the hub side using add_command() and add_channel().\n\n    Args:\n        port: The port to which the PUPRemoteSensor is connected. Use Port.A,\n            a string ('A') or a number (1 = Port.A).\n        max_packet_size: Maximum payload size in bytes, defaults to 16 for Pybricks compatibility.\n    \"\"\"\n\n    def _int8_to_uint8(self, arr):\n        return [((i + 128) & 0xFF) - 128 for i in arr]\n\n    def __init__(self, port, max_packet_size=MAX_PKT):\n        super().__init__(max_packet_size)\n        # Accept Port.A, 'A' or 1 (=Port.A)\n        if isinstance(port, str):\n            port = getattr(Port, port.upper())\n        elif isinstance(port, int):\n            port = getattr(Port, chr(64 + port))\n        self.port = port\n        try:\n            self.pup_device = PUPDevice(port)\n        except OSError:\n            self.pup_device = None\n            print(\"Check wiring and remote script. Unable to connect on \", self.port)\n            raise\n        # Multitask stuff\n        self._queue = []\n        self._multitask_loop_running = False\n\n    def add_command(\n        self, mode_name, to_hub_fmt=\"\", from_hub_fmt=\"\", command_type=CALLBACK\n    ):\n        super().add_command(mode_name, to_hub_fmt, from_hub_fmt, command_type)\n        # Check the newly added commands against the advertised modes.\n        modes = self.pup_device.info()[\"modes\"]\n        n = len(self.commands) - 1  # Zero indexed mode number\n        assert len(self.commands) <= len(modes), \"More commands than on remote side\"\n        assert (\n            mode_name == modes[n][0].rstrip()\n        ), \"Expected '{}' as mode {}, but got '{}'\".format(\n            modes[n][0].rstrip(), n, mode_name\n        )\n        assert (\n            self.commands[-1][SIZE] == modes[n][1]\n        ), \"Different parameter size than on remote side. Check formats.\"\n\n    def call(self, mode_name: str, *argv, wait_ms=0):\n        \"\"\"Call a remote function on the sensor side.\n\n        Args:\n            mode_name: The name of the mode you defined on both sides.\n            *argv: Arguments to pass to the remote function.\n            wait_ms: Time to wait before reading after sending (optional).\n                Defaults to 0ms. A good value is `struct.calcsize(from_hub_fmt) * 1.5` (ms)\n\n        Returns:\n            The return value from the remote function, or a tuple of values.\n\n        Raises:\n            AssertionError: If called during a multitask operation.\n        \"\"\"\n        assert (\n            not run_task()\n        ), \"Use 'call_multitask' instead of 'call', with multiple start blocks or multitask blocks\"\n        assert mode_name in self.modes, \"Unknown command '{}'. Use add_command or add_channel first\".format(\n            mode_name\n        )\n\n        mode = self.modes[mode_name]\n        size = self.commands[mode][SIZE]\n\n        if FROM_HUB_FORMAT in self.commands[mode]:\n            num_args = self.commands[mode][ARGS_FROM_HUB]\n            if num_args >= 0:\n                assert (\n                    len(argv) == num_args\n                ), \"Expected {} argument(s) in call '{}'\".format(num_args, mode_name)\n            self.pup_device.read(mode)\n            payl = self.encode(size, self.commands[mode][FROM_HUB_FORMAT], *argv)\n            self.pup_device.write(\n                mode,\n                [\n                    ((i + 128) & 0xFF) - 128\n                    for i in tuple(payl + b\"\\x00\" * (size - len(payl)))\n                ],\n            )\n            wait(wait_ms)\n\n        data = self.pup_device.read(mode)\n        raw_data = bytes([b if b>=0 else b+256 for b in data])\n        result = self.decode(self.commands[mode][TO_HUB_FORMAT], raw_data)\n        # Convert tuple size 1 to single value\n        return result[0] if len(result) == 1 else result\n\n    async def call_multitask(self, command_name: str, *argv, wait_ms=0):\n        \"\"\"Call a remote function asynchronously for use with Pybricks multitask.\n\n        Make sure to run process_async() as a separate task before using this.\n\n        Args:\n            command_name: The name of the command.\n            *argv: Arguments to pass to the remote function.\n            wait_ms: Time to wait before reading after sending. Defaults to 0ms.\n\n        Returns:\n            The return value from the remote function, or a tuple of values.\n        \"\"\"\n        if not self._multitask_loop_running:\n            raise AssertionError(\n                \"Start 'process_async' as a seperate task (coroutine) before using 'call_multitask()'\"\n            )\n        assert command_name in self.modes, \"Unknown command '{}'. Use add_command or add_channel first\".format(\n            command_name\n        )\n\n        result_holder = [False, None, None]  # [done, result, error]\n        self._queue.append((command_name, argv, wait_ms, result_holder))\n\n        while not result_holder[DONE]:\n            await wait(1)  # cooperative multitasking\n\n        if result_holder[ERROR]:\n            raise result_holder[ERROR]\n        return result_holder[RESULT]\n\n    async def _execute_call(self, mode_name: str, *argv, wait_ms=0):\n        mode = self.modes[mode_name]\n        size = self.commands[mode][SIZE]\n\n        if FROM_HUB_FORMAT in self.commands[mode]:\n            num_args = self.commands[mode][ARGS_FROM_HUB]\n            if num_args >= 0:\n                assert len(argv) == num_args, \"Args mismatch in {}\".format(mode_name)\n            await self.pup_device.read(mode)\n            payl = self.encode(size, self.commands[mode][FROM_HUB_FORMAT], *argv)\n            await self.pup_device.write(\n                mode,\n                [\n                    ((i + 128) & 0xFF) - 128\n                    for i in tuple(payl + b\"\\x00\" * (size - len(payl)))\n                ],\n            )\n            await wait(wait_ms)\n\n        data = await self.pup_device.read(mode)\n        raw_data = bytes([b if b>=0 else b+256 for b in data])\n        result = self.decode(self.commands[mode][TO_HUB_FORMAT], raw_data)\n        # Convert tuple size 1 to single value\n        return result[0] if len(result) == 1 else result\n\n    async def process_async(self):\n        \"\"\"\n        Process multitask MicroPUP calls in a queue to avoid EAGAIN or IOERR.\n        \"\"\"\n        self._multitask_loop_running = True\n        running = False\n        while True:\n            if self._queue and not running:\n                running = True\n                command_name, argv, wait_ms, result_holder = self._queue.pop(0)\n\n                try:\n                    result = await self._execute_call(\n                        command_name, *argv, wait_ms=wait_ms\n                    )\n                    result_holder[RESULT] = result\n                except Exception as e:\n                    result_holder[ERROR] = e\n                    print(e)\n                    raise\n                finally:\n                    result_holder[DONE] = True\n                    running = False\n            await wait(1)\n", "bluepad": "__author__ = \"Anton Vanhoucke & Ste7an\"\n__copyright__ = \"Copyright 2023, AntonsMindstorms.com\"\n__license__ = \"GPL\"\n__version__ = \"2.1.0\"\n__status__ = \"Production\"\n\n# !! Upload this file into your editor at code.pybricks.com\n\nfrom pybricks.iodevices import PUPDevice\nimport ustruct\n\nFILL = 0x10\nZERO = 0x20\nSET = 0x30\nCONFIG = 0x40\nWRITE = 0x80\n\n\nclass BluePad:\n    \"\"\"\n    Class for using LMS-ESP32 running BluePad32 LPF2 firmware. Defines methods for reading\n    connected Bluetooth gamepad (such as PS4 or Nintendo Switch) and for driving NeoPixels and Servo motors connected\n    to the LMS-ESP32 board.\n    Flash the LMS-ESP32 board with BluePad32 LPF2 for PyBricks projects from\n    https://firmware.antonsmindstorms.com/.\n\n    :param port: The port to which the LMS-ESp32 running BluePad32 is connected.\n    :type port: Port (Example: Port.A)\n\n    \"\"\"\n\n    def __init__(self, port):\n        self.pup = PUPDevice(port)\n        self.sensor_id = self.pup.info()[\"id\"]\n        self.cur_mode = 0\n        self.nr_leds = 24\n        self.arr_servos = [0] * 8\n\n    def switch_mode(self, new_mode):\n        if new_mode != self.cur_mode:\n            # extra read, just in case a write is performed\n            self.pup.read(new_mode)\n        self.cur_mode = new_mode\n\n    def send(self, byte_vals):\n        self.switch_mode(0)\n        if self.sensor_id == 64:\n            signed_vals = ustruct.unpack(\"9b\", ustruct.pack(\"9B\", *byte_vals))\n            self.pup.write(self.cur_mode, signed_vals)\n        else:\n            word_vals = ustruct.unpack(\"8H\", ustruct.pack(\"16B\", *byte_vals))\n            self.pup.write(self.cur_mode, word_vals)\n\n    def gamepad(self, mode=-1, deadzone=5):\n        \"\"\"\n        Returns the reading of a gamepad as a tuple. Returns the x- and y values of the left and right\n        pads. Buttons are encoded as single bits in `buttonss`. The dpad values are encoded in `dpad`.\n\n        :param deadzone: Axis values within [-deadzone, deadzone] are clamped to 0. Defaults to 5.\n        :return: Tuple (left_pad_x,left_pad_y,right_pad_x,right_pad_y,buttons,dpad)\n        \"\"\"\n        if mode >= 0:\n            self.cur_mode = mode\n        vals = self.pup.read(self.cur_mode)\n        if self.sensor_id == 64:  # color matrix: 9 signed values\n            if vals[0] == vals[1] == vals[2] == vals[3] == -128:\n                return (0, 0, 0, 0, 0, 0)\n            v0, v1, v2, v3 = vals[0], vals[1], vals[2], vals[3]\n            btn, dpad = vals[4] & 255, vals[5] & 255\n        else:  # color sensor id = 61: 8 unsigned words, axes in low bytes\n            b = ustruct.pack(\"8H\", *vals)\n            if b[0] == b[1] == b[2] == b[3] == 0:  # axes all at -128 → no gamepad\n                return (0, 0, 0, 0, 0, 0)\n            v0, v1, v2, v3 = b[0] - 128, b[1] - 128, b[2] - 128, b[3] - 128\n            btn, dpad = b[4], b[5]\n        return (\n            v0 if v0 > deadzone or v0 < -deadzone else 0,\n            v1 if v1 > deadzone or v1 < -deadzone else 0,\n            v2 if v2 > deadzone or v2 < -deadzone else 0,\n            v3 if v3 > deadzone or v3 < -deadzone else 0,\n            btn,\n            dpad,\n        )\n\n    def btns_pressed(self, btns, nintendo=False):\n        \"\"\"\n        Decodes the buttons pressed and converts the buttons to a string\n        containing the pressed buttons ['X','O','[]','Δ']\n\n        :param btns: The word read from the gamepad containing the binary encodeing of pressed buttons.\n        :type btns: Word\n        :param nintendo: Indicates that a nintendo gamepad is used.\n        :return: String with pressed buttons.\n\n        \"\"\"\n        bits_btns = [int(i) for i in bin(btns)[2:]]  # convert to binary, remove '0b'\n        bits_btns.reverse()\n        if nintendo:\n            btn_val = [\"B\", \"A\", \"Y\", \"X\", \"L\", \"R\", \"ZL\", \"ZR\"]\n        else:\n            btn_val = [\"X\", \"O\", \"[]\", \"V\"]\n        btns_string = [j for i, j in zip(bits_btns, btn_val) if i]\n        return btns_string\n\n    def dpad_pressed(self, btns, nintendo=False):\n        \"\"\"\n        Decodes the dpad-buttons pressed and converts the buttons to a string\n        containing the pressed buttons ['L','R','U','D']\n\n        :param btns: The word read from the gamepad containing the binary encoding of pressed dpad-buttons\n        :type btns: Word\n        :return: String with pressed dpad-buttons\n\n        \"\"\"\n        bits_btns = [int(i) for i in bin(btns)[2:]]  # convert to binary, remove '0b'\n        bits_btns.reverse()\n        if nintendo:\n            btn_val = [\"U\", \"D\", \"R\", \"L\"]\n        else:\n            btn_val = [\"D\", \"R\", \"L\", \"U\"]\n        btns_string = [j for i, j in zip(bits_btns, btn_val) if i]\n        return btns_string\n\n    def neopixel_init(self, nr_leds, pin):\n        \"\"\"\n        Initializes a NeoPixel string with the given number of LEDs aconnected to the specified GPIO pin.\n\n        :param nr_leds: The number of leds in the NeoPixel string\n        :type nr_leds: byte\n        :param pin: The GPIO pin number connected to the NeoPixel string\n        :type pin: byte\n        \"\"\"\n        leds = [0] * 16\n        leds[0] = CONFIG\n        leds[1] = nr_leds\n        leds[2] = pin\n        r = self.send(leds)\n        self.switch_mode(0)\n        self.nr_leds = nr_leds\n        return r\n\n    def neopixel_fill(self, color, write=True):\n        \"\"\"\n        Fills all the neopixels with the same color.\n\n        :param color: tuple with (r,g,b) colorsred color value\n        :param write: If True write the output to the NeoPixels. Defaults to True.\n        :type write: bool\n        \"\"\"\n        global cur_mode\n        r, g, b = color\n        leds = [0] * 16\n        leds[0] = FILL | WRITE if write else FILL\n        leds[1:4] = [r, g, b]\n        r = self.send(leds)\n        self.switch_mode(0)\n        return r\n\n    def neopixel_zero(self, write=True):\n        \"\"\"\n        Zeros all neopixels with value (0,0,0)\n\n        :param write: If True writes the output to the NeoPixels. Defaults to False.\n        :type write: bool\n        \"\"\"\n        leds = [0] * 16\n        leds[0] = ZERO | WRITE if write else FILL\n        r = self.send(leds)\n        self.switch_mode(0)\n        return r\n\n    def neopixel_set(self, led_nr, color, write=True):\n        \"\"\"\n        Sets single NeoPixel at position led_nr with color=(r,g,b).\n\n        :param led_nr: Position of the led to set (counting from 0)\n        :type led_nr: byte\n        :param color: Tuple with color for led (r,g,b)\n        :param color: (r,g,b) with r,g,b bytes\n        :param write: If True writes the output to the NeoPixels. Defaults to True.\n        :type write: bool\n        \"\"\"\n        r, g, b = color\n        leds = [0] * 16\n        leds[0] = SET | WRITE if write else FILL\n        leds[1] = 1\n        leds[2] = led_nr\n        if led_nr >= self.nr_leds:\n            print(\"error neopixel_set: led_nr larger than number of leds!\")\n            r = None\n        else:\n            leds[3:6] = [r, g, b]\n            r = self.send(leds)\n        self.switch_mode(0)\n        return r\n\n    def neopixel_set_multi(self, start_led, nr_led, led_arr, write=True):\n        \"\"\"\n        Sets multiple NeoPixel value(s). Maximum number os leds is 4.\n\n        :param start_led: Starting led number (counting from 0).\n        :type start_led: byte\n        :param nr_led: Number of leds to set.\n        :type nr_led: byte\n        :param led_arr: Array containing tuples r,g,b for each neopixel.\n        :param write: If True write the output to the NeoPixels. Defaults to True.\n        :type write: bool\n        \"\"\"\n        leds = [0] * 16\n        leds[0] = SET | WRITE if write else FILL\n        leds[1] = nr_led\n        leds[2] = start_led\n        if nr_led > 4:\n            print(\"error neopixel_set_multi: led_nr larger than 4!\")\n            r = None\n        else:\n            if len(led_arr) == 3 * nr_led:\n                leds[3 : 3 + nr_led * 3] = led_arr\n                r = self.send(leds)\n            else:\n                print(\n                    \"error neopixel_set_multi: led_nr does not correspons with led_arr\"\n                )\n                r = None\n        self.switch_mode(0)\n        return r\n\n    def servo(self, servo_nr, pos, zero_is_mid=True):\n        \"\"\"Sets a servo motor to the specified position.\n\n        Servo motors should be connected to GPIO pins 21, 22, 23 and 25 for\n        LMS-ESP32v1 and to GPIO pins 19, 20, 21 and 22 for LMS-ESP32v2.\n\n        Args:\n            servo_nr (int): Servo motor index counting from 0.\n            pos (int): Target position in degrees. Range depends on zero_is_mid:\n                -90 to 90 when zero_is_mid=True, 0 to 180 when zero_is_mid=False.\n            zero_is_mid (bool): If True, 0 maps to 90° (midpoint). Defaults to True.\n        \"\"\"\n        offset = 90 if zero_is_mid else 0\n        self.arr_servos[servo_nr] = (pos + offset) % 181\n        self.switch_mode(1)\n        if self.sensor_id == 64:  # color matrix\n            byte_vals = ustruct.unpack(\n                \"9b\", ustruct.pack(\"4HB\", *self.arr_servos[:4], 0)\n            )\n            self.pup.write(self.cur_mode, byte_vals)\n        else:\n            self.pup.write(self.cur_mode, self.arr_servos)\n\n    def servos(self, servo_tgts, zero_is_mid=True):\n        \"\"\"Sets multiple servo motors to the specified positions.\n\n        Args:\n            servo_tgts (list of int): Target positions for each servo motor.\n            zero_is_mid (bool, optional): If True, 0 maps to 90° (midpoint). Defaults to True.\n        \"\"\"\n        offset = 90 if zero_is_mid else 0\n        for i in range(len(servo_tgts)):\n            self.arr_servos[i] = (servo_tgts[i] + offset) % 181\n        self.switch_mode(1)\n        if self.sensor_id == 64:  # color matrix\n            byte_vals = ustruct.unpack(\n                \"9b\", ustruct.pack(\"4HB\", *self.arr_servos[:4], 0)\n            )\n            self.pup.write(self.cur_mode, byte_vals)\n        else:\n            self.pup.write(self.cur_mode, self.arr_servos)\n\n\n\n# Simple fucntions to import as blocks\nfrom pybricks.parameters import Port, Color\n\nrgb_values = {\n    Color.WHITE: (255, 255, 255),\n    Color.RED: (255, 0, 0),\n    Color.ORANGE: (255, 127, 0),\n    Color.BLACK: (0, 0, 0),\n    Color.NONE: (0, 0, 0),\n    Color.YELLOW: (255, 255, 0),\n    Color.GREEN: (0, 255, 0),\n    Color.CYAN: (0, 255, 255),\n    Color.BLUE: (0, 0, 255),\n    Color.VIOLET: (127, 127, 255),\n    Color.MAGENTA: (255, 0, 255),\n    Color.GRAY: (127, 127, 127),\n}\n\n\ndef bluepad_init(port_letter, nintendo=True):\n    global _bp\n    global _nintendo\n    port = eval(\"Port.\" + port_letter)\n    _bp = BluePad(port)\n    _nintendo = nintendo\n\n\ndef get_left_stick_vertical():\n    # Return same direction and max value as Pybricks controller block\n    return _bp.gamepad()[1] / 128 * -100\n\n\ndef get_left_stick_horizontal():\n    # Return same direction and max value as Pybricks controller block\n    return _bp.gamepad()[0] / 128 * 100\n\n\ndef get_right_stick_horizontal():\n    # Return same direction and max value as Pybricks controller block\n    return _bp.gamepad()[2] / 128 * 100\n\n\ndef get_right_stick_vertical():\n    # Return same direction and max value as Pybricks controller block\n    return _bp.gamepad()[3] / 128 * -100\n\n\ndef get_direction_pad():\n    # Return same values as pybricks dpad block\n    return _bp.gamepad()[5]\n\n\ndef get_buttons():\n    # Return same values as pybricks dpad block\n    return _bp.gamepad()[4]\n\n\ndef color_convert(color, intensity):\n    c = (0, 0, 0)\n    if color in rgb_values:\n        color = rgb_values[color]\n    if isinstance(color, tuple):\n        c = tuple([int(val * intensity) for val in color])\n    return c\n\n\ndef set_neopixel(led_nr, color, intensity=1, write=True):\n    _bp.neopixel_set(led_nr, color_convert(color, intensity), write)\n\n\ndef init_neopixel(nr_leds, pin):\n    _bp.neopixel_init(nr_leds, pin)\n\n\ndef fill_neopixel(color, intensity, write=True):\n    _bp.neopixel_fill(color_convert(color, intensity), write)\n\n\ndef set_servo(servo_nr, angle):\n    # Angle in range 0-180. 90 is neutral.\n    _bp.servo(int(servo_nr), int(angle))\n\n\ndef gamepad():\n    return _bp.gamepad()\n"};
  const HANDOFF = 'rm-wb-handoff';
  const EDITOR_URL = '../Robomakers_APP/?from=sim';

  const W = window.__wb;
  const Bly = window.Blockly;
  if (!W || !Bly || !W.dg) {
    console.warn('wordblock-sync: 시뮬레이터 앱이 준비되지 않았습니다');
    return;
  }

  // ───────────── 문구 ─────────────
  for (const [lang, d] of Object.entries(MSGS)) {
    W.dg[lang] = W.dg[lang] || {};
    for (const [k, v] of Object.entries(d)) if (!k.startsWith('__')) W.dg[lang][k] = v;
  }
  const t = (k, ...a) => W.Ye(k, ...a);
  const coco = (i) => {
    const l = (MSGS[W.lang()] || MSGS.en).__coco || MSGS.en.__coco;
    return l[i] || MSGS.en.__coco[i] || '?';
  };

  // ───────────── AI 상수 (에디터 aicam.js 와 같게) ─────────────
  const COCO = MSGS.en.__cocoKeys;
  const cocoId = (name) => COCO.indexOf(name) + 1;
  const OBJ_PICK = [
    'person', 'cup', 'bottle', 'sports ball', 'book', 'cell phone', 'scissors', 'teddy bear', 'apple', 'banana',
    'orange', 'chair', 'backpack', 'umbrella', 'laptop', 'keyboard', 'mouse', 'clock', 'cat', 'dog', 'car',
  ];
  const COLOR_IDS = ['NONE', 'RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'VIOLET', 'MAGENTA', 'WHITE', 'BLACK'];
  const TEACH_CLASSES = 5;
  const COLOR_SLOTS = 5;
  const NP_COLORS = { RED: [60, 0, 0], ORANGE: [60, 20, 0], YELLOW: [50, 40, 0], GREEN: [0, 60, 0], CYAN: [0, 45, 45], BLUE: [0, 0, 60], VIOLET: [30, 0, 60], MAGENTA: [60, 0, 35], WHITE: [40, 40, 40], BLACK: [0, 0, 0] };
  const AI_BLOCKS = {
    rm_ai_obj_seen: 'obj', rm_ai_obj_value: 'obj', rm_ai_teach_is: 'teach', rm_ai_teach_value: 'teach',
    rm_ai_color_is: 'color', rm_ai_color_value: 'color', rm_ai_lcolor_seen: 'color', rm_ai_lcolor_value: 'color',
  };
  const ESP_IO_BLOCKS = ['rm_eio_dout', 'rm_eio_din', 'rm_eio_ain', 'rm_eio_pwm', 'rm_eio_servo', 'rm_eio_np_init', 'rm_eio_np_set', 'rm_eio_np_setc', 'rm_eio_np_fill', 'rm_eio_np_fillc',
    'rm_es_setup', 'rm_es_oled_clear', 'rm_es_oled_text', 'rm_es_voice_id', 'rm_es_voice_is', 'rm_es_voice_set', 'rm_es_color', 'rm_es_color_is', 'rm_es_tof'];
  // ESP32 I2C 센서 블록의 시뮬레이터 값 (센서가 없으므로: 레이저 거리는 「아무것도 없음」 = 2000)
  const ES_SIM = { rm_es_tof: 2000, rm_es_color: 0, rm_es_color_is: false, rm_es_voice_id: 0, rm_es_voice_is: false };
  const COL = { ai: '#00A88F', esp: '#3D7A3A', motor: '#0090F5' };

  // ───────────── 블록 정의 (에디터와 같은 이름 · 같은 필드) ─────────────
  const lsJson = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
    } catch (e) {
      return d;
    }
  };
  const opts = (group, keys) => keys.map((k) => [t(`o.${group}.${k}`), k]);
  const dd = (name, options) => ({ type: 'field_dropdown', name, options });
  const num = (name) => ({ type: 'input_value', name, check: 'Number' });
  const ports = () => {
    const h = W.hub();
    return (h.lpf2 ? h.sensorPorts : ['A']).map((p) => [p, p]);
  };
  const objOptions = () => [[t('coco.any'), '0'], ...OBJ_PICK.map((n) => [coco(cocoId(n) - 1), String(cocoId(n))])];
  const teachOptions = () => {
    const names = lsJson('rm-teach-names', []);
    return Array.from({ length: TEACH_CLASSES }, (_, i) => [names[i] || t('teach.class', i + 1), String(i + 1)]);
  };
  const slotOptions = () => Array.from({ length: COLOR_SLOTS }, (_, i) => [t('color.slot', i + 1), String(i + 1)]);
  const npColors = () => Object.keys(NP_COLORS).map((k) => [t('o.color.' + (k === 'BLACK' ? 'OFF' : k)), k]);
  const pinIn = { type: 'input_value', name: 'PIN', check: 'Number' };
  const RGB = [num('R'), num('G'), num('B')];

  const def = (type, colour, args, shape) => {
    Bly.Blocks[type] = {
      init() {
        const tipKey = `b.${type}.tip`;
        const tip = t(tipKey);
        const j = { type, message0: t('b.' + type), args0: args, colour, inputsInline: true };
        if (tip !== tipKey) j.tooltip = tip;
        if (shape === 'stmt') {
          j.previousStatement = null;
          j.nextStatement = null;
        } else if (shape === 'num') j.output = 'Number';
        else if (shape === 'bool') j.output = 'Boolean';
        this.jsonInit(j);
      },
    };
  };

  def('rm_ai_obj_seen', COL.ai, [dd('OBJ', objOptions)], 'bool');
  def('rm_ai_obj_value', COL.ai, [dd('OBJ', objOptions), dd('WHAT', () => [
    [t('o.objv.x'), '1'], [t('o.objv.y'), '2'], [t('o.objv.size'), '3'], [t('o.objv.score'), '4'], [t('o.objv.id'), '0']])], 'num');
  def('rm_ai_teach_is', COL.ai, [dd('N', teachOptions)], 'bool');
  def('rm_ai_teach_value', COL.ai, [dd('WHAT', () => opts('teachv', ['taught', 'taught_conf']))], 'num');
  def('rm_ai_color_is', COL.ai, [dd('COLOR', () => opts('color', ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'BLUE', 'VIOLET', 'MAGENTA', 'WHITE', 'BLACK']))], 'bool');
  def('rm_ai_color_value', COL.ai, [dd('WHAT', () => [[t('o.colorv.id'), 'id'], [t('o.colorv.r'), '0'], [t('o.colorv.g'), '1'], [t('o.colorv.b'), '2']])], 'num');
  def('rm_ai_lcolor_seen', COL.ai, [dd('N', slotOptions)], 'bool');
  def('rm_ai_lcolor_value', COL.ai, [dd('N', slotOptions), dd('WHAT', () => [[t('o.objv.x'), '1'], [t('o.objv.y'), '2'], [t('o.lcolv.size'), '3']])], 'num');

  // 모터 두 개를 한 블록으로
  const mports = () => (W.hub()?.motorPorts || ['A', 'B']).map((p) => [p, p]);
  const dirs = (first) => opts('dir', first === 'CLOCKWISE' ? ['CLOCKWISE', 'COUNTERCLOCKWISE'] : ['COUNTERCLOCKWISE', 'CLOCKWISE']);
  def('rm_motor_pair_run', COL.motor, [dd('P1', mports), num('S1'), dd('P2', mports), num('S2')], 'stmt');
  def('rm_motor_pair_setup', COL.motor, [dd('P1', mports), dd('D1', () => dirs('COUNTERCLOCKWISE')), dd('P2', mports), dd('D2', () => dirs('CLOCKWISE'))], 'stmt');

  def('rm_eio_dout', COL.esp, [dd('PORT', ports), pinIn, dd('ON', () => opts('onoff', ['1', '0']))], 'stmt');
  def('rm_eio_din', COL.esp, [dd('PORT', ports), pinIn, dd('PULL', () => opts('pull', ['2', '3', '1']))], 'bool');
  def('rm_eio_ain', COL.esp, [dd('PORT', ports), pinIn], 'num');
  def('rm_eio_pwm', COL.esp, [dd('PORT', ports), pinIn, num('VAL')], 'stmt');
  def('rm_eio_servo', COL.esp, [dd('PORT', ports), pinIn, num('ANGLE')], 'stmt');
  def('rm_eio_np_init', COL.esp, [dd('PORT', ports), pinIn, num('COUNT')], 'stmt');
  def('rm_eio_np_set', COL.esp, [dd('PORT', ports), num('N'), ...RGB], 'stmt');
  def('rm_eio_np_setc', COL.esp, [dd('PORT', ports), num('N'), dd('COLOR', npColors)], 'stmt');
  def('rm_eio_np_fill', COL.esp, [dd('PORT', ports), ...RGB], 'stmt');
  def('rm_eio_np_fillc', COL.esp, [dd('PORT', ports), dd('COLOR', npColors)], 'stmt');
  // ESP32 I2C 센서·화면
  def('rm_es_setup', COL.esp, [dd('PORT', ports), dd('KIND', () => opts('eskind', ['1', '5', '2', '3', '4'])), num('SDA'), num('SCL')], 'stmt');
  def('rm_es_oled_clear', COL.esp, [dd('PORT', ports)], 'stmt');
  def('rm_es_oled_text', COL.esp, [dd('PORT', ports), num('ROW'), { type: 'input_value', name: 'TEXT' }, dd('SIZE', () => opts('essize', ['1', '2', '3']))], 'stmt');
  def('rm_es_voice_id', COL.esp, [dd('PORT', ports)], 'num');
  def('rm_es_voice_is', COL.esp, [dd('PORT', ports), num('N')], 'bool');
  def('rm_es_voice_set', COL.esp, [dd('PORT', ports), dd('WHAT', () => opts('esvoice', ['0', '1', '2', '3'])), num('VAL')], 'stmt');
  def('rm_es_color', COL.esp, [dd('PORT', ports), dd('WHAT', () => opts('escolor', ['0', '1', '2', '3']))], 'num');
  def('rm_es_color_is', COL.esp, [dd('PORT', ports), dd('COLOR', () => opts('color', ['RED', 'YELLOW', 'GREEN', 'BLUE', 'WHITE', 'BLACK', 'NONE']))], 'bool');
  def('rm_es_tof', COL.esp, [dd('PORT', ports)], 'num');

  // ───────────── 파이썬 (실제 허브로 보낼 코드 — 에디터와 같은 결과) ─────────────
  const PY = window.python?.pythonGenerator;
  const PO = window.python?.Order;
  if (PY) {
    const pv = (b, n, d = '0') => PY.valueToCode(b, n, PO.NONE) || d;
    const aicam = () => (PY.rmPlainImports_.add('rm_aicam'), 'rm_aicam');
    const imp = (m, n) => {
      if (!PY.rmImports_.has(m)) PY.rmImports_.set(m, new Set());
      if (n) PY.rmImports_.get(m).add(n);
    };
    // 핀 블록이 있으면 ESP32 를 io=True 로 만듭니다 (이미 io 없이 만들어졌어도 덮어씀)
    const esp = (p) => {
      imp('rm_esp32', 'ESP32');
      imp('pybricks.parameters', 'Port');
      PY.rmSetup_.set('esp32_' + p, `esp32_${p} = ESP32(Port.${p}, io=True)`);
      return 'esp32_' + p;
    };
    const F = PO.FUNCTION_CALL;
    const g = PY.forBlock;
    // 모터 두 개 블록 → 기존 한 모터 블록의 생성기를 그대로 써서 같은 코드로
    const asOne = (b, map) => new Proxy(b, { get: (o, k) => (k === 'getFieldValue' ? (n) => o.getFieldValue(map[n] || n)
      : k === 'getInput' ? (n) => o.getInput(map[n] || n) : k === 'getInputTargetBlock' ? (n) => o.getInputTargetBlock(map[n] || n)
        : typeof o[k] === 'function' ? o[k].bind(o) : o[k]) });
    const pairGen = (G, one) => (b) => [1, 2].map((i) => G.forBlock[one](asOne(b, one === 'rm_motor_run'
      ? { PORT: 'P' + i, SPEED: 'S' + i } : { PORT: 'P' + i, DIR: 'D' + i }), G)).join('');
    window.__wbPair = pairGen;
    g.rm_motor_pair_run = pairGen(PY, 'rm_motor_run');
    g.rm_motor_pair_setup = pairGen(PY, 'rm_motor_setup');
    g.rm_ai_obj_seen = (b) => [`${aicam()}.object_seen(${b.getFieldValue('OBJ')})`, F];
    g.rm_ai_obj_value = (b) => [`${aicam()}.object_value(${b.getFieldValue('OBJ')}, ${b.getFieldValue('WHAT')})`, F];
    g.rm_ai_teach_is = (b) => [`${aicam()}.taught_is(${b.getFieldValue('N')})`, F];
    g.rm_ai_teach_value = (b) => [`${aicam()}.${b.getFieldValue('WHAT')}()`, F];
    g.rm_ai_color_is = (b) => [`${aicam()}.center_color_is(rm_aicam.${b.getFieldValue('COLOR')})`, F];
    g.rm_ai_color_value = (b) => {
      const w = b.getFieldValue('WHAT');
      return [w === 'id' ? `${aicam()}.center_color()` : `${aicam()}.center_rgb(${w})`, F];
    };
    g.rm_ai_lcolor_seen = (b) => [`${aicam()}.learned_color_seen(${b.getFieldValue('N')})`, F];
    g.rm_ai_lcolor_value = (b) => [`${aicam()}.learned_color_value(${b.getFieldValue('N')}, ${b.getFieldValue('WHAT')})`, F];
    const P = (b) => esp(b.getFieldValue('PORT'));
    g.rm_eio_dout = (b) => `${P(b)}.digital_write(${pv(b, 'PIN')}, ${b.getFieldValue('ON') === '1' ? 'True' : 'False'})\n`;
    g.rm_eio_din = (b) => [`${P(b)}.digital_read(${pv(b, 'PIN')}, ${b.getFieldValue('PULL')})`, F];
    g.rm_eio_ain = (b) => [`${P(b)}.analog_read(${pv(b, 'PIN')})`, F];
    g.rm_eio_pwm = (b) => `${P(b)}.pwm(${pv(b, 'PIN')}, ${pv(b, 'VAL')})\n`;
    g.rm_eio_servo = (b) => `${P(b)}.servo(${pv(b, 'PIN')}, ${pv(b, 'ANGLE')})\n`;
    g.rm_eio_np_init = (b) => `${P(b)}.neopixel_init(${pv(b, 'PIN')}, ${pv(b, 'COUNT', '1')})\n`;
    g.rm_eio_np_set = (b) => `${P(b)}.neopixel_set(${pv(b, 'N', '1')}, ${pv(b, 'R')}, ${pv(b, 'G')}, ${pv(b, 'B')})\n`;
    g.rm_eio_np_setc = (b) => `${P(b)}.neopixel_set(${pv(b, 'N', '1')}, ${NP_COLORS[b.getFieldValue('COLOR')].join(', ')})\n`;
    g.rm_eio_np_fill = (b) => `${P(b)}.neopixel_fill(${pv(b, 'R')}, ${pv(b, 'G')}, ${pv(b, 'B')})\n`;
    g.rm_eio_np_fillc = (b) => `${P(b)}.neopixel_fill(${NP_COLORS[b.getFieldValue('COLOR')].join(', ')})\n`;
    g.rm_es_setup = (b) => `${P(b)}.sensor_setup(${b.getFieldValue('KIND')}, ${pv(b, 'SDA', '255')}, ${pv(b, 'SCL', '255')})\n`;
    g.rm_es_oled_clear = (b) => `${P(b)}.oled_clear()\n`;
    g.rm_es_oled_text = (b) => `${P(b)}.oled_text(${pv(b, 'ROW', '1')}, ${PY.valueToCode(b, 'TEXT', PO.NONE) || "''"}, ${b.getFieldValue('SIZE')})\n`;
    g.rm_es_voice_id = (b) => [`${P(b)}.voice_id()`, F];
    g.rm_es_voice_is = (b) => [`${P(b)}.voice_heard(${pv(b, 'N', '5')})`, F];
    g.rm_es_voice_set = (b) => `${P(b)}.voice_set(${b.getFieldValue('WHAT')}, ${pv(b, 'VAL')})\n`;
    g.rm_es_color = (b) => [`${P(b)}.color_rgb(${b.getFieldValue('WHAT')})`, F];
    g.rm_es_color_is = (b) => [`${P(b)}.color_is('${b.getFieldValue('COLOR')}')`, F];
    g.rm_es_tof = (b) => [`${P(b)}.tof_mm()`, F];
  }

  // ───────────── 시뮬레이터 (자바스크립트) ─────────────
  const JG = window.javascript?.javascriptGenerator;
  const JO = window.javascript?.Order;
  if (JG) {
    const jv = (b, n, d = '0') => JG.valueToCode(b, n, JO.NONE) || d;
    const X = 'window.__wbx';
    const F = JO.FUNCTION_CALL;
    const g = JG.forBlock;
    // 실행 중인 블록 밝히기: 문장 블록마다 __wbTrace(블록 id) 를 앞에 넣음
    JG.STATEMENT_PREFIX = '__wbTrace(%1);\n';
    const hs = document.createElement('style');
    hs.textContent = '.rm-run>.blocklyPath{filter:brightness(1.45) drop-shadow(0 0 6px #FFD400)!important;stroke:#FFD400!important;stroke-width:3px!important}';
    document.head.appendChild(hs);
    let runB = null;
    window.__wbTrace = (id) => {
      try {
        const ws = W.ws();
        const b = id && ws ? ws.getBlockById(id) : null;
        if (b === runB) return;
        if (runB && runB.getSvgRoot()) runB.getSvgRoot().classList.remove('rm-run');
        runB = b;
        if (b && b.getSvgRoot()) b.getSvgRoot().classList.add('rm-run');
      } catch (e) { /* 무시 */ }
    };
    const stopBtn = document.querySelector('#simStop');
    if (stopBtn) {
      new MutationObserver(() => {
        if (stopBtn.hidden) setTimeout(() => { window.__wbTrace(null); }, 400);
      }).observe(stopBtn, { attributes: true, attributeFilter: ['hidden'] });
    }
    if (window.__wbPair) {
      g.rm_motor_pair_run = window.__wbPair(JG, 'rm_motor_run');
      g.rm_motor_pair_setup = window.__wbPair(JG, 'rm_motor_setup');
    } else {
      g.rm_motor_pair_run = (b) => ['1', '2'].map((i) => `await api.wbRun(${JSON.stringify(b.getFieldValue('P' + i))}, ${jv(b, 'S' + i, '50')});\n`).join('');
      g.rm_motor_pair_setup = (b) => ['1', '2'].map((i) => `await api.wbMotorDir(${JSON.stringify(b.getFieldValue('P' + i))}, ${JSON.stringify(b.getFieldValue('D' + i))});\n`).join('');
    }
    g.rm_ai_obj_seen = (b) => [`${X}.objSeen(${b.getFieldValue('OBJ')})`, F];
    g.rm_ai_obj_value = (b) => [`${X}.objValue(${b.getFieldValue('OBJ')}, ${b.getFieldValue('WHAT')})`, F];
    g.rm_ai_teach_is = (b) => [`(${X}.get('T', 0, 0) === ${b.getFieldValue('N')})`, JO.EQUALITY];
    g.rm_ai_teach_value = (b) => [`${X}.get('T', ${b.getFieldValue('WHAT') === 'taught' ? 0 : 1}, 0)`, F];
    g.rm_ai_color_is = (b) => [`(${X}.get('C', 0, 0) === ${COLOR_IDS.indexOf(b.getFieldValue('COLOR'))})`, JO.EQUALITY];
    g.rm_ai_color_value = (b) => {
      const w = b.getFieldValue('WHAT');
      return [`${X}.get('C', ${w === 'id' ? 0 : 1 + Number(w)}, 0)`, F];
    };
    g.rm_ai_lcolor_seen = (b) => [`(${X}.get('K', ${(Number(b.getFieldValue('N')) - 1) * 4}, 0) === 1)`, JO.EQUALITY];
    g.rm_ai_lcolor_value = (b) => [`${X}.lcolor(${b.getFieldValue('N')}, ${b.getFieldValue('WHAT')})`, F];
    // ESP32 는 시뮬레이터에 없으므로 값은 0, 출력은 무시 (한 번 안내)
    for (const k of ESP_IO_BLOCKS) {
      g[k] = (b) => {
        // 입력 값 안의 블록도 실행되도록 계산은 해 둡니다
        for (const n of ['PIN', 'VAL', 'ANGLE', 'COUNT', 'N', 'R', 'G', 'B', 'ROW', 'TEXT', 'SDA', 'SCL']) if (b.getInput(n)) jv(b, n);
        if (k in ES_SIM) return [`api.wbNoDev('esp', ${JSON.stringify(ES_SIM[k])})`, F];
        if (k === 'rm_eio_servo') return `await ${X}.servoWait(api, ${jv(b, 'PIN')}, ${jv(b, 'ANGLE')});\n`;
        if (k === 'rm_eio_din') return [`api.wbNoDev('esp', false)`, F];
        if (k === 'rm_eio_ain') return [`api.wbNoDev('esp', 0)`, F];
        return `api.wbNoDev('esp', 0);\n`;
      };
    }
  }

  // ───────────── 도구 상자 ─────────────
  const blk = (type, inputs, fields) => ({ kind: 'block', type, ...(inputs ? { inputs } : {}), ...(fields ? { fields } : {}) });
  const n = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const label = (text) => ({ kind: 'label', text });
  window.__wbTb = (tb, hub) => {
    try {
      for (const c of tb.contents || []) {
        const items = c.contents || [];
        const mr = items.findIndex((x) => x.type === 'rm_motor_run');
        if (mr >= 0 && !items.some((x) => x.type === 'rm_motor_pair_run')) {
          const mp = hub?.motorPorts || ['A', 'B'];
          items.splice(mr + 1, 0, blk('rm_motor_pair_run', { S1: n(50), S2: n(50) }, { P1: mp[0], P2: mp[1] }));
          const ms = items.findIndex((x) => x.type === 'rm_motor_setup');
          items.splice(ms + 1, 0, blk('rm_motor_pair_setup', null, { P1: mp[0], P2: mp[1] }));
        }
        const at = items.findIndex((x) => x.type === 'rm_ai_pose_value');
        if (at >= 0 && !items.some((x) => x.type === 'rm_ai_obj_seen')) {
          items.splice(at + 1, 0,
            label(t('tb.object')), blk('rm_ai_obj_seen', null, { OBJ: '1' }), blk('rm_ai_obj_value', null, { OBJ: '1' }),
            label(t('tb.teach')), blk('rm_ai_teach_is'), blk('rm_ai_teach_value'),
            label(t('tb.color')), blk('rm_ai_color_is'), blk('rm_ai_color_value'),
            label(t('tb.lcolor')), blk('rm_ai_lcolor_seen'), blk('rm_ai_lcolor_value'));
        }
        if (hub?.lpf2 && items.some((x) => x.type === 'rm_esp_call') && !items.some((x) => x.type === 'rm_eio_dout')) {
          items.push(
            label(t('tb.espio')),
            blk('rm_eio_dout', { PIN: n(2) }), blk('rm_eio_din', { PIN: n(4) }), blk('rm_eio_ain', { PIN: n(34) }),
            blk('rm_eio_pwm', { PIN: n(2), VAL: n(50) }), blk('rm_eio_servo', { PIN: n(21), ANGLE: n(90) }),
            label(t('tb.neopixel')),
            blk('rm_eio_np_init', { PIN: n(12), COUNT: n(8) }), blk('rm_eio_np_setc', { N: n(1) }),
            blk('rm_eio_np_set', { N: n(1), R: n(60), G: n(0), B: n(0) }), blk('rm_eio_np_fillc'),
            blk('rm_eio_np_fill', { R: n(0), G: n(0), B: n(60) }));
        }
        if (hub?.lpf2 && items.some((x) => x.type === 'rm_eio_dout') && !items.some((x) => x.type === 'rm_es_tof')) {
          items.push(
            label(t('tb.esdist')), blk('rm_es_tof'),
            label(t('tb.escolor')), blk('rm_es_color'), blk('rm_es_color_is'),
            label(t('tb.esvoice')), blk('rm_es_voice_is', { N: n(22) }), blk('rm_es_voice_id'), blk('rm_es_voice_set', { VAL: n(5) }),
            label(t('tb.esoled')), blk('rm_es_oled_text', { ROW: n(1), TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello' } } } }), blk('rm_es_oled_clear'),
            label(t('tb.essetup')), blk('rm_es_setup', { SDA: n(5), SCL: n(4) }));
        }
      }
    } catch (e) {
      console.warn('wordblock-sync toolbox', e);
    }
    return tb;
  };
  try {
    const ws = W.ws?.();
    if (ws && W.wbToolbox) ws.updateToolbox(window.__wbTb(W.wbToolbox(), W.hub()));
  } catch (e) {
    /* 아직 시뮬레이터 작업 공간이 없음 — 처음 열 때 위 훅이 적용됩니다 */
  }

  // ───────────── 모터 최고 속도 (Pybricks 와 같게: 이보다 빨리 돌지 않음) ─────────────
  //   SPIKE 중형·대형 1000 °/s · SPIKE Essential 소형 620 °/s · EV3 대형 800 °/s (pbio servo_settings.c)
  const MAX_DPS = { PrimeHub: 1000, EssentialHub: 620, EV3Brick: 800 };
  window.__wbClamp = (port, dps) => {
    const v = Number(dps) || 0;
    const m = MAX_DPS[W.hub()?.cls] || 1000;
    return Math.max(-m, Math.min(m, v));
  };

  // ───────────── 허브 라이브러리 (에디터와 같은 최신 버전) ─────────────
  if (W.WB_LIB) Object.assign(W.WB_LIB, LIBS);

  // ───────────── 카메라 값 계산 (에디터 aicam.js 와 같은 방법) ─────────────
  const AI = () => window.__ai?.AI;
  const D = {}; // O · T · C · K 값 배열과 갱신 시각 (Ot …)
  const modes = new Set();
  let servoAt = {};
  let teach = [];
  let colors = [];
  const unpackEmb = (s) => Float32Array.from(atob(s), (c) => ((c.charCodeAt(0) << 24) >> 24) / 127);
  const loadLearned = () => {
    try {
      teach = (lsJson('rm-teach-v1', []) || []).map((c) => (c || []).map(unpackEmb));
    } catch (e) {
      teach = [];
    }
    colors = (lsJson('rm-colors-v1', []) || []).concat(Array(COLOR_SLOTS).fill(null)).slice(0, COLOR_SLOTS);
  };
  window.addEventListener('storage', (e) => {
    if (e.key === 'rm-teach-v1' || e.key === 'rm-colors-v1') loadLearned();
  });

  const pct = (v) => Math.max(0, Math.min(100, Math.round(v * 100)));
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }
  function classifyColor(r, g, b) {
    const [h, s, v] = rgb2hsv(r, g, b);
    if (v < 0.22) return 10;
    if (s < 0.22) return v > 0.7 ? 9 : 0;
    if (h < 12 || h >= 340) return 1;
    if (h < 40) return 2;
    if (h < 70) return 3;
    if (h < 160) return 4;
    if (h < 195) return 5;
    if (h < 255) return 6;
    if (h < 290) return 7;
    return 8;
  }
  const hueDiff = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  let lastObj = null;
  let lastEmb = null;
  let sctx = null;
  const now = () => performance.now();

  function objects(a) {
    const v = a.video;
    const Wd = v?.videoWidth || 640, Hd = v?.videoHeight || 480;
    const list = (a.res?.obj || [])
      .map((d) => {
        const id = cocoId(d.name);
        const b = d.bb;
        if (!id || !b) return null;
        return {
          id, score: Math.round(d.score * 100),
          x: pct(1 - (b.originX + b.width / 2) / Wd), y: pct((b.originY + b.height / 2) / Hd),
          size: pct(Math.max(b.width / Wd, b.height / Hd)),
        };
      })
      .filter(Boolean)
      .sort((p, q) => q.score - p.score)
      .slice(0, 3);
    const o = [list.length];
    for (let i = 0; i < 3; i++) {
      const d = list[i];
      o.push(...(d ? [d.id, d.x, d.y, d.size, d.score] : [0, 0, 0, 0, 0]));
    }
    return o;
  }

  function taught(emb) {
    const all = [];
    teach.forEach((list, ci) => list.forEach((s) => all.push([ci, s])));
    if (!all.length) return [0, 0];
    const sims = all.map(([ci, s]) => {
      let d = 0;
      for (let i = 0; i < s.length && i < emb.length; i++) d += s[i] * emb[i];
      return [ci, d];
    });
    sims.sort((p, q) => q[1] - p[1]);
    const k = Math.min(5, sims.length);
    const votes = new Array(TEACH_CLASSES).fill(0);
    for (let i = 0; i < k; i++) votes[sims[i][0]] += 1;
    const best = votes.indexOf(Math.max(...votes));
    return [best + 1, Math.round((votes[best] / k) * 100)];
  }

  function colorScan(video) {
    if (!video || video.readyState < 2) return false;
    if (!sctx) {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 60;
      sctx = c.getContext('2d', { willReadFrequently: true });
    }
    sctx.drawImage(video, 0, 0, 80, 60);
    const cd = sctx.getImageData(34, 24, 12, 12).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < cd.length; i += 4) {
      r += cd[i]; g += cd[i + 1]; b += cd[i + 2];
    }
    const cn = cd.length / 4;
    r = Math.round(r / cn); g = Math.round(g / cn); b = Math.round(b / cn);
    D.C = [classifyColor(r, g, b), r, g, b];
    const blobs = Array.from({ length: COLOR_SLOTS }, () => [0, 50, 50, 0]);
    const learned = colors.map((x, i) => [x, i]).filter(([x]) => x);
    if (learned.length) {
      const img = sctx.getImageData(0, 0, 80, 60).data;
      const Wd = 80, Hd = 60, N = Wd * Hd;
      const hsv = new Float32Array(N * 3);
      for (let p = 0; p < N; p++) {
        const [h, s, v] = rgb2hsv(img[p * 4], img[p * 4 + 1], img[p * 4 + 2]);
        hsv[p * 3] = h; hsv[p * 3 + 1] = s; hsv[p * 3 + 2] = v;
      }
      const seen = new Uint8Array(N);
      const stack = new Int32Array(N);
      for (const [ref, slot] of learned) {
        const gray = ref.s < 0.22;
        const mask = new Uint8Array(N);
        for (let p = 0; p < N; p++) {
          const h = hsv[p * 3], s = hsv[p * 3 + 1], v = hsv[p * 3 + 2];
          mask[p] = gray
            ? s < 0.25 && Math.abs(v - ref.v) < 0.18
            : s > 0.25 && hueDiff(h, ref.h) < 16 && Math.abs(s - ref.s) < 0.4 && Math.abs(v - ref.v) < 0.45;
        }
        seen.fill(0);
        let best = null;
        for (let p0 = 0; p0 < N; p0++) {
          if (!mask[p0] || seen[p0]) continue;
          let top = 0, cnt = 0, sx = 0, sy = 0;
          stack[top++] = p0;
          seen[p0] = 1;
          while (top) {
            const p = stack[--top];
            const x = p % Wd, y = (p / Wd) | 0;
            cnt++; sx += x; sy += y;
            for (const q of [p - 1, p + 1, p - Wd, p + Wd]) {
              if (q < 0 || q >= N || seen[q] || !mask[q]) continue;
              if ((q === p - 1 && x === 0) || (q === p + 1 && x === Wd - 1)) continue;
              seen[q] = 1;
              stack[top++] = q;
            }
          }
          if (!best || cnt > best.cnt) best = { cnt, sx, sy };
        }
        if (best && best.cnt >= N * 0.004) {
          blobs[slot] = [1,
            Math.round(100 - ((best.sx / best.cnt + 0.5) / Wd) * 100),
            Math.round(((best.sy / best.cnt + 0.5) / Hd) * 100),
            Math.min(100, Math.round((best.cnt / N) * 100 * 10) / 10)];
        }
      }
    }
    D.K = blobs.flat();
    return true;
  }

  function tick() {
    const a = AI();
    if (!a || !a.on || !modes.size) return;
    const tnow = now();
    if (modes.has('obj') && a.res?.obj && a.res.obj !== lastObj) {
      lastObj = a.res.obj;
      D.O = objects(a);
      D.Ot = tnow;
    }
    if (modes.has('teach') && a.lastEmb && a.lastEmb !== lastEmb) {
      lastEmb = a.lastEmb;
      D.T = taught(a.lastEmb);
      D.Tt = tnow;
    }
    if (modes.has('color') && colorScan(a.video)) D.Ct = D.Kt = tnow;
  }
  setInterval(tick, 80);

  const fresh = (k) => {
    const a = AI();
    return !!(a && a.on && D[k] && now() - (D[k + 't'] || 0) <= 1500);
  };
  const get = (k, i, d) => (fresh(k) ? D[k][i] ?? d : d);
  window.__wbx = {
    get,
    objSeen(id) {
      if (!fresh('O')) return false;
      const v = D.O;
      for (let i = 0; i < Math.min(v[0], 3); i++) if (id === 0 || v[1 + i * 5] === id) return true;
      return false;
    },
    objValue(id, what) {
      if (!fresh('O')) return 0;
      const v = D.O;
      for (let i = 0; i < Math.min(v[0], 3); i++) if (id === 0 || v[1 + i * 5] === id) return v[1 + i * 5 + what];
      return 0;
    },
    lcolor(slot, what) {
      if (get('K', (slot - 1) * 4, 0) !== 1) return what === 3 ? 0 : 50;
      return get('K', (slot - 1) * 4 + what, 0);
    },
    // 허브 rm_esp32.servo 와 같은 시간만큼 기다림 (시뮬레이터에도 같은 박자)
    async servoWait(api, pin, angle) {
      api.wbNoDev('esp', 0);
      const a = Math.max(0, Math.min(180, Math.trunc(Number(angle) || 0)));
      const prev = servoAt[pin];
      servoAt[pin] = a;
      const ms = prev === undefined ? 500 : Math.trunc(Math.abs(a - prev) * 10 / 3);
      if (ms > 0) await api.wait((ms + 20) / 1000);
    },
    modes,
    data: D,
  };

  // 프로그램 시작 시 (시뮬레이터 실행 · 허브로 보내기) 필요한 카메라 기능을 켭니다
  window.__wbKeys = (ws, keys) => {
    modes.clear();
    servoAt = {};
    try {
      for (const b of ws?.getAllBlocks(false) || []) if (b.isEnabled() && AI_BLOCKS[b.type]) modes.add(AI_BLOCKS[b.type]);
    } catch (e) {
      /* 작업 공간 없음 */
    }
    if (modes.size) loadLearned();
    const k = new Set(keys);
    if (modes.has('obj')) k.add('obj.person.v');
    if (modes.has('teach')) k.add('cls.c');
    if (modes.has('color')) k.add('col.red.v');
    return [...k];
  };

  // 실제 허브로 실행할 때 보내는 값 (에디터 aicam.js frame() 과 같은 형식)
  window.__wbFrames = () => {
    let s = '';
    if (modes.has('obj') && fresh('O')) s += 'O:' + D.O.join(',') + '\n';
    if (modes.has('teach') && fresh('T')) s += 'T:' + D.T.join(',') + '\n';
    if (modes.has('color') && fresh('C')) s += 'C:' + D.C.join(',') + '\nK:' + D.K.map((x) => Math.round(x)).join(',') + '\n';
    return s;
  };

  // ───────────── 워드블럭 에디터 ↔ 시뮬레이터 ─────────────
  const HUB_OF = { PrimeHub: 'prime', EssentialHub: 'essential', EV3Brick: 'ev3' };
  const hubKey = () => HUB_OF[W.hub()?.cls] || 'prime';
  const toast = (msg) => {
    let el = document.getElementById('wbToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wbToast';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1f2937;color:#fff;padding:10px 16px;border-radius:8px;z-index:99;font:14px sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:90vw';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 4000);
  };

  function toEditor() {
    const ws = W.ws?.();
    if (!ws) return;
    try {
      localStorage.setItem(HANDOFF, JSON.stringify({ v: 1, from: 'sim', hub: hubKey(), ws: Bly.serialization.workspaces.save(ws), t: Date.now() }));
    } catch (e) {
      toast(String(e.message || e));
      return;
    }
    window.open(EDITOR_URL, 'rm-wordblock');
  }

  function addButton() {
    if (document.getElementById('wbToEditor')) return;
    const anchor = document.getElementById('simReset') || document.getElementById('simStop') || document.getElementById('simRun');
    if (!anchor) return;
    const b = document.createElement('button');
    b.id = 'wbToEditor';
    b.className = 'small';
    b.type = 'button';
    b.onclick = toEditor;
    const set = () => {
      b.textContent = t('wb.toEditor');
      b.title = t('wb.toEditorTitle');
    };
    set();
    anchor.insertAdjacentElement('afterend', b);
    document.getElementById('langSel')?.addEventListener('change', () => setTimeout(set, 0));
  }

  function unknownTypes(state) {
    const out = new Set();
    const walk = (b) => {
      if (!b || typeof b !== 'object') return;
      if (b.type && !Bly.Blocks[b.type]) out.add(b.type);
      for (const v of Object.values(b.inputs || {})) {
        walk(v.block);
        walk(v.shadow);
      }
      walk(b.next?.block);
    };
    for (const b of state?.blocks?.blocks || []) walk(b);
    return [...out];
  }

  function fromEditor() {
    if (!/[?&]from=wordblock\b/.test(location.search)) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const h = lsJson(HANDOFF, null);
    if (!h || h.from !== 'editor' || !h.ws || Date.now() - (h.t || 0) > 10 * 60 * 1000) return;
    localStorage.removeItem(HANDOFF);
    const proj = W.proj();
    proj.sim = proj.sim || {};
    if (h.hub) proj.sim.hub = h.hub;
    proj.program = h.ws;
    W.save?.();
    if (W.simOn()) {
      // 이미 시뮬레이터 화면이면 바로 바꿔 넣기
      const ws = W.ws();
      ws.clear();
      Bly.serialization.workspaces.load(h.ws, ws);
    } else {
      W.enterSim();
    }
    const sel = document.getElementById('simHubKind');
    if (sel && h.hub) {
      sel.value = h.hub;
      sel.dispatchEvent(new Event('change'));
    }
    const mat = document.getElementById('simMat');
    if (mat && h.mat && [...mat.options].some((o) => o.value === h.mat)) {
      mat.value = h.mat;
      mat.dispatchEvent(new Event('change'));
    }
    const unknown = unknownTypes(h.ws);
    toast(unknown.length ? t('wb.unknown', unknown.join(', ')) : t('wb.fromEditor'));
  }

  function whenReady(fn, tries = 0) {
    const loading = document.getElementById('loading');
    if ((loading && !loading.hidden) && tries < 600) return setTimeout(() => whenReady(fn, tries + 1), 100);
    fn();
  }
  addButton();
  whenReady(() => {
    try {
      fromEditor();
    } catch (e) {
      console.warn('wordblock-sync handoff', e);
      toast(String(e.message || e));
    }
  });
  window.__wbSync = { version: EDITOR_VERSION, toEditor, fromEditor };
})();
