import { and, eq } from 'drizzle-orm';
import type { PrFacts } from '@/components/cards/model';
import { db, schema } from '@/lib/db';

/** `pr_cache` row with `facts` typed; drizzle infers jsonb as `unknown`. */
export type PrCacheRow = Omit<typeof schema.prCache.$inferSelect, 'facts'> & { facts: PrFacts };

/** The three `pr_cache` operations `fetchPrFacts` needs. Injectable so the cache logic is testable without Postgres. */
export interface PrCacheStore {
  get(repo: string, number: number): Promise<PrCacheRow | undefined>;
  touch(repo: string, number: number): Promise<void>;
  put(row: PrCacheRow): Promise<void>;
}

const at = (repo: string, number: number) => and(eq(schema.prCache.repo, repo), eq(schema.prCache.number, number));

export const dbPrCacheStore: PrCacheStore = {
  async get(repo, number) {
    const [row] = await db.select().from(schema.prCache).where(at(repo, number)).limit(1);
    return row as PrCacheRow | undefined;
  },
  async touch(repo, number) {
    await db.update(schema.prCache).set({ fetchedAt: new Date() }).where(at(repo, number));
  },
  async put(row) {
    const set = { etag: row.etag, state: row.state, facts: row.facts, isPrivate: row.isPrivate, fetchedAt: row.fetchedAt };
    await db.insert(schema.prCache).values(row).onConflictDoUpdate({ target: [schema.prCache.repo, schema.prCache.number], set });
  },
};
