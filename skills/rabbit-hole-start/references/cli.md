# Local helper commands

Use the installed Python interpreter that meets the [platform scope](#platform-scope). No third-party Python packages are needed. Resolve `scripts/rabbit_hole.py` from the loaded **rabbit-hole-start** directory. All paths in examples are arguments you choose, not assumed locations.

The helpers operate on selected local files without network access. Preview reads the specified input and leaves files unchanged. Use `--apply` for the named local mutation when the owner has authorized it. Account access, Git operations, scheduling, and publication belong to separate workflows.

## Platform scope

- **macOS and Linux:** Python **3.10 or newer**, using the existing directory-descriptor safeguards. Check `python3 --version`; use an already-installed newer interpreter if needed.
- **Native Windows: experimental.** Native Windows Server 2025 x64 CI passed with **64-bit CPython 3.13 and 3.14 on local fixed NTFS**. The desktop target is **Windows 11 on native x64 hardware with the same interpreter/filesystem requirements**; Windows 11 desktop/client validation is still pending. Use fictional material for desktop validation before private use. ARM64 emulation and broader Windows-version or client compatibility are outside this target.

For Windows, use ordinary drive-letter paths with case-insensitive directories. This applies to the checkout, installed skills, input files and vault. The native I/O path is designed to hold directory handles and reject junctions and other reparse points, UNC/network drives, SUBST drives, device namespaces, non-NTFS volumes and case-sensitive directories. Existing ACLs stay unchanged. The Windows design gives new private vault data and temporary files restricted permissions at creation; installed public skills inherit the destination's permissions. The helpers do not request elevation or change PowerShell ExecutionPolicy; standard-user Windows 11 operation remains unvalidated. Preview stays read-only, existing targets stay protected from overwrite, and imported source bytes are preserved unchanged.

## Windows PowerShell

Check the interpreter before running the examples. If it is installed as `py -3.13`, verify `py -3.13 --version` and use `py -3.13` in place of `python` throughout. Select the installed 3.14 interpreter the same way when applicable.

```powershell
python -c "import platform, struct; print(platform.python_implementation(), platform.python_version(), platform.machine(), 8 * struct.calcsize('P'))"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$Tool = Join-Path $CodexRoot 'skills\rabbit-hole-start\scripts\rabbit_hole.py'
python -X utf8 "$Tool" --help
```

Expect CPython, a version in the target range, AMD64/x64 and 64 bits; this display is an initial check, not proof of native hardware. Use the actual loaded skill's path if installed elsewhere. In the commands below, replace `python3 /absolute/skills/rabbit-hole-start/scripts/rabbit_hole.py` with `python -X utf8 "$Tool"`, use your Windows paths, and keep each command on one line instead of using shell `\` continuations. For example:

```powershell
python -X utf8 "$Tool" init --vault "$env:USERPROFILE\RabbitHole" --name 'Your chosen name' --lang en
python -X utf8 "$Tool" check --vault "$env:USERPROFILE\RabbitHole"
```

`-X utf8` sets Python's text I/O to UTF-8; the console setting above lets PowerShell decode it consistently. To save a report across PowerShell versions, pipe it to `Set-Content -LiteralPath .\check-report.json -Encoding utf8` after choosing a new report path outside the vault. Windows PowerShell 5.1 writes a UTF-8 BOM with this command; its plain `>` redirect instead defaults to UTF-16. PowerShell 7.4+ preserves native output bytes with `>`. Pass source files directly with `--input` so their original bytes are retained.

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

Source notes use `80_*/imports/<hash>-r<revision>.md`; each has a block locator `^record-<hash>-r<revision>`. Copy the exact path and locator syntax from the created note for citations. Block targets keep their caret: `[[80_Sources/imports/<hash>-r1#^record-<hash>-r1|source]]`, or a page-relative Markdown link ending in `.md#^record-<hash>-r1`. Heading targets use the actual heading or its slug. Block and Wiki links require a compatible reader such as Obsidian; a plain Markdown reading copy needs reader-supported targets. Raw supplied bytes are retained as `90_*/raw/<hash>.bin`, with hashes and provenance in the ledger. Imported notes and revisions are immutable, with source quotes fenced as data. Correct a record by importing a new revision with the same identity; the CLI appends it and maintains the ledger.

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

The import lock coordinates this tool's imports; pause other programs that edit sources or the ledger during import, since it does not provide a vault-wide transaction or an atomic compare-and-swap against other writers using the same account. On handled write failures, cleanup attempts to roll back newly created files and preserves changes it observes.

On Windows, pinned directory handles block rename; parent attributes are also checked before and after relative opens, because an in-place reparse conversion can keep the same file ID. These checks do not establish immunity to arbitrary concurrent reparse changes by another process using your account. Keep the checkout, installation and vault free of concurrent filesystem mutation during each operation. Native FSCTL tests passed on the Server runner; the same cases remain required for Windows 11 desktop validation.

Abrupt process termination or power loss is not guaranteed crash recovery. Inspect remaining lock/temp/orphan artifacts and compare the ledger to establish what completed before deciding on repair. Preserve active locks and concurrent work.

macOS commonly aliases `/tmp` to `/private/tmp`. Symlink-path refusal is intentional. For a temporary test choose the verified canonical directory (for example `cd /tmp && pwd -P` shows it). Keep the guard enabled, and establish authorization for the resolved destination when a link is unexpected.
