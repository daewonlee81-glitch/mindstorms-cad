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
// 첫 로딩이 모두 끝나면 "로딩이 끝났습니다" 팝업을 한 번 띄웁니다 (5초 뒤 저절로 닫힘).
(() => {
  'use strict';
  const TR = {
    '✅ 로딩이 끝났습니다': ['✅ Loading finished', '✅ 読み込みが完了しました', '✅ 加载完成', '✅ Carga completada'],
    '이제 캐드를 사용할 수 있습니다.': ['The CAD is ready to use.', 'CADを使えるようになりました。', '现在可以使用 CAD 了。', 'El CAD ya está listo.'],
    '확인': ['OK', 'OK', '确定', 'Aceptar'],
  };
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const t = ko => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; return (i != null && TR[ko] && TR[ko][i]) || ko; };
  const pageLoaded = new Promise(r => document.readyState === 'complete' ? r() : window.addEventListener('load', () => r(), { once: true }));
  (async () => {
    await pageLoaded;
    for (let i = 0; i < 1200; i++) { const l = document.getElementById('loading'); if (l && l.hidden && window.__cad) break; await new Promise(r => setTimeout(r, 250)); }
    await new Promise(r => setTimeout(r, 700)); // add-ons (blocks, class files, backup) settle
    const box = document.createElement('div'); box.id = 'loadedPop'; box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;left:50%;top:72px;transform:translateX(-50%);z-index:40;background:var(--panel,#fff);color:var(--fg,#111);border:1px solid var(--accent,#2a7);border-radius:10px;padding:12px 16px;box-shadow:0 10px 30px rgba(0,0,0,.22);display:flex;gap:14px;align-items:center;font-size:14px;max-width:calc(100% - 32px)';
    box.innerHTML = '<div><div style="font-weight:700"></div><div style="font-size:12px;opacity:.75;margin-top:2px"></div></div><button class="small primary"></button>';
    box.children[0].children[0].textContent = t('✅ 로딩이 끝났습니다');
    box.children[0].children[1].textContent = t('이제 캐드를 사용할 수 있습니다.');
    const ok = box.querySelector('button'); ok.textContent = t('확인');
    const close = () => { box.style.transition = 'opacity .25s'; box.style.opacity = '0'; setTimeout(() => box.remove(), 260); };
    ok.onclick = close; setTimeout(close, 5000);
    document.body.appendChild(box);
  })();
})();
