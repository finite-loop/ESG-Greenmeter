import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, maskCredential } from './encryption';

describe('encryption', () => {
  describe('encrypt and decrypt', () => {
    it('round-trips a plaintext string', () => {
      const original = 'my-secret-api-key-12345';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext for the same input (random IV)', () => {
      const input = 'same-secret';
      const a = encrypt(input);
      const b = encrypt(input);
      expect(a).not.toBe(b);
      // Both should decrypt to same value
      expect(decrypt(a)).toBe(input);
      expect(decrypt(b)).toBe(input);
    });

    it('handles empty string', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    it('handles unicode characters', () => {
      const original = 'key-with-unicode-\u00e9\u00e0\u00fc-\u{1F511}';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('handles long strings', () => {
      const original = 'x'.repeat(10000);
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('produces format iv:authTag:ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // IV is 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Auth tag is 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Ciphertext is non-empty
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('decrypt error handling', () => {
    it('throws on invalid format (missing parts)', () => {
      expect(() => decrypt('not-valid')).toThrow('Invalid encrypted value format');
    });

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[2] = 'ff'.repeat(parts[2].length / 2);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('throws on tampered auth tag', () => {
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with auth tag
      parts[1] = '00'.repeat(16);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('throws on invalid IV length', () => {
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      // Truncate IV to 8 bytes (16 hex chars) instead of 16 bytes (32 hex chars)
      parts[0] = parts[0].slice(0, 16);
      expect(() => decrypt(parts.join(':'))).toThrow('Invalid IV length');
    });

    it('throws on invalid auth tag length', () => {
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      // Truncate auth tag
      parts[1] = parts[1].slice(0, 16);
      expect(() => decrypt(parts.join(':'))).toThrow('Invalid auth tag length');
    });
  });

  describe('maskCredential', () => {
    it('masks long strings showing last 4 chars', () => {
      expect(maskCredential('my-secret-key-1234')).toBe('**************1234');
    });

    it('returns **** for short strings', () => {
      expect(maskCredential('abc')).toBe('****');
      expect(maskCredential('abcd')).toBe('****');
    });

    it('masks 5-char strings showing last 4', () => {
      expect(maskCredential('12345')).toBe('*2345');
    });

    it('handles empty string', () => {
      expect(maskCredential('')).toBe('****');
    });
  });
});
