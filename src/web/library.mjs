import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLibrary, startNote } from './notes.js';

export function noteFile(path) {
  if (path === startNote) return 'index.html';
  const id = createHash('sha256').update(path).digest('hex');
  return `note-${id}.html`;
}

export function noteUrl(path, fragment = '') {
  return `./${noteFile(path)}${fragment ? `#${encodeURIComponent(fragment)}` : ''}`;
}

export function loadLibrary(directory) {
  const sources = new Map();

  function readFolder(parts) {
    const entries = readdirSync(join(directory, ...parts), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const location = [...parts, entry.name];
      if (entry.isDirectory()) {
        readFolder(location);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        sources.set(location.join('/'), readFileSync(join(directory, ...location), 'utf8'));
      }
    }
  }

  readFolder([]);
  return createLibrary(sources, { linkTo: noteUrl });
}
