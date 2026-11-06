"""Behavioral packaging tests. All installation targets are temporary directories."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('installer', ROOT / 'scripts' / 'install-skills.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
validator = installer.validation


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.source = self.root / 'source'
        self.dest = self.root / 'installed'
        for name in installer.SKILLS:
            folder = self.source / name
            folder.mkdir(parents=True)
            (folder / 'SKILL.md').write_text(
                f'---\nname: {name}\ndescription: A complete test skill for packaging validation.\n---\n'
                '# Test skill\n\n[Shared guidance](../rabbit-hole-start/references/guide.md#usage)\n', encoding='utf-8', newline='\n')
        references = self.source / 'rabbit-hole-start' / 'references'
        references.mkdir()
        (references / 'guide.md').write_text('# Usage\n\nUseful instructions.\n', encoding='utf-8', newline='\n')

    def install(self, apply=True):
        with contextlib.redirect_stdout(io.StringIO()):
            installer.install(self.source, self.dest, apply)

    def test_preview_creates_nothing(self):
        self.install(False)
        self.assertFalse(self.dest.exists())

    def test_only_five_task_skills_are_exposed_and_installed(self):
        expected = {'rabbit-hole-start', 'rabbit-hole-import', 'rabbit-hole-interview', 'rabbit-hole-maintain', 'rabbit-hole-share'}
        self.assertEqual(set(installer.SKILLS), expected)
        self.assertEqual({p.parent.name for p in (ROOT / 'skills').glob('*/SKILL.md')}, expected)
        self.install()
        self.assertEqual({p.name for p in self.dest.iterdir()}, expected)

    def test_apply_copies_exact_content_and_keeps_unrelated_skill(self):
        unrelated = self.dest / 'existing-other-skill'
        unrelated.mkdir(parents=True)
        (unrelated / 'keep').write_text('unchanged', encoding='utf-8', newline='\n')
        self.install()
        self.assertEqual((unrelated / 'keep').read_text(encoding='utf-8'), 'unchanged')
        for file in self.source.rglob('*'):
            if file.is_file():
                self.assertEqual(file.read_bytes(), (self.dest / file.relative_to(self.source)).read_bytes())
        validator.validate(self.dest)

    def test_crlf_and_bom_bundle_text_preserves_copied_bytes(self):
        for bom in (False, True):
            with self.subTest(bom=bom):
                self.dest = self.root / ('installed-bom' if bom else 'installed-crlf')
                for path in self.source.rglob('*.md'):
                    raw = path.read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
                    path.write_bytes((b'\xef\xbb\xbf' if bom else b'') + raw)
                expected = {p.relative_to(self.source): p.read_bytes()
                            for p in self.source.rglob('*') if p.is_file()}
                self.install()
                self.assertEqual({p.relative_to(self.dest): p.read_bytes()
                                  for p in self.dest.rglob('*') if p.is_file()}, expected)
                validator.validate(self.dest)

    def test_installation_excludes_python_caches(self):
        skill = self.source / installer.SKILLS[0]
        cache = skill / '__pycache__'
        cache.mkdir()
        (cache / 'module.cpython-313.pyc').write_bytes(b'cache')
        (skill / 'old.pyc').write_bytes(b'old cache')
        (skill / 'old.pyo').write_bytes(b'old optimized cache')
        self.install()
        self.assertFalse((self.dest / installer.SKILLS[0] / '__pycache__').exists())
        self.assertEqual(list(self.dest.rglob('*.pyc')), [])
        self.assertEqual(list(self.dest.rglob('*.pyo')), [])

    def test_unsupported_platform_fails_cleanly_before_writes(self):
        with mock.patch.object(sys, 'platform', 'unsupported-test-os'):
            with self.assertRaisesRegex(ValueError, 'platform'):
                self.install()
        self.assertFalse(self.dest.exists())

    def test_collision_preflights_last_skill_before_any_write(self):
        collision = self.dest / installer.SKILLS[-1]
        collision.mkdir(parents=True)
        (collision / 'keep').write_text('old', encoding='utf-8', newline='\n')
        with self.assertRaises(ValueError):
            self.install()
        self.assertEqual(list(self.dest.iterdir()), [collision])
        self.assertEqual((collision / 'keep').read_text(encoding='utf-8'), 'old')

    def test_repeated_install_refuses_without_changing_existing_content(self):
        self.install()
        before = {p.relative_to(self.dest): p.read_bytes() for p in self.dest.rglob('*') if p.is_file()}
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            self.install()
        after = {p.relative_to(self.dest): p.read_bytes() for p in self.dest.rglob('*') if p.is_file()}
        self.assertEqual(after, before)

    def test_every_partial_legacy_install_blocks_preview_and_apply_without_changes(self):
        for name in validator.LEGACY_SKILLS:
            for apply in (False, True):
                with self.subTest(name=name, apply=apply):
                    self.dest = self.root / f'legacy-{name}-{apply}'
                    legacy = self.dest / name
                    legacy.mkdir(parents=True)
                    (legacy / 'keep').write_text('user customization', encoding='utf-8', newline='\n')
                    with self.assertRaisesRegex(ValueError, 'Back up and move'):
                        self.install(apply)
                    self.assertEqual(list(self.dest.iterdir()), [legacy])
                    self.assertEqual((legacy / 'keep').read_text(encoding='utf-8'), 'user customization')

    def test_legacy_file_is_not_overwritten_or_ignored(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[0]
        legacy.write_text('existing file', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertEqual(legacy.read_text(encoding='utf-8'), 'existing file')

    @unittest.skipIf(os.name == 'nt', 'POSIX dangling symlink; Windows native tests cover reparse entries')
    def test_legacy_dangling_symlink_is_not_ignored(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[0]
        legacy.symlink_to(self.root / 'missing-target', target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertTrue(legacy.is_symlink())
        self.assertFalse(any((self.dest / name).exists() for name in installer.SKILLS))

    def test_mixed_old_and_new_source_is_rejected_before_any_write(self):
        legacy = self.source / validator.LEGACY_SKILLS[0]
        legacy.mkdir()
        (legacy / 'keep').write_text('old source', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertFalse(self.dest.exists())
        self.assertEqual((legacy / 'keep').read_text(encoding='utf-8'), 'old source')

    def test_legacy_backups_outside_skills_directory_are_left_untouched(self):
        backup = self.root / 'backup' / validator.LEGACY_SKILLS[0]
        backup.mkdir(parents=True)
        (backup / 'keep').write_text('saved user customization', encoding='utf-8', newline='\n')
        self.install()
        self.assertEqual({p.name for p in self.dest.iterdir()}, set(installer.SKILLS))
        self.assertEqual((backup / 'keep').read_text(encoding='utf-8'), 'saved user customization')

    def test_legacy_created_after_path_preflight_is_checked_by_directory_descriptor(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[-1]
        original = installer.secure_io.Session.directory
        inserted = False
        def add_legacy(session, path, create=False):
            nonlocal inserted
            handle = original(session, path, create=create)
            if Path(path) == self.dest and not inserted:
                legacy.mkdir()
                (legacy / 'keep').write_text('concurrent skill', encoding='utf-8', newline='\n')
                inserted = True
            return handle
        with mock.patch.object(installer.secure_io.Session, 'directory', new=add_legacy):
            with self.assertRaisesRegex(ValueError, 'legacy'):
                self.install()
        self.assertTrue(inserted)
        self.assertEqual(list(self.dest.iterdir()), [legacy])
        self.assertEqual((legacy / 'keep').read_text(encoding='utf-8'), 'concurrent skill')

    def test_legacy_added_during_copy_is_preserved_and_new_skill_rolled_back(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[0]
        original = installer.secure_io.Session.write_new
        def add_legacy(session, path, data):
            result = original(session, path, data)
            if Path(path).name == 'guide.md':
                legacy.mkdir()
                (legacy / 'keep').write_text('concurrent skill', encoding='utf-8', newline='\n')
            return result
        with mock.patch.object(installer.secure_io.Session, 'write_new', new=add_legacy):
            with self.assertRaisesRegex(ValueError, 'legacy'):
                self.install()
        self.assertEqual(list(self.dest.iterdir()), [legacy])
        self.assertEqual((legacy / 'keep').read_text(encoding='utf-8'), 'concurrent skill')

    def test_each_missing_skill_preflights_before_any_write(self):
        for name in installer.SKILLS:
            with self.subTest(name=name):
                absent = self.root / name
                (self.source / name).rename(absent)
                try:
                    with self.assertRaises(ValueError):
                        self.install()
                    self.assertFalse(self.dest.exists())
                finally:
                    absent.rename(self.source / name)

    def test_destination_inside_source_is_rejected(self):
        self.dest = self.source / 'rabbit-hole-start' / 'nested'
        with self.assertRaisesRegex(ValueError, 'inside'):
            self.install()
        self.assertFalse(self.dest.exists())

    @unittest.skipIf(os.name == 'nt', 'POSIX symlink setup; Windows native tests cover junctions')
    def test_source_symlink_is_rejected(self):
        (self.source / installer.SKILLS[-1] / 'linked').symlink_to(self.source / installer.SKILLS[0], target_is_directory=True)
        with self.assertRaises(ValueError):
            self.install()
        self.assertFalse(self.dest.exists())

    @unittest.skipIf(os.name == 'nt', 'POSIX symlink setup; Windows native tests cover junctions')
    def test_destination_symlink_ancestor_is_rejected(self):
        target = self.root / 'real'
        target.mkdir()
        alias = self.root / 'alias'
        alias.symlink_to(target, target_is_directory=True)
        self.dest = alias / 'skills'
        with self.assertRaises(ValueError):
            self.install()
        self.assertEqual(list(target.iterdir()), [])

    def test_failure_rolls_back_own_files_only(self):
        self.dest.mkdir()
        unrelated = self.dest / 'keep'
        unrelated.write_text('untouched', encoding='utf-8', newline='\n')
        original = installer.secure_io.Session.write_new
        def fail_one(session, path, data):
            path = Path(path)
            if path.name == 'SKILL.md' and path.parent == self.dest / 'rabbit-hole-start':
                self.assertTrue((self.dest / 'rabbit-hole-import' / 'SKILL.md').is_file())
                raise OSError('simulated disk failure')
            return original(session, path, data)
        with mock.patch.object(installer.secure_io.Session, 'write_new', new=fail_one):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual(list(self.dest.iterdir()), [unrelated])
        self.assertEqual(unrelated.read_text(encoding='utf-8'), 'untouched')

    def test_rollback_preserves_foreign_file_added_during_install(self):
        original = installer.secure_io.Session.write_new
        foreign = self.dest / installer.SKILLS[0] / 'foreign'
        def fail_one(session, path, data):
            path = Path(path)
            if path.name == 'SKILL.md' and path.parent == self.dest / 'rabbit-hole-start':
                self.assertTrue((self.dest / 'rabbit-hole-import' / 'SKILL.md').is_file())
                foreign.write_text('not installer owned', encoding='utf-8', newline='\n')
                raise OSError('simulated concurrent change')
            return original(session, path, data)
        with mock.patch.object(installer.secure_io.Session, 'write_new', new=fail_one):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual(foreign.read_text(encoding='utf-8'), 'not installer owned')
        self.assertEqual(list(foreign.parent.iterdir()), [foreign])

    @unittest.skipIf(os.name == 'nt', 'POSIX replacement semantics; Windows tests verify pinned handles and junction rejection')
    def test_parent_swapped_for_symlink_after_preflight_never_writes_outside(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'keep').write_text('untouched', encoding='utf-8', newline='\n')
        original = installer.secure_io.Session.mkdir_new
        swapped = False
        target = self.dest / installer.SKILLS[0]
        def swap_parent(session, path):
            nonlocal swapped
            result = original(session, path)
            if Path(path) == target and not swapped:
                target.rename(self.dest / 'moved-created-directory')
                target.symlink_to(outside, target_is_directory=True)
                swapped = True
            return result
        with mock.patch.object(installer.secure_io.Session, 'mkdir_new', new=swap_parent):
            with self.assertRaises((OSError, ValueError)):
                self.install()
        self.assertTrue(swapped)
        self.assertEqual([p.name for p in outside.iterdir()], ['keep'])
        self.assertEqual((outside / 'keep').read_text(encoding='utf-8'), 'untouched')
        self.assertTrue(target.is_symlink())

    def test_missing_relative_link_and_anchor_are_rejected(self):
        guide = self.source / 'rabbit-hole-start' / 'references' / 'guide.md'
        guide.write_text('# Different heading\n', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'anchor'):
            validator.validate(self.source)
        guide.unlink()
        with self.assertRaisesRegex(ValueError, 'missing link'):
            validator.validate(self.source)

    def test_link_outside_bundle_is_rejected_even_if_file_exists(self):
        (self.root / 'secret.md').write_text('# Secret\n', encoding='utf-8', newline='\n')
        skill = self.source / installer.SKILLS[0] / 'SKILL.md'
        with skill.open('a', encoding='utf-8', newline='\n') as stream:
            stream.write('\n[Outside](../../secret.md)\n')
        with self.assertRaisesRegex(ValueError, 'escapes'):
            validator.validate(self.source)

    def test_unrelated_sibling_dependency_is_rejected_even_when_target_exists(self):
        sibling = self.source / 'unrelated-skill'
        sibling.mkdir()
        (sibling / 'guide.md').write_text('# Guidance\n', encoding='utf-8', newline='\n')
        skill = self.source / 'rabbit-hole-start' / 'SKILL.md'
        original = skill.read_text(encoding='utf-8')
        for link in ('[Dependency](../unrelated-skill/guide.md)',
                     '[Dependency][guide]\n\n[guide]: ../unrelated-skill/guide.md'):
            with self.subTest(link=link):
                skill.write_text(original + '\n' + link + '\n', encoding='utf-8', newline='\n')
                with self.assertRaisesRegex(ValueError, 'escapes'):
                    validator.validate(self.source)

    def test_incorrect_name_and_placeholder_are_rejected(self):
        skill = self.source / installer.SKILLS[0] / 'SKILL.md'
        text = skill.read_text(encoding='utf-8')
        skill.write_text(text.replace('name: rabbit-hole-start', 'name: other'), encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'name'):
            validator.validate(self.source)
        skill.write_text(text + '\nTODO: finish this\n', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'placeholder'):
            validator.validate(self.source)

    def test_ui_prompt_and_values_are_validated(self):
        agents = self.source / installer.SKILLS[0] / 'agents'
        agents.mkdir()
        ui = agents / 'openai.yaml'
        ui.write_text('interface:\n  default_prompt: "Use the wrong skill"\n', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'default_prompt'):
            validator.validate(self.source)
        ui.write_text('interface:\n  default_prompt: "Use $rabbit-hole-start-other to start a notebook."\n', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'default_prompt'):
            validator.validate(self.source)
        ui.write_text('interface:\n  default_prompt: "Use $rabbit-hole-start to start a notebook."\n  short_description: "Short"\n', encoding='utf-8', newline='\n')
        with self.assertRaisesRegex(ValueError, 'short_description'):
            validator.validate(self.source)

    def test_actual_five_skill_bundle_runs_without_original_checkout(self):
        # Distribute all five dependent skills, then remove the copied checkout.
        checkout = self.root / 'checkout'
        for name in installer.SKILLS:
            shutil.copytree(ROOT / 'skills' / name, checkout / 'skills' / name, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        shutil.copytree(ROOT / 'scripts', checkout / 'scripts', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        before = {p.relative_to(checkout): p.read_bytes() for p in checkout.rglob('*') if p.is_file()}
        environment = os.environ.copy()
        environment.pop('PYTHONDONTWRITEBYTECODE', None)
        result = subprocess.run([sys.executable, str(checkout / 'scripts' / 'install-skills.py'), '--dest', str(self.dest)], text=True, capture_output=True, env=environment, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.dest.exists())
        self.assertEqual({p.relative_to(checkout): p.read_bytes() for p in checkout.rglob('*') if p.is_file()}, before)
        self.assertFalse(list(checkout.rglob('__pycache__')))
        result = subprocess.run([sys.executable, str(checkout / 'scripts' / 'install-skills.py'), '--dest', str(self.dest), '--apply'], text=True, capture_output=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        shutil.rmtree(checkout)
        self.assertEqual({p.name for p in self.dest.iterdir()}, set(installer.SKILLS))
        validator.validate(self.dest)
        script = self.dest / 'rabbit-hole-start' / 'scripts' / 'rabbit_hole.py'
        result = subprocess.run([sys.executable, str(script), '--help'], cwd=self.root, text=True, capture_output=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('usage:', result.stdout.lower())
        def cli(*args):
            result = subprocess.run([sys.executable, str(script), *map(str, args)], cwd=self.root, text=True, capture_output=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            return json.loads(result.stdout)
        supplied = self.root / 'selected-records.json'
        supplied.write_text(json.dumps([{'id': 'selected-1', 'text': 'Exact supplied words 原話', 'author': 'Synthetic speaker'}], ensure_ascii=False), encoding='utf-8', newline='\n')
        for lang in ('en', 'zh-TW'):
            with self.subTest(lang=lang):
                vault = self.root / f'private-{lang}'
                init = ('init', '--vault', vault, '--name', 'Synthetic owner', '--lang', lang)
                cli(*init)
                self.assertFalse(vault.exists())
                cli(*init, '--apply')
                imp = ('import', '--vault', vault, '--input', supplied, '--namespace', 'isolated-test', '--owner', 'Synthetic owner', '--author', 'Fallback speaker')
                ledger = next(vault.glob('90_*/import-ledger.json'))
                before = {p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}
                self.assertEqual(cli(*imp)['added_revisions'], 1)
                self.assertEqual({p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}, before)
                self.assertEqual(cli(*imp, '--apply')['added_revisions'], 1)
                row = json.loads(ledger.read_text(encoding='utf-8'))['records'][0]
                self.assertEqual((vault / row['original']).read_bytes(), supplied.read_bytes())
                self.assertEqual(row['author'], 'Synthetic speaker')
                after = {p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}
                self.assertEqual(cli(*imp, '--apply')['skipped_records'], 1)
                self.assertEqual({p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}, after)
                self.assertTrue(cli('check', '--vault', vault)['ok'])


if __name__ == '__main__':
    unittest.main()
