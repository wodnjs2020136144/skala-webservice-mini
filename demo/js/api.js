/* ============================================================
 * api.js — 목 API 계층. OAS 23 오퍼레이션을 operationId 이름 그대로.
 *
 * 규칙의 단일 출처는 docs/02 T6 다. 이 파일은 그 구현이며 복사본이 아니다.
 * 주석의 "T6 …" 은 출처 행. 규칙이 갈리면 T6 가 맞고 여기를 고친다.
 * 반환 { status, body } / 실패 throw ApiError(status, code, message)
 * ============================================================ */
(function (global) {
  'use strict';

  function ApiError(status, code, message, details) {
    this.status = status; this.code = code; this.message = message; this.details = details || null;
  }
  ApiError.prototype = Object.create(Error.prototype);

  var db = function () { return global.Store.db; };
  var now = function () { return global.Store.now(); };
  var ORDER = global.Seed.ORDER;
  var shiftIndex = global.Seed.shiftIndex;

  // ---- 조회 헬퍼 ------------------------------------------------
  function one(table, id) { return db()[table].filter(function (r) { return r.id === id; })[0] || null; }
  function where(table, fn) { return db()[table].filter(fn); }
  function userName(id) { var u = one('users', id); return u ? u.name : null; }
  function teamName(id) { var t = id ? one('team', id) : null; return t ? t.name : null; }
  function roleName(id) { var r = id ? one('role_type', id) : null; return r ? r.name : null; }
  function saUser(sa) { return one('users', sa.user_id); }
  function haOf(saId, stayId) {
    return where('handover_assignment', function (a) { return a.shift_assignment_id === saId && a.inpatient_stay_id === stayId && a.status === 'ACTIVE'; })[0] || null;
  }
  function activeHas(saId) { return where('handover_assignment', function (a) { return a.shift_assignment_id === saId && a.status === 'ACTIVE'; }); }
  function latest(list) { return list.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })[0] || null; }

  // ---- 권한 ------------------------------------------------------
  function requireMe(ctx) { if (!ctx.me) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다'); return ctx.me; }
  function requireWard(id) { var w = one('ward', id); if (!w) throw new ApiError(404, 'WARD_NOT_FOUND', '병동이 없습니다'); return w; }
  // DBML users note: "해당 병동 수간호사" = user_type = HEAD_NURSE AND users.ward_id = 대상 ward_id
  function requireHeadNurse(ctx, wardId) {
    var me = requireMe(ctx);
    if (me.user_type !== 'HEAD_NURSE' || me.ward_id !== wardId) throw new ApiError(403, 'FORBIDDEN', '해당 병동 수간호사만 할 수 있습니다');
    return me;
  }
  function requireSameWard(ctx, wardId) {
    var me = requireMe(ctx);
    if (me.ward_id !== wardId) throw new ApiError(403, 'FORBIDDEN', '다른 병동입니다'); // T6-b 타 병동 403
    return me;
  }
  function requireSa(id) { var s = one('shift_assignment', id); if (!s) throw new ApiError(404, 'SHIFT_NOT_FOUND', '근무가 없습니다'); return s; }
  function requireHandover(id) { var h = one('handover', id); if (!h) throw new ApiError(404, 'HANDOVER_NOT_FOUND', '인계가 없습니다'); return h; }

  // ---- 서버 계산 -------------------------------------------------
  // ① · ①-c incoming = 그 입원 건에서 "내 근무와 같은 ward·work_date·shift_code 의 handover_assignment" 를 to 로 지정한 인계 중
  //   SUPERSEDED 제외 최신 1건. 액팅(담당 없음)도 같은 값을 본다 — 팀 차지가 받는 인계가 곧 이 근무가 받는 인계다
  function incomingFor(sa, stayId) {
    var has = where('handover_assignment', function (a) {
      if (a.inpatient_stay_id !== stayId) return false;
      var s = one('shift_assignment', a.shift_assignment_id);
      return s && s.ward_id === sa.ward_id && s.work_date === sa.work_date && s.shift_code === sa.shift_code;
    }).map(function (a) { return a.id; });
    return latest(where('handover', function (h) { return has.indexOf(h.to_handover_assignment_id) >= 0 && h.status !== 'SUPERSEDED'; }));
  }
  // ①-c outgoing = from 이 내 근무의 ACTIVE handover_assignment 인 것 중 SUPERSEDED 제외 최신 1건
  function outgoingFor(saId, stayId) {
    var ha = haOf(saId, stayId); if (!ha) return null;
    return latest(where('handover', function (h) { return h.from_handover_assignment_id === ha.id && h.status !== 'SUPERSEDED'; }));
  }
  // ② has_reassignment — SUBSTITUTE_ASSIGNED / HANDOVER_OWNER_TRANSFERRED 가 from 또는 to 에 1건 이상
  function hasReassignment(saId) {
    return where('reassignment_log', function (l) {
      return (l.change_type === 'SUBSTITUTE_ASSIGNED' || l.change_type === 'HANDOVER_OWNER_TRANSFERRED') &&
        (l.from_shift_assignment_id === saId || l.to_shift_assignment_id === saId);
    }).length > 0;
  }
  // ④ change_reason — ABSENCE_REGISTERED 최신 1건 복사. 없으면 422
  function absenceReason(saId, strict) {
    var l = latest(where('reassignment_log', function (l) { return l.change_type === 'ABSENCE_REGISTERED' && l.from_shift_assignment_id === saId; }).map(function (l) { return { created_at: l.changed_at, r: l.change_reason }; }));
    if (!l && strict) throw new ApiError(422, 'ABSENCE_NOT_REGISTERED', '복사할 결원 사유(ABSENCE_REGISTERED)가 없습니다 — 결원 등록이 먼저입니다');
    return l ? l.r : null;
  }
  // ③ 대체 완료 가드 — 유효한 SUBSTITUTE_ASSIGNED: to_shift 가 같은 ward · work_date · shift_code · ACTIVE
  function validSubstitute(from) {
    return where('reassignment_log', function (l) { return l.change_type === 'SUBSTITUTE_ASSIGNED' && l.from_shift_assignment_id === from.id; })
      .map(function (l) { return one('shift_assignment', l.to_shift_assignment_id); })
      .filter(function (t) { return t && t.ward_id === from.ward_id && t.work_date === from.work_date && t.shift_code === from.shift_code && t.status === 'ACTIVE'; })[0] || null;
  }
  // ⑥ 인계의 to — 같은 입원 건의 ACTIVE handover_assignment 중 작성자 근무보다 시간상 다음인 첫 근무
  function nextOwnerHa(fromSa, stayId) {
    var fi = shiftIndex(fromSa);
    var cands = where('handover_assignment', function (a) { return a.inpatient_stay_id === stayId && a.status === 'ACTIVE'; })
      .map(function (a) { return { ha: a, sa: one('shift_assignment', a.shift_assignment_id) }; })
      .filter(function (x) { return x.sa && x.sa.status === 'ACTIVE' && shiftIndex(x.sa) > fi; })
      .sort(function (a, b) { return shiftIndex(a.sa) - shiftIndex(b.sa); });
    return cands[0] ? cands[0].ha : null;
  }
  function stayBrief(s) { return { inpatient_stay_id: s.id, bed_no: s.bed_no, patient_ref_code: s.patient_ref_code }; }
  function receiptOf(hId) { return where('handover_receipt', function (r) { return r.handover_id === hId; })[0] || null; }
  function itemsOf(hId) {
    return where('handover_item', function (i) { return i.handover_id === hId; }).sort(function (a, b) { return a.sort_order - b.sort_order; })
      .map(function (i) { return { handover_item_id: i.id, label: i.label, content: i.content, is_required: i.is_required, sort_order: i.sort_order }; });
  }
  function haUser(haId) { var a = one('handover_assignment', haId); var s = a && one('shift_assignment', a.shift_assignment_id); return s ? saUser(s) : null; }
  function haSa(haId) { var a = one('handover_assignment', haId); return a ? one('shift_assignment', a.shift_assignment_id) : null; }

  // ============================================================
  // 오퍼레이션 정의 — { method, path, fn(ctx, p) }
  // ============================================================
  var OPS = {};

  // ---- F-01 ---------------------------------------------------
  OPS.listShiftAssignments = { method: 'GET', path: '/wards/{wardId}/shift-assignments', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    if (!p.date) throw new ApiError(422, 'DATE_REQUIRED', 'date 는 필수입니다');
    var items = where('shift_assignment', function (s) { return s.ward_id === p.wardId && s.work_date === p.date && (!p.shift_code || s.shift_code === p.shift_code); })
      .sort(function (a, b) { return ORDER[a.shift_code] - ORDER[b.shift_code] || a.id - b.id; }).map(saView);
    return { status: 200, body: { items: items } };
  } };
  function saView(s) {
    var u = saUser(s);
    return { shift_assignment_id: s.id, user_id: s.user_id, user_name: u.name, team_name: teamName(u.team_id), work_date: s.work_date, shift_code: s.shift_code, role_name: roleName(s.role_type_id), status: s.status, covered_at: s.covered_at };
  }
  OPS.createShiftAssignments = { method: 'POST', path: '/wards/{wardId}/shift-assignments', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    var items = (p.body && p.body.items) || [];
    if (!items.length) throw new ApiError(422, 'ITEMS_REQUIRED', '등록할 근무가 없습니다');
    var seenKey = {};
    items.forEach(function (it) {
      if (!one('users', it.user_id)) throw new ApiError(404, 'USER_NOT_FOUND', '근무자가 없습니다: ' + it.user_id);
      var key = it.user_id + '|' + it.work_date + '|' + it.shift_code; // 21라운드 R126: 요청 안 중복도 같은 unique 위반이다
      if (seenKey[key]) throw new ApiError(409, 'SHIFT_DUPLICATE', userName(it.user_id) + ' 이 요청 안에 두 번 있습니다 (' + it.work_date + ' ' + it.shift_code + ')');
      seenKey[key] = 1;
      if (!ORDER.hasOwnProperty(it.shift_code) || !it.work_date) throw new ApiError(422, 'INVALID', '날짜·근무조가 올바르지 않습니다');
      // T6 F-01 저장 · 409 같은 사람·같은 날·같은 근무조 중복 (unique)
      if (where('shift_assignment', function (s) { return s.user_id === it.user_id && s.work_date === it.work_date && s.shift_code === it.shift_code; }).length)
        throw new ApiError(409, 'SHIFT_DUPLICATE', userName(it.user_id) + ' 은 ' + it.work_date + ' ' + it.shift_code + ' 에 이미 등록되어 있습니다');
    });
    var created = items.map(function (it) {
      var row = { id: global.Store.nextId('shift_assignment'), ward_id: p.wardId, user_id: it.user_id, work_date: it.work_date, shift_code: it.shift_code, role_type_id: null, status: 'ACTIVE', covered_at: null, created_at: now() };
      db().shift_assignment.push(row); return saView(row);
    });
    return { status: 201, body: { items: created }, mutated: true };
  } };

  // ---- F-02 ---------------------------------------------------
  OPS.getAssignmentBoard = { method: 'GET', path: '/wards/{wardId}/assignment-board', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    if (!p.date || !p.shift_code) throw new ApiError(422, 'PARAM_REQUIRED', 'date · shift_code 는 필수입니다');
    var rows = where('shift_assignment', function (s) { return s.ward_id === p.wardId && s.work_date === p.date && s.shift_code === p.shift_code; })
      .sort(function (a, b) { return a.id - b.id; })
      .map(function (s) {
        var u = saUser(s);
        return { shift_assignment_id: s.id, user_name: u.name, team_name: teamName(u.team_id), team_id: u.team_id, role_name: roleName(s.role_type_id), role_type_id: s.role_type_id, status: s.status,
          handover_assignments: activeHas(s.id).map(function (a) { var st = one('inpatient_stay', a.inpatient_stay_id); return { handover_assignment_id: a.id, inpatient_stay_id: a.inpatient_stay_id, bed_no: st.bed_no, status: a.status }; }) };
      });
    var team_stays = where('inpatient_stay', function (s) { return s.ward_id === p.wardId && s.status === 'ACTIVE'; })
      .map(function (s) { return { team_name: teamName(s.team_id), team_id: s.team_id, inpatient_stay_id: s.id, bed_no: s.bed_no }; });
    return { status: 200, body: { rows: rows, team_stays: team_stays } };
  } };
  OPS.updateShiftAssignmentRole = { method: 'PATCH', path: '/shift-assignments/{shiftAssignmentId}', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); requireHeadNurse(ctx, s.ward_id);
    var rid = p.body ? p.body.role_type_id : undefined;
    if (rid !== null) {
      var r = one('role_type', rid);
      if (!r) throw new ApiError(404, 'ROLE_NOT_FOUND', '역할이 없습니다');
      if (r.ward_id !== s.ward_id) throw new ApiError(422, 'ROLE_WARD_MISMATCH', '다른 병동의 역할입니다'); // T6 F-02 422
    }
    s.role_type_id = rid;
    return { status: 200, body: { shift_assignment_id: s.id, role_name: roleName(s.role_type_id) }, mutated: true };
  } };
  OPS.assignHandoverOwnership = { method: 'POST', path: '/shift-assignments/{shiftAssignmentId}/handover-assignments', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); requireHeadNurse(ctx, s.ward_id);
    var ids = (p.body && p.body.inpatient_stay_ids) || [];
    if (!ids.length) throw new ApiError(422, 'STAYS_REQUIRED', '입원 건을 선택하세요');
    if (new Set(ids).size !== ids.length) throw new ApiError(409, 'ALREADY_ASSIGNED', '같은 입원 건이 요청 안에 두 번 있습니다'); // R128
    ids.forEach(function (id) {
      var st = one('inpatient_stay', id); if (!st) throw new ApiError(404, 'STAY_NOT_FOUND', '입원 건이 없습니다');
      if (st.ward_id !== s.ward_id) throw new ApiError(422, 'WARD_MISMATCH', '다른 병동의 입원 건입니다'); // DBML handover_assignment 제약
      if (haOf(s.id, id)) throw new ApiError(409, 'ALREADY_ASSIGNED', st.bed_no + ' 은 이 근무에 이미 ACTIVE 인계 담당이 있습니다'); // T6 F-02 409
    });
    var items = ids.map(function (id) {
      var row = { id: global.Store.nextId('handover_assignment'), shift_assignment_id: s.id, inpatient_stay_id: id, status: 'ACTIVE', created_at: now() };
      db().handover_assignment.push(row); return { handover_assignment_id: row.id, inpatient_stay_id: id, bed_no: one('inpatient_stay', id).bed_no, status: 'ACTIVE' };
    });
    return { status: 201, body: { items: items }, mutated: true };
  } };

  // ---- F-06 ---------------------------------------------------
  OPS.listHandoverTemplateItems = { method: 'GET', path: '/wards/{wardId}/handover-template-items', fn: function (ctx, p) {
    requireWard(p.wardId); requireSameWard(ctx, p.wardId); // 조회는 같은 병동 간호사도 가능
    var items = where('handover_template_item', function (t) { return t.ward_id === p.wardId; }).sort(function (a, b) { return a.sort_order - b.sort_order; })
      .map(function (t) { return { id: t.id, label: t.label, is_required: t.is_required, sort_order: t.sort_order }; });
    return { status: 200, body: { items: items } };
  } };
  OPS.replaceHandoverTemplateItems = { method: 'PUT', path: '/wards/{wardId}/handover-template-items', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    var items = (p.body && p.body.items) || [];
    var seen = {};
    items.forEach(function (it) {
      if (!it.label || !String(it.label).trim()) throw new ApiError(422, 'LABEL_REQUIRED', '항목명이 비어 있습니다');
      if (seen[it.sort_order]) throw new ApiError(422, 'SORT_ORDER_DUPLICATE', '순서 ' + it.sort_order + ' 가 중복됩니다'); // T6 F-06 422
      seen[it.sort_order] = 1;
    });
    // 전체 교체. 기존 handover_item 은 건드리지 않는다 (스냅샷 불변 규칙 1)
    db().handover_template_item = db().handover_template_item.filter(function (t) { return t.ward_id !== p.wardId; });
    var out = items.map(function (it) {
      var row = { id: global.Store.nextId('handover_template_item'), ward_id: p.wardId, label: String(it.label).trim(), is_required: !!it.is_required, sort_order: it.sort_order };
      db().handover_template_item.push(row); return { id: row.id, label: row.label, is_required: row.is_required, sort_order: row.sort_order };
    });
    return { status: 200, body: { items: out }, mutated: true };
  } };

  // ---- F-05 ---------------------------------------------------
  OPS.getReassignmentContext = { method: 'GET', path: '/shift-assignments/{shiftAssignmentId}/reassignment-context', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); requireHeadNurse(ctx, s.ward_id);
    var u = saUser(s);
    var candidates = where('shift_assignment', function (c) { return c.id !== s.id && c.ward_id === s.ward_id && c.work_date === s.work_date && c.shift_code === s.shift_code && c.status === 'ACTIVE'; })
      .map(function (c) { var cu = saUser(c); return { shift_assignment_id: c.id, user_name: cu.name, team_name: teamName(cu.team_id), role_name: roleName(c.role_type_id) }; });
    var pending = activeHas(s.id).map(function (a) {
      var st = one('inpatient_stay', a.inpatient_stay_id); var inc = incomingFor(s, st.id);
      return { inpatient_stay_id: st.id, bed_no: st.bed_no, patient_ref_code: st.patient_ref_code, handover_status: inc ? inc.status : 'NONE' };
    });
    var sub = latest(where('reassignment_log', function (l) { return l.change_type === 'SUBSTITUTE_ASSIGNED' && l.from_shift_assignment_id === s.id; }).map(function (l) { return { created_at: l.changed_at, to: l.to_shift_assignment_id }; }));
    var subSa = sub ? one('shift_assignment', sub.to) : null;
    return { status: 200, body: {
      absent: { shift_assignment_id: s.id, user_name: u.name, team_name: teamName(u.team_id), work_date: s.work_date, shift_code: s.shift_code, role_name: roleName(s.role_type_id), status: s.status, covered_at: s.covered_at, absence_reason: absenceReason(s.id, false) },
      candidates: candidates,
      pending_handover_assignments: pending,
      // 데모 편의: 현재 단계 판정에 쓰는 보조 정보 (OAS 밖 — 화면 6 의 단계 표시용)
      _substitute: subSa ? { shift_assignment_id: subSa.id, user_name: saUser(subSa).name } : null,
      _logs: where('reassignment_log', function (l) { return l.from_shift_assignment_id === s.id; }).map(logView)
    } };
  } };
  OPS.registerAbsence = { method: 'POST', path: '/shift-assignments/{shiftAssignmentId}/absence', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); var me = requireHeadNurse(ctx, s.ward_id);
    var reason = p.body && String(p.body.change_reason || '').trim();
    if (!reason) throw new ApiError(422, 'REASON_REQUIRED', '결원 사유는 필수입니다'); // T6 F-05 ① 422
    if (s.status === 'ABSENT') throw new ApiError(409, 'ALREADY_ABSENT', '이미 결원으로 등록된 근무입니다'); // T6 F-05 ① 409
    s.status = 'ABSENT';
    addLog('ABSENCE_REGISTERED', s.id, null, null, null, me.id, reason);
    return { status: 201, body: { shift_assignment_id: s.id, status: s.status }, mutated: true };
  } };
  OPS.assignSubstitute = { method: 'POST', path: '/shift-assignments/{shiftAssignmentId}/substitute', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); var me = requireHeadNurse(ctx, s.ward_id);
    var reason = absenceReason(s.id, true); // ④ 복사. 없으면 422
    var b = p.body || {}, target = null;
    if (b.to_shift_assignment_id) {
      target = requireSa(b.to_shift_assignment_id);
    } else if (b.substitute_user_id) {
      if (!one('users', b.substitute_user_id)) throw new ApiError(404, 'USER_NOT_FOUND', '대체자가 없습니다');
      var existing = where('shift_assignment', function (c) { return c.user_id === b.substitute_user_id && c.work_date === s.work_date && c.shift_code === s.shift_code; })[0];
      if (existing) {
        if (existing.ward_id !== s.ward_id) throw new ApiError(409, 'SUBSTITUTE_OTHER_WARD', '대체자가 그 근무조에 다른 병동 근무가 있습니다'); // T6 F-05 ② 409
        target = existing; // 같은 근무에 이미 ACTIVE 로 있으면 재사용 (R110)
      } else {
        target = { id: global.Store.nextId('shift_assignment'), ward_id: s.ward_id, user_id: b.substitute_user_id, work_date: s.work_date, shift_code: s.shift_code, role_type_id: null, status: 'ACTIVE', covered_at: null, created_at: now() };
        db().shift_assignment.push(target);
      }
    } else throw new ApiError(422, 'TARGET_REQUIRED', 'substitute_user_id 또는 to_shift_assignment_id 가 필요합니다');
    // 불변 규칙 4~7 (DBML reassignment_log note)
    if (target.id === s.id) throw new ApiError(422, 'SELF_SUBSTITUTE', '자기 자신을 대체자로 지정할 수 없습니다');
    if (target.ward_id !== s.ward_id || target.work_date !== s.work_date || target.shift_code !== s.shift_code) throw new ApiError(422, 'SHIFT_MISMATCH', '같은 병동·같은 날·같은 근무조여야 합니다');
    if (target.status !== 'ACTIVE') throw new ApiError(409, 'SUBSTITUTE_ABSENT', '대체자도 그 근무에 결원(ABSENT)입니다'); // T6 F-05 ② 409
    addLog('SUBSTITUTE_ASSIGNED', s.id, target.id, null, null, me.id, reason);
    return { status: 201, body: { to_shift_assignment_id: target.id, user_name: saUser(target).name }, mutated: true };
  } };
  OPS.transferHandoverOwnership = { method: 'POST', path: '/shift-assignments/{shiftAssignmentId}/handover-transfer', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); var me = requireHeadNurse(ctx, s.ward_id);
    var reason = absenceReason(s.id, true);
    var b = p.body || {}; var target = requireSa(b.to_shift_assignment_id);
    var ids = b.inpatient_stay_ids || [];
    if (!ids.length) throw new ApiError(422, 'STAYS_REQUIRED', '이관할 입원 건을 선택하세요');
    if (target.id === s.id) throw new ApiError(422, 'SELF_TRANSFER', '같은 근무로 이관할 수 없습니다');
    if (target.ward_id !== s.ward_id || target.work_date !== s.work_date || target.shift_code !== s.shift_code) throw new ApiError(422, 'SHIFT_MISMATCH', '같은 병동·같은 날·같은 근무조여야 합니다');
    if (target.status !== 'ACTIVE') throw new ApiError(422, 'TARGET_NOT_ACTIVE', '이관 대상 근무가 ACTIVE 가 아닙니다 (불변 규칙 8)'); // R129
    if (new Set(ids).size !== ids.length) throw new ApiError(422, 'DUPLICATE_STAY', '같은 입원 건이 요청 안에 두 번 있습니다 — SUPERSEDED 고리가 깨진다'); // R127
    // 검증을 먼저 전부 끝낸다 — 한 트랜잭션
    var plan = ids.map(function (stayId) {
      var fromHa = haOf(s.id, stayId);
      if (!fromHa) throw new ApiError(404, 'OWNER_NOT_FOUND', '결원자에게 그 입원 건의 ACTIVE 인계 담당이 없습니다');
      var hs = where('handover', function (h) { return h.to_handover_assignment_id === fromHa.id && h.status !== 'SUPERSEDED'; });
      hs.forEach(function (h) { if (h.status === 'CONFIRMED') throw new ApiError(409, 'HANDOVER_CONFIRMED', one('inpatient_stay', stayId).bed_no + ' 의 인계는 이미 CONFIRMED 입니다 — 닫힌 고리는 이관하지 않습니다'); }); // T6 F-05 ③ 409
      return { stayId: stayId, fromHa: fromHa, handovers: hs };
    });
    var transferred = plan.map(function (x) {
      x.fromHa.status = 'REPLACED'; // append-only
      var toHa = haOf(target.id, x.stayId);
      if (!toHa) { toHa = { id: global.Store.nextId('handover_assignment'), shift_assignment_id: target.id, inpatient_stay_id: x.stayId, status: 'ACTIVE', created_at: now() }; db().handover_assignment.push(toHa); }
      var superseded = null, successor = null;
      x.handovers.forEach(function (h) {
        var t = now();
        var succ = { id: global.Store.nextId('handover'), inpatient_stay_id: h.inpatient_stay_id, from_handover_assignment_id: h.from_handover_assignment_id, to_handover_assignment_id: toHa.id,
          status: h.status, created_at: t, sent_at: h.status === 'SENT' ? t : null, superseded_at: null, superseded_by_handover_id: null }; // 규칙 3·4: 상태 승계 · from 동일
        db().handover.push(succ);
        itemsOf(h.id).forEach(function (i) { db().handover_item.push({ id: global.Store.nextId('handover_item'), handover_id: succ.id, label: i.label, content: i.content, is_required: i.is_required, sort_order: i.sort_order }); }); // 규칙 5
        h.status = 'SUPERSEDED'; h.superseded_at = t; h.superseded_by_handover_id = succ.id; // 규칙 2 · 원본 receipt 는 그대로(규칙 6)
        superseded = h.id; successor = succ.id;
      });
      addLog('HANDOVER_OWNER_TRANSFERRED', s.id, target.id, x.fromHa.id, toHa.id, me.id, reason);
      return { inpatient_stay_id: x.stayId, from_handover_assignment_id: x.fromHa.id, to_handover_assignment_id: toHa.id, superseded_handover_id: superseded, successor_handover_id: successor };
    });
    return { status: 200, body: { transferred: transferred }, mutated: true };
  } };
  OPS.confirmCoverage = { method: 'POST', path: '/shift-assignments/{shiftAssignmentId}/coverage-confirmation', fn: function (ctx, p) {
    var s = requireSa(p.shiftAssignmentId); var me = requireHeadNurse(ctx, s.ward_id);
    if (s.covered_at) throw new ApiError(409, 'ALREADY_COVERED', '이미 대체 완료로 확인된 결원입니다'); // T6 F-05 ④ 409
    if (!validSubstitute(s)) throw new ApiError(422, 'NO_VALID_SUBSTITUTE', '유효한 대체자 배정(SUBSTITUTE_ASSIGNED)이 없습니다 — ② 대체자 배정이 먼저입니다'); // 서버 계산 ③
    var reason = absenceReason(s.id, true);
    s.covered_at = now();
    addLog('COVER_CONFIRMED', s.id, null, null, null, me.id, reason);
    return { status: 201, body: { shift_assignment_id: s.id, status: s.status, covered_at: s.covered_at }, mutated: true };
  } };
  function addLog(type, from, to, fromHa, toHa, by, reason) {
    db().reassignment_log.push({ id: global.Store.nextId('reassignment_log'), change_type: type, from_shift_assignment_id: from, to_shift_assignment_id: to, from_handover_assignment_id: fromHa, to_handover_assignment_id: toHa, changed_by_user_id: by, change_reason: reason, changed_at: now() });
  }
  function logView(l) {
    var fs = one('shift_assignment', l.from_shift_assignment_id), tsa = l.to_shift_assignment_id ? one('shift_assignment', l.to_shift_assignment_id) : null;
    var fha = l.from_handover_assignment_id ? one('handover_assignment', l.from_handover_assignment_id) : null;
    var st = fha ? one('inpatient_stay', fha.inpatient_stay_id) : null;
    return { changed_at: l.changed_at, change_type: l.change_type, from_user_name: userName(fs.user_id), from_work_date: fs.work_date, from_shift_code: fs.shift_code, from_role_name: roleName(fs.role_type_id),
      to_user_name: tsa ? userName(tsa.user_id) : null, inpatient_stay_id: st ? st.id : null, bed_no: st ? st.bed_no : null, patient_ref_code: st ? st.patient_ref_code : null,
      change_reason: l.change_reason, changed_by_user_name: userName(l.changed_by_user_id) };
  }
  OPS.listReassignmentLogs = { method: 'GET', path: '/wards/{wardId}/reassignment-logs', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    var items = where('reassignment_log', function (l) {
      var fs = one('shift_assignment', l.from_shift_assignment_id); if (!fs || fs.ward_id !== p.wardId) return false;
      var d = l.changed_at.slice(0, 10);
      return (!p.from || d >= p.from) && (!p.to || d <= p.to);
    }).sort(function (a, b) { return a.changed_at < b.changed_at ? 1 : -1; }).map(logView);
    return { status: 200, body: { items: items } };
  } };

  // ---- F-03 ---------------------------------------------------
  OPS.getMyShifts = { method: 'GET', path: '/me/shifts', fn: function (ctx, p) {
    var me = requireMe(ctx); var today = global.Store.today;
    var mine = where('shift_assignment', function (s) { return s.user_id === me.id; }).sort(function (a, b) { return shiftIndex(a) - shiftIndex(b); });
    // 기본값: 오늘 ~ 다음 근무일(오늘 이후 첫 work_date, 없으면 오늘)
    var from = p.from || today;
    var to = p.to || (function () { var n = mine.filter(function (s) { return s.work_date > today; })[0]; return n ? n.work_date : today; })();
    var shifts = mine.filter(function (s) { return s.work_date >= from && s.work_date <= to; }).map(function (s) {
      var stays = me.team_id ? where('inpatient_stay', function (st) { return st.ward_id === s.ward_id && st.team_id === me.team_id && st.status === 'ACTIVE'; }) : [];
      return { shift_assignment_id: s.id, work_date: s.work_date, shift_code: s.shift_code, role_name: roleName(s.role_type_id), team_name: teamName(me.team_id), is_absent: s.status === 'ABSENT', has_reassignment: hasReassignment(s.id),
        team_stays: stays.map(function (st) {
          var inc = incomingFor(s, st.id), out = outgoingFor(s.id, st.id), ha = haOf(s.id, st.id);
          var incToMe = inc && (haSa(inc.to_handover_assignment_id) || {}).user_id === me.id;
          return { inpatient_stay_id: st.id, bed_no: st.bed_no, patient_ref_code: st.patient_ref_code, admitted_at: st.admitted_at,
            handover_status: inc ? inc.status : 'NONE', is_handover_owner: !!ha, handover_assignment_id: ha ? ha.id : null,
            incoming_handover_id: inc ? inc.id : null, incoming_to_me: !!incToMe, outgoing_handover_id: out ? out.id : null, outgoing_status: out ? out.status : null };
        }) };
    });
    return { status: 200, body: { from: from, to: to, shifts: shifts } };
  } };

  // ---- F-04 ---------------------------------------------------
  OPS.listMyHandovers = { method: 'GET', path: '/me/handovers', fn: function (ctx, p) {
    var me = requireMe(ctx);
    var mySa = {}; where('shift_assignment', function (s) { return s.user_id === me.id; }).forEach(function (s) { mySa[s.id] = s; });
    var myHa = {}; where('handover_assignment', function (a) { return mySa[a.shift_assignment_id]; }).forEach(function (a) { myHa[a.id] = mySa[a.shift_assignment_id]; });
    var items = [];
    db().handover.forEach(function (h) {
      var dir = myHa[h.from_handover_assignment_id] ? 'sent' : myHa[h.to_handover_assignment_id] ? 'received' : null;
      if (!dir) return; if (p.direction && p.direction !== dir) return;
      if (dir === 'received' && h.status === 'DRAFT') return; // R131: DRAFT 는 작성자만 본다(T6) — 수신 측 이력에 넣지 않는다
      var s = myHa[dir === 'sent' ? h.from_handover_assignment_id : h.to_handover_assignment_id];
      if ((p.from && s.work_date < p.from) || (p.to && s.work_date > p.to)) return;
      var st = one('inpatient_stay', h.inpatient_stay_id), rc = receiptOf(h.id);
      items.push({ handover_id: h.id, inpatient_stay_id: st.id, bed_no: st.bed_no, patient_ref_code: st.patient_ref_code, work_date: s.work_date, shift_code: s.shift_code, direction: dir, status: h.status, sent_at: h.sent_at, confirmed_at: rc ? rc.confirmed_at : null, created_at: h.created_at });
    });
    items.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    return { status: 200, body: { items: items } };
  } };
  OPS.createHandover = { method: 'POST', path: '/handovers', fn: function (ctx, p) {
    var me = requireMe(ctx); var b = p.body || {};
    var st = one('inpatient_stay', b.inpatient_stay_id); if (!st) throw new ApiError(404, 'STAY_NOT_FOUND', '입원 건이 없습니다');
    var fromHa = one('handover_assignment', b.from_handover_assignment_id); if (!fromHa) throw new ApiError(404, 'OWNER_NOT_FOUND', '인계 담당 배정이 없습니다');
    var fromSa = one('shift_assignment', fromHa.shift_assignment_id);
    // T6 F-04 작성 시작 · 403: from 당사자 아님 · from_ha.status ≠ ACTIVE · shift.status ≠ ACTIVE (R107)
    if (fromSa.user_id !== me.id) throw new ApiError(403, 'NOT_OWNER', '이 입원 건의 인계 담당(차지)만 작성할 수 있습니다');
    if (fromHa.status !== 'ACTIVE' || fromSa.status !== 'ACTIVE') throw new ApiError(403, 'OWNER_REPLACED', '재배정으로 담당이 넘어간 근무입니다');
    if (fromHa.inpatient_stay_id !== st.id) throw new ApiError(422, 'STAY_MISMATCH', '담당 배정과 입원 건이 다릅니다');
    if (st.status === 'CLOSED') throw new ApiError(409, 'STAY_CLOSED', '퇴원(CLOSED) 건에는 신규 인계를 만들 수 없습니다'); // 409
    var toHa = nextOwnerHa(fromSa, st.id); // ⑥
    if (!toHa) throw new ApiError(422, 'NEXT_OWNER_MISSING', '다음 근무의 인계 담당이 아직 지정되지 않았습니다');
    var h = { id: global.Store.nextId('handover'), inpatient_stay_id: st.id, from_handover_assignment_id: fromHa.id, to_handover_assignment_id: toHa.id, status: 'DRAFT', created_at: now(), sent_at: null, superseded_at: null, superseded_by_handover_id: null };
    db().handover.push(h);
    where('handover_template_item', function (t) { return t.ward_id === st.ward_id; }).forEach(function (t) { // 스냅샷 복사 1회
      db().handover_item.push({ id: global.Store.nextId('handover_item'), handover_id: h.id, label: t.label, content: null, is_required: t.is_required, sort_order: t.sort_order });
    });
    return { status: 201, body: { handover_id: h.id, inpatient_stay_id: st.id, status: h.status, items: itemsOf(h.id) }, mutated: true };
  } };
  OPS.getHandover = { method: 'GET', path: '/handovers/{handoverId}', fn: function (ctx, p) {
    var me = requireMe(ctx); var h = requireHandover(p.handoverId);
    var st = one('inpatient_stay', h.inpatient_stay_id);
    var fromSa = haSa(h.from_handover_assignment_id), toSa = haSa(h.to_handover_assignment_id);
    // 읽기 3단 (T3 · T6 GET /handovers/{id})
    var isAuthor = fromSa.user_id === me.id, isReceiver = toSa.user_id === me.id;
    if (h.status === 'DRAFT' && !isAuthor) throw new ApiError(403, 'DRAFT_PRIVATE', '작성 중(DRAFT)인 인계는 작성자만 볼 수 있습니다');
    var t1 = me.user_type === 'HEAD_NURSE' && me.ward_id === st.ward_id;
    var t2 = isAuthor || isReceiver;
    var t3 = !!h.sent_at && me.team_id === st.team_id && where('shift_assignment', function (s) {
      return s.user_id === me.id && s.status === 'ACTIVE' && [fromSa, toSa].some(function (x) { return x.ward_id === s.ward_id && x.work_date === s.work_date && x.shift_code === s.shift_code; });
    }).length > 0;
    if (!(t1 || t2 || t3)) throw new ApiError(403, 'FORBIDDEN', '이 인계를 볼 권한이 없습니다 (병동 수간호사 · 인계 당사자 · 같은 팀·같은 근무만)');
    var rc = receiptOf(h.id);
    return { status: 200, body: { handover_id: h.id, inpatient_stay_id: st.id, bed_no: st.bed_no, patient_ref_code: st.patient_ref_code, team_name: teamName(st.team_id), status: h.status, sent_at: h.sent_at, created_at: h.created_at,
      superseded_at: h.superseded_at, superseded_by_handover_id: h.superseded_by_handover_id,
      from_user_name: userName(fromSa.user_id), from_work_date: fromSa.work_date, from_shift_code: fromSa.shift_code, from_role_name: roleName(fromSa.role_type_id),
      to_user_name: userName(toSa.user_id), to_work_date: toSa.work_date, to_shift_code: toSa.shift_code, to_role_name: roleName(toSa.role_type_id),
      items: itemsOf(h.id), receipt: rc ? { received_at: rc.received_at, receiver_summary: rc.receiver_summary, confirmed_at: rc.confirmed_at } : { received_at: null, receiver_summary: null, confirmed_at: null },
      _access: { is_author: isAuthor, is_receiver: isReceiver, via: t2 ? 'party' : t1 ? 'head_nurse' : 'team' } } };
  } };
  OPS.updateHandoverItems = { method: 'PATCH', path: '/handovers/{handoverId}/items', fn: function (ctx, p) {
    var me = requireMe(ctx); var h = requireHandover(p.handoverId);
    if (haSa(h.from_handover_assignment_id).user_id !== me.id) throw new ApiError(403, 'NOT_AUTHOR', '작성자만 수정할 수 있습니다');
    if (h.status !== 'DRAFT') throw new ApiError(409, 'NOT_DRAFT', 'SENT 이후에는 항목을 수정할 수 없습니다 (스냅샷 불변 규칙 2)');
    var items = (p.body && p.body.items) || [];
    items.forEach(function (it) {
      var row = one('handover_item', it.handover_item_id);
      if (!row || row.handover_id !== h.id) throw new ApiError(404, 'ITEM_NOT_FOUND', '항목이 없습니다');
      row.content = it.content == null ? null : String(it.content);
    });
    return { status: 200, body: { handover_id: h.id, items: itemsOf(h.id) }, mutated: true };
  } };
  OPS.sendHandover = { method: 'POST', path: '/handovers/{handoverId}/send', fn: function (ctx, p) {
    var me = requireMe(ctx); var h = requireHandover(p.handoverId);
    if (haSa(h.from_handover_assignment_id).user_id !== me.id) throw new ApiError(403, 'NOT_AUTHOR', '작성자만 넘길 수 있습니다');
    if (h.status !== 'DRAFT') throw new ApiError(409, 'NOT_DRAFT', '현재 상태가 DRAFT 가 아닙니다');
    var missing = itemsOf(h.id).filter(function (i) { return i.is_required && !(i.content && i.content.trim()); });
    if (missing.length) throw new ApiError(422, 'REQUIRED_ITEMS_EMPTY', '필수 항목 ' + missing.length + '개가 비어 있습니다', { items: missing.map(function (i) { return i.label; }) });
    h.status = 'SENT'; h.sent_at = now();
    return { status: 200, body: { handover_id: h.id, status: h.status, sent_at: h.sent_at }, mutated: true };
  } };
  function requireReceiver(ctx, h) {
    var me = requireMe(ctx);
    var toHa = one('handover_assignment', h.to_handover_assignment_id), toSa = haSa(h.to_handover_assignment_id);
    if (toSa.user_id !== me.id) throw new ApiError(403, 'NOT_RECEIVER', '수신 당사자(다음 근무의 인계 담당)만 할 수 있습니다 — 같은 팀 액팅은 열람만');
    // 24라운드 R135 — 작성 쪽(R107)과 대칭: 결원(ABSENT)이거나 담당이 이관(REPLACED)된 수신자는 받을 수 없다
    if (toSa.status !== 'ACTIVE') throw new ApiError(403, 'RECEIVER_ABSENT', '결원(ABSENT)으로 등록된 근무입니다 — 인계 담당은 재배정 화면에서 이관됩니다');
    if (toHa.status !== 'ACTIVE') throw new ApiError(403, 'RECEIVER_REPLACED', '이 인계의 담당은 이미 이관되었습니다(REPLACED)');
    return me;
  }
  function requireSent(h) {
    if (h.status !== 'SENT') throw new ApiError(409, 'NOT_SENT', '현재 상태가 SENT 가 아닙니다 (' + h.status + (h.status === 'SUPERSEDED' ? ' — 읽기 전용' : '') + ')');
  }
  OPS.createHandoverReceipt = { method: 'POST', path: '/handovers/{handoverId}/receipt', fn: function (ctx, p) {
    var h = requireHandover(p.handoverId); requireReceiver(ctx, h); requireSent(h);
    var rc = receiptOf(h.id);
    if (!rc) { rc = { id: global.Store.nextId('handover_receipt'), handover_id: h.id, received_at: now(), receiver_summary: null, confirmed_at: null }; db().handover_receipt.push(rc); }
    else if (!rc.received_at) rc.received_at = now();
    return { status: 201, body: { handover_id: h.id, received_at: rc.received_at }, mutated: true };
  } };
  OPS.updateReceiverSummary = { method: 'PATCH', path: '/handovers/{handoverId}/receipt', fn: function (ctx, p) {
    var h = requireHandover(p.handoverId); requireReceiver(ctx, h); requireSent(h);
    var s = p.body && String(p.body.receiver_summary || '').trim();
    if (!s) throw new ApiError(422, 'SUMMARY_REQUIRED', '요약이 비어 있습니다');
    var rc = receiptOf(h.id);
    if (!rc) { rc = { id: global.Store.nextId('handover_receipt'), handover_id: h.id, received_at: now(), receiver_summary: null, confirmed_at: null }; db().handover_receipt.push(rc); }
    rc.receiver_summary = s;
    return { status: 200, body: { handover_id: h.id, receiver_summary: rc.receiver_summary }, mutated: true };
  } };
  OPS.confirmHandoverReceipt = { method: 'POST', path: '/handovers/{handoverId}/receipt/confirmation', fn: function (ctx, p) {
    var h = requireHandover(p.handoverId); requireReceiver(ctx, h); requireSent(h);
    var rc = receiptOf(h.id);
    if (!rc || !(rc.receiver_summary && rc.receiver_summary.trim())) throw new ApiError(422, 'SUMMARY_REQUIRED', '요약을 입력해야 확인 처리를 할 수 있습니다 — 읽은 것만으로는 확인이 아닙니다');
    rc.confirmed_at = now(); h.status = 'CONFIRMED';
    return { status: 201, body: { handover_id: h.id, status: h.status, confirmed_at: rc.confirmed_at, receiver_summary: rc.receiver_summary }, mutated: true };
  } };

  // ---- 대시보드 ------------------------------------------------
  // 대시보드 드릴다운 — 미확인 건수(집계)와 같은 조건으로 목록을 돌려준다 (25라운드 R141)
  OPS.listWardHandovers = { method: 'GET', path: '/wards/{wardId}/handovers', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    var status = p.status || 'SENT';
    var items = where('handover', function (h) {
      if (h.status !== status) return false;
      if (one('inpatient_stay', h.inpatient_stay_id).ward_id !== p.wardId) return false;
      if (!p.date) return true;
      var fs = haSa(h.from_handover_assignment_id);
      return !!fs && fs.work_date === p.date;
    }).map(function (h) {
      var st = one('inpatient_stay', h.inpatient_stay_id);
      var fs = haSa(h.from_handover_assignment_id), ts = haSa(h.to_handover_assignment_id);
      return { handover_id: h.id, inpatient_stay_id: st.id, bed_no: st.bed_no, patient_ref_code: st.patient_ref_code,
        from_user_name: userName(fs.user_id), to_user_name: userName(ts.user_id),
        work_date: fs.work_date, shift_code: fs.shift_code, status: h.status, sent_at: h.sent_at };
    }).sort(function (a, b) { return a.bed_no < b.bed_no ? -1 : 1; });
    return { status: 200, body: { items: items } };
  } };

  OPS.getWardDashboard = { method: 'GET', path: '/wards/{wardId}/dashboard', fn: function (ctx, p) {
    requireWard(p.wardId); requireHeadNurse(ctx, p.wardId);
    var date = p.date || global.Store.today;
    var act = where('shift_assignment', function (s) { return s.ward_id === p.wardId && s.work_date === date && s.status === 'ACTIVE'; });
    var shift_counts = ['D', 'E', 'N'].map(function (c) { return { shift_code: c, headcount: act.filter(function (s) { return s.shift_code === c; }).length }; });
    var rc = {};
    act.forEach(function (s) { var k = s.shift_code + '|' + (roleName(s.role_type_id) || '미배정'); rc[k] = (rc[k] || 0) + 1; });
    var role_counts = Object.keys(rc).map(function (k) { var x = k.split('|'); return { shift_code: x[0], role_name: x[1], headcount: rc[k] }; });
    var unconfirmed = where('handover', function (h) { return h.status === 'SENT' && one('inpatient_stay', h.inpatient_stay_id).ward_id === p.wardId; }).length;
    var uncovered = where('shift_assignment', function (s) { return s.ward_id === p.wardId && s.work_date === date && s.status === 'ABSENT' && !s.covered_at; })
      .map(function (s) { var u = saUser(s); return { shift_assignment_id: s.id, user_name: u.name, team_name: teamName(u.team_id), work_date: s.work_date, shift_code: s.shift_code, role_name: roleName(s.role_type_id), absence_reason: absenceReason(s.id, false) }; });
    return { status: 200, body: { date: date, shift_counts: shift_counts, role_counts: role_counts, unconfirmed_handover_count: unconfirmed, uncovered_absences: uncovered } };
  } };

  // ============================================================
  // 호출기 — 로그 · 저장
  // ============================================================
  var listeners = [];
  function fillPath(path, p) { return path.replace(/\{(\w+)\}/g, function (_, k) { return p[k] != null ? p[k] : '{' + k + '}'; }); }
  function queryString(op, p) {
    var q = Object.keys(p).filter(function (k) { return k !== 'body' && op.path.indexOf('{' + k + '}') < 0 && p[k] != null && p[k] !== ''; });
    return q.length ? '?' + q.map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&') : '';
  }
  var Api = {
    ApiError: ApiError,
    ops: OPS,
    onLog: function (fn) { listeners.push(fn); },
    invoke: function (name, params) {
      var op = OPS[name]; if (!op) throw new Error('unknown operation ' + name);
      params = params || {};
      var ctx = { me: global.Store.me() };
      var entry = { operationId: name, method: op.method, path: fillPath(op.path, params) + queryString(op, params), body: params.body || null, at: new Date() };
      try {
        var res = op.fn(ctx, params);
        if (res.mutated) global.Store.save();
        entry.status = res.status; entry.response = res.body;
        listeners.forEach(function (f) { f(entry); });
        return res.body;
      } catch (e) {
        if (e instanceof ApiError) {
          entry.status = e.status; entry.response = { code: e.code, message: e.message, details: e.details };
          listeners.forEach(function (f) { f(entry); });
        }
        throw e;
      }
    }
  };
  global.Api = Api;
})(window);
