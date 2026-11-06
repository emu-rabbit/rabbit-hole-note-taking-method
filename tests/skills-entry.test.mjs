import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localizeHtml } from '../src/web/localize-html.mjs';
import { siteEnglish } from '../src/web/site-messages.js';

test('skill guide is reachable in the homepage language', () => {
  const source = readFileSync(new URL('../src/web/index.html', import.meta.url), 'utf8');
  assert.match(source, /href="https:\/\/github\.com\/emu-rabbit\/rabbit-hole-notes\/blob\/main\/docs\/skills\.md"/);
  const english = localizeHtml(source, siteEnglish);
  assert.match(english, /href="https:\/\/github\.com\/emu-rabbit\/rabbit-hole-notes\/blob\/main\/docs\/skills\.en\.md"/);
  assert.ok(english.includes(siteEnglish.skillsGuide));
  for (const file of ['skills.md', 'skills.en.md']) {
    const guide = readFileSync(new URL('../docs/' + file, import.meta.url), 'utf8');
    assert.ok(guide.includes('scripts/install-skills.py --apply'));
  }
});

test('bundled methods are exact public method copies', () => {
  for (const [source, copy] of [
    ['examples/emu-rabbit-tw/00_入口/兔子洞筆記法.md', 'method.zh-TW.md'],
    ['examples/emu-rabbit-en/00_Entry/Rabbit Hole Method.md', 'method.en.md'],
  ]) {
    assert.deepEqual(readFileSync(new URL('../' + source, import.meta.url)), readFileSync(new URL('../skills/rabbit-hole-start/references/' + copy, import.meta.url)));
  }
});
