import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLibrary } from '../src/web/notes.js';
import { noteFile, noteUrl } from '../src/web/library.mjs';
import { validateLibrary, validateMappings } from '../src/web/validate.mjs';
import { createVaultZip } from '../src/web/vault-zip.mjs';
import { equivalentUrl, chooseLocale } from '../src/web/locale.js';

const library = entries => createLibrary(new Map(entries), { linkTo: noteUrl });
test('locale selection and equivalent source block URLs', () => {
  assert.equal(chooseLocale('en', ['zh-TW']), 'en');
  const url = equivalentUrl('https://example.test/repo/reader/index.html?lang=zh-TW#block-source-1', '../reader-en/index.html', { 'block-source-1': 'block-source-1' });
  assert.equal(url.href, 'https://example.test/repo/reader-en/index.html#block-source-1');
  assert.equal(equivalentUrl(url, '../reader/index.html', {}).hash, '');
  assert.equal(noteFile('README.md'), 'index.html');
});
test('Wiki links, headings, footnotes and source anchors validate', () => {
  validateLibrary(library([['README.md', '# Home\n[[Source#^source-1]]\n[[Source#Heading]]\n[Source](Source.md#heading)'], ['Source.md', '# Source\n## Heading\nA paragraph.\n^source-1\n']]));
});
test('missing notes and fragments fail validation', () => {
  assert.throws(() => validateLibrary(library([['README.md', '[[Missing]]']])));
  assert.throws(() => validateLibrary(library([['README.md', '[bad](#missing)']])));
  assert.throws(() => validateLibrary(library([['README.md', '[[README#^missing]]']])));
});
test('mapping is complete and bijective', () => {
  const locales = [{locale: 'en', library: library([['README.md', '# Home']])}];
  validateMappings([{en: 'README.md'}], locales);
  assert.throws(() => validateMappings([], locales));
  assert.throws(() => validateMappings([{en:'README.md'}, {en:'README.md'}], locales));
});
test('ZIP is deterministic and excludes hidden, symlink and non-Markdown input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'public-vault-'));
  try {
    writeFileSync(join(directory, 'README.md'), '# Public');
    writeFileSync(join(directory, 'secret.txt'), 'PRIVATE TEXT');
    mkdirSync(join(directory, '.private'));
    writeFileSync(join(directory, '.private', 'secret.md'), 'PRIVATE NOTE');
    symlinkSync(join(directory, 'secret.txt'), join(directory, 'linked.md'));
    const archive = createVaultZip(directory);
    assert.deepEqual(archive, createVaultZip(directory));
    assert.ok(archive.includes(Buffer.from('README.md')));
    assert.ok(!archive.includes(Buffer.from('PRIVATE')));
    assert.ok(!archive.includes(Buffer.from('linked.md')));
  } finally { rmSync(directory, {recursive: true}); }
});
test('translated source block IDs must stay aligned', () => {
  const locales = [
    {locale: 'zh-TW', library: library([['README.md', 'Source\n^shared-id\n']])},
    {locale: 'en', library: library([['README.md', 'Source\n^different-id\n']])},
  ];
  assert.throws(() => validateMappings([{'zh-TW': 'README.md', en: 'README.md'}], locales), /block IDs differ/);
});

