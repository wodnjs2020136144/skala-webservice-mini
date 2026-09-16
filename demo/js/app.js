/* ============================================================
 * app.js — 셸 · 해시 라우터 · 사용자 전환 · API 로그 패널 · 공용 헬퍼
 * ============================================================ */
(function (global) {
  'use strict';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var SHIFT = { D: { name: '데이', time: '07:00–15:00', cls: 't-d' }, E: { name: '이브닝', time: '14:00–22:00', cls: 't-e' }, N: { name: '나이트', time: '22:00–08:00', cls: 't-n' } };
  var STATUS_KO = { NONE: '인계 없음', DRAFT: '임시저장', SENT: '확인 대기', CONFIRMED: '확인 완료', SUPERSEDED: '대체됨' };
  var STATUS_CLS = { NONE: 'st-none', DRAFT: 'st-draft', SENT: 'st-sent', CONFIRMED: 'st-conf', SUPERSEDED: 'st-sup' };

  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dObj(d) { return new Date(d.slice(0, 10) + 'T00:00:00'); }
  function dLabel(d, withYear) { var o = dObj(d); return (withYear ? o.getFullYear() + '년 ' : '') + (o.getMonth() + 1) + '월 ' + o.getDate() + '일(' + DOW[o.getDay()] + ')'; }
  function dShort(d) { var o = dObj(d); return (o.getMonth() + 1) + '/' + o.getDate(); }
  function dow(d) { return DOW[dObj(d).getDay()] + '요일'; }
  function tLabel(ts) { return ts ? ts.slice(11, 16) : '—'; }
  function dtLabel(ts) { return ts ? dShort(ts) + ' ' + ts.slice(11, 16) : '—'; }
  function dtFull(ts) { return ts ? ts.slice(0, 10) + ' ' + ts.slice(11, 16) : '—'; }
  function shiftTag(code, sm) { var s = SHIFT[code]; return '<span class="tag ' + s.cls + (sm ? ' sm' : '') + '">' + code + ' · ' + s.name + (sm ? '' : ' ' + s.time) + '</span>'; }
  function shiftShort(code) { return code + ' · ' + SHIFT[code].name; }
  function badge(status, withCode) { return '<span class="st ' + STATUS_CLS[status] + '">' + STATUS_KO[status] + (withCode && status !== 'NONE' ? ' · ' + status : '') + '</span>'; }
  function roleBadge(name) { return name ? '<span class="role">' + h(name) + '</span>' : '<span class="role none">역할 배정 대기</span>'; }
  function errBox(e) {
    if (e && e.status) return '<div class="danger"><b>' + e.status + ' ' + h(e.code) + '</b> — ' + h(e.message) + (e.details && e.details.items ? '<br>비어 있는 항목: ' + e.details.items.map(h).join(' · ') : '') + '</div>';
    console.error(e); return '<div class="danger">오류: ' + h(e && e.message) + '</div>';
  }
  function whoLabel(u) { return u.user_type === 'HEAD_NURSE' ? '<b>' + h(u.name) + '</b> 수간호사' : '<b>' + h(u.name) + '</b> 간호사 <span style="opacity:.65">· ' + h(teamOf(u)) + '</span>'; }
  function teamOf(u) { var t = global.Store.db.team.filter(function (t) { return t.id === u.team_id; })[0]; return t ? t.name : '—'; }

  // ---- 라우터 ------------------------------------------------
  function parse() {
    var s = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    return { name: s[0] || '', a: s[1] || null, b: s[2] || null };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    var me = global.Store.me(), r = parse(), V = global.Views;
    if (!me && r.name !== 'login') { location.hash = '#/login'; return; }
    if (me && (r.name === '' || r.name === 'login' && false)) { location.hash = me.user_type === 'HEAD_NURSE' ? '#/dashboard' : '#/me'; return; }
    renderTop(me, r);
    // 화면마다 root 를 새로 만든다 — 이전 화면의 클릭 리스너가 누적되지 않게 (09-16 브라우저 검증에서 발견)
    var old = document.getElementById('view'), root = old.cloneNode(false);
    old.parentNode.replaceChild(root, old);
    var view;
    try { view = (V[r.name] || V.notfound)(r.a, r.b); }
    catch (e) { view = { html: '<div class="wrap">' + errBox(e) + '<div class="foot"><a href="#/">처음으로</a></div></div>' }; }
    root.innerHTML = view.html;
    if (view.bind) view.bind(root);
    window.scrollTo(0, 0);
  }
  // ---- 셸: 사이드바 + 상단 바 ------------------------------------
  var ICON = {
    dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    shifts: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    board: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.2 3.2 0 0 1 0 7"/><path d="M18 14c2 .6 3 2.4 3 5"/></svg>',
    template: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    history: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    me: '<svg viewBox="0 0 24 24"><path d="M3 10h18v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/><path d="M13 10V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/></svg>',
    myhistory: '<svg viewBox="0 0 24 24"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 4v5h5M8 13h8M8 17h6"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>'
  };
  var NAV = {
    HEAD_NURSE: [['dashboard', '병동 대시보드'], ['shifts', '확정 근무 등록'], ['board', '역할 · 인계 담당 배정'], ['template', '병동 인계 항목'], ['history', '변경 이력']],
    NURSE: [['me', '내 근무 · 우리 팀 환자'], ['myhistory', '내 인계 이력']]
  };
  var TITLE = { dashboard: '병동 대시보드', shifts: '확정 근무 등록', board: '역할 · 인계 담당 배정', template: '병동 인계 항목 관리', history: '변경 이력', reassign: '결원 등록 · 재배정', me: '내 근무 · 역할 · 우리 팀 환자', myhistory: '내 인계 이력', handover: '인계' };
  function initials(u) { return u.name.slice(0, 1); }
  function avatarCls(u) { return u.user_type === 'HEAD_NURSE' ? 'h' : u.team_id === 2 ? 'b' : ''; }
  function renderTop(me, r) {
    document.body.classList.toggle('no-shell', !me);
    var side = document.getElementById('side'), top = document.getElementById('topbar');
    if (!me) { side.innerHTML = ''; top.innerHTML = ''; return; }
    var nav = NAV[me.user_type].map(function (n) { return '<a href="#/' + n[0] + '" class="' + (r.name === n[0] || (r.name === 'reassign' && n[0] === 'board') || (r.name === 'handover' && n[0] === 'me') ? 'on' : '') + '">' + ICON[n[0]] + '<span>' + n[1] + '</span></a>'; }).join('');
    side.innerHTML = '<div class="brand"><span class="logo">고</span><span>너와나의인계고리<small>5병동 · 시연 데모 · 가상 데이터</small></span></div>' +
      '<div class="nav-grp">' + (me.user_type === 'HEAD_NURSE' ? '수간호사 업무' : '간호사 업무') + '</div><nav class="nav">' + nav + '</nav><div class="sp"></div>' +
      '<div class="ucard-side"><div class="row"><span class="avatar ' + avatarCls(me) + '">' + h(initials(me)) + '</span><div><div class="nm">' + h(me.name) + '</div><div class="rl">' + (me.user_type === 'HEAD_NURSE' ? '수간호사 · 5병동' : '간호사 · ' + h(teamOf(me))) + '</div></div></div>' +
      '<button class="btn sec sm" id="switchUser">' + ICON.swap + ' 사용자 전환</button></div>';
    top.innerHTML = '<span class="ttl">' + h(TITLE[r.name] || '') + '</span><span class="sp"></span><span class="clock" title="데모 시계 — 2026-09-16 21:30 에 고정">🕘 2026-09-16 · 데모 시계</span><button class="btn-ghost reset" id="resetDemo">데모 초기화</button>';
    document.getElementById('switchUser').onclick = function () { go('#/login'); };
    var rs = document.getElementById('resetDemo');
    rs.onclick = function () {
      if (rs.dataset.armed) { global.Store.reset(); logEntries = []; renderLog(); location.hash = '#/login'; render(); }
      else { rs.dataset.armed = '1'; rs.textContent = '정말 초기화 (다시 클릭)'; setTimeout(function () { delete rs.dataset.armed; rs.textContent = '데모 초기화'; }, 3000); }
    };
  }
  /* 로그인 화면(no-shell)에서도 초기화 버튼이 필요하다 → 로그인 뷰가 자체 버튼을 그린다(views.js) */
  function resetDemo() { global.Store.reset(); logEntries = []; renderLog(); location.hash = '#/login'; render(); }

  // ---- API 로그 패널 -------------------------------------------
  var logEntries = [];
  function renderLog() {
    var last = logEntries[0], el = document.getElementById('apilogLast');
    if (last) el.innerHTML = line(last);
    document.getElementById('apilogBody').innerHTML = logEntries.slice(0, 12).map(function (e) {
      return '<div class="ent"><span class="' + cls(e.status) + '">' + e.status + '</span><span class="code">' + e.method + ' ' + h(e.path) + ' <span style="opacity:.5">' + h(e.operationId) + '</span></span>' +
        (e.body ? '<pre>→ ' + h(JSON.stringify(e.body)) + '</pre>' : '') + '<pre>← ' + h(JSON.stringify(e.response).slice(0, 600)) + '</pre></div>';
    }).join('');
  }
  function cls(s) { return s >= 400 ? 's4' : 's2'; }
  function line(e) { return '<span class="' + cls(e.status) + '">' + e.status + '</span> &nbsp;' + e.method + ' ' + h(e.path) + ' <span style="opacity:.5">· ' + h(e.operationId) + (e.status >= 400 ? ' · ' + h(e.response.code) : '') + '</span>'; }

  // ---- 시작 ----------------------------------------------------
  global.Store.load();
  var viol = global.Seed.check(global.Seed.build());
  if (viol.length) console.warn('seed.check 위반', viol); else console.log('seed.check 위반 0');
  global.Api.onLog(function (e) { logEntries.unshift(e); renderLog();
    var box = document.getElementById('apilog'); box.classList.remove('err'); if (e.status >= 400) { void box.offsetWidth; box.classList.add('err'); } });
  document.getElementById('apilogBar').onclick = function () { document.getElementById('apilog').classList.toggle('open'); };
  window.addEventListener('hashchange', render);

  global.App = { h: h, ICON: ICON, avatarCls: avatarCls, initials: initials, resetDemo: resetDemo, dLabel: dLabel, dShort: dShort, dow: dow, tLabel: tLabel, dtLabel: dtLabel, dtFull: dtFull, shiftTag: shiftTag, shiftShort: shiftShort, badge: badge, roleBadge: roleBadge, errBox: errBox, go: go, render: render, SHIFT: SHIFT, STATUS_KO: STATUS_KO, teamOf: teamOf, parse: parse };
  render();
})(window);
