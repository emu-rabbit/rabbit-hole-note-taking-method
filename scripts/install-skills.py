#!/usr/bin/env python3
"""Install the complete five-skill Rabbit Hole bundle; preview unless --apply is given."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import sys

# Loading local helpers must not create __pycache__ during a preview.
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('skill_validation', Path(__file__).with_name('validate-skills.py'))
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)
secure_io = validation.secure_io
SKILLS = validation.SKILLS


def install(source: Path, destination: Path, apply: bool = False) -> None:
    with secure_io.Session(private=False) as session:
        source, destination = session.path(source), session.path(destination)
        if destination.is_relative_to(source):
            raise ValueError('destination cannot be inside the source skills directory')
        # Read once through no-follow handles. Validate exactly the bytes to copy.
        snapshot = validation.snapshot(source, session)
        validation.validate_snapshot(snapshot)
        session.validate_path(destination)
        source_identity = session.backend.identity(session.directory(source))
        for ancestor in (destination, *destination.parents):
            if session.exists(ancestor) and session.info(ancestor)['kind'] == 'directory':
                if session.backend.identity(session.directory(ancestor)) == source_identity:
                    raise ValueError('destination cannot be inside the source skills directory')
        if session.exists(destination) and session.info(destination)['kind'] != 'directory':
            raise ValueError('destination is not a directory')
        names = session.backend.list_names(session.directory(destination)) if session.exists(destination) else []
        validation.reject_legacy_skills(destination, names)
        for name in SKILLS:
            if session.exists(destination / name):
                raise ValueError(f'refusing to overwrite existing skill: {name}')
        for name in SKILLS:
            print(f'{"Install" if apply else "Would install"}: {source / name} -> {destination / name}')
        if not apply:
            print('Preview only. Add --apply to install all five skills.')
            return
        checkpoint = session.checkpoint()
        try:
            parent = session.directory(destination, create=True)
            validation.reject_legacy_skills(destination, session.backend.list_names(parent))
            for name in SKILLS:
                if session.exists(destination / name):
                    raise ValueError(f'refusing to overwrite existing skill: {name}')
            for name in SKILLS:
                session.mkdir_new(destination / name)
            for parts in sorted(snapshot['directories'], key=lambda item: (len(item), item)):
                if len(parts) > 1:
                    session.mkdir_new(destination.joinpath(*parts))
            for parts, data in sorted(snapshot['files'].items()):
                target = destination.joinpath(*parts)
                session.write_new(target, data)
                if hashlib.sha256(session.read(target)).digest() != hashlib.sha256(data).digest():
                    raise ValueError('Copy verification failed')
            session.assert_visible(destination)
            validation.validate_snapshot(validation.snapshot(destination, session))
        except BaseException:
            session.rollback(checkpoint)
            raise
    print('Installed and verified all five skills. Check for the skills on your next turn; reopen your client if discovery has not refreshed.')


def main() -> int:
    secure_io.configure_output()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dest', type=Path, default=Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills', help='destination skills directory (default: $CODEX_HOME/skills or ~/.codex/skills)')
    parser.add_argument('--apply', action='store_true', help='perform the installation; otherwise preview only')
    args = parser.parse_args()
    try:
        install(Path(__file__).absolute().parents[1] / 'skills', args.dest, args.apply)
    except (ValueError, OSError) as exc:
        parser.exit(1, f'Installation failed: {exc}\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
