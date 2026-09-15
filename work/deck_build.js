const pptxgen = require("pptxgenjs");
const fs = require("fs");

const INK="1E4D5C", MUTED="5B6B70", PANEL="F2F6F7", BORDER="CFDDE1",
      MGR="FB8C00", NUR="43A047", WHITE="FFFFFF", RED="C62828", BLUE="1565C0";
const F="Arial";
const W=10, H=5.625, M=0.55;

const p = new pptxgen();
p.layout = "LAYOUT_16x9";
p.author="황재원"; p.company="SKALA 10반";
p.title="너와나의인계고리 — 프로젝트 기술서";

function titleBar(s, sec, title, sub){
  if(sec){
    s.addShape(p.ShapeType.roundRect,{x:M,y:0.38,w:0.62,h:0.3,rectRadius:0.06,fill:{color:INK}});
    s.addText(sec,{x:M,y:0.38,w:0.62,h:0.3,fontFace:F,fontSize:12,bold:true,color:WHITE,align:"center",valign:"middle",margin:0,isTextBox:true});
  }
  s.addText(title,{x:sec?M+0.78:M,y:0.3,w:W-2*M-0.8,h:0.48,fontFace:F,fontSize:26,bold:true,color:INK,valign:"middle",margin:0,isTextBox:true});
  if(sub) s.addText(sub,{x:sec?M+0.78:M,y:0.8,w:W-2*M-0.8,h:0.28,fontFace:F,fontSize:12,color:MUTED,valign:"middle",margin:0,isTextBox:true});
}
function slot(s, note, y, h, x, w){
  x=x===undefined?M:x; w=w===undefined?W-2*M:w; y=y===undefined?1.22:y; h=h===undefined?H-y-0.5:h;
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.02,fill:{color:PANEL},line:{color:BORDER,width:1,dashType:"dash"}});
  s.addText(note,{x:x+0.25,y:y+0.2,w:w-0.5,h:h-0.4,fontFace:F,fontSize:12,color:MUTED,align:"center",valign:"middle",margin:0,isTextBox:true});
}
function foot(s,t){ s.addText(t,{x:M,y:H-0.42,w:W-2*M,h:0.24,fontFace:F,fontSize:9,color:MUTED,margin:0,isTextBox:true}); }
function content(sec,title,sub,note,notes){
  const s=p.addSlide(); titleBar(s,sec,title,sub); slot(s,note); if(notes) s.addNotes(notes); return s;
}

/* 1. 표지 */
{
  const s=p.addSlide(); s.background={color:INK};
  s.addText("너와나의인계고리",{x:M,y:1.75,w:W-2*M,h:0.9,fontFace:F,fontSize:40,bold:true,color:WHITE,margin:0,isTextBox:true});
  s.addText("근무표가 끝나는 지점에서 시작한다",{x:M,y:2.65,w:W-2*M,h:0.4,fontFace:F,fontSize:16,color:"BBD4DB",margin:0,isTextBox:true});
  s.addShape(p.ShapeType.rect,{x:M,y:3.25,w:0.9,h:0.03,fill:{color:MGR}});
  s.addText("AI 웹 서비스 설계 Mini-project  ·  10반 황재원  ·  2026.09",{x:M,y:3.55,w:W-2*M,h:0.3,fontFace:F,fontSize:12,color:"9FBCC4",margin:0,isTextBox:true});
  s.addNotes("표지. 발표 시작 문구: '근무표는 누가 나오는지까지만 말합니다. 그 다음 고리가 비어 있습니다.'");
}

/* 2. 목차 */
{
  const s=p.addSlide(); titleBar(s,null,"목차",null);
  const items=[["01","서비스 개요 · 기획 배경"],["02","Pain point ↔ Solution · 서비스 범위"],["03","시스템 액터 · 권한 · 기능 정의"],
               ["04","전체 UI 흐름도"],["05","화면별 UI 흐름"],["06","데이터 모델 (ERD)"],["07","API 명세 (OAS)"],["08","설계 상의 고민 · 향후 개선"]];
  items.forEach((it,i)=>{
    const col=i<4?0:1, row=i%4;
    const x=M+col*(W-2*M)/2, y=1.35+row*0.82;
    s.addShape(p.ShapeType.roundRect,{x,y,w:0.5,h:0.5,rectRadius:0.08,fill:{color:PANEL},line:{color:BORDER,width:1}});
    s.addText(it[0],{x,y,w:0.5,h:0.5,fontFace:F,fontSize:13,bold:true,color:INK,align:"center",valign:"middle",margin:0,isTextBox:true});
    s.addText(it[1],{x:x+0.68,y,w:(W-2*M)/2-0.85,h:0.5,fontFace:F,fontSize:13,color:INK,valign:"middle",margin:0,isTextBox:true});
  });
}

