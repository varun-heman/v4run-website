# v4run — personal site

Personal site for [v4.run](https://v4.run), built as a single HTML file with no framework, no bundler — just two small pre-deploy Node scripts (gallery scan + project page generation).

## What it is

A dark, minimal personal page built around a Three.js dot-sphere animation. The sphere is the background — always present, always moving. Everything else sits on top of it.

Key visual details:

- **Dot sphere** — WebGL particle system rendered with Three.js. ~5,000 points on a sphere surface (2,200 on mobile), connected by proximity lines. Reacts to mouse hover with a wave/bang effect.
- **Big bang intro** — on first page load the sphere expands outward from a central point; all UI fades in after the animation settles (~2.6s). Accompanied by `audio/big_bang.mp3`.
- **Logo glitch** — the `v4run` wordmark cycles between `v4run`, `varun`, and `v4.run` at random intervals with an RGB chromatic aberration burst. Hovering the logo area pauses the cycle and typewriters out the full name `varun hemachandran`, then resumes cycling on mouse-out.
- **Bio** — a short bio paragraph sits below the logo in the top-left corner (hidden on mobile).
- **Photo popup** — hovering near the logo reveals a photo box that follows the cursor, connected to the logo by an elbowed SVG line with a travelling light pulse. The image has a matrix-green CRT filter and TV flicker effect. Disabled on mobile and when a modal is open.
- **Shoal of fish** — when a modal is open, the sphere dots flow tangentially around the modal zone in two counter-rotating streams, like a shoal of fish parting around an obstacle. On desktop, the sphere is visible behind the modal (raised above the dark scrim via z-index).
- **Typewriter quotes** — the sphere centre types out quotes one character at a time (with human-like timing jitter and occasional mistypes), holds, then deletes them. During the hold, the same letter-scramble and RGB chromatic aberration glitch effects run as on nav hints. Starts after the bang animation clears. Quotes own the centre while the page is idle (60s+ with no mouse movement, or the mouse off the page); a brief glitching "loading words I live by..." preloader plays on every hand-back to quotes, and at least one full quote is guaranteed to play before control can switch away again.
- **Memory fog** (desktop, fine-pointer only) — while the mouse is actively moving, the sphere centre instead shows a slow-drifting collage of photos and short video clips pulled from gallery items tagged `memfog` (see "Gallery metadata" below). Each card gets a green colour tint, an aggressive Ken Burns zoom/pan, and no caption. A one-time, ~8s glitching preloader plays the first time it activates in a session. Automatically suspended whenever any modal/overlay is open. Disabled on touch devices, narrow viewports, and under `prefers-reduced-motion`.
- **Article carousel** — a bottom strip of writing cards that auto-scrolls left, supports drag with momentum fling, and loops infinitely via DOM recycling (no offset jump). Cards expand on hover to reveal a description, with tags pinned to the bottom; non-hovered cards dim. Hidden on mobile.
- **Static noise overlay** — a very faint, fine-grain film noise canvas overlaid on the full page.
- **Pulsating heart** — a red Font Awesome heart icon in the footer pulses continuously with a heartbeat animation.
- **HUD boot flourish** — a handful of clean, right-angle SVG traces "laser in" toward upcoming UI (nav, corners, and the carousel on desktop), each led by a bright travelling dot, alongside `audio/hud_in.mp3`. Plays once per page load, right as the UI settles in after the bang (see "First-visit experience"), for both first-time and return visitors. Which targets light up, their exact shape, and timing vary a little each run. Respects `prefers-reduced-motion`.
- **Random screen glitch** — an unrelated, more frequent (every ~7–19s) full-viewport RGB-split/corrupted-block burst, also gated the same way.

## First-visit experience

A CRT-style power-on animation (a single point expanding to fill the screen) plays on every fresh load of the root page — first-time and returning visitors alike — before anything else runs. It's skipped for deep links (which need to land on their target immediately) and under `prefers-reduced-motion`.

On the very first visit to the root domain, a terminal-style **access gate** is shown before the page is usable (after the CRT-on animation clears):

- Displays "You are entering the private space of VARUN" — the name cycles through `VARUN → v4run → v4.run` with a fast RGB glitch + VHS skew distortion animation.
- **Exit** button opens a YouTube link in a new tab and closes the current one.
- **Proceed** button dismisses the gate. The background music (`audio/bg_score.mp3`) starts immediately at low volume. A blinking green cursor appears for ~2 seconds, then the typewriter intro sequence begins (each keystroke is a synthesized square-wave click via Web Audio API).
- After the intro finishes, the big bang triggers, the main UI fades in, and the HUD boot flourish plays (see "What it is" above).
- Pressing **Escape** at any point during the typewriter intro skips straight to the big bang — useful for return visitors who clear their cookie, or anyone who just doesn't want to wait.
- The gate and intro are skipped for return visitors (cookie `v4run_v=1`) — they still get the CRT-on animation above, and background music now starts automatically for them too (see "Music"). Visitors arriving via a **deep link** (any URL with a hash) also skip the gate and are marked as visited immediately — the linked panel opens directly.
- A **Replay Intro** button (bottom-right corner, next to the Music toggle) clears the visited cookie and reloads the page, so the gate + typewriter intro can be watched again without clearing cookies by hand.

## Nav behaviour

- **Writing** — clicking opens the full "View All" writing overlay (with year/tag filters).
- **Reads** — clicking opens the Recommended Reads overlay (vertically scrollable link list with descriptions).
- **Projects** — clicking opens the Projects overlay. Each project row is a hoverable card — transparent border at rest, green box highlight + background tint on hover, with a green border flash animation on open.
- **Memories** — opens the photo gallery overlay. Nav key/deep-link slug is `memories`.
- **NEW badges** — a green dot appears next to a nav item when any of its content was published within the last 60 days (Reads uses a 2-month window). Individual new items also carry a NEW badge.
- All nav items are **deep-linkable** — `/#about`, `/#work`, `/#projects`, `/#writing`, `/#reads`, `/#memories` open their panels directly. Browser back/forward navigation works.
- On **desktop**, Writing, Reads, and Memories are in the nav bar. On **mobile**, they are appended as extra nav items at the bottom.

## Social dock

The `Contact Me` label in the bottom-left corner reveals social icons on hover. Icons slide out to the right with a staggered spring animation. Platform is auto-detected from the URL in `content/social.md`. The email icon is always visible; all others are pulled from the social links file. Hovering an icon shows its handle in a small tooltip above it.

## Contact

Clicking the email icon in the social dock opens a modal with a Netlify form (name, email, message). An opt-in checkbox lets visitors subscribe to email updates.

After a successful submission, the confirmation message stays in the modal until the visitor closes it themselves (× button, clicking outside, or Escape) — it does not auto-dismiss.

Anti-spam measures:
- **Honeypot field** — a hidden `bot-field` input that bots auto-fill; Netlify silently drops those submissions server-side, and the client also checks it.
- **Timing check** — submissions sent in under 3 seconds are silently rejected (bots submit instantly).
- **Strict email validation** — regex requiring a valid local part, domain with at least one dot, TLD of 2+ characters, and no consecutive dots. Error shown inline on blur.

## Music

Background music (`audio/bg_score.mp3`) starts automatically for everyone — first-time visitors when Proceed is clicked on the access gate, returning visitors as soon as the page loads. A music toggle in the bottom-right corner (in the same pill-style row as the Replay Intro button) shows a Font Awesome play/stop icon (green when playing, red when stopped) next to a "Music On/Off" label; the animated equaliser bars hide when muted.

Turning music off also mutes every other sound effect on the site, not just the score — the HUD boot flourish, the big bang, and the button-hover click (`audio/button_hover.mp3`, played on hovering nav items and the access gate's Exit/Proceed buttons).

## Recommended Reads

A curated link-sharing section for content not authored by Varun. Defined in `content/reads.md` using a simple key-value format (one entry per `---` separator):

```
title: Article title
url: https://...
source: Publication name
date: 2026-05-15
tags: tag1, tag2
description: Why this is worth reading, in your own words.
```

Items published within 2 months show a NEW badge. The overlay is filterable by tag.

## Photo gallery

The Memories overlay has three views:

1. **Recent** — last 5 items across all albums, in a 5-column grid.
2. **Albums** — auto-scanned from `images/gallery/` subdirectories.
3. **Album view** — all items in an album, with a back button.

Albums can mix photos, local video clips, and YouTube videos freely — they all sit in the same grid and open in the same lightbox.

Clicking any thumbnail opens an immersive **lightbox** (full-screen, black background). Photos and local videos use `object-fit: contain`; YouTube opens in a boxed 16:9 embed. Caption, date, and location are overlaid at the bottom with a gradient. Arrow keys and click to navigate — moving to the next/previous item or closing the lightbox always stops whatever video was playing.

Hovering a thumbnail reveals a slide-up overlay with the caption and metadata chips. Local video thumbnails autoplay a short (~3s), muted, controls-free loop centred on the clip's midpoint once scrolled into view, so they read as moving previews rather than static frames; YouTube thumbnails keep a static play-icon badge instead. Inside the lightbox, videos get their own centred play/pause button that pops in on click and fades out shortly after playback starts.

### Gallery metadata

Each album lives in `images/gallery/<album-name>/`. An optional `meta.md` file in each album provides per-item metadata:

```
# filename | caption | date (YYYY-MM-DD) | location | tags
quiet-beach-path.jpg | Empty places hold the loudest memories. | 2021-01-08 | Goa, India | memfog
trail-dogs-walk.mp4  | A short clip from the same morning       | 2021-01-08 |            |
youtube:dQw4w9WgXcQ  | A YouTube video                          | 2021-01-09 | Mysore, India |
```

Dates, locations, and tags are optional — just leave the field blank.

**Tags** are a comma-separated list (`tags`, `tag1, tag2`) and are never shown anywhere on the front end — no chip, no caption text, purely backend metadata. The one tag the site actually reads is **`memfog`**: the memory-fog drift effect on the homepage only pulls from photos/videos tagged with it, instead of from the whole gallery. Tag whichever items you want eligible; if nothing's tagged yet, memory fog just stays empty until you do. See `loadPhotos()` in `index.html`'s memory-fog section.

**Local videos** (`.mp4`, `.webm`, `.mov`, `.m4v`) just sit in the album folder alongside photos — no separate setup. There's no automatic poster-frame generation; the browser shows the video's own first frame as its thumbnail.

**YouTube videos** aren't files on disk, so they're declared as a `meta.md` line instead, using `youtube:` in place of a filename — either a bare 11-character video ID or a full URL (`youtube:https://youtu.be/dQw4w9WgXcQ`, `.../watch?v=...`, or `.../shorts/...` all work). Thumbnails come from YouTube's public thumbnail CDN, no API key needed.

### File naming convention

Gallery filenames are **2-3 descriptive words about the photo's content, lowercase, hyphen-separated** — e.g. `quiet-beach-path.jpg`, `golden-retriever-gaze.jpg`. No sequential numbers (`photo-01.jpg`, `photo-02.jpg`, …): a gap left by a deleted file in a numbered sequence is obvious at a glance, a descriptive name doesn't have that problem and is easier to recognise later when skimming a folder. Keep them short and avoid literally restating the caption — the filename is just a handle, the caption carries the actual feeling.

### Adding photos

There's a staging folder for this: drop new images (and/or videos) into `images/inbox/`, then have whoever's organising (a person, or an assistant working from this repo) sort them into the right album under `images/gallery/`, renaming each per the convention above and adding its `meta.md` line. `images/inbox/` is gitignored and gets swept empty automatically every time `gen-gallery.js` runs (see below) — `scripts/clean-inbox.js` does this and can also be run standalone (`node scripts/clean-inbox.js`).

### Privacy & copyright on gallery assets

Every file actually inside `images/gallery/*/` — not the inbox, the published albums — gets run through `scripts/strip-metadata.js` automatically, every time `gen-gallery.js` runs. It:

- Strips identifying EXIF/container metadata: camera model, GPS location, original capture software/timestamps, etc.
- Stamps in a minimal copyright note instead — `ImageDescription: Downloaded from v4.run`, `Artist: Varun Hemachandran`, `Copyright: (c) Varun Hemachandran. All rights reserved.` for images (real EXIF tags, hand-built with zero npm dependencies — readable by Preview, Photos, exiftool, etc.), and equivalent `artist`/`copyright`/`comment` container tags for video via `ffmpeg -map_metadata -1 -c copy` (remux only, no re-encode, so quality is untouched).
- Covers JPEG and PNG for images, and `.mp4`/`.webm`/`.mov`/`.m4v` for video (via ffmpeg, skipped with a console warning if ffmpeg isn't on `PATH` — there's no dependency-free way to rewrite container metadata atoms by hand the way there is for JPEG/PNG segments). WebP/GIF/AVIF/SVG aren't currently handled.
- Is idempotent and runs unconditionally on every asset every time — safe to re-run, nothing to track.

So: **this is automatic**, not a manual step — it's baked into the same `gen-gallery.js` run you already do before every deploy. Nothing extra to remember.

### Gallery build step

The gallery JSON is generated pre-deploy by `scripts/gen-gallery.js`. It strips/stamps metadata on every album asset (above), scans `images/gallery/*/` for image and video files, parses each album's `meta.md` for YouTube entries, writes `content/gallery.json` with all albums and the 5 most recent items, then purges `images/inbox/`.

`netlify.toml` wires this up automatically on Netlify. For local testing, run:

```bash
node scripts/gen-gallery.js
```

## Project pages

Each entry in `content/projects.md` gets its own real, independent page at `v4.run/projects/<slug>/` — a genuine static HTML file, not a client-side route. This matters for two things a single-page app can't do on its own: search engines can index each project individually, and a project link can be shared/opened directly with a proper page (title, description, OG/Twitter image) already in place.

**Adding a project:**

1. Add an entry to `content/projects.md` (same `key: value` block format as the rest of the content files — see the format comment at the top of the file). `slug` is optional; if you leave it out it's generated automatically from the title (lowercased, spaces → hyphens). Set it explicitly if you ever plan to rename the title later, so the URL doesn't shift under anyone who already has it bookmarked or shared.
2. Write the long-form write-up as plain markdown in `content/projects/<slug>.md` (headings, paragraphs, bold/italic, links, lists — a small dependency-free converter handles it, not a full markdown spec, so keep formatting simple). This is optional; if the file doesn't exist, the page just falls back to showing the short `description` from `projects.md`.
3. Run `node scripts/gen-projects.js` (or just deploy — Netlify runs it automatically, see below).

**Layout:** desktop shows a fixed 50:50 split — the project's `thumb` image pinned on the left, the write-up scrolling independently on the right. On mobile (≤768px) it collapses to one column: the image becomes a normal banner that scrolls away, with the write-up flowing underneath.

**How it's generated:** `scripts/gen-projects.js` reads `content/projects.md` + the matching `content/projects/<slug>.md` files and writes a complete, self-contained `projects/<slug>/index.html` per project — no Three.js, no background music, nothing the homepage doesn't need a reading page to carry. It also writes `sitemap.xml` and `robots.txt` at the project root, listing the homepage plus every project page (the only URLs on the site that are real, independently loadable pages — everything else lives behind client-side overlays with no distinct URL).

**Seamless navigation from the homepage:** clicking a project card in the Projects overlay doesn't trigger a real page load. It fetches that project's static page in the background, drops its content into a detail view inside the same overlay (cross-fading via the View Transitions API where the browser supports it), and updates the address bar to the real `/projects/<slug>/` URL using the History API — so the background music and sphere animation never stop. Hovering/touching a card prefetches its page so the swap feels instant. Anyone arriving directly (search result, shared link, JS disabled) just gets the plain static page — same content, no SPA shell required. The external "View Project" button is unrelated to this — it always opens the project's own live URL (the `url` field) in a new tab.

## How it's built

**One file** — `index.html` contains all HTML, CSS, and JavaScript inline. No npm, no webpack, no React.

**Three.js r128** — loaded from CDN. Used for the WebGL canvas, point geometry, line geometry, and GLSL shaders.

**marked.js** — loaded from CDN. Parses modal content from markdown files at runtime.

**Font Awesome 6.6.0 Free** — loaded from jsDelivr CDN. Used for icons (arrows, social platforms, envelope, play/stop, heart).

**Web Audio API** — used to synthesize typewriter click sounds (square-wave oscillator + gain envelope) with no audio files. `AudioContext` is created inside the Proceed button click handler to satisfy browser autoplay policy.

**Content files** — everything editable lives in the `content/` directory:

```
content/
  nav.md         ← nav order, labels, and sphere hover text
  articles.md    ← article cards (title, source, date, desc, url, thumb)
  projects.md    ← project entries (title, date, status, tags, description, url, thumb, slug)
  projects/
    <slug>.md    ← long-form write-up for that project's own page — see "Project pages"
  reads.md       ← recommended reads (title, url, source, date, tags, description)
  about.md       ← About modal content
  work.md        ← Work modal content
  social.md      ← social links (one URL per line, platform auto-detected)
  gallery.json   ← auto-generated by scripts/gen-gallery.js
```

**Auto-generated at the project root** (don't hand-edit; both run as part of the Netlify build): `projects/<slug>/index.html` (one per project, see "Project pages"), `sitemap.xml`, `robots.txt`.

Quotes are embedded in `index.html` in a `<script id="quotes-data" type="application/json">` block.

**Audio files** — `audio/bg_score.mp3` (background music, loops), `audio/big_bang.mp3` (one-shot on first-visit bang), `audio/hud_in.mp3` (one-shot HUD boot flourish, plays once per page load — see "First-visit experience"), `audio/button_hover.mp3` (short click on nav/gate-button hover — see "Music").

**Images** — `images/varun.jpg` is the photo used in the popup box. `images/gallery/` holds photo albums. `images/inbox/` is the gitignored staging folder for new photos before they're sorted — see "Adding photos".

**Scripts** — `scripts/gen-gallery.js` (gallery JSON, see "Gallery build step"), `scripts/gen-projects.js` (project pages, see "Project pages"), `scripts/strip-metadata.js` (EXIF/metadata strip + copyright stamp, called automatically by gen-gallery.js — see "Privacy & copyright on gallery assets"), `scripts/clean-inbox.js` (empties `images/inbox/`, also called automatically by gen-gallery.js).

## Site metadata and sharing

The homepage pulls browser/social metadata from `index.html`.

Add these files at the project root:

| File | Used for | Recommended size |
|------|----------|------------------|
| `favicon.png` | Browser tab favicon | 32×32 or 48×48 PNG |
| `social-banner.png` | Link previews on iMessage, Slack, X/Twitter, LinkedIn, etc. | 1200×630 PNG |
| `apple-touch-icon.png` | iOS home screen icon | 180×180 PNG |
| `icon-192.png` | Web app manifest icon | 192×192 PNG |
| `icon-512.png` | Web app manifest icon | 512×512 PNG |

The canonical URL and share image URL are configured for `https://v4.run/`, hosted on Netlify from the GitHub repo `varun-heman/v4run-website`.

Every page's `<title>`, `og:title`, and `twitter:title` follow the same `v4run | <Page Title>` format (lowercase `v4run`) — the homepage sets it directly in `index.html`, and `scripts/gen-projects.js` builds it automatically for every project page from that project's title, so it stays consistent without needing to repeat it by hand.

## Running locally

Because content is fetched at runtime, the site needs to be served over HTTP — opening `index.html` directly via `file://` will not load the markdown files.

```bash
cd ~/Documents/Experiments/v4run-website
node scripts/gen-gallery.js    # regenerate gallery.json after adding photos
node scripts/gen-projects.js   # regenerate project pages, sitemap.xml, robots.txt
npx serve .
```

Then open the localhost URL it prints.

## Deployment

Any static host works — Vercel, Netlify, GitHub Pages, Cloudflare Pages.

**Netlify** — `netlify.toml` runs `node scripts/gen-gallery.js && node scripts/gen-projects.js` as the build command, then publishes the root directory. No extra config needed. Netlify also handles the contact form honeypot server-side.

For GitHub Pages, push to `main` and enable Pages from repo Settings → Pages (source: root of `main` branch). Enable HTTPS enforcement from the same page once the domain is verified. Note: GitHub Pages has no build step, so run both `node scripts/gen-gallery.js` and `node scripts/gen-projects.js` locally and commit `content/gallery.json`, `projects/`, `sitemap.xml`, and `robots.txt` before pushing.

## Mobile

On screens ≤ 768px:
- Nav moves to a horizontal strip at the bottom of the screen
- Writing, Reads, and Memories nav items are appended (desktop carousel and gallery link are hidden on mobile)
- Bio, photo popup, and article carousel are hidden
- Modal expands to 94vw
- Particle count is halved for performance
- The PDF viewer fullscreen button opens the PDF in a new tab instead (iOS does not support the Fullscreen API)

## Customising

| What | Where |
|------|-------|
| Nav items, order, hover text | `content/nav.md` |
| Article cards | `content/articles.md` |
| Projects (list entries) | `content/projects.md` |
| Project write-ups (own page per project) | `content/projects/<slug>.md` — see "Project pages" |
| Recommended reads | `content/reads.md` |
| Modal content | `content/{key}.md` |
| Quotes | `index.html` → `<script id="quotes-data">` |
| Bio text | `content/about.md` |
| Social links | `content/social.md` |
| Photo | `images/varun.jpg` |
| Browser/social title and description | `index.html` → `<head>` metadata |
| Favicon | `favicon.png` in the project root |
| Social share banner | `social-banner.png` in the project root |
| Photo albums | `images/gallery/<album-name>/` + optional `meta.md` — see "Adding photos" and "File naming convention" |
| Gallery copyright/attribution stamp | `scripts/strip-metadata.js` → `COPYRIGHT` constant |
| Background music | `audio/bg_score.mp3` |
| Big bang sound | `audio/big_bang.mp3` |
| HUD boot sound | `audio/hud_in.mp3` |
| Button hover sound | `audio/button_hover.mp3` |
| Memory fog source items | tag any gallery item `memfog` in its album's `meta.md` — see "Gallery metadata" |
