import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, DesignSchema, decodeDesign, encodeDesign } from './design';

describe('Design', () => {
  it('defaults validate', () => { expect(DesignSchema.safeParse(DEFAULT_DESIGN).success).toBe(true); });
  it('round-trips through the URL encoding', () => {
    const d = { ...DEFAULT_DESIGN, bg: 'crimson', rotY: 14, cardFamily: 'midnight' as const };
    expect(decodeDesign(encodeDesign(d))).toEqual(d);
  });
  it('falls back to defaults on garbage, null and partial input', () => {
    expect(decodeDesign('%%%not-base64')).toEqual(DEFAULT_DESIGN);
    expect(decodeDesign('garbage')).toEqual(DEFAULT_DESIGN); // valid base64url characters, not JSON — the ?d=garbage case
    expect(decodeDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(decodeDesign(Buffer.from(JSON.stringify({ bg: 'ember', rotX: 'nope' })).toString('base64url'))).toEqual(DEFAULT_DESIGN);
  });
  it('clamps numeric ranges', () => {
    expect(DesignSchema.safeParse({ ...DEFAULT_DESIGN, scale: 500 }).success).toBe(false);
    expect(DesignSchema.safeParse({ ...DEFAULT_DESIGN, rotX: -181 }).success).toBe(false);
  });
});
