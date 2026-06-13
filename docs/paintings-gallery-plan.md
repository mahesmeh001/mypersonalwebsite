# Paintings Gallery Page Plan

> Saved project plan — Warm Human Contemporary shell pilot via `paintings.html`.

## Goal

Create [`paintings.html`](../paintings.html) as a **design pilot** for the site's next visual era — not another page skinned on the old Massively template. It ships a contemporary gallery (Mike Svob lightbox UX) inside a **new shared shell** that other content pages can migrate to later. [`resume.html`](../resume.html) remains the exception.

| Inspiration | Feature to adopt |
|---|---|
| [Mike Svob](https://www.mikesvob.com/paintings) | Full-screen lightbox, prev/next arrows, position indicator |
| Soft contemporary palette | Warm off-white ground, terracotta accents — **colors only**, not shop UX |
| This project (new) | Warm Human Contemporary shell — human, scannable, optional depth |
| This project (old — being replaced) | ~~Massively `#wrapper`, 20rem logo header, cliff background, blog `.post` layout~~ |

## Chosen theme — Warm Human Contemporary

### What we want

- **Warm and human** — feels like a person sharing interests, not a brand or studio
- **Soft contemporary colors** — warm off-white, terracotta/rust accents
- **At a glance, depth optional** — visitors scan sections quickly; collapsibles, lightbox, and anchors let them go deeper if they choose
- **Presentation-only change** — swap wrapper/CSS; keep existing page content HTML (reviews, embeds, essays). No content rewrites.
- **Not a sales site** — no shop energy, no "personal brand" marketing tone. Paintings `cost` is informational metadata, not a CTA.
- **Resume untouched** — [`resume.html`](../resume.html) stays on its current template permanently

### What we explicitly reject

| Reference | Why not |
|---|---|
| [Erno Forsström](https://www.erno.works/) | Too cold, monograph-restrained |
| [Charisma Panchapakesan](https://www.charismapanch.com/) | Gallery-only model; doesn't fit multi-interest site |
| [Rpatelart](https://rpatelart.com/) shop UX | Colors OK; product-card / store feel wrong |
| [Dries Bos](https://www.driesbos.com/) | Too robotic, spreadsheet-austere |
| [Dondre Green](https://www.dondregreen.com/) | Too guided/narrative-driven |
| Dark canvas | Not human; tiring for text pages |

### Design tokens (locked for `site-shell.css`)

| Token | Value |
|---|---|
| `--site-bg` | `#FAF6F1` |
| `--site-bg-soft` | `#F5EDE6` |
| `--site-text` | `#2C2825` |
| `--site-text-muted` | `#6B6560` |
| `--site-accent` | `#C97B63` |
| `--site-accent-soft` | `#F0DDD4` |
| `--site-radius` | `6px` |
| `--site-font-display` | `"Fraunces", Georgia, serif` |
| `--site-font-body` | `"Source Sans 3", system-ui, sans` |
| `--site-max-width` | `1100px` |
| `--site-prose-width` | `42rem` |

Per-page accent overrides (when migrating): music `#9B7BB8`, books `#C4A035`, random `#6B8F71`.

## Data model — `PAINTINGS` array

Defined inline in `paintings.html`. To add a painting: append one object + drop image in `images/Paintings/`.

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Display name |
| `image` | yes | File path |
| `size` | no | e.g. `"11 × 14 in"` |
| `cost` | no | Informational only |
| `description` | no | Lightbox blurb |
| `notes` | no | Lightbox only |
| `draft` | no | Stored for later; not filtered in v1 |

## File changes

| File | Purpose |
|---|---|
| `assets/css/site-shell.css` | New shared shell (pilot) |
| `assets/js/site-nav.js` | Mobile nav toggle |
| `assets/css/paintings.css` | Gallery + lightbox |
| `assets/js/paintings.js` | `renderGallery`, lightbox controller |
| `paintings.html` | New page |
| `images/Paintings/` | Painting image assets |

## Implementation order

1. Create `images/Paintings/` and relocate images
2. Build `site-shell.css` + `site-nav.js`
3. Build `paintings.css` + `paintings.js`
4. Create `paintings.html`
5. Add Paintings nav link on existing pages + sitemap
6. Trim `random.html` painting section to teaser link

## Future migration (out of scope for v1)

Presentation-only shell swap for: aboutme → music → books → random → index. `resume.html` excluded.

## What we are NOT building (v1)

- Shop / personal-brand UX
- Content rewrites
- `resume.html` changes
- Guided narrative / scroll-hijacking
- Dark site background (dark only inside lightbox)
