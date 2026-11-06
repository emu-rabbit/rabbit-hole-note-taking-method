import test from 'node:test';
import assert from 'node:assert/strict';
import { noteDescription, renderMetadata, homePaths } from '../src/web/seo.mjs';
import { localizeHtml } from '../src/web/localize-html.mjs';

test('public note descriptions strip markup and footnotes, escape entities once, and truncate Unicode safely', () => {
  const description = noteDescription({html: '<h1>Title</h1><p>A &amp; B <a href="#link">connect</a><sup>3</sup>. &lt;private&gt; &quot;quoted&quot;</p>'});
  assert.equal(description, 'A & B connect . <private> "quoted"');
  const metadata = renderMetadata({title: 'A & B', description, locale: 'en', paths: homePaths});
  assert.ok(metadata.includes('content="A &amp; B connect . &lt;private&gt; &quot;quoted&quot;"'));
  assert.ok(!metadata.includes('&amp;amp;'));
  assert.equal(noteDescription({title: 'Fallback title', html: '<h1>Fallback title</h1>'}), 'Fallback title');
  const long = noteDescription({html: `<p>${'🐇'.repeat(200)}</p>`});
  assert.equal(Array.from(long).length, 168);
  assert.equal(long.at(-1), '…');
});

test('static homepage localization includes nested text, descriptions and image alt text', () => {
  const html = localizeHtml('<p data-i18n="body">中文<br>中文</p><a data-i18n="example">中文<span>↗</span></a><img alt="中文" data-i18n-alt="image"><meta content="中文" data-i18n-content="description">', {
    body: 'English body.', example: 'Example', image: 'Rabbit & flowers', description: 'A life in notes.',
  });
  assert.equal(html, '<p data-i18n="body">English body.</p><a data-i18n="example">Example</a><img alt="Rabbit &amp; flowers" data-i18n-alt="image"><meta content="A life in notes." data-i18n-content="description">');
});
