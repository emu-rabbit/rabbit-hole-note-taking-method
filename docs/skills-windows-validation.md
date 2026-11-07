# Windows 驗證紀錄 / Windows validation

Windows、macOS 與 Linux 都是已驗證的正式支援平台。2026-11-07，維護者確認 Windows skills 已完成實機驗證，並將 Windows 與另兩個平台並列為正式版本。使用條件見 [CLI 平台範圍](../skills/rabbit-hole-start/references/cli.md#platform-scope)。

Windows is a verified, officially supported platform alongside macOS and Linux. This record distinguishes the maintainer's native Windows report from CI jobs and local macOS checks; it does not present one as another.

## 維護者的實機驗證 / Maintainer-reported validation — 2026-11-07

[PR #8](https://github.com/emu-rabbit/rabbit-hole-notes/pull/8), merged as `fcab0d44ce0286c986edc4e0feb81525ed6d1929`, records native Windows verification with **CPython 3.14.10 x64**:

- All five skill packages validated.
- The Python suite ran 114 tests with 11 platform skips.
- All 31 website tests passed.

這些是維護者回報的實機結果，不是本次文件整理另行重跑的 Windows 測試。PR 未記錄 Windows 版本／OS build、帳戶權限或客戶端技能載入的單獨結果；本文件不補造這些細節。

These results were reported by the maintainer. The PR does not record the Windows edition/build, account privilege level or a separate client-discovery result. No values are inferred for those fields.

## #8 的修正 / Corrections in #8

The current checker:

- Recognizes escaped Wiki aliases in Obsidian tables, including `[[Topics/example.io\|Label]]`, with heading and block references.
- Resolves dotted Markdown note names when `.md` is omitted, while preserving exact existing attachment targets and path-safety checks.
- Skips note bodies in top-level `90` and `90_*` folders by default. `--include-maintenance` includes them in the scan. Incoming links and anchors, import ledgers and source integrity remain checked; skipped maintenance folders are not a privacy boundary.

Positive and negative regression cases cover both language layouts, missing notes/anchors and unsafe paths. This is checker coverage, not a claim that every Obsidian interface interaction or client has been tested.

## Native Windows Server CI — 2026-11-07

Successful [run 42332555442](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42332555442) tested PR #8 head `ab187afed569d3941573a02817003a0311e80a22` on **Windows Server 2025 x64, OS 10.0.26100, local fixed NTFS**. The downloaded job logs record:

| Interpreter | Result | Native security cases | Job log |
| --- | --- | --- | --- |
| CPython 3.13.17 AMD64 | 114 total: 103 passed, 11 POSIX-only skipped | 22 passed, zero skipped | [3.13](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42332555442/job/128282130644) |
| CPython 3.14.10 AMD64 | 114 total: 103 passed, 11 POSIX-only skipped | 22 passed, zero skipped | [3.14](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42332555442/job/128282130878) |

The suite exercises actual isolated five-skill installation; both-language initialization, import/reimport and integrity checks; Unicode paths and UTF-8/BOM/CRLF byte preservation; junction and in-place FSCTL conversion; directory pinning, rename, protected DACLs, sharing failures and rollback preserving foreign content. These jobs use real Windows APIs, not WSL or a mocked platform. Their account is `runneradmin`, distinct from the maintainer's separately reported machine.

The [Windows skills workflow](../.github/workflows/skills.yml) runs on relevant PRs to `main`, uses only `contents: read`, and fails if native cases are missing or skipped. The separate [Pages workflow](../.github/workflows/pages.yml) builds and publishes the website from `main`; it does not replace local website tests.

## Reproduce the checks

Use the supported interpreter and a local checkout. These commands use disposable fictional fixtures, not a personal vault or the client's installed skills directory:

```powershell
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
py -3.14 -c "import platform, sys; print(platform.platform()); print(sys.version)"
py -3.14 -B scripts/validate-skills.py
py -3.14 -B -m unittest discover -s tests -p 'test_*.py' -v
npm.cmd run check
```

Use `py -3.13` for the other supported interpreter. Website checks require Node.js 22+. Record the actual platform, interpreter and results when reporting a new run; a skipped native case is not a Windows pass.

## Local documentation checks — 2026-11-07

The documentation pass on 2026-11-07 used **macOS 15.3.1 arm64, CPython 3.13.18 and Node.js 24.4.1**: all five skill packages validated; 114 Python tests ran with 92 passed and 22 Windows-only skipped; all 31 website tests passed and both 56-note editions built. This is a local macOS recheck, separate from the maintainer's native Windows report and the Server CI above.

## Earlier evidence

- **2026-11-06, macOS 15.3.1 arm64 / CPython 3.13.18:** 112 Python tests, 90 passed and 22 Windows-only skipped; five-skill validation and all 31 website tests passed. Both public editions built with 56 notes each. A separate isolated-install smoke run exercised both languages and preserved original bytes. These are macOS results.
- **2026-11-06, Windows Server 2025:** [run 42236279920](https://github.com/emu-rabbit/rabbit-hole-notes/actions/runs/42236279920) tested final PR #7 head `328766d`. Each interpreter ran 112 tests: 101 passed, 11 POSIX-only skipped, with all 22 native security cases passing.
- The initial #7 run exposed junction-fixture shell quoting and CRT/Win32 error-reporting assumptions. The [correction](https://github.com/emu-rabbit/rabbit-hole-notes/commit/45a7f1c0a9881d5c550199097e42c4275a138d02) uses real FSCTL fixtures and direct Win32 sharing-denial probes. Independent code review confirmed the assertions remained intact; no safety case was removed to obtain a passing run.

## Safety scope

Across platforms, pause other writers during an operation. Directory handles, reparse checks and rollback do not provide an atomic transaction against arbitrary changes by another process using the same account. Rollback preserves replaced or edited objects and foreign content it observes; process termination and power-loss recovery are not guaranteed.

New private Windows objects receive protected DACLs for the current user, SYSTEM and local administrators. Installed public skills inherit destination permissions; existing ACLs are not rewritten. Structural checks do not establish narrative truth, anonymity or permission to share.
