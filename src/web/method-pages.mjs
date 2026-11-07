import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {createLibrary, escape} from './notes.js';
import {htmlIds, htmlHeadingIds} from './validate.mjs';
import {methodHeadingAliases, retainLegacyHeadingIds} from './public-url-compat.mjs';
import {homePaths, noteDescription, renderMetadata} from './seo.mjs';

export const methodPaths = {'zh-TW': 'method/', en: 'method/en/'};
// Historical paths are URL identities only; no example Markdown files are required.
export const legacyMethodNotes = {'zh-TW': '00_入口/兔子洞筆記法.md', en: '00_Entry/Rabbit Hole Method.md'};
export const methodSourceUrls = {
  'zh-TW': 'https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/method.zh-TW.md',
  en: 'https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/method.en.md',
};
const documents = {'zh-TW': 'method.zh-TW.md', en: 'method.en.md'};
const sources = new Map(Object.entries(documents).map(([locale, name]) =>
  [name, readFileSync(new URL(`../../docs/${name}`, import.meta.url), 'utf8')]));
const file = path => path.endsWith('/') ? path + 'index.html' : path;
const relative = (from, to) => (posix.relative(posix.dirname(file(from)), to) || '.') + (to.endsWith('/') ? '/' : '');

// Both canonical pages and legacy reader URLs render the same two sources.
// Compatibility pages use canonical metadata, not another editable method copy.
export function renderMethod(locale, destination = methodPaths[locale]) {
  const other = locale === 'en' ? 'zh-TW' : 'en';
  const library = createLibrary(sources, {linkTo: (path, fragment = '') => {
    const target = Object.keys(documents).find(key => documents[key] === path);
    return relative(destination, methodPaths[target]) + (fragment ? '#' + encodeURIComponent(fragment) : '');
  }});
  for (const language of Object.keys(documents)) {
    const note = library.notes.get(documents[language]);
    retainLegacyHeadingIds(note, methodHeadingAliases[legacyMethodNotes[language]]);
    if (note.html.includes('class="missing-link"')) throw new Error(`Unresolved method link: ${language}`);
  }
  const note = library.notes.get(documents[locale]);
  const translated = library.notes.get(documents[other]);
  const headings = htmlHeadingIds(note.html), translatedHeadings = htmlHeadingIds(translated.html);
  if (headings.length !== translatedHeadings.length) throw new Error('Method headings need paired translations');
  const fragments = Object.fromEntries(headings.map((id, index) => [id, translatedHeadings[index]]));
  for (const [oldId, currentId] of Object.entries(methodHeadingAliases[legacyMethodNotes[locale]])) {
    fragments[oldId] = fragments[currentId];
  }
  for (const id of Object.values(fragments)) if (!htmlIds(translated.html).has(id)) throw new Error(`Missing method fragment: ${id}`);
  const href = target => escape(relative(destination, target));
  const en = locale === 'en';
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'">
  ${renderMetadata({title: note.title, description: noteDescription(note), locale, paths: methodPaths, type: 'article'})}
  <link rel="icon" href="${href('logo.svg')}" type="image/svg+xml">
  <link rel="stylesheet" href="${href('theme.css')}">
  <link rel="stylesheet" href="${href('reader/reader.css')}">
  <link rel="stylesheet" href="${href('locale.css')}">
  <link rel="stylesheet" href="${href('method.css')}">
  <script type="module" src="${href('method.js')}"></script>
</head>
<body class="method-document" data-content-locale="${locale}" data-counterpart="${href(methodPaths[other])}" data-fragments="${escape(JSON.stringify(fragments))}">
  <header class="method-header">
    <nav aria-label="${en ? 'Method navigation' : '筆記法導覽'}">
      <a href="${href(homePaths[locale])}">${en ? 'Home' : '首頁'}</a>
      <a href="${href(en ? 'reader-en/' : 'reader/')}">${en ? "Author's public example" : '作者公開範例'}</a>
    </nav>
    <div class="language-switcher" role="group" aria-label="Language">
      <a href="${href(methodPaths['zh-TW'])}" data-locale="zh-TW" lang="zh-TW" hreflang="zh-TW" aria-label="繁體中文"${!en ? ' aria-current="page"' : ''}>中</a>
      <a href="${href(methodPaths.en)}" data-locale="en" lang="en" hreflang="en" aria-label="English"${en ? ' aria-current="page"' : ''}>EN</a>
    </div>
  </header>
  <main class="method-main"><article class="note">${note.html}</article></main>
</body>
</html>`;
}
