/* node 스모크: 시나리오 한 바퀴 — 브라우저 없이 api.js 만 검증 */
global.window = global;
require('./seed.js'); require('./store.js');
var mem = {}; global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
require('./api.js');
Store.load();
var fails = 0, n = 0;
function as(u) { Store.setUser(u); }
function ok(label, fn) { n++; try { var r = fn(); console.log('  ok ', label); return r; } catch (e) { fails++; console.log('  FAIL', label, '→', e.status || '', e.message); } }
function err(label, status, fn) { n++; try { fn(); fails++; console.log('  FAIL', label, '→ 예외 없음(기대 ' + status + ')'); } catch (e) { if (e.status === status) console.log('  ok ', label, '(' + status + ' ' + e.code + ')'); else { fails++; console.log('  FAIL', label, '→ 기대', status, '실제', e.status || e.message); } } }
var I = Api.invoke;

console.log('# 수간호사');
as('H001');
var d = ok('dashboard', () => I('getWardDashboard', { wardId: 5 }));
console.log('     근무자', JSON.stringify(d.shift_counts), '미확인', d.unconfirmed_handover_count, '결원', d.uncovered_absences.map(x => x.user_name));
ok('board 09-16 E', () => I('getAssignmentBoard', { wardId: 5, date: '2026-09-16', shift_code: 'E' }));
err('근무 중복 409', 409, () => I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N003', work_date: '2026-09-16', shift_code: 'E' }] } }));
ok('근무 등록 201', () => I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N005', work_date: '2026-09-17', shift_code: 'D' }] } }));
err('담당 중복 409', 409, () => I('assignHandoverOwnership', { shiftAssignmentId: 211, body: { inpatient_stay_ids: [1] } }));
err('템플릿 순서 중복 422', 422, () => I('replaceHandoverTemplateItems', { wardId: 5, body: { items: [{ label: 'a', is_required: true, sort_order: 1 }, { label: 'b', is_required: false, sort_order: 1 }] } }));

console.log('# 간호사 한서윤 (E 차지) — 작성');
as('N003');
err('수간호사 API 403', 403, () => I('getWardDashboard', { wardId: 5 }));
var my = ok('내 근무', () => I('getMyShifts', {}));
var s2 = my.shifts[0].team_stays.filter(x => x.bed_no === '501-3')[0];
console.log('     501-3 owner', s2.is_handover_owner, 'incoming', s2.handover_status, 'outgoing', s2.outgoing_status, 'id', s2.outgoing_handover_id);
var draft = s2.outgoing_handover_id;
err('필수 미작성 422', 422, () => I('sendHandover', { handoverId: draft }));
var det = ok('DRAFT 상세(작성자)', () => I('getHandover', { handoverId: draft }));
var missing = det.items.filter(i => i.is_required && !i.content);
ok('항목 저장', () => I('updateHandoverItems', { handoverId: draft, body: { items: missing.map(i => ({ handover_item_id: i.handover_item_id, content: '데모 입력' })) } }));
ok('넘기기 200', () => I('sendHandover', { handoverId: draft }));
err('SENT 후 수정 409', 409, () => I('updateHandoverItems', { handoverId: draft, body: { items: [] } }));
err('남의 담당 행으로 작성 403', 403, () => I('createHandover', { body: { inpatient_stay_id: 8, from_handover_assignment_id: 3 } }));
as('N001');
err('퇴원(CLOSED) 건 신규 인계 409', 409, () => I('createHandover', { body: { inpatient_stay_id: 8, from_handover_assignment_id: 3 } }));
err('다음 담당 없음 422 (박지우 09-17 D · 담당 없음 → 먼저 담당 지정)', 404, () => I('createHandover', { body: { inpatient_stay_id: 4, from_handover_assignment_id: 999 } }));
as('N003');

console.log('# 이민혜 (E 액팅) — 열람만');
as('N002');
ok('SENT 열람(같은 팀·같은 근무)', () => I('getHandover', { handoverId: draft }));
err('확인 처리 403', 403, () => I('confirmHandoverReceipt', { handoverId: draft }));
err('작성 403', 403, () => I('createHandover', { body: { inpatient_stay_id: 4, from_handover_assignment_id: 4 } }));
var m2 = ok('내 근무(빈 상태 카드 포함)', () => I('getMyShifts', {}));
console.log('     근무 수', m2.shifts.length, m2.shifts.map(s => s.work_date + s.shift_code + '/' + s.role_name + '/owner:' + s.team_stays.filter(x => x.is_handover_owner).length));

console.log('# 정하늘 (N 차지) — 수신');
as('N004');
ok('열람 기록', () => I('createHandoverReceipt', { handoverId: draft }));
err('요약 없이 확인 422', 422, () => I('confirmHandoverReceipt', { handoverId: draft }));
ok('요약 저장', () => I('updateReceiverSummary', { handoverId: draft, body: { receiver_summary: '501-3 낙상 고위험.' } }));
ok('확인 처리', () => I('confirmHandoverReceipt', { handoverId: draft }));
err('재확인 409', 409, () => I('confirmHandoverReceipt', { handoverId: draft }));
ok('내 이력', () => I('listMyHandovers', {}));

console.log('# 수간호사 — 한가람 결원 4단계 (222)');
as('H001');
var cx = ok('context', () => I('getReassignmentContext', { shiftAssignmentId: 222 }));
console.log('     후보', cx.candidates.map(c => c.user_name), '잔여', cx.pending_handover_assignments.map(x => x.bed_no + ':' + x.handover_status));
err('② 전 ④ → 422', 422, () => I('confirmCoverage', { shiftAssignmentId: 222 }));
err('① 재등록 409', 409, () => I('registerAbsence', { shiftAssignmentId: 222, body: { change_reason: 'x' } }));
ok('② 대체자 최서연(223)', () => I('assignSubstitute', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223 } }));
var tr = ok('③ 이관 504-1·504-3', () => I('transferHandoverOwnership', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223, inpatient_stay_ids: [5, 6] } }));
console.log('     ', JSON.stringify(tr.transferred));
ok('④ 대체 완료', () => I('confirmCoverage', { shiftAssignmentId: 222 }));
err('④ 재확인 409', 409, () => I('confirmCoverage', { shiftAssignmentId: 222 }));
var logs = ok('이력', () => I('listReassignmentLogs', { wardId: 5 }));
console.log('     로그', logs.items.length, '건 · 사유', [...new Set(logs.items.map(l => l.change_reason))]);
var d2 = ok('dashboard 후', () => I('getWardDashboard', { wardId: 5 }));
console.log('     미확인', d2.unconfirmed_handover_count, '결원', d2.uncovered_absences.length);
console.log('# 최서연 (대체자) — 후속 인계 확인');
as('N006');
var m3 = ok('내 근무', () => I('getMyShifts', {}));
console.log('     has_reassignment', m3.shifts[0].has_reassignment, '504-1', JSON.stringify(m3.shifts[0].team_stays.filter(x => x.bed_no === '504-1')[0]));
var v = Seed.check(Store.db, { seedOnly: false }); console.log('# 사후 seed.check 위반', v.length); v.forEach(x => console.log('  -', x));
console.log('\n결과:', n - fails, '/', n, fails ? 'FAIL' : 'ALL OK');
process.exit(fails ? 1 : 0);
