import numpy as np
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('KR', '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', subfontIndex=0))
F = 'KR'
G = np.load('grids.npy')
W, H = A4
c = canvas.Canvas('/home/claude/tagwork/apriltags-36h11-R1.pdf', pagesize=A4)
c.setTitle('AprilTag 36h11 — 봇볼 R1 VLA 탑뷰 (매트 10~13, 로봇 0~7)')
c.setAuthor('RoboMakers · MindStorms CAD')

def tag(x, y, idx, black_mm):
    """x,y = 왼쪽 아래 (검은 테두리 기준). black_mm = 검은 테두리 바깥 한 변."""
    cell = black_mm / 8 * mm
    g = G[idx]
    ox, oy = x - cell, y - cell  # 흰 테두리 포함 10칸의 왼쪽 아래
    # 자르는 선 (흰 여백 바깥 3mm)
    c.setDash(2, 2); c.setStrokeGray(0.6); c.setLineWidth(0.4)
    c.rect(ox - 4*mm, oy - 4*mm, 10*cell + 8*mm, 10*cell + 8*mm)
    c.setDash()
    c.setFillGray(0); c.rect(x, y, 8*cell, 8*cell, stroke=0, fill=1)
    c.setFillGray(1)
    for r in range(1, 9):
        for k in range(1, 9):
            if g[r, k] == 255:
                c.rect(ox + k*cell, oy + (9 - r)*cell, cell, cell, stroke=0, fill=1)
    return ox, oy, 10*cell

def checkline(y):
    x0 = (W - 100*mm) / 2
    c.setStrokeGray(0); c.setLineWidth(0.8)
    c.line(x0, y, x0 + 100*mm, y)
    for k in range(0, 11):
        h = 3*mm if k % 5 == 0 else 1.5*mm
        c.line(x0 + k*10*mm, y, x0 + k*10*mm, y + h)
    c.setFont(F, 8); c.setFillGray(0)
    c.drawCentredString(W/2, y - 4*mm, '인쇄 크기 확인선: 자로 재서 100mm (99~101mm)이면 정상. 아니면 "실제 크기(100%)"로 다시 인쇄')

def footer(p):
    c.setFont(F, 7); c.setFillGray(0.4)
    c.drawString(12*mm, 8*mm, 'AprilTag 36h11 · MindStorms CAD 봇볼 R1 VLA 탑뷰 · 자르는 선(점선) 안쪽의 흰 여백은 자르지 마세요')
    c.drawRightString(W - 12*mm, 8*mm, f'{p} / 5')

# ── 1쪽: 안내 + 배치도
c.setFont(F, 18); c.setFillGray(0)
c.drawString(18*mm, H - 25*mm, '에이프릴태그 인쇄물 — 봇볼 R1 VLA 탑뷰')
c.setFont(F, 10)
lines = [
 '구성: 2~3쪽 매트 모서리 태그 4장 (ID 10~13, 검은 테두리 90mm)',
 '         4~5쪽 로봇 태그 8장 (ID 0~7, 검은 테두리 70mm) — 로봇 한 대면 ID 0만 사용',
 '',
 '1. 인쇄: 프린터 설정에서 "실제 크기(100%)" 선택, "페이지에 맞추기"는 끄기. 레이저 프린터 + 무광 용지 권장.',
 '2. 확인: 각 쪽 아래 100mm 확인선을 자로 재기 (99~101mm).',
 '3. 자르기: 점선을 따라 자르기. 태그 둘레의 흰 여백(한 칸)은 꼭 남기기 — 없으면 인식 안 됨.',
 '4. 붙이기: 폼보드에 주름 없이 붙이기 (매트용 100×100mm, 로봇용 80×80mm 이상).',
 '5. 로봇 태그: 로봇 맨 위에 수평으로, "▲ 로봇 앞쪽" 화살표가 로봇 앞을 향하게.',
 '    두 바퀴 가운데 → 태그 가운데 앞뒤 거리, 바닥 → 태그 높이(mm)를 재서 적어 두기.',
 '6. 매트 태그: 아래 배치도처럼 매트 네 모서리 바로 바깥에, 화살표가 매트 위쪽(멀리)을 향하게.',
 '    매트 모서리 → 태그 가운데 가로·세로 거리(mm)를 재서 적어 두기.',
]
y = H - 38*mm
for s in lines:
    c.drawString(18*mm, y, s); y -= 6.2*mm
