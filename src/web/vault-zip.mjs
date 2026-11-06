import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Stored ZIP entries, UTF-8 paths and a fixed 1980-01-01 timestamp. Only public
// Markdown files are eligible; symlinks, hidden files and private inputs are not.
export function createVaultZip(directory) {
  const entries = [];
  function walk(parts = []) {
    for (const entry of readdirSync(join(directory, ...parts), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (entry.name.startsWith('.')) continue;
      const path = [...parts, entry.name];
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) entries.push([path.join('/'), readFileSync(join(directory, ...path))]);
    }
  }
  walk();
  if (!entries.some(([name]) => name === 'README.md')) throw new Error('Public vault needs README.md');
  const local = [], central = [];
  let offset = 0;
  for (const [path, data] of entries) {
    const name = Buffer.from(path);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12); header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20, 4);
    header.copy(record, 6, 4, 30); record.writeUInt32LE(offset, 42);
    local.push(header, name, data); central.push(record, name);
    offset += header.length + name.length + data.length;
  }
  const directoryBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directoryBytes, end]);
}
