# Pullsheets — architecture design

**Date:** 2026-10-02 · **Status:** approved in conversation, pending written review
**Inputs:** the Pullsheets Editor Design prototypes (landing, login, editor, account) and the PR Cards design-library canvas. The prototypes are kept out of the repository; the card library is distilled in `docs/design/pr-cards-library.md`.

Pullsheets turns a GitHub pull request into a share-ready image or short clip for X, LinkedIn and Instagram.

## 1. Decisions (made once, cross-cutting)

| Decision | Choice | Alternative rejected | Why |
|---|---|---|---|
| Repo shape | Single Next.js 15 App Router app; `remotion/` colocated | Turborepo monorepo | Only justification for a package boundary is the card library's two renderers; a lint-enforced purity rule gives that boundary for free. Upgrade path is a folder move. |
| Scope | Everything real: auth, GitHub import, image + video export, billing, social | Stubs | User decision. Tiered env (§2) keeps a fresh clone bootable. |
| Database | Postgres + Drizzle, `docker-compose` locally | No DB · SQLite | Export history, settings, tokens and webhook idempotency need a store; Drizzle is SQL-first with no codegen. |
| Auth | `better-auth` with GitHub provider, Drizzle adapter | Auth.js v5 (beta) | Stable, Drizzle-native; models "connect account for posting" separately from "log in with". Contained in `lib/auth/` + schema. OAuth tokens at rest are encrypted by better-auth with XChaCha20-Poly1305 keyed from `BETTER_AUTH_SECRET` (§3); `TOKEN_ENCRYPTION_KEY` is reserved for phase-6 social tokens. |
| Card library | 6 headless slot layouts + 7 token sets + 3 structural overrides | 42 bespoke components | The design doc states "same nine facts, same reading order; only visual grammar changes". Midnight/Modern/Minimal/Industrial differ only in tokens. Terminal, Editorial, Futuristic differ structurally. |
| Image export | Free: client `html-to-image` ≤2× watermark. Pro: server Remotion `renderStill` | Client-only | Client-side export cannot be paywalled; `renderStill` reuses the video renderer and the same components. |
| Video | Remotion. `VIDEO_RENDER_MODE=lambda` (prod) / `local` (dev, headless Chrome) | Container + queue | Lambda is the queue. No Redis/BullMQ until local-mode concurrency is a measured constraint. |
| Styling | Plain CSS + tokens (as shipped); no Tailwind | — | Keep the design system as delivered. |
| Package manager | `pnpm` | npm | Faster installs; lockfile committed. |

## 2. Env contract

Validated at module load with `@t3-oss/env-nextjs` + `zod` in `lib/env.ts`, which exports `env` and a derived `features`.

