// real.js — real2sim 1단계: 시뮬레이터의 로봇이 받는 바퀴 명령을 실제 허브(Pybricks)로 실시간 전달합니다.
//
//   흐름: 시뮬레이터에서 「👁️ VLA로 주행」·「🧒 따라 하기」 블록이 정한 (속도 mm/s, 회전 °/s)
//         → 브라우저가 0.1초마다 블루투스(Pybricks stdin)로 "V:속도,회전" 한 줄을 보냄
//         → 허브의 프로그램이 그 줄을 읽어 DriveBase.drive(속도, 회전)
//   안전: 허브는 0.3초 동안 새 명령이 없으면 스스로 멈춥니다 (브라우저 창을 닫거나, 블루투스가 끊기거나, 시뮬레이터가 멈춰도).
//         값은 허브·브라우저 양쪽에서 ±400 mm/s, ±360 °/s 로 자릅니다.
//   허브 프로그램: 같은 두 블록의 파이썬 코드가 "명령 받기" 프로그램이 됩니다 (Pybricks 칸의 「허브에서 실행」).
//
// app.js(__pyb · 파이썬 생성기) · vla.js · bc.js 다음에 불러옵니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext;
  if (!C || !X) return;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '🔗 실제 로봇도 같이 움직이기': ['🔗 Move the real robot too', '🔗 実物のロボットも一緒に動かす', '🔗 让真实机器人一起动', '🔗 Mover también el robot real'],
    '속도': ['Speed', '速さ', '速度', 'Velocidad'],
    '허브가 연결되지 않았습니다 — Pybricks 칸에서 「허브 연결」': ['Hub not connected — use "Connect hub" in the Pybricks panel', 'ハブが接続されていません — Pybricks 欄の「ハブ接続」', '集线器未连接 — 在 Pybricks 栏点「连接集线器」', 'Hub no conectado — usa «Conectar hub» en el panel Pybricks'],
    '허브 연결됨 — 이 블록 프로그램을 「허브에서 실행」하면 명령을 받기 시작합니다': ['Hub connected — press "Run on hub" with this block program to start receiving', 'ハブ接続済み — このブロックプログラムを「ハブで実行」すると受信を始めます', '已连接 — 用「在集线器上运行」运行此程序即可开始接收', 'Hub conectado — pulsa «Ejecutar en el hub» con este programa para empezar'],
    '보내는 중': ['Sending', '送信中', '发送中', 'Enviando'],
    '멈춤 명령': ['stop command', '停止命令', '停止命令', 'orden de parada'],
    '■ 실제 로봇 멈춤': ['■ Stop real robot', '■ 実物を止める', '■ 停止真实机器人', '■ Parar robot real'],
    'real.note': ['Safety: the robot stops by itself when no command arrives for 0.3 s. Start on the floor with space around it.', '安全: 0.3 秒間命令が来ないとロボットは自分で止まります。周りに何もない床で始めてください。', '安全：0.3 秒没有收到命令时机器人会自己停止。请在四周空旷的地面上开始。', 'Seguridad: el robot se detiene solo si no llega ninguna orden en 0,3 s. Empieza en el suelo con espacio alrededor.'],
    'real.ko': '안전: 0.3초 동안 명령이 오지 않으면 로봇이 스스로 멈춥니다. 주위가 비어 있는 바닥에서 시작하세요.',
  };
  const t = k => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; const v = TR[k]; if (i != null && Array.isArray(v)) return v[i]; return k === 'real.note' ? TR['real.ko'] : k; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  const MAXS = 400, MAXT = 360, PERIOD = 100, WATCHDOG = 300;
  const R = { cmd: [0, 0], sent: 0, last: '', busy: false, err: '' };
  const on = () => store('mscad.real.on') === '1';
  const scale = () => { const v = +(store('mscad.real.scale') || 100); return v === 50 || v === 75 ? v : 100; };
  const PB = () => window.__pyb && window.__pyb.PB;
  const hubState = () => { const p = PB(); return !p || !p.tx ? 'off' : p.running ? 'run' : 'idle'; };

  // 시뮬레이터 api 의 바퀴 명령을 엿들음 (블록 실행마다 한 번)
  const tap = api => {
    if (!api || api.__real || typeof api.wbDrive !== 'function') return api;
    const f = api.wbDrive;
    api.wbDrive = function (sp, tn) { R.cmd = [+sp || 0, +tn || 0]; return f.apply(this, arguments); };
    api.__real = 1;
    return api;
  };
  const wrap = (obj, name) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__real) return;
    const f = obj[name], g = function (api, ...rest) { return f.call(this, tap(api), ...rest); };
    g.__real = 1; obj[name] = g;
  };
  const hook = () => { wrap(window.__vla, 'drive'); wrap(window.__bc, 'drive'); wrap(window.__bc, 'teach'); };
  hook(); setInterval(hook, 2000);

  // 지금 보낼 명령 (시뮬레이터가 멈춰 있으면 0,0)
  const clamp = (v, m) => Math.max(-m, Math.min(m, Math.round(v)));
  const current = () => {
    if (!X.simRunning) { R.cmd = [0, 0]; return [0, 0]; }
    const k = scale() / 100;
    return [clamp(R.cmd[0] * k, MAXS), clamp(R.cmd[1] * k, MAXT)];
  };
  // Pybricks stdin 쓰기 (app.js 와 같은 줄에 서서 — 다른 쓰기와 섞이지 않게)
  const writeStdin = str => {
    const p = PB(); if (!p || !p.tx) return Promise.reject(new Error('no hub'));
    const bytes = new TextEncoder().encode(str), n = Math.max(16, (p.maxWrite || 20) - 1);
    let last = null;
    for (let i = 0; i < bytes.length; i += n) {
      const part = bytes.subarray(i, i + n), pkt = new Uint8Array(part.length + 1);
      pkt[0] = 6; pkt.set(part, 1); // 6 = Pybricks "stdin 쓰기" 명령
      last = (p.q || Promise.resolve()).then(() => { if (!p.tx) throw new Error('no hub'); return p.tx.write(pkt); });
      p.q = last.catch(() => { });
    }
    return last || Promise.resolve();
  };
  const line = v => `V:${v[0]},${v[1]}\n`;
  const tick = () => {
    if (!on() || hubState() !== 'run' || R.busy) return;
    const v = current(); R.busy = true; R.last = line(v);
    writeStdin(R.last).then(() => { R.sent++; R.err = ''; }, e => { R.err = String(e && e.message || e); }).finally(() => { R.busy = false; });
  };
  setInterval(tick, PERIOD);
  const stopNow = async () => {
    R.cmd = [0, 0];
    try { if (hubState() === 'run') await writeStdin(line([0, 0])); } catch (e) { }
    try { window.__pyb && window.__pyb.pbStopHub && await window.__pyb.pbStopHub(); } catch (e) { }
  };

  // ───────── 허브 쪽 파이썬: "V:속도,회전" 받기 + 0.3초 안전 정지 ─────────
  //   PY: 파이썬 생성기, title: 블록 이름 (주석용)
  const fake = f => ({ type: 'x', id: 'x', getFieldValue: n => f[n], getInputTargetBlock: () => null, getInput: () => ({}), isEnabled: () => true, getSurroundParent: () => null, getParent: () => null, getRootBlock() { return this; } });
  const py = (PY, title) => {
    const drive = (PY.forBlock.rm_drive_stop(fake({}), PY) || '').split('.')[0] || 'drive_base';
    const wait = (PY.forBlock.rm_wait(fake({}), PY) || 'wait(').split('(')[0].trim() || 'wait';
    if (PY.rmImports_) { if (!PY.rmImports_.has('pybricks.tools')) PY.rmImports_.set('pybricks.tools', new Set()); PY.rmImports_.get('pybricks.tools').add('StopWatch'); }
    if (PY.rmSetup_) PY.rmSetup_.set('real_link', [
      '# 컴퓨터(시뮬레이터)가 블루투스로 보내는 "V:속도,회전" 줄을 읽습니다',
      'try:', '    from sys import stdin', '    from select import poll', 'except ImportError:', '    from usys import stdin', '    from uselect import poll',
      'real_poll = poll()', 'real_poll.register(stdin)', 'real_buf = []', 'real_cmd = [0, 0]', 'real_clock = StopWatch()', 'real_last = -10000', '',
      'def real_read():', '    global real_buf, real_last', '    n = 0', '    while n < 256 and real_poll.poll(0):', '        n += 1', '        c = stdin.read(1)',
      '        if c == "\\n":', '            s = "".join(real_buf)', '            real_buf = []', '            if s[:2] == "V:":', '                try:',
      '                    v = [int(x) for x in s[2:].split(",")]', `                    real_cmd[0] = max(-${MAXS}, min(${MAXS}, v[0]))`, `                    real_cmd[1] = max(-${MAXT}, min(${MAXT}, v[1]))`,
      '                    real_last = real_clock.time()', '                except (ValueError, IndexError):', '                    pass',
      '        elif c != "\\r":', '            if len(real_buf) < 40:', '                real_buf.append(c)', '            else:', '                real_buf = []'].join('\n'));
    return [`# ${String(title || '').replace(/\n/g, ' ')}`, '# 실제 로봇: 시뮬레이터의 바퀴 명령을 받아 움직입니다. 0.3초 동안 명령이 없으면 멈춥니다.',
      'print("REAL LINK: waiting for commands")', 'real_moving = False', 'while True:', '    real_read()', `    if real_clock.time() - real_last > ${WATCHDOG}:`,
      '        if real_moving:', `            ${drive}.stop()`, '            real_moving = False', '    else:', `        ${drive}.drive(real_cmd[0], real_cmd[1])`,
      '        real_moving = True', `    ${wait}(20)`, ''].join('\n');
  };

  // ───────── 시뮬레이터 칸 (VLA 도우미 칸 아래) ─────────
  const css = document.createElement('style');
  css.textContent = `#realWrap{margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25);font-size:12px}#realWrap .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:3px 0}
#realWrap .dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:#9e9e9e}#realWrap .dot.idle{background:#f9a825}#realWrap .dot.run{background:#2e7d32}
#realWrap .note{font-size:11px;opacity:.75;line-height:1.45}#realWrap button,#realWrap select{font-size:12px;padding:1px 6px}`;
  document.head.appendChild(css);
  let box = null, sig = '';
  const ui = () => {
    const sim = document.getElementById('sim'); if (sim && sim.hidden) return;
    const after = document.getElementById('vlaWrap'); if (!after) return;
    if (!box || !document.body.contains(box)) { box = document.createElement('div'); box.id = 'realWrap'; after.after(box); sig = ''; }
    else if (box.previousElementSibling !== after) after.after(box);
    const hs = hubState(), s2 = JSON.stringify([on(), hs, scale(), document.documentElement.lang]);
    if (s2 !== sig) {
      sig = s2;
      const sc = scale(), o = v => `<option value="${v}"${v === sc ? ' selected' : ''}>${v}%</option>`;
      box.innerHTML = `<div class="row"><label><input type="checkbox" id="realOn" ${on() ? 'checked' : ''}> ${t('🔗 실제 로봇도 같이 움직이기')}</label>
<span>${t('속도')} <select id="realScale">${o(50)}${o(75)}${o(100)}</select></span></div>
${on() ? `<div class="row"><span class="dot ${hs}"></span><span id="realSt"></span></div>
<div class="row"><button id="realStop">${t('■ 실제 로봇 멈춤')}</button></div><div class="note">${esc(t('real.note'))}</div>` : ''}`;
      box.querySelector('#realOn').onchange = e => { store('mscad.real.on', e.target.checked ? '1' : '0'); if (!e.target.checked) stopNow(); };
      box.querySelector('#realScale').onchange = e => store('mscad.real.scale', e.target.value);
      const b = box.querySelector('#realStop'); if (b) b.onclick = stopNow;
    }
    const st = box.querySelector('#realSt');
    if (st) {
      const v = current();
      st.textContent = hs === 'off' ? t('허브가 연결되지 않았습니다 — Pybricks 칸에서 「허브 연결」')
        : hs === 'idle' ? t('허브 연결됨 — 이 블록 프로그램을 「허브에서 실행」하면 명령을 받기 시작합니다')
          : `${t('보내는 중')} · ${v[0] || v[1] ? `${v[0]} mm/s · ${v[1]} °/s` : t('멈춤 명령')}${R.err ? ' · ⚠️ ' + R.err : ''}`;
    }
  };
  setInterval(ui, 250);

  window.__real = { py, tap, current, line, writeStdin, stopNow, state: R, hubState, on, scale, MAXS, MAXT, WATCHDOG, PERIOD };
})();