/* 01 */
content("01","서비스 개요","한 문장 정의 · 핵심 가치 · 주요 기능",
 "[ 채울 것 ]\n서비스 한 문장 (work/A_주제확정.md A-2) + 핵심 가치 한 줄 + 주요 기능 5개 아이콘 행",
 "docs/02 T1에서 그대로 가져온다. Q1 답에 따라 '오늘의 근무 배정' 구절만 조인다.");
content("01","기획 배경 — 현장에서 본 것","교대 근무 병동의 실제 불편",
 "[ 채울 것 ]\n직접 관찰한 불편 3가지 (역할을 모르고 출근 / 재조정 부담 / 역할별 인계 차이)\n+ 오늘 밤 인터뷰에서 받은 인용문 1~2줄",
 "인용문은 동의받은 것만. '참여자는 ~라고 말했다' 형태로. docs/05 §2-0 동의 절차 참조.");
content("01","기획 배경 — 현황","근무표가 말하지 않는 것",
 "[ 채울 것 ]\n확정 근무 1건이 흩어지는 경로 다이어그램 (docs/03 §5)\n엑셀 → 카톡 → 개인 앱 재입력 → 화이트보드 → 종이 인계장",
 "문헌 수치는 신중히. 40.2분·만족도 5.8%는 쓰지 않는다(docs/03 §4-4). 연도를 붙일 수 있는 것만.");

/* 02 */
content("02","Pain point ↔ Solution","문제와 해결의 1:1 대응",
 "[ 채울 것 ]\nPain 3 ↔ Solution 3 대응 표 (docs/02 T2)\n각 행에 연결 기능 ID(F-02·F-03 / F-04 / F-05) 표기",
 "Pain의 원인은 아직 [D] 표기 상태. 인터뷰 후 확정한 것만 단정형으로 쓴다.");
content("02","서비스 범위","하는 것과 하지 않는 것",
 "[ 채울 것 ]\n좌: 핵심 기능 5개  /  우: Out of scope 5개\n근무표 자동생성 · EMR 연동 · 실제 환자정보 · 임상 판단 · 교육/급여/알람",
 "Out of scope를 명시하는 것 자체가 스코프 판단의 증거다. 왜 뺐는지 한 줄씩.");

/* 03 */
content("03","시스템 액터 정의","간호사 · 수간호사",
 "[ 채울 것 ]\nActor 표 — 구분 / 역할·권한 / 상세 제공 기능 (docs/02 T3)",
 "표는 docs/02 T3 그대로.");
content("03","권한 규칙","읽기 3단 · 쓰기는 더 좁게",
 "[ 채울 것 ]\n읽기: 간호사=care_assignment / 수간호사=ward 전체 / 타 병동=차단\n쓰기: 인계 작성=from 당사자, 요약 입력=to 당사자, 배정=해당 병동 수간호사",
 "access_log는 범위 밖임을 각주로. 403 vs 404 결정을 반영할 것.");
content("03","기능 정의","F-01 ~ F-06  (F-06 = 역할별 인계 항목 정의, 수간호사)",
 "[ 채울 것 ]\n기능 6개 표 — ID / 기능명 / Actor / 담당 화면 / 거부 코드 (docs/02 T4)\nF-06은 F-04가 쓰는 템플릿의 출처 — Actor가 달라 분리했다",
 "'현재 후보 6개'라는 표현을 유지. 인터뷰 반증 시 조정한다는 각주.");

