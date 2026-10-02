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
  // Next.js >=13.4.4 only static-analyzes client vars; experimental__runtimeEnv spreads
  // process.env for the rest internally (see @t3-oss/env-nextjs source) — same runtime
  // behaviour as manually spreading process.env, but type-checks against this zod/t3-env version.
  experimental__runtimeEnv: {
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

export const clientEnv = {
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

export const features: Features = isTest
  ? { auth: false, storage: false, video: false, billing: false, social: false }
  : deriveFeatures(env as unknown as ServerEnv);
