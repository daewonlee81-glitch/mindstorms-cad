// simsplit.js — 시뮬레이터 창 크기 조절 (app.js 다음에 불러옵니다)
//   · 워드블록 창과 시뮬레이터 화면 사이, 시뮬레이터 화면과 오른쪽(허브·포트) 창 사이의 경계를 끌어 너비를 바꿉니다.
//   · 좁은 화면(900px 이하, 위아래 배치)에서는 워드블록 창과 화면 사이 경계를 위아래로 끕니다.
//   · 경계를 두 번 누르면 처음 크기로 돌아갑니다. 크기는 이 브라우저에 기억됩니다 (localStorage mscad.simsplit).
(() => {
  'use strict';
  const main = document.querySelector('main'), left = document.getElementById('simLeft'), mid = document.getElementById('viewportWrap'), right = document.getElementById('simRight');
  if (!main || !left || !mid) return;
  const KEY = 'mscad.simsplit', MINL = 220, MINM = 260, MINR = 200;
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
  const css = document.createElement('style');
  css.textContent = `body.sim main{grid-template-columns:var(--simL,minmax(360px,44%)) 1fr var(--simR,290px)}
.simsplit{display:none;position:absolute;z-index:6;touch-action:none}
body.sim .simsplit{display:block}
.simsplit::after{content:"";position:absolute;inset:0;margin:auto;background:var(--line,#d5dbe2);border-radius:3px;transition:background .12s}
.simsplit:hover::after,.simsplit.drag::after{background:var(--accent,#2f7fb8)}
.simsplit.v{top:0;bottom:0;width:10px;cursor:col-resize}.simsplit.v::after{width:4px;height:44px}
.simsplit.v.l{left:0}.simsplit.v.r{right:0}
body.sim .simsplit.h{display:none}.simsplit.h{left:0;right:0;top:0;height:10px;cursor:row-resize}.simsplit.h::after{width:44px;height:4px}
body.simsplitting{user-select:none;cursor:col-resize}body.simsplitting.h{cursor:row-resize}
@media (max-width:900px){body.sim main{grid-template-columns:1fr;grid-template-rows:var(--simT,50%) 1fr}body.sim .simsplit.v{display:none}body.sim .simsplit.h{display:block}}`;
  document.head.appendChild(css);
  const apply = () => {
    const W = main.clientWidth, H = main.clientHeight;
    // 가운데 화면이 MINM 보다 좁아지지 않게 (오른쪽 창 너비를 먼저 정하고 왼쪽을 맞춤)
    const r = right ? Math.max(MINR, Math.min(st.r || 290, W - MINL - MINM)) : 0;
    if (st.r) { st.r = r; main.style.setProperty('--simR', r + 'px'); } else main.style.removeProperty('--simR');
    if (st.l) { st.l = Math.max(MINL, Math.min(st.l, W - r - MINM)); main.style.setProperty('--simL', st.l + 'px'); } else main.style.removeProperty('--simL');
    if (st.t) main.style.setProperty('--simT', Math.max(120, Math.min(st.t, H - 160)) + 'px'); else main.style.removeProperty('--simT');
  };
  // 화면(3D)은 #viewportWrap 의 ResizeObserver 가 맞추고, 블록 창은 여기서 맞춥니다
  const refit = () => { try { const B = window.Blockly, ws = window.__wb && window.__wb.ws && window.__wb.ws(); if (B && ws) B.svgResize(ws); } catch (e) { } };
  const handle = (cls, key, title) => {
    const h = document.createElement('div'); h.className = 'simsplit ' + cls; h.title = title; mid.appendChild(h);
    h.addEventListener('pointerdown', e => {
      e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add('drag'); document.body.classList.add('simsplitting'); if (key === 't') document.body.classList.add('h');
      const mr = main.getBoundingClientRect();
      const move = ev => {
        if (key === 'l') st.l = Math.round(ev.clientX - mr.left);
        else if (key === 'r') st.r = Math.round(mr.right - ev.clientX);
        else st.t = Math.round(ev.clientY - mr.top);
        apply(); refit();
      };
      const up = () => { h.removeEventListener('pointermove', move); h.classList.remove('drag'); document.body.classList.remove('simsplitting', 'h'); save(); refit(); setTimeout(refit, 80); };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up, { once: true }); h.addEventListener('pointercancel', up, { once: true });
    });
    h.addEventListener('dblclick', () => { delete st[key]; save(); apply(); refit(); setTimeout(refit, 80); });
  };
  const ko = (document.documentElement.lang || 'ko').startsWith('ko'), tip = ko ? '끌어서 창 크기 조절 · 두 번 눌러 처음 크기로' : 'Drag to resize · double-click to reset';
  handle('v l', 'l', tip); if (right) handle('v r', 'r', tip); handle('h', 't', tip);
  apply(); window.addEventListener('resize', apply);
  new MutationObserver(() => { apply(); setTimeout(refit, 80); }).observe(document.body, { attributes: true, attributeFilter: ['class'] }); // 시뮬레이터에 들어올 때 다시 맞춤
  window.__simSplit = { get: () => ({ ...st }), set: o => { st = { ...st, ...o }; save(); apply(); refit(); }, reset: () => { st = {}; save(); apply(); refit(); } };
})();
