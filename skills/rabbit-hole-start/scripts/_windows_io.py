"""Narrow, handle-relative Windows I/O for the Rabbit Hole local helpers.

Only this module knows the Windows ABI. No operation falls back to path-based
open/delete/copy. Native Windows tests are required before adding platforms or
filesystems to the deliberately small support set.
"""
from __future__ import annotations

import ctypes as C
import errno
import os
from pathlib import Path, PureWindowsPath
import re
import secrets
import sys

# Fixed-width SDK types also make layout inspection possible on another OS.
U8, U16, U32, I32, I64, U64 = C.c_uint8, C.c_uint16, C.c_uint32, C.c_int32, C.c_int64, C.c_uint64
PTR = C.c_void_p


class UNICODE_STRING(C.Structure):
    _fields_ = [('Length', U16), ('MaximumLength', U16), ('Buffer', PTR)]


class OBJECT_ATTRIBUTES(C.Structure):
    _fields_ = [('Length', U32), ('RootDirectory', PTR), ('ObjectName', C.POINTER(UNICODE_STRING)),
                ('Attributes', U32), ('SecurityDescriptor', PTR), ('SecurityQualityOfService', PTR)]


class STATUS_UNION(C.Union):
    _fields_ = [('Status', I32), ('Pointer', PTR)]


class IO_STATUS_BLOCK(C.Structure):
    _fields_ = [('Status', STATUS_UNION), ('Information', C.c_size_t)]


class ATTRIBUTE_TAG_INFO(C.Structure):
    _fields_ = [('Attributes', U32), ('ReparseTag', U32)]


class STANDARD_INFO(C.Structure):
    _fields_ = [('AllocationSize', I64), ('EndOfFile', I64), ('NumberOfLinks', U32),
                ('DeletePending', U8), ('Directory', U8)]


class ID_INFO(C.Structure):
    _fields_ = [('VolumeSerialNumber', U64), ('FileId', U8 * 16)]


class DIRECTORY_INFO(C.Structure):
    _fields_ = [('NextEntryOffset', U32), ('FileIndex', U32), ('CreationTime', I64),
                ('LastAccessTime', I64), ('LastWriteTime', I64), ('ChangeTime', I64),
                ('EndOfFile', I64), ('AllocationSize', I64), ('FileAttributes', U32),
                ('FileNameLength', U32), ('EaSize', U32), ('ShortNameLength', U8),
                ('ShortName', U16 * 12), ('FileId', I64), ('FileName', U16 * 1)]


class RENAME_INFO(C.Structure):
    # DWORD occupies the SDK BOOLEAN/DWORD union, including its zero padding.
    _fields_ = [('Flags', U32), ('RootDirectory', PTR), ('FileNameLength', U32), ('FileName', U16 * 1)]


def validate_component(name):
    """Validate one Windows filesystem name without consulting the filesystem."""
    if (not isinstance(name, str) or not name or name in ('.', '..')
            or name[-1] in ' .'
            or any(ord(c) < 32 or c in '<>:"/\\|?*' for c in name)
            or any(0xD800 <= ord(c) <= 0xDFFF for c in name)):
        raise ValueError('Unsupported Windows path component')
    stem = name.split('.', 1)[0].rstrip(' ').upper()
    if stem in ('CON', 'PRN', 'AUX', 'NUL', 'CLOCK$', 'CONIN$', 'CONOUT$') or re.fullmatch(r'(?:COM|LPT)[1-9¹²³]', stem):
        raise ValueError('Reserved Windows path component')
    if len(name.encode('utf-16-le')) > 510:
        raise ValueError('Windows path component is too long')
    return name


