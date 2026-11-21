// othelloai.js — 시뮬레이터 경기장 "WRL 로봇 배틀 오셀로 AI" (umc.js 다음에 불러옵니다)
//   · WRL 로봇 배틀 오델로 경기장(≈198cm 팔각, 높이 30cm)과 같은 크기·배치. 경기장은 회색조, 오셀로 판은 빨강·파랑 그대로.
//   · 오셀로 판: 왼쪽 팀 = 빨강 면이 위, 오른쪽 팀 = 파랑 면이 위. AI 경기장에는 콘이 없습니다.
//   · 상대 로봇: 같은 로봇·같은 블록 프로그램을 반대편에서 실행 (허스키렌즈 학습 색만 빨강↔파랑) — 아래 '상대 로봇'.
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
    '상대 로봇': ['Opponent', '相手ロボット', '对手机器人', 'Oponente'], '켜짐': ['on', 'オン', '开', 'sí'], '꺼짐': ['off', 'オフ', '关', 'no'],
    '같은 코드 · 빨강↔파랑 학습 색': ['same code · red↔blue learned colours', '同じコード · 赤↔青の学習色', '相同代码 · 红↔蓝学习颜色', 'mismo código · rojo↔azul aprendidos'],
    '상대 로봇이 떨어졌습니다': ['the opponent fell off', '相手ロボットが落ちました', '对手机器人掉下去了', 'el oponente se cayó'],
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
      const O = window.__othelloAI && window.__othelloAI.opp;
      const opp = O ? `<br><button class="small" style="margin-top:3px" onpointerdown="window.__othelloAI&&window.__othelloAI.toggleOpp()">🤖 ${esc(T('상대 로봇'))}: ${esc(O.on ? T('켜짐') : T('꺼짐'))}</button>` +
        (O.on ? ` <span style="font-weight:400">${esc(T('같은 코드 · 빨강↔파랑 학습 색'))}${O.fell ? ' · ' + esc(T('상대 로봇이 떨어졌습니다')) : ''}${O.err ? ' · ⚠ ' + esc(O.err.slice(0, 80)) : ''}</span>` : '') : '';
      return `<span class="sw-dot" style="background:#d22323"></span>${esc(T('빨강'))} ${b} : ${w} ${esc(T('파랑'))}<span class="sw-dot" style="background:#1e5ac8"></span>` + (blk ? ` · ${blk}` : '') + opp;
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
  // 한 로봇(뿌리 root, 팔 arms)의 플리퍼 판정
  const flipCheck = (root, armsL) => {
    const T3 = window.__cad.THREE, now = U.time(); root.updateMatrixWorld(true);
    const inv = new T3.Matrix4().copy(root.matrixWorld).invert(), v = new T3.Vector3();
    for (const A of armsL) {
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

  // ───────── 상대 로봇 (같은 코드, 반대 색) ─────────
  //   같은 CAD 로봇을 반대편 출발 구역에 하나 더 놓고, 지금 블록 프로그램을 그대로 실행합니다.
  //   허스키렌즈의 학습 색만 빨강↔파랑을 바꿔서, 같은 코드로 빨간 판을 찾아 파랑으로 뒤집습니다.
  //   · 상대 로봇은 간단 모드(2D)로 움직입니다: 바퀴 속도로 위치 계산, 판·블록은 밀어냄, 경기장 밖으로 나가면 떨어짐.
  //   · 두 로봇은 서로 겹치지 않게 상대 로봇이 멈춥니다. 내 로봇의 센서·카메라에는 상대 로봇이 보이지 않습니다.
  const OPP = { on: true, pose: null, M: {}, db: null, cmd: null, waits: [], t0: 0, token: 0, run: false, fell: false, clone: null, cloneFor: null, rigMap: [], arms: [], err: '' };
  const oppStart = () => { const s = mat.start; return { x: -s.x, z: s.z, th: s.th + Math.PI }; };
  const oppReset = () => { OPP.token++; OPP.run = false; OPP.pose = oppStart(); OPP.M = {}; OPP.db = null; OPP.cmd = null; for (const w of OPP.waits) w.rej && w.rej(STOP); OPP.waits = []; OPP.fell = false; OPP.err = ''; };
  const STOP = new Error('opp-stop');
  const inOct = (x, z) => Math.abs(x) <= mat.w / 2 && Math.abs(z) <= mat.h / 2 && Math.abs(x) + Math.abs(z) <= mat.w - mat.cut;
  const mo = p => OPP.M[p] || (OPP.M[p] = { pos: 0, zero: 0, cmd: null, dir: 1 });
  const waitT = (t, tok) => new Promise((res, rej) => OPP.waits.push({ t, res, rej, tok }));
  const oppApi = () => {
    const tok = OPP.token, ck = () => { if (tok !== OPP.token || !OPP.run) throw STOP; };
    const R = X.robot, db = () => OPP.db || (OPP.db = { L: R.left, R: R.right, wd: R.d || 56, at: R.track || 112, ss: null, tr: null });
    const ss = d => d.ss ?? 0.4 * 1000 / 360 * Math.PI * d.wd, tr = d => d.tr ?? 0.4 * 1000 * d.wd / d.at; // 앱과 같은 기본 속도
    const motorTo = (p, vel, target, until) => { const m = mo(p); if (m.cmd && m.cmd.res) m.cmd.res(); return new Promise(res => { m.cmd = { vel, target, until, res }; }); };
    const sens = (port, kind) => (R.sensors || []).find(s => s.port === port && (!kind || s.kind === kind));
    const world = (x, z) => { const P = OPP.pose, c = Math.cos(P.th), s = Math.sin(P.th); return [P.x + x * c + z * s, P.z - x * s + z * c]; };
    const refl = port => {
      const s = sens(port, 'color'); if (!s || OPP.fell) return 0;
      const [x, z] = world(s.x, s.z); if (!inOct(x, z)) return 0;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) { const px = X.matPx(x + dx, z + dz) || [120, 120, 120]; r += px[0]; g += px[1]; b += px[2]; n++; }
      return Math.round((0.299 * r + 0.587 * g + 0.114 * b) / n / 2.55);
    };
    const hcfg = () => { const c = (window.__cad.model.sim && window.__cad.model.sim.husky) || { algo: 'color', ids: ['red', 'blue', 'green'] }; return { ...c, ids: (c.ids || []).map(k => k === 'red' ? 'blue' : k === 'blue' ? 'red' : k) }; };
    const husky = port => (window.__husky && window.__husky.renderAt) ? (window.__husky.renderAt(port, OPP.pose, hcfg()) || { id: 0, v: [0, 0, 0] }) : { id: 0, v: [0, 0, 0] };
    const api = {
      async wbMotorDir(p, d) { ck(); mo(p).dir = d === 'COUNTERCLOCKWISE' ? -1 : 1; },
      async wbDriveSetup(L, Rr, wd, at) { ck(); OPP.db = { L, R: Rr, wd: Number(wd) || 56, at: Number(at) || 112, ss: null, tr: null }; },
      async wbReset(p) { ck(); const m = mo(p); m.zero = m.pos; },
      async wbRun(p, sp) { ck(); motorTo(p, (Number(sp) || 0) * 10, null, null); },
      async wbDc(p, sp) { ck(); motorTo(p, (Number(sp) || 0) * 10, null, null); },
      async wbRunFor(p, sp, amt, unit, wait) {
        ck(); const m = mo(p), v = Math.max(-1000, Math.min(1000, (Number(sp) || 0) * 10)); amt = Number(amt) || 0;
        const pr = unit === 'sec' ? motorTo(p, v, null, U.time() + amt) : motorTo(p, Math.sign(v || 1) * Math.abs(v), m.pos + Math.sign(v || 1) * (unit === 'rot' ? amt * 360 : amt));
        if (wait) { await pr; ck(); }
      },
      async wbTarget(p, sp, ang) { ck(); const m = mo(p), tgt = (Number(ang) || 0) + m.zero, v = Math.abs(Math.max(-1000, Math.min(1000, (Number(sp) || 0) * 10))) || 500; if (Math.abs(tgt - m.pos) < .5) return; await motorTo(p, Math.sign(tgt - m.pos) * v, tgt); ck(); },
      async motorStop(p) { ck(); const m = mo(p); if (m.cmd) { const r = m.cmd.res; m.cmd = null; r && r(); } },
      wbMotorVal(p, what) { ck(); const m = mo(p); return Math.round(what === 'speed' ? (m.cmd ? m.cmd.vel : 0) : m.pos - m.zero); },
      async wbStraight(d) { ck(); d = Number(d) || 0; if (!d) return; await new Promise(res => { OPP.cmd = { type: 'move', left: Math.abs(d), dir: Math.sign(d), v: ss(db()), res }; }); ck(); },
      async wbTurn(a) { ck(); a = Number(a) || 0; if (!a) return; await new Promise(res => { OPP.cmd = { type: 'turn', left: Math.abs(a), dir: Math.sign(a), w: tr(db()), res }; }); ck(); },
      async wbDrive(v, w) { ck(); if (OPP.cmd && OPP.cmd.res) OPP.cmd.res(); OPP.cmd = { type: 'drive', v: Number(v) || 0, w: Number(w) || 0 }; },
      async wbDbStop() { ck(); if (OPP.cmd && OPP.cmd.res) OPP.cmd.res(); OPP.cmd = null; },
      async wbDbSettings(v, w) { ck(); const d = db(); d.ss = Number(v) || null; d.tr = Number(w) || null; },
      wbColorVal(p, what) { ck(); return what === 'ambient' ? 10 : refl(p); },
      wbColorIs() { ck(); return false; },
      wbHusky(port, what, arg) {
        ck(); const r = husky(port);
        switch (what) {
          case 'detected': { const tg = Number(arg) || 0; return tg === 0 ? r.id > 0 : r.id === tg; }
          case 'id': return r.id;
          case 'x': case 'line_start_x': return r.v[0];
          case 'y': case 'line_end_x': return r.v[1];
          case 'width': case 'line_end_y': return r.v[2];
          case 'offset': return r.v[0] - 160;
          default: return 0;
        }
      },
      async wait(sec) { ck(); await waitT(U.time() + Math.max(0, Number(sec) || 0), tok); ck(); },
      async tick() { ck(); await waitT(U.time() + 1e-6, tok); ck(); },
      async timerReset() { ck(); OPP.t0 = U.time(); },
      wbTimer() { ck(); return Math.round((U.time() - OPP.t0) * 1000) / 1000; },
      timer() { ck(); return Math.round((U.time() - OPP.t0) * 100) / 100; },
    };
    // 그 밖의 블록(화면·소리·출력 등)은 상대 로봇에서는 아무것도 하지 않음
    return new Proxy(api, { get: (o, k) => (k in o ? o[k] : (typeof k === 'string' ? (async () => { ck(); return 0; }) : undefined)) });
  };
  const oppRun = () => {
    const ws = window.__wb && window.__wb.ws && window.__wb.ws(), gen = window.javascript && window.javascript.javascriptGenerator;
    if (!ws || !gen) return;
    let code = ''; try { code = gen.workspaceToCode(ws); } catch (e) { OPP.err = String(e.message || e); return; }
    const AF = Object.getPrototypeOf(async function () {}).constructor;
    OPP.token++; OPP.run = true; OPP.t0 = U.time(); OPP.cmd = null; OPP.waits = []; const tok = OPP.token;
    let f; try { f = new AF('api', '__wbTrace', code); } catch (e) { OPP.err = String(e.message || e); OPP.run = false; return; }
    f(oppApi(), () => {}).catch(e => { if (e !== STOP && tok === OPP.token) { OPP.err = String(e && e.message || e); console.warn('opponent', e); } }).finally(() => { if (tok === OPP.token) { OPP.run = false; OPP.cmd = null; } });
  };
  const oppStop = () => { OPP.token++; OPP.run = false; OPP.cmd = null; for (const m of Object.values(OPP.M)) m.cmd = null; for (const w of OPP.waits) w.rej && w.rej(STOP); OPP.waits = []; };
  // 모습: 내 로봇 복제 (팔 돌림 축도 같은 자리)
  const pathOf = (root, o) => { const p = []; while (o && o !== root) { const par = o.parent; if (!par) return null; p.unshift(par.children.indexOf(o)); o = par; } return o === root ? p : null; };
  const follow = (root, p) => { let o = root; for (const i of p) { o = o && o.children[i]; } return o || null; };
  const ensureClone = () => {
    const R = X.robot; if (!R || !R.root || !R.root.parent) return false;
    if (OPP.clone && OPP.cloneFor === R && OPP.clone.parent) return true;
    if (OPP.clone) OPP.clone.removeFromParent();
    const rigs = (window.__simRigObjs && window.__simRigObjs()) || [];
    const paths = rigs.map(r => ({ r, p: pathOf(R.root, r.pivot) }));
    const armPaths = armsOf(R).map(A => ({ port: A.port, ps: A.objs.map(o => pathOf(R.root, o)).filter(Boolean) }));
    const c = R.root.clone(true); c.userData.oppBot = 1;
    { // 상대 로봇 표시: 머리 위 파란 표식 (어느 쪽이 상대인지 보이게)
      const T3 = window.__cad.THREE, bb = new T3.Box3().setFromObject(R.root), top = bb.isEmpty() ? 250 : bb.max.y - R.root.position.y + 10;
      const mk = new T3.Mesh(new T3.ConeGeometry(18, 36, 16), new T3.MeshStandardMaterial({ color: 0x1e5ac8, roughness: .5 }));
      mk.rotation.x = Math.PI; mk.position.y = top + 18; mk.raycast = () => {}; c.add(mk);
    }
    R.root.parent.add(c);
    OPP.clone = c; OPP.cloneFor = R;
    OPP.rigMap = paths.filter(x => x.p).map(x => ({ port: x.r.port, axis: x.r.axis, k: x.r.k == null ? 1 : x.r.k, pivot: follow(c, x.p) })).filter(x => x.pivot);
    OPP.arms = armPaths.map(A => ({ port: A.port, objs: A.ps.map(p => follow(c, p)).filter(Boolean), low: -1, cand: new Map() })).filter(A => A.objs.length);
    return true;
  };
  const dropClone = () => { if (OPP.clone) { OPP.clone.removeFromParent(); OPP.clone = null; OPP.cloneFor = null; } };
  // 밀기: 앱의 간단 모드와 같은 방식 (로봇 상자에 닿은 판·블록을 상자 밖으로)
  const pushProps = () => {
    const R = X.robot, h = R && R.half; if (!h) return;
    const P = OPP.pose, si = Math.sin(P.th), co = Math.cos(P.th);
    for (const o of U.props()) {
      if (o.fallen || o.held || o.base) continue;
      const a = o.x - P.x, l = o.z - P.z, cx = a * co - l * si, cz = a * si + l * co;
      const px = Math.max(h.x0, Math.min(h.x1, cx)), pz = Math.max(h.z0, Math.min(h.z1, cz));
      let dx = cx - px, dz = cz - pz, d = Math.hypot(dx, dz); const r = o.cr || o.r || 60;
      if (d >= r) continue;
      let nx, nz;
      if (d < 1e-6) { const f = [[cx - h.x0, -1, 0], [h.x1 - cx, 1, 0], [cz - h.z0, 0, -1], [h.z1 - cz, 0, 1]].sort((u, w) => u[0] - w[0])[0]; nx = f[1]; nz = f[2]; d = -f[0]; }
      else { nx = dx / d; nz = dz / d; }
      const nc = cx + nx * (r - d), nzz = cz + nz * (r - d);
      o.x = P.x + nc * co + nzz * si; o.z = P.z - nc * si + nzz * co; o.vx = o.vz = 0;
      if (o.body) { try { const t = o.body.translation(); o.body.setTranslation({ x: o.x / 1000, y: t.y, z: o.z / 1000 }, true); o.body.setLinvel({ x: 0, y: 0, z: 0 }, true); } catch (e) {} }
    }
  };
  const stepOpp = dt => {
    const P = OPP.pose; if (!P) return;
    // 모터 (플리퍼 등)
    for (const m of Object.values(OPP.M)) {
      const c = m.cmd; if (!c) continue;
      m.pos += c.vel * dt;
      if (c.target != null && (c.vel >= 0 ? m.pos >= c.target : m.pos <= c.target)) { m.pos = c.target; m.cmd = null; c.res && c.res(); }
      else if (c.until != null && U.time() >= c.until) { m.cmd = null; c.res && c.res(); }
    }
    if (OPP.fell) return;
    // 주행
    const c = OPP.cmd; let v = 0, w = 0;
    if (c) {
      if (c.type === 'drive') { v = c.v; w = c.w; }
      else if (c.type === 'move') { const s = Math.min(c.left, c.v * dt); v = c.dir * s / dt; c.left -= s; if (c.left <= 1e-6) { OPP.cmd = null; c.res(); } }
      else if (c.type === 'turn') { const s = Math.min(c.left, c.w * dt); w = c.dir * s / dt; c.left -= s; if (c.left <= 1e-6) { OPP.cmd = null; c.res(); } }
    }
    if (!v && !w) return;
    const th = P.th - w * Math.PI / 180 * dt, nx = P.x + v * dt * Math.sin(th), nz = P.z + v * dt * Math.cos(th);
    // 내 로봇과 겹치면 멈춤
    const me = U.pose(), gap = Math.hypot(nx - me.x, nz - me.z);
    if (gap < 230 && gap < Math.hypot(P.x - me.x, P.z - me.z)) { P.th = th; return; }
    P.x = nx; P.z = nz; P.th = th;
    pushProps();
    if (!inOct(P.x, P.z)) { OPP.fell = true; oppStop(); }
  };
  let lastT = 0, wasRun = false, propsRef = null;
  const tickAll = async () => {
    requestAnimationFrame(tickAll);
    if (!X || U.mat() !== mat) { if (OPP.clone) { dropClone(); } wasRun = false; return; }
    const R = X.robot, T3 = window.__cad.THREE; if (!R || !R.root || !T3) return;
    if (R !== rigFor) { rigFor = R; arms = armsOf(R); }
    // 상대 로봇
    if (!OPP.pose) oppReset();
    const props = U.props(); if (props !== propsRef) { propsRef = props; if (!U.sim().running) oppReset(); }
    const running = !!U.sim().running;
    if (OPP.on && ensureClone()) {
      if (running && !wasRun && !OPP.fell) oppRun();
      if (!running && wasRun) oppStop();
      const now = U.time(); let dt = now - lastT; lastT = now;
      if (running && dt > 0 && dt < 1) {
        const n = Math.max(1, Math.ceil(dt / 0.01));
        for (let k = 0; k < n; k++) {
          stepOpp(dt / n);
          const tt = now - dt + dt * (k + 1) / n;
          const due = OPP.waits.filter(w => w.t <= tt + 1e-9); OPP.waits = OPP.waits.filter(w => w.t > tt + 1e-9);
          for (const w of due) w.res();
          for (let j = 0; j < 12; j++) await null; // 프로그램이 다음 명령까지 진행하도록
        }
      }
      const P = OPP.pose, c = OPP.clone;
      c.position.set(P.x, OPP.fell ? -(mat.raise || 0) : 0, P.z); c.rotation.set(0, P.th, 0); c.quaternion.setFromEuler(c.rotation);
      for (const rg of OPP.rigMap) { const m = OPP.M[rg.port]; rg.pivot.quaternion.setFromAxisAngle(rg.axis, -((m && m.pos) || 0) * rg.k * Math.PI / 180); }
      if (OPP.arms.length) flipCheck(c, OPP.arms);
    } else if (!OPP.on && OPP.clone) { oppStop(); dropClone(); }
    wasRun = running;
    if (arms.length) flipCheck(R.root, arms);
  };
  requestAnimationFrame(tickAll);
  const toggleOpp = () => { OPP.on = !OPP.on; if (!OPP.on) { oppStop(); dropClone(); } else oppReset(); };
  window.__othelloAI = { flip, arms: () => arms, opp: OPP, toggleOpp, oppReset };
})();
