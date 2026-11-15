#!/usr/bin/env python3
"""MindStorms CAD 자동 회귀 테스트.

    python tests/run.py            # 빠른 테스트 (약 2~4분)
    python tests/run.py --full     # + 시범→학습→주행 (약 5~8분 더)
    python tests/run.py -k camera  # 이름에 camera 가 들어간 테스트만

필요: pip install playwright websockets pillow numpy && python -m playwright install chromium
브라우저: 기본은 Playwright 의 Chromium. 다른 Chrome 을 쓰려면 CHROME=/path/to/chrome
결과: 통과/실패 표와 실패 화면 캡처(tests/_out/). 하나라도 실패하면 종료 코드 1.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import contextlib
import http.server
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import traceback
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "_out"
TESTS: list[tuple[str, object, bool]] = []  # (이름, 함수, full 전용)


def test(name: str, full: bool = False):
    def deco(fn):
        TESTS.append((name, fn, full))
        return fn
    return deco


class Fail(AssertionError):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ───────────────────────── 공용: 웹 서버 · 브라우저 · 페이지 ─────────────────────────
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def start_http(port: int):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class Env:
    def __init__(self, pw, base, helper_port):
        self.pw, self.base, self.helper_port = pw, base, helper_port
        self.browser = None

    async def launch(self):
        args = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
        exe = os.environ.get("CHROME") or None
        self.browser = await self.pw.chromium.launch(executable_path=exe, args=args)

    async def page(self, sim=True, mat="line"):
        """새 브라우저 창(깨끗한 저장소)에서 앱을 열고 (sim 이면) 로봇 시뮬레이터로."""
        ctx = await self.browser.new_context(viewport={"width": 1500, "height": 950}, locale="ko-KR")
        pg = await ctx.new_page()
        pg.errors = []
        pg.on("pageerror", lambda e: pg.errors.append(str(e)))
        await pg.goto(self.base + "/index.html")
        await pg.wait_for_function("document.querySelector('#loading') && document.querySelector('#loading').hidden", timeout=180000)
        await pg.evaluate("document.documentElement.lang='ko'")
        if sim:
            await pg.evaluate("window.__wb.enterSim()")
            await pg.wait_for_timeout(800)
            if mat:
                await pg.select_option("#simMat", mat)
                await pg.wait_for_timeout(400)
        return pg

    async def close(self, pg):
        with contextlib.suppress(Exception):
            await pg.context.close()


async def set_program(pg, block, task=None, data=None):
    await pg.evaluate("""([type, task, data]) => { const ws = window.__wb.ws(); ws.clear();
      const s = ws.newBlock('rm_start'); s.initSvg(); s.render(); s.moveBy(30, 30);
      const b = ws.newBlock(type); if (task != null) b.setFieldValue(task, 'TASK'); if (data) { b.data = JSON.stringify(data); }
      b.initSvg(); b.render(); if (b.refresh) b.refresh(); s.nextConnection.connect(b.previousConnection); }""", [block, task, data])


async def pose(pg):
    return await pg.evaluate("(()=>{const p=window.__umc.pose();return [p.x,p.z,p.th]})()")


# ───────────────────────── 빠른 테스트 ─────────────────────────
@test("js-syntax")
async def t_syntax(env):
    node = shutil.which("node")
    if not node:
        return "건너뜀 (node 없음)"
    bad = []
    files = [p for p in ROOT.glob("*.js") if p.name not in ("data.js",)]
    for p in files:
        r = subprocess.run([node, "--check", str(p)], capture_output=True, text=True)
        if r.returncode:
            bad.append(f"{p.name}: {r.stderr.strip().splitlines()[-1] if r.stderr else '?'}")
    check(not bad, "문법 오류: " + "; ".join(bad))
    return f"{len(files)}개 파일"


@test("page-load")
async def t_load(env):
    pg = await env.page()
    try:
        g = await pg.evaluate("""({cad: !!window.__cad, ext: !!(window.__cad && window.__cad.ext), umc: !!window.__umc, vla: !!window.__vla,
          bc: !!window.__bc, vlaviz: !!window.__vlaviz, nnviz: !!window.__nnviz, tm: !!window.__trainModel, view: !!(window.__husky && window.__husky.view),
          blocks: ['rm_vla_drive','rm_vla_teach','rm_nn_drive'].filter(b => !Blockly.Blocks[b]),
          panels: ['bcWrap','vlaWrap'].filter(id => !document.getElementById(id))})""")
        missing = [k for k, v in g.items() if v is False]
        check(not missing, f"없는 전역: {missing}")
        check(not g["blocks"], f"없는 블록: {g['blocks']}")
        await pg.wait_for_timeout(1500)
        g2 = await pg.evaluate("['bcWrap','vlaWrap'].filter(id => !document.getElementById(id))")
        check(not g2, f"시뮬레이터 칸 없음: {g2}")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
    finally:
        await env.close(pg)


@test("ai-camera-views")
async def t_cameras(env):
    pg = await env.page()
    try:
        res = {}
        for m in ("first", "third", "top"):
            await pg.select_option("#bcCam", m)
            await pg.wait_for_timeout(300)
            res[m] = await pg.evaluate("""() => { const r = window.__vla.view(96, 72); if (!r) return null; let robot = 0, front = 0;
              for (let k = 0; k < r.img.length; k += 4) { if (r.img[k] === 126 && r.img[k+1] === 87 && r.img[k+2] === 194) robot++; if (r.img[k] === 255 && r.img[k+1] === 196 && r.img[k+2] === 0) front++; }
              return { w: r.w, h: r.h, robot, front, mode: window.__vla.camMode() }; }""")
        for m, r in res.items():
            check(r and r["w"] == 96 and r["h"] == 72 and r["mode"] == m, f"{m}: 그림 없음 {r}")
        check(res["first"]["robot"] == 0, f"1인칭에 로봇이 보임 ({res['first']['robot']})")
        check(res["third"]["robot"] > 50 and res["third"]["front"] > 5, f"3인칭에 로봇이 안 보임 {res['third']}")
        check(res["top"]["robot"] > 0, f"위에서 보기에 로봇이 안 보임 {res['top']}")
        return f"3인칭 로봇 {res['third']['robot']}px, 위에서 {res['top']['robot']}px"
    finally:
        await env.close(pg)


@test("teach-by-keyboard")
async def t_teach(env):
    pg = await env.page()
    try:
        await set_program(pg, "rm_vla_teach", "빨간 칸으로 가")
        n0 = await pg.evaluate("window.__bc.state.data.length")
        await pg.click("#simRun")
        await pg.wait_for_function("window.__bc.state.teaching", timeout=30000)
        p0 = await pose(pg)
        # 헤드리스에서는 시뮬레이터 시간이 느리게 흐를 수 있어, 시간 대신 모인 장면 수로 기다림
        await pg.keyboard.down("ArrowUp")
        with contextlib.suppress(Exception):
            await pg.wait_for_function("window.__bc.state.runN >= 8", timeout=30000)
        await pg.keyboard.up("ArrowUp")
        await pg.keyboard.down("Space")
        with contextlib.suppress(Exception):
            await pg.wait_for_function("(d => d.length && d[d.length - 1].a === 0)(window.__bc.state.data)", timeout=15000)
        await pg.keyboard.up("Space")
        p1 = await pose(pg)
        still = await pg.evaluate("window.__cad.ext.simRunning")
        await pg.click("#simStop"); await pg.wait_for_timeout(800)
        d = await pg.evaluate("window.__bc.state.data.map(x => [x.a, x.task, x.cam, typeof x.phys])")
        new = d[n0:]
        check(still, "스페이스 키가 시뮬레이터를 멈춤 (키 가로채기 실패)")
        check(len(new) >= 3, f"장면이 거의 안 모임 ({len(new)})")
        acts = {a for a, *_ in new}
        check(1 in acts and 0 in acts, f"앞으로(1)·멈춤(0) 장면이 없음 {sorted(acts)}")
        check(all(t == "빨간 칸으로 가" and c == "first" and ph == "boolean" for _, t, c, ph in new), f"장면 정보 이상 {new[:2]}")
        moved = ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** .5
        check(moved > 5, f"로봇이 거의 안 움직임 ({moved:.1f}mm)")
        return f"장면 {len(new)}개, {moved:.0f}mm 이동"
    finally:
        await env.close(pg)


@test("demo-check-warnings")
async def t_checks(env):
    pg = await env.page()
    try:
        await pg.evaluate("""() => { const B = window.__bc.state, img = window.__bc.eye();
          for (let i = 0; i < 65; i++) B.data.push({ task: '빨간 칸으로 가', a: i < 58 ? 1 : 2, img, cam: 'first', th: 0, phys: i < 40 }); }""")
        await pg.click("#bcOpen"); await pg.wait_for_timeout(400)
        items = await pg.evaluate("[...document.querySelectorAll('#bcDlg .warn li')].map(li => li.textContent)")
        check(len(items) == 5, f"경고 5개 예상, {len(items)}개: {items}")
        for key in ("하나뿐", "65개", "89%", "멈춤", "물리엔진"):
            check(any(key in x for x in items), f"'{key}' 경고 없음")
        side = await pg.evaluate("document.getElementById('bcWrap').innerText")
        check("점검 5" in side, "시뮬레이터 칸에 경고 개수 없음")
    finally:
        await env.close(pg)


@test("train-language-and-inspect")
async def t_train(env):
    """같은 그림이라도 지시가 다르면 다른 행동을 배우는지 (L 이 행동을 바꾸는지)."""
    pg = await env.page()
    try:
        r = await pg.evaluate("""async () => { const bc = window.__bc, B = bc.state, img = bc.eye();
          const img2 = img.slice(); for (let i = 0; i < img2.length; i += 3) img2[i] = 255 - img2[i];
          for (let i = 0; i < 60; i++) { B.data.push({ task: '빨간 칸으로 가', a: i % 2 ? 2 : 0, img: i % 2 ? img : img2, cam: 'first', th: 0, phys: false });
                                         B.data.push({ task: '파란 칸으로 가', a: i % 2 ? 3 : 0, img: i % 2 ? img : img2, cam: 'first', th: 0, phys: false }); }
          const acc = await bc.train(30);
          const arg = p => p.indexOf(Math.max(...p));
          const ins = bc.inspect(img, '빨간 칸으로 가', 0);
          return { acc, red: arg(Array.from(bc.predict(img, '빨간 칸으로 가', 0))), blue: arg(Array.from(bc.predict(img, '파란 칸으로 가', 0))),
                   sal: ins.sal.length, cf: ins.cf.map(c => [c.task, c.a]), h: ins.h.length, unk: bc.inspect(img, '초록 칸으로 가', 0).words.filter(w => !w.known).map(w => w.w) }; }""")
        check(r["acc"]["tr"] > .9, f"연습 문제 정답률 낮음 {r['acc']}")
        check(r["red"] == 2 and r["blue"] == 3, f"같은 그림에서 지시별 행동이 안 갈림 (빨강 {r['red']}, 파랑 {r['blue']})")
        check(r["sal"] == 24 * 18 and r["h"] == 24, "inspect 크기 이상")
        check(sorted(t for t, _ in r["cf"]) == ["빨간 칸으로 가", "파란 칸으로 가"], f"반사실 목록 이상 {r['cf']}")
        check(r["unk"] == ["초록"], f"처음 듣는 낱말 판정 이상 {r['unk']}")
        stored = await pg.evaluate("(()=>{const m=window.__bc.state.model;return {nin:m.nin,cam:m.cam,phys:m.phys,U:m.U.length}})()")
        check(stored["cam"] == "first" and stored["phys"] is False and stored["U"] == 32 * 6 * 24, f"모델 정보 이상 {stored}")
        return f"정답률 {r['acc']['tr']:.0%}, 빨강→왼쪽 · 파랑→오른쪽"
    finally:
        await env.close(pg)


@test("look-inside-windows")
async def t_viz(env):
    pg = await env.page()
    try:
        await pg.evaluate("""async () => { const bc = window.__bc, B = bc.state, img = bc.eye();
          for (let i = 0; i < 40; i++) B.data.push({ task: '빨간 칸으로 가', a: i % 3, img, cam: 'first', th: 0, phys: false }); await bc.train(5); }""")
        await set_program(pg, "rm_vla_drive", "빨간 칸으로 가")
        await pg.click("#bcViz"); await pg.wait_for_timeout(900)
        box = await pg.locator("#vlaViz canvas").bounding_box()
        s = box["width"] / 820
        await pg.mouse.click(box["x"] + 300 * s, box["y"] + 56 * s)
        await pg.wait_for_timeout(700)
        v = await pg.evaluate("""({ open: !document.getElementById('vlaViz').hidden, cell: !!document.querySelector('#vlaViz .cell canvas'),
          eff: document.querySelectorAll('#vlaViz .cell .eff i').length, cf: document.querySelectorAll('#vlaViz .cf .chip').length })""")
        check(v["open"] and v["cell"] and v["eff"] == 6, f"AI 속 들여다보기 이상 {v}")
        check(v["cf"] >= 1, "반사실 줄 없음")
        await pg.click("#vlaViz .x")
        await pg.click("#bcOpen"); await pg.wait_for_timeout(400)
        grid = await pg.evaluate("""(() => { const c = document.querySelector('#bcDlg canvas.wgt'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()""")
        check(grid > 5000, f"가중치 그림이 비어 있음 ({grid}px)")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
    finally:
        await env.close(pg)


NN_W = [0.9, 0.7, 0.24, -1.2, 0.3, -0.5, 0.4, -0.8, 0.1, 1.1, 0.2, -0.3, -0.6, 0.9, 0.05, 0.3, -0.4, 0.6,
        1.0, -0.5, 0.7, 0.2, -1.1, 0.4, 0.3, -0.9, 0.6, 0.1, -0.2, 0.8, 0.5, -0.7]


@test("neural-network-weights")
async def t_nn(env):
    pg = await env.page()
    try:
        net = {"in": [{"k": "color", "p": "C"}, {"k": "distance", "p": "D"}], "H": 6, "W": NN_W, "S": 300, "T": 180}
        await set_program(pg, "rm_nn_drive", data=net)
        await pg.wait_for_timeout(1500)
        check(await pg.evaluate("!!document.getElementById('nnVizBtn')"), "시뮬레이터 칸에 신경망 버튼 없음")
        same = await pg.evaluate("""(W) => { const net = { W, S: 300, T: 180, H: 6, ins: [{k:'color',p:'C'},{k:'distance',p:'D'}] }, out = [];
          for (const x of [[0, 0], [0.5, 0.3], [1, 1], [0.12, 0.9]]) { const a = window.__trainModel.nnF(net, x), r = window.__nnviz.run(net, x); out.push([a[0], a[1], r.speed, r.turn]); } return out; }""", NN_W)
        check(all(a == c and b == d for a, b, c, d in same), f"들여다보기 계산이 실제 신경망과 다름 {same}")
        await pg.click("#nnVizBtn"); await pg.wait_for_timeout(800)
        await pg.evaluate("document.querySelector('#nnViz .tb').open = true")
        await pg.wait_for_timeout(500)
        cells = await pg.evaluate("document.querySelectorAll('#nnViz .tbl td').length")
        check(cells == 32, f"가중치 표 칸 {cells}개 (32 예상)")
        calc = await pg.evaluate("document.querySelector('#nnViz .calc').innerText")
        check("tanh" in calc and "+0.90" in calc, f"계산식 이상: {calc[:120]}")
        await pg.click("#simRun")
        with contextlib.suppress(Exception):
            await pg.wait_for_function("document.querySelector('#nnViz .st').textContent.includes('실행 중')", timeout=20000)
        st = await pg.evaluate("document.querySelector('#nnViz .st').textContent")
        await pg.click("#simStop")
        check("실행 중" in st, f"달리는 중 실제 센서 값 표시 안 됨: {st}")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return "계산 일치 4/4, 표 32칸"
    finally:
        await env.close(pg)


@test("code-generation")
async def t_codegen(env):
    """새 블록들의 시뮬레이터(JS)·Pybricks(파이썬) 코드가 만들어지고 문법이 맞는지."""
    pg = await env.page()
    try:
        cases = (("rm_vla_drive", "빨간 칸으로 가", None, "only in the simulator"), ("rm_vla_teach", "빨간 칸으로 가", None, "simulator"),
                 ("rm_nn_drive", None, {"in": [{"k": "color", "p": "C"}], "H": 6, "W": [0.1] * 26, "S": 300, "T": 180}, "nn_run"))
        for blk, task, data, want in cases:
            await set_program(pg, blk, task, data)
            r = await pg.evaluate("""() => { const ws = window.__wb.ws(); let py = window.__wb.wbGenPython(ws); if (py && typeof py === 'object') py = py.code || py.src || JSON.stringify(py);
              const js = window.__wb.wbCompileSrc(ws).src; let jsErr = '';
              try { new (Object.getPrototypeOf(async function () {}).constructor)('api', js); } catch (e) { jsErr = String(e); }
              return { py: String(py), js, jsErr }; }""")
            check(not r["jsErr"], f"{blk}: 시뮬레이터 코드 문법 오류 {r['jsErr']}")
            check(want in r["py"], f"{blk}: 파이썬에 '{want}' 없음")
            try:
                compile(r["py"], f"{blk}.py", "exec")
            except SyntaxError as e:
                (OUT / f"{blk}.py").write_text(r["py"], encoding="utf-8")
                raise Fail(f"{blk}: 파이썬 문법 오류 {e} (tests/_out/{blk}.py)")
        return "JS 3 · 파이썬 3"
    finally:
        await env.close(pg)


@test("vla-helper-server")
async def t_helper(env):
    from websockets.asyncio.client import connect
    import numpy as np
    from PIL import Image
    rec = Path(tempfile.mkdtemp(prefix="vlarec-"))
    port = env.helper_port
    proc = subprocess.Popen([sys.executable, str(ROOT / "vla-helper" / "server.py"), "--port", str(port), "--rec", str(rec)],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(50):
            with contextlib.suppress(OSError):
                socket.create_connection(("127.0.0.1", port), timeout=.2).close(); break
            time.sleep(.2)
        img = np.full((72, 96, 3), 230, np.uint8); img[30:50, 60:80] = [220, 30, 30]
        b = io.BytesIO(); Image.fromarray(img).save(b, "PNG")
        url = "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()
        async with connect(f"ws://127.0.0.1:{port}", origin="https://daewonlee81-glitch.github.io") as ws:
            await ws.send(json.dumps({"type": "hello"})); h = json.loads(await ws.recv())
            check(h["mode"] == "practice", f"hello 이상 {h}")
            await ws.send(json.dumps({"type": "act", "id": 1, "task": "빨간 물체로 가", "image": url, "state": {}}))
            a = json.loads(await ws.recv())
            check(a["chunk"] and a["chunk"][0][1] > 0, f"빨강이 오른쪽에 있는데 오른쪽으로 안 돎 {a}")
            await ws.send(json.dumps({"type": "rec_start", "meta": {"task": "테스트"}})); await ws.recv()
            for i in range(3):
                await ws.send(json.dumps({"type": "rec_frame", "t": i / 10, "image": url, "state": {"yaw": 0}, "action": [100, 0]}))
            await ws.send(json.dumps({"type": "rec_end", "result": {"ok": True}})); r = json.loads(await ws.recv())
            check(r["frames"] == 3 and (Path(r["path"]) / "images" / "00003.png").exists(), f"기록 저장 이상 {r}")
        bad = False
        try:
            async with connect(f"ws://127.0.0.1:{port}", origin="https://evil.example.com"):
                bad = True
        except Exception:
            pass
        check(not bad, "허용 안 된 사이트 연결을 받아 줌")
        # 브라우저에서 연결 (localhost 는 허용 목록)
        pg = await env.page()
        try:
            await pg.evaluate(f"localStorage.setItem('mscad.vla.port', '{port}'); localStorage.setItem('mscad.vla.brain', 'helper')")
            await pg.evaluate("window.__vla.connect()"); await pg.wait_for_timeout(1500)
            st = await pg.evaluate("window.__vla.state.st")
            check(st == "on", f"웹 CAD → 도우미 연결 실패 ({st})")
        finally:
            await env.close(pg)
        return "연습 모드·기록·거부·브라우저 연결"
    finally:
        proc.terminate()
        with contextlib.suppress(Exception):
            proc.wait(5)
        shutil.rmtree(rec, ignore_errors=True)


# ───────────────────────── 전체 테스트 (--full) ─────────────────────────
DEMO_JS = r"""([task, col]) => new Promise(res => {
  const keys = window.__bc.keys, isT = (r,g,b) => col === 'red' ? (r>150&&g<100&&b<100) : (b>150&&r<100&&g<170);
  let stopT = 0;
  const iv = setInterval(() => {
    if (!window.__cad.ext.simRunning) return;
    const v = window.__husky.view(window.__vla.cam(), {w:96,h:72,fov:70}); let n=0,sx=0,maxy=0;
    for (let j=0;j<72;j++) for (let i=0;i<96;i++){const k=(j*96+i)*4; if(isT(v.img[k],v.img[k+1],v.img[k+2])){n++;sx+=i;if(j>maxy)maxy=j;}}
    keys.clear();
    if (stopT) { keys.add('s'); if (Date.now()-stopT>1500){ clearInterval(iv); keys.clear(); res(true);} return; }
    if (n<3) { keys.add('r'); return; }
    const cx = sx/n/96*2-1;
    if (maxy>66 && Math.abs(cx)<0.5) { stopT=Date.now(); keys.add('s'); return; }
    if (Math.abs(cx)<0.2) keys.add('u'); else if (Math.abs(cx)<0.5) { keys.add('u'); keys.add(cx<0?'l':'r'); } else keys.add(cx<0?'l':'r');
  }, 50);
  setTimeout(() => { clearInterval(iv); keys.clear(); res(false); }, 60000);
})"""


@test("demo-train-drive (3인칭)", full=True)
async def t_full(env):
    """스크립트로 빨강·파랑 시범 2번씩 → 40번 학습 → 같은 출발점에서 지시만 바꿔 맞는 칸으로 가는지."""
    pg = await env.page()
    try:
        await pg.select_option("#bcCam", "third")
        for task, col in [("빨간 칸으로 가", "red"), ("파란 칸으로 가", "blue")] * 2:
            await pg.click("#simReset"); await set_program(pg, "rm_vla_teach", task)
            await pg.click("#simRun"); await pg.wait_for_timeout(300)
            ok = await pg.evaluate(DEMO_JS, [task, col])
            await pg.click("#simStop"); await pg.wait_for_timeout(600)
            check(ok, f"시범 실패: {task}")
        acc = await pg.evaluate("window.__bc.train(40)")
        ends = {}
        for task in ("빨간 칸으로 가", "파란 칸으로 가"):
            await pg.click("#simReset"); await set_program(pg, "rm_vla_drive", task)
            await pg.click("#simRun")
            last, same = None, 0
            for _ in range(80):
                await pg.wait_for_timeout(500)
                p = await pose(pg)
                same = same + 1 if last and abs(p[0] - last[0]) + abs(p[1] - last[1]) < 1 else 0
                last = p
                if same >= 4:
                    break
            await pg.click("#simStop"); await pg.wait_for_timeout(500)
            ends[task] = last
        red, blue = ends["빨간 칸으로 가"], ends["파란 칸으로 가"]
        # 라인 매트: 빨간 칸 = 왼쪽 위(z < 0), 파란 칸 = 왼쪽 아래(z > 0)
        check(red[1] < -100 and blue[1] > 200, f"지시별 도착 위치가 맞지 않음 빨강 {red[:2]}, 파랑 {blue[:2]} (정답률 {acc})")
        return f"처음 보는 장면 {acc['va']:.0%}, 빨강 끝 z={red[1]:.0f}, 파랑 끝 z={blue[1]:.0f}"
    finally:
        await env.close(pg)


# ───────────────────────── 실행기 ─────────────────────────
async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="느린 전체 테스트까지")
    ap.add_argument("-k", help="이름에 이 글자가 들어간 테스트만")
    a = ap.parse_args()
    from playwright.async_api import async_playwright
    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    srv = start_http(port)
    sel = [(n, f, full) for n, f, full in TESTS if (a.full or not full) and (not a.k or a.k in n)]
    results = []
    t_all = time.time()
    async with async_playwright() as pw:
        env = Env(pw, f"http://localhost:{port}", free_port())
        await env.launch()
        for name, fn, _ in sel:
            t0 = time.time()
            print(f"▶ {name} …", flush=True)
            try:
                note = await asyncio.wait_for(fn(env), timeout=900)
                results.append((name, "통과", time.time() - t0, note or ""))
            except Fail as e:
                results.append((name, "실패", time.time() - t0, str(e)))
            except Exception as e:
                results.append((name, "오류", time.time() - t0, f"{type(e).__name__}: {e}"))
                traceback.print_exc()
            print(f"  {results[-1][1]} ({results[-1][2]:.0f}s) {results[-1][3]}", flush=True)
        await env.browser.close()
    srv.shutdown()
    bad = [r for r in results if r[1] != "통과"]
    print("\n" + "=" * 70)
    for n, s, dt, note in results:
        print(f"{'✅' if s == '통과' else '❌'} {n:32s} {s} {dt:5.0f}s  {note}")
    print("=" * 70)
    print(f"{len(results) - len(bad)}/{len(results)} 통과 · {time.time() - t_all:.0f}s")
    (OUT / "result.json").write_text(json.dumps([dict(name=n, status=s, sec=round(dt, 1), note=note) for n, s, dt, note in results], ensure_ascii=False, indent=1), encoding="utf-8")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    asyncio.run(main())
