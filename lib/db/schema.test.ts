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
    expect(Object.keys(s.users)).toEqual(expect.arrayContaining(['plan', 'stripeCustomerId', 'stripeSubscriptionId', 'planRenewsAt', 'githubLogin']));
  });
});
