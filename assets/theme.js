// 主题切换：读取/保存用户偏好到 localStorage，并同步按钮图标
(function () {
  var btn = document.getElementById('themeToggle');
  function sync() {
    if (!btn) return;
    btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  }
  sync();
  if (btn) {
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
  }
})();
