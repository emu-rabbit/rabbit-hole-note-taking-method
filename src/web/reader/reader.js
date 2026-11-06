import { initializeLocale } from '../locale.js';

const localize = initializeLocale({
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
  openZip: 'Open local ZIP',
  closeZip: 'Return to public example',
});

const sidebar = document.querySelector('.sidebar');
const tree = document.querySelector('.tree');
const search = document.querySelector('#note-search');
const count = document.querySelector('#note-count');
const empty = document.querySelector('#empty-search');
const toggle = document.querySelector('.nav-toggle');
const workspace = document.querySelector('.workspace');
const article = workspace.querySelector('.note');
const breadcrumbs = document.querySelector('.breadcrumbs');
const zipButton = document.querySelector('#zip-open');
const zipInput = document.querySelector('#zip-input');
const zipClose = document.querySelector('#zip-close');
const zipStatus = document.querySelector('#zip-status');
const navigationError = document.querySelector('#navigation-error');
const zipMessages = new Map([
  ['ready', ['僅在此分頁讀取', 'Read in this tab only']],
  ['loading', ['正在開啟 ZIP…', 'Opening ZIP…']],
  ['opened', ['正在閱讀本機 ZIP', 'Reading a local ZIP']],
  ['zipNoReadme', ['ZIP 的根目錄需要 README.md。', 'The ZIP needs a README.md at its root.']],
  ['zipTooLarge', ['ZIP 太大、檔案太多，或單篇筆記超出上限。', 'The ZIP is too large, has too many files, or contains an oversized note.']],
  ['zipEncrypted', ['請選擇未加密的 ZIP。', 'Choose an unencrypted ZIP.']],
  ['zipInvalid', ['無法讀取 ZIP，請確認檔案完整。', 'Could not read the ZIP. Check that the file is intact.']],
]);
let folders = [];
let files = [];
let previousOpen;
let archive;

function setZipStatus(key) {
  const messages = zipMessages.get(key) ?? zipMessages.get('zipInvalid');
  zipStatus.textContent = messages[document.documentElement.lang === 'en' ? 1 : 0];
}

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

function jumpToAnchor(fragment) {
  if (!fragment) return;
  try {
    const id = CSS.escape(decodeURIComponent(fragment));
    article.querySelector(`#${id}`)?.scrollIntoView();
  } catch {
    // Malformed anchors have no target.
  }
}

function showZipNote(note, fragment) {
  article.innerHTML = note.html;
  workspace.querySelector('.note-context')?.remove();
  workspace.insertAdjacentHTML('beforeend', archive.view.renderContext(note, archive.linkTo));
  breadcrumbs.innerHTML = archive.view.renderBreadcrumbs(note);
  localize(workspace);
  markCurrentNote(archive.linkTo(note.path));
  article.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  jumpToAnchor(fragment);
}

setZipStatus('ready');
zipButton.disabled = false;
zipButton.addEventListener('click', () => zipInput.click());
zipInput.addEventListener('change', async () => {
  const [file] = zipInput.files;
  zipInput.value = '';
  if (!file) return;
  zipButton.disabled = true;
  zipClose.disabled = true;
  setZipStatus('loading');
  try {
    const [{ openArchive }, view] = await Promise.all([import('./zip.js'), import('./view.js')]);
    const next = await openArchive(file);
    archive?.dispose();
    archive = { ...next, view };
    tree.querySelector('.tree-list')?.remove();
    tree.insertAdjacentHTML('afterbegin', view.renderTree(view.orderedTree(next.tree, next.home), next.linkTo));
    navigationError.hidden = true;
    indexTree();
    tree.scrollTop = 0;
    zipClose.hidden = false;
    setZipStatus('opened');
    showZipNote(next.home);
    setSidebar(false);
  } catch (error) {
    setZipStatus(error.message);
  } finally {
    zipButton.disabled = false;
    zipClose.disabled = false;
  }
});

zipClose.addEventListener('click', () => {
  archive.dispose();
  location.reload();
});

document.addEventListener('click', event => {
  if (!archive || event.defaultPrevented) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || !(tree.contains(link) || workspace.contains(link))) return;
  event.preventDefault();
  const href = link.getAttribute('href');
  const local = /^#zip-note:(\d+)(?::(.*))?$/.exec(href);
  if (!local) {
    jumpToAnchor(href.slice(1));
    return;
  }
  const note = archive.notes.get(archive.notePaths[Number(local[1])]);
  if (note) {
    setSidebar(false);
    showZipNote(note, local[2]);
  }
});
