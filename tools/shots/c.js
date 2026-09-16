/* Part C — 인계 작성(422)과 수신 */
const pg = await fresh();

await go(pg, 'N003', '#/handover/7/write');
await pg.click('[data-act=send]'); await sleep(800);
await shot(pg, '9_handover_write_nurse', [
  [1, '필수 항목', '.req', ''],
  [2, '오류 박스', '.danger', ''],
  [3, '인계 넘기기', '[data-act=send]', ''],
  [4, '항목 입력칸', 'textarea', '']
]);

await go(pg, 'N004', '#/handover/6/receive');
await shot(pg, '10_handover_receive_nurse', [
  [1, '받은 인계 상태', '.st', 'SENT'],
  [2, '요약 입력', '#summary', ''],
  [3, '확인 처리', '[data-act=confirm]', ''],
  [4, '요약 필수 안내', '#warnBox', '']
]);
console.log('DIR=' + pwd);
