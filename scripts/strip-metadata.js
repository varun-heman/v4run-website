#!/usr/bin/env node
/**
 * strip-metadata.js — strips identifying EXIF/metadata (camera model, GPS
 * location, software, original timestamps, etc.) from gallery photos and
 * videos, and stamps in a deliberate, minimal copyright/source note
 * instead. Runs automatically from gen-gallery.js on every album asset
 * every time that script runs — there's no separate manual step.
 *
 * Images (JPEG/PNG): pure binary segment/chunk surgery, zero npm
 * dependencies — strips the existing EXIF/IPTC/comment segments and
 * writes a new, minimal EXIF block containing just ImageDescription,
 * Artist, and Copyright (ASCII-only, kept intentionally small).
 *
 * Video (mp4/webm/mov/m4v): shells out to ffmpeg (`-map_metadata -1` to
 * strip + `-c copy` to remux without re-encoding) if ffmpeg is on PATH.
 * If it isn't, this is skipped with a warning rather than failing the
 * build — there's no dependency-free way to rewrite container metadata
 * atoms safely by hand the way there is for JPEG/PNG.
 *
 * Idempotent: safe to run on every file every time (already-stripped
 * files are just re-stripped/re-stamped with the same values, harmless).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const COPYRIGHT = {
  description: 'Downloaded from v4.run',
  artist: 'Varun Hemachandran',
  copyright: '(c) Varun Hemachandran. All rights reserved.',
};

// ── JPEG ─────────────────────────────────────────────────────────────────

function buildMinimalExif({ description, artist, copyright }) {
  const tags = [
    [0x010e, description], // ImageDescription
    [0x013b, artist],      // Artist
    [0x8298, copyright],   // Copyright
  ].filter(([, v]) => v);

  const ifdStart = 8; // offset of IFD0, relative to the TIFF header start
  const ifdSize = 2 + tags.length * 12 + 4;
  const stringAreaStart = ifdStart + ifdSize;

  const strings = tags.map(([, val]) => Buffer.from(val + '\0', 'ascii'));
  let running = stringAreaStart;
  const offsets = strings.map((s) => {
    const o = running;
    running += s.length;
    return o;
  });

  const tiffHeader = Buffer.alloc(8);
  tiffHeader.write('II', 0, 'ascii'); // little-endian
  tiffHeader.writeUInt16LE(0x002a, 2); // TIFF magic
  tiffHeader.writeUInt32LE(ifdStart, 4);

  const ifd = Buffer.alloc(ifdSize);
  ifd.writeUInt16LE(tags.length, 0);
  tags.forEach(([tag], i) => {
    const e = 2 + i * 12;
    ifd.writeUInt16LE(tag, e);
    ifd.writeUInt16LE(2, e + 2); // type 2 = ASCII
    ifd.writeUInt32LE(strings[i].length, e + 4); // count incl. null terminator
    ifd.writeUInt32LE(offsets[i], e + 8);
  });
  ifd.writeUInt32LE(0, ifdSize - 4); // no next IFD

  return Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiffHeader, ifd, ...strings]);
}

function stripJpeg(buf, info = COPYRIGHT) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf; // not a JPEG

  const keep = [];
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) break; // malformed — bail out and return what we have
    const marker = buf[offset + 1];

    if (marker === 0xd9) { // EOI
      keep.push(buf.subarray(offset, offset + 2));
      offset += 2;
      break;
    }
    if (marker === 0xda) { // SOS — scan data has no further markers worth parsing; keep verbatim to EOF
      keep.push(buf.subarray(offset, buf.length));
      offset = buf.length;
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { // RSTn / TEM — no length
      keep.push(buf.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const length = buf.readUInt16BE(offset + 2);
    const segEnd = offset + 2 + length;
    const isExifOrXmp = marker === 0xe1; // APP1
    const isIptc = marker === 0xed; // APP13
    const isComment = marker === 0xfe; // COM
    if (!isExifOrXmp && !isIptc && !isComment) {
      keep.push(buf.subarray(offset, segEnd));
    }
    offset = segEnd;
  }

  const exifPayload = buildMinimalExif(info);
  const lenField = exifPayload.length + 2;
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, (lenField >> 8) & 0xff, lenField & 0xff]),
    exifPayload,
  ]);

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, ...keep]);
}

// ── PNG ──────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_STRIP_TYPES = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function stripPng(buf, info = COPYRIGHT) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return buf; // not a PNG

  const out = [PNG_SIG];
  let offset = 8;
  let insertedAfterIHDR = false;
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const chunkEnd = offset + 8 + len + 4;
    if (!PNG_STRIP_TYPES.has(type)) {
      out.push(buf.subarray(offset, chunkEnd));
    }
    if (type === 'IHDR' && !insertedAfterIHDR) {
      out.push(makeChunk('tEXt', Buffer.from(`Description\0${info.description}`, 'ascii')));
      out.push(makeChunk('tEXt', Buffer.from(`Author\0${info.artist}`, 'ascii')));
      out.push(makeChunk('tEXt', Buffer.from(`Copyright\0${info.copyright}`, 'ascii')));
      insertedAfterIHDR = true;
    }
    offset = chunkEnd;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

// ── Video (ffmpeg, best-effort) ───────────────────────────────────────────

let _ffmpegChecked = false;
let _ffmpegAvailable = false;
function hasFfmpeg() {
  if (_ffmpegChecked) return _ffmpegAvailable;
  _ffmpegChecked = true;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

function stripVideo(filePath, info = COPYRIGHT) {
  if (!hasFfmpeg()) return false;
  const tmp = filePath + '.tmp' + path.extname(filePath);
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y', '-i', filePath,
        '-map_metadata', '-1',
        '-metadata', `artist=${info.artist}`,
        '-metadata', `copyright=${info.copyright}`,
        '-metadata', `comment=${info.description}`,
        '-c', 'copy',
        tmp,
      ],
      { stdio: 'ignore' }
    );
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    console.warn(`  ⚠ ffmpeg metadata strip failed for ${path.basename(filePath)}: ${e.message}`);
    return false;
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────

const IMG_HANDLERS = { '.jpg': stripJpeg, '.jpeg': stripJpeg, '.png': stripPng };
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

// Processes one file in place. Returns true if it touched the file.
function processFile(filePath, info = COPYRIGHT) {
  const ext = path.extname(filePath).toLowerCase();
  if (IMG_HANDLERS[ext]) {
    const before = fs.readFileSync(filePath);
    const after = IMG_HANDLERS[ext](before, info);
    if (!after.equals(before)) fs.writeFileSync(filePath, after);
    return true;
  }
  if (VIDEO_EXTS.has(ext)) {
    return stripVideo(filePath, info);
  }
  return false; // svg/webp/gif/avif etc. — not handled, left as-is
}

module.exports = { COPYRIGHT, stripJpeg, stripPng, stripVideo, processFile, hasFfmpeg };

if (require.main === module) {
  // Manual one-off run: node scripts/strip-metadata.js <file> [file ...]
  const files = process.argv.slice(2);
  if (!files.length) {
    console.log('Usage: node scripts/strip-metadata.js <file> [file ...]');
    process.exit(1);
  }
  files.forEach((f) => {
    const touched = processFile(f);
    console.log(`${touched ? '✓ stripped' : '— skipped'}  ${f}`);
  });
}
