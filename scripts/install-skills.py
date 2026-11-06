#!/usr/bin/env python3
"""Install the complete Rabbit Hole skill pack; preview unless --apply is given."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import sys

# Loading the validator must not create __pycache__ during a preview.
sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location('skill_validation', Path(__file__).with_name('validate-skills.py'))
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)
SKILLS = validation.SKILLS
SAFE_DIRECTORY_IO = (
    sys.platform in ('darwin', 'linux')
    and hasattr(os, 'O_NOFOLLOW') and hasattr(os, 'O_DIRECTORY')
    and all(function in os.supports_dir_fd for function in
            (os.open, os.mkdir, os.stat, os.unlink, os.rmdir))
    and os.listdir in os.supports_fd
)


def identity(path: Path) -> tuple[int, int]:
    info = path.lstat()
    return info.st_dev, info.st_ino


def install(source: Path, destination: Path, apply: bool = False) -> None:
    source, destination = source.absolute(), destination.expanduser().absolute()
    validation.validate(source)
    if destination.resolve().is_relative_to(source.resolve()):
        raise ValueError('destination cannot be inside the source skills directory')
    validation.no_symlinks(destination)
    if destination.exists() and not destination.is_dir():
        raise ValueError(f'destination is not a directory: {destination}')
    for name in SKILLS:
        target = destination / name
        if target.exists() or target.is_symlink():
            raise ValueError(f'refusing to overwrite existing skill: {target}')
    for name in SKILLS:
        print(f'{"Install" if apply else "Would install"}: {source / name} -> {destination / name}')
    if not apply:
        print('Preview only. Add --apply to install all seven skills.')
        return
    # Mac/Linux: anchor every operation to no-follow directory descriptors.
    # Holding parents also makes rollback independent of later path replacement.
    if not SAFE_DIRECTORY_IO:
        raise ValueError('safe installation requires Mac or Linux directory-descriptor support')
    descriptors = []
    created = []
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW

    def keep(fd):
        descriptors.append(fd)
        return fd

    def file_identity(info):
        return info.st_dev, info.st_ino

    def mkdir(parent, name):
        os.mkdir(name, dir_fd=parent)
        info = os.stat(name, dir_fd=parent, follow_symlinks=False)
        created.append((parent, name, file_identity(info), True))
        return keep(os.open(name, directory_flags, dir_fd=parent))

    def open_directory(path, create=False):
        fd = keep(os.open(path.anchor, directory_flags))
        for part in path.parts[1:]:
            if part in ('.', '..'):
                raise ValueError('directory paths cannot contain dot components')
            try:
                fd = keep(os.open(part, directory_flags, dir_fd=fd))
            except FileNotFoundError:
                if not create:
                    raise
                fd = mkdir(fd, part)
        return fd

    def snapshot(fd, prefix=()):
        entries = []
        for name in sorted(os.listdir(fd)):
            if name == '__pycache__' or Path(name).suffix in ('.pyc', '.pyo'):
                continue
            info = os.stat(name, dir_fd=fd, follow_symlinks=False)
            relative = prefix + (name,)
            if stat.S_ISDIR(info.st_mode):
                child = keep(os.open(name, directory_flags, dir_fd=fd))
                entries.append((relative, None, None))
                entries.extend(snapshot(child, relative))
            elif stat.S_ISREG(info.st_mode):
                with os.fdopen(os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd), 'rb') as reader:
                    actual = os.fstat(reader.fileno())
                    if not stat.S_ISREG(actual.st_mode):
                        raise ValueError(f'not a regular source file: {relative}')
                    entries.append((relative, reader.read(), stat.S_IMODE(actual.st_mode)))
            else:
                raise ValueError(f'unsupported source file: {relative}')
        return entries

    try:
        source_fd = open_directory(source)
        # Snapshot all source files through descriptors before creating anything.
        contents = {}
        for name in SKILLS:
            child = keep(os.open(name, directory_flags, dir_fd=source_fd))
            contents[name] = snapshot(child)
        destination_fd = open_directory(destination, create=True)
        # Repeat collision preflight against the exact opened destination.
        for name in SKILLS:
            try:
                os.stat(name, dir_fd=destination_fd, follow_symlinks=False)
            except FileNotFoundError:
                continue
            raise ValueError(f'refusing to overwrite existing skill: {name}')
        for name in SKILLS:
            parents = {(): mkdir(destination_fd, name)}
            for relative, data, mode in contents[name]:
                parent = parents[relative[:-1]]
                leaf = relative[-1]
                if data is None:
                    parents[relative] = mkdir(parent, leaf)
                    continue
                fd = os.open(leaf, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode, dir_fd=parent)
                created.append((parent, leaf, file_identity(os.fstat(fd)), False))
                with os.fdopen(fd, 'w+b') as writer:
                    writer.write(data)
                    writer.flush()
                    writer.seek(0)
                    if hashlib.sha256(writer.read()).digest() != hashlib.sha256(data).digest():
                        raise ValueError(f'copy verification failed: {name}/{relative}')
        # Reject path replacement rather than claiming success at a different path.
        validation.no_symlinks(destination)
        visible = open_directory(destination)
        if file_identity(os.fstat(visible)) != file_identity(os.fstat(destination_fd)):
            raise ValueError('destination changed during installation')
        validation.validate(destination)
    except BaseException:
        for parent, name, original_identity, is_dir in reversed(created):
            try:
                info = os.stat(name, dir_fd=parent, follow_symlinks=False)
                if file_identity(info) == original_identity:
                    if is_dir:
                        os.rmdir(name, dir_fd=parent)
                    else:
                        os.unlink(name, dir_fd=parent)
            except OSError:
                pass  # Leave foreign content or replaced paths untouched.
        raise
    finally:
        for fd in reversed(descriptors):
            os.close(fd)
    print('Installed and verified all seven skills. Check for the skills on your next turn; reopen your client if discovery has not refreshed.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dest', type=Path, default=Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills', help='destination skills directory (default: $CODEX_HOME/skills or ~/.codex/skills)')
    parser.add_argument('--apply', action='store_true', help='perform the installation; otherwise preview only')
    args = parser.parse_args()
    try:
        install(Path(__file__).resolve().parents[1] / 'skills', args.dest, args.apply)
    except (ValueError, OSError) as exc:
        parser.exit(1, f'Installation failed: {exc}\n')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
