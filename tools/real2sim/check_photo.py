# 천장 웹캠 사진 점검 (2026-11-18): 태그 검출 → 번호 원으로 매트 좌표(호모그래피) → 카메라 위치·기울기 → 로봇 태그 높이·위치 보정.
# 사용: python3 tools/real2sim/check_photo.py  (사진 경로·원 위치 추정값은 파일 안에서 바꿈)
import numpy as np, cv2
from pupil_apriltags import Detector
img=cv2.imread('/mnt/user-data/uploads/ee55434a-image.jpg'); g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
# redness = R - (G+B)/2
b,gg,r=[img[...,i].astype(float) for i in range(3)]; red=np.clip(r-(gg+b)/2,0,255).astype(np.uint8)
guess={1:(981,423),2:(868,650),3:(794,836),4:(1053,652),8:(1356,980),9:(1608,662),10:(1730,462),11:(1902,665),12:(1812,903)}
ai={1:[462,79],2:[397,305],3:[364,465],4:[537,305],5:[679,165],6:[679,305],7:[679,445],8:[763,564],9:[960,306],10:[1077,112],11:[1174,305],12:[1077,497]}
cen={}
for k,(x,y) in guess.items():
    x0,y0=x-90,y-90; 
    gp=g[y0:y+90,x0:x+90]
    th=cv2.adaptiveThreshold(gp,255,cv2.ADAPTIVE_THRESH_MEAN_C,cv2.THRESH_BINARY_INV,25,12)
    ys,xs=np.nonzero(th); rr=np.hypot(xs-90,ys-90); sel=(rr>25)&(rr<70)
    xs,ys=xs[sel],ys[sel]
    if len(xs)<40: print(k,'few'); continue
    e=cv2.fitEllipse(np.stack([xs,ys],1).astype(np.float32))
    cen[k]=(e[0][0]+x0,e[0][1]+y0); 
print({k:tuple(round(v,1) for v in c) for k,c in cen.items()})
ks=sorted(cen); src=np.float32([cen[k] for k in ks]); dst=np.float32([ai[k] for k in ks])
H,_=cv2.findHomography(src,dst,0)
res=cv2.perspectiveTransform(src[None],H)[0]-dst
for k,e in zip(ks,res): print('circle',k,'residual mm',round(float(np.hypot(*e)),1))
print('RMS',round(float(np.sqrt((res**2).sum(1).mean())),1))
det={d.tag_id:d for d in Detector(families='tag36h11').detect(g)}
for t in (10,11,12,13,0):
    p=cv2.perspectiveTransform(np.float32([[det[t].center]]),H)[0,0]; print('tag',t,'mat mm',np.round(p,0))
# robot tag heading: corners order (lb, rb, rt, lt) per apriltag; top edge midpoint = between corners 2,3
c=cv2.perspectiveTransform(det[0].corners[None].astype(np.float32),H)[0]
top=(c[2]+c[3])/2; bot=(c[0]+c[1])/2; v=top-bot
print('robot tag side mm', [round(float(np.linalg.norm(c[i]-c[(i+1)%4])),1) for i in range(4)])
import math; print('heading deg (0=+x right, +=clockwise in image)', round(math.degrees(math.atan2(v[1],v[0])),1))
np.save('H.npy',H)

# ---- camera pose from floor homography (square pixels, principal point = image centre) ----
Hi=np.linalg.inv(H); Hi/=Hi[2,2]   # mat mm -> image px
h,w=g.shape; cx,cy=w/2,h/2
T=np.array([[1,0,-cx],[0,1,-cy],[0,0,1]]); A=T@Hi
h1,h2=A[:,0],A[:,1]
# r1.r2=0 with K=diag(f,f,1): (h1x h2x + h1y h2y)/f^2 + h1z h2z = 0
f=np.sqrt(-(h1[0]*h2[0]+h1[1]*h2[1])/(h1[2]*h2[2]))
Kinv=np.diag([1/f,1/f,1]); r1=Kinv@h1; r2=Kinv@h2; s=(np.linalg.norm(r1)+np.linalg.norm(r2))/2
r1/=s; r2/=s; t=(Kinv@A[:,2])/s; r3=np.cross(r1,r2); R=np.stack([r1,r2,r3],1)
C=-R.T@t
print('focal px',round(f),'hfov deg',round(np.degrees(2*np.arctan(w/2/f)),1))
print('camera position in mat mm (x,y,height)',np.round(C,0))
tilt=np.degrees(np.arccos(abs(R[:,2]@np.array([0,0,1])))) if False else np.degrees(np.arccos(abs(R.T[2]@np.array([0,0,1]))))
print('optical axis tilt from vertical deg',round(float(tilt),1))
# robot tag height from magnification, then corrected centre
c0=cv2.perspectiveTransform(det[0].corners[None].astype(np.float32),H)[0]
m=np.mean([np.linalg.norm(c0[i]-c0[(i+1)%4]) for i in range(4)])/70
Hc=abs(C[2]); htag=Hc*(1-1/m)
pf=cv2.perspectiveTransform(np.float32([[det[0].center]]),H)[0,0]
N=C[:2]; ptrue=N+(pf-N)/m
print('magnification',round(m,3),'tag height above floor mm',round(htag),'floor-projected',np.round(pf),'corrected centre',np.round(ptrue))
