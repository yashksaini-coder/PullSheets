import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { db, schema } from '@/lib/db';
import { env, features } from '@/lib/env';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Keys are better-auth model names; values are our plural tables.
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
          mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
        },
      }
    : {},
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free', input: false },
      // `input: false` would also strip the value coming from mapProfileToUser
      // (db/schema.mjs parseAdditionalUserInputFromProviderProfile skips input:false
      // fields), so the field stays writable and the hook below closes the one client
      // write path, /update-user.
      githubLogin: { type: 'string', required: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/update-user' && ctx.body && 'githubLogin' in ctx.body) {
        throw new APIError('BAD_REQUEST', { message: 'githubLogin is not allowed to be set' });
      }
    }),
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
