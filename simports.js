// simports.js — 로봇 시뮬레이터 "포트 연결" (app.js 다음에 불러옵니다. 연결 고리: tools/patch_cadx.py 6번)
//   CAD 모델에서 찾은 모터·센서마다 포트(A~F)를 고를 수 있습니다.
//   · 고른 포트는 그 부품의 "포트 메모"(CAD 오른쪽 '선택한 부품')에 저장되어 .ldr 에도 남습니다.
//   · 다른 장치가 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.
//   · 바퀴 모터의 포트가 바뀌면 "왼쪽/오른쪽 바퀴 모터" 설정도 따라 바뀝니다.
//   · 프로그램이 실행 중일 때는 바꿀 수 없습니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext; if (!C || !X || !('robot' in X)) return;
  const LIX = { en: 0, ja: 1, zh: 2, es: 3 };
  const TR = {
    '포트 연결': ['Port connections', 'ポート接続', '端口连接', 'Conexiones de puertos'],
    '모터': ['Motor', 'モーター', '电机', 'Motor'],
    '컬러센서': ['Colour sensor', 'カラーセンサー', '颜色传感器', 'Sensor de color'],
    '거리센서': ['Distance sensor', '距離センサー', '距离传感器', 'Sensor de distancia'],
    '힘센서': ['Force sensor', 'フォースセンサー', '力传感器', 'Sensor de fuerza'],
    '왼쪽 바퀴': ['left wheel', '左の車輪', '左轮', 'rueda izquierda'],
    '오른쪽 바퀴': ['right wheel', '右の車輪', '右轮', 'rueda derecha'],
    '앞': ['front', '前', '前', 'delante'], '뒤': ['back', '後ろ', '后', 'detrás'],
    '왼쪽': ['left', '左', '左', 'izquierda'], '오른쪽': ['right', '右', '右', 'derecha'], '가운데': ['centre', '中央', '中间', 'centro'],
    '고른 포트는 CAD 부품의 포트 메모에 저장됩니다. 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.': ['The port is saved in the part’s port note in the CAD. Picking a port that is already used swaps the two devices.', 'ポートはCAD部品のポートメモに保存されます。使用中のポートを選ぶと2つの装置を入れ替えます。', '端口保存在 CAD 部件的端口备注中。选择已占用的端口会交换两个设备。', 'El puerto se guarda en la nota de puerto de la pieza. Elegir un puerto ya usado intercambia los dos dispositivos.'],
    'CAD 모델에서 찾은 모터·센서가 없습니다 (기본 로봇: A·B 바퀴, C 컬러, D 거리, E 힘).': ['No motors or sensors found in the CAD model (default robot: A·B wheels, C colour, D distance, E force).', 'CADモデルにモーター・センサーがありません (標準ロボット: A·B 車輪, C カラー, D 距離, E フォース)。', 'CAD 模型中没有电机或传感器（默认机器人：A·B 轮，C 颜色，D 距离，E 力）。', 'No hay motores ni sensores en el modelo CAD (robot por defecto: A·B ruedas, C color, D distancia, E fuerza).'],
    '실행 중에는 포트를 바꿀 수 없습니다': ['Ports cannot be changed while the program runs', '実行中はポートを変更できません', '运行时无法更改端口', 'No se pueden cambiar los puertos mientras se ejecuta'],
    '{0} → {1} 포트': ['{0} → port {1}', '{0} → ポート {1}', '{0} → 端口 {1}', '{0} → puerto {1}'],
  };
  const t = (ko, ...a) => { const i = LIX[(document.documentElement.lang || 'ko').slice(0, 2)]; let s = (i != null && TR[ko] && TR[ko][i]) || ko; a.forEach((v, k) => { s = s.replace('{' + k + '}', v); }); return s; };
  const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const KIND = { motor: '모터', color: '컬러센서', distance: '거리센서', force: '힘센서' };
  const ICON = { motor: '⚙', color: '◉', distance: '◎', force: '◼' };

  const css = document.createElement('style');
  css.textContent = `#simPortMap{display:flex;flex-direction:column;gap:4px;margin-top:2px}
#simPortMap .pm{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;font-size:12px}
#simPortMap .pm .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#simPortMap .pm .n small{opacity:.65}
#simPortMap select{width:56px}#simPortMapNote{font-size:11px;opacity:.7;line-height:1.4}`;
  document.head.appendChild(css);

  // 포트 메모 안의 포트 글자(A~F)를 바꿉니다. 메모의 나머지(케이블 길이 등)는 그대로 둡니다.
  const setMemo = (memo, L) => {
    memo = memo || '';
    if (/\b[A-F]\b/i.test(memo)) return memo.replace(/\b[A-F]\b/i, L);
    return memo.trim() ? `${L} ${memo.trim()}` : L;
  };
  const where = (dev, R) => {
    if (dev.kind === 'motor') return dev.port === R.left ? t('왼쪽 바퀴') : dev.port === R.right ? t('오른쪽 바퀴') : '';
    const s = (R.sensors || []).find(x => x.port === dev.port); if (!s) return '';
    const fb = s.z > 20 ? t('앞') : s.z < -20 ? t('뒤') : '', lr = s.x > 15 ? t('왼쪽') : s.x < -15 ? t('오른쪽') : '';
    return [fb, lr].filter(Boolean).join(' ') || t('가운데');
  };

  let box = null, last = '';
  const mount = () => {
    if (box && document.body.contains(box)) return true;
    const ports = document.getElementById('simPorts'); if (!ports) return false;
    box = document.createElement('div'); box.id = 'simPortWrap';
    box.innerHTML = '<div class="label" style="margin-top:6px"></div><div id="simPortMap"></div><div id="simPortMapNote"></div>';
    ports.after(box); last = '';
    return true;
  };
  const render = force => {
    if (!mount()) return;
    const R = X.robot, devs = (R && R.devices) || [], run = X.simRunning;
    const sig = JSON.stringify([devs, R && R.left, R && R.right, run, document.documentElement.lang]);
    if (!force && sig === last) return; last = sig;
    box.querySelector('.label').textContent = t('포트 연결');
    const map = box.querySelector('#simPortMap'), note = box.querySelector('#simPortMapNote');
    map.innerHTML = '';
    if (!devs.length) { note.textContent = t('CAD 모델에서 찾은 모터·센서가 없습니다 (기본 로봇: A·B 바퀴, C 컬러, D 거리, E 힘).'); return; }
    note.textContent = run ? t('실행 중에는 포트를 바꿀 수 없습니다') : t('고른 포트는 CAD 부품의 포트 메모에 저장됩니다. 이미 쓰는 포트를 고르면 두 장치의 포트를 서로 바꿉니다.');
    const parts = C.model.parts, ix = X.index();
    const count = {};
    for (const d of devs) {
      const p = parts.find(x => x.id === d.id); if (!p) continue;
      count[d.kind] = (count[d.kind] || 0) + 1;
      const nm = (ix.parts[p.file] && ix.parts[p.file].name) || p.file, w = where(d, R);
      const row = document.createElement('div'); row.className = 'pm';
      const n = document.createElement('div'); n.className = 'n'; n.title = `${nm} (${p.file})`;
      n.textContent = `${ICON[d.kind] || ''} ${t(KIND[d.kind] || d.kind)} ${devs.filter(x => x.kind === d.kind).length > 1 ? count[d.kind] : ''}`.replace(/\s+$/, '') + ' ';
      const sm = document.createElement('small'); sm.textContent = [w, p.file].filter(Boolean).join(' · '); n.appendChild(sm);
      const sel = document.createElement('select'); sel.setAttribute('aria-label', n.textContent);
      for (const L of PORTS) { const o = document.createElement('option'); o.value = L; const u = devs.find(x => x.port === L && x !== d); o.textContent = L + (u ? ' ·' : ''); sel.appendChild(o); }
      sel.value = d.port || ''; sel.disabled = !!run;
      sel.onchange = () => change(d, sel.value);
      row.append(n, sel); map.appendChild(row);
    }
  };
  const change = (dev, L) => {
    if (X.simRunning) { X.status(t('실행 중에는 포트를 바꿀 수 없습니다')); render(true); return; }
    const R = X.robot, devs = (R && R.devices) || [], parts = C.model.parts;
    const old = dev.port; if (!L || L === old) return;
    const other = devs.find(x => x !== dev && x.port === L);
    const p = parts.find(x => x.id === dev.id); if (!p) return;
    X.push(); // 되돌리기(Ctrl+Z)에 남김
    p.port = setMemo(p.port, L);
    if (other) { const q = parts.find(x => x.id === other.id); if (q) q.port = setMemo(q.port, old || PORTS.find(x => !devs.some(d => d.port === x)) || ''); }
    // 바퀴 모터 설정도 같이 옮김
    const sim = C.model.sim || (C.model.sim = {}), swap = v => v === old ? L : (other && v === L ? old : v);
    if (sim.left) sim.left = swap(sim.left); if (sim.right) sim.right = swap(sim.right);
    X.apply(p); // 저장 + CAD 패널 새로 고침
    X.simRebuild();
    X.status(t('{0} → {1} 포트', t(KIND[dev.kind] || dev.kind), L));
    render(true);
  };
  setInterval(() => { const sim = document.getElementById('sim'); if (sim && sim.hidden) return; render(false); }, 600);
  new MutationObserver(() => render(true)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
