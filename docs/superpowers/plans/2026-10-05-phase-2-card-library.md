# Phase 2 — Card Library + `/api/pr` Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `(family, format)` pair in the design library renders in the editor from real `PrFacts`, and the public `/api/pr` endpoint can no longer be used to drain the shared GitHub budget or grow `pr_cache` without bound.

**Architecture:** The card library stays pure (`components/cards/`, lint-enforced). Six headless slot layouts (`QueueRow`, `Compact`, `Standard`, `Detail`, `Digest`, `DetailWide`) render the one `PrFacts` model; seven families supply tokens as CSS custom properties scoped under `.pc-<family>`, and three families whose visual grammar differs (Futuristic, Terminal, Editorial) register structural overrides for the `standard` format in `FAMILY_OVERRIDES`. Fonts are self-hosted through `@fontsource` packages imported once in `app/layout.tsx`. Ingestion hardening is an in-memory per-IP token bucket on anonymous `/api/pr` calls, a throttled `pr_cache` sweep, and real request timeouts.

**Tech Stack:** Next.js 15.5 · React 19 · TypeScript strict · vitest 5 (+ jsdom for component tests) · drizzle-orm 0.45 · @octokit/rest 22 · @fontsource (Barlow, Barlow Condensed, Manrope Variable, Instrument Sans Variable, Chakra Petch, Newsreader Variable) · plain CSS

**Spec:** `docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md` — §4 (card library), §5 (ingestion), §13 row 2. The phase-1 final review's "phase 2 first tasks" are folded in as Tasks 1–2 and 9.

## Global Constraints

- Branch from `main` (`59911f5` or later) as `phase-2/card-library`. Commit after every task; **plain commit messages, no `Co-Authored-By` trailer** (user instruction).
- Node ≥ 20, pnpm. Dependencies for the whole phase are installed once, up front, by the controller: `@fontsource/barlow @fontsource/barlow-condensed @fontsource-variable/manrope @fontsource-variable/instrument-sans @fontsource/chakra-petch @fontsource-variable/newsreader`. Implementers never run `pnpm add`.
- **Purity rule** (spec §4): `components/cards/**` imports nothing from `next`, `@/lib/*`, `@/components/ui*`, `@/components/editor/*` and references none of `window document localStorage sessionStorage navigator fetch location`. ESLint enforces it; keep it green.
- Layout contract: every layout/override is `({ facts, family }: { facts: PrFacts; family: CardFamily }) => JSX.Element`, root `className={\`pc pc-${family} pc-${format}\`}`, `style={{ width: FRAME_WIDTH[format] }}`. Widths (spec §4 / asset index): `queue-row` 820, `compact` 300, `standard` 420, `detail` 460, `digest` 420, `detail-wide` 720.
- Primitives and layouts use only `--pc-*` custom properties for colour, type and radius — never literals — so a family can restyle them by tokens alone.
- Font-family names must match the fontsource CSS exactly: `'Barlow'`, `'Barlow Condensed'`, `'Manrope Variable'`, `'Instrument Sans Variable'`, `'Chakra Petch'`, `'Newsreader Variable'`; Inter and JetBrains Mono remain the self-hosted files in `public/fonts`.
- `/api/pr` anonymous limit: **30 requests per 10 minutes per client IP**, answered with `429 { code: 'rate_limited', resetAt }`. Signed-in requests are not limited by this bucket. `pr_cache` rows older than **7 days** are deleted, at most once per **10 minutes** per process.
- Every GitHub request carries a **10 s** timeout via `AbortSignal.timeout`; a timeout maps to `502 github_error`.
- Never a fake success; unconfigured or unbuilt things say so.

## Review Focus

1. **A PR with zero reviews, zero checks, zero labels and an empty body** — every layout must still render without `undefined`, `NaN` or an empty people row. Test in Task 3 (`layouts.test.tsx` "sparse facts").
2. **Very long titles / branch names / file paths** (120+ chars, no spaces) — must truncate or wrap inside the frame, never widen it. Test in Task 3 (`layouts.test.tsx` "long strings keep the frame width").
3. **Merged and closed states in every family** — the stamp says MERGED, the sha shows, Terminal prints `[ MERGED ]`, Editorial's figures sentence changes tense. Tests in Tasks 5–7.
4. **Anonymous burst then sign-in** — the 31st anonymous request in 10 minutes gets 429 with a future `resetAt`; a signed-in request from the same IP in the same window is served. Test in Task 1.
5. **A family switch while `cardFormat` is one the new family does not override** — the registry falls back to the default layout for that format, never to `pc-missing`. Test in Task 8 (`Editor.test.tsx`).

---

### Task 1: `/api/pr` hardening — per-IP token bucket, cache sweep, request timeouts

**Files:**
- Create: `lib/rate-limit.ts`, `lib/rate-limit.test.ts`, `lib/github/pr-cache-sweep.ts`, `lib/github/pr-cache-sweep.test.ts`
- Modify: `lib/github/pr-cache-store.ts` (add `sweep`), `lib/github/fetch-pr.ts` (call `maybeSweep` after `put`), `lib/github/client.ts` (timeout), `app/api/pr/route.ts` (bucket), `lib/github/fetch-pr.test.ts` (fake store gains `sweep`)

**Interfaces:**
- Produces:
  ```ts
  // lib/rate-limit.ts
  interface Bucket { capacity: number; refillPerMs: number }
  class TokenBucket { constructor(opts: Bucket, now?: () => number); take(key: string): { ok: true } | { ok: false; resetAt: Date } }
  const anonymousPrLimiter: TokenBucket   // 30 per 10 min
  function clientIp(req: Request): string // x-forwarded-for first hop → x-real-ip → 'local'
  // lib/github/pr-cache-sweep.ts
  function maybeSweep(store: Pick<PrCacheStore, 'sweep'>, now?: () => number): Promise<boolean>  // true when a sweep ran
  // lib/github/pr-cache-store.ts
  interface PrCacheStore { get; touch; put; sweep(before: Date): Promise<number> }
  ```
- Consumes: `withRoute`, `RateLimited` (`lib/errors.ts`), `getSession` (`lib/auth/session.ts`).

- [ ] **Step 1: Failing tests `lib/rate-limit.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { TokenBucket, clientIp } from './rate-limit';

describe('TokenBucket', () => {
  it('allows capacity hits then refuses with a future resetAt', () => {
    let t = 1_000_000;
    const b = new TokenBucket({ capacity: 3, refillPerMs: 3 / 600_000 }, () => t);
    expect(b.take('a').ok).toBe(true);
    expect(b.take('a').ok).toBe(true);
    expect(b.take('a').ok).toBe(true);
    const r = b.take('a');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resetAt.getTime()).toBeGreaterThan(t);
    t += 200_001; // one token refilled
    expect(b.take('a').ok).toBe(true);
  });
  it('keys are independent', () => {
    const b = new TokenBucket({ capacity: 1, refillPerMs: 0 });
    expect(b.take('a').ok).toBe(true);
    expect(b.take('b').ok).toBe(true);
    expect(b.take('a').ok).toBe(false);
  });
  it('forgets idle keys so memory stays bounded', () => {
    let t = 0;
    const b = new TokenBucket({ capacity: 1, refillPerMs: 1 / 1000 }, () => t);
    for (let i = 0; i < 5000; i++) b.take(`k${i}`);
    t += 60 * 60 * 1000;
    b.take('fresh');
    expect(b.size).toBeLessThan(10);
  });
});

describe('clientIp', () => {
  const mk = (h: Record<string, string>) => new Request('http://x', { headers: h });
  it('takes the first x-forwarded-for hop', () => { expect(clientIp(mk({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9'); });
  it('falls back to x-real-ip then local', () => {
    expect(clientIp(mk({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(mk({}))).toBe('local');
  });
});
```

- [ ] **Step 2: Run** — `pnpm test lib/rate-limit` → FAIL (module missing).

- [ ] **Step 3: Implement `lib/rate-limit.ts`**

```ts
export interface Bucket { capacity: number; refillPerMs: number }

/**
 * In-memory token bucket. One instance per process — fine for a single Next server and for
 * phase 2; a multi-instance deploy moves this to Redis/Upstash behind the same `take()`.
 */
export class TokenBucket {
  private state = new Map<string, { tokens: number; at: number }>();
  private lastGc = 0;
  constructor(private opts: Bucket, private now: () => number = Date.now) {}

  get size() { return this.state.size; }

  take(key: string): { ok: true } | { ok: false; resetAt: Date } {
    const now = this.now();
    this.gc(now);
    const s = this.state.get(key) ?? { tokens: this.opts.capacity, at: now };
    s.tokens = Math.min(this.opts.capacity, s.tokens + (now - s.at) * this.opts.refillPerMs);
    s.at = now;
    if (s.tokens >= 1) {
      s.tokens -= 1;
      this.state.set(key, s);
      return { ok: true };
    }
    this.state.set(key, s);
    const msUntilToken = this.opts.refillPerMs > 0 ? (1 - s.tokens) / this.opts.refillPerMs : Number.POSITIVE_INFINITY;
    return { ok: false, resetAt: new Date(now + Math.min(msUntilToken, 24 * 3600 * 1000)) };
  }

  /** Drop keys that have fully refilled — they are indistinguishable from unseen keys. Runs at most once a minute. */
  private gc(now: number) {
    if (now - this.lastGc < 60_000) return;
    this.lastGc = now;
    const full = this.opts.refillPerMs > 0 ? this.opts.capacity / this.opts.refillPerMs : Number.POSITIVE_INFINITY;
    for (const [k, s] of this.state) if (now - s.at >= full) this.state.delete(k);
  }
}

/** Anonymous `/api/pr`: 30 requests per 10 minutes per client. */
export const anonymousPrLimiter = new TokenBucket({ capacity: 30, refillPerMs: 30 / (10 * 60 * 1000) });

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'local';
}
```

- [ ] **Step 4: Run** — `pnpm test lib/rate-limit` → PASS (5).

- [ ] **Step 5: Failing tests `lib/github/pr-cache-sweep.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { maybeSweep, SWEEP_EVERY_MS, SWEEP_OLDER_THAN_MS } from './pr-cache-sweep';

describe('maybeSweep', () => {
  it('sweeps rows older than 7 days, then not again for 10 minutes', async () => {
    let t = 10_000_000_000;
    const calls: Date[] = [];
    const store = { sweep: async (before: Date) => { calls.push(before); return 3; } };
    expect(await maybeSweep(store, () => t)).toBe(true);
    expect(calls[0].getTime()).toBe(t - SWEEP_OLDER_THAN_MS);
    expect(await maybeSweep(store, () => t + 1000)).toBe(false);
    t += SWEEP_EVERY_MS + 1;
    expect(await maybeSweep(store, () => t)).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it('a failing sweep never breaks the caller', async () => {
    const store = { sweep: async () => { throw new Error('db down'); } };
    await expect(maybeSweep(store, () => 99_000_000_000)).resolves.toBe(false);
  });
});
```

- [ ] **Step 6: Implement `lib/github/pr-cache-sweep.ts`** (module-level clock so the throttle is per process; tests pass their own `now`, so make the last-run timestamp a map keyed by store identity to keep tests independent)

