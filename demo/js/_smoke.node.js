/* node 스모크: 시나리오 한 바퀴 — 브라우저 없이 api.js 만 검증 */
global.window = global;
require('./seed.js'); require('./store.js');
var mem = {}; global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
require('./api.js');
Store.load();
var fails = 0, n = 0;
function as(u) { Store.setUser(u); }
function ok(label, fn) { n++; try { var r = fn(); console.log('  ok ', label); return r; } catch (e) { fails++; console.log('  FAIL', label, '→', e.status || '', e.message); } }
function err(label, status, fn, code) { n++;
  if (!code) { fails++; console.log('  FAIL', label, '→ 기대 code 가 지정되지 않음 (R134: 상태코드만으로는 어느 가드를 지났는지 모른다)'); return; }
  try { fn(); fails++; console.log('  FAIL', label, '→ 예외 없음(기대 ' + status + ' ' + code + ')'); }
  catch (e) {
    if (e.status === status && e.code === code) console.log('  ok ', label, '(' + status + ' ' + code + ')');
    else { fails++; console.log('  FAIL', label, '→ 기대', status, code, '실제', e.status || '', e.code || e.message); }
  } }
var I = Api.invoke;

console.log('# 수간호사');
as('H001');
var d = ok('dashboard', () => I('getWardDashboard', { wardId: 5 }));
console.log('     근무자', JSON.stringify(d.shift_counts), '미확인', d.unconfirmed_handover_count, '결원', d.uncovered_absences.map(x => x.user_name));
ok('board 09-16 E', () => I('getAssignmentBoard', { wardId: 5, date: '2026-09-16', shift_code: 'E' }));
// 25라운드 R141 — 대시보드 드릴다운: 집계와 목록이 같은 조건이어야 한다
var wh = ok('미확인 목록(수간호사)', () => I('listWardHandovers', { wardId: 5, status: 'SENT' }));
if (wh && wh.items.length !== d.unconfirmed_handover_count) { fails++; console.log('  FAIL 미확인 목록 건수가 집계와 다름', wh.items.length, '≠', d.unconfirmed_handover_count); }
else console.log('     목록', wh.items.map(x => x.bed_no + ' ' + x.from_user_name + '→' + x.to_user_name).join(' · '));
// 25라운드 R147 — 이미 역할이 있어도 덮어쓸 수 있어야 재배정 ②의 "역할도 부여" 체크가 거짓말을 하지 않는다
ok('역할 덮어쓰기 PATCH (R147)', () => { var b = I('getAssignmentBoard', { wardId: 5, date: '2026-09-16', shift_code: 'E' }); var acting = b.rows.filter(r => r.role_name === '액팅')[0]; if (!acting) throw new Error('액팅 행 없음'); var r = I('updateShiftAssignmentRole', { shiftAssignmentId: acting.shift_assignment_id, body: { role_type_id: 1 } }); if (r.role_name !== '차지') throw new Error('역할이 안 바뀜: ' + r.role_name); I('updateShiftAssignmentRole', { shiftAssignmentId: acting.shift_assignment_id, body: { role_type_id: 3 } }); return r; });
err('근무 중복 409', 409, () => I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N003', work_date: '2026-09-16', shift_code: 'E' }] } }), 'SHIFT_DUPLICATE');
ok('근무 등록 201', () => I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N005', work_date: '2026-09-17', shift_code: 'D' }] } }));
err('담당 중복 409', 409, () => I('assignHandoverOwnership', { shiftAssignmentId: 211, body: { inpatient_stay_ids: [1] } }), 'ALREADY_ASSIGNED');
err('템플릿 순서 중복 422', 422, () => I('replaceHandoverTemplateItems', { wardId: 5, body: { items: [{ label: 'a', is_required: true, sort_order: 1 }, { label: 'b', is_required: false, sort_order: 1 }] } }), 'SORT_ORDER_DUPLICATE');

console.log('# 간호사 한서윤 (E 차지) — 작성');
as('N003');
err('수간호사 API 403', 403, () => I('getWardDashboard', { wardId: 5 }), 'FORBIDDEN');
var my = ok('내 근무', () => I('getMyShifts', {}));
var s2 = my.shifts[0].team_stays.filter(x => x.bed_no === '501-3')[0];
console.log('     501-3 owner', s2.is_handover_owner, 'incoming', s2.handover_status, 'outgoing', s2.outgoing_status, 'id', s2.outgoing_handover_id);
var draft = s2.outgoing_handover_id;
err('필수 미작성 422', 422, () => I('sendHandover', { handoverId: draft }), 'REQUIRED_ITEMS_EMPTY');
var det = ok('DRAFT 상세(작성자)', () => I('getHandover', { handoverId: draft }));
var missing = det.items.filter(i => i.is_required && !i.content);
ok('항목 저장', () => I('updateHandoverItems', { handoverId: draft, body: { items: missing.map(i => ({ handover_item_id: i.handover_item_id, content: '데모 입력' })) } }));
ok('넘기기 200', () => I('sendHandover', { handoverId: draft }));
err('SENT 후 수정 409', 409, () => I('updateHandoverItems', { handoverId: draft, body: { items: [] } }), 'NOT_DRAFT');
err('남의 담당 행으로 작성 403', 403, () => I('createHandover', { body: { inpatient_stay_id: 8, from_handover_assignment_id: 3 } }), 'NOT_OWNER');
as('N001');
err('퇴원(CLOSED) 건 신규 인계 409', 409, () => I('createHandover', { body: { inpatient_stay_id: 8, from_handover_assignment_id: 3 } }), 'STAY_CLOSED');
err('없는 담당 행 404', 404, () => I('createHandover', { body: { inpatient_stay_id: 4, from_handover_assignment_id: 999 } }), 'OWNER_NOT_FOUND');
as('N004'); // 정하늘 09-16 N 차지 — 502-2 의 다음 근무(09-17 D 박지우)에는 담당이 없다 → 422 (서버 계산 ⑥)
var ha221_3 = Store.db.handover_assignment.filter(a => a.shift_assignment_id === 221 && a.inpatient_stay_id === 3 && a.status === 'ACTIVE')[0].id;
err('다음 담당 없음 422 (⑥)', 422, () => I('createHandover', { body: { inpatient_stay_id: 3, from_handover_assignment_id: ha221_3 } }), 'NEXT_OWNER_MISSING');
as('H001');
err('요청 안 근무 중복 409 (R126)', 409, () => I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N009', work_date: '2026-09-18', shift_code: 'D' }, { user_id: 'N009', work_date: '2026-09-18', shift_code: 'D' }] } }), 'SHIFT_DUPLICATE');
err('요청 안 담당 중복 409 (R128)', 409, () => I('assignHandoverOwnership', { shiftAssignmentId: 231, body: { inpatient_stay_ids: [4, 4] } }), 'ALREADY_ASSIGNED');
as('N003');

console.log('# 이민혜 (E 액팅) — 열람만');
as('N002');
ok('SENT 열람(같은 팀·같은 근무)', () => I('getHandover', { handoverId: draft }));
err('확인 처리 403', 403, () => I('confirmHandoverReceipt', { handoverId: draft }), 'NOT_RECEIVER');
err('작성 403', 403, () => I('createHandover', { body: { inpatient_stay_id: 4, from_handover_assignment_id: 4 } }), 'NOT_OWNER');
var m2 = ok('내 근무(빈 상태 카드 포함)', () => I('getMyShifts', {}));
console.log('     근무 수', m2.shifts.length, m2.shifts.map(s => s.work_date + s.shift_code + '/' + s.role_name + '/owner:' + s.team_stays.filter(x => x.is_handover_owner).length));

console.log('# 정하늘 (N 차지) — 수신');
as('N004');
ok('열람 기록', () => I('createHandoverReceipt', { handoverId: draft }));
err('요약 없이 확인 422', 422, () => I('confirmHandoverReceipt', { handoverId: draft }), 'SUMMARY_REQUIRED');
ok('요약 저장', () => I('updateReceiverSummary', { handoverId: draft, body: { receiver_summary: '501-3 낙상 고위험.' } }));
ok('확인 처리', () => I('confirmHandoverReceipt', { handoverId: draft }));
err('재확인 409', 409, () => I('confirmHandoverReceipt', { handoverId: draft }), 'NOT_SENT');
ok('내 이력', () => I('listMyHandovers', {}));
as('N003'); var dr = ok('한서윤 502-2 DRAFT 생성 (⑥ 다음 담당 = 정하늘)', () => I('createHandover', { body: { inpatient_stay_id: 3, from_handover_assignment_id: Store.db.handover_assignment.filter(a => a.shift_assignment_id === 211 && a.inpatient_stay_id === 3)[0].id } }));
as('N004'); n++; var recvHist = I('listMyHandovers', { direction: 'received' }).items.some(x => x.handover_id === dr.handover_id); if (recvHist) { fails++; console.log('  FAIL 수신 측 이력에 DRAFT 포함 (R131)'); } else console.log('  ok  수신 측 이력에 DRAFT 없음 (R131)');
n++; var st3 = I('getMyShifts', {}).shifts[0].team_stays.filter(x => x.inpatient_stay_id === 3)[0]; if (st3.handover_status === 'DRAFT') console.log('  ok  화면 8 handover_status=DRAFT (링크는 UI 가 숨김 · R130)'); else { fails++; console.log('  FAIL DRAFT 상태 기대, 실제', st3.handover_status); }

console.log('# 한가람 (결원) — 수신 불가');
as('N007');
err('결원 근무의 수신자 열람 기록 403 (R135)', 403, () => I('createHandoverReceipt', { handoverId: 8 }), 'RECEIVER_ABSENT');
err('결원 근무의 수신자 확인 403 (R135)', 403, () => I('confirmHandoverReceipt', { handoverId: 8 }), 'RECEIVER_ABSENT');
console.log('# 수간호사 — 한가람 결원 4단계 (222)');
as('H001');
var cx = ok('context', () => I('getReassignmentContext', { shiftAssignmentId: 222 }));
console.log('     후보', cx.candidates.map(c => c.user_name), '잔여', cx.pending_handover_assignments.map(x => x.bed_no + ':' + x.handover_status));
err('② 전 ④ → 422', 422, () => I('confirmCoverage', { shiftAssignmentId: 222 }), 'NO_VALID_SUBSTITUTE');
err('① 재등록 409', 409, () => I('registerAbsence', { shiftAssignmentId: 222, body: { change_reason: 'x' } }), 'ALREADY_ABSENT');
ok('② 대체자 최서연(223)', () => I('assignSubstitute', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223 } }));
err('③ 중복 stay 422 (R127)', 422, () => I('transferHandoverOwnership', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223, inpatient_stay_ids: [5, 5] } }), 'DUPLICATE_STAY');
var absN = ok('ABSENT 대상 만들기(서지호 09-16 N 등록 → 결원)', () => { var r = I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N010', work_date: '2026-09-16', shift_code: 'N' }] } }); I('registerAbsence', { shiftAssignmentId: r.items[0].shift_assignment_id, body: { change_reason: '테스트' } }); return r.items[0].shift_assignment_id; });
err('③ ABSENT 대상 422 (R129)', 422, () => I('transferHandoverOwnership', { shiftAssignmentId: 222, body: { to_shift_assignment_id: absN, inpatient_stay_ids: [5] } }), 'TARGET_NOT_ACTIVE');
var tr = ok('③ 이관 504-1·504-3', () => I('transferHandoverOwnership', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223, inpatient_stay_ids: [5, 6] } }));
console.log('     ', JSON.stringify(tr.transferred));
ok('④ 대체 완료', () => I('confirmCoverage', { shiftAssignmentId: 222 }));
err('④ 재확인 409', 409, () => I('confirmCoverage', { shiftAssignmentId: 222 }), 'ALREADY_COVERED');
var logs = ok('이력', () => I('listReassignmentLogs', { wardId: 5 }));
console.log('     로그', logs.items.length, '건 · 사유', [...new Set(logs.items.map(l => l.change_reason))]);
var d2 = ok('dashboard 후', () => I('getWardDashboard', { wardId: 5 }));
console.log('     미확인', d2.unconfirmed_handover_count, '결원', d2.uncovered_absences.length);
console.log('# 최서연 (대체자) — 후속 인계 확인');
as('N006');
err('미확인 목록 — 간호사 403 (R141)', 403, () => I('listWardHandovers', { wardId: 5 }), 'FORBIDDEN');
var m3 = ok('내 근무', () => I('getMyShifts', {}));
console.log('     has_reassignment', m3.shifts[0].has_reassignment, '504-1', JSON.stringify(m3.shifts[0].team_stays.filter(x => x.bed_no === '504-1')[0]));
var v = Seed.check(Store.db, { seedOnly: false }); console.log('# 사후 seed.check 위반', v.length); v.forEach(x => console.log('  -', x));
console.log('\n결과:', n - fails, '/', n, fails ? 'FAIL' : 'ALL OK');
process.exit(fails ? 1 : 0);
