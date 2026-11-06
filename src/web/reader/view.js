import { escape } from '../notes.js';

export function orderedTree(tree, home) {
  return [home, ...tree.filter(node => node.path && node !== home), ...tree.filter(node => node.children)];
}

const icons = {
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  file: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z"/><path d="M13 3v6h6M9 13h6m-6 4h6"/>',
  menu: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
};

export function icon(name) {
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

export function renderTree(nodes, linkTo) {
  const rows = nodes.map(node => {
    const name = escape(node.name);
    if (node.children) {
      return `<li><details>
        <summary class="tree-row" title="${name}">${icon('chevron')}${icon('folder')}<span>${name}</span></summary>
        ${renderTree(node.children, linkTo)}
      </details></li>`;
    }

    return `<li data-note="${escape(`${node.path} ${node.title}`)}"><a class="tree-row" href="${escape(linkTo(node.path))}" title="${name}">${icon('file')}<span>${name}</span></a></li>`;
  });
  return `<ul class="tree-list">${rows.join('')}</ul>`;
}

export function renderContext(note, linkTo) {
  if (!note.headings.length && !note.backlinks.length) return '';
  const outline = note.headings.length ? `<nav class="outline" aria-label="本頁目錄" data-i18n-aria-label="outline">
    <h2 data-i18n="outline">本頁目錄</h2>
    <ul>${note.headings.map(({ id, label, level }) => `<li class="outline-${level}"><a href="#${encodeURIComponent(id)}">${escape(label)}</a></li>`).join('')}</ul>
  </nav>` : '';
  const backlinks = note.backlinks.length ? `<details class="backlinks">
    <summary>${icon('chevron')}<span data-i18n="backlinks">連到這篇</span><span class="backlink-count">${note.backlinks.length}</span></summary>
    <ul>${note.backlinks.map(link => `<li><a href="${escape(linkTo(link.path))}" title="${escape(link.path)}">${escape(link.name)}</a></li>`).join('')}</ul>
  </details>` : '';
  return `<aside class="note-context">${outline}${backlinks}</aside>`;
}

export function renderBreadcrumbs(note) {
  const location = [...note.parts, note.name];
  return location.map((part, index) => {
    const name = escape(part);
    return index === location.length - 1
      ? `<span aria-current="page" title="${name}">${name}</span>`
      : `<span title="${name}">${name}</span>${icon('chevron')}`;
  }).join('');
}
