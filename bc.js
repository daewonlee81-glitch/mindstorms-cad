// bc.js — 「🧒 따라 하기 학습」: 학생이 운전해서 보여 준 시범으로 작은 VLA(보고·듣고·움직이는 신경망)를 브라우저 안에서 학습시킵니다.
//   ① 블록 「🎮 운전해서 가르치기 · 지시: …」 — 실행하면 키보드(↑ ← → , 스페이스 = 여기서 멈춤)나 화면 버튼으로 로봇을 운전.
//      0.1초마다 [AI의 눈 24×18 그림 + 지시 문장 + 누른 행동] 한 장면을 모읍니다 (아무 키도 안 누르면 모으지 않음).
//   ② 학습 창 — 모은 장면으로 신경망(입력 1296 그림 + 32 낱말 → 숨은 칸 24 → 행동 6가지)을 학습. 정답률 그래프(연습 문제 / 처음 보는 장면).
//   ③ 블록 「👁️ VLA로 주행」(vla.js) — 두뇌가 '내가 가르친 모델'이면 이 신경망으로 주행. AI의 눈과 행동 확률 막대를 보여 줌.
// AI 카메라(1인칭·3인칭·위에서)는 vla.js 가 정하고, 장면·모델은 카메라마다 따로 씁니다.
// 장면·모델은 IndexedDB(mscad-bc)에 저장, 파일(.json)로 저장·열기 가능. PC 도우미(vla-helper)가 없어도 됩니다.
(() => {
  'use strict';
  const C = window.__cad, X = C && C.ext, U = window.__umc, Bly = window.Blockly, V = window.__vla;
  if (!C || !X || !U || !Bly || !V) return;

  // ───────── 말 ─────────
  const EN = {
    '🧒 따라 하기 학습': '🧒 Learn by imitation', 'VLA 두뇌': 'VLA brain', '내가 가르친 모델': 'Model I taught', 'PC 도우미': 'PC helper',
    '학습 창 열기': 'Open training window', '시범 장면': 'demo scenes', '모델 없음': 'no model yet', '모델': 'model', '정답률': 'accuracy',
    'AI의 눈': "AI's eye", '멈춤': 'Stop', '앞으로': 'Forward', '왼쪽 돌기': 'Turn left', '오른쪽 돌기': 'Turn right', '앞+왼쪽': 'Fwd + left', '앞+오른쪽': 'Fwd + right',
    '🎮 운전해서 가르치기 · 지시:': '🎮 Teach by driving · instruction:', '빨간 칸으로 가': 'go to the red square',
    'teach.tip': 'Run it and drive with the keys (↑ ← →, Space = stop here). Every 0.1 s the camera picture, this instruction and your key are saved as one scene.',
    'keys': 'Keys: ↑ forward · ← → turn · ↑+←/→ forward while turning · Space = "stop here" (arrived). Scenes are saved only while you press a key.',
    '① 모은 시범': '① Demonstrations', '② 학습시키기': '② Train', '③ 달리게 하기': '③ Let it drive',
    '지시': 'Instruction', '장면': 'Scenes', '행동별': 'By action', '모두 지우기': 'Clear all', '💾 파일로 저장': '💾 Save to file', '📂 파일 열기': '📂 Open file',
    '아직 시범이 없어요. 「🎮 운전해서 가르치기」 블록으로 운전해 보세요.': 'No demonstrations yet. Drive with the 「🎮 Teach by driving」 block.',
    '▶ 학습 시작': '▶ Start training', '■ 멈추기': '■ Stop', '가르치는 횟수': 'Rounds', '학습 중…': 'training…',
    '연습 문제': 'practice questions', '처음 보는 장면': 'unseen scenes', '번째': 'round',
    'run.help': 'Put 「👁️ Drive with VLA」 under 「when program starts」, write the same instruction you taught, choose brain = "Model I taught" and press ▶.',
    '아직 가르친 모델이 없어요 — 학습 창에서 먼저 학습시키세요': 'No trained model yet — train it first in the training window',
    '처음 듣는 낱말': 'unknown words', '지우기': 'Delete', '정말 모든 시범과 모델을 지울까요?': 'Delete all demonstrations and the model?',
    '시범이 너무 적어요 (최소 30장면)': 'Too few scenes (at least 30)', '장면을 모으는 중': 'collecting scenes', '이번에 모은 장면': 'scenes this run',
    '학습 끝': 'Training done', '🔍 AI 속 들여다보기': '🔍 Look inside the AI', 'AI 카메라': 'AI camera', '1인칭 (로봇 눈)': '1st person (robot eye)', '3인칭 (뒤에서 따라가기)': '3rd person (follows from behind)', '위에서 (천장 카메라)': 'Top (ceiling camera)', '카메라': 'Camera',
    '이 모델은 이 카메라로 배웠어요': 'This model learned with this camera', '카메라를 바꾸거나 다시 학습하세요': 'switch the camera or train again',
    'wgt.tip': 'Weight pictures — the "favourite picture" of each of the 24 hidden cells (mid grey = 0, brighter or stronger colour = bigger weight). They start as random noise and take on shapes such as target colours and lines while learning.',
    'cam.tip': 'The camera decides what the AI sees. Scenes and models are kept separately for each camera — teach and train again after switching.', '파일을 열 수 없습니다': 'Cannot open the file', '닫기': 'Close',
  };
  const KO = {
    'teach.tip': '실행하고 키보드로 운전하세요 (↑ ← →, 스페이스 = 여기서 멈춤). 0.1초마다 카메라 그림 + 이 지시 + 누른 키가 한 장면으로 모입니다.',
    'keys': '키: ↑ 앞으로 · ← → 제자리 돌기 · ↑+←/→ 앞으로 가며 돌기 · 스페이스 = "여기서 멈춰"(도착). 키를 누르고 있을 때만 장면이 모입니다.',
    'wgt.tip': '가중치 그림 — 숨은 칸 24개가 각각 "가장 좋아하는 그림"입니다 (가운데 회색 = 0, 밝거나 색이 진할수록 큰 가중치). 학습 전에는 지글지글한 무작위 그림이었다가, 배우면서 목표 색·선 같은 모양이 생깁니다.',
    'cam.tip': 'AI 카메라가 AI가 보는 그림을 정합니다. 장면과 모델은 카메라마다 따로입니다 — 카메라를 바꾸면 다시 가르치고 학습하세요.',
    'run.help': '「👁️ VLA로 주행」 블록을 「프로그램 시작할 때」 아래에 붙이고, 가르친 것과 같은 지시를 쓰고, 두뇌를 "내가 가르친 모델"로 고른 뒤 ▶ 실행.',
  };
  const lang = () => (document.documentElement.lang || 'ko').slice(0, 2);
  const t = k => (lang() === 'ko' ? (KO[k] || k) : (EN[k] || KO[k] || k));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = V.store;

  // ───────── 행동 6가지 (속도 mm/s, 회전 °/s — 회전 + = 오른쪽) ─────────
  const ACT = [[0, 0], [160, 0], [0, -90], [0, 90], [120, -60], [120, 60]];
  const ANAME = ['멈춤', '앞으로', '왼쪽 돌기', '오른쪽 돌기', '앞+왼쪽', '앞+오른쪽'];
  const CAMN = { first: '1인칭 (로봇 눈)', third: '3인칭 (뒤에서 따라가기)', top: '위에서 (천장 카메라)' }, CAMI = { first: '👁️', third: '🎥', top: '🛰️' };
  const AICON = ['■', '▲', '↺', '↻', '↖', '↗'];
  const NA = 6;

  // ───────── AI의 눈: 96×72 카메라(1인칭·3인칭·위에서 — vla.js 의 AI 카메라 선택) → 24×18 평균 (RGB 1296칸) ─────────
  // 입력 = 그림 1296 + 낱말 32 + 로봇 방향 2(sin·cos — 로봇이 스스로 느끼는 나침반, 실제 VLA 의 '상태' 입력)
  const EW = 24, EH = 18, NI = EW * EH * 3, NL = 32, NS = 2, NIN = NI + NL + NS;
  const eye = () => {
    const r = V.view(V.CW, V.CH); if (!r) return null;
    const out = new Uint8Array(NI), sx = V.CW / EW, sy = V.CH / EH;
    for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) {
      let R = 0, G = 0, B = 0, n = 0;
      for (let y = j * sy; y < (j + 1) * sy; y++) for (let x = i * sx; x < (i + 1) * sx; x++) { const k = (y * V.CW + x) * 4; R += r.img[k]; G += r.img[k + 1]; B += r.img[k + 2]; n++; }
      const o = (j * EW + i) * 3; out[o] = R / n; out[o + 1] = G / n; out[o + 2] = B / n;
    }
    return out;
  };

  // ───────── 지시 문장 → 낱말 32칸 (낱말마다 해시) ─────────
  const words = s => String(s || '').toLowerCase().replace(/[.,!?~·"'()]/g, ' ').split(/\s+/).filter(Boolean);
  const hash = w => { let h = 2166136261; for (const ch of w) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % NL; };
  const langVec = s => { const v = new Float32Array(NL), ws = words(s); for (const w of ws) v[hash(w)] = 1; return v; };

  // ───────── 장면·모델 저장 (IndexedDB) ─────────
  const DB = { db: null };
  const idb = () => DB.db || (DB.db = new Promise((res, rej) => { const q = indexedDB.open('mscad-bc', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
  const kvGet = async k => { try { const d = await idb(); return await new Promise(r => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(null); }); } catch (e) { return null; } };
  const kvSet = async (k, v) => { try { const d = await idb(); await new Promise(r => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = r; tx.onerror = r; }); } catch (e) { } };
  const B = { data: [], model: null, hist: null, live: null, keys: new Set(), teaching: false, runN: 0, training: false, note: '' };
  // 장면: { task, a, img(Uint8Array NI) }
  const saveData = () => kvSet('data', B.data.map(d => ({ task: d.task, a: d.a, img: d.img, cam: d.cam || 'first', th: d.th || 0 })));
  const saveModel = () => kvSet('model', B.model);
  (async () => {
    const d = await kvGet('data'); if (Array.isArray(d)) B.data = d.map(x => ({ task: x.task, a: x.a, img: new Uint8Array(x.img), cam: x.cam || 'first', th: x.th || 0 }));
    const m = await kvGet('model'); if (m && m.W1 && m.U && m.nin === NIN) B.model = m;
    draw(true);
  })();

  // ───────── 신경망: x(1328) → tanh(24) → softmax(6) ─────────
  const NH = 24, LS = 5; // LS: 낱말 칸 세기 (그림 1296칸에 묻히지 않게)
  const feat = (img, task, th) => { const x = new Float32Array(NIN); for (let i = 0; i < NI; i++) x[i] = img[i] / 255 - 0.5; x.set(langVec(task).map(v => v * LS), NI); x[NI + NL] = Math.sin(th || 0) * LS; x[NI + NL + 1] = Math.cos(th || 0) * LS; return x; };
  const newModel = () => {
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
    const W1 = new Float32Array(NIN * NH).map(() => rnd() * 2 * Math.sqrt(1 / NIN) * 1.7), W2 = new Float32Array(NH * NA).map(() => rnd() * 2 * Math.sqrt(1 / NH) * 1.7);
    return { W1, b1: new Float32Array(NH), W2, b2: new Float32Array(NA), U: new Float32Array(NL * NA * NH), Ub: new Float32Array(NL * NA) };
  };
  const forward = (m, x) => {
    const h = new Float32Array(NH);
    for (let j = 0; j < NH; j++) { let s = m.b1[j]; const o = j * NIN; for (let i = 0; i < NIN; i++) s += m.W1[o + i] * x[i]; h[j] = Math.tanh(s); }
    // 지시 낱말이 "본 것 → 행동" 연결을 바꿈: 출력 무게 = W2 + Σ(낱말 l_w × U_w)  (같은 장면이라도 말이 다르면 다른 행동)
    const ws = []; for (let w = 0; w < NL; w++) if (x[NI + w]) ws.push(w);
    const Wk = new Float32Array(NA * NH); Wk.set(m.W2);
    const z = new Float32Array(NA); let mx = -1e9;
    for (let k = 0; k < NA; k++) {
      let s = m.b2[k];
      if (m.U) for (const w of ws) { const l = x[NI + w], o = (w * NA + k) * NH; s += l * m.Ub[w * NA + k]; for (let j = 0; j < NH; j++) Wk[k * NH + j] += l * m.U[o + j]; }
      for (let j = 0; j < NH; j++) s += Wk[k * NH + j] * h[j]; z[k] = s; if (s > mx) mx = s;
    }
    let sum = 0; for (let k = 0; k < NA; k++) { z[k] = Math.exp(z[k] - mx); sum += z[k]; } for (let k = 0; k < NA; k++) z[k] /= sum;
    return { h, p: z, Wk, ws };
  };
  const predict = (img, task, th) => forward(B.model, feat(img, task, th)).p;
  // 속 들여다보기(vlaviz.js): 한 번의 결정을 단계별로 — 숨은 칸, 확률, 주목한 곳(고른 행동 점수가 그림 칸마다 얼마나 민감한지), 다른 지시였다면
  const inspect = (img, task, th) => {
    const m = B.model; if (!m || !img) return null;
    const x = feat(img, task, th), f = forward(m, x); let a = 0; for (let k = 1; k < NA; k++) if (f.p[k] > f.p[a]) a = k;
    const G = new Float32Array(NI);
    for (let j = 0; j < NH; j++) { const g = f.Wk[a * NH + j] * (1 - f.h[j] * f.h[j]); if (!g) continue; const o = j * NIN; for (let i = 0; i < NI; i++) G[i] += g * m.W1[o + i]; }
    const sal = new Float32Array(EW * EH); for (let k = 0; k < EW * EH; k++) sal[k] = Math.abs(G[k * 3]) + Math.abs(G[k * 3 + 1]) + Math.abs(G[k * 3 + 2]);
    const cf = (m.tasks || []).map(tk => { const q = forward(m, feat(img, tk, th)).p; let b = 0; for (let k = 1; k < NA; k++) if (q[k] > q[b]) b = k; return { task: tk, a: b, p: q[b] }; });
    return { h: f.h, p: f.p, a, sal, cf, Wk: f.Wk, words: words(task).map(w => ({ w, known: (m.vocab || []).includes(w) })) };
  };
  // 숨은 칸 j 가 "가장 좋아하는 그림": 그림 칸·색마다 가중치 부호와 크기 (주황·밝음 = +, 어두움 = −). 128 = 0, 칸마다 가장 큰 값으로 나눔
  //   gmax 를 주면 모든 칸이 같은 잣대(약한 칸은 회색에 가깝게) — 학습 창 가중치 그림
  const prefImg = (m, j, gmax) => {
    const o = j * NIN; let mx = 1e-9; if (gmax) mx = gmax; else for (let i = 0; i < NI; i++) { const v = Math.abs(m.W1[o + i]); if (v > mx) mx = v; }
    const out = new Uint8ClampedArray(EW * EH * 4);
    for (let k = 0; k < EW * EH; k++) { for (let c = 0; c < 3; c++) out[k * 4 + c] = 128 + 127 * Math.max(-1, Math.min(1, m.W1[o + k * 3 + c] / mx)); out[k * 4 + 3] = 255; }
    return out;
  };
  const drawWeights = (cv, m) => {
    if (!cv) return; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); if (!m) return;
    const cols = 8, cw = Math.floor((cv.width - (cols - 1) * 4) / cols), ch = Math.round(cw * EH / EW), tmp = document.createElement('canvas'); tmp.width = EW; tmp.height = EH;
    g.imageSmoothingEnabled = false;
    const all = []; for (let j = 0; j < NH; j++) for (let i = 0; i < NI; i++) all.push(Math.abs(m.W1[j * NIN + i]));
    all.sort((a, b) => a - b); const gmax = Math.max(1e-9, all[Math.floor(all.length * .99)]);
    for (let j = 0; j < NH; j++) { tmp.getContext('2d').putImageData(new ImageData(prefImg(m, j, gmax), EW, EH), 0, 0); const x = (j % cols) * (cw + 4), y = Math.floor(j / cols) * (ch + 14); g.drawImage(tmp, x, y + 12, cw, ch); g.fillStyle = 'rgba(127,127,127,.9)'; g.font = '10px sans-serif'; g.fillText(String(j + 1), x, y + 10); }
  };

  // 학습 (Adam, 묶음 32, 클래스 균형 가중치, 20% 는 "처음 보는 장면"으로 남김)
  const train = async (rounds, onRound) => {
    const mode = V.camMode(), all = B.data.filter(d => (d.cam || 'first') === mode); if (all.length < 30) throw new Error(`${t('시범이 너무 적어요 (최소 30장면)')} · ${t(CAMN[mode])}: ${all.length}`);
    let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const idx = all.map((_, i) => i).sort(() => rnd() - 0.5), nVal = Math.max(5, Math.round(all.length * 0.2));
    const val = idx.slice(0, nVal).map(i => all[i]), tr0 = idx.slice(nVal).map(i => all[i]);
    const tr = [];
    // 장면 늘리기: 그림을 왼쪽·오른쪽으로 한 칸씩 민 것도 같은 행동으로 (카메라가 조금 돌아간 장면 — 0.1초 사이의 각도를 메움)
    // 좌우 뒤집기는 쓰지 않음 — 시범의 "찾을 때 오른쪽으로 돈다" 같은 습관이 뒤집혀 헷갈림
    const shift = (im, k) => { const o = new Uint8Array(NI); for (let j = 0; j < EH; j++) for (let i = 0; i < EW; i++) { const si = Math.min(EW - 1, Math.max(0, i - k)); for (let c = 0; c < 3; c++) o[(j * EW + i) * 3 + c] = im[(j * EW + si) * 3 + c]; } return o; };
    for (const d of tr0) for (const k of [0, -1, 1]) tr.push({ x: feat(k ? shift(d.img, k) : d.img, d.task, d.th), a: d.a });
    const vx = val.map(d => ({ x: feat(d.img, d.task, d.th), a: d.a }));
    const cnt = new Array(NA).fill(0); tr.forEach(d => cnt[d.a]++);
    const cw = cnt.map(c => c ? Math.sqrt(tr.length / (NA * c)) : 0);
    const m = newModel(), P = [m.W1, m.b1, m.W2, m.b2, m.U, m.Ub], M1 = P.map(a => new Float32Array(a.length)), M2 = P.map(a => new Float32Array(a.length));
    const G = P.map(a => new Float32Array(a.length));
    const lr = 0.003, b1 = 0.9, b2 = 0.999, eps = 1e-8, BS = 32; let step = 0;
    const acc = set => { let ok = 0; for (const d of set) { const p = forward(m, d.x).p; let best = 0; for (let k = 1; k < NA; k++) if (p[k] > p[best]) best = k; if (best === d.a) ok++; } return set.length ? ok / set.length : 0; };
    const hist = [{ r: 0, tr: acc(tr), va: acc(vx) }]; onRound && onRound(hist[0], hist, m); // 0번째 = 배우기 전 (거의 찍기)
    for (let r = 0; r < rounds; r++) {
      if (!B.training) break;
      for (let i = tr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [tr[i], tr[j]] = [tr[j], tr[i]]; }
      for (let s = 0; s < tr.length; s += BS) {
        G.forEach(g => g.fill(0));
        const bat = tr.slice(s, s + BS);
        for (const d of bat) {
          const { h, p, Wk, ws } = forward(m, d.x), w = cw[d.a] / bat.length;
          const dz = new Float32Array(NA); for (let k = 0; k < NA; k++) dz[k] = (p[k] - (k === d.a ? 1 : 0)) * w;
          const dh = new Float32Array(NH);
          for (let k = 0; k < NA; k++) {
            G[3][k] += dz[k];
            for (let j = 0; j < NH; j++) { G[2][k * NH + j] += dz[k] * h[j]; dh[j] += dz[k] * Wk[k * NH + j]; }
            for (const wd of ws) { const l = d.x[NI + wd], o = (wd * NA + k) * NH; G[5][wd * NA + k] += dz[k] * l; for (let j = 0; j < NH; j++) G[4][o + j] += dz[k] * h[j] * l; }
          }
          for (let j = 0; j < NH; j++) {
            const g = dh[j] * (1 - h[j] * h[j]); if (!g) continue; G[1][j] += g; const o = j * NIN, x = d.x;
            for (let i = 0; i < NIN; i++) if (x[i]) G[0][o + i] += g * x[i];
          }
        }
        step++;
        const c1 = 1 - Math.pow(b1, step), c2 = 1 - Math.pow(b2, step);
        for (let q = 0; q < P.length; q++) { const p = P[q], g = G[q], a1 = M1[q], a2 = M2[q]; for (let i = 0; i < p.length; i++) { const gi = g[i] + (q === 0 || q === 2 ? 1e-4 * p[i] : 0); a1[i] = b1 * a1[i] + (1 - b1) * gi; a2[i] = b2 * a2[i] + (1 - b2) * gi * gi; p[i] -= lr * (a1[i] / c1) / (Math.sqrt(a2[i] / c2) + eps); } }
      }
      const h = { r: r + 1, tr: acc(tr), va: acc(vx) }; hist.push(h); onRound && onRound(h, hist, m);
      await new Promise(res => setTimeout(res, 0));
    }
    const tasks = [...new Set(all.map(d => d.task))];
    return { W1: m.W1, b1: m.b1, W2: m.W2, b2: m.b2, U: m.U, Ub: m.Ub, nin: NIN, cam: mode, vocab: [...new Set(tasks.flatMap(words))], tasks, n: all.length, acc: hist.length ? hist[hist.length - 1] : null, hist, at: new Date().toISOString() };
  };

  // ───────── 키보드·화면 버튼 ─────────
  const KEYS = { ArrowUp: 'u', KeyW: 'u', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', Space: 's' };
  const keyAct = () => {
    const k = B.keys; if (k.has('s')) return 0;
    const u = k.has('u'), l = k.has('l') && !k.has('r'), r = k.has('r') && !k.has('l');
    if (u && l) return 4; if (u && r) return 5; if (u) return 1; if (l) return 2; if (r) return 3; return -1;
  };
  const onKey = down => e => {
    if (!B.teaching) return; const k = KEYS[e.code]; if (!k) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    e.preventDefault(); e.stopPropagation(); down ? B.keys.add(k) : B.keys.delete(k);
  };
  window.addEventListener('keydown', onKey(true), true); window.addEventListener('keyup', onKey(false), true);
  window.addEventListener('blur', () => B.keys.clear());

  // ───────── 가르치기·주행 루프 ─────────
  const teach = async (api, task) => {
    B.teaching = true; B.runN = 0; B.keys.clear(); B.note = t('keys'); draw(true);
    let last = -1;
    try {
      while (X.simRunning) {
        const img = eye(), a = keyAct(), p0 = U.pose();
        B.live = { img, a, p: null, task, th: p0 ? p0.th : 0, teach: true }; B.ticks = (B.ticks || 0) + 1;
        if (a >= 0 && img) { B.data.push({ task, a, img, cam: V.camMode(), th: p0 ? p0.th : 0 }); B.runN++; }
        if (a !== last) { const v = ACT[a < 0 ? 0 : a]; await api.wbDrive(v[0], v[1]); last = a; }
        await api.wait(0.1);
      }
    } finally {
      B.teaching = false; B.keys.clear(); if (B.runN) saveData(); B.note = B.runN ? `${t('이번에 모은 장면')}: ${B.runN}` : ''; draw(true);
    }
  };
  const drive = async (api, task) => {
    if (!B.model) { B.note = t('아직 가르친 모델이 없어요 — 학습 창에서 먼저 학습시키세요'); draw(true); await api.wbDrive(0, 0); throw new Error(B.note); }
    if (B.model.cam !== V.camMode()) { B.note = `${t('이 모델은 이 카메라로 배웠어요')}: ${t(CAMN[B.model.cam])} — ${t('카메라를 바꾸거나 다시 학습하세요')}`; draw(true); await api.wbDrive(0, 0); throw new Error(B.note); }
    const unk = words(task).filter(w => !B.model.vocab.includes(w));
    B.note = unk.length ? `${t('처음 듣는 낱말')}: ${unk.join(', ')}` : ''; draw(true);
    let last = -1;
    while (X.simRunning) {
      const img = eye(); if (!img) { await api.wait(0.1); continue; }
      const P0 = U.pose(), p = predict(img, task, P0 ? P0.th : 0); let a = 0; for (let k = 1; k < NA; k++) if (p[k] > p[a]) a = k;
      B.live = { img, a, p, task, th: P0 ? P0.th : 0 }; B.ticks = (B.ticks || 0) + 1;
      if (a !== last) { await api.wbDrive(ACT[a][0], ACT[a][1]); last = a; }
      await api.wait(0.1);
    }
  };
  window.__bc = { teach, drive, state: B, eye, predict, inspect, prefImg, NIN, NI, ACT, ANAME, AICON, EW, EH, NH, t, words, keys: B.keys, train: async r => { B.training = true; try { B.model = await train(r || 40); await saveModel(); return B.model.acc; } finally { B.training = false; draw(true); } } };

  // ───────── 블록 「🎮 운전해서 가르치기 · 지시: …」 ─────────
  Bly.Blocks.rm_vla_teach = {
    init() {
      this.appendDummyInput().appendField(t('🎮 운전해서 가르치기 · 지시:'), 'T').appendField(new Bly.FieldTextInput(t('빨간 칸으로 가')), 'TASK');
      this.setPreviousStatement(true); this.setNextStatement(false); this.setColour('#7E57C2'); this.setTooltip(t('teach.tip'));
    },
  };
  const JG = window.javascript && window.javascript.javascriptGenerator, PY = window.python && window.python.pythonGenerator;
  const fake = f => ({ type: 'x', id: 'x', getFieldValue: n => f[n], getInputTargetBlock: () => null, getInput: () => ({}), isEnabled: () => true, getSurroundParent: () => null, getParent: () => null, getRootBlock() { return this; } });
  const genJS = b => { try { JG.forBlock.rm_drive_stop(fake({}), JG); } catch (e) { } return `await window.__bc.teach(api, ${JSON.stringify(String(b.getFieldValue('TASK') || ''))});\n`; };
  const genPY = () => 'print("Teach-by-driving works only in the simulator")\n';
  const install = () => { if (JG && JG.forBlock.rm_vla_teach !== genJS) JG.forBlock.rm_vla_teach = genJS; if (PY && PY.forBlock.rm_vla_teach !== genPY) PY.forBlock.rm_vla_teach = genPY; };
  install(); setInterval(install, 2000);

  // ───────── 그림 도우미 ─────────
  const paintEye = (cv, img) => {
    if (!cv) return; const g = cv.getContext('2d');
    if (!img) { g.fillStyle = '#222'; g.fillRect(0, 0, cv.width, cv.height); return; }
    const id = new ImageData(EW, EH); for (let i = 0; i < EW * EH; i++) { id.data[i * 4] = img[i * 3]; id.data[i * 4 + 1] = img[i * 3 + 1]; id.data[i * 4 + 2] = img[i * 3 + 2]; id.data[i * 4 + 3] = 255; }
    const c = document.createElement('canvas'); c.width = EW; c.height = EH; c.getContext('2d').putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, cv.width, cv.height);
  };
  const bars = (p, a) => ANAME.map((n, k) => {
    const v = p ? p[k] : (k === a ? 1 : 0), on = k === a;
    return `<div class="bcBar${on ? ' on' : ''}"><span>${AICON[k]} ${t(n)}</span><i style="width:${Math.round(v * 100)}%"></i><b>${p ? Math.round(v * 100) + '%' : (on ? '✔' : '')}</b></div>`;
  }).join('');
  const css = document.createElement('style');
  css.textContent = `#bcWrap{margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25)}#bcWrap .row,#bcDlg .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;margin:4px 0}
#bcWrap button,#bcDlg button{font-size:12px;padding:2px 8px}#bcWrap .note,#bcDlg .note{font-size:11px;opacity:.8;line-height:1.5}
.bcEye{width:144px;height:108px;image-rendering:pixelated;border-radius:6px;background:#222}.bcLive{display:flex;gap:8px;align-items:flex-start;margin-top:4px}
.bcBars{flex:1;min-width:120px}.bcBar{position:relative;font-size:11px;height:17px;line-height:17px;margin:1px 0;border-radius:4px;background:rgba(127,127,127,.12);overflow:hidden}
.bcBar span{position:relative;z-index:1;padding-left:4px}.bcBar b{position:absolute;right:4px;top:0;z-index:1;font-weight:600}.bcBar i{position:absolute;left:0;top:0;bottom:0;background:rgba(126,87,194,.28)}.bcBar.on i{background:rgba(126,87,194,.65)}.bcBar.on span{font-weight:700}
.bcPad{display:grid;grid-template-columns:repeat(3,38px);gap:4px;margin:4px 0}.bcPad button{height:34px;font-size:16px!important;touch-action:none;user-select:none}
#bcDlg{position:fixed;left:16px;bottom:16px;width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;z-index:100000;background:var(--bg,#fff);color:inherit;border:1px solid rgba(127,127,127,.35);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:12px 14px}
#bcDlg h3{margin:0 0 6px;font-size:15px}#bcDlg h4{margin:12px 0 4px;font-size:13px}#bcDlg table{width:100%;border-collapse:collapse;font-size:12px}#bcDlg td,#bcDlg th{border-bottom:1px solid rgba(127,127,127,.2);padding:3px 4px;text-align:left}
#bcDlg canvas.chart{width:100%;height:120px;border-radius:6px;background:rgba(127,127,127,.08)}#bcDlg .x{position:absolute;right:10px;top:8px}`;
  document.head.appendChild(css);

  // ───────── 시뮬레이터 칸 ─────────
  let wrap = null, sig = '';
  const summary = () => {
    const m = B.model;
    const mode = V.camMode(), n = B.data.filter(d => (d.cam || 'first') === mode).length;
    return `${CAMI[mode]} ${t('시범 장면')} ${n} · ${m ? `${t('모델')} ${CAMI[m.cam] || ''} ✔ (${t('정답률')} ${m.acc ? Math.round(m.acc.va * 100) : '?'}%)` : t('모델 없음')}`;
  };
  const draw = force => {
    const sim = document.getElementById('sim'); if (sim && sim.hidden) return;
    const vw = document.getElementById('vlaWrap'); if (!vw) return;
    if (!wrap || !document.body.contains(wrap)) { wrap = document.createElement('div'); wrap.id = 'bcWrap'; vw.before(wrap); sig = ''; }
    const brain = V.brain(), active = B.teaching || (X.simRunning && B.live && B.live.p);
    const s2 = JSON.stringify([lang(), brain, summary(), B.teaching, !!active, B.note, B.runN > 0 && B.teaching ? Math.floor(B.runN / 10) : 0, !!X.simRunning]);
    if (force || s2 !== sig) {
      sig = s2;
      wrap.innerHTML = `<div class="label">${t('🧒 따라 하기 학습')}</div>
<div class="row">${t('AI 카메라')}: <select id="bcCam">${['first', 'third', 'top'].map(k => `<option value="${k}">${CAMI[k]} ${t(CAMN[k])}</option>`).join('')}</select></div>
<div class="row">${t('VLA 두뇌')}: <select id="bcBrain"><option value="mine">${t('내가 가르친 모델')}</option><option value="helper">${t('PC 도우미')}</option></select></div>
<div class="row">${esc(summary())}${B.teaching ? ` · ⏺ ${t('장면을 모으는 중')} ${B.runN}` : ''}</div>
<div class="row"><button id="bcOpen">${t('학습 창 열기')}</button><button id="bcViz">${t('🔍 AI 속 들여다보기')}</button></div>
${B.note ? `<div class="note">${esc(B.note)}</div>` : ''}
${B.teaching ? `<div class="bcPad"><span></span><button data-k="u">▲</button><span></span><button data-k="l">◀</button><button data-k="s">■</button><button data-k="r">▶</button></div>` : ''}
<div class="note">${t('AI의 눈')} (24×18) · ${CAMI[V.camMode()]} ${t(CAMN[V.camMode()])}</div><div class="bcLive"><canvas class="bcEye" width="144" height="108"></canvas><div class="bcBars"></div></div>`;
      wrap.querySelector('#bcBrain').value = brain;
      wrap.querySelector('#bcCam').value = V.camMode(); wrap.querySelector('#bcCam').disabled = !!X.simRunning;
      wrap.querySelector('#bcCam').onchange = e => { store('mscad.vla.camera', e.target.value); draw(true); if (dlg && !dlg.hidden) drawDlg(); };
      wrap.querySelector('#bcBrain').onchange = e => { store('mscad.vla.brain', e.target.value); draw(true); };
      wrap.querySelector('#bcOpen').onclick = () => openDlg();
      wrap.querySelector('#bcViz').onclick = () => window.__vlaviz && window.__vlaviz.open();
      wrap.querySelectorAll('.bcPad button').forEach(b => {
        const k = b.dataset.k, on = e => { e.preventDefault(); B.keys.add(k); }, off = () => B.keys.delete(k);
        b.onpointerdown = on; b.onpointerup = off; b.onpointerleave = off; b.onpointercancel = off;
      });
    }
    const L = B.live && (B.teaching || X.simRunning) ? B.live : null;
    paintEye(wrap.querySelector('.bcEye'), L ? L.img : (X.simRunning ? null : eye()));
    const bb = wrap.querySelector('.bcBars'); if (bb) bb.innerHTML = bars(L && L.p, L ? L.a : -1);
  };
  setInterval(() => draw(false), 150);

  // ───────── 학습 창 ─────────
  let dlg = null;
  const openDlg = () => {
    if (!dlg) { dlg = document.createElement('div'); dlg.id = 'bcDlg'; document.body.appendChild(dlg); }
    dlg.hidden = false; drawDlg();
  };
  const drawChart = (cv, hist) => {
    if (!cv) return; const r = window.devicePixelRatio || 1, W = cv.clientWidth || 400, H = cv.clientHeight || 120;
    cv.width = W * r; cv.height = H * r; const g = cv.getContext('2d'); g.scale(r, r); g.clearRect(0, 0, W, H);
    const L = 34, Rr = 8, T = 10, Bt = 18, x = i => L + (W - L - Rr) * (hist.length < 2 ? 0 : i / (hist.length - 1)), y = v => T + (H - T - Bt) * (1 - v);
    g.strokeStyle = 'rgba(127,127,127,.25)'; g.fillStyle = 'rgba(127,127,127,.9)'; g.font = '10px sans-serif'; g.lineWidth = 1;
    for (const v of [0, .5, 1]) { g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - Rr, y(v)); g.stroke(); g.fillText(`${v * 100}%`, 2, y(v) + 3); }
    const line = (key, col) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); hist.forEach((h, i) => (i ? g.lineTo(x(i), y(h[key])) : g.moveTo(x(i), y(h[key])))); g.stroke(); };
    if (hist.length) { line('tr', '#7E57C2'); line('va', '#F57C00'); }
    g.fillStyle = '#7E57C2'; g.fillText(`— ${t('연습 문제')}`, L + 4, H - 4); g.fillStyle = '#F57C00'; g.fillText(`— ${t('처음 보는 장면')}`, L + 110, H - 4);
  };
  const drawDlg = () => {
    if (!dlg || dlg.hidden) return;
    const byTask = {}; B.data.forEach(d => { const cm = d.cam || 'first', key = cm + '\u0001' + d.task; const o = byTask[key] || (byTask[key] = { task: d.task, cam: cm, n: 0, c: new Array(NA).fill(0) }); o.n++; o.c[d.a]++; });
    const rows = Object.entries(byTask).map(([k, o]) => `<tr${o.cam === V.camMode() ? '' : ' style="opacity:.5"'}><td title="${esc(t(CAMN[o.cam]))}">${CAMI[o.cam]}</td><td>${esc(o.task)}</td><td>${o.n}</td><td>${o.c.map((c, i) => c ? `${AICON[i]}${c}` : '').filter(Boolean).join(' ')}</td><td><button data-del="${esc(k)}">🗑</button></td></tr>`).join('');
    const m = B.model, rounds = +(store('mscad.bc.rounds') || 40);
    dlg.innerHTML = `<button class="x" id="bcX" title="${t('닫기')}">✕</button><h3>${t('🧒 따라 하기 학습')}</h3>
<h4>${t('① 모은 시범')}</h4>
<div class="note">${t('AI 카메라')}: ${CAMI[V.camMode()]} ${t(CAMN[V.camMode()])} — ${t('cam.tip')}</div>
${rows ? `<table><tr><th>${t('카메라')}</th><th>${t('지시')}</th><th>${t('장면')}</th><th>${t('행동별')}</th><th></th></tr>${rows}</table>` : `<div class="note">${t('아직 시범이 없어요. 「🎮 운전해서 가르치기」 블록으로 운전해 보세요.')}</div>`}
<div class="note">${t('keys')}</div>
<div class="row"><button id="bcSave">${t('💾 파일로 저장')}</button><button id="bcLoad">${t('📂 파일 열기')}</button><button id="bcClear">${t('모두 지우기')}</button><input type="file" id="bcFile" accept=".json" hidden></div>
<h4>${t('② 학습시키기')}</h4>
<div class="row">${t('가르치는 횟수')}: <select id="bcRounds">${[20, 40, 80].map(n => `<option ${n === rounds ? 'selected' : ''}>${n}</option>`).join('')}</select>
<button id="bcTrain">${B.training ? t('■ 멈추기') : t('▶ 학습 시작')}</button><span id="bcProg"></span></div>
<canvas class="chart"></canvas>
<div class="note">${t('wgt.tip')}</div><canvas class="wgt" width="440" height="160" style="width:100%;max-width:440px;image-rendering:pixelated"></canvas>
<div class="note" id="bcRes">${m && m.acc ? `${t('학습 끝')} · ${CAMI[m.cam] || ''} ${t('연습 문제')} ${Math.round(m.acc.tr * 100)}% · ${t('처음 보는 장면')} ${Math.round(m.acc.va * 100)}% · ${m.n} ${t('장면')} · ${esc(m.tasks.join(' / '))}` : t('모델 없음')}</div>
<h4>${t('③ 달리게 하기')}</h4><div class="note">${t('run.help')}</div>`;
    drawChart(dlg.querySelector('canvas.chart'), (m && m.hist) || []);
    drawWeights(dlg.querySelector('canvas.wgt'), m);
    dlg.querySelector('#bcX').onclick = () => { dlg.hidden = true; };
    dlg.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const k = b.dataset.del; B.data = B.data.filter(d => ((d.cam || 'first') + '\u0001' + d.task) !== k); saveData(); drawDlg(); draw(true); });
    dlg.querySelector('#bcClear').onclick = () => { if (!confirm(t('정말 모든 시범과 모델을 지울까요?'))) return; B.data = []; B.model = null; saveData(); saveModel(); drawDlg(); draw(true); };
    dlg.querySelector('#bcRounds').onchange = e => store('mscad.bc.rounds', e.target.value);
    dlg.querySelector('#bcSave').onclick = () => {
      const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
      const out = { format: 'robomakers-vla-bc', version: 1, saved: new Date().toISOString(), eye: [EW, EH], actions: ANAME, data: B.data.map(d => ({ task: d.task, a: d.a, img: b64(d.img), cam: d.cam || 'first', th: d.th || 0 })),
        model: B.model ? { ...B.model, W1: b64(new Uint8Array(B.model.W1.buffer)), b1: b64(new Uint8Array(B.model.b1.buffer)), W2: b64(new Uint8Array(B.model.W2.buffer)), b2: b64(new Uint8Array(B.model.b2.buffer)), U: b64(new Uint8Array(B.model.U.buffer)), Ub: b64(new Uint8Array(B.model.Ub.buffer)) } : null };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = `vla-teach-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    const file = dlg.querySelector('#bcFile');
    dlg.querySelector('#bcLoad').onclick = () => file.click();
    file.onchange = async () => {
      try {
        const j = JSON.parse(await file.files[0].text()); if (j.format !== 'robomakers-vla-bc') throw 0;
        const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), f32 = s => new Float32Array(u8(s).buffer);
        B.data = (j.data || []).map(d => ({ task: d.task, a: d.a, img: u8(d.img), cam: d.cam || 'first', th: d.th || 0 }));
        B.model = j.model && j.model.nin === NIN ? { ...j.model, W1: f32(j.model.W1), b1: f32(j.model.b1), W2: f32(j.model.W2), b2: f32(j.model.b2), U: f32(j.model.U), Ub: f32(j.model.Ub) } : null;
        saveData(); saveModel(); drawDlg(); draw(true);
      } catch (e) { alert(t('파일을 열 수 없습니다')); }
    };
    dlg.querySelector('#bcTrain').onclick = async () => {
      if (B.training) { B.training = false; return; }
      const prog = dlg.querySelector('#bcProg'), cv = dlg.querySelector('canvas.chart'), n = +dlg.querySelector('#bcRounds').value;
      B.training = true; drawDlg();
      try {
        const m2 = await train(n, (h, hist, mm) => { const p = dlg.querySelector('#bcProg'); if (p) p.textContent = `${t('학습 중…')} ${h.r}/${n} · ${t('연습 문제')} ${Math.round(h.tr * 100)}% · ${t('처음 보는 장면')} ${Math.round(h.va * 100)}%`; drawChart(dlg.querySelector('canvas.chart'), hist); drawWeights(dlg.querySelector('canvas.wgt'), mm); });
        B.model = m2; await saveModel();
      } catch (e) { alert(e.message || e); }
      B.training = false; drawDlg(); draw(true); void prog; void cv;
    };
  };
})();
