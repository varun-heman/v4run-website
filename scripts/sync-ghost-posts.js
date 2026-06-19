#!/usr/bin/env node
/**
 * sync-ghost-posts.js
 *
 * Full reconciliation against the Ghost Content API:
 *   - New posts are added
 *   - Deleted / unpublished posts are removed
 *   - URL or title changes are reflected
 *
 * Ghost-sourced entries are identified by `source: Seldon Crisis`.
 * All other entries in articles.md are treated as manually added and left untouched.
 *
 * Usage:
 *   GHOST_API_KEY=<key> node scripts/sync-ghost-posts.js
 *
 * Get the key from:
 *   Ghost Admin → Settings → Integrations → Add custom integration → Content API Key
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const GHOST_URL     = 'https://seldoncrisis.blog';
const GHOST_API_KEY = process.env.GHOST_API_KEY;
const ARTICLES_MD   = path.join(__dirname, '..', 'content', 'articles.md');
const GHOST_SOURCE  = 'Seldon Crisis'; // identifies Ghost entries in articles.md

if (!GHOST_API_KEY) {
  console.error('Error: GHOST_API_KEY environment variable is not set.');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function truncate(str, max = 280) {
  if (!str || str.length <= max) return str || '';
  const cut = str.slice(0, max).lastIndexOf(' ');
  return str.slice(0, cut > 0 ? cut : max) + '…';
}

/** Format a Ghost post as an articles.md block. */
function formatEntry(post) {
  const date  = post.published_at ? post.published_at.slice(0, 10) : '';
  const tags  = (post.tags || []).map(t => t.name).join(', ');
  const desc  = truncate(stripHtml(post.custom_excerpt || post.excerpt || ''));
  const thumb = post.feature_image || 'images/thumbs/placeholder.jpg';
  return [
    '---',
    `title: ${post.title}`,
    `source: ${GHOST_SOURCE}`,
    date  ? `date: ${date}`   : null,
    desc  ? `desc: ${desc}`   : null,
    `url: ${post.url}`,
    `thumb: ${thumb}`,
    tags  ? `tags: ${tags}`   : null,
  ].filter(Boolean).join('\n');
}

/**
 * Parse articles.md into:
 *   - header: the comment lines before the first ---
 *   - entries: array of { raw: string, isGhost: boolean }
 */
function parseArticlesMd(content) {
  // Split on block separators — each block starts with ---
  const parts  = content.split(/\n(?=---)/).map(s => s.trim()).filter(Boolean);
  let header   = '';
  const entries = [];

  for (const part of parts) {
    if (!part.startsWith('---')) {
      // These are the comment lines at the top
      header = part;
      continue;
    }
    const sourceMatch = part.match(/^source:\s*(.+)$/m);
    const isGhost = sourceMatch && sourceMatch[1].trim() === GHOST_SOURCE;
    entries.push({ raw: part, isGhost: !!isGhost });
  }

  return { header, entries };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiUrl =
    `${GHOST_URL}/ghost/api/content/posts/` +
    `?key=${GHOST_API_KEY}` +
    `&fields=title,slug,url,excerpt,custom_excerpt,published_at,feature_image` +
    `&include=tags` +
    `&order=published_at%20desc` +
    `&limit=all`;

  console.log('Fetching all published posts from Ghost…');
  let data;
  try {
    data = await fetchJson(apiUrl);
  } catch (err) {
    console.error('Ghost API error:', err.message);
    process.exit(1);
  }

  const ghostPosts = data.posts || [];
  console.log(`Fetched ${ghostPosts.length} published post(s) from Ghost.`);

  const mdContent = fs.readFileSync(ARTICLES_MD, 'utf8');
  const { header, entries } = parseArticlesMd(mdContent);

  const manualEntries = entries.filter(e => !e.isGhost);
  const oldGhostCount = entries.filter(e => e.isGhost).length;

  // Build fresh Ghost blocks (newest first — API already returns them that way)
  const ghostBlocks = ghostPosts.map(formatEntry);

  // Reconstruct: header → Ghost entries → manual entries
  const sections = [
    header,
    ...ghostBlocks,
    ...manualEntries.map(e => e.raw),
  ].filter(Boolean);

  const updated = sections.join('\n\n') + '\n';

  // Check if anything actually changed
  if (updated.trim() === mdContent.trim()) {
    console.log('No changes — articles.md is already up to date.');
    return;
  }

  const added   = ghostPosts.length - oldGhostCount;
  const removed = oldGhostCount - ghostPosts.length;
  if (added > 0)   console.log(`+${added} new post(s) added.`);
  if (removed > 0) console.log(`-${removed} post(s) removed or unpublished.`);
  if (added === 0 && removed === 0) console.log('Post metadata updated (URL, title, or tags changed).');

  fs.writeFileSync(ARTICLES_MD, updated, 'utf8');
  console.log('articles.md updated.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
