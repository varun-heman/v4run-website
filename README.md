# v4run — personal site

Personal site for [v4.run](https://v4.run), built as a single HTML file with no framework, no bundler, no build step.

## What it is

A dark, minimal personal page built around a Three.js dot-sphere animation. The sphere is the background — always present, always moving. Everything else sits on top of it.

Key visual details:

- **Dot sphere** — WebGL particle system rendered with Three.js. ~5,000 points on a sphere surface (2,200 on mobile), connected by proximity lines. Reacts to mouse hover with a wave/bang effect.
- **Big bang intro** — on page load the sphere expands outward from a central point; all UI fades in after the animation settles (~2.6s).
- **Logo glitch** — the `v4run` wordmark cycles between `v4run`, `varun`, and `v4.run` at random intervals with an RGB chromatic aberration burst. Hovering the logo area pauses the cycle and typewriters out the full name `varun hemachandran`, then resumes cycling on mouse-out.
- **Bio** — a short bio paragraph sits below the logo in the top-left corner (hidden on mobile).
- **Photo popup** — hovering near the logo reveals a photo box that follows the cursor, connected to the logo by an elbowed SVG line with a travelling light pulse. The image has a matrix-green CRT filter and TV flicker effect. Disabled on mobile and when a modal is open.
- **Shoal of fish** — when a modal is open, the sphere dots flow tangentially around the modal zone in two counter-rotating streams, like a shoal of fish parting around an obstacle.
- **Typewriter quotes** — when no nav item is hovered, the sphere centre types out quotes one character at a time (with human-like timing jitter and occasional mistypes), holds, then deletes them. Starts after the bang animation clears.
- **Article carousel** — a bottom strip of writing cards that auto-scrolls left, supports drag with momentum fling, and loops infinitely via DOM recycling (no offset jump). Hidden on mobile.
- **Static noise overlay** — a very faint, fine-grain film noise canvas overlaid on the full page.

## How it's built

**One file** — `index.html` contains all HTML, CSS, and JavaScript inline. No npm, no webpack, no React.

**Three.js r128** — loaded from CDN. Used for the WebGL canvas, point geometry, line geometry, and GLSL shaders.

**marked.js** — loaded from CDN. Parses modal content from markdown files at runtime.

**Content files** — everything editable lives in the `content/` directory:

```
content/
  nav.md        ← nav order, labels, and sphere hover text
  articles.md   ← article cards (title, source, date, desc, url, thumb)
  about.md      ← About modal content
  work.md       ← Work modal content
  writing.md    ← Writing modal content
  contact.md    ← Contact modal content
```

Quotes are embedded in `index.html` in a `<script id="quotes-data" type="application/json">` block.

**Images** — `images/varun.jpg` is the photo used in the popup box.

## Running locally

Because content is fetched at runtime, the site needs to be served over HTTP — opening `index.html` directly via `file://` will not load the markdown files.

```bash
cd ~/Documents/Experiments/v4run-website
npx serve .
```

Then open the localhost URL it prints.

## Deployment

Any static host works — Vercel, Netlify, GitHub Pages, Cloudflare Pages. No build step required; just point the host at this folder.

For GitHub Pages, push to `main` and enable Pages from repo Settings → Pages (source: root of `main` branch). Enable HTTPS enforcement from the same page once the domain is verified.

## Mobile

On screens ≤ 768px:
- Nav moves to a horizontal strip at the bottom of the screen
- An **Articles** nav item is appended (desktop carousel is hidden); tapping it opens a full-screen vertically scrollable list of article cards
- Bio, photo popup, and article carousel are hidden
- Modal expands to 94vw
- Particle count is halved for performance

## Customising

| What | Where |
|------|-------|
| Nav items, order, hover text | `content/nav.md` |
| Article cards | `content/articles.md` |
| Modal content | `content/{key}.md` |
| Quotes | `index.html` → `<script id="quotes-data">` |
| Bio text | `index.html` → `.corner-bio` paragraph |
| Photo | `images/varun.jpg` |
| Corner email / social links | `index.html` → `.corner-bl` / `.corner-br` |
