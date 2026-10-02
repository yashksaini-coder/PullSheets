# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Pullsheets design scaffold into a real application that boots from `.env.local`, authenticates with GitHub, imports a live pull request into the editor and exports a PNG.

**Architecture:** Single Next.js 15 App Router app. A zod-validated env module derives a `features` object that gates every optional subsystem. Postgres via Drizzle holds auth, settings, exports, PR cache. `better-auth` handles GitHub OAuth and encrypted token storage. A pure `components/cards/` library (no browser or Next imports) renders the PR card from a `PrFacts` model; `/api/pr` fills that model from the GitHub REST API with an ETag cache. The 601-line editor page becomes a server page over an `EditorProvider` reducer and panel components.

**Tech Stack:** Next.js 15.5 · React 19 · TypeScript 5.6 strict · pnpm · Postgres 16 (docker compose) · drizzle-orm + drizzle-kit · better-auth · @octokit/rest · zod · @t3-oss/env-nextjs · vitest · ESLint (next) + Prettier · html-to-image · lucide-react

**Spec:** `docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md` (§1–§6, §12, §13 row 1)

## Global Constraints

- Node ≥ 20 (machine has 26.8.2); package manager is **pnpm** (11.3.0 present). Commit `pnpm-lock.yaml`.
- `next@^15.5`, `react@^19.1`, `typescript@^5.6`, `strict: true`. Path alias `@/*` → repo root.
- Styling is plain CSS with the shipped tokens in `styles/tokens/*.css`. **No Tailwind.**
- `components/cards/**` may not import `next/*` or reference `window`, `document`, `localStorage`, `fetch`, `navigator`. Enforced by ESLint (Task 6).
- Env: Tier 0 missing ⇒ process fails at startup naming the variable. Tiers 1–5 missing ⇒ feature disabled, never a fake success. Unconfigured routes return `503 { error: 'feature_unconfigured', missing: string[] }`.
- Tokens at rest are encrypted (better-auth `encryptOAuthTokens: true`; `lib/crypto.ts` AES-256-GCM for everything else).
- GitHub OAuth scopes exactly: `read:user user:email repo`.
- `pr_cache` TTL: 10 minutes for open/draft PRs, 24 hours for merged/closed.
- Commit after every task; message style `type: summary` (feat/fix/chore/refactor/test/docs). Every commit ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Never commit `.env*.local`.

## Review Focus

1. **PR URLs with extra path or query** (`…/pull/123/files?diff=split`, trailing slash, `http://`, `www.`) — must import PR 123. Test in Task 7 (`parsePrUrl`).
2. **Private or missing PR without an authorised token** — GitHub returns 404; the route must answer `404 { code: 'pr_not_found' }`, never a 500 with a stack. Test in Task 7 (`mapGitHubError`).
3. **Primary rate limit exhausted** — GitHub answers 403 with `x-ratelimit-remaining: 0`; the route must answer `429 { code: 'rate_limited', resetAt }`. Test in Task 7.
4. **`TOKEN_ENCRYPTION_KEY` present but not 32 bytes** — must fail at boot naming the variable, not fail the first encrypt call at 2am. Test in Task 2 (`envSchema`) and Task 4 (`encrypt` throws a clear error).
5. **Undo with empty history / redo with empty future / malformed `?d=` design in the URL** — no-op and defaults, never a crash. Tests in Task 8 (`editorReducer`, `decodeDesign`).

---

### Task 1: Toolchain — pnpm, scripts, vitest, lint, format

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.nvmrc`, `.editorconfig`
- Modify: `.gitignore`

**Interfaces:**
- Produces: scripts `dev build start typecheck lint format test test:watch` used by every later task.

- [ ] **Step 1: Install dependencies with pnpm**

```bash
cd /home/yks/Projects/pullsheets
pnpm install
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths eslint eslint-config-next @eslint/eslintrc prettier @types/node
```

- [ ] **Step 2: Replace `package.json` scripts and add `engines`**

```json
{
  "name": "pullsheets",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=20.0.0" },
  "packageManager": "pnpm@11.3.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Keep the existing `dependencies` and `devDependencies` blocks; pnpm has already updated them.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'design-reference'],
  },
});
```

- [ ] **Step 4: Create `eslint.config.mjs`**

```js
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: ['.next/**', 'node_modules/**', 'design-reference/**', 'drizzle/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
```

- [ ] **Step 5: Create formatter and editor config**

`.prettierrc`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 120, "trailingComma": "all" }
```

`.prettierignore`:
```
.next
node_modules
design-reference
drizzle
pnpm-lock.yaml
public
```

`.nvmrc`:
```
20
```

`.editorconfig`:
```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 6: Extend `.gitignore`**

Append:
```
.data/
coverage/
.vercel
```

- [ ] **Step 7: Verify the untouched scaffold typechecks, lints and builds**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all three exit 0. If `pnpm lint` reports `react-hooks/exhaustive-deps` warnings in `app/editor/page.tsx`, that is acceptable (warnings, not errors) — Task 8 deletes that file.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: pnpm, vitest, eslint flat config, prettier

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Env contract and feature derivation

**Files:**
- Create: `lib/env.ts`, `lib/env.test.ts`, `.env.example`

**Interfaces:**
- Produces: `env` (validated server env), `clientEnv`, `features: Features`, `deriveFeatures(raw): Features`, `envSchema`, `FEATURE_VARS`.
- `type Features = { auth: boolean; storage: boolean; video: boolean; billing: boolean; social: boolean }`
- `missingFor(feature: keyof Features): string[]` — the variable names a feature needs that are absent.

- [ ] **Step 1: Install**

```bash
pnpm add zod @t3-oss/env-nextjs
```

- [ ] **Step 2: Write the failing test `lib/env.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { deriveFeatures, envSchema, missingFor } from './env';

const tier0 = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

describe('envSchema', () => {
  it('accepts tier 0 only', () => {
    expect(envSchema.safeParse(tier0).success).toBe(true);
  });
  it('rejects a missing DATABASE_URL naming the variable', () => {
    const r = envSchema.safeParse({ ...tier0, DATABASE_URL: undefined });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('DATABASE_URL');
  });
  it('rejects a TOKEN_ENCRYPTION_KEY that is not 32 bytes', () => {
    const r = envSchema.safeParse({ ...tier0, TOKEN_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64') });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('TOKEN_ENCRYPTION_KEY');
  });
  it('rejects VIDEO_RENDER_MODE outside off|local|lambda', () => {
    expect(envSchema.safeParse({ ...tier0, VIDEO_RENDER_MODE: 'cloud' }).success).toBe(false);
  });
});

describe('deriveFeatures', () => {
  it('derives everything off with tier 0 only', () => {
    expect(deriveFeatures(envSchema.parse(tier0))).toEqual({ auth: false, storage: false, video: false, billing: false, social: false });
  });
  it('enables auth when both GitHub vars are present', () => {
    const e = envSchema.parse({ ...tier0, GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'sec' });
    expect(deriveFeatures(e).auth).toBe(true);
  });
  it('does not enable auth with only one GitHub var', () => {
    const e = envSchema.parse({ ...tier0, GITHUB_CLIENT_ID: 'id' });
    expect(deriveFeatures(e).auth).toBe(false);
  });
  it('enables billing only with all four Stripe server vars', () => {
    const partial = envSchema.parse({ ...tier0, STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'wh' });
    expect(deriveFeatures(partial).billing).toBe(false);
    const full = envSchema.parse({
      ...tier0, STRIPE_SECRET_KEY: 'sk', STRIPE_WEBHOOK_SECRET: 'wh', STRIPE_PRICE_PRO_MONTHLY: 'p1', STRIPE_PRICE_PRO_YEARLY: 'p2',
    });
    expect(deriveFeatures(full).billing).toBe(true);
  });
  it('video is on for local mode without AWS vars and requires them for lambda', () => {
    expect(deriveFeatures(envSchema.parse({ ...tier0, VIDEO_RENDER_MODE: 'local' })).video).toBe(true);
    expect(deriveFeatures(envSchema.parse({ ...tier0, VIDEO_RENDER_MODE: 'lambda' })).video).toBe(false);
  });
  it('storage: local driver needs nothing else, s3 needs bucket+region+keys', () => {
    expect(deriveFeatures(envSchema.parse({ ...tier0, STORAGE_DRIVER: 'local' })).storage).toBe(true);
    expect(deriveFeatures(envSchema.parse({ ...tier0, STORAGE_DRIVER: 's3' })).storage).toBe(false);
  });
  it('social is on when either provider is fully configured', () => {
    expect(deriveFeatures(envSchema.parse({ ...tier0, X_CLIENT_ID: 'a', X_CLIENT_SECRET: 'b' })).social).toBe(true);
  });
});

describe('missingFor', () => {
  it('lists the absent variables for a feature', () => {
    const e = envSchema.parse({ ...tier0, GITHUB_CLIENT_ID: 'id' });
    expect(missingFor('auth', e)).toEqual(['GITHUB_CLIENT_SECRET']);
  });
});
```

- [ ] **Step 2b: Run to verify it fails**

Run: `pnpm test lib/env.test.ts`
Expected: FAIL — `Cannot find module './env'`.

- [ ] **Step 3: Implement `lib/env.ts`**

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const base64Key32 = z
  .string()
  .refine((s) => Buffer.from(s, 'base64').length === 32, 'TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 (openssl rand -base64 32)');

const opt = z.string().min(1).optional();

export const envSchema = z.object({
  // Tier 0 — boot
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 chars (openssl rand -base64 32)'),
  BETTER_AUTH_URL: z.string().url(),
  TOKEN_ENCRYPTION_KEY: base64Key32,
  // Tier 1 — core
  GITHUB_CLIENT_ID: opt,
  GITHUB_CLIENT_SECRET: opt,
  GITHUB_PUBLIC_TOKEN: opt,
  // Tier 2 — storage
  STORAGE_DRIVER: z.enum(['local', 's3', 'blob']).optional(),
  S3_BUCKET: opt,
  S3_REGION: opt,
  S3_ENDPOINT: opt,
  S3_ACCESS_KEY_ID: opt,
  S3_SECRET_ACCESS_KEY: opt,
  BLOB_READ_WRITE_TOKEN: opt,
  // Tier 3 — video
  VIDEO_RENDER_MODE: z.enum(['off', 'local', 'lambda']).default('off'),
  REMOTION_AWS_ACCESS_KEY_ID: opt,
  REMOTION_AWS_SECRET_ACCESS_KEY: opt,
  REMOTION_FUNCTION_NAME: opt,
  REMOTION_SERVE_URL: opt,
  REMOTION_REGION: opt,
  // Tier 4 — billing
  STRIPE_SECRET_KEY: opt,
  STRIPE_WEBHOOK_SECRET: opt,
  STRIPE_PRICE_PRO_MONTHLY: opt,
  STRIPE_PRICE_PRO_YEARLY: opt,
  // Tier 5 — social
  X_CLIENT_ID: opt,
  X_CLIENT_SECRET: opt,
  LINKEDIN_CLIENT_ID: opt,
  LINKEDIN_CLIENT_SECRET: opt,
});

export type ServerEnv = z.infer<typeof envSchema>;

export type Features = { auth: boolean; storage: boolean; video: boolean; billing: boolean; social: boolean };

/** Which variables each feature needs. Derived, not hand-flagged — config and behaviour cannot drift. */
export const FEATURE_VARS = {
  auth: () => ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'] as const,
  storage: (e: ServerEnv) =>
    e.STORAGE_DRIVER === 's3'
      ? (['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const)
      : e.STORAGE_DRIVER === 'blob'
        ? (['BLOB_READ_WRITE_TOKEN'] as const)
        : e.STORAGE_DRIVER === 'local'
          ? ([] as const)
          : (['STORAGE_DRIVER'] as const),
  video: (e: ServerEnv) =>
    e.VIDEO_RENDER_MODE === 'lambda'
      ? (['REMOTION_AWS_ACCESS_KEY_ID', 'REMOTION_AWS_SECRET_ACCESS_KEY', 'REMOTION_FUNCTION_NAME', 'REMOTION_SERVE_URL', 'REMOTION_REGION'] as const)
      : e.VIDEO_RENDER_MODE === 'local'
        ? ([] as const)
        : (['VIDEO_RENDER_MODE'] as const),
  billing: () => ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_YEARLY'] as const,
  social: () => [] as const, // special-cased below: either provider pair is enough
} satisfies Record<keyof Features, (e: ServerEnv) => readonly string[]>;

const present = (e: ServerEnv, k: string) => {
  const v = (e as Record<string, unknown>)[k];
  return v !== undefined && v !== '' && v !== 'off';
};

export function missingFor(feature: keyof Features, e: ServerEnv): string[] {
  if (feature === 'social') {
    const x = ['X_CLIENT_ID', 'X_CLIENT_SECRET'].filter((k) => !present(e, k));
    const li = ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'].filter((k) => !present(e, k));
    return x.length === 0 || li.length === 0 ? [] : [...x, ...li];
  }
  return FEATURE_VARS[feature](e).filter((k) => !present(e, k));
}

export function deriveFeatures(e: ServerEnv): Features {
  return {
    auth: missingFor('auth', e).length === 0,
    storage: missingFor('storage', e).length === 0,
    video: missingFor('video', e).length === 0,
    billing: missingFor('billing', e).length === 0,
    social: missingFor('social', e).length === 0,
  };
}

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export const env = createEnv({
  server: envSchema.shape,
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  },
  runtimeEnv: {
    ...process.env,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation: isTest || process.env.SKIP_ENV_VALIDATION === 'true',
  emptyStringAsUndefined: true,
  onValidationError: (issues) => {
    const names = [...new Set(issues.map((i) => i.path?.join('.')).filter(Boolean))];
    throw new Error(`❌ Invalid environment: ${names.join(', ')}. Compare .env.local with .env.example.\n` + JSON.stringify(issues, null, 2));
  },
});

export const features: Features = isTest
  ? { auth: false, storage: false, video: false, billing: false, social: false }
  : deriveFeatures(env as unknown as ServerEnv);
```

- [ ] **Step 4: Run tests**

Run: `pnpm test lib/env.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Create `.env.example`**

```bash
# ───────────── Tier 0 · required to boot ─────────────
# Postgres from `docker compose up -d` (see docker-compose.yml)
DATABASE_URL=postgres://pullsheets:pullsheets@localhost:5432/pullsheets
# openssl rand -base64 32
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
# 32 bytes, base64 — openssl rand -base64 32. Encrypts social tokens at rest.
TOKEN_ENCRYPTION_KEY=

# ───────────── Tier 1 · core (login + private PR import) ─────────────
# GitHub → Settings → Developer settings → OAuth Apps → New.
# Homepage: http://localhost:3000   Callback: http://localhost:3000/api/auth/callback/github
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# Optional classic PAT with `public_repo` only. Backs the logged-out landing demo (5000 req/h instead of 60/h per IP).
GITHUB_PUBLIC_TOKEN=

# ───────────── Tier 2 · storage (export history, server renders) — phase 3 ─────────────
# local | s3 | blob     (local writes to ./.data/exports — dev only)
STORAGE_DRIVER=local
S3_BUCKET=
S3_REGION=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
BLOB_READ_WRITE_TOKEN=

# ───────────── Tier 3 · video — phase 4 ─────────────
# off | local | lambda   (local needs Chrome; lambda needs the REMOTION_* vars)
VIDEO_RENDER_MODE=off
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
REMOTION_FUNCTION_NAME=
REMOTION_SERVE_URL=
REMOTION_REGION=us-east-1

# ───────────── Tier 4 · billing — phase 5 ─────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ───────────── Tier 5 · social posting — phase 6 ─────────────
X_CLIENT_ID=
X_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

- [ ] **Step 6: Commit**

```bash
git add lib/env.ts lib/env.test.ts .env.example package.json pnpm-lock.yaml
git commit -m "feat: tiered env contract with derived feature flags

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Database — docker compose, Drizzle schema, migrations

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/schema.test.ts`, `drizzle/` (generated)
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `db` (Drizzle instance), tables `users sessions accounts verifications settings exports renderJobs prCache webhookEvents apiKeys socialConnections socialPosts`, types `User`, `NewExport`, `PrCacheRow`.

- [ ] **Step 1: Install**

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

- [ ] **Step 2: `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: pullsheets-db
    environment:
      POSTGRES_USER: pullsheets
      POSTGRES_PASSWORD: pullsheets
      POSTGRES_DB: pullsheets
    ports:
      - '5432:5432'
    volumes:
      - pullsheets-pg:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pullsheets']
      interval: 5s
      timeout: 3s
      retries: 10
volumes:
  pullsheets-pg:
```

- [ ] **Step 3: `drizzle.config.ts`**

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: 'snake_case',
});
```

Install the dotenv shim drizzle-kit needs for `.env.local`: `pnpm add -D dotenv` and change the first line to `import { config } from 'dotenv'; config({ path: '.env.local' });`.

- [ ] **Step 4: Write the failing test `lib/db/schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import * as s from './schema';

describe('schema', () => {
  it('declares every table the spec names', () => {
    const names = [s.users, s.sessions, s.accounts, s.verifications, s.settings, s.exports, s.renderJobs, s.prCache, s.webhookEvents, s.apiKeys, s.socialConnections, s.socialPosts].map(getTableName);
    expect(names).toEqual([
      'users', 'sessions', 'accounts', 'verifications', 'settings', 'exports', 'render_jobs', 'pr_cache', 'webhook_events', 'api_keys', 'social_connections', 'social_posts',
    ]);
  });
  it('users carries the plan columns', () => {
    expect(Object.keys(s.users)).toEqual(expect.arrayContaining(['plan', 'stripeCustomerId', 'stripeSubscriptionId', 'planRenewsAt']));
  });
});
```

Run: `pnpm test lib/db` → FAIL (module missing).

- [ ] **Step 5: Implement `lib/db/schema.ts`**

```ts
import { relations, sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const created = () => ts('created_at').notNull().defaultNow();
const updated = () => ts('updated_at').notNull().defaultNow().$onUpdate(() => new Date());

/* ───────── better-auth owned ───────── */

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: created(),
  updatedAt: updated(),
  // product
  plan: text('plan', { enum: ['free', 'pro'] }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  planRenewsAt: ts('plan_renews_at'),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: ts('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: created(),
    updatedAt: updated(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenExpiresAt: ts('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index('accounts_user_idx').on(t.userId)],
);

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: created(),
  updatedAt: updated(),
});

/* ───────── product ───────── */

export const settings = pgTable('settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  editor: jsonb('editor').notNull().default(sql`'{}'::jsonb`),
  export: jsonb('export').notNull().default(sql`'{}'::jsonb`),
  branding: jsonb('branding').notNull().default(sql`'{}'::jsonb`),
  notifications: jsonb('notifications').notNull().default(sql`'{}'::jsonb`),
  updatedAt: updated(),
});

export const exports = pgTable(
  'exports',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['image', 'video'] }).notNull(),
    format: text('format', { enum: ['png', 'jpg', 'mp4', 'gif'] }).notNull(),
    status: text('status', { enum: ['pending', 'rendering', 'ready', 'failed'] }).notNull().default('pending'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    scale: integer('scale').notNull().default(1),
    durationSec: real('duration_sec').notNull().default(0),
    platform: text('platform').notNull(),
    prRepo: text('pr_repo').notNull(),
    prNumber: integer('pr_number').notNull(),
    prTitle: text('pr_title').notNull(),
    prState: text('pr_state').notNull(),
    design: jsonb('design').notNull(),
    storageKey: text('storage_key'),
    bytes: integer('bytes'),
    error: text('error'),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index('exports_user_created_idx').on(t.userId, t.createdAt)],
);

