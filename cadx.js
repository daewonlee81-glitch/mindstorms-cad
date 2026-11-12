// cadx.js — CAD 편집 덧붙임 (app.js 다음에 불러옵니다. app.js 연결 고리는 tools/patch_cadx.py)
//   1. 팔레트에서 부품을 끌 때의 미리보기를 밝은 반투명 하늘색으로 — 검정 부품의 어두운 미리보기와 검정 윤곽선이
//      붙일 자리(핀홀·액슬홀)를 가리던 문제. HUD의 "밝은 미리보기"를 끄면 예전처럼 원래 색으로 보입니다.
//   2. 미세 각도 회전 — HUD "각도" 칸(기본 90°, 45·30·22.5·15·10·5·1° 또는 직접 입력)이 Y/X/Z 버튼과
//      R/T/F 키의 회전 각도가 됩니다. Shift를 누르면 반대 방향. "회전 초기화"로 처음 방향으로.
//   3. STL 불러오기 — 3D 프린트용 STL(바이너리·텍스트)을 LDraw 부품으로 바꿔 팔레트 "내 STL 부품"에 넣고 모델에 추가합니다.
//      · 단위(mm·cm·inch), 위쪽 축(Z 위·Y 위), 배율, 최대 삼각형 수(많으면 줄임), 색을 고릅니다.
//      · 부품은 이 브라우저(IndexedDB)에 저장되고, .ldr 로 저장하면 파일 끝에 "0 FILE stl_….dat" 로 함께 들어가
//        다른 컴퓨터·수업 도면에서도 열립니다.
//      · STL 부품에는 연결점이 없어 자석 스냅은 되지 않습니다 (격자 이동·회전으로 맞춥니다).
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext; if (!C || !X) return;
  const THREE = C.THREE;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '밝은 미리보기': ['Bright preview', '明るいプレビュー', '高亮预览', 'Vista previa clara'],
    '팔레트에서 끌 때 부품을 밝은 반투명 색으로 보여 붙일 자리가 잘 보이게 합니다': ['Shows the dragged part in a bright see-through colour so the holes you attach to stay visible', 'パレットからドラッグ中の部品を明るい半透明で表示し、取り付け位置を見やすくします', '从部件栏拖动时以明亮半透明颜色显示部件，便于看清连接位置', 'Muestra la pieza arrastrada en un color claro y translúcido para ver dónde se une'],
    '각도': ['Angle', '角度', '角度', 'Ángulo'],
    '회전 각도 (Y/X/Z 버튼·R/T/F 키). Shift를 누르면 반대 방향': ['Rotation step for the Y/X/Z buttons and R/T/F keys. Hold Shift to turn the other way', 'Y/X/Zボタン・R/T/Fキーの回転角度。Shiftで逆方向', 'Y/X/Z 按钮和 R/T/F 键的旋转角度。按住 Shift 反向', 'Paso de giro de los botones Y/X/Z y las teclas R/T/F. Mayús para girar al revés'],
    '회전 초기화': ['Reset rotation', '回転リセット', '重置旋转', 'Restablecer giro'],
    'STL 불러오기': ['Import STL', 'STL読み込み', '导入 STL', 'Importar STL'],
    '3D 프린트용 STL 파일을 부품으로 불러옵니다': ['Import a 3D-print STL file as a part', '3DプリントのSTLファイルを部品として読み込みます', '将 3D 打印 STL 文件导入为部件', 'Importa un archivo STL de impresión 3D como pieza'],
    '내 STL 부품': ['My STL parts', 'マイSTL部品', '我的 STL 部件', 'Mis piezas STL'],
    '이름': ['Name', '名前', '名称', 'Nombre'],
    '단위': ['Units', '単位', '单位', 'Unidades'],
    '위쪽 축': ['Up axis', '上方向の軸', '向上轴', 'Eje hacia arriba'],
    'Z 위 (3D 프린트 보통)': ['Z up (usual for 3D printing)', 'Z が上 (3Dプリントで一般的)', 'Z 向上（3D 打印常用）', 'Z arriba (habitual en impresión 3D)'],
    'Y 위': ['Y up', 'Y が上', 'Y 向上', 'Y arriba'],
    '배율 %': ['Scale %', '倍率 %', '缩放 %', 'Escala %'],
    '최대 삼각형 수': ['Max triangles', '最大三角形数', '最多三角形数', 'Triángulos máx.'],
    '색': ['Colour', '色', '颜色', 'Color'],
    '불러오기': ['Import', '読み込む', '导入', 'Importar'],
    '취소': ['Cancel', 'キャンセル', '取消', 'Cancelar'],
    '삼각형 {0}개 · 크기 {1} × {2} × {3} mm': ['{0} triangles · size {1} × {2} × {3} mm', '三角形 {0} 個 · サイズ {1} × {2} × {3} mm', '{0} 个三角形 · 尺寸 {1} × {2} × {3} mm', '{0} triángulos · tamaño {1} × {2} × {3} mm'],
    '삼각형이 많아 {0}개 정도로 줄입니다': ['Too many triangles — will be reduced to about {0}', '三角形が多いので約 {0} 個に減らします', '三角形过多，将精简到约 {0} 个', 'Demasiados triángulos: se reducirán a unos {0}'],
    'STL 부품은 연결점이 없어 자석 스냅이 되지 않습니다. 이동·회전으로 맞춰 주세요.': ['STL parts have no connection points, so magnetic snap does not work. Place them with move and rotate.', 'STL部品には接続点がないため磁石スナップは使えません。移動・回転で合わせてください。', 'STL 部件没有连接点，无法磁吸。请用移动和旋转对齐。', 'Las piezas STL no tienen puntos de conexión, así que el imán no funciona. Colócalas moviendo y girando.'],
    'STL 파일을 읽을 수 없습니다: {0}': ['Cannot read STL file: {0}', 'STLファイルを読めません: {0}', '无法读取 STL 文件：{0}', 'No se puede leer el STL: {0}'],
    'STL 부품 추가됨: {0} (삼각형 {1}개)': ['STL part added: {0} ({1} triangles)', 'STL部品を追加: {0} (三角形 {1} 個)', '已添加 STL 部件：{0}（{1} 个三角形）', 'Pieza STL añadida: {0} ({1} triángulos)'],
    '회전: {0}°': ['Rotation: {0}°', '回転: {0}°', '旋转：{0}°', 'Giro: {0}°'],
    '부품을 먼저 선택하세요': ['Select a part first', '先に部品を選んでください', '请先选择部件', 'Selecciona primero una pieza'],
    '회색': ['Grey', 'グレー', '灰色', 'Gris'], '흰색': ['White', '白', '白色', 'Blanco'], '검정': ['Black', '黒', '黑色', 'Negro'],
    '빨강': ['Red', '赤', '红色', 'Rojo'], '파랑': ['Blue', '青', '蓝色', 'Azul'], '노랑': ['Yellow', '黄', '黄色', 'Amarillo'],
    '초록': ['Green', '緑', '绿色', 'Verde'], '주황': ['Orange', 'オレンジ', '橙色', 'Naranja'], '하늘색': ['Azure', '水色', '天蓝色', 'Celeste'],
  };
  const lang = () => (document.documentElement.lang || 'ko').slice(0, 2);
  const t = (ko, ...a) => { const i = LIX[lang()]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.replace('{' + k + '}', v); }); return s; };
  const $ = s => document.querySelector(s);
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { } } };
  const cadx = window.__cadx = window.__cadx || {};

  // ───────────── 1. 밝은 미리보기 ─────────────
  let bright = store.get('mscad.brightGhost', '1') !== '0';
  const TINT = new THREE.Color(0x4fc3ff);
  cadx.ghost = (group) => {
    group.traverse(o => {
      const mats = o.material && (Array.isArray(o.material) ? o.material : [o.material]);
      if (!mats) return;
      const map = m => {
        const c = m.clone(); c.transparent = true;
        if (!bright) { if (o.isMesh) c.opacity = .7; return c; }
        if (o.isMesh) {
          if (c.color) c.color.lerp(TINT, .65);
          if (c.emissive) c.emissive.set(0x0a3550);
          c.opacity = .4; c.depthWrite = false;
        } else { // 윤곽선: 검정 대신 옅은 파랑, 거의 투명하게
          if (c.color) c.color.set(0x1e88e5);
          c.opacity = .25; c.depthWrite = false;
        }
        return c;
      };
      if (o.isMesh || o.isLine || o.isLineSegments) o.material = Array.isArray(o.material) ? o.material.map(map) : map(o.material);
    });
  };

  // ───────────── 2. 미세 각도 회전 ─────────────
  let step = parseFloat(store.get('mscad.rotStep', '90')) || 90;
  const rotM = (ax, deg) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return ax === 'x' ? [1, 0, 0, 0, c, -s, 0, s, c] : ax === 'y' ? [c, 0, s, 0, 1, 0, -s, 0, c] : [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  const mul = (A, B) => { const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let v = 0; for (let k = 0; k < 3; k++) v += A[i * 3 + k] * B[k * 3 + j]; v = Math.round(v * 1e6) / 1e6; r.push(Object.is(v, -0) || Math.abs(v) < 1e-9 ? 0 : v); } return r; };
  const rotate = (ax, deg) => {
    const p = X.sel; if (!p) { X.status(t('부품을 먼저 선택하세요')); return; }
    X.push(); p.rot = mul(rotM(ax, deg), p.rot); X.apply(p);
  };
  const resetRot = () => { const p = X.sel; if (!p) { X.status(t('부품을 먼저 선택하세요')); return; } X.push(); p.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1]; X.apply(p); };
  const fmt = v => (Math.round(v * 100) / 100).toString();
  const relabel = () => { for (const b of document.querySelectorAll('[data-rot],[data-crot]')) b.textContent = `${(b.dataset.rot || b.dataset.crot).toUpperCase()} ${fmt(step)}°`; };
  // 90°가 아니거나 Shift를 누르면 이 스크립트가 돌립니다 (90°는 app.js 그대로).
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-rot],[data-crot]'); if (!b) return;
    if (step === 90 && !e.shiftKey) return;
    e.stopImmediatePropagation(); e.preventDefault(); rotate(b.dataset.rot || b.dataset.crot, e.shiftKey ? -step : step);
  }, true);
  const KEYAX = { r: 'y', t: 'x', f: 'z' };
  window.addEventListener('keydown', e => {
    const ax = KEYAX[(e.key || '').toLowerCase()]; if (!ax || e.ctrlKey || e.metaKey || e.altKey) return;
    const tg = e.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if ($('#sim') && !$('#sim').hidden) return;
    if (step === 90 && !e.shiftKey) return;
    if (!X.sel) return;
    e.stopImmediatePropagation(); e.preventDefault(); rotate(ax, e.shiftKey ? -step : step);
  }, true);

  // ───────────── HUD 칸 ─────────────
  const css = document.createElement('style');
  css.textContent = `#rotStepBox{display:inline-flex;align-items:center;gap:4px;font-size:12px}#rotStep{width:64px;padding-right:2px}
#stlDlg{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
#stlDlg .box{background:var(--panel,#fff);color:var(--fg,#111);border-radius:12px;padding:18px 20px;min-width:340px;max-width:calc(100% - 32px);box-shadow:0 12px 40px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:10px;font-size:14px}
#stlDlg .row{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center}#stlDlg .note{font-size:12px;opacity:.75;line-height:1.45}#stlDlg .act{display:flex;gap:8px;justify-content:flex-end}`;
  document.head.appendChild(css);
  const addHud = () => {
    const z = document.querySelector('#hud [data-rot="z"]'); if (!z || $('#rotStepBox')) return;
    const box = document.createElement('span'); box.id = 'rotStepBox';
    box.innerHTML = `<span class="label"></span><input type="number" id="rotStep" min="0.1" max="360" step="any" list="rotStepList"><datalist id="rotStepList">${[90, 45, 30, 22.5, 15, 10, 5, 1].map(v => `<option value="${v}">`).join('')}</datalist>°<button class="small" id="btnRotReset"></button>`;
    z.after(box);
    const inp = box.querySelector('#rotStep'); inp.value = step;
    inp.onchange = inp.oninput = () => { const v = parseFloat(inp.value); if (v > 0 && v <= 360) { step = v; store.set('mscad.rotStep', String(v)); relabel(); } };
    box.querySelector('#btnRotReset').onclick = resetRot;
    // 밝은 미리보기
    const mg = $('#magnet'); const lab = document.createElement('label'); lab.id = 'brightBox';
    lab.innerHTML = '<input type="checkbox" id="brightGhost"> <span></span>';
    (mg && mg.closest('label') ? mg.closest('label') : box).after(lab);
    const cb = lab.querySelector('input'); cb.checked = bright; cb.onchange = () => { bright = cb.checked; store.set('mscad.brightGhost', bright ? '1' : '0'); };
    // STL 버튼 (부품 목록의 "사용량" 옆 — 윗줄 도구 막대는 자리가 모자람)
    const op = $('#btnUsage') || $('#btnOpen');
    if (op && !$('#btnStl')) { const b = document.createElement('button'); b.id = 'btnStl'; b.className = 'small'; b.onclick = () => stlIn.click(); op.after(b); }
    texts();
  };
  const texts = () => {
    const b = $('#rotStepBox'); if (b) { b.querySelector('.label').textContent = t('각도'); b.title = t('회전 각도 (Y/X/Z 버튼·R/T/F 키). Shift를 누르면 반대 방향'); b.querySelector('#btnRotReset').textContent = '↺0°'; b.querySelector('#btnRotReset').title = t('회전 초기화'); }
    const l = $('#brightBox'); if (l) { l.querySelector('span').textContent = t('밝은 미리보기'); l.title = t('팔레트에서 끌 때 부품을 밝은 반투명 색으로 보여 붙일 자리가 잘 보이게 합니다'); }
    const s = $('#btnStl'); if (s) { s.textContent = '+ STL'; s.title = t('3D 프린트용 STL 파일을 부품으로 불러옵니다'); }
    const ix = X.index(); if (ix && ix.sets && ix.sets['stl-1'] && ix.sets['stl-1'] !== t('내 STL 부품')) { ix.sets['stl-1'] = t('내 STL 부품'); try { X.palette(); } catch { } }
    relabel();
  };
  new MutationObserver(() => { texts(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // app.js 의 번역이 버튼 글자를 되돌릴 수 있어 가끔 다시 붙입니다
  setInterval(() => { addHud(); const b = document.querySelector('[data-rot="y"]'); if (b && !b.textContent.includes(fmt(step) + '°')) relabel(); }, 1500);

  // ───────────── 3. STL 불러오기 ─────────────
  const stlIn = document.createElement('input'); stlIn.type = 'file'; stlIn.accept = '.stl,model/stl,application/sla'; stlIn.hidden = true; document.body.appendChild(stlIn);
  stlIn.onchange = () => { const f = stlIn.files[0]; stlIn.value = ''; if (f) openStl(f); };
  // 파일 열기·끌어 놓기로 .stl 이 오면 가로챕니다
  document.addEventListener('change', e => { const el = e.target; if (el && el.id === 'fileIn' && el.files && el.files[0] && /\.stl$/i.test(el.files[0].name)) { const f = el.files[0]; e.stopImmediatePropagation(); el.value = ''; openStl(f); } }, true);
  window.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f && /\.stl$/i.test(f.name)) { e.preventDefault(); e.stopImmediatePropagation(); const h = $('#dropHint'); if (h) h.hidden = true; openStl(f); } }, true);
  const fi = $('#fileIn'); if (fi && fi.accept && !/\.stl/.test(fi.accept)) fi.accept += ',.stl';

  const parseStl = buf => {
    const dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (buf.byteLength === 84 + n * 50 && n > 0) {
      const p = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) p[i * 9 + k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true);
      return p;
    }
    const txt = new TextDecoder().decode(new Uint8Array(buf)); const out = [];
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
    while ((m = re.exec(txt))) out.push(+m[1], +m[2], +m[3]);
    if (!out.length || out.length % 9) throw new Error('STL');
    return new Float32Array(out);
  };
  // 정점 합치기(격자 h) → 인덱스 삼각형, 겹친 삼각형 제거
  const weld = (p, h) => {
    const map = new Map(), V = [], cnt = [], I = [];
    const key = (x, y, z) => Math.round(x / h) + ',' + Math.round(y / h) + ',' + Math.round(z / h);
    const id = (x, y, z) => { const k = key(x, y, z); let i = map.get(k); if (i == null) { i = V.length / 3; map.set(k, i); V.push(0, 0, 0); cnt.push(0); } V[i * 3] += x; V[i * 3 + 1] += y; V[i * 3 + 2] += z; cnt[i]++; return i; };
    const seen = new Set();
    for (let t3 = 0; t3 < p.length; t3 += 9) {
      const a = id(p[t3], p[t3 + 1], p[t3 + 2]), b = id(p[t3 + 3], p[t3 + 4], p[t3 + 5]), c = id(p[t3 + 6], p[t3 + 7], p[t3 + 8]);
      if (a === b || b === c || a === c) continue;
      const s = [a, b, c].sort((u, v) => u - v).join(); if (seen.has(s)) continue; seen.add(s); I.push(a, b, c);
    }
    for (let i = 0; i < cnt.length; i++) { V[i * 3] /= cnt[i]; V[i * 3 + 1] /= cnt[i]; V[i * 3 + 2] /= cnt[i]; }
    return { V, I };
  };
  const bboxOf = p => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { const v = p[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; } return { mn, mx }; };
  const reduce = (p, maxT) => {
    let m = weld(p, 1e-3); if (m.I.length / 3 <= maxT) return m;
    const { mn, mx } = bboxOf(p), diag = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1;
    let lo = diag / 2000, hi = diag / 8, best = null;
    for (let it = 0; it < 14; it++) { const h = Math.sqrt(lo * hi); const r = weld(p, h); if (r.I.length / 3 > maxT) lo = h; else { best = r; hi = h; } if (best && best.I.length / 3 > maxT * .9) break; }
    return best || weld(p, hi);
  };
  // 날카로운 모서리 (LDraw 2번 줄) — 모양이 또렷해지고 부드러운 음영이 모서리에서 끊깁니다
  const sharpEdges = (V, I, deg = 60, maxN = 30000) => {
    const nrm = []; for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nrm.push(nx / l, ny / l, nz / l);
    }
    const em = new Map();
    for (let f = 0; f < I.length / 3; f++) for (let k = 0; k < 3; k++) {
      const a = I[f * 3 + k], b = I[f * 3 + (k + 1) % 3], key = a < b ? a + '_' + b : b + '_' + a;
      const e = em.get(key); if (e) e.push(f); else em.set(key, [f]);
    }
    const cosT = Math.cos(deg * Math.PI / 180), out = [];
    for (const [key, fs] of em) {
      let sharp = fs.length !== 2;
      if (!sharp) { const [f, g] = fs; sharp = nrm[f * 3] * nrm[g * 3] + nrm[f * 3 + 1] * nrm[g * 3 + 1] + nrm[f * 3 + 2] * nrm[g * 3 + 2] < cosT; }
      if (sharp) { const [a, b] = key.split('_').map(Number); out.push(a, b); if (out.length / 2 >= maxN) break; }
    }
    return out;
  };
  const UNIT = { mm: 1, cm: 10, inch: 25.4 };
  // STL → LDraw (LDU = 0.4mm, -Y 위). 바닥이 y=0, 가로 가운데가 원점.
  const toLdraw = (src, o) => {
    const k = UNIT[o.unit] * (o.scale / 100) / 0.4, p = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2];
      if (o.up === 'z') { p[i] = x * k; p[i + 1] = -z * k; p[i + 2] = y * k; } else { p[i] = x * k; p[i + 1] = -y * k; p[i + 2] = -z * k; }
    }
    const { mn, mx } = bboxOf(p), cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, by = mx[1];
    for (let i = 0; i < p.length; i += 3) { p[i] -= cx; p[i + 1] -= by; p[i + 2] -= cz; }
    const { V, I } = reduce(p, o.maxT), E = sharpEdges(V, I);
    const f = v => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
    const P = i => f(V[i * 3]) + ' ' + f(V[i * 3 + 1]) + ' ' + f(V[i * 3 + 2]);
    // 감김 방향: 부호 있는 부피가 + 이면 CCW (BFC 인증이 있어야 LDraw 로더가 면을 매끄럽게 칠합니다)
    let vol = 0; for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3; vol += V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1]) - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c]) + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c]); }
    const L = [`0 ${o.title}`, `0 Name: ${o.file}.dat`, '0 Author: RoboMakers CAD (STL import)', '0 !LDRAW_ORG Unofficial_Part', vol >= 0 ? '0 BFC CERTIFY CCW' : '0 BFC CERTIFY CW', ''];
    for (let i = 0; i < I.length; i += 3) L.push(`3 16 ${P(I[i])} ${P(I[i + 1])} ${P(I[i + 2])}`);
    for (let i = 0; i < E.length; i += 2) L.push(`2 24 ${P(E[i])} ${P(E[i + 1])}`);
    return { text: L.join('\n') + '\n', tris: I.length / 3 };
  };

  // ── 부품 등록·저장 ──
  const DB = 'mscad-stl';
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('parts', { keyPath: 'file' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbAll = async () => { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('parts').objectStore('parts').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); };
  const idbPut = async rec => { try { const d = await idb(); d.transaction('parts', 'readwrite').objectStore('parts').put(rec); } catch (e) { console.warn('stl save', e); } };
  const register = (file, title, text, color = 71) => {
    const b = X.bundle(), ix = X.index(); if (!b || !ix) return false;
    b['parts/' + file + '.dat'] = text;
    ix.sets = ix.sets || {}; if (!ix.sets['stl-1']) ix.sets['stl-1'] = t('내 STL 부품');
    ix.parts[file] = { name: 'STL ' + title, rb: '', sets: { 'stl-1': 1 }, colors: { [color]: '' }, dc: color, dcs: { 'stl-1': color }, stl: 1 };
    return true;
  };
  const titleOf = text => { const m = /^0 (?!Name:|Author:|!|BFC)(.+)$/m.exec(text); return m ? m[1].trim() : 'STL'; };
  cadx.onLoadText = text => {
    if (!/^0 FILE stl_/m.test(text)) return;
    const lines = text.split(/\r?\n/); let cur = null, buf = [];
    const flush = () => { if (cur) { const body = buf.join('\n') + '\n', file = cur, title = titleOf(body); if (register(file, title, body)) idbPut({ file, title, text: body, color: 71, t: Date.now() }); } cur = null; buf = []; };
    for (const ln of lines) {
      const m = /^0 FILE (stl_[\w-]+)\.dat\s*$/i.exec(ln.trim());
      if (m) { flush(); cur = m[1].toLowerCase(); continue; }
      if (/^0 (NOFILE|FILE)\b/.test(ln.trim())) { flush(); continue; }
      if (cur) buf.push(ln);
    }
    flush();
    try { X.palette(); } catch { }
  };
  cadx.onSaveText = (text, model) => {
    const b = X.bundle(), used = [...new Set((model.parts || []).map(p => p.file).filter(f => /^stl_/.test(f) && b['parts/' + f + '.dat']))];
    if (!used.length) return text;
    return text + used.map(f => `0 FILE ${f}.dat\n${b['parts/' + f + '.dat'].replace(/\n+$/, '')}\n0 NOFILE\n`).join('');
  };
  // 시작할 때: 저장해 둔 STL 부품을 먼저 등록한 뒤 app.js 가 자동 저장 모델을 엽니다 (patch: __cadxReady).
  cadx.ready = window.__cadxReady = (async () => {
    let n = 0;
    try { for (const r of await idbAll()) if (register(r.file, r.title, r.text, r.color)) n++; } catch (e) { console.warn('stl load', e); }
    return n;
  })();
  // (혹시 모델을 먼저 열었으면) STL 부품이 비어 있는 경우 다시 그림
  cadx.ready.then(n => { if (!n) return; setTimeout(() => { try { const m = C.model; if (m && m.parts.some(p => /^stl_/.test(p.file) && !C.objs.has(p.id))) X.reload(); X.palette(); } catch { } }, 1500); });

  const slug = s => (s || 'part').normalize('NFKD').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 24) || 'part';
  const COLORS = [[71, '회색'], [15, '흰색'], [0, '검정'], [4, '빨강'], [1, '파랑'], [14, '노랑'], [2, '초록'], [25, '주황'], [322, '하늘색']];
  const openStl = async file => {
    let src;
    try { src = parseStl(await file.arrayBuffer()); } catch (e) { X.status(t('STL 파일을 읽을 수 없습니다: {0}', file.name)); return; }
    const tris = src.length / 9, { mn, mx } = bboxOf(src);
    const base = file.name.replace(/\.stl$/i, '');
    const dlg = document.createElement('div'); dlg.id = 'stlDlg';
    dlg.innerHTML = `<div class="box" role="dialog" aria-modal="true"><strong>${t('STL 불러오기')} · <span class="fn"></span></strong>
<div class="note info"></div>
<div class="row"><label>${t('이름')}</label><input id="stlName"></div>
<div class="row"><label>${t('단위')}</label><select id="stlUnit"><option value="mm">mm</option><option value="cm">cm</option><option value="inch">inch</option></select></div>
<div class="row"><label>${t('위쪽 축')}</label><select id="stlUp"><option value="z">${t('Z 위 (3D 프린트 보통)')}</option><option value="y">${t('Y 위')}</option></select></div>
<div class="row"><label>${t('배율 %')}</label><input id="stlScale" type="number" value="100" min="1" max="10000"></div>
<div class="row"><label>${t('최대 삼각형 수')}</label><input id="stlMax" type="number" value="8000" min="200" max="60000" step="500"></div>
<div class="row"><label>${t('색')}</label><select id="stlColor">${COLORS.map(([c, n]) => `<option value="${c}">${t(n)}</option>`).join('')}</select></div>
<div class="note warn"></div><div class="note">${t('STL 부품은 연결점이 없어 자석 스냅이 되지 않습니다. 이동·회전으로 맞춰 주세요.')}</div>
<div class="act"><button class="small" id="stlCancel">${t('취소')}</button><button class="small primary" id="stlOk">${t('불러오기')}</button></div></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('.fn').textContent = file.name;
    dlg.querySelector('#stlName').value = base;
    const upd = () => {
      const u = UNIT[dlg.querySelector('#stlUnit').value] * (+dlg.querySelector('#stlScale').value || 100) / 100, mxT = +dlg.querySelector('#stlMax').value || 8000;
      dlg.querySelector('.info').textContent = t('삼각형 {0}개 · 크기 {1} × {2} × {3} mm', tris.toLocaleString(), ...[0, 1, 2].map(k => fmt((mx[k] - mn[k]) * u)));
      dlg.querySelector('.warn').textContent = tris > mxT ? t('삼각형이 많아 {0}개 정도로 줄입니다', mxT.toLocaleString()) : '';
    };
    for (const id of ['#stlUnit', '#stlScale', '#stlMax']) dlg.querySelector(id).oninput = upd;
    upd();
    const close = () => dlg.remove();
    dlg.querySelector('#stlCancel').onclick = close;
    dlg.onkeydown = e => { if (e.key === 'Escape') close(); };
    dlg.querySelector('#stlOk').onclick = async () => {
      const title = (dlg.querySelector('#stlName').value || base).trim().slice(0, 60);
      const o = { title, unit: dlg.querySelector('#stlUnit').value, up: dlg.querySelector('#stlUp').value, scale: +dlg.querySelector('#stlScale').value || 100, maxT: Math.max(200, Math.min(60000, +dlg.querySelector('#stlMax').value || 8000)) };
      const color = +dlg.querySelector('#stlColor').value;
      const ix = X.index(); let f = 'stl_' + slug(title), k = 2; while (ix.parts[f]) f = 'stl_' + slug(title) + '_' + k++;
      o.file = f;
      dlg.querySelector('#stlOk').disabled = true; await new Promise(r => setTimeout(r, 30));
      const { text, tris: nt } = toLdraw(src, o);
      register(f, title, text, color); idbPut({ file: f, title, text, color, t: Date.now() });
      close();
      try { X.palette(); } catch { }
      await X.add(f, color);
      X.status(t('STL 부품 추가됨: {0} (삼각형 {1}개)', title, nt.toLocaleString()));
    };
    dlg.querySelector('#stlName').focus();
  };
  cadx.importStl = openStl;
  addHud();
})();
