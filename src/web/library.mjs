import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import MarkdownIt from './vendor/markdown-it.cjs';

const markdown = new MarkdownIt({ html: false });
export const escape = markdown.utils.escapeHtml;
export const startNote = 'README.md';
const collator = new Intl.Collator('zh-TW', { numeric: true });
const compareNames = (a, b) => collator.compare(a.name, b.name);
const noteStem = path => posix.basename(path).replace(/\.md$/i, '');
const key = text => text.normalize('NFC').toLowerCase();
const slug = text => key(text).replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
const blockId = text => `block-${text}`;

export function noteFile(path) {
  if (path === startNote) return 'index.html';
  const id = createHash('sha256').update(path).digest('hex');
  return `note-${id}.html`;
}

export function noteUrl(path, fragment = '') {
  return `./${noteFile(path)}${fragment ? `#${encodeURIComponent(fragment)}` : ''}`;
}

markdown.block.ruler.before('reference', 'note_metadata', (state, line, _end, silent) => {
  if (state.sCount[line] - state.blkIndent >= 4) return false;
  const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  const anchor = /^\^([\w-]+)\s*$/.exec(text);
  const definition = /^\[\^([^\]\s]+)\]:\s*(.*)$/.exec(text);
  if (!anchor && !definition) return false;
  if (silent) return true;

  if (anchor) {
    const token = state.push('block_anchor', 'div', 0);
    token.attrSet('id', blockId(anchor[1]));
  } else {
    state.env.footnotes.set(definition[1], definition[2]);
  }
  state.line = line + 1;
  return true;
}, { alt: ['paragraph'] });

markdown.inline.ruler.before('link', 'note_link', (state, silent) => {
  if (state.src.charCodeAt(state.pos) !== 91 || state.linkLevel > 0) return false;
  const match = /^(?:\[\[([^\]\n]+)\]\]|\[\^([^\]\s]+)\])/.exec(state.src.slice(state.pos, state.posMax));
  if (!match) return false;
  if (!silent) {
    const token = state.push(match[1] ? 'wiki_link' : 'footnote_ref', '', 0);
    token.content = match[1] ?? match[2];
  }
  state.pos += match[0].length;
  return true;
});

markdown.renderer.rules.block_anchor = (tokens, index) => {
  const token = tokens[index];
  return token.hidden ? '' : `<div id="${escape(token.attrGet('id'))}"></div>\n`;
};