// Minimal DOM harness exercises the actual shared locale controller without
// adding a runtime dependency to this static site.
import { initializeLocale } from '../src/web/locale.js';
function localeHarness(href, dataset = {}) {
  const clicks = new Map();
  const buttons = ['zh-TW', 'en'].map(locale => ({dataset: {locale}, setAttribute() {}, addEventListener(_event, listener) { clicks.set(locale, listener); }}));
  const link = {href: new URL('./reader/index.html', href).href, dataset: {exampleLink: ''}, hasAttribute() { return false; }};
  const document = {body: {dataset}, documentElement: {}, querySelectorAll(selector) {
    if (selector === '.language-switcher [data-locale]') return buttons;
    if (selector.startsWith('a[href')) return [link];
    return [];
  }};
  const calls = {};
  const location = {href, assign(url) { calls.assign = String(url); }, replace(url) {calls.replace = String(url); }};
  const descriptors = Object.fromEntries(['document','location','navigator','history'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  for (const [key, value] of Object.entries({document, location, navigator: {languages: ['en'], language:'en'}, history: {state:null,replaceState() {}}})) Object.defineProperty(globalThis,key,{value,configurable:true});
  try { initializeLocale({}); return {link, clicks, calls, lang:document.documentElement.lang}; }
  finally { for (const [key, descriptor] of Object.entries(descriptors)) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; } }
}
test('English homepage opens English example directly', () => {
  const result = localeHarness('https://example.test/repo/index.html?lang=en');
  assert.equal(result.link.href, 'https://example.test/repo/reader-en/index.html?lang=en');
});
test('legacy Chinese URL stays Chinese unless explicitly requested otherwise', () => {
  const data = {contentLocale: 'zh-TW', counterpart: '../reader-en/note-example.html', fragments: '{"block-source":"block-source"}'};
  assert.equal(localeHarness('https://example.test/reader/note-old.html', data).lang, 'zh-TW');
  const result = localeHarness('https://example.test/reader/note-old.html?lang=en#block-source', data);
  assert.equal(result.calls.replace, 'https://example.test/reader-en/note-example.html?lang=en#block-source');
});

import { readFileSync } from 'node:fs';
import { localizeHtml } from '../src/web/localize-html.mjs';
import { readerEnglish } from '../src/web/reader/messages.js';
test('static English controls include accessible translated labels', () => {
  const html = localizeHtml('<input aria-label="original" data-i18n-aria-label="searchLabel"><a aria-label="original" data-i18n-aria-label="footnote" data-i18n-number="3">3</a><span data-i18n="readingMap">original</span>', readerEnglish);
  assert.ok(html.includes('aria-label="Find notes by name"'));
  assert.ok(html.includes('aria-label="Footnote 3"'));
  assert.ok(html.includes('>Reading map</span>'));
  assert.ok(!html.includes('original'));
});
test('structure naming follows public English manifest and distinguishes optional sections', () => {
  const structure = readFileSync(new URL('../src/web/structure.en.md', import.meta.url), 'utf8');
  const mappings = JSON.parse(readFileSync(new URL('../src/web/example-paths.json', import.meta.url)));
  const folders = [...new Set(mappings.map(pair => pair.en.split('/')[0]).filter(path => !path.endsWith('.md')))];
  for (const folder of folders) assert.ok(structure.includes(`## ${folder}:`), folder);
  assert.ok(structure.includes('does not include a `90_Maintenance/`'));
  assert.ok(structure.includes('`Dolls/` or `Relationship circles/`'));
  assert.ok(structure.includes('no separate story index'));
});

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { siteEnglish } from '../src/web/site-messages.js';

const hanOrChinesePunctuation = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;
const decodeEntities = value => value.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, number) => String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number)))
  .replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[entity]);

