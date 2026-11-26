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


@test("camera-sharp-view")
async def t_sharp(env):
    """화면용 카메라는 크게·부드럽게 그리고, AI 가 받는 그림(96×72 · 눈 24×18)은 그대로인지."""
    pg = await env.page()
    try:
        await pg.select_option("#bcCam", "third")
        await pg.wait_for_timeout(900)
        r = await pg.evaluate("""() => { const V = window.__vla, H = window.__husky;
          const a = V.view(96, 72), b = V.view(96, 72, 1), ss = V.view(96, 72, 2);
          let same = a.img.length === b.img.length; for (let k = 0; same && k < a.img.length; k++) if (a.img[k] !== b.img[k]) same = false;
          const colors = r => { const s = new Set(); for (let k = 0; k < r.img.length; k += 4) s.add(r.img[k] << 16 | r.img[k + 1] << 8 | r.img[k + 2]); return s.size; };
          const eye = window.__bc.eye(), cv = document.querySelector('#vlaWrap canvas');
          return { same, c1: colors(a), c2: colors(ss), eye: eye && eye.length, cw: cv && cv.width, ch: cv && cv.height, ir: cv && cv.style.imageRendering, lv: H.hqLevel(), ms: Math.round(H.hq.ms) }; }""")
        check(r["same"], "AI 입력 그림(96×72)이 바뀜")
        check(r["eye"] == 1296, f"AI 눈 입력 크기가 바뀜 ({r['eye']})")
        check(r["c2"] > r["c1"], f"슈퍼샘플링이 가장자리를 부드럽게 하지 않음 ({r['c1']} → {r['c2']})")
        check(r["cw"] == 320 and r["ch"] == 240 and r["ir"] == "auto", f"화면 캔버스 {r}")
        await pg.evaluate("localStorage.setItem('mscad.cam.hq', '0')")
        await pg.wait_for_timeout(800)
        off = await pg.evaluate("document.querySelector('#vlaWrap canvas').style.imageRendering")
        check(off == "pixelated", f"끄면 예전처럼 칸이 보여야 함 ({off})")
        return f"화면 {r['lv']['w']}×{r['lv']['h']}×{r['lv']['ss']}² · 색 {r['c1']}→{r['c2']}"
    finally:
        await env.close(pg)


FAKE_HUB_JS = """() => { const PB = window.__pyb.PB; window.__got = [];
  PB.tx = { write: async p => { window.__got.push(new TextDecoder().decode(p.subarray(1))); }, disconnect() {} };
  PB.running = true; PB.maxWrite = 20; localStorage.setItem('mscad.real.on', '1'); }"""


@test("real-robot-link")
async def t_real(env):
    """실제 허브 연결(가짜 허브): 시뮬레이터의 바퀴 명령이 "V:속도,회전" 으로 가고, 멈추면 0,0, 속도 비율이 맞는지."""
    pg = await env.page()
    try:
        await pg.evaluate(FAKE_HUB_JS)
        await pg.evaluate("localStorage.setItem('mscad.real.scale', '50')")
        await set_program(pg, "rm_vla_teach", "빨간 칸으로 가")
        await pg.click("#simRun")
        await pg.wait_for_function("window.__bc.state.teaching", timeout=30000)
        await pg.keyboard.down("ArrowUp")
        with contextlib.suppress(Exception):
            await pg.wait_for_function("window.__got.some(s => s === 'V:80,0\\n')", timeout=20000)
        st = await pg.evaluate("(document.querySelector('#realSt') || {}).textContent || ''")
        await pg.keyboard.up("ArrowUp")
        got = await pg.evaluate("window.__got.slice()")
        check("V:80,0\n" in got, f"앞으로(160 mm/s × 50%) 명령이 허브로 안 감: {got[-6:]}")
        check("보내는 중" in st, f"상태 표시: {st}")
        await pg.click("#simStop")
        await pg.wait_for_timeout(700)
        tail = await pg.evaluate("window.__got.slice(-2)")
        check(tail and all(x == "V:0,0\n" for x in tail), f"시뮬레이터를 멈췄는데 0,0 이 아님: {tail}")
        await pg.evaluate("localStorage.setItem('mscad.real.on', '0')")
        await pg.wait_for_timeout(500)
        n2 = await pg.evaluate("window.__got.length")
        await pg.wait_for_timeout(500)
        n3 = await pg.evaluate("window.__got.length")
        check(n3 == n2, f"끄기를 눌렀는데 계속 보냄 ({n2} → {n3})")
        return f"보낸 줄 {n2}개"
    finally:
        await env.close(pg)


