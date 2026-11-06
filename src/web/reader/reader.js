import { initializeLocale } from '../locale.js';

const localizeLinks = initializeLocale({
  outline: 'On this page',
  backlinks: 'Linked to this note',
  sidebar: 'Notes sidebar',
  backToSite: 'Back to Rabbit Hole Notes',
  readerTitle: 'Rabbit Hole Reader',
  searchPlaceholder: 'Find a note…',
  searchLabel: 'Find notes by name',
  notes: 'Notes',
  noteFiles: 'Note files',
  emptySearch: 'No matching notes',
  navigationError: 'Could not load the list of notes',
  toggleSidebar: 'Toggle notes sidebar',
  missingNote: 'This note could not be found',
  missingFile: 'This file is not included in the reader',
  image: 'Image',
  footnotes: 'Footnotes',
  footnote: 'Footnote {number}',
  footnoteReturn: 'Back to reference {number}',
});

const sidebar = document.querySelector('.sidebar');
const tree = document.querySelector('.tree');
const search = document.querySelector('#note-search');
const count = document.querySelector('#note-count');
const empty = document.querySelector('#empty-search');
const toggle = document.querySelector('.nav-toggle');

try {
  const response = await fetch('./navigation.html');
  if (!response.ok) throw new Error('Missing navigation');
  tree.insertAdjacentHTML('afterbegin', await response.text());
  search.disabled = false;
  const current = tree.querySelector(`a[href="./${document.body.dataset.noteFile}"]`);
  current?.setAttribute('aria-current', 'page');
  for (let folder = current?.closest('details'); folder; folder = folder.parentElement.closest('details')) {
    folder.open = true;
  }
  localizeLinks(tree);
} catch {
  document.querySelector('#navigation-error').hidden = false;
}

const folders = Array.from(tree.querySelectorAll('details')).reverse();
const files = Array.from(tree.querySelectorAll('[data-note]'), element => ({
  element,
  name: element.dataset.note.normalize('NFKC').toLowerCase(),
}));
let previousOpen;

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

revealCurrentNote();
