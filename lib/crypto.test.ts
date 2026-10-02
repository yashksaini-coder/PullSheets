import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, sha256 } from './crypto';

const key = Buffer.alloc(32, 7);

describe('crypto', () => {
  it('round-trips', () => {
    const blob = encrypt('gho_abc123', key);
    expect(blob.startsWith('v1.')).toBe(true);
    expect(decrypt(blob, key)).toBe('gho_abc123');
  });
  it('produces a different blob each time (random iv)', () => {
    expect(encrypt('x', key)).not.toBe(encrypt('x', key));
  });
  it('rejects a tampered ciphertext', () => {
    const blob = encrypt('secret', key);
    const parts = blob.split('.');
    parts[3] = Buffer.from(Buffer.from(parts[3], 'base64').map((b) => b ^ 1)).toString('base64');
    expect(() => decrypt(parts.join('.'), key)).toThrow();
  });
  it('rejects a wrong-length key with a clear message', () => {
    expect(() => encrypt('x', Buffer.alloc(16))).toThrow(/32 bytes/);
  });
  it('sha256 is hex and stable', () => {
    expect(sha256('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  });
});
