"""Check the published synthetic snapshot's evidence and navigable structure."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import unittest
from types import SimpleNamespace

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/deep-evaluation'
VAULT = FIXTURE / 'vault'
spec = importlib.util.spec_from_file_location('rabbit_evaluation', ROOT / 'skills/rabbit-hole-start/scripts/rabbit_hole.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

class PublishedEvaluationTests(unittest.TestCase):
    def test_reader_snapshot_has_valid_structure_without_private_runtime_state(self):
        result = core.check(SimpleNamespace(vault=str(VAULT)))
        self.assertTrue(result['ok'], result['issues'])
        self.assertEqual(result['vault_kind'], 'unmanaged')
        self.assertFalse((VAULT / '.rabbit-hole.json').exists())
        self.assertFalse(list(VAULT.rglob('*.bin')))
        self.assertFalse(list(VAULT.rglob('import-ledger.json')))

    def test_source_words_authorship_and_raw_input_hashes_match_supplied_records(self):
        inputs = sorted((FIXTURE / 'inputs').glob('*.json'))
        expected = {r['id']: r for p in inputs for r in json.loads(p.read_text())}
        original_hashes = {hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs}
        seen = set()
        for path in (VAULT / '80_來源/imports').glob('*.md'):
            text = path.read_text()
            quote = re.search(r'^(`{3,})text\n(.*?)\n\1\s*$', text, re.M | re.S)
            metadata = re.search(r'^(`{3,})json\n(.*?)\n\1\s*$', text, re.M | re.S)
            self.assertIsNotNone(quote, path)
            self.assertIsNotNone(metadata, path)
            row = json.loads(metadata[2])
            item = expected[row['source_id']]
            self.assertNotIn(row['source_id'], seen)
            seen.add(row['source_id'])
            self.assertEqual(quote[2], item['text'])
            self.assertEqual(row['author'], item['author'])
            self.assertIn(row['original_hash'], original_hashes)
            self.assertLess(quote.start(), metadata.start())
            self.assertEqual(path.stem, row['key'] + '-r' + str(row['revision']))
        self.assertEqual(seen, set(expected))

    def test_all_reading_pages_are_reachable_from_the_entrance(self):
        notes = {p.relative_to(VAULT).as_posix(): p for p in VAULT.rglob('*.md')}
        pending, visited = ['README.md'], set()
        while pending:
            name = pending.pop()
            if name in visited:
                continue
            visited.add(name)
            for match in re.finditer(r'\[\[([^\]\n]+)\]\]', core.visible_markdown(notes[name].read_text())):
                target = match[1].split('|')[0].split('#')[0]
                if not target:
                    continue
                if not target.endswith('.md'):
                    target += '.md'
                self.assertIn(target, notes)
                pending.append(target)
        reader_pages = {name for name in notes if name != 'AGENTS.md' and not name.startswith('90_維護/')}
        self.assertTrue(reader_pages.issubset(visited), sorted(reader_pages - visited))

    def test_fixture_has_only_the_intended_allowed_sources(self):
        ids = [r['id'] for p in (FIXTURE / 'inputs').glob('*.json') for r in json.loads(p.read_text())]
        self.assertEqual(set(ids), {f'S{i:02}' for i in range(1, 17)} | {'I01', 'I02', 'I03', 'U01', 'U02'})
        self.assertEqual(len(ids), len(set(ids)))
        for path in VAULT.rglob('*.md'):
            self.assertNotIn('/private/tmp/', path.read_text())
            self.assertNotIn('/Users/', path.read_text())

if __name__ == '__main__':
    unittest.main()