```ts
import type { PrCacheStore } from './pr-cache-store';

export const SWEEP_OLDER_THAN_MS = 7 * 24 * 60 * 60 * 1000;
export const SWEEP_EVERY_MS = 10 * 60 * 1000;

const lastRun = new WeakMap<object, number>();

/** Opportunistic janitor: called after every cache write, runs a DELETE at most every 10 minutes. */
export async function maybeSweep(store: Pick<PrCacheStore, 'sweep'>, now: () => number = Date.now): Promise<boolean> {
  const t = now();
  const last = lastRun.get(store) ?? 0;
  if (t - last < SWEEP_EVERY_MS) return false;
  lastRun.set(store, t);
  try {
    await store.sweep(new Date(t - SWEEP_OLDER_THAN_MS));
    return true;
  } catch (e) {
    console.error('[pr_cache] sweep failed', e);
    return false;
  }
}
```

- [ ] **Step 7: Add `sweep` to the store and call it from `fetchPrFacts`**

`lib/github/pr-cache-store.ts`: extend the interface with `sweep(before: Date): Promise<number>` and implement
```ts
  async sweep(before) {
    const r = await db.delete(schema.prCache).where(lt(schema.prCache.fetchedAt, before)).returning({ repo: schema.prCache.repo });
    return r.length;
  },
```
(import `lt` from `drizzle-orm`). In `lib/github/fetch-pr.ts`, after `await store.put(...)`: `void maybeSweep(store);` (fire-and-forget; import from `./pr-cache-sweep`). In `lib/github/fetch-pr.test.ts`'s `fakeStore`, add `async sweep() { calls.sweep += 1; return 0; }` and `sweep: 0` to `calls`; add one assertion to the "writes" test that `calls.sweep === 1` after a miss.

- [ ] **Step 8: Real timeouts in `lib/github/client.ts`**

Replace the dead `request: { timeout: 10_000 }` with `request: { signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS) }` where `export const GITHUB_TIMEOUT_MS = 10_000;`. In `mapGitHubError`, before the `RequestError` branch add:
```ts
  if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) return new AppError(502, 'github_error', 'GitHub did not answer within 10 seconds');
```
Add to `lib/github/client.test.ts`: `it('maps an aborted request to 502 github_error', () => { const e = new Error('x'); e.name = 'TimeoutError'; expect(mapGitHubError(e).status).toBe(502); expect(mapGitHubError(e).message).toMatch(/10 seconds/); });`

- [ ] **Step 9: Apply the bucket in `app/api/pr/route.ts`** (Review Focus #4)

After computing `session` and before `fetchPrFacts`:
```ts
  if (!session) {
    const r = anonymousPrLimiter.take(clientIp(req));
    if (!r.ok) throw new RateLimited(r.resetAt.toISOString());
  }
```
Import `anonymousPrLimiter, clientIp` from `@/lib/rate-limit` and `RateLimited` from `@/lib/errors`. Add `app/api/pr/route.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn(async () => null) }));
vi.mock('@/lib/auth/github-token', () => ({ getGitHubToken: vi.fn(async () => null) }));
vi.mock('@/lib/env', () => ({ env: { GITHUB_PUBLIC_TOKEN: undefined }, features: {} }));
vi.mock('@/lib/github/fetch-pr', () => ({ fetchPrFacts: vi.fn(async () => ({ facts: { ok: 1 }, cached: true, rateRemaining: null })) }));
import { GET } from './route';
import { getSession } from '@/lib/auth/session';

const call = (ip: string) => GET(new Request(`http://x/api/pr?owner=acme&repo=r&number=1`, { headers: { 'x-forwarded-for': ip } }), {} as never);

describe('GET /api/pr rate limit', () => {
  it('serves 30 anonymous calls per IP then 429s; a signed-in call from the same IP still works', async () => {
    for (let i = 0; i < 30; i++) expect((await call('198.51.100.7')).status).toBe(200);
    const limited = await call('198.51.100.7');
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body.code).toBe('rate_limited');
    expect(new Date(body.resetAt).getTime()).toBeGreaterThan(Date.now());
    expect((await call('198.51.100.8')).status).toBe(200);
    vi.mocked(getSession).mockResolvedValueOnce({ user: { id: 'u1' } } as never);
    expect((await call('198.51.100.7')).status).toBe(200);
  });
});
```

- [ ] **Step 10: Gates and commit** — `pnpm test lib app && pnpm typecheck && pnpm lint`.

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts lib/github app/api/pr/route.ts app/api/pr/route.test.ts
git commit -m "feat(api): per-IP limit on anonymous /api/pr, throttled pr_cache sweep, real GitHub timeouts"
```

---

### Task 2: Tests the phase-1 review flagged — `listRecentPrs` and the `github_login` persistence path

**Files:**
- Modify: `lib/github/recent.ts` (inject `client`, filter malformed rows)
- Create: `lib/github/recent.test.ts`, `lib/auth/github-login.db.test.ts`

**Interfaces:**
- `listRecentPrs(token: string, login: string, client?: ReturnType<typeof githubClient>): Promise<RecentPr[]>` — rows whose `repository_url` does not match `/repos/{owner}/{repo}$` are dropped.

- [ ] **Step 1: Failing test `lib/github/recent.test.ts`**

```ts
import { RequestError } from '@octokit/request-error';
import { describe, expect, it } from 'vitest';
import { listRecentPrs } from './recent';

const item = (o: Partial<Record<string, unknown>>) => ({
  number: 1, title: 't', state: 'open', draft: false, updated_at: '2026-09-15T00:00:00Z',
  repository_url: 'https://api.github.com/repos/acme/review-pane', pull_request: { merged_at: null }, ...o,
});
const client = (items: unknown[], fail?: number) => ({
  rest: { search: { issuesAndPullRequests: async (params: Record<string, unknown>) => {
    if (fail) throw new RequestError('x', fail, { request: { method: 'GET', url: 'u', headers: {} }, response: { status: fail, url: 'u', headers: {}, data: {} } });
    return { data: { items }, params };
  } } },
}) as unknown as Parameters<typeof listRecentPrs>[2];

describe('listRecentPrs', () => {
  it('maps items and derives state (merged > closed > draft > open)', async () => {
    const rows = await listRecentPrs('tok', 'mkato', client([
      item({ number: 1, pull_request: { merged_at: '2026-09-14T00:00:00Z' }, state: 'closed' }),
      item({ number: 2, state: 'closed' }),
      item({ number: 3, draft: true }),
      item({ number: 4 }),
    ]));
    expect(rows.map((r) => r.state)).toEqual(['merged', 'closed', 'draft', 'open']);
    expect(rows[0]).toMatchObject({ owner: 'acme', repo: 'review-pane', number: 1 });
  });
  it('drops rows whose repository_url does not parse', async () => {
    const rows = await listRecentPrs('tok', 'mkato', client([item({ repository_url: 'nope' }), item({ number: 9 })]));
    expect(rows.map((r) => r.number)).toEqual([9]);
  });
  it('maps a 401 to github_token_invalid', async () => {
    await expect(listRecentPrs('tok', 'mkato', client([], 401))).rejects.toMatchObject({ status: 403, code: 'github_token_invalid' });
  });
});
```

- [ ] **Step 2: Implement** — in `recent.ts` add the third parameter `client = githubClient(token)` and `.flatMap` instead of `.map`, returning `[]` when the regex misses. Run `pnpm test lib/github/recent` → PASS.

- [ ] **Step 3: DB-backed test for the login column `lib/auth/github-login.db.test.ts`** — skipped automatically when Postgres is not reachable, so CI without a DB stays green.

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('better-auth adapter persists githubLogin (needs Postgres)', async () => {
  const { auth, mapGitHubProfile } = await import('./index');
  const { db, schema } = await import('@/lib/db');
  const email = `probe-${Date.now()}@example.invalid`;
  afterAll(async () => { if (hasDb) await db.delete(schema.users).where(eq(schema.users.email, email)); });

  it('writes the mapped profile field through the internal adapter and reads it back', async () => {
    const ctx = await auth.$context;
    const created = await ctx.internalAdapter.createUser({ name: 'Probe', email, emailVerified: true, ...mapGitHubProfile({ login: 'probe-login' }) });
    const [row] = await db.select({ githubLogin: schema.users.githubLogin }).from(schema.users).where(eq(schema.users.id, created.id));
    expect(row.githubLogin).toBe('probe-login');
  });
});
```
If `auth.$context` / `internalAdapter.createUser` names differ in better-auth 1.7.7, read `node_modules/better-auth/dist/index.d.mts` and adapt — the assertion (column round-trips through better-auth's own adapter) is what matters. Run with Postgres up: `pnpm test lib/auth/github-login` → PASS; stop Postgres or unset `DATABASE_URL` → skipped.

- [ ] **Step 4: Commit**

```bash
git add lib/github/recent.ts lib/github/recent.test.ts lib/auth/github-login.db.test.ts
git commit -m "test(github,auth): listRecentPrs mapping and github_login adapter round-trip"
```

---

### Task 3: The five remaining layouts — Compact, QueueRow, Detail, Digest, DetailWide

**Files:**
- Create: `components/cards/layouts/Compact.tsx`, `QueueRow.tsx`, `Detail.tsx`, `Digest.tsx`, `DetailWide.tsx`, `components/cards/layouts/shared.ts`, `components/cards/layouts/layouts.test.tsx`
- Create: `components/cards/primitives/CheckList.tsx`, `components/cards/primitives/FileHeat.tsx`, `components/cards/primitives/ReviewSegments.tsx`
- Modify: `components/cards/primitives/index.ts`, `components/cards/registry.ts` (`LAYOUTS` complete), `components/cards/cards.css` (layout rules), `components/cards/layouts/Standard.tsx` (use `shared.ts`)

**Interfaces:**
- Produces (`layouts/shared.ts`):
  ```ts
  function ageLine(facts: PrFacts): string                      // "opened 2h ago" | "merged 1d ago" | "closed 6d ago"
  function consequenceLine(facts: PrFacts): string              // Compact's one-liner per state (design page 4b)
  function peopleOf(facts: PrFacts): PrPerson[]                 // author + reviewers, deduped by login
  function verdictSentence(facts: PrFacts): string              // "Approved by Aditi Shah. Waiting on Jonas Thäle."
  function firstName(p: PrPerson): string
  ```
- `LAYOUTS` becomes a total `Record<CardFormat, CardComponent>`.

- [ ] **Step 1: Failing tests `components/cards/layouts/layouts.test.tsx`** (Review Focus #1 and #2)

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CARD_FORMATS, FRAME_WIDTH, SAMPLE_FACTS, type PrFacts } from '../index';
import { consequenceLine } from './shared';

const SPARSE: PrFacts = {
  ...SAMPLE_FACTS, body: '', labels: [], type: null,
  checks: { passed: 0, total: 0, items: [] }, reviews: { approved: 0, requested: 0, items: [] }, files: [],
  diff: { additions: 0, deletions: 0, files: 0 },
};
const LONG: PrFacts = {
  ...SAMPLE_FACTS,
  title: 'A'.repeat(140), head: 'feature/' + 'x'.repeat(120), base: 'main',
  files: [{ path: 'src/' + 'deeply/'.repeat(20) + 'File.tsx', additions: 10, deletions: 1 }],
};

describe('every format renders', () => {
  for (const format of CARD_FORMATS) {
    it(`${format}: sample, sparse and long facts, at its frame width`, () => {
      for (const facts of [SAMPLE_FACTS, SPARSE, LONG]) {
        const { container, unmount } = render(<Card family="midnight" format={format} facts={facts} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain(`pc-${format}`);
        expect(root.style.width).toBe(`${FRAME_WIDTH[format]}px`);
        expect(container.textContent).not.toMatch(/undefined|NaN/);
        unmount();
      }
    });
  }
  it('standard still shows the nine facts', () => {
    const { getByText } = render(<Card family="midnight" format="standard" facts={SAMPLE_FACTS} />);
    for (const t of ['Open', 'feat', '#4821', 'Stream diff hunks lazily in the review pane', '+183', '−42', 'checks 7/7', 'SNAPSHOT · 15 SEP 2026']) expect(getByText(t)).toBeTruthy();
  });
  it('compact carries the consequence line, detail lists checks and files, digest has no body', () => {
    expect(render(<Card family="midnight" format="compact" facts={SAMPLE_FACTS} />).getByText('1 of 2 approved · checks 7/7')).toBeTruthy();
    const d = render(<Card family="midnight" format="detail" facts={SAMPLE_FACTS} />);
    expect(d.getByText('build')).toBeTruthy();
    expect(d.getByText('src/review/HunkList.tsx')).toBeTruthy();
    const g = render(<Card family="midnight" format="digest" facts={SAMPLE_FACTS} />);
    expect(g.queryByText(SAMPLE_FACTS.body)).toBeNull();
  });
});

describe('consequenceLine', () => {
  const f = (p: Partial<PrFacts>) => ({ ...SAMPLE_FACTS, ...p });
  it.each([
    ['open', '1 of 2 approved · checks 7/7'],
    ['draft', 'not ready for review · checks 7/7'],
    ['approved', 'ready to merge · checks 7/7'],
    ['changes', '1 blocking review · checks 7/7'],
    ['checks-failed', 'checks 7/7'],
    ['conflict', 'rebase needed'],
    ['merged', 'merged · 1 of 2 approved'],
    ['closed', 'closed without merging'],
  ] as const)('%s', (state, text) => {
    const facts = state === 'changes' ? f({ state, reviews: { approved: 0, requested: 1, items: [{ reviewer: SAMPLE_FACTS.author, verdict: 'changes' }] } }) : f({ state });
    expect(consequenceLine(facts)).toBe(text);
  });
  it('names the failing checks when there are any', () => {
    const facts = f({ state: 'checks-failed', checks: { passed: 5, total: 7, items: [{ name: 'e2e', status: 'fail', durationSec: 1 }, { name: 'lint', status: 'fail', durationSec: 1 }, { name: 'build', status: 'pass', durationSec: 1 }] } });
    expect(consequenceLine(facts)).toBe('e2e · lint failing');
  });
});
```

