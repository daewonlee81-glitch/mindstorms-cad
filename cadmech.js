// cadmech.js — CAD "회전 실험": 모터·축·기어를 돌려 보면 연결된 부품이 함께 움직입니다 (app.js 다음에 불러옵니다).
//   · 부품을 고르고 "⟳ 회전 실험"을 누르면 3D 화면 아래에 조절판이 나옵니다 (각도 막대, ▶ 돌리기, 방향, 속도).
//   · 모터를 고르면 출력 축(로터)이, 축을 고르면 그 축이, 기어·빔을 고르면 그 부품이 꽂힌 축이 돕니다.
//   · 축(+자 구멍)·스터드로 단단히 이어진 부품은 함께 돌고, 둥근 구멍(핀 구멍)에 꽂힌 축은 그 구멍 안에서 헛돕니다.
//   · 맞물린 기어는 잇수 비율로 반대 방향(평기어), 직각 방향(베벨기어), 웜기어(한 바퀴에 한 칸)로 이어서 돕니다.
//   · 모델 데이터는 바꾸지 않습니다. 닫거나 부품을 옮기면 원래 자리로 돌아옵니다.
//   · window.__mech.solve(부품 id) 는 simports.js(시뮬레이터 추가 모터)에서도 씁니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext; if (!C || !X) return;
  const T3 = C.THREE;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '⟳ 회전 실험': ['⟳ Rotation test', '⟳ 回転テスト', '⟳ 旋转测试', '⟳ Prueba de giro'],
    '회전 실험': ['Rotation test', '回転テスト', '旋转测试', 'Prueba de giro'],
    '모터·축·기어를 돌려 연결된 부품이 함께 움직이는지 봅니다': ['Turn a motor, axle or gear and watch the connected parts move', 'モーター・軸・ギアを回して、つながった部品が一緒に動くか確かめます', '转动电机、轴或齿轮，查看相连部件是否一起运动', 'Gira un motor, eje o engranaje y mira cómo se mueven las piezas unidas'],
    '▶ 돌리기': ['▶ Run', '▶ 回す', '▶ 转动', '▶ Girar'], '⏸ 멈춤': ['⏸ Pause', '⏸ 止める', '⏸ 暂停', '⏸ Pausa'],
    '⇄ 방향': ['⇄ Direction', '⇄ 向き', '⇄ 方向', '⇄ Sentido'], '↺ 처음으로': ['↺ Reset', '↺ 最初に', '↺ 复位', '↺ Reiniciar'], '닫기': ['Close', '閉じる', '关闭', 'Cerrar'],
    '속도': ['Speed', '速さ', '速度', 'Velocidad'], '각도': ['Angle', '角度', '角度', 'Ángulo'],
    '구동': ['driver', '駆動', '主动', 'motriz'],
    '함께 도는 부품 {0}개 · 축 {1}개': ['{0} parts turn · {1} axes', '一緒に回る部品 {0}個 · 軸 {1}本', '一起转动的部件 {0} 个 · 轴 {1} 根', '{0} piezas giran · {1} ejes'],
    '축 {0}': ['Axis {0}', '軸 {0}', '轴 {0}', 'Eje {0}'],
    '부품 {0}개': ['{0} parts', '部品 {0}個', '{0} 个部件', '{0} piezas'],
    '부품을 먼저 고르세요': ['Select a part first', '先に部品を選んでください', '请先选择部件', 'Selecciona primero una pieza'],
    '이 부품에는 돌릴 축이 없습니다 (축·기어·모터·빔을 고르세요)': ['This part has no axis to turn (pick an axle, gear, motor or beam)', 'この部品には回す軸がありません (軸・ギア・モーター・ビームを選んでください)', '此部件没有可转动的轴（请选择轴、齿轮、电机或梁）', 'Esta pieza no tiene eje para girar (elige un eje, engranaje, motor o viga)'],
    '본체(허브·센서·모터 몸통)에 단단히 고정되어 돌 수 없습니다': ['It is fixed to the body (hub, sensor or motor housing) and cannot turn', '本体(ハブ・センサー・モーター本体)に固定されていて回せません', '它固定在主体（主机、传感器或电机外壳）上，无法转动', 'Está fijado al cuerpo (hub, sensor o carcasa del motor) y no puede girar'],
    '너무 많은 부품이 함께 돕니다 — 본체에 고정된 축일 수 있습니다': ['Too many parts would turn — this axle may be fixed to the frame', '回る部品が多すぎます — 本体に固定された軸かもしれません', '一起转动的部件太多 — 这根轴可能固定在主体上', 'Girarían demasiadas piezas — este eje puede estar fijado al chasis'],
    '기어가 서로 막혀 돌 수 없습니다 (잠김)': ['The gears block each other and cannot turn (locked)', 'ギアが互いにぶつかって回りません (ロック)', '齿轮互相卡住，无法转动（锁死）', 'Los engranajes se bloquean entre sí (bloqueado)'],
    '웜기어는 기어 쪽에서 돌릴 수 없습니다 (잠김)': ['A worm gear cannot be driven from the gear side (locked)', 'ウォームギアはギア側からは回せません (ロック)', '蜗杆不能由齿轮一侧驱动（锁死）', 'Un tornillo sinfín no puede ser movido desde el engranaje (bloqueado)'],
    '맞물린 기어 {0}쌍': ['{0} gear meshes', 'かみ合うギア {0}組', '啮合齿轮 {0} 对', '{0} engranes'],
    '모델이 바뀌어 회전 실험을 닫았습니다': ['The model changed, so the rotation test was closed', 'モデルが変わったので回転テストを閉じました', '模型已更改，旋转测试已关闭', 'El modelo cambió; se cerró la prueba de giro'],
    '로터': ['rotor', 'ローター', '转子', 'rotor'],
  };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.replace('{' + k + '}', v); }); return s; };

  // ───────── 연결점 계산 (LDraw 좌표) ─────────
  const ROTOR = {
    '95658': [[0, 0, 0], [1, 0, 0]], '99455': [[0, 0, 10], [0, 0, 1]],
    '54675': [[0, -10, 0], [0, 1, 0]], '54696p01': [[0, -10, 0], [0, 1, 0]], '54696': [[0, -10, 0], [0, 1, 0]], '68488': [[0, -40, 0], [0, 1, 0]],
    'geekservo1': [[0, -43, 10], [0, 1, 0]], 'geekservo2': [[0, 0, 0], [0, 1, 0]], 'jv5043': [[0, 18, -45], [0, 0, 1]], 't1064c02': [[0, 26, -32], [0, 0, 1]],
  };
  const ROTOR_PINS = new Set(['54675', '54696p01', '54696', '68488']); // SPIKE(Powered Up) 각도 모터: 로터 둘레의 핀 구멍 4개도 함께 돎
  const CONN = () => (window.MSCAD_DATA && window.MSCAD_DATA.conn) || {};
  const OK = { pin: ['pinhole'], pinhole: ['pin', 'axle'], axle: ['axlehole', 'pinhole'], axlehole: ['axle'], stud: ['astud'], astud: ['stud'] };
  const mv = (r, v) => [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), nrm = a => { const l = len(a) || 1; return mul(a, 1 / l); };
  const perp = (p, c, a) => { const v = sub(p, c), u = dot(v, a); return { u, d: len(sub(v, mul(a, u))) }; };
  const conns = p => (CONN()[p.file] || []).map(c => ({ t: c.t, p: add(mv(p.rot, c.p), p.pos), d: nrm(mv(p.rot, c.d)), l: c.l || 0 }));
  const mates = (a, b) => {
    if (!OK[a.t] || !OK[a.t].includes(b.t)) return false;
    if (Math.abs(dot(a.d, b.d)) < .97) return false;
    const { u, d } = perp(a.p, b.p, b.d);
    if (a.t === 'stud' || a.t === 'astud') return d < 3 && Math.abs(u) < 6;
    return d < 3 && Math.abs(u) <= (a.l + b.l) / 2 + 2;
  };
  const RIGID = (a, b) => (a === 'axle' && b === 'axlehole') || (a === 'axlehole' && b === 'axle') || a === 'stud' || a === 'astud';
  const coax = (k, c, a) => Math.abs(dot(k.d, a)) > .97 && perp(k.p, c, a).d < 3;

  // 기어 종류: 이름에서 잇수
  const gearOf = (ix, p) => {
    const nm = (ix.parts[p.file] || {}).name || '';
    if (!/Gear|Worm/i.test(nm) || /Rack|Ring|Differential|Turntable/i.test(nm)) return null;
    let kind = 'spur', teeth = 0;
    if (/Worm/i.test(nm)) { kind = 'worm'; teeth = 1; }
    else if (/4 Knob/i.test(nm)) { kind = 'knob'; teeth = 4; }
    else { const m = nm.match(/Gear\s+(\d+)\s+Tooth/i); if (!m) return null; teeth = +m[1]; kind = /Double Bevel/i.test(nm) ? 'dbevel' : /Bevel/i.test(nm) ? 'bevel' : 'spur'; }
    // 기어 가운데 구멍 (부품 원점에 가장 가까운 축·핀 구멍)
    let best = null, bd = 1e9;
    for (const k of conns(p)) { if (k.t !== 'axlehole' && k.t !== 'pinhole') continue; const dd = len(sub(k.p, p.pos)); if (dd < bd) { bd = dd; best = k; } }
    if (!best) return null;
    const r = kind === 'knob' ? 10 : kind === 'worm' ? 8 : 1.25 * teeth;
    return { kind, teeth, r, c: best.p, a: best.d, l: best.l, nm };
  };

  // STL 부품 모양 (연결점이 없으므로 닿는지로 봄) — simports.js 와 같은 방법
  const geo = new Map();
  const g = p => {
    let e = geo.get(p.id); if (e) return e;
    const o = C.objs.get(p.id); e = { box: null, inv: null, pts: null };
    if (o) {
      o.updateMatrixWorld(true);
      const bb = new T3.Box3(), oi = new T3.Matrix4().copy(o.matrixWorld).invert();
      o.traverse(m => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(new T3.Matrix4().multiplyMatrices(oi, m.matrixWorld))); } });
      e.box = bb.isEmpty() ? null : bb; e.inv = oi;
      if (/^stl_/.test(p.file)) {
        const tris = []; let area = 0;
        o.traverse(m => {
          if (!m.isMesh || !m.geometry || !m.geometry.attributes.position) return;
          const a = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : a.count;
          const P = k => new T3.Vector3(a.getX(k), a.getY(k), a.getZ(k)).applyMatrix4(m.matrixWorld);
          for (let k = 0; k + 2 < n; k += 3) { const A = P(idx ? idx.getX(k) : k), B = P(idx ? idx.getX(k + 1) : k + 1), Cc = P(idx ? idx.getX(k + 2) : k + 2); const ar = new T3.Vector3().subVectors(B, A).cross(new T3.Vector3().subVectors(Cc, A)).length() / 2; tris.push([A, B, Cc, ar]); area += ar; }
        });
        const pts = [];
        for (const [A, B, Cc, ar] of tris) {
          pts.push(A);
          const want = Math.min(400, Math.round(3000 * ar / (area || 1))); if (want < 2) continue;
          const k = Math.ceil(Math.sqrt(want * 2));
          for (let i = 0; i <= k; i++) for (let j = 0; i + j <= k; j++) { const u = i / k, v = j / k; pts.push(new T3.Vector3().copy(A).addScaledVector(new T3.Vector3().subVectors(B, A), u).addScaledVector(new T3.Vector3().subVectors(Cc, A), v)); }
        }
        e.pts = pts;
      }
    }
    geo.set(p.id, e); return e;
  };
  const touches = (stl, other, tol = 1.5) => {
    const a = g(stl), b = g(other); if (!a.pts || !b.box) return false;
    const box = b.box.clone().expandByScalar(tol), v = new T3.Vector3(); let n = 0;
    for (const pt of a.pts) { v.copy(pt).applyMatrix4(b.inv); if (box.containsPoint(v) && ++n >= 3) return true; }
    return false;
  };
  const stlAround = (stl, c, ax) => {
    const a = g(stl); if (!a.pts) return false;
    const root = C.root; root.updateMatrixWorld(true);
    const cw = root.localToWorld(new T3.Vector3(...c)), aw = new T3.Vector3(...ax).transformDirection(root.matrixWorld);
    let n = 0; const v = new T3.Vector3();
    for (const pt of a.pts) { v.subVectors(pt, cw); const u = v.dot(aw); if (Math.abs(u) > 70) continue; if (v.addScaledVector(aw, -u).length() < 12 && ++n >= 6) return true; }
    return false;
  };
  // 모터 출력 면 쪽을 + 로 (몸통 가운데 → 로터): 그 면을 바라볼 때 시계 방향 = + (SPIKE 규칙, simports.js 와 같음)
  const outward = (mp, c, ax) => {
    const mo = C.objs.get(mp.id); if (!mo) return ax;
    const bb = new T3.Box3();
    mo.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone(); const m = new T3.Matrix4(); let q = o; const chain = []; while (q && q !== mo) { chain.push(q); q = q.parent; } chain.reverse().forEach(x => { x.updateMatrix && !x.matrixAutoUpdate || x.updateMatrix(); m.multiply(x.matrix); }); bb.union(b.applyMatrix4(m)); } });
    if (bb.isEmpty()) return ax;
    const ctr = bb.getCenter(new T3.Vector3()), body = add(mv(mp.rot, [ctr.x, ctr.y, ctr.z]), mp.pos);
    return dot(sub(c, body), ax) < 0 ? mul(ax, -1) : ax;
  };

  // ───────── 기구 풀이 ─────────
  // 결과: { ok, groups: [{c, a, k, ids, gears}], warn, meshes, why }
  //   c·a: 회전축 (LDraw 좌표, a 는 단위 벡터), k: 구동 축 1도에 이 축이 도는 각도 (부호 = 같은 a 기준)
  const solve = (driverId, opt = {}) => {
    const parts = C.model.parts, ix = X.index(), N = parts.length;
    const byId = new Map(parts.map(p => [p.id, p]));
    const drv = byId.get(driverId); if (!drv) return { ok: false, why: t('부품을 먼저 고르세요') };
    geo.clear();
    const isStl = p => /^stl_/.test(p.file);
    const name = p => (ix.parts[p.file] || {}).name || '';
    const cs = new Map(parts.map(p => [p.id, conns(p)]));
    // 본체: 허브·센서·모터 몸통 등 전기 부품 (+ 호출한 쪽이 더 넣은 것)
    const anchor = new Set(opt.fixed || []);
    for (const p of parts) if (ROTOR[p.file] || /^Electric|HuskyLens|Geekservo/i.test(name(p))) { if (!/Cable/i.test(name(p))) anchor.add(p.id); }
    // 모터 로터 연결점
    const rotorOf = new Map();
    for (const p of parts) {
      const rt = ROTOR[p.file]; if (!rt) continue;
      const c = add(mv(p.rot, rt[0]), p.pos), a = nrm(mv(p.rot, rt[1]));
      const ks = cs.get(p.id), set = new Set();
      ks.forEach((k, i) => { if (coax(k, c, a)) set.add(i); });
      if (ROTOR_PINS.has(p.file)) ks.forEach((k, i) => {
        if (k.t !== 'pinhole' || Math.abs(dot(k.d, a)) < .97) return; const q = perp(k.p, c, a); if (q.d < 17 || q.d > 23) return;
        if ([...set].some(j => ks[j].t === 'axlehole' && Math.abs(perp(ks[j].p, c, a).u - q.u) < 3)) set.add(i);
      });
      rotorOf.set(p.id, { c, a, set });
    }
    // 부품 사이 연결 (연결점 상자가 겹치는 쌍만 자세히 봄)
    const bbox = new Map();
    for (const p of parts) {
      const ks = cs.get(p.id); if (!ks.length) continue;
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (const k of ks) for (const s of [-1, 1]) { const e = add(k.p, mul(k.d, s * (k.l / 2 + 3))); for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], e[i] - 4); mx[i] = Math.max(mx[i], e[i] + 4); } }
      bbox.set(p.id, [mn, mx]);
    }
    const links = new Map(parts.map(p => [p.id, []]));
    const withB = parts.filter(p => bbox.has(p.id));
    for (let i = 0; i < withB.length; i++) {
      const A = withB[i], [an, ax] = bbox.get(A.id);
      for (let j = i + 1; j < withB.length; j++) {
        const B = withB[j], [bn, bx] = bbox.get(B.id);
        if (an[0] > bx[0] || bn[0] > ax[0] || an[1] > bx[1] || bn[1] > ax[1] || an[2] > bx[2] || bn[2] > ax[2]) continue;
        const KA = cs.get(A.id), KB = cs.get(B.id);
        KA.forEach((a, ia) => KB.forEach((b, ib) => {
          if (!mates(a, b)) return;
          const rA = rotorOf.get(A.id), rB = rotorOf.get(B.id);
          const L = { rigid: RIGID(a.t, b.t), p: (a.t === 'pinhole' ? a : b).p, d: (a.t === 'pinhole' ? a : b).d, rotorA: !!(rA && rA.set.has(ia)), rotorB: !!(rB && rB.set.has(ib)) };
          links.get(A.id).push({ o: B.id, ...L, mineRotor: L.rotorA, otherRotor: L.rotorB });
          links.get(B.id).push({ o: A.id, ...L, mineRotor: L.rotorB, otherRotor: L.rotorA });
        }));
      }
    }
    // 구동 축 정하기
    let c, a, seeds = [], motor = null;
    const rt = rotorOf.get(drv.id);
    if (rt) {
      motor = drv; c = rt.c;
      for (const L of links.get(drv.id)) if (L.mineRotor && !anchor.has(L.o) && !isStl(byId.get(L.o))) seeds.push(L.o);
      seeds = [...new Set(seeds)];
      // + 방향: 부품이 꽂힌 로터 면 쪽 (없으면 몸통 반대쪽)
      const side = seeds.reduce((s, id) => s + dot(sub(byId.get(id).pos, c), rt.a), 0);
      a = Math.abs(side) > 1 ? (side > 0 ? rt.a : mul(rt.a, -1)) : outward(drv, rt.c, rt.a);
    } else {
      const ks = cs.get(drv.id), gi = gearOf(ix, drv);
      let k = ks.find(k => k.t === 'axle');
      if (!k && gi) k = { p: gi.c, d: gi.a };
      if (!k) { const ah = ks.filter(k => k.t === 'axlehole'); k = ah.find(h => links.get(drv.id).some(L => !L.mineRotor && L.rigid && perp(L.p, h.p, h.d).d < 3)) || ah[0]; }
      if (!k) { const ph = ks.filter(k => k.t === 'pinhole'); k = ph.find(h => links.get(drv.id).some(L => !L.rigid && perp(L.p, h.p, h.d).d < 3 && Math.abs(dot(L.d, h.d)) > .97)) || null; }
      if (!k) k = ks.find(k => k.t === 'pin') || null;
      if (!k && isStl(drv)) { const bb = g(drv).box; if (bb) { const ctr = bb.getCenter(new T3.Vector3()); k = { p: add(mv(drv.rot, [ctr.x, ctr.y, ctr.z]), drv.pos), d: nrm(mv(drv.rot, [0, 1, 0])) }; } }
      if (!k) return { ok: false, why: t('이 부품에는 돌릴 축이 없습니다 (축·기어·모터·빔을 고르세요)') };
      c = k.p; a = k.d; seeds = [drv.id];
      if (anchor.has(drv.id)) return { ok: false, why: t('본체(허브·센서·모터 몸통)에 단단히 고정되어 돌 수 없습니다') };
    }
    const groupOf = new Map(), groups = [], bearing = new Set(), warn = [];
    const CAP = 400, BIG = n => n > 150 || (N > 8 && n > .6 * N);
    // 한 축 무리 만들기: 단단한 연결(축↔축 구멍, 스터드)은 함께, 같은 축의 둥근 구멍은 헛돎(베어링),
    // 축에서 벗어난 핀으로 매달린 부품은 본체에 걸리지 않으면 함께 실려 돎
    const grow = (gr, start) => {
      const q = [...start]; for (const id of start) groupOf.set(id, gr);
      const ext = [];
      while (q.length) {
        const id = q.shift();
        for (const L of links.get(id)) {
          const o = L.o; if (groupOf.get(o) === gr) continue;
          if (L.otherRotor || L.mineRotor) continue; // 모터 로터: 로터만 돌고 몸통은 가만히
          const isCo = !L.rigid && coax({ p: L.p, d: L.d }, gr.c, gr.a);
          if (isCo) { bearing.add(o); continue; }
          if (anchor.has(o) || (groupOf.has(o) && groupOf.get(o) !== gr)) { if (L.rigid) return 'lock'; continue; }
          if (L.rigid) { groupOf.set(o, gr); gr.ids.push(o); q.push(o); if (gr.ids.length > CAP) return 'big'; }
          else ext.push(o);
        }
      }
      // 축에서 벗어난 핀으로 이어진 부품
      for (const o0 of ext) {
        if (groupOf.has(o0)) continue;
        const E = new Set([o0]), qq = [o0]; let bad = false;
        while (qq.length && !bad) {
          const id = qq.shift();
          for (const L of links.get(id)) {
            const o = L.o; if (E.has(o) || groupOf.get(o) === gr) continue;
            // 같은 축에 둥근 구멍으로 끼운 부품(베어링)도 축 밖의 핀으로 도는 무리에 묶여 있으면 함께 돎 (예: 로터 핀 + 축이 함께 지나는 빔)
            if (anchor.has(o) || groupOf.has(o) || L.otherRotor) { bad = true; break; }
            E.add(o); qq.push(o); if (E.size > 60) { bad = true; break; }
          }
        }
        if (bad) continue;
        for (const id of E) { groupOf.set(id, gr); gr.ids.push(id); bearing.delete(id); }
      }
      return gr.ids.length && BIG(gr.ids.length) ? 'big' : '';
    };
    const G0 = { c, a, k: 1, ids: [...seeds], gears: [] };
    groups.push(G0);
    let r = grow(G0, seeds);
    if (r === 'lock') return { ok: false, why: t('본체(허브·센서·모터 몸통)에 단단히 고정되어 돌 수 없습니다') };
    if (r === 'big') return { ok: false, why: t('너무 많은 부품이 함께 돕니다 — 본체에 고정된 축일 수 있습니다') };
    // 기어 맞물림 따라가기
    const gears = parts.map(p => ({ p, gi: gearOf(ix, p) })).filter(x => x.gi);
    let meshes = 0, jam = '';
    for (let gi = 0; gi < groups.length && !jam; gi++) {
      const G = groups[gi];
      for (const A of gears) {
        if (groupOf.get(A.p.id) !== G || !coax({ p: A.gi.c, d: A.gi.a }, G.c, G.a)) continue;
        G.gears.push(A.gi.teeth);
        for (const B of gears) {
          if (B === A) continue;
          const hb = groupOf.get(B.p.id); if (hb === G) continue;
          if (hb && !coax({ p: B.gi.c, d: B.gi.a }, hb.c, hb.a)) continue; // 다른 축에 실려 도는 기어 (유성기어 등)는 보지 않음
          const m = mesh(A.gi, G.a, B.gi); if (!m) continue;
          if (m === 'worm-back' && hb) continue; // 웜이 이미 이 기어를 돌리는 쪽
          if (m === 'worm-back') { jam = t('웜기어는 기어 쪽에서 돌릴 수 없습니다 (잠김)'); break; }
          const k = G.k * m.f;
          if (hb) { if (Math.abs(hb.k - dot(hb.a, m.a2) * k) > 1e-3 * Math.max(1, Math.abs(k))) { jam = t('기어가 서로 막혀 돌 수 없습니다 (잠김)'); break; } continue; }
          if (anchor.has(B.p.id) || bearing.has(B.p.id)) { jam = t('기어가 서로 막혀 돌 수 없습니다 (잠김)'); break; }
          meshes++;
          const H = { c: B.gi.c, a: m.a2, k, ids: [B.p.id], gears: [], from: [A.gi.teeth, B.gi.teeth] };
          groups.push(H);
          const rr = grow(H, [B.p.id]);
          if (rr) { jam = rr === 'big' ? t('너무 많은 부품이 함께 돕니다 — 본체에 고정된 축일 수 있습니다') : t('기어가 서로 막혀 돌 수 없습니다 (잠김)'); break; }
        }
        if (jam) break;
      }
    }
    if (jam) return { ok: false, why: jam, groups };
    // STL 부품: 로터·축을 감싸거나 함께 도는 부품에 닿고 본체에는 닿지 않으면 같이 돎
    const stls = parts.filter(isStl);
    if (stls.length) {
      const fixedParts = [...anchor, ...bearing].map(id => byId.get(id)).filter(Boolean);
      for (let it = 0, changed = true; changed && it < 8; it++) {
        changed = false;
        for (const s of stls) {
          if (groupOf.has(s.id)) continue;
          const around = !!motor && stlAround(s, G0.c, G0.a); // 모터 로터를 감싸는 STL (허브에 바로 끼운 팔 등)
          const hit = around ? G0 : groups.find(G => G.ids.some(id => id !== s.id && touches(s, byId.get(id))));
          if (!hit) continue;
          if (!around && fixedParts.some(f => touches(s, f))) continue;
          groupOf.set(s.id, hit); hit.ids.push(s.id); changed = true;
        }
        for (const o of parts) {
          if (groupOf.has(o.id) || anchor.has(o.id) || bearing.has(o.id) || isStl(o)) continue;
          const G = groups.find(G => G.ids.some(id => isStl(byId.get(id)) && touches(byId.get(id), o))); if (!G) continue;
          // 이 부품과 연결점으로 이어진 무리가 본체에 닿으면 넣지 않음
          const E = new Set([o.id]), qq = [o.id]; let bad = false;
          while (qq.length && !bad) { const id = qq.shift(); for (const L of links.get(id)) { if (E.has(L.o) || groupOf.get(L.o) === G) continue; if (anchor.has(L.o) || bearing.has(L.o) || groupOf.has(L.o)) { bad = true; break; } E.add(L.o); qq.push(L.o); if (E.size > 60) { bad = true; break; } } }
          if (bad) continue;
          for (const id of E) { groupOf.set(id, G); G.ids.push(id); } changed = true;
        }
      }
    }
    return { ok: true, groups: groups.filter(G => G.ids.length || G === G0), meshes, warn, motor: motor && motor.id, c: G0.c, a: G0.a };
  };
  // 두 기어가 맞물리는지: 맞물리면 { f: B가 도는 비율 (B의 a2 기준), a2 }
  function mesh(A, aA, B) {
    const a1 = dot(A.a, aA) < 0 ? mul(A.a, -1) : A.a, c1 = A.c, c2 = B.c;
    let a2 = B.a; const cosv = dot(a1, a2);
    if (A.kind === 'worm' || B.kind === 'worm') {
      if (Math.abs(cosv) > .1 || (A.kind === 'worm' && B.kind === 'worm')) return null;
      const W = A.kind === 'worm' ? A : B, Gr = W === A ? B : A, aw = W === A ? a1 : a2, ag = W === A ? a2 : a1;
      const n0 = nrm(cross(aw, ag)), D = dot(sub(W.c, Gr.c), n0);
      if (Math.abs(Math.abs(D) - Gr.r - 9) > 8) return null;          // 축 사이 거리 ≈ 기어 반지름 + 웜 반지름
      if (Math.abs(dot(sub(Gr.c, W.c), aw)) > W.l / 2 + 6) return null; // 기어가 웜 길이 안에
      if (Math.abs(dot(sub(W.c, Gr.c), ag)) > 6) return null;          // 웜 축이 기어 면 위에
      if (W === B) return 'worm-back';                                  // 기어가 웜을 돌리려 함 → 잠김
      const n = mul(n0, Math.sign(D) || 1);                             // 기어 축 → 웜 축 (오른나사 웜)
      return { f: -(1 / Gr.teeth) * (Math.sign(dot(a1, cross(a2, n))) || 1), a2 };
    }
    if (Math.abs(cosv) > .97) { // 평행: 평기어·더블베벨
      if (A.kind === 'bevel' || B.kind === 'bevel') return null;
      if (cosv < 0) a2 = mul(a2, -1);
      const v = sub(c2, c1), ax = dot(v, a1), rad = len(sub(v, mul(a1, ax)));
      if (Math.abs(ax) > 12 || Math.abs(rad - (A.r + B.r)) > 3) return null;
      return { f: -A.teeth / B.teeth, a2 };
    }
    if (Math.abs(cosv) < .1) { // 직각: 베벨·더블베벨·노브
      const okk = k => k === 'bevel' || k === 'dbevel' || k === 'knob';
      if (!okk(A.kind) || !okk(B.kind)) return null;
      // 두 축이 거의 만나는 점 O
      const w0 = sub(c1, c2), b = dot(a1, a2), d1 = dot(a1, w0), e1 = dot(a2, w0), den = 1 - b * b;
      const s = (b * e1 - d1) / den, tt = (e1 - b * d1) / den;
      const P1 = add(c1, mul(a1, s)), P2 = add(c2, mul(a2, tt));
      if (len(sub(P1, P2)) > 4) return null;
      const O = mul(add(P1, P2), .5), h1 = dot(sub(c1, O), a1), h2 = dot(sub(c2, O), a2);
      const tol = 8;
      if (A.kind === 'knob' || B.kind === 'knob') { if (A.kind !== B.kind || Math.abs(h1) < 4 || Math.abs(h1) > 22 || Math.abs(h2) < 4 || Math.abs(h2) > 22) return null; }
      else if (Math.abs(Math.abs(h1) - B.r) > tol || Math.abs(Math.abs(h2) - A.r) > tol) return null;
      return { f: -(A.teeth / B.teeth) * Math.sign(h2 / h1), a2 };
    }
    return null;
  }

  // ───────── CAD 화면에서 돌리기 ─────────
  const css = document.createElement('style');
  css.textContent = `#mechBox{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:30;background:var(--panel,#fff);color:var(--fg,#1c2530);border:1px solid var(--line,#d5dbe2);opacity:1;border-radius:10px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.35);font-size:12px;width:min(560px,calc(100% - 24px));box-sizing:border-box}
#mechBox .mh{display:flex;align-items:center;gap:6px;margin-bottom:6px}#mechBox .mh b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mechBox .mr{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#mechBox input[type=range]{flex:1;min-width:140px}
#mechBox .mv{font-variant-numeric:tabular-nums;min-width:52px;text-align:right}
#mechBox .mi{margin-top:6px;opacity:.85;line-height:1.45}#mechBox .mi .w{color:var(--warn,#b26a00);opacity:1;font-weight:600}
#mechBox .mg{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:3px}#mechBox .mg span{white-space:nowrap}#mechBox .mg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
#btnMech{margin-top:8px;width:100%}`;
  document.head.appendChild(css);
  const COLORS = [0xffb000, 0x29b6f6, 0x66bb6a, 0xef5350, 0xab47bc, 0x26c6da, 0xffee58, 0xff7043];

  let S = null; // 실행 중인 회전 실험
  const sig = () => JSON.stringify(C.model.parts.map(p => [p.id, p.file, p.pos, p.rot]));
  const baseM = p => new T3.Matrix4().set(p.rot[0], p.rot[1], p.rot[2], p.pos[0], p.rot[3], p.rot[4], p.rot[5], p.pos[1], p.rot[6], p.rot[7], p.rot[8], p.pos[2], 0, 0, 0, 1);
  const restore = () => {
    if (!S) return;
    for (const p of C.model.parts) { const o = C.objs.get(p.id); if (o && S.touched.has(p.id)) { o.matrix.copy(baseM(p)); o.matrixWorldNeedsUpdate = true; } }
    if (S.helper) { S.helper.removeFromParent(); S.helper.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); }
  };
  const pose = th => {
    if (!S || !S.res.ok) return;
    const byId = new Map(C.model.parts.map(p => [p.id, p]));
    const R = new T3.Matrix4(), Tm = new T3.Matrix4(), Ti = new T3.Matrix4(), M = new T3.Matrix4();
    for (const G of S.res.groups) {
      const ang = -th * G.k * Math.PI / 180;
      R.makeRotationAxis(new T3.Vector3(...G.a).normalize(), ang); Tm.makeTranslation(...G.c); Ti.makeTranslation(-G.c[0], -G.c[1], -G.c[2]);
      M.multiplyMatrices(Tm, R).multiply(Ti);
      for (const id of G.ids) { const p = byId.get(id), o = C.objs.get(id); if (!p || !o) continue; o.matrix.multiplyMatrices(M, baseM(p)); o.matrixWorldNeedsUpdate = true; S.touched.add(id); }
    }
  };
  // 축 표시: 화살표 (씬에 직접, 부품 고르기에 걸리지 않게)
  const makeHelper = res => {
    const grp = new T3.Group(); grp.matrixAutoUpdate = false;
    res.groups.forEach((G, i) => {
      const col = COLORS[i % COLORS.length], a = new T3.Vector3(...G.a).normalize(), c = new T3.Vector3(...G.c);
      const L = i === 0 ? 70 : 50;
      const geo = new T3.BufferGeometry().setFromPoints([c.clone().addScaledVector(a, -L), c.clone().addScaledVector(a, L)]);
      const ln = new T3.Line(geo, new T3.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: .9 }));
      ln.renderOrder = 999; grp.add(ln);
      // 도는 방향 고리
      const ring = [], u = new T3.Vector3().crossVectors(a, Math.abs(a.y) < .9 ? new T3.Vector3(0, 1, 0) : new T3.Vector3(1, 0, 0)).normalize(), v = new T3.Vector3().crossVectors(a, u);
      const rr = i === 0 ? 26 : 18, sgn = Math.sign(G.k) || 1;
      for (let k = 0; k <= 28; k++) { const th = -sgn * k / 32 * Math.PI * 2; ring.push(c.clone().addScaledVector(a, L * .55).addScaledVector(u, Math.cos(th) * rr).addScaledVector(v, Math.sin(th) * rr)); }
      const tip = ring[ring.length - 1], pr = ring[ring.length - 3], dir = tip.clone().sub(pr).normalize(), side = new T3.Vector3().crossVectors(dir, a).normalize();
      ring.push(tip.clone().addScaledVector(dir, -7).addScaledVector(side, 4), tip, tip.clone().addScaledVector(dir, -7).addScaledVector(side, -4));
      const rl = new T3.Line(new T3.BufferGeometry().setFromPoints(ring), new T3.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: .9 }));
      rl.renderOrder = 999; grp.add(rl);
    });
    grp.traverse(o => { o.raycast = () => {}; });
    C.scene.add(grp);
    return grp;
  };
  const fmtK = k => { const a = Math.abs(k); const s = a >= 1 ? (Math.round(a * 100) / 100).toString() : `1/${Math.round(1 / a * 100) / 100}`; return '×' + (k < 0 ? '−' : '') + s; };

  const box = document.createElement('div'); box.id = 'mechBox'; box.hidden = true;
  box.innerHTML = `<div class="mh"><span>⟳</span><b class="mt"></b><button class="small mx" type="button"></button></div>
<div class="mr"><span class="la"></span><input type="range" min="-720" max="720" step="1" value="0" class="ms"><span class="mv">0°</span></div>
<div class="mr" style="margin-top:4px"><button class="small mp" type="button"></button><button class="small md" type="button"></button><span class="ls"></span><select class="mspd"><option value="30">30°/s</option><option value="90" selected>90°/s</option><option value="180">180°/s</option><option value="360">360°/s</option></select><button class="small m0" type="button"></button></div>
<div class="mi"></div>`;
  const wrapEl = () => document.getElementById('viewportWrap');
  const $b = s => box.querySelector(s);
  const label = () => {
    $b('.mx').textContent = '✕ ' + t('닫기'); $b('.la').textContent = t('각도'); $b('.ls').textContent = t('속도');
    $b('.mp').textContent = S && S.play ? t('⏸ 멈춤') : t('▶ 돌리기'); $b('.md').textContent = t('⇄ 방향'); $b('.m0').textContent = t('↺ 처음으로');
    const b = document.getElementById('btnMech'); if (b) { b.textContent = t('⟳ 회전 실험'); b.title = t('모터·축·기어를 돌려 연결된 부품이 함께 움직이는지 봅니다'); }
    if (S) info();
  };
  const info = () => {
    const ix = X.index(), p = C.model.parts.find(x => x.id === S.id);
    const nm = p ? ((ix.parts[p.file] || {}).name || p.file) : '';
    $b('.mt').textContent = `${t('회전 실험')} — ${nm}`; $b('.mt').title = nm;
    const el = $b('.mi'); el.innerHTML = '';
    const res = S.res;
    if (!res.ok) { const w = document.createElement('div'); w.className = 'w'; w.textContent = '⚠ ' + res.why; el.appendChild(w); return; }
    const n = res.groups.reduce((s, G) => s + G.ids.length, 0);
    const top = document.createElement('div');
    top.textContent = t('함께 도는 부품 {0}개 · 축 {1}개', n, res.groups.length) + (res.meshes ? ' · ' + t('맞물린 기어 {0}쌍', res.meshes) : '');
    el.appendChild(top);
    const gl = document.createElement('div'); gl.className = 'mg';
    res.groups.forEach((G, i) => {
      const s = document.createElement('span'), dot = document.createElement('i'); dot.style.background = '#' + COLORS[i % COLORS.length].toString(16).padStart(6, '0');
      s.appendChild(dot);
      s.appendChild(document.createTextNode(`${t('축 {0}', i + 1)} ${i === 0 ? '(' + t('구동') + ')' : fmtK(G.k) + (G.from ? ` (${G.from[0]}→${G.from[1]})` : '')} · ${t('부품 {0}개', G.ids.length)}`));
      gl.appendChild(s);
    });
    el.appendChild(gl);
  };
  const setTh = th => { S.th = th; $b('.ms').value = String(Math.max(-720, Math.min(720, Math.round(((th + 720) % 1440 + 1440) % 1440 - 720)))); $b('.mv').textContent = `${Math.round(th)}°`; pose(th); };
  const close = () => { if (!S) return; restore(); S = null; box.hidden = true; };
  const open = id => {
    close();
    const p = C.model.parts.find(x => x.id === id); if (!p) { X.status(t('부품을 먼저 고르세요')); return; }
    if (!box.parentNode) { const w = wrapEl(); if (!w) return; w.appendChild(box); }
    const res = solve(id);
    S = { id, res, th: 0, play: false, dir: 1, last: 0, sig: sig(), touched: new Set(), helper: null };
    if (res.ok) S.helper = makeHelper(res);
    box.hidden = false; label(); setTh(0);
    if (res.ok) { S.play = true; label(); }
  };
  $b('.mx').onclick = close;
  $b('.mp').onclick = () => { if (!S || !S.res.ok) return; S.play = !S.play; S.last = 0; label(); };
  $b('.md').onclick = () => { if (!S) return; S.dir = -S.dir; };
  $b('.m0').onclick = () => { if (!S) return; S.play = false; label(); setTh(0); };
  $b('.ms').oninput = e => { if (!S || !S.res.ok) return; S.play = false; label(); setTh(+e.target.value); };
  document.addEventListener('keydown', e => { if (S && e.key === 'Escape' && !box.hidden) close(); });

  const loop = now => {
    if (S) {
      const off = document.body.classList.contains('sim') || (document.getElementById('cards') && !document.getElementById('cards').hidden);
      if (off) close();
      else if (sig() !== S.sig) { close(); X.status(t('모델이 바뀌어 회전 실험을 닫았습니다')); }
      else {
        if (S.helper) { C.root.updateMatrixWorld(); S.helper.matrix.copy(C.root.matrixWorld); S.helper.matrixWorldNeedsUpdate = true; }
        if (S.play && S.res.ok) { const dt = S.last ? Math.min(.1, (now - S.last) / 1000) : 0; S.last = now; setTh(S.th + S.dir * (+$b('.mspd').value) * dt); }
        else S.last = 0;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // 버튼: 오른쪽 "선택한 부품" 칸과 우클릭 메뉴
  const mount = () => {
    const pp = document.getElementById('pport');
    if (pp && !document.getElementById('btnMech')) {
      const b = document.createElement('button'); b.id = 'btnMech'; b.type = 'button';
      b.onclick = () => { const s = X.sel; if (!s) { X.status(t('부품을 먼저 고르세요')); return; } open(s.id); };
      (pp.parentElement || pp).after(b); label();
    }
    const act = document.querySelector('#ctx .ctx-act');
    if (act && !document.getElementById('ctxMech')) {
      const b = document.createElement('button'); b.id = 'ctxMech'; b.className = 'small'; b.type = 'button'; b.textContent = t('회전 실험');
      b.onclick = () => { const s = X.sel; document.getElementById('ctx').hidden = true; if (s) open(s.id); };
      act.appendChild(b);
    }
    const cm = document.getElementById('ctxMech'); if (cm) cm.textContent = t('회전 실험');
  };
  mount(); setInterval(mount, 1500);
  new MutationObserver(() => { label(); mount(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  window.__mech = { solve, open, close, get state() { return S && { id: S.id, th: S.th, play: S.play, res: S.res }; } };
})();
