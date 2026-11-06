---
name: rabbit-hole-maintain
description: Reconcile an existing Rabbit Hole with new evidence, corrections, reading progress, and navigation. Use for 兔子洞維護、增量更新、檢查連結 or 接續整理.
---

# Leave a trustworthy place to continue

Make a bounded update whose evidence, prose, and progress records agree, so the next person or agent can resume without guessing.

Follow the [shared conventions](../rabbit-hole-start/references/conventions.md), including first-use orientation to the author’s method. Read the vault’s guidance and the relevant source, index, and progress notes for this task. Read the maintenance guide, understanding updates, interview route, and material/reading progress. Identify the requested defect or new evidence and the actual reading cursor.

## Establish the baseline

For **check-only**, inspect and report in the response, leaving files unchanged. For an authorized **repair/update**, inspect current contents and any available diff, preserving unrelated work. Run the read-only checker for a structural baseline using the [CLI reference](../rabbit-hole-start/references/cli.md).

## Reconcile a small, useful scope

1. Read the relevant new passages and their context, then compare them with the owning note and earlier cited sources. Distinguish factual contradiction from changed circumstances, preference, relationship, or later interpretation.
2. Resolve what the evidence supports. Attribute accounts that disagree and preserve the remaining question. Ask a focused question when that uncertainty blocks a useful edit.
3. Update the existing person, story, or work under its stable identity. Integrate new material into its relevant period or theme, adjust the opening or ending where needed, and reread the whole affected article so prose flows and navigation sits in its proper place. Use **rabbit-hole-write** for substantive prose and **rabbit-hole-connect** for affected navigation.
4. For a substantial reinterpretation, preserve the necessary earlier wording or recoverable revision. Record the previous understanding, new evidence and locators, what changed and why, and what remains unresolved.
5. Update affected source-index entries, reading ranges, interview questions, and navigation. Record the next precise source range. Keep maintenance concise, describing exclusions without repeating excluded content.

## Verify the result

Review the diff, rerun structural checks, and manually verify changed claims and routes. Separate remaining pre-existing defects from regressions. If a repair would overwrite unrelated work, merge uncertain identities, or expand into bulk changes, report the narrow blocker and leave that action pending.

A finished pass yields an actionable read-only report or a small reviewed update with accurate coverage. Return changed paths (or “no files changed”), what understanding changed and its source, remaining uncertainty, before/after checks, and the next useful reading position or question.

## Example requests

- 「用 $rabbit-hole-maintain 把這份新訪談補回現有的小刊物作品頁、相關故事和年表。訪談更正了首發日期，也補上當時合作的細節。請保留舊來源，說明理解改變的原因，並記下這次真正讀完的範圍。」
- “Use $rabbit-hole-maintain to incorporate this new interview into the existing zine page, related story, and timeline. It corrects the launch date and adds details about the collaboration. Keep the earlier sources, explain why the understanding changed, and record the material actually read in this pass.”
