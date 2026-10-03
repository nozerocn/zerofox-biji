// 首页逻辑：加载笔记清单（fetch 优先，内嵌数据兜底），按科目渲染分组列表
// 顶部导航标签切换视图：首页=显示全部；点某科目=整页只显示该科目内容
(function () {
  var sectionsEl = document.getElementById('sections');
  var tabsEl = document.getElementById('navTabs');
  var searchEl = document.getElementById('search');
  var emptyEl = document.getElementById('empty');
  var heroEl = document.getElementById('hero');
  if (!sectionsEl) return; // 仅首页执行

  var DATA = null;
  var current = 'home'; // 'home' 或某个 subject.id

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- 标签栏 ----
  function renderTabs() {
    var html = '<button class="tab tab-active" data-id="home">首页</button>';
    DATA.subjects.forEach(function (s) {
      html += '<button class="tab" data-id="' + esc(s.id) + '">' + esc(s.name) + '</button>';
    });
    tabsEl.innerHTML = html;
    tabsEl.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.id === 'home') showAll();
        else showSubject(b.dataset.id);
      });
    });
  }

  function setActive(id) {
    tabsEl.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('tab-active', b.dataset.id === id);
    });
  }

  function showAll() {
    current = 'home';
    if (heroEl) heroEl.style.display = '';
    DATA.subjects.forEach(function (s) {
      var sec = document.getElementById(s.id);
      if (sec) sec.style.display = '';
    });
    setActive('home');
    applyFilter();
    try { history.replaceState(null, '', './index.html'); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function showSubject(id) {
    current = id;
    if (heroEl) heroEl.style.display = 'none';
    DATA.subjects.forEach(function (s) {
      var sec = document.getElementById(s.id);
      if (sec) sec.style.display = (s.id === id) ? '' : 'none';
    });
    setActive(id);
    applyFilter();
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    window.scrollTo(0, 0);
  }

  // ---- 列表渲染 ----
  function itemHtml(n) {
    if (n.slug) {
      return '<a class="item" href="./notes/' + encodeURIComponent(n.slug) + '.html">' +
        '<span class="item-icon">' + esc(n.icon || '📄') + '</span>' +
        '<span class="item-body"><h3>' + esc(n.title) + '</h3>' +
        '<p>' + esc(n.desc || '') + '</p></span></a>';
    }
    return '<div class="item item-disabled">' +
      '<span class="item-icon">' + esc(n.icon || '📄') + '</span>' +
      '<span class="item-body"><h3>' + esc(n.title) + '</h3>' +
      '<p>' + esc(n.desc || '') + '</p></span>' +
      '<span class="badge-soon">整理中</span></div>';
  }

  function renderSections() {
    sectionsEl.innerHTML = DATA.subjects.map(function (s) {
      return '<section class="subject" id="' + esc(s.id) + '" style="--sc:' + esc(s.color) + '">' +
        '<div class="subject-head"><span class="subject-icon">' + esc(s.icon) + '</span>' +
        '<h2>' + esc(s.name) + '</h2></div>' +
        '<div class="items">' + s.notes.map(itemHtml).join('') + '</div>' +
        '</section>';
    }).join('');
  }

  // ---- 搜索过滤（尊重当前视图） ----
  function applyFilter() {
    var q = (searchEl.value || '').trim().toLowerCase();
    var any = false;
    DATA.subjects.forEach(function (s) {
      var sec = document.getElementById(s.id);
      if (!sec) return;
      if (current !== 'home' && s.id !== current) { sec.style.display = 'none'; return; }
      var visible = 0;
      sec.querySelectorAll('.item').forEach(function (el, i) {
        var n = s.notes[i];
        var hay = (n.title + ' ' + (n.desc || '') + ' ' + s.name).toLowerCase();
        var show = !q || hay.indexOf(q) !== -1;
        el.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      sec.style.display = visible ? '' : 'none';
      if (visible) any = true;
    });
    emptyEl.hidden = any;
  }

  function init(data) {
    DATA = data;
    if (!DATA.subjects || !DATA.subjects.length) return;
    renderTabs();
    renderSections();
    if (searchEl) searchEl.addEventListener('input', applyFilter);
    // 支持 #math 这类深链，直接整页显示某科目
    var hash = (location.hash || '').replace('#', '');
    if (hash && DATA.subjects.some(function (s) { return s.id === hash; })) showSubject(hash);
  }

  fetch('./notes/manifest.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function () {
      if (window.EMBEDDED_MANIFEST) { init(window.EMBEDDED_MANIFEST); return; }
      sectionsEl.innerHTML = '<p class="empty">笔记清单加载失败，请通过 GitHub Pages 网址访问。</p>';
    });
})();
