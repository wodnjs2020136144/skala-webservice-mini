#!/usr/bin/env python3
# source: ~/skala-workspace/_templates/gate.py  (v2.3, 2026-09-15 복사)
"""
협업 워크플로우 게이트 v2.3 — 문서가 약속한 것만 검사하고, 검사하는 것만 약속한다.

★ 이 게이트가 보증하지 않는 것 (리뷰 V21-04):
    근거의 **유형과 최소 형식**은 검증한다. **사실성은 검증하지 않는다.**
    test 명령을 재실행하지 않고, source 인용문이 원문과 일치하는지 확인하지 않는다.
    그건 리뷰어 또는 사람이 확인해야 한다.

위험도·작업 신원의 정본은 CLI 가 아니라 contract.md 다 (리뷰 V22-01).
  - 위험도 플래그: Q1~Q5 또는 없음. Q1·Q2·Q5 중 하나라도 있으면 review.md 필수
  - task_id: contract 와 review 가 일치해야 한다 (이전 작업 리뷰 재사용 차단)

사용:
    python3 gate.py --dir docs/handoff
    python3 gate.py --dir docs/handoff --repo-root .
    python3 gate.py --dir docs/handoff \
        --coverage docs/ocr/coverage.tsv docs/FE_Day1_2026-09 --total-pages 75
    python3 gate.py --dir docs/handoff \
        --coverage docs/ocr/coverage.tsv docs/FE_Day1_2026-09 \
        --source-pdf "docs/pdf/교안.pdf"          # pdfinfo 로 페이지 수를 읽는다

종료 코드:  0 통과 / 1 규약 위반 / 2 치명 미합의 — 사람이 판단해야 한다

review.md 형식:

    ## 차단 지적                      ← 최대 5건. 게이트가 상한을 강제한다
    | ID | 심각도 | 상태 | 근거유형 | 근거 | 지적 |
    |---|---|---|---|---|---|
    | V1 | 치명 | accepted | path | AGENT_WORKFLOW.md:§2 | ... |
    (차단 지적마다 `### V1 / …` 본문에 실패 시나리오·최소 검증법이 있어야 한다)
    | V2 | 중요 | rejected | test | tests/test_x.py::test_y 통과 | ... |
    | V3 | 중요 | unresolved | options | A안 2일 / B안 5일. 어느 쪽을 택할까? | ... |

    ## 비차단 정정                    ← 상한 없음. 상태만 요구한다
    | ID | 상태 | 근거 | 내용 |

coverage.tsv 형식 (워크로드 A):
    page<TAB>disposition<TAB>output<TAB>anchor<TAB>reason
    14      included        01_study-guide.md   §2-3
    1       omitted         -       -       표지
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

CONTRACT_FIELDS = ["task_id", "위험도 플래그", "목표", "완료 조건",
                   "고위험 가정", "변경 가능 범위", "검증 방법"]
VALID_FLAGS = {"Q1", "Q2", "Q3", "Q4", "Q5", "없음"}
REVIEW_REQUIRED_FLAGS = {"Q1", "Q2", "Q5"}   # 하드 트리거 (AGENT_WORKFLOW §0)
VALID_STATUS = {"accepted", "rejected", "unresolved"}
VALID_SEVERITY = {"치명", "중요", "사소"}
MAX_BLOCKING = 5

# 상태별로 허용되는 근거 유형
EVIDENCE_KINDS = {
    "accepted": {"path"},
    "rejected": {"test", "source", "user-decision"},
    "unresolved": {"options"},
}
ALL_KINDS = {"path", "test", "source", "user-decision", "options"}

# `- **목표**:` · `- 목표 :` · `` * `목표`: `` 등 어떤 마크업이든 허용
FIELD_RE = r"^\s*[-*+]?\s*(?:\*\*|__|`)?\s*{f}\s*(?:\*\*|__|`)?\s*[:：](.*)$"
# 경로처럼 보이는가 — 파일·앵커·줄번호 중 하나를 가리켜야 한다
PATHISH = re.compile(r"(/|\.md\b|\.py\b|\.ts\b|\.tsx\b|\.java\b|§|#|:\d+)")

errors: list[str] = []
warnings: list[str] = []
blocking: list[str] = []


def err(m: str) -> None:
    errors.append(m)


def warn(m: str) -> None:
    warnings.append(m)


# ---------------------------------------------------------------- contract

def check_contract(path: Path) -> dict:
    meta: dict = {"task_id": None, "flags": set()}
    if not path.exists():
        err(f"{path} 없음 — 작업 계약 없이 진행할 수 없다")
        return meta
    text = path.read_text(encoding="utf-8")
    if len(text.strip()) < 50:
        err(f"{path} 가 사실상 비어 있다 ({len(text.strip())}자)")
        return meta

    m = re.search(FIELD_RE.format(f="task_id"), text, re.M)
    if m and m.group(1).strip():
        meta["task_id"] = m.group(1).strip()
    m = re.search(FIELD_RE.format(f=re.escape("위험도 플래그")), text, re.M)
    if m:
        raw = [t.strip().upper() for t in re.split(r"[,/·\s]+", m.group(1)) if t.strip()]
        bad = [t for t in raw if t not in VALID_FLAGS]
        if bad:
            err(f"{path}: 알 수 없는 위험도 플래그 → {', '.join(bad)} (Q1~Q5 또는 없음)")
        if len(raw) != len(set(raw)):
            err(f"{path}: 위험도 플래그가 중복됐다 → {', '.join(raw)}")
        meta["flags"] = {t for t in raw if t in VALID_FLAGS and t != "없음"}

    for field in CONTRACT_FIELDS:
        m = re.search(FIELD_RE.format(f=re.escape(field)), text, re.M)
        if not m:
            err(f"{path}: 필수 항목 '{field}' 없음")
        elif not m.group(1).strip():
            err(f"{path}: '{field}' 가 비어 있다")

    m = re.search(FIELD_RE.format(f="완료 조건") + r"(?P<rest>.*?)(?=^\s*[-*]|\Z)",
                  text, re.M | re.S)
    if m:
        body = m.group(1) + (m.groupdict().get("rest") or "")
        if not re.search(r"(test|테스트|스크립트|exit|검사|커버리지|\d)", body, re.I):
            warn(f"{path}: '완료 조건'에 기계 판정 가능한 표현이 안 보인다")
    return meta


# ---------------------------------------------------------------- review

ROW = re.compile(r"^\s*\|(?P<cells>.+)\|\s*$")
H2 = re.compile(r"^##\s+(.*)$")


def split_sections(text: str) -> dict[str, list[str]]:
    """h2 제목 → 그 섹션의 줄 목록"""
    out: dict[str, list[str]] = {}
    cur = "__preamble__"
    out[cur] = []
    for line in text.splitlines():
        m = H2.match(line)
        if m:
            cur = m.group(1).strip()
            out.setdefault(cur, [])
        else:
            out[cur].append(line)
    return out


def _subsections(text: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    cur, buf = None, []
    for line in text.splitlines():
        m = re.match(r"^#{2,4}\s+(.*)$", line)
        if m:
            if cur is not None:
                out[cur] = buf
            cur, buf = m.group(1).strip(), []
        elif cur is not None:
            buf.append(line)
    if cur is not None:
        out[cur] = buf
    return out


def parse_table(lines: list[str]) -> tuple[dict[str, int] | None, list[list[str]]]:
    idx: dict[str, int] | None = None
    rows: list[list[str]] = []
    alias = {
        "id": ("id",), "sev": ("심각도", "severity"), "status": ("상태", "status"),
        "kind": ("근거유형", "kind"), "evidence": ("근거", "evidence"),
    }
    for line in lines:
        m = ROW.match(line)
        if not m:
            continue
        cells = [c.strip() for c in m.group("cells").split("|")]
        if idx is None:
            low = [c.lower() for c in cells]
            found: dict[str, int] = {}
            for key, names in alias.items():
                for n in names:
                    if n in cells:
                        found[key] = cells.index(n); break
                    if n in low:
                        found[key] = low.index(n); break
            if "id" in found and "status" in found:
                idx = found
            continue
        if set("".join(cells)) <= set("-: "):
            continue
        rows.append(cells)
    return idx, rows


def check_rows(path: Path, label: str, idx: dict[str, int], rows: list[list[str]],
               strict: bool, repo_root: Path = Path(".")) -> None:
    seen: set[str] = set()
    for c in rows:
        def cell(k: str) -> str:
            i = idx.get(k)
            return c[i] if i is not None and i < len(c) else ""

        rid = cell("id") or "(ID없음)"
        if rid in seen:
            err(f"{path} [{label}]: 중복 ID {rid}")
        seen.add(rid)

        sev = cell("sev")
        if strict:
            if sev not in VALID_SEVERITY:
                err(f"{path} [{label}]: {rid} 심각도가 치명/중요/사소가 아니다 → '{sev}'")

        status = cell("status").lower()
        if status not in VALID_STATUS:
            err(f"{path} [{label}]: {rid} 상태가 "
                f"accepted/rejected/unresolved 가 아니다 → '{status}'")
            continue

        ev = cell("evidence")
        if not strict:
            if len(ev) < 4 and status != "unresolved":
                err(f"{path} [{label}]: {rid} 근거가 비어 있다")
            continue

        kind = cell("kind").lower()
        if idx.get("kind") is None:
            err(f"{path} [{label}]: '근거유형' 열이 없다 "
                f"(path/test/source/user-decision/options)")
            continue
        if kind not in ALL_KINDS:
            err(f"{path} [{label}]: {rid} 근거유형이 "
                f"{'/'.join(sorted(ALL_KINDS))} 중 하나가 아니다 → '{kind}'")
            continue
        allowed = EVIDENCE_KINDS[status]
        if kind not in allowed:
            err(f"{path} [{label}]: {rid} 가 '{status}' 인데 근거유형이 '{kind}' 다. "
                f"허용: {'/'.join(sorted(allowed))}")
            continue

        if kind == "path":
            if not PATHISH.search(ev):
                err(f"{path} [{label}]: {rid} 근거가 변경 위치를 가리키지 않는다 "
                    f"(파일·§절·줄번호 필요) → '{ev[:40]}'")
            else:
                fp = ev.split(":")[0].split("§")[0].split("#")[0].strip()
                if re.search(r"\.\w{1,5}$", fp) and not (repo_root / fp).exists():
                    err(f"{path} [{label}]: {rid} 근거가 가리키는 파일이 없다 → '{fp}'")
        if kind == "source":
            if not re.search(r"(p\.\s*\d|§|:\d|#|쪽|페이지|line\s*\d)", ev, re.I):
                err(f"{path} [{label}]: {rid} source 근거에 locator 가 없다 "
                    f"(p.N·§절·줄번호 필요) → '{ev[:40]}'")
            elif len(ev.strip()) < 8:
                err(f"{path} [{label}]: {rid} source 근거에 무엇의 locator 인지가 없다 "
                    f"(원문·파일·URL + locator) → '{ev}'")
        if kind == "test":
            has_cmd = re.search(r"(::|\.py|\.ts|npm |pytest|python|make |cargo |go test|/)", ev)
            has_res = re.search(r"(통과|pass|exit\s*\d|fail|로그|log|\d{4}-\d{2}-\d{2})", ev, re.I)
            if not (has_cmd and has_res):
                err(f"{path} [{label}]: {rid} test 근거에 실행 명령과 결과가 모두 필요하다 "
                    f"(예: `tests/t.py::k 통과`) → '{ev[:40]}'")
        if kind == "user-decision":
            if not re.search(r"(§|:\d|#|\d{4}-\d{2}-\d{2}|대화|결정)", ev):
                err(f"{path} [{label}]: {rid} user-decision 에 결정 기록 위치가 없다 → '{ev[:40]}'")
        if kind == "options":
            if "?" not in ev and "？" not in ev:
                err(f"{path} [{label}]: {rid} unresolved 에 "
                    f"사람이 답할 질문(?)이 없다")
            if not re.search(r"(vs|/|·|안|선택지|option)", ev, re.I):
                err(f"{path} [{label}]: {rid} unresolved 에 선택지가 없다")

        if status == "unresolved" and sev == "치명":
            blocking.append(f"{rid}: 치명 미합의 — {ev[:80]}")


def check_review(path: Path, max_rounds: int, repo_root: Path = Path("."),
                 task_id: str | None = None) -> None:
    if not path.exists():
        err(f"{path} 없음 — 리뷰 없이 게이트를 통과할 수 없다")
        return
    text = path.read_text(encoding="utf-8")
    if len(text.strip()) < 30:
        err(f"{path} 가 사실상 비어 있다")
        return

    # ★ 작업 신원 일치 (V22-02) — 이전 작업의 review 재사용 차단
    m = re.search(FIELD_RE.format(f="task_id"), text, re.M)
    rid_task = m.group(1).strip() if m and m.group(1).strip() else None
    if rid_task is None:
        err(f"{path}: task_id 가 없다. contract 와 같은 작업인지 확인할 수 없다")
    elif task_id and rid_task != task_id:
        err(f"{path}: task_id 불일치 — contract '{task_id}' vs review '{rid_task}'. "
            f"이전 작업의 리뷰를 재사용하고 있다")

    sections = split_sections(text)
    blocking_key = next((k for k in sections if "차단 지적" in k and "비차단" not in k), None)
    minor_key = next((k for k in sections if "비차단" in k), None)

    if blocking_key is None:
        err(f"{path}: '## 차단 지적' 섹션이 없다. "
            f"차단 지적과 비차단 정정을 나눠야 상한을 강제할 수 있다")
        return

    idx, rows = parse_table(sections[blocking_key])
    if idx is None:
        err(f"{path}: 차단 지적 표의 헤더를 찾지 못했다 "
            f"(ID / 심각도 / 상태 / 근거유형 / 근거 / 지적)")
        return
    if not rows:
        warn(f"{path}: 차단 지적 0건. 정말 없었는지 확인하라")
    if len(rows) > MAX_BLOCKING:
        err(f"{path}: 차단 지적 {len(rows)}건 — 상한 {MAX_BLOCKING}건 초과. "
            f"나머지는 '## 비차단 정정' 으로 옮겨라")
    check_rows(path, "차단", idx, rows, strict=True, repo_root=repo_root)

    # ★ 지적마다 본문 섹션 (V22-03) — 실패 시나리오·최소 검증법이 있어야 리뷰다
    id_col = idx.get("id")
    heads = re.findall(r"^#{2,4}\s+(.*)$", text, re.M)
    for c in rows:
        rid = (c[id_col].strip() if id_col is not None and id_col < len(c) else "")
        if not rid:
            continue
        hit = [h for h in heads if rid in h]
        if not hit:
            err(f"{path}: {rid} 의 본문 섹션이 없다 "
                f"(`### {rid} / …` 제목에 실패 시나리오·최소 검증법을 쓴다)")
            continue
        body = "\n".join(sections.get(hit[0], [])) if hit[0] in sections else ""
        if not body:
            for h, lines in _subsections(text).items():
                if rid in h:
                    body = "\n".join(lines); break
        for label in ("실패 시나리오", "최소 검증법"):
            mm = re.search(
                rf"\*?\*?{label}\*?\*?[ \t]*[:：]?[ \t]*(.*?)(?=\n[ \t]*\*\*|\n#{{2,4}}[ \t]|\Z)",
                body, re.S)
            if not mm or len(re.sub(r"[\s*_`>-]", "", mm.group(1))[:1]) == 0:
                err(f"{path}: {rid} 본문에 '{label}' 내용이 없다")

    if minor_key is not None:
        m_idx, m_rows = parse_table(sections[minor_key])
        if m_idx is not None:
            check_rows(path, "비차단", m_idx, m_rows, strict=False, repo_root=repo_root)

    rounds = len(re.findall(r"^#{1,3}\s*(?:round|라운드)\s*\d+", text, re.I | re.M))
    if rounds > max_rounds:
        err(f"{path}: 리뷰 라운드 {rounds}회 — 상한 {max_rounds}회 초과")


# ------------------------------------------------- 워크로드 A: 커버리지

# `교안 p.12` · `교안 p.12–15` · `(교안 p.12-15, OCR)`
PAGE_REF = re.compile(r"교안\s*p\.(\d+)(?:\s*[–\-~]\s*(\d+))?")


def cited_pages(body: str) -> set[int]:
    out: set[int] = set()
    for m in PAGE_REF.finditer(body):
        a = int(m.group(1))
        b = int(m.group(2)) if m.group(2) else a
        if b >= a and b - a < 200:
            out |= set(range(a, b + 1))
        else:
            out.add(a)
    return out


def lint_docs(md: list[Path], required_h2: list[str]) -> None:
    for f in md:
        body = f.read_text(encoding="utf-8")
        if body.count("```") % 2:
            err(f"{f}: 코드블록이 닫히지 않았다 (``` 개수 홀수)")
        for mark in ("TODO", "TBD", "작성 중", "...(생략"):
            if mark in body:
                warn(f"{f}: 미완성 표식 '{mark}' 발견")
        h2 = re.findall(r"^##\s+(.*)$", body, re.M)
        if h2 and "미확정" not in h2[-1]:
            err(f"{f}: 마지막 h2 가 '미확정 사항 / 확인 필요' 가 아니다 → '{h2[-1]}'")
        for need in required_h2:
            if not any(need in h for h in h2):
                err(f"{f}: 필수 목차 '{need}' 없음")
        # 상대 링크 대상 존재 확인
        for m in re.finditer(r"\[[^\]]*\]\((?!https?:|#|mailto:)([^)#]+)", body):
            target = (f.parent / m.group(1).strip()).resolve()
            if not target.exists():
                err(f"{f}: 깨진 상대 링크 → {m.group(1).strip()}")


def sections_of(body: str) -> list[tuple[str, str]]:
    """(제목, 본문) 목록. 제목은 # 개수를 뗀 것."""
    out: list[tuple[str, str]] = []
    cur_title, buf = None, []
    for line in body.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            if cur_title is not None:
                out.append((cur_title, "\n".join(buf)))
            cur_title, buf = m.group(2).strip(), []
        else:
            buf.append(line)
    if cur_title is not None:
        out.append((cur_title, "\n".join(buf)))
    return out


