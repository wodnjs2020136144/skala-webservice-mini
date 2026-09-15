#!/usr/bin/env python3
"""
gate.py 회귀 테스트 — 리뷰 V2-02 (5) 요구사항.
게이트가 "통과시켜야 할 것을 통과시키고, 막아야 할 것을 막는가"를 자동 검증한다.

실행:  python3 test_gate.py          (pytest 불필요)
종료:  0 전부 통과 / 1 실패 있음
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

GATE = Path(__file__).with_name("gate.py")

GOOD_CONTRACT = """# Task contract
- task_id: T-001
- **위험도 플래그**: Q1
- **목표**: 게이트가 규약을 실제로 강제하는지 검증한다
- **완료 조건**: 12개 fixture 의 exit code 가 기대값과 일치한다
- **고위험 가정**: review.md 표 형식을 사람이 지킬 것이다
- **변경 가능 범위**: _templates/ 아래만
- **검증 방법**: python3 test_gate.py 가 exit 0
"""

HDR = ("## 차단 지적\n\n"
       "| ID | 심각도 | 상태 | 근거유형 | 근거 | 지적 |\n"
       "|---|---|---|---|---|---|\n")


def body_for(*ids: str) -> str:
    return "".join(
        f"\n### {i} / 치명 / 제목\n\n**실패 시나리오**: X 하면 Y 가 깨진다\n\n"
        f"**최소 검증법**: fixture 로 exit 1 을 확인한다\n" for i in ids)


def ids_in(*rs: str) -> list[str]:
    out = []
    for r in rs:
        c = [x.strip() for x in r.strip().strip("|").split("|")]
        if c and c[0]:
            out.append(c[0])
    return out


def rows(*rs: str) -> str:
    return "- task_id: T-001\n\n" + HDR + "".join(rs) + body_for(*ids_in(*rs))


OK_ROW = "| V1 | 치명 | accepted | path | src/app.py:§2 | 모순 |\n"

CASES: list[tuple[str, str, str | None, int]] = [
    # (이름, contract, review, 기대 exit)
    ("정상 1건", GOOD_CONTRACT, rows(OK_ROW), 0),

    ("정상 5건(상한 경계)", GOOD_CONTRACT, rows(*[
        f"| V{i} | 중요 | accepted | path | src/app.py:§{i} | x |\n" for i in range(1, 6)
    ]), 0),

    ("★ 6건 — 상한 초과", GOOD_CONTRACT, rows(*[
        f"| V{i} | 중요 | accepted | path | src/app.py:§{i} | x |\n" for i in range(1, 7)
    ]), 1),

    ("★ 가짜 근거(경로 아님)", GOOD_CONTRACT,
     rows("| V1 | 치명 | accepted | path | ㅇㅇㅇㅇ | 아무말 |\n"), 1),

    ("★ accepted 인데 근거유형 test", GOOD_CONTRACT,
     rows("| V1 | 치명 | accepted | test | tests/t.py::k 통과 | x |\n"), 1),

    ("rejected + test 근거", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | test | tests/test_x.py::test_y 통과 | x |\n"), 0),

    ("★ rejected 인데 근거가 너무 짧음", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | source | p.3 | x |\n"), 1),

    ("unresolved + 선택지·질문", GOOD_CONTRACT,
     rows("| V1 | 중요 | unresolved | options | A안 2일 / B안 5일. 어느 쪽? | x |\n"), 0),

    ("★ unresolved 인데 질문 없음", GOOD_CONTRACT,
     rows("| V1 | 중요 | unresolved | options | A안 2일 / B안 5일 소요 | x |\n"), 1),

    ("★ 치명 unresolved → exit 2", GOOD_CONTRACT,
     rows("| V1 | 치명 | unresolved | options | A안 2일 / B안 5일. 어느 쪽? | x |\n"), 2),

    ("★ 중복 ID", GOOD_CONTRACT,
     rows("| V1 | 중요 | accepted | path | src/app.py:§1 | x |\n",
          "| V1 | 중요 | accepted | path | src/app.py:§2 | y |\n"), 1),

    ("★ 잘못된 상태값", GOOD_CONTRACT,
     rows("| V1 | 중요 | 반영함 | path | src/app.py:§1 | x |\n"), 1),

    ("★ 잘못된 심각도", GOOD_CONTRACT,
     rows("| V1 | 보통 | accepted | path | src/app.py:§1 | x |\n"), 1),

    ("★ 근거유형 열 자체가 없음", GOOD_CONTRACT,
     "## 차단 지적\n\n| ID | 심각도 | 상태 | 근거 | 지적 |\n|---|---|---|---|---|\n"
     "| V1 | 중요 | accepted | src/app.py:§1 | x |\n", 1),

    ("★ '차단 지적' 섹션 없음", GOOD_CONTRACT,
     "| ID | 심각도 | 상태 | 근거유형 | 근거 | 지적 |\n|---|---|---|---|---|---|\n"
     "| V1 | 중요 | accepted | path | src/app.py:§1 | x |\n", 1),

    ("★ 3라운드(상한 2)", GOOD_CONTRACT,
     "## Round 1\n## Round 2\n## Round 3\n" + rows(OK_ROW), 1),

    ("★ contract 필드 누락", GOOD_CONTRACT.replace("- **검증 방법**: python3 test_gate.py 가 exit 0\n", ""),
     rows(OK_ROW), 1),

    ("★ contract 필드 비어 있음", GOOD_CONTRACT.replace(
        "- **고위험 가정**: review.md 표 형식을 사람이 지킬 것이다", "- **고위험 가정**:"),
     rows(OK_ROW), 1),

    ("★ path 근거가 없는 파일을 가리킴", GOOD_CONTRACT,
     rows("| V1 | 치명 | accepted | path | does-not-exist.md:§9 | x |\n"), 1),

    ("★ test 근거에 결과가 없음", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | test | abcdefgh | x |\n"), 1),

    ("★ source 근거에 locator 없음", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | source | 교안을 확인했다 | x |\n"), 1),

    ("★ user-decision 에 기록 위치 없음", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | user-decision | 사용자가 그러라고 함 | x |\n"), 1),

    ("user-decision + 날짜", GOOD_CONTRACT,
     rows("| V1 | 중요 | rejected | user-decision | 2026-09-14 대화에서 결정 | x |\n"), 0),

    ("★ V22-01 Q1인데 review 없음 → 하드 트리거", GOOD_CONTRACT, None, 1),

    ("Q3만 — review 없어도 통과",
     GOOD_CONTRACT.replace("위험도 플래그**: Q1", "위험도 플래그**: Q3"), None, 0),

    ("★ 위험도 플래그 없음 → 게이트 미실행",
     GOOD_CONTRACT.replace("위험도 플래그**: Q1", "위험도 플래그**: 없음"), None, 0),

    ("★ 알 수 없는 플래그",
     GOOD_CONTRACT.replace("위험도 플래그**: Q1", "위험도 플래그**: Q9"), rows(OK_ROW), 1),

    ("★ 중복 플래그",
     GOOD_CONTRACT.replace("위험도 플래그**: Q1", "위험도 플래그**: Q1, Q1"), rows(OK_ROW), 1),

    ("★ V22-02 task_id 불일치 (이전 리뷰 재사용)", GOOD_CONTRACT,
     rows(OK_ROW).replace("- task_id: T-001", "- task_id: T-999"), 1),

    ("★ V22-02 review 에 task_id 없음", GOOD_CONTRACT,
     rows(OK_ROW).replace("- task_id: T-001\n\n", ""), 1),

    ("★ V22-03 지적 본문 섹션 없음", GOOD_CONTRACT,
     "- task_id: T-001\n\n" + HDR + OK_ROW, 1),

    ("★ V22-03 실패 시나리오가 빔", GOOD_CONTRACT,
     "- task_id: T-001\n\n" + HDR + OK_ROW
     + "\n### V1 / 치명 / 제목\n\n**실패 시나리오**:\n\n**최소 검증법**: 확인한다\n", 1),

    ("★ contract 에 task_id 없음",
     GOOD_CONTRACT.replace("- task_id: T-001\n", ""), rows(OK_ROW), 1),

    ("비차단 정정은 상한 없음", GOOD_CONTRACT,
     rows(OK_ROW) + "\n## 비차단 정정\n\n| ID | 상태 | 근거 | 내용 |\n|---|---|---|---|\n"
     + "".join(f"| M{i} | accepted | 수정함 {i} | 사소 |\n" for i in range(1, 9)), 0),
]

# ---------------------------------------------------- 워크로드 A 커버리지

COV_OK = ("page\tdisposition\toutput\tanchor\treason\n"
          "1\tomitted\t-\t-\t표지\n"
          "2\tomitted\t-\t-\t목차\n"
          "3\tincluded\t01_study-guide.md\t§2-3\t\n")
DOC_OK = ("# g\n\n## 2-3. 개념 (교안 p.3)\n본문 (교안 p.3).\n\n"
          "## 미확정 사항 / 확인 필요\n- 없음\n")
TOTAL = "3"

COV_CASES: list[tuple[str, str, str | None, int]] = [
    ("커버리지 정상 (3쪽 전수 처분)", COV_OK, DOC_OK, 0),

    ("★ 원본 3쪽 중 2쪽만 처분 — 누락 발견",
     "page\tdisposition\toutput\tanchor\treason\n1\tomitted\t-\t-\t표지\n"
     "3\tincluded\t01_study-guide.md\t§2-3\t\n", DOC_OK, 1),

    ("★ 원본 범위 밖 페이지(0)",
     "page\tdisposition\toutput\tanchor\treason\n0\tomitted\t-\t-\tx\n"
     + COV_OK.split("\n", 1)[1], DOC_OK, 1),

    ("★ 원본 범위 초과 페이지(99)",
     COV_OK + "99\tomitted\t-\t-\tx\n", DOC_OK, 1),

    ("★ V22-04 §2 가 '12. 다른 절' 에 매칭되면 안 된다",
     COV_OK.replace("§2-3", "§2"),
     "# g\n\n## 12. 다른 절\n(교안 p.3)\n\n## 미확정 사항 / 확인 필요\n- 없음\n", 1),

    ("§2 는 '2. 제목' 에 매칭된다",
     COV_OK.replace("§2-3", "§2"),
     "# g\n\n## 2. 제목\n(교안 p.3)\n\n## 미확정 사항 / 확인 필요\n- 없음\n", 0),

    ("★ anchor 가 그 파일에 없음",
     COV_OK.replace("§2-3", "§없는절"), DOC_OK, 1),

    ("★ anchor 는 있으나 그 절에 인용이 없음", COV_OK,
     "# g\n\n## 2-3. 개념\n인용 없음.\n\n## 9. 딴 절\n(교안 p.3)\n\n"
     "## 미확정 사항 / 확인 필요\n- 없음\n", 1),

    ("★ included 인데 anchor 없음",
     COV_OK.replace("01_study-guide.md\t§2-3", "01_study-guide.md\t-"), DOC_OK, 1),

    ("★ omitted 인데 사유 없음",
     "page\tdisposition\toutput\tanchor\treason\n1\tomitted\t-\t-\t\n"
     "2\tomitted\t-\t-\t목차\n3\tincluded\t01_study-guide.md\t§2-3\t\n", DOC_OK, 1),

    ("★ 근거표에 없는 페이지 인용", COV_OK,
     DOC_OK.replace("본문 (교안 p.3).", "본문 (교안 p.3). 그리고 (교안 p.99)."), 1),

    ("★ 페이지 범위 인용도 검사한다", COV_OK,
     DOC_OK.replace("본문 (교안 p.3).", "본문 (교안 p.3–99)."), 1),

    ("★ 마지막 h2 규약 위반", COV_OK,
     "# g\n\n## 2-3. 개념\n(교안 p.3)\n\n## 개요\n- x\n", 1),

    ("★ 열린 코드블록", COV_OK,
     DOC_OK.replace("본문 (교안 p.3).", "본문 (교안 p.3).\n```python\nx=1\n"), 1),

    ("★ 깨진 상대 링크", COV_OK,
     DOC_OK.replace("본문 (교안 p.3).", "본문 (교안 p.3) [링크](./없는파일.md)"), 1),
]

TOTALLESS_CASE = ("★ --total-pages 없이 --coverage 를 쓰면 거부", COV_OK, DOC_OK, 1)


def run(args: list[str]) -> int:
    return subprocess.run([sys.executable, str(GATE), *args],
                          capture_output=True, text=True).returncode


def main() -> int:
    failed: list[str] = []
    total = 0

    for name, contract, review, expect in CASES:
        total += 1
        with tempfile.TemporaryDirectory() as td:
            h = Path(td) / "handoff"; h.mkdir()
            (h / "contract.md").write_text(contract, encoding="utf-8")
            if review is not None:
                (h / "review.md").write_text(review, encoding="utf-8")
            (Path(td) / "src").mkdir(); (Path(td) / "src" / "app.py").write_text("x=1\n")
            got = run(["--dir", str(h), "--repo-root", td])
        mark = "ok " if got == expect else "FAIL"
        if got != expect:
            failed.append(f"{name}: 기대 {expect}, 실제 {got}")
        print(f"  [{mark}] {name}  (exit {got})")

    for name, cov, doc, expect in COV_CASES:
        total += 1
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            h = root / "handoff"; h.mkdir()
            (h / "contract.md").write_text(GOOD_CONTRACT, encoding="utf-8")
            (h / "review.md").write_text(rows(OK_ROW), encoding="utf-8")
            (root / "src").mkdir(); (root / "src" / "app.py").write_text("x=1\n")
            out = root / "out"; out.mkdir()
            (out / "01_study-guide.md").write_text(doc, encoding="utf-8")
            cv = root / "coverage.tsv"; cv.write_text(cov, encoding="utf-8")
            got = run(["--dir", str(h), "--coverage", str(cv), str(out),
                       "--total-pages", TOTAL, "--repo-root", str(root)])
        mark = "ok " if got == expect else "FAIL"
        if got != expect:
            failed.append(f"{name}: 기대 {expect}, 실제 {got}")
        print(f"  [{mark}] {name}  (exit {got})")

    # --total-pages 누락 케이스
    total += 1
    name, cov, doc, expect = TOTALLESS_CASE
    with tempfile.TemporaryDirectory() as td:
        root = Path(td); h = root / "handoff"; h.mkdir()
        (h / "contract.md").write_text(GOOD_CONTRACT, encoding="utf-8")
        (h / "review.md").write_text(rows(OK_ROW), encoding="utf-8")
        (root / "src").mkdir(); (root / "src" / "app.py").write_text("x=1\n")
        out = root / "out"; out.mkdir()
        (out / "01_study-guide.md").write_text(doc, encoding="utf-8")
        cv = root / "coverage.tsv"; cv.write_text(cov, encoding="utf-8")
        got = run(["--dir", str(h), "--coverage", str(cv), str(out),
                   "--repo-root", str(root)])
    mark = "ok " if got == expect else "FAIL"
    if got != expect:
        failed.append(f"{name}: 기대 {expect}, 실제 {got}")
    print(f"  [{mark}] {name}  (exit {got})")

    # score=0 은 게이트를 돌리지 않는다
    total += 1
    with tempfile.TemporaryDirectory() as td:
        got = run(["--dir", str(Path(td))])
    mark = "ok " if got == 1 else "FAIL"
    if got != 1:
        failed.append(f"contract 없음: 기대 1, 실제 {got}")
    print(f"  [{mark}] ★ contract 없으면 실패  (exit {got})")

    # ★ cwd 비의존성 — 다른 디렉터리에서 돌려도 같은 결과여야 한다
    total += 1
    with tempfile.TemporaryDirectory() as td:
        root = Path(td); h = root / "handoff"; h.mkdir()
        (h / "contract.md").write_text(GOOD_CONTRACT, encoding="utf-8")
        (h / "review.md").write_text(rows(OK_ROW), encoding="utf-8")
        (root / "src").mkdir(); (root / "src" / "app.py").write_text("x=1\n")
        got = subprocess.run([sys.executable, str(GATE), "--dir", str(h),
                              "--repo-root", str(root)],
                             capture_output=True, text=True, cwd="/").returncode
    mark = "ok " if got == 0 else "FAIL"
    if got != 0:
        failed.append(f"cwd 비의존성: 기대 0, 실제 {got}")
    print(f"  [{mark}] ★ cwd 와 무관하게 동작  (exit {got})")

    print()
    if failed:
        print(f"실패 {len(failed)}/{total}:")
        for f in failed:
            print(f"  - {f}")
        return 1
    print(f"전부 통과 ({total}/{total})")
    return 0


if __name__ == "__main__":
    if not GATE.exists():
        print(f"gate.py 를 찾을 수 없다: {GATE}"); sys.exit(1)
    sys.exit(main())
