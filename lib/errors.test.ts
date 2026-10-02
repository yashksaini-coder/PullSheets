import { describe, expect, it } from 'vitest';
import { FeatureUnconfigured, NotFound, withRoute } from './errors';

describe('withRoute', () => {
  it('maps AppError to JSON with its status', async () => {
    const h = withRoute(async () => {
      throw new NotFound('pr_not_found', 'nope');
    });
    const r = await h(new Request('http://x'), {});
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'nope', code: 'pr_not_found' });
  });
  it('carries details for feature_unconfigured', async () => {
    const r = await withRoute(async () => {
      throw new FeatureUnconfigured(['A', 'B']);
    })(new Request('http://x'), {});
    expect(r.status).toBe(503);
    expect((await r.json()).missing).toEqual(['A', 'B']);
  });
  it('hides unknown errors behind a 500', async () => {
    const r = await withRoute(async () => {
      throw new Error('secret stack');
    })(new Request('http://x'), {});
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain('secret');
  });
});