/* 04 전체 UI 흐름도 — 2장 */
function bigImage(sec,title,sub,file,IW,IH,footTxt,notes){
  const s=p.addSlide(); titleBar(s,sec,title,sub);
  const ay=1.2, ah=H-ay-(footTxt?0.52:0.28), aw=W-2*M;
  const ar=IW/IH; let h=ah, w=h*ar; if(w>aw){ w=aw; h=w/ar; }
  s.addImage({path:file,x:M+(aw-w)/2,y:ay+(ah-h)/2,w,h});
  if(footTxt) foot(s,footTxt);
  if(notes) s.addNotes(notes);
  return s;
}
bigImage("04","전체 UI 흐름도 (1/2) — 수간호사","근무 등록 → 역할·담당 배정 → 결원 재배정 → 변경 이력",
  "flow1.png",1024,832,
  "실선 = 같은 사용자의 화면 이동   ·   점선 = 데이터·상태가 간호사 화면에 반영됨 (2/2로 이어짐)",
  "[필수] UI 흐름도는 반드시 PDF 안에 존재해야 한다. 1/2와 2/2가 합쳐 전체 흐름이다.");
bigImage("04","전체 UI 흐름도 (2/2) — 간호사 · Actor 간 연결","내 근무·역할 → 인계 작성 → 인계 수신·요약 확인",
  "flow2.png",730,600,
  "점선 3개가 두 Actor를 잇는다 — 배정 반영 · 재배정 반영 · 필수 항목 적용   ·   인계 전달은 앞번↔뒷번 서로 다른 간호사",
  "점선이 '두 섬을 잇는 다리'라는 차별점 주장을 그림으로 보여주는 장치다.");

/* 05 범례 */
{
  const s=p.addSlide(); titleBar(s,"05","화면 주석 범례","이후 화면 슬라이드는 이 규칙으로 읽는다");
  const rows=[[NUR,"초록","화면 이동 — 이 버튼을 누르면 어디로 가는가"],
              [RED,"빨강","호출 API 및 기능 설명 — GET /assignments/my 처럼"],
              [BLUE,"파랑","모달 · 예외 · 특이사항 — 오류 팝업, 권한 거부, 상태 전이"]];
  rows.forEach((r,i)=>{
    const y=1.45+i*1.05;
    s.addShape(p.ShapeType.roundRect,{x:M,y,w:W-2*M,h:0.8,rectRadius:0.03,fill:{color:PANEL},line:{color:BORDER,width:1}});
    s.addShape(p.ShapeType.roundRect,{x:M+0.25,y:y+0.2,w:0.95,h:0.4,rectRadius:0.06,fill:{color:r[0]}});
    s.addText(r[1],{x:M+0.25,y:y+0.2,w:0.95,h:0.4,fontFace:F,fontSize:12,bold:true,color:WHITE,align:"center",valign:"middle",margin:0,isTextBox:true});
    s.addText(r[2],{x:M+1.4,y,w:W-2*M-1.7,h:0.8,fontFace:F,fontSize:13,color:INK,valign:"middle",margin:0,isTextBox:true});
  });
  s.addNotes("범례를 화면 파트 맨 앞에 두면 이후 7장이 전부 읽힌다. 참고자료 우수 산출물의 핵심 기법.");
}

/* 05-b 인계 전달 시퀀스 */
{
  const s=p.addSlide(); titleBar(s,"05","인계 전달 흐름","앞번 → 뒷번  ·  요약 입력 후 확인 처리 요청 → 검증 → CONFIRMED");
  const ay=1.25, ah=H-ay-0.5, aw=W-2*M;
  const IW=1113, IH=940, ar=IW/IH;
  let h=ah, w=h*ar; if(w>aw){ w=aw; h=w/ar; }
  s.addImage({path:"handover_seq.png",x:M+(aw-w)/2,y:ay+(ah-h)/2,w,h});
  s.addNotes("전체 흐름도에서 점선 하나로 뭉개진 부분. DRAFT→SENT→CONFIRMED 상태 전이와 퇴원 건 409가 여기서 보인다.");
}

