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
  assert.ok(structure.includes('does not include a `Circles/`'));
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
      || (name === 'button' && attrs['data-locale'] === 'zh-TW');
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
  const homepage = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const text = assertEnglishPresentation(homepage, siteEnglish, 'English homepage');
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
