#!/usr/bin/env python3
"""patch_cadx.py — app.js 에 CAD 덧붙임 스크립트(cadx.js)용 연결 고리를 넣습니다. 여러 번 돌려도 됩니다.

  1. 팔레트에서 끌 때의 미리보기(고스트) 모양을 window.__cadx.ghost 가 바꿀 수 있게
  2. .ldr 을 읽을 때 window.__cadx.onLoadText(text) 를 먼저 부름 (STL 부품 꺼내 등록)
  3. .ldr 을 만들 때 window.__cadx.onSaveText(text, model) 로 덧붙임 (STL 부품 넣기)
  4. 처음 시작할 때 window.__cadxReady (STL 부품 불러오기) 를 기다린 뒤 자동 저장 모델을 엶
  5. window.__cad.ext — 선택 부품·되돌리기·부품 추가·팔레트 다시 그리기 등
  6. 시뮬레이터 로봇의 장치→포트 기록(Q.devices)과 ext.simRebuild / robot / simRunning
  7. 로봇 부품 복제본 Q.clones[부품 id]와 ext.motors() (모터 각도) — 추가 모터에 붙은 부품 돌리기
  8. 허스키렌즈: 센서 종류 husky, 포트 표 값(window.__husky.text), ext.matPx(x,z) 매트 색
  9. 라인트레이싱 학습 컬러센서 2개 (line2.js): E0 가 window.__line2.spec 을 먼저 묻고, 채점(L2)은 두 센서 가운데 점 둘레의 선 칸으로
사용: python3 patch_cadx.py app.js
"""
import sys

