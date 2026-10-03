// 写笔记页逻辑：Markdown 实时预览 + 通过 GitHub Contents API 直接发布
// 1) 生成 notes/<slug>.html；2) 在 notes/manifest.json 对应科目下登记
(function () {
  var SUBJECTS = [
    { id: 'math', name: '数学', icon: '📐' },
    { id: 'physics', name: '物理', icon: '⚛️' },
    { id: 'chemistry', name: '化学', icon: '🧪' },
    { id: 'english', name: '英语', icon: '📘' },
    { id: 'chinese', name: '语文', icon: '📕' },
    { id: 'biology', name: '生物', icon: '🌱' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var repoI = $('cfgRepo'), branchI = $('cfgBranch'), tokenI = $('cfgToken');
  var titleI = $('fTitle'), subjI = $('fSubject'), mdI = $('fMd'), preview = $('preview');
  var status = $('status');

  subjI.innerHTML = SUBJECTS.map(function (s) {
    return '<option value="' + s.id + '">' + s.icon + ' ' + s.name + '</option>';
  }).join('');

  function loadCfg() {
    try {
      var c = JSON.parse(localStorage.getItem('noteCfg') || '{}');
      if (c.repo) repoI.value = c.repo;
      if (c.branch) branchI.value = c.branch;
      if (c.token) tokenI.value = c.token;
    } catch (e) {}
  }
  function saveCfg() {
    localStorage.setItem('noteCfg', JSON.stringify({
      repo: repoI.value.trim(), branch: branchI.value.trim() || 'main', token: tokenI.value.trim()
    }));
  }
  [repoI, branchI, tokenI].forEach(function (el) { el.addEventListener('change', saveCfg); });
  loadCfg();

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function plain(s) {
    return String(s).replace(/[#>*`_\-]/g, '').replace(/\s+/g, ' ').trim();
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function slugify(title) {
    var s = String(title).trim().toLowerCase()
      .replace(/[^\w一-龥]+/g, '-').replace(/^-+|-+$/g, '');
    return s || ('note-' + Date.now());
  }

  function renderPreview() {
    if (typeof marked === 'undefined') {
      preview.innerHTML = '<span class="ph">Markdown 库未加载（需联网加载 CDN）。</span>';
      return;
    }
    var html = marked.parse(mdI.value || '');
    preview.innerHTML = html || '<span class="ph">实时预览会显示在这里…</span>';
  }
  mdI.addEventListener('input', renderPreview);
  renderPreview();

  // —— 图片粘贴 / 拖拽上传 ——
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf), bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }
  function insertAtCursor(text) {
    var s = mdI.selectionStart, e = mdI.selectionEnd;
    mdI.value = mdI.value.slice(0, s) + text + mdI.value.slice(e);
    var pos = s + text.length;
    mdI.selectionStart = mdI.selectionEnd = pos;
    mdI.focus();
    renderPreview();
  }
  function uploadImage(file) {
    var repo = repoI.value.trim(), branch = branchI.value.trim() || 'main', token = tokenI.value.trim();
    if (!repo || !token) return Promise.reject(new Error('请先填写仓库与令牌'));
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('图片 ' + (file.name || '') + ' 超过 5MB，请压缩后重试'));
    var p = repo.split('/'), owner = p[0], repoName = p[1] || p[0];
    var ext = (file.name.split('.').pop() || 'png').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) < 0) ext = 'png';
    var fname = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
    return file.arrayBuffer().then(function (buf) {
      var b64str = bufToB64(buf);
      return fetch('https://api.github.com/repos/' + repo + '/contents/images/' + fname, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'add image: ' + fname, branch: branch, content: b64str })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (j) { return Promise.reject(new Error('图片上传失败(' + r.status + ')' + (j.message ? ': ' + j.message : ''))); });
        return r.json();
      }).then(function () { return 'https://' + owner + '.github.io/' + repoName + '/images/' + fname; });
    });
  }
  function handleImages(files) {
    var repo = repoI.value.trim(), token = tokenI.value.trim();
    if (!repo || !token) { show('要贴图请先在上方填好“仓库（owner/repo）”和“访问令牌 PAT”。', 'err'); return; }
    var n = files.length, done = 0;
    show('正在上传 ' + n + ' 张图片…', 'info');
    var chain = Promise.resolve();
    files.forEach(function (file) {
      chain = chain.then(function () {
        return uploadImage(file).then(function (url) {
          insertAtCursor('![](' + url + ')\n');
          done++;
          show('已上传 ' + done + '/' + n + ' 张图片，已插入正文。', 'info');
        });
      }).catch(function (err) { show('❌ ' + (err && err.message || err), 'err'); });
    });
    chain.then(function () { if (done === n && n > 0) show('✅ 图片已插入，点“发布到 GitHub”即可连同笔记一起发布。', 'ok'); });
  }
  mdI.addEventListener('paste', function (e) {
    var cd = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    if (!cd) return;
    var files = [];
    for (var i = 0; i < cd.items.length; i++) if (cd.items[i].type && cd.items[i].type.indexOf('image') === 0) files.push(cd.items[i].getAsFile());
    if (files.length) { e.preventDefault(); handleImages(files); }
  });
  mdI.addEventListener('dragover', function (e) { e.preventDefault(); });
  mdI.addEventListener('drop', function (e) {
    if (!e.dataTransfer) return;
    var files = Array.prototype.slice.call(e.dataTransfer.files || []).filter(function (f) { return f.type && f.type.indexOf('image') === 0; });
    if (files.length) { e.preventDefault(); handleImages(files); }
  });

  function buildNoteHtml(subj, title, bodyHtml) {
    return '<!DOCTYPE html>\n<html lang="zh-CN" data-theme="light">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + esc(title) + '</title>\n' +
      '<script>const t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);</' + 'script>\n' +
      '<link rel="stylesheet" href="../assets/style.css">\n</head>\n<body>\n' +
      '<header class="topbar"><div class="topbar-inner"><a class="brand" href="../index.html">📚 学习笔记</a>' +
      '<button id="themeToggle" class="theme-btn" aria-label="切换主题">🌙</button></div></header>\n' +
      '<main class="container reading"><a class="back" href="../index.html#' + subj.id + '">← 返回' + esc(subj.name) + '</a>\n' +
      '<article class="note"><div class="note-meta"><span class="card-cat">' + esc(subj.name) + '</span><span>' + today() + '</span></div>\n' +
      '<h1>' + esc(title) + '</h1>\n' + bodyHtml + '\n</article></main>\n' +
      '<script src="../assets/theme.js"></' + 'script>\n</body></html>\n';
  }

  function readManifest(repo, branch, token) {
    return fetch('https://api.github.com/repos/' + repo + '/contents/notes/manifest.json?ref=' + encodeURIComponent(branch), {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('读取 manifest 失败（' + r.status + '），检查仓库/分支/令牌是否正确');
      return r.json();
    }).then(function (j) {
      var data = JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\s/g, '')))));
      return { data: data, sha: j.sha };
    });
  }

  function updateManifest(repo, branch, token, entry, manifest) {
    var sub = manifest.data.subjects.filter(function (s) { return s.id === entry.subjectId; })[0];
    if (!sub) { manifest.data.subjects.push({ id: entry.subjectId, name: entry.subjectName, icon: entry.icon, color: '#2f6df0', notes: [] }); sub = manifest.data.subjects.filter(function (s) { return s.id === entry.subjectId; })[0]; }
    if (!sub.notes.some(function (n) { return n.slug === entry.slug; })) {
      sub.notes.unshift({ icon: entry.icon, slug: entry.slug, title: entry.title, desc: entry.desc });
    }
    return fetch('https://api.github.com/repos/' + repo + '/contents/notes/manifest.json', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'add note to manifest: ' + entry.title, branch: branch, sha: manifest.sha, content: b64(JSON.stringify(manifest.data, null, 2)) })
    }).then(function (r) {
      if (!r.ok) throw new Error('更新 manifest 失败（' + r.status + '）');
    });
  }

  function show(msg, type) { status.className = 'status ' + (type || 'info'); status.innerHTML = msg; }

  function publish() {
    var repo = repoI.value.trim(), branch = branchI.value.trim() || 'main', token = tokenI.value.trim();
    var title = titleI.value.trim(), md = mdI.value.trim();
    var subj = SUBJECTS.filter(function (s) { return s.id === subjI.value; })[0];
    if (!repo || !token) { show('请先填写“仓库（owner/repo）”和“访问令牌 PAT”。', 'err'); return; }
    if (!title) { show('请填写标题。', 'err'); return; }
    if (!md) { show('请填写内容。', 'err'); return; }
    if (typeof marked === 'undefined') { show('Markdown 库未加载，请联网后重试。', 'err'); return; }
    saveCfg();

    var slug = slugify(title);
    var bodyHtml = marked.parse(md);
    var desc = plain(md).slice(0, 40);
    var noteHtml = buildNoteHtml(subj, title, bodyHtml);
    var btn = $('btnPublish');
    btn.disabled = true;
    show('正在发布…', 'info');

    fetch('https://api.github.com/repos/' + repo + '/contents/notes/' + slug + '.html', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'add note: ' + title, branch: branch, content: b64(noteHtml) })
    })
      .then(function (r) {
        if (r.status === 422) throw new Error('该标题对应的文件已存在（' + slug + '），换个标题试试。');
        if (!r.ok) throw new Error('创建笔记文件失败（' + r.status + '）');
        return readManifest(repo, branch, token);
      })
      .then(function (m) { return updateManifest(repo, branch, token, { subjectId: subj.id, subjectName: subj.name, icon: subj.icon, slug: slug, title: title, desc: desc }, m); })
      .then(function () {
        btn.disabled = false;
        show('✅ 发布成功！刷新首页即可看到《' + esc(title) + '》。<a href="./notes/' + slug + '.html" target="_blank">查看笔记 →</a>', 'ok');
      })
      .catch(function (e) { btn.disabled = false; show('❌ ' + esc(e.message), 'err'); });
  }

  $('btnPublish').addEventListener('click', publish);

  $('btnCopy').addEventListener('click', function () {
    var subj = SUBJECTS.filter(function (s) { return s.id === subjI.value; })[0];
    if (typeof marked === 'undefined') { show('Markdown 库未加载，请联网后重试。', 'err'); return; }
    var h = buildNoteHtml(subj, titleI.value.trim() || '标题', marked.parse(mdI.value));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(h).then(function () { show('已复制 HTML 到剪贴板，可交给 AI 或手动发布。', 'ok'); },
        function () { show('复制失败，可改用“存为本地草稿”。', 'err'); });
    } else { show('当前环境不支持复制，请用“存为本地草稿”。', 'err'); }
  });

  $('btnLocal').addEventListener('click', function () {
    try {
      var d = JSON.parse(localStorage.getItem('noteDrafts') || '[]');
      d.push({ title: titleI.value, subject: subjI.value, md: mdI.value, t: Date.now() });
      localStorage.setItem('noteDrafts', JSON.stringify(d));
      show('已存为本地草稿（本浏览器）。', 'ok');
    } catch (e) { show('保存失败：' + esc(e.message), 'err'); }
  });
})();
