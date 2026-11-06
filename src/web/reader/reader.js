import { initializeLocale } from '../locale.js';

import { readerEnglish } from './messages.js';

const localize = initializeLocale(readerEnglish);

const sidebar = document.querySelector('.sidebar');
const tree = document.querySelector('.tree');
const search = document.querySelector('#note-search');
const count = document.querySelector('#note-count');
const empty = document.querySelector('#empty-search');
const toggle = document.querySelector('.nav-toggle');
const navigationError = document.querySelector('#navigation-error');
let folders = [];
let files = [];
let previousOpen;
function indexTree() {
  folders = Array.from(tree.querySelectorAll('details')).reverse();
  files = Array.from(tree.querySelectorAll('[data-note]'), element => ({
    element,
    name: element.dataset.note.normalize('NFKC').toLowerCase(),
  }));
  previousOpen = undefined;
  search.value = '';
  search.disabled = false;
  empty.hidden = true;
  count.textContent = files.length;
}

function markCurrentNote(href) {
  tree.querySelector('[aria-current="page"]')?.removeAttribute('aria-current');
  const current = tree.querySelector(`a[href="${CSS.escape(href)}"]`);
  current?.setAttribute('aria-current', 'page');
  for (let folder = current?.closest('details'); folder; folder = folder.parentElement.closest('details')) {
    folder.open = true;
  }
  revealCurrentNote();
}

try {
  const response = await fetch('./navigation.html');
  if (!response.ok) throw new Error('Missing navigation');
  tree.insertAdjacentHTML('afterbegin', await response.text());
  indexTree();
  markCurrentNote(`./${document.body.dataset.noteFile}`);
  localize(tree);
} catch {
  navigationError.hidden = false;
}

search.addEventListener('input', () => {
  const terms = search.value.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length && !previousOpen) previousOpen = new Set(folders.filter(folder => folder.open));

  let matches = 0;
  for (const { element, name } of files) {
    const matched = terms.every(term => name.includes(term));
    element.hidden = !matched;
    if (matched) matches++;
  }
  for (const folder of folders) {
    const hasMatches = Array.from(folder.querySelector('ul').children).some(child => !child.hidden);
    folder.parentElement.hidden = !hasMatches;
    if (terms.length) folder.open = hasMatches;
    else if (previousOpen) folder.open = previousOpen.has(folder);
  }
  if (!terms.length) previousOpen = undefined;
  count.textContent = terms.length ? `${matches} / ${files.length}` : files.length;
  empty.hidden = matches > 0;
  tree.scrollTop = 0;
});

function setSidebar(open) {
  sidebar.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  if (open) revealCurrentNote();
}

function revealCurrentNote() {
  const current = tree.querySelector('[aria-current="page"]');
  if (!current) return;
  const item = current.getBoundingClientRect();
  const viewport = tree.getBoundingClientRect();
  if (item.bottom > viewport.bottom) tree.scrollTop += item.bottom - viewport.bottom + 8;
}

toggle.addEventListener('click', () => {
  const open = !sidebar.classList.contains('is-open');
  setSidebar(open);
  if (open) sidebar.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !search.disabled && !event.altKey && !event.ctrlKey && !event.metaKey && !event.target.closest('input, textarea, [contenteditable]')) {
    event.preventDefault();
    setSidebar(true);
    search.focus();
  }
  if (event.key === 'Escape' && document.activeElement === search && search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input'));
  } else if (event.key === 'Escape' && sidebar.classList.contains('is-open') && toggle.offsetWidth) {
    setSidebar(false);
    toggle.focus();
  }
});
