// simports.js — 로봇 시뮬레이터 "포트 연결" (app.js 다음에 불러옵니다. 연결 고리: tools/patch_cadx.py 6번)
//   CAD 모델에서 찾은 모터·센서마다 포트(A~F)를 고를 수 있습니다.
//   · 고른 포트는 그 부품의 "포트 메모"(CAD 오른쪽 '선택한 부품')에 저장되어 .ldr 에도 남습니다.
//   · 다른 장치가 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.
//   · 바퀴 모터의 포트가 바뀌면 "왼쪽/오른쪽 바퀴 모터" 설정도 따라 바뀝니다.
//   · 프로그램이 실행 중일 때는 바꿀 수 없습니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext; if (!C || !X || !('robot' in X)) return;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '포트 연결': ['Port connections', 'ポート接続', '端口连接', 'Conexiones de puertos'],
    '모터': ['Motor', 'モーター', '电机', 'Motor'],
    '컬러센서': ['Colour sensor', 'カラーセンサー', '颜色传感器', 'Sensor de color'],
    '거리센서': ['Distance sensor', '距離センサー', '距离传感器', 'Sensor de distancia'],
    '힘센서': ['Force sensor', 'フォースセンサー', '力传感器', 'Sensor de fuerza'],
    '허스키렌즈': ['HuskyLens', 'HuskyLens', 'HuskyLens', 'HuskyLens'],
    '왼쪽 바퀴': ['left wheel', '左の車輪', '左轮', 'rueda izquierda'],
    '오른쪽 바퀴': ['right wheel', '右の車輪', '右轮', 'rueda derecha'],
    '앞': ['front', '前', '前', 'delante'], '뒤': ['back', '後ろ', '后', 'detrás'],
    '왼쪽': ['left', '左', '左', 'izquierda'], '오른쪽': ['right', '右', '右', 'derecha'], '가운데': ['centre', '中央', '中间', 'centro'],
    '고른 포트는 CAD 부품의 포트 메모에 저장됩니다. 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.': ['The port is saved in the part’s port note in the CAD. Picking a port that is already used swaps the two devices.', 'ポートはCAD部品のポートメモに保存されます。使用中のポートを選ぶと2つの装置を入れ替えます。', '端口保存在 CAD 部件的端口备注中。选择已占用的端口会交换两个设备。', 'El puerto se guarda en la nota de puerto de la pieza. Elegir un puerto ya usado intercambia los dos dispositivos.'],
    'CAD 모델에서 찾은 모터·센서가 없습니다 (기본 로봇: A·B 바퀴, C 컬러, D 거리, E 힘).': ['No motors or sensors found in the CAD model (default robot: A·B wheels, C colour, D distance, E force).', 'CADモデルにモーター・センサーがありません (標準ロボット: A·B 車輪, C カラー, D 距離, E フォース)。', 'CAD 模型中没有电机或传感器（默认机器人：A·B 轮，C 颜色，D 距离，E 力）。', 'No hay motores ni sensores en el modelo CAD (robot por defecto: A·B ruedas, C color, D distancia, E fuerza).'],
    '실행 중에는 포트를 바꿀 수 없습니다': ['Ports cannot be changed while the program runs', '実行中はポートを変更できません', '运行时无法更改端口', 'No se pueden cambiar los puertos mientras se ejecuta'],
    '{0} → {1} 포트': ['{0} → port {1}', '{0} → ポート {1}', '{0} → 端口 {1}', '{0} → puerto {1}'],
  };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.replace('{' + k + '}', v); }); return s; };
  const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const KIND = { motor: '모터', color: '컬러센서', distance: '거리센서', force: '힘센서', husky: '허스키렌즈' };
  const ICON = { motor: '⚙', color: '◉', distance: '◎', force: '◼', husky: '🔍' };

  const css = document.createElement('style');
  css.textContent = `#simPortMap{display:flex;flex-direction:column;gap:4px;margin-top:2px}
#simPortMap .pm{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;font-size:12px}
#simPortMap .pm .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#simPortMap .pm .n small{opacity:.65}
#simPortMap select{width:56px}#simPortMapNote{font-size:11px;opacity:.7;line-height:1.4}`;
  document.head.appendChild(css);

  // 포트 메모 안의 포트 글자(A~F)를 바꿉니다. 메모의 나머지(케이블 길이 등)는 그대로 둡니다.
  const setMemo = (memo, L) => {
    memo = memo || '';
    if (/\b[A-F]\b/i.test(memo)) return memo.replace(/\b[A-F]\b/i, L);
    return memo.trim() ? `${L} ${memo.trim()}` : L;
  };
  const where = (dev, R) => {
    if (dev.kind === 'motor') return dev.port === R.left ? t('왼쪽 바퀴') : dev.port === R.right ? t('오른쪽 바퀴') : '';
    const s = (R.sensors || []).find(x => x.port === dev.port); if (!s) return '';
    const fb = s.z > 20 ? t('앞') : s.z < -20 ? t('뒤') : '', lr = s.x > 15 ? t('왼쪽') : s.x < -15 ? t('오른쪽') : '';
    return [fb, lr].filter(Boolean).join(' ') || t('가운데');
  };

  let box = null, last = '';
  const mount = () => {
    if (box && document.body.contains(box)) return true;
    const ports = document.getElementById('simPorts'); if (!ports) return false;
    box = document.createElement('div'); box.id = 'simPortWrap';
    box.innerHTML = '<div class="label" style="margin-top:6px"></div><div id="simPortMap"></div><div id="simPortMapNote"></div>';
    ports.after(box); last = '';
    return true;
  };
  const render = force => {
    if (!mount()) return;
    const R = X.robot, devs = (R && R.devices) || [], run = X.simRunning;
    const sig = JSON.stringify([devs, R && R.left, R && R.right, run, document.documentElement.lang]);
    if (!force && sig === last) return; last = sig;
    box.querySelector('.label').textContent = t('포트 연결');
    const map = box.querySelector('#simPortMap'), note = box.querySelector('#simPortMapNote');
    map.innerHTML = '';
    if (!devs.length) { note.textContent = t('CAD 모델에서 찾은 모터·센서가 없습니다 (기본 로봇: A·B 바퀴, C 컬러, D 거리, E 힘).'); return; }
    note.textContent = run ? t('실행 중에는 포트를 바꿀 수 없습니다') : t('고른 포트는 CAD 부품의 포트 메모에 저장됩니다. 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.');
    const parts = C.model.parts, ix = X.index();
    const count = {};
    for (const d of devs) {
      const p = parts.find(x => x.id === d.id); if (!p) continue;
      count[d.kind] = (count[d.kind] || 0) + 1;
      const nm = (ix.parts[p.file] && ix.parts[p.file].name) || p.file, w = where(d, R);
      const row = document.createElement('div'); row.className = 'pm';
      const n = document.createElement('div'); n.className = 'n'; n.title = `${nm} (${p.file})`;
      n.textContent = `${ICON[d.kind] || ''} ${t(KIND[d.kind] || d.kind)} ${devs.filter(x => x.kind === d.kind).length > 1 ? count[d.kind] : ''}`.replace(/\s+$/, '') + ' ';
      const sm = document.createElement('small'); sm.textContent = [w, p.file].filter(Boolean).join(' · '); n.appendChild(sm);
      const sel = document.createElement('select'); sel.setAttribute('aria-label', n.textContent);
      for (const L of PORTS) { const o = document.createElement('option'); o.value = L; const u = devs.find(x => x.port === L && x !== d); o.textContent = L + (u ? ' ·' : ''); sel.appendChild(o); }
      sel.value = d.port || ''; sel.disabled = !!run;
      sel.onchange = () => change(d, sel.value);
      row.append(n, sel); map.appendChild(row);
    }
  };
  const change = (dev, L) => {
    if (X.simRunning) { X.status(t('실행 중에는 포트를 바꿀 수 없습니다')); render(true); return; }
    const R = X.robot, devs = (R && R.devices) || [], parts = C.model.parts;
    const old = dev.port; if (!L || L === old) return;
    const other = devs.find(x => x !== dev && x.port === L);
    const p = parts.find(x => x.id === dev.id); if (!p) return;
    X.push(); // 되돌리기(Ctrl+Z)에 남김
    p.port = setMemo(p.port, L);
    if (other) { const q = parts.find(x => x.id === other.id); if (q) q.port = setMemo(q.port, old || PORTS.find(x => !devs.some(d => d.port === x)) || ''); }
    // 바퀴 모터 설정도 같이 옮김
    const sim = C.model.sim || (C.model.sim = {}), swap = v => v === old ? L : (other && v === L ? old : v);
    if (sim.left) sim.left = swap(sim.left); if (sim.right) sim.right = swap(sim.right);
    X.apply(p); // 저장 + CAD 패널 새로 고침
    X.simRebuild();
    X.status(t('{0} → {1} 포트', t(KIND[dev.kind] || dev.kind), L));
    render(true);
  };
  // ───────── 추가 모터(팔·집게 등)가 돌면 붙은 부품도 함께 돌기 ─────────
  // 모터의 출력 축(로터): 부품마다 LDraw 좌표의 중심과 축 방향
  const ROTOR = {
    '95658': [[0, 0, 0], [1, 0, 0]], '99455': [[0, 0, 10], [0, 0, 1]],
    '54675': [[0, -10, 0], [0, 1, 0]], '54696p01': [[0, -10, 0], [0, 1, 0]], '54696': [[0, -10, 0], [0, 1, 0]], '68488': [[0, -40, 0], [0, 1, 0]],
    'geekservo1': [[0, -43, 10], [0, 1, 0]], 'geekservo2': [[0, 0, 0], [0, 1, 0]], 'jv5043': [[0, 18, -45], [0, 0, 1]], 't1064c02': [[0, 26, -32], [0, 0, 1]],
  };
  const CONN = () => (window.MSCAD_DATA && window.MSCAD_DATA.conn) || {};
  const OK = { pin: ['pinhole'], pinhole: ['pin', 'axle'], axle: ['axlehole', 'pinhole'], axlehole: ['axle'], stud: ['astud'], astud: ['stud'] };
  const mv = (r, v) => [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const conns = p => (CONN()[p.file] || []).map(c => ({ t: c.t, p: add(mv(p.rot, c.p), p.pos), d: mv(p.rot, c.d), l: c.l || 0 }));
  // 두 연결점이 서로 꽂혀 있는지 (같은 축 위, 길이가 겹침)
  const mates = (a, b) => {
    if (!OK[a.t] || !OK[a.t].includes(b.t)) return false;
    if (Math.abs(dot(a.d, b.d)) < .97) return false;
    const v = sub(a.p, b.p), u = dot(v, b.d), perp = Math.hypot(v[0] - b.d[0] * u, v[1] - b.d[1] * u, v[2] - b.d[2] * u);
    if (a.t === 'stud' || a.t === 'astud') return perp < 3 && Math.abs(u) < 6;
    return perp < 3 && Math.abs(u) <= (a.l + b.l) / 2 + 2;
  };
  const linked = (A, B) => { for (const a of A) for (const b of B) if (mates(a, b)) return true; return false; };
  // 모터 하나에 붙어 함께 도는 부품들: 로터 축 위에 꽂힌 부품에서 시작해 연결을 따라감.
  // 다른 모터·허브·바퀴·본체에 닿으면(같이 돌 수 없는 구조) 축에 바로 꽂힌 부품만 돌립니다.
  // STL 부품은 연결점이 없으므로 모양이 닿는지로 봅니다: STL 정점이 다른 부품의 (부품 좌표) 상자 안에 들어가면 닿음.
  const T3G = C.THREE;
  const geo = new Map();
  const g = p => {
    let e = geo.get(p.id); if (e) return e;
    const o = C.objs.get(p.id); e = { box: null, inv: null, pts: null };
    if (o) {
      o.updateMatrixWorld(true);
      const bb = new T3G.Box3(), oi = new T3G.Matrix4().copy(o.matrixWorld).invert();
      o.traverse(m => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(new T3G.Matrix4().multiplyMatrices(oi, m.matrixWorld))); } });
      e.box = bb.isEmpty() ? null : bb; e.inv = oi;
      if (/^stl_/.test(p.file)) {
        // 면 위에 고르게 점을 뿌립니다 (꼭짓점만 보면 넓은 면이 맞닿은 경우를 놓침). 면적에 비례해 약 3000점.
        const tris = []; let area = 0;
        o.traverse(m => {
          if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return;
          const a = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : a.count;
          const P = k => new T3G.Vector3(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(m.matrixWorld);
          for (let k = 0; k + 2 < n; k += 3) { const A = P(idx ? idx.getX(k) : k), B = P(idx ? idx.getX(k + 1) : k + 1), Cc = P(idx ? idx.getX(k + 2) : k + 2); const ar = new T3G.Vector3().subVectors(B, A).cross(new T3G.Vector3().subVectors(Cc, A)).length() / 2; tris.push([A, B, Cc, ar]); area += ar; }
        });
        const pts = [];
        for (const [A, B, Cc, ar] of tris) {
          pts.push(A);
          const want = Math.min(400, Math.round(3000 * ar / (area || 1))); if (want < 2) continue;
          const k = Math.ceil(Math.sqrt(want * 2));
          for (let i = 0; i <= k; i++) for (let j = 0; i + j <= k; j++) { const u = i / k, v = j / k; pts.push(new T3G.Vector3().copy(A).addScaledVector(new T3G.Vector3().subVectors(B, A), u).addScaledVector(new T3G.Vector3().subVectors(Cc, A), v)); }
        }
        e.pts = pts;
      }
    }
    geo.set(p.id, e); return e;
  };
  const touches = (stl, other, tol = 1.5) => {
    const a = g(stl), b = g(other); if (!a.pts || !b.box) return false;
    const box = b.box.clone().expandByScalar(tol), v = new T3G.Vector3(); let n = 0;
    for (const pt of a.pts) { v.copy(pt).applyMatrix4(b.inv); if (box.containsPoint(v) && ++n >= 3) return true; }
    return false;
  };
  // 로터 축을 둘러싼 STL (모터 허브에 바로 끼운 STL 팔 등)
  const stlOnRotor = (stl, c, ax) => {
    const a = g(stl); if (!a.pts) return false;
    const root = C.root; root.updateMatrixWorld(true);
    const cw = root.localToWorld(new T3G.Vector3(...c)), aw = new T3G.Vector3(...ax).transformDirection(root.matrixWorld);
    let n = 0; const v = new T3G.Vector3();
    for (const pt of a.pts) { v.subVectors(pt, cw); const u = v.dot(aw); if (Math.abs(u) > 70) continue; if (v.addScaledVector(aw, -u).length() < 12 && ++n >= 6) return true; }
    return false;
  };
  const attachedTo = (mp, parts, R) => {
    const rt = ROTOR[mp.file]; if (!rt) return null;
    geo.clear();
    const c = add(mv(mp.rot, rt[0]), mp.pos), ax = mv(mp.rot, rt[1]);
    const cs = new Map(parts.map(p => [p.id, conns(p)]));
    const fixed = new Set((R.devices || []).map(d => d.id)); // 모터·센서 (이 모터 몸통 포함)
    const ix = X.index(), isStl = p => /^stl_/.test(p.file);
    for (const p of parts) { const nm = (ix.parts[p.file] || {}).name || ''; if (/Hub|Wheel|Tyre|Tire/i.test(nm)) fixed.add(p.id); }
    const onAxis = cc => cc.some(k => { if (Math.abs(dot(k.d, ax)) < .97) return false; const v = sub(k.p, c), u = dot(v, ax); return Math.hypot(v[0] - ax[0] * u, v[1] - ax[1] * u, v[2] - ax[2] * u) < 3 && Math.abs(u) < 90; });
    const seeds = parts.filter(p => p.id !== mp.id && !fixed.has(p.id) && !isStl(p) && onAxis(cs.get(p.id)));
    // 1) 레고 부품: 연결점을 따라감
    const flood = (start, set) => {
      const queue = [...start]; let bad = false;
      while (queue.length && !bad) {
        const p = queue.shift();
        for (const o of parts) {
          if (set.has(o.id) || o.id === mp.id || isStl(o)) continue;
          if (!linked(cs.get(p.id), cs.get(o.id))) continue;
          if (fixed.has(o.id)) { bad = true; break; }
          set.add(o.id); queue.push(o);
          if (set.size > 80) { bad = true; break; }
        }
      }
      return bad;
    };
    let set = new Set(seeds.map(p => p.id));
    if (flood(seeds, set)) set = new Set(seeds.map(p => p.id));
    // 2) STL 부품: 로터 축을 감싸거나, 함께 도는 부품에 닿고 본체(모터·허브·바퀴)에는 닿지 않으면 같이 돎.
    //    STL 에 꽂힌 레고 부품(본체 쪽과 연결점이 없는 것)도 따라 돎.
    const stls = parts.filter(isStl), byId = new Map(parts.map(p => [p.id, p]));
    const fixedParts = [...fixed].map(id => byId.get(id)).filter(Boolean);
    for (let it = 0, changed = true; changed && it < 12; it++) {
      changed = false;
      for (const s of stls) {
        if (set.has(s.id)) continue;
        const seed = stlOnRotor(s, c, ax);
        const near = seed || [...set].some(id => touches(s, byId.get(id)));
        if (!near) continue;
        if (!seed && fixedParts.some(f => touches(s, f))) continue;
        set.add(s.id); changed = true;
      }
      for (const o of parts) {
        if (set.has(o.id) || o.id === mp.id || fixed.has(o.id) || isStl(o)) continue;
        if (!stls.some(s => set.has(s.id) && touches(s, o))) continue;
        // 이 부품과 연결점으로 이어진 무리가 본체에 닿으면(본체에 고정됨) 넣지 않음
        const add2 = new Set(set); add2.add(o.id);
        if (!flood([o], add2)) { set = add2; changed = true; }
      }
    }
    return { c, ax, ids: [...set] };
  };
  // 로봇을 새로 만들 때마다: 바퀴가 아닌 모터마다 축 그룹을 만들어 붙은 부품 복제본을 옮겨 넣음
  let rigFor = null, rigs = [];
  const T3 = C.THREE;
  // 바퀴가 실제로 꽂힌 모터 두 개를 바퀴 모터로 씁니다 (그 둘 사이에서 사용자가 고른 왼쪽/오른쪽은 그대로).
  // app.js 는 가장 왼쪽·오른쪽 모터를 바퀴 모터로 보므로, 옆에 붙인 팔 모터가 바퀴 모터가 되는 일을 막습니다.
  let drivesOf = [];
  const fixDrive = R => {
    const sim = C.model.sim || {};
    const parts = C.model.parts, ix = X.index(), motors = R.devices.filter(d => d.kind === 'motor');
    drivesOf = [];
    if (motors.length < 3) return false;
    const wheels = parts.filter(p => /Wheel|Tyre|Tire/i.test((ix.parts[p.file] || {}).name || '') && !/Hub|Steering|Spindle/i.test((ix.parts[p.file] || {}).name || ''));
    const drives = motors.filter(d => {
      const mp = parts.find(p => p.id === d.id), rt = mp && ROTOR[mp.file]; if (!rt) return false;
      const c = add(mv(mp.rot, rt[0]), mp.pos), ax = mv(mp.rot, rt[1]);
      return wheels.some(w => conns(w).some(k => { if (Math.abs(dot(k.d, ax)) < .97) return false; const v = sub(k.p, c), u = dot(v, ax); return Math.hypot(v[0] - ax[0] * u, v[1] - ax[1] * u, v[2] - ax[2] * u) < 3 && Math.abs(u) < 260; }));
    });
    drivesOf = drives.map(d => d.port);
    if (drives.length !== 2) return false;
    const ps = drives.map(d => d.port);
    if (ps.includes(R.left) && ps.includes(R.right) && R.left !== R.right) return false; // 바퀴 모터 둘 사이에서 고른 것은 그대로
    const [L, Rr] = drives; // R.devices 는 왼쪽부터
    C.model.sim = { ...sim, left: L.port, right: Rr.port };
    return true;
  };
  // 모터 출력 면 쪽(부품 몸통 가운데에서 로터 쪽)을 +로: 그 면을 바라볼 때 시계 방향 = + (SPIKE 규칙)
  const drvAxis = (mp, at) => {
    let n = at.ax; const mo = C.objs.get(mp.id);
    if (mo) { const bb = new T3.Box3(); mo.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone(); const m = new T3.Matrix4(); let q = o; const chain = []; while (q && q !== mo) { chain.push(q); q = q.parent; } chain.reverse().forEach(x => { x.updateMatrix && !x.matrixAutoUpdate || x.updateMatrix(); m.multiply(x.matrix); }); bb.union(b.applyMatrix4(m)); } });
      if (!bb.isEmpty()) { const ctr = bb.getCenter(new T3.Vector3()), body = add(mv(mp.rot, [ctr.x, ctr.y, ctr.z]), mp.pos); if (dot(sub(at.c, body), n) < 0) n = n.map(v => -v); } }
    return n;
  };
  const buildRig = R => {
    rigFor = R; rigs = [];
    if (!R || !R.fromCad || !R.clones || !R.devices) return;
    if (fixDrive(R)) { X.simRebuild(); return; } // 새 로봇으로 다시 (다음 tick 에서 축 그룹)
    const parts = C.model.parts;
    for (const d of R.devices) {
      if (d.kind !== 'motor' || d.port === R.left || d.port === R.right || drivesOf.includes(d.port)) continue;
      const mp = parts.find(p => p.id === d.id); if (!mp) continue;
      // 기어로 이어진 축까지 (cadmech.js): 축마다 따로 돌림. 안 되면 예전처럼 로터에 붙은 부품만
      const ixx = X.index(), wheelIds = parts.filter(p => /Hub|Wheel|Tyre|Tire/i.test((ixx.parts[p.file] || {}).name || '') && !/^Electric/i.test((ixx.parts[p.file] || {}).name || '')).map(p => p.id);
      const ms = window.__mech && window.__mech.solve(mp.id, { fixed: wheelIds });
      const at = attachedTo(mp, parts, R); if (!at) continue;
      if (ms && ms.ok && ms.groups.some(G => G.ids.length)) {
        const n0 = drvAxis(mp, at), sg = dot(n0, ms.a) < 0 ? -1 : 1;
        for (const G of ms.groups) {
          const any = G.ids.map(id => R.clones[id]).find(Boolean), host = any && any.parent; if (!host) continue;
          const pivot = new T3.Group(), inner = new T3.Group();
          pivot.position.set(...G.c); inner.position.set(-G.c[0], -G.c[1], -G.c[2]);
          pivot.add(inner); host.add(pivot);
          for (const id of G.ids) { const u = R.clones[id]; if (u && u.parent === host) inner.add(u); }
          rigs.push({ port: d.port, pivot, axis: new T3.Vector3(...G.a).normalize(), k: G.k * sg, n: G.ids.length });
        }
        continue;
      }
      if (!at.ids.length) continue;
      const any = R.clones[at.ids[0]]; const host = any && any.parent; if (!host) continue;
      const n = drvAxis(mp, at);
      const pivot = new T3.Group(), inner = new T3.Group();
      pivot.position.set(...at.c); inner.position.set(-at.c[0], -at.c[1], -at.c[2]);
      pivot.add(inner); host.add(pivot);
      for (const id of at.ids) { const u = R.clones[id]; if (u && u.parent === host) inner.add(u); }
      rigs.push({ port: d.port, pivot, axis: new T3.Vector3(...n).normalize(), n: at.ids.length });
    }
  };
  const tick = () => {
    const R = X.robot;
    if (R !== rigFor) buildRig(R);
    if (rigs.length) { const M = X.motors ? X.motors() : {}; for (const r of rigs) { const deg = (M[r.port] && M[r.port].pos) || 0; r.pivot.quaternion.setFromAxisAngle(r.axis, -deg * (r.k == null ? 1 : r.k) * Math.PI / 180); } }
    requestAnimationFrame(tick);
  };
  if ('motors' in X) requestAnimationFrame(tick);
  window.__simRigs = () => rigs.map(r => ({ port: r.port, parts: r.n, k: r.k == null ? 1 : r.k }));
  window.__simRigObjs = () => rigs; // { port, pivot, axis, k } — 다른 스크립트(오셀로 AI 상대 로봇)가 같은 모양으로 팔을 돌릴 때

  setInterval(() => { const sim = document.getElementById('sim'); if (sim && sim.hidden) return; render(false); }, 600);
  new MutationObserver(() => render(true)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
