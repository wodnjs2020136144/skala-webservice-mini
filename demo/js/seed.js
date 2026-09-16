/* ============================================================
 * seed.js — 가상 시드 데이터 (12 테이블 · DBML 컬럼명 그대로)
 *
 * ★ 전부 가상이다. 실제 환자·병원·실명 없음. 환자 마스터를 두지 않는다
 *   (inpatient_stay 는 병상번호 + 외부 참조 코드만 — DBML inpatient_stay note).
 *
 * 데모 시계: 오늘 = 2026-09-16, 기준 시각 21:30 (store.js DEMO_BASE)
 *
 * 근무표 (5병동 · A팀 501~503호 · B팀 504~506호)
 *   09-14 N  이민혜(A차지)
 *   09-15 D  박지우(A차지)
 *   09-15 E  박영숙(A차지 · ABSENT · 대체 완료)  정하늘(A차지 · 대체자)
 *   09-16 D  박지우(A차지) 윤지아(A액팅) 오다은(B차지) 강나래(B액팅)
 *   09-16 E  한서윤(A차지) 이민혜(A액팅) 서지호(B차지)
 *   09-16 N  정하늘(A차지) 한가람(B차지 · ABSENT · 대체 전) 최서연(B · 역할 미배정)
 *   09-17 D  박지우(A차지)
 *   09-17 N  이민혜(A차지 · 담당 미지정)
 * ============================================================ */
