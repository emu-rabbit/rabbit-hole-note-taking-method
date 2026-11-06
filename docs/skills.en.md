# Start your own rabbit hole with skills

[繁體中文](skills.md) · [Repository](../README.en.md) · [Full method](<../examples/emu-rabbit-en/00_Entry/Rabbit Hole Method.md>)

Begin with one memory you want to keep. Seven complementary skills cover starting, preserving sources, interviewing, writing, connecting, maintaining, and reviewing a reading copy. They help an agent do a useful piece of work and leave a clear place to continue.

This is a SKILL.md bundle with local Python helpers for selected source files. You choose what to preserve, how to tell it, and whether to share. The public example shows the method; your vault begins with your own material.

## Install the bundle

The local installer and helpers currently support macOS and Linux with Python 3.10 or newer and no third-party packages. Windows is not yet supported. Website development separately needs Node.js 22+. Check `python3 --version`; on Macs with an older system Python, use an already-installed newer interpreter. Keep your private vault outside this public code checkout.

```sh
git clone https://github.com/emu-rabbit/rabbit-hole-notes.git
cd rabbit-hole-notes
python3 scripts/validate-skills.py
python3 scripts/install-skills.py
```

The last command previews only. To install after reviewing it:

```sh
python3 scripts/install-skills.py --apply
```

The default destination is `$CODEX_HOME/skills`, or `~/.codex/skills` when unset. Use `--dest /your/skills/directory` for a different compatible agent's skill directory. Install all seven together: they share the method, conventions and helpers in rabbit-hole-start. Check discovery on your next turn; reopen your client if it has not refreshed its skills.

The installer validates all files, links and collisions before writing. It never overwrites existing skills or changes global settings. For an update, first back up the seven existing directories and decide where to move them, then install the new version. Automatic upgrade/removal is not implemented; unrelated skills remain untouched. Client discovery varies. File installation and Codex format are tested, not every compatible agent product.

## Choose a skill

| Skill | Use it for | Useful outcome |
| --- | --- | --- |
| `$rabbit-hole-start` | Starting or choosing the next step | A private minimal structure and a real entrance |
| `$rabbit-hole-import` | Explicitly selected local records | Originals, source notes, locators and revision ledger |
| `$rabbit-hole-interview` | Memories, relationships and feelings | One or two comfortable questions; dated accounts when saving is authorized |
| `$rabbit-hole-write` | Turning sources into readable notes | Grounded stories, people, life themes or creative-work pages |
| `$rabbit-hole-connect` | Making existing notes navigable | Natural links, indexes, timelines and short reading routes |
| `$rabbit-hole-maintain` | New evidence, corrections or resuming | Bounded updates, changed understanding and honest reading progress |
| `$rabbit-hole-share` | Preparing for a chosen audience | A separate local draft for page-by-page review |

A common path is start → import or interview → write → connect → maintain. Use only the steps you need. Sharing is optional; preparing a reading draft does not authorize uploading it.

## Seven practical requests

Replace the folders, files, and notes with your own. Choose the task you need now; for an existing vault, provide its location so the agent can continue in its current structure.

### rabbit-hole-start: Begin with one memory

> Use $rabbit-hole-start to create a private English rabbit hole in a new folder I choose. Begin with the first time I moved home: ask me one question, then confirm what I want to save. Use only the memories I provide and keep the vault local.

What you get: with permission to save, a memory source, a short story, and a route from README to the story and its evidence. Setup only or an unsaved conversation are also options.

### rabbit-hole-import: Preserve selected posts

> Use $rabbit-hole-import to bring the supplied selected-posts.json into this private vault. It contains three of my own posts prepared in the supported source format. Show me the preview first and save after I confirm, preserving authors, original dates, and source IDs.

What you get: the original input, three locatable source notes, and a ledger. Reimporting identical records reports unchanged; turning them into stories is a separate next step.

### rabbit-hole-interview: Revisit a collaboration

> Use $rabbit-hole-interview to help me recall the first zine I made with a friend. Ask one question at a time, starting with why we began. Keep this conversation unsaved until I choose what I want to preserve.

What you get: a conversation whose next question follows your answer. Once you choose what to save, the questions and answers can become an attributed, dated source.

### rabbit-hole-write: Turn an interview into a story

> Use $rabbit-hole-write to turn the moving-home interview I selected in this vault into a short, self-contained story and save it here. Use the interview to explain my friend’s role at the time, distinguish feelings then from recollections now, and link footnotes to the original words.

What you get: a story with scene and context, nearby source footnotes, and updated indexes and reading progress.

### rabbit-hole-connect: Guide a first-time reader

> Use $rabbit-hole-connect to make a short first-visit route through the five existing notes I selected. Start with the profile, then visit the moving-home story and the zine we made together. Add the links and brief context readers need, and mark a comfortable stopping point in the reading map.

