import re, sys
import numpy as np
src = open('/tmp/tags/tag36h11.c').read()
codes = [int(x,16) for x in re.findall(r'0x([0-9a-f]+)UL', src)]
bx = {int(i):int(v) for i,v in re.findall(r'bit_x\[(\d+)\] = (\d+);', src)}
by = {int(i):int(v) for i,v in re.findall(r'bit_y\[(\d+)\] = (\d+);', src)}
def grid(idx):
    c = codes[idx]; g = np.zeros((10,10), np.uint8)
    g[0,:]=g[9,:]=g[:,0]=g[:,9]=255  # white ring
    for i in range(36):
        if c & (1 << (35-i)): g[by[i]+1, bx[i]+1] = 255
    return g
# verify with detector
from pupil_apriltags import Detector
det = Detector(families='tag36h11')
ok = True
for idx in list(range(8))+[10,11,12,13]:
    g = grid(idx)
    big = np.kron(g, np.ones((20,20),np.uint8))
    big = np.pad(big, 40, constant_values=255)
    r = det.detect(big)
    ids = [d.tag_id for d in r]
    if ids != [idx]: ok=False
    print(idx, ids)
print('ALL OK' if ok else 'FAIL'); np.save('/home/claude/tagwork/grids.npy', np.array([grid(i) for i in range(14)]))
