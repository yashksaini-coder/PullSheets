import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { db, schema } from '@/lib/db';
import { env, features } from '@/lib/env';

/** The only writer of `users.github_login`: the GitHub profile, on the OAuth callback. */
export const mapGitHubProfile = (profile: { login: string }) => ({ githubLogin: profile.login });

/** Exported so lib/auth/auth.test.ts can pin the mapper even when features.auth is off. */
export const githubProvider = {
  clientId: env.GITHUB_CLIENT_ID!,
  clientSecret: env.GITHUB_CLIENT_SECRET!,
  scope: ['read:user', 'user:email', 'repo'],
  mapProfileToUser: mapGitHubProfile,
};

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
  socialProviders: features.auth ? { github: githubProvider } : {},
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free', input: false },
      // Must stay `input: true`: better-auth strips `input: false` fields from the provider
      // profile too (db/schema.mjs parseAdditionalUserInputFromProviderProfile), which would
      // leave github_login null forever. The `hooks.before` guard below is what keeps clients
      // from writing it. lib/auth/auth.test.ts pins both halves.
      githubLogin: { type: 'string', required: false },
    },
  },
  hooks: {
    // Keyed on the field, not on a path: `parseUserInput` writes additional user fields from
    // /update-user, /sign-up/email and several plugin routes, so a path allowlist would reopen
    // the moment email sign-in or an OTP plugin is enabled. The OAuth callback is the one
    // writer allowed through — that is where mapGitHubProfile supplies the value.
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith('/callback/') && ctx.body && typeof ctx.body === 'object' && 'githubLogin' in ctx.body) {
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