export const renderJobs = pgTable(
  'render_jobs',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    exportId: text('export_id').notNull().references(() => exports.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['local', 'lambda'] }).notNull(),
    providerJobId: text('provider_job_id'),
    status: text('status', { enum: ['queued', 'running', 'done', 'failed'] }).notNull().default('queued'),
    progress: real('progress').notNull().default(0),
    error: text('error'),
    startedAt: ts('started_at'),
    finishedAt: ts('finished_at'),
    createdAt: created(),
  },
  (t) => [index('render_jobs_export_idx').on(t.exportId)],
);

export const prCache = pgTable(
  'pr_cache',
  {
    repo: text('repo').notNull(), // "owner/name", lowercase
    number: integer('number').notNull(),
    etag: text('etag'),
    state: text('state').notNull(), // PrState — drives TTL
    facts: jsonb('facts').notNull(), // PrFacts
    fetchedAt: ts('fetched_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.repo, t.number] })],
);

export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // provider event id (e.g. Stripe evt_…)
  provider: text('provider').notNull().default('stripe'),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: created(),
  processedAt: ts('processed_at'),
});

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    prefix: text('prefix').notNull(), // first 8 chars, shown in UI
    keyHash: text('key_hash').notNull().unique(), // sha256
    lastUsedAt: ts('last_used_at'),
    revokedAt: ts('revoked_at'),
    createdAt: created(),
  },
  (t) => [index('api_keys_user_idx').on(t.userId)],
);

export const socialConnections = pgTable(
  'social_connections',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: ['x', 'linkedin'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    handle: text('handle'),
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc'),
    scopes: text('scopes'),
    expiresAt: ts('expires_at'),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex('social_connections_user_provider_idx').on(t.userId, t.provider)],
);

export const socialPosts = pgTable('social_posts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  exportId: text('export_id').notNull().references(() => exports.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['x', 'linkedin'] }).notNull(),
  remotePostId: text('remote_post_id'),
  permalink: text('permalink'),
  status: text('status', { enum: ['pending', 'posted', 'failed'] }).notNull().default('pending'),
  error: text('error'),
  postedAt: ts('posted_at'),
  createdAt: created(),
});

/* ───────── relations ───────── */

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  exports: many(exports),
  settings: one(settings, { fields: [users.id], references: [settings.userId] }),
}));
export const exportsRelations = relations(exports, ({ one, many }) => ({
  user: one(users, { fields: [exports.userId], references: [users.id] }),
  renderJobs: many(renderJobs),
}));

export type User = typeof users.$inferSelect;
export type NewExport = typeof exports.$inferInsert;
export type PrCacheRow = typeof prCache.$inferSelect;
```

- [ ] **Step 6: Implement `lib/db/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pgPool?: Pool };
// Reuse the pool across Next dev hot reloads.
const pool = globalForDb.pgPool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type Db = typeof db;
export { schema };
```

- [ ] **Step 7: Add scripts to `package.json`**

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 8: Start Postgres, generate and apply the first migration**

```bash
cp -n .env.example .env.local   # then set BETTER_AUTH_SECRET and TOKEN_ENCRYPTION_KEY with: openssl rand -base64 32
docker compose up -d
pnpm db:generate     # writes drizzle/0000_*.sql + drizzle/meta
pnpm db:migrate
```

Expected: `drizzle/0000_*.sql` contains `CREATE TABLE "users"` … 12 tables; migrate prints success. Verify with `docker exec pullsheets-db psql -U pullsheets -c '\dt'` → 12 tables plus `__drizzle_migrations`.

- [ ] **Step 9: Run tests and typecheck**

Run: `pnpm test lib/db && pnpm typecheck`
Expected: PASS.

- [ ] **Step 10: Commit** (migrations are committed; `.env.local` is not)

```bash
git add docker-compose.yml drizzle.config.ts drizzle lib/db package.json pnpm-lock.yaml
git commit -m "feat: postgres via docker compose, drizzle schema and first migration

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Crypto — AES-256-GCM for tokens at rest

**Files:**
- Create: `lib/crypto.ts`, `lib/crypto.test.ts`

**Interfaces:**
- Produces: `encrypt(plain: string, key?: Buffer): string` (format `v1.<iv b64>.<tag b64>.<ciphertext b64>`), `decrypt(blob: string, key?: Buffer): string`, `sha256(s: string): string`.

- [ ] **Step 1: Failing test `lib/crypto.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, sha256 } from './crypto';

const key = Buffer.alloc(32, 7);

describe('crypto', () => {
  it('round-trips', () => {
    const blob = encrypt('gho_abc123', key);
    expect(blob.startsWith('v1.')).toBe(true);
    expect(decrypt(blob, key)).toBe('gho_abc123');
  });
  it('produces a different blob each time (random iv)', () => {
    expect(encrypt('x', key)).not.toBe(encrypt('x', key));
  });
  it('rejects a tampered ciphertext', () => {
    const blob = encrypt('secret', key);
    const parts = blob.split('.');
    parts[3] = Buffer.from(Buffer.from(parts[3], 'base64').map((b) => b ^ 1)).toString('base64');
    expect(() => decrypt(parts.join('.'), key)).toThrow();
  });
  it('rejects a wrong-length key with a clear message', () => {
    expect(() => encrypt('x', Buffer.alloc(16))).toThrow(/32 bytes/);
  });
  it('sha256 is hex and stable', () => {
    expect(sha256('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  });
});
```

Run: `pnpm test lib/crypto` → FAIL.

- [ ] **Step 2: Implement `lib/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALG = 'aes-256-gcm';

function keyFromEnv(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  return Buffer.from(raw, 'base64');
}

function assertKey(key: Buffer) {
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes (openssl rand -base64 32)');
}

export function encrypt(plain: string, key: Buffer = keyFromEnv()): string {
  assertKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

export function decrypt(blob: string, key: Buffer = keyFromEnv()): string {
  assertKey(key);
  const [v, iv, tag, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Malformed ciphertext');
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
```

- [ ] **Step 3: Run tests** → `pnpm test lib/crypto` PASS (5).

- [ ] **Step 4: Commit**

```bash
git add lib/crypto.ts lib/crypto.test.ts
git commit -m "feat: AES-256-GCM helpers for tokens at rest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Authentication — better-auth with GitHub

**Files:**
- Create: `lib/auth/index.ts`, `lib/auth/client.ts`, `lib/auth/session.ts`, `lib/auth/github-token.ts`, `app/api/auth/[...all]/route.ts`, `middleware.ts`, `components/auth/SignInGitHub.tsx`, `components/auth/SignOutButton.tsx`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Produces: `auth` (server), `authClient` (browser), `getSession()`, `requireUser()` (redirects to `/login`), `getGitHubToken(userId)` → `string | null`, `<SignInGitHub disabled? />`, `<SignOutButton />`.
- Consumes: `db`, `schema` (Task 3), `env`, `features` (Task 2).

- [ ] **Step 1: Install** — `pnpm add better-auth`

- [ ] **Step 2: `lib/auth/index.ts`**

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db, schema } from '@/lib/db';
import { env, features } from '@/lib/env';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications },
  }),
  account: {
    encryptOAuthTokens: true, // access/refresh tokens encrypted with `secret` before hitting Postgres
  },
  socialProviders: features.auth
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
          scope: ['read:user', 'user:email', 'repo'],
        },
      }
    : {},
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free', input: false },
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 3: `app/api/auth/[...all]/route.ts`**

```ts
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: `lib/auth/client.ts`**

```ts
'use client';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
export const { useSession, signOut } = authClient;
```

- [ ] **Step 5: `lib/auth/session.ts`**

```ts
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './index';

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  return session.user;
}
```

- [ ] **Step 6: `lib/auth/github-token.ts`**

```ts
import { headers } from 'next/headers';
import { auth } from './index';

/** The signed-in user's GitHub OAuth token, decrypted by better-auth. Null when not linked. */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const r = await auth.api.getAccessToken({ body: { providerId: 'github', userId }, headers: await headers() });
    return r?.accessToken ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: `middleware.ts`** (optimistic cookie check; the pages still call `requireUser()`)

```ts
import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const has = getSessionCookie(req);
  if (!has) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/editor', '/account'] };
```

- [ ] **Step 8: Sign-in / sign-out components**

`components/auth/SignInGitHub.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { GitHubIcon } from '@/components/brand-icons';
import { authClient } from '@/lib/auth/client';

export function SignInGitHub({ next = '/editor', disabled, reason }: { next?: string; disabled?: boolean; reason?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      fullWidth
      disabled={disabled || busy}
      title={disabled ? reason : undefined}
      onClick={async () => {
        setBusy(true);
        await authClient.signIn.social({ provider: 'github', callbackURL: next, errorCallbackURL: '/login?error=github' });
      }}
    >
      {busy ? <Loader2 size={18} className="spin" /> : <GitHubIcon size={18} />}
      {disabled ? 'GitHub login not configured' : 'Continue with GitHub'}
    </Button>
  );
}
```

`components/auth/SignOutButton.tsx`:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/client';

export function SignOutButton({ className = 'menu-item' }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}>
      <LogOut size={14} /> Sign out
    </button>
  );
}
```

