import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('skill guides remain reachable from repository READMEs without adding a homepage layer', () => {
  const source = readFileSync(new URL('../src/web/index.html', import.meta.url), 'utf8');
  assert.ok(!source.includes('skillsGuide'));
  assert.ok(!source.includes('/docs/skills'));
  for (const [readme, guideFile] of [['README.md', 'skills.md'], ['README.en.md', 'skills.en.md']]) {
    const entry = readFileSync(new URL('../' + readme, import.meta.url), 'utf8');
    assert.ok(entry.includes(`docs/${guideFile}`));
    const guide = readFileSync(new URL('../docs/' + guideFile, import.meta.url), 'utf8');
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


test('each skill has one concrete bilingual guide example matching its agent instructions', () => {
  const names = ['start', 'import', 'interview', 'write', 'connect', 'maintain', 'share'].map(name => `rabbit-hole-${name}`);
  for (const file of ['skills.md', 'skills.en.md']) {
    const guide = readFileSync(new URL('../docs/' + file, import.meta.url), 'utf8');
    const examples = [...guide.matchAll(/^### (rabbit-hole-[a-z]+)[^\n]*\n\n> (.+)$/gm)];
    assert.deepEqual(examples.map(match => match[1]), names, `${file}: each skill appears once in order`);
    for (const [, name, prompt] of examples) {
      assert.ok(prompt.includes(`$${name}`), `${file}: ${name} is directly invocable`);
      const skill = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
      const requestSection = skill.split('## Example requests\n')[1];
      assert.ok(requestSection?.includes(prompt), `${file}: ${name} stays aligned with its SKILL.md`);
    }
  }
});
