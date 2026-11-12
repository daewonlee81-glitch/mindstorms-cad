// othelloai.js — 시뮬레이터 경기장 "WRL 로봇 배틀 오셀로 AI" (umc.js 다음에 불러옵니다)
//   · WRL 로봇 배틀 오델로 경기장(≈198cm 팔각, 높이 30cm)과 같은 크기·배치. 경기장은 회색조, 오셀로 판은 빨강·파랑 그대로.
//   · 오셀로 판: 왼쪽 팀 = 빨강 면이 위, 오른쪽 팀 = 파랑 면이 위. AI 경기장에는 콘이 없습니다.
//   · 가운데 네모 블록은 세워져 있습니다 (가로 12cm × 높이 12cm × 두께 2cm). 왼쪽(−x) 면 빨강, 오른쪽(+x) 면 파랑.
//     밀어서 넘어뜨리면 위로 보이는 면의 색이 점수가 됩니다 (물리엔진). 서 있는 동안은 어느 팀 것도 아닙니다.
(() => {
  'use strict';
  const U = window.__umc; if (!U || !U.mats || !U.mats.othello) return;
  const KEY = 'othello_ai', LABEL = 'WRL 로봇 배틀 오셀로 AI';
  const RED = 0xd22323, BLUE = 0x1e5ac8; // 기존 오델로 판과 같은 색
  if (U.i18n) Object.assign(U.i18n, {
    [LABEL]: ['WRL Robot Battle Othello AI', 'WRL ロボットバトル・オセロ AI', 'WRL 机器人对战黑白棋 AI', 'WRL Batalla de robots Othello IA'],
    '가운데 블록': ['Centre block', '中央ブロック', '中央方块', 'Bloque central'],
    '서 있음': ['standing', '立っている', '立着', 'de pie'], '넘어짐': ['fallen', '倒れた', '倒下', 'caído'],
  });
  const T = k => (U.T ? U.T(k) : k), esc = U.esc || (s => String(s));
  const base = U.mats.othello;
  const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); };

  const mat = {
    w: 1980, h: 1980, shape: 'oct', cut: 660, raise: 300, side: 0x8a8f96,
    start: { ...base.start }, key: KEY, label: LABEL,
    draw(n) {
      n.fillStyle = '#eceded'; n.fillRect(0, 0, 1980, 1980);
      n.fillStyle = 'rgba(0,0,0,0.10)'; n.fillRect(0, 0, 990, 1980);       // 왼쪽(빨강 팀) 진하게
      n.fillStyle = 'rgba(255,255,255,0.55)'; n.fillRect(990, 0, 990, 1980); // 오른쪽(파랑 팀) 밝게
      n.strokeStyle = '#c4c6c8'; n.lineWidth = 4; n.beginPath();
      for (const e of [660, 1320]) { n.moveTo(e, 0); n.lineTo(e, 1980); n.moveTo(0, e); n.lineTo(1980, e); }
      n.stroke();
      n.strokeStyle = '#1b1b1f'; n.lineWidth = 10; n.beginPath(); n.moveTo(990, 0); n.lineTo(990, 1980); n.stroke();
      n.setLineDash([24, 16]); n.strokeStyle = '#8a8d91'; n.lineWidth = 8; n.strokeRect(810, 810, 360, 360); n.setLineDash([]);
      // 출발 구역: 왼쪽 검정, 오른쪽 회색 테두리 (경기장은 회색조)
      n.lineWidth = 12; n.strokeStyle = '#1b1b1f'; n.strokeRect(180, 840, 300, 300);
      n.strokeStyle = '#9a9ea3'; n.strokeRect(1500, 840, 300, 300);
    },
    props: () => {
      const out = [], e = [[-300, -300], [-300, 300], [-600, -560], [-600, 560], [-300, 0]];
      for (const [x, z] of e) {
        out.push({ kind: 'disc', shape: 'cyl', r: 60, hgt: 20, mass: .025, x, z, top: RED, bottom: BLUE });
        out.push({ kind: 'disc', shape: 'cyl', r: 60, hgt: 20, mass: .025, x: -x, z, top: BLUE, bottom: RED });
      }
      // 가운데 블록: 세워 둠 (x 방향 두께 2cm, z 방향 폭 12cm, 높이 12cm)
      out.push({ kind: 'oblock', shape: 'box', w: 20, d: 120, hgt: 120, mass: .03, x: 0, z: 0, color: 0x9a9ea3, sides: [RED, BLUE] });
      return out;
    },
    info() {
      let b = 0, w = 0, blk = '';
      for (const t of U.props()) {
        if (t.fallen) continue;
        if (t.kind === 'disc') ((t.up === false ? t.bottom : t.top) === RED ? b++ : w++);
        else if (t.kind === 'oblock') {
          const f = face(t);
          if (f === 'b') b++; else if (f === 'w') w++;
          blk = `${esc(T('가운데 블록'))}: ${esc(f === 'b' ? T('빨강') : f === 'w' ? T('파랑') : f === 'x' ? T('넘어짐') : T('서 있음'))}`;
        }
      }
      return `<span class="sw-dot" style="background:#d22323"></span>${esc(T('빨강'))} ${b} : ${w} ${esc(T('파랑'))}<span class="sw-dot" style="background:#1e5ac8"></span>` + (blk ? ` · ${blk}` : '');
    },
  };
  // 가운데 블록이 어느 면을 위로 했는지: 블록의 −x 면(빨강)이 위면 → 빨강 팀
  //   물리엔진이 꺼져 있으면(간단 모드) 블록은 넘어지지 않고 미끄러지기만 합니다.
  function face(t) {
    if (!t.body) return '';
    const q = t.body.rotation(); // 몸체의 x축이 세계에서 얼마나 위를 보나
    const ux = 2 * (q.x * q.y + q.w * q.z); // 회전된 (1,0,0) 의 y 성분
    if (ux < -0.7) return 'b'; // −x(빨강) 면이 위
    if (ux > 0.7) return 'w';  // +x(파랑) 면이 위
    const uy = 1 - 2 * (q.x * q.x + q.z * q.z); // 회전된 (0,1,0) 의 y 성분: 서 있으면 ≈1
    return uy > 0.7 ? '' : 'x'; // 옆으로 눕는 등
  }
  // 경기장 둘레 바닥(앱 기본은 나무색)도 회색으로
  let scene = null;
  mat.extras = grp => { scene = grp.parent || null; setTimeout(() => { scene = grp.parent || scene; grey(); }, 0); };
  const grey = () => {
    if (!scene || U.mat() !== mat) return;
    for (const m of scene.children) if (m.isMesh && m.geometry && m.geometry.type === 'BoxGeometry' && m.material && m.material.color && m.geometry.parameters && m.geometry.parameters.width === mat.w + 1000 && m.geometry.parameters.height === 20) m.material.color.setHex(0x9b9d9f);
  };
  U.mats[KEY] = mat;

  // 매트 목록: 기존 오델로 바로 아래
  const addOpt = () => {
    const sel = document.querySelector('#simMat'); if (!sel || sel.querySelector(`option[value="${KEY}"]`)) return !!sel;
    const o = document.createElement('option'); o.value = KEY; o.dataset.ko = LABEL; o.textContent = T(LABEL);
    const ref = sel.querySelector('option[value="othello"]');
    if (ref) ref.after(o); else sel.appendChild(o);
    return true;
  };
  if (!addOpt()) { const iv = setInterval(() => { if (addOpt()) clearInterval(iv); }, 500); }

  // 가운데 블록 모양: 앱은 두 색을 위/아래로 나누므로, 왼쪽(빨강)·오른쪽(파랑) 반쪽으로 다시 만듭니다.
  const skin = () => {
    const T3 = window.__cad && window.__cad.THREE; if (!T3 || U.mat() !== mat) return;
    for (const o of U.props()) {
      if (o.kind !== 'oblock' || !o.mesh || o.mesh.userData.oa) continue;
      for (const c of o.mesh.children) c.visible = false;
      o.sides.forEach((col, i) => {
        const m = new T3.Mesh(new T3.BoxGeometry(o.w / 2, o.hgt, o.d), new T3.MeshStandardMaterial({ color: col, roughness: .7 }));
        m.position.x = (i ? 1 : -1) * o.w / 4; o.mesh.add(m);
      });
      o.mesh.userData.oa = 1;
    }
  };
  setInterval(() => { skin(); grey(); }, 250);

  // ───────── 플리퍼로 판 뒤집기 ─────────
  //   시뮬레이터의 팔·플리퍼 모터는 모습만 돌고 물리 관절이 없으므로, 이 경기장에서는 규칙으로 흉내 냅니다:
  //   플리퍼(바퀴가 아닌 모터에 붙은 부품)가 바닥 가까이(높이 15mm 아래) 내려가 있을 때 그 밑·앞에 닿아 있던 판이,
  //   플리퍼가 1초 안에 45mm 위로 올라가면 뒤집힙니다 (위·아래 색이 바뀌고 살짝 튀어 오름).
  const X = window.__cad && window.__cad.ext;
  const flip = o => {
    [o.top, o.bottom] = [o.bottom, o.top];
    const ch = o.mesh && o.mesh.children;
    if (ch && ch.length >= 2 && ch[0].material && ch[1].material) { const c0 = ch[0].material.color.getHex(); ch[0].material.color.setHex(ch[1].material.color.getHex()); ch[1].material.color.setHex(c0); }
    o.flips = (o.flips || 0) + 1;
    if (o.body) { try { o.body.applyImpulse({ x: 0, y: o.mass * 1.0, z: 0 }, true); o.body.applyTorqueImpulse({ x: o.mass * 0.004, y: 0, z: 0 }, true); } catch (e) {} }
  };
  let rigFor = null, arms = [];
  const armsOf = R => {
    const out = [], P = window.__cad.model.parts;
    for (const d of R.devices || []) {
      if (d.kind !== 'motor' || d.port === R.left || d.port === R.right) continue;
      let ids = [];
      try { const ms = window.__mech && window.__mech.solve(d.id); if (ms && ms.ok) ids = ms.groups.flatMap(G => G.ids); } catch (e) {}
      const objs = ids.map(id => R.clones && R.clones[id]).filter(Boolean);
      if (objs.length) out.push({ port: d.port, objs, low: -1, cand: new Map() });
    }
    return out;
  };
  const tickFlip = () => {
    requestAnimationFrame(tickFlip);
    if (!X || U.mat() !== mat) return;
    const R = X.robot, T3 = window.__cad.THREE; if (!R || !R.root || !T3) return;
    if (R !== rigFor) { rigFor = R; arms = armsOf(R); }
    if (!arms.length) return;
    const now = U.time(); R.root.updateMatrixWorld(true);
    const inv = new T3.Matrix4().copy(R.root.matrixWorld).invert(), v = new T3.Vector3();
    for (const A of arms) {
      // 플리퍼의 가장 낮은 높이와, 바닥 가까이 있는 부분의 로봇 기준 앞뒤·좌우 범위
      let miny = 1e9; const foot = new T3.Box3();
      for (const o of A.objs) {
        const bb = new T3.Box3().setFromObject(o); if (bb.isEmpty()) continue;
        miny = Math.min(miny, bb.min.y);
        if (bb.min.y < 15) foot.union(bb.clone().applyMatrix4(inv));
      }
      if (miny < 15 && !foot.isEmpty()) {
        A.low = now;
        for (const o of U.props()) {
          if (o.kind !== 'disc' || o.fallen) continue;
          v.set(o.x, 0, o.z).applyMatrix4(inv);
          // 앞쪽은 판 반지름만큼 (플리퍼 끝에 걸쳐 밀리는 판), 옆은 판이 절반 넘게 플리퍼 위에 있을 때만
          const r0 = o.r || 60, mf = r0 + 15, ms = r0 * 0.4;
          if (v.x > foot.min.x - ms && v.x < foot.max.x + ms && v.z > foot.min.z - mf && v.z < foot.max.z + mf) A.cand.set(o, now);
        }
      } else if (A.low >= 0 && miny > 45) {
        if (now - A.low < 1.0) for (const [o, t] of A.cand) if (A.low - t < 0.3) flip(o);
        A.low = -1; A.cand.clear();
      }
      if (A.low >= 0 && now - A.low > 1.0) { A.low = -1; A.cand.clear(); }
    }
  };
  requestAnimationFrame(tickFlip);
  window.__othelloAI = { flip, arms: () => arms };
})();
