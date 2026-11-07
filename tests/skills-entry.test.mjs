import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { localizeHtml } from '../src/web/localize-html.mjs';
import { siteEnglish } from '../src/web/site-messages.js';

const skillNames = ['start', 'import', 'interview', 'maintain', 'share'].map(name => `rabbit-hole-${name}`);
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('skill guides use one existing homepage note and matching-language README links', () => {
  const source = readFileSync(new URL('../src/web/index.html', import.meta.url), 'utf8');
  const method = source.match(/<section class="shell method"[\s\S]+?<\/section>/)[0];
  assert.equal((method.match(/class="boundary"/g) || []).length, 1);
  assert.equal((method.match(/<li>/g) || []).length, 4);
  assert.equal((method.match(/<p(?:\s|>)/g) || []).length, 6);
  assert.ok(method.includes('https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/skills.md'));
  const english = localizeHtml(source, siteEnglish);
  assert.ok(english.includes('https://github.com/emu-rabbit/rabbit-hole-notes/blob/main/docs/skills.en.md'));
  assert.ok(english.includes(siteEnglish.skillsGuide));
  assert.ok(method.includes('五個 skills'));
  assert.ok(siteEnglish.skillsGuide.includes('five Rabbit Hole skills'));
  assert.ok(source.includes('也建議交予之前人工確認過每個頁面是否有不該洩漏的內容'));
  assert.ok(english.includes('Before handing it over, review each page yourself'));
  for (const [readme, guideFile, count] of [['README.md', 'skills.md', '五個 skills'], ['README.en.md', 'skills.en.md', 'five skills']]) {
    const entry = readFileSync(new URL('../' + readme, import.meta.url), 'utf8');
    assert.ok(entry.includes(`docs/${guideFile}`));
    assert.ok(entry.includes(count));
    assert.doesNotMatch(entry, /七個 skills|seven skills|\$rabbit-hole-(?:write|connect)\b/i);
    const guide = readFileSync(new URL('../docs/' + guideFile, import.meta.url), 'utf8');
    assert.ok(guide.includes('scripts/install-skills.py --apply'));
  }
});

