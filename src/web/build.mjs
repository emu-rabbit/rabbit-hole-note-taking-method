import {legacyMethodNotes, renderMethodCompatibility, methodQuoteSources} from './method-compat.mjs';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary, noteFile, noteUrl } from './library.mjs';
import { escape, startNote } from './notes.js';
import { icon, orderedTree, renderBreadcrumbs, renderContext, renderTree } from './reader/view.js';
import { validateMappings, validateLibrary, htmlIds, htmlHeadingIds } from './validate.mjs';
import { createVaultZip } from './vault-zip.mjs';
import { localizeHtml } from './localize-html.mjs';
import { readerEnglish } from './reader/messages.js';
import { renderStructure } from './structure.mjs';
import { siteEnglish } from './site-messages.js';
import { legacyHeadingIds } from './public-url-compat.mjs';
import { homeDescriptions, homePaths, noteDescription, renderMetadata, renderSitemap, socialImage } from './seo.mjs';

const mappings = JSON.parse(readFileSync(new URL('./example-paths.json', import.meta.url)));
const locales = [
  { locale: 'zh-TW', folder: 'emu-rabbit-tw', route: 'reader', title: '絵夢羽さ沂的兔子洞' },
  { locale: 'en', folder: 'emu-rabbit-en', route: 'reader-en', title: "Emu-rabbit's Rabbit Hole" },
];
for (const config of locales) {
  config.directory = fileURLToPath(new URL(`../../examples/${config.folder}/`, import.meta.url));
  config.library = loadLibrary(config.directory);
}
validateMappings(mappings, locales);
for (const config of locales) validateLibrary(config.library);

function renderPage(note, config) {
  const { library, locale, title: readerTitle } = config;
  const other = locales.find(item => item !== config);
  const pageTitle = note.title === readerTitle
    ? `${readerTitle} | ${locale === 'en' ? 'Rabbit Hole Notes public example' : '兔子洞筆記法公開範例'}`
    : `${note.title} | ${readerTitle}`;
  const pair = mappings.find(pair => pair[locale] === note.path);
  const translated = other.library.notes.get(pair[other.locale]);
  const paths = Object.fromEntries(locales.map(item => [item.locale, `${item.route}/${noteFile(pair[item.locale])}`]));
  const ids = htmlIds(translated.html);
  const fragments = Object.fromEntries([...htmlIds(note.html)].filter(id => ids.has(id)).map(id => [id, id]));
  const headings = htmlHeadingIds(note.html);
  const translatedHeadings = htmlHeadingIds(translated.html);
  if (headings.length === translatedHeadings.length) headings.forEach((id, index) => { fragments[id] = translatedHeadings[index]; });
  for (const [oldId, currentId] of Object.entries(legacyHeadingIds[note.path] ?? {})) {
    if (fragments[currentId]) fragments[oldId] = fragments[currentId];
  }
  const readingMap = mappings.find(pair => pair.en === '00_Entry/Reading map.md')[locale];
  const shortcuts = `<nav class="reader-shortcuts" aria-label="${locale === 'en' ? 'Start reading' : '開始閱讀'}"><a href="./index.html">README</a><a href="${noteUrl(readingMap)}" data-i18n="readingMap">閱讀地圖</a></nav>`;

  return localizeHtml(`<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'">
  ${renderMetadata({ title: pageTitle, description: noteDescription(note), locale, paths, type: 'article' })}
  <link rel="icon" href="../logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../theme.css">
  <link rel="stylesheet" href="./reader.css">
  <link rel="stylesheet" href="../locale.css">
  <script type="module" src="./reader.js"></script>
</head>
<body data-note-file="${noteFile(note.path)}" data-content-locale="${locale}" data-counterpart="../${other.route}/${noteFile(translated.path)}" data-fragments="${escape(JSON.stringify(fragments))}">
  <aside id="sidebar" class="sidebar" aria-label="筆記側欄" data-i18n-aria-label="sidebar" tabindex="-1">
    <a class="vault" href="../${homePaths[locale]}" title="回到兔子洞筆記法" data-i18n-title="backToSite">
      <img class="vault-mark" src="../logo.svg" width="36" height="36" alt="">
      <strong${readerTitle ? '' : ' data-i18n="readerTitle"'}>${escape(readerTitle || '兔子洞閱讀器')}</strong>
    </a>
    <label class="search">${icon('search')}<input type="search" id="note-search" placeholder="找筆記…" data-i18n-placeholder="searchPlaceholder" aria-label="依名稱找筆記" data-i18n-aria-label="searchLabel" autocomplete="off" disabled><kbd aria-hidden="true">/</kbd></label>
    <div class="tree-header"><span data-i18n="notes">筆記</span><span id="note-count" aria-live="polite">${library.notes.size}</span></div>
    <nav class="tree" aria-label="筆記檔案" data-i18n-aria-label="noteFiles">
      <p class="tree-message" id="empty-search" data-i18n="emptySearch" hidden>找不到符合的筆記</p>
      <p class="tree-message" id="navigation-error" data-i18n="navigationError" hidden>無法載入筆記清單</p>
    </nav>
    <a class="example-download" href="../downloads/${config.folder}.zip" download data-i18n="downloadExample">下載範例筆記庫（ZIP）</a>
  </aside>
  <div class="reader">
    <header class="topbar">
      <button type="button" class="nav-toggle" aria-label="切換筆記側欄" data-i18n-aria-label="toggleSidebar" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
      <div class="breadcrumbs">${renderBreadcrumbs(note)}</div>
      <div class="language-switcher" role="group" aria-label="Language">
        <a href="../${paths['zh-TW']}" data-locale="zh-TW" lang="zh-TW" hreflang="zh-TW" aria-label="繁體中文"${locale === 'zh-TW' ? ' aria-current="page"' : ''}>中</a>
        <a href="../${paths.en}" data-locale="en" lang="en" hreflang="en" aria-label="English"${locale === 'en' ? ' aria-current="page"' : ''}>EN</a>
      </div>
    </header>
    <main class="workspace">
      <article class="note" tabindex="-1">${shortcuts}${note.html}</article>
      ${renderContext(note, noteUrl)}
    </main>
  </div>
</body>
</html>`, locale === 'en' ? readerEnglish : {});
}

