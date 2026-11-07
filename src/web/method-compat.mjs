import {readFileSync} from 'node:fs';
import MarkdownIt from './vendor/markdown-it.js';
import {createLibrary, escape} from './notes.js';
import {htmlHeadingIds} from './validate.mjs';
import {methodHeadingAliases} from './public-url-compat.mjs';

// These are published URL identities, not files in the example vaults.
export const legacyMethodNotes = {'zh-TW': '00_入口/兔子洞筆記法.md', en: '00_Entry/Rabbit Hole Method.md'};
export const methodSourceUrls = {
  'zh-TW': 'https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/method.zh-TW.md',
  en: 'https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/method.en.md',
};
const sources = new Map(Object.keys(legacyMethodNotes).map(locale =>
  [locale, readFileSync(new URL(`../../docs/method.${locale}.md`, import.meta.url), 'utf8')]));
export const methodQuoteSources = Object.fromEntries([...sources].map(([locale, text]) => {
  const lines = text.split('\n');
  const heading = lines.findIndex(line => /^## /.test(line) && /當我被認識|When someone gets to know me/.test(line));
  if (heading < 0) throw new Error(`Missing method quote section: ${locale}`);
  let start = heading + 1;
  let end = lines.findIndex((line, index) => index > heading && /^## /.test(line));
  if (end < 0) end = lines.length;
  while (!lines[start].trim()) start++;
  while (!lines[end - 1].trim()) end--;
  return [locale, {url: `${methodSourceUrls[locale]}?plain=1#L${start + 1}-L${end}`, label: `L${start + 1}–${end}`}];
}));

const library = createLibrary(sources, {linkTo: path => path});
const markdown = new MarkdownIt();

// GitHub section-link rules: lowercase, strip formatting/punctuation, replace
// spaces with hyphens, and number duplicate slugs. No network is needed to build.
export const githubHeadingIds = Object.fromEntries([...sources].map(([locale, text]) => {
  const tokens = markdown.parse(text.replace(/^---\n[\s\S]*?\n---\n/, ''), {});
  const counts = new Map(), ids = [];
  for (let i = 0; i < tokens.length; i++) if (tokens[i].type === 'heading_open') {
    const label = tokens[i + 1].children.filter(token => ['text', 'code_inline', 'image'].includes(token.type)).map(token => token.content).join('');
    const slug = label.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '').replace(/ /g, '-');
    const count = counts.get(slug) ?? 0;
    ids.push(slug + (count ? `-${count}` : ''));
    counts.set(slug, count + 1);
  }
  return [locale, ids];
}));

export function methodTargets(locale) {
  const oldIds = htmlHeadingIds(library.notes.get(locale).html);
  return Object.fromEntries(Object.keys(legacyMethodNotes).map(language => {
    if (oldIds.length !== githubHeadingIds[language].length) throw new Error('Method headings need paired translations');
    const fragments = Object.fromEntries(oldIds.map((id, index) => [id, githubHeadingIds[language][index]]));
    for (const [oldId, currentId] of Object.entries(methodHeadingAliases[legacyMethodNotes[locale]])) fragments[oldId] = fragments[currentId];
    return [language, {url: methodSourceUrls[language], fragments}];
  }));
}

export function renderMethodCompatibility(locale) {
  const en = locale === 'en';
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="robots" content="noindex, follow"><link rel="canonical" href="${methodSourceUrls[locale]}">
<title>${en ? 'Rabbit Hole Method' : '兔子洞筆記法'}</title><script type="module" src="../method-compat.js"></script></head>
<body data-method-locale="${locale}" data-method-targets="${escape(JSON.stringify(methodTargets(locale)))}">
<main><h1>${en ? 'Rabbit Hole Method' : '兔子洞筆記法'}</h1>
<p><a href="${methodSourceUrls[locale]}">${en ? 'Read the method on GitHub' : '前往 GitHub 閱讀筆記法'}</a></p>
<nav aria-label="Language"><a href="${methodSourceUrls['zh-TW']}" lang="zh-TW" data-locale="zh-TW">繁體中文</a> · <a href="${methodSourceUrls.en}" lang="en" data-locale="en">English</a></nav></main>
</body></html>`;
}