// Inspect the English presentation, not the multilingual HTML payload. Include
// every English tab (even currently inactive), all accessible text and tooltips.
// Only the alternate Chinese structure and the Chinese language-choice button
// are exempt. data-i18n replacements use the same dictionary as the browser.
function englishPresentation(html, messages = {}) {
  const text = [], stack = [];
  const voidTags = new Set(['meta','link','input','img','br','hr','source','wbr','area','base','embed','param','track']);
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (!token.startsWith('<')) {
      if (!stack.at(-1)?.suppress) text.push(decodeEntities(token));
      continue;
    }
    const name = /^<([\w-]+)/.exec(token)?.[1];
    if (!name) continue;
    const attrs = Object.fromEntries([...token.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value]) => [key, decodeEntities(value)]));
    const suppressed = stack.at(-1)?.suppress || ['script','style'].includes(name)
      || (attrs.class?.split(/\s+/).includes('structure-browser') && attrs.lang === 'zh-TW')
      || (['button', 'a'].includes(name) && attrs['data-locale'] === 'zh-TW');
    let replaced = false;
    if (!suppressed) {
      for (const attribute of ['aria-label','title','placeholder','alt']) {
        const value = messages[attrs[`data-i18n-${attribute}`]] ?? attrs[attribute];
        if (value) text.push(value);
      }
      const replacement = messages[attrs['data-i18n']];
      if (replacement !== undefined) { text.push(replacement); replaced = true; }
      if (name === 'meta' && attrs.name === 'description') text.push(messages[attrs['data-i18n-content']] ?? attrs.content ?? '');
    }
    if (!voidTags.has(name) && !token.endsWith('/>')) stack.push({suppress: suppressed || replaced});
  }
  return text.join('\n');
}
function assertEnglishPresentation(html, messages, label) {
  const presented = englishPresentation(html, messages);
  const unexpected = presented.split('\n').filter(line => hanOrChinesePunctuation.test(line));
  assert.deepEqual(unexpected, [], `${label}: unexpected Chinese in English text or accessible labels`);
  return presented;
}

test('English presentation guard detects text, tooltip and numeric-entity regressions without scanning hidden Chinese alternatives', () => {
  assert.throws(() => assertEnglishPresentation('<p>&#x6545;&#x4e8b;</p>', {}, 'fixture'));
  assert.throws(() => assertEnglishPresentation('<input aria-label="&#x7b46;&#x8a18;">', {}, 'fixture'));
  assertEnglishPresentation('<div class="structure-browser" lang="zh-TW"><p>&#x6545;&#x4e8b;</p></div><div class="structure-browser" lang="en"><p>Stories</p></div><button data-locale="zh-TW" aria-label="&#x4e2d;">&#x4e2d;</button>', {}, 'fixture');
});

test('all English homepage panels, example link, reader pages, labels and paths contain no untranslated Chinese', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  execFileSync(process.execPath, ['src/web/build.mjs'], {cwd: root});
  const homepage = readFileSync(new URL('../dist/en/index.html', import.meta.url), 'utf8');
  const text = assertEnglishPresentation(homepage, {}, 'Static English homepage');
  assert.ok(text.includes("Emu-rabbit's Rabbit Hole"));
  assert.ok(text.includes('Emu-rabbit'));
  assert.equal((homepage.match(/id="structure-en-\d+-panel"/g) ?? []).length, 9);
  for (const filename of readdirSync(new URL('../dist/reader-en/', import.meta.url)).filter(name => name.endsWith('.html'))) {
    assertEnglishPresentation(readFileSync(new URL(`../dist/reader-en/${filename}`, import.meta.url), 'utf8'), {}, filename);
  }
  const paths = JSON.parse(readFileSync(new URL('../src/web/example-paths.json', import.meta.url)));
  for (const pair of paths) assert.ok(!hanOrChinesePunctuation.test(pair.en), `English path: ${pair.en}`);
  for (const message of [...Object.values(siteEnglish), ...Object.values(readerEnglish)]) assert.ok(!hanOrChinesePunctuation.test(message), `English message: ${message}`);
});

import { existsSync } from 'node:fs';
import {legacyMethodNotes, methodSourceUrls, methodTargets, githubHeadingIds, methodQuoteSources} from '../src/web/method-compat.mjs';
import { siteBase, homePaths, siteUrl, homeDescriptions, socialImage } from '../src/web/seo.mjs';
import { htmlIds } from '../src/web/validate.mjs';

const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decodeEntities(value)]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(([tag]) => attributes(tag));
const buildFile = path => new URL(`../dist/${path.endsWith('/') || !path ? path + 'index.html' : path}`, import.meta.url);

