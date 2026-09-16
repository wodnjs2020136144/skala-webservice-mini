/* Aside REPL 공통 프리루드 — 각 part 파일 앞에 붙여 실행한다.
 * 규칙(25·26라운드에서 배운 것):
 *  - 스크린샷에는 창 테두리가 같이 찍힌다 → 콘텐츠 영역만 크롭한다(파이썬 쪽에서)
 *  - 가정한 뷰포트 높이(900)를 쓰지 말고 window.scrollY 실측값으로 이어 붙인다
 *  - body.capture 로 고정 요소(사이드바·상단바·API 패널)를 해제한 뒤 찍는다
 * 달러 기호와 백틱을 쓰지 않는다 — 셸의 큰따옴표 안에서 그대로 전달돼야 한다.
 */
const BASE = 'http://127.0.0.1:8765/index.html';

async function fresh() {
  const pg = await openTab(BASE + '?v=' + Date.now());
  await sleep(1400);
  return pg;
}
async function reset(pg) {
  await pg.evaluate(() => { localStorage.removeItem('nvn-demo-v1'); });
  await pg.reload();
  await sleep(1400);
}
async function go(pg, user, hash) {
  await pg.evaluate((a) => {
    if (a.user) Store.setUser(a.user); else Store.setUser(null);
    location.hash = a.hash;
    App.render();   // 같은 해시면 hashchange 가 안 난다 — 사용자만 바뀌고 화면이 그대로였다
  }, { user: user, hash: hash });
  await sleep(950);
}
/* marks: [[번호, 라벨, 선택자, 포함문구(선택)], ...] */
async function shot(pg, id, marks) {
  await pg.evaluate(() => { document.body.classList.add('capture'); window.scrollTo(0, 0); });
  await sleep(450);
  const meta = await pg.evaluate((ms) => {
    const pick = (sel, txt) => {
      const all = [].slice.call(document.querySelectorAll(sel));
      if (!all.length) return null;
      if (!txt) return all[0];
      return all.filter((e) => (e.innerText || '').indexOf(txt) >= 0)[0] || null;
    };
    const out = [];
    ms.forEach((m) => {
      const el = pick(m[2], m[3]);
      if (!el) { out.push({ n: m[0], label: m[1], missing: m[2] + (m[3] ? ' / ' + m[3] : '') }); return; }
      const r = el.getBoundingClientRect();
      out.push({
        n: m[0], label: m[1],
        x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
        w: Math.round(r.width), h: Math.round(r.height)
      });
    });
    return {
      marks: out,
      pageW: document.documentElement.scrollWidth,
      pageH: document.documentElement.scrollHeight,
      // 촬영되는 실제 폭·높이 — 스크롤바를 뺀 값이다. 앵커를 이미지 좌표로 옮길 때 이 값을 기준으로 쓴다
      shotW: document.documentElement.clientWidth, dpr: window.devicePixelRatio,
      viewH: document.documentElement.clientHeight, viewW: window.innerWidth
    };
  }, marks);
  await pg.screenshot({ path: './artifacts/' + id + '__0.png' });
  const sy = await pg.evaluate(() => { window.scrollTo(0, 99999); return window.scrollY; });
  await sleep(500);
  await pg.screenshot({ path: './artifacts/' + id + '__1.png' });
  await pg.evaluate(() => { window.scrollTo(0, 0); document.body.classList.remove('capture'); });
  meta.id = id; meta.scrollY = sy;
  console.log('__SHOT__' + JSON.stringify(meta));
  return meta;
}