- [ ] **Step 2: Run** — `pnpm test components/cards/layouts` → FAIL.

- [ ] **Step 3: `components/cards/layouts/shared.ts`**

```ts
import type { PrFacts, PrPerson } from '../model';
import { relativeAge } from '../model';

export const firstName = (p: PrPerson) => (p.name?.trim().split(/\s+/)[0] ?? p.login);

export function ageLine(f: PrFacts): string {
  const now = new Date(f.snapshotAt);
  if (f.state === 'merged' && f.timestamps.merged) return `merged ${relativeAge(new Date(f.timestamps.merged), now)}`;
  if (f.state === 'closed' && f.timestamps.closed) return `closed ${relativeAge(new Date(f.timestamps.closed), now)}`;
  if (f.state === 'draft') return `updated ${relativeAge(new Date(f.timestamps.updated), now)}`;
  return `opened ${relativeAge(new Date(f.timestamps.opened), now)}`;
}

export function peopleOf(f: PrFacts): PrPerson[] {
  const seen = new Set<string>();
  return [f.author, ...f.reviews.items.map((r) => r.reviewer)].filter((p) => (seen.has(p.login) ? false : (seen.add(p.login), true)));
}

const checksText = (f: PrFacts) => `checks ${f.checks.passed}/${f.checks.total}`;

/** The Compact card's single "what now" line — design page 4b, one per lifecycle state. */
export function consequenceLine(f: PrFacts): string {
  const approvedOf = `${f.reviews.approved} of ${Math.max(f.reviews.requested, f.reviews.approved)} approved`;
  switch (f.state) {
    case 'draft': return `not ready for review · ${checksText(f)}`;
    case 'approved': return `ready to merge · ${checksText(f)}`;
    case 'changes': {
      const n = f.reviews.items.filter((r) => r.verdict === 'changes').length;
      return `${n} blocking review${n === 1 ? '' : 's'} · ${checksText(f)}`;
    }
    case 'checks-failed': {
      const failing = f.checks.items.filter((c) => c.status === 'fail').map((c) => c.name);
      return failing.length ? `${failing.join(' · ')} failing` : checksText(f);
    }
    case 'conflict': return 'rebase needed';
    case 'merged': return `merged · ${approvedOf}`;
    case 'closed': return 'closed without merging';
    default: return `${approvedOf} · ${checksText(f)}`;
  }
}

export function verdictSentence(f: PrFacts): string {
  const by = (v: 'approved' | 'changes' | 'pending' | 'commented') => f.reviews.items.filter((r) => r.verdict === v).map((r) => r.reviewer.name ?? r.reviewer.login);
  const parts: string[] = [];
  if (by('approved').length) parts.push(`Approved by ${by('approved').join(', ')}.`);
  if (by('changes').length) parts.push(`Changes requested by ${by('changes').join(', ')}.`);
  if (by('pending').length) parts.push(`Waiting on ${by('pending').join(', ')}.`);
  return parts.join(' ') || 'No reviews yet.';
}
```

- [ ] **Step 4: New primitives**

`primitives/CheckList.tsx`:
```tsx
import type { PrCheck } from '../model';
const fmt = (s: number | null) => (s == null ? '' : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
export function CheckList({ items, max = 4 }: { items: PrCheck[]; max?: number }) {
  if (items.length === 0) return <div className="pc-checklist pc-empty">No checks reported</div>;
  const shown = items.slice(0, max);
  return (
    <ul className="pc-checklist">
      {shown.map((c) => (
        <li key={c.name} className={`pc-check pc-check-${c.status}`}>
          <span className="pc-check-dot" aria-hidden="true" />
          <span className="pc-check-name">{c.name}</span>
          <span className="pc-check-meta">{c.status === 'pending' ? 'running' : c.status === 'fail' ? 'failed' : fmt(c.durationSec)}</span>
        </li>
      ))}
      {items.length > max && <li className="pc-check pc-check-more">+ {items.length - max} more</li>}
    </ul>
  );
}
```

`primitives/FileHeat.tsx`:
```tsx
import type { PrFile } from '../model';
export function FileHeat({ files, totalFiles, max = 3 }: { files: PrFile[]; totalFiles: number; max?: number }) {
  if (files.length === 0) return <div className="pc-files-heat pc-empty">No file details</div>;
  const top = files.slice(0, max);
  const peak = Math.max(1, ...top.map((f) => f.additions + f.deletions));
  return (
    <ul className="pc-files-heat">
      {top.map((f) => (
        <li key={f.path} className="pc-file">
          <span className="pc-file-path" title={f.path}>{f.path}</span>
          <span className="pc-file-nums"><span className="pc-add">+{f.additions}</span> <span className="pc-del">−{f.deletions}</span></span>
          <span className="pc-file-bar" aria-hidden="true"><span style={{ width: `${Math.round(((f.additions + f.deletions) / peak) * 100)}%` }} /></span>
        </li>
      ))}
      {totalFiles > top.length && <li className="pc-file pc-file-more">+ {totalFiles - top.length} more files</li>}
    </ul>
  );
}
```

`primitives/ReviewSegments.tsx`:
```tsx
import type { PrReview } from '../model';
export function ReviewSegments({ items }: { items: PrReview[] }) {
  if (items.length === 0) return <span className="pc-segments pc-empty">no reviewers</span>;
  return (
    <span className="pc-segments" role="img" aria-label={`${items.filter((r) => r.verdict === 'approved').length} of ${items.length} approved`}>
      {items.map((r) => <span key={r.reviewer.login} className={`pc-seg pc-seg-${r.verdict}`} title={`${r.reviewer.name ?? r.reviewer.login}: ${r.verdict}`} />)}
    </span>
  );
}
```
Add all three to `primitives/index.ts`.

- [ ] **Step 5: Layouts**

`layouts/Compact.tsx` (300 — pill, number, title, change bar, one consequence line; type chip dropped under 300 per the asset index):
```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { ChangeBar, StatusPill } from '../primitives';
import { ageLine, consequenceLine } from './shared';

export function Compact({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return (
    <article className={`pc pc-${family} pc-compact`} style={{ width: FRAME_WIDTH.compact }}>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{facts.state === 'merged' && facts.mergeCommit ? `${facts.mergeCommit.slice(0, 7)} → ${facts.base}` : ageLine(facts)}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} />
      <div className="pc-stats">
        <span className="pc-add">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-consequence">{consequenceLine(facts)}</span>
      </div>
    </article>
  );
}
```

`layouts/QueueRow.tsx` (820×56 — state glyph · title + branches · change · people · status · age, six columns):
```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH, relativeAge } from '../model';
import { AvatarStack, ChangeBar, StatusPill } from '../primitives';
import { consequenceLine, peopleOf } from './shared';

export function QueueRow({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = relativeAge(new Date(facts.state === 'merged' && facts.timestamps.merged ? facts.timestamps.merged : facts.timestamps.opened), new Date(facts.snapshotAt));
  return (
    <article className={`pc pc-${family} pc-queue-row`} style={{ width: FRAME_WIDTH['queue-row'] }}>
      <span className={`pc-glyph pc-glyph-${facts.state}`} aria-label={facts.state} />
      <div className="pc-row-main">
        <span className="pc-row-title">{facts.title} <span className="pc-num">#{facts.number}</span></span>
        <span className="pc-row-meta"><code>{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head}</code> → <code>{facts.base}</code> · {facts.diff.files}f</span>
      </div>
      <div className="pc-row-change">
        <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} height={3} />
        <span className="pc-stats"><span className="pc-add">+{facts.diff.additions}</span><span className="pc-del">−{facts.diff.deletions}</span></span>
      </div>
      <AvatarStack people={peopleOf(facts)} size={20} />
      <span className="pc-row-status"><StatusPill state={facts.state} /><span className="pc-consequence">{consequenceLine(facts)}</span></span>
      <span className="pc-age">{age}</span>
    </article>
  );
}
```