- [ ] **Step 9: Wire `app/login/page.tsx`**

Convert to a server component that reads `features` and the `next`/`error` params, and renders the existing layout. Concretely:

1. Remove `'use client'` and the `useState`/`useToasts`/`sendLink` block.
2. Signature: `export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> })`, then `const { next = '/editor', error } = await searchParams; const session = await getSession(); if (session) redirect(next);`.
3. Replace `<Button size="lg" fullWidth href="/editor">…Continue with GitHub</Button>` with `<SignInGitHub next={next} disabled={!features.auth} reason="Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local" />`.
4. GitLab and Bitbucket: change `href="/editor"` to `aria-disabled="true"`, `href="#"`, `title="Coming later"` and add `style={{ ...altBtn, opacity: 0.5, pointerEvents: 'none' }}`.
5. Replace the magic-link `<form>` with a static note: `<p className="muted" style={{ fontSize: 12 }}>Email sign-in is coming later. GitHub is the only provider in the beta.</p>`.
6. Above the buttons, when `error` is set: `<div className="chip" role="alert">GitHub sign-in failed. Try again.</div>`.
7. Delete the `<Toaster …/>` line and its imports. Import `features` from `@/lib/env`, `getSession` from `@/lib/auth/session`, `redirect` from `next/navigation`, `SignInGitHub` from `@/components/auth/SignInGitHub`.

- [ ] **Step 10: Manual verification**

Create a GitHub OAuth App (callback `http://localhost:3000/api/auth/callback/github`), set `GITHUB_CLIENT_ID/SECRET` in `.env.local`, run `pnpm dev`:
- `/editor` logged-out → redirects to `/login?next=%2Feditor`.
- "Continue with GitHub" → GitHub consent (scopes read:user, user:email, repo) → lands on `/editor`.
- `docker exec pullsheets-db psql -U pullsheets -c 'select provider_id, left(access_token, 12) from accounts'` → the token does **not** start with `gho_` (it is encrypted).
- Unset `GITHUB_CLIENT_ID` → restart → `/login` shows the disabled "GitHub login not configured" button with the tooltip.

- [ ] **Step 11: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add lib/auth app/api/auth middleware.ts components/auth app/login/page.tsx package.json pnpm-lock.yaml
git commit -m "feat: GitHub sign-in with better-auth, protected editor and account

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Card library core — model, primitives, Midnight Standard, purity rule

**Files:**
- Create: `components/cards/model.ts`, `components/cards/model.test.ts`, `components/cards/primitives/{StatusPill,TypeChip,ChangeBar,Avatar,RepoMark,SnapshotStamp,Checks}.tsx`, `components/cards/primitives/index.ts`, `components/cards/layouts/Standard.tsx`, `components/cards/families/midnight/tokens.css`, `components/cards/registry.ts`, `components/cards/Card.tsx`, `components/cards/index.ts`, `components/cards/fixtures.ts`
- Modify: `eslint.config.mjs`, `app/layout.tsx` (import `cards.css`)
- Create: `components/cards/cards.css` (imports every family tokens file)

**Interfaces:**
- Produces:
  ```ts
  type PrState = 'open'|'draft'|'approved'|'changes'|'checks-failed'|'conflict'|'merged'|'closed';
  type PrType  = 'feat'|'fix'|'hotfix'|'chore'|'docs'|'deps'|'release'|'revert';
  type CardFamily = 'midnight'|'industrial'|'modern'|'minimal'|'futuristic'|'terminal'|'editorial';
  type CardFormat = 'queue-row'|'compact'|'standard'|'detail'|'digest'|'detail-wide';
  interface PrFacts { … }  // below
  const FRAME_WIDTH: Record<CardFormat, number>
  function inferPrType(input: { title: string; labels: string[]; headRef: string; authorLogin: string; isBot: boolean; filePaths: string[] }): PrType | null
  function relativeAge(from: Date, to?: Date): string
  function formatSnapshot(d: Date): string  // "15 SEP 2026"
  <Card family format facts />            // the single entry point
  SAMPLE_FACTS: PrFacts                    // fixture used by tests, landing demo and Remotion preview
  ```
- Layout props contract every family and later format must follow: `({ facts, family }: { facts: PrFacts; family: CardFamily }) => JSX.Element`, root element `className={\`pc pc-${family} pc-${format}\`}` with `style={{ width: FRAME_WIDTH[format] }}`.

- [ ] **Step 1: Failing tests `components/cards/model.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { FRAME_WIDTH, formatSnapshot, inferPrType, relativeAge } from './model';

const base = { labels: [] as string[], headRef: 'feat/x', authorLogin: 'mira', isBot: false, filePaths: ['src/a.ts'] };

describe('inferPrType', () => {
  it('reads a conventional-commit prefix, with scope and bang', () => {
    expect(inferPrType({ ...base, title: 'feat(editor)!: lazy hunks' })).toBe('feat');
    expect(inferPrType({ ...base, title: 'fix: null deref' })).toBe('fix');
    expect(inferPrType({ ...base, title: 'build: bump node' })).toBe('chore');
  });
  it('detects a revert by title', () => {
    expect(inferPrType({ ...base, title: 'Revert "feat: thing"' })).toBe('revert');
  });
  it('falls back to labels', () => {
    expect(inferPrType({ ...base, title: 'Add thing', labels: ['enhancement'] })).toBe('feat');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['bug'] })).toBe('fix');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['P0'] })).toBe('hotfix');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['dependencies'] })).toBe('deps');
  });
  it('falls back to branch prefixes', () => {
    expect(inferPrType({ ...base, title: 'Thing', headRef: 'hotfix/login' })).toBe('hotfix');
    expect(inferPrType({ ...base, title: 'Thing', headRef: 'release/1.4' })).toBe('release');
  });
  it('bot authors are deps', () => {
    expect(inferPrType({ ...base, title: 'Bump esbuild', authorLogin: 'dependabot[bot]', isBot: true })).toBe('deps');
  });
  it('docs when every file is under docs/ or is markdown', () => {
    expect(inferPrType({ ...base, title: 'Typos', filePaths: ['docs/a.md', 'README.md'] })).toBe('docs');
  });
  it('version titles are releases', () => {
    expect(inferPrType({ ...base, title: 'v1.4.0' })).toBe('release');
  });
  it('returns null when nothing matches', () => {
    expect(inferPrType({ ...base, title: 'Make it better' })).toBeNull();
  });
});

describe('relativeAge', () => {
  const now = new Date('2026-09-15T14:32:00Z');
  it('formats minutes, hours, days, weeks', () => {
    expect(relativeAge(new Date('2026-09-15T13:52:00Z'), now)).toBe('40m ago');
    expect(relativeAge(new Date('2026-09-15T12:32:00Z'), now)).toBe('2h ago');
    expect(relativeAge(new Date('2026-09-11T14:32:00Z'), now)).toBe('4d ago');
    expect(relativeAge(new Date('2026-08-20T14:32:00Z'), now)).toBe('3w ago');
  });
  it('never goes negative', () => {
    expect(relativeAge(new Date('2026-09-15T15:00:00Z'), now)).toBe('just now');
  });
});

describe('formatSnapshot', () => {
  it('is DD MON YYYY uppercase', () => {
    expect(formatSnapshot(new Date('2026-09-15T14:32:00Z'))).toBe('15 SEP 2026');
  });
});

describe('FRAME_WIDTH', () => {
  it('matches the asset index', () => {
    expect(FRAME_WIDTH).toEqual({ 'queue-row': 820, compact: 300, standard: 420, detail: 460, digest: 420, 'detail-wide': 720 });
  });
});
```

Run: `pnpm test components/cards` → FAIL.

- [ ] **Step 2: Implement `components/cards/model.ts`**

