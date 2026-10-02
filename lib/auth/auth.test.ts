import { expect, test } from 'vitest';
import { parseAdditionalUserInputFromProviderProfile } from 'better-auth/db';
import { auth } from './index';

// githubLogin arrives from mapProfileToUser, so the field must stay `input: true`;
// better-auth strips `input: false` fields from the provider profile too. These two
// assertions pin that pair: the value gets through, and clients still cannot set it.

test('githubLogin from the GitHub profile is persisted', () => {
  expect(parseAdditionalUserInputFromProviderProfile(auth.options, { githubLogin: 'octocat' }, 'create')).toMatchObject({ githubLogin: 'octocat' });
});

test('input:false would silently drop it', () => {
  const opts = { ...auth.options, user: { additionalFields: { githubLogin: { type: 'string' as const, required: false, input: false } } } };
  expect(parseAdditionalUserInputFromProviderProfile(opts, { githubLogin: 'octocat' }, 'create')).toEqual({});
});

test('clients cannot set githubLogin through /update-user', async () => {
  await expect(auth.api.updateUser({ body: { githubLogin: 'octocat' } })).rejects.toThrow('githubLogin is not allowed to be set');
});
