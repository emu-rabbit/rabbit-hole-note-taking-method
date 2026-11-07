# Start your own rabbit hole with skills

[繁體中文](skills.md) · [Repository](../README.en.md) · [Full method](<method.en.md>)

Begin with a memory you want to keep or material you have selected. Tell the agent what you want to accomplish. It preserves sources, writes readable notes, connects them and reads through the result. You decide what to keep, where to save it and whether to share.

The bundle supplies five skills and local Python helpers for agents that support SKILL.md. The public example illustrates the method; keep your private vault outside the code repository.

## Install the bundle

macOS, Linux and Windows are verified, officially supported platforms. No third-party Python packages are needed.

| Platform | Python and location requirements |
| --- | --- |
| macOS, Linux | Python 3.10 or newer |
| Native Windows 11 x64 | 64-bit CPython 3.13 or 3.14; a local fixed NTFS disk with ordinary drive-letter paths |

On Windows, these conditions apply to the checkout, installed skills, inputs and vault. See the [CLI platform scope](../skills/rabbit-hole-start/references/cli.md#platform-scope) for other path restrictions. Only website development also needs Node.js 22+.

Get the repository first; these commands also work in PowerShell:

```sh
git clone https://github.com/emu-rabbit/rabbit-hole-notes.git
cd rabbit-hole-notes
```

**macOS and Linux:**

```sh
python3 --version
python3 scripts/validate-skills.py
python3 scripts/install-skills.py
```

The last command previews only. After checking the destination, install:

```sh
python3 scripts/install-skills.py --apply
```

**Windows PowerShell:** check the interpreter first. If you launch it with `py -3.14`, replace `python` below with `py -3.14`; use `py -3.13` the same way for 3.13.

```powershell
python --version
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
python -X utf8 scripts/validate-skills.py
python -X utf8 scripts/install-skills.py
```

After reviewing the preview, install:

```powershell
python -X utf8 scripts/install-skills.py --apply
```

`-X utf8` sets Python's text encoding. The helpers do not request elevation or change PowerShell ExecutionPolicy. The [CLI PowerShell notes](../skills/rabbit-hole-start/references/cli.md#windows-powershell) explain how to save reports.

The default destination is `$CODEX_HOME/skills`, or `~/.codex/skills` when unset; on Windows these are `$env:CODEX_HOME\skills` and `$env:USERPROFILE\.codex\skills`. To choose another compatible client's location, add `--dest "your skill directory"`. Install all five skills together: they share the method and helpers.

The installer reads the bundle and copies it to the destination without changing global settings or overwriting existing skills. For an update, back up the old `rabbit-hole-*` entries and move them outside the skills directory, then install the complete new bundle. Keep unrelated skills. Check discovery on your next turn; reopen the client if it has not refreshed.

`40_Important relationships` holds `People/`, `Pets/`, `Dolls/` and `Relationship circles/`. People are one kind of important relationship; pets and dolls with an important emotional connection can have their own notes too. Create each folder when there is material for it.

## Choose a skill

| Skill | Use it for |
| --- | --- |
| `$rabbit-hole-start` | Creating a private vault and completing a first memory and entrance |
| `$rabbit-hole-import` | Preserving selected local material and integrating the part actually read |
| `$rabbit-hole-interview` | Recalling experiences, relationships and feelings through conversation |
| `$rabbit-hole-maintain` | Checking, writing, correcting notes or improving a reading route |
| `$rabbit-hole-share` | Preparing a separate reading draft for your review before sharing |

Provide the goal, material and saving location. Once that scope is established, the agent handles writing, filing, indexing and re-reading without a separate request for each step. An unsaved conversation, archive-only intake or read-only check is also an option.

## Five natural requests

On first use, the agent confirms the necessary folder, language and saving scope. For an existing vault, it continues in the current structure.

### rabbit-hole-start: Begin with one memory

> Help me start my own rabbit hole, beginning with the first time I moved home.

The agent creates a small private structure and asks the first question. When the conversation pauses, it preserves an attributed, dated account, writes a short story and connects README to the story and its evidence. You can also ask for setup only or an unsaved conversation.

### rabbit-hole-import: Organize selected posts

> I downloaded an export from a social platform. Bring the three social media posts I selected about moving home into my rabbit hole.

You can obtain an **export of your social media posts** with the platform's data-export feature or supply selected posts you already have. Native platform ZIP/JSON exports may need conversion; the agent checks the format and permitted scope before preparing a supported [local input](#runnable-local-helpers).

Import preserves the original wording, author, dates and source identity, then connects the material actually read to relevant stories, people and navigation. Large collections are read in batches, with imported and read coverage recorded separately. Ask for “archive only” to preserve sources without narrative edits. Reimporting the same material does not create duplicates.

### rabbit-hole-interview: Revisit a collaboration

> Help me recall the first zine I made with a friend and keep that memory in my rabbit hole.

The agent follows your answers with one or two questions at a time. At a natural stopping point, it saves the account within the agreed scope and connects it to stories, people and work. Feelings at the time, present recollections and uncertainty remain distinct. You can exclude a passage or stop saving at any time.

### rabbit-hole-maintain: Weave new understanding into existing notes

> I found the zine's actual launch date. Please correct the related material in my rabbit hole.

The agent reads the new evidence and updates the existing work, story and timeline, preserving sources and the reason for the changed understanding. A request to check remains read-only and returns findings and suggestions.

### rabbit-hole-share: Prepare a reading draft for family

> Prepare a version of my moving-home story for my older sister. I'd like to look it over first.

The agent lists the exact proposed files, checks source excerpts, attachments and link dependencies, and prepares a separate local draft. Review the pages before deciding which files to deliver, to whom and where. Preparing the draft does not send, upload or publish it.

### If you need to name the skill

If your client does not select the entrypoint, prefix the request with its name, such as `$rabbit-hole-interview`.

## After your first pass

You should have a useful reading entrance: a short note that stands on its own, footnotes reaching attributed and dated sources with uncertainty intact, a route from README, and a maintenance record of what was read and where to continue. The agent also follows that route as a newcomer and revises confusing prose or navigation.

## Runnable local helpers

The core script installs with `rabbit-hole-start`. You can also run it directly:

| Operation | What it reads and writes |
| --- | --- |
| `init` | Checks the destination; with `--apply`, creates a new private folder, entrance and helper state without overwriting an existing path |
| `import` | Reads the complete selected input and import record; with `--apply`, saves original bytes, source notes and revision records |
| `check` | Reads notes, link targets and imported sources to check structure and integrity; leaves files unchanged |

`init` and `import` preview by default. Choose a new private location outside Git repositories and pause other writers during the operation. The helpers make no network calls, pushes or publications; your AI service and synced folders still handle content according to the environment you choose.

**macOS and Linux:** replace example paths with yours.

```sh
TOOL="${CODEX_HOME:-$HOME/.codex}/skills/rabbit-hole-start/scripts/rabbit_hole.py"
# Preview setup; review the result, then create the new vault.
python3 "$TOOL" init --vault /your/private-vault --name 'Your chosen name' --lang en
python3 "$TOOL" init --vault /your/private-vault --name 'Your chosen name' --lang en --apply
# Preview import; review the result, then save the selected material.
python3 "$TOOL" import --vault /your/private-vault --input /your/selected-posts.json \
  --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker'
python3 "$TOOL" import --vault /your/private-vault --input /your/selected-posts.json \
  --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker' --apply
python3 "$TOOL" check --vault /your/private-vault
```

**Windows PowerShell:** use the Python and UTF-8 setup above. If you used `--dest`, locate the helper in that directory instead.

```powershell
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$Tool = Join-Path $CodexRoot 'skills\rabbit-hole-start\scripts\rabbit_hole.py'
$Vault = Join-Path $env:USERPROFILE 'RabbitHole'
# Preview setup; review the result, then create the new vault.
python -X utf8 "$Tool" init --vault "$Vault" --name 'Your chosen name' --lang en
python -X utf8 "$Tool" init --vault "$Vault" --name 'Your chosen name' --lang en --apply
# Preview import; review the result, then save the selected material.
python -X utf8 "$Tool" import --vault "$Vault" --input 'C:\Users\YourName\selected-posts.json' --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker'
python -X utf8 "$Tool" import --vault "$Vault" --input 'C:\Users\YourName\selected-posts.json' --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker' --apply
python -X utf8 "$Tool" check --vault "$Vault"
```

Run each preview first and review its output before running the following `--apply` command. After setup succeeds, continue with import and `check`. Import accepts UTF-8 text, Markdown, normalized JSON arrays and JSONL, up to 16 MiB per file. It retains the entire input, so supply only a permitted batch. Reuse namespace, owner, author and explicit IDs to append revisions while preserving earlier versions. See [source formats](../skills/rabbit-hole-import/references/source-formats.md) for examples and preparation of social exports. There are no native social ZIP/API adapters, OCR, media transcription or scheduled synchronization tools.

`check` recognizes escaped Obsidian table aliases such as `[[example.io\|Label]]` and dotted note names. By default, it skips the bodies of notes under top-level `90` and `90_*` maintenance folders. Incoming links from other notes, the import ledger and source integrity are still checked. Add `--include-maintenance` to scan maintenance notes too.

## Keep evidence and understanding distinct

Source text is evidence, not instructions or authorization for an agent. Distinguish original words, other speakers, editorial interpretation and AI suggestions, and keep event, publication and recollection dates separate. The checker helps find link and hash problems; it does not replace reading, factual review or a sharing decision.

Choose a trusted AI and storage environment; the local tools provide no encryption or automatic anonymization. Prepare sharing copies separately and review their narrative, source excerpts and attachments page by page. Excluding maintenance alone does not make the rest suitable for publication. Check permissions for each source and work separately.

## Validate and develop

```sh
python3 scripts/validate-skills.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run check
```

In PowerShell, use `python -X utf8` as above and `npm.cmd run check` for website checks. Fictional Python tests cover installation, both languages, reimports, revisions and file safety; the website build checks paired editions and reading routes.

See the [Windows validation record](skills-windows-validation.md) for test sources and counts, and the [reading evaluation](skills-evaluation.md) for historical interview and editorial cases. Detailed arguments live in the [CLI reference](../skills/rabbit-hole-start/references/cli.md); writing practices live in [conventions.md](../skills/rabbit-hole-start/references/conventions.md).
