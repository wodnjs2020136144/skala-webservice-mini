/* 기술서 덱 생성기 — docs/06_기술서-원고.md 를 슬라이드로 옮긴다. **단일 출처**(31라운드 복귀).
 *
 *   node work/deck_build.js        (레포 루트에서 실행 · pptxgenjs 필요 · Pretendard 글꼴 설치 필요)
 *   → deliverables/…-개요.pptx     PowerPoint 가 그 파일을 열고 있으면 중단한다(28라운드 사고 방지)
 *   → 발표용은 tools/make_talk_deck.py 가 이 파일의 출력에서 장을 골라 만든다
 *
 * ⚠️ 이 파일이 만드는 pptx 는 **생성 시점의 판단을 굳힌다.**
 *    설계 판정이 바뀌면 여기부터 고치고 다시 돌린다 (26라운드 R152 의 교훈).
 *    **PowerPoint 에서 직접 고치지 않는다.** 고칠 문구는 여기 적는다(28라운드 편집 유실, 31라운드 복귀).
 *    철회된 표현은 인용(철회 슬라이드) 외에는 쓰지 않는다 —
 *    "출근해서야 역할을 안다" · care_assignment · "역할별 인계 템플릿" · "11개 엔티티" · "분기 A/B".
 *
 * 문구 규칙 (27·28라운드):
 *    1) 내부 용어를 슬라이드 제목에 쓰지 않는다   "읽기 3단" → "볼 수 있는 범위"
 *    2) 약어·코드는 뜻을 옆에 붙인다              422 → "보낸 내용이 모자라다(422)"
 *    3) 근거 등급 [A]~[D] 와 상태코드는 그대로 둔다 — 증거다
 *    4) 부제는 정보가 있을 때만. 자기 언급("정직하게 적습니다")은 쓰지 않는다
 *    5) 제목은 이름이다. 경구는 마지막 장 하나
 *    6) 표·카드는 개조식. 완결문은 한 장에 한두 문장, 설계 판단을 말하는 자리에만
 *    7) 기호 다이어트 — "—" 0, "→" 는 흐름 제목에만, "~니까요" 없음
 *
 * 디자인 (31라운드 · taste-skill 을 슬라이드로 옮긴 것 + impeccable):
 *    - 글꼴이 첫째 레버: Pretendard, 굵기로 위계 (제목 ExtraBold · 부제 Light · 본문 Regular · 라벨 Medium). 큰 제목은 자간을 좁힌다
 *    - 색은 크림 바탕 + 잉크 + 청록 하나 + 앰버 하나. 빨강·초록·파랑은 화면 말풍선 범례에만
 *    - 같은 레이아웃을 연달아 반복하지 않는다: 점 목록은 왼쪽 레일형, 표·캡처는 전폭형
 *    - 카드 테두리·채움은 도식(교대 그림 · 세 동작)에만. 나머지는 가로선으로만 나눈다
 *    - 섹션 이름은 SECTIONS 한 배열 — 목차와 바닥글이 같은 배열을 읽는다(라벨 불일치를 구조로 막는다)
 *
 * 화면 말풍선은 assets/anchors.json 의 좌표를 쓴다(촬영 때 같이 잰다 — tools/shoot_prelude.js).
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const A = (f) => path.join(ROOT, "assets", f);
const ANCHORS = JSON.parse(fs.readFileSync(A("anchors.json"), "utf8"));
const OUT = path.join(ROOT, "deliverables", "10반_황재원_너와나의인계고리-개요.pptx");

/* 열린 파일은 덮지 않는다 */
try {
  const open = execSync('osascript -e \'tell application "Microsoft PowerPoint" to return name of every presentation\'', { encoding: "utf8", timeout: 8000 });
  if (open.includes(path.basename(OUT))) { console.error("중단: PowerPoint 가 " + path.basename(OUT) + " 를 열고 있다. 닫고 다시 실행할 것"); process.exit(2); }
} catch (e) { /* PowerPoint 가 없거나 응답 없음 — 진행 */ }

/* ---------- 토큰 ---------- */
const PAPER = "FBF8F2", INK = "2A2926", INK2 = "55524B", MUTED = "8A867C", LINE = "E6E0D4";
const TEAL = "1F8A7E", AMBER = "B9772E", AMBER_SOFT = "F8EEDD", WHITE = "FFFFFF";
const K_API = "B3261E", K_NAV = "2E7D4F", K_EXC = "2F5FA8";   // 말풍선 범례 전용
const FX = "Pretendard ExtraBold", FSB = "Pretendard SemiBold", FM = "Pretendard Medium", F = "Pretendard", FL = "Pretendard Light";
const MONO = "Menlo";
const W = 10, H = 5.625, M = 0.6;
const TR = -0.6;   // 제목 자간(pt). 큰 제목은 좁힌다

const p = new pptxgen();
p.layout = "LAYOUT_16x9";
p.author = "황재원"; p.company = "SKALA 10반";
p.title = "너와 나의 인계고리 — 프로젝트 기술서";

/* 섹션 이름의 단일 출처 — 목차와 바닥글이 같이 읽는다 */
const SECTIONS = [["01", "무엇을 만들었나"], ["02", "무엇이 불편했고 어떻게 풀었나"], ["03", "누가 쓰고, 어디까지 보나"], ["04", "화면 흐름"],
                  ["05", "화면마다 도는 API"], ["06", "데이터를 나눈 방법"], ["07", "API 24개와 막는 규칙"], ["08", "고민한 것, 못 한 것"]];
const SEC = Object.fromEntries(SECTIONS);
let pageNo = 0;

/* ---------- 공통 ---------- */
function slide(sec, opt) {
  const s = p.addSlide(); s.background = { color: PAPER }; pageNo += 1;
  if (!(opt && opt.bare)) {
    s.addText(String(pageNo), { x: W - M - 0.5, y: H - 0.34, w: 0.5, h: 0.2, fontFace: FM, fontSize: 8, color: MUTED, align: "right", margin: 0, isTextBox: true });
    if (sec) s.addText(sec + "  " + SEC[sec], { x: M, y: H - 0.34, w: 5, h: 0.2, fontFace: FM, fontSize: 8, color: MUTED, margin: 0, isTextBox: true });
  }
  return s;
}
function hr(s, x, y, w, color, pt) { s.addShape(p.ShapeType.line, { x, y, w, h: 0, line: { color: color || LINE, width: pt || 0.5 } }); }
function titleBar(s, title, sub) {
  s.addText(title, { x: M, y: 0.32, w: W - 2 * M, h: 0.5, fontFace: FX, fontSize: 25, color: INK, charSpacing: TR, valign: "middle", margin: 0, isTextBox: true });
  if (sub) s.addText(sub, { x: M, y: 0.88, w: W - 2 * M, h: 0.26, fontFace: FL, fontSize: 12, color: INK2, valign: "middle", margin: 0, isTextBox: true });
}
function foot(s, t) {
  hr(s, M, H - 0.62, W - 2 * M, LINE, 0.5);
  s.addText(t, { x: M, y: H - 0.58, w: W - 2 * M, h: 0.22, fontFace: F, fontSize: 9, color: MUTED, valign: "middle", margin: 0, isTextBox: true });
}
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function ring(s, x, y, size) {   // "고리" 마크 — 겹친 원 두 개
  const o = size * 0.42;
  s.addShape(p.ShapeType.ellipse, { x, y, w: size, h: size, fill: { type: "none" }, line: { color: TEAL, width: 2.5 } });
  s.addShape(p.ShapeType.ellipse, { x: x + o, y, w: size, h: size, fill: { type: "none" }, line: { color: AMBER, width: 2.5 } });
}
const B_NONE = { type: "none" };
const rowBorder = (color, pt) => [B_NONE, B_NONE, { type: "solid", color: color || LINE, pt: pt || 0.5 }, B_NONE];

/* 전폭형: 표 */
function tableSlide(sec, title, sub, header, rows, colW, opt) {
  opt = opt || {};
  const s = slide(sec); titleBar(s, title, sub);
  const fsz = opt.fontSize || 10.5;
  const body = [header.map((t) => ({ text: t, options: { color: INK, fontFace: FM, fontSize: opt.headSize || 9.5, align: "left", border: rowBorder(TEAL, 1) } }))];
  rows.forEach((r, i) => body.push(r.map((c) => {
    const o = typeof c === "object" ? c : { text: c };
    return { text: o.text, options: Object.assign({ color: o.color || INK2, fontFace: o.mono ? MONO : (o.bold ? FSB : F), fontSize: o.fontSize || fsz, align: "left", border: rowBorder(LINE, i === rows.length - 1 ? 0 : 0.5) }, o.opts || {}) };
  })));
  const ty = opt.y || (sub ? 1.3 : 1.12);
  const avail = H - ty - (opt.foot ? 0.78 : 0.5);
  const bodyH = Math.min(opt.maxRowH || 0.8, (avail - 0.38) / rows.length);
  const rowH = [0.38].concat(rows.map(() => bodyH));
  s.addTable(body, { x: opt.x || M, y: ty, w: opt.w || (W - 2 * M), colW, rowH, fontFace: F, valign: "middle", margin: [6, 8, 6, 8], autoPage: false });
  if (opt.foot) foot(s, opt.foot);
  if (opt.notes) s.addNotes(opt.notes);
  return s;
}

