#!/usr/bin/env node
/**
 * gen-gallery.js — scans images/gallery/ and writes content/gallery.json
 *
 * Album structure:
 *   images/gallery/
 *     my-album/
 *       photo1.jpg
 *       photo2.jpg
 *       meta.md          ← optional metadata file
 *
 * meta.md format (one photo per line):
 *   # comments ignored
 *   photo1.jpg | Caption text | 2026-06-01 | Bengaluru, India
 *   photo2.jpg | Another caption | |
 *
 * Fields: filename | caption | date | location  (all optional except filename)
 *
 * Run: node scripts/gen-gallery.js
 */

const fs   = require('fs');
const path = require('path');

const root       = path.join(__dirname, '..');
const galleryDir = path.join(root, 'images', 'gallery');
const outFile    = path.join(root, 'content', 'gallery.json');
const IMG_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const MAX_RECENT = 20;

function parseMeta(albumPath) {
  const file = path.join(albumPath, 'meta.md');
  const map  = {};
  if (!fs.existsSync(file)) return map;
  fs.readFileSync(file, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts    = line.split('|').map(s => s.trim());
    const filename = parts[0];
    if (!filename) return;
    map[filename] = {
      caption:  parts[1] || '',
      date:     parts[2] || '',
      location: parts[3] || '',
    };
  });
  return map;
}

function titleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

const albums = [];

fs.readdirSync(galleryDir)
  .sort()
  .forEach(name => {
    const albumPath = path.join(galleryDir, name);
    if (!fs.statSync(albumPath).isDirectory()) return;

    const meta   = parseMeta(albumPath);
    const photos = fs.readdirSync(albumPath)
      .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => {
        const m = meta[f] || {};
        return {
          src:      `images/gallery/${name}/${f}`,
          caption:  m.caption  || '',
          date:     m.date     || '',
          location: m.location || '',
        };
      });

    if (!photos.length) return;

    albums.push({
      id:     name,
      title:  titleCase(name),
      cover:  photos[0].src,
      count:  photos.length,
      photos,
    });
  });

// Recent: last MAX_RECENT photos across all albums (last album, last files first)
const allPhotos = albums.flatMap(a => a.photos);
const recent    = allPhotos.slice(-MAX_RECENT).reverse();

const out = { albums, recent };
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`✓ gallery.json: ${albums.length} albums, ${allPhotos.length} photos, ${recent.length} recent`);
