#!/usr/bin/env node
/**
 * gen-projects.js — generates a real, crawlable static page per project:
 *   projects/<slug>/index.html
 *
 * Source data:
 *   content/projects.md          — metadata (title, url, date, tags, thumb, status, slug)
 *   content/projects/<slug>.md   — long-form markdown write-up (optional)
 *
 * slug is optional in projects.md; falls back to a slugified title.
 *
 * Why this exists: project detail pages need a real, independent, canonical
 * URL (so search engines can index them and links can be shared directly),
 * not just a client-side route faked with the History API. This script runs
 * as part of the Netlify build (see netlify.toml) so every project gets its
 * own genuine HTML file, no server/backend required.
 *
 * The homepage (index.html) ALSO knows how to render this same content
 * in-app (see the project-detail-view code there) — when a visitor is
 * already on the site, clicking a project intercepts the navigation and
 * swaps this same markup into the page live, instead of doing a real page
 * load, so the background music/animation never gets interrupted. Visitors
 * arriving directly (search results, shared links, JS disabled) just get
 * this static file as a normal page. Both paths render the *same* HTML
 * structure (the #project-content element below) so they stay in sync.
 *
 * Run: node scripts/gen-projects.js
 */

const fs   = require('fs');
const path = require('path');

const root        = path.join(__dirname, '..');
const mdFile       = path.join(root, 'content', 'projects.md');
const bodiesDir    = path.join(root, 'content', 'projects');
const outRoot      = path.join(root, 'projects');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseProjectsMd(text) {
  return text.split(/\n---/)
    .map(block => {
      const obj = {};
      block.split('\n').forEach(line => {
        const m = line.match(/^(\w+)\s*:\s*(.+)/);
        if (m) {
          const k = m[1].trim(), v = m[2].trim();
          obj[k] = k === 'tags' ? v.split(',').map(t => t.trim()).filter(Boolean) : v;
        }
      });
      if (!obj.tags) obj.tags = [];
      return obj;
    })
    .filter(p => p.title);
}

// Minimal, dependency-free markdown → HTML. Supports the common subset:
// ## / ### headings, paragraphs, **bold**, *italic*, `code`, [text](url) links,
// and - / 1. lists. Good enough for project write-ups without pulling in a package.
function mdToHtml(md) {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inList = null; // 'ul' | 'ol' | null
  let para = [];

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function flushPara() {
    if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; }
  }
  function closeList() {
    if (inList) { html += `</${inList}>\n`; inList = null; }
  }

  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { flushPara(); closeList(); return; }

    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)/))) {
      flushPara(); closeList();
      const level = Math.min(m[1].length + 1, 6); // ## -> h3 inside the article body
      html += `<h${level}>${inline(m[2])}</h${level}>\n`;
    } else if ((m = line.match(/^[-*]\s+(.*)/))) {
      flushPara();
      if (inList !== 'ul') { closeList(); html += '<ul>\n'; inList = 'ul'; }
      html += `<li>${inline(m[1])}</li>\n`;
    } else if ((m = line.match(/^\d+\.\s+(.*)/))) {
      flushPara();
      if (inList !== 'ol') { closeList(); html += '<ol>\n'; inList = 'ol'; }
      html += `<li>${inline(m[1])}</li>\n`;
    } else {
      closeList();
      para.push(line);
    }
  });
  flushPara();
  closeList();
  return html;
}

