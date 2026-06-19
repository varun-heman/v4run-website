#!/usr/bin/env node
/**
 * sync-ghost-posts.js
 *
 * Fetches published posts from seldoncrisis.blog via the Ghost Content API,
 * compares against content/articles.md, and prepends any new entries at the top.
 *
 * Usage:
 *   GHOST_API_KEY=<your_key> node scripts/sync-ghost-posts.js
 *
 * The Ghost Content API key lives in:
 *   Ghost Admin → Settings → Integrations → Add custom integration
 * It's a read-only public key — safe to store as a GitHub Actions secret.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────────

const GHOST_URL     = 'https://seldoncrisis.blog';
const GHOST_API_KEY = process.env.GHOST_API_KEY;
const ARTICLES_MD   = path.join(__dirname, '..', 'content', 'articles.md');

if (!GHOST_API_KEY) {
  console.error('Error: GHOST_API_KEY environment variable is not set.');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        } else {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
        }
      });
    }).on('error', reject);
  });
}

/**
 * Truncate a string to maxLen chars at a word boundary, add ellipsis if cut.
 */
function truncate(str, maxLen = 280) {
  if (!str || str.length <= maxLen) return str || '';
  const cut = str.slice(0, maxLen).lastIndexOf(' ');
  return str.slice(0, cut > 0 ? cut : maxLen) + '…';
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Format a Ghost post object into an articles.md block.
 */
function formatEntry(post) {
  const date  = post.published_at ? post.published_at.slice(0, 10) : '';
  const tags  = (post.tags || []).map(t => t.name).join(', ');
  const desc  = truncate(stripHtml(post.excerpt || post.custom_excerpt || ''));
  const thumb = post.feature_image || 'images/thumbs/placeholder.jpg';

  return [
    '---',
    `title: ${post.title}`,
    `source: Seldon Crisis`,
    date  ? `date: ${date}`   : null,
    desc  ? `desc: ${desc}`   : null,
    `url: ${post.url}`,
    `thumb: ${thumb}`,
    tags  ? `tags: ${tags}`   : null,
  ].filter(Boolean).join('\n');
}

/**
 * Parse all URLs already in articles.md so we can skip duplicates.
 */
function existingUrls(mdContent) {
  const urls = new Set();
  for (const line of mdContent.split('\n')) {
    const m = line.match(/^url:\s*(.+)/);
    if (m) urls.add(m[1].trim());
  }
  return urls;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Ghost Content API — fetch all published posts, newest first, with tags
  const apiUrl =
    `${GHOST_URL}/ghost/api/content/posts/` +
    `?key=${GHOST_API_KEY}` +
    `&fields=title,slug,url,excerpt,custom_excerpt,published_at,feature_image` +
    `&include=tags` +
    `&order=published_at%20desc` +
    `&limit=50`;

  console.log('Fetching posts from Ghost…');
  let data;
  try {
    data = await fetchJson(apiUrl);
  } catch (err) {
    console.error('Failed to fetch from Ghost API:', err.message);
    process.exit(1);
  }

  const posts = data.posts || [];
  console.log(`Fetched ${posts.length} posts from Ghost.`);

  const mdContent = fs.readFileSync(ARTICLES_MD, 'utf8');
  const known     = existingUrls(mdContent);

  const newPosts = posts.filter(p => p.url && !known.has(p.url));
  if (!newPosts.length) {
    console.log('No new posts found. articles.md is up to date.');
    return;
  }

  console.log(`Found ${newPosts.length} new post(s):`);
  newPosts.forEach(p => console.log(`  + ${p.title} (${p.published_at?.slice(0,10)})`));

  // New posts newest-first, then existing content
  const newBlocks = newPosts.map(formatEntry).join('\n\n');

  // Inject after the header comments, before the first existing entry
  const headerEnd = mdContent.indexOf('\n---');
  let updated;
  if (headerEnd === -1) {
    // No existing entries yet — just append
    updated = mdContent.trimEnd() + '\n\n' + newBlocks + '\n';
  } else {
    updated =
      mdContent.slice(0, headerEnd).trimEnd() +
      '\n\n' + newBlocks +
      '\n\n' + mdContent.slice(headerEnd + 1).trimStart();
  }

  fs.writeFileSync(ARTICLES_MD, updated, 'utf8');
  console.log(`articles.md updated with ${newPosts.length} new post(s).`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
