import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary, noteFile, noteUrl } from './library.mjs';
import { escape, startNote } from './notes.js';
import { icon, orderedTree, renderBreadcrumbs, renderContext, renderTree } from './reader/view.js';
import { renderStructure } from './structure.mjs';

const directory = process.env.NOTES_DIR || fileURLToPath(new URL('../../examples/emu-rabbit-tw/', import.meta.url));
const readerPageTitle = '絵夢羽さ沂的兔子洞';
const readerTitle = process.env.READER_TITLE || (process.env.NOTES_DIR ? '' : readerPageTitle);
const library = loadLibrary(directory);
const home = library.notes.get(startNote);
if (!home) throw new Error(`資料夾根目錄需要 ${startNote}。`);

function renderPage(note) {
  return `<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'">
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
    <div class="zip-controls">
      <button class="zip-close" id="zip-close" type="button" data-i18n="closeZip" hidden>返回公開範例</button>
      <p class="zip-status" id="zip-status" role="status">僅在此分頁讀取</p>
      <input id="zip-input" type="file" accept=".zip,application/zip" hidden>
      <button class="zip-open" id="zip-open" type="button" data-i18n="openZip" aria-describedby="zip-status" disabled>開啟本機 ZIP</button>
    </div>
  </aside>
  <div class="reader">
    <header class="topbar">
      <button type="button" class="nav-toggle" aria-label="切換筆記側欄" data-i18n-aria-label="toggleSidebar" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
      <div class="breadcrumbs">${renderBreadcrumbs(note)}</div>
      <div class="language-switcher" role="group" aria-label="Language">
        <button type="button" data-locale="zh-TW" lang="zh-TW" aria-label="繁體中文" aria-pressed="true">中</button>
        <button type="button" data-locale="en" lang="en" aria-label="English" aria-pressed="false">EN</button>
      </div>
    </header>
    <main class="workspace">
      <article class="note" tabindex="-1">${note.html}</article>
      ${renderContext(note, noteUrl)}
    </main>
  </div>
</body>
</html>`;
}

const output = fileURLToPath(new URL('../../dist/', import.meta.url));
const readerOutput = join(output, 'reader');
mkdirSync(readerOutput, { recursive: true });
mkdirSync(join(output, 'vendor'), { recursive: true });
for (const path of [
  'theme.css', 'site.css', 'site.js', 'locale.css', 'locale.js', 'logo.svg', 'rabbit-hole.jpg', 'notes.js',
  'reader/reader.css', 'reader/reader.js', 'reader/view.js', 'reader/zip.js',
  'vendor/markdown-it.js', 'vendor/markdown-it.LICENSE', 'vendor/zip-native.js', 'vendor/zip.LICENSE',
]) {
  copyFileSync(new URL(path, import.meta.url), join(output, path));
}

let index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
for (const asset of ['site.css', 'site.js']) {
  const contents = readFileSync(join(output, asset));
  const version = createHash('sha256').update(contents).digest('hex').slice(0, 12);
  index = index.replace(`"./${asset}"`, `"./${asset}?v=${version}"`);
}
writeFileSync(join(output, 'index.html'), index.replace('<!-- structure-browser -->', renderStructure));

writeFileSync(join(readerOutput, 'navigation.html'), renderTree(orderedTree(library.tree, home), noteUrl));
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