test('generated public pages have canonical, reciprocal language, robots and social metadata', () => {
  const mappings = JSON.parse(readFileSync(new URL('../src/web/example-paths.json', import.meta.url)));
  const pairs = [homePaths, ...mappings.map(pair => ({'zh-TW': `reader/${noteFile(pair['zh-TW'])}`, en: `reader-en/${noteFile(pair.en)}`}))];
  const canonicals = new Set();
  for (const pair of pairs) for (const [locale, path] of Object.entries(pair)) {
    const html = readFileSync(buildFile(path), 'utf8');
    const head = html.split('</head>')[0];
    assert.ok(html.includes(`<html lang="${locale}">`), path);
    const meta = tags(head, 'meta');
    const value = key => meta.find(item => item.name === key || item.property === key)?.content;
    const links = tags(head, 'link');
    const canonical = links.filter(link => link.rel === 'canonical');
    assert.equal(canonical.length, 1, path);
    assert.equal(canonical[0].href, siteUrl(path), path);
    assert.ok(!/[?#]/.test(canonical[0].href));
    assert.ok(!canonicals.has(canonical[0].href));
    canonicals.add(canonical[0].href);
    assert.deepEqual(links.filter(link => link.rel === 'alternate').map(({hreflang, href}) => [hreflang, href]), [
      ['zh-TW', siteUrl(pair['zh-TW'])], ['en', siteUrl(pair.en)], ['x-default', siteUrl(pair['zh-TW'])],
    ], path);
    const title = decodeEntities(/<title>([^<]+)<\/title>/.exec(head)?.[1] ?? '');
    assert.ok(title.length > 0);
    assert.notEqual(title.split(' | ')[0], title.split(' | ')[1], 'avoid repeating the reader title');
    assert.equal(meta.filter(item => item.name === 'description').length, 1);
    assert.ok(value('description')?.length > 10, path);
    assert.ok(Array.from(value('description')).length <= 170, path);
    assert.equal(value('robots'), 'index, follow, max-image-preview:large');
    assert.equal(value('og:url'), siteUrl(path));
    assert.equal(value('og:title'), title);
    assert.equal(value('twitter:title'), title);
    assert.equal(value('og:description'), value('description'));
    assert.equal(value('twitter:description'), value('description'));
    assert.equal(value('og:locale'), locale === 'en' ? 'en_US' : 'zh_TW');
    assert.equal(value('twitter:card'), 'summary_large_image');
    assert.equal(value('og:image'), siteUrl(socialImage.path));
    assert.equal(value('og:image:width'), String(socialImage.width));
    assert.equal(value('og:image:height'), String(socialImage.height));
    assert.equal(value('og:image:type'), socialImage.type);
    assert.equal(value('twitter:image'), value('og:image'));
    assert.ok(value('og:image:alt'));
    assert.ok(/<h1\b/.test(html), path + ' must contain static content');
    if (path.startsWith('reader')) {
      assert.ok(/<article[^>]*>[\s\S]*?<p>/.test(html), path);
    } else {
      assert.equal(value('description'), homeDescriptions[locale]);
      const exampleNote = locale === 'en'
        ? 'This is a highly condensed version of the author’s rabbit hole (less than about one eighth of its full size). You can make yours as deep and expansive as you like.'
        : '這個是作者兔子洞的極精簡版本（約八分之一不到的大小）。只要你想要，你可以讓你的兔子洞長得更深更大。';
      assert.ok(html.includes(exampleNote), 'localized example scale statement');
      assert.ok(!tags(html, 'a').some(link => /sitemap\.xml/.test(link.href ?? '')), 'no visible sitemap link');
      assert.ok(tags(html, 'img').some(image => image.src.endsWith('/rabbit-hole.jpg')), 'keep original hero');
      assert.equal((html.match(/class="structure-browser"/g) ?? []).length, 1);
      assert.equal((html.match(new RegExp(`id="structure-${locale}-\\d+-panel"`, 'g')) ?? []).length, 9);
    }
    const switchLinks = tags(html, 'a').filter(link => link['data-locale']);
    assert.equal(switchLinks.length, 2);
    for (const link of switchLinks) assert.equal(new URL(link.href, siteUrl(path)).href, siteUrl(pair[link['data-locale']]));
  }
  assert.equal(canonicals.size, 112);
  assert.deepEqual(readFileSync(new URL(`../dist/${socialImage.path}`, import.meta.url)), readFileSync(new URL(`../src/web/${socialImage.path}`, import.meta.url)), 'build copies the social asset byte-for-byte');

  const sitemap = readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]);
  assert.equal(entries.length, 112);
  assert.deepEqual(new Set(entries.map(entry => /<loc>([^<]+)<\/loc>/.exec(entry)[1])), canonicals);
  for (const entry of entries) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(entry)[1];
    const alternates = tags(entry, 'xhtml:link');
    assert.equal(alternates.length, 3);
    assert.ok(alternates.some(link => link.href === loc), loc);
    for (const link of alternates) assert.ok(canonicals.has(link.href), link.href);
  }
  assert.ok(!/<lastmod>|<priority>|<changefreq>|navigation\.html|downloads\/|\.md<|\/\.git(?:\/|<)/.test(sitemap));
  // A project-level robots.txt cannot control this GitHub Pages origin.
  assert.ok(!existsSync(new URL('../dist/robots.txt', import.meta.url)));
  for (const route of ['reader', 'reader-en']) {
    const nav = readFileSync(buildFile(`${route}/navigation.html`), 'utf8');
    assert.equal(tags(nav.split('</head>')[0], 'meta').find(item => item.name === 'robots')?.content, 'noindex, follow');
    assert.ok(!nav.split('<body>')[1].includes('noindex'));
  }
});

