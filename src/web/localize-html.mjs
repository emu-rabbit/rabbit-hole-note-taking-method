import { escape } from './notes.js';

// Use the same messages for static English pages and client-side enhancement.
export function localizeHtml(html, messages) {
  const messageFor = (tag, key) => messages[key]?.replace('{number}', /data-i18n-number="([^"]*)"/.exec(tag)?.[1] ?? '');
  const translated = html.replace(/<[a-z][^>]*>/g, tag => {
    for (const attribute of ['aria-label', 'title', 'placeholder', 'content', 'alt', 'href']) {
      const key = new RegExp(`data-i18n-${attribute}="([^"]+)"`).exec(tag)?.[1];
      const text = messageFor(tag, key);
      if (text !== undefined) tag = tag.replace(new RegExp(`(?<![\\w-])${attribute}="[^"]*"`), `${attribute}="${escape(text)}"`);
    }
    return tag;
  });
  return translated.replace(/(<([a-z][\w-]*)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (whole, tag, _name, key, _text, closing) => {
    const text = messageFor(tag, key);
    return text === undefined ? whole : `${tag}${escape(text)}${closing}`;
  });
}
