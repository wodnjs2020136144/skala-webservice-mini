# -*- coding: utf-8 -*-
"""사용자가 PowerPoint 로 직접 고친 덱에 세션 슬라이드를 **삽입/교체**한다 — 생성기로 덮어쓰지 않는다.

  python3 tools/insert_session_slides.py [pptx]               36장 → 38장: 34장(못 한 것) 뒤에 35·36 삽입 (29라운드 R162)
  python3 tools/insert_session_slides.py --rebuild35 [pptx]   38장 파일의 35장(써 본 사람의 말)만 새로 짜서 교체 (R163)

  안전장치
  - PowerPoint 가 그 파일을 열고 있으면 중단한다 (열린 채 쓰면 사용자가 나중에 저장할 때 변경이 사라진다)
  - work/backup/ 에 복사본이 있어야 한다
  - 장수와 35장 제목을 확인하고 어긋나면 중단한다
  - 기존 장의 텍스트는 페이지 번호(삽입 때만, 35 → 37) 외에 건드리지 않는다
  디자인 토큰은 work/deck_build.js 와 같은 값이다.
"""
import os, subprocess, sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_CONNECTOR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
MODE = 'rebuild35' if '--rebuild35' in sys.argv else 'insert'
PPTX = args[0] if args else os.path.join(ROOT, 'deliverables', '10반_황재원_너와나의인계고리-개요.pptx')   # 인자 = 시험용 복사본
BACKUP_DIR = os.path.join(ROOT, 'work', 'backup')

PAPER, INK, INK2, MUTED, LINE = 'FBF8F2', '2A2926', '55524B', '8A867C', 'E6E0D4'
TEAL, AMBER = '1F8A7E', 'B9772E'
F = 'Apple SD Gothic Neo'
W, H, M = 10.0, 5.625, 0.6
INSERT_AFTER = 34          # "못 한 것" 뒤
S35_TITLE = '써 본 사람의 말'

# ---------- 안전장치 ----------
def powerpoint_has_file_open():
    try:
        out = subprocess.run(['osascript', '-e', 'tell application "Microsoft PowerPoint" to return name of every presentation'],
                             capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return False
    return os.path.basename(PPTX) in out

if powerpoint_has_file_open():
    sys.exit('중단: PowerPoint 가 이 파일을 열고 있다. 닫은 뒤 다시 실행할 것')
if not (os.path.isdir(BACKUP_DIR) and any(f.endswith('.pptx') for f in os.listdir(BACKUP_DIR))):
    sys.exit('중단: work/backup/ 에 복사본이 없다. 먼저 백업할 것')

prs = Presentation(PPTX)

def rgb(h): return RGBColor.from_string(h)

# ---------- 그리기 헬퍼 (deck_build.js 의 모양을 따른다) ----------
def text(s, x, y, w, h, runs, size=11, color=INK, bold=False, align='l', valign='m', spacing=1.15):
    """runs: 문자열 또는 [(text, {size,color,bold,font}), ...]. '\n' 이 있으면 문단을 나눈다."""
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[valign]
    if isinstance(runs, str): runs = [(runs, {})]
    para = tf.paragraphs[0]
    for t, o in runs:
        parts = t.split('\n')
        for i, part in enumerate(parts):
            if i > 0: para = tf.add_paragraph()
            para.alignment = {'l': PP_ALIGN.LEFT, 'r': PP_ALIGN.RIGHT, 'c': PP_ALIGN.CENTER}[align]
            para.line_spacing = spacing
            if part == '': continue
            r = para.add_run(); r.text = part
            r.font.name = o.get('font', F); r.font.size = Pt(o.get('size', size))
            r.font.bold = o.get('bold', bold); r.font.color.rgb = rgb(o.get('color', color))
    return tb

def hr(s, x, y, w, color=LINE, pt=0.5):
    c = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x), Inches(y), Inches(x + w), Inches(y))
    c.line.color.rgb = rgb(color); c.line.width = Pt(pt)
    return c

def new_slide(page_no, sec, title, sub, s=None):
    """s 를 주면 그 슬라이드를 비우고 그 위에 그린다(교체 모드 — 파트 이름 충돌을 피한다)"""
    if s is None:
        s = prs.slides.add_slide(prs.slide_layouts[0])
    for sh in list(s.shapes): sh._element.getparent().remove(sh._element)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(PAPER)
    text(s, W - M - 0.5, H - 0.36, 0.5, 0.2, str(page_no), size=8, color=MUTED, align='r')
    text(s, W - M - 3, 0.3, 3, 0.22, sec, size=9, color=MUTED, align='r')
    text(s, M, 0.3, W - 2 * M - 3.1, 0.46, title, size=22, bold=True, color=INK)
    if sub: text(s, M, 0.86, W - 2 * M, 0.24, sub, size=11.5, color=INK2)
    return s