test('every generated internal link, fragment and asset resolves under the GitHub Pages project path', () => {
  const files = ['index.html', 'en/index.html', ...['reader', 'reader-en'].flatMap(route => readdirSync(new URL(`../dist/${route}/`, import.meta.url)).filter(file => file.endsWith('.html')).map(file => `${route}/${file}`))];
  for (const path of files) {
    const html = readFileSync(buildFile(path), 'utf8');
    for (const tag of [...tags(html, 'a'), ...tags(html, 'link'), ...tags(html, 'script'), ...tags(html, 'img')]) {
      const href = tag.href ?? tag.src;
      if (!href) continue;
      const url = new URL(href, siteUrl(path));
      if (!url.href.startsWith(siteBase)) continue;
      const relative = url.pathname.slice(new URL(siteBase).pathname.length);
      const target = buildFile(relative);
      assert.ok(existsSync(target), `${path}: missing ${url.href}`);
      if (url.hash) {
        const targetHtml = readFileSync(target, 'utf8');
        assert.ok(htmlIds(targetHtml).has(decodeURIComponent(url.hash.slice(1))), `${path}: missing fragment ${url.href}`);
      }
    }
  }
});

test('static homepage URLs keep their language and legacy query links redirect with section anchors', () => {
  const data = {contentLocale: 'zh-TW', counterpart: './en/', fragments: '{"method":"method"}'};
  assert.equal(localeHarness('https://example.test/repo/', data).lang, 'zh-TW');
  assert.equal(localeHarness('https://example.test/repo/?lang=en#method', data).calls.replace, 'https://example.test/repo/en/?lang=en#method');
  const english = {contentLocale: 'en', counterpart: '../', fragments: '{"method":"method"}'};
  assert.equal(localeHarness('https://example.test/repo/en/', english).lang, 'en');
  assert.equal(localeHarness('https://example.test/repo/en/?lang=zh-TW#method', english).calls.replace, 'https://example.test/repo/?lang=zh-TW#method');
});


