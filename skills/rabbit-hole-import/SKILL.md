---
name: rabbit-hole-import
description: Preserve selected local sources in a Rabbit Hole vault with provenance, stable identities, and incremental revisions. Use for 兔子洞匯入 or preparing supported local source files.
---

# Preserve sources for later understanding

Create attributable, locatable source notes that retain the supplied wording and its history.

Follow the [shared conventions](../rabbit-hole-start/references/conventions.md), including first-use orientation to the author’s method. Read the vault’s guidance and the relevant source, index, and progress notes for this task. Read [source formats](references/source-formats.md) for input preparation and the [CLI reference](../rabbit-hole-start/references/cli.md) for the exact command contract.

## Import a permitted batch

1. Establish which files and records may be read and retained. The importer retains the **entire input file’s exact bytes**. Use an independently supplied permitted batch when the original mixes allowed and excluded content. If selecting the subset would require reading excluded material, ask its provider for a clean subset first.
2. Inspect the actual supported format and enough context to identify speakers, quotations, and dates. For a service export, normalize only the authorized portion using the source-format guidance and retain its mapping. Native platform archives and APIs require separate tools; this bundle accepts local text and normalized records.
3. Choose a stable source namespace and identity as documented in the CLI. Keep source-supplied IDs; use `--source-id` for an evolving text/Markdown record. Content-based identity is appropriate when no stable ID exists, with edited text becoming a new record.
4. Preview the exact input and metadata. Compare planned new, unchanged, and revised records with the intended batch, then apply an authorized write. Re-preview to check repeatability and run `check`. Open a generated source note and verify its original-byte provenance.
5. Update the human source index and reading-progress note deliberately. Record what was ingested, the passages actually read, unsupported material, and the next reading position. The CLI maintains its own ledger separately.

## Finish with a usable source

Return counts, actual reading coverage, the source-index path, and a concrete source locator that a writer can cite. A successful import preserves evidence; prose organization is a separate next step when requested.

## Example requests

- 「用 $rabbit-hole-import 把我提供的 selected-posts.json 匯入這個私人兔子洞。這是已按來源格式挑好的三篇自己的貼文。先給我看預覽，我確認後再保存，保留作者、原始日期和來源 ID。」
- “Use $rabbit-hole-import to bring the supplied selected-posts.json into this private vault. It contains three of my own posts prepared in the supported source format. Show me the preview first and save after I confirm, preserving authors, original dates, and source IDs.”