def validate_windows_path(value, cwd=None, home=None):
    """Pure lexical policy; rejected inputs cannot trigger network/path lookups.

    Relative CLI paths bind to one supplied/current working directory. No
    drive-relative state, device namespaces, environment expansion or `..` is
    accepted. Ledger-relative paths have an additional vault containment policy.
    """
    text = os.fspath(value)
    if not isinstance(text, str) or not text or any(ord(c) < 32 for c in text):
        raise ValueError('Unsupported Windows local path')
    text = text.replace('/', '\\')
    if text == '~' or text.startswith('~\\'):
        base = os.fspath(home) if home is not None else os.path.expanduser('~')
        text = base.replace('/', '\\').rstrip('\\') + text[1:]
    elif text.startswith('~'):
        raise ValueError('Named-user home paths are unsupported')
    if text.startswith('\\'):
        raise ValueError('UNC, device and root-relative Windows paths are unsupported')
    candidate = PureWindowsPath(text)
    if candidate.drive and not candidate.root:
        raise ValueError('Drive-relative Windows paths are unsupported')
    absolute = bool(re.match(r'^[A-Za-z]:\\', text))
    tail = text[3:] if absolute else text
    for part in tail.split('\\'):
        if part:
            validate_component(part)
    if not absolute:
        base = validate_windows_path(os.getcwd() if cwd is None else cwd)
        candidate = base / candidate
    if not re.fullmatch(r'[A-Za-z]:\\', candidate.anchor):
        raise ValueError('A local drive-letter path is required')
    for part in candidate.parts[1:]:
        validate_component(part)
    return candidate


class Handle(int):
    """An owned native handle token; closing it never closes a reused number."""
    def __new__(cls, value):
        result = super().__new__(cls, value)
        result.closed = False
        return result


