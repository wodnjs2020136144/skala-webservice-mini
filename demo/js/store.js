/* ============================================================
 * store.js — 상태 보관 · localStorage · 데모 시계 · 초기화
 * ============================================================ */
(function (global) {
  'use strict';
  var KEY = 'nvn-demo-v1';
  var DEMO_TODAY = '2026-09-16';
  var DEMO_BASE = new Date('2026-09-16T21:30:00');
  var loadedAt = Date.now();

  var Store = {
    db: null,
    meta: { userId: null, lastNow: null },
    today: DEMO_TODAY,

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* 사생활 모드 등 */ }
      if (raw) {
        try { var o = JSON.parse(raw); this.db = o.db; this.meta = o.meta || this.meta; return this; } catch (e) { /* fallthrough */ }
      }
      this.reset();
      return this;
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify({ db: this.db, meta: this.meta })); } catch (e) { /* 무시 */ }
    },
    reset: function () {
      this.db = global.Seed.build();
      this.meta = { userId: null, lastNow: null };
      loadedAt = Date.now();
      this.save();
    },
    /* 데모 시계: 21:30 + 페이지 열린 뒤 경과 시간. 새로고침 뒤에도 뒤로 가지 않게 lastNow 보다 1분 앞 보장 */
    now: function () {
      var t = new Date(DEMO_BASE.getTime() + (Date.now() - loadedAt));
      if (this.meta.lastNow) { var last = new Date(this.meta.lastNow); if (t <= last) t = new Date(last.getTime() + 60000); }
      this.meta.lastNow = fmt(t);
      return this.meta.lastNow;
    },
    nextId: function (table) {
      return this.db[table].reduce(function (m, r) { return typeof r.id === 'number' && r.id > m ? r.id : m; }, 0) + 1;
    },
    me: function () {
      var id = this.meta.userId;
      return id ? this.db.users.filter(function (u) { return u.id === id; })[0] || null : null;
    },
    setUser: function (id) { this.meta.userId = id; this.save(); }
  };

  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) {
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
  }

  global.Store = Store;
})(window);
