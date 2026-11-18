// overcam.js — real2sim: 📷 천장 웹캠 보정 마법사 (에이프릴태그 36h11)
//
//   ① 카메라(또는 사진) 고르기 → 태그 검출 (vendor/apriltag/worker.js, WASM)
//   ② 매트 맞추기: 번호 원 가운데를 4곳 이상 클릭 → 화면 ↔ 매트(mm) 호모그래피.
//      이때 보이는 모서리 태그(ID 8 이상)의 네 꼭짓점 매트 좌표를 저장 → 다음부터는 태그만 보고 매 프레임 다시 맞춤.
//   ③ 로봇 태그(ID 0~7): 호모그래피를 나누어 카메라 위치·높이를 구하고, 태그 높이(mm)만큼 시차를 보정해
//      로봇 위치(x, y mm)와 방향을 계산. 크기로 추정한 태그 높이도 함께 보여 줌(입력값 검증용).
//   ④ 정확도 확인: 로봇을 번호 원 위에 올려 오차(mm) 기록.
//
//   매트 좌표: 봇볼(JBC) 매트 1220×610, 왼쪽 위(출발 구역 쪽 먼 모서리) = (0,0), 오른쪽 +x, 아래(카메라 쪽) +y.
//   시뮬레이터 좌표로는 x−610, z−305, th = atan2(앞.x, 앞.y).
//   저장: localStorage mscad.overcam.cal
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext;
  if (!C || !X) return;

  // ───────── 매트 정의 (app.js 의 jbc 매트와 같은 값) ─────────
  const MAT = { w: 1220, h: 610 };
  const CIRC = { 1: [462, 79], 2: [397, 305], 3: [364, 465], 4: [537, 305], 5: [679, 165], 6: [679, 305], 7: [679, 445], 8: [763, 564], 9: [960, 306], 10: [1077, 112], 11: [1174, 305], 12: [1077, 497] };
  const GAR = [['#3cc23c', [[526, 185], [760, 185], [760, 424], [526, 424]]], ['#ffa500', [[986, 17], [792, 17], [792, 218], [986, 218]]], ['#0a3cf0', [[1055, 284], [1202, 430], [1050, 583], [904, 435]]]];
  const CLICK_ORDER = [1, 3, 10, 12, 2, 8, 9, 11, 4];
  const ROBOT_IDS = id => id >= 0 && id <= 7;
  const TAG_MM = 70;

  const LIX = { en: 1 };
  const EN = {
    '📷 천장 웹캠 보정': '📷 Overhead webcam calibration', '보정 마법사': 'Calibration wizard', '카메라': 'Camera', '매트 맞추기': 'Fit the mat', '로봇 태그': 'Robot tag', '정확도 확인': 'Accuracy check',
    '카메라 켜기': 'Start camera', '사진으로 해 보기': 'Try with a photo', '멈추기': 'Stop', '닫기': 'Close', '되돌리기': 'Undo', '처음부터': 'Restart', '기록': 'Record', '기록 지우기': 'Clear records',
  };
  const t = k => (LIX[(document.documentElement.lang || 'ko').slice(0, 2)] && EN[k]) || k;
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const loadCal = () => { try { return JSON.parse(store('mscad.overcam.cal') || 'null') || {}; } catch (e) { return {}; } };
  const saveCal = () => store('mscad.overcam.cal', JSON.stringify(cal));

  // ───────── 수학: 호모그래피 (정규화 DLT, h33=1 최소제곱) ─────────
  const norm = P => {
    const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    const d = P.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / n || 1, k = Math.SQRT2 / d;
    return { T: [[k, 0, -k * mx], [0, k, -k * my], [0, 0, 1]], P: P.map(p => [k * (p[0] - mx), k * (p[1] - my)]) };
  };
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
  const inv3 = m => {
    const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
    const A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g, det = a * A + b * B + c * Cc;
    return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
  };
  const solve = (A, b) => { // 가우스 소거 (부분 피벗)
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  };
  // src → dst (점 4쌍 이상)
  const homography = (src, dst) => {
    if (src.length < 4) return null;
    const S = norm(src), D = norm(dst), AtA = Array.from({ length: 8 }, () => new Array(8).fill(0)), Atb = new Array(8).fill(0);
    S.P.forEach(([x, y], i) => {
      const [u, v] = D.P[i];
      for (const [row, rhs] of [[[x, y, 1, 0, 0, 0, -u * x, -u * y], u], [[0, 0, 0, x, y, 1, -v * x, -v * y], v]])
        for (let a = 0; a < 8; a++) { Atb[a] += row[a] * rhs; for (let b = 0; b < 8; b++) AtA[a][b] += row[a] * row[b]; }
    });
    const h = solve(AtA, Atb); if (!h) return null;
    const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
    const H = mul(inv3(D.T), mul(Hn, S.T)), s = H[2][2];
    return H.map(r => r.map(v => v / s));
  };
  const apply = (H, p) => { const w = H[2][0] * p[0] + H[2][1] * p[1] + H[2][2]; return [(H[0][0] * p[0] + H[0][1] * p[1] + H[0][2]) / w, (H[1][0] * p[0] + H[1][1] * p[1] + H[1][2]) / w]; };

  // 매트→화면 호모그래피를 나누어 카메라 위치(매트 mm)·높이·기울기·초점 구하기 (정사각 픽셀, 주점 = 화면 가운데)
  const cameraPose = (Himg2mat, W, Hh, hfovDeg) => {
    const Hi = inv3(Himg2mat), cx = W / 2, cy = Hh / 2;
    const A = mul([[1, 0, -cx], [0, 1, -cy], [0, 0, 1]], Hi), h1 = [A[0][0], A[1][0], A[2][0]], h2 = [A[0][1], A[1][1], A[2][1]], h3 = [A[0][2], A[1][2], A[2][2]];
    // 초점: 화각 입력값을 씀. 호모그래피에서 구한 값(fEst)은 클릭 오차 몇 px 에도 크게 흔들려서 참고로만 보여 줌.
    const fEst = Math.sqrt(-(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2]));
    const fFov = (W / 2) / Math.tan((hfovDeg || 70) * Math.PI / 360);
    const useEst = hfovDeg === 'auto' && isFinite(fEst) && fEst > 0.4 * W && fEst < 3 * W, f = useEst ? fEst : fFov, fromFov = !useEst;
    const K = v => [v[0] / f, v[1] / f, v[2]], n3 = v => Math.hypot(...v);
    let r1 = K(h1), r2 = K(h2), tt = K(h3); const s = (n3(r1) + n3(r2)) / 2;
    r1 = r1.map(v => v / s); r2 = r2.map(v => v / s); tt = tt.map(v => v / s);
    if (tt[2] < 0) { r1 = r1.map(v => -v); r2 = r2.map(v => -v); tt = tt.map(v => -v); }
    const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    // 카메라 중심 = −Rᵀ t  (R 의 열 = r1 r2 r3)
    const Cw = [0, 1, 2].map(i => -([r1, r2, r3][i][0] * tt[0] + [r1, r2, r3][i][1] * tt[1] + [r1, r2, r3][i][2] * tt[2]));
    const tilt = Math.acos(Math.min(1, Math.abs(r3[2]))) * 180 / Math.PI;
    return { f, fromFov, x: Cw[0], y: Cw[1], z: Math.abs(Cw[2]), tilt, hfov: 2 * Math.atan(W / 2 / f) * 180 / Math.PI, hfovEst: isFinite(fEst) ? 2 * Math.atan(W / 2 / fEst) * 180 / Math.PI : NaN };
  };
  // 높이 h(mm) 인 점을 바닥에 비춘 자리 pf 에서 실제 자리로 (카메라 바로 아래 N 쪽으로 당김)
  const unproject = (pf, cam, h) => { const k = (cam.z - h) / cam.z; return [cam.x + (pf[0] - cam.x) * k, cam.y + (pf[1] - cam.y) * k]; };

  // ───────── 상태 ─────────
  const cal = Object.assign({ clicks: {}, tagCorners: {}, tagH: 100, tagOff: 0, hfov: 70, dec: 2, samples: [] }, loadCal());
  const S = { IH: 0, Hm: null, src: null, stream: null, video: null, photo: null, W: 0, H: 0, frame: null, dets: [], ms: 0, fps: 0, busy: false, worker: null, ready: false,
    Hf: null, cam: null, robots: [], step: 1, last: 0, frames: 0, t0: 0, err: '' };
  let Hclick = null;
  const recomputeClick = () => {
    const ks = Object.keys(cal.clicks).map(Number).filter(k => CIRC[k]);
    Hclick = ks.length >= 4 ? homography(ks.map(k => cal.clicks[k]), ks.map(k => CIRC[k])) : null;
    S.clickRes = Hclick ? ks.map(k => { const p = apply(Hclick, cal.clicks[k]); return [k, Math.hypot(p[0] - CIRC[k][0], p[1] - CIRC[k][1])]; }) : [];
    return Hclick;
  };
  recomputeClick();

  // ───────── 검출 워커 ─────────
  const workerUrl = () => { const s = [...document.scripts].find(x => /overcam\.js/.test(x.src)); return new URL('vendor/apriltag/worker.js', s ? s.src : location.href).href; };
  const ensureWorker = () => {
    if (S.worker) return;
    S.worker = new Worker(workerUrl());
    S.worker.onmessage = e => {
      if (e.data.ready) { S.ready = true; return; }
      S.busy = false; S.dets = e.data.dets || []; S.ms = e.data.ms; S.frames++; S.lastFrame = performance.now(); try { update(); } catch (er) { S.drawErr = String(er && er.message || er); }
    };
    S.worker.onerror = e => { S.err = '검출기 오류: ' + (e.message || e); S.busy = false; };
  };
  const grab = () => {
    const el = S.photo || S.video; if (!el) return null;
    const W = S.photo ? S.photo.naturalWidth : S.video.videoWidth, H = S.photo ? S.photo.naturalHeight : S.video.videoHeight;
    if (!W || !H) return null;
    if (!S.frame || S.frame.width !== W || S.frame.height !== H) { S.frame = document.createElement('canvas'); S.frame.width = W; S.frame.height = H; }
    const g = S.frame.getContext('2d', { willReadFrequently: true }); g.drawImage(el, 0, 0, W, H);
    S.W = W; S.IH = H;
    const d = g.getImageData(0, 0, W, H).data, gray = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < gray.length; i += 4, j++) gray[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    return { gray, W, H };
  };
  // 고리: requestAnimationFrame 대신 setInterval (Mac Chrome 은 창이 가려지면 rAF 를 멈춤 → 화면이 얼어 보였음)
  let loopId = 0;
  const tick = () => {
    if (!win || win.hidden || !(S.video || S.photo)) return;
    try {
      // 워커가 2초 넘게 답이 없으면 다시 보냄 (멈춤 방지)
      if (S.busy && performance.now() - S.sent > 2000) S.busy = false;
      if (S.ready && !S.busy && (!S.photo || S.frames < 2)) {
        const f = grab();
        if (f) { S.busy = true; S.sent = performance.now(); S.worker.postMessage({ gray: f.gray, w: f.W, h: f.H, dec: cal.dec }, [f.gray.buffer]); }
      }
      draw();
      S.drawErr = '';
    } catch (e) { S.drawErr = String(e && e.message || e); }
  };
  const startLoop = () => { if (!loopId) { loopId = setInterval(tick, 33); setInterval(() => renderInfo(), 1000); } };
  const requestAnimationFrame = () => startLoop();

  // ───────── 프레임마다 계산 ─────────
  const update = () => {
    // 1) 화면→매트: 저장한 모서리 태그가 보이면 그 꼭짓점으로, 아니면 클릭으로
    const src = [], dst = [];
    for (const d of S.dets) { const tc = cal.tagCorners[d.id]; if (tc && !ROBOT_IDS(d.id)) d.corners.forEach((c, i) => { src.push([c.x, c.y]); dst.push(tc[i]); }); }
    S.Hf = src.length >= 4 ? homography(src, dst) : null;
    S.Hm = S.Hf || Hclick; S.via = S.Hf ? 'tags' : Hclick ? 'clicks' : '';
    S.cam = S.Hm && S.W ? cameraPose(S.Hm, S.W, S.IH, cal.hfov) : null;
    // 2) 로봇 태그
    S.robots = [];
    if (S.Hm && S.cam) for (const d of S.dets) {
      if (!ROBOT_IDS(d.id)) continue;
      const pf = d.corners.map(c => apply(S.Hm, [c.x, c.y]));
      const side = [0, 1, 2, 3].reduce((s, i) => s + Math.hypot(pf[i][0] - pf[(i + 1) % 4][0], pf[i][1] - pf[(i + 1) % 4][1]), 0) / 4;
      const hEst = S.cam.z * (1 - TAG_MM / side);
      const pt = pf.map(p => unproject(p, S.cam, cal.tagH));
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const top = mid(pt[2], pt[3]), bot = mid(pt[0], pt[1]), dx = top[0] - bot[0], dy = top[1] - bot[1], L = Math.hypot(dx, dy) || 1;
      const cx = (pt[0][0] + pt[1][0] + pt[2][0] + pt[3][0]) / 4, cy = (pt[0][1] + pt[1][1] + pt[2][1] + pt[3][1]) / 4;
      const x = cx - cal.tagOff * dx / L, y = cy - cal.tagOff * dy / L;
      const pfc = apply(S.Hm, [d.center.x, d.center.y]);
      S.robots.push({ id: d.id, x, y, tx: cx, ty: cy, ux: dx / L, uy: dy / L, deg: Math.atan2(dy, dx) * 180 / Math.PI, hEst, side, raw: pfc, sim: { x: x - MAT.w / 2, z: y - MAT.h / 2, th: Math.atan2(dx / L, dy / L) }, corners: pt });
    }
    const now = performance.now(); if (now - S.last > 1000) { S.fps = S.frames / ((now - (S.t0 || now)) / 1000 || 1); S.t0 = now; S.frames = 0; S.last = now; }
    renderInfo();
  };

  // 클릭이 4곳 이상이면: 지금 보이는 모서리 태그의 꼭짓점 매트 좌표를 저장
  const learnTags = () => {
    if (!recomputeClick()) return 0;
    let n = 0; cal.tagCorners = {};
    for (const d of S.dets) if (!ROBOT_IDS(d.id)) { cal.tagCorners[d.id] = d.corners.map(c => apply(Hclick, [c.x, c.y])); n++; }
    saveCal(); update(); return n;
  };

  // ───────── 창 ─────────
  const css = document.createElement('style');
  css.textContent = `#ocWin{position:fixed;left:16px;top:56px;z-index:100002;width:min(980px,calc(100vw - 32px));max-height:calc(100vh - 72px);overflow:auto;background:var(--panel,#fff);color:var(--fg,#1c2530);border:1px solid var(--line,#ccd);border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.25);font-size:12px}
#ocWin .hd{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line,#ccd);cursor:move;font-weight:600}
#ocWin .hd .sp{flex:1}#ocWin .bd{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:10px;padding:10px}
#ocWin canvas{width:100%;background:#111;border-radius:6px;cursor:crosshair;display:block}
#ocWin .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px}#ocWin .tabs button{font-size:11px;padding:3px 2px;white-space:nowrap}#ocWin .tabs button[aria-pressed=true]{background:var(--accent-soft,#dcedf5);border-color:var(--accent,#0b7fab)}
#ocWin .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0}#ocWin .note{opacity:.75;line-height:1.5;margin:4px 0}
#ocWin table{border-collapse:collapse;width:100%;margin:4px 0}#ocWin td,#ocWin th{border-bottom:1px solid var(--line,#dde);padding:2px 4px;text-align:left;font-variant-numeric:tabular-nums}
#ocWin .ok{color:#2e7d32}#ocWin .bad{color:#c62828}#ocWin input[type=number]{width:70px}#ocWin .big{font-size:15px;font-weight:600}
#ocWrap{margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25);font-size:12px}`;
  document.head.appendChild(css);
  let win = null, cv = null, info = null;
  const scale = () => cv ? cv.width / (S.W || 1) : 1;

  const open = () => {
    ensureWorker();
    if (!win) {
      win = document.createElement('div'); win.id = 'ocWin';
      win.innerHTML = `<div class="hd">📷 <span>${t('📷 천장 웹캠 보정').replace('📷 ', '')} · ${t('보정 마법사')}</span><span class="sp"></span><button id="ocClose">${t('닫기')}</button></div>
<div class="bd"><div><canvas width="960" height="540"></canvas><div class="note" id="ocHint"></div></div><div id="ocSide"></div></div>`;
      document.body.appendChild(win);
      cv = win.querySelector('canvas'); info = win.querySelector('#ocSide');
      win.querySelector('#ocClose').onclick = close;
      const hd = win.querySelector('.hd'); let dr = null;
      hd.onpointerdown = e => { if (e.target.tagName === 'BUTTON') return; dr = { x: e.clientX - win.offsetLeft, y: e.clientY - win.offsetTop }; hd.setPointerCapture(e.pointerId); };
      hd.onpointermove = e => { if (dr) { win.style.left = Math.max(0, e.clientX - dr.x) + 'px'; win.style.top = Math.max(0, e.clientY - dr.y) + 'px'; } };
      hd.onpointerup = () => { dr = null; };
      cv.onclick = e => {
        if (S.step !== 2 || !S.W) return;
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * S.W, y = (e.clientY - r.top) / r.height * S.H_img();
        const k = CLICK_ORDER.find(k => !cal.clicks[k]); if (!k) return;
        cal.clicks[k] = [x, y]; saveCal();
        if (Object.keys(cal.clicks).length >= 4) learnTags(); else update();
        renderSide(true); tick();
      };
    }
    win.hidden = false; renderSide(true); requestAnimationFrame(tick);
  };
  S.H_img = () => S.IH || 1;
  const close = () => { if (win) win.hidden = true; stopSource(); };
  const stopSource = () => { if (S.stream) S.stream.getTracks().forEach(tr => tr.stop()); S.stream = null; S.video = null; S.photo = null; };

  const startCamera = async deviceId => {
    stopSource(); S.err = '';
    try {
      S.stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = S.stream; await v.play(); S.video = v;
      const tr = S.stream.getVideoTracks()[0]; cal.deviceId = tr.getSettings().deviceId; saveCal();
      S.frames = 0; requestAnimationFrame(tick); renderSide(true);
    } catch (e) { S.err = '카메라를 열 수 없습니다: ' + (e.message || e.name); renderSide(true); }
  };
  const startPhoto = file => {
    stopSource(); const img = new Image();
    img.onload = () => { S.photo = img; S.frames = 0; S.busy = false; requestAnimationFrame(tick); renderSide(true); };
    img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
  };

  // ───────── 그리기 ─────────
  const draw = () => {
    if (!cv) return;
    const el = S.photo || S.video; const g = cv.getContext('2d');
    if (!el || !S.W) { g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height); return; }
    const ar = S.H_img() / S.W; if (Math.abs(cv.height - Math.round(cv.width * ar)) > 1) cv.height = Math.round(cv.width * ar);
    const k = cv.width / S.W; g.drawImage(el, 0, 0, cv.width, cv.height);
    // 태그
    for (const d of S.dets) {
      const rob = ROBOT_IDS(d.id); g.strokeStyle = rob ? '#ff9800' : cal.tagCorners[d.id] ? '#00e676' : '#ffeb3b'; g.lineWidth = 3;
      g.beginPath(); d.corners.forEach((c, i) => g[i ? 'lineTo' : 'moveTo'](c.x * k, c.y * k)); g.closePath(); g.stroke();
      g.fillStyle = g.strokeStyle; g.font = 'bold 15px sans-serif'; g.fillText((rob ? '🤖 ' : '') + d.id, d.center.x * k + 6, d.center.y * k - 6);
    }
    // 매트 겹쳐 그리기
    if (S.Hm) {
      const Hi = inv3(S.Hm), P = p => { const q = apply(Hi, p); return [q[0] * k, q[1] * k]; };
      const poly = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...P(p))); g.closePath(); g.stroke(); };
      poly([[0, 0], [MAT.w, 0], [MAT.w, MAT.h], [0, MAT.h]], 'rgba(255,0,255,.9)', 2);
      GAR.forEach(([col, pts]) => poly(pts, col, 2));
      for (const [n, [x, y]] of Object.entries(CIRC)) {
        poly(Array.from({ length: 24 }, (_, i) => [x + 31 * Math.cos(i / 24 * 2 * Math.PI), y + 31 * Math.sin(i / 24 * 2 * Math.PI)]), 'rgba(255,0,255,.8)', 1.5);
        const c = P([x, y]); g.fillStyle = 'rgba(255,0,255,.9)'; g.font = '12px sans-serif'; g.fillText(n, c[0] - 4, c[1] + 4);
      }
      // 로봇: 보정한 자리(바닥)에 화살표
      for (const r of S.robots) {
        const a = r.deg * Math.PI / 180, c = P([r.x, r.y]), tip = P([r.x + 90 * Math.cos(a), r.y + 90 * Math.sin(a)]);
        g.strokeStyle = '#ff1744'; g.lineWidth = 4; g.beginPath(); g.moveTo(...c); g.lineTo(...tip); g.stroke();
        g.fillStyle = '#ff1744'; g.beginPath(); g.arc(c[0], c[1], 7, 0, 7); g.fill();
      }
    }
    // 클릭한 점
    for (const [n, p] of Object.entries(cal.clicks)) { g.fillStyle = '#00b0ff'; g.beginPath(); g.arc(p[0] * k, p[1] * k, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText(n, p[0] * k + 8, p[1] * k - 8); }
  };

  const f0 = v => Math.round(v), f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const renderSide = force => { if (force) info.dataset.sig = ''; renderInfo(); };
  const renderInfo = () => {
    if (!info || !win || win.hidden) return;
    const st = S.step;
    const sig = JSON.stringify([st, !!(S.video || S.photo), Object.keys(cal.clicks).length, Object.keys(cal.tagCorners).length, S.err, cal.samples.length]);
    if (info.dataset.sig !== sig) {
      info.dataset.sig = sig;
      const tab = (n, s) => `<button data-st="${n}" aria-pressed="${st === n}">${n}. ${t(s)}</button>`;
      let body = '';
      if (st === 1) body = `<div class="row"><select id="ocDev"><option value="">(기본 카메라)</option></select><button id="ocCam">${t('카메라 켜기')}</button></div>
<div class="row"><label>📁 ${t('사진으로 해 보기')} <input type="file" id="ocFile" accept="image/*"></label></div>
<div class="row">검출 속도 <select id="ocDec"><option value="1">정밀 (느림)</option><option value="2">보통</option><option value="3">빠름</option></select></div>
<div class="note">카메라 해상도는 1920×1080을 요청합니다. 화면에 모서리 태그(ID 10~13)가 초록·노랑, 로봇 태그(ID 0~7)가 주황으로 표시되면 다음 단계로.</div>`;
      if (st === 2) body = `<div class="note">화면에서 <b>번호 원의 가운데</b>를 아래 순서로 클릭하세요. 4곳이면 계산되고, 더 클릭할수록 정확해집니다.</div>
<div class="row big" id="ocNext"></div><div class="row"><button id="ocUndo">${t('되돌리기')}</button><button id="ocReset">${t('처음부터')}</button></div><div id="ocRes"></div>
<div class="note">계산이 끝나면 지금 보이는 모서리 태그 위치를 저장합니다. 그다음부터는 원을 다시 클릭하지 않아도 태그만 보고 맞춥니다 (카메라나 매트를 옮겨도 태그가 매트와 같이 있으면 그대로).</div>`;
      if (st === 3) body = `<div class="row">태그 높이(바닥→태그 면) <input type="number" id="ocH" value="${cal.tagH}" step="1"> mm</div>
<div class="row">태그 가운데 → 로봇 회전 중심 <input type="number" id="ocOff" value="${cal.tagOff}" step="1"> mm 앞</div>
<div class="row">카메라 가로 화각 <input type="number" id="ocFov" value="${cal.hfov}" step="0.5">°</div>
<div class="note">앵커 C200: 화각 설정 78°면 가로 약 70°, 95°면 약 87°, 65°면 약 58° — AnkerWork 의 설정에 맞는 값을 넣으세요. 「크기로 추정한 태그 높이」는 태그 모서리 1px 차이에도 ±10~15mm 흔들리는 참고값입니다. 화각을 이 값에 맞추려고 바꾸지 마세요.</div>
<div class="note">카메라가 비스듬하면 높이 있는 태그는 실제보다 카메라 반대쪽으로 밀려 보입니다. 태그 높이만큼 이 차이를 보정합니다. 「크기로 추정한 높이」가 입력값과 비슷하면 보정이 맞는 것입니다.</div>`;
      if (st === 4) body = `<div class="note">로봇(태그 가운데가 로봇 중심과 같게, 또는 앞 거리 입력)을 번호 원 위에 올려놓고 「기록」. 여러 원에서 반복하세요. 목표: 10mm 안.</div>
<div class="row"><button id="ocRec">${t('기록')}</button><button id="ocClr">${t('기록 지우기')}</button></div><div id="ocSamp"></div>
<div class="row"><button id="ocOffCalc">앞 거리 계산</button><span class="note">같은 원에서 로봇을 90°씩 돌려 3번 이상 기록한 뒤 누르면, 태그가 회전 중심에서 얼마나 앞에 있는지 계산해 넣습니다.</span></div>`;
      info.innerHTML = `<div class="tabs">${tab(1, '카메라')}${tab(2, '매트 맞추기')}${tab(3, '로봇 태그')}${tab(4, '정확도 확인')}</div>${S.err ? `<div class="bad">${S.err}</div>` : ''}${body}<div id="ocLive"></div>`;
      info.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { S.step = +b.dataset.st; renderSide(true); });
      const $ = s => info.querySelector(s);
      if ($('#ocCam')) {
        $('#ocCam').onclick = () => startCamera($('#ocDev').value);
        navigator.mediaDevices && navigator.mediaDevices.enumerateDevices && navigator.mediaDevices.enumerateDevices().then(ds => {
          ds.filter(d => d.kind === 'videoinput').forEach((d, i) => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || `카메라 ${i + 1}`; if (d.deviceId === cal.deviceId) o.selected = true; $('#ocDev') && $('#ocDev').appendChild(o); });
        }).catch(() => { });
        $('#ocFile').onchange = e => e.target.files[0] && startPhoto(e.target.files[0]);
        $('#ocDec').value = String(cal.dec); $('#ocDec').onchange = e => { cal.dec = +e.target.value; saveCal(); };
      }
      if ($('#ocUndo')) {
        $('#ocUndo').onclick = () => { const ks = CLICK_ORDER.filter(k => cal.clicks[k]); if (ks.length) delete cal.clicks[ks[ks.length - 1]]; if (Object.keys(cal.clicks).length >= 4) learnTags(); else { recomputeClick(); saveCal(); } renderSide(true); };
        $('#ocReset').onclick = () => { cal.clicks = {}; cal.tagCorners = {}; recomputeClick(); saveCal(); update(); renderSide(true); };
      }
      if ($('#ocH')) {
        $('#ocH').oninput = e => { cal.tagH = +e.target.value || 0; saveCal(); update(); };
        $('#ocOff').oninput = e => { cal.tagOff = +e.target.value || 0; saveCal(); update(); };
        $('#ocFov').oninput = e => { cal.hfov = +e.target.value || 70; saveCal(); update(); };
      }
      if ($('#ocRec')) {
        $('#ocRec').onclick = () => { const r = S.robots[0]; if (!r) return; const near = nearest(r); cal.samples.push({ c: near.k, dx: r.x - CIRC[near.k][0], dy: r.y - CIRC[near.k][1], deg: r.deg, tx: r.tx, ty: r.ty, ux: r.ux, uy: r.uy }); saveCal(); renderSide(true); };
        $('#ocClr').onclick = () => { cal.samples = []; saveCal(); renderSide(true); };
        $('#ocOffCalc').onclick = () => { const r = fitOffset(); if (r == null) alert('같은 원에서 방향을 바꿔 3번 이상 기록해 주세요.'); else { cal.tagOff = Math.round(r); saveCal(); update(); alert(`앞 거리 = ${cal.tagOff} mm 로 넣었습니다. 기록을 지우고 다시 확인해 보세요.`); } };
      }
    }
    // 바뀌는 값
    const $ = s => info.querySelector(s);
    if ($('#ocNext')) { const k = CLICK_ORDER.find(k => !cal.clicks[k]); $('#ocNext').textContent = k ? `다음 클릭: 원 ${k}` + (Object.keys(cal.clicks).length >= 4 ? ' (선택)' : '') : '모든 원을 클릭했습니다'; }
    if ($('#ocRes')) $('#ocRes').innerHTML = S.clickRes && S.clickRes.length ? `<table><tr><th>원</th><th>맞춤 오차</th></tr>${S.clickRes.map(([k, e]) => `<tr><td>${k}</td><td class="${e < 10 ? 'ok' : 'bad'}">${f1(e)} mm</td></tr>`).join('')}</table>` +
      (S.clickRes.length === 4 ? '<div class="note">원 4곳은 오차가 항상 0으로 나옵니다. 5곳 이상 클릭하면 실제 오차를 볼 수 있습니다.</div>' : '') + `<div>저장한 모서리 태그: ${Object.keys(cal.tagCorners).join(', ') || '없음'}</div>` : '';
    if ($('#ocSamp')) {
      const s = cal.samples; $('#ocSamp').innerHTML = s.length ? `<table><tr><th>원</th><th>오차</th><th>x / y</th><th>방향</th></tr>${s.map(o => `<tr><td>${o.c}</td><td class="${Math.hypot(o.dx, o.dy) < 10 ? 'ok' : 'bad'}">${f1(Math.hypot(o.dx, o.dy))} mm</td><td>${o.dx > 0 ? '+' : ''}${f0(o.dx)} / ${o.dy > 0 ? '+' : ''}${f0(o.dy)}</td><td>${f1(o.deg)}°</td></tr>`).join('')}</table><div class="big">평균 ${f1(s.reduce((a, o) => a + Math.hypot(o.dx, o.dy), 0) / s.length)} mm</div>` : '';
    }
    const mats = S.dets.filter(d => !ROBOT_IDS(d.id)).map(d => d.id).sort((a, b) => a - b);
    const camTxt = S.cam ? `카메라: 높이 ${f0(S.cam.z)} mm · 기울기 ${f1(S.cam.tilt)}° · 위치 (${f0(S.cam.x)}, ${f0(S.cam.y)}) · 가로 화각 ${f1(S.cam.hfov)}°` : '카메라: 매트를 맞추면 계산됩니다';
    const rob = S.robots.map(r => { const n = nearest(r); return `<div class="big">🤖 ${r.id}: (${f0(r.x)}, ${f0(r.y)}) mm · ${f1(r.deg)}°</div><div>가까운 원 ${n.k}까지 ${f1(n.d)} mm · 크기로 추정한 태그 높이 ${f0(r.hEst)} mm (입력 ${cal.tagH}) · 보정 전 (${f0(r.raw[0])}, ${f0(r.raw[1])})</div>`; }).join('');
    const frozen = S.video && S.lastFrame && performance.now() - S.lastFrame > 2500;
    $('#ocLive').innerHTML = `<hr>${frozen ? '<div class="bad">⚠️ 영상이 멈췄습니다 — 창이 가려졌거나 카메라가 끊겼습니다. 이 창을 앞으로 가져오거나 「카메라 켜기」를 다시 누르세요.</div>' : ''}${S.drawErr ? `<div class="bad">오류: ${S.drawErr}</div>` : ''}<div>${S.W ? `${S.W}×${S.H_img()}` : '영상 없음'} · 검출 ${f0(S.ms)} ms · ${S.photo ? '사진' : f1(S.fps) + ' fps'}</div><div>매트 태그: ${mats.join(', ') || '없음'} · 맞춤: ${S.via === 'tags' ? '태그' : S.via === 'clicks' ? '클릭' : '—'}</div><div>${camTxt}</div>${rob || (S.Hm ? '<div>로봇 태그(ID 0~7)가 보이지 않습니다</div>' : '')}`;
    const hint = win.querySelector('#ocHint');
    hint.textContent = st === 2 ? '번호 원 가운데를 클릭하세요 (파란 점). 분홍 선 = 계산한 매트 그림 — 실제 매트 선과 겹치면 맞은 것입니다.' : '초록 = 저장된 모서리 태그 · 노랑 = 아직 저장 안 된 태그 · 주황 = 로봇 태그 · 빨간 화살표 = 보정한 로봇 위치와 방향';
  };
  // 앞 거리: 같은 원 기록들에서 로봇 중심 = 태그 − off·앞방향 이 가장 덜 흩어지는 off (최소제곱)
  const fitOffset = () => {
    const by = {}; cal.samples.filter(o => o.tx != null).forEach(o => (by[o.c] = by[o.c] || []).push(o));
    let num = 0, den = 0, n = 0;
    for (const g of Object.values(by)) {
      if (g.length < 2) continue;
      const mt = [g.reduce((a, o) => a + o.tx, 0) / g.length, g.reduce((a, o) => a + o.ty, 0) / g.length];
      const mu = [g.reduce((a, o) => a + o.ux, 0) / g.length, g.reduce((a, o) => a + o.uy, 0) / g.length];
      for (const o of g) { const du = [o.ux - mu[0], o.uy - mu[1]]; num += (o.tx - mt[0]) * du[0] + (o.ty - mt[1]) * du[1]; den += du[0] ** 2 + du[1] ** 2; n++; }
    }
    return n >= 3 && den > 0.5 ? num / den : null;
  };
  const nearest = r => { let best = { k: 0, d: 1e9 }; for (const [k, [x, y]] of Object.entries(CIRC)) { const d = Math.hypot(r.x - x, r.y - y); if (d < best.d) best = { k: +k, d }; } return best; };

  // ───────── 시뮬레이터 칸 버튼 ─────────
  let box = null;
  const ui = () => {
    const sim = document.getElementById('sim'); if (sim && sim.hidden) return;
    const after = document.getElementById('realWrap') || document.getElementById('vlaWrap'); if (!after) return;
    if (!box || !document.body.contains(box)) { box = document.createElement('div'); box.id = 'ocWrap'; box.innerHTML = `<button id="ocOpen"></button>`; box.querySelector('#ocOpen').onclick = open; }
    const lb = t('📷 천장 웹캠 보정'), bt = box.querySelector('#ocOpen'); if (bt.textContent !== lb) bt.textContent = lb; // 언어가 나중에 정해져도 따라감
    if (box.previousElementSibling !== after) after.after(box);
  };
  setInterval(ui, 500);

  window.__overcam = { open, close, startCamera, startPhoto, cal, state: S, homography, apply, cameraPose, unproject, learnTags, CIRC, MAT, update, fitOffset };
})();
