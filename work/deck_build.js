/* 기술서 덱 생성기 — 28장 (docs/06_기술서-원고.md 슬라이드 매핑표 기준)
 *
 *   node work/deck_build.js        (레포 루트에서 실행 · pptxgenjs 필요)
 *
 * ⚠️ 이 파일이 만드는 pptx 는 **생성 시점의 판단을 굳힌다.**
 *    설계 판정이 바뀌면 여기부터 고치고 다시 돌린다 (26라운드 R152 의 교훈).
 *    철회된 표현은 넣지 않는다 — "출근해서야 역할을 안다" · care_assignment ·
 *    "역할별 인계 템플릿" · "11개 엔티티" · "분기 A/B" · "전산 기록 하나가 둘을 겸한다".
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const A = (f) => path.join(ROOT, "assets", f);

const INK = "1E4D5C", MUTED = "5B6B70", PANEL = "F2F6F7", BORDER = "CFDDE1",
      MGR = "FB8C00", NUR = "43A047", WHITE = "FFFFFF", RED = "C62828", BLUE = "1565C0",
      TEAL = "1F8A7E", SOFT = "E4F3F0", INK2 = "33535E";
const F = "Arial";
const W = 10, H = 5.625, M = 0.55;

const p = new pptxgen();
p.layout = "LAYOUT_16x9";
p.author = "황재원"; p.company = "SKALA 10반";
p.title = "너와나의인계고리 — 프로젝트 기술서";

/* ---------- 공통 ---------- */
function titleBar(s, sec, title, sub) {
  if (sec) {
    s.addShape(p.ShapeType.roundRect, { x: M, y: 0.34, w: 0.62, h: 0.3, rectRadius: 0.06, fill: { color: INK } });
    s.addText(sec, { x: M, y: 0.34, w: 0.62, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
  }
  s.addText(title, { x: sec ? M + 0.78 : M, y: 0.26, w: W - 2 * M - 0.8, h: 0.46, fontFace: F, fontSize: 24, bold: true, color: INK, valign: "middle", margin: 0, isTextBox: true });
  if (sub) s.addText(sub, { x: sec ? M + 0.78 : M, y: 0.74, w: W - 2 * M - 0.8, h: 0.26, fontFace: F, fontSize: 11.5, color: MUTED, valign: "middle", margin: 0, isTextBox: true });
}
function foot(s, t) {
  s.addText(t, { x: M, y: H - 0.4, w: W - 2 * M, h: 0.24, fontFace: F, fontSize: 9, color: MUTED, margin: 0, isTextBox: true });
}
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }

/* 표 슬라이드 */
function tableSlide(sec, title, sub, header, rows, colW, opt) {
  opt = opt || {};
  const s = p.addSlide(); titleBar(s, sec, title, sub);
  const body = [];
  body.push(header.map((t) => ({
    text: t, options: { fill: { color: INK }, color: WHITE, bold: true, fontSize: 11, align: "left" }
  })));
  rows.forEach((r, i) => body.push(r.map((c) => {
    const o = typeof c === "object" ? c : { text: c };
    return { text: o.text, options: Object.assign({ fill: { color: i % 2 ? PANEL : WHITE }, color: o.color || INK2, bold: !!o.bold, fontSize: o.fontSize || opt.fontSize || 10.5, align: "left" }, o.opts || {}) };
  })));
  s.addTable(body, {
    x: M, y: opt.y || 1.16, w: W - 2 * M, colW,
    border: { type: "solid", color: BORDER, pt: 0.5 },
    fontFace: F, valign: "middle", margin: [5, 7, 5, 7], autoPage: false
  });
  if (opt.foot) foot(s, opt.foot);
  if (opt.notes) s.addNotes(opt.notes);
  return s;
}

/* 번호 포인트 슬라이드 */
function pointsSlide(sec, title, sub, items, opt) {
  opt = opt || {};
  const s = p.addSlide(); titleBar(s, sec, title, sub);
  const top = 1.16, gap = 0.12;
  const h = (H - top - (opt.foot ? 0.55 : 0.32) - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const y = top + i * (h + gap);
    s.addShape(p.ShapeType.roundRect, { x: M, y, w: W - 2 * M, h, rectRadius: 0.03, fill: { color: i % 2 ? PANEL : WHITE }, line: { color: BORDER, width: 1 } });
    s.addShape(p.ShapeType.roundRect, { x: M + 0.18, y: y + (h - 0.34) / 2, w: 0.34, h: 0.34, rectRadius: 0.07, fill: { color: it.color || TEAL } });
    s.addText(it.n, { x: M + 0.18, y: y + (h - 0.34) / 2, w: 0.34, h: 0.34, fontFace: F, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(
      [{ text: it.t + "  ", options: { bold: true, color: INK, fontSize: 12.5 } },
       { text: it.d, options: { color: MUTED, fontSize: 11 } }],
      { x: M + 0.66, y, w: W - 2 * M - 0.9, h, fontFace: F, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 }
    );
  });
  if (opt.foot) foot(s, opt.foot);
  if (opt.notes) s.addNotes(opt.notes);
  return s;
}

/* 큰 이미지 한 장 */
function bigImage(sec, title, sub, file, footTxt, notes) {
  const s = p.addSlide(); titleBar(s, sec, title, sub);
  const { w: IW, h: IH } = pngSize(file);
  const ay = 1.12, ah = H - ay - (footTxt ? 0.5 : 0.24), aw = W - 2 * M;
  const ar = IW / IH; let h = ah, w = h * ar; if (w > aw) { w = aw; h = w / ar; }
  s.addImage({ path: file, x: M + (aw - w) / 2, y: ay + (ah - h) / 2, w, h });
  if (footTxt) foot(s, footTxt);
  if (notes) s.addNotes(notes);
  return s;
}

/* 이미지 N장 가로 배치 + 캡션 */
function rowImages(sec, title, sub, items, footTxt, notes) {
  const s = p.addSlide(); titleBar(s, sec, title, sub);
  const n = items.length, gap = 0.22;
  const ay = 1.14, cap = 0.62, ah = H - ay - (footTxt ? 0.5 : 0.24) - cap;
  const cw = (W - 2 * M - gap * (n - 1)) / n;
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    const { w: IW, h: IH } = pngSize(it.file);
    const ar = IW / IH; let w = cw, h = w / ar; if (h > ah) { h = ah; w = h * ar; }
    s.addImage({ path: it.file, x: x + (cw - w) / 2, y: ay + (ah - h) / 2, w, h });
    s.addText(
      [{ text: it.title + "\n", options: { bold: true, color: INK, fontSize: 10.5 } },
       { text: it.note, options: { color: MUTED, fontSize: 9 } }],
      { x, y: ay + ah + 0.06, w: cw, h: cap - 0.06, fontFace: F, align: "center", valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.1 }
    );
  });
  if (footTxt) foot(s, footTxt);
  if (notes) s.addNotes(notes);
  return s;
}

