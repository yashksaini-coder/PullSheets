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
