// fixes.js — 작은 화면 고침 모음 (app.js를 고치지 않는 덧붙임 스크립트, app.js 다음에 불러옵니다)
//   · 파일 끌어 놓기 안내(점선 테두리 + 푸른 화면)가 끌기가 끝난 뒤에도 남아 있는 문제:
//     끌기 중에는 dragover가 계속 오므로, 0.4초 동안 오지 않거나 놓기/끌기 끝/마우스 움직임/클릭/Esc/창 전환이 있으면 숨깁니다.
(() => {
  'use strict';
  const hint = document.getElementById('dropHint'); if (!hint) return;
  let lastOver = 0, timer = 0;
  const hide = () => { if (!hint.hidden) hint.hidden = true; clearInterval(timer); timer = 0; };
  const watch = () => { if (timer) return; timer = setInterval(() => { if (Date.now() - lastOver > 400) hide(); }, 150); };
  window.addEventListener('dragenter', () => { lastOver = Date.now(); setTimeout(() => { if (!hint.hidden) watch(); }, 0); }, true);
  window.addEventListener('dragover', () => { lastOver = Date.now(); if (!hint.hidden) watch(); }, true);
  for (const ev of ['drop', 'dragend']) window.addEventListener(ev, () => setTimeout(hide, 0), true);
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'blur']) window.addEventListener(ev, e => { if (ev === 'keydown' && e.key !== 'Escape' && !hint.hidden && Date.now() - lastOver < 400) return; if (!hint.hidden) hide(); }, true);
  document.addEventListener('visibilitychange', hide);
})();
