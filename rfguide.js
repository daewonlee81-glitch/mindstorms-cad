// rfguide.js — Robofest 2027 RoboPetCare "📖 단계별 설명"을 RF Robot 풀이(경로 + 코드)로 보여 줍니다 (umc.js 다음에 불러옵니다)
//   · RF Robot = 수업 도면 robofest27/RF Robot (1).ldr — 왼쪽 바퀴 A, 오른쪽 바퀴 E, 위쪽 모터 C(부착물용), 컬러 센서 B(왼쪽)·D(오른쪽),
//     바퀴 지름 56mm, 바퀴 간격 176mm, 폭 20cm, 바퀴 축에서 앞 4.36cm · 뒤 7.6cm, 컬러 센서는 축 3.2cm 앞 좌우 5.6cm.
//   · 경로는 지금 배치(UTF: 시작 방향 · 고양이 자리 · X · 문제)에 맞춰 계산합니다. 🎲 새 배치를 누르면 코드도 바뀝니다.
//   · 단계마다 경기장에 경로(주황 점선)를 그리고, 아래 코드 상자에 Pybricks 코드를 보여 줍니다.
//     "▶ 여기까지 블록 넣기" = 처음부터 그 단계까지의 블록 프로그램을 작업 공간에 넣습니다 (Ctrl+Z 로 되돌리기).
//   · umc.js 의 STEPS[6] 이 window.__rfGuide.wrap(규정 설명, 경기장, 배치) 를 부르고, hiDraw 가 단계의 path 를 그립니다.
//   · 기본 RF Robot(부착물 없음)으로 시뮬레이터 간단 모드에서 확인한 점수: 주니어 84점 · 시니어 84점 (그릇 10점, 강아지 공원 6점은 C 모터 부착물 필요).
(() => {
  'use strict';
  const U = window.__umc; if (!U) return;
  const lang = () => { try { return window.__wb.lang(); } catch { return 'ko'; } };
  const L = (ko, en) => (lang() === 'ko' ? ko : en);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const FR = 43.6; // 바퀴 축 → 로봇 앞 끝 (mm)
  const HEAD = { E: 0, S: 1, W: 2, N: 3 }, DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const DIRN = [['동', 'east'], ['남', 'south'], ['서', 'west'], ['북', 'north']];
  const LINE_X = 542; // 디스펜서 앞 검은 선(x 49.1~51cm)을 오른쪽 센서 D 가 처음 볼 때 로봇 중심 x (510 + 센서 3.2cm)

  // ───── 경로 계획 (경기장 좌표 mm: x = 서쪽 끝에서 동쪽으로, y = 북쪽 끝에서 남쪽으로) ─────
  // op: [종류, ...값, 주석[ko,en]]  — fwd(mm, 뒤로는 -) · turn(도, 오른쪽 +) · wait(초) · drive(mm/s, 도/s) · until(포트, 값) · stop · reset · setx · show(값|'x3')
  function plan(l, jr) {
    let x = l.X * 10, y = 375, h = HEAD[l.ori];
    const steps = []; let cur = null;
    const step = key => { cur = { key, ops: [], path: [[x, y]] }; steps.push(cur); };
    const op = (...a) => cur.ops.push(a);
    const r1 = v => Math.round(v * 10) / 10;
    const face = (nh, c) => { const d = ((nh - h) % 4 + 4) % 4; if (d) op('turn', [0, 90, 180, -90][d], c || [DIRN[nh][0] + '쪽 보기', 'face ' + DIRN[nh][1]]); h = nh; };
    const go = (d, c) => { d = r1(d); if (!d) return; op('fwd', d, c); x = r1(x + d * DX[h]); y = r1(y + d * DY[h]); cur.path.push([x, y]); };
    const toX = (tx, c) => go((tx - x) * DX[h], c);
    const toY = (ty, c) => go((ty - y) * DY[h], c);
    const at = (nx, ny) => { x = nx; y = ny; cur.path.push([x, y]); };

    step('setup');
    op('setup', 'A', 'E', 56, 176, ['주행 설정: 왼쪽 A, 오른쪽 E, 바퀴 56mm, 간격 176mm', 'drive base: left A, right E, wheel 56 mm, track 176 mm']);
    op('speed', 250, 180, ['직진 250mm/초, 회전 180도/초', 'straight 250 mm/s, turn 180°/s']);
    face(3, [`UTF 시작 방향 ${DIRN[HEAD[l.ori]][0]}쪽 → 북쪽 보기`, `UTF start ${DIRN[HEAD[l.ori]][1]} → face north`]);

    step('food');
    toY(200, ['북쪽으로: 로봇 중심 y = 20cm', 'north: robot centre y = 20 cm']);
    face(2);
    op('reset', ['주행 거리 0 으로', 'reset the distance']);
    op('drive', 200, 0, ['서쪽으로 계속 가다가', 'keep driving west']);
    op('until', 'D', 30, ['오른쪽 센서 D 가 디스펜서 앞 검은 선을 보면', 'until the right sensor D sees the black line in front of the dispenser']);
    op('stop', ['멈춤 → 로봇 중심 x = 54.2cm 로 위치 확정', 'stop → robot centre x = 54.2 cm']);
    at(LINE_X, y);
    if (!jr) op('setx', ['간 거리 + 54.2cm = 출발선 위치 x(cm)', 'distance + 54.2 cm = start line x (cm)']);
    toX(568, ['2.6cm 뒤로: 앞 끝이 배출구 아래 점선 자리에 걸침', 'back 2.6 cm: the front edge is over the dotted zone']);
    op('wait', 6, ['6초 기다리기: 사료 10개가 앞에 떨어짐', 'wait 6 s: the 10 food pieces drop in front']);

    step('dog');
    toX(650, ['뒤로 (돌 때 디스펜서 받침에 닿지 않게)', 'back up (so the turn clears the dispenser base)']);
    face(1); toY(300); face(2); toX(260); face(3); toY(100); face(2);
    toX(81.4 + FR, ['강아지를 서쪽으로 4.3cm 밀기', 'push the dog 4.3 cm west']);

    step('litter');
    toX(260, ['뒤로', 'back up']); face(1); toY(300); face(0);
    toX(1000, ['y 30cm 줄로 동쪽 (사료·배설물을 건드리지 않음)', 'east along y 30 cm (clear of food and debris)']);
    face(3); toY(215); face(0); toX(1140);
    face(3); toY(-5 + FR, ['북쪽으로 밀기: 앞 끝이 가장자리 0.5cm 밖', 'push north: front edge 0.5 cm past the edge']);

    step('nut');
    toY(120, ['뒤로: 로봇 중심 y = 12cm (몸 남쪽 끝 22cm, 펫토이 받침 23cm)', 'back: robot centre y = 12 cm (body ends at 22 cm, the toy base starts at 23 cm)']);
    face(0); toX(1725 - FR, ['동쪽으로: 너트를 밀어 고리에서 빼기', 'east: push the nut off the peg']);

    step('white');
    if (l.cats) { // 흰 고양이 = b(137cm), 주황 = a(127cm)
      toX(1100, ['뒤로', 'back up']); face(1); toY(600); face(0);
      toX(1270 - 20 - FR, ['주황 고양이(a)에 닿을 때까지', 'up to the orange cat (a)']);
      go(115, ['11.5cm 더 밀기: a → 138.5cm, a 가 b 를 밀어 흰 고양이 → 142.5cm', 'push 11.5 cm more: a → 138.5 cm, a pushes b: white cat → 142.5 cm']);
      toX(1150, ['뒤로', 'back up']); face(3); toY(150); face(0);
      toX(1512, ['그릇 동쪽으로 돌아감 (로봇 서쪽 끝 141.2cm)', 'round the bowl (robot west side at 141.2 cm)']);
      face(1); toY(745 - FR, ['남쪽으로 밀기: 흰 고양이를 동물병원으로', 'push south: the white cat into the vet']);
      toY(560, ['뒤로', 'back up']);
    } else {      // 흰 고양이 = a(127cm), 주황 = b(137cm)
      toX(1530, ['뒤로 (x=153cm: 그릇과 펫토이 받침 사이)', 'back up (x = 153 cm: between the bowl and the toy base)']); face(1); toY(600); face(2);
      toX(1370 + 20 + FR, ['주황 고양이(b)에 닿을 때까지', 'up to the orange cat (b)']);
      go(100, ['10cm 더 밀기: b → 127cm, b 가 a 를 밀어 흰 고양이 → 123cm', 'push 10 cm more: b → 127 cm, b pushes a: white cat → 123 cm']);
      toX(1530, ['뒤로', 'back up']); face(3); toY(150); face(2);
      toX(1140, ['그릇 서쪽으로 돌아감 (로봇 동쪽 끝 124cm)', 'round the bowl (robot east side at 124 cm)']);
      face(1); toY(745 - FR, ['남쪽으로 밀기: 흰 고양이를 동물병원으로', 'push south: the white cat into the vet']);
      toY(150, ['뒤로', 'back up']); face(0); toX(1530); face(1); toY(560);
    }

    step('orange');
    face(2); toX(500 + 20 + FR, ['서쪽으로 밀기: 주황 고양이를 50cm 까지 (출발선 너머)', 'push west: the orange cat to 50 cm (across the start line)']);
    toX(700, ['뒤로', 'back up']); face(3); toY(450); face(2); toX(500);
    face(1); toY(745 - FR, ['남쪽으로 밀기: 주황 고양이를 미용실로', 'push south: the orange cat into the groomer']);

    step('end');
    if (jr) {
      toY(600, ['뒤로', 'back up']); face(0);
      op('drive', 200, 0, ['동쪽으로 계속 가다가', 'keep driving east']);
      op('until', 'B', 30, ['왼쪽 센서 B 가 출발선(검은 선)을 보면', 'until the left sensor B sees the start line']);
      op('stop', ['멈춤 → 로봇 앞부분이 출발선 위', 'stop → the robot front is over the start line']);
      at(l.X * 10 - 9.5 - 32, y);
      const ans = l.q ? l.X - 50 : l.turns;
      op('show', ans, l.q ? [`답: 출발선 ${l.X}cm − 디스펜서 50cm = ${ans}`, `answer: start line ${l.X} cm − dispenser 50 cm = ${ans}`] : [`답: 바퀴 둘레 = 정사각형 둘레 ${4 * l.side}cm → ${4 * l.side * l.turns} ÷ ${4 * l.side} = ${ans}바퀴`, `answer: circumference = square perimeter ${4 * l.side} cm → ${4 * l.side * l.turns} ÷ ${4 * l.side} = ${ans} turns`]);
    } else {
      go(20, ['2cm 더: 앞 끝이 남쪽 가장자리 밖', '2 cm more: the front is past the south edge']);
      op('show', 'x3', ['답: x³ ÷ 100 (x = 잰 출발선 위치 cm)', 'answer: x³ ÷ 100 (x = measured start line cm)']);
    }
    op('wait', 3, ['정지한 채로 답 보여 주기', 'stay still showing the answer']);
    return steps;
  }

  // ───── 블록 (Blockly 직렬화) ─────
  let nid = 0; const id = () => 'rf' + (++nid).toString(36) + Math.random().toString(36).slice(2, 6);
  const num = v => ({ shadow: { type: 'math_number', id: id(), fields: { NUM: v } } });
  const arith = (opn, a, b) => ({ block: { type: 'math_arithmetic', id: id(), fields: { OP: opn }, inputs: { A: a, B: b } } });
  const XVAR = { name: 'x', id: 'rfVarX' };
  function block(o) {
    const [k, ...a] = o;
    switch (k) {
      case 'setup': return { type: 'rm_drive_setup', fields: { L: a[0], R: a[1], WD: a[2], AT: a[3], GYRO: false } };
      case 'speed': return { type: 'rm_drive_settings', inputs: { SPEED: num(a[0]), TURN: num(a[1]) } };
      case 'fwd': return { type: 'rm_drive_straight', inputs: { DIST: num(a[0]) } };
      case 'turn': return { type: 'rm_drive_turn', inputs: { ANGLE: num(a[0]) } };
      case 'wait': return { type: 'rm_wait', inputs: { SEC: num(a[0]) } };
      case 'drive': return { type: 'rm_drive_drive', inputs: { SPEED: num(a[0]), TURN: num(a[1]) } };
      case 'stop': return { type: 'rm_drive_stop' };
      case 'reset': return { type: 'rm_drive_reset' };
      case 'until': return { type: 'rm_wait_until', inputs: { COND: { block: { type: 'logic_compare', id: id(), fields: { OP: 'LT' }, inputs: { A: { block: { type: 'rm_color_value', id: id(), fields: { PORT: a[0], WHAT: 'reflection' } } }, B: num(a[1]) } } } } };
      case 'setx': return { type: 'variables_set', fields: { VAR: { id: XVAR.id } }, inputs: { VALUE: arith('DIVIDE', arith('ADD', { block: { type: 'rm_drive_value', id: id(), fields: { WHAT: 'distance' } } }, num(LINE_X)), num(10)) } };
      case 'show': return { type: 'rm_display_number', inputs: { NUM: a[0] === 'x3' ? arith('DIVIDE', arith('POWER', { block: { type: 'variables_get', id: id(), fields: { VAR: { id: XVAR.id } } } }, num(3)), num(100)) : num(a[0]) } };
    }
    return null;
  }
  function program(ops) {
    const root = { type: 'rm_start', id: id(), x: 30, y: 30 }; let cur = root, vx = false;
    for (const o of ops) { const b = block(o); if (!b) continue; if (o[0] === 'setx') vx = true; b.id = id(); cur.next = { block: b }; cur = b; }
    const out = { blocks: { languageVersion: 0, blocks: [root] } };
    if (vx) out.variables = [{ name: XVAR.name, id: XVAR.id }];
    return out;
  }

  // ───── Pybricks 코드 (💾 코드 저장의 .py 와 같은 이름) ─────
  const HEADER = () => `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import ColorSensor, Motor
from pybricks.parameters import Direction, Port
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()
motor_A = Motor(Port.A, Direction.COUNTERCLOCKWISE)  # ${L('왼쪽 바퀴', 'left wheel')}
motor_E = Motor(Port.E, Direction.CLOCKWISE)         # ${L('오른쪽 바퀴', 'right wheel')}
drive_base = DriveBase(motor_A, motor_E, wheel_diameter=56, axle_track=176)
color_B = ColorSensor(Port.B)  # ${L('왼쪽 컬러 센서', 'left colour sensor')}
color_D = ColorSensor(Port.D)  # ${L('오른쪽 컬러 센서', 'right colour sensor')}
`;
  const fmt = v => (Number.isInteger(v) ? String(v) : String(+v.toFixed(1)));
  function pyLines(ops) {
    const out = [];
    const c = o => { const t = o[o.length - 1]; return Array.isArray(t) ? '  # ' + L(t[0], t[1]) : ''; };
    for (const o of ops) {
      const [k, ...a] = o; let s = '';
      switch (k) {
        case 'setup': continue;
        case 'speed': s = `drive_base.settings(straight_speed=${a[0]}, turn_rate=${a[1]})`; break;
        case 'fwd': s = `drive_base.straight(${fmt(a[0])})`; break;
        case 'turn': s = `drive_base.turn(${a[0]})`; break;
        case 'wait': s = `wait(${Math.round(a[0] * 1000)})`; break;
        case 'drive': s = `drive_base.drive(${a[0]}, ${a[1]})`; break;
        case 'stop': s = 'drive_base.stop()'; break;
        case 'reset': s = 'drive_base.reset()'; break;
        case 'until': out.push(`while not (color_${a[0]}.reflection() < ${a[1]}):` + c(o)); out.push('    wait(10)'); continue;
        case 'setx': s = `x = (drive_base.distance() + ${LINE_X}) / 10`; break;
        case 'show': s = a[0] === 'x3' ? 'hub.display.number(x ** 3 / 100)' : `hub.display.number(${a[0]})`; break;
        default: continue;
      }
      out.push(s + c(o));
    }
    // 주석 열 맞추기
    const w = Math.min(40, Math.max(...out.map(l => (l.indexOf('  #') < 0 ? 0 : l.indexOf('  #')))));
    return out.map(l => { const i = l.indexOf('  #'); return i < 0 || i >= w ? l : l.slice(0, i) + ' '.repeat(w - i) + l.slice(i); }).join('\n');
  }

  // ───── 단계별 설명 (umc.js STEPS[6] 이 부름) ─────
  const P = (...a) => a.filter(Boolean).join('<br>');
  const dim = s => `<span style="color:#8a94a3">${s}</span>`;
  const rb = s => `<span style="color:#e8590c">🤖 <b>RF Robot</b></span> ${s}`;
  let CUR = null; // 지금 보여 주는 단계 목록 (코드 상자·블록 넣기에서 씀)
  function wrap(rules, m, l) {
    try {
      const jr = m.div === 'jr', st = plan(l, jr), by = k => st.find(s => s.key === k);
      const ri = i => rules[i] || ['', '', null];
      const ans = jr ? (l.q ? l.X - 50 : l.turns) : null;
      const steps = [];
      const add = (title, html, rect, key) => { const s = key ? by(key) : null; steps.push([title, html, rect, s ? { path: s.path, key } : null]); };
      add(ri(0)[0], ri(0)[1], ri(0)[2]);
      add(ri(1)[0], ri(1)[1], ri(1)[2]);
      add(L('RF Robot 준비', 'RF Robot setup'), P(
        rb(L('수업 도면 <b>robofest27/RF Robot</b>으로 풉니다. 부착물 없이 몸통 앞면으로 밀어서 하는 풀이입니다.', 'Solved with the class file <b>robofest27/RF Robot</b>, pushing with the chassis front (no attachment).')),
        L('· 포트: 왼쪽 바퀴 <b>A</b>, 오른쪽 바퀴 <b>E</b>, 위쪽 모터 C(부착물용 — 이 풀이에서는 안 씀), 컬러 센서 왼쪽 <b>B</b>·오른쪽 <b>D</b>', '· Ports: left wheel <b>A</b>, right wheel <b>E</b>, top motor C (for attachments, unused here), colour sensors left <b>B</b> · right <b>D</b>'),
        L('· 크기: 폭 20cm, 바퀴 축에서 앞 4.4cm · 뒤 7.6cm. 바퀴 지름 56mm, 바퀴 간격 176mm', '· Size: 20 cm wide, 4.4 cm in front of the wheel axle and 7.6 cm behind. Wheel 56 mm, track 176 mm'),
        L('· 좌표: 서쪽 끝에서 x, 북쪽 끝에서 y. 회전은 오른쪽 +, 왼쪽 −. 로봇 중심 = 두 바퀴 가운데', '· Coordinates: x from the west edge, y from the north edge. Turns: right +, left −. Robot centre = between the wheels'),
        L(`· 첫 회전: UTF 시작 방향 북 0 · 동 −90 · 남 180 · 서 90 (이번 UTF: ${DIRN[HEAD[l.ori]][0]}쪽)`, `· First turn: UTF start north 0 · east −90 · south 180 · west 90 (now: ${DIRN[HEAD[l.ori]][1]})`),
        dim(L('아래 코드 상자의 ▶ 여기까지 블록 넣기 = 처음부터 이 단계까지의 블록을 넣습니다. 경기장의 주황 점선이 이 단계의 경로입니다.', '▶ Load blocks up to here (code box below) puts the program from the start to this step into the workspace. The orange dashed line is this step\'s path.'))), null, 'setup');
      add(L('#1 사료 꺼내기 + 위치 맞추기', '#1 Food out + find the position'), P(
        dim(ri(2)[1]),
        rb(L('북쪽으로 y=20cm → 서쪽으로 가다가 <b>오른쪽 센서 D</b>가 디스펜서 앞 검은 선을 보면 멈춤. 이 자리(로봇 중심 x=54.2cm)를 기준으로 삼으면 출발선 X 와 상관없이 다음 경로가 늘 같습니다. 2.6cm 뒤로 가면 로봇 앞 끝이 배출구 아래 점선 자리에 걸치고(받침에는 안 닿음), 6초 동안 사료 10개가 로봇 앞에 떨어집니다 (꺼냄 10점).', 'North to y = 20 cm, then west until the <b>right sensor D</b> sees the black line in front of the dispenser. From this spot (robot centre x = 54.2 cm) the rest of the route is the same whatever X is. Back 2.6 cm: the front edge is over the dotted zone (not touching the base) and the 10 food pieces drop in front within 6 s (10 points).')),
        jr ? '' : L('<b>시니어</b>: 선까지 간 거리 + 54.2cm = 출발선 위치 x(cm) → 변수 x 에 저장해 종료 과제에 씁니다.', '<b>Senior</b>: distance to the line + 54.2 cm = start line x (cm), kept in the variable x for the ending task.'),
        dim(L('그릇에 넣기(10점)는 못 함: 사료가 받침 바로 앞에 떨어져 몸통으로 밀려면 로봇이 받침 위를 지나가야 합니다 → C 모터에 쓸어 담는 부착물이 필요합니다.', 'Not done: into the bowl (10). The food lands right in front of the base, so pushing it with the body would cross the base → needs a sweeper on motor C.'))), [[470, 93, 530, 130], [480, 100, 660, 300]], 'food');
      add(L('#3 강아지 (부분 점수)', '#3 Dog (partial)'), P(
        dim(ri(4)[1]),
        rb(L('강아지 북쪽은 가장자리까지 6cm 뿐이라 로봇(앞 4.4 + 뒤 7.6cm)이 들어가 남쪽으로 밀 수 없습니다. 동쪽에서 서쪽으로 4.3cm 밀어 "움직임" 4점, 우편함 2개는 멀리 돌아가 안 건드려 4점 = 8점.', 'The dog is only 6 cm from the north edge, so the robot (4.4 + 7.6 cm long) cannot get behind it to push it south. Push it 4.3 cm west from the east: "moved" 4, both mailboxes untouched 4 = 8 points.')),
        dim(L('공원까지(10점)는 C 모터 팔로 강아지를 남쪽으로 끌어오는 부착물이 필요합니다.', 'To the park (10) needs an arm on motor C that drags the dog south.'))), [[40, 50, 300, 150], [60, 320, 140, 530]], 'dog');
      add(L('#2 화장실 청소', '#2 Litter box'), P(
        dim(ri(3)[1]),
        rb(L('y=30cm 줄로 동쪽으로 가서(사료·배설물을 건드리지 않음) x=114cm 에서 북쪽을 보고 밀면, 폭 20cm 앞면이 배설물 3개(112~122cm)를 한꺼번에 가장자리 밖 화장실로 밉니다 (9점). 그릇 벽 가까이에서 돌면 걸리므로 y=21.5cm 에서 돕니다.', 'Go east along y = 30 cm (clear of food and debris), face north at x = 114 cm and push: the 20 cm front sweeps all 3 debris (112–122 cm) over the edge into the litter box (9). Turn at y = 21.5 cm so the turn clears the bowl wall.'))), [[1040, 0, 1240, 260]], 'litter');
      add(L('#4 너트 빼기', '#4 Nut'), P(
        dim(ri(5)[1]),
        rb(L('로봇 중심 y=12cm 로 동쪽으로 가면 몸 남쪽 끝(22cm)이 너트(19.7~22.7cm)에는 걸리고 펫토이 받침(23cm~)은 비켜 갑니다. 앞 끝 172.5cm 까지 밀면 너트가 6cm 넘게 움직입니다 (10점).', 'With the robot centre at y = 12 cm going east, the body\'s south side (22 cm) catches the nut (19.7–22.7 cm) and misses the toy base (from 23 cm). Push until the front is at 172.5 cm: the nut moves over 6 cm (10).'))), [[1600, 160, 1760, 360]], 'nut');
      add(L('#5 흰 고양이 → 동물병원', '#5 White cat → Vet'), P(
        dim(ri(6)[1]),
        rb(L('고양이 바로 북쪽에 그릇(지름 15cm 벽)이 있어 로봇이 고양이 위에서 남쪽을 볼 수 없습니다. 그래서 먼저 y=60cm 줄에서 두 고양이를 옆으로 밀어(앞 고양이가 뒤 고양이를 밂) 흰 고양이를 그릇 옆(병원 안)으로 옮긴 다음, 그릇을 돌아 북쪽에서 남쪽으로 밀어 떨어뜨립니다 (10점).', 'The bowl (15 cm wall) sits right north of the cats, so the robot cannot stand above a cat facing south. First push the two cats sideways along y = 60 cm (one pushes the other) so the white cat sits beside the bowl but still over the vet, then go round the bowl and push it south over the edge (10).')),
        l.cats ? L('이번 UTF: 흰 고양이 = b(137cm) → 서쪽에서 동쪽으로 밀어 142.5cm, 그릇 동쪽(x=151.2cm)에서 남쪽으로.', 'This UTF: white = b (137 cm) → push east to 142.5 cm, then south from east of the bowl (x = 151.2 cm).')
          : L('이번 UTF: 흰 고양이 = a(127cm) → 동쪽에서 서쪽으로 밀어 123cm, 그릇 서쪽(x=114cm)에서 남쪽으로.', 'This UTF: white = a (127 cm) → push west to 123 cm, then south from west of the bowl (x = 114 cm).')),
        [[1100, 260, 1620, 750]], 'white');
      add(L('#6 주황 고양이 → 미용실', '#6 Orange cat → Groomer'), P(
        dim(ri(7)[1]),
        rb(L('y=56cm 줄에서 동쪽에서 서쪽으로 주황 고양이를 50cm 까지 밀고(출발선을 건넘), 북쪽(y=45cm)으로 돌아 x=50cm 에서 남쪽으로 밀어 미용실로 떨어뜨립니다 (10점).', 'Push the orange cat west along y = 56 cm to x = 50 cm (across the start line), go round to y = 45 cm and push it south at x = 50 cm into the groomer (10).'))), [[380, 440, 1600, 750]], 'orange');
      add(L('#7 종료 과제', '#7 Ending task'), P(
        dim(ri(8)[1]),
        jr ? rb(L(`동쪽으로 가다가 <b>왼쪽 센서 B</b>가 출발선(검은 선)을 보면 멈춤 → 로봇 앞부분이 출발선 위 (8점). 멈춘 채 답 <b>${ans}</b> 을 화면에 보여 줌 (8점). 주니어는 UTF 를 보고 답을 계산해 숫자로 넣습니다.`, `Drive east until the <b>left sensor B</b> sees the start line → the robot front is over the line (8). Show the answer <b>${ans}</b> while stopped (8). Juniors work out the answer from the UTF and type the number.`))
          : rb(L('미용실에 고양이를 민 뒤 2cm 더 가서 앞 끝을 남쪽 가장자리 밖에 걸치고 멈춤 (8점). #1 에서 잰 x 로 x³ ÷ 100 을 계산해 보여 줌 (8점).', 'After the groomer push, 2 cm more so the front is past the south edge, then stop (8). Show x³ ÷ 100 with the x measured in #1 (8).'))),
        jr ? [[l.X * 10 - 120, 500, l.X * 10 + 30, 700]] : [[420, 600, 580, 750]], 'end');
      add(L('점수 정리', 'Score summary'), P(
        rb(L('예상 점수 (시뮬레이터 간단 모드): #1 꺼냄 10 · #2 9 · #3 움직임 4 + 우편함 4 · #4 10 · #5 10 · #6 10 · #7 16 · #8 로봇 온전 11 = <b>84 / 100</b>, 약 55~60초 (2분 안에 여유 있음).', 'Expected (simulator simple mode): #1 out 10 · #2 9 · #3 moved 4 + mailboxes 4 · #4 10 · #5 10 · #6 10 · #7 16 · #8 intact 11 = <b>84 / 100</b>, about 55–60 s (well inside 2 min).')),
        L('· 더 받으려면 C 모터 부착물: 사료를 쓸어 그릇에 담기(+10), 강아지를 공원으로 끌기(+6)', '· For more, build an attachment on motor C: sweep the food into the bowl (+10), drag the dog to the park (+6)'),
        L('· 실제 로봇은 미끄러짐이 있으므로 검은 선·가장자리를 센서로 찾아 위치를 자주 맞추면 더 안정적입니다', '· A real robot slips, so re-checking the position on black lines and edges with the sensors makes it steadier'),
        dim(ri(9)[1])), null);
      CUR = { st, steps, l, jr, key: m.key };
      return steps;
    } catch (e) { console.warn('rfguide', e); return rules; }
  }

  // ───── 코드 상자 (점수판 아래 — 점수판은 0.12초마다 다시 그려지므로 따로 둠) ─────
  const css = document.createElement('style');
  css.textContent = `#rfCodeBox{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:4px;width:min(92vw,560px);max-width:min(92vw,560px);box-sizing:border-box}
#rfCodeBox pre{margin:0;max-height:min(38vh,320px);overflow:auto;font:11.5px/1.45 ui-monospace,Menlo,Consolas,monospace;background:color-mix(in srgb,var(--fg,#1c2530) 6%,transparent);border-radius:6px;padding:6px 8px;white-space:pre;user-select:text;min-width:0;max-width:100%;box-sizing:border-box}
#rfCodeBox .rfh{display:flex;gap:4px;align-items:center;flex-wrap:wrap;font-size:12px}#rfCodeBox .rfh b{margin-right:auto}`;
  document.head.appendChild(css);
  let box = null, shown = '';
  const mountBox = () => {
    if (box && document.body.contains(box)) return box;
    const sb = document.getElementById('simScoreBox'); if (!sb) return null;
    box = document.createElement('div'); box.className = 'hudbox'; box.id = 'rfCodeBox'; box.hidden = true;
    sb.after(box); return box;
  };
  const stepIdx = () => { const D = window.__umcDebug; return D && D.guide && D.guide.on ? D.guide.i : -1; };
  function cumOps(key) { // 처음부터 key 단계까지
    const out = []; if (!CUR) return out;
    for (const s of CUR.st) { out.push(...s.ops); if (s.key === key) break; }
    return out;
  }
  function render() {
    const b = mountBox(); if (!b) return;
    const m = U.mat && U.mat(), i = stepIdx();
    const s = CUR && m && m.key === CUR.key && i >= 0 ? CUR.steps[i] : null, key = s && s[3] && s[3].key;
    const sig = key ? [key, CUR.key, JSON.stringify(CUR.l), lang(), robotOk()].join('|') : '';
    if (sig === shown) return; shown = sig;
    if (!key) { b.hidden = true; b.innerHTML = ''; return; }
    const st = CUR.st.find(x => x.key === key);
    const code = (key === 'setup' ? HEADER() + '\n' : '') + pyLines(st.ops);
    const warn = robotOk() ? '' : `<div style="color:#d22323;font-size:12px">⚠ ${esc(L('지금 로봇은 RF Robot 과 포트가 다릅니다 (바퀴 A·E, 컬러 센서 B·D). RF Robot 을 불러오세요.', 'The current robot\'s ports differ from the RF Robot (wheels A·E, colour sensors B·D). Open the RF Robot.'))}</div>`;
    b.innerHTML = `<div class="rfh"><b>🐍 ${esc(L('Pybricks 코드 — 이 단계', 'Pybricks code — this step'))}</b>` +
      `<button class="small primary" data-rf="load">▶ ${esc(L('여기까지 블록 넣기', 'Load blocks up to here'))}</button>` +
      `<button class="small" data-rf="copy">📋 ${esc(L('복사', 'Copy'))}</button>` +
      (key === 'setup' ? `<button class="small" data-rf="robot">🤖 ${esc(L('RF Robot 불러오기', 'Open RF Robot'))}</button>` : '') + `</div>${warn}<pre>${esc(code)}</pre>`;
    b.hidden = false;
    b.querySelector('[data-rf="load"]').onclick = () => load(key);
    b.querySelector('[data-rf="copy"]').onclick = () => { try { navigator.clipboard.writeText(code); status(L('코드를 복사했습니다', 'Code copied')); } catch (e) { } };
    const rbt = b.querySelector('[data-rf="robot"]'); if (rbt) rbt.onclick = openRobot;
  }
  const status = msg => { try { window.__cad.ext.status(msg); } catch (e) { console.log(msg); } };
  function robotOk() {
    try {
      const q = U.robot(); if (!q) return false;
      const col = (q.sensors || []).filter(s => s.kind === 'color').map(s => s.port).sort().join('');
      return q.left === 'A' && q.right === 'E' && col === 'BD';
    } catch (e) { return false; }
  }
  function load(key) {
    const WB = window.__wb, B = window.Blockly, ws = WB && WB.ws && WB.ws(); if (!ws || !B) return;
    try { if (window.__cad.ext.simRunning) { status(L('실행 중에는 넣을 수 없습니다', 'Cannot load while the program runs')); return; } } catch (e) { }
    if (ws.getAllBlocks(false).length > 1 && !window.confirm(L('지금 블록을 RF Robot 풀이(처음부터 이 단계까지)로 바꿀까요? (Ctrl+Z 로 되돌리기)', 'Replace the current blocks with the RF Robot solution up to this step? (Ctrl+Z to undo)'))) return;
    const prog = program(cumOps(key));
    B.Events.setGroup(true);
    try { ws.clear(); B.serialization.workspaces.load(prog, ws, { recordUndo: true }); } finally { B.Events.setGroup(false); }
    try { ws.scrollCenter(); } catch (e) { }
    try { WB.save && WB.save(); } catch (e) { }
    status(L('RF Robot 풀이 블록을 넣었습니다 — 📖 설명을 닫고 ▶ 실행', 'Loaded the RF Robot blocks — close 📖 and press ▶ Run'));
  }
  async function openRobot() {
    const C = window.__classes; if (!C || !C.clsOpen) return;
    if (!window.confirm(L('수업 도면 robofest27/RF Robot 을 엽니다. 지금 모델은 ↶ 로 되돌릴 수 있습니다. 열까요?', 'Open the class file robofest27/RF Robot? You can go back to the current model with ↶.'))) return;
    try { await C.clsOpen('robofest27/RF Robot (1).ldr'); } catch (e) { status(String(e.message || e)); }
  }
  setInterval(render, 300);

  window.__rfGuide = { wrap, plan, program, pyLines, load, cumOps, robotOk, get cur() { return CUR; } };
})();
