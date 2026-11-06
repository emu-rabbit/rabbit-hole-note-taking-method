# Native Windows validation / Windows 原生驗證

Windows support remains experimental. 本次實作仍屬開發中，不能把 macOS 的通過或 Windows-only 的跳過當成 Windows 通過。

## Recorded evidence — 2026-11-06

- Host: macOS 15.3.1, Darwin 24.3.0, Apple arm64; CPython 3.13.18. The system Python 3.9 was below the supported minimum and is not the validation interpreter.
- `python -B scripts/validate-skills.py`: all five skills validated.
- `python -B -m unittest discover -s tests -p 'test_*.py' -v`: 111 tests, 89 passed, 22 native-Windows-only tests skipped.
- `npm run check`: 31 website tests passed; both language builds completed (56 notes each).
- Independent read-only security review covered both I/O backends, runtime, installer, rollback, rename ABI and private DACL construction. Review identified the in-place reparse detection gap; parent attributes are now checked before/after relative opens and during identity queries. Static review is not native execution evidence.

All workflow inputs are fictional. Tests exercise initialization, byte-preserving import/revisions/retries, integrity and link maintenance, and isolated five-skill installation. They do not install into the user's actual client directory. Tests do not open listening ports or stop services.

## Native checks still required

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

The proposed [Local skills workflow](skills-ci.example.yml) requests real Windows Server 2025 x64 runners with both interpreter versions, plus macOS and Linux checks. It is an inactive example: publishing it under `.github/workflows/skills.yml` was rejected by GitHub because the dedicated fmu credential lacks `workflow` scope. No credential permissions were changed and no native run was started. A repository maintainer can review and install it at that path. A configured workflow or queued run is not passing evidence. Server-runner results must be labeled as Server results; they do not establish Windows 11 desktop/client compatibility.

## Security boundary

Directory handles prevent rename while active, but a directory may acquire a reparse tag in place without changing its file ID. Parent checks reject an observed conversion. They do not provide an atomic transaction against arbitrary concurrent filesystem mutation by another process using the same account. Pause those writers throughout validation and normal operations. Complete native race checks before promoting Windows support from experimental.

Private objects receive protected DACLs at creation (current user, SYSTEM and local administrators); installed public skills inherit destination permissions. Existing ACLs are not rewritten. Rollback preserves replaced/edited objects and foreign content it observes. Crash/power-loss recovery and arbitrary concurrent writers remain outside the guarantee on every platform.

原生 Windows 測試完成前，請只用虛構資料。若原生執行失敗，保留失敗紀錄並修正，再重跑；不要放寬 reparse、路徑或權限防護來取得通過。
