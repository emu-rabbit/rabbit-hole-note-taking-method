import { copyFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escape, loadLibrary, noteFile, noteUrl, startNote } from './library.mjs';
import { renderStructure } from './structure.mjs';

const directory = process.env.NOTES_DIR || fileURLToPath(new URL('../../examples/emu-rabbit-tw/', import.meta.url));
const readerPageTitle = '絵夢羽さ沂的兔子洞';
const readerTitle = process.env.READER_TITLE || (process.env.NOTES_DIR ? '' : readerPageTitle);
const library = loadLibrary(directory);
const home = library.notes.get(startNote);
if (!home) throw new Error(`資料夾根目錄需要 ${startNote}。`);

const tree = [
  home,
  ...library.tree.filter(node => node.path && node.path !== startNote),
  ...library.tree.filter(node => node.children),
];

const icons = {
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  file: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z"/><path d="M13 3v6h6M9 13h6m-6 4h6"/>',
  menu: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
};

function icon(name) {
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function renderTree(nodes) {
  const rows = nodes.map(node => {
    const name = escape(node.name);
    if (node.children) {
      return `<li><details>
        <summary class="tree-row" title="${name}">${icon('chevron')}${icon('folder')}<span>${name}</span></summary>
        ${renderTree(node.children)}
      </details></li>`;
    }

    return `<li data-note="${escape(`${node.path} ${node.title}`)}"><a class="tree-row" href="${noteUrl(node.path)}" title="${name}">${icon('file')}<span>${name}</span></a></li>`;
  });
  return `<ul class="tree-list">${rows.join('')}</ul>`;
}

function renderContext(note) {
  if (!note.headings.length && !note.backlinks.length) return '';
  const outline = note.headings.length ? `<nav class="outline" aria-label="本頁目錄" data-i18n-aria-label="outline">
    <h2 data-i18n="outline">本頁目錄</h2>
    <ul>${note.headings.map(({ id, label, level }) => `<li class="outline-${level}"><a href="#${encodeURIComponent(id)}">${escape(label)}</a></li>`).join('')}</ul>
  </nav>` : '';
  const backlinks = note.backlinks.length ? `<details class="backlinks">
    <summary>${icon('chevron')}<span data-i18n="backlinks">連到這篇</span><span class="backlink-count">${note.backlinks.length}</span></summary>
    <ul>${note.backlinks.map(link => `<li><a href="${noteUrl(link.path)}" title="${escape(link.path)}">${escape(link.name)}</a></li>`).join('')}</ul>
  </details>` : '';
  return `<aside class="note-context">${outline}${backlinks}</aside>`;
}

function renderPage(note) {
  const location = [...note.parts, note.name];
  const breadcrumbs = location.map((part, index) => {
    const name = escape(part);
    return index === location.length - 1
      ? `<span aria-current="page" title="${name}">${name}</span>`
      : `<span title="${name}">${name}</span>${icon('chevron')}`;
  }).join('');
  return `<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(readerPageTitle)}</title>
  <link rel="icon" href="../logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../theme.css">
  <link rel="stylesheet" href="./reader.css">
  <link rel="stylesheet" href="../locale.css">
  <script type="module" src="./reader.js"></script>
</head>
<body data-note-file="${noteFile(note.path)}">
  <aside id="sidebar" class="sidebar" aria-label="筆記側欄" data-i18n-aria-label="sidebar" tabindex="-1">
    <a class="vault" href="../index.html" title="回到兔子洞筆記法" data-i18n-title="backToSite">
      <img class="vault-mark" src="../logo.svg" width="36" height="36" alt="">
      <strong${readerTitle ? '' : ' data-i18n="readerTitle"'}>${escape(readerTitle || '兔子洞閱讀器')}</strong>
    </a>
    <label class="search">${icon('search')}<input type="search" id="note-search" placeholder="找筆記…" data-i18n-placeholder="searchPlaceholder" aria-label="依名稱找筆記" data-i18n-aria-label="searchLabel" autocomplete="off" disabled><kbd aria-hidden="true">/</kbd></label>
    <div class="tree-header"><span data-i18n="notes">筆記</span><span id="note-count" aria-live="polite">${library.notes.size}</span></div>
    <nav class="tree" aria-label="筆記檔案" data-i18n-aria-label="noteFiles">
      <p class="tree-message" id="empty-search" data-i18n="emptySearch" hidden>找不到符合的筆記</p>
      <p class="tree-message" id="navigation-error" data-i18n="navigationError" hidden>無法載入筆記清單</p>
    </nav>
  </aside>
  <div class="reader">
    <header class="topbar">
      <button type="button" class="nav-toggle" aria-label="切換筆記側欄" data-i18n-aria-label="toggleSidebar" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
      <div class="breadcrumbs">${breadcrumbs}</div>
      <div class="language-switcher" role="group" aria-label="Language">
        <button type="button" data-locale="zh-TW" lang="zh-TW" aria-label="繁體中文" aria-pressed="true">中</button>
        <button type="button" data-locale="en" lang="en" aria-label="English" aria-pressed="false">EN</button>
      </div>
    </header>
    <main class="workspace">
      <article class="note">${note.html}</article>
      ${renderContext(note)}
    </main>
  </div>
</body>
</html>`;
}

const output = fileURLToPath(new URL('../../dist/', import.meta.url));
const readerOutput = join(output, 'reader');
mkdirSync(readerOutput, { recursive: true });
for (const path of ['theme.css', 'site.css', 'site.js', 'locale.css', 'locale.js', 'logo.svg', 'rabbit-hole.jpg', 'reader/reader.css', 'reader/reader.js']) {
  copyFileSync(new URL(path, import.meta.url), join(output, path));
}

const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
writeFileSync(join(output, 'index.html'), index.replace('<!-- structure-browser -->', renderStructure));

writeFileSync(join(readerOutput, 'navigation.html'), renderTree(tree));
const built = new Set();
for (const note of library.notes.values()) {
  const filename = noteFile(note.path);
  writeFileSync(join(readerOutput, filename), renderPage(note));
  built.add(filename);
}
for (const entry of readdirSync(readerOutput, { withFileTypes: true })) {
  if (entry.isFile() && /^note-[a-f0-9]{64}\.html$/.test(entry.name) && !built.has(entry.name)) {
    unlinkSync(join(readerOutput, entry.name));
  }
}

console.log(`已產生 ${library.notes.size} 篇靜態筆記與介紹首頁。`);