/* 05 화면별 7장 */
const screens=[
 ["1_login_main","로그인","공통 진입. 사번·비밀번호 · 로그인 실패 처리"],
 ["8_myshift_nurse","내 근무 · 역할 · 담당","간호사 진입점. ★ Q1 답에 따라 상단 구성이 갈린다"],
 ["4_assignment_board_manager","역할 · 담당 환자 배정","수간호사. 날짜×근무조 보드에 역할·담당 배정 · 저장 즉시 반영(게시 상태 없음)"],
 ["9_handover_write_nurse","인계 작성","역할별 필수 항목 체크리스트 · 미작성 경고 · 퇴원 건 차단"],
 ["10_handover_receive_nurse","인계 수신 · 요약 확인","★ 요약 입력 → 확인 처리 요청 → 검증 → CONFIRMED"],
 ["6_reassign_manager","결원 재배정","대체자 선택 · 변경 사유 필수 · 근무 충돌 경고"],
 ["나머지 화면","대시보드 · 근무 등록 · 항목 관리 · 이력","2 · 3 · 5 · 7 · 11 — 2장씩 묶어 배치"],
];
screens.forEach(sc=>{
  const s=p.addSlide(); titleBar(s,"05",sc[1],sc[0]+"  ·  "+sc[2]);
  slot(s,"[ 목업 캡처 붙여넣기 ]\n\n캡처 후 주석: 초록=화면 이동 / 빨강=호출 API / 파랑=예외·모달",1.25,H-1.25-0.5);
  s.addNotes("mockups/"+sc[0]+".html 캡처 → assets/"+sc[0]+".png. 폭 1440px 고정, 흰 배경.");
});

/* 06 데이터 모델 */
content("06","데이터 모델 (ERD)","11개 엔티티 · M:N은 care_assignment 하나",
 "[ dbdiagram.io 렌더 화면 캡처 붙여넣기 ]",
 "dbdiagram.io 에러 0 확인 후 그 화면을 그대로 캡처.");
content("06","데이터 모델 — 핵심 설계 포인트","왜 이렇게 설계했는가",
 "[ 채울 것 ]\n① care_assignment — 근무↔입원건 M:N 해소, append-only(status)\n② handover의 from/to — 누가 누구에게, 과거 인계 불변\n③ handover_receipt — ack가 아니라 receiver_summary (I-PASS)\n④ patient 마스터 미보유 — patient_ref_code 외부 참조만",
 "각 포인트에 '왜 다른 안을 택하지 않았는가'를 한 줄씩. T6-b가 재료.");

/* 07 API */
content("07","API 명세 (OAS 3.0.3)","components 우선 설계 · 화면 단위 전용 API",
 "[ Swagger Editor 렌더 화면 캡처 붙여넣기 ]",
 "editor.swagger.io 에러 0 확인 후 캡처. Security Schemes는 평가 제외이므로 작성하지 않는다.");
content("07","API — 핵심 설계 포인트","인터페이스 설계 근거",
 "[ 채울 것 ]\n① components → paths 순서로 설계, $ref 재사용\n② 공통 에러 응답 400/401/403/404 정의\n③ 권한 3단을 401/403으로 분리\n④ 상태 전이 — 퇴원(CLOSED) 건 인계 작성 409",
 "화면 전용 조회 API를 둔 기준도 함께.");

/* 08 */
content("08","설계 상의 고민","택한 안과 버린 안",
 "[ 채울 것 — T6-b 예외 기록을 그대로 ]\n· 변경 이력: 덮어쓰기(폐기) / append-only+status(채택) / 완전 temporal(미채택)\n· 환자 식별 최소화와 그 한계 (개인정보보호법 제23조)\n· 역할별 항목은 1:N — 억지 M:N을 만들지 않은 이유\n· 403 vs 404 선택 근거",
 "버린 안과 그 이유를 적는 것이 채택안만 적는 것보다 강하다.");
content("08","향후 개선 사항","이번 범위 밖으로 둔 것",
 "[ 채울 것 ]\n· EMR 연동 (입원·병상·환자 참조값)\n· 보안 감사 로그 (access_log)\n· 폐쇄형 인계 — 질문·수정 요청까지\n· 교대근무 연동 직무교육 신청\n· 사용자 검증에서 나온 요구 (스코프 초과분)",
 "검증에서 나왔지만 뺀 것을 여기 적으면 '판단했다'는 증거가 된다.");

/* 마무리 */
{
  const s=p.addSlide(); s.background={color:INK};
  s.addText("감사합니다",{x:M,y:2.3,w:W-2*M,h:0.7,fontFace:F,fontSize:30,bold:true,color:WHITE,margin:0,isTextBox:true});
  s.addText("10반 황재원",{x:M,y:3.05,w:W-2*M,h:0.3,fontFace:F,fontSize:13,color:"9FBCC4",margin:0,isTextBox:true});
}

p.writeFile({fileName:"10반_황재원_너와나의인계고리-개요.pptx"}).then(()=>console.log("done"));
