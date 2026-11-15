// vlaviz.js — 「🔍 AI 속 들여다보기」: 따라 하기 학습 모델(bc.js)이 0.1초마다 하는 한 번의 결정을 실시간 그림으로 보여 줍니다.
//   ① 보기(V): AI의 눈 24×18 + "AI가 주목한 곳"(고른 행동의 점수가 그림 칸마다 얼마나 민감한지 = 빨간 겹침)
//   ② 듣기(L): 지시 낱말 — 배운 낱말(초록) / 처음 듣는 낱말(회색 ?), 🧭 로봇 방향
//   ③ 생각: 숨은 칸 24개의 켜짐(주황 +) · 꺼짐(파랑 −)
//   ④ 고르기(A): 행동 6가지 확률, 가장 높은 것을 고름
//   ⑤ 움직이기: 고른 행동의 바퀴 명령(속도 mm/s, 회전 °/s)
//   + "만약 다른 말을 들었다면?": 같은 장면에서 배운 다른 지시였다면 고를 행동
// 실행 중이면 실제 결정을, 멈춰 있으면 지금 자리에서 블록의 지시로 미리 계산해 보여 줍니다. 가르치는 중에는 ✔ = 내가 누른 키, 막대 = AI 생각.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext, U = window.__umc, V = window.__vla, BC = window.__bc;
  if (!C || !X || !U || !V || !BC) return;
  const B = BC.state, EW = BC.EW, EH = BC.EH;
  const EN = {
    '🔍 AI 속 들여다보기': '🔍 Look inside the AI', '① 보기 (V)': '① See (V)', '② 듣기 (L)': '② Hear (L)', '🧭 로봇 방향': '🧭 Heading',
    '③ 생각 — 숨은 칸 24개': '③ Think — 24 hidden cells', '④ 고르기 (A)': '④ Choose (A)', '⑤ 움직이기': '⑤ Move',
    'AI가 주목한 곳 보기': 'Show where the AI looks', '켜짐 +': 'on +', '꺼짐 −': 'off −', '속도': 'speed', '회전': 'turn',
    '💬 만약 다른 말을 들었다면?': '💬 What if it heard different words?', '지금 들은 말': 'heard now',
    'loop': 'Every 0.1 s the AI does ① → ⑤ once.', '번 결정': 'decisions so far', '실행 중': 'running', '멈춤 — 지금 자리에서 미리 계산': 'stopped — previewing from the current spot',
    '가르치는 중: ✔ = 내가 누른 키, 막대 = AI라면 고를 행동': 'Teaching: ✔ = your key, bars = what the AI would choose',
    '아직 가르친 모델이 없어요 — 학습 창에서 먼저 학습시키세요': 'No trained model yet — train it in the training window first',
    'PC 도우미 두뇌는 속을 볼 수 없어요. VLA 두뇌를 "내가 가르친 모델"로 바꾸세요.': 'The PC helper brain cannot be looked inside. Switch the VLA brain to "Model I taught".',
    '지시': 'instruction', '처음 듣는 낱말': 'unknown word', '배운 낱말': 'known word',
  };
  const KO = { loop: '0.1초마다 AI가 ① 보기 → ② 듣기 → ③ 생각 → ④ 고르기 → ⑤ 움직이기를 한 번씩 합니다.' };
  const t = k => ((document.documentElement.lang || 'ko').slice(0, 2) === 'ko' ? (KO[k] || k) : (EN[k] || BC.t(k)));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = V.store;

  const css = document.createElement('style');
  css.textContent = `#vlaViz{position:fixed;left:16px;bottom:16px;width:min(720px,calc(100vw - 32px));z-index:100001;background:var(--bg,#fff);color:inherit;border:1px solid rgba(127,127,127,.35);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:8px 12px 10px;font-size:12px}
#vlaViz .hd{display:flex;align-items:center;gap:10px;cursor:move;user-select:none;margin-bottom:4px}#vlaViz .hd b{font-size:14px}#vlaViz .hd .sp{flex:1}
#vlaViz canvas{width:100%;display:block;border-radius:8px;background:rgba(127,127,127,.06)}#vlaViz .cf{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center}
#vlaViz .chip{border:1px solid rgba(127,127,127,.35);border-radius:999px;padding:2px 9px}#vlaViz .chip.now{border-color:#7E57C2;background:rgba(126,87,194,.14);font-weight:600}
#vlaViz .ft{margin-top:6px;opacity:.75;line-height:1.5}#vlaViz .warn{background:rgba(249,168,37,.15);border-radius:6px;padding:4px 8px;margin-top:6px}`;
  document.head.appendChild(css);

  let win = null, cv = null, raf = 0, last = null, lastTick = -1, tickAt = 0, lastIdle = 0;
  const W = 820, H = 330;
  const wsTask = () => {
    try { const ws = window.__wb && window.__wb.ws(); const bl = ws && ws.getAllBlocks(false).find(x => (x.type === 'rm_vla_drive' || x.type === 'rm_vla_teach') && x.isEnabled()); if (bl) return bl.getFieldValue('TASK'); } catch (e) { }
    return (B.model && B.model.tasks && B.model.tasks[0]) || '';
  };
  const open = () => {
    if (!win) {
      win = document.createElement('div'); win.id = 'vlaViz';
      win.innerHTML = `<div class="hd"><b></b><span class="st"></span><span class="sp"></span><label><input type="checkbox" class="sal"> <span class="salL"></span></label><button class="x">✕</button></div><canvas width="${W * 2}" height="${H * 2}"></canvas><div class="cf"></div><div class="msg"></div><div class="ft"></div>`;
      document.body.appendChild(win);
      cv = win.querySelector('canvas');
      win.querySelector('.x').onclick = () => { win.hidden = true; cancelAnimationFrame(raf); };
      const sal = win.querySelector('.sal'); sal.checked = store('mscad.vlaviz.sal') !== '0'; sal.onchange = () => store('mscad.vlaviz.sal', sal.checked ? '1' : '0');
      // 끌어서 옮기기
      const hd = win.querySelector('.hd'); let d = null;
      hd.onpointerdown = e => { if (e.target.closest('button,input,label')) return; d = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop }; hd.setPointerCapture(e.pointerId); };
      hd.onpointermove = e => { if (!d) return; win.style.bottom = 'auto'; win.style.left = Math.max(0, e.clientX - d.x) + 'px'; win.style.top = Math.max(0, e.clientY - d.y) + 'px'; };
      hd.onpointerup = () => { d = null; };
    }
    win.hidden = false; cancelAnimationFrame(raf); loop();
  };

  // 한 번의 결정 정보 모으기
  const gather = now => {
    const L = B.live, running = !!X.simRunning && L && L.img;
    if (running) {
      if (B.ticks !== lastTick) { lastTick = B.ticks; tickAt = now; last = { running: true, teach: !!L.teach, key: L.teach ? L.a : -1, img: L.img, task: L.task, th: L.th, ins: BC.inspect(L.img, L.task, L.th) }; }
      return last;
    }
    if (!last || last.running || now - lastIdle > 400) {
      lastIdle = now; const img = BC.eye(), p = U.pose(), task = wsTask(), th = p ? p.th : 0;
      last = { running: false, img, task, th, ins: BC.inspect(img, task, th) };
      if (now - tickAt > 1200) tickAt = now;
    }
    return last;
  };

  // ───────── 그리기 ─────────
  const ink = () => getComputedStyle(win).color || '#222';
  const box = (g, x, y, w, h, title, col) => {
    g.strokeStyle = 'rgba(127,127,127,.45)'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(x, y, w, h, 10); g.stroke();
    g.fillStyle = col || ink(); g.font = '600 14px sans-serif'; g.textAlign = 'left'; g.fillText(title, x + 10, y + 19);
  };
  const arrow = (g, x1, y1, x2, y2, f) => {
    g.strokeStyle = 'rgba(127,127,127,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1); g.fillStyle = 'rgba(127,127,127,.7)'; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 8 * Math.cos(a - .45), y2 - 8 * Math.sin(a - .45)); g.lineTo(x2 - 8 * Math.cos(a + .45), y2 - 8 * Math.sin(a + .45)); g.fill();
    if (f != null && f >= 0 && f <= 1) { g.fillStyle = '#7E57C2'; g.beginPath(); g.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 5, 0, 7); g.fill(); }
  };
  const draw = (D, now) => {
    const g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);
    const fg = ink(), I = D && D.ins, ph = Math.min(1, (now - tickAt) / 450);
    // ① 보기
    box(g, 10, 8, 196, 176, t('① 보기 (V)'));
    if (D && D.img) {
      const id = new ImageData(EW, EH); for (let i = 0; i < EW * EH; i++) { id.data[i * 4] = D.img[i * 3]; id.data[i * 4 + 1] = D.img[i * 3 + 1]; id.data[i * 4 + 2] = D.img[i * 3 + 2]; id.data[i * 4 + 3] = 255; }
      const c = document.createElement('canvas'); c.width = EW; c.height = EH; c.getContext('2d').putImageData(id, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(c, 20, 32, 176, 132);
      if (I && win.querySelector('.sal').checked) {
        // 가장 민감한 20% 칸만 빨갛게 (진할수록 결정에 큰 영향)
        const srt = Array.from(I.sal).sort((p, q) => p - q), thr = srt[Math.floor(srt.length * .8)], mx = Math.max(srt[srt.length - 1], thr + 1e-9);
        const cw = 176 / EW, ch = 132 / EH;
        for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) { const v = I.sal[j * EW + i]; if (v <= thr) continue; g.fillStyle = `rgba(229,57,53,${(.25 + .6 * (v - thr) / (mx - thr)).toFixed(3)})`; g.fillRect(20 + i * cw, 32 + j * ch, cw + .5, ch + .5); }
      }
      g.strokeStyle = 'rgba(127,127,127,.5)'; g.strokeRect(20, 32, 176, 132);
    }
    // ② 듣기 + 방향
    box(g, 10, 192, 196, 66, t('② 듣기 (L)'));
    g.font = '12px sans-serif'; let wx = 20;
    for (const w of (I ? I.words : (D ? BC.words(D.task).map(w => ({ w, known: false })) : []))) {
      const s = w.known ? w.w : w.w + ' ?', tw = g.measureText(s).width + 14; if (wx + tw > 200) break;
      g.fillStyle = w.known ? 'rgba(46,125,50,.16)' : 'rgba(127,127,127,.15)'; g.beginPath(); g.roundRect(wx, 216, tw, 22, 11); g.fill();
      g.fillStyle = w.known ? '#2E7D32' : 'rgba(127,127,127,.95)'; g.fillText(s, wx + 7, 231); wx += tw + 5;
    }
    box(g, 10, 266, 196, 56, t('🧭 로봇 방향'));
    if (D) {
      const cx = 170, cy = 293, r = 20, th = D.th || 0;
      g.strokeStyle = 'rgba(127,127,127,.6)'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
      g.strokeStyle = '#F9A825'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * Math.sin(th), cy + r * Math.cos(th)); g.stroke(); g.lineWidth = 1;
      g.fillStyle = fg; g.font = '12px sans-serif'; g.fillText(`${Math.round(-th * 180 / Math.PI)}°`, 22, 306);
    }
    // ③ 생각
    box(g, 262, 8, 182, 314, t('③ 생각 — 숨은 칸 24개'));
    for (let k = 0; k < 24; k++) {
      const col = k % 4, row = Math.floor(k / 4), x = 300 + col * 36, y = 56 + row * 40, v = I ? I.h[k] : 0;
      g.fillStyle = v >= 0 ? `rgba(245,124,0,${(Math.abs(v) * .9 + .05).toFixed(3)})` : `rgba(30,136,229,${(Math.abs(v) * .9 + .05).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.strokeStyle = 'rgba(127,127,127,.4)'; g.stroke();
    }
    g.font = '11px sans-serif'; g.fillStyle = '#F57C00'; g.fillText(`● ${t('켜짐 +')}`, 276, 310); g.fillStyle = '#1E88E5'; g.fillText(`● ${t('꺼짐 −')}`, 352, 310);
    // ④ 고르기
    box(g, 500, 8, 190, 314, t('④ 고르기 (A)'));
    for (let k = 0; k < 6; k++) {
      const y = 40 + k * 44, p = I ? I.p[k] : 0, on = I && I.a === k, key = D && D.teach && D.key === k;
      g.fillStyle = 'rgba(127,127,127,.12)'; g.beginPath(); g.roundRect(510, y, 170, 32, 6); g.fill();
      g.fillStyle = on ? 'rgba(126,87,194,.75)' : 'rgba(126,87,194,.3)'; g.beginPath(); g.roundRect(510, y, Math.max(2, 170 * p), 32, 6); g.fill();
      g.fillStyle = fg; g.font = `${on ? 700 : 400} 13px sans-serif`; g.fillText(`${BC.AICON[k]} ${BC.t(BC.ANAME[k])}`, 518, y + 20);
      g.textAlign = 'right'; g.fillText(`${key ? '✔ ' : ''}${I ? Math.round(p * 100) + '%' : ''}`, 674, y + 20); g.textAlign = 'left';
    }
    // ⑤ 움직이기
    box(g, 708, 8, 104, 314, t('⑤ 움직이기'));
    const a = I ? I.a : (D && D.teach ? D.key : -1);
    if (a >= 0) {
      const v = BC.ACT[a], cx = 760, cy = 130;
      g.fillStyle = 'rgba(126,87,194,.85)'; g.fillRect(cx - 16, cy - 20, 32, 40); g.fillStyle = '#FFC400'; g.fillRect(cx - 16, cy - 20, 32, 12);
      g.strokeStyle = '#7E57C2'; g.lineWidth = 3;
      if (v[0] > 0) { g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + v[1] * .25, cy - 70); g.stroke(); }
      if (v[1] !== 0) { const s = Math.sign(v[1]); g.beginPath(); g.arc(cx, cy, 34, -Math.PI / 2 - s * .2, -Math.PI / 2 + s * 1.1, s < 0); g.stroke(); }
      g.lineWidth = 1; g.fillStyle = fg; g.font = '12px sans-serif'; g.textAlign = 'center';
      g.fillText(`${t('속도')} ${v[0]}`, cx, 222); g.fillText('mm/s', cx, 238); g.fillText(`${t('회전')} ${v[1] > 0 ? '+' : ''}${v[1]}`, cx, 262); g.fillText('°/s', cx, 278); g.textAlign = 'left';
    }
    // 흐름 화살표 (결정할 때마다 점이 ①② → ③ → ④ → ⑤ 로 흐름)
    const f1 = ph < .4 ? ph / .4 : null, f2 = ph >= .4 && ph < .7 ? (ph - .4) / .3 : null, f3 = ph >= .7 && ph < 1 ? (ph - .7) / .3 : null;
    arrow(g, 206, 96, 262, 120, f1); arrow(g, 206, 225, 262, 180, f1); arrow(g, 206, 294, 262, 240, f1);
    arrow(g, 444, 165, 500, 165, f2); arrow(g, 690, 165, 708, 165, f3);
  };
  const html = D => {
    const I = D && D.ins, run = D && D.running;
    win.querySelector('.hd b').textContent = t('🔍 AI 속 들여다보기');
    win.querySelector('.salL').textContent = t('AI가 주목한 곳 보기');
    win.querySelector('.st').textContent = run ? `● ${t('실행 중')}` : `○ ${t('멈춤 — 지금 자리에서 미리 계산')}`;
    const cf = win.querySelector('.cf');
    const sig = I ? JSON.stringify([D.task, I.cf.map(c => [c.task, c.a, Math.round(c.p * 20)])]) : '';
    if (cf.dataset.sig !== sig) {
      cf.dataset.sig = sig;
      cf.innerHTML = I && I.cf.length ? `<span>${t('💬 만약 다른 말을 들었다면?')}</span>` + I.cf.map(c => `<span class="chip${c.task === D.task ? ' now' : ''}">“${esc(c.task)}” → ${BC.AICON[c.a]} ${esc(BC.t(BC.ANAME[c.a]))} ${Math.round(c.p * 100)}%${c.task === D.task ? ` · ${t('지금 들은 말')}` : ''}</span>`).join('') : '';
    }
    const msg = V.brain() === 'helper' ? t('PC 도우미 두뇌는 속을 볼 수 없어요. VLA 두뇌를 "내가 가르친 모델"로 바꾸세요.') : !B.model ? t('아직 가르친 모델이 없어요 — 학습 창에서 먼저 학습시키세요') : D && D.teach ? t('가르치는 중: ✔ = 내가 누른 키, 막대 = AI라면 고를 행동') : '';
    const m = win.querySelector('.msg'); m.className = msg ? 'msg warn' : 'msg'; m.textContent = msg;
    win.querySelector('.ft').textContent = `${t('loop')} · ${B.ticks || 0} ${t('번 결정')}`;
  };
  const loop = () => {
    if (!win || win.hidden) return;
    const now = performance.now();
    try { const D = gather(now); draw(D, now); html(D); } catch (e) { console.warn('vlaviz', e); }
    raf = requestAnimationFrame(loop);
  };
  window.__vlaviz = { open };
})();
