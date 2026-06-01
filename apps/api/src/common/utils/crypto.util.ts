import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY ?? '';
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY env var is not set. Generate one with: openssl rand -base64 32',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Use a 32-byte base64-encoded key.`,
    );
  }
  cachedKey = buf;
  return buf;
}

export interface EncryptedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Unexpected auth tag length');
  }
  return { ciphertext, iv, authTag };
}

export function decryptSecret(input: EncryptedSecret): string {
  const key = loadKey();
  const decipher = createDecipheriv(ALGO, key, input.iv);
  decipher.setAuthTag(input.authTag);
  const plaintext = Buffer.concat([
    decipher.update(input.ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Returns a masked view safe to display in UI/logs. */
export function maskToken(token: string): string {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
