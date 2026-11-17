"""천장 웹캠 보정 마법사 시험용 합성 사진 만들기 (정답을 아는 사진).

봇볼 매트(1220×610) + 모서리 태그 4장(90mm) + 로봇 태그 ID 0(70mm, 바닥에서 100mm)을
실제 교실과 비슷한 카메라(높이 1040mm, 매트 앞쪽 0.7m, 약 30° 기울기, 가로 화각 약 70°)로 찍은 것처럼 그림.
결과: tests/fixtures/overcam_synth.png, overcam_synth.json (원 가운데의 화면 좌표, 로봇 정답 위치)
사용: python3 tools/real2sim/make_fixture.py   (numpy, opencv-python 필요)
"""
import json, math, re, urllib.request
from pathlib import Path
import numpy as np, cv2

ROOT = Path(__file__).resolve().parents[2]
W, H = 1920, 1080
CAM = np.array([629.0, 1011.0, 1040.0])          # 매트 mm (x, y, 높이)
TARGET = np.array([610.0, 330.0, 0.0])
HFOV = 70.0
TAG_H = 100.0
ROBOT = dict(x=300.0, y=300.0, deg=20.0)          # 태그 가운데 = 로봇 중심, 방향(매트 +x 기준, 시계 방향 +)
CORNER_TAGS = {10: (-50, -35), 11: (1276, -57), 12: (1287, 660), 13: (-67, 665)}
CIRC = {1: [462, 79], 2: [397, 305], 3: [364, 465], 4: [537, 305], 5: [679, 165], 6: [679, 305], 7: [679, 445], 8: [763, 564], 9: [960, 306], 10: [1077, 112], 11: [1174, 305], 12: [1077, 497]}

def tag_grid(idx):
    src = (ROOT / 'tools/real2sim/tag36h11.c')
    if not src.exists():
        src.write_text(urllib.request.urlopen('https://raw.githubusercontent.com/AprilRobotics/apriltag/master/tag36h11.c').read().decode())
    s = src.read_text()
    codes = [int(x, 16) for x in re.findall(r'0x([0-9a-f]+)UL', s)]
    bx = {int(i): int(v) for i, v in re.findall(r'bit_x\[(\d+)\] = (\d+);', s)}
    by = {int(i): int(v) for i, v in re.findall(r'bit_y\[(\d+)\] = (\d+);', s)}
    g = np.zeros((10, 10), np.uint8); g[0, :] = g[9, :] = g[:, 0] = g[:, 9] = 255
    for i in range(36):
        if codes[idx] >> (35 - i) & 1: g[by[i] + 1, bx[i] + 1] = 255
    return g

# 카메라
f = (W / 2) / math.tan(math.radians(HFOV / 2))
z = TARGET - CAM; z /= np.linalg.norm(z)
x = np.cross([0, 0, 1.0], z); x /= np.linalg.norm(x)   # 화면 오른쪽 (= 매트 +x 쪽)
y = np.cross(x, z)                                       # 화면 아래 (= 카메라 쪽)
R = np.stack([x, y, z])                                  # 세계 → 카메라
def project(P):
    c = R @ (np.asarray(P, float) - CAM); return [f * c[0] / c[2] + W / 2, f * c[1] / c[2] + H / 2]

# 바닥 그림 (1px = 1mm, 원점 = 매트 (-300,-300))
O = 300; floor = np.full((610 + 2 * O, 1220 + 2 * O, 3), (150, 185, 205), np.uint8)   # 나무 책상 (BGR)
cv2.rectangle(floor, (O, O), (O + 1220, O + 610), (245, 245, 245), -1)
cv2.rectangle(floor, (O, O), (O + 1220, O + 610), (20, 20, 20), 6)
for k, (cx, cy) in CIRC.items():
    cv2.circle(floor, (O + cx, O + cy), 31, (40, 40, 160), 3)
    cv2.putText(floor, str(k), (O + cx - 12, O + cy + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (60, 60, 60), 2)
for col, pts in [((60, 194, 60), [[526, 185], [760, 185], [760, 424], [526, 424]]), ((0, 165, 255), [[986, 17], [792, 17], [792, 218], [986, 218]]), ((240, 60, 10), [[1055, 284], [1202, 430], [1050, 583], [904, 435]])]:
    cv2.polylines(floor, [np.array(pts, np.int32) + O], True, col, 7)
for tid, (cx, cy) in CORNER_TAGS.items():
    g = cv2.resize(tag_grid(tid), (112, 112), interpolation=cv2.INTER_NEAREST)   # 90mm 검은 테두리 = 8칸 → 10칸 112.5mm
    pad = np.full((132, 132), 255, np.uint8); pad[10:122, 10:122] = g
    x0, y0 = O + cx - 66, O + cy - 66; floor[y0:y0 + 132, x0:x0 + 132] = cv2.cvtColor(pad, cv2.COLOR_GRAY2BGR)

# 화면 픽셀마다 광선 → 로봇 태그 면(높이 100) 먼저, 아니면 바닥
u, v = np.meshgrid(np.arange(W) + .5, np.arange(H) + .5)
d = np.stack([(u - W / 2) / f, (v - H / 2) / f, np.ones_like(u)], -1) @ R          # 세계 방향
def hit(h):
    t = (h - CAM[2]) / d[..., 2]; return CAM[0] + t * d[..., 0], CAM[1] + t * d[..., 1]
fx, fy = hit(0.0)
img = cv2.remap(floor, (fx + O).astype(np.float32), (fy + O).astype(np.float32), cv2.INTER_LINEAR, borderValue=(90, 90, 90))
# 로봇 태그 (위쪽 = 로봇 앞) + 흰 여백 + 회색 로봇 판(100×100)
tx, ty = hit(TAG_H)
a = math.radians(ROBOT['deg']); fwd = np.array([math.cos(a), math.sin(a)]); right = np.array([-fwd[1], fwd[0]])
lx = (tx - ROBOT['x']) * right[0] + (ty - ROBOT['y']) * right[1]        # 태그 가로 (오른쪽 +)
ly = -((tx - ROBOT['x']) * fwd[0] + (ty - ROBOT['y']) * fwd[1])         # 태그 세로 (아래 +, 앞 = 위)
cell = 70 / 8; g0 = tag_grid(0)
board = (np.abs(lx) < 55) & (np.abs(ly) < 55)
img[board] = (200, 200, 200)
inside = (np.abs(lx) < 5 * cell) & (np.abs(ly) < 5 * cell)
ci = np.clip(((lx + 5 * cell) / cell).astype(int), 0, 9); ri = np.clip(((ly + 5 * cell) / cell).astype(int), 0, 9)
val = g0[ri, ci]; img[inside] = np.stack([val[inside]] * 3, -1)
img = cv2.GaussianBlur(img, (3, 3), 0.7)
out = ROOT / 'tests/fixtures'; out.mkdir(parents=True, exist_ok=True)
cv2.imwrite(str(out / 'overcam_synth.png'), img)
truth = {'size': [W, H], 'cam': CAM.tolist(), 'hfov': HFOV, 'tagH': TAG_H, 'robot': ROBOT, 'clicks': {k: project([*CIRC[k], 0]) for k in CIRC}}
(out / 'overcam_synth.json').write_text(json.dumps(truth, indent=1))
print('ok', out / 'overcam_synth.png')
