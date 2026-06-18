# v4run — personal site

Personal site for [v4.run](https://v4.run), built as a single HTML file with no framework, no bundler, no build step.

## What it is

A dark, minimal personal page built around a Three.js dot-sphere animation. The sphere is the background — always present, always moving. Everything else sits on top of it.

Key visual details:
- **Dot sphere** — WebGL particle system rendered with Three.js. ~6,000 points on a sphere surface, connected by proximity lines. Reacts to mouse hover with a wave/bang effect.
- **Logo glitch** — the `v4run` wordmark cycles between `v4run`, `varun`, and `v4.run` at random intervals with an RGB chromatic aberration burst.
- **Photo popup** — hovering the logo reveals a photo box that follows the cursor, connected to the logo by an elbowed SVG line with a travelling light pulse. The image has a matrix-green CRT filter and TV flicker effect.
- **Shoal of fish** — when a modal is open, the sphere dots flow tangentially around the modal zone in two counter-rotating streams, like a shoal of fish parting around an obstacle.
- **Typewriter quotes** — when no nav item is hovered, the sphere centre types out quotes one character at a time (with human-like timing jitter and occasional mistypes), holds, then deletes them.
- **Article carousel** — a bottom strip of writing cards that auto-scrolls left, supports drag with momentum fling, and loops infinitely via DOM recycling (no offset jump).

## How it's built

**One file** — `index.html` contains all HTML, CSS, and JavaScript inline. No npm, no webpack, no React.

**Three.js r128** — loaded from CDN. Used for the WebGL canvas, point geometry, line geometry, and GLSL shaders.

**marked.js** — loaded from CDN. Parses modal content from markdown files at runtime.

**Content files** — everything editable lives in the `content/` directory:

```
content/
  nav.md        ← nav order, labels, and sphere hover text
  about.md      ← About modal content
  work.md       ← Work modal content
  writing.md    ← Writing modal content
  contact.md    ← Contact modal content
```

Data for quotes and article cards is embedded directly in `index.html` in `<script type="application/json">` blocks — search for `quotes-data` and `articles-data`.

**Images** — `images/varun.jpg` is the photo used in the popup box. Replace with your own.

## Running locally

Because modal content is fetched at runtime, the site needs to be served over HTTP — opening `index.html` directly via `file://` will not load the markdown files.

```bash
npx serve .
```

Then open the localhost URL it prints.

## Deployment

Any static host works — Vercel, Netlify, GitHub Pages, Cloudflare Pages. No build step required; just point the host at this folder.

For GitHub Pages specifically, push to `main` and enable Pages from the repo settings (source: root of `main` branch).

## Customising

| What | Where |
|------|-------|
| Nav items, order, hover text | `content/nav.md` |
| Modal content | `content/{key}.md` |
| Quotes | `index.html` → `<script id="quotes-data">` |
| Article cards | `index.html` → `<script id="articles-data">` |
| Photo | `images/varun.jpg` |
| Corner email link | `index.html` → `.corner-bl` |
