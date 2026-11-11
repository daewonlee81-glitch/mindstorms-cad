// umc.js — UMC 미지 미션 챌린지 경기장 5종 (주니어·시니어)
//   · 로봇 시뮬레이터의 경기장 목록에 "UMC 미지 미션 챌린지" 묶음을 추가합니다.
//   · 경기장을 고를 때마다, 그리고 점수판의 "새 배치" 버튼을 누를 때마다 배치가 무작위로 바뀝니다.
//   · 점수판에 과제·실시간 자동 채점·남은 시간(런당 2분)을 보여 줍니다.
//   · app.js 에는 window.__umc 훅 한 곳만 들어 있습니다. app.js 를 다시 빌드하면 이 훅을 다시 넣어야 합니다:
//       window.__umc={mats:uo,api:Wn,T:T,esc:ce,i18n:pr,pose:()=>Te,props:()=>Xe,time:()=>vt,hub:()=>We,sim:()=>q,robot:()=>Q,mat:()=>Nt};
//     (uo=경기장 표, Wn=시뮬레이터 API, pr=번역 표, Te=로봇 위치, Xe=물체, vt=시뮬레이션 시간, We=허브 화면, q=시뮬레이터 상태, Q=로봇, Nt=현재 경기장)
//   · 규정 기준: UMC 미지 미션 챌린지 운영 매뉴얼. 단위는 mm (캔버스 1px = 1mm).
(() => {
  'use strict';
  const U = window.__umc;
  if (!U || !U.mats) return;
  const lang = () => { try { return window.__wb.lang(); } catch { return 'ko'; } };
  const L = (ko, en) => (lang() === 'ko' ? ko : en);
  const esc = U.esc || (s => String(s));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const BG = '#fbfbf8', INK = '#141418', ZONE = '#9fb4d8', GREY = '#aab3c0';
  const COL = { R: ['빨강', 'red', '#d22323', 0xd22323], B: ['파랑', 'blue', '#1e5ac8', 0x1e5ac8], Y: ['노랑', 'yellow', '#facd14', 0xfacd14], G: ['초록', 'green', '#0a9646', 0x0a9646] };
  const ORDER = ['R', 'B', 'Y', 'G'];
  const LIMIT = 120;

  // ───── 번역 (경기장 목록 이름) ─────
  const NAMES = {
    'UMC 미지 미션 챌린지': ['UMC Unknown Mission Challenge', 'UMC 未知ミッションチャレンジ', 'UMC 未知任务挑战', 'UMC Desafío de misión desconocida'],
    'UMC 1 · 바코드 내비게이터': ['UMC 1 · Barcode Navigator', 'UMC 1 · バーコードナビゲーター', 'UMC 1 · 条码导航', 'UMC 1 · Navegador de código de barras'],
    'UMC 2 · 사다리 세기': ['UMC 2 · Line Counter', 'UMC 2 · ラインカウンター', 'UMC 2 · 数横线', 'UMC 2 · Contador de líneas'],
    'UMC 3 · 컵 밀기': ['UMC 3 · Cup Clear', 'UMC 3 · カップ押し出し', 'UMC 3 · 推杯子', 'UMC 3 · Despejar vasos'],
    'UMC 4 · 도형 탐정': ['UMC 4 · Shape Detective', 'UMC 4 · 図形探偵', 'UMC 4 · 图形侦探', 'UMC 4 · Detective de figuras'],
    'UMC 5 · 10cm 앞에 서기': ['UMC 5 · Stop at 10 cm', 'UMC 5 · 10cm手前で停止', 'UMC 5 · 停在10厘米前', 'UMC 5 · Parar a 10 cm'],
  };
  const DIVN = { jr: ['주니어', 'Junior', 'ジュニア', '初级', 'Júnior'], sr: ['시니어', 'Senior', 'シニア', '高级', 'Sénior'] };
  for (const k of Object.keys(NAMES)) {
    if (U.i18n) U.i18n[k] = NAMES[k];
    for (const d of ['jr', 'sr']) if (U.i18n && k !== 'UMC 미지 미션 챌린지') U.i18n[k + ' (' + DIVN[d][0] + ')'] = NAMES[k].map((n, i) => n + ' (' + DIVN[d][i + 1] + ')');
  }

  // ───── 런 추적 ─────
  let R = null;
  const newRun = () => ({ t: -1, beeps: 0, writes: [], left: false, stillSince: 0, px: null, pz: null, pth: null, ended: false, frozen: null, x: {} });
  let depth = 0; // wbBeep 이 beep 를 다시 부르는 경우 두 번 세지 않도록
  const wrap = (name, fn) => {
    const o = U.api && U.api[name];
    if (typeof o !== 'function') return;
    U.api[name] = function (...a) {
      try { if (!depth && cur() && R && !R.frozen && !R.ended) fn(...a); } catch { }
      depth++; try { return o.apply(this, a); } finally { depth--; }
    };
  };
  for (const n of ['beep', 'wbBeep']) wrap(n, () => { R.beeps++; });
  for (const n of ['write', 'wbNumber', 'wbText']) wrap(n, v => { R.writes.push(String(v).trim()); });
  const cur = () => { const m = U.mat(); return m && m.umc ? m : null; };
  const num = s => { const v = parseFloat(s); return Number.isFinite(v) ? v : NaN; };
  const lastW = (i = 1) => (R.writes.length >= i ? num(R.writes[R.writes.length - i]) : NaN);
  const half = () => { const q = U.robot(); return (q && q.half) || { x0: -70, x1: 70, z0: -90, z1: 90 }; };
  const corners = () => {
    const p = U.pose(), h = half(), s = Math.sin(p.th), c = Math.cos(p.th);
    return [[h.x0, h.z0], [h.x1, h.z0], [h.x1, h.z1], [h.x0, h.z1]].map(([a, l]) => [p.x + a * c + l * s, p.z - a * s + l * c]);
  };
  const inRect = (pt, r) => pt[0] >= r[0] && pt[0] <= r[2] && pt[1] >= r[1] && pt[1] <= r[3];
  const overlapsRect = r => { // 로봇 일부가 사각형 위에 있는가
    const cs = corners(), p = U.pose();
    if (cs.some(c => inRect(c, r)) || inRect([p.x, p.z], r)) return true;
    const xs = cs.map(c => c[0]), zs = cs.map(c => c[1]);
    return Math.min(...xs) <= r[2] && Math.max(...xs) >= r[0] && Math.min(...zs) <= r[3] && Math.max(...zs) >= r[1] && inRect([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]);
  };
  const clearOfRect = r => corners().every(c => !inRect(c, r)) && !inRect([U.pose().x, U.pose().z], r);
  function track(mat) {
    const t = U.time(), p = U.pose(), sim = U.sim();
    if (!R || t < R.t - 1e-6 || R.mat !== mat) { R = newRun(); R.el = 0; R.mat = mat; R.px = p.x; R.pz = p.z; R.pth = p.th; }
    if (R.frozen) return;
    if (R.px == null || Math.hypot(p.x - R.px, p.z - R.pz) > 0.3 || Math.abs(p.th - R.pth) > 0.003) { R.stillSince = t; R.px = p.x; R.pz = p.z; R.pth = p.th; }
    R.t = t;
    const running = !!(sim && sim.running && !sim.running.stopped);
    if (running && !R.started) { R.started = true; R.t0 = t; R.stillSince = t; }
    if (R.started && !running && !R.ended) { R.ended = true; R.tEnd = t; }
    if (running && R.ended) { R = null; return track(mat); } // 다시 실행 = 새 런
    R.el = !R.started ? 0 : (R.ended ? R.tEnd : t) - R.t0;
    R.still = t - R.stillSince;
  }
  const stopped = sec => R.ended || R.still >= sec;

  // ───── 점수판 ─────
  function panel(mat, items, extra) {
    let total = 0;
    const rows = items.map(([label, pts, got]) => {
      const g = Math.max(-999, got || 0); total += g;
      const mark = g > 0 ? '✔' : g < 0 ? '✖' : '·', colr = g > 0 ? '#12805c' : g < 0 ? '#d22323' : '#8a94a3';
      return `<span style="color:${colr}">${mark} ${esc(label)} <b>${g > 0 ? '+' : ''}${g}</b><span style="color:#8a94a3"> / ${pts}</span></span>`;
    });
    total = Math.max(0, total);
    const over = R.el >= LIMIT;
    const left = Math.max(0, LIMIT - R.el), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0');
    const html = `<div style="display:block;line-height:1.45;max-width:440px"><b>${esc(U.T(mat.label))}</b> ` +
      `<button class="small" style="margin-left:6px" onpointerdown="window.__umcNew&&window.__umcNew()">🎲 ${esc(L('새 배치', 'New layout'))}</button><br>` +
      `<span style="font-weight:400">${esc(mat.task())}</span><br>` +
      `<span style="font-weight:400">${rows.join('<br>')}</span><br>` +
      `<b>${esc(L('합계', 'Total'))} ${total} / ${mat.max}</b> · <span style="font-weight:400;color:${over ? '#d22323' : '#5b6878'}">${over ? esc(L('시간 초과 (2분)', 'Time up (2 min)')) : esc(L('남은 시간', 'Time left')) + ' ' + mm + ':' + ss}</span>` +
      (extra ? `<br><span style="font-weight:400;color:#8a5a00">${extra}</span>` : '') + `</div>`;
    if (over) R.frozen = html;
    return html;
  }
  const guard = (mat, fn) => function () { try { track(mat); if (R.frozen) return R.frozen; return fn(); } catch (e) { return ''; } };

  // ───── 그리기 도우미 ─────
  const bg = (c, w, h) => { c.fillStyle = BG; c.fillRect(0, 0, w, h); };
  const zoneBox = (c, x, y, s = 250) => { c.strokeStyle = ZONE; c.lineWidth = 6; c.strokeRect(x + 3, y + 3, s - 6, s - 6); c.fillStyle = ZONE; c.font = 'bold 30px sans-serif'; c.fillText('START', x + 14, y + 40); };
  const laneStart = w => ({ get x() { return -w / 2 + 250 - half().z1; }, z: 0, th: Math.PI / 2 });
  const laneZone = w => [-w / 2, -125, -w / 2 + 250, 125];
  const xs = (w, x) => x + w / 2 - 250; // 출발선 기준 거리(mm)

  // ───── 배치 (미션마다 주니어·시니어가 같은 배치를 함께 씀) ─────
  const LAY = {};
  const GEN = {
    1: () => ({ value: ri(1, 15) }),
    2: () => {
      for (let k = 0; k < 500; k++) {
        const n = ri(3, 7), g = []; for (let i = 0; i < n - 1; i++) g.push(ri(8, 30));
        const s = g.slice().sort((a, b) => b - a); if (s[0] - s[1] < 3) continue;
        const sum = g.reduce((a, b) => a + b, 0); if (sum > 135) continue;
        const pos = [ri(30, 165 - sum)]; g.forEach(x => pos.push(pos[pos.length - 1] + x)); return { pos };
      }
      return { pos: [40, 55, 85, 100] };
    },
    3: () => ({ pos: shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4), colors: shuffle(ORDER) }),
    4: () => {
      const ok = p => {
        const n = p.length;
        for (let i = 0; i < n; i++) {
          const a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len < 30 || len > 50) return false;
          if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) return false;
          const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
          const ang = Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))) * 180 / Math.PI;
          if (ang < 45 || ang > 135) return false;
        }
        return true;
      };
      for (let k = 0; k < 20000; k++) {
        const n = ri(3, 5), rot = Math.random() * Math.PI * 2, p = [];
        for (let i = 0; i < n; i++) { const th = rot + (i + (Math.random() - .5) * .5) * 2 * Math.PI / n, r = 18 + Math.random() * 22; p.push([Math.round(75 + r * Math.cos(th)), Math.round(75 + r * Math.sin(th))]); }
        if (ok(p)) return { pts: p };
      }
      return { pts: [[55, 55], [95, 55], [95, 95], [55, 95]] };
    },
    5: () => { const a = ri(1, 6), b = ri(1, 6); return { D: 40 + 15 * a + (b - 1) }; },
  };
  const lay = n => LAY[n] || (LAY[n] = GEN[n]());

  // ───── 미션 1 · 바코드 내비게이터 ─────
  function m1(div) {
    const jr = div === 'jr', w = jr ? 1350 : 2450, h = 600, nz = jr ? 4 : 15;
    const mat = {
      umc: 1, div, w, h, max: jr ? 50 : 60, start: laneStart(w),
      task: () => jr ? L('검은 칸의 개수(1~4)를 세어 그 번호 구역에 정지하고, 개수만큼 삐 소리 내기', 'Count the black cells (1–4), stop in that numbered zone and beep that many times')
        : L('4칸 이진수(첫 칸 = 8)를 10진수로 바꿔 그 번호 구역(1~15)에 정지하고 화면에 숫자 보여주기', 'Convert the 4-bit code (first cell = 8) to decimal, stop in that zone (1–15) and show the number'),
      draw(c) {
        const v = lay(1).value, bits = v.toString(2).padStart(4, '0');
        bg(c, w, h); zoneBox(c, 0, 175);
        c.fillStyle = INK; c.fillRect(250 + 230, 0, 20, h);
        for (let i = 0; i < 4; i++) { c.fillStyle = bits[i] === '1' ? INK : '#ffffff'; c.fillRect(250 + 300 + 50 * i, 200, 50, 200); }
        c.strokeStyle = GREY; c.lineWidth = 2; c.strokeRect(250 + 300, 200, 200, 200);
        c.fillStyle = GREY; c.font = 'bold 34px sans-serif'; c.textAlign = 'center';
        for (let n = 0; n <= nz; n++) { const x = 250 + 600 + 100 * n; c.fillRect(x - 2, 0, 4, 40); c.fillRect(x - 2, h - 40, 4, 40); if (n < nz) { c.fillText(String(n + 1), x + 50, 36); c.fillText(String(n + 1), x + 50, h - 10); } }
        c.textAlign = 'left';
      },
    };
    mat.info = guard(mat, () => {
      const v = lay(1).value, ones = v.toString(2).split('1').length - 1, ans = jr ? ones : v, p = U.pose(), d = xs(w, p.x);
      if (clearOfRect(laneZone(w))) R.left = true;
      if (d - half().z1 >= 500 || d + half().z0 >= 500) R.x.pass = true;
      const z = Math.floor((d - 600) / 100) + 1, stop = stopped(3) && R.left;
      const rep = jr ? R.beeps === ones : lastW() === v;
      const zp = jr ? 20 : 25, zg = !stop ? 0 : z === ans ? zp : Math.abs(z - ans) === 1 ? 10 : 0;
      return panel(mat, [
        [L('출발 구역을 벗어남', 'Left the start zone'), 5, R.left ? 5 : 0],
        [L('바코드를 끝까지 통과', 'Passed the whole barcode'), 5, R.x.pass ? 5 : 0],
        [jr ? L('삐 소리 횟수 정답', 'Correct number of beeps') + ` (${R.beeps})` : L('화면 숫자 정답', 'Correct number shown'), jr ? 20 : 25, rep ? (jr ? 20 : 25) : 0],
        [L('올바른 구역에 정지 (옆 구역 10점)', 'Stopped in the right zone (10 if adjacent)') + (stop && z >= 1 ? ` [${z}]` : ''), zp, zg],
      ], R.ended ? L('정답', 'Answer') + ': ' + ans : '');
    });
    return mat;
  }

  // ───── 미션 2 · 사다리 세기 ─────
  function m2(div) {
    const jr = div === 'jr', w = 2250, h = 600;
    const mat = {
      umc: 2, div, w, h, max: jr ? 50 : 70, start: laneStart(w),
      task: () => jr ? L('가로선의 개수를 세고, 도착 띠에 정지해 개수를 화면에 보여주기', 'Count the cross lines, stop on the finish band and show the count')
        : L('도착 띠에 정지해 ① 가로선 개수 ② 가장 넓은 간격의 순번 ③ 그 길이(cm)를 차례로 화면에 보여주기', 'Stop on the finish band, then show ① line count ② index of the widest gap ③ its length (cm), in that order'),
      draw(c) {
        bg(c, w, h); zoneBox(c, 0, 175); c.fillStyle = INK;
        for (const p of lay(2).pos) c.fillRect(250 + p * 10 - 10, 100, 20, 400);
        c.fillRect(250 + 1800, 0, 100, h);
      },
    };
    mat.info = guard(mat, () => {
      const pos = lay(2).pos, n = pos.length, g = []; for (let i = 1; i < n; i++) g.push(pos[i] - pos[i - 1]);
      const mx = Math.max(...g), idx = g.indexOf(mx) + 1, d = xs(w, U.pose().x);
      if (clearOfRect(laneZone(w))) R.left = true;
      const fin = stopped(1) && d >= 1800 && d <= 1900;
      const items = [];
      if (jr) items.push([L('출발 구역을 벗어남', 'Left the start zone'), 5, R.left ? 5 : 0]);
      items.push([L('도착 띠에 정지', 'Stopped on the finish band'), jr ? 15 : 10, fin ? (jr ? 15 : 10) : 0]);
      if (jr) { const a = lastW(); items.push([L('개수 정답 (±1은 10점)', 'Correct count (10 if off by 1)'), 30, a === n ? 30 : Math.abs(a - n) === 1 ? 10 : 0]); }
      else {
        const ok3 = R.writes.length >= 3, a = ok3 ? lastW(3) : lastW(), b = ok3 ? lastW(2) : NaN, cc = ok3 ? lastW(1) : NaN;
        items.push([L('개수 정답 (±1은 5점)', 'Correct count (5 if off by 1)'), 20, a === n ? 20 : Math.abs(a - n) === 1 ? 5 : 0]);
        items.push([L('가장 넓은 간격의 순번 정답', 'Correct index of the widest gap'), 20, b === idx ? 20 : 0]);
        items.push([L('간격 길이 ±1cm (±2cm는 10점)', 'Gap length within ±1 cm (10 if ±2 cm)'), 20, Math.abs(cc - mx) <= 1 ? 20 : Math.abs(cc - mx) <= 2 ? 10 : 0]);
      }
      return panel(mat, items, R.ended ? L('정답', 'Answer') + ': ' + (jr ? n : `${n}, ${idx}, ${mx}cm`) : '');
    });
    return mat;
  }

  // ───── 미션 3 · 컵 밀기 ─────
  const CUP8 = [[10, 22], [10, 50], [10, 78], [30, 80], [60, 80], [80, 78], [80, 50], [80, 22]]; // cm, 원점 = 출발 변의 왼쪽 끝
  const cupXZ = i => [CUP8[i][0] * 10 - 450, 450 - CUP8[i][1] * 10];
  function m3(div) {
    const jr = div === 'jr', w = 1100, h = 1100, nc = jr ? 3 : 4, zone = [-125, 190, 125, 440];
    const mat = {
      umc: 3, div, w, h, max: jr ? 60 : 100, start: { x: 0, z: 315, th: Math.PI },
      task: () => jr ? L('컵 3개를 모두 검은 경계선 밖으로 밀어내고 출발 구역으로 돌아오기', 'Push all 3 cups outside the black boundary and return to the start zone')
        : L('컵 4개를 빨강 → 파랑 → 노랑 → 초록 카드 순서로 밀어내고 돌아와, 밀어낸 개수를 화면에 보여주기', 'Push the 4 cups out in the order red → blue → yellow → green, return, and show how many you removed'),
      draw(c) {
        const l = lay(3);
        bg(c, w, h);
        if (!jr) l.pos.forEach((pi, i) => { const [x, z] = cupXZ(pi), dl = Math.hypot(x, z), qx = x - x / dl * 125, qz = z - z / dl * 125; c.fillStyle = COL[l.colors[i]][2]; c.fillRect(qx + 550 - 50, qz + 550 - 50, 100, 100); });
        c.strokeStyle = INK; c.lineWidth = 20; c.strokeRect(100, 100, 900, 900);
        zoneBox(c, 425, 740);
      },
      props() {
        const l = lay(3);
        return l.pos.slice(0, nc).map((pi, i) => { const [x, z] = cupXZ(pi); return { kind: 'cup', shape: 'cyl', r: 35, hgt: 85, mass: .008, color: 0xe6d9bd, band: jr ? 0x8a94a3 : COL[l.colors[i]][3], x, z, tag: jr ? '' : l.colors[i] }; });
      },
    };
    mat.info = guard(mat, () => {
      const cups = U.props().filter(p => p.kind === 'cup');
      R.x.out = R.x.out || [];
      for (const c of cups) if (!c._umcOut && (Math.abs(c.x) > 460 + c.r || Math.abs(c.z) > 460 + c.r)) { c._umcOut = true; R.x.out.push(c.tag); }
      if (clearOfRect(zone)) R.left = true;
      const out = R.x.out.length, home = R.left && stopped(1) && overlapsRect(zone);
      const robotOut = corners().every(c => Math.abs(c[0]) > 460 || Math.abs(c[1]) > 460);
      const items = [];
      if (jr) items.push([L('출발 구역을 벗어남', 'Left the start zone'), 5, R.left ? 5 : 0]);
      items.push([L('컵 제거', 'Cups removed') + ` (${out}/${nc})`, (jr ? 15 : 10) * nc, out * (jr ? 15 : 10)]);
      if (!jr) { let ord = 0; R.x.out.forEach((t, k) => { if (t === ORDER[k]) ord++; }); items.push([L('올바른 순서로 제거', 'Removed in the right order') + ` (${ord})`, 40, ord * 10]); }
      items.push([L('출발 구역 복귀 후 정지', 'Returned to the start zone and stopped'), 10, home ? 10 : 0]);
      if (!jr) items.push([L('제거한 컵 개수 화면 표시', 'Showed the number of cups removed'), 10, out > 0 && lastW() === out ? 10 : 0]);
      return panel(mat, items, robotOut ? L('로봇이 경계선 밖으로 나갔습니다 (실제 대회에서는 런 종료)', 'The robot left the boundary (run ends in a real event)') : '');
    });
    return mat;
  }

  // ───── 미션 4 · 도형 탐정 ─────
  function m4(div) {
    const jr = div === 'jr', w = 1500, h = 1500;
    const geo = () => {
      const P = lay(4).pts.map(([x, y]) => [x * 10 - 750, 750 - y * 10]), n = P.length, len = [], cum = [0];
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; len.push(Math.hypot(b[0] - a[0], b[1] - a[1])); cum.push(cum[i] + len[i]); }
      return { P, n, len, cum, per: cum[n] };
    };
    const project = (g, x, z) => {
      let best = { d: 1e9, s: 0 };
      for (let i = 0; i < g.n; i++) { const a = g.P[i], b = g.P[(i + 1) % g.n], ux = (b[0] - a[0]) / g.len[i], uz = (b[1] - a[1]) / g.len[i]; const t = Math.max(0, Math.min(g.len[i], (x - a[0]) * ux + (z - a[1]) * uz)); const d = Math.hypot(x - a[0] - ux * t, z - a[1] - uz * t); if (d < best.d) best = { d, s: g.cum[i] + t }; }
      return best;
    };
    const mat = {
      umc: 4, div, w, h, max: jr ? 50 : 70,
      get start() { const g = geo(), a = g.P[0], b = g.P[1]; return { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, th: Math.atan2(b[0] - a[0], b[1] - a[1]) }; },
      task: () => jr ? L('라인을 따라 도형을 한 바퀴 돌고 출발 표시 근처에 정지해, 꼭짓점 수만큼 삐 소리 내기', 'Follow the line once around the shape, stop near the start mark and beep once per corner')
        : L('도형을 한 바퀴 돌고 정지해, 꼭짓점 수와 둘레(cm)를 차례로 화면에 보여주기', 'Go once around the shape, stop, then show the number of corners and the perimeter (cm)'),
      draw(c) {
        const g = geo(); bg(c, w, h);
        c.strokeStyle = INK; c.lineWidth = 20; c.lineJoin = 'miter'; c.beginPath();
        g.P.forEach((p, i) => (i ? c.lineTo(p[0] + 750, p[1] + 750) : c.moveTo(p[0] + 750, p[1] + 750))); c.closePath(); c.stroke();
        const a = g.P[0], b = g.P[1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, ux = (b[0] - a[0]) / g.len[0], uz = (b[1] - a[1]) / g.len[0];
        let nx = -uz, nz = ux; const cx = g.P.reduce((s, p) => s + p[0], 0) / g.n, cz = g.P.reduce((s, p) => s + p[1], 0) / g.n;
        if ((mx + nx * 10 - cx) ** 2 + (mz + nz * 10 - cz) ** 2 < (mx - cx) ** 2 + (mz - cz) ** 2) { nx = -nx; nz = -nz; }
        c.beginPath(); c.moveTo(mx + 750, mz + 750); c.lineTo(mx + nx * 60 + 750, mz + nz * 60 + 750); c.stroke();
      },
    };
    mat.info = guard(mat, () => {
      const g = geo(), p = U.pose(), pr = project(g, p.x, p.z), s0 = g.len[0] / 2;
      if (R.x.s == null) { R.x.s = s0; R.x.prog = 0; }
      let ds = pr.s - R.x.s; if (ds > g.per / 2) ds -= g.per; if (ds < -g.per / 2) ds += g.per;
      if (pr.d <= 150) R.x.prog += ds;
      R.x.s = pr.s;
      if (R.x.prog >= g.len[0] / 2 + 20) R.x.v1 = true;
      if (R.x.prog >= g.per - 110) R.x.lap = true; // 로봇 앞부분이 출발 표시에 다시 닿으면 완주
      let off = pr.s - s0; if (off > g.per / 2) off -= g.per; if (off < -g.per / 2) off += g.per;
      const stop = R.x.lap && stopped(1) && Math.abs(off) <= 300 && pr.d <= 150;
      const items = [
        [L('첫 꼭짓점 통과', 'Passed the first corner'), 5, R.x.v1 ? 5 : 0],
        [L('한 바퀴 완주', 'Completed one lap') + ` (${Math.max(0, Math.min(100, Math.round(R.x.prog / g.per * 100)))}%)`, 15, R.x.lap ? 15 : 0],
        [L('출발 표시 근처에 정지', 'Stopped near the start mark'), 10, stop ? 10 : 0],
      ];
      if (jr) items.push([L('꼭짓점 수만큼 삐 소리', 'Beeps equal the number of corners') + ` (${R.beeps})`, 20, R.beeps === g.n ? 20 : 0]);
      else {
        const two = R.writes.length >= 2, a = two ? lastW(2) : lastW(), b = two ? lastW(1) : NaN, e = Math.abs(b - g.per / 10);
        items.push([L('꼭짓점 수 화면 표시', 'Showed the number of corners'), 20, a === g.n ? 20 : 0]);
        items.push([L('둘레 ±5cm (±10cm는 10점)', 'Perimeter within ±5 cm (10 if ±10 cm)'), 20, e <= 5 ? 20 : e <= 10 ? 10 : 0]);
      }
      return panel(mat, items, R.ended ? L('정답', 'Answer') + ': ' + g.n + (jr ? '' : ', ' + Math.round(g.per / 10) + 'cm') : '');
    });
    return mat;
  }

  // ───── 미션 5 · 정확히 10cm 앞에 서기 ─────
  function m5(div) {
    const jr = div === 'jr', w = 2250, h = 600;
    const mat = {
      umc: 5, div, w, h, max: jr ? 40 : 70, start: laneStart(w),
      get walls() { const D = lay(5).D * 10; return [[-w / 2 + 250 + D + 100, 0, 200, 360, 200, 0xd9b98a]]; },
      task: () => jr ? L('상자 앞 정확히 10cm에 정지하고 삐 소리 1번 내기 (거리는 매번 다름)', 'Stop exactly 10 cm in front of the box and beep once (the distance changes every time)')
        : L('상자 앞 10cm에 3초 정지하며 출발선~상자 거리(cm)를 화면에 보여주고, 출발 구역으로 돌아오기', 'Stop 10 cm from the box for 3 s while showing the start-line-to-box distance (cm), then return to the start zone'),
      draw(c) { bg(c, w, h); zoneBox(c, 0, 175); c.fillStyle = ZONE; c.fillRect(248, 0, 4, h); },
    };
    mat.info = guard(mat, () => {
      const D = lay(5).D * 10, p = U.pose(), gap = D - (xs(w, p.x) + half().z1);
      if (clearOfRect(laneZone(w))) R.left = true;
      // 시니어: 3초 정지 중의 거리를 잽니다 (점수판이 0.5초 간격으로 확인하므로 2.4초 이상 멈추면 인정).
      if (jr ? (R.left && (R.ended || R.still >= 1)) : (R.left && R.still >= 2.4 && xs(w, p.x) > 150)) R.x.gap = gap;
      const e = R.x.gap == null ? 99 : Math.abs(R.x.gap - 100) / 10, acc = e <= 1.05 ? 30 : e <= 2.05 ? 20 : e <= 4.05 ? 10 : 0;
      const items = [[L('출발 구역을 벗어남', 'Left the start zone'), 5, R.left ? 5 : 0],
      [L('정지 거리 10cm (±1/±2/±4cm)', 'Stop distance 10 cm (±1/±2/±4 cm)') + (R.x.gap != null ? ` [${(R.x.gap / 10).toFixed(1)}cm]` : ''), 30, acc]];
      if (jr) items.push([L('정지 후 삐 소리 1번', 'One beep after stopping') + ` (${R.beeps})`, 5, R.x.gap != null && R.beeps === 1 ? 5 : 0]);
      else {
        const de = Math.abs(lastW() - D / 10);
        items.push([L('거리 D 화면 표시 ±2cm (±4cm는 10점)', 'Distance D shown within ±2 cm (10 if ±4 cm)'), 20, de <= 2 ? 20 : de <= 4 ? 10 : 0]);
        items.push([L('출발 구역 복귀 후 정지', 'Returned to the start zone and stopped'), 15, R.x.gap != null && stopped(1) && overlapsRect(laneZone(w)) && xs(w, p.x) < 150 ? 15 : 0]);
      }
      return panel(mat, items, R.ended ? L('정답', 'Answer') + ': D = ' + D / 10 + 'cm' : '');
    });
    return mat;
  }

  // ───── 등록 ─────
  const MAKE = { 1: m1, 2: m2, 3: m3, 4: m4, 5: m5 };
  const TITLES = ['UMC 1 · 바코드 내비게이터', 'UMC 2 · 사다리 세기', 'UMC 3 · 컵 밀기', 'UMC 4 · 도형 탐정', 'UMC 5 · 10cm 앞에 서기'];
  const list = [];
  for (let n = 1; n <= 5; n++) for (const d of ['jr', 'sr']) {
    const key = `umc${n}_${d}`, mat = MAKE[n](d);
    mat.label = TITLES[n - 1] + ' (' + DIVN[d][0] + ')'; mat.key = key;
    U.mats[key] = mat; list.push([key, mat.label]);
  }
  const sel = document.querySelector('#simMat');
  if (sel && !sel.querySelector('[value="umc1_jr"]')) {
    const og = document.createElement('optgroup'); og.dataset.ko = 'UMC 미지 미션 챌린지'; og.label = U.T(og.dataset.ko);
    for (const [key, label] of list) { const o = document.createElement('option'); o.value = key; o.dataset.ko = label; o.textContent = U.T(label); og.appendChild(o); }
    sel.insertBefore(og, sel.querySelector('option[value="image"]'));
  }
  // 새 배치: 현재 미션의 배치를 버리고 경기장을 다시 불러옵니다 (프로그램은 멈춥니다).
  window.__umcNew = () => {
    const m = cur(); if (!m || !sel) return;
    delete LAY[m.umc]; R = null; sel.value = m.key;
    if (typeof sel.onchange === 'function') sel.onchange({ target: sel });
  };
  // 경기장을 고를 때마다 새 배치
  if (sel) sel.addEventListener('change', e => { const m = U.mats[e.target.value]; if (m && m.umc) { delete LAY[m.umc]; R = null; } }, true);
  window.__umcDebug = { lay, LAY, run: () => R };
})();
