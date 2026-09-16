# -*- coding: utf-8 -*-
"""데모가 실제로 돌려준 2xx 본문의 키가 OAS 스키마에 전부 선언돼 있는지 대조한다.

    사용법:  node tools/oas_capture.js > /tmp/b.json && python3 tools/oas_field_check.py /tmp/b.json

25라운드(R137~R144)에서 화면이 쓰는 필드가 OAS 에 없던 것이 8건 더 나왔다.
"화면이 요청에 넣는 식별자는 어느 조회 API 의 응답 필드여야 한다" 는 규칙의 자동 검사다.
`_` 로 시작하는 데모 전용 필드는 무시한다."""
import json, io, os, sys
try:
    import yaml
except ImportError:                                   # 27라운드 코덱스 지적
    sys.exit('PyYAML 이 필요하다:  python3 -m pip install pyyaml\n'
             '(이 스크립트는 OAS 를 파싱한다. 의존성은 이 한 줄뿐이다)')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OAS = os.path.join(ROOT, 'deliverables/10반_황재원_너와나의인계고리-API.yml')
spec = yaml.safe_load(io.open(OAS, encoding='utf-8'))
bodies = json.load(io.open(sys.argv[1], encoding='utf-8'))

def resolve(node):
    if isinstance(node, dict) and '$ref' in node:
        ref = node['$ref'].lstrip('#/').split('/')
        cur = spec
        for k in ref: cur = cur[k]
        return resolve(cur)
    return node

def props(schema):
    """allOf 를 펼쳐 property 이름 집합과 하위 스키마 map 을 만든다"""
    schema = resolve(schema)
    out = {}
    if not isinstance(schema, dict): return out
    for sub in schema.get('allOf', []):
        out.update(props(sub))
    for k, v in (schema.get('properties') or {}).items():
        out[k] = v
    return out

def walk(value, schema, path, missing):
    schema = resolve(schema)
    if not isinstance(schema, dict): return
    if isinstance(value, list):
        item = schema.get('items')
        if item is None: return
        for v in value[:3]:
            walk(v, item, path + '[]', missing)
        return
    if not isinstance(value, dict): return
    p = props(schema)
    if not p: return
    for k, v in value.items():
        if k.startswith('_'): continue          # 데모 전용 디버그 필드
        if k not in p:
            missing.append(path + '.' + k)
            continue
        walk(v, p[k], path + '.' + k, missing)

# operationId → 200/201 응답 스키마
op_schema = {}
for pth, item in spec['paths'].items():
    for method, op in item.items():
        if not isinstance(op, dict) or 'operationId' not in op: continue
        for code in ('200', '201'):
            r = op.get('responses', {}).get(code)
            if r and 'content' in r:
                op_schema[op['operationId']] = r['content']['application/json']['schema']
                break

# 27라운드 코덱스 지적: 잡히지 않은 오퍼레이션이 있으면 조용히 빠지고 "차집합 0" 이 찍혔다.
# 양쪽 집합을 비교해서, **캡처되지 않은 OAS 오퍼레이션도 실패**로 센다.
uncaptured = sorted(set(op_schema) - set(bodies))
extra = sorted(set(bodies) - set(op_schema))

missing_total = []
for opid in sorted(bodies):
    if opid not in op_schema:
        missing_total.append(opid + ' ← OAS 에 2xx 본문 스키마가 없음'); continue
    m = []
    walk(bodies[opid], op_schema[opid], opid, m)
    missing_total += [x for x in dict.fromkeys(m)]

print('대조한 오퍼레이션', len(bodies), '/ OAS', len(op_schema))
fail = False
if uncaptured:
    fail = True
    print('\n응답을 캡처하지 못한 OAS 오퍼레이션', len(uncaptured), '건 — 검사에서 빠졌다:')
    for x in uncaptured: print('  -', x)
    print('  (tools/oas_capture.js 가 이 오퍼레이션을 성공적으로 호출하는지 확인할 것)')
if extra:
    fail = True
    print('\nOAS 에 없는 오퍼레이션을 데모가 갖고 있다', len(extra), '건:')
    for x in extra: print('  -', x)
if missing_total:
    fail = True
    print('\n선언되지 않은 응답 필드', len(missing_total), '건:')
    for x in missing_total: print('  -', x)
if fail:
    sys.exit(1)
print('차집합 0 — OAS 오퍼레이션', len(op_schema), '개를 전부 호출했고, 데모가 돌려주는 모든 필드가 OAS 에 선언돼 있다')