What you get: a navigable route with an ending, natural links among people, stories and work, and lookup entries that help readers find them.

### rabbit-hole-maintain: Weave new understanding into existing notes

> Use $rabbit-hole-maintain to incorporate this new interview into the existing zine page, related story, and timeline. It corrects the launch date and adds details about the collaboration. Keep the earlier sources, explain why the understanding changed, and record the material actually read in this pass.

What you get: updates to the existing pages, evidence for the date correction, and a clear place to resume reading. The contemporary records remain available.

### rabbit-hole-share: Prepare a reading draft for family

> Use $rabbit-hole-share to prepare a separate local reading draft of the two stories I selected for my older sister. I want to review each page, its source excerpts, and its links before deciding which files to share.

What you get: a separate local draft and a list of excerpts, edits, and files to review. Delivering it to your sister is a later, separately authorized step.

## After your first pass

After the first pass, check four things:

1. The memory you agreed to save is a dated, attributed source with uncertainty intact. You do not need a social export to preserve a permitted chat account.
2. One short note stands on its own and its footnote reaches the actual source passage.
3. README reaches the note, the source index no longer says “No sources imported yet,” and there is a route back.
4. Maintenance records what was actually read and where to continue.

Then read it as someone arriving for the first time: can you understand the scene, get a sense of the person, find the supporting passage, and choose where to stop? Revise confusing prose or navigation even when the structural check passes.

## Runnable local helpers

The core helper installs with rabbit-hole-start. For the default installation, replacing the example paths with yours:

```sh
TOOL="${CODEX_HOME:-$HOME/.codex}/skills/rabbit-hole-start/scripts/rabbit_hole.py"
python3 "$TOOL" init --vault /your/new-private-vault --name 'Your chosen name' --lang en
# After preview, add --apply to the same command to write.
python3 "$TOOL" import --vault /your/private-vault --input /your/selected-posts.json \
  --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker'
python3 "$TOOL" check --vault /your/private-vault
```

`init` and `import` preview by default; `check` is read-only. Initialization never overwrites an existing path. Write commands refuse vaults inside Git repositories or reached through symlinks. Helpers create no remote, push nothing, grant no sharing access and make no network calls. See the [CLI reference](../skills/rabbit-hole-start/references/cli.md) for paths, arguments and failure handling.

Import accepts UTF-8 text, Markdown, normalized JSON arrays and JSONL, up to 16 MiB per input file. It preserves source identity, speakers, separate event/publication/narration dates, exact input bytes and hashes. Reimporting the same revision is a no-op; changed records with stable IDs append preserved revisions. Without stable IDs, identity is content-based, so edited material becomes a new source rather than being silently matched.

The importer retains the full input file’s bytes. Supply a separate permitted batch when a larger file mixes allowed and excluded content. If choosing that subset would require reading excluded records, ask the provider to prepare it first.

See [source formats and a fictional example](../skills/rabbit-hole-import/references/source-formats.md). **There are no native ZIP/API adapters for Facebook, Instagram, Threads, X, LINE, Discord, email or other services.** An agent may inspect and normalize a selected authorized subset, preserving its mapping and origin, but that is not a shipped platform integration. Images, audio/video, OCR, transcription and scheduled synchronization are not included.

## Keep evidence and understanding distinct

Imported does not mean read. The owner's words, another person's words, the organizer's interpretation and AI suggestions stay distinct. So do publication, event and present-day recollection dates. New material belongs with the existing person, story or work; a changed role does not create a different person.

The checker finds some local link, anchor, duplicate-ID and provenance-integrity problems. It is not a full Markdown parser or a test of truthful interpretation, anonymity or permission to publish. Read every changed page and follow its route back to the actual source.

Local-first means the helper scripts do not use the network. **It does not mean your AI provider or synced folder cannot receive data.** Choose a trusted environment and permitted material. The toolkit provides no encryption, access-control system or automatic privacy clearance. The sharing skill intentionally uses exact file selection and human review; it has no automatic packaging or publication command. Excluding maintenance alone is insufficient.

## Validate and develop

```sh
python3 scripts/validate-skills.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run check
```

Synthetic tests cover both languages, repeat imports, preserved revisions, source injection, path boundaries, isolated installation and the existing website. They do not guarantee every agent's behavior or the safety of arbitrary private data. The author's complete method remains unchanged; implementation choices live in [conventions.md](../skills/rabbit-hole-start/references/conventions.md). The repository's existing licensing caveat applies; this bundle adds no reuse permission for source material or creative work.

See the [evaluation record and synthetic reading sample](skills-evaluation.md) for actual findings, revisions, and re-reading results. The deep case is in Traditional Chinese; the record also identifies the smaller English test scope.
