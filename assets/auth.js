// 登录态管理（localStorage 持久登录 + 页面守卫）。纯前端门槛，非真正鉴权。
(function () {
  var KEY = 'nb_authed', UK = 'nb_user';
  window.Auth = {
    isAuthed: function () { return localStorage.getItem(KEY) === '1'; },
    user: function () { return localStorage.getItem(UK) || ''; },
    login: function (u, p) {
      var c = window.SITE_CONFIG || {};
      if (u === c.adminUser && p === c.adminPass) {
        localStorage.setItem(KEY, '1');
        localStorage.setItem(UK, u);
        return true;
      }
      return false;
    },
    logout: function () { localStorage.removeItem(KEY); localStorage.removeItem(UK); }
  };
})();
