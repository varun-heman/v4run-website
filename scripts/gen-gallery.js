#!/usr/bin/env node
/**
 * gen-gallery.js — scans images/gallery/ and writes content/gallery.json
 *
 * Album structure:
 *   images/gallery/
 *     my-album/
 *       photo1.jpg
 *       clip1.mp4         ← local video — works just like a photo
 *       meta.md            ← optional metadata file
 *
 * meta.md format (one item per line):
 *   # comments ignored
 *   photo1.jpg       | Caption text       | 2026-06-01 | Bengaluru, India
 *   clip1.mp4        | A short clip       | 2026-06-02 |
 *   youtube:VIDEO_ID | A YouTube video    | 2026-06-03 | Mysore, India
 *
 * Fields: filename | caption | date | location  (all optional except filename)
 *
 * Local videos (.mp4/.webm/.mov/.m4v) are scanned from the album folder
 * exactly like images — no separate setup. There's no automatic poster
 * frame generation (no ffmpeg dependency); the browser shows the video's
 * own first frame as its thumbnail.
 *
 * YouTube videos aren't files on disk, so they're declared as a line in
 * meta.md instead, using `youtube:` as the "filename": either a bare
 * 11-character video ID (youtube:dQw4w9WgXcQ) or a full URL
 * (youtube:https://youtu.be/dQw4w9WgXcQ, .../watch?v=..., .../shorts/...).
 * Thumbnails come straight from YouTube's public thumbnail CDN — no API
 * key needed.
 *
 * Every image/video file actually in images/gallery/ also gets passed
 * through scripts/strip-metadata.js before the scan below — strips
 * identifying EXIF/container metadata (camera model, GPS, original
 * timestamps, etc.) and stamps in a copyright/source note instead. This
 * happens automatically every run; there's no separate manual step. See
 * that file for exactly what it touches and its image-format scope.
 *
 * images/inbox/ (the staging folder for new photos — see README) is
 * swept clean at the end of this run too, via scripts/clean-inbox.js.
 *
 * Run: node scripts/gen-gallery.js
 */

const fs   = require('fs');
const path = require('path');
const { processFile } = require('./strip-metadata');
const { cleanInbox }  = require('./clean-inbox');

const root       = path.join(__dirname, '..');
const galleryDir = path.join(root, 'images', 'gallery');
const outFile    = path.join(root, 'content', 'gallery.json');
const IMG_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const MAX_RECENT = 5;

// Pulls an 11-char YouTube video ID out of a bare ID or any common URL form.
function extractYouTubeId(raw) {
  const s = (raw || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function parseMeta(albumPath) {
  const file = path.join(albumPath, 'meta.md');
  const map       = {};   // filename → metadata, for real files
  const youtubes  = [];   // synthesized entries with no backing file
  if (!fs.existsSync(file)) return { map, youtubes };
  fs.readFileSync(file, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('|').map(s => s.trim());
    const key   = parts[0];
    if (!key) return;
    const fields = {
      caption:  parts[1] || '',
      date:     parts[2] || '',
      location: parts[3] || '',
    };
    if (/^youtube:/i.test(key)) {
      const id = extractYouTubeId(key.slice(key.indexOf(':') + 1));
      if (!id) {
        console.warn(`⚠ gen-gallery: couldn't parse YouTube ID from "${key}" in ${file}`);
        return;
      }
      youtubes.push({ type: 'youtube', youtubeId: id, src: `https://www.youtube.com/watch?v=${id}`, ...fields });
    } else {
      map[key] = fields;
    }
  });
  return { map, youtubes };
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

    const { map: meta, youtubes } = parseMeta(albumPath);

    const fileItems = fs.readdirSync(albumPath)
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return IMG_EXTS.has(ext) || VIDEO_EXTS.has(ext);
      })
      .sort()
      .map(f => {
        const m   = meta[f] || {};
        const ext = path.extname(f).toLowerCase();
        processFile(path.join(albumPath, f)); // strip EXIF/metadata, stamp copyright — see top of file
        return {
          type:     VIDEO_EXTS.has(ext) ? 'video' : 'image',
          src:      `images/gallery/${name}/${f}`,
          caption:  m.caption  || '',
          date:     m.date     || '',
          location: m.location || '',
        };
      });

    const photos = fileItems.concat(youtubes);

    if (!photos.length) return;

    // Cover should be an actual image where possible — prefer the first
    // photo/video (whatever sorts first) but fall back to the first item
    // that has a real thumbnail image if that one happens to be a video
    // with no poster (still fine since the front end renders a <video>
    // cover too, but images make a slightly crisper album tile).
    albums.push({
      id:     name,
      title:  titleCase(name),
      cover:  photos[0],
      count:  photos.length,
      photos,
    });
  });

// Recent: last MAX_RECENT items across all albums (last album, last files first)
const allPhotos = albums.flatMap(a => a.photos);
const recent    = allPhotos.slice(-MAX_RECENT).reverse();

const out = { albums, recent };
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
const videoCount   = allPhotos.filter(p => p.type === 'video').length;
const youtubeCount = allPhotos.filter(p => p.type === 'youtube').length;
console.log(`✓ gallery.json: ${albums.length} albums, ${allPhotos.length} items (${videoCount} local video${videoCount !== 1 ? 's' : ''}, ${youtubeCount} YouTube), ${recent.length} recent`);

const purged = cleanInbox();
if (purged) console.log(`✓ inbox cleared (${purged} item${purged !== 1 ? 's' : ''} removed)`);
