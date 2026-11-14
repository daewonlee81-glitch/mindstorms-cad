// line2.js — 학습 창 "라인트레이싱 자동 생성"에 컬러센서 2개 방식 (app.js 다음에 불러옵니다. 연결 고리: tools/patch_cadx.py 9번)
//   · 학습 창의 "제어 방식" 아래 "센서" 선택: 1개(선 가장자리) / 2개(선 양쪽 — 왼쪽·오른쪽 센서).
//   · 2개일 때 오차 = 왼쪽 반사광 − 오른쪽 반사광 (선이 왼쪽 센서 아래로 가면 음수 → 왼쪽으로 돌기).
//       온오프: 왼쪽이 선(어두움)이면 한쪽으로, 오른쪽이 선이면 반대쪽으로, 둘 다 아니면 직진
//       P / PD / PID: 회전 = 오차 × Kp (+ 오차 변화 × Kd, + 누적 오차 × Ki)
//   · 채점: 두 센서의 가운데 점이 선 위를 지나간 칸을 셉니다 (센서 1개일 때는 그 센서 자리).
//   · 로봇에 컬러센서가 2개 이상일 때만 고를 수 있고, 처음 값은 2개입니다.
(() => {
  'use strict';
  const X = window.__cad && window.__cad.ext; if (!X) return;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '센서': ['Sensors', 'センサー', '传感器', 'Sensores'],
    '1개 — 선 가장자리 따라가기': ['1 — follow the line edge', '1個 — 線の端をたどる', '1 个 — 沿线的边缘', '1 — seguir el borde de la línea'],
    '2개 — 선 양쪽 (왼쪽 {0} · 오른쪽 {1})': ['2 — both sides of the line (left {0} · right {1})', '2個 — 線の両側 (左 {0} · 右 {1})', '2 个 — 线的两侧 (左 {0} · 右 {1})', '2 — a ambos lados (izquierda {0} · derecha {1})'],
    '2개 — 컬러센서가 2개 있어야 합니다': ['2 — needs two colour sensors', '2個 — カラーセンサーが2個必要です', '2 个 — 需要两个颜色传感器', '2 — necesita dos sensores de color'],
    '센서 2개: 선을 두 센서 사이에 두고 달려요. 왼쪽 센서가 선을 밟으면 왼쪽으로, 오른쪽 센서가 밟으면 오른쪽으로 돌아요.': ['Two sensors: the line runs between them. When the left sensor touches the line the robot turns left, when the right one does it turns right.', 'センサー2個: 線を2つのセンサーの間にして走ります。左のセンサーが線を踏むと左へ、右が踏むと右へ曲がります。', '两个传感器：让线位于两个传感器之间。左传感器碰到线就向左转，右传感器碰到就向右转。', 'Dos sensores: la línea va entre ellos. Si el sensor izquierdo pisa la línea gira a la izquierda; si lo hace el derecho, a la derecha.'],
    '오차 = 왼쪽 반사광 − 오른쪽 반사광 (선 가운데면 0)': ['Error = left reflection − right reflection (0 when centred on the line)', '誤差 = 左の反射光 − 右の反射光 (線の真ん中なら 0)', '误差 = 左反射光 − 右反射光 (在线中间时为 0)', 'Error = reflexión izquierda − reflexión derecha (0 si está centrado)'],
    '오차': ['error', '誤差', '误差', 'error'], '이전 오차': ['previous error', '前の誤差', '上次误差', 'error anterior'], '누적 오차': ['total error', '累積誤差', '累计误差', 'error acumulado'],
    '무한 반복:': ['Repeat forever:', 'ずっと繰り返す:', '无限重复:', 'Repetir siempre:'],
    '만약 포트 {0} 반사광 < {1} 이라면: 회전 {2}': ['If port {0} reflection < {1}: turn {2}', 'もしポート {0} の反射光 < {1} なら: 回転 {2}', '如果端口 {0} 反射光 < {1}: 转向 {2}', 'Si reflexión del puerto {0} < {1}: girar {2}'],
    '아니면 만약 포트 {0} 반사광 < {1} 이라면: 회전 {2}': ['Else if port {0} reflection < {1}: turn {2}', 'でなければもしポート {0} の反射光 < {1} なら: 回転 {2}', '否则如果端口 {0} 反射光 < {1}: 转向 {2}', 'Si no, si reflexión del puerto {0} < {1}: girar {2}'],
    '아니면: 회전 0 (직진)': ['Else: turn 0 (straight)', 'でなければ: 回転 0 (直進)', '否则: 转向 0 (直行)', 'Si no: girar 0 (recto)'],
    '{0} = 포트 {1} 반사광 − 포트 {2} 반사광': ['{0} = port {1} reflection − port {2} reflection', '{0} = ポート {1} の反射光 − ポート {2} の反射光', '{0} = 端口 {1} 反射光 − 端口 {2} 反射光', '{0} = reflexión puerto {1} − reflexión puerto {2}'],
    '회전 = {0} × {1}': ['turn = {0} × {1}', '回転 = {0} × {1}', '转向 = {0} × {1}', 'giro = {0} × {1}'],
    '회전 = {0} × {1} + ({0} − {2}) × {3}': ['turn = {0} × {1} + ({0} − {2}) × {3}', '回転 = {0} × {1} + ({0} − {2}) × {3}', '转向 = {0} × {1} + ({0} − {2}) × {3}', 'giro = {0} × {1} + ({0} − {2}) × {3}'],
    '회전 = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}': ['turn = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}', '回転 = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}', '转向 = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}', 'giro = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}'],
    '{0} = {0} + {1}': ['{0} = {0} + {1}', '{0} = {0} + {1}', '{0} = {0} + {1}', '{0} = {0} + {1}'],
    '{0} = {1}': ['{0} = {1}', '{0} = {1}', '{0} = {1}', '{0} = {1}'], '{0} = 0': ['{0} = 0', '{0} = 0', '{0} = 0', '{0} = 0'],
    '속도 {0} mm/초, 회전 (도/초)으로 계속 주행': ['Keep driving at {0} mm/s with that turn (°/s)', '速度 {0} mm/秒、その回転 (度/秒) で走り続ける', '以 {0} mm/秒 和该转向 (度/秒) 持续行驶', 'Seguir a {0} mm/s con ese giro (°/s)'],
  };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.split('{' + k + '}').join(v); }); return s; };
  const KEY = 'mscad.line2';
  const want = () => { try { const v = localStorage.getItem(KEY); return v == null ? 2 : +v; } catch (e) { return 2; } };
  const setWant = v => { try { localStorage.setItem(KEY, String(v)); } catch (e) {} };
  // 왼쪽·오른쪽 컬러센서 (로봇 기준 x 가 큰 쪽이 왼쪽 — simports.js 와 같음). 가장 멀리 떨어진 두 개.
  const sensorsLR = () => {
    const R = X.robot, cs = ((R && R.sensors) || []).filter(s => s.kind === 'color' && s.port);
    if (cs.length < 2) return null;
    let best = null, d = -1;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const dd = Math.abs(cs[i].x - cs[j].x); if (dd > d) { d = dd; best = [cs[i], cs[j]]; } }
    if (!best || d < 8) return null; // 좌우로 거의 같은 자리면 2개 방식이 안 됨
    return best[0].x > best[1].x ? best : [best[1], best[0]];
  };
  // 자동 생성(라인트레이싱) 모드일 때만 — "제어 방식" 줄이 보일 때. 자동 튜닝(내 프로그램 숫자 고르기)은 예전 채점 그대로.
  const genLine = () => { const c = document.getElementById('trCtrl'); return !!(c && c.offsetParent !== null); };
  const pairS = () => (want() === 2 && genLine() ? sensorsLR() : null);
  const pair = () => { const s = pairS(); return s ? { L: s[0].port, R: s[1].port } : null; };

  // 학습 사양 (app.js E0 와 같은 모양): dims · fn(경기장 하나 주행) · describe(설명 줄) · blocks(블록)
  const spec = (n, Tapp) => {
    const P = pair(); if (!P) return null;
    const { L, R } = P;
    const q = (u, lo, hi) => m => Math.round(Math.max(lo, Math.min(hi, m)) * u) / u;
    const D = { S: { m0: 150, sd0: 60, q: q(1, 30, 400) }, T: { m0: 50, sd0: 15, q: q(1, 5, 95) }, A: { m0: 0, sd0: 80, q: q(1, -360, 360) }, Kp: { m0: 0, sd0: 3, q: q(100, -10, 10) }, Kd: { m0: 0, sd0: 12, q: q(10, -60, 60) }, Ki: { m0: 0, sd0: .02, q: q(1e3, -.2, .2) } };
    const names = { onoff: ['S', 'T', 'A'], p: ['S', 'Kp'], pd: ['S', 'Kp', 'Kd'], pid: ['S', 'Kp', 'Ki', 'Kd'] }[n];
    if (!names) return null;
    const vE = t('오차'), vP = t('이전 오차'), vI = t('누적 오차');
    const fn = async (u, h) => {
      let prev = 0, acc = 0;
      for (;;) {
        const l = u.wbColorVal(L, 'reflection'), r = u.wbColorVal(R, 'reflection');
        let g;
        if (n === 'onoff') g = l < h[1] ? -h[2] : r < h[1] ? h[2] : 0;
        else { const e = l - r; if (n === 'p') g = e * h[1]; else if (n === 'pd') { g = e * h[1] + (e - prev) * h[2]; prev = e; } else { acc += e; g = e * h[1] + acc * h[2] + (e - prev) * h[3]; prev = e; } }
        await u.wbDrive(h[0], g); await u.wait(.01);
      }
    };
    const describe = h => {
      const o = [];
      if (n === 'pd' || n === 'pid') o.push(t('{0} = 0', vP));
      if (n === 'pid') o.push(t('{0} = 0', vI));
      o.push(t('무한 반복:'));
      if (n === 'onoff') o.push('  ' + t('만약 포트 {0} 반사광 < {1} 이라면: 회전 {2}', L, h[1], -h[2]), '  ' + t('아니면 만약 포트 {0} 반사광 < {1} 이라면: 회전 {2}', R, h[1], h[2]), '  ' + t('아니면: 회전 0 (직진)'));
      else {
        o.push('  ' + t('{0} = 포트 {1} 반사광 − 포트 {2} 반사광', vE, L, R));
        if (n === 'p') o.push('  ' + t('회전 = {0} × {1}', vE, h[1]));
        else if (n === 'pd') o.push('  ' + t('회전 = {0} × {1} + ({0} − {2}) × {3}', vE, h[1], vP, h[2]));
        else o.push('  ' + t('{0} = {0} + {1}', vI, vE), '  ' + t('회전 = {0} × {1} + {2} × {3} + ({0} − {4}) × {5}', vE, h[1], vI, h[2], vP, h[3]));
      }
      o.push('  ' + t('속도 {0} mm/초, 회전 (도/초)으로 계속 주행', h[0]));
      if (n === 'pd' || n === 'pid') o.push('  ' + t('{0} = {1}', vP, vE));
      return o;
    };
    const blocks = h => {
      const num = v => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
      const gv = v => ({ block: { type: 'variables_get', fields: { VAR: { name: v } } } });
      const ar = (op, a, b) => ({ block: { type: 'math_arithmetic', fields: { OP: op }, inputs: { A: a, B: b } } });
      const refl = p => ({ block: { type: 'rm_color_value', fields: { PORT: p, WHAT: 'reflection' } } });
      const setv = (v, val) => ({ type: 'variables_set', fields: { VAR: { name: v } }, inputs: { VALUE: val } });
      const drive = turn => ({ type: 'rm_drive_drive', inputs: { SPEED: num(h[0]), TURN: turn } });
      const lt = (a, b) => ({ block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: a, B: b } } });
      const chain = list => { let c = null; for (const b of list.slice().reverse()) c = { ...b, ...(c ? { next: { block: c } } : {}) }; return c; };
      let body;
      if (n === 'onoff') body = [{ type: 'controls_if', extraState: { elseIfCount: 1, hasElse: true }, inputs: { IF0: lt(refl(L), num(h[1])), DO0: { block: drive(num(-h[2])) }, IF1: lt(refl(R), num(h[1])), DO1: { block: drive(num(h[2])) }, ELSE: { block: drive(num(0)) } } }];
      else if (n === 'p') body = [drive(ar('MULTIPLY', ar('MINUS', refl(L), refl(R)), num(h[1])))];
      else {
        const kp = ar('MULTIPLY', gv(vE), num(h[1])), kd = ar('MULTIPLY', ar('MINUS', gv(vE), gv(vP)), num(h[n === 'pid' ? 3 : 2]));
        const turn = n === 'pid' ? ar('ADD', ar('ADD', kp, ar('MULTIPLY', gv(vI), num(h[2]))), kd) : ar('ADD', kp, kd);
        body = [setv(vE, ar('MINUS', refl(L), refl(R))), ...(n === 'pid' ? [{ type: 'math_change', fields: { VAR: { name: vI } }, inputs: { DELTA: gv(vE) } }] : []), drive(turn), setv(vP, gv(vE))];
      }
      const top = [...(n === 'pd' || n === 'pid' ? [setv(vP, num(0))] : []), ...(n === 'pid' ? [setv(vI, num(0))] : []), { type: 'rm_forever', inputs: { DO: { block: chain(body) } } }];
      return { type: 'rm_start', x: 30, y: 30, next: { block: chain(top) } };
    };
    return { N: 48, dims: names.map(k => D[k]), minT: 0, ctrl: n, fn, describe, blocks, sensors: 2 };
  };

  // 학습 창: "제어 방식" 아래 "센서" 고르기 + 설명 한 줄
  const css = document.createElement('style');
  css.textContent = '#trSensRow{margin-top:4px}#trSens{width:100%}#trSensNote{margin-top:4px;font-size:12px;line-height:1.45;opacity:.9}#trSensNote .rule{opacity:.8}';
  document.head.appendChild(css);
  const note = () => {
    const info = document.getElementById('trCtrlInfo'); if (!info) return;
    let el = document.getElementById('trSensNote');
    const on = !!pair();
    if (!on) { if (el) el.remove(); return; }
    if (!el || el.parentNode !== info) { el = document.createElement('div'); el.id = 'trSensNote'; info.appendChild(el); }
    const txt = `<b>${t('센서 2개: 선을 두 센서 사이에 두고 달려요. 왼쪽 센서가 선을 밟으면 왼쪽으로, 오른쪽 센서가 밟으면 오른쪽으로 돌아요.')}</b>` + (document.getElementById('trCtrl') && document.getElementById('trCtrl').value !== 'onoff' ? `<br><span class="rule">${t('오차 = 왼쪽 반사광 − 오른쪽 반사광 (선 가운데면 0)')}</span>` : '');
    if (el.innerHTML !== txt) el.innerHTML = txt;
  };
  const mount = () => {
    const ctrl = document.getElementById('trCtrl'); if (!ctrl) return;
    const row0 = ctrl.closest('.trset') || ctrl.parentElement;
    let row = document.getElementById('trSensRow');
    if (!row || row.previousElementSibling !== row0) {
      if (row) row.remove();
      row = document.createElement('div'); row.id = 'trSensRow'; row.className = row0.className; row.style.cssText = row0.style.cssText;
      row.innerHTML = '<label for="trSens"></label><select id="trSens"><option value="1"></option><option value="2"></option></select>';
      row0.after(row);
      row.querySelector('select').onchange = e => { setWant(+e.target.value); render(); };
    }
    render();
  };
  const render = () => {
    const row = document.getElementById('trSensRow'); if (!row) return;
    const lr = sensorsLR(), sel = row.querySelector('select');
    row.querySelector('label').textContent = t('센서');
    sel.options[0].textContent = t('1개 — 선 가장자리 따라가기');
    sel.options[1].textContent = lr ? t('2개 — 선 양쪽 (왼쪽 {0} · 오른쪽 {1})', lr[0].port, lr[1].port) : t('2개 — 컬러센서가 2개 있어야 합니다');
    sel.options[1].disabled = !lr;
    sel.value = lr && want() === 2 ? '2' : '1';
    // "제어 방식" 줄이 숨겨지면(자동 튜닝 모드 등) 같이 숨김
    const row0 = row.previousElementSibling; row.hidden = !!(row0 && (row0.hidden || getComputedStyle(row0).display === 'none'));
    note();
  };
  setInterval(() => { const dlg = document.getElementById('trCtrl'); if (dlg) mount(); }, 500);
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'trCtrl') setTimeout(note, 0); });

  window.__line2 = { pair, pairS, spec, sensorsLR };
})();