markdown.renderer.rules.wiki_link = (tokens, index, _options, env) => {
  const [target, alias] = tokens[index].content.split(/\\?\|/, 2);
  const [path, fragment = ''] = target.trim().split(/#(.*)/s, 2);
  const label = alias || fragment || posix.basename(path);
  const note = env.resolve(path, true);
  if (!note) return `<span class="missing-link" title="找不到這份筆記" data-i18n-title="missingNote">${escape(label)}</span>`;

  env.outgoing.add(note.path);
  const anchor = fragment.startsWith('^') ? blockId(fragment.slice(1)) : fragment && slug(fragment);
  return `<a href="${noteUrl(note.path, anchor)}">${escape(label)}</a>`;
};

markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  const href = token.attrGet('href');
  if (/^(?:https?:\/\/|mailto:)/i.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noreferrer');
  } else if (!href.startsWith('#')) {
    const [path, fragment] = href.split(/#(.*)/s, 2).map(decodeLink);
    const note = env.resolve(path, false);
    if (note) {
      env.outgoing.add(note.path);
      token.attrSet('href', noteUrl(note.path, fragment));
    } else {
      token.attrs.splice(token.attrIndex('href'), 1);
      token.attrSet('class', 'missing-link');
      token.attrSet('title', '閱讀版未收錄這個檔案');
      token.attrSet('data-i18n-title', 'missingFile');
    }
  }
  return renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.image = (tokens, index) => {
  const token = tokens[index];
  const src = token.attrGet('src');
  const label = token.content ? escape(token.content) : '<span data-i18n="image">圖片</span>';
  return /^https?:\/\//i.test(src)
    ? `<a href="${escape(src)}" target="_blank" rel="noreferrer">${label} ↗</a>`
    : `<span class="missing-link">${label}</span>`;
};

markdown.renderer.rules.footnote_ref = (tokens, index, _options, env) => {
  const label = tokens[index].content;
  if (!env.footnotes.has(label)) return escape(`[^${label}]`);
  if (!env.references.has(label)) env.references.set(label, { number: env.references.size + 1, count: 0 });
  const ref = env.references.get(label);
  return `<sup id="ref-${ref.number}-${++ref.count}"><a href="#fn-${ref.number}" aria-label="註腳 ${ref.number}" data-i18n-aria-label="footnote" data-i18n-number="${ref.number}">[${ref.number}]</a></sup>`;
};

function decodeLink(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function stripFrontmatter(source) {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  return text.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '');
}

function headingText(inline) {
  return inline.children.filter(token => ['text', 'code_inline', 'image'].includes(token.type))
    .map(token => token.content).join('') || inline.content;
}

function describeNote(note, tokens) {
  const used = new Set();
  for (const [index, token] of tokens.entries()) {
    if (token.type === 'heading_open') {
      const label = headingText(tokens[index + 1]);
      const base = slug(label);
      let id = base;
      for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
      used.add(id);
      token.attrSet('id', id);
      if (token.tag === 'h1' && !note.title) note.title = label;
      if (['h2', 'h3'].includes(token.tag)) note.headings.push({ id, label, level: token.tag });
    }
    if (token.type === 'block_anchor') {
      let previous = index - 1;
      while (previous >= 0 && (tokens[previous].level > token.level || tokens[previous].nesting < 0)) previous--;
      const block = tokens[previous];
      if (block?.nesting === 1 && !block.attrGet('id')) {
        block.attrSet('id', token.attrGet('id'));
        token.hidden = true;
      }
    }
  }
  if (!note.title) note.title = note.name;
}

function renderFootnotes(env) {
  if (!env.references.size) return '';
  const notes = [];
  for (const [label, ref] of env.references) {
    const body = markdown.renderInline(env.footnotes.get(label), env);
    const returns = Array.from({ length: ref.count }, (_, index) =>
      `<a class="footnote-return" href="#ref-${ref.number}-${index + 1}" aria-label="返回註腳 ${ref.number} 的引用" data-i18n-aria-label="footnoteReturn" data-i18n-number="${ref.number}">↩</a>`);
    notes.push(`<li id="fn-${ref.number}">${body} ${returns.join(' ')}</li>`);
  }
  return `<section class="footnotes" aria-label="註腳" data-i18n-aria-label="footnotes"><h2 data-i18n="footnotes">註腳</h2><ol>${notes.join('')}</ol></section>`;
}

export function loadLibrary(directory) {
  const notes = new Map();
  const paths = new Map();
  const names = new Map();

  function readFolder(parts = []) {
    const entries = readdirSync(join(directory, ...parts), { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
      const location = [...parts, entry.name];
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        const children = readFolder(location);
        if (children.length) folders.push({ name: entry.name, children });
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const path = location.join('/');
        const note = { path, name: entry.name, parts, headings: [], backlinks: [] };
        notes.set(path, note);
        paths.set(key(path), note);
        const nameKey = key(noteStem(path));
        names.set(nameKey, names.has(nameKey) ? null : note);
        files.push(note);
      }
    }
    return [...folders.sort(compareNames), ...files.sort(compareNames)];
  }

  const tree = readFolder();
  for (const note of notes.values()) {
    const env = {
      footnotes: new Map(), references: new Map(), outgoing: new Set(),
      resolve(target, wiki) {
        if (!target) return note;
        const path = target.replace(/\\/g, '/');
        const filename = /\.md$/i.test(path) ? path : `${path}.md`;
        const relative = posix.normalize(path.startsWith('/') ? filename.slice(1) : posix.join(...note.parts, filename));
        if (!wiki) return /\.md$/i.test(path) ? paths.get(key(relative)) : undefined;
        return paths.get(key(filename)) ?? paths.get(key(relative)) ?? names.get(key(noteStem(path)));
      },
    };
    const source = stripFrontmatter(readFileSync(join(directory, ...note.path.split('/')), 'utf8'));
    const tokens = markdown.parse(source, env);
    describeNote(note, tokens);
    note.html = markdown.renderer.render(tokens, markdown.options, env) + renderFootnotes(env);
    for (const path of env.outgoing) {
      if (path !== note.path) notes.get(path).backlinks.push(note);
    }
  }
  for (const note of notes.values()) note.backlinks.sort(compareNames);
  return { notes, tree };
}
