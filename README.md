# Pullsheets

Turn a GitHub pull request into a share-ready image or clip for X, LinkedIn and Instagram.

## Run locally

Requirements: Node ≥ 20, pnpm, Docker.

```bash
pnpm install
cp .env.example .env.local
# Fill Tier 0: BETTER_AUTH_SECRET and TOKEN_ENCRYPTION_KEY → `openssl rand -base64 32` (run twice)
# Fill Tier 1: GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET from a GitHub OAuth App
#   Homepage  http://localhost:3000   Callback  http://localhost:3000/api/auth/callback/github
docker compose up -d
pnpm db:migrate
pnpm dev          # http://localhost:3000
```

Sign in with GitHub, paste a PR URL in the editor, export a PNG.

### Verify your setup

The maintainers could not exercise sign-in during the phase-1 build — there were no GitHub OAuth
credentials on the build machine. If you have real credentials in `.env.local`, this checklist is
the phase-1 acceptance test; walk it once after `pnpm dev` is up:

1. Sign in with GitHub from `/login`.
2. `/account` shows your GitHub handle as the connected account.
3. Paste a PR URL into the editor's import field.
4. The card on the canvas updates with that PR's facts.
5. Click Save PNG.
6. The export appears in Recent exports (`/account`).

## Environment

Tier 0 must be set or the server refuses to start. Every other tier is optional: when its
variables are absent the feature is disabled in the UI and its API routes answer `503
feature_unconfigured`. See `.env.example` for every variable and `lib/env.ts` for the derivation.

`.env.local` is git-ignored — it never leaves your machine. On first run, `pnpm db:migrate` must
be run after `docker compose up -d` so the schema exists before the app boots.

| Tier | Enables | Status |
|---|---|---|
| 0 | boot (Postgres, auth secret, encryption key) | ✅ |
| 1 | GitHub login, private PR import | ✅ |
| 2 | storage — export history, server renders | phase 3 |
| 3 | video (Remotion local / Lambda) | phase 4 |
| 4 | billing (Stripe) | phase 5 |
| 5 | social posting (X, LinkedIn) | phase 6 |

## Scripts

`dev` `build` `start` · `typecheck` `lint` `format` `format:check` `test` `test:watch` · `db:generate` `db:migrate` `db:push` `db:studio`

## Layout

~~~
app/            routes (server pages) + /api route handlers
components/
  cards/        the PR card library — pure React, no Next/browser APIs (lint-enforced). Renders in the browser and in Remotion.
  editor/       editor shell, provider/reducer, panels, canvas, frames
  account/      account shell
  auth/         sign-in / sign-out
  ui.tsx        primitives
lib/
  env.ts        tiered env + derived `features`
  db/           drizzle schema + client        drizzle/   migrations
  auth/         better-auth server + client
  github/       octokit client, PrFacts mapper, ETag cache
  editor/       Design schema + URL codec
  errors.ts     AppError + withRoute
styles/tokens/  design tokens (plain CSS)
docs/           architecture spec, phase plans, PR Cards design reference
design-reference/  original prototypes (not used at runtime)
~~~

## Architecture

`docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md` — decisions, data model, subsystems and phases. Phase plans live in `docs/superpowers/plans/`.
