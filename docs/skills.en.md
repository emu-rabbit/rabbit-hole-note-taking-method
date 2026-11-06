# Start your own rabbit hole with skills

[繁體中文](skills.md) · [Repository](../README.en.md) · [Full method](<../examples/emu-rabbit-en/00_Entry/Rabbit Hole Method.md>)

Begin with one memory you want to keep. Five skills cover five goals: start a rabbit hole, import material, revisit memories, maintain your notes, and prepare a reading copy. Tell the agent what you want to accomplish. It takes care of preserving sources, writing readable notes, connecting them, and reading through the result.

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

The default destination is `$CODEX_HOME/skills`, or `~/.codex/skills` when unset. Use `--dest /your/skills/directory` for a different compatible agent's skill directory. Install all five together: they share the method, internal references and local helpers in `rabbit-hole-start`. Check discovery on your next turn; reopen your client if it has not refreshed its skills.

The installer validates all files, links and collisions before writing. It never overwrites existing skills or changes global settings. If it finds a matching skill or an older entrypoint, it stops. Back up the existing Rabbit Hole skills and decide where to move them outside the skills directory, then install the complete new bundle. Automatic upgrade/removal is not implemented; unrelated skills remain untouched. Client discovery varies. File installation and Codex format are tested, not every compatible agent product.

## Choose a skill

| Skill | Use it for | Useful outcome |
| --- | --- | --- |
| `$rabbit-hole-start` | Starting your own rabbit hole | A private minimal structure, then an interview; a first note and entrance within the agreed saving scope |
| `$rabbit-hole-import` | Bringing selected local material into your notes | Preserved originals and sources, with the batch actually read woven into notes and navigation |
| `$rabbit-hole-interview` | Recalling experiences, relationships and feelings | A natural conversation; at a stopping point, saved accounts and updated notes and navigation within the agreed scope |
| `$rabbit-hole-maintain` | Checking, writing, correcting or improving a reading route | Read-only findings, or authorized updates to narrative, evidence, indexes and routes |
| `$rabbit-hole-share` | Preparing a version for a chosen audience | An exact proposed file list and required dependencies selected by the agent, plus a separate local draft for review |

Each entrypoint completes a useful piece of work that can be read, traced to evidence and explored further. Writing, linking, filing, indexing and re-reading belong to the agent. Shared writing and connection principles are internal references; `write` and `connect` are no longer separate skills to invoke. You provide the goal, permitted material and a place to keep it.

Once the saving scope is established, the agent completes the work within it without asking again for every note or link. An unsaved conversation or a read-only check stays that way. Sharing is a separate decision: preparing a local draft does not authorize uploading or delivering it.

## Five natural requests

Say what you want to accomplish. On your first use, the agent confirms the necessary folder, language and saving scope. For an existing vault, it continues in the current location and structure.

### rabbit-hole-start: Begin with one memory

> Help me start my own rabbit hole, beginning with the first time I moved home.

The agent creates a small private structure and asks the first question without requiring another skill invocation. At a natural stopping point, within the agreed saving scope, it preserves an attributed, dated account, writes a short story, and connects README to the story and its evidence. You can also ask for setup only or an unsaved conversation.

### rabbit-hole-import: Organize selected posts

You can use a social platform’s “download/export your data” feature to obtain **an export of your social media posts**, then select the files, date range or posts you want the agent to read and preserve. These can become import material. You can also start with selected social media posts you already have; a full account export is not required.

> I downloaded an export from a social platform. Bring the three social media posts I selected about moving home into my rabbit hole, so that part of my life is fuller.

An export is a source of material, **not a promise that native ZIP archives or platform JSON work directly with the local import command**. The agent first checks the actual format and permitted scope. When its available tools support the format, it can unpack, read and convert the selected material into UTF-8 text, Markdown, normalized JSON arrays or JSONL, up to 16 MiB per input file. This is preparation for the files at hand, not a built-in set of platform ZIP/API adapters. An unreadable format needs a separately prepared readable subset; renaming its extension is not a conversion.

Preserve authorized originals, source locators, authors and dates, and record how original records map to the converted content. The local helper retains only the input it actually receives, not a platform archive it was never given. If choosing a subset would require reading excluded records, provide a clean permitted subset first. Supplying an export does not authorize reading an entire account or every attachment.

The agent preserves permitted originals, authors, dates, source IDs and the ledger. It then integrates the material actually read into relevant stories, people or life notes, updates navigation, indexes and reading progress, and reads through the result. Large collections are read in batches; imported does not mean understood. Ask for “archive only” to preserve sources without narrative edits. Reimporting identical material does not create duplicate sources.

### rabbit-hole-interview: Revisit a collaboration

> Help me recall the first zine I made with a friend and keep that memory in my rabbit hole.

The agent follows your answers with one or two questions at a time. At a natural stopping point, within the established saving scope, it preserves an attributed, dated source, integrates the story, people and creative work into existing notes, and updates and checks navigation. Feelings at the time stay distinct from present-day recollections, with uncertainty intact. You can pause saving or exclude a passage at any time.

### rabbit-hole-maintain: Weave new understanding into existing notes

> I found the zine’s actual launch date. Please correct the related material in my rabbit hole.

After reading the new evidence, the agent updates the existing work, story and timeline, preserves earlier sources and explains the changed understanding. This skill also handles writing from existing sources, linking notes and improving short reading routes. A request to check remains read-only and returns findings and suggestions. Each pass records what was actually read and where to continue.

### rabbit-hole-share: Prepare a reading draft for family

> Prepare a version of my moving-home story for my older sister. I’d like to look it over first.

The agent selects and lists the exact proposed files for the audience and topic, checks source excerpts, attachments and link dependencies, and prepares a separate local draft. Review its context, edits and unresolved questions page by page before deciding which files to deliver and to whom. Preparing the draft does not send, upload or publish it.

### If you need to name the skill

If your client does not select the right entrypoint, prefix your request with its name from the table, such as `$rabbit-hole-interview`. You do not need a sequence of writing, linking or indexing commands.

## After your first pass

After the first pass, the agent should check four things and give you a working reading entrance:

1. The memory you agreed to save is a dated, attributed source with uncertainty intact. You do not need a social export to preserve a permitted chat account.
2. One short note stands on its own and its footnote reaches the actual source passage.
3. README reaches the note, the source index no longer says “No sources imported yet,” and there is a route back.
4. Maintenance records what was actually read and where to continue.

The agent then reads it as someone arriving for the first time: can a reader understand the scene, get a sense of the person, find the supporting passage, and choose where to stop? It revises confusing prose or navigation even when the structural check passes.

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

Synthetic tests cover both languages, repeat imports, preserved revisions, source injection, path boundaries, isolated installation and the existing website. They do not guarantee every agent's behavior or the safety of arbitrary private data. The bundled method matches the public editions; implementation choices live in [conventions.md](../skills/rabbit-hole-start/references/conventions.md). The repository's existing licensing caveat applies; this bundle adds no reuse permission for source material or creative work.

See the [evaluation record and synthetic reading sample](skills-evaluation.md) for actual findings, revisions, and re-reading results. The deep case is in Traditional Chinese; the record also identifies the smaller English test scope.
