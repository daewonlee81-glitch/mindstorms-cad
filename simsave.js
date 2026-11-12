// simsave.js — 시뮬레이터 "💾 코드 저장" · "📂 코드 열기" 버튼 (app.js 다음에 불러옵니다)
//   · 저장: 지금 블록 프로그램을 파일로 내려받습니다.
//       블록 (.json) — 나중에 "코드 열기"로 다시 불러옴 / 파이썬 (.py) — Pybricks 코드
//   · 열기: 저장한 .json 을 불러와 지금 블록을 바꿉니다 (Ctrl+Z 로 되돌리기).
//   · 블록 프로그램은 CAD "저장"(.ldr)에도 함께 들어갑니다. 이 버튼은 코드만 따로 주고받을 때 씁니다.
(() => {
  'use strict';
  const WB = window.__wb, C = window.__cad; if (!WB || !WB.ws) return;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '💾 코드 저장': ['💾 Save code', '💾 コード保存', '💾 保存代码', '💾 Guardar código'],
    '📂 코드 열기': ['📂 Open code', '📂 コードを開く', '📂 打开代码', '📂 Abrir código'],
    '블록 (.json) — 다시 열기용': ['Blocks (.json) — to open again', 'ブロック (.json) — 再び開く用', '积木 (.json) — 以后再打开', 'Bloques (.json) — para abrir de nuevo'],
    '파이썬 (.py) — Pybricks': ['Python (.py) — Pybricks', 'Python (.py) — Pybricks', 'Python (.py) — Pybricks', 'Python (.py) — Pybricks'],
    '블록 프로그램을 파일로 저장합니다': ['Save the block program as a file', 'ブロックプログラムをファイルに保存します', '把积木程序保存为文件', 'Guarda el programa de bloques en un archivo'],
    '저장한 블록 프로그램(.json)을 불러옵니다': ['Open a saved block program (.json)', '保存したブロックプログラム(.json)を開きます', '打开已保存的积木程序 (.json)', 'Abre un programa de bloques guardado (.json)'],
    '{0} 저장됨': ['{0} saved', '{0} を保存しました', '已保存 {0}', '{0} guardado'],
    '{0} 불러옴 (Ctrl+Z 로 되돌리기)': ['Opened {0} (Ctrl+Z to undo)', '{0} を開きました (Ctrl+Z で元に戻す)', '已打开 {0}（Ctrl+Z 撤销）', '{0} abierto (Ctrl+Z para deshacer)'],
    '지금 블록을 불러온 프로그램으로 바꿀까요?': ['Replace the current blocks with the opened program?', '今のブロックを開いたプログラムに置き換えますか?', '用打开的程序替换当前积木吗？', '¿Reemplazar los bloques actuales por el programa abierto?'],
    '블록 프로그램 파일이 아닙니다': ['This is not a block program file', 'ブロックプログラムのファイルではありません', '这不是积木程序文件', 'No es un archivo de programa de bloques'],
    '실행 중에는 열 수 없습니다': ['Cannot open while the program runs', '実行中は開けません', '运行时无法打开', 'No se puede abrir mientras se ejecuta'],
    '파이썬으로 바꿀 수 없습니다': ['Could not convert to Python', 'Python に変換できません', '无法转换为 Python', 'No se pudo convertir a Python'],
    '코드': ['code', 'コード', '代码', 'codigo'],
  };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.replace('{' + k + '}', v); }); return s; };
  const status = m => { try { (C && C.ext && C.ext.status) ? C.ext.status(m) : console.log(m); } catch (e) {} };
  const B = () => window.Blockly;
  const name = () => (((C && C.model && C.model.name) || 'program').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 60) || 'program');
  const download = (data, fn, type) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = fn;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status(t('{0} 저장됨', fn));
  };
  const running = () => { try { return !!(C && C.ext && C.ext.simRunning); } catch (e) { return false; } };

  const saveJson = () => {
    const ws = WB.ws(); if (!ws) return;
    const prog = B().serialization.workspaces.save(ws);
    const out = { format: 'robomakers-blocks', version: 1, name: name(), saved: new Date().toISOString(), program: prog, sim: (C && C.model && C.model.sim) || undefined };
    download(JSON.stringify(out, null, 1), `${name()}-blocks.json`, 'application/json');
  };
  const savePy = () => {
    const ws = WB.ws(); if (!ws) return;
    let py = '';
    try { py = WB.wbGenPython ? WB.wbGenPython(ws) : ''; if (py && typeof py === 'object') py = py.main || py.code || Object.values(py)[0] || ''; } catch (e) { py = ''; }
    if (!py) { status(t('파이썬으로 바꿀 수 없습니다')); return; }
    download(String(py), `${name()}.py`, 'text/x-python');
  };
  const openFile = async f => {
    if (running()) { status(t('실행 중에는 열 수 없습니다')); return; }
    let d; try { d = JSON.parse(await f.text()); } catch (e) { status(t('블록 프로그램 파일이 아닙니다')); return; }
    const prog = d && d.program && d.program.blocks ? d.program : (d && d.blocks ? d : null);
    if (!prog) { status(t('블록 프로그램 파일이 아닙니다')); return; }
    const ws = WB.ws(); if (!ws) return;
    if (ws.getAllBlocks(false).length && !window.confirm(t('지금 블록을 불러온 프로그램으로 바꿀까요?'))) return;
    const Bl = B(); Bl.Events.setGroup(true);
    try { ws.clear(); Bl.serialization.workspaces.load(prog, ws, { recordUndo: true }); } finally { Bl.Events.setGroup(false); }
    try { ws.scrollCenter(); } catch (e) {}
    status(t('{0} 불러옴 (Ctrl+Z 로 되돌리기)', f.name));
  };

  const css = document.createElement('style');
  css.textContent = `#simCodeMenu{position:absolute;z-index:40;background:var(--panel,#fff);color:var(--fg,#1c2530);border:1px solid var(--line,#d5dbe2);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:4px;display:flex;flex-direction:column;min-width:200px}
#simCodeMenu button{text-align:left;border:0;background:none;padding:7px 10px;border-radius:6px;font:inherit;color:inherit;cursor:pointer}#simCodeMenu button:hover{background:var(--accent-soft,#dcedf5)}`;
  document.head.appendChild(css);
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.hidden = true; document.body.appendChild(inp);
  inp.onchange = () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) openFile(f); };
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  const showMenu = btn => {
    if (menu) { closeMenu(); return; }
    menu = document.createElement('div'); menu.id = 'simCodeMenu';
    const item = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { closeMenu(); fn(); }; menu.appendChild(b); };
    item(t('블록 (.json) — 다시 열기용'), saveJson);
    item(t('파이썬 (.py) — Pybricks'), savePy);
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(window.innerWidth - menu.offsetWidth - 8, r.left)) + 'px';
    menu.style.top = (r.bottom + 4 + window.scrollY) + 'px';
  };
  document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target) && e.target.id !== 'btnSimSave') closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const label = () => {
    const s = document.getElementById('btnSimSave'), o = document.getElementById('btnSimOpen');
    if (s) { s.textContent = t('💾 코드 저장'); s.title = t('블록 프로그램을 파일로 저장합니다'); }
    if (o) { o.textContent = t('📂 코드 열기'); o.title = t('저장한 블록 프로그램(.json)을 불러옵니다'); }
  };
  const mount = () => {
    if (document.getElementById('btnSimSave')) return true;
    const ph = document.getElementById('simPhys'); if (!ph) return false;
    const s = document.createElement('button'); s.className = 'small'; s.id = 'btnSimSave'; s.type = 'button'; s.onclick = () => showMenu(s);
    const o = document.createElement('button'); o.className = 'small'; o.id = 'btnSimOpen'; o.type = 'button'; o.onclick = () => inp.click();
    ph.after(s, o); label(); return true;
  };
  if (!mount()) { const iv = setInterval(() => { if (mount()) clearInterval(iv); }, 500); }
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.__simCode = { saveJson, savePy, openFile };
})();