def _lead_token(x: str) -> str:
    """'2-3. 개념' → '2-3' · '§2' → '2' · '개요' → '개요'"""
    x = x.strip().lstrip("§").strip()
    m = re.match(r"^([0-9]+(?:[-.][0-9]+)*)\s*[.)]?\s", x + " ")
    return m.group(1).rstrip(".") if m else x


def anchor_matches(anchor: str, title: str) -> bool:
    a, t = anchor.strip().lstrip("§").strip(), title.strip().lstrip("§").strip()
    if not a:
        return False
    if a == t:
        return True
    la, lt = _lead_token(a), _lead_token(t)
    # 숫자 절 식별자는 선두 토큰이 정확히 같아야 한다 (§2 ↔ 12. 제목 금지)
    if re.match(r"^[0-9]", la):
        return la == lt
    return t.startswith(a)


def check_coverage(cov: Path, docs_dir: Path, total_pages: int,
                   required_h2: list[str]) -> None:
    md = sorted(docs_dir.glob("*.md")) if docs_dir.is_dir() else []
    if not md:
        err(f"{docs_dir}: 검사할 .md 가 없다")
        return
    lint_docs(md, required_h2)

    if not cov.exists():
        err(f"{cov} 없음 — disposition 근거표 없이는 내용 커버리지를 잴 수 없다")
        return

    rows: list[dict] = []
    with cov.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh, delimiter="\t"):
            rows.append({(k or "").strip(): (v or "").strip() for k, v in r.items()})
    if not rows or not {"page", "disposition"} <= set(rows[0]):
        err(f"{cov}: 헤더에 page·disposition 열이 필요하다")
        return

    bodies = {f.name: f.read_text(encoding="utf-8") for f in md}
    secs = {n: sections_of(b) for n, b in bodies.items()}

    pages: set[int] = set()
    per_doc: dict[str, set[int]] = {}
    for r in rows:
        try:
            p = int(r["page"])
        except ValueError:
            err(f"{cov}: page 가 정수가 아니다 → '{r['page']}'"); continue
        if p < 1 or p > total_pages:
            err(f"{cov}: page {p} 가 원본 범위(1~{total_pages}) 밖이다"); continue
        if p in pages:
            err(f"{cov}: page {p} 중복")
        pages.add(p)

        d = r["disposition"].lower()
        if d == "omitted":
            if len(r.get("reason", "")) < 2:
                err(f"{cov}: p.{p} omitted 인데 사유가 없다")
            continue
        if d != "included":
            err(f"{cov}: p.{p} disposition 이 included/omitted 가 아니다 → '{d}'")
            continue

        out, anc = r.get("output", ""), r.get("anchor", "")
        if not out or out == "-":
            err(f"{cov}: p.{p} included 인데 output 이 없다"); continue
        if not anc or anc == "-":
            err(f"{cov}: p.{p} included 인데 anchor(절) 가 없다"); continue
        if out not in bodies:
            err(f"{cov}: p.{p} 의 output '{out}' 파일이 없다"); continue
        per_doc.setdefault(out, set()).add(p)

        # ★ anchor 가 그 파일에 실제 제목으로 존재하는가 (V21-02)
        hit = [(t, b) for t, b in secs[out] if anchor_matches(anc, t)]
        if not hit:
            err(f"{cov}: p.{p} anchor '{anc}' 가 {out} 에 없다"); continue
        # ★ 그 절 안에 그 페이지 인용이 있는가 (V21-02)
        if not any(p in cited_pages(b) for _, b in hit):
            err(f"{cov}: p.{p} 가 {out} 의 '{anc}' 절에서 인용되지 않았다")

    # ★ 원본 전체 페이지 대비 완결성 (V21-01)
    expected = set(range(1, total_pages + 1))
    missing = sorted(expected - pages)
    if missing:
        err(f"{cov}: 원본 {total_pages}쪽 중 {len(missing)}쪽이 처분되지 않았다 → "
            + ", ".join(f"p.{p}" for p in missing[:12])
            + (" …" if len(missing) > 12 else ""))

    cited: set[int] = set()
    for b in bodies.values():
        cited |= cited_pages(b)
    ghost = sorted(cited - pages)
    if ghost:
        err("근거표에 없는 페이지를 인용했다: "
            + ", ".join(f"p.{p}" for p in ghost[:10])
            + (" …" if len(ghost) > 10 else ""))

    print(f"  처분 {len(pages)}/{total_pages}쪽 — 산출물별 included:")
    for out in sorted(per_doc):
        print(f"    {out}: {len(per_doc[out])}쪽")