`layouts/Detail.tsx` (460 — Standard header/title/body + author line + checks panel + hottest files + footer):
```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { Avatar, CheckList, FileHeat, RepoMark, SnapshotStamp, StatusPill, TypeChip } from '../primitives';
import { ageLine, consequenceLine, firstName } from './shared';

export function DetailBody({ facts, wide }: { facts: PrFacts; wide?: boolean }) {
  return (
    <>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <TypeChip type={facts.type} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{consequenceLine(facts)}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <div className="pc-author-line">
        <Avatar person={facts.author} size={20} />
        <span>{firstName(facts.author)} {facts.author.name ? facts.author.name.split(' ').slice(1).map((s) => s[0] + '.').join(' ') : ''}</span>
        <span className="pc-dot">·</span>
        <code>{facts.head}</code> → <code>{facts.base}</code>
        <span className="pc-dot">·</span>
        <span>{ageLine(facts)}</span>
      </div>
      <div className={wide ? 'pc-detail-cols' : 'pc-detail-stack'}>
        <section className="pc-panel"><h3 className="pc-panel-title">Checks</h3><CheckList items={facts.checks.items} /></section>
        <section className="pc-panel"><h3 className="pc-panel-title">Most changed</h3><FileHeat files={facts.files} totalFiles={facts.diff.files} /></section>
      </div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <span className="pc-foot-mid">{facts.reviews.items.length} reviewer{facts.reviews.items.length === 1 ? '' : 's'} · {facts.commits} commit{facts.commits === 1 ? '' : 's'}</span>
        <SnapshotStamp at={facts.snapshotAt} merged={facts.state === 'merged'} />
      </footer>
    </>
  );
}

export function Detail({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return <article className={`pc pc-${family} pc-detail`} style={{ width: FRAME_WIDTH.detail }}><DetailBody facts={facts} /></article>;
}
```

`layouts/DetailWide.tsx`:
```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { DetailBody } from './Detail';
export function DetailWide({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return <article className={`pc pc-${family} pc-detail-wide`} style={{ width: FRAME_WIDTH['detail-wide'] }}><DetailBody facts={facts} wide /></article>;
}
```

`layouts/Digest.tsx` (420 — title-first; change bar with hottest-file share; review segments; latest line; no body):
```tsx
import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { ChangeBar, RepoMark, ReviewSegments, SnapshotStamp, StatusPill } from '../primitives';
import { ageLine, verdictSentence } from './shared';

export function Digest({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const hottest = facts.files[0];
  const churn = facts.diff.additions + facts.diff.deletions;
  const share = hottest && churn > 0 ? Math.round(((hottest.additions + hottest.deletions) / churn) * 100) : null;
  const latest = facts.state === 'merged' && facts.mergeCommit
    ? `Merged as ${facts.mergeCommit.slice(0, 7)} into ${facts.base}.`
    : verdictSentence(facts);
  return (
    <article className={`pc pc-${family} pc-digest`} style={{ width: FRAME_WIDTH.digest }}>
      <h2 className="pc-title pc-title-lg">{facts.title}</h2>
      <div className="pc-head">
        <StatusPill state={facts.state} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{ageLine(facts)}</span>
      </div>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} height={6} />
      <div className="pc-stats">
        <span className="pc-add">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-files">{facts.diff.files} files{share !== null && hottest ? ` · ${share}% in ${hottest.path.split('/').pop()}` : ''}</span>
      </div>
      <div className="pc-people"><ReviewSegments items={facts.reviews.items} /><span className="pc-verdicts">{latest}</span></div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <SnapshotStamp at={facts.snapshotAt} merged={facts.state === 'merged'} />
      </footer>
    </article>
  );
}
```

In `Standard.tsx`, replace the inline `age`/`people`/`verdicts` computations with `ageLine(facts)`, `peopleOf(facts)` and the existing verdict list built from `firstName` — behaviour identical, one source.

- [ ] **Step 6: Registry and CSS**

`registry.ts`: import the five and make `LAYOUTS: Record<CardFormat, CardComponent> = { 'queue-row': QueueRow, compact: Compact, standard: Standard, detail: Detail, digest: Digest, 'detail-wide': DetailWide }`; `resolveCard` keeps its signature but can no longer return `null` for a registered format — keep the `| null` return type for the picker's sake.

Append to `cards.css` (layout rules only; colours via tokens):
```css
/* compact */
.pc-compact { gap: 8px; padding: 14px 16px 12px; }
.pc-compact .pc-title { font-size: 14px; }
.pc-consequence { margin-left: auto; font-family: var(--pc-font); font-weight: 400; color: var(--pc-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* queue row */
.pc-queue-row { flex-direction: row; align-items: center; gap: 14px; height: 56px; padding: 0 16px; }
.pc-glyph { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--pc-add); }
.pc-glyph-draft, .pc-glyph-closed { background: var(--pc-faint); } .pc-glyph-changes, .pc-glyph-conflict { background: var(--pc-wait); }
.pc-glyph-checks-failed { background: var(--pc-fail); } .pc-glyph-merged { background: var(--pc-accent); }
.pc-row-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pc-row-title { font-weight: var(--pc-title-weight); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-row-meta { font-size: 11px; color: var(--pc-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-row-meta code { font-family: var(--pc-mono); }
.pc-row-change { width: 120px; flex: none; display: flex; flex-direction: column; gap: 4px; }
.pc-row-change .pc-stats { gap: 6px; font-size: 10.5px; }
.pc-row-status { width: 190px; flex: none; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
.pc-row-status .pc-consequence { margin-left: 0; font-size: 10.5px; max-width: 100%; }
.pc-queue-row .pc-age { flex: none; width: 48px; text-align: right; }
/* detail */
.pc-author-line { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pc-muted); white-space: nowrap; overflow: hidden; }
.pc-author-line code { font-family: var(--pc-mono); color: var(--pc-fg); }
.pc-dot { opacity: .6; }
.pc-detail-stack { display: flex; flex-direction: column; gap: 10px; }
.pc-detail-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pc-panel { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--pc-line); border-radius: calc(var(--pc-radius) * .6); }
.pc-panel-title { margin: 0; font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--pc-faint); }
.pc-checklist, .pc-files-heat { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.pc-check { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.pc-check-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pc-add); flex: none; }
.pc-check-fail .pc-check-dot { background: var(--pc-fail); } .pc-check-pending .pc-check-dot { background: var(--pc-wait); } .pc-check-skipped .pc-check-dot { background: var(--pc-faint); }
.pc-check-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-check-meta { font-family: var(--pc-mono); color: var(--pc-muted); }
.pc-check-more, .pc-file-more { color: var(--pc-faint); }
.pc-file { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; font-size: 11px; }
.pc-file-path { font-family: var(--pc-mono); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.pc-file-nums { font-family: var(--pc-mono); font-size: 10.5px; }
.pc-file-bar { grid-column: 1 / -1; height: 3px; background: var(--pc-track); border-radius: 2px; overflow: hidden; }
.pc-file-bar > span { display: block; height: 100%; background: var(--pc-add); }
.pc-foot-mid { font-size: 11px; color: var(--pc-muted); }
.pc-empty { color: var(--pc-faint); font-size: 11px; }
/* digest */
.pc-title-lg { font-size: 18px; line-height: 1.25; }
.pc-segments { display: inline-flex; gap: 3px; }
.pc-seg { width: 18px; height: 6px; border-radius: 2px; background: var(--pc-track); }
.pc-seg-approved { background: var(--pc-add); } .pc-seg-changes { background: var(--pc-fail); } .pc-seg-pending { background: var(--pc-wait); } .pc-seg-commented { background: var(--pc-faint); }
/* long strings must never widen the frame (Review Focus #2) */
.pc-title, .pc-body, .pc-verdicts { overflow-wrap: anywhere; }
.pc-branches code { max-width: 46%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: bottom; }
```

- [ ] **Step 7: Run** — `pnpm test components/cards && pnpm lint && pnpm typecheck` → PASS (the lint purity rule covers the new files automatically).

- [ ] **Step 8: Commit**

```bash
git add components/cards
git commit -m "feat(cards): Compact, QueueRow, Detail, Digest and DetailWide layouts over the shared PrFacts model"
```

---

### Task 4: Fonts and the three token-only families — Industrial, Modern, Minimal

**Files:**
- Create: `components/cards/families/industrial/tokens.css`, `components/cards/families/modern/tokens.css`, `components/cards/families/minimal/tokens.css`, `components/cards/families/families.test.tsx`, `components/cards/families/meta.ts`
- Modify: `app/layout.tsx` (fontsource imports), `components/cards/cards.css` (imports + `data-k` label hooks), `components/cards/layouts/Standard.tsx` (`data-k` attributes), `components/cards/registry.ts` (`AVAILABLE_FAMILIES`), `components/cards/index.ts` (export `FAMILY_META`)

**Interfaces:**
- Produces `FAMILY_META: Record<CardFamily, { label: string; blurb: string; swatch: string; ink: string }>` for the editor picker (Task 8).

- [ ] **Step 1: Fonts** — in `app/layout.tsx`, after the token imports add:
```ts
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/instrument-sans';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource-variable/newsreader';
```
(The packages are pre-installed; each ships latin subsets with `font-display: swap`. Loading in the root layout rather than inside `cards.css` keeps the card library free of build-tool concerns; Remotion will load the same packages in phase 4.)

- [ ] **Step 2: Label hooks for datasheet-style families** — in `Standard.tsx` give the four stat spans `data-k` attributes: `<span className="pc-add" data-k="Change">`, `<span className="pc-del">` (no label), `<span className="pc-files" data-k="Files">`, and wrap `Checks` output: the `Checks` primitive's root gets `data-k="Checks"`. Add to `cards.css` once: `.pc [data-k]::before { content: attr(data-k); display: none; }` — token-only families turn it on.

- [ ] **Step 3: Failing test `components/cards/families/families.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AVAILABLE_FAMILIES, Card, CARD_FAMILIES, FAMILY_META, SAMPLE_FACTS } from '../index';

describe('families', () => {
  it('industrial, modern and minimal are available and render the standard card under their class', () => {
    for (const f of ['industrial', 'modern', 'minimal'] as const) {
      expect(AVAILABLE_FAMILIES).toContain(f);
      const { container } = render(<Card family={f} format="standard" facts={SAMPLE_FACTS} />);
      expect(container.firstElementChild?.className).toContain(`pc-${f}`);
    }
  });
  it('every family has meta for the picker', () => {
    for (const f of CARD_FAMILIES) expect(FAMILY_META[f].label.length).toBeGreaterThan(0);
  });
  it('each token file declares the required custom properties', () => {
    const must = ['--pc-bg', '--pc-fg', '--pc-muted', '--pc-faint', '--pc-line', '--pc-accent', '--pc-track', '--pc-add', '--pc-del', '--pc-wait', '--pc-fail', '--pc-radius', '--pc-pad', '--pc-font', '--pc-mono', '--pc-title-weight'];
    for (const f of ['midnight', 'industrial', 'modern', 'minimal'] as const) {
      const css = readFileSync(new URL(`./${f}/tokens.css`, import.meta.url), 'utf8');
      for (const v of must) expect(css, `${f} missing ${v}`).toContain(`${v}:`);
    }
  });
});
```

- [ ] **Step 4: Token files**

