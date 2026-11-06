"""Small handle-anchored filesystem boundary shared by the local helpers.

No fallback to path-only operations. Sessions retain directory and newly-created
file handles until commit/rollback completes. This is not crash recovery or a
transaction against unrelated writers using the same user account.
"""
from contextlib import contextmanager
from contextvars import ContextVar
import hashlib
import importlib.util
import os
from pathlib import Path
import secrets
import stat
import sys

sys.dont_write_bytecode = True
LIMIT = 16 * 1024 * 1024
_ACTIVE = ContextVar('rabbit_hole_io_session', default=None)


def configure_output():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='backslashreplace')


class PosixIO:
    def check_supported(self):
        required = (os.open, os.mkdir, os.stat, os.unlink, os.rmdir, os.link, os.rename)
        if (sys.platform not in ('darwin', 'linux') or not hasattr(os, 'O_NOFOLLOW')
                or not hasattr(os, 'O_DIRECTORY')
                or not all(fn in os.supports_dir_fd for fn in required)
                or os.listdir not in os.supports_fd):
            raise ValueError('Secure local I/O is unavailable on this platform')

    def normalize_path(self, value):
        return Path(os.path.abspath(os.path.expanduser(str(value))))

    def name_key(self, name):
        return name

    def _flags(self):
        return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW

    def open_anchor(self, anchor):
        return os.open(anchor, self._flags())

    def open_dir(self, parent, name, *, share_delete=False):
        return os.open(name, self._flags(), dir_fd=parent)

    def create_dir(self, parent, name, private=True):
        os.mkdir(name, 0o700 if private else 0o777, dir_fd=parent)
        return self.open_dir(parent, name)

    def identity(self, handle):
        info = os.fstat(handle)
        return info.st_dev, info.st_ino

    def info(self, parent, name):
        info = os.stat(name, dir_fd=parent, follow_symlinks=False)
        if stat.S_ISLNK(info.st_mode):
            raise ValueError('Symlink paths are not allowed')
        if stat.S_ISDIR(info.st_mode):
            kind = 'directory'
        elif stat.S_ISREG(info.st_mode):
            kind = 'file'
        else:
            raise ValueError('Expected an ordinary file or directory')
        return {'kind': kind, 'identity': (info.st_dev, info.st_ino)}

    def list_names(self, handle):
        return os.listdir(handle)

    def read_handle(self, handle, limit):
        info = os.fstat(handle)
        if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            raise ValueError('Expected a regular file within the size limit')
        os.lseek(handle, 0, os.SEEK_SET)
        chunks, total = [], 0
        while total <= limit:
            data = os.read(handle, min(65536, limit + 1 - total))
            if not data:
                return b''.join(chunks)
            chunks.append(data)
            total += len(data)
        raise ValueError('Expected a regular file within the size limit')

    def read_file(self, parent, name, limit):
        handle = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        try:
            return self.read_handle(handle, limit)
        finally:
            self.close(handle)

    def write_new(self, parent, name, data, private=True):
        temporary = '.rabbit-hole-' + secrets.token_hex(12)
        handle = os.open(temporary, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                         0o600 if private else 0o666, dir_fd=parent)
        published = False
        try:
            offset = 0
            while offset < len(data):
                written = os.write(handle, data[offset:])
                if not written:
                    raise OSError('Incomplete local write')
                offset += written
            os.fsync(handle)
            os.link(temporary, name, src_dir_fd=parent, dst_dir_fd=parent, follow_symlinks=False)
            published = True
            os.unlink(temporary, dir_fd=parent)
            return handle
        except BaseException:
            # Publication can succeed before temporary-name cleanup fails. Do not
            # leave an unrecorded final artifact, or unlink a replacement.
            for leaf in ((name, temporary) if published else (temporary,)):
                try:
                    self.remove_file(handle, parent, leaf)
                except (OSError, ValueError):
                    pass
            self.close(handle)
            raise

    def replace_file(self, handle, source_parent, source_name, destination_parent, destination_name):
        if self.info(source_parent, source_name)['identity'] != self.identity(handle):
            raise ValueError('Temporary artifact changed before commit')
        os.replace(source_name, destination_name,
                   src_dir_fd=source_parent, dst_dir_fd=destination_parent)

    def remove_file(self, handle, parent, name):
        if self.info(parent, name)['identity'] != self.identity(handle):
            raise ValueError('Created artifact was replaced; leaving it untouched')
        os.unlink(name, dir_fd=parent)

    def remove_dir(self, handle, parent, name):
        if self.info(parent, name)['identity'] != self.identity(handle):
            raise ValueError('Created directory was replaced; leaving it untouched')
        os.rmdir(name, dir_fd=parent)

    def lock_file(self, parent, name):
        return os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                       0o600, dir_fd=parent)

    def close(self, handle):
        os.close(handle)