# 배치도 (매트 1220×610 축소)
s = 0.13
mw, mh = 1220*s*mm, 610*s*mm
mx, my = (W - mw)/2, 70*mm
c.setStrokeGray(0); c.setLineWidth(1); c.setFillGray(0.97); c.rect(mx, my, mw, mh, fill=1)
c.setFillGray(0.85); c.rect(mx, my, 236*2*s*mm*0.6, mh, stroke=0, fill=1)
c.setFillGray(0.2); c.setFont(F, 9); c.drawString(mx + 3*mm, my + mh/2, '출발 구역')
c.setFont(F, 8); c.drawCentredString(mx + mw/2, my + mh/2, '봇볼 R1 매트 1220 × 610 mm (위에서 본 모습)')
ts = 9*mm
for (tx, ty, idx, name) in [(mx - ts - 2*mm, my + mh + 2*mm, 10, '10 왼쪽 위'), (mx + mw + 2*mm, my + mh + 2*mm, 11, '11 오른쪽 위'),
                            (mx + mw + 2*mm, my - ts - 2*mm, 12, '12 오른쪽 아래'), (mx - ts - 2*mm, my - ts - 2*mm, 13, '13 왼쪽 아래')]:
    c.setFillGray(0); c.rect(tx, ty, ts, ts, stroke=0, fill=1)
    c.setFillGray(1); c.setFont(F, 8); c.drawCentredString(tx + ts/2, ty + ts/2 - 1.2*mm, str(idx))
    c.setFillGray(0); c.setFont(F, 8)
    c.drawCentredString(tx + ts/2, ty + (ts + 1.5*mm if ty > my else -4*mm), name)
c.setFont(F, 8); c.setFillGray(0.3)
c.drawCentredString(W/2, my - 22*mm, '웹캠은 매트 가운데 위 1.0~1.1m. 매트와 태그 4장이 한 화면에 모두 들어오게.')
c.drawCentredString(W/2, my - 27*mm, '매트·태그를 옮기면 프로그램의 보정을 다시 하세요.')
checkline(30*mm); footer(1); c.showPage()

# ── 2~3쪽: 매트 태그 90mm, 한 쪽에 2장
names = {10: '매트 왼쪽 위 (출발 구역 쪽)', 11: '매트 오른쪽 위', 12: '매트 오른쪽 아래', 13: '매트 왼쪽 아래 (출발 구역 쪽)'}
p = 2
for pair in ((10, 11), (12, 13)):
    for k, idx in enumerate(pair):
        b = 90*mm; x = (W - b)/2; y = H - 30*mm - b - k*135*mm
        tag(x, y, idx, 90)
        c.setFillGray(0); c.setFont(F, 11)
        c.drawCentredString(W/2, y + b + 20*mm, f'ID {idx} · {names[idx]} · 검은 테두리 90mm')
        c.setFont(F, 8); c.drawCentredString(W/2, y + b + 12*mm, '▲ 매트 위쪽 (먼 쪽)')
    checkline(22*mm); footer(p); c.showPage(); p += 1

# ── 4~5쪽: 로봇 태그 70mm, 한 쪽에 4장
for group in ((0, 1, 2, 3), (4, 5, 6, 7)):
    for k, idx in enumerate(group):
        b = 70*mm; col, row = k % 2, k // 2
        x = W/2 + (-1 if col == 0 else 1) * 50*mm - b/2
        y = H - 42*mm - b - row*118*mm
        tag(x, y, idx, 70)
        c.setFillGray(0); c.setFont(F, 10)
        c.drawCentredString(x + b/2, y + b + 16.5*mm, f'ID {idx} · 로봇 {idx + 1} · 70mm')
        c.setFont(F, 7); c.drawCentredString(x + b/2, y + b + 9.4*mm, '▲ 로봇 앞쪽')
    checkline(22*mm); footer(p); c.showPage(); p += 1
c.save()
