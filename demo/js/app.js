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
  var NAV = {
    HEAD_NURSE: [['dashboard', '병동 대시보드'], ['shifts', '확정 근무 등록'], ['board', '역할 · 인계 담당 배정'], ['template', '병동 인계 항목'], ['history', '변경 이력']],
    NURSE: [['me', '내 근무 · 우리 팀 환자'], ['myhistory', '내 인계 이력']]
  };
  function renderTop(me, r) {
    var top = document.getElementById('top');
    var nav = me ? '<div class="nav">' + NAV[me.user_type].map(function (n) { return '<a href="#/' + n[0] + '" class="' + (r.name === n[0] ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') + '</div>' : '';
    top.innerHTML = '<div class="brand">너와나의인계고리 <small>5병동 · 시연 데모 · 가상 데이터</small></div>' + nav + '<div class="sp"></div>' +
      (me ? '<div class="who">' + whoLabel(me) + '</div><button class="btn-ghost" id="switchUser">사용자 전환</button>' : '') +
      '<button class="btn-ghost reset" id="resetDemo">데모 초기화</button>';
    var sw = document.getElementById('switchUser'); if (sw) sw.onclick = function () { go('#/login'); };
    var rs = document.getElementById('resetDemo');
    rs.onclick = function () {
      if (rs.dataset.armed) { global.Store.reset(); logEntries = []; renderLog(); location.hash = '#/login'; render(); }
      else { rs.dataset.armed = '1'; rs.textContent = '정말 초기화 (다시 클릭)'; setTimeout(function () { delete rs.dataset.armed; rs.textContent = '데모 초기화'; }, 3000); }
    };
  }

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
  global.Api.onLog(function (e) { logEntries.unshift(e); renderLog(); });
  document.getElementById('apilogBar').onclick = function () { document.getElementById('apilog').classList.toggle('open'); };
  window.addEventListener('hashchange', render);

  global.App = { h: h, dLabel: dLabel, dShort: dShort, dow: dow, tLabel: tLabel, dtLabel: dtLabel, dtFull: dtFull, shiftTag: shiftTag, shiftShort: shiftShort, badge: badge, roleBadge: roleBadge, errBox: errBox, go: go, render: render, SHIFT: SHIFT, STATUS_KO: STATUS_KO, teamOf: teamOf, parse: parse };
  render();
})(window);