import { createHash } from 'node:crypto';
import { renamedPublicNotes, relocatedPublicNotes, legacyHeadingIds, methodHeadingAliases } from '../src/web/public-url-compat.mjs';

test('renamed public people retain published URLs, heading fragments and language destinations', () => {
  const mappings = JSON.parse(readFileSync(new URL('../src/web/example-paths.json', import.meta.url)));
  for (const rename of renamedPublicNotes) {
    const originalFile = `note-${createHash('sha256').update(rename.from).digest('hex')}.html`;
    assert.equal(noteFile(rename.to), originalFile);
    assert.equal(noteFile(rename.from), originalFile, 'legacy note query resolves to the same published page');
    const route = rename.locale === 'en' ? 'reader-en' : 'reader';
    const html = readFileSync(buildFile(`${route}/${originalFile}`), 'utf8');
    assert.ok(html.includes(`<h1 id="${rename.heading}">`));
    assert.ok(htmlIds(html).has(rename.oldHeading));
    assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /前主人[甲乙丙]|Former master [ABC]/);
    const folder = rename.locale === 'en' ? 'emu-rabbit-en' : 'emu-rabbit-tw';
    const archive = readFileSync(new URL(`../dist/downloads/${folder}.zip`, import.meta.url));
    assert.ok(archive.includes(Buffer.from(rename.to)), 'download contains the renamed Markdown file');
    assert.ok(!archive.includes(Buffer.from(rename.from)), 'download omits the obsolete Markdown filename');
  }
  for (const [path, aliases] of Object.entries(legacyHeadingIds)) {
    const pair = mappings.find(pair => Object.values(pair).includes(path));
    assert.ok(pair, path);
    const locale = pair.en === path ? 'en' : 'zh-TW';
    const route = locale === 'en' ? 'reader-en' : 'reader';
    const otherRoute = locale === 'en' ? 'reader' : 'reader-en';
    const otherPath = pair[locale === 'en' ? 'zh-TW' : 'en'];
    const html = readFileSync(buildFile(`${route}/${noteFile(path)}`), 'utf8');
    const body = tags(html, 'body')[0];
    const fragments = JSON.parse(body['data-fragments']);
    const otherHtml = readFileSync(buildFile(`${otherRoute}/${noteFile(otherPath)}`), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'compatibility anchors stay unique');
    for (const [oldId, currentId] of Object.entries(aliases)) {
      assert.ok(htmlIds(html).has(oldId), path + ' old fragment');
      assert.ok(htmlIds(html).has(currentId), path + ' current fragment');
      assert.equal(fragments[oldId], fragments[currentId]);
      assert.ok(htmlIds(otherHtml).has(fragments[oldId]), 'old fragment switches to a real translated heading');
      const destination = equivalentUrl(`${siteUrl(`${route}/${noteFile(path)}`)}#${encodeURIComponent(oldId)}`, body['data-counterpart'], fragments);
      assert.equal(decodeURIComponent(destination.hash.slice(1)), fragments[currentId]);
    }
  }
});


test('relationship directory moves preserve page URLs, navigation and downloadable paths', () => {
  assert.equal(relocatedPublicNotes.length, 16);
  for (const {locale, from, to} of relocatedPublicNotes) {
    const original = renamedPublicNotes.find(rename => rename.to === to)?.from ?? from;
    assert.equal(noteFile(to), `note-${createHash('sha256').update(original).digest('hex')}.html`);
    assert.equal(noteFile(to), noteFile(from));
    const route = locale === 'en' ? 'reader-en' : 'reader';
    const html = readFileSync(buildFile(`${route}/${noteFile(to)}`), 'utf8');
    assert.ok(html.includes(to.split('/')[0]));
    assert.ok(!html.includes(from.split('/')[0]), 'obsolete category stays out of the visible tree');
    const folder = locale === 'en' ? 'emu-rabbit-en' : 'emu-rabbit-tw';
    const archive = readFileSync(new URL(`../dist/downloads/${folder}.zip`, import.meta.url));
    assert.ok(archive.includes(Buffer.from(to)));
    assert.ok(!archive.includes(Buffer.from(from)));
  }
});


