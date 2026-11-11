# Adds the window.__trx hook to the built app.js so the auto-tuning trainer can use a field's own
# per-world layouts and scoring (used by umc.js for the UMC missions and the Robofest game).
# Exact-string replacements on the minified build; each must match once. Safe to re-run (skips if present).
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
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
 # learning model (search method) chosen in the trainer: trainmodel.js sets window.__trs; without it the
 # built-in cross-entropy search runs as before
 ('for(;x.length<l;)x.push(a.map((E,w)=>w<y?E.q(d[w]+p[w]*X2()):0));',
  'if(window.__trs&&window.__trs.on())window.__trs.gen({x,N:l,dims:a,lim:y,mean:d,sd:p,best:u,g,gauss:X2});else for(;x.length<l;)x.push(a.map((E,w)=>w<y?E.q(d[w]+p[w]*X2()):0));'),
 ('let M=A.slice(0,c);if(d=a.map((E,w)=>M.reduce((b,S)=>b+S.P[w],0)/c),p=a.map((E,w)=>{let b=Math.sqrt(M.reduce((S,U)=>S+(U.P[w]-d[w])**2,0)/c);return Math.max(E.sd0*.08,.6*b+.4*p[w]*.85)}),t.grow&&f>=4',
  'let M=A.slice(0,c);if(window.__trs&&window.__trs.on()?(window.__trsO=window.__trs.update({ranked:A,dims:a,mean:d,sd:p,best:u,still:f,elite:c,g,lim:y}),d=window.__trsO.mean,p=window.__trsO.sd):(d=a.map((E,w)=>M.reduce((b,S)=>b+S.P[w],0)/c),p=a.map((E,w)=>{let b=Math.sqrt(M.reduce((S,U)=>S+(U.P[w]-d[w])**2,0)/c);return Math.max(E.sd0*.08,.6*b+.4*p[w]*.85)})),t.grow&&f>=4'),
 # learning model "신경망": trainmodel.js gives its own training spec and its own "apply best"
 ('t=K.mode==="gen"?e==="LINE"?E0(n.ctrl||P("#trCtrl").value):W2():z2()',
  't=window.__trs&&window.__trs.spec&&window.__trs.spec(e)||(K.mode==="gen"?e==="LINE"?E0(n.ctrl||P("#trCtrl").value):W2():z2())'),
 ('function qh(){if(K.best){',
  'function qh(){if(window.__trs&&window.__trs.apply&&window.__trs.apply())return;if(K.best){'),
 # trainer grid: draw each world's own floor
 # search: on fields with random layouts the best program is re-run on a new layout every generation (it is always
 # candidate #1); keep its score as the average of all its runs so one lucky layout cannot win
 ('h==null&&(h=v[0].res.pct),A[0].reward>u.r+.05?',
  'h==null&&(h=v[0].res.pct),window.__trx&&window.__trx.task&&window.__trx.task()&&u.r>=0&&(u.n=(u.n||1)+1,u.r+=(v[0].reward-u.r)/u.n,u.pct+=(v[0].res.pct-u.pct)/u.n),A[0].reward>u.r+.05?'),
 ('s.drawImage(lo,0,0),s.strokeStyle="rgba(30,90,200,.75)"',
  's.drawImage(lo,0,0),u.matC&&s.drawImage(u.matC,r.dx,r.dy,ut*o,yt*o),s.strokeStyle="rgba(30,90,200,.75)"'),
]
done = 0
for a, b in R:
    if b in s: continue  # already applied
    n = s.count(a)
    if n != 1: sys.exit(f'pattern found {n} times: {a[:60]}')
    s = s.replace(a, b); done += 1
open(p, 'w', encoding='utf-8').write(s)
print('patched', done, 'of', len(R))
