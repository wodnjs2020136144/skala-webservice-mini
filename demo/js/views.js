/* ============================================================
 * views.js — 화면 11개. 각 함수는 { html, bind(root) } 를 돌려준다.
 * 화면은 Api.invoke 만 호출한다. 규칙은 api.js(T6 구현)에 있다.
 * ============================================================ */
(function (global) {
  'use strict';
  var A = function () { return global.App; };
  var I = function (n, p) { return global.Api.invoke(n, p); };
  var S = function () { return global.Store; };
  var WARD = 5;
  function h(s) { return A().h(s); }
  function sel(root, q) { return root.querySelector(q); }
  function all(root, q) { return [].slice.call(root.querySelectorAll(q)); }
  function showErr(root, e) { var b = sel(root, '#err'); if (b) { b.innerHTML = A().errBox(e); b.scrollIntoView({ block: 'nearest' }); } else alert(e.message); }
  function ok(root, msg) { var b = sel(root, '#err'); if (b) b.innerHTML = '<div class="ok">' + msg + '</div>'; }
  function crumb(parent, parentHash, cur) { return '<div class="crumb"><a href="' + parentHash + '">' + parent + '</a> &rsaquo; <b>' + cur + '</b></div>'; }
  function onAct(root, map) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el || !root.contains(el)) return;
      var fn = map[el.dataset.act]; if (!fn) return;
      e.preventDefault();
      try { fn(el, e); } catch (err) { showErr(root, err); }
    });
  }
  var DATES = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];
  function dateOpts(cur) { return DATES.map(function (d) { return '<option value="' + d + '"' + (d === cur ? ' selected' : '') + '>' + d + ' (' + A().dow(d).slice(0, 1) + ')</option>'; }).join(''); }
  function shiftOpts(cur, withAll) { return (withAll ? '<option value="">전체 근무조</option>' : '') + ['D', 'E', 'N'].map(function (c) { return '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + A().shiftShort(c) + ' ' + A().SHIFT[c].time + '</option>'; }).join(''); }

  var V = {};

  V.notfound = function () { return { html: '<div class="wrap"><h1>화면이 없습니다</h1><div class="foot"><a href="#/">처음으로</a></div></div>' }; };

  // ---- 1. 로그인 → 데모에서는 사용자 선택 (인증은 외부 시스템 가정 · T6-b) ----
  V.login = function () {
    var db = S().db, today = S().today;
    function shifts(u) {
      return db.shift_assignment.filter(function (s) { return s.user_id === u.id && s.work_date >= today; })
        .sort(function (a, b) { return global.Seed.shiftIndex(a) - global.Seed.shiftIndex(b); }).slice(0, 2)
        .map(function (s) { var r = db.role_type.filter(function (r) { return r.id === s.role_type_id; })[0]; return A().dShort(s.work_date) + ' ' + s.shift_code + ' · ' + (r ? r.name : '역할 미배정') + (s.status === 'ABSENT' ? ' · <span style="color:#B3261E">결원</span>' : ''); }).join('<br>') || '<span style="opacity:.6">오늘 이후 근무 없음</span>';
    }
    var cards = db.users.slice().sort(function (a, b) { return (a.user_type === 'HEAD_NURSE' ? 0 : 1) - (b.user_type === 'HEAD_NURSE' ? 0 : 1) || a.id.localeCompare(b.id); }).map(function (u) {
      var head = u.user_type === 'HEAD_NURSE';
      var order = { H001: 1, N003: 2, N004: 3, N006: 4 }[u.id];
      return '<button class="ucard' + (head ? ' head' : '') + '" data-act="pick" data-id="' + u.id + '">' + (order ? '<span class="order" title="시연 순서">' + order + '</span>' : '') + '<span class="avatar ' + A().avatarCls(u) + '">' + h(A().initials(u)) + '</span><div><div class="nm">' + h(u.name) + '</div><div class="rl">' + (head ? '수간호사 · 5병동' : '간호사 · ' + h(A().teamOf(u))) + ' <span class="code">' + u.id + '</span></div><div class="sh">' + shifts(u) + '</div></div></button>';
    }).join('');
    return {
      html: '<div class="login"><div class="left"><h1>너와나의인계고리</h1><p>근무표가 끝나는 지점에서 시작합니다.<br>누가 인계를 맡았고 누가 받아 확인했는지 한 줄로 잇습니다.</p><div class="bar"></div><ul><li>· 오늘 내 역할과 우리 팀 환자</li><li>· 병동 공통 인계 항목</li><li>· 받았다는 기록</li></ul></div>' +
        '<div class="right"><h2>로그인 — 데모에서는 사용자를 고릅니다</h2><div class="hint">실제 서비스는 병원 사번으로 로그인합니다(401 시 "사번 또는 비밀번호가 올바르지 않습니다").<br>인증은 <b>외부 시스템을 가정</b>해 API 명세 범위 밖입니다. 인가는 <span class="code">users.user_type</span> · 소속 병동 · 인계 담당 여부로 판정합니다.<br><b>모든 인물·입원 건은 가상입니다.</b></div>' +
        '<div class="ucards">' + cards + '</div>' +
        '<div class="warn">시연 순서 — ① <b>김수진</b>(배정) → ② <b>한서윤</b>(작성·전달) → ③ <b>정하늘</b>(요약·확인) → ④ <b>최서연</b>(열람만 · 403) → ① <b>김수진</b>(한가람 결원 재배정 4단계 · 변경 이력) → ④ <b>최서연</b>(후속 인계 확인)</div>' +
        '<div class="bar2"><span class="sp"></span><button class="btn-ghost reset" data-act="reset">데모 초기화 (시드 복원)</button></div></div></div>',
      bind: function (root) { onAct(root, { pick: function (el) { S().setUser(el.dataset.id); A().go(S().me().user_type === 'HEAD_NURSE' ? '#/dashboard' : '#/me'); }, reset: function () { A().resetDemo(); } }); }
    };
  };

  // ---- 2. 병동 대시보드 ----------------------------------------
  V.dashboard = function () {
    var d = I('getWardDashboard', { wardId: WARD });
    var total = d.shift_counts.reduce(function (s, x) { return s + x.headcount; }, 0);
    var roles = {}; d.role_counts.forEach(function (r) { roles[r.role_name] = (roles[r.role_name] || 0) + r.headcount; });
    var roleStr = Object.keys(roles).map(function (k) { return k + ' ' + roles[k]; }).join(' · ') || '—';
    var rows = d.uncovered_absences.map(function (a) {
      return '<tr><td class="bed">' + h(a.user_name) + '</td><td>' + h(a.team_name || '—') + ' · ' + h(a.role_name || '미배정') + '</td><td>' + A().dLabel(a.work_date) + ' ' + A().shiftTag(a.shift_code, true) + '</td><td>' + h(a.absence_reason || '—') + '</td><td class="act"><a class="btn" href="#/reassign/' + a.shift_assignment_id + '">재배정</a></td></tr>';
    }).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:28px">대체 전 결원이 없습니다</td></tr>';
    return { html: '<div class="wrap"><h1>병동 대시보드</h1><div class="sub">' + A().dLabel(d.date, true) + ' 기준 · <span class="code">GET /wards/5/dashboard?date=' + d.date + '</span></div><div id="err"></div>' +
      '<div class="tiles"><div class="tile"><div class="lb"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.2 3.2 0 0 1 0 7"/><path d="M18 14c2 .6 3 2.4 3 5"/></svg></span>오늘 근무자 수</div><div class="vl">' + total + '<small>명</small></div><div class="sub2">' + d.shift_counts.map(function (x) { return x.shift_code + ' ' + x.headcount; }).join(' · ') + ' · ACTIVE 만</div><div class="src">shift_counts[]</div></div>' +
      '<div class="tile"><div class="lb"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg></span>역할별 배정 인원</div><div class="vl">' + Object.keys(roles).filter(function (k) { return k !== '미배정'; }).length + '<small>역할</small></div><div class="sub2">' + h(roleStr) + '</div><div class="src">role_counts[] · 필요 인원 분모 없음</div></div>' +
      '<div class="tile"><div class="lb"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg></span>미확인 인계 건수</div><div class="vl">' + d.unconfirmed_handover_count + '<small>건</small></div><div class="sub2">status = SENT · 날짜 무관 · SUPERSEDED 자동 제외</div><div class="src">unconfirmed_handover_count</div></div>' +
      '<div class="tile' + (d.uncovered_absences.length ? ' alert' : '') + '"><div class="lb"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.5"/></svg></span>결원 — 대체 전</div><div class="vl">' + d.uncovered_absences.length + '<small>건</small></div><div class="sub2">ABSENT 이고 covered_at 없음</div><div class="src">uncovered_absences[]</div></div></div>' +
      '<div class="card"><div class="card-h"><span class="date" style="font-size:17px">대체 전 결원</span><span class="sp"></span>' + (d.uncovered_absences.length ? '<span class="flag">재배정 필요</span>' : '') + '</div><table><thead><tr><th style="width:150px">근무자</th><th style="width:140px">팀 · 역할</th><th style="width:260px">근무</th><th>결원 사유</th><th style="width:140px"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="warn">결원은 <b>수간호사가 등록</b>합니다. 자동 감지가 아닙니다. 대체 완료도 <b>"대체 완료로 확인"</b> 버튼으로 사람이 확정합니다.</div>' +
      '<div class="bar2" style="flex-wrap:wrap"><a class="btn sec" href="#/shifts">확정 근무 등록</a><a class="btn sec" href="#/board">역할 · 인계 담당 배정</a><a class="btn sec" href="#/template">병동 인계 항목 관리</a><a class="btn sec" href="#/board">결원 등록 · 재배정 (배정 보드에서)</a><a class="btn sec" href="#/history">변경 이력</a></div>' +
      '<div class="foot" style="color:#7A8A90">⚠️ <b>인계 미작성 N건</b>은 넣지 않습니다 — EMR 연동이 없어 "작성해야 했는데 안 쓴 건"을 셀 수 없습니다.</div></div>' };
  };

  // ---- 3. 확정 근무 등록 (F-01) ----------------------------------
  var shiftsState = { date: '2026-09-17', shift: '', pending: [] };
  V.shifts = function () {
    var st = shiftsState;
    var list = I('listShiftAssignments', { wardId: WARD, date: st.date, shift_code: st.shift || undefined }).items;
    var nurses = S().db.users.filter(function (u) { return u.user_type === 'NURSE'; });
    var userOpts = '<option value="">근무자 선택</option>' + nurses.map(function (u) { return '<option value="' + u.id + '">' + h(u.name) + ' (' + h(A().teamOf(u)) + ')</option>'; }).join('');
    var pend = st.pending.map(function (p, i) {
      var u = nurses.filter(function (u) { return u.id === p.user_id; })[0];
      return '<div class="inrow"><span>' + p.work_date + '</span><span>' + A().shiftTag(p.shift_code, true) + '</span><span>' + h(u.name) + ' (' + h(A().teamOf(u)) + ')</span><button class="btn sec sm" data-act="rm" data-i="' + i + '">빼기</button></div>';
    }).join('');
    var rows = list.map(function (s) {
      var abs = s.status === 'ABSENT';
      return '<tr><td class="bed">' + h(s.user_name) + '</td><td>' + h(s.team_name || '—') + '</td><td>' + A().shiftTag(s.shift_code, true) + '</td><td>' + A().roleBadge(s.role_name) + '</td><td' + (abs ? ' style="color:#B3261E;font-weight:600"' : '') + '>' + s.status + (s.covered_at ? ' · 대체 완료' : '') + '</td><td class="act muted">' + (abs ? '<a href="#/reassign/' + s.shift_assignment_id + '">재배정 화면에서</a>' : '역할은 배정 화면에서') + '</td></tr>';
    }).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">등록된 근무가 없습니다</td></tr>';
    return {
      html: '<div class="wrap">' + crumb('병동 대시보드', '#/dashboard', '확정 근무 등록') + '<h1>확정 근무 등록</h1><div class="sub">근무표가 확정된 뒤 등록합니다. <b>역할은 여기서 정하지 않습니다</b> — 배정 화면에서 붙입니다.</div><div id="err"></div>' +
        '<div class="bar2"><select class="sel" id="fDate">' + dateOpts(st.date) + '</select><select class="sel" id="fShift">' + shiftOpts(st.shift, true) + '</select><span class="sp"></span><span style="font-size:14px;color:#5B6B70">등록된 근무 <b style="color:#1E2B30">' + list.length + '건</b></span></div>' +
        '<div class="card"><div class="card-h"><span class="date" style="font-size:17px">근무 추가</span><span class="sp"></span><span class="code">POST /wards/5/shift-assignments</span></div>' +
        '<div class="inrow"><input class="inp" id="nDate" type="date" value="' + st.date + '"><select class="sel" id="nShift">' + shiftOpts('D') + '</select><select class="sel" id="nUser">' + userOpts + '</select><button class="btn sec" data-act="add">행 추가</button></div>' + pend +
        '<div class="row-actions" style="padding:0 24px 18px;margin-top:14px"><button class="btn sec" data-act="clear">되돌리기</button><button class="btn" data-act="save">저장 (' + st.pending.length + '건)</button></div></div>' +
        '<div class="card"><div class="card-h"><span class="date" style="font-size:17px">등록된 근무</span><span class="sp"></span><span class="code">GET /wards/5/shift-assignments?date=' + st.date + (st.shift ? '&shift_code=' + st.shift : '') + '</span></div><table><thead><tr><th style="width:150px">근무자</th><th style="width:110px">팀</th><th style="width:200px">근무조</th><th style="width:170px">역할</th><th>상태</th><th style="width:170px"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="warn">등록 취소(삭제)는 <b>이번 범위 밖</b>입니다 — F-01 은 조회·등록만 정의합니다.<br>같은 사람이 같은 날 같은 근무조에 두 번 등록되면 <b>409</b> 로 거부됩니다.<br>다른 병동 소속자의 <b>지원 근무는 허용</b>합니다 — 소속(<span class="code">users.ward_id</span>)과 근무 병동은 다른 값입니다.</div></div>',
      bind: function (root) {
        sel(root, '#fDate').onchange = function (e) { st.date = e.target.value; A().render(); };
        sel(root, '#fShift').onchange = function (e) { st.shift = e.target.value; A().render(); };
        onAct(root, {
          add: function () { var u = sel(root, '#nUser').value; if (!u) { showErr(root, { status: 422, code: 'USER_REQUIRED', message: '근무자를 선택하세요' }); return; } st.pending.push({ user_id: u, work_date: sel(root, '#nDate').value, shift_code: sel(root, '#nShift').value }); A().render(); },
          rm: function (el) { st.pending.splice(+el.dataset.i, 1); A().render(); },
          clear: function () { st.pending = []; A().render(); },
          save: function () { if (!st.pending.length) { showErr(root, { status: 422, code: 'ITEMS_REQUIRED', message: '추가한 행이 없습니다' }); return; } var r = I('createShiftAssignments', { wardId: WARD, body: { items: st.pending } }); st.pending = []; st.date = r.items[0].work_date; A().render(); ok(sel(document, '#view'), '<b>' + r.items.length + '건 등록되었습니다 (201).</b> 역할은 배정 보드에서 붙입니다.'); }
        });
      }
    };
  };

  // ---- 4. 역할 · 인계 담당 배정 (F-02) ---------------------------
  var boardState = { date: '2026-09-16', shift: 'N', open: null, changed: {} };
  V.board = function () {
    var st = boardState;
    var b = I('getAssignmentBoard', { wardId: WARD, date: st.date, shift_code: st.shift });
    var roles = S().db.role_type;
    var counts = {}; b.rows.forEach(function (r) { var k = r.status === 'ABSENT' ? '결원' : (r.role_name || '미배정'); counts[k] = (counts[k] || 0) + 1; });
    var unassigned = b.rows.filter(function (r) { return r.status === 'ACTIVE' && !r.role_name; }).map(function (r) { return r.user_name; });
    var rows = b.rows.map(function (r) {
      var abs = r.status === 'ABSENT';
      var roleCell = abs ? '<span class="role none">' + h(r.role_name || '미배정') + ' · 결원</span>' :
        '<select class="sel sm" data-role="' + r.shift_assignment_id + '"><option value="">역할 선택</option>' + roles.map(function (x) { return '<option value="' + x.id + '"' + ((st.changed[r.shift_assignment_id] != null ? st.changed[r.shift_assignment_id] : r.role_type_id) === x.id ? ' selected' : '') + '>' + h(x.name) + '</option>'; }).join('') + '</select>';
      var chips = r.handover_assignments.map(function (a) { return '<span class="chip">' + h(a.bed_no) + '</span>'; }).join('');
      var covered = abs && S().db.shift_assignment.filter(function (s) { return s.id === r.shift_assignment_id; })[0].covered_at;
      if (abs) chips += '<span class="chip" style="background:' + (covered ? '#E8F5E9;border-color:#BEE3C2;color:#256B2C' : '#FFEDEE;border-color:#F5C6C4;color:#B3261E') + '">' + (covered ? '대체 완료' : '대체자 미배정') + '</span>';
      else {
        var cand = b.team_stays.filter(function (s) { return s.team_id === r.team_id && !r.handover_assignments.some(function (a) { return a.inpatient_stay_id === s.inpatient_stay_id; }); });
        if (st.open === r.shift_assignment_id) chips += '<div class="chips" style="margin-top:8px">' + (cand.length ? cand.map(function (s) { return '<label><input type="checkbox" data-stay="' + s.inpatient_stay_id + '"> ' + h(s.bed_no) + '</label>'; }).join('') + '<button class="btn sm" data-act="assign" data-sa="' + r.shift_assignment_id + '">지정</button>' : '<span class="muted">이 팀의 재원 건은 모두 지정됨</span>') + ' <button class="btn sec sm" data-act="close">닫기</button></div>';
        else chips += '<span class="chip add" data-act="open" data-sa="' + r.shift_assignment_id + '">+ 인계 담당 추가</span>';
        if (!r.handover_assignments.length && st.open !== r.shift_assignment_id) chips = '<span class="muted">팀 공동 담당 · 인계는 열람</span> ' + chips;
      }
      var act = abs ? '<a class="btn" href="#/reassign/' + r.shift_assignment_id + '">결원 재배정</a>' : '<a class="btn sec" href="#/reassign/' + r.shift_assignment_id + '">결원 등록</a>';
      return '<tr><td class="bed">' + h(r.user_name) + '</td><td>' + roleCell + '</td><td>' + h(r.team_name || '—') + '</td><td>' + chips + '</td><td class="act">' + act + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="padding:0"><div class="empty"><div class="ttl">이 근무조에 등록된 근무가 없습니다</div><a class="next" href="#/shifts">다음 할 일 — 확정 근무 등록에서 먼저 등록합니다</a></div></td></tr>';
    return {
      html: '<div class="wrap">' + crumb('병동 대시보드', '#/dashboard', '역할 · 인계 담당 배정') + '<h1>역할 · 인계 담당 배정</h1><div class="sub">저장하면 간호사 화면에 즉시 반영됩니다. 별도 게시 단계가 없습니다.</div><div id="err"></div>' +
        '<div class="bar2"><select class="sel" id="bDate">' + dateOpts(st.date) + '</select><select class="sel" id="bShift">' + shiftOpts(st.shift) + '</select><span class="sp"></span><span style="font-size:14px;color:#5B6B70">역할별 배정 인원 &nbsp;<b style="color:#1E2B30">' + (Object.keys(counts).map(function (k) { return k + ' ' + counts[k]; }).join(' · ') || '—') + '</b></span></div>' +
        '<div class="card"><table><thead><tr><th style="width:150px">근무자</th><th style="width:190px">역할</th><th style="width:90px">팀</th><th>인계 담당 입원 건 (병상) — 팀 차지</th><th style="width:150px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div style="padding:14px 24px;font-size:14px;color:#5B6B70;background:#FAFCFC;border-top:1px solid #EDF2F4">팀 환자는 팀이 공동으로 봅니다. 여기서 지정하는 것은 입원 건별 <b>인계 담당(작성·수신할 차지)</b>이며, 기본값은 그 근무의 팀 차지입니다. 역할·팀은 DB·API 가 강제하지 않습니다 — 수간호사의 지정으로 기록합니다.</div></div>' +
        (unassigned.length ? '<div class="warn">' + h(unassigned.join(' · ')) + ' 간호사의 <b>역할이 배정되지 않았습니다.</b> 역할 없이 저장하면 해당 간호사 화면에 "역할 배정 대기"로 표시됩니다.</div>' : '') +
        '<div class="row-actions"><button class="btn sec" data-act="revert">되돌리기</button><button class="btn" data-act="save">저장 · 즉시 반영</button></div>' +
        '<div class="src" style="margin-top:12px">GET /wards/5/assignment-board?date=' + st.date + '&shift_code=' + st.shift + ' · PATCH /shift-assignments/{id} · POST /shift-assignments/{id}/handover-assignments</div></div>',
      bind: function (root) {
        sel(root, '#bDate').onchange = function (e) { st.date = e.target.value; st.open = null; st.changed = {}; A().render(); };
        sel(root, '#bShift').onchange = function (e) { st.shift = e.target.value; st.open = null; st.changed = {}; A().render(); };
        all(root, '[data-role]').forEach(function (s) { s.onchange = function () { st.changed[s.dataset.role] = s.value ? +s.value : null; }; });
        onAct(root, {
          open: function (el) { st.open = +el.dataset.sa; A().render(); },
          close: function () { st.open = null; A().render(); },
          assign: function (el) {
            var ids = all(root, '[data-stay]:checked').map(function (c) { return +c.dataset.stay; });
            I('assignHandoverOwnership', { shiftAssignmentId: +el.dataset.sa, body: { inpatient_stay_ids: ids } }); st.open = null; A().render();
          },
          revert: function () { st.changed = {}; A().render(); },
          save: function () {
            var ks = Object.keys(st.changed); if (!ks.length) { ok(root, '바뀐 역할이 없습니다. 인계 담당 지정은 행마다 즉시 반영됩니다.'); return; }
            ks.forEach(function (k) { I('updateShiftAssignmentRole', { shiftAssignmentId: +k, body: { role_type_id: st.changed[k] } }); });
            st.changed = {}; A().render(); ok(sel(document, '#view'), '<b>역할 ' + ks.length + '건 저장 · 즉시 반영되었습니다.</b> 간호사 화면(내 근무)에 바로 보입니다.');
          }
        });
      }
    };
  };

  // ---- 5. 병동 인계 항목 관리 (F-06) ------------------------------
  var tplState = { rows: null };
  V.template = function () {
    var st = tplState; var me = S().me();
    if (!st.rows) st.rows = I('listHandoverTemplateItems', { wardId: WARD }).items.map(function (t) { return { label: t.label, is_required: t.is_required, sort_order: t.sort_order }; });
    var rows = st.rows.map(function (r, i) {
      return '<div class="itm"><input class="inp sm" type="number" data-f="sort_order" data-i="' + i + '" value="' + r.sort_order + '"><input class="inp sm" data-f="label" data-i="' + i + '" value="' + h(r.label) + '"><label class="chk"><input type="checkbox" data-f="is_required" data-i="' + i + '"' + (r.is_required ? ' checked' : '') + '> ' + (r.is_required ? '<span class="req">필수</span>' : '<span class="opt">선택</span>') + '</label><button class="btn sec sm" data-act="rm" data-i="' + i + '">삭제</button></div>';
    }).join('');
    return {
      html: '<div class="wrap">' + crumb('병동 대시보드', '#/dashboard', '병동 인계 항목 관리') + '<h1>병동 인계 항목 관리</h1><div class="sub">이 병동의 <b>모든 인계</b>가 쓰는 공통 항목입니다. <b>역할별로 갈리지 않습니다</b> — 인계는 차지가 받고, 액팅은 옆에서 같은 인계를 듣습니다.</div><div id="err"></div>' +
        '<div class="two"><div><div class="card"><div class="card-h"><span class="date" style="font-size:17px">항목 목록</span><span class="sp"></span><span class="code">GET · PUT /wards/5/handover-template-items</span></div><div class="itm" style="padding:8px 24px;background:#FAFCFC"><span class="src">순서</span><span class="src">항목명</span><span class="src">필수</span><span></span></div>' + rows + '</div>' +
        '<div class="bar2"><button class="btn sec" data-act="add">+ 항목 추가</button></div>' +
        '<div class="warn"><b>필수</b>로 표시한 항목이 비어 있으면 인계를 <b>넘길 수 없습니다 (422)</b>.<br>순서가 중복되면 저장이 <b>422</b> 로 거부됩니다.</div>' +
        '<div class="row-actions"><button class="btn sec" data-act="revert">되돌리기</button><button class="btn" data-act="save">저장</button></div></div>' +
        '<div class="side"><h3>항목을 고치면 어떻게 되나</h3><div class="kv">이미 작성된 인계의 항목은 <b>바뀌지 않습니다</b><br>복사는 <b>인계 생성 시점에 1회</b>뿐입니다<br>작성 중(DRAFT)인 인계도 예외가 아닙니다</div>' +
        '<div class="kv" style="border-top:1px solid #E4EBED;padding-top:14px;margin-top:18px;color:#7A8A90;font-size:13px;line-height:1.7">항목 구성은 <b style="color:#1E2B30">2014년 국내 인수인계 표준화 연구의 7개 범주</b>를 참고해<br><b style="color:#1E2B30">이번 서비스가 정한 템플릿 설계안</b>입니다.<br>필수·선택 구분은 <b style="color:#1E2B30">연구 원문이 아닙니다.</b></div>' +
        '<div class="kv" style="border-top:1px solid #E4EBED;padding-top:14px;margin-top:18px">쓰기 <b>해당 병동 수간호사만</b><br>조회 <b>같은 병동 간호사도 가능</b><br><span style="color:#7A8A90">그 외 403' + (me.user_type !== 'HEAD_NURSE' ? ' — 지금은 간호사로 보고 있으므로 저장하면 403' : '') + '</span></div></div></div></div>',
      bind: function (root) {
        root.addEventListener('input', function (e) { var el = e.target; if (!el.dataset.f) return; var r = st.rows[+el.dataset.i]; r[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value; });
        root.addEventListener('change', function (e) { if (e.target.dataset.f === 'is_required') A().render(); });
        onAct(root, {
          add: function () { st.rows.push({ label: '', is_required: false, sort_order: st.rows.reduce(function (m, r) { return Math.max(m, r.sort_order); }, 0) + 1 }); A().render(); },
          rm: function (el) { st.rows.splice(+el.dataset.i, 1); A().render(); },
          revert: function () { st.rows = null; A().render(); },
          save: function () { var r = I('replaceHandoverTemplateItems', { wardId: WARD, body: { items: st.rows } }); st.rows = null; A().render(); ok(sel(document, '#view'), '<b>' + r.items.length + '개 항목으로 교체되었습니다.</b> 이미 만들어진 인계(DRAFT 포함)의 항목은 그대로입니다 — 인계 화면에서 확인해 보세요.'); }
        });
      }
    };
  };

  // ---- 6. 결원 등록 · 재배정 (F-05) -------------------------------
  var rsState = {};
  V.reassign = function (id) {
    id = +id; var c = I('getReassignmentContext', { shiftAssignmentId: id }); var a = c.absent;
    var isAbsent = a.status === 'ABSENT', sub = c._substitute, covered = !!a.covered_at;
    var logAt = function (t) { var l = c._logs.filter(function (l) { return l.change_type === t; }).pop(); return l ? A().tLabel(l.changed_at) : ''; };
    var head = h(a.user_name) + ' 간호사 · ' + A().dLabel(a.work_date) + ' ' + A().shiftShort(a.shift_code) + ' · <b>' + h(a.team_name || '—') + ' ' + h(a.role_name || '역할 미배정') + '</b>';
    var step1 = isAbsent ? '<div class="step done"><div class="no">① 완료</div><div class="ti">결원 등록</div><div class="ds">사유: ' + h(a.absence_reason) + '<br>status → ABSENT</div><div class="src">POST /shift-assignments/' + id + '/absence</div><button class="btn sec" disabled>등록됨 ' + logAt('ABSENCE_REGISTERED') + '</button></div>'
      : '<div class="step now"><div class="no">① 진행 중</div><div class="ti">결원 등록</div><div class="ds">사람이 사유를 쓰는 <b>유일한 지점</b>. 나머지 세 로그는 이 값을 복사합니다</div><div class="src">POST /shift-assignments/' + id + '/absence</div><textarea id="reason" placeholder="결원 사유 (필수 · 비우면 422)"></textarea><button class="btn" data-act="absence">결원 등록</button></div>';
    var step2 = sub ? '<div class="step done"><div class="no">② 완료</div><div class="ti">대체자 배정</div><div class="ds">대체자: <b>' + h(sub.user_name) + '</b><br>사유는 ①에서 복사됨</div><div class="src">POST /shift-assignments/' + id + '/substitute</div><button class="btn sec" disabled>배정됨 ' + logAt('SUBSTITUTE_ASSIGNED') + '</button></div>'
      : '<div class="step' + (isAbsent ? ' now' : '') + '"><div class="no">② ' + (isAbsent ? '진행 중' : '대기') + '</div><div class="ti">대체자 배정</div><div class="ds">같은 병동 · 같은 날 · 같은 근무조의 ACTIVE 근무자만 후보. 없던 사람이면 근무를 새로 만듭니다</div><div class="src">POST /shift-assignments/' + id + '/substitute</div>' +
        '<select class="sel" id="cand"><option value="">대체자 선택</option>' + c.candidates.map(function (x) { return '<option value="sa:' + x.shift_assignment_id + '">' + h(x.user_name) + ' (' + h(x.team_name || '—') + ' · ' + h(x.role_name || '역할 미배정') + ')</option>'; }).join('') +
        S().db.users.filter(function (u) { return u.user_type === 'NURSE' && u.id !== S().db.shift_assignment.filter(function (s) { return s.id === id; })[0].user_id && !c.candidates.some(function (x) { return x.user_name === u.name; }); }).map(function (u) { return '<option value="u:' + u.id + '">' + h(u.name) + ' (' + h(A().teamOf(u)) + ' · 이 근무에 없음 → 근무 생성)</option>'; }).join('') +
        '</select><button class="btn" data-act="substitute"' + (isAbsent ? '' : ' disabled') + '>' + (isAbsent ? '대체자 배정' : '결원 등록 후 가능') + '</button></div>';
    var pendN = c.pending_handover_assignments.length;
    var step3 = '<div class="step' + (sub && pendN && !covered ? ' now' : (sub && !pendN ? ' done' : '')) + '"><div class="no">③ ' + (sub ? (pendN ? '진행 중' : '이관할 담당 없음') : '대기') + '</div><div class="ti">인계 담당 이관</div><div class="ds">기존 담당은 REPLACED 로 남기고 새 행을 만듭니다. 해당 인계는 SUPERSEDED 가 되고 <b>후속 인계가 같은 트랜잭션에서 발행</b>됩니다. CONFIRMED 인 인계는 <b>409</b></div><div class="src">POST /shift-assignments/' + id + '/handover-transfer</div><button class="btn' + (sub && pendN ? '' : ' sec') + '" data-act="transfer"' + (sub && pendN ? '' : ' disabled') + '>' + (sub ? (pendN ? '아래에서 선택한 담당 이관' : '남은 담당 없음') : '대체자 배정 후 가능') + '</button></div>';
    var step4 = covered ? '<div class="step done"><div class="no">④ 완료</div><div class="ti">대체 완료로 확인</div><div class="ds">covered_at = ' + A().dtFull(a.covered_at) + '<br>사람이 확인한 기록입니다. 자동 증명이 아닙니다</div><div class="src">POST /shift-assignments/' + id + '/coverage-confirmation</div><button class="btn sec" disabled>확인됨 ' + logAt('COVER_CONFIRMED') + '</button></div>'
      : '<div class="step' + (sub ? ' now' : '') + '"><div class="no">④ ' + (sub ? '가능' : '대기') + '</div><div class="ti">대체 완료로 확인</div><div class="ds">사람이 확인한 기록입니다. 자동 증명이 아닙니다.<br>가드: 유효한 SUBSTITUTE_ASSIGNED 가 없으면 <b>422</b></div><div class="src">POST /shift-assignments/' + id + '/coverage-confirmation</div><button class="btn' + (sub ? '' : ' sec') + '" data-act="cover">' + (sub ? '대체 완료로 확인' : '대체 완료로 확인 (지금 누르면 422)') + '</button></div>';
    var pend = c.pending_handover_assignments.map(function (p) {
      return '<tr><td>' + (sub && !covered ? '<input type="checkbox" data-stay="' + p.inpatient_stay_id + '" checked>' : '') + '</td><td class="bed">' + h(p.bed_no) + '</td><td class="code">' + h(p.patient_ref_code) + '</td><td>' + A().badge(p.handover_status) + '</td><td class="act muted">' + (p.handover_status === 'CONFIRMED' ? '이관 시 409' : p.handover_status === 'NONE' ? '담당만 이관' : 'SUPERSEDED + 후속 발행') + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">이 사람 이름으로 남은 ACTIVE 인계 담당이 없습니다</td></tr>';
    var logs = c._logs.map(function (l) { return '<div class="ev ' + (l.change_type === 'ABSENCE_REGISTERED' ? 'reg' : l.change_type === 'COVER_CONFIRMED' ? 'conf' : '') + '"><div class="tm">' + A().dtFull(l.changed_at) + '</div><div class="ti" style="font-size:14px">' + h({ ABSENCE_REGISTERED: '결원 등록', SUBSTITUTE_ASSIGNED: '대체자 배정', HANDOVER_OWNER_TRANSFERRED: '인계 담당 이관', COVER_CONFIRMED: '대체 완료로 확인' }[l.change_type]) + '<span class="ct">' + l.change_type + '</span></div><div class="ds">' + (l.to_user_name ? '→ ' + h(l.to_user_name) + ' · ' : '') + (l.bed_no ? h(l.bed_no) + ' · ' : '') + '사유 <b>' + h(l.change_reason) + '</b></div></div>'; }).join('');
    return {
      html: '<div class="wrap">' + crumb('병동 대시보드', '#/dashboard', '결원 등록 · 재배정') + '<h1>결원 등록 · 재배정</h1><div class="sub">' + head + ' &nbsp;·&nbsp; <span class="code">GET /shift-assignments/' + id + '/reassignment-context</span></div><div id="err"></div>' +
        '<div class="steps">' + step1 + step2 + step3 + step4 + '</div>' +
        '<div class="card"><div class="card-h"><span class="date" style="font-size:17px">이 사람 이름으로 남은 인계 담당</span><span class="sp"></span>' + (pendN ? '<span class="flag">' + pendN + '건 — ④ 전에 확인</span>' : '') + '</div><table><thead><tr><th style="width:50px"></th><th style="width:150px">병상</th><th style="width:240px">입원 건</th><th>인계 상태</th><th style="width:200px"></th></tr></thead><tbody>' + pend + '</tbody></table></div>' +
        '<div class="warn">완료 확인 가드는 <b>대체 "근무"만</b> 봅니다. 결원자 이름으로 ACTIVE 인 인계 담당이 남아 있어도 ④ 는 통과합니다.<br>그래서 위 목록을 보여주고 <b>사람이 판단</b>합니다 — 그 사이 퇴원처럼 이관하지 않는 것이 정상인 경우가 있습니다.</div>' +
        '<div class="danger">대상 인계가 <b>CONFIRMED</b> 면 이관이 <b>409</b> 로 거부됩니다. 확인까지 끝난 인계는 닫힌 고리이고, 그 뒤의 담당 변경은 정상 교대입니다.</div>' +
        (logs ? '<div class="card"><div class="card-h"><span class="date" style="font-size:17px">이 결원 건의 이력</span><span class="sp"></span><span class="code">reassignment_log · from_shift_assignment_id = ' + id + '</span></div><div style="padding:4px 24px"><div class="tl">' + logs + '</div></div></div>' : '') + '</div>',
      bind: function (root) {
        onAct(root, {
          absence: function () { I('registerAbsence', { shiftAssignmentId: id, body: { change_reason: sel(root, '#reason').value } }); A().render(); },
          substitute: function () { var v = sel(root, '#cand').value; if (!v) { showErr(root, { status: 422, code: 'TARGET_REQUIRED', message: '대체자를 선택하세요' }); return; } var body = v.slice(0, 3) === 'sa:' ? { to_shift_assignment_id: +v.slice(3) } : { substitute_user_id: v.slice(2) }; I('assignSubstitute', { shiftAssignmentId: id, body: body }); A().render(); },
          transfer: function () { var ids = all(root, '[data-stay]:checked').map(function (x) { return +x.dataset.stay; }); var r = I('transferHandoverOwnership', { shiftAssignmentId: id, body: { to_shift_assignment_id: sub.shift_assignment_id, inpatient_stay_ids: ids } }); A().render(); ok(sel(document, '#view'), '<b>' + r.transferred.length + '건 이관.</b> ' + r.transferred.map(function (t) { return t.superseded_handover_id ? '인계 #' + t.superseded_handover_id + ' → SUPERSEDED, 후속 #' + t.successor_handover_id + ' 발행' : '담당만 이관(인계 없음)'; }).join(' · ')); },
          cover: function () { I('confirmCoverage', { shiftAssignmentId: id }); A().render(); }
        });
      }
    };
  };

  // ---- 7. 변경 이력 (F-05) ----------------------------------------
  var hsState = { from: '2026-09-10', to: '2026-09-17' };
  V.history = function () {
    var st = hsState; var items = I('listReassignmentLogs', { wardId: WARD, from: st.from, to: st.to }).items;
    var T = { ABSENCE_REGISTERED: '결원 등록', SUBSTITUTE_ASSIGNED: '대체자 배정', HANDOVER_OWNER_TRANSFERRED: '인계 담당 이관', COVER_CONFIRMED: '대체 완료로 확인' };
    var ev = items.map(function (l) {
      var w = A().dShort(l.from_work_date) + ' ' + l.from_shift_code, d;
      if (l.change_type === 'ABSENCE_REGISTERED') d = h(l.from_user_name) + ' (' + w + ' · ' + h(l.from_role_name || '역할 미배정') + ') · 사유 <b>' + h(l.change_reason) + '</b> — 사람이 사유를 쓰는 유일한 지점';
      else if (l.change_type === 'SUBSTITUTE_ASSIGNED') d = h(l.to_user_name) + ' 이(가) ' + w + ' 근무를 서기로 확정 · 사유 <b>' + h(l.change_reason) + '</b> (복사)';
      else if (l.change_type === 'HANDOVER_OWNER_TRANSFERRED') d = h(l.from_user_name) + ' → ' + h(l.to_user_name) + ' · 입원 건 <span class="code">' + h(l.patient_ref_code) + '</span> (' + h(l.bed_no) + ')<br>기존 인계는 <b>SUPERSEDED</b>, 후속 인계 발행됨 · 사유 <b>' + h(l.change_reason) + '</b> (복사)';
      else d = h(l.changed_by_user_name) + ' 수간호사가 확인 · 대상: ' + h(l.from_user_name) + ' (' + w + ') · 사유 <b>' + h(l.change_reason) + '</b> (결원 사유 복사)';
      return '<div class="ev ' + (l.change_type === 'ABSENCE_REGISTERED' ? 'reg' : l.change_type === 'COVER_CONFIRMED' ? 'conf' : '') + '"><div class="tm">' + A().dtFull(l.changed_at) + '</div><div class="ti">' + T[l.change_type] + '<span class="ct">' + l.change_type + '</span></div><div class="ds">' + d + '</div></div>';
    }).join('') || '<div class="empty"><div class="ttl">기간 안에 이력이 없습니다</div></div>';
    return {
      html: '<div class="wrap">' + crumb('병동 대시보드', '#/dashboard', '변경 이력') + '<h1>변경 이력</h1><div class="sub">결원 재배정 이력입니다. <b>역할만 바뀐 경우는 포함되지 않습니다</b> — 이번 범위에서는 "결원 재배정 이력"으로만 말합니다.</div><div id="err"></div>' +
        '<div class="bar2"><input class="inp" style="width:180px" type="date" id="hFrom" value="' + st.from + '"><span>~</span><input class="inp" style="width:180px" type="date" id="hTo" value="' + st.to + '"><button class="btn sec" data-act="q">조회</button><span class="sp"></span><span class="code">GET /wards/5/reassignment-logs?from=' + st.from + '&to=' + st.to + '</span></div>' +
        '<div class="card"><div style="padding:4px 24px"><div class="tl">' + ev + '</div></div></div>' +
        '<div class="warn">사유는 <b>결원 등록에서 한 번만</b> 입력합니다. 나머지 세 로그는 그 값을 <b>서버가 복사</b>합니다 — 사유가 달라지면 한 결원 건의 이력을 이어서 읽을 수 없기 때문입니다.</div></div>',
      bind: function (root) { onAct(root, { q: function () { st.from = sel(root, '#hFrom').value; st.to = sel(root, '#hTo').value; A().render(); } }); }
    };
  };

  // ---- 8. 내 근무 · 역할 · 우리 팀 환자 (F-03) ---------------------
  V.me = function () {
    var me = S().me(); var r = I('getMyShifts', {}); var today = S().today;
    var cards = r.shifts.map(function (s) {
      var anyOwner = s.team_stays.some(function (t) { return t.is_handover_owner; }), anyHo = s.team_stays.some(function (t) { return t.handover_status !== 'NONE' || t.outgoing_handover_id; });
      var body;
      if (!s.team_stays.length) body = '<div class="empty"><div class="ic">🛏</div><div class="ttl">우리 팀 재원 건이 없습니다</div><span class="next">입원이 생기면 자동으로 표시됩니다</span></div>';
      else if (!anyOwner && !anyHo && s.role_name === '차지') body = '<div class="empty"><div class="ic">🗂</div><div class="ttl">인계 담당 입원 건이 아직 지정되지 않았습니다</div><div class="dsc">근무와 역할(차지)은 확정되었습니다. 우리 팀 환자는 입·퇴원으로 매일 바뀌므로, 인계 담당 입원 건은 수간호사가 지정하면 여기에 표시됩니다.</div><span class="next">다음 할 일 — 수간호사가 배정 보드에서 지정합니다</span></div>';
      else {
        var rows = s.team_stays.map(function (t) {
          var acts = [], note = A().dShort(t.admitted_at) + ' 입원' + (t.admitted_at.slice(0, 10) === today ? ' · 신규' : '');
          // 화면 8 버튼 판정 (T6 서버 계산 ①-c) — 받을 것과 보낼 것은 별개 행위라 둘 다 가능하면 둘 다 보여준다
          if (t.handover_status === 'SENT' && t.incoming_to_me) acts.push('<a class="btn" href="#/handover/' + t.incoming_handover_id + '/receive">인계 확인</a>');
          else if (t.incoming_handover_id && t.handover_status !== 'DRAFT') acts.push('<a class="btn sec" href="#/handover/' + t.incoming_handover_id + '/receive">받은 인계 보기</a>');
          else if (t.handover_status === 'DRAFT') acts.push('<span class="muted">앞 근무가 작성 중 · 전달되면 확인</span>'); // R130: DRAFT 는 작성자만 본다
          if (t.is_handover_owner && !t.outgoing_handover_id) acts.push('<button class="btn' + (acts.length ? ' sec' : '') + '" data-act="create" data-stay="' + t.inpatient_stay_id + '" data-ha="' + t.handover_assignment_id + '">인계 작성</button>');
          else if (t.is_handover_owner && t.outgoing_status === 'DRAFT') acts.push('<a class="btn" href="#/handover/' + t.outgoing_handover_id + '/write">작성 계속 · DRAFT</a>');
          else if (t.outgoing_handover_id) acts.push('<a class="btn sec" href="#/handover/' + t.outgoing_handover_id + '/write">보낸 인계 보기</a>');
          var act = acts.join(' ') || '<span class="muted">작성은 팀 차지</span>';
          var outCell = t.is_handover_owner ? (t.outgoing_status ? A().badge(t.outgoing_status) : '<span class="muted">아직 작성 전</span>') : '<span class="muted">—</span>';
          return '<tr><td class="bed">' + h(t.bed_no) + (t.is_handover_owner ? ' <span class="chip" style="font-size:11px;padding:2px 7px">인계 담당</span>' : '') + '</td><td class="code">' + h(t.patient_ref_code) + '</td><td style="white-space:nowrap">' + note + '</td><td>' + A().badge(t.handover_status) + '</td><td>' + outCell + '</td><td class="act">' + act + '</td></tr>';
        }).join('');
        body = '<table><thead><tr><th style="width:170px">병상</th><th style="width:200px">입원 건</th><th style="white-space:nowrap">비고</th><th style="width:160px">받은 인계<br><span style="font-weight:500;text-transform:none;letter-spacing:0">앞 근무 → 나</span></th><th style="width:170px">보낸 인계<br><span style="font-weight:500;text-transform:none;letter-spacing:0">나 → 다음 근무</span></th><th style="width:270px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
          '<div style="padding:14px 24px;font-size:14px;color:#5B6B70;background:#FAFCFC;border-top:1px solid #EDF2F4">' + (anyOwner ? '이 근무의 <b>인계 담당</b>입니다. 작성은 다음 근무 팀 차지에게, 확인은 앞 근무에서 받은 인계에 합니다.' : '액팅은 우리 팀 인계를 <b>열람</b>합니다. 인계 작성·확인은 이 근무의 <b>' + h(s.team_name) + ' 차지(인계 담당)</b>가 합니다.') + '</div>';
      }
      return '<div class="card"><div class="card-h' + (s.work_date === today ? ' today' : '') + '"><span class="date">' + A().dLabel(s.work_date).replace(/\(.\)$/, '') + '</span><span class="dow">' + A().dow(s.work_date) + (s.work_date === today ? ' · 오늘' : '') + '</span>' + A().shiftTag(s.shift_code) + A().roleBadge(s.role_name) + '<span class="role none">' + h(s.team_name || '—') + '</span><span class="sp"></span>' + (s.is_absent ? '<span class="flag" style="color:#B3261E;background:#FFEDEE;border-color:#F5C6C4">결원 (ABSENT)</span>' : '') + (s.has_reassignment ? '<span class="flag">결원 재배정 이력 있음</span>' : '') + '</div>' + body + '</div>';
    }).join('') || '<div class="card"><div class="empty"><div class="ic">📅</div><div class="ttl">오늘부터 다음 근무까지 등록된 근무가 없습니다</div><span class="next">다음 할 일 — 수간호사가 확정 근무 등록에서 등록합니다</span></div></div>';
    return {
      html: '<div class="wrap"><h1>내 근무 · 역할 · 우리 팀 환자</h1><div class="sub">' + A().dLabel(r.from, true) + ' ~ ' + A().dLabel(r.to) + ' · 오늘부터 다음 근무까지 표시됩니다 · <span class="code">GET /me/shifts</span></div><div id="err"></div>' + cards + '<div class="foot"><a href="#/myhistory">내 인계 이력 보기</a></div></div>',
      bind: function (root) { onAct(root, { create: function (el) { var r = I('createHandover', { body: { inpatient_stay_id: +el.dataset.stay, from_handover_assignment_id: +el.dataset.ha } }); A().go('#/handover/' + r.handover_id + '/write'); } }); }
    };
  };

  // ---- 9 · 10 · 11 공통: 인계 상세 ----------------------------------
  function loadHandover(id) { return I('getHandover', { handoverId: +id }); }
  function fieldsRead(d) { return d.items.map(function (i) { return '<div class="field"><div class="q">' + h(i.label) + ' ' + (i.is_required ? '<span class="req">필수</span>' : '<span class="opt">선택</span>') + '</div><div class="read"' + (!i.content ? ' style="color:#A9B7BC"' : '') + '>' + (h(i.content) || '(비어 있음)') + '</div></div>'; }).join(''); }
  function subLine(d) { return h(d.bed_no) + ' · ' + h(d.patient_ref_code) + ' &nbsp;·&nbsp; ' + h(d.team_name) + ' &nbsp;·&nbsp; ' + A().dLabel(d.from_work_date) + ' ' + d.from_shift_code + ' ' + A().SHIFT[d.from_shift_code].name + ' &rarr; ' + (d.to_work_date !== d.from_work_date ? A().dShort(d.to_work_date) + ' ' : '') + d.to_shift_code + ' ' + A().SHIFT[d.to_shift_code].name; }
  function party(d) { return '<div class="kv" style="border-top:1px solid #E4EBED;padding-top:14px;margin-top:18px">작성 &nbsp;<b>' + h(d.from_user_name) + ' 간호사</b> · ' + d.from_shift_code + ' ' + A().SHIFT[d.from_shift_code].name + ' · <b>' + h(d.team_name) + ' ' + h(d.from_role_name || '') + '</b><br>받는 사람 &nbsp;<b>' + h(d.to_user_name) + ' 간호사</b> · ' + d.to_shift_code + ' ' + A().SHIFT[d.to_shift_code].name + ' · <b>' + h(d.team_name) + ' ' + h(d.to_role_name || '') + '</b><br><span style="color:#7A8A90">인계는 이 입원 건의 인계 담당 차지만 작성할 수 있습니다 (403)<br>같은 팀 액팅은 전달된 인계를 열람합니다</span></div>'; }

  // ---- 9. 인계 작성 (F-04) -----------------------------------------
  V.handover = function (id, mode) { return mode === 'write' ? V.write(id) : V.receive(id); };
  V.write = function (id) {
    var d = loadHandover(id); var editable = d.status === 'DRAFT' && d._access.is_author;
    var missing = d.items.filter(function (i) { return i.is_required && !(i.content && i.content.trim()); }).length;
    var fields = editable ? d.items.map(function (i) { return '<div class="field"><div class="q">' + h(i.label) + ' ' + (i.is_required ? '<span class="req">필수</span>' : '<span class="opt">선택</span>') + '</div><textarea data-item="' + i.handover_item_id + '"' + (i.is_required ? ' data-req="1"' : '') + ' class="' + (i.is_required && !i.content ? 'miss' : '') + '" placeholder="' + (i.is_required ? '병동 공통 필수 인계 항목입니다' : '내용을 입력하세요') + '">' + h(i.content) + '</textarea></div>'; }).join('') : fieldsRead(d);
    var status = editable ? '<div class="danger" id="warnBox"' + (missing ? '' : ' style="display:none"') + '>필수 항목 <b id="missN">' + missing + '개</b>가 비어 있습니다. 모두 채워야 인계를 넘길 수 있습니다. <b>(422)</b></div><div class="row-actions"><button class="btn sec" data-act="save">임시저장</button><button class="btn" data-act="send">인계 넘기기</button></div>'
      : (d.status === 'SENT' ? '<div class="ok"><b>' + h(d.to_user_name) + ' 간호사에게 ' + A().tLabel(d.sent_at) + ' 전달되었습니다.</b> 받는 사람이 핵심 내용을 요약해 확인 처리하면 <b>확인 완료</b>로 표시됩니다. SENT 이후 항목은 수정할 수 없습니다 (409).</div>'
        : d.status === 'CONFIRMED' ? '<div class="ok"><b>' + h(d.to_user_name) + ' 간호사가 ' + A().dtLabel(d.receipt.confirmed_at) + ' 확인 처리했습니다.</b><br>수신자 요약: "' + h(d.receipt.receiver_summary) + '"</div>'
        : d.status === 'SUPERSEDED' ? '<div class="warn"><b>SUPERSEDED</b> — 수신자가 결원되어 대체된 인계입니다. 읽기 전용이며 <a href="#/handover/' + d.superseded_by_handover_id + '/write">후속 인계 #' + d.superseded_by_handover_id + '</a> 가 새 수신자에게 발행되었습니다.</div>' : '<div class="warn">작성 중(DRAFT)인 인계는 작성자만 수정합니다.</div>');
    return {
      html: '<div class="wrap">' + crumb('내 근무 · 역할 · 우리 팀 환자', '#/me', '인계 작성') + '<h1>인계 작성</h1><div class="sub">' + subLine(d) + '</div><div id="err"></div><div class="two"><div>' +
        '<div class="card" style="margin-top:20px"><div class="card-h"><span class="date" style="font-size:17px">병동 공통 인계 항목</span><span class="sp"></span>' + A().badge(d.status, true) + '</div><div style="padding:8px 24px 26px">' + fields + '</div></div>' + status + '</div>' +
        '<div class="side"><h3>이 항목은 누가 정했나</h3><div class="kv">적용 범위 &nbsp;<b>5병동 공통</b><br>필수 항목 <b>' + d.items.filter(function (i) { return i.is_required; }).length + '개</b> · 선택 <b>' + d.items.filter(function (i) { return !i.is_required; }).length + '개</b><br>정의 <b>수간호사 (F-06)</b> · 인계 생성 시점의 <b>스냅샷</b></div>' +
        '<div class="kv" style="border-top:1px solid #E4EBED;padding-top:14px;margin-top:18px;color:#7A8A90;font-size:13px;line-height:1.7">항목 구성은 <b style="color:#1E2B30">2014년 국내 인수인계 표준화 연구의 7개 범주</b>를 참고해<br><b style="color:#1E2B30">이번 서비스가 정한 템플릿 설계안</b>입니다.<br>필수·선택 구분은 <b style="color:#1E2B30">연구 원문이 아닙니다.</b></div>' + party(d) +
        '<div class="src" style="margin-top:16px">POST /handovers · PATCH /handovers/' + d.handover_id + '/items · POST /handovers/' + d.handover_id + '/send</div></div></div></div>',
      bind: function (root) {
        if (!editable) return;
        var tas = all(root, 'textarea[data-req]');
        function sync() { var m = 0; tas.forEach(function (t) { var e = !t.value.trim(); t.classList.toggle('miss', e); if (e) m++; }); sel(root, '#missN').textContent = m + '개'; sel(root, '#warnBox').style.display = m ? 'block' : 'none'; }
        all(root, 'textarea').forEach(function (t) { t.addEventListener('input', sync); });
        function items() { return all(root, 'textarea[data-item]').map(function (t) { return { handover_item_id: +t.dataset.item, content: t.value }; }); }
        onAct(root, {
          save: function () { I('updateHandoverItems', { handoverId: +id, body: { items: items() } }); ok(root, '임시저장되었습니다 (DRAFT 유지).'); },
          send: function () { I('updateHandoverItems', { handoverId: +id, body: { items: items() } }); I('sendHandover', { handoverId: +id }); A().render(); }
        });
      }
    };
  };

  // ---- 10. 인계 수신 · 요약 확인 (F-04) ----------------------------
  V.receive = function (id) {
    var d = loadHandover(id); var me = S().me();
    var isRecv = d._access.is_receiver, sent = d.status === 'SENT';
    if (isRecv && sent) { I('createHandoverReceipt', { handoverId: +id }); d = loadHandover(id); } // 화면 진입 = 열람 기록 (GET 과 분리 · T6-b)
    var rc = d.receipt;
    var summaryCard = d.status === 'CONFIRMED' ? '<div class="card" style="border-color:#BEE3C2"><div class="card-h" style="background:#F6FBF6"><span class="date" style="font-size:17px">핵심 내용 요약 — 확인 완료</span><span class="sp"></span><span class="code">confirmed_at ' + A().dtFull(rc.confirmed_at) + '</span></div><div style="padding:18px 24px 24px"><div class="read">' + h(rc.receiver_summary) + '</div><div class="muted" style="margin-top:10px">받은 사람 ' + h(d.to_user_name) + ' · 열람 ' + A().dtLabel(rc.received_at) + ' · 확인 ' + A().dtLabel(rc.confirmed_at) + '. CONFIRMED 이후 요약은 수정할 수 없습니다 (409).</div></div></div>'
      : d.status === 'SUPERSEDED' ? '<div class="warn"><b>SUPERSEDED</b> — 수신자 결원으로 대체된 인계입니다. 읽기 전용이고 미확인 건수에서 빠집니다. <a href="#/handover/' + d.superseded_by_handover_id + '/receive">후속 인계 #' + d.superseded_by_handover_id + '</a>' + (rc.received_at ? ' · 원래 수신자가 ' + A().dtLabel(rc.received_at) + ' 열어본 기록은 남습니다' : '') + '</div>'
      : '<div class="card" style="border-color:#BCD0D6"><div class="card-h" style="background:#F5F9FA"><span class="date" style="font-size:17px">핵심 내용 요약</span><span class="req">필수</span><span class="sp"></span>' + (rc.received_at ? '<span class="code">received_at ' + A().tLabel(rc.received_at) + '</span>' : '') + '</div><div style="padding:18px 24px 24px"><div style="font-size:14px;color:#5B6B70;line-height:1.6">받은 내용을 <b>직접 요약해 주세요.</b> 읽은 것만으로는 확인 처리가 되지 않습니다.' + (!isRecv ? ' <b style="color:#B3261E">지금은 수신 당사자가 아닙니다 — 확인 처리를 누르면 403 입니다.</b>' : '') + '</div><textarea id="summary" class="' + (rc.receiver_summary ? '' : 'miss') + '" style="min-height:96px" placeholder="예) ' + h(d.bed_no) + ' 낙상 고위험, 난간 상시 올림. 자정 검사 결과 확인 후 이상 시 당직의 연락.">' + h(rc.receiver_summary) + '</textarea></div></div>' +
        '<div class="warn" id="warnBox"' + (rc.receiver_summary ? ' style="display:none"' : '') + '>요약을 입력해야 <b>확인 처리</b>를 할 수 있습니다. <b>(422)</b></div><div class="row-actions"><a class="btn sec" href="#/me">나중에 하기</a><button class="btn" data-act="confirm">확인 처리</button></div>';
    var title = isRecv ? '인계 수신 · 요약 확인' : d._access.is_author ? '보낸 인계' : '인계 열람';
    return {
      html: '<div class="wrap">' + crumb('내 근무 · 역할 · 우리 팀 환자', me.user_type === 'HEAD_NURSE' ? '#/dashboard' : '#/me', title) + '<h1>' + title + '</h1><div class="sub">' + h(d.bed_no) + ' · ' + h(d.patient_ref_code) + ' &nbsp;·&nbsp; 보낸 사람 <b>' + h(d.from_user_name) + '</b> (' + d.from_shift_code + ' ' + A().SHIFT[d.from_shift_code].name + ' · ' + h(d.team_name) + ' ' + h(d.from_role_name || '') + ') &nbsp;·&nbsp; ' + (d.sent_at ? A().dtLabel(d.sent_at) + ' 전달됨' : '전달 전') + ' &nbsp;·&nbsp; 접근 경로 <span class="code">' + { party: '인계 당사자', head_nurse: '병동 수간호사', team: '같은 팀·같은 근무' }[d._access.via] + '</span></div><div id="err"></div><div class="two"><div>' +
        '<div class="card" style="margin-top:20px"><div class="card-h"><span class="date" style="font-size:17px">받은 인계</span><span class="sp"></span>' + A().badge(d.status, true) + '</div><div style="padding:8px 24px 26px">' + fieldsRead(d) + '</div></div>' + summaryCard + '</div>' +
        '<div class="side"><h3>확인 처리를 하면</h3><div class="kv">상태 <b>SENT &rarr; CONFIRMED</b><br>요약과 <b>확인 시각</b>이 함께 기록됩니다<br>보낸 사람에게 <b>확인 완료</b>로 표시되고 대시보드 미확인 건수가 줄어듭니다</div><div class="kv" style="border-top:1px solid #E4EBED;padding-top:14px;margin-top:18px;color:#7A8A90">확인 처리는 <b style="color:#1E2B30">이 입원 건의 인계 담당(다음 근무 팀 차지)</b>만 할 수 있습니다 (403)<br>같은 팀 액팅은 열람만 합니다<br>이미 확인된 인계는 다시 처리할 수 없습니다 (409)</div>' + party(d) +
        '<div class="src" style="margin-top:16px">GET /handovers/' + d.handover_id + ' · POST …/receipt · PATCH …/receipt · POST …/receipt/confirmation</div></div></div></div>',
      bind: function (root) {
        var ta = sel(root, '#summary'); if (!ta) return;
        ta.addEventListener('input', function () { var okv = ta.value.trim().length > 0; ta.classList.toggle('miss', !okv); sel(root, '#warnBox').style.display = okv ? 'none' : 'block'; });
        onAct(root, { confirm: function () { if (ta.value.trim()) I('updateReceiverSummary', { handoverId: +id, body: { receiver_summary: ta.value } }); I('confirmHandoverReceipt', { handoverId: +id }); A().render(); } });
      }
    };
  };

  // ---- 11. 내 인계 이력 (F-04) -------------------------------------
  var mhState = { from: '2026-09-10', to: '2026-09-17', dir: '' };
  V.myhistory = function () {
    var st = mhState; var items = I('listMyHandovers', { from: st.from, to: st.to, direction: st.dir || undefined }).items;
    var rows = items.map(function (x) {
      return '<tr><td><span class="dir ' + (x.direction === 'sent' ? 'dir-s">보냄' : 'dir-r">받음') + '</span></td><td class="bed">' + h(x.bed_no) + '</td><td class="code">' + h(x.patient_ref_code) + '</td><td>' + A().dLabel(x.work_date).replace(/\(.\)$/, '') + ' ' + A().shiftTag(x.shift_code, true) + '</td><td>' + A().badge(x.status, x.status === 'SUPERSEDED') + '</td><td>' + (x.confirmed_at ? A().dtLabel(x.confirmed_at) : '—') + '</td><td class="act"><a class="btn sec sm" href="#/handover/' + x.handover_id + '/' + (x.direction === 'sent' ? 'write' : 'receive') + '">열기</a></td></tr>';
    }).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:28px">기간 안에 주고받은 인계가 없습니다</td></tr>';
    return {
      html: '<div class="wrap">' + crumb('내 근무 · 역할 · 우리 팀 환자', '#/me', '내 인계 이력') + '<h1>내 인계 이력</h1><div class="sub">내가 주고받은 인계만 보입니다 · <span class="code">GET /me/handovers?from=' + st.from + '&to=' + st.to + (st.dir ? '&direction=' + st.dir : '') + '</span></div><div id="err"></div>' +
        '<div class="bar2"><input class="inp" style="width:180px" type="date" id="mFrom" value="' + st.from + '"><span>~</span><input class="inp" style="width:180px" type="date" id="mTo" value="' + st.to + '"><button class="btn sec" data-act="q">조회</button></div>' +
        '<div class="tabs"><button class="tab' + (st.dir === '' ? ' on' : '') + '" data-act="dir" data-d="">전체</button><button class="tab' + (st.dir === 'sent' ? ' on' : '') + '" data-act="dir" data-d="sent">보낸 인계</button><button class="tab' + (st.dir === 'received' ? ' on' : '') + '" data-act="dir" data-d="received">받은 인계</button></div>' +
        '<div class="card"><table><thead><tr><th style="width:90px">방향</th><th style="width:110px">병상</th><th style="width:220px">입원 건</th><th style="width:220px">근무</th><th style="width:170px">상태</th><th>확인 시각</th><th style="width:120px"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="warn"><b>SUPERSEDED</b> 는 수신자가 결원되어 대체된 인계입니다. <b>읽기 전용</b>이고, 미확인 건수 집계에서 빠집니다. 후속 인계가 새 수신자에게 발행되어 있습니다.</div><div class="foot"><a href="#/me">내 근무 화면으로</a></div></div>',
      bind: function (root) { onAct(root, { q: function () { st.from = sel(root, '#mFrom').value; st.to = sel(root, '#mTo').value; A().render(); }, dir: function (el) { st.dir = el.dataset.d; A().render(); } }); }
    };
  };

  global.Views = V;
})(window);