def foot(s, t):
    hr(s, M, H - 0.46, W - 2 * M - 0.6)
    text(s, M, H - 0.4, W - 2 * M - 0.6, 0.26, t, size=9, color=MUTED)

def notes(s, t):   # 이 레이아웃엔 노트 자리표시자가 없다 — 없으면 건너뛴다
    tf = s.notes_slide.notes_text_frame
    if tf is not None: tf.text = t

def blocks_slide(s, blocks, title_size=12.5, body_size=10.5, note_size=10):
    """[(번호, 제목, [(줄, 'b'|'n'), ...]), ...] 를 가로선으로 나눠 그린다. 'b' = 본문색, 'n' = 회색 보조"""
    top, bottom = 1.26, H - 0.58
    bh = (bottom - top) / len(blocks)
    for i, (n, t, lines) in enumerate(blocks):
        y = top + i * bh
        if i: hr(s, M, y, W - 2 * M)
        text(s, M, y, 0.4, bh, n, size=13, bold=True, color=TEAL)
        runs = [(t + '\n', {'size': title_size, 'bold': True, 'color': INK})]
        for j, (ln, kind) in enumerate(lines):
            tail = '\n' if j < len(lines) - 1 else ''
            runs.append((ln + tail, {'size': body_size, 'color': INK2} if kind == 'b' else {'size': note_size, 'color': MUTED}))
        text(s, M + 0.42, y, W - 2 * M - 0.5, bh, runs, spacing=1.12)

# ---------- 35 · 써 본 사람의 말 (R163 · 5묶음) ----------
def build_s35(existing=None):
    s = new_slide(35, '08  고민과 한계', S35_TITLE, '현직 간호사 1명이 데모를 직접 써 봤다. 대면, 편의표본, 과제 형식은 아님', existing)
    blocks_slide(s, [
        ('1', '화면은 설명 없이 읽혔다',
         [('"한눈에 인계를 확인할 수 있어서 좋았다" [C]', 'b'),
          ('간호사 화면 = 확인 1명. 수간호사 화면은 여전히 가설', 'n')]),
        ('2', '현장 규칙 세 개가 설계와 맞았다 [C]',
         [('인계는 차지가 쓰고 액팅은 건드리지 않는다 · 작성한 본인만, 넘기기 전까지만 고친다, 수간호사도 예외 없음 → 우리 403·409 그대로', 'b'),
          ('지운 기록이 문제 된 적이 있다. 차지가 "필요 없겠다" 싶어 지운 기록이 나중에 중요했다 → 우리 설계엔 지우는 동작이 없고 지난 인계는 남는다', 'b')]),
        ('3', '설계와 다른 점 하나',
         [('현장은 같은 병동이면 인계 열람에 권한이 없다. 우리는 같은 팀·같은 근무로 좁혔다', 'b'),
          ('넓히는 건 판정 조건 한 줄이고 데이터 구조는 그대로. 보완으로 둔다', 'n')]),
        ('4', '이중 작성은 지금도 있다',
         [('EMR 에 적은 걸 카덱스에 또 적는 건 당연한 일로 여긴다. "카덱스 대신 통합적으로 작용한다면 쓰겠다"', 'b'),
          ('이중 입력 우려는 풀렸다. 대체는 "통합"이 조건인 긍정', 'n')]),
        ('5', '가장 먼저 요청한 것',
         [('인계해 준 사람에게 질문을 보내고, 알림이 가고, 답이 돌아오는 것', 'b'),
          ('데이터 모델에 "③ closed-loop, 범위 밖"으로 적어 둔 그 자리. 다음 순서 1번', 'n')]),
    ], title_size=11.5, body_size=10, note_size=9)
    foot(s, '참여자는 이렇게 말했다. "간호사들은 이렇다"가 아니다')
    notes(s, '과제 형식은 안 했고 자유롭게 써 보게 했다. 정량 기록은 없다. V1 답과 인계 기록 규칙 3개가 여기서 왔다.')
    return s

