import { readFileSync } from 'node:fs';
import MarkdownIt from './vendor/markdown-it.js';
import { noteFile } from './library.mjs';

const markdown = new MarkdownIt({ html: false });
const escape = markdown.utils.escapeHtml;
const examplePaths = JSON.parse(readFileSync(new URL('./example-paths.json', import.meta.url), 'utf8'));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = decodeURIComponent(token.attrGet('href'));
  const prefix = `../../examples/emu-rabbit-${env.locale === 'en' ? 'en' : 'tw'}/`;
  if (!href.startsWith(prefix) || !examplePaths.some(pair => pair[env.locale] === href.slice(prefix.length))) {
    throw new Error(`Invalid ${env.locale} structure example link: ${href}`);
  }
  token.attrSet('href', `./${env.locale === 'en' ? 'reader-en' : 'reader'}/${noteFile(href.slice(prefix.length))}`);
  return self.renderToken(tokens, index, options);
};

function readSections(locale) {
  const source = readFileSync(new URL(`./structure.${locale}.md`, import.meta.url), 'utf8');
  const headings = [...source.matchAll(/^## (\d{2})_([^：:\r\n]+)[：:][ \t]*(.+)$/gm)];
  return headings.map(([heading, code, name, purpose], index) => {
    const body = source.slice(headings[index].index + heading.length, headings[index + 1]?.index);
    return { code, name, purpose, body: markdown.render(body.trim(), { locale }) };
  });
}

function renderBrowser(locale, label, sections) {
  const tabs = sections.map(({ code, name }, index) => {
    const id = `structure-${locale}-${code}`;
    return `<button class="structure-tab" type="button" role="tab" id="${id}-tab" aria-controls="${id}-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">
      <span class="structure-number">${code}</span><span>${escape(name)}</span>
    </button>`;
  });
  const panels = sections.map(({ code, name, purpose, body }, index) => {
    const id = `structure-${locale}-${code}`;
    return `<section class="structure-panel" role="tabpanel" id="${id}-panel" aria-labelledby="${id}-tab" tabindex="0"${index === 0 ? '' : ' hidden'}>
      <p class="structure-label"><span class="structure-number">${code}</span> ${escape(name)}</p>
      <h3>${escape(purpose)}</h3>
      <div class="structure-copy">${body}</div>
    </section>`;
  });
  return `<div class="structure-browser" lang="${locale}">
    <div class="structure-tabs" role="tablist" aria-label="${label}" aria-orientation="vertical">${tabs.join('\n')}</div>
    <div class="structure-details">${panels.join('\n')}</div>
  </div>`;
}

export function renderStructure(locale) {
  const chinese = readSections('zh-TW');
  const english = readSections('en');
  if (!chinese.length || chinese.length !== english.length || chinese.some(({ code }, index) => code !== english[index].code)) {
    throw new Error('中英文的兔子洞分區必須使用相同的編號和順序。');
  }
  const browsers = {
    'zh-TW': () => renderBrowser('zh-TW', '兔子洞分區', chinese),
    en: () => renderBrowser('en', 'Rabbit hole sections', english),
  };
  return locale ? browsers[locale]() : Object.values(browsers).map(render => render()).join('\n');
}