const output = fileURLToPath(new URL('../../dist/', import.meta.url));
mkdirSync(join(output, 'reader'), { recursive: true });
mkdirSync(join(output, 'en'), { recursive: true });
mkdirSync(join(output, 'reader-en'), { recursive: true });
mkdirSync(join(output, 'downloads'), { recursive: true });
mkdirSync(join(output, 'vendor'), { recursive: true });
for (const path of [
  'method-compat.js', 'theme.css', 'site.css', 'site.js', 'site-messages.js', 'locale.css', 'locale.js', 'logo.svg', 'rabbit-hole.jpg', socialImage.path, 'notes.js',
  'reader/reader.css', 'reader/reader.js', 'reader/view.js', 'reader/messages.js',
  'vendor/markdown-it.js', 'vendor/markdown-it.LICENSE',
]) {
  copyFileSync(new URL(path, import.meta.url), join(output, path));
}

let index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
for (const asset of ['site.css', 'site.js']) {
  const contents = readFileSync(join(output, asset));
  const version = createHash('sha256').update(contents).digest('hex').slice(0, 12);
  index = index.replace(`"./${asset}"`, `"./${asset}?v=${version}"`);
}
for (const { locale } of locales) {
  let html = index.replace('<!-- structure-browser -->', renderStructure(locale))
    .replace('<!-- method-source-href -->', methodQuoteSources[locale].url)
    .replace('<!-- method-source-lines -->', methodQuoteSources[locale].label);
  if (locale === 'en') {
    html = localizeHtml(html, siteEnglish)
      .replace('<html lang="zh-TW">', '<html lang="en">')
      .replace('data-content-locale="zh-TW"', 'data-content-locale="en"')
      .replace('data-counterpart="./en/"', 'data-counterpart="../"')
      .replaceAll('href="./', 'href="../').replaceAll('src="./', 'src="../')
      .replace('class="brand" href="../index.html"', 'class="brand" href="./"')
      .replaceAll('href="../reader/index.html"', 'href="../reader-en/index.html"')
      .replace(' aria-current="page"', '')
      .replace('aria-label="English"', 'aria-label="English" aria-current="page"');
  }
  html = html.replace('<!-- page-metadata -->', renderMetadata({
    title: locale === 'en' ? siteEnglish.siteTitle : '兔子洞筆記法',
    description: homeDescriptions[locale], locale, paths: homePaths,
  }));
  writeFileSync(join(output, homePaths[locale], 'index.html'), html);
}
// Remove only obsolete generated outputs from the unpublished method-page design.
rmSync(join(output, 'method'), {recursive: true, force: true});
for (const path of ['method.css', 'method.js']) if (existsSync(join(output, path))) unlinkSync(join(output, path));
const sitemapPairs = [homePaths, ...mappings.map(pair =>
  Object.fromEntries(locales.map(config => [config.locale, `${config.route}/${noteFile(pair[config.locale])}`])))];
writeFileSync(join(output, 'sitemap.xml'), renderSitemap(sitemapPairs));

for (const config of locales) {
  const { library } = config;
  const home = library.notes.get(startNote);
  const readerOutput = join(output, config.route);
  for (const asset of ['reader.css', 'reader.js', 'view.js', 'messages.js']) copyFileSync(new URL(`./reader/${asset}`, import.meta.url), join(readerOutput, asset));
  writeFileSync(join(readerOutput, 'navigation.html'), `<!doctype html>
<html lang="${config.locale}"><head><meta charset="utf-8"><meta name="robots" content="noindex, follow"><title>${config.locale === 'en' ? 'Note navigation' : '筆記導覽'}</title></head>
<body>${renderTree(orderedTree(library.tree, home), noteUrl)}</body></html>`);
  const built = new Set();
  for (const note of library.notes.values()) {
    const filename = noteFile(note.path);
    writeFileSync(join(readerOutput, filename), renderPage(note, config));
    built.add(filename);
  }
  const legacyFilename = noteFile(legacyMethodNotes[config.locale]);
  writeFileSync(join(readerOutput, legacyFilename), renderMethodCompatibility(config.locale));
  built.add(legacyFilename);
  for (const entry of readdirSync(readerOutput, { withFileTypes: true })) {
    if (entry.isFile() && (/^note-[a-f0-9]{64}\.html$/.test(entry.name) && !built.has(entry.name) || entry.name === 'zip.js')) unlinkSync(join(readerOutput, entry.name));
  }
  writeFileSync(join(output, 'downloads', `${config.folder}.zip`), createVaultZip(config.directory));
  console.log(`${config.locale}: ${library.notes.size} notes and public vault ZIP`);
}
for (const asset of ['vendor/zip-native.js', 'vendor/zip.LICENSE']) {
  if (existsSync(join(output, asset))) unlinkSync(join(output, asset));
}
