"""Portable byte-preservation checks using exclusively fictional local data."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from test_rabbit_hole_toolkit import RUNTIME, SCRIPT

ROOT = Path(__file__).resolve().parents[1]


def files(root, exclude=()):
    return {p.relative_to(root).as_posix(): p.read_bytes()
            for p in root.rglob('*') if p.is_file() and p.relative_to(root).as_posix() not in exclude}


class CrossPlatformBytesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='rabbit-portable-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / '中文 空白路徑'
        self.root.mkdir()
        self.vault = self.root / '私人 筆記'

    def cli(self, *args, code=0):
        result = subprocess.run([sys.executable, '-B', str(SCRIPT), *map(str, args)],
                                capture_output=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return json.loads(result.stdout or result.stderr)

    def init(self):
        self.cli('init', '--vault', self.vault, '--name', '虛構 使用者', '--lang', 'zh-TW', '--apply')

    def import_args(self, path):
        return ['import', '--vault', str(self.vault), '--input', str(path), '--namespace',
                'portable-test', '--owner', '虛構 使用者', '--author', '虛構 作者', '--apply']

    def test_utf8_bom_crlf_original_bytes_survive_all_supported_formats(self):
        self.init()
        cases = {
            '文字 記錄.txt': b'\xef\xbb\xbf' + '第一行\r\n第二行\r\n'.encode('utf-8'),
            '筆記 記錄.md': b'\xef\xbb\xbf' + '# 標題\r\n\r\n原話\r\n'.encode('utf-8'),
            '正規化 記錄.json': b'\xef\xbb\xbf' + '[\r\n {"id":"j1","text":"原話\\r\\n第二行"}\r\n]\r\n'.encode('utf-8'),
            '逐行 記錄.jsonl': b'\xef\xbb\xbf' + '{"id":"l1","text":"另一句原話"}\r\n\r\n'.encode('utf-8'),
        }
        for name, raw in cases.items():
            with self.subTest(name=name):
                source = self.root / name
                source.write_bytes(raw)
                report = self.cli(*self.import_args(source))
                self.assertEqual(report['added_revisions'], 1)
                ledger = json.loads(next(self.vault.glob('90_*/import-ledger.json')).read_text(encoding='utf-8'))
                row = ledger['records'][-1]
                self.assertEqual(row['original_hash'], hashlib.sha256(raw).hexdigest())
                self.assertEqual((self.vault / row['original']).read_bytes(), raw)
                self.assertEqual(source.read_bytes(), raw)
                before = files(self.vault)
                self.assertEqual(self.cli(*self.import_args(source))['skipped_records'], 1)
                self.assertEqual(files(self.vault), before)
        self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])

    def test_invalid_utf8_refused_without_mutation(self):
        self.init()
        before = files(self.vault)
        source = self.root / '不合法.txt'
        source.write_bytes(b'private fictional source\xff\xfe')
        report = self.cli(*self.import_args(source), code=2)
        self.assertNotIn('private fictional source', json.dumps(report))
        self.assertEqual(files(self.vault), before)

    def test_exclusive_publication_never_overwrites_existing_bytes(self):
        destination = self.root / '原本 已存在.md'
        destination.write_bytes(b'foreign content\r\n')
        with self.assertRaises((OSError, ValueError)):
            RUNTIME.write_new(destination, b'replacement')
        self.assertEqual(destination.read_bytes(), b'foreign content\r\n')
        self.assertEqual(sorted(p.name for p in self.root.iterdir()), [destination.name])

    def test_held_import_lock_refuses_mutation_then_retry_succeeds(self):
        self.init()
        source = self.root / '匯入.json'
        source.write_text('[{"id":"one","text":"虛構原話"}]', encoding='utf-8', newline='\n')
        ledger = next(self.vault.glob('90_*/import-ledger.json'))
        lock = ledger.with_suffix('.lock')
        with RUNTIME.import_lock(lock):
            # A real Windows exclusive lock is intentionally unreadable to a second opener.
            excluded = {lock.relative_to(self.vault).as_posix()}
            before = files(self.vault, exclude=excluded)
            self.cli(*self.import_args(source), code=2)
            self.assertEqual(files(self.vault, exclude=excluded), before)
            self.assertTrue(lock.exists())
        self.assertFalse(lock.exists())
        self.assertEqual(self.cli(*self.import_args(source))['added_revisions'], 1)
        self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])

    def test_parallel_imports_and_retries_never_lose_ledger_entries(self):
        self.init()
        sources = []
        processes = []
        for index in range(4):
            path = self.root / f'平行 {index}.json'
            path.write_text(json.dumps([{'id': f'parallel-{index}', 'text': f'虛構來源 {index}'}],
                                       ensure_ascii=False), encoding='utf-8', newline='\n')
            sources.append(path)
            processes.append(subprocess.Popen([sys.executable, '-B', str(SCRIPT), *self.import_args(path)],
                                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding='utf-8'))
        try:
            results = []
            for process in processes:
                stdout, stderr = process.communicate(timeout=30)
                self.assertIn(process.returncode, (0, 2), stdout + stderr)
                results.append(process.returncode)
            self.assertIn(0, results)
        finally:
            for process in processes:
                if process.poll() is None:
                    process.kill()
                process.communicate()
        # A refused competing import is retried explicitly, never silently dropped.
        for source in sources:
            self.cli(*self.import_args(source))
        ledger = json.loads(next(self.vault.glob('90_*/import-ledger.json')).read_text(encoding='utf-8'))
        self.assertEqual({r['source_id'] for r in ledger['records']}, {f'parallel-{i}' for i in range(4)})
        self.assertEqual(len(ledger['records']), 4)
        self.assertTrue(self.cli('check', '--vault', self.vault)['ok'])
        self.assertFalse(list(self.vault.rglob('*.lock')))
        self.assertFalse(list(self.vault.rglob('*.new')))
        self.assertFalse(list(self.vault.rglob('.rabbit-hole-*')))

    def test_cli_overrides_legacy_console_encoding_for_unicode_json(self):
        environment = dict(os.environ, PYTHONUTF8='0', PYTHONIOENCODING='cp1252')
        result = subprocess.run([sys.executable, '-B', str(SCRIPT), 'init', '--vault', str(self.vault),
                                 '--name', '虛構 使用者', '--lang', 'zh-TW'], env=environment,
                                capture_output=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('00_入口/Start.md', json.loads(result.stdout)['files'])
        self.assertFalse(self.vault.exists())

    @unittest.skipIf(os.name == 'nt', 'Windows denies replacing a held new file; covered in native tests')
    def test_rollback_keeps_replacement_even_when_foreign_bytes_match(self):
        owned = self.root / 'owned.txt'
        foreign = self.root / 'foreign.txt'
        with RUNTIME.secure_io.Session() as session:
            session.write_new(owned, b'same bytes')
            original_identity = owned.stat().st_ino
            foreign.write_bytes(b'same bytes')
            foreign.replace(owned)
            self.assertNotEqual(owned.stat().st_ino, original_identity)
            session.rollback()
        self.assertEqual(owned.read_bytes(), b'same bytes')

    @unittest.skipUnless(shutil.which('git'), 'Git is needed to exercise real checkout normalization')
    def test_autocrlf_checkout_preserves_fixture_bytes_and_normalizes_code(self):
        repo = self.root / 'temporary git repository'
        repo.mkdir()
        (repo / '.gitattributes').write_bytes((ROOT / '.gitattributes').read_bytes())
        fixture = repo / 'tests' / 'fixtures' / 'fictional'
        fixture.mkdir(parents=True)
        examples = {'raw.bin': b'\x00\xff\r\n',
                    'source.json': b'\xef\xbb\xbf[\r\n{"text":"fictional"}\r\n]\r\n',
                    'note.md': '# 原話\r\n\r\n虛構內容\r\n'.encode('utf-8')}
        for name, data in examples.items():
            (fixture / name).write_bytes(data)
        code = repo / 'script.py'
        code.write_bytes(b'print("fictional")\n')
        def git(*args):
            return subprocess.run(['git', '-c', 'core.autocrlf=true', *args], cwd=repo,
                                  check=True, capture_output=True, timeout=30)
        git('init', '-q')
        git('add', '.')
        for path in [code, *(fixture / name for name in examples)]:
            path.unlink()
        git('checkout-index', '--all', '--force')
        self.assertEqual(code.read_bytes(), b'print("fictional")\n')
        for name, raw in examples.items():
            with self.subTest(name=name):
                self.assertEqual((fixture / name).read_bytes(), raw)
                self.assertEqual(git('show', ':tests/fixtures/fictional/' + name).stdout, raw)


if __name__ == '__main__':
    unittest.main()