```ts
export const PR_STATES = ['open', 'draft', 'approved', 'changes', 'checks-failed', 'conflict', 'merged', 'closed'] as const;
export type PrState = (typeof PR_STATES)[number];

export const PR_TYPES = ['feat', 'fix', 'hotfix', 'chore', 'docs', 'deps', 'release', 'revert'] as const;
export type PrType = (typeof PR_TYPES)[number];

export const CARD_FAMILIES = ['midnight', 'industrial', 'modern', 'minimal', 'futuristic', 'terminal', 'editorial'] as const;
export type CardFamily = (typeof CARD_FAMILIES)[number];

export const CARD_FORMATS = ['queue-row', 'compact', 'standard', 'detail', 'digest', 'detail-wide'] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

/** Frame widths from the design library's asset index (heights hug content). */
export const FRAME_WIDTH: Record<CardFormat, number> = {
  'queue-row': 820, compact: 300, standard: 420, detail: 460, digest: 420, 'detail-wide': 720,
};

export interface PrPerson { login: string; name: string | null; avatarUrl: string | null; isBot: boolean }
export interface PrReview { reviewer: PrPerson; verdict: 'approved' | 'changes' | 'commented' | 'pending' }
export interface PrCheck { name: string; status: 'pass' | 'fail' | 'pending' | 'skipped'; durationSec: number | null }
export interface PrFile { path: string; additions: number; deletions: number }

/** The information model every card family renders. One source of truth; formats pick what they show. */
export interface PrFacts {
  repo: { owner: string; name: string };
  number: number;
  title: string;
  body: string;
  state: PrState;
  type: PrType | null;
  author: PrPerson;
  head: string;
  base: string;
  diff: { additions: number; deletions: number; files: number };
  checks: { passed: number; total: number; items: PrCheck[] };
  reviews: { approved: number; requested: number; items: PrReview[] };
  labels: string[];
  commits: number;
  mergeCommit: string | null;
  timestamps: { opened: string; updated: string; merged: string | null; closed: string | null }; // ISO
  snapshotAt: string; // ISO — the card's proof of time
  files: PrFile[]; // top changed files, for Detail formats
}

export const STATE_LABEL: Record<PrState, string> = {
  open: 'Open', draft: 'Draft', approved: 'Approved', changes: 'Changes requested', 'checks-failed': 'Checks failed',
  conflict: 'Conflict', merged: 'Merged', closed: 'Closed',
};

const PREFIX = /^(feat|fix|hotfix|chore|build|ci|perf|refactor|style|test|docs|deps|release|revert)(\([^)]*\))?!?:/i;
const PREFIX_MAP: Record<string, PrType> = {
  feat: 'feat', fix: 'fix', hotfix: 'hotfix', chore: 'chore', build: 'chore', ci: 'chore', perf: 'fix', refactor: 'chore',
  style: 'chore', test: 'chore', docs: 'docs', deps: 'deps', release: 'release', revert: 'revert',
};
const LABEL_MAP: Record<string, PrType> = {
  enhancement: 'feat', feature: 'feat', bug: 'fix', p0: 'hotfix', hotfix: 'hotfix', dependencies: 'deps', deps: 'deps',
  documentation: 'docs', docs: 'docs', release: 'release', chore: 'chore',
};

export function inferPrType(i: { title: string; labels: string[]; headRef: string; authorLogin: string; isBot: boolean; filePaths: string[] }): PrType | null {
  if (/^revert\s+"/i.test(i.title)) return 'revert';
  const m = PREFIX.exec(i.title.trim());
  if (m) return PREFIX_MAP[m[1].toLowerCase()];
  for (const l of i.labels) {
    const t = LABEL_MAP[l.toLowerCase()];
    if (t) return t;
  }
  if (/^hotfix\//i.test(i.headRef)) return 'hotfix';
  if (/^release\//i.test(i.headRef)) return 'release';
  if (i.isBot || /^(dependabot|renovate)/i.test(i.authorLogin)) return 'deps';
  if (/^v?\d+\.\d+(\.\d+)?/.test(i.title.trim())) return 'release';
  if (i.filePaths.length > 0 && i.filePaths.every((p) => /^docs\//i.test(p) || /\.(md|mdx|rst)$/i.test(p))) return 'docs';
  return null;
}

export function relativeAge(from: Date, to: Date = new Date()): string {
  const s = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 9) return `${w}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function formatSnapshot(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function initials(p: PrPerson): string {
  const src = p.name?.trim() || p.login;
  const parts = src.replace(/\[bot\]$/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}
```

- [ ] **Step 3: Fixture `components/cards/fixtures.ts`** (the design doc's reference PR)

```ts
import type { PrFacts } from './model';

export const SAMPLE_FACTS: PrFacts = {
  repo: { owner: 'acme', name: 'review-pane' },
  number: 4821,
  title: 'Stream diff hunks lazily in the review pane',
  body: 'Loads hunks on scroll instead of rendering the full diff up front. Cuts initial paint on 1k+ line diffs from 3.2s to 400ms.',
  state: 'open',
  type: 'feat',
  author: { login: 'mkato', name: 'Mira Kato', avatarUrl: null, isBot: false },
  head: 'feat/lazy-hunks',
  base: 'main',
  diff: { additions: 183, deletions: 42, files: 12 },
  checks: {
    passed: 7, total: 7,
    items: ['build', 'lint', 'unit', 'e2e', 'types', 'a11y', 'pkg'].map((name) => ({ name, status: 'pass' as const, durationSec: 42 })),
  },
  reviews: {
    approved: 1, requested: 2,
    items: [
      { reviewer: { login: 'ashah', name: 'Aditi Shah', avatarUrl: null, isBot: false }, verdict: 'approved' },
      { reviewer: { login: 'jthale', name: 'Jonas Thäle', avatarUrl: null, isBot: false }, verdict: 'pending' },
    ],
  },
  labels: ['enhancement', 'review-pane'],
  commits: 9,
  mergeCommit: null,
  timestamps: { opened: '2026-09-15T12:32:00Z', updated: '2026-09-15T14:20:00Z', merged: null, closed: null },
  snapshotAt: '2026-09-15T14:32:00Z',
  files: [
    { path: 'src/review/HunkList.tsx', additions: 96, deletions: 12 },
    { path: 'src/review/useVirtualHunks.ts', additions: 61, deletions: 0 },
    { path: 'src/review/DiffPane.tsx', additions: 18, deletions: 27 },
  ],
};
```

- [ ] **Step 4: Primitives** — each file is pure React. Colors come from CSS variables the family tokens define (`--pc-*`), never literals, so a primitive looks right in every family.

`components/cards/primitives/StatusPill.tsx`:
```tsx
import type { PrState } from '../model';
import { STATE_LABEL } from '../model';

const ICON: Record<PrState, string> = {
  open: 'M4 5.5v5M8 3.5h2a2 2 0 0 1 2 2v5', draft: 'M4 5.5v5', approved: 'M3 8l3 3 7-7', changes: 'M4 4l8 8M12 4l-8 8',
  'checks-failed': 'M4 4l8 8M12 4l-8 8', conflict: 'M8 3v6M8 12v1', merged: 'M4 5.5v5M4 5.5a6 6 0 0 0 8 5.5', closed: 'M4 4l8 8M12 4l-8 8',
};

export function StatusPill({ state }: { state: PrState }) {
  return (
    <span className={`pc-pill pc-pill-${state}`}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d={ICON[state]} />
      </svg>
      {STATE_LABEL[state]}
    </span>
  );
}
```

`components/cards/primitives/TypeChip.tsx`:
```tsx
import type { PrType } from '../model';
export function TypeChip({ type }: { type: PrType | null }) {
  if (!type) return null;
  return <span className={`pc-chip pc-chip-${type}`}>{type}</span>;
}
```

`components/cards/primitives/ChangeBar.tsx`:
```tsx
export function ChangeBar({ additions, deletions, height = 4 }: { additions: number; deletions: number; height?: number }) {
  const total = Math.max(1, additions + deletions);
  const add = Math.round((additions / total) * 100);
  return (
    <div className="pc-bar" style={{ height }} role="img" aria-label={`+${additions} −${deletions}`}>
      <div className="pc-bar-add" style={{ width: `${add}%` }} />
      <div className="pc-bar-del" style={{ width: `${100 - add}%` }} />
    </div>
  );
}
```

`components/cards/primitives/Avatar.tsx`:
```tsx
import { initials, type PrPerson } from '../model';
export function Avatar({ person, size = 22 }: { person: PrPerson; size?: number }) {
  return (
    <span className={`pc-avatar${person.isBot ? ' pc-avatar-bot' : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} title={person.name ?? person.login}>
      {person.isBot ? '⚙' : initials(person)}
    </span>
  );
}
export function AvatarStack({ people, size = 22 }: { people: PrPerson[]; size?: number }) {
  return (
    <span className="pc-avatars">
      {people.map((p) => <Avatar key={p.login} person={p} size={size} />)}
    </span>
  );
}
```

`components/cards/primitives/RepoMark.tsx`:
```tsx
export function RepoMark({ owner, name }: { owner: string; name: string }) {
  return (
    <span className="pc-repo">
      <span className="pc-repo-tile" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h7.5a1.5 1.5 0 0 1 1.5 1.5v9.5H4.5A1.5 1.5 0 0 1 3 12V2.5zM3 11h9" /></svg>
      </span>
      <span className="pc-repo-owner">{owner} /</span> {name}
    </span>
  );
}
```

`components/cards/primitives/SnapshotStamp.tsx`:
```tsx
import { formatSnapshot } from '../model';
export function SnapshotStamp({ at, merged }: { at: string; merged?: boolean }) {
  return <span className="pc-stamp">{merged ? 'MERGED' : 'SNAPSHOT'} · {formatSnapshot(new Date(at))}</span>;
}
```

`components/cards/primitives/Checks.tsx`:
```tsx
export function Checks({ passed, total }: { passed: number; total: number }) {
  const ok = total > 0 && passed === total;
  return <span className={`pc-checks ${ok ? 'pc-checks-ok' : total === 0 ? 'pc-checks-none' : 'pc-checks-bad'}`}>checks {passed}/{total}</span>;
}
```

`components/cards/primitives/index.ts`:
```ts
export { StatusPill } from './StatusPill';
export { TypeChip } from './TypeChip';
export { ChangeBar } from './ChangeBar';
export { Avatar, AvatarStack } from './Avatar';
export { RepoMark } from './RepoMark';
export { SnapshotStamp } from './SnapshotStamp';
export { Checks } from './Checks';
```

- [ ] **Step 5: Standard layout `components/cards/layouts/Standard.tsx`** (Midnight Standard per design page 4e / 1b; the structure is shared by every token-only family)

```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH, relativeAge } from '../model';
import { AvatarStack, ChangeBar, Checks, RepoMark, SnapshotStamp, StatusPill, TypeChip } from '../primitives';

export function Standard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const merged = facts.state === 'merged';
  const now = new Date(facts.snapshotAt);
  const age = relativeAge(new Date(merged && facts.timestamps.merged ? facts.timestamps.merged : facts.timestamps.opened), now);
  const people = [facts.author, ...facts.reviews.items.map((r) => r.reviewer)];
  const verdicts = facts.reviews.items.map((r) => `${r.reviewer.name?.split(' ')[0] ?? r.reviewer.login} ${r.verdict === 'approved' ? 'approved' : r.verdict === 'changes' ? 'requested changes' : 'waiting'}`);
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <TypeChip type={facts.type} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{merged ? 'merged' : 'opened'} {age}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <div className="pc-branches">
        <code>{facts.head}</code> <span className="pc-arrow">→</span> <code>{facts.base}</code>
        {facts.mergeCommit && <code className="pc-sha">{facts.mergeCommit.slice(0, 7)}</code>}
      </div>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} />
      <div className="pc-stats">
        <span className="pc-add">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-files">{facts.diff.files} files</span>
        <Checks passed={facts.checks.passed} total={facts.checks.total} />
      </div>
      {facts.labels.length > 0 && (
        <div className="pc-labels">
          {facts.labels.slice(0, 3).map((l) => <span key={l} className="pc-label">{l}</span>)}
          {facts.labels.length > 3 && <span className="pc-label pc-label-more">+{facts.labels.length - 3}</span>}
        </div>
      )}
      <div className="pc-people">
        <AvatarStack people={people} />
        <span className="pc-verdicts">{[facts.author.name ?? facts.author.login, ...verdicts].join(' · ')}</span>
      </div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <SnapshotStamp at={facts.snapshotAt} merged={merged} />
      </footer>
    </article>
  );
}
```

- [ ] **Step 6: Midnight tokens `components/cards/families/midnight/tokens.css`** (dark slate ground, 10px radii, blurple accent, 1px 9% white hairline, footer strip 2.5% tint, Inter 500 titles)

```css
.pc-midnight {
  --pc-bg: #161826; --pc-fg: #e9e9ed; --pc-muted: rgba(233,233,237,.55); --pc-faint: rgba(233,233,237,.45);
  --pc-line: rgba(255,255,255,.09); --pc-accent: #9184d9; --pc-track: #3f424d;
  --pc-add: oklch(.75 .1 155); --pc-del: oklch(.72 .12 25); --pc-wait: oklch(.8 .12 80); --pc-fail: oklch(.7 .18 25);
  --pc-radius: 10px; --pc-pad: 16px;
  --pc-font: 'Inter', system-ui, sans-serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 500;
  background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-font);
  border: 1px solid var(--pc-line); border-radius: var(--pc-radius); box-shadow: 0 0 0 1px rgba(0,0,0,.4), 0 16px 40px rgba(0,0,0,.45);
}
```

Shared structure for every family goes in `components/cards/cards.css` (the family files only set variables and genuine overrides):

```css
@import './families/midnight/tokens.css';

.pc { box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: var(--pc-pad); text-align: left; line-height: 1.35; font-size: 12px; overflow: hidden; }
.pc *, .pc *::before, .pc *::after { box-sizing: inherit; }
.pc-head { display: flex; align-items: center; gap: 8px; }
.pc-num { font-family: var(--pc-mono); font-size: 11.5px; color: var(--pc-faint); }
.pc-age { margin-left: auto; font-size: 11px; color: var(--pc-faint); }
.pc-title { margin: 0; font-size: 15px; font-weight: var(--pc-title-weight); line-height: 1.3; letter-spacing: -0.01em; }
.pc-body { margin: 0; font-size: 12px; line-height: 1.5; color: var(--pc-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pc-branches { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pc-muted); }
.pc-branches code { font-family: var(--pc-mono); font-size: 11px; padding: 1px 6px; border-radius: 5px; background: rgba(255,255,255,.06); color: var(--pc-fg); }
.pc-branches .pc-sha { margin-left: auto; color: var(--pc-accent); background: transparent; }
.pc-bar { display: flex; border-radius: 2px; overflow: hidden; background: var(--pc-track); }
.pc-bar-add { background: var(--pc-add); } .pc-bar-del { background: var(--pc-del); }
.pc-stats { display: flex; align-items: center; gap: 10px; font-family: var(--pc-mono); font-size: 11px; font-weight: 500; }
.pc-add { color: var(--pc-add); } .pc-del { color: var(--pc-del); }
.pc-files { color: var(--pc-muted); font-family: var(--pc-font); font-weight: 400; }
.pc-checks { margin-left: auto; font-family: var(--pc-font); font-weight: 400; color: var(--pc-muted); }
.pc-checks-ok { color: var(--pc-add); } .pc-checks-bad { color: var(--pc-fail); }
.pc-labels { display: flex; gap: 6px; flex-wrap: wrap; }
.pc-label { font-size: 10.5px; padding: 1px 7px; border-radius: 99px; border: 1px solid var(--pc-line); color: var(--pc-muted); }
.pc-people { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--pc-muted); }
.pc-avatars { display: inline-flex; }
.pc-avatar { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--pc-accent); color: #fff; font-weight: 600; box-shadow: 0 0 0 1.5px var(--pc-bg); }
.pc-avatars .pc-avatar + .pc-avatar { margin-left: -7px; }
.pc-avatar-bot { border-radius: 6px; background: var(--pc-track); }
.pc-verdicts { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 2px calc(var(--pc-pad) * -1) calc(var(--pc-pad) * -1); padding: 10px var(--pc-pad); background: rgba(255,255,255,.025); border-top: 1px solid var(--pc-line); }
.pc-repo { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; }
.pc-repo-tile { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,.06); color: var(--pc-muted); }
.pc-repo-owner { color: var(--pc-muted); }
.pc-stamp { font-family: var(--pc-mono); font-size: 10px; letter-spacing: .05em; color: var(--pc-faint); }
.pc-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 99px; border: 1px solid currentColor; font-size: 10.5px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }
.pc-pill-open, .pc-pill-approved { color: var(--pc-add); }
.pc-pill-draft { color: var(--pc-muted); border-style: dashed; }
.pc-pill-changes, .pc-pill-conflict { color: var(--pc-wait); }
.pc-pill-checks-failed { color: var(--pc-fail); }
.pc-pill-merged { color: var(--pc-accent); }
.pc-pill-closed { color: var(--pc-faint); }
.pc-chip { font-size: 10.5px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; padding: 2px 6px; border-radius: 5px; background: rgba(145,132,217,.18); color: var(--pc-accent); }
```

- [ ] **Step 7: Registry and entry point**

`components/cards/registry.ts`:
```ts
import type { ComponentType } from 'react';
import type { CardFamily, CardFormat, PrFacts } from './model';
import { Standard } from './layouts/Standard';

export type CardComponent = ComponentType<{ facts: PrFacts; family: CardFamily }>;

/** Default layout per format. Families that need structural overrides register them in FAMILY_OVERRIDES (phase 2). */
export const LAYOUTS: Partial<Record<CardFormat, CardComponent>> = { standard: Standard };
export const FAMILY_OVERRIDES: Partial<Record<CardFamily, Partial<Record<CardFormat, CardComponent>>>> = {};
export const AVAILABLE_FAMILIES: CardFamily[] = ['midnight'];

export function resolveCard(family: CardFamily, format: CardFormat): CardComponent | null {
  return FAMILY_OVERRIDES[family]?.[format] ?? LAYOUTS[format] ?? null;
}
```

`components/cards/Card.tsx`:
```tsx
import type { CardFamily, CardFormat, PrFacts } from './model';
import { resolveCard } from './registry';

export function Card({ family, format, facts }: { family: CardFamily; format: CardFormat; facts: PrFacts }) {
  const C = resolveCard(family, format);
  if (!C) return <div className={`pc pc-${family} pc-${format} pc-missing`}>{family} / {format} is not available yet</div>;
  return <C facts={facts} family={family} />;
}
```

`components/cards/index.ts`:
```ts
export * from './model';
export { Card } from './Card';
export { AVAILABLE_FAMILIES, resolveCard } from './registry';
export { SAMPLE_FACTS } from './fixtures';
```

Add `import '@/components/cards/cards.css';` to `app/layout.tsx` after the `globals.css` import.

- [ ] **Step 8: Purity rule in `eslint.config.mjs`** — append this object to the exported array:

```js
{
  files: ['components/cards/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['next', 'next/*', '@/lib/*', '@/components/ui*', '@/components/editor/*'], message: 'components/cards must stay pure: props in, JSX out. It renders in the browser and in Remotion.' }] }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'fetch', 'location'],
  },
},
```

- [ ] **Step 9: Render test `components/cards/Card.test.tsx`** (install `pnpm add -D @testing-library/react jsdom`; set `// @vitest-environment jsdom` at the top of the file)

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from './index';

describe('Card', () => {
  it('renders Midnight Standard with the nine facts', () => {
    const { container, getByText } = render(<Card family="midnight" format="standard" facts={SAMPLE_FACTS} />);
    expect(container.firstElementChild?.className).toContain('pc-midnight');
    expect(getByText('Open')).toBeTruthy();
    expect(getByText('feat')).toBeTruthy();
    expect(getByText('#4821')).toBeTruthy();
    expect(getByText('Stream diff hunks lazily in the review pane')).toBeTruthy();
    expect(getByText('+183')).toBeTruthy();
    expect(getByText('−42')).toBeTruthy();
    expect(getByText('checks 7/7')).toBeTruthy();
    expect(getByText('SNAPSHOT · 15 SEP 2026')).toBeTruthy();
  });
  it('falls back to a visible placeholder for an unregistered format', () => {
    const { getByText } = render(<Card family="midnight" format="compact" facts={SAMPLE_FACTS} />);
    expect(getByText(/not available yet/)).toBeTruthy();
  });
  it('shows MERGED in the stamp and the sha for merged PRs', () => {
    const { getByText } = render(<Card family="midnight" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee', timestamps: { ...SAMPLE_FACTS.timestamps, merged: '2026-09-14T14:32:00Z' } }} />);
    expect(getByText('MERGED · 15 SEP 2026')).toBeTruthy();
    expect(getByText('a41f92c')).toBeTruthy();
  });
});
```

- [ ] **Step 10: Run** — `pnpm test components/cards && pnpm lint && pnpm typecheck` → PASS. Then deliberately add `import Link from 'next/link'` to `Standard.tsx`, run `pnpm lint` → expect the purity error, remove it.

- [ ] **Step 11: Commit**

```bash
git add components/cards eslint.config.mjs app/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat(cards): PrFacts model, primitives, Midnight Standard, purity lint rule

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: GitHub ingestion — mapper, cache, `/api/pr`, `/api/pr/recent`

**Files:**
- Create: `lib/errors.ts`, `lib/errors.test.ts`, `lib/github/types.ts`, `lib/github/to-pr-facts.ts`, `lib/github/to-pr-facts.test.ts`, `lib/github/fixtures/pull.json`, `lib/github/client.ts`, `lib/github/fetch-pr.ts`, `lib/github/parse-url.ts`, `lib/github/parse-url.test.ts`, `lib/github/recent.ts`, `app/api/pr/route.ts`, `app/api/pr/recent/route.ts`
- Modify: `lib/data.ts` (delete `parsePrUrl`, `RECENT_PRS`, `PullRequest`, `PrStatus` — moved/replaced), `components/ui.tsx` (StatusPill takes `PrState`)

**Interfaces:**
- Produces:
  ```ts
  class AppError extends Error { status: number; code: string; details?: Record<string, unknown> }
  class NotFound / Forbidden / RateLimited / Unauthorized / FeatureUnconfigured / BadRequest extends AppError
  withRoute(handler: (req: NextRequest, ctx) => Promise<Response>): same   // maps AppError → JSON
  parsePrUrl(u: string): { owner: string; repo: string; number: number } | null
  toPrFacts(input: { pull: GhPull; reviews: GhReview[]; files: GhFile[]; checkRuns: GhCheckRun[]; snapshotAt?: Date }): PrFacts
  mapGitHubError(e: unknown): AppError
  fetchPrFacts(ref: { owner: string; repo: string; number: number }, opts: { token: string | null; force?: boolean }): Promise<{ facts: PrFacts; cached: boolean; rateRemaining: number | null }>
  listRecentPrs(token: string, login: string): Promise<RecentPr[]>  // RecentPr = { owner, repo, number, title, state: PrState, updatedAt }
  ```
- HTTP: `GET /api/pr?url=…` or `?owner=&repo=&number=` → `200 PrFacts` (header `x-pr-cache: hit|miss`, `x-ratelimit-remaining`), `400 bad_request`, `404 pr_not_found`, `403 pr_forbidden`, `429 rate_limited { resetAt }`. `GET /api/pr/recent` → `401` or `RecentPr[]`.

- [ ] **Step 1: Install** — `pnpm add @octokit/rest @octokit/request-error`

- [ ] **Step 2: `lib/errors.ts` + test**

```ts
import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
  toResponse() {
    return NextResponse.json({ error: this.message, code: this.code, ...this.details }, { status: this.status });
  }
}
export class BadRequest extends AppError { constructor(m: string, d?: Record<string, unknown>) { super(400, 'bad_request', m, d); } }
export class Unauthorized extends AppError { constructor(m = 'Sign in required') { super(401, 'unauthorized', m); } }
export class Forbidden extends AppError { constructor(code: string, m: string) { super(403, code, m); } }
export class NotFound extends AppError { constructor(code: string, m: string) { super(404, code, m); } }
export class RateLimited extends AppError { constructor(resetAt: string) { super(429, 'rate_limited', 'GitHub rate limit reached', { resetAt }); } }
export class FeatureUnconfigured extends AppError { constructor(missing: string[]) { super(503, 'feature_unconfigured', `Feature not configured: set ${missing.join(', ')}`, { missing }); } }

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;
export function withRoute<C>(h: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await h(req, ctx);
    } catch (e) {
      if (e instanceof AppError) return e.toResponse();
      console.error('[route]', e);
      return NextResponse.json({ error: 'Internal error', code: 'internal' }, { status: 500 });
    }
  };
}
```

`lib/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FeatureUnconfigured, NotFound, withRoute } from './errors';

describe('withRoute', () => {
  it('maps AppError to JSON with its status', async () => {
    const h = withRoute(async () => { throw new NotFound('pr_not_found', 'nope'); });
    const r = await h(new Request('http://x'), {});
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'nope', code: 'pr_not_found' });
  });
  it('carries details for feature_unconfigured', async () => {
    const r = await withRoute(async () => { throw new FeatureUnconfigured(['A', 'B']); })(new Request('http://x'), {});
    expect(r.status).toBe(503);
    expect((await r.json()).missing).toEqual(['A', 'B']);
  });
  it('hides unknown errors behind a 500', async () => {
    const r = await withRoute(async () => { throw new Error('secret stack'); })(new Request('http://x'), {});
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('secret');
  });
});
```

- [ ] **Step 3: `lib/github/parse-url.ts` + test** (Review Focus #1)

```ts
export function parsePrUrl(u: string): { owner: string; repo: string; number: number } | null {
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i.exec((u ?? '').trim());
  return m ? { owner: m[1], repo: m[2], number: Number(m[3]) } : null;
}
```

`lib/github/parse-url.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parsePrUrl } from './parse-url';
describe('parsePrUrl', () => {
  it.each([
    'https://github.com/acme/review-pane/pull/4821',
    'http://www.github.com/acme/review-pane/pull/4821/',
    'github.com/acme/review-pane/pull/4821/files?diff=split#diff-abc',
    '  https://github.com/acme/review-pane/pull/4821  ',
  ])('parses %s', (u) => expect(parsePrUrl(u)).toEqual({ owner: 'acme', repo: 'review-pane', number: 4821 }));
  it.each(['https://github.com/acme/review-pane', 'https://github.com/acme/review-pane/issues/12', 'https://gitlab.com/a/b/-/merge_requests/1', ''])('rejects %s', (u) => expect(parsePrUrl(u)).toBeNull());
});
```

- [ ] **Step 4: `lib/github/types.ts`** — the narrow slices of GitHub's responses the mapper reads (keeps tests free of octokit types)

```ts
export interface GhUser { login: string; name?: string | null; avatar_url: string | null; type: 'User' | 'Bot' | 'Organization' }
export interface GhPull {
  number: number; title: string; body: string | null; state: 'open' | 'closed'; draft: boolean; merged: boolean;
  merge_commit_sha: string | null; mergeable_state?: string | null;
  user: GhUser; head: { ref: string; sha: string }; base: { ref: string; repo: { name: string; owner: { login: string } } };
  additions: number; deletions: number; changed_files: number; commits: number;
  labels: { name: string }[]; requested_reviewers?: GhUser[];
  created_at: string; updated_at: string; merged_at: string | null; closed_at: string | null;
}
export interface GhReview { user: GhUser; state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'; submitted_at: string | null }
export interface GhFile { filename: string; additions: number; deletions: number }
export interface GhCheckRun { name: string; status: 'queued' | 'in_progress' | 'completed'; conclusion: string | null; started_at: string | null; completed_at: string | null }
```

- [ ] **Step 5: Fixture `lib/github/fixtures/pull.json`**

```json
{
  "pull": {
    "number": 4821, "title": "feat: Stream diff hunks lazily in the review pane",
    "body": "Loads hunks on scroll instead of rendering the full diff up front.\r\n\r\nCuts initial paint on 1k+ line diffs from 3.2s to 400ms.",
    "state": "open", "draft": false, "merged": false, "merge_commit_sha": null, "mergeable_state": "clean",
    "user": { "login": "mkato", "name": "Mira Kato", "avatar_url": "https://avatars.githubusercontent.com/u/1", "type": "User" },
    "head": { "ref": "feat/lazy-hunks", "sha": "abc123" },
    "base": { "ref": "main", "repo": { "name": "review-pane", "owner": { "login": "acme" } } },
    "additions": 183, "deletions": 42, "changed_files": 12, "commits": 9,
    "labels": [{ "name": "enhancement" }, { "name": "review-pane" }],
    "requested_reviewers": [{ "login": "jthale", "name": "Jonas Thäle", "avatar_url": null, "type": "User" }],
    "created_at": "2026-09-15T12:32:00Z", "updated_at": "2026-09-15T14:20:00Z", "merged_at": null, "closed_at": null
  },
  "reviews": [
    { "user": { "login": "ashah", "name": "Aditi Shah", "avatar_url": null, "type": "User" }, "state": "COMMENTED", "submitted_at": "2026-09-15T13:00:00Z" },
    { "user": { "login": "ashah", "name": "Aditi Shah", "avatar_url": null, "type": "User" }, "state": "APPROVED", "submitted_at": "2026-09-15T13:30:00Z" }
  ],
  "files": [
    { "filename": "src/review/HunkList.tsx", "additions": 96, "deletions": 12 },
    { "filename": "src/review/useVirtualHunks.ts", "additions": 61, "deletions": 0 },
    { "filename": "src/review/DiffPane.tsx", "additions": 18, "deletions": 27 },
    { "filename": "README.md", "additions": 8, "deletions": 3 }
  ],
  "checkRuns": [
    { "name": "build", "status": "completed", "conclusion": "success", "started_at": "2026-09-15T12:33:00Z", "completed_at": "2026-09-15T12:34:02Z" },
    { "name": "lint", "status": "completed", "conclusion": "success", "started_at": "2026-09-15T12:33:00Z", "completed_at": "2026-09-15T12:33:40Z" },
    { "name": "e2e", "status": "in_progress", "conclusion": null, "started_at": "2026-09-15T12:33:00Z", "completed_at": null }
  ]
}
```

- [ ] **Step 6: Failing tests `lib/github/to-pr-facts.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/pull.json';
import { toPrFacts } from './to-pr-facts';
import type { GhCheckRun, GhFile, GhPull, GhReview } from './types';

const f = fixture as unknown as { pull: GhPull; reviews: GhReview[]; files: GhFile[]; checkRuns: GhCheckRun[] };
const snap = new Date('2026-09-15T14:32:00Z');

describe('toPrFacts', () => {
  const facts = toPrFacts({ ...f, snapshotAt: snap });
  it('maps identity and repo', () => {
    expect(facts.repo).toEqual({ owner: 'acme', name: 'review-pane' });
    expect(facts.number).toBe(4821);
    expect(facts.author).toEqual({ login: 'mkato', name: 'Mira Kato', avatarUrl: 'https://avatars.githubusercontent.com/u/1', isBot: false });
  });
  it('strips the conventional prefix from the title and infers the type', () => {
    expect(facts.title).toBe('Stream diff hunks lazily in the review pane');
    expect(facts.type).toBe('feat');
  });
  it('collapses CRLF body whitespace to single spaces', () => {
    expect(facts.body).toBe('Loads hunks on scroll instead of rendering the full diff up front. Cuts initial paint on 1k+ line diffs from 3.2s to 400ms.');
  });
  it('keeps only the latest review per reviewer and counts pending requests', () => {
    expect(facts.reviews.items).toEqual([
      { reviewer: { login: 'ashah', name: 'Aditi Shah', avatarUrl: null, isBot: false }, verdict: 'approved' },
      { reviewer: { login: 'jthale', name: 'Jonas Thäle', avatarUrl: null, isBot: false }, verdict: 'pending' },
    ]);
    expect(facts.reviews).toMatchObject({ approved: 1, requested: 2 });
  });
  it('counts checks with in-progress as not passed', () => {
    expect(facts.checks.passed).toBe(2);
    expect(facts.checks.total).toBe(3);
    expect(facts.checks.items[0]).toEqual({ name: 'build', status: 'pass', durationSec: 62 });
    expect(facts.checks.items[2].status).toBe('pending');
  });
  it('sorts files by churn and keeps the top 5', () => {
    expect(facts.files.map((x) => x.path)).toEqual(['src/review/HunkList.tsx', 'src/review/useVirtualHunks.ts', 'src/review/DiffPane.tsx', 'README.md']);
  });
  it('state: open with one approval of two is still open', () => {
    expect(facts.state).toBe('open');
  });
  it('state precedence: merged > closed > draft > conflict > checks-failed > changes > approved', () => {
    const mk = (p: Partial<GhPull>, reviews = f.reviews, checks = f.checkRuns) => toPrFacts({ pull: { ...f.pull, ...p }, reviews, files: f.files, checkRuns: checks, snapshotAt: snap }).state;
    expect(mk({ merged: true, state: 'closed', merged_at: '2026-09-16T00:00:00Z' })).toBe('merged');
    expect(mk({ state: 'closed' })).toBe('closed');
    expect(mk({ draft: true })).toBe('draft');
    expect(mk({ mergeable_state: 'dirty' })).toBe('conflict');
    expect(mk({}, f.reviews, [{ ...f.checkRuns[0], conclusion: 'failure' }])).toBe('checks-failed');
    expect(mk({}, [{ ...f.reviews[1], state: 'CHANGES_REQUESTED' }])).toBe('changes');
    expect(mk({ requested_reviewers: [] }, f.reviews, [f.checkRuns[0]])).toBe('approved');
  });
  it('stamps snapshotAt', () => {
    expect(facts.snapshotAt).toBe('2026-09-15T14:32:00.000Z');
  });
});
```

- [ ] **Step 7: Implement `lib/github/to-pr-facts.ts`**

```ts
import type { PrCheck, PrFacts, PrPerson, PrReview, PrState } from '@/components/cards/model';
import { inferPrType } from '@/components/cards/model';
import type { GhCheckRun, GhFile, GhPull, GhReview, GhUser } from './types';

const PREFIX = /^(feat|fix|hotfix|chore|build|ci|perf|refactor|style|test|docs|deps|release|revert)(\([^)]*\))?!?:\s*/i;

const person = (u: GhUser): PrPerson => ({ login: u.login, name: u.name ?? null, avatarUrl: u.avatar_url ?? null, isBot: u.type === 'Bot' || /\[bot\]$/.test(u.login) });

function latestReviews(reviews: GhReview[], requested: GhUser[]): PrReview[] {
  const byUser = new Map<string, GhReview>();
  for (const r of reviews) {
    if (r.state === 'PENDING' || r.state === 'DISMISSED') continue;
    const prev = byUser.get(r.user.login);
    // A later COMMENTED review does not cancel an earlier APPROVED/CHANGES_REQUESTED on GitHub either.
    if (!prev || r.state !== 'COMMENTED' || prev.state === 'COMMENTED') byUser.set(r.user.login, r);
  }
  const out: PrReview[] = [...byUser.values()].map((r) => ({
    reviewer: person(r.user),
    verdict: r.state === 'APPROVED' ? 'approved' : r.state === 'CHANGES_REQUESTED' ? 'changes' : 'commented',
  }));
  for (const u of requested) if (!byUser.has(u.login)) out.push({ reviewer: person(u), verdict: 'pending' });
  return out;
}

function checks(runs: GhCheckRun[]): PrFacts['checks'] {
  const items: PrCheck[] = runs.map((r) => ({
    name: r.name,
    status: r.status !== 'completed' ? 'pending' : r.conclusion === 'success' || r.conclusion === 'neutral' ? 'pass' : r.conclusion === 'skipped' ? 'skipped' : 'fail',
    durationSec: r.started_at && r.completed_at ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000) : null,
  }));
  return { passed: items.filter((i) => i.status === 'pass').length, total: items.length, items };
}

function deriveState(p: GhPull, reviews: PrReview[], ck: PrFacts['checks']): PrState {
  if (p.merged) return 'merged';
  if (p.state === 'closed') return 'closed';
  if (p.draft) return 'draft';
  if (p.mergeable_state === 'dirty') return 'conflict';
  if (ck.items.some((i) => i.status === 'fail')) return 'checks-failed';
  if (reviews.some((r) => r.verdict === 'changes')) return 'changes';
  const approved = reviews.filter((r) => r.verdict === 'approved').length;
  if (approved > 0 && reviews.every((r) => r.verdict === 'approved' || r.verdict === 'commented')) return 'approved';
  return 'open';
}

export function toPrFacts(i: { pull: GhPull; reviews: GhReview[]; files: GhFile[]; checkRuns: GhCheckRun[]; snapshotAt?: Date }): PrFacts {
  const p = i.pull;
  const reviews = latestReviews(i.reviews, p.requested_reviewers ?? []);
  const ck = checks(i.checkRuns);
  const files = [...i.files].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions)).slice(0, 5).map((f) => ({ path: f.filename, additions: f.additions, deletions: f.deletions }));
  const labels = p.labels.map((l) => l.name);
  const author = person(p.user);
  return {
    repo: { owner: p.base.repo.owner.login, name: p.base.repo.name },
    number: p.number,
    title: p.title.replace(PREFIX, '').trim(),
    body: (p.body ?? '').replace(/\s+/g, ' ').trim(),
    state: deriveState(p, reviews, ck),
    type: inferPrType({ title: p.title, labels, headRef: p.head.ref, authorLogin: author.login, isBot: author.isBot, filePaths: i.files.map((f) => f.filename) }),
    author,
    head: p.head.ref,
    base: p.base.ref,
    diff: { additions: p.additions, deletions: p.deletions, files: p.changed_files },
    checks: ck,
    reviews: { approved: reviews.filter((r) => r.verdict === 'approved').length, requested: reviews.filter((r) => r.verdict !== 'commented').length, items: reviews },
    labels,
    commits: p.commits,
    mergeCommit: p.merged ? p.merge_commit_sha : null,
    timestamps: { opened: p.created_at, updated: p.updated_at, merged: p.merged_at, closed: p.closed_at },
    snapshotAt: (i.snapshotAt ?? new Date()).toISOString(),
    files,
  };
}
```

Run `pnpm test lib/github` → PASS. (Add `"resolveJsonModule": true` is already in tsconfig.)

- [ ] **Step 8: `lib/github/client.ts` and `mapGitHubError`** (Review Focus #2, #3)

```ts
import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { AppError, Forbidden, NotFound, RateLimited } from '@/lib/errors';

export function githubClient(token: string | null) {
  return new Octokit({ auth: token ?? undefined, userAgent: 'pullsheets/0.1', request: { timeout: 10_000 } });
}

export function mapGitHubError(e: unknown): AppError {
  if (e instanceof RequestError) {
    const remaining = e.response?.headers?.['x-ratelimit-remaining'];
    const reset = e.response?.headers?.['x-ratelimit-reset'];
    if ((e.status === 403 || e.status === 429) && (remaining === '0' || /rate limit/i.test(e.message))) {
      return new RateLimited(reset ? new Date(Number(reset) * 1000).toISOString() : new Date(Date.now() + 60_000).toISOString());
    }
    if (e.status === 404) return new NotFound('pr_not_found', 'Pull request not found, or it is private and your GitHub login has no access');
    if (e.status === 403) return new Forbidden('pr_forbidden', 'GitHub refused access to this pull request');
    if (e.status === 401) return new Forbidden('github_token_invalid', 'Your GitHub token is no longer valid — sign out and back in');
    return new AppError(502, 'github_error', `GitHub responded ${e.status}`);
  }
  if (e instanceof AppError) return e;
  return new AppError(502, 'github_error', 'GitHub request failed');
}
```

Add to `lib/github/client.test.ts`:
```ts
import { RequestError } from '@octokit/request-error';
import { describe, expect, it } from 'vitest';
import { mapGitHubError } from './client';

const req = { method: 'GET' as const, url: 'https://api.github.com/x', headers: {} };
const mk = (status: number, headers: Record<string, string> = {}, message = 'x') =>
  new RequestError(message, status, { request: req, response: { status, url: req.url, headers, data: {} } });

describe('mapGitHubError', () => {
  it('404 → pr_not_found 404', () => { const e = mapGitHubError(mk(404)); expect([e.status, e.code]).toEqual([404, 'pr_not_found']); });
  it('403 with x-ratelimit-remaining 0 → 429 with resetAt', () => {
    const e = mapGitHubError(mk(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1789000000' }));
    expect(e.status).toBe(429);
    expect(e.details?.resetAt).toBe(new Date(1789000000 * 1000).toISOString());
  });
  it('plain 403 → pr_forbidden', () => { expect(mapGitHubError(mk(403, { 'x-ratelimit-remaining': '42' })).code).toBe('pr_forbidden'); });
  it('unknown → 502, never leaks', () => { const e = mapGitHubError(new Error('boom')); expect(e.status).toBe(502); expect(e.message).not.toContain('boom'); });
});
```

- [ ] **Step 9: `lib/github/fetch-pr.ts`** — cache with TTL and ETag

```ts
import { and, eq } from 'drizzle-orm';
import { RequestError } from '@octokit/request-error';
import type { PrFacts } from '@/components/cards/model';
import { db, schema } from '@/lib/db';
import { githubClient, mapGitHubError } from './client';
import { toPrFacts } from './to-pr-facts';
import type { GhCheckRun, GhFile, GhPull, GhReview } from './types';

export interface PrRef { owner: string; repo: string; number: number }
const TTL_OPEN_MS = 10 * 60 * 1000;
const TTL_DONE_MS = 24 * 60 * 60 * 1000;

const key = (r: PrRef) => `${r.owner}/${r.repo}`.toLowerCase();
const fresh = (row: typeof schema.prCache.$inferSelect) =>
  Date.now() - row.fetchedAt.getTime() < (row.state === 'merged' || row.state === 'closed' ? TTL_DONE_MS : TTL_OPEN_MS);

export async function fetchPrFacts(ref: PrRef, opts: { token: string | null; force?: boolean }): Promise<{ facts: PrFacts; cached: boolean; rateRemaining: number | null }> {
  const [row] = await db.select().from(schema.prCache).where(and(eq(schema.prCache.repo, key(ref)), eq(schema.prCache.number, ref.number))).limit(1);
  if (row && !opts.force && fresh(row)) return { facts: row.facts as PrFacts, cached: true, rateRemaining: null };

  const gh = githubClient(opts.token);
  const base = { owner: ref.owner, repo: ref.repo, pull_number: ref.number };
  let pull: GhPull;
  let rateRemaining: number | null = null;
  try {
    const res = await gh.rest.pulls.get({ ...base, headers: row?.etag ? { 'if-none-match': row.etag } : {} });
    pull = res.data as unknown as GhPull;
    rateRemaining = Number(res.headers['x-ratelimit-remaining'] ?? NaN) || null;
    var etag = res.headers.etag ?? null;
  } catch (e) {
    if (e instanceof RequestError && e.status === 304 && row) {
      await db.update(schema.prCache).set({ fetchedAt: new Date() }).where(and(eq(schema.prCache.repo, key(ref)), eq(schema.prCache.number, ref.number)));
      return { facts: row.facts as PrFacts, cached: true, rateRemaining: null };
    }
    throw mapGitHubError(e);
  }
  try {
    const [reviews, files, checks] = await Promise.all([
      gh.rest.pulls.listReviews({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhReview[]),
      gh.rest.pulls.listFiles({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhFile[]),
      gh.rest.checks.listForRef({ owner: ref.owner, repo: ref.repo, ref: pull.head.sha, per_page: 100 }).then((r) => r.data.check_runs as unknown as GhCheckRun[]).catch(() => [] as GhCheckRun[]),
    ]);
    const facts = toPrFacts({ pull, reviews, files, checkRuns: checks });
    await db
      .insert(schema.prCache)
      .values({ repo: key(ref), number: ref.number, etag, state: facts.state, facts, fetchedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.prCache.repo, schema.prCache.number], set: { etag, state: facts.state, facts, fetchedAt: new Date() } });
    return { facts, cached: false, rateRemaining };
  } catch (e) {
    throw mapGitHubError(e);
  }
}
```

(Replace the `var etag` with a `let etag: string | null = null;` declared before the first `try`; it is written that way above only to keep the snippet short.)

- [ ] **Step 10: `lib/github/recent.ts`**

```ts
import type { PrState } from '@/components/cards/model';
import { githubClient, mapGitHubError } from './client';

export interface RecentPr { owner: string; repo: string; number: number; title: string; state: PrState; updatedAt: string }

export async function listRecentPrs(token: string, login: string): Promise<RecentPr[]> {
  try {
    const gh = githubClient(token);
    const r = await gh.rest.search.issuesAndPullRequests({ q: `is:pr author:${login} sort:updated-desc`, per_page: 12, advanced_search: 'true' });
    return r.data.items.map((it) => {
      const [, owner, repo] = /repos\/([^/]+)\/([^/]+)$/.exec(it.repository_url) ?? [];
      const state: PrState = it.pull_request?.merged_at ? 'merged' : it.state === 'closed' ? 'closed' : it.draft ? 'draft' : 'open';
      return { owner, repo, number: it.number, title: it.title, state, updatedAt: it.updated_at };
    });
  } catch (e) {
    throw mapGitHubError(e);
  }
}
```

- [ ] **Step 11: Routes**

`app/api/pr/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getGitHubToken } from '@/lib/auth/github-token';
import { env } from '@/lib/env';
import { BadRequest, withRoute } from '@/lib/errors';
import { fetchPrFacts } from '@/lib/github/fetch-pr';
import { parsePrUrl } from '@/lib/github/parse-url';

export const GET = withRoute(async (req) => {
  const u = new URL(req.url);
  const ref = u.searchParams.get('url')
    ? parsePrUrl(u.searchParams.get('url')!)
    : u.searchParams.get('owner') && u.searchParams.get('repo') && u.searchParams.get('number')
      ? { owner: u.searchParams.get('owner')!, repo: u.searchParams.get('repo')!, number: Number(u.searchParams.get('number')) }
      : null;
  if (!ref || !Number.isInteger(ref.number) || ref.number <= 0) throw new BadRequest('Use github.com/owner/repo/pull/123');

  const session = await getSession();
  const token = (session ? await getGitHubToken(session.user.id) : null) ?? env.GITHUB_PUBLIC_TOKEN ?? null;
  const { facts, cached, rateRemaining } = await fetchPrFacts(ref, { token, force: u.searchParams.get('refresh') === '1' });

  const headers: Record<string, string> = { 'x-pr-cache': cached ? 'hit' : 'miss', 'cache-control': 'private, no-store' };
  if (rateRemaining !== null) headers['x-ratelimit-remaining'] = String(rateRemaining);
  return NextResponse.json(facts, { headers });
});
```

`app/api/pr/recent/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getGitHubToken } from '@/lib/auth/github-token';
import { db, schema } from '@/lib/db';
import { Unauthorized, withRoute } from '@/lib/errors';
import { listRecentPrs } from '@/lib/github/recent';
import { and, eq } from 'drizzle-orm';

export const GET = withRoute(async () => {
  const session = await getSession();
  if (!session) throw new Unauthorized();
  const token = await getGitHubToken(session.user.id);
  if (!token) throw new Unauthorized('GitHub is not connected');
  const [acct] = await db.select({ login: schema.accounts.accountId }).from(schema.accounts).where(and(eq(schema.accounts.userId, session.user.id), eq(schema.accounts.providerId, 'github'))).limit(1);
  // accountId is GitHub's numeric id; the search API accepts `author:` by login only, so look it up once.
  const gh = (await import('@/lib/github/client')).githubClient(token);
  const me = await gh.rest.users.getAuthenticated();
  void acct;
  return NextResponse.json(await listRecentPrs(token, me.data.login), { headers: { 'cache-control': 'private, max-age=60' } });
});
```

Simplify: drop the `acct` lookup and the `void acct` line — `users.getAuthenticated()` is sufficient. Keep the comment.

- [ ] **Step 12: Retire the demo types in `lib/data.ts` and update `StatusPill`**

In `lib/data.ts` delete `PrStatus`, `PullRequest`, `RECENT_PRS`, `parsePrUrl`. Keep `BACKGROUNDS`, `bgCss`, `ASPECTS`, `SHADOWS`, `LAYOUTS`, `CLIPS`, `OVERLAYS`, `ExportItem` (change its `status` field type to `PrState` imported from `@/components/cards/model`), `DEMO_EXPORTS`, `EXPORTS_KEY`, `loadExports`, `saveExport`.

In `components/ui.tsx` change `import type { PrStatus } from '@/lib/data'` to `import type { PrState } from '@/components/cards/model'` and make `STATUS` cover all eight states:
```ts
const STATUS: Record<PrState, { label: string; color: string }> = {
  open: { label: 'Open', color: '#1F9D4A' }, draft: { label: 'Draft', color: '#6B6560' }, approved: { label: 'Approved', color: '#1F9D4A' },
  changes: { label: 'Changes', color: '#B7791F' }, 'checks-failed': { label: 'Checks failed', color: '#C53030' }, conflict: { label: 'Conflict', color: '#B7791F' },
  merged: { label: 'Merged', color: '#7C3AED' }, closed: { label: 'Closed', color: '#C53030' },
};
export function StatusPill({ status }: { status: PrState }) { … }
```

`app/editor/page.tsx` and `app/account/page.tsx` will now fail to typecheck (they import `RECENT_PRS`, `PullRequest`, `parsePrUrl`). That is expected: Task 8 and Task 9 replace them. To keep the commit green, temporarily add to `lib/data.ts`:
```ts
// Removed in Task 8/9. Kept so the legacy pages compile until they are rewritten.
export { parsePrUrl } from '@/lib/github/parse-url';
```
and in the two pages replace `RECENT_PRS` usages with `[]` typed `as never[]` where a list is mapped — or simply skip this step and run Tasks 7, 8 and 9 before the next `pnpm typecheck`. **Choose the second**: Tasks 7–9 land as one typecheck-green sequence; commit after each regardless (the test suite stays green because tests do not import the pages).

- [ ] **Step 13: Run tests and commit**

```bash
pnpm test lib
git add lib/errors.ts lib/errors.test.ts lib/github app/api/pr lib/data.ts components/ui.tsx package.json pnpm-lock.yaml
git commit -m "feat(github): PrFacts mapper, ETag cache, /api/pr and /api/pr/recent

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Editor refactor — design schema, reducer, panels, live import

**Files:**
- Create: `lib/editor/design.ts`, `lib/editor/design.test.ts`, `components/editor/EditorProvider.tsx`, `components/editor/editor-reducer.ts`, `components/editor/editor-reducer.test.ts`, `components/editor/Editor.tsx`, `components/editor/Toolbar.tsx`, `components/editor/Canvas.tsx`, `components/editor/CardScaler.tsx`, `components/editor/frames/BrowserFrame.tsx`, `components/editor/panels/{ImportPanel,CardPanel,BackgroundPanel,LayersPanel,TransformPanel,MotionPanel,ExportMenu}.tsx`, `components/editor/use-import-pr.ts`
- Modify: `app/editor/page.tsx` (becomes a ~30-line server component)
- Delete: `components/pr-card.tsx`

**Interfaces:**
- Consumes: `Card`, `PrFacts`, `CardFamily`, `CardFormat`, `AVAILABLE_FAMILIES`, `SAMPLE_FACTS` (Task 6); `requireUser`, `getGitHubToken` (Task 5); `features` (Task 2); `/api/pr`, `/api/pr/recent` (Task 7).
- Produces:
  ```ts
  DesignSchema (zod), type Design, DEFAULT_DESIGN, encodeDesign(d): string, decodeDesign(s: string | null): Design
  editorReducer(state: EditorState, action: EditorAction): EditorState
  type EditorState = { design: Design; past: Design[]; future: Design[] }
  type EditorAction = { type: 'patch'; patch: Partial<Design> } | { type: 'undo' } | { type: 'redo' } | { type: 'reset' } | { type: 'load'; design: Design }
  useEditor(): { d: Design; update(patch): void; undo(): void; redo(): void; reset(): void; canUndo: boolean; canRedo: boolean }
  <Editor user features initialDesign />
  ```

- [ ] **Step 1: Failing tests `lib/editor/design.test.ts`** (Review Focus #5 — malformed URL)

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, DesignSchema, decodeDesign, encodeDesign } from './design';

describe('Design', () => {
  it('defaults validate', () => { expect(DesignSchema.safeParse(DEFAULT_DESIGN).success).toBe(true); });
  it('round-trips through the URL encoding', () => {
    const d = { ...DEFAULT_DESIGN, bg: 'crimson', rotY: 14, cardFamily: 'midnight' as const };
    expect(decodeDesign(encodeDesign(d))).toEqual(d);
  });
  it('falls back to defaults on garbage, null and partial input', () => {
    expect(decodeDesign('%%%not-base64')).toEqual(DEFAULT_DESIGN);
    expect(decodeDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(decodeDesign(Buffer.from(JSON.stringify({ bg: 'ember', rotX: 'nope' })).toString('base64url'))).toEqual(DEFAULT_DESIGN);
  });
  it('clamps numeric ranges', () => {
    expect(DesignSchema.safeParse({ ...DEFAULT_DESIGN, scale: 500 }).success).toBe(false);
    expect(DesignSchema.safeParse({ ...DEFAULT_DESIGN, rotX: -181 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `lib/editor/design.ts`**

```ts
import { z } from 'zod';
import { CARD_FAMILIES, CARD_FORMATS } from '@/components/cards/model';
import { ASPECTS, CLIPS, LAYOUTS, OVERLAYS, SHADOWS } from '@/lib/data';

const aspectKeys = Object.keys(ASPECTS) as [keyof typeof ASPECTS, ...(keyof typeof ASPECTS)[]];
const shadowKeys = Object.keys(SHADOWS) as [keyof typeof SHADOWS, ...(keyof typeof SHADOWS)[]];

export const DesignSchema = z.object({
  mode: z.enum(['image', 'browser', 'device']),
  browser: z.enum(['safari', 'chrome', 'none']),
  chromeDark: z.boolean(),
  device: z.enum(['macbook', 'iphone']),
  cardFamily: z.enum(CARD_FAMILIES),
  cardFormat: z.enum(CARD_FORMATS),
  bg: z.string().min(1).max(32),
  customColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  bgPad: z.number().min(0).max(40),
  noise: z.boolean(),
  shadow: z.enum(shadowKeys),
  radius: z.number().min(0).max(48),
  scale: z.number().min(20).max(100),
  caption: z.boolean(),
  captionText: z.string().max(80),
  captionSub: z.string().max(80),
  overlay: z.enum(OVERLAYS).nullable(),
  overlaySize: z.number().min(10).max(80),
  layout: z.enum(LAYOUTS.map((l) => l.key) as [string, ...string[]]),
  persp: z.number().min(300).max(3000),
  rotX: z.number().min(-180).max(180),
  rotY: z.number().min(-180).max(180),
  rotZ: z.number().min(-180).max(180),
  aspect: z.enum(aspectKeys),
  clips: z.array(z.enum(CLIPS.map((c) => c.key) as [string, ...string[]])).max(8),
});
export type Design = z.infer<typeof DesignSchema>;

export const DEFAULT_DESIGN: Design = {
  mode: 'browser', browser: 'safari', chromeDark: true, device: 'macbook', cardFamily: 'midnight', cardFormat: 'standard',
  bg: 'ember', customColor: '#E8452B', bgPad: 0, noise: false, shadow: 'soft', radius: 12, scale: 66,
  caption: true, captionText: 'Just merged.', captionSub: 'Pullsheets · v0.1', overlay: null, overlaySize: 30,
  layout: 'flat', persp: 1200, rotX: 0, rotY: 0, rotZ: 0, aspect: 'twitter', clips: [],
};

const b64 = { enc: (s: string) => Buffer.from(s, 'utf8').toString('base64url'), dec: (s: string) => Buffer.from(s, 'base64url').toString('utf8') };

export function encodeDesign(d: Design): string {
  return b64.enc(JSON.stringify(d));
}
export function decodeDesign(s: string | null | undefined): Design {
  if (!s) return DEFAULT_DESIGN;
  try {
    const r = DesignSchema.safeParse(JSON.parse(b64.dec(s)));
    return r.success ? r.data : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}
```

Note `Buffer` is available in Next route handlers and server components; in the browser Next polyfills it. If `pnpm build` complains, swap for `btoa(unescape(encodeURIComponent(s)))` / inverse.

- [ ] **Step 3: Failing tests `components/editor/editor-reducer.test.ts`** (Review Focus #5 — undo/redo at bounds)

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN } from '@/lib/editor/design';
import { editorReducer, initialEditorState } from './editor-reducer';

describe('editorReducer', () => {
  const s0 = initialEditorState(DEFAULT_DESIGN);
  it('patch pushes history and clears future', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    expect(s1.design.bg).toBe('crimson');
    expect(s1.past).toHaveLength(1);
    expect(s1.future).toHaveLength(0);
  });
  it('undo/redo walk the stacks', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    const s2 = editorReducer(s1, { type: 'undo' });
    expect(s2.design.bg).toBe('ember');
    expect(s2.future).toHaveLength(1);
    expect(editorReducer(s2, { type: 'redo' }).design.bg).toBe('crimson');
  });
  it('undo with empty past and redo with empty future are no-ops', () => {
    expect(editorReducer(s0, { type: 'undo' })).toBe(s0);
    expect(editorReducer(s0, { type: 'redo' })).toBe(s0);
  });
  it('history is bounded to 50', () => {
    let s = s0;
    for (let i = 0; i < 60; i++) s = editorReducer(s, { type: 'patch', patch: { rotX: i } });
    expect(s.past).toHaveLength(50);
  });
  it('reset restores defaults and keeps an undo step', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    const s2 = editorReducer(s1, { type: 'reset' });
    expect(s2.design).toEqual(DEFAULT_DESIGN);
    expect(editorReducer(s2, { type: 'undo' }).design.bg).toBe('crimson');
  });
});
```

- [ ] **Step 4: Implement `components/editor/editor-reducer.ts`**

```ts
import { DEFAULT_DESIGN, type Design } from '@/lib/editor/design';

export interface EditorState { design: Design; past: Design[]; future: Design[] }
export type EditorAction =
  | { type: 'patch'; patch: Partial<Design> }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' }
  | { type: 'load'; design: Design };

const LIMIT = 50;
export const initialEditorState = (design: Design): EditorState => ({ design, past: [], future: [] });

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'patch': {
      const design = { ...s.design, ...a.patch };
      return { design, past: [...s.past.slice(-(LIMIT - 1)), s.design], future: [] };
    }
    case 'reset':
      return { design: DEFAULT_DESIGN, past: [...s.past.slice(-(LIMIT - 1)), s.design], future: [] };
    case 'load':
      return { design: a.design, past: [], future: [] };
    case 'undo': {
      const prev = s.past.at(-1);
      if (!prev) return s;
      return { design: prev, past: s.past.slice(0, -1), future: [s.design, ...s.future] };
    }
    case 'redo': {
      const [next, ...rest] = s.future;
      if (!next) return s;
      return { design: next, past: [...s.past, s.design], future: rest };
    }
  }
}
```

Run `pnpm test components/editor lib/editor` → PASS.

- [ ] **Step 5: `components/editor/EditorProvider.tsx`**

```tsx
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { PrFacts } from '@/components/cards/model';
import type { Design } from '@/lib/editor/design';
import type { Features } from '@/lib/env';
import { useToasts, type Toast } from '@/components/ui';
import { editorReducer, initialEditorState } from './editor-reducer';

export interface EditorUser { id: string; name: string; image: string | null; plan: 'free' | 'pro' }

interface Ctx {
  d: Design;
  update: (patch: Partial<Design>) => void;
  undo: () => void; redo: () => void; reset: () => void;
  canUndo: boolean; canRedo: boolean;
  facts: PrFacts | null; setFacts: (f: PrFacts | null) => void;
  user: EditorUser; features: Features;
  toasts: Toast[]; toast: ReturnType<typeof useToasts>['toast']; dismiss: (id: number) => void;
}
const EditorCtx = createContext<Ctx | null>(null);

export function EditorProvider({ initialDesign, initialFacts, user, features, children }: { initialDesign: Design; initialFacts: PrFacts | null; user: EditorUser; features: Features; children: ReactNode }) {
  const [s, dispatch] = useReducer(editorReducer, initialDesign, initialEditorState);
  const [facts, setFacts] = useState<PrFacts | null>(initialFacts);
  const { toasts, toast, dismiss } = useToasts();
  const update = useCallback((patch: Partial<Design>) => dispatch({ type: 'patch', patch }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [undo, redo]);

  const value = useMemo<Ctx>(() => ({
    d: s.design, update, undo, redo, reset, canUndo: s.past.length > 0, canRedo: s.future.length > 0,
    facts, setFacts, user, features, toasts, toast, dismiss,
  }), [s, update, undo, redo, reset, facts, user, features, toasts, toast, dismiss]);
  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
}

export function useEditor() {
  const c = useContext(EditorCtx);
  if (!c) throw new Error('useEditor outside EditorProvider');
  return c;
}
```

- [ ] **Step 6: `components/editor/use-import-pr.ts`** — the real import

```ts
'use client';
import { useCallback, useState } from 'react';
import type { PrFacts } from '@/components/cards/model';
import { parsePrUrl } from '@/lib/github/parse-url';
import { useEditor } from './EditorProvider';

export function useImportPr() {
  const { setFacts, toast } = useEditor();
  const [fetching, setFetching] = useState(false);

  const importRef = useCallback(async (ref: { owner: string; repo: string; number: number }, opts?: { refresh?: boolean }) => {
    setFetching(true);
    try {
      const q = new URLSearchParams({ owner: ref.owner, repo: ref.repo, number: String(ref.number), ...(opts?.refresh ? { refresh: '1' } : {}) });
      const res = await fetch(`/api/pr?${q}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; resetAt?: string };
        const desc = body.code === 'rate_limited' && body.resetAt ? `GitHub rate limit resets ${new Date(body.resetAt).toLocaleTimeString()}` : body.error;
        toast({ type: 'error', title: body.code === 'pr_not_found' ? 'Pull request not found' : 'Import failed', description: desc });
        return null;
      }
      const facts = (await res.json()) as PrFacts;
      setFacts(facts);
      toast({ type: 'success', title: `Imported ${facts.repo.name} #${facts.number}`, description: res.headers.get('x-pr-cache') === 'hit' ? 'From cache' : undefined });
      return facts;
    } catch {
      toast({ type: 'error', title: 'Network error', description: 'Could not reach the server.' });
      return null;
    } finally {
      setFetching(false);
    }
  }, [setFacts, toast]);

  const importUrl = useCallback((raw: string) => {
    const ref = parsePrUrl(raw);
    if (!ref) { toast({ type: 'error', title: 'That is not a pull-request link', description: 'Use github.com/owner/repo/pull/123' }); return Promise.resolve(null); }
    return importRef(ref);
  }, [importRef, toast]);

  return { importUrl, importRef, fetching };
}
```

- [ ] **Step 7: Move the frame chrome** — create `components/editor/frames/BrowserFrame.tsx` containing the `BrowserFrame` function from `components/pr-card.tsx` verbatim (imports `ReactNode` only). Delete `components/pr-card.tsx`.

- [ ] **Step 8: `components/editor/CardScaler.tsx`** — renders the pure card at native width and scales it to the stage

```tsx
'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Cards are authored in px at their frame width. This fits them to the stage with a transform so export fidelity is exact. */
export function CardScaler({ nativeWidth, children }: { nativeWidth: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const fit = () => { const s = o.clientWidth / nativeWidth; setScale(s); setH(i.offsetHeight * s); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o); ro.observe(i);
    return () => ro.disconnect();
  }, [nativeWidth]);
  return (
    <div ref={outer} style={{ width: '100%', height: h, position: 'relative', overflow: 'hidden' }}>
      <div ref={inner} style={{ width: nativeWidth, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 9: Split the page into components** — mechanical moves from the current `app/editor/page.tsx` (read it; line numbers below are from the scaffold commit `8d3f28f`). Every moved block replaces `d`/`update`/`toast` with the same names from `useEditor()`, and `d.pr` with `facts` from `useEditor()` (guard `facts &&` where the old code assumed `hasPr`).

| New file | Takes | Props/contract |
|---|---|---|
| `Toolbar.tsx` | lines 260–331 (`<header className="ed-header">`) | none; uses `useEditor()`; receives `onStartOver(): void` and renders `<ExportMenu />` |
| `panels/ImportPanel.tsx` | lines 341–412 `Section "Pull request"` only | uses `useImportPr()`; recent list comes from `GET /api/pr/recent` fetched in a `useEffect` into local state (`RecentPr[]`), rows call `importRef`. Replaces the `RECENT_PRS.map` block. Add a "Refresh" icon button calling `importRef(current, { refresh: true })` when `facts` is set |
| `panels/CardPanel.tsx` | the `Section "Browser"`, `"Device frames"`, `"Card"`, `"Shadow"`, `"Text"` blocks (inside lines 341–412) | add a **Style** `Segmented` over `AVAILABLE_FAMILIES` bound to `d.cardFamily` and a **Format** `select` over `CARD_FORMATS` bound to `d.cardFormat` (unregistered formats are listed but show the placeholder card). Remove the old `cardTheme` light/dark toggle. |
| `panels/BackgroundPanel.tsx` | lines 413–440 | none |
| `panels/LayersPanel.tsx` | lines 441–461 | none |
| `panels/TransformPanel.tsx` | lines 543–567 (`rtab === '3d'`) | none |
| `panels/MotionPanel.tsx` | lines 568–590 (`rtab === 'motion'`) | `playing`, `playhead`, `setPlaying` lifted into `Canvas` and passed down |
| `panels/ExportMenu.tsx` | `saveOpen` popover + `doExport`, `copyImage`, `post` (lines 176–221 and the menu JSX in the header) | receives `stageRef: RefObject<HTMLDivElement>` and `pixelRatio: number`; `post()` is replaced by disabled buttons titled `Set X_CLIENT_ID… in .env.local` when `!features.social`; `mp4`/`gif` options disabled with `title="Video rendering lands in phase 4"` when `!features.video` |
| `Canvas.tsx` | lines 463–537 (`<div className="ed-canvas">`) plus the `box`/fit `useEffect` (lines 110–127), `transform`/`frameOuter`/`frameInner` computations (lines 237–249) and the playhead effect (lines 223–235) | renders `<CardScaler nativeWidth={FRAME_WIDTH[d.cardFormat]}><Card family={d.cardFamily} format={d.cardFormat} facts={facts ?? SAMPLE_FACTS} /></CardScaler>` where `<PrCard …/>` was; wraps in `<BrowserFrame …>` when `d.mode === 'browser'`; the "+" empty-state button now opens the Import panel instead of loading `RECENT_PRS[0]` |
| `Editor.tsx` | the shell: `<div className="ed">` + `Toolbar` + `ed-body` (left `aside` with `tab` state and the three panels, `Canvas`, right `aside` with `rtab`) + the Start-over `Dialog` + `Toaster` | props `{ user: EditorUser; features: Features; initialDesign: Design; initialFacts: PrFacts \| null; initialPrUrl?: string }`; wraps everything in `EditorProvider`; a child effect runs `importUrl(initialPrUrl)` once when provided |

The "Draft indicator" effect (lines 130–134) moves into `Toolbar`. Export's `saveExport(...)` call keeps writing to localStorage in phase 1 (phase 3 moves it to `exports`), with `status: facts.state` and `number/repo/title` read from `facts`.

- [ ] **Step 10: `app/editor/page.tsx` — the server page**

```tsx
import type { Metadata } from 'next';
import { Editor } from '@/components/editor/Editor';
import { requireUser } from '@/lib/auth/session';
import { decodeDesign } from '@/lib/editor/design';
import { features } from '@/lib/env';

export const metadata: Metadata = { title: 'Editor — Pullsheets' };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ pr?: string; d?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser(`/editor${sp.pr ? `?pr=${encodeURIComponent(sp.pr)}` : ''}`);
  return (
    <Editor
      user={{ id: user.id, name: user.name, image: user.image ?? null, plan: ((user as { plan?: string }).plan === 'pro' ? 'pro' : 'free') }}
      features={features}
      initialDesign={decodeDesign(sp.d)}
      initialFacts={null}
      initialPrUrl={sp.pr}
    />
  );
}
```

- [ ] **Step 11: Verify end to end**

`pnpm typecheck && pnpm lint && pnpm test` → green. `pnpm dev`:
- `/editor` (signed in) renders the Midnight Standard card with `SAMPLE_FACTS` inside the Safari frame.
- Paste `https://github.com/vercel/next.js/pull/1` → toast "Imported next.js #1", card shows real title, state and diff; `x-pr-cache: miss` in devtools, repeat → `hit`.
- Paste a private PR you can't see → toast "Pull request not found".
- ⌘Z after changing background → background reverts; ⌘Z with nothing to undo → nothing happens.
- Save → PNG downloads at the chosen scale; "Recent exports" in `/account` lists it.
- `/editor?pr=<url>` imports on load; `/editor?d=garbage` renders defaults.

- [ ] **Step 12: Commit**

```bash
git add app/editor components/editor lib/editor components/pr-card.tsx
git commit -m "refactor(editor): server page, EditorProvider reducer, panel components, live PR import

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Account — real session, Connected GitHub, sign out

**Files:**
- Modify: `app/account/page.tsx` → split into `app/account/page.tsx` (server) and `components/account/AccountShell.tsx` (the current client component, renamed)
- Create: `components/account/RecentPrs.tsx`

**Interfaces:**
- Consumes: `requireUser`, `getSession`, `features`, `/api/pr/recent`, `SignOutButton`.
- `AccountShell` props: `{ user: { id: string; name: string; email: string; image: string | null; plan: 'free' | 'pro' }; github: { login: string; connectedAt: string } | null; features: Features }`.

- [ ] **Step 1: Server page**

```tsx
import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { AccountShell } from '@/components/account/AccountShell';
import { requireUser } from '@/lib/auth/session';
import { db, schema } from '@/lib/db';
import { features } from '@/lib/env';

export const metadata: Metadata = { title: 'Account — Pullsheets' };

export default async function AccountPage() {
  const user = await requireUser('/account');
  const [gh] = await db.select({ login: schema.accounts.accountId, at: schema.accounts.createdAt }).from(schema.accounts)
    .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'github'))).limit(1);
  return (
    <AccountShell
      user={{ id: user.id, name: user.name, email: user.email, image: user.image ?? null, plan: (user as { plan?: string }).plan === 'pro' ? 'pro' : 'free' }}
      github={gh ? { login: gh.login, connectedAt: gh.at.toISOString() } : null}
      features={features}
    />
  );
}
```

- [ ] **Step 2: `components/account/AccountShell.tsx`** — move the whole current client component here (keep `'use client'`), rename `AccountPage` → `AccountShell`, accept the props above, and:
  - Replace the hard-coded `@yashksaini-coder` / "Yash Saini" / avatar initials with `user.name`, `user.email`, `<Avatar initials={initialsOf(user.name)} />` (`initialsOf = (n) => n.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()`).
  - "Connected GitHub" section: show `github.login` and "Connected {date}" or a `<SignInGitHub next="/account#github" />` when `github` is null; replace the `RECENT_PRS.map` list with `<RecentPrs />`.
  - Billing badge reads `user.plan`; when `!features.billing` the section renders the note "Billing is not configured on this deployment — set STRIPE_SECRET_KEY" and disables Upgrade/Manage.
  - Add `<SignOutButton className="btn btn-outline" />` to the profile section and to the header avatar menu.
  - Remove `RECENT_PRS` from the imports.

- [ ] **Step 3: `components/account/RecentPrs.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusPill } from '@/components/ui';
import type { RecentPr } from '@/lib/github/recent';

export function RecentPrs() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; items: RecentPr[] }>({ status: 'loading' });
  useEffect(() => {
    fetch('/api/pr/recent').then(async (r) => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); setState({ status: 'error', message: b.error ?? `HTTP ${r.status}` }); return; }
      setState({ status: 'ok', items: await r.json() });
    }).catch(() => setState({ status: 'error', message: 'Network error' }));
  }, []);
  if (state.status === 'loading') return <div className="muted" style={{ fontSize: 13 }}>Loading your pull requests…</div>;
  if (state.status === 'error') return <div className="muted" style={{ fontSize: 13 }}>Couldn&apos;t load recent pull requests: {state.message}</div>;
  if (state.items.length === 0) return <div className="muted" style={{ fontSize: 13 }}>No pull requests authored by you yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {state.items.map((p) => (
        <Link key={`${p.owner}/${p.repo}#${p.number}`} href={`/editor?pr=${encodeURIComponent(`https://github.com/${p.owner}/${p.repo}/pull/${p.number}`)}`} className="pr-row">
          <StatusPill status={p.state} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
          <span className="mono muted" style={{ fontSize: 12 }}>{p.repo} #{p.number}</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green. `/account` shows your GitHub name, your recent PRs (click one → editor imports it), sign out returns to `/`.

- [ ] **Step 5: Commit**

```bash
git add app/account components/account
git commit -m "feat(account): session-backed shell, connected GitHub, recent PRs, sign out

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: README, landing demo, final verification

**Files:**
- Modify: `README.md`, `app/page.tsx` (hero card → `Card` with `SAMPLE_FACTS`)
- Create: `.github/PULL_REQUEST_TEMPLATE.md` (optional, 6 lines)

- [ ] **Step 1: Landing hero** — in `app/page.tsx` locate the hero's mocked PR card markup (search for `prc` or the hard-coded PR title) and replace it with `<CardScaler nativeWidth={420}><Card family="midnight" format="standard" facts={SAMPLE_FACTS} /></CardScaler>` (import from `@/components/cards` and `@/components/editor/CardScaler`). The page is a client component already; keep it so.

- [ ] **Step 2: Rewrite `README.md`**

```markdown
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

## Environment

Tier 0 must be set or the server refuses to start. Every other tier is optional: when its variables are absent the feature is disabled in the UI and its API routes answer `503 feature_unconfigured`. See `.env.example` for every variable and `lib/env.ts` for the derivation.

| Tier | Enables | Status |
|---|---|---|
| 0 | boot (Postgres, auth secret, encryption key) | ✅ |
| 1 | GitHub login, private PR import | ✅ |
| 2 | storage — export history, server renders | phase 3 |
| 3 | video (Remotion local / Lambda) | phase 4 |
| 4 | billing (Stripe) | phase 5 |
| 5 | social posting (X, LinkedIn) | phase 6 |

## Scripts

`dev` `build` `start` · `typecheck` `lint` `format` `test` · `db:generate` `db:migrate` `db:push` `db:studio`

## Layout

```
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
```

## Architecture

`docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md` — decisions, data model, subsystems and phases. Phase plans live in `docs/superpowers/plans/`.
```

(Replace the inner triple-backtick fences with indented code or `~~~` so the Markdown nests correctly.)

- [ ] **Step 3: Final verification from a clean state**

```bash
rm -rf .next node_modules && pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
docker compose down -v && docker compose up -d && pnpm db:migrate
pnpm dev
```

Walk the phase-1 "done when" from the spec: fresh env → sign in → import a PR → export PNG → see it in Recent exports. Then unset `GITHUB_CLIENT_ID`, restart: landing still renders, `/login` shows the disabled provider with its tooltip, `GET /api/pr?url=<public PR>` still returns facts (via `GITHUB_PUBLIC_TOKEN` or anonymously).

- [ ] **Step 4: Commit**

```bash
git add README.md app/page.tsx
git commit -m "docs: README for local setup, env tiers and layout; landing hero uses the card library

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage (phase 1 row):** repo + pnpm (T1) · env + features (T2) · docker-compose Postgres, Drizzle schema + migrations (T3) · crypto (T4) · better-auth GitHub (T5) · card model + primitives + Midnight Standard + purity rule (T6) · `/api/pr` with ETag cache, typed errors (T7) · editor refactor with live import (T8) · account session + recent PRs (T9) · `.env.example` (T2) + README (T10). §12 cross-cutting: `lib/errors.ts` (T7), vitest (T1), ESLint purity (T6); pino, Playwright and CI are phase 7 per spec.

**Placeholders:** none; every code step has code. The two "move verbatim" steps (T7 frames, T8 panels) name source line ranges at commit `8d3f28f` and the props contract.

**Type consistency:** `PrState`/`PrType`/`CardFamily`/`CardFormat`/`PrFacts` defined once in T6 and consumed by T7–T9; `Design` in T8; `Features` in T2 consumed by T5, T8, T9; `RecentPr` in T7 consumed by T9; `withRoute` signature `(req: Request, ctx)` used identically in both routes.

**Review Focus:** #1 T7 step 3 · #2 and #3 T7 step 8 · #4 T2 step 2 and T4 step 1 · #5 T8 steps 1 and 3.
