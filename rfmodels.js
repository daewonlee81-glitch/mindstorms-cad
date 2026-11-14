// rfmodels.js — Robofest 2027 RoboPetCare 경기장의 3D 준비물 모형 (app.js·umc.js 다음에 불러오는 덧붙임 스크립트)
//   · 강아지·고양이: 받은 3D 프린트 STL(줄인 메시)로 물체 모양을 바꿉니다 (충돌·채점은 그대로 umc.js의 상자·원기둥).
//   · 사료 디스펜서·펫토이: 받은 레고 LDR 모형을 경기장에 세웁니다 (충돌은 umc.js의 받침 벽, 상자는 숨김).
//   · 동물병원·미용실·화장실: 규정 그림처럼 테이블 가장자리 바깥 바닥에 20×5cm 틀을 그립니다.
//   모형 자료(rfmodels.json, 약 600KB)는 Robofest 경기장을 처음 고를 때 한 번만 내려받습니다.
(() => {
  'use strict';
  const U = window.__umc, C = window.__cad; if (!U || !C) return;
  const T = C.THREE, VER = 1;
  let data = null, loading = null;
  const load = () => loading || (loading = fetch('rfmodels.json?v=' + VER).then(r => r.json()).then(j => (data = j)).catch(() => null));
  const b64 = (s, Arr) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Arr(u.buffer); };
  const geom = (v, i, s, i32) => {
    const p = b64(v, Int16Array), f = new Float32Array(p.length); for (let k = 0; k < p.length; k++) f[k] = p[k] * s;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(f, 3)); g.setIndex(new T.BufferAttribute(b64(i, i32 ? Uint32Array : Uint16Array), 1));
    g.computeVertexNormals(); return g;
  };
  const cache = {};
  const stlGeom = k => cache['s' + k] || (cache['s' + k] = (m => geom(m.v, m.i, m.s, m.i32))(data.stl[k]));
  const ldrGroup = k => {
    const src = cache['l' + k] || (cache['l' + k] = data.ldr[k].g.map(g => [geom(g.v, g.i, data.ldr[k].s, g.n > 65535), new T.MeshStandardMaterial({ color: parseInt(g.c, 16), roughness: .55, metalness: .05, side: T.DoubleSide, flatShading: true })]));
    const grp = new T.Group(); for (const [g, m] of src) grp.add(new T.Mesh(g, m)); return grp;
  };
  const isRF = m => !!(m && typeof m.key === 'string' && m.key.startsWith('rf27'));
  const W = 1820, H = 750, wx = x => x - W / 2, wz = y => y - H / 2, RAISE = 45;

  // 경기장 고정 모형 (umc.js 의 받침 위치와 같게)
  const DISP = [500, 44], TOY = [1670, 290], PIVY = 250; // PIVY: 사료통 축 높이(mm, 기둥 꼭대기)
  const BOWL = [1332, 350]; // 펫호텔 그릇 (umc.js 와 같은 자리)
  const OUT = [ // 테이블 밖 구조물 [x0, x1, 북(-1)/남(+1), 색, 이름]
    [1070, 1270, -1, 0xf5b400, ['화장실', 'Litter']],
    [1220, 1420, 1, 0x5aa84a, ['동물병원', 'Vet']],
    [400, 600, 1, 0x86c27a, ['미용실', 'Groomer']],
  ];
  const label = (txt, col) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#1b1b1b'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 34);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    return new T.Mesh(new T.PlaneGeometry(150, 37.5), new T.MeshBasicMaterial({ map: t, transparent: true }));
  };
  const frames = grp => {
    const ko = (document.documentElement.lang || 'ko').startsWith('ko');
    for (const [x0, x1, side, col, nm] of OUT) {
      const f = new T.Group(), m = new T.MeshStandardMaterial({ color: 0x4a4d52, roughness: .8 }), hgt = 30, th = 6, dep = 50, wd = x1 - x0;
      const box = (w, d, x, z) => { const b = new T.Mesh(new T.BoxGeometry(w, hgt, d), m); b.position.set(x, hgt / 2, z); f.add(b); };
      box(wd, th, 0, -dep / 2 + th / 2); box(wd, th, 0, dep / 2 - th / 2); box(th, dep, -wd / 2 + th / 2, 0); box(th, dep, wd / 2 - th / 2, 0);
      const fl = new T.Mesh(new T.PlaneGeometry(wd - 2 * th, dep - 2 * th), new T.MeshStandardMaterial({ color: col, roughness: .9 })); fl.rotation.x = -Math.PI / 2; fl.position.y = 1; f.add(fl);
      f.position.set(wx((x0 + x1) / 2), -RAISE, side < 0 ? wz(0) - dep / 2 : wz(H) + dep / 2);
      grp.add(f);
      const lb = label(ko ? nm[0] : nm[1], col); lb.rotation.x = -Math.PI / 2; lb.position.set(f.position.x, -RAISE + 1, side < 0 ? wz(0) - dep - 30 : wz(H) + dep + 30); grp.add(lb);
    }
  };
  const fixed = grp => {
    // 디스펜서: 모형 x(깊이, 받침 −29~59mm) → 테이블 남쪽(+), 모형 z(15cm) → 가장자리 방향. 받침 뒤끝이 북쪽 가장자리에 붙습니다.
    //   사료통의 낮은 끝(막이)은 북쪽 가장자리 쪽, 열린 높은 끝(배출구)은 테이블 쪽입니다. 사료 10개는 umc.js가 통 안에 놓습니다.
    const d = ldrGroup('disp'); d.rotation.y = -Math.PI / 2; d.position.set(wx(DISP[0]), 0.8, wz(DISP[1] - 15)); grp.add(d);
    // 사료통(기둥 위, 높이 23.8cm 이상)을 따로 떼어 기둥 꼭대기(받침 가운데 위 25cm)를 축으로 기울일 수 있게 합니다.
    //   열린 끝(남쪽)이 내려가면 사료가 미끄러져 떨어집니다 — umc.js 가 window.__rfDisp.tilt(도)로 움직입니다.
    const piv = new T.Group(); piv.position.set(wx(DISP[0]), 0.8 + PIVY, wz(DISP[1]));
    const inner = new T.Group(); inner.rotation.y = -Math.PI / 2; inner.position.set(0, -PIVY, -15); piv.add(inner);
    for (const m of [...d.children]) {
      const g = m.geometry, idx = g.index.array, pos = g.attributes.position, up = [], dn = [];
      for (let k = 0; k < idx.length; k += 3) { const y = (pos.getY(idx[k]) + pos.getY(idx[k + 1]) + pos.getY(idx[k + 2])) / 3; (y >= 238 ? up : dn).push(idx[k], idx[k + 1], idx[k + 2]); }
      if (!up.length) continue;
      const mk = arr => { const h = new T.BufferGeometry(); h.setAttribute('position', pos); if (g.attributes.normal) h.setAttribute('normal', g.attributes.normal); h.setIndex(arr); return h; };
      m.geometry = mk(dn); inner.add(new T.Mesh(mk(up), m.material));
    }
    grp.add(piv);
    window.__rfDisp = { pivot: piv, PIVY, tilt: deg => { piv.rotation.x = deg * Math.PI / 180; } };
    // 펫토이: 받침(4×12cm)이 남북 방향, 고리(모형 +z)는 북쪽.
    const t = ldrGroup('toy'); t.rotation.y = Math.PI; t.position.set(wx(TOY[0]), 0.8, wz(TOY[1])); grp.add(t);
    frames(grp);
    grp.add(bowl());
  };
  // 펫호텔 그릇: 은색 원형 개 밥그릇 (규정: 높이 약 5cm, 입구 지름 12cm, 바닥 지름 17.5cm — 바닥이 넓은 미끄럼 방지 모양)
  const bowl = () => {
    const prof = [[0, 9], [44, 9], [50, 18], [55, 34], [59, 46], [60.5, 50], [63, 51], [66, 49], [72, 36], [80, 18], [86, 5], [87.5, 1.5], [87.5, 0], [0, 0]]
      .map(([r, y]) => new T.Vector2(r, y));
    const g = new T.LatheGeometry(prof, 64); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0xeef0f3, metalness: 0.35, roughness: 0.25, side: T.DoubleSide }));
    m.position.set(wx(BOWL[0]), 0.6, wz(BOWL[1])); m.userData.rf = 1;
    // 테두리 반사 띠 (은색이 잘 보이게)
    const rim = new T.Mesh(new T.TorusGeometry(61.8, 1.6, 8, 64), new T.MeshStandardMaterial({ color: 0xf2f4f7, metalness: 0.7, roughness: 0.15 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 50.4; m.add(rim);
    return m;
  };
  // 충돌용 받침 상자는 모형이 보이면 숨깁니다 (충돌·감점 판정은 그대로).
  const hideWalls = scene => {
    if (scene) for (const ch of scene.children) if (ch.isGroup || ch.type === 'Group') for (const m of ch.children)
      if (m.isMesh && m.geometry && m.geometry.type === 'BoxGeometry' && m.material && m.material.color && [0x4a8fd6, 0x8fbbe8, 0xc9ced6].includes(m.material.color.getHex()) && !m.userData.rf) m.visible = false;
  };
  const extras = grp => {
    const add = () => { if (!data || !isRF(U.mat())) return; const g = new T.Group(); g.userData.rf = 1; fixed(g); grp.add(g); hideWalls(grp.parent); };
    if (data) add(); else load().then(add);
  };
  for (const k of Object.keys(U.mats)) if (k.startsWith('rf27')) U.mats[k].extras = extras;

  // 강아지·고양이 물체 모양 바꾸기: 경기장을 다시 놓을 때마다 새 메시가 생기므로 계속 살핍니다.
  const DOG = 0xd9a24a;
  const skin = () => {
    if (!data || !isRF(U.mat())) return;
    for (const o of U.props()) {
      if ((o.kind !== 'dog' && o.kind !== 'cat') || !o.mesh || o.mesh.userData.rf) continue;
      const g = stlGeom(o.kind), m = new T.Mesh(g, new T.MeshStandardMaterial({ color: o.kind === 'dog' ? DOG : o.color, roughness: .6 }));
      m.position.y = -o.hgt / 2;
      for (const c of o.mesh.children) c.visible = false;
      o.mesh.add(m); o.mesh.userData.rf = 1;
    }
  };
  setInterval(() => { if (isRF(U.mat())) { if (!data) load(); skin(); } }, 300);
  // 이미 Robofest 경기장이 열려 있으면 다시 그려 모형을 붙입니다.
  if (isRF(U.mat())) load().then(() => { const sel = document.querySelector('#simMat'); if (sel && typeof sel.onchange === 'function') sel.onchange({ target: sel }); });
})();