(function (global) {
  'use strict';

  function ts(date, hm) { return date + 'T' + hm + ':00'; }

  function build() {
    var db = {
      ward: [{ id: 5, name: '5병동' }],
      team: [
        { id: 1, ward_id: 5, name: 'A팀' },
        { id: 2, ward_id: 5, name: 'B팀' }
      ],
      users: [
        { id: 'H001', name: '김수진', ward_id: 5, team_id: null, user_type: 'HEAD_NURSE' },
        { id: 'N001', name: '박지우', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N002', name: '이민혜', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N003', name: '한서윤', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N004', name: '정하늘', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N005', name: '윤지아', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N009', name: '박영숙', ward_id: 5, team_id: 1, user_type: 'NURSE' },
        { id: 'N006', name: '최서연', ward_id: 5, team_id: 2, user_type: 'NURSE' },
        { id: 'N007', name: '한가람', ward_id: 5, team_id: 2, user_type: 'NURSE' },
        { id: 'N008', name: '오다은', ward_id: 5, team_id: 2, user_type: 'NURSE' },
        { id: 'N010', name: '서지호', ward_id: 5, team_id: 2, user_type: 'NURSE' },
        { id: 'N011', name: '강나래', ward_id: 5, team_id: 2, user_type: 'NURSE' }
      ],
      role_type: [
        { id: 1, ward_id: 5, name: '차지' },
        { id: 2, ward_id: 5, name: '서브차지' },
        { id: 3, ward_id: 5, name: '액팅' }
      ],
      inpatient_stay: [
        { id: 1, ward_id: 5, team_id: 1, bed_no: '501-1', patient_ref_code: 'STAY-2026-0912-014', admitted_at: ts('2026-09-12', '10:20'), discharged_at: null, status: 'ACTIVE' },
        { id: 2, ward_id: 5, team_id: 1, bed_no: '501-3', patient_ref_code: 'STAY-2026-0914-021', admitted_at: ts('2026-09-14', '16:40'), discharged_at: null, status: 'ACTIVE' },
        { id: 3, ward_id: 5, team_id: 1, bed_no: '502-2', patient_ref_code: 'STAY-2026-0908-006', admitted_at: ts('2026-09-08', '09:05'), discharged_at: null, status: 'ACTIVE' },
        { id: 4, ward_id: 5, team_id: 1, bed_no: '503-1', patient_ref_code: 'STAY-2026-0916-003', admitted_at: ts('2026-09-16', '11:30'), discharged_at: null, status: 'ACTIVE' },
        { id: 5, ward_id: 5, team_id: 2, bed_no: '504-1', patient_ref_code: 'STAY-2026-0901-011', admitted_at: ts('2026-09-01', '14:00'), discharged_at: null, status: 'ACTIVE' },
        { id: 6, ward_id: 5, team_id: 2, bed_no: '504-3', patient_ref_code: 'STAY-2026-0910-044', admitted_at: ts('2026-09-10', '13:15'), discharged_at: null, status: 'ACTIVE' },
        { id: 7, ward_id: 5, team_id: 2, bed_no: '505-2', patient_ref_code: 'STAY-2026-0911-019', admitted_at: ts('2026-09-11', '08:50'), discharged_at: null, status: 'ACTIVE' },
        { id: 8, ward_id: 5, team_id: 1, bed_no: '503-1', patient_ref_code: 'STAY-2026-0913-032', admitted_at: ts('2026-09-13', '15:10'), discharged_at: ts('2026-09-15', '11:00'), status: 'CLOSED' }
      ],
      handover_template_item: [
        { id: 1, ward_id: 5, label: '환자 · 현재 상태', is_required: true, sort_order: 1 },
        { id: 2, ward_id: 5, label: '주요 사정 내용', is_required: true, sort_order: 2 },
        { id: 3, ward_id: 5, label: '이번 근무 중 수행한 조치', is_required: true, sort_order: 3 },
        { id: 4, ward_id: 5, label: '안전 고려사항 (낙상·억제대·알레르기 등)', is_required: true, sort_order: 4 },
        { id: 5, ward_id: 5, label: '다음 근무자가 확인할 것', is_required: true, sort_order: 5 },
        { id: 6, ward_id: 5, label: '배경 · 입원 경위', is_required: false, sort_order: 6 },
        { id: 7, ward_id: 5, label: '기타 특이사항', is_required: false, sort_order: 7 }
      ],
      shift_assignment: [],
      handover_assignment: [],
      handover: [],
      handover_item: [],
      handover_receipt: [],
      reassignment_log: []
    };

    var seq = { ha: 0, h: 0, hi: 0, rc: 0, lg: 0 };

    // ---- 근무 -------------------------------------------------
    function sa(id, user, date, code, role, opt) {
      opt = opt || {};
      db.shift_assignment.push({
        id: id, ward_id: 5, user_id: user, work_date: date, shift_code: code,
        role_type_id: role, status: opt.status || 'ACTIVE',
        covered_at: opt.covered_at || null,
        created_at: opt.created_at || ts('2026-09-01', '09:00')
      });
      return id;
    }
    sa(101, 'N002', '2026-09-14', 'N', 1);
    sa(102, 'N001', '2026-09-15', 'D', 1);
    sa(103, 'N009', '2026-09-15', 'E', 1, { status: 'ABSENT', covered_at: ts('2026-09-15', '09:12') });
    sa(104, 'N004', '2026-09-15', 'E', 1, { created_at: ts('2026-09-15', '08:44') });
    sa(201, 'N001', '2026-09-16', 'D', 1);
    sa(202, 'N005', '2026-09-16', 'D', 3);
    sa(203, 'N008', '2026-09-16', 'D', 1);
    sa(204, 'N011', '2026-09-16', 'D', 3);
    sa(211, 'N003', '2026-09-16', 'E', 1);
    sa(212, 'N002', '2026-09-16', 'E', 3);
    sa(213, 'N010', '2026-09-16', 'E', 1);
    sa(221, 'N004', '2026-09-16', 'N', 1);
    sa(222, 'N007', '2026-09-16', 'N', 1, { status: 'ABSENT' });
    sa(223, 'N006', '2026-09-16', 'N', null);
    sa(231, 'N001', '2026-09-17', 'D', 1);
    sa(232, 'N002', '2026-09-17', 'N', 1);

    // ---- 인계 담당 (팀 차지 근무에만) ---------------------------
    var haIdx = {}; // key "sa:stay" -> handover_assignment id (ACTIVE 인 것)
    function ha(saId, stayId, opt) {
      opt = opt || {};
      var id = ++seq.ha;
      db.handover_assignment.push({
        id: id, shift_assignment_id: saId, inpatient_stay_id: stayId,
        status: opt.status || 'ACTIVE', created_at: opt.created_at || ts('2026-09-15', '17:00')
      });
      if (!opt.status || opt.status === 'ACTIVE') haIdx[saId + ':' + stayId] = id;
      return id;
    }
    ha(101, 8);
    ha(102, 3); ha(102, 8);
    var ha103_3 = ha(103, 3, { status: 'REPLACED' });
    var ha104_3 = ha(104, 3, { created_at: ts('2026-09-15', '08:50') });
    [1, 2, 3, 4].forEach(function (s) { ha(201, s); ha(211, s); ha(221, s); });
    [5, 6, 7].forEach(function (s) { ha(203, s); ha(213, s); });
    ha(222, 5); ha(222, 6); // 한가람 — 505-2 는 아직 미지정(부분 지정 상태)

    // ---- 인계 ---------------------------------------------------
    var T = db.handover_template_item;
    var TXT = {
      full: ['현재 의식 명료, 활력징후 안정. 오전 대비 변화 없음.',
             '좌측 하지 부종 지속. 통증 호소 NRS 3점으로 감소.',
             '18시 처방 투약 완료. 20시 드레싱 교환.',
             '낙상 고위험. 침상 난간 상시 올림.',
             '자정 검사 결과 확인 후 이상 시 당직의 연락.',
             '9/14 응급실 경유 입원.',
             '보호자 면회 22시 이후 없음.'],
      b: ['의식 명료. 활력징후 안정.',
          '식사량 절반. 오심 호소 없음.',
          '14시 수액 교체. 16시 활력징후 측정.',
          '알레르기 없음. 낙상 저위험.',
          '수술 전 금식 자정부터 시작 확인.',
          '9/1 외래 경유 입원.',
          '']
    };
    function handover(stay, fromSa, toSa, status, opt) {
      opt = opt || {};
      var id = ++seq.h;
      var fromHa = haIdx[fromSa + ':' + stay], toHa = opt.toHa || haIdx[toSa + ':' + stay];
      if (!fromHa || !toHa) throw new Error('seed: handover_assignment 없음 ' + fromSa + '/' + toSa + ' stay ' + stay);
      db.handover.push({
        id: id, inpatient_stay_id: stay,
        from_handover_assignment_id: fromHa, to_handover_assignment_id: toHa,
        status: status, created_at: opt.created_at, sent_at: opt.sent_at || null,
        superseded_at: opt.superseded_at || null, superseded_by_handover_id: null
      });
      var contents = opt.contents || TXT.full;
      T.forEach(function (t, i) {
        db.handover_item.push({
          id: ++seq.hi, handover_id: id, label: t.label, content: contents[i] || null,
          is_required: t.is_required, sort_order: t.sort_order
        });
      });
      if (opt.receipt) {
        db.handover_receipt.push({
          id: ++seq.rc, handover_id: id,
          received_at: opt.receipt.received_at || null,
          receiver_summary: opt.receipt.receiver_summary || null,
          confirmed_at: opt.receipt.confirmed_at || null
        });
      }
      return id;
    }

    // 09-14 N → 09-15 D · 503-1(퇴원 건) · 확인 완료
    handover(8, 101, 102, 'CONFIRMED', {
      created_at: ts('2026-09-15', '06:30'), sent_at: ts('2026-09-15', '07:50'),
      receipt: { received_at: ts('2026-09-15', '07:58'), receiver_summary: '503-1 퇴원 예정. 오전 회진 후 퇴원 약 확인.', confirmed_at: ts('2026-09-15', '08:05') }
    });
    // 09-15 D → 09-15 E · 502-2 · 원본(박영숙 수신) DRAFT → SUPERSEDED, 후속(정하늘 수신) CONFIRMED
    var h2 = handover(3, 102, 103, 'SUPERSEDED', {
      created_at: ts('2026-09-15', '08:30'), superseded_at: ts('2026-09-15', '08:50'), toHa: ha103_3,
      contents: [TXT.full[0], TXT.full[1], '', TXT.full[3], '', '9/8 입원.', '']
    });
    var h3 = handover(3, 102, 104, 'CONFIRMED', {
      created_at: ts('2026-09-15', '08:50'), sent_at: ts('2026-09-15', '13:55'), toHa: ha104_3,
      contents: [TXT.full[0], TXT.full[1], '10시 처방 투약 완료.', TXT.full[3], '저녁 활력징후 재측정.', '9/8 입원.', ''],
      receipt: { received_at: ts('2026-09-15', '14:10'), receiver_summary: '502-2 낙상 고위험. 저녁 활력징후 재측정.', confirmed_at: ts('2026-09-15', '14:20') }
    });
    db.handover[h2 - 1].superseded_by_handover_id = h3;

    // 09-16 D → 09-16 E · A팀 501-1 · 501-3 · 확인 완료
    handover(1, 201, 211, 'CONFIRMED', {
      created_at: ts('2026-09-16', '13:20'), sent_at: ts('2026-09-16', '13:50'),
      contents: ['의식 명료. 활력징후 안정.', '우측 상지 통증 NRS 2점.', '09시 처방 투약 완료.', '낙상 고위험. 난간 올림.', '오후 물리치료 일정 확인.', '9/12 입원.', ''],
      receipt: { received_at: ts('2026-09-16', '14:05'), receiver_summary: '501-1 낙상 고위험. 오후 물리치료 확인.', confirmed_at: ts('2026-09-16', '14:20') }
    });
    handover(2, 201, 211, 'CONFIRMED', {
      created_at: ts('2026-09-16', '13:25'), sent_at: ts('2026-09-16', '13:52'),
      contents: ['의식 명료. 활력징후 안정.', '좌측 하지 부종. 통증 NRS 4점.', '10시 진통제 투약.', '낙상 고위험. 난간 올림.', '저녁 부종 상태 재사정.', '9/14 응급실 경유 입원.', ''],
      receipt: { received_at: ts('2026-09-16', '14:06'), receiver_summary: '501-3 하지 부종 재사정. 낙상 고위험.', confirmed_at: ts('2026-09-16', '14:22') }
    });
    // 09-16 E → 09-16 N · A팀 501-1 · SENT (정하늘 확인 대기)
    handover(1, 211, 221, 'SENT', {
      created_at: ts('2026-09-16', '20:40'), sent_at: ts('2026-09-16', '21:10'),
      contents: ['의식 명료. 활력징후 안정.', '우측 상지 통증 NRS 1점으로 감소.', '18시 처방 투약 완료.', '낙상 고위험. 난간 올림.', '자정 활력징후 측정.', '9/12 입원.', '']
    });
    // 09-16 E → 09-16 N · A팀 501-3 · DRAFT (시연: 필수 2개 비어 있음 → 422)
    handover(2, 211, 221, 'DRAFT', {
      created_at: ts('2026-09-16', '21:15'),
      contents: [TXT.full[0], TXT.full[1], '', TXT.full[3], '', TXT.full[5], '']
    });
    // 09-16 E → 09-16 N · B팀 504-1 · SENT (한가람 수신 → 결원 → 이관 시 SUPERSEDED)
    handover(5, 213, 222, 'SENT', {
      created_at: ts('2026-09-16', '20:30'), sent_at: ts('2026-09-16', '21:05'), contents: TXT.b
    });

    // ---- 변경 이력 ---------------------------------------------
    function log(type, fromSa, toSa, fromHa, toHa, at, reason) {
      db.reassignment_log.push({
        id: ++seq.lg, change_type: type,
        from_shift_assignment_id: fromSa, to_shift_assignment_id: toSa || null,
        from_handover_assignment_id: fromHa || null, to_handover_assignment_id: toHa || null,
        changed_by_user_id: 'H001', change_reason: reason, changed_at: at
      });
    }
    log('ABSENCE_REGISTERED', 103, null, null, null, ts('2026-09-15', '08:40'), '당일 병가');
    log('SUBSTITUTE_ASSIGNED', 103, 104, null, null, ts('2026-09-15', '08:44'), '당일 병가');
    log('HANDOVER_OWNER_TRANSFERRED', 103, 104, ha103_3, ha104_3, ts('2026-09-15', '08:50'), '당일 병가');
    log('COVER_CONFIRMED', 103, null, null, null, ts('2026-09-15', '09:12'), '당일 병가');
    log('ABSENCE_REGISTERED', 222, null, null, null, ts('2026-09-16', '20:40'), '당일 병가');

    return db;
  }

  /* ---- 시드 검증 — 목업의 어긋남을 코드로 잡는다 ---------------- */
  var ORDER = { D: 0, E: 1, N: 2 };
  function dayNum(d) { return Math.round(new Date(d + 'T00:00:00Z').getTime() / 86400000); }
  function shiftIndex(sa) { return dayNum(sa.work_date) * 3 + ORDER[sa.shift_code]; }
  function hours(sa) { // [start, end) 절대 시간(시) — 겹침 검사용
    var base = dayNum(sa.work_date) * 24;
    return { D: [base + 7, base + 15], E: [base + 14, base + 22], N: [base + 22, base + 32] }[sa.shift_code];
  }

  function check(db, opt) {
    opt = opt || {}; // opt.seedOnly=false 면 시드 전용 규칙(담당은 차지 근무에만)을 건너뛴다 — DB·API 는 강제하지 않는다
    var v = [];
    var byId = function (t, id) { return db[t].filter(function (r) { return r.id === id; })[0]; };
    // 1 같은 사람의 근무 시간 겹침
    db.shift_assignment.forEach(function (a) {
      db.shift_assignment.forEach(function (b) {
        if (a.id >= b.id || a.user_id !== b.user_id) return;
        var x = hours(a), y = hours(b);
        if (x[0] < y[1] && y[0] < x[1]) v.push('근무 겹침: ' + a.user_id + ' ' + a.work_date + a.shift_code + ' / ' + b.work_date + b.shift_code);
      });
    });
    // 2 인계 from→to 는 같은 입원 건 · 시간상 바로 다음 근무
    db.handover.forEach(function (h) {
      var f = byId('handover_assignment', h.from_handover_assignment_id), t = byId('handover_assignment', h.to_handover_assignment_id);
      if (!f || !t) { v.push('인계 ' + h.id + ': 담당 행 없음'); return; }
      if (f.inpatient_stay_id !== h.inpatient_stay_id || t.inpatient_stay_id !== h.inpatient_stay_id) v.push('인계 ' + h.id + ': 입원 건 불일치');
      var fs = byId('shift_assignment', f.shift_assignment_id), tsa = byId('shift_assignment', t.shift_assignment_id);
      if (shiftIndex(tsa) !== shiftIndex(fs) + 1) v.push('인계 ' + h.id + ': from→to 가 연속 근무가 아님 (' + fs.work_date + fs.shift_code + ' → ' + tsa.work_date + tsa.shift_code + ')');
      if (h.status === 'SUPERSEDED' && !h.superseded_by_handover_id) v.push('인계 ' + h.id + ': SUPERSEDED 인데 후속 없음 (422)');
      if (h.status !== 'SUPERSEDED' && h.superseded_by_handover_id) v.push('인계 ' + h.id + ': SUPERSEDED 아닌데 후속 있음');
      if ((h.status === 'SENT' || h.status === 'CONFIRMED') && !h.sent_at) v.push('인계 ' + h.id + ': ' + h.status + ' 인데 sent_at 없음');
      var rc = db.handover_receipt.filter(function (r) { return r.handover_id === h.id; });
      if (rc.length > 1) v.push('인계 ' + h.id + ': receipt 2건 (1:1 위반)');
      if (h.status === 'CONFIRMED' && !(rc[0] && rc[0].confirmed_at && rc[0].receiver_summary)) v.push('인계 ' + h.id + ': CONFIRMED 인데 요약·확인 시각 없음');
    });
    // 3 인계 담당은 팀 차지 근무에만(시드 규칙 — DB·API 는 강제하지 않는다) · 같은 근무·입원 건 ACTIVE 중복 없음
    var seen = {};
    db.handover_assignment.forEach(function (a) {
      var s = byId('shift_assignment', a.shift_assignment_id), stay = byId('inpatient_stay', a.inpatient_stay_id);
      var u = byId('users', s.user_id);
      if (opt.seedOnly !== false && s.role_type_id !== 1) v.push('담당 ' + a.id + ': 차지가 아닌 근무(' + s.user_id + ')에 인계 담당');
      if (u.team_id !== stay.team_id) v.push('담당 ' + a.id + ': 팀 불일치 ' + s.user_id + ' / stay ' + stay.id);
      if (s.ward_id !== stay.ward_id) v.push('담당 ' + a.id + ': 병동 불일치');
      if (a.status === 'ACTIVE') { var k = a.shift_assignment_id + ':' + a.inpatient_stay_id; if (seen[k]) v.push('담당 중복 ACTIVE ' + k); seen[k] = 1; }
    });
    // 4 로그 유효 조합
    var need = { ABSENCE_REGISTERED: [1, 0, 0, 0], SUBSTITUTE_ASSIGNED: [1, 1, 0, 0], HANDOVER_OWNER_TRANSFERRED: [1, 1, 1, 1], COVER_CONFIRMED: [1, 0, 0, 0] };
    db.reassignment_log.forEach(function (l) {
      var n = need[l.change_type], got = [l.from_shift_assignment_id, l.to_shift_assignment_id, l.from_handover_assignment_id, l.to_handover_assignment_id];
      got.forEach(function (g, i) { if (!!g !== !!n[i]) v.push('로그 ' + l.id + ' ' + l.change_type + ': FK 조합 위반'); });
    });
    // 5 결원자의 covered_at 이 있으면 SUBSTITUTE_ASSIGNED 가 있어야 한다
    db.shift_assignment.forEach(function (s) {
      if (s.covered_at && !db.reassignment_log.some(function (l) { return l.change_type === 'SUBSTITUTE_ASSIGNED' && l.from_shift_assignment_id === s.id; }))
        v.push('근무 ' + s.id + ': covered_at 있는데 SUBSTITUTE_ASSIGNED 없음 (422)');
    });
    return v;
  }

  global.Seed = { build: build, check: check, shiftIndex: shiftIndex, dayNum: dayNum, ORDER: ORDER };
})(window);
