import { expect, test } from 'vitest';
import { auth, githubProvider, mapGitHubProfile } from './index';

const inputFlag = (field: 'githubLogin' | 'plan') => (auth.options.user!.additionalFields![field] as { input?: boolean }).input;

// `users.github_login` has exactly one writer (the GitHub profile) and must have no other.
// These assertions pin that pair: the mapper that supplies it, the field config that lets it
// through, and the guard that stops clients setting it.

test('mapGitHubProfile turns the GitHub profile into the githubLogin field', () => {
  expect(mapGitHubProfile({ login: 'octocat' })).toEqual({ githubLogin: 'octocat' });
});

test('the GitHub provider uses that mapper, so a sign-in persists the handle', () => {
  // features.auth is false under test, so socialProviders is {} — assert on the config object.
  expect(githubProvider.mapProfileToUser).toBe(mapGitHubProfile);
  expect(githubProvider.scope).toEqual(['read:user', 'user:email', 'repo']);
});

test('githubLogin stays writable, or the provider profile value is silently dropped', () => {
  // better-auth's parseAdditionalUserInputFromProviderProfile skips `input: false` fields,
  // so `input: false` here would leave github_login null forever.
  expect(inputFlag('githubLogin')).not.toBe(false);
});

test('plan stays server-owned', () => {
  expect(inputFlag('plan')).toBe(false);
});

test('clients cannot set githubLogin through /update-user', async () => {
  await expect(auth.api.updateUser({ body: { githubLogin: 'octocat' } })).rejects.toThrow('githubLogin is not allowed to be set');
});

test('the guard is keyed on the field, not on /update-user, so future routes are covered', async () => {
  const res = await auth.handler(
    new Request('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'hunter2hunter2', name: 'a', githubLogin: 'victim' }),
    }),
  );
  expect(res.status).toBe(400);
  await expect(res.json()).resolves.toMatchObject({ message: 'githubLogin is not allowed to be set' });
});
