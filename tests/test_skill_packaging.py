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
                '# Test skill\n\n[Shared guidance](../rabbit-hole-start/references/guide.md#usage)\n', encoding='utf-8')
        references = self.source / 'rabbit-hole-start' / 'references'
        references.mkdir()
        (references / 'guide.md').write_text('# Usage\n\nUseful instructions.\n', encoding='utf-8')

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
        (unrelated / 'keep').write_text('unchanged')
        self.install()
        self.assertEqual((unrelated / 'keep').read_text(), 'unchanged')
        for file in self.source.rglob('*'):
            if file.is_file():
                self.assertEqual(file.read_bytes(), (self.dest / file.relative_to(self.source)).read_bytes())
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
        with mock.patch.object(installer, 'SAFE_DIRECTORY_IO', False):
            with self.assertRaisesRegex(ValueError, 'Mac or Linux'):
                self.install()
        self.assertFalse(self.dest.exists())

    def test_collision_preflights_last_skill_before_any_write(self):
        collision = self.dest / installer.SKILLS[-1]
        collision.mkdir(parents=True)
        (collision / 'keep').write_text('old')
        with self.assertRaises(ValueError):
            self.install()
        self.assertEqual(list(self.dest.iterdir()), [collision])
        self.assertEqual((collision / 'keep').read_text(), 'old')

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
                    (legacy / 'keep').write_text('user customization')
                    with self.assertRaisesRegex(ValueError, 'Back up and move'):
                        self.install(apply)
                    self.assertEqual(list(self.dest.iterdir()), [legacy])
                    self.assertEqual((legacy / 'keep').read_text(), 'user customization')

    def test_legacy_file_and_dangling_symlink_are_not_overwritten_or_ignored(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[0]
        legacy.write_text('existing file')
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertEqual(legacy.read_text(), 'existing file')
        legacy.unlink()
        legacy.symlink_to(self.root / 'missing-target', target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertTrue(legacy.is_symlink())
        self.assertFalse(any((self.dest / name).exists() for name in installer.SKILLS))

    def test_mixed_old_and_new_source_is_rejected_before_any_write(self):
        legacy = self.source / validator.LEGACY_SKILLS[0]
        legacy.mkdir()
        (legacy / 'keep').write_text('old source')
        with self.assertRaisesRegex(ValueError, 'legacy'):
            self.install()
        self.assertFalse(self.dest.exists())
        self.assertEqual((legacy / 'keep').read_text(), 'old source')

    def test_legacy_backups_outside_skills_directory_are_left_untouched(self):
        backup = self.root / 'backup' / validator.LEGACY_SKILLS[0]
        backup.mkdir(parents=True)
        (backup / 'keep').write_text('saved user customization')
        self.install()
        self.assertEqual({p.name for p in self.dest.iterdir()}, set(installer.SKILLS))
        self.assertEqual((backup / 'keep').read_text(), 'saved user customization')

    def test_legacy_created_after_path_preflight_is_checked_by_directory_descriptor(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[-1]
        original = os.listdir
        inserted = False
        def add_legacy(fd):
            nonlocal inserted
            if isinstance(fd, int) and os.fstat(fd).st_ino == self.dest.stat().st_ino and not inserted:
                legacy.mkdir()
                (legacy / 'keep').write_text('concurrent skill')
                inserted = True
            return original(fd)
        with mock.patch.object(installer.os, 'listdir', side_effect=add_legacy):
            with self.assertRaisesRegex(ValueError, 'legacy'):
                self.install()
        self.assertTrue(inserted)
        self.assertEqual(list(self.dest.iterdir()), [legacy])
        self.assertEqual((legacy / 'keep').read_text(), 'concurrent skill')

    def test_legacy_added_during_copy_is_preserved_and_new_skill_rolled_back(self):
        self.dest.mkdir()
        legacy = self.dest / validator.LEGACY_SKILLS[0]
        original = os.open
        def add_legacy(path, flags, *args, **kwargs):
            if str(path) == 'guide.md' and flags & os.O_CREAT:
                legacy.mkdir()
                (legacy / 'keep').write_text('concurrent skill')
            return original(path, flags, *args, **kwargs)
        with mock.patch.object(installer.os, 'open', side_effect=add_legacy):
            with self.assertRaisesRegex(ValueError, 'legacy'):
                self.install()
        self.assertEqual(list(self.dest.iterdir()), [legacy])
        self.assertEqual((legacy / 'keep').read_text(), 'concurrent skill')

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

    def test_source_symlink_is_rejected(self):
        (self.source / installer.SKILLS[-1] / 'linked').symlink_to(self.source / installer.SKILLS[0], target_is_directory=True)
        with self.assertRaises(ValueError):
            self.install()
        self.assertFalse(self.dest.exists())

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
        unrelated.write_text('untouched')
        original = os.open
        def fail_one(path, flags, *args, **kwargs):
            if str(path) == 'SKILL.md' and flags & os.O_CREAT and (self.dest / installer.SKILLS[-1]).exists() and os.fstat(kwargs['dir_fd']).st_ino == (self.dest / installer.SKILLS[-1]).stat().st_ino:
                self.assertTrue((self.dest / 'rabbit-hole-start' / 'SKILL.md').is_file())
                raise OSError('simulated disk failure')
            return original(path, flags, *args, **kwargs)
        with mock.patch.object(installer.os, 'open', side_effect=fail_one):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual(list(self.dest.iterdir()), [unrelated])
        self.assertEqual(unrelated.read_text(), 'untouched')

    def test_rollback_preserves_foreign_file_added_during_install(self):
        original = os.open
        foreign = self.dest / installer.SKILLS[0] / 'foreign'
        def fail_one(path, flags, *args, **kwargs):
            if str(path) == 'SKILL.md' and flags & os.O_CREAT and (self.dest / installer.SKILLS[-1]).exists() and os.fstat(kwargs['dir_fd']).st_ino == (self.dest / installer.SKILLS[-1]).stat().st_ino:
                self.assertTrue((self.dest / 'rabbit-hole-start' / 'SKILL.md').is_file())
                foreign.write_text('not installer owned')
                raise OSError('simulated concurrent change')
            return original(path, flags, *args, **kwargs)
        with mock.patch.object(installer.os, 'open', side_effect=fail_one):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual(foreign.read_text(), 'not installer owned')
        self.assertEqual(list(foreign.parent.iterdir()), [foreign])

    def test_parent_swapped_for_symlink_after_preflight_never_writes_outside(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'keep').write_text('untouched')
        original = os.open
        swapped = False
        target = self.dest / installer.SKILLS[0]
        def swap_parent(path, flags, *args, **kwargs):
            nonlocal swapped
            if (not swapped and str(path) == installer.SKILLS[0]
                    and target.exists() and kwargs.get('dir_fd') is not None
                    and os.fstat(kwargs['dir_fd']).st_ino == self.dest.stat().st_ino):
                target.rename(self.dest / 'moved-created-directory')
                target.symlink_to(outside, target_is_directory=True)
                swapped = True
            return original(path, flags, *args, **kwargs)
        with mock.patch.object(installer.os, 'open', side_effect=swap_parent):
            with self.assertRaises(OSError):
                self.install()
        self.assertTrue(swapped)
        self.assertEqual([p.name for p in outside.iterdir()], ['keep'])
        self.assertEqual((outside / 'keep').read_text(), 'untouched')
        self.assertTrue(target.is_symlink())

    def test_missing_relative_link_and_anchor_are_rejected(self):
        guide = self.source / 'rabbit-hole-start' / 'references' / 'guide.md'
        guide.write_text('# Different heading\n')
        with self.assertRaisesRegex(ValueError, 'anchor'):
            validator.validate(self.source)
        guide.unlink()
        with self.assertRaisesRegex(ValueError, 'missing link'):
            validator.validate(self.source)

    def test_link_outside_bundle_is_rejected_even_if_file_exists(self):
        (self.root / 'secret.md').write_text('# Secret\n')
        skill = self.source / installer.SKILLS[0] / 'SKILL.md'
        with skill.open('a') as stream:
            stream.write('\n[Outside](../../secret.md)\n')
        with self.assertRaisesRegex(ValueError, 'escapes'):
            validator.validate(self.source)

    def test_unrelated_sibling_dependency_is_rejected_even_when_target_exists(self):
        sibling = self.source / 'unrelated-skill'
        sibling.mkdir()
        (sibling / 'guide.md').write_text('# Guidance\n')
        skill = self.source / 'rabbit-hole-start' / 'SKILL.md'
        original = skill.read_text()
        for link in ('[Dependency](../unrelated-skill/guide.md)',
                     '[Dependency][guide]\n\n[guide]: ../unrelated-skill/guide.md'):
            with self.subTest(link=link):
                skill.write_text(original + '\n' + link + '\n')
                with self.assertRaisesRegex(ValueError, 'escapes'):
                    validator.validate(self.source)

    def test_incorrect_name_and_placeholder_are_rejected(self):
        skill = self.source / installer.SKILLS[0] / 'SKILL.md'
        text = skill.read_text()
        skill.write_text(text.replace('name: rabbit-hole-start', 'name: other'))
        with self.assertRaisesRegex(ValueError, 'name'):
            validator.validate(self.source)
        skill.write_text(text + '\nTODO: finish this\n')
        with self.assertRaisesRegex(ValueError, 'placeholder'):
            validator.validate(self.source)

    def test_ui_prompt_and_values_are_validated(self):
        agents = self.source / installer.SKILLS[0] / 'agents'
        agents.mkdir()
        ui = agents / 'openai.yaml'
        ui.write_text('interface:\n  default_prompt: "Use the wrong skill"\n')
        with self.assertRaisesRegex(ValueError, 'default_prompt'):
            validator.validate(self.source)
        ui.write_text('interface:\n  default_prompt: "Use $rabbit-hole-start-other to start a notebook."\n')
        with self.assertRaisesRegex(ValueError, 'default_prompt'):
            validator.validate(self.source)
        ui.write_text('interface:\n  default_prompt: "Use $rabbit-hole-start to start a notebook."\n  short_description: "Short"\n')
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
        result = subprocess.run([sys.executable, str(checkout / 'scripts' / 'install-skills.py'), '--dest', str(self.dest)], text=True, capture_output=True, env=environment)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.dest.exists())
        self.assertEqual({p.relative_to(checkout): p.read_bytes() for p in checkout.rglob('*') if p.is_file()}, before)
        self.assertFalse(list(checkout.rglob('__pycache__')))
        result = subprocess.run([sys.executable, str(checkout / 'scripts' / 'install-skills.py'), '--dest', str(self.dest), '--apply'], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        shutil.rmtree(checkout)
        self.assertEqual({p.name for p in self.dest.iterdir()}, set(installer.SKILLS))
        validator.validate(self.dest)
        script = self.dest / 'rabbit-hole-start' / 'scripts' / 'rabbit_hole.py'
        result = subprocess.run([sys.executable, str(script), '--help'], cwd=self.root, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('usage:', result.stdout.lower())
        def cli(*args):
            result = subprocess.run([sys.executable, str(script), *map(str, args)], cwd=self.root, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            return json.loads(result.stdout)
        supplied = self.root / 'selected-records.json'
        supplied.write_text(json.dumps([{'id': 'selected-1', 'text': 'Exact supplied words 原話', 'author': 'Synthetic speaker'}], ensure_ascii=False), encoding='utf-8')
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
                row = json.loads(ledger.read_text())['records'][0]
                self.assertEqual((vault / row['original']).read_bytes(), supplied.read_bytes())
                self.assertEqual(row['author'], 'Synthetic speaker')
                after = {p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}
                self.assertEqual(cli(*imp, '--apply')['skipped_records'], 1)
                self.assertEqual({p.relative_to(vault): p.read_bytes() for p in vault.rglob('*') if p.is_file()}, after)
                self.assertTrue(cli('check', '--vault', vault)['ok'])


if __name__ == '__main__':
    unittest.main()