`families/industrial/tokens.css` — paper ground, steel-blue ink, square corners, registration marks, ruled spec cells, Barlow Condensed titles:
```css
.pc-industrial {
  --pc-bg: #f4f1ea; --pc-fg: #1d2b3a; --pc-muted: rgba(29,43,58,.68); --pc-faint: rgba(29,43,58,.5);
  --pc-line: rgba(29,43,58,.28); --pc-accent: #2f5d8a; --pc-track: rgba(29,43,58,.14);
  --pc-add: #2a7a4b; --pc-del: #a83a2e; --pc-wait: #a66a12; --pc-fail: #a83a2e;
  --pc-radius: 0px; --pc-pad: 18px;
  --pc-font: 'Barlow', 'Inter', system-ui, sans-serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 600;
  position: relative; background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-font);
  border: 1px solid var(--pc-line); border-radius: 0; box-shadow: none;
}
/* + registration marks in the four corners */
.pc-industrial::before, .pc-industrial::after { content: ''; position: absolute; width: 10px; height: 10px; pointer-events: none;
  background: linear-gradient(var(--pc-line), var(--pc-line)) center/100% 1px no-repeat, linear-gradient(var(--pc-line), var(--pc-line)) center/1px 100% no-repeat; }
.pc-industrial::before { top: 6px; left: 6px; } .pc-industrial::after { right: 6px; bottom: 6px; }
.pc-industrial .pc-title { font-family: 'Barlow Condensed', 'Barlow', sans-serif; font-size: 20px; letter-spacing: 0; text-transform: none; }
.pc-industrial .pc-pill { border-radius: 0; border-width: 1px; }
.pc-industrial .pc-chip { border-radius: 0; background: transparent; border: 1px solid var(--pc-accent); color: var(--pc-accent); }
.pc-industrial .pc-branches code { border-radius: 0; background: transparent; border: 1px solid var(--pc-line); }
/* ruled 4-cell spec grid for the stats row */
.pc-industrial .pc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--pc-line); font-size: 12px; }
.pc-industrial .pc-stats > * { padding: 6px 8px; border-right: 1px solid var(--pc-line); margin: 0; display: flex; flex-direction: column; gap: 2px; }
.pc-industrial .pc-stats > *:last-child { border-right: 0; }
.pc-industrial [data-k]::before { display: block; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: var(--pc-faint); font-family: var(--pc-font); font-weight: 500; }
.pc-industrial .pc-foot { background: transparent; border-top: 1px solid var(--pc-line); }
.pc-industrial .pc-stamp { color: var(--pc-fg); }
.pc-industrial .pc-avatar { border-radius: 0; background: var(--pc-accent); box-shadow: 0 0 0 1.5px var(--pc-bg); }
.pc-industrial .pc-repo-tile { border-radius: 0; background: transparent; border: 1px solid var(--pc-line); }
```

`families/modern/tokens.css` — white on cool grey, 14px radii, layered soft shadow, 20px padding, tinted pills, ringed avatars, Manrope:
```css
.pc-modern {
  --pc-bg: #ffffff; --pc-fg: #111827; --pc-muted: #6b7280; --pc-faint: #9ca3af;
  --pc-line: oklch(0.92 0.005 260); --pc-accent: #6366f1; --pc-track: #e5e7eb;
  --pc-add: #16a34a; --pc-del: #dc2626; --pc-wait: #d97706; --pc-fail: #dc2626;
  --pc-radius: 14px; --pc-pad: 20px;
  --pc-font: 'Manrope Variable', 'Inter', system-ui, sans-serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 700;
  background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-font);
  border: 1px solid var(--pc-line); border-radius: var(--pc-radius);
  box-shadow: 0 1px 2px rgba(17,24,39,.06), 0 12px 32px -12px rgba(17,24,39,.18);
}
.pc-modern .pc-title { font-size: 16px; letter-spacing: -0.02em; }
.pc-modern .pc-pill { border: 0; padding: 3px 9px; background: color-mix(in srgb, currentColor 14%, transparent); }
.pc-modern .pc-chip { background: color-mix(in srgb, var(--pc-accent) 12%, transparent); text-transform: none; letter-spacing: 0; font-weight: 600; }
.pc-modern .pc-branches code { background: #f3f4f6; color: var(--pc-fg); }
.pc-modern .pc-avatar { box-shadow: 0 0 0 2px var(--pc-bg), 0 0 0 3px var(--pc-line); }
.pc-modern .pc-foot { background: #f9fafb; }
.pc-modern .pc-repo-tile { background: #f3f4f6; }
.pc-modern .pc-label { background: #f3f4f6; border-color: transparent; color: var(--pc-muted); }
.pc-modern .pc-bar { height: 6px; }
```

`families/minimal/tokens.css` — typographic monochrome: one hairline, state as a dot and a word, two-tone diff rule, Instrument Sans:
```css
.pc-minimal {
  --pc-bg: #ffffff; --pc-fg: #111111; --pc-muted: #555555; --pc-faint: #8a8a8a;
  --pc-line: #e6e6e6; --pc-accent: #111111; --pc-track: #e6e6e6;
  --pc-add: #111111; --pc-del: #8a8a8a; --pc-wait: #555555; --pc-fail: #111111;
  --pc-radius: 2px; --pc-pad: 20px;
  --pc-font: 'Instrument Sans Variable', 'Inter', system-ui, sans-serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 500;
  background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-font);
  border: 1px solid var(--pc-line); border-radius: var(--pc-radius); box-shadow: none; gap: 12px;
}
/* no pills: a dot and a word */
.pc-minimal .pc-pill { border: 0; padding: 0; text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--pc-fg); gap: 7px; }
.pc-minimal .pc-pill svg { display: none; }
.pc-minimal .pc-pill::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pc-minimal .pc-pill-draft::before, .pc-minimal .pc-pill-closed::before { background: var(--pc-faint); }
.pc-minimal .pc-chip { background: transparent; color: var(--pc-muted); font-variant: all-small-caps; letter-spacing: .06em; padding: 0; text-transform: none; font-size: 12px; }
.pc-minimal .pc-branches code { background: transparent; padding: 0; color: var(--pc-fg); }
.pc-minimal .pc-labels { display: none; }
.pc-minimal .pc-stats { font-weight: 500; }
.pc-minimal .pc-checks-ok, .pc-minimal .pc-checks-bad { color: var(--pc-fg); }
.pc-minimal .pc-avatars { display: none; }
.pc-minimal .pc-verdicts { white-space: normal; }
.pc-minimal .pc-foot { background: transparent; border-top: 1px solid var(--pc-line); }
.pc-minimal .pc-repo-tile { display: none; }
.pc-minimal .pc-stamp { font-family: var(--pc-font); letter-spacing: 0; font-variant-numeric: tabular-nums; }
.pc-minimal [data-k]::before { display: block; font-variant: all-small-caps; letter-spacing: .06em; color: var(--pc-faint); font-family: var(--pc-font); font-weight: 400; }
.pc-minimal .pc-stats > * { display: flex; flex-direction: column; }
```

Import all three in `cards.css` under the midnight import.

- [ ] **Step 5: `families/meta.ts` and registry**

```ts
import type { CardFamily } from '../model';
export const FAMILY_META: Record<CardFamily, { label: string; blurb: string; swatch: string; ink: string }> = {
  midnight:   { label: 'Midnight',   blurb: 'Dark slate, blurple accent — team channels and dark docs.', swatch: '#161826', ink: '#e9e9ed' },
  industrial: { label: 'Industrial', blurb: 'Paper and steel-blue ink, datasheet grid — release notes and print.', swatch: '#f4f1ea', ink: '#1d2b3a' },
  modern:     { label: 'Modern',     blurb: 'White card, soft shadow, friendly — public changelogs.', swatch: '#ffffff', ink: '#111827' },
  minimal:    { label: 'Minimal',    blurb: 'Monochrome and typographic — portfolios and newsletters.', swatch: '#ffffff', ink: '#111111' },
  futuristic: { label: 'Futuristic', blurb: 'HUD telemetry: cyan hairlines, tick bars — dev-tool launches.', swatch: '#070a0f', ink: '#9fe8ff' },
  terminal:   { label: 'Terminal',   blurb: 'CLI output in phosphor green — infra teams and dev newsletters.', swatch: '#060a06', ink: '#8df0a0' },
  editorial:  { label: 'Editorial',  blurb: 'Cream paper, serif headline, double rule — retrospectives.', swatch: '#f7f1e3', ink: '#1a1613' },
};
```
`registry.ts`: `AVAILABLE_FAMILIES = ['midnight', 'industrial', 'modern', 'minimal']` (Tasks 5–7 append the rest). `index.ts`: `export { FAMILY_META } from './families/meta';`.

- [ ] **Step 6: Run** — `pnpm test components/cards && pnpm lint && pnpm typecheck && pnpm build` (build proves the fontsource CSS imports resolve). Commit:

```bash
git add components/cards app/layout.tsx
git commit -m "feat(cards): Industrial, Modern and Minimal families as token sets; self-hosted fonts via fontsource"
```

---

### Task 5: Futuristic family — tokens plus a structural Standard override

**Files:**
- Create: `components/cards/families/futuristic/tokens.css`, `components/cards/families/futuristic/Standard.tsx`, `components/cards/families/futuristic/futuristic.test.tsx`, `components/cards/primitives/TickBar.tsx`
- Modify: `cards.css` (import), `registry.ts` (`FAMILY_OVERRIDES.futuristic = { standard: FuturisticStandard }`, `AVAILABLE_FAMILIES` += `'futuristic'`), `primitives/index.ts`