test('legacy method URLs guide readers to GitHub without extra method pages or vault files', () => {
  assert.ok(!existsSync(new URL('../dist/method/', import.meta.url)));
  assert.ok(!readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8').includes('閱讀完整筆記法'));
  for (const locale of ['zh-TW', 'en']) {
    const legacyPath = `${locale === 'en' ? 'reader-en' : 'reader'}/${noteFile(legacyMethodNotes[locale])}`;
    const html = readFileSync(buildFile(legacyPath), 'utf8');
    assert.equal(tags(html, 'link').find(link => link.rel === 'canonical').href, methodSourceUrls[locale]);
    assert.equal(tags(html, 'meta').find(meta => meta.name === 'robots').content, 'noindex, follow');
    const targets = JSON.parse(tags(html, 'body')[0]['data-method-targets']);
    assert.deepEqual(targets, methodTargets(locale));
    for (const language of ['zh-TW', 'en']) {
      assert.equal(targets[language].url, methodSourceUrls[language]);
      for (const fragment of Object.values(targets[language].fragments)) assert.ok(githubHeadingIds[language].includes(fragment));
      for (const [oldId, currentId] of Object.entries(methodHeadingAliases[legacyMethodNotes[locale]])) {
        assert.equal(targets[language].fragments[oldId], targets[language].fragments[currentId]);
      }
    }
    assert.ok(html.includes(`href="${methodSourceUrls[locale]}"`), 'usable plain link without JavaScript');
    const folder = locale === 'en' ? 'emu-rabbit-en' : 'emu-rabbit-tw';
    const archive = readFileSync(new URL(`../dist/downloads/${folder}.zip`, import.meta.url));
    const fullBody = readFileSync(new URL(`../docs/method.${locale}.md`, import.meta.url), 'utf8').split('\n\n')[2];
    assert.ok(!archive.includes(Buffer.from(fullBody)), 'download contains no full method');
    assert.ok(!archive.includes(Buffer.from(legacyMethodNotes[locale])), 'download has no method file or stub');
    assert.ok(!html.includes(fullBody), 'compatibility output is only a guide, not a duplicate full method');
  }
  assert.ok(githubHeadingIds['zh-TW'].includes('40_重要關係留下重要的相處與連結'));
  assert.ok(githubHeadingIds.en.includes('40_important-relationships-keep-the-connections-that-matter'));
});


test('homepage quote credits link to the corresponding GitHub source lines', () => {
  for (const locale of ['zh-TW', 'en']) {
    const html = readFileSync(buildFile(homePaths[locale]), 'utf8');
    const quote = /<figure class="shell quote">([\s\S]*?)<\/figure>/.exec(html)?.[1];
    const caption = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(quote)?.[1];
    assert.ok(caption, 'source credit stays at the bottom of the quote figure');
    assert.equal(tags(caption, 'a')[0].href, methodQuoteSources[locale].url);
    assert.ok(caption.includes(methodQuoteSources[locale].label));
    assert.ok(!html.includes('data-i18n="fullMethod"'));
    const source = readFileSync(new URL(`../docs/method.${locale}.md`, import.meta.url), 'utf8').split('\n');
    assert.equal(new URL(methodQuoteSources[locale].url).searchParams.get('plain'), '1', 'line links must open source view');
    const [, start, end] = /#L(\d+)-L(\d+)$/.exec(methodQuoteSources[locale].url);
    assert.ok(source[Number(start) - 1].startsWith(locale === 'en' ? 'This phrase comes from' : '這句話來自於'));
    assert.ok(source[Number(end) - 1].startsWith(locale === 'en' ? 'That is why the rabbit hole exists.' : '兔子洞為此而生。'));
  }
});
