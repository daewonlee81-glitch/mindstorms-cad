# Adds the window.__trx hook to the built app.js so the auto-tuning trainer can use a field's own
# per-world layouts and scoring (used by umc.js for the UMC missions and the Robofest game).
# Exact-string replacements on the minified build; each must match once. Safe to re-run (skips if present).
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
if 'window.__trx' in s:
    print('already patched'); sys.exit(0)
R = [
 # trTaskOf: a field with its own judge
 ('function Cv(){let n=Nt?.jbcTask;',
  'function Cv(){let __t=window.__trx&&window.__trx.task&&window.__trx.task();if(__t)return __t;let n=Nt?.jbcTask;'),
 # makeJudge
 ('function Rv(n){if(n==="LINE"){',
  'function Rv(n){if(window.__trx&&window.__trx.judge&&n===(window.__trx.task&&window.__trx.task()))return window.__trx.judge();if(n==="LINE"){'),
 # ctxSave: per-world floor picture and walls
 ('PW:Ct,wbs:Zt})}',
  'PW:Ct,wbs:Zt,matD:Zi,walls:Na}),window.__trx&&window.__trx.save&&window.__trx.save(n)}'),
 # ctxLoad
 ('Ct=n.PW,Zt=n.wbs}',
  'Ct=n.PW,Zt=n.wbs,n.matD&&(Zi=n.matD),n.walls&&(Na=n.walls),window.__trx&&window.__trx.load&&window.__trx.load(n)}'),
 # newWorld: the field makes this world's layout (and its props) itself
 ('return s.props=Kx(),s.wbs=w0(s.pth),s}',
  'return window.__trx&&window.__trx.world?window.__trx.world(s,()=>Kx()):s.props=Kx(),s.wbs=w0(s.pth),s}'),
 # stop both drive motors in the same moment: awaiting the first stop let another trainer field switch in,
 # so the second stop hit that field's motor and this field's right wheel kept turning (curved runs in training)
 ('async wbDbStop(){ge();let n=sr();await Wn.motorStop(n.L),await Wn.motorStop(n.R)}',
  'async wbDbStop(){ge();let n=sr();await Promise.all([Wn.motorStop(n.L),Wn.motorStop(n.R)])}'),
 # trainer grid: draw each world's own floor
 # search: on fields with random layouts the best program is re-run on a new layout every generation (it is always
 # candidate #1); keep its score as the average of all its runs so one lucky layout cannot win
 ('h==null&&(h=v[0].res.pct),A[0].reward>u.r+.05?',
  'h==null&&(h=v[0].res.pct),window.__trx&&window.__trx.task&&window.__trx.task()&&u.r>=0&&(u.n=(u.n||1)+1,u.r+=(v[0].reward-u.r)/u.n,u.pct+=(v[0].res.pct-u.pct)/u.n),A[0].reward>u.r+.05?'),
 ('s.drawImage(lo,0,0),s.strokeStyle="rgba(30,90,200,.75)"',
  's.drawImage(lo,0,0),u.matC&&s.drawImage(u.matC,r.dx,r.dy,ut*o,yt*o),s.strokeStyle="rgba(30,90,200,.75)"'),
]
for a, b in R:
    n = s.count(a)
    if n != 1: sys.exit(f'pattern found {n} times: {a[:60]}')
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('patched', len(R))
