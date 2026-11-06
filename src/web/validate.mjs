import { noteFile } from './library.mjs';

export const htmlIds = html => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
export const htmlHeadingIds = html => [...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map(match => match[1]);

export function validateMappings(mappings, locales) {
  for (const { locale, library } of locales) {
    const paths = mappings.map(pair => pair[locale]);
    if (paths.some(path => typeof path !== 'string') || new Set(paths).size !== paths.length) throw new Error(`Missing or duplicate ${locale} mappings`);
    const missing = [...library.notes.keys()].filter(path => !paths.includes(path));
    const extra = paths.filter(path => !library.notes.has(path));
    if (missing.length || extra.length) throw new Error(`${locale} mapping mismatch: unmapped ${missing.join(', ')}; absent ${extra.join(', ')}`);
    if (!library.notes.has('README.md')) throw new Error(`${locale} needs README.md`);
  }
  for (const pair of mappings) {
    const blocks = locales.map(({locale, library}) => [...htmlIds(library.notes.get(pair[locale]).html)].filter(id => id.startsWith('block-')).sort());
    if (blocks.some(ids => JSON.stringify(ids) !== JSON.stringify(blocks[0]))) throw new Error(`Translated block IDs differ: ${JSON.stringify(pair)}`);
  }
}

export function validateLibrary(library) {
  const files = new Map([...library.notes.values()].map(note => [noteFile(note.path), note]));
  const errors = [];
  for (const note of library.notes.values()) {
    if (note.html.includes('class="missing-link"')) errors.push(`${note.path}: unresolved local or Wiki link`);
    for (const [, href] of note.html.matchAll(/\bhref="([^"]+)"/g)) {
      if (/^(https?:\/\/|mailto:)/i.test(href)) continue;
      const [path, fragment] = href.split('#');
      const target = path ? files.get(path.replace(/^\.\//, '')) : note;
      if (!target) errors.push(`${note.path}: missing target ${href}`);
      else if (fragment && !htmlIds(target.html).has(decodeURIComponent(fragment))) errors.push(`${note.path}: missing fragment ${href}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
}
