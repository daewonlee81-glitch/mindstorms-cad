// vla.js — 「VLA 도우미」 연결: 내 PC 에서 돌아가는 VLA 계산 서버(vla-helper/server.py)와 시뮬레이터를 잇습니다.
//   · 시뮬레이터 오른쪽 "🤖 VLA 도우미" 칸: 연결 상태 · 연결/끊기 · 로봇 앞 카메라 화면 · 도우미가 보낸 설명 · 주행 기록
//   · 블록 「👁️ VLA로 주행 · 지시: …」: 로봇 앞 카메라 그림 + 지시 문장 + 요 각도를 도우미에 보내고,
//     돌려받은 바퀴 명령 묶음(속도 mm/s, 회전 °/s, 0.1초씩)을 실행합니다. 실행하는 동안 다음 묶음을 미리 요청합니다.
//   · 주행 기록: 켜 두면 프로그램이 실행되는 동안 0.1초마다 카메라 그림 + 로봇이 실제로 움직인 속도·회전을 도우미에 보내
//     PC 의 recordings/ 폴더에 저장합니다 (VLA 학습 데이터). 어떤 블록 프로그램이든 기록됩니다.
//   · 연결 주소 ws://127.0.0.1:8765 — 공개 사이트(GitHub Pages)에서 내 PC 로 연결하므로 Chrome 이 "로컬 네트워크" 허용을 묻습니다.
//   · 실제 허브(Pybricks)에서는 아직 실행하지 않습니다 (파이썬 코드에는 안내 문구만).
// app.js · huskylens.js(카메라 그림) 다음에 불러옵니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext, U = window.__umc, Bly = window.Blockly;
  if (!C || !X || !U || !Bly) return;
  const T3 = C.THREE;
  const GUIDE = 'https://github.com/daewonlee81-glitch/mindstorms-cad/blob/main/vla-helper/README.md';
  const ZIP = 'vla-helper.zip';
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    'VLA 도우미': ['VLA helper', 'VLA ヘルパー', 'VLA 助手', 'Asistente VLA'],
    '연결': ['Connect', '接続', '连接', 'Conectar'], '끊기': ['Disconnect', '切断', '断开', 'Desconectar'],
    '연결 안 됨': ['not connected', '未接続', '未连接', 'sin conexión'], '연결 중…': ['connecting…', '接続中…', '连接中…', 'conectando…'],
    '연결됨': ['connected', '接続済み', '已连接', 'conectado'],
    '❓ 사용법': ['❓ How to use', '❓ 使い方', '❓ 使用方法', '❓ Cómo usar'],
    '⬇ 도우미 내려받기': ['⬇ Download helper', '⬇ ヘルパーをダウンロード', '⬇ 下载助手', '⬇ Descargar asistente'],
    '⏺ 주행 기록 (학습 데이터로 PC 에 저장)': ['⏺ Record runs (save to the PC as training data)', '⏺ 走行を記録 (学習データとして PC に保存)', '⏺ 记录行驶 (作为训练数据保存到电脑)', '⏺ Grabar recorridos (guardar en el PC como datos)'],
    '로봇 앞 카메라': ['Robot front camera', 'ロボット前カメラ', '机器人前置摄像头', 'Cámara frontal'],
    '기록 중': ['recording', '記録中', '记录中', 'grabando'], '저장됨': ['saved', '保存しました', '已保存', 'guardado'], '장': ['frames', '枚', '张', 'fotogramas'],
    'help.fail': [
      'Could not connect. ① Is the VLA helper running on this PC (black window open)? ② If Chrome asks to allow connecting to devices on your local network, press Allow. ③ If you blocked it: click the icon left of the address bar → Site settings → Local network → Allow, then reload.',
      '接続できません。① この PC で VLA ヘルパーが動いていますか（黒い画面が開いている）? ② Chrome がローカルネットワーク上の機器への接続を尋ねたら「許可」。③ ブロックした場合: アドレスバー左のアイコン → サイトの設定 → ローカルネットワーク → 許可 → 再読み込み。',
      '无法连接。① 这台电脑上的 VLA 助手在运行吗（黑色窗口开着）? ② Chrome 询问是否允许连接本地网络设备时，点“允许”。③ 如果点了阻止：点地址栏左边的图标 → 网站设置 → 本地网络 → 允许，然后刷新。',
      'No se pudo conectar. ① ¿Está abierto el asistente VLA en este PC (ventana negra)? ② Si Chrome pide permiso para conectar con dispositivos de la red local, pulsa Permitir. ③ Si lo bloqueaste: icono a la izquierda de la barra de direcciones → Configuración del sitio → Red local → Permitir, y recarga.'],
    'help.denied': [
      'Chrome is blocking local connections for this site. Click the icon left of the address bar → Site settings → Local network (or "Apps on device") → Allow, then reload the page.',
      'Chrome がこのサイトのローカル接続をブロックしています。アドレスバー左のアイコン → サイトの設定 → ローカルネットワーク（または「デバイス上のアプリ」）→ 許可 → ページを再読み込み。',
      'Chrome 正在阻止此网站的本地连接。点地址栏左边的图标 → 网站设置 → 本地网络（或“设备上的应用”）→ 允许，然后刷新页面。',
      'Chrome bloquea las conexiones locales de este sitio. Icono a la izquierda de la barra → Configuración del sitio → Red local (o "Apps del dispositivo") → Permitir, y recarga.'],
    'help.idle': [
      'Run the VLA helper on this PC first, then press Connect. If Chrome asks about devices on your local network, press Allow.',
      'まずこの PC で VLA ヘルパーを起動してから「接続」。Chrome がローカルネットワークについて尋ねたら「許可」。',
      '先在这台电脑上运行 VLA 助手，再点“连接”。Chrome 询问本地网络时点“允许”。',
      'Primero abre el asistente VLA en este PC y pulsa Conectar. Si Chrome pregunta por la red local, pulsa Permitir.'],
    '👁️ VLA로 주행 · 지시:': ['👁️ Drive with VLA · instruction:', '👁️ VLA で走行 · 指示:', '👁️ 用 VLA 行驶 · 指令:', '👁️ Conducir con VLA · orden:'],
    '빨간 물체로 가': ['go to the red object', '赤い物へ行って', '去红色物体那里', 've al objeto rojo'],
    'vla.tip': ['Sends the robot front camera and this instruction to the VLA helper on this PC and drives with the wheel commands it returns (simulator only).', 'ロボット前カメラとこの指示をこの PC の VLA ヘルパーに送り、返ってきた車輪の命令で走ります（シミュレーターのみ）。', '把机器人前置摄像头画面和这条指令发给本机的 VLA 助手，按返回的车轮命令行驶（仅模拟器）。', 'Envía la cámara frontal y esta orden al asistente VLA de este PC y conduce con las órdenes que devuelve (solo simulador).'],
    'VLA 도우미가 연결되어 있지 않습니다': ['The VLA helper is not connected', 'VLA ヘルパーが接続されていません', 'VLA 助手未连接', 'El asistente VLA no está conectado'],
  };
  const lang = () => (document.documentElement.lang || 'ko').slice(0, 2);
  const KO = {
    'help.fail': '연결하지 못했습니다. ① 이 PC 에서 VLA 도우미가 켜져 있나요 (검은 창이 열려 있음)? ② Chrome 이 "로컬 네트워크의 기기에 연결" 허용을 물으면 [허용]. ③ 차단을 눌렀다면: 주소창 왼쪽 아이콘 → 사이트 설정 → 로컬 네트워크 → 허용 → 새로고침.',
    'help.denied': 'Chrome 이 이 사이트의 로컬 연결을 막고 있습니다. 주소창 왼쪽 아이콘 → 사이트 설정 → 로컬 네트워크(또는 "기기의 앱") → 허용 → 새로고침.',
    'help.idle': '먼저 이 PC 에서 VLA 도우미를 켠 뒤 [연결]을 누르세요. Chrome 이 로컬 네트워크를 물으면 [허용].',
    'vla.tip': '로봇 앞 카메라 그림과 이 지시를 내 PC 의 VLA 도우미에 보내고, 돌려받은 바퀴 명령으로 주행합니다 (시뮬레이터 전용).',
  };
  const t = (ko, ...a) => { const i = LIX[lang()]; let s = (i != null && TR[ko] && TR[ko][i]) || KO[ko] || ko; a.forEach((v, k) => { s = s.split('{' + k + '}').join(v); }); return s; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  // ───────── 연결 ─────────
  const S = { ws: null, st: 'idle', info: null, err: '', note: '', ms: 0, id: 0, waits: {}, rec: null, recMsg: '' };
  const url = () => `ws://127.0.0.1:${+(store('mscad.vla.port') || 8765)}`;
  const lna = async () => {
    for (const name of ['loopback-network', 'local-network-access']) { try { return (await navigator.permissions.query({ name })).state; } catch (e) { } }
    return null;
  };
  const send = m => { if (S.ws && S.ws.readyState === 1) { S.ws.send(JSON.stringify(m)); return true; } return false; };
  const connect = async () => {
    if (S.ws) return;
    S.st = 'connecting'; S.err = ''; draw(true);
    if (await lna() === 'denied') { S.st = 'idle'; S.err = 'denied'; draw(true); return; }
    let ws;
    try { ws = new WebSocket(url()); } catch (e) { S.st = 'idle'; S.err = 'fail'; draw(true); return; }
    S.ws = ws;
    ws.onopen = () => { send({ type: 'hello', app: 'mindstorms-cad' }); };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.type === 'hello') { S.info = m; S.st = 'on'; store('mscad.vla.auto', '1'); draw(true); }
      else if (m.type === 'act') { const w = S.waits[m.id]; if (w) { delete S.waits[m.id]; w(m); } S.note = m.note || ''; S.ms = m.ms || 0; }
      else if (m.type === 'rec_started') { S.recMsg = `⏺ ${t('기록 중')}`; }
      else if (m.type === 'rec_saved') { S.recMsg = `💾 ${t('저장됨')} · ${m.frames}${t('장')} · ${m.path}`; draw(true); }
    };
    ws.onclose = () => {
      const was = S.st; S.ws = null; S.info = null; S.st = 'idle'; if (was === 'connecting') S.err = 'fail';
      for (const k in S.waits) { S.waits[k](null); delete S.waits[k]; }
      S.rec = null; draw(true);
    };
  };
  const disconnect = () => { store('mscad.vla.auto', '0'); if (S.ws) S.ws.close(); };

  // ───────── 로봇 앞 카메라 (로봇 앞쪽 위에서 30° 아래를 봄, 96×72, 가로 70°) ─────────
  const CW = 96, CH = 72;
  let camFor = null, cam = null;
  const frontCam = () => {
    const R = X.robot; if (!R) return null;
    if (R === camFor && cam) return cam;
    camFor = R;
    let maxZ = 70, maxY = 90, cx = 0;
    if (R.root && R.inner) {
      R.root.updateMatrixWorld(true);
      const b = new T3.Box3(), v = new T3.Vector3();
      R.inner.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox; if (!bb) return;
        for (let k = 0; k < 8; k++) { v.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(o.matrixWorld); R.root.worldToLocal(v); b.expandByPoint(v); }
      });
      if (!b.isEmpty() && isFinite(b.max.z)) { maxZ = b.max.z; maxY = Math.max(40, b.max.y); cx = (b.min.x + b.max.x) / 2; }
    }
    const a = 30 * Math.PI / 180;
    cam = { o: new T3.Vector3(cx, maxY + 40, maxZ - 10), d: new T3.Vector3(0, -Math.sin(a), Math.cos(a)) };
    return cam;
  };
  const snap = () => {
    const H = window.__husky; if (!H || !H.view) return null;
    const r = H.view(frontCam(), { w: CW, h: CH, fov: 70 }); if (!r) return null;
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    c.getContext('2d').putImageData(new ImageData(r.img, CW, CH), 0, 0);
    lastImg = c;
    return c.toDataURL('image/png');
  };
  let lastImg = null;
  const yawDeg = () => { const p = U.pose(); return p ? Math.round(-p.th * 180 / Math.PI * 10) / 10 : 0; };

  // 도우미에게 바퀴 명령 묶음 요청 (2초 안에 답이 없으면 멈춤 명령)
  const ask = task => new Promise(res => {
    const id = ++S.id, image = snap();
    if (!send({ type: 'act', id, task, image, state: { yaw: yawDeg() } })) return res(null);
    const to = setTimeout(() => { if (S.waits[id]) { delete S.waits[id]; res(null); } }, 2000);
    S.waits[id] = m => { clearTimeout(to); res(m); };
  });

  // 블록이 부르는 주행 루프 — 묶음을 실행하는 동안 다음 묶음을 미리 요청 (비동기 추론)
  const drive = async (api, task) => {
    if (S.st !== 'on') { S.note = t('VLA 도우미가 연결되어 있지 않습니다'); draw(true); await api.wbDrive(0, 0); throw new Error(t('VLA 도우미가 연결되어 있지 않습니다')); }
    let next = ask(task);
    while (X.simRunning) {
      const m = await next;
      if (!X.simRunning) break;
      next = ask(task);
      const chunk = (m && Array.isArray(m.chunk) && m.chunk.length) ? m.chunk : [[0, 0]], dt = (m && +m.dt) || 0.1;
      for (const a of chunk) { await api.wbDrive(+a[0] || 0, +a[1] || 0); await api.wait(dt); }
      if (S.st !== 'on') { await api.wbDrive(0, 0); break; }
    }
  };
  window.__vla = { drive, connect, disconnect, snap, state: S };

  // ───────── 주행 기록 (0.1초마다, 프로그램 실행 중) ─────────
  const recOn = () => store('mscad.vla.rec') === '1';
  let recLast = null;
  setInterval(() => {
    const running = !!X.simRunning;
    if (!running || !recOn() || S.st !== 'on') {
      if (S.rec) { send({ type: 'rec_end', result: { seconds: Math.round((U.time() - S.rec.t0) * 10) / 10 } }); S.rec = null; recLast = null; }
      return;
    }
    const now = U.time(), p = U.pose(); if (!p) return;
    if (!S.rec) {
      const mat = U.mat ? U.mat() : null, blk = vlaTask();
      S.rec = { t0: now };
      send({ type: 'rec_start', meta: { task: blk || '블록 프로그램', mat: mat && (mat.key || mat.label), robot: (C.model && C.model.name) || '', camera: { w: CW, h: CH, fov: 70, tilt: 30 }, action: ['speed_mm_s', 'turn_deg_s'] } });
      recLast = { t: now, x: p.x, z: p.z, th: p.th }; return;
    }
    const dt = now - recLast.t; if (dt < 0.05) return;
    const s = Math.sin(recLast.th), c = Math.cos(recLast.th);
    let dth = p.th - recLast.th; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
    const speed = Math.round(((p.x - recLast.x) * s + (p.z - recLast.z) * c) / dt), turn = Math.round(-dth * 180 / Math.PI / dt);
    send({ type: 'rec_frame', t: Math.round((now - S.rec.t0) * 100) / 100, image: snap(), state: { yaw: yawDeg(), pose: { x: Math.round(p.x), z: Math.round(p.z), th: Math.round(p.th * 1000) / 1000 } }, action: [speed, turn] });
    recLast = { t: now, x: p.x, z: p.z, th: p.th };
  }, 100);
  const vlaTask = () => { try { const ws = window.__wb && window.__wb.ws(); const b = ws && ws.getAllBlocks(false).find(x => x.type === 'rm_vla_drive' && x.isEnabled()); return b ? b.getFieldValue('TASK') : ''; } catch (e) { return ''; } };

  // ───────── 블록 「👁️ VLA로 주행 · 지시: …」 ─────────
  Bly.Blocks.rm_vla_drive = {
    init() {
      this.appendDummyInput().appendField(t('👁️ VLA로 주행 · 지시:'), 'T').appendField(new Bly.FieldTextInput(t('빨간 물체로 가')), 'TASK');
      this.setPreviousStatement(true); this.setNextStatement(false);
      this.setColour('#7E57C2'); this.setTooltip(t('vla.tip'));
    },
  };
  const JG = window.javascript && window.javascript.javascriptGenerator, PY = window.python && window.python.pythonGenerator;
  const fake = f => ({ type: 'x', id: 'x', getFieldValue: n => f[n], getInputTargetBlock: () => null, getInput: () => ({}), isEnabled: () => true, getSurroundParent: () => null, getParent: () => null, getRootBlock() { return this; } });
  const install = () => {
    if (JG && JG.forBlock.rm_vla_drive !== genJS) JG.forBlock.rm_vla_drive = genJS;
    if (PY && PY.forBlock.rm_vla_drive !== genPY) PY.forBlock.rm_vla_drive = genPY;
  };
  const genJS = b => { try { JG.forBlock.rm_drive_stop(fake({}), JG); } catch (e) { } return `await window.__vla.drive(api, ${JSON.stringify(String(b.getFieldValue('TASK') || ''))});\n`; };
  const genPY = b => `# VLA: ${String(b.getFieldValue('TASK') || '').replace(/\n/g, ' ')}\nprint("VLA driving works only in the simulator for now")\n`;
  install(); setInterval(install, 2000); // 워드블럭 동기화가 생성기를 다시 정의해도 되돌림
  // 도구 상자: "🤖 VLA" 분류
  const prevTb = window.__wbTb;
  window.__wbTb = (tb, hub) => {
    const out = prevTb ? prevTb(tb, hub) : tb, box = out || tb;
    try {
      if (box && Array.isArray(box.contents) && !box.contents.some(c => c.vla)) box.contents.push({ kind: 'category', name: '🤖 VLA', colour: '#7E57C2', vla: 1, contents: [{ kind: 'block', type: 'rm_vla_drive' }] });
    } catch (e) { }
    return box;
  };

  // ───────── 시뮬레이터 칸 ─────────
  const css = document.createElement('style');
  css.textContent = `#vlaWrap{margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25)}#vlaWrap .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;margin:3px 0}
#vlaWrap .dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:#9e9e9e}#vlaWrap .dot.on{background:#2e7d32}#vlaWrap .dot.connecting{background:#f9a825}
#vlaWrap button{font-size:12px;padding:2px 8px}#vlaWrap a{font-size:12px}#vlaWrap canvas{width:100%;max-width:240px;aspect-ratio:4/3;background:#222;border-radius:6px;image-rendering:pixelated;display:block}
#vlaWrap .note{font-size:11px;opacity:.75;line-height:1.45;word-break:break-all}#vlaWrap .warn{font-size:11px;line-height:1.45;background:rgba(249,168,37,.15);border-radius:6px;padding:5px 7px}`;
  document.head.appendChild(css);
  let wrap = null, cv = null, sig = '';
  const draw = force => {
    const sim = document.getElementById('sim'); if (sim && sim.hidden) return;
    if (!wrap || !document.body.contains(wrap)) {
      const after = document.getElementById('hkWrap') || document.getElementById('simPortWrap') || document.getElementById('simPorts'); if (!after) return;
      wrap = document.createElement('div'); wrap.id = 'vlaWrap'; after.after(wrap); sig = '';
      if (store('mscad.vla.auto') === '1' && !S.ws) setTimeout(connect, 300);
    }
    const I = S.info, s2 = JSON.stringify([S.st, S.err, I && I.name, lang(), recOn(), S.recMsg]);
    if (force || s2 !== sig) {
      sig = s2;
      const label = S.st === 'on' ? `${t('연결됨')} · ${esc(I.name)}${I.device && I.device !== '-' ? ' · ' + esc(I.device) : ''}` : S.st === 'connecting' ? t('연결 중…') : t('연결 안 됨');
      const help = S.err === 'denied' ? t('help.denied') : S.err === 'fail' ? t('help.fail') : S.st !== 'on' ? t('help.idle') : '';
      wrap.innerHTML = `<div class="label">🤖 ${t('VLA 도우미')}</div>
<div class="row"><span class="dot ${S.st}"></span><span>${label}</span></div>
<div class="row"><button id="vlaConn">${S.st === 'idle' ? t('연결') : t('끊기')}</button><a href="${GUIDE}" target="_blank" rel="noopener">${t('❓ 사용법')}</a><a href="${ZIP}" download>${t('⬇ 도우미 내려받기')}</a></div>
${help ? `<div class="${S.err ? 'warn' : 'note'}">${esc(help)}</div>` : ''}
<div class="row"><label><input type="checkbox" id="vlaRec" ${recOn() ? 'checked' : ''} ${S.st === 'on' ? '' : 'disabled'}> ${t('⏺ 주행 기록 (학습 데이터로 PC 에 저장)')}</label></div>
${S.recMsg ? `<div class="note">${esc(S.recMsg)}</div>` : ''}
<div class="note">${t('로봇 앞 카메라')}</div><canvas width="192" height="144"></canvas><div class="note" id="vlaNote"></div>`;
      cv = wrap.querySelector('canvas');
      wrap.querySelector('#vlaConn').onclick = () => (S.st === 'idle' ? connect() : disconnect());
      wrap.querySelector('#vlaRec').onchange = e => { store('mscad.vla.rec', e.target.checked ? '1' : '0'); S.recMsg = ''; };
    }
    const nt = wrap.querySelector('#vlaNote'); if (nt) nt.textContent = S.note ? `💬 ${S.note}${S.ms ? ` · ${S.ms} ms` : ''}` : '';
    if (cv) {
      if (!X.simRunning || !lastImg) snap();
      if (lastImg) { const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(lastImg, 0, 0, cv.width, cv.height); }
    }
  };
  setInterval(() => draw(false), 300);
})();
