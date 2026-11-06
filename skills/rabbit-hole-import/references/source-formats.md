# Local source formats

The helper accepts UTF-8 `.txt`, `.md`, `.json`, and `.jsonl`, up to 16 MiB per input. It uses Python standard-library parsing. See the [CLI reference](../../rabbit-hole-start/references/cli.md) and `--help` for the exact command contract. Platform archives, URLs, images, audio, and databases need separate authorized preparation into these formats.

## Text and Markdown

One supplied file becomes one source record. Use a stable `--source-id` for an evolving file. The full contents are preserved as source text, including Markdown frontmatter and links. Supply a bounded file whose complete contents may be read and retained.

## JSON and JSONL

JSON is an array of objects. JSONL is one object per nonempty line. A normalized record has a required nonempty `text` string and may have `id`, `title`, `author`, `published_at`, `event_at`, `recorded_at`, `url`, `locator`, and `visibility`. Owner and fallback author are supplied on the command. Only `private` visibility is accepted. A source’s old public visibility is not permission to publish a derivative; record the historical visibility in its contextual locator if relevant.

```json
[
  {
    "id": "post-001",
    "text": "Fictional example: I repaired a blue bench with Ren. We left one leg unfinished.",
    "title": "The blue bench",
    "author": "Ari (fictional)",
    "published_at": "2024-05-03T18:30:00+08:00",
    "event_at": "2024-05 (approximate)",
    "locator": "Owner-selected local export, post-001",
    "visibility": "private"
  }
]
```

Use `recorded_at` for when the account was narrated or recorded, keeping export metadata separately in provenance. Preserve unknown and approximate dates in the source’s own terms. A stable namespace plus record ID identifies one record; explicit IDs are needed to recognize edited records as revisions. Without an ID, content-derived identity intentionally treats changed text as a new record. Cross-platform reposts may be related, but the importer does not infer that they are identical.

Keep namespace, owner, author, and explicit source ID stable across batches of the same source, as described in the CLI identity contract. Choose a non-secret namespace label such as `my-selected-posts`. Resolve duplicate or contradictory IDs within a batch before importing.

## Normalizing a service export

1. Identify the actual export format and select the authorized files/date range. When excluded records are mixed into one file and cannot be isolated without reading them, obtain an independently supplied permitted subset first. Inspect its actual schema rather than relying on the platform name.
2. Retain the permitted supplied original separately from the normalized derivative, in the authorized location. Make a mapping note: original filename, record locator/ID, relevant fields, timezone, omissions and any decoding performed. Retain full exact source wording for the selected record where authorized.
3. Map one post/account to the correct speaker. Keep replies and quoted speech attributed to their actual speakers.
4. Normalize a small sample, compare it against the original, then process only the approved subset. Record failures and coverage. If the original has no stable ID, use a documented, unambiguous source locator or accept content-based identity.
5. Import the normalized file. The runtime stores the exact normalized input bytes, **not** the platform archive you did not pass it. Keep the original-to-normalized mapping and original reference in the source/progress notes so provenance is not overstated.

These are agent-assisted preparation steps. The bundle has no native service adapters. If the available tools cannot safely inspect the format, ask its provider for a supported text/JSON subset.
