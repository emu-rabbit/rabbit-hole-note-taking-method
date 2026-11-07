import test from 'node:test';
import {methodSourceUrls, legacyMethodNotes} from '../src/web/method-compat.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from '../src/web/library.mjs';

const mappings = JSON.parse(readFileSync(new URL('../src/web/example-paths.json', import.meta.url)));
const roots = {
  'zh-TW': new URL('../examples/emu-rabbit-tw/', import.meta.url),
  en: new URL('../examples/emu-rabbit-en/', import.meta.url),
};
const libraries = Object.fromEntries(Object.entries(roots).map(([locale, root]) => [locale, loadLibrary(fileURLToPath(root))]));
const source = (locale, path) => readFileSync(new URL(path, roots[locale]), 'utf8');

test('all 55 notes in each public example are reachable from README', () => {
  for (const [locale, library] of Object.entries(libraries)) {
    assert.equal(library.notes.size, 55);
    const other = locale === 'en' ? 'zh-TW' : 'en';
    assert.ok(!library.notes.has(legacyMethodNotes[locale]), 'no method file or stub');
    for (const path of library.notes.keys()) {
      const text = source(locale, path);
      assert.ok(!text.includes(legacyMethodNotes[locale].replace(/\.md$/, '')), path + ' has no old local method target');
      assert.ok(!text.includes(methodSourceUrls[other]), path + ' links to the correct language');
    }
    for (const path of ['README.md', 'AGENTS.md']) assert.ok(source(locale, path).includes(methodSourceUrls[locale]));
    const outgoing = new Map([...library.notes.keys()].map(path => [path, []]));
    for (const note of library.notes.values()) {
      for (const incoming of note.backlinks) outgoing.get(incoming.path).push(note.path);
    }
    const visited = new Set();
    const pending = ['README.md'];
    while (pending.length) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      pending.push(...outgoing.get(path));
    }
    assert.deepEqual([...visited].sort(), [...library.notes.keys()].sort());
  }
});

test('both reading maps guide the same eight routes and sixteen stops', () => {
  const mapPair = mappings.find(pair => pair.en === '00_Entry/Reading map.md');
  const routes = locale => source(locale, mapPair[locale]).split(/^## /m).slice(1, 9).map(section => {
    const line = section.split('\n').find(line => line.startsWith('[['));
    return [...line.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => {
      const path = match[1].split('#')[0] + '.md';
      const pair = mappings.find(pair => pair[locale] === path);
      assert.ok(pair, path);
      return pair.en;
    });
  });
  const english = routes('en');
  assert.equal(english.length, 8);
  assert.equal(english.flat().length, 16);
  assert.deepEqual(routes('zh-TW'), english);
});

test('translations retain note identity, source dates and external locators', () => {
  for (const pair of mappings) {
    if (['README.md','00_Entry/Reading map.md'].includes(pair.en)) continue;
    const chinese = source('zh-TW', pair['zh-TW']);
    const english = source('en', pair.en);
    for (const field of ['id', 'kind', 'updated']) {
      const pattern = new RegExp('^' + field + ':.*$', 'm');
      assert.equal(english.match(pattern)?.[0], chinese.match(pattern)?.[0], pair.en + ' ' + field);
    }
    const methodUrls = new Set(Object.values(methodSourceUrls));
    if ([...methodUrls].some(url => chinese.includes(url) || english.includes(url))) {
      assert.ok(chinese.includes(methodSourceUrls['zh-TW']));
      assert.ok(english.includes(methodSourceUrls.en));
    }
    const urls = text => [...text.matchAll(/https?:\/\/[^\s)]+/g)].map(match => match[0]).filter(url => !methodUrls.has(url)).sort();
    assert.deepEqual(urls(english), urls(chinese), pair.en + ' external sources');
  }
});