def main() -> int:
    ap = argparse.ArgumentParser(description="협업 워크플로우 게이트 v2.3")
    ap.add_argument("--dir", default="docs/handoff")
    ap.add_argument("--max-rounds", type=int, default=2)
    ap.add_argument("--repo-root", default=".", help="path 근거의 기준 디렉터리")
    ap.add_argument("--coverage", nargs=2, metavar=("COVERAGE_TSV", "DOCS_DIR"))
    ap.add_argument("--total-pages", type=int,
                    help="원본 총 페이지 수 (--coverage 사용 시 필수)")
    ap.add_argument("--source-pdf", help="원본 PDF — pdfinfo 로 페이지 수를 읽는다")
    ap.add_argument("--required-h2", nargs="*", default=["미확정 사항"])
    a = ap.parse_args()

    errors.clear(); warnings.clear(); blocking.clear()
    d, root = Path(a.dir), Path(a.repo_root)
    print("게이트 v2.3")
    print("  ※ 근거는 유형·형식만 검증한다. 사실성은 사람이 확인한다.")

    # ★ 정본은 contract 다 (V22-01) — CLI 숫자로 하드 트리거를 우회할 수 없다
    meta = check_contract(d / "contract.md")
    flags = meta["flags"]
    score = len(flags)
    hard = sorted(flags & REVIEW_REQUIRED_FLAGS)
    rv = d / "review.md"
    print(f"  위험도 플래그 {sorted(flags) or ['없음']} → score={score}"
          + (f", 하드 트리거 {hard} → review.md 필수" if hard else ""))

    if score == 0 and not errors:
        print("\n  위험도 0점 — 루프를 돌리지 않는다 (AGENT_WORKFLOW §2)")
        return 0

    if hard or score >= 2:
        why = f"하드 트리거 {hard}" if hard else f"score={score}"
        if not rv.exists():
            err(f"{rv} 없음 — {why} 이므로 독립 비평이 필수다")
        else:
            check_review(rv, a.max_rounds, repo_root=root, task_id=meta["task_id"])
    elif rv.exists():
        check_review(rv, a.max_rounds, repo_root=root, task_id=meta["task_id"])
    else:
        print(f"  score={score}, 하드 트리거 없음 — review.md 생략 가능 경로")

    if a.coverage:
        total = a.total_pages
        if total is None and a.source_pdf:
            total = pdf_page_count(Path(a.source_pdf))
        if total is None:
            err("--coverage 를 쓰려면 --total-pages 또는 --source-pdf(pdfinfo) 가 필요하다. "
                "원본 대비 누락을 확인할 수 없으면 '처분 완결'을 주장할 수 없다")
        else:
            check_coverage(Path(a.coverage[0]), Path(a.coverage[1]),
                           total, a.required_h2)

    for w in warnings:
        print(f"  [warn] {w}")
    for e in errors:
        print(f"  [FAIL] {e}")

    if blocking:
        print("\n  ★ 치명 미합의 — 사람이 판단해야 한다:")
        for b in blocking:
            print(f"    - {b}")
        return 2
    if errors:
        print(f"\n  실패 {len(errors)}건.")
        return 1
    print(f"\n  통과 (경고 {len(warnings)}건)")
    return 0


def pdf_page_count(pdf: Path) -> int | None:
    if not pdf.exists():
        err(f"{pdf} 없음"); return None
    try:
        import subprocess
        out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True)
        m = re.search(r"^Pages:\s+(\d+)", out.stdout, re.M)
        if m:
            return int(m.group(1))
    except FileNotFoundError:
        pass
    # 원시 정규식 카운트는 PDF 구조에 따라 틀릴 수 있으므로 신뢰하지 않는다 (리뷰 비차단 4)
    err(f"{pdf}: pdfinfo 로 페이지 수를 읽지 못했다. --total-pages 로 직접 지정하라")
    return None


if __name__ == "__main__":
    sys.exit(main())
