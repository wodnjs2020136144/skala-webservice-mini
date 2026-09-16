/* 데모의 실제 2xx 응답 본문을 operationId 별로 수집해 JSON 으로 뱉는다 */
global.window = global;
require('../demo/js/seed.js');
require('../demo/js/store.js');
var mem = {}; global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
require('../demo/js/api.js');
Store.load();
var seen = {};
Api.onLog(e => { if (e.status < 300 && !seen[e.operationId]) seen[e.operationId] = e.response; });
var I = Api.invoke, as = u => Store.setUser(u);
function t(fn) { try { fn(); } catch (e) { } }
as('H001');
t(() => I('getWardDashboard', { wardId: 5 }));
t(() => I('listWardHandovers', { wardId: 5 }));
t(() => I('listShiftAssignments', { wardId: 5, date: '2026-09-16' }));
var tmp = null; t(() => { tmp = I('createShiftAssignments', { wardId: 5, body: { items: [{ user_id: 'N005', work_date: '2026-09-18', shift_code: 'D' }] } }).items[0].shift_assignment_id; });
t(() => I('registerAbsence', { shiftAssignmentId: tmp, body: { change_reason: '캡처용 — 09-18 임시 근무' } }));
t(() => I('getAssignmentBoard', { wardId: 5, date: '2026-09-16', shift_code: 'N' }));
t(() => I('updateShiftAssignmentRole', { shiftAssignmentId: 223, body: { role_type_id: 1 } }));
t(() => I('assignHandoverOwnership', { shiftAssignmentId: 223, body: { inpatient_stay_ids: [7] } }));
t(() => I('listHandoverTemplateItems', { wardId: 5 }));
t(() => I('replaceHandoverTemplateItems', { wardId: 5, body: { items: I('listHandoverTemplateItems', { wardId: 5 }).items.map(x => ({ label: x.label, is_required: x.is_required, sort_order: x.sort_order })) } }));
t(() => I('getReassignmentContext', { shiftAssignmentId: 222 }));
t(() => I('assignSubstitute', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223 } }));
t(() => I('transferHandoverOwnership', { shiftAssignmentId: 222, body: { to_shift_assignment_id: 223, inpatient_stay_ids: [5] } }));
t(() => I('confirmCoverage', { shiftAssignmentId: 222 }));
t(() => I('listReassignmentLogs', { wardId: 5 }));
as('N003'); // 한서윤 E 차지
t(() => I('getMyShifts', {}));
t(() => I('listMyHandovers', {}));
t(() => I('createHandover', { body: { inpatient_stay_id: 4, from_handover_assignment_id: I('getMyShifts', {}).shifts[0].team_stays.filter(x => x.inpatient_stay_id === 4)[0].handover_assignment_id } }));
var draft = Store.db.handover.filter(h => h.status === 'DRAFT')[0];
t(() => I('updateHandoverItems', { handoverId: draft.id, body: { items: Store.db.handover_item.filter(i => i.handover_id === draft.id).map(i => ({ handover_item_id: i.id, content: '내용' })) } }));
t(() => I('sendHandover', { handoverId: draft.id }));
t(() => I('getHandover', { handoverId: draft.id }));
as('N004'); // 정하늘 N 차지
t(() => I('createHandoverReceipt', { handoverId: draft.id }));
t(() => I('updateReceiverSummary', { handoverId: draft.id, body: { receiver_summary: '요약' } }));
t(() => I('confirmHandoverReceipt', { handoverId: draft.id }));
console.log(JSON.stringify(seen, null, 1));
