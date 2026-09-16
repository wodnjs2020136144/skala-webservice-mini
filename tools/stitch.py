# -*- coding: utf-8 -*-
"""Aside 스크린샷 슬라이스 2장을 이어 붙여 assets/<id>.png 로 저장한다.

    python3 tools/stitch.py <아티팩트_디렉터리> <메타_JSONL>

25·26라운드에서 배운 두 가지를 코드로 굳힌다:
  1) 스크린샷에는 창 테두리(오른쪽·아래 짙은 띠)가 같이 찍힌다 → 콘텐츠 영역만 크롭한다
  2) 뷰포트 높이를 가정하지 않는다 → 브라우저가 실측한 scrollY 로 이어 붙인다
"""
import io, json, os, sys
from PIL import Image

art, metaf = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANCH = os.path.join(ROOT, 'assets', 'anchors.json')

anchors = {}
if os.path.exists(ANCH):
    anchors = json.load(io.open(ANCH, encoding='utf-8'))

done = []
for line in io.open(metaf, encoding='utf-8'):
    line = line.strip()
    if not line.startswith('__SHOT__'):
        continue
    m = json.loads(line[len('__SHOT__'):])
    sid, sy = m['id'], float(m['scrollY'])
    a = Image.open(os.path.join(art, sid + '__0.png')).convert('RGB')
    b = Image.open(os.path.join(art, sid + '__1.png')).convert('RGB')
    # 창 테두리·스크롤바를 픽셀 탐색으로 찾지 않는다 — DPR 로 정확히 계산한다.
    # (탐색은 밝은 색 스크롤바를 놓쳐서 30px 띠가 섞였다)
    scale = float(m.get('dpr') or 2)
    cw = int(round(m['shotW'] * scale))           # 콘텐츠 폭 (스크롤바 제외)
    visible = float(m['viewH'])                   # 한 화면에 보이는 CSS 높이
    ch = int(round(visible * scale))
    a = a.crop((0, 0, cw, ch)); b = b.crop((0, 0, cw, ch))
    if sy <= 0.5:                                 # 스크롤이 없으면 한 장으로 끝
        out = a.crop((0, 0, cw, int(round(m['pageH'] * scale))))
    else:
        cut = int(round((visible - sy) * scale))  # b 안에서 page y = visible 인 지점
        tail = b.crop((0, cut, cw, ch))
        out = Image.new('RGB', (cw, ch + tail.height), 'white')
        out.paste(a, (0, 0)); out.paste(tail, (0, ch))
    out.save(os.path.join(ROOT, 'assets', sid + '.png'))
    anchors[sid] = {
        'shotW': m['shotW'], 'pageH': m['pageH'],
        'imgW': out.width, 'imgH': out.height,
        'marks': m['marks']
    }
    miss = [x['label'] for x in m['marks'] if 'missing' in x]
    done.append((sid, out.size, len(m['marks']), miss))

json.dump(anchors, io.open(ANCH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for sid, size, n, miss in done:
    tag = ('   ⚠️ 못 찾은 앵커: ' + ', '.join(miss)) if miss else ''
    print('%-30s %s  앵커 %d%s' % (sid, size, n, tag))
print('anchors.json 갱신 — 화면 %d개' % len(anchors))