test('authoritative methods live outside examples and offline skills', () => {
  for (const [locale, example] of [
    ['zh-TW', 'examples/emu-rabbit-tw/00_入口/兔子洞筆記法.md'],
    ['en', 'examples/emu-rabbit-en/00_Entry/Rabbit Hole Method.md'],
  ]) {
    const method = read(`docs/method.${locale}.md`);
    assert.ok(!existsSync(new URL('../' + example, import.meta.url)), 'no method file or stub in the example');
    assert.equal([...method.matchAll(/^### \d{2}_/gm)].length, 9);
    assert.ok(!existsSync(new URL(`../skills/rabbit-hole-start/references/method.${locale}.md`, import.meta.url)));
  }
  assert.ok(read('docs/method.zh-TW.md').includes('(method.en.md)'));
  assert.ok(read('docs/method.en.md').includes('(method.zh-TW.md)'));
});


test('the bundle exposes exactly five complete goal entrypoints', () => {
  const root = new URL('../skills/', import.meta.url);
  const entrypoints = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(new URL(`${entry.name}/SKILL.md`, root)))
    .map(entry => entry.name).sort();
  assert.deepEqual(entrypoints, [...skillNames].sort());
  for (const name of skillNames) {
    const skill = read(`skills/${name}/SKILL.md`);
    assert.match(skill, new RegExp(`^name: ${name}$`, 'm'));
    const agent = read(`skills/${name}/agents/openai.yaml`);
    assert.ok(agent.includes(`$${name}`), `${name}: its picker prompt invokes the correct entrypoint`);
    assert.doesNotMatch(skill, /\$rabbit-hole-(?:write|connect)\b/, `${name}: finishing must not require obsolete entrypoints`);
  }
  assert.ok(existsSync(new URL('rabbit-hole-start/scripts/rabbit_hole.py', root)));
  assert.ok(existsSync(new URL('rabbit-hole-start/references/finish.md', root)));
});

test('each bilingual guide has five natural goal requests and an optional explicit invocation', () => {
  for (const file of ['skills.md', 'skills.en.md']) {
    const guide = read(`docs/${file}`);
    const examples = guide.split(/^### /m).slice(1).filter(section => section.startsWith('rabbit-hole-')).map(section => {
      const name = /^(rabbit-hole-[a-z]+)/.exec(section)[1];
      const prompts = [...section.matchAll(/^> (.+)$/gm)];
      assert.equal(prompts.length, 1, `${file}: ${name} has one natural request`);
      return [null, name, prompts[0][1]];
    });
    assert.deepEqual(examples.map(match => match[1]), skillNames, `${file}: each goal has one example in order`);
    const tableNames = [...guide.matchAll(/^\| `\$(rabbit-hole-[a-z]+)` \|/gm)].map(match => match[1]);
    assert.deepEqual(tableNames, skillNames, `${file}: the skill selector matches the installed bundle`);
    for (const [, name, prompt] of examples) {
      assert.ok(prompt.trim().length > 0, `${file}: ${name} has a request`);
      assert.doesNotMatch(prompt, /\$rabbit-hole-|python3|--apply|README\.md/, `${file}: ${name} describes a goal, not file choreography`);
    }
    const fallback = guide.match(/^### (?!rabbit-hole-)[^\n]+\n\n([^\n]+)/m)?.[1];
    assert.ok(fallback?.includes('`$rabbit-hole-interview`'), `${file}: explicit invocation is explained separately from the natural requests`);
    assert.doesNotMatch(guide, /\$rabbit-hole-(?:write|connect)\b|七個 skills|seven skills/i);
  }
});

test('guides explain full outcomes and the archive, read-only and sharing boundaries', () => {
  for (const [file, concepts] of [
    ['skills.md', ['接著問第一題', '實際讀過', '只歸檔', '自然的停點', '維持唯讀', '確切檔案', '連結依賴', '不會自動傳送、上傳或公開']],
    ['skills.en.md', ['asks the first question', 'actually read', 'archive only', 'natural stopping point', 'remains read-only', 'exact proposed files', 'link dependencies', 'does not send, upload or publish']],
  ]) {
    const guide = read(`docs/${file}`);
    for (const concept of concepts) assert.ok(guide.includes(concept), `${file}: documents ${concept}`);
  }
});


test('the homepage and method offer memories and existing records as starting points', () => {
  const homepage = readFileSync(new URL('../src/web/index.html', import.meta.url), 'utf8');
  const zh = readFileSync(new URL('../docs/method.zh-TW.md', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../docs/method.en.md', import.meta.url), 'utf8');
  const invitation = '從一段回憶開始聊，或整理手邊的日記、貼文';
  assert.ok(homepage.includes('從一段回憶開始聊，或整理手邊的日記、社群貼文'));
  assert.ok(zh.includes(invitation));
  assert.ok(zh.includes('也可以透過各社群的資料匯出功能'));
  assert.ok(siteEnglish.collectBody.includes('talking about a memory'));
  assert.ok(siteEnglish.collectBody.includes('diaries and social media posts'));
  assert.ok(en.includes('begin by talking about a memory or organizing diaries and posts'));
  assert.ok(en.includes('data-export features are another way'));
});


test('bilingual skill links open externally without opener access', () => {
  const source = read('src/web/index.html');
  for (const [html, filename] of [[source, 'skills.md'], [localizeHtml(source, siteEnglish), 'skills.en.md']]) {
    const link = /<a\b[^>]*data-i18n="skillsGuide"[^>]*>/.exec(html)?.[0];
    assert.ok(link?.includes(`docs/${filename}`));
    assert.ok(link.includes('target="_blank"'));
    assert.ok(/rel="[^"]*\bnoopener\b[^"]*"/.test(link));
    assert.ok(/rel="[^"]*\bnoreferrer\b[^"]*"/.test(link));
  }
});

test('import guides introduce social exports and link to their supported-format details', () => {
  for (const [file, introduction, conversion, heading, anchor] of [
    ['skills.md', '社群貼文匯出檔案', '原生 ZIP／JSON 不一定能直接匯入', '實際可執行的本機工具', '#實際可執行的本機工具'],
    ['skills.en.md', 'export of your social media posts', 'Native platform ZIP/JSON exports may need conversion', 'Runnable local helpers', '#runnable-local-helpers'],
  ]) {
    const guide = read(`docs/${file}`);
    const section = guide.split(/^### rabbit-hole-import[^\n]*\n/m)[1].split(/^### /m)[0];
    assert.ok(section.includes(introduction), `${file}: social export entry point`);
    assert.ok(section.includes(conversion), `${file}: preparation is needed`);
    assert.ok(section.includes(`](${anchor})`));
    assert.ok(guide.includes(`## ${heading}`), `${file}: details link reaches a real section`);
    assert.ok(guide.includes('../skills/rabbit-hole-import/references/source-formats.md'));
  }
  // Preserve the heading behind the previously shared deep link.
  assert.ok(read('docs/skills.md').includes('### rabbit-hole-import：整理挑選好的貼文'));
});

test('bilingual sharing descriptions retain user control and require a separate MCP connection', () => {
  const source = read('src/web/index.html');
  const chinese = source.match(/<p data-i18n="afterBuildingIntro">([^<]+)<\/p>/)[1];
  for (const text of ['信任的對象', '支援 Markdown', '資料夾的層次', '如果另行準備了合適的 MCP 連接工具', '你允許的範圍']) assert.ok(chinese.includes(text));
  for (const text of ['people you trust', 'supports Markdown', 'folder structure', 'MCP connection set up separately', 'scope you allow']) assert.ok(siteEnglish.afterBuildingIntro.includes(text));
  assert.ok(localizeHtml(source, siteEnglish).includes(siteEnglish.afterBuildingIntro));
  assert.ok(source.includes('也建議交予之前人工確認過每個頁面是否有不該洩漏的內容'));
  assert.ok(siteEnglish.afterBuildingSharing.includes('review each page yourself'));
});
