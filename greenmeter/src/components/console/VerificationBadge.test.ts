import { describe, it, expect } from 'vitest';
import { VerificationBadge } from './VerificationBadge';

describe('VerificationBadge', () => {
  it('returns null when not verified', () => {
    const result = VerificationBadge({ verified: false });
    expect(result).toBeNull();
  });

  it('renders badge when verified', () => {
    const result = VerificationBadge({ verified: true });
    expect(result).not.toBeNull();
  });

  it('renders badge with tooltip when verifiedAt is provided', () => {
    const result = VerificationBadge({
      verified: true,
      verifiedAt: '2026-05-07T10:00:00Z',
    });
    expect(result).not.toBeNull();
  });

  it('renders badge with tooltip when verifiedBy is provided', () => {
    const result = VerificationBadge({
      verified: true,
      verifiedBy: 'user-123',
      verifiedAt: '2026-05-07T10:00:00Z',
    });
    expect(result).not.toBeNull();
  });

  it('renders plain badge when no verifiedAt or verifiedBy', () => {
    const result = VerificationBadge({ verified: true, verifiedBy: null, verifiedAt: null });
    expect(result).not.toBeNull();
  });
});
