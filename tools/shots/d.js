/* Part D — 결원 재배정 4단계와 변경 이력 (상태를 바꾸므로 마지막) */
const pg = await fresh();

await go(pg, 'H001', '#/reassign/222');
await pg.evaluate(() => { const s = document.querySelector('#cand'); s.value = 'sa:223'; s.dispatchEvent(new Event('change')); });
await sleep(400);
await pg.click('[data-act=substitute]'); await sleep(1000);
await shot(pg, '6_reassign_manager', [
  [1, '결원 등록 완료', '.step', '결원 등록'],
  [2, '대체자 배정 완료', '.step', '대체자 배정'],
  [3, '잔여 담당 경고', '.step', '인계 담당 이관'],
  [4, '대체 완료 확인', '[data-act=cover]', '']
]);

await pg.evaluate(() => { [].slice.call(document.querySelectorAll('[data-stay]')).forEach((c) => { c.checked = true; }); });
await pg.click('[data-act=transfer]'); await sleep(1100);
await pg.click('[data-act=cover]'); await sleep(1000);

await go(pg, 'H001', '#/history');
await shot(pg, '7_change_history_manager', [
  [1, '이력 조회', '.code', 'reassignment-logs'],
  [2, '결원 등록', '.ev', '결원 등록'],
  [3, '담당 이관', '.ev', '이관'],
  [4, '대체 완료', '.ev', '완료']
]);
console.log('DIR=' + pwd);
