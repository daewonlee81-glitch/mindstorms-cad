// classes.js — 수업 도면: 선생님이 저장소 classes/ 폴더에 올린 도면을 학생이 받아 엽니다.
//   · 📥 수업 도면 버튼: 반(폴더)별 목록 · 검색 · 열기 · 학생용 링크(🔗) 복사
//   · ?class=<반/파일.ldr> 링크로 열면 그 도면이 바로 열립니다 (GitHub API를 쓰지 않음)
//   · 선생님: 모델 저장 → 반 이름 → GitHub 업로드 페이지 열기
// app.js를 고치지 않는 덧붙임 스크립트입니다 (app.js 다음에 불러옵니다).
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const TR = {
  "파일을 열 수 없습니다: {0}": ["Could not open the file: {0}", "ファイルを開けません: {0}", "无法打开文件: {0}", "No se pudo abrir el archivo: {0}"],
  "📥 수업 도면": ["📥 Class files", "📥 授業の図面", "📥 课程图纸", "📥 Archivos de clase"],
  "수업 도면": ["Class files", "授業の図面", "课程图纸", "Archivos de clase"],
  "선생님이 올린 도면 받기": ["Get files your teacher uploaded", "先生がアップロードした図面を受け取る", "获取老师上传的图纸", "Recibir archivos subidos por el profesor"],
  "수업 도면 받는 중… {0}": ["Downloading class file… {0}", "授業の図面を受信中… {0}", "正在下载课程图纸… {0}", "Descargando archivo de clase… {0}"],
  "수업 도면을 찾을 수 없습니다: {0}": ["Class file not found: {0}", "授業の図面が見つかりません: {0}", "找不到课程图纸: {0}", "No se encontró el archivo de clase: {0}"],
  "수업 도면 \"{0}\"을(를) 열었습니다 · 되돌리려면 ↶": ["Opened class file \"{0}\" · press ↶ to go back", "授業の図面「{0}」を開きました · 戻すには ↶", "已打开课程图纸「{0}」· 按 ↶ 撤销", "Archivo de clase \"{0}\" abierto · pulsa ↶ para volver"],
  "아직 올라온 수업 도면이 없습니다": ["No class files have been uploaded yet", "まだ授業の図面がありません", "还没有上传的课程图纸", "Aún no hay archivos de clase"],
  "검색 결과가 없습니다": ["No matches", "該当なし", "没有匹配结果", "Sin resultados"],
  "공통": ["General", "共通", "通用", "General"],
  "학생에게 보낼 링크 복사": ["Copy a link to send to students", "生徒に送るリンクをコピー", "复制发给学生的链接", "Copiar enlace para los alumnos"],
  "열기": ["Open", "開く", "打开", "Abrir"],
  "목록 불러오는 중…": ["Loading list…", "一覧を読み込み中…", "正在加载列表…", "Cargando lista…"],
  "GitHub 조회 한도를 넘었습니다. {0}분 뒤에 다시 시도하세요": ["GitHub lookup limit reached. Try again in {0} min", "GitHubの照会上限に達しました。{0}分後に再試行してください", "已达到 GitHub 查询上限，请 {0} 分钟后重试", "Límite de consultas de GitHub alcanzado. Reintenta en {0} min"],
  "지난번 목록을 보여 줍니다": ["showing the previous list", "前回の一覧を表示します", "显示上次的列表", "se muestra la lista anterior"],
  "목록을 불러오지 못했습니다 (인터넷 연결을 확인하세요)": ["Could not load the list (check the internet connection)", "一覧を読み込めませんでした（インターネット接続を確認してください）", "无法加载列表（请检查网络连接）", "No se pudo cargar la lista (revisa la conexión)"],
  "링크를 복사했습니다. 학생에게 보내면 이 도면이 바로 열립니다": ["Link copied. Students who open it get this file straight away", "リンクをコピーしました。生徒が開くとこの図面がすぐ開きます", "链接已复制。学生打开后会直接打开此图纸", "Enlace copiado. Al abrirlo, el alumno recibe este archivo directamente"],
  "이 링크를 복사하세요": ["Copy this link", "このリンクをコピーしてください", "请复制此链接", "Copia este enlace"],
  "검색": ["Search", "検索", "搜索", "Buscar"],
  "새로고침": ["Refresh", "更新", "刷新", "Actualizar"],
  "닫기": ["Close", "閉じる", "关闭", "Cerrar"],
  "선생님: 도면 올리기": ["Teachers: upload a file", "先生用：図面をアップロード", "老师：上传图纸", "Profesores: subir un archivo"],
  "① 지금 모델을 .ldr로 저장 (블록 프로그램·시뮬레이터 설정 포함)": ["① Save the current model as .ldr (includes block program and simulator settings)", "① 今のモデルを .ldr で保存（ブロックプログラム・シミュレーター設定を含む）", "① 将当前模型保存为 .ldr（包含积木程序和仿真设置）", "① Guarda el modelo actual como .ldr (incluye el programa de bloques y la configuración del simulador)"],
  "② 반 이름 (폴더)": ["② Class name (folder)", "② クラス名（フォルダー）", "② 班级名称（文件夹）", "② Nombre de la clase (carpeta)"],
  "예: 월수 3시반": ["e.g. Mon-Wed 3pm", "例：月水 15時クラス", "例如：周一三 下午3点班", "p. ej. Lun-Mié 15 h"],
  "③ GitHub에 로그인해 파일을 끌어 놓고 Commit changes": ["③ Sign in to GitHub, drop the file and press Commit changes", "③ GitHubにログインし、ファイルをドロップして Commit changes", "③ 登录 GitHub，拖入文件并点击 Commit changes", "③ Inicia sesión en GitHub, suelta el archivo y pulsa Commit changes"],
  "모델 저장": ["Save model", "モデルを保存", "保存模型", "Guardar modelo"],
  "GitHub 업로드 열기": ["Open GitHub upload", "GitHubアップロードを開く", "打开 GitHub 上传", "Abrir subida en GitHub"],
  "올릴 위치": ["Upload to", "アップロード先", "上传位置", "Se sube a"],
  "올린 뒤 1~2분 안에 목록에 나타납니다. 올리려면 저장소 공동작업자(Collaborator) 권한이 필요합니다.": ["It appears in the list within 1–2 minutes. Uploading needs collaborator access to the repository.", "アップロード後1〜2分で一覧に表示されます。アップロードにはリポジトリのコラボレーター権限が必要です。", "上传后 1–2 分钟内出现在列表中。上传需要仓库协作者权限。", "Aparece en la lista en 1–2 minutos. Para subir se necesita acceso de colaborador al repositorio."],
};
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; const row = TR[ko]; const s = (i != null && row && row[i]) || ko; return s.replace(/\{(\d)\}/g, (_, k) => a[+k] ?? ''); };
  const status = s => { const e = $('#status'); if (e) e.textContent = s; };
  // Open a File through the app's own "열기" input, then wait until the model has been replaced.
  async function clsOpenFile(file) {
    const inp = $('#fileIn'), cad = window.__cad, before = cad && cad.model;
    const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    for (let i = 0; i < 150 && cad && cad.model === before; i++) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 600)); // let the app finish its own status line
    if (cad && cad.model === before) throw new Error(t('파일을 열 수 없습니다: {0}', file.name));
  }
  // ---------- UI ----------
  const style = document.createElement('style'); style.textContent = '#clsList .cls-g{padding:6px 10px;font-size:12px;font-weight:700;color:var(--muted);background:var(--panel2);position:sticky;top:0}#clsList .cls-f{display:flex;gap:6px;align-items:center;padding:6px 10px;border-top:1px solid var(--line)}#clsList .cls-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'; document.head.appendChild(style);
  const exp = $('#btnExport');
  const btn = document.createElement('button'); btn.id = 'btnClass'; btn.dataset.k = '📥 수업 도면'; btn.dataset.kTitle = '선생님이 올린 도면 받기';
  exp.after(btn);
  const wrap = document.createElement('div'); wrap.innerHTML = '<div id="clsDlg" hidden style="position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center;z-index:20;padding:16px">\n  <div role="dialog" aria-label="수업 도면" style="background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;gap:8px">\n    <div class="row" style="display:flex;gap:6px;align-items:center"><strong style="flex:1">📥 수업 도면</strong><button class="small" id="clsRefresh">새로고침</button><button class="small" id="clsClose">닫기</button></div>\n    <input id="clsQ" type="search" placeholder="검색" aria-label="검색">\n    <div id="clsList" style="overflow:auto;min-height:120px;max-height:46vh;border:1px solid var(--line);border-radius:6px"></div>\n    <div id="clsMsg" style="min-height:1.2em;font-size:12px;color:var(--muted)"></div>\n    <details id="clsTeach"><summary style="cursor:pointer;font-weight:600">선생님: 도면 올리기</summary>\n      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;font-size:13px">\n        <div class="row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="flex:1">① 지금 모델을 .ldr로 저장 (블록 프로그램·시뮬레이터 설정 포함)</span><button class="small" id="clsSave">모델 저장</button></div>\n        <label style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span>② 반 이름 (폴더)</span><input id="clsGroup" type="text" placeholder="예: 월수 3시반" style="flex:1;min-width:140px"></label>\n        <div style="font-size:12px;color:var(--muted)"><span>올릴 위치</span>: <span class="num" id="clsPath"></span></div>\n        <div class="row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="flex:1">③ GitHub에 로그인해 파일을 끌어 놓고 Commit changes</span><button class="small primary" id="clsUpload">GitHub 업로드 열기</button></div>\n        <div style="font-size:12px;color:var(--muted)">올린 뒤 1~2분 안에 목록에 나타납니다. 올리려면 저장소 공동작업자(Collaborator) 권한이 필요합니다.</div>\n      </div>\n    </details>\n  </div>\n</div>'; document.body.appendChild(wrap.firstElementChild);
  // translatable static text: mark Korean originals, re-apply on language change
  const dlgEl = $('#clsDlg');
  dlgEl.querySelectorAll('strong,button,summary,span,div,label>span').forEach(e => { if (e.children.length === 0 && TR[e.textContent.trim()]) e.dataset.k = e.textContent.trim(); });
  dlgEl.querySelectorAll('[placeholder]').forEach(e => { e.dataset.kPh = e.getAttribute('placeholder'); });
  dlgEl.querySelector('[role=dialog]').dataset.kAria = '수업 도면';
  function clsLang() {
    document.querySelectorAll('[data-k]').forEach(e => { e.textContent = t(e.dataset.k); });
    document.querySelectorAll('[data-k-title]').forEach(e => { e.title = t(e.dataset.kTitle); });
    document.querySelectorAll('[data-k-ph]').forEach(e => { e.placeholder = t(e.dataset.kPh); });
    document.querySelectorAll('[data-k-aria]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.kAria)); });
    if (!$('#clsDlg').hidden) clsRender();
  }
  const ls = $('#langSel'); if (ls) ls.addEventListener('change', () => setTimeout(clsLang, 0));
  const CLS = (() => {
    let owner = 'daewonlee81-glitch', repo = 'mindstorms-cad';
    const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i), seg = location.pathname.split('/').filter(Boolean)[0];
    if (m && seg) { owner = m[1]; repo = seg; }
    return { owner, repo, branch: 'main', dir: 'classes', list: null, at: 0 };
  })();
  const CLS_KEY = 'mscad.classes';
  const CLS_EXT = /\.(ldr|mpd|zip)$/i;
  const clsRaw = (path, sha) => `https://raw.githubusercontent.com/${CLS.owner}/${CLS.repo}/${CLS.branch}/${path.split('/').map(encodeURIComponent).join('/')}${sha ? '?v=' + sha.slice(0, 12) : ''}`;
  const clsLink = rel => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('class', rel); return u.toString(); };
  async function clsFetchList(force) {
    if (!force) {
      if (CLS.list && Date.now() - CLS.at < 180000) return CLS.list;
      try { const c = JSON.parse(localStorage.getItem(CLS_KEY) || 'null'); if (c && c.repo === CLS.owner + '/' + CLS.repo && Date.now() - c.at < 180000) { CLS.list = c.list; CLS.at = c.at; return c.list; } } catch (e) { }
    }
    const r = await fetch(`https://api.github.com/repos/${CLS.owner}/${CLS.repo}/git/trees/${CLS.branch}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) {
      const e = new Error(r.status === 403 || r.status === 429 ? 'rate' : 'http ' + r.status); e.code = e.message;
      if (r.headers.get('x-ratelimit-reset')) e.reset = +r.headers.get('x-ratelimit-reset') * 1000;
      throw e;
    }
    const j = await r.json(), pre = CLS.dir + '/';
    const list = (j.tree || []).filter(f => f.type === 'blob' && f.path.startsWith(pre) && CLS_EXT.test(f.path)).map(f => {
      const rel = f.path.slice(pre.length), parts = rel.split('/'), name = parts.pop();
      return { path: f.path, rel, group: parts.join(' / '), name: name.replace(CLS_EXT, ''), file: name, sha: f.sha, size: f.size || 0 };
    }).sort((a, b) => a.group.localeCompare(b.group, 'ko') || a.name.localeCompare(b.name, 'ko', { numeric: true }));
    CLS.list = list; CLS.at = Date.now();
    try { localStorage.setItem(CLS_KEY, JSON.stringify({ repo: CLS.owner + '/' + CLS.repo, at: CLS.at, list })); } catch (e) { }
    return list;
  }
  function clsCached() { if (CLS.list) return CLS.list; try { const c = JSON.parse(localStorage.getItem(CLS_KEY) || 'null'); if (c && c.repo === CLS.owner + '/' + CLS.repo) return c.list; } catch (e) { } return null; }
  async function clsOpen(rel, sha) {
    const path = CLS.dir + '/' + rel, file = rel.split('/').pop();
    status(t('수업 도면 받는 중… {0}', file));
    const r = await fetch(clsRaw(path, sha || String(Date.now())), { cache: 'no-cache' });
    if (!r.ok) throw new Error(t('수업 도면을 찾을 수 없습니다: {0}', rel));
    await clsOpenFile(new File([await r.blob()], file));
    status(t('수업 도면 "{0}"을(를) 열었습니다 · 되돌리려면 ↶', file.replace(CLS_EXT, '')));
  }
  function clsMsg(s, err) { const e = $('#clsMsg'); e.textContent = s || ''; e.style.color = err ? '#c62828' : ''; }
  function clsRender() {
    const list = CLS.view || [], q = ($('#clsQ').value || '').trim().toLowerCase(), box = $('#clsList');
    const shown = list.filter(f => !q || (f.group + ' ' + f.name).toLowerCase().includes(q));
    if (!list.length) { box.innerHTML = `<div class="label" style="padding:14px">${esc(t('아직 올라온 수업 도면이 없습니다'))}</div>`; return; }
    if (!shown.length) { box.innerHTML = `<div class="label" style="padding:14px">${esc(t('검색 결과가 없습니다'))}</div>`; return; }
    let html = '', g = null;
    for (const f of shown) {
      if (f.group !== g) { g = f.group; html += `<div class="cls-g">${esc(g || t('공통'))}</div>`; }
      html += `<div class="cls-f"><span class="cls-n" title="${esc(f.file)}">${esc(f.name)}</span><span class="label">${f.size ? Math.max(1, Math.round(f.size / 1024)) + ' KB' : ''}</span>`
        + `<button class="small" data-link="${esc(f.rel)}" title="${esc(t('학생에게 보낼 링크 복사'))}">🔗</button><button class="small primary" data-open="${esc(f.rel)}" data-sha="${esc(f.sha)}">${esc(t('열기'))}</button></div>`;
    }
    box.innerHTML = html;
  }
  async function clsLoad(force) {
    clsMsg(t('목록 불러오는 중…'));
    try { CLS.view = await clsFetchList(force); clsMsg(''); }
    catch (e) {
      const old = clsCached(); CLS.view = old || [];
      if (e.code === 'rate') {
        const min = e.reset ? Math.max(1, Math.ceil((e.reset - Date.now()) / 60000)) : 0;
        clsMsg(t('GitHub 조회 한도를 넘었습니다. {0}분 뒤에 다시 시도하세요', min || '몇') + (old ? ' · ' + t('지난번 목록을 보여 줍니다') : ''), true);
      } else clsMsg(t('목록을 불러오지 못했습니다 (인터넷 연결을 확인하세요)') + (old ? ' · ' + t('지난번 목록을 보여 줍니다') : ''), true);
    }
    clsRender();
  }
  function clsUploadUrl() {
    const g = ($('#clsGroup').value || '').trim().replace(/[\\:*?"<>|]+/g, '').split('/').map(s => s.trim()).filter(Boolean).map(encodeURIComponent).join('/');
    return `https://github.com/${CLS.owner}/${CLS.repo}/upload/${CLS.branch}/${CLS.dir}${g ? '/' + g : ''}`;
  }
  (function clsInit() {
    $('#btnClass').onclick = () => { $('#clsDlg').hidden = false; $('#clsQ').value = ''; clsLoad(false); setTimeout(() => $('#clsQ').focus(), 0); };
    $('#clsClose').onclick = () => { $('#clsDlg').hidden = true; };
    $('#clsDlg').addEventListener('click', e => { if (e.target.id === 'clsDlg') $('#clsDlg').hidden = true; });
    $('#clsRefresh').onclick = () => clsLoad(true);
    $('#clsQ').oninput = clsRender;
    $('#clsList').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.open) {
        b.disabled = true;
        try { await clsOpen(b.dataset.open, b.dataset.sha); $('#clsDlg').hidden = true; } catch (err) { clsMsg(err.message, true); }
        b.disabled = false;
      } else if (b.dataset.link) {
        const url = clsLink(b.dataset.link);
        try { await navigator.clipboard.writeText(url); clsMsg(t('링크를 복사했습니다. 학생에게 보내면 이 도면이 바로 열립니다')); } catch (err) { prompt(t('이 링크를 복사하세요'), url); }
      }
    });
    $('#clsSave').onclick = () => $('#btnSave').click();
    $('#clsUpload').onclick = () => window.open(clsUploadUrl(), '_blank', 'noopener');
    $('#clsGroup').oninput = () => { $('#clsPath').textContent = decodeURIComponent(clsUploadUrl().replace(/^.*\/upload\/[^/]+\//, '')) + '/'; };
    $('#clsGroup').oninput();
  })();
  async function clsBoot() { // ?class=<path> opens that class file straight away
    const rel = new URLSearchParams(location.search).get('class'); if (!rel) return;
    const clean = rel.replace(/^\/+/, '').replace(/^classes\//, '');
    if (clean.split('/').includes('..') || !CLS_EXT.test(clean)) return;
    try { await clsOpen(clean); } catch (e) { status(e.message); }
    try { const u = new URL(location.href); u.searchParams.delete('class'); window.history.replaceState(null, '', u); } catch (e) { }
  }

  clsLang();
  (async () => { // run ?class= once the parts library is ready
    for (let i = 0; i < 600; i++) { const l = $('#loading'); if (l && l.hidden && window.__cad) break; await new Promise(r => setTimeout(r, 250)); }
    await new Promise(r => setTimeout(r, 300));
    clsBoot();
  })();
  window.__classes = { CLS, clsFetchList, clsOpen };
})();
