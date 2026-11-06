import { createLibrary, startNote } from '../notes.js';
import zip from '../vendor/zip-native.js';

const { BlobReader, ZipReader } = zip;
const MiB = 1024 * 1024;
const maxArchiveSize = 64 * MiB;
const maxExtractedSize = 128 * MiB;
const maxNoteSize = 2 * MiB;
const maxTextSize = 16 * MiB;
const maxEntries = 5000;
const imageTypes = new Map([
  ['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'], ['webp', 'image/webp'], ['avif', 'image/avif'],
]);
const pathKey = path => path.normalize('NFC').toLowerCase();
const isNote = path => /\.md$/i.test(path);

async function readEntry(entry, type) {
  const chunks = [];
  let size = 0;
  await entry.getData(new WritableStream({
    write(chunk) {
      size += chunk.byteLength;
      if (size > entry.uncompressedSize) throw new Error('zipInvalid');
      chunks.push(chunk);
    },
  }), { checkCrc32: true, checkOverlappingEntry: true });
  if (size !== entry.uncompressedSize) throw new Error('zipInvalid');
  return new Blob(chunks, { type });
}

async function readArchive(file) {
  if (file.size > maxArchiveSize) throw new Error('zipTooLarge');
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false, filenameValidation: 'balanced' });
  try {
    const entries = new Map();
    let count = 0;
    for await (const entry of reader.getEntriesGenerator()) {
      if (++count > maxEntries) throw new Error('zipTooLarge');
      if (entry.directory || entry.symlink) continue;
      const parts = entry.filename.split(/[\\/]/);
      if (parts.some(part => !part || part === '..' || part.includes('\0'))) throw new Error('zipInvalid');
      if (parts.some(part => part.startsWith('.') || part === '__MACOSX')) continue;
      if (parts.length > 48) throw new Error('zipTooLarge');
      const path = parts.join('/');
      const extension = /\.([^.\/]+)$/.exec(path)?.[1].toLowerCase();
      const type = imageTypes.get(extension);
      if (!isNote(path) && !type) continue;
      if (entries.has(path)) throw new Error('zipInvalid');
      entries.set(path, { entry, type });
    }

    const notePaths = [...entries.keys()].filter(isNote);
    const readme = notePaths.find(path => pathKey(path) === startNote.toLowerCase())
      ?? notePaths.find(path => pathKey(path.split('/').at(-1)) === startNote.toLowerCase()
        && notePaths.every(note => note.startsWith(path.slice(0, -startNote.length))));
    if (!readme) throw new Error('zipNoReadme');
    const root = readme.slice(0, -startNote.length);
    const sources = new Map();
    const images = new Map();
    const paths = new Set();
    let extractedSize = 0;
    let textSize = 0;
    for (const [path, { entry, type }] of entries) {
      if (!path.startsWith(root)) continue;
      if (entry.encrypted) throw new Error('zipEncrypted');
      const size = entry.uncompressedSize;
      if (!Number.isSafeInteger(size) || size < 0) throw new Error('zipInvalid');
      extractedSize += size;
      if (!type) textSize += size;
      if (extractedSize > maxExtractedSize || textSize > maxTextSize || (!type && size > maxNoteSize)) {
        throw new Error('zipTooLarge');
      }
      const relative = path.slice(root.length);
      const key = pathKey(relative);
      if (paths.has(key)) throw new Error('zipInvalid');
      paths.add(key);
      const blob = await readEntry(entry, type);
      if (type) images.set(key, blob);
      else sources.set(relative, await blob.text());
    }
    return { sources, images, homePath: readme.slice(root.length) };
  } finally {
    await reader.close();
  }
}

export async function openArchive(file) {
  const { sources, images, homePath } = await readArchive(file);
  const notePaths = [...sources.keys()];
  const noteIndices = new Map(notePaths.map((path, index) => [path, index]));
  const imageUrls = new Map();
  const imageNames = new Map();
  for (const path of images.keys()) {
    const name = path.split('/').at(-1);
    imageNames.set(name, imageNames.has(name) ? null : path);
  }

  function linkTo(path, fragment = '') {
    const id = noteIndices.get(path);
    return `#zip-note:${id}${fragment ? `:${encodeURIComponent(fragment)}` : ''}`;
  }

  function imageFor(relative, wikiTarget) {
    const wikiKey = wikiTarget === undefined ? undefined : pathKey(wikiTarget.replace(/^\//, ''));
    const candidates = [relative === undefined ? undefined : pathKey(relative), wikiKey, imageNames.get(wikiKey)];
    const path = candidates.find(candidate => images.has(candidate));
    if (!path) return undefined;
    if (!imageUrls.has(path)) imageUrls.set(path, URL.createObjectURL(images.get(path)));
    return imageUrls.get(path);
  }

  function dispose() {
    for (const url of imageUrls.values()) URL.revokeObjectURL(url);
    imageUrls.clear();
  }

  try {
    const { notes, tree } = createLibrary(sources, { linkTo, imageFor });
    return { notes, tree, home: notes.get(homePath), notePaths, linkTo, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