PATCHES = [
    ('e.traverse(i=>{if(i.isMesh){let s=r=>{let o=r.clone();return o.transparent=!0,o.opacity=.7,o};i.material=Array.isArray(i.material)?i.material.map(s):s(i.material)}});let t=new Lt;',
     '(window.__cadx&&window.__cadx.ghost?window.__cadx.ghost(e,n):e.traverse(i=>{if(i.isMesh){let s=r=>{let o=r.clone();return o.transparent=!0,o.opacity=.7,o};i.material=Array.isArray(i.material)?i.material.map(s):s(i.material)}}));let t=new Lt;'),
    ('function OC(n){let e={name:',
     'function OC(n){window.__cadx&&window.__cadx.onLoadText&&window.__cadx.onLoadText(n);let e={name:'),
    ('function i0(){let n=[`0 ${le.name}`',
     'function i0(){let __t=i0x();return window.__cadx&&window.__cadx.onSaveText?window.__cadx.onSaveText(__t,le):__t}function i0x(){let n=[`0 ${le.name}`'),
    ('await SC(),P("#loading").hidden=!0',
     'await SC(),window.__cadxReady&&await window.__cadxReady.catch(()=>{}),P("#loading").hidden=!0'),
    ('select:n=>{qn=n,Ui(),En()}};',
     'select:n=>{qn=n,Ui(),En()},ext:{get sel(){return hi()},push:Yn,apply:n=>{xc(n),Ui(),En(),dn()},add:Cg,reload:Qh,palette:()=>{Lx(),nc()},bundle:()=>Oh,index:()=>un,loader:po,status:cn,T,get step(){return gt}}};',
     'ext:{get sel(){return hi()}'),  # 이미 넣었는지 확인하는 글자 (6번이 이 줄을 바꿔도 다시 넣지 않게)
    # 6. 시뮬레이터 포트 설정 (simports.js): 로봇을 만들 때 어느 부품이 어느 포트인지 기록 + 다시 만들기
    ('c.autoLeft=M[0]?.port,',
     'c.devices=M.map(b=>({id:b.p.id,port:b.port,kind:"motor"})),c.autoLeft=M[0]?.port,'),
    ('c.ports[b.port]={type:b.kind},c.sensors.push(',
     'c.ports[b.port]={type:b.kind},(c.devices=c.devices||[]).push({id:b.p.id,port:b.port,kind:b.kind}),c.sensors.push('),
    ('palette:()=>{Lx(),nc()},',
     'palette:()=>{Lx(),nc()},simRebuild:()=>{q.on&&ap()},get robot(){return Q},get simRunning(){return!!q.running},',
     'simRebuild:'),
    # 7. 추가 모터(팔·집게)가 돌 때 붙은 부품도 돌도록: 로봇 복제본(부품별)과 모터 상태(On)를 내보냄
    ('else l.add(U)}c.fromCad=!0',
     'else l.add(U);(c.clones=c.clones||{})[b.id]=U}c.fromCad=!0'),
    ('get simRunning(){return!!q.running},',
     'get simRunning(){return!!q.running},motors:()=>On,'),
    # 8. 허스키렌즈 (huskylens.js): 부품 이름으로 센서 종류 'husky' 인식, 포트 표에 값 표시, 매트 색 읽기
    ('[/Force Sensor|Touch Sensor/i,"force"]];',
     '[/Force Sensor|Touch Sensor/i,"force"],[/HuskyLens/i,"husky"]];'),
    ('force:T("\\uD798\\uC13C\\uC11C")}[i.type]',
     'force:T("\\uD798\\uC13C\\uC11C"),husky:"HuskyLens"}[i.type]'),
    ('i?.type==="force"&&(o=Ec||vt-ks<.2?"\\u25CF":"\\u25CB"),',
     'i?.type==="force"&&(o=Ec||vt-ks<.2?"\\u25CF":"\\u25CB"),i?.type==="husky"&&(o=window.__husky?ce(window.__husky.text(t)):""),'),
    ('get simRunning(){return!!q.running},motors:()=>On,',
     'get simRunning(){return!!q.running},motors:()=>On,matPx:(x,z)=>{let p=Math.round(x+ut/2),u=Math.round(z+yt/2);if(!Zi||p<0||u<0||p>=ut||u>=yt)return null;let h=(u*ut+p)*4;return[Zi[h],Zi[h+1],Zi[h+2]]},',
     'matPx:'),
    # 9. 라인트레이싱 학습: 컬러센서 2개 (line2.js)
    ('function E0(n="p"){let e=Av();if(!e)return T("\\uB85C\\uBD07\\uC5D0 \\uCEEC\\uB7EC \\uC13C\\uC11C\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4");',
     'function E0(n="p"){let e=Av();if(!e)return T("\\uB85C\\uBD07\\uC5D0 \\uCEEC\\uB7EC \\uC13C\\uC11C\\uAC00 \\uC5C6\\uC2B5\\uB2C8\\uB2E4");if(window.__line2&&window.__line2.pair()){let __s=window.__line2.spec(n,T);if(__s)return __s.onBest=u=>{K.genBest=u.slice(),K.genCtrl=n,hp()},__s}'),
    ('function L2(){let n=Tv(),e=new Uint8Array(n.on.length),t=Av(),',
     'function L2(){let __L=window.__line2&&window.__line2.pairS&&window.__line2.pairS(),n=Tv(),e=new Uint8Array(n.on.length),t=Av(),'),
    ('let d=ur(t.port);if(!d){s+=l;return}let{o:p}=p0(t),u=Tc(d);',
     # 센서 2개: 두 센서 가운데 점에서 (센서 간격/2 + 15mm) 안에 있는 선 칸을 따라간 칸으로, 그 안에 선이 없으면 선 밖
     'if(__L){let A=p0(__L[0]).o,B=p0(__L[1]).o,px=(A.x+B.x)/2,pz=(A.z+B.z)/2;if(Nt.raise&&!rp(px,pz)){s+=l;return}let R0=Math.hypot(A.x-B.x,A.z-B.z)/2+15,h=Math.floor((px+ut/2)/or),f=Math.floor((pz+yt/2)/or),k=Math.ceil(R0/or),hit=0;for(let m=f-k;m<=f+k;m++)for(let _=h-k;_<=h+k;_++){if(_<0||m<0||_>=n.nx||m>=n.ny)continue;if(Math.hypot((_+.5)*or-ut/2-px,(m+.5)*or-yt/2-pz)>R0)continue;let g=m*n.nx+_;n.on[g]&&(hit=1,e[g]||(e[g]=1,i++))}hit||(s+=l);o==null&&a()>=1&&(o=c);return}let d=ur(t.port);if(!d){s+=l;return}let{o:p}=p0(t),u=Tc(d);'),
]


def main(path):
    s = open(path, encoding='utf-8').read()
    for a, b, *mark in PATCHES:
        if b in s or (mark and mark[0] in s):
            print('skip (already):', a[:50]); continue
        n = s.count(a)
        if n != 1:
            raise SystemExit(f'pattern found {n}x: {a[:70]}')
        s = s.replace(a, b)
        print('patched:', a[:50])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'app.js')
