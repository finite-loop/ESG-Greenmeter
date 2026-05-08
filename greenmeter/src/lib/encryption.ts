import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const HEX_REGEX = /^[0-9a-fA-F]{64}$/;

/** Cached random dev key — generated once per process to ensure round-trip consistency. */
let _devKey: Buffer | undefined;

/**
 * Derives the 32-byte encryption key from the ENCRYPTION_KEY env var.
 * Falls back to a random per-process key in development if not set.
 */
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;

  if (hex) {
    if (!HEX_REGEX.test(hex)) {
      throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (0-9, a-f)');
    }
    return Buffer.from(hex, 'hex');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }

  // Dev fallback — random key per process, NOT persisted across restarts
  if (!_devKey) {
    _devKey = randomBytes(KEY_LENGTH);
    logger.warn('Using random fallback encryption key — set ENCRYPTION_KEY for production. Encrypted data will not survive process restarts.');
  }
  return _devKey;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-delimited string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string previously encrypted with `encrypt()`.
 * Input format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, authTagHex, data] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks a credential string, showing only the last 4 characters.
 * Returns '****' for short strings.
 */
export function maskCredential(credential: string): string {
  if (credential.length <= 4) {
    return '****';
  }
  return '*'.repeat(credential.length - 4) + credential.slice(-4);
}