- [ ] **Step 1: Failing test** (Review Focus #3)

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';

describe('futuristic', () => {
  it('standard uses the HUD grammar: SYS header, tracked labels, tick bar', () => {
    const { getByText, container } = render(<Card family="futuristic" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('SYS // PR-4821')).toBeTruthy();
    expect(getByText('acme.review-pane')).toBeTruthy();
    expect(getByText('OPEN · FEAT')).toBeTruthy();
    expect(getByText('7/7 PASS')).toBeTruthy();
    expect(container.querySelectorAll('.pc-tick').length).toBe(24);
  });
  it('merged prints the merge sha and MERGED', () => {
    const { getByText } = render(<Card family="futuristic" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee' }} />);
    expect(getByText('MERGED · FEAT')).toBeTruthy();
    expect(getByText(/a41f92c/)).toBeTruthy();
  });
  it('other formats fall back to the default layout with futuristic tokens', () => {
    const { container } = render(<Card family="futuristic" format="compact" facts={SAMPLE_FACTS} />);
    expect(container.firstElementChild?.className).toContain('pc-futuristic');
    expect(container.firstElementChild?.className).toContain('pc-compact');
  });
});
```

- [ ] **Step 2: `primitives/TickBar.tsx`** — segmented ticks instead of a smooth fill:
```tsx
export function TickBar({ additions, deletions, ticks = 24 }: { additions: number; deletions: number; ticks?: number }) {
  const total = Math.max(1, additions + deletions);
  const addTicks = Math.round((additions / total) * ticks);
  return (
    <span className="pc-ticks" role="img" aria-label={`+${additions} −${deletions}`}>
      {Array.from({ length: ticks }, (_, i) => <i key={i} className={`pc-tick ${i < addTicks ? 'pc-tick-add' : 'pc-tick-del'}`} />)}
    </span>
  );
}
```

- [ ] **Step 3: `families/futuristic/Standard.tsx`**

```tsx
import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, relativeAge } from '../../model';
import { AvatarStack, TickBar } from '../../primitives';
import { peopleOf } from '../../layouts/shared';

const stamp = (iso: string) => iso.slice(0, 10).replace(/-/g, '.');
export function FuturisticStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = relativeAge(new Date(facts.timestamps.opened), new Date(facts.snapshotAt)).replace(' ago', '').toUpperCase();
  const checks = facts.checks.total === 0 ? 'NO CI' : facts.checks.passed === facts.checks.total ? `${facts.checks.passed}/${facts.checks.total} PASS` : `${facts.checks.passed}/${facts.checks.total} ${facts.checks.items.some((c) => c.status === 'fail') ? 'FAIL' : 'RUN'}`;
  const rev = facts.reviews.items.map((r) => `${r.reviewer.login.slice(0, 2).toUpperCase()} ${r.verdict === 'approved' ? '✓' : r.verdict === 'changes' ? '✕' : '…'}`).join('  ') || '—';
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <i className="pc-bracket pc-bracket-tl" /><i className="pc-bracket pc-bracket-tr" /><i className="pc-bracket pc-bracket-bl" /><i className="pc-bracket pc-bracket-br" />
      <header className="pc-hud-head">
        <span className="pc-hud-sys">SYS // PR-{facts.number}</span>
        <span className="pc-hud-repo">{facts.repo.owner}.{facts.repo.name}</span>
      </header>
      <div className={`pc-hud-state pc-hud-state-${facts.state}`}>{facts.state.replace('-', ' ').toUpperCase()}{facts.type ? ` · ${facts.type.toUpperCase()}` : ''}</div>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <dl className="pc-hud-grid">
        <dt>DIFF</dt><dd><span className="pc-add">+{facts.diff.additions}</span> <span className="pc-del">−{facts.diff.deletions}</span><TickBar additions={facts.diff.additions} deletions={facts.diff.deletions} /></dd>
        <dt>CI</dt><dd className={facts.checks.items.some((c) => c.status === 'fail') ? 'pc-hud-fail' : 'pc-hud-ok'}>{checks}</dd>
        <dt>REV</dt><dd className="pc-mono">{rev}</dd>
      </dl>
      <div className="pc-hud-foot">
        <AvatarStack people={peopleOf(facts).slice(0, 1)} size={20} />
        <span className="pc-hud-author">{(facts.author.name ?? facts.author.login).replace(/^(\w)\w*\s+/, '$1.').toUpperCase()}</span>
        <span className="pc-hud-branch">{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head} ⟶ {facts.base}</span>
        <span className="pc-hud-time">T-{age} · {stamp(facts.snapshotAt)}</span>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: `families/futuristic/tokens.css`**

```css
.pc-futuristic {
  --pc-bg: #070a0f; --pc-fg: #d8f6ff; --pc-muted: rgba(216,246,255,.62); --pc-faint: rgba(216,246,255,.42);
  --pc-line: rgba(0,229,255,.3); --pc-accent: #00e5ff; --pc-track: rgba(0,229,255,.12);
  --pc-add: #b6ff3b; --pc-del: #ff3b7a; --pc-wait: #ffd23b; --pc-fail: #ff3b7a;
  --pc-radius: 0px; --pc-pad: 18px;
  --pc-font: 'Chakra Petch', 'Inter', system-ui, sans-serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 600;
  position: relative; color: var(--pc-fg); font-family: var(--pc-font); border: 1px solid var(--pc-line); border-radius: 0;
  background: var(--pc-bg) linear-gradient(rgba(0,229,255,.06) 1px, transparent 1px) 0 0/24px 24px, var(--pc-bg) linear-gradient(90deg, rgba(0,229,255,.06) 1px, transparent 1px) 0 0/24px 24px;
  background-color: var(--pc-bg); box-shadow: 0 0 0 1px rgba(0,229,255,.08), 0 0 40px rgba(0,229,255,.08) inset;
}
.pc-bracket { position: absolute; width: 10px; height: 10px; border: 1px solid var(--pc-accent); pointer-events: none; }
.pc-bracket-tl { top: 4px; left: 4px; border-right: 0; border-bottom: 0; } .pc-bracket-tr { top: 4px; right: 4px; border-left: 0; border-bottom: 0; }
.pc-bracket-bl { bottom: 4px; left: 4px; border-right: 0; border-top: 0; } .pc-bracket-br { bottom: 4px; right: 4px; border-left: 0; border-top: 0; }
.pc-hud-head { display: flex; justify-content: space-between; font-size: 10px; letter-spacing: .14em; color: var(--pc-accent); }
.pc-hud-repo { color: var(--pc-muted); }
.pc-hud-state { font-size: 11px; letter-spacing: .16em; color: var(--pc-add); }
.pc-hud-state-changes, .pc-hud-state-conflict { color: var(--pc-wait); } .pc-hud-state-checks-failed { color: var(--pc-fail); } .pc-hud-state-merged { color: var(--pc-accent); } .pc-hud-state-draft, .pc-hud-state-closed { color: var(--pc-faint); }
.pc-futuristic .pc-title { font-size: 16px; letter-spacing: 0; }
.pc-hud-grid { display: grid; grid-template-columns: 44px 1fr; gap: 6px 10px; margin: 0; font-size: 11px; }
.pc-hud-grid dt { color: var(--pc-accent); letter-spacing: .14em; font-size: 10px; } .pc-hud-grid dd { margin: 0; display: flex; align-items: center; gap: 8px; font-family: var(--pc-mono); }
.pc-hud-ok { color: var(--pc-add); } .pc-hud-fail { color: var(--pc-fail); }
.pc-ticks { display: inline-flex; gap: 2px; margin-left: auto; } .pc-tick { width: 5px; height: 8px; display: block; } .pc-tick-add { background: var(--pc-add); } .pc-tick-del { background: var(--pc-del); }
.pc-hud-foot { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid var(--pc-line); font-size: 10.5px; letter-spacing: .08em; color: var(--pc-muted); }
.pc-hud-branch { font-family: var(--pc-mono); letter-spacing: 0; color: var(--pc-fg); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-hud-time { font-family: var(--pc-mono); letter-spacing: .04em; }
.pc-futuristic .pc-avatar { border-radius: 0; background: var(--pc-track); color: var(--pc-accent); box-shadow: 0 0 0 1px var(--pc-line); }
/* token-driven fallbacks for the other formats */
.pc-futuristic .pc-pill, .pc-futuristic .pc-chip, .pc-futuristic .pc-branches code, .pc-futuristic .pc-label, .pc-futuristic .pc-repo-tile, .pc-futuristic .pc-panel { border-radius: 0; }
.pc-futuristic .pc-foot { background: transparent; }
```

- [ ] **Step 5: Register, run, commit** — `FAMILY_OVERRIDES = { futuristic: { standard: FuturisticStandard } }`; `AVAILABLE_FAMILIES` += `'futuristic'`; import tokens in `cards.css`. `pnpm test components/cards && pnpm lint && pnpm typecheck`.

```bash
git add components/cards
git commit -m "feat(cards): Futuristic family — HUD tokens and a structural Standard override"
```

---

### Task 6: Terminal family — tokens plus a CLI-output Standard override

**Files:**
- Create: `components/cards/families/terminal/tokens.css`, `components/cards/families/terminal/Standard.tsx`, `components/cards/families/terminal/terminal.test.tsx`
- Modify: `cards.css`, `registry.ts` (`FAMILY_OVERRIDES.terminal`, `AVAILABLE_FAMILIES` += `'terminal'`)

- [ ] **Step 1: Failing test**

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';

describe('terminal', () => {
  it('prints the prompt, bracketed state, a glyph diffstat and the review lines', () => {
    const { getByText, container } = render(<Card family="terminal" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('pullsheet show acme/review-pane#4821')).toBeTruthy();
    expect(getByText('[ OPEN ]')).toBeTruthy();
    expect(container.querySelector('.pc-term-diffstat')?.textContent).toMatch(/^\++-+$/);
    expect(getByText('@mkato (Mira Kato)')).toBeTruthy();
    expect(getByText('ashah ✓ approved')).toBeTruthy();
    expect(getByText('jthale … waiting')).toBeTruthy();
    expect(getByText('2026-09-15T14:32Z')).toBeTruthy();
  });
  it('merged shows [ MERGED ] and the sha', () => {
    const { getByText } = render(<Card family="terminal" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee' }} />);
    expect(getByText('[ MERGED ]')).toBeTruthy();
    expect(getByText(/a41f92c/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: `families/terminal/Standard.tsx`**

```tsx
import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, relativeAge } from '../../model';

const glyphs = (a: number, d: number, width = 20) => {
  const total = Math.max(1, a + d);
  const plus = Math.round((a / total) * width);
  return '+'.repeat(plus) + '-'.repeat(Math.max(0, width - plus));
};
const Row = ({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) => (
  <div className={`pc-term-row ${className ?? ''}`}><span className="pc-term-key">{k}</span><span className="pc-term-val">{children}</span></div>
);

export function TerminalStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = relativeAge(new Date(facts.timestamps.opened), new Date(facts.snapshotAt)).replace(' ago', '');
  const checkNames = facts.checks.items.map((c) => c.name).join(' ');
  const checksOk = facts.checks.total > 0 && facts.checks.passed === facts.checks.total;
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <div className="pc-term-prompt"><span className="pc-term-dollar">$</span> <span>pullsheet show {facts.repo.owner}/{facts.repo.name}#{facts.number}</span></div>
      <div className="pc-term-rule">{'─'.repeat(46)}</div>
      <Row k="state" className={`pc-term-state-${facts.state}`}>[ {facts.state.replace('-', ' ').toUpperCase()} ]</Row>
      <Row k="type">{facts.type ?? '—'}<span className="pc-term-key pc-term-inline">age</span>{age}</Row>
      <Row k="title">{facts.title}</Row>
      {facts.body && <Row k="body">{facts.body}</Row>}
      <Row k="branch">{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head} {'->'} {facts.base}</Row>
      <Row k="diff"><span className="pc-add">+{facts.diff.additions}</span> <span className="pc-del">-{facts.diff.deletions}</span> <span className="pc-term-diffstat"><span className="pc-add">{glyphs(facts.diff.additions, facts.diff.deletions).replace(/-+$/, '')}</span><span className="pc-del">{glyphs(facts.diff.additions, facts.diff.deletions).replace(/^\++/, '')}</span></span> {facts.diff.files} files</Row>
      <Row k="checks" className={checksOk ? 'pc-term-ok' : facts.checks.total === 0 ? '' : 'pc-term-warn'}>{facts.checks.passed}/{facts.checks.total} {checksOk ? '✓' : facts.checks.total === 0 ? '—' : '…'}{checkNames && <span className="pc-term-dim"> {checkNames}</span>}</Row>
      <Row k="review">{facts.reviews.items.length === 0 ? <span className="pc-term-dim">none requested</span> : facts.reviews.items.map((r) => (
        <span key={r.reviewer.login} className={`pc-term-line pc-term-rev-${r.verdict}`}>{r.reviewer.login} {r.verdict === 'approved' ? '✓ approved' : r.verdict === 'changes' ? '✕ changes' : r.verdict === 'commented' ? '· commented' : '… waiting'}</span>
      ))}</Row>
      <Row k="author">@{facts.author.login}{facts.author.name ? ` (${facts.author.name})` : ''}</Row>
      <Row k="snapshot">{facts.snapshotAt.slice(0, 16)}Z</Row>
      <div className="pc-term-cursor" aria-hidden="true">▌</div>
    </article>
  );
}
```
(Import `type React` only if your TS config needs it for `React.ReactNode`; otherwise `import type { ReactNode } from 'react'` and use `ReactNode`.)

- [ ] **Step 3: `families/terminal/tokens.css`**

```css
.pc-terminal {
  --pc-bg: #060a06; --pc-fg: #8df0a0; --pc-muted: rgba(141,240,160,.7); --pc-faint: rgba(141,240,160,.45);
  --pc-line: rgba(141,240,160,.35); --pc-accent: #8df0a0; --pc-track: rgba(141,240,160,.15);
  --pc-add: #8df0a0; --pc-del: #ff8a65; --pc-wait: #ffc857; --pc-fail: #ff5c5c;
  --pc-radius: 0px; --pc-pad: 16px 18px;
  --pc-font: 'JetBrains Mono', ui-monospace, Menlo, monospace; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 500;
  background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-mono); font-size: 12px; line-height: 1.65;
  border: 1px solid var(--pc-line); border-radius: 0; box-shadow: none; gap: 0;
  text-shadow: 0 0 6px rgba(141,240,160,.25);
}
.pc-term-prompt { display: flex; gap: 8px; } .pc-term-dollar { color: var(--pc-wait); }
.pc-term-rule { color: var(--pc-faint); overflow: hidden; white-space: nowrap; }
.pc-term-row { display: grid; grid-template-columns: 70px 1fr; gap: 0 10px; }
.pc-term-key { color: var(--pc-faint); } .pc-term-inline { margin: 0 8px; }
.pc-term-val { color: var(--pc-fg); overflow-wrap: anywhere; display: flex; flex-wrap: wrap; gap: 0 6px; }
.pc-term-line { display: block; width: 100%; }
.pc-term-dim { color: var(--pc-faint); } .pc-term-ok { color: var(--pc-add); } .pc-term-warn .pc-term-val { color: var(--pc-wait); }
.pc-term-state-changes .pc-term-val, .pc-term-state-conflict .pc-term-val, .pc-term-rev-pending { color: var(--pc-wait); }
.pc-term-state-checks-failed .pc-term-val, .pc-term-rev-changes { color: var(--pc-fail); }
.pc-term-state-draft .pc-term-val, .pc-term-state-closed .pc-term-val { color: var(--pc-faint); }
.pc-term-cursor { animation: pc-blink 1.1s steps(1) infinite; color: var(--pc-fg); }
@keyframes pc-blink { 50% { opacity: 0; } }
/* fallbacks for the other formats */
.pc-terminal .pc-pill, .pc-terminal .pc-chip, .pc-terminal .pc-branches code, .pc-terminal .pc-label, .pc-terminal .pc-repo-tile, .pc-terminal .pc-panel, .pc-terminal .pc-avatar { border-radius: 0; }
.pc-terminal .pc-foot { background: transparent; }
.pc-terminal .pc-title { font-family: var(--pc-mono); }
```

- [ ] **Step 4: Register, run, commit** — `FAMILY_OVERRIDES.terminal = { standard: TerminalStandard }`, `AVAILABLE_FAMILIES` += `'terminal'`, import tokens. `pnpm test components/cards && pnpm lint && pnpm typecheck`.

```bash
git add components/cards
git commit -m "feat(cards): Terminal family — CLI-output Standard override and phosphor tokens"
```

---

### Task 7: Editorial family — tokens plus a newspaper Standard override

**Files:**
- Create: `components/cards/families/editorial/tokens.css`, `components/cards/families/editorial/Standard.tsx`, `components/cards/families/editorial/editorial.test.tsx`
- Modify: `cards.css`, `registry.ts` (`FAMILY_OVERRIDES.editorial`, `AVAILABLE_FAMILIES` = all seven), `layouts/shared.ts` (add `figuresSentence`)

- [ ] **Step 1: Failing test**

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';
import { figuresSentence } from '../../layouts/shared';

describe('editorial', () => {
  it('renders dateline, headline, figures sentence, byline', () => {
    const { getByText } = render(<Card family="editorial" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('Open · Feature · acme / review-pane')).toBeTruthy();
    expect(getByText('No. 4821')).toBeTruthy();
    expect(getByText(/183 lines added, 42 removed, across twelve files on feat\/lazy-hunks\. Seven of seven checks pass\./)).toBeTruthy();
    expect(getByText(/By Mira Kato/)).toBeTruthy();
    expect(getByText(/Reviewed by A\. Shah \(approved\), J\. Thäle \(pending\)/)).toBeTruthy();
    expect(getByText('15 Sept 2026')).toBeTruthy();
  });
  it('merged changes tense', () => {
    const f = { ...SAMPLE_FACTS, state: 'merged' as const, mergeCommit: 'a41f92c0ffee', timestamps: { ...SAMPLE_FACTS.timestamps, merged: '2026-09-16T10:00:00Z' } };
    expect(figuresSentence(f)).toMatch(/^183 lines added, 42 removed, across twelve files\. Merged into main as a41f92c\./);
  });
  it('figuresSentence survives sparse facts', () => {
    expect(figuresSentence({ ...SAMPLE_FACTS, diff: { additions: 0, deletions: 0, files: 0 }, checks: { passed: 0, total: 0, items: [] } })).toBe('No lines changed. No checks reported.');
  });
});
```

- [ ] **Step 2: `figuresSentence` in `layouts/shared.ts`**

```ts
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function figuresSentence(f: PrFacts): string {
  const parts: string[] = [];
  if (f.diff.additions + f.diff.deletions === 0) parts.push('No lines changed.');
  else {
    const files = `${word(f.diff.files)} file${f.diff.files === 1 ? '' : 's'}`;
    parts.push(f.state === 'merged' ? `${f.diff.additions} lines added, ${f.diff.deletions} removed, across ${files}.` : `${f.diff.additions} lines added, ${f.diff.deletions} removed, across ${files} on ${f.head}.`);
  }
  if (f.state === 'merged' && f.mergeCommit) parts.push(`Merged into ${f.base} as ${f.mergeCommit.slice(0, 7)}.`);
  if (f.checks.total === 0) parts.push('No checks reported.');
  else if (f.checks.passed === f.checks.total) parts.push(`${cap(word(f.checks.passed))} of ${word(f.checks.total)} checks pass.`);
  else parts.push(`${cap(word(f.checks.passed))} of ${word(f.checks.total)} checks pass; ${word(f.checks.items.filter((c) => c.status === 'fail').length)} failing.`);
  if (f.state === 'conflict') parts.push(`Conflicts with ${f.base}.`);
  else if (f.state !== 'merged' && f.state !== 'closed') parts.push(`No conflicts with ${f.base}.`);
  return parts.join(' ');
}
```

- [ ] **Step 3: `families/editorial/Standard.tsx`**

```tsx
import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, STATE_LABEL } from '../../model';
import { figuresSentence } from '../../layouts/shared';

const TYPE_WORD: Record<string, string> = { feat: 'Feature', fix: 'Fix', hotfix: 'Hotfix', chore: 'Chore', docs: 'Documentation', deps: 'Dependencies', release: 'Release', revert: 'Revert' };
const initialName = (name: string | null, login: string) => { if (!name) return login; const [first, ...rest] = name.split(' '); return rest.length ? `${first[0]}. ${rest.join(' ')}` : first; };
const longDate = (iso: string) => { const d = new Date(iso); const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]; return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`; };

export function EditorialStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const dateline = [STATE_LABEL[facts.state], facts.type ? TYPE_WORD[facts.type] : null, `${facts.repo.owner} / ${facts.repo.name}`].filter(Boolean).join(' · ');
  const reviewed = facts.reviews.items.map((r) => `${initialName(r.reviewer.name, r.reviewer.login)} (${r.verdict})`).join(', ');
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <div className="pc-ed-dateline"><span>{dateline}</span><span>No. {facts.number}</span></div>
      <h2 className="pc-title pc-ed-headline">{facts.title}</h2>
      {facts.body && <p className="pc-body pc-ed-body">{facts.body}</p>}
      <p className="pc-ed-figures"><span className="pc-ed-lead">Figures.</span> {figuresSentence(facts)}</p>
      <div className="pc-ed-byline">
        <span>By {facts.author.name ?? facts.author.login}</span>
        {reviewed && <span> · Reviewed by {reviewed}</span>}
      </div>
      <div className="pc-ed-date">{longDate(facts.snapshotAt)}</div>
    </article>
  );
}
```

- [ ] **Step 4: `families/editorial/tokens.css`**

```css
.pc-editorial {
  --pc-bg: #f7f1e3; --pc-fg: #1a1613; --pc-muted: rgba(26,22,19,.7); --pc-faint: rgba(26,22,19,.5);
  --pc-line: rgba(26,22,19,.55); --pc-accent: #6b1d2a; --pc-track: rgba(26,22,19,.12);
  --pc-add: #1a1613; --pc-del: #6b1d2a; --pc-wait: #7a5a12; --pc-fail: #6b1d2a;
  --pc-radius: 0px; --pc-pad: 22px 24px 18px;
  --pc-font: 'Newsreader Variable', Georgia, 'Times New Roman', serif; --pc-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --pc-title-weight: 500;
  background: var(--pc-bg); color: var(--pc-fg); font-family: var(--pc-font);
  border: 0; border-top: 3px double var(--pc-line); border-bottom: 1px solid var(--pc-line); border-radius: 0; box-shadow: none; gap: 10px;
}
.pc-ed-dateline { display: flex; justify-content: space-between; font-variant: all-small-caps; letter-spacing: .08em; font-size: 13px; color: var(--pc-muted); }
.pc-ed-headline { font-size: 24px; line-height: 1.15; letter-spacing: -0.01em; font-variation-settings: 'opsz' 24; }
.pc-ed-body { font-size: 13.5px; line-height: 1.5; color: var(--pc-fg); -webkit-line-clamp: 4; }
.pc-ed-figures { margin: 0; padding-bottom: 8px; border-bottom: 1px solid var(--pc-track); font-size: 13px; line-height: 1.5; }
.pc-ed-lead { font-variant: all-small-caps; letter-spacing: .08em; color: var(--pc-accent); }
.pc-ed-byline { font-size: 12.5px; color: var(--pc-muted); font-style: italic; }
.pc-ed-date { font-variant: all-small-caps; letter-spacing: .08em; font-size: 12px; color: var(--pc-faint); }
/* fallbacks for the other formats: rules, not containers */
.pc-editorial .pc-pill { border: 0; padding: 0; text-transform: none; letter-spacing: 0; font-variant: all-small-caps; font-size: 13px; color: var(--pc-fg); }
.pc-editorial .pc-pill svg { display: none; }
.pc-editorial .pc-chip { background: transparent; color: var(--pc-accent); font-variant: all-small-caps; text-transform: none; letter-spacing: .08em; padding: 0; }
.pc-editorial .pc-branches code { background: transparent; padding: 0; font-family: var(--pc-mono); font-size: 11px; }
.pc-editorial .pc-foot { background: transparent; border-top: 1px solid var(--pc-track); }
.pc-editorial .pc-repo-tile { display: none; }
.pc-editorial .pc-avatar { background: var(--pc-accent); }
.pc-editorial .pc-panel { border-radius: 0; border-color: var(--pc-track); }
```

- [ ] **Step 5: Register, run, commit** — `FAMILY_OVERRIDES.editorial = { standard: EditorialStandard }`; `AVAILABLE_FAMILIES = [...CARD_FAMILIES]`; import tokens. `pnpm test components/cards && pnpm lint && pnpm typecheck`.

```bash
git add components/cards
git commit -m "feat(cards): Editorial family — newspaper Standard override; all seven families available"
```

---

### Task 8: Editor — family tiles, format picker, fallback behaviour

**Files:**
- Modify: `components/editor/panels/CardPanel.tsx`, `components/editor/Editor.test.tsx`, `app/globals.css` (one rule block, appended under `/* editor — card picker (phase 2) */`)

**Interfaces:**
- Consumes `FAMILY_META`, `AVAILABLE_FAMILIES`, `CARD_FORMATS`, `resolveCard`.

- [ ] **Step 1: Failing test additions to `Editor.test.tsx`** (Review Focus #5)

```tsx
  it('offers all seven families as tiles and every format; switching family keeps a non-overridden format on the default layout', async () => {
    const { getByLabelText, getByRole, container } = render(<Editor user={user} features={features} initialDesign={{ ...DEFAULT_DESIGN, cardFormat: 'digest' }} initialFacts={SAMPLE_FACTS} />);
    for (const label of ['Midnight', 'Industrial', 'Modern', 'Minimal', 'Futuristic', 'Terminal', 'Editorial']) expect(getByLabelText(label)).toBeTruthy();
    fireEvent.click(getByLabelText('Terminal'));
    await waitFor(() => expect(container.querySelector('.pc-terminal.pc-digest')).toBeTruthy());
    expect(container.querySelector('.pc-missing')).toBeNull();
    const select = getByRole('combobox', { name: /format/i }) as HTMLSelectElement;
    expect([...select.options].every((o) => !o.disabled)).toBe(true);
    fireEvent.change(select, { target: { value: 'queue-row' } });
    await waitFor(() => expect(container.querySelector('.pc-terminal.pc-queue-row')).toBeTruthy());
  });
```

- [ ] **Step 2: `CardPanel.tsx`** — replace the family `Segmented` with a tile grid; keep the format `<select>` (now with an `aria-label="Format"` and no disabled options when all are registered — leave the `disabled={off}` logic in place, it is simply never true now):

```tsx
        <div className="card-families" role="radiogroup" aria-label="Card style">
          {AVAILABLE_FAMILIES.map((f) => {
            const m = FAMILY_META[f];
            const on = d.cardFamily === f;
            return (
              <button key={f} type="button" role="radio" aria-checked={on} aria-label={m.label} title={m.blurb}
                className={`card-family${on ? ' is-on' : ''}`} onClick={() => update({ cardFamily: f })}>
                <span className="card-family-swatch" style={{ background: m.swatch, color: m.ink }} aria-hidden="true">Aa</span>
                <span className="card-family-name">{m.label}</span>
              </button>
            );
          })}
        </div>
```
Import `FAMILY_META` from `@/components/cards`. Add `aria-label="Format"` to the `<select>`.

`app/globals.css` append:
```css
/* editor — card picker (phase 2) */
.card-families{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.card-family{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px;border:1px solid var(--fg-a10);background:var(--fg-a4);color:var(--foreground);cursor:pointer;text-align:left;font-size:12px}
.card-family:hover{border-color:var(--fg-a25)}
.card-family.is-on{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
.card-family-swatch{display:inline-flex;align-items:center;justify-content:center;width:28px;height:22px;border-radius:5px;font:600 11px/1 var(--font-sans);box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
```

- [ ] **Step 3: Run** — `pnpm test components/editor && pnpm lint && pnpm typecheck && pnpm build`. Then with `pnpm dev`, open `/` (logged out) and confirm the landing card still renders; `/editor` still redirects. Commit:

```bash
git add components/editor/panels/CardPanel.tsx components/editor/Editor.test.tsx app/globals.css
git commit -m "feat(editor): family tiles for all seven card styles; every format selectable"
```

---

### Task 9: Deferred-minor sweep from the phase-1 reviews

**Files:**
- Modify: `components/editor/EditorProvider.tsx`, `components/editor/use-import-pr.ts`, `components/editor/panels/ImportPanel.tsx`, `components/editor/Toolbar.tsx`, `components/editor/panels/ExportMenu.tsx`, `components/account/AccountShell.tsx`, `components/ui.tsx`, `components/cards/model.ts`, `lib/github/to-pr-facts.ts`, `lib/github/fetch-pr.ts`, `app/login/page.tsx`, `components/cards/cards.css`, `components/cards/model.test.ts`

Each item is small; implement all, one commit.

- [ ] **Step 1: `fetching` lives in the provider.** Add `fetching: boolean; setFetching(v: boolean): void` to `Ctx` (a `useState` in `EditorProvider`); `use-import-pr.ts` reads/writes it from `useEditor()` instead of its own state. Guard concurrent imports: if `fetching` is already true, `importRef` returns `null` immediately. Test (append to `Editor.test.tsx`): trigger two imports back-to-back, assert `fetch` was called once.

- [ ] **Step 2: Narrow the import catch.** In `use-import-pr.ts`, wrap only `fetch()` in the network try/catch; parse the body in its own try that toasts `{ type: 'error', title: 'Unexpected response' }` on failure.

- [ ] **Step 3: Recent-PR failures are visible.** In `ImportPanel.tsx`, on `!r.ok && r.status !== 401` call `toast({ type: 'error', title: 'Could not load recent pull requests', description: body.error })`; 401 stays silent.

- [ ] **Step 4: Dead toolbar buttons say so.** `Toolbar.tsx`: Templates and Feedback get `disabled title="Coming in a later phase"`.

- [ ] **Step 5: `when` is derived at render.** `ExportMenu.tsx` stops writing `when: 'Just now'` (keep the field for shape compatibility: write `when: ''`); `AccountShell.tsx:265` renders `relativeAge(new Date(x.ts))` (import from `@/components/cards`), falling back to `x.when` only when `ts` is missing.

- [ ] **Step 6: One label source.** `components/ui.tsx` `STATUS` keeps colours only; `StatusPill` renders `STATE_LABEL[status]` from `@/components/cards/model`.

- [ ] **Step 7: One conventional-commit regex.** Export `CONVENTIONAL_PREFIX` from `components/cards/model.ts` (the existing `PREFIX`, with a trailing `\s*` variant for stripping exported separately as `CONVENTIONAL_PREFIX_STRIP`); `lib/github/to-pr-facts.ts` imports it instead of redefining.

- [ ] **Step 8: Unknown mergeability is not cached as fact.** In `fetch-pr.ts`, when `pull.mergeable_state === 'unknown'` (GitHub still computing), return `{ facts, cached: false, rateRemaining }` **without** `store.put` — the next request recomputes. Add a `fetch-pr.test.ts` case with a fake GitHub returning `mergeable_state: 'unknown'` asserting `calls.put === 0`.

- [ ] **Step 9: Keyboard users.** `app/login/page.tsx` GitLab/Bitbucket links get `tabIndex={-1}`.

- [ ] **Step 10: Card polish.** `cards.css`: `.pc-checks-none { color: var(--pc-faint); }`. `model.test.ts`: add `initials()` cases — `{ name: 'Mira Kato' }` → `MK`, `{ name: null, login: 'mkato' }` → `MK`, `{ login: 'dependabot[bot]', name: null }` → `DE`, single-word name `'Prince'` → `PR`.

- [ ] **Step 11: Purity rule, both halves.** Temporarily add `const w = window.innerWidth;` to `components/cards/Card.tsx`, run `pnpm lint` → expect `no-restricted-globals` error; revert. Record the output in the report.

- [ ] **Step 12: Gates and commit** — `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.

```bash
git add -u
git commit -m "chore: phase-1 review follow-ups — shared import state, honest failures, derived timestamps, single label/regex sources"
```

---

### Task 10: Docs and verification

**Files:**
- Modify: `README.md` (Status table, Known limitations, Roadmap tick), `docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md` (§13 row 2 ✅, §5 rate-limit sentence), `.env.example` (no new vars — confirm)
- Create: `docs/assets/families.png` (optional — only if a browser is available at execution time)

- [ ] **Step 1: README** — Status table: card library row → ✅ (`6 formats × 7 families`), `/api/pr` row Next → "Redis-backed limiter when multi-instance (phase 7)"; Known limitations: remove the "only midnight/standard" bullet and the "anonymous `/api/pr` is unmetered" bullet, replace with "Anonymous `/api/pr` is limited to 30 requests / 10 min per IP, in-process (resets on deploy; move to Redis before scaling out)"; Roadmap: phase 2 ✅. Add one sentence under "What it does" step 2 naming the seven families.

- [ ] **Step 2: Spec** — §13 row 2 marked ✅ with a one-line "done when" confirmation; §5 gains: "Anonymous callers are limited to 30 requests per 10 minutes per IP (in-memory token bucket); `pr_cache` is swept of rows older than 7 days at most every 10 minutes."

- [ ] **Step 3: Optional screenshot** — if the chrome-devtools MCP is available: run `pnpm dev`, open `/`, use `evaluate_script` to replace the hero card with a 7-up grid of `<Card>`s is not possible without login; instead render `components/cards` in the existing jsdom test to assert, and skip the image. Do not block the task on this.

- [ ] **Step 4: Final verification** — `rm -rf .next && pnpm typecheck && pnpm lint && pnpm test && pnpm build`; `docker compose up -d --wait && pnpm db:migrate` (no new migrations expected in this phase — confirm "no migrations to apply"). With `pnpm dev`: `curl -s http://localhost:3000/ | grep -c pc-midnight` ≥ 1; 31 rapid `curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/api/pr?url=https://github.com/vercel/next.js/pull/1'` → thirty `200` then `429`. Put the transcript in the report.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-10-02-pullsheets-architecture-design.md
git commit -m "docs: phase 2 complete — seven families, six formats, /api/pr limits"
```

---

## Self-review

**Spec coverage (§13 row 2 + review follow-ups):** 6 layouts (T3) · 7 families (T4–T7) · registry + editor picker (T3, T8) · fonts (T4) · per-IP limit + sweep (T1) · timeouts (T1) · `listRecentPrs`/`github_login` tests (T2) · deferred minors (T9) · docs (T10). Spec §4's "3 structural overrides" are exactly Futuristic, Terminal, Editorial. Not in scope by spec: Remotion font loading (phase 4), the 860px Queue *card* (asset index lists it; §4 names six formats — the Queue Row is the unit, the grouped card is a phase-3+ composition).

**Placeholders:** none. Every code step carries code; T9's items each name the exact file and change.

**Type consistency:** `CardComponent`, `FRAME_WIDTH`, `resolveCard(family, format): CardComponent | null`, `FAMILY_META`, `PrCacheStore.sweep(before: Date): Promise<number>`, `TokenBucket.take(key): { ok: true } | { ok: false; resetAt: Date }`, `listRecentPrs(token, login, client?)` are used identically across tasks. `DetailBody` is exported from `Detail.tsx` and consumed by `DetailWide.tsx`. `figuresSentence`, `consequenceLine`, `ageLine`, `peopleOf`, `firstName`, `verdictSentence` live in `layouts/shared.ts` and are imported by layouts and family overrides only (purity preserved).

**Review Focus:** #1, #2 → T3 `layouts.test.tsx` · #3 → T5/T6/T7 merged cases · #4 → T1 `route.test.ts` · #5 → T8 `Editor.test.tsx`.