def make_backend():
    if sys.platform == 'win32':
        spec = importlib.util.spec_from_file_location(
            '_rabbit_hole_windows_io', Path(__file__).with_name('_windows_io.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        try:
            backend = module.WindowsIO()
        except AttributeError as exc:
            raise ValueError('Required Windows local I/O APIs are unavailable') from exc
    else:
        backend = PosixIO()
    backend.check_supported()
    return backend


def normalize_path(value):
    return make_backend().normalize_path(value)


class Session:
    """Own handles, and retain exactly which objects this operation created."""
    def __init__(self, private=True, backend=None, _verify=False):
        self.backend = backend if backend is not None else make_backend()
        self.private = private
        self._verify = _verify
        self.directories = {}
        self.handles = []
        self.created = []
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def _keep(self, handle):
        self.handles.append(handle)
        return handle

    def path(self, value):
        return self.backend.normalize_path(value)

    def checkpoint(self):
        return len(self.created)

    def _record(self, path, parent, handle, kind, data=None):
        self.created.append({'path': path, 'parent': parent, 'handle': handle,
                             'identity': self.backend.identity(handle), 'kind': kind,
                             'hash': hashlib.sha256(data).digest() if data is not None else None,
                             'active': True})

    def directory(self, value, create=False):
        path = self.path(value)
        current = Path(path.anchor)
        if current not in self.directories:
            self.directories[current] = self._keep(self.backend.open_anchor(path.anchor))
        handle = self.directories[current]
        for component in path.parts[1:]:
            current /= component
            if current in self.directories:
                handle = self.directories[current]
                continue
            parent = handle
            try:
                handle = self.backend.open_dir(parent, component, share_delete=self._verify)
            except FileNotFoundError:
                if not create:
                    raise
                try:
                    handle = self.backend.create_dir(parent, component, self.private)
                except FileExistsError:
                    handle = self.backend.open_dir(parent, component, share_delete=self._verify)
                else:
                    self._record(current, parent, handle, 'directory')
            self.directories[current] = self._keep(handle)
        return handle

    def info(self, value):
        path = self.path(value)
        if path == Path(path.anchor):
            return {'kind': 'directory', 'identity': self.backend.identity(self.directory(path))}
        return self.backend.info(self.directory(path.parent), path.name)

    def exists(self, value):
        try:
            self.info(value)
            return True
        except (FileNotFoundError, NotADirectoryError):
            return False

    def validate_path(self, value):
        path = self.path(value)
        # Validate every existing prefix even when the leaf does not yet exist.
        current = Path(path.anchor)
        self.directory(current)
        for component in path.parts[1:]:
            current /= component
            try:
                self.info(current)
            except FileNotFoundError:
                break
        return path

    def read(self, value, limit=LIMIT):
        path = self.path(value)
        return self.backend.read_file(self.directory(path.parent), path.name, limit)

    def walk(self, value):
        root = self.path(value)
        def visit(path, handle):
            for name in sorted(self.backend.list_names(handle)):
                if name in ('.', '..'):
                    continue
                child = path / name
                info = self.backend.info(handle, name)
                yield child, info
                if info['kind'] == 'directory':
                    opened = self.directory(child)
                    if self.backend.identity(opened) != info['identity']:
                        raise ValueError('Directory changed during traversal')
                    yield from visit(child, opened)
        yield from visit(root, self.directory(root))

    def mkdir_new(self, value):
        path = self.path(value)
        parent = self.directory(path.parent, create=True)
        handle = self._keep(self.backend.create_dir(parent, path.name, self.private))
        self._record(path, parent, handle, 'directory')
        self.directories[path] = handle
        return handle

    def write_new(self, value, data):
        if len(data) > LIMIT:
            raise ValueError('Generated artifact would exceed the 16 MiB file limit')
        path = self.path(value)
        parent = self.directory(path.parent, create=True)
        handle = self._keep(self.backend.write_new(parent, path.name, data, self.private))
        self._record(path, parent, handle, 'file', data)

    def replace(self, source, destination):
        source, destination = self.path(source), self.path(destination)
        record = next((r for r in reversed(self.created)
                       if r['active'] and r['path'] == source and r['kind'] == 'file'), None)
        if record is None:
            raise ValueError('Only a newly created artifact can be committed')
        parent = self.directory(destination.parent)
        if self.backend.identity(parent) != self.backend.identity(record['parent']):
            raise ValueError('Commit must remain in the same directory')
        if self.info(destination)['kind'] != 'file':
            raise ValueError('Expected an existing ordinary ledger')
        self.backend.replace_file(record['handle'], record['parent'], source.name,
                                  parent, destination.name)
        record['active'] = False

    @contextmanager
    def exclusive_lock(self, value):
        path = self.path(value)
        parent = self.directory(path.parent)
        handle = self.backend.lock_file(parent, path.name)
        try:
            yield
        finally:
            try:
                self.backend.remove_file(handle, parent, path.name)
            finally:
                self.backend.close(handle)

    def rollback(self, checkpoint=0):
        for record in reversed(self.created[checkpoint:]):
            if not record['active']:
                continue
            try:
                if record['kind'] == 'file':
                    data = self.backend.read_handle(record['handle'], LIMIT)
                    if hashlib.sha256(data).digest() != record['hash']:
                        continue
                    self.backend.remove_file(record['handle'], record['parent'], record['path'].name)
                else:
                    self.backend.remove_dir(record['handle'], record['parent'], record['path'].name)
                record['active'] = False
            except (OSError, ValueError):
                pass  # Never remove a replacement, concurrent edit, or nonempty directory.

    def assert_visible(self, value):
        path = self.path(value)
        self.directory(path)
        pinned = [(p, self.backend.identity(handle))
                  for p, handle in self.directories.items() if p.is_relative_to(path)]
        with Session(private=self.private, backend=self.backend, _verify=True) as visible:
            for directory, identity in pinned:
                if visible.backend.identity(visible.directory(directory)) != identity:
                    raise ValueError('Destination changed during the operation')

    def close(self):
        if not self.closed:
            self.closed = True
            for handle in reversed(self.handles):
                self.backend.close(handle)


@contextmanager
def session_scope(private=True):
    current = _ACTIVE.get()
    if current is not None:
        yield current
        return
    with Session(private=private) as session:
        token = _ACTIVE.set(session)
        try:
            yield session
        finally:
            _ACTIVE.reset(token)
