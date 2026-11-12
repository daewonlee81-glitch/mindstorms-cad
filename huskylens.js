// huskylens.js — 허스키렌즈 부품 + 시뮬레이터 동작 (app.js 다음에 불러옵니다. 연결 고리: tools/patch_cadx.py 8번)
//   · CAD 부품 "Electronics HuskyLens AI Camera" (msc-huskylens, RoboMakers 단순화 모델, 52 × 44.5mm, 아래에 1×5 레고 브래킷)
//     — 팔레트 세트 "ESP32 · Arduino · Geekservo · HuskyLens". 렌즈는 부품의 -Z 쪽.
//   · 시뮬레이터: 로보메이커스 코드(워드블럭)의 rm_husky 방식 그대로
//       블록형(색 인식): ID, 중심 X(0~320), 중심 Y(0~240), 가로폭 W, offset = X − 160
//       화살표형(라인 추적): line_start_x, line_end_x, line_end_y  (ID = 선이 보이면 1)
//       detected(ID): 보이는 것이 있으면 참, ID 를 주면 그 ID 일 때만 참 (브리지는 가장 큰 덩어리 하나를 보냄)
//     카메라 화면(320×240, 가로 60°)을 64×48 광선으로 그려 매트 색·물체 색을 봅니다.
//     색 인식의 "학습한 색"(ID1~ID3)과 알고리즘은 시뮬레이터 오른쪽 "허스키렌즈" 칸에서 고릅니다.
//   · 실제 허브: 워드블럭과 같은 파이썬(rm_husky.HuskyLens, husky_spike_esp32 브리지)이 그대로 생성됩니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext, U = window.__umc; if (!C || !X || !U) return;
  const T3 = C.THREE;
  const FILE = 'msc-huskylens';
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '허스키렌즈': ['HuskyLens', 'HuskyLens', 'HuskyLens', 'HuskyLens'],
    '알고리즘': ['Algorithm', 'アルゴリズム', '算法', 'Algoritmo'],
    '색 인식': ['Color recognition', '色認識', '颜色识别', 'Reconocimiento de color'],
    '라인 추적': ['Line tracking', 'ライン追跡', '巡线', 'Seguimiento de línea'],
    '학습한 색': ['Learned colors', '学習した色', '已学习颜色', 'Colores aprendidos'],
    '없음': ['none', 'なし', '无', 'ninguno'],
    '빨강': ['red', '赤', '红', 'rojo'], '주황': ['orange', 'オレンジ', '橙', 'naranja'], '노랑': ['yellow', '黄', '黄', 'amarillo'],
    '초록': ['green', '緑', '绿', 'verde'], '하늘': ['azure', '水色', '天蓝', 'celeste'], '파랑': ['blue', '青', '蓝', 'azul'], '보라': ['violet', '紫', '紫', 'violeta'],
    '안 보임': ['nothing', '見えない', '未检测', 'nada'],
    '선': ['line', 'ライン', '线', 'línea'],
    '카메라 화면 (320×240). 색 인식은 학습한 색 중 가장 큰 덩어리 하나, 라인 추적은 검은 선의 화살표를 보냅니다.': ['Camera view (320×240). Color recognition sends the largest blob of a learned color; line tracking sends the arrow of the black line.', 'カメラ画面 (320×240)。色認識は学習した色の一番大きい塊、ライン追跡は黒い線の矢印を送ります。', '相机画面（320×240）。颜色识别发送已学颜色中最大的色块，巡线发送黑线的箭头。', 'Vista de cámara (320×240). El color envía la mancha más grande de un color aprendido; la línea envía la flecha de la línea negra.'],
  };
  const t = ko => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; return (i != null && TR[ko] && TR[ko][i]) || ko; };

  // ───────── 1. CAD 부품 등록 ─────────
  const DAT = `0 Electronics HuskyLens AI Camera
0 Name: msc-huskylens.dat
0 Author: RoboMakers CAD (simplified model)
0 !LDRAW_ORG Unofficial_Part
0 !LICENSE Licensed under CC BY 4.0 : see CAreadme.txt
0 !KEYWORDS HuskyLens, DFRobot, AI camera, vision sensor

0 BFC CERTIFY CCW

0 // LEGO bracket 1x5 (pin holes vertical, 20 LDU pitch)
1 71 0 0 0 50 0 0 0 10 0 0 0 10 box.dat
${[-40, -20, 0, 20, 40].map(x => `1 0 ${x} 10.05 0 6 0 0 0 1 0 0 0 6 4-4disc.dat\n1 0 ${x} 10.05 0 6 0 0 0 -1 0 0 0 6 4-4disc.dat`).join('\n')}
0 // board 52 x 44.5 mm
1 272 0 -65.6 0 65 0 0 0 55.6 0 0 0 6 box.dat
1 0 0 -65.6 -6.6 62 0 0 0 52.5 0 0 0 0.6 box.dat
0 // camera lens (front = -Z)
1 0 0 -75 -7.2 16 0 0 0 0 16 0 -14 0 4-4cyli.dat
1 0 0 -75 -21.2 16 0 0 0 0 16 0 -1 0 4-4disc.dat
1 33 0 -75 -21.3 10 0 0 0 0 10 0 -1 0 4-4disc.dat
1 0 0 -75 -7.2 16 0 0 0 0 16 0 -14 0 4-4edge.dat
1 0 0 -75 -21.2 16 0 0 0 0 16 0 -1 0 4-4edge.dat
1 15 -42 -108 -7.4 5 0 0 0 4 0 0 0 0.4 box.dat
1 15 42 -108 -7.4 5 0 0 0 4 0 0 0 0.4 box.dat
0 // 2.0 inch screen (back = +Z)
1 0 0 -68 6.6 50 0 0 0 37.5 0 0 0 0.6 box.dat
1 39 0 -68 7.3 46 0 0 0 34 0 0 0 0.1 box.dat
0 // function dial + learning button (top)
1 71 -38 -123.6 0 7 0 0 0 2.4 0 0 0 4 box.dat
1 71 40 -123.6 0 5 0 0 0 2.4 0 0 0 4 box.dat
0 // Gravity 4-pin port (right side)
1 15 67.5 -40 0 2.5 0 0 0 9 0 0 0 4 box.dat
`;
  const LENS = [0, -75, -22], LENSDIR = [0, 0, -1];
  const register = () => {
    const b = X.bundle(), ix = X.index(), D = window.MSCAD_DATA; if (!b || !ix) return false;
    b['parts/' + FILE + '.dat'] = DAT;
    ix.parts[FILE] = { name: 'Electronics HuskyLens AI Camera', rb: '', rbname: 'HuskyLens', sets: { 'extra-1': 1 }, colors: { 272: 'Dark_Blue' }, dc: 272 };
    if (ix.sets && ix.sets['extra-1'] && !/HuskyLens/.test(ix.sets['extra-1'])) ix.sets['extra-1'] += ' · HuskyLens';
    if (D && D.conn) D.conn[FILE] = [-40, -20, 0, 20, 40].flatMap(x => [{ t: 'pinhole', p: [x, 0, 0], d: [0, 1, 0], l: 20 }, { t: 'pinhole', p: [x, 0, 0], d: [0, -1, 0], l: 20 }]);
    return true;
  };
  register();
  try { X.palette(); } catch { }
  setTimeout(() => { try { const m = C.model; if (m && m.parts.some(p => p.file === FILE && !C.objs.has(p.id))) X.reload(); } catch { } }, 2500);

  // ───────── 2. 시뮬레이터: 카메라 화면 그리기 ─────────
  const W = 64, H = 48, HF = 60 * Math.PI / 180, VF = 2 * Math.atan(Math.tan(HF / 2) * 0.75);
  const PAL = [['red', 0], ['orange', 28], ['yellow', 55], ['green', 125], ['azure', 195], ['blue', 228], ['violet', 285]];
  const NAMES = { red: '빨강', orange: '주황', yellow: '노랑', green: '초록', azure: '하늘', blue: '파랑', violet: '보라' };
  const SW = { red: '#e53935', orange: '#fb8c00', yellow: '#fdd835', green: '#43a047', azure: '#29b6f6', blue: '#1e63d6', violet: '#8e44ad' };
  const hueName = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, v = mx / 255, s = mx ? d / mx : 0;
    if (s < .35 || v < .22) return null;
    let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    let best = null, bd = 1e9; for (const [n, hh] of PAL) { const dd = Math.min(Math.abs(h - hh), 360 - Math.abs(h - hh)); if (dd < bd) { bd = dd; best = n; } }
    return bd < 30 ? best : null;
  };
  const cfg = () => { const s = C.model.sim || (C.model.sim = {}); s.husky = s.husky || { algo: 'color', ids: ['red', 'blue', 'green'] }; return s.husky; };
  // 로봇 좌표계(root)에서 렌즈 위치·방향 — 로봇을 새로 만들 때마다 계산
  let camFor = null, cams = {};
  const camsOf = R => {
    if (R === camFor) return cams; camFor = R; cams = {};
    if (!R || !R.fromCad || !R.inner || !R.root) return cams;
    R.root.updateMatrixWorld(true);
    const toRoot = v => R.root.worldToLocal(R.inner.localToWorld(new T3.Vector3(...v)));
    for (const d of R.devices || []) {
      if (d.kind !== 'husky') continue;
      const p = C.model.parts.find(x => x.id === d.id); if (!p) continue;
      const mv = v => [p.rot[0] * v[0] + p.rot[1] * v[1] + p.rot[2] * v[2], p.rot[3] * v[0] + p.rot[4] * v[1] + p.rot[5] * v[2], p.rot[6] * v[0] + p.rot[7] * v[1] + p.rot[8] * v[2]];
      const o = mv(LENS).map((v, i) => v + p.pos[i]), q = mv(LENSDIR).map((v, i) => o[i] + v * 20);
      const a = toRoot(o), b = toRoot(q);
      cams[d.port] = { o: a, d: b.clone().sub(a).normalize() };
    }
    return cams;
  };
  // 로봇 좌표 → 세계 좌표 (물리엔진이 아니면 현재 경기장의 로봇 위치 Te 로 계산 — 학습 중 여러 경기장에서도 맞음)
  const toWorld = (R, v, dir) => {
    if (U.phys && U.phys()) { R.root.updateMatrixWorld(true); return dir ? v.clone().transformDirection(R.root.matrixWorld) : R.root.localToWorld(v.clone()); }
    const P = U.pose(), c = Math.cos(P.th), s = Math.sin(P.th);
    const x = v.x * c + v.z * s, z = -v.x * s + v.z * c;
    return dir ? new T3.Vector3(x, v.y, z) : new T3.Vector3(P.x + x, v.y, P.z + z);
  };
  const propColor = (o, y) => { const base = (o.y0 ?? (o.hgt || 0) / 2) - (o.hgt || 0) / 2; const c = o.top != null ? (y - base > (o.hgt || 0) / 2 ? o.top : o.bottom) : o.color; return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; };
  const shoot = (O, D) => {
    // 물체(세운 원기둥·공으로 봄)
    let best = 1e9, col = null;
    for (const o of U.props() || []) {
      if (o.fallen) continue;
      const r = o.shape === 'ball' ? o.r : (o.cr || o.r || Math.max(o.w || 0, o.d || 0) / 2); if (!r) continue;
      const dx = O.x - o.x, dz = O.z - o.z, a = D.x * D.x + D.z * D.z, b = 2 * (dx * D.x + dz * D.z), cc = dx * dx + dz * dz - r * r, disc = b * b - 4 * a * cc;
      if (disc < 0 || a < 1e-9) continue;
      const tt = (-b - Math.sqrt(disc)) / (2 * a); if (tt <= 1 || tt >= best) continue;
      const y = O.y + D.y * tt, hgt = o.shape === 'ball' ? 2 * o.r : (o.hgt || 0), base = (o.y0 ?? hgt / 2) - hgt / 2;
      if (y < base || y > base + hgt) continue;
      best = tt; col = propColor(o, y);
    }
    // 바닥(매트)
    if (D.y < -1e-6) { const tt = -O.y / D.y; if (tt > 0 && tt < best) { const px = X.matPx ? X.matPx(O.x + D.x * tt, O.z + D.z * tt) : null; if (px) return { c: px, ground: true }; } }
    return col ? { c: col, ground: false } : { c: [150, 150, 150], ground: false, none: true };
  };
  const cache = {};
  const render = port => {
    const R = X.robot, cam = camsOf(R)[port]; if (!cam) return null;
    const P = U.pose(), key = [U.time(), P.x, P.z, P.th, (U.props() || []).length, JSON.stringify(cfg())].join('|');
    if (cache[port] && cache[port].key === key) return cache[port];
    const O = toWorld(R, cam.o), F = toWorld(R, cam.d, true).normalize();
    const up0 = Math.abs(F.y) > .95 ? new T3.Vector3(0, 0, 1) : new T3.Vector3(0, 1, 0);
    const right = new T3.Vector3().crossVectors(F, up0).normalize(), up = new T3.Vector3().crossVectors(right, F).normalize();
    const th = Math.tan(HF / 2), tv = Math.tan(VF / 2), img = new Uint8ClampedArray(W * H * 4), grd = new Uint8Array(W * H);
    const D = new T3.Vector3();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const nx = (i + .5) / W * 2 - 1, ny = 1 - (j + .5) / H * 2;
      D.copy(F).addScaledVector(right, nx * th).addScaledVector(up, ny * tv).normalize();
      const h = shoot(O, D), k = (j * W + i) * 4; img[k] = h.c[0]; img[k + 1] = h.c[1]; img[k + 2] = h.c[2]; img[k + 3] = 255; grd[j * W + i] = h.ground ? 1 : 0;
    }
    const c = cfg(), out = { key, img, algo: c.algo, id: 0, v: [0, 0, 0] };
    if (c.algo === 'line') {
      // 아래쪽에서 시작해 위로 이어지는 검은 선만 따라감 (멀리 있는 다른 선 조각은 무시)
      const runs = j => { const out = []; let st = -1; for (let i = 0; i <= W; i++) { const k = (j * W + i) * 4, dark = i < W && grd[j * W + i] && .299 * img[k] + .587 * img[k + 1] + .114 * img[k + 2] < 80; if (dark && st < 0) st = i; if (!dark && st >= 0) { out.push([st, i - 1]); st = -1; } } return out.filter(r => r[1] - r[0] < W * .6); };
      let prev = null, first = null, last = null, miss = 0;
      for (let j = H - 1; j >= 0; j--) {
        const rs = runs(j); if (!rs.length) { if (first) { if (++miss > 2) break; } continue; }
        const mid = r => (r[0] + r[1]) / 2, ref = prev == null ? W / 2 : prev;
        const r = rs.reduce((a, b) => Math.abs(mid(a) - ref) <= Math.abs(mid(b) - ref) ? a : b);
        if (prev != null && Math.abs(mid(r) - prev) > 6) { if (++miss > 2) break; continue; }
        miss = 0; prev = mid(r); if (!first) first = [j, prev]; last = [j, prev];
      }
      if (first && last && first[0] - last[0] >= 2) { out.id = 1; out.v = [Math.round((first[1] + .5) * 5), Math.round((last[1] + .5) * 5), Math.round((last[0] + .5) * 5)]; out.line = [first, last]; }
    } else {
      const ids = c.ids || [], boxes = ids.map(() => ({ n: 0, x0: 1e9, x1: -1, y0: 1e9, y1: -1 }));
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = (j * W + i) * 4, nm = hueName(img[k], img[k + 1], img[k + 2]); if (!nm) continue;
        const q = ids.indexOf(nm); if (q < 0) continue;
        const b = boxes[q]; b.n++; b.x0 = Math.min(b.x0, i); b.x1 = Math.max(b.x1, i); b.y0 = Math.min(b.y0, j); b.y1 = Math.max(b.y1, j);
      }
      let bi = -1; boxes.forEach((b, q) => { if (b.n >= 3 && (bi < 0 || b.n > boxes[bi].n)) bi = q; });
      if (bi >= 0) { const b = boxes[bi]; out.id = bi + 1; out.v = [Math.round((b.x0 + b.x1 + 1) / 2 * 5), Math.round((b.y0 + b.y1 + 1) / 2 * 5), Math.round((b.x1 - b.x0 + 1) * 5)]; out.box = b; }
    }
    cache[port] = out; return out;
  };

  // ───────── 3. 블록 → 시뮬레이터 API (로보메이커스 rm_husky 와 같은 값) ─────────
  const api = U.api;
  api.wbHusky = (port, what, arg) => {
    try { api.wbTimer(); } catch (e) { throw e; } // 정지 버튼 확인 (다른 센서 블록과 같게)
    const r = render(port) || { id: 0, v: [0, 0, 0] };
    switch (what) {
      case 'detected': { const tg = Number(arg) || 0; return tg === 0 ? r.id > 0 : r.id === tg; }
      case 'id': return r.id;
      case 'x': case 'line_start_x': return r.v[0];
      case 'y': case 'line_end_x': return r.v[1];
      case 'width': case 'line_end_y': return r.v[2];
      case 'offset': return r.v[0] - 160;
      default: return 0;
    }
  };
  const installGen = () => {
    const G = window.javascript && window.javascript.javascriptGenerator; if (!G || !G.forBlock) return false;
    const F = G.forBlock, A = G.ORDER_ATOMIC ?? 0, N = G.ORDER_NONE ?? 99, port = b => JSON.stringify(String(b.getFieldValue('PORT') || 'A').replace(/^Port\./, ''));
    const mk = { rm_husky_detected: (b, g) => [`api.wbHusky(${port(b)}, 'detected', ${(g || G).valueToCode(b, 'ID', N) || '0'})`, A],
      rm_husky_value: b => [`api.wbHusky(${port(b)}, ${JSON.stringify(b.getFieldValue('WHAT') || 'id')})`, A],
      rm_husky_line: b => [`api.wbHusky(${port(b)}, ${JSON.stringify(b.getFieldValue('WHAT') || 'line_start_x')})`, A] };
    for (const k in mk) { mk[k].__hk = 1; if (!F[k] || !F[k].__hk) F[k] = mk[k]; }
    return true;
  };
  installGen(); setInterval(installGen, 2000); // 워드블럭 동기화가 생성기를 다시 정의해도 되돌림

  // 포트 표(시뮬레이터 오른쪽)에 보이는 값
  window.__husky = {
    render,
    text: port => { const r = render(port); if (!r) return ''; if (!r.id) return t('안 보임'); return r.algo === 'line' ? `${t('선')} ${r.v[0]}→${r.v[1]}` : `ID${r.id} · ${r.v[0]},${r.v[1]} · W${r.v[2]}`; },
  };

  // ───────── 4. 시뮬레이터 "허스키렌즈" 칸: 알고리즘·학습한 색·카메라 화면 ─────────
  const css = document.createElement('style');
  css.textContent = `#hkWrap{margin-top:6px}#hkWrap .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;margin:3px 0}
#hkWrap select{font-size:12px}#hkWrap canvas{width:100%;max-width:240px;aspect-ratio:4/3;background:#222;border-radius:6px;image-rendering:pixelated;display:block}
#hkWrap .note{font-size:11px;opacity:.7;line-height:1.4}`;
  document.head.appendChild(css);
  let wrap = null, cv = null, lastSig = '';
  const COLS = ['red', 'orange', 'yellow', 'green', 'azure', 'blue', 'violet'];
  const build = () => {
    const after = document.getElementById('simPortWrap') || document.getElementById('simPorts'); if (!after) return null;
    wrap = document.createElement('div'); wrap.id = 'hkWrap'; after.after(wrap); lastSig = ''; return wrap;
  };
  const ui = () => {
    const sim = document.getElementById('sim'); if (sim && sim.hidden) return;
    const R = X.robot, ports = Object.keys(camsOf(R));
    if (!ports.length) { if (wrap) wrap.hidden = true; return; }
    if (!wrap || !document.body.contains(wrap)) build(); if (!wrap) return;
    wrap.hidden = false;
    const c = cfg(), sig = JSON.stringify([ports, c, document.documentElement.lang]);
    if (sig !== lastSig) {
      lastSig = sig;
      const opt = (v, txt, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${txt}</option>`;
      wrap.innerHTML = `<div class="label">🔍 ${t('허스키렌즈')} (${ports.join(', ')})</div>
<div class="row">${t('알고리즘')} <select id="hkAlgo">${opt('color', t('색 인식'), c.algo !== 'line')}${opt('line', t('라인 추적'), c.algo === 'line')}</select></div>
<div class="row" id="hkIds" ${c.algo === 'line' ? 'hidden' : ''}>${t('학습한 색')} ${[0, 1, 2].map(i => `ID${i + 1} <select data-i="${i}">${opt('', t('없음'), !c.ids[i])}${COLS.map(k => opt(k, t(NAMES[k]), c.ids[i] === k)).join('')}</select>`).join(' ')}</div>
<canvas width="320" height="240"></canvas><div class="note">${t('카메라 화면 (320×240). 색 인식은 학습한 색 중 가장 큰 덩어리 하나, 라인 추적은 검은 선의 화살표를 보냅니다.')}</div>`;
      cv = wrap.querySelector('canvas');
      wrap.querySelector('#hkAlgo').onchange = e => { cfg().algo = e.target.value; for (const k in cache) delete cache[k]; X.apply && C.model.parts[0] && X.apply(C.model.parts[0]); };
      for (const s of wrap.querySelectorAll('#hkIds select')) s.onchange = e => { cfg().ids[+e.target.dataset.i] = e.target.value || null; for (const k in cache) delete cache[k]; X.apply && C.model.parts[0] && X.apply(C.model.parts[0]); };
    }
    // 카메라 화면
    const r = render(ports[0]); if (!r || !cv) return;
    const g = cv.getContext('2d'), id = new ImageData(r.img, W, H), tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; tmp.getContext('2d').putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, 320, 240);
    g.lineWidth = 3; g.font = 'bold 16px sans-serif';
    if (r.algo === 'line' && r.line) {
      const [a, b] = r.line; g.strokeStyle = '#00e5ff'; g.beginPath(); g.moveTo((a[1] + .5) * 5, (a[0] + .5) * 5); g.lineTo((b[1] + .5) * 5, (b[0] + .5) * 5); g.stroke();
      g.fillStyle = '#00e5ff'; g.beginPath(); g.arc((b[1] + .5) * 5, (b[0] + .5) * 5, 6, 0, 7); g.fill();
    } else if (r.box) {
      const b = r.box, col = SW[cfg().ids[r.id - 1]] || '#fff'; g.strokeStyle = '#fff'; g.strokeRect(b.x0 * 5, b.y0 * 5, (b.x1 - b.x0 + 1) * 5, (b.y1 - b.y0 + 1) * 5);
      g.fillStyle = col; g.fillRect(b.x0 * 5, b.y0 * 5 - 20, 52, 20); g.fillStyle = '#fff'; g.fillText('ID' + r.id, b.x0 * 5 + 6, b.y0 * 5 - 4);
    }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 216, 320, 24); g.fillStyle = '#fff'; g.font = '13px monospace';
    g.fillText(r.algo === 'line' ? `ID ${r.id}  start ${r.v[0]}  end ${r.v[1]},${r.v[2]}` : `ID ${r.id}  X ${r.v[0]}  Y ${r.v[1]}  W ${r.v[2]}`, 8, 233);
  };
  setInterval(ui, 200);
})();
