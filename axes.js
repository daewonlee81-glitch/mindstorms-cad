// axes.js — 좌표축 표시: 캐드 3D 화면 오른쪽 위에 X·Y·Z를 공(구)으로 보여 주는 작은 장치입니다.
//   · 화면을 돌리면 같이 돌아서, 지금 어느 쪽이 X·Y·Z인지 바로 알 수 있습니다.
//   · 축은 부품 좌표(오른쪽 클릭 좌표 편집, X±/위·아래/Z± 버튼)와 같은 LDraw 좌표입니다 — 위쪽이 −Y.
//   · 공을 클릭하면 그 방향에서 바라보는 화면으로 바뀝니다.
// app.js를 고치지 않는 덧붙임 스크립트입니다 (app.js 다음에 불러옵니다).
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const TR = {
    '좌표축 — 위쪽이 −Y · 공을 누르면 그 방향에서 봅니다': ['Axes — up is −Y · click a ball to view from that side', '座標軸 — 上が −Y · 球をクリックするとその方向から見ます', '坐标轴 — 上方为 −Y · 点击球体从该方向查看', 'Ejes — arriba es −Y · pulsa una esfera para ver desde ese lado'],
    '{0} 방향에서 보기': ['View from {0}', '{0} 方向から見る', '从 {0} 方向查看', 'Ver desde {0}'],
  };
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; const row = TR[ko]; const s = (i != null && row && row[i]) || ko; return s.replace(/\{(\d)\}/g, (_, k) => a[+k] ?? ''); };

  function init() {
  const wrap = $('#viewportWrap'), cad = window.__cad;
  if (!wrap || !cad || !cad.THREE || !cad.camera) { setTimeout(init, 200); return; } // the app module may load after this script
  const THREE = cad.THREE, camera = cad.camera, controls = cad.controls, root = cad.root;
  const SIZE = 104; // CSS px
  const style = document.createElement('style');
  style.textContent = '#axesGizmo{position:absolute;right:8px;top:8px;width:' + SIZE + 'px;height:' + SIZE + 'px;z-index:3;cursor:default;border-radius:50%;touch-action:none}'
    + '#axesGizmo:hover{background:color-mix(in srgb,var(--panel) 55%,transparent)}body.sim #axesGizmo{display:none}';
  document.head.appendChild(style);
  const cv = document.createElement('canvas'); cv.id = 'axesGizmo'; cv.setAttribute('role', 'img');
  wrap.appendChild(cv);
  const ctx = cv.getContext('2d');

  const AX = [ // LDraw axes (part coordinates)
    { k: 'X', v: [1, 0, 0], c: '#e5484d' },
    { k: 'Y', v: [0, 1, 0], c: '#2fa84f' },
    { k: 'Z', v: [0, 0, 1], c: '#3b7ddd' },
  ];
  const balls = [];
  for (const a of AX) for (const s of [1, -1]) balls.push({ name: (s < 0 ? '−' : '+') + a.k, label: s > 0 ? a.k : '', neg: s < 0, c: a.c, v: new THREE.Vector3(a.v[0] * s, a.v[1] * s, a.v[2] * s) });
  const qRoot = new THREE.Quaternion(), qCamInv = new THREE.Quaternion(), tmp = new THREE.Vector3();
  let hover = null, last = '', anim = null;

  function layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(SIZE * dpr);
    if (cv.width !== w) { cv.width = w; cv.height = w; last = ''; }
    return dpr;
  }
  function project() {
    root.updateMatrixWorld(); root.getWorldQuaternion(qRoot); qCamInv.copy(camera.quaternion).invert();
    const R = SIZE / 2 - 14;
    for (const b of balls) {
      tmp.copy(b.v).applyQuaternion(qRoot).applyQuaternion(qCamInv); // camera space: x right, y up, z toward viewer
      b.x = SIZE / 2 + tmp.x * R; b.y = SIZE / 2 - tmp.y * R; b.z = tmp.z;
      b.r = b.neg ? 7.5 : 10.5;
    }
  }
  function draw() {
    const dpr = layout(); project();
    const key = balls.map(b => b.x.toFixed(1) + ',' + b.y.toFixed(1)).join(';') + (hover ? hover.name : '') + document.documentElement.lang + document.documentElement.dataset.theme;
    if (key === last) return; last = key;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, SIZE, SIZE);
    const order = balls.slice().sort((a, b) => a.z - b.z); // far first
    const c0 = SIZE / 2;
    for (const b of order) {
      if (!b.neg) { // axis line to the positive ball
        ctx.globalAlpha = b.z < -0.2 ? 0.55 : 1;
        ctx.strokeStyle = b.c; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c0, c0); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const r = b.r * (hover === b ? 1.18 : 1);
      if (b.neg) {
        ctx.fillStyle = b.c + '40'; ctx.strokeStyle = b.c; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.15, b.x, b.y, r); // sphere shading
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.28, b.c); g.addColorStop(1, shade(b.c, 0.55));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui,-apple-system,"Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x, b.y + 0.5);
      }
    }
    ctx.fillStyle = getComputedStyle(cv).color || '#888'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(c0, c0, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = x => Math.round(x * k).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); }
  function hit(ev) {
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    let best = null;
    for (const b of balls.slice().sort((a, c) => c.z - a.z)) if (Math.hypot(x - b.x, y - b.y) <= b.r + 3) { best = b; break; } // front-most first
    return best;
  }
  function viewFrom(b) {
    const dir = b.v.clone().applyQuaternion(qRoot).normalize(); // world direction of that axis
    const target = controls ? controls.target.clone() : new THREE.Vector3();
    const dist = camera.position.distanceTo(target);
    if (Math.abs(dir.y) > 0.999) dir.z += 0.001 * (dir.y > 0 ? 1 : -1), dir.normalize(); // top/bottom: keep orbit controls stable
    const from = camera.position.clone().sub(target).normalize(), to = dir;
    const t0 = performance.now(), D = 320;
    cancelAnimationFrame(anim);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / D), e = 1 - Math.pow(1 - k, 3);
      const v = from.clone().lerp(to, e); if (v.lengthSq() < 1e-6) v.copy(to); v.normalize();
      camera.position.copy(target).addScaledVector(v, dist); camera.lookAt(target);
      if (controls) controls.update();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    step();
  }
  cv.addEventListener('pointermove', ev => { const b = hit(ev); if (b !== hover) { hover = b; cv.style.cursor = b ? 'pointer' : 'default'; cv.title = b ? t('{0} 방향에서 보기', b.name) : t('좌표축 — 위쪽이 −Y · 공을 누르면 그 방향에서 봅니다'); } });
  cv.addEventListener('pointerleave', () => { hover = null; });
  cv.addEventListener('pointerdown', ev => ev.stopPropagation());
  cv.addEventListener('click', ev => { const b = hit(ev); if (b) viewFrom(b); });
  const setLang = () => { cv.title = t('좌표축 — 위쪽이 −Y · 공을 누르면 그 방향에서 봅니다'); cv.setAttribute('aria-label', cv.title); };
  setLang();
  const ls = $('#langSel'); if (ls) ls.addEventListener('change', () => setTimeout(setLang, 0));
  const loop = () => { if (!document.body.classList.contains('sim')) draw(); requestAnimationFrame(loop); };
  loop();
  window.__axes = { balls, viewFrom: name => { project(); const b = balls.find(x => x.name === name); if (b) viewFrom(b); } };
  }
  init();
})();
