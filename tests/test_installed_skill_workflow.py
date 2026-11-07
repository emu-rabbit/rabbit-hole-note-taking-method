"""Run the actual installed five-skill bundle using fictional, disposable data."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class InstalledSkillWorkflowTests(unittest.TestCase):
    def cli(self, script, *args, code=0):
        result = subprocess.run([sys.executable, '-B', str(script), *map(str, args)],
                                capture_output=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result

    def test_actual_isolated_install_init_import_and_maintenance_in_both_languages(self):
        with tempfile.TemporaryDirectory(prefix='rabbit-installed-workflow-') as temporary:
            root = Path(temporary).resolve() / '中文 空白路徑'
            root.mkdir()
            destination = root / '技能 安裝'
            installer = ROOT / 'scripts/install-skills.py'
            self.cli(installer, '--dest', destination)
            self.assertFalse(destination.exists())
            self.cli(installer, '--dest', destination, '--apply')
            self.assertEqual(len(list(destination.glob('*/SKILL.md'))), 5)
            self.assertEqual(list(destination.rglob('method.*.md')), [])
            # All local references must resolve inside the copied five-skill bundle.
            tool = destination / 'rabbit-hole-start/scripts/rabbit_hole.py'
            source = root / '虛構 原話.txt'
            original = b'\xef\xbb\xbf' + '第一行\r\n第二行\r\n'.encode('utf-8')
            source.write_bytes(original)
            for language in ('en', 'zh-TW'):
                with self.subTest(language=language):
                    vault = root / language
                    init = ['init', '--vault', vault, '--name', 'Fictional 測試', '--lang', language]
                    self.cli(tool, *init)
                    self.assertFalse(vault.exists())
                    self.cli(tool, *init, '--apply')
                    generated = '\n'.join(p.read_text(encoding='utf-8') for p in vault.rglob('*.md'))
                    self.assertNotIn('## 兔子洞結構', generated)
                    self.assertNotIn('## Rabbit hole structure', generated)
                    self.assertFalse(any('method' in p.name.lower() for p in vault.rglob('*.md')))
                    args = ['import', '--vault', vault, '--input', source, '--namespace',
                            'installed-fictional', '--owner', 'Fictional', '--author',
                            'Fictional', '--source-id', 'one', '--apply']
                    self.assertEqual(json.loads(self.cli(tool, *args).stdout)['added_revisions'], 1)
                    before = {p.relative_to(vault): p.read_bytes()
                              for p in vault.rglob('*') if p.is_file()}
                    self.assertEqual(json.loads(self.cli(tool, *args).stdout)['skipped_records'], 1)
                    self.assertTrue(json.loads(self.cli(tool, 'check', '--vault', vault).stdout)['ok'])
                    self.assertEqual({p.relative_to(vault): p.read_bytes()
                                      for p in vault.rglob('*') if p.is_file()}, before)
                    ledger = json.loads(next(vault.glob('90_*/import-ledger.json')).read_bytes())
                    record = ledger['records'][0]
                    self.assertEqual((vault / record['original']).read_bytes(), original)
                    self.assertEqual(record['original_hash'], hashlib.sha256(original).hexdigest())
            installed = {p.relative_to(destination): p.read_bytes()
                         for p in destination.rglob('*') if p.is_file()}
            self.cli(installer, '--dest', destination, '--apply', code=1)
            self.assertEqual({p.relative_to(destination): p.read_bytes()
                              for p in destination.rglob('*') if p.is_file()}, installed)
            self.assertEqual(source.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
