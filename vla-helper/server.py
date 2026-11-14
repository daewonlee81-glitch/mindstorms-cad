# /// script
# requires-python = ">=3.10"
# dependencies = ["websockets>=13", "pillow>=10", "numpy>=1.24"]
# ///
"""RoboMakers VLA 도우미 — MindStorms CAD(웹)와 같은 PC에서 돌아가는 VLA 계산 서버.

웹 CAD 시뮬레이터가 로봇 카메라 그림 + 지시 문장 + 센서 값을 보내면,
이 프로그램이 바퀴 명령(속도 mm/s, 회전 °/s) 묶음을 돌려줍니다.

  · 연습 모드(기본): AI 모델 없이 규칙으로 움직입니다. 연결 확인·수업 시연용.
        "빨간 물체로 가" → 화면에서 빨간색을 찾아 그쪽으로,  "선을 따라가" → 검은 선을 따라감
  · 모델 모드: --policy policies/smolvla_policy.py --model <학습한 모델 폴더>  (실험 기능)
  · 주행 기록: 웹 CAD의 "주행 기록" 을 켜면 recordings/ 폴더에 그림·명령을 저장합니다 (VLA 학습 데이터).

실행: 같은 폴더의 start-windows.bat / start-mac.command / start-linux.sh 를 더블클릭.
직접 실행: uv run server.py   (또는 pip install websockets pillow numpy 후 python server.py)
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import importlib.util
import io
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from websockets.asyncio.server import serve
    from websockets.http11 import Response
    from websockets.datastructures import Headers
except ImportError:  # 아주 오래된 websockets
    print("websockets 13 이상이 필요합니다:  pip install -U websockets")
    raise

VERSION = "1.0"
HERE = Path(__file__).resolve().parent
ALLOWED_ORIGINS = (
    "https://daewonlee81-glitch.github.io",
    "https://robomakers.co.kr",
    "https://www.robomakers.co.kr",
    "http://localhost",
    "http://127.0.0.1",
    "null",  # index.html 을 파일로 열었을 때 (file://)
)


def origin_ok(origin: str | None) -> bool:
    if not origin:
        return True  # 브라우저가 아닌 도구(테스트 스크립트)
    o = origin.rstrip("/")
    return any(o == a or o.startswith(a + ":") for a in ALLOWED_ORIGINS)


# ───────────────────────── 연습 모드 (규칙 기반) ─────────────────────────
COLORS = {
    "red": (["빨강", "빨간", "빨갛", "red", "赤", "红", "rojo"], 0),
    "orange": (["주황", "orange", "橙", "naranja"], 28),
    "yellow": (["노랑", "노란", "노랗", "yellow", "黄", "amarillo"], 55),
    "green": (["초록", "녹색", "green", "緑", "绿", "verde"], 125),
    "blue": (["파랑", "파란", "파랗", "blue", "青", "蓝", "azul"], 228),
}
LINE_WORDS = ["선", "라인", "line", "線", "线", "línea", "linea"]
STOP_WORDS = ["멈춰", "정지", "stop", "止", "停", "para"]


def hue_mask(img: np.ndarray, hue: float) -> np.ndarray:
    f = img.astype(np.float32) / 255.0
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mx, mn = f.max(-1), f.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    dh = np.minimum(np.abs(h - hue), 360 - np.abs(h - hue))
    return (s > 0.35) & (mx > 0.22) & (dh < 25)


def practice_policy(img: np.ndarray, task: str, state: dict) -> tuple[list, str]:
    """연습 모드: 지시 문장의 낱말 + 화면 색으로 바퀴 명령을 정합니다. (speed mm/s, turn °/s)"""
    t = task.lower()
    h, w = img.shape[:2]
    if any(k in t for k in STOP_WORDS):
        return [[0, 0]] * 2, "멈춤"
    for name, (words, hue) in COLORS.items():
        if any(k in t for k in words):
            m = hue_mask(img, hue)
            n = int(m.sum())
            if n < 3:
                return [[0, 80]] * 2, f"{words[0]} 찾는 중 (제자리 회전)"
            ys, xs = np.nonzero(m)
            cx = xs.mean() / w * 2 - 1  # -1 왼쪽 ~ +1 오른쪽
            area = n / (w * h)
            if ys.max() > h * 0.92 and abs(cx) < 0.5:  # 화면 맨 아래까지 왔으면 바로 앞
                return [[0, 0]] * 2, f"{words[0]} 도착"
            speed = 150 if abs(cx) < 0.3 else 40
            return [[speed, round(cx * 70)]] * 2, f"{words[0]} 보임 (가로 {cx:+.2f}, 크기 {area:.0%})"
    if any(k in t for k in LINE_WORDS):
        gray = img.astype(np.float32).mean(-1)
        rows = gray[int(h * 0.55):, :]
        dark = rows < 80
        n = int(dark.sum())
        if n < 3:
            return [[0, 80]] * 2, "선 찾는 중 (제자리 회전)"
        cx = np.nonzero(dark)[1].mean() / w * 2 - 1
        return [[90, round(cx * 110)]] * 2, f"선 따라가는 중 (가로 {cx:+.2f})"
    return [[0, 0]] * 2, "지시를 이해하지 못했어요 — 예: '빨간 물체로 가', '선을 따라가'"


# ───────────────────────── 모델 모드 (플러그인) ─────────────────────────
class PolicyPlugin:
    """policies/*.py 파일: load(model_path, device) 와 act(image, task, state) -> (chunk, note) 를 가짐."""

    def __init__(self, path: str, model: str | None, device: str):
        spec = importlib.util.spec_from_file_location("vla_policy", path)
        if not spec or not spec.loader:
            raise SystemExit(f"정책 파일을 열 수 없습니다: {path}")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.mod = mod
        self.name = getattr(mod, "NAME", Path(path).stem)
        print(f"모델 불러오는 중: {self.name} {model or ''} ({device}) …")
        self.state = mod.load(model, device)
        print("모델 준비 완료")

    def act(self, img, task, state):
        return self.mod.act(self.state, img, task, state)


# ───────────────────────── 주행 기록 ─────────────────────────
class Recorder:
    def __init__(self, root: Path):
        self.root = root
        self.dir: Path | None = None
        self.n = 0
        self.f = None

    def start(self, meta: dict) -> str:
        self.stop()
        self.root.mkdir(parents=True, exist_ok=True)
        task = re.sub(r"[^\w가-힣]+", "_", str(meta.get("task") or "task"))[:30].strip("_") or "task"
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.dir = self.root / f"{stamp}_{task}"
        (self.dir / "images").mkdir(parents=True, exist_ok=True)
        meta = {**meta, "started": datetime.now().isoformat(timespec="seconds"), "helper": VERSION}
        (self.dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        self.f = open(self.dir / "steps.jsonl", "w", encoding="utf-8")
        self.n = 0
        return str(self.dir)

    def frame(self, img: Image.Image | None, msg: dict):
        if not self.f or not self.dir:
            return
        self.n += 1
        name = f"images/{self.n:05d}.png"
        if img is not None:
            img.save(self.dir / name)
        row = {"i": self.n, "t": msg.get("t"), "image": name if img is not None else None,
               "state": msg.get("state"), "action": msg.get("action")}
        self.f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def stop(self, result: dict | None = None) -> dict | None:
        if not self.f or not self.dir:
            return None
        self.f.close()
        self.f = None
        if result is not None:
            p = self.dir / "meta.json"
            meta = json.loads(p.read_text(encoding="utf-8"))
            meta.update({"result": result, "frames": self.n})
            p.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        out = {"path": str(self.dir), "frames": self.n}
        self.dir = None
        return out


# ───────────────────────── 서버 ─────────────────────────
def decode_image(d) -> tuple[Image.Image | None, np.ndarray | None]:
    if not d:
        return None, None
    if isinstance(d, str) and d.startswith("data:"):
        d = d.split(",", 1)[1]
    im = Image.open(io.BytesIO(base64.b64decode(d))).convert("RGB")
    return im, np.asarray(im)


STATUS_PAGE = """<!doctype html><meta charset=utf-8><title>VLA 도우미</title>
<body style="font-family:sans-serif;max-width:560px;margin:40px auto;line-height:1.6">
<h2>✅ RoboMakers VLA 도우미가 켜져 있습니다</h2>
<p>모드: <b>{mode}</b><br>주소: ws://127.0.0.1:{port}<br>기록 폴더: {rec}</p>
<p>이제 MindStorms CAD → 로봇 시뮬레이터 → <b>VLA 도우미</b> 칸에서 <b>연결</b>을 누르세요.<br>
이 창(검은 창)은 끄지 말고 두세요. 끄면 연결이 끊어집니다.</p></body>"""


def main():
    ap = argparse.ArgumentParser(description="RoboMakers VLA 도우미")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--policy", help="모델 정책 파일 (예: policies/smolvla_policy.py). 없으면 연습 모드")
    ap.add_argument("--model", help="학습한 모델 폴더 또는 Hugging Face 이름")
    ap.add_argument("--device", default="auto", help="auto / cpu / cuda / mps")
    ap.add_argument("--rec", default=str(HERE / "recordings"), help="주행 기록 폴더")
    a = ap.parse_args()

    device = a.device
    plugin = None
    if a.policy:
        if device == "auto":
            try:
                import torch  # noqa
                device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
            except Exception:
                device = "cpu"
        plugin = PolicyPlugin(a.policy, a.model, device)
    mode = plugin.name if plugin else "연습 모드 (규칙 기반, AI 모델 아님)"
    rec = Recorder(Path(a.rec))
    clients = set()

    def process_request(conn, req):
        if req.headers.get("Upgrade", "").lower() != "websocket":
            body = STATUS_PAGE.format(mode=mode, port=a.port, rec=rec.root).encode()
            return Response(200, "OK", Headers([("Content-Type", "text/html; charset=utf-8"),
                                                ("Content-Length", str(len(body)))]), body)
        if not origin_ok(req.headers.get("Origin")):
            print("거부한 접속 (허용되지 않은 사이트):", req.headers.get("Origin"))
            return conn.respond(403, "origin not allowed\n")
        return None

    async def handler(ws):
        clients.add(ws)
        print(f"🔗 웹 CAD 연결됨 ({ws.request.headers.get('Origin') or '도구'})")
        n_act, t_act = 0, 0.0
        try:
            async for raw in ws:
                try:
                    m = json.loads(raw)
                except ValueError:
                    continue
                kind = m.get("type")
                if kind == "hello":
                    await ws.send(json.dumps({"type": "hello", "ver": VERSION, "mode": "model" if plugin else "practice",
                                              "name": mode, "device": device if plugin else "-", "rec": str(rec.root)},
                                             ensure_ascii=False))
                elif kind == "act":
                    t0 = time.perf_counter()
                    _, img = decode_image(m.get("image"))
                    if img is None:
                        img = np.zeros((72, 96, 3), np.uint8)
                    task, state = str(m.get("task") or ""), m.get("state") or {}
                    try:
                        chunk, note = (plugin.act(img, task, state) if plugin else practice_policy(img, task, state))
                    except Exception as e:  # 모델 오류는 멈춤 명령으로
                        chunk, note = [[0, 0]], f"모델 오류: {e}"
                    ms = (time.perf_counter() - t0) * 1000
                    n_act += 1
                    t_act += ms
                    await ws.send(json.dumps({"type": "act", "id": m.get("id"), "chunk": chunk, "dt": 0.1,
                                              "note": note, "ms": round(ms, 1)}, ensure_ascii=False))
                elif kind == "rec_start":
                    p = rec.start(m.get("meta") or {})
                    print("⏺ 기록 시작:", p)
                    await ws.send(json.dumps({"type": "rec_started", "path": p}, ensure_ascii=False))
                elif kind == "rec_frame":
                    im, _ = decode_image(m.get("image"))
                    rec.frame(im, m)
                elif kind == "rec_end":
                    out = rec.stop(m.get("result"))
                    if out:
                        print(f"⏹ 기록 저장: {out['path']} ({out['frames']}장)")
                        await ws.send(json.dumps({"type": "rec_saved", **out}, ensure_ascii=False))
                elif kind == "ping":
                    await ws.send(json.dumps({"type": "pong", "t": m.get("t")}))
        finally:
            clients.discard(ws)
            rec.stop({"note": "연결 끊김"})
            if n_act:
                print(f"연결 끊김 — 명령 {n_act}번, 평균 계산 {t_act / n_act:.1f} ms")
            else:
                print("연결 끊김")

    async def run():
        async with serve(handler, "127.0.0.1", a.port, process_request=process_request, max_size=8 * 2**20):
            print("=" * 60)
            print(f" RoboMakers VLA 도우미 {VERSION}  —  ws://127.0.0.1:{a.port}")
            print(f" 모드: {mode}")
            print(f" 주행 기록 폴더: {rec.root}")
            print(" 웹 CAD → 로봇 시뮬레이터 → 'VLA 도우미' 칸에서 [연결] 을 누르세요.")
            print(" 끝낼 때는 이 창을 닫거나 Ctrl+C")
            print("=" * 60)
            await asyncio.get_running_loop().create_future()

    try:
        asyncio.run(run())
    except OSError as e:
        print(f"\n포트 {a.port} 을(를) 열 수 없습니다. VLA 도우미가 이미 켜져 있는지 확인하세요. ({e})")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n끝냈습니다.")


if __name__ == "__main__":
    main()
