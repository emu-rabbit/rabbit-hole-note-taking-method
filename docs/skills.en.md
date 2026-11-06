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

## A first request

> Use $rabbit-hole-start to create a private English rabbit hole in a new folder I choose. Start from one memory, do not read anything else, and do not share it. Ask me one question first.

Offer a moment you want to preserve. With permission to save it, the agent can keep your account as a source, write a small readable note, and connect it from the entrance. You can instead request setup only, or talk without saving. Missing feelings, relationships and endings must not be invented to complete the prose.

For an existing vault, provide its location and the bounded task. The agent continues in its existing structure.

After the first pass, check four things:

1. The memory you agreed to save is a dated, attributed source with uncertainty intact. You do not need a social export to preserve a permitted chat account.
2. One short note stands on its own and its footnote reaches the actual source passage.
3. README reaches the note, the source index no longer says “No sources imported yet,” and there is a route back.
4. Maintenance records what was actually read and where to continue.

Then read it as someone arriving for the first time: can you understand the scene, get a sense of the person, find the supporting passage, and choose where to stop? Revise confusing prose or navigation even when the structural check passes.

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
