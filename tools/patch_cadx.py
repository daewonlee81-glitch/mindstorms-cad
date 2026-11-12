#!/usr/bin/env python3
"""patch_cadx.py — app.js 에 CAD 덧붙임 스크립트(cadx.js)용 연결 고리를 넣습니다. 여러 번 돌려도 됩니다.

  1. 팔레트에서 끌 때의 미리보기(고스트) 모양을 window.__cadx.ghost 가 바꿀 수 있게
  2. .ldr 을 읽을 때 window.__cadx.onLoadText(text) 를 먼저 부름 (STL 부품 꺼내 등록)
  3. .ldr 을 만들 때 window.__cadx.onSaveText(text, model) 로 덧붙임 (STL 부품 넣기)
  4. 처음 시작할 때 window.__cadxReady (STL 부품 불러오기) 를 기다린 뒤 자동 저장 모델을 엶
  5. window.__cad.ext — 선택 부품·되돌리기·부품 추가·팔레트 다시 그리기 등
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
     'select:n=>{qn=n,Ui(),En()},ext:{get sel(){return hi()},push:Yn,apply:n=>{xc(n),Ui(),En(),dn()},add:Cg,reload:Qh,palette:()=>{Lx(),nc()},bundle:()=>Oh,index:()=>un,loader:po,status:cn,T,get step(){return gt}}};'),
]


def main(path):
    s = open(path, encoding='utf-8').read()
    for a, b in PATCHES:
        if b in s:
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