function fmtDate(d) {
  if (!d) return '';
  const parsed = new Date(d + 'T00:00:00');
  if (isNaN(parsed)) return d;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function renderPage(p, bodyHtml) {
  const dateDisplay = fmtDate(p.date);
  const statusBadge = p.status
    ? `<span class="proj-detail__status proj-detail__status--${p.status}">${p.status}</span>`
    : '';
  const tagsHtml = (p.tags || [])
    .map(t => `<span class="proj-detail__tag">${t}</span>`)
    .join('');
  const liveButton = p.url
    ? `<a class="proj-detail__live" href="${p.url}" target="_blank" rel="noopener noreferrer">
        View Live Project <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </a>`
    : '';
  const desc = escapeAttr((p.description || '').slice(0, 200));
  const title = escapeAttr(p.title);

  // Same "v4run | <Page Title>" format the homepage uses — keeps every
  // generated page's <title>/og:title/twitter:title consistent automatically,
  // without needing to remember to match it by hand each time.
  const pageTitle = `v4run | ${title}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${desc}">
<meta name="view-transition" content="same-origin">
<meta property="og:type" content="article">
<meta property="og:site_name" content="v4run">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${desc}">
${p.thumb ? `<meta property="og:image" content="${escapeAttr(p.thumb)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pageTitle}">
<meta name="twitter:description" content="${desc}">
${p.thumb ? `<meta name="twitter:image" content="${escapeAttr(p.thumb)}">` : ''}
<link rel="canonical" href="https://v4.run/projects/${p.slug}/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.6.0/css/all.min.css">
<style>
:root{--bg:#080808;--fg:#e8e8e2;--fg-dim:rgba(232,232,226,.38);--fg-dimmer:rgba(232,232,226,.18);--accent:#b8f0d2;--mono:'Space Mono','Courier New',monospace;--sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
*{box-sizing:border-box;}
html,body{margin:0;width:100%;min-height:100%;background:var(--bg);color:var(--fg);font-family:var(--sans);}
body{opacity:0;animation:proj-fade-in .3s ease forwards;}
@keyframes proj-fade-in{to{opacity:1}}
a{color:inherit;text-decoration:none;}
.proj-detail{display:flex;min-height:100vh;}
.proj-detail__image{flex:0 0 50%;width:50%;height:100vh;position:fixed;left:0;top:0;overflow:hidden;background:#000;}
.proj-detail__image img{width:100%;height:100%;object-fit:cover;display:block;}
.proj-detail__content{flex:0 0 50%;width:50%;margin-left:50%;min-height:100vh;overflow-y:auto;padding:56px 64px 96px;}
.proj-detail__back,.proj-detail__back:link,.proj-detail__back:visited{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-dim);margin-bottom:36px;cursor:pointer;transition:color .2s;text-decoration:none;}
.proj-detail__back:hover{color:var(--accent);text-decoration:none;}
.proj-detail__back i{font-size:10px;}
.proj-detail__meta{display:flex;align-items:center;gap:10px;margin-bottom:16px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-dim);}
.proj-detail__status{padding:2px 8px;border:1px solid rgba(100,255,160,.35);border-radius:3px;color:rgba(100,255,160,.85);}
.proj-detail__status--archived{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.55);}
.proj-detail__status--wip{border-color:rgba(255,200,80,.35);color:rgba(255,200,80,.85);}
.proj-detail__title{font-family:var(--sans);font-size:34px;font-weight:600;line-height:1.2;margin:0 0 28px;color:var(--fg);}
.proj-detail__body{font-family:var(--sans);font-size:15px;line-height:1.75;color:rgba(232,232,226,.82);}
.proj-detail__body h2,.proj-detail__body h3{font-family:var(--sans);font-weight:600;color:var(--fg);margin:36px 0 14px;}
.proj-detail__body h2{font-size:20px;}
.proj-detail__body h3{font-size:17px;}
.proj-detail__body p{margin:0 0 18px;}
.proj-detail__body a,.proj-detail__body a:link,.proj-detail__body a:visited{position:relative;color:var(--accent);text-decoration:none;background-image:linear-gradient(rgba(100,255,160,.5),rgba(100,255,160,.5));background-repeat:no-repeat;background-position:0 100%;background-size:100% 1px;transition:background-size .25s cubic-bezier(.16,1,.3,1),color .2s ease,text-shadow .25s ease;}
.proj-detail__body a:hover{color:#d8ffe9;background-size:100% 2px;text-shadow:0 0 10px rgba(100,255,160,.6);animation:proj-link-jitter .22s steps(2,end);}
@keyframes proj-link-jitter{0%,100%{transform:translateX(0)}20%{transform:translateX(-1px)}40%{transform:translateX(1px)}60%{transform:translateX(-1px)}80%{transform:translateX(1px)}}
@media (prefers-reduced-motion: reduce){.proj-detail__body a:hover{animation:none;}}
.proj-detail__body ul,.proj-detail__body ol{margin:0 0 18px;padding-left:22px;}
.proj-detail__body li{margin-bottom:6px;}
.proj-detail__body code{font-family:var(--mono);font-size:13px;background:rgba(255,255,255,.06);padding:2px 5px;border-radius:3px;}
.proj-detail__tags{display:flex;flex-wrap:wrap;gap:6px;margin:32px 0 0;}
.proj-detail__tag{font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border:1px solid rgba(255,255,255,.18);border-radius:20px;color:rgba(255,255,255,.62);}
.proj-detail__live,.proj-detail__live:link,.proj-detail__live:visited{display:inline-flex;align-items:center;gap:8px;margin-top:28px;padding:10px 18px;border:1px solid rgba(100,255,160,.4);border-radius:3px;color:rgb(100,255,160);font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;transition:background .2s,border-color .2s;}
.proj-detail__live:hover{background:rgba(100,255,160,.08);border-color:rgba(100,255,160,.7);text-decoration:none;}
@media (max-width:768px){
  .proj-detail{display:block;}
  .proj-detail__image{position:static;width:100%;height:auto;max-height:42vh;}
  .proj-detail__content{margin-left:0;width:100%;min-height:0;overflow-y:visible;padding:28px 20px 56px;}
  .proj-detail__title{font-size:25px;}
}
/* Page transition for real cross-document navigation to/from the homepage
   (View Transitions API, enabled by the view-transition meta tag above) —
   mirrors the same keyframes in index.html so the effect looks identical
   no matter which side of the navigation this document is on. */
::view-transition-old(root){animation:v4-vt-out .4s cubic-bezier(.4,0,1,1) both;}
::view-transition-new(root){animation:v4-vt-in .48s cubic-bezier(.16,1,.3,1) both;}
@keyframes v4-vt-out{0%{clip-path:polygon(0% 0%,100% 0%,109% 100%,0% 100%);filter:invert(0) hue-rotate(0deg) saturate(1);}35%{clip-path:polygon(0% 0%,100% 0%,109% 100%,0% 100%);filter:invert(.85) hue-rotate(45deg) saturate(2.2);}100%{clip-path:polygon(100% 0%,100% 0%,109% 100%,100% 100%);filter:invert(1) hue-rotate(90deg) blur(4px);}}
@keyframes v4-vt-in{0%{clip-path:polygon(0% 0%,0% 0%,-9% 100%,0% 100%);filter:invert(1) hue-rotate(-70deg) saturate(2);}50%{clip-path:polygon(0% 0%,58% 0%,49% 100%,0% 100%);filter:invert(.4) hue-rotate(-25deg) saturate(1.8);}100%{clip-path:polygon(0% 0%,109% 0%,100% 100%,0% 100%);filter:invert(0) hue-rotate(0deg) saturate(1);}}
@media (prefers-reduced-motion: reduce){::view-transition-old(root),::view-transition-new(root){animation:none !important;}}
</style>
</head>
<body>
<main id="project-content" data-slug="${p.slug}">
  <div class="proj-detail">
    <div class="proj-detail__image">${p.thumb ? `<img src="${escapeAttr(p.thumb)}" alt="">` : ''}</div>
    <div class="proj-detail__content">
      <a class="proj-detail__back" href="/#projects"><i class="fa-solid fa-arrow-left"></i> Projects</a>
      <div class="proj-detail__meta">
        ${dateDisplay ? `<span>${dateDisplay}</span>` : ''}
        ${statusBadge}
      </div>
      <h1 class="proj-detail__title">${title}</h1>
      <div class="proj-detail__body">${bodyHtml || `<p>${escapeAttr(p.description || '')}</p>`}</div>
      ${tagsHtml ? `<div class="proj-detail__tags">${tagsHtml}</div>` : ''}
      ${liveButton}
    </div>
  </div>
</main>
</body>
</html>
`;
}

if (!fs.existsSync(mdFile)) {
  console.log('gen-projects: no content/projects.md found, skipping.');
  process.exit(0);
}

const projects = parseProjectsMd(fs.readFileSync(mdFile, 'utf8'));
let written = 0;

projects.forEach(p => {
  p.slug = p.slug || slugify(p.title);
  if (!p.slug) return;

  const bodyFile = path.join(bodiesDir, `${p.slug}.md`);
  const bodyMd   = fs.existsSync(bodyFile) ? fs.readFileSync(bodyFile, 'utf8') : '';
  const bodyHtml = mdToHtml(bodyMd);

  const outDir  = path.join(outRoot, p.slug);
  const outFile = path.join(outDir, 'index.html');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, renderPage(p, bodyHtml));
  written++;
});

console.log(`✓ gen-projects: ${written} project page(s) written to /projects/<slug>/`);

// ── sitemap.xml ────────────────────────────────────────────────────────────
// Only includes URLs that are real, independently loadable pages: the
// homepage and each project's canonical address. The rest of the site
// (writing, reads, pics, about, etc.) lives behind client-side overlays on
// the homepage with no distinct crawlable URL of their own, so they don't
// belong here — listing them would just point crawlers at duplicate/empty
// content.
const SITE = 'https://v4.run';

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod    ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority   ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

const urls = [
  urlEntry(`${SITE}/`, { changefreq: 'weekly', priority: '1.0' }),
  ...projects
    .filter(p => p.slug)
    .map(p => urlEntry(`${SITE}/projects/${p.slug}/`, {
      lastmod: p.date || undefined,
      changefreq: 'monthly',
      priority: '0.8',
    })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
console.log(`✓ gen-projects: sitemap.xml written with ${urls.length} URL(s)`);

// ── robots.txt ───────────────────────────────────────────────────────────
// Created only if one doesn't already exist, so it never clobbers hand
// edits — it just points crawlers at the sitemap above.
const robotsFile = path.join(root, 'robots.txt');
if (!fs.existsSync(robotsFile)) {
  fs.writeFileSync(robotsFile, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log('✓ gen-projects: robots.txt created');
}
