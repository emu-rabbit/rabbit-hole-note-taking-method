"""Real Windows 11/NTFS security tests, never emulated by patching sys.platform.

Run with native x64 CPython 3.13 and 3.14:
    py -3.13 -B -m unittest discover -s tests -p 'test_*.py' -v

On macOS/Linux these cases are explicitly skipped, not reported as Windows passes.
All paths, junction targets, security descriptors and records are disposable.
"""
import contextlib
import ctypes
from ctypes import wintypes
import io
import json
import os
from pathlib import Path
import platform
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

from test_rabbit_hole_toolkit import RUNTIME, SCRIPT
from test_skill_packaging import installer

NATIVE_WINDOWS = sys.platform == 'win32' and os.name == 'nt'
ROOT = Path(__file__).resolve().parents[1]


def snapshot(root):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in root.rglob('*') if p.is_file()}


@unittest.skipUnless(NATIVE_WINDOWS, 'Requires real Windows 11 x64 CPython 3.13/3.14 on fixed NTFS')
class WindowsNativeIOTests(unittest.TestCase):
    def setUp(self):
        self.assertEqual(platform.python_implementation(), 'CPython')
        self.assertIn(sys.version_info[:2], ((3, 13), (3, 14)))
        self.assertEqual(ctypes.sizeof(ctypes.c_void_p), 8)
        self.assertIn(platform.machine().lower(), ('amd64', 'x86_64'))
        self.assertGreaterEqual(sys.getwindowsversion().build, 22000)
        self.temp = tempfile.TemporaryDirectory(prefix='rabbit-win-native-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / '中文 空白路徑'
        self.root.mkdir()
        self.vault = self.root / '私人 兔子洞'
        self.kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
        self.kernel32.GetDriveTypeW.argtypes = [wintypes.LPCWSTR]
        self.kernel32.GetDriveTypeW.restype = wintypes.UINT
        self.assertEqual(self.kernel32.GetDriveTypeW(self.root.anchor), 3, 'Tests require a local fixed volume')
        self.kernel32.GetVolumeInformationW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
            ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD),
            wintypes.LPWSTR, wintypes.DWORD]
        self.kernel32.GetVolumeInformationW.restype = wintypes.BOOL
        filesystem = ctypes.create_unicode_buffer(64)
        self.assertTrue(self.kernel32.GetVolumeInformationW(self.root.anchor, None, 0, None, None, None,
                                                          filesystem, len(filesystem)))
        self.assertEqual(filesystem.value, 'NTFS')

    def cli(self, *args, code=0):
        result = subprocess.run([sys.executable, '-B', str(SCRIPT), *map(str, args)],
                                capture_output=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return json.loads(result.stdout or result.stderr)

    def init(self):
        self.cli('init', '--vault', self.vault, '--name', '虛構 使用者', '--lang', 'zh-TW', '--apply')

    def source(self):
        path = self.root / '來源 記錄.json'
        path.write_text('[{"id":"one","text":"虛構原話"}]', encoding='utf-8', newline='\n')
        return path

    def import_args(self, source):
        return ['import', '--vault', str(self.vault), '--input', str(source), '--namespace', 'windows-native',
                '--owner', '虛構使用者', '--author', '虛構作者', '--apply']

    def direct_import(self, source):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return RUNTIME.main(self.import_args(source))

    def junction(self, link, target):
        # /J does not require Developer Mode or SeCreateSymbolicLinkPrivilege.
        # Only controlled temporary paths are interpolated, never source content.
        self.assertNotIn('"', str(link))
        self.assertNotIn('"', str(target))
        result = subprocess.run(['cmd.exe', '/d', '/c', f'mklink /J "{link}" "{target}"'],
                                capture_output=True, encoding='utf-8', errors='replace', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue(link.is_junction(), f'Expected a real NTFS junction at {link}')
        self.assertTrue(link.lstat().st_file_attributes & 0x400, 'Expected FILE_ATTRIBUTE_REPARSE_POINT')
        self.addCleanup(lambda: os.rmdir(link) if link.is_junction() else None)

    def reparse_in_place(self, directory, target):
        """Set a real mount-point tag without renaming/replacing the directory."""
        create = self.kernel32.CreateFileW
        create.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p,
                           wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
        create.restype = wintypes.HANDLE
        close = self.kernel32.CloseHandle
        close.argtypes, close.restype = [wintypes.HANDLE], wintypes.BOOL
        control = self.kernel32.DeviceIoControl
        control.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD,
                            ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD),
                            ctypes.c_void_p]
        control.restype = wintypes.BOOL
        substitute = ('\\??\\' + str(target)).encode('utf-16-le')
        display = str(target).encode('utf-16-le')
        paths = substitute + b'\0\0' + display + b'\0\0'
        raw = struct.pack('<IHHHHHH', 0xA0000003, 8 + len(paths), 0,
                          0, len(substitute), len(substitute) + 2, len(display)) + paths
        buffer, returned = ctypes.create_string_buffer(raw), wintypes.DWORD()
        handle = create(str(directory), 0x40000000, 7, None, 3, 0x02000000 | 0x00200000, None)
        self.assertNotEqual(handle, ctypes.c_void_p(-1).value, ctypes.get_last_error())
        try:
            self.assertTrue(control(handle, 0x900A4, buffer, len(raw), None, 0,
                                    ctypes.byref(returned), None), ctypes.get_last_error())
        finally:
            self.assertTrue(close(handle))
        self.assertTrue(directory.is_junction(), 'The native FSCTL must actually change the tag')
        self.addCleanup(lambda: os.rmdir(directory) if directory.is_junction() else None)

    def test_in_place_reparse_on_cached_directory_refuses_read_and_write(self):
        for newly_created in (False, True):
            with self.subTest(newly_created=newly_created):
                target = self.root / ('cached-' + str(newly_created))
                outside = self.root / ('outside-' + str(newly_created))
                outside.mkdir()
                (outside / 'foreign.txt').write_bytes(b'foreign bytes')
                if not newly_created:
                    target.mkdir()
                with RUNTIME.secure_io.Session() as session:
                    handle = session.mkdir_new(target) if newly_created else session.directory(target)
                    identity = target.lstat().st_ino
                    self.reparse_in_place(target, outside)
                    self.assertEqual(target.lstat().st_ino, identity)
                    with self.assertRaisesRegex(ValueError, 'Reparse'):
                        session.read(target / 'foreign.txt')
                    with self.assertRaisesRegex(ValueError, 'Reparse'):
                        session.write_new(target / 'private.txt', b'fictional private bytes')
                    with self.assertRaisesRegex(ValueError, 'Reparse'):
                        session.assert_visible(target)
                    session.rollback()
                self.assertEqual(snapshot(outside), {'foreign.txt': b'foreign bytes'})

    def test_in_place_reparse_before_import_refuses_ledger_commit(self):
        self.init()
        source = self.source()
        parent = next(self.vault.glob('80_*')) / 'imports'
        parent.mkdir()
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'foreign.txt').write_bytes(b'foreign bytes')
        original, changed = RUNTIME.write_new, []
        def convert_before_write(path, data):
            if path.parent == parent and not changed:
                RUNTIME.secure_io._ACTIVE.get().directory(parent)
                self.reparse_in_place(parent, outside)
                changed.append(True)
            return original(path, data)
        with mock.patch.object(RUNTIME, 'write_new', side_effect=convert_before_write):
            self.assertEqual(self.direct_import(source), 2)
        self.assertEqual(changed, [True])
        self.assertEqual(snapshot(outside), {'foreign.txt': b'foreign bytes'})
        ledger = json.loads(next(self.vault.glob('90_*/import-ledger.json')).read_text(encoding='utf-8'))
        self.assertEqual(ledger['records'], [])

    @contextlib.contextmanager
    def deny_sharing(self, path):
        create = self.kernel32.CreateFileW
        create.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.c_void_p,
                           wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
        create.restype = wintypes.HANDLE
        close = self.kernel32.CloseHandle
        close.argtypes = [wintypes.HANDLE]
        close.restype = wintypes.BOOL
        handle = create(str(path), 0x80000000, 0, None, 3, 0x80, None)
        self.assertNotEqual(handle, ctypes.c_void_p(-1).value, ctypes.get_last_error())
        try:
            yield
        finally:
            self.assertTrue(close(handle))

    def test_junction_ancestor_refuses_init_without_outside_writes(self):
        outside = self.root / 'outside'
        outside.mkdir()
        link = self.root / 'alias'
        self.junction(link, outside)
        for apply in (False, True):
            with self.subTest(apply=apply):
                self.cli('init', '--vault', link / 'vault', '--name', 'Test', '--lang', 'en',
                         *(['--apply'] if apply else []), code=2)
        self.assertEqual(list(outside.iterdir()), [])

    def test_junction_inside_vault_refuses_check_and_import(self):
        self.init()
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'private.txt').write_bytes(b'foreign bytes')
        self.junction(self.vault / 'escape', outside)
        before = snapshot(outside)
        self.cli('check', '--vault', self.vault, code=2)
        self.cli(*self.import_args(self.source()), code=2)
        self.assertEqual(snapshot(outside), before)
        self.assertFalse(list(self.vault.glob('80_*/imports/*.md')))

    def test_junction_input_ancestor_refuses_source_read(self):
        self.init()
        source = self.source()
        linked = self.root / 'source-alias'
        self.junction(linked, self.root)
        before = snapshot(self.vault)
        self.cli(*self.import_args(linked / source.name), code=2)
        self.assertEqual(snapshot(self.vault), before)

    def test_low_level_io_refuses_junction_parent(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'file.txt').write_bytes(b'outside')
        linked = self.root / 'alias'
        self.junction(linked, outside)
        with self.assertRaises((OSError, ValueError)):
            RUNTIME.read_bytes(linked / 'file.txt')
        with self.assertRaises((OSError, ValueError)):
            RUNTIME.write_new(linked / 'new.txt', b'private')
        self.assertEqual(snapshot(outside), {'file.txt': b'outside'})

    def test_late_junction_substitution_never_redirects_private_import(self):
        self.init()
        source = self.source()
        outside = self.root / 'outside'
        outside.mkdir()
        original = RUNTIME.write_new
        substituted = False
        def substitute(path, data):
            nonlocal substituted
            if path.parent.name == 'imports' and not substituted:
                self.assertFalse(path.parent.exists())
                self.junction(path.parent, outside)
                substituted = True
            return original(path, data)
        with mock.patch.object(RUNTIME, 'write_new', side_effect=substitute):
            self.assertEqual(self.direct_import(source), 2)
        self.assertTrue(substituted)
        self.assertEqual(list(outside.iterdir()), [])
        ledger = json.loads(next(self.vault.glob('90_*/import-ledger.json')).read_text(encoding='utf-8'))
        self.assertEqual(ledger['records'], [])

    def test_new_directory_handle_prevents_parent_rename(self):
        target = self.root / 'pinned directory'
        moved = self.root / 'moved directory'
        with RUNTIME.secure_io.Session() as session:
            session.mkdir_new(target)
            with self.assertRaises(PermissionError) as caught:
                target.rename(moved)
            self.assertIn(caught.exception.winerror, (32, 33))
            session.write_new(target / 'kept.txt', b'anchored bytes')
            self.assertEqual(session.read(target / 'kept.txt'), b'anchored bytes')
        self.assertFalse(moved.exists())

    def test_existing_parent_handle_blocks_rename_before_substitution(self):
        target = self.root / 'existing directory'
        target.mkdir()
        (target / 'existing.txt').write_bytes(b'foreign bytes')
        moved = self.root / 'moved directory'
        with RUNTIME.secure_io.Session() as session:
            session.directory(target)
            with self.assertRaises(PermissionError) as caught:
                target.rename(moved)
            self.assertIn(caught.exception.winerror, (32, 33))
            session.assert_visible(target)
        self.assertFalse(moved.exists())
        self.assertEqual((target / 'existing.txt').read_bytes(), b'foreign bytes')

    def test_open_created_file_prevents_foreign_replacement(self):
        owned = self.root / 'created.txt'
        foreign = self.root / 'foreign.txt'
        foreign.write_bytes(b'foreign bytes')
        with RUNTIME.secure_io.Session() as session:
            session.write_new(owned, b'transaction bytes')
            with self.assertRaises(PermissionError) as caught:
                os.replace(foreign, owned)
            self.assertIn(caught.exception.winerror, (32, 33))
            self.assertEqual(session.read(owned), b'transaction bytes')
            self.assertEqual(foreign.read_bytes(), b'foreign bytes')
            session.rollback()
        self.assertFalse(owned.exists())
        self.assertEqual(foreign.read_bytes(), b'foreign bytes')

    def test_source_sharing_violation_fails_cleanly_and_retry_works(self):
        self.init()
        source = self.source()
        before = snapshot(self.vault)
        with self.deny_sharing(source):
            self.cli(*self.import_args(source), code=2)
        self.assertEqual(snapshot(self.vault), before)
        self.assertEqual(self.cli(*self.import_args(source))['added_revisions'], 1)

    def test_ledger_sharing_violation_never_partially_commits(self):
        self.init()
        source = self.source()
        ledger = next(self.vault.glob('90_*/import-ledger.json'))
        before = snapshot(self.vault)
        with self.deny_sharing(ledger):
            self.cli(*self.import_args(source), code=2)
        self.assertEqual(snapshot(self.vault), before)
        self.assertEqual(self.cli(*self.import_args(source))['added_revisions'], 1)
        self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])

    def test_created_vault_and_artifacts_have_protected_private_dacl(self):
        self.init()
        self.cli(*self.import_args(self.source()))
        powershell = shutil.which('powershell.exe')
        self.assertIsNotNone(powershell, 'Windows PowerShell is needed to inspect the actual DACL')
        script = r'''
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$result = @(Get-Item -LiteralPath $env:RABBIT_TEST_VAULT; Get-ChildItem -LiteralPath $env:RABBIT_TEST_VAULT -Recurse -Force) | ForEach-Object {
  $acl = Get-Acl -LiteralPath $_.FullName
  $aces = @($acl.Access | ForEach-Object {
    @{ Sid = $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;
       Type = $_.AccessControlType.ToString(); Inherited = $_.IsInherited;
       Rights = [int]$_.FileSystemRights }
  })
  @{ Path = $_.FullName; Protected = $acl.AreAccessRulesProtected; Aces = $aces }
}
@{ Me = $me; Entries = @($result) } | ConvertTo-Json -Depth 6 -Compress
'''
        environment = dict(os.environ, RABBIT_TEST_VAULT=str(self.vault))
        result = subprocess.run([powershell, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
                                env=environment, capture_output=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout.lstrip('\ufeff'))
        allowed_sids = {report['Me'], 'S-1-5-18', 'S-1-5-32-544'}  # Owner, SYSTEM, local administrators.
        self.assertGreater(len(report['Entries']), 7)
        for item in report['Entries']:
            with self.subTest(path=item['Path']):
                self.assertTrue(item['Protected'], 'A parent ACL must not broaden private-vault access')
                self.assertTrue(item['Aces'], 'A null/empty ACL must not pass as owner protection')
                allowed = [ace for ace in item['Aces'] if ace['Type'] == 'Allow']
                self.assertIn(report['Me'], {ace['Sid'] for ace in allowed})
                self.assertTrue(all(ace['Sid'] in allowed_sids for ace in allowed), item)
                self.assertTrue(all(not ace['Inherited'] for ace in item['Aces']), item)

    def make_bundle(self):
        source = self.root / '技能 來源'
        for name in installer.SKILLS:
            shutil.copytree(ROOT / 'skills' / name, source / name,
                            ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '*.pyo'))
        return source

    def install(self, source, destination):
        with contextlib.redirect_stdout(io.StringIO()):
            installer.install(source, destination, True)

    def test_installer_rejects_source_and_destination_junctions(self):
        source = self.make_bundle()
        outside = self.root / 'outside'
        outside.mkdir()
        destination_alias = self.root / 'destination-alias'
        self.junction(destination_alias, outside)
        with self.assertRaises((ValueError, OSError)):
            self.install(source, destination_alias / 'skills')
        self.assertEqual(list(outside.iterdir()), [])
        self.junction(source / installer.SKILLS[-1] / 'reparse-reference', outside)
        destination = self.root / 'installed'
        with self.assertRaises((ValueError, OSError)):
            self.install(source, destination)
        self.assertFalse(destination.exists())

    def test_native_cli_rejects_ads_devices_and_alias_names_before_mutation(self):
        for name in ('README:stream', 'file.txt::$DATA', 'NUL', 'con.txt', 'COM1.md',
                     'LPT²', 'trailing.', 'trailing '):
            with self.subTest(name=name):
                before = snapshot(self.root)
                self.cli('init', '--vault', str(self.root) + '\\' + name, '--name', 'Test',
                         '--lang', 'en', '--apply', code=2)
                self.assertEqual(snapshot(self.root), before)
                self.assertEqual(list(self.root.iterdir()), [])

    def test_case_insensitive_legacy_skill_is_never_ignored(self):
        source = self.make_bundle()
        destination = self.root / 'installed'
        legacy = destination / installer.validation.LEGACY_SKILLS[0].upper()
        legacy.mkdir(parents=True)
        (legacy / 'keep.txt').write_bytes(b'legacy customization')
        before = snapshot(destination)
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install(source, destination)
        self.assertEqual(snapshot(destination), before)
        self.assertEqual(list(destination.iterdir()), [legacy])

    def test_case_insensitive_skill_collision_never_overwrites(self):
        source = self.make_bundle()
        destination = self.root / 'installed'
        collision = destination / installer.SKILLS[-1].upper()
        collision.mkdir(parents=True)
        (collision / 'keep.txt').write_bytes(b'foreign customization')
        before = snapshot(destination)
        with self.assertRaises((ValueError, OSError)):
            self.install(source, destination)
        self.assertEqual(snapshot(destination), before)
        self.assertEqual(list(destination.iterdir()), [collision])

    def test_case_insensitive_unique_wiki_basename_and_heading_resolve(self):
        self.init()
        folder = self.vault / 'Subdirectory'
        folder.mkdir()
        (folder / 'Note.md').write_text('# Heading\n', encoding='utf-8', newline='\n')
        (self.vault / 'links.md').write_text('[[note#Heading]]\n', encoding='utf-8', newline='\n')
        before = snapshot(self.vault)
        self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])
        self.assertEqual(snapshot(self.vault), before)

    def test_case_insensitive_publication_refuses_existing_file(self):
        existing = self.root / 'Existing.MD'
        existing.write_bytes(b'foreign content')
        with self.assertRaises((ValueError, OSError)):
            RUNTIME.write_new(self.root / 'existing.md', b'replacement')
        self.assertEqual(existing.read_bytes(), b'foreign content')

    def test_cached_import_and_raw_parents_cannot_move_before_ledger_commit(self):
        for kind in ('imports', 'raw'):
            with self.subTest(kind=kind):
                self.vault = self.root / ('vault-' + kind)
                self.init()
                source = self.source()
                self.cli(*self.import_args(source))
                before = snapshot(self.vault)
                source.write_text('[{"id":"two","text":"第二句虛構原話"}]', encoding='utf-8', newline='\n')
                parent = next(self.vault.glob('80_*/imports' if kind == 'imports' else '90_*/raw'))
                moved = self.root / ('moved-' + kind)
                original = RUNTIME.write_new
                blocked = []
                def attempt_move(path, data):
                    result = original(path, data)
                    if path.suffix == '.new':
                        with self.assertRaises(PermissionError) as caught:
                            parent.rename(moved)
                        self.assertIn(caught.exception.winerror, (32, 33))
                        blocked.append(True)
                        raise OSError('stop after checking protected commit boundary')
                    return result
                with mock.patch.object(RUNTIME, 'write_new', side_effect=attempt_move):
                    self.assertEqual(self.direct_import(source), 2)
                self.assertEqual(blocked, [True])
                self.assertFalse(moved.exists())
                self.assertEqual(snapshot(self.vault), before)
                self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])

    def test_import_rollback_preserves_concurrent_edit_or_refuses_it_and_keeps_foreign_file(self):
        self.init()
        source = self.source()
        foreign = []
        edited = []
        def replace_failure(session, source_path, destination_path):
            note = next(self.vault.glob('80_*/imports/*.md'))
            try:
                note.write_bytes(b'concurrent replacement')
            except PermissionError as error:
                self.assertIn(error.winerror, (32, 33), 'Only a real sharing/lock violation is expected')
                edited.append(False)
            else:
                edited.append(True)
            other = note.parent / 'foreign.md'
            other.write_bytes(b'foreign new file')
            foreign.extend((note, other))
            raise OSError('simulated failure at native commit boundary')
        with mock.patch.object(RUNTIME.secure_io.Session, 'replace', new=replace_failure):
            self.assertEqual(self.direct_import(source), 2)
        self.assertEqual(len(foreign), 2)
        self.assertEqual(len(edited), 1)
        if edited[0]:
            self.assertEqual(foreign[0].read_bytes(), b'concurrent replacement')
        else:
            self.assertFalse(foreign[0].exists(), 'Unchanged transaction-owned file should roll back')
        self.assertEqual(foreign[1].read_bytes(), b'foreign new file')
        ledger = json.loads(next(self.vault.glob('90_*/import-ledger.json')).read_text(encoding='utf-8'))
        self.assertEqual(ledger['records'], [])

    def test_installer_rollback_preserves_foreign_file(self):
        source = self.make_bundle()
        destination = self.root / 'installed'
        foreign = destination / installer.SKILLS[0] / 'foreign.txt'
        original = installer.secure_io.Session.write_new
        def fail_last(session, path, data):
            if path.name == 'SKILL.md' and path.parent.name == 'rabbit-hole-start':
                self.assertTrue((destination / 'rabbit-hole-import' / 'SKILL.md').exists())
                foreign.write_bytes(b'foreign bytes')
                raise OSError('simulated write failure')
            return original(session, path, data)
        with mock.patch.object(installer.secure_io.Session, 'write_new', new=fail_last):
            with self.assertRaises((ValueError, OSError)):
                self.install(source, destination)
        self.assertEqual(foreign.read_bytes(), b'foreign bytes')
        self.assertEqual(snapshot(destination), {f'{installer.SKILLS[0]}/foreign.txt': b'foreign bytes'})


if __name__ == '__main__':
    unittest.main()
