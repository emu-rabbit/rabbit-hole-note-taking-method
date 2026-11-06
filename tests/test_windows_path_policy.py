"""Pure Windows path-policy tests, runnable anywhere without Windows API mocks.

Passing these tests proves lexical validation only, never native Windows I/O.
"""
import ctypes
import importlib.util
from pathlib import Path, PureWindowsPath
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / 'skills/rabbit-hole-start/scripts/_windows_io.py'
spec = importlib.util.spec_from_file_location('windows_path_policy', SCRIPT)
windows = importlib.util.module_from_spec(spec)
spec.loader.exec_module(windows)


class WindowsPathPolicyTests(unittest.TestCase):
    def test_ordinary_drive_unicode_spaces_and_relative_home_paths(self):
        cases = [
            (r'C:\Users\Test User\中文 兔子洞', {}, r'C:\Users\Test User\中文 兔子洞'),
            ('D:/資料/私人 筆記', {}, r'D:\資料\私人 筆記'),
            ('私人 筆記', {'cwd': r'C:\Users\Test User'}, r'C:\Users\Test User\私人 筆記'),
            ('~/skills', {'home': r'C:\Users\Test User'}, r'C:\Users\Test User\skills'),
            ('C:\\', {}, 'C:\\'),
        ]
        for value, options, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(windows.validate_windows_path(value, **options), PureWindowsPath(expected))

    def test_unc_device_extended_and_drive_relative_paths_are_rejected_lexically(self):
        rejected = [r'\\server\share\private', r'//server/share/private', r'\\?\C:\private',
                    r'\\.\C:\private', r'\\?\UNC\server\share', r'\??\C:\private',
                    r'\Device\HarddiskVolume1\private', r'\private', 'C:', 'C:private',
                    'C:/private/../outside', 'C:/private/./note', '..\\outside', '.\\note',
                    '~someone/private', '', b'C:\\private', 'C:/private\x00.txt']
        # No native object is instantiated. Even accidental filesystem probing fails.
        with mock.patch.object(windows.os, 'stat', side_effect=AssertionError('unexpected filesystem lookup')):
            for value in rejected:
                with self.subTest(value=value):
                    with self.assertRaises((ValueError, TypeError)):
                        windows.validate_windows_path(value, cwd='C:/safe')

    def test_ads_reserved_devices_trailing_aliases_and_invalid_names_are_rejected(self):
        names = ['', '.', '..', 'file.txt:private', 'README:stream', 'file::$DATA',
                 'CON', 'con.txt', 'NUL.json', 'PRN', 'AUX.md', 'CLOCK$', 'CONIN$', 'CONOUT$',
                 'COM1', 'com9.log', 'LPT1.txt', 'lpt9', 'COM¹', 'LPT².md', 'COM³.txt',
                 'tail.', 'tail ', 'unsafe/name', r'unsafe\name', 'a<b', 'a>b', 'a"b',
                 'a|b', 'a?b', 'a*b', '\x1f', '\ud800', 'x' * 256, '🐇' * 128]
        for name in names:
            with self.subTest(name=repr(name)):
                with self.assertRaises(ValueError):
                    windows.validate_component(name)
                if name and name not in ('.', '..') and '/' not in name and '\\' not in name:
                    with self.assertRaises(ValueError):
                        windows.validate_windows_path('C:/safe/' + name)

    def test_non_reserved_similar_names_and_utf16_length_boundary_are_allowed(self):
        for name in ['console.md', 'NUL-safe', 'COM0', 'COM10.txt', 'LPT0', 'LPT10',
                     '.rabbit-hole.json', '來源 原話.md', 'x' * 255, '🐇' * 127 + 'x']:
            with self.subTest(name=name):
                self.assertEqual(windows.validate_component(name), name)

    def test_x64_abi_layout_is_fixed_width_without_claiming_native_execution(self):
        if ctypes.sizeof(ctypes.c_void_p) != 8:
            self.skipTest('Layout assertions are for a 64-bit host only')
        self.assertEqual(ctypes.sizeof(windows.UNICODE_STRING), 16)
        self.assertEqual(ctypes.sizeof(windows.OBJECT_ATTRIBUTES), 48)
        self.assertEqual(ctypes.sizeof(windows.IO_STATUS_BLOCK), 16)
        self.assertEqual(windows.RENAME_INFO.FileName.offset, 20)
        self.assertEqual(windows.DIRECTORY_INFO.FileName.offset, 104)


if __name__ == '__main__':
    unittest.main()
