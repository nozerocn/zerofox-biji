# 我的笔记（纯前端 · GitHub Pages）

一个零成本、跨设备的个人笔记网站。**你不用写任何代码**——把内容交给 AI，AI 排版成网页并推送到 GitHub，几秒后线上更新。

## 目录结构
```
index.html            首页（卡片墙 + 搜索 + 分类筛选）
assets/style.css      全部样式（亮/暗主题，响应式）
assets/theme.js       主题切换
assets/app.js         首页逻辑（读取清单、渲染卡片）
notes/manifest.json   笔记清单（所有笔记的索引）
notes/*.html          每篇笔记一个网页
.nojekyll             关闭 Jekyll，按静态文件原样托管
```

## 日常怎么用
1. 把整理好的笔记发给我（文字 / 要点 / 草稿均可）。
2. 我生成 `notes/<slug>.html` 并在 `manifest.json` 登记一行，然后推送到 GitHub。
3. 你打开网址即可看；想改排版直接说，我改完重推。

## 发布到 GitHub Pages（一次性）
- 仓库放这些文件，分支如 `main`。
- 仓库 Settings → Pages → Source 选该分支根目录 → Save。
- 网址：`https://<用户名>.github.io/<仓库名>/`
- 之后每次推送即自动更新（缓存已设为 no-cache，刷新即最新）。

## 写笔记页（submit.html）
纯前端、无需后端，用 Markdown 直接写、一键发布到 GitHub：
1. 打开 `submit.html`，在「GitHub 发布设置」填一次：仓库（owner/repo）、分支（默认 main）、PAT（需 `repo` 权限）。设置存在本浏览器。
2. 填标题、选科目，用 Markdown 写内容，右侧实时预览。
3. 点「🚀 发布到 GitHub」：脚本会
   - 生成 `notes/<slug>.html`（标题转 slug，Markdown 由 marked 渲染）；
   - 在 `notes/manifest.json` 对应科目下登记该笔记（自动去重）；
   - 通过 GitHub Contents API 提交，刷新首页即出现新笔记。
- 其它按钮：「📋 复制 HTML」导出单页 HTML；「💾 存为本地草稿」暂存到浏览器。
- 依赖 CDN 的 marked.js 做 Markdown 渲染（需联网）；离线时预览会提示，但不影响已生成内容。
