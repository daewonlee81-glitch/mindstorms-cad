// umc.js — UMC 미지 미션 챌린지 경기장 5종 + Robofest 2027 Game(RoboPetCare) 경기장 (주니어·시니어)
//   · 로봇 시뮬레이터의 경기장 목록에 "UMC 미지 미션 챌린지" 묶음을 추가합니다.
//   · 경기장을 고를 때마다, 그리고 점수판의 "새 배치" 버튼을 누를 때마다 배치가 무작위로 바뀝니다.
//   · 점수판에 과제·실시간 자동 채점·남은 시간(런당 2분)을 보여 줍니다.
//   · app.js 에는 window.__umc 훅 한 곳만 들어 있습니다. app.js 를 다시 빌드하면 이 훅을 다시 넣어야 합니다:
//       window.__umc={mats:uo,api:Wn,T:T,esc:ce,i18n:pr,pose:()=>Te,props:()=>Xe,time:()=>vt,hub:()=>We,sim:()=>q,robot:()=>Q,mat:()=>Nt,cam:()=>wi,ctl:()=>Mi};
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
  const TW = 1820, TH = 750, TABLE = { raise: 45, side: 0x8d8f94 }; // Robofest Game 과 같은 182×75cm 테이블
  const BG = '#e9e9e6', INK = '#141418', ZONE = '#9fb4d8', GREY = '#aab3c0';
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
  const fell = () => { const q = U.sim(); return !!(q && q.fell); };

  // ───── 점수판 ─────
  function panel(mat, items, extra) {
    let total = 0;
    const rows = items.map(([label, pts, got]) => {
      const g = Math.max(-999, got || 0); total += g;
      const mark = g > 0 ? '✔' : g < 0 ? '✖' : '·', colr = g > 0 ? '#12805c' : g < 0 ? '#d22323' : '#8a94a3';
      return `<span style="color:${colr}">${mark} ${esc(label)} <b>${g > 0 ? '+' : ''}${g}</b><span style="color:#8a94a3"> / ${pts}</span></span>`;
    });
    total = Math.max(0, total);
    R.total = total; // 자동 학습이 읽는 점수
    const over = R.el >= LIMIT;
    const left = Math.max(0, LIMIT - R.el), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0');
    const html = `<div style="display:block;line-height:${mat.compact ? 1.3 : 1.45};max-width:${mat.compact ? 620 : 440}px;${mat.compact ? 'font-size:12px' : ''}"><b>${esc(U.T(mat.label))}</b> ` +
      `<button class="small" style="margin-left:6px" onpointerdown="window.__umcNew&&window.__umcNew()">🎲 ${esc(L('새 배치', 'New layout'))}</button>` +
      `<button class="small" style="margin-left:4px" onpointerdown="window.__umcGuide&&window.__umcGuide('on')">📖 ${esc(L('단계별 설명', 'Step-by-step'))}</button><br>` +
      `<span style="font-weight:400">${esc(mat.task())}</span><br>` +
      (mat.head ? `<span style="font-weight:400;color:#3d8bfd">${mat.head()}</span><br>` : '') +
      `<span style="font-weight:400">${mat.compact ? rows.reduce((o, r, i) => o + (i ? (i % 2 ? ' &nbsp;' : '<br>') : '') + r, '') : rows.join('<br>')}</span><br>` +
      `<b>${esc(L('합계', 'Total'))} ${total} / ${mat.max}</b> · <span style="font-weight:400;color:${over ? '#d22323' : '#8a94a3'}">${over ? esc(L('시간 초과 (2분)', 'Time up (2 min)')) : esc(L('남은 시간', 'Time left')) + ' ' + mm + ':' + ss}</span>` +
      (extra ? `<br><span style="font-weight:400;color:#c98a1a">${extra}</span>` : '') +
      (fell() && !mat.compact ? `<br><span style="font-weight:400;color:#d22323">${esc(L('로봇이 테이블에서 떨어졌습니다 (실제 대회에서는 런 종료)', 'The robot fell off the table (the run ends in a real event)'))}</span>` : '') + `</div>`;
    if (over) R.frozen = html;
    return html;
  }
  const guard = (mat, fn) => function () { try { if (GUIDE.on) return guideHTML(mat); track(mat); if (R.frozen) return R.frozen; return fn(); } catch (e) { return ''; } };

  // ───── 단계별 설명 ─────
  // 📖 단계별 설명을 누르면 점수판 자리에 미션 설명이 한 단계씩 나오고, 그 단계가 가리키는 곳이 경기장에 노랗게 표시됩니다.
  // 설명 중에는 경기장을 다시 그리므로 프로그램이 멈춥니다(배치는 그대로). 닫으면 표시가 사라집니다.
  const GUIDE = { on: false, i: 0 };
  const stepsOf = mat => { try { return (STEPS[mat.umc] || (() => []))(mat); } catch { return []; } };
  function guideHTML(mat) {
    const st = stepsOf(mat), n = st.length, i = Math.max(0, Math.min(n - 1, GUIDE.i)), [title, text] = st[i] || ['', ''];
    const btn = (act, label, dis) => `<button class="small" style="margin-right:4px" ${dis ? 'disabled' : ''} onpointerdown="window.__umcGuide('${act}')">${label}</button>`;
    return `<div style="display:block;line-height:1.5;max-width:520px"><b>📖 ${esc(U.T(mat.label))}</b><br>` +
      `<span style="color:#3d8bfd"><b>${i + 1} / ${n} · ${esc(title)}</b></span><br>` +
      `<span style="font-weight:400">${text}</span><br>` +
      `<span style="display:inline-block;margin-top:4px">${btn('prev', '◀ ' + esc(L('이전', 'Back')), i === 0)}${btn('next', esc(L('다음', 'Next')) + ' ▶', i === n - 1)}${btn('off', '✕ ' + esc(L('설명 닫기', 'Close')))}</span></div>`;
  }
  const hiDraw = (mat, c) => {
    if (!GUIDE.on) return;
    const st = stepsOf(mat), r = (st[Math.max(0, Math.min(st.length - 1, GUIDE.i))] || [])[2];
    for (const q of (r ? (Array.isArray(r[0]) ? r : [r]) : [])) {
      c.fillStyle = 'rgba(255, 214, 10, 0.28)'; c.fillRect(q[0], q[1], q[2] - q[0], q[3] - q[1]);
      c.strokeStyle = '#f08c00'; c.lineWidth = 8; c.setLineDash([24, 14]); c.strokeRect(q[0], q[1], q[2] - q[0], q[3] - q[1]); c.setLineDash([]);
    }
  };

  // ───── 그리기 도우미 ─────
  const bg = (c, w, h) => { c.fillStyle = BG; c.fillRect(0, 0, w, h); };
  const zoneBox = (c, x, y, s = 250) => { c.strokeStyle = ZONE; c.lineWidth = 6; c.strokeRect(x + 3, y + 3, s - 6, s - 6); c.fillStyle = ZONE; c.font = 'bold 30px sans-serif'; c.fillText('START', x + 14, y + 40); };
  const laneStart = w => ({ get x() { return -w / 2 + 250 - half().z1; }, z: 0, th: Math.PI / 2 });
  const laneZone = w => [-w / 2, -125, -w / 2 + 250, 125];
  const ZY = (TH - 250) / 2; // 출발 구역의 캔버스 y
  const xs = (w, x) => x + w / 2 - 250; // 출발선 기준 거리(mm)

  // ───── 배치 (미션마다 주니어·시니어가 같은 배치를 함께 씀) ─────
  const LAY = {};
  const GEN = {
    1: () => ({ value: ri(1, 15) }),
    2: () => {
      for (let k = 0; k < 500; k++) {
        const n = ri(3, 7), g = []; for (let i = 0; i < n - 1; i++) g.push(ri(8, 30));
        const s = g.slice().sort((a, b) => b - a); if (s[0] - s[1] < 3) continue;
        const sum = g.reduce((a, b) => a + b, 0); if (sum > 95) continue;
        const pos = [ri(30, 125 - sum)]; g.forEach(x => pos.push(pos[pos.length - 1] + x)); return { pos };
      }
      return { pos: [40, 52, 80, 92] };
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
const fits = p => p.every(q => q[0] >= 30 && q[0] <= 152 && q[1] >= 12 && q[1] <= 63);
      const n = ri(3, 5), R0 = { 3: [18, 28], 4: [22, 33], 5: [26, 27.6] }[n], jit = n === 5 ? .12 : .5, sy = n === 5 ? 1 : .9, sx = n === 5 ? 1 : 1.25;
      for (let k = 0; k < 60000; k++) {
        const rot = Math.random() * Math.PI * 2, cx = ri(60, 122), p = [];
        for (let i = 0; i < n; i++) { const th = rot + (i + (Math.random() - .5) * jit) * 2 * Math.PI / n, r = R0[0] + Math.random() * (R0[1] - R0[0]); p.push([Math.round(cx + r * sx * Math.cos(th)), Math.round(37.5 + r * sy * Math.sin(th))]); }
        if (fits(p) && ok(p)) return { pts: p };
      }
      return { pts: [[71, 20], [111, 20], [111, 55], [71, 55]] };
    },
    5: () => { const a = ri(1, 6), b = ri(1, 6); return { D: 40 + 15 * a + (b - 1) }; },
  };
  const lay = n => LAY[n] || (LAY[n] = GEN[n]());

  // ───── 미션 1 · 바코드 내비게이터 ─────
  function m1(div) {
    const jr = div === 'jr', w = TW, h = TH, nz = jr ? 4 : 15, zw = jr ? 100 : 60; // 구역 폭: 주니어 10cm, 시니어 6cm
    const mat = {
      umc: 1, div, w, h, ...TABLE, max: jr ? 50 : 60, start: laneStart(w),
      task: () => jr ? L('검은 칸의 개수(1~4)를 세어 그 번호 구역에 정지하고, 개수만큼 삐 소리 내기', 'Count the black cells (1–4), stop in that numbered zone and beep that many times')
        : L('4칸 이진수(첫 칸 = 8)를 10진수로 바꿔 그 번호 구역(1~15)에 정지하고 화면에 숫자 보여주기', 'Convert the 4-bit code (first cell = 8) to decimal, stop in that zone (1–15) and show the number'),
      draw(c) {
        const v = lay(1).value, bits = v.toString(2).padStart(4, '0');
        bg(c, w, h); zoneBox(c, 0, ZY);
        c.fillStyle = INK; c.fillRect(250 + 230, 0, 20, h);
        for (let i = 0; i < 4; i++) { c.fillStyle = bits[i] === '1' ? INK : '#ffffff'; c.fillRect(250 + 300 + 50 * i, 275, 50, 200); }
        c.strokeStyle = GREY; c.lineWidth = 2; c.strokeRect(250 + 300, 275, 200, 200);
        c.fillStyle = GREY; c.font = jr ? 'bold 34px sans-serif' : 'bold 26px sans-serif'; c.textAlign = 'center';
        for (let n = 0; n <= nz; n++) { const x = 250 + 600 + zw * n; c.fillRect(x - 2, 0, 4, 40); c.fillRect(x - 2, h - 40, 4, 40); if (n < nz) { c.fillText(String(n + 1), x + zw / 2, 36); c.fillText(String(n + 1), x + zw / 2, h - 10); } }
        c.textAlign = 'left';
      },
    };
    mat.info = guard(mat, () => {
      const v = lay(1).value, ones = v.toString(2).split('1').length - 1, ans = jr ? ones : v, p = U.pose(), d = xs(w, p.x);
      if (clearOfRect(laneZone(w))) R.left = true;
      if (d - half().z1 >= 500 || d + half().z0 >= 500) R.x.pass = true;
      const z = Math.floor((d - 600) / zw) + 1, stop = stopped(3) && R.left;
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
    const jr = div === 'jr', w = TW, h = TH;
    const mat = {
      umc: 2, div, w, h, ...TABLE, max: jr ? 50 : 70, start: laneStart(w),
      task: () => jr ? L('가로선의 개수를 세고, 도착 띠에 정지해 개수를 화면에 보여주기', 'Count the cross lines, stop on the finish band and show the count')
        : L('도착 띠에 정지해 ① 가로선 개수 ② 가장 넓은 간격의 순번 ③ 그 길이(cm)를 차례로 화면에 보여주기', 'Stop on the finish band, then show ① line count ② index of the widest gap ③ its length (cm), in that order'),
      draw(c) {
        bg(c, w, h); zoneBox(c, 0, ZY); c.fillStyle = INK;
        for (const p of lay(2).pos) c.fillRect(250 + p * 10 - 10, 175, 20, 400);
        c.fillRect(250 + 1400, 0, 100, h); // 도착 띠: 출발선에서 140~150cm
      },
    };
    mat.info = guard(mat, () => {
      const pos = lay(2).pos, n = pos.length, g = []; for (let i = 1; i < n; i++) g.push(pos[i] - pos[i - 1]);
      const mx = Math.max(...g), idx = g.indexOf(mx) + 1, d = xs(w, U.pose().x);
      if (clearOfRect(laneZone(w))) R.left = true;
      const fin = stopped(1) && d >= 1400 && d <= 1500;
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

  // ───── 미션 3 · 컵 밀기 (컵을 테이블 밖으로 떨어뜨리기) ─────
  const CUP8 = [[30, 10], [70, 10], [112, 10], [152, 10], [10, 37], [172, 37], [45, 65], [137, 65]]; // cm, 테이블 왼쪽 위가 원점, 가장자리에서 10cm 안쪽
  const cupXZ = i => [CUP8[i][0] * 10 - TW / 2, CUP8[i][1] * 10 - TH / 2];
  function m3(div) {
    const jr = div === 'jr', w = TW, h = TH, nc = jr ? 3 : 4, zone = [-125, 125, 125, 375];
    const mat = {
      umc: 3, div, w, h, ...TABLE, max: jr ? 60 : 100, start: { x: 0, z: 250, th: Math.PI },
      task: () => jr ? L('컵 3개를 모두 테이블 밖으로 밀어 떨어뜨리고 출발 구역으로 돌아오기 (로봇이 떨어지면 안 됨)', 'Push all 3 cups off the table and return to the start zone (the robot must not fall)')
        : L('컵 4개를 빨강 → 파랑 → 노랑 → 초록 카드 순서로 테이블 밖으로 밀어내고 돌아와, 밀어낸 개수를 화면에 보여주기', 'Push the 4 cups off the table in the order red → blue → yellow → green, return, and show how many you removed'),
      draw(c) {
        const l = lay(3);
        bg(c, w, h);
        if (!jr) l.pos.forEach((pi, i) => { const [x, z] = cupXZ(pi), dl = Math.hypot(x, z), qx = x - x / dl * 125, qz = z - z / dl * 125; c.fillStyle = COL[l.colors[i]][2]; c.fillRect(qx + w / 2 - 50, qz + h / 2 - 50, 100, 100); });
        zoneBox(c, 785, 500);
      },
      props() {
        const l = lay(3);
        return l.pos.slice(0, nc).map((pi, i) => { const [x, z] = cupXZ(pi); return { kind: 'cup', shape: 'cyl', r: 35, hgt: 85, mass: .008, color: 0xe6d9bd, band: jr ? 0x8a94a3 : COL[l.colors[i]][3], x, z, tag: jr ? '' : l.colors[i] }; });
      },
    };
    mat.info = guard(mat, () => {
      const cups = U.props().filter(p => p.kind === 'cup');
      R.x.out = R.x.out || [];
      for (const c of cups) if (!c._umcOut && c.fallen) { c._umcOut = true; R.x.out.push(c.tag); }
      if (clearOfRect(zone)) R.left = true;
      const out = R.x.out.length, home = R.left && stopped(1) && overlapsRect(zone) && !fell();
      const items = [];
      if (jr) items.push([L('출발 구역을 벗어남', 'Left the start zone'), 5, R.left ? 5 : 0]);
      items.push([L('컵을 테이블 밖으로', 'Cups off the table') + ` (${out}/${nc})`, (jr ? 15 : 10) * nc, out * (jr ? 15 : 10)]);
      if (!jr) { let ord = 0; R.x.out.forEach((t, k) => { if (t === ORDER[k]) ord++; }); items.push([L('올바른 순서로 제거', 'Removed in the right order') + ` (${ord})`, 40, ord * 10]); }
      items.push([L('출발 구역 복귀 후 정지', 'Returned to the start zone and stopped'), 10, home ? 10 : 0]);
      if (!jr) items.push([L('제거한 컵 개수 화면 표시', 'Showed the number of cups removed'), 10, out > 0 && lastW() === out ? 10 : 0]);
      return panel(mat, items, '');
    });
    return mat;
  }

  // ───── 미션 4 · 도형 탐정 ─────
  function m4(div) {
    const jr = div === 'jr', w = TW, h = TH;
    const geo = () => {
      const P = lay(4).pts.map(([x, y]) => [x * 10 - w / 2, h / 2 - y * 10]), n = P.length, len = [], cum = [0];
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; len.push(Math.hypot(b[0] - a[0], b[1] - a[1])); cum.push(cum[i] + len[i]); }
      return { P, n, len, cum, per: cum[n] };
    };
    const project = (g, x, z) => {
      let best = { d: 1e9, s: 0 };
      for (let i = 0; i < g.n; i++) { const a = g.P[i], b = g.P[(i + 1) % g.n], ux = (b[0] - a[0]) / g.len[i], uz = (b[1] - a[1]) / g.len[i]; const t = Math.max(0, Math.min(g.len[i], (x - a[0]) * ux + (z - a[1]) * uz)); const d = Math.hypot(x - a[0] - ux * t, z - a[1] - uz * t); if (d < best.d) best = { d, s: g.cum[i] + t }; }
      return best;
    };
    const mat = {
      umc: 4, div, w, h, ...TABLE, max: jr ? 50 : 70,
      get start() { const g = geo(), a = g.P[0], b = g.P[1]; return { x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, th: Math.atan2(b[0] - a[0], b[1] - a[1]) }; },
      task: () => jr ? L('라인을 따라 도형을 한 바퀴 돌고 출발 표시 근처에 정지해, 꼭짓점 수만큼 삐 소리 내기', 'Follow the line once around the shape, stop near the start mark and beep once per corner')
        : L('도형을 한 바퀴 돌고 정지해, 꼭짓점 수와 둘레(cm)를 차례로 화면에 보여주기', 'Go once around the shape, stop, then show the number of corners and the perimeter (cm)'),
      draw(c) {
        const g = geo(); bg(c, w, h);
        c.strokeStyle = INK; c.lineWidth = 20; c.lineJoin = 'miter'; c.beginPath();
        g.P.forEach((p, i) => (i ? c.lineTo(p[0] + w / 2, p[1] + h / 2) : c.moveTo(p[0] + w / 2, p[1] + h / 2))); c.closePath(); c.stroke();
        const a = g.P[0], b = g.P[1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, ux = (b[0] - a[0]) / g.len[0], uz = (b[1] - a[1]) / g.len[0];
        let nx = -uz, nz = ux; const cx = g.P.reduce((s, p) => s + p[0], 0) / g.n, cz = g.P.reduce((s, p) => s + p[1], 0) / g.n;
        if ((mx + nx * 10 - cx) ** 2 + (mz + nz * 10 - cz) ** 2 < (mx - cx) ** 2 + (mz - cz) ** 2) { nx = -nx; nz = -nz; }
        c.beginPath(); c.moveTo(mx + w / 2, mz + h / 2); c.lineTo(mx + nx * 60 + w / 2, mz + nz * 60 + h / 2); c.stroke();
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
    const jr = div === 'jr', w = TW, h = TH;
    const mat = {
      umc: 5, div, w, h, ...TABLE, max: jr ? 40 : 70, start: laneStart(w),
      get walls() { const D = lay(5).D * 10; return [[-w / 2 + 250 + D + 100, 0, 200, 360, 200, 0xd9b98a]]; },
      task: () => jr ? L('상자 앞 정확히 10cm에 정지하고 삐 소리 1번 내기 (거리는 매번 다름)', 'Stop exactly 10 cm in front of the box and beep once (the distance changes every time)')
        : L('상자 앞 10cm에 3초 정지하며 출발선~상자 거리(cm)를 화면에 보여주고, 출발 구역으로 돌아오기', 'Stop 10 cm from the box for 3 s while showing the start-line-to-box distance (cm), then return to the start zone'),
      draw(c) { bg(c, w, h); zoneBox(c, 0, ZY); c.fillStyle = ZONE; c.fillRect(248, 0, 4, h); },
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


  // ───── Robofest 2027 Game · RoboPetCare Challenge ─────
  // 규정: Robofest Game Rules 2027 V3 (테이블 182×75cm, 치수 ±2cm, 3.2 Field Specifications). 시뮬레이터는 밀어서 옮기는 2D 근사입니다.
  // 동물병원·미용실·화장실(20×5cm 구조물)은 규정 그림처럼 테이블 가장자리 바깥에 붙어 있어, 고양이·건전지를 가장자리 밖으로 밀어 떨어뜨려 넣습니다.
  const G = { W: 1820, H: 750, bowl: [1332, 350], park: [100, 550, 200, 650], vet: [1220, 750, 1420, 800], groomer: [400, 750, 600, 800], litter: [1070, -50, 1270, 0], disp: [425, 0, 575, 145],
    // 디스펜서: 받침(15cm × 약 9cm)이 북쪽 가장자리에 붙고, 기둥 위 기울어진 사료통이 테이블 쪽으로 나옵니다 (레고 준비물 파일 크기).
    // 펫토이: 받침(4 × 12cm)의 남쪽 끝이 집 선(35cm)에 닿고, 고리(페그)는 북쪽을 향합니다.
    dispW: [500, 44, 152, 88], toyW: [1670, 290, 40, 120] };
  const DIRS = { N: ['북', 'North', Math.PI], E: ['동', 'East', Math.PI / 2], S: ['남', 'South', 0], W: ['서', 'West', -Math.PI / 2] };
  GEN[6] = () => {
    const X = [70, 75, 80, 85, 90][ri(0, 4)], side = [4, 5, 10][ri(0, 2)], turns = ri(3, 8);
    return { ori: 'NESW'[ri(0, 3)], cats: ri(0, 1), X, q: ri(0, 1), side, turns };
  };
  function game(div) {
    const jr = div === 'jr', w = G.W, h = G.H, wx = x => x - w / 2, wz = y => y - h / 2;
    const cv = p => [p.x + w / 2, p.z + h / 2]; // 물체의 캔버스 좌표
    const inR = (p, r) => { const [x, y] = cv(p); return !p.fallen && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; };
    const answer = () => { const l = lay(6); return jr ? (l.q ? l.X - 50 : l.turns) : Math.pow(l.X, 3) / 100; };
    const question = () => {
      const l = lay(6);
      if (!jr) return L('x³ ÷ 100 의 답 (x = 서쪽 끝에서 출발선까지 거리 cm, 70~90 — 시니어는 출발선 위치가 임파운드 뒤에 공개되므로 로봇이 재야 함)', 'the value of x³ ÷ 100 (x = start line distance from the west edge in cm, 70–90; seniors learn it only after impound, so the robot must measure it)');
      return l.q ? L('사료 디스펜서와 출발선 사이의 거리는 몇 cm?', 'How many cm is it from the food dispenser to the start line?')
        : L(`바퀴 둘레가 넓이 ${l.side * l.side}cm²인 정사각형의 둘레와 같다면, ${4 * l.side * l.turns}cm를 가려면 몇 바퀴?`, `If the wheel circumference equals the perimeter of a square of area ${l.side * l.side} cm², how many turns to travel ${4 * l.side * l.turns} cm?`);
    };
    const mat = {
      umc: 6, div, w, h, max: 100, raise: 45, side: 0x8d8f94, compact: true,
      get start() { const l = lay(6); return { x: wx(l.X * 10), z: 0, th: DIRS[l.ori][2] }; },
      get walls() {
        // 디스펜서(북쪽 가장자리, 가운데 50cm)와 집의 펫토이(동쪽에서 15cm, 선 북쪽)만 테이블 위의 구조물 — 병원·미용실·화장실은 테이블 밖
        return [[wx(G.dispW[0]), wz(G.dispW[1]), G.dispW[2], G.dispW[3], 60, 0x4a8fd6], [wx(G.toyW[0]), wz(G.toyW[1]), G.toyW[2], G.toyW[3], 60, 0x8fbbe8]];
      },
      task: () => L('과제 6개와 종료 과제를 2분 안에 수행 (스코어카드 100점 기준, 런 종료 시점 채점)', 'Do the six tasks and the ending task within 2 minutes (100-point scorecard, scored at the end of the run)'),
      head: () => { const l = lay(6), d = DIRS[l.ori]; return esc('UTF · ' + L(`시작 방향 ${d[0]}쪽 · 고양이 a=${l.cats ? '주황' : '흰색'}, b=${l.cats ? '흰색' : '주황'} · X=${l.X}cm · 종료: ${jr ? '출발선 위에 걸쳐 정지' : '남쪽 가장자리에 걸쳐 정지'} + 화면에 답 표시 — `, `start facing ${d[1]} · cat a=${l.cats ? 'orange' : 'white'}, b=${l.cats ? 'white' : 'orange'} · X=${l.X} cm · end: stop ${jr ? 'over the start line' : 'over the south edge'} + show the answer — `) + question()); },
      draw(c) {
        const l = lay(6);
        c.fillStyle = '#e9e9e6'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#0a9646'; c.fillRect(100, 550, 100, 100);
        c.fillStyle = '#d4d4d8'; c.beginPath(); c.arc(G.bowl[0], G.bowl[1], 88, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#bfc1c7'; c.beginPath(); c.arc(G.bowl[0], G.bowl[1], 60, 0, Math.PI * 2); c.fill();
        c.fillStyle = INK;
        c.fillRect(l.X * 10 - 9, 0, 19, h);       // 출발선 (X = 70~90cm)
        c.fillRect(491, 80, 19, 120);             // 디스펜서 앞 선
        c.fillRect(491, 550, 19, 200);            // 미용실 앞 선
        c.fillRect(1420, 341, 400, 19);           // 펫호텔 ~ 집 선
        c.strokeStyle = '#b5b8bf'; c.lineWidth = 2;
        for (const [x, y] of [[100, 100], [100, 350], [100, 500], [1270, 600], [1370, 600], [1120, 50], [1170, 100], [1220, 50]]) { c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#d6dbe3'; c.fillRect(G.dispW[0] - G.dispW[2] / 2, 0, G.dispW[2], G.dispW[3]); // 디스펜서 받침
        c.fillStyle = '#d6dbe3'; c.fillRect(G.toyW[0] - G.toyW[2] / 2, G.toyW[1] - G.toyW[3] / 2, G.toyW[2], G.toyW[3]); // 펫토이 받침
        c.strokeStyle = '#9fb4d8'; c.setLineDash([8, 6]); c.strokeRect(G.disp[0], G.dispW[3] + 2, G.disp[2] - G.disp[0], G.disp[3] - G.dispW[3] - 2); c.setLineDash([]); // 사료 자리
        // 테이블 밖 구조물의 자리 (가장자리 띠) — 화장실(북), 동물병원·미용실(남)
        for (const [r, col] of [[G.litter, '#f5b400'], [G.vet, '#5aa84a'], [G.groomer, '#86c27a']]) { c.fillStyle = col; c.fillRect(r[0], r[1] < 0 ? 0 : h - 8, r[2] - r[0], 8); }
        c.fillStyle = '#9aa0aa'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
        c.fillText('a', 1270, 560); c.fillText('b', 1370, 560); c.fillText('N', w - 30, 30);
        c.textAlign = 'left';
      },
      props() {
        const l = lay(6), P = (x, y, o) => ({ x: wx(x), z: wz(y), ...o });
        const cat = (x, white) => P(x, 600, { kind: 'cat', shape: 'cyl', r: 20, hgt: 50, mass: .01, color: white ? 0xf7f7f7 : 0xf59a23, band: white ? 0xd9d9de : 0xd97a00, tag: white ? 'W' : 'O' });
        const out = [
          P(100, 100, { kind: 'dog', shape: 'box', w: 49, d: 75, hgt: 71, mass: .02, color: 0xd9a24a }), // 3D 프린트 강아지 (약 8cm, Robofest 파일)
          P(100, 350, { kind: 'mail', shape: 'box', w: 32, d: 16, hgt: 29, mass: .008, color: 0xd22323 }),
          P(100, 500, { kind: 'mail', shape: 'box', w: 32, d: 16, hgt: 29, mass: .008, color: 0xd22323 }),
          cat(1270, !l.cats), cat(1370, !!l.cats),
          P(1670, 212, { kind: 'nut', shape: 'cyl', r: 15, hgt: 15, mass: .03, color: 0xb0b4bb }), // 펫토이 고리 아래 (2D 근사)
        ];
        for (const [x, y] of [[1120, 50], [1170, 100], [1220, 50]]) out.push(P(x, y, { kind: 'debris', shape: 'cyl', r: 10, hgt: 14, mass: .023, color: 0xe07b18 }));
        for (let i = 0; i < 10; i++) out.push(P(452 + (i % 5) * 24, 106 + Math.floor(i / 5) * 24, { kind: 'food', shape: 'cyl', r: 10, hgt: 14, mass: .004, color: 0x18a0a8 }));
        return out;
      },
    };
    mat.info = guard(mat, () => {
      const l = lay(6), ps = U.props(), p = U.pose(), sim = U.sim();
      for (const o of ps) if (o._sx == null) { o._sx = o.x; o._sz = o.z; }
      const moved = (o, d = 30) => o.fallen || Math.hypot(o.x - o._sx, o.z - o._sz) > d;
      const of = k => ps.filter(o => o.kind === k);
      if (!R.started) R.x.th0 = p.th; // 출발 직전의 방향
      const food = of('food'), fOut = food.filter(o => o.fallen || !inR(o, G.disp)).length;
      const fIn = food.filter(o => !o.fallen && Math.hypot(cv(o)[0] - G.bowl[0], cv(o)[1] - G.bowl[1]) <= 60).length;
      // 가장자리 밖 구조물: 그 구간에서 테이블 밖으로 떨어진 물체 (구조물 폭 ±1.5cm)
      const offInto = (o, r) => { if (!o || !o.fallen) return false; const [x, y] = cv(o); return x >= r[0] - 15 && x <= r[2] + 15 && (r[1] < 0 ? y < 40 : y > h - 40); };
      const lit = of('debris').filter(o => offInto(o, G.litter)).length;
      const dog = of('dog')[0], dc = dog ? cv(dog) : [0, 0];
      const dogPts = !dog || dog.fallen ? (dog && moved(dog) ? 4 : 0) : (dc[0] >= 125 && dc[0] <= 175 && dc[1] >= 575 && dc[1] <= 625) ? 10 : (dc[0] >= 70 && dc[0] <= 230 && dc[1] >= 520 && dc[1] <= 680) ? 8 : moved(dog) ? 4 : 0;
      const mail = of('mail').filter(o => !moved(o, 10)).length;
      const nut = of('nut')[0], cats = of('cat'), wc = cats.find(o => o.tag === 'W'), oc = cats.find(o => o.tag === 'O');
      const catPts = (o, zone) => !o ? 0 : offInto(o, zone) ? 10 : moved(o) ? 5 : 0;
      // #9 디스펜서·펫토이를 건드리면 (실제로는 밀려 움직임) 1개당 −10
      const touch = r => { const p = U.pose(), cs = corners(), pts = [...cs, ...cs.map((c, i) => [(c[0] + cs[(i + 1) % 4][0]) / 2, (c[1] + cs[(i + 1) % 4][1]) / 2]), [p.x, p.z]];
        const x0 = wx(r[0] - r[2] / 2) - 4, x1 = wx(r[0] + r[2] / 2) + 4, z0 = wz(r[1] - r[3] / 2) - 4, z1 = wz(r[1] + r[3] / 2) + 4; return pts.some(([a, b]) => a >= x0 && a <= x1 && b >= z0 && b <= z1); };
      if (R.started && !R.ended) { if (touch(G.dispW)) R.x.hitDisp = 1; if (touch(G.toyW)) R.x.hitToy = 1; }
      const hits = (R.x.hitDisp ? 1 : 0) + (R.x.hitToy ? 1 : 0);
      const fell = !!(sim && sim.fell), cs = corners();
      const stop = stopped(1) && R.started && !fell;
      const endOk = stop && (jr ? overlapsRect([wx(l.X * 10 - 10), -h / 2, wx(l.X * 10 + 10), h / 2]) : cs.some(c => c[1] > h / 2));
      const ans = answer(), shown = lastW(), tol = jr ? 0.01 : 3 * Math.pow(l.X, 2) / 100 + 1; // 시니어: x를 ±1cm로 재면 맞는 답
      const ansOk = stop && Math.abs(shown - ans) <= tol;
      let warn = '';
      if (R.started && R.x.th0 != null) { let d = Math.abs(R.x.th0 - DIRS[l.ori][2]) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 0.18) warn = L('시작 방향이 UTF와 다릅니다. ', 'Start orientation differs from the UTF. '); }
      if (fell) warn += L('로봇이 테이블에서 떨어졌습니다 (실제 경기는 즉시 중단). ', 'The robot fell off the table (the run stops in a real event). ');
      return panel(mat, [
        [L('#1 사료 꺼냄', '#1 Food out') + ` ${fOut}`, 10, fOut],
        [L('그릇 안', 'in bowl') + ` ${fIn}`, 10, fIn],
        [L('#2 화장실 청소', '#2 Litter') + ` ${lit}/3`, 9, lit * 3],
        [L('#3 강아지 산책', '#3 Dog walk'), 10, dogPts],
        [L('우편함 온전', 'mailboxes intact') + ` ${mail}/2`, 4, mail * 2],
        [L('#4 너트 빼기', '#4 Nut off'), 10, nut && moved(nut) ? 10 : 0],
        [L('#5 흰 고양이→병원', '#5 White cat→Vet'), 10, catPts(wc, G.vet)],
        [L('#6 주황 고양이→미용실', '#6 Orange cat→Groomer'), 10, catPts(oc, G.groomer)],
        [L('#7 종료 위치', '#7 End location'), 8, endOk ? 8 : 0],
        [L('정답 표시', 'answer shown'), 8, ansOk ? 8 : 0],
        [L('#8 로봇 온전', '#8 Robot intact'), 11, fell ? 0 : 11],
        [L('#9 디스펜서·펫토이 건드림', '#9 Dispenser/toy touched') + ` ${hits}`, 0, -10 * hits],
      ], warn + (R.ended ? L('정답', 'Answer') + ': ' + (jr ? ans : Math.round(ans) + ' (±' + Math.round(tol) + ')') : ''));
    });
    return mat;
  }


  // ───── 단계별 설명 내용 ─────  [제목, 설명(HTML), 강조할 캔버스 사각형(들)]
  const li = a => a.map(x => '· ' + x).join('<br>');
  const STEPS = {
    1: m => { const jr = m.div === 'jr', nz = jr ? 4 : 15, zw = jr ? 100 : 60; return [
      [L('경기장', 'The field'), L('Robofest 게임과 같은 182×75cm 테이블입니다. 로봇은 왼쪽 출발 구역에서 앞쪽 끝을 출발선에 맞추고 오른쪽으로 달립니다.', 'The same 182×75 cm table as the Robofest Game. The robot starts in the zone on the left with its front on the start line and drives right.'), [0, 250, 250, 500]],
      [L('시작 표시선', 'Start mark'), L('출발선에서 23cm 앞에 검은 선이 있습니다. 컬러 센서가 이 선을 만나는 순간을 "거리 0"으로 삼으면 그 뒤의 위치를 정확히 알 수 있습니다.', 'A black line sits 23 cm past the start line. Treat the moment the colour sensor meets it as "distance 0".'), [460, 0, 520, 750]],
      [L('바코드 (미지 요소)', 'Barcode (the unknown)'), L('출발선에서 30~50cm에 4칸 바코드가 있습니다. 한 칸은 5cm이고 검정=1, 흰색=0입니다. 무늬는 🎲 새 배치를 누를 때마다 바뀌므로 프로그램에 미리 적어 둘 수 없습니다.', 'A 4-cell barcode lies 30–50 cm from the start line. Each cell is 5 cm; black = 1, white = 0. The pattern changes with every new layout.'), [540, 265, 760, 485]],
      [L('번호 구역', 'Numbered zones'), jr ? L('출발선에서 60cm부터 10cm마다 1~4번 구역입니다. 구동 바퀴 축이 들어간 구역으로 판정합니다.', 'Zones 1–4 start 60 cm from the start line, 10 cm each. The drive axle decides the zone.') : L('출발선에서 60cm부터 6cm마다 1~15번 구역입니다. 구동 바퀴 축이 들어간 구역으로 판정합니다.', 'Zones 1–15 start 60 cm from the start line, 6 cm each. The drive axle decides the zone.'), [850, 0, 850 + zw * nz, 750]],
      [L('과제', 'The task'), jr ? L('검은 칸이 몇 개인지 세어(1~4) 그 번호 구역에 3초 이상 정지하고, 개수만큼 삐 소리를 냅니다.', 'Count the black cells (1–4), stop in that zone for 3 s and beep that many times.') : L('첫 칸을 8, 다음을 4·2·1로 읽어 10진수(1~15)로 바꾸고, 그 번호 구역에 3초 이상 정지해 화면에 숫자를 보여줍니다.', 'Read the cells as 8-4-2-1, convert to decimal (1–15), stop in that zone for 3 s and show the number.'), null],
      [L('채점', 'Scoring'), li(jr ? [L('출발 구역 벗어남 5', 'Leave the start zone 5'), L('바코드 통과 5', 'Pass the barcode 5'), L('삐 소리 횟수 정답 20', 'Correct beeps 20'), L('올바른 구역 정지 20 (옆 구역 10)', 'Right zone 20 (adjacent 10)')] : [L('출발 구역 벗어남 5', 'Leave the start zone 5'), L('바코드 통과 5', 'Pass the barcode 5'), L('화면 숫자 정답 25', 'Correct number 25'), L('올바른 구역 정지 25 (옆 구역 10)', 'Right zone 25 (adjacent 10)')]), null],
      [L('풀이 순서', 'How to solve it'), li([L('검은 선을 만날 때까지 전진하고 주행 거리를 0으로', 'Drive to the black line and reset the distance'), L('9.5cm부터 5cm마다(각 칸의 가운데) 반사광을 읽기', 'Read reflection every 5 cm from 9.5 cm (cell centres)'), jr ? L('검정이면 변수에 1 더하기', 'Add 1 to a variable when black') : L('값 = 값×2 + (검정이면 1)', 'value = value×2 + (1 if black)'), L('목표 구역 가운데까지의 거리를 계산해 정지', 'Compute the distance to the middle of the zone and stop'), jr ? L('값만큼 삐 소리 반복', 'Beep that many times') : L('값을 화면에 표시', 'Show the value')]), null]]; },
    2: m => { const jr = m.div === 'jr'; return [
      [L('경기장', 'The field'), L('182×75cm 테이블입니다. 왼쪽 출발 구역에서 오른쪽으로 직진합니다.', 'The 182×75 cm table. Drive straight from the start zone on the left.'), [0, 250, 250, 500]],
      [L('가로선 (미지 요소)', 'Cross lines (the unknown)'), L('출발선에서 30~125cm 사이에 폭 2cm 가로선이 3~7개 있습니다. 개수와 간격은 매번 바뀝니다. 간격은 8cm 이상이고, 가장 넓은 간격은 두 번째보다 3cm 이상 넓습니다.', 'Between 30 and 125 cm there are 3–7 cross lines, 2 cm wide. Count and spacing change every time.'), [530, 165, 1520, 585]],
      [L('도착 띠', 'Finish band'), L('출발선에서 140~150cm에 폭 10cm 검은 띠가 있습니다. 가로선(2cm)보다 훨씬 넓다는 점으로 구별합니다. 구동 바퀴 축이 띠 위에 있어야 도착입니다.', 'A 10 cm black band lies 140–150 cm from the start line; tell it apart by its width. The drive axle must end on it.'), [1650, 0, 1750, 750]],
      [L('과제', 'The task'), jr ? L('도착 띠에 정지하고, 지나온 가로선의 개수를 화면에 보여줍니다.', 'Stop on the finish band and show how many lines you crossed.') : L('도착 띠에 정지하고 ① 가로선 개수 ② 가장 넓은 간격이 몇 번째인지 ③ 그 길이(cm)를 차례로 화면에 보여줍니다.', 'Stop on the band, then show ① the count ② which gap is widest ③ its length in cm.'), null],
      [L('채점', 'Scoring'), li(jr ? [L('출발 구역 벗어남 5', 'Leave the start zone 5'), L('도착 띠 정지 15', 'Stop on the band 15'), L('개수 정답 30 (±1은 10)', 'Count 30 (±1: 10)')] : [L('도착 띠 정지 10', 'Stop on the band 10'), L('개수 정답 20 (±1은 5)', 'Count 20 (±1: 5)'), L('가장 넓은 간격의 순번 20', 'Widest-gap index 20'), L('간격 길이 ±1cm 20 (±2cm는 10)', 'Gap length ±1 cm 20 (±2 cm: 10)')]), null],
      [L('풀이 순서', 'How to solve it'), li([L('일정한 속도로 전진', 'Drive at a steady speed'), L('검정을 만나면 그때의 주행 거리를 기억', 'On black, remember the distance'), L('흰색으로 나오면 가로선 → 개수 +1, 4cm 넘게 계속 검정이면 도착 띠', 'Back to white = a line (+1); black for more than 4 cm = the band'), jr ? L('도착 띠에서 7cm 더 가서 정지, 개수 표시', 'Go 7 cm further, stop, show the count') : L('선마다 앞 선과의 거리를 구해 가장 큰 값과 순번을 기억', 'Keep the largest line-to-line distance and its index'), L('3초 간격으로 값을 차례로 표시(시니어)', 'Show the values 3 s apart (Senior)')]), null]]; },
    3: m => { const jr = m.div === 'jr', l = lay(3), n = jr ? 3 : 4, cups = l.pos.slice(0, n).map(pi => [CUP8[pi][0] * 10 - 60, CUP8[pi][1] * 10 - 60, CUP8[pi][0] * 10 + 60, CUP8[pi][1] * 10 + 60]); return [
      [L('경기장', 'The field'), L('182×75cm 테이블 전체가 경기장입니다. 로봇은 남쪽 가운데 출발 구역에서 북쪽을 보고 시작합니다. 테이블 밖으로 로봇이 떨어지면 런이 끝납니다.', 'The whole 182×75 cm table. The robot starts in the south-centre zone facing north. If it falls off, the run ends.'), [785, 500, 1035, 750]],
      [L('컵 (미지 요소)', 'Cups (the unknown)'), L(`종이컵 ${n}개가 테이블 가장자리에서 10cm 안쪽, 후보 8곳 중 어딘가에 놓입니다. 위치는 매번 바뀝니다.`, `${n} paper cups stand 10 cm in from the edge, at some of 8 candidate spots. Positions change every time.`), cups],
      ...(jr ? [] : [[L('색 카드와 순서', 'Colour cards and order'), L('컵마다 테이블 가운데 쪽 바닥에 색 카드가 한 장씩 있습니다. 빨강 → 파랑 → 노랑 → 초록 카드의 컵 순서로 밀어내야 순서 점수를 받습니다.', 'Each cup has a colour card on the floor toward the table centre. Push the cups out in the order red → blue → yellow → green.'), l.pos.map(pi => { const [x, z] = cupXZ(pi), d = Math.hypot(x, z), qx = x - x / d * 125 + TW / 2, qz = z - z / d * 125 + TH / 2; return [qx - 62, qz - 62, qx + 62, qz + 62]; })]]),
      [L('과제', 'The task'), jr ? L('컵 3개를 모두 테이블 밖으로 밀어 떨어뜨리고 출발 구역으로 돌아와 정지합니다.', 'Push all 3 cups off the table, return to the start zone and stop.') : L('컵 4개를 색 순서대로 테이블 밖으로 밀어내고 출발 구역으로 돌아와, 밀어낸 개수를 화면에 보여줍니다.', 'Push the 4 cups off in colour order, return to the start zone and show how many you removed.'), null],
      [L('채점', 'Scoring'), li(jr ? [L('출발 구역 벗어남 5', 'Leave the start zone 5'), L('컵 1개당 15', '15 per cup'), L('출발 구역 복귀 후 정지 10', 'Return and stop 10')] : [L('컵 1개당 10', '10 per cup'), L('순서가 맞으면 1개당 10 추가', '+10 per cup in the right order'), L('출발 구역 복귀 후 정지 10', 'Return and stop 10'), L('개수 화면 표시 10', 'Show the count 10')]), null],
      [L('풀이 순서', 'How to solve it'), li([L('테이블 가운데로 25cm 전진', 'Drive 25 cm to the table centre'), L('제자리에서 4°씩 돌며 거리 센서로 컵 찾기', 'Turn 4° at a time and look for cups with the distance sensor'), jr ? L('컵이 보이면 전진, 컬러 센서가 테이블 끝(반사광 0)을 보면 정지', 'Drive at a cup until the colour sensor sees the table edge (reflection 0)') : L('컵 쪽으로 가며 카드 색을 읽고 그 방향 각도를 색별 변수에 저장', 'Drive toward each cup, read the card colour and store the heading per colour'), L('간 만큼 후진해 가운데로 복귀', 'Back up the same distance'), jr ? L('한 바퀴 돈 뒤 출발 구역으로 후진', 'After a full turn, back into the start zone') : L('빨강·파랑·노랑·초록 각도 순서로 밀어내기', 'Push in the order of the stored headings')]), null]]; },
    4: m => { const jr = m.div === 'jr', P = lay(4).pts.map(([x, y]) => [x * 10, TH - y * 10]), xsA = P.map(q => q[0]), ysA = P.map(q => q[1]), box = [Math.min(...xsA) - 40, Math.min(...ysA) - 40, Math.max(...xsA) + 40, Math.max(...ysA) + 40], mid = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2]; return [
      [L('경기장', 'The field'), L('182×75cm 테이블 위에 검은 테이프로 만든 다각형이 하나 있습니다.', 'One polygon made of black tape on the 182×75 cm table.'), box],
      [L('출발 표시', 'Start mark'), L('한 변의 가운데에서 바깥으로 튀어나온 짧은 선이 출발 표시입니다. 로봇은 이 자리에서 선 방향으로 놓고 시작하고, 한 바퀴 돈 뒤 이 근처에서 멈춥니다.', 'A short stub sticking out from the middle of one side is the start mark. Start here along the line and stop near it after one lap.'), [mid[0] - 90, mid[1] - 90, mid[0] + 90, mid[1] + 90]],
      [L('도형 (미지 요소)', 'The shape (the unknown)'), L('삼각형·사각형·오각형 중 하나입니다. 변 길이(30~50cm)와 놓인 방향도 매번 바뀝니다.', 'A triangle, quadrilateral or pentagon. Side lengths (30–50 cm) and orientation change every time.'), P.map(q => [q[0] - 45, q[1] - 45, q[0] + 45, q[1] + 45])],
      [L('과제', 'The task'), jr ? L('라인을 따라 한 바퀴 돌고 출발 표시 근처에 정지해, 꼭짓점 수만큼 삐 소리를 냅니다.', 'Follow the line once around, stop near the start mark and beep once per corner.') : L('한 바퀴 돌고 정지해, 꼭짓점 수와 둘레(cm)를 차례로 화면에 보여줍니다.', 'Go once around, stop, then show the number of corners and the perimeter in cm.'), null],
      [L('채점', 'Scoring'), li([L('첫 꼭짓점 통과 5', 'First corner 5'), L('한 바퀴 완주 15', 'One lap 15'), L('출발 표시 근처 정지 10', 'Stop near the start mark 10'), L('꼭짓점 수 정답 20', 'Corners 20')].concat(jr ? [] : [L('둘레 ±5cm 20 (±10cm는 10)', 'Perimeter ±5 cm 20 (±10 cm: 10)')])), null],
      [L('풀이 순서', 'How to solve it'), li([L('선의 바깥쪽 가장자리를 비례 제어로 따라가기', 'Follow the outer edge of the line with proportional control'), L('허브 방향이 30° 넘게 바뀌면 꼭짓점 +1', 'Count a corner when the heading changes by more than 30°'), L('출발 표시(완전한 검정)를 다시 만나면 정지', 'Stop when you meet the start mark (full black) again'), jr ? L('꼭짓점 수만큼 삐 소리', 'Beep once per corner') : L('주행 거리로 둘레를 계산해 표시', 'Compute the perimeter from the distance driven')]), null]]; },
    5: m => { const jr = m.div === 'jr', D = lay(5).D * 10; return [
      [L('경기장', 'The field'), L('182×75cm 테이블입니다. 로봇 앞쪽 끝을 출발선에 맞추고 시작합니다.', 'The 182×75 cm table. Start with the robot front on the start line.'), [0, 250, 250, 500]],
      [L('상자 (미지 요소)', 'The box (the unknown)'), L('앞쪽 어딘가에 상자가 있습니다. 출발선에서 상자까지의 거리 D는 55~135cm 사이에서 1cm 단위로 매번 바뀝니다.', 'A box stands somewhere ahead. The distance D from the start line is 55–135 cm and changes every time.'), [250 + D - 20, 175, 250 + D + 220, 575]],
      [L('정지 목표', 'Where to stop'), L('로봇의 가장 앞부분과 상자 사이가 정확히 10cm가 되도록 멈춥니다.', 'Stop so that the gap between the robot front and the box is exactly 10 cm.'), [250 + D - 100, 175, 250 + D, 575]],
      [L('과제', 'The task'), jr ? L('상자 앞 10cm에 정지하고 삐 소리를 1번 냅니다.', 'Stop 10 cm from the box and beep once.') : L('상자 앞 10cm에 3초 정지하면서 거리 D(cm)를 화면에 보여주고, 출발 구역으로 돌아옵니다.', 'Stop 10 cm from the box for 3 s while showing D in cm, then return to the start zone.'), null],
      [L('채점', 'Scoring'), li([L('출발 구역 벗어남 5', 'Leave the start zone 5'), L('정지 거리 오차 ±1cm 30 · ±2cm 20 · ±4cm 10', 'Stop error ±1 cm 30 · ±2 cm 20 · ±4 cm 10')].concat(jr ? [L('정지 후 삐 소리 1번 5', 'One beep 5')] : [L('D 표시 ±2cm 20 (±4cm는 10)', 'D shown ±2 cm 20 (±4 cm: 10)'), L('출발 구역 복귀 15', 'Return 15')])), null],
      [L('풀이 순서', 'How to solve it'), li((jr ? [] : [L('출발 전에 거리 센서 값을 읽어 D를 계산(센서가 로봇 앞 끝보다 3mm 뒤)', 'Before moving, read the distance sensor to get D')]).concat([L('빠르게 전진하다 22cm 안으로 들어오면 천천히', 'Drive fast, then slow down inside 22 cm'), L('거리 센서가 10.3cm 이하가 되면 정지', 'Stop when the sensor reads 10.3 cm or less'), jr ? L('삐 소리 1번', 'Beep once') : L('D 표시, 3초 기다린 뒤 간 만큼 후진', 'Show D, wait 3 s, back up the same distance')])), null]]; },
    6: m => { const jr = m.div === 'jr', l = lay(6), X = l.X * 10, d = DIRS[l.ori], wa = l.cats ? 1370 : 1270, oa = l.cats ? 1270 : 1370; return [
      [L('경기장과 출발선', 'Field and start line'), L(`182×75cm 테이블입니다. 로봇은 일부가 출발선 위에 걸친 상태로 시작하며, 출발선의 위치 X는 서쪽 끝에서 70~90cm 사이입니다(이번 배치 ${l.X}cm).`, `The 182×75 cm table. The robot starts with some part over the start line; X is 70–90 cm from the west edge (now ${l.X} cm).`), [X - 40, 0, X + 40, 750]],
      [L('UTF (당일 공개 요소)', 'UTF (unveiled on the day)'), L(`작업 시간 30분 직전에 공개됩니다. 이번 배치: 시작 방향 ${d[0]}쪽, 고양이 a=${l.cats ? '주황' : '흰색'} · b=${l.cats ? '흰색' : '주황'}, X=${l.X}cm, 그리고 종료 과제. 🎲 새 배치를 누르면 UTF가 새로 나옵니다.`, `Unveiled just before the 30-minute work time. Now: start facing ${d[1]}, cat a=${l.cats ? 'orange' : 'white'}, b=${l.cats ? 'white' : 'orange'}, X=${l.X} cm, plus the ending task.`), [X - 120, 255, X + 120, 495]],
      [L('#1 사료 배달 (20점)', '#1 Food delivery (20)'), L('북쪽 가장자리의 디스펜서에서 사료 10개를 꺼내(1개당 1점) 펫호텔 그릇에 넣습니다(1개당 1점). 시뮬레이터에서는 디스펜서 앞의 사료 자리(점선) 밖으로 밀어내면 "꺼냄", 그릇 원 안으로 밀어 넣으면 "그릇 안"입니다. 디스펜서를 건드리면 −10점입니다.', 'Take 10 food pieces out of the dispenser on the north edge (1 each) and put them in the Pet Hotel bowl (1 each). In the simulator, push them out of the dashed food area in front of the dispenser and into the bowl circle. Touching the dispenser costs 10.'), [[415, 0, 585, 210], [1235, 255, 1430, 445]]],
      [L('#2 화장실 청소 (9점)', '#2 Litter box (9)'), L('배설물(AA 건전지) 3개를 북쪽 가장자리 바깥에 붙은 화장실(20×5cm, 서쪽 끝에서 107~127cm) 안으로 밀어 떨어뜨립니다. 1개당 3점입니다.', 'Push the 3 debris (AA batteries) over the north edge into the litter box (20×5 cm, 107–127 cm from the west edge) mounted outside the table, 3 points each.'), [1070, 0, 1270, 130]],
      [L('#3 강아지 산책 (14점)', '#3 Walk the dog (14)'), L('강아지를 출발 위치에서 초록색 강아지공원으로 옮깁니다. 완전히 안 10점, 일부만 안 8점, 움직이기만 하면 4점입니다. 가는 길의 우편함 2개를 건드리지 않으면 1개당 2점입니다.', 'Move the dog to the green dog park: fully in 10, partly 8, just moved 4. Each mailbox left untouched is 2.'), [[60, 60, 140, 150], [70, 320, 130, 530], [90, 540, 210, 660]]],
      [L('#4 집에서 놀아주기 (10점)', '#4 Play at the house (10)'), L('집의 펫토이에서 고리에 걸린 너트를 빼내 줄이 움직이게 합니다. 시뮬레이터에서는 고리 아래의 너트를 3cm 넘게 움직이면 인정하고, 펫토이에 닿으면 −10점입니다.', 'Pull the nut off the peg of the pet toy so the string moves. In the simulator, move the nut under the peg more than 3 cm; touching the toy costs 10.'), [[1620, 170, 1720, 250], [1630, 220, 1710, 360]]],
      [L('#5 흰 고양이 → 동물병원 (10점)', '#5 White cat → Vet (10)'), L('흰 고양이를 남쪽 가장자리 바깥에 붙은 동물병원(122~142cm) 안으로 밀어 넣습니다. 움직였지만 병원 밖이면 5점입니다. 어느 자리가 흰 고양이인지는 UTF로 정해집니다.', 'Push the white cat over the south edge into the Vet (122–142 cm) mounted outside the table; moved but outside is 5. The UTF says which spot holds the white cat.'), [[wa - 45, 555, wa + 45, 645], [1220, 685, 1420, 750]]],
      [L('#6 주황 고양이 → 미용실 (10점)', '#6 Orange cat → Groomer (10)'), L('주황 고양이를 출발선 너머 서쪽, 남쪽 가장자리 바깥에 붙은 미용실(40~60cm) 안으로 밀어 넣습니다. 움직였지만 밖이면 5점입니다.', 'Take the orange cat west across the start line and push it over the south edge into the Groomer (40–60 cm) mounted outside the table; moved but outside is 5.'), [[oa - 45, 555, oa + 45, 645], [400, 685, 600, 750]]],
      [L('#7 종료 과제 (16점)', '#7 Ending task (16)'), jr ? L('로봇 일부가 출발선 위에 걸친 채 정지하면 8점, 정지한 상태에서 UTF 문제의 답을 화면에 보여주면 8점입니다. 2분이 끝날 때 로봇이 움직이고 있으면 둘 다 받을 수 없습니다.', 'Stop with part of the robot over the start line (8) and show the UTF answer while stopped (8). If the robot is still moving at 2:00, neither counts.') : L('로봇 일부가 남쪽 가장자리 밖으로 걸친 채 정지하면 8점, 정지한 상태에서 x³÷100의 답을 보여주면 8점입니다. x는 서쪽 끝에서 출발선까지의 거리(70~90cm)로, 시니어는 임파운드 뒤에 공개되므로 로봇이 재야 합니다.', 'Stop with part of the robot over the south edge (8) and show x³÷100 while stopped (8). x is the start line distance from the west edge (70–90 cm); seniors only learn it after impound, so the robot must measure it.'), jr ? [X - 40, 0, X + 40, 750] : [0, 690, 1820, 750]],
      [L('#8 로봇 온전 · 감점 · 순위', '#8 Robot intact · penalties · ranking'), li([L('런 내내 로봇이 온전하면 11점', 'Robot intact for the whole run: 11'), L('#9 펫토이·디스펜서를 망가뜨리거나 옮기면 1개당 −10 (시뮬레이터: 로봇이 닿으면)', '#9 Damaging or moving the toy or dispenser: −10 each (simulator: when the robot touches it)'), L('리셋 요청 −3 (런당 1회)', 'Reset request: −3 (once per run)'), L('모든 항목은 런이 끝난 시점에 채점', 'Everything is scored at the end of the run'), L('순위 = (두 라운드 최고점 + 평균점) ÷ 2', 'Rank = (best + average of two rounds) ÷ 2')]), null]]; },
  };

  // ───── 등록 ─────
  const MAKE = { 1: m1, 2: m2, 3: m3, 4: m4, 5: m5 };
  const TITLES = ['UMC 1 · 바코드 내비게이터', 'UMC 2 · 사다리 세기', 'UMC 3 · 컵 밀기', 'UMC 4 · 도형 탐정', 'UMC 5 · 10cm 앞에 서기'];
  const list = [];
  for (let n = 1; n <= 5; n++) for (const d of ['jr', 'sr']) {
    const key = `umc${n}_${d}`, mat = MAKE[n](d);
    mat.label = TITLES[n - 1] + ' (' + DIVN[d][0] + ')'; mat.key = key;
    U.mats[key] = mat; list.push([key, mat.label]);
  }
  const glist = [], GT = 'Robofest 2027 게임 · RoboPetCare';
  if (U.i18n) U.i18n[GT] = ['Robofest 2027 Game · RoboPetCare', 'Robofest 2027 ゲーム · RoboPetCare', 'Robofest 2027 比赛 · RoboPetCare', 'Robofest 2027 Juego · RoboPetCare'];
  for (const d of ['jr', 'sr']) {
    const key = 'rf27_' + d, mat = game(d);
    mat.label = GT + ' (' + DIVN[d][0] + ')'; mat.key = key;
    if (U.i18n) U.i18n[mat.label] = U.i18n[GT].map((n, i) => n + ' (' + DIVN[d][i + 1] + ')');
    U.mats[key] = mat; glist.push([key, mat.label]);
  }
  const sel = document.querySelector('#simMat');
  const addGroup = (title, items) => {
    if (!sel || sel.querySelector('[value="' + items[0][0] + '"]')) return;
    const og = document.createElement('optgroup'); og.dataset.ko = title; og.label = U.T(title);
    for (const [key, label] of items) { const o = document.createElement('option'); o.value = key; o.dataset.ko = label; o.textContent = U.T(label); og.appendChild(o); }
    sel.insertBefore(og, sel.querySelector('option[value="image"]'));
  };
  addGroup('UMC 미지 미션 챌린지', list);
  addGroup(GT, glist);
  for (const m of Object.values(U.mats)) if (m && m.umc && !m._hi) { const d0 = m.draw; m.draw = function (c) { d0.call(this, c); hiDraw(m, c); }; m._hi = 1; }
  // ───── 화면 끌기 ─────
  // · "위에서" 시점: 왼쪽 버튼(또는 한 손가락)으로 끌면 화면이 움직입니다. (원래는 아무 동작도 없었음)
  // · "비스듬히" 시점: 왼쪽 끌기는 회전 그대로, Shift+끌기 · 오른쪽 버튼 끌기 · 두 손가락 끌기로 화면이 움직입니다.
  // · UMC·Robofest 경기장을 고르면 점수판에 가리지 않도록 화면을 점수판 높이만큼 자동으로 내립니다.
  const view = {
    save() { const c = U.cam && U.cam(), k = U.ctl && U.ctl(); return c && k ? { p: c.position.clone(), t: k.target.clone() } : null; },
    load(v) { const c = U.cam && U.cam(), k = U.ctl && U.ctl(); if (v && c && k) { c.position.copy(v.p); k.target.copy(v.t); k.update(); } },
    buttons() {
      const k = U.ctl && U.ctl(), q = U.sim(); if (!k || !k.mouseButtons) return;
      const top = q && q.cam === 'top';
      k.enablePan = true; k.screenSpacePanning = true;
      k.mouseButtons.LEFT = top ? 2 : 0;   // three.js MOUSE: ROTATE 0, PAN 2
      if (k.touches) k.touches.ONE = top ? 1 : 0; // TOUCH: ROTATE 0, PAN 1
    },
    lower() { // 점수판 높이의 절반만큼 화면을 아래로
      const k = U.ctl && U.ctl(), q = U.sim(), box = document.querySelector('#simScoreBox'), cv = document.querySelector('#simCanvas');
      if (!k || !cur() || !box || box.hidden || !cv || (q && q.cam === 'follow') || typeof k._pan !== 'function') return;
      const b = box.getBoundingClientRect(), c = cv.getBoundingClientRect(), cover = Math.max(0, Math.min(b.bottom, c.bottom) - c.top);
      if (cover < 40) return;
      k._pan(0, Math.min(cover * 0.55, c.height * 0.35)); k.update();
    },
    after(auto) { setTimeout(() => { view.buttons(); }, 0); if (auto) setTimeout(() => { view.buttons(); view.lower(); }, 260); },
  };
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-simcam]')) view.after(true); }, true);
  if (sel) sel.addEventListener('change', () => view.after(true));
  const mode = document.querySelector('#modeSim'); if (mode) mode.addEventListener('click', () => view.after(true));
  view.after(false);
  // 설명 단계 이동·새 배치로 경기장을 다시 그릴 때는 사용자가 맞춰 둔 화면을 그대로 둡니다.
  const redraw = () => { const m = cur(); if (m && sel && typeof sel.onchange === 'function') { const v = view.save(); sel.value = m.key; R = null; sel.onchange({ target: sel }); view.load(v); view.after(false); } };
  window.__umcGuide = act => {
    const m = cur(); if (!m) return;
    const n = stepsOf(m).length;
    if (act === 'on') { GUIDE.on = true; GUIDE.i = 0; }
    else if (act === 'off') GUIDE.on = false;
    else if (act === 'next') GUIDE.i = Math.min(n - 1, GUIDE.i + 1);
    else if (act === 'prev') GUIDE.i = Math.max(0, GUIDE.i - 1);
    redraw();
  };
  // 새 배치: 현재 미션의 배치를 버리고 경기장을 다시 불러옵니다 (프로그램은 멈춥니다).
  window.__umcNew = () => {
    const m = cur(); if (!m || !sel) return;
    delete LAY[m.umc]; redraw();
  };
  // 경기장을 고를 때마다 새 배치
  if (sel) sel.addEventListener('change', e => { GUIDE.on = false; const m = U.mats[e.target.value]; if (m && m.umc) { delete LAY[m.umc]; R = null; } }, true);

  // ───── 자동 학습을 경기 조건에 맞추기 (app.js 의 window.__trx 훅) ─────
  // · 학습기의 경기장(16개)마다 이 미션의 배치를 새로 뽑습니다 (미지 미션처럼 매번 다른 배치).
  //   바닥 그림·벽·물체·출발 위치가 경기장마다 따로이고, 런 기록(삐 소리·화면 숫자·출발 구역 등)도 경기장마다 따로 셉니다.
  // · 점수는 위 점수판과 같은 채점표 점수(주니어·시니어 조건, 2분 제한)를 100점 만점으로 바꿔 씁니다.
  const startOf = m => { const s = m.start || {}; return { x: s.x || 0, z: s.z || 0, th: s.th || 0 }; };
  const cloneRun = r => r && { ...r, writes: r.writes.slice(), x: JSON.parse(JSON.stringify(r.x || {})) };
  window.__trx = {
    task: () => (cur() ? 'UMC' : null),
    world(w, mk) {
      const m = cur(); if (!m) { w.props = mk(); return; }
      const n = m.umc, keep = LAY[n], had = Object.prototype.hasOwnProperty.call(LAY, n);
      const s0 = startOf(m);
      try {
        LAY[n] = GEN[n](); w.umcLay = LAY[n];
        const s1 = startOf(m); w.px += s1.x - s0.x; w.pz += s1.z - s0.z; w.pth += s1.th - s0.th;
        if (w.wbs && 'head' in w.wbs) w.wbs.head = w.pth;
        w.props = mk();
        const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
        const g = c.getContext('2d'); m.draw(g); w.matC = c; w.matD = g.getImageData(0, 0, m.w, m.h).data;
        w.walls = (m.walls || []).map(a => ({ x0: a[0] - a[2] / 2, x1: a[0] + a[2] / 2, z0: a[1] - a[3] / 2, z1: a[1] + a[3] / 2, h: a[4] ?? 80 }));
        w.umcR = null;
      } finally { if (had) LAY[n] = keep; else delete LAY[n]; }
    },
    save(c) { c.umcR = R; const m = cur(); if (m && !c.umcLay && LAY[m.umc]) c.umcLay = LAY[m.umc]; },
    load(c) { R = c.umcR || null; const m = cur(); if (m && c.umcLay) LAY[m.umc] = c.umcLay; },
    judge() {
      const m = cur(); GUIDE.on = false; let acc = 1;
      const score = () => {
        const keep = R, sim = U.sim(), run = sim.running;
        R = cloneRun(keep); sim.running = { stopped: true }; // 이 순간 런이 끝났다고 보고 채점 (기록은 건드리지 않음)
        try { m.info(); return R ? { total: R.total || 0, el: R.el || 0, ended: R.ended } : { total: 0, el: 0 }; }
        finally { R = keep; sim.running = run; }
      };
      return {
        step(dt) { acc += dt; if (acc >= 0.05) { acc = 0; m.info(); } }, // 점수판과 같은 간격으로 런을 따라감
        over: () => !!(R && R.frozen), // 2분이 지나면 이 경기장은 끝
        result() {
          const r = score(), pct = 100 * r.total / (m.max || 100);
          return { pct, done: r.total >= m.max, tDone: r.total >= m.max ? r.el : null, note: `${r.total}/${m.max}${L('점', ' pts')}` };
        },
      };
    },
    info() { const m = cur(); return m ? { label: U.T(m.label), task: m.task(), max: m.max, limit: LIMIT } : null; },
  };
  // 학습 창: UMC·게임 경기장이면 과제 설명·시간 제한(2분)을 경기 조건으로 맞추고, 센서 없이 움직임만 조합하는 "블록 자동 생성"은 끕니다.
  const trainUI = () => {
    const m = cur(), box = document.querySelector('#trTask'); if (!m || !box) return;
    box.innerHTML = `<b>${esc(U.T(m.label))}</b> — ${esc(m.task())}<br><span style="color:#3d8bfd">${esc(L('경기 조건으로 학습: 16개 경기장마다 배치를 무작위로 새로 놓고, 점수판과 같은 채점표 점수(만점 ' + m.max + '점, 2분)로 숫자를 찾습니다.', 'Trained on the match rules: each of the 16 fields gets a new random layout, scored with the same scorecard as the panel (max ' + m.max + ' pts, 2 min).'))}</span>`;
    const tm = document.querySelector('#trTime'); if (tm && !tm.dataset.umc) { tm.value = LIMIT; tm.dataset.umc = '1'; }
    const gen = document.querySelector('#trModeGen');
    if (gen) { gen.disabled = true; gen.title = L('미지 미션은 배치가 매번 달라 센서를 써야 하므로, 블록 자동 생성 대신 숫자 튜닝으로 학습합니다.', 'Unknown missions change every time and need sensors, so they are trained by number tuning instead of block generation.'); }
    const tune = document.querySelector('#trModeTune'); if (tune && tune.getAttribute('aria-pressed') !== 'true') tune.click();
  };
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#simTrain')) setTimeout(trainUI, 0); });
  window.__umcDebug = { lay, LAY, run: () => R, guide: GUIDE, steps: stepsOf };
})();
