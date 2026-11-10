// backup.js — 작업 기록(자동 백업): 작업이 날아가지 않도록 브라우저 안(IndexedDB)에 저장 기록을 남깁니다.
//   · 스텝(페이지)을 추가할 때마다, 5분마다, 새로/열기/수업 도면 열기 직전에 기록을 하나씩 남깁니다 (최근 60개).
//   · 앱의 자동 저장(localStorage)이 용량 부족 등으로 실패해도 IndexedDB에 계속 저장하고, 버튼에 경고를 띄웁니다.
//   · 다시 열었을 때 저장된 작업이 비어 있으면 "이전 작업 복구"를 알려 줍니다.
//   · 다른 탭에서 캐드가 함께 열려 있으면 알려 줍니다 (나중에 저장한 탭이 덮어쓰기 때문).
//   · 🕘 기록 버튼: 저장 기록 목록 → 복구
// app.js를 고치지 않는 덧붙임 스크립트입니다 (app.js 다음에 불러옵니다).
(() => {
  'use strict';
  const KEY = 'mscad.model', MAX = 60, EVERY = 5 * 60 * 1000;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const TR = {
    '🕘 기록': ['🕘 History', '🕘 履歴', '🕘 记录', '🕘 Historial'],
    '작업 기록': ['Work history', '作業履歴', '工作记录', 'Historial de trabajo'],
    '자동 저장됨 {0}': ['Auto-saved {0}', '自動保存 {0}', '已自动保存 {0}', 'Guardado automático {0}'],
    '⚠ 저장 공간 부족': ['⚠ Storage full', '⚠ 保存容量不足', '⚠ 存储空间不足', '⚠ Almacenamiento lleno'],
    '브라우저 저장 공간이 부족해 기본 자동 저장이 실패했습니다. 작업 기록에는 계속 저장되고 있지만, "저장"으로 파일도 꼭 받아 두세요.': ['The browser storage is full, so the normal auto-save failed. Work history keeps saving, but please also use "Save" to keep a file.', 'ブラウザの保存容量が不足し、通常の自動保存に失敗しました。作業履歴には保存され続けますが、「保存」でファイルも残してください。', '浏览器存储空间不足，常规自动保存失败。工作记录仍在保存，但请用"保存"另存文件。', 'El almacenamiento del navegador está lleno y falló el guardado automático. El historial sigue guardando, pero usa también "Guardar" para conservar un archivo.'],
    '스텝을 추가할 때마다, 5분마다, 그리고 새로/열기 직전에 자동으로 남깁니다. 이 컴퓨터의 이 브라우저에만 저장됩니다.': ['Saved automatically every time you add a step, every 5 minutes, and right before New/Open. Kept only in this browser on this computer.', 'ステップを追加するたび、5分ごと、新規・開く直前に自動で残します。このコンピューターのこのブラウザーにだけ保存されます。', '每次添加步骤、每 5 分钟以及新建/打开之前自动保存。仅保存在这台电脑的这个浏览器中。', 'Se guarda al añadir cada paso, cada 5 minutos y justo antes de Nuevo/Abrir. Solo en este navegador de este equipo.'],
    '아직 기록이 없습니다': ['No history yet', 'まだ履歴がありません', '还没有记录', 'Aún no hay historial'],
    '복구': ['Restore', '復元', '恢复', 'Restaurar'],
    '닫기': ['Close', '閉じる', '关闭', 'Cerrar'],
    '지금 기록 남기기': ['Save a point now', '今すぐ記録', '立即保存记录', 'Guardar punto ahora'],
    '스텝 {0} · 부품 {1}': ['{0} steps · {1} parts', 'ステップ {0} · パーツ {1}', '{0} 个步骤 · {1} 个零件', '{0} pasos · {1} piezas'],
    '스텝 추가': ['Step added', 'ステップ追加', '添加步骤', 'Paso añadido'],
    '자동 (5분)': ['Auto (5 min)', '自動 (5分)', '自动 (5 分钟)', 'Auto (5 min)'],
    '새로 만들기 전': ['Before New', '新規の前', '新建之前', 'Antes de Nuevo'],
    '파일 열기 전': ['Before opening a file', 'ファイルを開く前', '打开文件之前', 'Antes de abrir un archivo'],
    '수업 도면 열기 전': ['Before opening a class file', '授業の図面を開く前', '打开课程图纸之前', 'Antes de abrir un archivo de clase'],
    '지난 작업': ['Previous session', '前回の作業', '上次的工作', 'Sesión anterior'],
    '창 닫기 전': ['Before closing', '閉じる前', '关闭之前', 'Antes de cerrar'],
    '직접 남김': ['Saved by you', '手動', '手动', 'Guardado por ti'],
    '복구 전': ['Before restore', '復元の前', '恢复之前', 'Antes de restaurar'],
    '이 기록으로 복구할까요? 지금 작업도 기록에 남겨 두므로 다시 돌아올 수 있습니다.': ['Restore this point? Your current work is saved to history first, so you can come back.', 'この記録に復元しますか？今の作業も履歴に残すので戻れます。', '恢复到此记录吗？当前工作也会先保存到记录中，可以再回来。', '¿Restaurar este punto? Tu trabajo actual se guarda antes en el historial.'],
    '복구하지 못했습니다: 브라우저 저장 공간이 부족합니다. 다른 사이트 데이터를 지우고 다시 시도하세요.': ['Could not restore: the browser storage is full. Clear other site data and try again.', '復元できません：ブラウザの保存容量が不足しています。他のサイトのデータを削除して再試行してください。', '无法恢复：浏览器存储空间不足。请清除其他网站数据后重试。', 'No se pudo restaurar: el almacenamiento está lleno. Borra datos de otros sitios e inténtalo de nuevo.'],
    '이전 작업 "{0}" (스텝 {1} · 부품 {2}, {3})이 남아 있습니다.': ['Your previous work "{0}" ({1} steps · {2} parts, {3}) is still saved.', '前回の作業「{0}」(ステップ {1} · パーツ {2}、{3}) が残っています。', '之前的工作「{0}」({1} 个步骤 · {2} 个零件，{3}) 还在。', 'Tu trabajo anterior "{0}" ({1} pasos · {2} piezas, {3}) sigue guardado.'],
    '이전 작업 복구': ['Restore previous work', '前回の作業を復元', '恢复之前的工作', 'Restaurar trabajo anterior'],
    '다른 탭에서도 캐드가 열려 있습니다. 한 탭에서만 작업하세요 — 나중에 저장한 탭이 앞의 작업을 덮어씁니다.': ['The CAD is also open in another tab. Work in one tab only — the tab that saves last overwrites the other.', '別のタブでもCADが開いています。1つのタブだけで作業してください — 後から保存したタブが上書きします。', 'CAD 也在另一个标签页中打开。请只在一个标签页中工作——最后保存的标签页会覆盖之前的工作。', 'El CAD también está abierto en otra pestaña. Trabaja en una sola: la que guarda al final sobrescribe la otra.'],
    '새 모델을 시작할까요? 지금 작업은 작업 기록(🕘)에 남아 다시 복구할 수 있습니다.': ['Start a new model? Your current work stays in Work history (🕘) and can be restored.', '新しいモデルを始めますか？今の作業は作業履歴(🕘)に残り、復元できます。', '开始新模型吗？当前工作会保留在工作记录(🕘)中，可以恢复。', '¿Empezar un modelo nuevo? Tu trabajo actual queda en el historial (🕘) y puede restaurarse.'],
    '방금': ['just now', 'たった今', '刚刚', 'ahora'],
    '{0}분 전': ['{0} min ago', '{0}分前', '{0} 分钟前', 'hace {0} min'],
    '기록을 남겼습니다': ['Saved a history point', '履歴を残しました', '已保存记录', 'Punto guardado'],
  };
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; const row = TR[ko]; const s = (i != null && row && row[i]) || ko; return s.replace(/\{(\d)\}/g, (_, k) => a[+k] ?? ''); };
  const REASON = { step: '스텝 추가', auto: '자동 (5분)', new: '새로 만들기 전', open: '파일 열기 전', class: '수업 도면 열기 전', session: '지난 작업', hide: '창 닫기 전', manual: '직접 남김', restore: '복구 전' };

  // ---------- IndexedDB ----------
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('mscad-backup', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('versions', { keyPath: 'id', autoIncrement: true }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const x = d.transaction(store, mode), s = x.objectStore(store); let out; Promise.resolve(fn(s)).then(v => { out = v; }); x.oncomplete = () => res(out); x.onerror = () => rej(x.error); }); };
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const kvGet = k => tx('kv', 'readonly', s => req(s.get(k)));
  const kvSet = (k, v) => tx('kv', 'readwrite', s => { s.put(v, k); });
  const listVersions = () => tx('versions', 'readonly', s => req(s.getAll()));

  // ---------- snapshot info ----------
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; };
  const info = s => { try { const m = JSON.parse(s).model || {}; return { name: m.name || '', steps: (m.steps || []).length, parts: (m.parts || []).length }; } catch (e) { return null; } };
  const isEmpty = i => !i || (i.parts === 0 && i.steps <= 1);

  let cur = null;           // { data, t, hash, ...info } latest snapshot seen
  let lastVerHash = '', lastVerAt = 0, lsFailed = false, lastSteps = null, ready;
  async function addVersion(reason, snap = cur) {
    if (!snap || !snap.data || isEmpty(snap)) return false;
    if (snap.hash === lastVerHash) return false;
    lastVerHash = snap.hash; lastVerAt = Date.now();
    await tx('versions', 'readwrite', async s => {
      s.add({ t: Date.now(), reason, name: snap.name, steps: snap.steps, parts: snap.parts, hash: snap.hash, data: snap.data });
      const keys = await req(s.getAllKeys());
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) s.delete(k);
    });
    return true;
  }
  let curTimer = 0;
  function record(data) {
    const i = info(data); if (!i) return;
    const snap = { data, t: Date.now(), hash: hash(data), ...i };
    const prevSteps = lastSteps; lastSteps = i.steps; cur = snap;
    clearTimeout(curTimer); curTimer = setTimeout(() => ready.then(() => kvSet('current', cur)).catch(() => { }), 150);
    if (prevSteps != null && i.steps > prevSteps) ready.then(() => addVersion('step')).catch(() => { });
    paint();
  }

  // ---------- hook the app's auto-save ----------
  const origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (this === window.localStorage && k === KEY) {
      try { origSet.call(this, k, v); if (lsFailed) { lsFailed = false; paint(); } }
      catch (e) { if (!lsFailed) { lsFailed = true; paint(); status(t('브라우저 저장 공간이 부족해 기본 자동 저장이 실패했습니다. 작업 기록에는 계속 저장되고 있지만, "저장"으로 파일도 꼭 받아 두세요.')); } }
      try { record(String(v)); } catch (e) { }
      return;
    }
    return origSet.call(this, k, v);
  };
  const status = s => { const e = $('#status'); if (e) e.textContent = s; };

  // keep the previous session's work as a version before this session can overwrite it
  let bootPrev = null, bootLsHash = '';
  ready = (async () => {
    try {
      const c = await kvGet('current');
      const vs = await listVersions(); if (vs.length) { lastVerHash = vs[vs.length - 1].hash; lastVerAt = vs[vs.length - 1].t; }
      if (c && c.data) { bootPrev = c; await addVersion('session', c); }
      let ls = null; try { ls = localStorage.getItem(KEY); } catch (e) { }
      bootLsHash = ls ? hash(ls) : '';
      if (ls && !cur) { const i = info(ls); if (i) { cur = { data: ls, t: c && c.hash === hash(ls) ? c.t : Date.now(), hash: hash(ls), ...i }; lastSteps = i.steps; } }
    } catch (e) { console.warn('backup: IndexedDB unavailable', e); }
  })();

  // ---------- versions before destructive actions ----------
  const snapNow = () => { let ls = null; try { ls = localStorage.getItem(KEY); } catch (e) { } if (ls) { const i = info(ls); if (i) return { data: ls, t: Date.now(), hash: hash(ls), ...i }; } return cur; };
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('button'); if (!b) return;
    if (b.id === 'btnNew') {
      const s = snapNow();
      if (s && !isEmpty(s) && !confirm(t('새 모델을 시작할까요? 지금 작업은 작업 기록(🕘)에 남아 다시 복구할 수 있습니다.'))) { ev.stopImmediatePropagation(); ev.preventDefault(); return; }
      addVersion('new', s);
    } else if (b.dataset && b.dataset.open && b.closest('#clsList')) addVersion('class', snapNow());
  }, true);
  document.addEventListener('change', ev => { if (ev.target && ev.target.id === 'fileIn') addVersion('open', snapNow()); }, true);
  setInterval(() => { if (cur && cur.hash !== lastVerHash && Date.now() - lastVerAt >= EVERY) addVersion('auto'); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cur) { kvSet('current', cur).catch(() => { }); if (Date.now() - lastVerAt > 60000) addVersion('hide'); } });

  // ---------- other tabs ----------
  let otherTab = false;
  try {
    const bc = new BroadcastChannel('mscad-tabs'), me = Math.random().toString(36).slice(2);
    bc.onmessage = e => { if (e.data && e.data.id !== me) { if (e.data.t === 'hello') bc.postMessage({ t: 'here', id: me }); if (!otherTab) { otherTab = true; paint(); status(t('다른 탭에서도 캐드가 열려 있습니다. 한 탭에서만 작업하세요 — 나중에 저장한 탭이 앞의 작업을 덮어씁니다.')); } } };
    bc.postMessage({ t: 'hello', id: me });
  } catch (e) { }

  // ---------- UI ----------
  const style = document.createElement('style');
  style.textContent = '#btnHist.warn{background:#c62828;color:#fff;border-color:#c62828}#histList .h-r{display:flex;gap:8px;align-items:center;padding:7px 10px;border-top:1px solid var(--line)}#histList .h-r:first-child{border-top:0}#histList .h-m{flex:1;min-width:0}#histList .h-n{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#histList .h-s{font-size:12px;color:var(--muted)}#histBar{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:5;background:var(--panel);border:1px solid var(--accent);border-radius:8px;padding:8px 12px;display:flex;gap:8px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:min(92%,640px);font-size:13px}';
  document.head.appendChild(style);
  const btn = document.createElement('button'); btn.id = 'btnHist';
  const save = $('#btnSave'); (save || $('#btnNew')).after(btn);
  const dlg = document.createElement('div'); dlg.id = 'histDlg'; dlg.hidden = true;
  dlg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center;z-index:20;padding:16px';
  dlg.innerHTML = '<div role="dialog" style="background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;gap:8px">'
    + '<div style="display:flex;gap:6px;align-items:center"><strong id="histTitle" style="flex:1"></strong><button class="small" id="histNow"></button><button class="small" id="histClose"></button></div>'
    + '<div id="histNote" style="font-size:12px;color:var(--muted)"></div><div id="histList" style="overflow:auto;min-height:120px;max-height:60vh;border:1px solid var(--line);border-radius:6px"></div></div>';
  document.body.appendChild(dlg);
  const ago = ms => { const m = Math.floor((Date.now() - ms) / 60000); return m < 1 ? t('방금') : m < 60 ? t('{0}분 전', m) : new Date(ms).toLocaleString(); };
  const hhmm = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function paint() {
    btn.textContent = lsFailed ? t('⚠ 저장 공간 부족') : t('🕘 기록');
    btn.classList.toggle('warn', lsFailed);
    btn.title = lsFailed ? t('브라우저 저장 공간이 부족해 기본 자동 저장이 실패했습니다. 작업 기록에는 계속 저장되고 있지만, "저장"으로 파일도 꼭 받아 두세요.') : (cur ? t('자동 저장됨 {0}', hhmm(cur.t)) : t('작업 기록'));
  }
  async function renderList() {
    $('#histTitle').textContent = t('작업 기록'); $('#histNow').textContent = t('지금 기록 남기기'); $('#histClose').textContent = t('닫기');
    $('#histNote').textContent = t('스텝을 추가할 때마다, 5분마다, 그리고 새로/열기 직전에 자동으로 남깁니다. 이 컴퓨터의 이 브라우저에만 저장됩니다.');
    let vs = []; try { vs = (await listVersions()).reverse(); } catch (e) { }
    $('#histList').innerHTML = vs.length ? vs.map(v => `<div class="h-r"><div class="h-m"><div class="h-n">${esc(v.name || '—')}</div><div class="h-s">${esc(new Date(v.t).toLocaleString())} · ${esc(ago(v.t))} · ${esc(t(REASON[v.reason] || v.reason))} · ${esc(t('스텝 {0} · 부품 {1}', v.steps, v.parts))}</div></div><button class="small primary" data-id="${v.id}">${esc(t('복구'))}</button></div>`).join('')
      : `<div style="padding:14px;color:var(--muted)">${esc(t('아직 기록이 없습니다'))}</div>`;
  }
  async function restoreData(data) {
    await addVersion('restore', snapNow());
    try { origSet.call(localStorage, KEY, data); }
    catch (e) { alert(t('복구하지 못했습니다: 브라우저 저장 공간이 부족합니다. 다른 사이트 데이터를 지우고 다시 시도하세요.')); return; }
    try { await kvSet('current', { data, t: Date.now(), hash: hash(data), ...info(data) }); } catch (e) { }
    const u = new URL(location.href); u.searchParams.delete('class'); location.replace(u.toString());
  }
  btn.onclick = () => { dlg.hidden = false; renderList(); };
  $('#histClose').onclick = () => { dlg.hidden = true; };
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.hidden = true; });
  $('#histNow').onclick = async () => { const s = snapNow(); if (s) { cur = s; lastVerHash = ''; } if (await addVersion('manual', s)) status(t('기록을 남겼습니다')); renderList(); };
  $('#histList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    if (!confirm(t('이 기록으로 복구할까요? 지금 작업도 기록에 남겨 두므로 다시 돌아올 수 있습니다.'))) return;
    const v = (await listVersions()).find(x => x.id === +b.dataset.id); if (v) restoreData(v.data);
  });
  const ls = $('#langSel'); if (ls) ls.addEventListener('change', () => setTimeout(() => { paint(); if (!dlg.hidden) renderList(); }, 0));
  paint();

  // ---------- after the app has loaded: offer to restore if the saved work did not come back ----------
  (async () => {
    for (let i = 0; i < 600; i++) { const l = $('#loading'); if (l && l.hidden && window.__cad) break; await new Promise(r => setTimeout(r, 250)); }
    await ready; await new Promise(r => setTimeout(r, 1200));
    const m = window.__cad && window.__cad.model;
    const now = m ? { parts: (m.parts || []).length, steps: (m.steps || []).length } : null;
    // the last thing this browser saved did not come back: the page started empty, or the normal auto-save had failed (storage full / another tab)
    if (!bootPrev || isEmpty(bootPrev) || !now || !(isEmpty(now) || (bootLsHash && bootPrev.hash !== bootLsHash && (bootPrev.steps > now.steps || bootPrev.parts > now.parts)))) return;
    if (new URLSearchParams(location.search).get('class')) return; // a class file link replaced it on purpose
    const bar = document.createElement('div'); bar.id = 'histBar';
    bar.innerHTML = `<span style="flex:1">${esc(t('이전 작업 "{0}" (스텝 {1} · 부품 {2}, {3})이 남아 있습니다.', bootPrev.name || '—', bootPrev.steps, bootPrev.parts, ago(bootPrev.t)))}</span><button class="small primary" id="histBarGo">${esc(t('이전 작업 복구'))}</button><button class="small" id="histBarX">✕</button>`;
    ($('#viewportWrap') || document.body).appendChild(bar);
    $('#histBarGo').onclick = () => restoreData(bootPrev.data);
    $('#histBarX').onclick = () => bar.remove();
  })();
  window.__backup = { listVersions, addVersion: r => addVersion(r || 'manual', snapNow()), get current() { return cur; } };
})();