class WindowsIO:
    """Private implementation of the shared local-I/O backend interface."""
    _READ, _WRITE, _DELETE = 0x80000000, 0x40000000, 0x00010000
    _SYNC, _ATTR, _LIST, _TRAVERSE = 0x00100000, 0x80, 0x1, 0x20
    _REPARSE, _DIRECTORY, _OFFLINE = 0x400, 0x10, 0x1000
    _RECALL = 0x40000 | 0x400000
    _SHARE_ALL = 0x1 | 0x2 | 0x4
    _DIRECTORY_ACCESS = _LIST | _TRAVERSE | _ATTR | _SYNC

    def __init__(self):
        self.check_supported()
        # winmode prevents loading a DLL planted in the working directory.
        self.k = C.WinDLL('kernel32.dll', use_last_error=True, winmode=0x800)
        self.n = C.WinDLL('ntdll.dll', use_last_error=True, winmode=0x800)
        self.a = C.WinDLL('advapi32.dll', use_last_error=True, winmode=0x800)
        self._bind()
        self._sid = self._current_user_sid()

    @staticmethod
    def check_supported():
        if (sys.platform != 'win32' or sys.implementation.name != 'cpython'
                or sys.version_info[:2] not in ((3, 13), (3, 14))
                or C.sizeof(PTR) != 8 or not hasattr(sys, 'getwindowsversion')):
            raise ValueError('Windows helpers require 64-bit CPython 3.13 or 3.14 on Windows 11')
        version = sys.getwindowsversion()
        if version.major != 10 or version.build < 22000:
            raise ValueError('Windows helpers require Windows 11 or a corresponding Windows runner')
        # Query the kernel, not user-controlled architecture environment variables.
        kernel = C.WinDLL('kernel32.dll', use_last_error=True, winmode=0x800)
        kernel.GetCurrentProcess.argtypes, kernel.GetCurrentProcess.restype = [], PTR
        kernel.IsWow64Process2.argtypes = [PTR, C.POINTER(U16), C.POINTER(U16)]
        kernel.IsWow64Process2.restype = I32
        process, native = U16(), U16()
        if not kernel.IsWow64Process2(kernel.GetCurrentProcess(), C.byref(process), C.byref(native)):
            WindowsIO._error()
        if process.value != 0 or native.value != 0x8664:  # native AMD64, no emulation
            raise ValueError('Windows helpers currently support native x64 Windows only')
        if (C.sizeof(UNICODE_STRING), C.sizeof(OBJECT_ATTRIBUTES), C.sizeof(IO_STATUS_BLOCK),
                RENAME_INFO.FileName.offset, DIRECTORY_INFO.FileName.offset) != (16, 48, 16, 20, 104):
            raise ValueError('Unsupported Windows ABI layout')

    def _bind(self):
        def bind(dll, name, args, result=I32):
            function = getattr(dll, name)
            function.argtypes, function.restype = args, result
        bind(self.n, 'NtCreateFile', [C.POINTER(PTR), U32, C.POINTER(OBJECT_ATTRIBUTES),
                                     C.POINTER(IO_STATUS_BLOCK), PTR, U32, U32, U32, U32, PTR, U32])
        bind(self.n, 'RtlNtStatusToDosError', [I32], U32)
        bind(self.n, 'NtSetInformationFile', [PTR, C.POINTER(IO_STATUS_BLOCK), PTR, U32, I32])
        bind(self.k, 'CreateFileW', [C.c_wchar_p, U32, U32, PTR, U32, U32, PTR], PTR)
        bind(self.k, 'CloseHandle', [PTR])
        bind(self.k, 'GetFileInformationByHandleEx', [PTR, I32, PTR, U32])
        bind(self.k, 'SetFileInformationByHandle', [PTR, I32, PTR, U32])
        bind(self.k, 'GetFileType', [PTR], U32)
        bind(self.k, 'ReadFile', [PTR, PTR, U32, C.POINTER(U32), PTR])
        bind(self.k, 'WriteFile', [PTR, PTR, U32, C.POINTER(U32), PTR])
        bind(self.k, 'SetFilePointerEx', [PTR, I64, C.POINTER(I64), U32])
        bind(self.k, 'FlushFileBuffers', [PTR])
        bind(self.k, 'GetDriveTypeW', [C.c_wchar_p], U32)
        bind(self.k, 'QueryDosDeviceW', [C.c_wchar_p, PTR, U32], U32)
        bind(self.k, 'GetFinalPathNameByHandleW', [PTR, PTR, U32, U32], U32)
        bind(self.k, 'GetVolumeInformationByHandleW', [PTR, PTR, U32, C.POINTER(U32),
                                                     C.POINTER(U32), C.POINTER(U32), PTR, U32])
        bind(self.k, 'GetCurrentProcess', [], PTR)
        bind(self.k, 'LocalFree', [PTR], PTR)
        bind(self.a, 'OpenProcessToken', [PTR, U32, C.POINTER(PTR)])
        bind(self.a, 'GetTokenInformation', [PTR, I32, PTR, U32, C.POINTER(U32)])
        bind(self.a, 'ConvertSidToStringSidW', [PTR, C.POINTER(PTR)])
        bind(self.a, 'ConvertStringSecurityDescriptorToSecurityDescriptorW',
             [C.c_wchar_p, U32, C.POINTER(PTR), C.POINTER(U32)])

    @staticmethod
    def _raw(handle):
        if not isinstance(handle, Handle) or handle.closed:
            raise ValueError('A live owned Windows handle is required')
        return int(handle)

    @staticmethod
    def _error(code=None):
        code = C.get_last_error() if code is None else code
        # Keep the native number for precise handling, but no paths/source text.
        if code in (2, 3):
            error = FileNotFoundError(errno.ENOENT, 'Local entry does not exist')
        elif code in (80, 183):
            error = FileExistsError(errno.EEXIST, 'Local entry already exists')
        elif code in (5, 32, 33):
            error = PermissionError(errno.EACCES, 'Local entry is inaccessible or in use')
        elif code == 145:
            error = OSError(errno.ENOTEMPTY, 'Local directory is not empty')
        elif code == 267:
            error = NotADirectoryError(errno.ENOTDIR, 'Local entry is not a directory')
        else:
            error = OSError(code, 'Windows local I/O failed')
        error.winerror = code
        raise error

    def _ok(self, result):
        if not result:
            self._error()
        return result

    _component = staticmethod(validate_component)

    @staticmethod
    def normalize_path(value):
        return Path(str(validate_windows_path(value)))

    @staticmethod
    def name_key(name):
        # This is only an index hint; actual names/collisions use the filesystem.
        return name.casefold()

    def _current_user_sid(self):
        token = PTR()
        self._ok(self.a.OpenProcessToken(self.k.GetCurrentProcess(), 0x8, C.byref(token)))
        try:
            size = U32()
            self.a.GetTokenInformation(token, 1, None, 0, C.byref(size))
            if not size.value:
                self._error()
            buffer = C.create_string_buffer(size.value)
            self._ok(self.a.GetTokenInformation(token, 1, buffer, len(buffer), C.byref(size)))
            sid = PTR.from_buffer(buffer).value  # TOKEN_USER begins with SID_AND_ATTRIBUTES.Sid.
            string = PTR()
            self._ok(self.a.ConvertSidToStringSidW(sid, C.byref(string)))
            try:
                return C.wstring_at(string)
            finally:
                self.k.LocalFree(string)
        finally:
            self.k.CloseHandle(token)

    def _security(self, directory):
        inheritance = 'OICI' if directory else ''
        sddl = 'D:P' + ''.join(f'(A;{inheritance};FA;;;{sid})' for sid in (self._sid, 'SY', 'BA'))
        descriptor = PTR()
        self._ok(self.a.ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl, 1, C.byref(descriptor), None))
        return descriptor

    def _get(self, handle, kind, structure):
        result = structure()
        self._ok(self.k.GetFileInformationByHandleEx(self._raw(handle), kind, C.byref(result), C.sizeof(result)))
        return result

    def _checked(self, handle, directory=None):
        if self.k.GetFileType(self._raw(handle)) != 1:
            raise ValueError('Only regular local files and directories are supported')
        attributes = self._get(handle, 9, ATTRIBUTE_TAG_INFO).Attributes
        if attributes & (self._REPARSE | self._OFFLINE | self._RECALL):
            raise ValueError('Reparse points and remote placeholders are unsupported')
        actual_directory = bool(attributes & self._DIRECTORY)
        if directory is not None and actual_directory != directory:
            raise ValueError('Unexpected local entry type')
        if actual_directory:
            # FileCaseSensitiveInfo (Windows 10 1803+); inability to query is a refusal.
            flags = self._get(handle, 23, U32).value
            if flags & 1:
                raise ValueError('Case-sensitive Windows directories are unsupported')
        return 'directory' if actual_directory else 'file'

    def open_anchor(self, anchor):
        if not re.fullmatch(r'[A-Za-z]:\\', anchor):
            raise ValueError('A local drive-letter root is required')
        if self.k.GetDriveTypeW(anchor) != 3:  # DRIVE_FIXED
            raise ValueError('Windows helpers require a local fixed NTFS disk')
        target = C.create_unicode_buffer(32768)
        self._ok(self.k.QueryDosDeviceW(anchor[:2], target, len(target)))
        if not re.fullmatch(r'\\Device\\HarddiskVolume\d+', target.value, re.I):
            raise ValueError('Mapped, substituted and nonlocal drives are unsupported')
        # Bind the validated local NT volume, not a drive mapping that can change.
        trusted_root = '\\\\?\\GLOBALROOT' + target.value + '\\'
        raw = self.k.CreateFileW(trusted_root, self._DIRECTORY_ACCESS, 3, None, 3,
                                 0x02000000 | 0x00200000, None)
        if raw == C.c_void_p(-1).value:
            self._error()
        handle = Handle(raw)
        try:
            self._checked(handle, True)
            final = C.create_unicode_buffer(32768)
            count = self.k.GetFinalPathNameByHandleW(raw, final, len(final), 2)  # VOLUME_NAME_NT
            if not count or count >= len(final):
                self._error()
            if final.value.rstrip('\\').casefold() != target.value.casefold():
                raise ValueError('Windows drive root changed or is redirected')
            filesystem = C.create_unicode_buffer(32)
            self._ok(self.k.GetVolumeInformationByHandleW(raw, None, 0, None, None, None,
                                                         filesystem, len(filesystem)))
            if filesystem.value != 'NTFS':
                raise ValueError('Windows helpers require NTFS')
            return handle
        except BaseException:
            self.close(handle)
            raise

    def _open(self, parent, name, *, directory=None, create=False, private=False, access=None, share=None):
        self._component(name)
        # A directory can acquire a reparse tag without changing its file ID.
        # Rename sharing protection alone does not detect that mutation.
        self._checked(parent, True)
        encoded = name.encode('utf-16-le')
        text = C.create_string_buffer(encoded + b'\0\0')
        unicode = UNICODE_STRING(len(encoded), len(encoded) + 2, C.addressof(text))
        descriptor = self._security(directory is True) if create and private else None
        attributes = OBJECT_ATTRIBUTES(C.sizeof(OBJECT_ATTRIBUTES), self._raw(parent),
                                       C.pointer(unicode), 0x40, descriptor, None)
        status, result = IO_STATUS_BLOCK(), PTR()
        options = 0x00200000 | 0x20  # OPEN_REPARSE_POINT, SYNCHRONOUS_IO_NONALERT
        if directory is not None:
            options |= 0x1 if directory else 0x40
        if access is None:
            access = self._ATTR | self._SYNC
        if share is None:
            share = self._SHARE_ALL
        try:
            code = self.n.NtCreateFile(C.byref(result), access, C.byref(attributes), C.byref(status),
                                       None, 0x80, share, 2 if create else 1, options, None, 0)
        finally:
            if descriptor:
                self.k.LocalFree(descriptor)
        if code < 0:
            self._error(self.n.RtlNtStatusToDosError(code))
        handle = Handle(result.value)
        try:
            self._checked(parent, True)
            self._checked(handle, directory)
            return handle
        except BaseException:
            # Newly created files have no data yet. Delete our own entry if validation fails.
            if create:
                try:
                    self._delete(handle)
                except (OSError, ValueError):
                    pass
            self.close(handle)
            raise

    def open_dir(self, parent, name, *, share_delete=False):
        # Normal traversal pins ancestors against rename. A short-lived verifier
        # may reopen our own DELETE-capable created-directory handles; it only
        # compares identities and never creates, reads data or mutates entries.
        share = self._SHARE_ALL if share_delete else 3
        return self._open(parent, name, directory=True, access=self._DIRECTORY_ACCESS, share=share)

    def create_dir(self, parent, name, private=True):
        return self._open(parent, name, directory=True, create=True, private=private,
                          access=self._DIRECTORY_ACCESS | self._DELETE, share=3)

    def info(self, parent, name):
        handle = self._open(parent, name)
        try:
            return {'kind': self._checked(handle), 'identity': self.identity(handle)}
        finally:
            self.close(handle)

    def identity(self, handle):
        # Cached handles must not make an in-place reparse conversion invisible.
        self._checked(handle)
        result = self._get(handle, 18, ID_INFO)
        return result.VolumeSerialNumber, bytes(result.FileId)

    def list_names(self, handle):
        self._checked(handle, True)
        names, restart = [], True
        while True:
            buffer = C.create_string_buffer(65536)
            if not self.k.GetFileInformationByHandleEx(self._raw(handle), 11 if restart else 10,
                                                      buffer, len(buffer)):
                if C.get_last_error() == 18:  # ERROR_NO_MORE_FILES
                    return names
                self._error()
            restart = False
            offset = 0
            while True:
                start = DIRECTORY_INFO.FileName.offset
                if offset + start > len(buffer):
                    raise ValueError('Malformed Windows directory information')
                item = DIRECTORY_INFO.from_buffer_copy(buffer.raw[offset:offset + C.sizeof(DIRECTORY_INFO)])
                span = item.NextEntryOffset or (len(buffer) - offset)
                if (span < start or span > len(buffer) - offset or item.FileNameLength % 2
                        or item.FileNameLength > span - start):
                    raise ValueError('Malformed Windows directory information')
                name = buffer.raw[offset + start:offset + start + item.FileNameLength].decode('utf-16-le')
                if name not in ('.', '..'):
                    self._component(name)
                    if item.FileAttributes & (self._REPARSE | self._OFFLINE | self._RECALL):
                        raise ValueError('Reparse points and remote placeholders are unsupported')
                    names.append(name)
                if not item.NextEntryOffset:
                    break
                if item.NextEntryOffset % 8:
                    raise ValueError('Malformed Windows directory information')
                offset += item.NextEntryOffset

    def read_file(self, parent, name, limit):
        handle = self._open(parent, name, directory=False, access=self._READ | self._SYNC)
        try:
            return self.read_handle(handle, limit)
        finally:
            self.close(handle)

    def read_handle(self, handle, limit):
        self._checked(handle, False)
        if limit < 0 or self._get(handle, 1, STANDARD_INFO).EndOfFile > limit:
            raise ValueError('Local file exceeds the size limit')
        self._ok(self.k.SetFilePointerEx(self._raw(handle), 0, None, 0))
        pieces, total = [], 0
        while total <= limit:
            size = min(65536, limit + 1 - total)
            buffer, count = C.create_string_buffer(size), U32()
            self._ok(self.k.ReadFile(self._raw(handle), buffer, size, C.byref(count), None))
            if not count.value:
                return b''.join(pieces)
            total += count.value
            if total > limit:
                raise ValueError('Local file exceeds the size limit')
            pieces.append(buffer.raw[:count.value])
        raise ValueError('Local file exceeds the size limit')

    def _new_file(self, parent, name, private):
        parent_identity = self.identity(parent)
        handle = self._open(parent, name, directory=False, create=True, private=private,
                            access=self._READ | self._WRITE | self._DELETE | self._SYNC, share=1)
        handle.parent_identity = parent_identity
        return handle

    def _rename(self, handle, parent, name, replace):
        self._component(name)
        if getattr(handle, 'parent_identity', None) != self.identity(parent):
            raise ValueError('Rename must remain in the original directory')
        encoded = name.encode('utf-16-le')
        size = C.sizeof(RENAME_INFO) + len(encoded) + 2
        buffer = C.create_string_buffer(size)
        info = RENAME_INFO.from_buffer(buffer)
        info.Flags, info.RootDirectory, info.FileNameLength = int(replace), None, len(encoded)
        C.memmove(C.addressof(buffer) + RENAME_INFO.FileName.offset, encoded, len(encoded))
        # The native FileRenameInformation contract defines NULL RootDirectory
        # plus one basename as rename in the source object's current directory.
        # Do not substitute the Win32 wrapper: its relative-path rules differ.
        # https://learn.microsoft.com/windows-hardware/drivers/ddi/ntifs/ns-ntifs-_file_rename_information
        status = IO_STATUS_BLOCK()
        code = self.n.NtSetInformationFile(self._raw(handle), C.byref(status), buffer, len(buffer), 10)
        if code < 0:
            self._error(self.n.RtlNtStatusToDosError(code))

    def write_new(self, parent, name, data, private=True):
        self._component(name)
        temp = '.rabbit-hole-' + secrets.token_hex(12)
        handle = self._new_file(parent, temp, private)
        try:
            position = 0
            while position < len(data):
                chunk = data[position:position + 65536]
                buffer, count = C.create_string_buffer(chunk), U32()
                self._ok(self.k.WriteFile(self._raw(handle), buffer, len(chunk), C.byref(count), None))
                if count.value == 0:
                    raise OSError(errno.EIO, 'Windows write made no progress')
                position += count.value
            self._ok(self.k.FlushFileBuffers(self._raw(handle)))
            if self.read_handle(handle, len(data)) != data:
                raise OSError(errno.EIO, 'Local write verification failed')
            self._rename(handle, parent, name, False)
            return handle
        except BaseException:
            try:
                self._delete(handle)
            finally:
                self.close(handle)
            raise

    def replace_file(self, source_handle, source_parent, source_name, dest_parent, dest_name):
        if self.identity(source_parent) != self.identity(dest_parent):
            raise ValueError('Ledger replacement must stay in the same directory')
        if self.info(source_parent, source_name)['identity'] != self.identity(source_handle):
            raise ValueError('The staged ledger changed')
        if self.info(dest_parent, dest_name)['kind'] != 'file':
            raise ValueError('The ledger is not a regular file')
        self._rename(source_handle, dest_parent, dest_name, True)

    def _delete(self, handle):
        disposition = U8(1)
        self._ok(self.k.SetFileInformationByHandle(self._raw(handle), 4, C.byref(disposition), 1))

    def _remove(self, handle, parent, name, directory):
        current = self.info(parent, name)
        if current['identity'] != self.identity(handle) or current['kind'] != ('directory' if directory else 'file'):
            raise ValueError('Refusing to remove a replaced local entry')
        if directory and self.list_names(handle):
            raise OSError(errno.ENOTEMPTY, 'Local directory is not empty')
        self._delete(handle)
        # Finalize delete-pending before attempting to remove its parent.
        self.close(handle)

    def remove_file(self, handle, parent, name):
        self._remove(handle, parent, name, False)

    def remove_dir(self, handle, parent, name):
        self._remove(handle, parent, name, True)

    def lock_file(self, parent, name):
        return self._new_file(parent, name, True)

    def close(self, handle):
        if not isinstance(handle, Handle) or handle.closed:
            return
        self._ok(self.k.CloseHandle(int(handle)))
        handle.closed = True