# ---------- 36 · 그 다음 ----------
def build_s36():
    s = new_slide(36, '08  고민과 한계', '그 다음에 할 수 있는 것', '요청 14건을 우리 데이터 기준으로 나누면')
    cols = [2.0, 4.4, W - 2 * M - 6.4]
    xs = [M, M + cols[0], M + cols[0] + cols[1]]
    hy = 1.26
    for x, w, h in zip(xs, cols, ['묶음', '요청', '왜 이 묶음인가']):
        text(s, x, hy, w - 0.1, 0.3, h, size=10, bold=True, color=INK)
    hr(s, M, hy + 0.32, W - 2 * M, TEAL, 1)
    rows = [
        ('지금 데이터에\n바로 붙는다', TEAL, '질문과 답변 (인계 1건에 스레드로)\n의사 보고 양식 SBAR (인계 항목과 같은 구조, 양식 한 벌 더)', '테이블 한두 개 추가로 끝난다'),
        ('병원 전산(EMR)\n연동이 먼저', AMBER, '처방 누락 잡기 · 처치(주사 등) 알람 · 약 소진일과 연고 유효기간 계산 · 식이 신청 연동', '처방과 투약 데이터가 우리에게 없다'),
        ('장비 연동이 먼저', AMBER, '호출벨 3회 이상이면 응급 알림 · 활력징후 관제', '디바이스가 있어야 한다'),
        ('다른 문제', MUTED, '근무표 자동 생성(처음부터 범위 밖) · 원무과 ADL 입력 · AI 신환 리포트 · 퇴원 설문', '우리가 푼 문제(인계와 결원)와 다른 문제'),
    ]
    ry, rbottom = hy + 0.4, H - 0.58
    rh = (rbottom - ry) / len(rows)
    for i, (g, gc, req, why) in enumerate(rows):
        y = ry + i * rh
        if i: hr(s, M, y, W - 2 * M)
        text(s, xs[0], y, cols[0] - 0.1, rh, g, size=11, bold=True, color=gc)
        text(s, xs[1], y, cols[1] - 0.15, rh, req, size=10.5, color=INK)
        text(s, xs[2], y, cols[2], rh, why, size=10, color=INK2)
    foot(s, '14건 중 지금 모델에 바로 붙는 건 2건. 나머지는 연동이 먼저다. 그래서 이번 범위를 안 넓혔다')
    notes(s, '요청을 기능 목록이 아니라 "우리 데이터로 되는가"로 나눈 것이 정합성의 연장이다. 하나도 구현하지 않았다.')
    return s

def move_last_to(index):
    lst = prs.slides._sldIdLst
    el = list(lst)[-1]; lst.remove(el); lst.insert(index, el)

def has_title(sl, title):
    return any(sh.has_text_frame and sh.text_frame.text.strip() == title for sh in sl.shapes)

IN = 914400
if MODE == 'insert':
    if len(prs.slides) != 36:
        sys.exit('중단: 36장을 기대했는데 %d 장이다. 이미 삽입됐거나 구조가 바뀌었다' % len(prs.slides))
    build_s35(); move_last_to(INSERT_AFTER)
    build_s36(); move_last_to(INSERT_AFTER + 1)
    fixed = 0
    for idx, sl in enumerate(prs.slides, 1):        # 옛 35 → 37 (감사합니다 장은 번호 없음)
        if idx <= INSERT_AFTER + 2: continue
        for sh in sl.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip().isdigit() and sh.left / IN > 8.5 and sh.top / IN > 5.0:
                old = sh.text_frame.text.strip()
                for para in sh.text_frame.paragraphs:
                    for r in para.runs: r.text = ''
                sh.text_frame.paragraphs[0].runs[0].text = str(idx)
                fixed += 1; print('페이지 번호 %s → %d' % (old, idx))
    prs.save(PPTX)
    print('저장 → %s  (%d 장 · 페이지 번호 갱신 %d 곳)' % (PPTX, len(prs.slides), fixed))
else:
    if len(prs.slides) != 38:
        sys.exit('중단: 38장을 기대했는데 %d 장이다' % len(prs.slides))
    if not has_title(prs.slides[INSERT_AFTER], S35_TITLE):
        sys.exit('중단: 35장 제목이 "%s" 가 아니다 — 내가 넣은 장이 아니면 손대지 않는다' % S35_TITLE)
    build_s35(prs.slides[INSERT_AFTER])      # 같은 슬라이드를 비우고 다시 그린다 — 삭제·재삽입은 파트 이름이 겹친다
    prs.save(PPTX)
    print('저장 → %s  (%d 장 · 35장 교체)' % (PPTX, len(prs.slides)))
