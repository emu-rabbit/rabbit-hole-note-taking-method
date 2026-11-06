"""Regression checks on actual, fully fictional natural-request outputs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/natural-workflow'
VAULT = FIXTURE / 'vault'
COPY = FIXTURE / 'reading-copy'
SCRIPT = ROOT / 'skills/rabbit-hole-start/scripts/rabbit_hole.py'
spec = importlib.util.spec_from_file_location('natural_workflow_core', SCRIPT)
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


def contents(root):
    return {p.relative_to(root): p.read_bytes() for p in root.rglob('*') if p.is_file()}


class NaturalWorkflowOutputTests(unittest.TestCase):
    def test_master_and_reading_copy_have_valid_targets_and_no_host_paths(self):
        for root, kind in ((VAULT, 'managed'), (COPY, 'unmanaged')):
            report = core.check(SimpleNamespace(vault=str(root)))
            self.assertTrue(report['ok'], report['issues'])
            self.assertEqual(report['vault_kind'], kind)
            for path, data in contents(root).items():
                self.assertNotIn(b'/private/tmp/', data, path)
                self.assertNotIn(b'/Users/', data, path)
        self.assertEqual(core.check(SimpleNamespace(vault=str(VAULT)))['ledger_status'], 'validated')

    def test_saved_source_text_matches_exact_supplied_posts(self):
        raw = (FIXTURE / 'selected-posts.json').read_bytes()
        expected = {item['id']: item for item in json.loads(raw)}
        rows = json.loads((VAULT / '90_Maintenance/import-ledger.json').read_text())['records']
        self.assertEqual({row['source_id'] for row in rows}, set(expected))
        self.assertEqual(len(rows), len(expected))
        for row in rows:
            text = (VAULT / row['note']).read_text()
            quote = re.search(r'^(`{3,})text\n(.*?)\n\1\s*$', text, re.M | re.S)
            self.assertIsNotNone(quote)
            self.assertEqual(quote[2], expected[row['source_id']]['text'])
            self.assertEqual(row['author'], expected[row['source_id']]['author'])
            self.assertEqual((VAULT / row['original']).read_bytes(), raw)
            self.assertEqual(row['original_hash'], hashlib.sha256(raw).hexdigest())

    def test_reimport_preserves_the_complete_worked_vault(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp).resolve() / 'vault'
            shutil.copytree(VAULT, target)
            before = contents(target)
            result = subprocess.run([sys.executable, '-B', str(SCRIPT), 'import', '--vault', str(target),
                                     '--input', str(FIXTURE / 'selected-posts.json'), '--namespace',
                                     'rowan-selected-posts', '--owner', 'Rowan', '--author', 'Rowan', '--apply'],
                                    capture_output=True, text=True, check=True)
            report = json.loads(result.stdout)
            self.assertEqual(report['skipped_records'], 3)
            self.assertEqual(report['added_revisions'], 0)
            self.assertEqual(before, contents(target))

    def test_reading_copy_is_the_selected_independent_draft(self):
        files = contents(COPY)
        self.assertEqual({p.as_posix() for p in files}, {
            'README.md', 'The moving-home story.md', 'Sources/Selected excerpts.md'})
        text = '\n'.join(data.decode() for data in files.values())
        self.assertIsNone(re.search(r'\bKit\b', text))
        self.assertNotIn('called my mum twice', text)
        self.assertNotIn('stayed on the phone', text)
        self.assertNotIn('import-ledger', text)
        self.assertNotIn('../vault/', text)
        self.assertIn('a school friend', text)
        self.assertIn('not been sent or published', text)
        self.assertIn('not the full source records', text)


if __name__ == '__main__':
    unittest.main()
