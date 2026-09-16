# -*- coding: utf-8 -*-
"""제출용 덱(40장)에서 발표용 14장을 뽑는다 — 제목으로 고르고 나머지를 지운다.

  python3 tools/make_talk_deck.py [제출용.pptx] [발표용.pptx]

  - 제목 매칭이라 사용자가 제출용의 순서를 바꿔도 안전하다
  - 지우기만 하고 추가하지 않으므로 파트 이름 충돌이 없다(29라운드 교훈)
  - 표지(첫 장)와 마지막 장(감사합니다)은 항상 남긴다. 페이지 번호는 1부터 다시 매긴다
"""
import os, shutil, sys
from pptx import Presentation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'deliverables', '10반_황재원_너와나의인계고리-개요.pptx')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'deliverables', '10반_황재원_너와나의인계고리-발표용.pptx')

KEEP = [   # 발표 순서 = 제출용 순서 그대로
    '교대할 때 무슨 일이 일어나나',
    '그래서 이 서비스는 세 가지를 한다',
    '무엇을 만들었나',
    ('기능', '기능 여섯 개'),            # 사용자 편집본 제목 / 생성본 제목
    '화면 흐름',
    '인계 쓰기',
    '인계 받기',
    '결원 재배정',
    ('핵심 데이터', '데이터, 핵심 여섯 개'),
    '막을 때 주는 답',
    '써 본 사람의 말',
    '어떻게 확인했나',
]   # 표지(첫 장)와 감사합니다(마지막 장)는 항상 남긴다

IN = 914400
def titles_of(sl):
    """제목 상자만 본다(위 0.3in · 왼쪽 여백 · 폭 3in 이상) — 목차의 항목 글자에 걸리지 않게"""
    return set(sh.text_frame.text.strip() for sh in sl.shapes
               if sh.has_text_frame and abs(sh.top / IN - 0.3) < 0.06 and sh.left / IN < 0.7 and sh.width / IN > 3)

def matches(k, t):   # k 는 문자열 또는 대체 제목 튜플
    return any(x in t for x in (k if isinstance(k, tuple) else (k,)))

shutil.copyfile(SRC, OUT)
prs = Presentation(OUT)
lst = prs.slides._sldIdLst
kept, dropped = [], 0
pairs = list(zip(list(lst), list(prs.slides)))
for i, (el, sl) in enumerate(pairs):
    t = titles_of(sl)
    hit = [k for k in KEEP if matches(k, t)]
    if i == 0 or i == len(pairs) - 1 or hit:
        kept.append((hit[0][0] if isinstance(hit[0], tuple) else hit[0]) if hit else ('표지' if i == 0 else '마지막 장'))
        continue
    lst.remove(el); prs.part.drop_rel(el.rId); dropped += 1

missing = [k for k in KEEP if (k[0] if isinstance(k, tuple) else k) not in kept]
if missing:
    sys.exit('중단: 제출용에서 못 찾은 장 — %s' % missing)

n = 0
for idx, sl in enumerate(prs.slides, 1):
    for sh in sl.shapes:
        if sh.has_text_frame and sh.text_frame.text.strip().isdigit() and sh.left / IN > 8.5 and sh.top / IN > 5.0:
            for para in sh.text_frame.paragraphs:
                for r in para.runs: r.text = ''
            sh.text_frame.paragraphs[0].runs[0].text = str(idx); n += 1
prs.save(OUT)
print('발표용 → %s  (%d 장 · %d 장 지움 · 페이지 번호 %d 곳)' % (OUT, len(prs.slides), dropped, n))
for i, k in enumerate(kept, 1): print('  %2d  %s' % (i, k))
