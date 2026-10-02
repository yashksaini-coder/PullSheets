# Pullsheets — Next.js

This is the Pullsheets MVP design turned into a working **Next.js 15 (App Router) + TypeScript** app. Pullsheets turns a GitHub pull request into a share-ready image or short clip for X, LinkedIn and Instagram.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 18.18+ (20 LTS recommended).

## Routes

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` | Landing: beta bar, glass nav, centered hero with a live “paste a PR link” editor mock, bento, how it works, pricing, FAQ, footer |
| `/login` | `app/login/page.tsx` | Sign in: GitHub / GitLab / Bitbucket and a magic-link email |
| `/editor` | `app/editor/page.tsx` | The editor (details below). `/editor?pr=<github PR url>` opens with that PR imported |
| `/account` | `app/account/page.tsx` | Workspace with a sidebar: Overview, Recent exports, Export defaults, Editor defaults, Branding, API & integrations, Profile, Connected GitHub, Notifications, Billing, Danger zone. Each section is deep-linkable, e.g. `/account#billing` |

## What works in the editor

- **Modes:** Image, Browser (Safari / Chrome / Plain, light or dark chrome) and Device (MacBook / iPhone bezels)
- **PR card:** light or dark theme, status (Open / Merged / Draft / Closed), radius, size
- **Import:** paste a PR URL, or pick from Recent pull requests
- **Background:** 6 gradients, 10 images, a custom solid color, padding, noise
- **Layers:** caption title and tag, 3D overlay shapes with a size control
- **3D:** 6 layout presets, depth, rotate X / Y / Z, reset
- **Motion:** 8 clips with a timeline and playhead
- **Toolbar:** undo / redo (⌘Z, ⇧⌘Z), rulers, grid, platform aspect presets (X, LinkedIn, Instagram square and portrait, Story, 16:9)
- **Export:** **real PNG / JPG export** at 1–5× via `html-to-image`, copy to clipboard, an entry in Recent exports (stored in `localStorage` under `pullsheets.exports`)
- **Also:** Start-over dialog and toasts

## Stubbed — needs a backend

| Feature | Where | Suggested implementation |
|---|---|---|
| PR import | `importUrl` in `app/editor/page.tsx` | A route handler `app/api/pr/route.ts` that calls `GET /repos/{owner}/{repo}/pulls/{n}` with the user's token. `lib/data.ts → PullRequest` is the shape it should return |
| Auth | `/login` buttons link straight to `/editor` | Auth.js (NextAuth) with the GitHub provider; scopes `read:user` and `repo` (read-only) |
| Recent PRs / exports | `RECENT_PRS`, `DEMO_EXPORTS` in `lib/data.ts` | Replace with DB- or API-backed queries |
| Video (MP4 / GIF) | `doExport('mp4')` | Server-side render (Remotion or ffmpeg) |
| Post to X / LinkedIn | `post()` | OAuth integrations; upload the PNG blob |
| Billing | Billing section | Stripe Checkout and the Customer Portal |
| Settings persistence | Account sections keep local state | Persist to the user profile |

## Design system

- **Tokens:** `styles/tokens/*.css`, copied verbatim from the PR Studio design system (colors, type, spacing, radius, shadows, motion). The font URLs are rewritten to `/fonts/*`.
- **Theme:** dark by default (`<html class="dark">`). Brand red is `#E8452B` and the focus ring is `#F26E52`; everything else is warm black plus white at low alpha (`--fg-a*`).
- **Fonts:** Inter (variable) and JetBrains Mono, served from `public/fonts`.
- **Icons:** `lucide-react`. Brand marks (GitHub, X, LinkedIn, GitLab, Bitbucket) are inline SVGs in `components/brand-icons.tsx`.
- **Primitives:** `components/ui.tsx` (Button, Segmented, Slider, Switch, Input, Tile, Section, StatusPill, Dialog, Toaster, Logo, BetaBar). Styles live in `app/globals.css` as plain CSS classes, with no Tailwind dependency.
- **PR card and browser frame:** `components/pr-card.tsx`. They are sized in container-query units (`cqw`) so the card scales cleanly with the canvas and with export resolution.

## Assets

- `public/assets/backgrounds/*` — 11 canvas backgrounds
- `public/assets/overlays/*` — 3D overlay shapes
- `public/fonts/*` — Inter and JetBrains Mono

## Design reference

`design-reference/*.dc.html` holds the original HTML prototypes the app was built from. They are for visual comparison only and are not used at runtime.

## Placeholders to replace

- The demo account (`@yashksaini-coder`, “Yash Saini”), PR numbers and the star count are illustrative.
- The footer's X and LinkedIn links point at the sites' home pages; swap in real profile URLs.
