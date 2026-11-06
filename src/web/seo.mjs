import { escape } from './notes.js';
import MarkdownIt from './vendor/markdown-it.js';
import { siteEnglish } from './site-messages.js';

// The repository is deployed under a GitHub Pages project path, not at /.
export const siteBase = 'https://emu-rabbit.github.io/rabbit-hole-notes/';
export const siteUrl = path => new URL(path, siteBase).href;
export const homePaths = { 'zh-TW': '', en: 'en/' };
export const homeDescriptions = {
  'zh-TW': '兔子洞是一種記錄一個人的筆記法。從故事、關係與作品，讀到一個人如何走到今天。',
  en: siteEnglish.description,
};
const decode = MarkdownIt().utils.unescapeAll;

// Only use text already rendered from the selected public example. Omit
// footnote markers, decode once, then escape again when writing attributes.
export function noteDescription(note) {
  const paragraph = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(note.html)?.[1] ?? note.title;
  const plain = decode(paragraph.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ').trim();
  const points = Array.from(plain);
  return points.length > 170 ? points.slice(0, 167).join('').trimEnd() + '…' : plain;
}

export function renderMetadata({ title, description, locale, paths, type = 'website' }) {
  const canonical = siteUrl(paths[locale]);
  const image = siteUrl('rabbit-hole.jpg');
  const imageAlt = locale === 'en' ? siteEnglish.burrowDescription : '白兔與收藏合照、故事、畫稿和信件的相連洞室';
  return `<title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${canonical}">
  ${Object.entries(paths).map(([language, path]) => `<link rel="alternate" hreflang="${language}" href="${siteUrl(path)}">`).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${siteUrl(paths['zh-TW'])}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${locale === 'en' ? 'Rabbit Hole Notes' : '兔子洞筆記法'}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_TW'}">
  <meta property="og:locale:alternate" content="${locale === 'en' ? 'zh_TW' : 'en_US'}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1374">
  <meta property="og:image:height" content="1145">
  <meta property="og:image:alt" content="${escape(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${escape(imageAlt)}">`;
}

export function renderSitemap(pages) {
  // Dates are intentionally omitted: build time is not content modification time.
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.flatMap(paths => Object.values(paths).map(path => `  <url>
    <loc>${siteUrl(path)}</loc>
${Object.entries(paths).map(([locale, alternate]) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${siteUrl(alternate)}" />`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl(paths['zh-TW'])}" />
  </url>`)).join('\n')}
</urlset>
`;
}