/* 왼쪽 레일형: 점 목록. 제목이 왼쪽 열에, 항목이 오른쪽에 */
const RAIL = 2.55, RGAP = 0.35;
function railTitle(s, title, sub) {
  s.addText(title, { x: M, y: 0.32, w: RAIL, h: 1.3, fontFace: FX, fontSize: 22, color: INK, charSpacing: TR, valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.05 });
  if (sub) s.addText(sub, { x: M, y: 1.7, w: RAIL, h: 1.2, fontFace: FL, fontSize: 11.5, color: INK2, valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.25 });
}
function pointsSlide(sec, title, sub, items, opt) {
  opt = opt || {};
  const s = slide(sec); railTitle(s, title, sub);
  const x0 = M + RAIL + RGAP, cw = W - M - x0;
  const top = 0.4, bottom = H - (opt.foot ? 0.78 : 0.5);
  const h = (bottom - top) / items.length;
  items.forEach((it, i) => {
    const y = top + i * h;
    if (i) hr(s, x0, y, cw, LINE, 0.5);
    s.addText(it.n, { x: x0, y, w: 0.5, h, fontFace: FL, fontSize: 24, color: it.color || TEAL, valign: "middle", margin: 0, isTextBox: true });
    s.addText([{ text: it.t + "\n", options: { fontFace: FSB, color: INK, fontSize: 12 } }, { text: it.d, options: { fontFace: F, color: INK2, fontSize: 10 } }],
      { x: x0 + 0.55, y, w: cw - 0.55, h, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  });
  if (opt.foot) foot(s, opt.foot);
  if (opt.notes) s.addNotes(opt.notes);
  return s;
}

function bigImage(sec, title, sub, file, footTxt, notes) {
  const s = slide(sec); titleBar(s, title, sub);
  const { w: IW, h: IH } = pngSize(file);
  const ay = sub ? 1.26 : 1.08, ah = H - ay - (footTxt ? 0.74 : 0.46), aw = W - 2 * M;
  const ar = IW / IH; let h = ah, w = h * ar; if (w > aw) { w = aw; h = w / ar; }
  s.addImage({ path: file, x: M + (aw - w) / 2, y: ay + (ah - h) / 2, w, h });
  if (footTxt) foot(s, footTxt);
  if (notes) s.addNotes(notes);
  return s;
}

function rowImages(sec, title, sub, items, footTxt, notes) {
  const s = slide(sec); titleBar(s, title, sub);
  const n = items.length, gap = 0.24;
  const ay = sub ? 1.26 : 1.1, cap = 0.62, ah = H - ay - (footTxt ? 0.74 : 0.46) - cap;
  const cw = (W - 2 * M - gap * (n - 1)) / n;
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    const { w: IW, h: IH } = pngSize(it.file);
    const ar = IW / IH; let w = cw, h = w / ar; if (h > ah) { h = ah; w = h * ar; }
    s.addImage({ path: it.file, x: x + (cw - w) / 2, y: ay + (ah - h) / 2, w, h });
    s.addShape(p.ShapeType.rect, { x: x + (cw - w) / 2, y: ay + (ah - h) / 2, w, h, fill: { type: "none" }, line: { color: LINE, width: 0.75 } });
    s.addText([{ text: it.title + "\n", options: { fontFace: FSB, color: INK, fontSize: 10.5 } }, { text: it.note, options: { fontFace: F, color: INK2, fontSize: 9 } }],
      { x, y: ay + ah + 0.08, w: cw, h: cap - 0.08, align: "left", valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.1 });
  });
  if (footTxt) foot(s, footTxt);
  if (notes) s.addNotes(notes);
  return s;
}

