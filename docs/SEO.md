# Search and sharing metadata

The production base is `https://emu-rabbit.github.io/rabbit-hole-notes/`, configured in `src/web/seo.mjs`. Keep the trailing project path when the repository or host changes.

## Public routes

- Chinese introduction: `/rabbit-hole-notes/`
- English introduction: `/rabbit-hole-notes/en/`
- Chinese and English examples: `/rabbit-hole-notes/reader/index.html` and `/rabbit-hole-notes/reader-en/index.html`
- Sitemap: `/rabbit-hole-notes/sitemap.xml`

Both introductions and all 56 notes in each language are rendered as HTML at build time. JavaScript enhances the interface; it is not needed to discover the English introduction or read the notes. Language links work without JavaScript. Existing `?lang=en` or `?lang=zh-TW` links remain supported by the locale controller, which redirects to the corresponding static page. Homepage section anchors, shared source block IDs, and headings with a one-to-one mapping are preserved. Unmatched note anchors fall back to the corresponding page, as in the existing reader. With JavaScript disabled, a legacy query URL shows the static language at its pathname; use the visible language link instead.

Each page has one self-canonical URL without query parameters or fragments, reciprocal `zh-TW` and `en` alternates, and a Chinese `x-default` fallback. Titles, descriptions, Open Graph and Twitter cards are present in the initial response. Note descriptions use the first paragraph already published in the selected public example. A dedicated `rabbit-hole-social-1200x630.jpg` provides a 1200 × 630 (about 1.91:1) JPEG preview for Open Graph and Twitter large-image cards. It extends the existing illustration into a wide composition, keeping the rabbit and connected rooms visible without stretching or cropping them out. The original `rabbit-hole.jpg` remains the homepage hero. Image metadata declares the exported dimensions and MIME type; individual platforms may still crop or cache previews differently.

The homepage footers intentionally omit a visible sitemap link. The generated `sitemap.xml` remains available at its existing URL for search-engine submission and crawling. The sitemap includes exactly the two introductions and 112 existing public note pages. It excludes ZIP downloads, scripts, navigation helpers, skills, repository files, and anything outside the two explicitly configured public example folders. No private vault is read. No fabricated modification dates, ratings, search keywords, or authorship claims are emitted. Navigation helper documents are `noindex, follow`; the reader imports only their body so the directive never reaches an article page.

## Renamed public notes

The three people now use 第一任主人 / First master, 前主人 / Former master, and 前女友 / Ex-girlfriend. Their six published reader HTML URLs are pinned to the original path hashes in `src/web/public-url-compat.mjs`. Renaming the Markdown files therefore does not change reader URLs, canonical URLs, hreflang destinations, or sitemap entries. Old person-title and source-section heading fragments remain as non-visible anchor aliases; switching languages from an old fragment reaches the matching current heading. Existing source block IDs are unchanged.

The downloaded vaults and repository use only the new Markdown filenames and updated links. Direct GitHub `blob/main/…` or raw-file links to the old Markdown paths are not covered by reader URL compatibility; use the new paths (or a historical commit for the old files). Compatibility aliases are build-time routing data, not duplicate notes or sitemap entries.

## GitHub Pages and robots.txt

Crawlers use **`https://emu-rabbit.github.io/robots.txt`**, at the origin root. A file at `/rabbit-hole-notes/robots.txt` would not govern this project, so this build deliberately does not generate one.

At the time of the initial audit, the origin-level robots file allowed all paths and listed only the personal site's sitemap. After this PR is merged and Pages has deployed, the owner can submit `https://emu-rabbit.github.io/rabbit-hole-notes/sitemap.xml` through their verified search-console property. Alternatively, the owner of the separate root-site repository can add this sitemap to the root robots file or a root sitemap index. This project does not change that other repository, submit to search engines, or deploy from a PR.

Indexing and search ranking are controlled by search engines. A sitemap or valid metadata does not guarantee either. Social platforms can also cache previews. Check the actual deployed response after merging rather than assuming a local build is live.

## Verification

Run `npm run check` on Node.js 22 or later. No install is needed. Tests cover:

- Static English text, image descriptions, every structure panel, and note content.
- Every public page's canonical, language alternates, description, robots and share metadata.
- The 114-entry sitemap, self/alternate links, and exclusion of non-page artifacts.
- The social JPEG’s actual 1200 × 630 dimensions, matching metadata, and unchanged hero asset reference.
- Internal links, anchors and assets under the GitHub Pages project path.
- Legacy language URLs, paired note fragments, and HTML-safe descriptions.
- Existing translation completeness, note references, and safe ZIP creation.

The existing Pages workflow remains limited to `main`; it does not run pull-request checks. This PR adds no workflow and needs no expanded GitHub workflow permissions. Record the local check results when reviewing the PR.
