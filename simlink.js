// simlink.js — 시뮬레이터 바로 가기 링크 (othelloai.js 다음에 불러옵니다)
//   index.html?sim=<경기장 키>  → 앱이 준비되면 시뮬레이터를 열고 그 경기장을 고릅니다.
//   예: ?sim=othello_v2 (로봇 배틀 오셀로 V2), ?sim=othello_ai, ?sim=sumo
//   ?mat= 도 같은 뜻으로 받습니다. 없는 경기장 키면 아무것도 하지 않습니다.
(() => {
  'use strict';
  const q = new URLSearchParams(location.search);
  const key = (q.get('sim') || q.get('mat') || '').trim();
  if (!key || !/^[a-z0-9_]+$/i.test(key)) return;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  (async () => {
    // 부품 라이브러리·블록 편집기·경기장 목록이 준비될 때까지 기다림 (최대 약 2분)
    let sel = null;
    for (let i = 0; i < 480; i++) {
      const l = document.querySelector('#loading');
      sel = document.querySelector('#simMat');
      if (l && l.hidden && window.__cad && window.__wb && window.__umc && window.Blockly && sel && sel.querySelector(`option[value="${key}"]`)) break;
      await sleep(250);
    }
    if (!sel || !sel.querySelector(`option[value="${key}"]`) || !window.__wb) return;
    await sleep(300); // 자동 저장 모델·수업 도면 열기가 먼저 끝나도록
    if (!window.__wb.simOn()) window.__wb.enterSim();
    await sleep(200);
    if (sel.value !== key) { sel.value = key; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    window.__simLink = { key, done: true };
  })();
})();
