# Local helper commands

Supports **macOS and Linux**, with Python **3.10 or newer** and no packages to install. Windows is not yet supported. Use the Python interpreter actually meeting that version (some Macs ship an older `python3`). Resolve `scripts/rabbit_hole.py` from the loaded **rabbit-hole-start** directory. All paths in examples are arguments you choose, not assumed locations.

The helpers operate on selected local files without network access. Preview reads the specified input and leaves files unchanged. Use `--apply` for the named local mutation when the owner has authorized it. Account access, Git operations, scheduling, and publication belong to separate workflows.

## Initialize

```sh
python3 /absolute/skills/rabbit-hole-start/scripts/rabbit_hole.py init \
  --vault /absolute/new-private-vault --name 'Your chosen name' --lang en
```

Use `--lang zh-TW` for Chinese. Review the output, then repeat with `--apply` when authorized. Choose a new target outside Git repositories, with no symlink component. Existing paths are protected from overwrite. It creates:

- README.md and AGENTS.md;
- `00_Entry/Start.md`, `80_Sources/README.md`, `90_Maintenance/README.md` (Chinese: `00_入口`, `80_來源`, `90_維護`);
- `.rabbit-hole.json` and `90_*/import-ledger.json` for helper state.

This is a small private starting structure. The `.json` configuration and ledger are helper-owned; add narrative notes as real material becomes available. Git configuration and sharing permissions remain unchanged.

## Import

The import command uses a vault initialized by this helper, with its configuration and ledger. For an existing vault with a different intake system, follow that vault’s source workflow; the read-only checker also accepts ordinary vaults.

```sh
python3 /absolute/skills/rabbit-hole-start/scripts/rabbit_hole.py import \
  --vault /absolute/private-vault --input /absolute/selected-records.json \
  --namespace selected-posts --owner 'Your chosen name' --author 'Actual speaker'
```

Review, then repeat with `--apply` for an authorized write. Supported inputs are UTF-8 `.txt`, `.md`, normalized `.json` arrays and `.jsonl`; maximum input file size is **16 MiB**. Prepare ZIPs and native service exports separately into a supported permitted batch. See [source formats](../../rabbit-hole-import/references/source-formats.md).

For a text or Markdown file use `--source-id stable-id` if revisions should be recognized. Optional `--published-at`, `--event-at`, and `--recorded-at` provide fallback textual date values. JSON/JSONL records use their own `id`, dates and optional author; unprovided author falls back to `--author`. Dates retain supplied uncertainty rather than being guessed.

Identity includes namespace, owner, author and explicit source ID. Keep all four stable for the same source; a changed speaker creates a distinct identity. Without an explicit ID, normalized content determines identity and edited content becomes a new source. Reimporting an already-known revision leaves the existing history and current revision unchanged. Separate cross-platform reposts require human reconciliation.

Source notes use `80_*/imports/<hash>-r<revision>.md`; each has a block locator `^record-<hash>-r<revision>`. Copy the exact path/anchor from the created note for citations. Raw supplied bytes are retained as `90_*/raw/<hash>.bin`, with hashes and provenance in the ledger. Imported notes and revisions are immutable, with source quotes fenced as data. Correct a record by importing a new revision with the same identity; the CLI appends it and maintains the ledger.

The retained input is the file passed to the helper. If you normalized a platform export first, preserve its mapping/original reference separately; the helper has not retained an archive it never received. The full input must be permitted for retention. If choosing a permitted subset would require reading excluded content, obtain an independently supplied clean batch first.

After import, update the human source index and reading progress through the relevant skill. Record actual reading coverage separately from import counts. JSON output lists affected files and counts without dumping source text.

## Check

```sh
python3 /absolute/skills/rabbit-hole-start/scripts/rabbit_hole.py check \
  --vault /absolute/vault-or-reading-copy
```

Read-only checks cover local inline/Wiki links, heading/block targets, duplicate note IDs and, for helper-managed vaults, import ledger/artifact integrity. Plain existing vaults and staged reading copies can be checked directly, without initialization or added helper metadata.

This is a deliberately limited Markdown checker. Reference-style links, HTML, complex Markdown syntax, remote availability, prose truth and privacy need manual review. A source's fenced text is not parsed as executable links. Open the changed notes and walk actual routes as well as reading this report. A clean check cannot authorize publication or certify anonymity.

Exit codes: `0` successful command/preview or clean check; `1` structural findings; `2` refused/invalid/inaccessible input. The helper avoids printing source content in error messages. If a provenance hash differs, preserve the files and ledger for investigation. For a lock or concurrent-change error, verify the other operation’s state before deciding on recovery.

## Interrupted operations and macOS paths

Handled write failures roll back only newly created, unchanged files; concurrent edits are left alone. Abrupt process termination or power loss is not guaranteed crash recovery. Inspect remaining lock/temp/orphan artifacts and compare the ledger to establish what completed before deciding on repair. Preserve active locks and concurrent work.

macOS commonly aliases `/tmp` to `/private/tmp`. Symlink-path refusal is intentional. For a temporary test choose the verified canonical directory (for example `cd /tmp && pwd -P` shows it). Keep the guard enabled, and establish authorization for the resolved destination when a link is unexpected.
