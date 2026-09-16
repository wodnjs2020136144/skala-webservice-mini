/* Part B — 배정 보드와 간호사 화면 */
const pg = await fresh();

await go(pg, 'H001', '#/board');
await pg.evaluate(() => {
  const d = document.querySelector('#bDate'), s = document.querySelector('#bShift');
  if (d) { d.value = '2026-09-16'; d.dispatchEvent(new Event('change')); }
});
await sleep(800);
await pg.evaluate(() => {
  const s = document.querySelector('#bShift');
  if (s) { s.value = 'N'; s.dispatchEvent(new Event('change')); }
});
await sleep(900);
await shot(pg, '4_assignment_board_manager', [
  [1, '역할 선택', 'select.sel', ''],
  [2, '인계 담당 지정', '.chip', ''],
  [3, '담당 추가', '.chip.add', '']
]);

await go(pg, 'N003', '#/me');
await shot(pg, '8_myshift_nurse', [
  [1, '내 근무 조회', '.code', '/me/shifts'],
  [2, '받은 인계 열', 'th', '받은 인계'],
  [3, '보낸 인계 열', 'th', '보낸 인계'],
  [4, '작성 계속', 'a.btn', '작성']
]);

await go(pg, 'N002', '#/me');
await shot(pg, '8_myshift_nurse_states', [
  [1, '액팅 표시', '.role', '액팅'],
  [2, '빈 상태 안내', '.empty', '']
]);

await go(pg, 'N001', '#/myhistory');
await shot(pg, '11_handover_history_nurse', [
  [1, '이력 조회', '.code', '/me/handovers'],
  [2, '대체됨 표시', '.st', '대체'],
  [3, '방향 필터', '[data-act=dir]', '']
]);
console.log('DIR=' + pwd);
