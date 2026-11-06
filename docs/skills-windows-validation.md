# Native Windows validation / Windows 原生驗證

Windows support remains experimental: native Windows Server 2025 x64 CI has passed; Windows 11 desktop validation remains pending. 原生 Server 測試已通過，但不等於 Windows 11 桌面與客戶端相容性已驗證；也不能把 macOS 的通過或 Windows-only 的跳過當成 Windows 通過。

## Recorded evidence — 2026-11-06

- Host: macOS 15.3.1, Darwin 24.3.0, Apple arm64; CPython 3.13.18. The system Python 3.9 was below the supported minimum and is not the validation interpreter.
- `python -B scripts/validate-skills.py`: all five skills validated.
- `python -B -m unittest discover -s tests -p 'test_*.py' -v`: latest local run after adding the installed-helper case: 112 tests, 90 passed, 22 native-Windows-only tests skipped.
- `npm run check`: 31 website tests passed; both language builds completed (56 notes each).
- A separate smoke run installed the actual repository bundle into a disposable Unicode/space-containing path, then invoked the installed helper for both languages: read-only initialization preview, applied initialization, import/reimport and integrity check passed. Source UTF-8 BOM/CRLF bytes were unchanged, and a second installation refused overwrite. This is macOS evidence only.
- Independent read-only security review covered both I/O backends, runtime, installer, rollback, rename ABI and private DACL construction. Review identified the in-place reparse detection gap; parent attributes are now checked before/after relative opens and during identity queries. Static review is not native execution evidence.

All workflow inputs are fictional. Tests exercise initialization, byte-preserving import/revisions/retries, integrity and link maintenance, and isolated five-skill installation. They do not install into the user's actual client directory. Tests do not open listening ports or stop services.

## Native Server results — 2026-11-06

Successful [run 42235653762](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42235653762) tested commit `45a7f1c` on **Windows Server 2025 x64, OS 10.0.26100, local fixed NTFS**. Full logs were downloaded and checked, including the native-case skip gate:

| Interpreter | Result | Native security cases | Job log |
| --- | --- | --- | --- |
| CPython 3.13.17 AMD64 | 112 total: 101 passed, 11 POSIX-only skipped | 22 passed, zero skipped | [3.13](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42235653762/job/127952435598) |
| CPython 3.14.10 AMD64 | 112 total: 101 passed, 11 POSIX-only skipped | 22 passed, zero skipped | [3.14](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42235653762/job/127952435955) |

Both jobs passed five-skill bundle validation and actual isolated installation followed by both-language initialization, import/reimport and integrity maintenance. Actual junction/FSCTL conversion, unchanged directory identity, parent pinning, rename publication, private DACL inspection, sharing failures, rollback/foreign content preservation, Unicode paths and original-byte/hash preservation passed. These were real Windows API calls, not WSL or simulated platform results. The runner account is `runneradmin`; standard-user Windows 11 desktop operation and client skill discovery remain separate unverified cases.

## Windows 11 desktop checks still required

Run from an ordinary local NTFS checkout on **Windows 11 native x64**, once with each **64-bit CPython 3.13 and 3.14**. No WSL or mocked `sys.platform` result qualifies. In PowerShell:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
py -3.13 -c "import platform, sys; print(platform.platform()); print(sys.version)"
py -3.13 -B scripts/validate-skills.py
py -3.13 -B -m unittest discover -s tests -p 'test_*.py' -v
# Repeat these three Python commands with py -3.14.
```

The suite uses disposable temporary directories. Record the OS build, interpreter, volume filesystem, pass/fail/skip totals and full logs. A missing junction, PowerShell DACL inspection or FSCTL capability must remain a failed/incomplete check, never be silently skipped to obtain a green result.

Native cases cover junction ancestors and late substitution, pinned old/new directories, real `FSCTL_SET_REPARSE_POINT` conversion without changing directory identity, rename publication and ledger replacement, protected private DACLs, sharing failures, foreign-file preservation, rollback, case collisions and Windows path refusals. Portable cases add UTF-8/BOM/CRLF preservation, invalid UTF-8 refusal, parallel import retries and real `core.autocrlf=true` checkout behavior.

The [Native Windows skills workflow](../.github/workflows/skills.yml) requests two real Windows Server 2025 x64 jobs, one per interpreter version. A configured workflow or queued run is not passing evidence. Server-runner results must be labeled as Server results; they do not establish Windows 11 desktop/client compatibility.

## CI scope and initial corrections

- The workflow triggers on relevant pull requests to `main`, grants its job token only `contents: read`, disables persisted checkout credentials, uses no secrets, pins official checkout/setup-python actions by commit, and limits each job to 15 minutes. It neither publishes nor deploys anything; the existing Pages workflow is unchanged.
- It runs the complete fictional suite and fails if no native Windows security cases are discovered or any are skipped. The native tests check the actual OS, architecture, filesystem, DACL and reparse APIs. Intentional POSIX-only skips on Windows remain allowed.
- `test_installed_skill_workflow.py` now automates the separate installed-helper smoke procedure: actual five-skill installation into a disposable Unicode/space-containing path, both-language init preview/apply, import/reimport, integrity maintenance, source byte/hash preservation and refusal to overwrite an installation.

The initial [run 42235000636](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42235000636) at commit `7c77585` passed bundle validation, then each version ran 112 tests with 9 failures and 11 intentional POSIX-only skips. All 22 native security cases executed; none was skipped.

The first failures exposed fixture/error-reporting assumptions: `cmd.exe` quoting prevented six real junction fixtures from being created; CRT-backed writes reported `EACCES` without `winerror`; replacing a held target reported Win32 `ACCESS_DENIED` rather than `SHARING_VIOLATION`. Corrections create the actual mount-point tag directly through the already-exercised FSCTL helper and independently probe foreign write access through Win32 to require a real sharing/lock denial. The replacement test also verifies the foreign bytes survive rollback and replacement succeeds after the owned handle closes. An independent read-only review confirmed these corrections preserve the safety assertions; the successful rerun is recorded above. No native safety case was removed or skipped.

## Security boundary

Directory handles prevent rename while active, but a directory may acquire a reparse tag in place without changing its file ID. Parent checks reject an observed conversion. They do not provide an atomic transaction against arbitrary concurrent filesystem mutation by another process using the same account. Pause those writers throughout validation and normal operations. Complete Windows 11 desktop validation before promoting desktop support from experimental.

Private objects receive protected DACLs at creation (current user, SYSTEM and local administrators); installed public skills inherit destination permissions. Existing ACLs are not rewritten. Rollback preserves replaced/edited objects and foreign content it observes. Crash/power-loss recovery and arbitrary concurrent writers remain outside the guarantee on every platform.

Windows 11 桌面驗證完成前，請只用虛構資料。若原生執行失敗，保留失敗紀錄並修正，再重跑；不要放寬 reparse、路徑或權限防護來取得通過。