/* ---------- ★ 화면 캡처 + API 말풍선 ---------- */
const KIND = { api: K_API, nav: K_NAV, exc: K_EXC };
function annotated(sec, title, sub, imgId, callouts, opt) {
  opt = opt || {};
  const s = slide(sec); titleBar(s, title, sub);
  const file = A(imgId + ".png"), an = ANCHORS[imgId];
  if (!an) throw new Error("anchors.json 에 " + imgId + " 가 없다 — tools/shots 로 다시 찍을 것");
  const ay = sub ? 1.26 : 1.1, ah = H - ay - (opt.foot ? 0.74 : 0.46);
  const colW = 3.3, gap = 0.22;
  const aw = W - 2 * M - colW - gap;
  const ar = an.imgW / an.imgH;
  let ih = ah, iw = ih * ar; if (iw > aw) { iw = aw; ih = iw / ar; }
  const ix = M + (aw - iw) / 2, iy = ay;
  s.addImage({ path: file, x: ix, y: iy, w: iw, h: ih });
  s.addShape(p.ShapeType.rect, { x: ix, y: iy, w: iw, h: ih, fill: { type: "none" }, line: { color: LINE, width: 0.75 } });
  const cssW = an.shotW, cssH = an.pageH;
  const byN = {}; an.marks.forEach((m) => { byN[m.n] = m; });
  callouts.forEach((c) => {
    const m = byN[c.n]; if (!m || !m.w) return;
    const bx = ix + (m.x / cssW) * iw, by = iy + (m.y / cssH) * ih, r = 0.105;
    s.addShape(p.ShapeType.ellipse, { x: bx - r, y: by - r, w: r * 2, h: r * 2, fill: { color: KIND[c.kind] || K_API }, line: { color: WHITE, width: 1 } });
    s.addText(String(c.n), { x: bx - r, y: by - r, w: r * 2, h: r * 2, fontFace: FSB, fontSize: 9, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  const cx = W - M - colW;
  const chh = ah / callouts.length;
  callouts.forEach((c, i) => {
    const cy = ay + i * chh, col = KIND[c.kind] || K_API;
    if (i) hr(s, cx, cy, colW, LINE, 0.5);
    s.addShape(p.ShapeType.ellipse, { x: cx, y: cy + 0.1, w: 0.21, h: 0.21, fill: { color: col } });
    s.addText(String(c.n), { x: cx, y: cy + 0.1, w: 0.21, h: 0.21, fontFace: FSB, fontSize: 8.5, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    const body = [];
    if (c.path) body.push({ text: c.path + "\n", options: { fontFace: MONO, fontSize: 8.5, color: col, bold: true } });
    body.push({ text: c.text, options: { fontFace: FM, fontSize: 9.5, color: INK } });
    if (c.note) body.push({ text: "\n" + c.note, options: { fontFace: F, fontSize: 8.5, color: MUTED } });
    s.addText(body, { x: cx + 0.32, y: cy + 0.04, w: colW - 0.34, h: chh - 0.08, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.1 });
  });
  if (opt.foot) foot(s, opt.foot);
  if (opt.notes) s.addNotes(opt.notes);
  return s;
}

/* ============================================================ 표지 */
{
  const s = slide(null, { bare: true });
  ring(s, M, 1.55, 0.7);
  s.addText("너와 나의 인계고리", { x: M, y: 2.5, w: W - 2 * M, h: 1.0, fontFace: FX, fontSize: 46, color: INK, charSpacing: -1.6, margin: 0, isTextBox: true });
  s.addText("간호사 교대근무 인계·배정 웹서비스", { x: M, y: 3.55, w: W - 2 * M, h: 0.3, fontFace: FL, fontSize: 14, color: INK2, margin: 0, isTextBox: true });
  s.addText("SKALA 4기 웹서비스 미니프로젝트  판교캠퍼스 10반 P345 황재원   2026. 9. 17.", { x: M, y: H - 0.72, w: W - 2 * M, h: 0.26, fontFace: FM, fontSize: 9.5, color: MUTED, margin: 0, isTextBox: true });
  s.addNotes("첫 마디: 근무표는 누가 나오는지까지만 말합니다. 그 다음 고리가 비어 있습니다.");
}

/* 30라운드 — 도메인 0 인 사람이 3장 안에 시스템을 읽게 하는 앞 2장 */
{
  const s = slide(null); titleBar(s, "교대할 때 무슨 일이 일어나나", "간호사는 하루 세 번 교대한다. 나가는 사람이 들어오는 사람에게 환자 상태를 넘긴다. 이걸 \"인계\"라고 한다");
  const y = 1.55, bh = 1.0, bw = 2.3, aw = W - 2 * M - 2 * bw - 0.5;
  const bx = (x, t, d) => {
    s.addShape(p.ShapeType.rect, { x, y, w: bw, h: bh, fill: { type: "none" }, line: { color: LINE, width: 0.75 } });
    s.addText([{ text: t + "\n", options: { fontFace: FSB, fontSize: 13, color: INK } }, { text: d, options: { fontFace: F, fontSize: 10, color: INK2 } }], { x: x + 0.1, y, w: bw - 0.2, h: bh, align: "center", valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  };
  bx(M, "밤 근무 간호사", "환자를 밤새 봤다");
  s.addShape(p.ShapeType.rightArrow, { x: M + bw + 0.25, y: y + bh / 2 - 0.16, w: aw, h: 0.32, fill: { color: TEAL }, line: { type: "none" } });
  s.addText("인계", { x: M + bw + 0.25, y: y - 0.04, w: aw, h: 0.3, fontFace: FSB, fontSize: 13, color: TEAL, align: "center", margin: 0, isTextBox: true });
  s.addText("환자 상태와 주의사항을 말로, 글로 넘긴다", { x: M + bw + 0.25, y: y + bh / 2 + 0.2, w: aw, h: 0.3, fontFace: F, fontSize: 10, color: INK2, align: "center", margin: 0, isTextBox: true });
  bx(W - M - bw, "아침 근무 간호사", "이제부터 이 환자를 본다");
  const rows = [["1", "넘겼다는 기록은 남는다. 받았다는 기록은 없다.", "나중에 \"들었다 / 못 들었다\"가 갈려도 확인할 데가 없다"],
                ["2", "누가 못 나오면, 수간호사가 표를 고치고 메신저로 다시 알린다.", "지금 배정이 무엇인지, 왜 바뀌었는지가 남지 않는다"]];
  rows.forEach((r, i) => {
    const py = 2.9 + i * 0.92; hr(s, M, py, W - 2 * M, LINE, 0.5);
    s.addText(r[0], { x: M, y: py + 0.1, w: 0.5, h: 0.7, fontFace: FL, fontSize: 24, color: AMBER, valign: "middle", margin: 0, isTextBox: true });
    s.addText([{ text: r[1] + "\n", options: { fontFace: FSB, fontSize: 12.5, color: INK } }, { text: r[2], options: { fontFace: F, fontSize: 10.5, color: INK2 } }], { x: M + 0.55, y: py + 0.1, w: W - 2 * M - 0.6, h: 0.7, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.15 });
  });
  foot(s, "한 팀의 책임 간호사를 \"차지\"라고 부른다. 인계는 차지가 쓰고 다음 근무의 차지가 받는다. 이 발표에 필요한 말은 이게 전부다 [C]");
  s.addNotes("도메인 모르는 사람 기준 첫 장. 교대·인계·차지 세 단어만 소개한다.");
}
{
  const s = slide(null); titleBar(s, "그래서 이 서비스는 세 가지를 한다", null);
  const steps = [["1", "정한다", "그날 누가 어느 환자의\n인계를 맡는지", "수간호사"], ["2", "넘긴다", "병동이 정한 필수 항목이\n비면 넘길 수 없다", "차지"], ["3", "확인한다", "받은 사람이 핵심을 자기 말로\n요약해야 '확인'이 된다", "다음 근무 차지"]];
  const gap = 0.3, y = 1.2, h = 2.0, w = (W - 2 * M - gap * 2) / 3;
  steps.forEach((st, i) => {
    const x = M + i * (w + gap);
    s.addShape(p.ShapeType.rect, { x, y, w, h, fill: { type: "none" }, line: { color: LINE, width: 0.75 } });
    s.addText(st[0], { x: x + 0.2, y: y + 0.1, w: 1, h: 0.6, fontFace: FL, fontSize: 34, color: TEAL, margin: 0, isTextBox: true });
    s.addText(st[1], { x: x + 0.2, y: y + 0.7, w: w - 0.4, h: 0.36, fontFace: FX, fontSize: 16, color: INK, charSpacing: -0.3, margin: 0, isTextBox: true });
    s.addText(st[2], { x: x + 0.2, y: y + 1.08, w: w - 0.4, h: 0.6, fontFace: F, fontSize: 10.5, color: INK2, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
    s.addText(st[3], { x: x + 0.2, y: y + 1.66, w: w - 0.4, h: 0.26, fontFace: FM, fontSize: 9, color: MUTED, margin: 0, isTextBox: true });
    if (i < 2) s.addShape(p.ShapeType.rightArrow, { x: x + w + 0.04, y: y + h / 2 - 0.1, w: gap - 0.08, h: 0.2, fill: { color: TEAL }, line: { type: "none" } });
  });
  const by = y + h + 0.3;
  s.addShape(p.ShapeType.rect, { x: M, y: by, w: W - 2 * M, h: 0.72, fill: { color: AMBER_SOFT }, line: { type: "none" } });
  s.addText([{ text: "누가 못 나오면 1로 돌아가 다시 정한다.  ", options: { fontFace: FSB, fontSize: 12, color: INK } }, { text: "바뀐 내용은 당사자 화면에 바로 뜨고, 왜 바꿨는지가 같이 남는다", options: { fontFace: F, fontSize: 10.5, color: INK2 } }], { x: M + 0.24, y: by, w: W - 2 * M - 0.48, h: 0.72, valign: "middle", margin: 0, isTextBox: true });
  foot(s, "하지 않는 것: 근무표 만들기 · 병원 전산(EMR) 연동 · 실제 환자정보 · 의학적 판단");
  s.addNotes("세 동사만 기억시키면 뒤 화면이 전부 이 셋 중 하나로 보인다.");
}

/* ============================================================ 01 */
{
  const s = slide("01"); titleBar(s, "무엇을 만들었나", null);
  const boxes = [
    { t: "누가", d: "교대로 일하는 병동의\n간호사와 수간호사" },
    { t: "언제", d: "교대할 때 인계를 주고받을 때\n누가 빠져서 배정을 다시 짤 때" },
    { t: "무엇이 불편했나", d: "인계를 누가 받았는지 남는 기록이 없다\n배정이 바뀌면 여기저기 다시 알려야 한다" },
  ];
  const bw = (W - 2 * M - 0.3 * 2) / 3;
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 0.3);
    hr(s, x, 1.14, bw, LINE, 0.5);
    s.addText(b.t, { x, y: 1.22, w: bw, h: 0.26, fontFace: FM, fontSize: 9.5, color: TEAL, margin: 0, isTextBox: true });
    s.addText(b.d, { x, y: 1.5, w: bw, h: 0.72, fontFace: F, fontSize: 11.5, color: INK, margin: 0, isTextBox: true, lineSpacingMultiple: 1.25 });
  });
  s.addShape(p.ShapeType.rect, { x: M, y: 2.55, w: 0.05, h: 1.02, fill: { color: TEAL } });
  s.addText("누가 무엇을 맡았고, 무엇을 주고받았는지가 남는다",
    { x: M + 0.24, y: 2.55, w: W - 2 * M - 0.3, h: 0.36, fontFace: FX, fontSize: 15, color: INK, charSpacing: -0.3, valign: "middle", margin: 0, isTextBox: true });
  s.addText("근무표는 오늘 누가 나오는지까지만 말합니다. 그 다음 칸, 누가 인계를 맡았고 누가 받아서 확인했는지는 비어 있습니다. 그 한 칸을 붙였습니다.",
    { x: M + 0.24, y: 2.93, w: W - 2 * M - 0.3, h: 0.62, fontFace: F, fontSize: 11, color: INK2, valign: "top", margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  s.addText([{ text: "하지 않은 것   ", options: { fontFace: FM, color: AMBER, fontSize: 10.5 } },
             { text: "근무표 자동 생성, 병원 전산(EMR) 연동, 실제 환자정보, 의학적 판단이나 추천, 교육·급여·알람", options: { fontFace: F, color: INK2, fontSize: 10.5 } }],
    { x: M, y: 3.85, w: W - 2 * M, h: 0.3, valign: "middle", margin: 0, isTextBox: true });
  s.addNotes("정의 한 문장을 그대로 읽고, '하지 않은 것'으로 범위를 먼저 닫는다.");
}

/* 목차 — SECTIONS 를 그대로 읽는다 */
{
  const s = slide(null); titleBar(s, "목차", null);
  SECTIONS.forEach((it, i) => {
    const col = i < 4 ? 0 : 1, row = i % 4;
    const x = M + col * (W - 2 * M) / 2 + (col ? 0.3 : 0), y = 1.3 + row * 0.86;
    s.addText(it[0], { x, y, w: 0.6, h: 0.5, fontFace: FL, fontSize: 20, color: TEAL, valign: "middle", margin: 0, isTextBox: true });
    s.addText(it[1], { x: x + 0.6, y, w: (W - 2 * M) / 2 - 1.0, h: 0.5, fontFace: FM, fontSize: 13, color: INK, valign: "middle", margin: 0, isTextBox: true });
    hr(s, x, y + 0.56, (W - 2 * M) / 2 - 0.4, LINE, 0.5);
  });
}

/* 용어 */
{
  const s = slide("01"); titleBar(s, "알아야 할 단어", null);
  const words = [
    { w: "듀티", d: "하루를 셋으로 나눈 근무. 데이(D), 이브닝(E), 나이트(N)." },
    { w: "차지", d: "그 근무조의 책임 간호사. 팀마다 한 명. 인계를 쓰고 받는 사람" },
    { w: "액팅", d: "같이 일하는 간호사. 인계를 옆에서 같이 듣지만 공식 작성자는 아니다" },
    { w: "인계", d: "교대할 때 다음 근무자에게 넘기는 환자 상태와 주의사항. 이 서비스의 주인공" },
    { w: "결원", d: "근무하기로 한 사람이 못 나오는 것. 누가 대신 설지, 인계는 누가 받을지 다시 정해야 한다" },
  ];
  const top = 1.14, hh = (H - top - 0.8) / 5;
  words.forEach((x, i) => {
    const y = top + i * hh;
    if (i) hr(s, M, y, W - 2 * M, LINE, 0.5);
    s.addText(x.w, { x: M, y, w: 1.4, h: hh, fontFace: FX, fontSize: 15, color: TEAL, charSpacing: -0.3, valign: "middle", margin: 0, isTextBox: true });
    s.addText(x.d, { x: M + 1.5, y, w: W - 2 * M - 1.5, h: hh, fontFace: F, fontSize: 11.5, color: INK, valign: "middle", margin: 0, isTextBox: true });
  });
  foot(s, "한 병동 기준. 병원마다, 병동마다 다르다는 것도 같은 인터뷰에서 들었다 [C]");
  s.addNotes("여기서 20초 쓰면 나머지 4분이 다 들린다. 차지와 액팅의 차이가 인계 권한의 근거.");
}

tableSlide("01", "비슷한 서비스는 없었나", null,
  ["찾아본 것", "결과", "근거"],
  [
    ["국내 비슷한 서비스 13건\n(국내 12, 일본 1)", { text: "근무 확정부터 그날 역할, 인계 작성, 결원 재배정까지\n하나로 이어 놓은 서비스는 찾지 못했다", bold: true, color: INK }, "[B] 제품 공식 페이지, 앱스토어 설명"],
    ["해외", "Epic \"Art\": 미국 병원 전산에 내장, 국내 병동은 선택 불가\nShiftSBAR: 개인이 혼자 쓰는 도구, 병동 단위 배정과 확인이 없다", "[B] Epic 공식 포스트, 제품 페이지"],
    ["법으로 막혀 있나", "아니다. 건강정보는 민감정보라 조건이 붙지만\n동의와 법령 근거가 있으면 다룰 수 있다", "[A] 개인정보보호법 제23조"],
    ["국내 병원 전산에\n인계 전용 화면이 있나", { text: "확인하지 못했다. \"없다\"는 뜻이 아니다", color: AMBER, bold: true }, "[D] 미검증"],
  ],
  [2.0, 5.0, 1.8],
  { foot: "비어 있는 이유는 법이 아니라 비용(동의 설계, 접근 통제, 병원 승인)이라고 본다. 개인 해석이라 등급을 안 붙였다",
    notes: "'없다'고 말하지 않는다. '조사 범위에서 찾지 못했다'." });

pointsSlide("01", "이 설계의 범위", "병동 한 곳, 간호사 한 분", [
  { n: "1", t: "병동 한 곳", d: "국내 종합병원 병동 한 곳의 운영 방식이 기준 [C]" },
  { n: "2", t: "현직 간호사 한 분", d: "\"간호사들이 다 그렇다\"가 아니라 한 분께 확인한 내용 [C]" },
  { n: "3", t: "병동마다 다르다", d: "차지만 하는 간호사를 따로 두는 병원도 있다고 한다. 그 차이는 이번 범위 밖 [C]", color: AMBER },
  { n: "4", t: "주장마다 출처 등급", d: "[A] 원문 확인, [B] 2차 출처, [C] 인터뷰로 확인, [D] 아직 검증 못 함. 등급이 없으면 내 판단" },
], { notes: "범위를 좁힌 걸 근거와 같이 말한다. 채점 기준이 정합성이라 감점이 아니다." });

/* ============================================================ 02 */
tableSlide("02", "불편했던 것, 푼 방법", null,
  ["누가", "불편", "이 서비스에서는", "기능"],
  [
    [{ text: "간호사\n(차지)", bold: true, color: INK },
     { text: "인계를 넘기긴 하는데 받은 사람이 제대로 들었는지\n남는 기록이 없다 [C]\n내용은 전산에 남는다. 없는 건 \"받았다\"는 기록\n들은 말: \"그날 차지가 듣는 게 당연한 구조\"" },
     "받은 사람이 핵심을 자기 말로 다시 적어야 확인 처리\n눈으로 읽은 것만으로는 확인이 아니다\n누가 언제 받았는지 남는다", { text: "F-04", bold: true, color: TEAL }],
    [{ text: "수간호사", bold: true, color: INK },
     { text: "누가 못 나오면 바뀐 내용을 여기저기 다시 알려야 하고\n지금 배정이 뭔지, 왜 바뀌었는지도 안 남는다 [C]\n엑셀을 고치고 메신저로 다시 공지한다 [D]" },
     "화면에서 바로 다시 배정하면 당사자 화면에 그대로 뜬다\n다시 공지할 필요가 없다\n바꾼 이유가 같이 남는다", { text: "F-05", bold: true, color: AMBER }],
  ],
  [0.85, 4.05, 3.2, 0.7],
  { fontSize: 11, maxRowH: 1.3, notes: "'기록이 없다'가 아니라 '받았다는 기록이 없다'. 내용은 남는다." });

tableSlide("02", "인터뷰 뒤에 뺀 것 네 가지", null,
  ["처음에 적었던 것", "실제로는", "그래서"],
  [
    [{ text: "\"출근해서야 자기 역할을 안다\"", color: AMBER }, { text: "월말 전에 팀장이 미리 정하고\n그 뒤에 간호사끼리 서로 바꾼다 [C]", bold: true, color: INK }, "불편 항목에서 뺌\n관련 기능은 기반 기능으로"],
    [{ text: "\"인계 내용이 기록되지 않는다\"", color: AMBER }, { text: "내용은 남는다\n안 남는 건 \"받았다\"는 기록 [C]", bold: true, color: INK }, "해결 대상을 '받은 기록'으로 좁힘"],
    [{ text: "\"역할마다 인계 항목이 달라야 한다\"", color: AMBER }, { text: "아니다. 인계는 차지가 받고\n액팅은 옆에서 같은 인계를 듣는다 [C]", bold: true, color: INK }, "항목을 병동 공통 한 벌로"],
    [{ text: "\"전산 기록 하나가 인계와 공식 기록을 겸한다\"", color: AMBER }, { text: "우리가 잘못 옮긴 말이었다\n인계장과 공식 기록은 따로 [C]", bold: true, color: INK }, "\"우리가 이중 입력을 만든다\"는\n전제가 사라짐"],
  ],
  [2.8, 3.4, 2.6],
  { notes: "전제가 무너진 걸 숨기지 않고 기록으로 남겼다고 말한다." });

/* ============================================================ 03 */
tableSlide("03", "누가 쓰나", "두 사람. 다른 병동 사람은 못 들어온다",
  ["쓰는 사람", "볼 수 있는 것", "하는 일"],
  [
    [{ text: "수간호사", bold: true, color: AMBER }, "자기가 맡은 병동 전체 [C]", "근무표 등록, 그날 역할과 인계 담당 정하기, 인계 항목 정하기\n결원 생기면 다시 배정, 바뀐 내역 보기"],
    [{ text: "간호사", bold: true, color: TEAL }, "내 근무와 역할, 우리 팀 환자\n내가 맡은 인계", "내 근무 확인. 차지면 인계 쓰기, 받고 확인하기\n액팅이면 우리 팀 인계 읽기. 내가 주고받은 인계 보기"],
    [{ text: "다른 병동 사람", bold: true, color: MUTED }, "아무것도", "막는다. \"없는 것처럼\"이 아니라 \"권한이 없다\"고 답한다(403)"],
  ],
  [1.5, 2.9, 4.4],
  { fontSize: 11.5, notes: "로그인 자체는 범위 밖. 병원 인증 시스템이 있다고 가정." });

tableSlide("03", "볼 수 있는 범위", "세 갈래. 권한이 자기 일을 막지 않게",
  ["", "볼 수 있는 것", "판단 기준"],
  [
    [{ text: "1", color: TEAL, opts: { fontFace: FL, fontSize: 18 } }, "수간호사는 병동 전체", "내 소속 병동이면 전부"],
    [{ text: "2", color: TEAL, opts: { fontFace: FL, fontSize: 18 } }, "내가 인계를 맡은 환자와 그 인계", "그 근무에서 나에게 배정된 입원 건"],
    [{ text: "3", color: TEAL, opts: { fontFace: FL, fontSize: 18 } }, { text: "같은 팀, 같은 시간에 일하는 사람의 인계", bold: true, color: INK }, "같은 병동·같은 날·같은 근무조, 같은 팀, 이미 넘어간 인계만\n작성 중인 것은 쓴 사람만"],
  ],
  [0.5, 3.4, 4.9],
  { fontSize: 11.5, foot: "쓰는 건 더 좁다. 인계를 쓰는 건 맡은 사람만, 확인은 받을 사람만. 결원으로 등록된 사람은 받을 수 없다",
    notes: "3이 없으면 옆에서 같이 듣는 액팅이 인계를 못 읽는다. 권한이 기능을 막은 실수를 두 번 했고 두 번 다 이 표에서 잡았다." });

tableSlide("03", "기능", null,
  ["ID", "하는 일", "누가", "화면", "막힐 때"],
  [
    ["F-01", "확정된 근무표 등록", "수간호사", "3", "권한 없음 403, 같은 사람 중복 409"],
    ["F-02", "그날 역할과 인계 담당 정하기", "수간호사", "4", "403, 409, 입력 모자람 422"],
    ["F-03", "내 근무·역할·바뀐 내용 확인", "간호사", "8", "남의 배정 조회는 403"],
    [{ text: "F-04", bold: true, color: TEAL }, { text: "인계 쓰기, 받은 사람이 요약해 확인", bold: true, color: INK }, "차지가 쓰고, 다음 차지가 확인\n액팅은 읽기", "9, 10, 11", "당사자 아님 403, 필수·요약 미입력 422\n재확인·퇴원 409"],
    [{ text: "F-05", bold: true, color: AMBER }, { text: "결원 등록, 다시 배정, 완료 확인과 이력", bold: true, color: INK }, "수간호사", "6, 7", "대체자 없이 완료 422, 재확인 409"],
    ["F-06", "병동 인계 항목 정하기 (F-04 가 쓰는 양식)", "수간호사", "5", "간호사가 고치려 하면 403"],
  ],
  [0.65, 3.3, 2.3, 0.85, 1.7],
  { fontSize: 10, foot: "F-04 가 첫 번째 불편, F-05 가 두 번째 불편. 나머지 넷은 그 둘이 서려면 있어야 하는 기반",
    notes: "Actor 가 다른 동작을 한 기능에 묶으면 권한 정의가 안 돼서 F-06 을 분리했다." });

/* ============================================================ 04 흐름도 */
bigImage("04", "화면 흐름", "로그인에서 두 갈래. 실선은 화면 이동, 점선은 데이터가 넘어가는 길",
  A("ui_flow.png"),
  "화면 11개가 전부 이 그림 안에 있다. 점선 네 개가 수간호사와 간호사를 잇는다",
  "[필수] UI 흐름도는 반드시 PDF 안에 있어야 한다. 점선 4개가 두 Actor 를 잇는 지점.");

bigImage("04", "수간호사 쪽", "근무표 등록 → 역할·담당 정하기 → 결원 재배정 → 바뀐 내역",
  A("ui_flow_1_manager.png"),
  "배정은 누르는 즉시 반영된다. 따로 게시하거나 승인받는 단계가 없다",
  "점선 3개가 간호사 화면으로 넘어간다.");

bigImage("04", "간호사 쪽", "내 근무 → 인계 쓰기 → 인계 받고 요약해서 확인",
  A("ui_flow_2_nurse.png"),
  "인계는 앞 근무 차지에서 다음 근무 차지로 흐른다. 같은 팀 액팅은 읽기만",
  "인계 전달만 서로 다른 사람 사이에서 일어난다. 그래서 '고리'.");

/* ============================================================ 05 화면 */
{
  const s = slide("05"); titleBar(s, "화면들을 읽는 법", null);
  const rows = [[K_API, "빨강", "API 가 호출되는 곳. 어떤 주소로 무엇을 하는지"],
                [K_NAV, "초록", "화면이 이동하는 곳. 이 버튼을 누르면 어디로 가는지"],
                [K_EXC, "파랑", "막히는 곳. 오류와 예외. 왜 막는지가 이 설계의 핵심"]];
  rows.forEach((r, i) => {
    const y = 1.3 + i * 1.0;
    if (i) hr(s, M, y, W - 2 * M, LINE, 0.5);
    s.addShape(p.ShapeType.ellipse, { x: M + 0.1, y: y + 0.33, w: 0.3, h: 0.3, fill: { color: r[0] } });
    s.addText(r[1], { x: M + 0.64, y, w: 0.8, h: 0.96, fontFace: FX, fontSize: 14, color: r[0], valign: "middle", margin: 0, isTextBox: true });
    s.addText(r[2], { x: M + 1.5, y, w: W - 2 * M - 1.6, h: 0.96, fontFace: F, fontSize: 12.5, color: INK, valign: "middle", margin: 0, isTextBox: true });
  });
  foot(s, "캡처는 전부 실제로 도는 데모에서 찍었다. 가상 데이터이고, 화면에 보이는 주소가 그대로 API 명세의 주소");
  s.addNotes("범례를 화면 파트 맨 앞에 두면 이후 6장이 다 읽힌다.");
}

annotated("05", "간호사 첫 화면", "내 근무, 우리 팀 환자, 받은 인계와 보낼 인계", "8_myshift_nurse", [
  { n: 1, kind: "api", path: "GET /me/shifts", text: "내 근무와 역할, 우리 팀 환자를 한 번에", note: "인계 담당이 없어도 근무와 역할은 보인다" },
  { n: 2, kind: "nav", path: "", text: "왼쪽은 앞 근무에서 나에게 온 인계", note: "'확인' 버튼은 내가 받을 사람일 때만" },
  { n: 3, kind: "nav", path: "", text: "오른쪽은 내가 다음 근무로 넘길 인계", note: "두 방향이 한 화면에" },
  { n: 4, kind: "nav", path: "", text: "인계 작성 화면으로", note: "액팅에게는 이 버튼이 없다. 읽기만" },
], { foot: "같은 팀, 같은 시간에 일하면 인계를 읽을 수 있다. '확인'은 그 환자를 맡은 차지만",
     notes: "두 방향이 한 화면에 보이는 게 '고리'의 그림." });

annotated("05", "인계 쓰기", "필수 항목이 비면 넘길 수 없다", "9_handover_write_nurse", [
  { n: 1, kind: "api", path: "POST /handovers", text: "작성을 시작하면 병동 양식을 그대로 복사", note: "나중에 양식이 바뀌어도 이미 쓴 인계는 안 바뀐다" },
  { n: 2, kind: "exc", path: "422 보낸 내용이 모자람", text: "필수 항목이 비어 있으면 넘길 수 없다", note: "어떤 항목이 비었는지 이름까지 알려준다" },
  { n: 3, kind: "api", path: "POST /handovers/{id}/send", text: "넘기면 '작성 중'에서 '전달됨'으로", note: "받을 사람은 서버가 고른다. 같은 환자의 다음 근무 담당" },
  { n: 4, kind: "api", path: "PATCH /handovers/{id}/items", text: "입력한 내용은 임시저장", note: "한 번 넘긴 뒤에는 못 고친다(409)" },
], { foot: "받을 사람을 요청에서 안 받는 이유: 받으면 아무 근무로나 인계를 보낼 수 있게 된다",
     notes: "필수 항목 검사는 칸이 비었는지만 본다. 내용의 성의는 안 본다. 한계 슬라이드에서 말한다." });

annotated("05", "인계 받기", "요약을 써야 확인이 된다", "10_handover_receive_nurse", [
  { n: 1, kind: "nav", path: "", text: "지금 상태는 '확인 대기'", note: "작성 중, 전달됨, 확인됨 순서로만 간다" },
  { n: 2, kind: "api", path: "PATCH /handovers/{id}/receipt", text: "받은 사람이 자기 말로 쓴 요약이 여기 저장", note: "이 칸이 이 서비스의 핵심" },
  { n: 3, kind: "api", path: "POST /…/receipt/confirmation", text: "확인 처리. 이때 '확인됨'이 된다", note: "보낸 사람 화면에 이 요약이 되돌아간다" },
  { n: 4, kind: "exc", path: "422 · 403", text: "요약이 없으면 확인되지 않는다(422)", note: "그 환자를 맡은 사람이 아니면 403" },
], { foot: "화면에 들어오는 순간 '열어봤다'는 시각이 따로 남는다. 조회와 분리했다. 수간호사가 봐도 수신 기록이 되면 안 되니까",
     notes: "단순 '읽음' 체크와 receiver_summary 를 가르는 지점. 첫 번째 불편의 해결." });

annotated("05", "결원 재배정", "사람이 판단하는 자리와 시스템이 막는 자리를 나눴다", "6_reassign_manager", [
  { n: 1, kind: "api", path: "POST /…/absence", text: "결원 등록. 사유를 사람이 쓰는 유일한 자리", note: "나머지 세 기록은 이 사유를 그대로 복사" },
  { n: 2, kind: "api", path: "POST /…/substitute", text: "누가 대신 설지 정한다", note: "체크해 두면 결원자의 역할(차지)도 같이 넘어간다" },
  { n: 3, kind: "api", path: "POST /…/handover-transfer", text: "맡고 있던 인계를 넘긴다", note: "원래 인계는 안 지운다. '대체됨'으로 두고 새 인계를 발행" },
  { n: 4, kind: "exc", path: "422 보낸 내용이 모자람", text: "대체자 없이 '완료'라고 적을 수 없다", note: "완료는 자동 판정이 아니라 사람의 확인 기록" },
], { foot: "아래 목록은 \"이 사람 이름으로 남은 인계 N건\". 시스템이 막지 않기로 한 것을 화면이 대신 보여준다",
     notes: "이관하지 않는 게 정상인 경우가 있다(그 사이 퇴원 등). 그래서 API 로 막지 않고 사람이 보고 판단." });

annotated("05", "수간호사 첫 화면", "숫자를 누르면 그 숫자의 근거로 내려간다", "2_dashboard_manager", [
  { n: 1, kind: "nav", path: "GET /wards/{id}/shift-assignments", text: "오늘 누가 나오는지. 누르면 명단이 펼쳐진다", note: "근무 등록 화면과 같은 API 를 다시 쓴다" },
  { n: 2, kind: "nav", path: "같은 응답을 역할별로 묶음", text: "누가 무엇을 맡았는지, 역할별로", note: "이걸 위해 새 API 를 만들지 않았다" },
  { n: 3, kind: "api", path: "GET /wards/{id}/handovers?status=SENT", text: "아직 확인 안 된 인계. 누르면 어느 건인지", note: "숫자와 목록이 같은 조건" },
  { n: 4, kind: "exc", path: "", text: "결원 목록은 접지 않고 항상 보인다", note: "접히면 '재배정 필요'를 놓친다. 타일을 누르면 그 자리로 내려간다" },
], { foot: "\"인계 미작성 N건\"은 안 넣었다. 병원 전산과 연결이 없어서 \"썼어야 했는데 안 쓴 건\"을 셀 방법이 없다",
     notes: "숫자를 보여주면 그 근거로 내려갈 수 있어야 한다. 결원만 예외인 이유를 꼭 말한다." });

annotated("05", "역할과 인계 담당 정하기", "환자는 팀이 같이 본다. 여기서 정하는 건 인계를 맡을 사람", "4_assignment_board_manager", [
  { n: 1, kind: "api", path: "PATCH /shift-assignments/{id}", text: "역할은 고르는 즉시 저장", note: "저장 버튼이 따로 없다" },
  { n: 2, kind: "api", path: "POST /…/handover-assignments", text: "이 근무에서 누가 어느 입원 건의 인계를 맡을지", note: "기본값은 그 팀의 차지" },
  { n: 3, kind: "nav", path: "", text: "담당을 더한다", note: "역할로 강제하지 않는다. 차지가 빠지면 누가 올라가는지 확인 못 해서" },
], { foot: "'담당 환자 배정'이 아니라 '인계 담당 지정'. 환자는 팀이 같이 본다",
     notes: "이름을 바꾼 이유는 데이터 파트에서 이어 말한다." });

rowImages("05", "나머지 화면 1", null,
  [
    { file: A("1_login_main.png"), title: "로그인", note: "누구로 들어갈지 고르는 데모용 화면. 실제 인증은 병원 시스템 몫" },
    { file: A("3_shift_register_manager.png"), title: "근무표 등록", note: "역할은 여기서 안 정한다. 다른 병동 지원 근무도 등록된다" },
    { file: A("5_handover_template_manager.png"), title: "인계 항목 정하기", note: "역할 선택이 없다. 고쳐도 이미 쓴 인계는 안 바뀐다" },
  ],
  "인계 항목을 병동 하나로 통일한 건 인터뷰 결과. 받는 사람이 늘 차지라서 역할별로 나눌 이유가 없었다");

rowImages("05", "나머지 화면 2", null,
  [
    { file: A("7_change_history_manager.png"), title: "바뀐 내역", note: "사유는 한 번만 쓰고 나머지는 서버가 복사한다" },
    { file: A("11_handover_history_nurse.png"), title: "내 인계 이력", note: "'대체됨'은 읽기 전용, 미확인 수에서 빠진다" },
    { file: A("8_myshift_nurse_states.png"), title: "비어 있을 때", note: "빈 화면 대신 다음에 할 일을 적는다" },
  ],
  "빈 화면을 설계했다는 것 자체가 권한을 세 갈래로 나눈 이유다. 인계 담당이 없어도 근무는 보여야 한다");

/* ============================================================ 06 데이터 모델 */
{
  const s = slide("06"); titleBar(s, "핵심 데이터", "인계 한 건이 만들어져 확인되기까지 거치는 표");
  const { w: IW, h: IH } = pngSize(A("erd_core.png"));
  const ay = 1.26, ah = H - ay - 0.5;
  const ar = IW / IH; const h = ah, w = h * ar;
  s.addImage({ path: A("erd_core.png"), x: M, y: ay, w, h });
  const cx = M + w + 0.32, cw = W - M - cx;
  const cards = [
    { t: "근무, 담당, 인계", d: "\"그 근무에서 이 환자의 인계를 맡는다\"를 한 줄로. 사람이 아니라 근무에 붙는다" },
    { t: "받았다는 기록을 따로", d: "열어본 시각, 자기 말로 쓴 요약, 확인한 시각. 이 셋이 첫 번째 불편의 답" },
    { t: "항목은 복사본", d: "병동 양식을 고쳐도 이미 쓴 인계는 그대로. 지난 기록이 나중에 바뀌면 안 된다" },
    { t: "지우지 않는다", d: "담당이 바뀌면 옛 줄을 '이관됨'으로 남기고 새 줄을 만든다. 누가 언제 맡았는지가 기록" },
  ];
  const chh = ah / 4;
  cards.forEach((c, i) => {
    const y = ay + i * chh;
    if (i) hr(s, cx, y, cw, LINE, 0.5);
    s.addText([{ text: c.t + "\n", options: { fontFace: FSB, color: INK, fontSize: 11.5 } }, { text: c.d, options: { fontFace: F, color: INK2, fontSize: 9.5 } }],
      { x: cx, y: y + 0.04, w: cw, h: chh - 0.08, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.12 });
  });
  foot(s, "PK·FK 와 관계(1:N, 1:1)는 그림에, 속성 타입·unique·not null 같은 제약조건은 DBML 에. 수신 기록은 인계당 1건(unique)");
  s.addNotes("이 6개만 따라가면 인계 한 건의 일생이 설명된다. 나머지 6개는 병동, 팀, 사용자, 역할, 양식, 이력.");
}

bigImage("06", "전체 12개", "자세히 읽는 그림이 아니라 얼마나 나뉘어 있는지 보는 지도",
  A("erd_full.png"),
  "12 테이블, 7 Enum, 외래키 23. 여러 대 여러로 얽히는 관계는 '인계 담당' 하나로 풀었다",
  "권장 6~9개보다 많다. 팀, 인계 담당, 양식 항목이 각각 이유를 갖는다. 이유를 말할 수 있으면 개수는 문제가 아니다.");

pointsSlide("06", "표 이름을 바꾼 이야기", "\"환자의 담당 간호사\"라는 표가 있었다. 지금은 없다", [
  { n: "1", t: "처음엔", d: "환자 한 명에 담당 간호사 한 명을 붙이는 표를 만들었다", color: MUTED },
  { n: "2", t: "인터뷰에서 뒤집혔다 [C]", d: "환자는 팀이 같이 본다. \"이 환자는 이 간호사 담당\"이라고 정하는 행위 자체가 현장에 없었다", color: AMBER },
  { n: "3", t: "뜻을 바꿨다", d: "지금 이 표는 \"그 근무에서 이 입원 건의 인계를 맡을 사람\". 줄 수가 (팀 인원 × 환자 수)에서 (환자 수)로 줄었다" },
  { n: "4", t: "팀이 보는 환자 범위는 다른 곳에", d: "입원 건에 팀을 붙였다. 그래야 옆에서 같이 듣는 액팅도 우리 팀 인계를 읽을 수 있다" },
  { n: "5", t: "역할로 강제하지 않았다", d: "차지가 빠지면 누가 올라가는지 확인 못 했다. 확인 못 한 운영 방식을 DB 가 금지하면 안 된다고 봤다" },
], { foot: "이름만 바꾼 게 아니다. 데이터 모델, 기능표, 화면 문구, API 응답 필드 일곱 곳이 같이 움직였다",
     notes: "'FK 이름만 바꾸는 1시간 작업'으로 계산하면 안 된다는 걸 11라운드에서 배웠다." });

pointsSlide("06", "지우지 않고 남긴다", null, [
  { n: "1", t: "담당이 바뀌어도 옛 줄을 안 지운다", d: "'이관됨'으로 표시하고 새 줄을 만든다. 그날 누가 맡았는지가 기록이라서" },
  { n: "2", t: "인계 항목은 복사본", d: "수간호사가 병동 양식을 고쳐도 이미 쓴 인계의 항목은 그대로" },
  { n: "3", t: "받을 사람이 못 나오게 되면", d: "그 인계를 '대체됨'으로 두고 새 담당에게 후속 인계를 같은 순간에 발행. 후속이 안 만들어지면 아예 실패시킨다. 인계가 끊긴 채 끝나면 안 된다", color: AMBER },
  { n: "4", t: "확인까지 끝난 인계는 안 건드린다", d: "확인된 인계를 뒤늦게 '대체됨'으로 바꾸려 하면 막는다(409). 그 뒤의 담당 변경은 사고가 아니라 정상 교대" },
  { n: "5", t: "대가도 같이 적었다", d: "남긴 줄도 여전히 유효한 번호라서, 읽을 때·쓸 때·고를 때 \"이게 지금 것인가\"를 매번 확인해야 한다" },
], { notes: "남기는 설계의 비용을 같이 적는 게 설계 고민의 증거." });

tableSlide("06", "결원 기록은 두 층", "근무 자리가 빈 것과, 맡고 있던 인계가 넘어간 것은 다른 일",
  ["기록", "빠진 사람", "대신 선 사람", "넘긴 인계", "받은 인계", "언제"],
  [
    ["결원 등록", { text: "필수", bold: true, color: INK }, "", "", "", "못 나온다고 등록할 때. 사유를 쓰는 유일한 자리"],
    ["대체자 배정", { text: "필수", bold: true, color: INK }, { text: "필수", bold: true, color: INK }, "", "", "누가 대신 설지 정할 때 (사유는 서버가 복사)"],
    ["인계 담당 이관", { text: "필수", bold: true, color: INK }, { text: "필수", bold: true, color: INK }, { text: "필수", bold: true, color: INK }, { text: "필수", bold: true, color: INK }, "맡고 있던 인계를 넘길 때. 입원 건마다 한 줄"],
    ["대체 완료 확인", { text: "필수", bold: true, color: INK }, "", "", "", "수간호사가 \"메워졌다\"고 확인할 때"],
  ],
  [1.5, 0.85, 0.9, 0.85, 0.85, 3.85],
  { fontSize: 10, foot: "액팅이 빠지면 넘길 인계가 없다(환자는 팀이 같이 보니까). 세 줄만 남는다. 기록 종류 하나가 나머지 네 칸의 유효 조합을 정한다",
    notes: "한 컬럼으로 여러 테이블을 가리키는 방식을 안 쓴 이유: 외래키 제약을 걸 수 없다." });

/* ============================================================ 07 API */
bigImage("07", "API 명세", "24개, 주소 21개, 명세 오류 0",
  A("swagger_full.png"),
  "공통 응답 봉투·오류 형식·스키마 24개를 components 에 두고 $ref 로 164회 재사용했다. 로그인·인증은 병원 시스템 몫이라 명세에 없다",
  "화면 11개에서 일어나는 동작 25가지를 먼저 세고, 겹치는 것을 빼 24개가 됐다.");

{
  const s = slide("07"); titleBar(s, "API 24개", "화면에서 보이던 주소가 그대로 명세의 주소");
  const left = [
    ["3", "GET  /wards/{id}/shift-assignments", "근무 목록"],
    ["3", "POST /wards/{id}/shift-assignments", "근무 등록"],
    ["4", "GET  /wards/{id}/assignment-board", "배정 보드"],
    ["4", "PATCH /shift-assignments/{id}", "역할 지정"],
    ["4", "POST /…/handover-assignments", "인계 담당 지정"],
    ["5", "GET  /wards/{id}/handover-template-items", "항목 조회"],
    ["5", "PUT  /wards/{id}/handover-template-items", "항목 교체"],
    ["6", "GET  /…/reassignment-context", "재배정 진입"],
    ["6", "POST /…/absence", "결원 등록"],
    ["6", "POST /…/substitute", "대체자 배정"],
    ["6", "POST /…/handover-transfer", "인계 담당 이관"],
    ["6", "POST /…/coverage-confirmation", "대체 완료 확인"],
  ];
  const right = [
    ["7", "GET  /wards/{id}/reassignment-logs", "바뀐 내역"],
    ["8", "GET  /me/shifts", "내 근무, 우리 팀 환자"],
    ["11", "GET  /me/handovers", "내 인계 이력"],
    ["9", "POST /handovers", "인계 작성 시작"],
    ["9·10", "GET  /handovers/{id}", "인계 상세"],
    ["9", "PATCH /handovers/{id}/items", "임시저장"],
    ["9", "POST /handovers/{id}/send", "인계 넘기기"],
    ["10", "POST /handovers/{id}/receipt", "열람 기록"],
    ["10", "PATCH /handovers/{id}/receipt", "요약 저장"],
    ["10", "POST /…/receipt/confirmation", "확인 처리"],
    ["2", "GET  /wards/{id}/handovers", "미확인 목록"],
    ["2", "GET  /wards/{id}/dashboard", "대시보드 집계"],
  ];
  [left, right].forEach((set, k) => {
    const cw = (W - 2 * M) / 2 - 0.12;
    const x = M + k * (cw + 0.24);
    const hd = (t) => ({ text: t, options: { color: INK, fontFace: FM, fontSize: 8.5, border: rowBorder(TEAL, 1) } });
    const body = [[hd("화면"), hd("메서드와 주소"), hd("무엇을")]];
    set.forEach((r, i) => {
      const bd = rowBorder(LINE, i === set.length - 1 ? 0 : 0.5);
      body.push([
        { text: r[0], options: { color: MUTED, fontFace: FM, fontSize: 8, align: "center", border: bd } },
        { text: r[1], options: { color: INK, fontSize: 8, fontFace: MONO, border: bd } },
        { text: r[2], options: { color: INK2, fontFace: F, fontSize: 8, border: bd } }]);
    });
    s.addTable(body, { x, y: 1.28, w: cw, colW: [0.42, cw - 1.57, 1.15], fontFace: F, valign: "middle", margin: [3, 4, 3, 4] });
  });
  foot(s, "화면 11개의 동작 25가지를 먼저 세고, 겹치는 것(역할 지정은 배정 화면과 재배정 화면이 같이 쓴다)을 빼서 24개");
  s.addNotes("배점 20점 파트. '화면에서 세어서 만들었다'는 순서를 꼭 말한다.");
}

{
  const s = slide("07");
  titleBar(s, "일부러 요청에서 안 받는 값", "Path·Query·Body 중, 화면이 정하게 두면 깨지는 것들");
  const rows = [
    ["인계를 받을 사람", "화면이 정하게 두면 아무 근무로나 인계를 보낼 수 있다\n같은 환자의 다음 근무 담당을 서버가 고른다. 없으면 막는다(422)"],
    ["결원 사유", "사람이 쓰는 자리는 결원 등록 하나뿐. 나머지 기록은 복사\n사유가 서로 달라지면 한 사건의 이력을 이어서 읽을 수 없다"],
    ["화면 버튼 판정", "쓰기, 확인, 읽기 중 무엇을 보여줄지를 서버가 정해서 내려준다\n화면마다 따로 판단하면 규칙이 흩어진다"],
  ];
  const hd = (t) => ({ text: t, options: { color: INK, fontFace: FM, fontSize: 9.5, border: rowBorder(TEAL, 1) } });
  const body = [[hd("값"), hd("왜 서버가 정하나")]];
  rows.forEach((r, i) => {
    const bd = rowBorder(LINE, i === rows.length - 1 ? 0 : 0.5);
    body.push([
      { text: r[0], options: { color: INK, fontFace: FSB, fontSize: 10.5, border: bd } },
      { text: r[1], options: { color: INK2, fontFace: F, fontSize: 10.5, border: bd } }]);
  });
  s.addTable(body, { x: M, y: 1.28, w: 5.5, colW: [1.5, 4.0], rowH: [0.38, 0.85, 0.85, 0.85], fontFace: F, valign: "middle", margin: [6, 8, 6, 8] });
  const sz = pngSize(A("swagger_handover.png"));
  const iw = 3.0, ih = Math.min(iw / (sz.w / sz.h), 2.9);
  s.addImage({ path: A("swagger_handover.png"), x: W - M - iw, y: 1.28, w: iw, h: ih });
  s.addShape(p.ShapeType.rect, { x: W - M - iw, y: 1.28, w: iw, h: ih, fill: { type: "none" }, line: { color: LINE, width: 0.75 } });
  s.addText("인계 작성 요청. 받을 사람 칸이 없다", { x: W - M - iw, y: 1.28 + ih + 0.08, w: iw, h: 0.28, fontFace: F, fontSize: 9.5, color: MUTED, margin: 0, isTextBox: true });
  foot(s, "화면이 요청에 넣는 번호는 반드시 어떤 조회 API 가 돌려준 값이어야 한다. 이 규칙이 없어 생긴 구멍을 검증 단계에서 찾았다");
  s.addNotes("서버가 정하는 건 편의가 아니라 규칙을 한 곳에 두는 것.");
}

tableSlide("07", "막을 때 주는 답", "막는 이유가 다르면 답도 달라야 한다",
  ["답", "뜻", "이 서비스에서는"],
  [
    [{ text: "401", color: INK, opts: { fontFace: FL, fontSize: 18 } }, "로그인 안 됨", "모든 요청의 기본"],
    [{ text: "403", color: AMBER, opts: { fontFace: FL, fontSize: 18 } }, "있긴 한데 당신은 못 본다", "다른 병동, 내 인계가 아님, 액팅이 쓰려고 할 때\n결원으로 등록된 사람이 받으려 할 때"],
    [{ text: "404", color: INK, opts: { fontFace: FL, fontSize: 18 } }, "그런 건 없다", "없는 번호. 다른 병동을 404 로 숨기지 않았다. 둘을 섞지 않는다"],
    [{ text: "409", color: TEAL, opts: { fontFace: FL, fontSize: 18 } }, { text: "지금 상태에서는 그 일을 할 수 없다", bold: true, color: INK }, "이미 확인된 인계를 또 확인, 대체된 인계를 고치기\n퇴원한 환자에게 새 인계, 같은 사람을 같은 근무에 두 번"],
    [{ text: "422", color: TEAL, opts: { fontFace: FL, fontSize: 18 } }, { text: "보낸 내용이 모자라다", bold: true, color: INK }, "필수 항목이 비었음, 요약을 안 썼음\n대체자 없이 완료 확인, 다음 근무 담당이 아직 없음"],
  ],
  [0.8, 2.5, 5.5],
  { foot: "형식이 깨진 요청(400)은 프레임워크 기본 처리이고, 명세는 뜻이 모자란 요청을 422 로 통일했다. 인계 상태는 작성 중, 전달됨, 확인됨 순서로만 간다",
    notes: "409 는 '지금 상태에서 그 전이는 안 된다', 422 는 '보낸 내용이 모자라다'. 섞으면 화면이 뭘 고쳐야 할지 모른다." });

/* ============================================================ 08 */
pointsSlide("08", "고민했던 것", null, [
  { n: "1", t: "대시보드만 화면 전용 API", d: "네 군데 데이터를 합친다. 나누면 화면이 네 번 요청하고, 세는 규칙이 화면 쪽으로 흩어진다" },
  { n: "2", t: "펼쳐 보는 목록은 기존 API 를 다시 쓴다", d: "명단은 근무 조회가 이미 돌려주는 값. 또 만들면 같은 데이터가 두 곳에 정의된다" },
  { n: "3", t: "열어본 기록은 조회와 따로", d: "조회에 붙이면 수간호사나 액팅이 봐도 '받았다'가 된다. 그러면 확인의 뜻이 깨진다" },
  { n: "4", t: "남은 인계는 시스템이 막지 않는다", d: "안 넘기는 게 정상인 경우가 있다(그 사이 퇴원 등). 대신 화면이 \"남은 N건\"을 보여주고 사람이 판단", color: AMBER },
  { n: "5", t: "다른 병동은 403", d: "404 로 숨기는 게 더 방어적이지만, 권한 경계를 분명히 드러내는 쪽을 골랐다", color: AMBER },
], { notes: "버린 안과 그 이유를 적는 게 채택안만 적는 것보다 강하다." });

pointsSlide("08", "못 한 것", null, [
  { n: "1", t: "병원 전산(EMR)과 연결이 없다", d: "공식 의무기록은 병원 전산이 맡고, 이 설계는 인계 메모만. 실제로 대체되는지는 아직 확인 전이라 같이 쓰면 두 번 입력하게 된다", color: AMBER },
  { n: "2", t: "요약을 성의 있게 썼는지는 못 본다", d: "칸이 비었는지만 검사. 한 글자만 적어도 '확인됨'이 된다. 남기는 건 \"누가 언제 자기 말로 적었는가\"까지", color: AMBER },
  { n: "3", t: "차지가 인계를 안 써도 못 막는다", d: "액팅이 \"이건 적어 주세요\"라고 한 걸 반영했는지 이력으로 남기는 건 범위 밖", color: AMBER },
  { n: "4", t: "확인해 준 분이 한 명", d: "간호사 화면은 한 분께 확인받았고, 수간호사 화면은 아직 가설", color: AMBER },
  { n: "5", t: "앞으로", d: "질문과 답변(참여자가 가장 먼저 요청한 것), 접근 기록, 팀원 명단, 역할 교환 이력. 누가 뭘 열어봤는지 남기는 기록이 없고, 같은 근무 팀원이 \"오늘 우리 팀 차지가 누구인지\" 보는 화면도 없다", color: MUTED },
], { notes: "한계를 먼저 말하면 질문이 줄어든다." });

/* 29라운드 — 2일차 사용자 세션 */
pointsSlide("08", "써 본 사람의 말", "현직 간호사 1명이 데모를 직접 써 봤다. 대면, 편의표본, 과제 형식은 아님", [
  { n: "1", t: "화면은 설명 없이 읽혔다", d: "\"한눈에 인계를 확인할 수 있어서 좋았다\" [C]. 간호사 화면 = 확인 1명. 수간호사 화면은 여전히 가설" },
  { n: "2", t: "현장 규칙 세 개가 설계와 맞았다 [C]", d: "인계는 차지가 쓰고 액팅은 건드리지 않는다. 작성한 본인만, 넘기기 전까지만 고친다, 수간호사도 예외 없음 → 우리 403·409 그대로. 지운 기록이 문제 된 적이 있다(차지가 \"필요 없겠다\" 싶어 지운 기록이 나중에 중요했다) → 우리 설계엔 지우는 동작이 없고 지난 인계는 남는다" },
  { n: "3", t: "설계와 다른 점 하나", d: "현장은 같은 병동이면 인계 열람에 권한이 없다. 우리는 같은 팀·같은 근무로 좁혔다. 넓히는 건 판정 조건 한 줄이고 데이터 구조는 그대로. 보완으로 둔다", color: AMBER },
  { n: "4", t: "이중 작성은 지금도 있다", d: "EMR 에 적은 걸 카덱스에 또 적는 건 당연한 일로 여긴다. \"카덱스 대신 통합적으로 작용한다면 쓰겠다\". 이중 입력 우려는 풀렸고, 대체는 \"통합\"이 조건인 긍정" },
  { n: "5", t: "가장 먼저 요청한 것", d: "인계해 준 사람에게 질문을 보내고, 알림이 가고, 답이 돌아오는 것. 데이터 모델에 \"③ closed-loop, 범위 밖\"으로 적어 둔 그 자리. 다음 순서 1번" },
], { foot: "참여자는 이렇게 말했다. \"간호사들은 이렇다\"가 아니다",
     notes: "과제 형식은 안 했고 자유롭게 써 보게 했다. 정량 기록은 없다. V1 답과 인계 기록 규칙 3개가 여기서 왔다." });

tableSlide("08", "그 다음에 할 수 있는 것", "요청 14건을 우리 데이터 기준으로 나누면",
  ["묶음", "요청", "왜 이 묶음인가"],
  [
    [{ text: "지금 데이터에\n바로 붙는다", bold: true, color: TEAL }, "질문과 답변 (인계 1건에 스레드로)\n의사 보고 양식 SBAR (인계 항목과 같은 구조, 양식 한 벌 더)", "테이블 한두 개 추가로 끝난다"],
    [{ text: "병원 전산(EMR)\n연동이 먼저", bold: true, color: AMBER }, "처방 누락 잡기 · 처치(주사 등) 알람 · 약 소진일과 연고 유효기간 계산 · 식이 신청 연동", "처방과 투약 데이터가 우리에게 없다"],
    [{ text: "장비 연동이 먼저", bold: true, color: AMBER }, "호출벨 3회 이상이면 응급 알림 · 활력징후 관제", "디바이스가 있어야 한다"],
    [{ text: "다른 문제", bold: true, color: MUTED }, "근무표 자동 생성(처음부터 범위 밖) · 원무과 ADL 입력 · AI 신환 리포트 · 퇴원 설문", "우리가 푼 문제(인계와 결원)와 다른 문제"],
  ],
  [2.0, 4.4, 2.4],
  { foot: "14건 중 지금 모델에 바로 붙는 건 2건. 나머지는 연동이 먼저다. 그래서 이번 범위를 안 넓혔다",
    notes: "요청을 기능 목록이 아니라 '우리 데이터로 되는가'로 나눈 것이 정합성의 연장이다. 하나도 구현하지 않았다." });

{
  const s = slide("08"); titleBar(s, "어떻게 확인했나", null);
  const cards = [
    { n: "1명", t: "인터뷰 1회 + 대면 세션 1회", d: "국내 종합병원 병동 한 곳\n데모를 직접 써 보게 했다 [C]" },
    { n: "31", t: "리뷰 라운드", d: "외부 AI 리뷰와 자체 점검\n사실이 아닌 걸로 밝혀진 가정 네 개를 기록으로" },
    { n: "50/50", t: "실제로 돌려봄", d: "가상 데이터 데모로 규칙을 전부 실행\n화면이 받는 값과 명세가 어긋나는 곳 0" },
  ];
  const cw = (W - 2 * M - 0.3 * 2) / 3;
  cards.forEach((c, i) => {
    const x = M + i * (cw + 0.3);
    hr(s, x, 1.14, cw, LINE, 0.5);
    s.addText(c.n, { x, y: 1.2, w: cw, h: 0.56, fontFace: FL, fontSize: 34, color: TEAL, margin: 0, isTextBox: true });
    s.addText(c.t, { x, y: 1.78, w: cw, h: 0.26, fontFace: FSB, fontSize: 11.5, color: INK, margin: 0, isTextBox: true });
    s.addText(c.d, { x, y: 2.06, w: cw, h: 0.6, fontFace: F, fontSize: 10, color: INK2, margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  });
  s.addShape(p.ShapeType.rect, { x: M, y: 2.95, w: 0.05, h: 1.3, fill: { color: TEAL } });
  s.addText("국내 종합병원 병동 한 곳의 운영 방식을 기준으로 설계했습니다. 현직 간호사 한 분께 확인했고, 병동마다 운영이 다르다는 것도 같은 분께 들었습니다.",
    { x: M + 0.24, y: 2.95, w: W - 2 * M - 0.3, h: 0.6, fontFace: FSB, fontSize: 11.5, color: INK, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  s.addText("공식 의무기록은 병원 전산이 맡습니다. 인계 메모는 그와 따로 관리됩니다. 이 서비스는 그 인계 메모를 맡아서, 누가 썼고 누가 받아 확인했고 무엇이 바뀌었는지를 남깁니다.",
    { x: M + 0.24, y: 3.59, w: W - 2 * M - 0.3, h: 0.66, fontFace: F, fontSize: 11.5, color: INK2, valign: "middle", margin: 0, isTextBox: true, lineSpacingMultiple: 1.2 });
  foot(s, "근무표가 끝나는 지점에서 시작한다. 누가 인계를 맡았고, 누가 받아 확인했는지");
  s.addNotes("마지막 문장을 표지의 문장과 이어 닫는다.");
}

{
  const s = slide(null, { bare: true });
  ring(s, M, 1.9, 0.7);
  s.addText("감사합니다", { x: M, y: 2.8, w: W - 2 * M, h: 0.8, fontFace: FX, fontSize: 34, color: INK, charSpacing: -1, margin: 0, isTextBox: true });
}

p.writeFile({ fileName: OUT }).then(() => console.log("done →", OUT, "·", pageNo, "장"));
