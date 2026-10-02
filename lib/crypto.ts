import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALG = 'aes-256-gcm';

function keyFromEnv(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  return Buffer.from(raw, 'base64');
}

function assertKey(key: Buffer) {
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes (openssl rand -base64 32)');
}

export function encrypt(plain: string, key: Buffer = keyFromEnv()): string {
  assertKey(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

export function decrypt(blob: string, key: Buffer = keyFromEnv()): string {
  assertKey(key);
  const [v, iv, tag, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Malformed ciphertext');
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