@test("overcam-calibration")
async def t_overcam(env):
    """📷 천장 웹캠 보정 마법사: 정답을 아는 합성 사진(비스듬한 카메라, 로봇 태그 높이 100mm)으로
    태그 검출 → 번호 원 9곳 클릭 → 매트 맞춤 → 카메라 위치 → 로봇 위치·방향(높이 보정)을 확인."""
    truth = json.loads((ROOT / "tests/fixtures/overcam_synth.json").read_text())
    pg = await env.page()
    try:
        await pg.evaluate("localStorage.removeItem('mscad.overcam.cal')")
        await pg.evaluate("() => { window.__overcam.open(); window.__overcam.startPhoto('tests/fixtures/overcam_synth.png'); }")
        await pg.wait_for_function("window.__overcam.state.dets.length >= 5", timeout=30000)
        ids = await pg.evaluate("window.__overcam.state.dets.map(d => d.id).sort((a, b) => a - b)")
        check(ids == [0, 10, 11, 12, 13], f"태그 검출: {ids}")
        await pg.click("#ocWin [data-st='2']")
        box = await pg.evaluate("(() => { const r = document.querySelector('#ocWin canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
        W, H = truth["size"]
        for k in (1, 3, 10, 12, 2, 8, 9, 11, 4):
            u, v = truth["clicks"][str(k)]
            await pg.mouse.click(box[0] + u / W * box[2], box[1] + v / H * box[3])
        await pg.wait_for_function("Object.keys(window.__overcam.cal.tagCorners).length === 4", timeout=10000)
        await pg.evaluate("() => { window.__overcam.cal.tagH = 100; window.__overcam.update(); }")
        await pg.wait_for_function("window.__overcam.state.robots.length === 1 && window.__overcam.state.via === 'tags'", timeout=10000)
        r = await pg.evaluate("(() => { const S = window.__overcam.state; return { rob: S.robots[0], cam: S.cam, res: S.clickRes }; })()")
        rob, cam, R = r["rob"], r["cam"], truth["robot"]
        err = ((rob["x"] - R["x"]) ** 2 + (rob["y"] - R["y"]) ** 2) ** 0.5
        derr = abs((rob["deg"] - R["deg"] + 180) % 360 - 180)
        raw = ((rob["raw"][0] - R["x"]) ** 2 + (rob["raw"][1] - R["y"]) ** 2) ** 0.5
        check(err < 6, f"로봇 위치 오차 {err:.1f} mm (보정 {rob['x']:.1f},{rob['y']:.1f} / 정답 {R['x']},{R['y']})")
        check(derr < 1.5, f"로봇 방향 오차 {derr:.2f}° ({rob['deg']:.2f})")
        check(raw > 30, f"높이 보정 전 오차가 커야 함 ({raw:.1f} mm) — 시험 사진이 비스듬하지 않음?")
        check(abs(cam["z"] - truth["cam"][2]) < 40, f"카메라 높이 {cam['z']:.0f} (정답 {truth['cam'][2]})")
        check(abs(rob["hEst"] - 100) < 15, f"크기로 추정한 태그 높이 {rob['hEst']:.0f} mm (정답 100)")
        check(max(e for _, e in R and r["res"]) < 3, f"원 맞춤 오차 {r['res']}")
        off = await pg.evaluate("""(() => { const O = window.__overcam, keep = O.cal.samples; O.cal.samples = [0, 90, 180, 270].map(a => { const r = a * Math.PI / 180, u = [Math.cos(r), Math.sin(r)];
            return { c: 2, tx: 397 + 25 * u[0], ty: 305 + 25 * u[1], ux: u[0], uy: u[1], dx: 0, dy: 0, deg: a }; }); const v = O.fitOffset(); O.cal.samples = keep; return v; })()""")
        check(off is not None and abs(off - 25) < 0.5, f"앞 거리 계산 {off} (정답 25)")
        return f"로봇 오차 {err:.1f} mm · 방향 {derr:.2f}° · 보정 전 {raw:.0f} mm · 앞 거리 계산 {off:.1f} mm · 카메라 높이 {cam['z']:.0f} mm · 기울기 {cam['tilt']:.1f}°"
    finally:
        await env.close(pg)


@test("real-robot-hub-program")
async def t_real_hub(env):
    """허브 쪽 파이썬(가짜 pybricks)을 실제로 돌려: 명령대로 움직이고, 0.3초 동안 명령이 없으면 멈추는지."""
    pg = await env.page()
    try:
        await set_program(pg, "rm_vla_drive", "빨간 칸으로 가")
        py = await pg.evaluate("() => { let p = window.__wb.wbGenPython(window.__wb.ws()); return typeof p === 'object' ? (p.code || p.src || JSON.stringify(p)) : p; }")
    finally:
        await env.close(pg)
    with tempfile.TemporaryDirectory() as td:
        d = Path(td)
        (d / "pybricks").mkdir()
        (d / "pybricks" / "__init__.py").write_text("")
        stub = "class _Any:\n    def __init__(self, *a, **k): pass\n    def __getattr__(self, n): return _Any()\n    def __call__(self, *a, **k): return _Any()\n" \
               "def __getattr__(n): return _Any()\n"
        for m in ("hubs", "pupdevices", "parameters", "iodevices"):
            (d / "pybricks" / f"{m}.py").write_text(stub)
        (d / "pybricks" / "robotics.py").write_text(
            "import sys\nclass DriveBase:\n    def __init__(self, *a, **k): pass\n"
            "    def drive(self, s, t): print('DRIVE', s, t, flush=True)\n    def stop(self): print('STOP', flush=True)\n"
            "    def __getattr__(self, n): return lambda *a, **k: None\n")
        (d / "pybricks" / "tools.py").write_text(
            "import time\nclass StopWatch:\n    def __init__(self): self.t0 = time.monotonic()\n    def time(self): return int((time.monotonic() - self.t0) * 1000)\n"
            "def wait(ms): time.sleep(ms / 1000)\n")
        (d / "prog.py").write_text(py, encoding="utf-8")
        (d / "boot.py").write_text(
            "import os, sys\nclass S:\n    def fileno(self): return 0\n    def read(self, n): return os.read(0, n).decode()\n"
            "sys.stdin = S()\nsys.path.insert(0, os.path.dirname(__file__))\nexec(compile(open(os.path.join(os.path.dirname(__file__), 'prog.py'), encoding='utf-8').read(), 'prog.py', 'exec'))\n")
        p = subprocess.Popen([sys.executable, "-I", str(d / "boot.py")], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        lines: list[str] = []
        threading.Thread(target=lambda: [lines.append(l.decode().strip()) for l in p.stdout], daemon=True).start()
        try:
            time.sleep(0.5)
            for _ in range(5):
                p.stdin.write(b"V:120,-60\n"); p.stdin.flush(); time.sleep(0.1)
            p.stdin.write(b"V:999,999\n"); p.stdin.flush(); time.sleep(0.1)
            p.stdin.write(b"garbage\nV:x,1\n"); p.stdin.flush()
            t_last = time.monotonic(); time.sleep(0.8)
        except BrokenPipeError:
            pass
        finally:
            p.kill()
        err = p.stderr.read().decode()
        check("REAL LINK" in "\n".join(lines), f"프로그램이 시작하지 않음: {err[-400:]}")
        check("DRIVE 120 -60" in lines, f"명령대로 움직이지 않음: {lines[:8]}")
        check("DRIVE 400 360" in lines, "허브 쪽 속도 제한(±400, ±360)이 없음")
        i = max(i for i, l in enumerate(lines) if l.startswith("DRIVE"))
        check("STOP" in lines[i:], f"명령이 끊겼는데 멈추지 않음: {lines[-5:]}")
        check(lines[-1] == "STOP", f"멈춘 뒤 다시 움직임: {lines[-3:]}")
        return f"DRIVE {sum(l.startswith('DRIVE') for l in lines)}번 → STOP"


@test("ai-eye-while-running")
async def t_eye_run(env):
    """시뮬레이터 칸 「AI의 눈」이 실행 중에도 보이는지 — 따라 하기 블록이 아닌 프로그램(신경망 주행)이어도."""
    pg = await env.page()
    pix = """() => { const c = document.querySelector('.bcEye'); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const s = new Set(); for (let k = 0; k < d.length; k += 40) s.add(d[k] << 16 | d[k + 1] << 8 | d[k + 2]); return s.size; }"""
    try:
        await set_program(pg, "rm_nn_drive", None, {"in": [{"k": "color", "p": "C"}], "H": 6, "W": [0.1] * 26, "S": 300, "T": 180})
        await pg.click("#simRun")
        await pg.wait_for_timeout(2500)
        running = await pg.evaluate("window.__cad.ext.simRunning")
        n = await pg.evaluate(pix)
        await pg.click("#simStop")
        check(running, "프로그램이 실행되지 않음")
        check(n > 3, f"실행 중 AI의 눈이 까맣게 멈춤 (색 {n}가지)")
        return f"실행 중 색 {n}가지"
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
        cases = (("rm_vla_drive", "빨간 칸으로 가", None, "REAL LINK"), ("rm_vla_teach", "빨간 칸으로 가", None, "REAL LINK"),
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


# ───────────────────────── 기존 기능 ─────────────────────────
@test("all-mats-load")
async def t_mats(env):
    """시뮬레이터 매트(경기장)를 하나씩 모두 골라 보며 오류가 없는지."""
    pg = await env.page()
    try:
        opts = await pg.evaluate("[...document.querySelectorAll('#simMat option')].map(o => o.value).filter(Boolean)")
        bad = []
        for v in opts:
            n0 = len(pg.errors)
            await pg.select_option("#simMat", v)
            await pg.wait_for_timeout(250)
            ok = await pg.evaluate("!!(window.__umc.mat && window.__umc.mat())")
            if not ok or len(pg.errors) > n0:
                bad.append(f"{v}: {pg.errors[n0:n0 + 1] or '매트 없음'}")
        check(len(opts) >= 10, f"매트가 너무 적음 ({len(opts)})")
        check(not bad, "오류난 매트: " + "; ".join(bad[:5]))
        return f"매트 {len(opts)}개"
    finally:
        await env.close(pg)


async def open_ldr(pg, path=None, text=None, name="test.ldr"):
    if path:
        await pg.set_input_files("#fileIn", str(path))
    else:
        await pg.set_input_files("#fileIn", files=[{"name": name, "mimeType": "text/plain", "buffer": text.encode()}])
    await pg.wait_for_function("window.__cad.model && window.__cad.model.parts && window.__cad.model.parts.length > 0", timeout=30000)
    await pg.wait_for_timeout(800)


@test("cad-open-save")
async def t_cad(env):
    """수업 도면(RM-LineBase)을 열고 .ldr 로 저장했을 때 부품이 그대로인지."""
    pg = await env.page(sim=False)
    try:
        src = ROOT / "classes" / "BaseModel" / "RM-LineBase (1).ldr"
        await open_ldr(pg, src)
        n = await pg.evaluate("window.__cad.model.parts.length")
        lines_in = [l for l in src.read_text(encoding="utf-8", errors="ignore").splitlines() if l.startswith("1 ")]
        async with pg.expect_download(timeout=30000) as d:
            await pg.click("#btnSave")
        out = Path(await (await d.value).path()).read_text(encoding="utf-8", errors="ignore")
        lines_out = [l for l in out.splitlines() if l.startswith("1 ")]
        check(n >= 10, f"부품이 너무 적게 열림 ({n})")
        check(len(lines_out) == n, f"저장한 .ldr 부품 줄 {len(lines_out)}개 ≠ 열린 부품 {n}개")
        check(abs(len(lines_out) - len(lines_in)) <= 2, f"원본 {len(lines_in)}줄 ↔ 저장 {len(lines_out)}줄")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return f"부품 {n}개"
    finally:
        await env.close(pg)


@test("assembly-cards-zip")
async def t_cards(env):
    """조립카드 ZIP: 카드 그림·인쇄용 cards.html·.ldr 가 들어 있는지."""
    import zipfile
    pg = await env.page(sim=False)
    try:
        await open_ldr(pg, ROOT / "classes" / "BaseModel" / "RM-LineBase (1).ldr")
        await pg.click("#btnCards")
        await pg.wait_for_timeout(1500)
        async with pg.expect_download(timeout=180000) as d:
            await pg.click("#cardsSave")
        z = zipfile.ZipFile(await (await d.value).path())
        names = z.namelist()
        pngs = [n for n in names if n.lower().endswith(".png")]
        check(any(n.endswith("cards.html") for n in names), f"cards.html 없음 {names[:5]}")
        check(any(n.lower().endswith(".ldr") for n in names), ".ldr 없음")
        check(len(pngs) >= 3, f"카드 그림이 너무 적음 ({len(pngs)})")
        big = max(z.getinfo(n).file_size for n in pngs)
        check(big > 5000, f"카드 그림이 비어 보임 (가장 큰 것 {big}B)")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return f"파일 {len(names)}개, 그림 {len(pngs)}장"
    finally:
        await env.close(pg)


GEARS_LDR = """0 gear-test
0 Name: gear-test.ldr
1 16 0 0 0 1 0 0 0 1 0 0 0 1 10928.dat
1 16 40 0 0 1 0 0 0 1 0 0 0 1 3648b.dat
1 16 120 0 0 1 0 0 0 1 0 0 0 1 3649.dat
"""


@test("gear-ratios")
async def t_gears(env):
    """회전 실험: 8T → 24T → 40T 기어비가 −1/3, +1/5 인지."""
    pg = await env.page(sim=False)
    try:
        await open_ldr(pg, text=GEARS_LDR, name="gear-test.ldr")
        r = await pg.evaluate("""() => { const ps = window.__cad.model.parts; const res = window.__mech.solve(ps[0].id);
          if (!res.ok) return { ok: false, why: res.why };
          const k = {}; for (const G of res.groups) for (const id of G.ids) k[ps.findIndex(p => p.id === id)] = G.k; return { ok: true, k, meshes: res.meshes }; }""")
        check(r["ok"], f"풀이 실패 {r}")
        k = r["k"]
        check(abs(k.get("0", 0) - 1) < 1e-6, f"8T 비 {k}")
        check(abs(k.get("1", 0) + 1 / 3) < 1e-3, f"24T 비 {k.get('1')} (−1/3 예상)")
        check(abs(k.get("2", 0) - 1 / 5) < 1e-3, f"40T 비 {k.get('2')} (+1/5 예상)")
        return f"맞물림 {r['meshes']}쌍"
    finally:
        await env.close(pg)


@test("every-block-codegen")
async def t_blocks(env):
    """도구 상자의 모든 블록: 시뮬레이터(JS) 코드 문법 + Pybricks 파이썬 문법."""
    pg = await env.page()
    try:
        res = await pg.evaluate("""() => { const W = window.__wb, ws = W.ws(), types = [];
          const walk = n => { if (!n) return; if (Array.isArray(n)) return n.forEach(walk); if (n.kind === 'block' && n.type) types.push(n.type); if (n.contents) walk(n.contents); };
          const tb = W.wbToolbox(); walk(tb.contents || tb);
          const AF = Object.getPrototypeOf(async function () {}).constructor, out = [];
          for (const type of [...new Set(types)]) {
            if (type === 'rm_start' || type === 'controls_flow_statements') continue; // 「반복 멈추기」는 반복 안에서만 쓰는 블록
            ws.clear(); const s = ws.newBlock('rm_start'); s.initSvg(); s.render();
            let b; try { b = ws.newBlock(type); b.initSvg(); b.render(); } catch (e) { out.push({ type, err: 'create: ' + e }); continue; }
            if (b.previousConnection && s.nextConnection) { try { s.nextConnection.connect(b.previousConnection); } catch (e) { } }
            else if (b.outputConnection) { /* 값 블록: 생성기만 확인 */ }
            const r = { type, kind: b.outputConnection ? 'value' : 'stmt' };
            try { const js = W.wbCompileSrc(ws).src; new AF('api', js); } catch (e) { r.err = 'js: ' + e; }
            if (!r.err) { try { let py = W.wbGenPython(ws); r.py = typeof py === 'string' ? py : (py && (py.code || py.src)) || ''; } catch (e) { r.err = 'py: ' + e; } }
            if (!r.err && b.outputConnection) { try { const j = javascript.javascriptGenerator; j.init(ws); j.blockToCode(b); const P = python.pythonGenerator; } catch (e) { r.err = 'jsval: ' + e; } }
            out.push(r);
          }
          ws.clear(); return out; }""")
        bad = [f"{r['type']}: {r['err'][:80]}" for r in res if r.get("err")]
        for r in res:
            if r.get("err") or not r.get("py"):
                continue
            try:
                compile(r["py"], r["type"] + ".py", "exec")
            except SyntaxError as e:
                (OUT / f"block_{r['type']}.py").write_text(r["py"], encoding="utf-8")
                bad.append(f"{r['type']}: 파이썬 문법 {e.msg} (tests/_out/block_{r['type']}.py)")
        check(len(res) >= 100, f"블록이 너무 적음 ({len(res)})")
        check(not bad, f"{len(bad)}개 블록 문제: " + "; ".join(bad[:6]))
        return f"블록 {len(res)}종"
    finally:
        await env.close(pg)


@test("auto-tuning-training-runs")
async def t_training(env):
    """🎓 학습 창: 라인트레이싱 자동 생성 학습이 오류 없이 몇 세대 돌아가는지 (라인 트레이싱 매트)."""
    pg = await env.page()
    try:
        await pg.evaluate("localStorage.setItem('mscad.trModel', 'cem')")
        await pg.click("#simTrain"); await pg.wait_for_timeout(800)
        await pg.click("#trModeGen"); await pg.wait_for_timeout(300)  # 라인트레이싱 자동 생성 (블록 없이 시작)
        t0 = await pg.evaluate("document.querySelector('#trStatus').textContent")
        await pg.click("#trStart")
        with contextlib.suppress(Exception):
            await pg.wait_for_function(r"t0 => { const s = document.querySelector('#trStatus').textContent; return s !== t0 && /\d/.test(s); }", arg=t0, timeout=60000)
        await pg.wait_for_timeout(4000)
        st = await pg.evaluate("document.querySelector('#trStatus').textContent")
        with contextlib.suppress(Exception):
            await pg.click("#trStop", timeout=5000)
        await pg.wait_for_timeout(500)
        check(st and st != t0, f"학습 상태가 바뀌지 않음: {st!r}")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return st[:60]
    finally:
        await env.close(pg)


@test("othello-ai-field")
async def t_othello(env):
    """WRL 오셀로 AI 경기장: 판·가운데 블록·상대 로봇 켜기, 잠깐 달려도 오류 없음."""
    pg = await env.page(mat="othello_ai")
    try:
        r = await pg.evaluate("({ props: window.__umc.props().length, ai: !!window.__othelloAI, opp: typeof window.__othelloAI.toggleOpp })")
        check(r["ai"] and r["props"] >= 10, f"오셀로 AI 경기장 이상 {r}")
        await set_program(pg, "rm_vla_teach", "x")
        await pg.click("#simRun"); await pg.wait_for_timeout(2500); await pg.click("#simStop"); await pg.wait_for_timeout(400)
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return f"물체 {r['props']}개"
    finally:
        await env.close(pg)


@test("code-save-json")
async def t_simsave(env):
    """💾 코드 저장(.json): 블록 프로그램이 다시 열 수 있는 형식으로 저장되는지."""
    pg = await env.page()
    try:
        await set_program(pg, "rm_vla_drive", "빨간 칸으로 가")
        async with pg.expect_download(timeout=20000) as d:
            await pg.evaluate("window.__simCode.saveJson()")
        j = json.loads(Path(await (await d.value).path()).read_text(encoding="utf-8"))
        check(j.get("format") == "robomakers-blocks", f"형식 이상 {list(j)[:5]}")
        txt = json.dumps(j.get("program"), ensure_ascii=False)
        check("rm_vla_drive" in txt and "빨간 칸으로 가" in txt, "블록·지시가 저장되지 않음")
    finally:
        await env.close(pg)


# ───────────────────────── 연결 고리 (app.js 훅) ─────────────────────────
# 덧붙임 파일들이 app.js 에서 꺼내 쓰는 것들 — 하나라도 사라지면 그 기능이 조용히 멈춥니다. (docs/ARCHITECTURE.md)
CONTRACT = {
    "window.__umc": "T api cam ctl esc i18n mat mats phys pose props robot sim time",
    "window.__cad": "THREE camera controls model objs root scene",
    "window.__cad.ext": "add apply bundle index loader matPx motors palette push reload robot sel simRebuild simRunning status",
    "window.__wb": "WB_LIB Ye dg enterSim hub lang proj save simOn wbBuild wbCompileSrc wbGenPython wbSources wbToolbox ws",
    "window.__pyb": "PB pbStopHub pbRun",
    "window.__pyb.PB": "tx q running maxWrite",
}
ADDON_GLOBALS = ("__cadx __cadxReady __classes __axes __backup __simRigs __simRigObjs __husky __mech __trx __othelloAI __simCode "
                 "__line2 __trs __nnF __trainModel __rfGuide __umcGuide __wbSync __wbTb __vla __bc __vlaviz __nnviz __real __overcam").split()


# index.html 의 <script> 순서: 왼쪽 파일은 오른쪽 파일들보다 뒤에 불러와야 함 (불러올 때 그 전역을 바로 씀)
LOAD_AFTER = {
    "wordblock-sync.js": ["app.js"], "classes.js": ["app.js"], "cadx.js": ["app.js"], "simports.js": ["app.js"], "huskylens.js": ["app.js"],
    "cadmech.js": ["app.js"], "umc.js": ["app.js"], "rfmodels.js": ["umc.js"], "othelloai.js": ["umc.js", "huskylens.js"], "rfguide.js": ["umc.js"],
    "simsave.js": ["app.js"], "line2.js": ["app.js"], "trainmodel.js": ["app.js"],
    "vla.js": ["app.js", "wordblock-sync.js", "huskylens.js"], "bc.js": ["vla.js"], "vlaviz.js": ["bc.js", "vla.js"], "nnviz.js": ["trainmodel.js", "bc.js"],
    "real.js": ["vla.js", "bc.js"],
    "overcam.js": ["real.js"],
}


@test("script-order")
async def t_order(env):
    """index.html 의 스크립트 순서가 파일끼리의 의존 순서와 맞는지 (docs/ARCHITECTURE.md)."""
    import re
    srcs = [re.sub(r"\?.*$", "", m) for m in re.findall(r'<script[^>]*src="([^"]+)"', (ROOT / "index.html").read_text(encoding="utf-8"))]
    pos = {Path(x).name: i for i, x in enumerate(srcs)}
    bad = []
    for f, deps in LOAD_AFTER.items():
        if f not in pos:
            bad.append(f"{f} 가 index.html 에 없음"); continue
        for d in deps:
            if d not in pos or pos[d] > pos[f]:
                bad.append(f"{f} 는 {d} 뒤에 와야 함")
    addons = [p.name for p in ROOT.glob("*.js") if p.name not in ("app.js", "data.js", "jszip.min.js", "blockly_msgs.js")]
    for a in addons:
        if a not in pos:
            bad.append(f"{a} 를 index.html 이 불러오지 않음")
    check(not bad, "; ".join(bad))
    return f"스크립트 {len(srcs)}개"


@test("app-hooks-patched")
async def t_hooks(env):
    """tools/patch_cadx.py · patch_trx.py 의 훅이 app.js 에 모두 들어 있는지 (다시 돌려도 바뀌는 게 없어야 함)."""
    tmp = Path(tempfile.mkdtemp(prefix="hooks-"))
    try:
        cp = tmp / "app.js"; shutil.copy(ROOT / "app.js", cp)
        for tool in ("patch_cadx.py", "patch_trx.py"):
            r = subprocess.run([sys.executable, str(ROOT / "tools" / tool), str(cp)], capture_output=True, text=True)
            check(r.returncode == 0, f"{tool} 실패 — app.js 가 바뀌어 훅 자리를 못 찾음: {(r.stdout + r.stderr).strip()[-200:]}")
            check(cp.read_bytes() == (ROOT / "app.js").read_bytes(), f"{tool} 를 돌리니 app.js 가 바뀜 — 훅이 빠져 있음. `python3 tools/{tool} app.js` 를 돌리세요")
        return "patch_cadx 17개 · patch_trx 12개 모두 들어 있음"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@test("app-contract")
async def t_contract(env):
    """덧붙임 파일들이 쓰는 app.js 의 함수·값과, 덧붙임 파일들이 서로 주고받는 전역이 모두 있는지."""
    pg = await env.page()
    try:
        await pg.wait_for_timeout(1500)
        miss = await pg.evaluate("""([C, G]) => { const out = [];
          for (const [path, names] of Object.entries(C)) { const o = path.split('.').slice(1).reduce((a, k) => a && a[k], window);
            if (!o) { out.push(path + ' (없음)'); continue; } for (const n of names.split(' ')) if (!(n in o)) out.push(path + '.' + n); }
          for (const g of G) if (!(g in window)) out.push('window.' + g); return out; }""", [CONTRACT, ADDON_GLOBALS])
        check(not miss, "없어진 연결 고리: " + ", ".join(miss))
        return f"{sum(len(v.split()) for v in CONTRACT.values())}개 + 전역 {len(ADDON_GLOBALS)}개"
    finally:
        await env.close(pg)


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


@test("vcc-deep-safari")
async def t_vcc(env):
    """vcc.html — Robofest Vcc 2027 채점 규칙(틀린 답 섞이면 0 · 여러 번이면 50% · 창은 처음 나타난 시각) + 가상 팀 한 판."""
    ctx = await env.browser.new_context(viewport={"width": 1500, "height": 950}, locale="ko-KR")
    pg = await ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    try:
        await pg.goto(env.base + "/vcc.html")
        r = await pg.evaluate("""(() => {
          const V = window.__vcc;
          const cases = [['Tiger','Tiger',true],['Tiger - Animal','Tiger',true],['Polar Bear','Bear',false],['Giant Panda','Panda',false],
            ['Sea Turtle','Turtle',false],['Alligator','Crocodile',false],['Armadillos','Armadillo',true],['Cat','Tiger',false]];
          const bad = cases.filter(([t, l, e]) => V.isCorrect(t, l) !== e).map(c => c.join('/'));
          const ev = [{ch:'print',text:'Tiger',t:1},{ch:'speak',text:'Tiger',t:1},
            {ch:'print',text:'Horse',t:7},{ch:'print',text:'Zebra',t:7.5},{ch:'speak',text:'Zebra',t:7.5},
            {ch:'print',text:'Lion',t:13},{ch:'print',text:'Lion',t:15},{ch:'speak',text:'Lion',t:13},{ch:'speak',text:'Lion',t:18.5},
            {ch:'print',text:'Bear',t:19}];
          const j1 = V.judge(['Tiger','Zebra','Lion','Bear'], ev, 6, 1), j2 = V.judge(['Tiger','Zebra','Lion','Bear'], ev, 6, 2);
          return { bad, pts: j1.rows.map(x => [x.print.pts, x.speak.pts]), t1: j1.total, m1: j1.max, t2: j2.total, m2: j2.max,
            paths: ['zebra_01.jpg','Lion/a.png','얼룩말 3.jpg','rhinos/a.png','cat.jpg'].map(V.labelOfPath) };
        })()""")
        check(not r["bad"], f"정답 판정 틀림: {r['bad']}")
        check(r["pts"] == [[1, 1], [0, 1], [0.5, 1], [1, 0]], f"창별 점수: {r['pts']}")
        check((r["t1"], r["m1"], r["t2"], r["m2"]) == (5.5, 8, 11, 16), f"합계: {r}")
        check(r["paths"] == ["Zebra", "Lion", "Zebra", "Rhinoceros", None], f"파일 이름 → 동물: {r['paths']}")
        # 가상 팀 한 판 (정확도 100%, 흔들림 0, 한 번 출력, 5장 × 3초, 4배) → 만점
        await pg.evaluate("""(() => { const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); };
          s('vAcc', 100); s('vFlk', 0); s('vLat', 8); s('nSlides', 5); s('dur', '3'); s('speed', '4'); document.getElementById('vOut').value = 'once'; })()""")
        await pg.click("#startBtn")
        await pg.wait_for_function("window.__vcc.last && !window.__vcc.run", timeout=60000)
        res = await pg.evaluate("({ t: window.__vcc.last.total, m: window.__vcc.last.max, rows: document.querySelectorAll('#sheet tbody tr').length })")
        check(res["t"] == res["m"] == 10 and res["rows"] == 5, f"가상 팀 만점 아님: {res}")
        # 2초마다 반복 출력 → 맞는 답 여러 번(50%)이나 다음 창으로 넘어간 출력(0) 때문에 감점
        await pg.evaluate("""(() => { const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); };
          s('nSlides', 5); s('dur', '6'); document.getElementById('vOut').value = 'repeat'; })()""")
        await pg.click("#startBtn")
        await pg.wait_for_function("window.__vcc.last && window.__vcc.last.D === 6 && !window.__vcc.run", timeout=60000)
        rep = await pg.evaluate("window.__vcc.last.total")
        check(rep < 10, f"반복 출력인데 감점 없음: {rep}")
        check(not pg.errors, f"페이지 오류: {pg.errors[:3]}")
        return f"정답 판정 {len(r['paths'])}·창별 점수 맞음, 가상 팀 10/10, 반복 출력 {rep}/10"
    finally:
        with contextlib.suppress(Exception):
            await ctx.close()


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
