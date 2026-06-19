# v4run — personal site

Personal site for [v4.run](https://v4.run), built as a single HTML file with no framework, no bundler, no build step (aside from a pre-deploy gallery scan).

## What it is

A dark, minimal personal page built around a Three.js dot-sphere animation. The sphere is the background — always present, always moving. Everything else sits on top of it.

Key visual details:

- **Dot sphere** — WebGL particle system rendered with Three.js. ~5,000 points on a sphere surface (2,200 on mobile), connected by proximity lines. Reacts to mouse hover with a wave/bang effect.
- **Big bang intro** — on first page load the sphere expands outward from a central point; all UI fades in after the animation settles (~2.6s). Accompanied by `audio/big_bang.mp3`.
- **Logo glitch** — the `v4run` wordmark cycles between `v4run`, `varun`, and `v4.run` at random intervals with an RGB chromatic aberration burst. Hovering the logo area pauses the cycle and typewriters out the full name `varun hemachandran`, then resumes cycling on mouse-out.
- **Bio** — a short bio paragraph sits below the logo in the top-left corner (hidden on mobile).
- **Photo popup** — hovering near the logo reveals a photo box that follows the cursor, connected to the logo by an elbowed SVG line with a travelling light pulse. The image has a matrix-green CRT filter and TV flicker effect. Disabled on mobile and when a modal is open.
- **Shoal of fish** — when a modal is open, the sphere dots flow tangentially around the modal zone in two counter-rotating streams, like a shoal of fish parting around an obstacle. On desktop, the sphere is visible behind the modal (raised above the dark scrim via z-index).
- **Typewriter quotes** — when no nav item is hovered, the sphere centre types out quotes one character at a time (with human-like timing jitter and occasional mistypes), holds, then deletes them. During the hold, the same letter-scramble and RGB chromatic aberration glitch effects run as on nav hints. Starts after the bang animation clears.
- **Article carousel** — a bottom strip of writing cards that auto-scrolls left, supports drag with momentum fling, and loops infinitely via DOM recycling (no offset jump). Cards expand on hover to reveal a description, with tags pinned to the bottom; non-hovered cards dim. Hidden on mobile.
- **Static noise overlay** — a very faint, fine-grain film noise canvas overlaid on the full page.
- **Pulsating heart** — a red Font Awesome heart icon in the footer pulses continuously with a heartbeat animation.

## First-visit experience

On the very first visit to the root domain, a terminal-style **access gate** is shown before the page is usable:

- Displays "You are entering the private space of VARUN" — the name cycles through `VARUN → v4run → v4.run` with a fast RGB glitch + VHS skew distortion animation.
- **Exit** button opens a YouTube link in a new tab and closes the current one.
- **Proceed** button dismisses the gate. The background music (`audio/bg_score.mp3`) starts immediately at low volume. A blinking green cursor appears for ~2 seconds, then the typewriter intro sequence begins (each keystroke is a synthesized square-wave click via Web Audio API).
- After the intro finishes, the big bang triggers and the main UI fades in.
- The gate and intro are skipped for return visitors (cookie `v4run_v=1`). Visitors arriving via a **deep link** (any URL with a hash) also skip the gate and are marked as visited immediately — the linked panel opens directly.

## Nav behaviour

- **Writing** — clicking opens the full "View All" writing overlay (with year/tag filters).
- **Reads** — clicking opens the Recommended Reads overlay (vertically scrollable link list with descriptions).
- **Projects** — clicking opens the Projects overlay. Each project row is a hoverable card — transparent border at rest, green box highlight + background tint on hover, with a green border flash animation on open.
- **Pics** — opens the photo gallery overlay.
- **NEW badges** — a green dot appears next to a nav item when any of its content was published within the last 60 days (Reads uses a 2-month window). Individual new items also carry a NEW badge.
- All nav items are **deep-linkable** — `/#about`, `/#work`, `/#projects`, `/#writing`, `/#reads`, `/#pics` open their panels directly. Browser back/forward navigation works.
- On **desktop**, Writing, Reads, and Pics are in the nav bar. On **mobile**, they are appended as extra nav items at the bottom.

## Social dock

The `Contact Me` label in the bottom-left corner reveals social icons on hover. Icons slide out to the right with a staggered spring animation. Platform is auto-detected from the URL in `content/social.md`. The email icon is always visible; all others are pulled from the social links file.

## Contact

Clicking the email icon in the social dock opens a modal with a Netlify form (name, email, message). An opt-in checkbox lets visitors subscribe to email updates.

Anti-spam measures:
- **Honeypot field** — a hidden `bot-field` input that bots auto-fill; Netlify silently drops those submissions server-side, and the client also checks it.
- **Timing check** — submissions sent in under 3 seconds are silently rejected (bots submit instantly).
- **Strict email validation** — regex requiring a valid local part, domain with at least one dot, TLD of 2+ characters, and no consecutive dots. Error shown inline on blur.

## Music

Background music (`audio/bg_score.mp3`) plays only for first-time visitors, starting when Proceed is clicked on the access gate. Return visitors land silently. A music toggle in the bottom-right corner shows a Font Awesome play/stop icon (green when playing, red when stopped) next to a "Music On/Off" label. The animated equaliser bars hide when muted.

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

The Pics overlay has three views:

1. **Recent** — last 5 photos across all albums, in a 5-column grid.
2. **Albums** — auto-scanned from `images/gallery/` subdirectories.
3. **Album view** — all photos in an album, with a back button.

Clicking any thumbnail opens an immersive **lightbox** (full-screen, black background, `object-fit: contain`). Caption, date, and location are overlaid at the bottom with a gradient. Arrow keys and click to navigate.

Hovering a thumbnail reveals a slide-up overlay with the caption and metadata chips.

### Gallery metadata

Each album lives in `images/gallery/<album-name>/`. An optional `meta.md` file in each album provides per-photo metadata:

```
# filename | caption | date (YYYY-MM-DD) | location
arch-01.jpg | Pillared corridor, Mysore Palace | 2026-01-28 | Mysore, India
```

Dates and locations are optional — just leave the field blank.

### Gallery build step

The gallery JSON is generated pre-deploy by `scripts/gen-gallery.js`. It scans `images/gallery/*/` for image files and writes `content/gallery.json` with all albums and the 5 most recent photos.

`netlify.toml` wires this up automatically on Netlify. For local testing, run:

```bash
node scripts/gen-gallery.js
```

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
  projects.md    ← project entries (title, date, status, tags, description, url, thumb)
  reads.md       ← recommended reads (title, url, source, date, tags, description)
  about.md       ← About modal content
  work.md        ← Work modal content
  social.md      ← social links (one URL per line, platform auto-detected)
  gallery.json   ← auto-generated by scripts/gen-gallery.js
```

Quotes are embedded in `index.html` in a `<script id="quotes-data" type="application/json">` block.

**Audio files** — `audio/bg_score.mp3` (background music, loops), `audio/big_bang.mp3` (one-shot on first-visit bang).

**Images** — `images/varun.jpg` is the photo used in the popup box. `images/gallery/` holds photo albums.

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

## Running locally

Because content is fetched at runtime, the site needs to be served over HTTP — opening `index.html` directly via `file://` will not load the markdown files.

```bash
cd ~/Documents/Experiments/v4run-website
node scripts/gen-gallery.js   # regenerate gallery.json after adding photos
npx serve .
```

Then open the localhost URL it prints.

## Deployment

Any static host works — Vercel, Netlify, GitHub Pages, Cloudflare Pages.

**Netlify** — `netlify.toml` runs `node scripts/gen-gallery.js` as the build command, then publishes the root directory. No extra config needed. Netlify also handles the contact form honeypot server-side.

For GitHub Pages, push to `main` and enable Pages from repo Settings → Pages (source: root of `main` branch). Enable HTTPS enforcement from the same page once the domain is verified. Note: GitHub Pages has no build step, so run `node scripts/gen-gallery.js` locally and commit `content/gallery.json` before pushing.

## Mobile

On screens ≤ 768px:
- Nav moves to a horizontal strip at the bottom of the screen
- Writing, Reads, and Pics nav items are appended (desktop carousel and gallery link are hidden on mobile)
- Bio, photo popup, and article carousel are hidden
- Modal expands to 94vw
- Particle count is halved for performance
- The PDF viewer fullscreen button opens the PDF in a new tab instead (iOS does not support the Fullscreen API)

## Customising

| What | Where |
|------|-------|
| Nav items, order, hover text | `content/nav.md` |
| Article cards | `content/articles.md` |
| Projects | `content/projects.md` |
| Recommended reads | `content/reads.md` |
| Modal content | `content/{key}.md` |
| Quotes | `index.html` → `<script id="quotes-data">` |
| Bio text | `content/about.md` |
| Social links | `content/social.md` |
| Photo | `images/varun.jpg` |
| Browser/social title and description | `index.html` → `<head>` metadata |
| Favicon | `favicon.png` in the project root |
| Social share banner | `social-banner.png` in the project root |
| Photo albums | `images/gallery/<album-name>/` + optional `meta.md` |
| Background music | `audio/bg_score.mp3` |
| Big bang sound | `audio/big_bang.mp3` |