/* ============================================================
 * 1. 표지
 * ============================================================ */
{
  const s = p.addSlide(); s.background = { color: INK };
  s.addText("너와나의인계고리", { x: M, y: 1.7, w: W - 2 * M, h: 0.9, fontFace: F, fontSize: 40, bold: true, color: WHITE, margin: 0, isTextBox: true });
  s.addText("근무표가 끝나는 지점에서 시작한다", { x: M, y: 2.6, w: W - 2 * M, h: 0.4, fontFace: F, fontSize: 16, color: "BBD4DB", margin: 0, isTextBox: true });
  s.addShape(p.ShapeType.rect, { x: M, y: 3.2, w: 0.9, h: 0.03, fill: { color: MGR } });
  s.addText("간호사 교대근무 인계·배정 웹서비스   ·   AI 웹서비스 미니프로젝트   ·   10반 황재원   ·   2026.09", { x: M, y: 3.5, w: W - 2 * M, h: 0.3, fontFace: F, fontSize: 12, color: "9FBCC4", margin: 0, isTextBox: true });
  s.addNotes("시작 문구: '근무표는 누가 나오는지까지만 말합니다. 그 다음 고리가 비어 있습니다.'");
}

/* 2. 목차 */
{
  const s = p.addSlide(); titleBar(s, null, "목차", null);
  const items = [["01", "서비스 개요 · 배경"], ["02", "Pain point ↔ Solution"], ["03", "액터 · 권한 · 기능"], ["04", "전체 UI 흐름도"],
                 ["05", "화면별 UI 흐름 (11화면)"], ["06", "데이터 모델 (12 테이블)"], ["07", "API (24 오퍼레이션)"], ["08", "설계 고민 · 한계"]];
  items.forEach((it, i) => {
    const col = i < 4 ? 0 : 1, row = i % 4;
    const x = M + col * (W - 2 * M) / 2, y = 1.35 + row * 0.82;
    s.addShape(p.ShapeType.roundRect, { x, y, w: 0.5, h: 0.5, rectRadius: 0.08, fill: { color: PANEL }, line: { color: BORDER, width: 1 } });
    s.addText(it[0], { x, y, w: 0.5, h: 0.5, fontFace: F, fontSize: 13, bold: true, color: INK, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(it[1], { x: x + 0.68, y, w: (W - 2 * M) / 2 - 0.85, h: 0.5, fontFace: F, fontSize: 13, color: INK, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addNotes("28장. 배점이 큰 곳은 06(데이터모델 20)·07(API 20)이다.");
}

/* ============================================================
 * 01 서비스 개요 · 배경
 * ============================================================ */
{
  const s = p.addSlide(); titleBar(s, "01", "서비스 개요", "한 문장 정의 · 핵심 가치 · 범위");
  const boxes = [
    { t: "누가", d: "교대근무 병동의\n간호사와 수간호사" },
    { t: "언제", d: "교대 때 인계를 주고받고\n결원으로 바뀐 배정을 다시 맞출 때" },
    { t: "무엇이 불편한가", d: "인계를 누가 받아 이해했는지 남는 기록이 없고\n배정이 바뀌면 여러 곳에 다시 알려야 한다" },
  ];
  const bw = (W - 2 * M - 0.24 * 2) / 3;
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 0.24);
    s.addShape(p.ShapeType.roundRect, { x, y: 1.14, w: bw, h: 1.18, rectRadius: 0.04, fill: { color: PANEL }, line: { color: BORDER, width: 1 } });
    s.addText(b.t, { x: x + 0.16, y: 1.24, w: bw - 0.32, h: 0.26, fontFace: F, fontSize: 10.5, bold: true, color: TEAL, margin: 0, isTextBox: true });
    s.addText(b.d, { x: x + 0.16, y: 1.5, w: bw - 0.32, h: 0.72, fontFace: F, fontSize: 11.5, color: INK2, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  });
  s.addShape(p.ShapeType.roundRect, { x: M, y: 2.46, w: W - 2 * M, h: 0.92, rectRadius: 0.04, fill: { color: SOFT }, line: { color: TEAL, width: 1 } });
  s.addText("이 서비스로 — 누가 무엇을 맡았고 무엇을 주고받았는지 확인하고, 그 기록을 남길 수 있다",
    { x: M + 0.22, y: 2.54, w: W - 2 * M - 0.44, h: 0.34, fontFace: F, fontSize: 13.5, bold: true, color: INK, valign: "middle", margin: 0, isTextBox: true });
  s.addText("핵심 가치 — 근무표가 끝나는 지점에서 시작한다. 누가 나오는지까지만 말하는 근무표에, 누가 인계를 맡았고 누가 받아 확인했는지를 붙여 한 줄로 잇는다.",
    { x: M + 0.22, y: 2.9, w: W - 2 * M - 0.44, h: 0.42, fontFace: F, fontSize: 11, color: INK2, valign: "middle", margin: 0, isTextBox: true });
  s.addText([{ text: "하지 않는 것   ", options: { bold: true, color: RED, fontSize: 11 } },
             { text: "근무표 자동 생성  ·  실제 EMR 연동  ·  실제 환자 개인정보  ·  임상적 판단/추천  ·  교육 일정/급여/알람", options: { color: MUTED, fontSize: 11 } }],
    { x: M, y: 3.52, w: W - 2 * M, h: 0.3, fontFace: F, valign: "middle", margin: 0, isTextBox: true });
  foot(s, "산출물 3종 — 개요 PDF · API.yml (OAS 3.0.3) · DB.dbml");
  s.addNotes("한 문장 정의를 그대로 읽는다. '하지 않는 것'을 먼저 말해 범위를 닫는다.");
}

tableSlide("01", "배경 — 무엇이 비어 있나", "조사 범위에서 '확인하지 못한 것'과 '확인한 것'을 구분한다",
  ["조사한 것", "결과", "근거"],
  [
    ["국내 직접 경쟁 후보 13건\n(국내 12 + 일본 개발 1)", { text: "확정 근무 → 당일 역할 → 구조화 인계 → 결원 재배정을\n하나의 흐름으로 연결한 사례는 확인하지 못했다", bold: true }, "[B] 제품 공식 페이지·앱스토어 설명"],
    ["해외 사례", "Epic \"Art\" — 교대 노트 AI 생성·배정 제안 (미국 EHR 내장)\nShiftSBAR — 개인용 SBAR 변환 (병동 단위 배정·수신 확인 없음)", "[B] Epic 공식 포스트 · 제품 페이지"],
    ["건강정보 처리", "민감정보로 제한되지만 별도 동의·법령 근거가 있으면 처리 가능", "[A] 개인정보보호법 제23조"],
    ["국내 EMR 의\n교대 인계 전용 워크플로", { text: "미확정 — 인증기준·공개자료에서 확인하지 못했다\n(\"없다\"는 뜻이 아니다)", color: RED }, "[D] 미검증"],
  ],
  [2.1, 5.0, 1.8],
  { foot: "빈 이유가 \"법적으로 불가능\"이 아니라 비용(동의 설계·접근 통제·병원 승인·EMR 연동 책임)이라는 것은 우리의 해석이다 — 등급을 붙이지 않는다",
    notes: "발표에서 '없다'라고 말하지 않는다. '조사 범위에서 확인하지 못했다'로 말한다." });

pointsSlide("01", "조사 범위와 한계", "먼저 말하고 시작한다 — 이 설계가 무엇을 근거로 하는가", [
  { n: "1", t: "대상은 병동 1곳이다.", d: "국내 종합병원 병동 1곳의 운영 방식을 기준으로 설계했다. [C]", color: TEAL },
  { n: "2", t: "표본은 현직 간호사 1명(편의표본)이다.", d: "\"간호사 일반의 의견\"이 아니라 \"현직 간호사 1명을 대상으로 한 탐색적 확인\"이다. [C]", color: TEAL },
  { n: "3", t: "병동마다 운영이 다르다는 것도 같은 인터뷰에서 확인했다.", d: "차지 전담 채용 등 — 병동별 운영 차이는 이번 범위 밖으로 명시했다. [C]", color: MGR },
  { n: "4", t: "모든 사실 주장에 등급을 붙였다.", d: "[A] 원문 확인 / [B] 2차 출처 / [C] 현직 간호사 1명 인터뷰 / [D] 전언·미검증. 등급 없는 문장은 우리의 설계 판단이다.", color: INK },
], { notes: "범위를 좁힌 것을 근거와 함께 말하는 것은 감점이 아니다. 채점 기준이 정합성이기 때문이다." });

/* ============================================================
 * 02 Pain ↔ Solution
 * ============================================================ */
tableSlide("02", "Pain point ↔ Solution", "문제 · 해결 · 기능이 1:1 로 붙는다",
  ["#", "Actor", "Pain (현상과 원인)", "Solution", "기능"],
  [
    ["2", "간호사\n(팀 차지)", { text: "인계를 누가 받아 이해했는지 확인하는 기록이 없다 [C]\n확인 기록 시스템이 없다 — 인계 내용 자체는 전산에 남는다\n참여자 표현: \"그날 듀티에서 차지하는 사람이 듣는 게 당연한 구조\"" },
      "팀 차지가 병동 공통 필수 항목으로 작성하고,\n다음 근무 팀 차지가 핵심 내용을 자기 말로 정리해\n확인 처리한다 — 누가 언제 받았는지가 남는다", { text: "F-04", bold: true, color: NUR }],
    ["3", "수간호사", { text: "결원이 생기면 변경을 여러 곳에 다시 알려야 하고,\n최신 배정도 변경 이력도 남지 않는다 [C]\n원인 — 엑셀을 고치고 메신저로 재공지하기 때문 [D]" },
      "화면에서 바로 재배정하고, 바뀐 배정이\n당사자 화면에 그대로 보이며,\n변경 사유와 이력이 함께 남는다", { text: "F-05", bold: true, color: MGR }],
  ],
  [0.35, 1.1, 4.1, 3.0, 0.35],
  { foot: "Pain 1(\"출근해서야 역할을 안다\")은 인터뷰로 철회했다 → 다음 장",
    notes: "'받았다는 기록이 없다'가 핵심 문장. '기록이 없다'가 아니다 — 내용은 남는다." });

tableSlide("02", "★ 철회한 가설 — 인터뷰가 무너뜨린 것", "설계를 세 번 줄였고, 줄인 이유가 전부 인터뷰에 있다",
  ["1일차에 적었던 것", "인터뷰 후", "설계에 미친 영향"],
  [
    [{ text: "\"출근해서야 자기 역할을 안다\"", color: RED }, { text: "철회 [C] — 월말 전에 팀장이 정하고\n이후 간호사끼리 바꾼다 (사전 배정 + 사후 교환)", bold: true }, "Pain 1 삭제\nF-02·F-03 은 기반 기능으로 내림"],
    [{ text: "\"인계 내용이 기록되지 않는다\"", color: RED }, { text: "좁힘 — 내용은 남는다.\n\"받았다는 기록이 없다\"가 맞다", bold: true }, "F-04 의 초점이\nreceiver_summary 로 이동"],
    [{ text: "\"역할별 인계 템플릿이 필요하다\"", color: RED }, { text: "반증 [C] — 인계는 차지가 받고\n액팅은 옆에서 같은 인계를 듣는다", bold: true }, "F-06 이 병동 공통 템플릿으로\n축소 (role_type_id 제거)"],
    [{ text: "\"전산 기록 하나가 인계와 공식 기록을 겸한다\"", color: RED }, { text: "해석 오류였다 — 인계장(카덱스)과\n의무기록은 분리돼 있다 [C]", bold: true }, "\"우리가 이중 입력을 만든다\"는\n전제가 사라짐"],
  ],
  [2.7, 3.6, 2.6],
  { notes: "이 장이 차별점이다. 전제가 무너진 것을 숨기지 않고 철회로 기록했다고 말한다." });

/* ============================================================
 * 03 액터 · 권한 · 기능
 * ============================================================ */
tableSlide("03", "시스템 액터", "병동 경계가 곧 권한 경계다",
  ["Actor", "범위", "제공 기능"],
  [
    [{ text: "수간호사", bold: true, color: MGR }, "병동의 근무·역할·인계 담당 배정 책임자 [C]\n자신이 관리하는 ward 전체를 읽는다",
      "확정 근무 등록 / 역할·인계 담당 배정 / 병동 인계 항목 정의\n결원 재배정 / 변경 이력 조회"],
    [{ text: "간호사", bold: true, color: NUR }, "내 근무·역할은 shift_assignment\n우리 팀 환자는 inpatient_stay.team_id\n인계 담당은 handover_assignment 기준",
      "내 근무·역할·우리 팀 환자 확인 / 배정 변경 확인\n(인계 담당 차지) 인계 작성 · 수신 + 핵심 내용 요약 확인\n(액팅) 우리 팀 인계 열람 / 내 인계 이력"],
    [{ text: "다른 병동", bold: true, color: RED }, "접근 금지", "없음 — 403 으로 답한다 (404 가 아니다)"],
  ],
  [1.3, 3.3, 4.3],
  { notes: "액터 2명. 인증은 외부 시스템 가정이라 이 설계의 범위 밖이다." });

tableSlide("03", "권한 — 읽기 3단", "권한이 자기 기능을 막지 않게",
  ["단계", "읽기 대상", "판정 기준"],
  [
    [{ text: "①", bold: true }, "병동 전체", "user_type = HEAD_NURSE  +  users.ward_id 일치"],
    [{ text: "②", bold: true }, "내가 인계 담당인 입원 건과 그 인계", "내 shift_assignment 에 달린 handover_assignment (status = ACTIVE)"],
    [{ text: "③", bold: true }, { text: "우리 팀 환자와 그 인계", bold: true }, "인계의 from/to 근무가 내 ACTIVE 근무와 같은 병동·날짜·근무조\n+ 같은 팀 + sent_at 있음   (DRAFT 는 작성자 전용)"],
  ],
  [0.5, 3.0, 5.4],
  { foot: "쓰기는 더 좁다 — 작성은 from 당사자, 요약·확인은 to 당사자만. 결원·이관된 수신자는 받을 수 없다(403)",
    notes: "③ 이 없으면 액팅이 차지가 받은 인계를 못 읽는다. 권한이 기능을 막은 실수를 두 번 했고 두 번 다 이 표에서 잡았다." });

tableSlide("03", "기능 F-01 ~ F-06", "6개 전부 최소 1개 화면·API 에 연결된다",
  ["ID", "기능", "Actor", "화면", "거부 시"],
  [
    ["F-01", "확정 근무 등록", "수간호사", "3", "403 / 409 중복"],
    ["F-02", "날짜별 역할 · 인계 담당 배정", "수간호사", "4", "403 / 409 / 422"],
    ["F-03", "내 배정 · 변경 확인", "간호사", "8", "401 / 403 타인 조회"],
    [{ text: "F-04", bold: true, color: NUR }, { text: "구조화 인계 작성 + 수신자 요약 확인", bold: true }, "간호사 — 차지 작성 / 다음 차지 확인 / 액팅 열람", "9 · 10 · 11", "403 당사자 아님 · 422 필수·요약 미입력 · 409 재확인·퇴원"],
    [{ text: "F-05", bold: true, color: MGR }, { text: "결원 등록 → 재배정 → 대체 완료 확인 + 이력", bold: true }, "수간호사", "6 · 7", "422 대체자 없이 완료 · 409 재확인"],
    ["F-06", "병동 인계 항목 정의 (F-04 템플릿의 출처)", "수간호사", "5", "403 간호사 쓰기"],
  ],
  [0.65, 3.35, 2.35, 0.85, 1.7],
  { fontSize: 10, foot: "F-04 ↔ Pain 2  ·  F-05 ↔ Pain 3  ·  나머지 넷은 기반 기능", notes: "Actor 가 다른 동작을 한 기능에 묶으면 권한 정의가 불가능해서 F-06 을 분리했다." });

/* ============================================================
 * 04 전체 UI 흐름도 [필수]
 * ============================================================ */
bigImage("04", "전체 UI 흐름도", "로그인에서 갈라지는 두 갈래 · 화면 이동(실선)과 데이터 반영(점선)",
  A("ui_flow.png"),
  "실선 = 같은 사용자의 화면 이동   ·   점선 = 데이터·상태가 상대 Actor 화면에 반영됨   ·   화면 11개 전부가 이 그림에 있다",
  "[필수] UI 흐름도는 반드시 PDF 안에 존재해야 한다. 점선 4개가 두 Actor 를 잇는 지점이다.");

bigImage("04", "UI 흐름 (1/2) — 수간호사", "근무 등록 → 역할·인계 담당 배정 → 결원 재배정 → 변경 이력",
  A("ui_flow_1_manager.png"),
  "배정은 저장 즉시 반영된다 — 게시·승인 단계가 없다",
  "수간호사 쪽만 떼어낸 그림. 점선 3개가 간호사 화면으로 넘어간다.");

bigImage("04", "UI 흐름 (2/2) — 간호사 · Actor 간 연결", "내 근무·역할 → 인계 작성 → 인계 수신·요약 확인",
  A("ui_flow_2_nurse.png"),
  "인계 전달은 앞 근무 팀 차지 → 다음 근무 팀 차지   ·   같은 팀 액팅은 열람만 한다",
  "점선이 '두 섬을 잇는 다리'다. 인계 전달만 간호사↔간호사(서로 다른 사람)라는 점을 짚는다.");

/* ============================================================
 * 05 화면별 UI 흐름 (11화면)
 * ============================================================ */
rowImages("05", "화면 1 · 8 — 로그인과 간호사 진입점", "간호사는 자기 근무에서 시작한다",
  [
    { file: A("1_login_main.png"), title: "1_login_main", note: "인증은 외부 시스템 가정 — 이 설계의 범위 밖" },
    { file: A("8_myshift_nurse.png"), title: "8_myshift_nurse", note: "받은 인계(앞 근무→나) / 보낸 인계(나→다음 근무) 두 열" },
  ],
  "인계 담당이 0건이어도 근무·역할은 보인다 (읽기 3단 분리)   ·   액팅에게는 작성 버튼이 없다",
  "화면 8 이 간호사의 유일한 진입점이다. 두 방향이 한 화면에 보이는 것이 '고리'의 그림이다.");

bigImage("05", "화면 8 — 빈 상태 3종", "비어 있을 때 무엇을 보여주는가가 설계다",
  A("8_myshift_nurse_states.png"),
  "근무 없음 / 역할 배정 대기 / 인계 담당 미지정 — 빈 화면 대신 \"다음에 할 일\"을 적는다",
  "빈 상태를 설계했다는 것 자체가 읽기 3단을 분리한 근거다.");

bigImage("05", "화면 4 — 역할 · 인계 담당 배정", "팀이 환자를 공동 담당한다. 여기서 정하는 것은 인계 담당이다",
  A("4_assignment_board_manager.png"),
  "역할은 고르는 즉시 저장된다(PATCH) — 저장 버튼이 없다   ·   인계 담당 기본값은 그 근무의 팀 차지이지만 역할로 강제하지 않는다",
  "'담당 환자 배정'이 아니라 '인계 담당 지정'이다. 이름을 바꾼 이유는 8장에서 말한다.");

rowImages("05", "화면 9 · 10 — 인계 작성과 수신 확인", "Pain 2 가 해결되는 지점",
  [
    { file: A("9_handover_write_nurse.png"), title: "9_handover_write_nurse", note: "병동 공통 필수 항목 · 미작성이면 넘길 수 없다 (422)" },
    { file: A("10_handover_receive_nurse.png"), title: "10_handover_receive_nurse", note: "읽은 것만으로는 확인이 아니다 — 자기 말로 요약해야 확인 (422)" },
  ],
  "받는 사람은 서버가 고른다(같은 입원 건의 다음 근무 담당)   ·   확인이 끝나면 보낸 사람 화면에 수신자 요약이 되돌아온다",
  "I-PASS 의 read-back. 단순 ack(received_at)와 receiver_summary 를 가르는 지점이다.");

rowImages("05", "화면 2 · 3 · 5 — 수간호사 진입점과 기반 화면", "대시보드의 숫자는 전부 근거 목록으로 펼쳐진다",
  [
    { file: A("2_dashboard_manager.png"), title: "2_dashboard_manager", note: "\"인계 미작성 N건\"은 넣지 않았다 — 셀 근거가 없다" },
    { file: A("3_shift_register_manager.png"), title: "3_shift_register_manager", note: "역할은 여기서 정하지 않는다 · 지원 근무 허용" },
    { file: A("5_handover_template_manager.png"), title: "5_handover_template_manager", note: "역할 선택이 없다 · 고쳐도 기존 인계는 안 바뀐다" },
  ],
  "대시보드 타일 4개는 각각 근거 목록으로 펼쳐진다 — 드릴다운은 기존 조회 API 를 재사용한다 (같은 데이터를 두 번 정의하지 않는다)",
  "숫자를 보여주면 그 숫자의 근거로 내려갈 수 있어야 한다. 미확인 인계만 새 오퍼레이션이고 나머지는 재사용이다.");

rowImages("05", "화면 6 · 7 · 11 — 결원 재배정과 이력", "Pain 3 가 해결되는 지점",
  [
    { file: A("6_reassign_manager.png"), title: "6_reassign_manager", note: "4단계 + 잔여 인계 담당 경고 — 가드가 못 보는 것을 화면이 보여준다" },
    { file: A("7_change_history_manager.png"), title: "7_change_history_manager", note: "사유는 한 번만 입력하고 서버가 복사한다" },
    { file: A("11_handover_history_nurse.png"), title: "11_handover_history_nurse", note: "SUPERSEDED 는 읽기 전용이고 미확인 집계에서 빠진다" },
  ],
  "대체 완료는 자동 판정이 아니라 사람의 확인 기록이다 — 다만 근거 없는 확인은 422 로 막는다",
  "화면 6 의 '잔여 담당 N건'은 API 가 막지 않기로 한 것을 화면이 대신 보여주는 자리다.");

/* ============================================================
 * 06 데이터 모델
 * ============================================================ */
bigImage("06", "데이터 모델 — ERD", "12 테이블 · 7 Enum · FK 23",
  A("erd_full.png"),
  "M:N 은 handover_assignment 하나로 해소   ·   상태·유형값은 Enum, 단 role_type 은 병동이 값을 추가하므로 테이블",
  "엔티티 12개는 권장(6~9)의 의도적 예외다. 팀·인계 담당·템플릿 항목이 각각 이유를 갖는다.");

pointsSlide("06", "핵심 설계 포인트 ① — 이름이 뜻을 바꿨다", "care_assignment → handover_assignment", [
  { n: "1", t: "1일차 전제:", d: "\"환자의 개인 담당자\"를 지정하는 테이블로 설계했다.", color: MUTED },
  { n: "2", t: "인터뷰가 뒤집었다 [C]:", d: "팀이 환자를 공동 담당한다 — 개인 ↔ 환자 배정 행위가 현장에 없다.", color: RED },
  { n: "3", t: "현재 정의:", d: "\"그 근무에서 이 입원 건의 인계를 작성·수신할 차지를 지정하는 경로\". 행 수가 (팀 인원 × 환자 수)에서 (환자 수)로 줄었다.", color: TEAL },
  { n: "4", t: "팀의 환자 범위는 여기가 아니다:", d: "inpatient_stay.team_id 로 따로 표현한다. 그래야 액팅도 우리 팀 인계를 읽을 수 있다(읽기 3단 ③).", color: TEAL },
  { n: "5", t: "역할로 강제하지 않는다:", d: "차지 결원 시 누가 올라가는지 확인되지 않았다. 확인되지 않은 운용을 DB 가 금지하면 안 된다.", color: INK },
], { foot: "이름만 바꾼 것이 아니다 — DBML · 기능표 · 화면 문구 · API 응답 필드 7곳이 같이 움직였다",
     notes: "'FK 이름만 바꾸는 1시간 작업'으로 계산하면 안 된다는 것을 11라운드에서 배웠다." });

pointsSlide("06", "핵심 설계 포인트 ② — 과거 인계는 불변이다", "append-only · 스냅샷 · SUPERSEDED", [
  { n: "1", t: "담당은 덮어쓰지 않는다:", d: "handover_assignment 는 REPLACED 로 보존하고 새 행을 만든다.", color: TEAL },
  { n: "2", t: "항목은 스냅샷이다:", d: "handover_item 은 템플릿을 복사한다. 수간호사가 템플릿을 고쳐도 이미 쓴 인계는 바뀌지 않는다.", color: TEAL },
  { n: "3", t: "수신자가 결원되면:", d: "덮어쓰지 않고 SUPERSEDED 로 보존 + 후속 인계를 같은 트랜잭션에서 발행한다(superseded_by_handover_id). 비면 422 — 인계가 끊긴 채 종결되는 것을 막는다.", color: MGR },
  { n: "4", t: "CONFIRMED → SUPERSEDED 는 금지(409):", d: "확인까지 끝난 인계는 닫힌 고리다. 그 뒤의 담당 변경은 인계 실패가 아니라 정상 교대다.", color: RED },
  { n: "5", t: "대가도 적는다:", d: "남긴 행은 여전히 유효한 ID 라서, 읽기·쓰기·선택 세 곳에서 \"이 행이 현재인가\"를 검사해야 한다.", color: INK },
], { notes: "append-only 의 비용을 같이 적는 것이 '설계 고민'의 증거다." });

tableSlide("06", "핵심 설계 포인트 ③ — 결원 이력은 두 층위다", "근무 자리와 인계 담당은 다른 층이다 · 담당 0건 결원도 이력이 남아야 한다",
  ["change_type", "from_shift", "to_shift", "from_handover", "to_handover", "언제 생기는가"],
  [
    ["ABSENCE_REGISTERED", { text: "필수", bold: true }, "—", "—", "—", "결원 등록 — 사람이 사유를 쓰는 유일한 지점"],
    ["SUBSTITUTE_ASSIGNED", { text: "필수", bold: true }, { text: "필수", bold: true }, "—", "—", "대체자 배정 (사유는 서버가 복사)"],
    ["HANDOVER_OWNER_TRANSFERRED", { text: "필수", bold: true }, { text: "필수", bold: true }, { text: "필수", bold: true }, { text: "필수", bold: true }, "입원 건마다 1행 — 인계는 SUPERSEDED + 후속 발행"],
    ["COVER_CONFIRMED", { text: "필수", bold: true }, "—", "—", "—", "대체 완료로 확인 — 사람의 확인 기록"],
  ],
  [2.2, 0.75, 0.7, 0.95, 0.9, 3.4],
  { foot: "액팅 결원은 담당이 항상 0건이다(팀 공동 담당) → 3행만 남는다   ·   다형성 FK 를 쓰지 않은 이유: FK 제약을 걸 수 없다",
    notes: "change_type 하나가 네 FK 의 유효 조합을 결정한다. 사유는 한 번 입력하고 세 번(이관이 여럿이면 그 이상) 복사된다." });

/* ============================================================
 * 07 API
 * ============================================================ */
bigImage("07", "API 명세 — OAS 3.0.3", "24 오퍼레이션 · 21 경로 · 스펙 에러 0",
  A("swagger_full.png"),
  "components 먼저 설계하고 paths 를 붙였다   ·   Security Schemes 는 평가 제외라 작성하지 않았다(인증은 외부 시스템 가정)",
  "화면 11개의 진입·조회·저장·상태 전이를 먼저 세어 25개 트리거를 만들고, 재사용을 빼 24 오퍼레이션이 됐다.");

{
  const s = p.addSlide();
  titleBar(s, "07", "설계 포인트 ① — 요청에서 받지 않는 값", "서버 계산 7개 · 클라이언트가 정하면 깨지는 것들");
  const rows = [
    ["인계의 to", "요청이 주면 임의의 과거·미래 근무로 보낼 수 있다\n→ 같은 입원 건의 시간상 다음 ACTIVE 담당, 없으면 422"],
    ["change_reason", "사람이 쓰는 지점은 결원 등록 하나뿐. 나머지는 복사\n사유가 갈리면 한 결원 건의 이력을 이어서 못 읽는다"],
    ["is_handover_owner\nincoming / outgoing", "화면 버튼(작성 · 확인 · 열람)을 서버가 판정한다\nSUPERSEDED 는 제외 — 원본과 후속 중 어디에 버튼을 걸지 정해야 한다"],
  ];
  const body = [[{ text: "값", options: { fill: { color: INK }, color: WHITE, bold: true, fontSize: 11 } },
                 { text: "왜 서버가 정하는가", options: { fill: { color: INK }, color: WHITE, bold: true, fontSize: 11 } }]];
  rows.forEach((r, i) => body.push([
    { text: r[0], options: { fill: { color: i % 2 ? PANEL : WHITE }, color: INK, bold: true, fontSize: 10.5 } },
    { text: r[1], options: { fill: { color: i % 2 ? PANEL : WHITE }, color: INK2, fontSize: 10.5 } }]));
  s.addTable(body, { x: M, y: 1.16, w: 5.55, colW: [1.55, 4.0], border: { type: "solid", color: BORDER, pt: 0.5 }, fontFace: F, valign: "middle", margin: [5, 7, 5, 7] });
  const sz = pngSize(A("swagger_handover.png"));
  const iw = 3.05, ih = Math.min(iw / (sz.w / sz.h), 2.9);
  s.addImage({ path: A("swagger_handover.png"), x: W - M - iw, y: 1.16, w: iw, h: ih });
  s.addText("POST /handovers — 요청 본문에 to 가 없다", { x: W - M - iw, y: 1.16 + ih + 0.06, w: iw, h: 0.28, fontFace: F, fontSize: 9.5, color: MUTED, align: "center", margin: 0, isTextBox: true });
  foot(s, "화면이 요청 본문에 넣는 식별자는 반드시 어떤 조회 API 의 응답 필드여야 한다 — 이 규칙이 없어 생긴 구멍을 검증 단계에서 잡았다");
  s.addNotes("서버 계산은 '편의'가 아니라 '규칙을 한 곳에 두는 것'이다. 클라이언트가 정하면 규칙이 흩어진다.");
}

tableSlide("07", "설계 포인트 ② — 상태 전이가 오류 코드를 만든다", "409 와 422 를 섞지 않는다",
  ["코드", "무엇을 뜻하는가", "이 설계에서의 예"],
  [
    [{ text: "401", bold: true }, "미인증", "모든 오퍼레이션의 기본"],
    [{ text: "403", bold: true, color: MGR }, "권한 없음 — 리소스는 있다", "타 병동 접근 · 당사자 아님 · 액팅의 작성 시도\n결원·이관된 수신자의 확인 시도"],
    [{ text: "404", bold: true }, "리소스 없음", "존재하지 않는 ID. 타 병동을 404 로 숨기지 않았다 — 둘을 합치지 않는다"],
    [{ text: "409", bold: true, color: RED }, { text: "상태 전이 금지", bold: true }, "CONFIRMED 재확인 · SUPERSEDED 에 쓰기 · 퇴원(CLOSED) 건 신규 인계\n같은 사람·같은 날·같은 근무조 중복 등록"],
    [{ text: "422", bold: true, color: RED }, { text: "입력 부족 · 가드 불충족", bold: true }, "필수 항목 미작성 · 요약 미입력 · 대체자 없이 완료 확인\n다음 근무의 인계 담당이 아직 없음"],
  ],
  [0.7, 2.6, 5.6],
  { foot: "handover: DRAFT → SENT → CONFIRMED  ·  DRAFT/SENT → SUPERSEDED  (CONFIRMED → SUPERSEDED 는 409)",
    notes: "409 는 '지금 상태에서 그 전이는 안 된다', 422 는 '보낸 내용이 모자라다'. 둘을 섞으면 화면이 무엇을 고쳐야 할지 모른다." });

/* ============================================================
 * 08 설계 고민 · 한계
 * ============================================================ */
pointsSlide("08", "설계 고민 — 택한 안과 버린 안", "원칙을 벗어난 결정만 적는다", [
  { n: "1", t: "대시보드는 화면 전용 집계 API 다.", d: "4개 리소스를 합친다. 나누면 화면이 4번 요청하고 집계 규칙(대체 전 결원 · 미확인 = SENT)이 클라이언트로 흩어진다.", color: TEAL },
  { n: "2", t: "드릴다운은 기존 조회 API 를 재사용한다.", d: "명단은 F-01 조회가 이미 돌려주는 값이다. 전용 API 를 또 만들면 같은 데이터를 두 곳에서 정의하게 된다.", color: TEAL },
  { n: "3", t: "열람 기록(received_at)을 GET 과 분리했다.", d: "GET 에 부작용을 넣으면 수간호사·액팅의 열람까지 수신 기록이 된다 — read-back 의 뜻이 깨진다.", color: TEAL },
  { n: "4", t: "잔여 담당은 API 가 아니라 화면이 막는다.", d: "이관하지 않는 것이 정상인 경우가 있다(그 사이 퇴원 등). 대신 화면이 \"남은 담당 N건\"을 보여주고 사람이 판단한다.", color: MGR },
  { n: "5", t: "타 병동은 403 으로 답한다.", d: "404 가 더 방어적이지만, 권한 경계를 명시적으로 드러내는 쪽을 택했다. 미결로 끌면 OAS·점검이 함께 흔들린다.", color: MGR },
], { notes: "버린 안과 그 이유를 적는 것이 채택안만 적는 것보다 강하다." });

pointsSlide("08", "한계 — 정직하게 적는다", "이번 범위 밖으로 둔 것과 그 이유", [
  { n: "1", t: "EMR 연동이 없다.", d: "공식 의무기록은 EMR, 이 설계는 인계장(카덱스) 계층만 다룬다. 대체가 성립하는지는 검증 전이다 — 병행 운용이면 이중 입력이 남는다.", color: RED },
  { n: "2", t: "요약의 품질은 검사하지 않는다.", d: "빈칸 검사만 한다. 성의 없는 한 글자도 CONFIRMED 가 된다. 남기는 것은 \"누가 언제 자기 말로 적었는가\"까지다.", color: RED },
  { n: "3", t: "차지가 작성 요청을 무시해도 막지 못한다.", d: "액팅 의견의 제안·채택·거부 이력은 범위 밖이다.", color: RED },
  { n: "4", t: "검증 표본이 1명이다.", d: "간호사 화면은 1명 검증, 수간호사 화면은 가설이다. 과거 인계의 액팅 열람도 범위 밖(team_id 는 현재 소속이라 과거 판정이 부정확).", color: RED },
  { n: "5", t: "향후 — 감사 로그 · 팀원 명단 · 전체 배정 변경 이력.", d: "access_log 는 이번 모델에 없다. 같은 근무 팀원이 \"오늘 우리 팀 차지가 누구인가\"를 보는 화면도 없다. 역할만 바뀐 변경은 이력에 남지 않는다.", color: MUTED },
], { notes: "한계를 먼저 말하면 질문이 줄어든다. 5번은 '향후 개선'으로 이어서 말한다." });

{
  const s = p.addSlide(); titleBar(s, "08", "마무리 — 이 설계를 어떻게 검증했는가", "설계 판단의 근거가 전부 기록으로 남아 있다");
  const cards = [
    { n: "1명", t: "현직 간호사 인터뷰", d: "국내 종합병원 병동 1곳\n병동마다 다르다는 것도 같은 인터뷰에서 확인 [C]" },
    { n: "26", t: "리뷰 라운드", d: "외부 AI 리뷰 + 자체 정합성 점검\n전제가 무너진 것 4개를 철회로 기록" },
    { n: "50/50", t: "동작 검증", d: "목 데이터 데모로 23행의 규칙을 전부 실행\n응답 필드와 OAS 의 차집합 0" },
  ];
  const cw = (W - 2 * M - 0.24 * 2) / 3;
  cards.forEach((c, i) => {
    const x = M + i * (cw + 0.24);
    s.addShape(p.ShapeType.roundRect, { x, y: 1.16, w: cw, h: 1.5, rectRadius: 0.04, fill: { color: PANEL }, line: { color: BORDER, width: 1 } });
    s.addText(c.n, { x: x + 0.16, y: 1.26, w: cw - 0.32, h: 0.46, fontFace: F, fontSize: 24, bold: true, color: TEAL, margin: 0, isTextBox: true });
    s.addText(c.t, { x: x + 0.16, y: 1.72, w: cw - 0.32, h: 0.26, fontFace: F, fontSize: 11.5, bold: true, color: INK, margin: 0, isTextBox: true });
    s.addText(c.d, { x: x + 0.16, y: 1.98, w: cw - 0.32, h: 0.6, fontFace: F, fontSize: 10, color: MUTED, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  });
  s.addShape(p.ShapeType.roundRect, { x: M, y: 2.84, w: W - 2 * M, h: 1.34, rectRadius: 0.04, fill: { color: SOFT }, line: { color: TEAL, width: 1 } });
  s.addText("\"국내 종합병원 병동 1곳의 운영 방식을 기준으로 설계했다. 현직 간호사 1명 인터뷰로 확인했으며,\n병동마다 운영이 다르다는 것도 같은 인터뷰에서 확인했다.\"",
    { x: M + 0.22, y: 2.94, w: W - 2 * M - 0.44, h: 0.52, fontFace: F, fontSize: 11.5, bold: true, color: INK, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  s.addText("\"공식 의무기록은 EMR 이 맡고, 교대 인계 메모는 그와 분리되어 관리된다.\n이번 서비스는 그 인계 메모 계층을 대상으로 작성 주체 · 수신 확인 · 변경 경로를 기록한다.\"",
    { x: M + 0.22, y: 3.46, w: W - 2 * M - 0.44, h: 0.6, fontFace: F, fontSize: 11.5, color: INK2, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  foot(s, "근무표가 끝나는 지점에서 시작한다 — 누가 인계를 맡았고, 누가 받아 확인했는지");
  s.addNotes("마지막 문장을 표지의 문장과 이어 닫는다.");
}

/* 마무리 */
{
  const s = p.addSlide(); s.background = { color: INK };
  s.addText("감사합니다", { x: M, y: 2.25, w: W - 2 * M, h: 0.7, fontFace: F, fontSize: 30, bold: true, color: WHITE, margin: 0, isTextBox: true });
  s.addText("10반 황재원   ·   너와나의인계고리", { x: M, y: 3.0, w: W - 2 * M, h: 0.3, fontFace: F, fontSize: 13, color: "9FBCC4", margin: 0, isTextBox: true });
}

const OUT = path.join(ROOT, "deliverables", "10반_황재원_너와나의인계고리-개요.pptx");
p.writeFile({ fileName: OUT }).then(() => console.log("done →", OUT));
