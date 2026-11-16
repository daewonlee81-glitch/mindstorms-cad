// nnviz.js — 「🔍 신경망 들여다보기」: 자동 튜닝 학습의 🧠 신경망(센서 → 숨은 칸 6개 → 속도·회전)을 학생이 알기 쉽게 보여 줍니다.
//   · 연결선 하나하나 = 가중치. 주황 = +(그대로 전달), 파랑 = −(반대로 바꿔 전달), 굵기 = 크기(볼륨 다이얼).
//   · 칸(동그라미)을 누르면 그 칸의 계산을 숫자로: 입력 × 가중치를 모두 더하고(+ 바이어스) → tanh 로 −1~+1 사이로 눌러 줌.
//   · 멈춰 있을 때: 입력 막대를 직접 움직여 보며 출력이 어떻게 바뀌는지 실험.
//   · 「🧠 신경망으로 주행」이 달리는 동안: 실제 센서 값과 신호 흐름(선 밝기 = 입력 × 가중치)을 실시간으로.
//   · 학습(뉴로에볼루션) 중: 더 좋은 신경망을 찾을 때마다 바뀐 가중치를 노랗게 표시.
// 열기: 학습 창 🧠 신경망 카드의 「🔍 신경망 들여다보기」, 또는 시뮬레이터 칸의 같은 버튼(「🧠 신경망으로 주행」 블록이 있을 때).
(() => {
  'use strict';
  const W = window.__wb, U = window.__umc, X = window.__cad && window.__cad.ext;
  if (!W || !U || !X || !window.__nnF) return;
  const EN = {
    '🔍 신경망 들여다보기': '🔍 Look inside the neural network', '입력': 'Inputs', '숨은 칸': 'Hidden cells', '출력': 'Outputs', '바이어스 (항상 1)': 'bias (always 1)',
    '속도': 'speed', '회전': 'turn', '실행 중 — 실제 센서 값': 'running — real sensor values', '멈춤 — 입력 막대를 움직여 실험해 보세요': 'stopped — move the input sliders to experiment',
    '학습 중 — 지금까지 가장 좋은 신경망': 'training — the best network so far', '신경망이 아직 없어요. 학습 창에서 🧠 신경망으로 학습하거나 「🧠 신경망으로 주행」 블록을 넣으세요.': 'No network yet. Train with 🧠 Neural network or add a 「🧠 Drive with neural network」 block.',
    '계산': 'Calculation', '칸을 누르면 그 칸의 계산을 보여 줘요': 'Click a circle to see its calculation', '모든 가중치 보기': 'Show all weights',
    '가중치가 뭐예요?': 'What is a weight?', '더 좋은 신경망 발견': 'better network found', '바뀐 가중치': 'weights changed', '가장 많이 바뀐 것': 'changed most',
    '반사광': 'reflection', '거리': 'distance', '번': '',
  };
  const KO = {
    help: '<b>가중치</b>는 연결선마다 붙은 숫자예요. <b>볼륨 다이얼</b>처럼 신호를 얼마나 크게 전달할지 정해요.<br>' +
      '• <b style="color:#F57C00">주황(+)</b>: 들어온 신호를 그대로 전달 · <b style="color:#1E88E5">파랑(−)</b>: 반대로 바꿔 전달 · 0에 가까우면 거의 끊김 · 선이 굵을수록 숫자가 큼<br>' +
      '• 칸 하나의 계산 = (입력 × 가중치)를 모두 더하고 + <b>바이어스</b>(항상 1인 입력의 가중치) → <b>tanh</b>로 −1 ~ +1 사이로 눌러 줌<br>' +
      '• <b>학습</b>(뉴로에볼루션) = 가중치 숫자를 조금씩 바꿔 16개 경기장에서 시험해 보고, 점수가 좋은 숫자를 남기는 것. 사람이 규칙을 쓰지 않아도 숫자가 스스로 맞춰져요.',
  };
  const EHELP = '<b>Weights</b> are the numbers on each connection — like <b>volume knobs</b> deciding how strongly a signal passes.<br>• <b style="color:#F57C00">orange (+)</b>: passes the signal as is · <b style="color:#1E88E5">blue (−)</b>: flips it · near 0: almost cut · thicker line = bigger number<br>• One cell = add up (input × weight) + <b>bias</b> (weight of an input that is always 1) → squash to −1 … +1 with <b>tanh</b><br>• <b>Training</b> (neuroevolution) = nudge the numbers, test on 16 fields, keep the numbers that score best.';
  const ko = () => (document.documentElement.lang || 'ko').slice(0, 2) === 'ko';
  const t = k => (ko() ? (KO[k] || k) : (k === 'help' ? EHELP : EN[k] || k));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const f2 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  const tanh = v => { v = Math.max(-10, Math.min(10, v)); const e = Math.exp(2 * v); return (e - 1) / (e + 1); };

  // ───────── 신경망 계산 (trainmodel.js 와 같은 순서: 숨은 칸마다 [입력 n개, 바이어스], 출력마다 [숨은 H개, 바이어스]) ─────────
  const run = (net, x) => {
    const n = x.length, w = net.W, H = net.H || 6; let k = 0; const hs = [], hz = [], hw = [];
    for (let j = 0; j < H; j++) { const ws = w.slice(k, k + n + 1); let s = ws[n]; for (let i = 0; i < n; i++) s += ws[i] * x[i]; hz.push(s); hs.push(tanh(s)); hw.push(ws); k += n + 1; }
    const os = [], oz = [], ow = [];
    for (let j = 0; j < 2; j++) { const ws = w.slice(k, k + H + 1); let s = ws[H]; for (let i = 0; i < H; i++) s += ws[i] * hs[i]; oz.push(s); os.push(tanh(s)); ow.push(ws); k += H + 1; }
    return { x, hs, hz, hw, os, oz, ow, speed: Math.round(os[0] * (net.S || 300)), turn: Math.round(os[1] * (net.T || 180)) };
  };

  // 실제 주행 중 입력 엿보기: window.__nnF 를 감싸 마지막 호출을 기억 (학습 중 16개 경기장 호출은 무시)
  const orig = window.__nnF; let live = null, frameNo = 0;
  (function tick() { frameNo++; requestAnimationFrame(tick); })(); // 화면 번호 — 느린 컴퓨터(1초에 2장 미만)에서도 '방금 호출됨'을 알아보도록
  window.__nnF = (net, x) => { const r = orig(net, x); try { if (!(U.sim && U.sim() && U.sim().training)) live = { W: net.W, x: x.slice(), at: performance.now(), f: frameNo }; } catch (e) { } return r; };

  const TM = () => window.__trainModel;
  const label = x => { try { return TM().inLabel([x]); } catch (e) { return x.k + ' ' + x.p; } };
  const wsNet = () => {
    try { const ws = W.ws(), b = ws && ws.getAllBlocks(false).find(q => q.type === 'rm_nn_drive' && q.isEnabled()); if (!b) return null; const d = JSON.parse(b.data || '{}'); if (!d.in || !d.W) return null; return { ins: d.in, H: d.H || 6, W: d.W, S: d.S || 300, T: d.T || 180, src: 'block' }; } catch (e) { return null; }
  };
  const trNet = () => { const n = TM() && TM().nn; return n && n.W ? { ...n, src: 'train' } : null; };
  const training = () => !!(U.sim && U.sim() && U.sim().training);
  const pickNet = () => (training() ? trNet() : (wsNet() || trNet()));

  // ───────── 창 ─────────
  const css = document.createElement('style');
  css.textContent = `#nnViz{position:fixed;left:16px;bottom:16px;width:min(800px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;z-index:100002;background:var(--bg,#fff);color:inherit;border:1px solid rgba(127,127,127,.35);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:8px 12px 10px;font-size:12px}
#nnViz .hd{display:flex;align-items:center;gap:10px;cursor:move;user-select:none;margin-bottom:4px}#nnViz .hd b{font-size:14px}#nnViz .hd .sp{flex:1}
#nnViz canvas{width:100%;display:block;border-radius:8px;background:rgba(127,127,127,.06);cursor:pointer}#nnViz .calc{margin-top:6px;padding:6px 8px;border-radius:8px;background:rgba(126,87,194,.08);line-height:1.7;font-size:13px}
#nnViz .calc .p{color:#F57C00;font-weight:600}#nnViz .calc .n{color:#1E88E5;font-weight:600}#nnViz .sl{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}#nnViz .sl label{display:flex;gap:4px;align-items:center}
#nnViz details{margin-top:6px}#nnViz table{border-collapse:collapse;font-size:11px;margin-top:4px}#nnViz td,#nnViz th{border:1px solid rgba(127,127,127,.25);padding:2px 5px;text-align:right}#nnViz .help{line-height:1.6}#nnViz .chg{margin-top:4px;color:#B8860B}`;
  document.head.appendChild(css);
  let win = null, cv = null, raf = 0, sel = { t: 'h', i: 0 }, sliders = {}, prevW = null, changed = null, changedAt = 0, chgInfo = '', geo = null;
  const open = () => {
    if (!win) {
      win = document.createElement('div'); win.id = 'nnViz';
      win.innerHTML = `<div class="hd"><b></b><span class="st"></span><span class="sp"></span><button class="x">✕</button></div><canvas width="1600" height="760"></canvas>
<div class="sl"></div><div class="calc"></div><div class="chg"></div><details class="hp"><summary></summary><div class="help"></div></details><details class="tb"><summary></summary><div class="tbl"></div></details>`;
      document.body.appendChild(win); cv = win.querySelector('canvas');
      win.querySelector('.x').onclick = () => { win.hidden = true; cancelAnimationFrame(raf); };
      const hd = win.querySelector('.hd'); let d = null;
      hd.onpointerdown = e => { if (e.target.closest('button')) return; d = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop }; hd.setPointerCapture(e.pointerId); };
      hd.onpointermove = e => { if (!d) return; win.style.bottom = 'auto'; win.style.left = Math.max(0, e.clientX - d.x) + 'px'; win.style.top = Math.max(0, e.clientY - d.y) + 'px'; };
      hd.onpointerup = () => { d = null; };
      cv.onclick = e => {
        if (!geo) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 800 / r.width, y = (e.clientY - r.top) * 380 / r.height;
        for (const g of geo) if ((x - g.x) ** 2 + (y - g.y) ** 2 < 22 * 22) { sel = { t: g.t, i: g.i }; break; }
      };
    }
    win.hidden = false; cancelAnimationFrame(raf); loop();
  };
  document.addEventListener('click', e => { if (e.target.closest && (e.target.closest('#trNnViz') || e.target.closest('#nnVizBtn'))) open(); });
  // 학습 중 가장 좋은 신경망이 실제로 바뀐 때만 (같은 값으로 다시 불려도 무시)
  let better = 0;
  window.addEventListener('mscad:nnbest', () => {
    const n = trNet(); if (!n) return;
    if (!prevW || prevW.length !== n.W.length) { prevW = n.W.slice(); better = 0; return; }
    const d = n.W.map((v, i) => v - prevW[i]); if (!d.some(v => Math.abs(v) > 1e-9)) return;
    changed = d; changedAt = performance.now(); prevW = n.W.slice(); better++;
  });

  // 입력 값: 달리는 중이면 실제 센서, 아니면 막대
  const inputs = net => {
    const same = live && live.W.length === net.W.length && live.W.every((v, i) => v === +net.W[i]);
    const fresh = same && X.simRunning && (performance.now() - live.at < 500 || frameNo - live.f <= 2); // 0.5초 안 또는 최근 2화면 안에 호출됨
    if (fresh) return { x: live.x, live: true };
    return { x: net.ins.map((q, i) => { const v = sliders[i] ?? (q.k === 'color' ? 50 : 300); return q.k === 'color' ? v / 100 : Math.min(v, 1000) / 1000; }), live: false };
  };
  const rawOf = (q, x) => (q.k === 'color' ? Math.round(x * 100) : Math.round(x * 1000));

  const draw = (net, R, now) => {
    const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 800, 380);
    const fg = getComputedStyle(win).color || '#222', n = net.ins.length, H = net.H || 6;
    const ys = (cnt, top, bot) => Array.from({ length: cnt }, (_, i) => cnt === 1 ? (top + bot) / 2 : top + (bot - top) * i / (cnt - 1));
    const iy = ys(n + 1, 60, 330), hy = ys(H, 50, 340), oy = ys(2, 130, 260), IX = 150, HX = 400, OX = 640;
    geo = [];
    g.font = '600 13px sans-serif'; g.fillStyle = fg; g.textAlign = 'center';
    g.fillText(t('입력'), IX, 24); g.fillText(t('숨은 칸'), HX, 24); g.fillText(t('출력'), OX, 24);
    const glow = changed && now - changedAt < 2500 ? 1 - (now - changedAt) / 2500 : 0;
    const line = (x1, y1, x2, y2, w, sig, wi, hl) => {
      const a = R.live ? Math.min(1, .15 + Math.abs(sig) * 1.2) : .65;
      if (glow && changed && Math.abs(changed[wi]) > 0.005) { g.strokeStyle = `rgba(255,193,7,${(glow * .8).toFixed(2)})`; g.lineWidth = Math.min(12, 3 + Math.abs(w) * 2); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      g.strokeStyle = w >= 0 ? `rgba(245,124,0,${a})` : `rgba(30,136,229,${a})`; g.lineWidth = Math.min(7, .6 + Math.abs(w) * 1.3) * (hl ? 1.2 : 1);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      if (hl) { const mx = x1 + (x2 - x1) * .62, my = y1 + (y2 - y1) * .62; g.font = '600 11px sans-serif'; const s = f2(w), tw = g.measureText(s).width; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(mx - tw / 2 - 3, my - 8, tw + 6, 15); g.fillStyle = w >= 0 ? '#E65100' : '#1565C0'; g.textAlign = 'center'; g.fillText(s, mx, my + 4); }
      if (R.live && Math.abs(sig) > .05) { const f = ((now / 900) % 1), px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f; g.fillStyle = sig >= 0 ? '#F57C00' : '#1E88E5'; g.beginPath(); g.arc(px, py, 2.6, 0, 7); g.fill(); }
    };
    // 입력 → 숨은 칸
    let k = 0;
    for (let j = 0; j < H; j++) { for (let i = 0; i <= n; i++) { const xv = i < n ? R.x[i] : 1, w = R.hw[j][i]; line(IX + 16, iy[i], HX - 16, hy[j], w, w * xv, k + i, (sel.t === 'h' && sel.i === j) || (sel.t === 'i' && sel.i === i)); } k += n + 1; }
    for (let j = 0; j < 2; j++) { for (let i = 0; i < H; i++) { const w = R.ow[j][i]; line(HX + 16, hy[i], OX - 16, oy[j], w, w * R.hs[i], k + i, (sel.t === 'o' && sel.i === j) || (sel.t === 'h' && sel.i === i)); } k += H + 1; }
    // 동그라미
    const node = (x, y, v, lab, side, t2, i, sub) => {
      const s = sel.t === t2 && sel.i === i;
      g.fillStyle = v >= 0 ? `rgba(245,124,0,${(.15 + Math.min(1, Math.abs(v)) * .8).toFixed(2)})` : `rgba(30,136,229,${(.15 + Math.min(1, Math.abs(v)) * .8).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); g.lineWidth = s ? 3 : 1; g.strokeStyle = s ? '#7E57C2' : 'rgba(127,127,127,.6)'; g.stroke();
      g.fillStyle = fg; g.font = '600 11px sans-serif'; g.textAlign = 'center'; g.fillText(v.toFixed(2), x, y + 4);
      g.font = '12px sans-serif'; g.textAlign = side; const lx = side === 'right' ? x - 24 : x + 24;
      g.fillText(lab, lx, y - (sub ? 2 : -4)); if (sub) { g.fillStyle = 'rgba(127,127,127,.95)'; g.fillText(sub, lx, y + 13); }
      geo.push({ x, y, t: t2, i });
    };
    net.ins.forEach((q, i) => node(IX, iy[i], R.x[i], label(q), 'right', 'i', i, `${t(q.k === 'color' ? '반사광' : '거리')} ${rawOf(q, R.x[i])}${q.k === 'color' ? '' : 'mm'}`));
    node(IX, iy[n], 1, t('바이어스 (항상 1)'), 'right', 'b', 0);
    R.hs.forEach((v, j) => node(HX, hy[j], v, `${j + 1}`, 'left', 'h', j));
    node(OX, oy[0], R.os[0], `⇧ ${t('속도')}`, 'left', 'o', 0, `${R.speed} mm/s`);
    node(OX, oy[1], R.os[1], `↻ ${t('회전')}`, 'left', 'o', 1, `${R.turn > 0 ? '+' : ''}${R.turn} °/s`);
  };

  const term = (x, w, xl) => `${xl ?? x.toFixed(2)} × <span class="${w >= 0 ? 'p' : 'n'}">(${f2(w)})</span>`;
  const calc = (net, R) => {
    const n = net.ins.length, H = net.H || 6;
    if (sel.t === 'h' && sel.i < H) {
      const j = sel.i, ws = R.hw[j], parts = net.ins.map((q, i) => term(R.x[i], ws[i])).concat(`1 × <span class="${ws[n] >= 0 ? 'p' : 'n'}">(${f2(ws[n])})</span>`);
      return `<b>${t('계산')} · ${t('숨은 칸')} ${j + 1}</b><br>${parts.join(' + ')} = <b>${R.hz[j].toFixed(2)}</b> → tanh → <b>${R.hs[j].toFixed(2)}</b>`;
    }
    if (sel.t === 'o') {
      const j = sel.i, ws = R.ow[j], parts = R.hs.map((h, i) => term(h, ws[i])).concat(`1 × <span class="${ws[H] >= 0 ? 'p' : 'n'}">(${f2(ws[H])})</span>`);
      const sc = j === 0 ? `× ${net.S || 300} = <b>${R.speed} mm/s</b>` : `× ${net.T || 180} = <b>${R.turn} °/s</b>`;
      return `<b>${t('계산')} · ${j === 0 ? t('속도') : t('회전')}</b><br>${parts.join(' + ')} = <b>${R.oz[j].toFixed(2)}</b> → tanh → <b>${R.os[j].toFixed(2)}</b> ${sc}`;
    }
    if (sel.t === 'i') {
      const q = net.ins[sel.i];
      return `<b>${esc(label(q))}</b> = ${rawOf(q, R.x[sel.i])}${q.k === 'color' ? '' : 'mm'} → ${q.k === 'color' ? '÷ 100' : '÷ 1000'} → <b>${R.x[sel.i].toFixed(2)}</b><br>` +
        R.hw.map((ws, j) => `${t('숨은 칸')} ${j + 1}: ${term(R.x[sel.i], ws[sel.i])} = <b>${(R.x[sel.i] * ws[sel.i]).toFixed(2)}</b>`).join(' · ');
    }
    return `<b>${t('바이어스 (항상 1)')}</b> — ` + R.hw.map((ws, j) => `${t('숨은 칸')} ${j + 1}: <span class="${ws[n] >= 0 ? 'p' : 'n'}">${f2(ws[n])}</span>`).join(' · ');
  };
  const table = (net, R) => {
    const n = net.ins.length, H = net.H || 6, cell = v => `<td style="color:${v >= 0 ? '#E65100' : '#1565C0'}">${f2(v)}</td>`;
    let s = `<table><tr><th></th>${net.ins.map(q => `<th>${esc(label(q))}</th>`).join('')}<th>${t('바이어스 (항상 1)')}</th></tr>`;
    R.hw.forEach((ws, j) => { s += `<tr><th>${t('숨은 칸')} ${j + 1}</th>${ws.map(cell).join('')}</tr>`; });
    s += `</table><table><tr><th></th>${Array.from({ length: H }, (_, i) => `<th>${t('숨은 칸')} ${i + 1}</th>`).join('')}<th>${t('바이어스 (항상 1)')}</th></tr>`;
    R.ow.forEach((ws, j) => { s += `<tr><th>${j === 0 ? t('속도') : t('회전')}</th>${ws.map(cell).join('')}</tr>`; });
    return s + `</table><div style="opacity:.7;margin-top:2px">${(n + 1) * H + (H + 1) * 2} ${ko() ? '개' : 'weights'}</div>`;
  };

  let sigSl = '', sigTb = '';
  const loop = () => {
    if (!win || win.hidden) return;
    const now = performance.now(), net = pickNet();
    win.querySelector('.hd b').textContent = t('🔍 신경망 들여다보기');
    win.querySelector('.hp summary').textContent = t('가중치가 뭐예요?'); win.querySelector('.help').innerHTML = t('help');
    win.querySelector('.tb summary').textContent = t('모든 가중치 보기');
    if (!net) {
      win.querySelector('.st').textContent = ''; win.querySelector('.calc').textContent = t('신경망이 아직 없어요. 학습 창에서 🧠 신경망으로 학습하거나 「🧠 신경망으로 주행」 블록을 넣으세요.');
      cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); win.querySelector('.sl').innerHTML = ''; sigSl = '';
    } else {
      const I = inputs(net), R = run(net, I.x); R.live = I.live;
      win.querySelector('.st').textContent = training() ? `● ${t('학습 중 — 지금까지 가장 좋은 신경망')} · ✨ ${better}${ko() ? '번 좋아짐' : ' improvements'}` : I.live ? `● ${t('실행 중 — 실제 센서 값')}` : `○ ${t('멈춤 — 입력 막대를 움직여 실험해 보세요')}`;
      try { draw(net, R, now); } catch (e) { console.warn('nnviz', e); }
      const sl = win.querySelector('.sl'), s2 = JSON.stringify([net.ins, I.live, ko()]);
      if (s2 !== sigSl) {
        sigSl = s2;
        sl.innerHTML = net.ins.map((q, i) => `<label>${esc(label(q))} <input type="range" data-i="${i}" min="0" max="${q.k === 'color' ? 100 : 1000}" value="${sliders[i] ?? (q.k === 'color' ? 50 : 300)}" ${I.live ? 'disabled' : ''}><span></span></label>`).join('');
        sl.querySelectorAll('input').forEach(r => { r.oninput = () => { sliders[+r.dataset.i] = +r.value; }; });
      }
      sl.querySelectorAll('input').forEach(r => { const i = +r.dataset.i, q = net.ins[i]; if (I.live) r.value = rawOf(q, I.x[i]); r.nextElementSibling.textContent = rawOf(q, I.x[i]) + (q.k === 'color' ? '' : 'mm'); });
      win.querySelector('.calc').innerHTML = calc(net, R);
      if (changed && now - changedAt < 2500) {
        const big = changed.map((v, i) => [Math.abs(v), i]).sort((a, b) => b[0] - a[0])[0], cnt = changed.filter(v => Math.abs(v) > 0.005).length;
        chgInfo = `✨ ${t('더 좋은 신경망 발견')} · ${t('바뀐 가중치')} ${cnt}/${changed.length} · ${t('가장 많이 바뀐 것')} ${f2(big ? (prevW[big[1]] - changed[big[1]]) : 0)} → ${f2(big ? prevW[big[1]] : 0)}`;
      } else if (now - changedAt > 6000) chgInfo = '';
      win.querySelector('.chg').textContent = chgInfo;
      if (win.querySelector('.tb').open) { const s3 = JSON.stringify(net.W); if (s3 !== sigTb) { sigTb = s3; win.querySelector('.tbl').innerHTML = table(net, R); } }
    }
    raf = requestAnimationFrame(loop);
  };

  // 시뮬레이터 칸: 「🧠 신경망으로 주행」 블록이 있으면 버튼 하나
  setInterval(() => {
    const has = !!wsNet(), anchor = document.getElementById('bcWrap') || document.getElementById('vlaWrap');
    let b = document.getElementById('nnVizRow');
    if (!has || !anchor) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'nnVizRow'; b.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25);font-size:12px'; anchor.before(b); }
    const s = `<div class="label">🧠 ${ko() ? '신경망' : 'Neural network'}</div><button id="nnVizBtn" style="font-size:12px;padding:2px 8px">${esc(t('🔍 신경망 들여다보기'))}</button>`;
    if (b.dataset.s !== s) { b.dataset.s = s; b.innerHTML = s; }
  }, 1000);
  window.__nnviz = { open, run };
})();
