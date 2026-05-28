import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;
const ITERATIONS = 100_000;
const DIGEST = 'sha256';

function getMasterSecret(): string {
  const key = process.env.SECRETS_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim();
  if (!key || key.length < 32) {
    throw new Error(
      'SECRETS_ENCRYPTION_KEY or AUTH_SECRET (min 32 chars) is required for secret encryption'
    );
  }
  return key;
}

function deriveKey(salt: Buffer): Buffer {
  return pbkdf2Sync(getMasterSecret(), salt, ITERATIONS, KEY_LEN, DIGEST);
}

/** Encrypt plaintext for storage. Returns `salt:iv:authTag:ciphertext` (hex segments). */
export function encryptSecret(plaintext: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/** Decrypt a payload produced by `encryptSecret`. */
export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted secret payload');
  }
  const [saltHex, ivHex, tagHex, dataHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(salt);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
