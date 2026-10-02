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