| Tier | Variables | Missing ⇒ |
|---|---|---|
| 0 boot | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TOKEN_ENCRYPTION_KEY` (32-byte base64) | **Process fails at startup naming the variable.** |
| 1 core | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_PUBLIC_TOKEN` | Login disabled; public-PR demo via `GITHUB_PUBLIC_TOKEN` still works; if that is missing too, unauthenticated GitHub (60/hr/IP). |
| 2 storage | `STORAGE_DRIVER=s3\|blob\|local`, `S3_*` / `BLOB_READ_WRITE_TOKEN` | `local` driver writes to `.data/exports` (dev). Without any driver: exports stay browser-side, no history, no video. |
| 3 video | `VIDEO_RENDER_MODE=off\|local\|lambda`, `REMOTION_AWS_*`, `REMOTION_FUNCTION_NAME`, `REMOTION_SERVE_URL`, `REMOTION_REGION` | `off`: video UI disabled with the missing var named. |
| 4 billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Every user is treated as Pro locally; billing UI says "unconfigured". |
| 5 social | `X_CLIENT_ID`, `X_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | Post buttons disabled. |

Rules:
- `features = { auth, storage, video, billing, social }` is **derived** from variable presence. There are no hand-written `*_ENABLED` flags.
- Route handlers for an unconfigured feature return `503 { error: 'feature_unconfigured', missing: string[] }`. Never a fake success.
- UI reads `features` (server component → prop) and renders "Not configured — set `X`" instead of a dead control.
- `.env.example` documents every variable with its tier and how to obtain it. `.env*.local` is git-ignored.

## 3. Data model (Drizzle, Postgres)

better-auth owns: `users` (extended with `plan`, `stripe_customer_id`, `stripe_subscription_id`, `plan_renews_at`), `sessions`, `accounts`, `verifications`.

`accounts` OAuth tokens are encrypted at rest by better-auth's `encryptOAuthTokens` — **XChaCha20-Poly1305 with a key derived from `BETTER_AUTH_SECRET`**, not AES-GCM and not `TOKEN_ENCRYPTION_KEY`. Rotating `BETTER_AUTH_SECRET` therefore invalidates every stored GitHub token and forces a re-login. `TOKEN_ENCRYPTION_KEY` is reserved for the `social_connections` tokens in phase 6 and has no runtime consumer before then; it is validated at boot only so the key exists when phase 6 lands.

Product tables:

| Table | Purpose | Notes |
|---|---|---|
| `settings` | one row per user: `editor` / `export` / `branding` / `notifications` jsonb | zod-validated on read and write; `updated_at` |
| `exports` | the real `ExportItem` | `status: pending\|rendering\|ready\|failed`, `storage_key`, `bytes`, `kind: image\|video`, `format`, `scale`, `w`,`h`, PR facts snapshot, `created_at` |
| `render_jobs` | one per video/still render | `export_id`, `provider: local\|lambda`, `provider_job_id`, `progress 0–1`, `error`, timestamps |
| `pr_cache` | GitHub PR payload + `etag` + `fetched_at` + `is_private` keyed by `(repo, number)` | conditional `If-None-Match` fetches; TTL 10 min for open PRs, 24 h for merged/closed — **rows with `is_private` are exempt from the TTL** (§5 step 3) |
| `webhook_events` | Stripe event ledger, `event_id UNIQUE` | processed before side effects; replayed events are no-ops |
| `api_keys` | `key_hash`, `prefix`, `label`, `last_used_at`, `revoked_at` | plaintext shown once |
| `social_connections` | `provider: x\|linkedin`, `provider_account_id`, encrypted tokens, `scopes`, `expires_at` | separate from `accounts` — posting ≠ login |
| `social_posts` | `export_id`, `provider`, `remote_post_id`, `permalink`, `status`, `posted_at` | |

Migrations via `drizzle-kit generate` committed under `drizzle/`; `pnpm db:migrate` applies; `pnpm db:studio` for inspection.

## 4. Card library — `components/cards/`

Purity rule, enforced by ESLint `no-restricted-imports` / `no-restricted-globals` on this directory: **no `next/*`, no `window`, `document`, `localStorage`, `fetch`.** Props in, JSX out. Required so `html-to-image` (browser) and Remotion (Node) render the same components.

```
components/cards/
├─ model.ts        PrFacts · PrState (open draft approved changes checks-failed conflict merged closed)
│                  PrType (feat fix hotfix chore docs deps release revert) · CardFormat · CardFamily
├─ primitives/     ChangeBar · Avatar · RepoMark · SnapshotStamp · StatusPill · TypeChip · Checks
├─ layouts/        QueueRow 820×56 · Compact 300 · Standard 420 · Detail 460 · Digest 420 · DetailWide 720
├─ families/       midnight industrial modern minimal futuristic terminal editorial
│                  each: tokens.css scoped under .pc-<family>; terminal/editorial/futuristic also override layouts
├─ registry.ts     (family, format) → component + frame size
└─ Card.tsx        <Card family format facts />
```

`PrFacts` (the "nine facts" plus body and files): `repo {owner,name}`, `number`, `title`, `body`, `state`, `type`, `author {login,name,avatar,isBot}`, `head`, `base`, `diff {additions,deletions,files}`, `checks {passed,total,items[]}`, `reviews {approved,requested,items[]}`, `labels[]`, `mergeCommit?`, `timestamps {opened,updated,merged?}`, `snapshotAt`, `files[] {path,additions,deletions}` (Detail formats).

Fonts: Inter + JetBrains Mono (present) plus Barlow, Barlow Condensed, Manrope, Instrument Sans, Chakra Petch, Newsreader — self-hosted woff2, latin subset, `font-display: swap`, loaded only by the family that needs them via `next/font/local` or `@font-face` in the family's `tokens.css`.

Base rules shared by every format live in `components/cards/base.css`; `cards.css` only imports (base first, then each family's `tokens.css`), so family tokens win the cascade purely by source order.

The existing `components/pr-card.tsx` `PrCard` becomes `Card family="midnight" format="standard"`; `BrowserFrame` and the device bezels stay in `components/editor/frames/` (they are editor chrome, not card content).

## 5. GitHub ingestion — `lib/github/`

`GET /api/pr?url=` or `?repo=&number=`:
1. `parsePrUrl` (existing) → `{repo, number}`; 400 on failure.
2. Token: session user's decrypted GitHub token → else `GITHUB_PUBLIC_TOKEN` → else unauthenticated.
3. `pr_cache` lookup. A **public** row inside its TTL is returned as-is. A row for a **private**
   repository (`is_private`) never short-circuits: the cache key is `(repo, number)` only and
   carries no reader identity, so a private row is *always* revalidated with the caller's own
   token. GitHub arbitrates — 304 → bump `fetched_at`, return cached; 404 → `pr_not_found` for
   anyone without access. Otherwise a conditional GET with `If-None-Match`; 304 → bump
   `fetched_at`, return cached.
4. Fetch `pulls/{n}`, `pulls/{n}/reviews`, `pulls/{n}/files` (first 100), `commits/{sha}/check-runs` (via `@octokit/rest`).
5. `toPrFacts()` mapper (pure, unit-tested). Type derives from conventional-commit prefix → labels → branch → author-bot, per the design doc's type table.
6. Typed errors: `PrNotFound`, `PrForbidden` (private, no scope), `RateLimited { resetAt }`. Surface `x-ratelimit-remaining` in a response header.

Anonymous callers are limited to 30 requests per 10 minutes per IP (in-memory token bucket, oldest-touched eviction above 50,000 keys); `pr_cache` is swept of rows older than 7 days at most every 10 minutes; every GitHub call carries a 10 s timeout; `mergeable_state: 'unknown'` is never cached.

OAuth App scopes: `read:user user:email repo`. Known migration: GitHub App for fine-grained install permissions and higher limits.

## 6. Editor — `components/editor/`

`app/(app)/editor/page.tsx` is a server component: loads session + `settings.editor`, passes `initialDesign` and `features`. Client tree: `EditorProvider` (reducer with bounded undo/redo history replacing the `past`/`future` refs) → `Toolbar`, `Canvas`, `panels/{Import,Card,Background,Layers,Transform,Motion,Export}`. `lib/editor/design.ts` holds the `Design` zod schema (shared with Remotion input props) and `encodeDesign`/`decodeDesign` for the URL.

## 7. Export — `lib/export/`

| Path | Who | Enforceable |
|---|---|---|
| Client: `html-to-image` on the canvas, ≤2×, watermark when `!can('no-watermark')` | free + pro | advisory only |
| `POST /api/export/still` → Remotion `renderStill(StillComposition, design)` → storage → `exports` row → signed URL | pro | yes |
| `POST /api/export/video` → `exports` pending + `render_jobs` → `renderMedia` (local) or `renderMediaOnLambda` → progress endpoint `GET /api/exports/:id` → storage → ready | pro | yes |

Entitlements: `lib/billing/entitlements.ts` exports `can(user, cap)` with `cap ∈ 'export:4x' | 'export:5x' | 'no-watermark' | 'video' | 'api'`. Called by every route handler **and** read by the UI; one source of truth.

Storage: `lib/storage/` with `put/getSignedUrl/delete` over `s3` (`@aws-sdk/client-s3`, works for R2/MinIO), `blob` (Vercel Blob), `local` (dev filesystem, served by a route).

## 8. Video — `remotion/`

`remotion/Root.tsx` registers `PullsheetStill` and `PullsheetClip` compositions; input props = `Design`. The 8 clips (`fadeIn zoomIn slideUp kenBurns panLeft tilt bounce pulse`) are `remotion/clips/*.ts` keyframe functions applied to the card stage. `pnpm remotion:studio` previews locally; `pnpm remotion:deploy` ships the Lambda + serve URL. Local mode requires Chrome (Remotion downloads headless shell on first run) and does not work on Vercel serverless — documented.

## 9. Billing — `lib/billing/`

Stripe Checkout (subscription, monthly/yearly prices) and Customer Portal. `POST /api/webhooks/stripe` verifies signature, inserts into `webhook_events` (unique event id; conflict → 200 no-op), then handles `checkout.session.completed`, `customer.subscription.{updated,deleted}`, `invoice.payment_failed` → updates `users.plan`. Free tier: scale ≤2×, watermark, no video, no API.

## 10. Social — `lib/social/`

OAuth 2.0 + PKCE flows for X and LinkedIn (`/api/social/:provider/connect` → callback → `social_connections`). Post: load export bytes from storage → provider media upload → create post → `social_posts`. X: `POST /2/tweets` + v1.1 media upload. LinkedIn: `/rest/images?action=initializeUpload` + `/rest/posts`. Token refresh handled per provider; expired → UI prompts reconnect.

## 11. Account — `app/(app)/account/`

Sections keep their IDs (`#overview … #danger`). Each section is a server-loaded form posting to a server action that validates with zod and writes `settings`/`users`. Danger zone deletes user + cascades; storage objects are deleted by a best-effort loop (failures logged, not blocking).

## 12. Cross-cutting

- **Errors:** `lib/errors.ts` — `AppError` subclasses with `status` and `code`; route handlers wrap in `withRoute()` that maps to JSON `{ error, code, ...details }`.
- **Logging:** `pino` to stdout; request id per route.
- **Tests:** `vitest` for pure modules (`toPrFacts`, `entitlements`, `design` schema, env derivation, type-chip inference); Playwright smoke for `/`, login redirect, editor load — phase 7.
- **Lint/format:** ESLint (next config) + Prettier; card purity rule.
- **CI:** GitHub Actions: install, typecheck, lint, test, build (phase 7).
- **Scripts:** `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `db:generate`, `db:migrate`, `db:studio`, `remotion:studio`, `remotion:deploy`.

## 13. Phases

| # | Phase | Delivers | Done when |
|---|---|---|---|
| 1 | Foundation | git repo, pnpm, env + features, docker-compose Postgres, Drizzle schema + migrations, better-auth GitHub, `/api/pr` with cache, editor refactor, card model + primitives + Midnight Standard, `.env.example`, README | `cp .env.example .env.local`, fill Tier 0–1, `docker compose up -d`, `pnpm db:migrate`, `pnpm dev` → log in with GitHub, paste a PR URL, see it in the editor, export PNG |
| 2 | Card library ✅ | 6 layouts, 7 families, registry, editor picker, fonts | every (family, format) renders in editor with real `PrFacts` — confirmed: 42 combinations across 26 test files (~170 tests), `/api/pr` per-IP limiter + cache sweep shipped |
| 3 | Export real | storage drivers, `renderStill`, exports table + history UI, entitlements | Pro export lands in storage and in Recent exports |
| 4 | Video | compositions for 8 clips, local + lambda, render_jobs, progress | MP4 renders locally and via Lambda |
| 5 | Billing | Checkout, Portal, webhooks + idempotency, gating | test-mode subscription flips plan; replayed webhook is a no-op |
| 6 | Social | X + LinkedIn connect and post | an export posts to a test account |
| 7 | Hardening | public API (`api_keys`), rate limiting, pino, vitest + Playwright, CI | CI green |

Each phase gets its own implementation plan under `docs/superpowers/plans/`.

## 14. Out of scope (explicitly)

GitLab/Bitbucket import (login buttons remain, disabled with a tooltip); team workspaces; a job queue; a GitHub App; i18n.
