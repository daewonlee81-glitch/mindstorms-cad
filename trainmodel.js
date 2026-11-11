// trainmodel.js — 자동 튜닝 학습의 「학습 모델」 고르기 (AI 튜터의 모델 고르기와 같은 모양)
//   · ⚡ 빠른 탐색 · 언덕 오르기     가장 좋은 값 둘레만 빠르게 찾기 (좋아지면 넓게, 아니면 좁게)
//   · ⭐ 추천 · 교차 엔트로피        잘한 경기장들의 평균으로 옮겨 가며 찾기 (원래 쓰던 방식)
//   · 🧬 꼼꼼한 탐색 · 유전 알고리즘  잘한 프로그램끼리 숫자를 섞고 가끔 바꿔 보며 넓게 찾기
//   · 🧠 신경망 (뉴로에볼루션)        블록 대신 작은 신경망이 센서를 보고 바퀴를 움직이는 법을 배움
//                                    → 「🧠 신경망으로 주행」 블록 (시뮬레이터 · 실제 허브 파이썬 모두)
// app.js 의 학습기는 window.__trs 훅(tools/patch_trx.py)으로 이 파일을 부릅니다. app.js 다음에 불러옵니다.
(() => {
  'use strict';
  const W = window.__wb, U = window.__umc, Bly = window.Blockly;
  if (!W || !U || !Bly) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LIX = { en: 0, ja: 1, zh: 2, 'zh-CN': 2, es: 3 };
  const TR = {
    '학습 모델': ['Learning model', '学習モデル', '学习模型', 'Modelo de aprendizaje'],
    '학습 모델이 뭐예요?': ['What is a learning model?', '学習モデルって何？', '什么是学习模型？', '¿Qué es un modelo de aprendizaje?'],
    'help': [
      'Training runs the program on 16 fields at once and keeps what scores best. The learning model is <b>how the computer decides what to try next</b>. All models run only in this browser, with no internet. Pick one, press Start training, and compare the score chart.',
      '学習は16のフィールドで同時にプログラムを動かし、点数の高いものを残します。学習モデルは<b>次に何を試すかをコンピューターが決めるやり方</b>です。どれもこのブラウザーの中だけで動き、インターネットは不要です。選んで「学習開始」を押し、点数グラフを比べてみましょう。',
      '训练会在 16 个场地上同时运行程序，留下得分高的结果。学习模型就是<b>计算机决定下一步尝试什么的方法</b>。所有模型都只在这个浏览器中运行，不需要网络。选一个，按“开始训练”，比较分数曲线。',
      'El entrenamiento ejecuta el programa en 16 campos a la vez y se queda con lo que puntúa mejor. El modelo de aprendizaje es <b>cómo decide el ordenador qué probar después</b>. Todos funcionan solo en este navegador, sin internet. Elige uno, pulsa Iniciar y compara la gráfica de puntos.'],
    '⚡ 빠른 탐색 · 언덕 오르기': ['⚡ Quick · Hill climbing', '⚡ 速い探索 · 山登り法', '⚡ 快速 · 爬山法', '⚡ Rápido · Ascenso de colinas'],
    '가장 좋은 값 둘레만 찾아요. 좋아지면 더 멀리, 아니면 더 가까이. 숫자가 몇 개 안 될 때 빨라요.': ['Searches only around the best values: further when it improves, closer when not. Fast when there are only a few numbers.', '一番よい値の周りだけを探します。よくなれば遠くへ、そうでなければ近くへ。数値が少ないときに速いです。', '只在最好值附近寻找：变好就走远些，否则靠近些。数字不多时最快。', 'Busca solo alrededor de los mejores valores: más lejos si mejora, más cerca si no. Rápido con pocos números.'],
    '⭐ 추천 · 교차 엔트로피': ['⭐ Recommended · Cross-entropy', '⭐ おすすめ · クロスエントロピー法', '⭐ 推荐 · 交叉熵方法', '⭐ Recomendado · Entropía cruzada'],
    '잘한 경기장 몇 개의 평균 쪽으로 옮겨 가며 찾아요. 대부분의 과제에 잘 맞아요. (원래 쓰던 방식)': ['Moves toward the average of the best few fields. Works well for most tasks (the original method).', '成績のよいいくつかのフィールドの平均へ動きながら探します。たいていの課題に合います（元の方式）。', '朝几个得分最好场地的平均值移动来寻找。适合大多数任务（原来的方式）。', 'Avanza hacia la media de los mejores campos. Va bien en casi todas las tareas (el método original).'],
    '🧬 꼼꼼한 탐색 · 유전 알고리즘': ['🧬 Thorough · Genetic algorithm', '🧬 じっくり探索 · 遺伝的アルゴリズム', '🧬 仔细 · 遗传算法', '🧬 Exhaustivo · Algoritmo genético'],
    '잘한 프로그램끼리 숫자를 섞고(교배) 가끔 바꿔(돌연변이) 봐요. 넓게 찾아 막힌 곳을 잘 빠져나오지만 느려요.': ['Mixes the numbers of good programs (crossover) and sometimes changes them (mutation). Searches widely and escapes dead ends, but is slower.', 'よいプログラム同士の数値を混ぜ（交配）、ときどき変えて（突然変異）みます。広く探して行き詰まりを抜けやすいですが遅めです。', '把好的程序的数字混合（交叉），偶尔改变（变异）。搜索范围广，不易卡住，但较慢。', 'Mezcla los números de buenos programas (cruce) y a veces los cambia (mutación). Busca amplio y sale de atascos, pero es más lento.'],
    '🧠 신경망 · 뉴로에볼루션': ['🧠 Neural network · Neuroevolution', '🧠 ニューラルネットワーク · ニューロエボリューション', '🧠 神经网络 · 神经进化', '🧠 Red neuronal · Neuroevolución'],
    '블록 대신 작은 신경망이 센서를 보고 바퀴를 움직이는 법을 배워요. 라인 따라가기·거리 맞추기처럼 계속 반응하는 과제에 좋아요. 순서나 세기가 필요한 과제는 어려워요.': ['Instead of blocks, a small neural network learns to drive the wheels from the sensors. Good for tasks that react all the time (line following, keeping a distance); hard for tasks that need order or counting.', 'ブロックの代わりに小さなニューラルネットワークが、センサーを見て車輪を動かす方法を学びます。ライントレースや距離合わせのように反応し続ける課題向き。順番や数えることが必要な課題は苦手です。', '由一个小神经网络代替积木，学习根据传感器驱动车轮。适合持续反应的任务（巡线、保持距离）；需要顺序或计数的任务较难。', 'En lugar de bloques, una pequeña red neuronal aprende a mover las ruedas según los sensores. Buena para tareas de reacción continua (seguir línea, mantener distancia); difícil si hace falta orden o contar.'],
    '빠름': ['fast', '速い', '快', 'rápido'], '추천': ['recommended', 'おすすめ', '推荐', 'recomendado'], '넓게': ['wide', '広い', '广', 'amplio'], 'AI': ['AI', 'AI', 'AI', 'IA'],
    '선택됨': ['Selected', '選択中', '已选择', 'Elegido'], '사용': ['Use', '使う', '使用', 'Usar'],
    '신경망 구조: 입력 {0}개 ({1}) → 숨은 층 {2}개 → 출력 2개 (속도·회전) · 가중치 {3}개': ['Network: {0} inputs ({1}) → {2} hidden → 2 outputs (speed, turn) · {3} weights', 'ネットワーク: 入力 {0} 個（{1}）→ 隠れ層 {2} 個 → 出力 2 個（速度・回転）· 重み {3} 個', '网络: 输入 {0} 个（{1}）→ 隐藏层 {2} 个 → 输出 2 个（速度、转向）· 权重 {3} 个', 'Red: {0} entradas ({1}) → {2} ocultas → 2 salidas (velocidad, giro) · {3} pesos'],
    '로봇에 컬러 센서나 거리 센서가 없어 신경망을 쓸 수 없습니다': ['The robot has no color or distance sensor, so the neural network cannot be used', 'ロボットにカラーセンサーも距離センサーもないため、ニューラルネットワークは使えません', '机器人没有颜色或距离传感器，无法使用神经网络', 'El robot no tiene sensor de color ni de distancia; no se puede usar la red neuronal'],
    '"적용"을 누르면 지금 프로그램 대신 「🧠 신경망으로 주행」 블록이 들어갑니다 (지금 프로그램은 🕘 기록에 남습니다).': ['"Apply" replaces the program with a "🧠 Drive with neural network" block (the current program stays in 🕘 History).', '「適用」を押すと今のプログラムの代わりに「🧠 ニューラルネットで走行」ブロックが入ります（今のプログラムは 🕘 履歴に残ります）。', '按“应用”会用“🧠 用神经网络行驶”积木代替当前程序（当前程序保留在 🕘 记录中）。', '"Aplicar" sustituye el programa por un bloque "🧠 Conducir con red neuronal" (el programa actual queda en 🕘 Historial).'],
    '컬러 {0} 반사광': ['color {0} reflection', 'カラー {0} 反射光', '颜色 {0} 反射光', 'color {0} reflejo'],
    '거리 {0}': ['distance {0}', '距離 {0}', '距离 {0}', 'distancia {0}'],
    '🧠 신경망으로 주행': ['🧠 Drive with neural network', '🧠 ニューラルネットで走行', '🧠 用神经网络行驶', '🧠 Conducir con red neuronal'],
    '입력 {0} · 숨은 층 {1} · 가중치 {2}개': ['inputs {0} · hidden {1} · {2} weights', '入力 {0} · 隠れ層 {1} · 重み {2} 個', '输入 {0} · 隐藏层 {1} · 权重 {2} 个', 'entradas {0} · ocultas {1} · {2} pesos'],
    'nn.tip': ['Repeats forever: reads the sensors, the trained neural network computes speed and turn, and the robot drives. Made by "Auto-tuning training → 🧠 Neural network".', 'ずっとくり返し：センサーを読み、学習したニューラルネットが速度と回転を計算して走ります。「自動チューニング学習 → 🧠 ニューラルネットワーク」で作ります。', '一直重复：读取传感器，训练好的神经网络计算速度和转向并行驶。在“自动调参训练 → 🧠 神经网络”中生成。', 'Repite siempre: lee los sensores, la red entrenada calcula velocidad y giro y el robot avanza. Se crea en "Entrenamiento → 🧠 Red neuronal".'],
    '신경망 블록을 넣었습니다': ['Added the neural network block', 'ニューラルネットのブロックを入れました', '已加入神经网络积木', 'Bloque de red neuronal añadido'],
    '학습 모델: {0}': ['Learning model: {0}', '学習モデル: {0}', '学习模型: {0}', 'Modelo: {0}'],
  };
  const KO_TIP = '계속 반복: 센서를 읽고, 학습한 신경망이 속도와 회전을 계산해 주행합니다. 「자동 튜닝 학습 → 🧠 신경망」으로 만듭니다.';
  const KO_HELP = '학습은 16개 경기장에서 프로그램을 한꺼번에 돌려 보고 점수가 좋은 것을 남깁니다. 학습 모델은 <b>다음에 무엇을 시험해 볼지 컴퓨터가 정하는 방법</b>이에요. 모두 이 브라우저 안에서만 돌고 인터넷이 필요 없어요. 하나를 고르고 「학습 시작」을 눌러 점수 그래프를 비교해 보세요.';
  const t = (ko, ...a) => {
    const lang = (() => { try { return W.lang(); } catch (e) { return document.documentElement.lang || 'ko'; } })();
    const i = LIX[lang] ?? LIX[String(lang).slice(0, 2)];
    let s = ko === 'help' ? (i == null ? KO_HELP : TR.help[i]) : ko === 'nn.tip' ? (i == null ? KO_TIP : TR['nn.tip'][i]) : ((i != null && TR[ko] && TR[ko][i]) || ko);
    return s.replace(/\{(\d)\}/g, (_, k) => a[+k] ?? '');
  };

  // ───────────── 학습 모델 목록 ─────────────
  const MODELS = [
    { id: 'hill', name: '⚡ 빠른 탐색 · 언덕 오르기', desc: '가장 좋은 값 둘레만 찾아요. 좋아지면 더 멀리, 아니면 더 가까이. 숫자가 몇 개 안 될 때 빨라요.', tag: '빠름' },
    { id: 'cem', name: '⭐ 추천 · 교차 엔트로피', desc: '잘한 경기장 몇 개의 평균 쪽으로 옮겨 가며 찾아요. 대부분의 과제에 잘 맞아요. (원래 쓰던 방식)', tag: '추천' },
    { id: 'ga', name: '🧬 꼼꼼한 탐색 · 유전 알고리즘', desc: '잘한 프로그램끼리 숫자를 섞고(교배) 가끔 바꿔(돌연변이) 봐요. 넓게 찾아 막힌 곳을 잘 빠져나오지만 느려요.', tag: '넓게' },
    { id: 'nn', name: '🧠 신경망 · 뉴로에볼루션', desc: '블록 대신 작은 신경망이 센서를 보고 바퀴를 움직이는 법을 배워요. 라인 따라가기·거리 맞추기처럼 계속 반응하는 과제에 좋아요. 순서나 세기가 필요한 과제는 어려워요.', tag: 'AI' },
  ];
  const KEY = 'mscad.trModel';
  let model = 'cem';
  try { const v = localStorage.getItem(KEY); if (MODELS.some(m => m.id === v)) model = v; } catch (e) { }
  const setModel = id => { model = id; try { localStorage.setItem(KEY, id); } catch (e) { } paint(); };

  // ───────────── 탐색 방법 (window.__trs) ─────────────
  let GA = null; // 유전 알고리즘: 지난 세대 순위
  const clampSd = (v, d) => Math.max(d.sd0 * 0.03, Math.min(d.sd0 * 2, v));
  const pick = (dims, lim, f) => dims.map((d, w) => (w < lim ? d.q(f(d, w)) : 0));
  window.__trs = {
    on: () => model === 'hill' || model === 'ga',
    gen(c) {
      const { x, N, dims, lim, mean, sd, best, gauss } = c;
      if (model === 'hill') { while (x.length < N) x.push(pick(dims, lim, (d, w) => best.P[w] + sd[w] * gauss())); return; }
      // ga
      if (!GA || !GA.length || c.g === 0) { while (x.length < N) x.push(pick(dims, lim, (d, w) => mean[w] + sd[w] * gauss())); return; }
      for (const e of GA.slice(1, 3)) if (x.length < N) x.push(e.slice()); // 엘리트는 그대로 다음 세대로
      const half = GA.slice(0, Math.max(2, Math.ceil(GA.length / 2)));
      const tour = () => { const a = half[Math.floor(Math.random() * half.length)], b = half[Math.floor(Math.random() * half.length)]; return GA.indexOf(a) < GA.indexOf(b) ? a : b; };
      while (x.length < N) {
        const pa = tour(), pb = tour();
        x.push(pick(dims, lim, (d, w) => { let v = Math.random() < 0.5 ? pa[w] : pb[w]; if (Math.random() < 0.3) v += sd[w] * gauss(); return v; }));
      }
    },
    update(c) {
      const { ranked, dims, sd, best, still } = c;
      if (model === 'hill') return { mean: best.P.slice(), sd: sd.map((v, w) => clampSd(v * (still === 0 ? 1.3 : 0.75), dims[w])) };
      GA = ranked.map(w => w.P.slice());
      return { mean: best.P.slice(), sd: sd.map((v, w) => Math.max(dims[w].sd0 * 0.1, v * 0.93)) };
    },
    spec(task) { GA = null; if (model !== 'nn') return null; return nnSpec(task); },
    apply() {
      const K = lastNN; if (!K || !nnBest || !trainedNN) return false;
      applyNN(K, nnBest); return true;
    },
  };

  // ───────────── 신경망 ─────────────
  const H = 6;
  const nnIn = () => {
    const q = U.robot && U.robot(); const s = (q && q.sensors) || [];
    const ins = [];
    for (const x of s) if (x.kind === 'color') ins.push({ k: 'color', p: x.port });
    for (const x of s) if (x.kind === 'distance') ins.push({ k: 'distance', p: x.port });
    return ins.slice(0, 4);
  };
  const nW = n => (n + 1) * H + (H + 1) * 2;
  const tanh = v => { v = Math.max(-10, Math.min(10, v)); const e = Math.exp(2 * v); return (e - 1) / (e + 1); };
  // forward pass (the same arithmetic as the Python on the hub)
  window.__nnF = (net, x) => {
    const n = x.length, w = net.W; let k = 0; const h = [];
    for (let j = 0; j < H; j++) { let s = w[k + n]; for (let i = 0; i < n; i++) s += w[k + i] * x[i]; k += n + 1; h.push(tanh(s)); }
    const o = [];
    for (let j = 0; j < 2; j++) { let s = w[k + H]; for (let i = 0; i < H; i++) s += w[k + i] * h[i]; k += H + 1; o.push(tanh(s)); }
    return [Math.round(o[0] * net.S), Math.round(o[1] * net.T)];
  };
  const JG = window.javascript && window.javascript.javascriptGenerator;
  const PY = window.python && window.python.pythonGenerator;
  const fake = (f, g) => ({ type: 'x', id: 'x', getFieldValue: n => f[n], getInputTargetBlock: () => null, getInput: () => ({}), isEnabled: () => true, getSurroundParent: () => null, getParent: () => null, getRootBlock() { return this; }, ...g });
  const jsIn = x => {
    const r = x.k === 'color' ? JG.forBlock.rm_color_value(fake({ PORT: x.p, WHAT: 'reflection' }), JG) : JG.forBlock.rm_ultra_distance(fake({ PORT: x.p }), JG);
    const e = Array.isArray(r) ? r[0] : r;
    return x.k === 'color' ? `(${e}) / 100` : `Math.min(${e}, 1000) / 1000`;
  };
  const pyIn = x => {
    const r = x.k === 'color' ? PY.forBlock.rm_color_value(fake({ PORT: x.p, WHAT: 'reflection' }), PY) : PY.forBlock.rm_ultra_distance(fake({ PORT: x.p }), PY);
    const e = Array.isArray(r) ? r[0] : r;
    return x.k === 'color' ? `${e} / 100` : `min(${e}, 1000) / 1000`;
  };
  const loopJS = (netExpr, ins) => {
    try { JG.forBlock.rm_drive_stop(fake({}), JG); } catch (e) { } // registers the drive base like the drive blocks do
    return `{ const __net = ${netExpr};\nwhile (true) {\n  const __o = window.__nnF(__net, [${ins.map(jsIn).join(', ')}]);\n  await api.wbDrive(__o[0], __o[1]);\n  await api.wait(0.02);\n} }\n`;
  };
  let lastNN = null, nnBest = null, trainedNN = false;
  function nnSpec(task) {
    const ins = nnIn(); if (!ins.length) return t('로봇에 컬러 센서나 거리 센서가 없어 신경망을 쓸 수 없습니다');
    const n = nW(ins.length), S = 300, T = 180;
    const src = loopJS(`{ W: P, S: ${S}, T: ${T} }`, ins);
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const fn = new AsyncFunction('api', 'P', src);
    lastNN = { ins, S, T }; nnBest = null; trainedNN = true;
    const dims = Array.from({ length: n }, () => ({ m0: 0, sd0: 1, q: v => Math.round(Math.max(-8, Math.min(8, v)) * 1000) / 1000 }));
    return { N: 16, dims, fn, nn: true, onBest(P) { nnBest = P.slice(); drawNet(); } };
  }
  // ───────────── 「🧠 신경망으로 주행」 블록 ─────────────
  const inLabel = ins => ins.map(x => (x.k === 'color' ? t('컬러 {0} 반사광', x.p) : t('거리 {0}', x.p))).join(', ');
  Bly.Blocks.rm_nn_drive = {
    init() {
      this.appendDummyInput().appendField(t('🧠 신경망으로 주행'), 'T').appendField('', 'INFO');
      this.setPreviousStatement(true); this.setNextStatement(false);
      this.setColour('#00A88F'); this.setTooltip(t('nn.tip'));
      setTimeout(() => this.refresh && this.refresh(), 0);
    },
    refresh() { try { const d = JSON.parse(this.data || '{}'); if (d.in) this.setFieldValue(' (' + t('입력 {0} · 숨은 층 {1} · 가중치 {2}개', inLabel(d.in), d.H || H, (d.W || []).length) + ')', 'INFO'); } catch (e) { } },
  };
  const netOf = b => { try { return JSON.parse(b.data || '{}'); } catch (e) { return {}; } };
  if (JG) JG.forBlock.rm_nn_drive = b => { const d = netOf(b); if (!d.in || !d.W) return ''; return loopJS(JSON.stringify({ W: d.W, S: d.S || 300, T: d.T || 180 }), d.in); };
  if (PY) PY.forBlock.rm_nn_drive = b => {
    const d = netOf(b); if (!d.in || !d.W) return '';
    const drive = (PY.forBlock.rm_drive_stop(fake({}), PY) || '').split('.')[0] || 'drive_base';
    const wait = (PY.forBlock.rm_wait(fake({}), PY) || 'wait(').split('(')[0] || 'wait';
    if (!PY.rmImports_.has('umath')) PY.rmImports_.set('umath', new Set()); PY.rmImports_.get('umath').add('exp');
    PY.rmSetup_.set('nn_fn', ['def nn_tanh(v):', '    v = max(-10, min(10, v))', '    e = exp(2 * v)', '    return (e - 1) / (e + 1)', '',
      'def nn_run(w, x, s_max, t_max):', '    n = len(x)', '    k = 0', '    h = []', `    for j in range(${H}):`, '        s = w[k + n]', '        for i in range(n):', '            s += w[k + i] * x[i]',
      '        k += n + 1', '        h.append(nn_tanh(s))', '    o = []', '    for j in range(2):', `        s = w[k + ${H}]`, `        for i in range(${H}):`, '            s += w[k + i] * h[i]',
      `        k += ${H} + 1`, '        o.append(nn_tanh(s))', '    return round(o[0] * s_max), round(o[1] * t_max)'].join('\n'));
    const v = 'nn_w_' + (b.id || 'x').replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
    PY.rmSetup_.set(v, `${v} = [${d.W.map(x => +(+x).toFixed(3)).join(', ')}]`);
    return `while True:\n    nn_s, nn_t = nn_run(${v}, [${d.in.map(pyIn).join(', ')}], ${d.S || 300}, ${d.T || 180})\n    ${drive}.drive(nn_s, nn_t)\n    ${wait}(20)\n`;
  };
  function applyNN(K, P) {
    const ws = W.ws(); if (!ws) return;
    Bly.Events.setGroup(true);
    try {
      ws.clear();
      const start = ws.newBlock('rm_start'); start.initSvg(); start.render(); start.moveBy(30, 30);
      const nb = ws.newBlock('rm_nn_drive'); nb.data = JSON.stringify({ in: K.ins, H, W: P, S: K.S, T: K.T }); nb.initSvg(); nb.render(); nb.refresh();
      start.nextConnection.connect(nb.previousConnection);
    } finally { Bly.Events.setGroup(false); }
    try { W.proj().program = Bly.serialization.workspaces.save(ws); W.save(); } catch (e) { }
    const st = $('#trStatus'); if (st) st.textContent = t('신경망 블록을 넣었습니다');
  }
  // network picture (line colour = sign, thickness = size of the weight)
  function drawNet() {
    const cv = $('#trNnCanvas'); if (!cv || !lastNN) return;
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, n = lastNN.ins.length, P = nnBest;
    g.clearRect(0, 0, w, h);
    const col = (x, cnt, i) => [x, (h / (cnt + 1)) * (i + 1)];
    const L0 = Array.from({ length: n + 1 }, (_, i) => col(30, n + 1, i)), L1 = Array.from({ length: H }, (_, i) => col(w / 2, H, i)), L2 = [col(w - 30, 2, 0), col(w - 30, 2, 1)];
    let k = 0;
    const line = (a, b, v) => { if (!P) { g.strokeStyle = 'rgba(128,128,128,.25)'; g.lineWidth = 1; } else { g.strokeStyle = v >= 0 ? 'rgba(30,110,220,.75)' : 'rgba(220,60,40,.75)'; g.lineWidth = Math.min(5, 0.4 + Math.abs(v) * 0.8); } g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    for (let j = 0; j < H; j++) { for (let i = 0; i <= n; i++) line(L0[i], L1[j], P ? P[k + i] : 0); k += n + 1; }
    for (let j = 0; j < 2; j++) { for (let i = 0; i < H; i++) line(L1[i], L2[j], P ? P[k + i] : 0); k += H + 1; }
    const dot = (p, c) => { g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1], 7, 0, Math.PI * 2); g.fill(); };
    L0.forEach((p, i) => dot(p, i < n ? '#00A88F' : '#9aa4b2')); L1.forEach(p => dot(p, '#6c7a89')); L2.forEach(p => dot(p, '#f0a400'));
    g.fillStyle = getComputedStyle(cv).color || '#555'; g.font = '11px system-ui,sans-serif'; g.textBaseline = 'middle';
    lastNN.ins.forEach((x, i) => g.fillText(x.k === 'color' ? 'C' + x.p : 'D' + x.p, 2, L0[i][1] - 12));
    g.textAlign = 'right'; g.fillText('⇧', w - 4, L2[0][1] - 12); g.fillText('↻', w - 4, L2[1][1] - 12);
  }

  // ───────────── 학습 창에 카드 넣기 ─────────────
  const css = document.createElement('style');
  css.textContent = '#trModels{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px;margin:4px 0}#trModels .tm{border:1px solid var(--line);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column;gap:3px;font-size:12px;background:var(--panel)}#trModels .tm[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)}#trModels .tm b{font-size:13px}#trModels .tm .d{color:var(--muted);line-height:1.35}#trModels .tm .r{display:flex;justify-content:space-between;align-items:center;margin-top:auto}#trModels .tag{font-size:11px;border-radius:9px;padding:0 6px;background:color-mix(in srgb,var(--accent) 18%,transparent)}#trNn{font-size:12px}#trNnCanvas{width:100%;max-width:300px;height:auto;display:block;margin-top:4px;color:var(--muted)}';
  document.head.appendChild(css);
  function paint() {
    const box = $('#trModels'); if (!box) return;
    const busy = !!(U.sim && U.sim() && U.sim().training);
    box.innerHTML = MODELS.map(m => `<div class="tm" aria-pressed="${m.id === model}"><b>${esc(t(m.name))}</b><span class="d">${esc(t(m.desc))}</span><span class="r"><span class="tag">${esc(t(m.tag))}</span>${m.id === model ? `<span class="label">✓ ${esc(t('선택됨'))}</span>` : `<button class="small" data-tm="${m.id}"${busy ? ' disabled' : ''}>${esc(t('사용'))}</button>`}</span></div>`).join('');
    const nn = model === 'nn';
    const row = $('#trModeTune') && $('#trModeTune').parentElement; if (row) row.style.display = nn ? 'none' : '';
    const note = $('#trModeNote'); if (note) note.style.display = nn ? 'none' : '';
    const prm = $('#trParams'), lab = $('#trListLabel'), info = $('#trNn');
    if (prm) prm.style.display = nn ? 'none' : ''; if (lab) lab.style.display = nn ? 'none' : '';
    if (info) {
      info.style.display = nn ? '' : 'none';
      if (nn) {
        const ins = nnIn();
        info.innerHTML = ins.length ? `<div>${esc(t('신경망 구조: 입력 {0}개 ({1}) → 숨은 층 {2}개 → 출력 2개 (속도·회전) · 가중치 {3}개', ins.length, inLabel(ins), H, nW(ins.length)))}</div><canvas id="trNnCanvas" width="300" height="150"></canvas><div style="color:var(--muted);margin-top:2px">${esc(t('"적용"을 누르면 지금 프로그램 대신 「🧠 신경망으로 주행」 블록이 들어갑니다 (지금 프로그램은 🕘 기록에 남습니다).'))}</div>`
          : `<div style="color:#c62828">${esc(t('로봇에 컬러 센서나 거리 센서가 없어 신경망을 쓸 수 없습니다'))}</div>`;
        if (lastNN && JSON.stringify(lastNN.ins) !== JSON.stringify(ins)) { lastNN = null; nnBest = null; }
        if (!lastNN && ins.length) lastNN = { ins, S: 300, T: 180 };
        drawNet();
      }
    }
  }
  function inject() {
    const note = $('#trModeNote'); if (!note || $('#trModels')) { paint(); return; }
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="trrow" style="align-items:center"><span class="label">${esc(t('학습 모델'))}</span><details style="font-size:12px"><summary style="cursor:pointer">${esc(t('학습 모델이 뭐예요?'))}</summary><div style="max-width:620px;line-height:1.45;margin-top:4px">${t('help')}</div></details></div><div id="trModels"></div>`;
    note.after(wrap);
    const prm = $('#trParams'); if (prm) { const d = document.createElement('div'); d.id = 'trNn'; prm.after(d); }
    $('#trModels').addEventListener('click', e => { const b = e.target.closest('button[data-tm]'); if (b) { setModel(b.dataset.tm); if (model === 'nn' && $('#trModeTune') && $('#trModeTune').getAttribute('aria-pressed') !== 'true') $('#trModeTune').click(); } });
    if (model === 'nn' && $('#trModeTune') && $('#trModeTune').getAttribute('aria-pressed') !== 'true') $('#trModeTune').click();
    paint();
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#simTrain')) setTimeout(inject, 0); });
  // keep the cards in step while training (disable "use" buttons) and show the model in the status line
  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    if (e.target.closest('#trStart')) {
      trainedNN = false; // set again by nnSpec when the neural network trains
      setTimeout(paint, 0);
      const name = (MODELS.find(m => m.id === model) || {}).name || '';
      setTimeout(() => { const st = $('#trStatus'); if (st && !/·\s*$/.test(st.textContent)) st.title = t('학습 모델: {0}', t(name)); }, 50);
    }
    if (e.target.closest('#trStop')) setTimeout(paint, 300);
  }, true);
  if (!JG || !PY) console.warn('trainmodel: block generators not found');
  window.__trainModel = { get model() { return model; }, set: setModel, nnF: window.__nnF };
})();
