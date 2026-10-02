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
  githubLogin: text('github_login'),
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
