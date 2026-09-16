/* Part A — 상태를 건드리지 않는 화면 4장 (초기화 직후) */
const pg = await fresh();
await reset(pg);

await go(pg, null, '#/login');
await shot(pg, '1_login_main', [
  [1, '시연 순서 배지', '.ucard', '김수진'],
  [2, '역할 구분', '.ucards', '']
]);

await go(pg, 'H001', '#/dashboard');
await pg.click('[data-act=unconf]'); await sleep(700);
await shot(pg, '2_dashboard_manager', [
  [1, '근무자 수 타일', '.tile.click', '근무자'],
  [2, '역할별 타일', '.tile.click', '역할별'],
  [3, '미확인 타일', '.tile.click', '미확인'],
  [4, '결원 타일', '.tile.click', '결원'],
  [5, '드릴다운 목록', '.code', '/wards/5/handovers'],
  [6, '재배정 버튼', 'a.btn', '재배정']
]);

await go(pg, 'H001', '#/shifts');
await shot(pg, '3_shift_register_manager', [
  [1, '행 추가', '[data-act=add]', ''],
  [2, '저장', '[data-act=save]', ''],
  [3, '등록된 근무 조회', '.code', '/wards/5/shift-assignments']
]);

await go(pg, 'H001', '#/template');
await shot(pg, '5_handover_template_manager', [
  [1, '필수 표시', '.req', ''],
  [2, '전체 교체 저장', '[data-act=save]', ''],
  [3, '조회 경로', '.code', 'handover-template-items']
]);
console.log('DIR=' + pwd);
